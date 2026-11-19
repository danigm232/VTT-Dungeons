extends Node
const Palette = preload("res://dm_style/palette.gd")
const Icons = preload("res://inventory/item_catalogue.gd")
const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")
var hud
var ui
var style_id := "obsidian"
var heading_font: Font
var body_font: Font
var _scheduled := false
var _force := false
var _originals: Dictionary = {}
var _generation := 0
var _icons: Dictionary = {}
var _workspace_arranged := false
var _themes: Dictionary = {}
class Engraving extends Node2D:
	var box: StyleBoxTexture
	func _draw() -> void:
		if box and get_parent() is Control: draw_style_box(box, Rect2(Vector2.ZERO, get_parent().size))

func setup(owner_hud) -> void:
	hud = owner_hud; ui = hud.ui
	heading_font = ThemeKit.get_title_font()
	body_font = ThemeKit.get_body_font()
	var preferences := ConfigFile.new()
	if preferences.load("user://dm-appearance.cfg") == OK:
		style_id = str(preferences.get_value("appearance", "style", "obsidian"))
	if style_id not in Palette.IDS: style_id = "obsidian"
	ui.role_changed.connect(_on_role_changed)
	ui.get_tree().node_added.connect(_on_node_added)
	ui.get_viewport().size_changed.connect(_responsive)
	schedule_refresh(true)

func select_style(id: String, persist: bool = true) -> void:
	if id not in Palette.IDS: return
	style_id = id
	if persist:
		var preferences := ConfigFile.new()
		preferences.set_value("appearance", "style", style_id)
		preferences.save("user://dm-appearance.cfg")
	_generation += 1
	schedule_refresh(true)
	if hud.drawer_open and hud.drawer_tab == "settings": hud._rebuild_drawer()

func _on_role_changed(role: String) -> void:
	if role != "dm": _restore_combat()
	else: schedule_refresh(true)

func _on_node_added(node: Node) -> void:
	if not node is Control or not is_instance_valid(hud.root): return
	if hud.root.is_ancestor_of(node): schedule_refresh()
	elif ui.current_role == "dm" and ui.combat_controller and ui.combat_controller.layer.is_ancestor_of(node): schedule_refresh()

func schedule_refresh(force: bool = false) -> void:
	_force = _force or force
	if _scheduled: return
	_scheduled = true
	_apply.call_deferred()

func _apply() -> void:
	_scheduled = false
	if not is_instance_valid(hud.root): return
	var selected_theme := menu_theme()
	if ui.map_interaction and ui.map_interaction.menu:
		if ui.map_interaction.menu.theme != selected_theme: ui.map_interaction.menu.theme = selected_theme
	if not _workspace_arranged and is_instance_valid(hud.win_combat):
		hud.win_combat.reparent(hud.win_exploration.get_parent(), false)
		hud.win_exploration.get_parent().move_child(hud.win_combat, 1)
		_workspace_arranged = true
	_attach_combat_tools()
	_responsive()
	_walk(hud.root, false)
	if ui.current_role == "dm" and ui.combat_controller:
		_walk(ui.combat_controller.layer, true)
	if ui.current_role == "dm" and ui.role_switcher_panel:
		_walk(ui.role_switcher_panel, true)
	_force = false
	_responsive.call_deferred()
	_redraw_controls.call_deferred()
	for key in _originals.keys():
		if not is_instance_valid(_originals[key].node.get_ref()): _originals.erase(key)

func _redraw_controls() -> void:
	# Styles and container sorting settle at the end of the frame. Rebuild the
	# retained draw commands afterwards, including portraits and inherited fonts.
	if not is_instance_valid(hud.root): return
	for control in hud.root.find_children("*", "Control", true, false): control.queue_redraw()
	hud.root.queue_redraw()

