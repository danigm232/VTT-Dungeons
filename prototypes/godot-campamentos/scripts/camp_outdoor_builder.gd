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
const CoastalKit = preload("res://scripts/camp_coastal_kit.gd")
const MarineEco = preload("res://scripts/camp_marine_ecosystem.gd")

const BEACH_WATER_Y := -0.18
const CLIFF_SEA_Y := -14.8
const COVE_WATER_Y := -0.18

var cutaway_tents: Array[Dictionary] = []
var chest_lids: Dictionary = {}
var bedrolls: Dictionary = {}
var seat_anchors: Dictionary = {}
var shelter_anchors: Dictionary = {}
var fauna_agents: Array[Dictionary] = []
var _marine_anim_state: Dictionary = {}

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

func _beach_shore_z(wx: float) -> float:
	# Asymmetric curving coastal bay: rocky west headland, graceful sandy crescent, open eastern reef bay for shipwreck
	var bay_curve := 24.4 + sin(wx * 0.145 + 0.35) * 1.35 + cos(wx * 0.29 - 0.55) * 0.55
	var center_in := smoothstep(9.0, 22.0, wx) * (1.0 - smoothstep(26.0, 36.0, wx)) * 1.25
	var west_head := smoothstep(6.0, -5.0, wx) * 4.2
	# Curve east bay gently back north around wx > 29 so the shipwreck sits visibly IN turquoise reef water!
	var east_bay := smoothstep(28.5, 42.0, wx) * 2.2
	return bay_curve - center_in + west_head - east_bay

func _eval_beach_height(wx: float, wz: float, width_m: float, depth_m: float) -> float:
	var shore_z := _beach_shore_z(wx)
	# Subtle flat bivouac terrace across playable camp so ALL 296 walkable tiles have smooth footing & zero rejections!
	var camp_d := Vector2((wx - 18.2) * 0.85, (wz - 13.4) * 1.05).length()
	var camp_flat := 1.0 - smoothstep(4.8, 10.5, camp_d)
	var ripple := (sin(wx * 0.22 + 0.4) * cos(wz * 0.20 - 0.3) * 0.08 + sin((wx - wz) * 0.38) * 0.035) * (1.0 - camp_flat)
	var h := ripple * 0.45

	# Smooth coastal slope down across damp swash into sloping underwater seabed
	if wz > shore_z - 4.4:
		var swash_t := clampf((wz - (shore_z - 4.4)) / 4.4, 0.0, 1.0)
		var swash_y := lerpf(h, BEACH_WATER_Y, swash_t * swash_t * (3.0 - 2.0 * swash_t))
		if wz <= shore_z:
			h = swash_y
		else:
			var d_sea := wz - shore_z
			# Gentle 5.2m coastal wading shelf -> progressive sloping reef & diving seabed (-3.6m)
			var wade_t := smoothstep(0.0, 5.2, d_sea)
			var shelf_t := smoothstep(4.6, 15.5, d_sea)
			var deep_t := smoothstep(14.0, 26.0, d_sea)
			var wy_w := lerpf(BEACH_WATER_Y, BEACH_WATER_Y - 0.48, wade_t)
			var wy_s := lerpf(wy_w, BEACH_WATER_Y - 2.35, shelf_t)
			var wy_d := lerpf(wy_s, BEACH_WATER_Y - 3.95, deep_t)
			# Shallow reef shelf under eastern shipwreck so turquoise surf wraps around hull
			var wreck_d := Vector2((wx - 35.6) * 0.82, (wz - 28.8) * 1.05).length()
			var reef_shelf := (1.0 - smoothstep(2.5, 9.0, wreck_d)) * 0.48
			h = wy_d + reef_shelf + sin(wx * 0.28) * cos(wz * 0.26) * 0.08
	else:
		# Sculpted asymmetric northern sandstone bluffs & dunes starting cleanly OUTSIDE northern walkable rows (wz < 4.4)!
		var north_d := maxf(0.0, 4.4 - wz)
		var west_d := maxf(0.0, 1.6 - wx)
		var east_d := maxf(0.0, wx - (width_m - 1.6))
		var nw_bias := lerpf(1.36, 0.88, clampf(wx / maxf(1.0, width_m), 0.0, 1.0))
		var rim := sqrt(north_d * north_d * 1.18 + west_d * west_d * 0.92 + east_d * east_d * 0.88)
		if rim > 0.15:
			var bluff_rise := minf(6.4, pow(rim, 1.12) * 0.31 * nw_bias)
			var crag_n := sin(wx * 0.31 + wz * 0.22) * 0.44 + cos(wx * 0.62 - wz * 0.48) * 0.20
			h += bluff_rise + crag_n * smoothstep(0.5, 5.5, rim)
		# Keep western headland rising gently seaward of x<1.8
		if wx < 2.2 and wz > 12.0 and wz < shore_z + 2.0:
			var hw := smoothstep(2.2, -5.5, wx) * (1.0 - smoothstep(shore_z - 2.0, shore_z + 3.0, wz))
			h += hw * 2.2 + sin(wz * 0.45) * 0.20 * hw
	return h

func _eval_beach_vertex_color(wx: float, wz: float, h: float) -> Color:
	var shore_z := _beach_shore_z(wx)
	# R: smooth curved moisture gradient from dry sand -> damp swash -> submerged seabed
	var moist := smoothstep(shore_z - 4.4, shore_z + 0.55, wz)
	# G: coastal pebble/shell wrack band along tide edge + rocky bluff foot gravel
	var wrack_d := absf(wz - (shore_z - 3.6))
	var wrack := (1.0 - smoothstep(0.5, 2.5, wrack_d)) * 0.72
	var bluff_gravel := smoothstep(0.32, 1.45, h) * 0.85
	# B: compacted camp traffic sand + subtle keel drag furrow behind StrandedRowboat (6.75, 20.25)
	var camp_wear := 1.0 - smoothstep(2.4, 7.6, Vector2((wx - 18.2) * 0.85, (wz - 13.6) * 1.15).length())
	var furrow_d := _seg_dist_2d(Vector2(wx, wz), Vector2(6.75, 20.25), Vector2(7.6, 24.4))
	var furrow := (1.0 - smoothstep(0.35, 1.35, furrow_d)) * 0.75
	return Color(clampf(moist, 0.0, 1.0), clampf(maxf(wrack, bluff_gravel), 0.0, 1.0), clampf(maxf(camp_wear * 0.65, furrow), 0.0, 1.0), 1.0)

func _cliff_arrival_trail_info(wx: float, wz: float) -> Dictionary:
	# Canonical SW highland arrival road climbing from El Retiro (observatory-coast / observatory-inland) onto the camp terrace
	var u := clampf((wx - (-22.0)) / 28.0, 0.0, 1.0)
	var su := u * u * (3.0 - 2.0 * u)
	var tz := lerpf(32.5, 20.6, su) + sin(u * PI * 1.4) * 1.65
	var ty := lerpf(-5.6, 0.0, pow(su, 0.92))
	var dist := absf(wz - tz)
	if wx < -22.5:
		dist = Vector2(wx + 22.5, wz - 32.5).length()
	elif wx > 6.4:
		dist = Vector2(wx - 6.4, wz - 20.6).length()
	return {"dist": dist, "z": tz, "y": ty, "u": u}

func _cliff_rim_signed_dist(wx: float, wz: float, width_m: float, depth_m: float) -> float:
	# Continental Cornice Promontory (Option A): rounded-jagged rocky rim enclosing all 307 canonical tiles with ZERO harsh 90-degree corners!
	var cx := width_m * 0.50 + 0.6
	var cz := depth_m * 0.50 - 0.4
	var ang := atan2(wz - cz, wx - cx)
	var jag := sin(ang * 5.0 + 0.6) * 1.45 + cos(ang * 8.0 - 1.1) * 0.85 + sin(ang * 13.0 + 2.0) * 0.42
	var nx_e := (wx - cx) / (17.2 + jag * 0.55)
	var nz_e := (wz - cz) / (14.4 + jag * 0.48)
	var r_se := pow(pow(absf(nx_e), 3.0) + pow(absf(nz_e), 3.0), 1.0 / 3.0)
	var d_rim := (r_se - 1.0) * 15.0 + jag * 0.42
	# Softly rounded-corner protective box enclosing all canonical walkable tiles (cols 2..22, rows 2..19 -> x in [3.0, 34.5], z in [3.0, 30.0])
	var r_rad := 3.2
	var qx := maxf(0.0, absf(wx - 18.75) - (16.1 - r_rad))
	var qz := maxf(0.0, absf(wz - 16.40) - (13.8 - r_rad))
	var rbox_out := sqrt(qx * qx + qz * qz) - r_rad + jag * 0.28
	if rbox_out <= 0.01:
		return minf(d_rim, -0.45)
	return maxf(d_rim, rbox_out * 0.88)

func _eval_cliff_height(wx: float, wz: float, width_m: float, depth_m: float) -> float:
	var ti := _cliff_arrival_trail_info(wx, wz)
	var tz_tr: float = float(ti["z"])
	var ty_tr: float = float(ti["y"])
	var d_tr: float = float(ti["dist"])

	# 1. Playable upper watch-terrace micro-relief (<= +-0.075m so all 307 canonical walkable tiles stay 100% valid!)
	var sanctuary_d := Vector2(wx - 19.0, wz - 12.6).length()
	var sanct_flat := 1.0 - smoothstep(5.6, 8.8, sanctuary_d)
	var plat_h := (sin(wx * 0.27 + 0.5) * cos(wz * 0.25 - 0.4) * 0.060 + sin((wx + wz) * 0.48) * 0.024) * (1.0 - sanct_flat * 0.86)

	var d_rim := _cliff_rim_signed_dist(wx, wz, width_m, depth_m)
	var h := plat_h

	if d_rim > 0.0:
		# Sheer multi-tier basalt precipice drop on East, South-East, and North Sea-Chasm!
		var t_drop := clampf(d_rim / 9.0, 0.0, 1.0)
		var strata_step := floorf(t_drop * 4.0) * 0.25
		var stepped_t := lerpf(t_drop, strata_step + smoothstep(0.0, 1.0, fposmod(t_drop * 4.0, 1.0)) * 0.25, 0.45)
		var drop := smoothstep(0.0, 1.0, stepped_t) * 16.8
		var shelf_rip := sin(wx * 0.38 + wz * 0.29) * 0.62 + cos(wx * 0.72 - wz * 0.58) * 0.32
		var sheer_h := plat_h - drop + shelf_rip * smoothstep(0.2, 3.0, d_rim) * (1.0 - smoothstep(8.2, 13.5, d_rim))

		# 2. Broad Gently-Terraced Continental Stormwreck Highland Massif across West, NW & SW (ZERO trench at x=-2!)
		var cont_w := smoothstep(6.2, -4.5, wx) * smoothstep(56.0, 32.0, wz) * smoothstep(-14.0, 2.5, wz)
		var cont_nw := smoothstep(7.5, -8.0, wx) * smoothstep(4.5, -10.0, wz) * smoothstep(-28.0, -14.0, wz)
		var sw_shoulder := smoothstep(16.0, 2.0, wx) * smoothstep(28.5, 34.5, wz) * (1.0 - smoothstep(46.0, 62.0, wz))
		var massif_mask := clampf(maxf(cont_w, cont_nw * 0.90), 0.0, 1.0)

		h = sheer_h
		if massif_mask > 0.001:
			# Smooth terraced mountain benches climbing organically westward from the plateau edge with zero dip/trench!
			var north_of_trail := smoothstep(tz_tr + 2.5, tz_tr - 14.0, wz)
			var west_ramp := smoothstep(4.5, -18.0, wx)
			var raw_rise := lerpf(-0.6, 5.4, north_of_trail) * west_ramp
			var west_boost := smoothstep(-10.0, -38.0, wx) * 4.2 * north_of_trail
			var bench_t := clampf((raw_rise + west_boost) / 9.0, 0.0, 1.0)
			var bench_step := floorf(bench_t * 3.0) / 3.0
			var terraced_rise := lerpf(raw_rise + west_boost, (bench_step + smoothstep(0.0, 1.0, fposmod(bench_t * 3.0, 1.0)) / 3.0) * 9.0, 0.35)
			var m_crag := (sin(wx * 0.22 + wz * 0.19) * 0.85 + cos(wx * 0.48 - wz * 0.38) * 0.38) * west_ramp
			var cont_h := plat_h + terraced_rise + m_crag
			h = maxf(h, lerpf(sheer_h, cont_h, smoothstep(0.02, 0.38, massif_mask)))

		if sw_shoulder > 0.001:
			# Rugged stepped rocky SW foreground headland shoulder supporting the outer arrival stairs
			var sh_drop := lerpf(-1.4, -7.2, smoothstep(29.8, 48.0, wz)) + sin(wx * 0.32 + wz * 0.26) * 0.78
			h = maxf(h, lerpf(sheer_h, sh_drop, smoothstep(0.05, 0.62, sw_shoulder)))

		# 3. Smoothly carved graded SW Arrival Staircase & Highland Roadbed (connects Retiro seamlessly to plateau!)
		if wx < 7.2 and wz > 12.0 and wz < 46.0:
			var trail_w := 1.0 - smoothstep(2.0, 5.4, d_tr)
			var trail_zone := smoothstep(7.0, 3.0, wx) * smoothstep(44.0, 33.0, wz)
			if trail_w > 0.001 and trail_zone > 0.001:
				h = lerpf(h, ty_tr, clampf(trail_w * trail_zone, 0.0, 1.0))

		# 4. Sculpted Northern Clifftop Observatory Headland Crag across Open Sea-Chasm (x=27.4, z=-17.8, summit y=+1.55m!)
		var obs_rel := Vector2((wx - 27.4) * 0.96, (wz - (-17.8)) * 1.04)
		var obs_ang := atan2(obs_rel.y, obs_rel.x)
		var obs_jag := sin(obs_ang * 5.0 + 1.1) * 0.65 + cos(obs_ang * 7.0) * 0.38
		var obs_r := obs_rel.length() + obs_jag
		if obs_r < 12.8:
			var summit_flat := 1.0 - smoothstep(4.2, 6.8, obs_r)
			var crag_skirt := 1.0 - smoothstep(5.4, 12.2, obs_r)
			var obs_h := lerpf(CLIFF_SEA_Y - 1.5, 1.55, smoothstep(0.0, 1.0, crag_skirt))
			obs_h = lerpf(obs_h, 1.55, summit_flat)
			# Lower ascending rock nose receiving the stone-arch bridge far landing at (24.6, -11.4, y=0.95m)
			var nose_d := Vector2((wx - 24.6) * 1.18, (wz - (-12.2)) * 0.92).length()
			var nose_m := 1.0 - smoothstep(1.8, 4.6, nose_d)
			obs_h = maxf(obs_h, lerpf(CLIFF_SEA_Y - 1.5, 0.95, nose_m))
			obs_h += sin(wx * 0.35 + wz * 0.31) * 0.32 * (1.0 - summit_flat)
			h = maxf(h, obs_h)

	return h

func _eval_cliff_vertex_color(wx: float, wz: float, h: float) -> Color:
	var ti := _cliff_arrival_trail_info(wx, wz)
	# R = ancient carved astronomical ruin plaza & flagstones (centered at 19.0, 12.6)
	var d_ruin := Vector2((wx - 19.0) * 0.96, (wz - 12.6) * 1.04).length()
	var ruin_m := (1.0 - smoothstep(5.5, 8.0, d_ruin)) * smoothstep(-0.35, -0.05, h)

	# B = worn pilgrimage roadbed: SW Retiro arrival stairs + camp connector + North Observatory causeway!
	var d_tr: float = float(ti["dist"])
	var tr_sw := (1.0 - smoothstep(1.35, 2.95, d_tr)) * smoothstep(8.2, 4.2, wx)
	var p2 := Vector2(wx, wz)
	var tr_join := 1.0 - smoothstep(1.25, 2.75, _seg_dist_2d(p2, Vector2(5.4, 20.5), Vector2(13.8, 17.4)))
	var tr_causeway := 1.0 - smoothstep(1.35, 2.85, _seg_dist_2d(p2, Vector2(19.0, 6.5), Vector2(19.4, 1.2)))
	var tr_camp := (1.0 - smoothstep(1.8, 4.8, Vector2((wx - 17.0) * 0.88, (wz - 14.8) * 0.95).length())) * 0.55
	var path_b := clampf(maxf(maxf(tr_sw, tr_join * 0.85), maxf(tr_causeway * 0.92, tr_camp)) * (1.0 - ruin_m * 0.65), 0.0, 1.0)

	# G = highland turf, alpine moss & crevice grass along continental west slopes, SW trail banks, rim crevices & Observatory crag
	var west_ridge := smoothstep(12.5, -2.5, wx) * smoothstep(-3.5, 0.8, h) * 0.88
	var rim_moss := (1.0 - smoothstep(0.8, 4.5, absf(h + 0.05))) * (0.34 + 0.36 * sin(wx * 0.32) * cos(wz * 0.29))
	var obs_turf := smoothstep(2.5, 4.4, h) * smoothstep(-14.0, -22.0, wz) * 0.72
	var moss_m := clampf(maxf(maxf(west_ridge, rim_moss), obs_turf) * (1.0 - ruin_m * 0.88) * (1.0 - path_b * 0.72), 0.0, 1.0)
	return Color(clampf(ruin_m, 0.0, 1.0), clampf(moss_m, 0.0, 1.0), path_b, 1.0)

func _cove_shore_z(wx: float) -> float:
	# Asymmetric crescent sandy cove framed by West & East rocky headlands (all 328 canonical walkable tiles stay safely dry/wadeable!)
	var base := 30.2 + sin(wx * 0.16 + 0.4) * 0.72 + cos(wx * 0.31 - 0.5) * 0.38
	var west_arm := smoothstep(9.5, -2.5, wx) * 3.8
	var east_arm := smoothstep(26.5, 38.5, wx) * 4.4
	return base - west_arm - east_arm

func _cove_trail_info(wx: float, wz: float) -> Dictionary:
	# Curved visible descending western coastal access path from upper west ridge (-16, 15.2, y=3.35m) down to cove beach (5.8, 23.8, y=0.0m)
	var u := clampf((wx - (-16.0)) / 21.8, 0.0, 1.0)
	var su := u * u * (3.0 - 2.0 * u)
	var tz := lerpf(15.2, 23.8, su) + sin(u * PI) * 1.15
	var ty := lerpf(3.35, 0.0, su)
	var dist := absf(wz - tz)
	if wx < -16.5:
		dist = Vector2(wx + 16.5, wz - 15.2).length()
	elif wx > 6.2:
		dist = Vector2(wx - 6.2, wz - 23.8).length()
	return {"dist": dist, "z": tz, "y": ty, "u": u}

func _eval_cove_height(wx: float, wz: float, width_m: float, depth_m: float) -> float:
	var shore_z := _cove_shore_z(wx)
	# Playable elliptical cove+cave basin enclosing all 328 canonical tiles (cols 1..23, rows 2..19)
	var ex := (wx - 18.75) / 18.2
	var ez := (wz - 16.35) / 13.8
	var r_oval := sqrt(ex * ex + ez * ez)

	# Gentle organic floor micro-undulation inside playable zone (<= +-0.035m so all 328 walkable cells stay 100% valid!)
	var floor_y := sin(wx * 0.28 + 0.5) * cos(wz * 0.26 - 0.3) * 0.032

	# 3 real carved recessed natural tidepool / mineral spring basins matching canonical water cells!
	var d_pool_w := Vector2((wx - 7.2) * 0.85, (wz - 11.75) * 0.95).length()
	var d_pool_e := Vector2((wx - 29.8) * 0.80, (wz - 13.35) * 0.88).length()
	var d_pool_s := Vector2((wx - 15.0) * 0.78, (wz - 24.75) * 1.05).length()
	var basin_w := (1.0 - smoothstep(0.65, 1.85, d_pool_w)) * 0.115
	var basin_e := (1.0 - smoothstep(0.75, 2.25, d_pool_e)) * 0.125
	var basin_s := (1.0 - smoothstep(0.70, 1.95, d_pool_s)) * 0.115
	floor_y -= maxf(basin_w, maxf(basin_e, basin_s))

	var h := floor_y

	# Southern cove beach sloping smoothly down into turquoise cove sea
	if wz > shore_z - 3.6:
		var sw_t := clampf((wz - (shore_z - 3.6)) / 3.6, 0.0, 1.0)
		var sw_y := lerpf(floor_y, COVE_WATER_Y, sw_t * sw_t * (3.0 - 2.0 * sw_t))
		if wz <= shore_z:
			h = sw_y
		else:
			var d_sea := wz - shore_z
			# Gentle 3.6m cove wading shelf -> smooth progressive diving seabed (-2.1m by z=38.5, -3.95m inside reef arc!)
			var wade_t := smoothstep(0.0, 3.6, d_sea)
			var shelf_t := smoothstep(2.8, 10.6, d_sea)
			var deep_t := smoothstep(9.5, 19.5, d_sea)
			var wy_w := lerpf(COVE_WATER_Y, COVE_WATER_Y - 0.46, wade_t)
			var wy_s := lerpf(wy_w, COVE_WATER_Y - 2.45, shelf_t)
			var wy_d := lerpf(wy_s, COVE_WATER_Y - 3.95, deep_t)
			h = wy_d + sin(wx * 0.25) * cos(wz * 0.24) * 0.09
	else:
		# Rising coastal cliff massif enclosing the North, NW, and East sides of the sea cave!
		var cliff_out := maxf(0.0, r_oval - 0.96)
		if cliff_out > 0.001 and wz < shore_z - 1.2:
			var sea_taper := 1.0 - smoothstep(shore_z - 8.5, shore_z - 1.0, wz)
			var cliff_rise := minf(7.8, pow(cliff_out * 14.5, 1.15) * 0.44) * sea_taper
			var crag := (sin(wx * 0.26 + wz * 0.21) * 0.55 + cos(wx * 0.54 - wz * 0.44) * 0.28) * smoothstep(0.05, 0.35, cliff_out)
			h = floor_y + cliff_rise + crag * sea_taper

	# Western headland rocky ridge & smoothly carved descending coastal access trail!
	if wx < 7.5 and wz < shore_z + 2.5:
		var ti := _cove_trail_info(wx, wz)
		var td: float = float(ti["dist"])
		var ty: float = float(ti["y"])
		var trail_w := 1.0 - smoothstep(1.35, 3.15, td)
		var trail_zone := smoothstep(7.2, 3.8, wx) * (1.0 - smoothstep(shore_z - 1.5, shore_z + 1.8, wz))
		if trail_w > 0.001 and trail_zone > 0.001:
			h = lerpf(h, ty, trail_w * trail_zone)
		# Keep the coastal cliff rising naturally NORTH of the trail and dropping seaward SOUTH of the trail
		if wx < 2.5 and wz > float(ti["z"]) + 2.2 and wz < shore_z:
			var drop_s := smoothstep(float(ti["z"]) + 2.0, shore_z, wz)
			h = lerpf(h, COVE_WATER_Y + 0.15, drop_s * 0.72)

	return h

func _eval_cove_vertex_color(wx: float, wz: float, h: float) -> Color:
	var shore_z := _cove_shore_z(wx)
	# A = interior cave shelter mask (1.0 = sheltered dry cave chambers z <= 20.2, immune to outdoor rain/snow!)
	var in_x := smoothstep(0.8, 3.2, wx) * (1.0 - smoothstep(34.2, 36.8, wx))
	var in_z := smoothstep(1.4, 3.8, wz) * (1.0 - smoothstep(18.6, 20.8, wz))
	var cave_a := clampf(in_x * in_z * (1.0 - smoothstep(0.9, 2.2, h)), 0.0, 1.0)

	# R = descending western coastal dirt/stone path
	var ti := _cove_trail_info(wx, wz)
	var trail_r := (1.0 - smoothstep(1.25, 2.55, float(ti["dist"]))) * smoothstep(7.8, 4.5, wx) * (1.0 - cave_a * 0.85)

	# G = golden-ochre cove beach sand strictly across the low sunlit cove (h < 0.35m, ZERO sand smear up west cliff!)
	var sand_g := smoothstep(18.6, 21.8, wz) * (1.0 - smoothstep(shore_z + 2.5, shore_z + 6.0, wz)) * (1.0 - smoothstep(0.18, 0.48, h)) * smoothstep(-2.5, 2.5, wx)
	# Subtle golden sand drift spilling gently just inside the cave mouth threshold!
	var mouth_sand := (1.0 - smoothstep(2.2, 5.8, Vector2((wx - 18.75) * 0.72, (wz - 20.2) * 1.15).length())) * 0.62 * (1.0 - smoothstep(0.15, 0.45, h))
	sand_g = clampf(maxf(sand_g, mouth_sand) * (1.0 - trail_r * 0.75), 0.0, 1.0)

	# B = wet shoreline swash, recessed tidepools & wet eastern mineral spring grotto!
	var swash_b := smoothstep(shore_z - 3.6, shore_z + 0.4, wz)
	var pool_w_b := 1.0 - smoothstep(0.9, 2.35, Vector2(wx - 7.2, wz - 11.75).length())
	var pool_e_b := 1.0 - smoothstep(1.2, 3.85, Vector2(wx - 29.8, wz - 13.35).length())
	var pool_s_b := 1.0 - smoothstep(0.9, 2.45, Vector2(wx - 15.0, wz - 24.75).length())
	var damp_b := clampf(maxf(maxf(swash_b, pool_s_b), maxf(pool_w_b * 0.85, pool_e_b)), 0.0, 1.0)

	return Color(clampf(trail_r, 0.0, 1.0), sand_g, damp_b, cave_a)

func eval_ground_height(wx: float, wz: float) -> float:
	if _build_profile == "forest":
		if Structure.is_on_forest_bridge(Vector3(wx, 0.0, wz)):
			return 0.16
		if wx >= -0.5 and wx <= _build_width_m + 0.5 and wz >= -0.5 and wz <= _build_depth_m + 0.5:
			return maxf(-0.23, _eval_forest_play_height(wx, wz))
		return maxf(-0.23, _eval_skirt_height("forest", wx, wz, _build_width_m, _build_depth_m))
	elif _build_profile == "wreck-beach":
		return _eval_beach_height(wx, wz, _build_width_m, _build_depth_m)
	elif _build_profile == "cliff-observatory":
		return _eval_cliff_height(wx, wz, _build_width_m, _build_depth_m)
	elif _build_profile == "coastal-refuge":
		return _eval_cove_height(wx, wz, _build_width_m, _build_depth_m)
	return _eval_skirt_height(_build_profile, wx, wz, _build_width_m, _build_depth_m)

func has_coastal_sea() -> bool:
	return _build_profile in ["coastal-refuge", "wreck-beach"]

func get_sea_level_y() -> float:
	if _build_profile == "coastal-refuge":
		return COVE_WATER_Y
	if _build_profile == "wreck-beach":
		return BEACH_WATER_Y
	return 0.0

func sample_aquatic_floor_height(wx: float, wz: float) -> float:
	if _build_profile == "coastal-refuge":
		return _eval_cove_height(wx, wz, _build_width_m, _build_depth_m)
	if _build_profile == "wreck-beach":
		return _eval_beach_height(wx, wz, _build_width_m, _build_depth_m)
	return eval_ground_height(wx, wz)

