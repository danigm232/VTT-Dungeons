/** The practice die uses a projected icosahedron while tumbling. It shares the
 * screen clock and never contacts the campaign's dice or physics systems. */
const phi = (1 + Math.sqrt(5)) / 2;
const vertices = [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]];
const faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
const ns='http://www.w3.org/2000/svg';

export class SkillD20 {
  private readonly core: SVGElement;
  private readonly group=document.createElementNS(ns,'g');
  private readonly tiles=faces.map((_,i)=>{
    const group=document.createElementNS(ns,'g'),path=document.createElementNS(ns,'path'),number=document.createElementNS(ns,'text');
    path.setAttribute('stroke','#edbd71');path.setAttribute('stroke-width','1.2');path.setAttribute('stroke-linejoin','round');
    number.textContent=String(i+1);number.setAttribute('text-anchor','middle');number.setAttribute('dominant-baseline','central');
    number.setAttribute('fill','#ffe9ac');number.setAttribute('font-family','Georgia,serif');number.setAttribute('font-weight','700');
    group.append(path,number);return {group,path,number};
  });
  constructor(svg:SVGElement) {
    this.core=svg.querySelector<SVGElement>('.skill-die-core')!;
    this.group.classList.add('skill-die-tumble');this.group.setAttribute('display','none');
    this.group.append(...this.tiles.map(t=>t.group));svg.append(this.group);
  }
  paint(progress:number|undefined) {
    this.core.style.visibility=progress===undefined?'':'hidden';
    this.group.setAttribute('display',progress===undefined?'none':'');
    if(progress===undefined)return;
    const t=Math.max(0,Math.min(1,progress)),turn=1-Math.pow(1-t,2.2);
    const ax=.4+turn*Math.PI*5,ay=.7+turn*Math.PI*7,az=turn*Math.PI*3;
    const points=vertices.map(([vx,vy,vz])=>{
      let x=vx!,y=vy!,z=vz!;
      [y,z]=[y*Math.cos(ax)-z*Math.sin(ax),y*Math.sin(ax)+z*Math.cos(ax)];
      [x,z]=[x*Math.cos(ay)+z*Math.sin(ay),-x*Math.sin(ay)+z*Math.cos(ay)];
      [x,y]=[x*Math.cos(az)-y*Math.sin(az),x*Math.sin(az)+y*Math.cos(az)];
      const perspective=1/(1-z*.13);return {x:110+x*31*perspective,y:110+y*31*perspective,z};
    });
    const order=faces.map((face,i)=>({i,z:face.reduce((sum,v)=>sum+points[v]!.z,0)/3})).sort((a,b)=>a.z-b.z);
    for(const {i,z} of order) {
      const p=faces[i]!.map(v=>points[v]!);const tile=this.tiles[i]!;
      tile.path.setAttribute('d',`M${p.map(v=>`${v.x.toFixed(2)},${v.y.toFixed(2)}`).join('L')}Z`);
      const light=Math.round(15+(z+1.6)*7);
      tile.path.setAttribute('fill',`hsl(34 48% ${light}%)`);
      const cx=p.reduce((sum,v)=>sum+v.x,0)/3,cy=p.reduce((sum,v)=>sum+v.y,0)/3;
      const area=Math.abs((p[1]!.x-p[0]!.x)*(p[2]!.y-p[0]!.y)-(p[2]!.x-p[0]!.x)*(p[1]!.y-p[0]!.y));
      tile.number.setAttribute('x',String(cx));tile.number.setAttribute('y',String(cy));
      tile.number.setAttribute('font-size',String(Math.min(20,Math.sqrt(area)*.45)));
      tile.number.setAttribute('opacity',z>0&&area>70?'1':'0');
      tile.number.setAttribute('transform',`rotate(${Math.atan2(p[1]!.y-p[0]!.y,p[1]!.x-p[0]!.x)*180/Math.PI} ${cx} ${cy})`);
      this.group.append(tile.group);
    }
  }
}
