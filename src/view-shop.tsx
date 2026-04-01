import { ActionPanel, Action, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getTasks, getUser, buyHealthPotion, scoreTask, buyArmoire, HabiticaUser } from "./api";

interface ShopItem {
  id: string;
  text: string;
  notes?: string;
  value: number;
  type: "reward" | "market";
  icon?: Icon;
}

export default function Command() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rewards, userData] = await Promise.all([getTasks("rewards"), getUser()]);
      setUser(userData);

      const shopItems: ShopItem[] = rewards.map((r) => ({
        id: r.id,
        text: r.text,
        notes: r.notes,
        value: r.value,
        type: "reward",
      }));

      // Add Market Health Potion
      if (userData.stats.hp < 50) {
        shopItems.unshift({
          id: "health_potion",
          text: "Health Potion",
          notes: "Restores 15 Health",
          value: 25,
          type: "market",
          icon: Icon.Heart,
        });
      }

      // Add Enchanted Armoire if level >= 10
      if (userData.stats.lvl >= 10) {
        shopItems.unshift({
          id: "enchanted_armoire",
          text: "Enchanted Armoire",
          notes: "Get either gear, food, or XP!",
          value: 100,
          type: "market",
          icon: Icon.Box,
        });
      }

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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shop…" navigationTitle="Habitica Shop" isShowingDetail>
      <List.Section title="Market" subtitle={user ? `${user.stats.gp.toFixed(2)} Gold` : undefined}>
        {items
          .filter((i) => i.type === "market")
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.text}
              subtitle={`${item.value} Gold`}
              icon={item.icon || Icon.Cart}
              detail={
                <List.Item.Detail
                  markdown={`# ${item.text}\n\n${item.notes || ""}\n\n${
                    item.id === "health_potion"
                      ? "![Potion](https://habitica-assets.s3.amazonaws.com/mobileApp/images/shop_health_potion.png)"
                      : item.id === "enchanted_armoire"
                        ? "![Armoire](https://habitica-assets.s3.amazonaws.com/mobileApp/images/shop_armoire.png)"
                        : ""
                  }`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Price"
                        text={`${item.value} Gold`}
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
      <List.Section title="Custom Rewards">
        {items
          .filter((i) => i.type === "reward")
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.text}
              subtitle={`${item.value} Gold`}
              icon={Icon.Stars}
              detail={
                <List.Item.Detail
                  markdown={`# ${item.text}\n\n${item.notes || "*No description*"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Price"
                        text={`${item.value} Gold`}
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
