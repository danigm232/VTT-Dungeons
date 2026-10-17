import type { ClimateState } from '../shared/game-time.js';
import { advanceClimate, formatGameClock, gameClockAt, naturalLightProfile } from '../shared/game-time.js';
import type { DmState, EnvironmentState } from '../shared/protocol.js';
import { seaState, seaStateLabel, weatherRuleNotices } from '../shared/weather.js';
import { SnapshotClock } from './snapshot-clock.js';

export function lightPhaseLabel(e:EnvironmentState,seconds:number) {
  return ({night:'Noche',dawn:'Madrugada',morning:'Mañana',midday:'Mediodía',sunset:'Atardecer'} as const)[naturalLightProfile(seconds,e.timeOfDay).phase];
}
export function climateSummary(e:EnvironmentState,c:ClimateState,coastal:boolean) {
  return [`Nieve ${Math.round(c.snowCoverage*100)}% (${c.snowDepthCm.toFixed(1)} cm)`,`Charcos ${Math.round(c.puddleCoverage*100)}%`,`Niebla actual ${Math.round(c.fogDensity*100)}%`,coastal?seaStateLabel(seaState(e)):null,c.floodLevel>.01?`Inundación ${Math.round(c.floodLevel*100)}%`:null].filter(Boolean).join(' · ');
}
export function renderWeatherRules(host:HTMLElement,e:EnvironmentState,c:ClimateState,coastal=true) {
  const notices=weatherRuleNotices(e,c).filter(n=>coastal||n.id!=='sea'),signature=JSON.stringify([notices,e.weatherRules]);
  if(host.dataset.signature===signature)return;host.dataset.signature=signature;
  const heading=document.createElement('p');heading.className='note';heading.textContent=e.weatherRules?'Reglas activas: viento fuerte aplica desventaja con armas a distancia en exteriores de campamentos. Las demás pruebas las dirige el DM.':'Consulta de reglas: activa la opción para aplicar la desventaja por viento en los campamentos.';
  host.replaceChildren(heading);
  if(!notices.length){const p=document.createElement('p');p.className='note';p.textContent='Sin restricciones meteorológicas destacadas.';host.append(p);}
  for(const n of notices){const item=document.createElement('article'),title=document.createElement('strong'),detail=document.createElement('p');item.className='weather-rule';title.textContent=n.title;detail.textContent=n.detail;item.append(title,detail);
    if(n.source){const link=document.createElement('a');link.href=n.source;link.target='_blank';link.rel='noopener';link.textContent='Consultar regla';item.append(link);}host.append(item);}
}

/** Mobile controls use the same server commands and shared clock as desktop. */
export function mountMobileClock(host:HTMLElement,send:(body:Record<string,unknown>)=>unknown) {
  host.innerHTML=`<p class="eyebrow">TIEMPO DE CAMPAÑA</p><div class="climate-clock-head"><h2 id="mobileClockValue">Preparando reloj…</h2><button id="mobileClockPause" type="button">Pausar</button></div><p id="mobileClockMode" class="note"></p><div class="climate-quick"><button id="mobileClockShort" type="button">Descanso corto · +1 h</button><button id="mobileClockLong" type="button">Descanso largo · +8 h</button></div><label for="mobileClockMinutes">Avanzar minutos</label><div class="climate-quick"><input id="mobileClockMinutes" type="number" min="1" max="525600" value="10"><button id="mobileClockAdvance" type="button">Avanzar</button></div><label for="mobileClockTime">Fijar hora</label><div class="climate-quick"><input id="mobileClockTime" type="time" step="1" value="08:00"><button id="mobileClockSet" type="button">Aplicar hora</button></div><p class="note">Avanzar el reloj no cura ni concede beneficios del descanso.</p><p id="mobileClimateReadout" class="note"></p>`;
  const el=<T extends HTMLElement>(id:string)=>host.querySelector<T>(`#${id}`)!;
  let current:DmState|null=null;const clock=new SnapshotClock();
  el('mobileClockPause').onclick=()=>{if(current&&!current.combat.active)send({type:'clock:control',action:current.gameClock.pauseReason==='dm'?'resume':'pause'});};
  el('mobileClockShort').onclick=()=>send({type:'clock:control',action:'short-rest'});
  el('mobileClockLong').onclick=()=>send({type:'clock:control',action:'long-rest'});
  el('mobileClockAdvance').onclick=()=>{const minutes=Number(el<HTMLInputElement>('mobileClockMinutes').value);if(Number.isInteger(minutes)&&minutes>=1&&minutes<=525600)send({type:'clock:control',action:'advance',seconds:minutes*60});};
  el('mobileClockSet').onclick=()=>{const [h,m,s='0']=el<HTMLInputElement>('mobileClockTime').value.split(':');if(h!==undefined&&m!==undefined)send({type:'clock:control',action:'set-time',secondsOfDay:Number(h)*3600+Number(m)*60+Number(s)});};
  const render=()=>{
    if(!current)return;const seconds=gameClockAt(current.gameClock,clock.now(Date.now()));el('mobileClockValue').textContent=formatGameClock(seconds).text;
    const reason=current.gameClock.pauseReason,combat=current.combat.active,pause=el<HTMLButtonElement>('mobileClockPause');pause.textContent=combat?'Combate':reason==='decision'?'Pausa de decisión':reason==='dm'?'Reanudar':'Pausar';pause.disabled=combat||reason==='decision';
    el('mobileClockMode').textContent=combat?'6 segundos al cerrar cada asalto.':reason?'Reloj pausado.':'Exploración · avanza en tiempo real.';
    const locked=combat||Boolean(current.campRest?.phase&&!current.campRest.outcome);el<HTMLButtonElement>('mobileClockShort').disabled=locked;el<HTMLButtonElement>('mobileClockLong').disabled=locked;
    el('mobileClimateReadout').textContent=climateSummary(current.environment,advanceClimate(current.climate,current.environment,seconds),current.sceneId.startsWith('camp-')&&current.sceneId!=='camp-forest-pleamar');
  };
  const timer=window.setInterval(render,500);
  return {update(state:DmState){clock.observe(state.gameClock.serverTime,Date.now());current=state;render();},dispose(){window.clearInterval(timer);},reset(){current=null;clock.reset();}};
}