func sample_sea_current_push(world_pos: Vector3) -> Vector3:
	if not has_coastal_sea():
		return Vector3.ZERO
	var push := Vector3.ZERO
	var is_cove := _build_profile == "coastal-refuge"
	var chan_z := 46.8 if is_cove else 45.6
	if world_pos.z >= chan_z and world_pos.x >= 11.5 and world_pos.x <= 26.0:
		var t_ch := clampf((world_pos.z - chan_z) / 5.2, 0.0, 1.0)
		push += Vector3(0.0, 0.0, -lerpf(1.6, 7.2, t_ch * t_ch))
	var c_center := Vector2(18.5, 31.5) if is_cove else Vector2(18.0, 26.8)
	var rx := 20.5 if is_cove else 22.0
	var rz := 21.0 if is_cove else 24.0
	var rel := Vector2((world_pos.x - c_center.x) / rx, (world_pos.z - c_center.y) / rz)
	var r := rel.length()
	if world_pos.z > c_center.y and r > 0.92:
		var t_ring := clampf((r - 0.92) / 0.16, 0.0, 1.0)
		var inward := (c_center - Vector2(world_pos.x, world_pos.z)).normalized()
		var mag := lerpf(1.4, 7.6, t_ring * t_ring)
		push += Vector3(inward.x * mag, 0.0, inward.y * mag)
	return push

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
	if not _marine_anim_state.is_empty():
		MarineEco.animate_marine_life(_marine_anim_state, _fauna_time, get_sea_level_y())
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
	_marine_anim_state.clear()
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
	var mat_water_tile: Material
	if profile == "coastal-refuge":
		mat_water_tile = _create_cave_pool_shader()
	else:
		mat_water_tile = MatKit.create_water_shader_material(Color(0.071, 0.271, 0.322, 0.76), Color(0.173, 0.443, 0.490, 0.54), Color("#d6eef2"), 0.014, 1.15, 0.0, Vector2(0.0, 0.2), 0.35, 0.35)

	match profile:
		"forest":
			var forest_ground_mat := MatKit.create_forest_terrain_shader_material(true)
			mat_primary = forest_ground_mat
			mat_ground_splat = forest_ground_mat
		"wreck-beach":
			var beach_ground_mat := CoastalKit.create_beach_terrain_shader(true)
			mat_primary = beach_ground_mat
			mat_ground_splat = beach_ground_mat
		"cliff-observatory":
			var cliff_ground_mat := CoastalKit.create_cliff_basalt_shader(true)
			mat_primary = cliff_ground_mat
			mat_ground_splat = cliff_ground_mat
		"coastal-refuge":
			var cove_ground_mat := CoastalKit.create_cove_cave_terrain_shader(true)
			if OS.get_cmdline_user_args().has("--greybox"):
				var gb_mat := StandardMaterial3D.new()
				gb_mat.albedo_color = Color("#9aa09e")
				gb_mat.roughness = 0.92
				mat_primary = gb_mat
				mat_ground_splat = null
			else:
				mat_primary = cove_ground_mat
				mat_ground_splat = cove_ground_mat
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
	elif profile == "wreck-beach":
		# Continuous sculpted sinuous cove beach heightfield with exact moisture/wrack/bluff vertex channels
		# Eliminates ALL rectangular wet-sand tile seams and matches 1:1 with trimesh collision & OuterTerrainSkirt!
		var step_b := 0.75
		var gx0 := -1.5; var gx1 := width_m + 1.5
		var gz0 := -1.5; var gz1 := depth_m + 1.5
		var nx_b := int(round((gx1 - gx0) / step_b))
		var nz_b := int(round((gz1 - gz0) / step_b))
		var b_pts: Array = []
		var b_cols: Array = []
		for iz in range(nz_b + 1):
			var vz := lerpf(gz0, gz1, float(iz) / float(nz_b))
			var p_row: Array[Vector3] = []
			var c_row: Array[Color] = []
			for ix in range(nx_b + 1):
				var vx := lerpf(gx0, gx1, float(ix) / float(nx_b))
				var vy := _eval_beach_height(vx, vz, width_m, depth_m)
				p_row.append(Vector3(vx, vy, vz))
				c_row.append(_eval_beach_vertex_color(vx, vz, vy))
			b_pts.append(p_row)
			b_cols.append(c_row)
		for iz in range(nz_b):
			for ix in range(nx_b):
				var a: Vector3 = b_pts[iz][ix]
				var b: Vector3 = b_pts[iz][ix + 1]
				var c: Vector3 = b_pts[iz + 1][ix + 1]
				var d: Vector3 = b_pts[iz + 1][ix]
				var ca: Color = b_cols[iz][ix]
				var cb: Color = b_cols[iz][ix + 1]
				var cc: Color = b_cols[iz + 1][ix + 1]
				var cd: Color = b_cols[iz + 1][ix]
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cb); st_g.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st_g.add_vertex(b)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(cd); st_g.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st_g.add_vertex(d)
		has_g = true
	elif profile == "cliff-observatory":
		# Continuous sculpted stratified basalt promontory + astronomical ruin plaza (matches trimesh collision 1:1!)
		var step_c := 0.75
		var gx0 := -1.5; var gx1 := width_m + 1.5
		var gz0 := -1.5; var gz1 := depth_m + 1.5
		var nx_c := int(round((gx1 - gx0) / step_c))
		var nz_c := int(round((gz1 - gz0) / step_c))
		var c_pts: Array = []
		var c_cols: Array = []
		for iz in range(nz_c + 1):
			var vz := lerpf(gz0, gz1, float(iz) / float(nz_c))
			var p_row: Array[Vector3] = []
			var col_row: Array[Color] = []
			for ix in range(nx_c + 1):
				var vx := lerpf(gx0, gx1, float(ix) / float(nx_c))
				var vy := _eval_cliff_height(vx, vz, width_m, depth_m)
				p_row.append(Vector3(vx, vy, vz))
				col_row.append(_eval_cliff_vertex_color(vx, vz, vy))
			c_pts.append(p_row)
			c_cols.append(col_row)
		for iz in range(nz_c):
			for ix in range(nx_c):
				var a: Vector3 = c_pts[iz][ix]; var b: Vector3 = c_pts[iz][ix + 1]
				var c: Vector3 = c_pts[iz + 1][ix + 1]; var d: Vector3 = c_pts[iz + 1][ix]
				var ca: Color = c_cols[iz][ix]; var cb: Color = c_cols[iz][ix + 1]
				var cc: Color = c_cols[iz + 1][ix + 1]; var cd: Color = c_cols[iz + 1][ix]
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cb); st_g.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st_g.add_vertex(b)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(cd); st_g.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st_g.add_vertex(d)
		has_g = true
	elif profile == "coastal-refuge":
		# Continuous sculpted sea-cave + sandy cove + descending coastal trail heightfield with 3 real carved tidepool basins!
		var step_r := 0.75
		var gx0 := -1.5; var gx1 := width_m + 1.5
		var gz0 := -1.5; var gz1 := depth_m + 1.5
		var nx_r := int(round((gx1 - gx0) / step_r))
		var nz_r := int(round((gz1 - gz0) / step_r))
		var r_pts: Array = []
		var r_cols: Array = []
		for iz in range(nz_r + 1):
			var vz := lerpf(gz0, gz1, float(iz) / float(nz_r))
			var p_row: Array[Vector3] = []
			var col_row: Array[Color] = []
			for ix in range(nx_r + 1):
				var vx := lerpf(gx0, gx1, float(ix) / float(nx_r))
				var vy := _eval_cove_height(vx, vz, width_m, depth_m)
				p_row.append(Vector3(vx, vy, vz))
				col_row.append(_eval_cove_vertex_color(vx, vz, vy))
			r_pts.append(p_row)
			r_cols.append(col_row)
		for iz in range(nz_r):
			for ix in range(nx_r):
				var a: Vector3 = r_pts[iz][ix]; var b: Vector3 = r_pts[iz][ix + 1]
				var c: Vector3 = r_pts[iz + 1][ix + 1]; var d: Vector3 = r_pts[iz + 1][ix]
				var ca: Color = r_cols[iz][ix]; var cb: Color = r_cols[iz][ix + 1]
				var cc: Color = r_cols[iz + 1][ix + 1]; var cd: Color = r_cols[iz + 1][ix]
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cb); st_g.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st_g.add_vertex(b)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(ca); st_g.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st_g.add_vertex(a)
				st_g.set_color(cc); st_g.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st_g.add_vertex(c)
				st_g.set_color(cd); st_g.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st_g.add_vertex(d)
		has_g = true
		# Organic contoured water surfaces nestled inside the 3 real carved rock basins (ZERO flat blue grid squares!)
		var pool_defs := [
			[Vector2(7.2, 11.75), 1.48, 1.32, -0.042],  # West seepage pool
			[Vector2(29.8, 13.35), 1.88, 1.68, -0.036], # East mineral spring basin (Rincón natural)
			[Vector2(15.0, 24.75), 1.65, 1.25, -0.046], # South cove beach rocky tidepool
		]
		for pdef in pool_defs:
			var pc: Vector2 = pdef[0]
			var rx_p: float = float(pdef[1])
			var rz_p: float = float(pdef[2])
			var py_w: float = float(pdef[3])
			var segs_p := 18
			var center_v := Vector3(pc.x, py_w, pc.y)
			for si in range(segs_p):
				var a0 := float(si) * TAU / float(segs_p)
				var a1 := float(si + 1) * TAU / float(segs_p)
				var j0 := 1.0 + sin(a0 * 3.0 + pc.x) * 0.14 + cos(a0 * 5.0) * 0.07
				var j1 := 1.0 + sin(a1 * 3.0 + pc.x) * 0.14 + cos(a1 * 5.0) * 0.07
				var p0 := Vector3(pc.x + cos(a0) * rx_p * j0, py_w, pc.y + sin(a0) * rz_p * j0)
				var p1 := Vector3(pc.x + cos(a1) * rx_p * j1, py_w, pc.y + sin(a1) * rz_p * j1)
				st_w.set_normal(Vector3.UP); st_w.set_uv(Vector2(0.5, 0.5)); st_w.add_vertex(center_v)
				st_w.set_normal(Vector3.UP); st_w.set_uv(Vector2(0.5 + cos(a0) * 0.5, 0.5 + sin(a0) * 0.5)); st_w.add_vertex(p0)
				st_w.set_normal(Vector3.UP); st_w.set_uv(Vector2(0.5 + cos(a1) * 0.5, 0.5 + sin(a1) * 0.5)); st_w.add_vertex(p1)
		has_w = true
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
		mg.mesh = st_g.commit(); mg.material_override = mat_ground_splat if mat_ground_splat != null else mat_primary; _grp_terrain.add_child(mg)
		if profile in ["forest", "wreck-beach", "cliff-observatory", "coastal-refuge"]:
			mg.create_trimesh_collision()
	if has_w:
		st_w.generate_normals()
		var mw := MeshInstance3D.new(); mw.name = "ShallowWaterCells"
		mw.mesh = st_w.commit(); mw.material_override = mat_water_tile; mw.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; _grp_terrain.add_child(mw)

	var fcs := CollisionShape3D.new()
	var fbox := BoxShape3D.new()
	if profile == "forest":
		# Safety backstop strictly under the flat eastern bivouac core; sculpted GroundPrimary + ForestStreamBed + OuterTerrainSkirt provide exact 1:1 visual/collision height
		var east_w := maxf(4.0, (width_m - 1.5) - 9.5)
		fbox.size = Vector3(east_w, 1.0, depth_m - 2.0)
		fcs.shape = fbox
		fcs.position = Vector3(9.5 + east_w * 0.5, -0.58, depth_m * 0.5)
	elif profile in ["wreck-beach", "coastal-refuge"]:
		# Deep abyssal safety backstop well below diveable seabed (-5.8m) so characters can swim & dive freely!
		fbox.size = Vector3(width_m + 32.0, 1.0, depth_m + 56.0)
		fcs.shape = fbox
		fcs.position = Vector3(width_m * 0.5, -5.85, depth_m * 0.5 + 16.0)
	elif profile == "cliff-observatory":
		# Deep safety backstop beneath continuous sculpted trimesh
		fbox.size = Vector3(width_m + 4.0, 1.0, depth_m + 4.0)
		fcs.shape = fbox
		fcs.position = Vector3(width_m * 0.5, -1.05, depth_m * 0.5)
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
	if profile == "wreck-beach":
		pad_x = 46.0; pad_z_n = 32.0; pad_z_s = 36.0
	elif profile == "cliff-observatory":
		pad_x = 54.0; pad_z_n = 58.0; pad_z_s = 42.0
	elif profile == "coastal-refuge":
		pad_x = 46.0; pad_z_n = 34.0; pad_z_s = 38.0
	var x_min := -pad_x; var x_max := width_m + pad_x
	var z_min := -pad_z_n; var z_max := depth_m + pad_z_s
	var nx := 32; var nz := 28
	if profile == "forest":
		# Extended seamless forest hills & river valley eliminating far straight horizon cutoff
		nx = 84; nz = 70
	elif profile == "cliff-observatory":
		nx = 96; nz = 84
	elif profile in ["wreck-beach", "coastal-refuge"]:
		nx = 76; nz = 60

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array = []
	var cols: Array = []
	for iz in range(nz + 1):
		var row_arr: Array[Vector3] = []
		var col_arr: Array[Color] = []
		var pz := lerpf(z_min, z_max, float(iz) / float(nz))
		for ix in range(nx + 1):
			var px := lerpf(x_min, x_max, float(ix) / float(nx))
			var py := _eval_skirt_height(profile, px, pz, width_m, depth_m)
			row_arr.append(Vector3(px, py, pz))
			if profile == "wreck-beach":
				col_arr.append(_eval_beach_vertex_color(px, pz, py))
			elif profile == "cliff-observatory":
				col_arr.append(_eval_cliff_vertex_color(px, pz, py))
			elif profile == "coastal-refuge":
				col_arr.append(_eval_cove_vertex_color(px, pz, py))
			else:
				col_arr.append(Color(0.0, 0.0, 0.0, 1.0))
		pts.append(row_arr)
		cols.append(col_arr)
	for iz in range(nz):
		for ix in range(nx):
			if profile in ["wreck-beach", "cliff-observatory", "coastal-refuge"]:
				var a: Vector3 = pts[iz][ix]; var b: Vector3 = pts[iz][ix + 1]
				var c: Vector3 = pts[iz + 1][ix + 1]; var d: Vector3 = pts[iz + 1][ix]
				var ca: Color = cols[iz][ix]; var cb: Color = cols[iz][ix + 1]
				var cc: Color = cols[iz + 1][ix + 1]; var cd: Color = cols[iz + 1][ix]
				st.set_color(ca); st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
				st.set_color(cb); st.set_uv(Vector2(b.x * 0.25, b.z * 0.25)); st.add_vertex(b)
				st.set_color(cc); st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
				st.set_color(ca); st.set_uv(Vector2(a.x * 0.25, a.z * 0.25)); st.add_vertex(a)
				st.set_color(cc); st.set_uv(Vector2(c.x * 0.25, c.z * 0.25)); st.add_vertex(c)
				st.set_color(cd); st.set_uv(Vector2(d.x * 0.25, d.z * 0.25)); st.add_vertex(d)
			else:
				_emit_quad(st, pts[iz][ix], pts[iz][ix + 1], pts[iz + 1][ix + 1], pts[iz + 1][ix])
	st.generate_normals()
	var skirt := MeshInstance3D.new()
	skirt.name = "OuterTerrainSkirt"
	skirt.mesh = st.commit()
	skirt.material_override = mat_primary
	_grp_terrain.add_child(skirt)
	if profile in ["forest", "wreck-beach", "cliff-observatory", "coastal-refuge"]:
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
			var bh := _eval_beach_height(px, pz, width_m, depth_m)
			var inside_b := minf(minf(px - (-1.4), (width_m + 1.4) - px), minf(pz - (-1.4), (depth_m + 1.4) - pz))
			if inside_b > 0.0:
				return bh - smoothstep(0.0, 1.5, inside_b) * 0.05
			return bh
		"cliff-observatory":
			var ch := _eval_cliff_height(px, pz, width_m, depth_m)
			var inside_c := minf(minf(px - (-1.4), (width_m + 1.4) - px), minf(pz - (-1.4), (depth_m + 1.4) - pz))
			if inside_c > 0.0:
				return ch - smoothstep(0.0, 1.5, inside_c) * 0.05
			return ch
		"coastal-refuge":
			var rh := _eval_cove_height(px, pz, width_m, depth_m)
			var inside_r := minf(minf(px - (-1.4), (width_m + 1.4) - px), minf(pz - (-1.4), (depth_m + 1.4) - pz))
			if inside_r > 0.0:
				return rh - smoothstep(0.0, 1.5, inside_r) * 0.05
			return rh
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
		if profile in ["wreck-beach", "cliff-observatory", "coastal-refuge"]:
			obj_pos.y = eval_ground_height(obj_pos.x, obj_pos.z)
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
				var bed_y := obj_pos.y + (floor_offset if profile == "coastal-refuge" else 0.0)
				var yaw_jitter := -0.18 if owner == "mia" else (0.22 if owner == "mike" else -0.45)
				var bed_pos := Vector3(obj_pos.x, bed_y, obj_pos.z)
				var bed_yaw := to_fire + PI + yaw_jitter
				var b_entry := PropFactory.create_bedroll(_grp_props, pid, owner, bed_pos, bed_yaw)
				var r_local: Vector3 = b_entry.get("rest_local", Vector3(0.0, 0.06, -0.14))
				b_entry["world_rest_pos"] = bed_pos + r_local.rotated(Vector3.UP, bed_yaw)
				b_entry["world_rest_forward"] = Vector3.BACK.rotated(Vector3.UP, bed_yaw)
				b_entry["stand_pos"] = Structure.tile_to_world(int(pt["col"]), int(pt["row"]), bed_y + 0.05)
				b_entry["fire_pos"] = fire_pos
				bedrolls[pid] = b_entry
			"chest":
				var pack_y := obj_pos.y + (floor_offset if profile == "coastal-refuge" else 0.0)
				var p_entry := PropFactory.create_backpack(_grp_interactables, pid, owner, Vector3(obj_pos.x, pack_y, obj_pos.z), to_fire + 0.35)
				chest_lids[pid] = {"pivot": p_entry["pivot"], "open": false}
			"personal":
				var kit_y := obj_pos.y + (floor_offset if profile == "coastal-refuge" else 0.0)
				PropFactory.create_personal_kit(_grp_props, owner, Vector3(obj_pos.x, kit_y, obj_pos.z), to_fire + 0.25, fx)
			"fire":
				PropFactory.create_campfire_hearth_kit(_grp_props, fx, obj_pos, profile, _env_kit)
			"seat":
				var seat_y := obj_pos.y + (floor_offset if (profile == "coastal-refuge" and int(pt["objectRow"]) <= 9) else 0.0)
				var seat_pos := Vector3(obj_pos.x, seat_y, obj_pos.z)
				var seat_yaw := to_fire + PI * 0.5
				var variant := "forest-stone" if pid == "forest-seat-b-point" else profile
				var seat_res := PropFactory.create_natural_seat(_grp_props, variant, seat_pos, seat_yaw, _env_kit, float(idx) * 1.7)
				var stand_pos := Structure.tile_to_world(int(pt["col"]), int(pt["row"]), seat_y + 0.05)
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

	# Cozy woodland camp touches: woven hearth mat, autumn leaf scatter around hearth stones & stone seat + east stake lantern
	PropFactory.create_woven_rug(_grp_props, "ForestHearthMat", Vector3(17.2, 0.008, 17.9), Vector2(1.85, 0.92), Color("#7a543c"), Color("#c29c64"), 0.22)
	var mat_autumn := MatKit.make_cloth_mat(Color("#9e622b"), true, true)
	var mat_autumn_b := MatKit.make_cloth_mat(Color("#b88234"), true, true)
	var leaf_spots: Array[Vector2] = [
		Vector2(15.2, 16.5), Vector2(20.4, 15.8), Vector2(19.8, 19.6), Vector2(16.0, 20.1),
		Vector2(13.6, 13.8), Vector2(22.2, 13.4), Vector2(17.8, 11.4), Vector2(21.4, 18.0),
	]
	for lf_i in range(leaf_spots.size()):
		var lpos2: Vector2 = leaf_spots[lf_i]
		var ly_c := eval_ground_height(lpos2.x, lpos2.y)
		for lsub in range(4):
			var la := float(lf_i * 4 + lsub) * 2.1
			var lr := 0.14 + float(lsub) * 0.11
			var lmi := MeshInstance3D.new()
			var lpm := BoxMesh.new(); lpm.size = Vector3(0.11, 0.006, 0.068)
			lmi.mesh = lpm; lmi.material_override = mat_autumn if (lsub + lf_i) % 2 == 0 else mat_autumn_b
			lmi.position = Vector3(lpos2.x + cos(la) * lr, ly_c + 0.006, lpos2.y + sin(la) * lr)
			lmi.rotation.y = la * 1.3
			lmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			_grp_props.add_child(lmi)
	var seat_b_mug := MeshInstance3D.new()
	seat_b_mug.name = "StoneSeatCeramicMug"
	var sbm_m := CylinderMesh.new(); sbm_m.top_radius = 0.044; sbm_m.bottom_radius = 0.036; sbm_m.height = 0.088; sbm_m.radial_segments = 8
	seat_b_mug.mesh = sbm_m; seat_b_mug.material_override = mat_autumn
	seat_b_mug.position = Vector3(21.35, 0.34, 15.48)
	_grp_props.add_child(seat_b_mug)
	var post_spot := Vector3(22.6, eval_ground_height(22.6, 17.6), 17.6)
	var lan_post := MeshInstance3D.new()
	lan_post.name = "ForestCozyLanternPost"
	var lpm2 := CylinderMesh.new(); lpm2.top_radius = 0.045; lpm2.bottom_radius = 0.062; lpm2.height = 1.35; lpm2.radial_segments = 7
	lan_post.mesh = lpm2; lan_post.material_override = mat_trunk
	lan_post.position = post_spot + Vector3(0.0, 0.62, 0.0)
	_grp_props.add_child(lan_post)
	var post_arm := MeshInstance3D.new()
	var pam := BoxMesh.new(); pam.size = Vector3(0.36, 0.042, 0.048)
	post_arm.mesh = pam; post_arm.material_override = mat_trunk
	post_arm.position = post_spot + Vector3(-0.14, 1.24, 0.0)
	_grp_props.add_child(post_arm)
	var e_lan := PropFactory.create_portable_lantern(_grp_interactables, _fx, post_spot + Vector3(-0.28, 0.96, 0.0))
	e_lan.name = "CampEastPostLantern"

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

