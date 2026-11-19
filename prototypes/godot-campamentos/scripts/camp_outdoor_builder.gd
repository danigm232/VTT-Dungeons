class_name CampOutdoorBuilder
extends Node3D

## Modular outdoor camp composer for all 4 VTT exterior bivouac maps in Godot 4 Forward+:
## - camp-forest-pleamar (forest clearing, stream, 1 tarp between two trees, natural rest cluster)
## - camp-wreck-beach (coastal rocks, tide line, 1 windbreak tarp, stranded rowboat, driftwood debris)
## - camp-cliffs-observatory (austere basalt windbreak plateau, 1 low rock-weighted tarp, localized crystals, auroras)
## - camp-coastal-refuge (natural rock cave shelter, ZERO tarps, elevated dry stone shelf, seaward hearth, tidepools & drips)

const Structure = preload("res://scripts/camp_structure.gd")
const MatKit = preload("res://scripts/camp_material_kit.gd")
const EnvKitScript = preload("res://scripts/camp_environment_kit.gd")
const PropFactory = preload("res://scripts/camp_prop_factory.gd")
const FaunaKit = preload("res://scripts/camp_fauna_kit.gd")

var cutaway_tents: Array[Dictionary] = []
var chest_lids: Dictionary = {}
var bedrolls: Dictionary = {}
var seat_anchors: Dictionary = {}
var shelter_anchors: Dictionary = {}
var fauna_agents: Array[Dictionary] = []

var _env_kit: EnvKitScript = EnvKitScript.new()
var _fx_ref: CampAtmosphereFx
var _hero_tokens: Array[Node3D] = []
var _stream_shader_mats: Array[ShaderMaterial] = []
var _model_cache: Dictionary = {}
var _fauna_time: float = 0.0
var _reduced_motion: bool = false:
	set(v):
		_reduced_motion = v
		for rm in _river_mats:
			if is_instance_valid(rm):
				rm.set_shader_parameter("reduced_motion", 1.0 if v else 0.0)
				rm.set_shader_parameter("flow_phase", 3.7)

# Forest river (camp-forest-pleamar, 17/11/2026): long meandering centreline sorted by z
var _river_pts: Array[Vector2] = []
var _river_mats: Array[ShaderMaterial] = []
var _river_depth_m: float = 33.0
var _tree_spots: Array[Vector2] = []
var river_length_m: float = 0.0
var flora_stats: Dictionary = {}

# Organized scene layers per ENCARGO MAESTRO §7.1
var _grp_terrain: Node3D
var _grp_env_geo: Node3D
var _grp_vegetation: Node3D
var _grp_structures: Node3D
var _grp_props: Node3D
var _grp_interactables: Node3D

func set_party_tokens(tokens: Array[Node3D]) -> void:
	_hero_tokens = tokens

func _collect_hero_positions() -> Array:
	var out: Array = []
	for tok in _hero_tokens:
		if is_instance_valid(tok):
			out.append(tok.global_position)
	return out

func sync_wildlife() -> void:
	var w_id := _fx_ref.current_weather if is_instance_valid(_fx_ref) else "clear"
	var p_id := _fx_ref.current_phase if is_instance_valid(_fx_ref) else "dusk"
	FaunaKit.update_agents(fauna_agents, _fauna_time, w_id, p_id, _collect_hero_positions())

func _process(delta: float) -> void:
	if _reduced_motion:
		return
	_fauna_time += delta
	sync_wildlife()

func build(scene_def: Dictionary, fx: CampAtmosphereFx) -> Dictionary:
	_prepare_build(scene_def, fx)
	var profile := str(scene_def.get("profile", "forest"))
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	var tile := Structure.TILE_METERS
	var width_m := float(cols) * tile
	var depth_m := float(rows) * tile
	if profile == "forest":
		_prepare_forest_river(depth_m)
	_build_walkable_ground_and_skirt(scene_def, profile, width_m, depth_m, tile)
	_build_bivouac_gear_and_points(scene_def, fx, profile)
	_build_profile_details(scene_def, fx, profile, width_m, depth_m, tile)
	return _build_result()

func build_async(scene_def: Dictionary, fx: CampAtmosphereFx, tree: SceneTree) -> Dictionary:
	_prepare_build(scene_def, fx)
	var profile := str(scene_def.get("profile", "forest"))
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	var tile := Structure.TILE_METERS
	var width_m := float(cols) * tile
	var depth_m := float(rows) * tile
	if profile == "forest":
		_prepare_forest_river(depth_m)
	_build_walkable_ground_and_skirt(scene_def, profile, width_m, depth_m, tile)
	await tree.process_frame
	_build_bivouac_gear_and_points(scene_def, fx, profile)
	await tree.process_frame
	_build_profile_details(scene_def, fx, profile, width_m, depth_m, tile)
	return _build_result()

func _prepare_build(_scene_def: Dictionary, fx: CampAtmosphereFx) -> void:
	_fx_ref = fx
	cutaway_tents.clear()
	chest_lids.clear()
	bedrolls.clear()
	seat_anchors.clear()
	shelter_anchors.clear()
	fauna_agents.clear()
	_stream_shader_mats.clear()

	_grp_terrain = _make_group("Terrain")
	_grp_env_geo = _make_group("EnvironmentGeometry")
	_grp_vegetation = _make_group("BiomeVegetation")
	_grp_structures = _make_group("CampStructures")
	_grp_props = _make_group("CampProps")
	_grp_interactables = _make_group("Interactables")

func _build_profile_details(scene_def: Dictionary, fx: CampAtmosphereFx, profile: String, width_m: float, depth_m: float, tile: float) -> void:
	match profile:
		"forest":
			_build_forest_details(scene_def, fx, width_m, depth_m)
		"wreck-beach":
			_build_beach_details(scene_def, fx, width_m, depth_m)
		"cliff-observatory":
			_build_observatory_details(scene_def, fx, width_m, depth_m)
		"coastal-refuge":
			_build_refuge_details(scene_def, fx, width_m, depth_m, tile)

func _build_result() -> Dictionary:
	return {
		"cutaways": cutaway_tents,
		"chest_lids": chest_lids,
		"bedrolls": bedrolls,
		"fauna_count": fauna_agents.size(),
	}

func _make_group(grp_name: String) -> Node3D:
	var n := Node3D.new()
	n.name = grp_name
	add_child(n)
	return n

func toggle_chest(chest_id: String) -> bool:
	if not chest_lids.has(chest_id):
		return false
	var entry: Dictionary = chest_lids[chest_id]
	var pivot: Node3D = entry.get("pivot")
	if not is_instance_valid(pivot):
		return false
	var open := not bool(entry.get("open", false))
	entry["open"] = open
	var target_deg := -105.0 if open else 0.0
	var tw := pivot.create_tween()
	tw.set_ease(Tween.EASE_OUT)
	tw.set_trans(Tween.TRANS_QUAD)
	tw.tween_property(pivot, "rotation_degrees:x", target_deg, 0.24)
	return open

func set_bedroll_state(bed_id: String, new_state: String) -> void:
	if bedrolls.has(bed_id):
		PropFactory.set_bedroll_state(bedrolls[bed_id], new_state)

func _spawn_prop_glb(
	parent: Node3D,
	filename: String,
	pos: Vector3,
	rot_y: float = 0.0,
	scale_vec: Vector3 = Vector3.ONE,
	disable_shadows: bool = true,
	node_name: String = "",
	override_mat: Material = null
) -> Node3D:
	var path := "res://assets/models/" + filename
	if not ResourceLoader.exists(path):
		return null
	var packed: PackedScene
	if _model_cache.has(path):
		packed = _model_cache[path]
	else:
		packed = load(path) as PackedScene
		if packed:
			_model_cache[path] = packed
	if not packed:
		return null
	var inst := packed.instantiate() as Node3D
	if not inst:
		return null
	if node_name != "":
		inst.name = node_name
	inst.position = pos
	inst.rotation.y = rot_y
	inst.scale = scale_vec
	if disable_shadows:
		_disable_shadows_recursive(inst)
	if override_mat:
		_apply_material_recursive(inst, override_mat)
	parent.add_child(inst)
	return inst

func _apply_material_recursive(node: Node, mat: Material) -> void:
	if node is MeshInstance3D:
		(node as MeshInstance3D).material_override = mat
	for child in node.get_children():
		_apply_material_recursive(child, mat)

