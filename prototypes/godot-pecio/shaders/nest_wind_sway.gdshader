shader_type spatial;
render_mode cull_disabled, specular_schlick_ggx;

// Shader ligero compartido para paja seca, plumas y ramas flexibles del Nido de la Arpía (C1/C10)
// Permite movimiento suave por viento, flexión localizada al aterrizar la arpía y control de exposición.

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec4 tint_color : source_color = vec4(0.68, 0.56, 0.34, 1.0);
uniform float roughness_val = 0.94;
uniform float wind_speed = 1.65;
uniform float wind_amp = 0.018;
uniform float landing_flex = 0.0;
uniform float occlusion_alpha = 1.0;

varying vec3 v_world_pos;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float weight = clamp(UV.y, 0.0, 1.0);
	float phase = wp.x * 2.3 + wp.z * 1.9;
	float gust = sin(TIME * wind_speed + phase) * 0.65 + cos(TIME * (wind_speed * 1.73) - wp.z * 2.7) * 0.35;
	VERTEX.x += gust * wind_amp * weight;
	VERTEX.z += sin(TIME * (wind_speed * 0.9) + wp.x * 1.7) * (wind_amp * 0.7) * weight;
	// Ligera flexión vertical y radial cuando la arpía aterriza en el nido
	VERTEX.y -= landing_flex * 0.045 * weight;
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	if (occlusion_alpha < 0.98) {
		// Dither ordenado ligero cuando ramas en primer plano tapan un personaje en cámara 2.5D
		vec2 p = mod(floor(FRAGCOORD.xy), 2.0);
		float thresh = (p.x + p.y * 2.0) * 0.25 + 0.125;
		if (occlusion_alpha < thresh) {
			discard;
		}
	}
	vec3 tex_c = texture(albedo_tex, UV * 1.6).rgb;
	ALBEDO = tex_c * tint_color.rgb;
	ROUGHNESS = roughness_val;
	METALLIC = 0.0;
	SPECULAR = 0.05;
}