func _restyle_deer_node(n: Node, is_stag: bool) -> void:
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		if mi.mesh:
			for si in range(mi.mesh.get_surface_count()):
				var orig := mi.mesh.surface_get_material(si) as BaseMaterial3D
				if orig == null:
					orig = mi.get_active_material(si) as BaseMaterial3D
				var c := orig.albedo_color if orig else Color(0.75, 0.42, 0.24)
				var s_name := (orig.resource_name if orig else "").to_lower()
				var nm := StandardMaterial3D.new()
				nm.roughness = 0.90
				nm.metallic = 0.0
				nm.metallic_specular = 0.08
				nm.vertex_color_use_as_albedo = false
				if orig and orig.albedo_texture != null:
					nm.albedo_texture = orig.albedo_texture
					# Desaturate bright orange GLB palette texture into natural woodland deer fur
					nm.albedo_color = Color(0.52, 0.56, 0.58)
				elif s_name.contains("eye") or s_name.contains("hoof") or s_name.contains("nose") or (c.r + c.g + c.b) < 0.72:
					nm.albedo_color = Color("#2e241c")
					nm.roughness = 0.72
				elif s_name.contains("horn") or s_name.contains("antler") or s_name.contains("belly") or s_name.contains("light") or s_name.contains("white") or (c.r > 0.65 and c.b > 0.55):
					nm.albedo_color = Color("#cbb79b")
				else:
					nm.albedo_color = Color("#5b402c") if is_stag else Color("#6e4f37")
				mi.mesh.surface_set_material(si, nm)
				mi.set_surface_override_material(si, nm)
	for ch in n.get_children():
		_restyle_deer_node(ch, is_stag)

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
	if node_name.contains("Deer") or node_name.contains("Stag"):
		_restyle_deer_node(inst, node_name.contains("Stag"))
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
# Camp 03: Playa del pecio (AAA Coastal Cove, Reef Shipwreck & Sail-Tarp Bivouac)
# ------------------------------------------------------------------------------
func _build_beach_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float) -> void:
	# Bright weathered coastal sandstone + warm limestone bluffs + tide-slick wet reef rocks
	var mat_sand_rock := CoastalKit.make_multimesh_rock_mat("a1-cliff-organic-v7.png", Color("#dcd0b8"), 0.86, 0.38, true)
	var mat_bluff_rock := CoastalKit.make_multimesh_rock_mat("limestone-v3.webp", Color("#cfc1a6"), 0.88, 0.34, true)
	var mat_wet_rock := CoastalKit.make_multimesh_rock_mat("basalt-coastal-albedo-v1.webp", Color("#768286"), 0.44, 0.36, true)
	var mat_dune_grass := _env_kit.make_alpha_foliage_mat("beach_grass", Color("#6a7a42"))
	var mat_coastal_shrub := MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#567040"), 0.045, Color("#88a85c"), false, 2.2, true)
	var mat_drift := MatKit.make_wood_mat(Color("#a89b84"), true)
	var mat_drift_mm := CoastalKit.make_multimesh_wood_mat(Color("#a89b84"), true)
	var mat_wreck := MatKit.make_wood_mat(Color("#826952"), true)
	var mat_wreck_wet := MatKit.make_wood_mat(Color("#4c3e32"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#b09f7a"), true, true)
	var mat_sail_torn := MatKit.make_cloth_mat(Color("#cfc4ab"), true, true)

	# Register MultiMesh pools for fast batched coastal geology, debris & flora
	var crag_pool := _env_kit.get_rock_variants("craggy")
	var strat_pool := _env_kit.get_rock_variants("stratified")
	var round_pool := _env_kit.get_rock_variants("rounded")
	var dry_keys: Array[String] = []
	var bluff_keys: Array[String] = []
	var wet_keys: Array[String] = []
	for vi in range(4):
		var dk := "beach_dry_r%d" % vi
		_env_kit.define_multimesh(dk, crag_pool[vi], mat_sand_rock, true)
		dry_keys.append(dk)
		var bk := "beach_bluff_r%d" % vi
		_env_kit.define_multimesh(bk, strat_pool[vi], mat_bluff_rock, true)
		bluff_keys.append(bk)
		var wk := "beach_wet_r%d" % vi
		_env_kit.define_multimesh(wk, crag_pool[vi], mat_wet_rock, true)
		wet_keys.append(wk)
	_env_kit.define_multimesh("beach_pebble", round_pool[0], mat_sand_rock, false)
	var plank_proto := BoxMesh.new(); plank_proto.size = Vector3(1.25, 0.046, 0.19)
	_env_kit.define_multimesh("beach_plank", plank_proto, mat_drift_mm, true)
	var uv_grass := Rect2(0.51, 0.01, 0.48, 0.48)
	var uv_bush := Rect2(0.01, 0.01, 0.48, 0.48)
	var uv_flower := Rect2(0.51, 0.51, 0.48, 0.48)
	var mat_grass_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#98a862"), 0.085, Color("#b8c876"), true, 1.0, true, uv_grass)
	var mat_bush_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#7c9452"), 0.060, Color("#9bb668"), true, 1.0, true, uv_bush)
	var mat_flower_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#e2d09c"), 0.065, Color("#c8c28a"), true, 1.0, true, uv_flower)
	_env_kit.define_multimesh("beach_grass_tuft", _env_kit.get_bush_quad_proto(uv_grass, 1.12), mat_grass_mm, true)
	_env_kit.define_multimesh("beach_shrub_card", _env_kit.get_bush_quad_proto(uv_bush, 1.24), mat_bush_mm, true)
	_env_kit.define_multimesh("beach_coastal_flower", _env_kit.get_bush_quad_proto(uv_flower, 1.06), mat_flower_mm, false)

	var foam_sources: Array = []
	fx.set_smoke_wind(Vector3(-0.32, 0.88, -0.34)) # Steady coastal sea breeze blowing inland

	# 1. Sculpted Northern Sandstone Bluffs & West/East Rocky Headlands framing the cove
	var rng := RandomNumberGenerator.new()
	rng.seed = 3032026
	# Dominant northwest rocky sandstone bluff behind the shelter (inspired by AAA coastal reference)
	var bluff_anchors := [
		[Vector2(-8.5, 4.5), Vector3(4.8, 3.6, 4.2)],
		[Vector2(-3.2, 2.2), Vector3(4.4, 3.4, 3.8)],
		[Vector2(2.4, 1.2), Vector3(4.2, 3.1, 3.4)],
		[Vector2(8.0, 0.2), Vector3(4.6, 3.2, 3.6)],
		[Vector2(13.8, -0.8), Vector3(4.4, 2.8, 3.4)],
		[Vector2(19.6, -1.5), Vector3(4.2, 2.5, 3.2)],
		[Vector2(25.2, -0.6), Vector3(4.5, 2.7, 3.5)],
		[Vector2(31.2, 0.8), Vector3(4.8, 3.2, 3.8)],
		[Vector2(37.4, 3.2), Vector3(5.2, 3.6, 4.4)],
		[Vector2(42.5, 9.2), Vector3(5.0, 3.4, 4.2)],
		# Framing western headland jutting toward surf
		[Vector2(-6.0, 12.2), Vector3(4.4, 2.8, 4.0)],
		[Vector2(-4.2, 17.5), Vector3(4.2, 2.5, 3.8)],
		[Vector2(-3.6, 21.8), Vector3(4.0, 2.0, 3.4)],
		[Vector2(-2.2, 24.5), Vector3(3.6, 1.6, 3.2)],
		# Framing far-eastern coastal crag overlooking the shipwreck bay
		[Vector2(39.8, 16.5), Vector3(4.4, 2.6, 3.8)],
		[Vector2(42.0, 22.8), Vector3(3.8, 1.8, 3.4)],
	]
	for bi in range(bluff_anchors.size()):
		var ba: Array = bluff_anchors[bi]
		var bp2: Vector2 = ba[0]
		var bsc: Vector3 = ba[1]
		var by := _eval_beach_height(bp2.x, bp2.y, width_m, depth_m)
		var use_keys := bluff_keys if bi % 2 == 0 else dry_keys
		var col_t := Color(1.0, 0.98, 0.94) if bi % 3 == 0 else (Color(0.94, 0.92, 0.88) if bi % 3 == 1 else Color(0.88, 0.87, 0.84))
		CoastalKit.append_rock_cluster_mm(_env_kit, use_keys, Vector3(bp2.x, by + bsc.y * 0.22, bp2.y), bsc, float(bi) * 0.85, float(bi) * 2.13, 4, col_t)
		if bp2.y > 20.0:
			foam_sources.append(Vector3(bp2.x, bp2.y, bsc.x * 0.72))

	# Upper distant cliff backdrop ridges beyond northern bluffs (closes pitch=5° sky horizon naturally!)
	for ui in range(14):
		var ux := lerpf(-34.0, width_m + 34.0, float(ui) / 13.0)
		var uz := -9.5 - fmod(float(ui) * 2.9, 9.5)
		var uy := _eval_beach_height(ux, uz, width_m, depth_m)
		var usc := Vector3(rng.randf_range(5.2, 8.4), rng.randf_range(3.6, 6.2), rng.randf_range(4.4, 6.8))
		CoastalKit.append_rock_cluster_mm(_env_kit, bluff_keys, Vector3(ux, uy + usc.y * 0.18, uz), usc, rng.randf() * TAU, float(ui) * 3.1, 3, Color(0.92, 0.90, 0.86))

	# Few wind-sculpted coastal scrub pines perched high atop the NW & NE upper rocky bluffs (outside playable sand!)
	var bluff_tree_spots := [
		[Vector2(3.8, -1.2), 0.78], [Vector2(10.8, -2.8), 0.72], [Vector2(29.8, -1.8), 0.82],
		[Vector2(-6.5, 4.2), 0.85], [Vector2(39.2, 4.8), 0.80],
	]
	var mat_c_trunk := MatKit.make_wood_mat(Color("#6b5540"), true)
	for bti in range(bluff_tree_spots.size()):
		var bt: Array = bluff_tree_spots[bti]
		var btp: Vector2 = bt[0]
		var btsc: float = float(bt[1])
		var bty := _eval_beach_height(btp.x, btp.y, width_m, depth_m)
		_env_kit.build_organic_tree(_grp_vegetation, "oak" if bti % 2 == 0 else "pine", Vector3(btp.x, bty - 0.12, btp.y), btsc, mat_c_trunk, mat_coastal_shrub, null, float(bti) * 2.7 + 1.3)

	# 2. Playable Coastal Boulders along obstacle slots (warm dry sandstone up-beach, dark wet stones at surf)
	var r_idx := 0
	for ob in scene_def.get("obstacles", []):
		var oid := str(ob.get("id", ""))
		if oid.contains("rock"):
			var rp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			var gy := _eval_beach_height(rp.x, rp.z, width_m, depth_m)
			var shore_here := _beach_shore_z(rp.x)
			var is_wet := rp.z >= shore_here - 3.6
			if oid == "beach-rock-4":
				# Low weathered sandstone shelf behind camp hearth so it NEVER crowds the cauldron tripod!
				CoastalKit.append_rock_cluster_mm(_env_kit, dry_keys, Vector3(rp.x, gy + 0.12, rp.z), Vector3(1.38, 0.44, 1.05), 0.45, 4.2, 3, Color(1.0, 0.97, 0.92))
			elif is_wet:
				var sc_w := Vector3(1.18 + fmod(float(r_idx) * 0.21, 0.42), 0.56 + fmod(float(r_idx) * 0.14, 0.26), 1.08)
				CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(rp.x, gy + 0.14, rp.z), sc_w, float(r_idx) * 1.35, float(r_idx) * 2.4, 3, Color(0.95, 0.98, 1.0))
				foam_sources.append(Vector3(rp.x, rp.z, sc_w.x * 1.15))
			else:
				var sc_d := Vector3(1.28 + fmod(float(r_idx) * 0.27, 0.48), 0.72 + fmod(float(r_idx) * 0.19, 0.36), 1.16)
				CoastalKit.append_rock_cluster_mm(_env_kit, dry_keys if r_idx % 2 == 0 else bluff_keys, Vector3(rp.x, gy + 0.18, rp.z), sc_d, float(r_idx) * 1.25, float(r_idx) * 1.9, 3, Color(0.98, 0.96, 0.92))
				# Nestle dune-grass tufts around dry boulder bases
				for gi in range(3):
					var ga := float(r_idx) * 1.4 + float(gi) * 2.1
					var gp := Vector3(rp.x + cos(ga) * (sc_d.x * 0.65), gy, rp.z + sin(ga) * (sc_d.z * 0.65))
					var gsc := rng.randf_range(0.68, 1.02)
					_env_kit.append_multimesh("beach_grass_tuft", Transform3D(Basis(Vector3.UP, ga).scaled_local(Vector3(gsc, gsc * 0.85, gsc)), gp), Color(0.96, 1.0, 0.90))
			r_idx += 1

	# Additional submerged & half-emerging tidal reef rocks scattered along the curved shallows & shipwreck reef
	var reef_rocks := [
		[Vector2(2.6, 25.4), Vector3(1.65, 0.78, 1.45)],
		[Vector2(11.8, 25.2), Vector3(1.15, 0.44, 0.96)],
		[Vector2(17.6, 24.4), Vector3(0.95, 0.36, 0.88)],
		[Vector2(24.4, 24.2), Vector3(1.35, 0.54, 1.12)],
		[Vector2(29.8, 26.2), Vector3(1.85, 0.92, 1.55)],
		[Vector2(32.2, 24.8), Vector3(1.75, 0.84, 1.42)],
		[Vector2(36.8, 25.6), Vector3(2.25, 1.24, 1.85)],
		[Vector2(31.2, 29.5), Vector3(2.10, 1.05, 1.75)],
		[Vector2(37.5, 30.2), Vector3(2.40, 1.38, 1.95)],
	]
	for rri in range(reef_rocks.size()):
		var rr: Array = reef_rocks[rri]
		var rrp: Vector2 = rr[0]
		var rrsc: Vector3 = rr[1]
		var rry := _eval_beach_height(rrp.x, rrp.y, width_m, depth_m)
		CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(rrp.x, maxf(rry + 0.10, BEACH_WATER_Y - 0.16), rrp.y), rrsc, float(rri) * 1.15, float(rri) * 3.3, 3, Color(0.90, 0.95, 0.98))
		foam_sources.append(Vector3(rrp.x, rrp.y, rrsc.x * 1.12))

	# 3. Grounded Stranded Rowboat tilted naturally in curved swash sandbar (oars laid flat, zero dark tile!)
	for ob in scene_def.get("obstacles", []):
		if str(ob.get("id", "")) == "beach-boat":
			var bp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			var bgy := _eval_beach_height(bp.x, bp.z, width_m, depth_m)
			var boat := Node3D.new()
			boat.name = "StrandedRowboat"
			boat.position = Vector3(bp.x, bgy - 0.11, bp.z + 0.15)
			boat.rotation = Vector3(0.07, 0.56, -0.14)
			_grp_structures.add_child(boat)
			var hull := _spawn_prop_glb(boat, "boat-row-large.glb", Vector3.ZERO, 0.0, Vector3.ONE * 1.56, false, "RowboatHull", mat_drift)
			if hull == null:
				var fb := MeshInstance3D.new()
				var bhm := BoxMesh.new(); bhm.size = Vector3(3.0, 0.56, 1.32)
				fb.mesh = bhm; fb.material_override = mat_drift; boat.add_child(fb)
			# Boat model already includes side oars; lay one loose spare paddle cleanly on the dry sand beside the stern!
			var oar_b := _spawn_prop_glb(boat, "tool-paddle.glb", Vector3(-1.35, 0.08, 0.35), 0.0, Vector3.ONE * 1.18, false, "RowboatOarSpare", mat_wreck)
			if oar_b:
				oar_b.rotation = Vector3(1.56, -0.45, 0.04)
			# Mooring rope coiled beside the prow
			for rti in range(3):
				var mr := MeshInstance3D.new()
				var mrm := TorusMesh.new(); mrm.inner_radius = 0.14; mrm.outer_radius = 0.18; mrm.rings = 12
				mr.mesh = mrm; mr.material_override = mat_rope
				mr.position = Vector3(1.22, 0.11 + float(rti) * 0.028, 0.55)
				boat.add_child(mr)

	# 4. Reframed Hero OffshoreShipwreck in Eastern Reef Bay (in turquoise reef water, framed cleanly in overview!)
	var wreck_pos := Vector3(35.6, BEACH_WATER_Y - 0.34, 28.8)
	var wreck_root := Node3D.new()
	wreck_root.name = "OffshoreShipwreck"
	wreck_root.position = wreck_pos
	wreck_root.rotation = Vector3(-0.14, -0.78, 0.25)
	_grp_env_geo.add_child(wreck_root)
	_spawn_prop_glb(wreck_root, "ship-wreck.glb", Vector3.ZERO, 0.0, Vector3.ONE * 1.32, false, "ShipwreckHullModel", mat_wreck)
	# Dark waterlogged lower hull planking + broken leaning mast, yardarm, rigging & tattered sail
	var mast_base := Vector3(0.0, 0.52, -0.20)
	var mast_tip := Vector3(0.36, 5.25, -0.48)
	CoastalKit.add_oriented_cyl(wreck_root, mast_base, mast_tip, 0.18, 0.09, mat_wreck_wet, 8, true, "BrokenMainMast")
	var yard_a := Vector3(-1.95, 3.35, -0.35)
	var yard_b := Vector3(2.05, 4.05, -0.44)
	CoastalKit.add_oriented_cyl(wreck_root, yard_a, yard_b, 0.075, 0.06, mat_drift, 7, true, "BrokenYardarm")
	CoastalKit.add_oriented_cyl(wreck_root, Vector3(0.0, 1.15, -1.8), Vector3(-0.22, 2.15, -4.4), 0.11, 0.05, mat_wreck_wet, 7, true, "BrokenBowsprit")
	for shroud in [
		[mast_tip + Vector3(0.0, -0.30, 0.0), Vector3(-1.25, 0.88, 0.55)],
		[mast_tip + Vector3(0.0, -0.30, 0.0), Vector3(1.32, 0.80, 0.45)],
		[mast_tip + Vector3(0.0, -0.45, 0.0), Vector3(-0.20, 2.05, -4.1)],
		[yard_a + Vector3(0.30, 0.0, 0.0), Vector3(-1.15, 0.88, -0.70)],
		[yard_b + Vector3(-0.30, 0.0, 0.0), Vector3(1.15, 0.80, -0.70)],
	]:
		CoastalKit.add_oriented_cyl(wreck_root, shroud[0], shroud[1], 0.018, 0.018, mat_rope, 5, false)
	var st_ts := SurfaceTool.new(); st_ts.begin(Mesh.PRIMITIVE_TRIANGLES)
	for ti in range(6):
		var u0 := float(ti) / 6.0; var u1 := float(ti + 1) / 6.0
		var top0 := yard_a.lerp(yard_b, lerpf(0.18, 0.76, u0))
		var top1 := yard_a.lerp(yard_b, lerpf(0.18, 0.76, u1))
		var drop0 := 0.95 + sin(u0 * 9.0) * 0.36
		var drop1 := 0.95 + sin(u1 * 9.0) * 0.36
		var bot0 := top0 + Vector3(-0.35, -drop0, -0.30)
		var bot1 := top1 + Vector3(-0.35, -drop1, -0.30)
		st_ts.set_uv(Vector2(u0, 0.0)); st_ts.add_vertex(top0)
		st_ts.set_uv(Vector2(u1, 0.0)); st_ts.add_vertex(top1)
		st_ts.set_uv(Vector2(u1, 1.0)); st_ts.add_vertex(bot1)
		st_ts.set_uv(Vector2(u0, 0.0)); st_ts.add_vertex(top0)
		st_ts.set_uv(Vector2(u1, 1.0)); st_ts.add_vertex(bot1)
		st_ts.set_uv(Vector2(u0, 1.0)); st_ts.add_vertex(bot0)
	st_ts.generate_normals()
	var ts_mi := MeshInstance3D.new(); ts_mi.name = "WreckTatteredSail"
	ts_mi.mesh = st_ts.commit(); ts_mi.material_override = mat_sail_torn
	wreck_root.add_child(ts_mi)
	foam_sources.append(Vector3(wreck_pos.x, wreck_pos.z, 3.6))
	foam_sources.append(Vector3(wreck_pos.x - 1.6, wreck_pos.z - 1.2, 2.6))
	foam_sources.append(Vector3(wreck_pos.x + 1.8, wreck_pos.z + 1.4, 2.6))

	# 5. Shared Coastal Marine Ecosystem (Outer Reef Perimeter, Buoys, Kelp, Corals, Reef Fish & Manta Rays) + Depth-Aware Ocean
	var seab_cb := func(wx: float, wz: float) -> float:
		return _eval_beach_height(wx, wz, width_m, depth_m)
	_marine_anim_state = MarineEco.build_coastal_marine_life(_grp_env_geo, _env_kit, "wreck-beach", BEACH_WATER_Y, seab_cb, foam_sources, rng)
	var mat_ocean := CoastalKit.create_coastal_ocean_shader(
		Color(0.042, 0.195, 0.305, 0.84),
		Color(0.088, 0.395, 0.478, 0.66),
		Color(0.240, 0.600, 0.590, 0.24),
		Color(0.92, 0.97, 0.99, 1.0),
		0.082,
		1.0,
		true
	)
	var calm_cb := func(_wx: float, _wz: float) -> float:
		return 0.0
	CoastalKit.build_coastal_ocean_mesh(
		self, "OceanWater",
		-58.0, width_m + 58.0,
		15.5, depth_m + 68.0,
		76, 48,
		BEACH_WATER_Y,
		seab_cb,
		foam_sources,
		calm_cb,
		mat_ocean
	)

	# 6. Tidal Wrack Line: splintered planks, rope coils, pebbles, seaweed & shells aligned with curved shoreline
	var wrack_xs := [4.8, 8.6, 11.4, 14.9, 17.8, 21.4, 24.6, 27.5, 30.2, 13.2, 22.8, 26.2]
	for pi in range(wrack_xs.size()):
		var px: float = wrack_xs[pi]
		var pz := _beach_shore_z(px) - rng.randf_range(1.6, 4.4)
		var py := _eval_beach_height(px, pz, width_m, depth_m)
		var yaw_p := rng.randf_range(-0.65, 0.65)
		var sc_p := Vector3(rng.randf_range(0.72, 1.48), rng.randf_range(0.85, 1.25), rng.randf_range(0.85, 1.35))
		var b_p := Basis.from_euler(Vector3(rng.randf_range(-0.04, 0.04), yaw_p, rng.randf_range(-0.05, 0.05))).scaled_local(sc_p)
		_env_kit.append_multimesh("beach_plank", Transform3D(b_p, Vector3(px, py + 0.015, pz)), Color(0.95, 0.92, 0.86) if pi % 2 == 0 else Color(0.76, 0.70, 0.62))

	# Scattered tide-worn beach pebbles along wrack line & bluff margins (MultiMesh batched!)
	for peb_i in range(88):
		var px := rng.randf_range(1.0, width_m - 1.0)
		var shore_p := _beach_shore_z(px)
		var pz := shore_p - rng.randf_range(0.5, 4.8) if peb_i < 54 else rng.randf_range(2.0, 9.5)
		var py := _eval_beach_height(px, pz, width_m, depth_m)
		var psc := Vector3(rng.randf_range(0.10, 0.34), rng.randf_range(0.05, 0.14), rng.randf_range(0.09, 0.28))
		var bp := Basis(Vector3.UP, rng.randf() * TAU).scaled_local(psc)
		var pcol := Color(0.92, 0.89, 0.84) if peb_i % 3 == 0 else (Color(0.72, 0.74, 0.74) if peb_i % 3 == 1 else Color(0.82, 0.76, 0.66))
		_env_kit.append_multimesh("beach_pebble", Transform3D(bp, Vector3(px, py + psc.y * 0.18, pz)), pcol)

	for r_pos in [Vector2(8.9, 20.3), Vector2(22.6, 20.6)]:
		var ry := _eval_beach_height(r_pos.x, r_pos.y, width_m, depth_m)
		var rig := MeshInstance3D.new()
		var rm := TorusMesh.new(); rm.inner_radius = 0.16; rm.outer_radius = 0.22; rm.rings = 14
		rig.mesh = rm; rig.material_override = mat_rope
		rig.position = Vector3(r_pos.x, ry + 0.03, r_pos.y)
		_grp_env_geo.add_child(rig)

	for sw_i in range(6):
		var swx := 5.8 + float(sw_i) * 4.8
		var swz := _beach_shore_z(swx) - 1.5 + sin(float(sw_i) * 1.4) * 0.65
		_env_kit.spawn_seaweed_clump(_grp_vegetation, Vector3(swx, _eval_beach_height(swx, swz, width_m, depth_m) + 0.01, swz), float(sw_i) * 1.1)

	# 7. Organic Coastal Dune Grass, Sea-Holly & Flowering Shrubs clustered strictly along bluff feet & boulder pockets (no isolated tufts floating on open sand!)
	for bi_f in range(bluff_anchors.size()):
		var bfa: Array = bluff_anchors[bi_f]
		var bfp: Vector2 = bfa[0]
		var bfsc: Vector3 = bfa[1]
		for sub_g in range(4):
			var ang_g := rng.randf_range(0.25, PI - 0.25)
			var gx := bfp.x + cos(ang_g) * (bfsc.x * rng.randf_range(0.55, 1.15))
			var gz := bfp.y + sin(ang_g) * (bfsc.z * rng.randf_range(0.45, 0.95))
			if gz > _beach_shore_z(gx) - 3.2:
				continue
			var gy_f := _eval_beach_height(gx, gz, width_m, depth_m)
			var sc_f := rng.randf_range(0.82, 1.38)
			var fk := "beach_grass_tuft" if sub_g < 2 else ("beach_shrub_card" if sub_g == 2 else "beach_coastal_flower")
			_env_kit.append_multimesh(fk, Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(Vector3(sc_f, sc_f * rng.randf_range(0.75, 1.15), sc_f)), Vector3(gx, gy_f - 0.04, gz)), Color(rng.randf_range(0.84, 1.00), rng.randf_range(0.88, 1.00), rng.randf_range(0.80, 0.94)))

	_env_kit.flush_multimeshes(_grp_env_geo, "BeachGeo_")

	for ss_i in range(3):
		var sx := 8.2 + float(ss_i) * 9.2
		var sz := _beach_shore_z(sx) - 0.85
		FaunaKit.spawn_seastar(_grp_vegetation, Vector3(sx, _eval_beach_height(sx, sz, width_m, depth_m) + 0.02, sz), Color("#d45a38") if ss_i % 2 == 0 else Color("#c23e54"), float(ss_i) * 1.7)

	# 8. Coastal Wildlife synced cleanly to curved shoreline height
	var sh_w1 := _beach_shore_z(9.5) - 1.2
	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_0", [
		Vector3(6.8, 0.0, sh_w1), Vector3(11.4, 0.0, _beach_shore_z(11.4) - 1.4),
		Vector3(13.2, 0.0, _beach_shore_z(13.2) - 1.0), Vector3(15.2, 0.0, _beach_shore_z(15.2) - 1.5),
		Vector3(6.6, 0.0, sh_w1),
	], 18.0, 1.2, Color("#c24a2b"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 42.0, 0.48, 3.0, true, 3.2)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_1", [
		Vector3(28.8, 0.0, _beach_shore_z(28.8) - 1.2), Vector3(25.2, 0.0, _beach_shore_z(25.2) - 1.1),
		Vector3(23.2, 0.0, _beach_shore_z(23.2) - 1.4), Vector3(21.2, 0.0, _beach_shore_z(21.2) - 1.0),
		Vector3(28.5, 0.0, _beach_shore_z(28.5) - 1.2),
	], 16.0, 4.4, Color("#b63f26"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 46.0, 0.50, 8.0, true, 3.2)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "ShoreCrab_2", [
		Vector3(15.4, 0.0, _beach_shore_z(15.4) - 2.2), Vector3(18.0, 0.0, _beach_shore_z(18.0) - 1.8),
		Vector3(19.6, 0.0, _beach_shore_z(19.6) - 2.1), Vector3(15.2, 0.0, _beach_shore_z(15.2) - 2.2),
	], 14.0, 2.8, Color("#c95a34"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], ["storm"], 48.0, 0.46, 22.0, true, 3.2)

	FaunaKit.spawn_turtle(_grp_vegetation, fauna_agents, "BeachTurtle", [
		Vector3(9.4, -0.35, _beach_shore_z(9.4) + 3.2), Vector3(11.6, -0.10, _beach_shore_z(11.6) - 0.5),
		Vector3(13.0, -0.04, _beach_shore_z(13.0) - 1.8), Vector3(15.2, -0.10, _beach_shore_z(15.2) - 0.4),
		Vector3(12.0, -0.35, _beach_shore_z(12.0) + 3.4),
	], 32.0, 1.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["storm"], 78.0, 0.34, 42.0, true, 4.0)

	var gull0_y := _eval_beach_height(5.25, 23.25, width_m, depth_m) + 0.58
	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "BeachPerchedGull_0", Vector3(5.25, gull0_y, 23.25), 0.7, Color("#f2f6fa"), Color("#788696"), 1.08, 0.4)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm"], 44.0, 0.44, 4.0, false, 4.0)

	var gull1_y := _eval_beach_height(29.25, 21.75, width_m, depth_m) + 0.54
	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "BeachPerchedGull_1", Vector3(29.25, gull1_y, 21.75), -1.8, Color("#eef3f7"), Color("#6d7b8c"), 1.02, 2.2)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm"], 52.0, 0.42, 26.0, false, 4.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_0", [
		Vector3(11.0, -0.45, _beach_shore_z(11.0) + 7.5), Vector3(15.0, -0.28, _beach_shore_z(15.0) + 2.6),
		Vector3(19.2, -0.26, _beach_shore_z(19.2) + 2.4), Vector3(23.8, -0.45, _beach_shore_z(23.8) + 7.5),
	], 18.0, 0.25, Color("#3e7488"), "swim_ocean_jump", 1.32)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 62.0, 0.32, 36.0, false, 0.0)

	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_1", [
		Vector3(29.0, -0.45, _beach_shore_z(29.0) + 8.0), Vector3(26.2, -0.28, _beach_shore_z(26.2) + 3.2),
		Vector3(22.8, -0.28, _beach_shore_z(22.8) + 3.5), Vector3(19.5, -0.45, _beach_shore_z(19.5) + 8.2),
	], 20.0, 2.4, Color("#498296"), "swim_ocean_jump", 1.24)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 70.0, 0.30, 8.0, false, 0.0)

	# 9. Organized Salvaged Camp Props (real GLB crate + cask + woven hearth mat + lanterns, zero clutter!)
	var mat_crate := MatKit.make_wood_mat(Color("#86694a"), true)
	var mat_brass_b := MatKit.make_bronze_mat(Color("#a8894c"))
	var beach_table := Node3D.new()
	beach_table.name = "BeachSalvagedSupplyTable"
	var bt_y := _eval_beach_height(15.45, 15.65, width_m, depth_m)
	beach_table.position = Vector3(15.45, bt_y, 15.65)
	_grp_props.add_child(beach_table)
	var crate_glb := _spawn_prop_glb(beach_table, "crate.glb", Vector3(0.0, 0.0, 0.0), 0.24, Vector3.ONE * 0.72, false, "SalvagedCrate", mat_crate)
	if crate_glb == null:
		var crate_b := MeshInstance3D.new()
		var cbm := BoxMesh.new(); cbm.size = Vector3(0.54, 0.42, 0.46)
		crate_b.mesh = cbm; crate_b.material_override = mat_crate; crate_b.position = Vector3(0.0, 0.21, 0.0)
		beach_table.add_child(crate_b)
	var barrel_glb := _spawn_prop_glb(beach_table, "barrel.glb", Vector3(-0.56, 0.0, -0.14), 0.4, Vector3.ONE * 0.78, false, "SalvagedBarrel", mat_wreck)
	if barrel_glb == null:
		var cask_b := MeshInstance3D.new()
		var kbm := CylinderMesh.new(); kbm.top_radius = 0.19; kbm.bottom_radius = 0.21; kbm.height = 0.50; kbm.radial_segments = 10
		cask_b.mesh = kbm; cask_b.material_override = mat_wreck; cask_b.position = Vector3(-0.52, 0.25, -0.14)
		beach_table.add_child(cask_b)
	var b_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, Vector3(15.45, bt_y + 0.44, 15.65))
	b_lan.name = "BeachTableLantern"
	PropFactory.create_woven_rug(_grp_props, "BeachHearthMat", Vector3(18.6, _eval_beach_height(18.6, 15.35, width_m, depth_m) + 0.008, 15.35), Vector2(1.92, 1.04), Color("#8c5e42"), Color("#d2b484"), -0.18)

	var boat_lan_y := _eval_beach_height(8.15, 18.85, width_m, depth_m)
	var boat_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, Vector3(8.15, boat_lan_y + 0.02, 18.85))
	boat_lan.name = "BeachBoatSternLantern"
	var mug_cask := MeshInstance3D.new()
	var mcm := CylinderMesh.new(); mcm.top_radius = 0.044; mcm.bottom_radius = 0.038; mcm.height = 0.088; mcm.radial_segments = 8
	mug_cask.mesh = mcm; mug_cask.material_override = mat_brass_b; mug_cask.position = Vector3(-0.56, 0.56, -0.14)
	beach_table.add_child(mug_cask)

	sync_wildlife()

