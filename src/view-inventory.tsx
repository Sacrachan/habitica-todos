import { ActionPanel, Action, Icon, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser } from "./api";
import { HabiticaUser } from "./types";

export default function Command() {
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");

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

  const eggs = Object.entries(items?.eggs || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const potions = Object.entries(items?.hatchingPotions || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const food = Object.entries(items?.food || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const special = Object.entries(items?.special || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  const quests = Object.entries(items?.quests || {})
    .filter(([, count]) => count > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const inventoryActions = (
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
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search inventory…"
      columns={8}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter Category" onChange={setCategory} value={category}>
          <Grid.Dropdown.Item title="All Items" value="all" />
          <Grid.Dropdown.Item title="Eggs" value="eggs" />
          <Grid.Dropdown.Item title="Hatching Potions" value="potions" />
          <Grid.Dropdown.Item title="Pet Food and Saddles" value="food" />
          <Grid.Dropdown.Item title="Special" value="special" />
          <Grid.Dropdown.Item title="Quests" value="quests" />
        </Grid.Dropdown>
      }
    >
      {(category === "all" || category === "eggs") && eggs.length > 0 && (
        <Grid.Section title={`Eggs (${eggs.length})`}>
          {eggs.map(([key, count]) => (
            <Grid.Item
              key={`egg-${key}`}
              title={key}
              subtitle={`×${count}`}
              content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_Egg_${key}.png`}
              actions={inventoryActions}
            />
          ))}
        </Grid.Section>
      )}

      {(category === "all" || category === "potions") && potions.length > 0 && (
        <Grid.Section title={`Hatching Potions (${potions.length})`}>
          {potions.map(([key, count]) => (
            <Grid.Item
              key={`potion-${key}`}
              title={key}
              subtitle={`×${count}`}
              content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_HatchingPotion_${key}.png`}
              actions={inventoryActions}
            />
          ))}
        </Grid.Section>
      )}

      {(category === "all" || category === "food") && food.length > 0 && (
        <Grid.Section title={`Food (${food.length})`}>
          {food.map(([key, count]) => (
            <Grid.Item
              key={`food-${key}`}
              title={key}
              subtitle={`×${count}`}
              content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/Pet_Food_${key}.png`}
              actions={inventoryActions}
            />
          ))}
        </Grid.Section>
      )}

      {(category === "all" || category === "special") && special.length > 0 && (
        <Grid.Section title={`Special (${special.length})`}>
          {special.map(([key, count]) => (
            <Grid.Item
              key={`special-${key}`}
              title={key}
              subtitle={`×${count}`}
              content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/shop_${key}.png`}
              actions={inventoryActions}
            />
          ))}
        </Grid.Section>
      )}

      {(category === "all" || category === "quests") && quests.length > 0 && (
        <Grid.Section title={`Quests (${quests.length})`}>
          {quests.map(([key, count]) => (
            <Grid.Item
              key={`quest-${key}`}
              title={key}
              subtitle={`×${count}`}
              content={`https://habitica-assets.s3.amazonaws.com/mobileApp/images/inventory_quest_scroll_${key}.png`}
              actions={inventoryActions}
            />
          ))}
        </Grid.Section>
      )}

      {/* Show empty state when a specific category is selected but has no items */}
      {category !== "all" &&
        ((category === "eggs" && eggs.length === 0) ||
          (category === "potions" && potions.length === 0) ||
          (category === "food" && food.length === 0) ||
          (category === "special" && special.length === 0) ||
          (category === "quests" && quests.length === 0)) && (
          <Grid.EmptyView title="No items in this category" description="Go on some adventures to collect more!" />
        )}
    </Grid>
  );
}
