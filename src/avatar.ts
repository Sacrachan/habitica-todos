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

  // All mobile PNGs are 140x140 and self-positioned — no manual x/y offset needed.
  // We build the layer list in the exact order Habitica's avatar.vue renders them.
  const urls: string[] = [];

  // Background fills the whole canvas
  if (preferences?.background) urls.push(`${ASSET_BASE_URL}background_${preferences.background}.png`);

  // Mount body — behind everything
  if (items?.currentMount) urls.push(`${ASSET_BASE_URL}Mount_Body_${items.currentMount}.png`);

  // hair_flower rendered unconditionally BEFORE all avatar layers
  // (official comment: "Show flower ALL THE TIME!!!")
  if (hair?.flower) urls.push(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);

  // --- Avatar layers ---

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

  // Back collar (rendered after armor in official source)
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

  // Pet — the PNG is self-positioned within the 140x140 canvas
  if (items?.currentPet) urls.push(`${ASSET_BASE_URL}Pet-${items.currentPet}.png`);

  const layers = (await Promise.all(urls.map(fetchImageAsBase64))).filter(Boolean);

  const images = layers
    .map((d) => `<image xlink:href="${d}" x="0" y="0" width="140" height="140"/>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="140" height="140" fill="transparent"/>${images}</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
