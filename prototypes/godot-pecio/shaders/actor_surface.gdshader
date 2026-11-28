shader_type spatial;
render_mode cull_disabled, diffuse_lambert_wrap;

uniform sampler2D frame_texture : source_color, filter_linear_mipmap, repeat_disable;
uniform vec4 frame_region = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec4 silhouette = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec4 wet_lower = vec4(0.0);
uniform vec4 wet_upper = vec4(0.0);
uniform vec4 bounce_color : source_color = vec4(1.0);
uniform float bounce_energy = 0.20;

void vertex() {
	vec3 up = normalize(MODEL_MATRIX[1].xyz);
	vec3 cross_right = cross(up, MAIN_CAM_INV_VIEW_MATRIX[2].xyz);
	vec3 right = length(cross_right) > .001 ? normalize(cross_right) : MAIN_CAM_INV_VIEW_MATRIX[0].xyz;
	vec3 front = normalize(cross(right, up));
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		vec4(right * length(MODEL_MATRIX[0].xyz), 0.0),
		vec4(up * length(MODEL_MATRIX[1].xyz), 0.0),
		vec4(front, 0.0), MODEL_MATRIX[3]);
	MODELVIEW_NORMAL_MATRIX = mat3(VIEW_MATRIX) * mat3(right, up, front);
	if (!OUTPUT_IS_SRGB) {
		COLOR.rgb = mix(COLOR.rgb / 12.92, pow((COLOR.rgb + .055) / 1.055, vec3(2.4)), greaterThan(COLOR.rgb, vec3(.04045)));
	}
}

float moisture_at(int band) {
	return band < 4 ? wet_lower[band] : wet_upper[band - 4];
}

void fragment() {
	vec2 half_texel = .5 / vec2(textureSize(frame_texture, 0));
	vec2 uv = clamp(UV, frame_region.xy + half_texel, frame_region.xy + frame_region.zw - half_texel);
	vec4 frame = texture(frame_texture, uv);
	if (frame.a * COLOR.a < .5) { discard; }
	vec3 paint = frame.rgb * COLOR.rgb;
	float wet = 0.0;
	if (dot(wet_lower + wet_upper, vec4(1.0)) > .045) {
		vec2 frame_uv = (UV - frame_region.xy) / frame_region.zw;
		vec2 body_uv = (frame_uv - silhouette.xy) / max(silhouette.zw, vec2(.001));
		float level = clamp((.955 - body_uv.y) * 8.0, 0.0, 7.0);
		int band = int(floor(level));
		wet = mix(moisture_at(band), moisture_at(min(band + 1, 7)), smoothstep(.12, .88, fract(level)));
		float tone = dot(paint, vec3(.21, .72, .07));
		float fabric = smoothstep(.10, .45, tone);
		vec3 soaked = paint * vec3(.63, .73, .79) + vec3(.012, .023, .030) * (.42 + .58 * fabric);
		paint = mix(paint, soaked, wet);
	}
	// The painted sprite already carries form shading. A broad upward normal
	// picks up the sky without turning the character into a flat vertical card.
	NORMAL = normalize(NORMAL * .58 + mat3(VIEW_MATRIX) * vec3(0.0, .82, 0.0));
	ALBEDO = paint * .76;
	EMISSION = paint * bounce_color.rgb * bounce_energy;
	ROUGHNESS = mix(.94, .57, wet);
	SPECULAR = mix(.07, .15, wet);
}