# ------------------------------------------------------------------------------
# Camp 04: Acantilados del Observatorio (Option A — Promontorio Cornisa de Acceso al Observatorio)
# Continental Stormwreck ridge on W/SW, carved Retiro arrival staircase, sheer columnar basalt
# cliffs on E/SE, northern sea-chasm stone-arch bridge + distant ruined Clifftop Observatory!
# ------------------------------------------------------------------------------
func _build_observatory_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float) -> void:
	# Differentiated weathered materials: volcanic columnar basalt (harmonized in value with cliff terrain!), fluted limestone/ashlar ruins, patinated bronze, driftwood oak & wind-taut rope
	var mat_basalt := CoastalKit.make_multimesh_rock_mat("basalt-coastal-albedo-v1.webp", Color("#8a949e"), 0.86, 0.22, true)
	var mat_basalt_dark := CoastalKit.make_multimesh_rock_mat("a1-cliff-rugged-v8.jpg", Color("#76808a"), 0.88, 0.22, true)
	var mat_ashlar := MatKit.make_textured_mat("ashlar-v4.webp", Color("#7c8082"), 0.82, "rock", Vector3(0.50, 0.50, 0.50), true, true)
	var mat_carved := MatKit.make_textured_mat("limestone-v3.webp", Color("#98988e"), 0.78, "rock", Vector3(0.46, 0.46, 0.46), true, true)
	var mat_plinth := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#646d74"), 0.86, "rock", Vector3(0.42, 0.42, 0.42), true, true)
	var mat_bronze_pat := MatKit.make_bronze_mat(Color("#aa8c50"))
	var mat_dome_copper := MatKit.make_textured_mat("limestone-v3.webp", Color("#4e6d62"), 0.44, "rock", Vector3(0.7, 0.7, 0.7), false, true)
	mat_dome_copper.metallic = 0.56
	var mat_cedar_o := MatKit.make_wood_mat(Color("#6c4e35"), true)
	var mat_plank_bridge := MatKit.make_wood_mat(Color("#7f6041"), true)
	var mat_rope_o := MatKit.make_cloth_mat(Color("#a28b66"), false, true)
	var mat_pennant := MatKit.make_cloth_mat(Color("#943028"), true, true)
	var mat_pine_leaf := MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#4e6d45"), 0.058, Color("#88aa68"), false, 2.0, true)

	# Register MultiMesh rock pools: true flat-faceted columnar basalt + compact stratified ledges/scree
	var bcol_pool := _env_kit.get_basalt_column_variants()
	var strat_pool := _env_kit.get_rock_variants("stratified")
	var flat_pool := _env_kit.get_rock_variants("flat")
	var bcol_keys: Array[String] = []
	var bcol_dark_keys: Array[String] = []
	var flat_keys: Array[String] = []
	for vi in range(bcol_pool.size()):
		var bck := "cliff_bcol_%d" % vi
		_env_kit.define_multimesh(bck, bcol_pool[vi], mat_basalt, true)
		bcol_keys.append(bck)
		var bdk := "cliff_bcol_d_%d" % vi
		_env_kit.define_multimesh(bdk, bcol_pool[vi], mat_basalt_dark, true)
		bcol_dark_keys.append(bdk)
	for vi in range(4):
		var fk := "cliff_flat_%d" % vi
		_env_kit.define_multimesh(fk, flat_pool[vi] if vi < 2 else strat_pool[vi], mat_basalt, true)
		flat_keys.append(fk)
	_env_kit.define_multimesh("cliff_scree", flat_pool[0], mat_basalt, false)

	# Rich 5-type batched botanical flora using ALL high-res quadrants of foliage-atlas-v5 & foliage-atlas!
	var uv_shrub := Rect2(0.01, 0.01, 0.48, 0.48)
	var uv_grass := Rect2(0.51, 0.01, 0.48, 0.48)
	var uv_ivy := Rect2(0.01, 0.51, 0.48, 0.48)
	var uv_heather := Rect2(0.51, 0.51, 0.48, 0.48)
	var mat_heather_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#9a8cad"), 0.062, Color("#a692be"), true, 1.0, true, uv_heather)
	var mat_cgrass_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#809060"), 0.092, Color("#a0b278"), true, 1.0, true, uv_grass)
	var mat_wildfl_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas.png", Color("#989678"), 0.075, Color("#bfb472"), true, 1.0, true, uv_heather)
	var mat_cshrub_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#6c7e54"), 0.052, Color("#8ca26c"), true, 1.0, true, uv_shrub)
	var mat_civy_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#648256"), 0.065, Color("#82a66e"), true, 1.0, true, uv_ivy)
	mat_civy_mm.set_shader_parameter("hang", 1.0)
	_env_kit.define_multimesh("cliff_heather_mm", _env_kit.get_bush_quad_proto(uv_heather, 1.12), mat_heather_mm, true)
	_env_kit.define_multimesh("cliff_grass_mm", _env_kit.get_bush_quad_proto(uv_grass, 1.18), mat_cgrass_mm, false)
	_env_kit.define_multimesh("cliff_wildflower_mm", _env_kit.get_bush_quad_proto(uv_heather, 1.04), mat_wildfl_mm, false)
	_env_kit.define_multimesh("cliff_shrub_mm", _env_kit.get_bush_quad_proto(uv_shrub, 1.24), mat_cshrub_mm, true)
	_env_kit.define_multimesh("cliff_ivy_hang_mm", _env_kit.get_hanging_ivy_proto(uv_ivy, 1.22, 1.45), mat_civy_mm, false)

	fx.set_smoke_wind(Vector3(0.52, 0.72, 0.34)) # Exposed headland crosswind
	var rng := RandomNumberGenerator.new()
	rng.seed = 4042026
	var sea_foam_sources: Array = []

	# 1. Interlocking Columnar Basalt Cliff Walls (tightly scaled & seated STRICTLY BELOW plateau lip so pitch 5 deg stays crystal clear!)
	for rim_i in range(44):
		var ang := float(rim_i) * TAU / 44.0
		var rx := width_m * 0.50 + 0.6 + cos(ang) * 16.9 + sin(ang * 5.0) * 0.78
		var rz := depth_m * 0.50 - 0.4 + sin(ang) * 14.0 + cos(ang * 4.0) * 0.68
		# Leave West continental attachment, SW arrival stairway entrance, and North bridge gate cleanly open!
		if rx < 5.5:
			continue
		if rx < 12.0 and rz > 17.5:
			continue
		if absf(rx - 19.3) < 4.5 and rz < 6.0:
			continue
		var ry := _eval_cliff_height(rx, rz, width_m, depth_m)
		# Crisp upper columnar basalt rim seated STRICTLY BELOW plateau top (top_y <= ry - 0.18m, ZERO protruding tombstones!)
		var rim_h := rng.randf_range(3.2, 4.6)
		var rim_sc := Vector3(rng.randf_range(1.55, 2.25), rim_h, rng.randf_range(1.45, 2.10))
		var b_key: String = bcol_keys[rim_i % bcol_keys.size()] if rim_i % 2 == 0 else bcol_dark_keys[rim_i % bcol_dark_keys.size()]
		var rim_pos := Vector3(rx + cos(ang) * 1.15, minf(-0.34, ry) - rim_h * 0.58, rz + sin(ang) * 1.15)
		_env_kit.append_multimesh(b_key, Transform3D(Basis(Vector3.UP, ang + float(rim_i) * 0.5).scaled_local(rim_sc), rim_pos), Color(0.95, 0.97, 1.0) if rim_i % 2 == 0 else Color(0.88, 0.91, 0.95))
		# Deep vertical stepped columnar cliff buttresses descending cleanly down into ocean surf!
		var wx_b := rx + cos(ang) * 3.1
		var wz_b := rz + sin(ang) * 3.1
		var bsc := Vector3(rng.randf_range(2.2, 3.3), rng.randf_range(7.2, 10.4), rng.randf_range(2.0, 3.0))
		var bk_lo: String = bcol_dark_keys[(rim_i + 2) % bcol_dark_keys.size()]
		_env_kit.append_multimesh(bk_lo, Transform3D(Basis(Vector3.UP, ang * 1.3 + 0.6).scaled_local(bsc), Vector3(wx_b, -6.2 - bsc.y * 0.24, wz_b)), Color(0.84, 0.88, 0.93))
		if rim_i % 2 == 0:
			var lx := rx + cos(ang) * 5.6
			var lz := rz + sin(ang) * 5.6
			var lsc := Vector3(rng.randf_range(2.6, 3.8), rng.randf_range(6.4, 9.2), rng.randf_range(2.4, 3.5))
			var bk_sea: String = bcol_keys[(rim_i + 4) % bcol_keys.size()]
			_env_kit.append_multimesh(bk_sea, Transform3D(Basis(Vector3.UP, ang * 1.1).scaled_local(lsc), Vector3(lx, CLIFF_SEA_Y + lsc.y * 0.34, lz)), Color(0.76, 0.82, 0.89))
			sea_foam_sources.append(Vector3(lx, lz, lsc.x * 0.95))

	# Natural organic basalt crags softening the outer NE/NW corners + stepped continental western ridge + SW foreground buttress
	var massif_crags := [
		[Vector2(-7.8, 12.2), Vector3(3.8, 3.6, 3.4)],
		[Vector2(-13.5, 5.5), Vector3(5.2, 5.4, 4.6)],
		[Vector2(-6.5, -2.8), Vector3(4.6, 4.4, 4.2)],
		[Vector2(1.8, -5.8), Vector3(4.4, 4.0, 3.8)],
		[Vector2(-18.5, 16.5), Vector3(6.2, 6.2, 5.4)],
		[Vector2(-15.5, -10.0), Vector3(6.8, 7.2, 5.8)],
		[Vector2(-11.5, 22.8), Vector3(4.4, 3.8, 4.0)],
		# Embedded outer NE/NW corner rock shelves breaking any straight terrain corner silhouette!
		[Vector2(34.6, 3.4), Vector3(2.4, 2.2, 2.2)],
		[Vector2(3.2, 3.2), Vector3(2.4, 2.0, 2.2)],
		# SW foreground rocky headland buttress supporting the outer arrival stairs (seated strictly below trail level!)
		[Vector2(-1.5, 33.8), Vector3(3.8, 4.2, 3.4)],
		[Vector2(5.2, 34.4), Vector3(3.6, 4.0, 3.2)],
		[Vector2(11.2, 33.0), Vector3(3.4, 3.8, 3.2)],
		[Vector2(-8.8, 36.5), Vector3(4.6, 4.6, 4.0)],
	]
	for mci in range(massif_crags.size()):
		var mc: Array = massif_crags[mci]
		var mcp: Vector2 = mc[0]
		var mcsc: Vector3 = mc[1]
		var mcy := _eval_cliff_height(mcp.x, mcp.y, width_m, depth_m)
		var mkey: String = bcol_keys[mci % bcol_keys.size()] if mci % 2 == 0 else bcol_dark_keys[mci % bcol_dark_keys.size()]
		var y_off_mc := -mcsc.y * 0.46 if mci >= 7 else -mcsc.y * 0.24
		_env_kit.append_multimesh(mkey, Transform3D(Basis(Vector3.UP, float(mci) * 1.15).scaled_local(mcsc), Vector3(mcp.x, mcy + y_off_mc, mcp.y)), Color(0.90, 0.93, 0.97))

	# Dramatic Columnar Basalt Sea Stacks rising far below in the eastern/SE abyss & flanking the Observatory sea-chasm!
	var sea_stacks := [
		[Vector2(47.5, 16.5), Vector3(3.0, 11.4, 2.7)],
		[Vector2(53.0, 28.0), Vector3(3.6, 12.6, 3.2)],
		[Vector2(42.5, 42.5), Vector3(3.8, 11.2, 3.4)],
		[Vector2(24.0, 48.0), Vector3(3.4, 10.4, 3.0)],
		[Vector2(47.5, -7.5), Vector3(3.6, 11.8, 3.2)],
		[Vector2(59.5, 4.5), Vector3(4.4, 12.8, 3.8)],
		[Vector2(62.0, -18.0), Vector3(4.8, 13.6, 4.2)],
		[Vector2(42.5, -18.5), Vector3(3.0, 10.8, 2.7)],
		[Vector2(10.5, -14.5), Vector3(3.2, 10.4, 2.8)],
	]
	for ssi in range(sea_stacks.size()):
		var ss: Array = sea_stacks[ssi]
		var ssp: Vector2 = ss[0]
		var sssc: Vector3 = ss[1]
		var skey: String = bcol_keys[ssi % bcol_keys.size()] if ssi % 2 == 0 else bcol_dark_keys[ssi % bcol_dark_keys.size()]
		_env_kit.append_multimesh(skey, Transform3D(Basis(Vector3.UP, float(ssi) * 1.18).scaled_local(sssc), Vector3(ssp.x, CLIFF_SEA_Y + sssc.y * 0.42, ssp.y)), Color(0.84, 0.88, 0.94))
		var sub_sc := sssc * Vector3(0.56, 0.72, 0.56)
		var sub_off := Vector2(cos(float(ssi) * 2.1), sin(float(ssi) * 2.1)) * (sssc.x * 0.72)
		_env_kit.append_multimesh(bcol_dark_keys[(ssi + 1) % bcol_dark_keys.size()], Transform3D(Basis(Vector3.UP, float(ssi) * 2.3).scaled_local(sub_sc), Vector3(ssp.x + sub_off.x, CLIFF_SEA_Y + sub_sc.y * 0.40, ssp.y + sub_off.y)), Color(0.78, 0.83, 0.90))
		sea_foam_sources.append(Vector3(ssp.x, ssp.y, sssc.x * 1.35))

	# 2. Canonical SW Arrival Architecture (Carved Retiro Staircase, Retaining Curb, Rope Handrail & Trail Signpost!)
	_build_observatory_arrival_path(fx, width_m, depth_m, mat_ashlar, mat_carved, mat_plinth, mat_cedar_o, mat_rope_o, bcol_keys)

	# 3. Canonical North-East Exit Architecture (Fluted Gate, Ancient Stone-Arch Bridge & Distant Clifftop Observatory!)
	_build_observatory_bridge_and_landmark(fx, width_m, depth_m, mat_ashlar, mat_carved, mat_plinth, mat_bronze_pat, mat_dome_copper, mat_plank_bridge, mat_cedar_o, mat_rope_o, bcol_keys, bcol_dark_keys, sea_foam_sources)

	# Shared Depth-Aware Coastal Ocean (silky high-altitude deep sapphire swells — ZERO harsh specular white blotches!)
	var mat_abyss_sea := CoastalKit.create_coastal_ocean_shader(
		Color(0.028, 0.125, 0.228, 0.98),
		Color(0.062, 0.232, 0.348, 0.94),
		Color(0.145, 0.375, 0.455, 0.78),
		Color(0.86, 0.93, 0.98, 1.0),
		0.12,
		0.72,
		true
	)
	mat_abyss_sea.set_shader_parameter("swell_scale", 0.92)
	mat_abyss_sea.set_shader_parameter("whitecap_strength", 0.10)
	mat_abyss_sea.set_shader_parameter("base_roughness", 0.30)
	mat_abyss_sea.set_shader_parameter("horizon_fade_start", 85.0)
	mat_abyss_sea.set_shader_parameter("horizon_fade_end", 240.0)
	var cliff_bed_cb := func(wx: float, wz: float) -> float:
		var ch_y := _eval_cliff_height(wx, wz, width_m, depth_m)
		return ch_y if ch_y > CLIFF_SEA_Y - 1.5 else (CLIFF_SEA_Y - 2.6)
	var cliff_calm_cb := func(_wx: float, _wz: float) -> float:
		return 0.0
	CoastalKit.build_coastal_ocean_mesh(
		self, "OceanWater",
		-240.0, width_m + 310.0,
		-320.0, depth_m + 220.0,
		88, 84,
		CLIFF_SEA_Y,
		cliff_bed_cb,
		sea_foam_sources,
		cliff_calm_cb,
		mat_abyss_sea
	)

	# 4. Sculpted Beveled & Fluted Astronomical Sanctuary Ruins + Faceted Glacial-Quartz Crystals!
	var pillar_idx := 0
	var crystal_idx := 0
	var wb_idx := 0
	for ob in scene_def.get("obstacles", []):
		var oid := str(ob.get("id", ""))
		var op := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
		op.y = _eval_cliff_height(op.x, op.z, width_m, depth_m)

		if oid.contains("windbreak"):
			# Clean architectural low beveled dry-stone shelter curb + compact basalt shelf (NO messy round boulders inside compass!)
			var wb_root := Node3D.new()
			wb_root.name = "CliffWindbreak_%d" % wb_idx
			wb_root.position = op
			var wb_yaw := 0.24 if wb_idx == 0 else (0.12 if wb_idx == 1 else (-0.16 if wb_idx == 2 else (1.35 if wb_idx == 3 else -1.25)))
			wb_root.rotation.y = wb_yaw
			_grp_env_geo.add_child(wb_root)
			var base_w := MeshInstance3D.new()
			base_w.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.38, 0.42, 0.56), 0.05, float(wb_idx) * 2.1, false)
			base_w.material_override = mat_plinth
			base_w.position.y = 0.19
			wb_root.add_child(base_w)
			var top_w := MeshInstance3D.new()
			top_w.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.92, 0.34, 0.48), 0.055, float(wb_idx) * 3.3 + 0.7, true)
			top_w.material_override = mat_ashlar
			top_w.position = Vector3(-0.14 if wb_idx % 2 == 0 else 0.14, 0.54, 0.0)
			top_w.rotation.z = 0.03 if wb_idx % 2 == 0 else -0.03
			wb_root.add_child(top_w)
			# Compact flat basalt ledge tucked cleanly behind the dry-stone curb
			var sc_wb := Vector3(0.88, 0.42, 0.74)
			_env_kit.append_multimesh(flat_keys[wb_idx % flat_keys.size()], Transform3D(Basis(Vector3.UP, wb_yaw + 0.4).scaled_local(sc_wb), op + Vector3(cos(wb_yaw) * 0.42, 0.14, sin(wb_yaw) * 0.42)), Color(0.88, 0.91, 0.95))
			wb_idx += 1

		elif oid.contains("pillar"):
			# 4 DISTINCT beveled & fluted canonical Observatory sanctuary ruins (ZERO raw BoxMesh!)
			var ruin_root := Node3D.new()
			ruin_root.name = "AstronomicalMonolith_%d" % pillar_idx
			ruin_root.position = op
			_grp_env_geo.add_child(ruin_root)

			if pillar_idx == 0:
				# NW Ruin: Weathered twin-fluted column sanctuary archway with beveled lintel, bronze band & fallen drum!
				ruin_root.rotation.y = 0.52
				for side_s: float in [-1.0, 1.0]:
					var pl_j := MeshInstance3D.new()
					pl_j.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.96, 0.32, 0.96), 0.05, 1.1 + side_s, false)
					pl_j.material_override = mat_plinth; pl_j.position = Vector3(side_s * 0.82, 0.14, 0.0)
					ruin_root.add_child(pl_j)
					var col_h := 2.68 if side_s < 0 else 2.28
					var jamb := MeshInstance3D.new()
					jamb.mesh = _env_kit.build_fluted_column(0.32, col_h, side_s > 0, 10, 1.4 + side_s)
					jamb.material_override = mat_carved
					jamb.position = Vector3(side_s * 0.82, 0.28, 0.0)
					ruin_root.add_child(jamb)
					var cap_j := MeshInstance3D.new()
					cap_j.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.86, 0.24, 0.86), 0.05, 2.2 + side_s, true)
					cap_j.material_override = mat_ashlar
					cap_j.position = Vector3(side_s * 0.82, 0.28 + col_h + 0.08, 0.0)
					ruin_root.add_child(cap_j)
				var lintel := MeshInstance3D.new()
				lintel.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.88, 0.38, 0.78), 0.06, 3.1, true)
				lintel.material_override = mat_carved
				lintel.position = Vector3(-0.18, 3.16, 0.0); lintel.rotation.z = -0.09
				ruin_root.add_child(lintel)
				var fall_drum := MeshInstance3D.new()
				fall_drum.mesh = _env_kit.build_fluted_column(0.28, 1.12, true, 10, 4.2)
				fall_drum.material_override = mat_ashlar
				fall_drum.position = Vector3(1.42, 0.28, 0.62); fall_drum.rotation = Vector3(1.48, 0.42, 0.16)
				ruin_root.add_child(fall_drum)
				# Cascading cliff ivy draped over the NW lintel
				_env_kit.append_multimesh("cliff_ivy_hang_mm", Transform3D(Basis(Vector3.UP, 0.52).scaled_local(Vector3(0.95, 1.15, 0.95)), op + Vector3(-0.35, 3.05, 0.35)), Color(0.92, 0.96, 0.90))
			elif pillar_idx == 1:
				# NE Ruin: Tall weathered astronomical solstice stela + fluted half-column & bronze armillary ring!
				ruin_root.rotation.y = -0.58
				var step_p := MeshInstance3D.new()
				step_p.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.66, 0.36, 1.46), 0.06, 5.1, false)
				step_p.material_override = mat_plinth; step_p.position.y = 0.16
				ruin_root.add_child(step_p)
				var shaft := MeshInstance3D.new()
				shaft.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.84, 3.32, 0.68), 0.075, 5.6, true)
				shaft.material_override = mat_carved
				shaft.position = Vector3(0.0, 1.92, 0.0); shaft.rotation.z = -0.035
				ruin_root.add_child(shaft)
				var side_col := MeshInstance3D.new()
				side_col.mesh = _env_kit.build_fluted_column(0.28, 1.88, true, 10, 6.2)
				side_col.material_override = mat_ashlar
				side_col.position = Vector3(0.64, 0.32, 0.08)
				ruin_root.add_child(side_col)
				var b_ring := MeshInstance3D.new()
				var brm := TorusMesh.new(); brm.inner_radius = 0.28; brm.outer_radius = 0.36; brm.rings = 18
				b_ring.mesh = brm; b_ring.material_override = mat_bronze_pat
				b_ring.position = Vector3(-0.08, 2.80, 0.38); b_ring.rotation.x = PI * 0.5
				ruin_root.add_child(b_ring)
			elif pillar_idx == 2:
				# SW Ruin (Flanking Arrival Stairs): Snapped fluted arrival gatepost column + fallen fluted drum!
				ruin_root.rotation.y = 0.78
				var plinth3 := MeshInstance3D.new()
				plinth3.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.38, 0.32, 1.28), 0.055, 7.1, false)
				plinth3.material_override = mat_plinth; plinth3.position.y = 0.14
				ruin_root.add_child(plinth3)
				var stump3 := MeshInstance3D.new()
				stump3.mesh = _env_kit.build_fluted_column(0.36, 1.38, true, 12, 7.8)
				stump3.material_override = mat_carved
				stump3.position = Vector3(0.0, 0.28, 0.0)
				ruin_root.add_child(stump3)
				var collar3 := MeshInstance3D.new()
				var c3m := TorusMesh.new(); c3m.inner_radius = 0.34; c3m.outer_radius = 0.40; c3m.rings = 16
				collar3.mesh = c3m; collar3.material_override = mat_bronze_pat
				collar3.position = Vector3(0.0, 0.96, 0.0)
				ruin_root.add_child(collar3)
				var fallen3 := MeshInstance3D.new()
				fallen3.mesh = _env_kit.build_fluted_column(0.32, 1.65, true, 12, 8.4)
				fallen3.material_override = mat_ashlar
				fallen3.position = Vector3(-1.08, 0.30, 0.56); fallen3.rotation = Vector3(0.14, 0.35, 1.50)
				ruin_root.add_child(fallen3)
			else:
				# SE Ruin: Eroded astronomical lookout obelisk overlooking eastern sea stacks with bronze meridian collar!
				ruin_root.rotation.y = -0.45
				var plinth4 := MeshInstance3D.new()
				plinth4.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.48, 0.34, 1.34), 0.06, 9.1, false)
				plinth4.material_override = mat_plinth; plinth4.position.y = 0.15
				ruin_root.add_child(plinth4)
				var mono4 := MeshInstance3D.new()
				mono4.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.80, 2.48, 0.68), 0.07, 9.6, true)
				mono4.material_override = mat_carved
				mono4.position = Vector3(0.0, 1.48, 0.0); mono4.rotation = Vector3(-0.03, 0.0, 0.04)
				ruin_root.add_child(mono4)
				var cap4 := MeshInstance3D.new()
				cap4.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.94, 0.22, 0.78), 0.045, 9.9, true)
				cap4.material_override = mat_ashlar
				cap4.position = Vector3(0.05, 2.72, 0.0); cap4.rotation = Vector3(-0.03, 0.0, 0.06)
				ruin_root.add_child(cap4)
				var band4 := MeshInstance3D.new()
				band4.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.86, 0.11, 0.74), 0.02, 10.1, false)
				band4.material_override = mat_bronze_pat
				band4.position = Vector3(0.02, 1.78, 0.0); band4.rotation = Vector3(-0.03, 0.0, 0.04)
				ruin_root.add_child(band4)

			# Anchor fractured columnar rubble + scree around every monolith base
			_env_kit.append_multimesh(flat_keys[pillar_idx % flat_keys.size()], Transform3D(Basis(Vector3.UP, float(pillar_idx) * 1.3).scaled_local(Vector3(0.92, 0.36, 0.82)), op + Vector3(0.76, 0.12, 0.44)), Color(0.90, 0.93, 0.96))
			pillar_idx += 1

		elif oid.contains("crystal"):
			# True sharp-faceted chiseled hexagonal glacial-quartz crystal formations emerging from basalt fissures!
			var cry_root := Node3D.new()
			cry_root.name = "ArcaneCrystalSeam_%d" % crystal_idx
			cry_root.position = op
			_grp_env_geo.add_child(cry_root)
			_env_kit.append_multimesh(bcol_dark_keys[crystal_idx % bcol_dark_keys.size()], Transform3D(Basis(Vector3.UP, op.x * 0.7).scaled_local(Vector3(1.18, 0.78, 1.05)), op + Vector3(0.0, 0.05, 0.0)), Color(0.80, 0.86, 0.93))

			var cry_palette: Array[Color] = [Color("#4cd2f2"), Color("#3cc2eb"), Color("#62def8"), Color("#42b8e6")]
			var cry_tint: Color = cry_palette[crystal_idx % 4]
			var mat_cry := StandardMaterial3D.new()
			mat_cry.vertex_color_use_as_albedo = true
			mat_cry.vertex_color_is_srgb = true
			mat_cry.albedo_color = cry_tint.lerp(Color("#1d5874"), 0.44)
			mat_cry.roughness = 0.08
			mat_cry.metallic = 0.15
			mat_cry.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
			mat_cry.rim_enabled = true; mat_cry.rim = 0.42; mat_cry.rim_tint = 0.78
			mat_cry.emission_enabled = true
			mat_cry.emission = cry_tint
			mat_cry.emission_energy_multiplier = 0.06 # Modulated dynamically by fx.apply_lighting_phase!

			var spire_counts: Array[int] = [7, 5, 6, 5]
			var cluster_scales: Array[float] = [1.22, 0.94, 1.06, 0.88]
			var spire_count: int = spire_counts[crystal_idx % 4]
			var scale_cluster: float = cluster_scales[crystal_idx % 4]
			for j in range(spire_count + 3):
				var cry := MeshInstance3D.new()
				var is_shard := j >= spire_count
				var h_sp := ((0.28 + float(j - spire_count) * 0.08) if is_shard else (1.28 - float(j) * 0.13 + fmod(float(crystal_idx) * 0.21, 0.24))) * scale_cluster
				var r_bot := (0.055 if is_shard else (0.19 - float(j) * 0.015)) * scale_cluster
				cry.mesh = _env_kit.build_faceted_crystal_mesh(maxf(0.22, h_sp), maxf(0.045, r_bot), float(crystal_idx * 11 + j) * 1.37)
				cry.material_override = mat_cry
				var ang := float(j) * (TAU / float(spire_count + (3 if is_shard else 0))) + float(crystal_idx) * 1.15
				var rad_o := ((0.44 + float(j % 2) * 0.14) if is_shard else (0.04 if j == 0 else (0.20 + float(j % 2) * 0.15))) * scale_cluster
				cry.position = Vector3(cos(ang) * rad_o, -0.04, sin(ang) * rad_o)
				cry.rotation = Vector3(sin(ang) * (0.55 if is_shard else (0.10 if j == 0 else 0.34)), float(j) * 0.9, -cos(ang) * (0.50 if is_shard else (0.08 if j == 0 else 0.30)))
				cry_root.add_child(cry)

			var cl := OmniLight3D.new()
			cl.light_color = cry_tint
			cl.light_energy = 0.0
			cl.omni_range = 5.2 * scale_cluster
			cl.omni_attenuation = 1.60
			cl.distance_fade_enabled = false
			cl.position = Vector3(0.0, 0.82 * scale_cluster, 0.0)
			cry_root.add_child(cl)
			fx.register_arcane_crystal(cl, mat_cry, 1.18 * scale_cluster, 0.08, 1.55)
			crystal_idx += 1

	# Weathered beveled stepped masonry sanctuary arc wall fragments + hanging ivy + broken plaza rim relief!
	var arc_frags := [
		[Vector2(12.2, 5.4), 2.30, 1.36, 0.36],
		[Vector2(25.2, 5.8), 2.48, 1.52, -0.42],
		[Vector2(28.6, 10.2), 1.98, 1.18, -1.16],
		[Vector2(29.0, 17.6), 2.15, 1.02, -1.86],
	]
	for afi in range(arc_frags.size()):
		var af: Array = arc_frags[afi]
		var afp: Vector2 = af[0]
		var af_w: float = float(af[1])
		var af_h: float = float(af[2])
		var af_yaw: float = float(af[3])
		var afy := _eval_cliff_height(afp.x, afp.y, width_m, depth_m)
		var wall_root := Node3D.new()
		wall_root.name = "SanctuaryRuinedWall_%d" % afi
		wall_root.position = Vector3(afp.x, afy, afp.y)
		wall_root.rotation.y = af_yaw
		_grp_env_geo.add_child(wall_root)

		var pl_w := MeshInstance3D.new()
		pl_w.mesh = _env_kit.build_beveled_ruin_block(Vector3(af_w + 0.28, 0.34, 0.84), 0.055, float(afi) * 2.1, false)
		pl_w.material_override = mat_plinth; pl_w.position.y = 0.15
		wall_root.add_child(pl_w)
		var lo_w := MeshInstance3D.new()
		lo_w.mesh = _env_kit.build_beveled_ruin_block(Vector3(af_w, af_h * 0.54, 0.64), 0.055, float(afi) * 2.5 + 0.4, false)
		lo_w.material_override = mat_ashlar; lo_w.position = Vector3(0.0, 0.28 + af_h * 0.27, 0.0)
		wall_root.add_child(lo_w)
		var hi_a := MeshInstance3D.new()
		hi_a.mesh = _env_kit.build_beveled_ruin_block(Vector3(af_w * 0.56, af_h * 0.46, 0.58), 0.06, float(afi) * 3.1 + 0.9, true)
		hi_a.material_override = mat_carved
		hi_a.position = Vector3(-af_w * 0.20 if afi % 2 == 0 else af_w * 0.18, 0.28 + af_h * 0.72, 0.0)
		hi_a.rotation.z = 0.025 if afi % 2 == 0 else -0.025
		wall_root.add_child(hi_a)
		var cap_w := MeshInstance3D.new()
		cap_w.mesh = _env_kit.build_beveled_ruin_block(Vector3(af_w * 0.44, 0.19, 0.72), 0.04, float(afi) * 3.7, true)
		cap_w.material_override = mat_carved
		cap_w.position = Vector3((-af_w * 0.24 if afi % 2 == 0 else af_w * 0.22), 0.28 + af_h * 0.96, 0.0)
		wall_root.add_child(cap_w)
		var fall_b := MeshInstance3D.new()
		fall_b.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.72, 0.34, 0.54), 0.05, float(afi) * 4.3, true)
		fall_b.material_override = mat_ashlar
		fall_b.position = Vector3(af_w * 0.48 if afi % 2 == 0 else -af_w * 0.48, 0.15, 0.46)
		fall_b.rotation = Vector3(0.08, 0.36, 0.12)
		wall_root.add_child(fall_b)
		# Trailing cliff ivy hugging the weathered sanctuary wall crown
		var ivy_off := Vector3(sin(af_yaw) * 0.34, af_h * 0.78, cos(af_yaw) * 0.34)
		_env_kit.append_multimesh("cliff_ivy_hang_mm", Transform3D(Basis(Vector3.UP, af_yaw).scaled_local(Vector3(0.88, 0.75, 0.88)), Vector3(afp.x, afy, afp.y) + ivy_off), Color(0.90, 0.95, 0.88))

	# Subtle 3D carved perimeter curb wedges & patinated bronze astronomical studs anchoring the sanctuary circle physically!
	for ci in range(8):
		var c_ang := float(ci) * (TAU / 8.0) + 0.18
		var cx_p := 19.0 + cos(c_ang) * 6.22
		var cz_p := 12.6 + sin(c_ang) * 6.22
		# Keep South hearth walkway & North causeway clear
		if absf(cx_p - 19.2) < 1.8 and (cz_p < 7.5 or cz_p > 17.5):
			continue
		var cy_p := _eval_cliff_height(cx_p, cz_p, width_m, depth_m)
		var stud := MeshInstance3D.new()
		var sm_b := CylinderMesh.new(); sm_b.top_radius = 0.16; sm_b.bottom_radius = 0.20; sm_b.height = 0.06; sm_b.radial_segments = 8
		stud.mesh = sm_b; stud.material_override = mat_bronze_pat
		stud.position = Vector3(cx_p, cy_p + 0.02, cz_p)
		stud.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(stud)

	# 5. Lush Wind-Sculpted Highland Flora (6 Windswept Krummholz Pines visibly perched on terraced benches + 5-Species Ground Cover!)
	var windswept_pines := [
		[Vector2(-5.2, 16.4), 0.96, Vector2(-0.86, 0.48)],   # Visibly crowning the mossy west terrace above arrival signpost!
		[Vector2(-8.6, 22.8), 0.92, Vector2(-0.82, 0.56)],   # Framing SW Retiro arrival stairs left flank!
		[Vector2(0.2, 30.8),  0.80, Vector2(-0.75, 0.65)],   # Gripping SW foreground buttress well clear of stairs!
		[Vector2(-9.2, 9.8),  1.12, Vector2(-0.90, 0.40)],   # Upper western continental bench!
		[Vector2(-2.2, 4.2),  0.88, Vector2(-0.86, 0.50)],   # NW shoulder framing broken fluted archway!
		[Vector2(23.5, -16.8), 0.76, Vector2(-0.84, 0.54)],  # Windswept sentinel pine gripping solid Observatory headland!
	]
	for pi in range(windswept_pines.size()):
		var wp_s: Array = windswept_pines[pi]
		var wpp: Vector2 = wp_s[0]
		var wpy := _eval_cliff_height(wpp.x, wpp.y, width_m, depth_m)
		_env_kit.build_windswept_pine(_grp_vegetation, Vector3(wpp.x, wpy - 0.10, wpp.y), float(wp_s[1]), wp_s[2], mat_cedar_o, mat_pine_leaf, float(pi) * 2.7 + 0.6)

	# Focused botanical clusters along SW arrival stairs, continental slopes, rim crevices & ruin bases (keeping plaza clean!)
	var flora_zones := [
		# SW arrival stairs & welcome wildflowers (warm golden-yellow + purple heather + windswept sedge)
		[Vector2(2.8, 22.8), 1.0, "wildflower"], [Vector2(5.2, 24.4), 1.1, "wildflower"], [Vector2(7.0, 26.2), 1.05, "heather"],
		[Vector2(-1.2, 25.2), 1.15, "wildflower"], [Vector2(-4.4, 27.6), 1.2, "shrub"], [Vector2(0.8, 27.8), 1.1, "wildflower"],
		[Vector2(3.6, 17.6), 1.05, "grass"], [Vector2(5.4, 17.0), 0.95, "wildflower"], [Vector2(8.8, 22.6), 1.0, "heather"],
		[Vector2(10.4, 25.4), 1.05, "wildflower"], [Vector2(12.2, 27.6), 0.98, "grass"], [Vector2(14.5, 28.5), 1.0, "wildflower"],
		# Western ridge & NW sanctuary framing shrubs, heather & sedge
		[Vector2(3.8, 13.5), 1.15, "shrub"], [Vector2(4.2, 9.8), 1.08, "heather"], [Vector2(5.4, 5.2), 1.12, "shrub"],
		[Vector2(8.4, 4.8), 1.0, "grass"], [Vector2(10.8, 5.6), 0.95, "wildflower"], [Vector2(3.2, 6.2), 1.1, "grass"],
		[Vector2(-0.8, 18.8), 1.25, "shrub"], [Vector2(-3.2, 13.5), 1.32, "shrub"], [Vector2(-4.5, 8.2), 1.28, "shrub"],
		[Vector2(-1.5, 9.5), 1.12, "heather"], [Vector2(-6.5, 21.0), 1.25, "shrub"], [Vector2(-8.2, 27.5), 1.18, "grass"],
		# East / NE / SE rim crevice flora & ruin base tufts
		[Vector2(23.5, 4.6), 0.98, "grass"], [Vector2(27.2, 6.2), 1.05, "heather"], [Vector2(31.8, 9.8), 0.95, "grass"],
		[Vector2(32.2, 14.5), 1.02, "wildflower"], [Vector2(31.5, 19.2), 1.05, "heather"], [Vector2(30.4, 23.2), 0.98, "grass"],
		[Vector2(27.4, 26.8), 1.0, "wildflower"], [Vector2(22.6, 28.4), 0.96, "heather"], [Vector2(18.2, 28.6), 1.02, "grass"],
		# Observatory headland turf & coastal scrub seated tightly on the (27.4, -17.8) crag!
		[Vector2(24.4, -15.6), 1.05, "shrub"], [Vector2(30.4, -16.2), 1.04, "shrub"], [Vector2(24.8, -19.8), 1.02, "heather"],
		[Vector2(30.6, -19.6), 1.04, "grass"], [Vector2(26.2, -14.8), 0.96, "wildflower"], [Vector2(28.8, -15.2), 0.98, "grass"],
	]
	for fzi in range(flora_zones.size()):
		var fz: Array = flora_zones[fzi]
		var fp: Vector2 = fz[0]
		var fsc: float = float(fz[1])
		var fkind: String = str(fz[2])
		var fy := _eval_cliff_height(fp.x, fp.y, width_m, depth_m)
		if fy < -4.8:
			continue
		var mm_k := "cliff_heather_mm"
		if fkind == "grass": mm_k = "cliff_grass_mm"
		elif fkind == "wildflower": mm_k = "cliff_wildflower_mm"
		elif fkind == "shrub": mm_k = "cliff_shrub_mm"
		# Wind-lean slightly downwind toward W/SW for authentic exposed headland motion
		var xf_f := Transform3D(Basis.from_euler(Vector3(0.06, float(fzi) * 1.45, 0.10)).scaled_local(Vector3(fsc, fsc * 0.88, fsc)), Vector3(fp.x, fy - 0.03, fp.y))
		_env_kit.append_multimesh(mm_k, xf_f, Color(rng.randf_range(0.90, 1.05), rng.randf_range(0.90, 1.04), rng.randf_range(0.88, 1.04)))

	# Natural organic scatter across plateau crevices, western slopes & scree (keeping astronomical plaza & trail treads clean!)
	for cf_i in range(138):
		var cfx := rng.randf_range(-12.0, width_m - 2.0)
		var cfz := rng.randf_range(-4.0, depth_m + 4.0)
		if Vector2(cfx - 19.0, cfz - 12.6).length() < 6.4 or Vector2(cfx - 17.8, cfz - 15.2).length() < 4.5:
			continue
		if absf(cfx - 19.3) < 2.6 and cfz < 6.8:
			continue # Keep northern bridge causeway tread crisp
		var ti_f := _cliff_arrival_trail_info(cfx, cfz)
		if cfx < 7.2 and float(ti_f["dist"]) < 1.85:
			continue # Keep arrival stone stair tread clear
		var cfy := _eval_cliff_height(cfx, cfz, width_m, depth_m)
		if cfy < -3.8:
			continue
		var roll := cf_i % 10
		if roll < 3:
			var gsc := rng.randf_range(0.68, 1.18)
			_env_kit.append_multimesh("cliff_grass_mm", Transform3D(Basis.from_euler(Vector3(0.05, rng.randf() * TAU, 0.09)).scaled_local(Vector3(gsc, gsc * 0.88, gsc)), Vector3(cfx, cfy - 0.02, cfz)), Color(rng.randf_range(0.86, 1.04), rng.randf_range(0.90, 1.05), rng.randf_range(0.82, 0.98)))
		elif roll < 6:
			var hsc := rng.randf_range(0.66, 1.14)
			_env_kit.append_multimesh("cliff_heather_mm", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(Vector3(hsc, hsc * 0.86, hsc)), Vector3(cfx, cfy - 0.02, cfz)), Color(rng.randf_range(0.88, 1.04), rng.randf_range(0.86, 1.02), rng.randf_range(0.92, 1.06)))
		elif roll < 8:
			var wsc := rng.randf_range(0.62, 1.06)
			_env_kit.append_multimesh("cliff_wildflower_mm", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(Vector3(wsc, wsc * 0.88, wsc)), Vector3(cfx, cfy - 0.02, cfz)), Color(rng.randf_range(0.92, 1.06), rng.randf_range(0.92, 1.04), rng.randf_range(0.86, 1.00)))
		elif roll == 8 and cfx < 6.0:
			var shsc := rng.randf_range(0.85, 1.32)
			_env_kit.append_multimesh("cliff_shrub_mm", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(Vector3(shsc, shsc * 0.84, shsc)), Vector3(cfx, cfy - 0.04, cfz)), Color(rng.randf_range(0.86, 1.02), rng.randf_range(0.90, 1.04), rng.randf_range(0.84, 0.98)))
		else:
			var ssc := Vector3(rng.randf_range(0.18, 0.46), rng.randf_range(0.08, 0.20), rng.randf_range(0.16, 0.40))
			_env_kit.append_multimesh("cliff_scree", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(ssc), Vector3(cfx, cfy + ssc.y * 0.14, cfz)), Color(0.86, 0.90, 0.94))

	_env_kit.flush_multimeshes(_grp_env_geo, "CliffGeo_")

	# 6. Upgraded Highland & Sea-Cliff Wildlife (Open-Terrace Sculpted Ibexes, Arrival Hare, Dark-Beak Ravens & Open-Ocean Gulls!)
	FaunaKit.spawn_highland_ibex(_grp_vegetation, fauna_agents, "CliffIbex", [
		Vector3(4.2, 0.0, 12.2), Vector3(6.8, 0.0, 10.6),
		Vector3(9.8, 0.0, 5.4), Vector3(12.2, 0.0, 4.4),
		Vector3(6.4, 0.0, 13.4), Vector3(3.6, 0.0, 14.2),
	], 32.0, 1.2, 1.08)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 0.0, 1.0, 0.0, true, 4.8)

	FaunaKit.spawn_highland_ibex(_grp_vegetation, fauna_agents, "CliffIbexRidge", [
		Vector3(-5.8, 0.0, 14.5), Vector3(-3.2, 0.0, 11.4),
		Vector3(-1.8, 0.0, 6.2), Vector3(-5.4, 0.0, 8.8),
	], 36.0, 9.5, 0.88)
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 0.0, 1.0, 0.0, true, 5.2)

	FaunaKit.spawn_rabbit(_grp_vegetation, fauna_agents, "CliffHare", [
		Vector3(4.8, 0.0, 17.4), Vector3(7.6, 0.0, 18.0),
		Vector3(9.4, 0.0, 20.6), Vector3(6.4, 0.0, 21.8),
		Vector3(4.5, 0.0, 19.6),
	], 18.0, 1.4, Color("#8e7e6c"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "dusk", "day"], ["rain", "storm", "snow"], 0.0, 1.0, 0.0, true, 3.8)

	var r0_y := _eval_cliff_height(6.75, 6.75, width_m, depth_m) + 3.36
	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "CliffPerchedRaven_0", Vector3(6.6, r0_y, 6.75), 0.75, Color("#1a202c"), Color("#111620"), 1.22, 0.8, Color("#202632"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 0.0, 1.0, 0.0, false, 3.6)

	var r1_y := _eval_cliff_height(21.7, 3.0, width_m, depth_m) + 2.52
	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "CliffPerchedRaven_1", Vector3(21.7, r1_y, 3.0), -2.2, Color("#181e29"), Color("#10141d"), 1.18, 2.6, Color("#1f2430"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn", "day"], ["storm"], 0.0, 1.0, 0.0, false, 3.6)

	# Banking coastal gulls & chasm ravens gliding strictly over open eastern ocean & northern chasm (min_x >= 36.5!)
	FaunaKit.spawn_soaring_bird(_grp_vegetation, fauna_agents, "CliffSeaGull_0", Vector3(46.5, 1.6, 16.0), 8.5, 13.0, 22.0, 0.6, Color("#dde3ea"), Color("#6d7b8c"), 1.38, 1.0, 1.5, Color("#d89c36"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 0.0, 1.0, 0.0, false, 0.0)
	FaunaKit.spawn_soaring_bird(_grp_vegetation, fauna_agents, "CliffSeaGull_1", Vector3(44.5, -2.4, 24.0), 7.5, 11.0, 26.0, 3.4, Color("#d4dce4"), Color("#5f6e80"), 1.32, -1.0, 1.4, Color("#d89c36"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk"], ["storm"], 0.0, 1.0, 0.0, false, 0.0)
	FaunaKit.spawn_soaring_bird(_grp_vegetation, fauna_agents, "CliffAbyssRaven_0", Vector3(22.5, 3.2, -7.5), 9.5, 6.2, 19.0, 2.1, Color("#1c222e"), Color("#121720"), 1.28, 1.0, 1.2, Color("#202632"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dawn", "day", "dusk", "night"], ["storm"], 0.0, 1.0, 0.0, false, 0.0)
	sync_wildlife()

	# 7. Northern Sky Aurora Curtains (shimmering cleanly BEHIND the Clifftop Observatory dome!) + Sea-Chasm & Abyss Mist Layers!
	for i in range(3):
		var aurora := MeshInstance3D.new()
		aurora.name = "ObservatoryAurora_%d" % i
		var am := PlaneMesh.new()
		am.size = Vector2(76.0, 15.0); am.subdivide_width = 28; am.subdivide_depth = 8
		aurora.mesh = am
		aurora.material_override = MatKit.create_aurora_shader_material(
			Color("#42f2be") if i % 2 == 0 else Color("#5ad8ff"),
			Color("#7a68ff"),
			float(i) * 2.1
		)
		aurora.position = Vector3(width_m * 0.56 + float(i - 1) * 8.5, 10.6 + float(i) * 1.4, -38.0 - float(i) * 4.0)
		aurora.rotation.x = deg_to_rad(62.0)
		aurora.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(aurora)
		fx.register_aurora(aurora)

	# Drifting abyssal sea-mist clouds wrapping the eastern sea stacks AND swirling beneath the Observatory stone-arch bridge!
	var mist_spots := [
		[Vector3(44.0, -8.4, 14.0), Vector2(26.0, 13.0), 0.72],
		[Vector3(48.0, -6.2, 28.0), Vector2(28.0, 14.0), 0.64],
		[Vector3(34.0, -8.8, 38.0), Vector2(24.0, 12.0), 0.58],
		[Vector3(21.5, -7.8, -8.5), Vector2(22.0, 11.5), 0.68], # Mist drifting right under the stone-arch chasm bridge!
		[Vector3(33.5, -6.5, -13.5), Vector2(24.0, 12.0), 0.76],
		[Vector3(46.5, -9.0, -6.0), Vector2(26.0, 13.0), 0.62],
	]
	for ci in range(mist_spots.size()):
		var ms: Array = mist_spots[ci]
		var cld := MeshInstance3D.new()
		var clm := PlaneMesh.new(); clm.size = ms[1]
		cld.mesh = clm
		cld.material_override = MatKit.create_cloud_wisp_shader_material(Color(0.70, 0.78, 0.88, 0.16))
		cld.position = ms[0]
		cld.rotation.x = deg_to_rad(8.0)
		cld.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(cld)
		fx.register_cloud(cld, cld.position.x, width_m + 68.0, float(ms[2]))

	# 8. Cozy Sheltered Hearth Ring, Expedition Camp Pennant & Relocated Astronomical Lookout Pointing at the Observatory!
	var wb_center := Vector3(18.75, _eval_cliff_height(18.75, 15.75, width_m, depth_m), 15.75)
	for wb_i in range(5):
		var wa := lerpf(-PI * 0.80, -PI * 0.20, float(wb_i) / 4.0)
		var wr := 1.42
		var hb := MeshInstance3D.new()
		hb.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.46, 0.28 + sin(float(wb_i) * 1.6) * 0.06, 0.34), 0.045, float(wb_i) * 1.9, true)
		hb.material_override = mat_plinth
		hb.position = wb_center + Vector3(cos(wa) * wr, 0.13, sin(wa) * wr)
		hb.rotation.y = wa + PI * 0.5
		_grp_props.add_child(hb)
	PropFactory.create_woven_rug(_grp_props, "CliffHearthMat", Vector3(17.95, _eval_cliff_height(17.95, 16.55, width_m, depth_m) + 0.008, 16.55), Vector2(1.88, 0.98), Color("#8c4a35"), Color("#cc9a5a"), 0.25)

	# Weathered crimson-ochre expedition camp pennant staff beside the storm tarp (warm storytelling focal point!)
	var pen_y := _eval_cliff_height(13.2, 13.8, width_m, depth_m)
	var pen_root := Node3D.new(); pen_root.name = "CliffExpeditionPennant"; pen_root.position = Vector3(13.2, pen_y, 13.8); _grp_props.add_child(pen_root)
	CoastalKit.add_oriented_cyl(pen_root, Vector3(0.0, -0.05, 0.0), Vector3(-0.08, 2.38, 0.04), 0.036, 0.024, mat_cedar_o, 7)
	CoastalKit.add_oriented_cyl(pen_root, Vector3(-0.06, 2.18, 0.03), Vector3(-0.62, 2.14, 0.08), 0.018, 0.015, mat_cedar_o, 6)
	var ban_mi := MeshInstance3D.new()
	var ban_m := PlaneMesh.new(); ban_m.size = Vector2(0.50, 1.02)
	ban_mi.mesh = ban_m; ban_mi.material_override = mat_pennant
	ban_mi.position = Vector3(-0.34, 1.64, 0.06); ban_mi.rotation = Vector3(PI * 0.5, 0.08, 0.06)
	pen_root.add_child(ban_mi)

	# Astronomical northern lookout pedestal + brass meridian dial + tripod spyglass aimed directly NE toward the Clifftop Observatory!
	var look_y := _eval_cliff_height(14.3, 4.45, width_m, depth_m)
	var look_pos := Vector3(14.3, look_y, 4.45)
	var ped := MeshInstance3D.new()
	ped.name = "AstronomicalCompassPedestal"
	ped.mesh = _env_kit.build_fluted_column(0.54, 0.52, false, 12, 2.4)
	ped.material_override = mat_carved; ped.position = look_pos + Vector3(0.0, 0.0, -0.25)
	_grp_props.add_child(ped)
	var dial := MeshInstance3D.new()
	var dlm := TorusMesh.new(); dlm.inner_radius = 0.34; dlm.outer_radius = 0.43; dlm.rings = 18
	dial.mesh = dlm; dial.material_override = mat_bronze_pat; dial.position = look_pos + Vector3(0.0, 0.54, -0.25)
	_grp_props.add_child(dial)

	var spy_root := Node3D.new()
	spy_root.name = "CliffLookoutSpyglass"
	spy_root.position = look_pos + Vector3(-0.64, 0.0, -0.10)
	_grp_props.add_child(spy_root)
	for tri_i in range(3):
		var ta := float(tri_i) * TAU / 3.0
		var leg := MeshInstance3D.new()
		var lm_t := CylinderMesh.new(); lm_t.top_radius = 0.018; lm_t.bottom_radius = 0.024; lm_t.height = 0.90; lm_t.radial_segments = 6
		leg.mesh = lm_t; leg.material_override = mat_cedar_o
		leg.position = Vector3(cos(ta) * 0.14, 0.42, sin(ta) * 0.14)
		leg.rotation = Vector3(-sin(ta) * 0.28, 0.0, cos(ta) * 0.28)
		spy_root.add_child(leg)
	var tube_o := MeshInstance3D.new()
	var tm_o := CylinderMesh.new(); tm_o.top_radius = 0.050; tm_o.bottom_radius = 0.028; tm_o.height = 0.62; tm_o.radial_segments = 10
	tube_o.mesh = tm_o; tube_o.material_override = mat_bronze_pat
	tube_o.position = Vector3(0.0, 0.88, 0.0); tube_o.rotation = Vector3(1.42, -0.34, 0.0) # Aimed directly NE at Observatory dome!
	spy_root.add_child(tube_o)
	var cliff_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, look_pos + Vector3(0.62, 0.08, 0.18))
	cliff_lan.name = "CliffObservatoryFieldLantern"

# ------------------------------------------------------------------------------
# Camp 04 Helper A: Canonical SW Arrival Staircase & Retiro Trail (observatory-coast / inland)
# ------------------------------------------------------------------------------
func _build_observatory_arrival_path(
	fx: CampAtmosphereFx,
	width_m: float,
	depth_m: float,
	mat_ashlar: Material,
	mat_carved: Material,
	mat_plinth: Material,
	mat_wood: Material,
	mat_rope: Material,
	bcol_keys: Array[String]
) -> void:
	var arr_root := Node3D.new()
	arr_root.name = "RetiroArrivalStaircase"
	_grp_structures.add_child(arr_root)

	var stair_body := StaticBody3D.new()
	stair_body.name = "ArrivalStairsCollider"
	arr_root.add_child(stair_body)

	var post_tops: Array[Vector3] = []
	var step_count := 18
	for si in range(step_count):
		var t := float(si) / float(step_count - 1)
		var sx := lerpf(5.4, -14.8, t)
		var ti := _cliff_arrival_trail_info(sx, 24.0)
		var sz: float = float(ti["z"])
		var sy: float = float(ti["y"])
		var ti_n := _cliff_arrival_trail_info(sx - 0.6, 24.0)
		var tang := Vector2(-0.6, float(ti_n["z"]) - sz).normalized()
		var yaw_s := atan2(tang.x, tang.y)
		var perp := Vector2(tang.y, -tang.x) # Points SOUTH-EAST / outward toward the exposed cliff drop!

		# Broad weathered beveled carved stone tread seated solidly into the hillside
		var step_w := 2.85 if si < 4 else 2.55
		var step_mi := MeshInstance3D.new()
		step_mi.mesh = _env_kit.build_beveled_ruin_block(Vector3(step_w, 0.42, 1.28), 0.055, float(si) * 1.73, true)
		step_mi.material_override = mat_carved if si % 3 != 0 else mat_ashlar
		step_mi.position = Vector3(sx, sy - 0.14, sz)
		step_mi.rotation.y = yaw_s + sin(float(si) * 1.3) * 0.04
		arr_root.add_child(step_mi)

		# Walkable stair collision block on upper reachable section
		if si < 11:
			var scs := CollisionShape3D.new()
			var sbs := BoxShape3D.new(); sbs.size = Vector3(step_w, 0.36, 1.34)
			scs.shape = sbs
			scs.position = Vector3(sx, sy - 0.14, sz)
			scs.rotation.y = yaw_s
			stair_body.add_child(scs)

		# Dry-stone retaining curb & buttresses along the exposed outer (southern) flank of the stairs
		if si % 2 == 0:
			var curb_xz := Vector2(sx, sz) + perp * (step_w * 0.54)
			var curb_mi := MeshInstance3D.new()
			curb_mi.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.56, 0.72, 1.95), 0.055, float(si) * 2.4, true)
			curb_mi.material_override = mat_plinth
			curb_mi.position = Vector3(curb_xz.x, sy + 0.06, curb_xz.y)
			curb_mi.rotation.y = yaw_s
			arr_root.add_child(curb_mi)
			# Columnar basalt buttress anchoring the retaining wall down into the SW shoulder
			var b_xz := curb_xz + perp * 0.85
			_env_kit.append_multimesh(bcol_keys[si % bcol_keys.size()], Transform3D(Basis(Vector3.UP, yaw_s + float(si)).scaled_local(Vector3(1.55, 2.8, 1.45)), Vector3(b_xz.x, sy - 1.55, b_xz.y)), Color(0.84, 0.88, 0.92))
			if si % 4 == 0:
				_env_kit.append_multimesh("cliff_ivy_hang_mm", Transform3D(Basis(Vector3.UP, yaw_s + PI * 0.5).scaled_local(Vector3(0.95, 0.85, 0.95)), Vector3(curb_xz.x + perp.x * 0.28, sy + 0.35, curb_xz.y + perp.y * 0.28)), Color(0.90, 0.95, 0.88))

		# Weathered timber handrail posts curving gracefully along the outer stair rim
		if si in [1, 4, 7, 10, 13, 16]:
			var post_xz := Vector2(sx, sz) + perp * (step_w * 0.52)
			var p_bot := Vector3(post_xz.x, sy - 0.12, post_xz.y)
			var p_top := Vector3(post_xz.x + perp.x * 0.06, sy + 1.02, post_xz.y + perp.y * 0.06)
			CoastalKit.add_oriented_cyl(arr_root, p_bot, p_top, 0.062, 0.048, mat_wood, 7)
			post_tops.append(p_top - Vector3(0.0, 0.14, 0.0))

	# Sagging weathered hemp rope guide rail connecting the timber posts
	for pi in range(post_tops.size() - 1):
		var pa: Vector3 = post_tops[pi]
		var pb: Vector3 = post_tops[pi + 1]
		var pmid := pa.lerp(pb, 0.5) - Vector3(0.0, 0.16, 0.0)
		CoastalKit.add_oriented_cyl(arr_root, pa, pmid, 0.022, 0.022, mat_rope, 6, false)
		CoastalKit.add_oriented_cyl(arr_root, pmid, pb, 0.022, 0.022, mat_rope, 6, false)

	# Canonical Stormwreck Trail Signpost, Basalt Cairn & Hanging Trail Lantern at top arrival landing (4.2, y, 18.6)!
	var sp_y := _eval_cliff_height(4.2, 18.6, width_m, depth_m)
	var sign_root := Node3D.new(); sign_root.name = "RetiroObservatorySignpost"; sign_root.position = Vector3(4.2, sp_y, 18.6); arr_root.add_child(sign_root)
	CoastalKit.add_oriented_cyl(sign_root, Vector3(0.0, -0.08, 0.0), Vector3(0.04, 2.08, -0.02), 0.072, 0.056, mat_wood, 8)
	# Two angled directional trail boards: NE toward Observatory & SW back down to El Retiro
	var b_obs := MeshInstance3D.new()
	b_obs.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.96, 0.22, 0.06), 0.015, 1.2, false)
	b_obs.material_override = mat_wood; b_obs.position = Vector3(0.32, 1.82, -0.08); b_obs.rotation.y = 0.68
	sign_root.add_child(b_obs)
	var b_ret := MeshInstance3D.new()
	b_ret.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.92, 0.22, 0.06), 0.015, 2.4, false)
	b_ret.material_override = mat_wood; b_ret.position = Vector3(-0.32, 1.54, 0.08); b_ret.rotation.y = -0.48
	sign_root.add_child(b_ret)
	# Small cross-arm holding a weathered storm lantern guiding arrivals at dusk & night!
	CoastalKit.add_oriented_cyl(sign_root, Vector3(0.02, 1.96, 0.0), Vector3(0.42, 1.98, 0.24), 0.022, 0.018, mat_wood, 6)
	var arr_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, Vector3(4.2, sp_y, 18.6) + Vector3(0.40, 1.66, 0.22))
	arr_lan.name = "ArrivalSignpostLantern"
	# Stacked dry-stone trail cairn anchoring the signpost base
	for ci in range(3):
		var cr := MeshInstance3D.new()
		var csc := Vector3(0.56 - float(ci) * 0.12, 0.18, 0.48 - float(ci) * 0.10)
		cr.mesh = _env_kit.build_beveled_ruin_block(csc, 0.04, float(ci) * 2.2, true)
		cr.material_override = mat_plinth
		cr.position = Vector3(-0.36, 0.08 + float(ci) * 0.16, -0.22); cr.rotation.y = float(ci) * 0.65
		sign_root.add_child(cr)

