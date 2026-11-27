extends SceneTree
const Session = preload("res://loading/loading_session.gd")
class CandidateStage:
	extends "res://loading/loading_stage.gd"
	var checked_atlases: int = 0
	func load_art() -> void:
		var folder = ProjectSettings.globalize_path("res://../../output/loading-identity-v6/candidate/art")
		for i in range(int(data.atlasCount)):
			var pixels = Image.load_from_file(folder.path_join("atlas-%d.webp" % i))
			assert(not pixels.is_empty() and pixels.get_width() == 2048)
			atlases.append(ImageTexture.create_from_image(pixels))
			checked_atlases += 1
		for name in ["floor", "chasm"]: plates[name] = ImageTexture.create_from_image(Image.load_from_file(folder.path_join(name + ".webp")))
func _initialize(): run.call_deferred()
func run():
	root.size = Vector2i(1280,720)
	var data = JSON.parse_string(FileAccess.get_file_as_string(ProjectSettings.globalize_path("res://../../output/loading-identity-v6/candidate/catalog.json")))
	var model = Session.new(data)
	var stage = CandidateStage.new()
	root.add_child(stage)
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stage.configure(data,model)
	stage.set_process(false)
	var folder = ProjectSettings.globalize_path("res://../../output/loading-identity-v6/native")
	DirAccess.make_dir_recursive_absolute(folder)
	var captures: int = 0
	for actor in data.identityCoverage:
		for skill in data.scenes:
			if actor != "mike" and skill.id != "persuasion": continue
			for state in ["ambient","success","failure","settledSuccess","settledFailure"]:
				model.begin(skill.id,"Auditoría · " + data.actors[actor].label)
				model.entry.participants = [actor]
				if state != "ambient": model.entry.rolls[actor] = {"natural":20 if state in ["success","settledSuccess"] else 1,"total":20 if state in ["success","settledSuccess"] else 1,"at":Time.get_ticks_msec()}
				stage.clock = 0.4
				stage.override_elapsed = -1 if state == "ambient" else 13 if state.begins_with("settled") else 4
				stage.role_clocks.clear()
				stage.queue_redraw()
				await process_frame
				await process_frame
				RenderingServer.force_draw(false)
				var error = root.get_texture().get_image().save_png(folder.path_join(actor + "-" + skill.id + "-" + state + ".png"))
				if error != OK: quit(1); return
				captures += 1
	model.begin("arcana","Dado del jugador")
	model.entry.participants = ["mike"]
	stage.override_elapsed = -1
	var die = load("res://loading/loading_d20_button.gd").new()
	root.add_child(die)
	die.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	die.offset_left = -48
	die.offset_top = -104
	die.offset_right = 48
	die.offset_bottom = -8
	die.set_process(false)
	for sample in [[1250,"d20-rolling-a"],[1650,"d20-rolling-b"],[2600,"d20-result"]]:
		die.set_roll_state({"natural":17,"at":1000},false,sample[0])
		stage.queue_redraw()
		await process_frame
		await process_frame
		RenderingServer.force_draw(false)
		assert(root.get_texture().get_image().save_png(folder.path_join(sample[1]+".png")) == OK)
		captures += 1
	assert(die.text == "⬡ 17" and not die.is_tumbling())
	var report = {"scope":"loading-identities-v6","revision":data.identityRegistry.revision,"passed":true,"checks":captures + stage.checked_atlases + 1,"captures":captures,"atlases":stage.checked_atlases,"errors":[],"renderer":"Godot native Vulkan Forward+; see loading-v6-candidate-review.log"}
	var file = FileAccess.open(ProjectSettings.globalize_path("res://../../output/loading-identity-v6/native-validation.json"),FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"  "))
	print("IDENTITY_CANDIDATE Native phase review captured")
	quit()
