import { ActionPanel, Action, Icon, Detail, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser, forceCompleteQuest, acceptQuest, abortQuest, HabiticaUser } from "./api";

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

  if (!user) {
    return <Detail isLoading={isLoading} markdown="Loading your profile…" />;
  }

  const { stats, party } = user;
  const quest = party?.quest;

  let questMarkdown = "### No Active Quest\n\nYou are not currently on a quest.";

  if (quest && quest.key) {
    questMarkdown = `### Active Quest: ${quest.key}\n`;
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

  const markdown = `
# Level ${stats.lvl}

**Health:** ${stats.hp.toFixed(1)} / 50  
**Mana:** ${stats.mp.toFixed(1)}  
**Experience:** ${stats.exp.toFixed(1)} / ${stats.toNextLevel}  
**Gold:** ${stats.gp.toFixed(2)}  

---

${questMarkdown}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Level" text={String(stats.lvl)} />
          <Detail.Metadata.Label title="Health" text={stats.hp.toFixed(1)} />
          <Detail.Metadata.Label title="Mana" text={stats.mp.toFixed(1)} />
          <Detail.Metadata.Label title="Experience" text={stats.exp.toFixed(1)} />
          <Detail.Metadata.Label title="Gold" text={stats.gp.toFixed(2)} />
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
}
