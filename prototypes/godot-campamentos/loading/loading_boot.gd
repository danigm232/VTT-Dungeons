extends Node
const Structure = preload("res://scripts/camp_structure.gd")
func _ready() -> void:
	var manager = get_node("/root/SkillLoading")
	var review = "--loading-review" in OS.get_cmdline_user_args()
	var target_scene := "res://scenes/camp_forest_pleamar.tscn"
	var destination := str(ProjectSettings.get_setting("application/config/name"))
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--camp="):
			var cid := arg.substr(7).strip_edges()
			Structure.set_active_scene_id(cid)
			target_scene = Structure.scene_path_for_id(cid)
		elif arg.begins_with("--scene="):
			var candidate := arg.trim_prefix("--scene=").strip_edges()
			if candidate.begins_with("res://scenes/") and ResourceLoader.exists(candidate):
				target_scene = candidate
				Structure.set_active_scene_id(Structure.scene_id_from_path(candidate))
		elif arg.begins_with("--destination="):
			var d := arg.trim_prefix("--destination=").strip_edges()
			if not d.is_empty():
				destination = d
	if not ResourceLoader.exists(target_scene):
		target_scene = "res://scenes/camp_forest_pleamar.tscn"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--capture-") or arg.begins_with("--audit-"):
			# Existing map audit/capture commands keep their direct scene lifecycle.
			get_tree().change_scene_to_file.call_deferred(target_scene)
			return
	if review:
		manager.open_review()
	else:
		manager.load_map(target_scene, destination, "initial")
