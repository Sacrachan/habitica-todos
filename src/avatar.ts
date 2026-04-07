import { HabiticaUser } from "./types";

/** Encode an ArrayBuffer to base64 without relying on Node's Buffer global.
 *  Works in Node (via Uint8Array) and in any browser-like runtime. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Encode a UTF-8 string to base64 without relying on Node's Buffer global. */
function stringToBase64(str: string): string {
  // TextEncoder is available in both Node >=16 and all modern browser runtimes.
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return `data:image/png;base64,${base64}`;
  } catch {
    return "";
  }
}

export async function getAvatarSvg(user: HabiticaUser): Promise<string> {
  const { preferences, items } = user;
  const baseUrl = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";

  const layerUrls: string[] = [];
  const size = preferences?.size === "slim" ? "slim" : "broad";

  // 1. Background
  if (preferences?.background) layerUrls.push(`${baseUrl}background_${preferences.background}.png`);

  // 2. Mount Body
  if (items?.currentMount) layerUrls.push(`${baseUrl}Mount_Body_${items.currentMount}.png`);

  // 3. Back gear
  const back = items?.gear?.equipped?.back;
  if (back) layerUrls.push(`${baseUrl}${back}.png`);

  // 4. Skin
  if (preferences?.skin) {
    const skinSuffix = preferences.sleep ? "_sleep" : "";
    layerUrls.push(`${baseUrl}skin_${preferences.skin}${skinSuffix}.png`);
  }

  // 5. Shirt
  if (preferences?.shirt) {
    layerUrls.push(`${baseUrl}${size}_shirt_${preferences.shirt}.png`);
  }

  // 6. Head Base
  layerUrls.push(`${baseUrl}head_0.png`);

  // 7. Armor
  const armor = items?.gear?.equipped?.armor;
  if (armor && armor !== "armor_base_0") {
    layerUrls.push(`${baseUrl}${size}_${armor}.png`);
  }

  // 8. Hair
  const hair = preferences?.hair;
  if (hair) {
    if (hair.base) layerUrls.push(`${baseUrl}hair_base_${hair.base}_${hair.color || "black"}.png`);
    if (hair.bangs) layerUrls.push(`${baseUrl}hair_bangs_${hair.bangs}_${hair.color || "black"}.png`);
    if (hair.mustache) layerUrls.push(`${baseUrl}hair_mustache_${hair.mustache}_${hair.color || "black"}.png`);
    if (hair.beard) layerUrls.push(`${baseUrl}hair_beard_${hair.beard}_${hair.color || "black"}.png`);
  }

  // 9. Equipment
  const gear = items?.gear?.equipped || {};
  if (gear.body) layerUrls.push(`${baseUrl}${gear.body}.png`);
  if (gear.eyewear) layerUrls.push(`${baseUrl}${gear.eyewear}.png`);
  if (gear.head && gear.head !== "head_base_0") layerUrls.push(`${baseUrl}${gear.head}.png`);
  if (gear.headAccessory) layerUrls.push(`${baseUrl}${gear.headAccessory}.png`);
  if (hair?.flower) layerUrls.push(`${baseUrl}hair_flower_${hair.flower}.png`);

  // 10. Shield & Weapon
  if (gear.shield) layerUrls.push(`${baseUrl}${gear.shield}.png`);
  if (gear.weapon) layerUrls.push(`${baseUrl}${gear.weapon}.png`);

  // 11. Mount Head
  if (items?.currentMount) layerUrls.push(`${baseUrl}Mount_Head_${items.currentMount}.png`);

  // 12. Pet
  if (items?.currentPet) layerUrls.push(`${baseUrl}Pet-${items.currentPet}.png`);

  const layers = await Promise.all(layerUrls.map((url) => fetchImageAsBase64(url)));
  const filteredLayers = layers.filter((l) => l !== "");

  const offsetY = items?.currentMount ? 0 : 12;

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="140" height="140" fill="transparent" />
  ${filteredLayers.map((dataUri) => `<image xlink:href="${dataUri}" x="0" y="${offsetY}" width="140" height="140" />`).join("\n  ")}
</svg>`;

  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
}
