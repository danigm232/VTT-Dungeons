extends CanvasLayer
signal map_entered(scene_path: String)
## Persistent loading entry point shared by initial boot and future map commands.
const Session = preload("res://loading/loading_session.gd")
const Stage = preload("res://loading/loading_stage.gd")
const HttpAdapter = preload("res://loading/loading_http.gd")
const Tones = preload("res://loading/performance_tones.gd")
const SkillDieButton = preload("res://loading/loading_d20_button.gd")
var catalog: Dictionary = {}
var session
var http
var stage
var panel: Control
var status: Label
var die: BaseButton
var next_button: Button
var selector: OptionButton
var actor_selector: OptionButton
var role: String = "player"
var local_character: String = ""
var review: bool = false
var loading_path: String = ""
var loaded_map: Node
var map_pending: bool = false
var map_attaching: bool = false
var attach_phase_text: String = ""
var load_requested: bool = false
var load_progress: Array = []
var reduced: bool = false
var proof_directory: String = ""
var sound: AudioStreamPlayer
var sound_entry: String = ""
var _prewarm_thread: Thread = null

func _exit_tree() -> void:
	if _prewarm_thread != null:
		_prewarm_thread.wait_to_finish()
		_prewarm_thread = null

func _ready() -> void:
	layer = 200
	process_mode = Node.PROCESS_MODE_ALWAYS
	catalog = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
	session = Session.new(catalog)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--role="): role = arg.trim_prefix("--role=")
		if arg.begins_with("--character="): local_character = arg.trim_prefix("--character=")
		if arg == "--loading-reduced": reduced = true
		if arg.begins_with("--loading-proof-dir="): proof_directory = arg.trim_prefix("--loading-proof-dir=")
	if local_character.is_empty() and not catalog.actors.is_empty(): local_character = str(catalog.actors.keys()[0])
	http = HttpAdapter.new()
	add_child(http)
	var app_name := str(ProjectSettings.get_setting("application/config/name", ""))
	var port = 47922 if app_name.contains("Campamentos") else (47920 if app_name.contains("Pecio") else 47921)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--loading-port="): port = int(arg.trim_prefix("--loading-port="))
	if not "--loading-review" in OS.get_cmdline_user_args():
		var err = http.start(session, port)
		if err != OK: push_warning("Controles móviles no disponibles en puerto %d" % port)
	_build_ui()
	sound = AudioStreamPlayer.new()
	add_child(sound)
	panel.hide()
	if role == "player" and catalog.actors.has(local_character):
		session.join("desktop", local_character)
		session.clients.desktop.ready = true

func _build_ui() -> void:
	panel = Control.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(panel)
	var fade := ColorRect.new()
	fade.color = Color("091d21")
	fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(fade)
	stage = Stage.new()
	stage.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(stage)
	stage.configure(catalog, session)
	stage.reduced = reduced
	status = Label.new()
	status.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	status.grow_vertical = Control.GROW_DIRECTION_BEGIN
	status.offset_left = 20
	status.offset_top = -64
	status.offset_right = 560
	status.offset_bottom = -16
	status.add_theme_font_size_override("font_size", 15)
	status.add_theme_color_override("font_color", Color("e7e0d0"))
	status.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	status.add_theme_constant_override("shadow_offset_x", 1)
	status.add_theme_constant_override("shadow_offset_y", 1)
	panel.add_child(status)
	die = SkillDieButton.new()
	die.custom_minimum_size = Vector2(96, 96)
	die.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	die.grow_horizontal = Control.GROW_DIRECTION_BOTH
	die.grow_vertical = Control.GROW_DIRECTION_BEGIN
	die.offset_left = -48
	die.offset_top = -104
	die.offset_right = 48
	die.offset_bottom = -8
	die.pressed.connect(func(): session.roll("desktop", session.entry.get("id", "")))
	panel.add_child(die)
	next_button = Button.new()
	next_button.text = "Continuar"
	next_button.custom_minimum_size = Vector2(128, 44)
	next_button.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	next_button.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	next_button.grow_vertical = Control.GROW_DIRECTION_BEGIN
	next_button.offset_left = -164
	next_button.offset_top = -62
	next_button.offset_right = -20
	next_button.offset_bottom = -18
	_style_loading_button(next_button, false)
	next_button.pressed.connect(func():
		if role == "dm" and session.projector_ready:
			_finish()
		else:
			session.continue_client("desktop", session.entry.get("id", ""))
	)
	panel.add_child(next_button)

