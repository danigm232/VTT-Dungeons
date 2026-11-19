extends SceneTree
const Layout=preload("res://combat/radial_layout.gd")
const Targeting=preload("res://combat/action_targeting.gd")
const Catalogue=preload("res://combat/combat_catalogue.gd")
var passed:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	if ok: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func _initialize() -> void: run.call_deferred()
func run() -> void:
	for viewport in [Vector2(1280,720),Vector2(720,1280),Vector2(800,600)]:
		for normalized in [Vector2(.08,.92),Vector2(.92,.92),Vector2(.08,.15),Vector2(.92,.15),Vector2(.08,.5),Vector2(.92,.5)]:
			var origin: Vector2=viewport*normalized
			var layout:=Layout.arrange(origin,viewport,["Ataques","Trucos","Conjuros","Otras"])
			check(layout.points.size()==4,"four inward slots "+str(origin))
			for i in range(4):
				var rect:=Rect2(layout.points[i]-Vector2(30,30),Vector2(60,60))
				check(Rect2(Vector2.ZERO,viewport).encloses(rect),"slot inside viewport "+str(origin)+str(i))
				for j in range(i): check(not rect.intersects(Rect2(layout.points[j]-Vector2(30,30),Vector2(60,60))),"separate touch targets "+str(origin)+str(i)+str(j))
	check(Layout.arc(Vector2(1200,660),Vector2(1280,720))==Vector2(PI,PI*1.5),"bottom-right opens upper-left quarter")
	check(Layout.arc(Vector2(80,660),Vector2(1280,720))==Vector2(PI*1.5,TAU),"bottom-left mirrors upper-right quarter")
	var cone:=Targeting.footprint({"id":"burning-hands"},Vector3.ZERO,Vector3(90,0,0))
	check(cone.size()==3 and is_equal_approx((cone[1]+cone[2]).x*.5,4.5) and is_equal_approx(cone[1].distance_to(cone[2]),4.5),"cone remains 4.5 m long/wide regardless of aim distance")
	var circle:=Targeting.footprint({"id":"fog-cloud"},Vector3.ZERO,Vector3(12,0,4))
	check(circle.size()==64 and is_equal_approx(circle[0].distance_to(Vector3(12,0,4)),6),"fog has a six-metre radius around the chosen point")
	check(Targeting.geometry({"id":"detect-magic"}).placement=="self" and Targeting.mode({"id":"search"})=="point","aura follows caster; searching selects a zone")
	root.size=Vector2i(1280,720)
	var main: Node3D=load("res://scenes/camp_forest_pleamar.tscn").instantiate(); var camera: Camera3D=main.find_child("TacticalCamera",true,false); camera.persist_preferences=false
	root.add_child(main); current_scene=main
	for i in range(5): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); var combat=ui.combat_controller
	ui.clock_running=false; ui.set_role("player"); ui.select_player_character("mia")
	for body in ui.tokens_by_node.values(): body.set_physics_process(false)
	combat.token("mike").global_position=combat.token("mia").global_position+Vector3(1.5,0,0); combat._sync_positions()
	combat.rules.start(["mia","mike"]); combat.rules.submit_initiative("mia",20); combat.rules.submit_initiative("mike",10)
	combat.choose_action("mace")
	check(not combat.prompt.visible and combat.action_tray.visible and combat.wheel.visible,"selecting mace opens no target window and keeps wheel visible")
	check(combat.selected_action_id()=="mace" and combat.target_menu==null,"selection lives on the icon, without creature dropdown")
	for button in combat.wheel.find_children("CombatIcon_*","Button",true,false):
		check(not button.get_global_rect().intersects(ui.player_hud.action_toggle_btn.get_parent().get_parent().get_global_rect()),"wheel icons avoid bottom controls "+button.name)
	combat.choose_action("mace"); check(combat.armed.is_empty() and combat.rules.pending.is_empty(),"same action deselects without spending resources")
	combat.choose_action("mace")
	var click:=InputEventMouseButton.new(); click.pressed=true; click.button_index=MOUSE_BUTTON_LEFT; click.position=camera.unproject_position(combat.token("mike").global_position+Vector3.UP*.8)
	combat._unhandled_input(click)
	check(combat.rules.pending.get("kind","")=="attack" and combat.rules.pending.get("target","")=="mike","map click selects the actual creature directly")
	combat.choose_action("mace"); check(combat.rules.pending.is_empty() and not combat.rules.actors.mia.action_used,"same icon cancels an uncommitted attack")
	combat.choose_action("mace"); combat.declare_target("mike",combat.token("mike").global_position); combat.rules.submit(19,"mia","direct-hit")
	combat.cancel_selection(); check(combat.rules.pending.get("kind","")=="damage","confirmed dice cannot be erased by deselecting")
	combat.rules.submit(2,"mia","direct-damage"); combat.rules.finish()
	combat.rules.start(["mike","mia"]); combat.rules.submit_initiative("mike",20); combat.rules.submit_initiative("mia",10); ui.select_player_character("mike")
	combat.choose_action("burning-hands")
	check(not combat.prompt.visible and combat.preview_valid and combat.target_menu==null,"cone is previewed on map with no creature selector")
	var slot: int=combat.rules.actors.mike.resources["spell-slot-1"].current
	combat.declare_target("",combat.token("mike").global_position+Vector3(100,0,0))
	check(combat.rules.pending.get("kind","")=="guided" and combat.rules.pending.get("target","x")=="" and not combat.prompt.visible,"aim chooses a direction; area resolution stays inline")
	combat.choose_action("burning-hands")
	check(combat.rules.pending.is_empty() and combat.rules.actors.mike.resources["spell-slot-1"].current==slot,"deselecting an unconfirmed area spends no slot")
	combat._basic("search"); check(combat.armed.get("target_mode","")=="point" and not combat.prompt.visible,"search selects a zone, never a creature")
	combat.declare_target("",combat.token("mike").global_position)
	check(combat.rules.pending.get("context",{}).has("point") and not combat.prompt.visible,"search retains the actual marked zone for the DM")
	combat.cancel_selection(); combat.rules.finish(); combat.choose_action("detect-magic")
	check(combat.rules.pending.get("target","")=="mike" and not combat.prompt.visible and combat.action_tray.visible,"self aura needs no target and no central confirmation window")
	combat.cancel_selection(); combat._basic("use-object")
	var description: LineEdit=combat.action_tray.find_child("ObjectDescription",true,false); description.grab_focus(); combat._process(0)
	check(not combat.token("mike")._camera_allows_keyboard(),"typing an object description cannot move the character")
	description.release_focus(); combat._process(0)
	check(not combat.token("mike").get_meta("combat_text_input",true),"keyboard gate releases when the text field loses focus")
	combat.cancel_selection(); combat.category=""; combat.wheel_open=true
	ui.preferences.set_value("actionX",.01); await process_frame; combat._layout(); combat.refresh()
	var origin: Vector2=ui.player_hud.action_toggle_btn.get_global_rect().get_center()
	check(origin.x<combat.layer.get_viewport_rect().size.x*.28 and combat.wheel.get_child(0).origin.distance_to(origin)<1,"left placement stays attached to its control")
	main.free(); print(JSON.stringify({"suite":"direct-actions","passed":passed,"failed":failures.size(),"errors":failures})); quit(1 if failures.size()>0 else 0)
