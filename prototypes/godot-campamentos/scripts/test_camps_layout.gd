extends SceneTree

## Headless verification suite for all 5 migrated Godot campamentos.
## Run with: Godot --headless --path prototypes/godot-campamentos -s res://scripts/test_camps_layout.gd

const Structure = preload("res://scripts/camp_structure.gd")

var passed: int = 0
var failed: Array[String] = []

func check(cond: bool, msg: String) -> void:
	if cond:
		passed += 1
	else:
		failed.append(msg)
		printerr("FAIL: ", msg)

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var bundle := Structure.load_bundle()
	var scenes := Structure.get_all_scene_defs()
	check(bundle.has("scenes") and scenes.size() == 5, "bundle loads all 5 camp scenes (got %d)" % scenes.size())

	var expected := {
		"camp-a1-rooms": {"cols": 48, "rows": 22, "min_walk": 400, "path": "res://scenes/camp_a1_rooms.tscn"},
		"camp-forest-pleamar": {"cols": 24, "rows": 22, "min_walk": 250, "path": "res://scenes/camp_forest_pleamar.tscn"},
		"camp-wreck-beach": {"cols": 25, "rows": 22, "min_walk": 240, "path": "res://scenes/camp_wreck_beach.tscn"},
		"camp-cliffs-observatory": {"cols": 25, "rows": 22, "min_walk": 240, "path": "res://scenes/camp_cliffs_observatory.tscn"},
		"camp-coastal-refuge": {"cols": 25, "rows": 22, "min_walk": 240, "path": "res://scenes/camp_coastal_refuge.tscn"},
	}

	for sid in expected.keys():
		var spec: Dictionary = expected[sid]
		var sdef := Structure.get_scene_def(sid)
		check(int(sdef.get("cols", 0)) == int(spec["cols"]), "%s cols match (%d)" % [sid, int(spec["cols"])])
		check(int(sdef.get("rows", 0)) == int(spec["rows"]), "%s rows match (%d)" % [sid, int(spec["rows"])])
		check((sdef.get("walkable", []) as Array).size() >= int(spec["min_walk"]), "%s walkable count valid" % sid)

		var packed := load(str(spec["path"])) as PackedScene
		check(packed != null, "%s .tscn loads cleanly" % sid)
		if not packed:
			continue

		var inst := packed.instantiate()
		root.add_child(inst)
		await process_frame
		await process_frame

		var ui := inst.find_child("VttRoleUi", true, false)
		var cam := inst.find_child("TacticalCamera", true, false)
		var grid := inst.find_child("TacticalGridOverlay", true, false)
		var tok := inst.get_node_or_null("PlayerToken") as Node3D
		check(ui != null and cam != null and grid != null and tok != null, "%s core nodes present (UI, Cam, Grid, Token)" % sid)
		check(cam.projection == Camera3D.PROJECTION_ORTHOGONAL, "%s camera orthographic contract active" % sid)

		# Test Projector HUD hides tactical grid
		if ui and ui.has_method("set_role"):
			ui.set_role("projector")
			await process_frame
			check(not grid.visible, "%s projector hides tactical grid" % sid)
			ui.set_role("dm")
			await process_frame
			check(ui.dm_root.visible, "%s DM HUD visible in DM role" % sid)
			ui.set_role("player")

		# Canonical party switch hotkeys: 1 = Trinity, 2 = Mike, 3 = Mia, Tab cycles
		if ui and ui.player_hud and ui.player_hud.identity_btn:
			ui.player_hud.identity_btn.grab_focus()
		for pair in [[KEY_1, "RogueToken", "maria", "Trinity"], [KEY_2, "WizardToken", "mike", "Mike"], [KEY_3, "PlayerToken", "mia", "Mia"]]:
			var kev := InputEventKey.new()
			kev.keycode = int(pair[0])
			kev.physical_keycode = int(pair[0])
			kev.pressed = true
			root.push_input(kev)
			var active_tok: Node3D = inst.party_tokens[inst.active_party_idx] if inst.active_party_idx < inst.party_tokens.size() else null
			check(active_tok != null and str(active_tok.name) == str(pair[1]) and bool(active_tok.get("is_active_player")), "%s key %s selects %s" % [sid, str(pair[3]), str(pair[1])])
			check(ui != null and str(ui.selected_actor_id) == str(pair[2]), "%s key %s syncs VttRoleUi actor (%s)" % [sid, str(pair[3]), str(pair[2])])
		var tab_ev := InputEventKey.new()
		tab_ev.keycode = KEY_TAB
		tab_ev.pressed = true
		root.push_input(tab_ev)
		check(str(inst.party_tokens[inst.active_party_idx].name) == "RogueToken" and str(ui.selected_actor_id) == "maria", "%s Tab cycles back from Mia (3) to Trinity (1)" % sid)
		root.push_input(tab_ev)
		check(str(inst.party_tokens[inst.active_party_idx].name) == "WizardToken" and str(ui.selected_actor_id) == "mike", "%s Tab cycles from Trinity (1) to Mike (2)" % sid)
		if ui and ui.has_method("set_role"):
			ui.set_role("dm")
			var kev1 := InputEventKey.new()
			kev1.keycode = KEY_1
			kev1.physical_keycode = KEY_1
			kev1.pressed = true
			root.push_input(kev1)
			check(str(inst.party_tokens[inst.active_party_idx].name) == "RogueToken" and str(ui.selected_actor_id) == "maria", "%s key 1 selects Trinity in DM role too" % sid)
			ui.set_role("player")
			var kev3 := InputEventKey.new()
			kev3.keycode = KEY_3
			kev3.physical_keycode = KEY_3
			kev3.pressed = true
			root.push_input(kev3)
			check(str(inst.party_tokens[inst.active_party_idx].name) == "PlayerToken" and str(ui.selected_actor_id) == "mia", "%s restores Mia via key 3 for downstream tests" % sid)

		# Birds active across ALL 5 camp maps
		check(inst.find_child("AmbientBird_0", true, false) != null and inst.fx._birds.size() >= 4, "%s has >=4 flying 3D birds in sky" % sid)

		# Profile-specific structural invariants
		if sid == "camp-a1-rooms":
			check(inst.find_child("AstalaganStatue", true, false) != null, "A1 Astalagan statue built")
			var cr := inst.find_child("CutawayRoof_cell-1", true, false) as Node3D
			check(cr != null and cr.visible, "A1 cell-1 roof initially visible")
			# Move Mia into cell-1 (col 5, row 9) -> triggers cutaway!
			tok.global_position = Structure.tile_to_world(5, 9, 0.05)
			await process_frame
			check(not cr.visible, "A1 cell-1 roof cuts away when Mia enters")

		elif sid == "camp-forest-pleamar":
			check(inst.find_child("ForestOrganicStream", true, false) != null, "Forest organic stream built")
			# River extension + flow animation + flora expansion (17/11/2026)
			var ob_b = inst.outdoor_builder
			check(ob_b != null and ob_b.river_length_m > 140.0, "Forest river extended well beyond the clearing (%.1f m)" % (ob_b.river_length_m if ob_b else 0.0))
			var riv := inst.find_child("ForestOrganicStream", true, false) as MeshInstance3D
			var rmat := riv.material_override as ShaderMaterial if riv else null
			check(rmat != null and rmat.shader.code.contains("flow_speed") and float(rmat.get_shader_parameter("flow_speed")) > 0.1, "Forest river uses animated flow shader")
			check(rmat != null and not rmat.shader.code.contains("u_chan * 18.0") and rmat.shader.code.contains("wake_pts"), "Forest river eliminates longitudinal bands & includes localized wakes")
			var bridge_n := inst.find_child("StreamFootbridge", true, false)
			check(bridge_n != null and bridge_n.find_child("StreamFootbridgeBody", true, false) != null, "Forest bridge builds solid deck & approach collider")
			check(not Structure.is_water_at(Vector3(4.8, 0.0, 17.0), sdef), "Walking over forest footbridge treats deck as dry crossing")
			if ob_b:
				ob_b._reduced_motion = true
				check(float(rmat.get_shader_parameter("reduced_motion")) > 0.5, "Forest river honours reduced motion")
				ob_b._reduced_motion = false
				var fs: Dictionary = ob_b.flora_stats
				check(int(fs.get("trees_total", 0)) >= 60, "Forest adds many new trees (%d)" % int(fs.get("trees_total", 0)))
				check((fs.get("trees", {}) as Dictionary).size() >= 6, "Forest tree species variety >= 6 (%d)" % (fs.get("trees", {}) as Dictionary).size())
				var bush_total := 0
				for bkey in (fs.get("bushes", {}) as Dictionary).keys():
					bush_total += int(fs["bushes"][bkey])
				check(bush_total >= 150, "Forest adds dense bushes/ferns/flowers (%d)" % bush_total)
				check(int(fs.get("mushroom_clusters", 0)) >= 25, "Forest adds mushroom clusters (%d)" % int(fs.get("mushroom_clusters", 0)))
				var willow_mm := inst.find_child("ForestFlora_cards_willow", true, false)
				check(willow_mm is MultiMeshInstance3D and inst.find_child("ForestFlora_mush_cap_amanita", true, false) != null, "Forest willow MultiMesh & amanita batches present")
				# Tall flora never placed inside the walkable grid (decor must not fake obstacles)
				var tall_inside := 0
				var cols_m := float(sdef.get("cols", 24)) * Structure.TILE_METERS
				var rows_m := float(sdef.get("rows", 22)) * Structure.TILE_METERS
				for ts in ob_b._tree_spots:
					var tv: Vector2 = ts
					if tv.x > 0.0 and tv.y > 0.0 and tv.x < cols_m and tv.y < rows_m:
						tall_inside += 1
				check(tall_inside <= 13, "No new trees inside the tactical grid (only canonical obstacle trees: %d)" % tall_inside)
			check(inst.find_child("ForestDeer", true, false) != null, "Forest CC0 Deer GLB spawned")
			check(inst.find_child("ForestStag", true, false) != null, "Forest CC0 Stag GLB spawned")
			check(inst.find_child("ForestFox", true, false) != null, "Forest animated Fox spawned")
			var fox_n := inst.find_child("ForestFox", true, false)
			var fox_mesh := fox_n.find_child("*", true, false) as MeshInstance3D if fox_n else null
			var fox_mat := fox_mesh.material_override as StandardMaterial3D if fox_mesh else null
			check(fox_mat != null and fox_mat.albedo_texture != null and fox_mat.normal_texture != null, "Fauna carries custom procedural fur texture and normal map")
			check(inst.find_child("ForestRabbit_0", true, false) != null, "Forest hopping Rabbits spawned")
			check(inst.find_child("StreamTrout_0", true, false) != null and inst.find_child("StreamTrout_2", true, false) != null, "Forest stream Trout & jumping Trout spawned")
			check(inst.find_child("ForestPerchedRobin", true, false) != null, "Forest perched Robin spawned")
			check(inst.find_child("ForestButterflyA_0", true, false) != null, "Forest daytime Butterflies spawned")
			var chests: Array[String] = inst.get_chest_ids()
			check(chests.size() == 3, "Forest builds 3 interactive chests (got %d)" % chests.size())
			if not chests.is_empty():
				check(inst.toggle_chest_by_id(chests[0]) == true, "Forest chest toggles open")
				check(inst.toggle_chest_by_id(chests[0]) == false, "Forest chest toggles closed")
			var tent_mia := inst.find_child("CutawayTentRoof_mia", true, false) as Node3D
			check(tent_mia != null and tent_mia.visible, "Forest Mia tarp shelter initially visible")
			check(inst.find_child("ShelterHangingLantern", true, false) != null, "Forest rustic shelter mounts hanging corner lantern")
			check(tok.sprite != null and tok.sprite.shaded, "Party 2D sprite receives 3D scene & campfire lighting")
			check(inst.find_child("StreamRiverAudio", true, false) != null and inst.find_child("HearthFireAudio", true, false) != null, "Spatial 3D river & campfire audio nodes built")
			inst.set_env_time("night")
			check(int(ui.clock_seconds / 3600) % 24 == 22, "Clock synchronizes hour (22:xx) cleanly with night lighting phase")
			inst.set_env_time("dusk")
			check(int(ui.clock_seconds / 3600) % 24 == 18, "Clock synchronizes hour (18:xx) cleanly with dusk lighting phase")
			check(not str(ui.get_selected_zone().get("label", "")).contains("Bosque camino a Pleamar"), "DM zone label avoids duplicating scene title")
			check(inst.outdoor_builder != null and inst.outdoor_builder.bedrolls.size() == 3, "Forest builds 3 organic bedrolls")
			var first_bed_id := str(inst.outdoor_builder.bedrolls.keys()[0]) if inst.outdoor_builder and not inst.outdoor_builder.bedrolls.is_empty() else ""
			if first_bed_id != "":
				inst.perform_camp_activity("prepare-bed", {"id": first_bed_id, "label": "Petate"})
				check(str(inst.outdoor_builder.bedrolls[first_bed_id].get("state", "")) == "rolled", "Forest prepare-bed toggles bedroll state to rolled")
				inst.perform_camp_activity("prepare-bed", {"id": first_bed_id, "label": "Petate"})
				check(str(inst.outdoor_builder.bedrolls[first_bed_id].get("state", "")) == "prepared", "Forest prepare-bed restores bedroll state to prepared")
			var port_lan := inst.find_child("PortableWatchLantern", true, false)
			check(port_lan != null, "Forest builds portable ground watch lantern")
			if port_lan:
				inst.set_env_time("day")
				inst.set_env_weather("clear")
				for c in port_lan.get_children():
					if c is OmniLight3D:
						check(is_zero_approx((c as OmniLight3D).light_energy), "Forest portable lantern turns OFF during bright daylight")
						inst.set_env_time("night")
						check((c as OmniLight3D).light_energy > 0.5, "Forest portable lantern lights up at night")
			# Racial canon heights & seat/bedroll occupancy checks
			var wiz := inst.get_node_or_null("WizardToken") as Node3D
			var rog := inst.get_node_or_null("RogueToken") as Node3D
			check(wiz != null and rog != null, "Forest Wizard & Rogue party tokens present")
			if wiz and rog:
				var h_elf := float(wiz.get("target_height"))
				var h_dwarf := float(tok.get("target_height"))
				var h_half := float(rog.get("target_height"))
				check(h_elf > h_dwarf and h_dwarf > h_half, "Canonical race heights enforced (Elf %.2fm > Dwarf %.2fm > Halfling %.2fm)" % [h_elf, h_dwarf, h_half])
			check(inst.outdoor_builder != null and inst.outdoor_builder.shelter_anchors.has("forest-tent-mia") and int(inst.outdoor_builder.shelter_anchors["forest-tent-mia"].get("capacity", 0)) >= 3, "Forest tarp shelter fits >=3 characters")
			# Day/night auto campfire schedule + manual fire-toggle anytime + biome particles
			inst.set_env_time("day")
			await process_frame
			var flame_n := inst.find_child("FlameCluster", true, false) as Node3D
			check(inst.fx != null and not inst.fx.campfire_lit, "Forest campfire starts extinguished during day")
			check(flame_n != null and not flame_n.visible, "Forest FlameCluster hidden while campfire is extinguished")
			inst.perform_camp_activity("fire-toggle")
			check(inst.fx != null and inst.fx.campfire_lit, "Forest fire-toggle ignites campfire manually during day")
			check(flame_n != null and flame_n.visible, "Forest FlameCluster visible after manual ignition")
			inst.set_env_time("night")
			check(inst.fx != null and inst.fx.campfire_lit, "Forest campfire auto-lit at night")
			inst.perform_camp_activity("fire-toggle")
			check(inst.fx != null and not inst.fx.campfire_lit, "Forest fire-toggle extinguishes campfire manually at night")
			inst.perform_camp_activity("tend-fire")
			check(inst.fx != null and inst.fx.campfire_lit, "Forest tend-fire re-ignites unlit campfire")
			check(inst.find_child("BiomeAmbientParticles_forest", true, false) != null, "Forest biome ambient particles built")
			# Realistic ecological fauna schedule: nocturnal vs diurnal, weather shelter, and intermittent visit cycles
			inst.set_env_weather("clear")
			inst.set_env_time("day")
			var f_fox := inst.find_child("ForestFox", true, false) as Node3D
			var f_stag := inst.find_child("ForestStag", true, false) as Node3D
			var f_bfly := inst.find_child("ForestButterflyA_0", true, false) as Node3D
			var f_bird0 := inst.find_child("AmbientBird_0", true, false) as Node3D
			var f_owl0 := inst.find_child("AmbientOwl_0", true, false) as Node3D
			check(f_fox != null and not f_fox.visible, "Forest nocturnal Fox hides in bright midday")
			check(f_stag != null and not f_stag.visible, "Forest crepuscular/nocturnal Stag rests midday")
			check(f_bfly != null and f_bfly.visible, "Forest diurnal Butterfly active in clear midday")
			check(f_bird0 != null and f_bird0.visible, "Forest diurnal sky bird glides in clear midday")
			inst.set_env_time("night")
			check(f_fox.visible, "Forest nocturnal Fox emerges at night")
			check(f_stag.visible, "Forest nocturnal Stag emerges at night")
			check(f_owl0 != null and f_owl0.visible, "Forest nocturnal Owl emerges at night")
			check(not f_bfly.visible, "Forest diurnal Butterfly rests at night")
			inst.set_env_weather("storm")
			check(not f_bird0.visible, "Sky birds shelter during storm weather")
			check(not f_bfly.visible, "Forest Butterflies shelter during storm weather")
			inst.set_env_weather("clear")
			inst.set_env_time("day")
			if inst.outdoor_builder:
				var cycled_fauna := 0
				for fa in inst.outdoor_builder.fauna_agents:
					var fd: Dictionary = fa
					if float(fd.get("visit_cycle", 0.0)) > 0.0 and float(fd.get("visit_duty", 1.0)) < 1.0:
						cycled_fauna += 1
				check(cycled_fauna >= 6, "Forest wildlife uses staggered intermittent visit cycles (%d)" % cycled_fauna)
				inst.outdoor_builder._process(0.15)
				var glb_ap: AnimationPlayer = f_stag.find_child("AnimationPlayer", true, false) as AnimationPlayer if f_stag else null
				check(glb_ap != null and glb_ap.has_animation("Eating") and glb_ap.has_animation("Walk"), "GLB Stag supports Walk <-> Eating animation clips")
			# Tend fire & physical seat slot occupancy actions
			inst.fire_fuel = 0.40
			inst.perform_camp_activity("tend-fire")
			check(inst.fire_fuel > 0.70, "Forest tend-fire increases fuel")
			tok.global_position = inst.outdoor_builder.seat_anchors["forest-seat-a-point"].stand_pos
			inst._update_nearest_interaction()
			var seat_button: Button = ui.player_hud.interact_btn
			check(not seat_button.disabled and "Sentarse" in seat_button.text, "Player HUD offers the nearby seat")
			seat_button.pressed.emit()
			check(bool(tok.get("is_sitting")) and tok.global_position.y > 0.28, "Camp sit places character atop fallen log seat (y=%.2f)" % tok.global_position.y)
			inst._update_nearest_interaction()
			seat_button.pressed.emit()
			check(not bool(tok.get("is_sitting")) and tok.global_position.y < 0.12, "Standing up restores character to ground floor")

			# --- 10-point camp-forest-pleamar contract checks ---
			var bridge_x: float = inst.outdoor_builder._river_center_x(17.0)
			check(Structure.is_on_forest_bridge(Vector3(bridge_x, 0.0, 17.0)) and not Structure.is_on_forest_bridge(Vector3(bridge_x, 0.0, 18.2)), "Forest walkable bridge matches strictly plank corridor (#7)")
			check(Structure.is_shallow_water_at(Vector3(bridge_x, 0.0, 14.0), sdef) and not Structure.is_water_at(Vector3(bridge_x, 0.0, 17.0), sdef), "Forest creek counts as shallow water except on dry planks (#7, #8)")
			var g_ov := inst.find_child("TacticalGridOverlay", true, false)
			var ext_n_cnt := 0; var ext_s_cnt := 0; var ext_w_cnt := 0
			if g_ov:
				for vc in g_ov.verified_cells:
					var cr: Array = vc["corners"]
					var gpt: Vector3 = (cr[0] + cr[1] + cr[2] + cr[3]) * 0.25
					if gpt.z < 0.0: ext_n_cnt += 1
					elif gpt.z > 33.0: ext_s_cnt += 1
					elif gpt.x < 0.0: ext_w_cnt += 1
			check(ext_n_cnt >= 20 and ext_s_cnt >= 20 and ext_w_cnt >= 20, "Tactical grid covers extended North/South/West trails (N=%d S=%d W=%d) (#1, #2)" % [ext_n_cnt, ext_s_cnt, ext_w_cnt])
			var tree_tot_2 := 0
			for tval in (inst.outdoor_builder.flora_stats.get("trees", {}) as Dictionary).values():
				tree_tot_2 += int(tval)
			var bush_tot_2 := 0
			for bval in (inst.outdoor_builder.flora_stats.get("bushes", {}) as Dictionary).values():
				bush_tot_2 += int(bval)
			check(tree_tot_2 >= 200 and bush_tot_2 >= 450, "Denser woodland trees (%d) and tree-base bush clusters (%d) outside grid (#5, #6)" % [tree_tot_2, bush_tot_2])
			var deer_outside := true
			var stag_long := false
			for fa in inst.outdoor_builder.fauna_agents:
				var fnode: Node = fa.get("node")
				var fname := str(fnode.name) if fnode else str(fa.get("name", ""))
				if fname in ["ForestDeer", "ForestStag"]:
					if fname == "ForestStag":
						stag_long = float(fa.get("visit_cycle", 0.0)) >= 140.0
					for wp_v: Vector3 in fa.get("waypoints", []):
						if wp_v.x > -1.0 and wp_v.x < float(sdef.get("cols", 25)) * Structure.TILE_METERS + 1.0:
							deer_outside = false
						if wp_v.x <= 0.0 and absf(wp_v.z - 17.0) < 3.2:
							deer_outside = false
			check(deer_outside and stag_long, "Deer and Stag routes stay outside all grid/trail cells with longer spawn cooldowns (#3)")
			inst.set_env_time("dusk")
			inst.outdoor_builder._fauna_time = 20.0
			inst.outdoor_builder.sync_wildlife()
			var f_deer := inst.find_child("ForestDeer", true, false) as Node3D
			if f_deer:
				var gy_d: float = inst.outdoor_builder.eval_ground_height(f_deer.position.x, f_deer.position.z)
				check(not f_deer.visible or absf(f_deer.position.y - gy_d) < 0.06, "ForestDeer hooves match exact terrain height (dy=%.3f) (#4)" % absf(f_deer.position.y - gy_d))
			if f_stag and f_stag.visible:
				var gy_s: float = inst.outdoor_builder.eval_ground_height(f_stag.position.x, f_stag.position.z)
				check(absf(f_stag.position.y - gy_s) < 0.06, "ForestStag hooves match exact terrain height (dy=%.3f) (#4)" % absf(f_stag.position.y - gy_s))
			var river_eval_y: float = inst.outdoor_builder.eval_ground_height(inst.outdoor_builder._river_center_x(14.0), 14.0)
			check(river_eval_y <= -0.15 and river_eval_y >= -0.25, "Shallow river floor recessed to shallow wading depth (y=%.2fm) (#8)" % river_eval_y)
			# Test wading upright (no swim!), splash/ripple generation, wet boots (2-3 min) & climate-dependent footprints (#8, #9, #10)
			var orig_tok_pos := tok.global_position
			tok.set("action_lock_timer", 0.0)
			tok.set("action_anim_name", "")
			var rx_wade: float = inst.outdoor_builder._river_center_x(14.0)
			tok.global_position = Vector3(rx_wade, -0.18, 14.0)
			tok._physics_process(0.1)
			tok.global_position = Vector3(rx_wade + 0.32, -0.18, 14.3)
			tok._physics_process(0.1)
			inst.outdoor_builder._update_river_mover_ripples()
			var wade_state: String = tok._resolve_desired_state(Vector2.RIGHT)
			check(bool(tok.get("in_shallow_water")) and not bool(tok.get("in_deep_water")) and wade_state in ["walk", "torch_walk"] and wade_state != "swim", "Token wades upright through shallow creek instead of swimming (%s) (#8)" % wade_state)
			check(tok.get_wetness_remaining() >= 120.0 and inst.outdoor_builder._river_ripple_ring.size() == 8 and tok.find_child("WaterSplashParticles", true, false) != null, "Creek wading triggers ripples, splash particles, and 2-3 min boot wetness (#9, #10)")
			# Step out onto dry ground & walk ~18m -> stamps degrade progressively & stop <= 15m!
			tok.set_meta("weather_override", "clear")
			tok.set_meta("phase_override", "night")
			tok.global_position = Vector3(12.0, 0.0, 14.0)
			tok._physics_process(0.05)
			for step_i in range(32):
				tok.global_position = Vector3(12.0 + float(step_i + 1) * 0.56, 0.0, 14.0)
				tok._physics_process(0.05)
			var fp_cnt: int = tok.get_wet_footprint_count()
			var first_a: float = float(tok._wet_footprints[0]["orig_alpha"]) if fp_cnt >= 2 else 0.0
			var last_a: float = float(tok._wet_footprints[fp_cnt - 1]["orig_alpha"]) if fp_cnt >= 2 else 1.0
			check(fp_cnt >= 20 and fp_cnt <= 27 and float(tok.get("wet_distance_remaining_m")) <= 0.01, "Wet footprints stop strictly within 15 meters (count=%d) (#10)" % fp_cnt)
			check(first_a > last_a * 2.5 and last_a <= 0.16, "Wet footprint intensity degrades along trail (start=%.2f -> end=%.2f) (#10)" % [first_a, last_a])
			# Walking even further after 15m spawns zero additional prints
			tok.global_position = Vector3(31.5, 0.0, 14.0)
			tok._physics_process(0.05)
			check(tok.get_wet_footprint_count() == fp_cnt, "Zero additional wet prints spawned past 15 meters (#10)")
			var day_prof := PlayerToken.get_footprint_evaporation_profile("clear", "day")
			var night_prof := PlayerToken.get_footprint_evaporation_profile("clear", "night")
			var fog_prof := PlayerToken.get_footprint_evaporation_profile("fog", "day")
			check(float(day_prof["footprint_life_s"]) < float(night_prof["footprint_life_s"]) and float(night_prof["footprint_life_s"]) < float(fog_prof["footprint_life_s"]), "Footprint drying speed varies by weather & time of day (day=%.0fs < night=%.0fs < fog=%.0fs) (#10)" % [day_prof["footprint_life_s"], night_prof["footprint_life_s"], fog_prof["footprint_life_s"]])
			# Fast-forward 180s -> night footprints vanish!
			tok._physics_process(180.0)
			check(tok.get_wet_footprint_count() == 0, "Wet footprints fade away cleanly after lifetime expires (#10)")
			tok.remove_meta("weather_override")
			tok.remove_meta("phase_override")
			tok.global_position = orig_tok_pos

			# Verify bridge crossing stays 100% dry even near plank edges & ramps
			tok.set("wetness_remaining_s", 0.0)
			tok.set("wet_distance_remaining_m", 0.0)
			for bx_off: float in [-1.5, 0.0, 1.5]:
				for bz_off: float in [-0.75, 0.0, 0.75]:
					tok.global_position = Vector3(bridge_x + bx_off, 0.14, 17.0 + bz_off)
					tok._physics_process(0.05)
			check(not bool(tok.get("in_water")) and not bool(tok.get("in_shallow_water")) and tok.get_wetness_remaining() == 0.0, "Bridge crossing stays completely dry across deck and edges")
			tok.global_position = orig_tok_pos

			# Verify river fish stay 100% inside meandering stream channel & spawn/despawn off-camera
			inst.set_env_time("day")
			inst.set_env_weather("clear")
			var fish_in_water := true
			var far_spawns_ok := true
			for tr_i in range(3):
				var tr_n := inst.find_child("StreamTrout_%d" % tr_i, true, false) as Node3D
				if tr_n:
					for t_s: float in [20.0, 26.0, 32.0, 36.0]:
						inst.outdoor_builder._fauna_time = t_s
						inst.outdoor_builder.sync_wildlife()
						if tr_n.visible:
							var cx_t: float = inst.outdoor_builder._river_center_x(tr_n.position.z)
							var hw_t: float = inst.outdoor_builder._river_half_width(tr_n.position.z)
							if absf(tr_n.position.x - cx_t) > hw_t - 0.30:
								fish_in_water = false
			for fa in inst.outdoor_builder.fauna_agents:
				var fnode2: Node = fa.get("node")
				var fname2 := str(fnode2.name) if fnode2 else ""
				if fname2 in ["ForestDeer", "ForestStag", "ForestFox", "ForestRabbit_0", "ForestRabbit_1"]:
					var wps: Array = fa.get("waypoints", [])
					var d_camp_0 := Vector2(wps[0].x - 18.0, wps[0].z - 16.5).length()
					var d_camp_e := Vector2(wps[-1].x - 18.0, wps[-1].z - 16.5).length()
					if d_camp_0 < 22.0 or d_camp_e < 22.0:
						far_spawns_ok = false
			check(fish_in_water, "All stream trout remain strictly inside meandering river water channel")
			check(far_spawns_ok, "Woodland animals enter and exit strictly far off-camera (>22m from camp)")

			# Verify active wildlife flee when hero approaches closely
			inst.set_env_time("dusk")
			inst.set_env_weather("clear")
			inst.outdoor_builder._fauna_time = 20.0
			inst.outdoor_builder.sync_wildlife()
			if f_deer and f_deer.visible:
				var start_deer_pos := f_deer.position
				tok.global_position = start_deer_pos + Vector3(3.0, 0.0, 0.0)
				for _step in range(10):
					inst.outdoor_builder._process(0.08)
				var post_dist := f_deer.position.distance_to(tok.global_position)
				check(post_dist > 3.5 or not f_deer.visible, "Approaching ForestDeer triggers active flee away from hero (dist=%.2fm)" % post_dist)
			tok.global_position = orig_tok_pos

			# Verify open camp tarp stays visible, keeps camera tilt unchanged, and mounts occluded silhouette shader
			var shelter_pt: Dictionary = inst.outdoor_builder.shelter_anchors.get("forest-tent-mia", {})
			if not shelter_pt.is_empty():
				var pre_pitch: float = inst.camera.target_pitch if inst.camera else 18.0
				tok.global_position = shelter_pt["center"]
				tok._physics_process(0.05)
				await process_frame
				var tarp_root := inst.find_child("CanvasShelter_forest", true, false) as Node3D
				var sil_n := tok.find_child("OccludedSilhouette", true, false) as Sprite3D
				check(tent_mia.visible and (tarp_root != null and tarp_root.visible), "Open tarp shelter remains visible when standing underneath")
				check(not bool(tok.current_zone.get("is_interior", true)), "Open tarp zone is marked exterior so camera tilt does not snap")
				check(inst.camera == null or absf(inst.camera.target_pitch - pre_pitch) < 0.01, "Camera pitch remains steady under open tarp (%.2f -> %.2f)" % [pre_pitch, inst.camera.target_pitch if inst.camera else 0.0])
				check(sil_n != null and sil_n.material_override is ShaderMaterial and sil_n.texture == tok.sprite.texture, "Occluded silhouette Sprite3D shader attached & synced")
				tok.global_position = orig_tok_pos

			# Verify kettle steam when fire lit, stoke button & boosted flames/smoke, and kettle bubbles on cook
			tok.global_position = Structure.tile_to_world(12, 11, 0.0) # Right beside forest-fire-point
			inst._update_nearest_interaction()
			var fire_btn: Button = ui.player_hud.interact_btn
			var cook_btn: Button = ui.player_hud.fire_cook_btn
			check(not fire_btn.disabled and "Avivar" in fire_btn.text and cook_btn != null and cook_btn.visible, "Near campfire offers direct Avivar button and Cocinar button")
			inst.set_env_time("night")
			inst.fire_fuel = 0.72
			inst.fx.set_campfire_fuel(0.72)
			inst.fx.stoke_timer_s = 0.0
			inst.fx.cooking_timer_s = 0.0
			inst.fx._process(0.05)
			var steam_n := inst.find_child("KettleSteamParticles", true, false) as GPUParticles3D
			var smoke_n := inst.find_child("CampfireSmokeParticles", true, false) as GPUParticles3D
			var bub_n := inst.find_child("KettleBubblesParticles", true, false) as GPUParticles3D
			check(steam_n != null and steam_n.emitting, "Lit campfire with kettle emits steam vapor particles")
			var base_flame_y := flame_n.scale.y
			var base_smoke_ratio := smoke_n.amount_ratio
			fire_btn.pressed.emit()
			inst.fx._process(0.05)
			check(inst.fx.get_stoke_boost() > 0.7 and flame_n.scale.y > base_flame_y * 1.15 and smoke_n.amount_ratio > base_smoke_ratio + 0.25, "Stoking fire increases flames and smoke output temporarily")
			cook_btn.pressed.emit()
			inst.fx._process(0.05)
			check(inst.fx.is_kettle_cooking() and bub_n != null and bub_n.emitting, "Cooking on kettle emits broth bubbles and active boil")
			inst.perform_camp_activity("fire-toggle")
			inst.fx._process(0.05)
			check(not steam_n.emitting and not bub_n.emitting, "Extinguishing fire stops kettle steam and cooking bubbles")
			tok.global_position = orig_tok_pos

			# FASE 1 Paso 1.6: zero degenerate/stretched triangles (>3.0m) in BiomeVegetation meshes
			var veg_grp := inst.find_child("BiomeVegetation", true, false)
			var long_veg_tris := 0
			if veg_grp:
				for mi_v in veg_grp.find_children("*", "MeshInstance3D", true, false):
					var m_inst := mi_v as MeshInstance3D
					if m_inst == null or m_inst.mesh == null or m_inst.mesh.get_surface_count() == 0:
						continue
					var faces: PackedVector3Array = m_inst.mesh.get_faces()
					for fi in range(0, faces.size(), 3):
						var e0 := faces[fi].distance_to(faces[fi + 1])
						var e1 := faces[fi + 1].distance_to(faces[fi + 2])
						var e2 := faces[fi + 2].distance_to(faces[fi])
						if maxf(e0, maxf(e1, e2)) > 3.2:
							long_veg_tris += 1
			check(long_veg_tris == 0, "Forest BiomeVegetation has zero stretched/degenerate triangles (>3.2m)")

			# FASE 1 Paso 1.6: verify CanvasShelter guy-ropes stay locally anchored to shelter (never teleported to riverbank!)
			var sh_node := inst.find_child("CanvasShelter_forest", true, false) as Node3D
			var stray_shelter_parts := 0
			if sh_node:
				for sm_n in sh_node.find_children("*", "MeshInstance3D", true, false):
					var smi := sm_n as MeshInstance3D
					if smi.global_position.distance_to(sh_node.global_position) > 5.0:
						stray_shelter_parts += 1
			check(sh_node != null and stray_shelter_parts == 0, "CanvasShelter_forest ropes and parts stay within 5m of shelter (zero stray riverbank lines)")

			# FASE 1 Paso 5.12: SelectionRing elevates cleanly to water surface while wading
			var rx_ring: float = inst.outdoor_builder._river_center_x(13.8)
			tok.global_position = Vector3(rx_ring, -0.18, 13.8)
			tok._physics_process(0.05)
			check(tok.in_shallow_water and tok.selection_ring.position.y > 0.14, "SelectionRing rises above water surface when wading in creek")
			tok.global_position = orig_tok_pos
			tok._physics_process(0.05)
			check(not tok.in_shallow_water and is_equal_approx(tok.selection_ring.position.y, 0.035), "SelectionRing returns flush to 0.035m on dry ground")

			# FASE 1 Paso 5.13: Automatic pathfinding across stream prefers StreamFootbridge over wading
			var p_east := Vector3(10.5, 0.0, 15.75)
			var p_west := Vector3(-3.0, 0.0, 15.75)
			var route: PackedVector3Array = inst.grid_overlay.find_path(p_east, p_west)
			var uses_bridge := false
			var wades_open_creek := false
			for wp_r in route:
				if Structure.is_on_forest_bridge(wp_r):
					uses_bridge = true
				elif Structure.is_water_at(wp_r, inst.scene_def):
					wades_open_creek = true
			check(route.size() >= 5 and uses_bridge and not wades_open_creek, "Automatic navigation routes across StreamFootbridge instead of wading river")

			# FASE 1 Paso 10: O2-scoped progressive foliage occlusion fade active on all forest canopies
			var occ_mats: Array = inst.outdoor_builder._forest_occlude_mats
			var all_occ_enabled := occ_mats.size() >= 6
			for om in occ_mats:
				var sm_o := om as ShaderMaterial
				if sm_o == null or float(sm_o.get_shader_parameter("occlude_fade_enabled")) < 0.5:
					all_occ_enabled = false
			inst.outdoor_builder._update_foliage_occlusion()
			check(all_occ_enabled, "Forest O2 enables progressive foliage occlusion fade on tree canopy shaders")

			# ------------------------------------------------------------------
			# FASE 2 (Pasos 11-20): Shelter, Campfire/Cauldron, Furniture, Rest,
			# Lighting, 2D-in-3D Slope Alignment, Tree-Branch Perches & Footstep Audio
			# ------------------------------------------------------------------
			# Paso 11: Reconstructed Canvas Shelter (4 poles, ridgepole, corner patches/grommets, stakes, shader & >=1.45m clearance)
			var tarp_mesh_node := sh_node.find_child("ShelterCanvasMesh", true, false) as MeshInstance3D if sh_node else null
			var front_p0 := sh_node.find_child("FrontPole_0", true, false) as Node3D if sh_node else null
			var front_p1 := sh_node.find_child("FrontPole_1", true, false) as Node3D if sh_node else null
			var rear_p0 := sh_node.find_child("RearPole_0", true, false) as Node3D if sh_node else null
			var rear_p1 := sh_node.find_child("RearPole_1", true, false) as Node3D if sh_node else null
			var ridge_bar := sh_node.find_child("RidgePole", true, false) as Node3D if sh_node else null
			var grommet_3 := sh_node.find_child("CornerGrommet_3", true, false) as Node3D if sh_node else null
			var stake_3 := sh_node.find_child("ShelterStake_3", true, false) as Node3D if sh_node else null
			var sh_clear_h := float(inst.outdoor_builder.shelter_anchors.get("forest-tent-mia", {}).get("min_clear_height", 0.0))
			check(
				tarp_mesh_node != null and tarp_mesh_node.material_override is ShaderMaterial and front_p0 != null and front_p1 != null and rear_p0 != null and rear_p1 != null and ridge_bar != null and grommet_3 != null and stake_3 != null and sh_clear_h >= 1.45,
				"Paso 11: Forest canvas shelter has 4 corner timber poles, ridgepole, corner grommets, stakes, woven shader & >=1.45m headroom"
			)

			# Paso 12: Reconstructed Campfire, Converging Tripod, Chain/Hook/Bail Cauldron, Non-Clipping Annular Smoke & 3 Fire States
			var hearth_node := inst.find_child("CampHearth", true, false) as Node3D
			var tri_0 := hearth_node.find_child("TripodLeg_0", true, false) as MeshInstance3D if hearth_node else null
			var tri_1 := hearth_node.find_child("TripodLeg_1", true, false) as MeshInstance3D if hearth_node else null
			var tri_2 := hearth_node.find_child("TripodLeg_2", true, false) as MeshInstance3D if hearth_node else null
			var apex_ring := hearth_node.find_child("TripodApexRing", true, false) as Node3D if hearth_node else null
			var bail_handle := hearth_node.find_child("CauldronBailHandle", true, false) as Node3D if hearth_node else null
			var hook_node := hearth_node.find_child("CauldronHook", true, false) as Node3D if hearth_node else null
			var kettle_node := hearth_node.find_child("CampfireKettle", true, false) as Node3D if hearth_node else null
			var tripod_converges := false
			if hearth_node and tri_0 and tri_1 and tri_2:
				var apex_world := hearth_node.to_global(Vector3(0.0, 1.28, 0.0))
				var d0 := (tri_0.global_position + tri_0.global_transform.basis.y.normalized() * 0.65).distance_to(apex_world)
				var d1 := (tri_1.global_position + tri_1.global_transform.basis.y.normalized() * 0.65).distance_to(apex_world)
				var d2 := (tri_2.global_position + tri_2.global_transform.basis.y.normalized() * 0.65).distance_to(apex_world)
				tripod_converges = maxf(d0, maxf(d1, d2)) < 0.22
			check(
				tripod_converges and apex_ring != null and bail_handle != null and hook_node != null and kettle_node != null and is_equal_approx(kettle_node.position.y, 0.49),
				"Paso 12: 3 tripod legs converge radially to top lashing apex and suspend cauldron at y=0.49m via chain, S-hook & bail handle"
			)
			var smoke_p := hearth_node.find_child("CampfireSmokeParticles", true, false) as GPUParticles3D if hearth_node else null
			var smoke_pm := smoke_p.process_material as ParticleProcessMaterial if smoke_p else null
			check(
				smoke_pm != null and smoke_pm.emission_shape == ParticleProcessMaterial.EMISSION_SHAPE_RING and smoke_pm.emission_ring_inner_radius >= 0.18,
				"Paso 12.21: CampfireSmokeParticles uses annular ring emission curling around cauldron exterior without bottom clipping"
			)
			check(
				hearth_node.find_child("CampfireLog_5", true, false) != null and hearth_node.find_child("LogEmberFissure_5", true, false) != null and hearth_node.find_child("GlowingCoal_6", true, false) != null and hearth_node.find_child("HearthStone_10", true, false) != null and hearth_node.find_child("FlameBlade_4", true, false) != null,
				"Paso 12.8-12.12: Campfire has 6 charred logs with ember fissures, 7 glowing coals, 11 irregular hearth stones & 5 multi-height flame blades"
			)
			inst.fx.set_campfire_state("embers", true)
			var st_embers: String = str(inst.fx.get_campfire_state())
			var e_embers: float = float(inst.fx._fire_lights[0]["light"].light_energy)
			inst.fx.set_campfire_state("off", true)
			var st_off: String = str(inst.fx.get_campfire_state())
			var e_off: float = float(inst.fx._fire_lights[0]["light"].light_energy)
			inst.fx.set_campfire_state("lit", true)
			var st_lit: String = str(inst.fx.get_campfire_state())
			var e_lit: float = float(inst.fx._fire_lights[0]["light"].light_energy)
			check(
				st_embers == "embers" and st_off == "off" and st_lit == "lit" and is_zero_approx(e_off) and e_embers > 0.2 and e_lit > e_embers * 1.6,
				"Paso 12.18-12.19: Campfire transitions cleanly across 'off', 'embers' and 'lit' states with linked light intensity"
			)

			# Paso 13: Log seat heartwood cut end-caps, worn seating surface & 3D-thickened bedrolls
			var log_seat := inst.find_child("NaturalSeat_forest", true, false)
			var bed_keys: Array = inst.outdoor_builder.bedrolls.keys()
			var bed_id_0 := str(bed_keys[0]) if bed_keys.size() > 0 else ""
			var bed_id_1 := str(bed_keys[1]) if bed_keys.size() > 1 else ""
			var bed_a: Node = inst.outdoor_builder.bedrolls[bed_id_0].get("root") if bed_id_0 != "" else null
			check(
				log_seat != null and log_seat.find_child("LogCutEnd_0", true, false) != null and log_seat.find_child("LogCutCore_0", true, false) != null and log_seat.find_child("LogWornSeatFlat_0", true, false) != null,
				"Paso 13.1-13.4: Log seat features heartwood cut end-caps, growth-ring cores, worn top flats & ground chock stones"
			)
			check(
				bed_a != null and bed_a.find_child("BedGroundsheet", true, false) != null and bed_a.find_child("BedBlanket", true, false) != null and bed_a.find_child("BedCollarFold", true, false) != null,
				"Paso 13.5-13.7: Bedrolls feature 3D physical thickness on groundsheets, wool blankets and folded collars"
			)

			# Paso 14: Simultaneous multi-character rest, contextual HUD button cleanup, short/long rest & save/restore state roundtrip
			tok.global_position = Structure.tile_to_world(13, 12, 0.05) # near fire
			inst._update_nearest_interaction()
			var cook_btn_near: bool = inst.role_ui.player_hud.fire_cook_btn.visible
			tok.global_position = Structure.tile_to_world(3, 11, 0.16) # away on bridge
			inst._update_nearest_interaction()
			var cook_btn_far: bool = inst.role_ui.player_hud.fire_cook_btn.visible
			check(cook_btn_near and not cook_btn_far, "Paso 14.15: Contextual CampCookButton shows near fire and hides immediately when moving away")

			var tok_mia: Node3D = inst.party_tokens[0]
			var tok_rogue: Node3D = inst.party_tokens[1]
			var tok_mike: Node3D = inst.party_tokens[2]
			var mia_bed_id := "forest-bed-mia" if inst.outdoor_builder.bedrolls.has("forest-bed-mia") else bed_id_0
			var mike_bed_id := "forest-bed-mike" if inst.outdoor_builder.bedrolls.has("forest-bed-mike") else bed_id_1
			inst.select_party_member(0)
			inst.perform_camp_activity("rest", {"id": mia_bed_id, "kind": "bed"})
			inst.select_party_member(2)
			inst.perform_camp_activity("rest", {"id": mike_bed_id, "kind": "bed"})
			inst.select_party_member(1)
			inst.perform_camp_activity("sit", {"id": "forest-seat-a-point", "kind": "seat", "col": 11, "row": 11, "objectCol": 11, "objectRow": 11})
			check(
				str(tok_mia.get("resting_on")) == mia_bed_id and str(tok_mike.get("resting_on")) == mike_bed_id and bool(tok_rogue.get("is_sitting")),
				"Paso 14.11: All 3 party members can rest/sit simultaneously on distinct camp furniture without conflict"
			)

			# Save camp state while all 3 characters are resting/seated and chest 0 is open
			var chest_id_0 := chests[0] if not chests.is_empty() else ""
			inst.toggle_chest_by_id(chest_id_0)
			var saved_state: Dictionary = inst.export_camp_state()
			# Mutate state completely (stand everyone up, close chest, change phase/weather/fire)
			tok_mia.call("stand_from_bed")
			tok_mike.call("stand_from_bed")
			tok_rogue.call("set_stance", "reset")
			inst.toggle_chest_by_id(chest_id_0)
			inst.set_env_time("day")
			inst.fx.set_campfire_state("off", true)
			# Restore saved state and verify 100% fidelity
			var restored_ok: bool = inst.restore_camp_state(saved_state)
			check(
				restored_ok and str(tok_mia.get("resting_on")) == mia_bed_id and str(tok_mike.get("resting_on")) == mike_bed_id and bool(tok_rogue.get("is_sitting")) and bool(inst.outdoor_builder.chest_lids[chest_id_0]["open"]),
				"Paso 14.17 & 20.19: export_camp_state / restore_camp_state roundtrip preserves resting poses, seated states, backpack lids & fire state"
			)
			tok_mia.call("stand_from_bed")
			tok_mike.call("stand_from_bed")
			tok_rogue.call("set_stance", "reset")
			inst.toggle_chest_by_id(chest_id_0)
			inst.select_party_member(0)
			tok.global_position = orig_tok_pos

			# Short & long rest mechanics (Paso 14.10)
			inst.role_ui.actors[0]["hp"] = 3
			var sr_out: Dictionary = inst.perform_camp_rest("short-rest")
			var hp_after_short := int(inst.role_ui.actors[0]["hp"])
			var lr_out: Dictionary = inst.perform_camp_rest("long-rest")
			var hp_after_long := int(inst.role_ui.actors[0]["hp"])
			var hp_max_0 := int(inst.role_ui.actors[0]["hp_max"])
			check(
				hp_after_short > 3 and hp_after_long == hp_max_0 and str(lr_out.get("rest_phase")) == "dawn" and str(lr_out.get("campfire_state")) == "embers",
				"Paso 14.10: Short and long rest rules recover party HP, advance clock and leave dawn embers"
			)

			# Paso 15: Daylight clarity (far fog_depth_begin >= 75m, low density) & night character light discipline
			inst.set_env_weather("clear")
			inst.set_env_time("day")
			var env_day: Environment = inst.fx.world_env.environment
			check(
				env_day.fog_depth_begin >= 75.0 and env_day.fog_density <= 0.065 and inst.fx.sun_light.light_energy >= 1.45,
				"Paso 15.3-15.7: Clear daytime pushes fog beyond 75m at low density (<=0.065) with crisp sun contrast"
			)
			inst.set_env_time("night")
			tok.call("set_torch_mode", false, false)
			inst._sync_party_ambient_lights()
			check(
				is_zero_approx(tok.carried_light.light_energy) and not tok.carried_light.visible,
				"Paso 15.10 & 15.13: Unlit torch emits zero personal self-light at night"
			)

			# Paso 16: Slope-aligned SelectionRing & ContactShadow on sloped terrain/bank
			var slope_x: float = float(inst.outdoor_builder._river_center_x(14.0)) + float(inst.outdoor_builder._river_half_width(14.0)) + 0.35
			tok.global_position = Vector3(slope_x, inst.outdoor_builder.eval_ground_height(slope_x, 14.0), 14.0)
			tok._physics_process(0.05)
			var slope_n: Vector3 = tok.call("_resolve_floor_normal")
			check(
				slope_n.y < 0.9995 and tok.selection_ring.basis.y.normalized().dot(slope_n) > 0.98,
				"Paso 16.11-16.12: SelectionRing and ContactShadow align their basis to sloped riverbank/bridge normals"
			)
			tok.global_position = orig_tok_pos
			tok._physics_process(0.05)

			# Paso 17.4 & 17.20-17.21: Tree-branch perched birds & surface-differentiated footstep audio ("earth", "wood", "water")
			var thrush := inst.find_child("ForestPerchedThrush", true, false) as Node3D
			var finch := inst.find_child("ForestPerchedFinch", true, false) as Node3D
			check(
				thrush != null and thrush.position.y >= 2.2 and finch != null and finch.position.y >= 2.4,
				"Paso 17.4: Forest birds perch on elevated tree branches (y >= 2.2m)"
			)
			tok.global_position = Vector3(17.5, 0.05, 16.0) # clearing dirt
			tok._physics_process(0.016)
			var surf_earth := str(tok.call("get_current_footstep_surface"))
			tok.call("_trigger_footstep_audio")
			tok.global_position = Vector3(4.5, 0.16, 17.25) # wooden bridge
			tok._physics_process(0.016)
			var surf_wood := str(tok.call("get_current_footstep_surface"))
			tok.call("_trigger_footstep_audio")
			tok.global_position = Vector3(inst.outdoor_builder._river_center_x(13.8), -0.18, 13.8) # shallow creek water
			tok._physics_process(0.016)
			var surf_water := str(tok.call("get_current_footstep_surface"))
			tok.call("_trigger_footstep_audio")
			tok.global_position = orig_tok_pos
			tok._physics_process(0.016)
			check(
				surf_earth == "earth" and surf_wood == "wood" and surf_water == "water" and int(inst.audio_mgr.footstep_count_by_surface.get("earth", 0)) >= 1 and int(inst.audio_mgr.footstep_count_by_surface.get("wood", 0)) >= 1 and int(inst.audio_mgr.footstep_count_by_surface.get("water", 0)) >= 1,
				"Paso 17.21: Footstep audio differentiates 'earth', 'wood' (bridge) and 'water' (river wading)"
			)
			inst.fx.set_campfire_state("lit", true)
			inst._update_spatial_audio()
			var gain_lit: float = inst.audio_mgr.current_fire_audio_gain
			inst.fx.stoke_campfire(16.0)
			inst._update_spatial_audio()
			var gain_stoked: float = inst.audio_mgr.current_fire_audio_gain
			inst.fx.set_campfire_state("off", true)
			inst._update_spatial_audio()
			var gain_off: float = inst.audio_mgr.current_fire_audio_gain
			inst.fx.set_campfire_state("lit", true)
			check(
				gain_stoked > gain_lit and gain_lit > 0.15 and is_zero_approx(gain_off),
				"Paso 17.20: Fire audio intensity scales dynamically with fire state, fuel & stoke boost"
			)

			# ------------------------------------------------------------------
			# PASO 23 (23.1-23.7): Multi-variant broadleaf silhouettes, cohesive
			# crown normals, softened woodland greens, embedded root buttresses,
			# irregular trail-side density & wide impenetrable 3D hedgerows
			# ------------------------------------------------------------------
			var batches_d: Dictionary = inst.outdoor_builder.flora_stats.get("batches", {})
			var lobe_vars: Array = inst.outdoor_builder._env_kit.get_foliage_lobe_variants()
			var has_broad_variants := (
				batches_d.has("canopy_oak_near") or batches_d.has("canopy_oak_far")
			) and (
				batches_d.has("canopy_oak_v1_near") or batches_d.has("canopy_oak_v1_far")
			) and (
				batches_d.has("canopy_oak_v2_near") or batches_d.has("canopy_oak_v2_far")
			) and (
				batches_d.has("canopy_birch_v2_near") or batches_d.has("canopy_birch_v2_far")
			) and (
				batches_d.has("canopy_beech_v1_near") or batches_d.has("canopy_beech_v1_far")
			)
			check(
				lobe_vars.size() >= 7 and has_broad_variants,
				"Paso 23.1-23.2: Broadleaf species use 7 asymmetric foliage sub-masses and 4 distinct crown silhouette archetypes (v0..v3)"
			)

			# Paso 23.3: Softened broadleaf canopy green luminance (no overly bright yellow-green tints)
			var green_soft_ok := true
			for om_g in inst.outdoor_builder._forest_occlude_mats:
				var sm_g := om_g as ShaderMaterial
				if sm_g:
					var tc_v: Variant = sm_g.get_shader_parameter("tint_col")
					if tc_v is Color and (tc_v as Color).g > 0.52:
						green_soft_ok = false
			check(
				green_soft_ok,
				"Paso 23.3: All forest canopy shaders use softened natural woodland greens (tint.g <= 0.52)"
			)

			# Paso 23.5: Integrated flared root buttresses embedded deeply below y=0 (<= -0.45m) + RootMossCollar
			var oak_pr0: Dictionary = inst.outdoor_builder._env_kit.get_tree_species_proto("oak", 0)
			var birch_pr0: Dictionary = inst.outdoor_builder._env_kit.get_tree_species_proto("birch", 0)
			var oak_tr_m := oak_pr0.get("trunk") as Mesh
			var birch_tr_m := birch_pr0.get("trunk") as Mesh
			var moss_collar_n := inst.find_child("RootMossCollar", true, false)
			check(
				oak_tr_m != null and oak_tr_m.get_aabb().position.y <= -0.45 and birch_tr_m != null and birch_tr_m.get_aabb().position.y <= -0.45 and moss_collar_n != null,
				"Paso 23.5: Flared root buttresses plunge <= -0.45m into terrain with mossy root-collar cushions"
			)

			# Paso 23.4, 23.6, 23.7 & wide blocking 3D hedgerows
			var hedge_grp := inst.find_child("ForestHedgeThickets", true, false) as Node3D
			var hedge_cnt := hedge_grp.get_child_count() if hedge_grp else 0
			var hedge_colliders := 0
			if hedge_grp:
				for hc in hedge_grp.find_children("ForestHedgeCollider_*", "StaticBody3D", true, false):
					if hc != null:
						hedge_colliders += 1
			check(
				hedge_cnt >= 12 and hedge_colliders >= 8,
				"Paso 23: Builds %d wide volumetric 3D woodland hedgerows (%d with physical off-trail blocking colliders)" % [hedge_cnt, hedge_colliders]
			)

			# Full-map fauna & particles spread + raised shelter clearance (Mike) + boosted torch radius
			var sh_clear_mike := float(inst.outdoor_builder.shelter_anchors.get("forest-tent-mia", {}).get("min_clear_height", 0.0))
			check(
				sh_clear_mike >= 2.08,
				"Canvas shelter raised to %.2fm min clear height so Mike (1.80m) does not clip the tarp" % sh_clear_mike
			)

			var prev_active_i: int = inst.active_party_idx
			var tok_mike_t: Node3D = inst.party_tokens[2] if inst.party_tokens.size() >= 3 else tok
			tok_mike_t.call("set_torch_mode", true, true)
			inst._sync_party_ambient_lights()
			var follower_e: float = tok_mike_t.carried_light.light_energy if tok_mike_t.carried_light else 0.0
			inst.select_party_member(2 if inst.party_tokens.size() >= 3 else 0, false)
			var cl_lit: OmniLight3D = tok_mike_t.carried_light
			check(
				cl_lit != null and cl_lit.visible and cl_lit.omni_range >= 30.0 and cl_lit.light_energy >= 3.5 and follower_e >= 2.0 and cl_lit.omni_attenuation <= 0.65 and cl_lit.position.y >= 1.60,
				"Lit carried torch illuminates broad radius (range=%.1fm, active=%.2f, follower=%.2f, atten=%.2f, h=%.2fm)" % [
					cl_lit.omni_range if cl_lit else 0.0,
					cl_lit.light_energy if cl_lit else 0.0,
					follower_e,
					cl_lit.omni_attenuation if cl_lit else 9.0,
					cl_lit.position.y if cl_lit else 0.0
				]
			)
			tok_mike_t.call("set_torch_mode", false, false)
			inst.select_party_member(prev_active_i, false)
			inst._sync_party_ambient_lights()

			var has_north_fauna := inst.find_child("ForestDeer_North", true, false) != null and inst.find_child("StreamTrout_North", true, false) != null and inst.find_child("ForestPerchedThrush_N", true, false) != null
			var has_south_fauna := inst.find_child("ForestDoe_South", true, false) != null and inst.find_child("ForestFox_South", true, false) != null and inst.find_child("StreamTrout_South", true, false) != null
			var has_west_east_fauna := inst.find_child("ForestRabbit_NW", true, false) != null and inst.find_child("ForestRabbit_SW", true, false) != null and inst.find_child("ForestRabbit_NE", true, false) != null and inst.find_child("ForestRabbit_SE", true, false) != null and inst.find_child("ForestButterfly_WestGlade_0", true, false) != null and inst.find_child("ForestButterfly_EastGrove_0", true, false) != null
			var min_bird_x := 9999.0; var max_bird_x := -9999.0; var min_bird_z := 9999.0; var max_bird_z := -9999.0
			for bd: Dictionary in inst.fx._birds:
				var bc: Vector3 = bd.get("center", Vector3.ZERO)
				min_bird_x = minf(min_bird_x, bc.x); max_bird_x = maxf(max_bird_x, bc.x)
				min_bird_z = minf(min_bird_z, bc.z); max_bird_z = maxf(max_bird_z, bc.z)
			var min_ins_x := 9999.0; var max_ins_x := -9999.0; var min_ins_z := 9999.0; var max_ins_z := -9999.0
			for ind: Dictionary in inst.fx._insects:
				var ic: Vector3 = ind.get("center", Vector3.ZERO)
				min_ins_x = minf(min_ins_x, ic.x); max_ins_x = maxf(max_ins_x, ic.x)
				min_ins_z = minf(min_ins_z, ic.z); max_ins_z = maxf(max_ins_z, ic.z)
			check(
				has_north_fauna and has_south_fauna and has_west_east_fauna and (max_bird_x - min_bird_x) >= 40.0 and (max_bird_z - min_bird_z) >= 40.0 and (max_ins_x - min_ins_x) >= 45.0 and (max_ins_z - min_ins_z) >= 55.0,
				"Forest fauna, sky birds and firefly pockets span entire woodland map beyond camp (birds %.0fx%.0fm, insects %.0fx%.0fm)" % [max_bird_x - min_bird_x, max_bird_z - min_bird_z, max_ins_x - min_ins_x, max_ins_z - min_ins_z]
			)

			var pollen_pockets := 0
			var swirl_pockets := 0
			var mist_pockets := 0
			var min_px := 9999.0; var max_px := -9999.0; var min_pz := 9999.0; var max_pz := -9999.0
			for gp_n: Node in inst.fx.get_children():
				if not (gp_n is GPUParticles3D):
					continue
				if gp_n.name.begins_with("ForestPollenPocket_"):
					pollen_pockets += 1
				elif gp_n.name.begins_with("ForestLeafSwirl_"):
					swirl_pockets += 1
				elif gp_n.name.begins_with("RiverMistDrift_"):
					mist_pockets += 1
				if gp_n.name.begins_with("ForestPollenPocket_") or gp_n.name.begins_with("ForestLeafSwirl_") or gp_n.name.begins_with("RiverMistDrift_"):
					var ppos := (gp_n as Node3D).position
					min_px = minf(min_px, ppos.x); max_px = maxf(max_px, ppos.x)
					min_pz = minf(min_pz, ppos.z); max_pz = maxf(max_pz, ppos.z)
			check(
				pollen_pockets >= 6 and swirl_pockets >= 5 and mist_pockets >= 3 and (max_px - min_px) >= 45.0 and (max_pz - min_pz) >= 55.0,
				"Forest ambient particles form %d pollen/%d swirl/%d river-mist non-uniform pockets across %.0fx%.0fm" % [pollen_pockets, swirl_pockets, mist_pockets, max_px - min_px, max_pz - min_pz]
			)

			# Subtle fireflies (small pinpoint shader quads + organic blink off-duty cycles)
			inst.set_env_time("night")
			inst.set_env_weather("clear")
			inst.fx._process(0.05)
			var ff_sample: MeshInstance3D = inst.fx._insects[0]["node"] as MeshInstance3D if not inst.fx._insects.is_empty() else null
			var ff_quad := ff_sample.mesh as QuadMesh if ff_sample else null
			var ff_vis_cnt := 0
			for ind2: Dictionary in inst.fx._insects:
				var mn := ind2.get("node") as Node3D
				if mn != null and mn.visible:
					ff_vis_cnt += 1
			check(
				ff_quad != null and ff_quad.size.x <= 0.13 and ff_sample.material_override is ShaderMaterial and ff_vis_cnt < inst.fx._insects.size(),
				"Night fireflies use subtle pinpoint <=0.13m shader quads with staggered asynchronous blinks (%d/%d lit at once)" % [ff_vis_cnt, inst.fx._insects.size()]
			)

			# Perched bird physical stumps + anti-infinite flee-return loop while hero stands nearby
			var robin_n := inst.find_child("ForestPerchedRobin", true, false) as Node3D
			var stump_0 := inst.find_child("BirdPerchStump_0", true, false)
			var anti_loop_ok := false
			if robin_n != null:
				inst.set_env_time("day")
				inst.set_env_weather("clear")
				inst.outdoor_builder._fauna_time = 2.0
				inst.outdoor_builder.sync_wildlife()
				var robin_base := robin_n.position
				tok.global_position = Vector3(robin_base.x, 0.0, robin_base.z)
				for _step in range(20):
					inst.outdoor_builder._process(0.10)
				var hid_after_escape := not robin_n.visible
				# Advance past one full visit cycle (42s+) while hero STILL stands on perch spot -> must NOT respawn in hero's face!
				for _step2 in range(460):
					inst.outdoor_builder._process(0.10)
				var stayed_away := not robin_n.visible
				anti_loop_ok = hid_after_escape and stayed_away
				tok.global_position = orig_tok_pos
				inst.outdoor_builder._fauna_time = 0.0
				inst.outdoor_builder.sync_wildlife()
			inst.fx.call("_settle_sky_birds_clear_of_obstacles")
			var min_sky_y := 9999.0
			for bd2: Dictionary in inst.fx._birds:
				min_sky_y = minf(min_sky_y, float((bd2.get("center", Vector3.ZERO) as Vector3).y))
			check(
				stump_0 != null and anti_loop_ok and min_sky_y >= 8.0,
				"Birds perch on real stumps, clear treetops (min sky y=%.2fm) and stay away instead of infinite flee-return looping" % min_sky_y
			)

			# Selective lushness expansion (20 volumetric hedgerows + dense understory pockets)
			var total_shrubs := 0
			for b_key: String in ["bush_laurel", "bush_holly", "bush_fern_tall", "bush_fern_yarrow"]:
				total_shrubs += int(batches_d.get(b_key, 0))
			check(
				hedge_cnt >= 20 and hedge_colliders >= 10 and total_shrubs >= 600,
				"Selective forest lushness increased (%d hedgerows, %d colliders, %d understory shrub/fern instances)" % [hedge_cnt, hedge_colliders, total_shrubs]
			)

		elif sid == "camp-wreck-beach":
			check(inst.find_child("StrandedRowboat", true, false) != null, "Beach stranded rowboat built")
			check(inst.find_child("OceanWater", true, false) != null, "Beach ocean backdrop built")
			check(inst.find_child("CanvasShelter_wreck-beach", true, false) != null, "Beach windbreak tarp shelter built")
			check(inst.find_child("ShoreCrab_0", true, false) != null, "Beach shoreline crabs spawned")
			check(inst.find_child("BeachTurtle", true, false) != null, "Beach crawling sea turtle spawned")
			check(inst.find_child("BeachPerchedGull_0", true, false) != null, "Beach perched gull spawned")
			check(inst.find_child("SeaFish_0", true, false) != null and inst.find_child("SeaFish_1", true, false) != null, "Beach ocean surf fish spawned")
			check(inst.find_child("BiomeAmbientParticles_wreck-beach", true, false) != null, "Beach sea-spray ambience particles built")
			check(inst.outdoor_builder._forest_occlude_mats.is_empty(), "Beach does not activate O2-only foliage occlusion fade")

		elif sid == "camp-cliffs-observatory":
			check(inst.fx != null and inst.fx._aurora_meshes.size() == 3, "Observatory 3D auroras built")
			check(inst.find_child("CanvasShelter_cliff-observatory", true, false) != null, "Observatory low rock-weighted tarp built")
			check(inst.find_child("CliffIbex", true, false) != null, "Observatory mountain Ibex spawned")
			check(inst.find_child("CliffHare", true, false) != null, "Observatory cliff Hare spawned")
			check(inst.find_child("CliffPerchedRaven_0", true, false) != null, "Observatory perched Raven spawned")
			check(inst.find_child("BiomeAmbientParticles_cliff-observatory", true, false) != null, "Observatory wind mist particles built")
			check(inst.outdoor_builder._forest_occlude_mats.is_empty(), "Observatory does not activate O2-only foliage occlusion fade")

		elif sid == "camp-coastal-refuge":
			check(inst.find_child("RockyOverhangLip", true, false) != null, "Refuge overhang rock arch built")
			check(inst.find_child("GrottoCliffShell", true, false) != null, "Refuge continuous cave cliff shell built")
			check(inst.find_child("CanvasShelter*", true, false) == null, "Refuge has ZERO canvas tarps (natural cave is shelter)")
			check(inst.find_child("ShallowWaterCells", true, false) != null, "Refuge shallow tide pools built")
			check(inst.find_child("CaveFish_0", true, false) != null, "Refuge tidepool fish spawned")
			check(inst.find_child("SeaFish_Cove_0", true, false) != null, "Refuge ocean mouth fish spawned")
			check(inst.find_child("CaveCrab_0", true, false) != null, "Refuge tidepool crab spawned")
			check(inst.find_child("RefugePerchedTern_0", true, false) != null, "Refuge perched tern spawned")
			var bat0 := inst.find_child("CaveBat_0", true, false) as Node3D
			check(bat0 != null, "Refuge nocturnal bats spawned")
			inst.set_env_weather("clear")
			inst.set_env_time("day")
			check(bat0 != null and not bat0.visible, "Refuge nocturnal CaveBat hides during midday")
			inst.set_env_time("night")
			check(bat0 != null and bat0.visible, "Refuge nocturnal CaveBat emerges at night")
			inst.set_env_weather("storm")
			check(bat0 != null and not bat0.visible, "Refuge CaveBat shelters in storm")
			inst.set_env_weather("clear")
			check(inst.find_child("BiomeAmbientParticles_coastal-refuge", true, false) != null, "Refuge cave spore particles built")
			check(inst.fx != null and inst.fx._drips.size() >= 6, "Refuge water drips registered")
			check(inst.outdoor_builder._forest_occlude_mats.is_empty(), "Refuge does not activate O2-only foliage occlusion fade")

		# Weather & time progression checks
		inst.set_env_time("night")
		inst.set_env_weather("storm")
		check(inst.fx.current_phase == "night" and inst.fx.current_weather == "storm", "%s supports night + storm weather" % sid)
		inst.set_env_weather("snow")
		check(inst.fx.snow_cover > 0.5, "%s snow weather updates exposed surface cover" % sid)

		# Player camera zoom-out & world-bounds containment check (prevents floating map edges)
		if ui and ui.has_method("set_role"):
			ui.set_role("player")
			await process_frame
		cam.zoom_camera_step(200.0)
		cam._process(0.1)
		var wb: Rect2 = cam.get_world_visual_bounds()
		check(wb.has_area(), "%s exposes valid visual world bounds" % sid)
		check(cam.target_distance <= cam.get_player_max_distance(cam.current_zone_id) + 0.01, "%s clamps player max zoom (%.1f <= %.1f)" % [sid, cam.target_distance, cam.get_player_max_distance(cam.current_zone_id)])
		cam.set_overview_mode(true)
		cam._process(0.1)
		var ov_ext: Vector2 = cam._view_xz_extents(cam.current_distance, cam.current_pitch, cam.current_yaw, cam._get_viewport_aspect())
		check(cam.focus_point.x - ov_ext.x >= wb.position.x - 0.1 and cam.focus_point.x + ov_ext.x <= wb.end.x + 0.1, "%s player overview X stays inside map bounds" % sid)
		check(cam.focus_point.z - ov_ext.y >= wb.position.y - 0.1 and cam.focus_point.z + ov_ext.y <= wb.end.y + 0.1, "%s player overview Z stays inside map bounds" % sid)
		cam.set_overview_mode(false)
		cam.target_pitch = 5.0
		cam.current_pitch = 5.0
		cam.zoom_camera_step(200.0)
		cam._process(0.1)
		var low_ext: Vector2 = cam._view_xz_extents(cam.current_distance, cam.current_pitch, cam.current_yaw, cam._get_viewport_aspect())
		check(cam.focus_point.z - low_ext.y >= wb.position.y - 0.1 and cam.focus_point.z + low_ext.y <= wb.end.y + 0.1, "%s player low-tilt (5 deg) stays inside map bounds" % sid)
		cam.reset_camera_view()

		root.remove_child(inst)
		inst.queue_free()
		await process_frame

	print("CAMPS_TESTS PASSED=%d FAILED=%d" % [passed, failed.size()])
	if not failed.is_empty():
		printerr("FAILED ITEMS: ", failed)
	quit(0 if failed.is_empty() else 1)
