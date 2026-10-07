import { Animation } from '@babylonjs/core/Animations/animation.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents.js';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
const BABYLON = { Animation, Color3, DynamicTexture, KeyboardEventTypes, Mesh, MeshBuilder,
  PointerEventTypes, StandardMaterial, TransformNode, Vector3, VertexBuffer, VertexData };
// RETIRO DEL DRAGÓN · V5.1 · RECUPERACIÓN V4.1 · RELIEVE SIN BLOQUES
// Generado sin alterar el contenido de los 16 módulos.


// ====================================================
// base.js
// ====================================================
// RETIRO DEL DRAGON · V2 MODULAR · BASE COMPARTIDA
// Geometria y helpers extraidos sin cambios funcionales de la V2 monolitica.

function crearContexto(scene) {
    const CELL = 1.5;
    const LEVEL = Object.freeze({ SEA:0, BEACH:0.25, A1:9, A2:15, A34:18, LINK:24, A5:27 });
    const ZONE = Object.freeze({
        BEACH: { x:-42, y:0.35, z:15 },
        A1:    { x:-11, y:9.25, z:-5.5 },
        A2:    { x:37, y:15.25, z:-19.2 },
        A3:    { x:25, y:18.25, z:-34 },
        A4:    { x:5, y:18.25, z:-36 },
        A5:    { x:-39.5, y:27.25, z:-31 }
    });

    const registry = Object.create(null);
    const group = {
        terrain:[], paths:[], interiors:[], furnishings:[], upperRoof:[], houseRoof:[], templeRoof:[],
        sea:[], ambient:[], grid:[], labels:[], markers:[], spawns:[], player:[],
        landscapeExtra:[], detailExtra:[], npcs:[], storyMarkers:[]
    };

    function material(name, color, alpha, glowing) {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor = BABYLON.Color3.FromHexString(color);
        m.alpha = alpha === undefined ? 1 : alpha;
        if (glowing) m.emissiveColor = m.diffuseColor.scale(glowing);
        if (alpha !== undefined && alpha < 1) m.backFaceCulling = false;
        return m;
    }

    const MAT = {
        rock:material('rock_grey_basalt','#525c5c'),
        rockD:material('rock_dark','#333e40'),
        rockL:material('rock_edge','#77817b'),
        cliffFace:material('cliff_face','#475052'),
        path:material('stone_path','#91846e'),
        pathEdge:material('path_edge','#6e6253'),
        floor:material('cave_floor','#777166'),
        wood:material('aged_wood','#846344'),
        darkWood:material('dark_oak','#4e3d2d'),
        paleWood:material('weathered_wood','#b29570'),
        iron:material('iron','#42474b'),
        metal:material('metal','#8e9a9b'),
        sea:material('water','#1c6681',0.91),
        deepSea:material('deep_water','#17495f',0.98),
        foam:material('foam','#d3e9e7',0.75),
        grass:material('grass','#557a50'),
        leaves:material('leaves','#456e43'),
        leavesL:material('leaves_light','#66865b'),
        garden:material('garden_earth','#6b5740'),
        flower:material('flowers','#ddc381'),
        flower2:material('flowers_2','#c6a4c6'),
        canvas:material('canvas','#d1c49c'),
        books:material('books','#7b4a43'),
        books2:material('books_2','#6d7a58'),
        gold:material('canary_gold','#bfab64'),
        statue:material('sculpted_stone','#b9b9ab'),
        marker:material('debug_marker','#52d5c4',0.4,0.3),
        danger:material('danger_marker','#e75b4c',0.54,0.25),
        aura:material('temple_aura','#e5dba4',0.19,0.24),
        player:material('human_scale_marker','#ede8df'),
        grid:material('grid','#70e1ec',0.75),
        canvasDark:material('aged_canvas','#9a8d6d'),
        foam2:material('foam_brighter','#edf6f2',0.55),
        rope:material('rope','#6e5b43'),
        fish:material('fish_silvery','#b1c4b7'),
        purple:material('purple_bloom','#a383ae'),
        mushroom:material('mushroom','#aabf86'),
        npc:material('npc_debug','#84add0',0.54,0.14)
    };

    function store(mesh, id, bucket, extra) {
        if (registry[id]) throw new Error('ID duplicado: ' + id);
        mesh.name = id;
        mesh.metadata = Object.assign({ id:id, category:bucket, canon:false }, extra || {});
        registry[id] = mesh;
        if (group[bucket]) group[bucket].push(mesh);
        return mesh;
    }
    function B(id,w,h,d,x,y,z,mat,bucket,extra) {
        const m = BABYLON.MeshBuilder.CreateBox(id,{width:w,height:h,depth:d},scene);
        m.position.set(x,y,z); m.material = mat;
        return store(m,id,bucket || 'furnishings',extra);
    }
    function C(id,h,diam,x,y,z,mat,bucket,extra) {
        const m = BABYLON.MeshBuilder.CreateCylinder(id,{height:h,diameter:diam,tessellation:16},scene);
        m.position.set(x,y,z); m.material = mat;
        return store(m,id,bucket || 'furnishings',extra);
    }
    function S(id,diam,x,y,z,mat,bucket,extra) {
        const m = BABYLON.MeshBuilder.CreateSphere(id,{diameter:diam,segments:8},scene);
        m.position.set(x,y,z); m.material = mat;
        return store(m,id,bucket || 'ambient',extra);
    }
    function vec(p) { return new BABYLON.Vector3(p[0],p[1],p[2]); }
    function pathRibbon(id,start,end,width,mat,bucket,extra) {
        // SOLIDO INCLINADO REAL: la altura cambia del inicio al final.
        const a=vec(start), b=vec(end), dx=b.x-a.x, dz=b.z-a.z;
        const len=Math.hypot(dx,dz);
        if (len<0.001) throw new Error('Camino sin longitud: '+id);
        const nx=-dz/len*width/2, nz=dx/len*width/2, bottom=.24;
        const P=[
            a.x+nx,a.y,a.z+nz, a.x-nx,a.y,a.z-nz,
            b.x+nx,b.y,b.z+nz, b.x-nx,b.y,b.z-nz,
            a.x+nx,a.y-bottom,a.z+nz, a.x-nx,a.y-bottom,a.z-nz,
            b.x+nx,b.y-bottom,b.z+nz, b.x-nx,b.y-bottom,b.z-nz
        ];
        const I=[0,2,1, 1,2,3, 4,5,6, 5,7,6,
                 0,1,4, 1,5,4, 2,6,3, 3,6,7,
                 0,4,2, 2,4,6, 1,3,5, 3,7,5];
        const vd=new BABYLON.VertexData(); vd.positions=P; vd.indices=I;
        vd.normals=[]; BABYLON.VertexData.ComputeNormals(P,I,vd.normals);
        const m=new BABYLON.Mesh(id,scene); vd.applyToMesh(m); m.material=mat;
        return store(m,id,bucket || 'paths',Object.assign({type:'walkable_slope',width:width},extra || {}));
    }
    function stairFlight(id,start,end,steps,width) {
        const a=vec(start),b=vec(end),dx=b.x-a.x,dz=b.z-a.z;
        const total=Math.hypot(dx,dz), yaw=-Math.atan2(dz,dx);
        // Cada huella tiene la altura canonica entre nodos. No es un teletransporte.
        for(let i=0;i<steps;i++) {
            const t=(i+.5)/steps, top=a.y+(b.y-a.y)*(i+1)/steps;
            const r=B(id+'_STEP_'+String(i+1).padStart(2,'0'),
                total/steps+.035, .23, width,
                a.x+dx*t,top-.115,a.z+dz*t,MAT.path,'paths',
                {type:'step',route:id,number:i+1,steps:steps,canon:false});
            r.rotation.y=yaw;
        }
        // Ruta tecnica para Codex, sin decidir movimientos automaticamente.
        routes.push({id:id,from:start,to:end,mode:'stairs',steps:steps});
    }
    function gridRect(id,x1,x2,z1,z2,y) {
        let n=0;
        const color=BABYLON.Color3.FromHexString('#61cad8');
        for(let x=x1;x<=x2+.001;x+=CELL) {
            const m=BABYLON.MeshBuilder.CreateLines(id+'_X_'+n++,{
                points:[new BABYLON.Vector3(x,y,z1),new BABYLON.Vector3(x,y,z2)]},scene);
            m.color=color; m.isPickable=false;
            store(m,m.name,'grid',{type:'grid',cell:CELL});
        }
        n=0;
        for(let z=z1;z<=z2+.001;z+=CELL) {
            const m=BABYLON.MeshBuilder.CreateLines(id+'_Z_'+n++,{
                points:[new BABYLON.Vector3(x1,y,z),new BABYLON.Vector3(x2,y,z)]},scene);
            m.color=color; m.isPickable=false;
            store(m,m.name,'grid',{type:'grid',cell:CELL});
        }
    }
    function strip(id,a,b,y,width,mat,bucket) {
        const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz);
        const m=B(id,len,.15,width,(a[0]+b[0])/2,y,(a[1]+b[1])/2,mat,bucket,{type:'plank'});
        m.rotation.y=-Math.atan2(dz,dx); return m;
    }
    function rail(id,x1,z1,x2,z2,y) {
        const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),n=Math.max(2,Math.round(len/2.2));
        for(let i=0;i<=n;i++) {
            const t=i/n; C(id+'_POST_'+i,1.06,.14,x1+dx*t,y+.53,z1+dz*t,
                MAT.darkWood,'ambient',{type:'railing',canon:false});
        }
        strip(id+'_TOP',[x1,z1],[x2,z2],y+1.05,.14,MAT.darkWood,'ambient');
    }
    function label(id,text,x,y,z) {
        const plane=BABYLON.MeshBuilder.CreatePlane(id,{width:9,height:1.65},scene);
        plane.position.set(x,y,z); plane.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
        const dt=new BABYLON.DynamicTexture(id+'_TEXT',{width:1024,height:192},scene,true);
        dt.hasAlpha=true;
        dt.drawText(text,null,134,'bold 72px Arial','white','rgba(17,24,28,.78)',true,true);
        const lm=new BABYLON.StandardMaterial(id+'_MAT',scene);
        lm.diffuseTexture=dt; lm.opacityTexture=dt;
        lm.emissiveColor=new BABYLON.Color3(1,1,1); lm.disableLighting=true;
        plane.material=lm; plane.isPickable=false;
        return store(plane,id,'labels',{type:'label',text:text});
    }
    function rock(id,x,y,z,sx,sy,sz,mat) {
        const m=S(id,2,x,y,z,mat || MAT.rock,'terrain',{type:'natural_rock'});
        m.scaling.set(sx,sy,sz); m.rotation.set(.11,.37+Math.abs(x)*.012,.08);
        return m;
    }
    const routes=[];

    return {
        scene, CELL, LEVEL, ZONE, registry, group, MAT,
        store, B, C, S, vec, pathRibbon, stairFlight,
        gridRect, strip, rail, label, rock, routes
    };
}


// ====================================================
// terreno.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: terreno.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearTerreno(ctx) {
    const { scene, B, MAT, rock, store } = ctx;

    // Piso inferior de roca. Por encima va A1 a +9m.
    B('ROCK_LOWER_BODY',69,8.8,25,0,4.4,-6,MAT.rockD,'terrain',{type:'bedrock',top:8.8});
    // Su borde se ve desde el mar: masa continua longitudinal, no montana piramidal.
    for(let i=0;i<15;i++) {
        const x=-32+i*5.5;
        rock('ROCK_FRONT_'+i,x,4.1,6.4+Math.sin(i*1.7)*.65,2.0,4.5,1.7,i%3===0?MAT.rockL:MAT.rock);
    }
    // Roca detras de las celdas: sobre ella discurre el nivel de +18m.
    // Termina en Z=-19 para NO llenar artificialmente el interior de las celdas.
    B('ROCK_UPPER_BACK',86,8.9,31,5.0,13.35,-34.5,MAT.rock,'terrain',
        {type:'upper_bedrock',top:17.8});
    // Cornisa frontal que tapa parcialmente las cuevas, con modo de corte T.
    // Al ocultarla se ven completamente las 6 celdas.
    const canopy=B('ROCK_OVER_CELLS',41.5,5.1,9.1,-12,15.27,-14.4,
        MAT.rockL,'upperRoof',{type:'rock_canopy',canon:false});
    // Macizo aun mas alto detras de biblioteca y cocina, sin invadir sus salas.
    B('ROCK_NORTH_RIDGE',96,10.2,13,0,22.9,-57,MAT.rockD,'terrain',
        {type:'ridge',canon:false});
    for(let i=0;i<16;i++) {
        const x=-43+i*6;
        rock('UPPER_FACET_'+i,x,17.2,-48.1+Math.sin(i*1.4)*.65,
            2.1,4.8,2.0,i%3===0?MAT.rockL:MAT.rock);
    }
    // Cara del acantilado entre +9 y +18, evitando el acceso a las cuevas.
    // Bloques de roca de fondo, con los vanos de las 6 entradas construidos despues.
    for(let i=0;i<8;i++) {
        const x=12+i*4.7;
        rock('UPPER_CLIFF_EAST_'+i,x,12.6,-19.1,2.2,4.5,1.4,MAT.rock);
    }

    // Costa irregular. El mar ocupa todo el frente de la escena.
    B('ROCKY_BEACH',37,.28,9,-36,.2,14.5,MAT.pathEdge,'terrain',
        {zone:'BEACH',canon:true,type:'walkable'});
    for(let i=0;i<13;i++) {
        const x=-53+i*7.3;
        const z=11+Math.sin(i*.84)*1.1;
        rock('SHORE_ROCK_'+i,x,.14,z,1.2+i%3*.28,.5+i%2*.2,.9,i%4===0?MAT.rockL:MAT.rockD);
    }
    const sea=BABYLON.MeshBuilder.CreateGround('SEA_SURFACE',{width:188,height:110,subdivisions:2},scene);
    sea.position.set(0,-.08,41); sea.material=MAT.sea;
    store(sea,'SEA_SURFACE','sea',{type:'water',canon:true});
    B('SEA_DEPTH',187,.03,19,0,-.18,86,MAT.deepSea,'sea',{type:'water'});
    // Ensenada oriental bajo A2: palé realmente suspendido sobre agua, no roca.
    const cove=BABYLON.MeshBuilder.CreateGround('A2_COVE_SEA',{width:27,height:36},scene);
    cove.position.set(48,-.075,-14); cove.material=MAT.sea;
    store(cove,'A2_COVE_SEA','sea',{type:'water',canon:true});
    for(let i=0;i<10;i++) {
        const x=-55+i*10.3;
        B('SEA_FOAM_'+i,6,.025,.13,x,.012,20+Math.sin(i*.7)*.8,MAT.foam,'ambient',
          {type:'sea_foam'});
    }
    // Rocas del mar, lejos del recorrido.
    [[-47,34,2.5],[-14,38,2.2],[24,43,2.9],[41,27,2.1],[49,48,1.7]].forEach((p,i)=>{
        rock('ISLET_'+i,p[0],.25,p[1],p[2],1.1,p[2]*.72,MAT.rock);
    });
}



// ====================================================
// llegada.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: llegada.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearLlegada(ctx) {
    const { B, C, MAT, pathRibbon, routes, stairFlight } = ctx;

    for(let i=0;i<11;i++) {
        B('DOCK_PLANK_'+i,1.0,.14,4.4,-48+i*.94,.65,18.8,
            i%4===0?MAT.paleWood:MAT.wood,'sea',{type:'pier',canon:true});
    }
    for(let i=0;i<4;i++) {
        C('DOCK_POST_'+i,2.4,.27,-48+i*3.0,-.3,16.9,MAT.darkWood,'sea',{type:'pier'});
    }
    function boat(id,x,z,angle) {
        const base=B(id+'_HULL',5,.42,2.3,x,.54,z,MAT.darkWood,'sea',
            {type:'boat',canon:true,interaction:id==='CLAUSTRO_BOAT'?'rowboat_for_pecio':'arrival_boat'});
        const sides=[];
        sides.push(B(id+'_PORT',5,.72,.16,x,.85,z-1.1,MAT.wood,'sea',{type:'boat_side'}));
        sides.push(B(id+'_STARBOARD',5,.72,.16,x,.85,z+1.1,MAT.wood,'sea',{type:'boat_side'}));
        for(let i=-1;i<=1;i++) sides.push(B(id+'_SEAT_'+i,.23,.15,1.9,x+i*1.4,1,z,MAT.paleWood,'sea',{}));
        base.rotation.y=angle;
        sides.forEach(s=>s.rotation.y=angle);
        // Angular representation only: VTT_AMBIENCE, not a physics-ready vehicle.
        return base;
    }
    boat('CLAUSTRO_BOAT',-43.5,25,.08);
    boat('ARRIVAL_BOAT',-50,32,-.1);
    for(let i=0;i<3;i++) {
        const m=C('ZOMBIE_SPAWN_'+(i+1),.04,.92,-37+i*2.4,.43,13.1+(i%2)*1.1,
            MAT.danger,'spawns',{type:'spawn',canon:true,creature:'zombie',encounter:'marineros_ahogados'});
        m.isVisible=false;
    }

    // =====================================================================
    // RUTA REAL A1: DESDE LA PLAYA POR EL EXTREMO OCCIDENTAL
    // =====================================================================
    const ascent=[
        [-47,.49,12],[-47,1.6,6.7],[-45,3.7,2],[-42,5.7,-2.7],[-37,7.5,-5],[-34,9.16,-5.7]
    ];
    for(let i=0;i<ascent.length-1;i++) {
        pathRibbon('ROUTE_BEACH_TO_A1_'+i,ascent[i],ascent[i+1],3.1,MAT.path,'paths',
            {canon:true,route:'BEACH_A1'});
        routes.push({id:'BEACH_A1_'+i,from:ascent[i],to:ascent[i+1],mode:'walk'});
    }
    // escalones ocasionales, solo en los tramos de mayor pendiente
    stairFlight('STEPS_WEST_APPROACH',[-45,3.7,2],[-42,5.7,-2.7],7,3.0);
}



