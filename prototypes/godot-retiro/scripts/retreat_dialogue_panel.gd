extends Control

signal finished
signal choice_selected(index: int)
signal party_spoke(line: String)

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")
const VELLUM_PATH := "res://character_sheet/art/foundation/vellum.jpg"
const TYPEWRITER_CPS := 150.0

class PortraitMedallion extends Control:
	var portrait_tex: Texture2D
	var portrait_uv := Rect2(0.0, 0.0, 1.0, 1.0)
	var accent_color := Color("e6be6c")
	var bg_tint := Color(0.09, 0.17, 0.19, 0.94)
	var active_glow := true
	var fallback_initial := "?"
	var _font: Font
	var _pulse := 0.0

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		_font = ThemeKit.get_title_font()

	func _process(delta: float) -> void:
		if is_visible_in_tree() and active_glow:
			_pulse = fmod(_pulse + delta * 2.2, TAU)
			queue_redraw()

	func set_portrait(tex: Texture2D, uv_rect: Rect2, initial: String, accent: Color) -> void:
		portrait_tex = tex
		portrait_uv = uv_rect
		fallback_initial = initial
		accent_color = accent
		queue_redraw()

	func _draw() -> void:
		var c := size * 0.5
		var r := minf(size.x, size.y) * 0.5 - 3.0
		if r <= 2.0:
			return
		var glow_a := 0.16 + (sin(_pulse) * 0.06 if active_glow else 0.0)
		draw_circle(c, r + 4.5, Color(0.0, 0.0, 0.0, 0.42))
		draw_circle(c, r + 2.5, Color(accent_color.r, accent_color.g, accent_color.b, glow_a))
		draw_circle(c, r, bg_tint)
		if portrait_tex != null:
			var pts := PackedVector2Array()
			var uvs := PackedVector2Array()
			var cols := PackedColorArray()
			var segs := 32
			for i in range(segs):
				var ang := float(i) / float(segs) * TAU
				var dir := Vector2(cos(ang), sin(ang))
				pts.append(c + dir * (r - 2.0))
				var u := portrait_uv.position.x + (0.5 + dir.x * 0.5) * portrait_uv.size.x
				var v := portrait_uv.position.y + (0.5 + dir.y * 0.5) * portrait_uv.size.y
				uvs.append(Vector2(u, v))
				cols.append(Color.WHITE)
			draw_polygon(pts, cols, uvs, portrait_tex)
		elif _font != null:
			var sz := _font.get_string_size(fallback_initial, HORIZONTAL_ALIGNMENT_LEFT, -1, roundi(r))
			draw_string(_font, c + Vector2(-sz.x * 0.5, sz.y * 0.28), fallback_initial, HORIZONTAL_ALIGNMENT_LEFT, -1, roundi(r), accent_color)
		draw_arc(c, r, 0.0, TAU, 40, accent_color, 2.3, true)
		draw_arc(c, r - 3.0, 0.0, TAU, 40, Color(accent_color.r, accent_color.g, accent_color.b, 0.42), 1.0, true)
		for k in range(8):
			var a := float(k) / 8.0 * TAU
			var bead_r := 1.7 if k % 2 == 0 else 1.1
			draw_circle(c + Vector2(cos(a), sin(a)) * r, bead_r, Color("fff0ba", 0.86 if k % 2 == 0 else 0.52))
		var gem := c + Vector2(0.0, -r)
		var d := PackedVector2Array([gem + Vector2(0, -3.8), gem + Vector2(3.8, 0), gem + Vector2(0, 3.8), gem + Vector2(-3.8, 0)])
		draw_colored_polygon(d, Color("fff4c8"))

