export type MapContextAction={label:string;run:()=>void;disabled?:boolean};
/** A single short menu, anchored to the chosen map destination. */
export class DmMapContextMenu {
  private menu=document.createElement('div');
  constructor(){
    this.menu.className='dm-map-context-menu';this.menu.setAttribute('role','menu');this.menu.hidden=true;document.body.append(this.menu);
    document.addEventListener('pointerdown',event=>{if(!this.menu.contains(event.target as Node))this.close();});
    addEventListener('blur',()=>this.close());addEventListener('resize',()=>this.close());
    this.menu.addEventListener('keydown',event=>{
      const buttons=Array.from(this.menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if(event.key==='Escape'){event.preventDefault();this.close();return;}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
      }
    });
  }
  close(){this.menu.hidden=true;}
  show(title:string,x:number,y:number,actions:MapContextAction[]){
    const heading=document.createElement('strong');heading.textContent=title;this.menu.replaceChildren(heading);
    for(const action of actions){const button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent=action.label;button.disabled=Boolean(action.disabled);button.onclick=()=>{this.close();action.run();};this.menu.append(button);}
    this.menu.hidden=false;
    this.menu.style.left=Math.max(8,Math.min(x,innerWidth-this.menu.offsetWidth-8))+'px';
    this.menu.style.top=Math.max(8,Math.min(y,innerHeight-this.menu.offsetHeight-8))+'px';
    this.menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }
}
