/**
 * Deterministic pseudo-random numbers: the same seed always produces the same
 * exam (spec §7, "graine aléatoire enregistrée").
 */

/** cyrb128 string hash → four 32-bit seeds. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    // Seeds are ASCII (UUID + question ids): same value as charCodeAt.
    const k = str.codePointAt(i) ?? 0;
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Wraps to a signed 32-bit integer (ToInt32), like `x | 0`. */
function int32(x: number): number {
  return Math.imul(x, 1);
}

/** sfc32 generator: returns floats in [0, 1). */
export function createRng(seed: string): () => number {
  let [a, b, c, d] = cyrb128(seed);
  return () => {
    // a + b + d is exact in a double, so wrapping once equals wrapping each sum.
    const t = int32(a + b + d);
    d = int32(d + 1);
    a = b ^ (b >>> 9);
    b = int32(c + (c << 3));
    c = int32(((c << 21) | (c >>> 11)) + t);
    return (t >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] (inclusive). */
export function randInt(random: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(random() * (max - min + 1));
}

export function pickRandom<T>(random: () => number, list: readonly T[]): T | undefined {
  return list.length ? list[Math.floor(random() * list.length)] : undefined;
}
