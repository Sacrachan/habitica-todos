import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";

// Habitica's avatar container is 141×147px.
// The sprite area is 90×90, offset 24px from the left (spritesMargin: '0 auto 0 24px').
// paddingTop is 0px when a mount is active, 24px otherwise.
// All sprite images are 90×90 and are placed absolutely within the sprite area.
// The pet uses CSS bottom:0; left:0 — it sits at the bottom of the full container.
const CONTAINER_W = 141;
const CONTAINER_H = 147;
const SPRITE_SIZE = 90;
const SPRITE_OFFSET_X = 24; // left margin matching spritesMargin '0 auto 0 24px'

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return "";
  }
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;
  const size = preferences?.size === "slim" ? "slim" : "broad";
  const hair = preferences?.hair;
  const gear = items?.gear?.equipped ?? {};
  const hasMount = !!items?.currentMount;
  const hasPet = !!items?.currentPet;

  // paddingTop: 0px with mount, 24px otherwise (matches Habitica paddingTop computed)
  const paddingTop = hasMount ? 0 : 24;

  // Sprite layers are placed at (SPRITE_OFFSET_X, paddingTop) in the container.
  const sx = SPRITE_OFFSET_X;
  const sy = paddingTop;

  // Pet: CSS bottom:0; left:0 on the full container means top = CONTAINER_H - SPRITE_SIZE.
  const petY = CONTAINER_H - SPRITE_SIZE;

  type LayerEntry = { url: string; x: number; y: number };
  const layerDefs: LayerEntry[] = [];

  const add = (url: string, x = sx, y = sy) => layerDefs.push({ url, x, y });

  // Background fills the full container (141×147), rendered at x=0, y=0.
  // In Habitica this is a CSS class on the root .avatar div, not a sprite.
  if (preferences?.background) {
    layerDefs.push({ url: `${ASSET_BASE_URL}background_${preferences.background}.png`, x: 0, y: 0 });
  }

  // Mount Body — behind everything else
  if (hasMount) add(`${ASSET_BASE_URL}Mount_Body_${items.currentMount}.png`);

  // hair_flower rendered UNCONDITIONALLY before all avatar layers.
  // Official comment: "Show flower ALL THE TIME!!!"
  if (hair?.flower) add(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);

  // --- Avatar layers (shown when no visual buff is active) ---

  // Chair
  if (preferences?.chair) add(`${ASSET_BASE_URL}chair_${preferences.chair}.png`);

  // Back gear
  if (gear.back) add(`${ASSET_BASE_URL}${gear.back}.png`);

  // Skin
  if (preferences?.skin) {
    add(`${ASSET_BASE_URL}skin_${preferences.skin}${preferences.sleep ? "_sleep" : ""}.png`);
  }

  // Shirt
  if (preferences?.shirt) add(`${ASSET_BASE_URL}${size}_shirt_${preferences.shirt}.png`);

  // Base head shape
  add(`${ASSET_BASE_URL}head_0.png`);

  // Armor
  if (gear.armor && gear.armor !== "armor_base_0") {
    add(`${ASSET_BASE_URL}${size}_${gear.armor}.png`);
  }

  // Back collar (was missing)
  if (gear.back_collar) add(`${ASSET_BASE_URL}${gear.back_collar}.png`);

  // Hair — official order: bangs → base → mustache → beard (was base → bangs)
  if (hair?.bangs) add(`${ASSET_BASE_URL}hair_bangs_${hair.bangs}_${hair.color ?? "black"}.png`);
  if (hair?.base) add(`${ASSET_BASE_URL}hair_base_${hair.base}_${hair.color ?? "black"}.png`);
  if (hair?.mustache) add(`${ASSET_BASE_URL}hair_mustache_${hair.mustache}_${hair.color ?? "black"}.png`);
  if (hair?.beard) add(`${ASSET_BASE_URL}hair_beard_${hair.beard}_${hair.color ?? "black"}.png`);

  // Body gear
  if (gear.body) add(`${ASSET_BASE_URL}${gear.body}.png`);

  // Eyewear
  if (gear.eyewear) add(`${ASSET_BASE_URL}${gear.eyewear}.png`);

  // Head gear
  if (gear.head && gear.head !== "head_base_0") add(`${ASSET_BASE_URL}${gear.head}.png`);

  // Head accessory
  if (gear.headAccessory) add(`${ASSET_BASE_URL}${gear.headAccessory}.png`);

  // hair_flower rendered again inside avatar layers (official renders it in both places)
  if (hair?.flower) add(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);

  // Shield
  if (gear.shield) add(`${ASSET_BASE_URL}${gear.shield}.png`);

  // Weapon
  if (gear.weapon) add(`${ASSET_BASE_URL}${gear.weapon}.png`);

  // Mount Head — in front of avatar
  if (hasMount) add(`${ASSET_BASE_URL}Mount_Head_${items.currentMount}.png`);

  // Pet — bottom:0; left:0 of the full container
  if (hasPet) add(`${ASSET_BASE_URL}Pet-${items.currentPet}.png`, 0, petY);

  // Fetch all images in parallel
  const fetched = await Promise.all(
    layerDefs.map(async (l) => ({ ...l, data: await fetchImageAsBase64(l.url) }))
  );
  const layers = fetched.filter((l) => l.data);

  const svgLayers = layers
    .map(
      (l) =>
        `<image xlink:href="${l.data}" x="${l.x}" y="${l.y}" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}"/>`
    )
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="${CONTAINER_W}" height="${CONTAINER_H}" viewBox="0 0 ${CONTAINER_W} ${CONTAINER_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="${CONTAINER_W}" height="${CONTAINER_H}" fill="transparent"/>${svgLayers}</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
