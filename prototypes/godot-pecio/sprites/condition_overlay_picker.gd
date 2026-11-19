extends RefCounted
const Art=preload("res://sprites/condition_overlay_library.gd")
static func open(controller: Node) -> void:
	preload("res://characters/state_picker.gd").open(controller)
static func legacy_open(controller: Node) -> void:
	if controller==null or controller.ui.current_role!="dm": return
	controller._clear(controller.dialog)
	var list:=VBoxContainer.new(); list.add_theme_constant_override("separation",12)
	controller.dialog.add_child(list)
	var heading:=Label.new(); heading.text="Aspecto de los estados"; heading.add_theme_font_size_override("font_size",20); list.add_child(heading)
	var hint:=Label.new(); hint.text="Elige un acabado para cada miniatura visible.\nSe conserva al volver a abrir este prototipo."; list.add_child(hint)
	var who:=OptionButton.new(); who.name="ConditionActorChoice"; list.add_child(who)
	var bodies: Array=[]
	for id in controller.rules.actors:
		var body: Node3D=controller.token(id)
		if body and body.is_visible_in_tree(): bodies.append(body); who.add_item(str(controller.rules.actors[id].name))
	var choice:=OptionButton.new(); choice.name="ConditionStyleChoice"; choice.add_item("Recomendación para el personaje y el estado")
	var ids: Array=["auto"]
	for id in Art.data().styles: ids.append(id); choice.add_item(str(Art.data().styles[id].label))
	list.add_child(choice)
	var note:=Label.new(); note.text=""; note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; note.custom_minimum_size=Vector2(440,65); list.add_child(note)
	var refresh:=func():
		if bodies.is_empty(): choice.disabled=true; note.text="No hay miniaturas visibles en este mapa."; return
		var style: String=Art.selected_style(bodies[who.selected])
		choice.select(maxi(0,ids.find(style)))
		note.text="Combina acabados según el efecto: veneno con bruma, vínculos físicos con pincel y magia con runas." if style=="auto" else str(Art.data().styles[style].description)
	who.item_selected.connect(func(_index): refresh.call())
	choice.item_selected.connect(func(index):
		if bodies.is_empty(): return
		Art.select_style(bodies[who.selected],str(ids[index])); refresh.call()
	)
	var close:=Button.new(); close.text="Cerrar"; close.pressed.connect(func(): controller.dialog.hide()); list.add_child(close)
	refresh.call(); controller.dialog.show()
