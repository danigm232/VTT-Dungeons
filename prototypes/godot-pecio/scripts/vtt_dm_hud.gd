class_name VttDmHud
extends RefCounted

const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const CampaignData := preload("res://scripts/vtt_campaign_data.gd")

var ui # VttRoleUi
var root: Control
var appearance
var _view_signatures: Dictionary = {}

# Header
var hdr_sub_lbl: Label
var hdr_req_chip: Label
var hdr_mode_chip: Label
var hdr_proj_chip: Label

# Left Rail & Drawer
var drawer_panel: PanelContainer
var drawer_open: bool = false
var drawer_tab: String = "climate" # "layout", "climate", "audio", "settings"
var rail_buttons: Dictionary = {}
var drawer_body: VBoxContainer
var drawer_title: Label

# Climate controls synced
var clock_readout_lbl: Label
var clock_pause_btn: Button

# Map Tools Strip & Subpanel
var map_tools_bar: PanelContainer
var map_tools_pop: PanelContainer
var map_tools_pop_body: VBoxContainer
var _active_map_tab: String = "" # "", "scene", "camera", "objects"

# Workspace Windows
var win_exploration: PanelContainer
var exp_zone_lbl: Label
var exp_note_lbl: Label

var win_requests: PanelContainer
var requests_list_box: VBoxContainer

var win_players: PanelContainer
var players_list_box: VBoxContainer

var win_encounter: PanelContainer
var enemy_tabs_row: Container
var enemy_body_box: VBoxContainer
var _enemy_tab: String = "info" # "info", "pose", "sheet"

var win_combat: PanelContainer
var combat_status_lbl: Label
var combat_action_btn: Button
var combat_next_btn: Button
var combat_list_box: VBoxContainer

# Bottom Dock
var dock_buttons: Dictionary = {}
var win_visibility: Dictionary = {
	"map_tools": true,
	"exploration": true,
	"combat": true,
	"requests": false,
	"players": true,
	"encounter": true
}

func _init(owner_ui) -> void:
	ui = owner_ui

func build(parent: Control) -> Control:
	root = Control.new()
	root.name = "DmInterfaceRoot"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(root)
	appearance = preload("res://dm_style/appearance.gd").new()
	root.add_child(appearance)
	appearance.setup(self)

	_build_header()
	_build_side_rail_and_drawer()
	_build_map_tools()
	_build_workspace_windows()
	_build_bottom_dock()
	apply_layout_preset("balanced")
	refresh()
	return root

func _build_header() -> void:
	var hdr := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 0)
	hdr.name = "DmHeader"
	hdr.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color(0.025, 0.06, 0.072, 0.94), ThemeKit.COL_BORDER, 0, 18, 8, 1))
	hdr.set_anchors_preset(Control.PRESET_TOP_WIDE)
	hdr.offset_bottom = 54
	root.add_child(hdr)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	hdr.add_child(row)

	var title_box := VBoxContainer.new()
	title_box.add_theme_constant_override("separation", 1)
	row.add_child(title_box)
	title_box.add_child(ThemeKit.make_eyebrow("MESA DE DIRECCIÓN · PRIVADA"))
	var t_row := HBoxContainer.new()
	t_row.add_theme_constant_override("separation", 10)
	title_box.add_child(t_row)
	var campaign_title := ThemeKit.make_label(ui.meta.get("title", "El Rosa de los Vientos"), 20, ThemeKit.COL_HEADING)
	campaign_title.set_meta("dm_heading", true)
	t_row.add_child(campaign_title)
	hdr_sub_lbl = ThemeKit.make_label("Cubierta Principal (C1)", 12, ThemeKit.COL_MUTED)
	t_row.add_child(hdr_sub_lbl)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(spacer)

	var req_pill := ThemeKit.make_pill_panel(ThemeKit.COL_BORDER, ThemeKit.COL_SURFACE)
	row.add_child(req_pill)
	hdr_req_chip = ThemeKit.make_label("3 solicitudes", 12, ThemeKit.COL_INK)
	req_pill.add_child(hdr_req_chip)

	var mode_pill := ThemeKit.make_pill_panel(ThemeKit.COL_GREEN, Color(0.06, 0.16, 0.13, 0.90))
	row.add_child(mode_pill)
	hdr_mode_chip = ThemeKit.make_label("Exploración", 12, ThemeKit.COL_GREEN)
	mode_pill.add_child(hdr_mode_chip)

	var proj_pill := ThemeKit.make_pill_panel(ThemeKit.COL_BORDER, ThemeKit.COL_SURFACE)
	row.add_child(proj_pill)
	hdr_proj_chip = ThemeKit.make_label("● Proyector listo [F3]", 12, ThemeKit.COL_GOLD_BRIGHT)
	proj_pill.add_child(hdr_proj_chip)

	var save_btn := Button.new()
	save_btn.text = "Guardar mesa"
	ThemeKit.style_button(save_btn, "primary", 999, 12, 5)
	save_btn.pressed.connect(func(): ui.trigger_save_flash())
	row.add_child(save_btn)

func _build_side_rail_and_drawer() -> void:
	var rail := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 0)
	rail.name = "DmSideRail"
	rail.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color(0.028, 0.065, 0.078, 0.94), ThemeKit.COL_BORDER, 0, 6, 10, 1))
	rail.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	rail.offset_top = 54
	rail.offset_bottom = 0
	rail.offset_right = 76
	root.add_child(rail)

	var rvb := VBoxContainer.new()
	rvb.add_theme_constant_override("separation", 8)
	rail.add_child(rvb)

	var tabs := [
		["layout", "⊞\nMesa"],
		["climate", "☀\nClima"],
		["audio", "♪\nSonido"],
		["settings", "⚙\nAjustes"]
	]
	for t in tabs:
		var tb := Button.new()
		tb.text = t[1]
		tb.custom_minimum_size = Vector2(62, 54)
		ThemeKit.style_button(tb, "ghost", 10, 4, 6)
		appearance.rail_button(tb, {"layout":"Mesa", "climate":"Clima", "audio":"Sonido", "settings":"Ajustes"}[t[0]], {"layout":"layout", "climate":"sun", "audio":"sound", "settings":"settings"}[t[0]])
		tb.pressed.connect(func():
			if drawer_open and drawer_tab == t[0]:
				drawer_open = false
			else:
				drawer_open = true
				drawer_tab = t[0]
			_rebuild_drawer()
		)
		rvb.add_child(tb)
		rail_buttons[t[0]] = tb

	drawer_panel = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 12)
	drawer_panel.name = "DmSideDrawer"
	drawer_panel.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	drawer_panel.offset_left = 84
	drawer_panel.offset_top = 64
	drawer_panel.offset_right = 430
	drawer_panel.offset_bottom = -66
	drawer_panel.visible = false
	root.add_child(drawer_panel)
	var drawer_content := VBoxContainer.new()
	drawer_content.add_theme_constant_override("separation", 10)
	drawer_panel.add_child(drawer_content)
	var drawer_header := HBoxContainer.new()
	drawer_content.add_child(drawer_header)
	drawer_title = ThemeKit.make_label("Panel DM", 19, ThemeKit.COL_HEADING)
	drawer_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	drawer_header.add_child(drawer_title)
	var close_drawer := Button.new()
	close_drawer.text = "✕"
	close_drawer.pressed.connect(func(): drawer_open = false; _rebuild_drawer())
	drawer_header.add_child(close_drawer)
	drawer_content.add_child(HSeparator.new())

	var dscroll := ScrollContainer.new()
	dscroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	dscroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	drawer_content.add_child(dscroll)

	drawer_body = VBoxContainer.new()
	drawer_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	drawer_body.add_theme_constant_override("separation", 8)
	dscroll.add_child(drawer_body)

