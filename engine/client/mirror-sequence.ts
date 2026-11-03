/** Ephemeral presentation only: no event survives a restore or creates an actor. */
export class MirrorSequenceGate {
 private seen=new Set<string>();
 accept(event:{eventId:string;serverTime:number},now:number,duration:number){
  if(this.seen.has(event.eventId)||!Number.isFinite(event.serverTime)||now-event.serverTime>=duration)return null;
  this.seen.add(event.eventId);while(this.seen.size>128)this.seen.delete(this.seen.values().next().value!);
  return Math.max(0,now-event.serverTime);
 }
}
