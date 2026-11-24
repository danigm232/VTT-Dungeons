extends RefCounted
## Guided parchment Progression & Level-Up Wizard integrated into the Character Sheet.
const Art=preload("res://character_sheet/skin.gd")
const Model=preload("res://character_sheet/sheet_model.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")
const Rules=preload("res://character_sheet/level_up_rules.gd")

static func open_progression(sheet) -> void:
	var actor: Dictionary=sheet.ui.get_active_actor()
	if actor.is_empty(): return
	var data: Dictionary=sheet.data
	var classes: Array=Rules.actor_classes(actor)
	var cur_lvl: int=Rules.total_level(classes)
	var edition: String=Rules.actor_edition(actor)
	var runtime: Dictionary=sheet.ui.combat_controller.rules.actors.get(str(actor.id),{})
	sheet._show_detail("Progresión · "+str(data.name),"","star")
	var dup=sheet.detail_body.get_node_or_null("DetailTitleRow")
	if dup: dup.visible=false
	var host=VBoxContainer.new(); host.name="LevelUpWizard"; host.add_theme_constant_override("separation",10); sheet.detail_body.add_child(host)
	# Top identity & level badge
	var top_card=W.secondary(10); host.add_child(top_card)
	var trow=HBoxContainer.new(); trow.add_theme_constant_override("separation",12); top_card.add_child(trow)
	trow.add_child(W.icon_tile("star",42))
	var tcol=VBoxContainer.new(); tcol.size_flags_horizontal=Control.SIZE_EXPAND_FILL; tcol.add_theme_constant_override("separation",2); trow.add_child(tcol)
	tcol.add_child(W.label("%s · Nivel actual %d" % [str(data.name),cur_lvl],21,true))
	var cls_str:=PackedStringArray()
	for c in classes: cls_str.append("%s Nv. %d%s" % [c.name,int(c.level)," ("+str(c.subclass)+")" if not str(c.get("subclass","")).is_empty() else ""])
	tcol.add_child(W.label(" / ".join(cls_str)+" · Reglas: "+str(Rules.EDITIONS.get(edition,edition)),15,false,Art.MUTED))
	var next_lvl_badge=W.label("Nv. %d  →  Nv. %d" % [cur_lvl,cur_lvl+1],18,true,Art.RED); next_lvl_badge.size_flags_vertical=Control.SIZE_SHRINK_CENTER; trow.add_child(next_lvl_badge)
	# Next level preview
	var primary_cls: String=str(classes[0].id)
	var next_cls_lvl: int=int(classes[0].level)+1
	var preview_feats: Array=Rules.unlocked_features(primary_cls,next_cls_lvl,edition)
	var req: Dictionary=Rules.required_choices(actor,primary_cls,next_cls_lvl,edition)
	var prev_card=W.secondary(10); host.add_child(prev_card)
	var pbox=VBoxContainer.new(); pbox.add_theme_constant_override("separation",5); prev_card.add_child(pbox)
	pbox.add_child(W.label("Desbloqueos al subir a Nivel %d (%s)" % [cur_lvl+1,classes[0].name],17,true,Art.RED))
	var cdef: Dictionary=Rules.CLASSES.get(primary_cls,{})
	var con_mod: int=Model.modifier(int(actor.get("abilities",{}).get("CON",10)))
	pbox.add_child(W.wrapped("• Puntos de golpe: dado 1d%d (fijo +%d) %s CON%s" % [int(cdef.get("hit_die",8)),int(cdef.get("fixed_hp",5)),Model.signed(con_mod)," +1 Enana de las colinas" if Rules.is_hill_dwarf(actor) else ""],15))
	for f in preview_feats:
		pbox.add_child(W.wrapped("• %s: %s" % [f.name,f.description],15))
	if req.subclass: pbox.add_child(W.wrapped("• Elección obligatoria: Subclase de "+str(classes[0].name),15))
	if req.scholar_skill: pbox.add_child(W.wrapped("• Elección obligatoria: Pericia de Erudito en una habilidad de saber",15))
	if req.asi_or_feat: pbox.add_child(W.wrapped("• Elección obligatoria: Mejora de característica (+2 / +1+1) o Dote",15))
	if req.spell_picks>0: pbox.add_child(W.wrapped("• Magia: %d conjuro(s) nuevo(s) disponibles hasta nivel %d" % [req.spell_picks,req.max_spell_level],15))
	var hist: Array=actor.get("level_history",[])
	if not hist.is_empty():
		var hcard=W.secondary(8); host.add_child(hcard)
		var hrow=HBoxContainer.new(); hrow.add_theme_constant_override("separation",10); hcard.add_child(hrow)
		hrow.add_child(W.wrapped("Historial de progresión: %d subida(s) registrada(s)." % hist.size(),14))
		if sheet._can_edit_values():
			var undo_btn=W.button("Deshacer última subida",false,14); undo_btn.name="UndoLevelUpBtn"; undo_btn.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; undo_btn.custom_minimum_size=Vector2(185,30)
			undo_btn.pressed.connect(func():
				var res=Rules.undo_last(sheet.ui,str(actor.id))
				if res.ok: sheet.signature=""; sheet.refresh_view(); open_progression(sheet)
			)
			hrow.add_child(undo_btn)
	var actions_row=HBoxContainer.new(); actions_row.add_theme_constant_override("separation",10); host.add_child(actions_row)
	var start_btn=W.primary_button("Subir de nivel  ›","star",18); start_btn.name="StartLevelUpWizard"; start_btn.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	var can_level: bool=bool(sheet._can_edit_values()) or bool(actor.get("level_up_unlocked",false))
	start_btn.disabled=not can_level
	if not can_level:
		host.add_child(W.wrapped("El DM puede autorizar o ejecutar la subida de nivel desde el rol DM (F2).",14))
	start_btn.pressed.connect(func(): open_wizard(sheet,actor,runtime))
	actions_row.add_child(start_btn)
	sheet._layout()