func _build_map_tools() -> void:
	var wrap := VBoxContainer.new()
	wrap.name = "DmMapToolsWrap"
	wrap.position = Vector2(90, 64)
	wrap.add_theme_constant_override("separation", 6)
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(wrap)

	map_tools_bar = ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 999)
	map_tools_bar.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(ThemeKit.COL_PANEL, ThemeKit.COL_BORDER, 999, 10, 6, 1))
	wrap.add_child(map_tools_bar)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	map_tools_bar.add_child(row)

	for tab in [["scene", "⌖ Escena / Zona"], ["camera", "◉ Cámara"], ["objects", "◇ Objetos"]]:
		var b := Button.new()
		b.text = tab[1]
		ThemeKit.style_button(b, "pill", 999, 12, 5)
		b.pressed.connect(func():
			_active_map_tab = "" if _active_map_tab == tab[0] else tab[0]
			_rebuild_map_pop()
		)
		row.add_child(b)

	map_tools_pop = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 12)
	map_tools_pop.name = "DmMapToolsPopover"
	map_tools_pop.add_theme_stylebox_override("panel",ThemeKit.make_panel_style(Color(0.035,0.082,0.094,1.0),ThemeKit.COL_GOLD,12,14,12,1))
	map_tools_pop.custom_minimum_size = Vector2(360, 0)
	map_tools_pop.visible = false
	wrap.add_child(map_tools_pop)

	var pscroll := ScrollContainer.new()
	pscroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	pscroll.custom_minimum_size = Vector2(390, 400)
	map_tools_pop.add_child(pscroll)

	map_tools_pop_body = VBoxContainer.new()
	map_tools_pop_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_tools_pop_body.add_theme_constant_override("separation", 6)
	pscroll.add_child(map_tools_pop_body)

func _build_workspace_windows() -> void:
	# Columna Izquierda: Exploración + Solicitudes (con scroll limpio)
	var left_scroll := ScrollContainer.new()
	left_scroll.name = "DmLeftScroll"
	left_scroll.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	left_scroll.offset_left = 88
	left_scroll.offset_top = 112
	left_scroll.offset_right = 404
	left_scroll.offset_bottom = -64
	left_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	left_scroll.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(left_scroll)

	var left_col := VBoxContainer.new()
	left_col.name = "DmLeftColumn"
	left_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left_col.add_theme_constant_override("separation", 10)
	left_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	left_scroll.add_child(left_col)

	win_exploration = _create_window("Exploración y Relato", "exploration", left_col)
	var exp_vb := win_exploration.find_child("WindowBody", true, false) as VBoxContainer
	exp_zone_lbl = ThemeKit.make_label("C1 · Cubierta Principal", 15, ThemeKit.COL_HEADING)
	exp_vb.add_child(exp_zone_lbl)
	exp_note_lbl = ThemeKit.make_label("", 12, ThemeKit.COL_MUTED)
	exp_note_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	exp_vb.add_child(exp_note_lbl)

	var exp_btns := HBoxContainer.new()
	exp_btns.add_theme_constant_override("separation", 6)
	exp_vb.add_child(exp_btns)
	var z_btn := Button.new()
	z_btn.text = "⌖ Mapa y zona"
	z_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(z_btn, "secondary", 8, 10, 5)
	z_btn.pressed.connect(func():
		_active_map_tab = "scene"
		_rebuild_map_pop()
	)
	exp_btns.add_child(z_btn)
	var cut_btn := Button.new()
	cut_btn.text = "↺ Exterior"
	ThemeKit.style_button(cut_btn, "secondary", 8, 10, 5)
	cut_btn.pressed.connect(func(): ui.focus_zone("exterior"))
	exp_btns.add_child(cut_btn)

	var bring_exp_btn := Button.new()
	bring_exp_btn.name = "DmBringPartyZoneButton"
	bring_exp_btn.text = "👥 Traer grupo a esta vista / zona"
	ThemeKit.style_button(bring_exp_btn, "primary", 8, 10, 5)
	bring_exp_btn.pressed.connect(func(): ui.bring_party_here())
	exp_vb.add_child(bring_exp_btn)

	win_requests = _create_window("Solicitudes e Interacciones", "requests", left_col)
	var req_vb := win_requests.find_child("WindowBody", true, false) as VBoxContainer
	requests_list_box = VBoxContainer.new()
	requests_list_box.add_theme_constant_override("separation", 6)
	req_vb.add_child(requests_list_box)

	# Columna Derecha: Jugadores, PNJ y Combate (con scroll limpio)
	var right_scroll := ScrollContainer.new()
	right_scroll.name = "DmRightScroll"
	right_scroll.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	right_scroll.offset_left = -364
	right_scroll.offset_top = 64
	right_scroll.offset_right = -14
	right_scroll.offset_bottom = -64
	right_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	right_scroll.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(right_scroll)

	var right_col := VBoxContainer.new()
	right_col.name = "DmRightColumn"
	right_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right_col.add_theme_constant_override("separation", 10)
	right_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	right_scroll.add_child(right_col)

	win_combat = _create_window("Combate e Iniciativa", "combat", right_col)
	var cmb_vb := win_combat.find_child("WindowBody", true, false) as VBoxContainer
	combat_status_lbl = ThemeKit.make_label("Sin combate activo · Exploración", 12, ThemeKit.COL_MUTED)
	cmb_vb.add_child(combat_status_lbl)
	var cmb_btns := HBoxContainer.new()
	cmb_btns.add_theme_constant_override("separation", 6)
	cmb_vb.add_child(cmb_btns)
	combat_action_btn = Button.new()
	combat_action_btn.name = "DmStartCombatButton"
	combat_action_btn.text = "⚔ Iniciar combate"
	combat_action_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(combat_action_btn, "combat", 8, 10, 6)
	combat_action_btn.pressed.connect(func():
		if ui.combat_active:
			ui.end_combat()
		else:
			ui.start_combat()
	)
	cmb_btns.add_child(combat_action_btn)

	combat_next_btn = Button.new()
	combat_next_btn.name = "DmNextTurnButton"
	combat_next_btn.text = "Siguiente turno →"
	combat_next_btn.visible = false
	ThemeKit.style_button(combat_next_btn, "primary", 8, 10, 6)
	combat_next_btn.pressed.connect(func(): ui.next_combat_turn())
	cmb_btns.add_child(combat_next_btn)

	combat_list_box = VBoxContainer.new()
	combat_list_box.add_theme_constant_override("separation", 4)
	cmb_vb.add_child(combat_list_box)

	win_players = _create_window("Jugadores de la mesa", "players", right_col)
	var pl_vb := win_players.find_child("WindowBody", true, false) as VBoxContainer
	var pl_hdr_btns := HBoxContainer.new()
	pl_hdr_btns.add_theme_constant_override("separation", 6)
	pl_vb.add_child(pl_hdr_btns)
	var bring_all_b := Button.new()
	bring_all_b.name = "DmBringAllPlayersButton"
	bring_all_b.text = "👥 Traer grupo aquí"
	bring_all_b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(bring_all_b, "primary", 6, 8, 4)
	bring_all_b.pressed.connect(func(): ui.bring_party_here())
	pl_hdr_btns.add_child(bring_all_b)
	var send_zone_b := Button.new()
	send_zone_b.text = "🗺 Mapas / Zonas"
	ThemeKit.style_button(send_zone_b, "secondary", 6, 8, 4)
	send_zone_b.pressed.connect(func():
		_active_map_tab = "scene"
		_rebuild_map_pop()
	)
	pl_hdr_btns.add_child(send_zone_b)

	players_list_box = VBoxContainer.new()
	players_list_box.add_theme_constant_override("separation", 6)
	pl_vb.add_child(players_list_box)

	win_encounter = _create_window("PNJ y Amenazas de Escena", "encounter", right_col)
	var enc_vb := win_encounter.find_child("WindowBody", true, false) as VBoxContainer
	var etabs := HFlowContainer.new()
	etabs.add_theme_constant_override("h_separation", 4)
	etabs.add_theme_constant_override("v_separation", 4)
	enemy_tabs_row = etabs
	enc_vb.add_child(enemy_tabs_row)
	enemy_body_box = VBoxContainer.new()
	enemy_body_box.add_theme_constant_override("separation", 6)
	enc_vb.add_child(enemy_body_box)

