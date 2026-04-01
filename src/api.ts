import { getPreferenceValues } from "@raycast/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HabiticaTask {
  id: string;
  _id: string;
  text: string;
  type: "habit" | "daily" | "todo" | "reward";
  notes: string;
  priority: number;
  date: string | null;
  completed: boolean;
  checklist: { id: string; text: string; completed: boolean }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  value: number;
  up?: boolean;
  down?: boolean;
  counterUp?: number;
  counterDown?: number;
  streak?: number;
}

export interface HabiticaTag {
  id: string;
  name: string;
}

export interface CreateTaskBody {
  text: string;
  type: string;
  notes?: string;
  priority?: number;
  date?: string;
  tags?: string[];
}

export interface UpdateTaskBody {
  text?: string;
  notes?: string;
  priority?: number;
  date?: string;
}

interface HabiticaResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface HabiticaUser {
  id: string;
  profile: {
    imageUrl?: string;
  };
  stats: {
    hp: number;
    mp: number;
    exp: number;
    toNextLevel: number;
    lvl: number;
    gp: number;
  };
  party: {
    quest: {
      key: string;
      active: boolean;
      progress?: {
        up: number;
        down: number;
        collect?: Record<string, number>;
      };
    };
  };
  items: {
    eggs: Record<string, number>;
    hatchingPotions: Record<string, number>;
    food: Record<string, number>;
    gear: {
      equipped: Record<string, string>;
    };
    pets: Record<string, number>;
    mounts: Record<string, number>;
    currentPet?: string;
    currentMount?: string;
  };
  preferences: {
    hair: { color: string; base: number; bangs: number; flower: number };
    skin: string;
    shirt: string;
    size: string;
    background: string;
  };
}

export interface HabiticaContent {
  gear: {
    flat: Record<
      string,
      {
        text: string;
        notes: string;
        value: number;
        type: string;
        klass?: string;
        tier?: number;
        str?: number;
        int?: number;
        per?: number;
        con?: number;
      }
    >;
  };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const BASE_URL = "https://habitica.com";

function getHeaders(): Record<string, string> {
  const { apiUserId, apiToken } = getPreferenceValues<Preferences>();
  return {
    "Content-Type": "application/json",
    "x-api-user": apiUserId,
    "x-api-key": apiToken,
    "x-client": `${apiUserId}-RaycastExtension`,
  };
}

async function habiticaFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });

  const json = (await res.json()) as HabiticaResponse<T>;

  if (!json.success) {
    throw new Error(json.message || `Habitica API error on ${path}`);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTasks(type?: string): Promise<HabiticaTask[]> {
  const query = type ? `?type=${type}` : "";
  return habiticaFetch<HabiticaTask[]>(`/api/v3/tasks/user${query}`);
}

export async function getTags(): Promise<HabiticaTag[]> {
  return habiticaFetch<HabiticaTag[]>("/api/v3/tags");
}

export async function createTask(body: CreateTaskBody): Promise<HabiticaTask> {
  return habiticaFetch<HabiticaTask>("/api/v3/tasks/user", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<HabiticaTask> {
  return habiticaFetch<HabiticaTask>(`/api/v3/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function scoreTask(taskId: string, direction: "up" | "down"): Promise<unknown> {
  return habiticaFetch(`/api/v3/tasks/${taskId}/score/${direction}`, {
    method: "POST",
  });
}

export async function deleteTask(taskId: string): Promise<unknown> {
  return habiticaFetch(`/api/v3/tasks/${taskId}`, {
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

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    return "";
  }
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;
  const baseUrl = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";

  const layerUrls: string[] = [];

  // Order of layering for a basic Habitica avatar:
  // 1. Background
  if (preferences?.background) layerUrls.push(`${baseUrl}background_${preferences.background}.png`);

  // 2. Mount
  if (items?.currentMount) layerUrls.push(`${baseUrl}Mount_Body_${items.currentMount}.png`);

  // 3. Body (Skin)
  if (preferences?.skin) layerUrls.push(`${baseUrl}skin_${preferences.skin}.png`);

  // 4. Back gear (e.g. wings) - items.gear.equipped.back
  const back = items?.gear?.equipped?.back;
  if (back) layerUrls.push(`${baseUrl}${back}.png`);

  // 5. Shirt
  if (preferences?.shirt) {
    const size = preferences.size === "slim" ? "slim" : "broad";
    layerUrls.push(`${baseUrl}${size}_shirt_${preferences.shirt}.png`);
  }

  // 6. Armor
  const armor = items?.gear?.equipped?.armor;
  if (armor && armor !== "armor_base_0") {
    layerUrls.push(`${baseUrl}${armor}.png`);
  }

  // 7. Head (Body base)
  layerUrls.push(`${baseUrl}head_0.png`);

  // 8. Hair
  const hair = preferences?.hair;
  if (hair) {
    if (hair.base) layerUrls.push(`${baseUrl}hair_base_${hair.base}_${hair.color || "black"}.png`);
    if (hair.bangs) layerUrls.push(`${baseUrl}hair_bangs_${hair.bangs}_${hair.color || "black"}.png`);
    if (hair.flower) layerUrls.push(`${baseUrl}hair_flower_${hair.flower}.png`);
  }

  // 9. Equipment
  const gear = items?.gear?.equipped || {};
  if (gear.head && gear.head !== "head_base_0") layerUrls.push(`${baseUrl}${gear.head}.png`);
  if (gear.weapon) layerUrls.push(`${baseUrl}${gear.weapon}.png`);
  if (gear.shield) layerUrls.push(`${baseUrl}${gear.shield}.png`);
  if (gear.eyewear) layerUrls.push(`${baseUrl}${gear.eyewear}.png`);
  if (gear.headAccessory) layerUrls.push(`${baseUrl}${gear.headAccessory}.png`);

  // 10. Pet (Drawn in front)
  if (items?.currentPet) layerUrls.push(`${baseUrl}Pet-${items.currentPet}.png`);

  // Fetch all images and convert to base64
  const layers = await Promise.all(layerUrls.map(async (url) => await fetchImageAsBase64(url)));
  const filteredLayers = layers.filter((l) => l !== "");

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="140" height="140" fill="transparent" />
  ${filteredLayers.map((dataUri) => `<image xlink:href="${dataUri}" x="0" y="0" width="140" height="140" />`).join("\n  ")}
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
