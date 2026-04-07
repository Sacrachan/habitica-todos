import { ActionPanel, Action, Icon, Detail, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { getUser, forceCompleteQuest, acceptQuest, abortQuest, getContent } from "./api";
import { getAvatarSvg } from "./avatar";
import { HabiticaUser, HabiticaContent } from "./types";

export default function Command() {
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Cache content so it is only fetched once per command lifetime
  const contentRef = useRef<HabiticaContent | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Only fetch content on first load
      if (!contentRef.current) {
        contentRef.current = await getContent();
      }
      const data = await getUser();
      setUser(data);
      if (data) {
        const uri = await getAvatarSvg(data);
        setAvatarUri(uri);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load profile",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) {
    return <Detail isLoading={isLoading} markdown="Loading your profile…" />;
  }

  const content = contentRef.current;
  const { stats, party } = user;
  const quest = party?.quest;
  const questName =
    quest?.key && content?.quests?.[quest.key]?.text ? content.quests[quest.key].text : quest?.key || "Unknown Quest";

  let questMarkdown = "### No Active Quest\n\nYou are not currently on a quest.";

  if (quest && quest.key) {
    questMarkdown = `### Active Quest: ${questName}\n`;
    questMarkdown += `Status: ${quest.active ? "Active" : "Pending"}\n\n`;
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

  const maxHealth = stats?.maxHealth ?? 50;

  const markdown = `
${avatarUri ? `![Avatar](${avatarUri})` : ""}

## Level ${stats?.lvl || 0}
---

${questMarkdown}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Level" text={String(stats?.lvl || 0)} icon={Icon.Crown} />
          <Detail.Metadata.Label
            title="Health"
            text={`${(stats?.hp || 0).toFixed(1)} / ${maxHealth}`}
            icon={{ source: Icon.Heart, tintColor: Color.Red }}
          />
          <Detail.Metadata.Label
            title="Mana"
            text={(stats?.mp || 0).toFixed(1)}
            icon={{ source: Icon.Star, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Experience"
            text={`${(stats?.exp || 0).toFixed(1)} / ${stats?.toNextLevel || "?"}`}
            icon={{ source: Icon.ChevronUp, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Label
            title="Gold"
            text={(stats?.gp || 0).toFixed(2)}
            icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          />
          {quest && quest.key && (
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
          {quest && quest.key && (
            <ActionPanel.Section title="Quest Actions">
              {!quest.active && (
                <Action title="Accept Quest" icon={Icon.CheckCircle} onAction={() => handleQuestAction("accept")} />
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
      if (action === "accept") await acceptQuest();
      if (action === "abort") await abortQuest();
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