# ------------------------------------------------------------------------------
# Camp 04 Helper B: North Causeway Gate, Ancient Stone-Arch Bridge & Distant Clifftop Observatory
# ------------------------------------------------------------------------------
func _build_observatory_bridge_and_landmark(
	fx: CampAtmosphereFx,
	width_m: float,
	depth_m: float,
	mat_ashlar: Material,
	mat_carved: Material,
	mat_plinth: Material,
	mat_bronze_pat: Material,
	mat_dome_copper: Material,
	mat_plank: Material,
	mat_wood: Material,
	mat_rope: Material,
	bcol_keys: Array[String],
	bcol_dark_keys: Array[String],
	sea_foam_sources: Array
) -> void:
	var br_root := Node3D.new()
	br_root.name = "ObservatoryCausewayAndBridge"
	_grp_structures.add_child(br_root)

	# 1. Northern Departure Causeway Gateway (Fluted Twin Gate Piers framing the bridge departure!)
	var gate_pts := [Vector2(16.9, 3.0), Vector2(21.7, 3.0)]
	for gi in range(2):
		var gp: Vector2 = gate_pts[gi]
		var gy := _eval_cliff_height(gp.x, gp.y, width_m, depth_m)
		var g_node := Node3D.new(); g_node.name = "BridgeGatePier_%d" % gi; g_node.position = Vector3(gp.x, gy, gp.y); br_root.add_child(g_node)
		var gpl := MeshInstance3D.new()
		gpl.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.18, 0.38, 1.18), 0.06, 11.1 + float(gi), false)
		gpl.material_override = mat_plinth; gpl.position.y = 0.17
		g_node.add_child(gpl)
		var gcol := MeshInstance3D.new()
		var gh := 2.75 if gi == 0 else 2.22
		gcol.mesh = _env_kit.build_fluted_column(0.38, gh, gi == 1, 12, 12.0 + float(gi))
		gcol.material_override = mat_carved; gcol.position.y = 0.34
		g_node.add_child(gcol)
		var gband := MeshInstance3D.new()
		var gbm := TorusMesh.new(); gbm.inner_radius = 0.36; gbm.outer_radius = 0.42; gbm.rings = 16
		gband.mesh = gbm; gband.material_override = mat_bronze_pat; gband.position.y = 1.55
		g_node.add_child(gband)
		if gi == 0:
			var gcap := MeshInstance3D.new()
			gcap.mesh = _env_kit.build_beveled_ruin_block(Vector3(1.12, 0.28, 1.04), 0.05, 13.4, true)
			gcap.material_override = mat_ashlar; gcap.position = Vector3(0.22, 0.34 + gh + 0.10, 0.0); gcap.rotation.z = -0.10
			g_node.add_child(gcap)
			var g_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, Vector3(gp.x + 0.56, gy + 0.44, gp.y + 0.28))
			g_lan.name = "BridgeGateBeaconLantern"

	# Irregular weathered flagstone causeway slabs leading organically from the compass edge onto the bridge deck!
	for ci in range(4):
		var cz_s := lerpf(4.9, 1.7, float(ci) / 3.0)
		var cy_s := _eval_cliff_height(19.3, cz_s, width_m, depth_m)
		var slab := MeshInstance3D.new()
		slab.mesh = _env_kit.build_beveled_ruin_block(Vector3(2.95 - float(ci % 2) * 0.25, 0.14, 0.98), 0.04, 15.0 + float(ci) * 1.7, true)
		slab.material_override = mat_plinth if ci % 2 == 0 else mat_ashlar
		slab.position = Vector3(19.3 + sin(float(ci) * 1.9) * 0.08, cy_s - 0.03, cz_s)
		slab.rotation.y = sin(float(ci) * 2.3) * 0.045
		slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		br_root.add_child(slab)

	# 2. Ancient Stone-Arch Bridge + Repaired Timber/Rope Mid-Span crossing the Open Northern Sea-Chasm!
	var p_start := Vector3(19.35, 0.14, 1.40)
	var p_end := Vector3(24.60, 0.95, -11.40)
	var b_vec := p_end - p_start
	var b_len := Vector2(b_vec.x, b_vec.z).length()
	var b_dir_xz := Vector2(b_vec.x, b_vec.z).normalized()
	var b_yaw := atan2(b_dir_xz.x, b_dir_xz.y)
	var b_perp := Vector2(-b_dir_xz.y, b_dir_xz.x)

	var deck_pt := func(u: float) -> Vector3:
		var base_p := p_start.lerp(p_end, u)
		var crown := sin(u * PI) * 0.36
		return base_p + Vector3(0.0, crown, 0.0)

	# Massive battered masonry abutments descending deep down both chasm faces to ocean surf!
	for ab_u: float in [0.02, 0.98]:
		var ap: Vector3 = deck_pt.call(ab_u)
		var abut := MeshInstance3D.new()
		abut.mesh = _env_kit.build_beveled_ruin_block(Vector3(3.9, 16.5, 2.5), 0.12, 20.0 + ab_u * 10.0, false)
		abut.material_override = mat_plinth
		abut.position = Vector3(ap.x, ap.y - 8.35, ap.z)
		abut.rotation.y = b_yaw
		br_root.add_child(abut)
		for side_a: float in [-1.0, 1.0]:
			var rock_xz: Vector2 = Vector2(ap.x, ap.z) + b_perp * (side_a * 2.3)
			_env_kit.append_multimesh(bcol_dark_keys[int(ab_u * 5.0) % bcol_dark_keys.size()], Transform3D(Basis(Vector3.UP, b_yaw + side_a).scaled_local(Vector3(2.2, 8.8, 2.0)), Vector3(rock_xz.x, ap.y - 5.2, rock_xz.y)), Color(0.84, 0.88, 0.93))
		sea_foam_sources.append(Vector3(ap.x, ap.z, 3.4))

	# Curved Ancient Stone Arch Ring (16 beveled radial voussoir segments spanning beneath the deck!)
	var arch_segs := 16
	for ai in range(arch_segs):
		var u0 := lerpf(0.05, 0.95, float(ai) / float(arch_segs))
		var u1 := lerpf(0.05, 0.95, float(ai + 1) / float(arch_segs))
		var um := (u0 + u1) * 0.5
		var d0: Vector3 = deck_pt.call(u0)
		var d1: Vector3 = deck_pt.call(u1)
		var drop0 := (1.0 - sin(u0 * PI)) * 4.8 + 0.50
		var drop1 := (1.0 - sin(u1 * PI)) * 4.8 + 0.50
		var a0 := d0 - Vector3(0.0, drop0, 0.0)
		var a1 := d1 - Vector3(0.0, drop1, 0.0)
		var seg_d := a1 - a0
		var v_len := seg_d.length()
		var pitch_a := -atan2(seg_d.y, Vector2(seg_d.x, seg_d.z).length())
		var voussoir := MeshInstance3D.new()
		voussoir.mesh = _env_kit.build_beveled_ruin_block(Vector3(3.12, 0.78, v_len * 1.08), 0.06, float(ai) * 1.7, false)
		voussoir.material_override = mat_ashlar if ai % 2 == 0 else mat_carved
		voussoir.position = (a0 + a1) * 0.5
		voussoir.rotation = Vector3(pitch_a, b_yaw, 0.0)
		br_root.add_child(voussoir)

		# Spandrel side masonry walls supporting the intact outer thirds of the stone bridge
		if um < 0.36 or um > 0.66:
			var sp_h := maxf(0.42, ((drop0 + drop1) * 0.5) - 0.28)
			var spandrel := MeshInstance3D.new()
			spandrel.mesh = _env_kit.build_beveled_ruin_block(Vector3(2.98, sp_h, v_len * 1.06), 0.05, float(ai) * 2.3, false)
			spandrel.material_override = mat_plinth
			var dm_p: Vector3 = deck_pt.call(um)
			spandrel.position = Vector3(dm_p.x, dm_p.y - sp_h * 0.5 - 0.14, dm_p.z)
			spandrel.rotation.y = b_yaw
			br_root.add_child(spandrel)

	# Intact weathered stone deck & broken parapet walls on Near (u=0..0.34) & Far (u=0.68..1.0) thirds!
	for seg_range in [[0.0, 0.34, 5], [0.68, 1.0, 5]]:
		var ra0: float = float(seg_range[0])
		var ra1: float = float(seg_range[1])
		var cnt: int = int(seg_range[2])
		for ki in range(cnt):
			var uk := lerpf(ra0, ra1, (float(ki) + 0.5) / float(cnt))
			var dp: Vector3 = deck_pt.call(uk)
			var d_nxt: Vector3 = deck_pt.call(minf(1.0, uk + 0.04))
			var d_sl := d_nxt - dp
			var sl_pitch := -atan2(d_sl.y, maxf(0.01, Vector2(d_sl.x, d_sl.z).length()))
			var d_slab := MeshInstance3D.new()
			d_slab.mesh = _env_kit.build_beveled_ruin_block(Vector3(3.04, 0.32, (ra1 - ra0) * b_len / float(cnt) * 1.06), 0.045, uk * 18.0, true)
			d_slab.material_override = mat_carved if ki % 2 == 0 else mat_ashlar
			d_slab.position = dp - Vector3(0.0, 0.14, 0.0)
			d_slab.rotation = Vector3(sl_pitch, b_yaw, 0.0)
			br_root.add_child(d_slab)
			# Broken stone parapet curbs along bridge edges
			for s_par: float in [-1.0, 1.0]:
				if (ki == cnt - 1 and ra0 < 0.1 and s_par > 0.0) or (ki == 0 and ra0 > 0.5 and s_par < 0.0):
					continue # Irregular eroded gap in stone parapet!
				var par_h := 0.68 if (ki % 2 == 0) else 0.46
				var par_p: Vector3 = dp + Vector3(b_perp.x * s_par * 1.36, par_h * 0.5, b_perp.y * s_par * 1.36)
				var par_mi := MeshInstance3D.new()
				par_mi.mesh = _env_kit.build_beveled_ruin_block(Vector3(0.36, par_h, (ra1 - ra0) * b_len / float(cnt) * 0.96), 0.04, uk * 22.0 + s_par, true)
				par_mi.material_override = mat_ashlar
				par_mi.position = par_p
				par_mi.rotation = Vector3(sl_pitch, b_yaw, 0.0)
				br_root.add_child(par_mi)

	# Mid-Span Expedition Timber & Rope Repair (u = 0.33..0.69 — iconic Stormwreck Observatory crossing!)
	var r_a: Vector3 = deck_pt.call(0.32)
	var r_b: Vector3 = deck_pt.call(0.70)
	for str_s: float in [-0.95, 0.0, 0.95]:
		var s_off: Vector3 = Vector3(b_perp.x * str_s, -0.08, b_perp.y * str_s)
		CoastalKit.add_oriented_cyl(br_root, r_a + s_off, r_b + s_off, 0.11, 0.11, mat_wood, 7)
	var plank_count := 13
	for pi in range(plank_count):
		var up := lerpf(0.34, 0.68, float(pi) / float(plank_count - 1))
		var pp: Vector3 = deck_pt.call(up)
		var plank_mi := MeshInstance3D.new()
		plank_mi.mesh = _env_kit.build_beveled_ruin_block(Vector3(2.64 + sin(float(pi) * 2.1) * 0.14, 0.085, 0.34), 0.015, float(pi) * 3.1, false)
		plank_mi.material_override = mat_plank
		plank_mi.position = pp + Vector3(0.0, 0.04, 0.0)
		plank_mi.rotation = Vector3(0.0, b_yaw + sin(float(pi) * 1.9) * 0.035, cos(float(pi) * 2.5) * 0.018)
		br_root.add_child(plank_mi)
	for s_rail: float in [-1.0, 1.0]:
		var rp_tops: Array[Vector3] = []
		for r_u: float in [0.33, 0.45, 0.57, 0.69]:
			var rbase: Vector3 = deck_pt.call(r_u) + Vector3(b_perp.x * s_rail * 1.22, -0.05, b_perp.y * s_rail * 1.22)
			var rtop: Vector3 = rbase + Vector3(b_perp.x * s_rail * 0.08, 1.08, b_perp.y * s_rail * 0.08)
			CoastalKit.add_oriented_cyl(br_root, rbase, rtop, 0.055, 0.044, mat_wood, 6)
			rp_tops.append(rtop - Vector3(0.0, 0.12, 0.0))
		for ri in range(rp_tops.size() - 1):
			var mid_hi := rp_tops[ri].lerp(rp_tops[ri + 1], 0.5) - Vector3(0.0, 0.12, 0.0)
			CoastalKit.add_oriented_cyl(br_root, rp_tops[ri], mid_hi, 0.022, 0.022, mat_rope, 6, false)
			CoastalKit.add_oriented_cyl(br_root, mid_hi, rp_tops[ri + 1], 0.022, 0.022, mat_rope, 6, false)
			var lo_a := rp_tops[ri] - Vector3(0.0, 0.44, 0.0)
			var lo_b := rp_tops[ri + 1] - Vector3(0.0, 0.44, 0.0)
			CoastalKit.add_oriented_cyl(br_root, lo_a, lo_b, 0.018, 0.018, mat_rope, 5, false)

	# Walkable Floor Collider for the near bridge threshold so tokens can step out onto the bridge safely!
	var br_body := StaticBody3D.new()
	br_body.name = "BridgeNearThresholdCollider"
	br_root.add_child(br_body)
	var bc_cs := CollisionShape3D.new()
	var bc_box := BoxShape3D.new(); bc_box.size = Vector3(3.10, 0.42, 6.2)
	bc_cs.shape = bc_box
	var bc_mid: Vector3 = deck_pt.call(0.16)
	bc_cs.position = bc_mid - Vector3(0.0, 0.18, 0.0)
	bc_cs.rotation = Vector3(0.09, b_yaw, 0.0)
	br_body.add_child(bc_cs)

	# 3. Ascending Headland Stone Stairs from Bridge Far Landing (24.6, 0.95, -11.4) up to Observatory Plinth (26.8, 1.55, -14.8)!
	for hsi in range(5):
		var hu := float(hsi) / 4.0
		var hp := Vector3(lerpf(24.6, 26.8, hu), lerpf(0.95, 1.55, hu), lerpf(-11.4, -14.6, hu))
		var hstep := MeshInstance3D.new()
		hstep.mesh = _env_kit.build_beveled_ruin_block(Vector3(2.85, 0.32, 0.96), 0.045, 30.0 + float(hsi), true)
		hstep.material_override = mat_carved if hsi % 2 == 0 else mat_ashlar
		hstep.position = hp - Vector3(0.0, 0.11, 0.0)
		hstep.rotation.y = b_yaw * 0.90
		br_root.add_child(hstep)

	# 4. Iconic Ruined Clifftop Observatory Landmark on Northern Headland Crag (27.4, 1.55, -17.8)!
	# Framed cleanly in Overview, Dusk Overview, Pitch 5..25 deg & Night between center HUD & top-right clock!
	var obs_pos := Vector3(27.4, 1.55, -17.8)
	var obs_root := Node3D.new()
	obs_root.name = "DistantClifftopObservatory"
	obs_root.position = obs_pos
	br_root.add_child(obs_root)

	# Compact sculpted columnar basalt crags supporting the Observatory headland (strictly BELOW summit plinth so ocean stays visible!)
	for oci in range(12):
		var oa := float(oci) * TAU / 12.0
		var ox := obs_pos.x + cos(oa) * 6.0
		var oz := obs_pos.z + sin(oa) * 5.6
		var osc := Vector3(2.4, 11.4, 2.2)
		var ok_m: String = bcol_keys[oci % bcol_keys.size()] if oci % 2 == 0 else bcol_dark_keys[oci % bcol_dark_keys.size()]
		_env_kit.append_multimesh(ok_m, Transform3D(Basis(Vector3.UP, oa + 0.5).scaled_local(osc), Vector3(ox, -5.2, oz)), Color(0.88, 0.92, 0.96))
		if oci % 2 == 0:
			sea_foam_sources.append(Vector3(ox + cos(oa) * 2.4, oz + sin(oa) * 2.4, 2.8))

	# Two-tier circular stepped Observatory drum plinth (RuinsPlinth canon!)
	for ti_o in range(2):
		var drum := MeshInstance3D.new()
		var dm := CylinderMesh.new()
		dm.top_radius = 3.65 if ti_o == 0 else 3.22
		dm.bottom_radius = 3.90 if ti_o == 0 else 3.40
		dm.height = 0.62 if ti_o == 0 else 0.48
		dm.radial_segments = 16
		drum.mesh = dm; drum.material_override = mat_plinth if ti_o == 0 else mat_ashlar
		drum.position.y = 0.24 if ti_o == 0 else 0.74
		obs_root.add_child(drum)

	# Ring of 8 weathered canonical fluted limestone columns (intact supporting dome + snapped silhouettes!)
	var col_heights := [3.05, 3.05, 3.05, 2.15, 1.55, 3.05, 3.05, 2.45]
	var col_r := 2.72
	for ci in range(8):
		var ca := float(ci) * TAU / 8.0 - PI * 0.12
		var ch: float = float(col_heights[ci])
		var is_broken := ch < 2.95
		var c_mi := MeshInstance3D.new()
		c_mi.mesh = _env_kit.build_fluted_column(0.28, ch, is_broken, 12, 40.0 + float(ci))
		c_mi.material_override = mat_carved
		c_mi.position = Vector3(cos(ca) * col_r, 0.96, sin(ca) * col_r)
		obs_root.add_child(c_mi)

	# Partial curved entablature architrave & fractured patinated-bronze ribbed Observatory Dome!
	for ei in range(8):
		if ei == 3 or ei == 4:
			continue # Dramatic open ruined south-west face revealing interior astrolabe & beacon!
		var ea := float(ei) * TAU / 8.0 + TAU / 16.0 - PI * 0.12
		var ent := MeshInstance3D.new()
		ent.mesh = _env_kit.build_beveled_ruin_block(Vector3(2.26, 0.40, 0.66), 0.04, 50.0 + float(ei), true)
		ent.material_override = mat_carved
		ent.position = Vector3(cos(ea) * col_r, 4.18, sin(ea) * col_r)
		ent.rotation.y = -ea + PI * 0.5
		obs_root.add_child(ent)

	# 7 Curved Patinated-Bronze Observatory Dome Ribs arching skyward around an open meridian telescope slit!
	var dome_base_y := 4.35
	var dome_r := 2.66
	for ri in range(7):
		var ra := lerpf(-PI * 0.88, PI * 0.52, float(ri) / 6.0)
		var rib_segs := 6
		for rsi in range(rib_segs):
			var el0 := lerpf(0.0, PI * 0.44, float(rsi) / float(rib_segs))
			var el1 := lerpf(0.0, PI * 0.44, float(rsi + 1) / float(rib_segs))
			if ri >= 4 and rsi >= 4:
				continue # Broken fractured upper dome opening!
			var p0 := Vector3(cos(ra) * cos(el0) * dome_r, dome_base_y + sin(el0) * dome_r * 0.90, sin(ra) * cos(el0) * dome_r)
			var p1 := Vector3(cos(ra) * cos(el1) * dome_r, dome_base_y + sin(el1) * dome_r * 0.90, sin(ra) * cos(el1) * dome_r)
			CoastalKit.add_oriented_cyl(obs_root, p0, p1, 0.11, 0.085, mat_bronze_pat, 6)
			if ri < 4 and rsi < 4:
				var ra_n := lerpf(-PI * 0.88, PI * 0.52, float(ri + 1) / 6.0)
				var mid_a := (ra + ra_n) * 0.5
				var mid_el := (el0 + el1) * 0.5
				var pan := MeshInstance3D.new()
				pan.mesh = _env_kit.build_beveled_ruin_block(Vector3(cos(mid_el) * 1.44, 0.10, 0.72), 0.02, float(ri * 7 + rsi), false)
				pan.material_override = mat_dome_copper
				pan.position = Vector3(cos(mid_a) * cos(mid_el) * (dome_r - 0.05), dome_base_y + sin(mid_el) * (dome_r - 0.05) * 0.90, sin(mid_a) * cos(mid_el) * (dome_r - 0.05))
				pan.rotation = Vector3(mid_el - PI * 0.5, -mid_a + PI * 0.5, 0.0)
				obs_root.add_child(pan)

	# Giant Ancient Bronze Astrolabe & Tilted Meridian Telescope Arm emerging through the ruined dome slit!
	var astro_root := Node3D.new(); astro_root.position = Vector3(0.0, 2.55, 0.0); obs_root.add_child(astro_root)
	var ped_o := MeshInstance3D.new()
	ped_o.mesh = _env_kit.build_fluted_column(0.56, 1.42, false, 12, 60.0)
	ped_o.material_override = mat_carved; ped_o.position.y = -1.55
	astro_root.add_child(ped_o)
	for arm_i in range(2):
		var gr := MeshInstance3D.new()
		var grm := TorusMesh.new(); grm.inner_radius = 0.98 - float(arm_i) * 0.20; grm.outer_radius = 1.12 - float(arm_i) * 0.20; grm.rings = 22
		gr.mesh = grm; gr.material_override = mat_bronze_pat
		gr.rotation = Vector3(0.55 if arm_i == 0 else -0.45, 0.42 if arm_i == 0 else 1.25, 0.35)
		astro_root.add_child(gr)
	CoastalKit.add_oriented_cyl(astro_root, Vector3(-0.55, -0.28, 0.40), Vector3(1.68, 2.85, -1.25), 0.19, 0.27, mat_bronze_pat, 10)

	# Subtle Distant Observatory Sanctuary Starlight Core (dim by day, atmospheric destination beacon at dusk & night!)
	var obs_orb_mat := StandardMaterial3D.new()
	obs_orb_mat.albedo_color = Color("#7ae8f8")
	obs_orb_mat.roughness = 0.12
	obs_orb_mat.emission_enabled = true
	obs_orb_mat.emission = Color("#58d8f6")
	obs_orb_mat.emission_energy_multiplier = 0.14
	var obs_orb := MeshInstance3D.new()
	obs_orb.mesh = _env_kit.build_faceted_crystal_mesh(1.05, 0.30, 77.0)
	obs_orb.material_override = obs_orb_mat
	obs_orb.position = Vector3(0.0, -0.30, 0.0)
	astro_root.add_child(obs_orb)
	var obs_l := OmniLight3D.new()
	obs_l.light_color = Color("#6adcf6")
	obs_l.light_energy = 0.0
	obs_l.omni_range = 13.5
	obs_l.omni_attenuation = 1.45
	obs_l.position = Vector3(0.0, 0.75, 0.0)
	astro_root.add_child(obs_l)
	fx.register_arcane_crystal(obs_l, obs_orb_mat, 2.4, 0.14, 2.6)

