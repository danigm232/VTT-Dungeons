export type GridStyle = {
  mode: 'contrast' | 'fixed';
  color: string;
  opacity: number;
  thickness: 1 | 2 | 3;
};

export const DEFAULT_GRID_STYLE: GridStyle = {
  mode: 'contrast',
  color: '#c8cec3',
  opacity: 0.22,
  thickness: 1
};

const MATERIAL_COLORS: Record<string, string> = {
  stone: '#77776f', sand: '#a99b7d', moss: '#365342', basalt: '#373c45',
  'cave-rock': '#39494b', wood: '#815c39', 'wet-wood': '#789ba0',
  'hold-wood': '#526d7a', 'wall-wood': '#4a392c', 'stair-wood': '#a57947',
  'stair-down': '#3b3027', 'stair-edge': '#d5ad63', 'stair-rail': '#282622',
  hatch: '#17252a', earth: '#6c644b', grass: '#567852', water: '#305d7a',
  'exterior-deck': '#6d6252', 'ship-hull': '#403a32'
};

export function normalizeGridStyle(value: unknown, fallback: GridStyle = DEFAULT_GRID_STYLE): GridStyle {
  if (!value || typeof value !== 'object') return { ...fallback };
  const saved = value as Partial<GridStyle>;
  const color = typeof saved.color === 'string' && /^#[0-9a-f]{6}$/i.test(saved.color) ? saved.color : fallback.color;
  const opacity = Number.isFinite(saved.opacity) ? Math.max(0.06, Math.min(0.7, saved.opacity!)) : fallback.opacity;
  const thickness = saved.thickness === 2 || saved.thickness === 3 ? saved.thickness : saved.thickness === 1 ? 1 : fallback.thickness;
  const mode = saved.mode === 'fixed' || saved.mode === 'contrast' ? saved.mode : fallback.mode;
  return { mode, color, opacity, thickness };
}
export function gridMaterialLuminance(materialId: string | null | undefined): number | null {
  if (!materialId) return null;
  const color = MATERIAL_COLORS[materialId];
  if (!color) return null;
  return gridRgbLuminance(...[1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16)) as [number, number, number]);
}

export function gridRgbLuminance(red: number, green: number, blue: number): number {
  const linear = (channel: number) => {
    const value = Math.max(0, Math.min(255, channel)) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return linear(red) * 0.2126 + linear(green) * 0.7152 + linear(blue) * 0.0722;
}

/** Uses a dark stroke on light floors and a warm light stroke on dark floors. */
export function gridContrastColor(luminance: number | null, fallback = DEFAULT_GRID_STYLE.color): string {
  if (luminance === null) return fallback;
  return luminance >= 0.3 ? '#202a2b' : '#f0e6cd';
}