class FiligreeBubbleArt extends Control:
	var tail_direction := 1 # 1 = down, -1 = up, 0 = none
	var tail_x_ratio := 0.5
	var vellum_tex: Texture2D
	var border_color := Color("cfa352")
	var bg_alpha := 0.76
	var compact := false

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var w := size.x
		var h := size.y
		if w < 24.0 or h < 24.0:
			return
		var pad_top := 12.0 if tail_direction == -1 else (7.0 if not compact else 4.0)
		var pad_bot := 13.0 if tail_direction == 1 else 6.0
		var box := Rect2(4.0, pad_top, w - 8.0, h - pad_top - pad_bot)
		var r := minf(18.0 if not compact else 14.0, minf(box.size.x, box.size.y) * 0.32)
		var tail_w := 11.0 if not compact else 8.5
		var tail_h := 11.5 if not compact else 9.0
		var tx := clampf(box.position.x + box.size.x * tail_x_ratio, box.position.x + r + tail_w + 8.0, box.end.x - r - tail_w - 8.0)

		var outer_poly := _rounded_bubble_poly(box, r, tail_direction, tx, tail_w, tail_h)
		var shadow_poly := PackedVector2Array()
		for pt in outer_poly:
			shadow_poly.append(pt + Vector2(0.0, 4.0))
		draw_colored_polygon(shadow_poly, Color(0.0, 0.0, 0.0, 0.34))

		var bg_col := Color(0.036, 0.082, 0.095, bg_alpha)
		draw_colored_polygon(outer_poly, bg_col)
		if vellum_tex != null:
			var inner_box := box.grow(-3.0)
			if inner_box.size.x > 16.0 and inner_box.size.y > 16.0:
				var tex_poly := _rounded_bubble_poly(inner_box, maxf(6.0, r - 3.0), 0, tx, 0.0, 0.0)
				var uvs := PackedVector2Array()
				var cols := PackedColorArray()
				for pt in tex_poly:
					uvs.append(Vector2((pt.x - inner_box.position.x) / inner_box.size.x, (pt.y - inner_box.position.y) / inner_box.size.y))
					cols.append(Color(0.92, 0.84, 0.68, 0.24))
				draw_polygon(tex_poly, cols, uvs, vellum_tex)

		# Artistic candlelight & parchment washes inside the bubble
		var glow_center := Vector2(box.position.x + (64.0 if not compact else 36.0), box.position.y + box.size.y * 0.44)
		for g in range(5, 0, -1):
			var frac := float(g) / 5.0
			draw_circle(glow_center, (86.0 if not compact else 42.0) * frac, Color(0.90, 0.68, 0.34, (1.0 - frac) * 0.068))
		var right_wash := Vector2(box.end.x - (56.0 if not compact else 28.0), box.position.y + box.size.y * 0.58)
		for g in range(4, 0, -1):
			var frac := float(g) / 4.0
			draw_circle(right_wash, (74.0 if not compact else 34.0) * frac, Color(0.22, 0.48, 0.44, (1.0 - frac) * 0.045))

		# Outer & double inset filigree rails
		var closed := PackedVector2Array(outer_poly)
		closed.append(outer_poly[0])
		draw_polyline(closed, Color(border_color.r, border_color.g, border_color.b, 0.94), 1.9, true)

		var inset_rect := box.grow(-4.5)
		var inset := _rounded_bubble_poly(inset_rect, maxf(6.0, r - 4.5), 0, tx, 0.0, 0.0)
		var inset_closed := PackedVector2Array(inset)
		inset_closed.append(inset[0])
		draw_polyline(inset_closed, Color(0.95, 0.85, 0.56, 0.40), 1.1, true)

		_draw_border_filigree(box, r, compact, tx)

	func _rounded_bubble_poly(rect: Rect2, r: float, tail_dir: int, tx: float, tw: float, th: float) -> PackedVector2Array:
		var pts := PackedVector2Array()
		var steps := 5
		# Top edge left -> right
		var tl := rect.position
		var tr := Vector2(rect.end.x, rect.position.y)
		var br := rect.end
		var bl := Vector2(rect.position.x, rect.end.y)
		if tail_dir == -1:
			pts.append(Vector2(tx - tw, tl.y))
			pts.append(Vector2(tx, tl.y - th))
			pts.append(Vector2(tx + tw, tl.y))
		for i in range(steps + 1):
			var a := -PI * 0.5 + float(i) / float(steps) * (PI * 0.5)
			pts.append(Vector2(tr.x - r, tr.y + r) + Vector2(cos(a), sin(a)) * r)
		for i in range(steps + 1):
			var a := float(i) / float(steps) * (PI * 0.5)
			pts.append(Vector2(br.x - r, br.y - r) + Vector2(cos(a), sin(a)) * r)
		if tail_dir == 1:
			pts.append(Vector2(tx + tw, br.y))
			pts.append(Vector2(tx, br.y + th))
			pts.append(Vector2(tx - tw, br.y))
		for i in range(steps + 1):
			var a := PI * 0.5 + float(i) / float(steps) * (PI * 0.5)
			pts.append(Vector2(bl.x + r, bl.y - r) + Vector2(cos(a), sin(a)) * r)
		for i in range(steps + 1):
			var a := PI + float(i) / float(steps) * (PI * 0.5)
			pts.append(Vector2(tl.x + r, tl.y + r) + Vector2(cos(a), sin(a)) * r)
		return pts

	func _draw_border_filigree(box: Rect2, r: float, is_mini: bool, tx: float) -> void:
		var gold := Color("e6be6c")
		var soft := Color(0.93, 0.81, 0.50, 0.72)
		var faint := Color(0.95, 0.85, 0.56, 0.36)
		var arm := 16.0 if not is_mini else 10.0
		var inset_pad := 6.5 if not is_mini else 5.0
		var corners := [
			[Vector2(box.position.x + inset_pad, box.position.y + inset_pad), Vector2(1, 0), Vector2(0, 1)],
			[Vector2(box.end.x - inset_pad, box.position.y + inset_pad), Vector2(-1, 0), Vector2(0, 1)],
			[Vector2(box.end.x - inset_pad, box.end.y - inset_pad), Vector2(-1, 0), Vector2(0, -1)],
			[Vector2(box.position.x + inset_pad, box.end.y - inset_pad), Vector2(1, 0), Vector2(0, -1)],
		]
		for c in corners:
			var p: Vector2 = c[0]
			var dx: Vector2 = c[1]
			var dy: Vector2 = c[2]
			var corner_pt := p + dx * 2.0 + dy * 2.0
			# Outer & scrolled Greek-key volute brackets
			draw_line(corner_pt, corner_pt + dx * arm, soft, 1.5, true)
			draw_line(corner_pt, corner_pt + dy * arm, soft, 1.5, true)
			var inner_c := corner_pt + dx * 4.5 + dy * 4.5
			draw_line(inner_c, inner_c + dx * (arm * 0.65), faint, 1.1, true)
			draw_line(inner_c, inner_c + dy * (arm * 0.65), faint, 1.1, true)
			draw_line(inner_c + dx * (arm * 0.65), inner_c + dx * (arm * 0.65) - dy * 2.5, faint, 1.0, true)
			draw_line(inner_c + dy * (arm * 0.65), inner_c + dy * (arm * 0.65) - dx * 2.5, faint, 1.0, true)
			var stud := PackedVector2Array([
				corner_pt + Vector2(0, -2.8), corner_pt + Vector2(2.8, 0),
				corner_pt + Vector2(0, 2.8), corner_pt + Vector2(-2.8, 0)
			])
			draw_colored_polygon(stud, Color("f8e6ae"))

		# Cenefa frieze (repeating diamond & bead frieze) along top and bottom rails
		var step := 18.0 if not is_mini else 14.0
		var x_start := box.position.x + r + arm * 0.65 + 6.0
		var x_end := box.end.x - r - arm * 0.65 - 6.0
		var mid_x := box.position.x + box.size.x * 0.5
		if x_end > x_start + step:
			var x := x_start
			var idx := 0
			while x <= x_end:
				var skip_top := (not is_mini and absf(x - mid_x) < 46.0) or (tail_direction == -1 and absf(x - tx) < 16.0)
				if not skip_top:
					var pt_t := Vector2(x, box.position.y + 4.5)
					if idx % 2 == 0:
						draw_colored_polygon(PackedVector2Array([
							pt_t + Vector2(0, -2.0), pt_t + Vector2(2.4, 0),
							pt_t + Vector2(0, 2.0), pt_t + Vector2(-2.4, 0)
						]), Color(gold, 0.58))
					else:
						draw_circle(pt_t, 1.1, Color(gold, 0.42))
				var skip_bot := (not is_mini and absf(x - mid_x) < 18.0) or (tail_direction == 1 and absf(x - tx) < 16.0)
				if not skip_bot:
					var pt_b := Vector2(x, box.end.y - 4.5)
					if idx % 2 == 0:
						draw_colored_polygon(PackedVector2Array([
							pt_b + Vector2(0, -2.0), pt_b + Vector2(2.4, 0),
							pt_b + Vector2(0, 2.0), pt_b + Vector2(-2.4, 0)
						]), Color(gold, 0.58))
					else:
						draw_circle(pt_b, 1.1, Color(gold, 0.42))
				x += step
				idx += 1

		if is_mini:
			return
		# Upper ornamental crest arch + central diamond & bottom finial
		var top_y := box.position.y
		var crest := PackedVector2Array()
		for i in range(17):
			var frac := float(i) / 16.0
			var cx := lerpf(mid_x - 46.0, mid_x + 46.0, frac)
			var cy := top_y - sin(frac * PI) * 7.5
			crest.append(Vector2(cx, cy))
		draw_polyline(crest, Color(gold, 0.92), 1.6, true)
		var gem := Vector2(mid_x, top_y - 7.0)
		draw_colored_polygon(PackedVector2Array([
			gem + Vector2(0, -4.8), gem + Vector2(4.8, 0),
			gem + Vector2(0, 4.8), gem + Vector2(-4.8, 0)
		]), Color("fff2c4"))
		var bot_gem := Vector2(mid_x, box.end.y - 4.5)
		draw_colored_polygon(PackedVector2Array([
			bot_gem + Vector2(0, -3.2), bot_gem + Vector2(3.2, 0),
			bot_gem + Vector2(0, 3.2), bot_gem + Vector2(-3.2, 0)
		]), Color(gold, 0.85))
		for side in [-1.0, 1.0]:
			draw_circle(Vector2(mid_x + side * 52.0, top_y), 2.0, Color(gold, 0.78))
			var edge_y := box.position.y + box.size.y * 0.5
			var edge_x := box.end.x if side > 0 else box.position.x
			draw_line(Vector2(edge_x, edge_y - 14.0), Vector2(edge_x, edge_y + 14.0), Color(gold, 0.55), 1.3, true)
			draw_colored_polygon(PackedVector2Array([
				Vector2(edge_x, edge_y - 3.6), Vector2(edge_x + 3.6, edge_y),
				Vector2(edge_x, edge_y + 3.6), Vector2(edge_x - 3.6, edge_y)
			]), Color(gold, 0.88))