func _responsive() -> void:
	if not is_instance_valid(hud.hdr_proj_chip): return
	var width: float = ui.get_viewport().get_visible_rect().size.x
	hud.hdr_proj_chip.get_parent().visible = width >= 1500
	hud.hdr_sub_lbl.visible = width >= 1400
	hud.hdr_sub_lbl.get_parent().tooltip_text = hud.hdr_sub_lbl.text + " · " + hud.hdr_proj_chip.text
	var dock = hud.root.find_child("DmBottomDock", true, false)
	if dock:
		var half: float = dock.get_combined_minimum_size().x * .5
		dock.offset_left = -half; dock.offset_right = half

func _attach_combat_tools() -> void:
	if not ui.combat_controller: return
	var tools = ui.combat_controller.layer.get_node_or_null("CombatDmTools")
	if tools == null: return
	var parent: Control = hud.win_combat.find_child("WindowBody", true, false)
	var toggle := Button.new(); toggle.name = "DmCombatToolsToggle"; toggle.text = "Gestión del combate"; toggle.set_meta("dm_icon", "more")
	parent.add_child(toggle)
	var shelf := VBoxContainer.new(); shelf.name = "DmCombatToolShelf"; parent.add_child(shelf)
	tools.reparent(shelf, false)
	tools.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	tools.position = Vector2.ZERO; tools.custom_minimum_size = Vector2.ZERO; tools.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tools.visible = true; shelf.visible = false
	toggle.pressed.connect(func(): shelf.visible = not shelf.visible; toggle.set_meta("dm_active", shelf.visible); schedule_refresh())

func _walk(node: Node, shared: bool) -> void:
	if node.is_queued_for_deletion(): return
	if node is Control:
		if shared: _remember(node)
		var changed := false
		if node is Button:
			changed = not node.has_meta("dm_normal_style") or node.get_theme_stylebox("normal") != node.get_meta("dm_normal_style") or str(node.get_meta("dm_button_state", "")) != str([node.text, node.button_pressed, node.get_meta("dm_active", false), node.disabled])
		if _force or str(node.get_meta("dm_skin", "")) != style_id or changed:
			_style(node)
			node.set_meta("dm_skin", style_id)
			if node is Button:
				node.set_meta("dm_normal_style", node.get_theme_stylebox("normal"))
				node.set_meta("dm_button_state", str([node.text, node.button_pressed, node.get_meta("dm_active", false), node.disabled]))
	for child in node.get_children(): _walk(child, shared)

