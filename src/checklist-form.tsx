import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";

interface ChecklistFormProps {
  taskId: string;
  taskText: string;
  onSubmitted: () => void;
  onAdd: (taskId: string, text: string) => Promise<void>;
}

interface FormValues {
  text: string;
}

export default function ChecklistForm({ taskId, taskText, onSubmitted, onAdd }: ChecklistFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const trimmed = values.text.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Item text is required" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding checklist item…" });
      await onAdd(taskId, trimmed);
      await showToast({ style: Toast.Style.Success, title: "Item added" });
      onSubmitted();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add item",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Add Item: ${taskText}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Checklist Item" placeholder="Sub-task description" autoFocus />
    </Form>
  );
}
