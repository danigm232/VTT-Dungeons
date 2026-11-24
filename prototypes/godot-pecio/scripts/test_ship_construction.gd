extends SceneTree

const Geometry = preload("res://scripts/ship_geometry.gd")
const Structure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
var failures: Array[String] = []
var passed := 0
var main: Node3D
var vessel: Node3D

func _initialize() -> void:
	_run.call_deferred()

func check(condition: bool, message: String) -> void:
	if condition:
		passed += 1
	else:
		failures.append(message)
		printerr("FAIL ", message)

func node(id: String) -> Node3D:
	return main.find_child(id, true, false) as Node3D

func ray(a: Vector3, b: Vector3) -> Dictionary:
	return main.get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(vessel.to_global(a), vessel.to_global(b)))

func stop_updates(n: Node) -> void:
	n.set_process(false)
	n.set_physics_process(false)
	for child in n.get_children():
		stop_updates(child)

func _run() -> void:
	seed(14112026)
	main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	await physics_frame
	await physics_frame
	stop_updates(main)
	vessel = node("ShipVessel")
	check(is_equal_approx(Structure.LENGTH, 61.5) and Structure.stations.size() == 12, "canonical length and 12 beam stations")
	check(is_equal_approx(vessel.list_angle, 9.5) and is_equal_approx(vessel.trim_angle, 1.2), "list and trim preserved")
	for id in ["Deck_C1", "Deck_C2", "Deck_C3", "Deck_C8", "Deck_C9", "Floor_AftCabins", "Floor_ForeCabins", "CrowsNestFloor"]:
		var top := node(id) as MeshInstance3D
		var shell := top.get_node_or_null("ConstructionShell") if top else null
		check(shell != null, id + " thickness")
		if shell:
			check(shell.find_children("*", "CollisionShape3D", true, false).is_empty(), id + " shell has no new physical obstruction")
	for id in ["KeelGarboard", "BreachStrakeEndgrain", "FifeJoinery", "HatchJoinery", "CrowRimAndKnees", "SailHeadLashings", "ChainplateStraps", "DeadeyeLanyards"]:
		check(node(id) != null, "assembly " + id)
	check(node("FallenForemast") == null and node("FallenForemast_C2") != null, "one owner for the broken foremast")
	var skull_root := node("GoldDragonSkull")
	var skull := skull_root.get_child(0) as MeshInstance3D
	check(skull.get_meta("refined_anatomy", false), "volumetric dragon cranium")
	var bone_raw := skull.get_active_material(0)
	var bone_albedo_tex: Texture2D = null
	var bone_normal_tex: Texture2D = null
	var bone_tint: Color = Color.WHITE
	if bone_raw is StandardMaterial3D:
		var bone_std := bone_raw as StandardMaterial3D
		bone_albedo_tex = bone_std.albedo_texture
		bone_normal_tex = bone_std.normal_texture
		bone_tint = bone_std.albedo_color
	elif bone_raw is ShaderMaterial:
		var bone_sh := bone_raw as ShaderMaterial
		bone_albedo_tex = bone_sh.get_shader_parameter("bone_tex") as Texture2D
		bone_normal_tex = bone_sh.get_shader_parameter("normal_tex") as Texture2D
		var raw_tint = bone_sh.get_shader_parameter("bone_tint")
		if raw_tint is Color:
			bone_tint = raw_tint
	check(bone_raw != null and bone_albedo_tex != null and bone_normal_tex != null, "mineralized dragon bone procedural PBR")
	check(bone_albedo_tex != PbrMaterialKit.TEX_OAK and bone_albedo_tex != PbrMaterialKit.TEX_TIMBER, "bone has no wood planks or nails")
	check(bone_tint.r > bone_tint.b and bone_tint.b < 0.72, "bone has warm aged fossilized tint, not chalk white")
	check(skull.get_node_or_null("OrbitalCavities") != null, "recessed orbital cavities")
	check(skull.get_aabb().size.x >= 9.0, "mastodontic Gold Dragon skull scale")
	var skull_col := skull.find_children("*", "CollisionShape3D", true, false)[0] as CollisionShape3D
	check(skull_col.shape.get_faces().size() > 1500, "closed mastodontic dragon skull collision built")
	for bone_zone in ["CervicalNeckAndSpine", "BowDragonRemains", "DistantSkeletalSpires", "DragonBones_C8", "DragonBones_C9"]:
		check(node(bone_zone) != null, "dragon remains zone " + bone_zone)
	for id in ["MainYard", "TopYard"]:
		var yard := node(id)
		check(absf(yard.basis.y.normalized().dot(Vector3.FORWARD)) > 0.999, id + " transverse to ship length")
	for sail: Node3D in node("TatteredSails").get_children():
		check(absf(sail.basis.x.normalized().dot(Vector3.FORWARD)) > 0.999, "sail upper edge parallel to yards")
	for owner_id in ["Chainwales_Port", "Chainwales_Front"]:
		check(node(owner_id).find_children("Deadeye_*", "MeshInstance3D", false, false).size() == 8, owner_id + " paired deadeyes for four shrouds")

	# A diagonal and a vertical beam must both be closed solids, with physical volume.
	for b in [Vector3(2, 0, 0), Vector3(0, 2, 0), Vector3(0.5, 1.5, 2)]:
		var st := Geometry.begin(StandardMaterial3D.new())
		Geometry.beam(st, Vector3.ZERO, b, 0.2)
		var mesh := st.commit()
		var vertices: PackedVector3Array = mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
		var volume := 0.0
		for i in range(0, vertices.size(), 3):
			volume += vertices[i].dot(vertices[i + 1].cross(vertices[i + 2])) / 6.0
		check(absf(absf(volume) - b.length() * 0.04) < 0.0001, "closed beam volume " + str(b))

	# Actual physics queries verify supports and clear apertures, not just node names.
	for p in [Vector3(7.5, 0.0, -3), Vector3(-20, 3, -5), Vector3(20, 3, 5), Vector3(-24, 0, -4), Vector3(22, 0, 4), Vector3(7, -3.4, -4), Vector3(5, -6.4, -3)]:
		var support := Structure.get_world_pos(p.x, p.y, p.z)
		check(not ray(support + Vector3.UP * 0.45, support + Vector3.DOWN * 0.7).is_empty(), "floor support " + str(p))
	for p in [Vector3(1.5, 0, 5.25), Vector3(-17.5, 0, -3.2), Vector3(14.5, -3.35, 2.25)]:
		var hole := Structure.get_world_pos(p.x, p.y, p.z)
		check(ray(hole + Vector3.UP * 0.20, hole + Vector3.DOWN * 0.25).is_empty(), "open stair/breach aperture " + str(p))
	check(ray(Vector3(-31.5, -5, 0), Vector3(-30, -5, 0)).is_empty(), "P16 submerged stern entrance clear")
	for t in [0.10, 0.35, 0.65, 0.90]:
		var stair := Structure.get_world_pos(lerpf(-1.5, 4.5, t), lerpf(0, -3.28, t), 5.25)
		check(not ray(stair + Vector3.UP * 0.35, stair + Vector3.DOWN * 0.65).is_empty(), "C1-C8 stair support " + str(t))

	var roof := node("RoofCutout")
	roof.set_interior_mode("aft_c4_port", true)
	check(not node("Deck_C3").get_node("ConstructionShell").is_visible_in_tree(), "C4 hides new C3 slab")
	check(not node("HullInner_Aft_Front").get_node("LiningFramesAndKnees").is_visible_in_tree(), "C4 hides front lining details")
	for mode in ["lower_c8_bilge", "lower_c9_hold"]:
		roof.set_interior_mode(mode, true)
		for id in ["DeckWaterways", "BreachStrakeEndgrain", "CrowRimAndKnees", "SailHeadLashings", "ChainplateStraps"]:
			check(not node(id).is_visible_in_tree(), mode + " hides upper " + id)
		check(node("Deck_C9" if mode == "lower_c9_hold" else "Deck_C8").get_node("ConstructionShell").is_visible_in_tree(), mode + " retains its slab")
	roof.set_interior_mode("exterior", true)
	check(node("CrowRimAndKnees").is_visible_in_tree(), "exterior restoration")

	var output := ProjectSettings.globalize_path("res://../../output/godot-pecio-layers-20261114")
	DirAccess.make_dir_recursive_absolute(output)
	var metrics := {"passed": passed, "failures": failures, "mesh_instances": main.find_children("*", "MeshInstance3D", true, false).size(), "collision_shapes": main.find_children("*", "CollisionShape3D", true, false).size(), "engine": Engine.get_version_info().string, "fps_measured": false}
	FileAccess.open(output.path_join("construction-tests.json"), FileAccess.WRITE).store_string(JSON.stringify(metrics, "\t"))
	print("SHIP CONSTRUCTION: ", passed, " PASS / ", failures.size(), " FAIL")
	main.free()
	quit(0 if failures.is_empty() else 1)
