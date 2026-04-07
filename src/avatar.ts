import { HabiticaUser } from "./types";

const AVATAR_BASE_URL = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary);
}

function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary);
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    return "";
  }
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;

  const layerUrls: string[] = [];
  const size = preferences?.size === "slim" ? "slim" : "broad";

  // 1. Background
  if (preferences?.background) layerUrls.push(`${AVATAR_BASE_URL}background_${preferences.background}.png`);

  // 2. Mount Body
  if (items?.currentMount) layerUrls.push(`${AVATAR_BASE_URL}Mount_Body_${items.currentMount}.png`);

  // 3. Back gear
  const back = items?.gear?.equipped?.back;
  if (back) layerUrls.push(`${AVATAR_BASE_URL}${back}.png`);

  // 4. Skin
  if (preferences?.skin) {
    const skinSuffix = preferences.sleep ? "_sleep" : "";
    layerUrls.push(`${AVATAR_BASE_URL}skin_${preferences.skin}${skinSuffix}.png`);
  }

  // 5. Shirt
  if (preferences?.shirt) {
    layerUrls.push(`${AVATAR_BASE_URL}${size}_shirt_${preferences.shirt}.png`);
  }

  // 6. Head Base
  layerUrls.push(`${AVATAR_BASE_URL}head_0.png`);

  // 7. Armor
  const armor = items?.gear?.equipped?.armor;
  if (armor && armor !== "armor_base_0") {
    layerUrls.push(`${AVATAR_BASE_URL}${size}_${armor}.png`);
  }

  // 8. Hair
  const hair = preferences?.hair;
  if (hair) {
    if (hair.base) layerUrls.push(`${AVATAR_BASE_URL}hair_base_${hair.base}_${hair.color || "black"}.png`);
    if (hair.bangs) layerUrls.push(`${AVATAR_BASE_URL}hair_bangs_${hair.bangs}_${hair.color || "black"}.png`);
    if (hair.mustache) layerUrls.push(`${AVATAR_BASE_URL}hair_mustache_${hair.mustache}_${hair.color || "black"}.png`);
    if (hair.beard) layerUrls.push(`${AVATAR_BASE_URL}hair_beard_${hair.beard}_${hair.color || "black"}.png`);
  }

  // 9. Equipment
  const gear = items?.gear?.equipped ?? {};
  if (gear.body) layerUrls.push(`${AVATAR_BASE_URL}${gear.body}.png`);
  if (gear.eyewear) layerUrls.push(`${AVATAR_BASE_URL}${gear.eyewear}.png`);
  if (gear.head && gear.head !== "head_base_0") layerUrls.push(`${AVATAR_BASE_URL}${gear.head}.png`);
  if (gear.headAccessory) layerUrls.push(`${AVATAR_BASE_URL}${gear.headAccessory}.png`);
  if (hair?.flower) layerUrls.push(`${AVATAR_BASE_URL}hair_flower_${hair.flower}.png`);

  // 10. Shield & Weapon
  if (gear.shield) layerUrls.push(`${AVATAR_BASE_URL}${gear.shield}.png`);
  if (gear.weapon) layerUrls.push(`${AVATAR_BASE_URL}${gear.weapon}.png`);

  // 11. Mount Head
  if (items?.currentMount) layerUrls.push(`${AVATAR_BASE_URL}Mount_Head_${items.currentMount}.png`);

  // 12. Pet
  if (items?.currentPet) layerUrls.push(`${AVATAR_BASE_URL}Pet-${items.currentPet}.png`);

  const layers = await Promise.all(layerUrls.map(fetchImageAsBase64));
  const filteredLayers = layers.filter((l) => l !== "");

  const offsetY = items?.currentMount ? 0 : 12;

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="140" height="140" fill="transparent" />
  ${filteredLayers.map((dataUri) => `<image xlink:href="${dataUri}" x="0" y="${offsetY}" width="140" height="140" />`).join("\n  ")}
</svg>`;

  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
}
