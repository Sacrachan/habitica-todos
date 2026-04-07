import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    // Buffer.from is available in Node/Raycast and is O(n) unlike Array.from join
    return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return "";
  }
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;

  const layerUrls: string[] = [];
  const size = preferences?.size === "slim" ? "slim" : "broad";

  if (preferences?.background) layerUrls.push(`${ASSET_BASE_URL}background_${preferences.background}.png`);
  if (items?.currentMount) layerUrls.push(`${ASSET_BASE_URL}Mount_Body_${items.currentMount}.png`);

  const back = items?.gear?.equipped?.back;
  if (back) layerUrls.push(`${ASSET_BASE_URL}${back}.png`);

  if (preferences?.skin) {
    layerUrls.push(`${ASSET_BASE_URL}skin_${preferences.skin}${preferences.sleep ? "_sleep" : ""}.png`);
  }
  if (preferences?.shirt) layerUrls.push(`${ASSET_BASE_URL}${size}_shirt_${preferences.shirt}.png`);

  layerUrls.push(`${ASSET_BASE_URL}head_0.png`);

  const armor = items?.gear?.equipped?.armor;
  if (armor && armor !== "armor_base_0") layerUrls.push(`${ASSET_BASE_URL}${size}_${armor}.png`);

  const hair = preferences?.hair;
  if (hair) {
    if (hair.base) layerUrls.push(`${ASSET_BASE_URL}hair_base_${hair.base}_${hair.color ?? "black"}.png`);
    if (hair.bangs) layerUrls.push(`${ASSET_BASE_URL}hair_bangs_${hair.bangs}_${hair.color ?? "black"}.png`);
    if (hair.mustache) layerUrls.push(`${ASSET_BASE_URL}hair_mustache_${hair.mustache}_${hair.color ?? "black"}.png`);
    if (hair.beard) layerUrls.push(`${ASSET_BASE_URL}hair_beard_${hair.beard}_${hair.color ?? "black"}.png`);
  }

  const gear = items?.gear?.equipped ?? {};
  if (gear.body) layerUrls.push(`${ASSET_BASE_URL}${gear.body}.png`);
  if (gear.eyewear) layerUrls.push(`${ASSET_BASE_URL}${gear.eyewear}.png`);
  if (gear.head && gear.head !== "head_base_0") layerUrls.push(`${ASSET_BASE_URL}${gear.head}.png`);
  if (gear.headAccessory) layerUrls.push(`${ASSET_BASE_URL}${gear.headAccessory}.png`);
  if (hair?.flower) layerUrls.push(`${ASSET_BASE_URL}hair_flower_${hair.flower}.png`);
  if (gear.shield) layerUrls.push(`${ASSET_BASE_URL}${gear.shield}.png`);
  if (gear.weapon) layerUrls.push(`${ASSET_BASE_URL}${gear.weapon}.png`);
  if (items?.currentMount) layerUrls.push(`${ASSET_BASE_URL}Mount_Head_${items.currentMount}.png`);
  if (items?.currentPet) layerUrls.push(`${ASSET_BASE_URL}Pet-${items.currentPet}.png`);

  const layers = (await Promise.all(layerUrls.map(fetchImageAsBase64))).filter(Boolean);
  const offsetY = items?.currentMount ? 0 : 12;

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="140" height="140" fill="transparent"/>${layers.map((d) => `<image xlink:href="${d}" x="0" y="${offsetY}" width="140" height="140"/>`).join("")}</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
