extends PanelContainer
signal close_requested
const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")
const Catalogue = preload("res://inventory/item_catalogue.gd")
const Art = preload("res://character_sheet/skin.gd")
const Fantasy = preload("res://character_sheet/sheet_widgets.gd")
var embedded: bool = false
var ui
var bridge
var selected_key: String = ""
var filter_id: String = "all"
var editing: bool = false
var search: LineEdit
var title: Label
var gold: Label
var portrait: TextureRect
var hero_name: Label
var hero_class: Label
var hero_stats: Label
var outfit: Label
var hand: Label
var portrait_panel: PanelContainer
var body: GridContainer
var grid: GridContainer
var detail_icon: TextureRect
var detail_title: Label
var detail_description: Label
var take_button: Button
var store_button: Button
var pending_label: Label
var scope_label: Label
var undo_button: Button
var item_scroll: ScrollContainer
var add_control: Button
var consume_button: Button
var transfer_button: Button
var action_buttons: HFlowContainer
var operation_row: VBoxContainer
var operation_amount: SpinBox
var recipient: OptionButton
var operation_hint: Label
var operation=""
var operation_key=""
var edit_row: HBoxContainer
var add_name: LineEdit
var add_count: SpinBox
var filters: Dictionary = {}
var serif: SystemFont
var refresh_left: float = 0
var stock_signature: String = ""

func set_embedded(value: bool) -> void:
	if embedded == value: return
	var was_visible=visible; var query=search.text if is_instance_valid(search) else ""
	for child in get_children(): remove_child(child); child.queue_free()
	filters.clear(); setup(ui,value)
	search.text=query; edit_row.visible=editing; stock_signature=""
	set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	size_flags_horizontal=Control.SIZE_EXPAND_FILL; size_flags_vertical=Control.SIZE_EXPAND_FILL
	visible=was_visible; _fit_layout()

