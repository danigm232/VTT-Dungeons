class_name VttPlayerHud
extends RefCounted

const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const CampaignData := preload("res://scripts/vtt_campaign_data.gd")

var ui # VttRoleUi
var root: Control

# Top-left identity & dropdown
var identity_btn: Button
var hp_btn: Button
var status_chip: Label
var torch_chip: Label
var identity_menu: PanelContainer
var identity_menu_open: bool = false

# Top-right clock
var clock_time_lbl: Label
var clock_sub_lbl: Label

# Top-center scene & combat notice
var scene_notice_panel: PanelContainer
var scene_notice_lbl: Label
var combat_notice_panel: PanelContainer
var combat_notice_lbl: Label
var toast_panel: PanelContainer
var toast_lbl: Label

# Bottom-left virtual joystick
var joystick: ThemeKit.TacticalThumbStick

# Bottom-right actions
var interact_btn: Button
var action_toggle_btn: Button
var exploration_menu: PanelContainer
var exploration_list: VBoxContainer
var end_turn_btn: Button
var exploration_open: bool = false

# Combat strip (bottom center)
var combat_strip: PanelContainer
var combat_init_row: HBoxContainer
var combat_hero_lbl: Label
var combat_cmd_row: HBoxContainer

# Modals
var modal_backdrop: ColorRect
var join_modal: PanelContainer
var join_cards_row: HBoxContainer
var join_confirm_btn: Button
var _pending_join_id: String = "mia"

var hp_modal: PanelContainer
var hp_modal_title: Label
var hp_modal_current_lbl: Label
var hp_amount_spin: SpinBox

var sheet_modal: PanelContainer
var sheet_title_lbl: Label
var sheet_subtitle_lbl: Label
var sheet_tabs_bar: Control
var sheet_body_box: VBoxContainer
var _sheet_tab: String = "summary"

var inventory_modal
var inv_search_edit: LineEdit
var inv_gold_lbl: Label
var inv_list_box: VBoxContainer
var inv_detail_title: Label
var inv_detail_desc: Label
var inv_torch_btn: Button
var inv_add_panel: VBoxContainer
var inv_add_name: LineEdit
var inv_add_qty: SpinBox
var _inv_filter: String = "all"
var _inv_edit_mode: bool = false
var _inv_selected_key: String = "torch"

var settings_modal: PanelContainer
var settings_grid_chk: CheckButton
var settings_opacity_slider: HSlider
var settings_notice_chk: CheckButton

func _init(owner_ui) -> void:
	ui = owner_ui

func build(parent: Control) -> Control:
	root = Control.new()
	root.name = "PlayerInterfaceRoot"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(root)

	_build_top_identity()
	_build_top_clock()
	_build_center_notices()
	_build_joystick()
	_build_bottom_actions()
	_build_combat_hud()
	_build_modals()
	refresh()
	return root

