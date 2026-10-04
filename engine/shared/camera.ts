/** Scene renderers whose camera supports the shared, stepped tactical view controls. */
export function supportsCameraOrientation(scene: { renderer?: string; terrain?: unknown } | null | undefined) {
  return scene?.renderer === 'babylon-d8' || (scene?.renderer === 'babylon-hd2d' && Boolean(scene.terrain));
}
