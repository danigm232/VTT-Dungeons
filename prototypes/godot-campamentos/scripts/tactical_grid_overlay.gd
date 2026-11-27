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
