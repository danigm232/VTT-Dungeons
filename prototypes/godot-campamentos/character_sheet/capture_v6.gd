extends SceneTree
var measurements: Dictionary={}
func _initialize() -> void: _run.call_deferred()
func shot(file: String,panel) -> void:
	await create_timer(.8).timeout
	for i in range(6): await process_frame
	await RenderingServer.frame_post_draw
	var output=ProjectSettings.globalize_path("res://../../output/godot-character-sheet-v6-20261117/")
	root.get_texture().get_image().save_png(output.path_join(file))
	var info={"window":str(panel.get_global_rect()),"body":str(panel.scroll.get_global_rect()),"general_scroll":panel.scroll.scroll_vertical,"content_min":str(panel.content.get_combined_minimum_size())}
	for key in ["SummaryTop","SummaryBottom","SummarySkills","SummaryMagic","SummaryTraits"]:
		var node=panel.find_child(key,true,false)
		if node: info[key]=str(node.get_global_rect())
	var stage=panel.find_child("CharacterStage",true,false)
	if stage and is_instance_valid(stage.actor_view):
		info["stage_camera"]=str(stage.actor_view.camera.position); info["stage_size"]=stage.actor_view.camera.size; info["fitted_height"]=stage.actor_view.get_meta("fitted_visible_height",0)
	measurements[file]=info
func _run() -> void:
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	var scene="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var main=load(scene).instantiate(); root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200; ui.set_env_time("day"); ui.set_env_weather("clear")
	var panel=ui.player_hud.sheet_modal
	for id in ["mia","maria","mike"]:
		ui.selected_actor_id=id; ui.refresh_all(); ui.player_hud.open_modal("sheet"); await shot(id+".png",panel)
	ui.selected_actor_id="maria"; ui.refresh_all(); ui.player_hud.open_modal("sheet"); panel.select_tab("spells"); await shot("empty-spells.png",panel)
	ui.selected_actor_id="mia"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	panel.show_action(ui.combat_controller.rules.action_for("mia","mace")); await shot("action.png",panel); panel.detail.hide()
	ui.selected_actor_id="mike"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	for tab in ["combat","spells","inventory","history","edit"]:
		panel.select_tab(tab); await shot(tab+".png",panel)
	panel.select_tab("summary"); root.size=Vector2i(1366,768); root.content_scale_size=Vector2i(1366,768); await shot("compact.png",panel)
	for page in ["combat","spells","inventory","history"]:
		panel.select_tab(page); await shot("compact-"+page+".png",panel)
	panel.select_tab("summary"); root.size=Vector2i(1920,1080); root.content_scale_size=Vector2i(1920,1080); await shot("wide.png",panel)
	for page in ["combat","spells","inventory","history"]:
		panel.select_tab(page); await shot("wide-"+page+".png",panel)
	panel.select_tab("summary")
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	ui.selected_actor_id="mia"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	var state=ui.combat_controller.rules.actors.mia; var saved=state.duplicate(true)
	state.hp=7; state.temp_hp=3; state.resources["spell-slot-1"].current=1; state.concentration="Bendición"; state.conditions=["envenenada"]
	ui.refresh_all(); panel.refresh_view(); await shot("dynamic-state.png",panel)
	root.size=Vector2i(1366,768); root.content_scale_size=Vector2i(1366,768); await shot("dynamic-compact.png",panel)
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	state.hp=saved.hp; state.temp_hp=saved.get("temp_hp",0); state.resources=saved.get("resources",{}).duplicate(true); state.concentration=saved.get("concentration",""); state.conditions=saved.get("conditions",[]).duplicate(); ui.refresh_all()
	panel.select_tab("summary"); panel.show_action(ui.combat_controller.rules.action_for("mia","healing-word")); await shot("healing-available.png",panel)
	state.resources["spell-slot-1"].current=0; ui.refresh_all(); panel.refresh_view(); await shot("healing-depleted.png",panel)
	state.resources=saved.get("resources",{}).duplicate(true); ui.refresh_all(); panel.detail.hide()
	ui.player_hud.open_modal("sheet"); panel.select_tab("inventory"); await create_timer(.2).timeout
	if not ui.inventory_bridge.actual_held("torch"): ui.inventory_bridge.prepare("torch","take")
	ui.player_hud.close_modals(); await create_timer(1.5).timeout
	ui.player_hud.open_modal("sheet"); panel.select_tab("inventory"); await shot("inventory-equipped.png",panel)
	ui.inventory_bridge.prepare("torch","store"); ui.player_hud.close_modals(); await create_timer(1.5).timeout
	ui.player_hud.open_modal("inventory"); await shot("independent-backpack.png",panel)
	ui.player_hud.close_modals(); ui.set_role("dm"); ui.selected_actor_id="maria"; ui.player_hud.open_modal("sheet"); await shot("dm.png",panel)
	var file=FileAccess.open(ProjectSettings.globalize_path("res://../../output/godot-character-sheet-v6-20261117/layout.json"),FileAccess.WRITE); file.store_string(JSON.stringify(measurements,"  "))
	print("CHARACTER SHEET V6 CAPTURE DONE"); quit()
