import { timeOfDayHours } from '../shared/game-time.js';
type Choice = { value: string; label: string; icon: string; detail?: string };
const svg = (body: string) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const sun = '<circle cx="16" cy="16" r="6"/><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14l3 3M6 26l3-3M23 9l3-3"/>';
const cloud = '<path d="M7 19a5 5 0 0 1 0-10 7 7 0 0 1 13-1 6 6 0 1 1 4 11H7Z"/>';
const level = (count: number, kind: 'rain' | 'wind' | 'fog' | 'sea' | 'storm' | 'flood') => svg(
  kind === 'rain' ? cloud + Array.from({ length: count }, (_, i) => `<path d="m${8 + i * 7} 23-2 5"/>`).join('')
    : kind === 'storm' ? cloud + `<path d="m${count > 1 ? 19 : 16} 20-5 5h5l-5 6"/>` + (count === 3 ? '<path d="m8 23-2 5m20-5-2 5"/>' : '')
      : kind === 'wind' ? '<path d="M3 12h20a4 4 0 1 0-4-4M3 18h16a4 4 0 1 1-4 4"/>' + (count > 1 ? '<path d="M4 6h8"/>' : '') + (count > 2 ? '<path d="M3 27h8"/>' : '')
        : Array.from({ length: count }, (_, i) => kind === 'fog' ? `<path d="M${i % 2 ? 7 : 3} ${10 + i * 6}h${i % 2 ? 21 : 24}"/>` : `<path d="M3 ${10 + i * 6}q3-${kind === 'sea' ? 2 + count : 2} 6 0t6 0t6 0t6 0"/>`).join('')
);
const numericChoices = (kind: 'wind' | 'fog' | 'sea' | 'flood', values: number[], labels: string[]): Choice[] => values.map((value, index) => ({ value: String(value), label: labels[index]!, icon: index === 0 && kind !== 'sea' ? svg('<circle cx="16" cy="16" r="10"/><path d="m9 23 14-14"/>') : level(index + 1, kind), detail: `${Math.round(value * 100)}%` }));
const choices: Record<string, Choice[]> = {
  time: [
    { value: 'auto', label: 'Según reloj', icon: svg('<circle cx="16" cy="16" r="11"/><path d="M16 8v8l5 3"/>') },
    { value: 'day', label: 'Mediodía', icon: svg(sun) },
    { value: 'sunset', label: 'Atardecer', icon: svg('<path d="M2 22h28M7 22a9 9 0 0 1 18 0M16 4v4M4 12l3 3m21-3-3 3M7 27h18"/>') },
    { value: 'night', label: 'Noche', icon: svg('<path d="M24 23A12 12 0 0 1 11 4a12 12 0 1 0 13 19Z"/><path d="M23 4v6m-3-3h6"/>') },
    { value: 'dawn', label: 'Madrugada', icon: svg('<path d="M2 24h28M8 24a8 8 0 0 1 16 0M16 14V4m-4 4 4-4 4 4M4 17l3 3m21-3-3 3"/>') }
  ],
  kind: [
    { value: 'clear', label: 'Despejado', icon: svg(sun) },
    { value: 'rain', label: 'Lluvia', icon: level(3, 'rain') },
    { value: 'snow', label: 'Nieve', icon: svg('<path d="M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l6-1-1-6M27 18l-6 1 1 6M5 18l6 1-1 6M27 14l-6-1 1-6"/>') },
    { value: 'storm', label: 'Tormenta', icon: level(2, 'storm'), detail: 'Lluvia con truenos y relámpagos' },
    { value: 'tempest', label: 'Temporal', icon: level(3, 'wind'), detail: 'Lluvia con viento fuerte, sin relámpagos' }
  ],
  intensity: [1, 2, 3].map((value, index) => ({ value: String(value), label: ['Suave', 'Media', 'Intensa'][index]!, icon: svg([0, 1, 2].map(bar => `<rect x="${5 + bar * 9}" y="${21 - bar * 7}" width="5" height="${7 + bar * 7}" rx="1" fill="currentColor" opacity="${bar < value ? 1 : .2}"/>`).join('')) })),
  wind: numericChoices('wind', [0, .25, .5, .85], ['Calma', 'Brisa', 'Moderado', 'Fuerte']),
  fog: numericChoices('fog', [0, .2, .5, .85], ['Sin niebla', 'Ligera', 'Media', 'Densa']),
  sea: numericChoices('sea', [.1, .35, .6, .9], ['Calma', 'Suave', 'Agitada', 'Temporal']),
  flood: numericChoices('flood', [0, .2, .6, 1], ['Seco', 'Baja', 'Alta', 'Muy alta']),
  storm: [.25, .55, .9].map((value, index) => ({ value: String(value), label: ['Suave', 'Fuerte', 'Temporal'][index]!, icon: level(index + 1, 'storm'), detail: `${Math.round(value * 100)}%` }))
};

/** Both DM consoles keep their existing authoritative input/change handlers. */
export function mountClimateIconControls(root: ParentNode) {
  const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-climate-icons]')).map(host => {
    const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${host.dataset.climateControl}`);
    const options = choices[host.dataset.climateIcons ?? ''];
    if (!control || !options) throw new Error(`Missing climate control: ${host.dataset.climateControl}`);
    control.hidden = true; host.classList.add('climate-icon-options'); host.setAttribute('role', 'group');
    const auto = host.dataset.climateAuto ? root.querySelector<HTMLButtonElement>(`#${host.dataset.climateAuto}`) : null;
    const buttons = options.map(option => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'climate-icon-choice'; button.dataset.iconValue = option.value;
      button.innerHTML = option.icon; const label = document.createElement('span'); label.textContent = option.label; button.append(label);
      button.title = option.detail ? `${option.label} · ${option.detail}` : option.label;
      if (host.dataset.climateIcons === 'time' && option.value !== 'auto') {
        const hour = timeOfDayHours[option.value as keyof typeof timeOfDayHours], clock = document.createElement('small');
        clock.textContent = `${String(hour).padStart(2, '0')}:00`; button.append(clock); button.title = `Avanzar hasta las próximas ${clock.textContent}`;
      }
      button.setAttribute('aria-pressed', 'false');
      button.onclick = () => {
        control.value = option.value; auto?.setAttribute('aria-pressed', 'false');
        buttons.forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
        control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true }));
      };
      return button;
    });
    host.replaceChildren(...buttons);
    return { control, options, buttons, auto };
  });
  return { update() {
    for (const { control, options, buttons, auto } of groups) {
      const index = control instanceof HTMLSelectElement ? options.findIndex(option => option.value === control.value)
        : options.reduce((closest, option, i) => Math.abs(Number(option.value) - Number(control.value)) < Math.abs(Number(options[closest]!.value) - Number(control.value)) ? i : closest, 0);
      buttons.forEach((button, i) => { button.disabled = control.disabled; button.setAttribute('aria-pressed', String(i === index && auto?.getAttribute('aria-pressed') !== 'true')); });
    }
  } };
}
