extends SceneTree
const Registry=preload("res://characters/registry.gd")
var checks:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("INTEGRATION FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func http(port: int,path: String,payload: Dictionary={}) -> Dictionary:
	var client:=HTTPRequest.new(); client.timeout=5; root.add_child(client)
	var started:=client.request("http://127.0.0.1:"+str(port)+path,["Content-Type: application/json"],HTTPClient.METHOD_POST if not payload.is_empty() else HTTPClient.METHOD_GET,JSON.stringify(payload) if not payload.is_empty() else "")
	if started!=OK: client.queue_free(); return {"error":started}
	var result: Array=await client.request_completed
	client.queue_free(); var bytes: PackedByteArray=result[3]
	return {"code":result[1],"transport":result[0],"value":JSON.parse_string(bytes.get_string_from_utf8()) if not bytes.is_empty() else {}}
func _run() -> void:
	var path:="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var main: Node3D=load(path).instantiate(); root.add_child(main); current_scene=main
	for i in range(8): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); check(ui!=null,"real map UI exists")
	if ui==null: quit(1); return
	ui.clock_running=false; ui.set_role("dm")
	var combat=ui.combat_controller; var service=combat.get_node_or_null("CharacterAppearanceService")
	check(service!=null,"actual map owns modular appearance service")
	var body: Node3D=combat.token("mike"); var visual=service.actor("mike")
	check(visual.definition.id=="mike","map Mike resolves to authoritative visual definition")
	var position: Vector3=body.position; var shape=body.collision.shape
	check(not service.request_local("mike","head","steel-helmet").ok,"clothing phase deferred: prototype gear is not granted in play")
	body._resolve_and_apply_clip("attack","s",true); body.update_sprite_frame(); visual.sync_render()
	check(not body.active_clip_frames.is_empty(),"existing attack remains available without modular clothes")
	check(body.position==position and body.collision.shape==shape,"effects preserve grid position and collision")
	combat.rules.actors.mike.conditions=["envenenada","petrificada"]
	await process_frame; visual.sync_render()
	check((visual.surface.bits()&3)==3,"real rule conditions drive both alpha-masked effects")
	combat.rules.actors.mike.conditions=[]; await process_frame; visual.sync_render()
	check(visual.surface.bits()==0,"removing mechanical conditions removes visual state")
	combat.rules.actors.mike.conditions=["restringida"]; service.set_cause("mike","webs"); await process_frame
	check(visual.binding.kind=="webs","DM chooses physical cause without changing mechanics")
	combat.rules.actors.mike.conditions=[]; await process_frame
	check(not visual.binding.visible,"restriction representation clears when rules clear")
	check(visual.apply_variant("mike-arcane-patina"),"new overlay-only variant passes actual runtime route")
	check(visual.equipment.equipped.is_empty() and visual.extra_effects.has("cursed"),"variant reuses body and effect, with no clothing assets")
	check(not visual.apply_variant("missing"),"unknown variant rejected")
	check(service.appearance_preferences("mike",{"intensity":.55,"treatment":1}).ok,"preferences update actual material")
	check(not service.appearance_preferences("mike",{"intensity":"bad"}).ok,"invalid visual input rejected")
	combat.save_local("user://appearance-integration.save")
	visual.extra_effects.clear(); visual.intensity=.2; combat.restore_local("user://appearance-integration.save")
	check(visual.extra_effects.has("cursed") and is_equal_approx(visual.intensity,.55),"real local save restores overlay and intensity")
	check(visual.variant_id=="mike-arcane-patina","real local save restores variant identity")
	var network:="not requested"
	if "--test-network" in OS.get_cmdline_user_args():
		network="real loopback sockets"
		var adapter=load("res://loading/loading_http.gd").new(); root.add_child(adapter)
		var session=load("res://loading/loading_session.gd").new(JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json")))
		adapter.visual_service=service; check(adapter.start(session,48239)==OK,"isolated network test port starts")
		var unauth: Dictionary=await http(48239,"/appearance?token=unknown"); check(unauth.get("code",0)==401,"unauthenticated appearance access rejected")
		var joined: Dictionary=await http(48239,"/join",{"character":"mike"}); check(joined.get("code",0)==200,"player joins existing session")
		var token: String=str(joined.get("value",{}).get("token",""))
		var forbidden: Dictionary=await http(48239,"/appearance/preferences",{"token":token,"actor":"maria","intensity":.4}); check(forbidden.get("code",0)==403,"client cannot impersonate another actor")
		var changed: Dictionary=await http(48239,"/appearance/preferences",{"token":token,"intensity":.7,"treatment":2}); check(changed.get("code",0)==200 and is_equal_approx(visual.intensity,.7),"authorized preference reaches map")
		var snapshot: Dictionary=await http(48239,"/appearance?token="+token); check(snapshot.get("code",0)==200 and snapshot.get("value",{}).get("appearance",{}).get("actors",{}).has("mike"),"viewer receives current appearance")
		var hidden: Node3D=combat.token("zombie")
		if hidden: hidden.hide(); check(not service.snapshot().actors.has("zombie"),"hidden miniature omitted from viewer snapshot")
		adapter.free()
	var replica_world:=Node3D.new(); root.add_child(replica_world)
	var replica=preload("res://characters/review_stage.gd").actor(replica_world,"mike"); replica.get_node("CharacterVisual").actor_id="mike"
	var wire: Dictionary=JSON.parse_string(JSON.stringify(visual.state()))
	check(replica.get_node("CharacterVisual").apply_state(wire),"separate renderer consumes serialized appearance")
	check(replica.get_node("CharacterVisual").extra_effects==visual.extra_effects,"DM and second renderer share effects")
	var bad:=wire.duplicate(true); bad.equipment={"armor":"steel-helmet"}; check(not visual.apply_state(bad),"forged equipment slot rejected")
	bad=wire.duplicate(true); bad.intensity="bad"; check(not visual.apply_state(bad),"invalid state rejected before mutation")
	replica_world.free()
	var project: String=ProjectSettings.get_setting("application/config/name")
	var report: Dictionary={"project":project,"checks":checks,"failures":failures,"revision":Registry.data().revision,"network":network,"save":"actual local combat file; not web campaign save","deferred":"clothing creation and production equipment"}
	FileAccess.open(ProjectSettings.globalize_path("res://../../output/character-modular-20261116/integration-"+project.to_lower().replace(" ","-")+".json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("CHARACTER INTEGRATION ",checks," checks; ",failures.size()," failures; network ",network)
	main.free(); quit(0 if failures.is_empty() else 1)