func _create_window(title_text: String, win_key: String, parent: Control) -> PanelContainer:
	var panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 12)
	panel.name = "DmWin_" + win_key
	parent.add_child(panel)
	panel.set_meta("dm_window_key", win_key)

	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 6)
	panel.add_child(outer)

	var hdr := HBoxContainer.new()
	outer.add_child(hdr)
	hdr.add_theme_constant_override("separation", 8)
	hdr.add_child(appearance.glyph({"exploration":"book", "requests":"letter", "players":"party", "encounter":"skull", "combat":"sword"}.get(win_key, "book"), 20))
	var t := ThemeKit.make_label(title_text, 16, ThemeKit.COL_HEADING)
	t.clip_text = true
	t.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(t)

	var close_b := Button.new()
	close_b.text = "✕"
	ThemeKit.style_button(close_b, "ghost", 6, 7, 2)
	close_b.pressed.connect(func(): set_window_visible(win_key, false))
	hdr.add_child(close_b)

	var sep := HSeparator.new()
	outer.add_child(sep)

	var body := VBoxContainer.new()
	body.name = "WindowBody"
	body.add_theme_constant_override("separation", 6)
	outer.add_child(body)
	return panel

func _build_bottom_dock() -> void:
	var dock := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 999)
	dock.name = "DmBottomDock"
	dock.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(ThemeKit.COL_PANEL, ThemeKit.COL_BORDER, 999, 10, 6, 1))
	dock.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	dock.offset_left = -355
	dock.offset_top = -54
	dock.offset_right = 355
	dock.offset_bottom = -14
	root.add_child(dock)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 6)
	dock.add_child(row)

	var items := [
		["map_tools", "⌖ Mapa"],
		["exploration", "◎ Escena"],
		["combat", "⚔ Combate"],
		["requests", "◇ Solicitudes"],
		["players", "♙ Jugadores"],
		["encounter", "♟ PNJ"]
	]
	for it in items:
		var b := Button.new()
		b.text = it[1]
		ThemeKit.style_button(b, "pill", 999, 10, 4)
		b.pressed.connect(func(): toggle_window(it[0]))
		row.add_child(b)
		dock_buttons[it[0]] = b

	var panel_btn := Button.new()
	panel_btn.text = "☰ Panel DM"
	ThemeKit.style_button(panel_btn, "primary", 999, 12, 4)
	panel_btn.pressed.connect(func():
		drawer_open = not drawer_open
		_rebuild_drawer()
	)
	row.add_child(panel_btn)

func set_window_visible(key: String, vis: bool) -> void:
	win_visibility[key] = vis
	_sync_windows()

func toggle_window(key: String) -> void:
	win_visibility[key] = not bool(win_visibility.get(key, true))
	_sync_windows()

func apply_layout_preset(preset: String) -> void:
	match preset:
		"story":
			win_visibility = {"map_tools": true, "exploration": true, "combat": false, "requests": true, "players": true, "encounter": false}
		"combat":
			win_visibility = {"map_tools": true, "exploration": false, "combat": true, "requests": false, "players": true, "encounter": true}
		"overview":
			win_visibility = {"map_tools": true, "exploration": false, "combat": false, "requests": false, "players": false, "encounter": false}
		_: # "balanced"
			win_visibility = {"map_tools": true, "exploration": true, "combat": true, "requests": false, "players": true, "encounter": true}
	_sync_windows()

func _sync_windows() -> void:
	map_tools_bar.visible = bool(win_visibility.get("map_tools", true))
	if not map_tools_bar.visible:
		map_tools_pop.visible = false
	win_exploration.visible = bool(win_visibility.get("exploration", true))
	win_requests.visible = bool(win_visibility.get("requests", false))
	win_combat.visible = bool(win_visibility.get("combat", true))
	win_players.visible = bool(win_visibility.get("players", true))
	win_encounter.visible = bool(win_visibility.get("encounter", true))
	for k in dock_buttons.keys():
		var active := bool(win_visibility.get(k, false))
		ThemeKit.style_button(dock_buttons[k], "pill_active" if active else "pill", 999, 10, 4)
		dock_buttons[k].set_meta("dm_active", active)
	if appearance: appearance.schedule_refresh()

