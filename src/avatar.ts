import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";

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

  // Habitica's avatar container is 141x147px (width/height props in avatar.vue).
  // All mobile PNGs are 140x140 and self-positioned within that space.
  // We render the SVG at 140x140 output but use viewBox="0 0 141 147" so all
  // sprites scale down proportionally, matching the Habitica website appearance.
  const VIEW_W = 141;
  const VIEW_H = 147;
  const OUT_SIZE = 140;
  const SPRITE = 140;

  const urls: string[] = [];

  // Background
  if (preferences?.background) urls.push(`${ASSET_BASE_URL}background_${preferences.background}.png`);

  // Mount body — behind everything
  if (items?.currentMount) urls.push(`${ASSET_BASE_URL}Mount_Body_${items.currentMount}.png`);

  // hair_flower rendered unconditionally BEFORE all avatar layers
  // (official comment: "Show flower ALL THE TIME!!!")
  if (hair?.flower) urls.push(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);

  // Chair / wheelchair
  if (preferences?.chair) urls.push(`${ASSET_BASE_URL}chair_${preferences.chair}.png`);

  // Back gear
  if (gear.back) urls.push(`${ASSET_BASE_URL}${gear.back}.png`);

  // Skin
  if (preferences?.skin) {
    urls.push(`${ASSET_BASE_URL}skin_${preferences.skin}${preferences.sleep ? "_sleep" : ""}.png`);
  }

  // Shirt
  if (preferences?.shirt) urls.push(`${ASSET_BASE_URL}${size}_shirt_${preferences.shirt}.png`);

  // Base head shape
  urls.push(`${ASSET_BASE_URL}head_0.png`);

  // Armor
  if (gear.armor && gear.armor !== "armor_base_0") {
    urls.push(`${ASSET_BASE_URL}${size}_${gear.armor}.png`);
  }

  // Back collar
  if (gear.back_collar) urls.push(`${ASSET_BASE_URL}${gear.back_collar}.png`);

  // Hair — official order: bangs → base → mustache → beard
  if (hair?.bangs) urls.push(`${ASSET_BASE_URL}hair_bangs_${hair.bangs}_${hair.color ?? "black"}.png`);
  if (hair?.base) urls.push(`${ASSET_BASE_URL}hair_base_${hair.base}_${hair.color ?? "black"}.png`);
  if (hair?.mustache) urls.push(`${ASSET_BASE_URL}hair_mustache_${hair.mustache}_${hair.color ?? "black"}.png`);
  if (hair?.beard) urls.push(`${ASSET_BASE_URL}hair_beard_${hair.beard}_${hair.color ?? "black"}.png`);

  // Body gear
  if (gear.body) urls.push(`${ASSET_BASE_URL}${gear.body}.png`);

  // Eyewear
  if (gear.eyewear) urls.push(`${ASSET_BASE_URL}${gear.eyewear}.png`);

  // Head gear
  if (gear.head && gear.head !== "head_base_0") urls.push(`${ASSET_BASE_URL}${gear.head}.png`);

  // Head accessory
  if (gear.headAccessory) urls.push(`${ASSET_BASE_URL}${gear.headAccessory}.png`);

  // hair_flower again inside avatar layers (official renders it in both places)
  if (hair?.flower) urls.push(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);

  // Shield
  if (gear.shield) urls.push(`${ASSET_BASE_URL}${gear.shield}.png`);

  // Weapon
  if (gear.weapon) urls.push(`${ASSET_BASE_URL}${gear.weapon}.png`);

  // Mount head — in front of avatar
  if (items?.currentMount) urls.push(`${ASSET_BASE_URL}Mount_Head_${items.currentMount}.png`);

  // Pet — self-positioned within 140x140 canvas
  if (items?.currentPet) urls.push(`${ASSET_BASE_URL}Pet-${items.currentPet}.png`);

  const layers = (await Promise.all(urls.map(fetchImageAsBase64))).filter(Boolean);

  const images = layers
    .map((d) => `<image xlink:href="${d}" x="0" y="0" width="${SPRITE}" height="${SPRITE}"/>`)
    .join("");

  // viewBox="0 0 141 147" crops and scales sprites to match Habitica's container
  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg width="${OUT_SIZE}" height="${OUT_SIZE}"`,
    ` viewBox="0 0 ${VIEW_W} ${VIEW_H}"`,
    ` xmlns="http://www.w3.org/2000/svg"`,
    ` xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `<rect width="${VIEW_W}" height="${VIEW_H}" fill="transparent"/>`,
    images,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
