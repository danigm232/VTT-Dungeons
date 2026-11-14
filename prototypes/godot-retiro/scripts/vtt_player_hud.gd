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
var sheet_tabs_bar: HBoxContainer
var sheet_body_box: VBoxContainer
var _sheet_tab: String = "summary"

var inventory_modal: PanelContainer
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

	torch_chip = ThemeKit.make_label("🕯 Farol", 12, ThemeKit.COL_GOLD_BRIGHT)
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
	scene_notice_lbl = ThemeKit.make_label("Cubierta Principal (C1)", 13, ThemeKit.COL_HEADING)
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
	var ex_title := ThemeKit.make_label("Acciones del Aventurero", 13, ThemeKit.COL_HEADING)
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
	sheet_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 16)
	sheet_modal.name = "CharacterSheetModal"
	sheet_modal.set_anchors_preset(Control.PRESET_CENTER)
	sheet_modal.offset_left = -360
	sheet_modal.offset_top = -270
	sheet_modal.offset_right = 360
	sheet_modal.offset_bottom = 270
	sheet_modal.visible = false
	root.add_child(sheet_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	sheet_modal.add_child(vb)

	var hdr := HBoxContainer.new()
	vb.add_child(hdr)
	var title_vb := VBoxContainer.new()
	title_vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(title_vb)
	sheet_title_lbl = ThemeKit.make_label("Mia", 20, ThemeKit.COL_HEADING)
	title_vb.add_child(sheet_title_lbl)
	sheet_subtitle_lbl = ThemeKit.make_label("Clériga enana · Niv. 1", 12, ThemeKit.COL_MUTED)
	title_vb.add_child(sheet_subtitle_lbl)

	var close_b := Button.new()
	close_b.text = "✕"
	ThemeKit.style_button(close_b, "secondary", 8, 10, 6)
	close_b.pressed.connect(func(): close_modals())
	hdr.add_child(close_b)

	sheet_tabs_bar = HBoxContainer.new()
	sheet_tabs_bar.add_theme_constant_override("separation", 6)
	vb.add_child(sheet_tabs_bar)
	for tab in [["summary", "Resumen"], ["full", "Ficha completa"], ["edit", "Editar"]]:
		var tb := Button.new()
		tb.text = tab[1]
		tb.pressed.connect(func():
			_sheet_tab = tab[0]
			_rebuild_sheet_body()
		)
		sheet_tabs_bar.add_child(tb)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vb.add_child(scroll)

	sheet_body_box = VBoxContainer.new()
	sheet_body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sheet_body_box.add_theme_constant_override("separation", 8)
	scroll.add_child(sheet_body_box)

func _build_inventory_modal() -> void:
	inventory_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 16)
	inventory_modal.name = "InventoryModal"
	inventory_modal.set_anchors_preset(Control.PRESET_CENTER)
	inventory_modal.offset_left = -380
	inventory_modal.offset_top = -255
	inventory_modal.offset_right = 380
	inventory_modal.offset_bottom = 255
	inventory_modal.visible = false
	root.add_child(inventory_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	inventory_modal.add_child(vb)

	var hdr := HBoxContainer.new()
	hdr.add_theme_constant_override("separation", 8)
	vb.add_child(hdr)
	var title := ThemeKit.make_label("🎒 Mochila del grupo", 19, ThemeKit.COL_HEADING)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(title)
	inv_gold_lbl = ThemeKit.make_label("25 po", 14, ThemeKit.COL_GOLD_BRIGHT)
	hdr.add_child(inv_gold_lbl)
	var edit_btn := Button.new()
	edit_btn.text = "Editar mochila"
	ThemeKit.style_button(edit_btn, "secondary", 8, 10, 5)
	edit_btn.pressed.connect(func():
		_inv_edit_mode = not _inv_edit_mode
		inv_add_panel.visible = _inv_edit_mode
	)
	hdr.add_child(edit_btn)
	var close_b := Button.new()
	close_b.text = "✕"
	ThemeKit.style_button(close_b, "secondary", 8, 10, 5)
	close_b.pressed.connect(func(): close_modals())
	hdr.add_child(close_b)

	var tools := HBoxContainer.new()
	tools.add_theme_constant_override("separation", 6)
	vb.add_child(tools)
	inv_search_edit = LineEdit.new()
	inv_search_edit.placeholder_text = "Buscar objeto..."
	inv_search_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_line_edit(inv_search_edit)
	inv_search_edit.text_changed.connect(func(_t): _rebuild_inventory_list())
	tools.add_child(inv_search_edit)

	for f in [["all", "Todo"], ["weapon", "Armas"], ["gear", "Equipo"], ["treasure", "Tesoro"]]:
		var fb := Button.new()
		fb.text = f[1]
		ThemeKit.style_button(fb, "pill", 999, 10, 4)
		fb.pressed.connect(func():
			_inv_filter = f[0]
			_rebuild_inventory_list()
		)
		tools.add_child(fb)

	inv_add_panel = VBoxContainer.new()
	inv_add_panel.visible = false
	vb.add_child(inv_add_panel)
	var add_row := HBoxContainer.new()
	add_row.add_theme_constant_override("separation", 6)
	inv_add_panel.add_child(add_row)
	inv_add_name = LineEdit.new()
	inv_add_name.placeholder_text = "Nuevo objeto..."
	inv_add_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_line_edit(inv_add_name)
	add_row.add_child(inv_add_name)
	inv_add_qty = SpinBox.new()
	inv_add_qty.min_value = 1
	inv_add_qty.max_value = 99
	inv_add_qty.value = 1
	add_row.add_child(inv_add_qty)
	var add_btn := Button.new()
	add_btn.text = "+ Añadir"
	ThemeKit.style_button(add_btn, "primary", 8, 10, 5)
	add_btn.pressed.connect(func():
		var item_name := inv_add_name.text.strip_edges()
		if item_name != "":
			ui.add_inventory_item(item_name.to_lower().replace(" ", "_"), int(inv_add_qty.value), item_name)
			inv_add_name.text = ""
			_rebuild_inventory_list()
	)
	add_row.add_child(add_btn)

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	vb.add_child(body)

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_stretch_ratio = 1.35
	body.add_child(scroll)

	inv_list_box = VBoxContainer.new()
	inv_list_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inv_list_box.add_theme_constant_override("separation", 5)
	scroll.add_child(inv_list_box)

	var detail_panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 10)
	detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(detail_panel)
	var dvb := VBoxContainer.new()
	dvb.add_theme_constant_override("separation", 8)
	detail_panel.add_child(dvb)
	dvb.add_child(ThemeKit.make_eyebrow("INSPECCIÓN DE OBJETO"))
	inv_detail_title = ThemeKit.make_label("Antorcha de brea", 16, ThemeKit.COL_HEADING)
	dvb.add_child(inv_detail_title)
	inv_detail_desc = ThemeKit.make_label("Ilumina el casco y las bodegas inundadas.", 12, ThemeKit.COL_MUTED)
	inv_detail_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	inv_detail_desc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dvb.add_child(inv_detail_desc)
	inv_torch_btn = Button.new()
	inv_torch_btn.text = "🔥 Alternar Antorcha [V]"
	ThemeKit.style_button(inv_torch_btn, "primary", 8, 12, 8)
	inv_torch_btn.pressed.connect(func():
		ui.toggle_torch()
		_rebuild_inventory_list()
	)
	dvb.add_child(inv_torch_btn)

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
	settings_modal.add_child(vb)

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

	settings_grid_chk = CheckButton.new()
	settings_grid_chk.text = "Mostrar cuadrícula táctica"
	settings_grid_chk.button_pressed = ui.grid_enabled
	settings_grid_chk.toggled.connect(func(v): ui.set_grid_enabled(v))
	vb.add_child(settings_grid_chk)

	var op_row := HBoxContainer.new()
	op_row.add_theme_constant_override("separation", 8)
	vb.add_child(op_row)
	op_row.add_child(ThemeKit.make_label("Opacidad:", 12, ThemeKit.COL_MUTED))
	settings_opacity_slider = HSlider.new()
	settings_opacity_slider.min_value = 0.08
	settings_opacity_slider.max_value = 0.50
	settings_opacity_slider.step = 0.02
	settings_opacity_slider.value = ui.grid_opacity
	settings_opacity_slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	settings_opacity_slider.value_changed.connect(func(v): ui.set_grid_opacity(v))
	op_row.add_child(settings_opacity_slider)

	settings_notice_chk = CheckButton.new()
	settings_notice_chk.text = "Aviso del escenario"
	settings_notice_chk.button_pressed = ui.show_scene_notice
	settings_notice_chk.toggled.connect(func(v):
		ui.show_scene_notice = v
		refresh()
	)
	vb.add_child(settings_notice_chk)

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
	close_modals()
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
		_rebuild_inventory_list()
		inventory_modal.visible = true
	elif kind == "settings":
		settings_grid_chk.set_pressed_no_signal(ui.grid_enabled)
		settings_opacity_slider.set_value_no_signal(ui.grid_opacity)
		settings_notice_chk.set_pressed_no_signal(ui.show_scene_notice)
		settings_modal.visible = true

