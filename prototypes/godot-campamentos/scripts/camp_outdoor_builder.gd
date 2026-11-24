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
var _forest_occlude_mats: Array[ShaderMaterial] = []
var _river_depth_m: float = 33.0
var _build_scene_def: Dictionary = {}
var _build_profile: String = "forest"
var _build_width_m: float = 36.0
var _build_depth_m: float = 33.0
var _river_ripple_ring: Array[Vector4] = []
var _river_ripple_next: int = 0
var _last_hero_ripple_pos: Dictionary = {}
var _last_hero_ripple_t: Dictionary = {}
var _tree_spots: Array[Vector2] = []
var _outer_perimeter_trees: Array[Vector3] = []
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
	_update_foliage_occlusion()

func _collect_hero_positions() -> Array:
	var out: Array = []
	for tok in _hero_tokens:
		if is_instance_valid(tok):
			out.append(tok.global_position)
	return out

func _seg_dist_2d(p: Vector2, a: Vector2, b: Vector2) -> float:
	var pa := p - a
	var ba := b - a
	var h := clampf(pa.dot(ba) / maxf(0.0001, ba.dot(ba)), 0.0, 1.0)
	return (pa - ba * h).length()

func _forest_trail_dist(px: float, pz: float) -> float:
	var p := Vector2(px, pz)
	# Organic curved west bridge path, northern Pleamar road, and southern trail (synced with terrain shader)
	var d := _seg_dist_2d(p, Vector2(-30.0, 19.2), Vector2(-15.5, 16.2))
	d = minf(d, _seg_dist_2d(p, Vector2(-15.5, 16.2), Vector2(-2.2, 17.5)))
	d = minf(d, _seg_dist_2d(p, Vector2(-2.2, 17.5), Vector2(6.5, 17.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(6.5, 17.0), Vector2(15.5, 16.3)))
	d = minf(d, _seg_dist_2d(p, Vector2(18.0, 13.8), Vector2(19.6, 4.5)))
	d = minf(d, _seg_dist_2d(p, Vector2(19.6, 4.5), Vector2(17.8, -8.5)))
	d = minf(d, _seg_dist_2d(p, Vector2(17.8, -8.5), Vector2(22.8, -24.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(22.8, -24.0), Vector2(21.2, -48.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(21.2, -48.0), Vector2(26.0, -96.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(18.5, 19.2), Vector2(20.6, 30.5)))
	d = minf(d, _seg_dist_2d(p, Vector2(20.6, 30.5), Vector2(24.0, 48.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(24.0, 48.0), Vector2(21.8, 76.0)))
	d = minf(d, _seg_dist_2d(p, Vector2(21.8, 76.0), Vector2(25.2, 116.0)))
	return d

func _eval_forest_play_height(wx: float, wz: float) -> float:
	# Flat stable bivouac core around fire/tarp/bedrolls + gentle natural woodland relief & damp hollows outside core
	var clear_d := Vector2((wx - 18.0) * 0.90, (wz - 16.0) * 1.08).length()
	var pad_weight := smoothstep(4.2, 8.8, clear_d)
	var td := _forest_trail_dist(wx, wz)
	var trail_flat := 1.0 - smoothstep(1.2, 3.2, td)
	var relief := (sin(wx * 0.28 + 0.6) * cos(wz * 0.24 - 0.4) * 0.048 + sin((wx - wz) * 0.46) * 0.022) * pad_weight * (1.0 - trail_flat * 0.72)
	# Subtle damp woodland depressions away from camp & trails
	var hollow_n := sin(wx * 0.31 + 1.4) * sin(wz * 0.29 + 0.9)
	if hollow_n < -0.58 and pad_weight > 0.35 and trail_flat < 0.25:
		relief -= (-0.58 - hollow_n) * 0.14 * pad_weight
	return _carve_river_valley(wx, wz, relief)

func eval_ground_height(wx: float, wz: float) -> float:
	if _build_profile == "forest":
		if Structure.is_on_forest_bridge(Vector3(wx, 0.0, wz)):
			return 0.16
		if wx >= -0.5 and wx <= _build_width_m + 0.5 and wz >= -0.5 and wz <= _build_depth_m + 0.5:
			return maxf(-0.23, _eval_forest_play_height(wx, wz))
		return maxf(-0.23, _eval_skirt_height("forest", wx, wz, _build_width_m, _build_depth_m))
	return _eval_skirt_height(_build_profile, wx, wz, _build_width_m, _build_depth_m)

func clamp_point_to_river(wx: float, wz: float) -> Vector2:
	if _river_pts.is_empty():
		return Vector2(wx, wz)
	var cx := _river_center_x(wz)
	var max_off := maxf(0.24, _river_half_width(wz) - 0.52)
	return Vector2(clampf(wx, cx - max_off, cx + max_off), wz)

func get_nearest_river_point(from_pos: Vector3) -> Vector3:
	if _river_pts.is_empty():
		return Vector3(6.8, 0.08, clampf(from_pos.z, 2.0, _build_depth_m - 2.0))
	var z_clamped := clampf(from_pos.z, -24.0, _build_depth_m + 24.0)
	return Vector3(_river_center_x(z_clamped), 0.06, z_clamped)

func sync_wildlife() -> void:
	var w_id := _fx_ref.current_weather if is_instance_valid(_fx_ref) else "clear"
	var p_id := _fx_ref.current_phase if is_instance_valid(_fx_ref) else "dusk"
	FaunaKit.update_agents(fauna_agents, _fauna_time, w_id, p_id, _collect_hero_positions(), Callable(self, "eval_ground_height"), Callable(self, "clamp_point_to_river"))

func _update_river_mover_ripples() -> void:
	if _river_mats.is_empty():
		return
	var triggered := false
	for tok in _hero_tokens:
		if not is_instance_valid(tok):
			continue
		var pos := tok.global_position
		if pos.y >= 0.045 or not Structure.is_water_at(pos, _build_scene_def):
			continue
		var tid := tok.get_instance_id()
		var p2 := Vector2(pos.x, pos.z)
		var prev_p: Vector2 = _last_hero_ripple_pos.get(tid, p2)
		var prev_t: float = float(_last_hero_ripple_t.get(tid, -9.0))
		var moved := p2.distance_to(prev_p)
		if moved >= 0.24 or (_fauna_time - prev_t) >= 0.85:
			var strength := clampf(0.42 + moved * 1.45, 0.42, 1.0)
			if _river_ripple_ring.size() < 8:
				_river_ripple_ring.resize(8)
			_river_ripple_ring[_river_ripple_next] = Vector4(pos.x, pos.z, _fauna_time, strength)
			_river_ripple_next = (_river_ripple_next + 1) % 8
			_last_hero_ripple_pos[tid] = p2
			_last_hero_ripple_t[tid] = _fauna_time
			triggered = true
	var arr: Array[Vector4] = []
	arr.resize(8)
	for i in range(8):
		arr[i] = _river_ripple_ring[i] if i < _river_ripple_ring.size() else Vector4(0.0, 0.0, -999.0, 0.0)
	for rm in _river_mats:
		if is_instance_valid(rm):
			rm.set_shader_parameter("river_time", _fauna_time)
			if triggered or _fauna_time < 0.2:
				rm.set_shader_parameter("mover_ripples", arr)

func push_water_ripple_at(pos: Vector3, strength: float = 0.88) -> void:
	if _river_ripple_ring.size() < 8:
		_river_ripple_ring.resize(8)
	_river_ripple_ring[_river_ripple_next] = Vector4(pos.x, pos.z, _fauna_time, clampf(strength, 0.25, 1.0))
	_river_ripple_next = (_river_ripple_next + 1) % 8
	var arr: Array[Vector4] = []
	arr.resize(8)
	for i in range(8):
		arr[i] = _river_ripple_ring[i]
	for rm in _river_mats:
		if is_instance_valid(rm):
			rm.set_shader_parameter("mover_ripples", arr)

func _update_foliage_occlusion() -> void:
	if _build_profile != "forest" or _forest_occlude_mats.is_empty():
		return
	var vp := get_viewport()
	var cam := vp.get_camera_3d() if vp else null
	if not is_instance_valid(cam):
		return
	var cam_pos := cam.global_position
	var pts: Array[Vector4] = [Vector4.ZERO, Vector4.ZERO, Vector4.ZERO, Vector4.ZERO]
	var count := 0
	for tok in _hero_tokens:
		if count >= 4:
			break
		if is_instance_valid(tok) and tok.visible:
			var tp := tok.global_position + Vector3(0.0, 0.98, 0.0)
			pts[count] = Vector4(tp.x, tp.y, tp.z, 1.0)
			count += 1
	for fm in _forest_occlude_mats:
		if is_instance_valid(fm):
			fm.set_shader_parameter("cam_world_pos", cam_pos)
			fm.set_shader_parameter("hero_occlude_pts", pts)

func _register_forest_canopy_mat(mat: ShaderMaterial, volume_boost: float = 1.0, enable_occlude: bool = true) -> ShaderMaterial:
	if mat == null:
		return mat
	mat.set_shader_parameter("canopy_volume_boost", volume_boost)
	if enable_occlude:
		mat.set_shader_parameter("occlude_fade_enabled", 1.0)
		if not _forest_occlude_mats.has(mat):
			_forest_occlude_mats.append(mat)
	return mat

func _process(delta: float) -> void:
	_update_foliage_occlusion()
	if _reduced_motion:
		return
	_fauna_time += delta
	sync_wildlife()
	_update_river_mover_ripples()

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

func _prepare_build(scene_def: Dictionary, fx: CampAtmosphereFx) -> void:
	_fx_ref = fx
	_build_scene_def = scene_def
	_build_profile = str(scene_def.get("profile", "forest"))
	var cols := int(scene_def.get("cols", 25))
	var rows := int(scene_def.get("rows", 22))
	_build_width_m = float(cols) * Structure.TILE_METERS
	_build_depth_m = float(rows) * Structure.TILE_METERS
	cutaway_tents.clear()
	chest_lids.clear()
	bedrolls.clear()
	seat_anchors.clear()
	shelter_anchors.clear()
	fauna_agents.clear()
	_stream_shader_mats.clear()
	_river_mats.clear()
	_forest_occlude_mats.clear()
	_river_ripple_ring.clear()
	_river_ripple_next = 0
	_last_hero_ripple_pos.clear()
	_last_hero_ripple_t.clear()
	_tree_spots.clear()
	_outer_perimeter_trees.clear()

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

	var mat_primary: Material
	var mat_ground_splat: ShaderMaterial
	var ripple_v := 0.85 if profile == "coastal-refuge" else 0.35
	var mat_water_tile := MatKit.create_water_shader_material(Color(0.071, 0.271, 0.322, 0.76), Color(0.173, 0.443, 0.490, 0.54), Color("#d6eef2"), 0.014, 1.15, 0.0, Vector2(0.0, 0.2), 0.35, ripple_v)

	match profile:
		"forest":
			var forest_ground_mat := MatKit.create_forest_terrain_shader_material(true)
			mat_primary = forest_ground_mat
			mat_ground_splat = forest_ground_mat
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

	if profile == "forest":
		# Continuous sculpted forest floor across [-1.5..width_m+1.5] x [-1.5..depth_m+1.5]
		# Eliminates ALL rectangular water-tile stair-step bank ledges and matches collision 1:1!
		var step_m := 0.75
		var gx0 := -1.5; var gx1 := width_m + 1.5
		var gz0 := -1.5; var gz1 := depth_m + 1.5
		var nx_f := int(round((gx1 - gx0) / step_m))
		var nz_f := int(round((gz1 - gz0) / step_m))
		var g_pts: Array = []
		var g_w: Array = []
		for iz in range(nz_f + 1):
			var vz := lerpf(gz0, gz1, float(iz) / float(nz_f))
			var p_row: Array[Vector3] = []
			var w_row: Array[float] = []
			for ix in range(nx_f + 1):
				var vx := lerpf(gx0, gx1, float(ix) / float(nx_f))
				# Seamlessly blend GroundPrimary outer 1.8m perimeter into OuterTerrainSkirt (zero border crease!)
				var edge_d := minf(minf(vx - gx0, gx1 - vx), minf(vz - gz0, gz1 - vz))
				var border_blend := 1.0 - smoothstep(0.0, 1.8, edge_d)
				var vy := lerpf(_eval_forest_play_height(vx, vz), _eval_skirt_height("forest", vx, vz, width_m, depth_m), border_blend)
				p_row.append(Vector3(vx, vy, vz))
				var vc := clampi(int(floor(vx / tile)), 0, cols - 1)
				var vr := clampi(int(floor(vz / tile)), 0, rows - 1)
				w_row.append(float(sec_map.get(Vector2i(vc, vr), 0.0)))
			g_pts.append(p_row)
			g_w.append(w_row)
		for iz in range(nz_f):
			for ix in range(nx_f):
				var a: Vector3 = g_pts[iz][ix]
				var b: Vector3 = g_pts[iz][ix + 1]
				var c: Vector3 = g_pts[iz + 1][ix + 1]
				var d: Vector3 = g_pts[iz + 1][ix]
				var wa: float = g_w[iz][ix]
				var wb: float = g_w[iz][ix + 1]
				var wc: float = g_w[iz + 1][ix + 1]
				var wd: float = g_w[iz + 1][ix]
				st_g.set_color(Color(wa, 0, 0, 1)); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(Color(wb, 0, 0, 1)); st_g.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st_g.add_vertex(b)
				st_g.set_color(Color(wc, 0, 0, 1)); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(Color(wa, 0, 0, 1)); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(Color(wc, 0, 0, 1)); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(Color(wd, 0, 0, 1)); st_g.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st_g.add_vertex(d)
		has_g = true
	else:
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
		if profile == "forest":
			mg.create_trimesh_collision()
	if has_w:
		st_w.generate_normals()
		var mw := MeshInstance3D.new(); mw.name = "ShallowWaterCells"
		mw.mesh = st_w.commit(); mw.material_override = mat_water_tile; _grp_terrain.add_child(mw)

	var fcs := CollisionShape3D.new()
	var fbox := BoxShape3D.new()
	if profile == "forest":
		# Safety backstop strictly under the flat eastern bivouac core; sculpted GroundPrimary + ForestStreamBed + OuterTerrainSkirt provide exact 1:1 visual/collision height
		var east_w := maxf(4.0, (width_m - 1.5) - 9.5)
		fbox.size = Vector3(east_w, 1.0, depth_m - 2.0)
		fcs.shape = fbox
		fcs.position = Vector3(9.5 + east_w * 0.5, -0.58, depth_m * 0.5)
	else:
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
	var pad_x := 28.0 if profile != "forest" else 86.0
	var pad_z_n := 24.0 if profile != "forest" else 90.0
	var pad_z_s := 14.0 if profile != "forest" else 76.0
	var x_min := -pad_x; var x_max := width_m + pad_x
	var z_min := -pad_z_n; var z_max := depth_m + pad_z_s
	var nx := 32; var nz := 28
	if profile == "forest":
		# Extended seamless forest hills & river valley eliminating far straight horizon cutoff
		nx = 84; nz = 70

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
	if profile == "forest":
		skirt.create_trimesh_collision()

func _eval_skirt_height(profile: String, px: float, pz: float, width_m: float, depth_m: float) -> float:
	var dx := maxf(0.0, maxf(1.5 - px, px - (width_m - 1.5)))
	var dz_n := maxf(0.0, 2.2 - pz)
	var undul := sin(px * 0.24) * cos(pz * 0.22) * 0.35 + sin((px + pz) * 0.42) * 0.18
	match profile:
		"forest":
			var h_f := -0.025 + sin(px * 0.19) * cos(pz * 0.17) * 0.08
			var inside_d := minf(minf(px - (-1.4), (width_m + 1.4) - px), minf(pz - (-1.4), (depth_m + 1.4) - pz))
			if inside_d > 0.0:
				# Smoothly sit just below GroundPrimary inside the play rect, rising seamlessly to 0 offset at border
				var under_bias := smoothstep(0.0, 1.6, inside_d) * 0.045
				return _eval_forest_play_height(px, pz) - under_bias
			elif pz > depth_m - 0.8:
				var south_t := clampf((pz - (depth_m - 0.8)) / 18.0, 0.0, 1.0)
				h_f = lerpf(-0.025, 0.18 + undul * 0.28, south_t)
			else:
				var rim := sqrt(dx * dx + dz_n * dz_n * 1.15)
				if rim >= 0.6:
					var hill := minf(5.2, rim * 0.145)
					h_f = -0.025 + hill + clampf(undul * minf(1.1, rim * 0.18), -0.35, 0.95)
			# Carve gentle walkable pass grading along Pleamar north/south/west trails (wide shoulder
			# margin so trimesh triangles beside trails stay within _floor_hit window before hills rise)
			var td := _forest_trail_dist(px, pz)
			if td < 7.8 and pz > -62.0 and pz < depth_m + 62.0 and px > -32.0:
				var pass_t := 1.0 - smoothstep(3.8, 7.8, td)
				var gentle_trail := -0.015 + clampf(sin(px * 0.18) * 0.05 + cos(pz * 0.14) * 0.06, -0.04, 0.12)
				h_f = lerpf(h_f, gentle_trail, pass_t)
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
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
	st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
	st.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st.add_vertex(b)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
	st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
	st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
	st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0))
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
					var sh_yaw := 0.06 if profile == "forest" else (-0.24 if profile == "wreck-beach" else 0.18)
					var anc_a := Vector3(-3.0, 0.0, -1.5) if profile == "forest" else Vector3(-2.85, 0.0, -1.65)
					var anc_b := Vector3(3.0, 0.0, -1.5) if profile == "forest" else Vector3(2.85, 0.0, -1.65)
					var res := PropFactory.create_canvas_shelter(_grp_structures, profile, obj_pos, sh_yaw, _env_kit, shelter_rock_mat, anc_a, anc_b, fx)
					# Open camp tarps stay permanently visible & steady; character silhouette + subtle local dither peek shine gently when underneath!
					var tarp_sh: ShaderMaterial = res.get("tarp_mat") as ShaderMaterial
					if profile == "forest" and tarp_sh != null:
						tarp_sh.set_shader_parameter("occlude_fade_enabled", 1.0)
						if not _forest_occlude_mats.has(tarp_sh):
							_forest_occlude_mats.append(tarp_sh)
					shelter_anchors[pid] = {
						"center": obj_pos,
						"capacity": int(res.get("capacity", 2)),
						"min_clear_height": float(res.get("min_clear_height", 1.47)),
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
	var mat_trunk := MatKit.make_wood_mat(Color("#5a422f"), true)
	var mat_plank := MatKit.make_wood_mat(Color("#7c5f44"), true)
	var mat_bark_moss := MatKit.make_textured_mat("moss.jpg", Color("#44613b"), 0.90, "rock", Vector3(1.2, 1.2, 1.2), true, true)
	# Paso 23.3: Softened natural woodland canopy greens (toned down from overly bright yellow-green) + O2 occlusion fade
	var mat_pine_a := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#426937"), 0.036, Color("#638c4c"), false, 2.8, true))
	var mat_pine_b := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#4d753d"), 0.040, Color("#709953"), false, 2.6, true))
	var mat_oak := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#4e6d39"), 0.044, Color("#6d8d50"), false, 2.4, true))
	var mat_fern := _env_kit.make_alpha_foliage_mat("forest_fern", Color("#48663a"))
	var mat_moss_rock := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#646f61"), 0.88, "rock", Vector3(0.45, 0.45, 0.45), true, true)
	var mat_bed := MatKit.make_textured_mat("stream.jpg", Color("#48534a"), 0.68, "rock", Vector3(0.42, 0.42, 0.42), true, true)

	# Long meandering forest river (17/11/2026): runs from the northern hills, through the
	# canonical water cells of the clearing and away south. Flow-mapped animated shader.
	if _river_pts.size() >= 2:
		_build_forest_river_ribbon(mat_bed, mat_moss_rock, mat_fern, mat_plank)

	# Tactile perimeter trees from obstacles (trees (8,7) and (12,7) anchor canopy tarp cleanly)
	var ob_idx := 0
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")).contains("tree"):
			var tp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			if tp.z > depth_m * 0.72 and tp.x > 6.5 and tp.x < width_m - 6.5:
				_env_kit.spawn_fern_clump(_grp_vegetation, tp, 0.95, mat_fern, tp.x, 2)
				_env_kit.spawn_rock(_grp_env_geo, tp + Vector3(0.25, 0.06, -0.2), Vector3(0.82, 0.44, 0.78), tp.z, mat_moss_rock, int(ob["col"]), "craggy")
			else:
				var is_oak := int(ob["col"]) % 3 == 0
				var sp := "oak" if is_oak else "pine"
				# Paso 23.4: vary clearing tree age & stature slightly while preserving shelter anchor positions
				var is_shelter_anchor := (int(ob["col"]) == 8 or int(ob["col"]) == 12) and int(ob["row"]) == 7
				var ob_scale := (0.98 if is_oak else 0.96) if is_shelter_anchor else (0.84 + fmod(float(ob_idx) * 0.23, 0.34))
				_env_kit.build_organic_tree(_grp_vegetation, sp, tp, ob_scale, mat_trunk, mat_oak if is_oak else mat_pine_a, mat_bark_moss, tp.x * 0.73 + tp.z * 1.13 + float(ob_idx) * 1.7)
				_tree_spots.append(Vector2(tp.x, tp.z))
				_outer_perimeter_trees.append(tp)
				if int(ob["row"]) <= 12:
					_env_kit.spawn_fern_clump(_grp_vegetation, tp + Vector3(0.65, 0.0, 0.55), 0.78, mat_fern, tp.x, 2)
				ob_idx += 1

	# Paso 23.4, 23.6, 23.7: Irregular clustered outer perimeter canopy (varied distances, grove pairs & open glade gaps!)
	for i in range(28):
		# Leave natural breathing gaps on select glade directions (i == 5, 13, 22) so the perimeter never reads as an even ring
		if i in [5, 13, 22]:
			continue
		var a := float(i) * TAU / 28.0 + sin(float(i) * 1.9) * 0.18 + cos(float(i) * 3.1) * 0.08
		var rx := width_m * 0.63 + sin(a * 3.0) * 3.6 + cos(float(i) * 2.1) * 1.6
		var rz := depth_m * 0.61 + cos(a * 2.0) * 3.2 + sin(float(i) * 1.7) * 1.4
		var wp := Vector3(width_m * 0.5 + cos(a) * rx, 0.0, depth_m * 0.5 + sin(a) * rz)
		if wp.z > depth_m * 0.58 and absf(wp.x - width_m * 0.5) < 12.5:
			_env_kit.spawn_fern_clump(_grp_vegetation, wp, 0.98, mat_fern, a, 2)
			if i % 3 == 0:
				_env_kit.spawn_rock(_grp_env_geo, wp + Vector3(0.6, 0.06, 0.2), Vector3(0.92, 0.44, 0.85), a * 2.0, mat_moss_rock, i, "craggy")
			continue
		var trail_margin_p := 2.45 + 1.45 * (0.5 + 0.5 * sin(wp.z * 0.23 + float(i)))
		if _river_distance(Vector2(wp.x, wp.z)) < _river_half_width(wp.z) + 1.8 or _forest_trail_dist(wp.x, wp.z) < trail_margin_p:
			continue
		wp.y = maxf(0.0, _eval_skirt_height("forest", wp.x, wp.z, width_m, depth_m) + 0.02)
		_tree_spots.append(Vector2(wp.x, wp.z))
		_outer_perimeter_trees.append(wp)
		var is_broad := (i % 3 == 0) or (i % 7 == 0)
		var tscale := 0.78 + fmod(float(i) * 0.27, 0.62)
		_env_kit.build_organic_tree(_grp_vegetation, "oak" if is_broad else "pine", wp, tscale, mat_trunk, mat_oak if is_broad else (mat_pine_a if i % 2 == 0 else mat_pine_b), mat_bark_moss, float(i) * 1.73 + 0.4)

	# Localized undergrowth clusters near roots & mossy clearing edges (non-uniform!)
	var bush_clusters := [
		Vector2(9.2, 13.5), Vector2(10.5, 22.8), Vector2(23.8, 12.6), Vector2(26.5, 19.5),
		Vector2(25.2, 8.8), Vector2(13.8, 7.6), Vector2(19.6, 5.4), Vector2(7.8, 18.2),
	]
	for c_i in range(bush_clusters.size()):
		var cp: Vector2 = bush_clusters[c_i]
		_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(cp.x, 0.0, cp.y), 0.78 + float(c_i % 3) * 0.14, mat_fern, float(c_i) * 1.9, 2)

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

	# Much richer woodland: more tree species, bushes, ferns, flowers and mushrooms (MultiMesh batched)
	_build_forest_flora_expansion(scene_def, width_m, depth_m, mat_trunk, mat_pine_a, mat_pine_b, mat_oak)

	# Moss cushions & flowering berry shrubs framing the clearing perimeter
	for mb_i in range(4):
		var mp: Vector2 = [Vector2(8.8, 13.0), Vector2(24.8, 15.2), Vector2(10.8, 22.4), Vector2(23.8, 12.1)][mb_i]
		_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(mp.x, 0.0, mp.y), Color("#466e3c"), 1.05, float(mb_i) * 1.4)
		_env_kit.spawn_woodland_shrub(_grp_vegetation, Vector3(mp.x + 0.55, 0.0, mp.y - 0.35), mat_oak, Color("#c93838") if mb_i % 2 == 0 else Color("#4b589e"), float(mb_i) * 2.1)

	# Helper: anchor woodland animal entry/exit inside lush fern & shrub cover thickets (zero open-field pop-ins!)
	var _add_spawn_cover := func(wp: Vector3, seed_ang: float) -> void:
		var gy_c := eval_ground_height(wp.x, wp.z)
		if gy_c < -0.05 or _forest_trail_dist(wp.x, wp.z) < 2.2:
			return
		var cover_pos := Vector3(wp.x, gy_c, wp.z)
		_env_kit.spawn_fern_clump(_grp_vegetation, cover_pos, 1.05, mat_fern, seed_ang, 3)
		for k_sh in range(2):
			var sa := seed_ang + float(k_sh) * 2.1 - 0.8
			var off_sh := Vector3(cos(sa) * 0.72, 0.0, sin(sa) * 0.72)
			var sh_y := eval_ground_height(wp.x + off_sh.x, wp.z + off_sh.z)
			if sh_y >= -0.04:
				_env_kit.spawn_woodland_shrub(_grp_vegetation, Vector3(wp.x + off_sh.x, sh_y, wp.z + off_sh.z), mat_oak, Color("#734538") if k_sh == 0 else Color("#4a5e78"), sa)

	# Helper: clamp ground patrol waypoints precisely to terrain elevation & wrap entry/exit in brush cover
	var _clamp_wp := func(raw_pts: Array, cover_seed: float) -> Array:
		var out_pts: Array = []
		for rp_v: Vector3 in raw_pts:
			out_pts.append(Vector3(rp_v.x, eval_ground_height(rp_v.x, rp_v.z), rp_v.z))
		if out_pts.size() >= 2:
			_add_spawn_cover.call(out_pts[0], cover_seed)
			_add_spawn_cover.call(out_pts[out_pts.size() - 1], cover_seed + 1.8)
		return out_pts

	# Natural realistic woodland fauna: deer/stag/fox/rabbits enter from dense outer thickets & flee cleanly into cover!
	var rx_n := _river_center_x(10.0)
	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-deer-908.glb", "ForestDeer", 0.44, _clamp_wp.call([
		Vector3(-27.5, 0.0, 4.0), Vector3(-20.0, 0.0, 6.2),
		Vector3(-14.8, 0.0, 8.2), Vector3(-19.5, 0.0, 11.2),
		Vector3(-28.5, 0.0, 9.0),
	], 0.4), 34.0, 0.0)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["storm"], 165.0, 0.28, 10.0, true, 9.0)

	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-stag-1373.glb", "ForestStag", 0.42, _clamp_wp.call([
		Vector3(width_m + 26.5, 0.0, 6.5), Vector3(width_m + 15.5, 0.0, 11.5),
		Vector3(width_m + 11.0, 0.0, 15.5), Vector3(width_m + 16.0, 0.0, 21.5),
		Vector3(width_m + 27.5, 0.0, 26.0),
	], 1.2), 36.0, 0.0)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "night"], ["storm"], 175.0, 0.28, 18.0, true, 9.5)

	FaunaKit.spawn_fox(_grp_vegetation, fauna_agents, "ForestFox", _clamp_wp.call([
		Vector3(-19.5, 0.0, -25.5), Vector3(-10.5, 0.0, -16.8),
		Vector3(-4.2, 0.0, -14.8), Vector3(-11.2, 0.0, -20.5),
		Vector3(-20.5, 0.0, -27.5),
	], 2.1), 30.0, 0.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 112.0, 0.34, 8.0, true, 8.0)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_0", _clamp_wp.call([
		Vector3(-18.5, 0.0, 6.0), Vector3(-12.2, 0.0, 7.6),
		Vector3(-10.5, 0.0, 9.2), Vector3(-13.0, 0.0, 10.4),
		Vector3(-19.0, 0.0, 8.0),
	], 3.0), 22.0, 0.6, Color("#7a5c44"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 92.0, 0.34, 4.0, true, 6.5)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_1", _clamp_wp.call([
		Vector3(width_m + 18.5, 0.0, 9.5), Vector3(width_m + 12.2, 0.0, 11.2),
		Vector3(width_m + 10.5, 0.0, 12.6), Vector3(width_m + 12.8, 0.0, 14.0),
		Vector3(width_m + 19.0, 0.0, 11.8),
	], 4.2), 24.0, 1.1, Color("#614b3a"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk"], ["rain", "storm", "snow"], 98.0, 0.34, 14.0, true, 6.5)

	if _river_pts.size() >= 2:
		var trout_ns_pts := func(lat_bias: float, y_lvl: float, reverse: bool) -> Array:
			var pts_out: Array = []
			var z_a := -46.0
			var z_b := depth_m + 42.0
			var step_z := 2.5
			var z_cur := z_b if reverse else z_a
			while (z_cur >= z_a - 0.01) if reverse else (z_cur <= z_b + 0.01):
				var cx_r := _river_center_x(z_cur)
				var max_l := maxf(0.22, _river_half_width(z_cur) - 0.56)
				var wiggle := clampf(lat_bias + sin(z_cur * 0.28 + lat_bias * 4.0) * 0.35, -max_l, max_l)
				pts_out.append(Vector3(cx_r + wiggle, y_lvl, z_cur))
				z_cur += (-step_z) if reverse else step_z
			return pts_out
		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_0", trout_ns_pts.call(0.18, 0.016, false), 26.0, 0.4, Color("#668b72"), "swim_fish", 1.38)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 68.0, 0.36, 18.0, false, 0.0)
		fauna_agents.back()["clamp_to_river"] = true

		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_1", trout_ns_pts.call(-0.18, 0.016, true), 28.0, 1.8, Color("#567966"), "swim_fish", 1.32)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 72.0, 0.34, 42.0, false, 0.0)
		fauna_agents.back()["clamp_to_river"] = true

		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_2", trout_ns_pts.call(0.0, 0.018, false), 24.0, 0.18, Color("#72997d"), "swim_ocean_jump", 1.42)
		FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm"], 74.0, 0.34, 30.0, false, 0.0)
		fauna_agents.back()["clamp_to_river"] = true

		# Regional upstream & downstream trout shoals spanning the entire river valley
		var trout_sub_pts := func(z_from: float, z_to: float, lat_off: float, reverse: bool) -> Array:
			var sub_out: Array = []
			var z_c := z_to if reverse else z_from
			while (z_c >= z_from - 0.01) if reverse else (z_c <= z_to + 0.01):
				var cx_s := _river_center_x(z_c)
				var max_s := maxf(0.20, _river_half_width(z_c) - 0.56)
				sub_out.append(Vector3(cx_s + clampf(lat_off + sin(z_c * 0.31) * 0.32, -max_s, max_s), 0.016, z_c))
				z_c += (-2.2) if reverse else 2.2
			return sub_out
		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_North", trout_sub_pts.call(-56.0, -10.0, -0.15, false), 22.0, 1.1, Color("#5f836c"), "swim_fish", 1.26)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 66.0, 0.38, 6.0, false, 0.0)
		fauna_agents.back()["clamp_to_river"] = true

		FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "StreamTrout_South", trout_sub_pts.call(24.0, depth_m + 34.0, 0.16, true), 23.0, 2.3, Color("#6b9176"), "swim_fish", 1.30)
		FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], [], 70.0, 0.38, 22.0, false, 0.0)
		fauna_agents.back()["clamp_to_river"] = true

	# Regional woodland mammals across North, South, West & East forest sectors (cover-wrapped off-camera entry/exit)
	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-deer-908.glb", "ForestDeer_North", 0.42, _clamp_wp.call([
		Vector3(-23.0, 0.0, -34.0), Vector3(-13.5, 0.0, -28.0),
		Vector3(-8.5, 0.0, -22.0), Vector3(-14.5, 0.0, -31.0),
		Vector3(-24.5, 0.0, -39.0),
	], 5.1), 35.0, 1.4)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 172.0, 0.32, 6.0, true, 9.0)

	_spawn_fauna_actor("res://assets/fauna/quaternius_cc0-deer-908.glb", "ForestDoe_South", 0.40, _clamp_wp.call([
		Vector3(48.0, 0.0, 42.0), Vector3(36.0, 0.0, 38.0),
		Vector3(29.5, 0.0, 34.5), Vector3(35.5, 0.0, 44.0),
		Vector3(50.0, 0.0, 47.0),
	], 6.4), 37.0, 2.7)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 180.0, 0.32, 24.0, true, 9.0)

	FaunaKit.spawn_fox(_grp_vegetation, fauna_agents, "ForestFox_South", _clamp_wp.call([
		Vector3(-22.0, 0.0, 42.0), Vector3(-11.0, 0.0, 35.0),
		Vector3(-3.0, 0.0, 30.0), Vector3(-9.0, 0.0, 40.0),
		Vector3(-21.0, 0.0, 46.0),
	], 7.3), 31.0, 1.9)
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn", "day"], ["storm"], 118.0, 0.36, 12.0, true, 8.0)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_NW", _clamp_wp.call([
		Vector3(-25.0, 0.0, -18.0), Vector3(-15.0, 0.0, -14.0),
		Vector3(-12.0, 0.0, -16.5), Vector3(-17.0, 0.0, -21.0),
		Vector3(-26.0, 0.0, -20.0),
	], 8.2), 23.0, 0.4, Color("#735740"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 96.0, 0.36, 8.0, true, 6.5)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_SW", _clamp_wp.call([
		Vector3(-18.0, 0.0, 36.0), Vector3(-8.5, 0.0, 31.0),
		Vector3(-5.5, 0.0, 33.5), Vector3(-10.0, 0.0, 37.0),
		Vector3(-19.0, 0.0, 39.0),
	], 9.4), 24.0, 2.2, Color("#664e3b"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 98.0, 0.36, 18.0, true, 6.5)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_NE", _clamp_wp.call([
		Vector3(width_m + 18.0, 0.0, -24.0), Vector3(width_m + 7.5, 0.0, -18.0),
		Vector3(width_m + 4.0, 0.0, -15.0), Vector3(width_m + 8.5, 0.0, -21.0),
		Vector3(width_m + 19.0, 0.0, -27.0),
	], 10.1), 25.0, 1.5, Color("#7d6149"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 94.0, 0.36, 26.0, true, 6.5)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "ForestRabbit_SE", _clamp_wp.call([
		Vector3(width_m + 16.0, 0.0, 34.0), Vector3(width_m + 6.0, 0.0, 31.0),
		Vector3(width_m + 3.0, 0.0, 34.0), Vector3(width_m + 7.5, 0.0, 38.0),
		Vector3(width_m + 17.5, 0.0, 37.0),
	], 11.2), 24.0, 0.9, Color("#5f4a39"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 100.0, 0.36, 36.0, true, 6.5)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedRobin", Vector3(24.6, 0.52, 15.8), -2.2, Color("#6e5344"), Color("#c96b38"), 0.88, 0.9)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 42.0, 0.44, 2.0, false, 3.6)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedJay", Vector3(rx_n + 1.4, 0.34, 11.2), 1.4, Color("#4f74a8"), Color("#2c384e"), 0.92, 2.7)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 48.0, 0.42, 24.0, false, 3.6)

	# Paso 17.4: Additional forest birds perched high on actual tree branches framing the camp clearing
	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedThrush", Vector3(12.9, 2.38, 10.9), 0.75, Color("#73563e"), Color("#d6b482"), 0.86, 1.8)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 45.0, 0.46, 11.0, false, 3.8)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "ForestPerchedFinch", Vector3(23.8, 2.52, 11.7), -1.15, Color("#566e3d"), Color("#d8a63c"), 0.82, 3.2)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 52.0, 0.44, 18.0, false, 3.8)

	# Regional perched woodland birds anchored cleanly on physical stumps & mossy perch boulders (never floating or trapped!)
	var rx_sw := _river_center_x(32.0)
	var perched_specs: Array[Dictionary] = [
		{"name": "ForestPerchedWren_NW", "xz": Vector2(-14.0, -20.0), "stump": true,  "yaw": 0.9,  "body": Color("#6d523d"), "wing": Color("#9c7858"), "sc": 0.84, "ph": 0.5, "off": 6.0},
		{"name": "ForestPerchedThrush_N", "xz": Vector2(24.0, -28.0), "stump": true,  "yaw": -1.4, "body": Color("#755840"), "wing": Color("#d4b180"), "sc": 0.88, "ph": 1.6, "off": 15.0},
		{"name": "ForestPerchedFinch_W", "xz": Vector2(-11.5, 16.5),  "stump": false, "yaw": 1.8,  "body": Color("#556d3d"), "wing": Color("#d8a43b"), "sc": 0.82, "ph": 2.4, "off": 24.0},
		{"name": "ForestPerchedJay_SW",  "xz": Vector2(rx_sw - 2.6, 32.0), "stump": false, "yaw": 0.4, "body": Color("#4d72a6"), "wing": Color("#2a364c"), "sc": 0.90, "ph": 3.1, "off": 9.0},
		{"name": "ForestPerchedRobin_S", "xz": Vector2(26.5, 38.0),   "stump": true,  "yaw": -2.1, "body": Color("#6e5344"), "wing": Color("#cb6c3a"), "sc": 0.86, "ph": 1.2, "off": 29.0},
		{"name": "ForestPerchedFinch_E", "xz": Vector2(42.0, 10.0),   "stump": false, "yaw": -0.8, "body": Color("#5c7442"), "wing": Color("#dec056"), "sc": 0.84, "ph": 2.9, "off": 36.0},
	]
	for p_idx in range(perched_specs.size()):
		var pspec: Dictionary = perched_specs[p_idx]
		var pxz: Vector2 = pspec["xz"]
		var p_gy := eval_ground_height(pxz.x, pxz.y)
		var perch_top_y := p_gy + 0.52
		if bool(pspec["stump"]):
			var pst := MeshInstance3D.new()
			pst.name = "BirdPerchStump_%d" % p_idx
			var psm := CylinderMesh.new(); psm.top_radius = 0.24; psm.bottom_radius = 0.36; psm.height = 0.54; psm.radial_segments = 8
			pst.mesh = psm; pst.material_override = mat_trunk
			pst.position = Vector3(pxz.x, p_gy + 0.24, pxz.y)
			_grp_env_geo.add_child(pst)
			_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(pxz.x - 0.18, p_gy + 0.25, pxz.y + 0.08), float(p_idx) * 1.3)
		else:
			_env_kit.spawn_rock(_grp_env_geo, Vector3(pxz.x, p_gy + 0.18, pxz.y), Vector3(0.68, 0.42, 0.62), float(p_idx) * 1.1, mat_moss_rock, p_idx + 2, "rounded")
			perch_top_y = p_gy + 0.38
		FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, str(pspec["name"]), Vector3(pxz.x, perch_top_y, pxz.y), float(pspec["yaw"]), pspec["body"], pspec["wing"], float(pspec["sc"]), float(pspec["ph"]))
		FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["rain", "storm", "snow"], 48.0, 0.48, float(pspec["off"]), false, 3.8)

	FaunaKit.spawn_butterflies(_grp_vegetation, fauna_agents, "ForestButterflyA", Vector3(10.2, 0.0, 21.8), 3, 1.1)
	FaunaKit.spawn_butterflies(_grp_vegetation, fauna_agents, "ForestButterflyB", Vector3(23.4, 0.0, 13.0), 3, 3.4)
	var rx_mid := _river_center_x(4.0)
	var rx_up := _river_center_x(-22.0)
	var bfly_spots: Array[Dictionary] = [
		{"name": "ForestButterfly_WBank", "pos": Vector3(rx_mid - 2.8, eval_ground_height(rx_mid - 2.8, 4.0), 4.0), "ph": 0.7},
		{"name": "ForestButterfly_WestGlade", "pos": Vector3(-15.0, eval_ground_height(-15.0, 12.0), 12.0), "ph": 2.1},
		{"name": "ForestButterfly_NorthTrail", "pos": Vector3(22.0, eval_ground_height(22.0, -30.0), -30.0), "ph": 3.5},
		{"name": "ForestButterfly_NorthCreek", "pos": Vector3(rx_up + 2.5, eval_ground_height(rx_up + 2.5, -22.0), -22.0), "ph": 1.6},
		{"name": "ForestButterfly_SouthTrail", "pos": Vector3(28.0, eval_ground_height(28.0, 39.0), 39.0), "ph": 4.2},
		{"name": "ForestButterfly_EastGrove", "pos": Vector3(41.0, eval_ground_height(41.0, -4.0), -4.0), "ph": 2.8},
	]
	for bsp: Dictionary in bfly_spots:
		FaunaKit.spawn_butterflies(_grp_vegetation, fauna_agents, str(bsp["name"]), bsp["pos"], 3, float(bsp["ph"]))
	sync_wildlife()

