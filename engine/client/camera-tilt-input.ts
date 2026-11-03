import {clampCameraTilt,stepCameraTilt,DEFAULT_CAMERA_PROFILE,type CameraTiltProfile} from './camera-profile';

/** Tap: next landmark. Hold: continuous travel, with brief rests at landmarks.
 * Releasing a hold retains its exact angle, including fractional degrees. */
export class CameraTiltHold {
  private direction=0;
  private elapsed=0;
  private pause=0;
  private held=false;
  constructor(private read:()=>number,private write:(value:number)=>void,private profile:()=>CameraTiltProfile=()=>DEFAULT_CAMERA_PROFILE) {}
  begin(direction:number){if(this.direction)return;this.direction=Math.sign(direction);this.elapsed=0;this.pause=0;this.held=false;}
  advance(milliseconds:number){
    if(!this.direction)return;
    const before=this.elapsed;this.elapsed+=milliseconds;
    let remaining=Math.max(0,this.elapsed-180)-Math.max(0,before-180);
    if(!remaining)return;
    this.held=true;
    while(remaining>1e-6){
      if(this.pause>0){const used=Math.min(remaining,this.pause);remaining-=used;this.pause-=used;continue;}
      const current=this.read(),profile=this.profile(),next=stepCameraTilt(current,this.direction,profile);
      if(Math.abs(next-current)<1e-8)break;
      const toStop=Math.abs(next-current)/.01,used=Math.min(toStop,remaining);
      this.write(clampCameraTilt(current+this.direction*.01*used,profile));remaining-=used;
      if(used>=toStop-1e-6)this.pause=120;
    }
  }
  end(tap=true){if(this.direction&&tap&&!this.held)this.write(stepCameraTilt(this.read(),this.direction,this.profile()));this.direction=0;}
}

export function cameraTiltControl(read:()=>number,write:(value:number)=>void,profile:()=>CameraTiltProfile){
  const hold=new CameraTiltHold(read,write,profile);let frame:number|null=null,last=0;
  const tick=(now:number)=>{hold.advance(Math.min(100,now-last));last=now;frame=requestAnimationFrame(tick);};
  const end=(tap=true)=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;hold.end(tap);};
  const begin=(direction:number)=>{if(frame!==null)end(false);hold.begin(direction);last=performance.now();frame=requestAnimationFrame(tick);};
  addEventListener('blur',()=>end(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)end(false);});
  return {begin,end,bind(button:HTMLButtonElement,direction:number){
    button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);begin(direction);});
    button.addEventListener('pointerup',()=>end());button.addEventListener('pointercancel',()=>end(false));button.addEventListener('lostpointercapture',()=>end(false));
    button.addEventListener('click',event=>{if(event.detail===0)write(stepCameraTilt(read(),direction,profile()));});
  }};
}
