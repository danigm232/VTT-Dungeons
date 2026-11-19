extends SceneTree
## Lightweight rendering fixture for the real shared panel. Full world behaviour
## is tested separately by test_backpack.gd, never replaced by this fixture.
class ActorView extends Node3D:
	var is_npc := false
	var token_texture: Texture2D
	var char_profile: Dictionary = {}
	var is_torch_lit := false
class PanelOwner extends Node:
	var actors: Array[Dictionary] = []
	var selected_actor_id := "mia"
	var inv_mgr = null
	var ui_active := true
	var tokens_by_node: Dictionary = {}
	var inventory_bridge
	func get_active_actor() -> Dictionary:
		for actor in actors:
			if actor.id == selected_actor_id: return actor
		return {}
	func get_active_token_node() -> Node3D:
		return tokens_by_node.get(get_active_actor().node_name)
	func is_torch_lit() -> bool: return false
	func add_inventory_item(id: String, quantity: int, label: String) -> void:
		inventory_bridge.add_item(id, quantity, label)
func _initialize() -> void:
	_run.call_deferred()
func _run() -> void:
	var destination := ProjectSettings.globalize_path("res://../../output/godot-inventory-20261115/panel")
	DirAccess.make_dir_recursive_absolute(destination)
	var canvas := CanvasLayer.new()
	root.add_child(canvas)
	var background := ColorRect.new()
	background.color = Color("#0b1517")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(background)
	var owner := PanelOwner.new()
	root.add_child(owner)
	owner.actors = load("res://scripts/vtt_campaign_data.gd").create_default_actors()
	for definition in [["PlayerToken", "cleric.png"], ["RogueToken", "rogue-maria-v1.png"], ["WizardToken", "wizard.png"]]:
		var token := ActorView.new()
		token.name = definition[0]
		var image := Image.new()
		image.load_png_from_buffer(FileAccess.get_file_as_bytes("res://assets/tokens/" + definition[1]))
		token.token_texture = ImageTexture.create_from_image(image)
		owner.add_child(token)
		owner.tokens_by_node[definition[0]] = token
	owner.inventory_bridge = load("res://inventory/inventory_bridge.gd").new(owner)
	var panel = load("res://inventory/backpack_panel.gd").new()
	panel.setup(owner)
	canvas.add_child(panel)
	panel.visible = true
	for id in ["mia", "maria", "mike"]:
		owner.selected_actor_id = id
		owner.inventory_bridge.begin()
		panel.refresh_view()
		for frame in range(8): await process_frame
		await RenderingServer.frame_post_draw
		var result := root.get_texture().get_image().save_png(destination.path_join(id + ".png"))
		print("PANEL ", id, " ", result, " bounds=", panel.get_global_rect())
	panel.visible = false
	var sheet := GridContainer.new()
	sheet.position = Vector2(20, 20)
	sheet.columns = 8
	canvas.add_child(sheet)
	for action in ["backpack_take", "backpack_store", "torch_walk"]:
		for child in sheet.get_children():
			sheet.remove_child(child)
			child.queue_free()
		for hero in ["cleric", "rogue", "wizard"]:
			var data: Dictionary = load("res://inventory/sprite_library.gd").profile(hero)
			var frames: Array = []
			if action == "torch_walk":
				for direction in ["n", "ne", "e", "se", "s", "sw", "w", "nw"]:
					frames.append(data.torch_walk[direction].frames[0])
			else: frames = data.clips[action].frames
			for frame in frames:
				var texture := TextureRect.new()
				texture.texture = frame.tex
				texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
				texture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
				texture.custom_minimum_size = Vector2(150, 190)
				sheet.add_child(texture)
		for frame in range(4): await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(destination.path_join(action + ".png"))
	print("PANEL DONE ", destination)
	quit()
