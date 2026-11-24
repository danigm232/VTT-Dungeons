class_name RetreatMylaShopPanel
extends CanvasLayer

## Tienda interactiva de Myla en Celda 4 (Canon PDF p. 8: vende equipo corriente del PHB).
## Descuenta monedas de oro del héroe activo y añade los objetos directamente a su mochila.

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")

const CATALOG: Array[Dictionary] = [
	{"id": "cuerda_canamo", "name": "Cuerda de cáñamo (15 m)", "price_gp": 1, "qty": 1, "desc": "15 metros de resistente cuerda de cáñamo trenzada."},
	{"id": "antorcha", "name": "Antorchas (×5)", "price_gp": 1, "qty": 5, "desc": "Cinco antorchas embreadas (1 h de luz cada una)."},
	{"id": "aceite_frasco", "name": "Frasco de aceite (×2)", "price_gp": 1, "qty": 2, "desc": "Dos frascos de aceite para farol o usos tácticos."},
	{"id": "raciones_viaje", "name": "Raciones de viaje (×3)", "price_gp": 2, "qty": 3, "desc": "Provisiones secas preparadas en la cocina del claustro."},
	{"id": "palanca", "name": "Palanca de hierro", "price_gp": 2, "qty": 1, "desc": "Otorga ventaja en pruebas de Fuerza para forzar puertas o cajas."},
	{"id": "garfio", "name": "Garfio de escalada", "price_gp": 2, "qty": 1, "desc": "Garfio forjado de tres puntas para acantilados y bordas."},
	{"id": "farol_capucha", "name": "Farol con capucha", "price_gp": 5, "qty": 1, "desc": "Ilumina 9 m con luz brillante y 9 m adicionales con luz tenue."},
	{"id": "botiquin", "name": "Botiquín de curandero", "price_gp": 5, "qty": 1, "desc": "Vendas, ungüentos de salvia y férulas (10 usos para estabilizar)."},
	{"id": "pocion_curacion", "name": "Poción de curación (Tarak)", "price_gp": 50, "qty": 1, "desc": "Restaura 2d4 + 2 PG. Destilada por Tarak en el claustro."},
	{"id": "fuego_alquimista", "name": "Fuego de alquimista", "price_gp": 50, "qty": 1, "desc": "Frasco inflamable de Myla («¡Prohibido a Laylee!»)."},
]

var _ui: Node = null
var _backdrop: ColorRect = null
var _panel: PanelContainer = null
var _gold_lbl: Label = null
var _hero_lbl: Label = null
var _items_box: VBoxContainer = null
var _status_lbl: Label = null

func setup(vtt_ui: Node) -> void:
	_ui = vtt_ui
	layer = 135
	visible = false
	_build_ui()

func _build_ui() -> void:
	_backdrop = ColorRect.new()
	_backdrop.color = Color(0.03, 0.04, 0.06, 0.56)
	_backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	_backdrop.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed:
			close_shop()
	)
	add_child(_backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	_panel = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 16)
	_panel.custom_minimum_size = Vector2(540, 500)
	center.add_child(_panel)

	var root_vb := VBoxContainer.new()
	root_vb.add_theme_constant_override("separation", 10)
	_panel.add_child(root_vb)

	var hdr := HBoxContainer.new()
	hdr.add_theme_constant_override("separation", 8)
	root_vb.add_child(hdr)

	var title_vb := VBoxContainer.new()
	title_vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hdr.add_child(title_vb)
	title_vb.add_child(ThemeKit.make_title("Taller y Tienda de Myla (Celda 4)", 18, ThemeKit.COL_HEADING))
	_hero_lbl = ThemeKit.make_label("Comprador: —", 12, ThemeKit.COL_MUTED)
	title_vb.add_child(_hero_lbl)

	_gold_lbl = ThemeKit.make_label("0 po", 16, ThemeKit.COL_GOLD_BRIGHT)
	hdr.add_child(_gold_lbl)

	var close_b := Button.new()
	close_b.text = "✕ Cerrar"
	ThemeKit.style_button(close_b, "secondary", 8, 12, 6)
	close_b.pressed.connect(close_shop)
	hdr.add_child(close_b)

	root_vb.add_child(HSeparator.new())

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(500, 340)
	root_vb.add_child(scroll)

	_items_box = VBoxContainer.new()
	_items_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_items_box.add_theme_constant_override("separation", 6)
	scroll.add_child(_items_box)

	_status_lbl = ThemeKit.make_label("«Puedo venderos cualquier equipo corriente de aventurero.» — Myla", 12, ThemeKit.COL_MUTED)
	_status_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root_vb.add_child(_status_lbl)

func open_shop() -> void:
	visible = true
	_rebuild_rows()

func close_shop() -> void:
	visible = false

func _unhandled_input(event: InputEvent) -> void:
	if visible and event is InputEventKey and event.pressed and not event.is_echo() and event.keycode == KEY_ESCAPE:
		close_shop()
		get_viewport().set_input_as_handled()

func _rebuild_rows() -> void:
	if not is_instance_valid(_ui) or not is_instance_valid(_items_box):
		return
	for c in _items_box.get_children():
		c.queue_free()
	var actor_name := str(_ui.call("get_active_hero_display_name")) if _ui.has_method("get_active_hero_display_name") else "Aventurero"
	var gold := int(_ui.call("get_active_hero_gold")) if _ui.has_method("get_active_hero_gold") else 15
	_hero_lbl.text = "Comprador activo: %s" % actor_name
	_gold_lbl.text = "🪙 %d po" % gold

	for item in CATALOG:
		var price := int(item["price_gp"])
		var row_p := ThemeKit.make_window_panel(ThemeKit.COL_BORDER_SOFT, 8)
		_items_box.add_child(row_p)
		var hb := HBoxContainer.new()
		hb.add_theme_constant_override("separation", 10)
		row_p.add_child(hb)

		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hb.add_child(info)
		info.add_child(ThemeKit.make_label(str(item["name"]), 13, ThemeKit.COL_HEADING))
		var d_lbl := ThemeKit.make_label(str(item["desc"]), 11, ThemeKit.COL_MUTED)
		d_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		info.add_child(d_lbl)

		var buy_b := Button.new()
		buy_b.text = "Comprar · %d po" % price
		buy_b.disabled = gold < price
		ThemeKit.style_button(buy_b, "primary" if gold >= price else "secondary", 8, 12, 6)
		var spec := item.duplicate(true)
		buy_b.pressed.connect(func():
			if _ui.has_method("purchase_myla_item"):
				var res: Dictionary = _ui.call("purchase_myla_item", spec)
				_status_lbl.text = str(res.get("message", ""))
				_rebuild_rows()
		)
		hb.add_child(buy_b)
