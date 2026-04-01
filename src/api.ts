import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { HabiticaTask, HabiticaUser, HabiticaContent, HabiticaTag, CreateTaskBody } from "./types";

interface Preferences {
  apiUserId: string;
  apiToken: string;
}

const HABITICA_API_URL = "https://habitica.com";

async function habiticaFetch<T>(endpoint: string, options: any = {}): Promise<T> {
  const { apiUserId, apiToken } = getPreferenceValues<Preferences>();

  const headers = {
    ...options.headers,
    "x-api-user": apiUserId,
    "x-api-key": apiToken,
    "x-client": `${apiUserId}-habitica-todos`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${HABITICA_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Habitica API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const json = (await response.json()) as any;
  return json.data;
}

export async function getTasks(type?: string): Promise<HabiticaTask[]> {
  const tasks = await habiticaFetch<HabiticaTask[]>("/api/v3/tasks/user");
  if (type) {
    return tasks.filter((t) => {
      if (type === "todos") return t.type === "todo";
      if (type === "dailys") return t.type === "daily";
      if (type === "habits") return t.type === "habit";
      if (type === "rewards") return t.type === "reward";
      return t.type === type;
    });
  }
  return tasks;
}

export async function getTags(): Promise<HabiticaTag[]> {
  return habiticaFetch<HabiticaTag[]>("/api/v3/tags");
}

export async function scoreTask(taskId: string, direction: "up" | "down"): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/score/${direction}`, {
    method: "POST",
  });
}

export async function updateTask(taskId: string, direction: "up" | "down"): Promise<void> {
  await scoreTask(taskId, direction);
}

export async function toggleTask(taskId: string): Promise<void> {
  // Habitica doesn't have a simple toggle, you have to score it
  // For Todos, scoring 'up' completes it
  await updateTask(taskId, "up");
}

export async function createTask(body: CreateTaskBody): Promise<void> {
  await habiticaFetch("/api/v3/tasks/user", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function getUser(): Promise<HabiticaUser> {
  return habiticaFetch<HabiticaUser>("/api/v3/user?userFields=stats,party,items,profile,preferences");
}

export async function forceCompleteQuest(): Promise<unknown> {
  return habiticaFetch("/api/v3/groups/party/quests/force-complete", {
    method: "POST",
  });
}

export async function acceptQuest(): Promise<unknown> {
  return habiticaFetch("/api/v3/groups/party/quests/accept", {
    method: "POST",
  });
}

export async function abortQuest(): Promise<unknown> {
  return habiticaFetch("/api/v3/groups/party/quests/abort", {
    method: "POST",
  });
}

export async function getContent(): Promise<HabiticaContent> {
  return habiticaFetch<HabiticaContent>("/api/v3/content");
}

export async function buyGear(key: string): Promise<unknown> {
  return habiticaFetch(`/api/v3/user/buy-gear/${key}`, {
    method: "POST",
  });
}

export async function buyHealthPotion(): Promise<unknown> {
  return habiticaFetch("/api/v3/user/buy-health-potion", {
    method: "POST",
  });
}

export async function buyQuest(key: string): Promise<unknown> {
  return habiticaFetch(`/api/v3/user/purchase/quests/${key}`, {
    method: "POST",
  });
}

export async function buyArmoire(): Promise<unknown> {
  return habiticaFetch("/api/v3/user/buy-armoire", {
    method: "POST",
  });
}
