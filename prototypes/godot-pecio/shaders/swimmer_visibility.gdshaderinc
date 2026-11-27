uniform vec4 swimmers[3];

float swimmer_visibility_at(vec3 surface_point, vec3 world_ray) {
	float visibility = 0.0;
	for (int i = 0; i < 3; i++) {
		vec4 swimmer = swimmers[i];
		if (swimmer.w > 0.0) {
			vec3 offset = swimmer.xyz - surface_point;
			float along_ray = dot(offset, world_ray);
			float radius = swimmer.w;
			float sidestep = length(offset - world_ray * along_ray);
			float mask = 1.0 - smoothstep(radius * 0.6, radius * 1.22, sidestep);
			visibility = max(visibility, mask * smoothstep(-radius, 0.15, along_ray));
		}
	}
	return visibility;
}
