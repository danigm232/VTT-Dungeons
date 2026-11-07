import { SkillTransitionScreen } from './ui/skill-transition';
import { skillMicroScenes } from './ui/skill-scenes';
import type { SkillActor, SkillImageLoader } from './ui/skill-scene-sprite';
import './ui/skill-transition-preview.css';

type PreviewData = { actors: { label: string; id: string; actor: SkillActor }[]; images: Record<string, string> };
const data = JSON.parse(document.querySelector('#skillPreviewData')!.textContent!) as PreviewData;
const skills = [...skillMicroScenes].sort((a, b) => a.name.localeCompare(b.name, 'es'));
let index = skills.findIndex(skill => skill.id === 'athletics');
let entry = 0;

const load: SkillImageLoader = url => new Promise((resolve, reject) => {
  const source = url.startsWith('data:') ? url : data.images[url];
  if (!source) { reject(new Error(`Falta el sprite ${url}`)); return; }
  const image = new Image();
  image.onload = () => resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error(`No se puede leer ${url}`));
  image.src = source;
});

const screen = new SkillTransitionScreen(load, {
  onContinue: () => step(1),
  random: () => outcome.value === 'success' ? .999 : outcome.value === 'failure' ? 0 : Math.random(),
  reducedMotion: () => reduced.checked
});
const controls = document.createElement('nav');
controls.className = 'skill-preview';
controls.setAttribute('aria-label', 'Controles del visor');
controls.innerHTML = `
  <span class="skill-preview-label">Prueba de transiciones <b>·</b> <span data-count></span></span>
  <div class="skill-preview-pages">
    <button type="button" data-previous aria-label="Habilidad anterior">‹</button>
    <select data-skill-select aria-label="Elegir habilidad"></select>
    <button type="button" data-next aria-label="Habilidad siguiente">›</button>
    <details><summary>Ajustes</summary><div class="skill-preview-settings">
      <label>Personaje <select data-actor></select></label>
      <label>Tirada <select data-outcome-select><option value="random">Al azar</option><option value="success">Forzar éxito</option><option value="failure">Forzar fallo</option></select></label>
      <label><span>Movimiento</span><span><input type="checkbox" data-reduced> Reducir animaciones</span></label>
      <button type="button" data-restart>Reiniciar escena</button>
    </div></details>
  </div>`;
screen.dialog.querySelector('.skill-screen')!.append(controls);

const skillSelect = controls.querySelector<HTMLSelectElement>('[data-skill-select]')!;
const actorSelect = controls.querySelector<HTMLSelectElement>('[data-actor]')!;
const outcome = controls.querySelector<HTMLSelectElement>('[data-outcome-select]')!;
const reduced = controls.querySelector<HTMLInputElement>('[data-reduced]')!;
const count = controls.querySelector('[data-count]')!;
skills.forEach((skill, position) => skillSelect.add(new Option(`${String(position+1).padStart(2,'0')} · ${skill.name}`, String(position))));
data.actors.forEach(actor => actorSelect.add(new Option(actor.label, actor.id)));
if (data.actors.some(actor => actor.id === 'mia')) actorSelect.value = 'mia';

function show() {
  const scene = skills[index]!;
  const actor = data.actors.find(actor => actor.id === actorSelect.value)!;
  const key = String(++entry);
  skillSelect.value = String(index);
  count.textContent = `${String(index + 1).padStart(2, '0')} / ${skills.length}`;
  screen.show(key, 'Destino · Isla de las Tempestades', actor.actor, { scene });
  screen.ready(key);
  screen.dialog.querySelector('#skillStatus')!.textContent = 'Práctica · Sin partida';
}

function step(delta: number) {
  index = (index + delta + skills.length) % skills.length;
  show();
}

skillSelect.onchange = () => { index = Number(skillSelect.value); show(); };
actorSelect.onchange = show;
outcome.onchange = show;
controls.querySelector<HTMLButtonElement>('[data-previous]')!.onclick = () => step(-1);
controls.querySelector<HTMLButtonElement>('[data-next]')!.onclick = () => step(1);
controls.querySelector<HTMLButtonElement>('[data-restart]')!.onclick = show;
screen.dialog.addEventListener('keydown', event => {
  if (event.target instanceof HTMLSelectElement || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  event.preventDefault();
  step(event.key === 'ArrowLeft' ? -1 : 1);
});
show();
