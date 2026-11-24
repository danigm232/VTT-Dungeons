extends RefCounted
## Expanded "Libro de acciones" modal sharing the exact combat catalogue and rules.
const Art=preload("res://character_sheet/skin.gd")
const Model=preload("res://character_sheet/sheet_model.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")

static func open(sheet) -> void:
	var data: Dictionary=sheet.data
	sheet._show_detail("Libro de acciones","","sword")
	var dup_title=sheet.detail_body.get_node_or_null("DetailTitleRow")
	if dup_title: dup_title.visible=false
	var state={"query":"","category":"all","selected_key":""}
	var entries: Array=_collect_entries(data)
	if not entries.is_empty(): state.selected_key=entries[0].key
	var bar=HBoxContainer.new(); bar.add_theme_constant_override("separation",8); sheet.detail_body.add_child(bar)
	var search=LineEdit.new(); search.name="ActionBookSearch"; search.placeholder_text="Buscar acción, habilidad o conjuro..."; search.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	Art.style_field(search); bar.add_child(search)
	var cats_row=HBoxContainer.new(); cats_row.add_theme_constant_override("separation",6); sheet.detail_body.add_child(cats_row)
	var cat_buttons: Dictionary={}
	for cat in [["all","Todas"],["attacks","Ataques"],["actions","Acciones"],["bonus","Adicionales"],["reactions","Reacciones"],["magic","Magia"]]:
		var cb=W.button(cat[1],cat[0]=="all",15); cb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; cb.toggle_mode=true; cb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(cat[1],HORIZONTAL_ALIGNMENT_LEFT,-1,15).x)+24,28); W.highlight_choice(cb); cb.set_pressed_no_signal(cat[0]=="all")
		cats_row.add_child(cb); cat_buttons[cat[0]]=cb
	var split=HBoxContainer.new(); split.add_theme_constant_override("separation",12); split.custom_minimum_size.y=310; split.size_flags_vertical=Control.SIZE_EXPAND_FILL; sheet.detail_body.add_child(split)
	var left_panel=W.secondary(6); left_panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; left_panel.size_flags_stretch_ratio=1.05; split.add_child(left_panel)
	var left_scroll=ScrollContainer.new(); left_scroll.name="ActionBookList"; left_scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; left_scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; left_panel.add_child(left_scroll); W.style_scroll(left_scroll)
	var list_box=VBoxContainer.new(); list_box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; list_box.add_theme_constant_override("separation",3); left_scroll.add_child(list_box)
	var right_panel=W.secondary(12); right_panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; right_panel.size_flags_stretch_ratio=1.35; split.add_child(right_panel)
	var right_scroll=ScrollContainer.new(); right_scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; right_scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; right_panel.add_child(right_scroll); W.style_scroll(right_scroll)
	var inspector=VBoxContainer.new(); inspector.name="ActionBookInspector"; inspector.size_flags_horizontal=Control.SIZE_EXPAND_FILL; inspector.add_theme_constant_override("separation",8); right_scroll.add_child(inspector)
	var render_inspector=func(entry: Dictionary) -> void:
		sheet._clear(inspector)
		if entry.is_empty():
			inspector.add_child(W.wrapped("Selecciona una acción para consultar sus reglas y disponibilidad.",17))
			return
		var head=HBoxContainer.new(); head.add_theme_constant_override("separation",10); inspector.add_child(head)
		head.add_child(W.icon_tile(entry.icon,38))
		var hbox=VBoxContainer.new(); hbox.size_flags_horizontal=Control.SIZE_EXPAND_FILL; hbox.add_theme_constant_override("separation",1); head.add_child(hbox)
		var name_lbl=W.wrapped(entry.name,22); name_lbl.add_theme_font_override("font",W.font(true)); hbox.add_child(name_lbl)
		hbox.add_child(W.label(entry.subtitle,15,false,Art.MUTED))
		if entry.is_basic:
			inspector.add_child(W.wrapped(entry.description,17))
			inspector.add_child(W.label("Economía · Acción general del sistema de combate",15,true,Art.MUTED))
			var use_basic=W.primary_button("Ejecutar "+entry.name,entry.icon,17); use_basic.name="ActionBookExecute"
			use_basic.pressed.connect(func(): sheet.detail.hide(); sheet.close_callback.call(); sheet.ui.combat_controller._basic(entry.basic_key))
			inspector.add_child(use_basic)
			return
		var action: Dictionary=entry.action
		var f=Model.action_fields(action,data)
		var grid=VBoxContainer.new(); grid.add_theme_constant_override("separation",4); inspector.add_child(grid)
		var roll_display="Impacto automático" if f.roll=="Sin d20" else f.roll
		for fact in [["Tipo",f.type],["Objetivo",f.target],["Alcance",f.range],["Duración",f.duration],["Ataque / CD",roll_display],["Daño / Efecto",f.effect]]:
			if str(fact[1]).is_empty() or fact[1]=="—": continue
			var frow=HBoxContainer.new(); grid.add_child(frow)
			var k=W.label(fact[0],15,true); k.custom_minimum_size.x=115; frow.add_child(k); frow.add_child(W.wrapped(str(fact[1]),16))
		if not f.resource.is_empty():
			var r=f.resource
			grid.add_child(W.wrapped("Reserva · %s (%d/%d disponibles · coste %d)" % [r.label,int(r.current),int(r.max),int(r.cost)],15))
		if action.get("concentration",false):
			grid.add_child(W.label("Requiere concentración",15,true,Art.RED))
		var desc_text=str(action.get("guidance",action.get("description","")))
		if not desc_text.is_empty(): inspector.add_child(W.wrapped(desc_text,16))
		var reason=str(sheet.ui.combat_controller.rules.availability(str(data.id),action)) if not str(action.get("id","")).is_empty() else "Solo consulta"
		if sheet.ui.current_role=="dm" and sheet.ui.combat_controller.rules.active and sheet.ui.combat_controller.acting_id()!=str(data.id): reason="La miniatura consultada no es la que actúa."
		if not reason.is_empty():
			var warn=W.wrapped(reason,15); warn.add_theme_color_override("font_color",Art.RED); inspector.add_child(warn)
		if not str(action.get("id","")).is_empty():
			var act_btn=W.primary_button("Seleccionar acción",entry.icon,17); act_btn.name="ActionBookExecute"; act_btn.disabled=not reason.is_empty()
			act_btn.pressed.connect(func():
				if sheet.ui.current_role=="dm" and not sheet.ui.combat_controller.rules.active: sheet.ui.combat_controller._acting_override=str(data.id)
				sheet.detail.hide(); sheet.close_callback.call(); sheet.ui.combat_controller.choose_action(str(action.id))
			)
			inspector.add_child(act_btn)
	var rebuild_list: Array=[]
	rebuild_list.append(func() -> void:
		sheet._clear(list_box)
		var q=Model.normalized(state.query)
		var filtered: Array=[]
		for entry in entries:
			if state.category!="all" and state.category not in entry.categories: continue
			if not q.is_empty() and not Model.normalized(entry.name+" "+entry.subtitle+" "+entry.description).contains(q): continue
			filtered.append(entry)
		if filtered.is_empty():
			list_box.add_child(W.wrapped("No hay acciones que coincidan con el filtro.",16))
			render_inspector.call({})
			return
		var selected_entry: Dictionary=filtered[0]
		for entry in filtered:
			if entry.key==state.selected_key: selected_entry=entry; break
		state.selected_key=selected_entry.key
		for idx in range(filtered.size()):
			var entry: Dictionary=filtered[idx]
			var active=entry.key==state.selected_key
			var b=W.button("",active,16); b.custom_minimum_size.y=34; b.accessibility_name=entry.name; b.name="BookEntry_"+entry.key
			if not active: W.stripe(b,idx)
			var row=HBoxContainer.new(); row.mouse_filter=Control.MOUSE_FILTER_IGNORE; row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); row.offset_left=5; row.offset_right=-6; row.offset_top=2; row.offset_bottom=-2; row.add_theme_constant_override("separation",8); b.add_child(row)
			row.add_child(W.icon_tile(entry.icon,26))
			var text_col=VBoxContainer.new(); text_col.size_flags_horizontal=Control.SIZE_EXPAND_FILL; text_col.add_theme_constant_override("separation",-2); row.add_child(text_col)
			var tl=W.label(entry.name,16,true,Art.IVORY if active else Art.INK); tl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; text_col.add_child(tl)
			var sl=W.label(entry.badge,12,false,Color("#f5dec0") if active else Art.MUTED); sl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; text_col.add_child(sl)
			b.pressed.connect(func(): state.selected_key=entry.key; rebuild_list[0].call())
			list_box.add_child(b)
		render_inspector.call(selected_entry)
	)
	for cat_key in cat_buttons:
		cat_buttons[cat_key].pressed.connect(func():
			state.category=cat_key
			for k in cat_buttons: cat_buttons[k].set_pressed_no_signal(k==cat_key)
			rebuild_list[0].call()
		)
	search.text_changed.connect(func(v): state.query=v; rebuild_list[0].call())
	rebuild_list[0].call()
	var footer_row=HBoxContainer.new(); footer_row.alignment=BoxContainer.ALIGNMENT_END; sheet.detail_body.add_child(footer_row)
	var go_combat=W.button("Abrir pestaña Combate  ›",false,15); go_combat.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; go_combat.custom_minimum_size=Vector2(190,30); go_combat.pressed.connect(func(): sheet.detail.hide(); sheet.select_tab("combat")); footer_row.add_child(go_combat)
	sheet._layout()