static var _portrait_cache: Dictionary = {}

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

var _root_vb: VBoxContainer
var _bubble_holder: Control
var _bubble_art: FiligreeBubbleArt
var _portrait_badge: PortraitMedallion
var _hero_badge: PortraitMedallion
var _echo_lbl: Label
var _speech_scroll: ScrollContainer
var _active_speech_lbl: RichTextLabel
var _history_toggle_btn: Button
var _history_expanded := false
var _speaker_actor: Node3D
var _hero_actor: Node3D
var _camera: Camera3D
var _topic_tags: Array = []
var _vellum_tex: Texture2D

var _caption_art: FiligreeBubbleArt
var _caption_portrait: PortraitMedallion
var _caption_actor: Node3D
var _caption_cam: Camera3D

var _hero_echo_panel: Control
var _hero_echo_art: FiligreeBubbleArt
var _hero_echo_lbl: Label
var _hero_echo_until := 0.0

var _full_speech := ""
var _reveal_chars := 0.0
var _revealing := false

func _ready() -> void:
	name = "RetreatConversations"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_vellum_tex = ThemeKit.load_ui_texture(VELLUM_PATH)
	_build_caption()
	_build_hero_echo()
	_build_dialogue()
	resized.connect(_resize_panel)
	_resize_panel()

func bind_context(speaker: Node3D, hero: Node3D, cam: Camera3D, topic_tags: Array = []) -> void:
	_speaker_actor = speaker
	_hero_actor = hero
	_camera = cam
	_topic_tags = topic_tags.duplicate()

