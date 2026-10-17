import { weatherRuleNotices, weatherMode, weatherModeLabels, seaState, seaStateLabel } from '../shared/weather.js';
import { advanceClimate, formatGameClock, gameClockAt, naturalLightProfile } from '../shared/game-time.js';
import type { WorldSnapshot } from '../shared/protocol.js';
import { SnapshotClock } from './snapshot-clock.js';

/** Small synchronized clock chip shared by the phone and projector views. */
export class GameClockOverlay {
  private snapshot: WorldSnapshot | null = null;
  private timer: number;
  private element: HTMLElement;
  private label: HTMLElement;
  private detail: HTMLElement;
  private clock = new SnapshotClock();

  constructor(host: HTMLElement, align: 'left' | 'right' = 'left') {
    const element = document.createElement('aside'), label = document.createElement('strong'), detail = document.createElement('span');
    element.className = 'game-clock-overlay'; element.setAttribute('aria-label', 'Hora de la campaña');
    element.style.cssText = `position:absolute;z-index:12;pointer-events:none;top:calc(env(safe-area-inset-top, 0px) + 10px);${align}:10px;display:none;min-width:126px;padding:7px 10px;border:1px solid #c2a96b99;border-radius:9px;background:#101b22e8;color:#f2e4c4;box-shadow:0 4px 16px #0008;font:12px/1.25 system-ui,sans-serif;text-align:${align};font-variant-numeric:tabular-nums;backdrop-filter:blur(5px)`;
    label.style.cssText = 'display:block;font-size:14px;letter-spacing:.03em'; detail.style.cssText = 'display:block;margin-top:2px;color:#c6d1d0;font-size:10px';
    element.append(label, detail); host.append(element); this.element = element; this.label = label; this.detail = detail;
    this.timer = window.setInterval(() => this.render(), 500);
  }

  update(snapshot: WorldSnapshot) { this.clock.observe(snapshot.serverTime, Date.now()); this.snapshot = snapshot; this.render(); }
  reset() { this.snapshot = null; this.clock.reset(); this.element.style.display = 'none'; }
  dispose() { window.clearInterval(this.timer); this.element.remove(); }

  private render() {
    const snapshot = this.snapshot; if (!snapshot) return;
    const now = this.clock.now(Date.now()), seconds = gameClockAt(snapshot.gameClock, now), clock = formatGameClock(seconds);
    const climate = advanceClimate(snapshot.climate, snapshot.environment, seconds);
    const light = naturalLightProfile(seconds, snapshot.environment.timeOfDay);
    const phase = ({ night: 'Noche', dawn: 'Madrugada', morning: 'Mañana', midday: 'Mediodía', sunset: 'Atardecer' } as const)[light.phase];
    const mode = weatherMode(snapshot.environment), weather = mode === 'clear' ? '' : weatherModeLabels[mode];
    const pause = snapshot.gameClock.mode === 'combat' ? 'Combate' : snapshot.gameClock.pauseReason === 'dm' ? 'Pausado' : snapshot.gameClock.pauseReason === 'decision' ? 'Decisión' : '';
    const effects = climate.snowCoverage > .01 ? `Nieve ${Math.round(climate.snowCoverage * 100)}%` : climate.puddleCoverage > .08 ? `Charcos ${Math.round(climate.puddleCoverage * 100)}%` : '';
    this.label.textContent = clock.text;
    const coastal=snapshot.sceneId.startsWith('camp-')&&snapshot.sceneId!=='camp-forest-pleamar';
    const rules=snapshot.environment.weatherRules?weatherRuleNotices(snapshot.environment,climate).filter(n=>['strong-wind','heavy-precipitation','fog'].includes(n.id)).map(n=>n.title).join(', '):'';
    this.detail.textContent = [pause || phase, weather, effects,coastal?seaStateLabel(seaState(snapshot.environment)):null,rules].filter(Boolean).join(' · ');
    this.element.style.display = 'block';
  }
}
