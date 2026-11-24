extends SceneTree

## Forward+ before/after capture harness for "02 · Bosque camino a Pleamar"
## (río alargado/animado + flora ampliada, 17/11/2026).
## Run: Godot --path prototypes/godot-campamentos -s res://scripts/capture_forest_river.gd -- --out=<abs dir>

const Structure = preload("res://scripts/camp_structure.gd")

func _initialize() -> void:
	_run.call_deferred()

func _out_dir() -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			return a.substr(6)
	return "c:/Users/User/Desktop/Dungeons/output/godot-forest-river-20261117/after"

func _run() -> void:
	var out_dir := _out_dir()
	DirAccess.make_dir_recursive_absolute(out_dir)
	root.size = Vector2i(1440, 810)
	var shots := [
		{"name": "forest-overview-dusk.png", "time": "dusk", "weather": "clear", "zone": "overview"},
		{"name": "forest-wide-day.png", "time": "day", "weather": "clear", "zone": "overview", "zoom": 62.0, "focus_offset": Vector3(-4.0, 0.0, -4.0)},
		{"name": "forest-river-day-closeup.png", "time": "day", "weather": "clear", "zone": "forest-fire-point", "zoom": 13.0, "focus_offset": Vector3(-13.5, 0.0, -3.0)},
		{"name": "forest-north-day.png", "time": "day", "weather": "clear", "zone": "forest-guard-point", "zoom": 22.0, "focus_offset": Vector3(-6.0, 0.0, -8.0)},
		{"name": "forest-camp-day-closeup.png", "time": "day", "weather": "clear", "zone": "forest-fire-point", "zoom": 11.0, "focus_offset": Vector3(-1.2, 0.3, -2.2)},
		{"name": "forest-wade-footprints-day.png", "time": "day", "weather": "clear", "zone": "forest-fire-point", "zoom": 11.5, "focus_offset": Vector3(-9.5, 0.0, -2.4), "wade_demo": true},
		{"name": "forest-night.png", "time": "night", "weather": "clear", "zone": "overview"},
		{"name": "forest-foliage-occlusion-day.png", "time": "day", "weather": "clear", "zone": "forest-fire-point", "zoom": 11.0, "focus_offset": Vector3(4.2, 0.0, -3.2), "occlude_demo": true},
		{"name": "forest-camp-rest-showcase-dusk.png", "time": "dusk", "weather": "clear", "zone": "forest-fire-point", "zoom": 9.8, "focus_offset": Vector3(-1.1, 0.25, -1.9), "rest_demo": true},
	]
	for shot in shots:
		var packed := load(Structure.scene_path_for_id("camp-forest-pleamar")) as PackedScene
		var t_load := Time.get_ticks_msec()
		var inst := packed.instantiate()
		root.add_child(inst)
		current_scene = inst
		if inst.camera:
			inst.camera.persist_preferences = false
		await process_frame
		await process_frame
		var build_ms := Time.get_ticks_msec() - t_load
		inst.set_env_time(str(shot["time"]))
		inst.set_env_weather(str(shot["weather"]))
		var ui := inst.find_child("VttRoleUi", true, false)
		if ui and ui.has_method("set_role"):
			ui.set_role("player")
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
		if bool(shot.get("wade_demo", false)) and inst.outdoor_builder:
			var hero: Node3D = inst.party_tokens[0] if not inst.party_tokens.is_empty() else null
			if hero and is_instance_valid(hero):
				var rx_w: float = inst.outdoor_builder._river_center_x(13.8)
				# Step through shallow creek to trigger splash particles, foam ring, and water waves
				hero.global_position = Vector3(rx_w - 0.5, -0.18, 13.8)
				hero._physics_process(0.1)
				hero.global_position = Vector3(rx_w + 0.4, -0.18, 13.9)
				hero._physics_process(0.1)
				# Emerge onto east clearing pad (x>=7.2) and walk ~11m so progressive fade is clearly visible!
				hero.global_position = Vector3(7.2, 0.0, 14.0)
				hero._physics_process(0.05)
				for st_i in range(18):
					hero.global_position = Vector3(7.2 + float(st_i + 1) * 0.56, 0.0, 14.0 + float(st_i + 1) * 0.14)
					hero._physics_process(0.06)
				# Also wade Wizard right inside stream so live ripple waves, splash ring & droplets show together!
				if inst.party_tokens.size() >= 2 and is_instance_valid(inst.party_tokens[1]):
					var wiz: Node3D = inst.party_tokens[1]
					wiz.global_position = Vector3(rx_w - 0.1, -0.18, 14.2)
					wiz._physics_process(0.08)
					wiz.global_position = Vector3(rx_w + 0.25, -0.18, 14.4)
					wiz._physics_process(0.08)
					inst.outdoor_builder._update_river_mover_ripples()
		if bool(shot.get("occlude_demo", false)) and inst.outdoor_builder:
			if inst.party_tokens.size() >= 3:
				inst.party_tokens[0].global_position = Vector3(23.8, 0.05, 11.4)
				inst.party_tokens[1].global_position = Vector3(25.2, 0.05, 12.6)
				inst.party_tokens[2].global_position = Vector3(22.6, 0.05, 12.8)
				for pt_o in inst.party_tokens:
					pt_o._physics_process(0.05)
				inst.outdoor_builder._update_foliage_occlusion()
		if bool(shot.get("rest_demo", false)) and inst.outdoor_builder:
			inst.fx.stoke_campfire(16.0)
			inst.fx.start_kettle_cooking(45.0)
			if inst.party_tokens.size() >= 3:
				inst.select_party_member(0)
				inst.perform_camp_activity("rest", {"id": "forest-bed-mia", "kind": "bed"})
				inst.select_party_member(2)
				inst.perform_camp_activity("rest", {"id": "forest-bed-mike", "kind": "bed"})
				inst.select_party_member(1)
				inst.perform_camp_activity("sit", {"id": "forest-seat-a-point", "kind": "seat", "col": 11, "row": 11, "objectCol": 11, "objectRow": 11})
				inst.outdoor_builder._update_foliage_occlusion()
		for _w in range(3):
			await process_frame
		var t0 := Time.get_ticks_usec()
		for _f in range(10):
			RenderingServer.force_draw(false)
			await process_frame
		var dt_ms := float(Time.get_ticks_usec() - t0) / 10000.0
		var dc := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
		var prims := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)
		var img := root.get_texture().get_image()
		if img:
			var err := img.save_png(out_dir.path_join(str(shot["name"])))
			print("CAPTURE_SAVED=", shot["name"], " ERR=", err, " AVG_MS=", snappedf(dt_ms, 0.01), " FPS=", snappedf(1000.0 / maxf(0.1, dt_ms), 0.1), " DC=", dc, " PRIMS=", prims, " BUILD_MS=", build_ms)
		current_scene = null
		root.remove_child(inst)
		inst.queue_free()
		await process_frame
	print("CAPTURE_DONE=", shots.size())
	quit(0)