func _build_dialogue() -> void:
	panel = Panel.new()
	panel.name = "ConversationPanel"
	var empty_box := StyleBoxEmpty.new()
	panel.add_theme_stylebox_override("panel", empty_box)
	panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	panel.clip_contents = false
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(panel)
	panel.resized.connect(_position_dialogue)

	_root_vb = VBoxContainer.new()
	_root_vb.add_theme_constant_override("separation", 10)
	_root_vb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(_root_vb)
	_root_vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root_vb.offset_left = 0
	_root_vb.offset_right = 0
	_root_vb.offset_top = 0
	_root_vb.offset_bottom = -8

	_bubble_holder = Control.new()
	_bubble_holder.name = "CartelaBubbleHolder"
	_bubble_holder.mouse_filter = Control.MOUSE_FILTER_STOP
	_bubble_holder.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed and _revealing:
			_finish_reveal()
	)
	_root_vb.add_child(_bubble_holder)

	_bubble_art = FiligreeBubbleArt.new()
	_bubble_art.vellum_tex = _vellum_tex
	_bubble_art.tail_direction = -1
	_bubble_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bubble_holder.add_child(_bubble_art)

	var content := VBoxContainer.new()
	content.clip_contents = true
	content.add_theme_constant_override("separation", 5)
	content.set_anchors_preset(Control.PRESET_FULL_RECT)
	content.offset_left = 48
	content.offset_right = -18
	content.offset_top = 18
	content.offset_bottom = -16
	_bubble_holder.add_child(content)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	content.add_child(row)

	var names := HBoxContainer.new()
	names.add_theme_constant_override("separation", 8)
	names.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(names)

	header = ThemeKit.make_title("", 20, ThemeKit.COL_GOLD_BRIGHT)
	names.add_child(header)

	subtitle = ThemeKit.make_label("", 13, Color("#b9c7c0"))
	subtitle.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	subtitle.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	subtitle.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	names.add_child(subtitle)

	_history_toggle_btn = Button.new()
	_history_toggle_btn.text = "▤ Crónica"
	_history_toggle_btn.tooltip_text = "Ver o contraer el historial de la conversación"
	ThemeKit.style_button(_history_toggle_btn, "ghost", 6, 8, 3)
	_history_toggle_btn.add_theme_font_size_override("font_size", 12)
	_history_toggle_btn.pressed.connect(func():
		_history_expanded = not _history_expanded
		if _history_expanded and _revealing:
			_finish_reveal()
		_sync_history_visibility()
		_resize_panel()
		if _history_expanded:
			_scroll_to_end.call_deferred()
	)
	row.add_child(_history_toggle_btn)

	var leave := Button.new()
	leave.text = "Esc · ✕"
	leave.tooltip_text = "Cerrar la conversación (Esc)"
	ThemeKit.style_button(leave, "ghost", 6, 8, 3)
	leave.add_theme_font_size_override("font_size", 12)
	leave.pressed.connect(func(): finished.emit())
	row.add_child(leave)

	var sep := ColorRect.new()
	sep.custom_minimum_size.y = 1
	sep.color = Color(ThemeKit.COL_GOLD.r, ThemeKit.COL_GOLD.g, ThemeKit.COL_GOLD.b, 0.28)
	content.add_child(sep)

	_echo_lbl = ThemeKit.make_label("", 13, Color("#99b9cf"), false, true)
	_echo_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_echo_lbl.hide()
	content.add_child(_echo_lbl)

	_speech_scroll = ScrollContainer.new()
	_speech_scroll.custom_minimum_size.y = 0
	_speech_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_speech_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_speech_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_speech_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_style_scrollbar(_speech_scroll.get_v_scroll_bar())
	content.add_child(_speech_scroll)

	var speech_margin := MarginContainer.new()
	speech_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	speech_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speech_margin.add_theme_constant_override("margin_right", 8)
	_speech_scroll.add_child(speech_margin)

	_active_speech_lbl = RichTextLabel.new()
	_active_speech_lbl.bbcode_enabled = true
	_active_speech_lbl.fit_content = true
	_active_speech_lbl.scroll_active = false
	_active_speech_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_active_speech_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_active_speech_lbl.add_theme_font_override("normal_font", ThemeKit.get_body_font(false, false))
	_active_speech_lbl.add_theme_font_override("italics_font", ThemeKit.get_body_font(false, true))
	_active_speech_lbl.add_theme_font_override("bold_font", ThemeKit.get_body_font(true, false))
	_active_speech_lbl.add_theme_font_size_override("normal_font_size", 18)
	_active_speech_lbl.add_theme_font_size_override("italics_font_size", 17)
	_active_speech_lbl.add_theme_color_override("default_color", Color("#f2ead7"))
	speech_margin.add_child(_active_speech_lbl)

	scroll = ScrollContainer.new()
	scroll.custom_minimum_size.y = 0
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_style_scrollbar(scroll.get_v_scroll_bar())
	scroll.hide()
	content.add_child(scroll)

	var transcript_margin := MarginContainer.new()
	transcript_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	transcript_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	transcript_margin.add_theme_constant_override("margin_right", 8)
	scroll.add_child(transcript_margin)

	transcript = VBoxContainer.new()
	transcript.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	transcript.add_theme_constant_override("separation", 8)
	transcript_margin.add_child(transcript)

	_portrait_badge = PortraitMedallion.new()
	_portrait_badge.name = "SpeakerPortraitMedallion"
	_portrait_badge.size = Vector2(72, 72)
	_portrait_badge.position = Vector2(-28, 12)
	_bubble_holder.add_child(_portrait_badge)

	# Floating choice pills below bubble (no outer box)
	choices = VBoxContainer.new()
	choices.name = "FloatingDialogueChoices"
	choices.add_theme_constant_override("separation", 5)
	choices.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_root_vb.add_child(choices)

	composer = HBoxContainer.new()
	composer.add_theme_constant_override("separation", 8)
	_root_vb.add_child(composer)

	_hero_badge = PortraitMedallion.new()
	_hero_badge.custom_minimum_size = Vector2(36, 36)
	_hero_badge.active_glow = false
	composer.add_child(_hero_badge)

	message = LineEdit.new()
	message.placeholder_text = "Escribe como tu personaje (Enter para hablar)..."
	message.max_length = 180
	message.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	message.add_theme_font_override("font", ThemeKit.get_body_font())
	message.add_theme_font_size_override("font_size", 16)
	message.add_theme_stylebox_override("normal", ThemeKit.make_panel_style(Color(0.04, 0.09, 0.11, 0.86), Color(ThemeKit.COL_GOLD, 0.65), 10, 12, 6, 1))
	message.add_theme_stylebox_override("focus", ThemeKit.make_panel_style(Color(0.06, 0.13, 0.15, 0.94), ThemeKit.COL_GOLD_BRIGHT, 10, 12, 6, 1))
	message.text_submitted.connect(_send_party_line)
	composer.add_child(message)

	var send := Button.new()
	send.text = "Decir"
	ThemeKit.style_button(send, "primary", 9, 14, 6)
	send.pressed.connect(func(): _send_party_line(message.text))
	composer.add_child(send)
	panel.hide()