func _style_loading_button(btn: Button, accent: bool) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("0c2025")
	normal.border_color = Color("d2ad63") if accent else Color("4a6e75")
	normal.set_border_width_all(2 if accent else 1)
	normal.set_corner_radius_all(8)
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 8
	normal.content_margin_bottom = 8
	var hover := normal.duplicate()
	hover.bg_color = Color("16333b")
	hover.border_color = Color("e8c882")
	var disabled := normal.duplicate()
	disabled.bg_color = Color("081417")
	disabled.border_color = Color("294146")
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_stylebox_override("disabled", disabled)
	btn.add_theme_color_override("font_color", Color("f1e4c6"))
	btn.add_theme_color_override("font_hover_color", Color("ffffff"))
	btn.add_theme_color_override("font_disabled_color", Color("7a8b8e"))
	btn.add_theme_font_size_override("font_size", 18 if accent else 15)

func load_map(path: String, destination: String, _reason: String = "map") -> void:
	if map_pending: return
	if is_instance_valid(loaded_map):
		loaded_map.process_mode = Node.PROCESS_MODE_DISABLED
		var active_ui = loaded_map.find_child("VttRoleUi", true, false)
		if active_ui != null:
			role = active_ui.current_role
			local_character = active_ui.selected_actor_id
			if role == "player":
				if session.join("desktop", local_character) and session.clients.has("desktop"):
					session.clients.desktop.ready = true
			else: session.leave("desktop")
	review = false
	var contest = session.eligible().size() >= 2 and session.rng.randf() < 0.35
	session.begin(("acrobatics" if session.rng.randf() < 0.5 else "performance") if contest else "", destination, contest)
	stage.role_clocks.clear()
	stage.load_art()
	panel.show()
	panel.modulate.a = 0.0
	create_tween().tween_property(panel, "modulate:a", 1.0, 0.25)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	loading_path = path
	map_pending = true
	map_attaching = false
	attach_phase_text = ""
	load_requested = false
	load_progress.clear()
	if die:
		die.reset_die()
		die.rotation = 0.0
	# Let the lightweight loading presentation render before requesting the heavy map.
	await get_tree().process_frame
	await get_tree().process_frame
	var err = ResourceLoader.load_threaded_request(path, "PackedScene")
	load_requested = err == OK
	if err != OK:
		map_pending = false
		status.text = "No se pudo cargar el mapa. F8 para reintentar."
		push_error("Loading request failed: " + path)

func _process(_delta: float) -> void:
	if session == null or session.entry.is_empty() or not panel.visible: return
	if map_pending and load_requested and not map_attaching:
		var state = ResourceLoader.load_threaded_get_status(loading_path, load_progress)
		if state == ResourceLoader.THREAD_LOAD_LOADED:
			map_attaching = true
			attach_phase_text = "Preparando personajes… 35 %"
			_attach_map.call_deferred()
		elif state == ResourceLoader.THREAD_LOAD_FAILED or state == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
			map_pending = false
			attach_phase_text = ""
			status.text = "Error de carga. F8 para reintentar."
	var personal = session.state("desktop")
	if session.entry.skill == "performance" and int(session.entry.resolved) >= 0 and not session.entry.closed and sound_entry != session.entry.id and Time.get_ticks_msec() - int(session.entry.resolved) >= 1600:
		sound_entry = session.entry.id
		sound.stream = Tones.make(session.entry.mode == "contest" or session.success(session.entry.participants[0], 12))
		sound.play()
	var hide_stage: bool = "--loading-hide-stage" in OS.get_cmdline_user_args()
	stage.visible = not hide_stage and (review or role in ["projector", "player", "dm"])
	die.visible = not review and role == "player" and personal.participants.has(local_character)
	die.disabled = not personal.canRoll
	die.pivot_offset = die.size * 0.5
	die.set_roll_state(personal.roll, reduced)
	next_button.visible = not review and ((role == "player" and personal.ready) or (role == "dm" and session.projector_ready))
	if role == "dm":
		next_button.disabled = false
		next_button.text = "Entrar al mapa"
	else:
		next_button.disabled = personal.continued
		next_button.text = "Esperando…" if personal.continued else "Continuar"
	var spinner := "◐◓◑◒".substr(int(Time.get_ticks_msec() / 125) % 4, 1) if not reduced else "◌"
	if map_pending:
		if not attach_phase_text.is_empty():
			status.text = spinner + " " + attach_phase_text
		else:
			status.text = spinner + " Cargando el mapa… %d %%" % int((float(load_progress[0]) if not load_progress.is_empty() else 0) * 35.0)
	elif session.projector_ready:
		status.text = "Mapa preparado" if role == "player" else "Mapa preparado · Continuar en las pantallas personales"
	if role != "player" and not review:
		var ips: Array = []
		for ip in IP.get_local_addresses():
			if ":" not in ip and not ip.begins_with("127.") and not ip.begins_with("169.254."): ips.append("http://%s:%d" % [ip, http.port])
		status.text += "\nControles: " + (" · ".join(ips) if not ips.is_empty() else "http://127.0.0.1:%d" % http.port)
	if not review and session.complete(): _finish()