func setup(owner_ui, as_tab: bool = false) -> void:
	ui = owner_ui
	embedded = as_tab
	bridge = ui.inventory_bridge
	name = "InventoryModal"
	visible = false
	serif = SystemFont.new()
	serif.font_names = PackedStringArray(["Georgia", "Noto Serif", "serif"])
	add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color("#111b1c"), Color("#b19456"), 10, 18, 15, 2))
	if embedded: add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	var main := VBoxContainer.new()
	main.add_theme_constant_override("separation", 6 if embedded else 10)
	add_child(main)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	if embedded:
		var band := PanelContainer.new()
		var bs := StyleBoxEmpty.new(); bs.content_margin_left = 10; bs.content_margin_right = 10; bs.content_margin_top = 4; bs.content_margin_bottom = 5
		band.add_theme_stylebox_override("panel", bs)
		var ribbon := Fantasy.Cartouche.new(); band.add_child(ribbon); band.resized.connect(ribbon.queue_redraw)
		main.add_child(band)
		band.add_child(header)
	else:
		main.add_child(header)
	var hicon := _image("backpack", 24 if embedded else 34)
	if embedded: hicon.modulate = Color("#ffecc4")
	header.add_child(hicon)
	title = _label("Mochila del grupo", 21 if embedded else 23, ThemeKit.COL_HEADING, true)
	if embedded:
		title.add_theme_color_override("font_color", Art.IVORY)
		title.add_theme_color_override("font_shadow_color", Color("#1e0e05"))
		title.add_theme_constant_override("shadow_offset_y", 1)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.clip_text = true
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	header.add_child(title)
	gold = _label("", 15 if embedded else 14, ThemeKit.COL_GOLD_BRIGHT, embedded)
	if embedded: gold.add_theme_color_override("font_color", Color("#f7d996"))
	header.add_child(gold)
	var edit := _button("Editar", "edit")
	add_control=edit
	edit.tooltip_text = "Añadir objetos a la mochila"
	edit.pressed.connect(func(): editing = not editing; edit_row.visible = editing)
	header.add_child(edit)
	var alternate := _button("Abrir mochila" if embedded else "Ver en ficha", "backpack" if embedded else "book")
	alternate.visible=ui.current_role=="player"
	alternate.tooltip_text="Abrir el mismo inventario en la otra vista"
	alternate.pressed.connect(func():
		if embedded: ui.player_hud.open_modal("inventory")
		else:
			ui.player_hud.open_modal("sheet")
			ui.player_hud.sheet_modal.select_tab("inventory")
	)
	header.add_child(alternate)
	var close_button := _button("", "close")
	close_button.tooltip_text = "Cerrar mochila · I / B / Esc"
	close_button.accessibility_name="Cerrar mochila"
	close_button.pressed.connect(func(): close_requested.emit())
	close_button.visible = not embedded
	header.add_child(close_button)
	if embedded:
		for hb in [edit, alternate]:
			hb.custom_minimum_size.y = 28
			hb.add_theme_font_size_override("font_size", 14)
			hb.add_theme_color_override("font_color", Color("#fff0cf"))
			hb.add_theme_color_override("font_hover_color", Color("#fff0cf"))
			var hs := StyleBoxFlat.new(); hs.bg_color = Color("#3a1e18"); hs.border_color = Color("#c89a45"); hs.set_border_width_all(1); hs.set_corner_radius_all(4)
			hs.content_margin_left = 8; hs.content_margin_right = 8; hs.content_margin_top = 2; hs.content_margin_bottom = 2
			hb.add_theme_stylebox_override("normal", hs)
			var hh := hs.duplicate(); hh.bg_color = Color("#6b2629"); hh.border_color = Color("#f1cd7e")
			hb.add_theme_stylebox_override("hover", hh)
	scope_label=_label("",14,ThemeKit.COL_MUTED)
	scope_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	main.add_child(scope_label)
	if not embedded: main.add_child(HSeparator.new())
	body = GridContainer.new()
	body.columns = 2
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("h_separation", 16)
	body.add_theme_constant_override("v_separation", 12)
	var body_scroll := ScrollContainer.new()
	body_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	main.add_child(body_scroll)
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_scroll.add_child(body)
	_build_hero()
	if embedded: portrait_panel.hide(); body.columns = 1
	_build_bag()
	var footer := HBoxContainer.new()
	main.add_child(footer)
	pending_label = _label("Sacar y guardar se animará al cerrar la mochila.", 12, ThemeKit.COL_MUTED)
	pending_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	pending_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(pending_label)
	undo_button = _button("Deshacer preparación", "undo")
	undo_button.pressed.connect(func(): bridge.session.discard(); refresh_view())
	footer.add_child(undo_button)
	if not resized.is_connected(_fit_layout): resized.connect(_fit_layout)

func _ready() -> void:
	get_viewport().size_changed.connect(_fit_layout)
	_fit_layout()

func _build_hero() -> void:
	portrait_panel = ThemeKit.make_window_panel(Color("#77603b"), 8)
	portrait_panel.custom_minimum_size.x = 210
	portrait_panel.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color("#202522"), Color("#77603b"), 8, 12, 12))
	body.add_child(portrait_panel)
	var content := VBoxContainer.new()
	portrait_panel.add_child(content)
	content.add_child(_label("EL AVENTURERO", 11, ThemeKit.COL_GOLD))
	hero_name = _label("", 24, ThemeKit.COL_HEADING, true)
	content.add_child(hero_name)
	hero_class = _label("", 12, ThemeKit.COL_MUTED)
	hero_class.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(hero_class)
	portrait = TextureRect.new()
	portrait.name = "EquipmentPortrait"
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.custom_minimum_size = Vector2(130, 240)
	portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	content.add_child(portrait)
	hero_stats = _label("", 14, ThemeKit.COL_GOLD_BRIGHT)
	hero_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	content.add_child(hero_stats)
	content.add_child(HSeparator.new())
	outfit = _label("", 12, ThemeKit.COL_INK)
	outfit.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(outfit)
	hand = _label("", 12, ThemeKit.COL_INK)
	hand.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(hand)

