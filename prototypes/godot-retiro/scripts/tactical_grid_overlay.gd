@tool
class_name TacticalGridOverlay
extends Node3D

# ==============================================================================
# CUADRÍCULA TÁCTICA 2.5D ADAPTADA AL TERRENO AMPLIADO (D&D 5e: 1.5m = 5 pies)
# Sincronizada con VttRoleUi (opacidad y visibilidad por rol)
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const TERRAIN_JSON_PATH := "res://assets/data/retreat-terrain-v2.json"

@export var grid_color: Color = Color(0.95, 0.94, 0.88, 0.16)
@export var show_grid: bool = true

var immediate_mesh: ImmediateMesh
var mesh_instance: MeshInstance3D
var mat_grid_lower: StandardMaterial3D
var mat_grid_upper: StandardMaterial3D

func _ready() -> void:
	if not show_grid:
		return
	_build_grid()

func _build_grid() -> void:
	if has_node("GridLines"):
		return
	mesh_instance = MeshInstance3D.new()
	mesh_instance.name = "GridLines"
	immediate_mesh = ImmediateMesh.new()
	mat_grid_lower = StandardMaterial3D.new()
	mat_grid_lower.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_grid_lower.albedo_color = grid_color
	mat_grid_lower.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_grid_upper = mat_grid_lower

	immediate_mesh.surface_begin(Mesh.PRIMITIVE_LINES, mat_grid_lower)

	var tile := Structure.TILE_METERS
	var drawn_terrain := false
	if FileAccess.file_exists(TERRAIN_JSON_PATH):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(TERRAIN_JSON_PATH))
		if parsed is Dictionary:
			var surf_array: Array = parsed.get("surfaces", [])
			var seen_edges: Dictionary = {}
			for surf in surf_array:
				var sid: String = str(surf.get("id", ""))
				var is_exit_tail_surface := sid in ["island-pleamar-low", "island-pleamar-high", "island-observatory"]
				var y_lift := 0.14 if sid == "a1" else 0.045
				for entry in surf.get("tiles", []):
					var cell: Dictionary = entry.get("cell", {})
					var col: int = int(cell.get("col", 0))
					var row: int = int(cell.get("row", 0))
					if is_exit_tail_surface:
						if sid == "island-pleamar-low" and col <= 13:
							continue
						if sid == "island-pleamar-high" and col <= 16:
							continue
						if sid == "island-observatory" and (row <= 16 or col >= 100):
							continue
					var c: Array = entry.get("corners", [0.0, 0.0, 0.0, 0.0])
					var x0 := float(col) * tile
					var x1 := float(col + 1) * tile
					var z0 := float(row) * tile
					var z1 := float(row + 1) * tile
					var p00 := Vector3(x0, float(c[0]) + y_lift, z0)
					var p10 := Vector3(x1, float(c[1]) + y_lift, z0)
					var p11 := Vector3(x1, float(c[2]) + y_lift, z1)
					var p01 := Vector3(x0, float(c[3]) + y_lift, z1)
					_add_unique_edge(seen_edges, p00, p10)
					_add_unique_edge(seen_edges, p10, p11)
					_add_unique_edge(seen_edges, p11, p01)
					_add_unique_edge(seen_edges, p01, p00)
					drawn_terrain = true

	if not drawn_terrain:
		for c in range(10, 50):
			var x := float(c) * tile
			immediate_mesh.surface_add_vertex(Vector3(x, 0.27, 90.0))
			immediate_mesh.surface_add_vertex(Vector3(x, 0.27, 117.0))
		for r in range(60, 79):
			var z := float(r) * tile
			immediate_mesh.surface_add_vertex(Vector3(15.0, 0.27, z))
			immediate_mesh.surface_add_vertex(Vector3(73.5, 0.27, z))

	immediate_mesh.surface_end()
	mesh_instance.mesh = immediate_mesh
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mesh_instance)

func _add_unique_edge(seen: Dictionary, a: Vector3, b: Vector3) -> void:
	var ka := "%d,%d,%d" % [roundi(a.x * 20.0), roundi(a.y * 20.0), roundi(a.z * 20.0)]
	var kb := "%d,%d,%d" % [roundi(b.x * 20.0), roundi(b.y * 20.0), roundi(b.z * 20.0)]
	var key := (ka + "|" + kb) if ka < kb else (kb + "|" + ka)
	if seen.has(key):
		return
	seen[key] = true
	immediate_mesh.surface_add_vertex(a)
	immediate_mesh.surface_add_vertex(b)
