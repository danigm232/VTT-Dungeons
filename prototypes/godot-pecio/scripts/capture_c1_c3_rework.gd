extends SceneTree

const Structure = preload("res://scripts/wreck_structure.gd")

const VIEWS = [
	["overview", Vector3(38.0, 35.0, 55.0), Vector3(0.0, 3.0, 0.0), 50.0, "exterior", Vector3(2.5, 0.05, 1.2)],
	["c3_main", Vector3(-14.8, 13.5, 16.5), Vector3(-22.5, 3.3, 0.0), 44.0, "exterior", Vector3(-21.0, 3.05, 2.2)],
	["c3_helm_detail", Vector3(-20.2, 6.4, 4.4), Vector3(-21.8, 3.9, 0.0), 38.0, "exterior", Vector3(-20.2, 3.05, 2.6)],
	["c3_top", Vector3(-22.0, 17.5, 4.8), Vector3(-22.2, 3.0, 0.0), 46.0, "exterior", Vector3(-21.0, 3.05, 2.2)],
	["cofa_main", Vector3(6.6, 20.6, 7.8), Vector3(0.35, 15.25, -0.48), 40.0, "exterior", Vector3(1.15, 15.12, 0.85)],
	["cofa_top", Vector3(0.35, 22.8, 3.6), Vector3(0.35, 15.10, -0.48), 42.0, "exterior", Vector3(1.15, 15.12, 0.85)],
	["cofa_side", Vector3(6.4, 15.4, 6.8), Vector3(0.35, 14.55, -0.48), 40.0, "exterior", Vector3(1.15, 15.12, 0.85)],
]

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var target_dir := "res://../../output/pecio-c1-c3-20261118/before"
	var audit_time := "day"
	var audit_weather := "clear"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--audit-dir="):
			target_dir = arg.trim_prefix("--audit-dir=")
		elif arg.begins_with("--audit-time="):
			audit_time = arg.trim_prefix("--audit-time=")
		elif arg.begins_with("--audit-weather="):
			audit_weather = arg.trim_prefix("--audit-weather=")

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
		ambiance.set_time_of_day(audit_time)
		ambiance.set_weather(audit_weather, true)
		if "hud_layer" in ambiance and ambiance.hud_layer:
			ambiance.hud_layer.visible = false
		if "controls" in ambiance and ambiance.controls:
			ambiance.controls.visible = false
	_freeze_updates(main)
	_freeze_shader_time(main)
	var live_vfx := main.find_child("Vfx", true, false)
	if live_vfx:
		live_vfx.sim_time = 0.0

	var camera := main.get_node("TacticalCamera") as Camera3D
	camera.projection = Camera3D.PROJECTION_PERSPECTIVE
	var hero := main.find_child("PlayerToken", true, false) as Node3D
	var harpy := main.find_child("HarpyToken", true, false) as Node3D
	var cutout := main.find_child("RoofCutout", true, false)
	var absolute_dir := ProjectSettings.globalize_path(target_dir)
	DirAccess.make_dir_recursive_absolute(absolute_dir)

	var records: Array = []
	var inventory := main.find_child("InventoryManager", true, false)
	if inventory:
		inventory.hide_prompt()
		if inventory.hud_root:
			inventory.hud_root.visible = false
	var vtt_ui := main.find_child("VttRoleUi", true, false)
	if vtt_ui:
		vtt_ui.set_meta("capture_hidden", true)
		for child in vtt_ui.get_children():
			if child is CanvasLayer:
				child.visible = false

	for view in VIEWS:
		var feet: Vector3 = view[5]
		if hero:
			hero.position = Structure.get_world_pos(feet.x, feet.y, feet.z)
		if harpy:
			var show_harpy := str(view[0]).begins_with("cofa")
			harpy.set_meta("adventure_present", show_harpy)
			harpy.visible = show_harpy
			if show_harpy:
				harpy.position.y = maxf(harpy.position.y, 15.105)
		cutout.set_interior_mode(view[4], true)
		if ambiance:
			ambiance.sync_zone_lighting()
		if live_vfx:
			live_vfx._process(0.0)
		for particles: GPUParticles3D in main.find_children("*", "GPUParticles3D", true, false):
			particles.speed_scale = 1.0
			particles.preprocess = 2.0
			if particles.emitting and particles.is_visible_in_tree():
				particles.restart(true)
		camera.position = view[1]
		camera.look_at(view[2], Vector3.UP)
		camera.fov = view[3]
		for frame in range(10):
			await process_frame
		await RenderingServer.frame_post_draw
		var path := absolute_dir.path_join(view[0] + ".png")
		var err := root.get_texture().get_image().save_png(path)
		if err != OK:
			printerr("CAPTURE FAILED ", path, " ", err)
			quit(1)
			return
		records.append({
			"view": view[0],
			"pos": [view[1].x, view[1].y, view[1].z],
			"look": [view[2].x, view[2].y, view[2].z],
			"fov": view[3],
			"width": 1280,
			"height": 720,
			"file": view[0] + ".png"
		})
		print("CAPTURE ", path)

	FileAccess.open(absolute_dir.path_join("cameras.json"), FileAccess.WRITE).store_string(JSON.stringify(records, "\t"))
	for light: Light3D in main.find_children("*", "Light3D", true, false):
		light.visible = false
	await process_frame
	await RenderingServer.frame_post_draw
	main.queue_free()
	await process_frame
	quit(0)

func _freeze_updates(node: Node) -> void:
	node.set_process(false)
	node.set_physics_process(false)
	for child in node.get_children():
		_freeze_updates(child)

func _freeze_shader_time(main: Node3D) -> void:
	var expression := RegEx.new()
	expression.compile("\\bTIME\\b")
	var variants: Dictionary = {}
	for mesh: MeshInstance3D in main.find_children("*", "MeshInstance3D", true, false):
		if not mesh.mesh:
			continue
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface) as ShaderMaterial
			if not material or not expression.search(material.shader.code):
				continue
			var original := material.shader
			var key := original.get_instance_id()
			if not variants.has(key):
				var fixed_shader := original.duplicate() as Shader
				fixed_shader.code = expression.sub(original.code, "0.0", true)
				variants[key] = fixed_shader
			material.shader = variants[key]
	for mm: MultiMeshInstance3D in main.find_children("*", "MultiMeshInstance3D", true, false):
		var m_mat := mm.material_override as ShaderMaterial
		if not m_mat or not expression.search(m_mat.shader.code):
			continue
		var orig_m := m_mat.shader
		var m_key := orig_m.get_instance_id()
		if not variants.has(m_key):
			var fixed_m := orig_m.duplicate() as Shader
			fixed_m.code = expression.sub(orig_m.code, "0.0", true)
			variants[m_key] = fixed_m
		m_mat.shader = variants[m_key]
