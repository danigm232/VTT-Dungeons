extends VBoxContainer
const Registry=preload("res://characters/registry.gd")
var ui
var actor_id: String
func setup(owner_ui,id: String) -> void:
	ui=owner_ui; actor_id=id; name="CharacterEquipmentSlots"
	var service=ui.combat_controller.get_node_or_null("CharacterAppearanceService")
	if service==null: return
	var visual=service.actor(id)
	if visual==null: return
	var title:=Label.new(); title.text="Equipo que lleva puesto"; add_child(title)
	var grid:=GridContainer.new(); grid.columns=3; add_child(grid)
	var labels: Dictionary={"head":"Cabeza","armor":"Armadura","main_hand":"Mano principal","off_hand":"Mano secundaria","back":"Espalda","waist":"Cintura"}
	var note:=Label.new(); note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	for slot in visual.definition.get("equipmentSlots",[]):
		var entries: Array=[]
		for item_id in Registry.data().equipment:
			var item: Dictionary=Registry.data().equipment[item_id]
			if item.slot==slot and Registry.compatible(str(visual.definition.id),item_id).ok and not service.owned_key(id,item_id).is_empty(): entries.append(item_id)
		if entries.is_empty() and not visual.equipment.equipped.has(slot): continue
		var column:=VBoxContainer.new(); grid.add_child(column)
		var label:=Label.new(); label.text=labels.get(slot,slot); column.add_child(label)
		var menu:=OptionButton.new(); menu.add_item("Guardar"); menu.set_item_metadata(0,""); menu.custom_minimum_size.x=180; column.add_child(menu)
		for item_id in entries:
			menu.add_item(Registry.data().equipment[item_id].name); menu.set_item_metadata(menu.item_count-1,item_id)
			if visual.equipment.equipped.get(slot,"")==item_id: menu.select(menu.item_count-1)
		menu.disabled=ui.current_role!="dm" and (ui.current_role!="player" or ui.selected_actor_id!=id)
		menu.item_selected.connect(func(index): var result: Dictionary=service.request_local(id,slot,str(menu.get_item_metadata(index))); note.text="Equipo actualizado" if result.ok else result.reason)
	if grid.get_child_count()==0:
		note.text="El equipo original forma parte del dibujo. Las piezas adaptadas aparecerán aquí cuando estén en tu mochila."
	add_child(note)
	if ui.current_role=="dm":
		var cause:=OptionButton.new(); cause.add_item("Aspecto de la restricción…"); cause.set_item_metadata(0,"")
		for key in Registry.data().bindings: cause.add_item(Registry.data().bindings[key].name); cause.set_item_metadata(cause.item_count-1,key)
		cause.item_selected.connect(func(index): if index>0: service.set_cause(id,str(cause.get_item_metadata(index))); note.text="Causa visual elegida. Aparece mientras la ficha esté restringida.")
		add_child(cause)