func _build_caption() -> void:
	caption = PanelContainer.new()
	caption.name = "OverheardConversation"
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	add_child(caption)

	_caption_art = FiligreeBubbleArt.new()
	_caption_art.vellum_tex = _vellum_tex
	_caption_art.tail_direction = 1
	_caption_art.compact = true
	_caption_art.bg_alpha = 0.76
	_caption_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	caption.add_child(_caption_art)

	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_bottom", 18)
	caption.add_child(margin)

	var hbox := HBoxContainer.new()
	hbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hbox.add_theme_constant_override("separation", 10)
	margin.add_child(hbox)

	_caption_portrait = PortraitMedallion.new()
	_caption_portrait.custom_minimum_size = Vector2(44, 44)
	_caption_portrait.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	_caption_portrait.active_glow = false
	hbox.add_child(_caption_portrait)

	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.custom_minimum_size.x = 228
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 2)
	hbox.add_child(content)

	caption_name = ThemeKit.make_title("", 13, ThemeKit.COL_GOLD_BRIGHT)
	caption_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(caption_name)

	caption_line = ThemeKit.make_label("", 15, Color("#f1e9d8"))
	caption_line.custom_minimum_size.x = 228.0
	caption_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	caption_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(caption_line)
	caption.hide()

func _build_hero_echo() -> void:
	_hero_echo_panel = Control.new()
	_hero_echo_panel.name = "HeroDialogueEcho"
	_hero_echo_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hero_echo_panel.size = Vector2(260, 56)
	add_child(_hero_echo_panel)

	_hero_echo_art = FiligreeBubbleArt.new()
	_hero_echo_art.vellum_tex = _vellum_tex
	_hero_echo_art.tail_direction = 1
	_hero_echo_art.compact = true
	_hero_echo_art.bg_alpha = 0.78
	_hero_echo_art.border_color = Color("7ab7f0")
	_hero_echo_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hero_echo_panel.add_child(_hero_echo_art)

	_hero_echo_lbl = ThemeKit.make_label("", 14, Color("#dceeff"), false, true)
	_hero_echo_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hero_echo_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hero_echo_lbl.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hero_echo_lbl.offset_left = 14
	_hero_echo_lbl.offset_right = -14
	_hero_echo_lbl.offset_top = 8
	_hero_echo_lbl.offset_bottom = -16
	_hero_echo_panel.add_child(_hero_echo_lbl)
	_hero_echo_panel.hide()

func _process(delta: float) -> void:
	if _revealing and panel.visible:
		_reveal_chars += delta * TYPEWRITER_CPS
		var target_len := _active_speech_lbl.get_total_character_count()
		if int(_reveal_chars) >= target_len:
			_finish_reveal()
		else:
			_active_speech_lbl.visible_characters = int(_reveal_chars)

	if _hero_echo_panel.visible:
		if Time.get_ticks_msec() / 1000.0 >= _hero_echo_until or not panel.visible or not is_instance_valid(_hero_actor):
			_hero_echo_panel.hide()
		else:
			_position_above_actor(_hero_echo_panel, _hero_actor, _camera, 0.22)

	if panel.visible and is_instance_valid(_speaker_actor) and is_instance_valid(_camera) and not party_mode:
		_update_speaker_tail()

	if caption.visible and is_instance_valid(_caption_actor) and is_instance_valid(_caption_cam):
		var above := _caption_actor.global_position + Vector3.UP * (float(_caption_actor.target_height) + 0.18)
		if panel.visible or not _caption_cam.is_position_in_frustum(above):
			caption.hide()
		else:
			_position_above_actor(caption, _caption_actor, _caption_cam, 0.18)

func _input(event: InputEvent) -> void:
	if not panel.visible:
		return
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN, MOUSE_BUTTON_WHEEL_LEFT, MOUSE_BUTTON_WHEEL_RIGHT]:
			var over_bubble := _is_mouse_over(_bubble_holder)
			var over_panel := _is_mouse_over(panel)
			if over_bubble or over_panel:
				if mb.is_pressed() and over_bubble and (mb.button_index == MOUSE_BUTTON_WHEEL_UP or mb.button_index == MOUSE_BUTTON_WHEEL_DOWN):
					var step := 42.0 * (mb.factor if mb.factor > 0.0 else 1.0)
					_scroll_by((-1.0 if mb.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0) * step)
				get_viewport().set_input_as_handled()
				return
	elif event is InputEventPanGesture:
		var pg := event as InputEventPanGesture
		if _is_mouse_over(_bubble_holder) or _is_mouse_over(panel):
			_scroll_by(pg.delta.y * 28.0)
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek := event as InputEventKey
		if ek.ctrl_pressed or ek.alt_pressed or ek.meta_pressed:
			return
		if ek.keycode == KEY_ESCAPE:
			finished.emit()
			get_viewport().set_input_as_handled()
			return
		if party_mode:
			return
		if ek.keycode == KEY_SPACE and _revealing:
			_finish_reveal()
			get_viewport().set_input_as_handled()
			return
		var idx := -1
		if ek.keycode >= KEY_1 and ek.keycode <= KEY_9:
			idx = ek.keycode - KEY_1
		elif ek.keycode >= KEY_KP_1 and ek.keycode <= KEY_KP_9:
			idx = ek.keycode - KEY_KP_1
		if idx >= 0 and idx < choices.get_child_count():
			var btn := choices.get_child(idx) as Button
			if is_instance_valid(btn) and not btn.disabled:
				btn.pressed.emit()
				get_viewport().set_input_as_handled()

