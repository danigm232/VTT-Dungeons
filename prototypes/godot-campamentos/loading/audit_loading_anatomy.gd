extends SceneTree

const Stage = preload("res://loading/loading_stage.gd")
const Session = preload("res://loading/loading_session.gd")

class InspectionStage extends Stage:
	var source_folder: String
	var drawn: Array[int] = []

	func load_art() -> void:
		super()
		atlases[7] = ImageTexture.create_from_image(Image.load_from_file(source_folder.path_join("art/atlas-7.webp")))

	func _frame(id: int, scale: float, center: bool = false, tint: Color = Color.WHITE, flatten: float = 1.0) -> void:
		drawn.append(id)
		super(id, scale, center, tint, flatten)

func _initialize() -> void:
	run.call_deferred()

func verify_installed() -> void:
	var out := ProjectSettings.globalize_path("res://../../output/loading-anatomy-20261127/candidate")
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	var expected = JSON.parse_string(FileAccess.get_file_as_string(out.path_join("catalog.json")))
	if data.get("anatomyRegistry") != expected.get("anatomyRegistry"):
		printerr("Installed loading catalog revision differs")
		quit(1)
		return
	var actual := (load("res://loading/art/atlas-7.webp") as Texture2D).get_image()
	var source := Image.load_from_file(out.path_join("art/atlas-7.webp"))
	var ids: Array = data.anatomyRegistry.frames
	for id in ids:
		var r: Array = data.frames[int(id)].region
		var rect := Rect2i(r[0], r[1], r[2], r[3])
		var a := actual.get_region(rect)
		var b := source.get_region(rect)
		a.convert(Image.FORMAT_RGBA8)
		b.convert(Image.FORMAT_RGBA8)
		var pixels := a.get_data()
		var expected_pixels := b.get_data()
		# Godot's texture importer fills the RGB of transparent edge pixels.
		for j in range(3, pixels.size(), 4):
			if pixels[j] != expected_pixels[j]:
				printerr("Imported texture alpha differs in frame ", id)
				quit(1)
				return
	print("LOADING_ANATOMY imported frames verified: ", ids.size())
	quit()

func run() -> void:
	if "--installed" in OS.get_cmdline_user_args():
		verify_installed()
		return
	root.size = Vector2i(1280, 720)
	var out := ProjectSettings.globalize_path("res://../../output/loading-anatomy-20261127")
	var checks := 0
	var revision := ""
	for version in ["baseline", "candidate"]:
		var source := out.path_join(version)
		var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(source.path_join("catalog.json")))
		var model = Session.new(data)
		var stage := InspectionStage.new()
		stage.source_folder = source
		root.add_child(stage)
		stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		stage.configure(data, model)
		stage.set_process(false)
		stage.ground_contacts = JSON.parse_string(FileAccess.get_file_as_string(source.path_join("ground_contacts.json"))).frames
		var captures := out.path_join("native-" + version)
		DirAccess.make_dir_recursive_absolute(captures)
		if version == "candidate": revision = data.anatomyRegistry.revision
		for item in [[664, 20, -1.0], [665, 20, 1.4], [666, 20, 5.2], [667, 20, 7.8], [668, 20, 13.0], [669, 1, 5.7], [670, 1, 8.2], [671, 1, 13.0]]:
			model.begin("medicine", "Auditoría · Mike")
			model.entry.participants = ["mike"]
			if item[2] >= 0: model.entry.rolls.mike = {"natural":item[1], "total":item[1], "at":Time.get_ticks_msec()}
			stage.clock = 0.4
			stage.role_clocks.clear()
			stage.drawn.clear()
			stage.override_elapsed = item[2]
			stage.queue_redraw()
			await process_frame
			await process_frame
			RenderingServer.force_draw(false)
			var target := captures.path_join("%d.png" % item[0])
			if item[0] not in stage.drawn or root.get_texture().get_image().save_png(target) != OK:
				printerr("Expected actual Medicine frame ", item[0], "; got ", stage.drawn)
				quit(1)
				return
			checks += 1
		stage.free()
	var proof := FileAccess.open(out.path_join("native-validation.json"), FileAccess.WRITE)
	proof.store_string(JSON.stringify({"scope":"loading-anatomy-20261127","revision":revision,"passed":true,"checks":checks,"errors":[],"renderer":"Godot Forward+"}, "  "))
	print("LOADING_ANATOMY frames visibly reached: ", checks)
	quit()
