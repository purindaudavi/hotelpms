export function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Older browsers only: keep a UUID-shaped fallback instead of using timestamps.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Creates a repeatable UUID for one-time migration of records without IDs. */
export function createStableUuid(seed: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }

  const segment = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  const hex = `${segment(first)}${segment(second)}${segment(first ^ second)}${segment(Math.imul(first, second))}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