func _is_mouse_over(ctrl: Control) -> bool:
	if not is_instance_valid(ctrl) or not ctrl.is_visible_in_tree():
		return false
	return Rect2(Vector2.ZERO, ctrl.size).has_point(ctrl.get_local_mouse_position())

func _active_scroll_target() -> ScrollContainer:
	if scroll.visible:
		return scroll
	if _speech_scroll.visible:
		return _speech_scroll
	return null

func _scroll_by(delta_px: float) -> void:
	var target := _active_scroll_target()
	if target == null:
		return
	var bar := target.get_v_scroll_bar()
	var max_scroll := maxi(0, ceili(bar.max_value - bar.page))
	if max_scroll <= 0:
		return
	target.scroll_vertical = clampi(target.scroll_vertical + roundi(delta_px), 0, max_scroll)

func _style_scrollbar(bar: VScrollBar) -> void:
	if bar == null:
		return
	bar.custom_minimum_size.x = 8.0
	var track := StyleBoxFlat.new()
	track.bg_color = Color(0.02, 0.05, 0.06, 0.55)
	track.border_color = Color(ThemeKit.COL_GOLD.r, ThemeKit.COL_GOLD.g, ThemeKit.COL_GOLD.b, 0.25)
	track.set_border_width_all(1)
	track.set_corner_radius_all(4)
	var grab := StyleBoxFlat.new()
	grab.bg_color = Color(0.82, 0.65, 0.33, 0.74)
	grab.set_corner_radius_all(4)
	var grab_hov := StyleBoxFlat.new()
	grab_hov.bg_color = Color(0.95, 0.81, 0.46, 0.92)
	grab_hov.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("scroll", track)
	bar.add_theme_stylebox_override("grabber", grab)
	bar.add_theme_stylebox_override("grabber_highlight", grab_hov)
	bar.add_theme_stylebox_override("grabber_pressed", grab_hov)

func open_lines(title: String, context: String, history: Array, topics: Array, local_party := false) -> void:
	party_mode = local_party
	_history_expanded = local_party
	header.text = title
	subtitle.text = context
	_echo_lbl.hide()
	_echo_lbl.text = ""
	_clear_children(transcript)
	_clear_children(choices)
	for line: Dictionary in history:
		append_line(line.speaker, line.text, line.get("hero", false))
	_refresh_portraits()
	for i in range(topics.size()):
		var topic: Array = topics[i]
		var tag := str(_topic_tags[i]) if i < _topic_tags.size() else _infer_tag(topic)
		var button := Button.new()
		var label_txt := "%d · %s" % [i + 1, str(topic[0])]
		if not tag.is_empty():
			label_txt = "%d · [%s] %s" % [i + 1, tag, str(topic[0])]
		button.text = label_txt
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.tooltip_text = "%s (Tecla %d)" % [str(topic[0]), i + 1]
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.custom_minimum_size = Vector2(minf(520.0, maxf(300.0, size.x - 96.0)), 34)
		_style_choice_pill(button, not tag.is_empty())
		button.pressed.connect(func(): choice_selected.emit(i))
		choices.add_child(button)
	choices.visible = not local_party
	composer.visible = local_party
	_history_toggle_btn.visible = not local_party
	_sync_history_visibility()
	caption.hide()
	panel.modulate.a = 0.0
	panel.show()
	_resize_panel()
	_resize_panel.call_deferred()
	var tw := create_tween()
	tw.tween_property(panel, "modulate:a", 1.0, 0.16)
	if local_party:
		message.grab_focus()

func _style_choice_pill(btn: Button, highlighted: bool) -> void:
	var bg_norm := Color(0.075, 0.145, 0.128, 0.78) if highlighted else Color(0.036, 0.082, 0.095, 0.74)
	var bg_hov := Color(0.135, 0.245, 0.205, 0.90) if highlighted else Color(0.085, 0.165, 0.185, 0.88)
	var border_norm := Color("f0ce79") if highlighted else Color(ThemeKit.COL_GOLD.r, ThemeKit.COL_GOLD.g, ThemeKit.COL_GOLD.b, 0.50)
	var norm := ThemeKit.make_panel_style(bg_norm, border_norm, 10, 14, 5, 1)
	if highlighted:
		norm.border_width_left = 4
	norm.shadow_size = 5
	var hov := ThemeKit.make_panel_style(bg_hov, ThemeKit.COL_GOLD_BRIGHT, 10, 14, 5, 1)
	if highlighted:
		hov.border_width_left = 4
	hov.shadow_size = 8
	btn.add_theme_stylebox_override("normal", norm)
	btn.add_theme_stylebox_override("hover", hov)
	btn.add_theme_stylebox_override("pressed", hov)
	btn.add_theme_stylebox_override("focus", hov)
	btn.add_theme_font_override("font", ThemeKit.get_body_font())
	btn.add_theme_font_size_override("font_size", 16)
	btn.add_theme_color_override("font_color", Color("#f8eac0") if highlighted else Color("#eae2d0"))
	btn.add_theme_color_override("font_hover_color", Color("#ffffff"))

