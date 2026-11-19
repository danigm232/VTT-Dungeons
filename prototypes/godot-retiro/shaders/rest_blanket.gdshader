shader_type spatial;
render_mode cull_disabled, specular_disabled;

uniform sampler2D woven_wool : source_color, filter_linear_mipmap_anisotropic, repeat_enable;

void fragment() {
	vec3 weave = texture(woven_wool, UV * vec2(1.7, 2.0)).rgb;
	float detail = dot(weave, vec3(0.2126, 0.7152, 0.0722));
	ALBEDO = COLOR.rgb * mix(0.59, 1.18, detail);
	ROUGHNESS = 0.96;
}
