extends Node
## Map-facing adapter. Inventory and rules remain the owners of gameplay data.
const Runtime=preload("res://characters/visual_runtime.gd")
const Registry=preload("res://characters/registry.gd")
var controller: Node
var revision:=0
var stock_timer:=0.0
var preferences:=ConfigFile.new()
func _process(delta: float) -> void:
	stock_timer+=delta
	if stock_timer>=.5 and controller:
		stock_timer=0
		for id in controller.rules.actors:
			var body: Node3D=controller.token(str(id))
			if body and body.get_node_or_null("CharacterVisual") and not body.get_node("CharacterVisual").equipment.equipped.is_empty(): stock_changed(str(id))
func setup(owner_controller: Node) -> void:
	controller=owner_controller; name="CharacterAppearanceService"
	preferences.load("user://character-visual-preferences.cfg")
	for id in controller.rules.actors: actor(str(id))
	var loading=get_tree().root.get_node_or_null("SkillLoading")
	if loading and loading.http: loading.http.visual_service=self
func actor(id: String) -> Node3D:
	var body: Node3D=controller.token(id)
	if body==null or body.get("sprite")==null: return null
	var visual=Runtime.attach(body,id)
	visual.actor_id=id
	if not visual.has_meta("registered_animations_loaded"):
		var definition: Dictionary=visual.definition
		if definition.get("campaign","")=="stormwreck-isle" and definition.get("source",{}).get("kind","")=="individual-frames":
			var profile:=Registry.profile(str(definition.id))
			if not profile.is_empty(): body.char_profile=profile; body.char_key=str(definition.id)
		elif not Registry.data().get("animations",{}).is_empty():
			body.char_profile=Registry.with_animations(body.char_profile.duplicate(true),definition)
		# Apply a newly registered idle immediately, even while the actor is still.
		body._resolve_and_apply_clip(str(body.current_anim),str(body.facing_dir),false)
		visual.set_meta("registered_animations_loaded",true)
	if not visual.has_meta("appearance_preferences_loaded"):
		visual.intensity=clampf(float(preferences.get_value(id,"intensity",.85)),0,1)
		visual.coverage=clampf(float(preferences.get_value(id,"coverage",.7)),0,1)
		visual.treatment=clampi(int(preferences.get_value(id,"treatment",2)),0,2)
		visual.set_meta("appearance_preferences_loaded",true)
	if not visual.visual_changed.is_connected(_changed): visual.visual_changed.connect(_changed)
	return visual
func _changed(_state: Dictionary) -> void: revision+=1
func _stock(id: String) -> Dictionary:
	return controller.ui.inventory_bridge.items_for_actor(id) if controller.ui.inventory_bridge else {}
func owned_key(id: String,item_id: String) -> String:
	var item: Dictionary=Registry.data().equipment.get(item_id,{})
	for key in _stock(id):
		var entry: Dictionary=_stock(id)[key]
		if int(entry.get("count",0))<1: continue
		if str(entry.get("visual_resource",""))==item_id or str(key)==item_id: return str(key)
		var label: String=str(entry.get("name",key)).to_lower().strip_edges()
		if label in item.get("inventoryLabels",[]): return str(key)
	return ""
func equip_owned(id: String,slot: String,item_id: String) -> Dictionary:
	if not item_id.is_empty() and not Registry.data().equipment.get(item_id,{}).get("productionEnabled",false): return {"ok":false,"reason":"La vestimenta modular queda para una fase posterior"}
	var visual=actor(id)
	if visual==null: return {"ok":false,"reason":"La miniatura no está en este mapa"}
	if not item_id.is_empty() and owned_key(id,item_id).is_empty(): return {"ok":false,"reason":"Ese objeto no está en la mochila de este personaje"}
	var old: String=str(visual.equipment.equipped.get(slot,""))
	var result: Dictionary=visual.equip(slot,item_id)
	if result.ok:
		for entry_id in [old,item_id]:
			var key:=owned_key(id,entry_id)
			if not key.is_empty(): _stock(id)[key]["equipped"]=entry_id==item_id
	return result
func appearance_preferences(id: String,value: Dictionary) -> Dictionary:
	var visual=actor(id)
	if not visual: return {"ok":false,"reason":"La miniatura no está en este mapa"}
	for key in value:
		if key not in ["intensity","coverage","treatment"] or (not value[key] is float and not value[key] is int) or not is_finite(float(value[key])): return {"ok":false,"reason":"Parámetro visual no válido"}
		if (key=="treatment" and float(value[key]) not in [0.0,1.0,2.0]) or (key!="treatment" and (value[key]<0 or value[key]>1)): return {"ok":false,"reason":"Parámetro fuera de rango"}
	for key in value:
		visual.set(key,value[key]); preferences.set_value(id,key,value[key])
	preferences.save("user://character-visual-preferences.cfg"); visual.sync_render(); _changed({}); return {"ok":true}
func request_local(id: String,slot: String,item_id: String) -> Dictionary:
	var ui=controller.ui
	if ui.current_role!="dm" and (ui.current_role!="player" or str(ui.selected_actor_id)!=id): return {"ok":false,"reason":"Solo puedes equipar a tu personaje"}
	return equip_owned(id,slot,item_id)
func export_state() -> Dictionary:
	var result: Dictionary={}
	for id in controller.rules.actors:
		var visual=actor(str(id))
		if visual: result[id]=visual.state()
	return {"version":1,"catalogue":Registry.data().revision,"actors":result}
func restore_state(value: Dictionary) -> Dictionary:
	var rejected: Array=[]
	if int(value.get("version",0))!=1 or not value.get("actors",{}) is Dictionary: return {"ok":false,"rejected":["Formato no válido"]}
	for id in value.actors:
		var visual=actor(str(id))
		if not visual or not value.actors[id] is Dictionary or value.actors[id].get("actor","")!=id or not visual.apply_state(value.actors[id]): rejected.append(id)
	return {"ok":rejected.is_empty(),"rejected":rejected}
func snapshot() -> Dictionary:
	var state:=export_state(); var visible: Dictionary={}
	for id in state.actors:
		var body: Node3D=controller.token(id); var record: Dictionary=controller.rules.actors[id]
		if body.is_visible_in_tree() and (record.get("kind","")=="player" or record.get("revealed",false)): visible[id]=state.actors[id]
	state.actors=visible; state.revision=revision; return state
func set_cause(id: String,binding_id: String) -> bool:
	if controller.ui.current_role!="dm" or not Registry.data().bindings.has(binding_id): return false
	controller.rules.actors[id]["visual_binding"]=binding_id
	var visual=actor(id)
	if visual: visual.binding_preference=binding_id; visual.from_rules(controller.rules.actors[id]); _changed({}); return true
	return false
func stock_changed(id: String) -> void:
	var visual=actor(id)
	if visual==null: return
	for slot in visual.equipment.equipped.keys():
		if owned_key(id,str(visual.equipment.equipped[slot])).is_empty(): visual.equip(slot,"")