func _disable_shadows_recursive(node: Node) -> void:
	if node is GeometryInstance3D:
		(node as GeometryInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for child in node.get_children():
		_disable_shadows_recursive(child)

# ------------------------------------------------------------------------------
# Walkable Terrain, Seamless Outer Skirt & Obstacle Colliders
# ------------------------------------------------------------------------------
func _build_walkable_ground_and_skirt(scene_def: Dictionary, profile: String, width_m: float, depth_m: float, tile: float) -> void:
	var floor_body := StaticBody3D.new()
	floor_body.name = "OutdoorGroundBody"
	_grp_terrain.add_child(floor_body)

	var mat_primary: StandardMaterial3D
	var mat_ground_splat: ShaderMaterial
	var ripple_v := 0.85 if profile == "coastal-refuge" else 0.35
	var mat_water_tile := MatKit.create_water_shader_material(Color(0.071, 0.271, 0.322, 0.76), Color(0.173, 0.443, 0.490, 0.54), Color("#d6eef2"), 0.014, 1.15, 0.0, Vector2(0.0, 0.2), 0.35, ripple_v)

	match profile:
		"forest":
			mat_primary = MatKit.make_textured_mat("moss.jpg", Color("#568c4c"), 0.90, "rock", Vector3(0.32, 0.32, 0.32), true, true)
			mat_ground_splat = MatKit.create_terrain_splat_material("moss.jpg", Color("#568c4c"), "path.jpg", Color("#877153"), 0.30, 0.90, true)
		"wreck-beach":
			mat_primary = MatKit.make_textured_mat("earth.webp", Color("#d3c6aa"), 0.86, "rock", Vector3(0.24, 0.24, 0.24), true, true)
			mat_ground_splat = MatKit.create_terrain_splat_material("earth.webp", Color("#d3c6aa"), "earth.webp", Color("#938368"), 0.24, 0.28, true)
		"cliff-observatory":
			mat_primary = MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#55616d"), 0.84, "rock", Vector3(0.26, 0.26, 0.26), true, true)
			mat_ground_splat = MatKit.create_terrain_splat_material("basalt-coastal-albedo-v1.webp", Color("#55616d"), "ashlar-v4.webp", Color("#6a7178"), 0.26, 0.82, true)
		_:
			mat_primary = MatKit.make_textured_mat("coastal-rock.png", Color("#6c746e"), 0.84, "rock", Vector3(0.28, 0.28, 0.28), true, true)
			mat_ground_splat = MatKit.create_terrain_splat_material("coastal-rock.png", Color("#6a726c"), "coastal-rock.png", Color("#868a80"), 0.26, 0.88, true)

	# Precompute secondary material grid for smooth vertex splatting across neighbor vertices
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	var sec_map: Dictionary = {}
	for t in scene_def.get("walkable", []):
		var tc := int(t["col"]); var tr := int(t["row"])
		var mid := str(t.get("materialId", ""))
		var med := str(t.get("medium", "solid"))
		if med != "water" and mid != "water" and (mid in ["earth", "stone", "gravel", "sand-wet"]):
			sec_map[Vector2i(tc, tr)] = 1.0

	var st_g := SurfaceTool.new(); st_g.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_w := SurfaceTool.new(); st_w.begin(Mesh.PRIMITIVE_TRIANGLES)
	var has_g := false; var has_w := false

	var corner_splat := func(vc: int, vr: int) -> float:
		var sum := 0.0
		for dc in [-1, 0]:
			for dr in [-1, 0]:
				sum += float(sec_map.get(Vector2i(vc + dc, vr + dr), 0.0))
		return sum * 0.25

	for t in scene_def.get("walkable", []):
		var col := int(t["col"])
		var row := int(t["row"])
		var mid := str(t.get("materialId", ""))
		var med := str(t.get("medium", "solid"))
		var x0 := float(col) * tile
		var x1 := float(col + 1) * tile
		var z0 := float(row) * tile
		var z1 := float(row + 1) * tile
		if med == "water" or mid == "water":
			if profile != "forest":
				has_w = true
				_emit_quad(st_w, Vector3(x0, -0.04, z0), Vector3(x1, -0.04, z0), Vector3(x1, -0.04, z1), Vector3(x0, -0.04, z1))
		else:
			has_g = true
			var w00: float = corner_splat.call(col, row)
			var w10: float = corner_splat.call(col + 1, row)
			var w11: float = corner_splat.call(col + 1, row + 1)
			var w01: float = corner_splat.call(col, row + 1)
			var h_lift := 0.036 if profile == "coastal-refuge" else 0.0
			var a := Vector3(x0, w00 * h_lift, z0)
			var b := Vector3(x1, w10 * h_lift, z0)
			var c := Vector3(x1, w11 * h_lift, z1)
			var d := Vector3(x0, w01 * h_lift, z1)
			st_g.set_color(Color(w00, 0, 0, 1)); st_g.set_uv(Vector2(x0 * 0.25, z0 * 0.25)); st_g.add_vertex(a)
			st_g.set_color(Color(w10, 0, 0, 1)); st_g.set_uv(Vector2(x1 * 0.25, z0 * 0.25)); st_g.add_vertex(b)
			st_g.set_color(Color(w11, 0, 0, 1)); st_g.set_uv(Vector2(x1 * 0.25, z1 * 0.25)); st_g.add_vertex(c)
			st_g.set_color(Color(w00, 0, 0, 1)); st_g.set_uv(Vector2(x0 * 0.25, z0 * 0.25)); st_g.add_vertex(a)
			st_g.set_color(Color(w11, 0, 0, 1)); st_g.set_uv(Vector2(x1 * 0.25, z1 * 0.25)); st_g.add_vertex(c)
			st_g.set_color(Color(w01, 0, 0, 1)); st_g.set_uv(Vector2(x0 * 0.25, z1 * 0.25)); st_g.add_vertex(d)

	if has_g:
		st_g.generate_normals()
		var mg := MeshInstance3D.new(); mg.name = "GroundPrimary"
		mg.mesh = st_g.commit(); mg.material_override = mat_ground_splat; _grp_terrain.add_child(mg)
	if has_w:
		st_w.generate_normals()
		var mw := MeshInstance3D.new(); mw.name = "ShallowWaterCells"
		mw.mesh = st_w.commit(); mw.material_override = mat_water_tile; _grp_terrain.add_child(mw)

	var fcs := CollisionShape3D.new()
	var fbox := BoxShape3D.new()
	fbox.size = Vector3(width_m + 6.0, 1.0, depth_m + 6.0)
	fcs.shape = fbox
	fcs.position = Vector3(width_m * 0.5, -0.5, depth_m * 0.5)
	floor_body.add_child(fcs)

	_build_sculpted_surround_skirt(profile, width_m, depth_m, mat_primary)

	var obs_body := StaticBody3D.new()
	obs_body.name = "ObstacleColliders"
	_grp_terrain.add_child(obs_body)
	for ob in scene_def.get("obstacles", []):
		var oid := str(ob.get("id", ""))
		var wp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		var scale_c := 0.82 if not oid.contains("seat") else 0.72
		bs.size = Vector3(tile * scale_c, 1.5, tile * scale_c)
		cs.shape = bs
		cs.position = wp + Vector3(0.0, bs.size.y * 0.5, 0.0)
		obs_body.add_child(cs)

func _build_sculpted_surround_skirt(profile: String, width_m: float, depth_m: float, mat_primary: Material) -> void:
	var pad_x := 28.0 if profile != "forest" else 58.0
	var pad_z_n := 24.0 if profile != "forest" else 48.0
	var pad_z_s := 14.0 if profile != "forest" else 70.0
	var x_min := -pad_x; var x_max := width_m + pad_x
	var z_min := -pad_z_n; var z_max := depth_m + pad_z_s
	var nx := 32; var nz := 28
	if profile == "forest":
		# Smooth river valley without excessive vertex cost
		nx = 72; nz = 58

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array = []
	for iz in range(nz + 1):
		var row_arr: Array[Vector3] = []
		var pz := lerpf(z_min, z_max, float(iz) / float(nz))
		for ix in range(nx + 1):
			var px := lerpf(x_min, x_max, float(ix) / float(nx))
			row_arr.append(Vector3(px, _eval_skirt_height(profile, px, pz, width_m, depth_m), pz))
		pts.append(row_arr)
	for iz in range(nz):
		for ix in range(nx):
			_emit_quad(st, pts[iz][ix], pts[iz][ix + 1], pts[iz + 1][ix + 1], pts[iz + 1][ix])
	st.generate_normals()
	var skirt := MeshInstance3D.new()
	skirt.name = "OuterTerrainSkirt"
	skirt.mesh = st.commit()
	skirt.material_override = mat_primary
	_grp_terrain.add_child(skirt)

func _eval_skirt_height(profile: String, px: float, pz: float, width_m: float, depth_m: float) -> float:
	var dx := maxf(0.0, maxf(1.5 - px, px - (width_m - 1.5)))
	var dz_n := maxf(0.0, 2.2 - pz)
	var undul := sin(px * 0.24) * cos(pz * 0.22) * 0.35 + sin((px + pz) * 0.42) * 0.18
	match profile:
		"forest":
			var h_f := -0.055
			if pz > depth_m - 1.2:
				h_f = -0.055 + undul * 0.14
			else:
				var rim := sqrt(dx * dx + dz_n * dz_n * 1.15)
				if rim >= 0.8:
					h_f = -0.055 + minf(3.6, rim * 0.17) + clampf(undul * minf(1.0, rim * 0.2), -0.3, 0.8)
			return _carve_river_valley(px, pz, h_f)
		"wreck-beach":
			if pz > depth_m * 0.72:
				var slope := clampf((pz - depth_m * 0.72) / 10.5, 0.0, 1.0)
				return lerpf(-0.04, -1.65, slope * slope) + undul * 0.12 * (1.0 - slope * 0.5)
			var rim_b := sqrt(dx * dx * 0.8 + dz_n * dz_n * 1.2)
			if rim_b < 0.8:
				return -0.05
			return -0.05 + minf(3.2, rim_b * 0.19) + undul * 0.28 * clampf(rim_b * 0.2, 0.0, 1.0)
		"cliff-observatory":
			var dx_p := maxf(0.0, maxf(2.0 - px, px - (width_m - 2.0)))
			var dz_p := maxf(0.0, maxf(2.5 - pz, pz - (depth_m - 2.5)))
			var cliff_d := sqrt(dx_p * dx_p + dz_p * dz_p)
			if cliff_d < 0.6:
				return -0.055
			var drop := smoothstep(0.5, 8.5, cliff_d) * 16.5
			var ledge := sin(cliff_d * 1.4 + sin(px * 0.3)) * 0.55
			return -0.055 - drop + ledge
		_:
			if pz > depth_m * 0.80:
				var sb := clampf((pz - depth_m * 0.80) / 9.5, 0.0, 1.0)
				return lerpf(-0.05, -1.75, sb) + undul * 0.12
			var rim_c := sqrt(dx * dx * 0.9 + dz_n * dz_n * 1.35)
			if rim_c < 0.7:
				return -0.055
			return -0.055 + minf(4.8, rim_c * 0.24) + undul * 0.36

func _emit_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
	st.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st.add_vertex(b)
	st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
	st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
	st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
	st.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st.add_vertex(d)

# ------------------------------------------------------------------------------
# Bivouac Equipment & Interaction Props (Assembled on Entry, Organic Layout)
# ------------------------------------------------------------------------------
func _build_bivouac_gear_and_points(scene_def: Dictionary, fx: CampAtmosphereFx, profile: String) -> void:
	var shelter_rock_mat := MatKit.make_textured_mat("coastal-rock.png", Color("#6a706e"), 0.88, "rock", Vector3(1.0, 1.0, 1.0), true, true)
	var fire_pos := Structure.get_map_center(scene_def)
	for pt in scene_def.get("interactionPoints", []):
		if str(pt.get("kind", "")) == "fire":
			fire_pos = Structure.tile_to_world(int(pt["objectCol"]), int(pt["objectRow"]), 0.0)
			break

	var floor_offset := 0.042 if profile == "coastal-refuge" else 0.0

	for idx in range(scene_def.get("interactionPoints", []).size()):
		var pt: Dictionary = scene_def["interactionPoints"][idx]
		var pid := str(pt.get("id", ""))
		var kind := str(pt.get("kind", ""))
		var owner := str(pt.get("ownerCharacterId", "mia"))
		var obj_pos := Structure.tile_to_world(int(pt["objectCol"]), int(pt["objectRow"]), 0.0)
		var to_fire := atan2(fire_pos.x - obj_pos.x, fire_pos.z - obj_pos.z)

		match kind:
			"tent":
				# Only present in forest, wreck-beach, cliff-observatory (NEVER coastal-refuge!)
				if profile != "coastal-refuge":
					var sh_yaw := 0.14 if profile == "forest" else (-0.24 if profile == "wreck-beach" else 0.18)
					var anc_a := Vector3(-2.85, 0.0, -1.65)
					var anc_b := Vector3(2.85, 0.0, -1.65)
					var res := PropFactory.create_canvas_shelter(_grp_structures, profile, obj_pos, sh_yaw, _env_kit, shelter_rock_mat, anc_a, anc_b)
					cutaway_tents.append({
						"id": pid,
						"node": res["roof"],
						"rect": res["rect"],
					})
					shelter_anchors[pid] = {
						"center": obj_pos,
						"capacity": int(res.get("capacity", 2)),
					}
			"bed":
				var bed_y := floor_offset if profile == "coastal-refuge" else 0.0
				var yaw_jitter := -0.18 if owner == "mia" else (0.22 if owner == "mike" else -0.45)
				var bed_pos := Vector3(obj_pos.x, bed_y, obj_pos.z)
				var bed_yaw := to_fire + PI + yaw_jitter
				var b_entry := PropFactory.create_bedroll(_grp_props, pid, owner, bed_pos, bed_yaw)
				var r_local: Vector3 = b_entry.get("rest_local", Vector3(0.0, 0.06, -0.14))
				b_entry["world_rest_pos"] = bed_pos + r_local.rotated(Vector3.UP, bed_yaw)
				b_entry["world_rest_forward"] = Vector3.BACK.rotated(Vector3.UP, bed_yaw)
				b_entry["stand_pos"] = Structure.tile_to_world(int(pt["col"]), int(pt["row"]), 0.05)
				b_entry["fire_pos"] = fire_pos
				bedrolls[pid] = b_entry
			"chest":
				var pack_y := floor_offset if profile == "coastal-refuge" else 0.0
				var p_entry := PropFactory.create_backpack(_grp_interactables, pid, owner, Vector3(obj_pos.x, pack_y, obj_pos.z), to_fire + 0.35)
				chest_lids[pid] = {"pivot": p_entry["pivot"], "open": false}
			"personal":
				var kit_y := floor_offset if profile == "coastal-refuge" else 0.0
				PropFactory.create_personal_kit(_grp_props, owner, Vector3(obj_pos.x, kit_y, obj_pos.z), to_fire + 0.25)
			"fire":
				PropFactory.create_campfire_hearth_kit(_grp_props, fx, obj_pos, profile, _env_kit)
			"seat":
				var seat_y := floor_offset if (profile == "coastal-refuge" and int(pt["objectRow"]) <= 9) else 0.0
				var seat_pos := Vector3(obj_pos.x, seat_y, obj_pos.z)
				var seat_yaw := to_fire + PI * 0.5
				var variant := "forest-stone" if pid == "forest-seat-b-point" else profile
				var seat_res := PropFactory.create_natural_seat(_grp_props, variant, seat_pos, seat_yaw, _env_kit, float(idx) * 1.7)
				var stand_pos := Structure.tile_to_world(int(pt["col"]), int(pt["row"]), 0.05)
				seat_anchors[pid] = PropFactory.seat_anchor(seat_res.root, seat_res.slots_local,
					seat_res.front_radius, stand_pos, true, fire_pos - seat_pos, seat_res.support_meshes)
				seat_anchors[pid]["type"] = seat_res.type
			"guard":
				# Natural lookout point: add max 1 portable lantern on a flat rock ONLY on forest trail & cave entrance
				if pid in ["forest-guard-point", "cove-guard-point"]:
					_env_kit.spawn_rock(_grp_props, obj_pos + Vector3(0.45, 0.06, -0.25), Vector3(0.44, 0.22, 0.38), 0.6, shelter_rock_mat, 1, "flat")
					PropFactory.create_portable_lantern(_grp_interactables, fx, obj_pos + Vector3(0.45, 0.14, -0.25))

# ------------------------------------------------------------------------------
# Camp 02: Bosque camino a Pleamar
# ------------------------------------------------------------------------------
func _build_forest_details(scene_def: Dictionary, _fx: CampAtmosphereFx, width_m: float, depth_m: float) -> void:
	var mat_trunk := MatKit.make_wood_mat(Color("#543d2b"), true)
	var mat_plank := MatKit.make_wood_mat(Color("#73573d"), true)
	var mat_bark_moss := MatKit.make_textured_mat("moss.jpg", Color("#4e6d42"), 0.90, "rock", Vector3(1.2, 1.2, 1.2), true, true)
	var mat_pine_a := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#3f6a3b"), 0.044, Color("#6fa056"), false, 2.2, true)
	var mat_pine_b := MatKit.create_foliage_wind_shader_material("foliage-atlas.png", Color("#4a7742"), 0.048, Color("#78aa5e"), false, 2.0, true)
	var mat_oak := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#598045"), 0.052, Color("#8db868"), false, 1.8, true)
	var mat_fern := _env_kit.make_alpha_foliage_mat("forest_fern", Color("#517843"))
	var mat_moss_rock := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#6c7569"), 0.88, "rock", Vector3(0.45, 0.45, 0.45), true, true)
	var mat_bed := MatKit.make_textured_mat("stream.jpg", Color("#6e7e7a"), 0.86, "rock", Vector3(0.42, 0.42, 0.42), true, true)

	# Long meandering forest river (17/11/2026): runs from the northern hills, through the
	# canonical water cells of the clearing and away south. Flow-mapped animated shader.
	if _river_pts.size() >= 2:
		_build_forest_river_ribbon(mat_bed, mat_moss_rock, mat_fern, mat_plank)

	# Tactile perimeter trees from obstacles (trees (8,7) and (12,7) anchor canopy tarp cleanly)
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")).contains("tree"):
			var tp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			if tp.z > depth_m * 0.72 and tp.x > 6.5 and tp.x < width_m - 6.5:
				_env_kit.spawn_fern_clump(_grp_vegetation, tp, 1.05, mat_fern, tp.x, 3)
				_env_kit.spawn_rock(_grp_env_geo, tp + Vector3(0.25, 0.10, -0.2), Vector3(0.82, 0.48, 0.78), tp.z, mat_moss_rock, int(ob["col"]), "craggy")
			else:
				var is_oak := int(ob["col"]) % 3 == 0
				var sp := "oak" if is_oak else "pine"
				_env_kit.build_organic_tree(_grp_vegetation, sp, tp, 0.96, mat_trunk, mat_oak if is_oak else mat_pine_a, mat_bark_moss, tp.x * 0.7 + tp.z)
				_tree_spots.append(Vector2(tp.x, tp.z))
				if int(ob["row"]) <= 12:
					_env_kit.spawn_fern_clump(_grp_vegetation, tp + Vector3(0.65, 0.0, 0.55), 0.85, mat_fern, tp.x, 2)

	# Natural clustered outer forest canopy (preserving open south corridor sightline!)
	for i in range(28):
		var a := float(i) * TAU / 28.0 + sin(float(i) * 1.9) * 0.14
		var rx := width_m * 0.62 + sin(a * 3.0) * 3.4
		var rz := depth_m * 0.60 + cos(a * 2.0) * 3.1
		var wp := Vector3(width_m * 0.5 + cos(a) * rx, 0.0, depth_m * 0.5 + sin(a) * rz)
		if wp.z > depth_m * 0.68 and absf(wp.x - width_m * 0.5) < 11.5:
			_env_kit.spawn_fern_clump(_grp_vegetation, wp, 1.15, mat_fern, a, 2)
			if i % 3 == 0:
				_env_kit.spawn_rock(_grp_env_geo, wp + Vector3(0.6, 0.10, 0.2), Vector3(0.92, 0.48, 0.85), a * 2.0, mat_moss_rock, i, "craggy")
			continue
		if _river_distance(Vector2(wp.x, wp.z)) < _river_half_width(wp.z) + 1.8:
			continue
		wp.y = maxf(0.0, _eval_skirt_height("forest", wp.x, wp.z, width_m, depth_m) + 0.04)
		_tree_spots.append(Vector2(wp.x, wp.z))
		var is_broad := i % 3 == 0
		var tscale := 0.95 + fmod(float(i) * 0.19, 0.48)
		_env_kit.build_organic_tree(_grp_vegetation, "oak" if is_broad else "pine", wp, tscale, mat_trunk, mat_oak if is_broad else (mat_pine_a if i % 2 == 0 else mat_pine_b), mat_bark_moss, float(i) * 1.37)

	# Localized undergrowth clusters near roots & mossy clearing edges (non-uniform!)
	var bush_clusters := [
		Vector2(9.2, 13.5), Vector2(10.5, 22.8), Vector2(23.8, 12.6), Vector2(26.5, 19.5),
		Vector2(25.2, 8.8), Vector2(13.8, 7.6), Vector2(19.6, 5.4), Vector2(7.8, 18.2),
	]
	for c_i in range(bush_clusters.size()):
		var cp: Vector2 = bush_clusters[c_i]
		_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(cp.x, 0.0, cp.y), 0.92 + float(c_i % 3) * 0.16, mat_fern, float(c_i) * 1.9, 3)

	# Natural decaying stump + woodland fungi + wildflower clusters along clearing borders
	var stump := MeshInstance3D.new()
	var sm_st := CylinderMesh.new(); sm_st.top_radius = 0.30; sm_st.bottom_radius = 0.42; sm_st.height = 0.52; sm_st.radial_segments = 8
	stump.mesh = sm_st; stump.material_override = mat_trunk
	stump.position = Vector3(24.6, 0.24, 15.8)
	_grp_env_geo.add_child(stump)
	_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(24.36, 0.28, 15.82), 1.1)
	_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(24.82, 0.21, 15.96), 2.7)
	_env_kit.spawn_mushroom_cluster(_grp_vegetation, Vector3(24.2, 0.0, 16.2), 1.4, 5)
	_env_kit.spawn_mushroom_cluster(_grp_vegetation, Vector3(11.6, 0.0, 12.3), 2.8, 4)
	var wf_spots: Array[Vector2] = [Vector2(8.6, 13.8), Vector2(10.2, 22.0), Vector2(23.5, 13.2), Vector2(6.8, 10.2), Vector2(21.5, 22.8), Vector2(14.5, 8.2)]
	for wf_i in range(wf_spots.size()):
		var wpos: Vector2 = wf_spots[wf_i]
		_env_kit.spawn_wildflower_patch(_grp_vegetation, Vector3(wpos.x, 0.0, wpos.y), float(wf_i) * 1.4, 7)

	# Much richer woodland: more tree species, bushes, ferns, flowers and mushrooms (batched)
	_build_forest_flora_expansion(scene_def, width_m, depth_m, mat_trunk, mat_pine_a, mat_pine_b, mat_oak)

	# Moss cushions & flowering berry shrubs framing the clearing perimeter
	for mb_i in range(4):
		var mp: Vector2 = [Vector2(8.8, 13.0), Vector2(24.8, 15.2), Vector2(10.8, 22.4), Vector2(23.8, 12.1)][mb_i]
		_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(mp.x, 0.0, mp.y), Color("#466e3c"), 1.05, float(mb_i) * 1.4)
		_env_kit.spawn_woodland_shrub(_grp_vegetation, Vector3(mp.x + 0.55, 0.0, mp.y - 0.35), mat_oak, Color("#c93838") if mb_i % 2 == 0 else Color("#4b589e"), float(mb_i) * 2.1)

	# Natural realistic woodland fauna: crepuscular/diurnal schedules, deep-cover emergence,
	# grazing/sniffing stops and occasional passing creek trout!
	var rx_n := _river_center_x(10.0)
	var rx_m := _river_center_x(17.5)
	var rx_s := _river_center_x(24.0)
	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-deer-908.glb", "ForestDeer", 0.44, [
		Vector3(-9.0, 0.12, 7.5), Vector3(rx_m - 2.9, 0.06, 15.0),
		Vector3(rx_m - 2.6, 0.06, 17.5), Vector3(rx_s - 3.2, 0.06, 22.0),
		Vector3(-9.5, 0.14, 26.5),
	], 28.0, 0.0)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["storm"], 68.0, 0.44, 10.0, true, 4.6)

	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-stag-1373.glb", "ForestStag", 0.42, [
		Vector3(width_m + 9.0, 0.12, 8.0), Vector3(29.8, 0.05, 13.0),
		Vector3(28.0, 0.05, 15.2), Vector3(28.8, 0.05, 21.0),
		Vector3(width_m + 9.5, 0.14, 24.5),
	], 30.0, 0.0)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "night"], ["storm"], 74.0, 0.46, 22.0, true, 5.0)

	FaunaKit.spawn_fox(_grp_vegetation, fauna_agents, "ForestFox", [
		Vector3(8.5, 0.0, -3.5), Vector3(13.5, 0.0, 7.8),
		Vector3(17.6, 0.0, 7.5), Vector3(22.0, 0.0, 8.8),
		Vector3(26.5, 0.0, -2.5),
	], 24.0, 0.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 54.0, 0.46, 6.0, true, 4.4)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_0", [
		Vector3(6.6, 0.0, 14.8), Vector3(9.0, 0.0, 14.0),
		Vector3(9.6, 0.0, 14.2), Vector3(10.8, 0.0, 13.0),
		Vector3(6.2, 0.0, 15.6),
	], 18.0, 0.6, Color("#7a5c44"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 44.0, 0.46, 4.0, true, 3.8)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_1", [
		Vector3(26.8, 0.0, 12.2), Vector3(24.6, 0.0, 13.2),
		Vector3(23.8, 0.0, 13.8), Vector3(25.0, 0.0, 15.2),
		Vector3(27.2, 0.0, 13.0),
	], 20.0, 1.1, Color("#614b3a"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk"], ["rain", "storm", "snow"], 48.0, 0.46, 14.0, true, 3.8)

	if _river_pts.size() >= 2:
		var rx_far_n := _river_center_x(-16.0)
		var rx_far_s := _river_center_x(depth_m + 14.0)
		var rx_b := _river_center_x(17.0)
		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_0", [
			Vector3(rx_far_n, 0.022, -16.0), Vector3(rx_n + 0.15, 0.022, 10.5),
			Vector3(rx_m - 0.15, 0.022, 19.5), Vector3(rx_far_s, 0.022, depth_m + 14.0),
		], 20.0, 0.4, Color("#668b72"), "swim_fish", 1.38)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 56.0, 0.36, 18.0, false, 0.0)

		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_1", [
			Vector3(rx_far_s, 0.022, depth_m + 14.0), Vector3(rx_s + 0.15, 0.022, 24.0),
			Vector3(rx_n - 0.12, 0.022, 10.0), Vector3(rx_far_n, 0.022, -16.0),
		], 22.0, 1.8, Color("#567966"), "swim_fish", 1.32)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 62.0, 0.34, 42.0, false, 0.0)

		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_2", [
			Vector3(rx_far_n, 0.024, -14.0), Vector3(rx_b - 0.15, 0.024, 15.0),
			Vector3(rx_b + 0.18, 0.024, 21.0), Vector3(rx_far_s, 0.024, depth_m + 12.0),
		], 18.0, 0.18, Color("#72997d"), "swim_ocean_jump", 1.42)
		FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm"], 64.0, 0.34, 30.0, false, 0.0)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedRobin", Vector3(24.6, 0.52, 15.8), -2.2, Color("#6e5344"), Color("#c96b38"), 0.88, 0.9)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 42.0, 0.44, 2.0, false, 3.6)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedJay", Vector3(rx_n + 1.4, 0.34, 11.2), 1.4, Color("#4f74a8"), Color("#2c384e"), 0.92, 2.7)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 48.0, 0.42, 24.0, false, 3.6)

	FaunaKit.spawn_butterflies(_grp_vegetation, fauna_agents, "ForestButterflyA", Vector3(10.2, 0.0, 21.8), 3, 1.1)
	FaunaKit.spawn_butterflies(_grp_vegetation, fauna_agents, "ForestButterflyB", Vector3(23.4, 0.0, 13.0), 3, 3.4)
	sync_wildlife()

