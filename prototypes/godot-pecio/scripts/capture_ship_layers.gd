extends SceneTree
const Structure = preload("res://scripts/wreck_structure.gd")
const REVIEW_FEET = {"c2": Vector3(22, 3.05, 2), "c3": Vector3(-21, 3.05, 1.7), "c4": Vector3(-19, 0.05, -4), "c5": Vector3(-18, 0.05, 4), "c6": Vector3(17, 0.05, -1.8), "c7": Vector3(17, 0.05, 1.5), "c8": Vector3(0, -3.32, 0), "c9": Vector3(0, -6.37, 0)}

# Reproducible integrated views; never substitute concept art for the scene.
const VIEWS = [
	["overview", Vector3(38, 35, 55), Vector3(0, 3, 0), 50.0, "exterior"],
	["stern-breach", Vector3(-42, 7, -3), Vector3(-28, -2, 1), 48.0, "exterior"],
	["bow", Vector3(39, 12, 22), Vector3(23, 2, 0), 48.0, "exterior"],
	["c1", Vector3(5, 17, 24), Vector3(0, 0, 0), 52.0, "exterior"],
	["c2", Vector3(15, 15, 18), Vector3(23, 3, 0), 52.0, "exterior"],
	["c3", Vector3(-15, 14, 17), Vector3(-23, 3, 0), 52.0, "exterior"],
	["c4", Vector3(-12, 13, 13), Vector3(-22, 0, -4), 52.0, "aft_c4_port"],
	["c5", Vector3(-13, 13, 18), Vector3(-22, 0, 4), 52.0, "aft_c5_stbd"],
	["c6", Vector3(12, 14, 13), Vector3(22, 0, -4), 52.0, "fore_c6_port"],
	["c7", Vector3(13, 14, 19), Vector3(22, 0, 4), 52.0, "fore_c7_stbd"],
	["c8", Vector3(18, 25, 31), Vector3(-2, -3.3, 0), 60.0, "lower_c8_bilge"],
	["c9", Vector3(17, 22, 27), Vector3(-2, -6.4, 0), 60.0, "lower_c9_hold"],
	["cofa", Vector3(9, 22, 13), Vector3(0.35, 15, -0.48), 52.0, "exterior"],
	["dragon", Vector3(-15, 10, 20), Vector3(-22.5, 3.2, 14.6), 48.0, "exterior"],
	["remains", Vector3(-5, 5, -9), Vector3(-6, 0.7, -4.6), 35.0, "exterior"],
	["rowboat", Vector3(3.6, 1.8, 22.8), Vector3(2.5, -2.35, 15.6), 38.0, "exterior"],
	["hatch", Vector3(1.8, 9.2, 11.4), Vector3(1.5, -1.6, 5.2), 36.0, "exterior"],
]

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var target_dir := "res://../../output/godot-pecio-layers-20261114/before"
	var view_filter := "all"
	var greybox := false
	var hour := "day"
	var climate := "clear"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--audit-dir="):
			target_dir = arg.trim_prefix("--audit-dir=")
		if arg.begins_with("--audit-view="):
			view_filter = arg.trim_prefix("--audit-view=")
		if arg == "--audit-greybox":
			greybox = true
		if arg.begins_with("--audit-time="): hour = arg.trim_prefix("--audit-time=")
		if arg.begins_with("--audit-weather="): climate = arg.trim_prefix("--audit-weather=")
	seed(14112026)
	Engine.time_scale = 1.0
	root.size = Vector2i(1280, 720)
	var main := load("res://scenes/main.tscn").instantiate() as Node3D
	root.add_child(main)
	for particles: GPUParticles3D in main.find_children("*", "GPUParticles3D", true, false):
		particles.use_fixed_seed = true
		particles.seed = absi(hash(str(particles.name)))
		particles.restart()
	await process_frame
	await process_frame
	var ambiance := main.get_node_or_null("ShipEnvironment")
	if ambiance:
		ambiance.set_time_of_day(hour)
		ambiance.set_weather(climate, true)
	_freeze_updates(main)
	_freeze_shader_time(main)
	var live_vfx := main.find_child("Vfx", true, false)
	if live_vfx: live_vfx.sim_time = 0.0
	var camera := main.get_node("TacticalCamera") as Camera3D
	var hero := main.find_child("PlayerToken", true, false) as Node3D
	# Explicit placement prevents the first two physics frames from introducing
	# tiny, machine-dependent differences between projects being compared.
	var starting_feet := Vector3(2.5, 0.12, 1.2)
	var cutout := main.find_child("RoofCutout", true, false)
	var absolute_dir := ProjectSettings.globalize_path(target_dir)
	DirAccess.make_dir_recursive_absolute(absolute_dir)
	FileAccess.open(absolute_dir.path_join("environment.json"), FileAccess.WRITE).store_string(JSON.stringify({"time": hour, "weather": climate, "seed": 14112026, "time_scale": 1, "shader_time": 0, "fixed_fps": 60, "particle_preprocess_seconds": 2.0}, "\t"))
	var records: Array = []
	cutout.set_interior_mode("exterior", true)
	var meshes: Array = []
	for instance: MeshInstance3D in main.find_children("*", "MeshInstance3D", true, false):
		var source := instance as Node
		while source and source.get_script() == null:
			source = source.get_parent()
		var triangles := 0
		var materials: Array = []
		if instance.mesh:
			for surface in range(instance.mesh.get_surface_count()):
				var arrays := instance.mesh.surface_get_arrays(surface)
				var indices = arrays[Mesh.ARRAY_INDEX]
				triangles += (indices.size() if indices != null and not indices.is_empty() else arrays[Mesh.ARRAY_VERTEX].size()) / 3
				var material := instance.get_active_material(surface)
				materials.append({"type": material.get_class() if material else "none", "resource": material.resource_path if material else "", "albedo": str(material.albedo_color) if material is StandardMaterial3D else "shader"})
		meshes.append({"id": str(main.get_path_to(instance)), "owner_script": source.get_script().resource_path if source else "", "triangles": triangles, "aabb": str(instance.get_aabb()), "transform": str(instance.transform), "materials": materials})
	var collisions: Array = []
	for shape: CollisionShape3D in main.find_children("*", "CollisionShape3D", true, false):
		collisions.append({"id": str(main.get_path_to(shape)), "type": shape.shape.get_class(), "transform": str(shape.transform)})
	var lights: Array = []
	for light: Light3D in main.find_children("*", "Light3D", true, false):
		lights.append({"id": str(main.get_path_to(light)), "energy": light.light_energy, "color": str(light.light_color), "mask": light.light_cull_mask, "shadow": light.shadow_enabled})
	FileAccess.open(absolute_dir.path_join("inventory.json"), FileAccess.WRITE).store_string(JSON.stringify({"meshes": meshes, "collisions": collisions, "lights": lights}, "\t"))
	if greybox:
		var grey := StandardMaterial3D.new()
		grey.albedo_color = Color("#9ca5aa")
		grey.roughness = 0.95
		grey.cull_mode = BaseMaterial3D.CULL_DISABLED
		for instance: MeshInstance3D in main.get_node("ShipVessel").find_children("*", "MeshInstance3D", true, false):
			if not ("Water" in str(instance.name) or "Caustics" in str(instance.name)):
				instance.material_override = grey
	for view in VIEWS:
		if view_filter != "all" and view_filter != view[0]:
			continue
		if REVIEW_FEET.has(view[0]):
			var feet: Vector3 = REVIEW_FEET[view[0]]
			hero.position = Structure.get_world_pos(feet.x, feet.y, feet.z)
		else: hero.position = starting_feet
		cutout.set_interior_mode(view[4], true)
		if ambiance: ambiance.sync_zone_lighting()
		var scene_vfx := main.find_child("Vfx", true, false)
		if scene_vfx: scene_vfx._process(0.0)
		for particles: GPUParticles3D in main.find_children("*", "GPUParticles3D", true, false):
			particles.speed_scale = 1.0
			particles.preprocess = 2.0
			if particles.emitting and particles.is_visible_in_tree():
				particles.restart(true)
		camera.position = view[1]
		camera.look_at(view[2], Vector3.UP)
		camera.fov = view[3]
		var inventory := main.find_child("InventoryManager", true, false)
		if inventory: inventory.hide_prompt()
		for frame in range(12):
			await process_frame
		await RenderingServer.frame_post_draw
		var rain := main.find_child("WeatherRain", true, false) as GPUParticles3D
		if rain and view[0] == "c1": print("RAIN_CAPTURE: visible=", rain.is_visible_in_tree(), " emitting=", rain.emitting, " bounds=", rain.capture_aabb())
		var path := absolute_dir.path_join(view[0] + ".png")
		var err := root.get_texture().get_image().save_png(path)
		if err != OK:
			printerr("CAPTURE FAILED ", path, " ", err)
			quit(1)
			return
		records.append({"view": view[0], "camera": str(camera.transform), "player_feet": str(hero.position), "fov": camera.fov, "mode": view[4], "width": 1280, "height": 720, "seed": 14112026, "time_scale": 1, "shader_time": 0, "fixed_fps": 60, "particle_preprocess_seconds": 2.0, "greybox": greybox})
		print("CAPTURE ", path)
	var manifest_path := absolute_dir.path_join("cameras.json")
	if view_filter != "all" and FileAccess.file_exists(manifest_path):
		var existing: Array = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
		for record in existing:
			if record["view"] != view_filter:
				records.append(record)
		records.sort_custom(func(a, b): return _view_index(a["view"]) < _view_index(b["view"]))
	var manifest := FileAccess.open(manifest_path, FileAccess.WRITE)
	manifest.store_string(JSON.stringify(records, "\t"))
	# Flush light/geometry pairs before destroying a rendered scene with masks.
	for light: Light3D in main.find_children("*", "Light3D", true, false): light.visible = false
	await process_frame
	await RenderingServer.frame_post_draw
	main.queue_free()
	await process_frame
	quit(0)

func _view_index(view_name: String) -> int:
	for index in range(VIEWS.size()):
		if VIEWS[index][0] == view_name:
			return index
	return -1

func _freeze_updates(node: Node) -> void:
	node.set_process(false)
	node.set_physics_process(false)
	for child in node.get_children(): _freeze_updates(child)

func _freeze_shader_time(main: Node3D) -> void:
	# Freeze shader TIME in temporary resources only. Keep a positive fixed engine
	# delta for native GPU particles; zero delta can yield non-finite particles.
	var expression := RegEx.new()
	expression.compile("\\bTIME\\b")
	var variants: Dictionary = {}
	for mesh: MeshInstance3D in main.find_children("*", "MeshInstance3D", true, false):
		if not mesh.mesh: continue
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface) as ShaderMaterial
			if not material or not expression.search(material.shader.code): continue
			var original := material.shader
			var key := original.get_instance_id()
			if not variants.has(key):
				var fixed_shader := original.duplicate() as Shader
				fixed_shader.code = expression.sub(original.code, "0.0", true)
				variants[key] = fixed_shader
			material.shader = variants[key]