# ------------------------------------------------------------------------------
# Camp 05: Refugio Cala Pleamar (Coastal Trail + Asymmetric Cove + 4-Chamber Sea Cave)
# ------------------------------------------------------------------------------
func _emit_wall_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, along_z: bool = false) -> void:
	var uv_a := Vector2(a.z * 0.25, a.y * 0.25) if along_z else Vector2(a.x * 0.25, a.y * 0.25)
	var uv_b := Vector2(b.z * 0.25, b.y * 0.25) if along_z else Vector2(b.x * 0.25, b.y * 0.25)
	var uv_c := Vector2(c.z * 0.25, c.y * 0.25) if along_z else Vector2(c.x * 0.25, c.y * 0.25)
	var uv_d := Vector2(d.z * 0.25, d.y * 0.25) if along_z else Vector2(d.x * 0.25, d.y * 0.25)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_a); st.add_vertex(a)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_b); st.add_vertex(b)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_c); st.add_vertex(c)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_a); st.add_vertex(a)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_c); st.add_vertex(c)
	st.set_color(Color(0.0, 0.0, 0.0, 1.0)); st.set_uv(uv_d); st.add_vertex(d)

func _build_cave_vault_mesh(
	parent: Node3D,
	node_name: String,
	x0: float,
	x1: float,
	z0: float,
	z1: float,
	base_h: float,
	dome_h: float,
	hole_xz: Vector2,
	hole_r: float,
	mat_solid: Material,
	seed_v: float,
	slab_thick: float = 1.42,
	flank_drop: float = 0.0,
	south_arch_curve: float = 0.0
) -> MeshInstance3D:
	# Volumetric 3D solid sculpted limestone rock vault:
	# - Distinct smooth groups (top=0, bottom=1, rock-cut side faces=-1 flat) -> ZERO vertical triplanar streaking!
	# - Optional organic flank drop & curved sea-cave brow lip -> ZERO boxy horizontal beams or protruding corners!
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 16
	var nz := 12
	var top_pts: Array = []
	var bot_pts: Array = []
	for iz in range(nz + 1):
		var fz := float(iz) / float(nz)
		var row_t: Array[Vector3] = []
		var row_b: Array[Vector3] = []
		for ix in range(nx + 1):
			var fx := float(ix) / float(nx)
			var edge_x := sin(fz * PI) * (sin(fz * 7.0 + seed_v) * 0.58 + cos(fz * 13.0) * 0.24)
			var edge_z := sin(fx * PI) * (cos(fx * 6.5 - seed_v) * 0.62 + sin(fx * 11.0) * 0.28)
			var vx := lerpf(x0, x1, fx) + edge_x * (1.0 - sin(fx * PI))
			var vz := lerpf(z0, z1, fz) + edge_z * (1.0 - sin(fz * PI))
			var arch_x := sin(fx * PI)
			var arch_z := sin(fz * PI)
			# Curve south arch wings slightly northward & inward so the cavern mouth reads like a true natural coastal arch
			if south_arch_curve > 0.01:
				var wing_pull := pow(1.0 - arch_x, 1.55) * south_arch_curve * pow(fz, 1.35)
				vz -= wing_pull
				if fz > 0.72:
					vz += sin(fx * 17.0 + seed_v) * 0.34 * arch_x * ((fz - 0.72) / 0.28)
			var dome_f := pow(maxf(0.0, arch_x * 0.66 + arch_z * 0.34), 0.82)
			var crag_top := sin(vx * 0.56 + seed_v) * cos(vz * 0.50 - seed_v * 0.7) * 0.42 + sin((vx - vz) * 1.12) * 0.18
			var crag_bot := cos(vx * 0.82 - seed_v * 1.3) * sin(vz * 0.76 + seed_v * 0.9) * 0.24 + sin((vx + vz) * 1.65) * 0.11
			# Taper west/east outer flanks smoothly into the cliff shoulders (eliminates boxy protruding roof corners!)
			var edge_mask := pow(clampf(absf(fx - 0.5) * 2.0, 0.0, 1.0), 2.3)
			var corner_mask := edge_mask * (0.45 + 0.55 * pow(clampf(absf(fz - 0.5) * 2.0, 0.0, 1.0), 1.6))
			var drop_here := flank_drop * corner_mask
			var rim_heft := 1.0 + (1.0 - dome_f) * 0.18
			var local_thick := maxf(0.95, slab_thick * rim_heft + sin(vx * 0.42 + vz * 0.38 + seed_v) * 0.22)
			var vy_bot := base_h + dome_h * dome_f * 0.82 + crag_bot - drop_here
			var vy_top := vy_bot + local_thick + dome_h * dome_f * 0.24 + crag_top * 0.88 - drop_here * 0.25
			# Slight natural sloped bevel on the front cliff brow so rock overhangs look sculpted instead of sheared flat!
			var brow_recess := 0.48 * pow(fz, 3.0) * (0.65 + 0.35 * sin(vx * 0.75 + seed_v))
			row_t.append(Vector3(vx, vy_top, vz - brow_recess))
			row_b.append(Vector3(vx, vy_bot, vz))
		top_pts.append(row_t)
		bot_pts.append(row_b)

	# Precompute active solid cells (excluding optional central chimney smoke vent)
	var solid: Array = []
	for iz in range(nz):
		var srow: Array[bool] = []
		for ix in range(nx):
			var keep := true
			if hole_r > 0.05:
				var ctr: Vector3 = (top_pts[iz][ix] + top_pts[iz][ix + 1] + top_pts[iz + 1][ix + 1] + top_pts[iz + 1][ix]) * 0.25
				if Vector2(ctr.x - hole_xz.x, ctr.z - hole_xz.y).length() < hole_r:
					keep = false
			srow.append(keep)
		solid.append(srow)

	for iz in range(nz):
		for ix in range(nx):
			if not solid[iz][ix]:
				continue
			var ta: Vector3 = top_pts[iz][ix]; var tb: Vector3 = top_pts[iz][ix + 1]
			var tc: Vector3 = top_pts[iz + 1][ix + 1]; var td: Vector3 = top_pts[iz + 1][ix]
			var ba: Vector3 = bot_pts[iz][ix]; var bb: Vector3 = bot_pts[iz][ix + 1]
			var bc: Vector3 = bot_pts[iz + 1][ix + 1]; var bd: Vector3 = bot_pts[iz + 1][ix]
			# 1. Top sunlit cliff crust (smooth group 0 -> pure upward rock normals!)
			st.set_smooth_group(0)
			_emit_quad(st, ta, tb, tc, td)
			# 2. Inner vaulted cavern ceiling (smooth group 1 -> pure downward cavern normals!)
			st.set_smooth_group(1)
			_emit_quad(st, ba, bd, bc, bb)
			# 3. Rugged rock-cut vertical/sloped cliff brow faces (smooth group -1 + wall UVs -> ZERO vertical streaking!)
			st.set_smooth_group(-1)
			if iz == 0 or not solid[iz - 1][ix]:
				_emit_wall_quad(st, tb, ta, ba, bb, false) # North (-Z)
			if iz == nz - 1 or not solid[iz + 1][ix]:
				_emit_wall_quad(st, td, tc, bc, bd, false) # South (+Z, facing camera!)
			if ix == 0 or not solid[iz][ix - 1]:
				_emit_wall_quad(st, ta, td, bd, ba, true) # West (-X)
			if ix == nx - 1 or not solid[iz][ix + 1]:
				_emit_wall_quad(st, tc, tb, bb, bc, true) # East (+X)

	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	mi.material_override = mat_solid
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(mi)
	return mi

func _create_cave_pool_shader() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx;