func _build_bag() -> void:
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 5 if embedded else 8)
	body.add_child(content)
	search = LineEdit.new()
	search.placeholder_text = "Buscar en la mochila…"
	search.accessibility_name = "Buscar objetos en la mochila"
	ThemeKit.style_line_edit(search)
	if embedded: Art.style_field(search)
	search.text_changed.connect(func(_text): refresh_view())
	content.add_child(search)
	var categories := HFlowContainer.new()
	categories.add_theme_constant_override("h_separation", 6)
	content.add_child(categories)
	for definition in [["all", "Todos", "backpack"], ["weapons", "Armas", "sword"], ["armor", "Vestir", "shield"], ["gear", "Equipo", "tools"], ["consumables", "Consumibles", "potion"], ["treasure", "Tesoro", "gem"]]:
		var button := _button(definition[1], definition[2])
		button.toggle_mode = true
		if embedded: Fantasy.highlight_choice(button)
		button.add_theme_font_size_override("font_size", 15 if embedded else 12)
		button.pressed.connect(func(): filter_id = definition[0]; refresh_view())
		categories.add_child(button)
		filters[definition[0]] = button
	edit_row = HBoxContainer.new()
	edit_row.visible = false
	content.add_child(edit_row)
	add_name = LineEdit.new()
	add_name.placeholder_text = "Nombre del objeto"
	add_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ThemeKit.style_line_edit(add_name)
	if embedded: Art.style_field(add_name)
	edit_row.add_child(add_name)
	add_count = SpinBox.new()
	add_count.min_value = 1; add_count.max_value = 999; add_count.value = 1
	edit_row.add_child(add_count)
	var add := _button("Añadir", "plus")
	add.pressed.connect(func():
		if not bridge.can_edit_stock(): return
		var text := add_name.text.strip_edges()
		if text.is_empty() or text.length() > 120:
			return
		ui.add_inventory_item(Catalogue.normalized(text).replace(" ", "_"), int(add_count.value), text)
		add_name.clear(); refresh_view()
	)
	edit_row.add_child(add)
	var scroll := ScrollContainer.new()
	item_scroll=scroll
	scroll.name = "InventoryItemScroll"
	scroll.custom_minimum_size.y = 194 if embedded else 210
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_RESERVE
	scroll.follow_focus=true
	content.add_child(scroll)
	grid = GridContainer.new()
	grid.name = "InventorySlots"
	grid.columns = 5
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	scroll.add_child(grid)
	scroll.resized.connect(func(): grid.columns = clampi(int((scroll.size.x + 6) / 92), 2, 6) if embedded else maxi(2, int((scroll.size.x + 6) / 84)))
	var detail := Fantasy.surface(10) if embedded else ThemeKit.make_window_panel(Color("#77603b"), 8)
	content.add_child(detail)
	var row: BoxContainer = VBoxContainer.new() if embedded else HBoxContainer.new()
	row.add_theme_constant_override("separation", 7 if embedded else 12)
	detail.add_child(row)
	if embedded: Fantasy.heading(row, "Objeto seleccionado", "tools", 17)
	var icon_box := HBoxContainer.new()
	icon_box.alignment = BoxContainer.ALIGNMENT_CENTER
	detail_icon = _image("backpack", 44 if embedded else 58)
	if embedded:
		var tile := Fantasy.secondary(4)
		tile.add_child(detail_icon)
		icon_box.add_child(tile)
		row.add_child(icon_box)
	else:
		row.add_child(detail_icon)
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.size_flags_vertical = Control.SIZE_EXPAND_FILL
	info.add_theme_constant_override("separation", 5 if embedded else 4)
	row.add_child(info)
	detail_title = _label("Selecciona un objeto", 19 if embedded else 18, ThemeKit.COL_HEADING, true)
	detail_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if embedded: detail_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	info.add_child(detail_title)
	detail_description = _label("", 14 if embedded else 12, ThemeKit.COL_MUTED)
	detail_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.add_child(detail_description)
	action_buttons=HFlowContainer.new()
	action_buttons.add_theme_constant_override("h_separation", 6)
	action_buttons.add_theme_constant_override("v_separation", 6)
	info.add_child(action_buttons)
	take_button = _button("Sacar", "take")
	take_button.pressed.connect(func(): bridge.prepare(selected_key, "take"); refresh_view())
	action_buttons.add_child(take_button)
	store_button = _button("Guardar", "store")
	store_button.pressed.connect(func(): bridge.prepare(selected_key, "store"); refresh_view())
	action_buttons.add_child(store_button)
	consume_button=_button("Consumir","potion")
	consume_button.pressed.connect(func(): _show_operation("consume"))
	action_buttons.add_child(consume_button)
	transfer_button=_button("Transferir","transfer")
	transfer_button.pressed.connect(func(): _show_operation("transfer"))
	action_buttons.add_child(transfer_button)
	operation_hint=_label("",14,ThemeKit.COL_MUTED)
	operation_hint.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	operation_hint.hide()
	info.add_child(operation_hint)
	operation_row=VBoxContainer.new()
	operation_row.hide()
	info.add_child(operation_row)
	recipient=OptionButton.new()
	recipient.accessibility_name="Personaje que recibe el objeto"
	operation_row.add_child(recipient)
	operation_amount=SpinBox.new()
	operation_amount.custom_minimum_size.x=82
	operation_row.add_child(operation_amount)
	if embedded: Art.style_field(operation_amount.get_line_edit())
	var decisions=HBoxContainer.new()
	operation_row.add_child(decisions)
	var confirm=Fantasy.primary_button("Confirmar","take",16) if embedded else _button("Confirmar","take")
	confirm.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	confirm.pressed.connect(_confirm_operation)
	decisions.add_child(confirm)
	var cancel=Fantasy.button("Cancelar",false,16) if embedded else _button("Cancelar","close")
	cancel.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	cancel.pressed.connect(func(): operation=""; operation_row.hide(); operation_hint.hide(); action_buttons.show())
	decisions.add_child(cancel)
	if embedded:
		Fantasy.style_scroll(scroll); Fantasy.style_scroll(body.get_parent())
		content.remove_child(scroll); content.remove_child(detail)
		var split=HBoxContainer.new(); split.name="BackpackGridAndDetail"; split.size_flags_vertical=Control.SIZE_EXPAND_FILL; split.add_theme_constant_override("separation",12); content.add_child(split)
		scroll.size_flags_horizontal=Control.SIZE_EXPAND_FILL; split.add_child(scroll)
		detail.custom_minimum_size.x=265; detail.size_flags_horizontal=Control.SIZE_FILL; split.add_child(detail)

