extends SceneTree

## Forward+ visual capture & profiling harness for all 5 campamentos.
## Run: Godot --path prototypes/godot-campamentos -s res://scripts/capture_camps.gd

const Structure = preload("res://scripts/camp_structure.gd")
const OUT_DIR := "c:/Users/User/Desktop/Dungeons/output/godot-campamentos-redesign-20261115"

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(OUT_DIR)
	_run_captures.call_deferred()

func _run_captures() -> void:
	root.size = Vector2i(1440, 810)
	var shots := [
		{"scene": "camp-a1-rooms", "name": "camp-01-a1-rooms-day.png", "time": "day", "weather": "clear", "role": "player", "zone": "overview", "enter_cell": ""},
		{"scene": "camp-a1-rooms", "name": "camp-01-a1-cutaway-night.png", "time": "night", "weather": "clear", "role": "player", "zone": "cell-4", "enter_cell": "cell-4"},
		{"scene": "camp-forest-pleamar", "name": "camp-02-forest-dusk.png", "time": "dusk", "weather": "clear", "role": "player", "zone": "overview", "enter_cell": ""},
		{"scene": "camp-forest-pleamar", "name": "camp-02-forest-night.png", "time": "night", "weather": "fog", "role": "player", "zone": "forest-fire-point", "enter_cell": ""},
		{"scene": "camp-forest-pleamar", "name": "camp-02-forest-day-closeup.png", "time": "day", "weather": "clear", "role": "player", "zone": "forest-fire-point", "enter_cell": "", "zoom": 9.5, "focus_offset": Vector3(-1.2, 0.3, -2.2)},
		{"scene": "camp-wreck-beach", "name": "camp-03-wreck-beach-dusk.png", "time": "dusk", "weather": "clear", "role": "player", "zone": "overview", "enter_cell": ""},
		{"scene": "camp-wreck-beach", "name": "camp-03-beach-day-closeup.png", "time": "day", "weather": "clear", "role": "player", "zone": "beach-fire-point", "enter_cell": "", "zoom": 10.5, "focus_offset": Vector3(-2.0, 0.3, 0.5)},
		{"scene": "camp-cliffs-observatory", "name": "camp-04-cliffs-observatory-night.png", "time": "night", "weather": "storm", "role": "player", "zone": "overview", "enter_cell": ""},
		{"scene": "camp-cliffs-observatory", "name": "camp-04-cliffs-day-closeup.png", "time": "day", "weather": "clear", "role": "player", "zone": "cliff-fire-point", "enter_cell": "", "zoom": 9.8, "focus_offset": Vector3(-0.8, 0.3, -0.8)},
		{"scene": "camp-coastal-refuge", "name": "camp-05-coastal-refuge-dusk.png", "time": "dusk", "weather": "rain", "role": "player", "zone": "overview", "enter_cell": ""},
		{"scene": "camp-coastal-refuge", "name": "camp-05-refuge-day-closeup.png", "time": "day", "weather": "clear", "role": "player", "zone": "cove-fire-point", "enter_cell": "", "zoom": 11.2, "focus_offset": Vector3(0.0, 0.3, -3.5)},
		{"scene": "camp-forest-pleamar", "name": "camp-hud-dm.png", "time": "dusk", "weather": "clear", "role": "dm", "zone": "overview", "enter_cell": ""},
	]

	for shot in shots:
		var sid := str(shot["scene"])
		var packed := load(Structure.scene_path_for_id(sid)) as PackedScene
		if not packed:
			printerr("Failed to load scene ", sid)
			continue
		var inst := packed.instantiate()
		root.add_child(inst)
		current_scene = inst
		if inst.camera:
			inst.camera.persist_preferences = false
		await process_frame
		await process_frame

		inst.set_env_time(str(shot["time"]))
		inst.set_env_weather(str(shot["weather"]))

		var ui := inst.find_child("VttRoleUi", true, false)
		if ui and ui.has_method("set_role"):
			ui.set_role(str(shot["role"]))
		if shot["role"] == "dm" and ui and ui.dm_hud:
			ui.dm_hud._active_map_tab = "scene"
			ui.dm_hud._rebuild_map_pop()
			ui.dm_hud.map_tools_pop.visible = true
		if shot["enter_cell"] != "" and inst.has_method("set_inspect_cutaway"):
			inst.set_inspect_cutaway(str(shot["enter_cell"]))
		if ui and ui.has_method("focus_zone"):
			ui.focus_zone(str(shot["zone"]))
		if inst.camera and inst.camera.has_method("apply_zone_preset"):
			inst.camera.apply_zone_preset(str(shot["zone"]), true)
		if inst.camera and shot.has("zoom"):
			inst.camera.is_following = false
			inst.camera.is_overview = false
			inst.camera.target_distance = float(shot["zoom"])
			inst.camera.current_distance = float(shot["zoom"])
			var off: Vector3 = shot.get("focus_offset", Vector3.ZERO)
			inst.camera.target_focus += off
			inst.camera.focus_point = inst.camera.target_focus
			inst.camera.update_camera_transform()

		# Benchmark 10 rendered frames in Forward+
		for _w in range(2):
			await process_frame
		var t0 := Time.get_ticks_usec()
		for _f in range(10):
			RenderingServer.force_draw(false)
			await process_frame
		var dt_ms := float(Time.get_ticks_usec() - t0) / 10000.0
		var draw_calls := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
		var prims := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)

		var img := root.get_texture().get_image()
		if img:
			var out_path := OUT_DIR.path_join(str(shot["name"]))
			var err := img.save_png(out_path)
			print("CAPTURE_SAVED=", shot["name"], " ERR=", err, " AVG_MS=", snappedf(dt_ms, 0.01), " FPS=", snappedf(1000.0 / maxf(0.1, dt_ms), 0.1), " DC=", draw_calls, " PRIMS=", prims)

		current_scene = null
		root.remove_child(inst)
		inst.queue_free()
		await process_frame

	print("CAPTURE_DONE=", shots.size())
	quit(0)
