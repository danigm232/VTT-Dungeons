import { describe, expect, it } from 'vitest';
import { cameraTouchAxis, cameraTiltFromTouch, adjustCameraTiltForTouch } from './camera-touch';

describe('player camera with two fingers', () => {
  it('recognizes upward and downward swipes as vertical camera tilt', () => {
    expect(cameraTouchAxis(2, -50, 3, true)).toBe('tilt');
    expect(cameraTouchAxis(-2, 50, -3, true)).toBe('tilt');
  });
  it('retains horizontal orbit and the distinct pinch gesture', () => {
    expect(cameraTouchAxis(60, 3, 2, true)).toBe('orbit');
    expect(cameraTouchAxis(-60, 3, -2, true)).toBe('orbit');
    expect(cameraTouchAxis(3, 4, 40, true)).toBe('zoom');
    expect(cameraTouchAxis(3, 4, -40, true)).toBe('zoom');
  });
  it('ignores finger jitter and small separation changes during a parallel swipe', () => {
    expect(cameraTouchAxis(5, 8, 5, true)).toBeNull();
    expect(cameraTouchAxis(2, -50, 20, true)).toBe('tilt');
  });
  it('does not add tilt or orbit to a flat illustration', () => {
    expect(cameraTouchAxis(0, 50, 0, false)).toBeNull();
    expect(cameraTouchAxis(50, 0, 0, false)).toBeNull();
    expect(cameraTouchAxis(0, 0, 40, false)).toBe('zoom');
  });
  it('raises the view when swiping up and lowers it when swiping down', () => {
    expect(cameraTiltFromTouch(30, -40)).toBe(32);
    expect(cameraTiltFromTouch(30, 40)).toBe(28);
  });
  it('starts smoothly after the recognition threshold without jumping to a limit', () => {
    expect(cameraTiltFromTouch(30, -20)).toBe(30);
    expect(cameraTiltFromTouch(30, -21)).toBeCloseTo(30.1);
    expect(cameraTiltFromTouch(30, 21)).toBeCloseTo(29.9);
  });
  it('always respects the shared 15–35 degree limits and allows reversal', () => {
    expect(cameraTiltFromTouch(25, -500)).toBe(35);
    expect(cameraTiltFromTouch(30, 500)).toBe(15);
    expect(cameraTiltFromTouch(25, 40)).toBe(23);
    expect(cameraTiltFromTouch(15, -40)).toBe(17);
  });
  it('responds immediately when reversing at a limit and keeps small frame movements', () => {
    expect(adjustCameraTiltForTouch(35, 5)).toBe(34.5);
    expect(adjustCameraTiltForTouch(15, -5)).toBe(15.5);
    let tilt = 25;
    for (let frame = 0; frame < 10; frame++) tilt = adjustCameraTiltForTouch(tilt, -1);
    expect(tilt).toBeCloseTo(26);
  });
});
