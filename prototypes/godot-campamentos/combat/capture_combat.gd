extends SceneTree
var folder: String
var project: String
var records: Array=[]
func _initialize() -> void: run.call_deferred()
func shot(label: String,camera: Camera3D) -> void:
	for i in range(3): await process_frame
	RenderingServer.force_draw(false); await process_frame
	root.get_texture().get_image().save_png(folder.path_join(project+"-"+label+".png"))
	records.append({"image":project+"-"+label+".png","camera":str(camera.global_transform),"orthographic_size":camera.size,"pixels":[root.size.x,root.size.y],"kind":"integrated Godot render"})
func run() -> void:
	root.size=Vector2i(1280,720)
	var main:=load("res://scenes/main.tscn").instantiate() as Node3D
	var camera:=main.find_child("TacticalCamera",true,false) as Camera3D
	camera.persist_preferences=false
	root.add_child(main); current_scene=main
	print("CAPTURE main ready")
	for i in range(4): await process_frame
	var ui:=main.find_child("VttRoleUi",true,false)
	if ui==null or ui.combat_controller==null: quit(1); return
	var combat=ui.combat_controller
	project="retiro" if ui.is_retreat else "pecio"
	folder=ProjectSettings.globalize_path("res://../../output/godot-combat-20261115/captures")
	DirAccess.make_dir_recursive_absolute(folder)
	ui.clock_running=false; ui.audio_muted=true; ui.set_role("dm")
	combat.add_silverfarben(); combat.add_anteros()
	print("CAPTURE combatants ready")
	if not combat.rules.actors.has("aoife") or not combat.rules.actors.has("anteros-temple"): printerr("Capture: safe placement failed"); quit(1); return
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	ui.select_player_character("aoife"); combat.rules.start(["aoife","anteros-temple"])
	combat.rules.submit_initiative("aoife",20); combat.rules.submit_initiative("anteros-temple",10)
	ui.set_role("player"); combat.wheel_open=true; combat.category=""; combat.refresh(); combat._fit_encounter()
	camera.apply_view_state(camera.get_view_state(),true); camera.set_process(false)
	Engine.time_scale=0
	# Same current scene/state/frame; only retained legacy HUD vs native HUD changes.
	combat.layer.hide(); ui.player_hud.refresh()
	await shot("before-retained-hud",camera)
	combat.layer.show(); combat.refresh()
	await shot("after-native-hud",camera)
	combat.choose_action("fire-bolt"); combat.declare_target("anteros-temple")
	await shot("physical-dice-cancel",camera)
	combat.rules.cancel(); combat.armed.clear()
	var hero: Node3D=combat.token("aoife")
	combat.choose_action("fog-cloud"); combat.declare_target("",hero.global_position+hero.get_parent().global_basis*Vector3(1.5,0,0)); combat.rules.submit(1,"aoife","capture-fog")
	await shot("fog-volume",camera)
	combat.rules.end_concentration("aoife")
	combat.rules.damage("anteros-temple",100,"radiante"); combat.rules._auto_end()
	await shot("fallen-body",camera)
	FileAccess.open(folder.path_join(project+"-originals.json"),FileAccess.WRITE).store_string(JSON.stringify(records,"\t"))
	print("COMBAT CAPTURES ",project," ",records.size())
	Engine.time_scale=1; main.free(); quit()
