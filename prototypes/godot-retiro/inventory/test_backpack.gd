extends SceneTree
var passed := 0
var failures: Array[String] = []
func _initialize() -> void:
	_run.call_deferred()
func check(ok: bool, message: String) -> void:
	if ok: passed += 1
	else:
		failures.append(message)
		printerr("FAIL ", message)
func _run() -> void:
	var session = load("res://inventory/backpack_session.gd").new()
	session.begin("maria")
	session.prepare("torch", "take", false)
	check(session.pending.size() == 1 and session.is_open, "Preparation stays pending while open")
	session.prepare("torch", "store", false)
	check(session.pending.is_empty(), "Opposite preparation cancels instead of replaying both")
	session.prepare("dagger", "take", false)
	var events: Array = session.finish()
	check(events.size() == 1 and events[0].actor_id == "maria" and not session.is_open, "Close captures actor-bound event once")
	check(session.finish().is_empty(), "Repeated close never duplicates an event")
	var library = load("res://inventory/sprite_library.gd")
	for hero in ["cleric", "rogue", "wizard"]:
		var profile: Dictionary = library.profile(hero)
		for action in ["backpack_take", "backpack_store"]:
			check(profile.clips[action].frames.size() == 8, hero + " eight " + action + " poses")
		for direction in library.DIRECTIONS:
			var frames: Array = profile.torch_walk[direction].frames
			check(frames.size() == 8 and frames[0].tex.get_width() > 0, hero + " torch walking " + direction)
	var catalogue = load("res://inventory/item_catalogue.gd")
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://inventory/icons/manifest.json"))
	for icon_id in manifest.ids:
		check(catalogue.icon(icon_id) != null, "Icon loads: " + icon_id)
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	for frame in range(4): await process_frame
	var ui = main.find_child("VttRoleUi", true, false)
	if ui == null or ui.get_script() == null:
		printerr("FAIL real UI did not instantiate")
		quit(1)
		return
	ui.set_role("player")
	ui.select_player_character("mia")
	var token = ui.get_active_token_node()
	var other = ui.tokens_by_node.get("RogueToken")
	token.set_torch_mode(false, false)
	other.set_torch_mode(false, false)
	ui.player_hud.open_modal("inventory")
	var panel = ui.player_hud.inventory_modal
	check(panel.visible and panel.portrait.texture != null, "Real backpack opens with active hero portrait")
	var torch_key := ""
	for key in ui.get_inventory_items():
		if catalogue.item_icon_id(key, ui.get_inventory_items()[key]) == "torch": torch_key = key
	check(not torch_key.is_empty(), "Inventory contains existing torch stock")
	ui.inventory_bridge.prepare(torch_key, "take")
	for frame in range(4): await physics_frame
	check(not token.is_torch_lit and token.action_anim_name != "backpack_take", "No light or animation before close")
	ui.player_hud.close_modals()
	check(not panel.visible and not token.is_torch_lit, "Close hides panel before applying queued action")
	for frame in range(4): await process_frame
	check(token.is_torch_lit and token.action_anim_name == "backpack_take", "Closing starts new take animation and real torch")
	check(not other.is_torch_lit, "Torch affects chosen hero only")
	await create_timer(1.4).timeout
	ui.player_hud.open_modal("inventory")
	ui.inventory_bridge.prepare(torch_key, "store")
	check(token.is_torch_lit, "Store also waits for close")
	ui.player_hud.close_modals()
	for frame in range(4): await process_frame
	check(not token.is_torch_lit and token.action_anim_name == "backpack_store", "Close starts store and extinguishes carried light")
	await create_timer(1.4).timeout
	for direction in ["n", "ne", "e", "se", "s", "sw", "w", "nw"]:
		var clip: Dictionary = token._pick_clip_from_profile("torch_walk", direction)
		check(clip.frames.size() == 8 and clip.frames[0].tex == token.char_profile.dir_torch_walk[direction].frames[0].tex, "World actor resolves new torch frames " + direction)
	var original_profile: Dictionary = token.char_profile
	var candidate: Dictionary = original_profile.duplicate(true)
	var image := Image.create(8, 8, false, Image.FORMAT_RGBA8)
	image.fill(Color("#99775b"))
	var appearance := ImageTexture.create_from_image(image)
	candidate.dir_idle.s.frames[0].tex = appearance
	token.facing_dir = "s"
	check(token.set_equipment_appearance(appearance, candidate), "Appearance API accepts matching profile and portrait")
	check(token.sprite.texture == appearance and ui.inventory_bridge.portrait() == appearance, "Future appearance changes portrait and world actor together")
	token.set_equipment_appearance(original_profile.dir_idle.s.frames[0].tex, original_profile)
	for id in ["mia", "maria", "mike"]:
		ui.select_player_character(id)
		ui.player_hud.open_modal("inventory")
		check(panel.hero_name.text == ui.get_active_actor().name and panel.portrait.texture == ui.inventory_bridge.portrait(), "Correct live portrait for " + id)
		check(not ui.get_inventory_items().is_empty(), "Real inventory connected for " + id)
		ui.player_hud.close_modals()
	if ui.inv_mgr == null:
		var stock: Dictionary = ui.inventory_bridge.items_for_actor("maria")
		check(stock.get("dagas", {}).get("count", 0) == 2 and stock.get("flechas", {}).get("count", 0) == 20, "Retiro keeps canonical quantities from character sheet")
		check(not stock.has("gold") and not stock.has("potion"), "Retiro adds no unearned treasure or potions")
	await process_frame
	print("BACKPACK ", passed, " PASS / ", failures.size(), " FAIL")
	main.queue_free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
