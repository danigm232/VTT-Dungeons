class_name VttProjectorHud
extends RefCounted

const ThemeKit := preload("res://scripts/vtt_ui_theme.gd")
const CampaignData := preload("res://scripts/vtt_campaign_data.gd")

var ui # VttRoleUi
var root: Control

# Pantalla de preparación
var prepare_overlay: ColorRect
var enter_btn: Button

# HUD de pared / proyector
var clock_time_lbl: Label
var clock_sub_lbl: Label
var combat_banner: PanelContainer
var combat_banner_lbl: Label
var audio_notice: PanelContainer
var audio_toggle_btn: Button
var save_indicator: PanelContainer
var save_lbl: Label

var audio_notice_dismissed: bool = false

func _init(owner_ui) -> void:
	ui = owner_ui

func build(parent: Control) -> Control:
	root = Control.new()
	root.name = "ProjectorInterfaceRoot"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(root)

	_build_stage_hud()
	_build_prepare_overlay()
	refresh()
	return root

func _build_stage_hud() -> void:
	# Reloj superior izquierdo (.game-clock-overlay)
	var clock_panel := ThemeKit.make_window_panel(ThemeKit.COL_BORDER, 14)
	clock_panel.name = "ProjectorClockOverlay"
	clock_panel.position = Vector2(22, 22)
	clock_panel.custom_minimum_size = Vector2(236, 0)
	root.add_child(clock_panel)

	var cvb := VBoxContainer.new()
	cvb.add_theme_constant_override("separation", 2)
	clock_panel.add_child(cvb)
	cvb.add_child(ThemeKit.make_eyebrow(ui.meta.get("title", "EL ROSA DE LOS VIENTOS")))
	clock_time_lbl = ThemeKit.make_label("Día 1 · 12:00:00", 17, ThemeKit.COL_HEADING)
	cvb.add_child(clock_time_lbl)
	clock_sub_lbl = ThemeKit.make_label("Mediodía · Despejado", 12, ThemeKit.COL_MUTED)
	cvb.add_child(clock_sub_lbl)

	# Banner superior central de combate (#combatHud)
	combat_banner = ThemeKit.make_pill_panel(ThemeKit.COL_GOLD_BRIGHT, Color(0.035, 0.082, 0.094, 0.94))
	combat_banner.name = "ProjectorCombatBanner"
	combat_banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	combat_banner.offset_left = -190
	combat_banner.offset_top = 24
	combat_banner.offset_right = 190
	combat_banner.offset_bottom = 66
	combat_banner.visible = false
	root.add_child(combat_banner)

	combat_banner_lbl = ThemeKit.make_label("Ronda 1 · turno de Mia", 15, ThemeKit.COL_HEADING)
	combat_banner_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	combat_banner.add_child(combat_banner_lbl)

	# Aviso superior derecho de audio (#audioNotice)
	audio_notice = ThemeKit.make_pill_panel(ThemeKit.COL_BORDER, ThemeKit.COL_PANEL)
	audio_notice.name = "ProjectorAudioNotice"
	audio_notice.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	audio_notice.offset_left = -280
	audio_notice.offset_top = 22
	audio_notice.offset_right = -22
	audio_notice.offset_bottom = 62
	root.add_child(audio_notice)

	var arow := HBoxContainer.new()
	arow.add_theme_constant_override("separation", 8)
	audio_notice.add_child(arow)
	audio_toggle_btn = Button.new()
	audio_toggle_btn.text = "♪ Activar sonido"
	ThemeKit.style_button(audio_toggle_btn, "primary", 999, 10, 4)
	audio_toggle_btn.pressed.connect(func():
		ui.audio_muted = not ui.audio_muted
		audio_notice_dismissed = true
		refresh()
	)
	arow.add_child(audio_toggle_btn)

	var close_a := Button.new()
	close_a.text = "✕"
	ThemeKit.style_button(close_a, "ghost", 999, 8, 4)
	close_a.pressed.connect(func():
		audio_notice_dismissed = true
		refresh()
	)
	arow.add_child(close_a)

	# Indicador inferior de guardado (.save-indicator)
	save_indicator = ThemeKit.make_pill_panel(ThemeKit.COL_GOLD, Color(0.035, 0.082, 0.094, 0.94))
	save_indicator.name = "ProjectorSaveIndicator"
	save_indicator.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	save_indicator.offset_left = -190
	save_indicator.offset_top = -62
	save_indicator.offset_right = 190
	save_indicator.offset_bottom = -22
	save_indicator.visible = false
	root.add_child(save_indicator)
	save_lbl = ThemeKit.make_label("Guardando partida · Sincronizando la mesa…", 13, ThemeKit.COL_GOLD_BRIGHT)
	save_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	save_indicator.add_child(save_lbl)

func _build_prepare_overlay() -> void:
	prepare_overlay = ColorRect.new()
	prepare_overlay.name = "ProjectorPrepareOverlay"
	prepare_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	prepare_overlay.color = Color(0.025, 0.062, 0.075, 0.94)
	prepare_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(prepare_overlay)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	prepare_overlay.add_child(center)

	var card := ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 18)
	card.custom_minimum_size = Vector2(540, 0)
	center.add_child(card)

	var vb := VBoxContainer.new()
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 12)
	card.add_child(vb)

	var eye := ThemeKit.make_eyebrow("D&D IMMERSIVE ENGINE · ALPHA 0.3")
	eye.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vb.add_child(eye)

	var title := ThemeKit.make_label("Mesa inmersiva", 40, ThemeKit.COL_HEADING)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vb.add_child(title)

	var sub := ThemeKit.make_label("Prepara la escena para mostrarla en la pared o televisor. El sonido y la pantalla completa se pueden activar después.", 14, ThemeKit.COL_MUTED)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(sub)

	enter_btn = Button.new()
	enter_btn.name = "EnterProjectorButton"
	enter_btn.text = "ENTRAR AL PROYECTOR"
	enter_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	ThemeKit.style_button(enter_btn, "gold_solid", 999, 26, 12)
	enter_btn.pressed.connect(func(): ui.dismiss_projector_prepare())
	vb.add_child(enter_btn)

	var hint := ThemeKit.make_label("F11: Pantalla completa · F1: Jugador · F2: DM · F3: Proyector", 12, ThemeKit.COL_MUTED)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vb.add_child(hint)

func refresh() -> void:
	prepare_overlay.visible = not ui.projector_ready

	var clock_info := CampaignData.format_clock_day_time(ui.clock_seconds)
	clock_time_lbl.text = clock_info["day_label"]
	clock_sub_lbl.text = "%s · %s" % [
		CampaignData.get_time_label_es(ui.get_env_time()),
		CampaignData.get_weather_label_es(ui.get_env_weather())
	]

	combat_banner.visible = ui.combat_active
	if ui.combat_active:
		var turn: Dictionary = ui.get_current_combatant()
		combat_banner_lbl.text = "Ronda %d · turno de %s" % [ui.combat_round, turn.get("name", "—")]

	audio_notice.visible = ui.projector_ready and not audio_notice_dismissed
	save_indicator.visible = ui.save_flash_timer > 0.0