# ------------------------------------------------------------------------------
# Forest river: centreline, valley carving and animated ribbon (17/11/2026)
# ------------------------------------------------------------------------------
func _prepare_forest_river(depth_m: float) -> void:
	_river_pts.clear()
	_river_depth_m = depth_m
	var raw: Array = Structure.get_forest_stream().get("samples", [])
	if raw.size() < 2:
		return
	var x0 := float(raw[0]["x"]); var z0 := float(raw[0]["z"])
	# Upstream: descends from the northern hills, meandering west then back (to skirt edge)
	var z := -47.5
	while z < z0 - 0.01:
		var dz := z0 - z
		var ramp := clampf(dz / 14.0, 0.0, 1.0)
		_river_pts.append(Vector2(x0 - sin(dz * 0.075) * 4.2 * ramp - dz * 0.035 * ramp, z))
		z += 1.5
	# Canonical in-map course (exact water cells preserved)
	for s_i in range(raw.size() - 1):
		var pa: Dictionary = raw[s_i]; var pb: Dictionary = raw[s_i + 1]
		for sub in range(3):
			var tf := float(sub) / 3.0
			_river_pts.append(Vector2(lerpf(float(pa["x"]), float(pb["x"]), tf), lerpf(float(pa["z"]), float(pb["z"]), tf)))
	var last: Dictionary = raw[raw.size() - 1]
	var xl := float(last["x"]); var zl := float(last["z"])
	_river_pts.append(Vector2(xl, zl))
	# Downstream: widening meander away south towards Pleamar
	z = zl + 1.5
	while z <= depth_m + 69.0:
		var ds := z - zl
		var ramp2 := clampf(ds / 12.0, 0.0, 1.0)
		_river_pts.append(Vector2(xl + sin(ds * 0.065) * 5.0 * ramp2 + ds * 0.06 * ramp2, z))
		z += 1.5
	# Smooth only the off-map parts
	for _pass in range(3):
		for i in range(1, _river_pts.size() - 1):
			var pz := _river_pts[i].y
			if pz < -0.5 or pz > depth_m + 0.5:
				var sv := _river_pts[i]
				sv.x = (_river_pts[i - 1].x + _river_pts[i].x * 2.0 + _river_pts[i + 1].x) * 0.25
				_river_pts[i] = sv

