import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Image } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getTasks, getUser, getContent, buyHealthPotion, buyGear, scoreTask, buyArmoire } from "./api";
import { HabiticaUser, HabiticaContent } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShopItemType = "reward" | "market" | "gear";

interface ShopItem {
  id: string;
  text: string;
  notes?: string;
  value: number;
  type: ShopItemType;
  /** Raycast Icon used when no remote image is available. */
  icon?: Icon;
  /** Remote image URL for the item icon. Only set when the URL is known to be accessible. */
  imageUrl?: string;
  /** Gear asset key used to build the image URL (e.g. "weapon_warrior_1"). */
  gearKey?: string;
  /** Gear type for filtering (e.g. "weapon", "armor"). */
  gearType?: string;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

type FilterValue =
  | "all"
  | "affordable"
  | "market"
  | "reward"
  | "weapon"
  | "armor"
  | "head"
  | "shield"
  | "headAccessory"
  | "eyewear"
  | "back"
  | "body";

const FILTER_OPTIONS: { value: FilterValue; title: string; icon: Icon }[] = [
  { value: "all",           title: "All Items",       icon: Icon.List },
  { value: "affordable",    title: "Affordable",      icon: Icon.Coins },
  { value: "market",        title: "Market",          icon: Icon.Cart },
  { value: "weapon",        title: "Weapons",         icon: Icon.Hammer },
  { value: "armor",         title: "Armor",           icon: Icon.Shield },
  { value: "head",          title: "Helmets",         icon: Icon.Person },
  { value: "shield",        title: "Off-Hand",        icon: Icon.Shield },
  { value: "headAccessory", title: "Head Accessories",icon: Icon.Dot },
  { value: "eyewear",       title: "Eyewear",         icon: Icon.Eye },
  { value: "back",          title: "Back Accessories",icon: Icon.Dot },
  { value: "body",          title: "Body Accessories",icon: Icon.Dot },
  { value: "reward",        title: "Custom Rewards",  icon: Icon.Stars },
];

function matchesFilter(item: ShopItem, filter: FilterValue, userGp: number): boolean {
  switch (filter) {
    case "all":        return true;
    case "affordable": return item.value <= userGp;
    case "market":     return item.type === "market";
    case "reward":     return item.type === "reward";
    default:           return item.type === "gear" && item.gearType === filter;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEAR_ASSET_BASE = "https://habitica-assets.s3.amazonaws.com/mobileApp/images";

const GEAR_TYPE_ORDER = ["weapon", "armor", "head", "shield", "headAccessory", "eyewear", "back", "body"];

const GEAR_TYPE_LABEL: Record<string, string> = {
  weapon: "Weapon",
  armor: "Armor",
  head: "Helmet",
  shield: "Off-Hand",
  headAccessory: "Head Accessory",
  eyewear: "Eyewear",
  back: "Back Accessory",
  body: "Body Accessory",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gearImageUrl(key: string): string {
  return `${GEAR_ASSET_BASE}/shop_${key}.png`;
}

/**
 * Renders the item image large in the detail panel using an inline <img> tag.
 * The standard ![alt](url) markdown syntax renders at native sprite size (~68px);
 * the HTML tag lets us specify an explicit width.
 */
function imageMarkdown(url: string, alt: string): string {
  return `<img src="${url}" alt="${alt}" width="220" />`;
}

function buildGearItems(user: HabiticaUser, content: HabiticaContent): ShopItem[] {
  const userClass = user.stats.class ?? "warrior";
  const ownedKeys = user.items.gear.owned ?? {};

  return Object.entries(content.gear.flat)
    .filter(([key, gear]) => gear.klass === userClass && gear.value > 0 && !ownedKeys[key])
    .sort((a, b) => a[1].value - b[1].value)
    .map(([key, gear]) => ({
      id: `gear:${key}`,
      text: gear.text,
      notes: gear.notes,
      value: gear.value,
      type: "gear" as const,
      gearKey: key,
      gearType: gear.type,
      imageUrl: gearImageUrl(key),
    }));
}

function resolveIcon(item: ShopItem, fallback: Icon): Icon | { source: string; mask: Image.Mask } {
  if (item.imageUrl) {
    return { source: item.imageUrl, mask: Image.Mask.RoundedRectangle };
  }
  return item.icon ?? fallback;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Command() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rewards, userData, content] = await Promise.all([getTasks("rewards"), getUser(), getContent()]);
      setUser(userData);

      const shopItems: ShopItem[] = [
        // Note: shop_health_potion.png returns 403 on S3, so no imageUrl — Icon.Heart is used instead.
        ...(userData.stats.hp < (userData.stats.maxHealth ?? 50)
          ? [{ id: "health_potion", text: "Health Potion", notes: "Restores 15 Health.", value: 25, type: "market" as const, icon: Icon.Heart }]
          : []),
        ...(userData.stats.lvl >= 10
          ? [{ id: "enchanted_armoire", text: "Enchanted Armoire", notes: "Get either gear, food, or XP!", value: 100, type: "market" as const, icon: Icon.Box, imageUrl: `${GEAR_ASSET_BASE}/shop_armoire.png` }]
          : []),
        ...buildGearItems(userData, content),
        ...rewards.map((r) => ({ id: r.id, text: r.text, notes: r.notes, value: r.value, type: "reward" as const })),
      ];

      setItems(shopItems);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load shop", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleBuy(item: ShopItem) {
    if (user && user.stats.gp < item.value) {
      await showToast({ style: Toast.Style.Failure, title: "Not enough gold!", message: `You need ${item.value.toFixed(2)} GP` });
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Purchasing…" });
      if (item.id === "health_potion") {
        await buyHealthPotion();
      } else if (item.id === "enchanted_armoire") {
        await buyArmoire();
      } else if (item.type === "gear" && item.gearKey) {
        await buyGear(item.gearKey);
      } else {
        await scoreTask(item.id, "up");
      }
      await showToast({ style: Toast.Style.Success, title: "Purchased!" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Purchase failed", message: String(error) });
    }
  }

  const userGp = user?.stats.gp ?? 0;
  const goldLabel = user ? `${userGp.toFixed(2)} GP` : undefined;

  // Apply active filter
  const filteredItems = items.filter((i) => matchesFilter(i, filter, userGp));

  // Group filtered gear by type for section rendering
  const gearByType = GEAR_TYPE_ORDER.reduce<Record<string, ShopItem[]>>((acc, gearType) => {
    acc[gearType] = filteredItems.filter(
      (i) => i.type === "gear" && i.gearType === gearType
    );
    return acc;
  }, {});

  const showMarket  = filteredItems.some((i) => i.type === "market");
  const showGear    = filteredItems.some((i) => i.type === "gear");
  const showRewards = filteredItems.some((i) => i.type === "reward");

  function renderDetail(item: ShopItem, categoryLabel?: string) {
    return (
      <List.Item.Detail
        markdown={item.imageUrl ? imageMarkdown(item.imageUrl, item.text) : undefined}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={item.text} />
            {item.notes ? <List.Item.Detail.Metadata.Label title="Description" text={item.notes} /> : null}
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Price"
              text={`${item.value} GP`}
              icon={{ source: Icon.Coins, tintColor: item.value <= userGp ? Color.Green : Color.Red }}
            />
            {categoryLabel ? <List.Item.Detail.Metadata.Label title="Category" text={categoryLabel} /> : null}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  const filterDropdown = (
    <List.Dropdown
      tooltip="Filter items"
      value={filter}
      onChange={(val) => setFilter(val as FilterValue)}
    >
      <List.Dropdown.Section title="Show">
        {FILTER_OPTIONS.map((opt) => (
          <List.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} icon={opt.icon} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search rewards…"
      navigationTitle="Habitica Rewards"
      isShowingDetail
      searchBarAccessory={filterDropdown}
    >
      {/* Market */}
      {showMarket && (
        <List.Section title="Market" subtitle={goldLabel}>
          {filteredItems
            .filter((i) => i.type === "market")
            .map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={resolveIcon(item, Icon.Cart)}
                detail={renderDetail(item, "Market")}
                actions={
                  <ActionPanel>
                    <Action title="Buy Item" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      {/* Gear — one section per type, hidden when empty after filtering */}
      {showGear && GEAR_TYPE_ORDER.map((gearType) => {
        const gearItems = gearByType[gearType];
        if (!gearItems || gearItems.length === 0) return null;
        const label = GEAR_TYPE_LABEL[gearType] ?? gearType;
        return (
          <List.Section key={gearType} title={label} subtitle={goldLabel}>
            {gearItems.map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={resolveIcon(item, Icon.Hammer)}
                detail={renderDetail(item, label)}
                actions={
                  <ActionPanel>
                    <Action title="Buy Gear" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      {/* Custom Rewards */}
      {showRewards && (
        <List.Section title="Custom Rewards" subtitle={goldLabel}>
          {filteredItems
            .filter((i) => i.type === "reward")
            .map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={Icon.Stars}
                detail={renderDetail(item, "Custom Reward")}
                actions={
                  <ActionPanel>
                    <Action title="Buy Reward" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
