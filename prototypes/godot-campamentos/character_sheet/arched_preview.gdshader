shader_type canvas_item;
// A UI window mask. Original sprite alpha, equipment and actor materials are untouched.
void fragment() {
	vec4 sample_color = texture(TEXTURE, UV) * COLOR;
	vec2 oval = (UV - vec2(0.5, 0.31)) / vec2(0.465, 0.285);
	float edge = UV.y < 0.31 ? 1.0 - length(oval) : min(UV.x - 0.035, 0.965 - UV.x) * 2.0;
	float inside = smoothstep(0.0, 0.009, edge) * (1.0 - smoothstep(0.966, 0.978, UV.y));
	COLOR = vec4(sample_color.rgb, sample_color.a * inside);
}
