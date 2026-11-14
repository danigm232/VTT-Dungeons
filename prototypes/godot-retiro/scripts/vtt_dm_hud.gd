class_name VttDmHud
extends RefCounted

const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const CampaignData := preload("res://scripts/vtt_campaign_data.gd")

var ui # VttRoleUi
var root: Control

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
var enemy_tabs_row: HBoxContainer
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
	t_row.add_child(ThemeKit.make_label(ui.meta.get("title", "El Rosa de los Vientos"), 17, ThemeKit.COL_HEADING))
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
	drawer_panel.offset_right = 376
	drawer_panel.offset_bottom = -66
	drawer_panel.visible = false
	root.add_child(drawer_panel)

	var dscroll := ScrollContainer.new()
	dscroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	drawer_panel.add_child(dscroll)

	drawer_body = VBoxContainer.new()
	drawer_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	drawer_body.add_theme_constant_override("separation", 8)
	dscroll.add_child(drawer_body)

func _build_map_tools() -> void:
	var wrap := VBoxContainer.new()
	wrap.name = "DmMapToolsWrap"
	wrap.z_index = 10
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
	pscroll.custom_minimum_size = Vector2(340, 290)
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
	left_scroll.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
	z_btn.text = "⌖ Cambiar zona"
	ThemeKit.style_button(z_btn, "secondary", 8, 10, 5)
	z_btn.pressed.connect(func():
		_active_map_tab = "scene"
		_rebuild_map_pop()
	)
	exp_btns.add_child(z_btn)
	var cut_btn := Button.new()
	cut_btn.text = "↺ Vista Exterior"
	ThemeKit.style_button(cut_btn, "secondary", 8, 10, 5)
	cut_btn.pressed.connect(func(): ui.focus_zone("exterior"))
	exp_btns.add_child(cut_btn)

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
	right_scroll.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
	players_list_box = VBoxContainer.new()
	players_list_box.add_theme_constant_override("separation", 6)
	pl_vb.add_child(players_list_box)

	win_encounter = _create_window("PNJ y Amenazas de Escena", "encounter", right_col)
	var enc_vb := win_encounter.find_child("WindowBody", true, false) as VBoxContainer
	enemy_tabs_row = HBoxContainer.new()
	enemy_tabs_row.add_theme_constant_override("separation", 6)
	enc_vb.add_child(enemy_tabs_row)
	enemy_body_box = VBoxContainer.new()
	enemy_body_box.add_theme_constant_override("separation", 6)
	enc_vb.add_child(enemy_body_box)

func _create_window(title_text: String, win_key: String, parent: Control) -> PanelContainer:
	var panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 12)
	panel.name = "DmWin_" + win_key
	parent.add_child(panel)

	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 6)
	panel.add_child(outer)

	var hdr := HBoxContainer.new()
	outer.add_child(hdr)
	var t := ThemeKit.make_label(title_text, 14, ThemeKit.COL_HEADING)
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

func _rebuild_drawer() -> void:
	drawer_panel.visible = drawer_open
	for k in rail_buttons.keys():
		ThemeKit.style_button(rail_buttons[k], "primary" if (drawer_open and drawer_tab == k) else "ghost", 10, 4, 6)
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
		gentle.text = "Efectos suaves (menor carga GPU)"
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

		for adv in [["+10 min", 600], ["Descanso corto +1h", 3600], ["Descanso largo +8h", 28800]]:
			var ab := Button.new()
			ab.text = adv[0]
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
		reset_b.text = "↺ Inicio mesa recomendada"
		ThemeKit.style_button(reset_b, "secondary", 8, 10, 6)
		reset_b.pressed.connect(func(): apply_layout_preset("balanced"))
		drawer_body.add_child(reset_b)
		drawer_body.add_child(ThemeKit.make_label("Atajos: F1 Jugador · F2 DM · F3 Proyector", 11, ThemeKit.COL_MUTED))

