extends SceneTree
var passed:=0
var failures: Array[String]=[]
func check(value: bool,label: String) -> void:
	if value: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func _initialize() -> void: run.call_deferred()
func run() -> void:
	root.size=Vector2i(1280,720)
	var main:=load("res://scenes/main.tscn").instantiate() as Node3D
	var camera:=main.find_child("TacticalCamera",true,false) as Camera3D
	camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(4): await process_frame
	var ui:=main.find_child("VttRoleUi",true,false)
	check(ui!=null and ui.combat_controller!=null,"native controller is wired in actual map")
	if ui==null or ui.combat_controller==null: quit(1); return
	ui.clock_running=false; ui.set_role("dm")
	var combat=ui.combat_controller
	check(combat.rules.actors.has("zombie") and combat.token("zombie")!=null,"existing zombie is registered in scene combat")
	combat.add_silverfarben(); combat.add_anteros()
	check(combat.rules.actors.has("aoife") and combat.token("aoife")!=null,"Silverfarben added with collision-checked placement")
	check(combat.rules.actors.has("anteros-temple") and combat.token("anteros-temple")!=null,"Anteros added with collision-checked placement")
	if not combat.rules.actors.has("aoife") or not combat.rules.actors.has("anteros-temple"): main.free(); quit(1); return
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	var hero: Node3D=combat.token("aoife"); var enemy: Node3D=combat.token("anteros-temple")
	check(hero.char_profile.clips.has("spell_fog") and hero.char_profile.clips.has("defeated"),"Silverfarben has imported fog and fallen sprite clips")
	check(enemy.char_profile.clips.has("attack_arrow"),"Anteros has imported ranged sprite clip")
	ui.select_player_character("aoife"); ui.set_role("player")
	check(combat.acting_id()=="aoife","dynamic fourth character can be selected")
	check(not combat._is_known("anteros-temple"),"uninvestigated enemy stats stay private")
	combat.rules.actors["anteros-temple"].known_by.append("aoife")
	check(combat._is_known("anteros-temple"),"DM can register knowledge for Silverfarben alone")
	ui.select_player_character("mia"); check(not combat._is_known("anteros-temple"),"one character's investigation does not expose stats to another")
	ui.select_player_character("aoife"); combat.rules.actors["anteros-temple"].known_by.clear()
	ui.set_role("dm"); combat.rules.start(["aoife","anteros-temple"])
	check(combat.rules.initiative_pending and combat.timeline.visible,"native timeline waits for physical totals")
	check(ui.player_hud.status_chip.text=="Iniciativa pendiente" and not combat.wheel.visible,"no actor is announced as active before every initiative is entered")
	combat.rules.submit_initiative("aoife",20); combat.rules.submit_initiative("anteros-temple",10)
	combat._after_start(); ui.set_role("player")
	combat.category=""; combat.wheel_open=true; combat.refresh()
	check(combat.wheel.find_children("CombatIcon_*","Button",true,false).size()==4,"corner wheel displays all four main categories")
	combat.category="other"; combat.page=20; combat.refresh()
	check(combat.page==3,"wheel page clamps to actual action count including torch")
	combat.category=""; combat.page=0; combat.refresh()
	await process_frame; await process_frame
	check(combat.timeline.position.x>57 and combat.timeline.position.x+combat.timeline.size.x<combat.layer.get_viewport_rect().size.x-57,"top timeline is fully on screen with margins")
	check(ui.player_hud.end_turn_btn.is_visible_in_tree() and Rect2(Vector2.ZERO,combat.layer.get_viewport_rect().size).encloses(ui.player_hud.end_turn_btn.get_global_rect()),"end-turn button remains fully on screen inside its dock")
	ui.player_hud.set_interaction_prompt("Atravesar la puerta hacia la cubierta principal",true)
	await process_frame; await process_frame
	check(Rect2(Vector2.ZERO,combat.layer.get_viewport_rect().size).encloses(ui.player_hud.end_turn_btn.get_global_rect()),"changing the nearby interaction prompt cannot push end-turn off screen")
	ui.player_hud.set_interaction_prompt("",false)
	ui.player_hud.end_turn_btn.pressed.emit()
	check(combat.rules.current_id()=="anteros-temple","player can finish their turn using the actual button")
	combat.rules.next_turn("anteros-temple")
	check(combat.timeline.get_child_count()==7,"timeline contains at most seven visible previews")
	combat.initiative_position="right"; combat.refresh()
	check(combat.timeline.vertical,"timeline can use right vertical placement")
	combat.initiative_position="top"; combat.refresh()
	check(not combat.timeline.vertical,"default top position avoids action wheel")
	combat.choose_action("fire-bolt"); combat.declare_target("anteros-temple")
	await process_frame; await process_frame
	check(Rect2(Vector2.ZERO,combat.layer.get_viewport_rect().size).encloses(combat.prompt.get_global_rect()),"dice dialog is fully visible and centered")
	check(combat.rules.pending.get("kind","")=="attack" and hero.action_anim_name!="spell","no cast before attack die")
	combat.rules.submit(19,"aoife","integration-hit")
	check(combat.rules.pending.get("kind","")=="damage" and hero.action_anim_name!="spell","no cast before damage die")
	combat.rules.submit(4,"aoife","integration-damage")
	check(hero.action_anim_name=="spell" and combat.rules.actors["anteros-temple"].hp==67,"final resolution animates and applies damage once")
	combat.rules.next_turn("aoife"); combat.rules.next_turn("anteros-temple")
	combat.choose_action("fog-cloud"); var point: Vector3=hero.global_position+hero.get_parent().global_basis*Vector3(1.5,0,0); combat.declare_target("",point)
	check(combat.rules.pending.get("kind","")=="guided","fog requires DM confirmation")
	combat.rules.submit(1,"aoife","integration-fog")
	await process_frame
	check(combat.visuals.clouds.has("aoife") and combat.visuals.clouds.aoife.get_child_count()==18,"fog uses transparent world sprites rather than an opaque square")
	ui.set_role("dm")
	var save_path:=ProjectSettings.globalize_path("res://../../output/godot-combat-integration-"+("retiro" if ui.is_retreat else "pecio")+".save")
	combat.save_local(save_path); var saved_position:=hero.position; hero.position+=Vector3(9,0,0)
	combat.restore_local(save_path)
	check(hero.position.is_equal_approx(saved_position) and combat.rules.effects.size()==1,"isolated save restores combat position and concentration")
	combat.rules.end_concentration("aoife"); await process_frame
	check(combat.visuals.clouds.is_empty(),"ending concentration removes actual fog nodes")
	combat.rules.damage("anteros-temple",100,"radiante"); combat.rules._auto_end(); await process_frame
	check(not combat.rules.active and enemy.is_visible_in_tree() and enemy.is_defeated,"last enemy ends combat and remains visible as a body")
	check(combat.visuals.pools.has("anteros-temple") and not enemy.is_physics_processing(),"fallen body has overlay and no blocking live physics")
	combat.rules.damage("aoife",4,"fuerza")
	combat.rules.declare("mia","healing-word","aoife"); combat.rules.submit(2,"mia","integration-healing")
	await create_timer(.3).timeout
	check(combat.rules.actors.aoife.hp==8 and hero.action_anim_name!="hit_arcane","healing restores HP without playing a wound reaction")
	combat.rules.damage("aoife",9,"cortante"); combat.rules.start(["aoife","zombie"])
	combat.rules.submit_initiative("aoife",20); combat.rules.submit_initiative("zombie",10); combat.rules.submit(20,"aoife","native-death-recovery")
	check(ui.player_hud.hp_btn.text.contains("1/8") and combat.can_move(hero),"natural-twenty death recovery updates visible HP and enables movement immediately")
	ui.set_role("projector"); combat.refresh()
	check(not combat.wheel.visible and not combat.prompt.visible and not combat.budget.visible,"projector excludes private actions and dice controls")
	print(JSON.stringify({"suite":"integrated-combat","project":"retiro" if ui.is_retreat else "pecio","passed":passed,"failed":failures.size(),"errors":failures}))
	main.free(); quit(0 if failures.is_empty() else 1)