func _rebuild_drawer() -> void:
	drawer_panel.visible = drawer_open
	if drawer_open: root.move_child(drawer_panel, root.get_child_count() - 1)
	drawer_title.text = {"layout":"Organiza tu mesa", "climate":"Clima y reloj", "audio":"Paisaje sonoro", "settings":"Estilo y ajustes"}.get(drawer_tab, "Panel DM")
	for k in rail_buttons.keys():
		ThemeKit.style_button(rail_buttons[k], "primary" if (drawer_open and drawer_tab == k) else "ghost", 10, 4, 6)
		rail_buttons[k].set_meta("dm_active", drawer_open and drawer_tab == k)
	if appearance: appearance.schedule_refresh()
	if not drawer_open:
		return
	for c in drawer_body.get_children():
		c.queue_free()

	if drawer_tab == "climate":
		drawer_body.add_child(ThemeKit.make_eyebrow("ATMÓSFERA Y HORA DEL DÍA"))
		var cur_t: String = ui.get_env_time()
		var cur_w: String = ui.get_env_weather()
		drawer_body.add_child(ThemeKit.make_label("%s · %s" % [CampaignData.get_time_label_es(cur_t), CampaignData.get_weather_label_es(cur_w)], 16, ThemeKit.COL_HEADING))

		var t_row := HBoxContainer.new()
		t_row.add_theme_constant_override("separation", 6)
		drawer_body.add_child(t_row)
		for t in [["day", "☀ Mediodía"], ["dusk", "🌇 Tarde"], ["night", "☾ Noche"]]:
			var tb := Button.new()
			tb.text = t[1]
			tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			ThemeKit.style_button(tb, "primary" if cur_t == t[0] else "secondary", 8, 6, 6)
			tb.pressed.connect(func():
				ui.set_env_time(t[0])
				_rebuild_drawer()
			)
			t_row.add_child(tb)

		drawer_body.add_child(ThemeKit.make_eyebrow("METEOROLOGÍA"))
		var w_row := GridContainer.new()
		w_row.columns = 2
		w_row.add_theme_constant_override("h_separation", 6)
		w_row.add_theme_constant_override("v_separation", 6)
		drawer_body.add_child(w_row)
		for w in [["clear", "Despejado"], ["rain", "Lluvia"], ["storm", "Tormenta"], ["fog", "Bruma"]]:
			var wb := Button.new()
			wb.text = w[1]
			wb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			ThemeKit.style_button(wb, "primary" if cur_w == w[0] else "secondary", 8, 8, 6)
			wb.pressed.connect(func():
				ui.set_env_weather(w[0])
				_rebuild_drawer()
			)
			w_row.add_child(wb)

		var gentle := CheckButton.new()
		gentle.text = "Efectos ambientales suaves"
		gentle.button_pressed = ui.get_env_reduced_effects()
		gentle.toggled.connect(func(v): ui.set_env_reduced_effects(v))
		drawer_body.add_child(gentle)

		drawer_body.add_child(HSeparator.new())
		drawer_body.add_child(ThemeKit.make_eyebrow("RELOJ DE CAMPAÑA"))
		clock_readout_lbl = ThemeKit.make_label(CampaignData.format_clock_day_time(ui.clock_seconds)["day_label"], 18, ThemeKit.COL_HEADING)
		drawer_body.add_child(clock_readout_lbl)

		var c_grid := GridContainer.new()
		c_grid.columns = 2
		c_grid.add_theme_constant_override("h_separation", 6)
		c_grid.add_theme_constant_override("v_separation", 6)
		drawer_body.add_child(c_grid)

		clock_pause_btn = Button.new()
		clock_pause_btn.text = "⏸ Pausar" if ui.clock_running else "▶ Reanudar"
		ThemeKit.style_button(clock_pause_btn, "secondary", 8, 8, 6)
		clock_pause_btn.pressed.connect(func():
			ui.clock_running = not ui.clock_running
			_rebuild_drawer()
			ui.refresh_all()
		)
		c_grid.add_child(clock_pause_btn)

		for adv in [["+10 min", 600], ["+1 h", 3600], ["+8 h", 28800]]:
			var ab := Button.new()
			ab.text = adv[0]
			ab.tooltip_text = "Avanzar el reloj de campaña: " + adv[0]
			ThemeKit.style_button(ab, "secondary", 8, 8, 6)
			ab.pressed.connect(func(): ui.advance_clock_seconds(adv[1]))
			c_grid.add_child(ab)

	elif drawer_tab == "layout":
		drawer_body.add_child(ThemeKit.make_eyebrow("DISTRIBUCIÓN DE VENTANAS"))
		for p in [["balanced", "Mapa y relato (recomendada)"], ["story", "Lectura cómoda"], ["combat", "Control táctico"], ["overview", "Mapa despejado"]]:
			var pb := Button.new()
			pb.text = p[1]
			ThemeKit.style_button(pb, "secondary", 8, 10, 6)
			pb.pressed.connect(func(): apply_layout_preset(p[0]))
			drawer_body.add_child(pb)

		drawer_body.add_child(HSeparator.new())
		drawer_body.add_child(ThemeKit.make_eyebrow("PANELES VISIBLES"))
		for wkey in [["exploration", "Exploración y relato"], ["players", "Jugadores"], ["encounter", "PNJ de escena"], ["combat", "Combate e iniciativa"], ["requests", "Solicitudes"]]:
			var chk := CheckButton.new()
			chk.text = wkey[1]
			chk.button_pressed = bool(win_visibility.get(wkey[0], false))
			chk.toggled.connect(func(v): set_window_visible(wkey[0], v))
			drawer_body.add_child(chk)

	elif drawer_tab == "audio":
		drawer_body.add_child(ThemeKit.make_eyebrow("MEZCLA DE ESCENA"))
		for ch in ["Música principal", "Oleaje y casco", "Viento en jarcia", "Lluvia y tormenta"]:
			drawer_body.add_child(ThemeKit.make_label(ch, 12, ThemeKit.COL_INK))
			var s := HSlider.new()
			s.min_value = 0.0
			s.max_value = 100.0
			s.value = 70.0
			drawer_body.add_child(s)
		drawer_body.add_child(ThemeKit.make_eyebrow("DISPARAR EFECTOS PUNTUALES"))
		for sfx in ["Canto de arpía", "Crujido de madera", "Trueno lejano", "Choque de aceros", "Tirada de dados"]:
			var sb := Button.new()
			sb.text = "♪ " + sfx
			ThemeKit.style_button(sb, "secondary", 8, 10, 5)
			sb.pressed.connect(func(): ui.notify_mesa("♪ Efecto sonoro en mesa: " + sfx))
			drawer_body.add_child(sb)

	elif drawer_tab == "settings":
		appearance.add_style_picker(drawer_body)
		drawer_body.add_child(ThemeKit.make_eyebrow("MESA Y ACCESOS DIRECTOS"))
		var rec_b := Button.new()
		rec_b.text = "Recuperar todas las ventanas"
		ThemeKit.style_button(rec_b, "primary", 8, 10, 6)
		rec_b.pressed.connect(func():
			win_visibility = {"map_tools": true, "exploration": true, "combat": true, "requests": true, "players": true, "encounter": true}
			_sync_windows()
		)
		drawer_body.add_child(rec_b)
		var reset_b := Button.new()
		reset_b.text = "↺ Restablecer mesa recomendada"
		ThemeKit.style_button(reset_b, "secondary", 8, 10, 6)
		reset_b.pressed.connect(func(): apply_layout_preset("balanced"))
		drawer_body.add_child(reset_b)
		drawer_body.add_child(ThemeKit.make_label("Atajos: F1 Jugador · F2 DM · F3 Proyector", 11, ThemeKit.COL_MUTED))

