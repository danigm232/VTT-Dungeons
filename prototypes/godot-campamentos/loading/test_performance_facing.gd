extends SceneTree
const Stage = preload("res://loading/loading_stage.gd")
const Session = preload("res://loading/loading_session.gd")
func _initialize(): run.call_deferred()
func run():
	root.size = Vector2i(1280,720)
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	var model = Session.new(data)
	var stage = Stage.new()
	root.add_child(stage)
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	stage.configure(data,model)
	stage.set_process(false)
	var folder = "res://../../output/performance-facing-20261119/" + ("before" if "--before" in OS.get_cmdline_user_args() else "after")
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	for actor in data.actors:
		model.begin("performance","Interpretación · revisión")
		model.entry.participants = [actor]
		model.entry.rolls[actor] = {"natural":20,"total":20,"at":Time.get_ticks_msec()}
		for i in range(8):
			stage.clock = (i + 0.05) / 4.4
			stage.override_elapsed = 13.0
			stage.queue_redraw()
			await process_frame
			await process_frame
			RenderingServer.force_draw(false)
			root.get_texture().get_image().save_png(folder.path_join(actor + "-" + str(i) + ".png"))
	print("PERFORMANCE_CAPTURE 24 poses captured")
	quit()
