shader_type spatial;
render_mode cull_disabled, depth_draw_always, specular_schlick_ggx;

// Shader de Velas Rasgadas y Lona Envejecida Triple-A (Fase AAA-2)
// Simula el flameo orgánico, jirones, agujeros de metralla y trama de lona gastada

uniform vec4 albedo_color : source_color = vec4(0.78, 0.73, 0.63, 1.0);
uniform vec4 dirt_color : source_color = vec4(0.36, 0.30, 0.22, 1.0);
uniform vec3 wind_direction = vec3(0.85, 0.0, 0.45);
uniform float wind_speed : hint_range(0.2, 4.0) = 2.1;
uniform float wind_amplitude : hint_range(0.02, 0.5) = 0.18;
uniform float tear_flutter : hint_range(0.05, 1.0) = 0.35;
uniform float rain_wetness = 0.0;

void vertex() {
	vec3 norm_wind = normalize(wind_direction);

	// Ondulación principal de la vela
	float wave1 = sin(VERTEX.x * 0.9 + VERTEX.y * 1.3 + TIME * wind_speed);
	float wave2 = cos(VERTEX.z * 1.2 - VERTEX.y * 0.8 + TIME * (wind_speed * 0.8));

	// Aleteo rápido de jirones y extremos rotos de tela
	float flutter = sin(VERTEX.x * 5.0 + TIME * (wind_speed * 3.5)) * cos(VERTEX.y * 6.0 - TIME * (wind_speed * 2.6));

	// Mayor amplitud en los extremos inferiores colgantes
	float flexibility = clamp(1.0 - (VERTEX.y * 0.09), 0.25, 1.5);

	vec3 displacement = norm_wind * ((wave1 + wave2 * 0.5) * wind_amplitude + flutter * tear_flutter * 0.12) * flexibility;
	VERTEX += displacement;
}

void fragment() {
	// Desgarros procedurales en el borde inferior
	float tear_shape = sin(UV.x * 15.0) * 0.13 + cos(UV.x * 37.0) * 0.07 + sin(UV.x * 65.0) * 0.035;
	float bottom_cutoff = 0.76 + tear_shape;

	// Agujeros de metralla y desgarros en el cuerpo de la tela
	float hole1 = length((UV - vec2(0.32, 0.52)) * vec2(1.0, 1.9));
	float hole2 = length((UV - vec2(0.68, 0.38)) * vec2(1.3, 1.6));
	float hole3 = length((UV - vec2(0.52, 0.65)) * vec2(0.9, 2.2));
	float hole4 = length((UV - vec2(0.18, 0.62)) * vec2(1.1, 1.7));

	if (UV.y > bottom_cutoff || hole1 < 0.075 || hole2 < 0.06 || hole3 < 0.07 || hole4 < 0.05) {
		discard;
	}

	// Costuras verticales de paño marinero
	float seams = smoothstep(0.04, 0.0, abs(fract(UV.x * 4.0) - 0.5));

	// Manchas de salitre, humedad marina y moho
	float grime = pow(UV.y, 1.5) * 0.5 + seams * 0.22;
	vec3 base_rgb = mix(albedo_color.rgb, dirt_color.rgb, clamp(grime, 0.0, 0.80));

	ALBEDO = base_rgb * mix(1.0, 0.72, rain_wetness);
	ROUGHNESS = 0.92;
	METALLIC = 0.0;
	SPECULAR = 0.12;

	// Efecto translúcido (Rim lighting) para simular la luz solar a través de lona gastada
	RIM = 0.52;
	RIM_TINT = 0.70;
}
