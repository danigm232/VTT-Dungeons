shader_type spatial;
render_mode cull_disabled;
varying vec3 world_point;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void vertex(){world_point=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}
void fragment(){
 vec3 p=world_point*18.0;
 float grain=hash(floor(p*8.0));
 float ridge=.5+.5*sin(p.y*5.0+sin(p.x*8.0+p.z*7.0)*2.0);
 float fissure=smoothstep(.82,.98,ridge);
 ALBEDO=mix(vec3(.29,.20,.11),vec3(.48,.36,.18),ridge*.55+grain*.13);
 ALBEDO=mix(ALBEDO,vec3(.12,.095,.05),fissure*.6);
 ROUGHNESS=.95;
}
