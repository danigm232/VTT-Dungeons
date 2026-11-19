extends SceneTree
const Registry=preload("res://characters/registry.gd")
var checks:=0
var failures: Array=[]
var main: Node3D
var ui: Node
func check(ok: bool,label: String) -> void:
	checks+=1
	if not ok: failures.append(label); printerr("INTEGRATION FAIL ",label)
func _initialize() -> void: _run.call_deferred()
func http(port: int,path: String,payload: Dictionary={}) -> Dictionary:
	var client:=HTTPRequest.new(); root.add_child(client)
	var started:=client.request("http://127.0.0.1:"+str(port)+path,["Content-Type: application/json"],HTTPClient.METHOD_POST if not payload.is_empty() else HTTPClient.METHOD_GET,JSON.stringify(payload) if not payload.is_empty() else "")
	if started!=OK: client.queue_free(); return {}
	var result: Array=await client.request_completed
	client.queue_free(); return {"code":result[1],"value":JSON.parse_string(result[3].get_string_from_utf8())}
func _run() -> void:
	var path:="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	main=load(path).instantiate(); root.add_child(main); current_scene=main
	for i in range(8): await process_frame
	ui=main.find_child("VttRoleUi",true,false); check(ui!=null,"real map UI exists")
	if ui==null: quit(1); return
	ui.clock_running=false; ui.set_role("dm")
	var combat=ui.combat_controller; var service=combat.get_node_or_null("CharacterAppearanceService")
	check(service!=null,"actual map owns modular appearance service")
	var body: Node3D=combat.token("mike"); var visual=service.actor("mike")
	check(visual.definition.id=="mike","map Mike resolves to authoritative visual definition")
	check(body.get_child_count()>0 and body.get_node_or_null("CharacterVisual")!=null,"map component installed without replacing token")
	var position: Vector3=body.position; var shape=body.collision.shape
	check(not service.request_local("mike","head","steel-helmet").ok,"inventory blocks unowned equipment even for DM visual request")
	var stock: Dictionary=ui.inventory_bridge.items_for_actor("mike")
	stock["test_helmet"]={"name":"Casco de prueba","count":1,"visual_resource":"steel-helmet"}
	stock["test_blade"]={"name":"Espada de prueba","count":1,"visual_resource":"shared-sword"}
	stock["test_pack"]={"name":"Mochila de prueba","count":1,"visual_resource":"traveller-pack"}
	stock["test_pouch"]={"name":"Bolsa de prueba","count":1,"visual_resource":"belt-pouch"}
	check(service.request_local("mike","head","steel-helmet").ok,"DM equips an owned compatible item")
	check(service.request_local("mike","main_hand","shared-sword").ok,"shared weapon connects to real inventory")
	check(visual.animation_for("attack")=="attack_unarmed","equipped attack avoids baked second weapon")
	body._resolve_and_apply_clip("attack","s",true); body.update_sprite_frame(); visual.sync_render()
	check(not body.active_clip_frames.is_empty(),"actual animation driver accepts modular attack override")
	check(body.position==position and body.collision.shape==shape,"equipment preserves grid position and collision")
	ui.select_player_character("maria"); ui.set_role("player")
	check(not service.request_local("mike","head","").ok,"player cannot change another character")
	ui.select_player_character("mike")
	check(service.request_local("mike","head","").ok,"player can remove their own item")
	ui.set_role("projector"); check(not service.request_local("mike","head","steel-helmet").ok,"projector has no equipment write authority")
	ui.set_role("dm")
	combat.rules.actors.mike.conditions=["envenenada","petrificada"]
	await process_frame; visual.sync_render()
	check(visual.surface.bits()&3==3,"real rule conditions drive both alpha-masked effects")
	combat.rules.actors.mike.conditions=[]; await process_frame; visual.sync_render()
	check(visual.surface.bits()==0,"removing mechanical conditions removes visual state")
	combat.rules.actors.mike.conditions=["restringida"]; service.set_cause("mike","webs"); await process_frame
	check(visual.binding.kind=="webs","DM chooses physical cause without changing restriction mechanics")
	combat.rules.actors.mike.conditions=[]; await process_frame
	check(not visual.binding.visible,"restriction representation clears when rules clear")
	check(visual.apply_variant("mike-traveller"),"actual new variant loads base + compatible slots")
	check(visual.equipment.equipped.get("back","")=="traveller-pack","variant uses the shared backpack asset")
	check(not visual.apply_variant("missing"),"unregistered variant rejected")
	combat.save_local("user://appearance-integration.save")
	visual.equip("back",""); combat.restore_local("user://appearance-integration.save")
	check(visual.equipment.equipped.get("back","")=="traveller-pack","real combat local save restores visual equipment")
	check(visual.variant_id=="mike-traveller","real save restores variant identity")
	stock.test_pack.count=0; service.stock_changed("mike")
	check(not visual.equipment.equipped.has("back"),"lost/consumed inventory removes its modular appearance")
	stock.test_pack.count=1
	# Existing authenticated loading transport; actual loopback sockets, no mocked HTTP.
	var adapter=load("res://loading/loading_http.gd").new(); root.add_child(adapter)
	var session=load("res://loading/loading_session.gd").new(JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json")))
	adapter.visual_service=service
	check(adapter.start(session,48239)==OK,"appearance transport starts on isolated test port")
	var unauth: Dictionary=await http(48239,"/appearance?token=unknown")
	check(unauth.get("code",0)==401,"unauthenticated appearance access rejected")
	var joined: Dictionary=await http(48239,"/join",{"character":"mike"})
	check(joined.get("code",0)==200,"player joins existing authenticated session")
	var token: String=str(joined.get("value",{}).get("token",""))
	var forbidden: Dictionary=await http(48239,"/appearance/equip",{"token":token,"actor":"maria","slot":"head","item":"steel-helmet"})
	check(forbidden.get("code",0)==403,"network client cannot impersonate another actor")
	var equipped: Dictionary=await http(48239,"/appearance/equip",{"token":token,"slot":"head","item":"steel-helmet"})
	check(equipped.get("code",0)==200 and visual.equipment.equipped.get("head","")=="steel-helmet","authorized network equip reaches actual map actor")
	var snapshot: Dictionary=await http(48239,"/appearance?token="+token)
	check(snapshot.get("code",0)==200 and snapshot.value.appearance.actors.has("mike"),"authenticated viewer receives current appearance")
	var replica_world:=Node3D.new(); root.add_child(replica_world)
	var replica=preload("res://characters/review_stage.gd").actor(replica_world,"mike"); replica.get_node("CharacterVisual").actor_id="mike"
	var wire: Dictionary=snapshot.value.appearance.actors.mike
	check(replica.get_node("CharacterVisual").apply_state(wire),"separate renderer consumes authoritative wire state")
	check(replica.get_node("CharacterVisual").equipment.equipped==visual.equipment.equipped,"DM and second renderer show matching slots")
	var bad:=wire.duplicate(true); bad.equipment={"armor":"steel-helmet"}
	check(not visual.apply_state(bad),"remote state with forged slot rejected")
	bad=wire.duplicate(true); bad.intensity="not-a-number"; check(not visual.apply_state(bad),"invalid effect parameter rejected before mutation")
	adapter.free(); replica_world.free()
	for key in ["test_helmet","test_blade","test_pack","test_pouch"]: stock.erase(key)
	var project: String=ProjectSettings.get_setting("application/config/name"); var report: Dictionary={"project":project,"checks":checks,"failures":failures,"revision":Registry.data().revision,"network":"real HTTP loopback over existing session adapter","save":"actual local combat file; not web campaign save"}
	FileAccess.open(ProjectSettings.globalize_path("res://../../output/character-modular-20261116/integration-"+project.to_lower().replace(" ","-")+".json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("CHARACTER INTEGRATION ",checks," checks; ",failures.size()," failures")
	main.free(); quit(0 if failures.is_empty() else 1)
