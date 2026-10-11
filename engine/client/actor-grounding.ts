/** Transparent padding is not part of an actor's physical height or feet. */
export function alphaGrounding(rgba: ArrayLike<number>, width: number, height: number) {
  let top = height, bottom = -1;
  const minimum = Math.max(2, Math.ceil(width * .002));
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if ((rgba[(y * width + x) * 4 + 3] ?? 0) >= 32) count++;
    if (count >= minimum) { top = Math.min(top, y); bottom = y; }
  }
  return bottom < top ? { anchorY: 1, heightFraction: 1 }
    : { anchorY: (bottom + 1) / height, heightFraction: (bottom + 1 - top) / height };
}

/** A close view changes the camera, never the size of characters in metres. */
export function actorDetailZoom(currentZoom: number, halfHeight: number, viewportHeight: number, actorHeight: number, beta: number) {
  const projectedPixels = actorHeight * Math.sin(beta) * viewportHeight / (2 * halfHeight);
  const targetPixels = Math.min(150, Math.max(90, viewportHeight * .24));
  return Math.max(.4, Math.min(24, currentZoom * targetPixels / Math.max(1, projectedPixels)));
}
