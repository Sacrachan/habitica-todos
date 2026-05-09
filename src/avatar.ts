import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";

// Avatar canvas dimensions match Habitica's `.avatar` container in avatar.vue
// (width: 141px, height: 147px). Sprites box (`.character-sprites`) is 90x90,
// positioned at margin-left:24 inside .avatar. The avatar's padding-top is 24
// by default, but 0 when the user has a mount (so the mount fits at the top).
const VIEW_W = 141;
const VIEW_H = 147;
const SPRITES_X = 24;

function getPngDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  if (buffer.byteLength < 24) return null;
  const view = new DataView(buffer);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A; IHDR width @16, height @20.
  if (view.getUint32(0) !== 0x89504e47) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

interface Layer {
  data: string;
  width: number;
  height: number;
}

async function fetchPngLayer(url: string): Promise<Layer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const dims = getPngDimensions(buffer);
    if (!dims) return null;
    return {
      data: `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`,
      width: dims.width,
      height: dims.height,
    };
  } catch {
    return null;
  }
}

/** How a layer is positioned within the 141x147 avatar canvas. */
type Anchor = "background" | "sprites" | "pet";

interface LayerSpec {
  url: string;
  anchor: Anchor;
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;
  const size = preferences?.size === "slim" ? "slim" : "broad";
  const hair = preferences?.hair;
  // Habitica's avatar.vue uses costume gear when preferences.costume is true,
  // otherwise equipped gear. See computed property `costumeClass`.
  const gear = (preferences?.costume ? items?.gear?.costume : items?.gear?.equipped) ?? {};

  // paddingTop in avatar.vue: 0 when mount, 24 otherwise. This shifts the
  // sprites box down so the pet/character has room when no mount is present.
  const spritesY = items?.currentMount ? 0 : 24;

  const specs: LayerSpec[] = [];

  // Background — applied as CSS background-image on `.avatar` element itself,
  // so it renders behind every span sprite.
  if (preferences?.background) {
    specs.push({ url: `${ASSET_BASE_URL}background_${preferences.background}.png`, anchor: "background" });
  }

  // Mount body — first sprite span in avatar.vue (before visualBuffs/avatar)
  if (items?.currentMount) {
    specs.push({ url: `${ASSET_BASE_URL}Mount_Body_${items.currentMount}.png`, anchor: "sprites" });
  }

  // hair_flower rendered unconditionally BEFORE all avatar layers
  // (official comment: "Show flower ALL THE TIME!!!")
  if (hair?.flower) specs.push({ url: `${ASSET_BASE_URL}hair_flower_${hair.flower}.png`, anchor: "sprites" });

  // Chair / wheelchair — "none" is Habitica's sentinel for "no chair"
  if (preferences?.chair && preferences.chair !== "none") {
    specs.push({ url: `${ASSET_BASE_URL}chair_${preferences.chair}.png`, anchor: "sprites" });
  }

  // Back gear
  if (gear.back && gear.back !== "back_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.back}.png`, anchor: "sprites" });
  }

  // Skin
  if (preferences?.skin) {
    specs.push({
      url: `${ASSET_BASE_URL}skin_${preferences.skin}${preferences.sleep ? "_sleep" : ""}.png`,
      anchor: "sprites",
    });
  }

  // Shirt
  if (preferences?.shirt) {
    specs.push({ url: `${ASSET_BASE_URL}${size}_shirt_${preferences.shirt}.png`, anchor: "sprites" });
  }

  // Base head shape
  specs.push({ url: `${ASSET_BASE_URL}head_0.png`, anchor: "sprites" });

  // Armor
  if (gear.armor && gear.armor !== "armor_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${size}_${gear.armor}.png`, anchor: "sprites" });
  }

  // Back collar
  if (gear.back_collar) specs.push({ url: `${ASSET_BASE_URL}${gear.back_collar}.png`, anchor: "sprites" });

  // Hair — official order: bangs → base → mustache → beard
  if (hair?.bangs) {
    specs.push({ url: `${ASSET_BASE_URL}hair_bangs_${hair.bangs}_${hair.color ?? "black"}.png`, anchor: "sprites" });
  }
  if (hair?.base) {
    specs.push({ url: `${ASSET_BASE_URL}hair_base_${hair.base}_${hair.color ?? "black"}.png`, anchor: "sprites" });
  }
  if (hair?.mustache) {
    specs.push({
      url: `${ASSET_BASE_URL}hair_mustache_${hair.mustache}_${hair.color ?? "black"}.png`,
      anchor: "sprites",
    });
  }
  if (hair?.beard) {
    specs.push({ url: `${ASSET_BASE_URL}hair_beard_${hair.beard}_${hair.color ?? "black"}.png`, anchor: "sprites" });
  }

  // Body gear
  if (gear.body && gear.body !== "body_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.body}.png`, anchor: "sprites" });
  }

  // Eyewear
  if (gear.eyewear && gear.eyewear !== "eyewear_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.eyewear}.png`, anchor: "sprites" });
  }

  // Head gear
  if (gear.head && gear.head !== "head_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.head}.png`, anchor: "sprites" });
  }

  // Head accessory
  if (gear.headAccessory && gear.headAccessory !== "headAccessory_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.headAccessory}.png`, anchor: "sprites" });
  }

  // hair_flower again inside avatar layers (official renders it in both places)
  if (hair?.flower) specs.push({ url: `${ASSET_BASE_URL}hair_flower_${hair.flower}.png`, anchor: "sprites" });

  // Shield
  if (gear.shield && gear.shield !== "shield_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.shield}.png`, anchor: "sprites" });
  }

  // Weapon
  if (gear.weapon && gear.weapon !== "weapon_base_0") {
    specs.push({ url: `${ASSET_BASE_URL}${gear.weapon}.png`, anchor: "sprites" });
  }

  // Mount head — in front of avatar layers
  if (items?.currentMount) {
    specs.push({ url: `${ASSET_BASE_URL}Mount_Head_${items.currentMount}.png`, anchor: "sprites" });
  }

  // Pet — in avatar.vue, .current-pet has bottom:0; left:0; relative to .avatar
  if (items?.currentPet) {
    specs.push({ url: `${ASSET_BASE_URL}Pet-${items.currentPet}.png`, anchor: "pet" });
  }

  const fetched = await Promise.all(
    specs.map((s) => fetchPngLayer(s.url).then((l) => (l ? { ...l, anchor: s.anchor } : null))),
  );

  const images = fetched
    .filter((l): l is Layer & { anchor: Anchor } => l !== null)
    .map((l) => {
      let x = 0;
      let y = 0;
      if (l.anchor === "background") {
        // Background fills the 141x147 avatar at its native PNG size.
        x = 0;
        y = 0;
      } else if (l.anchor === "sprites") {
        // Avatar sprites stack at the top-left of `.character-sprites` —
        // (24, spritesY) within the 141x147 avatar container.
        x = SPRITES_X;
        y = spritesY;
      } else {
        // Pet anchored to .avatar's bottom-left (left:0; bottom:0;).
        x = 0;
        y = VIEW_H - l.height;
      }
      return `<image xlink:href="${l.data}" x="${x}" y="${y}" width="${l.width}" height="${l.height}"/>`;
    })
    .join("");

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg width="${VIEW_W}" height="${VIEW_H}"`,
    ` viewBox="0 0 ${VIEW_W} ${VIEW_H}"`,
    ` xmlns="http://www.w3.org/2000/svg"`,
    ` xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `<rect width="${VIEW_W}" height="${VIEW_H}" fill="transparent"/>`,
    images,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