func _style(control: Control) -> void:
	if control is Label or control is BaseButton or control is LineEdit:
		control.add_theme_font_override("font", body_font)
	if control is PanelContainer:
		var old: StyleBox = control.get_theme_stylebox("panel")
		var major: bool = str(control.name).begins_with("DmWin_") or control.name in ["DmHeader", "DmSideDrawer", "DmMapToolsPopover", "DmBottomDock", "PhysicalDicePrompt", "CombatRosterDialog"]
		var frame: StyleBox = Palette.flat(style_id, "base" if major else "surface", "edge", 9, 8)
		if major:
			var engraving = control.get_node_or_null("_DmEngraving")
			if engraving == null:
				engraving = Engraving.new(); engraving.name = "_DmEngraving"
				control.add_child(engraving); control.resized.connect(engraving.queue_redraw)
			engraving.box = Palette.trim(style_id); engraving.queue_redraw()
		if old:
			for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]: frame.set_content_margin(side, old.get_content_margin(side))
		if str(control.name).begins_with("DmWin_"):
			frame.content_margin_left = 18; frame.content_margin_right = 18
			frame.content_margin_top = 16; frame.content_margin_bottom = 14
		if control.name == "DmHeader": frame.content_margin_left = 26
		control.add_theme_stylebox_override("panel", frame)
	elif control is Label:
		var size: int = control.get_theme_font_size("font_size")
		var old_color: Color = control.get_theme_color("font_color")
		var tone := str(control.get_meta("dm_tone", ""))
		if tone.is_empty():
			tone = "muted" if old_color.is_equal_approx(ui.ThemeKit.COL_MUTED) else "ink"
			if old_color.r > .7 and old_color.g < .55: tone = "danger"
			control.set_meta("dm_tone", tone)
		control.add_theme_color_override("font_color", Palette.color(style_id, tone))
		if size >= 14 or bool(control.get_meta("dm_heading", false)):
			control.add_theme_font_override("font", heading_font)
			control.add_theme_color_override("font_color", Palette.color(style_id, "accent"))
	elif control is Button:
		_style_button(control)
	elif control is LineEdit:
		control.add_theme_stylebox_override("normal", Palette.flat(style_id, "base", "edge"))
		control.add_theme_stylebox_override("focus", Palette.flat(style_id, "base", "accent"))
		control.add_theme_color_override("font_color", Palette.color(style_id, "ink"))
		control.add_theme_color_override("font_placeholder_color", Palette.color(style_id, "muted"))
	elif control is ProgressBar:
		control.add_theme_stylebox_override("background", Palette.flat(style_id, "base", "edge", 0, 0))
		var fill := Palette.flat(style_id, "accent", "accent", 0, 0)
		fill.bg_color = Color("#749c81") if control.value > 30 else Color("#bd7767")
		control.add_theme_stylebox_override("fill", fill)
	elif control is HSeparator:
		var line := StyleBoxLine.new(); line.color = Palette.color(style_id, "edge"); line.thickness = 1
		control.add_theme_stylebox_override("separator", line)
	elif control is TextureRect and bool(control.get_meta("dm_glyph", false)):
		control.modulate = Palette.color(style_id, "accent")
	elif control is ScrollBar:
		control.add_theme_stylebox_override("scroll", Palette.flat(style_id, "base", "base", 2, 2))
		for key in ["grabber", "grabber_highlight", "grabber_pressed"]: control.add_theme_stylebox_override(key, Palette.flat(style_id, "edge", "edge", 3, 3))
	elif control is HSlider:
		control.add_theme_stylebox_override("slider", Palette.flat(style_id, "base", "edge", 2, 2))
		control.add_theme_stylebox_override("grabber_area", Palette.flat(style_id, "accent", "accent", 2, 2))
		control.add_theme_stylebox_override("grabber_area_highlight", Palette.flat(style_id, "accent", "accent", 2, 2))
		var key := "slider-" + style_id
		if not _icons.has(key):
			var image := Image.new()
			image.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="22"><path d="M9 1 17 7v8l-8 6-8-6V7Z" fill="%s" stroke="%s"/><path d="m9 5 4 6-4 6-4-6 4-6Z" fill="%s"/></svg>' % [Palette.data(style_id).base, Palette.data(style_id).accent, Palette.data(style_id).accent])
			_icons[key] = ImageTexture.create_from_image(image)
		for state in ["grabber", "grabber_highlight", "grabber_disabled"]: control.add_theme_icon_override(state, _icons[key])

