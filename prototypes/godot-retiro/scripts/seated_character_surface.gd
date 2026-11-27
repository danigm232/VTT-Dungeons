extends MeshInstance3D

var _surface := ImmediateMesh.new()
var _material := StandardMaterial3D.new()
var _last_camera := Transform3D.IDENTITY
var _last_projection := Projection()
var _last_pelvis := Vector3.INF
var _last_feet := Vector3.INF
var _last_hand_target := Vector3.INF
var _last_drape_radius := 0.0
var _last_texture: Texture2D
var _last_size := Vector2.ZERO

func _ready() -> void:
	mesh = _surface
	material_override = _material
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	_material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	_material.alpha_scissor_threshold = 0.5

func fit(sprite: Sprite3D, camera: Camera3D, pivot: Vector2, sole: Vector2,
		feet_world: Vector3, facing: Vector3, hand: Vector2 = Vector2.INF,
		hand_world: Vector3 = Vector3.INF, drape_radius: float = 0.0) -> void:
	var size := sprite.get_item_rect().size * sprite.pixel_size
	var pelvis := global_position
	var camera_transform := camera.get_camera_transform()
	var projection := camera.get_camera_projection()
	layers = sprite.layers
	_material.albedo_color = sprite.modulate
	_material.albedo_texture = sprite.texture
	if camera_transform == _last_camera and projection == _last_projection and pelvis == _last_pelvis and feet_world == _last_feet and hand_world == _last_hand_target and drape_radius == _last_drape_radius and sprite.texture == _last_texture and size == _last_size:
		return
	_last_camera = camera_transform
	_last_projection = projection
	_last_pelvis = pelvis
	_last_feet = feet_world
	_last_hand_target = hand_world
	_last_drape_radius = drape_radius
	_last_texture = sprite.texture
	_last_size = size

	var right := camera_transform.basis.x
	right.y = 0.0
	right = right.normalized()
	var back := camera_transform.basis.z
	var front_edge := (feet_world - pelvis).dot(facing) - 0.018
	var knee := pelvis + facing * front_edge + Vector3.UP * 0.022
	var knee_row := lerpf(pivot.y, sole.y, 0.18)
	var art_sole := pelvis + right * ((sole.x - pivot.x) * size.x) + Vector3.UP * ((pivot.y - sole.y) * size.y)
	var adjust := camera.unproject_position(feet_world) - camera.unproject_position(art_sole)
	# Keep the boot silhouette and the bend of the authored limb. A limited
	# vertical adjustment allows for the height of this particular seat.
	var art_height := camera.unproject_position(pelvis + Vector3.UP * size.y).distance_to(camera.unproject_position(pelvis))
	adjust.x = 0.0
	adjust.y = clampf(adjust.y, -art_height * 0.11, art_height * 0.11)
	if hand.is_finite() and hand_world.is_finite():
		var viewed_from_behind := camera.project_ray_normal(camera.unproject_position(pelvis)).dot(facing) > 0.25
		_fit_hand_contact(camera, right, size, pivot, sole, hand, hand_world, feet_world, knee, knee_row, adjust,
			drape_radius if viewed_from_behind else 0.0)
		return
	_surface.clear_surfaces()
	_surface.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP)
	for v: float in [0.0, pivot.y, knee_row, 1.0]:
		var ground_weight := clampf((v - pivot.y) / (sole.y - pivot.y), 0.0, 1.0)
		var is_leg := v >= knee_row
		var support := knee if v == knee_row else feet_world
		for u: float in [0.0, 1.0]:
			var point := pelvis + right * ((u - pivot.x) * size.x) + Vector3.UP * ((pivot.y - v) * size.y)
			if is_leg:
				var screen := camera.unproject_position(point) + adjust * ground_weight
				# Keep the outline in its drawn plane on screen while giving the
				# thighs and boots different depths for occlusion by the seat.
				var depth := (camera_transform.origin - support).dot(back)
				point = camera.project_position(screen, depth)
				var ray := camera.project_ray_normal(screen)
				var toward_front := -ray.dot(facing)
				if toward_front > 0.33:
					var overlap := front_edge - (point - pelvis).dot(facing)
					point -= ray * maxf(0.0, overlap / toward_front)
			_surface.surface_set_uv(Vector2(u, v))
			_surface.surface_add_vertex(to_local(point))
	_surface.surface_end()

