export type WindowLayout = { span?: number; height?: number };
export type WorkspaceState = { closed: string[]; minimized: string[]; maximized: string[]; windows: Record<string, WindowLayout>; order: string[] };
export type WorkspaceMode = 'exploration' | 'combat';
export type DmWorkspacePresetId = 'map-scene' | 'two-columns' | 'tactical' | 'overview';

const dmWorkspacePresetSpecs: Record<DmWorkspacePresetId, { order: string[]; spans: Record<string, number> }> = {
  'map-scene': {
    order: ['mapWindow', '$companion', 'interacciones', 'jugadores', 'encounterCard', 'pnj-de-escena', 'campRestCard', 'partida-y-copias', 'animationAuditCard'],
    spans: { mapWindow: 8, $companion: 4, interacciones: 4, jugadores: 4, encounterCard: 4, 'pnj-de-escena': 4, campRestCard: 6, 'partida-y-copias': 4, animationAuditCard: 6 }
  },
  'two-columns': {
    order: ['mapWindow', '$companion', 'jugadores', 'encounterCard', 'interacciones', 'pnj-de-escena', 'campRestCard', 'partida-y-copias', 'animationAuditCard'],
    spans: { mapWindow: 6, $companion: 6, jugadores: 6, encounterCard: 6, interacciones: 6, 'pnj-de-escena': 6, campRestCard: 6, 'partida-y-copias': 6, animationAuditCard: 6 }
  },
  tactical: {
    order: ['mapWindow', '$companion', 'encounterCard', 'jugadores', 'interacciones', 'pnj-de-escena', 'campRestCard', 'partida-y-copias', 'animationAuditCard'],
    spans: { mapWindow: 7, $companion: 5, encounterCard: 4, jugadores: 4, interacciones: 4, 'pnj-de-escena': 4, campRestCard: 6, 'partida-y-copias': 4, animationAuditCard: 6 }
  },
  overview: {
    order: ['mapWindow', '$companion', 'encounterCard', 'jugadores', 'interacciones', 'pnj-de-escena', 'campRestCard', 'partida-y-copias', 'animationAuditCard'],
    spans: { mapWindow: 12, $companion: 12, encounterCard: 6, jugadores: 6, interacciones: 4, 'pnj-de-escena': 4, campRestCard: 4, 'partida-y-copias': 4, animationAuditCard: 4 }
  }
};

/** A named starting arrangement for the workspace windows; the connection card is outside this grid. */
export function createDmWorkspacePreset(mode: WorkspaceMode, preset: DmWorkspacePresetId): Pick<WorkspaceState, 'order' | 'windows'> {
  const companion = mode === 'combat' ? 'combatCard' : 'explorationCard';
  const spec = dmWorkspacePresetSpecs[preset];
  const replaceCompanion = (id: string) => id === '$companion' ? companion : id;
  const spans = Object.fromEntries(Object.entries(spec.spans).map(([id, span]) => [replaceCompanion(id), span]));
  return {
    order: spec.order.map(replaceCompanion),
    windows: Object.fromEntries(Object.entries(spans).map(([id, span]) => [id, { span }]))
  };
}

/** Defaults only: never replace a DM's saved arrangement. */
export function recommendedDmWorkspace(mode: WorkspaceMode, width: number): WorkspaceState {
  const sideBySide = width >= 1050;
  const companion = mode === 'combat' ? 'combatCard' : 'explorationCard';
  return {
    closed: ['animationAuditCard'], minimized: mode === 'combat' ? ['partida-y-copias'] : ['partida-y-copias', 'combatCard'], maximized: [],
    order: ['mapWindow', companion, 'interacciones', 'jugadores', 'pnj-de-escena', 'encounterCard', 'campRestCard', 'partida-y-copias', 'animationAuditCard'],
    windows: { ...createDmWorkspacePreset(mode, mode === 'combat' ? 'tactical' : 'map-scene').windows, mapWindow: { span: sideBySide ? 8 : 12 }, [companion]: { span: sideBySide ? 4 : 12 } }
  };
}
