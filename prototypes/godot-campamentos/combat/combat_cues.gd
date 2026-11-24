extends Node3D
## Transient world effects. The resolved event is the only input.
const Targeting = preload("res://combat/action_targeting.gd")
var profiles: Dictionary
var soft: Texture2D
var materials: Dictionary = {}

func _ready() -> void:
	profiles = JSON.parse_string(FileAccess.get_file_as_string("res://combat/visual_profiles.json"))

func color_for(action: Dictionary) -> Color:
	var action_id := str(action.get("id", "")).trim_suffix("-exploration")
	if profiles.actionColors.has(action_id): return Color(profiles.actionColors[action_id])
	var projectile: Dictionary = profiles.projectiles.get(action.get("animationType", ""), {})
	if projectile.has("color"): return Color(projectile.color)
	return Color("ffc68b") if action.get("damageType", "") == "fuego" else Color("f2dfb8")

func _material(color: Color) -> StandardMaterial3D:
	if not materials.has(color):
		var material := StandardMaterial3D.new()
		material.albedo_color = color
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		materials[color] = material
	return materials[color]

func _part(parent: Node3D, mesh: Mesh, position: Vector3, color: Color) -> void:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.position = position
	part.material_override = _material(color)
	part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(part)

func _projectile(animation: String, color: Color, reduced: bool) -> Node3D:
	var profile: Dictionary = profiles.projectiles[animation]
	var length: float = profile.length
	var model := Node3D.new()
	model.name = "CombatProjectile_" + str(profile.shape)
	if profile.shape == "arrow":
		var shaft := BoxMesh.new()
		shaft.size = Vector3(.035, .035, length)
		_part(model, shaft, Vector3.ZERO, Color("a98456"))
		var point := PrismMesh.new()
		point.size = Vector3(.13, .19, .035)
		var head := Node3D.new()
		head.position.z = -length * .48
		head.rotation.x = -PI * .5
		model.add_child(head)
		_part(head, point, Vector3.ZERO, color)
		var feather := BoxMesh.new()
		feather.size = Vector3(.14, .035, .13)
		_part(model, feather, Vector3(0, 0, length * .42), color)
	elif profile.shape == "blade":
		var blade := PrismMesh.new()
		blade.size = Vector3(.16, .04, length)
		_part(model, blade, Vector3(0, 0, -.08), color)
		var grip := BoxMesh.new()
		grip.size = Vector3(.05, .06, .18)
		_part(model, grip, Vector3(0, 0, .13), Color("9a6840"))
	else:
		var core := SphereMesh.new()
		core.radius = .11 if profile.shape == "ember" else .065
		core.height = length
		core.radial_segments = 10
		core.rings = 5
		var inner := Node3D.new()
		inner.rotation.x = PI * .5
		model.add_child(inner)
		_part(inner, core, Vector3.ZERO, color)
		if not reduced:
			var trail := BoxMesh.new()
			trail.size = Vector3(.038, .038, length * 1.5)
			_part(model, trail, Vector3(0, 0, length * .75), color.darkened(.46))
	add_child(model)
	return model

func launch(action: Dictionary, start: Vector3, finish: Vector3, flight: float, reduced: bool, contact: Callable) -> void:
	var animation := str(action.get("animationType", ""))
	if not profiles.projectiles.has(animation) or start.distance_squared_to(finish) < .02 or reduced:
		contact.call()
		return
	var model := _projectile(animation, color_for(action), reduced)
	model.global_position = start
	var direction := (finish - start).normalized()
	model.look_at(finish, Vector3.RIGHT if absf(direction.dot(Vector3.UP)) > .98 else Vector3.UP)
	var tween := model.create_tween()
	tween.tween_property(model, "global_position", finish, flight)
	tween.tween_callback(contact)
	tween.tween_callback(model.queue_free)

func has_projectile(animation: String) -> bool:
	return profiles.projectiles.has(animation)

func flash(point: Vector3, color: Color, diameter: float, reduced: bool, cue_name: String) -> void:
	var glow := Sprite3D.new()
	glow.name = cue_name
	glow.texture = soft
	glow.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	glow.pixel_size = diameter / float(soft.get_width())
	glow.modulate = Color(color, .80)
	glow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(glow)
	glow.global_position = point
	var tween := glow.create_tween().set_parallel()
	if not reduced: tween.tween_property(glow, "scale", Vector3.ONE * 1.4, .32)
	tween.tween_property(glow, "modulate:a", 0.0, .36)
	tween.chain().tween_callback(glow.queue_free)

func area(action: Dictionary, body: Node3D, point: Vector3, reduced: bool) -> void:
	var action_id := str(action.get("id", ""))
	if action_id not in ["burning-hands", "harpy-song", "detect-magic"]: return
	var frame := body.get_parent() as Node3D
	var origin := frame.to_local(body.global_position)
	var local_point := frame.to_local(point)
	var footprint := Targeting.footprint(action, origin, local_point)
	if footprint.size() < 3: return
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var color := color_for(action)
	var visible_radius := 2.3 if action_id == "harpy-song" else 2.9
	var height := .24 if action_id == "burning-hands" else .09
	for index in range(footprint.size()):
		var a := footprint[index]
		var b := footprint[(index + 1) % footprint.size()]
		if action_id == "burning-hands":
			_add_triangle(surface, origin, a, b, Color(color, .24), Color(color, .10), height)
		else:
			a = origin + (a - origin).normalized() * visible_radius
			b = origin + (b - origin).normalized() * visible_radius
			var inner_a := origin.lerp(a, .87)
			var inner_b := origin.lerp(b, .87)
			_add_triangle(surface, inner_a, a, b, Color(color, .45), Color(color, .10), height)
			_add_triangle(surface, inner_a, b, inner_b, Color(color, .45), Color(color, .20), height)
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.vertex_color_use_as_albedo = true
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mesh := MeshInstance3D.new()
	mesh.name = "CombatArea_" + action_id
	mesh.mesh = surface.commit()
	mesh.material_override = material
	mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mesh)
	mesh.global_transform = frame.global_transform
	var tween := mesh.create_tween()
	var initial := material.albedo_color
	tween.tween_property(material, "albedo_color", Color(initial, 0), .35 if reduced else .65)
	tween.tween_callback(mesh.queue_free)

func _add_triangle(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, near_color: Color, edge_color: Color, height: float) -> void:
	surface.set_color(near_color)
	surface.add_vertex(a + Vector3.UP * height)
	surface.set_color(edge_color)
	surface.add_vertex(b + Vector3.UP * height)
	surface.add_vertex(c + Vector3.UP * height)