# ------------------------------------------------------------------------------
# Forest river: centreline, valley carving and animated ribbon (FASE 1 Pasos 2-5)
# ------------------------------------------------------------------------------
func _prepare_forest_river(depth_m: float) -> void:
	_river_pts.clear()
	_river_depth_m = depth_m
	var raw: Array = Structure.get_forest_stream().get("samples", [])
	if raw.size() < 2:
		return
	var x0 := float(raw[0]["x"]); var z0 := float(raw[0]["z"])
	# Upstream: descends from the northern hills, meandering west then back (to skirt edge)
	var z := -88.0
	while z < z0 - 0.01:
		var dz := z0 - z
		var ramp := clampf(dz / 14.0, 0.0, 1.0)
		_river_pts.append(Vector2(x0 - sin(dz * 0.075) * 4.2 * ramp - dz * 0.035 * ramp, z))
		z += 1.25
	# Canonical in-map course (exact water cells preserved, finer subdivision along bends)
	for s_i in range(raw.size() - 1):
		var pa: Dictionary = raw[s_i]; var pb: Dictionary = raw[s_i + 1]
		for sub in range(4):
			var tf := float(sub) / 4.0
			_river_pts.append(Vector2(lerpf(float(pa["x"]), float(pb["x"]), tf), lerpf(float(pa["z"]), float(pb["z"]), tf)))
	var last: Dictionary = raw[raw.size() - 1]
	var xl := float(last["x"]); var zl := float(last["z"])
	_river_pts.append(Vector2(xl, zl))
	# Downstream: widening meander away south towards Pleamar
	z = zl + 1.25
	while z <= depth_m + 74.0:
		var ds := z - zl
		var ramp2 := clampf(ds / 12.0, 0.0, 1.0)
		_river_pts.append(Vector2(xl + sin(ds * 0.065) * 5.0 * ramp2 + ds * 0.06 * ramp2, z))
		z += 1.25
	# Smooth off-map bends thoroughly + micro-round in-map bend vertices (<0.09m) for seamless curves
	for pass_idx in range(4):
		for i in range(1, _river_pts.size() - 1):
			var pz := _river_pts[i].y
			var avg_x := (_river_pts[i - 1].x + _river_pts[i].x * 2.0 + _river_pts[i + 1].x) * 0.25
			if pz < -0.5 or pz > depth_m + 0.5:
				var sv := _river_pts[i]
				sv.x = avg_x
				_river_pts[i] = sv
			elif pass_idx < 2 and absf(pz - 17.0) > 1.8:
				var sv2 := _river_pts[i]
				sv2.x = lerpf(sv2.x, avg_x, 0.42)
				_river_pts[i] = sv2

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
	# Organic width undulations (slight narrows near bridge & riffles, wider quiet pools downstream)
	var hw := 1.94 + sin(z * 0.34) * 0.30 + cos(z * 0.67 + 0.8) * 0.14
	var bridge_pinch := exp(-pow((z - 17.0) / 3.4, 2.0)) * 0.16
	hw -= bridge_pinch
	hw += clampf((z - _river_depth_m) / 60.0, 0.0, 1.0) * 0.58
	hw -= clampf(-z / 48.0, 0.0, 1.0) * 0.52
	return maxf(1.32, hw)

