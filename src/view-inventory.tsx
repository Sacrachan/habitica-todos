import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser, HabiticaUser } from "./api";

export default function Command() {
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUser();
      setUser(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load inventory",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user && isLoading) {
    return <List isLoading={true} />;
  }

  const items = user?.items;

  // Filter items that have a count > 0
  const eggs = Object.entries(items?.eggs || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const potions = Object.entries(items?.hatchingPotions || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const food = Object.entries(items?.food || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search inventory…">
      <List.Section title={`Eggs (${eggs.length})`}>
        {eggs.map(([key, count]) => (
          <List.Item
            key={`egg-${key}`}
            title={key}
            icon={Icon.Tag}
            accessories={[{ text: String(count) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchData}
                  />
                  <Action.OpenInBrowser
                    title="Open Habitica Inventory"
                    url="https://habitica.com/inventory/items"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Hatching Potions (${potions.length})`}>
        {potions.map(([key, count]) => (
          <List.Item
            key={`potion-${key}`}
            title={key}
            icon={Icon.Mask}
            accessories={[{ text: String(count) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchData}
                  />
                  <Action.OpenInBrowser
                    title="Open Habitica Inventory"
                    url="https://habitica.com/inventory/items"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Food (${food.length})`}>
        {food.map(([key, count]) => (
          <List.Item
            key={`food-${key}`}
            title={key}
            icon={Icon.Carrot}
            accessories={[{ text: String(count) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchData}
                  />
                  <Action.OpenInBrowser
                    title="Open Habitica Inventory"
                    url="https://habitica.com/inventory/items"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