func refresh_view() -> void:
	if not is_instance_valid(grid):
		return
	var offset=item_scroll.scroll_vertical
	var focus=get_viewport().gui_get_focus_owner() if is_inside_tree() else null
	var focus_key=str(focus.get_meta("inventory_item","")) if is_instance_valid(focus) and grid.is_ancestor_of(focus) else ""
	for child in grid.get_children():
		grid.remove_child(child); child.queue_free()
	var actor: Dictionary = ui.get_active_actor()
	add_control.visible=bridge.can_edit_stock()
	edit_row.visible=editing and add_control.visible
	title.text = "Mochila del grupo" if ui.inv_mgr else "Mochila de %s" % actor.get("name", "aventurero")
	scope_label.text = ("Existencias compartidas · " if ui.inv_mgr else "Existencias personales · ")+"Equipo en uso de "+str(actor.get("name","aventurero"))
	hero_name.text = actor.get("name", "Aventurero")
	hero_class.text = actor.get("class_line", "")
	hero_stats.text = "PG %d/%d   ·   CA %d" % [actor.get("hp", 0), actor.get("hp_max", 0), actor.get("ac", 10)]
	portrait.texture = bridge.portrait()
	var stock: Dictionary = bridge.items()
	stock_signature=JSON.stringify([stock,bridge.session.pending,ui.selected_actor_id])
	var held_key=str(bridge.held.get(str(actor.get("id","")),""))
	var held_name=str(stock.get(held_key,{}).get("name",""))
	outfit.text = "En mano · "+held_name if not held_name.is_empty() else "Equipo inicial de la ficha"
	hand.text = "Antorcha encendida" if ui.is_torch_lit() else "Antorcha apagada"
	gold.text = "%d po" % int(stock.get("gold", {}).get("count", 0))
	for key in filters:
		filters[key].set_pressed_no_signal(key == filter_id)
	var visible_keys: Array = []
	var query := Catalogue.normalized(search.text.strip_edges())
	for key in stock:
		var item: Dictionary = stock[key]
		if int(item.get("count", 0)) < 1:
			continue
		if filter_id != "all" and Catalogue.category(key, item) != filter_id:
			continue
		if not query.is_empty() and query not in Catalogue.normalized(str(item.get("name", key))):
			continue
		visible_keys.append(key)
	if selected_key not in visible_keys:
		selected_key = visible_keys[0] if not visible_keys.is_empty() else ""
	item_scroll.set_deferred("scroll_vertical",offset)
	for key in visible_keys:
		_add_slot(key, stock[key])
		if key==focus_key: grid.get_child(grid.get_child_count()-1).grab_focus.call_deferred()
	if visible_keys.is_empty():
		var empty := _label("No hay objetos en esta selección.", 13, ThemeKit.COL_MUTED)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		grid.add_child(empty)
	else:
		var blanks: int = maxi(0, grid.columns * 2 - visible_keys.size())
		for unused in range(blanks):
			var slot := PanelContainer.new()
			slot.custom_minimum_size = Vector2(78, 94)
			slot.size_flags_horizontal=Control.SIZE_EXPAND_FILL
			slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
			slot.add_theme_stylebox_override("panel", ThemeKit.make_panel_style(Color("#ead5ac") if embedded else Color("#111e20"), Color("#baa16a") if embedded else Color("#293738"), 5, 4, 4))
			if embedded:
				slot.add_theme_stylebox_override("panel",StyleBoxEmpty.new()); var painting=Fantasy.RoyalPanel.new(); painting.cap=Vector2(13,13); slot.add_child(painting); slot.resized.connect(painting.queue_redraw)
			grid.add_child(slot)
	var selected: Dictionary = stock.get(selected_key, {})
	if selected_key!=operation_key:
		operation=""
		operation_hint.hide()
		operation_row.hide()
	action_buttons.visible=operation.is_empty()
	detail_icon.texture = _icon(Catalogue.item_icon_id(selected_key, selected))
	detail_title.text = "%s  ×%d" % [selected.get("name", selected_key), selected.get("count", 0)] if not selected.is_empty() else "Selecciona un objeto"
	var cat_names := {"weapons": "Arma", "armor": "Armadura / Vestimenta", "gear": "Equipo", "consumables": "Consumible", "treasure": "Tesoro"}
	var cat_label := str(cat_names.get(Catalogue.category(selected_key, selected), "Objeto")) if not selected.is_empty() else ""
	var props := PackedStringArray()
	if not cat_label.is_empty(): props.append("Tipo: " + cat_label)
	if not selected.is_empty() and selected.has("healing_dice"): props.append("Curación: " + str(selected.healing_dice) + " PG")
	if not selected.is_empty() and bridge.desired_held(selected_key): props.append("Estado: En mano")
	var base_desc := str(selected.get("desc", "Objeto registrado en la mochila.")) if not selected.is_empty() else "Busca un objeto o cambia de categoría."
	detail_description.text = ("\n".join(props) + "\n\n" + base_desc) if not props.is_empty() else base_desc
	var treasure: bool = selected.is_empty() or Catalogue.category(selected_key, selected) == "treasure"
	var taken: bool = bridge.desired_held(selected_key) if not selected.is_empty() else false
	take_button.disabled = treasure or taken
	store_button.disabled = treasure or not taken
	var healing=selected.get("healing_range",[])
	var rules=ui.combat_controller.rules
	var combatant: Dictionary=rules.actors.get(str(actor.get("id","")),{})
	consume_button.visible=healing is Array and healing.size()==2
	consume_button.disabled=(rules.active and ui.current_role!="dm") or not rules.pending.is_empty() or combatant.get("dead",false) or int(combatant.get("hp",0))>=int(combatant.get("hp_max",0))
	consume_button.tooltip_text="Introduce el resultado físico de "+str(selected.get("healing_dice","")) if not consume_button.disabled else "Disponible si faltan PG. En combate lo registra el DM."
	transfer_button.visible=not ui.inv_mgr and bridge.can_edit_stock() and not selected.is_empty() and ui.actors.size()>1
	take_button.visible=not treasure and (not consume_button.visible or not taken)
	store_button.visible=not treasure and (not consume_button.visible or taken)
	take_button.text = "Sacar y encender" if Catalogue.item_icon_id(selected_key, selected) == "torch" else "Sacar"
	store_button.text = "Apagar y guardar" if Catalogue.item_icon_id(selected_key, selected) == "torch" else "Guardar"
	if embedded:
		for action_button in [take_button,store_button]: action_button.custom_minimum_size.x=ceilf(Art.font().get_string_size(action_button.text,HORIZONTAL_ALIGNMENT_LEFT,-1,17).x)+54
	pending_label.text = "%d acción(es) preparada(s) · Se animarán al cerrar." % bridge.session.pending.size() if not bridge.session.pending.is_empty() else "Sacar y guardar se animará al cerrar la mochila."
	if embedded: pending_label.text = "%d preparadas · Se animan al cerrar la ficha" % bridge.session.pending.size() if not bridge.session.pending.is_empty() else "Prepara qué sacar o guardar"
	undo_button.disabled=bridge.session.pending.is_empty()

