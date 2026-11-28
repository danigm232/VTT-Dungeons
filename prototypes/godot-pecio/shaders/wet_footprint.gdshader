shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, shadows_disabled, blend_mul;

varying vec3 print_data;

void vertex() {
	print_data = INSTANCE_CUSTOM.xyz;
}

float footprint(vec2 uv, float side) {
	vec2 sole = (uv - vec2(.5)) * vec2(2.9, 2.38);
	sole.x *= side < .25 ? 1.0 : -1.0;
	float toe = length(vec2(sole.x * 1.04, (sole.y + .34) * 1.38));
	float heel = length(vec2(sole.x * 1.2, (sole.y - .56) * 1.85));
	float arch = length(vec2((sole.x - .17) * 1.90, (sole.y - .08) * 1.57));
	float shape = 1.0 - smoothstep(.52, .99, min(toe, min(heel, arch)));
	float tread = mix(.72, 1.0, smoothstep(-.45, .18, sin((sole.y + abs(sole.x) * .23) * 22.0)));
	return shape * tread;
}

void fragment() {
	float damp;
	vec3 water_color = vec3(.28, .39, .42);
	if (print_data.z > .5) {
		vec2 p = (UV - vec2(.5)) * 2.0;
		float angle = atan(p.y, p.x + .0001);
		float border = .79 + .09 * sin(angle * 3.0 + 8.0 * print_data.y) + .08 * sin(angle * 7.0);
		float distance_to_edge = border - length(p);
		float shape = smoothstep(0.0, .12, distance_to_edge);
		float reflections = smoothstep(.03, .13, distance_to_edge)
			* (1.0 - smoothstep(.13, .21, distance_to_edge))
			* smoothstep(.16, .80, sin(angle - .7));
		damp = print_data.x * shape;
		water_color = mix(vec3(.46, .58, .61), vec3(1.13, 1.29, 1.35), reflections);
	} else {
		damp = print_data.x * footprint(UV, print_data.y);
	}
	if (damp < .012) { discard; }
	ALBEDO = mix(vec3(1.0), water_color, damp);
	ALPHA = 1.0;
}
