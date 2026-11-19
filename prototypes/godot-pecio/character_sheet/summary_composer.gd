extends RefCounted
const W=preload("res://character_sheet/sheet_widgets.gd")
const Art=preload("res://character_sheet/skin.gd")
const Model=preload("res://character_sheet/sheet_model.gd")
const Presentation=preload("res://character_sheet/presentation.gd")
var sheet
var data: Dictionary
func build(host) -> void:
	sheet=host; data=sheet.data
	var top=VBoxContainer.new() if sheet.stacked else HBoxContainer.new(); top.name="SummaryTop"; top.add_theme_constant_override("separation",12); top.size_flags_vertical=Control.SIZE_FILL; sheet.content.add_child(top)
	var abilities=section(top,"Atributos","hand",.83); abilities.get_parent().custom_minimum_size.x=190 if sheet.compact else 208; attributes(abilities)
	var niche=MarginContainer.new(); niche.name="CharacterStoryStage"; niche.size_flags_vertical=Control.SIZE_SHRINK_CENTER; niche.size_flags_horizontal=Control.SIZE_SHRINK_CENTER; top.add_child(niche)
	var stage=Presentation.Stage.new(); stage.setup(sheet.ui,data); stage.custom_minimum_size=Vector2(148,222) if sheet.compact else Vector2(192,288)
	niche.add_child(stage); sheet.actor_view=stage.actor_view
	var attacks=section(top,"Ataques y acciones","sword",3.8); attacks.get_parent().name="SummaryActions"; action_table(attacks,4 if sheet.compact else 6)
	var bottom=VBoxContainer.new() if sheet.stacked else HBoxContainer.new(); bottom.name="SummaryBottom"; bottom.add_theme_constant_override("separation",12); bottom.size_flags_vertical=Control.SIZE_EXPAND_FILL; bottom.size_flags_stretch_ratio=1; sheet.content.add_child(bottom)
	var skills=section(bottom,"Habilidades y salvaciones","die",1.1); skills.get_parent().name="SummarySkills"; skill_summary(skills)
	var magic=section(bottom,"Trucos y conjuros" if not data.spells.is_empty() else "Recursos y estados","magic" if not data.spells.is_empty() else "stealth",1); magic.get_parent().name="SummaryMagic"; magic_summary(magic)
	var story=section(bottom,"Rasgos y trasfondo","history",1.55); story.get_parent().name="SummaryTraits"; story_summary(story)
func section(parent: Node,title: String,icon: String,weight: float=1) -> VBoxContainer:
	var panel=W.surface(6 if sheet.compact else 9); panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; panel.size_flags_stretch_ratio=weight; parent.add_child(panel)
	var box=VBoxContainer.new(); box.add_theme_constant_override("separation",2 if sheet.compact else 4); panel.add_child(box); W.heading(box,title,icon,20 if sheet.compact else 22); return box
func scroll_list(parent: Node,name: String,height: int=40) -> VBoxContainer:
	var scroll=ScrollContainer.new(); scroll.name=name; scroll.custom_minimum_size.y=height; scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; parent.add_child(scroll); W.style_scroll(scroll)
	var list=VBoxContainer.new(); list.size_flags_horizontal=Control.SIZE_EXPAND_FILL; list.add_theme_constant_override("separation",1); scroll.add_child(list); return list
func attributes(parent: Node) -> void:
	for key in Model.ABILITIES:
		var score=data.get("abilities",{}).get(key,null); var b=W.button(""); b.name="SheetAbility_"+key; b.custom_minimum_size.y=26 if sheet.compact else 32; b.size_flags_vertical=Control.SIZE_EXPAND_FILL; b.disabled=score==null; parent.add_child(b)
		if sheet.tab!="summary": b.size_flags_vertical=Control.SIZE_SHRINK_BEGIN
		W.stripe(b,Model.ABILITIES.keys().find(key))
		var row=button_row(b); row.add_child(W.image({"FUE":"hand","DES":"dexterity","CON":"heart","INT":"book","SAB":"eye","CAR":"star"}[key],24))
		var label=W.label(key,18,true); label.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(label)
		var value=W.label(str(score) if score!=null else "—",25,true); value.custom_minimum_size.x=31; value.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; row.add_child(value)
		row.add_child(W.badge(Model.signed(Model.modifier(int(score))) if score!=null else "—"))
		b.tooltip_text="Prueba de "+key; b.pressed.connect(func(): sheet._check("Prueba de "+key,Model.modifier(int(score)),"Característica",score!=null))
func button_row(button: Button) -> HBoxContainer:
	var row=HBoxContainer.new(); row.mouse_filter=Control.MOUSE_FILTER_IGNORE; row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); row.offset_left=5; row.offset_right=-5; row.offset_top=2; row.offset_bottom=-2; row.add_theme_constant_override("separation",7); button.add_child(row); return row