func _add_slot(key: String, item: Dictionary) -> void:
	var button: Button = Art.Native.HintButton.new() if embedded else Button.new()
	button.set_meta("sheet_icon",Catalogue.item_icon_id(key,item))
	button.custom_minimum_size = Vector2(78, 94)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.accessibility_name=str(item.get("name",key))
	button.set_meta("inventory_item",key)
	button.tooltip_text = "%s · %d\n%s" % [item.get("name", key), item.get("count", 0), item.get("desc", "")]
	if embedded:
		var styled=Fantasy.button("",key==selected_key)
		for state in ["normal","hover","pressed","disabled","focus"]:
			var style=styled.get_theme_stylebox(state).duplicate()
			style.bg_color=Color(1,.9,.65,.12) if state=="hover" else Color.TRANSPARENT
			button.add_theme_stylebox_override(state,style)
		styled.free(); var painting=Fantasy.RoyalPanel.new(); painting.kind=0 if key==selected_key else 1; painting.cap=Vector2(13,13); painting.show_behind_parent=true; button.add_child(painting); button.resized.connect(painting.queue_redraw)
	else: ThemeKit.style_button(button, "secondary", 5, 5, 5)
	if key == selected_key and not embedded:
		button.add_theme_stylebox_override("normal", ThemeKit.make_panel_style(Color("#53292c"), ThemeKit.COL_GOLD, 5, 5, 5, 2))
	button.pressed.connect(func(): selected_key = key; refresh_view())
	grid.add_child(button)
	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.offset_left = 5; content.offset_right = -5; content.offset_top = 4; content.offset_bottom = -4
	button.add_child(content)
	var image := _image(Catalogue.item_icon_id(key, item), 43)
	image.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(image)
	var caption := _label(str(item.get("name", key)), 12, ThemeKit.COL_INK, true)
	caption.clip_text = true
	caption.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if embedded and key == selected_key: caption.add_theme_color_override("font_color", Art.IVORY)
	content.add_child(caption)
	var amount := _label("×%d%s" % [item.get("count", 0), " · EN MANO" if bridge.desired_held(key) else ""], 10, ThemeKit.COL_GOLD_BRIGHT)
	amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	amount.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if embedded and key == selected_key: amount.add_theme_color_override("font_color", Art.IVORY)
	content.add_child(amount)

