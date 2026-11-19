// Production capabilities are separate from animation aliases and gameplay rules.
const MODE_ACTIONS={walk:['walk','walking','run','running','moving','dash','stealth','crawl','root_shuffle','ground_drag','ground_glide','slither','scuttle'],fly:['fly','flight','flying','takeoff','land','flight_turn'],swim:['swim','swimming','swim_turn'],climb:['climb','climbing'],burrow:['burrow','burrow_enter','burrow_exit'],jump:['jump','jumping']};
export function motionMode(action=''){
 const normalized=String(action).replaceAll('-','_').toLowerCase();
 return Object.keys(MODE_ACTIONS).find(mode=>MODE_ACTIONS[mode].includes(normalized))??null;
}
export function frameMinimum(definition,records,rules){
 const campaign=definition.campaign??records.find(r=>r.definition.id===definition.character)?.definition.campaign;
 const policy=rules.campaignFramePolicies?.[campaign];
 if(motionMode(definition.action??definition.source?.animation))return policy?.minimumDistinctCycleFrames??rules.minimumNewMovementFrames;
 if(policy&&definition.kind==='animation'&&definition.frames?.length>1&&definition.poseKind!=='hold')return policy.minimumDistinctCycleFrames;
 return 0;
}
export function capabilityError(definition,contract){
 if(!['animation','character'].includes(definition.kind)||definition.campaign!==contract.campaign)return null;
 const mode=motionMode(definition.action??definition.source?.animation);if(!mode)return null;
 const actorId=definition.kind==='character'?definition.id:definition.character;
 const actor=contract.characters[actorId];
 if(!actor)return 'Campaign movement requires a registered motion contract';
 const profile=contract.profiles[actor.profile];
 const speeds=profile.innateSpeedsMeters;
 const granted=definition.capabilityGrant;
 if(granted&&['spell','form','dm-override'].includes(granted.kind)&&typeof granted.reference==='string'&&granted.reference.trim())return null;
 if(mode==='walk'&&Object.hasOwn(speeds,'walk'))return null;
 if(Object.hasOwn(speeds,mode)&&Number(speeds[mode])>0)return null;
 // These require a terrain/rules decision and do not imply a dedicated speed.
 if(profile.contextualCycles.includes(mode)||profile.baseCycles.includes(mode))return null;
 return 'No natural '+mode+' capability for '+actorId+'; use an explicit rule/form grant or a compatible movement mode';
}
