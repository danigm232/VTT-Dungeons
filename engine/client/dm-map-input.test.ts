import {describe,it,expect,vi} from 'vitest';
import {installDmMapInput} from './dm-map-input';
class Canvas extends EventTarget{
  style={cursor:''};capture=new Set<number>();
  setPointerCapture(id:number){this.capture.add(id);}hasPointerCapture(id:number){return this.capture.has(id);}releasePointerCapture(id:number){this.capture.delete(id);}
}
function setup(){
  const canvas=new Canvas(),hit={cell:{col:8,row:9},surfaceId:'main',entityId:'hero'},select=vi.fn(),pan=vi.fn(),context=vi.fn();let selected=false,tool=false;
  installDmMapInput(canvas as unknown as HTMLCanvasElement,{pick:()=>hit,select,pan,interaction:()=>({canPan:()=>!selected,singleClick:()=>tool,context})});
  const event=(name:string,x=20,y=30,button=0)=>{const e=new Event(name,{cancelable:true});Object.assign(e,{pointerId:1,button,clientX:x,clientY:y});canvas.dispatchEvent(e);return e;};
  return {canvas,hit,select,pan,context,event,setSelected:()=>selected=true,setTool:()=>tool=true};
}
describe('DM gestures',()=>{
  it('selects only on double click; right-click opens the menu without changing the selection',()=>{
    const t=setup();t.event('pointerdown');t.event('pointerup');expect(t.select).not.toHaveBeenCalled();
    t.event('dblclick');expect(t.select).toHaveBeenCalledExactlyOnceWith(t.hit);
    t.event('pointerdown',20,30,2);expect(t.event('contextmenu').defaultPrevented).toBe(true);expect(t.context).toHaveBeenCalledExactlyOnceWith(t.hit,20,30);expect(t.select).toHaveBeenCalledTimes(1);
  });
  it('drags without selecting or placing and refuses to pan while a ficha is selected',()=>{
    const t=setup();t.event('pointerdown');t.event('pointermove',40,45);t.event('pointerup',40,45);expect(t.pan).toHaveBeenCalledExactlyOnceWith(20,15);expect(t.select).not.toHaveBeenCalled();expect(t.canvas.capture.size).toBe(0);
    t.setSelected();t.event('pointerdown');t.event('pointermove',60,60);t.event('pointerup');expect(t.pan).toHaveBeenCalledTimes(1);
  });
  it('retains single-click confirmation for a deliberately armed tool, but never on drag or cancel',()=>{
    const t=setup();t.setTool();t.event('pointerdown');t.event('pointerup');expect(t.select).toHaveBeenCalledTimes(1);
    t.event('pointerdown');t.event('pointermove',60,60);t.event('pointerup');t.event('pointerdown');t.event('pointercancel');expect(t.select).toHaveBeenCalledTimes(1);
  });
});
