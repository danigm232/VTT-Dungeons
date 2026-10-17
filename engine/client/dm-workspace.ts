export type WindowLayout = { span?: number; height?: number };
/** Keep source order while filling the space below shorter neighbours. Full-width
 * windows form a barrier: enlarging/restoring one never changes the saved order. */
export function packDmWorkspace(items: Array<{ id: string; span: number; height: number }>, columns = 60, gap = 12, rowUnit = 2) {
  const skyline = Array<number>(columns).fill(0);
  const spacing = Math.ceil(gap / rowUnit) * rowUnit;
  return items.map(item => {
    const span = Math.max(1, Math.min(columns, Math.round(item.span)));
    const height = Math.max(rowUnit, Math.ceil(item.height / rowUnit) * rowUnit);
    let column = 0, top = Infinity;
    for (let start = 0; start <= columns - span; start++) {
      const candidate = Math.max(...skyline.slice(start, start + span));
      if (candidate < top) { top = candidate; column = start; }
    }
    skyline.fill(top + height + spacing, column, column + span);
    return { id: item.id, row: top / rowUnit + 1, rowSpan: height / rowUnit, column: column + 1, span, height };
  });
}
export type WorkspaceState = { closed: string[]; minimized: string[]; maximized: string[]; windows: Record<string, WindowLayout>; order: string[] };
export type WorkspaceMode = 'exploration' | 'combat';
export type DmWorkspacePresetId = 'map-scene' | 'two-columns' | 'tactical' | 'overview';

const dmWorkspacePresetSpecs: Record<DmWorkspacePresetId, { order: string[]; spans: Record<string, number> }> = {
  'map-scene': {
    order: ['mapWindow', '$companion', 'interacciones', 'encounterCard', 'jugadores', 'pnj-de-escena', 'combatCard', 'campRestCard', 'animationAuditCard'],
    spans: { mapWindow: 8, $companion: 4, explorationCard: 4, combatCard: 4, interacciones: 4, jugadores: 6, encounterCard: 4, 'pnj-de-escena': 6, campRestCard: 6, animationAuditCard: 6 }
  },
  'two-columns': {
    order: ['mapWindow', '$companion', 'jugadores', 'encounterCard', 'interacciones', 'pnj-de-escena', 'campRestCard', 'animationAuditCard'],
    spans: { mapWindow: 6, $companion: 6, explorationCard: 6, combatCard: 6, jugadores: 6, encounterCard: 6, interacciones: 6, 'pnj-de-escena': 6, campRestCard: 6, animationAuditCard: 6 }
  },
  tactical: {
    order: ['mapWindow', '$companion', 'jugadores', 'encounterCard', 'interacciones', 'pnj-de-escena', 'campRestCard', 'animationAuditCard'],
    spans: { mapWindow: 7, $companion: 5, explorationCard: 5, combatCard: 5, encounterCard: 5, jugadores: 5, interacciones: 3, 'pnj-de-escena': 4, campRestCard: 5, animationAuditCard: 6 }
  },
  overview: {
    order: ['mapWindow', '$companion', 'jugadores', 'pnj-de-escena', 'interacciones', 'encounterCard', 'combatCard', 'campRestCard', 'animationAuditCard'],
    spans: { mapWindow: 12, $companion: 4, encounterCard: 2.4, jugadores: 4, interacciones: 2.4, 'pnj-de-escena': 4, combatCard: 2.4, campRestCard: 4, animationAuditCard: 4 }
  }
};

/** A named starting arrangement for the workspace windows; the connection card is outside this grid. */
export function createDmWorkspacePreset(mode: WorkspaceMode, preset: DmWorkspacePresetId): Pick<WorkspaceState, 'order' | 'windows'> {
  const companion = mode === 'combat' ? 'combatCard' : 'explorationCard';
  const spec = dmWorkspacePresetSpecs[preset];
  const replaceCompanion = (id: string) => id === '$companion' ? companion : id;
  const spans = Object.fromEntries(Object.entries(spec.spans).map(([id, span]) => [replaceCompanion(id), span]));
  spans[companion] = spec.spans.$companion!;
  return {
    order: [...new Set(spec.order.map(replaceCompanion))],
    windows: Object.fromEntries(Object.entries(spans).map(([id, span]) => [id, { span }]))
  };
}

/** Defaults only: never replace a DM's saved arrangement. */
export function recommendedDmWorkspace(mode: WorkspaceMode, _width: number): WorkspaceState {
  const preset = createDmWorkspacePreset(mode, mode === 'combat' ? 'tactical' : 'map-scene');
  return {
    closed: ['animationAuditCard'], minimized: [], maximized: [],
    order: preset.order,
    windows: preset.windows
  };
}
