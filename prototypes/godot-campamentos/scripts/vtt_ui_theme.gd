class_name VttUiTheme
extends RefCounted

# Paleta y estilos canónicos de Dungeons VTT (paridad con apps/web/common.css, dm.css, player.css y projector.css)

const COL_BG := Color(0.027, 0.067, 0.082, 0.94)        # #071115
const COL_PANEL := Color(0.035, 0.082, 0.094, 0.92)     # #091518
const COL_PANEL_DEEP := Color(0.024, 0.055, 0.067, 0.96)
const COL_SURFACE := Color(0.063, 0.129, 0.149, 0.95)   # #102126
const COL_SURFACE_HOVER := Color(0.095, 0.185, 0.215, 0.98)
const COL_BORDER := Color(0.212, 0.325, 0.353, 0.88)    # #36535a
const COL_BORDER_SOFT := Color(0.286, 0.376, 0.400, 0.48)
const COL_GOLD := Color(0.824, 0.678, 0.388, 1.0)       # #d2ad63
const COL_GOLD_BRIGHT := Color(0.945, 0.847, 0.584, 1.0)# #f1d895
const COL_GOLD_BG := Color(0.824, 0.678, 0.388, 0.18)
const COL_INK := Color(0.906, 0.878, 0.816, 1.0)        # #e7e0d0
const COL_HEADING := Color(0.945, 0.875, 0.729, 1.0)    # #f1dfba
const COL_MUTED := Color(0.612, 0.663, 0.651, 1.0)      # #9ca9a6
const COL_GREEN := Color(0.396, 0.761, 0.541, 1.0)      # #65c28a
const COL_DANGER := Color(0.729, 0.294, 0.294, 1.0)     # #ba4b4b
const COL_DANGER_TEXT := Color(0.937, 0.514, 0.514, 1.0)# #ef8383
const COL_COMBAT := Color(0.333, 0.722, 1.0, 1.0)       # #55b8ff

const FONT_TITLE_PATH := "res://assets/ui/fonts/Metamorphous-Regular.ttf"
const FONT_BODY_PATH := "res://assets/ui/fonts/Almendra-Regular.ttf"
const FONT_BODY_BOLD_PATH := "res://assets/ui/fonts/Almendra-Bold.ttf"
const FONT_BODY_ITALIC_PATH := "res://assets/ui/fonts/Almendra-Italic.ttf"

const SIGN_DRAGON_PLAQUE_PATH := "res://assets/ui/signs/sign_dragon_plaque.png"
const SIGN_DRAGON_POST_PATH := "res://assets/ui/signs/sign_dragon_post.png"
const SIGN_HANGING_ROPES_PATH := "res://assets/ui/signs/sign_hanging_ropes.png"

static var _font_cache: Dictionary = {}
static var _tex_cache: Dictionary = {}

static func load_ui_font(res_path: String) -> Font:
	if _font_cache.has(res_path):
		return _font_cache[res_path] as Font
	if FileAccess.file_exists(res_path):
		var bytes := FileAccess.get_file_as_bytes(res_path)
		if not bytes.is_empty():
			var ff := FontFile.new()
			ff.data = bytes
			_font_cache[res_path] = ff
			return ff
	if ResourceLoader.exists(res_path):
		var loaded := ResourceLoader.load(res_path) as Font
		if loaded:
			_font_cache[res_path] = loaded
			return loaded
	return ThemeDB.fallback_font

static func get_title_font() -> Font:
	return load_ui_font(FONT_TITLE_PATH)

static func get_body_font(bold: bool = false, italic: bool = false) -> Font:
	if bold:
		return load_ui_font(FONT_BODY_BOLD_PATH)
	if italic:
		return load_ui_font(FONT_BODY_ITALIC_PATH)
	return load_ui_font(FONT_BODY_PATH)

static func load_ui_texture(res_path: String) -> Texture2D:
	if _tex_cache.has(res_path):
		return _tex_cache[res_path] as Texture2D
	if FileAccess.file_exists(res_path):
		var bytes := FileAccess.get_file_as_bytes(res_path)
		if not bytes.is_empty():
			var img := Image.new()
			var err := img.load_png_from_buffer(bytes)
			if err == OK and not img.is_empty():
				var tex := ImageTexture.create_from_image(img)
				_tex_cache[res_path] = tex
				return tex
	if ResourceLoader.exists(res_path):
		var loaded := ResourceLoader.load(res_path) as Texture2D
		if loaded:
			_tex_cache[res_path] = loaded
			return loaded
	return null

static func make_panel_style(
	bg: Color = COL_PANEL,
	border: Color = COL_BORDER,
	radius: int = 12,
	pad_x: int = 14,
	pad_y: int = 12,
	border_w: int = 1
) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = pad_x
	sb.content_margin_right = pad_x
	sb.content_margin_top = pad_y
	sb.content_margin_bottom = pad_y
	sb.shadow_color = Color(0.0, 0.0, 0.0, 0.38)
	sb.shadow_size = 10
	return sb