func _build_top_identity() -> void:
	var wrap := VBoxContainer.new()
	wrap.name = "IdentityWrap"
	wrap.position = Vector2(20, 18)
	wrap.add_theme_constant_override("separation", 8)
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(wrap)

	var bar := ThemeKit.make_panel_style(ThemeKit.COL_PANEL, ThemeKit.COL_BORDER, 14, 10, 8, 1)
	var bar_panel := PanelContainer.new()
	bar_panel.add_theme_stylebox_override("panel", bar)
	wrap.add_child(bar_panel)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	bar_panel.add_child(row)

	identity_btn = Button.new()
	identity_btn.name = "IdentityButton"
	ThemeKit.style_button(identity_btn, "pill", 999, 12, 6)
	identity_btn.pressed.connect(func():
		identity_menu_open = not identity_menu_open
		identity_menu.visible = identity_menu_open
	)
	row.add_child(identity_btn)

	hp_btn = Button.new()
	hp_btn.name = "HpButton"
	ThemeKit.style_button(hp_btn, "danger", 999, 12, 6)
	hp_btn.pressed.connect(func(): open_modal("hp"))
	row.add_child(hp_btn)

	status_chip = ThemeKit.make_label("Exploración", 12, ThemeKit.COL_GREEN)
	var chip_wrap := ThemeKit.make_pill_panel(Color(0.396, 0.761, 0.541, 0.55), Color(0.05, 0.14, 0.12, 0.85))
	chip_wrap.add_child(status_chip)
	row.add_child(chip_wrap)

	torch_chip = ThemeKit.make_label("🕯 Sin antorcha", 12, ThemeKit.COL_MUTED)
	var torch_wrap := ThemeKit.make_pill_panel(ThemeKit.COL_BORDER_SOFT, Color(0.06, 0.11, 0.13, 0.85))
	torch_wrap.add_child(torch_chip)
	row.add_child(torch_wrap)

	# Desplegable rápido de jugador
	identity_menu = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 12)
	identity_menu.name = "IdentityMenu"
	identity_menu.visible = false
	wrap.add_child(identity_menu)

	var mbox := VBoxContainer.new()
	mbox.add_theme_constant_override("separation", 6)
	identity_menu.add_child(mbox)

	var actions := [
		["▤ Hoja de personaje", func(): open_modal("sheet")],
		["🎒 Mochila y equipo [I]", func(): open_modal("inventory")],
		["⇄ Cambiar aventurero", func(): open_modal("join")],
		["⚙ Configuración y cámara", func(): open_modal("settings")],
		["◎ Enfocar vista Detalle", func(): ui.cam_detail()],
		["▧ Vista Conjunto / Mapa", func(): ui.cam_overview_toggle()]
	]
	for item in actions:
		var b := Button.new()
		b.text = item[0]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		ThemeKit.style_button(b, "ghost", 8, 10, 6)
		b.pressed.connect(func():
			identity_menu_open = false
			identity_menu.visible = false
			item[1].call()
		)
		mbox.add_child(b)

func _build_top_clock() -> void:
	var panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 12)
	panel.name = "PlayerClockOverlay"
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -258
	panel.offset_top = 18
	panel.offset_right = -20
	panel.offset_bottom = 86
	root.add_child(panel)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 2)
	panel.add_child(vb)

	var eye := ThemeKit.make_eyebrow("RELOJ DE CAMPAÑA")
	vb.add_child(eye)

	clock_time_lbl = ThemeKit.make_label("Día 1 · 12:00:00", 16, ThemeKit.COL_HEADING)
	vb.add_child(clock_time_lbl)

	clock_sub_lbl = ThemeKit.make_label("Mediodía · Despejado · Exploración", 11, ThemeKit.COL_MUTED)
	vb.add_child(clock_sub_lbl)

func _build_center_notices() -> void:
	var vb := VBoxContainer.new()
	vb.name = "CenterNotices"
	vb.set_anchors_preset(Control.PRESET_TOP_WIDE)
	vb.offset_left = 430
	vb.offset_right = -430
	vb.offset_top = 58
	vb.add_theme_constant_override("separation", 6)
	vb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(vb)

	scene_notice_panel = ThemeKit.make_pill_panel(ThemeKit.COL_BORDER, ThemeKit.COL_PANEL)
	scene_notice_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(scene_notice_panel)
	scene_notice_lbl = ThemeKit.make_title("Cubierta Principal (C1)", 13, ThemeKit.COL_HEADING)
	scene_notice_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	scene_notice_panel.add_child(scene_notice_lbl)

	combat_notice_panel = ThemeKit.make_pill_panel(ThemeKit.COL_COMBAT, Color(0.06, 0.14, 0.22, 0.94))
	combat_notice_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	combat_notice_panel.visible = false
	vb.add_child(combat_notice_panel)
	combat_notice_lbl = ThemeKit.make_label("Ronda 1 · Tu turno", 13, Color(0.86, 0.95, 1.0))
	combat_notice_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	combat_notice_panel.add_child(combat_notice_lbl)

	toast_panel = ThemeKit.make_pill_panel(ThemeKit.COL_GOLD, Color(0.05, 0.12, 0.13, 0.95))
	toast_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	toast_panel.visible = false
	vb.add_child(toast_panel)
	toast_lbl = ThemeKit.make_label("", 12, ThemeKit.COL_GOLD_BRIGHT)
	toast_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_panel.add_child(toast_lbl)

