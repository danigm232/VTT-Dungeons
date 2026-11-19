shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;
uniform sampler2D source_tex : source_color, filter_linear_mipmap;
uniform vec4 source_region=vec4(0.0,0.0,1.0,1.0);
uniform vec2 source_pixels=vec2(256.0);
uniform vec4 visible_bounds=vec4(0.0,0.0,1.0,1.0);
uniform bool flip_h=false;
uniform int effect_bits=0;
uniform float clock=0.0;
uniform float intensity=0.8;
uniform vec4 weights_a=vec4(1.0);
uniform vec4 weights_b=vec4(1.0);
uniform float fear_weight=1.0;
uniform vec4 weights_c=vec4(0.0);
uniform vec4 weights_d=vec4(0.0);
uniform vec2 head_anchor=vec2(.5,.12);
uniform float inherited_alpha=1.0;
uniform int treatment=2;
uniform vec2 padding=vec2(.06);
uniform bool bound_mesh=false;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
float mineral_edges(vec2 p){vec2 cell=floor(p),f=fract(p);float nearest=10.0,second=10.0;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 offset=vec2(float(x),float(y));vec2 point=offset+vec2(hash(cell+offset),hash(cell+offset+vec2(41.7,13.9)))-f;float d=dot(point,point);if(d<nearest){second=nearest;nearest=d;}else if(d<second){second=d;}}}return second-nearest;}
vec4 source(vec2 uv){if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return vec4(0);vec2 half_px=.5/source_pixels;return texture(source_tex,source_region.xy+clamp(uv,half_px,1.0-half_px)*source_region.zw);}
void vertex(){
 if (!bound_mesh) {
  vec3 up=normalize(MODEL_MATRIX[1].xyz),right=normalize(cross(up,INV_VIEW_MATRIX[2].xyz)),back=normalize(cross(right,up));
  MODELVIEW_MATRIX=VIEW_MATRIX*mat4(vec4(right*length(MODEL_MATRIX[0].xyz),0),vec4(up*length(MODEL_MATRIX[1].xyz),0),vec4(back,0),MODEL_MATRIX[3]);
 }
}
void fragment(){
 vec2 uv=UV*(1.0+2.0*padding)-padding;if(flip_h)uv.x=1.0-uv.x;
 vec4 original=source(uv);float a=original.a;
 vec2 px=1.6/source_pixels;
 float outer=max(max(source(uv+vec2(px.x,0)).a,source(uv-vec2(px.x,0)).a),max(source(uv+vec2(0,px.y)).a,source(uv-vec2(0,px.y)).a));
 float rim=max(outer-a,0.0);
 if(treatment==0)a=0.0;
 if(treatment==1)rim=0.0;
 vec2 q=(uv-visible_bounds.xy)/max(visible_bounds.zw,vec2(.001));
 float grain=noise(q*38.0),cloud=noise(q*7.0+vec2(0,clock*.13));
 vec2 head=(q-head_anchor)*vec2(1.0,.85);float head_mask=1.0-smoothstep(.09,.19,length(head));
 vec3 color=vec3(0);float coverage=0.0;
 if((effect_bits&1)!=0){vec3 previous_color=color;float previous_coverage=coverage;float veins=pow(1.0-abs(sin(q.x*36.0+noise(q*12.0)*9.0+q.y*13.0)),16.0);float stain=smoothstep(.38,.75,cloud)*.32;float k=(veins*.8+stain)*a; color+=vec3(.31,.69,.12)*k;coverage+=k; color+=vec3(.48,.85,.2)*rim*.75;coverage+=rim*.75;color=mix(previous_color,color,weights_a.x);coverage=mix(previous_coverage,coverage,weights_a.x);}

 if((effect_bits&4)!=0){vec3 previous_color=color;float previous_coverage=coverage;float facets=pow(1.0-abs(sin(q.x*61.0+q.y*45.0)),14.0)*smoothstep(.5,.9,grain);float k=(facets*.85+smoothstep(.62,.82,cloud)*.22)*a; color+=vec3(.39,.76,.96)*k+vec3(.65,.94,1)*rim;coverage+=k+rim;color=mix(previous_color,color,weights_a.z);coverage=mix(previous_coverage,coverage,weights_a.z);}
 if((effect_bits&8)!=0){vec3 previous_color=color;float previous_coverage=coverage;float cracks=pow(1.0-abs(sin(q.x*51.0+noise(q*9.0)*13.0)),18.0);float k=(.25+grain*.18)*a;color+=mix(original.rgb*.22,vec3(.8,.25,.055),cracks*(.55+.1*sin(clock)))*k;coverage+=k;color=mix(previous_color,color,weights_a.w);coverage=mix(previous_coverage,coverage,weights_a.w);}
 if((effect_bits&16)!=0){vec3 previous_color=color;float previous_coverage=coverage;float veins=pow(1.0-abs(sin(q.x*43.0+noise(q*8.0)*11.0+q.y*17.0)),20.0);float k=veins*a*.85;color+=vec3(.12,.035,.20)*k+vec3(.49,.24,.68)*rim*.6;coverage+=k+rim*.6;color=mix(previous_color,color,weights_b.x);coverage=mix(previous_coverage,coverage,weights_b.x);}
 if((effect_bits&32)!=0){vec3 previous_color=color;float previous_coverage=coverage;float k=rim*(.65+.15*sin(q.y*20.0+clock));color+=vec3(.43,.80,.88)*k;coverage+=k;color=mix(previous_color,color,weights_b.y);coverage=mix(previous_coverage,coverage,weights_b.y);}
 if((effect_bits&64)!=0){vec3 previous_color=color;float previous_coverage=coverage;float lightning=pow(1.0-abs(sin(q.x*27.0+floor(q.y*22.0)*1.8)),25.0);float k=lightning*a*(.72+.12*sin(clock*2.0));color+=vec3(.38,.65,1.0)*k+vec3(.48,.75,1)*rim*.8;coverage+=k+rim*.8;color=mix(previous_color,color,weights_b.z);coverage=mix(previous_coverage,coverage,weights_b.z);}
 if((effect_bits&128)!=0){vec3 previous_color=color;float previous_coverage=coverage;float knot=pow(.5+.5*cos(q.y*31.0+q.x*8.0-clock*.5),9.0);float k=(knot*.22)*a+rim*.75;color+=vec3(.88,.29,.56)*k;coverage+=k;color=mix(previous_color,color,weights_b.w);coverage=mix(previous_coverage,coverage,weights_b.w);}
 if((effect_bits&256)!=0){vec3 previous_color=color;float previous_coverage=coverage;float k=(smoothstep(.42,.7,cloud)*.24)*a+rim*.45;color+=vec3(.28,.18,.48)*k;coverage+=k;color=mix(previous_color,color,fear_weight);coverage=mix(previous_coverage,coverage,fear_weight);}
 if((effect_bits&512)!=0){float band=exp(-pow((head.y-.015)*29.0,2.0))*head_mask;float k=band*a*.80*weights_c.x;color+=vec3(.09,.075,.14)*k+vec3(.57,.43,.74)*rim*head_mask*.4*weights_c.x;coverage+=k+rim*head_mask*.4*weights_c.x;}
 if((effect_bits&1024)!=0){float arcs=pow(.5+.5*sin(length(head*vec2(1.7,1.0))*100.0-clock*.5),12.0);float side=smoothstep(.045,.09,abs(head.x))*head_mask;float k=(a*.22+rim*.9)*side*arcs*weights_c.y;color+=vec3(.72,.68,.37)*k;coverage+=k;}
 if((effect_bits&2048)!=0){float spiral=pow(.5+.5*cos(atan(head.y,head.x)*3.0+length(head)*90.0-clock*.8),16.0);float k=(spiral*.55*a+rim*.6)*head_mask*weights_c.z;color+=vec3(.95,.73,.30)*k;coverage+=k;}
 if((effect_bits&4096)!=0){float k=(a*.19+rim*.32)*(.85+.08*sin(clock*1.2))*weights_c.w;color+=vec3(.20,.30,.43)*k;coverage+=k;}
 if((effect_bits&8192)!=0){float k=a*(grain*.14+smoothstep(.42,.75,cloud)*.2)*weights_d.x;color+=vec3(.39,.30,.24)*k;coverage+=k;}
 if((effect_bits&16384)!=0){float k=(a*.11+rim*.27)*weights_d.y;color+=vec3(.46,.38,.52)*k;coverage+=k;}
 if((effect_bits&32768)!=0){float ground=smoothstep(.65,.95,q.y);float k=(a*.12+rim*.30)*ground*weights_d.z;color+=vec3(.56,.48,.34)*k;coverage+=k;}
 if((effect_bits&65536)!=0){float k=(a*.20*cloud+rim*.17)*weights_d.w;color+=vec3(.12,.20,.23)*k;coverage+=k;}
 // Stone is the highest-priority material: it covers the underlying effects
 // proportionally, while partial petrification still permits a readable mix.
 if((effect_bits&2)!=0){float cracks=1.0-smoothstep(.007,.032,mineral_edges(q*14.0));float grey=dot(original.rgb,vec3(.3,.59,.11));float k=a*.97+rim*.5; vec3 mineral=mix(vec3(.46,.49,.47)*(grey+.4)*(.88+grain*.17),vec3(.10,.13,.14),cracks*.68);color=mix(color,mineral*k,weights_a.y);coverage=mix(coverage,k,weights_a.y);}
 float effective_alpha=max(inherited_alpha,weights_b.y*.65);
 coverage=clamp(coverage,0.0,.98)*intensity*effective_alpha;
 if(coverage<.005)discard;
 ALBEDO=clamp(color/max(coverage/max(intensity*effective_alpha,.001),.001),vec3(0),vec3(1));ALPHA=coverage;
}
