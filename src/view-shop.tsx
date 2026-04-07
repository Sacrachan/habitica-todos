import { ActionPanel, Action, Icon, List, showToast, Toast, Color } from "@raycast/api";
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
  icon?: Icon;
  /** Gear asset key used to build the image URL (e.g. "weapon_warrior_1"). */
  gearKey?: string;
  /** True if the user already owns this piece of gear. */
  owned?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
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

/**
 * Build the gear image URL for an item detail panel.
 * Habitica uses keys like `shop_weapon_warrior_1.png` on S3.
 */
function gearImageUrl(key: string): string {
  return `${GEAR_ASSET_BASE}/shop_${key}.png`;
}

/**
 * Returns true when the user already owns the piece of gear identified by `key`.
 * The API sends `items.gear.owned` as `{ "weapon_warrior_1": true, ... }`.
 */
function isOwned(user: HabiticaUser, key: string): boolean {
  return user.items.gear.owned?.[key] === true;
}

/**
 * Build the list of purchasable in-game gear items for this user.
 * Mirrors the Rewards tab on the Habitica web app:
 *   – only gear buyable with GP (value > 0)
 *   – items the user doesn't already own
 *   – sorted by tier within each gear type
 */
function buildGearItems(user: HabiticaUser, content: HabiticaContent): ShopItem[] {
  return Object.entries(content.gear.flat)
    .filter(([key, gear]) => gear.value > 0 && !isOwned(user, key))
    .sort((a, b) => (a[1].tier ?? 0) - (b[1].tier ?? 0))
    .map(([key, gear]) => ({
      id: `gear:${key}`,
      text: gear.text,
      notes: gear.notes,
      value: gear.value,
      type: "gear" as const,
      gearKey: key,
    }));
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
        // ── Market items ────────────────────────────────────────────────────
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
            }]
          : []),

        // ── In-game gear rewards (matches web Rewards tab) ─────────────────
        ...buildGearItems(userData, content),

        // ── User-created custom rewards ─────────────────────────────────────
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
      await showToast({ style: Toast.Style.Animated, title: "Purchasing\u2026" });

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

  // Group gear items by type for section rendering
  const gearByType = GEAR_TYPE_ORDER.reduce<Record<string, ShopItem[]>>((acc, gearType) => {
    acc[gearType] = items.filter(
      (i) => i.type === "gear" && i.gearKey?.startsWith(gearType + "_")
    );
    return acc;
  }, {});

  const goldLabel = user ? `${user.stats.gp.toFixed(2)} Gold` : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rewards\u2026" navigationTitle="Habitica Rewards" isShowingDetail>

      {/* ── Market ───────────────────────────────────────────────────────── */}
      <List.Section title="Market" subtitle={goldLabel}>
        {items
          .filter((i) => i.type === "market")
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.text}
              subtitle={`${item.value} GP`}
              icon={item.icon ?? Icon.Cart}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${item.text}`,
                    item.notes ?? "",
                    item.id === "health_potion"
                      ? `![Potion](${GEAR_ASSET_BASE}/shop_health_potion.png)`
                      : item.id === "enchanted_armoire"
                      ? `![Armoire](${GEAR_ASSET_BASE}/shop_armoire.png)`
                      : "",
                  ].join("\n\n")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Price"
                        text={`${item.value} GP`}
                        icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
                      />
                      <List.Item.Detail.Metadata.Label title="Type" text="Market" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Buy Item" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      {/* ── In-game gear rewards (one section per gear type) ─────────────── */}
      {GEAR_TYPE_ORDER.map((gearType) => {
        const gearItems = gearByType[gearType];
        if (!gearItems || gearItems.length === 0) return null;
        return (
          <List.Section key={gearType} title={GEAR_TYPE_LABEL[gearType] ?? gearType} subtitle={goldLabel}>
            {gearItems.map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={Icon.Hammer}
                detail={
                  <List.Item.Detail
                    markdown={[
                      `# ${item.text}`,
                      item.notes ?? "",
                      item.gearKey ? `![${item.text}](${gearImageUrl(item.gearKey)})` : "",
                    ].join("\n\n")}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Price"
                          text={`${item.value} GP`}
                          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Category"
                          text={GEAR_TYPE_LABEL[gearType] ?? gearType}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
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

      {/* ── Custom Rewards ───────────────────────────────────────────────── */}
      <List.Section title="Custom Rewards" subtitle={goldLabel}>
        {items
          .filter((i) => i.type === "reward")
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.text}
              subtitle={`${item.value} GP`}
              icon={Icon.Stars}
              detail={
                <List.Item.Detail
                  markdown={`# ${item.text}\n\n${item.notes ?? "*No description*"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Price"
                        text={`${item.value} GP`}
                        icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
                      />
                      <List.Item.Detail.Metadata.Label title="Type" text="Custom Reward" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
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