func _river_center_x(z: float) -> float:
	var n := _river_pts.size()
	if n == 0:
		return -99999.0
	if z <= _river_pts[0].y:
		return _river_pts[0].x
	if z >= _river_pts[n - 1].y:
		return _river_pts[n - 1].x
	var lo := 0
	var hi := n - 1
	while hi - lo > 1:
		var mid := (lo + hi) >> 1
		if _river_pts[mid].y <= z:
			lo = mid
		else:
			hi = mid
	var a := _river_pts[lo]; var b := _river_pts[hi]
	return lerpf(a.x, b.x, (z - a.y) / maxf(0.0001, b.y - a.y))

func _river_half_width(z: float) -> float:
	var hw := 2.05 + sin(z * 0.37) * 0.2
	hw += clampf((z - _river_depth_m) / 60.0, 0.0, 1.0) * 0.55
	hw -= clampf(-z / 40.0, 0.0, 1.0) * 0.55
	return hw

func _river_distance(p: Vector2) -> float:
	if _river_pts.is_empty():
		return 99999.0
	return absf(p.x - _river_center_x(p.y))

func _carve_river_valley(px: float, pz: float, h: float) -> float:
	if _river_pts.is_empty():
		return h
	var floor_h := -0.03
	if h <= floor_h:
		return h
	var d := _river_distance(Vector2(px, pz))
	var hw := _river_half_width(pz)
	var t := smoothstep(hw + 0.5, hw + 6.5, d)
	return lerpf(floor_h, h, t)

func _build_forest_river_ribbon(mat_bed: Material, mat_moss_rock: Material, mat_fern: Material, mat_plank: Material) -> void:
	var n := _river_pts.size()
	var across := 4
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_bed := SurfaceTool.new(); st_bed.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rows: Array = []
	var bed_rows: Array = []
	var dists: Array[float] = []
	var dist := 0.0
	for i in range(n):
		if i > 0:
			dist += _river_pts[i].distance_to(_river_pts[i - 1])
		dists.append(dist)
		var tan := (_river_pts[mini(n - 1, i + 1)] - _river_pts[maxi(0, i - 1)]).normalized()
		var nrm := Vector2(tan.y, -tan.x)
		if nrm.x < 0.0:
			nrm = -nrm
		var hw := _river_half_width(_river_pts[i].y)
		var row: Array[Vector3] = []
		for k in range(across + 1):
			var off := (float(k) / float(across) * 2.0 - 1.0) * hw
			var p2 := _river_pts[i] + nrm * off
			row.append(Vector3(p2.x, 0.045, p2.y))
		rows.append(row)
		var bl := _river_pts[i] - nrm * (hw + 0.55)
		var br := _river_pts[i] + nrm * (hw + 0.55)
		bed_rows.append([Vector3(bl.x, 0.012, bl.y), Vector3(br.x, 0.012, br.y)])
	river_length_m = dist

	for i in range(n - 1):
		var r0: Array = rows[i]; var r1: Array = rows[i + 1]
		var v0 := dists[i] * 0.5; var v1 := dists[i + 1] * 0.5
		for k in range(across):
			var u0 := float(k) / float(across); var u1 := float(k + 1) / float(across)
			var quad := [[r0[k], Vector2(u0, v0)], [r0[k + 1], Vector2(u1, v0)], [r1[k + 1], Vector2(u1, v1)], [r1[k], Vector2(u0, v1)]]
			for idx in [0, 1, 2, 0, 2, 3]:
				st.set_normal(Vector3.UP)
				st.set_uv(quad[idx][1])
				st.add_vertex(quad[idx][0])
		var b0: Array = bed_rows[i]; var b1: Array = bed_rows[i + 1]
		_emit_quad(st_bed, b0[0], b0[1], b1[1], b1[0])

	st_bed.generate_normals()
	var sbed := MeshInstance3D.new(); sbed.name = "ForestStreamBed"
	sbed.mesh = st_bed.commit(); sbed.material_override = mat_bed
	sbed.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_grp_terrain.add_child(sbed)

	st.generate_tangents()
	var smesh := MeshInstance3D.new(); smesh.name = "ForestOrganicStream"
	smesh.mesh = st.commit()
	var smat := MatKit.create_river_shader_material(Color(0.059, 0.247, 0.298, 0.72), Color(0.169, 0.486, 0.502, 0.44), Color("#e2f5f6"), 0.95, 0.014, true)
	smat.set_meta("river_flow", true)
	_river_mats.append(smat)
	_stream_shader_mats.append(smat)
	smesh.material_override = smat
	smesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	smesh.set_meta("river_length_m", river_length_m)
	_grp_terrain.add_child(smesh)

	# Banks: mossy stones, reeds and ferns aligned along perpendicular normal (never inside water or bridge)
	var bz := 17.0
	var next_rock := 0.0; var next_reed := 1.4; var next_fern := 2.8
	var side := 1.0
	for i in range(n):
		var d_i := dists[i]
		var p := _river_pts[i]
		if absf(p.y - bz) < 2.25:
			continue
		var tan_i := (_river_pts[mini(n - 1, i + 1)] - _river_pts[maxi(0, i - 1)]).normalized()
		var nrm_i := Vector2(tan_i.y, -tan_i.x)
		if nrm_i.x < 0.0:
			nrm_i = -nrm_i
		var hw2 := _river_half_width(p.y)
		if d_i >= next_rock:
			next_rock = d_i + 2.6 + fmod(float(i) * 0.37, 1.4)
			side = -side
			var rp2 := p + nrm_i * (side * (hw2 + 0.18))
			_env_kit.spawn_rock(_grp_env_geo, Vector3(rp2.x, 0.05, rp2.y), Vector3(0.72, 0.30, 0.66), float(i) * 0.9, mat_moss_rock, i, "rounded")
		if d_i >= next_reed:
			next_reed = d_i + 3.2 + fmod(float(i) * 0.53, 1.6)
			var s2 := -side
			var rdp := p + nrm_i * (s2 * (hw2 + 0.38))
			var bank_y := maxf(0.0, _carve_river_valley(rdp.x, rdp.y, 0.0))
			_env_kit.spawn_reed_cluster(_grp_vegetation, Vector3(rdp.x, bank_y, rdp.y), mat_fern, float(i) * 1.3, i % 3 == 0)
		if d_i >= next_fern and (p.y < 0.0 or p.y > _river_depth_m):
			next_fern = d_i + 4.4
			var fp2 := p + nrm_i * (side * (hw2 + 0.85))
			var fy := maxf(0.0, _carve_river_valley(fp2.x, fp2.y, 0.0))
			_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(fp2.x, fy, fp2.y), 0.95, mat_fern, float(i), 3)

	# Handcrafted wooden plank footbridge spanning cleanly bank-to-bank
	var bx := _river_center_x(bz)
	var span_w := _river_half_width(bz) * 2.0 + 1.05
	_build_wooden_footbridge(Vector3(bx, 0.12, bz), span_w, mat_plank)

func _build_wooden_footbridge(pos: Vector3, span_w: float, mat_plank: Material) -> void:
	var bridge := Node3D.new()
	bridge.name = "StreamFootbridge"
	bridge.position = pos
	_grp_structures.add_child(bridge)
	var mat_post := MatKit.make_wood_mat(Color("#543d2b"), true)
	var st_deck := SurfaceTool.new(); st_deck.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_beam := SurfaceTool.new(); st_beam.begin(Mesh.PRIMITIVE_TRIANGLES)

	# Two longitudinal side stringers under the planks
	for sz in [-0.54, 0.54]:
		var bm := BoxMesh.new(); bm.size = Vector3(span_w, 0.14, 0.16)
		st_beam.append_from(bm, 0, Transform3D(Basis.IDENTITY, Vector3(0.0, -0.02, sz)))
	# Four low corner mooring posts anchored into the banks
	for px in [-span_w * 0.44, span_w * 0.44]:
		for pz in [-0.68, 0.68]:
			var pm := CylinderMesh.new(); pm.top_radius = 0.075; pm.bottom_radius = 0.095; pm.height = 0.62; pm.radial_segments = 7
			st_beam.append_from(pm, 0, Transform3D(Basis.IDENTITY, Vector3(px, 0.10, pz)))
	st_beam.generate_normals()
	var beams := MeshInstance3D.new(); beams.mesh = st_beam.commit(); beams.material_override = mat_post
	bridge.add_child(beams)

	# 10 weathered cross planks with narrow gaps so the river glints beneath
	var plank_count := 10
	var step_x := (span_w - 0.30) / float(plank_count)
	for i in range(plank_count):
		var px := -span_w * 0.5 + 0.15 + (float(i) + 0.5) * step_x
		var arch_y := sin(float(i + 1) / float(plank_count + 1) * PI) * 0.09
		var pm2 := BoxMesh.new(); pm2.size = Vector3(step_x * 0.84, 0.065, 1.48)
		var rot := Basis.from_euler(Vector3(0.0, sin(float(i) * 1.9) * 0.025, 0.0))
		st_deck.append_from(pm2, 0, Transform3D(rot, Vector3(px, 0.08 + arch_y, 0.0)))
	st_deck.generate_normals()
	var deck := MeshInstance3D.new(); deck.mesh = st_deck.commit(); deck.material_override = mat_plank
	bridge.add_child(deck)

