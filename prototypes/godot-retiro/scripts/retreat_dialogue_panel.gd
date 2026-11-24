extends Control

signal finished
signal choice_selected(index: int)
signal party_spoke(line: String)

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")

var panel: Panel
var header: Label
var subtitle: Label
var scroll: ScrollContainer
var transcript: VBoxContainer
var choices: VBoxContainer
var composer: HBoxContainer
var message: LineEdit
var caption: PanelContainer
var caption_name: Label
var caption_line: Label
var party_mode := false

func _ready() -> void:
	name = "RetreatConversations"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_caption()
	_build_dialogue()
	resized.connect(_resize_panel)
	_resize_panel()

func _build_dialogue() -> void:
	panel = Panel.new()
	panel.name = "ConversationPanel"
	panel.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(
		Color("#101c1dfc"), ThemeKit.COL_GOLD, 12, 0, 0))
	panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	panel.clip_contents = true
	add_child(panel)
	panel.resized.connect(_position_dialogue)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 9)
	panel.add_child(body)
	body.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	body.offset_left = 19
	body.offset_right = -19
	body.offset_top = 13
	body.offset_bottom = -13
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	body.add_child(row)
	var names := VBoxContainer.new()
	names.add_theme_constant_override("separation", 2)
	names.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(names)
	header = ThemeKit.make_title("", 23, ThemeKit.COL_HEADING)
	names.add_child(header)
	subtitle = ThemeKit.make_label("", 15, ThemeKit.COL_MUTED)
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	names.add_child(subtitle)
	var leave := Button.new()
	leave.text = "Cerrar"
	leave.tooltip_text = "Cerrar la conversación (Esc)"
	ThemeKit.style_button(leave, "ghost")
	leave.pressed.connect(func(): finished.emit())
	row.add_child(leave)
	body.add_child(HSeparator.new())
	scroll = ScrollContainer.new()
	scroll.custom_minimum_size.y = 118
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	body.add_child(scroll)
	transcript = VBoxContainer.new()
	transcript.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	transcript.add_theme_constant_override("separation", 8)
	scroll.add_child(transcript)
	choices = VBoxContainer.new()
	choices.add_theme_constant_override("separation", 4)
	body.add_child(choices)
	composer = HBoxContainer.new()
	composer.add_theme_constant_override("separation", 8)
	body.add_child(composer)
	message = LineEdit.new()
	message.placeholder_text = "Escribe como tu personaje"
	message.max_length = 180
	message.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	message.text_submitted.connect(_send_party_line)
	composer.add_child(message)
	var send := Button.new()
	send.text = "Decir"
	ThemeKit.style_button(send, "primary")
	send.pressed.connect(func(): _send_party_line(message.text))
	composer.add_child(send)
	panel.hide()

func _resize_panel() -> void:
	var width := minf(528.0, maxf(240.0, size.x - 32.0))
	var choice_count := choices.get_child_count() if not party_mode else 0
	scroll.custom_minimum_size.y = 80.0 if size.y < 570.0 else 118.0
	var height := (157.0 if party_mode else 116.0 + float(choice_count) * 39.0) + scroll.custom_minimum_size.y
	panel.size = Vector2(width, height)
	_position_dialogue()

func _position_dialogue() -> void:
	panel.position = Vector2((size.x - panel.size.x) * 0.5, maxf(60.0, size.y - panel.size.y - 26.0))

func _build_caption() -> void:
	caption = PanelContainer.new()
	caption.name = "OverheardConversation"
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(
		Color("#102021f4"), ThemeKit.COL_GOLD, 8, 13, 8))
	add_child(caption)
	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.custom_minimum_size.x = 250
	content.add_theme_constant_override("separation", 2)
	caption.add_child(content)
	caption_name = ThemeKit.make_title("", 14, ThemeKit.COL_GOLD_BRIGHT)
	caption_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(caption_name)
	caption_line = ThemeKit.make_label("", 17, ThemeKit.COL_INK)
	caption_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	caption_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(caption_line)
	caption.hide()

func open_lines(title: String, context: String, history: Array, topics: Array, local_party := false) -> void:
	party_mode = local_party
	header.text = title
	subtitle.text = context
	_clear_children(transcript)
	_clear_children(choices)
	for line: Dictionary in history:
		append_line(line.speaker, line.text, line.get("hero", false))
	for i in range(topics.size()):
		var button := Button.new()
		button.text = str(topics[i][0])
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.tooltip_text = button.text
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.custom_minimum_size.y = 34
		ThemeKit.style_button(button, "secondary", 7)
		button.pressed.connect(func(): choice_selected.emit(i))
		choices.add_child(button)
	choices.visible = not local_party
	composer.visible = local_party
	caption.hide()
	panel.show()
	_resize_panel()
	_resize_panel.call_deferred()
	if local_party:
		message.grab_focus()

func append_line(speaker: String, text: String, hero: bool) -> void:
	if transcript.get_child_count() >= 36:
		var first := transcript.get_child(0)
		transcript.remove_child(first)
		first.queue_free()
	var entry := VBoxContainer.new()
	entry.add_theme_constant_override("separation", 1)
	transcript.add_child(entry)
	entry.add_child(ThemeKit.make_title(speaker, 13, ThemeKit.COL_MUTED if hero else ThemeKit.COL_GOLD_BRIGHT))
	var words := ThemeKit.make_label(text, 19, ThemeKit.COL_INK)
	words.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	entry.add_child(words)
	_scroll_to_end.call_deferred()

func _scroll_to_end() -> void:
	scroll.scroll_vertical = int(scroll.get_v_scroll_bar().max_value)

func display_caption(actor: Node3D, text: String, view: Camera3D) -> void:
	var above := actor.global_position + Vector3.UP * (float(actor.target_height) + 0.18)
	if panel.visible or not view.is_position_in_frustum(above):
		caption.hide()
		return
	if caption_line.text != text or caption_name.text != actor.token_name:
		caption_line.text = text
		caption_name.text = actor.token_name
		caption.reset_size()
	var point := view.unproject_position(above)
	caption.position = Vector2(
		clampf(point.x - caption.size.x * 0.5, 10.0, maxf(10.0, size.x - caption.size.x - 10.0)),
		clampf(point.y - caption.size.y - 9.0, 96.0, maxf(96.0, size.y - caption.size.y - 90.0)))
	caption.show()

func close() -> void:
	message.release_focus()
	message.clear()
	panel.hide()

func _send_party_line(raw: String) -> void:
	var line := raw.strip_edges()
	if not line.is_empty():
		party_spoke.emit(line)
		message.clear()
	message.grab_focus()

func _clear_children(container: Control) -> void:
	for child in container.get_children():
		container.remove_child(child)
		child.queue_free()