func _river_distance(p: Vector2) -> float:
	if _river_pts.is_empty():
		return 99999.0
	return absf(p.x - _river_center_x(p.y))

func _carve_river_valley(px: float, pz: float, h: float) -> float:
	if _river_pts.is_empty():
		return h
	var floor_h := -0.27
	if h <= floor_h:
		return h
	var cx := _river_center_x(pz)
	var d := absf(px - cx)
	var side_sign := 1.0 if px >= cx else -1.0
	var hw := _river_half_width(pz)
	# Vary bank slope naturally between steeper outer bends and gentler inner sediment margins
	var slope_var := 1.0 + sin(pz * 0.23 + side_sign * 1.15) * 0.36 + cos(pz * 0.51) * 0.14
	var bank_span := clampf(2.6 * slope_var, 1.45, 4.4)
	var edge_jitter := sin(pz * 0.62 + px * 0.45) * 0.24
	var t := smoothstep(hw * 0.78 + edge_jitter, hw + bank_span + edge_jitter, d)
	return lerpf(floor_h, h, t)

func _build_forest_river_ribbon(mat_bed: Material, mat_moss_rock: Material, mat_fern: Material, mat_plank: Material) -> void:
	var n := _river_pts.size()
	var across := 10
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
		var pz := _river_pts[i].y
		var hw := _river_half_width(pz)
		# Gentle natural downstream water grade (imperceptible micro-slope, zero abrupt drops!)
		var water_grade := clampf((17.0 - pz) * 0.00045, -0.018, 0.018)
		var row: Array[Vector3] = []
		for k in range(across + 1):
			var u := float(k) / float(across)
			var off := (u * 2.0 - 1.0) * (hw + 0.22)
			var p2 := _river_pts[i] + nrm * off
			# Soft convex water surface crown tapering smoothly beneath wet earth margins
			var edge_dip := lerpf(-0.042, 0.022, sin(u * PI)) + water_grade
			row.append(Vector3(p2.x, edge_dip, p2.y))
		rows.append(row)
		var b_row: Array[Vector3] = []
		var pool_depth := -0.225 - sin(pz * 0.29) * 0.028
		for bk in range(7):
			var bu := float(bk) / 6.0
			var bp := _river_pts[i] + nrm * ((bu * 2.0 - 1.0) * (hw + 0.62))
			var by := lerpf(-0.07, pool_depth, sin(bu * PI))
			b_row.append(Vector3(bp.x, by, bp.y))
		bed_rows.append(b_row)
	river_length_m = dist

	for i in range(n - 1):
		var r0: Array = rows[i]; var r1: Array = rows[i + 1]
		var v0 := dists[i] * 0.58; var v1 := dists[i + 1] * 0.58
		for k in range(across):
			var u0 := float(k) / float(across); var u1 := float(k + 1) / float(across)
			var quad := [[r0[k], Vector2(u0, v0)], [r0[k + 1], Vector2(u1, v0)], [r1[k + 1], Vector2(u1, v1)], [r1[k], Vector2(u0, v1)]]
			for idx in [0, 1, 2, 0, 2, 3]:
				st.set_normal(Vector3.UP)
				st.set_uv(quad[idx][1])
				st.add_vertex(quad[idx][0])
		var br0: Array = bed_rows[i]; var br1: Array = bed_rows[i + 1]
		for bk in range(6):
			_emit_quad(st_bed, br0[bk], br0[bk + 1], br1[bk + 1], br1[bk])

	st_bed.generate_normals()
	var sbed := MeshInstance3D.new(); sbed.name = "ForestStreamBed"
	sbed.mesh = st_bed.commit(); sbed.material_override = mat_bed
	sbed.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_grp_terrain.add_child(sbed)
	sbed.create_trimesh_collision()

	st.generate_normals()
	st.generate_tangents()
	var smesh := MeshInstance3D.new(); smesh.name = "ForestOrganicStream"
	smesh.mesh = st.commit()
	var smat := MatKit.create_river_shader_material(Color(0.055, 0.19, 0.22, 0.82), Color(0.14, 0.31, 0.28, 0.34), Color("#ddece8"), 1.25, 0.011, true)
	smat.set_meta("river_flow", true)
	_river_mats.append(smat)
	_stream_shader_mats.append(smat)
	smesh.material_override = smat
	smesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	smesh.set_meta("river_length_m", river_length_m)
	_grp_terrain.add_child(smesh)

	# Submerged & half-emergent rounded stream boulders casting natural non-repeating V-wakes (10 wake points)
	var bz := 17.0
	var bx := _river_center_x(bz)
	var b_hw := _river_half_width(bz)
	var wake_list: Array[Vector4] = [
		Vector4(bx - b_hw * 0.72, bz, 0.64, 0.72),
		Vector4(bx + b_hw * 0.72, bz, 0.64, 0.72),
	]
	var mat_wet_cobble := MatKit.make_textured_mat("basalt-coastal-albedo-v1.webp", Color("#4e5a52"), 0.28, "rock", Vector3(0.65, 0.65, 0.65), true, true)
	var stream_rocks := [2.8, 7.6, 10.6, 13.9, 20.4, 24.8, 29.5, 36.2]
	for sr_i in range(stream_rocks.size()):
		var rz := float(stream_rocks[sr_i])
		var lat_off := (-0.64 if sr_i % 3 == 0 else (0.58 if sr_i % 3 == 1 else -0.22))
		var rx := _river_center_x(rz) + lat_off
		var s_sc := 0.58 + fmod(float(sr_i) * 0.19, 0.24)
		_env_kit.spawn_rock(_grp_env_geo, Vector3(rx, -0.055, rz), Vector3(s_sc * 1.08, s_sc * 0.52, s_sc * 0.92), float(sr_i) * 1.4, mat_wet_cobble, sr_i, "rounded")
		_env_kit.spawn_rock(_grp_env_geo, Vector3(rx + 0.34 * (1.0 if sr_i % 2 == 0 else -1.0), -0.11, rz + 0.32), Vector3(s_sc * 0.65, s_sc * 0.34, s_sc * 0.58), float(sr_i) * 2.1, mat_wet_cobble, sr_i + 2, "rounded")
		wake_list.append(Vector4(rx, rz, 0.54 + s_sc * 0.22, 0.85))
	while wake_list.size() < 10:
		wake_list.append(Vector4.ZERO)
	smat.set_shader_parameter("wake_pts", wake_list)

	# Organic irregular bank clusters: partially buried rounded cobbles, exposed roots, lush ferns & reeds (never uniform rows, clear of bridge!)
	var bank_rng := RandomNumberGenerator.new()
	bank_rng.seed = 20261122
	var mat_root_bark := MatKit.make_wood_mat(Color("#4c3928"), true)
	var root_proto := _env_kit.get_twig_debris_proto("root")
	var next_rock := 0.8; var next_reed := 1.4; var next_fern := 1.9; var next_root := 4.5
	for i in range(n):
		var d_i := dists[i]
		var p := _river_pts[i]
		if absf(p.y - bz) < 2.65:
			continue
		var tan_i := (_river_pts[mini(n - 1, i + 1)] - _river_pts[maxi(0, i - 1)]).normalized()
		var nrm_i := Vector2(tan_i.y, -tan_i.x)
		if nrm_i.x < 0.0:
			nrm_i = -nrm_i
		var hw2 := _river_half_width(p.y)
		if d_i >= next_rock:
			next_rock = d_i + bank_rng.randf_range(2.6, 5.4)
			var r_side := -1.0 if bank_rng.randf() < 0.5 else 1.0
			var cluster_n := bank_rng.randi_range(2, 4)
			for ci in range(cluster_n):
				var off_d := bank_rng.randf_range(-0.42, 0.52)
				var along_d := bank_rng.randf_range(-0.75, 0.75)
				var rp2 := p + nrm_i * (r_side * (hw2 + 0.08 + off_d)) + tan_i * along_d
				var ry_rock := _carve_river_valley(rp2.x, rp2.y, 0.0)
				var r_sc := bank_rng.randf_range(0.32, 0.76) * (1.0 if ci == 0 else 0.72)
				_env_kit.spawn_rock(_grp_env_geo, Vector3(rp2.x, ry_rock - 0.02 + r_sc * 0.12, rp2.y), Vector3(r_sc * 1.15, r_sc * 0.44, r_sc * 0.96), bank_rng.randf() * TAU, mat_moss_rock if ci % 2 == 0 else mat_wet_cobble, i + ci, "rounded")
		if d_i >= next_reed and p.y > -24.0 and p.y < _river_depth_m + 24.0:
			next_reed = d_i + bank_rng.randf_range(2.4, 5.2)
			var s2 := -1.0 if bank_rng.randf() < 0.5 else 1.0
			var reed_cnt := bank_rng.randi_range(1, 2)
			for ri2 in range(reed_cnt):
				var rdp := p + nrm_i * (s2 * (hw2 + bank_rng.randf_range(0.24, 0.62))) + tan_i * bank_rng.randf_range(-0.6, 0.6)
				var bank_y := maxf(-0.06, _carve_river_valley(rdp.x, rdp.y, 0.0))
				_env_kit.spawn_reed_cluster(_grp_vegetation, Vector3(rdp.x, bank_y, rdp.y), mat_fern, bank_rng.randf() * 10.0, (i + ri2) % 3 == 0)
		if d_i >= next_fern and p.y > -26.0 and p.y < _river_depth_m + 26.0:
			next_fern = d_i + bank_rng.randf_range(2.2, 4.8)
			var f_side := -1.0 if bank_rng.randf() < 0.5 else 1.0
			var fp2 := p + nrm_i * (f_side * (hw2 + bank_rng.randf_range(0.68, 1.38)))
			var fy := maxf(-0.04, _carve_river_valley(fp2.x, fp2.y, 0.0))
			_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(fp2.x, fy, fp2.y), bank_rng.randf_range(0.72, 1.06), mat_fern, bank_rng.randf() * 10.0, bank_rng.randi_range(2, 3))
		if d_i >= next_root and p.y > -12.0 and p.y < _river_depth_m + 14.0:
			next_root = d_i + bank_rng.randf_range(5.5, 9.5)
			var rt_side := -1.0 if bank_rng.randf() < 0.5 else 1.0
			var rtp := p + nrm_i * (rt_side * (hw2 + bank_rng.randf_range(0.75, 1.45)))
			var rty := _carve_river_valley(rtp.x, rtp.y, 0.0)
			var r_mi := MeshInstance3D.new()
			r_mi.mesh = root_proto
			r_mi.material_override = mat_root_bark
			r_mi.position = Vector3(rtp.x, rty + 0.02, rtp.y)
			r_mi.rotation = Vector3(0.0, atan2(-rt_side * nrm_i.y, -rt_side * nrm_i.x) + bank_rng.randf_range(-0.35, 0.35), rt_side * 0.16)
			r_mi.scale = Vector3.ONE * bank_rng.randf_range(0.85, 1.32)
			r_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			_grp_vegetation.add_child(r_mi)

	# Handcrafted rustic timber footbridge anchored with stone/earth abutments on both banks
	var span_w := _river_half_width(bz) * 2.0 + 1.65
	_build_wooden_footbridge(Vector3(bx, 0.06, bz), span_w, mat_plank, mat_moss_rock)