func _infer_tag(topic: Array) -> String:
	var raw := str(topic[0])
	if raw.begins_with("["):
		return ""
	if topic.size() >= 3 and not str(topic[2]).is_empty():
		return "Gesto"
	return ""

func append_line(speaker: String, text: String, hero: bool) -> void:
	if transcript.get_child_count() >= 36:
		var first := transcript.get_child(0)
		transcript.remove_child(first)
		first.queue_free()
	var entry := VBoxContainer.new()
	entry.add_theme_constant_override("separation", 1)
	transcript.add_child(entry)
	entry.add_child(ThemeKit.make_title(speaker, 12, Color("#88bde8") if hero else ThemeKit.COL_GOLD_BRIGHT))
	var words := ThemeKit.make_label(text, 17, Color("#eee6d4"))
	words.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	entry.add_child(words)
	if hero:
		if not party_mode:
			_echo_lbl.text = "%s: «%s»" % [speaker, text]
			_echo_lbl.show()
			_show_hero_echo(text)
	else:
		_set_active_speech(text)
	if panel.visible:
		_resize_panel.call_deferred()
	_scroll_to_end.call_deferred()

func _set_active_speech(raw: String) -> void:
	_full_speech = raw
	_active_speech_lbl.text = _format_bg3_bbcode(raw)
	_active_speech_lbl.visible_characters = 0
	_reveal_chars = 0.0
	_revealing = true
	if _speech_scroll != null:
		_speech_scroll.scroll_vertical = 0

func _finish_reveal() -> void:
	_revealing = false
	_active_speech_lbl.visible_characters = -1

func _format_bg3_bbcode(raw: String) -> String:
	var safe := raw.replace("[", "[lb]")
	var open_q := safe.find("«")
	if open_q > 0:
		var beat := safe.substr(0, open_q).strip_edges()
		var spoken := safe.substr(open_q)
		return "[i][color=#d6be86]%s[/color][/i]\n%s" % [beat, spoken]
	return safe

func _show_hero_echo(text: String) -> void:
	if not is_instance_valid(_hero_actor) or not is_instance_valid(_camera):
		return
	var short_txt := text if text.length() <= 68 else text.substr(0, 65) + "…"
	_hero_echo_lbl.text = "«%s»" % short_txt
	_hero_echo_panel.size = Vector2(clampf(float(short_txt.length()) * 6.8 + 44.0, 150.0, 270.0), 58.0)
	_hero_echo_until = Time.get_ticks_msec() / 1000.0 + 2.3
	_position_above_actor(_hero_echo_panel, _hero_actor, _camera, 0.22)
	_hero_echo_panel.show()

func _sync_history_visibility() -> void:
	var show_history := party_mode or _history_expanded
	scroll.visible = show_history
	_speech_scroll.visible = not show_history
	if show_history:
		_echo_lbl.hide()
	else:
		_echo_lbl.visible = not _echo_lbl.text.is_empty()
	if _history_toggle_btn != null:
		_history_toggle_btn.text = "✕ Volver" if _history_expanded else "▤ Crónica"
		ThemeKit.style_button(_history_toggle_btn, "primary" if _history_expanded else "ghost", 6, 8, 3)

func _scroll_to_end() -> void:
	var bar := scroll.get_v_scroll_bar()
	scroll.scroll_vertical = maxi(0, ceili(bar.max_value - bar.page))

func _resize_panel() -> void:
	var width := minf(610.0, maxf(500.0, size.x - 40.0))
	if size.x < 540.0:
		width = maxf(240.0, size.x - 32.0)
	var pill_w := minf(width - 36.0, 556.0)
	for child in choices.get_children():
		if child is Button:
			(child as Button).custom_minimum_size.x = pill_w
	var choice_count := choices.get_child_count() if not party_mode else 0
	var choices_h := (float(choice_count) * 37.0 + 12.0) if not party_mode else 46.0
	var max_panel_h := maxf(190.0, size.y - 76.0)
	var max_bubble_h := maxf(104.0, max_panel_h - choices_h - 18.0)
	scroll.custom_minimum_size.y = 0.0
	_speech_scroll.custom_minimum_size.y = 0.0
	if party_mode:
		_bubble_holder.custom_minimum_size.y = clampf(184.0 if size.y >= 570.0 else 142.0, 112.0, max_bubble_h)
	elif _history_expanded:
		_bubble_holder.custom_minimum_size.y = clampf(236.0, 148.0, max_bubble_h)
	else:
		var line_count := maxi(1, ceili(float(_full_speech.length()) / 58.0))
		if _full_speech.find("«") > 0:
			line_count += 1
		var echo_h := 24.0 if _echo_lbl.visible else 0.0
		_bubble_holder.custom_minimum_size.y = clampf(86.0 + float(line_count) * 23.0 + echo_h, 102.0, minf(220.0, max_bubble_h))
	var height := _bubble_holder.custom_minimum_size.y + choices_h + 16.0
	panel.size = Vector2(width, minf(height, max_panel_h))
	_position_dialogue()

func _position_dialogue() -> void:
	var target_x := (size.x - panel.size.x) * 0.5
	if not party_mode and is_instance_valid(_speaker_actor) and is_instance_valid(_camera):
		if _camera.is_position_in_frustum(_speaker_actor.global_position):
			var sp := _camera.unproject_position(_speaker_actor.global_position)
			target_x = clampf(sp.x - panel.size.x * 0.5, 42.0, maxf(42.0, size.x - panel.size.x - 24.0))
	panel.position = Vector2(target_x, maxf(64.0, size.y - panel.size.y - 24.0))
	_update_speaker_tail()