static func make_btn_style(
	bg: Color,
	border: Color,
	radius: int = 8,
	pad_x: int = 11,
	pad_y: int = 7
) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = pad_x
	sb.content_margin_right = pad_x
	sb.content_margin_top = pad_y
	sb.content_margin_bottom = pad_y
	return sb

static func style_button(
	btn: Button,
	kind: String = "secondary",
	radius: int = 8,
	pad_x: int = 11,
	pad_y: int = 6
) -> Button:
	var normal_bg := COL_SURFACE
	var hover_bg := COL_SURFACE_HOVER
	var pressed_bg := COL_PANEL_DEEP
	var border := COL_BORDER
	var font_col := COL_INK

	match kind:
		"primary", "active":
			normal_bg = Color(0.45, 0.34, 0.14, 0.96)
			hover_bg = Color(0.58, 0.44, 0.18, 0.98)
			pressed_bg = Color(0.36, 0.27, 0.11, 1.0)
			border = COL_GOLD_BRIGHT
			font_col = COL_HEADING
		"gold_solid":
			normal_bg = Color(0.84, 0.69, 0.39, 1.0)
			hover_bg = Color(0.94, 0.80, 0.49, 1.0)
			pressed_bg = Color(0.72, 0.56, 0.30, 1.0)
			border = COL_GOLD_BRIGHT
			font_col = Color(0.05, 0.08, 0.09, 1.0)
		"danger":
			normal_bg = Color(0.36, 0.11, 0.12, 0.95)
			hover_bg = Color(0.48, 0.16, 0.17, 0.98)
			pressed_bg = Color(0.28, 0.08, 0.09, 1.0)
			border = COL_DANGER
			font_col = Color(0.98, 0.82, 0.82, 1.0)
		"combat":
			normal_bg = Color(0.11, 0.24, 0.36, 0.96)
			hover_bg = Color(0.16, 0.32, 0.48, 0.98)
			pressed_bg = Color(0.08, 0.18, 0.28, 1.0)
			border = COL_COMBAT
			font_col = Color(0.88, 0.96, 1.0, 1.0)
		"pill":
			radius = 999
			normal_bg = Color(0.075, 0.145, 0.165, 0.92)
			hover_bg = Color(0.12, 0.22, 0.25, 0.96)
			pressed_bg = COL_PANEL_DEEP
			border = COL_BORDER
		"pill_active":
			radius = 999
			normal_bg = Color(0.42, 0.31, 0.13, 0.95)
			hover_bg = Color(0.54, 0.41, 0.18, 0.98)
			pressed_bg = Color(0.32, 0.23, 0.10, 1.0)
			border = COL_GOLD_BRIGHT
			font_col = COL_HEADING
		"ghost":
			normal_bg = Color(0.06, 0.12, 0.14, 0.55)
			hover_bg = COL_SURFACE_HOVER
			pressed_bg = COL_PANEL_DEEP
			border = COL_BORDER_SOFT

	btn.add_theme_stylebox_override("normal", make_btn_style(normal_bg, border, radius, pad_x, pad_y))
	btn.add_theme_stylebox_override("hover", make_btn_style(hover_bg, COL_GOLD if kind != "danger" else COL_DANGER_TEXT, radius, pad_x, pad_y))
	btn.add_theme_stylebox_override("pressed", make_btn_style(pressed_bg, COL_GOLD_BRIGHT, radius, pad_x, pad_y))
	btn.add_theme_stylebox_override("focus", make_btn_style(hover_bg, COL_GOLD_BRIGHT, radius, pad_x, pad_y))
	btn.add_theme_stylebox_override("disabled", make_btn_style(Color(0.05, 0.09, 0.10, 0.60), Color(0.18, 0.25, 0.27, 0.5), radius, pad_x, pad_y))
	btn.add_theme_font_override("font", get_body_font(kind in ["primary", "active", "gold_solid", "pill_active"]))
	btn.add_theme_color_override("font_color", font_col)
	btn.add_theme_color_override("font_hover_color", Color(0.99, 0.96, 0.89) if kind != "gold_solid" else Color(0.03, 0.06, 0.07))
	btn.add_theme_color_override("font_pressed_color", font_col)
	btn.add_theme_color_override("font_disabled_color", COL_MUTED)
	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	return btn

static func make_title(text: String, size_px: int = 16, color: Color = COL_HEADING) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_override("font", get_title_font())
	lbl.add_theme_font_size_override("font_size", size_px)
	lbl.add_theme_color_override("font_color", color)
	return lbl