func _build_joystick() -> void:
	var panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER_SOFT, 999)
	panel.name = "JoystickContainer"
	panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	panel.offset_left = 22
	panel.offset_top = -170
	panel.offset_right = 166
	panel.offset_bottom = -22
	panel.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color(0.03, 0.07, 0.08, 0.55), ThemeKit.COL_BORDER_SOFT, 999, 6, 6, 1))
	root.add_child(panel)

	joystick = ThemeKit.TacticalThumbStick.new()
	joystick.name = "VirtualJoystick"
	joystick.direction_changed.connect(func(dir: Vector2): ui.set_virtual_joystick_vector(dir))
	panel.add_child(joystick)

func _build_bottom_actions() -> void:
	var wrap := VBoxContainer.new()
	wrap.name = "ActionControls"
	wrap.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	wrap.offset_left = -350
	wrap.offset_top = -360
	wrap.offset_right = -22
	wrap.offset_bottom = -22
	wrap.alignment = BoxContainer.ALIGNMENT_END
	wrap.add_theme_constant_override("separation", 8)
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(wrap)

	exploration_menu = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 12)
	exploration_menu.name = "ExplorationMenu"
	exploration_menu.visible = false
	wrap.add_child(exploration_menu)

	var ex_vb := VBoxContainer.new()
	ex_vb.add_theme_constant_override("separation", 6)
	exploration_menu.add_child(ex_vb)

	var ex_hdr := HBoxContainer.new()
	ex_vb.add_child(ex_hdr)
	var ex_title := ThemeKit.make_title("Acciones del Aventurero", 13, ThemeKit.COL_HEADING)
	ex_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ex_hdr.add_child(ex_title)
	var ex_close := Button.new()
	ex_close.text = "✕"
	ThemeKit.style_button(ex_close, "ghost", 6, 8, 2)
	ex_close.pressed.connect(func(): toggle_exploration_menu(false))
	ex_hdr.add_child(ex_close)

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(296, 220)
	ex_vb.add_child(scroll)

	exploration_list = VBoxContainer.new()
	exploration_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	exploration_list.add_theme_constant_override("separation", 4)
	scroll.add_child(exploration_list)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_END
	row.add_theme_constant_override("separation", 8)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	wrap.add_child(row)

	interact_btn = Button.new()
	interact_btn.name = "InteractButton"
	interact_btn.text = "Acércate al objetivo"
	interact_btn.disabled = true
	ThemeKit.style_button(interact_btn, "primary", 999, 14, 9)
	interact_btn.pressed.connect(func(): ui.trigger_nearby_interaction())
	row.add_child(interact_btn)

	action_toggle_btn = Button.new()
	action_toggle_btn.name = "ActionToggleButton"
	action_toggle_btn.text = "⚔ Acciones"
	ThemeKit.style_button(action_toggle_btn, "pill_active", 999, 14, 9)
	action_toggle_btn.pressed.connect(func(): toggle_exploration_menu(not exploration_open))
	row.add_child(action_toggle_btn)

	end_turn_btn = Button.new()
	end_turn_btn.name = "EndTurnButton"
	end_turn_btn.text = "Terminar turno →"
	end_turn_btn.visible = false
	ThemeKit.style_button(end_turn_btn, "combat", 999, 14, 9)
	end_turn_btn.pressed.connect(func(): ui.next_combat_turn())
	row.add_child(end_turn_btn)

func _build_combat_hud() -> void:
	combat_strip = ThemeKit.make_window_panel(ThemeKit.COL_COMBAT, 12)
	combat_strip.name = "CombatHudStrip"
	combat_strip.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	combat_strip.offset_left = -330
	combat_strip.offset_top = -126
	combat_strip.offset_right = 220
	combat_strip.offset_bottom = -20
	combat_strip.visible = false
	root.add_child(combat_strip)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 6)
	combat_strip.add_child(vb)

	combat_init_row = HBoxContainer.new()
	combat_init_row.add_theme_constant_override("separation", 6)
	vb.add_child(combat_init_row)

	combat_hero_lbl = ThemeKit.make_label("Movimiento: 7.5 m · Acción disponible", 12, ThemeKit.COL_HEADING)
	vb.add_child(combat_hero_lbl)

	combat_cmd_row = HBoxContainer.new()
	combat_cmd_row.add_theme_constant_override("separation", 6)
	vb.add_child(combat_cmd_row)

	var cmds := [
		["⚔ Atacar", func(): ui.perform_player_combat_action("Atacar", "attack")],
		["✨ Conjurar", func(): ui.perform_player_combat_action("Conjurar", "cast")],
		["🛡 Esquivar", func(): ui.perform_player_combat_action("Esquivar", "stealth")],
		["💨 Correr", func(): ui.perform_player_combat_action("Correr (+7.5 m)", "interact")]
	]
	for cmd in cmds:
		var b := Button.new()
		b.text = cmd[0]
		ThemeKit.style_button(b, "secondary", 8, 10, 5)
		b.pressed.connect(cmd[1])
		combat_cmd_row.add_child(b)