static func open_wizard(sheet,actor: Dictionary,runtime: Dictionary) -> void:
	var classes: Array=Rules.actor_classes(actor)
	var state: Dictionary={
		"edition":Rules.actor_edition(actor),
		"class_id":str(classes[0].id),
		"hp_method":"fixed",
		"hp_roll":int(Rules.CLASSES.get(classes[0].id,{}).get("fixed_hp",5)),
		"subclass":"",
		"scholar_skill":"",
		"asi_mode":"asi2",
		"asi_primary":str(Rules.CLASSES.get(classes[0].id,{}).get("primary","INT")),
		"asi_secondary":"CON",
		"feat_id":"alerta",
		"spells":[]
	}
	var rebuild: Array=[]
	rebuild.append(func() -> void:
		sheet._show_detail("Asistente de subida de nivel · "+str(actor.name),"","star")
		var dup=sheet.detail_body.get_node_or_null("DetailTitleRow")
		if dup: dup.visible=false
		var root_box=VBoxContainer.new(); root_box.name="LevelUpWizard"; root_box.add_theme_constant_override("separation",8); sheet.detail_body.add_child(root_box)
		var prop: Dictionary=Rules.propose(actor,runtime,state)
		var split=HBoxContainer.new(); split.add_theme_constant_override("separation",12); split.size_flags_vertical=Control.SIZE_EXPAND_FILL; root_box.add_child(split)
		# Left: Guided choices
		var left_card=W.secondary(10); left_card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; left_card.size_flags_stretch_ratio=1.2; split.add_child(left_card)
		var left_scroll=ScrollContainer.new(); left_scroll.custom_minimum_size.y=340; left_scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; left_scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; left_card.add_child(left_scroll); W.style_scroll(left_scroll)
		var form=VBoxContainer.new(); form.size_flags_horizontal=Control.SIZE_EXPAND_FILL; form.add_theme_constant_override("separation",8); left_scroll.add_child(form)
		# 1. Edition & Class
		form.add_child(W.label("1. Edición de reglas y clase",16,true,Art.RED))
		var ed_row=HBoxContainer.new(); ed_row.add_theme_constant_override("separation",6); form.add_child(ed_row)
		for ed_key in ["dnd-2024","dnd-2014"]:
			var eb=W.button(Rules.EDITIONS[ed_key],state.edition==ed_key,14); eb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; eb.custom_minimum_size=Vector2(130,28); eb.toggle_mode=true; W.highlight_choice(eb); eb.set_pressed_no_signal(state.edition==ed_key)
			eb.pressed.connect(func(): state.edition=ed_key; state.subclass=""; state.scholar_skill=""; rebuild[0].call())
			ed_row.add_child(eb)
		var cls_row=HBoxContainer.new(); cls_row.add_theme_constant_override("separation",6); form.add_child(cls_row)
		for cid in ["wizard","cleric","rogue"]:
			var check=Rules.multiclass_check(actor,cid)
			var cb=W.button(Rules.CLASSES[cid].name,state.class_id==cid,14); cb.name="WizardClass_"+cid; cb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; cb.custom_minimum_size=Vector2(92,28); cb.toggle_mode=true; W.highlight_choice(cb); cb.set_pressed_no_signal(state.class_id==cid); cb.disabled=not check.allowed; cb.tooltip_text=check.reason
			cb.pressed.connect(func(): state.class_id=cid; state.hp_roll=int(Rules.CLASSES[cid].fixed_hp); state.subclass=""; state.scholar_skill=""; state.spells=[]; rebuild[0].call())
			cls_row.add_child(cb)
		# 2. Hit Points
		form.add_child(W.label("2. Puntos de golpe (1d%d + CON)" % prop.hit_die,16,true,Art.RED))
		var hp_row=HBoxContainer.new(); hp_row.add_theme_constant_override("separation",6); form.add_child(hp_row)
		var fixed_btn=W.button("Fijo (+%d base)" % int(Rules.CLASSES[state.class_id].fixed_hp),state.hp_method=="fixed",14); fixed_btn.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; fixed_btn.custom_minimum_size=Vector2(128,28); fixed_btn.toggle_mode=true; W.highlight_choice(fixed_btn); fixed_btn.set_pressed_no_signal(state.hp_method=="fixed")
		fixed_btn.pressed.connect(func(): state.hp_method="fixed"; rebuild[0].call())
		hp_row.add_child(fixed_btn)
		var roll_btn=W.button("Dado físico",state.hp_method=="roll",14); roll_btn.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; roll_btn.custom_minimum_size=Vector2(105,28); roll_btn.toggle_mode=true; W.highlight_choice(roll_btn); roll_btn.set_pressed_no_signal(state.hp_method=="roll")
		roll_btn.pressed.connect(func(): state.hp_method="roll"; rebuild[0].call())
		hp_row.add_child(roll_btn)
		if state.hp_method=="roll":
			var spin=SpinBox.new(); spin.name="WizardHpRoll"; spin.min_value=1; spin.max_value=prop.hit_die; spin.value=state.hp_roll; spin.custom_minimum_size.x=80
			Art.style_field(spin.get_line_edit())
			spin.value_changed.connect(func(v): state.hp_roll=int(v); rebuild[0].call())
			hp_row.add_child(spin)
		# 3. Required choices for this level
		var req: Dictionary=Rules.required_choices(actor,state.class_id,prop.new_class_level,state.edition)
		if req.subclass:
			form.add_child(W.label("3. Elegir subclase (obligatorio)",16,true,Art.RED))
			var sub_flow=HFlowContainer.new(); sub_flow.add_theme_constant_override("h_separation",6); sub_flow.add_theme_constant_override("v_separation",4); form.add_child(sub_flow)
			for sub_name in Rules.CLASSES[state.class_id].subclasses:
				var sb=W.button(sub_name,state.subclass==sub_name,14); sb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; sb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(sub_name,HORIZONTAL_ALIGNMENT_LEFT,-1,14).x)+22,28); sb.toggle_mode=true; W.highlight_choice(sb); sb.set_pressed_no_signal(state.subclass==sub_name)
				sb.pressed.connect(func(): state.subclass=sub_name; rebuild[0].call())
				sub_flow.add_child(sb)
		if req.scholar_skill:
			form.add_child(W.label("3. Erudito · Pericia en habilidad (obligatorio)",16,true,Art.RED))
			var sk_flow=HFlowContainer.new(); sk_flow.add_theme_constant_override("h_separation",6); sk_flow.add_theme_constant_override("v_separation",4); form.add_child(sk_flow)
			for sk in Rules.CLASSES.wizard.scholar_skills:
				var kb=W.button(sk,state.scholar_skill==sk,14); kb.name="WizardScholar_"+sk; kb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; kb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(sk,HORIZONTAL_ALIGNMENT_LEFT,-1,14).x)+22,28); kb.toggle_mode=true; W.highlight_choice(kb); kb.set_pressed_no_signal(state.scholar_skill==sk)
				kb.pressed.connect(func(): state.scholar_skill=sk; rebuild[0].call())
				sk_flow.add_child(kb)
		if req.asi_or_feat:
			form.add_child(W.label("3. Mejora de característica o Dote",16,true,Art.RED))
			var mode_row=HBoxContainer.new(); mode_row.add_theme_constant_override("separation",6); form.add_child(mode_row)
			for pair in [["asi2","+2 Atributo"],["asi11","+1 / +1"],["feat","Dote"]]:
				var mb=W.button(pair[1],state.asi_mode==pair[0],14); mb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; mb.custom_minimum_size=Vector2(96,28); mb.toggle_mode=true; W.highlight_choice(mb); mb.set_pressed_no_signal(state.asi_mode==pair[0])
				mb.pressed.connect(func(): state.asi_mode=pair[0]; rebuild[0].call())
				mode_row.add_child(mb)
			if state.asi_mode in ["asi2","asi11"]:
				var ab_row=HBoxContainer.new(); ab_row.add_theme_constant_override("separation",6); form.add_child(ab_row)
				var opt1=OptionButton.new(); var idx1:=0; var k_list:=Model.ABILITIES.keys()
				for i in range(k_list.size()):
					opt1.add_item(k_list[i]+" ("+str(actor.abilities.get(k_list[i],10))+")",i)
					if k_list[i]==state.asi_primary: idx1=i
				opt1.select(idx1); opt1.item_selected.connect(func(i): state.asi_primary=k_list[i]; rebuild[0].call()); ab_row.add_child(opt1)
				if state.asi_mode=="asi11":
					var opt2=OptionButton.new(); var idx2:=0
					for i in range(k_list.size()):
						opt2.add_item(k_list[i]+" ("+str(actor.abilities.get(k_list[i],10))+")",i)
						if k_list[i]==state.asi_secondary: idx2=i
					opt2.select(idx2); opt2.item_selected.connect(func(i): state.asi_secondary=k_list[i]; rebuild[0].call()); ab_row.add_child(opt2)
			else:
				var f_flow=HFlowContainer.new(); f_flow.add_theme_constant_override("h_separation",6); f_flow.add_theme_constant_override("v_separation",4); form.add_child(f_flow)
				for fid in Rules.FEATS:
					var ft: Dictionary=Rules.FEATS[fid]
					var fb=W.button(ft.name,state.feat_id==fid,14); fb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; fb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(ft.name,HORIZONTAL_ALIGNMENT_LEFT,-1,14).x)+22,28); fb.tooltip_text=ft.description; fb.toggle_mode=true; W.highlight_choice(fb); fb.set_pressed_no_signal(state.feat_id==fid)
					fb.pressed.connect(func(): state.feat_id=fid; rebuild[0].call())
					f_flow.add_child(fb)
		if req.spell_picks>0 and not prop.spell_pool.is_empty():
			var need_n:=mini(req.spell_picks,prop.spell_pool.size())
			form.add_child(W.label("Conjuros nuevos (%d/%d elegidos)" % [state.spells.size(),need_n],16,true,Art.RED))
			var sp_flow=HFlowContainer.new(); sp_flow.add_theme_constant_override("h_separation",6); sp_flow.add_theme_constant_override("v_separation",4); form.add_child(sp_flow)
			for cand in prop.spell_pool:
				var sname: String=str(cand.name)
				var picked: bool=sname in state.spells
				var sb=W.button(sname+" (Nv."+str(cand.level)+")",picked,14); sb.name="WizardSpell_"+str(cand.get("id",sname)); sb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; sb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(sb.text,HORIZONTAL_ALIGNMENT_LEFT,-1,14).x)+22,28); sb.tooltip_text=str(cand.get("detail","")); sb.toggle_mode=true; W.highlight_choice(sb); sb.set_pressed_no_signal(picked)
				sb.pressed.connect(func():
					if sname in state.spells: state.spells.erase(sname)
					elif state.spells.size()<need_n: state.spells.append(sname)
					rebuild[0].call()
				)
				sp_flow.add_child(sb)
		# Right: Live Before -> After Preview
		var right_card=W.secondary(10); right_card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; right_card.size_flags_stretch_ratio=1.0; split.add_child(right_card)
		var prev=VBoxContainer.new(); prev.name="LevelUpPreview"; prev.add_theme_constant_override("separation",6); right_card.add_child(prev)
		prev.add_child(W.label("Vista previa · Antes → Después",17,true,Art.RED))
		prev.add_child(W.wrapped("Nivel total: %d → %d (%s Nv. %d)" % [prop.from_level,prop.to_level,prop.class_name,prop.new_class_level],15))
		prev.add_child(W.wrapped("Puntos de golpe máx.: %d → %d (+%d PG)" % [prop.old_hp_max,prop.new_hp_max,prop.hp_gain],15))
		prev.add_child(W.wrapped("Bonif. competencia: %s → %s" % [Model.signed(prop.old_prof),Model.signed(prop.new_prof)],15))
		if prop.new_cast_dc>0:
			prev.add_child(W.wrapped("Magia: CD %d · Ataque %s" % [prop.new_cast_dc,Model.signed(prop.new_cast_atk)],15))
		if not prop.new_slots.is_empty():
			var s_txt:=PackedStringArray()
			for lvl in prop.new_slots: s_txt.append("Nv.%d: %d" % [int(lvl),int(prop.new_slots[lvl])])
			prev.add_child(W.wrapped("Espacios de conjuro: "+", ".join(s_txt),15))
		if not prop.new_features.is_empty():
			prev.add_child(W.label("Rasgos y capacidades nuevos:",15,true))
			for f in prop.new_features:
				prev.add_child(W.wrapped("• "+str(f.name),14))
		if not prop.chosen_spells.is_empty():
			prev.add_child(W.wrapped("Conjuros añadidos: "+", ".join(prop.chosen_spells),14))
		if not prop.valid:
			for err in prop.errors:
				var el=W.wrapped("⚠ "+err,14); el.add_theme_color_override("font_color",Art.RED); prev.add_child(el)
		var spacer=Control.new(); spacer.size_flags_vertical=Control.SIZE_EXPAND_FILL; prev.add_child(spacer)
		var confirm=W.primary_button("Confirmar subida de nivel","star",17); confirm.name="ConfirmLevelUpBtn"; confirm.disabled=not prop.valid
		confirm.pressed.connect(func():
			var res=Rules.apply(sheet.ui,str(actor.id),prop)
			if res.ok:
				sheet.detail.hide(); sheet.signature=""; sheet.refresh_view()
		)
		prev.add_child(confirm)
		var back=W.button("‹ Volver a Progresión",false,14); back.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; back.custom_minimum_size.y=28; back.pressed.connect(func(): open_progression(sheet)); prev.add_child(back)
		sheet._layout()
	)
	rebuild[0].call()
