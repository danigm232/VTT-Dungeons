import type { EnvironmentState } from './protocol.js';
import type { ClimateState } from './game-time.js';

export const weatherModes = ['clear', 'rain', 'snow', 'storm', 'tempest'] as const;
export type WeatherMode = typeof weatherModes[number];
export const weatherModeLabels: Record<WeatherMode, string> = { clear: 'Despejado', rain: 'Lluvia', snow: 'Nieve', storm: 'Tormenta', tempest: 'Temporal' };
export function weatherMode(e: EnvironmentState): WeatherMode {
  if (e.precipitation === 'snow') return 'snow';
  return e.storm ? e.stormIntensity >= .8 || (e.windIntensity ?? 0) >= .7 ? 'tempest' : 'storm' : precipitationKind(e) === 'snow' ? 'snow' : precipitationKind(e) === 'rain' ? 'rain' : 'clear';
}
export type WeatherChange = Partial<Omit<EnvironmentState, 'lightning' | 'stormIntensity' | 'seaIntensity'>> & { weatherMode?: WeatherMode; intensity?: number; seaIntensity?: number | null };
/** Single transition for legacy commands and both icon consoles. */
export function resolveWeatherChange(current: EnvironmentState, patch: WeatherChange): EnvironmentState {
  const next = { ...current };
  for (const field of ['precipitationLevel', 'windIntensity', 'temperatureC', 'fogTarget', 'floodTarget', 'snowDifficultTerrain', 'weatherRules'] as const)
    if (patch[field] !== undefined) Object.assign(next, { [field]: patch[field] });
  if (patch.seaIntensity === null) delete next.seaIntensity;
  else if (patch.seaIntensity !== undefined) next.seaIntensity = patch.seaIntensity;
  let mode = patch.weatherMode ?? weatherMode(current);
  if (!patch.weatherMode && patch.precipitation !== undefined) mode = patch.precipitation === 'snow' ? 'snow' : patch.precipitation === 'rain' ? patch.storm ? 'storm' : 'rain' : 'clear';
  else if (!patch.weatherMode && patch.storm !== undefined && patch.storm !== current.storm)
    mode = patch.storm ? (patch.intensity ?? current.stormIntensity) >= .8 ? 'tempest' : 'storm' : precipitationKind(current) === 'snow' ? 'snow' : precipitationKind(current) === 'rain' ? 'rain' : 'clear';
  if (patch.intensity !== undefined && patch.precipitationLevel === undefined) next.precipitationLevel = patch.intensity < .4 ? 1 : patch.intensity < .8 ? 2 : 3;
  const level = next.precipitationLevel ?? 2;
  if (patch.weatherMode) {
    if (patch.windIntensity === undefined) next.windIntensity = mode === 'tempest' ? [.75, .85, 1][level - 1]! : mode === 'storm' ? [.3, .5, .65][level - 1]! : mode === 'clear' ? 0 : .15;
    if (mode === 'snow' && patch.temperatureC === undefined && (next.temperatureC ?? 10) > 2) next.temperatureC = -4;
  } else if (patch.windIntensity !== undefined && (mode === 'storm' || mode === 'tempest')) mode = patch.windIntensity >= .7 ? 'tempest' : 'storm';
  next.storm = mode === 'storm' || mode === 'tempest';
  next.precipitation = mode === 'snow' ? 'snow' : mode === 'clear' ? 'none' : 'rain';
  next.stormIntensity = next.storm ? (mode === 'tempest' ? [.8, .9, 1] : [.35, .55, .75])[level - 1]! : current.stormIntensity;
  next.lightning = mode === 'storm';
  return next;
}

export function snowAccumulationHint(e: EnvironmentState) {
  return precipitationKind(e) !== 'snow' ? '' : (e.temperatureC ?? 10) > 2 ? `A ${e.temperatureC ?? 10} °C la nieve no cuaja. Baja la temperatura para acumularla.` : 'La nieve se acumula al avanzar el reloj del juego.';
}
export function weatherDescription(e: EnvironmentState) {
  return ({ clear: 'Ambiente de la escena, sin precipitación.', rain: 'Lluvia sin truenos ni relámpagos.', snow: snowAccumulationHint(e), storm: 'Lluvia con truenos y relámpagos.', tempest: 'Lluvia con ráfagas fuertes y mar agitada; sin relámpagos.' })[weatherMode(e)];
}

