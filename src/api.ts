import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import {
  HabiticaTask,
  HabiticaUser,
  HabiticaContent,
  HabiticaTag,
  CreateTaskBody,
  UpdateTaskBody,
} from "./types";

interface Preferences {
  apiUserId: string;
  apiToken: string;
}

const HABITICA_API_URL = "https://habitica.com";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function habiticaFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { apiUserId, apiToken } = getPreferenceValues<Preferences>();

  const headers: Record<string, string> = {
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

  const json = (await response.json()) as { success: boolean; data: T; message?: string };

  if (!json.success) {
    throw new Error(json.message || `Habitica API returned success: false for ${endpoint}`);
  }

  return json.data;
}

export async function getTasks(type?: string): Promise<HabiticaTask[]> {
  const query = type ? `?type=${type}` : "";
  return habiticaFetch<HabiticaTask[]>(`/api/v3/tasks/user${query}`);
}

export async function getTags(): Promise<HabiticaTag[]> {
  return habiticaFetch<HabiticaTag[]>("/api/v3/tags");
}

export async function scoreTask(taskId: string, direction: "up" | "down"): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/score/${direction}`, {
    method: "POST",
  });
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<HabiticaTask> {
  return habiticaFetch<HabiticaTask>(`/api/v3/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function toggleTask(taskId: string): Promise<void> {
  await scoreTask(taskId, "up");
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
