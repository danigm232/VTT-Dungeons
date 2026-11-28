extends SceneTree

const Stage = preload("res://loading/loading_stage.gd")
const Session = preload("res://loading/loading_session.gd")

func _initialize() -> void:
	audit.call_deferred()

func capture(stage: Control, folder: String, label: String, full: bool) -> int:
	stage.queue_redraw()
	await process_frame
	await process_frame
	RenderingServer.force_draw(false)
	var picture := root.get_texture().get_image()
	if not full:
		picture = picture.get_region(Rect2i(0, 204, 1280, 316))
		picture.resize(384, 95, Image.INTERPOLATE_LANCZOS)
	return picture.save_png(folder.path_join(label + ".png"))

func audit() -> void:
	root.size = Vector2i(1280, 720)
	var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	var model = Session.new(data)
	var stage = Stage.new()
	root.add_child(stage)
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stage.configure(data, model)
	stage.set_process(false)
	var after := "--after" in OS.get_cmdline_user_args()
	var furniture := "--furniture" in OS.get_cmdline_user_args()
	var finishes := "--finishes" in OS.get_cmdline_user_args()
	var folder := ProjectSettings.globalize_path("res://../../output/loading-contact-20261127/" + ("finishes" if finishes else "after" if after else "before"))
	DirAccess.make_dir_recursive_absolute(folder)
	var count := 0
	for actor in data.actors:
		for skill in data.scenes:
			if furniture and skill.id not in ["medicine", "persuasion", "investigation"]: continue
			var times := [13.0] if finishes else [-1.0, -2.0, -3.0, 1.4, 1.63, 2.25, 2.9, 3.5, 4.15, 4.8, 5.5, 10.0]
			for natural in [20, 1]:
				model.begin(skill.id, "Auditoría · " + data.actors[actor].label)
				model.entry.participants = [actor]
				model.entry.variant = "owl"
				stage.role_clocks.clear()
				stage.clock = 0
				for elapsed in times:
					if natural == 1 and elapsed < 0: continue
					model.entry.rolls.clear()
					if elapsed >= 0:
						model.entry.rolls[actor] = {"natural":natural, "total":natural, "at":Time.get_ticks_msec()}
					stage.clock = 0.4 + absf(elapsed + 1) * 0.31 if elapsed < 0 else 1.4 + elapsed
					stage.override_elapsed = elapsed
					var label := "%s-%s-%d-%d" % [actor, skill.id, natural, roundi(elapsed * 100)]
					if await capture(stage, folder, label, false) != OK: quit(1); return
					count += 1
	if finishes:
		print("LOADING_CONTACT settled captures: ", count)
		quit()
		return
	var samples := [
		["mike", "medicine", 20, -1.0, "medicine"],
		["mike", "medicine", 20, 4.15, "medicine-action"],
		["mike", "persuasion", 20, 4.15, "handshake"],
		["maria", "animal-handling", 20, 4.8, "horse"],
		["mia", "athletics", 20, 2.9, "takeoff"],
		["mia", "acrobatics", 20, 3.5, "rope"],
		["maria", "performance", 20, 4.15, "audience"],
		["mike", "investigation", 20, 4.8, "mechanism"],
	]
	for item in samples:
		if furniture and item[1] not in ["medicine", "persuasion", "investigation"]: continue
		model.begin(item[1], "Auditoría · " + data.actors[item[0]].label)
		model.entry.participants = [item[0]]
		if item[3] >= 0: model.entry.rolls[item[0]] = {"natural":item[2], "total":item[2], "at":Time.get_ticks_msec()}
		stage.role_clocks.clear()
		stage.clock = 0.4
		stage.override_elapsed = item[3]
		if await capture(stage, folder, "full-" + item[4], true) != OK: quit(1); return
		count += 1
	if furniture:
		print("LOADING_CONTACT furniture captures: ", count)
		quit()
		return
	for variant in ["goblin", "kobold", "mouse", "mia", "mike", "maria"]:
		var protagonist := "mia" if variant != "mia" else "maria"
		for natural in [20, 1]:
			model.begin("perception", "Auditoría de Percepción")
			model.entry.participants = [protagonist]
			model.entry.variant = variant
			model.entry.rolls[protagonist] = {"natural":natural, "total":natural, "at":Time.get_ticks_msec()}
			stage.role_clocks.clear()
			stage.clock = 0.4
			stage.override_elapsed = 4.15
			if await capture(stage, folder, "%s-%d" % [variant, natural], false) != OK: quit(1); return
			count += 1
	print("LOADING_CONTACT captures: ", count)
	quit()