func close_modals() -> void:
	modal_backdrop.visible = false
	join_modal.visible = false
	hp_modal.visible = false
	sheet_modal.visible = false
	inventory_modal.visible = false
	settings_modal.visible = false

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
	for c in sheet_body_box.get_children():
		c.queue_free()
	var a: Dictionary = ui.get_active_actor()
	if a.is_empty():
		return
	sheet_title_lbl.text = "%s · Niv. %d" % [a["name"], a["level"]]
	sheet_subtitle_lbl.text = "%s · PG %d/%d · CA %d · Vel %.1f m" % [a["class_line"], a["hp"], a["hp_max"], a["ac"], a["speed"]]

	var tabs := sheet_tabs_bar.get_children()
	var keys := ["summary", "full", "edit"]
	for i in range(mini(tabs.size(), keys.size())):
		ThemeKit.style_button(tabs[i] as Button, "primary" if keys[i] == _sheet_tab else "secondary", 8, 12, 6)

	var stat_grid := HBoxContainer.new()
	stat_grid.add_theme_constant_override("separation", 8)
	sheet_body_box.add_child(stat_grid)
	var ab: Dictionary = a.get("abilities", {})
	for k in ["FUE", "DES", "CON", "INT", "SAB", "CAR"]:
		var val := int(ab.get(k, 10))
		var mod := floori(float(val - 10) / 2.0)
		var mod_str := ("+" if mod >= 0 else "") + str(mod)
		var box := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 8)
		box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		stat_grid.add_child(box)
		var svb := VBoxContainer.new()
		svb.alignment = BoxContainer.ALIGNMENT_CENTER
		box.add_child(svb)
		svb.add_child(ThemeKit.make_eyebrow(k))
		svb.add_child(ThemeKit.make_label("%d (%s)" % [val, mod_str], 13, ThemeKit.COL_HEADING))

	if _sheet_tab == "edit":
		var ac_row := HBoxContainer.new()
		ac_row.add_theme_constant_override("separation", 8)
		sheet_body_box.add_child(ac_row)
		ac_row.add_child(ThemeKit.make_label("Clase de Armadura (CA):", 13, ThemeKit.COL_MUTED))
		var ac_spin := SpinBox.new()
		ac_spin.min_value = 5
		ac_spin.max_value = 30
		ac_spin.value = a["ac"]
		ac_spin.value_changed.connect(func(v):
			a["ac"] = int(v)
			refresh()
		)
		ac_row.add_child(ac_spin)
		var spd_row := HBoxContainer.new()
		spd_row.add_theme_constant_override("separation", 8)
		sheet_body_box.add_child(spd_row)
		spd_row.add_child(ThemeKit.make_label("Velocidad (m):", 13, ThemeKit.COL_MUTED))
		var spd_spin := SpinBox.new()
		spd_spin.min_value = 3.0
		spd_spin.max_value = 18.0
		spd_spin.step = 1.5
		spd_spin.value = a["speed"]
		spd_spin.value_changed.connect(func(v):
			a["speed"] = float(v)
			refresh()
		)
		spd_row.add_child(spd_spin)
	else:
		sheet_body_box.add_child(ThemeKit.make_eyebrow("ATAQUES Y TRUCOS"))
		for atk in a.get("attacks", []):
			sheet_body_box.add_child(ThemeKit.make_label("• %s: %s al impacto, %s (%s)" % [atk["name"], atk["bonus"], atk["damage"], atk["range"]], 13, ThemeKit.COL_INK))
		var spells: Array = a.get("spells", [])
		if not spells.is_empty():
			sheet_body_box.add_child(ThemeKit.make_eyebrow("CONJUROS PREPARADOS"))
			for sp in spells:
				sheet_body_box.add_child(ThemeKit.make_label("• %s — %s" % [sp["name"], sp["detail"]], 13, ThemeKit.COL_INK))
		sheet_body_box.add_child(ThemeKit.make_eyebrow("RASGOS DE CLASE Y TRASFONDO"))
		for feat in a.get("features", []):
			sheet_body_box.add_child(ThemeKit.make_label("• " + str(feat), 12, ThemeKit.COL_MUTED))
		if _sheet_tab == "full":
			sheet_body_box.add_child(ThemeKit.make_eyebrow("EQUIPO INICIAL Y NOTAS"))
			sheet_body_box.add_child(ThemeKit.make_label(", ".join(PackedStringArray(a.get("gear", []))), 12, ThemeKit.COL_INK))
			var note := ThemeKit.make_label(a.get("notes", ""), 12, ThemeKit.COL_MUTED)
			note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			sheet_body_box.add_child(note)

