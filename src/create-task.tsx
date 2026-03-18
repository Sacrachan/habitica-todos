import { Form, ActionPanel, Action, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { createTask, CreateTaskBody } from "./api";

interface FormValues {
  text: string;
  type: string;
  notes: string;
  priority: string;
  date: Date | null;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    if (!values.text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const body: CreateTaskBody = {
      text: values.text.trim(),
      type: values.type,
    };

    if (values.notes?.trim()) {
      body.notes = values.notes.trim();
    }

    if (values.priority) {
      body.priority = parseFloat(values.priority);
    }

    if (values.date) {
      body.date = values.date.toISOString().split("T")[0];
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      await createTask(body);
      await showToast({ style: Toast.Style.Success, title: "Task created!" });
      await launchCommand({ name: "view-tasks", type: LaunchType.UserInitiated });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Habitica Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Title" placeholder="What do you need to do?" autoFocus />

      <Form.Dropdown id="type" title="Type" defaultValue="todo">
        <Form.Dropdown.Item value="todo" title="To-Do" icon="📋" />
        <Form.Dropdown.Item value="habit" title="Habit" icon="🔄" />
        <Form.Dropdown.Item value="daily" title="Daily" icon="📅" />
        <Form.Dropdown.Item value="reward" title="Reward" icon="🏆" />
      </Form.Dropdown>

      <Form.TextArea id="notes" title="Notes" placeholder="Additional details (optional)" />

      <Form.Separator />

      <Form.Dropdown id="priority" title="Difficulty" defaultValue="1">
        <Form.Dropdown.Item value="0.1" title="Trivial" />
        <Form.Dropdown.Item value="1" title="Easy" />
        <Form.Dropdown.Item value="1.5" title="Medium" />
        <Form.Dropdown.Item value="2" title="Hard" />
      </Form.Dropdown>

      <Form.DatePicker id="date" title="Due Date" type={Form.DatePicker.Type.Date} />
    </Form>
  );
}
