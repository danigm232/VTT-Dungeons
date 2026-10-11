import { z } from 'zod';

export const campActivityIdSchema = z.enum(['warm', 'cook', 'tend-fire', 'prepare-bed', 'rest', 'study', 'pray', 'tools', 'guard', 'sit', 'chest-toggle', 'inspect', 'shelter']);
export type CampActivityId = z.infer<typeof campActivityIdSchema>;
export type CampActivity = { id: CampActivityId; label: string; animation: string; durationMs: number; guidance: string };
const activity = (id: CampActivityId, label: string, guidance: string, durationMs = 5000): CampActivity => ({ id, label, animation: `camp-${id}`, durationMs, guidance });
export const campActivities: Record<CampActivityId, CampActivity> = {
  warm: activity('warm', 'Calentarte las manos', 'Acercas las manos al calor de la hoguera.'),
  cook: activity('cook', 'Remover la olla / preparar comida', 'Preparas comida con las provisiones disponibles; el DM confirma los ingredientes y cualquier consumo.'),
  'tend-fire': activity('tend-fire', 'Avivar la hoguera', 'Acomodas los leños y avivas el fuego con el combustible disponible.'),
  'prepare-bed': activity('prepare-bed', 'Preparar el lecho', 'Acomodas el saco, la manta y el equipo para descansar.'),
  rest: activity('rest', 'Descansar un momento', 'Haces una pausa. Esta animación no completa un descanso ni recupera PG o recursos.', 6500),
  study: activity('study', 'Leer el libro de conjuros', 'Repasas tu libro. Preparar conjuros o recuperar recursos requiere la confirmación del DM.'),
  pray: activity('pray', 'Orar con el símbolo sagrado', 'Dedicas un momento a la oración. No concede beneficios automáticos.'),
  tools: activity('tools', 'Revisar herramientas de ladrón', 'Ordenas y revisas tus herramientas; no abre cerraduras ni altera objetos automáticamente.'),
  guard: activity('guard', 'Vigilar los alrededores', 'Revisas el entorno desde el puesto. El DM decide si hay algo que detectar.'),
  sit: { ...activity('sit', 'Sentarte / levantarte', 'Utilizas el asiento.'), animation: 'sit', durationMs: 0 },
  'chest-toggle': { ...activity('chest-toggle', 'Abrir / cerrar el baúl', 'El baúl no añade ni retira objetos de la mochila.'), animation: 'interact', durationMs: 900 },
  inspect: activity('inspect', 'Revisar el equipo', 'Compruebas el equipo sin modificar tu mochila.'),
  shelter: activity('shelter', 'Revisar el refugio', 'Compruebas el cobijo y sus amarres. Entra caminando por la abertura de la tienda.')
};
type Point = { kind: 'bed' | 'tent' | 'fire' | 'seat' | 'guard' | 'chest' | 'personal'; ownerCharacterId?: string; activities?: CampActivityId[] };
export function campPointInReach(actor: { cell: { col: number; row: number }; surfaceId: string }, point: Point & { cell: { col: number; row: number }; objectCell?: { col: number; row: number }; surfaceId: string }) {
  const target = point.kind === 'fire' ? point.objectCell ?? point.cell : point.cell;
  return actor.surfaceId === point.surfaceId && Math.max(Math.abs(actor.cell.col - target.col), Math.abs(actor.cell.row - target.row)) <= 1;
}
/** Shared by server and both UIs: never offer an activity not validated here. */
export function activitiesForCampPoint(point: Point): CampActivity[] {
  if (point.activities) return [...new Set(point.activities)].map(id => campActivities[id]);
  const ids: CampActivityId[] = point.kind === 'fire' ? ['warm', 'cook', 'tend-fire']
    : point.kind === 'bed' ? ['prepare-bed', 'rest']
      : point.kind === 'tent' ? ['shelter']
        : point.kind === 'seat' ? ['sit'] : point.kind === 'guard' ? ['guard']
          : point.kind === 'chest' ? ['chest-toggle', 'inspect']
            : point.ownerCharacterId === 'mike' ? ['study', 'inspect']
              : point.ownerCharacterId === 'mia' ? ['pray', 'inspect']
                : point.ownerCharacterId === 'maria' ? ['tools', 'inspect'] : ['inspect'];
  return ids.map(id => campActivities[id]);
}
