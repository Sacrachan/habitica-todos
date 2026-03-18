import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getTasks, scoreTask, deleteTask, HabiticaTask } from "./api";
import EditTaskForm from "./edit-task";

const TYPE_LABELS: Record<string, string> = {
  todo: "To-Do",
  habit: "Habit",
  daily: "Daily",
  reward: "Reward",
};

const PRIORITY_LABELS: Record<number, string> = {
  0.1: "Trivial",
  1: "Easy",
  1.5: "Medium",
  2: "Hard",
};

function taskIcon(task: HabiticaTask): { source: Icon; tintColor?: Color } {
  if (task.type === "reward") return { source: Icon.Star, tintColor: Color.Yellow };
  if (task.type === "habit") return { source: Icon.ArrowUpCircle, tintColor: Color.Blue };
  if (task.completed) return { source: Icon.CheckCircle, tintColor: Color.Green };
  return { source: Icon.Circle };
}

export default function Command() {
  const [tasks, setTasks] = useState<HabiticaTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const { push } = useNavigation();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter = typeFilter === "all" ? undefined : typeFilter;
      const data = await getTasks(filter);
      setTasks(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleScore(task: HabiticaTask) {
    const direction = task.completed ? "down" : "up";
    try {
      await showToast({ style: Toast.Style.Animated, title: direction === "up" ? "Completing…" : "Un-completing…" });
      await scoreTask(task.id, direction);
      await showToast({
        style: Toast.Style.Success,
        title: direction === "up" ? "Task completed!" : "Task un-completed!",
      });
      await fetchTasks();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to score task",
        message: String(error),
      });
    }
  }

  async function handleDelete(task: HabiticaTask) {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.text}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
      await deleteTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task deleted!" });
      await fetchTasks();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Habitica Tasks"
      searchBarPlaceholder="Search tasks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" onChange={setTypeFilter} value={typeFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="To-Dos" value="todos" />
          <List.Dropdown.Item title="Habits" value="habits" />
          <List.Dropdown.Item title="Dailies" value="dailys" />
          <List.Dropdown.Item title="Rewards" value="rewards" />
        </List.Dropdown>
      }
    >
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView title="No tasks found" description="Create a new task to get started!" />
      ) : (
        tasks.map((task) => {
          const icon = taskIcon(task);
          const accessories: List.Item.Accessory[] = [];

          if (PRIORITY_LABELS[task.priority]) {
            accessories.push({ tag: PRIORITY_LABELS[task.priority] });
          }
          if (task.date) {
            accessories.push({ date: new Date(task.date), tooltip: "Due date" });
          }

          return (
            <List.Item
              key={task.id}
              icon={icon}
              title={task.text}
              subtitle={TYPE_LABELS[task.type] || task.type}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Task Actions">
                    {(task.type === "todo" || task.type === "daily" || task.type === "habit") && (
                      <Action
                        title={task.completed ? "Uncheck Task" : "Check Task"}
                        icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => handleScore(task)}
                      />
                    )}
                    <Action
                      title="Edit Task"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() =>
                        push(<EditTaskForm task={task} onUpdated={fetchTasks} />)
                      }
                    />
                    <Action
                      title="Delete Task"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(task)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchTasks}
                    />
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
        })
      )}
    </List>
  );
}
