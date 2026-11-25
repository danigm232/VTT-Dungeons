extends SceneTree
const Session = preload("res://loading/loading_session.gd")
const Stage = preload("res://loading/loading_stage.gd")
var passed: int = 0
var failures: Array = []
func _initialize() -> void: _run.call_deferred()
func check(value: bool, message: String) -> void:
	if value: passed += 1
	else:
		failures.append(message)
		printerr("FAIL: ", message)
func _run() -> void:
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	check(Stage.bandit_escape_frame(0.1) == 14 and Stage.bandit_escape_frame(0.7) == 15, "Bandit escape keeps its own hooded source row")
	var neutral = Stage.sample([], 0)
	check(Stage.prop_position({"art":"rope","x":324,"y":169}, neutral).y == 169, "Rope and actor share the elevated support")
	check(Stage.prop_position({"art":"table","x":400,"y":180}, neutral).y == 202, "Furniture stays on the floor")
	check(Stage.prop_position({"art":"crystal","x":400,"y":118}, neutral).y == 118, "Magical levitation stays intentional")
	var model = Session.new(data)
	check(data.scenes.size() == 18, "18 skill definitions")
	check(data.frames.size() >= 500, "Original authored frames exported")
	var tones = preload("res://loading/performance_tones.gd")
	check(tones.make(true).get_length() > 0.5 and tones.make(false).get_length() > 0.35, "Original demonstration timbres are valid native audio")
	model.begin("history", "Prueba")
	check(model.entry.participants.is_empty(), "No invented player on empty projector")
	check(model.join("phone-a", "maria"), "Trinity joins")
	check(model.join("phone-b", "mike"), "Mike joins")
	check(not model.join("intruder", "maria"), "Cannot claim occupied character")
	for i in range(40):
		model.begin("perception", "Prueba")
		check(not model.entry.participants.has("mia") and model.entry.variant != "mia", "Absent Mia never appears")
	var selected = model.entry.participants[0]
	var owner = "phone-a" if selected == "maria" else "phone-b"
	var other = "phone-b" if owner == "phone-a" else "phone-a"
	check(not model.roll(other, model.entry.id), "Observer cannot roll")
	check(not model.roll(owner, "stale"), "Stale entry denied")
	check(model.roll(owner, model.entry.id, 12), "Owner can roll")
	check(not model.roll(owner, model.entry.id), "Only one resolved roll")
	check(model.success(selected, 12), "Equal DC succeeds")
	check(not model.continue_client(owner, model.entry.id), "Cannot continue before real load")
	model.projector_ready = true
	for c in model.clients.values(): c.ready = true
	check(model.continue_client(owner, model.entry.id), "Prepared participant continues")
	check(not model.complete(), "Wait for other connected player")
	model.leave(other)
	check(model.complete(), "Disconnected observer cannot deadlock exit")
	model = Session.new(data)
	model.join("phone-a", "maria")
	model.join("phone-b", "mike")
	model.begin("performance", "Duelo", true)
	for id in model.clients: check(model.roll(id, model.entry.id, 15), "Contest participant rolls")
	check(model.entry.resolved >= 0, "Contest resolves only after both rolls")
	check(model.success("maria", 12) and model.success("mike", 12), "Tie retains both demonstrations")
	var stage = Stage.new()
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(stage)
	stage.configure(data, model)
	if DisplayServer.get_name() != "headless":
		for atlas_index in range(int(data.atlasCount)):
			var original = Image.load_from_file("res://loading/art/atlas-%d.webp" % atlas_index)
			var imported = stage.atlases[atlas_index].get_image()
			var matches: int = 0
			var samples: int = 0
			for y in range(16, 2048, 32):
				for x in range(16, 2048, 32):
					var a = original.get_pixel(x, y)
					if a.a < 0.95: continue
					var b = imported.get_pixel(x, y)
					samples += 1
					if absf(a.r - b.r) + absf(a.g - b.g) + absf(a.b - b.b) < 0.04: matches += 1
			check(samples > 0 and float(matches) / samples > 0.995, "Imported GPU atlas matches generated regions " + str(atlas_index))
	stage.set_process(false)
	var capture = "--loading-capture" in OS.get_cmdline_user_args()
	var output = ProjectSettings.globalize_path("res://../../output/godot-skill-loading-20261114")
	if capture: DirAccess.make_dir_recursive_absolute(output)
	for skill in data.scenes:
		for character in data.actors:
			for ok in [true, false]:
				model.begin(skill.id, "Destino · Prueba nativa")
				model.entry.participants = [character]
				model.entry.rolls[character] = {"natural": 20 if ok else 1, "total": 20 if ok else 1, "at": Time.get_ticks_msec()}
				stage.clock = 0.4
				stage.override_elapsed = 13000.0 / 1000.0
				stage.queue_redraw()
				await process_frame
				await process_frame
				check(stage._selection(character).has("clip"), "Native outcome " + skill.id + "/" + character + "/" + str(ok))
				if capture and character == "mia":
					RenderingServer.force_draw(false)
					root.get_texture().get_image().save_png(output.path_join(skill.id + ("-success.png" if ok else "-failure.png")))
				if capture and character == "mia" and ok:
					model.entry.rolls.clear()
					stage.override_elapsed = -1
					stage.role_clocks.clear()
					stage.clock = 0.0
					stage.queue_redraw()
					await process_frame
					stage.clock = 0.4
					stage.queue_redraw()
					await process_frame
					RenderingServer.force_draw(false)
					root.get_texture().get_image().save_png(output.path_join(skill.id + "-ambient.png"))
	for skill in ["acrobatics", "performance"]:
		model.begin(skill, "Duelo de demostración", true)
		check(model.entry.participants.size() == 2, "Two contest actors")
		model.roll("phone-a", model.entry.id, 20)
		check(model.entry.resolved == -1, "Wait for both dice")
		model.roll("phone-b", model.entry.id, 1)
		stage.override_elapsed = 13
		stage.clock = 0.4
		stage.queue_redraw()
		await process_frame
		if capture:
			RenderingServer.force_draw(false)
			root.get_texture().get_image().save_png(output.path_join("contest-" + skill + ".png"))
	stage.queue_free()
	await process_frame
	print("LOADING_TESTS ", passed, " passed; ", failures.size(), " failed")
	quit(0 if failures.is_empty() else 1)
