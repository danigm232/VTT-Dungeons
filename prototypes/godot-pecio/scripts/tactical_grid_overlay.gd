extends Node3D
class_name TacticalGridOverlay

# ==============================================================================
# OVERLAY TÁCTICO MULTICUBIERTA (1.5m = 5ft) — CAPA 1 COMPLETA (C1..C10)
# Genera cuadrícula calibrada en todas las cubiertas jugables del Pecio
# y sincroniza su visibilidad con los recortes de RoofCutoutController.
# ==============================================================================

var mat_grid_upper: StandardMaterial3D
var mat_grid_lower: StandardMaterial3D

var grid_nodes: Dictionary = {}

func _ready() -> void:
	setup_material()
	build_tactical_grid()
	sync_cutout_mode("exterior")

func setup_material() -> void:
	mat_grid_upper = StandardMaterial3D.new()
	mat_grid_upper.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_grid_upper.albedo_color = Color(0.65, 0.68, 0.63, 0.16)
	mat_grid_upper.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_grid_upper.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat_grid_upper.render_priority = 1

	mat_grid_lower = StandardMaterial3D.new()
	mat_grid_lower.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_grid_lower.albedo_color = Color(0.54, 0.76, 0.74, 0.22)
	mat_grid_lower.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_grid_lower.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat_grid_lower.render_priority = 2

func build_tactical_grid() -> void:
	for child in get_children():
		child.queue_free()
	grid_nodes.clear()

	# C1: Cubierta Principal / Combés (y = 0.03)
	_build_hull_zone_grid("Grid_C1", -13.5, 13.5, 0.03, 1.0, 0.35, mat_grid_upper, false)
	# C2: Castillo de Proa (y = 3.03)
	_build_hull_zone_grid("Grid_C2", 13.5, 29.25, 3.03, 1.0, 0.45, mat_grid_upper, false)
	# C3: Castillo de Popa / Alcázar (y = 3.03)
	_build_hull_zone_grid("Grid_C3", -29.25, -13.5, 3.03, 1.0, 0.45, mat_grid_upper, false)
	# C4 + C5: Camarotes de Popa (y = 0.03, esquivando brecha P13)
	_build_hull_zone_grid("Grid_CabinsAft", -27.0, -13.5, 0.03, 0.94, 0.55, mat_grid_upper, true)
	# C6 + C7: Camarotes de Proa (y = 0.03)
	_build_hull_zone_grid("Grid_CabinsFore", 13.5, 26.25, 0.03, 0.94, 0.55, mat_grid_upper, false)
	# C8: Sentina Inundada (y = -3.08, justo sobre lámina salobre para lectura táctica)
	_build_hull_zone_grid("Grid_C8", -27.0, 27.0, -3.08, 0.85, 0.40, mat_grid_lower, false)
	# C9: Bodega Sumergida (y = -6.34)
	_build_hull_zone_grid("Grid_C9", -22.5, 22.5, -6.34, 0.58, 0.30, mat_grid_lower, false)
	# C10: Cofa del Palo Mayor (y = 15.04, radio circular 2.7m)
	_build_circle_zone_grid("Grid_C10", Vector3(0.35, 15.04, -0.48), 2.70, mat_grid_upper)

func _is_p13_void(x: float, z: float) -> bool:
	return x > -18.25 and x < -16.75 and z > -3.95 and z < -2.45

func _build_hull_zone_grid(
	zone_name: String,
	x_min: float,
	x_max: float,
	y_grid: float,
	beam_scale: float,
	inset: float,
	mat: Material,
	skip_p13: bool
) -> void:
	var step := WreckStructure.TILE_METERS # 1.5m
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_LINES)
	st.set_material(mat)

	var x := x_min
	while x <= x_max + 0.001:
		var bw: float = maxf(0.45, WreckStructure.get_beam_at(clampf(x, -30.5, 30.5)) * beam_scale - inset)
		var z := -bw
		while z < bw - 0.05:
			var z_next: float = minf(bw, z + 0.5)
			if not (skip_p13 and _is_p13_void(x, (z + z_next) * 0.5)):
				st.add_vertex(Vector3(x, y_grid, z))
				st.add_vertex(Vector3(x, y_grid, z_next))
			z = z_next

		if x + step <= x_max + 0.001:
			var bw_next: float = maxf(0.45, WreckStructure.get_beam_at(clampf(x + step, -30.5, 30.5)) * beam_scale - inset)
			var max_bw := minf(bw, bw_next)
			var z_step := -floorf(max_bw / step) * step
			while z_step <= max_bw + 0.001:
				var xm := (x + step * 0.5)
				if not (skip_p13 and _is_p13_void(xm, z_step)):
					st.add_vertex(Vector3(x, y_grid, z_step))
					st.add_vertex(Vector3(x + step, y_grid, z_step))
				z_step += step
		x += step

	var mesh := st.commit()
	var inst := MeshInstance3D.new()
	inst.name = zone_name
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.mesh = mesh
	add_child(inst)
	grid_nodes[zone_name] = inst

func _build_circle_zone_grid(zone_name: String, center: Vector3, radius: float, mat: Material) -> void:
	var step := WreckStructure.TILE_METERS
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_LINES)
	st.set_material(mat)

	var r_sq := radius * radius
	var steps := [-2, -1, 0, 1, 2]
	for ix in steps:
		var dx := (float(ix) - 0.5) * step
		if absf(dx) < radius:
			var chord := sqrt(maxf(0.0, r_sq - dx * dx))
			st.add_vertex(Vector3(center.x + dx, center.y, center.z - chord))
			st.add_vertex(Vector3(center.x + dx, center.y, center.z + chord))
	for iz in steps:
		var dz := (float(iz) - 0.5) * step
		if absf(dz) < radius:
			var chord := sqrt(maxf(0.0, r_sq - dz * dz))
			st.add_vertex(Vector3(center.x - chord, center.y, center.z + dz))
			st.add_vertex(Vector3(center.x + chord, center.y, center.z + dz))

	var mesh := st.commit()
	var inst := MeshInstance3D.new()
	inst.name = zone_name
	inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	inst.mesh = mesh
	add_child(inst)
	grid_nodes[zone_name] = inst

func sync_cutout_mode(mode: String) -> void:
	for k in grid_nodes:
		var node: MeshInstance3D = grid_nodes[k]
		if node:
			node.visible = false

	match mode:
		"aft_c4_port", "aft_c4_c5", "aft_c5_stbd":
			_show(["Grid_C1", "Grid_C2", "Grid_CabinsAft", "Grid_C10"])
		"fore_c6_port", "fore_c6_c7", "fore_c7_stbd":
			_show(["Grid_C1", "Grid_C3", "Grid_CabinsFore"])
		"lower_c8_bilge", "lower_c8_c9":
			_show(["Grid_C8"])
		"lower_c9_hold":
			_show(["Grid_C9"])
		_:
			_show(["Grid_C1", "Grid_C2", "Grid_C3", "Grid_C10"])

func _show(keys: Array) -> void:
	for key in keys:
		if grid_nodes.has(key) and grid_nodes[key]:
			grid_nodes[key].visible = true
