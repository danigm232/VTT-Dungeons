shader_type spatial;
render_mode cull_disabled;
uniform vec4 base_color : source_color=vec4(.5,.4,.3,1);
uniform int effect_bits=0;
uniform float body_alpha=1.0;
uniform float amount=.8;
uniform vec4 weights_a=vec4(1.0);
uniform vec4 weights_b=vec4(1.0);
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void fragment(){
 vec3 c=base_color.rgb;float grain=hash(floor(UV*70.0));float veins=pow(1.0-abs(sin(UV.x*47.0+floor(UV.y*31.0)*1.7)),18.0);
 if((effect_bits&1)!=0)c=mix(c,vec3(.24,.51,.10),veins*.7*amount*weights_a.x);
 if((effect_bits&2)!=0)c=mix(c,vec3(dot(c,vec3(.3,.59,.11)))*(.65+grain*.3),amount*.9*weights_a.y);
 if((effect_bits&4)!=0)c=mix(c,vec3(.49,.77,.88),(veins*.8+grain*.15)*amount*weights_a.z);
 if((effect_bits&8)!=0)c=mix(c,vec3(.12,.07,.04),grain*amount*.7*weights_a.w);
 if((effect_bits&16)!=0)c=mix(c,vec3(.17,.035,.23),veins*amount*weights_b.x);
 ALBEDO=c;ROUGHNESS=(effect_bits&2)!=0?.95:.65;METALLIC=.18;ALPHA=base_color.a*body_alpha;
}