func _build_modals() -> void:
	modal_backdrop = ColorRect.new()
	modal_backdrop.name = "PlayerModalBackdrop"
	modal_backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	modal_backdrop.color = Color(0.015, 0.035, 0.045, 0.68)
	modal_backdrop.visible = false
	modal_backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	modal_backdrop.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			close_modals()
	)
	root.add_child(modal_backdrop)

	_build_join_modal()
	_build_hp_modal()
	_build_sheet_modal()
	_build_inventory_modal()
	_build_settings_modal()

func _build_join_modal() -> void:
	join_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 16)
	join_modal.name = "PlayerJoinModal"
	join_modal.set_anchors_preset(Control.PRESET_CENTER)
	join_modal.offset_left = -360
	join_modal.offset_top = -200
	join_modal.offset_right = 360
	join_modal.offset_bottom = 200
	join_modal.visible = false
	root.add_child(join_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 12)
	join_modal.add_child(vb)

	var eye := ThemeKit.make_eyebrow(ui.meta.get("title", "El Rosa de los Vientos") + " · MESA DE JUGADORES")
	vb.add_child(eye)
	var title := ThemeKit.make_label("Elige tu aventurero", 22, ThemeKit.COL_HEADING)
	vb.add_child(title)
	var sub := ThemeKit.make_label("Selecciona el personaje con el que vas a explorar, combatir y abrir tu mochila o ficha.", 12, ThemeKit.COL_MUTED)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(sub)

	join_cards_row = HBoxContainer.new()
	join_cards_row.add_theme_constant_override("separation", 10)
	vb.add_child(join_cards_row)

	var footer := HBoxContainer.new()
	footer.alignment = BoxContainer.ALIGNMENT_END
	footer.add_theme_constant_override("separation", 8)
	vb.add_child(footer)

	var cancel_btn := Button.new()
	cancel_btn.text = "Cerrar"
	ThemeKit.style_button(cancel_btn, "secondary", 8, 14, 8)
	cancel_btn.pressed.connect(func(): close_modals())
	footer.add_child(cancel_btn)

	join_confirm_btn = Button.new()
	join_confirm_btn.name = "JoinConfirmButton"
	join_confirm_btn.text = "Entrar a la mesa"
	ThemeKit.style_button(join_confirm_btn, "gold_solid", 8, 18, 9)
	join_confirm_btn.pressed.connect(func():
		ui.select_player_character(_pending_join_id)
		close_modals()
	)
	footer.add_child(join_confirm_btn)