// ====================================================
// a1.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: a1.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearA1(ctx) {
    const { B, C, S, MAT, rail, gridRect } = ctx;

    B('A1_LONG_PLAZA',52,.30,7.8,-10,9.11,-5.75,MAT.path,'paths',
        {type:'walkable',zone:'A1',canon:true});
    // Dos bordes orientados segun la longitud. No cerrar el acceso desde la rampa.
    rail('A1_SEA_RAIL',-24,-1.7,15,-1.7,9.25);
    gridRect('GRID_A1_MAIN',-34,14,-9.25,-3.25,9.28);
    // Estatua de un dragon de bronce en la plaza.
    B('A1_DRAGON_PEDESTAL',2.4,.65,2.4,-10,9.56,-5.8,MAT.statue,'furnishings',
        {type:'statue',canon:true,represents:'Astalagan'});
    const body=S('A1_BRONZE_DRAGON_BODY',1.4,-10,10.9,-5.8,MAT.statue,'furnishings',
        {type:'statue',canon:true}); body.scaling.set(1.3,.64,.62);
    const neck=C('A1_BRONZE_DRAGON_NECK',1.2,.42,-9.45,11.55,-5.8,MAT.statue,'furnishings',{});
    neck.rotation.z=-.42;
    S('A1_BRONZE_DRAGON_HEAD',.57,-9.0,12.12,-5.8,MAT.statue,'furnishings',{});
    // Jardines en los tramos inferiores del camino.
    [[-38,5.9,-.4],[-33,7.7,-1.4],[-25,9.2,-1.4],[-18,9.2,-1.4]].forEach((p,i)=>{
        B('A1_GARDEN_PLOT_'+i,3.3,.2,1.75,p[0],p[1],p[2],MAT.garden,'ambient',
            {type:'garden',canon:true,caretaker:'Tarak'});
        for(let r=0;r<4;r++) {
            B('GARDEN_ROW_'+i+'_'+r,.12,.16,1.2,p[0]-1.15+r*.77,p[1]+.16,p[2],MAT.leaves,'ambient',{});
            for(let f=0;f<3;f++) S('GARDEN_FLOWER_'+i+'_'+r+'_'+f,.11,
                p[0]-1.15+r*.77,p[1]+.28,p[2]-.48+f*.48,
                f%2?MAT.flower:MAT.flower2,'ambient',{});
        }
    });

    const cellDefs=[
        {id:'A1_GUEST',x:-29.2,who:'PJ',hammocks:false},
        {id:'A1_TARAK',x:-23.5,who:'Tarak',hammocks:false},
        {id:'A1_VARNOTH',x:-17.8,who:'Varnoth',hammocks:false},
        {id:'A1_MYLA',x:-12.1,who:'Myla',hammocks:false},
        {id:'A1_KOBOLDS_W',x:-6.4,who:'kobolds',hammocks:true},
        {id:'A1_KOBOLDS_E',x:-.7,who:'kobolds',hammocks:true}
    ];
    // Celdas: suelo 5.2 x 6.8; entrada excavada, muro real con hueco de 1.65m.
    cellDefs.forEach((c,n)=>{
        const x=c.x;
        B(c.id+'_FLOOR',5.25,.22,7.2,x,9.18,-14.7,MAT.floor,'interiors',
            {type:'room_floor',zone:c.id,canon:true});
        B(c.id+'_BACK',5.25,3.1,.32,x,10.77,-18.32,MAT.rock,'interiors',
            {type:'rock_wall',canon:false});
        B(c.id+'_SIDE_W',.3,3.1,7.2,x-2.62,10.77,-14.7,MAT.rock,'interiors',{});
        B(c.id+'_SIDE_E',.3,3.1,7.2,x+2.62,10.77,-14.7,MAT.rock,'interiors',{});
        B(c.id+'_ENTRY_W',1.78,3.1,.34,x-1.74,10.77,-11.08,MAT.rockL,'interiors',{});
        B(c.id+'_ENTRY_E',1.78,3.1,.34,x+1.74,10.77,-11.08,MAT.rockL,'interiors',{});
        B(c.id+'_LINTEL',1.70,.60,.34,x,12.05,-11.08,MAT.rockL,'interiors',{});
        // Mobiliario: en los dos ultimos dormitorios hay ocho hamacas en total.
        if(!c.hammocks) {
            B(c.id+'_BED',1.25,.40,2.35,x-1.38,9.51,-16.2,MAT.wood,'furnishings',
                {type:'bed',canon:true});
            B(c.id+'_DESK',1.45,.70,.72,x+1.22,9.68,-16.65,MAT.wood,'furnishings',
                {type:'desk',canon:true});
            B(c.id+'_CHAIR',.54,.71,.55,x+1.22,9.67,-15.5,MAT.darkWood,'furnishings',
                {type:'chair',canon:true});
            B(c.id+'_NIGHTSTAND',.55,.60,.55,x-1.3,9.65,-13.6,MAT.darkWood,'furnishings',
                {type:'nightstand',canon:true});
        } else {
            for(let h=0;h<4;h++) {
                const hx=x+(h%2?1.05:-1.05), hz=-16.7+Math.floor(h/2)*3.6;
                const hm=B(c.id+'_HAMMOCK_'+h,1.85,.13,.65,hx,10.30,hz,MAT.canvas,'furnishings',
                    {type:'hammock',canon:true}); hm.rotation.z=(h%2?.08:-.08);
                C(c.id+'_HAMMOCK_POST_'+h,.95,.09,hx-1.0,9.65,hz,MAT.wood,'furnishings',{});
            }
        }
        if(n===3) {
            for(let j=0;j<8;j++) {
                const m=j%3===0?MAT.iron:MAT.paleWood;
                B('MYLA_TOOLS_'+j,.25+.05*(j%3),.35,.30,x-1.8+(j%4)*1.0,9.55,-13.0-Math.floor(j/4),m,
                    'furnishings',{type:'tools',canon:true});
            }
        }
        gridRect('GRID_'+c.id,x-2.25,x+2.25,-17.75,-11.75,9.33);
        // Invisible metadata anchor for Codex, one per entrance.
        const port=B(c.id+'_PORTAL',1.60,.045,.48,x,9.36,-10.65,MAT.marker,'markers',
            {type:'portal',from:'A1',to:c.id,canon:true});
        port.isVisible=false;
    });
}



// ====================================================
// caminos.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: caminos.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearConexionA1A2(ctx) {
    const { pathRibbon, MAT, routes, stairFlight } = ctx;

    const lowToEast=[
        [15.4,9.25,-5.7],[23,9.85,-6.5],[28,12,-10],[32,15,-16],[37,15.2,-19.4]
    ];
    for(let i=0;i<lowToEast.length-1;i++) {
        pathRibbon('A1_TO_A2_PATH_'+i,lowToEast[i],lowToEast[i+1],3.0,MAT.path,'paths',
            {type:'walkable_slope',canon:true,route:'A1_A2'});
        routes.push({id:'A1_A2_'+i,from:lowToEast[i],to:lowToEast[i+1],mode:'walk'});
    }
    stairFlight('A1_A2_LOWER_STEPS',[23,9.85,-6.5],[28,12,-10],8,2.8);
    stairFlight('A1_A2_UPPER_STEPS',[28,12,-10],[32,15,-16],10,2.8);
}

function crearCaminoSuperior(ctx) {
    const { stairFlight, pathRibbon, MAT, routes, rock } = ctx;

    // Subida A2 +15 -> A3/A4 +18. Curva junto al extremo este del mapa.
    stairFlight('A2_TO_UPPER',[35,15.36,-23.5],[33,18.16,-28],9,2.85);
    pathRibbon('UPPER_EAST_WALK',[33,18.18,-28],[24,18.18,-27.1],3.25,MAT.path,'paths',
        {type:'walkable',canon:true,zone:'UPPER_PATH'});
    pathRibbon('UPPER_MAIN_WALK',[24,18.18,-27.1],[8,18.18,-27.1],3.2,MAT.path,'paths',
        {type:'walkable',canon:true,zone:'UPPER_PATH'});
    pathRibbon('UPPER_WEST_WALK',[8,18.18,-27.1],[-11,18.18,-27.2],3.15,MAT.path,'paths',
        {type:'walkable',canon:true,zone:'UPPER_PATH'});
    routes.push({id:'A2_UPPER',from:[35,15.36,-23.5],to:[33,18.16,-28],mode:'stairs'});
    routes.push({id:'UPPER_EAST_WEST',from:[33,18.18,-28],to:[-11,18.18,-27.2],mode:'walk'});
    // Cornisa rocosa visible bajo camino superior.
    for(let i=0;i<11;i++) rock('UPPER_LEDGE_'+i,-11+i*4.3,14.9,-26.2,2.1,2.3,1.0,MAT.rockL);
}

function crearAccesoTemplo(ctx) {
    const { stairFlight, pathRibbon, MAT } = ctx;

    const upperAsc=[[-11,18.22,-27.2],[-15,21,-30.7],[-20,24,-33.4]];
    stairFlight('UPPER_TO_24_A',upperAsc[0],upperAsc[1],9,2.9);
    stairFlight('UPPER_TO_24_B',upperAsc[1],upperAsc[2],10,2.9);
    pathRibbon('LEVEL_24_WEST',[-20,24.16,-33.4],[-31,24.16,-32.8],3.0,
        MAT.path,'paths',{type:'walkable',canon:true,elevation:24});
    stairFlight('LEVEL_24_TO_A5',[-31,24.16,-32.8],[-35,27.22,-32.1],10,3.0);
}



// ====================================================
// a2.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: a2.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearA2(ctx) {
    const { B, C, MAT, rail, gridRect } = ctx;

    B('A2_TERRACE',10,.34,8.2,37,15.16,-19.3,MAT.path,'paths',
        {type:'walkable',zone:'A2',canon:true});
    // Balcon del cabrestante mirando al mar (sur).
    rail('A2_RAIL',33,-15.2,41,-15.2,15.3);
    B('A2_HOUSE_FLOOR',5.9,.24,5.0,38.2,15.37,-21.1,MAT.wood,'interiors',
        {type:'building_floor',zone:'A2',canon:true});
    B('A2_WALL_N',5.9,2.6,.23,38.2,16.77,-23.6,MAT.wood,'interiors',{type:'wall'});
    B('A2_WALL_W',.23,2.6,5.0,35.25,16.77,-21.1,MAT.wood,'interiors',{type:'wall'});
    B('A2_WALL_E',.23,2.6,5.0,41.15,16.77,-21.1,MAT.wood,'interiors',{type:'wall'});
    // Sur: espacio abierto para puerta, por donde se ve el interior.
    B('A2_FACADE_W',2.2,2.6,.22,36.35,16.77,-18.6,MAT.wood,'interiors',{});
    B('A2_FACADE_E',2.2,2.6,.22,40.05,16.77,-18.6,MAT.wood,'interiors',{});
    B('A2_DOOR_FRAME',1.50,.40,.22,38.2,17.95,-18.6,MAT.darkWood,'interiors',{});
    // Dos vertientes reales, grupo separado para inspeccionar el interior.
    const roofA=B('A2_ROOF_W',6.3,.21,3.25,38.2,18.63,-20.13,MAT.darkWood,'houseRoof',
        {type:'roof',canon:true}); roofA.rotation.x=.28;
    const roofB=B('A2_ROOF_E',6.3,.21,3.25,38.2,18.63,-22.07,MAT.darkWood,'houseRoof',
        {type:'roof',canon:true}); roofB.rotation.x=-.28;
    // Mecanismo en madera y metal, palanca y tambor clicables.
    C('A2_WINCH_DRUM',1.8,1.15,38.0,16.22,-21.6,MAT.darkWood,'furnishings',
        {type:'winch',canon:true,interaction:'raise_pallet_3m'}).rotation.z=Math.PI/2;
    B('A2_WINCH_BRACKET_W',.22,1.55,1.7,36.95,16.14,-21.6,MAT.wood,'furnishings',{});
    B('A2_WINCH_BRACKET_E',.22,1.55,1.7,39.05,16.14,-21.6,MAT.wood,'furnishings',{});
    const lever=B('A2_RELEASE_LEVER',1.15,.12,.12,39.5,16.75,-20.3,MAT.iron,'furnishings',
        {type:'lever',canon:true,interaction:'drop_pallet'}); lever.rotation.z=-.40;
    // La plataforma esta SOBRE EL AGUA, junto a la pared sur de A2.
    // No se baja el edificio entero ni se falsea la altura canonica.
    const pallet=B('A2_PALLET',3.2,.24,2.5,43,.80,-17.0,MAT.wood,'furnishings',
        {type:'cargo_pallet',canon:true,interaction:'move_vertical',currentHeight:.8});
    for(let i=0;i<4;i++) {
        const x=41.8+(i%2)*2.4, z=-17.9+Math.floor(i/2)*1.8;
        C('A2_CHAIN_GUIDE_'+i,15.0,.075,x,7.95,z,MAT.iron,'ambient',
            {type:'chain_guide',canon:true});
    }
    const cargo=B('A2_PALLET_CARGO',1.2,.8,1.1,43,1.34,-17.0,MAT.paleWood,'furnishings',
        {type:'cargo',canon:false});
    cargo.parent=pallet; cargo.position.set(0,.54,0);
    gridRect('GRID_A2',33.5,41,-22.8,-16.8,15.42);
    // Soportes del balcon (no llenan el exterior con una caja gigante).
    for(let i=0;i<3;i++) C('A2_SUPPORT_'+i,14.8,.65,34+i*3.8,7.55,-16.2,MAT.rockL,'terrain',{});
    ctx.pallet = pallet; // Para controles.js.
}



// ====================================================
// a3.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: a3.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearA3(ctx) {
    const { B, C, MAT, pathRibbon, gridRect } = ctx;

    pathRibbon('A3_ENTRY_WALK',[24,18.18,-27.1],[24,18.25,-29.2],2.4,MAT.path,'paths',
        {type:'walkable',zone:'A3',canon:true});
    B('A3_DINING_FLOOR',13.2,.23,8.7,25,18.12,-33.1,MAT.floor,'interiors',
        {type:'room_floor',zone:'A3',canon:true});
    // Tres paredes y acceso frontal sin bloquear; techo recortable con T.
    B('A3_WALL_N',13.2,3.3,.29,25,19.81,-37.47,MAT.rock,'interiors',{});
    B('A3_WALL_W',.29,3.3,8.7,18.4,19.81,-33.1,MAT.rock,'interiors',{});
    B('A3_WALL_E',.29,3.3,8.7,31.6,19.81,-33.1,MAT.rock,'interiors',{});
    B('A3_ENTRY_L',4.4,3.3,.26,20.6,19.81,-28.74,MAT.rock,'interiors',{});
    B('A3_ENTRY_R',6.2,3.3,.26,28.5,19.81,-28.74,MAT.rock,'interiors',{});
    B('A3_ENTRY_LINTEL',2.0,.55,.30,24,21.2,-28.74,MAT.rockL,'interiors',{});
    B('A3_MAIN_TABLE',6.5,.68,1.5,25,18.62,-32.8,MAT.wood,'furnishings',
        {type:'dining_table',canon:true});
    B('A3_NORTH_BENCH',6.1,.42,.57,25,18.48,-34.0,MAT.darkWood,'furnishings',
        {type:'bench',canon:true});
    B('A3_SOUTH_BENCH',6.1,.42,.57,25,18.48,-31.55,MAT.darkWood,'furnishings',
        {type:'bench',canon:true});
    B('A3_HEAD_CHAIR',.76,1.1,.8,20.9,18.78,-32.8,MAT.wood,'furnishings',
        {type:'chair',canon:true});
    // Cocina al este, comunicada por pasillo CORTO y distinguible.
    pathRibbon('A3_SHORT_CORRIDOR',[31,18.22,-34.1],[33,18.22,-34.1],1.75,MAT.floor,'interiors',
        {type:'corridor',canon:true});
    B('A3_KITCHEN_FLOOR',5.3,.24,5,35.4,18.12,-34.1,MAT.floor,'interiors',
        {type:'kitchen',zone:'A3',canon:true});
    B('A3_KITCHEN_N',5.3,3.15,.27,35.4,19.76,-36.6,MAT.rock,'interiors',{});
    B('A3_KITCHEN_E',.27,3.15,5,38.05,19.76,-34.1,MAT.rock,'interiors',{});
    B('A3_COUNTER',3.2,.85,.85,35.2,18.69,-35.5,MAT.wood,'furnishings',{});
    C('A3_COOKING_POT',.45,.84,34.5,19.32,-35.5,MAT.iron,'furnishings',{});
    B('A3_STORAGE',.85,1.75,2.3,37.0,19.08,-33.2,MAT.darkWood,'furnishings',{});
    gridRect('GRID_A3',19,31,-36.85,-29.35,18.32);
    // Cubierta roca recortable para la lectura isometrica.
    B('A3_CAVE_ROOF',20.6,.7,10.7,28,22.53,-33.5,MAT.rockL,'upperRoof',
      {type:'ceiling',canon:false});
}