func _process(_delta: float) -> void:
	if visible and bridge:
		if bridge.session.is_open and bridge.session.actor_id!=ui.selected_actor_id:
			bridge.finish()
			bridge.begin()
		refresh_left-=_delta
		if refresh_left<=0:
			refresh_left=.2
			var current=JSON.stringify([bridge.items(),bridge.session.pending,ui.selected_actor_id])
			if current!=stock_signature: refresh_view()
		# Appearance is read from the actor, never a second hard-coded portrait.
		var texture: Texture2D = bridge.portrait()
		if portrait.texture != texture:
			portrait.texture = texture

func _show_operation(kind: String) -> void:
	var item: Dictionary=bridge.items().get(selected_key,{})
	recipient.visible=kind=="transfer"
	if kind=="consume":
		var valid_range: Array=item.get("healing_range",[])
		if valid_range.size()!=2: return
		operation_amount.max_value=float(valid_range[1])
		operation_amount.min_value=float(valid_range[0])
		operation_hint.text="Resultado físico de "+str(item.get("healing_dice",""))+" PG"
	else:
		recipient.clear()
		for actor in ui.actors:
			if actor.id==ui.selected_actor_id: continue
			recipient.add_item(str(actor.name))
			recipient.set_item_metadata(recipient.item_count-1,str(actor.id))
		if recipient.item_count==0: return
		recipient.select(0)
		operation_amount.min_value=1
		operation_amount.max_value=maxi(1,int(item.get("count",1)))
		operation_hint.text="Cantidad a transferir"
	operation_amount.value=operation_amount.min_value
	operation_amount.get_line_edit().accessibility_name=operation_hint.text
	operation=kind
	operation_key=selected_key
	action_buttons.hide()
	operation_hint.show()
	operation_row.show()
	operation_amount.get_line_edit().grab_focus()