func _rebuild_map_pop() -> void:
	map_tools_pop.visible = _active_map_tab != ""
	if _active_map_tab == "":
		return
	for c in map_tools_pop_body.get_children():
		c.queue_free()

	if _active_map_tab == "scene":
		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("ZONAS Y CUBIERTAS DEL ESCENARIO"))
		for z in ui.get_zones_list():
			var zb := Button.new()
			zb.text = z["label"]
			zb.alignment = HORIZONTAL_ALIGNMENT_LEFT
			ThemeKit.style_button(zb, "primary" if z["id"] == ui.selected_zone_id else "secondary", 8, 10, 5)
			zb.pressed.connect(func():
				ui.focus_zone(z["id"])
				_rebuild_map_pop()
			)
			map_tools_pop_body.add_child(zb)

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

		map_tools_pop_body.add_child(ThemeKit.make_eyebrow("SALIDAS Y CONEXIONES ENTRE MAPAS"))
		var exits: Array = ui.get_scene_exits()
		var mark_chk := CheckButton.new()
		mark_chk.text = "Resaltar salidas (DM)"
		mark_chk.button_pressed = not exits.is_empty() and bool(exits[0].get("_dm_highlighted"))
		mark_chk.toggled.connect(func(v):
			ui.set_dm_exits_highlighted(v)
		)
		map_tools_pop_body.add_child(mark_chk)
		for ex in exits:
			var erow := HBoxContainer.new()
			erow.add_theme_constant_override("separation", 6)
			map_tools_pop_body.add_child(erow)
			var elbl := ThemeKit.make_label("%s" % str(ex.get("display_name")), 12, ThemeKit.COL_INK)
			elbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			erow.add_child(elbl)
			var lock_b := Button.new()
			var is_locked := bool(ex.get("dm_locked"))
			lock_b.text = "Abrir" if is_locked else "Cerrar"
			ThemeKit.style_button(lock_b, "secondary" if is_locked else "primary", 8, 8, 4)
			lock_b.pressed.connect(func():
				ui.toggle_exit_lock(str(ex.get("exit_id")))
				_rebuild_map_pop()
			)
			erow.add_child(lock_b)
			var go_b := Button.new()
			go_b.text = "Viajar"
			ThemeKit.style_button(go_b, "secondary", 8, 8, 4)
			go_b.pressed.connect(func():
				ui.travel_to_exit(str(ex.get("exit_id")))
			)
			erow.add_child(go_b)
		if exits.is_empty():
			map_tools_pop_body.add_child(ThemeKit.make_label("Sin salidas registradas en esta escena.", 12, ThemeKit.COL_MUTED))

func _rebuild_players_list() -> void:
	for c in players_list_box.get_children():
		c.queue_free()
	for a in ui.actors:
		var aid: String = a["id"]
		var is_sel: bool = aid == ui.selected_actor_id
		var card := ThemeKit.make_window_panel(a["color"] if is_sel else ThemeKit.COL_BORDER_SOFT, 10)
		players_list_box.add_child(card)
		var vb := VBoxContainer.new()
		vb.add_theme_constant_override("separation", 4)
		card.add_child(vb)

		var top := HBoxContainer.new()
		top.add_theme_constant_override("separation", 6)
		vb.add_child(top)
		var nm := ThemeKit.make_label("%s (%s)" % [a["name"], a["class_line"].split(" · ")[0]], 13, a["color"])
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		top.add_child(nm)
		var hp_l := ThemeKit.make_label("PG %d/%d · CA %d" % [a["hp"], a["hp_max"], a["ac"]], 12, ThemeKit.COL_HEADING)
		top.add_child(hp_l)

		var acts := HBoxContainer.new()
		acts.add_theme_constant_override("separation", 4)
		vb.add_child(acts)
		var m_btn := Button.new()
		m_btn.text = "-1 PG"
		ThemeKit.style_button(m_btn, "danger", 6, 8, 3)
		m_btn.pressed.connect(func(): ui.apply_hp_delta(aid, -1))
		acts.add_child(m_btn)

		var p_btn := Button.new()
		p_btn.text = "+1 PG"
		ThemeKit.style_button(p_btn, "secondary", 6, 8, 3)
		p_btn.pressed.connect(func(): ui.apply_hp_delta(aid, +1))
		acts.add_child(p_btn)

		var foc_btn := Button.new()
		foc_btn.text = "Controlar" if not is_sel else "Activo ✓"
		foc_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(foc_btn, "primary" if is_sel else "secondary", 6, 8, 3)
		foc_btn.pressed.connect(func(): ui.select_player_character(aid))
		acts.add_child(foc_btn)

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
	var z := ThemeKit.make_label("%s · PG %d/%d · CA %d" % [en["zone"], en["hp"], en["hp_max"], en["ac"]], 12, ThemeKit.COL_INK)
	z.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(z)

	var vis_btn := Button.new()
	vis_btn.text = "Visible 👁" if en["revealed"] else "Oculta"
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