// ====================================================
// a4.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: a4.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearA4(ctx) {
    const { scene, B, C, MAT, pathRibbon, store, gridRect } = ctx;

    pathRibbon('A4_ENTRY_WALK',[8,18.18,-27.1],[8,18.2,-29.4],2.45,MAT.path,'paths',
        {type:'walkable',zone:'A4',canon:true});
    B('A4_LIBRARY_FLOOR',17.6,.24,12.6,5,18.12,-36.4,MAT.floor,'interiors',
      {type:'room_floor',zone:'A4',canon:true});
    B('A4_NORTH_WALL',17.6,3.6,.30,5,19.92,-42.7,MAT.rock,'interiors',{});
    B('A4_WEST_WALL',.3,3.6,12.6,-3.8,19.92,-36.4,MAT.rock,'interiors',{});
    B('A4_EAST_WALL',.3,3.6,12.6,13.8,19.92,-36.4,MAT.rock,'interiors',{});
    // Fachada sur con vano de 1.65m real, no puerta incrustada en un muro.
    B('A4_SOUTH_WALL_W',10.97,3.6,.30,1.69,19.92,-30.1,MAT.rock,'interiors',{});
    B('A4_SOUTH_WALL_E',4.95,3.6,.30,11.33,19.92,-30.1,MAT.rock,'interiors',{});
    B('A4_DOOR_LINTEL',1.68,1.18,.31,8.0,21.12,-30.1,MAT.rockL,'interiors',{});
    const doorPivot=new BABYLON.TransformNode('A4_DOOR_HINGE',scene);
    doorPivot.position.set(7.18,19.15,-29.93);
    const libDoor=BABYLON.MeshBuilder.CreateBox('A4_REINFORCED_DOOR',
      {width:1.64,height:2.2,depth:.14},scene);
    libDoor.position.set(.82,0,0); libDoor.parent=doorPivot; libDoor.material=MAT.darkWood;
    store(libDoor,'A4_REINFORCED_DOOR','interiors',
      {type:'door',canon:true,interaction:'open_close',reinforced:'oak_iron'});
    // Refuerzos de hierro sobre la cara exterior (hijos del giro de la puerta).
    for(let i=0;i<3;i++) {
        const strap=BABYLON.MeshBuilder.CreateBox('A4_DOOR_IRON_'+i,
            {width:1.55,height:.09,depth:.048},scene);
        strap.parent=doorPivot; strap.position.set(.82,-.73+i*.73,.104); strap.material=MAT.iron;
        store(strap,'A4_DOOR_IRON_'+i,'interiors',{type:'iron_strap',canon:true});
    }
    function bookshelf(id,x,z,width,depth,orientation,free) {
        const m=B(id+'_FRAME',width,2.45,depth,x,19.48,z,MAT.darkWood,'furnishings',
            {type:'bookshelf',canon:true,freestanding:!!free});
        m.rotation.y=orientation;
        for(let row=0;row<3;row++) {
            const s=B(id+'_SHELF_'+row,width,.10,depth+.13,x,18.62+row*.78,z,
                MAT.paleWood,'furnishings',{}); s.rotation.y=orientation;
        }
        for(let j=0;j<8;j++) {
            const ox=-width/2+.3+j*(width-.6)/7;
            const p=B(id+'_BOOK_'+j,.18,.41,.21,x+ox,18.91+(j%3)*.78,z,
                j%2?MAT.books:MAT.books2,'furnishings',{});
            if(orientation) {
                p.position.x=x; p.position.z=z+ox;
            }
        }
    }
    // Bibliotecas en las paredes; tres estantes independientes al oeste.
    bookshelf('A4_NORTH_SHELF_1',1,-41.7,5.2,.52,0,false);
    bookshelf('A4_NORTH_SHELF_2',8,-41.7,5.2,.52,0,false);
    bookshelf('A4_EAST_SHELF',12.7,-36.9,4.6,.55,Math.PI/2,false);
    bookshelf('A4_FREE_SHELF_1',-1.3,-33.1,4.0,.6,Math.PI/2,true);
    bookshelf('A4_FREE_SHELF_2',.6,-36.0,4.0,.6,Math.PI/2,true);
    bookshelf('A4_FREE_SHELF_3',-1.3,-39.1,4.0,.6,Math.PI/2,true);
    B('A4_STUDY_TABLE',4.3,.72,1.5,9,18.62,-35.8,MAT.wood,'furnishings',
      {type:'study_table',canon:true});
    B('A4_BENCH_N',4.05,.42,.51,9,18.47,-37.25,MAT.darkWood,'furnishings',
      {type:'bench',canon:true});
    B('A4_BENCH_S',4.05,.42,.51,9,18.47,-34.40,MAT.darkWood,'furnishings',
      {type:'bench',canon:true});
    for(let i=0;i<2;i++) {
        B('A4_LECTERN_'+i,.72,1,.63,7.2+i*2.6,18.77,-39.4,MAT.wood,'furnishings',
            {type:'lectern',canon:true});
        C('A4_CRYSTAL_LAMP_'+i,.40,.3,8+i*2.3,19.29,-35.8,MAT.metal,'furnishings',
            {type:'crystal_lamp',canon:true});
    }
    gridRect('GRID_A4',-3.25,12.75,-42.10,-30.85,18.35);
    B('A4_CAVE_ROOF',18.0,.70,12.9,5,22.62,-36.4,MAT.rockL,'upperRoof',
        {type:'ceiling',canon:false});
    ctx.doorPivot = doorPivot; // Para controles.js.
}



// ====================================================
// a5.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: a5.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearA5(ctx) {
    const { B, C, S, MAT, gridRect } = ctx;

    // No colocar el templo sobre una montana central. Sobresale hacia el mar.
    B('A5_TEMPLE_FLOOR',16.6,.42,11.2,-41,27.25,-30.0,MAT.statue,'paths',
        {type:'walkable',zone:'A5',canon:true});
    // Muro norte en la propia roca y tres lados abiertos.
    B('A5_NORTH_ROCK_WALL',16.5,4.75,.48,-41,29.65,-35.6,MAT.rock,'interiors',
        {type:'temple_north_wall',canon:true});
    const columns=[[-48,-34],[-48,-30],[-48,-26],[-43,-24.8],[-39,-24.8],[-35,-24.8],[-33.5,-26],[-33.5,-30],[-33.5,-34]];
    columns.forEach((p,i)=>{
        C('A5_COLUMN_'+i,4.45,.68,p[0],29.68,p[1],MAT.statue,'furnishings',
          {type:'column',canon:true});
        C('A5_COL_BASE_'+i,.26,.95,p[0],27.54,p[1],MAT.rockL,'furnishings',{});
        C('A5_COL_CAP_'+i,.28,.95,p[0],31.90,p[1],MAT.rockL,'furnishings',{});
    });
    // Tres paños del tejado visibles por defecto. Tecla Y para retirarlos.
    [-45.5,-41,-36.5].forEach((x,i)=>{
        B('A5_ROOF_SECTION_'+i,5.0,.30,11.6,x,32.06,-30.1,MAT.darkWood,'templeRoof',
          {type:'temple_roof',canon:true});
    });
    // Arcos/puntales bajo el voladizo.
    for(let i=0;i<5;i++) {
        const x=-47+i*3.1;
        C('A5_STONE_SUPPORT_'+i,8,.6,x,23.25,-33.7,MAT.rockL,'terrain',
          {type:'support',canon:true});
        const brace=B('A5_DIAGONAL_BRACE_'+i,.48,5.8,.48,x+.62,24.5,-31.6,
            MAT.rockL,'terrain',{type:'stone_brace',canon:true}); brace.rotation.z=.43;
    }
    // Estatua: anciano, siete canarios; cuatro huecos de incienso.
    B('A5_BAHAMUT_PLINTH',2.6,.62,2.6,-41,27.78,-30.1,MAT.statue,'furnishings',
      {type:'statue',canon:true,represents:'Bahamut',check:'Religion DC 10'});
    C('A5_BAHAMUT_BODY',2.25,.95,-41,29.23,-30.1,MAT.statue,'furnishings',{});
    S('A5_BAHAMUT_HEAD',.76,-41,30.76,-30.1,MAT.statue,'furnishings',{});
    const armL=B('A5_ARM_L',1.3,.28,.28,-41.8,29.95,-30.1,MAT.statue,'furnishings',{}); armL.rotation.z=-.27;
    const armR=B('A5_ARM_R',1.3,.28,.28,-40.2,29.95,-30.1,MAT.statue,'furnishings',{}); armR.rotation.z=.27;
    const birds=[[-41,31.30],[-41.4,31.00],[-40.6,31.00],[-42,30.28],[-40,30.28],[-42.45,29.75],[-39.55,29.75]];
    birds.forEach((p,i)=>{
        S('A5_CANARY_'+(i+1),.19,p[0],p[1],-30.1,MAT.gold,'furnishings',
          {type:'canary',canon:true});
    });
    [[-41,-31.8],[-41,-28.3],[-42.7,-30.1],[-39.3,-30.1]].forEach((p,i)=>{
        B('A5_INCENSE_'+i,.45,.13,.45,p[0],28.13,p[1],MAT.darkWood,'furnishings',
          {type:'incense_slot',canon:true});
    });
    const aura=C('A5_PROTECTIVE_AURA',.045,10.3,-41,27.50,-30.1,MAT.aura,'ambient',
      {type:'visual_aura',canon:true,effect:'DM: criaturas no malvadas +1d4 a salvacion en el templo'});
    aura.isPickable=false;
    gridRect('GRID_A5',-48.5,-34.0,-35.0,-25.0,27.50);
}



// ====================================================
// ambiente.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: ambiente.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function crearAmbiente(ctx) {
    const { B, C, S, MAT } = ctx;

    function tree(id,x,y,z,scale) {
        C(id+'_TRUNK',2.0*scale,.28*scale,x,y+1.0*scale,z,MAT.darkWood,'ambient',{});
        S(id+'_LEAF',1.8*scale,x,y+2.5*scale,z,MAT.leaves,'ambient',{});
        S(id+'_LEAF_2',1.2*scale,x+.35*scale,y+2.9*scale,z-.22*scale,MAT.leavesL,'ambient',{});
    }
    [[-36,9.0,-18.7,.75],[11,9.0,-16.0,.8],[25,18.0,-42.3,.95],[-13,18.1,-46,.72],[-26,24,-39,.7]].forEach((p,i)=>tree('TREE_'+i,...p));
    for(let i=0;i<12;i++) {
        const x=-30+i*6.0;
        if(x>-5&&x<11)continue;
        const plant=S('CLIFF_BUSH_'+i,.7,x,9.1,-2.0-.45*Math.sin(i),MAT.leaves,'ambient',{});
        plant.scaling.set(1.2,.5,.78);
    }
    // Lamparas suaves en las circulaciones. Sin crear botones para el DM.
    [[-31,9.2,-4.2],[12,9.2,-4.0],[35,15.2,-17.0],[18,18.2,-26.0],[-8,18.2,-25.3],[-28,24.2,-30.0]].forEach((p,i)=>{
        C('LAMP_POST_'+i,1.05,.14,p[0],p[1]+.55,p[2],MAT.rockL,'ambient',{});
        S('LAMP_GLOW_'+i,.23,p[0],p[1]+1.13,p[2],MAT.gold,'ambient',{});
    });
    for(let i=0;i<4;i++){
        const x=-42+i*24;
        B('FLOATING_DRIFTWOOD_'+i,1.8,.14,.3,x,.05,31+(i%2)*6,MAT.darkWood,'ambient',{});
    }
}



// ====================================================
// costa_ampliada.js
// ====================================================
// V3 · COSTA AMPLIADA. Solo el mapa A1-A5 es canon en su geometria.
// El resto extiende el panorama SIN inventar ubicaciones de aventuras.
function crearCostaAmpliada(ctx) {
    const {scene, B, C, S, MAT, store, rock, registry, group} = ctx;
    // La V2 conserva sus coordenadas. Solo se extiende el terreno fuera de sus limites.
    // Mas costa a oeste y este: playas rocosas SIN accesos adicionales al monasterio.
    B('SCENERY_WEST_SHORE',27,.38,13,-69,.20,14.1,MAT.pathEdge,'landscapeExtra',
      {type:'scenery',canon:false,walkable:false});
    B('SCENERY_EAST_SHORE',29,.42,11.5,66,.17,9.0,MAT.rockD,'landscapeExtra',
      {type:'scenery',canon:false,walkable:false});
    B('SCENERY_WEST_CLIFF',24,8.9,21,-67,4.42,-3.2,MAT.rock,'landscapeExtra',
      {type:'scenery_cliff',canon:false,walkable:false});
    B('SCENERY_EAST_CLIFF',32,11,19,73,5.3,-3,MAT.rock,'landscapeExtra',
      {type:'scenery_cliff',canon:false,walkable:false});
    // Amplia la sensacion de profundidad interior del acantilado (tras A3/A4).
    B('SCENERY_NORTH_RIDGE',145,11.2,12,2,29.8,-70.3,MAT.rockD,'landscapeExtra',
      {type:'scenery_cliff',canon:false,walkable:false});
    for(let i=0;i<15;i++) {
        const x=-85+i*12;
        rock('WIDE_COAST_ROCK_'+i,x,.22,17.0+Math.sin(i*.85)*4.1,
            1.2+(i%4)*.3,.65+(i%3)*.2,1.0+(i%2)*.4, i%2?MAT.rockL:MAT.rockD);
        // Reclasifica las rocas nuevas para que la tecla E oculte la extension.
        const m=registry['WIDE_COAST_ROCK_'+i];
        const arr=group.terrain; const at=arr.indexOf(m);
        if(at>=0)arr.splice(at,1);
        group.landscapeExtra.push(m); m.metadata.category='landscapeExtra';
    }
    for(let i=0;i<22;i++) {
        const x=-82+i*7.8;
        const z=-63.5-(i%3)*.55;
        const h=2.4+(i*3%6)*.45;
        const rockCol=C('BASALT_COLUMN_'+i,h,1.2+(i%4)*.13,x,22.3+h/2,z,
            i%3?MAT.rock:MAT.rockL,'landscapeExtra',
            {type:'basalt_column',canon:false,walkable:false});
        rockCol.rotation.y=i*.08;
    }
    // Ecosistema del puerto: rocas semisumergidas, algas y espuma (ambiental).
    for(let i=0;i<18;i++) {
        const x=-81+i*9.0;
        const z=27+(i%4)*5.7;
        const r=S('SEA_REEF_'+i,1.4+(i%3)*.35,x,.18,z,MAT.rockD,'landscapeExtra',
            {type:'reef',canon:false,walkable:false});
        r.scaling.set(1.5,.75,.9); r.rotation.y=i*.47;
        B('SEA_REEF_FOAM_'+i,2.1,.025,.10,x,.11,z+1.0,MAT.foam2,'landscapeExtra',
            {type:'sea_foam',canon:false});
    }
    // La embarcacion de llegada echa el ancla en la bocana del puerto.
    // No es otro edificio ni un espacio canon del mapa 2; es escenografia interactuable futura.
    const ship=B('ARRIVAL_SHIP_HULL',17,2.8,5.2,-55,1.18,62,MAT.darkWood,'landscapeExtra',
      {type:'arrival_ship',canon:true,sceneAsset:true,walkable:false});
    B('ARRIVAL_SHIP_DECK',15.6,.20,4.6,-55,2.77,62,MAT.wood,'landscapeExtra',
      {type:'arrival_ship_deck',canon:false,walkable:false});
    for(let i=0;i<5;i++) {
        B('ARRIVAL_SHIP_RIB_'+i,.18,1.35,5.2,-61+i*3,2.06,62,MAT.wood,'landscapeExtra',
          {canon:false,walkable:false});
    }
    // Proa/popa estrechadas con volumenes simples.
    const bow=B('ARRIVAL_SHIP_BOW',3.5,2.5,4,-63.5,1.35,62,MAT.darkWood,'landscapeExtra',
      {canon:false,walkable:false}); bow.rotation.y=.20;
    const stern=B('ARRIVAL_SHIP_STERN',2.9,2.8,4.0,-46.9,1.45,62,MAT.darkWood,'landscapeExtra',
      {canon:false,walkable:false}); stern.rotation.y=-.20;
    C('ARRIVAL_SHIP_MAST',12,.43,-55,8.7,62,MAT.wood,'landscapeExtra',
      {type:'mast',canon:false,walkable:false});
    const sail=B('ARRIVAL_SHIP_SAIL',.09,6.8,7,-55,9.2,62,MAT.canvas,'landscapeExtra',
      {type:'furled_sail_approximation',canon:false,walkable:false});
    // Los marineros han terminado el trayecto en su bote: NO se automatiza su regreso.
    const anchored=C('ANCHORAGE_MARKER',.03,1.5,-55,.10,62,MAT.marker,'storyMarkers',
      {type:'anchor',canon:true,interaction:'approach_from_ship'});
    anchored.isVisible=false;
    // Fondo del mar con pequenas sombras de rocas. No se navega fuera de la zona oficial.
    for(let i=0;i<9;i++) {
        const x=-78+i*18.5;
        const p=S('OFFSHORE_RIPPLE_'+i,1.0,x,.03,50+(i%3)*10,MAT.foam2,'landscapeExtra',
          {type:'foam_patch',canon:false});
        p.scaling.set(2.2,.05,.4);
    }
}