func _rebuild_map_pop() -> void:
	map_tools_pop.visible = _active_map_tab != ""
	if _active_map_tab != "": root.move_child(map_tools_bar.get_parent(), root.get_child_count() - 1)
	if _active_map_tab == "":
		return
	for c in map_tools_pop_body.get_children():
		c.queue_free()

	if _active_map_tab == "scene":
		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("MAPAS DE CAMPAÑA (CAMBIO DIRECTO DM)"))
		var cur_map_id: String = ui.get_current_map_id()
		for m in ui.get_campaign_maps():
			var mid: String = m["id"]
			var is_cur := mid == cur_map_id
			var mb := Button.new()
			mb.name = "DmMapBtn_" + mid
			mb.text = ("✓ " if is_cur else "🗺 ") + m["label"]
			mb.alignment = HORIZONTAL_ALIGNMENT_LEFT
			ThemeKit.style_button(mb, "primary" if is_cur else "secondary", 8, 10, 5)
			mb.pressed.connect(func():
				ui.dm_change_map(mid)
				_rebuild_map_pop()
			)
			map_tools_pop_body.add_child(mb)

		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("ZONAS Y CUBIERTAS · MOVER CÁMARA O GRUPO"))
		for z in ui.get_zones_list():
			var zrow := HBoxContainer.new()
			zrow.add_theme_constant_override("separation", 4)
			map_tools_pop_body.add_child(zrow)

			var zb := Button.new()
			zb.text = z["label"]
			zb.alignment = HORIZONTAL_ALIGNMENT_LEFT
			zb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			ThemeKit.style_button(zb, "primary" if z["id"] == ui.selected_zone_id else "secondary", 8, 10, 5)
			zb.pressed.connect(func():
				ui.focus_zone(z["id"])
				_rebuild_map_pop()
			)
			zrow.add_child(zb)

			var ztp := Button.new()
			ztp.name = "DmZoneWarpBtn_" + z["id"]
			ztp.text = "⇢ Grupo"
			ztp.tooltip_text = "Llevar a todos los jugadores a " + z["label"]
			ThemeKit.style_button(ztp, "secondary", 8, 8, 5)
			ztp.pressed.connect(func():
				ui.teleport_party_to_zone(z["id"])
				_rebuild_map_pop()
			)
			zrow.add_child(ztp)

	elif _active_map_tab == "camera":
		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("CÁMARA Y CUADRÍCULA"))
		var gchk := CheckButton.new()
		gchk.text = "Cuadrícula táctica"
		gchk.button_pressed = ui.grid_enabled
		gchk.toggled.connect(func(v): ui.set_grid_enabled(v))
		map_tools_pop_body.add_child(gchk)

		var cam_row := HBoxContainer.new()
		cam_row.add_theme_constant_override("separation", 6)
		map_tools_pop_body.add_child(cam_row)
		for cmd in [["↶ Q", func(): ui.cam_orbit(-1)], ["↷ E", func(): ui.cam_orbit(1)], ["↓ F", func(): ui.cam_tilt(-1)], ["↑ R", func(): ui.cam_tilt(1)]]:
			var cb := Button.new()
			cb.text = cmd[0]
			ThemeKit.style_button(cb, "secondary", 8, 8, 5)
			cb.pressed.connect(cmd[1])
			cam_row.add_child(cb)

		for child in cam_row.get_children():
			if child.text.begins_with("↓") or child.text.begins_with("↑"):
				child.pressed.disconnect(child.pressed.get_connections()[0]["callable"])
				var direction: int = -1 if child.text.begins_with("↓") else 1
				child.button_down.connect(func(): ui.camera._begin_tilt_hold(direction))
				child.button_up.connect(func(): ui.camera._end_tilt_hold())
		var share := CheckButton.new()
		share.text = "Compartir cámara con la mesa"
		share.button_pressed = bool(ui.camera.get("share_camera"))
		share.toggled.connect(func(enabled): ui.camera.set("share_camera",enabled))
		map_tools_pop_body.add_child(share)
		var movement := HBoxContainer.new()
		map_tools_pop_body.add_child(movement)
		for item in [["Fija","fixed"],["Por zonas","semiFixed"],["Seguir","follow"]]:
			var button := Button.new()
			button.text = item[0]
			button.pressed.connect(func(): ui.camera.set_follow_mode(item[1]))
			movement.add_child(button)
		var mode_row := HBoxContainer.new()
		mode_row.add_theme_constant_override("separation", 6)
		map_tools_pop_body.add_child(mode_row)
		for cmd in [["▧ Conjunto", func(): ui.cam_overview_toggle()], ["◎ Detalle", func(): ui.cam_detail()], ["↺ Inicio", func(): ui.cam_reset()]]:
			var cb := Button.new()
			cb.text = cmd[0]
			ThemeKit.style_button(cb, "secondary", 8, 8, 5)
			cb.pressed.connect(cmd[1])
			mode_row.add_child(cb)

	elif _active_map_tab == "objects":
		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("PUERTAS Y OBJETOS INTERACTIVOS"))
		var doors: Array = ui.get_scene_doors()
		for d in doors:
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 6)
			map_tools_pop_body.add_child(row)
			var lbl := ThemeKit.make_label("%s (%s)" % [d.door_title, "Abierta" if d.is_open else "Cerrada"], 12, ThemeKit.COL_INK)
			lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(lbl)
			var b := Button.new()
			b.text = "Cerrar" if d.is_open else "Abrir"
			ThemeKit.style_button(b, "primary" if d.is_open else "secondary", 8, 10, 4)
			b.pressed.connect(func():
				d.toggle_door()
				_rebuild_map_pop()
			)
			row.add_child(b)
		if doors.is_empty():
			map_tools_pop_body.add_child(ThemeKit.make_label("Sin puertas dinámicas en esta escena.", 12, ThemeKit.COL_MUTED))

		if not ui.is_retreat:
			map_tools_pop_body.add_child(HSeparator.new())
			map_tools_pop_body.add_child(ThemeKit.make_eyebrow("EVENTOS DE C3 Y COFA C10"))
			var helm_ctrl = ui.get_helm_controller()
			var ws = ui.world_state
			if helm_ctrl or ws:
				var h_state: String = helm_ctrl.helm_state if helm_ctrl else ws.helm_state
				var h_lbl_es: String = str({"attached": "Encajado (inestable)", "caught": "Sujetado al vuelo", "fallen": "Caído sobre cubierta"}.get(h_state, h_state))
				var c4_alert: bool = helm_ctrl.c4_zombies_alerted if helm_ctrl else ws.c4_zombies_alerted
				map_tools_pop_body.add_child(ThemeKit.make_label("Timón C3: %s" % h_lbl_es, 12, ThemeKit.COL_INK))
				map_tools_pop_body.add_child(ThemeKit.make_label("Zombis C4: %s" % ("ALERTADOS (golpes cada 10–15 s)" if c4_alert else "En calma"), 12, ThemeKit.COL_GOLD_BRIGHT if c4_alert else ThemeKit.COL_MUTED))
				var helm_row := HBoxContainer.new()
				helm_row.add_theme_constant_override("separation", 6)
				map_tools_pop_body.add_child(helm_row)
				if c4_alert and helm_ctrl and helm_ctrl.has_method("silence_c4_alert"):
					var sil_b := Button.new()
					sil_b.text = "Silenciar C4"
					ThemeKit.style_button(sil_b, "secondary", 6, 8, 4)
					sil_b.pressed.connect(func():
						helm_ctrl.silence_c4_alert()
						_rebuild_map_pop()
					)
					helm_row.add_child(sil_b)
				if h_state != "attached" and helm_ctrl and helm_ctrl.has_method("reset_helm_to_attached"):
					var rst_b := Button.new()
					rst_b.text = "Reencajar timón"
					ThemeKit.style_button(rst_b, "secondary", 6, 8, 4)
					rst_b.pressed.connect(func():
						helm_ctrl.reset_helm_to_attached()
						_rebuild_map_pop()
					)
					helm_row.add_child(rst_b)
			if ws:
				var harpy_row := HBoxContainer.new()
				harpy_row.add_theme_constant_override("separation", 6)
				map_tools_pop_body.add_child(harpy_row)
				var hp_lbl := ThemeKit.make_label("Arpía en Cofa C10: %s" % ("Posada en el nido" if ws.harpy_present else "Fuera cazando (PDF)"), 12, ThemeKit.COL_INK)
				hp_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				harpy_row.add_child(hp_lbl)
				var hb := Button.new()
				hb.name = "DmHarpyPresenceBtn"
				hb.text = "Mandar a cazar" if ws.harpy_present else "Regresar al nido"
				ThemeKit.style_button(hb, "primary" if ws.harpy_present else "secondary", 6, 8, 4)
				hb.pressed.connect(func():
					ui.set_harpy_present(not ws.harpy_present)
					_rebuild_map_pop()
				)
				harpy_row.add_child(hb)

				# Controles canónicos Cap. 3 (Nivel 1/2, Canon Estricto, Regreso/Resolución Arpía, Descanso, Epílogo, Faroles)
				map_tools_pop_body.add_child(HSeparator.new())
				map_tools_pop_body.add_child(ThemeKit.make_eyebrow("DIRECCIÓN CANÓNICA · CAPÍTULO 3 (PDF)"))

				var lvl_row := HBoxContainer.new()
				lvl_row.add_theme_constant_override("separation", 6)
				map_tools_pop_body.add_child(lvl_row)
				var lvl_lbl := ThemeKit.make_label("Nivel del grupo:", 12, ThemeKit.COL_INK)
				lvl_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				lvl_row.add_child(lvl_lbl)
				for lv in [1, 2]:
					var lb := Button.new()
					lb.name = "DmPartyLevelBtn_%d" % lv
					lb.text = "Nivel %d" % lv
					ThemeKit.style_button(lb, "primary" if ws.party_level == lv else "secondary", 6, 8, 4)
					lb.pressed.connect(func():
						ui.set_party_level(lv)
						_rebuild_map_pop()
					)
					lvl_row.add_child(lb)

				var strict_chk := CheckButton.new()
				strict_chk.name = "DmStrictCanonToggle"
				strict_chk.text = "Modo Canon Estricto (oculta extras VTT)"
				strict_chk.button_pressed = ws.strict_canon_mode
				strict_chk.toggled.connect(func(v: bool):
					ui.set_strict_canon_mode(v)
					_rebuild_map_pop()
				)
				map_tools_pop_body.add_child(strict_chk)

				var hres_row := HBoxContainer.new()
				hres_row.add_theme_constant_override("separation", 4)
				map_tools_pop_body.add_child(hres_row)
				for h_op in [["🦅 Regresa", "return"], ["🕊 Negociada", "negotiated"], ["🪶 Huye <50%", "fled"], ["⚔ Derrotada", "defeated"]]:
					var hrb := Button.new()
					hrb.text = h_op[0]
					hrb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
					ThemeKit.style_button(hrb, "secondary", 6, 6, 3)
					hrb.pressed.connect(func():
						if h_op[1] == "return":
							ui.trigger_harpy_return("Arbitraje del DM")
						else:
							ui.resolve_harpy(h_op[1])
						_rebuild_map_pop()
					)
					hres_row.add_child(hrb)

				var story_row := HBoxContainer.new()
				story_row.add_theme_constant_override("separation", 6)
				map_tools_pop_body.add_child(story_row)
				var rest_b := Button.new()
				rest_b.text = "⛺ Descanso a bordo"
				rest_b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				ThemeKit.style_button(rest_b, "secondary", 6, 8, 4)
				rest_b.pressed.connect(func(): ui.open_ship_rest_modal())
				story_row.add_child(rest_b)

				var epi_b := Button.new()
				epi_b.text = "📖 Bitácora / Talismán"
				epi_b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				ThemeKit.style_button(epi_b, "primary", 6, 8, 4)
				epi_b.pressed.connect(func(): ui.open_logbook_and_talisman_modal())
				story_row.add_child(epi_b)

				var lan_row := HBoxContainer.new()
				lan_row.add_theme_constant_override("separation", 6)
				map_tools_pop_body.add_child(lan_row)
				var lan_on := Button.new()
				lan_on.text = "🔥 Encender faroles"
				lan_on.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				ThemeKit.style_button(lan_on, "secondary", 6, 8, 4)
				lan_on.pressed.connect(func(): ui.set_all_lanterns(true))
				lan_row.add_child(lan_on)
				var lan_off := Button.new()
				lan_off.text = "💨 Apagar faroles"
				lan_off.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				ThemeKit.style_button(lan_off, "secondary", 6, 8, 4)
				lan_off.pressed.connect(func(): ui.set_all_lanterns(false))
				lan_row.add_child(lan_off)

