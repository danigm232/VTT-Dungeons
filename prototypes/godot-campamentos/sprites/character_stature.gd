extends RefCounted
## One calibration across maps. An explicitly customised height is preserved.
static var _data: Dictionary={}
static func data() -> Dictionary:
	if _data.is_empty(): _data=JSON.parse_string(FileAccess.get_file_as_string("res://sprites/character_stature.json"))
	return _data
static func apply(body: Node3D,key: String) -> void:
	if body.get_meta("stature_preserve_visual",false): return
	if key.begins_with("zombie"): key="zombie"
	var profile: Dictionary=data().profiles.get(key,{})
	if profile.is_empty(): return
	var current: float=body.target_height
	if profile.legacy.any(func(value): return is_equal_approx(float(value),current)):
		body.target_height=float(profile.meters)
	body.set_meta("stature_basis",profile.status)
	body.set_meta("stature_size_category",profile.size)
