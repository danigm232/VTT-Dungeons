extends SceneTree
const Session = preload("res://loading/loading_session.gd")
class PilotStage:
	extends "res://loading/loading_stage.gd"
	var frames: Array = []
	var definition: Dictionary
	func _actor(character: String, pos: Vector2, motion: Dictionary, selected: Dictionary = {}) -> void:
		var index = int(clock * 4) % 8
		var texture = frames[index]
		var factor = float(data.actors[character].height) / definition.referenceHeight
		_transform(pos + Vector2(motion.x, motion.y))
		draw_texture_rect(texture, Rect2(-Vector2(definition.pivot[0],definition.pivot[1]) * texture.get_size() * factor, texture.get_size() * factor), false)
func _initialize(): run.call_deferred()
func run():
	root.size = Vector2i(1280,720)
	var stage = PilotStage.new()
	root.add_child(stage)
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	var session = Session.new(data)
	stage.definition = JSON.parse_string(FileAccess.get_file_as_string("res://loading/review-v6/clip.json"))
	for i in range(8):
		var image = Image.load_from_file("res://loading/review-v6/%d.webp" % i)
		stage.frames.append(ImageTexture.create_from_image(image))
	stage.configure(data,session)
	stage.set_process(false)
	session.begin("arcana", "Mike · muestra de identidad corregida")
	session.entry.participants = ["mike"]
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://../../output/loading-identity-v6"))
	for i in range(8):
		stage.clock = i / 4.0
		stage.queue_redraw()
		await process_frame
		await process_frame
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../../output/loading-identity-v6/mike-talk-%d.png" % i))
	print("NATIVE_IDENTITY_PILOT 8 frames rendered")
	quit()