func _rebuild_players_list() -> void:
	var portraits: Array = []
	for actor in ui.actors:
		var token = ui.tokens_by_node.get(actor.get("node_name", ""))
		var profile: Dictionary = token.char_profile if token else {}
		var frames: Array = profile.get("dir_idle", {}).get("s", {}).get("frames", [])
		portraits.append(frames[0].tex.get_instance_id() if not frames.is_empty() else 0)
	if not _needs_view_refresh("players", [ui.actors, ui.selected_actor_id, portraits]): return
	for child in players_list_box.get_children():
		players_list_box.remove_child(child); child.queue_free()
	for actor in ui.actors:
		var aid: String = actor.id
		var selected: bool = aid == ui.selected_actor_id
		var card := ThemeKit.make_window_panel(ThemeKit.COL_GOLD if selected else ThemeKit.COL_BORDER_SOFT, 4)
		card.name = "DmActorCard_" + aid
		players_list_box.add_child(card)
		var content := VBoxContainer.new(); content.add_theme_constant_override("separation", 7); card.add_child(content)
		var top := HBoxContainer.new(); top.add_theme_constant_override("separation", 10); content.add_child(top)
		top.add_child(appearance.portrait(actor, 48))
		var info := VBoxContainer.new(); info.size_flags_horizontal = Control.SIZE_EXPAND_FILL; top.add_child(info)
		var names := HBoxContainer.new(); info.add_child(names)
		var name_label := ThemeKit.make_label(actor.name, 16, ThemeKit.COL_HEADING)
		name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL; names.add_child(name_label)
		names.add_child(ThemeKit.make_label("CA %d" % actor.ac, 11, ThemeKit.COL_MUTED))
		info.add_child(ThemeKit.make_label(str(actor.class_line), 11, ThemeKit.COL_MUTED))
		var hp_row := HBoxContainer.new(); info.add_child(hp_row)
		var health := ProgressBar.new(); health.name = "DmHealth_" + aid
		health.min_value = 0; health.max_value = 100; health.value = 100.0 * float(actor.hp) / maxf(1, actor.hp_max)
		health.show_percentage = false; health.custom_minimum_size = Vector2(0, 5); health.size_flags_horizontal = Control.SIZE_EXPAND_FILL; health.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hp_row.add_child(health)
		hp_row.add_child(ThemeKit.make_label("%d / %d PG" % [actor.hp, actor.hp_max], 11, ThemeKit.COL_INK))
		var actions := HBoxContainer.new(); actions.add_theme_constant_override("separation", 4); content.add_child(actions)
		for delta in [-1, 1]:
			var change := Button.new(); change.text = "-1" if delta < 0 else "+1"
			change.tooltip_text = "Modificar los puntos de golpe de " + str(actor.name)
			ThemeKit.style_button(change, "danger" if delta < 0 else "secondary", 3, 8, 4)
			change.pressed.connect(func(): ui.apply_hp_delta(aid, delta)); actions.add_child(change)
		var bring := Button.new(); bring.name = "DmBringActorBtn_" + aid; bring.text = "⇢ Traer"
		bring.tooltip_text = "Traer a %s a la vista actual del DM" % actor.name
		ThemeKit.style_button(bring, "secondary", 3, 8, 4)
		bring.pressed.connect(func(): ui.bring_actor_here(aid)); actions.add_child(bring)
		var focus := Button.new(); focus.text = "Activo" if selected else "Controlar"
		focus.set_meta("dm_active", selected); focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(focus, "primary" if selected else "secondary", 3, 8, 4)
		focus.pressed.connect(func(): ui.select_player_character(aid)); actions.add_child(focus)
		var sheet := Button.new(); sheet.name = "DmCharacterSheet_" + aid; sheet.text = "Ficha"
		ThemeKit.style_button(sheet, "secondary", 3, 8, 4)
		sheet.pressed.connect(func(): ui.select_player_character(aid); ui.player_hud.open_modal("sheet")); actions.add_child(sheet)

