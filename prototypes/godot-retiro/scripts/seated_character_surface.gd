extends MeshInstance3D

var _surface := ImmediateMesh.new()
var _material := StandardMaterial3D.new()
var _last_camera := Transform3D.IDENTITY
var _last_projection := Projection()
var _last_pelvis := Vector3.INF
var _last_feet := Vector3.INF
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
		feet_world: Vector3, facing: Vector3) -> void:
	var size := sprite.get_item_rect().size * sprite.pixel_size
	var pelvis := global_position
	var camera_transform := camera.get_camera_transform()
	var projection := camera.get_camera_projection()
	layers = sprite.layers
	_material.albedo_color = sprite.modulate
	_material.albedo_texture = sprite.texture
	if camera_transform == _last_camera and projection == _last_projection and pelvis == _last_pelvis and feet_world == _last_feet and sprite.texture == _last_texture and size == _last_size:
		return
	_last_camera = camera_transform
	_last_projection = projection
	_last_pelvis = pelvis
	_last_feet = feet_world
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

func sync_color(color: Color) -> void:
	_material.albedo_color = color