func _style_button(button: Button) -> void:
	button.add_theme_font_size_override("font_size", 13)
	var text := button.text.strip_edges()
	for prefix in ["☀", "🌇", "☾", "⚙", "⚔", "♪", "👥", "🗺", "⌖", "◉", "◇", "♙", "♟", "⊞", "◎", "☰", "✕"]:
		if button.text.begins_with(prefix): button.text = button.text.trim_prefix(prefix).strip_edges(); break
	var current: StyleBox = button.get_theme_stylebox("normal")
	if not button.has_meta("dm_primary"):
		var primary: bool = current is StyleBoxFlat and (current.border_color.is_equal_approx(ui.ThemeKit.COL_GOLD_BRIGHT) or current.border_color.is_equal_approx(ui.ThemeKit.COL_COMBAT))
		button.set_meta("dm_primary", primary)
	var active := bool(button.get_meta("dm_active", button.get_meta("dm_primary", false))) or button.button_pressed
	if str(button.name).begins_with("RoleBtn_"): active = str(button.name).trim_prefix("RoleBtn_") == ui.current_role
	var destructive: bool = text.begins_with("-") or "Fin combate" in text or "Finalizar combate" in text or "Falla" in text
	var old: StyleBox = button.get_theme_stylebox("normal")
	var x := maxf(6, old.get_content_margin(SIDE_LEFT))
	var y := maxf(5, old.get_content_margin(SIDE_TOP))
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var fill := "active" if active or state == "pressed" else "hover" if state in ["hover", "focus"] else "surface"
		var border := "accent" if active or state in ["hover", "focus", "pressed"] else "edge"
		var box := Palette.flat(style_id, fill, border, x, y)
		if destructive: box.border_color = Palette.color(style_id, "danger")
		button.add_theme_stylebox_override(state, box)
	for color in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		button.add_theme_color_override(color, Palette.color(style_id, "danger" if destructive else "ink"))
	button.add_theme_color_override("font_disabled_color", Palette.color(style_id, "muted"))
	button.add_theme_color_override("icon_normal_color", Palette.color(style_id, "accent"))
	button.add_theme_color_override("icon_hover_color", Palette.color(style_id, "ink"))
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if button is OptionButton:
		if button.get_popup().theme != menu_theme(): button.get_popup().theme = menu_theme()
		return
	if button is CheckButton: return
	if not button.has_meta("dm_icon_processed"):
		button.set_meta("dm_icon_processed", true)
		var icon_id := str(button.get_meta("dm_icon", ""))
		if icon_id.is_empty():
			for pair in [["☀", "sun"], ["🌇", "sunset"], ["☾", "moon"], ["⚙", "settings"], ["⚔", "sword"], ["♪", "sound"], ["👥", "party"], ["🗺", "map"], ["⌖", "map"], ["◉", "camera"], ["◇", "diamond"], ["♙", "party"], ["♟", "skull"], ["⊞", "layout"], ["◎", "compass"], ["☰", "book"], ["✕", "close"]]:
				if text.begins_with(pair[0]):
					icon_id = pair[1]; button.text = text.trim_prefix(pair[0]).strip_edges(); break
		if icon_id.is_empty(): icon_id = {"Despejado":"sun", "Lluvia":"rain", "Tormenta":"storm", "Bruma":"fog"}.get(text, "")
		if not icon_id.is_empty():
			button.icon = icon(icon_id)
			button.expand_icon = true
			button.add_theme_constant_override("icon_max_width", 18)
			button.custom_minimum_size.x = maxf(button.custom_minimum_size.x, button.text.length() * 6.0 + 40)
			button.custom_minimum_size.y = maxf(30, button.custom_minimum_size.y)
	if button.icon != null and bool(button.get_meta("dm_icon_processed", false)):
		var width: float = body_font.get_string_size(button.text, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
		button.custom_minimum_size.x = maxf(button.custom_minimum_size.x, width + x * 2 + 24)

func icon(id: String) -> Texture2D:
	if _icons.has(id): return _icons[id]
	var path := "res://dm_style/icons/" + id + ".svg"
	if not FileAccess.file_exists(path): return Icons.icon(id)
	var image := Image.new(); image.load_svg_from_string(FileAccess.get_file_as_string(path))
	_icons[id] = ImageTexture.create_from_image(image)
	return _icons[id]

func menu_theme() -> Theme:
	if _themes.has(style_id): return _themes[style_id]
	var theme := Theme.new(); theme.default_font = body_font; theme.default_font_size = 13
	for type in ["PopupMenu", "TooltipPanel"]: theme.set_stylebox("panel", type, Palette.flat(style_id, "base", "edge", 14, 10))
	theme.set_stylebox("hover", "PopupMenu", Palette.flat(style_id, "active", "accent"))
	theme.set_color("font_color", "PopupMenu", Palette.color(style_id, "ink"))
	theme.set_color("font_hover_color", "PopupMenu", Palette.color(style_id, "ink"))
	theme.set_color("font_disabled_color", "PopupMenu", Palette.color(style_id, "muted"))
	theme.set_color("font_color", "TooltipLabel", Palette.color(style_id, "ink"))
	theme.set_font_size("font_size", "TooltipLabel", 12)
	_themes[style_id] = theme
	return theme

func add_style_picker(parent: Control) -> void:
	var heading := Label.new(); heading.text = "ASPECTO DE LA CONSOLA"; heading.add_theme_font_size_override("font_size", 11); parent.add_child(heading)
	for id in Palette.IDS:
		var definition: Dictionary = Palette.data(id)
		var button := Button.new(); button.name = "DmStyle_" + id
		button.custom_minimum_size = Vector2(0, 92)
		button.set_meta("dm_active", id == style_id)
		button.tooltip_text = definition.description
		button.pressed.connect(func(): select_style(id))
		parent.add_child(button)
		var row := HBoxContainer.new(); row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		row.offset_left = 10; row.offset_right = -10; row.offset_top = 10; row.offset_bottom = -10
		row.add_theme_constant_override("separation", 10); button.add_child(row)
		var preview := TextureRect.new()
		var image := Image.new(); image.load_svg_from_string(FileAccess.get_file_as_string("res://dm_style/art/" + id + "-preview.svg"))
		preview.texture = ImageTexture.create_from_image(image); preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED; preview.custom_minimum_size = Vector2(64, 60)
		preview.mouse_filter = Control.MOUSE_FILTER_IGNORE; row.add_child(preview)
		var labels := VBoxContainer.new(); labels.mouse_filter = Control.MOUSE_FILTER_IGNORE; labels.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(labels)
		var title := Label.new(); title.text = definition.name; title.add_theme_font_size_override("font_size", 15); title.set_meta("dm_heading", true); labels.add_child(title)
		var detail := Label.new(); detail.text = definition.description; detail.add_theme_font_size_override("font_size", 11); detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; labels.add_child(detail)
		for label in [title, detail]: label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(HSeparator.new())

	var states:=Button.new(); states.name="DmConditionStyles"; states.text="Estados de personajes · 3 acabados"
	states.custom_minimum_size=Vector2(0,48); parent.add_child(states)
	states.pressed.connect(func(): preload("res://sprites/condition_overlay_picker.gd").open(ui.combat_controller))

func portrait(actor: Dictionary, pixels: int = 42) -> Control:
	var presentation=load("res://character_sheet/presentation.gd")
	var live_token=ui.tokens_by_node.get(actor.get("node_name",""))
	if presentation.PROFILES.has(str(actor.get("id",""))) or live_token and live_token.has_meta("appearance_portrait"):
		var medallion=presentation.Medallion.new(); medallion.name="DmActorPortrait_"+str(actor.get("id","")); medallion.texture=presentation.portrait(actor,live_token); medallion.custom_minimum_size=Vector2(pixels,pixels); return medallion
	var view := TextureRect.new(); view.name = "DmActorPortrait_" + str(actor.get("id", ""))
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; view.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	view.custom_minimum_size = Vector2(pixels, pixels); view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var token = ui.tokens_by_node.get(actor.get("node_name", ""))
	if token:
		var profile: Dictionary = token.char_profile
		var frames: Array = profile.get("dir_idle", {}).get("s", {}).get("frames", [])
		if not frames.is_empty():
			var original: Texture2D = frames[0].tex
			var bust := AtlasTexture.new(); bust.atlas = original
			bust.region = Rect2(original.get_width() * .15, 0, original.get_width() * .7, original.get_height() * .52)
			view.texture = bust
	return view

func glyph(id: String, pixels: int = 20) -> TextureRect:
	var view := TextureRect.new(); view.texture = icon(id)
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; view.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	view.custom_minimum_size = Vector2(pixels, pixels); view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	view.set_meta("dm_glyph", true)
	return view

func rail_button(button: Button, text: String, icon_id: String) -> void:
	button.text = ""
	button.set_meta("dm_icon_processed", true)
	button.tooltip_text = text
	button.custom_minimum_size = Vector2(56, 64)
	var column := VBoxContainer.new(); column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	column.offset_top = 8; column.offset_bottom = -6
	column.add_theme_constant_override("separation", 3); button.add_child(column)
	var picture := glyph(icon_id, 24); picture.size_flags_horizontal = Control.SIZE_EXPAND_FILL; column.add_child(picture)
	var label := Label.new(); label.text = text; label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 12); label.mouse_filter = Control.MOUSE_FILTER_IGNORE; column.add_child(label)