func _update_speaker_tail() -> void:
	if _bubble_art == null:
		return
	if party_mode or not is_instance_valid(_speaker_actor) or not is_instance_valid(_camera):
		_bubble_art.tail_direction = 0
		_bubble_art.queue_redraw()
		return
	var head := _speaker_actor.global_position + Vector3.UP * float(_speaker_actor.get("target_height"))
	if not _camera.is_position_in_frustum(head):
		_bubble_art.tail_direction = 0
		_bubble_art.queue_redraw()
		return
	var p := _camera.unproject_position(head)
	var b_rect := _bubble_holder.get_global_rect()
	_bubble_art.tail_direction = -1 if p.y <= b_rect.position.y + 18.0 else 1
	_bubble_art.tail_x_ratio = clampf((p.x - b_rect.position.x) / maxf(1.0, b_rect.size.x), 0.16, 0.88)
	_bubble_art.queue_redraw()

func display_caption(actor: Node3D, text: String, view: Camera3D) -> void:
	_caption_actor = actor
	_caption_cam = view
	var above := actor.global_position + Vector3.UP * (float(actor.target_height) + 0.18)
	if panel.visible or not view.is_position_in_frustum(above):
		caption.hide()
		return
	if caption_line.text != text or caption_name.text != actor.token_name:
		caption_line.text = text
		caption_name.text = actor.token_name
		var info := _resolve_portrait(actor)
		_caption_portrait.set_portrait(info.tex, info.uv, str(actor.token_name).left(1).to_upper(), ThemeKit.COL_GOLD)
		caption.size = Vector2(312.0, 0.0)
		caption.reset_size()
		caption.reset_size.call_deferred()
	elif caption.size.y > caption.get_combined_minimum_size().y + 4.0:
		caption.reset_size()
	_position_above_actor(caption, actor, view, 0.18)
	caption.show()

func _position_above_actor(ctrl: Control, actor: Node3D, view: Camera3D, y_pad: float) -> void:
	var above := actor.global_position + Vector3.UP * (float(actor.get("target_height")) + y_pad)
	if not view.is_position_in_frustum(above):
		return
	var point := view.unproject_position(above)
	ctrl.position = Vector2(
		clampf(point.x - ctrl.size.x * 0.5, 18.0, maxf(18.0, size.x - ctrl.size.x - 14.0)),
		clampf(point.y - ctrl.size.y - 6.0, 68.0, maxf(68.0, size.y - ctrl.size.y - 90.0))
	)

func close() -> void:
	message.release_focus()
	message.clear()
	_revealing = false
	_hero_echo_panel.hide()
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

func _refresh_portraits() -> void:
	var sp_info := _resolve_portrait(_speaker_actor)
	var sp_initial := header.text.left(1).to_upper() if not header.text.is_empty() else "?"
	_portrait_badge.set_portrait(sp_info.tex, sp_info.uv, sp_initial, ThemeKit.COL_GOLD_BRIGHT)
	var hero_info := _resolve_portrait(_hero_actor)
	var h_name := str(_hero_actor.get("token_name")) if is_instance_valid(_hero_actor) else "H"
	_hero_badge.set_portrait(hero_info.tex, hero_info.uv, h_name.left(1).to_upper(), Color("7ab7f0"))

static func _resolve_portrait(actor: Node3D) -> Dictionary:
	if not is_instance_valid(actor):
		return {"tex": null, "uv": Rect2(0, 0, 1, 1)}
	var key := str(actor.get("char_key"))
	if key.is_empty():
		key = str(actor.get("token_name")).to_lower()
	if _portrait_cache.has(key):
		return _portrait_cache[key]
	var tex: Texture2D = null
	var profile_val = actor.get("char_profile")
	if profile_val is Dictionary:
		var idle_dir: Dictionary = profile_val.get("dir_idle", {})
		for d in ["se", "s", "sw", "e"]:
			var clip: Dictionary = idle_dir.get(d, {})
			var frames: Array = clip.get("frames", [])
			if not frames.is_empty() and frames[0].get("tex") is Texture2D:
				tex = frames[0].tex
				break
		if tex == null:
			var idle_frames: Array = profile_val.get("clips", {}).get("idle", {}).get("frames", [])
			if not idle_frames.is_empty() and idle_frames[0].get("tex") is Texture2D:
				tex = idle_frames[0].tex
	if tex == null:
		var sp := actor.get("sprite") as Sprite3D
		if sp != null and sp.texture != null:
			tex = sp.texture
	var uv := Rect2(0.08, 0.02, 0.84, 0.56)
	if tex != null:
		var img := tex.get_image()
		if img != null and not img.is_empty():
			var used := img.get_used_rect()
			if used.size.x > 8 and used.size.y > 8:
				var iw := float(img.get_width())
				var ih := float(img.get_height())
				var side := clampf(maxf(float(used.size.x) * 0.92, float(used.size.y) * 0.54), 24.0, minf(iw, ih))
				var cx := (float(used.position.x) + float(used.size.x) * 0.5)
				var top := maxf(0.0, float(used.position.y) - side * 0.06)
				var left := clampf(cx - side * 0.5, 0.0, maxf(0.0, iw - side))
				var top_c := clampf(top, 0.0, maxf(0.0, ih - side))
				uv = Rect2(left / iw, top_c / ih, side / iw, side / ih)
	var result := {"tex": tex, "uv": uv}
	if not key.is_empty() and tex != null:
		_portrait_cache[key] = result
	return result
