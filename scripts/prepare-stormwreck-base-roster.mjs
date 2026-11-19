import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),source=resolve(root,'prototypes/godot-shared/characters');
const pdf='OneDrive_1_12-9-2026/Aventura Los Dragones de la Isla de las Tempestades.pdf';
const pdfHash=createHash('sha256').update(await readFile(resolve(root,pdf))).digest('hex');
const art='campaigns/stormwreck-isle/public/art/characters/base-v1';
await mkdir(resolve(root,art),{recursive:true});await mkdir(resolve(source,'drafts'),{recursive:true});
const bodies={
 'reptilian-small':{base:'humanoid-small',extra:{tail_root:[.52,.72],tail_tip:[.90,.86]}},
 'reptilian-winged-small':{base:'humanoid-small',extra:{tail_root:[.52,.72],tail_tip:[.90,.86],wing_left:[.16,.35],wing_right:[.84,.35]}},
 'fungal-biped':{base:'humanoid-tall',extra:{crown:[.5,.15],root:[.5,.98]}},
 'dragon-quadruped':{base:'quadruped',extra:{neck:[.35,.35],jaw:[.22,.35],wing_left:[.22,.2],wing_right:[.78,.2],tail_root:[.72,.55],tail_tip:[.96,.84]}},
 'serpentine':{anchors:{head:[.38,.18],neck:[.45,.32],torso:[.5,.56],tail_root:[.61,.7],tail_tip:[.86,.9],root:[.5,.98]}},
 'cephalopod':{anchors:{head:[.5,.23],torso:[.5,.4],mantle:[.5,.28],root:[.5,.98],arm_1:[.12,.64],arm_2:[.2,.82],arm_3:[.35,.94],arm_4:[.48,.98],arm_5:[.62,.94],arm_6:[.77,.82],arm_7:[.88,.64],arm_8:[.82,.44]}},
 'winged-insect':{anchors:{head:[.5,.26],torso:[.5,.5],proboscis:[.5,.76],wing_left:[.15,.34],wing_right:[.85,.34],leg_1:[.28,.6],leg_2:[.3,.73],leg_3:[.36,.87],leg_4:[.72,.6],leg_5:[.7,.73],leg_6:[.64,.87],root:[.5,.98]}},
 'limbless-winged':{anchors:{head:[.38,.28],torso:[.5,.5],wing_left:[.13,.29],wing_right:[.86,.29],tail_root:[.63,.66],tail_tip:[.83,.88],root:[.5,.98]}}
};
for(const [id,spec]of Object.entries(bodies)){
 const target=resolve(source,'anatomies',id+'.json');try{await access(target);continue;}catch{}
 const base=spec.base?JSON.parse(await readFile(resolve(source,'anatomies',spec.base+'.json'),'utf8')):{};
 const anchors={...(base.anchors??{}),...(spec.anchors??{}),...(spec.extra??{})};
 await writeFile(target,JSON.stringify({version:1,id,kind:'anatomy',coordinates:'normalised visible image bounds; x right/y down; seed anchors require per-frame review',anchors,requiredAnchors:spec.base?base.requiredAnchors:Object.keys(anchors),slots:[],frameOverrides:{},status:'seed; one base pose, no directional animation inferred'},null,2)+'\n');
}
const entries=[
 ['runara','Runara · forma humana','humanoid-tall',1.65,[8,41],'elderly human woman, weathered brown skin, kind hazel eyes, white hair in a braid, plain ivory monastic robe; no weapons or visible dragon parts'],
 ['tarak','Tarak','humanoid-tall',1.75,[9,47],'older HUMAN man, pale freckled skin, auburn hair, greying beard, blue-grey eyes, faded neck tattoos partly hidden under earth-stained gardening clothes; unarmed'],
 ['varnoth','Varnoth Wender','humanoid-tall',1.72,[9,48],'older human woman, brown scarred skin, black buzz cut, milky blind LEFT eye; elegant wood-and-metal prosthesis replaces her anatomical RIGHT leg below the knee; unarmed everyday clothing'],
 ['myla','Myla','reptilian-winged-small',.85,[9,44],'red-scaled kobold tinkerer, swept horns, practical patched work clothes and small alchemy/tool belt; visibly damaged diminished wings, grounded stance, no active flame'],
 ['agga','Agga','reptilian-small',.85,[8],'reserved practical kobold organiser, orderly plain monastic work clothes; appearance beyond species is an art interpretation'],
 ['blepp','Blepp','reptilian-small',.82,[8],'alert kobold with a prized ordinary dagger in its sheath; lucky, watchful personality; no magical glowing weapon'],
 ['frub','Frub','reptilian-small',.78,[8],'energetic curious kobold, bright attentive face and practical work clothes; physical palette is an art interpretation'],
 ['kilnip','Kilnip','reptilian-small',.82,[9],'tired talkative kobold, drooping eyelids, relaxed shoulders and plain comfortable monastic clothing; base remains neutral and upright'],
 ['laylee','Laylee','reptilian-small',.82,[9],'curious skilled kobold builder, apprentice tools on belt, patched work apron; no alchemical flame'],
 ['mumpo','Mumpo','reptilian-small',.84,[9],'bold confident kobold, small copper coin held as personal visual detail; ordinary simple clothing, no granted treasure in gameplay'],
 ['rix','Rix','reptilian-small',.8,[9],'devout friendly kobold temple assistant, simple clean ivory sash and humble cloth; decorative symbol is an art interpretation'],
 ['zark','Zark','reptilian-small',.86,[9],'gruff insolent kobold with expressive frown, plain worn clothes; not an evil armoured boss'],
 ['mek','Mek','reptilian-winged-small',.9,[31],'male winged red kobold, long snout painted blue, healthy leathery wings, stockier brother of Myla; rough simple straps, no heavy armour'],
 ['minn','Minn','reptilian-winged-small',.87,[31],'male winged red kobold, long snout painted blue, healthy leathery wings, slimmer brother of Myla; distinct horn silhouette from Mek'],
 ['kobold','Kobold renegado','reptilian-small',.85,[14,15,43],'small reptilian kobold, rusty red scales, long snout, two horns, visible tail, rough cloth and sheathed dagger; reusable unnamed island kobold base'],
 ['winged-kobold','Kobold alado','reptilian-winged-small',.9,[15,44],'small reptilian kobold with two arms, two legs, a tail and a separate pair of leathery wings; rough cloth and a simple belt; no blue snout paint'],
 ['sinensa','Sinensa','fungal-biped',2.7,[20,21,45],'large myconid colony leader, broad layered ochre mushroom crown, thick fibrous fungal body; neutral healthy base for reuse, illness and coma remain separate scene states'],
 ['myconid-adult','Micónido adulto','fungal-biped',1.65,[19,20,45],'walking intelligent fungus with rust-orange broad cap, blue-grey gilled face, fibrous root limbs, humanoid silhouette made entirely of fungus; no clothing or equipment'],
 ['myconid-sprout','Brote micónido','fungal-biped',.75,[19,44,45],'small young walking fungus, squat purple porous mushroom cap and short pink-brown stem limbs; distinctly smaller/younger than adult, no clothes'],
 ['fume-drake','Draco de humo','limbless-winged',.9,[14,20,39],'small draconic elemental made of dense GREENISH SMOKE, dragon head, smoky wings and long curling tail; absolutely NO LEGS or arms; readable opaque core with translucent wisps'],
 ['stirge','Estirge','winged-insect',.35,[19,31,42],'tiny bloodsucking flying creature combining bat-like leathery wings, six hooked insect legs, long slender piercing proboscis and swollen dark red abdomen; not a miniature dragon'],
 ['violet-fungus','Hongo violeta','plant',1.4,[19,43],'purple giant fungus, root-like walking appendages and exactly FOUR long flexible attacking tentacles, no human face, no clothing'],
 ['spore-octopus','Pulpo siervo espora','cephalopod',1.5,[18,46],'dead giant octopus reanimated by fungal spores, bluish grey mantle covered with small fungal growths, exactly EIGHT distinct arms with suckers; whole body exposed, no water/scenery'],
 ['fire-snake','Serpiente de fuego','serpentine',1.2,[20,47],'limbless salamander larva, long coiled red-orange scaled serpent with a dragon-like head, yellow glowing eyes and flame-shaped dorsal spines, yellow-gold belly; no arms/legs'],
 ['owlbear','Oso lechuza','quadruped',2.0,[14,46],'large powerful bear body, owl head and hooked beak, dark brown fur with PURPLE feathers, small WOODEN WHISTLE on a cord round neck; four paws, no armour'],
 ['runara-dragon','Runara · dragona de bronce','dragon-quadruped',4.0,[8,41],'adult bronze coastal dragon, weathered bronze and olive-gold metal scales, powerful four-legged body, two distinct wings and long tail; mature wise bearing; same actor as human Runara'],
 ['aidron','Aidron','dragon-quadruped',1.35,[28,34,41],'BRONZE DRAGON WYRMLING, bear-sized quadruped with yellow-green bronze metallic scales, four legs, two wings and long tail; alert youthful friendly neutral base, no permanent chains'],
 ['sparkrender','Chispa Fulminante','dragon-quadruped',1.35,[28,32,33,40],'BLUE DRAGON WYRMLING, slim bear-sized young dragon, cobalt blue scales, one prominent conical nasal horn, large ear fins, four legs and separate two wings, long tail; proud threatening neutral pose, no breath attack']
];
const roster=[];
for(const [key,name,anatomy,height,pages,brief]of entries){
 const id='sw-'+key,expected=art+'/'+key+'.png';
 const definition={version:1,kind:'character',id,name,campaign:'stormwreck-isle',anatomy,heightMeters:height,heightBasis:'visual staging estimate consistent with PDF size category; not an asserted canonical individual height',aliases:[key,...(key==='runara'?['npc-runara']:key==='tarak'?['npc-tarak']:key==='varnoth'?['npc-varnoth']:[])],source:{kind:'individual-frames',files:[expected],fps:1,animation:'idle',directions:['se']},embeddedSlots:['clothing'],equipmentSlots:[],safeAnimations:['idle'],frameOverrides:{},states:['poisoned','petrified','frosted','burned','cursed','invisible'],visualStyle:'painted inked fantasy VTT character; clear material planes and adult proportions; coherent with existing Stormwreck heroes',orientation:'one complete base pose, three-quarter front, slightly elevated camera; not an eight-direction animation',scale:'calibrate standing body, not total wings/tail envelope',pivot:'ground support, relative visible bounds; fitted after artwork exists',dependencies:[],mechanicalReference:{pdf,pdfSha256:pdfHash,pages},production:{stage:'defined-before-generation',expectedFile:expected,method:'built-in ImageGen; one isolated full-body asset per call',brief,background:'true RGBA transparency',margin:'all anatomy inside canvas with clear gutter; no collage',referenceStyle:['campaigns/stormwreck-isle/public/art/m3/trinity/maria_base.png','prototypes/godot-pecio/assets/tokens/wizard-rest-v1.png'],designInterpretation:'Features not specified in the adventure are an art proposal, not added rules or lore'},limitations:['Only a base idle pose exists in this milestone. Directional movement/attacks are not claimed.','New clothing/equipment swapping is deferred; outfit belongs to this base illustration.'],review:{technical:'pending',visual:'pending',userAcceptance:'pending',evidence:[]}};
 if(['sinensa','myconid-adult','myconid-sprout','fume-drake','stirge','violet-fungus','spore-octopus','fire-snake','owlbear','runara-dragon','aidron','sparkrender'].includes(key))definition.embeddedSlots=[];
 if(key==='runara-dragon')definition.formOf='sw-runara';
 const path=resolve(source,'drafts',id+'.json');try{await access(path);}catch{await writeFile(path,JSON.stringify(definition,null,2)+'\n');}
 roster.push({id,name,pdfPages:pages,anatomy,base:expected,status:'needs-base-art',definition:'prototypes/godot-shared/characters/drafts/'+id+'.json'});
}
const shared=[
 ...['Molen','Kraz','Bispo','Valup','Popple'].map(name=>({name,pdfPages:[19],baseId:'sw-myconid-sprout',reason:'named sprout; no unique physical description in PDF'})),
 ...['Hipsiz','Rugoso','Agric','Omphalo','Craterel','Pleuro','Subrufus','Virosa','Auranta','Enoc'].map(name=>({name,pdfPages:[19,20],baseId:'sw-myconid-adult',reason:'named adult; no unique physical description in PDF'}))
];
const existing=[['mike','Mike','prototypes/godot-pecio/assets/tokens/wizard-rest-v1.png'],['mia','Mía','prototypes/godot-pecio/assets/tokens/cleric-rest-v1.png'],['maria','Trinity / María','campaigns/stormwreck-isle/public/art/m3/trinity/maria_base.png'],['ghoul','Gul','campaigns/stormwreck-isle/public/art/m3/ghoul/ghoul_base.png'],['harpy','Arpía','campaigns/stormwreck-isle/public/art/m3/harpy/harpia_base.png'],['zombie','Zombis marineros','campaigns/stormwreck-isle/public/art/m3/zombie/zombie1_base.png']].map(([id,name,file])=>({id,name,file,status:'reuse-existing-base; retain original identity and variants'}));
const data={date:'2026-11-17',campaign:'stormwreck-isle',sourcePdf:pdf,pdfSha256:pdfHash,scope:'Base art for all missing adventure creatures and NPC types; heroes and existing undead/harpies reused. D8 work deferred by user.',newBases:roster,sharedNamedNpcs:shared,existing,excluded:[{kind:'historical-dragon',names:['Sharruth','Eldenemir and other dead dragons'],reason:'background/ritual powers, not additional living encounter NPCs; ritual visuals can reuse dragon silhouettes later'},{kind:'player-pregens',names:['fighter','paladin'],reason:'user selected Mía, Mike and Trinity only'}]};
await writeFile(resolve(root,'output/stormwreck-characters-20261117/roster.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({newBases:roster.length,sharedNamedNpcs:shared.length,reusedFamilies:existing.length,sourcePdf:pdf}));