func _remember(control: Control) -> void:
	var key := control.get_instance_id()
	if _originals.has(key): return
	var saved := {"node":weakref(control), "styles":{}, "colors":{}, "fonts":{}, "icons":{}}
	for property in ["grabber", "grabber_highlight", "grabber_disabled"]:
		saved.icons[property] = control.get_theme_icon(property) if control.has_theme_icon_override(property) else null
	saved["font_size"] = control.get_theme_font_size("font_size") if control.has_theme_font_size_override("font_size") else null
	if control is Button:
		saved["button"] = {"text":control.text, "icon":control.icon, "expand":control.expand_icon, "minimum":control.custom_minimum_size}
		if control is OptionButton: saved["popup_theme"] = control.get_popup().theme
	for type in ["styles", "colors", "fonts"]:
		var keys: Array = ["panel", "normal", "hover", "pressed", "focus", "disabled", "separator", "slider", "grabber_area", "grabber_area_highlight"] if type == "styles" else ["font_color", "font_hover_color", "font_pressed_color", "font_disabled_color", "font_focus_color", "icon_normal_color", "icon_hover_color"] if type == "colors" else ["font"]
		for property in keys:
			if type == "styles": saved[type][property] = control.get_theme_stylebox(property) if control.has_theme_stylebox_override(property) else null
			elif type == "colors": saved[type][property] = control.get_theme_color(property) if control.has_theme_color_override(property) else null
			else: saved[type][property] = control.get_theme_font(property) if control.has_theme_font_override(property) else null
	_originals[key] = saved