export const WEATHER_RULES_SOURCE = 'https://www.dndbeyond.com/sources/dnd/br-2024/dms-toolbox#EnvironmentalEffects';
export const VISION_RULES_SOURCE = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';
export function precipitationKind(e: EnvironmentState) { return e.precipitation ?? (e.storm ? 'rain' : 'none'); }
export function strongWind(e: EnvironmentState) { return (e.windIntensity ?? (e.storm ? .7 : 0)) >= .7; }
/** Authored defaults remain distinct from explicit sea overrides. Never raises inland water. */
export function seaState(e: EnvironmentState | undefined, authored = .4) {
  return Math.max(0, Math.min(1, e?.seaIntensity ?? Math.max(authored, (e?.windIntensity ?? 0) * .85, e?.storm ? e.stormIntensity : 0)));
}
export function seaStateLabel(value: number) { return value < .2 ? 'Calma' : value < .45 ? 'Oleaje suave' : value < .7 ? 'Mar agitada' : 'Temporal'; }
/** Use the shared server timestamp so a flash reaches DM, players and projector together. */
export function weatherLight(e:EnvironmentState|undefined,serverSeconds:number,reduced=false) {
  const force=e?.storm?e.stormIntensity:e&&precipitationKind(e)!=='none'?[.15,.3,.45][(e.precipitationLevel??2)-1]!:0,cloud=1-force*.42;
  if(!e?.storm||!e.lightning||reduced)return {cloud,flash:0};
  const cycle=Math.floor(serverSeconds/17),phase=serverSeconds-cycle*17;
  const strike=4+((Math.sin(cycle*127.1)*43758.5453)%1+1)%1*8;
  const pulse=Math.max(0,1-Math.abs(phase-strike)/.065)+Math.max(0,1-Math.abs(phase-strike-.23)/.10)*.55;
  return {cloud,flash:pulse*(.7+force*1.4)};
}
export type WeatherRuleNotice = { id: string; title: string; detail: string; source?: string };
/** Rule advice is contextual; saves/exhaustion and visibility adjudication stay with the DM. */
export function weatherRuleNotices(e: EnvironmentState, c: ClimateState): WeatherRuleNotice[] {
  const rules: WeatherRuleNotice[] = [], kind = precipitationKind(e);
  if (kind !== 'none' && (e.precipitationLevel ?? 2) === 3) rules.push({ id: 'heavy-precipitation', title: kind === 'rain' ? 'Lluvia intensa' : 'Nevada intensa', detail: 'Exterior ligeramente oscurecido; desventaja en Percepción. La lluvia intensa apaga llamas expuestas.', source: WEATHER_RULES_SOURCE });
  if (strongWind(e)) rules.push({ id: 'strong-wind', title: 'Viento fuerte', detail: 'Desventaja con armas a distancia en exterior; apaga llamas expuestas y dispersa niebla. Quien vuele debe aterrizar al acabar su turno o caer.', source: WEATHER_RULES_SOURCE });
  if (c.fogDensity >= .15) rules.push({ id: 'fog', title: c.fogDensity >= .7 ? 'Niebla densa' : 'Niebla parcial', detail: c.fogDensity >= .7 ? 'El DM delimita las zonas muy oscurecidas: se considera Cegado al intentar ver algo en ellas.' : 'Desventaja en Percepción que dependa de la vista dentro de la niebla.', source: VISION_RULES_SOURCE });
  if ((e.temperatureC ?? 10) <= -17.8) rules.push({ id: 'cold', title: 'Frío extremo', detail: 'Cada hora expuesto: salvación de Constitución CD 10; fallo, un nivel de agotamiento. Resistencia o inmunidad al frío supera la salvación.', source: WEATHER_RULES_SOURCE });
  if ((e.temperatureC ?? 10) >= 37.8) rules.push({ id: 'heat', title: 'Calor extremo', detail: 'Sin agua potable: salvación cada hora, CD 5 inicial y +1 por hora adicional; fallo, agotamiento. Armadura media/pesada: desventaja. Resistencia/inmunidad al fuego supera la salvación.', source: WEATHER_RULES_SOURCE });
  if (c.snowDepthCm >= 15) rules.push({ id: 'snow-terrain', title: 'Nieve profunda', detail: e.snowDifficultTerrain ? 'El DM ha activado terreno difícil: coste de movimiento doble.' : 'El DM puede activar terreno difícil. El umbral de 15 cm es una adaptación del VTT.' });
  if (seaState(e) >= .7) rules.push({ id: 'sea', title: 'Mala mar', detail: 'El DM evalúa corriente, natación y navegación según la escena. No existe una CD universal de oleaje.' });
  return rules;
}