func _collect_prebuilders(node: Node, out: Array[Node]) -> void:
	for child in node.get_children():
		_collect_prebuilders(child, out)
	if node.has_method("prebuild"):
		out.append(node)

func _attach_map() -> void:
	attach_phase_text = "Preparando personajes… 36 %"
	await get_tree().process_frame
	var packed = ResourceLoader.load_threaded_get(loading_path) as PackedScene
	if packed == null:
		map_pending = false
		attach_phase_text = ""
		status.text = "No se pudo preparar el mapa. F8 para reintentar."
		return
	var old_map = loaded_map
	loaded_map = packed.instantiate()

	var extra_keys: Array[String] = []
	if not local_character.is_empty():
		extra_keys.append(CharacterSpriteCatalog.resolve_character_key(local_character))
	var req_keys: Array[String] = CharacterSpriteCatalog.collect_required_keys(loaded_map, extra_keys)
	var resident_ids: Array[String] = []
	if loaded_map != null and loaded_map.find_child("RetreatLayoutBuilder", true, false) != null:
		for rid in preload("res://scripts/retreat_resident_directory.gd").RESIDENTS:
			resident_ids.append("sw-" + str(rid))
	if not req_keys.is_empty() or not resident_ids.is_empty():
		var job := CharacterSpriteCatalog.build_prewarm_job(req_keys, resident_ids)
		var worker := Thread.new()
		if worker.start(CharacterSpriteCatalog.run_prewarm_job.bind(job)) == OK:
			_prewarm_thread = worker
			var start_ms := Time.get_ticks_msec()
			while worker.is_alive():
				var elapsed_s := float(Time.get_ticks_msec() - start_ms) / 1000.0
				var pct := mini(69, 36 + int(elapsed_s * 2.2))
				attach_phase_text = "Preparando animaciones y sprites… %d %%" % pct
				await get_tree().process_frame
			var prewarm_res: Dictionary = worker.wait_to_finish()
			_prewarm_thread = null
			CharacterSpriteCatalog.apply_prewarm_result(prewarm_res)
		else:
			CharacterSpriteCatalog.apply_prewarm_result(CharacterSpriteCatalog.run_prewarm_job(job))
		for idx in range(req_keys.size()):
			var pct := 70 + int(float(idx + 1) / float(req_keys.size()) * 8.0)
			attach_phase_text = "Cargando texturas de personajes… %d %%" % pct
			CharacterSpriteCatalog.get_character_clips(req_keys[idx])
			await get_tree().process_frame

	var used_camp_async := false
	if "defer_async_build" in loaded_map and loaded_map.has_method("build_camp_async"):
		used_camp_async = true
		loaded_map.set("defer_async_build", true)

	var retreat_builder = loaded_map.find_child("RetreatLayoutBuilder", true, false)
	if used_camp_async:
		attach_phase_text = "Construyendo campamento… 80 %"
		await get_tree().process_frame
		get_tree().root.add_child(loaded_map)
		await loaded_map.build_camp_async(get_tree(), func(frac: float):
			attach_phase_text = "Construyendo campamento… %d %%" % int(80 + frac * 14.0))
	elif retreat_builder != null and retreat_builder.has_method("build_layout_async"):
		await retreat_builder.build_layout_async(get_tree(), func(frac: float):
			attach_phase_text = "Construyendo escenario del Retiro… %d %%" % int(78 + frac * 15.0))
	else:
		var prebuilders: Array[Node] = []
		_collect_prebuilders(loaded_map, prebuilders)
		if not prebuilders.is_empty():
			for idx in range(prebuilders.size()):
				var pct := 78 + int(float(idx) / float(prebuilders.size()) * 15.0)
				attach_phase_text = "Construyendo escenario… %d %%" % pct
				await get_tree().process_frame
				if is_instance_valid(prebuilders[idx]) and prebuilders[idx].has_method("prebuild"):
					prebuilders[idx].prebuild()

	if not used_camp_async:
		attach_phase_text = "Activando escenario e iluminación… 94 %"
		await get_tree().process_frame
		get_tree().root.add_child(loaded_map)
	var hud = loaded_map.find_child("VttRoleUi", true, false)
	if role == "player" and hud != null: hud.select_player_character(local_character)
	elif role == "dm" and hud != null: hud.configure_initial("dm", false, true)
	elif role == "projector" and hud != null: hud.configure_initial("projector", true, true)
	loaded_map.process_mode = Node.PROCESS_MODE_DISABLED
	get_tree().current_scene = loaded_map
	if is_instance_valid(old_map): old_map.queue_free()
	attach_phase_text = "Compilando vista 3D… 97 %"
	await get_tree().process_frame
	await get_tree().process_frame
	if DisplayServer.get_name() != "headless": await RenderingServer.frame_post_draw
	map_pending = false
	attach_phase_text = ""
	for client in session.clients.values(): client.seen = Time.get_ticks_msec()
	session.projector_ready = true
	_capture_proof("startup-ready")

