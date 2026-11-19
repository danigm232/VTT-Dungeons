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
				check(inst.find_child("ForestFlora_cards_willow", true, false) != null and inst.find_child("ForestFlora_mush_cap_amanita", true, false) != null, "Forest willow & amanita batches present")
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

		elif sid == "camp-wreck-beach":
			check(inst.find_child("StrandedRowboat", true, false) != null, "Beach stranded rowboat built")
			check(inst.find_child("OceanWater", true, false) != null, "Beach ocean backdrop built")
			check(inst.find_child("CanvasShelter_wreck-beach", true, false) != null, "Beach windbreak tarp shelter built")
			check(inst.find_child("ShoreCrab_0", true, false) != null, "Beach shoreline crabs spawned")
			check(inst.find_child("BeachTurtle", true, false) != null, "Beach crawling sea turtle spawned")
			check(inst.find_child("BeachPerchedGull_0", true, false) != null, "Beach perched gull spawned")
			check(inst.find_child("SeaFish_0", true, false) != null and inst.find_child("SeaFish_1", true, false) != null, "Beach ocean surf fish spawned")
			check(inst.find_child("BiomeAmbientParticles_wreck-beach", true, false) != null, "Beach sea-spray ambience particles built")

		elif sid == "camp-cliffs-observatory":
			check(inst.fx != null and inst.fx._aurora_meshes.size() == 3, "Observatory 3D auroras built")
			check(inst.find_child("CanvasShelter_cliff-observatory", true, false) != null, "Observatory low rock-weighted tarp built")
			check(inst.find_child("CliffIbex", true, false) != null, "Observatory mountain Ibex spawned")
			check(inst.find_child("CliffHare", true, false) != null, "Observatory cliff Hare spawned")
			check(inst.find_child("CliffPerchedRaven_0", true, false) != null, "Observatory perched Raven spawned")
			check(inst.find_child("BiomeAmbientParticles_cliff-observatory", true, false) != null, "Observatory wind mist particles built")

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

		# Weather & time progression checks
		inst.set_env_time("night")
		inst.set_env_weather("storm")
		check(inst.fx.current_phase == "night" and inst.fx.current_weather == "storm", "%s supports night + storm weather" % sid)
		inst.set_env_weather("snow")
		check(inst.fx.snow_cover > 0.5, "%s snow weather updates exposed surface cover" % sid)

		root.remove_child(inst)
		inst.queue_free()
		await process_frame

	print("CAMPS_TESTS PASSED=%d FAILED=%d" % [passed, failed.size()])
	if not failed.is_empty():
		printerr("FAILED ITEMS: ", failed)
	quit(0 if failed.is_empty() else 1)