// ====================================================
// detalles.js
// ====================================================
// V3 · MAYOR RIQUEZA EN LAS CINCO ZONAS EXISTENTES.
// Canon para mobiliario descrito por la aventura; VTT_AMBIENCE para acabados.
function crearDetalles(ctx) {
    const {B,C,S,MAT,gridRect,strip,registry} = ctx;
    // Playa: cuadrícula de combate para los tres marineros ahogados (1,5 m).
    gridRect('GRID_BEACH_COMBAT',-54.0,-18.0,10.5,18.0,.355);

    // Muelle: aparejos de pesca en tierra, visibles sin forzar el evento futuro.
    for(let i=0;i<3;i++) {
        C('SHORE_NET_POLE_'+i,1.65,.09,-33+i*1.2,1.1,16.1,MAT.wood,'detailExtra',
          {type:'fishing_gear',canon:false});
    }
    B('SHORE_FISHING_NET',3,.02,1.7,-31.7,.47,17.8,MAT.rope,'detailExtra',
      {type:'fishing_net',canon:false});
    C('SHORE_FISHING_CRATE',.9,1.1,-29.5,.75,17,MAT.darkWood,'detailExtra',
      {type:'fishing_cargo',canon:false});

    // A1: piedra tallada alrededor de las seis entradas; NO son puertas.
    const cells=[
      ['GUEST',-29.2],['TARAK',-23.5],['VARNOTH',-17.8],
      ['MYLA',-12.1],['KOBOLDS_W',-6.4],['KOBOLDS_E',-.7]
    ];
    for(const [name,x] of cells) {
        C('CELL_'+name+'_ARCH_W',2.4,.25,x-.94,10.50,-11.01,MAT.rockL,'detailExtra',
          {type:'carved_stone_entry',canon:false});
        C('CELL_'+name+'_ARCH_E',2.4,.25,x+.94,10.50,-11.01,MAT.rockL,'detailExtra',
          {type:'carved_stone_entry',canon:false});
        B('CELL_'+name+'_ARCH_TOP',2.10,.29,.28,x,12.18,-11.0,MAT.rockL,'detailExtra',
          {type:'carved_stone_entry',canon:false});
    }
    // A1 vivienda libre, Tarak, Varnoth, Myla: objetos unicos no inventan misiones.
    B('A1_GUEST_BLANKET',1.12,.035,1.55,-30.58,9.74,-16.20,MAT.canvas,'detailExtra',
      {type:'sleeping_bedding',canon:false});
    for(let i=0;i<3;i++) {
        C('A1_TARAK_HERB_JAR_'+i,.43,.32,-24.6+i*.36,10.10,-16.8,MAT.canvasDark,'detailExtra',
          {type:'herbalism',canon:false});
    }
    B('A1_VARNOTH_MASON_TOOLS',.9,.16,.42,-17.9,9.42,-12.4,MAT.iron,'detailExtra',
      {type:'mason_tools',canon:true});
    for(let i=0;i<4;i++) {
        C('A1_MYLA_VIAL_'+i,.28,.12,-13.5+i*.36,10.2,-16.5,MAT.gold,'detailExtra',
          {type:'alchemy_vial',canon:false});
    }
    // En los jardines, los caminos entre bancales quedan despejados.
    for(let i=0;i<4;i++) {
        const x=-38+i*6.5, y=5.95+i*.85;
        for(let j=0;j<4;j++) {
            const stalk=C('GARDEN_HERB_'+i+'_'+j,.32,.05,x-.96+j*.61,y+.28,-.5,
                MAT.leavesL,'detailExtra',{type:'herbs',canon:false});
            S('GARDEN_BLOOM_'+i+'_'+j,.12,stalk.position.x,y+.48,-.5,
                (i+j)%2?MAT.flower:MAT.flower2,'detailExtra',{type:'plant',canon:false});
        }
    }
    // A1: dos bancos bajos y canaleta de desague, ninguno bloquea la plaza.
    B('A1_REST_BENCH_1',2.1,.42,.56,11.5,9.47,-4.4,MAT.wood,'detailExtra',
      {type:'bench',canon:false});
    B('A1_REST_BENCH_2',2.1,.42,.56,-32.5,9.47,-4.4,MAT.wood,'detailExtra',
      {type:'bench',canon:false});

    // A2: mecanismo de poleas / carga en el palé. Acceso y palanca de V2 conservados.
    C('A2_WINCH_GEAR_W',.20,.92,36.9,16.22,-21.6,MAT.iron,'detailExtra',
      {type:'winch_gear',canon:false}).rotation.z=Math.PI/2;
    C('A2_WINCH_GEAR_E',.20,.92,39.1,16.22,-21.6,MAT.iron,'detailExtra',
      {type:'winch_gear',canon:false}).rotation.z=Math.PI/2;
    for(let i=0;i<3;i++) {
        B('A2_CARGO_SACK_'+i,.9,.5,.68,36.1+i*.85,15.64,-17.4,MAT.canvas,'detailExtra',
          {type:'supply_sack',canon:false});
    }

    // A3: cocina ordenada y comedor usado diariamente.
    for(let i=0;i<7;i++) {
        C('A3_DINING_BOWL_'+i,.09,.24,22.1+i*.84,19.01,-32.8,MAT.paleWood,'detailExtra',
          {type:'tableware',canon:false});
    }
    B('A3_KITCHEN_HEARTH',1.35,.7,.90,33.75,18.56,-35.35,MAT.rockD,'detailExtra',
      {type:'hearth',canon:false});
    for(let i=0;i<4;i++) {
        B('A3_KITCHEN_STORAGE_'+i,.43,.45,.4,36.1+i*.42,19.35,-35.43,MAT.canvasDark,'detailExtra',
          {type:'kitchen_storage',canon:false});
    }

    // A4: biblioteca especializada y habitada, sin tesoros inventados.
    for(let i=0;i<4;i++) {
        C('A4_SCROLL_ROLL_'+i,.56,.11,8.5+i*.48,18.69,-37.2,MAT.canvas,'detailExtra',
          {type:'scroll_prop',canon:false}).rotation.z=Math.PI/2;
    }
    B('A4_INK_TRAY',.6,.15,.40,10.4,18.78,-37.1,MAT.iron,'detailExtra',
      {type:'writing_tools',canon:true});
    B('A4_BOOK_PILE_1',.74,.37,.54,5.4,18.87,-37.0,MAT.books,'detailExtra',
      {type:'books',canon:true});
    B('A4_BOOK_PILE_2',.58,.28,.48,6.2,18.78,-37.6,MAT.books2,'detailExtra',
      {type:'books',canon:true});

    // A5: reforzar las tres secciones de cubierta, columnas y puntales CANON.
    for(let i=0;i<3;i++) {
        const x=-45.5+i*4.5;
        B('A5_ROOF_RAFTER_'+i,5,.22,.26,x,31.85,-29.9,MAT.wood,'templeRoof',
          {type:'roof_beam',canon:false});
    }
    for(let i=0;i<4;i++) {
        const x=-43+(i%2)*4.0, z=-31.9+Math.floor(i/2)*3.5;
        for(let j=0;j<3;j++) {
            const puff=S('A5_INCENSE_SMOKE_'+i+'_'+j,.16+(j*.10),x,28.0+j*.27,z,
                MAT.foam2,'detailExtra',{type:'incense_smoke',canon:false});
            puff.scaling.set(.75,1.25,.75); puff.isPickable=false;
        }
    }
}


// ====================================================
// habitantes.js
// ====================================================
// V3 · HABITANTES CANON, SOLO PUNTOS DE APARICION INVISIBLES POR DEFECTO.
// NO se muestran personajes disenados; Codex sustituira estos anchors por sprites.
function crearHabitantes(ctx) {
    const {C, S, MAT, group, registry} = ctx;
    const occupants = [
        // NPC principal, posicion orientativa de escena, no presencia permanente canon.
        ['RUNARA',-38.2,27.40,-29.3,'A5','Runara la Anciana'],
        ['TARAK',-23.5,9.28,-13.1,'A1','Tarak'],
        ['VARNOTH',-17.8,9.28,-13.1,'A1','Varnoth'],
        ['MYLA',-12.1,9.28,-13.1,'A1','Myla'],
        ['AGGA',-2.7,9.28,-13.3,'A1','Agga'],
        ['BLEPP',-5.6,9.28,-14.1,'A1','Blepp'],
        ['FRUB',-.1,9.28,-13.1,'A1','Frub'],
        ['KILNIP',-7.1,9.28,-15.1,'A1','Kilnip'],
        ['LAYLEE',-1.4,9.28,-15.0,'A1','Laylee'],
        ['MUMPO',-4.1,9.28,-16.0,'A1','Mumpo'],
        ['RIX',-36.8,27.40,-32.1,'A5','Rix'],
        ['ZARK',-1.4,9.28,-17.2,'A1','Zark']
    ];
    for(const p of occupants) {
        const marker=C('NPC_'+p[0]+'_SPAWN',.09,.8,p[1],p[2],p[3],MAT.npc,'npcs',
          {type:'npc_spawn',canon:true,npcId:p[0],displayName:p[5],zone:p[4],
           staticLocation:false,dmPlacementRequired:true});
        marker.isVisible=false;
    }
    // Llegada de Runara desde la parte alta: referencia DM, nunca posicion automatica.
    const arrival=C('NPC_RUNARA_WELCOME_ANCHOR',.04,1.0,-9,9.34,-5.6,MAT.marker,'storyMarkers',
      {type:'scene_anchor',canon:true,npcId:'RUNARA',eventId:'KOBOLD_WELCOME'});
    arrival.isVisible=false;
    // Reaparicion opcional de zombis si los PJ evitaron el encuentro inicial.
    const chase=C('NPC_BLEPP_TARAK_CHASE_ANCHOR',.04,1.2,-35,3.7,1.7,MAT.danger,'storyMarkers',
      {type:'scene_anchor',canon:true,eventId:'ZOMBIE_RETURN',dmOnly:true});
    chase.isVisible=false;
    ctx.npcRegistry=occupants.map(p=>({id:p[0],name:p[5],zone:p[4],spawn:'NPC_'+p[0]+'_SPAWN'}));
}


// ====================================================
// controles.js
// ====================================================
// RETIRO DEL DRAGON V2 · MODULAR
// Archivo: controles.js
// Geometria V2 original conservada; coordenadas e IDs estables para Codex.