func cell(parent: Node,text: String,weight: float,points: int=16,bold: bool=false) -> Label:
	var l=W.label(text,points,bold); l.size_flags_horizontal=Control.SIZE_EXPAND_FILL; l.size_flags_stretch_ratio=weight; l.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; parent.add_child(l); return l
func action_table(parent: Node,maximum: int) -> void:
	var header_plate=W.secondary(3); parent.add_child(header_plate)
	var header=HBoxContainer.new(); header.add_theme_constant_override("separation",7); header_plate.add_child(header)
	for col in [["Acción",2.2],["Tipo",1.2],["Alcance / Dur.",1.2],["Ataque / CD",1.2],["Daño / Efecto",2.1],["Reserva",1.0]]: cell(header,col[0],col[1],15,true)
	var list=scroll_list(parent,"SummaryActionRows",80); var count=0
	for action in data.actions:
		if count>=maximum: break
		var f=Model.action_fields(action,data); var b=W.button(""); b.custom_minimum_size.y=28; b.name="SheetAction_"+str(action.get("id",count)); b.tooltip_text=Model.action_summary(action)+"\n"+f.target+"\n"+f.effect; list.add_child(b); W.stripe(b,count)
		var row=button_row(b); var identity=HBoxContainer.new(); identity.size_flags_horizontal=Control.SIZE_EXPAND_FILL; identity.size_flags_stretch_ratio=2.2; row.add_child(identity)
		identity.add_child(W.icon_tile(Art.action_icon(action),24)); cell(identity,f.name,1,18,true)
		cell(row,f.type,1.2,15)
		var reach=f.range+(" · Conc." if f.duration=="Concentración" else " · "+f.duration if not f.duration.is_empty() else "")
		cell(row,reach,1.2,15); cell(row,f.roll,1.2,16,true); cell(row,f.effect,2.1,16); var uses=cell(row,f.uses,1.0,15)
		if not f.resource.is_empty(): b.tooltip_text+="\n"+f.resource.label+": "+str(f.resource.current)+"/"+str(f.resource.max)+" · Coste "+str(f.resource.cost)
		var unavailable=str(sheet.ui.combat_controller.rules.availability(str(data.id),action))
		if not unavailable.is_empty(): uses.add_theme_color_override("font_color",Art.RED); b.tooltip_text+="\n"+unavailable
		b.pressed.connect(func(): sheet.show_action(action)); count+=1
	var more=W.button("Todas las acciones  ›",false,16); more.pressed.connect(func(): sheet.select_tab("combat")); parent.add_child(more)
func skill_summary(parent: Node) -> void:
	var list=scroll_list(parent,"SummarySkillsScroll",26 if sheet.compact else 52)
	var ordered=Model.SKILLS.duplicate(true)
	ordered.sort_custom(func(a,b):
		var first=Model.skill_bonus(data,a[0],a[1]); var second=Model.skill_bonus(data,b[0],b[1])
		return a[0]<b[0] if first==second else first>second
	)
	for skill in ordered:
		var base=Model.modifier(int(data.get("abilities",{}).get(skill[1],10))); var rank=Model.rank(data,skill[0],base); var bonus=Model.skill_bonus(data,skill[0],skill[1])
		var b=W.skill_row(skill[0],skill[1],bonus,rank); b.name="SummarySkill_"+skill[0]; list.add_child(b)
		b.tooltip_text="Competencia no registrada: bonificador base" if rank<0 else "Pericia" if rank==2 else "Competencia" if rank==1 else "Sin competencia"
		if not Model.skill_note(data,skill[0]).is_empty(): b.tooltip_text+="\n"+Model.skill_note(data,skill[0])
		b.pressed.connect(func(): sheet._check(skill[0],bonus,"Habilidad · "+skill[1],rank>=0))
	var save_title=HBoxContainer.new(); parent.add_child(save_title); save_title.add_child(W.image("shield",17)); save_title.add_child(W.label("Salvaciones",16,true))
	var saves=GridContainer.new(); saves.name="SummarySaves"; saves.columns=3; saves.add_theme_constant_override("h_separation",5); saves.add_theme_constant_override("v_separation",1); parent.add_child(saves)
	for key in Model.ABILITIES:
		var base=Model.modifier(int(data.get("abilities",{}).get(key,10))); var confirmed=data.get("saves",{}).has(Model.ABILITIES[key]); var bonus=int(data.get("saves",{}).get(Model.ABILITIES[key],base))
		var b=W.button(key+" "+Model.signed(bonus),false,16); b.custom_minimum_size.y=24; b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; b.tooltip_text="Salvación registrada" if confirmed else "Base; competencia pendiente"; saves.add_child(b); b.pressed.connect(func(): sheet._check("Salvación "+key,bonus,"Salvación",confirmed))
	var all=W.button("Competencias y 18 habilidades  ›",false,15); all.custom_minimum_size.y=24 if sheet.compact else 30; all.pressed.connect(func(): sheet._show_detail("Habilidades y salvaciones","Bonificadores actuales y estado de competencia registrado."); sheet._skills(sheet.detail_body,false)); parent.add_child(all)
