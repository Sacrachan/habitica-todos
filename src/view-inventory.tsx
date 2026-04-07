import { ActionPanel, Action, Icon, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser } from "./api";
import { HabiticaUser } from "./types";

const ASSET_BASE_URL = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";

type InventoryEntry = [key: string, count: number];

function buildInventoryEntries(record: Record<string, number> | undefined): InventoryEntry[] {
  return Object.entries(record ?? {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b)) as InventoryEntry[];
}

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

  const eggs = buildInventoryEntries(items?.eggs);
  const potions = buildInventoryEntries(items?.hatchingPotions);
  const food = buildInventoryEntries(items?.food);
  const special = buildInventoryEntries(items?.special);
  const quests = buildInventoryEntries(items?.quests);

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

  const categories: { key: string; label: string; entries: InventoryEntry[]; imageUrl: (k: string) => string }[] = [
    {
      key: "eggs",
      label: "Eggs",
      entries: eggs,
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_Egg_${k}.png`,
    },
    {
      key: "potions",
      label: "Hatching Potions",
      entries: potions,
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_HatchingPotion_${k}.png`,
    },
    {
      key: "food",
      label: "Food",
      entries: food,
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_Food_${k}.png`,
    },
    {
      key: "special",
      label: "Special",
      entries: special,
      imageUrl: (k) => `${ASSET_BASE_URL}shop_${k}.png`,
    },
    {
      key: "quests",
      label: "Quests",
      entries: quests,
      imageUrl: (k) => `${ASSET_BASE_URL}inventory_quest_scroll_${k}.png`,
    },
  ];

  const visibleCategories = category === "all" ? categories : categories.filter((c) => c.key === category);
  const isCurrentCategoryEmpty = visibleCategories.every((c) => c.entries.length === 0);

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
      {isCurrentCategoryEmpty && !isLoading ? (
        <Grid.EmptyView title="No items in this category" description="Go on some adventures to collect more!" />
      ) : (
        visibleCategories
          .filter((c) => c.entries.length > 0)
          .map((c) => (
            <Grid.Section key={c.key} title={`${c.label} (${c.entries.length})`}>
              {c.entries.map(([key, count]) => (
                <Grid.Item
                  key={`${c.key}-${key}`}
                  title={key}
                  subtitle={`×${count}`}
                  content={c.imageUrl(key)}
                  actions={inventoryActions}
                />
              ))}
            </Grid.Section>
          ))
      )}
    </Grid>
  );
}