static func make_label(text: String, size_px: int = 13, color: Color = COL_INK, is_title: bool = false, bold: bool = false) -> Label:
	var lbl := Label.new()
	lbl.text = text
	var use_title := is_title or (size_px >= 15 and color != COL_MUTED)
	lbl.add_theme_font_override("font", get_title_font() if use_title else get_body_font(bold))
	lbl.add_theme_font_size_override("font_size", size_px)
	lbl.add_theme_color_override("font_color", color)
	return lbl

static func make_eyebrow(text: String) -> Label:
	var lbl := make_label(text.to_upper(), 10, COL_GOLD, true)
	return lbl

static func make_pill_panel(border_color: Color = COL_BORDER, bg: Color = COL_PANEL) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", make_panel_style(bg, border_color, 999, 14, 7, 1))
	return panel

static func make_window_panel(border_color: Color = COL_BORDER, radius: int = 12) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", make_panel_style(COL_PANEL, border_color, radius, 14, 12, 1))
	return panel

static func style_line_edit(le: LineEdit) -> LineEdit:
	le.add_theme_stylebox_override("normal", make_btn_style(Color(0.03, 0.07, 0.085, 0.95), COL_BORDER, 8, 10, 6))
	le.add_theme_stylebox_override("focus", make_btn_style(Color(0.04, 0.09, 0.11, 0.98), COL_GOLD, 8, 10, 6))
	le.add_theme_font_override("font", get_body_font())
	le.add_theme_color_override("font_color", COL_INK)
	le.add_theme_color_override("font_placeholder_color", COL_MUTED)
	return le

class TacticalThumbStick extends Control:
	signal direction_changed(dir: Vector2)

	var _dragging: bool = false
	var _knob_offset: Vector2 = Vector2.ZERO
	var max_radius: float = 42.0
	var current_vector: Vector2 = Vector2.ZERO

	func _init() -> void:
		custom_minimum_size = Vector2(128, 128)
		mouse_filter = Control.MOUSE_FILTER_STOP
		mouse_default_cursor_shape = Control.CURSOR_DRAG

	func _draw() -> void:
		var center := size * 0.5
		var ring_r := minf(size.x, size.y) * 0.44
		# Base circular semitransparente náutica
		draw_circle(center, ring_r, Color(0.035, 0.082, 0.094, 0.72))
		draw_arc(center, ring_r, 0.0, TAU, 48, Color(0.824, 0.678, 0.388, 0.42), 2.0, true)
		draw_arc(center, ring_r * 0.56, 0.0, TAU, 36, Color(0.212, 0.325, 0.353, 0.45), 1.0, true)
		# Cruz direccional sutil
		draw_line(center + Vector2(-ring_r * 0.65, 0), center + Vector2(ring_r * 0.65, 0), Color(0.612, 0.663, 0.651, 0.22), 1.0)
		draw_line(center + Vector2(0, -ring_r * 0.65), center + Vector2(0, ring_r * 0.65), Color(0.612, 0.663, 0.651, 0.22), 1.0)
		# Pomo móvil dorado
		var knob_pos := center + _knob_offset
		var knob_col := Color(0.945, 0.847, 0.584, 0.92) if _dragging else Color(0.824, 0.678, 0.388, 0.78)
		draw_circle(knob_pos, 22.0, Color(0.08, 0.15, 0.17, 0.95))
		draw_arc(knob_pos, 22.0, 0.0, TAU, 32, knob_col, 2.5, true)
		draw_circle(knob_pos, 8.0, knob_col)

	func _gui_input(event: InputEvent) -> void:
		if event is InputEventMouseButton:
			var mb := event as InputEventMouseButton
			if mb.button_index == MOUSE_BUTTON_LEFT:
				if mb.pressed:
					_dragging = true
					_update_stick(mb.position)
				else:
					reset_stick()
				accept_event()
		elif event is InputEventMouseMotion and _dragging:
			_update_stick((event as InputEventMouseMotion).position)
			accept_event()

	func _update_stick(local_pos: Vector2) -> void:
		var center := size * 0.5
		var delta := local_pos - center
		var clamped := delta.limit_length(max_radius)
		_knob_offset = clamped
		current_vector = clamped / max_radius if max_radius > 0.0 else Vector2.ZERO
		if current_vector.length() < 0.08:
			current_vector = Vector2.ZERO
		queue_redraw()
		emit_signal("direction_changed", current_vector)

	func set_programmatic_vector(vec: Vector2) -> void:
		var clamped := vec.limit_length(1.0)
		current_vector = clamped
		_knob_offset = clamped * max_radius
		_dragging = clamped.length_squared() > 0.001
		queue_redraw()
		emit_signal("direction_changed", current_vector)

	func reset_stick() -> void:
		_dragging = false
		_knob_offset = Vector2.ZERO
		current_vector = Vector2.ZERO
		queue_redraw()
		emit_signal("direction_changed", Vector2.ZERO)
