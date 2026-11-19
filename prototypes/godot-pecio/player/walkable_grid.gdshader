shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
uniform vec4 line_color : source_color = vec4(0.78,0.81,0.76,1.0);
uniform float opacity = 0.22;
uniform float thickness = 1.0;
uniform bool contrast_mode = true;
uniform vec3 focus_position = vec3(0.0);
uniform float radius_meters = 50.0;
uniform float other_height_opacity = 0.3;
varying vec3 world_point;
varying vec4 surface_color;
void vertex() {
	world_point = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz;
	surface_color = COLOR;
	vec4 clip = PROJECTION_MATRIX * VIEW_MATRIX * vec4(world_point,1.0);
	vec4 end_clip = PROJECTION_MATRIX * VIEW_MATRIX * vec4(world_point + (MODEL_MATRIX * vec4(NORMAL,0.0)).xyz,1.0);
	vec2 direction = (end_clip.xy/end_clip.w - clip.xy/clip.w) * VIEWPORT_SIZE;
	vec2 side = normalize(vec2(-direction.y,direction.x) + vec2(0.00001));
	clip.xy += side * UV.y * thickness / VIEWPORT_SIZE * clip.w;
	POSITION = clip;
}
void fragment() {
	float distance_meters = length(world_point.xz-focus_position.xz);
	float fade = 1.0-smoothstep(max(0.0,radius_meters-4.0),radius_meters,distance_meters);
	float elevation = mix(1.0,other_height_opacity,smoothstep(0.5,1.5,abs(world_point.y-focus_position.y)));
	ALBEDO = contrast_mode ? surface_color.rgb : line_color.rgb;
	ALPHA = opacity * fade * elevation;
	if (ALPHA < 0.005) { discard; }
}