static func _collect_entries(data: Dictionary) -> Array:
	var result: Array=[]
	var seen: Dictionary={}
	for action in data.get("actions",[]):
		var f=Model.action_fields(action,data)
		var dedup_key=str(action.get("id","")) if not str(action.get("id","")).is_empty() else Model.normalized(f.name)
		if seen.has(dedup_key): continue
		seen[dedup_key]=true
		var cost=str(action.get("actionCost","action"))
		var cats: Array=[]
		if Model.is_spell(action): cats.append("magic")
		if not Model.is_spell(action) and (action.has("attackBonus") or action.has("damageDice")): cats.append("attacks")
		if cost=="bonus": cats.append("bonus")
		elif cost=="reaction": cats.append("reactions")
		else: cats.append("actions")
		var sub="%s · %s · %s" % [f.type,f.range,"Impacto auto." if f.roll=="Sin d20" else f.roll]
		result.append({"key":"act_"+dedup_key,"name":f.name,"icon":Art.action_icon(action),"subtitle":sub,"badge":f.type+(" · "+f.uses if not f.uses.is_empty() else ""),"description":f.effect,"categories":cats,"is_basic":false,"action":action})
	var basic_help={"dash":"Amplía el movimiento disponible del turno.","disengage":"Evita ataques de oportunidad al moverte.","dodge":"Desventaja a los ataques contra ti hasta tu siguiente turno.","help":"Concede ventaja a la siguiente prueba o ataque de un aliado.","hide":"Intenta ocultarte mediante prueba de Sigilo.","ready":"Prepara una acción con un desencadenante confirmado por el DM.","search":"Busca pistas, objetos o criaturas ocultas.","study":"Analiza un enigma, aura o criatura.","influence":"Intenta persuadir, intimidar o engañar.","use-object":"Interactúa con un objeto del entorno.","improvise":"Propón una acción libre al DM."}
	for key in Model.Catalogue.BASIC:
		var label=str(Model.Catalogue.BASIC[key])
		result.append({"key":"basic_"+key,"name":label,"icon":Art.action_icon({"id":key}),"subtitle":"Acción general · 1 acción","badge":"General","description":basic_help.get(key,label),"categories":["actions"],"is_basic":true,"basic_key":key})
	return result
