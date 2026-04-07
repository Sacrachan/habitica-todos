import { ActionPanel, Action, Icon, Detail, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser, forceCompleteQuest, acceptQuest, abortQuest } from "./api";
import { getAvatarSvg } from "./avatar";
import { HabiticaUser } from "./types";

// Placeholder shown while the avatar layers are being fetched.
// A simple grey silhouette encoded inline so there's zero network cost.
const AVATAR_PLACEHOLDER = `data:image/svg+xml;base64,${btoa(`<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="140" rx="12" fill="#2d2c2a"/><circle cx="70" cy="52" r="22" fill="#444"/><ellipse cx="70" cy="110" rx="34" ry="24" fill="#444"/></svg>`)}`;

export default function Command() {
  const [user,      setUser]      = useState<HabiticaUser | null>(null);
  const [avatarUri, setAvatarUri] = useState<string>(AVATAR_PLACEHOLDER);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    // Reset avatar to placeholder so the old one doesn't flash during refresh
    setAvatarUri(AVATAR_PLACEHOLDER);
    try {
      const data = await getUser();
      // Render stats immediately — don't wait for the avatar
      setUser(data);
      setIsLoading(false);
      // Fetch avatar layers in the background; update when ready
      getAvatarSvg(data).then((uri) => setAvatarUri(uri)).catch(() => {/* keep placeholder */});
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load profile",
        message: String(error),
      });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats   = user?.stats;
  const quest   = user?.party?.quest;

  let questMarkdown = "### No Active Quest\n\nYou are not currently on a quest.";
  if (quest?.key) {
    questMarkdown = `### Active Quest\n`;
    questMarkdown += `**Status:** ${quest.active ? "Active" : "Pending"}\n\n`;
    if (quest.progress) {
      if (quest.progress.up !== undefined) {
        questMarkdown += `**Progress:** ${Math.round(quest.progress.up)} damage queued.\n`;
      }
      if (quest.progress.collect) {
        questMarkdown += `**Items to Collect:**\n`;
        Object.entries(quest.progress.collect).forEach(([key, val]) => {
          questMarkdown += `- ${key}: ${val}\n`;
        });
      }
    }
  }

  const maxHealth  = stats?.maxHealth ?? 50;
  // Use nullish coalescing so toNextLevel=0 (max level) doesn't show "?"
  const toNextLevel = stats?.toNextLevel ?? "?";

  const markdown = `
![Avatar](${avatarUri})

## Level ${stats?.lvl ?? 0}
---

${questMarkdown}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Level"
            text={String(stats?.lvl ?? 0)}
            icon={Icon.Crown}
          />
          <Detail.Metadata.Label
            title="Health"
            text={`${(stats?.hp ?? 0).toFixed(1)} / ${maxHealth}`}
            icon={{ source: Icon.Heart, tintColor: Color.Red }}
          />
          <Detail.Metadata.Label
            title="Mana"
            text={(stats?.mp ?? 0).toFixed(1)}
            icon={{ source: Icon.Star, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Experience"
            text={`${(stats?.exp ?? 0).toFixed(1)} / ${toNextLevel}`}
            icon={{ source: Icon.ChevronUp, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Label
            title="Gold"
            text={(stats?.gp ?? 0).toFixed(2)}
            icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          />
          {quest?.key && (
            <Detail.Metadata.TagList title="Quest Status">
              <Detail.Metadata.TagList.Item
                text={quest.active ? "Active" : "Pending"}
                color={quest.active ? Color.Green : Color.Blue}
              />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Profile Actions">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchData}
            />
          </ActionPanel.Section>
          {quest?.key && (
            <ActionPanel.Section title="Quest Actions">
              {!quest.active && (
                <Action
                  title="Accept Quest"
                  icon={Icon.CheckCircle}
                  onAction={() => handleQuestAction("accept")}
                />
              )}
              {quest.active && (
                <Action
                  title="Force Complete Quest"
                  icon={Icon.Stars}
                  onAction={() => handleQuestAction("force-complete")}
                />
              )}
              <Action
                title="Abort Quest"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={() => handleQuestAction("abort")}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Habitica"
              url="https://habitica.com"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  async function handleQuestAction(action: "accept" | "abort" | "force-complete") {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Processing…" });
      if (action === "accept")         await acceptQuest();
      if (action === "abort")          await abortQuest();
      if (action === "force-complete") await forceCompleteQuest();
      await showToast({ style: Toast.Style.Success, title: "Quest updated!" });
      await fetchData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${action} quest`,
        message: String(error),
      });
    }
  }
}