# ------------------------------------------------------------------------------
# Forest flora expansion: species, bushes, flowers and mushrooms (batched)
# ------------------------------------------------------------------------------
func _build_forest_flora_expansion(scene_def: Dictionary, width_m: float, depth_m: float, mat_trunk: Material, mat_pine_a: Material, mat_pine_b: Material, mat_oak: Material) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 170112026
	var tile := Structure.TILE_METERS
	var cols := int(scene_def.get("cols", 24))
	var rows := int(scene_def.get("rows", 22))

	var walk: Dictionary = {}
	for t in scene_def.get("walkable", []):
		walk[Vector2i(int(t["col"]), int(t["row"]))] = str(t.get("materialId", "grass")) if str(t.get("medium", "solid")) != "water" else "water"
	var blocked: Array[Vector2] = []
	for pt in scene_def.get("interactionPoints", []):
		var op := Structure.tile_to_world(int(pt["objectCol"]), int(pt["objectRow"]), 0.0)
		blocked.append(Vector2(op.x, op.z))
		var sp := Structure.tile_to_world(int(pt["col"]), int(pt["row"]), 0.0)
		blocked.append(Vector2(sp.x, sp.z))
	for ob in scene_def.get("obstacles", []):
		var obp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
		blocked.append(Vector2(obp.x, obp.z))
	for sp_cell in scene_def.get("spawns", []):
		var spp := Structure.tile_to_world(int(sp_cell["col"]), int(sp_cell["row"]), 0.0)
		blocked.append(Vector2(spp.x, spp.z))

	var cell_kind := func(p: Vector2) -> String:
		if p.x < 0.0 or p.y < 0.0 or p.x >= float(cols) * tile or p.y >= float(rows) * tile:
			return "outside"
		var c := Vector2i(int(floor(p.x / tile)), int(floor(p.y / tile)))
		return str(walk.get(c, "void"))
	var near_blocked := func(p: Vector2, r: float) -> bool:
		for b in blocked:
			if b.distance_to(p) < r:
				return true
		return false
	var rect_dist := func(p: Vector2) -> float:
		var dx := maxf(0.0, maxf(-p.x, p.x - width_m))
		var dz := maxf(0.0, maxf(-p.y, p.y - depth_m))
		return sqrt(dx * dx + dz * dz)
	var in_south_band := func(p: Vector2) -> bool:
		return p.y > depth_m - 2.0 and p.y < depth_m + 24.0 and p.x > -12.0 and p.x < width_m + 12.0

	# --- Materials (one batch = one draw call) ---
	var q_tl := Rect2(0.01, 0.01, 0.48, 0.48)
	var q_tr := Rect2(0.51, 0.01, 0.48, 0.48)
	var q_br := Rect2(0.51, 0.51, 0.48, 0.48)
	var ivy_uv := Rect2(0.02, 0.51, 0.46, 0.47)
	_env_kit.define_batch("trunk_dark", mat_trunk, true)
	_env_kit.define_batch("trunk_birch", MatKit.make_wood_mat(Color("#ddd6c6"), true), true)
	_env_kit.define_batch("trunk_dead", MatKit.make_wood_mat(Color("#6b6155"), true), true)
	_env_kit.define_batch("canopy_pine_a", mat_pine_a, true)
	_env_kit.define_batch("canopy_pine_b", mat_pine_b, true)
	_env_kit.define_batch("canopy_oak", mat_oak, true)
	_env_kit.define_batch("canopy_spruce", MatKit.create_foliage_wind_shader_material("foliage-atlas.png", Color("#2e5034"), 0.03, Color("#55804e"), false, 2.4, true), true)
	_env_kit.define_batch("canopy_birch", MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#93b35e"), 0.07, Color("#c2dc7a"), false, 2.0, true), true)
	_env_kit.define_batch("canopy_beech", MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#6a8f42"), 0.05, Color("#9cc066"), false, 1.7, true), true)
	_env_kit.define_batch("canopy_copper", MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#9a6a3c"), 0.05, Color("#c79458"), false, 1.7, true), true)
	_env_kit.define_batch("canopy_willow", MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#7f9a4c"), 0.06, Color("#b0cc70"), false, 1.9, true), true)
	var willow_cards := MatKit.create_foliage_wind_shader_material("foliage-atlas.png", Color("#a6bf7a"), 0.09, Color("#c4dc8a"), true, 1.0, true, ivy_uv)
	willow_cards.set_shader_parameter("hang", 1.0)
	_env_kit.define_batch("cards_willow", willow_cards, true)

	var bush_defs := {
		"laurel": {"tex": "foliage-atlas-v5.png", "uv": q_tl, "tint": Color(0.86, 0.95, 0.84), "min": 0.9, "max": 1.4, "low": false},
		"holly": {"tex": "foliage-atlas.png", "uv": q_tl, "tint": Color(0.82, 0.90, 0.82), "min": 0.85, "max": 1.3, "low": false},
		"fern_yarrow": {"tex": "foliage-atlas-v5.png", "uv": q_tr, "tint": Color(0.86, 0.94, 0.82), "min": 0.7, "max": 1.05, "low": true},
		"fern_tall": {"tex": "foliage-atlas.png", "uv": q_tr, "tint": Color(0.84, 0.93, 0.84), "min": 0.75, "max": 1.15, "low": false},
		"heather": {"tex": "foliage-atlas-v5.png", "uv": q_br, "tint": Color(0.92, 0.95, 0.92), "min": 0.5, "max": 0.8, "low": true},
		"meadow": {"tex": "foliage-atlas.png", "uv": q_br, "tint": Color(0.92, 0.96, 0.90), "min": 0.45, "max": 0.75, "low": true},
	}
	for bk in bush_defs.keys():
		var bd: Dictionary = bush_defs[bk]
		var bm := MatKit.create_foliage_wind_shader_material(str(bd["tex"]), bd["tint"], 0.05, Color("#9fc46a"), true, 1.0, true, bd["uv"])
		_env_kit.define_batch("bush_" + str(bk), bm, bk in ["laurel", "holly", "fern_tall"])

	var mk := {"stem": "mush_stem", "dots": "mush_dots", "cap_amanita": "mush_cap_amanita", "cap_porcini": "mush_cap_porcini",
		"cap_chanterelle": "mush_cap_chanterelle", "cap_parasol": "mush_cap_parasol", "cap_brown": "mush_cap_brown"}
	_env_kit.define_batch("mush_stem", MatKit.make_cloth_mat(Color("#d9ceb4"), false, true), false)
	_env_kit.define_batch("mush_dots", MatKit.make_cloth_mat(Color("#f1ead8"), false, true), false)
	_env_kit.define_batch("mush_cap_amanita", MatKit.make_textured_mat("earth.webp", Color("#c2341f"), 0.45, "", Vector3.ONE, false, true), false)
	_env_kit.define_batch("mush_cap_porcini", MatKit.make_textured_mat("earth.webp", Color("#8a542c"), 0.6, "", Vector3.ONE, false, true), false)
	_env_kit.define_batch("mush_cap_chanterelle", MatKit.make_textured_mat("earth.webp", Color("#e0a033"), 0.6, "", Vector3.ONE, false, true), false)
	_env_kit.define_batch("mush_cap_parasol", MatKit.make_textured_mat("earth.webp", Color("#cdb592"), 0.7, "", Vector3.ONE, false, true), false)
	_env_kit.define_batch("mush_cap_brown", MatKit.make_textured_mat("earth.webp", Color("#8a5838"), 0.7, "", Vector3.ONE, false, true), false)

	var tree_counts: Dictionary = {}
	var bush_counts: Dictionary = {}
	var mush_clusters := 0
	var logs := 0
	var new_spots: Array[Dictionary] = []

	# --- Trees: jittered grid around the clearing, avoiding river, map and south view band ---
	var gx := -36.0
	while gx <= width_m + 36.0:
		var gz := -44.0
		while gz <= depth_m + 40.0:
			var p := Vector2(gx + rng.randf_range(-1.8, 1.8), gz + rng.randf_range(-1.8, 1.8))
			gz += 5.0
			var rd: float = rect_dist.call(p)
			if rd < 1.4 or bool(in_south_band.call(p)):
				continue
			var hw := _river_half_width(p.y)
			var rv := _river_distance(p)
			if rv < hw + 1.7:
				continue
			if rng.randf() > (0.8 if rd < 14.0 else 0.36):
				continue
			var too_close := false
			for ts in _tree_spots:
				if ts.distance_to(p) < 2.8:
					too_close = true
					break
			if too_close:
				continue
			var roll := rng.randf()
			var species := "spruce"
			if rv < hw + 6.5:
				species = "willow" if roll < 0.5 else ("birch" if roll < 0.82 else "sapling")
			elif p.y < -14.0:
				species = "spruce" if roll < 0.5 else ("pine" if roll < 0.7 else ("birch" if roll < 0.85 else ("beech" if roll < 0.95 else "snag")))
			else:
				if roll < 0.2: species = "spruce"
				elif roll < 0.35: species = "pine"
				elif roll < 0.47: species = "oak"
				elif roll < 0.65: species = "birch"
				elif roll < 0.85: species = "beech"
				elif roll < 0.9: species = "beech_copper"
				elif roll < 0.94: species = "snag"
				else: species = "sapling"
			var sc := rng.randf_range(0.85, 1.25)
			if species == "sapling":
				sc = rng.randf_range(0.42, 0.6)
			var y := _eval_skirt_height("forest", p.x, p.y, width_m, depth_m) - 0.05
			var keys := {"trunk": "trunk_dark"}
			match species:
				"pine": keys["canopy"] = "canopy_pine_a" if rng.randf() < 0.5 else "canopy_pine_b"
				"oak": keys["canopy"] = "canopy_oak"
				"spruce": keys["canopy"] = "canopy_spruce"
				"birch", "sapling":
					keys["trunk"] = "trunk_birch"; keys["canopy"] = "canopy_birch"
				"beech": keys["canopy"] = "canopy_beech"
				"beech_copper": keys["canopy"] = "canopy_copper"
				"willow":
					keys["canopy"] = "canopy_willow"; keys["cards"] = "cards_willow"
				"snag": keys["trunk"] = "trunk_dead"
			_env_kit.append_tree(species, Vector3(p.x, y, p.y), sc, rng.randf() * TAU, rng.randf() * 10.0, keys)
			_tree_spots.append(p)
			new_spots.append({"p": p, "y": y, "species": species})
			tree_counts[species] = int(tree_counts.get(species, 0)) + 1
		gx += 5.0

	# --- Bushes / ferns / flowers outside the grid and on non-walkable interior cells ---
	var bush_keys := bush_defs.keys()
	var bush_w := [0.2, 0.18, 0.2, 0.2, 0.12, 0.1]
	var pick_bush := func(low_only: bool) -> String:
		for _try in range(8):
			var r := rng.randf()
			var acc := 0.0
			for bi in range(bush_keys.size()):
				acc += float(bush_w[bi])
				if r <= acc:
					var k := str(bush_keys[bi])
					if low_only and not bool(bush_defs[k]["low"]):
						break
					return k
		return "meadow"
	var place_bush := func(p: Vector2, low_only: bool) -> void:
		var k: String = pick_bush.call(low_only)
		var bd: Dictionary = bush_defs[k]
		var size := rng.randf_range(float(bd["min"]), float(bd["max"]))
		if low_only:
			size = minf(size, 0.85)
		var y := 0.0
		if str(cell_kind.call(p)) == "outside":
			y = maxf(-0.06, _eval_skirt_height("forest", p.x, p.y, width_m, depth_m))
		_env_kit.append_bush("bush_" + k, Vector3(p.x, y, p.y), size, rng.randf() * TAU, bd["uv"])
		bush_counts[k] = int(bush_counts.get(k, 0)) + 1

	var bx := -28.0
	while bx <= width_m + 28.0:
		var bz := -30.0
		while bz <= depth_m + 18.0:
			var p2 := Vector2(bx + rng.randf_range(-1.2, 1.2), bz + rng.randf_range(-1.2, 1.2))
			bz += 3.1
			var kind: String = cell_kind.call(p2)
			if kind != "outside":
				continue
			var rd2: float = rect_dist.call(p2)
			if rd2 < 0.6:
				continue
			if _river_distance(p2) < _river_half_width(p2.y) + 0.9:
				continue
			if rng.randf() > (0.58 if rd2 < 11.0 else 0.28):
				continue
			var low_only := bool(in_south_band.call(p2))
			place_bush.call(p2, low_only)
			# Group 1-2 companion ferns/heather tufts beside shrubs for organic clusters
			var companions := rng.randi_range(1, 2)
			for _ci in range(companions):
				var ca := rng.randf() * TAU
				var cp2 := p2 + Vector2(cos(ca), sin(ca)) * rng.randf_range(0.65, 1.25)
				if str(cell_kind.call(cp2)) == "outside" and _river_distance(cp2) >= _river_half_width(cp2.y) + 0.85:
					place_bush.call(cp2, true)
		bx += 3.1

	# Extra lush shrubs, ferns & damp-bank mushrooms along the extended riverbanks
	for ri in range(0, _river_pts.size(), 3):
		var rp_c := _river_pts[ri]
		if absf(rp_c.y - 17.0) < 2.4:
			continue
		var hw_r := _river_half_width(rp_c.y)
		for side_r in [-1.0, 1.0]:
			if rng.randf() < 0.45:
				var bp := Vector2(rp_c.x + side_r * (hw_r + rng.randf_range(0.95, 1.85)), rp_c.y + rng.randf_range(-0.6, 0.6))
				if str(cell_kind.call(bp)) == "outside" or not walk.has(Vector2i(int(floor(bp.x / tile)), int(floor(bp.y / tile)))):
					if not bool(near_blocked.call(bp, 1.2)):
						place_bush.call(bp, bool(in_south_band.call(bp)))
			if rng.randf() < 0.30:
				var mp_r := Vector2(rp_c.x + side_r * (hw_r + rng.randf_range(0.65, 1.35)), rp_c.y + rng.randf_range(-0.5, 0.5))
				if not bool(near_blocked.call(mp_r, 1.1)):
					var ry := maxf(0.0, _carve_river_valley(mp_r.x, mp_r.y, 0.0))
					var rmkind: String = ["chanterelle", "amanita", "porcini", "brown"][rng.randi() % 4]
					_env_kit.append_mushroom_cluster(mk, rmkind, Vector3(mp_r.x, ry, mp_r.y), rng.randf() * 10.0, rng.randi_range(3, 6), 1.35)
					mush_clusters += 1

	for c in range(cols):
		for r in range(rows):
			if walk.has(Vector2i(c, r)):
				continue
			var cp := Structure.tile_to_world(c, r, 0.0)
			var p3 := Vector2(cp.x + rng.randf_range(-0.35, 0.35), cp.z + rng.randf_range(-0.35, 0.35))
			if bool(near_blocked.call(p3, 1.3)) or _river_distance(p3) < _river_half_width(p3.y) + 0.6:
				continue
			if rng.randf() < 0.75:
				place_bush.call(p3, r >= rows - 3)

	# Ferns hugging new tree bases + mushrooms by species
	for spot in new_spots:
		var sp2: Vector2 = spot["p"]
		var spc := str(spot["species"])
		if rng.randf() < 0.55 and not bool(in_south_band.call(sp2)):
			var a := rng.randf() * TAU
			place_bush.call(sp2 + Vector2(cos(a), sin(a)) * rng.randf_range(1.1, 1.9), true)
		if rng.randf() < 0.42:
			var kinds: Array = ["amanita", "porcini"] if spc in ["spruce", "pine", "birch", "sapling"] else (["brown", "puffball"] if spc == "snag" else ["chanterelle", "porcini", "brown"])
			var a2 := rng.randf() * TAU
			var mp := sp2 + Vector2(cos(a2), sin(a2)) * rng.randf_range(0.6, 1.2)
			var my := float(spot["y"]) + 0.04
			_env_kit.append_mushroom_cluster(mk, str(kinds[rng.randi() % kinds.size()]), Vector3(mp.x, my, mp.y), rng.randf() * 10.0, rng.randi_range(3, 7))
			mush_clusters += 1
		if spc == "snag":
			_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(sp2.x + 0.25, float(spot["y"]) + 1.1, sp2.y), rng.randf() * 5.0)

	# Fallen mossy logs with fungi in the surrounding woodland
	var log_spots: Array[Vector2] = [Vector2(-6.5, 4.0), Vector2(-9.0, 26.0), Vector2(width_m + 5.5, 3.5), Vector2(width_m + 7.0, 22.0),
		Vector2(14.0, -7.0), Vector2(26.0, -9.5), Vector2(-14.0, -12.0), Vector2(width_m + 14.0, -6.0), Vector2(-16.0, 40.0), Vector2(width_m + 16.0, 44.0)]
	for li in range(log_spots.size()):
		var lp: Vector2 = log_spots[li]
		if _river_distance(lp) < _river_half_width(lp.y) + 2.5:
			lp.x += 6.0
		var ly := maxf(-0.05, _eval_skirt_height("forest", lp.x, lp.y, width_m, depth_m)) - 0.08
		var yaw := float(li) * 1.37
		_env_kit.append_fallen_log("trunk_dark", Vector3(lp.x, ly, lp.y), yaw, rng.randf_range(2.6, 4.0), rng.randf_range(0.22, 0.32))
		_env_kit.append_mushroom_cluster(mk, "brown" if li % 2 == 0 else "porcini", Vector3(lp.x + 0.6, ly + 0.05, lp.y + 0.45), float(li), 5)
		_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(lp.x - cos(yaw) * 0.6, ly + 0.42, lp.y - sin(yaw) * 0.6 + 0.2), float(li) * 2.1)
		logs += 1
		mush_clusters += 1

	# Low meadow flora & mushrooms on walkable grass (decorative, <0.4 m, away from camp points)
	for key in walk.keys():
		var mat_id := str(walk[key])
		if mat_id in ["earth", "water", "stone", "gravel"]:
			continue
		var cw := Structure.tile_to_world(int(key.x), int(key.y), 0.0)
		var p4 := Vector2(cw.x + rng.randf_range(-0.55, 0.55), cw.z + rng.randf_range(-0.55, 0.55))
		if bool(near_blocked.call(p4, 1.4)) or _river_distance(p4) < _river_half_width(p4.y) + 0.3:
			continue
		var roll2 := rng.randf()
		if roll2 < 0.16:
			_env_kit.append_bush("bush_meadow", Vector3(p4.x, 0.0, p4.y), rng.randf_range(0.3, 0.4), rng.randf() * TAU, q_br)
			bush_counts["meadow_low"] = int(bush_counts.get("meadow_low", 0)) + 1
		elif roll2 < 0.24:
			_env_kit.append_bush("bush_heather", Vector3(p4.x, 0.0, p4.y), rng.randf_range(0.3, 0.38), rng.randf() * TAU, q_br)
			bush_counts["heather_low"] = int(bush_counts.get("heather_low", 0)) + 1
		elif roll2 < 0.31:
			var mkind: String = ["brown", "puffball", "amanita", "chanterelle"][rng.randi() % 4]
			_env_kit.append_mushroom_cluster(mk, mkind, Vector3(p4.x, 0.0, p4.y), rng.randf() * 10.0, rng.randi_range(2, 4), 1.25)
			mush_clusters += 1

	# Fairy ring of small mushrooms in the northern grass of the clearing
	var ring_c := Vector2(27.0, 7.5)
	for ri in range(12):
		var ra := float(ri) * TAU / 12.0
		var rp := ring_c + Vector2(cos(ra), sin(ra)) * 1.05
		_env_kit.append_mushroom_cluster(mk, "parasol" if ri % 4 == 0 else "brown", Vector3(rp.x, 0.0, rp.y), float(ri) * 1.3, 1, 1.2)
	mush_clusters += 1

	var batch_stats := _env_kit.flush_batches(_grp_vegetation, "ForestFlora_")
	var species_total := 0
	for sk in tree_counts.keys():
		species_total += int(tree_counts[sk])
	flora_stats = {
		"trees": tree_counts,
		"trees_total": species_total,
		"tree_species": tree_counts.keys().size() + 2,
		"bushes": bush_counts,
		"mushroom_clusters": mush_clusters,
		"fallen_logs": logs,
		"batches": batch_stats,
	}

func _spawn_fauna_actor(glb_path: String, node_name: String, scale_val: float, waypoints: Array, period: float, phase: float) -> void:
	if not ResourceLoader.exists(glb_path):
		return
	var packed := load(glb_path) as PackedScene
	if not packed:
		return
	var inst := packed.instantiate() as Node3D
	if not inst:
		return
	inst.name = node_name
	inst.scale = Vector3.ONE * scale_val
	inst.position = waypoints[0]
	_grp_vegetation.add_child(inst)
	var ap := inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap and not ap.get_animation_list().is_empty():
		var walk_anim := ""
		for anim_name in ap.get_animation_list():
			if str(anim_name).to_lower().contains("walk"):
				walk_anim = anim_name
				break
		if walk_anim == "":
			walk_anim = ap.get_animation_list()[0]
		var anim_res := ap.get_animation(walk_anim)
		if anim_res:
			anim_res.loop_mode = Animation.LOOP_LINEAR
		ap.speed_scale = 0.90
		ap.play(walk_anim)
	fauna_agents.append({
		"node": inst, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase, "gait": "glb",
		"ap": ap, "walk_clip": "Walk", "pause_clip": "Eating",
	})

# ------------------------------------------------------------------------------
# Camp 03: Playa del pecio
# ------------------------------------------------------------------------------
func _build_beach_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float) -> void:
	var mat_sand_rock := MatKit.make_textured_mat("a1-cliff-rugged-v8.jpg", Color("#9a8b74"), 0.88, "rock", Vector3(0.45, 0.45, 0.45), true, true)
	var mat_wet_rock := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#4e565a"), 0.36, "rock", Vector3(0.35, 0.35, 0.35), true, true)
	var mat_dune_grass := _env_kit.make_alpha_foliage_mat("beach_grass", Color("#7c804c"))
	var mat_drift := MatKit.make_wood_mat(Color("#a19784"), true)
	var mat_wreck := MatKit.make_wood_mat(Color("#735a45"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#9e8f6d"), true, true)

	fx.build_ocean_backdrop(self, width_m, depth_m * 0.68, 82.0, -0.22)
	fx.set_smoke_wind(Vector3(-0.28, 0.92, -0.26)) # Sea breeze blowing inland gently

	# Upper coastal sandstone bluffs & clustered dune-grass tufts north/east/west of beach
	for i in range(11):
		var rx := lerpf(1.5, width_m - 1.5, float(i) / 10.0)
		var rz := -2.2 - fmod(float(i) * 1.6, 3.4)
		_env_kit.spawn_rock(_grp_env_geo, Vector3(rx, 0.35, rz), Vector3(1.85, 0.92 + fmod(float(i), 3.0) * 0.30, 1.45), float(i) * 0.9, mat_sand_rock, i, "craggy")
		if i % 2 == 0:
			_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(rx + 0.85, 0.04, rz + 1.45), 0.95, mat_dune_grass, float(i) * 1.2, 2)
	var dune_xs: Array[float] = [-5.5, 4.2, 33.5, 41.0, -8.2, 38.5]
	var dune_zs: Array[float] = [5.0, 2.5, 4.0, 11.5, 13.0, 17.0]
	for df_i in range(dune_xs.size()):
		var dx_off: float = dune_xs[df_i]
		var dz_off: float = dune_zs[df_i]
		_env_kit.spawn_rock(_grp_env_geo, Vector3(dx_off, 0.25, dz_off), Vector3(1.35, 0.72, 1.15), float(df_i) * 1.3, mat_sand_rock, df_i + 1, "craggy")
		_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(dx_off + 0.7, 0.02, dz_off + 0.6), 0.92, mat_dune_grass, float(df_i), 3)
		if df_i % 2 == 1:
			_env_kit.spawn_reed_cluster(_grp_vegetation, Vector3(dx_off + 0.35, 0.02, dz_off + 0.8), mat_dune_grass, float(df_i) * 1.4, false)

	# Shelter coastal boulders along obstacles (wet dark rock near surf, sand-blasted dry rock up slope)
	var r_idx := 0
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")).contains("rock"):
			var rp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			var is_wet := int(ob["row"]) >= 13
			_env_kit.spawn_rock(
				_grp_env_geo,
				rp + Vector3(0.0, 0.22, 0.0),
				Vector3(1.05, 0.68 if int(ob["row"]) <= 8 else 0.52, 0.96),
				float(r_idx) * 1.35,
				mat_wet_rock if is_wet else mat_sand_rock,
				r_idx + 1,
				"rounded" if is_wet else "craggy"
			)
			if not is_wet and r_idx % 2 == 0:
				_env_kit.spawn_fern_clump(_grp_vegetation, rp + Vector3(0.45, 0.0, 0.35), 0.78, mat_dune_grass, float(r_idx), 2)
			r_idx += 1

	# Sculpted CC0 Stranded Rowboat tilted on tidal sandbar (no fabricated crates, no Pecio trigger!)
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")) == "beach-boat":
			var bp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			var boat := Node3D.new()
			boat.name = "StrandedRowboat"
			boat.position = bp + Vector3(0.0, -0.04, 0.2)
			boat.rotation = Vector3(0.06, 0.45, -0.14)
			_grp_structures.add_child(boat)
			var hull := _spawn_prop_glb(boat, "boat-row-large.glb", Vector3.ZERO, 0.0, Vector3.ONE * 1.55, true, "", mat_drift)
			if hull == null:
				var fb := MeshInstance3D.new()
				var bhm := BoxMesh.new(); bhm.size = Vector3(3.0, 0.56, 1.32)
				fb.mesh = bhm; fb.material_override = mat_drift; boat.add_child(fb)
			_spawn_prop_glb(boat, "tool-paddle.glb", Vector3(0.35, 0.22, 0.38), 0.35, Vector3.ONE * 1.35, true, "", mat_drift)

	# Distant half-submerged shipwreck hull out in the eastern surf horizon (clear of HUD controls)
	_spawn_prop_glb(_grp_env_geo, "ship-wreck.glb", Vector3(width_m + 3.2, -0.78, depth_m + 9.2), -0.45, Vector3.ONE * 1.45, true, "OffshoreShipwreck", mat_wreck)

	# 6 Scattered weathered wreck planks, 2 rigging coils & damp seaweed clumps along tidal debris line
	var plank_spots := [
		[7.2, 21.8, 0.38, 1.35], [10.4, 23.2, -0.52, 1.55], [14.8, 22.4, 0.18, 1.25],
		[22.5, 21.2, -0.78, 1.45], [26.8, 22.8, 0.64, 1.30], [18.5, 19.6, 1.05, 1.15]
	]
	for p_item in plank_spots:
		_env_kit.spawn_driftwood_plank(_grp_env_geo, Vector3(p_item[0], 0.0, p_item[1]), p_item[2], p_item[3], mat_drift)

	for r_pos in [Vector2(8.6, 20.6), Vector2(21.4, 21.9)]:
		var rig := MeshInstance3D.new()
		var rm := TorusMesh.new(); rm.inner_radius = 0.16; rm.outer_radius = 0.22; rm.rings = 14
		rig.mesh = rm; rig.material_override = mat_rope
		rig.position = Vector3(r_pos.x, 0.03, r_pos.y)
		_grp_env_geo.add_child(rig)

	for sw_i in range(5):
		_env_kit.spawn_seaweed_clump(_grp_vegetation, Vector3(6.5 + float(sw_i) * 5.2, 0.01, 21.5 + sin(float(sw_i)) * 1.4), float(sw_i) * 1.1)

	# Rich coastal dune grass, sea-holly / horned-poppy tufts & starfish on wet stones (visible up close & overview!)
	var coastal_flora: Array[Vector2] = [
		Vector2(8.5, 9.6), Vector2(10.8, 8.2), Vector2(24.6, 8.8), Vector2(27.8, 12.6),
		Vector2(6.8, 17.5), Vector2(29.2, 18.2),
	]
	for cf_i in range(coastal_flora.size()):
		var cp: Vector2 = coastal_flora[cf_i]
		_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(cp.x, 0.0, cp.y), 0.92, mat_dune_grass, float(cf_i) * 1.5, 2)
		_env_kit.spawn_reed_cluster(_grp_vegetation, Vector3(cp.x + 0.42, 0.0, cp.y + 0.28), mat_dune_grass, float(cf_i) * 1.9, false)
		_env_kit.spawn_wildflower_patch(_grp_vegetation, Vector3(cp.x - 0.38, 0.0, cp.y + 0.42), float(cf_i) * 1.3, 6, "beach")
	for ss_i in range(3):
		var sx := 7.2 + float(ss_i) * 9.8
		FaunaKit.spawn_seastar(_grp_vegetation, Vector3(sx, 0.02, depth_m * 0.69 + sin(float(ss_i)) * 0.5), Color("#d45a38") if ss_i % 2 == 0 else Color("#c23e54"), float(ss_i) * 1.7)

	# Coastal fauna: diurnal/nocturnal schedule, emerging from rocks/waves, pausing naturally & returning to shelter!
	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_0", [
		Vector3(6.2, 0.02, depth_m * 0.67), Vector3(11.4, 0.02, depth_m * 0.66),
		Vector3(12.8, 0.02, depth_m * 0.68), Vector3(14.6, 0.02, depth_m * 0.65),
		Vector3(6.0, 0.02, depth_m * 0.68),
	], 18.0, 1.2, Color("#c24a2b"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 42.0, 0.48, 3.0, true, 3.2)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_1", [
		Vector3(29.8, 0.02, depth_m * 0.66), Vector3(25.6, 0.02, depth_m * 0.67),
		Vector3(24.0, 0.02, depth_m * 0.66), Vector3(21.8, 0.02, depth_m * 0.68),
		Vector3(29.5, 0.02, depth_m * 0.66),
	], 16.0, 4.4, Color("#b63f26"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 46.0, 0.50, 8.0, true, 3.2)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_2", [
		Vector3(15.2, 0.02, depth_m * 0.61), Vector3(18.0, 0.02, depth_m * 0.63),
		Vector3(19.4, 0.02, depth_m * 0.62), Vector3(15.0, 0.02, depth_m * 0.61),
	], 14.0, 2.8, Color("#c95a34"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 48.0, 0.46, 22.0, true, 3.2)

	FaunaKit.spawn_turtle(_grp_vegetation, fauna_agents, "BeachTurtle", [
		Vector3(7.8, -0.18, depth_m * 0.88), Vector3(10.8, 0.01, depth_m * 0.72),
		Vector3(12.2, 0.02, depth_m * 0.68), Vector3(14.5, 0.01, depth_m * 0.72),
		Vector3(11.0, -0.18, depth_m * 0.88),
	], 32.0, 1.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["storm"], 78.0, 0.34, 42.0, true, 4.0)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "BeachPerchedGull_0", Vector3(7.4, 0.48, 20.6), 0.7, Color("#f2f6fa"), Color("#788696"), 1.08, 0.4)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm"], 44.0, 0.44, 4.0, false, 4.0)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "BeachPerchedGull_1", Vector3(24.8, 0.36, 21.8), -1.8, Color("#eef3f7"), Color("#6d7b8c"), 1.02, 2.2)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm"], 52.0, 0.42, 26.0, false, 4.0)

	# Occasional ocean fish swimming in from offshore surf & briefly breaching in calm clear weather
	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_0", [
		Vector3(10.0, -0.32, depth_m * 0.96), Vector3(14.2, -0.25, depth_m * 0.75),
		Vector3(18.6, -0.24, depth_m * 0.74), Vector3(23.5, -0.32, depth_m * 0.96),
	], 18.0, 0.25, Color("#3e7488"), "swim_ocean_jump", 1.32)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 62.0, 0.32, 36.0, false, 0.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_1", [
		Vector3(31.5, -0.32, depth_m * 0.96), Vector3(27.8, -0.24, depth_m * 0.74),
		Vector3(24.5, -0.25, depth_m * 0.77), Vector3(20.5, -0.32, depth_m * 0.96),
	], 20.0, 2.4, Color("#498296"), "swim_ocean_jump", 1.24)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 70.0, 0.30, 8.0, false, 0.0)
	sync_wildlife()

