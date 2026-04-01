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
    hair: { color: string; base: number; bangs: number; flower: number; mustache: number; beard: number };
    skin: string;
    shirt: string;
    size: string;
    background: string;
    sleep: boolean;
  };
}

export interface HabiticaTask {
  id: string;
  text: string;
  notes: string;
  completed: boolean;
  type: "habit" | "daily" | "todo" | "reward";
  value: number;
  priority: number;
  attribute: string;
  date?: string | null;
  tags: string[];
  counterUp?: number;
  counterDown?: number;
  streak?: number;
  up?: boolean;
  down?: boolean;
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
        twoHanded?: boolean;
      }
    >;
  };
  questKeys: string[];
  quests: Record<
    string,
    {
      text: string;
      notes: string;
      value: number;
      type: string;
    }
  >;
}