func _build_hp_modal() -> void:
	hp_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 14)
	hp_modal.name = "HpDialogModal"
	hp_modal.set_anchors_preset(Control.PRESET_CENTER)
	hp_modal.offset_left = -190
	hp_modal.offset_top = -130
	hp_modal.offset_right = 190
	hp_modal.offset_bottom = 130
	hp_modal.visible = false
	root.add_child(hp_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	hp_modal.add_child(vb)

	hp_modal_title = ThemeKit.make_label("Puntos de golpe", 18, ThemeKit.COL_HEADING)
	vb.add_child(hp_modal_title)
	hp_modal_current_lbl = ThemeKit.make_label("Actuales: 11 / 11", 14, ThemeKit.COL_INK)
	vb.add_child(hp_modal_current_lbl)

	var spin_row := HBoxContainer.new()
	spin_row.add_theme_constant_override("separation", 10)
	vb.add_child(spin_row)
	spin_row.add_child(ThemeKit.make_label("Cantidad:", 13, ThemeKit.COL_MUTED))
	hp_amount_spin = SpinBox.new()
	hp_amount_spin.min_value = 1
	hp_amount_spin.max_value = 99
	hp_amount_spin.value = 1
	hp_amount_spin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spin_row.add_child(hp_amount_spin)

	var btn_row := HBoxContainer.new()
	btn_row.add_theme_constant_override("separation", 8)
	vb.add_child(btn_row)

	var dmg_btn := Button.new()
	dmg_btn.name = "HpDamageButton"
	dmg_btn.text = "Daño −"
	dmg_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(dmg_btn, "danger", 8, 12, 8)
	dmg_btn.pressed.connect(func():
		ui.apply_hp_delta(ui.selected_actor_id, -int(hp_amount_spin.value))
		refresh()
	)
	btn_row.add_child(dmg_btn)

	var heal_btn := Button.new()
	heal_btn.name = "HpHealButton"
	heal_btn.text = "Curación +"
	heal_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_button(heal_btn, "primary", 8, 12, 8)
	heal_btn.pressed.connect(func():
		ui.apply_hp_delta(ui.selected_actor_id, int(hp_amount_spin.value))
		refresh()
	)
	btn_row.add_child(heal_btn)

	var close_btn := Button.new()
	close_btn.text = "Listo"
	ThemeKit.style_button(close_btn, "secondary", 8, 12, 6)
	close_btn.pressed.connect(func(): close_modals())
	vb.add_child(close_btn)

func _build_sheet_modal() -> void:
	var host := Control.new()
	host.name = "CharacterSheetHost"
	host.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	host.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.ui_root.add_child(host)
	var backdrop := ColorRect.new()
	backdrop.name = "CharacterSheetBackdrop"
	backdrop.color = Color(0.025, 0.018, 0.012, 0.20)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.hide()
	host.add_child(backdrop)
	backdrop.gui_input.connect(func(event):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT: close_modals()
	)
	sheet_modal = preload("res://character_sheet/character_sheet.gd").new()
	sheet_modal.setup(ui, close_modals)
	sheet_modal.set("external_backdrop", backdrop)
	host.add_child(sheet_modal)
	sheet_title_lbl = sheet_modal.get("title_label")
	sheet_subtitle_lbl = sheet_modal.get("subtitle_label")
	sheet_tabs_bar = sheet_modal.get("tabs")
	sheet_body_box = sheet_modal.get("body_box")

func _build_inventory_modal() -> void:
	inventory_modal = preload("res://inventory/backpack_panel.gd").new()
	inventory_modal.setup(ui)
	inventory_modal.close_requested.connect(close_modals)
	root.add_child(inventory_modal)

func _build_settings_modal() -> void:
	settings_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 14)
	settings_modal.name = "PlayerSettingsModal"
	settings_modal.set_anchors_preset(Control.PRESET_CENTER)
	settings_modal.offset_left = -220
	settings_modal.offset_top = -185
	settings_modal.offset_right = 220
	settings_modal.offset_bottom = 185
	settings_modal.visible = false
	root.add_child(settings_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	var scroll:=ScrollContainer.new()
	scroll.name="PlayerSettingsScroll"
	scroll.custom_minimum_size=Vector2(minf(560,root.get_viewport_rect().size.x-60),minf(560,root.get_viewport_rect().size.y-160))
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	settings_modal.add_child(scroll)
	vb.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	scroll.add_child(vb)

	var hdr := HBoxContainer.new()
	vb.add_child(hdr)
	var title := ThemeKit.make_label("Configuración y cámara", 18, ThemeKit.COL_HEADING)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(title)
	var close_b := Button.new()
	close_b.text = "✕"
	ThemeKit.style_button(close_b, "secondary", 8, 9, 4)
	close_b.pressed.connect(func(): close_modals())
	hdr.add_child(close_b)

	ui.preferences.build_controls(vb)

	vb.add_child(ThemeKit.make_eyebrow("CÁMARA TÁCTICA"))
	var cam_row1 := HBoxContainer.new()
	cam_row1.add_theme_constant_override("separation", 6)
	vb.add_child(cam_row1)
	for c in [["↶ Q", func(): ui.cam_orbit(-1)], ["↷ E", func(): ui.cam_orbit(1)], ["↓ Bajar", func(): ui.cam_tilt(-1)], ["↑ Subir", func(): ui.cam_tilt(1)]]:
		var cb := Button.new()
		cb.text = c[0]
		cb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(cb, "secondary", 8, 8, 5)
		if cb.text.begins_with("↓") or cb.text.begins_with("↑"):
			var direction: int = -1 if cb.text.begins_with("↓") else 1
			cb.button_down.connect(func(): ui.camera._begin_tilt_hold(direction))
			cb.button_up.connect(func(): ui.camera._end_tilt_hold())
		else:
			cb.pressed.connect(c[1])
		cam_row1.add_child(cb)

	var cam_row2 := HBoxContainer.new()
	cam_row2.add_theme_constant_override("separation", 6)
	vb.add_child(cam_row2)
	for c in [["◎ Detalle", func(): ui.cam_detail()], ["▧ Conjunto", func(): ui.cam_overview_toggle()], ["↺ Inicio", func(): ui.cam_reset()]]:
		var cb := Button.new()
		cb.text = c[0]
		cb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ThemeKit.style_button(cb, "secondary", 8, 8, 5)
		cb.pressed.connect(c[1])
		cam_row2.add_child(cb)

	var follow_row := HBoxContainer.new()
	follow_row.add_theme_constant_override("separation",6)
	vb.add_child(follow_row)
	for item in [["Fija","fixed"],["Por zonas","semiFixed"],["Seguir","follow"]]:
		var button := Button.new()
		button.text = item[0]
		ThemeKit.style_button(button,"secondary",8,8,5)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(func(): ui.camera.set_follow_mode(item[1]))
		follow_row.add_child(button)

func open_modal(kind: String) -> void:
	if kind=="inventory" and sheet_modal.visible:
		sheet_modal._release_inventory(); sheet_modal.hide()
		modal_backdrop.color=Color(0.015,0.035,0.045,0.68); modal_backdrop.show()
		if not ui.inventory_bridge.session.is_open: ui.inventory_bridge.begin()
		inventory_modal.refresh_view(); inventory_modal.show(); return
	if kind=="sheet" and inventory_modal.visible:
		inventory_modal.hide(); modal_backdrop.color=Color.TRANSPARENT
		_rebuild_sheet_body(); sheet_modal.show(); return
	if kind == "sheet" and sheet_modal.visible:
		sheet_modal.call("select_tab", "summary")
		return
	close_modals()
	modal_backdrop.color = Color.TRANSPARENT if kind == "sheet" else Color(0.015, 0.035, 0.045, 0.68)
	modal_backdrop.visible = true
	if kind == "join":
		_pending_join_id = ui.selected_actor_id
		_rebuild_join_cards()
		join_modal.visible = true
	elif kind == "hp":
		var a: Dictionary = ui.get_active_actor()
		hp_modal_title.text = "Puntos de golpe · %s" % a["name"]
		hp_modal_current_lbl.text = "Actuales: %d / %d" % [a["hp"], a["hp_max"]]
		hp_modal.visible = true
	elif kind == "sheet":
		_rebuild_sheet_body()
		sheet_modal.visible = true
	elif kind == "inventory":
		ui.inventory_bridge.begin()
		inventory_modal.refresh_view()
		inventory_modal.visible = true
	elif kind == "settings":
		ui.preferences.sync_controls()
		settings_modal.visible = true

func close_modals() -> void:
	modal_backdrop.visible = false
	join_modal.visible = false
	hp_modal.visible = false
	sheet_modal.visible = false
	inventory_modal.visible = false
	settings_modal.visible = false
	ui.inventory_bridge.finish()

func toggle_exploration_menu(show: bool) -> void:
	exploration_open = show
	exploration_menu.visible = show
	if show:
		_rebuild_exploration_menu()

func _rebuild_join_cards() -> void:
	for c in join_cards_row.get_children():
		c.queue_free()
	for actor in ui.actors:
		var aid: String = actor["id"]
		var is_sel := aid == _pending_join_id
		var card := ThemeKit.make_window_panel(actor["color"] if is_sel else ThemeKit.COL_BORDER, 12)
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		join_cards_row.add_child(card)
		var vb := VBoxContainer.new()
		vb.add_theme_constant_override("separation", 6)
		card.add_child(vb)
		var portrait := preload("res://character_sheet/presentation.gd").Medallion.new()
		portrait.texture = preload("res://character_sheet/presentation.gd").portrait(actor, ui.tokens_by_node.get(actor.get("node_name", "")))
		portrait.custom_minimum_size = Vector2(76, 76)
		portrait.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		vb.add_child(portrait)
		var nm := ThemeKit.make_label(actor["name"], 17, actor["color"])
		vb.add_child(nm)
		var arch := ThemeKit.make_label(actor["archetype"], 12, ThemeKit.COL_INK)
		arch.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vb.add_child(arch)
		var stats := ThemeKit.make_label("PG %d/%d · CA %d · Vel %.1f m" % [actor["hp"], actor["hp_max"], actor["ac"], actor["speed"]], 11, ThemeKit.COL_MUTED)
		vb.add_child(stats)
		var pick_btn := Button.new()
		pick_btn.text = "Seleccionado ✓" if is_sel else "Elegir"
		ThemeKit.style_button(pick_btn, "primary" if is_sel else "secondary", 8, 10, 6)
		pick_btn.pressed.connect(func():
			_pending_join_id = aid
			_rebuild_join_cards()
		)
		vb.add_child(pick_btn)

func _rebuild_exploration_menu() -> void:
	for c in exploration_list.get_children():
		c.queue_free()
	var actor: Dictionary = ui.get_active_actor()
	if not actor.is_empty():
		exploration_list.add_child(ThemeKit.make_eyebrow("ATAQUES"))
		for atk in actor.get("attacks", []):
			var b := Button.new()
			b.text = "⚔ %s (%s · %s)" % [atk["name"], atk["bonus"], atk["damage"]]
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			ThemeKit.style_button(b, "secondary", 8, 10, 5)
			b.pressed.connect(func():
				ui.perform_player_combat_action(atk["name"], "attack")
				toggle_exploration_menu(false)
			)
			exploration_list.add_child(b)
		var spells: Array = actor.get("spells", [])
		if not spells.is_empty():
			exploration_list.add_child(ThemeKit.make_eyebrow("CONJUROS"))
			for sp in spells:
				var sb := Button.new()
				sb.text = "✨ %s · %s" % [sp["name"], sp["detail"]]
				sb.alignment = HORIZONTAL_ALIGNMENT_LEFT
				ThemeKit.style_button(sb, "secondary", 8, 10, 5)
				sb.pressed.connect(func():
					ui.perform_player_combat_action(sp["name"], "cast")
					toggle_exploration_menu(false)
				)
				exploration_list.add_child(sb)
	exploration_list.add_child(ThemeKit.make_eyebrow("POSES Y GESTOS ANIMADOS"))
	var quick_poses := [
		["🪑 Sentarse / Levantarse [Z]", "stance", "sit"],
		["🛏 Tumbarse / Incorporarse [X]", "stance", "prone"],
		["🕯 Encender / Apagar antorcha [V]", "torch", ""],
		["🤸 Saltar [J]", "anim", "jump"],
		["🤫 Sigilo [Ctrl]", "stance", "stealth"],
	]
	for qp in quick_poses:
		var qb := Button.new()
		qb.text = qp[0]
		qb.alignment = HORIZONTAL_ALIGNMENT_LEFT
		ThemeKit.style_button(qb, "secondary", 8, 10, 5)
		var q_kind: String = qp[1]
		var q_arg: String = qp[2]
		qb.pressed.connect(func():
			if q_kind == "torch":
				ui.toggle_torch()
			else:
				var t = ui.get_active_token_node()
				if t and q_kind == "stance" and t.has_method("set_stance"):
					t.set_stance(q_arg)
				elif t and q_kind == "anim" and t.has_method("play_action_animation"):
					t.play_action_animation(q_arg)
			toggle_exploration_menu(false)
		)
		exploration_list.add_child(qb)
	exploration_list.add_child(ThemeKit.make_eyebrow("ACCIONES DE EXPLORACIÓN"))
	for act in CampaignData.get_basic_exploration_actions():
		var ab := Button.new()
		ab.text = "%s — %s" % [act["label"], act["detail"]]
		ab.alignment = HORIZONTAL_ALIGNMENT_LEFT
		ThemeKit.style_button(ab, "ghost", 8, 10, 5)
		ab.pressed.connect(func():
			ui.perform_player_exploration_action(act)
			toggle_exploration_menu(false)
		)
		exploration_list.add_child(ab)

func _rebuild_sheet_body() -> void:
	if not sheet_modal.visible:
		sheet_modal.set("tab", "combat" if _sheet_tab == "full" else "summary")
	sheet_modal.call("refresh_view")

func _rebuild_inventory_list() -> void:
	inventory_modal.refresh_view()

func _update_inventory_detail() -> void:
	inventory_modal.refresh_view()

func show_toast(msg: String) -> void:
	if msg == "":
		toast_panel.visible = false
	else:
		toast_lbl.text = msg
		toast_panel.visible = true

func set_interaction_prompt(text: String, enabled: bool) -> void:
	if enabled and text != "":
		interact_btn.text = text
		interact_btn.disabled = false
		ThemeKit.style_button(interact_btn, "gold_solid", 999, 14, 9)
	else:
		interact_btn.text = "Acércate al objetivo"
		interact_btn.disabled = true
		ThemeKit.style_button(interact_btn, "secondary", 999, 14, 9)

func refresh() -> void:
	var a: Dictionary = ui.get_active_actor()
	if not a.is_empty():
		identity_btn.text = "%s ⌄" % a["name"]
		hp_btn.text = "♥ PG %d/%d" % [a["hp"], a["hp_max"]]
		if hp_modal.visible:
			hp_modal_current_lbl.text = "Actuales: %d / %d" % [a["hp"], a["hp_max"]]
	var torch_lit: bool = ui.is_torch_lit()
	torch_chip.text = "🔥 Antorcha viva" if torch_lit else "🕯 Sin antorcha"
	torch_chip.add_theme_color_override("font_color", ThemeKit.COL_GOLD_BRIGHT if torch_lit else ThemeKit.COL_MUTED)

	var clock_info := CampaignData.format_clock_day_time(ui.clock_seconds)
	clock_time_lbl.text = clock_info["day_label"]
	var mode_str := "Combate" if ui.combat_active else ("Pausado" if not ui.clock_running else "Exploración")
	clock_sub_lbl.text = "%s · %s · %s" % [
		CampaignData.get_time_label_es(ui.get_env_time()),
		CampaignData.get_weather_label_es(ui.get_env_weather()),
		mode_str
	]

	scene_notice_panel.visible = ui.show_scene_notice
	scene_notice_lbl.text = ui.get_current_zone_display()

	combat_notice_panel.visible = ui.combat_active
	combat_strip.visible = ui.combat_active
	end_turn_btn.visible = ui.combat_active
	if ui.combat_active:
		var turn: Dictionary = ui.get_current_combatant()
		var is_my_turn: bool = not turn.is_empty() and turn.get("id", "") == ui.selected_actor_id
		status_chip.text = "¡Tu turno!" if is_my_turn else "En combate"
		combat_notice_lbl.text = "Ronda %d · Turno de %s" % [ui.combat_round, turn.get("name", "—")]
		combat_hero_lbl.text = "%s · Mov. %.1f m · CA %d · Inic. +%d" % [
			a.get("name", "Héroe"),
			float(a.get("speed", 7.5)),
			int(a.get("ac", 14)),
			int(a.get("initiative_bonus", 0))
		]
		for ch in combat_init_row.get_children():
			ch.queue_free()
		for i in range(ui.combat_order.size()):
			var entry: Dictionary = ui.combat_order[i]
			var pill := ThemeKit.make_pill_panel(
				ThemeKit.COL_GOLD_BRIGHT if i == ui.combat_turn_idx else ThemeKit.COL_BORDER,
				Color(0.32, 0.23, 0.09, 0.94) if i == ui.combat_turn_idx else ThemeKit.COL_SURFACE
			)
			pill.add_child(ThemeKit.make_label("%s (%d)" % [entry["name"], entry["init"]], 11, ThemeKit.COL_HEADING if i == ui.combat_turn_idx else ThemeKit.COL_INK))
			combat_init_row.add_child(pill)
	else:
		status_chip.text = "Exploración"
