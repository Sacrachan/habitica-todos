import { ActionPanel, Action, Icon, Grid, showToast, Toast } from "@raycast/api";
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
    return <Grid isLoading={true} />;
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
    <Grid isLoading={isLoading} searchBarPlaceholder="Search inventory…" itemSize={Grid.ItemSize.Medium}>
      <Grid.Section title={`Eggs (${eggs.length})`}>
        {eggs.map(([key, count]) => (
          <Grid.Item
            key={`egg-${key}`}
            title={key}
            subtitle={`Count: ${count}`}
            content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_Egg_${key}.png`}
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
      </Grid.Section>

      <Grid.Section title={`Hatching Potions (${potions.length})`}>
        {potions.map(([key, count]) => (
          <Grid.Item
            key={`potion-${key}`}
            title={key}
            subtitle={`Count: ${count}`}
            content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_HatchingPotion_${key}.png`}
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
      </Grid.Section>

      <Grid.Section title={`Food (${food.length})`}>
        {food.map(([key, count]) => (
          <Grid.Item
            key={`food-${key}`}
            title={key}
            subtitle={`Count: ${count}`}
            content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_Food_${key}.png`}
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
      </Grid.Section>
    </Grid>
  );
}
