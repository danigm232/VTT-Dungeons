extends RefCounted
const Session = preload("res://inventory/backpack_session.gd")
const Catalogue = preload("res://inventory/item_catalogue.gd")
var ui
var session = Session.new()
var personal_items: Dictionary = {}
var held: Dictionary = {}
var playing: bool = false
var playback: Array = []

func _init(owner_ui) -> void:
	ui = owner_ui
	for token in ui.tokens_by_node.values():
		token.set_meta("inventory_input_managed", ui.ui_active)
		if ui.ui_active and ui.inv_mgr and ui.inv_mgr.torch_toggled.is_connected(token.set_torch_mode):
			ui.inv_mgr.torch_toggled.disconnect(token.set_torch_mode)

func items() -> Dictionary:
	return items_for_actor(session.actor_id if session.is_open else ui.selected_actor_id)

func items_for_actor(actor_id: String) -> Dictionary:
	if ui.inv_mgr and "items" in ui.inv_mgr:
		return ui.inv_mgr.items
	var actor: Dictionary = {}
	for candidate in ui.actors:
		if candidate.id == actor_id:
			actor = candidate
	var id: String = actor_id
	if not personal_items.has(id):
		var stock: Dictionary = {}
		for gear in actor.get("gear", []):
			if str(gear) == "Mochila":
				continue
			var label := str(gear)
			var quantity := 1
			var number := RegEx.new()
			number.compile("^(\\d+)\\s+(.+)$")
			var parsed := number.search(label)
			if parsed:
				quantity = int(parsed.get_string(1)); label = parsed.get_string(2)
			var key := Catalogue.normalized(label).replace(" ", "_")
			stock[key] = {"name": label, "count": quantity, "desc": "Equipo inicial de %s." % actor.get("name", "la ficha"), "equipped": false}
		personal_items[id] = stock
	return personal_items[id]

func begin() -> void:
	session.begin(ui.selected_actor_id)
	for token in ui.tokens_by_node.values():
		if not bool(token.get("is_npc")):
			token.set_meta("inventory_modal_open", true)
		if "input_override" in token:
			token.input_override = Vector2.ZERO

func actual_held(key: String) -> bool:
	var actor_id: String = session.actor_id if session.is_open else ui.selected_actor_id
	if Catalogue.item_icon_id(key, items().get(key, {})) == "torch":
		for actor in ui.actors:
			if actor.id == actor_id:
				var token = ui.tokens_by_node.get(actor.node_name)
				return bool(token.get("is_torch_lit")) if token else false
	return held.get(actor_id, "") == key

func desired_held(key: String) -> bool:
	return session.desired(key, actual_held(key)) if session.is_open else actual_held(key)

func prepare(key: String, action: String) -> void:
	if not items().has(key) or int(items()[key].get("count", 0)) < 1:
		return
	if Catalogue.category(key, items()[key]) == "treasure":
		return
	session.prepare(key, action, actual_held(key))

func toggle_torch() -> void:
	var key := ""
	for candidate in items():
		if Catalogue.item_icon_id(candidate, items()[candidate]) == "torch" and int(items()[candidate].get("count", 0)) > 0:
			key = candidate; break
	if key.is_empty():
		ui.notify_mesa("No hay antorchas disponibles en esta mochila.")
		return
	if session.is_open:
		prepare(key, "store" if desired_held(key) else "take")
	else:
		session.begin(ui.selected_actor_id)
		prepare(key, "store" if ui.is_torch_lit() else "take")
		finish()

func finish() -> void:
	if not session.is_open:
		return
	playback.append_array(session.finish())
	for token in ui.tokens_by_node.values():
		token.set_meta("inventory_modal_open", false)
	if not playing:
		_play.call_deferred()

func _play() -> void:
	if playing:
		return
	playing = true
	# The hidden modal must have been drawn for a frame before any actor moves.
	await ui.get_tree().process_frame
	while not playback.is_empty():
		while session.is_open:
			await ui.get_tree().process_frame
		var event: Dictionary = playback.pop_front()
		var token: Node3D = null
		for actor in ui.actors:
			if actor.id == event.actor_id:
				token = ui.tokens_by_node.get(actor.node_name)
		if not is_instance_valid(token) or not token.is_inside_tree():
			continue
		var item: Dictionary = items_for_actor(event.actor_id).get(event.item_id, {})
		if item.is_empty() or int(item.get("count", 0)) < 1:
			continue
		if bool(token.get("is_defeated")):
			continue
		var take: bool = event.action == "take"
		if Catalogue.item_icon_id(event.item_id, item) == "torch":
			token.set_torch_mode(take, false)
		else:
			var previous=str(held.get(event.actor_id,""))
			if take:
				var old_item: Dictionary=items_for_actor(event.actor_id).get(previous,{})
				if not old_item.is_empty(): old_item["equipped"]=false
				held[event.actor_id]=event.item_id
			elif previous==str(event.item_id): held.erase(event.actor_id)
		item["equipped"] = take
		ui.refresh_all()
		if item.has("visual_resource") and "combat_controller" in ui and ui.combat_controller:
			var appearance=ui.combat_controller.get_node_or_null("CharacterAppearanceService")
			var resource: Dictionary=preload("res://characters/registry.gd").data().equipment.get(str(item.visual_resource),{})
			if appearance and not resource.is_empty(): appearance.request_local(str(event.actor_id),str(resource.slot),str(item.visual_resource) if take else "")
		token.play_action_animation("backpack_take" if take else "backpack_store", 1.05)
		while is_instance_valid(token) and float(token.get("action_lock_timer")) > 0:
			await ui.get_tree().physics_frame
		ui.refresh_all()
	playing = false

func portrait() -> Texture2D:
	var token: Node3D = ui.get_active_token_node()
	if not token:
		return null
	if token.has_meta("appearance_portrait") and token.get_meta("appearance_portrait") is Texture2D:
		return token.get_meta("appearance_portrait")
	var profile: Dictionary = token.get("char_profile")
	var frames: Array = profile.get("dir_idle", {}).get("s", {}).get("frames", [])
	if not frames.is_empty():
		return frames[0].get("tex")
	return token.get("token_texture") as Texture2D

func add_item(id: String, quantity: int, label: String) -> void:
	if quantity < 1 or label.strip_edges().is_empty():
		return
	if ui.inv_mgr and ui.inv_mgr.has_method("add_item"):
		ui.inv_mgr.add_item(id, quantity, label)
	else:
		var stock := items()
		if stock.has(id):
			stock[id]["count"] += quantity
		else:
			stock[id] = {"name": label, "count": quantity, "desc": "Objeto registrado en esta mochila.", "equipped": false}