varying vec3 wpos;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 41.3);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float t = TIME * 0.95;
	vec2 ruv = (UV - 0.5) * 2.0;
	float rad = length(ruv);
	float n1 = vnoise(wpos.xz * 2.2 + vec2(t * 0.26, -t * 0.20));
	float n2 = vnoise(wpos.xz * 4.8 + vec2(-t * 0.30, t * 0.24));
	float caust = smoothstep(0.54, 0.86, n1 * 0.56 + n2 * 0.44);

	// Rich translucent sheltered cave mineral-emerald pool (zero outdoor pink-dusk sky mirror!)
	vec3 deep_c = vec3(0.045, 0.195, 0.225);
	vec3 shallow_c = vec3(0.115, 0.365, 0.395);
	vec3 caust_c = vec3(0.32, 0.62, 0.64);
	float edge_t = smoothstep(0.32, 0.96, rad + (n1 - 0.5) * 0.18);
	vec3 col = mix(deep_c, shallow_c, edge_t);
	col = mix(col, caust_c, caust * 0.24 * (1.0 - edge_t * 0.5));

	// Gentle delicate whitewater edge sparkle right where the pool laps the limestone rim
	float rim_lace = smoothstep(0.76, 0.96, rad) * smoothstep(0.45, 0.82, n2) * 0.28;
	col = mix(col, vec3(0.76, 0.88, 0.89), rim_lace);

	vec2 slope = vec2((n1 - 0.5) * 0.18, (n2 - 0.5) * 0.18);
	ALBEDO = col;
	METALLIC = 0.02;
	ROUGHNESS = mix(0.28, 0.44, rim_lace);
	SPECULAR = 0.26;
	NORMAL_MAP = vec3(0.5 + slope.x, 0.5 + slope.y, 1.0);
	ALPHA = clamp(mix(0.84, 0.48, smoothstep(0.55, 0.98, rad)) + rim_lace * 0.25, 0.35, 0.88);
}
"""
	var smat := ShaderMaterial.new()
	smat.shader = sh
	return smat

func _create_spring_waterfall_shader() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

uniform float alpha_mul = 0.84;

float hash21(vec2 p) {
	p = fract(p * vec2(127.1, 311.7));
	p += dot(p, p + 41.3);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

void fragment() {
	float t = TIME * 1.45;
	vec2 uv = UV;
	// Organic braided water curtain with soft ragged lateral spray (natural mineral whitewater, zero neon strips!)
	float sway = (vnoise(vec2(uv.x * 3.8, uv.y * 3.2 - t * 1.1)) - 0.5) * 0.12;
	float edge_dist = abs(uv.x - 0.5 + sway);
	float width_prof = mix(0.32, 0.48, smoothstep(0.0, 0.90, uv.y));
	float mask_x = 1.0 - smoothstep(width_prof - 0.18, width_prof, edge_dist);
	float mask_top = smoothstep(0.0, 0.08, uv.y);
	float mask_bot = 1.0 - smoothstep(0.93, 1.0, uv.y);

	// Layered falling aerated water strands + micro spray droplets
	float f1 = vnoise(vec2(uv.x * 9.5, uv.y * 4.5 - t * 2.4));
	float f2 = vnoise(vec2(uv.x * 19.0 + 2.4, uv.y * 8.5 - t * 3.9));
	float f3 = vnoise(vec2(uv.x * 34.0 - 1.7, uv.y * 14.0 - t * 5.4));
	float strands = f1 * 0.46 + f2 * 0.34 + f3 * 0.20;

	// Natural churning whitewater at top rock spout, mid mossy shelf break & lower pool plunge
	float lip_foam = (1.0 - smoothstep(0.02, 0.20, uv.y)) * 0.50;
	float mid_break = exp(-pow((uv.y - 0.46) * 6.5, 2.0)) * 0.54 * (0.50 + f2 * 0.50);
	float splash_foam = smoothstep(0.76, 0.97, uv.y) * (0.54 + f2 * 0.46);
	float foam = clamp(smoothstep(0.38, 0.78, strands) * 0.76 + lip_foam + mid_break + splash_foam, 0.0, 1.0);

	vec3 clear_mineral = vec3(0.18, 0.40, 0.43);
	vec3 foam_white = vec3(0.82, 0.89, 0.90);
	vec3 col = mix(clear_mineral, foam_white, foam);

	float fresnel = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 2.8);
	col = mix(col, vec3(0.88, 0.93, 0.94), fresnel * 0.20);

	ALBEDO = col;
	ROUGHNESS = mix(0.22, 0.48, foam);
	SPECULAR = mix(0.42, 0.22, foam);
	ALPHA = clamp((0.30 + foam * 0.52) * mask_x * mask_top * mask_bot * alpha_mul, 0.0, 0.84);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	return mat

func _build_refuge_details(scene_def: Dictionary, fx: CampAtmosphereFx, width_m: float, depth_m: float, _tile: float) -> void:
	var greybox := OS.get_cmdline_user_args().has("--greybox")

	# Materials: warm sunlit coastal limestone-granite cave walls & readable damp mossy limestone (ZERO pitch-black blobs!)
	var mat_cliff := CoastalKit.make_multimesh_rock_mat("a1-cliff-organic-v7.png", Color("#8c887d"), 0.86, 0.26, true)
	var mat_cliff_dark := CoastalKit.make_multimesh_rock_mat("a1-cliff-rugged-v8.jpg", Color("#7d7a71"), 0.88, 0.25, true)
	var mat_wet_rock := CoastalKit.make_multimesh_rock_mat("a1-cliff-organic-v7.png", Color("#768176"), 0.64, 0.30, true)
	var mat_arch := MatKit.make_textured_mat("a1-cliff-organic-v7.png", Color("#868278"), 0.86, "rock", Vector3(0.24, 0.24, 0.24), true, true)
	var mat_rugged := MatKit.make_textured_mat("a1-cliff-rugged-v8.jpg", Color("#7c7970"), 0.88, "rock", Vector3(0.22, 0.22, 0.22), true, true)
	var mat_roof_solid := mat_arch.duplicate() as StandardMaterial3D
	mat_roof_solid.cull_mode = BaseMaterial3D.CULL_BACK
	mat_roof_solid.uv1_triplanar_sharpness = 4.0
	var mat_rail_wood := MatKit.make_wood_mat(Color("#745b42"), true)
	var mat_rope := MatKit.make_cloth_mat(Color("#b6a176"), true, true)
	var mat_ivy := _env_kit.make_alpha_foliage_mat("cave_moss", Color("#3b6b3e"))
	var mat_coastal_tree := MatKit.create_foliage_wind_shader_material("foliage.webp", Color("#4d6b3c"), 0.042, Color("#7ea058"), false, 2.4, true)
	# Subtle translucent water-droplet material (NO giant glowing white ping-pong balls!)
	var mat_drip := StandardMaterial3D.new()
	mat_drip.albedo_color = Color(0.76, 0.90, 0.94, 0.56)
	mat_drip.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_drip.roughness = 0.12

	var mat_gb_mouth: StandardMaterial3D
	var mat_gb_common: StandardMaterial3D
	var mat_gb_rest: StandardMaterial3D
	var mat_gb_storage: StandardMaterial3D
	var mat_gb_spring: StandardMaterial3D
	if greybox:
		mat_cliff = StandardMaterial3D.new(); mat_cliff.albedo_color = Color("#7d8280"); mat_cliff.roughness = 0.90; mat_cliff.vertex_color_use_as_albedo = true
		mat_cliff_dark = StandardMaterial3D.new(); mat_cliff_dark.albedo_color = Color("#656a69"); mat_cliff_dark.roughness = 0.92; mat_cliff_dark.vertex_color_use_as_albedo = true
		mat_wet_rock = StandardMaterial3D.new(); mat_wet_rock.albedo_color = Color("#506064"); mat_wet_rock.roughness = 0.55; mat_wet_rock.vertex_color_use_as_albedo = true
		mat_arch = mat_cliff; mat_rugged = mat_cliff_dark
		mat_gb_mouth = StandardMaterial3D.new(); mat_gb_mouth.albedo_color = Color("#8f8a7c")
		mat_gb_common = StandardMaterial3D.new(); mat_gb_common.albedo_color = Color("#a88c6c")
		mat_gb_rest = StandardMaterial3D.new(); mat_gb_rest.albedo_color = Color("#8a9c7e")
		mat_gb_storage = StandardMaterial3D.new(); mat_gb_storage.albedo_color = Color("#9b8676")
		mat_gb_spring = StandardMaterial3D.new(); mat_gb_spring.albedo_color = Color("#6498a4")

	# Register MultiMesh rock & coastal shrub batches for crisp high-FPS rock formations
	var strat_pool := _env_kit.get_rock_variants("stratified")
	var crag_pool := _env_kit.get_rock_variants("craggy")
	var flat_pool := _env_kit.get_rock_variants("flat")
	var cliff_keys: Array[String] = []
	var dark_keys: Array[String] = []
	var wet_keys: Array[String] = []
	var flat_keys: Array[String] = []
	for vi in range(4):
		var ck := "cove_cliff_%d" % vi
		_env_kit.define_multimesh(ck, strat_pool[vi], mat_cliff, true)
		cliff_keys.append(ck)
		var dk := "cove_crag_%d" % vi
		_env_kit.define_multimesh(dk, crag_pool[vi], mat_cliff_dark, true)
		dark_keys.append(dk)
		var wk := "cove_wet_%d" % vi
		_env_kit.define_multimesh(wk, strat_pool[vi] if vi % 2 == 0 else crag_pool[vi], mat_wet_rock, false)
		wet_keys.append(wk)
		var fk := "cove_flat_%d" % vi
		_env_kit.define_multimesh(fk, flat_pool[vi], mat_cliff, false)
		flat_keys.append(fk)
	_env_kit.define_multimesh("cove_pebble", flat_pool[0], mat_cliff, false)
	var uv_shrub := Rect2(0.01, 0.01, 0.48, 0.48)
	var uv_flower := Rect2(0.51, 0.51, 0.48, 0.48)
	var mat_cshrub_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#567442"), 0.052, Color("#82a25c"), true, 1.0, true, uv_shrub)
	var mat_cflower_mm := MatKit.create_foliage_wind_shader_material("foliage-atlas-v5.png", Color("#b89e64"), 0.060, Color("#d4b478"), true, 1.0, true, uv_flower)
	_env_kit.define_multimesh("cove_shrub_mm", _env_kit.get_bush_quad_proto(uv_shrub, 1.32), mat_cshrub_mm, true)
	_env_kit.define_multimesh("cove_flower_mm", _env_kit.get_bush_quad_proto(uv_flower, 0.96), mat_cflower_mm, false)

	# Ventilate hearth smoke cleanly upward through the natural cave chimney vent!
	fx.set_smoke_wind(Vector3(0.06, 0.96, 0.16))
	# Weather shelter: lower rain spawn height (7.5m) strictly over the open southern cove & sea (z >= 23.0) so ZERO raindrops visually cross inside cave chambers!
	fx.configure_exterior_weather_bounds(Vector3(16.0, 7.5, 33.5), Vector3(42.0, 1.0, 10.5))

	var rng := RandomNumberGenerator.new()
	rng.seed = 5052026
	var foam_sources: Array = []

	# ==========================================================================
	# 1. PERMANENT CONTINUOUS SEA-CAVE CLIFF MASSIF (GrottoCliffShell — CORRECT INWARD/UPWARD NORMALS!)
	# ==========================================================================
	var grotto_back := Node3D.new()
	grotto_back.name = "SeaGrottoBackWall"
	_grp_structures.add_child(grotto_back)

	# Horseshoe sculpted perimeter wall with outward-facing crown & properly lit interior strata (ZERO black shadow band!)
	var st_wall := SurfaceTool.new(); st_wall.begin(Mesh.PRIMITIVE_TRIANGLES)
	var wall_segs := 36
	var wall_tiers := 6
	var w_pts: Array = []
	for ti in range(wall_tiers + 1):
		var ft := float(ti) / float(wall_tiers)
		var row_v: Array[Vector3] = []
		for ci in range(wall_segs + 1):
			var fc := float(ci) / float(wall_segs)
			var ang := lerpf(PI * 0.96, -PI * 0.04, fc)
			# Subtle inward crown overhang + rocky crag strata
			var inset := pow(ft, 1.55) * 1.45
			var crag_r := sin(fc * 27.0 + ft * 4.2) * 0.56 + cos(fc * 13.0 - ft * 2.5) * 0.40
			var rx := 18.8 + cos(ang) * (18.4 - inset + crag_r)
			var rz := 17.8 - sin(ang) * (15.5 - inset * 0.80 + crag_r * 0.75)
			var wy := -0.35 + ft * (5.35 + sin(fc * PI) * 0.80 + cos(fc * 9.0) * 0.22)
			row_v.append(Vector3(rx, wy, rz))
		w_pts.append(row_v)
	for ti in range(wall_tiers):
		for ci in range(wall_segs):
			# Proper interior-facing winding (a, d, c, b) so the inner cave rock wall catches warm lantern & firelight richly!
			_emit_quad(st_wall, w_pts[ti][ci], w_pts[ti + 1][ci], w_pts[ti + 1][ci + 1], w_pts[ti][ci + 1])
	# Add continuous solid rocky crown apron bridging the top of the horseshoe back into the rising headland terrain (tapered cleanly to 0 at West/East ends so ZERO boxy wings stick out!)
	var crown_row: Array = w_pts[wall_tiers]
	for ci in range(wall_segs):
		var fc0 := float(ci) / float(wall_segs); var fc1 := float(ci + 1) / float(wall_segs)
		var ang0 := lerpf(PI * 0.96, -PI * 0.04, fc0); var ang1 := lerpf(PI * 0.96, -PI * 0.04, fc1)
		var tap0 := pow(sin(fc0 * PI), 0.75)
		var tap1 := pow(sin(fc1 * PI), 0.75)
		var a: Vector3 = crown_row[ci]; var b: Vector3 = crown_row[ci + 1]
		var out_a := Vector3(a.x + cos(ang0) * (5.6 * tap0), a.y + lerpf(-2.2, 0.55, tap0), a.z - sin(ang0) * (5.6 * tap0))
		var out_b := Vector3(b.x + cos(ang1) * (5.6 * tap1), b.y + lerpf(-2.2, 0.55, tap1), b.z - sin(ang1) * (5.6 * tap1))
		_emit_quad(st_wall, a, out_a, out_b, b)
	st_wall.generate_normals()
	var mat_shell_ds := mat_rugged.duplicate() as StandardMaterial3D
	mat_shell_ds.cull_mode = BaseMaterial3D.CULL_DISABLED
	var wall_mesh := MeshInstance3D.new(); wall_mesh.name = "GrottoCliffShell"
	wall_mesh.mesh = st_wall.commit(); wall_mesh.material_override = mat_shell_ds
	wall_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	grotto_back.add_child(wall_mesh)

	# Heavy rocky cliff crags crowning the exterior cave headland rim & framing West + East cove arms!
	var headland_crags := [
		# Upper north & NW cliff massif
		[Vector2(-4.0, 2.0), Vector3(5.6, 5.4, 4.8)], [Vector2(4.0, -2.5), Vector3(5.8, 5.6, 4.6)],
		[Vector2(12.5, -3.5), Vector3(5.5, 5.8, 4.6)], [Vector2(21.0, -3.5), Vector3(5.8, 6.0, 4.8)],
		[Vector2(29.5, -2.0), Vector3(5.6, 5.6, 4.6)], [Vector2(37.5, 2.5), Vector3(5.8, 5.4, 4.8)],
		# Permanent cave mouth cliff shoulders (framing the dramatic entrance arch from the cove!)
		[Vector2(0.8, 18.8), Vector3(3.8, 4.6, 3.6)], [Vector2(3.6, 19.6), Vector3(2.8, 4.0, 2.8)],
		[Vector2(36.2, 18.4), Vector3(4.2, 4.8, 3.8)], [Vector2(33.4, 19.8), Vector3(3.0, 4.0, 2.8)],
		# Dramatic West & East coastal headlands curving into the cove turquoise sea
		[Vector2(-5.5, 27.5), Vector3(4.6, 3.2, 4.2)], [Vector2(-1.5, 28.8), Vector3(4.2, 2.6, 3.8)],
		[Vector2(3.2, 27.6), Vector3(3.2, 1.9, 3.0)],
		[Vector2(36.8, 24.5), Vector3(4.4, 3.2, 4.0)], [Vector2(35.2, 28.2), Vector3(4.0, 2.4, 3.6)],
		[Vector2(31.8, 28.8), Vector3(3.4, 1.8, 3.2)],
	]
	for hci in range(headland_crags.size()):
		var hc: Array = headland_crags[hci]
		var hcp: Vector2 = hc[0]
		var hcsc: Vector3 = hc[1]
		var hcy := _eval_cove_height(hcp.x, hcp.y, width_m, depth_m)
		var keys_hc := cliff_keys if hci % 2 == 0 else dark_keys
		CoastalKit.append_rock_cluster_mm(_env_kit, keys_hc, Vector3(hcp.x, hcy + hcsc.y * 0.22, hcp.y), hcsc, float(hci) * 0.9, float(hci) * 2.1, 4, Color(0.96, 0.95, 0.92) if hci % 2 == 0 else Color(0.88, 0.89, 0.88))
		if hcp.y > 24.5:
			foam_sources.append(Vector3(hcp.x, hcp.y, hcsc.x * 0.65))

	# ==========================================================================
	# 2. DESCENDING WESTERN COASTAL ACCESS TRAIL (Organic Embedded Fieldstones, Handrail Posts, Ropes, Coastal Trees!)
	# ==========================================================================
	var trail_root := Node3D.new()
	trail_root.name = "CoastalAccessTrail"
	_grp_structures.add_child(trail_root)

	# 16 organic weathered flat fieldstone stepping slabs embedded flush into the curved dirt coastal trail (ZERO boxy domino slabs!)
	for st_i in range(16):
		var tx := lerpf(-14.8, 4.2, float(st_i) / 15.0)
		var ti := _cove_trail_info(tx, 20.0)
		var tz: float = float(ti["z"]) + sin(float(st_i) * 1.9) * 0.18
		var ty := _eval_cove_height(tx, tz, width_m, depth_m)
		var ti_n := _cove_trail_info(tx + 0.6, 20.0)
		var dir_yaw := atan2(float(ti_n["z"]) - float(ti["z"]), 0.6)
		var st_sc := Vector3(0.68 + fmod(float(st_i) * 0.13, 0.22), 0.12, 1.42 + fmod(float(st_i) * 0.19, 0.36))
		_env_kit.append_multimesh(flat_keys[st_i % 4], Transform3D(Basis(Vector3.UP, -dir_yaw + sin(float(st_i) * 1.4) * 0.12).scaled_local(st_sc), Vector3(tx, ty + 0.01, tz)), Color(0.96, 0.92, 0.84) if st_i % 2 == 0 else Color(0.88, 0.85, 0.78))

	# Weathered timber handrail posts & taut double hemp rope guarding the seaward edge of the descending coastal path!
	var prev_post_top := Vector3.ZERO
	var prev_post_mid := Vector3.ZERO
	for rp_i in range(11):
		var rx := lerpf(-15.0, 4.6, float(rp_i) / 10.0)
		var ti := _cove_trail_info(rx, 20.0)
		var rz: float = float(ti["z"]) + 1.52
		var ry := _eval_cove_height(rx, rz, width_m, depth_m)
		var p_bot := Vector3(rx, ry - 0.14, rz)
		var p_top := Vector3(rx + sin(float(rp_i) * 1.7) * 0.04, ry + 0.94, rz + cos(float(rp_i) * 1.3) * 0.04)
		var p_mid := p_bot.lerp(p_top, 0.56)
		CoastalKit.add_oriented_cyl(trail_root, p_bot, p_top, 0.068, 0.056, mat_rail_wood, 6, true, "TrailPost_%d" % rp_i)
		if rp_i > 0:
			CoastalKit.add_oriented_cyl(trail_root, prev_post_top - Vector3(0, 0.08, 0), p_top - Vector3(0, 0.08, 0), 0.018, 0.018, mat_rope, 5, false)
			CoastalKit.add_oriented_cyl(trail_root, prev_post_mid, p_mid, 0.015, 0.015, mat_rope, 5, false)
		prev_post_top = p_top
		prev_post_mid = p_mid
		# Low coastal boulders & flowering coastal brush edging the uphill north cliff bank of the trail
		if rp_i % 2 == 0:
			var bx := rx - 0.3
			var bz := float(ti["z"]) - 1.95
			var by := _eval_cove_height(bx, bz, width_m, depth_m)
			CoastalKit.append_rock_cluster_mm(_env_kit, cliff_keys, Vector3(bx, by + 0.25, bz), Vector3(1.45, 0.95, 1.25), float(rp_i) * 0.9, float(rp_i) * 2.3, 3, Color(0.95, 0.96, 0.92))
			if not greybox:
				_env_kit.append_multimesh("cove_shrub_mm", Transform3D(Basis(Vector3.UP, float(rp_i) * 1.4).scaled_local(Vector3.ONE * 1.22), Vector3(bx + 0.45, by, bz + 0.55)), Color(0.92, 1.0, 0.88))
				_env_kit.append_multimesh("cove_flower_mm", Transform3D(Basis(Vector3.UP, float(rp_i) * 2.1).scaled_local(Vector3.ONE * 1.02), Vector3(rx + 0.35, ry, rz + 0.42)), Color(1.0, 0.96, 0.82))

	# Gnarled wind-bent coastal trees perched atop the upper western trail ridge & northern headland (matching AAA reference!)
	if not greybox:
		var mat_c_trunk := MatKit.make_wood_mat(Color("#5e4733"), true)
		var cliff_trees := [
			[Vector2(-8.2, 13.5), "oak", 1.12],
			[Vector2(-13.8, 11.0), "pine", 0.98],
			[Vector2(-2.2, 8.2), "oak", 0.94],
			[Vector2(7.5, -1.5), "pine", 0.90],
			[Vector2(29.5, -1.0), "oak", 0.96],
			[Vector2(38.5, 12.0), "pine", 0.92],
		]
		for cti in range(cliff_trees.size()):
			var ct: Array = cliff_trees[cti]
			var ctp: Vector2 = ct[0]
			var cty := _eval_cove_height(ctp.x, ctp.y, width_m, depth_m)
			_env_kit.build_organic_tree(_grp_vegetation, str(ct[1]), Vector3(ctp.x, cty - 0.14, ctp.y), float(ct[2]), mat_c_trunk, mat_coastal_tree, null, float(cti) * 2.4 + 0.7)

	# ==========================================================================
	# 3. PERMANENT INTERIOR ROCK PARTITION COLUMNS (Grounded solidly on obstacle cells, ZERO blocked walkable tiles!)
	# ==========================================================================
	var r_idx := 0
	for ob in scene_def.get("obstacles", []):
		var oid := str(ob.get("id", ""))
		if oid.contains("rock"):
			var rp := Structure.tile_to_world(int(ob["col"]), int(ob["row"]), 0.0)
			var rgy := _eval_cove_height(rp.x, rp.z, width_m, depth_m)
			if oid in ["cove-rock-9", "cove-rock-10", "cove-rock-8", "cove-rock-7", "cove-rock-4"]:
				var pier_h := 3.45 if oid in ["cove-rock-9", "cove-rock-10", "cove-rock-7"] else 3.05
				CoastalKit.append_rock_cluster_mm(_env_kit, dark_keys if r_idx % 2 == 0 else cliff_keys, Vector3(rp.x, rgy + pier_h * 0.34, rp.z), Vector3(1.22, pier_h * 0.82, 1.15), float(r_idx) * 1.15, float(r_idx) * 2.7, 4, Color(0.92, 0.93, 0.90))
			else:
				CoastalKit.append_rock_cluster_mm(_env_kit, cliff_keys, Vector3(rp.x, rgy + 0.42, rp.z), Vector3(1.55, 1.12, 1.38), float(r_idx) * 1.25, float(r_idx) * 1.9, 3, Color(0.95, 0.94, 0.90))
				foam_sources.append(Vector3(rp.x, rp.z, 1.35))
			if not greybox and r_idx % 2 == 0:
				_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(rp.x - 0.55, rgy, rp.z + 0.55), 0.82, mat_ivy, float(r_idx), 2)
			r_idx += 1

	# ==========================================================================
	# 4. 5 INDEPENDENT VOLUMETRIC SOLID 3D CUTAWAY ROCK VAULTS (Thick Sculpted Cliff Mass + ZERO Boxy Corners!)
	# ==========================================================================
	# 4A. RockyOverhangLip (Monolithic Sculpted Limestone Sea-Cave Arch + Embedded Strata Ledges — ZERO potato-row boulders!)
	var overhang := Node3D.new()
	overhang.name = "RockyOverhangLip"
	_grp_structures.add_child(overhang)
	var mouth_mat: Material = mat_gb_mouth if greybox else mat_roof_solid
	_build_cave_vault_mesh(overhang, "CaveMouthArchVault", 2.4, 35.0, 17.6, 22.6, 2.70, 1.85, Vector2.ZERO, 0.0, mouth_mat, 1.1, 1.55, 2.05, 2.35)
	var arch_ledges := [
		[4.6, 2.55, 20.1, Vector3(3.6, 1.85, 3.0), 0.25],
		[9.6, 3.80, 20.7, Vector3(3.8, 1.75, 2.9), -0.18],
		[14.8, 4.55, 21.1, Vector3(4.1, 1.70, 2.8), 0.14],
		[19.2, 4.78, 21.2, Vector3(4.2, 1.80, 2.9), -0.10],
		[23.8, 4.48, 21.0, Vector3(4.0, 1.72, 2.8), 0.20],
		[28.5, 3.68, 20.5, Vector3(3.8, 1.78, 2.9), -0.22],
		[33.0, 2.50, 20.0, Vector3(3.6, 1.88, 3.0), 0.28],
	]
	for li in range(arch_ledges.size()):
		var ld: Array = arch_ledges[li]
		var lx: float = float(ld[0]); var ly: float = float(ld[1]); var lz: float = float(ld[2])
		var lsc: Vector3 = ld[3]; var lyaw: float = float(ld[4])
		var ledge := _env_kit.spawn_rock(overhang, Vector3(lx, ly, lz), lsc, lyaw, mat_gb_mouth if greybox else mat_arch, li + 1, "stratified")
		if ledge:
			ledge.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		if li in [1, 3, 5]:
			var cap_r := _env_kit.spawn_rock(overhang, Vector3(lx + sin(float(li)) * 0.6, ly + 1.05, lz - 1.45), Vector3(lsc.x * 0.88, 1.38, 2.85), lyaw + 0.45, mat_gb_mouth if greybox else mat_arch, li + 4, "craggy")
			if cap_r:
				cap_r.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if not greybox:
		var vine_holder := Node3D.new()
		vine_holder.name = "CaveMouthHangingVines"
		overhang.add_child(vine_holder)
		for vi in range(8):
			var fv := float(vi) / 7.0
			var vx := lerpf(7.0, 30.2, fv)
			var arch_v := sin(fv * PI)
			var vz_v := 22.4 - pow(1.0 - arch_v, 1.4) * 1.4 + sin(float(vi) * 1.4) * 0.35
			var vy_v := 3.45 + arch_v * 1.15
			_env_kit.spawn_hanging_vine(vine_holder, Vector3(vx, vy_v, vz_v), 0.3 + float(vi) * 0.5, 0.88, 1.15 + fmod(float(vi) * 0.35, 0.72))
			if vi % 2 == 0:
				_env_kit.spawn_fern_clump(vine_holder, Vector3(vx + 0.5, vy_v + 1.05, vz_v - 0.85), 1.08, mat_ivy, float(vi) * 1.7, 2)
		for ch in vine_holder.find_children("*", "MeshInstance3D", true, false):
			ch.set_meta("cutaway_hide_completely", true)
	cutaway_tents.append({
		"id": "cave_mouth",
		"node": overhang,
		"rect": Rect2(2.0, 2.0, 33.5, 18.6),
		"shadow_only": true,
		"multi_party": true,
	})

	# 4B. Sala Común Vault (Thick 3D solid vault with sculpted rocky chimney vent rim above cove-fire!)
	var roof_common := Node3D.new(); roof_common.name = "CaveRoof_Common"; _grp_structures.add_child(roof_common)
	_build_cave_vault_mesh(roof_common, "VaultCommonMesh", 8.8, 26.6, 11.2, 19.6, 3.25, 1.65, Vector2(18.75, 15.75), 1.15, mat_gb_common if greybox else mat_roof_solid, 2.3, 1.45, 0.45, 0.0)
	for chim_i in range(6):
		var ca := float(chim_i) * TAU / 6.0
		var ch_r := _env_kit.spawn_rock(roof_common, Vector3(18.75 + cos(ca) * 1.38, 6.20, 15.75 + sin(ca) * 1.28), Vector3(1.05, 0.68, 0.92), ca, mat_gb_common if greybox else mat_arch, chim_i + 2, "craggy")
		if ch_r:
			ch_r.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	cutaway_tents.append({
		"id": "cave_common",
		"node": roof_common,
		"rect": Rect2(9.2, 11.6, 16.4, 9.0),
		"shadow_only": true,
		"multi_party": true,
	})

	# 4C. Recinto de Descanso Vault (Dry Northern Sleeping Chamber — thick solid rock cliff roof!)
	var roof_rest := Node3D.new(); roof_rest.name = "CaveRoof_Rest"; _grp_structures.add_child(roof_rest)
	_build_cave_vault_mesh(roof_rest, "VaultRestMesh", 8.4, 26.8, 1.6, 12.8, 3.05, 1.50, Vector2.ZERO, 0.0, mat_gb_rest if greybox else mat_roof_solid, 3.7, 1.48, 0.85, 0.0)
	cutaway_tents.append({
		"id": "cave_rest",
		"node": roof_rest,
		"rect": Rect2(8.8, 1.8, 17.2, 11.6),
		"shadow_only": true,
		"multi_party": true,
	})

	# 4D. Recinto de Almacén Vault (Sheltered Western Storage Chamber — tucked smoothly inside cliff shoulders!)
	var roof_storage := Node3D.new(); roof_storage.name = "CaveRoof_Storage"; _grp_structures.add_child(roof_storage)
	_build_cave_vault_mesh(roof_storage, "VaultStorageMesh", 2.0, 11.2, 4.6, 18.8, 2.85, 1.35, Vector2.ZERO, 0.0, mat_gb_storage if greybox else mat_roof_solid, 4.9, 1.35, 1.65, 0.0)
	for sb_i in range(4):
		var srock := _env_kit.spawn_rock(roof_storage, Vector3(10.2, 3.55 + float(sb_i % 2) * 0.35, lerpf(6.5, 17.0, float(sb_i) / 3.0)), Vector3(1.85, 1.25, 2.35), float(sb_i) * 1.1, mat_gb_storage if greybox else mat_arch, sb_i + 1, "stratified")
		if srock: srock.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	cutaway_tents.append({
		"id": "cave_storage",
		"node": roof_storage,
		"rect": Rect2(1.0, 4.0, 9.8, 15.2),
		"shadow_only": true,
		"multi_party": true,
	})

	# 4E. Rincón Natural Vault (Eastern Wet Mineral Spring Grotto — tucked smoothly inside cliff shoulders!)
	var roof_spring := Node3D.new(); roof_spring.name = "CaveRoof_Spring"; _grp_structures.add_child(roof_spring)
	_build_cave_vault_mesh(roof_spring, "VaultSpringMesh", 24.6, 35.4, 5.0, 18.8, 2.90, 1.38, Vector2.ZERO, 0.0, mat_gb_spring if greybox else mat_roof_solid, 6.1, 1.35, 1.65, 0.0)
	for sp_i in range(4):
		var sprock := _env_kit.spawn_rock(roof_spring, Vector3(25.2, 3.55 + float(sp_i % 2) * 0.35, lerpf(6.5, 17.0, float(sp_i) / 3.0)), Vector3(1.85, 1.25, 2.35), float(sp_i) * 1.3, mat_gb_spring if greybox else mat_arch, sp_i + 2, "stratified")
		if sprock: sprock.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	cutaway_tents.append({
		"id": "cave_spring",
		"node": roof_spring,
		"rect": Rect2(24.6, 4.6, 11.8, 14.8),
		"shadow_only": true,
		"multi_party": true,
	})

	# ==========================================================================
	# 5. SHARED TURQUOISE COVE OCEAN, MARINE ECOSYSTEM (KELP/CORALS/FISH/RAYS/LIMITS) & CARVED POOLS
	# ==========================================================================
	var cove_reefs := [
		[Vector2(4.2, 30.8), Vector3(1.85, 0.85, 1.55)],
		[Vector2(10.5, 31.4), Vector3(1.35, 0.52, 1.15)],
		[Vector2(24.8, 32.0), Vector3(1.65, 0.72, 1.38)],
		[Vector2(31.2, 30.2), Vector3(2.15, 1.05, 1.75)],
		[Vector2(35.8, 33.4), Vector3(2.45, 1.25, 2.05)],
		[Vector2(-3.2, 33.0), Vector3(2.35, 1.15, 1.95)],
	]
	for cri in range(cove_reefs.size()):
		var cr: Array = cove_reefs[cri]
		var crp: Vector2 = cr[0]
		var crsc: Vector3 = cr[1]
		CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(crp.x, COVE_WATER_Y - 0.10, crp.y), crsc, float(cri) * 1.1, float(cri) * 2.6, 3, Color(0.92, 0.97, 1.0))
		foam_sources.append(Vector3(crp.x, crp.y, crsc.x * 0.72))

	var cove_bed_cb := func(wx: float, wz: float) -> float:
		return _eval_cove_height(wx, wz, width_m, depth_m)
	# Mount outer reef perimeter, nautical buoys, sea current streaks, swaying kelp, corals, starfish, reef fish & manta rays!
	_marine_anim_state = MarineEco.build_coastal_marine_life(_grp_env_geo, _env_kit, "coastal-refuge", COVE_WATER_Y, cove_bed_cb, foam_sources, rng)

	var mat_cove_sea := CoastalKit.create_coastal_ocean_shader(
		Color(0.036, 0.185, 0.295, 0.84),
		Color(0.082, 0.425, 0.495, 0.66),
		Color(0.220, 0.635, 0.618, 0.24),
		Color(0.92, 0.97, 0.99, 1.0),
		0.072,
		0.95,
		true
	)
	var cove_calm_cb := func(wx: float, wz: float) -> float:
		var in_bay := smoothstep(4.0, 12.0, wx) * (1.0 - smoothstep(26.0, 34.0, wx)) * (1.0 - smoothstep(31.5, 42.0, wz))
		return clampf(in_bay * 0.68, 0.0, 0.72)
	CoastalKit.build_coastal_ocean_mesh(
		self, "OceanWater",
		-56.0, width_m + 56.0,
		22.0, depth_m + 66.0,
		72, 46,
		COVE_WATER_Y,
		cove_bed_cb,
		foam_sources,
		cove_calm_cb,
		mat_cove_sea
	)

	# Damp coastal limestone stones organically rimming the 3 carved natural rock basins
	var pool_rims := [
		[Vector2(7.2, 11.75), 1.55, 1.38, 7],
		[Vector2(29.8, 13.35), 1.98, 1.78, 9],
		[Vector2(15.0, 24.75), 1.72, 1.32, 8],
	]
	for pri in range(pool_rims.size()):
		var pr: Array = pool_rims[pri]
		var pc: Vector2 = pr[0]
		var rx_r: float = float(pr[1])
		var rz_r: float = float(pr[2])
		var cnt_r: int = int(pr[3])
		for si in range(cnt_r):
			var ang := float(si) * TAU / float(cnt_r) + float(pri) * 0.7
			var px := pc.x + cos(ang) * rx_r
			var pz := pc.y + sin(ang) * rz_r
			var py := _eval_cove_height(px, pz, width_m, depth_m)
			CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(px, py + 0.06, pz), Vector3(0.56, 0.24, 0.48), ang, float(pri * 10 + si), 2, Color(0.92, 0.96, 0.92))

	# Beach pebbles along the cove wrack line & rocky shore
	for peb_i in range(56):
		var px := rng.randf_range(4.0, width_m - 4.0)
		var pz := _cove_shore_z(px) - rng.randf_range(0.6, 5.2)
		var py := _eval_cove_height(px, pz, width_m, depth_m)
		var psc := Vector3(rng.randf_range(0.10, 0.30), rng.randf_range(0.05, 0.13), rng.randf_range(0.09, 0.26))
		_env_kit.append_multimesh("cove_pebble", Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled_local(psc), Vector3(px, py + psc.y * 0.16, pz)), Color(0.86, 0.84, 0.78))

	# Grounded tiered mossy limestone waterfall grotto cliff (ZERO floating mid-cascade rock!)
	CoastalKit.append_rock_cluster_mm(_env_kit, cliff_keys, Vector3(33.2, 1.50, 11.4), Vector3(2.45, 3.05, 2.05), -0.42, 7.3, 4, Color(0.92, 0.96, 0.90))
	CoastalKit.append_rock_cluster_mm(_env_kit, cliff_keys, Vector3(32.5, 2.62, 12.05), Vector3(1.85, 0.72, 1.48), 0.22, 8.1, 3, Color(0.90, 0.95, 0.88))
	# Grounded lower/mid stepped splash ledge rising solidly from pool bed (y=-0.10 -> 1.45, ZERO floating stone!)
	CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(32.15, 0.68, 12.22), Vector3(1.28, 1.52, 1.08), -0.30, 9.4, 3, Color(0.90, 0.95, 0.90))
	CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(31.25, 0.72, 11.35), Vector3(1.22, 1.25, 1.05), 0.65, 10.2, 3, Color(0.92, 0.96, 0.91))
	CoastalKit.append_rock_cluster_mm(_env_kit, wet_keys, Vector3(32.55, 0.75, 13.55), Vector3(1.18, 1.22, 1.02), -0.75, 11.1, 3, Color(0.92, 0.96, 0.91))

	_env_kit.flush_multimeshes(_grp_env_geo, "CoveGeo_")

	# ==========================================================================
	# 6. 4 INTERIOR CHAMBERS STORYTELLING, MULTI-LAYERED WATERFALL & PROGRESSIVE LIGHTING
	# ==========================================================================
	# 6A. RINCÓN NATURAL (Eastern Wet Mineral Spring Grotto): Lush Mossy Tiered Natural Cascade + Delicate Mist!
	var spring_root := Node3D.new()
	spring_root.name = "CaveMineralSpringAlcove"
	_grp_structures.add_child(spring_root)
	var wf_mat := _create_spring_waterfall_shader()
	var wf_mat_veil := wf_mat.duplicate() as ShaderMaterial
	wf_mat_veil.set_shader_parameter("alpha_mul", 0.48)

	var _add_cascade_sheet := func(s_name: String, origin_xz: Vector2, top_y: float, bot_y: float, arc_len: float, w_top: float, w_bot: float, bump_mid: float, mat_use: Material) -> void:
		var st_wf := SurfaceTool.new(); st_wf.begin(Mesh.PRIMITIVE_TRIANGLES)
		var wf_cols := 10; var wf_rows := 14
		var wf_pts: Array = []
		for wi in range(wf_rows + 1):
			var fv := float(wi) / float(wf_rows)
			var wrow: Array[Vector3] = []
			var arc_out := sin(fv * PI * 0.5) * arc_len + exp(-pow((fv - 0.46) * 4.8, 2.0)) * bump_mid
			var wy_f := lerpf(top_y, bot_y, fv * fv * 0.54 + fv * 0.46)
			var width_w := lerpf(w_top, w_bot, fv)
			for wj in range(wf_cols + 1):
				var fu := float(wj) / float(wf_cols)
				var lateral := (fu - 0.5) * width_w
				var bow := sin(fu * PI) * 0.14
				var px_w := origin_xz.x - (arc_out + bow) * 0.82 - lateral * 0.48
				var pz_w := origin_xz.y + (arc_out + bow) * 0.56 - lateral * 0.88
				wrow.append(Vector3(px_w, wy_f, pz_w))
			wf_pts.append(wrow)
		for wi in range(wf_rows):
			var v0 := float(wi) / float(wf_rows); var v1 := float(wi + 1) / float(wf_rows)
			for wj in range(wf_cols):
				var u0 := float(wj) / float(wf_cols); var u1 := float(wj + 1) / float(wf_cols)
				var a: Vector3 = wf_pts[wi][wj]; var b: Vector3 = wf_pts[wi][wj + 1]
				var c: Vector3 = wf_pts[wi + 1][wj + 1]; var d: Vector3 = wf_pts[wi + 1][wj]
				st_wf.set_uv(Vector2(u0, v0)); st_wf.add_vertex(a)
				st_wf.set_uv(Vector2(u1, v0)); st_wf.add_vertex(b)
				st_wf.set_uv(Vector2(u1, v1)); st_wf.add_vertex(c)
				st_wf.set_uv(Vector2(u0, v0)); st_wf.add_vertex(a)
				st_wf.set_uv(Vector2(u1, v1)); st_wf.add_vertex(c)
				st_wf.set_uv(Vector2(u0, v1)); st_wf.add_vertex(d)
		st_wf.generate_normals()
		var wfm := MeshInstance3D.new()
		wfm.name = s_name
		wfm.mesh = st_wf.commit()
		wfm.material_override = mat_use
		wfm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		spring_root.add_child(wfm)

	# Unified overlapping natural multi-tier cascade hugging the grounded mossy limestone ledge (ZERO disconnected neon strips!)
	_add_cascade_sheet.call("SpringWaterfallMain", Vector2(32.12, 12.24), 2.60, -0.05, 1.32, 1.05, 1.85, 0.24, wf_mat)
	_add_cascade_sheet.call("SpringWaterfallInner", Vector2(32.26, 12.16), 2.54, -0.05, 1.02, 0.85, 1.50, 0.16, wf_mat_veil)
	_add_cascade_sheet.call("SpringWaterfallSprayVeil", Vector2(32.02, 12.30), 2.52, -0.05, 1.48, 1.35, 2.25, 0.26, wf_mat_veil)

	# Lush emerald moss cushions & glossy cave ferns clinging directly to the waterfall lip & ledges!
	if not greybox:
		_env_kit.spawn_moss_cushion(spring_root, Vector3(32.20, 2.72, 11.75), Color("#346e3c"), 1.05, 1.1)
		_env_kit.spawn_moss_cushion(spring_root, Vector3(32.65, 2.68, 12.68), Color("#3c7842"), 0.95, 2.3)
		_env_kit.spawn_moss_cushion(spring_root, Vector3(31.25, 1.32, 11.35), Color("#367240"), 0.92, 3.4)
		_env_kit.spawn_moss_cushion(spring_root, Vector3(32.50, 1.32, 13.48), Color("#3a7440"), 0.88, 4.2)
		_env_kit.spawn_fern_clump(spring_root, Vector3(31.95, 2.65, 11.65), 0.92, mat_ivy, 1.5, 2)
		_env_kit.spawn_fern_clump(spring_root, Vector3(32.55, 2.60, 12.85), 0.86, mat_ivy, 2.7, 2)
		_env_kit.spawn_fern_clump(spring_root, Vector3(31.18, 1.28, 11.42), 0.82, mat_ivy, 3.8, 2)

	# Soft aerated splash foam collar resting cleanly on the mineral pool impact zone (no blinding white blob!)
	var splash_collar := MeshInstance3D.new()
	splash_collar.name = "WaterfallSplashCollar"
	var scm := PlaneMesh.new(); scm.size = Vector2(2.65, 2.25)
	splash_collar.mesh = scm
	var sc_sh := Shader.new()
	sc_sh.code = """
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;
float hash21(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 34.1); return fract(p.x * p.y); }
float vnoise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void fragment() {
	vec2 p = (UV - 0.5) * 2.0;
	float r = length(p);
	float t = TIME * 1.3;
	float n = vnoise(UV * 6.5 + vec2(t * 0.42, -t * 0.35)) * 0.6 + vnoise(UV * 13.0 - vec2(t * 0.55, t * 0.48)) * 0.4;
	float core = 1.0 - smoothstep(0.12, 0.88, r + (n - 0.5) * 0.38);
	float ring = smoothstep(0.30, 0.56, r) * (1.0 - smoothstep(0.64, 0.96, r)) * smoothstep(0.36, 0.78, n);
	ALBEDO = mix(vec3(0.64, 0.82, 0.84), vec3(0.86, 0.92, 0.93), n);
	ROUGHNESS = 0.48;
	ALPHA = clamp((core * 0.40 + ring * 0.38) * smoothstep(0.28, 0.72, n), 0.0, 0.48);
}
"""
	var sc_mat := ShaderMaterial.new(); sc_mat.shader = sc_sh
	splash_collar.material_override = sc_mat
	splash_collar.position = Vector3(30.85, -0.025, 12.92)
	splash_collar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	spring_root.add_child(splash_collar)

	# Delicate rising waterfall mist plume GPUParticles3D (subtle translucent vapor, zero opaque white cloud wall!)
	var mist := GPUParticles3D.new()
	mist.name = "WaterfallMistParticles"
	mist.position = Vector3(31.02, 0.16, 12.88)
	mist.amount = 18
	mist.lifetime = 1.85
	mist.preprocess = 1.2
	mist.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mpm := ParticleProcessMaterial.new()
	mpm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mpm.emission_box_extents = Vector3(0.72, 0.16, 0.68)
	mpm.direction = Vector3(-0.32, 1.0, 0.24)
	mpm.spread = 42.0
	mpm.initial_velocity_min = 0.22
	mpm.initial_velocity_max = 0.52
	mpm.gravity = Vector3(0.0, 0.08, 0.0)
	mpm.scale_min = 0.32
	mpm.scale_max = 0.76
	var mgrad := Gradient.new()
	mgrad.offsets = PackedFloat32Array([0.0, 0.28, 0.72, 1.0])
	mgrad.colors = PackedColorArray([Color(0.84, 0.92, 0.94, 0.0), Color(0.84, 0.92, 0.94, 0.11), Color(0.82, 0.90, 0.93, 0.06), Color(0.82, 0.90, 0.93, 0.0)])
	var mramp := GradientTexture1D.new(); mramp.gradient = mgrad
	mpm.color_ramp = mramp
	mist.process_material = mpm
	var mg_r := Gradient.new()
	mg_r.set_color(0, Color(1.0, 1.0, 1.0, 0.80))
	mg_r.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
	var mtex := GradientTexture2D.new()
	mtex.gradient = mg_r; mtex.fill = GradientTexture2D.FILL_RADIAL
	mtex.fill_from = Vector2(0.5, 0.5); mtex.fill_to = Vector2(1.0, 0.5)
	mtex.width = 48; mtex.height = 48
	var mmat := StandardMaterial3D.new()
	mmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mmat.vertex_color_use_as_albedo = true
	mmat.albedo_texture = mtex
	mmat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mmat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	var mq := QuadMesh.new(); mq.size = Vector2(0.56, 0.56); mq.material = mmat
	mist.draw_pass_1 = mq
	spring_root.add_child(mist)

	# Natural cool aquamarine bounce light + subtle mossy rock rim fill so tiered waterfall limestone reads richly at Day, Dusk & Night!
	var spring_light := OmniLight3D.new()
	spring_light.name = "SpringMineralGlowLight"
	spring_light.light_color = Color("#76d4dc")
	spring_light.light_energy = 1.25
	spring_light.omni_range = 9.0
	spring_light.omni_attenuation = 1.35
	spring_light.position = Vector3(30.2, 1.45, 13.1)
	spring_root.add_child(spring_light)
	var spring_fill := OmniLight3D.new()
	spring_fill.name = "SpringRockFillLight"
	spring_fill.light_color = Color("#b8cec4")
	spring_fill.light_energy = 0.85
	spring_fill.omni_range = 7.5
	spring_fill.omni_attenuation = 1.40
	spring_fill.position = Vector3(30.8, 2.35, 12.2)
	spring_root.add_child(spring_fill)

	# 10 subtle translucent dripping water droplets strictly tucked over the wet spring & seepage rock basins!
	var drip_spots: Array[Vector3] = [
		Vector3(29.2, 2.85, 12.6), Vector3(30.6, 2.95, 13.6), Vector3(31.4, 2.75, 12.9), Vector3(29.8, 2.90, 14.2),
		Vector3(30.9, 2.70, 13.1), Vector3(28.9, 2.80, 13.5),
		Vector3(7.0, 2.80, 11.5), Vector3(7.6, 2.85, 12.1), Vector3(6.8, 2.75, 12.0), Vector3(7.5, 2.70, 11.3),
	]
	for di in range(drip_spots.size()):
		var dsp: Vector3 = drip_spots[di]
		var drip := MeshInstance3D.new()
		var dm := SphereMesh.new(); dm.radius = 0.018; dm.height = 0.085
		drip.mesh = dm; drip.material_override = mat_drip
		drip.position = dsp
		drip.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_grp_env_geo.add_child(drip)
		fx.register_drip(drip, dsp.y, 0.04, 0.62 + float(di % 3) * 0.18, float(di) * 0.21)

	# 6B. RECINTO DE DESCANSO (Dry Northern Alcove): Compact Reclaimed Driftwood Duckboard (2 tones, natural camp pallet!) + Woven Rug!
	var mat_deck := MatKit.make_wood_mat(Color("#84664a"), true)
	var mat_deck_pale := MatKit.make_wood_mat(Color("#967d62"), true)
	var deck_root := Node3D.new()
	deck_root.name = "CaveTimberPlatform"
	_grp_props.add_child(deck_root)
	for pl_i in range(8):
		var pl := MeshInstance3D.new()
		var p_len := 8.8 - fmod(float(pl_i) * 0.43, 0.85)
		var plm_d := BoxMesh.new(); plm_d.size = Vector3(p_len, 0.032, 0.34)
		pl.mesh = plm_d; pl.material_override = mat_deck if pl_i % 3 != 0 else mat_deck_pale
		pl.position = Vector3(18.2 + sin(float(pl_i) * 1.9) * 0.16, 0.020, 8.85 + float(pl_i) * 0.37)
		pl.rotation.y = sin(float(pl_i) * 1.4) * 0.012
		deck_root.add_child(pl)
	PropFactory.create_woven_rug(_grp_props, "CaveSanctuaryRug", Vector3(18.2, 0.042, 10.15), Vector2(3.8, 2.1), Color("#84583c"), Color("#c8a872"), 0.0)
	PropFactory.create_woven_rug(_grp_props, "CaveHearthRug", Vector3(18.2, 0.012, 16.45), Vector2(2.05, 1.12), Color("#7d4f38"), Color("#c09c68"), 0.14)

	# 6C. RECINTO DE ALMACÉN (Sheltered Western Alcove): Dry Stacked Firewood, Salvaged Crates/Barrels & Coiled Ropes (ZERO heavy furniture!)
	var stor_root := Node3D.new()
	stor_root.name = "CaveStorageSupplies"
	_grp_props.add_child(stor_root)
	var mat_crate := MatKit.make_wood_mat(Color("#826444"), true)
	var mat_cask := MatKit.make_wood_mat(Color("#624732"), true)
	_spawn_prop_glb(stor_root, "crate.glb", Vector3(5.6, 0.0, 7.6), 0.32, Vector3.ONE * 0.72, false, "CaveStorageCrateA", mat_crate)
	_spawn_prop_glb(stor_root, "crate.glb", Vector3(6.45, 0.0, 7.2), -0.18, Vector3.ONE * 0.58, false, "CaveStorageCrateB", mat_crate)
	_spawn_prop_glb(stor_root, "barrel.glb", Vector3(4.9, 0.0, 8.4), 0.5, Vector3.ONE * 0.76, false, "CaveStorageBarrelA", mat_cask)
	_spawn_prop_glb(stor_root, "barrel.glb", Vector3(4.5, 0.0, 9.2), 1.1, Vector3.ONE * 0.68, false, "CaveStorageBarrelB", mat_cask)
	for fw_i in range(6):
		var f_row := fw_i / 3
		var f_col := fw_i % 3
		var fl := MeshInstance3D.new()
		var flm := CylinderMesh.new(); flm.top_radius = 0.075; flm.bottom_radius = 0.088; flm.height = 0.78; flm.radial_segments = 7
		fl.mesh = flm; fl.material_override = mat_rail_wood
		fl.position = Vector3(5.4 + float(f_col) * 0.16, 0.08 + float(f_row) * 0.14, 15.2)
		fl.rotation = Vector3(0.0, 0.25, PI * 0.5)
		stor_root.add_child(fl)
	for rc_i in range(3):
		var cr_m := MeshInstance3D.new()
		var crm := TorusMesh.new(); crm.inner_radius = 0.14; crm.outer_radius = 0.19; crm.rings = 12
		cr_m.mesh = crm; cr_m.material_override = mat_rope
		cr_m.position = Vector3(6.2, 0.04 + float(rc_i) * 0.032, 15.6)
		stor_root.add_child(cr_m)

	# 6D. Progressive Sheltered Interior Lighting: Solidly GROUNDED cave-wall rock pedestals + always-lit warm lanterns (ZERO floating stones!)
	var ledge_lantern_pts: Array[Vector3] = [
		Vector3(12.2, 0.72, 4.6),  # Descanso West rock pedestal
		Vector3(18.6, 0.82, 3.2),  # Descanso North rear pedestal
		Vector3(24.6, 0.72, 4.8),  # Descanso East rock pedestal
		Vector3(5.4, 0.62, 10.2),  # Almacén West shelf lantern
		Vector3(17.4, 0.64, 13.4), # Central sanctuary hearth pedestal (warms Mia/Trinity spawns)
		Vector3(11.6, 0.68, 19.4), # Cave Mouth West threshold pedestal
		Vector3(25.4, 0.68, 19.2), # Cave Mouth East threshold pedestal
	]
	for lgi in range(ledge_lantern_pts.size()):
		var lgp: Vector3 = ledge_lantern_pts[lgi]
		# Tall grounded stone cairn/pedestal reaching solidly into the cave floor (y=0 -> lgp.y)!
		_env_kit.spawn_rock(_grp_props, Vector3(lgp.x, lgp.y * 0.48, lgp.z), Vector3(0.64, lgp.y * 1.05, 0.58), float(lgi) * 1.1, mat_arch, lgi + 3, "stratified")
		var r_lan := PropFactory.create_portable_lantern(_grp_interactables, fx, lgp + Vector3(0.0, 0.02, 0.0), true, 0.88)
		r_lan.name = "RefugeWallLantern_%d" % lgi

	# Damp cave flora: emerald moss cushions, glossy cave ferns & luminous cave blossoms beside mineral spring & pools!
	if not greybox:
		var refuge_flora: Array[Vector2] = [
			Vector2(11.5, 10.2), Vector2(24.5, 10.6), Vector2(6.2, 13.8), Vector2(28.4, 11.4),
			Vector2(31.4, 14.8), Vector2(27.8, 16.2), Vector2(31.8, 11.4), Vector2(13.2, 23.6), Vector2(23.5, 22.8),
		]
		for rf_i in range(refuge_flora.size()):
			var rfp: Vector2 = refuge_flora[rf_i]
			var rfy := _eval_cove_height(rfp.x, rfp.y, width_m, depth_m)
			_env_kit.spawn_moss_cushion(_grp_vegetation, Vector3(rfp.x, rfy, rfp.y), Color("#3a6d44"), 1.05, float(rf_i) * 1.5)
			_env_kit.spawn_fern_clump(_grp_vegetation, Vector3(rfp.x - 0.3, rfy, rfp.y + 0.25), 0.92, mat_ivy, float(rf_i) * 1.8, 2)
			_env_kit.spawn_wildflower_patch(_grp_vegetation, Vector3(rfp.x + 0.35, rfy, rfp.y + 0.2), float(rf_i) * 1.2, 5, "refuge")

	# ==========================================================================
	# 7. COVE & COASTAL WILDLIFE (ZERO fish in interior cave puddles; real sea fauna in the turquoise cove!)
	# ==========================================================================
	FaunaKit.spawn_fish(_grp_vegetation, fauna_agents, "SeaFish_Cove_0", [
		Vector3(11.5, -0.36, depth_m + 7.2), Vector3(16.8, -0.26, _cove_shore_z(16.8) + 3.4),
		Vector3(21.5, -0.26, _cove_shore_z(21.5) + 3.6), Vector3(25.8, -0.36, depth_m + 7.4),
	], 18.0, 0.20, Color("#427b8e"), "swim_ocean_jump", 1.25)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 62.0, 0.38, 8.0, false, 0.0)

	FaunaKit.spawn_turtle(_grp_vegetation, fauna_agents, "CoveSeaTurtle", [
		Vector3(10.5, -0.68, 36.2), Vector3(15.2, -0.42, 33.4),
		Vector3(21.8, -0.46, 34.2), Vector3(25.4, -0.78, 37.8),
		Vector3(17.5, -0.92, 40.5), Vector3(10.5, -0.68, 36.2),
	], 34.0, 1.1)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm"], 74.0, 0.52, 4.0, false, 3.8)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "CaveCrab_0", [
		Vector3(8.5, 0.02, 23.2), Vector3(10.2, 0.02, 24.4), Vector3(11.4, 0.02, 25.6), Vector3(8.5, 0.02, 23.2),
	], 16.0, 0.9, Color("#a8432c"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], [], 44.0, 0.50, 4.0, true, 3.0)

	FaunaKit.spawn_crab(_grp_vegetation, fauna_agents, "CaveCrab_1", [
		Vector3(25.2, 0.02, 22.8), Vector3(26.8, 0.02, 24.0), Vector3(25.4, 0.02, 25.2), Vector3(25.2, 0.02, 22.8),
	], 17.0, 2.7, Color("#9c3d28"))
	FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night", "dawn"], [], 48.0, 0.50, 20.0, true, 3.0)

	for st_i in range(2):
		var sp_star: Vector3 = [Vector3(13.8, -0.02, 24.6), Vector3(16.2, -0.02, 25.2)][st_i]
		FaunaKit.spawn_seastar(_grp_vegetation, sp_star, Color("#d45e3b") if st_i % 2 == 0 else Color("#b84360"), float(st_i) * 1.4)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "RefugePerchedTern_0", Vector3(5.25, _eval_cove_height(5.25, 24.75, width_m, depth_m) + 1.15, 24.75), 0.6, Color("#eef4f8"), Color("#627180"), 1.04, 0.5)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 44.0, 0.44, 4.0, false, 4.0)

	FaunaKit.spawn_perched_bird(_grp_vegetation, fauna_agents, "RefugePerchedTern_1", Vector3(32.25, _eval_cove_height(32.25, 24.75, width_m, depth_m) + 1.15, 24.75), -0.9, Color("#e8eff4"), Color("#566574"), 1.02, 2.4)
	FaunaKit.set_behavior(fauna_agents.back(), ["day", "arrival", "dawn", "dusk"], ["storm", "rain"], 52.0, 0.42, 24.0, false, 4.0)

	for bt_i in range(2):
		FaunaKit.spawn_bat(_grp_vegetation, fauna_agents, "CaveBat_%d" % bt_i, [
			Vector3(8.5 + float(bt_i) * 6.0, 2.75, 7.2), Vector3(18.5, 2.95, 11.5),
			Vector3(28.0 - float(bt_i) * 5.0, 2.65, 8.8), Vector3(17.5, 2.85, 5.4),
			Vector3(8.5 + float(bt_i) * 6.0, 2.75, 7.2),
		], 10.5 + float(bt_i) * 2.5, float(bt_i) * 3.1)
		FaunaKit.set_behavior(fauna_agents.back(), ["dusk", "night"], ["storm"], 38.0, 0.60, 4.0 + float(bt_i) * 14.0, false, 0.0)

	sync_wildlife()