function activarControles(ctx) {
    const { scene, B, C, S, MAT, group, label, CELL, ZONE, LEVEL, routes, camera, pallet, doorPivot } = ctx;

    const human=C('SCALE_HUMAN_1_8M',1.8,.48,-46,1.25,16,MAT.player,'player',
        {type:'scale_reference',canon:false,height_m:1.8});
    S('SCALE_HEAD',.47,-46,2.30,16,MAT.player,'player',{type:'scale_reference'});
    const a1Human=C('SCALE_HUMAN_A1',1.8,.48,-22,10.15,-5.5,MAT.player,'player',
        {type:'scale_reference',height_m:1.8});
    S('SCALE_HEAD_A1',.47,-22,11.28,-5.5,MAT.player,'player',{});
    group.player.forEach(m=>m.isVisible=false);

    // Etiquetas no son assets del juego: tecla L las activa durante la auditoria.
    label('LABEL_BEACH','LLEGADA / MUELLE',-43,4.8,15);
    label('LABEL_A1','A1 · CELDAS · +9 m',-11,14,-3);
    label('LABEL_A2','A2 · CABRESTANTE · +15 m',38,22,-19);
    label('LABEL_A3','A3 · COCINA · +18 m',26,24,-32);
    label('LABEL_A4','A4 · BIBLIOTECA · +18 m',4,25,-36);
    label('LABEL_LINK','CAMINO · +24 m',-26,28,-31);
    label('LABEL_A5','A5 · BAHAMUT · +27 m',-41,36,-29);
    group.labels.forEach(m=>m.isVisible=false);

    // Triggers opcionales, invisibles hasta tecla D.
    [["TRIGGER_BEACH_A1",-44,.45,9,'BEACH','A1'],
     ["TRIGGER_A1_A2",20,9.4,-6,'A1','A2'],
     ["TRIGGER_A2_A34",35,15.35,-23,'A2','A3_A4'],
     ["TRIGGER_A34_A5",-13,18.35,-28,'A3_A4','A5'],
     ["TRIGGER_TEMPLE",-35,27.5,-32,'LINK','A5']].forEach(t=>{
        const m=B(t[0],1.5,.045,1.5,t[1],t[2],t[3],MAT.marker,'markers',
            {type:'transition_hint',from:t[4],to:t[5],canon:false});
        m.isVisible=false;
    });

    // =====================================================================
    // INTERACCIONES DE DEMOSTRACION. NO HAY TIRADAS AUTOMATICAS.
    // =====================================================================
    let doorOpen=false;
    let palletY=pallet.position.y;
    let reliefDetailOn=true;
    let gridOn=false,ambientOn=true,labelsOn=false,markersOn=false,zombiesOn=false,
        playersOn=false,roofsOn=false,houseRoofOn=true,templeRoofOn=true,
        extraCoastOn=true,extraDetailOn=true,npcMarkersOn=false,storyMarkersOn=false;
    // Los techos de cuevas comienzan ocultos para una planta legible; el del
    // templo se mantiene visible y se puede retirar con Y.
    group.upperRoof.forEach(m=>m.isVisible=false);
    group.grid.forEach(m=>m.isVisible=false);

    function movePallet(to) {
        palletY=Math.min(15.6,Math.max(.8,to));
        BABYLON.Animation.CreateAndStartAnimation('PALLET_LIFT',pallet,'position.y',60,50,
            pallet.position.y,palletY,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        console.log('A2, altura aproximada del palé: '+palletY.toFixed(1)+' m. Accion confirmada por DM.');
    }
    scene.onPointerObservable.add(function(p) {
        if(p.type!==BABYLON.PointerEventTypes.POINTERPICK)return;
        const picked=p.pickInfo&&p.pickInfo.pickedMesh;
        if(!picked||!picked.metadata)return;
        const id=picked.metadata.id;
        if(id==='A4_REINFORCED_DOOR'||id.indexOf('A4_DOOR_IRON_')===0) {
            BABYLON.Animation.CreateAndStartAnimation('LIBRARY_DOOR',doorPivot,'rotation.y',60,18,
                doorPivot.rotation.y,doorOpen?0:-Math.PI/2,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            doorOpen=!doorOpen;
        }
        if(id==='A2_RELEASE_LEVER')movePallet(.8);
        if(id==='A2_WINCH_DRUM')movePallet(palletY+3);
        if(id==='CLAUSTRO_BOAT_HULL')console.log('Bote del claustro: disponible para dirigirse al pecio.');
    });

    function visible(which,yes) { group[which].forEach(m=>m.isVisible=yes); }
    function focus(x,y,z,r,a,b) {
        camera.setTarget(new BABYLON.Vector3(x,y,z));
        camera.radius=r; camera.alpha=a||1.48; camera.beta=b||.99;
    }
    scene.onKeyboardObservable.add(function(kb) {
        if(kb.type!==BABYLON.KeyboardEventTypes.KEYDOWN)return;
        const key=kb.event.key.toLowerCase();
        switch(key) {
            case '0': focus(-4,14,-7,184,1.48,.96);break;
            case '1': focus(-43,1,16,41,1.48,.91);break;
            case '2': focus(-11,10,-6,62,1.44,.89);break;
            case '3': focus(37,16,-19,38,1.45,.93);break;
            case '4': focus(15,19,-31,67,1.47,.83);break;
            case '5': focus(-41,28,-30,45,1.45,.88);break;
            case '6': focus(-1,12,-12,146,1.57,.26);break;
            case '7': focus(-55,3,62,40,1.45,1.00);break;
            case '8': focus(-17,10,-13,44,1.48,.77);break;
            case '9': focus(-8,15,-23,148,1.48,.68);break;
            case 'g': gridOn=!gridOn; ctx.navigation.setGridVisible(gridOn);break;
            case 'a': ambientOn=!ambientOn;visible('ambient',ambientOn);break;
            case 'r': reliefDetailOn=!reliefDetailOn;visible('reliefDetail',reliefDetailOn);break;
            case 'l': labelsOn=!labelsOn;visible('labels',labelsOn);break;
            case 'd': markersOn=!markersOn;visible('markers',markersOn);break;
            case 'z': zombiesOn=!zombiesOn;visible('spawns',zombiesOn);break;
            case 'p': playersOn=!playersOn;visible('player',playersOn);break;
            case 't': roofsOn=!roofsOn;visible('upperRoof',roofsOn);break;
            case 'h': houseRoofOn=!houseRoofOn;visible('houseRoof',houseRoofOn);break;
            case 'y': templeRoofOn=!templeRoofOn;visible('templeRoof',templeRoofOn);break;
            case 'e': extraCoastOn=!extraCoastOn;visible('landscapeExtra',extraCoastOn);break;
            case 'k': extraDetailOn=!extraDetailOn;visible('detailExtra',extraDetailOn);break;
            case 'n': npcMarkersOn=!npcMarkersOn;visible('npcs',npcMarkersOn);break;
            case 'm': storyMarkersOn=!storyMarkersOn;visible('storyMarkers',storyMarkersOn);break;
        }
    });

    // Metadata legible por Codex al portar este modulo al VTT.
    scene.metadata={
        map:'RETIRO_DEL_DRAGON',version:'V2',gridMeters:CELL,
        coordinateConvention:'X oeste(-)/este(+), Z norte(-)/sur_mar(+), Y altura en metros',
        zones:ZONE,levelHeight:LEVEL,routes:routes,
        access:{
            A1:['BEACH','A2','A1_GUEST','A1_TARAK','A1_VARNOTH','A1_MYLA','A1_KOBOLDS_W','A1_KOBOLDS_E'],
            A2:['A1','A3_A4','SEA_VIA_PALET'],
            A3:['A2','A4','A5'],A4:['A2','A3','A5'],A5:['A3_A4']
        },
        canonNotes:[
            'Llegada a muelle desvencijado en bote',
            '3 zombis pueden aparecer en la orilla: decision de los jugadores',
            'Seis celdas monasticas en pared del acantilado',
            'Cabrestante: liberacion del pale y elevacion de 3m por accion',
            'Unica puerta reforzada de la biblioteca',
            'Templo abierto con estatua del anciano Bahamut y 7 canarios'
        ],
        geometryStatus:'PROTOTYPE: revisar contra el mapa 2 antes de integrar en Codex'
    };
    console.log('RETIRO DEL DRAGON - V2 ESTRUCTURAL / 2 recorridos longitudinales');
    console.log('0 general, 1 playa, 2 A1, 3 A2, 4 A3/A4, 5 A5, 6 cenital');
    console.log('G grid · A ambiente · L etiquetas · D triggers · Z zombis · P escala humana');
    console.log('T techos de cuevas · H techo de A2 · Y techo del templo');
    console.log('Click en puerta A4 / palanca o tambor A2 para prototipo de interaccion');
    // Los anclajes DM y PNJ comienzan invisibles, incluso tras editar el mapa.
    visible('npcs',false);visible('storyMarkers',false);
    console.log('V3: 7 navio fondeado, 8 vista de celdas; E costa ampliada, K detalles, N PNJ, M anclajes DM');
    console.log('REGISTRY disponible dentro de createScene: ids estables en mesh.metadata.id.');
}



// ====================================================
// eventos_dm.js
// ====================================================
// V3 · CONTENIDO DM. Capitulo 1, pp. 6-15 de la aventura.
// Los metadatos de guion NO se deben enviar a los clientes jugadores.
// No automatizar tiradas ni resultados; lo resuelve el DM con dados fisicos.
function instalarEventosDM(ctx) {
    const {scene, registry, ZONE, LEVEL, CELL, routes, npcRegistry} = ctx;
    const events = [
        {
            id:'ARRIVAL',canon:true,source:'capitulo 1 p.6',zone:'BEACH',
            trigger:'DM: los personajes desembarcan',
            actors:['2 marineros','PJ'],
            action:'Llegan en bote a un muelle desvencijado. El bote grande del claustro queda amarrado.',
            state:'IDLE -> LANDING -> EXPLORE',dmConfirm:true
        },
        {
            id:'ZOMBIES_BEACH',canon:true,source:'capitulo 1 p.7',zone:'BEACH',
            trigger:'DM: los PJ van a salir de la playa',actors:['3 zombis marineros'],
            action:'Los zombis aparecen a unos 9 m; pueden luchar o huir por el sendero.',
            state:'WAIT -> REVEAL -> PLAYER_CHOICE -> COMBAT_OR_ESCAPE',dmConfirm:true,
            branches:['fight','escape'],autoCombat:false
        },
        {
            id:'KOBOLD_WELCOME',canon:true,source:'capitulo 1 pp.7-8',zone:'A1',
            trigger:'DM: primera llegada a la plaza',actors:['kobolds','Runara'],
            action:'Kobolds curiosos saludan a los PJ. Runara desciende de la zona alta y ofrece hospitalidad.',
            state:'IDLE -> QUESTIONS -> RUNARA_WELCOME -> FREE_EXPLORATION',dmConfirm:true
        },
        {
            id:'ZOMBIE_RETURN',canon:true,source:'capitulo 1 p.12',zone:'BEACH_TO_A1',
            condition:'Solo si los PJ evitaron a los zombis en la playa.',
            trigger:'DM: durante la estancia en el claustro',
            actors:['3 zombis','Blepp','Tarak'],
            action:'Blepp herido (2 PG) y Tarak desarmado corren por el camino perseguidos.',
            state:'WAIT -> REVEAL -> DM_CHOICE',dmConfirm:true,autoCombat:false
        },
        {
            id:'INSPECT_A1_STATUE',canon:true,source:'capitulo 1 p.10',zone:'A1',
            anchor:'A1_DRAGON_PEDESTAL',test:'Inteligencia (Conocimiento Arcano) CD 10',
            result:'Reconocen que la estatua representa a un dragon de bronce.',dmConfirm:true
        },
        {
            id:'A2_WINCH',canon:true,source:'capitulo 1 p.10',zone:'A2',
            anchor:'A2_WINCH_DRUM',
            action:'Liberar palanca deja caer el pale al agua; operar cabrestante sube 3 m por accion.',
            state:'LOCKED -> RELEASED -> RAISING',dmConfirm:true
        },
        {
            id:'MYLA_EQUIPMENT',canon:true,source:'capitulo 1 p.8',zone:'A1',
            actors:['Myla'],anchor:'A1_MYLA_FLOOR',
            action:'Myla puede vender equipo del reglamento.',dmConfirm:true
        },
        {
            id:'TARAK_CAVES',canon:true,source:'capitulo 1 p.12',zone:'A1',
            actors:['Tarak'],action:'Tarak pide visitar las Cuevas de Pleamar y recuperar hongos. Ofrece dos pociones de curacion y un saco de restos para los miconidos.',
            destination:'CUEVAS_DE_PLEAMAR',dmConfirm:true
        },
        {
            id:'VARNOTH_RIX_WRECK',canon:true,source:'capitulo 1 p.12',zone:'A1',
            actors:['Varnoth','Rix','Runara'],
            action:'Varnoth y Rix presenciaron un naufragio. Runara sugiere investigar el Rosa de los Vientos.',
            destination:'PECIO_ROSA_DE_LOS_VIENTOS',dmConfirm:true
        },
        {
            id:'A4_LIBRARY',canon:true,source:'capitulo 1 p.10',zone:'A4',
            anchor:'A4_REINFORCED_DOOR',action:'Unica puerta de roble y hierro del claustro: abre con facilidad.',
            dmConfirm:false
        },
        {
            id:'A5_BAHAMUT',canon:true,source:'capitulo 1 p.11',zone:'A5',
            anchor:'A5_BAHAMUT_PLINTH',test:'Inteligencia (Religion) CD 10',
            effect:'Las criaturas no malvadas en el templo pueden sumar 1d4 a una tirada de salvacion.',
            action:'Siete canarios de piedra y cuatro puntos de incienso.',dmConfirm:true
        },
        {
            id:'RUNARA_RESCUE',canon:true,source:'capitulo 1 pp.7,13',zone:'A5',
            trigger:'DM: si desea rescatar a los PJ cuando estan inconscientes.',
            action:'Despiertan en el templo y los kobolds los atienden. Runara evita explicar como los salvo.',
            state:'WAIT -> DM_DECISION -> TEMPLE_RECOVERY',dmConfirm:true,secretDM:true
        },
        {
            id:'RUNARA_REVEAL',canon:true,source:'capitulo 1 p.13',zone:'A5',
            condition:'Despues de que el DM confirme suficiente progreso con zombis, miconidos y pecio.',
            action:'Runara revela su forma verdadera, habla de Aidron y entrega una llave de piedra lunar para el observatorio.',
            state:'LOCKED -> DM_CONFIRM -> REVEAL -> QUEST_OBSERVATORY',
            dmConfirm:true,secretDM:true,neverAutoplay:true
        }
    ];
    const destinations = {
        CUEVAS_DE_PLEAMAR:{chapter:2,location:'sur de la isla',route:'fuera_de_este_mapa'},
        PECIO_ROSA_DE_LOS_VIENTOS:{chapter:3,location:'rocas del norte',route:'bote_del_claustro'},
        OBSERVATORIO:{chapter:4,location:'sudeste de la isla',route:'fuera_de_este_mapa'},
        AGUAS_TERMALES:{chapter:1,location:'no fijada en mapa 2',optional:true},
        OSO_LECHUZA:{chapter:1,location:'interior de la isla no fijado en mapa 2',optional:true}
    };
    scene.metadata = Object.assign({},scene.metadata,{
        version:'V3_EXPANDIDO',
        chapter:'1 · El Retiro del Dragon',
        gridMeters:CELL,zones:ZONE,levelHeight:LEVEL,routes:routes,
        npcAnchors:npcRegistry,
        dmEvents:events,
        outboundDestinations:destinations,
        dmOnlySecrets:{
            runara:'Es una dragona de bronce adulta, NO revelar antes del trigger elegido por el DM.',
            privateLair:'Cueva oculta con tunel submarino no mostrada en el mapa oficial. No generar entrada visible sin decision del DM.'
        },
        contentPolicy:'Separar datos del DM de lo renderizado para jugadores; tiradas fisicas; no autoexitos.',
        mapExpansionNotes:[
            'Canon A1-A5 y sus alturas preservados.',
            'Los nuevos tramos de costa, bastiones de roca, arrecifes y navio fondeado son escenografia.',
            'No se ha situado las Cuevas, el Pecio ni el Observatorio como si fueran estancias del Retiro.',
            'La ubicacion exacta de las aguas termales y la guarida secreta de Runara no aparece en mapa 2.'
        ]
    });
    for(const e of events) if(e.anchor && registry[e.anchor]) {
        registry[e.anchor].metadata.events=(registry[e.anchor].metadata.events||[]).concat(e.id);
    }
}


// ====================================================
// index.js
// ====================================================
// RETIRO DEL DRAGON · V3 EXPANDIDO · PUNTO DE ENTRADA
// Este debe ser el archivo principal (entry) en Babylon Playground.
// Los demas .js se crean como archivos hermanos, con los mismos nombres.

















// ====================================================
// V4 · HUB EXPANDIDO / BASE DE OPERACIONES
// ====================================================
// CANON:
// - El Retiro del Dragón funciona como base de operaciones.
// - Cuevas de Pleamar y Observatorio se alcanzan por tierra.
// - El Pecio del Rosa de los Vientos se visita en bote.
// VTT_AMBIENCE:
// - Ampliación física de salas, plaza-hub, senderos forestales,
//   zonas de preparación, vegetación y miradores.
// ====================================================

function crearHubExpandidoV4(ctx) {
    const { B, C, S, MAT, gridRect, pathRibbon, routes, registry } = ctx;

    // ------------------------------------------------
    // 1. A1 · CELDAS MÁS PROFUNDAS
    // ------------------------------------------------
    // Mantener las entradas canónicas, pero prolongar las habitaciones
    // hacia el interior del acantilado para que funcionen mejor en VTT.
    const cellIds = [
        'A1_GUEST',
        'A1_TARAK',
        'A1_VARNOTH',
        'A1_MYLA',
        'A1_KOBOLDS_W',
        'A1_KOBOLDS_E'
    ];
    const cellXs = [-29.2,-23.5,-17.8,-12.1,-6.4,-0.7];

    cellIds.forEach((id, i) => {
        const x = cellXs[i];

        // Ocultar la antigua pared trasera para abrir la ampliación.
        if (registry[id+'_BACK']) registry[id+'_BACK'].isVisible = false;

        // Extensión de suelo: +3.4 m de profundidad útil.
        B(id+'_V4_REAR_FLOOR',5.25,.22,3.55,x,9.18,-20.05,MAT.floor,'interiors',
            {type:'room_extension',zone:id,canon:false,vtt_ambience:true});

        // Nuevas paredes laterales y trasera.
        B(id+'_V4_REAR_W',.30,3.1,3.55,x-2.62,10.77,-20.05,MAT.rock,'interiors',
            {type:'rock_wall',canon:false,vtt_ambience:true});
        B(id+'_V4_REAR_E',.30,3.1,3.55,x+2.62,10.77,-20.05,MAT.rock,'interiors',
            {type:'rock_wall',canon:false,vtt_ambience:true});
        B(id+'_V4_NEW_BACK',5.25,3.1,.32,x,10.77,-21.82,MAT.rock,'interiors',
            {type:'rock_wall',canon:false,vtt_ambience:true});

        // Grid ampliado.
        gridRect('GRID_'+id+'_V4_REAR',x-2.25,x+2.25,-21.35,-18.35,9.33);
    });

    // Más espacio social delante de las celdas.
    B('A1_HUB_PLAZA_EXTENSION',18,.28,6.0,-2,9.12,-1.8,MAT.path,'paths',
        {type:'hub_plaza',zone:'A1',canon:false,vtt_ambience:true});
    gridRect('GRID_A1_HUB_EXT',-10.5,6.0,-4.5,.0,9.30);

    // Mesa comunal exterior / zona de reunión.
    B('A1_HUB_TABLE',4.8,.72,1.45,-1.5,9.58,-1.0,MAT.wood,'furnishings',
        {type:'community_table',canon:false,vtt_ambience:true});
    B('A1_HUB_BENCH_1',4.3,.42,.52,-1.5,9.43,-2.35,MAT.darkWood,'furnishings',
        {type:'bench',canon:false,vtt_ambience:true});
    B('A1_HUB_BENCH_2',4.3,.42,.52,-1.5,9.43,.35,MAT.darkWood,'furnishings',
        {type:'bench',canon:false,vtt_ambience:true});

    // ------------------------------------------------
    // 2. A2 · TERRAZA LOGÍSTICA MÁS GRANDE
    // ------------------------------------------------
    B('A2_V4_LOGISTICS_TERRACE',9,.28,7.5,45.7,15.18,-20.2,MAT.path,'paths',
        {type:'logistics_area',zone:'A2',canon:false,vtt_ambience:true});
    gridRect('GRID_A2_V4_EXT',42.0,49.5,-23.2,-17.2,15.40);

    // Suministros para expediciones.
    for (let i=0;i<5;i++) {
        B('A2_SUPPLY_CRATE_'+i,1.1,.8,1.0,43.0+(i%3)*1.55,15.63,-18.4-Math.floor(i/3)*1.55,
            i%2?MAT.wood:MAT.paleWood,'furnishings',
            {type:'expedition_supply',canon:false,vtt_ambience:true});
    }
    for (let i=0;i<3;i++) {
        C('A2_SUPPLY_BARREL_'+i,1.05,.82,46.8+i*1.0,15.73,-22.0,MAT.darkWood,'furnishings',
            {type:'expedition_supply',canon:false,vtt_ambience:true});
    }

    // ------------------------------------------------
    // 3. A3 · COMEDOR/COCINA MÁS GRANDES
    // ------------------------------------------------
    if (registry['A3_BACK_WALL']) registry['A3_BACK_WALL'].isVisible = false;
    if (registry['A3_NORTH_WALL']) registry['A3_NORTH_WALL'].isVisible = false;

    // Extensión posterior, compatible con los nombres de distintas iteraciones.
    B('A3_V4_REAR_FLOOR',12,.24,4.5,25,18.13,-41.8,MAT.floor,'interiors',
        {type:'room_extension',zone:'A3',canon:false,vtt_ambience:true});
    B('A3_V4_REAR_WALL',12,3.5,.32,25,19.9,-44.05,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    B('A3_V4_SIDE_W',.32,3.5,4.5,19.0,19.9,-41.8,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    B('A3_V4_SIDE_E',.32,3.5,4.5,31.0,19.9,-41.8,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    gridRect('GRID_A3_V4_REAR',19.5,30.0,-43.5,-40.5,18.35);

    // Despensa funcional.
    B('A3_V4_PANTRY_SHELF',5.0,2.2,.55,25,19.3,-43.55,MAT.darkWood,'furnishings',
        {type:'pantry',canon:false,vtt_ambience:true});
    for(let i=0;i<6;i++) {
        B('A3_V4_PANTRY_BOX_'+i,.7,.55,.65,22.7+(i%4)*1.45,18.48,-42.65+Math.floor(i/4)*.9,
            MAT.wood,'furnishings',{type:'food_storage',canon:false,vtt_ambience:true});
    }

    // ------------------------------------------------
    // 4. A4 · BIBLIOTECA MÁS AMPLIA
    // ------------------------------------------------
    if (registry['A4_NORTH_WALL']) registry['A4_NORTH_WALL'].isVisible = false;
    if (registry['A4_CAVE_ROOF']) registry['A4_CAVE_ROOF'].isVisible = false;

    // Añadir una nueva nave posterior de estudio.
    B('A4_V4_REAR_FLOOR',17.6,.24,5.8,5,18.12,-45.55,MAT.floor,'interiors',
        {type:'library_extension',zone:'A4',canon:false,vtt_ambience:true});
    B('A4_V4_NEW_NORTH_WALL',17.6,3.6,.30,5,19.92,-48.45,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    B('A4_V4_SIDE_W',.30,3.6,5.8,-3.8,19.92,-45.55,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    B('A4_V4_SIDE_E',.30,3.6,5.8,13.8,19.92,-45.55,MAT.rock,'interiors',
        {type:'rock_wall',canon:false,vtt_ambience:true});
    gridRect('GRID_A4_V4_REAR',-3.25,12.75,-47.85,-43.35,18.35);

    // Mesas adicionales para estudio/mapas.
    B('A4_V4_MAP_TABLE',5.0,.74,1.8,4.8,18.63,-45.5,MAT.wood,'furnishings',
        {type:'map_table',canon:false,vtt_ambience:true});
    B('A4_V4_MAP_BENCH_N',4.7,.42,.55,4.8,18.48,-47.0,MAT.darkWood,'furnishings',
        {type:'bench',canon:false,vtt_ambience:true});
    B('A4_V4_MAP_BENCH_S',4.7,.42,.55,4.8,18.48,-44.0,MAT.darkWood,'furnishings',
        {type:'bench',canon:false,vtt_ambience:true});

    // ------------------------------------------------
    // 5. A5 · TEMPLO APROXIMADAMENTE x2
    // ------------------------------------------------
    // Mantener el templo original y añadir una gran terraza sagrada alrededor.
    // Superficie adicional: oeste, este y lado marítimo.
    B('A5_V4_TERRACE_W',10,.40,16,-54.3,27.23,-30.0,MAT.statue,'paths',
        {type:'sacred_terrace',zone:'A5',canon:false,vtt_ambience:true});
    B('A5_V4_TERRACE_E',10,.40,16,-27.7,27.23,-30.0,MAT.statue,'paths',
        {type:'sacred_terrace',zone:'A5',canon:false,vtt_ambience:true});
    B('A5_V4_TERRACE_SEA',36.6,.40,7.0,-41,27.23,-20.9,MAT.statue,'paths',
        {type:'sacred_terrace',zone:'A5',canon:false,vtt_ambience:true});

    // Grid extendido.
    gridRect('GRID_A5_V4_W',-58.5,-49.5,-37.0,-22.0,27.50);
    gridRect('GRID_A5_V4_E',-32.5,-24.0,-37.0,-22.0,27.50);
    gridRect('GRID_A5_V4_SEA',-57.0,-25.5,-23.5,-18.5,27.50);

    // Columnas exteriores: gran santuario / mirador.
    const outerCols = [
        [-57,-36],[-57,-30],[-57,-24],
        [-25,-36],[-25,-30],[-25,-24],
        [-51,-18.7],[-45,-18.7],[-39,-18.7],[-33,-18.7],[-27,-18.7]
    ];
    outerCols.forEach((p,i)=>{
        C('A5_V4_OUTER_COLUMN_'+i,4.2,.72,p[0],29.45,p[1],MAT.statue,'furnishings',
            {type:'column',canon:false,vtt_ambience:true});
    });

    // Bancos de contemplación.
    [-52,-46,-36,-30].forEach((x,i)=>{
        B('A5_V4_MEDITATION_BENCH_'+i,3.5,.45,.65,x,27.52,-20.5,MAT.wood,'furnishings',
            {type:'meditation_bench',canon:false,vtt_ambience:true});
    });

    // ------------------------------------------------
    // 6. RUTA TERRESTRE -> CUEVAS DE PLEAMAR
    // ------------------------------------------------
    // Sale desde el extremo occidental/inferior del hub hacia el bosque.
    const pleamarPts = [
        [-34,9.25,-6],
        [-43,9.7,-10],
        [-50,10.3,-16],
        [-58,10.8,-23],
        [-68,11.2,-29]
    ];
    for(let i=0;i<pleamarPts.length-1;i++) {
        pathRibbon('V4_PATH_PLEAMAR_'+i,pleamarPts[i],pleamarPts[i+1],3.1,MAT.path,'paths',
            {type:'travel_path',canon:false,vtt_ambience:true,destination:'CUEVAS_DE_PLEAMAR'});
        routes.push({id:'V4_PLEAMAR_'+i,from:pleamarPts[i],to:pleamarPts[i+1],mode:'walk',destination:'CUEVAS_DE_PLEAMAR'});
    }

    // Bosque alrededor de la salida.
    for(let i=0;i<20;i++) {
        const x=-45-(i%5)*5.4;
        const z=-10-Math.floor(i/5)*5.4-(i%2)*1.4;
        C('V4_PLEAMAR_TREE_TRUNK_'+i,2.3,.32,x,11.2,z,MAT.darkWood,'ambient',
            {canon:false,vtt_ambience:true});
        const crown=S('V4_PLEAMAR_TREE_CROWN_'+i,2.0,x,13.0,z,MAT.leaves,'ambient',
            {canon:false,vtt_ambience:true});
        crown.scaling.set(1.0,1.15,.9);
    }

    const exitPleamar=B('EXIT_PLEAMAR',3.0,.08,3.0,-68,11.32,-29,MAT.marker,'markers',
        {type:'travel_exit',canon:true,destination:'CUEVAS_DE_PLEAMAR',travelMode:'land'});
    exitPleamar.isVisible=false;

    // ------------------------------------------------
    // 7. RUTA TERRESTRE -> OBSERVATORIO DEL ACANTILADO
    // ------------------------------------------------
    // Sale por el sector oriental/sureste del hub hacia el interior.
    const obsPts = [
        [38,15.25,-19],
        [47,15.6,-24],
        [55,16.0,-31],
        [63,16.4,-39],
        [72,16.8,-46]
    ];
    for(let i=0;i<obsPts.length-1;i++) {
        pathRibbon('V4_PATH_OBSERVATORIO_'+i,obsPts[i],obsPts[i+1],3.1,MAT.path,'paths',
            {type:'travel_path',canon:false,vtt_ambience:true,destination:'OBSERVATORIO_DEL_ACANTILADO'});
        routes.push({id:'V4_OBS_'+i,from:obsPts[i],to:obsPts[i+1],mode:'walk',destination:'OBSERVATORIO_DEL_ACANTILADO'});
    }

    for(let i=0;i<18;i++) {
        const x=48+(i%5)*5.2;
        const z=-23-Math.floor(i/5)*5.5-(i%2)*1.0;
        C('V4_OBS_TREE_TRUNK_'+i,2.2,.30,x,17.0,z,MAT.darkWood,'ambient',
            {canon:false,vtt_ambience:true});
        const crown=S('V4_OBS_TREE_CROWN_'+i,1.9,x,18.8,z,MAT.leavesL,'ambient',
            {canon:false,vtt_ambience:true});
        crown.scaling.set(1.05,1.1,.9);
    }

    const exitObs=B('EXIT_OBSERVATORIO',3.0,.08,3.0,72,16.92,-46,MAT.marker,'markers',
        {type:'travel_exit',canon:true,destination:'OBSERVATORIO_DEL_ACANTILADO',travelMode:'land'});
    exitObs.isVisible=false;

    // ------------------------------------------------
    // 8. PECIO · SOLO VIAJE EN BOTE
    // ------------------------------------------------
    // No hay sendero terrestre. El nodo de viaje queda asociado al embarcadero.
    const pecioBoat=B('TRAVEL_PECIO_BOAT',3.2,.08,3.2,-47,.45,21.5,MAT.marker,'markers',
        {type:'travel_exit',canon:true,destination:'PECIO_ROSA_DE_LOS_VIENTOS',travelMode:'boat'});
    pecioBoat.isVisible=false;

    // Zona de preparación junto al puerto.
    B('HUB_PORT_STAGING',9,.25,5.5,-42,.40,11.5,MAT.pathEdge,'paths',
        {type:'expedition_staging',canon:false,vtt_ambience:true});
    gridRect('GRID_HUB_PORT_STAGING',-45.5,-39.5,9.0,13.5,.58);

    for(let i=0;i<5;i++) {
        B('HUB_PORT_CRATE_'+i,1.0,.72,.9,-44.5+(i%3)*1.45,.87,10.0+Math.floor(i/3)*1.3,
            MAT.wood,'furnishings',{type:'port_supply',canon:false,vtt_ambience:true});
    }

    // ------------------------------------------------
    // 9. MIRADORES / ESPACIOS DE PAUSA
    // ------------------------------------------------
    B('HUB_LOOKOUT_WEST',8,.24,4.0,-28,9.12,1.0,MAT.path,'paths',
        {type:'lookout',canon:false,vtt_ambience:true});
    B('HUB_LOOKOUT_UPPER',8,.24,4.0,15,18.15,-23.5,MAT.path,'paths',
        {type:'lookout',canon:false,vtt_ambience:true});

    // Marcadores de integración para Codex.
    ctx.hubV4 = {
        exits: {
            pleamar: 'EXIT_PLEAMAR',
            observatorio: 'EXIT_OBSERVATORIO',
            pecio: 'TRAVEL_PECIO_BOAT'
        },
        hubZones: [
            'A1_HUB_PLAZA_EXTENSION',
            'A2_V4_LOGISTICS_TERRACE',
            'HUB_PORT_STAGING',
            'A5_V4_TERRACE_W',
            'A5_V4_TERRACE_E',
            'A5_V4_TERRACE_SEA'
        ]
    };
}


// ============================================================
// V4.1 - RELIEVE ESTRUCTURAL Y UNIONES (VTT_AMBIENCE)
// Corrige los bloques rectangulares visibles en V4 SIN mover A1-A5.
// Terreno visible, NO malla final de navegacion o colision.
// ============================================================
function crearRelieveV41(ctx) {
    const {scene, B, C, S, MAT, registry, group, store, rock, routes} = ctx;

    // Eliminar exclusivamente los volumenes provisionales de escenografia.
    // No se eliminan los suelos, puertas, escaleras ni props canonicos.
    function retirar(id) {
        const m=registry[id];
        if(!m) return;
        Object.keys(group).forEach(g=>{
            const i=group[g].indexOf(m);
            if(i>=0) group[g].splice(i,1);
        });
        delete registry[id];
        m.dispose();
    }
    [
        'ROCK_LOWER_BODY','ROCK_UPPER_BACK','ROCK_NORTH_RIDGE',
        'ROCK_OVER_CELLS',
        'SCENERY_WEST_CLIFF','SCENERY_EAST_CLIFF','SCENERY_NORTH_RIDGE',
        'SCENERY_WEST_SHORE','SCENERY_EAST_SHORE',
        'A3_WALL_N', // esta pared tapaba la prolongacion de A3
        'A3_CAVE_ROOF','A4_CAVE_ROOF'
    ].forEach(retirar);
    for(let i=0;i<15;i++) retirar('ROCK_FRONT_'+i);
    for(let i=0;i<16;i++) retirar('UPPER_FACET_'+i);
    for(let i=0;i<11;i++) retirar('UPPER_LEDGE_'+i);
    for(let i=0;i<22;i++) retirar('BASALT_COLUMN_'+i);

    // Helpers de malla de relieve continuo (no cajas / no piedras-almendra).
    MAT.rock.backFaceCulling=false;
    MAT.rockD.backFaceCulling=false;
    MAT.rockL.backFaceCulling=false;
    MAT.grass.backFaceCulling=false;

    function relieveMesh(id, positions, indices, material, bucket, extra) {
        const v=new BABYLON.VertexData();
        v.positions=positions;
        v.indices=indices;
        v.normals=[];
        BABYLON.VertexData.ComputeNormals(positions,indices,v.normals);
        const mesh=new BABYLON.Mesh(id,scene);
        v.applyToMesh(mesh);
        mesh.material=material;
        return store(mesh,id,bucket||'terrain',Object.assign({
            type:'structural_relief', canon:false, vtt_ambience:true,
            collisionStatus:'greybox_only'
        },extra||{}));
    }

    // Franja de acantilado: frente visible irregular, cubierta y costados.
    // No pasa por la ensenada de A2: alli debe quedar el mar bajo el pale.
    function masaEscalonada(id,x0,x1,zFrontTop,zFrontBottom,zBack,yBottom,yTop,material,n) {
        const columns=n||38, rows=6;
        const p=[],ix=[];
        const fi=(x,i)=>.43*Math.sin(x*.30+i*1.23)+.18*Math.sin(x*.81+i*.57);
        // Frente tallado: desde playa al borde de la terraza.
        for(let r=0;r<=rows;r++) {
            const t=r/rows, y=yBottom+(yTop-yBottom)*t;
            for(let i=0;i<=columns;i++) {
                const x=x0+(x1-x0)*i/columns;
                const z=(1-t)*zFrontBottom(x)+t*zFrontTop(x)+fi(x,r)*(.55+.3*(1-t));
                p.push(x,y+(r>0&&r<rows?.18*Math.sin(x*.77+r):0),z);
            }
        }
        for(let r=0;r<rows;r++) for(let i=0;i<columns;i++) {
            const a=r*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
            ix.push(a,c,b,b,c,d);
        }
        relieveMesh(id+'_FACE',p,ix,material,'terrain',
            {type:'cliff_face',stages:[yBottom,yTop]});
        // Meseta superior: suelo rocoso bajo plazas y salas, SIN invadir estancias.
        const pp=[],ii=[],deep=8;
        for(let r=0;r<=deep;r++) {
            const t=r/deep;
            for(let i=0;i<=columns;i++) {
                const x=x0+(x1-x0)*i/columns;
                const z=zFrontTop(x)*(1-t)+zBack(x)*t;
                pp.push(x,yTop-.055*t,z);
            }
        }
        for(let r=0;r<deep;r++) for(let i=0;i<columns;i++) {
            const a=r*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
            ii.push(a,b,c,b,d,c);
        }
        relieveMesh(id+'_SURFACE',pp,ii,material,'terrain',
            {type:'rock_support_surface',elevation:yTop});
    }

    // 1. Acantilado bajo A1: largo y continuo, con borde inclinado hacia el mar.
    // En la derecha se deja la ensenada del cabrestante, x>34.
    masaEscalonada('V41_LOWER_CLIFF',-84,34,
        x=>-2.0+.45*Math.sin(x*.17),
        x=>9.7+1.35*Math.sin(x*.11),
        x=>-24.5-.6*Math.sin(x*.09),
        .0,8.91,MAT.rock,48);

    // 2. Nivel +18: la pared comienza DETRAS de las celdas ampliadas.
    // La meseta superior sostiene el camino, la cocina y la biblioteca.
    masaEscalonada('V41_UPPER_CLIFF',-63,58,
        x=>-24.1+.42*Math.sin(x*.18),
        x=>-24.8+.55*Math.sin(x*.20),
        x=>-51.0-.45*Math.sin(x*.10),
        8.87,17.92,MAT.rockL,45);

    // 3. Montaña hacia el interior. Sustituye la inmensa barra del fondo
    // por una ladera quebrada que sube gradualmente de 18 a 30 metros.
    (function crearLaderaInterior(){
        const xx=44,zz=13,p=[],idx=[];
        for(let j=0;j<=zz;j++) {
            const t=j/zz;
            for(let i=0;i<=xx;i++) {
                const x=-85+180*i/xx;
                const z=-50.8-39*t+.55*Math.sin(x*.19+j*.7)*t;
                const y=17.92+12.3*t+
                    (1.1*Math.sin(x*.22+j*.91)+.65*Math.cos(x*.43-j*.37))*t*(.4+.6*t);
                p.push(x,y,z);
            }
        }
        for(let j=0;j<zz;j++)for(let i=0;i<xx;i++) {
            const a=j*(xx+1)+i,b=a+1,c=a+xx+1,d=c+1;
            idx.push(a,b,c,b,d,c);
        }
        relieveMesh('V41_INLAND_RIDGE',p,idx,MAT.rockD,'terrain',
            {type:'inland_cliff',height:'18_to_30'});
    })();

    // 4. Costa occidental y oriental: ya no son dos cajas rectangulares.
    // La ensenada de A2 sigue abierta entre ambas masas.
    (function crearCostas(){
        const parts=[[-85,-56,9.6,13.9,'WEST'],[61,96,8.1,11.9,'EAST']];
        parts.forEach(part=>{
            const [x0,x1,z0,z1,name]=part, n=12,p=[],ix=[];
            for(let r=0;r<=5;r++){
                const t=r/5;
                for(let i=0;i<=n;i++){
                    const x=x0+(x1-x0)*i/n;
                    const z=z0+(z1-z0)*t + .8*Math.sin(x*.36+r*.9);
                    const y=.13+(.55+Math.sin(x*.4)*.18)*(1-t);
                    p.push(x,y,z);
                }
            }
            for(let r=0;r<5;r++)for(let i=0;i<n;i++){
                const a=r*(n+1)+i,b=a+1,c=a+n+1,d=c+1;
                ix.push(a,b,c,b,d,c);
            }
            relieveMesh('V41_'+name+'_COAST',p,ix,MAT.rockD,'terrain',
                {type:'shoreline',walkable:false});
        });
    })();

    // 5. Las ampliaciones A3/A4 necesitan continuidad real de su suelo.
    B('A3_V41_FLOOR_LINK',12.8,.24,2.55,25,18.12,-38.55,
      MAT.floor,'interiors',{type:'walkable_floor',zone:'A3',canon:false,vtt_ambience:true});

    // Tejados de roca finos, irregulares, con tecla T. Evitan los grandes bloques.
    function cubiertaCueva(id,x0,x1,z0,z1,y,segments){
        const p=[],idx=[],n=segments||10,m=6;
        for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
            const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*j/m;
            const offset=.17*Math.sin(x*.59+z*.34)+.10*Math.cos(x*.23-z*.45);
            p.push(x,y+offset,z);
        }
        for(let j=0;j<m;j++)for(let i=0;i<n;i++){
            const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;
            idx.push(a,b,c,b,d,c);
        }
        return relieveMesh(id,p,idx,MAT.rockL,'upperRoof',
          {type:'cutaway_cave_roof',visibleByDefault:false});
    }
    cubiertaCueva('V41_CELLS_CAVE_ROOF',-32.6,2.0,-23.0,-10.5,12.85,24);
    cubiertaCueva('V41_A3_CAVE_ROOF',18.0,39.0,-45.0,-28.5,22.05,16);
    cubiertaCueva('V41_A4_CAVE_ROOF',-4.1,14.2,-49.0,-29.6,22.15,16);

    // 6. A5: terraza ampliada y bien sostenida por la roca.
    // Hombro posterior irregular, pegado al acantilado de +18m.
    (function hombroTemplo(){
        const nx=16,nz=6,p=[],ix=[];
        for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
            const x=-60+39*i/nx,z=-43.3+7.6*j/nz;
            const y=24.2+2.63*j/nz+.18*Math.sin(x*.31+j*1.7);
            p.push(x,y,z);
        }
        for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
            const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
            ix.push(a,b,c,b,d,c);
        }
        relieveMesh('V41_A5_ROCK_ANCHOR',p,ix,MAT.rock,'terrain',
            {type:'temple_cliff_anchor',zone:'A5'});
    })();

    // Contrafuertes curvos desde la meseta +18 hasta la terraza +27.
    // Malla de tubos, no columnas aisladas clavadas en el agua.
    const archXs=[-56.8,-49.2,-41.0,-32.8,-25.5];
    archXs.forEach((x,i)=>{
        const points=[];
        for(let j=0;j<=18;j++){
            const t=j/18;
            const z=-37.9+18.0*t;
            const y=17.95+8.95*t+1.1*Math.sin(Math.PI*t);
            points.push(new BABYLON.Vector3(x,y,z));
        }
        const tube=BABYLON.MeshBuilder.CreateTube('V41_A5_BUTTRESS_'+i,{
            path:points,radius:.68,tessellation:9,cap:BABYLON.Mesh.CAP_ALL,
            updatable:false
        },scene);
        tube.material=MAT.stone||MAT.rockL;
        store(tube,tube.name,'terrain',{
            type:'arched_stone_support',zone:'A5',canon:false,vtt_ambience:true
        });
        // Travesano de apoyo al forjado en el borde maritimo.
        B('V41_A5_BUTTRESS_HEAD_'+i,2.5,.64,1.1,x,26.85,-19.9,
          MAT.rockL,'terrain',{type:'support_cap',zone:'A5',canon:false,vtt_ambience:true});
    });
    B('V41_A5_FRONT_ARCH_BEAM',36.8,.46,.73,-41.0,26.79,-19.65,
        MAT.rockL,'terrain',{type:'temple_support',zone:'A5',canon:false,vtt_ambience:true});

    // 7. Senderos a bosque: cada tramo lleva su ladera verde real debajo.
    // Se evitan las pasarelas lineales con arboles plantados en el aire.
    function sendaSobreTerreno(name,points,halfWidth,mat){
        const p=[],ix=[],cross=[-12,-7,-halfWidth,0,halfWidth,7,12];
        for(let i=0;i<points.length;i++){
            const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
            const dx=next[0]-prev[0],dz=next[2]-prev[2],len=Math.max(.001,Math.hypot(dx,dz));
            const nx=-dz/len,nz=dx/len;
            for(let j=0;j<cross.length;j++){
                const d=cross[j],abs=Math.abs(d);
                const fall=abs<=halfWidth?.28:abs<=7?.72:2.25;
                const jitter=abs<=halfWidth?0:.24*Math.sin(i*2.31+j*1.27);
                p.push(points[i][0]+nx*d,points[i][1]-fall+jitter,points[i][2]+nz*d);
            }
        }
        for(let i=0;i<points.length-1;i++)for(let j=0;j<cross.length-1;j++){
            const a=i*cross.length+j,b=a+1,c=a+cross.length,d=c+1;
            ix.push(a,b,c,b,d,c);
        }
        relieveMesh(name,p,ix,mat,'terrain',
            {type:'forest_hillside',walkableSurface:'trail_only',canon:false});
        // Acantilado de apoyo bajo el borde vegetal, irregular y bajo.
        for(let i=1;i<points.length;i++){
            const a=points[i-1],b=points[i];
            const cx=(a[0]+b[0])/2,cz=(a[2]+b[2])/2;
            const base=(a[1]+b[1])/2-3.4;
            const blob=rock(name+'_FOOT_'+i,cx,base,cz,3.3,3.2,3.2,MAT.rock);
            blob.metadata.type='embankment';
        }
    }
    sendaSobreTerreno('V41_PLEAMAR_FOREST_TERRAIN',[
        [-34,9.25,-6],[-43,9.7,-10],[-50,10.3,-16],[-58,10.8,-23],[-68,11.2,-29]
    ],1.7,MAT.grass);
    sendaSobreTerreno('V41_OBSERVATORY_FOREST_TERRAIN',[
        [38,15.25,-19],[47,15.6,-24],[55,16.0,-31],[63,16.4,-39],[72,16.8,-46]
    ],1.7,MAT.grass);

    // Las rutas ya existentes y sus triggers se mantienen. Se anade sotobosque
    // irregular para romper las dos hileras de arboles de V4.
    for(let i=0;i<22;i++){
        const west=i<11, j=west?i:i-11;
        const x=west?-42-j*2.3:47+j*2.05;
        const z=west?-11-j*1.62:-24-j*1.85;
        const y=west?9.65+j*.14:15.3+j*.14;
        const sign=i%2?1:-1;
        const shrub=S('V41_UNDERGROWTH_'+i,.85,x+sign*(3.4+(i%4)*.55),y+.15,
                      z+sign*(1.6+(i%3)*.70),i%3?MAT.leaves:MAT.leavesL,
                      'ambient',{type:'forest_undergrowth',canon:false,vtt_ambience:true});
        shrub.scaling.set(1.35,.55,.90);
    }

    // 8. Actualizar metadatos; Codex debe generar colisiones desde geometria.
    ctx.reliefV41={
        status:'structural_greybox',
        originalZonesPreserved:['A1','A2','A3','A4','A5'],
        newTerrain:[
            'V41_LOWER_CLIFF_FACE','V41_UPPER_CLIFF_FACE','V41_INLAND_RIDGE',
            'V41_A5_ROCK_ANCHOR','V41_PLEAMAR_FOREST_TERRAIN',
            'V41_OBSERVATORY_FOREST_TERRAIN'
        ],
        codexNote:'Separar colision de suelos, pendientes, techos recortables, escenografia y caminos.'
    };
}

// ============================================================
// RETIRO DEL DRAGON V5.1 - CORRECCION SIN BLOQUES OCLUSIVOS
// Basada expresamente en V4.1, no en la V5 defectuosa.
// CANON A1-A5, cotas y salidas: preservados.
// Todo el trabajo siguiente es VTT_AMBIENCE. Ninguna malla nueva
// maciza se crea sobre suelos, escaleras ni habitaciones.
// ============================================================
function crearRelieveV51(ctx) {
    const {scene, registry, group, store, MAT, B, C, S} = ctx;
    group.reliefDetail = [];

    // Materiales exclusivos de escenografia; el color de Bahamut se conserva.
    function rockMaterial(name,hex) {
        const m=new BABYLON.StandardMaterial(name,scene);
        m.diffuseColor=BABYLON.Color3.FromHexString(hex);
        m.specularColor=new BABYLON.Color3(.015,.015,.015);
        m.backFaceCulling=false;
        m.useVertexColors=true;
        return m;
    }
    const cliffMat=rockMaterial('V51_FACETED_CLIFF','#68716a');
    const upperMat=rockMaterial('V51_UPPER_CLIFF','#68766e');
    const ridgeMat=rockMaterial('V51_INLAND_ROCK','#55645e');
    const topMat=rockMaterial('V51_MOUNTAIN_SHELF','#777a6c');
    const cliffDark=rockMaterial('V51_DARK_BUTTRESS','#565c56');
    const warmTemple=rockMaterial('V51_TEMPLE_FLOOR','#8c8878');
    const beachMat=rockMaterial('V51_SAND_SHORE','#968771');
    const mossMat=rockMaterial('V51_MOSS','#506d4a');
    const scrubMat=rockMaterial('V51_SCRUB','#687954');

    function detach(id) {
        const m=registry[id]; if(!m) return false;
        Object.keys(group).forEach(bucket=>{
            const index=group[bucket].indexOf(m);
            if(index!==-1)group[bucket].splice(index,1);
        });
        delete registry[id];
        m.dispose();
        return true;
    }

    // La V4.1 conserva ocho elipsoides del greybox original y las
    // grandes 'almendras' bajo los caminos. No participan en ninguna ruta.
    for(let i=0;i<8;i++)detach('UPPER_CLIFF_EAST_'+i);
    ['V41_PLEAMAR_FOREST_TERRAIN','V41_OBSERVATORY_FOREST_TERRAIN'].forEach(prefix=>{
        for(let i=1;i<=4;i++)detach(prefix+'_FOOT_'+i);
    });

    // Reducir brillos plasticos de la roca antigua, sin afectar materiales
    // de madera, puerta, columnas o suelos de juego.
    [MAT.rock,MAT.rockD,MAT.rockL].forEach(m=>{
        m.specularColor=new BABYLON.Color3(.018,.018,.018);
    });

    // Reforma la malla ya creada, no apila bloques adicionales.
    // Los bordes superior e inferior se fijan: A1 y A3/A4 mantienen
    // cotas exactas y la montana NO invade el suelo de ninguna estancia.
    function facetar(id,material,kind,yMin,yMax) {
        const mesh=registry[id]; if(!mesh)return;
        const kindP=BABYLON.VertexBuffer.PositionKind;
        const kindN=BABYLON.VertexBuffer.NormalKind;
        const kindC=BABYLON.VertexBuffer.ColorKind;
        const p=mesh.getVerticesData(kindP);
        if(!p)return;
        const positions=Array.from(p);
        const colors=[];
        for(let k=0;k<positions.length;k+=3){
            const x=positions[k],y=positions[k+1],z=positions[k+2];
            const tr=(y-yMin)/Math.max(.1,yMax-yMin);
            const noise=.62*Math.sin(x*.207+y*.47)+
                        .26*Math.sin(x*.61-y*.23)+
                        .19*Math.cos(z*.78+x*.13);
            if(kind==='FACE'){
                // Nunca desplazar la cornisa a +9 o +18 m.
                const envelope=Math.pow(Math.max(0,Math.sin(Math.PI*Math.max(0,Math.min(1,tr)))),1.2);
                positions[k+2]+=envelope*.55*noise;
            } else if(kind==='RIDGE') {
                // La ladera empieza DETRAS de A3/A4; preservar la primera fila.
                const away=Math.max(0,Math.min(1,(-z-51)/32));
                positions[k+1]+=away*.30*noise;
            }
            const stripe=Math.sin(y*1.87+x*.13)*.045;
            const shade=Math.min(1.16,Math.max(.77,.91+noise*.11+stripe));
            colors.push(shade*.95,shade,shade*.92,1);
        }
        const idx=mesh.getIndices();
        const normals=[];
        BABYLON.VertexData.ComputeNormals(positions,idx,normals);
        mesh.setVerticesData(kindP,positions,true);
        mesh.setVerticesData(kindN,normals,true);
        mesh.setVerticesData(kindC,colors,true);
        mesh.material=material;
        mesh.metadata=Object.assign({},mesh.metadata,{
            v51VisualFacet:true,collisionStatus:'NOT_READY_DECORATIVE'
        });
    }

    facetar('V41_LOWER_CLIFF_FACE',cliffMat,'FACE',0,8.91);
    facetar('V41_UPPER_CLIFF_FACE',upperMat,'FACE',8.87,17.92);
    facetar('V41_LOWER_CLIFF_SURFACE',topMat,'SURFACE',8.87,8.91);
    facetar('V41_UPPER_CLIFF_SURFACE',topMat,'SURFACE',17.86,17.92);
    facetar('V41_INLAND_RIDGE',ridgeMat,'RIDGE',17.92,30.5);

    // A5: recolorear solo el PAVIMENTO. Las columnas, los siete canarios
    // y la estatua de Bahamut retienen su material original y el techo
    // no se cubre. El templo duplicado permanece integramente utilizable.
    ['A5_TEMPLE_FLOOR','A5_V4_TERRACE_W','A5_V4_TERRACE_E',
     'A5_V4_TERRACE_SEA'].forEach(id=>{
        if(registry[id])registry[id].material=warmTemple;
    });

    // Reforzar los cinco arcos de V4.1 REEMPLAZANDO sus tubos finos.
    // La geometria queda por debajo del forjado y arranca en el macizo +18.
    const supportXs=[-56.8,-49.2,-41,-32.8,-25.5];
    supportXs.forEach((x,i)=>{
        detach('V41_A5_BUTTRESS_'+i);
        const arch=[];
        for(let j=0;j<=15;j++){
            const t=j/15;
            arch.push(new BABYLON.Vector3(
                x,
                18.05+8.80*t+.75*Math.sin(Math.PI*t),
                -37.9+18*t
            ));
        }
        const m=BABYLON.MeshBuilder.CreateTube('V51_A5_STONE_ARCH_'+i,{
            path:arch,radius:1.02,tessellation:6,
            cap:BABYLON.Mesh.CAP_ALL
        },scene);
        m.material=cliffDark;
        store(m,m.name,'terrain',{
            type:'structural_arch_visual',zone:'A5',canon:false,
            vtt_ambience:true,collisionStatus:'NOT_READY_DECORATIVE'
        });
    });
    ['V41_A5_FRONT_ARCH_BEAM',
     'V41_A5_BUTTRESS_HEAD_0','V41_A5_BUTTRESS_HEAD_1',
     'V41_A5_BUTTRESS_HEAD_2','V41_A5_BUTTRESS_HEAD_3',
     'V41_A5_BUTTRESS_HEAD_4'].forEach(id=>{
        if(registry[id]) registry[id].material=cliffDark;
    });

    // Juntas de piedra en A5: pocas, finas y NO son la grid tactica.
    function seam(name,a,b){
        const m=BABYLON.MeshBuilder.CreateLines(name,{
            points:[new BABYLON.Vector3(...a),new BABYLON.Vector3(...b)]
        },scene);
        m.color=BABYLON.Color3.FromHexString('#625f54');
        m.alpha=.44;m.isPickable=false;
        store(m,name,'reliefDetail',{type:'floor_seam',canon:false,vtt_ambience:true});
    }
    for(let x=-57.5,i=0;x<=-24;x+=3.15,i++){
        seam('V51_A5_SEAM_FRONT_'+i,[x,27.47,-23.85],[x,27.47,-18.05]);
    }
    for(let z=-34.2,i=0;z<=-25.2;z+=3.0,i++){
        seam('V51_A5_SEAM_CENTRE_'+i,[-48.6,27.49,z],[-33.4,27.49,z]);
    }

    // Fachadas de cueva: solo pequeñas viseras en el GRUPO DE TECHOS,
    // inicialmente ocultas mediante T. No tapar la entrada ni la planta.
    const cells=[-29.2,-23.5,-17.8,-12.1,-6.4,-.7];
    cells.forEach((x,i)=>{
        const left=B('V51_A1_CAVE_BROW_'+i,5.1,.24,.58,
            x,12.59,-10.84,MAT.rockL,'upperRoof',{
                type:'cutaway_cave_brow',canon:false,vtt_ambience:true
            });
        left.rotation.z=Math.sin(i*1.7)*.035;
        left.isVisible=false;
    });

    // A3 y A4: sus marcos y vanos EXISTENTES quedan despejados.
    // No colocar paredes ni roca nueva dentro de sus recintos.
    ['A3_V4_REAR_FLOOR','A4_V4_REAR_FLOOR'].forEach(id=>{
        const m=registry[id];
        if(m)m.metadata=Object.assign({},m.metadata,{
            preservedFrom:'V4_1',v51RoomClearance:true
        });
    });

    // Naturalizar la vieja doble hilera de arboles SIN plantar mas filas.
    // Tronco y copa se desplazan juntos y mantienen su pivote de altura.
    for(let i=0;i<20;i++){
        const jitterX=.68*Math.sin(i*2.47),jitterZ=.78*Math.cos(i*1.76);
        ['TRUNK','CROWN'].forEach(kind=>{
            const m=registry['V4_PLEAMAR_TREE_'+kind+'_'+i];
            if(m){m.position.x+=jitterX;m.position.z+=jitterZ;}
        });
    }
    for(let i=0;i<18;i++){
        const jitterX=.75*Math.sin(i*2.21),jitterZ=.66*Math.cos(i*1.92);
        ['TRUNK','CROWN'].forEach(kind=>{
            const m=registry['V4_OBS_TREE_'+kind+'_'+i];
            if(m){m.position.x+=jitterX;m.position.z+=jitterZ;}
        });
    }

    // Ladera INTERIOR: algunas matas bajas sobre el relieve REAL, a z<-66,
    // lejos del templo, la biblioteca y las conexiones de A1-A5.
    for(let i=0;i<26;i++){
        const x=-77+(i*13%165)+.85*Math.sin(i*2.1);
        const t=.46+(i*7%11)/24;
        const z=-50.8-39*t+.55*Math.sin(x*.19+(t*13)*.7)*t;
        const h=17.92+12.3*t+
            (1.1*Math.sin(x*.22+(t*13)*.91)+
             .65*Math.cos(x*.43-(t*13)*.37))*t*(.4+.6*t);
        const bush=C('V51_BACK_SCRUB_'+i,.55,.65+
           (i%3)*.12,x,h+.23,z,(i%3?mossMat:scrubMat),
           'reliefDetail',{type:'inland_scrub',canon:false,vtt_ambience:true});
        bush.scaling.y=.72;
    }

    // Playa: superponer una capa COSTERA irregular ligera al mismo nivel,
    // manteniendo ROCKY_BEACH como base geometrica para Codex. NO crear
    // un bloque nuevo que sobresalga sobre el muelle.
    (function shorelineSkin(){
        const rows=4,n=24,p=[],idx=[],c=[];
        for(let j=0;j<=rows;j++){
            const t=j/rows;
            for(let i=0;i<=n;i++){
                const x=-55+40*i/n;
                const front=18.1+.78*Math.sin(i*.85)+.25*Math.sin(i*2.7);
                const back=10.4+.3*Math.sin(i*.8);
                const z=back*(1-t)+front*t;
                p.push(x,.39+.01*Math.sin(i*1.13+j*2.4),z);
                const val=.9+.06*Math.sin(i*1.3+j*1.8);
                c.push(val,val*.98,val*.91,1);
            }
        }
        for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
            const a=j*(n+1)+i,b=a+1,d=a+(n+1),e=d+1;
            idx.push(a,b,d,b,e,d);
        }
        const vd=new BABYLON.VertexData();
        vd.positions=p;vd.indices=idx;vd.colors=c;vd.normals=[];
        BABYLON.VertexData.ComputeNormals(p,idx,vd.normals);
        const m=new BABYLON.Mesh('V51_BEACH_IRREGULAR_SKIN',scene);
        vd.applyToMesh(m);m.material=beachMat;
        store(m,m.name,'reliefDetail',{
            type:'coastal_visual_surface',canon:false,
            vtt_ambience:true,walkable:false
        });
    })();

    // No hay ningun nuevo volumen de gran tamano sobre A1-A5.
    // La V5 defectuosa NO se invoca ni esta incluida en este archivo.
    ctx.reliefV51={
        basedOn:'V4_1_RELIEVE_ESTRUCTURAL',
        purpose:'visual_integration_without_occlusion',
        preservation:['A1','A2','A3','A4','A5','EXIT_PLEAMAR',
                      'EXIT_OBSERVATORIO','TRAVEL_PECIO_BOAT'],
        cutawayRoofGroup:'upperRoof',
        collisionReady:false,
        instructionsForCodex:'Derivar colision solamente de suelos y rutas verificadas, NO del terreno decorativo.'
    };
}

// RETIRO DEL DRAGÓN · V5.2 · TERRENO CONTINUO + GRID/NAVIGATION
// CANON: las cotas, estancias, caminos y salidas siguen la aventura.
// VTT_AMBIENCE: las pequeñas uniones rocosas y la representación técnica.
// NOTA: los nodos de navegación son un prototipo para Codex, no un árbitro de D&D.


function applyVisualPatchV52(ctx) {
    const {scene, B, MAT, store, registry, group, CELL, routes} = ctx;
    group.navGrid = [];
    group.navBlocked = [];
    group.navPreview = [];

    // 1) RELLENO DE DOS JUNTAS ESTRUCTURALES. Nunca invadir superficies jugables.
    // Franja posterior a las celdas, que acaba a más de 0,5 m de sus muros.
    // La antigua cara del acantilado continúa siendo la masa principal.
    function meshFacets(name, p, ix, material, metadata) {
        const v = new BABYLON.VertexData();
        v.positions = p;
        v.indices = ix;
        v.normals = [];
        BABYLON.VertexData.ComputeNormals(p, ix, v.normals);
        const mesh = new BABYLON.Mesh(name, scene);
        v.applyToMesh(mesh);
        mesh.material = material;
        mesh.isPickable = false;
        return store(mesh, name, 'terrain', Object.assign({
            canon: false, vtt_ambience: true, walkable: false, collision: false
        }, metadata || {}));
    }
    (function cerramientoPosteriorA1() {
        const nx=34, ny=6, p=[], ix=[];
        for (let j=0;j<=ny;j++) {
            const t=j/ny;
            for (let i=0;i<=nx;i++) {
                const x=-35+70*i/nx;
                const z=-23.0-1.45*t + .12*Math.sin(x*.43+j*.65);
                const y=8.82+9.02*t + .085*Math.sin(x*.37+j*1.25);
                p.push(x,y,z);
            }
        }
        for(let j=0;j<ny;j++) for(let i=0;i<nx;i++) {
            const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
            ix.push(a,c,b,b,c,d);
        }
        meshFacets('V52_A1_REAR_CLIFF_SEAM',p,ix,MAT.rock,
            {type:'cliff_seam',purpose:'cover_dark_gap_behind_rooms'});
    })();
    // Frontal de A5: banda irregular BAJO el pavimento, sin cubrir escaleras.
    (function zocaloA5() {
        const nx=18, p=[], ix=[];
        for(let j=0;j<=4;j++) {
            const t=j/4;
            for(let i=0;i<=nx;i++) {
                const x=-58+34*i/nx;
                const z=-18.5-4.9*t+.15*Math.sin(i*.82+j*1.3);
                const y=22.6+4.35*t+.15*Math.sin(i*.75+j*.7);
                p.push(x,y,z);
            }
        }
        for(let j=0;j<4;j++)for(let i=0;i<nx;i++) {
            const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
            ix.push(a,b,c,b,d,c);
        }
        meshFacets('V52_A5_UNDERSIDE_SKIRT',p,ix,MAT.rockL,
            {type:'temple_underside',purpose:'visually_anchor_A5_below_walkable_surface'});
    })();

    // 1B) REPARAR PASOS DE 1,5 m que la V5.1 mostraba separados.
    // En todos los casos la abertura ya está definida por el capítulo 1:
    // los nuevos elementos solo unen el suelo visual y no alteran la historia.
    const cellCenters=[-29.2,-23.5,-17.8,-12.1,-6.4,-.7];
    cellCenters.forEach((x,i)=>{
        B('V52_A1_CELL_THRESHOLD_'+i,1.62,.16,1.88,x,9.22,-10.45,
            MAT.floor,'interiors',{type:'walkable_floor',zone:'A1',
                canon:false,vtt_ambience:true,purpose:'physical_doorway'});
    });
    B('V52_A4_DOOR_THRESHOLD',1.65,.16,1.5,8,18.23,-29.87,
      MAT.floor,'interiors',{type:'walkable_floor',zone:'A4',
          canon:false,vtt_ambience:true,purpose:'library_doorway'});
    // La cocina estaba separada por el antiguo muro E continuo de A3.
    // Dejamos un vano real coincidente con el pasillo corto ya existente.
    (function abrirPasilloCocina(){
        const old=registry['A3_WALL_E'];
        if(old){
            const list=group.interiors,i=list.indexOf(old);
            if(i>=0)list.splice(i,1);
            delete registry[old.name];old.dispose();
        }
        B('V52_A3_WALL_E_N',.29,3.3,2.45,31.6,19.81,-36.22,
          MAT.rock,'interiors',{type:'rock_wall',canon:false,vtt_ambience:true});
        B('V52_A3_WALL_E_S',.29,3.3,4.35,31.6,19.81,-30.93,
          MAT.rock,'interiors',{type:'rock_wall',canon:false,vtt_ambience:true});
    })();

    // En las escaleras hay peldaños estrechos que una malla de 1,5 m puede
    // saltarse. Esta banda de navegación INVISIBLE sigue exactamente la
    // trayectoria de la escalera visible; NO crea una nueva ruta de juego.
    const navRamps=[
        ['STEPS_WEST_APPROACH',[-45,3.7,2],[-42,5.7,-2.7]],
        ['A1_A2_LOWER_STEPS',[23,9.85,-6.5],[28,12,-10]],
        ['A1_A2_UPPER_STEPS',[28,12,-10],[32,15,-16]],
        ['A2_TO_UPPER',[35,15.36,-23.5],[33,18.16,-28]],
        ['UPPER_TO_24_A',[-11,18.22,-27.2],[-15,21,-30.7]],
        ['UPPER_TO_24_B',[-15,21,-30.7],[-20,24,-33.4]],
        ['LEVEL_24_TO_A5',[-31,24.16,-32.8],[-35,27.22,-32.1]]
    ];
    navRamps.forEach(r=>{
        const m=ctx.pathRibbon('V52_STAIRS_NAV_SUPPORT_'+r[0],r[1],r[2],1.65,
            MAT.path,'paths',{canon:false,walkableOnly:true,vtt_ambience:true,
                type:'walkable_slope',sourceStair:r[0]});
        m.isVisible=false;m.isPickable=false;
    });

    // Las filas de árboles V4 invadían varios senderos, especialmente
    // la subida oeste. Se retiran 3 m del eje sin duplicar vegetación.
    const trailSegments=[
      {tag:'PLEAMAR',pts:[[-34,9.25,-6],[-43,9.7,-10],[-50,10.3,-16],
            [-58,10.8,-23],[-68,11.2,-29]],count:20},
      {tag:'OBS',pts:[[38,15.25,-19],[47,15.6,-24],[55,16,-31],
            [63,16.4,-39],[72,16.8,-46]],count:18}
    ];
    trailSegments.forEach(trail=>{
        for(let i=0;i<trail.count;i++){
            const stem=registry['V4_'+trail.tag+'_TREE_TRUNK_'+i],
                crown=registry['V4_'+trail.tag+'_TREE_CROWN_'+i];
            if(!stem)continue;
            let best=null;
            for(let k=0;k<trail.pts.length-1;k++){
                const a=trail.pts[k],b=trail.pts[k+1],dx=b[0]-a[0],dz=b[2]-a[2];
                const t=Math.max(0,Math.min(1,((stem.position.x-a[0])*dx+
                    (stem.position.z-a[2])*dz)/(dx*dx+dz*dz)));
                const px=a[0]+dx*t,pz=a[2]+dz*t;
                const dist=Math.hypot(stem.position.x-px,stem.position.z-pz);
                if(!best||dist<best.dist)best={dist,px,pz,dx,dz};
            }
            if(best&&best.dist<2.7){
                const norm=Math.hypot(best.dx,best.dz),side=((i%2)*2-1);
                const nx=-best.dz/norm*side,nz=best.dx/norm*side;
                const tx=best.px+nx*3.9,tz=best.pz+nz*3.9;
                const ox=tx-stem.position.x,oz=tz-stem.position.z;
                stem.position.x+=ox;stem.position.z+=oz;
                if(crown){crown.position.x+=ox;crown.position.z+=oz;}
            }
        }
    });

}

export function createDragonRestVisuals(scene) {
  const before = new Set(scene.meshes);
  const root = new BABYLON.TransformNode('dragon-rest-map-root', scene);
  const beforeNodes = new Set(scene.transformNodes);
  const ctx = crearContexto(scene);
  crearTerreno(ctx); crearLlegada(ctx); crearA1(ctx); crearConexionA1A2(ctx); crearA2(ctx);
  crearCaminoSuperior(ctx); crearA3(ctx); crearA4(ctx); crearAccesoTemplo(ctx); crearA5(ctx);
  crearAmbiente(ctx); crearCostaAmpliada(ctx); crearDetalles(ctx);
  crearHubExpandidoV4(ctx); crearRelieveV41(ctx); crearRelieveV51(ctx);
  applyVisualPatchV52(ctx);

  // Align the six V2 door openings with the VTT's 1.5 m cell centers.
  // The source navigation graph found the original 1.70 m openings passable
  // only through off-grid waypoints; widening each opening by 0.30 m gives
  // the existing movement system a real, collision-free threshold cell.
  const a1Cells = [
    ['A1_GUEST', -29.2], ['A1_TARAK', -23.5], ['A1_VARNOTH', -17.8],
    ['A1_MYLA', -12.1], ['A1_KOBOLDS_W', -6.4], ['A1_KOBOLDS_E', -0.7]
  ];
  for (const [index, [id, centerX]] of a1Cells.entries()) {
    const west = scene.getMeshByName(`${id}_ENTRY_W`);
    const east = scene.getMeshByName(`${id}_ENTRY_E`);
    const lintel = scene.getMeshByName(`${id}_LINTEL`);
    const threshold = scene.getMeshByName(`V52_A1_CELL_THRESHOLD_${index}`);
    if (west && east && lintel && threshold) {
      west.scaling.x *= 1.63 / 1.78;
      east.scaling.x *= 1.63 / 1.78;
      west.position.x = centerX - 1.815;
      east.position.x = centerX + 1.815;
      lintel.scaling.x *= 2 / 1.70;
      threshold.scaling.x *= 2 / 1.62;
    }
  }

  for (const key of ['grid', 'labels', 'markers', 'spawns', 'player', 'navGrid', 'navBlocked', 'navPreview'])
    for (const mesh of ctx.group[key] ?? []) mesh.dispose(false, false);
  for (const key of ['upperRoof', 'houseRoof', 'templeRoof'])
    // Roofs share paint with floors, walls and furniture. Removing a roof
    // must preserve those materials for every camera orientation.
    for (const mesh of ctx.group[key] ?? []) mesh.dispose(false, false);
  if (ctx.doorPivot) ctx.doorPivot.rotation.y = -Math.PI / 2;

  const candidates = scene.meshes.filter(mesh => !before.has(mesh) && !mesh.parent
    && mesh.material && mesh.material.alpha >= .99 && !mesh.isLinesMesh
    && !mesh.name.includes('A4_REINFORCED_DOOR') && !mesh.name.startsWith('A1_VARNOTH_ENTRY_'));
  const sharedMaterials = new Map();
  const materialColor = color => color?.asArray?.().map(value => Math.round(value * 100_000) / 100_000) ?? null;
  for (const mesh of candidates) {
    const material = mesh.material;
    if (material.getClassName() !== 'StandardMaterial') continue;
    const textures = ['diffuseTexture', 'ambientTexture', 'opacityTexture', 'reflectionTexture',
      'emissiveTexture', 'specularTexture', 'bumpTexture', 'lightmapTexture', 'refractionTexture'];
    if (textures.some(property => material[property])) continue;
    const provenance = mesh.metadata?.canon === true ? 'canon' : mesh.metadata?.vtt_ambience === true ? 'ambience' : 'unspecified';
    const signature = JSON.stringify({
      diffuse: materialColor(material.diffuseColor), emissive: materialColor(material.emissiveColor),
      specular: materialColor(material.specularColor), ambient: materialColor(material.ambientColor),
      alpha: material.alpha, backFaceCulling: material.backFaceCulling,
      disableLighting: material.disableLighting, wireframe: material.wireframe,
      pointsCloud: material.pointsCloud, fillMode: material.fillMode
    });
    const key = `${provenance}:${signature}`;
    const shared = sharedMaterials.get(key);
    if (shared) mesh.material = shared;
    else sharedMaterials.set(key, material);
  }
  const groups = new Map();
  for (const mesh of candidates) {
    const provenance = mesh.metadata?.canon === true ? 'canon' : mesh.metadata?.vtt_ambience === true ? 'ambience' : 'unspecified';
    const attributes = mesh.getVerticesDataKinds().sort().join(',');
    const key = `${provenance}:${mesh.material.uniqueId}:${mesh.isVisible ? 'shown' : 'hidden'}:${attributes}`;
    groups.set(key, [...(groups.get(key) ?? []), mesh]);
  }
  let mergedCount = 0;
  for (const [key, meshes] of groups) {
    if (meshes.length < 2) continue;
    let merged;
    try { merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true); }
    catch { continue; }
    if (!merged) continue;
    merged.name = `dragon-rest-static:${mergedCount++}`;
    merged.metadata = { visualOnly: true, provenance: key.split(':')[0], sourceMeshCount: meshes.length };
    merged.isPickable = false;
  }
  const imported = scene.meshes.filter(mesh => !before.has(mesh));
  for (const mesh of imported) {
    mesh.isPickable = false;
    if (!mesh.parent) mesh.parent = root;
  }
  for (const node of scene.transformNodes) if (node !== root && !beforeNodes.has(node) && !node.parent) node.parent = root;
  root.position.set(96, 0, 91.5);
  const door = ctx.doorPivot;
  return {
    root,
    openLibraryDoor(open) { if (door) door.rotation.y = open ? 0 : -Math.PI / 2; },
    stats: { sourceMeshes: imported.length, mergedBatches: mergedCount,
      source: 'Retiro_Dragon_V5_2', tileMeters: 1.5 }
  };
}