func _rebuild_encounter_card() -> void:
	for c in enemy_tabs_row.get_children():
		c.queue_free()
	for c in enemy_body_box.get_children():
		c.queue_free()

	for e in ui.enemies:
		var eid: String = e["id"]
		var b := Button.new()
		b.text = e["name"]
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(b, "primary" if eid == ui.selected_enemy_id else "secondary", 8, 8, 4)
		b.pressed.connect(func():
			ui.selected_enemy_id = eid
			_rebuild_encounter_card()
		)
		enemy_tabs_row.add_child(b)

	var en: Dictionary = ui.get_selected_enemy()
	if en.is_empty():
		return
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 6)
	enemy_body_box.add_child(top)
	var portrait = appearance.portrait(en, 44)
	if portrait.texture != null: top.add_child(portrait)
	else: portrait.queue_free()
	var enemy_info := VBoxContainer.new()
	enemy_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(enemy_info)
	var z := ThemeKit.make_label(str(en["zone"]), 11, ThemeKit.COL_MUTED)
	z.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	enemy_info.add_child(z)
	enemy_info.add_child(ThemeKit.make_label("PG %d/%d · CA %d" % [en["hp"], en["hp_max"], en["ac"]], 12, ThemeKit.COL_INK))

	var vis_btn := Button.new()
	vis_btn.text = "Visible" if en["revealed"] else "Oculta"
	vis_btn.set_meta("dm_icon", "eye")
	vis_btn.tooltip_text = "Mostrar u ocultar este PNJ en la mesa"
	ThemeKit.style_button(vis_btn, "primary" if en["revealed"] else "secondary", 6, 8, 3)
	vis_btn.pressed.connect(func(): ui.toggle_enemy_revealed(en["id"]))
	top.add_child(vis_btn)

	var ctrl_row := HBoxContainer.new()
	ctrl_row.add_theme_constant_override("separation", 4)
	enemy_body_box.add_child(ctrl_row)
	for op in [["-5", -5], ["-1", -1], ["+1", 1], ["+5", 5]]:
		var hb := Button.new()
		hb.text = op[0]
		ThemeKit.style_button(hb, "danger" if op[1] < 0 else "secondary", 6, 7, 3)
		hb.pressed.connect(func(): ui.apply_enemy_hp_delta(en["id"], op[1]))
		ctrl_row.add_child(hb)

	var foc := Button.new()
	foc.text = "◎ Enfocar"
	foc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(foc, "secondary", 6, 8, 3)
	foc.pressed.connect(func(): ui.focus_enemy_token(en["id"]))
	ctrl_row.add_child(foc)

	var atk_btn := Button.new()
	atk_btn.text = "⚔ Atacar"
	ThemeKit.style_button(atk_btn, "combat", 6, 8, 3)
	atk_btn.pressed.connect(func(): ui.play_enemy_animation(en["id"], "attack"))
	ctrl_row.add_child(atk_btn)

	var sum := ThemeKit.make_label(en.get("summary", ""), 11, ThemeKit.COL_MUTED)
	sum.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	enemy_body_box.add_child(sum)
	if bool(en.get("needs_codex_sprites", false)):
		var sp_note := ThemeKit.make_label("🎨 Sprite provisional (pendiente importación de Codex).", 11, ThemeKit.COL_GOLD_BRIGHT)
		sp_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		enemy_body_box.add_child(sp_note)

	if not ui.is_retreat and ui.world_state:
		if en["id"] == "zombie" and ui.world_state.c4_zombies_alerted:
			var warn := ThemeKit.make_label("⚠ Alertados por la caída del timón C3 · Golpean C4 cada 10–15 s.", 11, ThemeKit.COL_GOLD_BRIGHT)
			warn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			enemy_body_box.add_child(warn)
		elif en["id"] == "harpy":
			var state_note := ThemeKit.make_label("Cofa C10: %s en el nido · Tesoro: %s." % ["Arpía presente" if ui.world_state.harpy_present else "Arpía ausente", "Ya recogido" if ui.world_state.c10_nest_looted else "Sin registrar"], 11, ThemeKit.COL_MUTED)
			state_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			enemy_body_box.add_child(state_note)

