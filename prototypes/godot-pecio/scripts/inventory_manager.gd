class_name InventoryManager
extends CanvasLayer

# Gestor de Inventario y Mochila Táctica Canónica para Dungeons VTT (Pecio Rosa de los Vientos)
# - Almacena objetos canónicos del pecio (antorchas, oro, pociones, brújula, dagas, gemas)
# - Control rápido de antorcha ([V] Encender / Apagar antorcha equipada)
# - Interfaz HUD flotante de mochila ([I] o [B])
# - Notificaciones de botín y mensajes de interacción en pantalla ([T] Interactuar)

signal torch_toggled(is_lit: bool)
signal item_collected(item_name: String)

var items: Dictionary = {
	"torch": {"name": "Antorcha de brea", "count": 2, "equipped": false, "desc": "Antorcha impregnada en pez. Ilumina 14 m con llama viva."},
	"gold": {"name": "Monedas de oro", "count": 25, "equipped": false, "desc": "Monedas acuñadas en Neverwinter y Waterdeep."},
	"potion": {"name": "Poción de curación", "count": 1, "equipped": false, "desc": "Frasco de cristal con líquido rojo brillante (2d4+2 PG)."},
	"dagger": {"name": "Daga de plata", "count": 2, "equipped": false, "desc": "Hoja afilada forjada con aleación de plata pura."},
	"compass": {"name": "Brújula náutica", "count": 0, "equipped": false, "desc": "Instrumento de navegación de latón dorado recuperado de C4."},
	"gems": {"name": "Gemas ojo de tigre", "count": 0, "equipped": false, "desc": "Gemas brillantes extraídas del nido de la arpía en la cofa."}
}

var is_backpack_open: bool = false
var prompt_text: String = ""
var external_ui_managed: bool = false

# Referencias UI
var hud_root: Control
var status_bar: HBoxContainer
var prompt_label: Label
var backpack_panel: PanelContainer
var backpack_grid: VBoxContainer
var torch_indicator: Label
var camera_indicator: Label
var notification_label: Label
var notif_timer: float = 0.0

func _ready() -> void:
	layer = 100 # Por encima del render 3D
	build_hud()

