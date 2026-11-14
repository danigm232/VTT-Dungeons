class_name TacticalCamera
extends "res://scripts/vtt_camera_base.gd"

const WreckStructure = preload("res://scripts/wreck_structure.gd")

func _build_overview_envelope_points() -> void:
	_overview_points.clear()
	WreckStructure._static_init()
	for st: Vector2 in WreckStructure.stations:
		var x: float = st.x
		var beam: float = st.y
		var rail_top: float = 4.1 if (x <= WreckStructure.STERN_DECK_END or x >= WreckStructure.BOW_DECK_START) else 1.2
		for side in [-1.0, 1.0]:
			var z: float = side * beam
			var list_y: float = WreckStructure.get_list_height(z)
			_overview_points.append(Vector3(x, list_y, z))
			_overview_points.append(Vector3(x, -6.55 + WreckStructure.get_list_height(z * 0.92), z * 0.92))
			_overview_points.append(Vector3(x, rail_top + list_y, z))
	_overview_points.append(Vector3(0.0, WreckStructure.KEEL_HEIGHT, 0.0))
	_overview_points.append(Vector3(38.5, 7.8, 0.0))
	_overview_points.append(Vector3(33.2, -1.0, 0.0))
	_overview_points.append(WRECK_MAST_TOP_POS)