func _restore_combat() -> void:
	for saved in _originals.values():
		var control = saved.node.get_ref()
		if not is_instance_valid(control): continue
		var engraving = control.get_node_or_null("_DmEngraving")
		if engraving is Engraving:
			control.remove_child(engraving); engraving.queue_free()
		if saved.font_size == null: control.remove_theme_font_size_override("font_size")
		else: control.add_theme_font_size_override("font_size", saved.font_size)
		if saved.has("button"):
			control.text = saved.button.text; control.icon = saved.button.icon
			control.expand_icon = saved.button.expand; control.custom_minimum_size = saved.button.minimum
			if control.has_meta("dm_icon_processed"): control.remove_meta("dm_icon_processed")
		if saved.has("popup_theme"): control.get_popup().theme = saved.popup_theme
		for property in saved.styles:
			if saved.styles[property] == null: control.remove_theme_stylebox_override(property)
			else: control.add_theme_stylebox_override(property, saved.styles[property])
		for property in saved.colors:
			if saved.colors[property] == null: control.remove_theme_color_override(property)
			else: control.add_theme_color_override(property, saved.colors[property])
		for property in saved.fonts:
			if saved.fonts[property] == null: control.remove_theme_font_override(property)
			else: control.add_theme_font_override(property, saved.fonts[property])
		for property in saved.icons:
			if saved.icons[property] == null: control.remove_theme_icon_override(property)
			else: control.add_theme_icon_override(property, saved.icons[property])
		control.remove_meta("dm_skin")
	_originals.clear()
	# set_role updates selection before emitting role_changed. Restoring the old
	# material must preserve the new selection, rather than highlight the DM.
	for role in ui.role_buttons:
		ui.ThemeKit.style_button(ui.role_buttons[role], "pill_active" if role == ui.current_role else "pill", 999, 10, 4)