func _confirm_operation() -> void:
	if operation_key!=selected_key: return
	var amount=int(operation_amount.value)
	var succeeded=false
	if operation=="consume": succeeded=bridge.consume_healing_item(selected_key,amount)
	elif operation=="transfer" and recipient.selected>=0:
		succeeded=bridge.transfer_item(selected_key,str(recipient.get_item_metadata(recipient.selected)),amount)
	operation=""
	operation_row.hide()
	refresh_view()
	operation_hint.text="Cambio registrado" if succeeded else "No se pudo aplicar. Revisa las existencias y el estado del personaje."
	operation_hint.show()

func _fit_layout() -> void:
	if not is_inside_tree():
		return
	if embedded:
		body.columns = 1
		portrait_panel.hide()
		return
	var screen := get_viewport_rect().size
	var target := Vector2(minf(1040, screen.x - 32), minf(650, screen.y - 32))
	set_anchors_preset(Control.PRESET_CENTER)
	offset_left = -target.x / 2; offset_right = target.x / 2
	offset_top = -target.y / 2; offset_bottom = target.y / 2
	var narrow := screen.x < 650
	body.columns = 1 if narrow else 2
	portrait_panel.custom_minimum_size.x = 0 if narrow else (170 if screen.x < 900 else 210)
	portrait.custom_minimum_size.y = 120 if narrow else 240

func _button(text: String, icon_id: String) -> Button:
	var result := Fantasy.button(text) if embedded else Button.new()
	result.text = text
	result.text_overrun_behavior = TextServer.OVERRUN_NO_TRIMMING
	result.icon = _icon(icon_id)
	result.expand_icon = true
	# Expanded icons do not contribute to Button's automatic minimum size.
	# Reserve their space explicitly, including icon-only close controls.
	var text_width := Art.font().get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 17).x if embedded else text.length() * 7.5
	result.custom_minimum_size = Vector2(maxf(36, ceilf(text_width) + 54), 36)
	result.add_theme_constant_override("icon_max_width", 22)
	if not embedded: ThemeKit.style_button(result, "secondary", 6, 9, 6)
	return result

func _icon(id: String) -> Texture2D:
	if id=="sword": return Fantasy.symbol("short-sword")
	return Fantasy.symbol(id)

func _image(id: String, pixels: int) -> TextureRect:
	var result := TextureRect.new()
	result.texture = _icon(id)
	result.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	result.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	result.custom_minimum_size = Vector2(pixels, pixels)
	result.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return result

func _label(text: String, pixels: int, color: Color, heading: bool = false) -> Label:
	if embedded:
		return Fantasy.label(text, maxi(14,pixels+2), heading, Art.MUTED if color == ThemeKit.COL_MUTED else Art.INK)
	var result := ThemeKit.make_label(text, pixels, color)
	if heading:
		result.add_theme_font_override("font", serif)
	return result
