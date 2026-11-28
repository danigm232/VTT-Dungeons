class_name TacticalGridOverlay
extends "res://player/walkable_grid.gd"
const Structure = preload("res://scripts/camp_structure.gd")
var show_grid := true
var outdoor_subtle_sage := false

func build_for_scene(scene_def: Dictionary) -> void:
	var sid := str(scene_def.get("id", ""))
	outdoor_subtle_sage = sid != "camp-a1-rooms"
	var source: Array = []
	var seen: Dictionary = {}
	for cell in scene_def.get("walkable", []):
		var k := Vector2i(int(cell.col), int(cell.row))
		if not seen.has(k):
			seen[k] = true
			var sq := square(k.x, k.y)
			if sid == "camp-forest-pleamar":
				var wp := Vector3((float(k.x) + 0.5) * TILE, 0.0, (float(k.y) + 0.5) * TILE)
				var is_w := str(cell.get("medium", "solid")) == "water" or str(cell.get("materialId", "")) == "water" or Structure.is_water_at(wp, scene_def)
				if is_w and not Structure.is_on_forest_bridge(wp):
					# Shallow creek is wadeable, but automatic pathfinding strongly prefers the dry footbridge (Paso 5.13)
					sq["movement_cost"] = 5.0
					sq["is_shallow_water"] = true
			source.append(sq)
	if sid == "camp-forest-pleamar":
		# Extended tactical grid along curved North Pleamar road, South Pleamar road, and West bridge trail (#2, Paso 7)
		for r_n in range(-24, 0):
			var zn := (float(r_n) + 0.5) * TILE
			var txn := 19.6
			if zn >= -8.5:
				txn = lerpf(19.6, 17.8, clampf((4.5 - zn) / 13.0, 0.0, 1.0))
			elif zn >= -24.0:
				txn = lerpf(17.8, 22.8, clampf((-8.5 - zn) / 15.5, 0.0, 1.0))
			else:
				txn = lerpf(22.8, 21.2, clampf((-24.0 - zn) / 24.0, 0.0, 1.0))
			var cn := int(round(txn / TILE))
			for dc in range(-1, 2):
				var kn := Vector2i(cn + dc, r_n)
				if not seen.has(kn):
					seen[kn] = true
					source.append(square(kn.x, kn.y))
		var base_rows := int(scene_def.get("rows", 22))
		for r_s in range(base_rows, base_rows + 24):
			var zs := (float(r_s) + 0.5) * TILE
			var txs := lerpf(20.6, 24.0, clampf((zs - 30.5) / 17.5, 0.0, 1.0)) if zs <= 48.0 else lerpf(24.0, 21.8, clampf((zs - 48.0) / 28.0, 0.0, 1.0))
			var cs := int(round(txs / TILE))
			for dc in range(-1, 2):
				var ks := Vector2i(cs + dc, r_s)
				if not seen.has(ks):
					seen[ks] = true
					source.append(square(ks.x, ks.y))
		for c_w in range(-16, 3):
			var xw := (float(c_w) + 0.5) * TILE
			var bzw := 17.0 if xw >= -2.2 else (lerpf(17.5, 16.2, clampf((-2.2 - xw) / 13.3, 0.0, 1.0)) if xw >= -15.5 else lerpf(16.2, 19.2, clampf((-15.5 - xw) / 14.5, 0.0, 1.0)))
			var rw_c := int(round(bzw / TILE))
			for dr in range(-1, 2):
				var kw := Vector2i(c_w, rw_c + dr)
				if not seen.has(kw):
					seen[kw] = true
					var sq_w := square(kw.x, kw.y)
					var wpw := Vector3((float(kw.x) + 0.5) * TILE, 0.0, (float(kw.y) + 0.5) * TILE)
					if Structure.is_water_at(wpw, scene_def) and not Structure.is_on_forest_bridge(wpw):
						sq_w["movement_cost"] = 5.0
						sq_w["is_shallow_water"] = true
					source.append(sq_w)
	elif sid == "camp-coastal-refuge":
		# Extended sloped walkable grid along the scenic descending western coastal trail into Cala Pleamar!
		var ob := get_parent().get_node_or_null("OutdoorCampWorld") if get_parent() else null
		if ob == null and get_parent() and "outdoor_builder" in get_parent():
			ob = get_parent().get("outdoor_builder")
		for c_t in range(-10, 4):
			var xt := (float(c_t) + 0.5) * TILE
			var u_t := clampf((xt - (-15.0)) / 21.0, 0.0, 1.0)
			var tz := lerpf(15.2, 23.6, u_t * u_t * (3.0 - 2.0 * u_t)) + sin(u_t * PI) * 1.15
			var rt_c := int(round(tz / TILE))
			for dr in range(-1, 2):
				var kt := Vector2i(c_t, rt_c + dr)
				if not seen.has(kt):
					seen[kt] = true
					var sq_t := square(kt.x, kt.y)
					if is_instance_valid(ob) and ob.has_method("eval_ground_height"):
						for ci in range(4):
							var cp: Vector3 = sq_t.corners[ci]
							cp.y = float(ob.call("eval_ground_height", cp.x, cp.z))
							sq_t.corners[ci] = cp
					source.append(sq_t)
		# Shallow wadeable cove shoreline tiles connecting the sandy cove cleanly into the water
		for r_sh in range(19, 24):
			for c_sh in range(3, 22):
				var ks := Vector2i(c_sh, r_sh)
				if seen.has(ks):
					continue
				if is_instance_valid(ob) and ob.has_method("eval_ground_height"):
					var wx_s := (float(c_sh) + 0.5) * TILE
					var wz_s := (float(r_sh) + 0.5) * TILE
					var gy_s := float(ob.call("eval_ground_height", wx_s, wz_s))
					if gy_s >= -0.72 and gy_s <= 0.12:
						seen[ks] = true
						var sq_s := square(ks.x, ks.y)
						sq_s["is_shallow_water"] = gy_s < -0.16
						for ci in range(4):
							var cp: Vector3 = sq_s.corners[ci]
							cp.y = float(ob.call("eval_ground_height", cp.x, cp.z))
							sq_s.corners[ci] = cp
						source.append(sq_s)
	elif sid == "camp-wreck-beach":
		var ob_b := get_parent().get_node_or_null("CampOutdoorBuilder") if get_parent() else null
		if ob_b == null and get_parent() and "outdoor_builder" in get_parent():
			ob_b = get_parent().get("outdoor_builder")
		for r_sh in range(15, 22):
			for c_sh in range(2, 24):
				var kb := Vector2i(c_sh, r_sh)
				if seen.has(kb):
					continue
				if is_instance_valid(ob_b) and ob_b.has_method("eval_ground_height"):
					var wx_b := (float(c_sh) + 0.5) * TILE
					var wz_b := (float(r_sh) + 0.5) * TILE
					var gy_b := float(ob_b.call("eval_ground_height", wx_b, wz_b))
					if gy_b >= -0.72 and gy_b <= 0.12:
						seen[kb] = true
						var sq_b := square(kb.x, kb.y)
						sq_b["is_shallow_water"] = gy_b < -0.16
						for ci in range(4):
							var cp: Vector3 = sq_b.corners[ci]
							cp.y = float(ob_b.call("eval_ground_height", cp.x, cp.z))
							sq_b.corners[ci] = cp
						source.append(sq_b)
	elif sid == "camp-cliffs-observatory":
		# Extended sloped walkable grid along the SW Retiro arrival staircase & N Observatory bridge threshold (Option A!)
		var ob_c := get_parent().get_node_or_null("OutdoorCampWorld") if get_parent() else null
		if ob_c == null and get_parent() and "outdoor_builder" in get_parent():
			ob_c = get_parent().get("outdoor_builder")
		for c_a in range(-6, 4):
			var xa := (float(c_a) + 0.5) * TILE
			var u_a := clampf((xa - (-22.0)) / 28.0, 0.0, 1.0)
			var su_a := u_a * u_a * (3.0 - 2.0 * u_a)
			var tza := lerpf(32.5, 20.6, su_a) + sin(u_a * PI * 1.4) * 1.65
			var ra_c := int(round(tza / TILE))
			for dr in range(-1, 2):
				var ka := Vector2i(c_a, ra_c + dr)
				if not seen.has(ka):
					seen[ka] = true
					var sq_a := square(ka.x, ka.y)
					if is_instance_valid(ob_c) and ob_c.has_method("eval_ground_height"):
						for ci in range(4):
							var cp: Vector3 = sq_a.corners[ci]
							cp.y = float(ob_c.call("eval_ground_height", cp.x, cp.z))
							sq_a.corners[ci] = cp
					source.append(sq_a)
		for r_b in range(-2, 2):
			for c_b in [12, 13]:
				var kb := Vector2i(c_b, r_b)
				if not seen.has(kb):
					seen[kb] = true
					var sq_b := square(kb.x, kb.y)
					var bridge_y := lerpf(0.06, 0.42, clampf((3.0 - (float(r_b) + 0.5) * TILE) / 5.5, 0.0, 1.0))
					for ci in range(4):
						var cpb: Vector3 = sq_b.corners[ci]
						cpb.y = bridge_y
						sq_b.corners[ci] = cpb
					source.append(sq_b)
	configure(source)

func _rebuild(version: int) -> void:
	await super._rebuild(version)
	if outdoor_subtle_sage and material:
		material.set_shader_parameter("opacity", 0.095)
		material.set_shader_parameter("thickness", 0.56)
		material.set_shader_parameter("contrast_mode", false)
		material.set_shader_parameter("line_color", Color("#9ca696"))

func apply_preferences(prefs: Dictionary, focus: Vector3) -> void:
	super.apply_preferences(prefs, focus)
	if outdoor_subtle_sage and material:
		var base_op := float(prefs.get("gridOpacity", 0.22)) if prefs.get("showGrid", true) else 0.0
		material.set_shader_parameter("opacity", clampf(base_op * 0.44, 0.0, 0.22))
		material.set_shader_parameter("thickness", 0.56)
		material.set_shader_parameter("contrast_mode", false)
		material.set_shader_parameter("line_color", Color("#9ca696"))

func set_grid_visible(value: bool) -> void: show_grid = value; visible = value
func set_grid_opacity(value: float) -> void:
	if material:
		material.set_shader_parameter("opacity", clampf(value * 0.44, 0.0, 0.22) if outdoor_subtle_sage else value)
