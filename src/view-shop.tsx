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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEAR_ASSET_BASE = "https://habitica-assets.s3.amazonaws.com/mobileApp/images";

/** Gear types shown in the web app's Rewards tab, in display order. */
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
 * Build a markdown string that renders the item image at a large size.
 * Raycast's detail panel honours inline HTML, so we use an <img> tag with
 * an explicit width instead of the standard ![alt](url) syntax which renders
 * the sprite at its native 68x68px size.
 */
function imageMarkdown(url: string, alt: string): string {
  return `<img src="${url}" alt="${alt}" width="220" />`;
}

/**
 * Build the list of purchasable gear items for the given user.
 * Mirrors the web Rewards tab: user's class only, not yet owned, sorted by price.
 */
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
      imageUrl: gearImageUrl(key),
    }));
}

/** Resolve the icon for a list row: prefer a remote image, fall back to a Raycast Icon. */
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rewards, userData, content] = await Promise.all([getTasks("rewards"), getUser(), getContent()]);
      setUser(userData);

      const shopItems: ShopItem[] = [
        // Note: shop_health_potion.png returns 403 on S3, so no imageUrl — Icon.Heart is used instead.
        ...(userData.stats.hp < (userData.stats.maxHealth ?? 50)
          ? [{
              id: "health_potion",
              text: "Health Potion",
              notes: "Restores 15 Health.",
              value: 25,
              type: "market" as const,
              icon: Icon.Heart,
            }]
          : []),
        ...(userData.stats.lvl >= 10
          ? [{
              id: "enchanted_armoire",
              text: "Enchanted Armoire",
              notes: "Get either gear, food, or XP!",
              value: 100,
              type: "market" as const,
              icon: Icon.Box,
              imageUrl: `${GEAR_ASSET_BASE}/shop_armoire.png`,
            }]
          : []),
        ...buildGearItems(userData, content),
        ...rewards.map((r) => ({
          id: r.id,
          text: r.text,
          notes: r.notes,
          value: r.value,
          type: "reward" as const,
        })),
      ];

      setItems(shopItems);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load shop",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleBuy(item: ShopItem) {
    if (user && user.stats.gp < item.value) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not enough gold!",
        message: `You need ${item.value.toFixed(2)} GP`,
      });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Purchase failed",
        message: String(error),
      });
    }
  }

  const gearByType = GEAR_TYPE_ORDER.reduce<Record<string, ShopItem[]>>((acc, gearType) => {
    acc[gearType] = items.filter(
      (i) => i.type === "gear" && i.gearKey?.startsWith(gearType + "_")
    );
    return acc;
  }, {});

  const goldLabel = user ? `${user.stats.gp.toFixed(2)} GP` : undefined;

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
              icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
            />
            {categoryLabel ? <List.Item.Detail.Metadata.Label title="Category" text={categoryLabel} /> : null}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rewards…" navigationTitle="Habitica Rewards" isShowingDetail>

      {/* Market */}
      <List.Section title="Market" subtitle={goldLabel}>
        {items
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

      {/* In-game gear (one section per gear type, empty sections hidden) */}
      {GEAR_TYPE_ORDER.map((gearType) => {
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
      <List.Section title="Custom Rewards" subtitle={goldLabel}>
        {items
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
    </List>
  );
}
