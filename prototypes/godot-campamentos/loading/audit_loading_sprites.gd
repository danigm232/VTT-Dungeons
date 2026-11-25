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
	var folder = "res://../../output/loading-sprite-audit-20261124/" + ("after" if "--after" in OS.get_cmdline_user_args() else "before")
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder))
	for actor in data.actors:
		for skill in data.scenes:
			if "--intimidation-only" in OS.get_cmdline_user_args() and skill.id != "intimidation": continue
			for state in ["ambient","success","failure"]:
				model.begin(skill.id,"Auditoría · " + data.actors[actor].label)
				model.entry.participants = [actor]
				if state != "ambient": model.entry.rolls[actor] = {"natural":20 if state == "success" else 1,"total":20 if state == "success" else 1,"at":Time.get_ticks_msec()}
				stage.clock = 0.4
				stage.role_clocks.clear()
				stage.override_elapsed = -1 if state == "ambient" else 4.0
				stage.queue_redraw()
				await process_frame
				await process_frame
				RenderingServer.force_draw(false)
				root.get_texture().get_image().save_png(folder.path_join(actor + "-" + skill.id + "-" + state + ".png"))
	print("LOADING_AUDIT selected native samples captured")
	quit()
