shader_type canvas_item;
render_mode blend_mul;

uniform vec4 ink_tint : source_color = vec4(0.24, 0.14, 0.07, 1.0);
uniform float ink_strength : hint_range(0.0, 1.5) = 0.96;
uniform float edge_softness : hint_range(0.02, 0.45) = 0.18;
uniform vec4 uv_bounds = vec4(0.0, 0.0, 1.0, 1.0);

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	// Convert artwork luminance + alpha into pure sepia ink coverage.
	float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
	float raw_ink = clamp((1.0 - lum * 0.85) * 1.55, 0.0, 1.0) * pow(tex.a, 0.82);
	// Organic paper-grain modulation so strokes feel absorbed into aged vellum fibers.
	float grain = 0.84 + 0.30 * value_noise(UV * 42.0);
	float fine = 0.90 + 0.18 * value_noise(UV * 140.0);
	// Soft irregular radial/edge fade along visible bounds so zero rectangular edges ever appear.
	vec2 local_uv = clamp((UV - uv_bounds.xy) / max(vec2(0.001), uv_bounds.zw - uv_bounds.xy), 0.0, 1.0);
	vec2 edge_d = min(local_uv, 1.0 - local_uv);
	float organic_jitter = (value_noise(local_uv * 11.0) - 0.5) * 0.075;
	float edge_x = smoothstep(0.0, edge_softness, edge_d.x + organic_jitter);
	float edge_y = smoothstep(0.0, edge_softness, edge_d.y + organic_jitter);
	float mask = edge_x * edge_y;
	float coverage = clamp(raw_ink * ink_strength * COLOR.a * mask * grain * fine, 0.0, 0.92);
	// Multiply mode: white (1,1,1) leaves parchment untouched; sepia darkens fibers natively.
	vec3 result = mix(vec3(1.0), ink_tint.rgb, coverage);
	COLOR = vec4(result, 1.0);
}
