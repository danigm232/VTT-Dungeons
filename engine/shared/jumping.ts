export interface JumpDistances {
  longJumpFeet: number;
  standingLongJumpFeet: number;
  highJumpFeet: number;
  standingHighJumpFeet: number;
}

export function strengthModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

/** D&D 2024 Basic Rules. Jump distances are in feet; the VTT grid is 5 ft per cell. */
export function jumpDistances(strengthScore: number): JumpDistances {
  const longJumpFeet = strengthScore;
  const highJumpFeet = Math.max(0, 3 + strengthModifier(strengthScore));
  return {
    longJumpFeet,
    standingLongJumpFeet: longJumpFeet / 2,
    highJumpFeet,
    standingHighJumpFeet: highJumpFeet / 2
  };
}

export function formatJumpDistance(feet: number) {
  const meters = Math.round(feet * 0.3048 * 10) / 10;
  return `${Number.isInteger(feet) ? feet : feet.toLocaleString('es-ES')} pies (${meters.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m)`;
}

export function jumpSummary(strengthScore?: number) {
  if (strengthScore === undefined) return 'FUE sin registrar; añade la puntuación a la ficha para calcular las distancias.';
  const jump = jumpDistances(strengthScore);
  return `FUE ${strengthScore} (${strengthModifier(strengthScore) >= 0 ? '+' : ''}${strengthModifier(strengthScore)}) · largo ${formatJumpDistance(jump.longJumpFeet)} con carrera / ${formatJumpDistance(jump.standingLongJumpFeet)} en parado · alto ${formatJumpDistance(jump.highJumpFeet)} con carrera / ${formatJumpDistance(jump.standingHighJumpFeet)} en parado`;
}

export function jumpGuidance(strengthScore?: number) {
  if (strengthScore === undefined) return 'No consta la Fuerza (FUE) en esta ficha; el DM debe registrarla antes de calcular distancias. El salto no mueve automáticamente la ficha: el DM confirma la carrera, el hueco, la superficie y el aterrizaje.';
  const jump = jumpDistances(strengthScore);
  return `${jumpSummary(strengthScore)}. Para el salto largo con carrera hay que moverse al menos 10 pies (3 m) a pie inmediatamente antes; en parado se salta la mitad. Cada pie saltado gasta un pie de movimiento. Para superar un obstáculo bajo, el DM puede pedir Fuerza (Atletismo) CD 10; al aterrizar en terreno difícil, Destreza (Acrobacias) CD 10 o quedas derribado. El punto marcado es una propuesta: el DM confirma carrera, hueco, superficie y aterrizaje; la ficha no se traslada automáticamente.`;
}
