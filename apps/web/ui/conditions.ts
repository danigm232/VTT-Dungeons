import type { CombatCondition, ConditionSource, ConditionStateView } from '../../../engine/shared/protocol';
import { conditionDurationLabel, conditionOrder, conditionPresentation } from '../../../engine/shared/conditions';
import { conditionHelp } from '../../../engine/client/condition-presentation';
import '../conditions.css';

export type ConditionEdit = { condition: CombatCondition; active: boolean; durationSeconds?: number; expiryTurn?: 'start' | 'end' };

function badge(condition: CombatCondition) {
  const icon = document.createElement('span'), style = conditionPresentation[condition];
  icon.className = 'condition-glyph'; icon.textContent = style.glyph; icon.style.setProperty('--condition-color', style.color); icon.setAttribute('aria-hidden', 'true');
  return icon;
}
/** Compact, explicitly named controls; no emoji overlays or hidden toggle meanings. */
export function conditionStrip(entity: ConditionStateView, remove?: (condition: CombatCondition) => void) {
  const strip = document.createElement('div'); strip.className = 'condition-strip';
  for (const condition of entity.conditions ?? []) {
    const chip = document.createElement(remove ? 'button' : 'span'); chip.className = 'condition-chip';
    chip.append(badge(condition), document.createTextNode(`${conditionPresentation[condition].label}${remove ? ' ×' : ''}`));
    if (chip instanceof HTMLButtonElement) { chip.type = 'button'; chip.title = `Quitar ${conditionPresentation[condition].label}`; chip.setAttribute('aria-label', chip.title); chip.onclick = () => remove?.(condition); }
    strip.append(chip);
  }
  return strip;
}

export class ConditionPanel {
  readonly root = document.createElement('section');
  private list = document.createElement('div');
  private timers: Array<{ element: HTMLElement; source: ConditionSource }> = [];
  private key = '';
  constructor(private edit?: (change: ConditionEdit) => void) {
    this.root.className = 'condition-panel';
    const title = document.createElement('h3'); title.textContent = 'Estados y efectos'; this.root.append(title, this.list);
    if (edit) {
      const form = document.createElement('form'), condition = document.createElement('select'), unit = document.createElement('select'), amount = document.createElement('input'), boundary = document.createElement('select'), submit = document.createElement('button');
      form.className = 'condition-editor';
      const label = (text: string, control: HTMLElement) => { const wrapper = document.createElement('label'); wrapper.append(text, control); return wrapper; };
      for (const value of conditionOrder) condition.add(new Option(value === 'apresada' ? 'Apresado (estado antiguo)' : conditionPresentation[value].label, value));
      for (const [text, value] of [['Hasta retirarlo', 'manual'], ['Rondas (6 s)', 'rounds'], ['Segundos', 'seconds'], ['Minutos', 'minutes'], ['Horas', 'hours']]) unit.add(new Option(text, value));
      for (const [text, value] of [['Ronda completa', 'round'], ['Inicio de su turno', 'start'], ['Final de su próximo turno', 'end']]) boundary.add(new Option(text, value));
      amount.type = 'number'; amount.value = '1'; amount.min = '1'; amount.step = '1'; amount.required = true;
      const amountLabel = label('Cantidad', amount), boundaryLabel = label('Termina en', boundary);
      const units: Record<string, number> = { rounds: 6, seconds: 1, minutes: 60, hours: 3600 };
      const update = () => { amountLabel.hidden = unit.value === 'manual'; amount.disabled = unit.value === 'manual'; amount.max = String(Math.floor(86400 / (units[unit.value] ?? 1))); boundaryLabel.hidden = unit.value !== 'rounds'; };
      unit.onchange = update; update();
      submit.type = 'submit'; submit.textContent = 'Aplicar / actualizar';
      form.append(label('Estado', condition), label('Duración', unit), amountLabel, boundaryLabel, submit);
      form.onsubmit = event => {
        event.preventDefault(); if (!form.reportValidity()) return;
        const durationSeconds = unit.value === 'manual' ? undefined : Number(amount.value) * units[unit.value]!;
        edit({ condition: condition.value as CombatCondition, active: true, ...(durationSeconds !== undefined ? { durationSeconds } : {}), ...(unit.value === 'rounds' && boundary.value !== 'round' ? { expiryTurn: boundary.value as 'start' | 'end' } : {}) });
      };
      const note = document.createElement('p'); note.className = 'condition-note';
      note.textContent = 'La duración depende del efecto de origen. En combate avanza por rondas o turnos; en exploración, por tiempo. Quitar un estado no cura ni recupera PG. «Hasta retirarlo» elimina solo el temporizador.';
      this.root.append(form, note);
    }
  }
  update(entity: ConditionStateView & { hp?: number | null }, features: string[] = []) {
    const key = JSON.stringify([entity.conditions, entity.conditionSources, entity.hp, features]);
    if (key !== this.key) {
      this.key = key; this.list.replaceChildren(); this.timers = [];
      if (!entity.conditions?.length) { const empty = document.createElement('p'); empty.className = 'condition-note'; empty.textContent = 'Sin estados activos'; this.list.append(empty); }
      for (const condition of entity.conditions ?? []) {
        const row = document.createElement('article'), heading = document.createElement('div'), name = document.createElement('strong'); row.className = 'condition-row'; heading.className = 'condition-row-title'; name.textContent = conditionPresentation[condition].label;
        heading.append(badge(condition), name);
        if (this.edit) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'condition-remove'; remove.textContent = 'Quitar'; remove.setAttribute('aria-label', `Quitar ${name.textContent}`); remove.onclick = () => this.edit?.({ condition, active: false }); heading.append(remove); }
        const sources = entity.conditionSources?.filter(source => source.condition === condition) ?? [];
        const explanation = document.createElement('p'); explanation.className = 'condition-note'; explanation.textContent = conditionHelp(condition, sources[0], features, entity.hp);
        row.append(heading);
        for (const source of sources.length ? sources : [{ condition }]) {
          const origin = document.createElement('p'), timer = document.createElement('span'); origin.className = 'condition-origin';
          origin.append(document.createTextNode(`${source.sourceLabel ?? source.sourceAbility ?? 'Efecto activo'} · `), timer); row.append(origin); this.timers.push({ element: timer, source });
        }
        row.append(explanation); this.list.append(row);
      }
    }
    this.updateTimers();
  }
  updateTimers() { for (const timer of this.timers) timer.element.textContent = conditionDurationLabel(timer.source); }
}