func _build_wooden_footbridge(pos: Vector3, span_w: float, mat_plank: Material, mat_stone: Material = null) -> void:
	var bridge := Node3D.new()
	bridge.name = "StreamFootbridge"
	bridge.position = pos
	_grp_structures.add_child(bridge)
	var mat_post := MatKit.make_wood_mat(Color("#543d2b"), true)
	var mat_wet_post := MatKit.make_wood_mat(Color("#362b21"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#a7936c"), true, true)
	var mat_abut := mat_stone if mat_stone else MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#646f61"), 0.88, "rock", Vector3(0.45, 0.45, 0.45), true, true)
	var mat_earth_apron := MatKit.make_textured_mat("path.jpg", Color("#705c45"), 0.88, "rock", Vector3(0.55, 0.55, 0.55), true, true)
	var st_deck := SurfaceTool.new(); st_deck.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_deck_pale := SurfaceTool.new(); st_deck_pale.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_deck_moss := SurfaceTool.new(); st_deck_moss.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_beam := SurfaceTool.new(); st_beam.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_wet := SurfaceTool.new(); st_wet.begin(Mesh.PRIMITIVE_TRIANGLES)
	var st_rope := SurfaceTool.new(); st_rope.begin(Mesh.PRIMITIVE_TRIANGLES)

	var deck_w := 1.72
	var half_span := span_w * 0.5
	var abutment_x := half_span - 0.36

	# West & East mossy stone abutments + sloped earth/cobble approach aprons seamlessly meeting banks
	for end_s: float in [-1.0, 1.0]:
		var ax: float = end_s * (abutment_x + 0.14)
		_env_kit.spawn_rock(bridge, Vector3(ax, -0.05, -0.84), Vector3(1.18, 0.46, 0.74), end_s * 0.35, mat_abut, 0 if end_s < 0 else 2, "flat")
		_env_kit.spawn_rock(bridge, Vector3(ax, -0.05, 0.84), Vector3(1.18, 0.46, 0.74), -end_s * 0.3, mat_abut, 1 if end_s < 0 else 3, "flat")
		_env_kit.spawn_rock(bridge, Vector3(end_s * (half_span + 0.18), -0.07, 0.0), Vector3(1.22, 0.24, 1.68), 0.0, mat_abut, 4, "flat")
		# Natural flat stepping stones embedded flush into curved dirt bank threshold (zero boxy slab!)
		_env_kit.spawn_rock(bridge, Vector3(end_s * (half_span + 0.56), -0.09, -0.34), Vector3(0.68, 0.16, 0.58), end_s * 0.4, mat_earth_apron, 1, "flat")
		_env_kit.spawn_rock(bridge, Vector3(end_s * (half_span + 0.52), -0.09, 0.34), Vector3(0.64, 0.16, 0.56), -end_s * 0.35, mat_abut, 3, "flat")
		# Horizontal timber mudsill embedded across bank abutment
		var sill := BoxMesh.new(); sill.size = Vector3(0.24, 0.22, deck_w + 0.12)
		st_wet.append_from(sill, 0, Transform3D(Basis.IDENTITY, Vector3(end_s * abutment_x, -0.04, 0.0)))

	# Arched heavy side stringer beams, 3 under-cross-bearers, and low rustic log curb rails along deck edges
	for sz: float in [-0.64, 0.64]:
		var segs := 4
		for s_i in range(segs):
			var xa := lerpf(-abutment_x - 0.15, abutment_x + 0.15, float(s_i) / float(segs))
			var xb := lerpf(-abutment_x - 0.15, abutment_x + 0.15, float(s_i + 1) / float(segs))
			var ya := sin((float(s_i) / float(segs)) * PI) * 0.11 + 0.01
			var yb := sin((float(s_i + 1) / float(segs)) * PI) * 0.11 + 0.01
			var dx := xb - xa; var dy := yb - ya
			var len_s := sqrt(dx * dx + dy * dy) + 0.04
			var pitch := atan2(dy, dx)
			var bm := BoxMesh.new(); bm.size = Vector3(len_s, 0.16, 0.18)
			st_beam.append_from(bm, 0, Transform3D(Basis.from_euler(Vector3(0.0, 0.0, pitch)), Vector3((xa + xb) * 0.5, (ya + yb) * 0.5, sz)))
			# Low rustic curb beam along deck outer edge (gives crisp bridge silhouette without hiding sprites)
			var curb_z := 0.80 if sz > 0.0 else -0.80
			var cm_curb := BoxMesh.new(); cm_curb.size = Vector3(len_s, 0.085, 0.11)
			st_beam.append_from(cm_curb, 0, Transform3D(Basis.from_euler(Vector3(0.0, 0.0, pitch)), Vector3((xa + xb) * 0.5, (ya + yb) * 0.5 + 0.145, curb_z)))
	for cb_f: float in [-0.36, 0.0, 0.36]:
		var cbx: float = cb_f * span_w
		var cby: float = cos(cb_f * PI * 0.5) * 0.09 - 0.04
		var cbm := BoxMesh.new(); cbm.size = Vector3(0.14, 0.14, 1.54)
		st_beam.append_from(cbm, 0, Transform3D(Basis.IDENTITY, Vector3(cbx, cby, 0.0)))

	# Four driven bank/bed pilings with damp moss base collars, diagonal braces & hemp lashings
	for px: float in [-abutment_x + 0.12, abutment_x - 0.12]:
		var dir_in := -1.0 if px > 0.0 else 1.0
		for pz: float in [-0.78, 0.78]:
			var pm := CylinderMesh.new(); pm.top_radius = 0.085; pm.bottom_radius = 0.11; pm.height = 0.94; pm.radial_segments = 7
			st_beam.append_from(pm, 0, Transform3D(Basis.IDENTITY, Vector3(px, 0.08, pz)))
			var collar := CylinderMesh.new(); collar.top_radius = 0.105; collar.bottom_radius = 0.125; collar.height = 0.28; collar.radial_segments = 7
			st_wet.append_from(collar, 0, Transform3D(Basis.IDENTITY, Vector3(px, -0.14, pz)))
			# Diagonal knee brace from piling inward up to stringer
			var br := BoxMesh.new(); br.size = Vector3(0.68, 0.09, 0.09)
			st_beam.append_from(br, 0, Transform3D(Basis.from_euler(Vector3(0.0, 0.0, dir_in * 0.52)), Vector3(px + dir_in * 0.28, -0.02, pz * 0.84)))
			# Hemp rope lashing wrapping post/stringer & curb joint
			for turn in range(2):
				var rt := TorusMesh.new(); rt.inner_radius = 0.082; rt.outer_radius = 0.105; rt.rings = 10; rt.ring_segments = 6
				st_rope.append_from(rt, 0, Transform3D(Basis.IDENTITY, Vector3(px, 0.08 + float(turn) * 0.036, pz)))

	st_wet.deindex(); st_wet.generate_normals()
	var wet_mesh := MeshInstance3D.new(); wet_mesh.mesh = st_wet.commit(); wet_mesh.material_override = mat_wet_post
	bridge.add_child(wet_mesh)

	st_beam.deindex(); st_beam.generate_normals()
	var beams := MeshInstance3D.new(); beams.mesh = st_beam.commit(); beams.material_override = mat_post
	bridge.add_child(beams)

	st_rope.deindex(); st_rope.generate_normals()
	var ropes := MeshInstance3D.new(); ropes.mesh = st_rope.commit(); ropes.material_override = mat_rope
	bridge.add_child(ropes)

	# 13 weathered rough-hewn cross planks in 3 aged timber tones (warm oak, sun-bleached grey, mossy edge)
	var mat_plank_pale := MatKit.make_wood_mat(Color("#8c7a62"), true)
	var mat_plank_moss := MatKit.make_wood_mat(Color("#5b5c40"), true)
	var plank_count := 13
	var step_x := (span_w - 0.12) / float(plank_count)
	for i in range(plank_count):
		var px := -span_w * 0.5 + 0.06 + (float(i) + 0.5) * step_x
		var u_p := float(i + 1) / float(plank_count + 1)
		var arch_y := sin(u_p * PI) * 0.11
		var thick := 0.068 + fmod(float(i) * 0.017, 0.022)
		var pm2 := BoxMesh.new(); pm2.size = Vector3(step_x * 0.90, thick, deck_w + sin(float(i) * 2.3) * 0.06)
		var rot := Basis.from_euler(Vector3(0.0, sin(float(i) * 1.9) * 0.022, 0.0))
		var xf_p := Transform3D(rot, Vector3(px, 0.095 + arch_y, 0.0))
		if i == 0 or i == 1 or i == plank_count - 1 or i == 5:
			st_deck_moss.append_from(pm2, 0, xf_p)
		elif i == 3 or i == 7 or i == 10:
			st_deck_pale.append_from(pm2, 0, xf_p)
		else:
			st_deck.append_from(pm2, 0, xf_p)
	st_deck.deindex(); st_deck.generate_normals()
	var deck := MeshInstance3D.new(); deck.mesh = st_deck.commit(); deck.material_override = mat_plank
	bridge.add_child(deck)
	st_deck_pale.deindex(); st_deck_pale.generate_normals()
	var deck_p := MeshInstance3D.new(); deck_p.mesh = st_deck_pale.commit(); deck_p.material_override = mat_plank_pale
	bridge.add_child(deck_p)
	st_deck_moss.deindex(); st_deck_moss.generate_normals()
	var deck_m := MeshInstance3D.new(); deck_m.mesh = st_deck_moss.commit(); deck_m.material_override = mat_plank_moss
	bridge.add_child(deck_m)

	# Walkable StaticBody3D collider: smooth flush deck (+0.16m world) & gentle overlapping bank ramps (zero step corner snag!)
	var b_body := StaticBody3D.new()
	b_body.name = "StreamFootbridgeBody"
	bridge.add_child(b_body)
	var c_deck := CollisionShape3D.new()
	var b_box := BoxShape3D.new(); b_box.size = Vector3(maxf(2.0, span_w - 0.95), 0.14, deck_w)
	c_deck.shape = b_box; c_deck.position = Vector3(0.0, 0.03, 0.0)
	b_body.add_child(c_deck)
	for rs: float in [-1.0, 1.0]:
		var rc_col := CollisionShape3D.new()
		var r_box := BoxShape3D.new(); r_box.size = Vector3(1.65, 0.12, deck_w + 0.14)
		rc_col.shape = r_box
		rc_col.position = Vector3(rs * (span_w * 0.5 + 0.10), -0.025, 0.0)
		rc_col.rotation.z = -rs * 0.095
		b_body.add_child(rc_col)

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
		return p.y > depth_m - 2.0 and p.y < depth_m + 24.0 and p.x > -14.0 and p.x < width_m + 14.0
	var near_pleamar_trail := func(p: Vector2) -> bool:
		# Keep walkable trail core (north toward Pleamar, south off-map, west across bridge) 100% clear of trunks/tall bushes
		return _forest_trail_dist(p.x, p.y) < 2.15
	var trail_tree_setback := func(p: Vector2) -> float:
		# Paso 23.6: Vary trail-side tree setback organically between 2.18m (close trailside coppice) and 5.35m (open wayside recess)
		var wave_t := 0.5 + 0.5 * sin(p.y * 0.21 + p.x * 0.17 + cos(p.y * 0.11) * 1.55)
		var side_open := 0.5 + 0.5 * cos(p.y * 0.15 - p.x * 0.23 + 0.7)
		return 2.18 + wave_t * 1.95 + (1.22 if side_open > 0.66 else 0.0)

	# --- Materials & MultiMesh prototypes (foliage.webp continuous canopies = ZERO black cutouts!) ---
	var q_tl := Rect2(0.01, 0.01, 0.48, 0.48)
	var q_tr := Rect2(0.51, 0.01, 0.48, 0.48)
	var q_br := Rect2(0.51, 0.51, 0.48, 0.48)
	var ivy_uv := Rect2(0.02, 0.51, 0.46, 0.47)

	var mat_birch_bark := MatKit.make_wood_mat(Color("#c9c1b0"), true)
	var mat_dead_bark := MatKit.make_wood_mat(Color("#62584d"), true)
	# Paso 23.3: Softened natural woodland green tints (zero neon or overly bright chartreuse crowns)
	var mat_canopy_spruce := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#395e35"), 0.028, Color("#57824a"), false, 2.8, true))
	var mat_canopy_birch := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#55703b"), 0.045, Color("#718e4f"), false, 2.4, true))
	var mat_canopy_beech := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#476535"), 0.038, Color("#648448"), false, 2.2, true))
	var mat_canopy_copper := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#7c5834"), 0.038, Color("#9f7346"), false, 2.2, true))
	var mat_canopy_willow := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#4e6939"), 0.042, Color("#6a864b"), false, 2.3, true))
	var willow_cards := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage-atlas.png", Color("#6b834c"), 0.075, Color("#849e5e"), true, 1.0, true, ivy_uv), 0.45, true)
	willow_cards.set_shader_parameter("hang", 1.0)

	var canopy_mats := {
		"pine": mat_pine_a,
		"pine_b": mat_pine_b,
		"oak": mat_oak,
		"spruce": mat_canopy_spruce,
		"birch": mat_canopy_birch,
		"sapling": mat_canopy_birch,
		"beech": mat_canopy_beech,
		"beech_copper": mat_canopy_copper,
		"willow": mat_canopy_willow,
	}
	var tree_species := ["pine", "spruce", "oak", "birch", "beech", "beech_copper", "willow", "sapling", "snag"]
	var species_variant_counts := {
		"pine": 2, "spruce": 2, "oak": 4, "birch": 4, "beech": 4, "beech_copper": 4, "willow": 3, "sapling": 4, "snag": 2,
	}
	for sp in tree_species:
		var v_cnt := int(species_variant_counts.get(sp, 1))
		var tm: Material = mat_birch_bark if sp in ["birch", "sapling"] else (mat_dead_bark if sp == "snag" else mat_trunk)
		var cm: Material = canopy_mats.get(sp, mat_oak) as Material
		for v_i in range(v_cnt):
			var pr := _env_kit.get_tree_species_proto(sp, v_i)
			var v_tag := "" if v_i == 0 else ("_v%d" % v_i)
			_env_kit.define_multimesh("trunk_" + sp + v_tag + "_near", pr["trunk"] as Mesh, tm, true)
			_env_kit.define_multimesh("trunk_" + sp + v_tag + "_far", pr["trunk"] as Mesh, tm, false)
			if pr.has("canopy"):
				_env_kit.define_multimesh("canopy_" + sp + v_tag + "_near", pr["canopy"] as Mesh, cm, true)
				_env_kit.define_multimesh("canopy_" + sp + v_tag + "_far", pr["canopy"] as Mesh, cm, false)
			if pr.has("cards"):
				_env_kit.define_multimesh("cards_" + sp + v_tag, pr["cards"] as Mesh, willow_cards, false)

	_env_kit.define_batch("trunk_dark", mat_trunk, true)

	# Desaturated muted coastal-woodland bushes & fern palettes (Paso 9: coherent with 2D sprites, zero bright neon!)
	var bush_defs := {
		"laurel": {"tex": "foliage-atlas-v5.png", "uv": q_tl, "tint": Color(0.46, 0.57, 0.40), "min": 0.72, "max": 1.18, "low": false},
		"holly": {"tex": "foliage-atlas.png", "uv": q_tl, "tint": Color(0.42, 0.54, 0.38), "min": 0.70, "max": 1.14, "low": false},
		"fern_yarrow": {"tex": "foliage-atlas-v5.png", "uv": q_tr, "tint": Color(0.50, 0.60, 0.42), "min": 0.58, "max": 0.96, "low": true},
		"fern_tall": {"tex": "foliage-atlas.png", "uv": q_tr, "tint": Color(0.46, 0.58, 0.40), "min": 0.66, "max": 1.08, "low": false},
		"heather": {"tex": "foliage-atlas-v5.png", "uv": q_br, "tint": Color(0.58, 0.61, 0.56), "min": 0.36, "max": 0.66, "low": true},
		"meadow": {"tex": "foliage-atlas.png", "uv": q_br, "tint": Color(0.54, 0.61, 0.46), "min": 0.34, "max": 0.64, "low": true},
	}
	for bk in bush_defs.keys():
		var bd: Dictionary = bush_defs[bk]
		var bm := MatKit.create_foliage_wind_shader_material(str(bd["tex"]), bd["tint"], 0.042, Color("#59723d"), true, 1.0, true, bd["uv"])
		_env_kit.define_multimesh("bush_" + str(bk), _env_kit.get_bush_quad_proto(bd["uv"], 1.15), bm, false)

	# MultiMesh isolated mushroom prototypes (Paso 1.6: 100% eliminates cross-cluster stretched yellow lines!)
	var mat_mush_stem := MatKit.make_cloth_mat(Color("#cfc3a8"), false, true)
	var mat_mush_dots := MatKit.make_cloth_mat(Color("#ece3ce"), false, true)
	var mush_cap_mats := {
		"amanita": MatKit.make_textured_mat("earth.webp", Color("#a63624"), 0.52, "", Vector3.ONE, false, true),
		"porcini": MatKit.make_textured_mat("earth.webp", Color("#7c4d29"), 0.64, "", Vector3.ONE, false, true),
		"chanterelle": MatKit.make_textured_mat("earth.webp", Color("#c68e32"), 0.64, "", Vector3.ONE, false, true),
		"parasol": MatKit.make_textured_mat("earth.webp", Color("#b8a17f"), 0.72, "", Vector3.ONE, false, true),
		"brown": MatKit.make_textured_mat("earth.webp", Color("#784e34"), 0.72, "", Vector3.ONE, false, true),
	}
	for mk_kind in ["amanita", "porcini", "chanterelle", "parasol", "brown", "puffball"]:
		var mp_proto := _env_kit.get_mushroom_proto(mk_kind)
		if mp_proto.has("stem"):
			_env_kit.define_multimesh("mush_stem_" + mk_kind, mp_proto["stem"] as Mesh, mat_mush_stem, false)
		if mp_proto.has("cap"):
			var cap_m: Material = mush_cap_mats.get(mk_kind, mush_cap_mats["brown"]) as Material
			_env_kit.define_multimesh("mush_cap_" + mk_kind, mp_proto["cap"] as Mesh, cap_m, false)
		if mp_proto.has("dots"):
			_env_kit.define_multimesh("mush_dots_" + mk_kind, mp_proto["dots"] as Mesh, mat_mush_dots, false)

	# MultiMesh forest floor microdetail: fallen twigs/branches, trailside exposed roots & mossy pebbles (Pasos 6, 7, 9)
	var mat_twig := MatKit.make_wood_mat(Color("#4c3a2a"), true)
	var mat_pebble := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#646f61"), 0.86, "rock", Vector3(0.55, 0.55, 0.55), true, true)
	_env_kit.define_multimesh("twig_debris", _env_kit.get_twig_debris_proto("twig"), mat_twig, false)
	_env_kit.define_multimesh("trail_roots", _env_kit.get_twig_debris_proto("root"), mat_twig, false)
	var pebble_variants := _env_kit.get_rock_variants("rounded")
	_env_kit.define_multimesh("trail_pebbles", pebble_variants[0] as Mesh, mat_pebble, false)

	var place_mush_cluster := func(kind: String, pos: Vector3, seed_v: float, count: int, scale_f: float = 1.38) -> void:
		var mp_proto := _env_kit.get_mushroom_proto(kind)
		for mi in range(count):
			var ma := seed_v + float(mi) * 2.399
			var mrad := (0.03 + sqrt(float(mi)) * 0.072) * scale_f
			var ms := scale_f * (0.72 + fmod(seed_v * 0.37 + float(mi) * 0.29, 0.52))
			var mp3 := pos + Vector3(cos(ma) * mrad, 0.0, sin(ma) * mrad)
			var mlean := Basis.from_euler(Vector3(sin(ma) * 0.12, ma, cos(ma) * 0.10))
			var mxf := Transform3D(mlean.scaled(Vector3.ONE * ms), mp3)
			var mcol := Color(rng.randf_range(0.90, 1.06), rng.randf_range(0.90, 1.06), rng.randf_range(0.88, 1.04))
			if mp_proto.has("stem"):
				_env_kit.append_multimesh("mush_stem_" + kind, mxf, mcol)
			if mp_proto.has("cap"):
				_env_kit.append_multimesh("mush_cap_" + kind, mxf, mcol)
			if mp_proto.has("dots"):
				_env_kit.append_multimesh("mush_dots_" + kind, mxf, Color.WHITE)

	var tree_counts: Dictionary = {}
	var bush_counts: Dictionary = {}
	var mush_clusters := 0
	var logs := 0
	var new_spots: Array[Dictionary] = []

	# Paso 23.4, 23.6, 23.7: Distinct dense old-growth grove nuclei vs sparse open glade pockets
	var grove_nuclei: Array[Vector2] = [
		Vector2(6.2, -15.5), Vector2(30.5, -13.5), Vector2(37.5, 11.5),
		Vector2(-10.8, 23.5), Vector2(33.2, 33.5), Vector2(-11.8, -5.5),
		Vector2(29.5, -29.0), Vector2(-24.0, 22.0),
	]
	var sparse_glades: Array[Vector2] = [
		Vector2(-19.0, 8.2), Vector2(42.5, 23.5), Vector2(10.5, -34.0), Vector2(-8.5, 38.0),
	]
	var eval_grove_affinity := func(pt: Vector2) -> float:
		var best := 0.0
		for gn: Vector2 in grove_nuclei:
			var d := pt.distance_to(gn)
			if d < 12.5:
				best = maxf(best, 1.0 - (d / 12.5))
		return best
	var eval_glade_openness := func(pt: Vector2) -> float:
		var best := 0.0
		for sg: Vector2 in sparse_glades:
			var d := pt.distance_to(sg)
			if d < 10.5:
				best = maxf(best, 1.0 - (d / 10.5))
		return best

	var emit_tree_instance := func(p: Vector2, species: String, sc_h: float, is_veteran: bool = false) -> void:
		var rd_t: float = rect_dist.call(p)
		var sc_wx := sc_h * rng.randf_range(0.84, 1.22 if is_veteran else 1.16)
		var sc_wz := sc_h * rng.randf_range(0.84, 1.22 if is_veteran else 1.16)
		if species == "sapling":
			sc_wx = sc_h * rng.randf_range(0.86, 1.12)
			sc_wz = sc_h * rng.randf_range(0.86, 1.12)
		var y := _eval_skirt_height("forest", p.x, p.y, width_m, depth_m) - 0.11
		var yaw := rng.randf() * TAU
		var lean_r := Vector3(rng.randf_range(-0.055, 0.055), yaw, rng.randf_range(-0.055, 0.055))
		var tx := Transform3D(Basis.from_euler(lean_r).scaled(Vector3(sc_wx, sc_h, sc_wz)), Vector3(p.x, y, p.y))
		var shade_var := rng.randf_range(0.80, 1.03)
		# Soft organic foliage tint shift (deep moss to warm olive-sage, zero harsh yellow-green boost!)
		var warm_shift := rng.randf_range(-0.05, 0.06)
		var hue_c := Color(
			clampf(shade_var * (0.96 + warm_shift), 0.72, 1.04),
			clampf(shade_var * (0.95 - absf(warm_shift) * 0.25), 0.72, 1.02),
			clampf(shade_var * (0.91 - warm_shift * 0.5), 0.68, 0.98)
		)
		var v_cnt := int(species_variant_counts.get(species, 1))
		var v_idx := posmod(rng.randi(), v_cnt)
		if is_veteran and species in ["oak", "beech", "beech_copper"]:
			v_idx = 0 if rng.randf() < 0.55 else 2 # Veteran trees favor wide spreading or twin-bole archetypes
		var v_tag := "" if v_idx == 0 else ("_v%d" % v_idx)
		var tier_sfx := "_near" if rd_t < 24.0 else "_far"
		_env_kit.append_multimesh("trunk_" + species + v_tag + tier_sfx, tx, Color(shade_var, shade_var, shade_var))
		if species != "snag":
			_env_kit.append_multimesh("canopy_" + species + v_tag + tier_sfx, tx, hue_c)
		if species == "willow":
			_env_kit.append_multimesh("cards_willow" + v_tag, tx, hue_c)
		_tree_spots.append(p)
		new_spots.append({"p": p, "y": y, "species": species, "scale": sc_h})
		tree_counts[species] = int(tree_counts.get(species, 0)) + 1

	# --- Trees: natural clustered groves with small glades, non-uniform height/width & species variety (Paso 8 & Paso 23) ---
	var gx := -56.0
	while gx <= width_m + 56.0:
		var gz := -68.0
		while gz <= depth_m + 50.0:
			var p := Vector2(gx + rng.randf_range(-2.05, 2.05), gz + rng.randf_range(-2.05, 2.05))
			gz += 4.3
			var rd: float = rect_dist.call(p)
			var trail_d := _forest_trail_dist(p.x, p.y)
			if rd < 1.5 or bool(in_south_band.call(p)) or trail_d < float(trail_tree_setback.call(p)):
				continue
			var hw := _river_half_width(p.y)
			var rv := _river_distance(p)
			if rv < hw + 1.85:
				continue
			var g_aff: float = eval_grove_affinity.call(p)
			var gl_open: float = eval_glade_openness.call(p)
			var grove_wave := 0.5 + 0.5 * sin(p.x * 0.13 + cos(p.y * 0.10) * 1.55)
			var glade_pocket := 0.5 + 0.5 * cos(p.x * 0.08 - p.y * 0.09 + 1.1)
			var chance := (0.86 if rd < 16.0 else 0.60) * lerpf(0.45, 1.36, grove_wave * 0.68 + glade_pocket * 0.32)
			chance = clampf(chance + g_aff * 0.36 - gl_open * 0.58, 0.10, 0.96)
			if rng.randf() > chance:
				continue
			var min_tree_space := lerpf(2.75, 1.96, g_aff) + gl_open * 1.85
			var too_close := false
			for ts in _tree_spots:
				if ts.distance_to(p) < min_tree_space:
					too_close = true
					break
			if too_close:
				continue
			var roll := rng.randf()
			var species := "spruce"
			if rv < hw + 6.5:
				species = "willow" if roll < 0.42 else ("birch" if roll < 0.76 else "sapling")
			elif p.y < -14.0:
				species = "spruce" if roll < 0.40 else ("pine" if roll < 0.64 else ("birch" if roll < 0.80 else ("beech" if roll < 0.92 else "snag")))
			else:
				if roll < 0.22: species = "spruce"
				elif roll < 0.38: species = "pine"
				elif roll < 0.52: species = "oak"
				elif roll < 0.66: species = "birch"
				elif roll < 0.81: species = "beech"
				elif roll < 0.87: species = "beech_copper"
				elif roll < 0.92: species = "snag"
				else: species = "sapling"
			# Paso 23.4: Broader age & size hierarchy (veteran elders in grove cores, mature middle canopy, young understory)
			var is_vet := (g_aff > 0.42 and rng.randf() < 0.38 and species in ["oak", "beech", "pine", "spruce"])
			var sc_h := rng.randf_range(1.24, 1.50) if is_vet else (rng.randf_range(0.64, 0.86) if rng.randf() < 0.26 else rng.randf_range(0.88, 1.24))
			if species == "sapling":
				sc_h = rng.randf_range(0.38, 0.66)
			emit_tree_instance.call(p, species, sc_h, is_vet)
			# Inside dense grove nuclei, cluster 1 companion younger tree or sub-canopy sapling nearby
			if g_aff > 0.36 and rng.randf() < 0.52:
				var ca_g := rng.randf() * TAU
				var cr_g := rng.randf_range(1.85, 2.55)
				var cp_g := p + Vector2(cos(ca_g), sin(ca_g)) * cr_g
				if rect_dist.call(cp_g) >= 1.8 and not bool(in_south_band.call(cp_g)) and _forest_trail_dist(cp_g.x, cp_g.y) >= float(trail_tree_setback.call(cp_g)) and _river_distance(cp_g) >= _river_half_width(cp_g.y) + 1.9:
					var comp_ok := true
					for ts2 in _tree_spots:
						if ts2.distance_to(cp_g) < 1.75:
							comp_ok = false
							break
					if comp_ok:
						var comp_sp := "sapling" if rng.randf() < 0.48 else ("birch" if rng.randf() < 0.5 else species)
						var comp_sc := rng.randf_range(0.44, 0.68) if comp_sp == "sapling" else rng.randf_range(0.62, 0.88)
						emit_tree_instance.call(cp_g, comp_sp, comp_sc, false)
		gx += 4.3

	# Paso 23.6 & 23.7: Irregular trail-shoulder coppice clusters along northern & far-southern trail bends
	# (kept strictly outside the southern camp clearing sightline window!)
	var trail_coppices: Array = [
		[ Vector2(15.2, -3.2), "oak", 1.16, Vector2(13.8, -4.6), "sapling", 0.56 ],
		[ Vector2(21.6, -8.8), "beech", 1.24, Vector2(23.1, -7.4), "birch", 0.74 ],
		[ Vector2(15.8, -21.5), "pine", 1.20, Vector2(14.3, -20.1), "birch", 0.68 ],
		[ Vector2(22.4, -27.5), "oak", 1.22, Vector2(23.8, -26.0), "sapling", 0.58 ],
		[ Vector2(10.8, 37.5), "beech_copper", 1.10, Vector2(9.4, 36.0), "birch", 0.72 ],
	]
	for tc_item: Array in trail_coppices:
		for pair_i in [0, 3]:
			var tcp: Vector2 = tc_item[pair_i]
			var tsp: String = str(tc_item[pair_i + 1])
			var tsc: float = float(tc_item[pair_i + 2])
			if _forest_trail_dist(tcp.x, tcp.y) >= 2.20 and _river_distance(tcp) >= _river_half_width(tcp.y) + 1.85 and not bool(in_south_band.call(tcp)):
				var ok_tc := true
				for ts3 in _tree_spots:
					if ts3.distance_to(tcp) < 1.65:
						ok_tc = false
						break
				if ok_tc:
					emit_tree_instance.call(tcp, tsp, tsc, pair_i == 0)

	# --- Undergrowth grouped naturally by shade/moisture/light (Paso 9: zero uniform scatter!) ---
	var bush_keys := bush_defs.keys()
	var bush_w := [0.18, 0.16, 0.25, 0.21, 0.11, 0.09]
	var pick_bush := func(low_only: bool, damp_zone: bool = false) -> String:
		if damp_zone:
			return "fern_yarrow" if (low_only or rng.randf() < 0.55) else "fern_tall"
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
		return "fern_yarrow"
	var place_bush := func(p: Vector2, low_only: bool, damp_zone: bool = false) -> void:
		var k: String = pick_bush.call(low_only, damp_zone)
		var bd: Dictionary = bush_defs[k]
		var size := rng.randf_range(float(bd["min"]), float(bd["max"]))
		if low_only:
			size = minf(size, 0.72)
		var y := _eval_forest_play_height(p.x, p.y) if str(cell_kind.call(p)) != "outside" else maxf(-0.08, _eval_skirt_height("forest", p.x, p.y, width_m, depth_m))
		var bx_xf := Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(size * rng.randf_range(0.88, 1.15), size * rng.randf_range(0.82, 1.18), size * rng.randf_range(0.88, 1.15))), Vector3(p.x, y, p.y))
		var b_v := rng.randf_range(0.82, 1.05)
		_env_kit.append_multimesh("bush_" + k, bx_xf, Color(b_v, b_v * rng.randf_range(0.95, 1.04), b_v * 0.93))
		bush_counts[k] = int(bush_counts.get(k, 0)) + 1

	# Paso 23: Wide, lush volumetric 3D woodland hedgerows / dense bramble-laurel thickets
	# ("aumentar los setos más amplios que en algún sitio incluso impidan el paso de lo frondoso que está")
	var hedge_group := Node3D.new()
	hedge_group.name = "ForestHedgeThickets"
	_grp_vegetation.add_child(hedge_group)
	var mat_hedge_a := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#3b5730"), 0.032, Color("#587844"), false, 2.5, true), 0.38, false)
	var mat_hedge_b := _register_forest_canopy_mat(MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#446036"), 0.034, Color("#61824b"), false, 2.4, true), 0.38, false)
	var mat_hedge_frond := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color(0.45, 0.57, 0.39), 0.048, Color("#5c7840"), true, 1.0, true, q_tl)
	# [pos_2d, yaw_rad, scale_vec3, variant_idx, has_blocking_collider]
	var hedge_specs: Array = [
		# 9 impenetrable off-trail / outer-clearing boundary hedgerows with StaticBody3D physical colliders!
		[ Vector2(10.6, 4.4), 0.22, Vector3(1.18, 1.06, 1.12), 0, true ],
		[ Vector2(26.4, 7.8), -0.78, Vector3(1.26, 1.12, 1.16), 2, true ],
		[ Vector2(28.2, 14.8), 1.42, Vector3(1.28, 1.12, 1.16), 1, true ],
		[ Vector2(27.8, 22.8), 0.95, Vector3(1.24, 1.10, 1.15), 0, true ],
		[ Vector2(8.2, 23.8), 0.65, Vector3(1.18, 1.06, 1.12), 1, true ],
		[ Vector2(14.4, -1.2), 1.38, Vector3(1.28, 1.14, 1.18), 2, true ],
		[ Vector2(22.6, -4.6), -1.24, Vector3(1.30, 1.14, 1.18), 0, true ],
		[ Vector2(-7.8, 13.0), 0.32, Vector3(1.22, 1.08, 1.14), 1, true ],
		[ Vector2(-8.6, 21.4), -0.38, Vector3(1.24, 1.10, 1.15), 2, true ],
		# 5 additional sprawling deep-grove hedgerows enriching the dense forest pockets
		[ Vector2(13.6, -12.4), 1.26, Vector3(1.28, 1.12, 1.18), 1, false ],
		[ Vector2(31.8, -10.5), 0.54, Vector3(1.38, 1.18, 1.24), 2, false ],
		[ Vector2(35.2, 14.2), 1.48, Vector3(1.36, 1.16, 1.22), 0, false ],
		[ Vector2(11.8, 36.5), 1.32, Vector3(1.28, 1.12, 1.18), 1, false ],
		[ Vector2(25.4, 35.8), -1.18, Vector3(1.34, 1.15, 1.20), 2, false ],
		# 6 lush outer-sanctuary hedgerow thickets deepening foliage walling in NW, W, SW, NE, E & SE groves
		[ Vector2(-10.8, 5.4), 0.42, Vector3(1.34, 1.14, 1.20), 0, true ],
		[ Vector2(32.5, -24.5), -0.68, Vector3(1.38, 1.18, 1.22), 2, true ],
		[ Vector2(38.5, 4.5), 1.25, Vector3(1.42, 1.20, 1.24), 1, false ],
		[ Vector2(-6.2, -18.5), 0.88, Vector3(1.36, 1.16, 1.22), 0, false ],
		[ Vector2(-5.8, 29.2), -0.52, Vector3(1.34, 1.14, 1.20), 2, false ],
		[ Vector2(36.2, 28.8), 1.08, Vector3(1.38, 1.18, 1.24), 1, false ],
	]
	for hi in range(hedge_specs.size()):
		var h_entry: Array = hedge_specs[hi]
		var hp2: Vector2 = h_entry[0]
		var h_yaw: float = float(h_entry[1])
		var h_sc: Vector3 = h_entry[2]
		var h_var: int = int(h_entry[3])
		var h_blocks: bool = bool(h_entry[4])
		var hy := _eval_forest_play_height(hp2.x, hp2.y) if str(cell_kind.call(hp2)) != "outside" else _eval_skirt_height("forest", hp2.x, hp2.y, width_m, depth_m)
		var h_proto := _env_kit.get_hedge_thicket_proto(h_var)
		var h_node := Node3D.new()
		h_node.name = "ForestHedgeThicket_%d" % hi
		h_node.position = Vector3(hp2.x, hy, hp2.y)
		h_node.rotation.y = h_yaw
		h_node.scale = h_sc
		hedge_group.add_child(h_node)

		var mi_stems := MeshInstance3D.new(); mi_stems.name = "HedgeStems"
		mi_stems.mesh = h_proto["stems"] as Mesh; mi_stems.material_override = mat_trunk
		h_node.add_child(mi_stems)

		var mi_fol := MeshInstance3D.new(); mi_fol.name = "HedgeFoliageMass"
		mi_fol.mesh = h_proto["foliage"] as Mesh; mi_fol.material_override = mat_hedge_a if (hi % 2 == 0) else mat_hedge_b
		h_node.add_child(mi_fol)

		var mi_fronds := MeshInstance3D.new(); mi_fronds.name = "HedgeLeafyFronds"
		mi_fronds.mesh = h_proto["fronds"] as Mesh; mi_fronds.material_override = mat_hedge_frond
		mi_fronds.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		h_node.add_child(mi_fronds)

		if h_blocks:
			var hb := StaticBody3D.new()
			hb.name = "ForestHedgeCollider_%d" % hi
			h_node.add_child(hb)
			var h_col := CollisionShape3D.new()
			var h_box := BoxShape3D.new()
			h_box.size = Vector3(2.45, 1.45, 1.18)
			h_col.shape = h_box
			h_col.position = Vector3(0.0, 0.68, 0.0)
			hb.add_child(h_col)

		# Blend hedgerow skirts into surrounding understory with 4 flanking shrubs/ferns
		for h_bi in range(4):
			var ba := h_yaw + (float(h_bi) - 1.5) * 0.75 + rng.randf_range(-0.2, 0.2)
			var bp_h := hp2 + Vector2(cos(ba), sin(ba)) * rng.randf_range(0.95, 1.65)
			if _forest_trail_dist(bp_h.x, bp_h.y) >= 2.25 and _river_distance(bp_h) >= _river_half_width(bp_h.y) + 0.75 and not bool(near_blocked.call(bp_h, 1.35)):
				place_bush.call(bp_h, h_bi % 2 == 1, false)
		bush_counts["hedge_thicket"] = int(bush_counts.get("hedge_thicket", 0)) + 1

	# Wrap EVERY perimeter & clearing obstacle tree base in low bushes/ferns + fallen twigs
	for op3 in _outer_perimeter_trees:
		var op2 := Vector2(op3.x, op3.z)
		var is_inside := str(cell_kind.call(op2)) != "outside"
		var b_cnt := 2 if is_inside else 3
		for ci in range(b_cnt):
			var ca := rng.randf() * TAU
			var cr := rng.randf_range(0.46, 0.74) if is_inside else rng.randf_range(0.62, 1.42)
			var cp2 := op2 + Vector2(cos(ca), sin(ca)) * cr
			if _river_distance(cp2) >= _river_half_width(cp2.y) + 0.65 and not bool(near_pleamar_trail.call(cp2)):
				place_bush.call(cp2, is_inside or ci > 0, _river_distance(cp2) < _river_half_width(cp2.y) + 3.2)
		# Small twigs resting around tree root base
		if rng.randf() < 0.70:
			var ta := rng.randf() * TAU
			var tp2 := op2 + Vector2(cos(ta), sin(ta)) * rng.randf_range(0.65, 1.35)
			var ty := _eval_forest_play_height(tp2.x, tp2.y) if is_inside else _eval_skirt_height("forest", tp2.x, tp2.y, width_m, depth_m)
			_env_kit.append_multimesh("twig_debris", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.75, 1.25)), Vector3(tp2.x, ty, tp2.y)), Color(0.9, 0.88, 0.84))

	# Seed natural bush/fern thickets + fallen twigs + damp-shaded mushrooms around woodland trees
	for spot in new_spots:
		var sp2: Vector2 = spot["p"]
		if sp2.x < -54.0 or sp2.x > width_m + 54.0 or sp2.y < -64.0 or sp2.y > depth_m + 48.0:
			continue
		if bool(in_south_band.call(sp2)) or bool(near_pleamar_trail.call(sp2)):
			continue
		var near_water := _river_distance(sp2) < _river_half_width(sp2.y) + 5.5
		var cluster_cnt := rng.randi_range(2, 4)
		for ci in range(cluster_cnt):
			var ca := float(ci) * (TAU / float(cluster_cnt)) + rng.randf_range(-0.45, 0.45)
			var cr := rng.randf_range(0.55, 1.60)
			var cp2 := sp2 + Vector2(cos(ca), sin(ca)) * cr
			if str(cell_kind.call(cp2)) == "outside" and _river_distance(cp2) >= _river_half_width(cp2.y) + 0.75 and not bool(near_pleamar_trail.call(cp2)):
				place_bush.call(cp2, ci > 0, near_water)
		if rect_dist.call(sp2) > 3.5 and rng.randf() < 0.48:
			var ug_off := Vector2(cos(rng.randf() * TAU), sin(rng.randf() * TAU)) * rng.randf_range(1.8, 3.2)
			var up := sp2 + ug_off
			if str(cell_kind.call(up)) == "outside" and _river_distance(up) >= _river_half_width(up.y) + 1.0 and not bool(near_pleamar_trail.call(up)) and not bool(in_south_band.call(up)):
				place_bush.call(up, rng.randf() < 0.65, near_water)
		# Fallen twigs beneath canopy trees
		if rect_dist.call(sp2) < 28.0 and rng.randf() < 0.42:
			var tw_a := rng.randf() * TAU
			var tw_p := sp2 + Vector2(cos(tw_a), sin(tw_a)) * rng.randf_range(0.85, 2.0)
			var tw_y := _eval_skirt_height("forest", tw_p.x, tw_p.y, width_m, depth_m)
			_env_kit.append_multimesh("twig_debris", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.8, 1.35)), Vector3(tw_p.x, tw_y, tw_p.y)), Color(0.92, 0.88, 0.84))
		# Mushrooms concentrated in damp shade near tree bases & deadwood snags
		var spc := str(spot["species"])
		if (near_water or spc in ["snag", "willow", "spruce"]) and rng.randf() < 0.44:
			var kinds: Array = ["amanita", "porcini"] if spc in ["spruce", "pine", "birch", "sapling"] else (["brown", "puffball"] if spc == "snag" else ["chanterelle", "porcini", "brown"])
			var a2 := rng.randf() * TAU
			var mp := sp2 + Vector2(cos(a2), sin(a2)) * rng.randf_range(0.65, 1.25)
			var my := float(spot["y"]) + 0.04
			place_mush_cluster.call(str(kinds[rng.randi() % kinds.size()]), Vector3(mp.x, my, mp.y), rng.randf() * 10.0, rng.randi_range(3, 6))
			mush_clusters += 1
		if spc == "snag" and sp2.distance_to(Vector2(width_m * 0.5, depth_m * 0.5)) < 36.0:
			_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(sp2.x + 0.25, float(spot["y"]) + 1.1, sp2.y), rng.randf() * 5.0)

	# Selective dense lushness sanctuaries: multi-tiered ferns, laurels, berry shrubs & moss cushions in shaded pockets
	var lush_pockets: Array[Dictionary] = [
		{"xz": Vector2(-6.5, -20.0), "r": 10.5, "amt": 28, "damp": true},
		{"xz": Vector2(28.0, -24.0), "r": 11.0, "amt": 30, "damp": false},
		{"xz": Vector2(-11.0, 7.0),  "r": 9.5,  "amt": 26, "damp": true},
		{"xz": Vector2(-6.5, 29.0),  "r": 10.0, "amt": 28, "damp": true},
		{"xz": Vector2(37.5, 6.0),   "r": 11.0, "amt": 30, "damp": false},
		{"xz": Vector2(34.5, 29.0),  "r": 10.5, "amt": 28, "damp": false},
	]
	for lp_d: Dictionary in lush_pockets:
		var l_center: Vector2 = lp_d["xz"]
		var l_rad := float(lp_d["r"])
		var l_amt := int(lp_d["amt"])
		var l_damp := bool(lp_d["damp"])
		for li_p in range(l_amt):
			var lang := float(li_p) * 2.3999 + rng.randf_range(-0.35, 0.35)
			var ldist := sqrt((float(li_p) + 0.4) / float(l_amt)) * l_rad
			var lpt := l_center + Vector2(cos(lang), sin(lang)) * ldist
			if _forest_trail_dist(lpt.x, lpt.y) < 2.25 or _river_distance(lpt) < _river_half_width(lpt.y) + 0.90 or bool(near_blocked.call(lpt, 1.45)) or bool(in_south_band.call(lpt)):
				continue
			if str(cell_kind.call(lpt)) != "outside":
				continue
			place_bush.call(lpt, li_p % 3 == 2, l_damp)
			if li_p % 2 == 0:
				var twin_p := lpt + Vector2(rng.randf_range(-0.85, 0.85), rng.randf_range(-0.85, 0.85))
				if _forest_trail_dist(twin_p.x, twin_p.y) >= 2.25 and _river_distance(twin_p) >= _river_half_width(twin_p.y) + 0.85:
					place_bush.call(twin_p, true, l_damp)
			if li_p < 4:
				var sy_l := _eval_skirt_height("forest", lpt.x, lpt.y, width_m, depth_m)
				_env_kit.spawn_woodland_shrub(_grp_vegetation, Vector3(lpt.x, sy_l, lpt.y), mat_oak, Color("#734538") if li_p % 2 == 0 else Color("#465a74"), lang)
				if li_p < 3:
					_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(lpt.x + 0.45, sy_l, lpt.y - 0.35), Color("#426839"), 1.1, lang * 1.3)

	# Lush fern & damp-bank mushroom communities hugging the riverbanks (Paso 4 & Paso 9)
	for ri in range(0, _river_pts.size(), 3):
		var rp_c := _river_pts[ri]
		if rp_c.y < -36.0 or rp_c.y > depth_m + 34.0 or absf(rp_c.y - 17.0) < 2.65:
			continue
		var hw_r := _river_half_width(rp_c.y)
		for side_r in [-1.0, 1.0]:
			if rng.randf() < 0.78:
				var bp := Vector2(rp_c.x + side_r * (hw_r + rng.randf_range(0.80, 1.85)), rp_c.y + rng.randf_range(-0.6, 0.6))
				if (str(cell_kind.call(bp)) == "outside" or not walk.has(Vector2i(int(floor(bp.x / tile)), int(floor(bp.y / tile))))) and not bool(near_blocked.call(bp, 1.2)):
					place_bush.call(bp, bool(in_south_band.call(bp)), true)
					if rng.randf() < 0.68:
						place_bush.call(bp + Vector2(rng.randf_range(-0.75, 0.75), rng.randf_range(-0.75, 0.75)), true, true)
			if rng.randf() < 0.30:
				var mp_r := Vector2(rp_c.x + side_r * (hw_r + rng.randf_range(0.68, 1.35)), rp_c.y + rng.randf_range(-0.5, 0.5))
				if not bool(near_blocked.call(mp_r, 1.1)):
					var ry := maxf(-0.04, _carve_river_valley(mp_r.x, mp_r.y, 0.0))
					var rmkind: String = ["chanterelle", "amanita", "porcini", "brown"][rng.randi() % 4]
					place_mush_cluster.call(rmkind, Vector3(mp_r.x, ry, mp_r.y), rng.randf() * 10.0, rng.randi_range(3, 6), 1.28)
					mush_clusters += 1

	# Paso 7.6: Flanking mossy pebbles & exposed roots strictly OUTSIDE main trail walking line (never blocking!)
	var trail_acc_pts: Array[Vector2] = [
		Vector2(16.8, 10.2), Vector2(21.8, 8.6), Vector2(16.6, 2.2), Vector2(22.2, -3.5),
		Vector2(15.2, -10.5), Vector2(20.6, -15.2), Vector2(19.8, -28.0), Vector2(25.2, -32.0),
		Vector2(16.0, 24.5), Vector2(22.8, 26.8), Vector2(18.2, 35.5), Vector2(25.8, 39.0),
		Vector2(11.4, 14.3), Vector2(10.8, 18.9), Vector2(-6.5, 14.8), Vector2(-9.2, 19.6),
		Vector2(-15.8, 13.6), Vector2(-19.5, 19.8),
	]
	for tp_i in range(trail_acc_pts.size()):
		var tp := trail_acc_pts[tp_i]
		var td_chk := _forest_trail_dist(tp.x, tp.y)
		if td_chk < 1.85 or _river_distance(tp) < _river_half_width(tp.y) + 1.1 or bool(near_blocked.call(tp, 1.35)):
			continue
		var ty := _eval_forest_play_height(tp.x, tp.y) if str(cell_kind.call(tp)) != "outside" else _eval_skirt_height("forest", tp.x, tp.y, width_m, depth_m)
		var st_sc := rng.randf_range(0.28, 0.56)
		_env_kit.append_multimesh("trail_pebbles", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(st_sc * 1.15, st_sc * 0.42, st_sc * 0.92)), Vector3(tp.x, ty + 0.02, tp.y)), Color(0.86, 0.90, 0.84))
		_env_kit.append_multimesh("trail_pebbles", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(st_sc * 0.65, st_sc * 0.28, st_sc * 0.58)), Vector3(tp.x + 0.36, ty + 0.01, tp.y - 0.24)), Color(0.82, 0.85, 0.80))
		if tp_i % 3 == 0:
			_env_kit.append_multimesh("trail_roots", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.75, 1.05)), Vector3(tp.x - 0.45, ty + 0.01, tp.y + 0.32)), Color(0.88, 0.84, 0.78))

	# Fallen mossy logs with fungi & twig litter in the surrounding woodland
	var log_spots: Array[Vector2] = [Vector2(-6.5, 4.0), Vector2(-9.0, 26.0), Vector2(width_m + 5.5, 3.5), Vector2(width_m + 7.0, 22.0),
		Vector2(14.0, -7.0), Vector2(26.0, -9.5), Vector2(-14.0, -12.0), Vector2(width_m + 14.0, -6.0), Vector2(-16.0, 40.0), Vector2(width_m + 16.0, 44.0)]
	for li in range(log_spots.size()):
		var lp: Vector2 = log_spots[li]
		if _river_distance(lp) < _river_half_width(lp.y) + 2.5:
			lp.x += 6.0
		var ly := maxf(-0.05, _eval_skirt_height("forest", lp.x, lp.y, width_m, depth_m)) - 0.08
		var yaw := float(li) * 1.37
		_env_kit.append_fallen_log("trunk_dark", Vector3(lp.x, ly, lp.y), yaw, rng.randf_range(2.6, 4.0), rng.randf_range(0.22, 0.32))
		place_mush_cluster.call("brown" if li % 2 == 0 else "porcini", Vector3(lp.x + 0.6, ly + 0.05, lp.y + 0.45), float(li), 5)
		_env_kit.spawn_shelf_fungi(_grp_vegetation, Vector3(lp.x - cos(yaw) * 0.6, ly + 0.42, lp.y - sin(yaw) * 0.6 + 0.2), float(li) * 2.1)
		_env_kit.append_multimesh("twig_debris", Transform3D(Basis(Vector3.UP, yaw + 0.7).scaled(Vector3.ONE * 1.15), Vector3(lp.x - 0.7, ly + 0.04, lp.y + 0.55)), Color(0.9, 0.88, 0.85))
		logs += 1
		mush_clusters += 1

	# Guarantee amanita cluster beside shaded northern tree base
	place_mush_cluster.call("amanita", Vector3(width_m - 4.0, _eval_forest_play_height(width_m - 4.0, 6.5), 6.5), 2.1, 4, 1.3)
	mush_clusters += 1

	# Low quiet meadow/grass tufts & tiny twigs along outer grass tiles (varied heights, kept off trails & dry clearings!)
	for key in walk.keys():
		var mat_id := str(walk[key])
		if mat_id in ["earth", "water", "stone", "gravel"]:
			continue
		var cw := Structure.tile_to_world(int(key.x), int(key.y), 0.0)
		var p4 := Vector2(cw.x + rng.randf_range(-0.52, 0.52), cw.z + rng.randf_range(-0.52, 0.52))
		if bool(near_blocked.call(p4, 1.75)) or bool(near_pleamar_trail.call(p4)) or _river_distance(p4) < _river_half_width(p4.y) + 0.45:
			continue
		var py4 := _eval_forest_play_height(p4.x, p4.y)
		var roll2 := rng.randf()
		if roll2 < 0.13:
			var sc_m := rng.randf_range(0.24, 0.44)
			_env_kit.append_multimesh("bush_meadow", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(sc_m, sc_m * rng.randf_range(0.75, 1.25), sc_m)), Vector3(p4.x, py4, p4.y)), Color(0.86, 0.90, 0.84))
			bush_counts["meadow_low"] = int(bush_counts.get("meadow_low", 0)) + 1
		elif roll2 < 0.19:
			var sc_h2 := rng.randf_range(0.24, 0.40)
			_env_kit.append_multimesh("bush_heather", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(sc_h2, sc_h2 * rng.randf_range(0.8, 1.2), sc_h2)), Vector3(p4.x, py4, p4.y)), Color(0.88, 0.88, 0.90))
			bush_counts["heather_low"] = int(bush_counts.get("heather_low", 0)) + 1
		elif roll2 < 0.24:
			_env_kit.append_multimesh("twig_debris", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * rng.randf_range(0.65, 1.05)), Vector3(p4.x, py4, p4.y)), Color(0.88, 0.84, 0.78))

	# Fairy ring of small mushrooms in the damp northern grass glade of the clearing
	var ring_c := Vector2(27.0, 7.5)
	for ri in range(12):
		var ra := float(ri) * TAU / 12.0
		var rp := ring_c + Vector2(cos(ra), sin(ra)) * 1.05
		place_mush_cluster.call("parasol" if ri % 4 == 0 else "brown", Vector3(rp.x, _eval_forest_play_height(rp.x, rp.y), rp.y), float(ri) * 1.3, 1, 1.18)
	mush_clusters += 1

	var mm_stats := _env_kit.flush_multimeshes(_grp_vegetation, "ForestFlora_")
	var batch_stats := _env_kit.flush_batches(_grp_vegetation, "ForestFlora_")
	for mk_s in mm_stats.keys():
		batch_stats[mk_s] = mm_stats[mk_s]
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