func _rebuild_inventory_list() -> void:
	for c in inv_list_box.get_children():
		c.queue_free()
	var items: Dictionary = ui.get_inventory_items()
	var gold_count := int(items.get("gold", {}).get("count", 0))
	inv_gold_lbl.text = "💰 %d Monedas de oro" % gold_count
	var q := inv_search_edit.text.strip_edges().to_lower()

	for key in items.keys():
		var it: Dictionary = items[key]
		if int(it.get("count", 0)) <= 0:
			continue
		var nm: String = str(it.get("name", key))
		if q != "" and not (q in nm.to_lower()):
			continue
		if _inv_filter == "weapon" and not (key in ["dagger"] or "espada" in nm.to_lower() or "maza" in nm.to_lower() or "arco" in nm.to_lower()):
			continue
		if _inv_filter == "treasure" and not (key in ["gold", "gems", "stash", "hold_chest", "compass"]):
			continue
		if _inv_filter == "gear" and not (key in ["torch", "potion"]):
			continue

		var row_btn := Button.new()
		var badge := " [EQUIPADA 🔥]" if (key == "torch" and it.get("equipped", false)) else ""
		row_btn.text = "%s · x%d%s" % [nm, int(it["count"]), badge]
		row_btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		ThemeKit.style_button(row_btn, "primary" if key == _inv_selected_key else "secondary", 8, 10, 6)
		row_btn.pressed.connect(func():
			_inv_selected_key = key
			_update_inventory_detail()
			_rebuild_inventory_list()
		)
		inv_list_box.add_child(row_btn)

	_update_inventory_detail()

func _update_inventory_detail() -> void:
	var items: Dictionary = ui.get_inventory_items()
	var it: Dictionary = items.get(_inv_selected_key, {})
	if it.is_empty():
		inv_detail_title.text = "Selecciona un objeto"
		inv_detail_desc.text = "Pulsa sobre cualquier objeto de la mochila para ver su descripción."
		return
	inv_detail_title.text = "%s (x%d)" % [it.get("name", _inv_selected_key), int(it.get("count", 0))]
	inv_detail_desc.text = str(it.get("desc", "Objeto recogido durante la expedición."))

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
	torch_chip.text = "🔥 Antorcha viva" if torch_lit else "🕯 Farol activo"

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