func _fit_hand_contact(camera: Camera3D, right: Vector3, size: Vector2, pivot: Vector2, sole: Vector2,
		hand: Vector2, target: Vector3, feet: Vector3, knee: Vector3, knee_row: float, adjust: Vector2,
		drape_radius: float) -> void:
	var pelvis := global_position
	var hand_at_rest := pelvis + right * ((hand.x - pivot.x) * size.x) + Vector3.UP * ((pivot.y - hand.y) * size.y)
	var reach := target - hand_at_rest
	var camera_frame := camera.get_camera_transform()
	var columns: Array[float] = [0.0, 0.12, 0.24, 0.36, 0.48, 0.60, 0.72, 0.84, 1.0, hand.x]
	var rows: Array[float] = [0.0, 0.15, 0.25, 0.35, 0.45, 0.55, pivot.y, knee_row, 1.0, hand.y]
	if drape_radius > 0.0:
		for value: float in [0.06, 0.18, 0.30, 0.42, 0.54, 0.66, 0.78, 0.90, 0.96]:
			columns.append(value)
		for index: int in range(9):
			rows.append(lerpf(pivot.y - 0.06, sole.y, float(index) / 8.0))
	columns.sort()
	rows.sort()
	var positions := PackedVector3Array()
	for v: float in rows:
		for u: float in columns:
			var point := pelvis + right * ((u - pivot.x) * size.x) + Vector3.UP * ((pivot.y - v) * size.y)
			if v >= knee_row:
				var ground_weight := clampf((v - pivot.y) / (sole.y - pivot.y), 0.0, 1.0)
				var screen := camera.unproject_position(point) + adjust * ground_weight
				var support := knee if v == knee_row else feet
				point = camera.project_position(screen, (camera_frame.origin - support).dot(camera_frame.basis.z))
			elif v < pivot.y:
				# Move the contact patch toward the page while the waist and feet stay planted.
				var falloff := Vector2((u - hand.x) / 0.37, (v - hand.y) / 0.23).length()
				point += reach * (1.0 - smoothstep(0.0, 1.0, falloff))
			if drape_radius > 0.0 and v >= pivot.y - 0.06 and v < sole.y:
				point = _drape_around_stool(camera, point, pelvis, feet.y, drape_radius)
			positions.append(to_local(point))
	_surface.clear_surfaces()
	_surface.surface_begin(Mesh.PRIMITIVE_TRIANGLES)
	for y: int in range(rows.size() - 1):
		for x: int in range(columns.size() - 1):
			for corner: Vector2i in [Vector2i(x, y), Vector2i(x + 1, y), Vector2i(x, y + 1),
					Vector2i(x + 1, y), Vector2i(x + 1, y + 1), Vector2i(x, y + 1)]:
				_surface.surface_set_uv(Vector2(columns[corner.x], rows[corner.y]))
				_surface.surface_add_vertex(positions[corner.y * columns.size() + corner.x])
	_surface.surface_end()

func _drape_around_stool(camera: Camera3D, point: Vector3, support: Vector3, floor_y: float, radius: float) -> Vector3:
	var screen := camera.unproject_position(point)
	var origin := camera.project_ray_origin(screen)
	var ray := camera.project_ray_normal(screen)
	if ray.y >= -0.001:
		return point
	var horizontal := Vector2(ray.x, ray.z)
	var offset := Vector2(origin.x - support.x, origin.z - support.z)
	var closest := -offset.dot(horizontal) / horizontal.length_squared()
	var miss := (offset + horizontal * closest).length_squared()
	var padded_radius := radius + 0.018
	if miss >= padded_radius * padded_radius:
		return point
	var half_span := sqrt((padded_radius * padded_radius - miss) / horizontal.length_squared())
	var entry := maxf(closest - half_span, (origin.y - support.y - 0.015) / -ray.y)
	var exit := minf(closest + half_span, (origin.y - floor_y) / -ray.y)
	var depth := (point - origin).dot(ray)
	if entry > exit or depth <= entry:
		return point
	# Keep the silhouette at the same screen coordinates, with the cloth on the near face of the support.
	return origin + ray * (entry - 0.008)

func sync_color(color: Color) -> void:
	_material.albedo_color = color
