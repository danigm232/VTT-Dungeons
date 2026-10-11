import { Application, Container, Graphics, Text } from 'pixi.js';
import { ConditionPanel } from '../apps/web/ui/conditions';
import { conditionPresentation, conditionOrder } from '../engine/shared/conditions';
import { drawConditionBadges } from '../engine/client/condition-overlays';
import type { CombatCondition, ConditionSource } from '../engine/shared/protocol';

const entity = { hp: 6, conditions: ['envenenada', 'restringida'] as CombatCondition[], conditionSources: [{ condition: 'envenenada', sourceLabel: 'Veneno de prueba', expiresAt: Date.now() + 60000, remainingMs: 60000 }, { condition: 'restringida', sourceLabel: 'Rosa asesina', escapeDc: 11, endsWhenSourceDefeated: true }] as ConditionSource[] };
const dm = new ConditionPanel(change => {
  entity.conditions = entity.conditions.filter(condition => condition !== change.condition); entity.conditionSources = entity.conditionSources.filter(source => source.condition !== change.condition);
  if (change.active) { entity.conditions.push(change.condition); entity.conditionSources.push({ condition: change.condition, sourceLabel: 'Decisión del DM', ...(change.durationSeconds !== undefined ? { remainingMs: change.durationSeconds * 1000, expiresAt: Date.now() + change.durationSeconds * 1000 } : {}) }); }
  refresh();
}), player = new ConditionPanel();
document.getElementById('dm')!.append(dm.root); document.getElementById('player')!.append(player.root);
const app = new Application(); await app.init({ width: 960, height: 360, background: '#132327', antialias: true, preference: 'webgl' }); document.getElementById('map')!.append(app.canvas);
const tokens = new Container(); app.stage.addChild(tokens);
function actor(x: number, y: number, conditions: CombatCondition[], label: string) {
  const token = new Container(); token.position.set(x, y);
  token.addChild(new Graphics().ellipse(0, 6, 19, 8).fill({ color: '#d5b574', alpha: .3 }).circle(0, -60, 10).fill('#cbaa7d').roundRect(-10, -48, 20, 30, 5).fill('#728c80').moveTo(-5, -18).lineTo(-7, 0).moveTo(5, -18).lineTo(7, 0).stroke({ color: '#c1b397', width: 6 }));
  const badges = new Graphics(); drawConditionBadges(badges, conditions, 8, -80); token.addChild(badges);
  const title = new Text({ text: label, style: { fontFamily: 'Georgia', fontSize: 13, fill: '#dfd5bc' } }); title.anchor.set(.5, 0); title.position.set(0, 22); token.addChild(title); tokens.addChild(token);
}
function refresh() {
  dm.update(entity); player.update(entity); tokens.removeChildren().forEach(child => child.destroy({ children: true }));
  conditionOrder.filter(condition => condition !== 'apresada').forEach((condition, index) => actor(70 + index % 5 * 200, 115 + Math.floor(index / 5) * 165, [condition], conditionPresentation[condition].label));
}
refresh();
setInterval(() => { const before = entity.conditions.length; entity.conditionSources = entity.conditionSources.filter(source => source.expiresAt === undefined || source.expiresAt > Date.now()); entity.conditions = entity.conditions.filter(condition => entity.conditionSources.some(source => source.condition === condition)); if (before !== entity.conditions.length) refresh(); dm.updateTimers(); player.updateTimers(); }, 1000);