# ------------------------------------------------------------------------------
# Camp 04: Acantilados del Observatorio (Austere Basalt Plateau)
# ------------------------------------------------------------------------------
func _build_observatory_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float) -> void:
	var mat_basalt := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#4a5562"), 0.86, "rock", Vector3(0.32, 0.32, 0.32), true, true)
	var mat_ashlar := MatKit.make_textured_mat("ashlar-v4.webp", Color("#646c75"), 0.80, "rock", Vector3(0.35, 0.35, 0.35), true, true)
	var mat_crystal := MatKit.make_glow_mat(Color("#54d7f5"), 1.55)
	fx.build_ocean_backdrop(self, width_m * 1.5, depth_m * 0.72, 105.0, -15.5)
	fx.set_smoke_wind(Vector3(0.45, 0.78, 0.35)) # Strong exposed plateau crosswind

	# Natural basalt windbreak scree, hexagonal basalt columns & localized arcane crystal veins
	var p_idx := 0
	for ob in scene_def.get("obstacles", []):
		var oid := str(ob.get("id", ""))
		var op := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
		if oid.contains("windbreak"):
			_env_kit.spawn_rock(_grp_env_geo, op + Vector3(0.0, 0.36, 0.0), Vector3(1.52, 1.15, 1.32), op.x * 0.7, mat_basalt, p_idx, "stratified")
			if p_idx % 2 == 0:
				_env_kit.spawn_cliff_heather(_grp_vegetation, op + Vector3(0.65, 0.0, 0.52), float(p_idx) * 1.4)
			p_idx += 1
		elif oid.contains("pillar"):
			var plinth := MeshInstance3D.new()
			var plm := CylinderMesh.new(); plm.top_radius = 0.78; plm.bottom_radius = 0.88; plm.height = 0.34; plm.radial_segments = 6
			plinth.mesh = plm; plinth.material_override = mat_ashlar; plinth.position = op + Vector3(0, 0.17, 0)
			_grp_env_geo.add_child(plinth)

			var pil := MeshInstance3D.new()
			var h_var := 2.6 + fmod(float(p_idx) * 0.55, 1.1)
			var pm := CylinderMesh.new(); pm.top_radius = 0.44; pm.bottom_radius = 0.58; pm.height = h_var; pm.radial_segments = 6
			pil.mesh = pm; pil.material_override = mat_basalt; pil.position = op + Vector3(0, h_var * 0.5 + 0.30, 0)
			pil.rotation.y = float(p_idx) * 0.4
			_grp_env_geo.add_child(pil)

			_env_kit.spawn_rock(_grp_env_geo, op + Vector3(0.55, 0.12, 0.35), Vector3(0.75, 0.42, 0.72), float(p_idx), mat_basalt, p_idx, "stratified")
			p_idx += 1
		elif oid.contains("crystal"):
			# Localized crystal seam embedded in basalt fissure with contained low-radius light
			_env_kit.spawn_rock(_grp_env_geo, op + Vector3(0, 0.08, 0), Vector3(0.82, 0.38, 0.78), op.x, mat_basalt, int(ob["col"]), "stratified")
			for j in range(4):
				var cry := MeshInstance3D.new()
				var cm := CylinderMesh.new(); cm.top_radius = 0.018; cm.bottom_radius = 0.13 - float(j) * 0.015; cm.height = 0.82 - float(j) * 0.14; cm.radial_segments = 5
				cry.mesh = cm; cry.material_override = mat_crystal
				var ang := float(j) * TAU / 4.0 + 0.3
				cry.position = op + Vector3(cos(ang) * 0.18, 0.38, sin(ang) * 0.18)
				cry.rotation = Vector3(sin(ang) * 0.28, float(j), -cos(ang) * 0.28)
				_grp_env_geo.add_child(cry)
			var cl := OmniLight3D.new()
			cl.light_color = Color("#54d7f5"); cl.light_energy = 1.05; cl.omni_range = 3.8; cl.omni_attenuation = 1.8
			cl.position = op + Vector3(0, 0.72, 0)
			_grp_env_geo.add_child(cl)

	# Northern & lateral basalt cliff rim crags anchored solidly around precipice
	for k in range(12):
		var kx := lerpf(1.2, width_m - 1.2, float(k) / 11.0)
		_env_kit.spawn_rock(_grp_env_geo, Vector3(kx, -0.10, 1.85 + sin(float(k) * 1.3) * 0.35), Vector3(1.55, 0.75, 1.15), float(k) * 0.8, mat_basalt, k, "stratified")
	for side_z in [6.5, 13.0, 20.5, 25.5]:
		_env_kit.spawn_rock(_grp_env_geo, Vector3(2.2, 0.14, side_z), Vector3(1.42, 0.82, 1.28), side_z * 0.7, mat_basalt, int(side_z), "stratified")
		_env_kit.spawn_rock(_grp_env_geo, Vector3(width_m - 2.2, 0.14, side_z), Vector3(1.38, 0.78, 1.25), side_z * 1.1, mat_basalt, int(side_z) + 3, "stratified")

	# Highland heather, silver-sage moss cushions & purple alpine saxifrage tucked beside rock shelter (no bare plateau!)
	var cliff_flora: Array[Vector2] = [
		Vector2(10.8, 11.4), Vector2(14.5, 9.2), Vector2(22.6, 11.8), Vector2(25.8, 17.5),
		Vector2(7.8, 18.6), Vector2(28.4, 8.6), Vector2(18.5, 6.2),
	]
	for cf_i in range(cliff_flora.size()):
		var cp: Vector2 = cliff_flora[cf_i]
		_env_kit.spawn_cliff_heather(_grp_vegetation, Vector3(cp.x, 0.0, cp.y), float(cf_i) * 1.4)
		_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(cp.x - 0.35, 0.0, cp.y + 0.32), Color("#6a7a63"), 0.88, float(cf_i) * 1.7)
		_env_kit.spawn_wildflower_patch(_grp_vegetation, Vector3(cp.x + 0.32, 0.0, cp.y + 0.25), float(cf_i) * 1.1, 6, "cliff")

	# Highland wildlife: Ibex traversing outer basalt rim by day/dawn/dusk, crepuscular Hare & patrolling Ravens
	FaunaKit.spawn_ibex(_grp_vegetation, fauna_agents, "CliffIbex", [
		Vector3(-4.5, 0.02, 5.8), Vector3(9.5, 0.02, 5.0),
		Vector3(14.8, 0.02, 4.6), Vector3(22.5, 0.02, 5.2),
		Vector3(width_m + 4.5, 0.02, 5.8),
	], 28.0, 2.0)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 66.0, 0.40, 8.0, true, 5.0)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "CliffHare", [
		Vector3(4.5, 0.0, 9.8), Vector3(10.0, 0.0, 9.4),
		Vector3(11.6, 0.0, 9.2), Vector3(14.5, 0.0, 8.6),
		Vector3(4.2, 0.0, 10.2),
	], 16.0, 1.4, Color("#6e655b"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 48.0, 0.38, 28.0, true, 4.2)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "CliffPerchedRaven_0", Vector3(22.2, 0.62, 11.4), -1.6, Color("#1e232e"), Color("#121720"), 1.08, 0.8)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 42.0, 0.44, 3.0, false, 3.8)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "CliffPerchedRaven_1", Vector3(9.2, 0.52, 8.2), 0.9, Color("#1c212b"), Color("#11161e"), 1.04, 2.9)
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 48.0, 0.42, 6.0, false, 3.8)
	sync_wildlife()

	# 3 translucent shader aurora curtains framed cleanly in northern sky
	for i in range(3):
		var aurora := MeshInstance3D.new()
		aurora.name = "ObservatoryAurora_%d" % i
		var am := PlaneMesh.new()
		am.size = Vector2(46.0, 9.5); am.subdivide_width = 28; am.subdivide_depth = 8
		aurora.mesh = am
		aurora.material_override = MatKit.create_aurora_shader_material(
			Color("#42f2be") if i % 2 == 0 else Color("#5ad8ff"),
			Color("#7a68ff"),
			float(i) * 2.1
		)
		aurora.position = Vector3(width_m * 0.5 + float(i - 1) * 5.0, 2.8 + float(i) * 0.85, -8.5 - float(i) * 2.2)
		aurora.rotation.x = deg_to_rad(56.0)
		aurora.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(aurora)
		fx.register_aurora(aurora)

	# Wind-driven mist clouds
	for c in range(5):
		var cld := MeshInstance3D.new()
		var clm := PlaneMesh.new(); clm.size = Vector2(13.0, 6.5)
		cld.mesh = clm
		cld.material_override = MatKit.create_cloud_wisp_shader_material(Color(0.54, 0.66, 0.80, 0.24))
		cld.position = Vector3(width_m * 0.16 + float(c) * 7.8, 3.6 + float(c % 2) * 0.9, -6.5 + float(c % 3) * 2.2)
		cld.rotation.x = deg_to_rad(58.0)
		cld.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(cld)
		fx.register_cloud(cld, cld.position.x, width_m + 34.0, 0.72 + float(c % 2) * 0.28)