func build_hud() -> void:
	hud_root = Control.new()
	hud_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hud_root)

	# 1. Indicador de interacción contextual [T] (Centro inferior)
	prompt_label = Label.new()
	prompt_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	prompt_label.position = Vector2(-220, -110)
	prompt_label.size = Vector2(440, 42)
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	prompt_label.text = ""

	var style_prompt = StyleBoxFlat.new()
	style_prompt.bg_color = Color(0.04, 0.10, 0.14, 0.88)
	style_prompt.border_color = Color(0.95, 0.78, 0.25, 0.95) # Dorado
	style_prompt.set_border_width_all(2)
	style_prompt.set_corner_radius_all(6)
	prompt_label.add_theme_stylebox_override("normal", style_prompt)
	prompt_label.add_theme_color_override("font_color", Color(0.98, 0.96, 0.90))
	prompt_label.add_theme_font_size_override("font_size", 15)
	prompt_label.visible = false
	hud_root.add_child(prompt_label)

	# 2. Barra de estado inferior izquierda (Antorcha y Mochila)
	status_bar = HBoxContainer.new()
	status_bar.position = Vector2(24, 24)
	status_bar.set_anchors_preset(Control.PRESET_TOP_LEFT)
	status_bar.add_theme_constant_override("separation", 12)
	status_bar.visible = not external_ui_managed
	hud_root.add_child(status_bar)

	torch_indicator = Label.new()
	var style_torch = StyleBoxFlat.new()
	style_torch.bg_color = Color(0.08, 0.14, 0.18, 0.85)
	style_torch.border_color = Color(0.35, 0.65, 0.75, 0.8)
	style_torch.set_border_width_all(1)
	style_torch.set_corner_radius_all(4)
	style_torch.content_margin_left = 12
	style_torch.content_margin_right = 12
	style_torch.content_margin_top = 6
	style_torch.content_margin_bottom = 6
	torch_indicator.add_theme_stylebox_override("normal", style_torch)
	torch_indicator.add_theme_font_size_override("font_size", 13)
	torch_indicator.text = "[V] Antorcha: FAROL ACTIVO"
	status_bar.add_child(torch_indicator)

	var backpack_btn_label = Label.new()
	backpack_btn_label.add_theme_stylebox_override("normal", style_torch)
	backpack_btn_label.add_theme_font_size_override("font_size", 13)
	backpack_btn_label.text = "[I / B] Mochila de Héroe"
	status_bar.add_child(backpack_btn_label)

	camera_indicator = Label.new()
	camera_indicator.add_theme_stylebox_override("normal", style_torch)
	camera_indicator.add_theme_font_size_override("font_size", 13)
	camera_indicator.visible = false
	status_bar.add_child(camera_indicator)

	# 3. Notificación de botín (Esquina superior derecha)
	notification_label = Label.new()
	notification_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	notification_label.position = Vector2(-360, 24)
	notification_label.size = Vector2(336, 40)
	var style_notif = StyleBoxFlat.new()
	style_notif.bg_color = Color(0.06, 0.22, 0.18, 0.90)
	style_notif.border_color = Color(0.42, 0.88, 0.72)
	style_notif.set_border_width_all(1)
	style_notif.set_corner_radius_all(4)
	notification_label.add_theme_stylebox_override("normal", style_notif)
	notification_label.add_theme_color_override("font_color", Color(0.85, 0.98, 0.92))
	notification_label.add_theme_font_size_override("font_size", 13)
	notification_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	notification_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	notification_label.visible = false
	hud_root.add_child(notification_label)

	# 4. Panel desplegable de la Mochila [I]
	build_backpack_panel()

func build_backpack_panel() -> void:
	backpack_panel = PanelContainer.new()
	backpack_panel.set_anchors_preset(Control.PRESET_CENTER)
	backpack_panel.position = Vector2(-190, -180)
	backpack_panel.size = Vector2(380, 360)
	backpack_panel.visible = false

	var style_panel = StyleBoxFlat.new()
	style_panel.bg_color = Color(0.06, 0.11, 0.14, 0.96)
	style_panel.border_color = Color(0.95, 0.78, 0.25, 0.9)
	style_panel.set_border_width_all(2)
	style_panel.set_corner_radius_all(8)
	style_panel.content_margin_left = 18
	style_panel.content_margin_right = 18
	style_panel.content_margin_top = 16
	style_panel.content_margin_bottom = 16
	backpack_panel.add_theme_stylebox_override("panel", style_panel)

	var main_vbox = VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 10)
	backpack_panel.add_child(main_vbox)

	var title = Label.new()
	title.text = "🎒 MOCHILA DEL GRUPO · PECIO ROSA"
	title.add_theme_font_size_override("font_size", 15)
	title.add_theme_color_override("font_color", Color(0.98, 0.88, 0.55))
	main_vbox.add_child(title)

	var sep = HSeparator.new()
	main_vbox.add_child(sep)

	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(344, 240)
	main_vbox.add_child(scroll)

	backpack_grid = VBoxContainer.new()
	backpack_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	backpack_grid.add_theme_constant_override("separation", 6)
	scroll.add_child(backpack_grid)

	var hint = Label.new()
	hint.text = "Pulsa [I] o [B] para cerrar · [V] para equipar Antorcha"
	hint.add_theme_font_size_override("font_size", 11)
	hint.add_theme_color_override("font_color", Color(0.65, 0.75, 0.78))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	main_vbox.add_child(hint)

	hud_root.add_child(backpack_panel)
	refresh_backpack_ui()

