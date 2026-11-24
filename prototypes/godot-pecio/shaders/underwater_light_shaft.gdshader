shader_type spatial;
render_mode blend_add, depth_draw_never, cull_back, unshaded;

// Haces volumétricos subacuáticos AAA con atenuación Fresnel en bordes, caída vertical y cáusticas animadas
uniform vec4 shaft_color : source_color = vec4(0.24, 0.76, 0.86, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 0.22;
uniform float speed : hint_range(0.1, 3.0) = 0.65;

void fragment() {
	// Atenuación Fresnel suave: elimina completamente el borde rígido de cono plástico desde cualquier cámara
	float ndotv = abs(dot(normalize(NORMAL), normalize(VIEW)));
	float edge_fade = pow(clamp(ndotv, 0.0, 1.0), 2.65);

	// En Godot 4 CylinderMesh mapea el cuerpo lateral en UV.y ∈ [0.0, 0.5]; normalizar a [0, 1]
	// garantiza disolución completa (alpha = 0) antes del borde inferior y evita el óvalo recortado.
	float y_u = clamp(UV.y * 2.0, 0.0, 1.0);
	float top_fade = smoothstep(0.0, 0.22, y_u);
	float bot_fade = 1.0 - smoothstep(0.42, 0.96, y_u);
	float v_fade = top_fade * bot_fade;

	// Rayos cáusticos animados deslizándose por la columna de agua / polvo húmedo
	float streak1 = sin(UV.x * 37.699 + TIME * speed * 1.15 + sin(y_u * 4.0 - TIME * speed * 0.7)) * 0.5 + 0.5;
	float streak2 = cos(UV.x * 62.831 - TIME * speed * 0.85 + y_u * 2.5) * 0.5 + 0.5;
	float streaks = 0.58 + 0.42 * pow(streak1 * 0.65 + streak2 * 0.35, 1.4);

	float alpha = clamp(edge_fade * v_fade * streaks * intensity, 0.0, 0.42);
	ALBEDO = shaft_color.rgb * (0.85 + 0.30 * streaks);
	ALPHA = alpha;
}
