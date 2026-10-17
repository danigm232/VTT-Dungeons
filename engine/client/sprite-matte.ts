/** Some supplied PNGs have an opaque black canvas instead of alpha. Remove
 * only near-black pixels connected to the image border; keep dark clothing
 * and enclosed black details. Already-transparent artwork is untouched. */
export function clearBlackSpriteMatte(pixels: Uint8ClampedArray, width: number, height: number): boolean {
  if (width < 2 || height < 2 || pixels.length !== width * height * 4) return false;
  const black = (i: number) => pixels[i * 4 + 3]! >= 250 && Math.max(pixels[i * 4]!, pixels[i * 4 + 1]!, pixels[i * 4 + 2]!) <= 3;
  if (![0, width - 1, (height - 1) * width, width * height - 1].every(black)) return false;
  const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const add = (i: number) => { if (!visited[i] && black(i)) { visited[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++]!, x = i % width, y = Math.floor(i / width);
    if (x > 0) add(i - 1); if (x < width - 1) add(i + 1);
    if (y > 0) add(i - width); if (y < height - 1) add(i + width);
  }
  for (let index = 0; index < tail; index++) pixels[queue[index]! * 4 + 3] = 0;
  return tail > 0;
}
