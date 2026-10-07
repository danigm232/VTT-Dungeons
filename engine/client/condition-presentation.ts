import type { CombatCondition, ConditionSource } from '../shared/protocol';

/** Display help only. Actual conditions and escape DCs belong to the server. */
export function conditionHelp(condition: CombatCondition, source?: ConditionSource, features: string[] = [], hp?: number | null) {
  const restrained = 'Velocidad: 0 · ataques propios con desventaja · ataques contra ti con ventaja · TS Destreza con desventaja.';
  const descriptions: Record<CombatCondition, string> = {
    envenenada: 'Desventaja en ataques y pruebas de característica.', apresada: restrained, restringida: restrained,
    agarrada: 'Velocidad: 0. Desventaja al atacar a alguien distinto de quien te agarra.',
    derribada: 'Reptar cuesta movimiento adicional. Levantarse gasta la mitad de tu velocidad y no es posible con velocidad 0. Ataques propios con desventaja.',
    asustada: 'No puedes acercarte voluntariamente a la fuente. Mientras la veas, ataques y pruebas de característica con desventaja.',
    hechizada: 'No puedes atacar ni dañar a quien te encanta; sus pruebas sociales contigo tienen ventaja. El efecto determina duración y cómo termina.',
    paralizada: 'No puedes moverte ni actuar; fallas TS Fuerza/Destreza. Ataques contra ti con ventaja; impacto a 1,5 m o menos es crítico.',
    inconsciente: 'No puedes moverte ni actuar; fallas TS Fuerza/Destreza. Ataques contra ti con ventaja; impacto a 1,5 m o menos es crítico.',
    oculta: 'Silueta discreta; el DM determina quién puede percibirte. No equivale por sí sola a Invisible.',
    invisible: 'Ataques propios con ventaja y ataques contra ti con desventaja, excepto frente a quien pueda verte. El efecto determina cuándo termina.'
  };
  let text = descriptions[condition];
  if (condition === 'asustada' && features.some(feature => /\bvaliente\b/i.test(feature))) text += ' Tu rasgo Valiente da ventaja contra Asustada.';
  if (condition === 'inconsciente' && hp === 0) text += ' A 0 PG, resolver salvaciones contra muerte al empezar tu turno salvo estabilización o excepción del DM.';
  if (['apresada', 'restringida', 'agarrada'].includes(condition)) text += source?.escapeDc !== undefined
    ? ` Liberarse: acción → Atletismo o Acrobacias CD ${source.escapeDc}.`
    : ' Liberarse: consulta el efecto de origen y acuerda la resolución con el DM.';
  return text;
}