func _rebuild_requests_list() -> void:
	for c in requests_list_box.get_children():
		c.queue_free()
	if ui.dm_requests.is_empty():
		requests_list_box.add_child(ThemeKit.make_label("Sin solicitudes pendientes.", 12, ThemeKit.COL_MUTED))
		return
	for req in ui.dm_requests:
		var card := ThemeKit.make_window_panel(ThemeKit.COL_BORDER_SOFT, 8)
		requests_list_box.add_child(card)
		var vb := VBoxContainer.new()
		vb.add_theme_constant_override("separation", 4)
		card.add_child(vb)
		vb.add_child(ThemeKit.make_label("%s · %s" % [req["actor"], req["action"]], 12, ThemeKit.COL_HEADING))
		vb.add_child(ThemeKit.make_label("%s · %s" % [req["skill"], req["zone"]], 11, ThemeKit.COL_MUTED))
		var brow := HBoxContainer.new()
		brow.add_theme_constant_override("separation", 6)
		vb.add_child(brow)
		var ok_b := Button.new()
		ok_b.text = "✓ Supera"
		ok_b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(ok_b, "primary", 6, 8, 3)
		ok_b.pressed.connect(func(): ui.resolve_dm_request(req["id"], true))
		brow.add_child(ok_b)
		var fail_b := Button.new()
		fail_b.text = "✕ Falla"
		fail_b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(fail_b, "danger", 6, 8, 3)
		fail_b.pressed.connect(func(): ui.resolve_dm_request(req["id"], false))
		brow.add_child(fail_b)

func _rebuild_combat_window() -> void:
	for c in combat_list_box.get_children():
		c.queue_free()
	combat_next_btn.visible = ui.combat_active
	if ui.combat_active:
		combat_action_btn.text = "✕ Fin combate"
		ThemeKit.style_button(combat_action_btn, "danger", 8, 10, 6)
		var cur: Dictionary = ui.get_current_combatant()
		combat_status_lbl.text = "Ronda %d · Turno de %s" % [ui.combat_round, cur.get("name", "—")]
		for i in range(ui.combat_order.size()):
			var entry: Dictionary = ui.combat_order[i]
			var is_turn: bool = i == ui.combat_turn_idx
			var row_p := ThemeKit.make_window_panel(ThemeKit.COL_GOLD_BRIGHT if is_turn else ThemeKit.COL_BORDER_SOFT, 8)
			combat_list_box.add_child(row_p)
			var hb := HBoxContainer.new()
			row_p.add_child(hb)
			var lbl := ThemeKit.make_label("%s %s" % ["▶" if is_turn else "•", entry["name"]], 12, ThemeKit.COL_HEADING if is_turn else ThemeKit.COL_INK)
			lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			hb.add_child(lbl)
			hb.add_child(ThemeKit.make_label("Inic. %d" % entry["init"], 11, ThemeKit.COL_MUTED))
	else:
		combat_action_btn.text = "⚔ Iniciar combate"
		ThemeKit.style_button(combat_action_btn, "combat", 8, 10, 6)
		combat_status_lbl.text = "Sin combate activo · Pulsa para tirar iniciativa."

func _needs_view_refresh(key: String, value: Variant) -> bool:
	var signature := JSON.stringify(value)
	if _view_signatures.get(key, "") == signature: return false
	_view_signatures[key] = signature
	return true

func refresh() -> void:
	var z: Dictionary = ui.get_selected_zone()
	hdr_sub_lbl.text = z.get("label", "Cubierta Principal (C1)")
	exp_zone_lbl.text = z.get("label", "C1 · Cubierta Principal")
	exp_note_lbl.text = z.get("note", "")

	var req_count: int = ui.dm_requests.size()
	hdr_req_chip.text = "Sin solicitudes" if req_count == 0 else ("%d solicitud(es)" % req_count)
	hdr_mode_chip.text = "Combate · R%d" % ui.combat_round if ui.combat_active else "Exploración"
	hdr_proj_chip.text = "● Proyector en vivo [F3]" if ui.projector_ready else "○ Proyector en espera [F3]"

	if clock_readout_lbl and is_instance_valid(clock_readout_lbl):
		clock_readout_lbl.text = CampaignData.format_clock_day_time(ui.clock_seconds)["day_label"]

	_rebuild_players_list()
	_rebuild_encounter_card()
	_rebuild_requests_list()
	_rebuild_combat_window()
	if appearance: appearance.schedule_refresh()