func _finish() -> void:
	session.entry.closed = true
	sound.stop()
	var fade = create_tween()
	fade.tween_property(panel, "modulate:a", 0.0, 0.3)
	await fade.finished
	panel.hide()
	stage.release_art()
	if is_instance_valid(loaded_map):
		loaded_map.process_mode = Node.PROCESS_MODE_INHERIT
		for wg in loaded_map.find_children("*", "Node3D", true, false):
			if wg.has_method("_rebuild") and "verified_cells" in wg and "cells" in wg:
				if wg.verified_cells.is_empty() and not wg.cells.is_empty():
					wg.configure(wg.cells)
	map_entered.emit(loading_path)
	_capture_proof("entered-map")

func _capture_proof(label: String) -> void:
	if proof_directory.is_empty() or DisplayServer.get_name() == "headless": return
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute(proof_directory)
	get_viewport().get_texture().get_image().save_png(proof_directory.path_join(label + ".png"))

func open_review() -> void:
	review = true
	role = "projector"
	session.join("review-mia", "mia")
	session.join("review-maria", "maria")
	session.join("review-mike", "mike")
	panel.show()
	stage.load_art()
	var bar := HBoxContainer.new()
	bar.position = Vector2(16, 12)
	panel.add_child(bar)
	selector = OptionButton.new()
	for skill in catalog.scenes: selector.add_item("%02d · %s" % [selector.item_count + 1, skill.name])
	bar.add_child(selector)
	actor_selector = OptionButton.new()
	for id in catalog.actors: actor_selector.add_item(catalog.actors[id].label)
	bar.add_child(actor_selector)
	selector.item_selected.connect(func(_i): _review_entry())
	actor_selector.item_selected.connect(func(_i): _review_entry())
	for outcome in ["Éxito", "Fallo"]:
		var button := Button.new()
		button.text = outcome
		button.pressed.connect(func():
			for character in session.entry.participants: session.roll("review-" + character, session.entry.id, 20 if outcome == "Éxito" else 1)
		)
		bar.add_child(button)
	var duel := Button.new()
	duel.text = "Duelo (2 jugadores)"
	duel.pressed.connect(func():
		session.begin("performance" if selector.selected % 2 else "acrobatics", "Demostración enfrentada", true)
		stage.role_clocks.clear()
	)
	bar.add_child(duel)
	var reduced_box := CheckButton.new()
	reduced_box.text = "Movimiento reducido"
	reduced_box.toggled.connect(func(value): stage.reduced = value)
	bar.add_child(reduced_box)
	_review_entry()

func _review_entry() -> void:
	session.begin(catalog.scenes[selector.selected].id, "Visor nativo · Sin partida")
	session.entry.participants = [catalog.actors.keys()[actor_selector.selected]]
	session.projector_ready = true
	stage.role_clocks.clear()

func _unhandled_key_input(event: InputEvent) -> void:
	if not event.is_pressed(): return
	if event is InputEventKey and event.keycode == KEY_F8 and not loading_path.is_empty() and not map_pending:
		load_map(loading_path, ProjectSettings.get_setting("application/config/name"), "retry")
	if event is InputEventKey and event.keycode == KEY_F10 and role == "dm" and session.projector_ready:
		# Local operator may leave a standalone map without inventing any player.
		_finish()
