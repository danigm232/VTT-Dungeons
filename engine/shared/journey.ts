/** Compact internal boolean keys fit the existing 40-character save schema. */
const keys=new Map<string,string>();
export function journeyReturnKey(characterId:string,portId:string){
 const input=characterId+'|'+portId,cached=keys.get(input);if(cached)return cached;
 let hash=14695981039346656037n;for(const char of input)hash=((hash^BigInt(char.charCodeAt(0)))*1099511628211n)&0xffffffffffffffffn;
 const key='journey.return.'+hash.toString(16).padStart(16,'0');if(keys.size>2048)keys.clear();keys.set(input,key);return key;
}
type LabelledPort={id:string;label?:string;returnLabel?:string;mode:string;from:{zoneId:string};to:{zoneId:string}};
export function journeyPortLabel(port:LabelledPort,direction:'forward'|'return'){
 if(direction==='return'&&port.returnLabel)return port.returnLabel;
 if(direction==='forward'&&port.label)return port.label;
 if(port.id==='travel-pecio-boat')return direction==='forward'?'Navegar al pecio · Rosa de los Vientos':'Volver al Retiro en barca';
 return `${port.id} · ${port.mode} → ${(direction==='forward'?port.to:port.from).zoneId}`;
}