func magic_summary(parent: Node) -> void:
	if not data.spells.is_empty():
		var values=HBoxContainer.new(); values.add_theme_constant_override("separation",10); parent.add_child(values)
		for field in [["CD",["CD","save_dc","saveDC"],"casting"],["Ataque",["Ataque","attack_bonus","attackBonus"],"wand"]]:
			for key in field[1]:
				if data.get("casting",{}).has(key): W.magic_stat(values,field[0],str(data.casting[key]),field[2]); break
	for key in data.get("resources",{}): W.slot_row(parent,str(key),data.resources[key])
	var list=scroll_list(parent,"SummaryMagicScroll",35)
	if data.spells.is_empty():
		list.add_child(W.label("Turno actual" if sheet.ui.combat_controller.rules.active else "Exploración",18,true))
		list.add_child(W.wrapped(Model.condition_text(data) if not data.get("conditions",[]).is_empty() else "Sin estados activos",17))
		if sheet.ui.combat_controller.rules.active:
			list.add_child(W.label("Acción · "+("gastada" if data.get("action_used",false) else "disponible"),16))
			list.add_child(W.label("Reacción · "+("gastada" if data.get("reaction_used",false) else "disponible"),16))
		for key in data.get("ammunition",{}): list.add_child(W.label(str({"arrow":"Flechas","dagger":"Dagas"}.get(key,key))+" · "+str(data.ammunition[key]),17))
	else:
		var groups=Model.spell_groups(data)
		for group in groups:
			if groups[group].is_empty(): continue
			var caption=W.label(("Repertorio" if group=="Repertorio" else group)+" · "+str(groups[group].size()),15,true); list.add_child(caption)
			caption.tooltip_text="Preparación no registrada en la fuente" if group=="Repertorio" else group
			for spell in groups[group]:
				var b=W.button(""); b.custom_minimum_size.y=27; b.tooltip_text=str(spell.get("detail","")); list.add_child(b)
				var row=button_row(b); row.add_child(W.image(Art.action_icon(spell.action) if not spell.action.is_empty() else "magic",20)); cell(row,str(spell.name),1,17)
				b.pressed.connect(func(): sheet.show_action(spell.action,spell))
	if not str(data.get("concentration","")).is_empty(): parent.add_child(W.label("Concentración · "+str(data.concentration),15,true))
	var more=W.button("Ver repertorio  ›" if not data.spells.is_empty() else "Acciones generales  ›",false,15); more.pressed.connect(func(): sheet.select_tab("spells" if not data.spells.is_empty() else "combat")); parent.add_child(more)
func story_summary(parent: Node) -> void:
	var body=HBoxContainer.new(); body.add_theme_constant_override("separation",12); body.size_flags_vertical=Control.SIZE_EXPAND_FILL; parent.add_child(body)
	var trait_host=VBoxContainer.new(); trait_host.size_flags_horizontal=Control.SIZE_EXPAND_FILL; trait_host.size_flags_stretch_ratio=1.2; body.add_child(trait_host)
	var list=scroll_list(trait_host,"SummaryTraitsScroll",70)
	for f in Model.feature_entries(data):
		var line=HBoxContainer.new(); list.add_child(line); line.add_child(W.image({"Especie":"leaf","Clase":"book","Subclase":"casting","Dotes":"star"}.get(f.category,"history"),18))
		var b=W.button(str(f.name),false,18); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; b.alignment=HORIZONTAL_ALIGNMENT_LEFT; b.tooltip_text=f.name+" · "+f.description; line.add_child(b); b.pressed.connect(func(): sheet._show_detail(f.name,f.description))
		if f.description!=f.name and not str(f.description).is_empty():
			var desc=W.wrapped(str(f.description),16); desc.max_lines_visible=2; desc.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; list.add_child(desc)
	var story=VBoxContainer.new(); story.size_flags_horizontal=Control.SIZE_EXPAND_FILL; body.add_child(story)
	story.add_child(W.label(str(data.get("background","Historia")),20,true))
	var notes=W.wrapped(str(data.get("notes","")),16); notes.max_lines_visible=2 if sheet.compact else 3; notes.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; notes.tooltip_text=notes.text; story.add_child(notes)
	var art=W.Landscape.new(); art.theme_key=W.Paint.ink_theme(data); art.size_flags_vertical=Control.SIZE_EXPAND_FILL; art.custom_minimum_size.y=65 if sheet.compact else 85; story.add_child(art)
	var more=W.button("Historia y rasgos completos  ›",false,15); more.pressed.connect(func(): sheet.select_tab("history")); parent.add_child(more)
