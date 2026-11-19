extends RefCounted
const Registry=preload("res://characters/registry.gd")
static func open(controller: Node) -> void:
	if controller==null or controller.ui.current_role!="dm": return
	controller._clear(controller.dialog)
	var list:=VBoxContainer.new(); list.add_theme_constant_override("separation",12); controller.dialog.add_child(list)
	var heading:=Label.new(); heading.text="Aspecto de los estados"; heading.add_theme_font_size_override("font_size",21); list.add_child(heading)
	var hint:=Label.new(); hint.text="Los efectos siguen el dibujo y su animación.\nEstos ajustes cambian el aspecto, no las condiciones."; list.add_child(hint)
	var who:=OptionButton.new(); who.name="ConditionActorChoice"; list.add_child(who)
	var ids: Array=[]
	for id in controller.rules.actors:
		var body: Node3D=controller.token(id)
		if body and body.is_visible_in_tree(): ids.append(id); who.add_item(str(controller.rules.actors[id].name))
	var service=controller.get_node("CharacterAppearanceService")
	var label:=Label.new(); label.text="Intensidad"; list.add_child(label)
	var amount:=HSlider.new(); amount.min_value=0; amount.max_value=1; amount.step=.05; amount.custom_minimum_size.x=390; list.add_child(amount)
	var choice:=OptionButton.new(); choice.name="ConditionStyleChoice"
	for title in ["Contorno sutil","Material sobre el cuerpo","Material y contorno"]: choice.add_item(title)
	list.add_child(choice)
	var binding:=OptionButton.new(); binding.add_item("Causa visual de la restricción…"); binding.set_item_metadata(0,"")
	for key in Registry.data().bindings: binding.add_item(str(Registry.data().bindings[key].name)); binding.set_item_metadata(binding.item_count-1,key)
	list.add_child(binding)
	var note:=Label.new(); note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; note.custom_minimum_size=Vector2(420,70); list.add_child(note)
	var refresh:=func():
		if ids.is_empty(): amount.editable=false; choice.disabled=true; note.text="No hay miniaturas visibles en este mapa."; return
		var visual=service.actor(str(ids[who.selected])); amount.set_value_no_signal(visual.intensity); choice.select(visual.treatment)
		note.text="Estados actuales: "+(", ".join(controller.rules.actors[ids[who.selected]].conditions) if not controller.rules.actors[ids[who.selected]].conditions.is_empty() else "ninguno")
	who.item_selected.connect(func(_index): refresh.call())
	amount.value_changed.connect(func(value): if not ids.is_empty(): service.appearance_preferences(str(ids[who.selected]),{"intensity":value}))
	choice.item_selected.connect(func(index): if not ids.is_empty(): service.appearance_preferences(str(ids[who.selected]),{"treatment":index}))
	binding.item_selected.connect(func(index): if index>0 and not ids.is_empty(): service.set_cause(str(ids[who.selected]),str(binding.get_item_metadata(index))); refresh.call())
	var edit:=Button.new(); edit.text="Editar condiciones de esta ficha"; list.add_child(edit); edit.pressed.connect(func(): if not ids.is_empty(): controller.edit_combatant(str(ids[who.selected])))
	var close:=Button.new(); close.text="Cerrar"; close.pressed.connect(controller.dialog.hide); list.add_child(close)
	refresh.call(); controller.dialog.show()