func refresh_backpack_ui() -> void:
	if not backpack_grid:
		return

	for child in backpack_grid.get_children():
		child.queue_free()

	for key in items:
		var it = items[key]
		var count = it["count"]
		if count > 0:
			var row = HBoxContainer.new()
			var name_lbl = Label.new()
			name_lbl.text = it["name"] + (" (x" + str(count) + ")" if count > 1 else "")
			name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			name_lbl.add_theme_font_size_override("font_size", 13)
			if key == "torch" and it["equipped"]:
				name_lbl.text += " [EQUIPADA 🔥]"
				name_lbl.add_theme_color_override("font_color", Color(1.0, 0.75, 0.25))
			else:
				name_lbl.add_theme_color_override("font_color", Color(0.92, 0.94, 0.95))
			row.add_child(name_lbl)
			backpack_grid.add_child(row)

func set_external_ui_managed(managed: bool) -> void:
	external_ui_managed = managed
	if status_bar:
		status_bar.visible = not external_ui_managed
	if prompt_label and external_ui_managed:
		prompt_label.visible = false
	if notification_label and external_ui_managed:
		notification_label.visible = false

func show_prompt(text: String) -> void:
	prompt_text = text
	if prompt_label:
		prompt_label.text = prompt_text
		prompt_label.visible = (prompt_text != "") and not external_ui_managed

func hide_prompt() -> void:
	show_prompt("")

func show_notification(msg: String) -> void:
	if notification_label and not external_ui_managed:
		notification_label.text = msg
		notification_label.visible = true
		notif_timer = 3.5

func toggle_torch() -> void:
	var torch = items["torch"]
	torch["equipped"] = not torch["equipped"]
	emit_signal("torch_toggled", torch["equipped"])
	if torch_indicator:
		if torch["equipped"]:
			torch_indicator.text = "[V] Antorcha: LLAMA VIVA 🔥 (14 m)"
			torch_indicator.add_theme_color_override("font_color", Color(1.0, 0.82, 0.35))
			show_notification("🔥 ¡Antorcha encendida! Visión ampliada.")
		else:
			torch_indicator.text = "[V] Antorcha: FAROL ACTIVO (7.5 m)"
			torch_indicator.remove_theme_color_override("font_color")
			show_notification("Farol cálido activo.")
	refresh_backpack_ui()

func toggle_backpack() -> void:
	is_backpack_open = not is_backpack_open
	if backpack_panel:
		backpack_panel.visible = is_backpack_open
		if is_backpack_open:
			refresh_backpack_ui()

func add_item(item_id: String, amount: int = 1, display_name: String = "") -> void:
	if items.has(item_id):
		items[item_id]["count"] += amount
		var name_str = display_name if display_name != "" else items[item_id]["name"]
		show_notification("✨ Obtenido: " + name_str + (" x" + str(amount) if amount > 1 else ""))
		emit_signal("item_collected", name_str)
	else:
		items[item_id] = {"name": display_name if display_name != "" else item_id, "count": amount, "equipped": false, "desc": "Objeto del pecio."}
		show_notification("✨ Obtenido: " + items[item_id]["name"])
		emit_signal("item_collected", items[item_id]["name"])
	refresh_backpack_ui()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		# Tecla V: Alternar antorcha viva
		if event.keycode == KEY_V:
			toggle_torch()
			get_viewport().set_input_as_handled()
		# Tecla I o B: Abrir / Cerrar mochila (cuando no hay HUD canónico VttRoleUi)
		elif not external_ui_managed and (event.keycode == KEY_I or event.keycode == KEY_B):
			toggle_backpack()
			get_viewport().set_input_as_handled()

func _process(delta: float) -> void:
	if notif_timer > 0.0:
		notif_timer -= delta
		if notif_timer <= 0.0 and notification_label:
			notification_label.visible = false
	if camera_indicator:
		var cam := get_viewport().get_camera_3d()
		if cam and cam.is_processing() and cam.has_method("get_hud_status_text"):
			camera_indicator.visible = true
			camera_indicator.text = cam.get_hud_status_text()
		else:
			camera_indicator.visible = false
