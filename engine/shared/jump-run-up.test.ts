import { describe, expect, it } from 'vitest';
import { planJumpRunUp } from './jump-run-up';
import { explorationActionSchema } from './protocol';
const origin = {col:5,row:5};
describe('reusable automatic jump run-up', () => {
  it('backs up two cells then runs back to the original takeoff for every heading', () => {
    for (const [dx,dy] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]) {
      const path = planJumpRunUp(origin,{col:5+dx!,row:5+dy!},() => true)!;
      expect(path).toHaveLength(4);
      expect(path[1]!.cell).toEqual({col:5-dx!*2,row:5-dy!*2});
      expect(path[3]!.cell).toEqual(origin);
      expect(path.map(step=>step.running)).toEqual([false,false,true,true]);
    }
  });
  it('falls back to a rear diagonal, not a side/front path or teleport', () => {
    const path = planJumpRunUp(origin,{col:5,row:3},(_from,to) => to.row <= 5 || to.col !== 5)!;
    expect(path[1]!.cell).toEqual({col:3,row:7});
    let from = origin;
    for (const step of path) { expect(Math.max(Math.abs(from.col-step.cell.col),Math.abs(from.row-step.cell.row))).toBe(1); from=step.cell; }
  });
  it('checks both outbound and return legs, rejects no space and zero displacement', () => {
    expect(planJumpRunUp(origin,{col:5,row:3},() => false)).toBeNull();
    expect(planJumpRunUp(origin,origin,() => true)).toBeNull();
    expect(planJumpRunUp(origin,{col:5,row:3},(from,to) => to.row > from.row)).toBeNull();
  });
  it('validates optional modes without allowing unrelated actions to accept jump options', () => {
    const command = {type:'exploration:basic',commandId:crypto.randomUUID(),sceneEpoch:1,action:'jump',targetCell:origin};
    for (const mode of ['standing','running','auto']) expect(explorationActionSchema.safeParse({...command,jumpMode:mode}).success).toBe(true);
    expect(explorationActionSchema.safeParse(command).success).toBe(true);
    expect(explorationActionSchema.safeParse({...command,jumpMode:'flying'}).success).toBe(false);
    expect(explorationActionSchema.safeParse({...command,action:'study',jumpMode:'running'}).success).toBe(false);
  });
});
