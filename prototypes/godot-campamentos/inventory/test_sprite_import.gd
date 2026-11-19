extends SceneTree
func _initialize() -> void:
	var checked := 0
	var failures := 0
	for hero in ["cleric", "rogue", "wizard"]:
		var data: Dictionary = load("res://inventory/sprite_library.gd").profile(hero)
		for clip in data.clips.values() + data.torch_walk.values():
			for frame in clip.frames:
				checked += 1
				if frame.tex.get_height() < 100 or frame.top_clearance < 1 or frame.bottom_clearance < 1:
					failures += 1
					printerr("FAIL clipped or incomplete pose ", hero, " ", checked, " ", frame.top_clearance, " / ", frame.bottom_clearance)
	print("SPRITE IMPORT ", checked, " poses / ", failures, " FAIL")
	quit(0 if failures == 0 and checked == 144 else 1)