# ------------------------------------------------------------------------------
# Camp 05: Refugio costero de Pleamar (Sea Cave Sanctuary — ZERO canvas tarps)
# ------------------------------------------------------------------------------
func _build_refuge_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float, _tile: float) -> void:
	var mat_arch := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#6a716c"), 0.88, "rock", Vector3(0.30, 0.30, 0.30), true, true)
	var mat_rugged := MatKit.make_textured_mat("a1-cliff-rugged-v8.jpg", Color("#5c635e"), 0.90, "rock", Vector3(0.28, 0.28, 0.28), true, true)
	var mat_wet_rock := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#475251"), 0.26, "rock", Vector3(0.32, 0.32, 0.32), true, true)
	var mat_ivy := _env_kit.make_alpha_foliage_mat("cave_moss", Color("#3b643b"))
	var mat_drip := MatKit.make_glow_mat(Color("#b5ecfc"), 1.05)

	fx.build_ocean_backdrop(self, width_m, depth_m * 0.84, 72.0, -0.18)
	# Ventilate hearth smoke gently out toward southern cave mouth
	fx.set_smoke_wind(Vector3(0.08, 0.82, 0.56))

	# Sculpted deep sea-grotto north cliff wall + irregular stone buttresses & scalloped overhang lip
	var grotto_back := Node3D.new()
	grotto_back.name = "SeaGrottoBackWall"
	_grp_structures.add_child(grotto_back)

	var st_wall := SurfaceTool.new(); st_wall.begin(Mesh.PRIMITIVE_TRIANGLES)
	var wall_cols := 24
	var wall_tiers := 6
	var w_pts: Array = []
	for ti in range(wall_tiers + 1):
		var ft := float(ti) / float(wall_tiers)
		var row_v: Array[Vector3] = []
		for ci in range(wall_cols + 1):
			var fc := float(ci) / float(wall_cols)
			var wx := lerpf(-12.0, width_m + 12.0, fc)
			var arch_curve := sin(clampf((wx / width_m), 0.0, 1.0) * PI)
			var wy := ft * (3.75 + arch_curve * 1.15) - 0.15
			var overhang_in := pow(ft, 1.35) * 2.15
			var crag := sin(fc * 25.0 + ft * 4.5) * 0.65 + cos(fc * 11.0 - ft * 2.2) * 0.48
			var wing_fwd := maxf(0.0, absf(fc - 0.5) * 2.0 - 0.65) * 6.5
			var wz := -2.6 + overhang_in - arch_curve * 2.1 + wing_fwd + crag
			row_v.append(Vector3(wx, wy, wz))
		w_pts.append(row_v)
	for ti in range(wall_tiers):
		for ci in range(wall_cols):
			_emit_quad(st_wall, w_pts[ti][ci], w_pts[ti][ci + 1], w_pts[ti + 1][ci + 1], w_pts[ti + 1][ci])
	st_wall.generate_normals()
	var wall_mesh := MeshInstance3D.new(); wall_mesh.name = "GrottoCliffShell"
	wall_mesh.mesh = st_wall.commit(); wall_mesh.material_override = mat_rugged
	grotto_back.add_child(wall_mesh)

	for sx in [0.5, width_m - 0.5]:
		for tier in range(3):
			_env_kit.spawn_rock(grotto_back, Vector3(sx, 0.72 + float(tier) * 1.05, 1.9 - float(tier) * 0.35), Vector3(2.35 - float(tier) * 0.22, 1.45, 2.25), float(tier) * 1.1, mat_arch if tier % 2 == 0 else mat_rugged, int(sx) + tier, "stratified")

	# Scalloped vaulted RockyOverhangLip arching forward cleanly across sea headland
	var overhang := Node3D.new()
	overhang.name = "RockyOverhangLip"
	_grp_structures.add_child(overhang)
	var st_roof := SurfaceTool.new(); st_roof.begin(Mesh.PRIMITIVE_TRIANGLES)
	var r_cols := 26
	var r_rows := 5
	var r_pts: Array = []
	for ri in range(r_rows + 1):
		var fr := float(ri) / float(r_rows)
		var rr: Array[Vector3] = []
		for ci in range(r_cols + 1):
			var fc := float(ci) / float(r_cols)
			var rx := lerpf(-11.0, width_m + 11.0, fc)
			var wing_depth := (1.0 - sin(fc * PI)) * 3.8
			var jag := sin(fc * 25.0) * 0.65 + cos(fc * 11.0) * 0.42
			var rz := lerpf(-2.4, 2.6 + wing_depth + jag, fr)
			var arch := sin(fc * PI)
			var ry := 3.85 + arch * 1.05 - pow(fr, 1.55) * 0.68 + cos(fc * 13.0 + fr * 4.0) * 0.28
			rr.append(Vector3(rx, ry, rz))
		r_pts.append(rr)
	for ri in range(r_rows):
		for ci in range(r_cols):
			_emit_quad(st_roof, r_pts[ri][ci], r_pts[ri][ci + 1], r_pts[ri + 1][ci + 1], r_pts[ri + 1][ci])
	st_roof.generate_normals()
	var mat_arch_ds := mat_arch.duplicate() as StandardMaterial3D
	mat_arch_ds.cull_mode = BaseMaterial3D.CULL_DISABLED
	var roof_mesh := MeshInstance3D.new(); roof_mesh.name = "CaveRoofVault"
	roof_mesh.mesh = st_roof.commit(); roof_mesh.material_override = mat_arch_ds
	overhang.add_child(roof_mesh)

	# Anchor jagged stone corbels along cave mouth arch so overhang reads rocky and natural
	for c_i in range(9):
		var fc := float(c_i) / 8.0
		var ax := lerpf(2.2, width_m - 2.2, fc)
		var wing := (1.0 - sin(fc * PI)) * 2.4
		_env_kit.spawn_rock(overhang, Vector3(ax, 3.35 + sin(fc * PI) * 0.85, 1.85 + wing), Vector3(1.85, 0.95, 1.65), fc * 3.1, mat_arch if c_i % 2 == 0 else mat_rugged, c_i + 2, "stratified")

	cutaway_tents.append({
		"id": "overhang_north",
		"node": overhang,
		"rect": Rect2(0.0, 0.0, width_m, 9.5),
	})

	# Hanging moss tendrils, mineral flowstone/stalactite bumps & animated dripping cave water droplets
	for i in range(9):
		var ix := lerpf(3.5, width_m - 3.5, float(i) / 8.0)
		var len_v := 1.25 + fmod(float(i) * 0.42, 0.85)
		for cross in [0.2, 1.7]:
			_env_kit.spawn_hanging_vine(_grp_vegetation, Vector3(ix, 3.85, 0.95 + fmod(float(i) * 0.35, 0.9)), cross, 0.86, len_v)

		if i % 2 == 0:
			var stal := MeshInstance3D.new()
			var stm := CylinderMesh.new(); stm.top_radius = 0.14; stm.bottom_radius = 0.025; stm.height = 0.55; stm.radial_segments = 6
			stal.mesh = stm; stal.material_override = mat_wet_rock
			stal.position = Vector3(ix - 0.25, 3.05, 1.6)
			_grp_env_geo.add_child(stal)

		var drip := MeshInstance3D.new()
		var dm := SphereMesh.new(); dm.radius = 0.042; dm.height = 0.13
		drip.mesh = dm; drip.material_override = mat_drip
		drip.position = Vector3(ix + 0.35, 3.08, 2.4)
		_grp_env_geo.add_child(drip)
		fx.register_drip(drip, 3.08, 0.06, 0.62 + float(i % 3) * 0.18, float(i) * 0.23)

	# Wet dark coastal stones rounding off shallow tidepool basins & sea-mouth shoal stones
	for wt in scene_def.get("walkable", []):
		if str(wt.get("medium", "")) == "water":
			var wp := Structure.tile_to_world(int(wt["col"]), int(wt["row"]), 0.0)
			for s in range(5):
				var ang := float(s) * TAU / 5.0 + wp.x
				_env_kit.spawn_rock(_grp_env_geo, wp + Vector3(cos(ang) * 0.72, 0.02, sin(ang) * 0.72), Vector3(0.46, 0.16, 0.42), ang, mat_wet_rock, s, "rounded")
	for sh_i in range(9):
		var sx := lerpf(4.5, width_m - 4.5, float(sh_i) / 8.0)
		_env_kit.spawn_rock(_grp_env_geo, Vector3(sx, -0.08, depth_m * 0.89 + sin(float(sh_i)) * 0.9), Vector3(1.45, 0.36, 1.15), float(sh_i) * 0.8, mat_wet_rock, sh_i, "rounded")

	# Cave perimeter boulders + sparse damp cave ferns (NO artificial cave braziers!)
	var r_idx := 0
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")).contains("rock"):
			var rp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			_env_kit.spawn_rock(_grp_env_geo, rp + Vector3(0, 0.22, 0), Vector3(0.96, 0.62, 0.90), float(r_idx) * 1.15, mat_arch if r_idx % 2 == 0 else mat_rugged, r_idx + 2, "craggy")
			if r_idx % 2 == 0:
				_env_kit.spawn_fern_clump(_grp_vegetation, rp + Vector3(-0.45, 0.0, 0.35), 0.78, mat_ivy, float(r_idx), 2)
			r_idx += 1

	# Damp cave flora: emerald moss cushions, glossy cave ferns & luminous cave blossoms beside pools and cave walls
	var refuge_flora: Array[Vector2] = [
		Vector2(11.5, 10.2), Vector2(24.5, 10.6), Vector2(7.5, 16.2), Vector2(28.2, 17.0),
		Vector2(13.8, 22.8), Vector2(23.5, 22.6),
	]
	for rf_i in range(refuge_flora.size()):
		var rfp: Vector2 = refuge_flora[rf_i]
		_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(rfp.x, 0.0, rfp.y), Color("#3a6342"), 1.0, float(rf_i) * 1.5)
		_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(rfp.x - 0.3, 0.0, rfp.y + 0.25), 0.86, mat_ivy, float(rf_i) * 1.8, 2)
		_env_kit.spawn_wildflower_patch(_grp_vegetation, Vector3(rfp.x + 0.35, 0.0, rfp.y + 0.2), float(rf_i) * 1.2, 5, "refuge")

	# Cave & tidepool wildlife: sheltered tidepool minnows, nocturnal rock crabs, nocturnal bats & occasional sea-mouth visits
	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "CaveFish_0", [
		Vector3(5.6, -0.045, 17.5), Vector3(6.8, -0.045, 18.8), Vector3(7.6, -0.045, 19.6), Vector3(6.2, -0.045, 18.4), Vector3(5.6, -0.045, 17.5),
	], 14.0, 0.5, Color("#3a6d78"), "swim_fish", 1.0)
	FaunaKit.set_behavior(fauna_agents.back(), [], [], 38.0, 0.58, 3.0, true, 0.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "CaveFish_1", [
		Vector3(28.5, -0.045, 18.0), Vector3(30.0, -0.045, 19.4), Vector3(29.1, -0.045, 21.0), Vector3(27.8, -0.045, 19.4), Vector3(28.5, -0.045, 18.0),
	], 15.5, 3.2, Color("#315b66"), "swim_fish", 1.0)
	FaunaKit.set_behavior(fauna_agents.back(), [], [], 42.0, 0.54, 18.0, true, 0.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "CaveFish_2", [
		Vector3(11.8, -0.045, 24.4), Vector3(13.2, -0.045, 25.0), Vector3(14.2, -0.045, 25.4), Vector3(12.6, -0.045, 24.8), Vector3(11.8, -0.045, 24.4),
	], 12.0, 1.8, Color("#49828d"), "swim_fish", 1.05)
	FaunaKit.set_behavior(fauna_agents.back(), [], [], 46.0, 0.56, 6.0, true, 0.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_Cove_0", [
		Vector3(12.0, -0.25, depth_m + 10.5), Vector3(16.8, -0.19, depth_m * 0.90),
		Vector3(21.5, -0.19, depth_m * 0.91), Vector3(25.0, -0.25, depth_m + 10.5),
	], 18.0, 0.20, Color("#427b8e"), "swim_ocean_jump", 1.25)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 62.0, 0.34, 8.0, false, 0.0)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "CaveCrab_0", [
		Vector3(7.4, 0.02, 18.0), Vector3(8.8, 0.02, 19.2), Vector3(8.5, 0.02, 20.6), Vector3(7.4, 0.02, 18.0),
	], 16.0, 0.9, Color("#a8432c"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], [], 44.0, 0.50, 4.0, true, 3.0)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "CaveCrab_1", [
		Vector3(26.2, 0.02, 18.8), Vector3(27.6, 0.02, 20.0), Vector3(26.4, 0.02, 21.0), Vector3(26.2, 0.02, 18.8),
	], 17.0, 2.7, Color("#9c3d28"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], [], 48.0, 0.50, 20.0, true, 3.0)

	for st_i in range(3):
		var sp_star: Vector3 = [Vector3(7.4, 0.03, 19.8), Vector3(27.4, 0.03, 19.6), Vector3(14.4, 0.03, 25.2)][st_i]
		FaunaKit.spawn_seastar(_grp_vegetation, sp_star, Color("#d45e3b") if st_i % 2 == 0 else Color("#b84360"), float(st_i) * 1.4)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "RefugePerchedTern_0", Vector3(9.2, 0.14, depth_m * 0.89), 0.5, Color("#eef4f8"), Color("#627180"), 1.04, 0.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 44.0, 0.44, 4.0, false, 4.0)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "RefugePerchedTern_1", Vector3(27.8, 0.14, depth_m * 0.89), -0.8, Color("#e8eff4"), Color("#566574"), 1.02, 2.4)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 52.0, 0.42, 24.0, false, 4.0)

	for bt_i in range(2):
		FaunaKit.spawn_bat(_grp_vegetation, fauna_agents, "CaveBat_%d" % bt_i, [
			Vector3(8.5 + float(bt_i) * 6.0, 2.65, 3.8), Vector3(18.5, 2.85, 6.2),
			Vector3(28.0 - float(bt_i) * 5.0, 2.55, 4.1), Vector3(17.5, 2.75, 2.6),
			Vector3(8.5 + float(bt_i) * 6.0, 2.65, 3.8),
		], 10.5 + float(bt_i) * 2.5, float(bt_i) * 3.1)
		FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night"], ["storm"], 38.0, 0.60, 4.0 + float(bt_i) * 14.0, false, 0.0)
	sync_wildlife()
