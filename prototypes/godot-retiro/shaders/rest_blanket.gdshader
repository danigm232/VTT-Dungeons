shader_type spatial;
render_mode cull_disabled, specular_disabled;

uniform sampler2D woven_wool : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float breath_height = 0.0;
uniform float breath_phase = 0.0;

void vertex() {
	float chest = smoothstep(0.0, 0.09, UV.y) * (1.0 - smoothstep(0.15, 0.37, UV.y));
	float center = 1.0 - smoothstep(0.08, 0.5, abs(UV.x - 0.5));
	VERTEX.y += chest * center * breath_height * (0.5 + 0.5 * sin(TIME * 1.85 + breath_phase));
}

void fragment() {
	vec3 weave = texture(woven_wool, UV * vec2(1.7, 2.0)).rgb;
	float detail = dot(weave, vec3(0.2126, 0.7152, 0.0722));
	ALBEDO = COLOR.rgb * mix(0.59, 1.18, detail);
	ROUGHNESS = 0.96;
}
