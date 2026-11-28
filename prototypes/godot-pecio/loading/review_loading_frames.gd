extends SceneTree
## A standalone inspector of the installed loading stage.

const Stage = preload("res://loading/loading_stage.gd")
const Session = preload("res://loading/loading_session.gd")

class Reviewer extends Control:
	const FPS := 60
	const OUTCOMES := ["Ambiente", "Éxito", "Fallo"]
	const HEROES := ["mike", "mia", "maria"]
	const HERO_LABELS := ["Mike", "Mía", "Trinity"]
	const PHASES := {
		"ambient": "Ambiente", "roll": "Tirada", "prepare": "Preparación",
		"success": "Éxito", "failure": "Fallo",
		"settledSuccess": "Desenlace · éxito", "settledFailure": "Desenlace · fallo",
	}

	var data: Dictionary
	var session
	var stage
	var skill_menu: OptionButton
	var hero_menu: OptionButton
	var outcome_menu: OptionButton
	var guest_menu: OptionButton
	var speed_menu: OptionButton
	var zoom_menu: OptionButton
	var preview: Control
	var dragging := false
	var pan := Vector2.ZERO
	var play: Button
	var timeline: HSlider
	var status: Label
	var actor: String
	var playing := false
	var playhead := 0.0
	var tick := 0
	var last_tick := 0
	var clock_starts := {}
	var poses := PackedInt32Array()

	func setup() -> void:
		data = JSON.parse_string(FileAccess.get_file_as_string("res://loading/catalog.json"))
		session = Session.new(data)
		var background := ColorRect.new()
		background.color = Color("0a1d21")
		add_child(background)
		background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		var layout := VBoxContainer.new()
		layout.add_theme_constant_override("separation", 5)
		add_child(layout)
		layout.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		var header := HFlowContainer.new()
		header.add_theme_constant_override("h_separation", 8)
		layout.add_child(header)

		var skills := PackedStringArray()
		for skill in data.scenes:
			skills.append("%02d · %s" % [skills.size() + 1, skill.name])
		skill_menu = menu(header, "Habilidad", skills)
		hero_menu = menu(header, "Personaje", PackedStringArray(HERO_LABELS))
		outcome_menu = menu(header, "Resultado", PackedStringArray(OUTCOMES))
		guest_menu = menu(header, "Quién se esconde", PackedStringArray())
		speed_menu = menu(header, "Velocidad", ["¼×", "½×", "1×"])
		speed_menu.select(2)
		zoom_menu = menu(header, "Ampliación", ["1×", "1½×", "2×"])
		zoom_menu.item_selected.connect(func(_index): pan = Vector2.ZERO; fit_preview())

		preview = Control.new()
		preview.clip_contents = true
		preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
		preview.custom_minimum_size.y = 250
		preview.resized.connect(fit_preview)
		preview.gui_input.connect(pan_preview)
		layout.add_child(preview)
		stage = Stage.new()
		preview.add_child(stage)
		stage.configure(data, session)
		stage.set_process(false)

		var controls := HFlowContainer.new()
		controls.add_theme_constant_override("h_separation", 7)
		layout.add_child(controls)
		play = button(controls, "Reproducir", toggle)
		button(controls, "Volver al inicio", restart)
		button(controls, "‹ Fotograma", func(): step(-1))
		button(controls, "Fotograma ›", func(): step(1))
		button(controls, "‹ Dibujo del personaje", func(): step_drawing(-1))
		button(controls, "Dibujo del personaje ›", func(): step_drawing(1))

		timeline = HSlider.new()
		timeline.step = 1
		timeline.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		timeline.custom_minimum_size.y = 22
		timeline.value_changed.connect(func(value): pause(); seek(int(value)))
		layout.add_child(timeline)
		status = Label.new()
		layout.add_child(status)
		var help := Label.new()
		help.text = "Espacio · reproducir o pausar    |    ← → · fotograma    |    Mayús + ← → · dibujo    |    Arrastra para mover la vista ampliada"
		help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		help.modulate = Color("a7c4bc")
		layout.add_child(help)

		for selector in [skill_menu, hero_menu, outcome_menu]:
			selector.item_selected.connect(func(_index): refresh(true))
		guest_menu.item_selected.connect(func(_index): refresh(false))
		skill_menu.select(data.scenes.find_custom(func(skill): return skill.id == "medicine"))
		outcome_menu.select(1)
		refresh(true)
		fit_preview()

	func menu(row: HFlowContainer, name: String, values: PackedStringArray) -> OptionButton:
		var box := VBoxContainer.new()
		row.add_child(box)
		var label := Label.new()
		label.text = name
		label.modulate = Color("b7d0c7")
		box.add_child(label)
		var selector := OptionButton.new()
		selector.custom_minimum_size.y = 34
		selector.get_popup().max_size.y = 560
		for title in values: selector.add_item(title)
		selector.item_selected.connect(func(_index): selector.release_focus())
		box.add_child(selector)
		return selector

	func button(row: HFlowContainer, title: String, action: Callable) -> Button:
		var control := Button.new()
		control.text = title
		control.custom_minimum_size.y = 35
		control.pressed.connect(action)
		row.add_child(control)
		return control

	func refresh(reset_guest: bool) -> void:
		pause()
		var skill: Dictionary = data.scenes[skill_menu.selected]
		actor = HEROES[hero_menu.selected]
		var visitors := ["owl", "goblin", "mouse", "kobold"]
		var visitor_names := ["Lechuza", "Trasgo", "Ratón", "Kobold"]
		for i in range(HEROES.size()):
			if HEROES[i] != actor:
				visitors.append(HEROES[i])
				visitor_names.append(HERO_LABELS[i])
		if reset_guest:
			guest_menu.clear()
			for name in visitor_names: guest_menu.add_item(name)
			guest_menu.select(0)
		(guest_menu.get_parent() as Control).visible = skill.id == "perception"
		session.begin(skill.id, "Visor de animaciones · " + HERO_LABELS[hero_menu.selected])
		session.entry.participants = [actor]
		session.entry.variant = visitors[guest_menu.selected] if skill.id == "perception" else "owl"
		stage.scene = skill
		var success := outcome_menu.selected == 1
		var action_key := "success" if success else "failure"
		var action: Dictionary = skill.successAnimation if success else skill.failureAnimation
		if outcome_menu.selected != 0:
			var value := 20 if success else 1
			session.entry.rolls[actor] = {"natural": value, "total": value, "at": 0}
		var duration := 6.4 if outcome_menu.selected == 0 else 1.6 + float(action.get("durationMs", 3800)) / 1000.0 + 4.0
		last_tick = ceili(duration * FPS)
		index_drawings(skill, action_key, action)
		timeline.max_value = last_tick
		seek(0)

	func fit_preview() -> void:
		if not is_instance_valid(stage):
			return
		var scale_factor: float = [1.0, 1.5, 2.0][zoom_menu.selected]
		stage.size = preview.size * scale_factor
		var limit: Vector2 = (stage.size - preview.size) * 0.5
		pan = pan.clamp(-limit, limit)
		stage.position = pan - limit
		preview.mouse_default_cursor_shape = Control.CURSOR_DRAG if scale_factor > 1 else Control.CURSOR_ARROW

	func pan_preview(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
			dragging = event.pressed and zoom_menu.selected > 0
		elif event is InputEventMouseMotion and dragging:
			if event.button_mask & MOUSE_BUTTON_MASK_LEFT:
				pan += event.relative
				fit_preview()
			else:
				dragging = false

	func remember_clip(character: String, choice: Dictionary) -> int:
		var key := character + ":clip:" + str(choice.clip)
		if not clock_starts.has(key):
			clock_starts[key] = stage.clock
		var clip: Dictionary = data.selections[int(choice.clip)]
		var elapsed: float = stage.clock - float(clock_starts[key])
		var index := Stage.playback_frame(clip.frames.size(), clip.fps, elapsed, clip.loop, choice.get("pose", -1))
		return int(clip.frames[index])

	func index_drawings(skill: Dictionary, action_key: String, action: Dictionary) -> void:
		# Capture each clip's first visible tick so that seeking in either direction
		# gives the same sprite as playing every preceding tick in order.
		clock_starts.clear()
		poses.resize(last_tick + 1)
		var hero_motion := {"ambient": skill.actor.get("ambient", []), action_key: action.get("actor", [])}
		var visitor: String = session.entry.variant
		var visitor_prop: Dictionary = {}
		if skill.id == "perception" and data.actors.has(visitor):
			for prop in skill.props:
				if prop.art == "owl":
					visitor_prop = prop
					break
		for i in range(last_tick + 1):
			stage.clock = float(i) / FPS
			stage.override_elapsed = stage.clock
			stage._set_phase(actor)
			var motion: Dictionary = stage._motion(hero_motion, action_key)
			poses[i] = -1
			if float(motion.opacity) > 0.001:
				poses[i] = remember_clip(actor, stage._selection(actor))
			if not visitor_prop.is_empty() and stage._motion(visitor_prop, action_key).opacity > 0.001:
				var role := "walk" if action_key == "success" else "run"
				if stage.phase.begins_with("settled") or action_key == "success" and stage.progress > 0.62:
					role = "idle"
				remember_clip(visitor, data.actors[visitor].guest[role])
		stage.role_clocks = clock_starts.duplicate()

	func seek(value: int) -> void:
		tick = clampi(value, 0, last_tick)
		playhead = float(tick)
		render_tick()

	func render_tick() -> void:
		stage.clock = float(tick) / FPS
		stage.override_elapsed = stage.clock
		stage._set_phase(actor)
		timeline.set_value_no_signal(tick)
		var drawing := "Fuera de escena" if poses[tick] < 0 else "Dibujo #%d" % poses[tick]
		status.text = "%s   ·   %.3f s   ·   Fotograma %d / %d   ·   %s" % [
			PHASES[stage.phase], stage.clock, tick + 1, last_tick + 1, drawing,
		]
		stage.queue_redraw()

	func pause() -> void:
		playing = false
		play.text = "Reproducir"

	func toggle() -> void:
		if playing:
			pause()
			return
		if tick == last_tick:
			seek(0)
		playing = true
		play.text = "Pausar"

	func restart() -> void:
		pause()
		seek(0)

	func step(direction: int) -> void:
		pause()
		seek(tick + direction)

	func step_drawing(direction: int) -> void:
		pause()
		var next := tick + direction
		while next >= 0 and next <= last_tick and poses[next] == poses[tick]:
			next += direction
		if next >= 0 and next <= last_tick:
			seek(next)

	func _process(delta: float) -> void:
		if not playing:
			return
		var rate: float = [0.25, 0.5, 1.0][speed_menu.selected]
		playhead += delta * FPS * rate
		var next := mini(int(playhead), last_tick)
		if next != tick:
			tick = next
			render_tick()
		if tick == last_tick:
			pause()

	func _input(event: InputEvent) -> void:
		if not event is InputEventKey or not event.pressed or not is_instance_valid(play):
			return
		for selector in [skill_menu, hero_menu, outcome_menu, guest_menu, speed_menu, zoom_menu]:
			if selector.get_popup().visible:
				return
		match event.keycode:
			KEY_SPACE:
				if not event.echo: toggle()
			KEY_HOME:
				restart()
			KEY_LEFT, KEY_RIGHT:
				var direction := -1 if event.keycode == KEY_LEFT else 1
				if event.shift_pressed: step_drawing(direction)
				else: step(direction)
			_:
				return
		get_viewport().set_input_as_handled()

func _initialize() -> void:
	open.call_deferred()

func open() -> void:
	root.title = "Animaciones de carga · Godot"
	root.min_size = Vector2i(690, 610)
	root.size = Vector2i(1360, 850)
	var reviewer := Reviewer.new()
	root.add_child(reviewer)
	reviewer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	reviewer.setup()
