extends PanelContainer
const Art=preload("res://character_sheet/skin.gd")
const Model=preload("res://character_sheet/sheet_model.gd")
const Presentation=preload("res://character_sheet/presentation.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")
const Summary=preload("res://character_sheet/summary_composer.gd")
const HeaderFinish=preload("res://character_sheet/header_finish.gd")
const HPFinish=preload("res://character_sheet/hp_finish.gd")
var ui
var close_callback: Callable
var data: Dictionary={}
var tab: String="summary"
var title_label: Label
var subtitle_label: Label
var state_label: Label
var tabs: HBoxContainer
var header: HBoxContainer
var main_layout: VBoxContainer
var stacked: bool=false
var profile_medallion
var level_label: Label
var content: VBoxContainer
var section_host: Node
var stats: HBoxContainer
var detail: PanelContainer
var detail_body: VBoxContainer
var scroll: ScrollContainer
var actor_view
var body_box: VBoxContainer
var signature: String=""
var refresh_time: float=0
var compact: bool=false
var detail_overlay: Control
var role_bar_was_visible: bool=false
var external_backdrop: ColorRect
var detail_action_id: String=""
var detail_spell_key: String=""
var refreshing_detail: bool=false
func setup(owner_ui,close_action: Callable) -> void:
	ui=owner_ui; close_callback=close_action; name="CharacterSheetModal"; visible=false
	var blank=StyleBoxEmpty.new()
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: blank.set_content_margin(side,22)
	add_theme_stylebox_override("panel",blank)
	var paper=W.Paint.Paper.new(); add_child(paper); resized.connect(paper.queue_redraw)
	var art=Art.FrameArt.new(); art.border=30; art.draw_center=false; add_child(art); resized.connect(art.queue_redraw)
	var corners=W.Paint.Exterior.new(); add_child(corners); resized.connect(corners.queue_redraw)
	main_layout=VBoxContainer.new(); main_layout.add_theme_constant_override("separation",7); add_child(main_layout)
	header=HBoxContainer.new(); header.name="SheetHeader"; header.add_theme_constant_override("separation",12); main_layout.add_child(header)
	profile_medallion=Presentation.Medallion.new(); profile_medallion.name="CharacterProfilePortrait"; profile_medallion.ornate=true; profile_medallion.closeup=true; profile_medallion.custom_minimum_size=Vector2(116,116); header.add_child(profile_medallion)
	var identity_frame=PanelContainer.new(); identity_frame.name="SheetIdentity"; identity_frame.size_flags_horizontal=Control.SIZE_EXPAND_FILL; identity_frame.size_flags_vertical=Control.SIZE_SHRINK_CENTER; var identity_margin=StyleBoxEmpty.new(); identity_margin.content_margin_left=22; identity_margin.content_margin_right=20; identity_margin.content_margin_top=10; identity_margin.content_margin_bottom=12; identity_frame.add_theme_stylebox_override("panel",identity_margin); header.add_child(identity_frame)
	var identity_art=HeaderFinish.Plate.new(); identity_frame.add_child(identity_art); identity_frame.resized.connect(identity_art.queue_redraw)
	var identity=VBoxContainer.new(); identity.custom_minimum_size.x=190; identity.add_theme_constant_override("separation",0); identity_frame.add_child(identity)
	var name_row=HBoxContainer.new(); name_row.add_theme_constant_override("separation",10); identity.add_child(name_row)
	title_label=W.label("",W.TYPE.h1,true); title_label.add_theme_font_override("font",W.font(true)); title_label.custom_minimum_size.x=110; title_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; name_row.add_child(title_label)
	subtitle_label=W.label("",18,true); subtitle_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; subtitle_label.custom_minimum_size.y=23; subtitle_label.max_lines_visible=2
	var identity_meta=HBoxContainer.new(); identity_meta.add_theme_constant_override("separation",9); identity.add_child(identity_meta); subtitle_label.size_flags_horizontal=Control.SIZE_EXPAND_FILL; identity_meta.add_child(subtitle_label)
	var level_medal=PanelContainer.new(); level_medal.size_flags_vertical=Control.SIZE_SHRINK_CENTER; var level_style=StyleBoxFlat.new(); level_style.bg_color=Color("#eed09a"); level_style.border_color=Color("#976125"); level_style.set_border_width_all(1); level_style.set_corner_radius_all(10); level_style.content_margin_left=8; level_style.content_margin_right=8; level_medal.add_theme_stylebox_override("panel",level_style); identity_meta.add_child(level_medal); level_label=W.label("",16,true); level_medal.add_child(level_label)
	state_label=W.label("",15,true,Art.RED); state_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; state_label.visible=false; identity.add_child(state_label)
	tabs=HBoxContainer.new(); tabs.name="SheetPrimaryNavigation"; tabs.size_flags_vertical=Control.SIZE_SHRINK_CENTER; tabs.add_theme_constant_override("separation",-2); header.add_child(tabs)
	for entry in [["summary","Resumen","book"],["combat","Combate","sword"],["spells","Conjuros","magic"],["inventory","Inventario","backpack"],["history","Historia","history"]]:
		var b=HeaderFinish.navigation(entry[1]); b.name="SheetTab_"+entry[0]; b.icon=W.symbol(entry[2]); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",20)
		b.toggle_mode=true; b.tooltip_text=entry[1]
		b.custom_minimum_size=Vector2(ceilf(W.font(true).get_string_size(entry[1],HORIZONTAL_ALIGNMENT_LEFT,-1,18).x)+46,48)
		b.pressed.connect(func(): select_tab(entry[0])); tabs.add_child(b)
	var edit=W.icon_button("feather"); edit.icon=Art.icon("feather"); edit.expand_icon=true; edit.add_theme_constant_override("icon_max_width",23); edit.name="SheetEdit"; edit.tooltip_text="Editar valores de mesa"; edit.custom_minimum_size.x=34; edit.size_flags_vertical=Control.SIZE_SHRINK_CENTER; edit.pressed.connect(func(): select_tab("edit")); header.add_child(edit)
	var close=W.icon_button("","×"); close.name="SheetClose"; close.tooltip_text="Cerrar ficha · Esc"; close.custom_minimum_size.x=34; close.size_flags_vertical=Control.SIZE_SHRINK_CENTER; close.pressed.connect(close_callback); header.add_child(close)
	stats=HBoxContainer.new(); stats.add_theme_constant_override("separation",10); main_layout.add_child(stats)
	scroll=ScrollContainer.new(); scroll.name="SheetScroll"; scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; main_layout.add_child(scroll); W.style_scroll(scroll)
	body_box=VBoxContainer.new(); body_box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; body_box.size_flags_vertical=Control.SIZE_EXPAND_FILL; body_box.add_theme_constant_override("separation",8); scroll.add_child(body_box)
	content=VBoxContainer.new(); content.size_flags_horizontal=Control.SIZE_EXPAND_FILL; content.size_flags_vertical=Control.SIZE_EXPAND_FILL; content.add_theme_constant_override("separation",10); body_box.add_child(content)
	section_host=content; _build_detail()
	visibility_changed.connect(func():
		_sync_preview_state(is_visible_in_tree())
		if external_backdrop: external_backdrop.visible=is_visible_in_tree()
		if is_visible_in_tree():
			var host=get_parent(); host.get_parent().move_child(host,host.get_parent().get_child_count()-1)
			role_bar_was_visible=ui.role_switcher_panel.visible; ui.role_switcher_panel.hide()
			signature=""; refresh_view(); grab_focus()
		else:
			detail.hide(); _release_inventory()
			if role_bar_was_visible: ui.role_switcher_panel.show()
	)
	ui.role_changed.connect(func(_role):
		if visible: close_callback.call()
	)
	focus_mode=Control.FOCUS_ALL
func _process(delta: float) -> void:
	if not is_visible_in_tree(): return
	refresh_time-=delta
	if refresh_time<=0:
		refresh_time=.18; refresh_view()
	_layout()
func _layout() -> void:
	var view=get_viewport_rect().size
	var target=Vector2(minf(1420,view.x*.9),minf(850,view.y*.88))
	var now_compact=target.x<1250; var now_stacked=view.x<1050
	if tab=="summary" and content and header and stats:
		var needed=content.get_combined_minimum_size().y+header.get_combined_minimum_size().y+stats.get_combined_minimum_size().y+58
		if tabs.get_parent()!=header: needed+=tabs.get_combined_minimum_size().y+7
		scroll.vertical_scroll_mode=ScrollContainer.SCROLL_MODE_AUTO if now_stacked or needed>view.y-32 else ScrollContainer.SCROLL_MODE_DISABLED
	var fit_inventory=tab=="inventory" and ui.inventory_bridge.items().values().filter(func(item): return int(item.get("count",0))>0).size()<=12
	if body_box and (tab not in ["summary","inventory"] or fit_inventory):
		var chrome_height=header.get_combined_minimum_size().y+stats.get_combined_minimum_size().y+58
		if tabs.get_parent()!=header: chrome_height+=tabs.get_combined_minimum_size().y+7
		target.y=minf(target.y,maxf(380,body_box.get_combined_minimum_size().y+chrome_height))
		if fit_inventory: target.y=maxf(target.y,minf(720,minf(850,view.y*.88)))
	set_anchors_preset(Control.PRESET_TOP_LEFT); size=target; target=size; position=(view-target)*.5
	profile_medallion.custom_minimum_size=Vector2(96,96) if now_compact else Vector2(116,116)
	title_label.add_theme_font_size_override("font_size",34 if now_compact else 42)
	if now_stacked and tabs.get_parent()==header:
		tabs.reparent(main_layout,false); main_layout.move_child(tabs,1)
	elif not now_stacked and tabs.get_parent()!=header:
		tabs.reparent(header,false); header.move_child(tabs,2)
	if now_compact!=compact or now_stacked!=stacked:
		compact=now_compact; stacked=now_stacked; signature=""; refresh_view()
	var overlay_extent=detail_overlay.size if detail_overlay.size.x>0 else target-Vector2(44,44)
	var detail_height=minf(590,overlay_extent.y-32)
	if detail_body: detail_height=minf(detail_height,maxf(220,detail_body.get_combined_minimum_size().y+85))
	detail.size=Vector2(minf(720,overlay_extent.x-32),detail_height)
	detail.position=(overlay_extent-detail.size)*.5
func select_tab(value: String) -> void:
	tab=value; signature=""; scroll.scroll_vertical=0; detail.hide(); refresh_view()
func refresh_view() -> void:
	if not ui: return
	var current=Model.snapshot(ui)
	if current.is_empty(): return
	var next=JSON.stringify([current,tab,compact])
	if next==signature: return
	var keep_inventory=tab=="inventory" and data.get("id","")==current.get("id","") and content.is_ancestor_of(ui.player_hud.inventory_modal)
	var keep_editor=tab=="edit" and data.get("id","")==current.get("id","") and content.find_child("SheetEdit_ac",true,false)!=null
	if not data.is_empty() and data.get("id","")!=current.get("id",""):
		detail.hide(); detail_action_id=""; detail_spell_key=""
	data=current; signature=next
	_sync_preview_state(is_visible_in_tree())
	title_label.text=str(data.name)
	title_label.custom_minimum_size.x=clampf(W.font(true).get_string_size(title_label.text,HORIZONTAL_ALIGNMENT_LEFT,-1,32 if compact else 38).x+5,85,280)
	title_label.tooltip_text=title_label.text
	subtitle_label.text=str(data.identity)
	subtitle_label.tooltip_text=subtitle_label.text
	state_label.text=Model.condition_text(data); state_label.tooltip_text=state_label.text; state_label.visible=not state_label.text.is_empty()
	level_label.text="Nv. "+str(data.get("level",1)); level_label.add_theme_font_size_override("font_size",16)
	profile_medallion.texture=Presentation.portrait(data,ui.get_active_token_node()); profile_medallion.queue_redraw()
	for b in tabs.get_children():
		var active=str(b.name)=="SheetTab_"+tab; var temp=HeaderFinish.navigation(b.text,active)
		b.set_pressed_no_signal(active)
		for state in ["normal","hover","pressed","disabled","focus"]: b.add_theme_stylebox_override(state,temp.get_theme_stylebox(state))
		b.add_theme_color_override("font_color",Art.IVORY); b.add_theme_color_override("font_hover_color",Art.IVORY); temp.free(); b.set_meta("fantasy_selected",active)
		for decoration in b.get_children():
			if decoration is CanvasItem: decoration.queue_redraw()
	_rebuild_stats()
	if keep_inventory:
		ui.player_hud.inventory_modal.refresh_view(); _refresh_action_detail(); return
	if keep_editor:
		for key in ["ac","speed"]:
			var spin=content.find_child("SheetEdit_"+key,true,false) as SpinBox
			if spin: spin.set_value_no_signal(float(data.get(key,0)))
		return
	var saved_scroll=scroll.scroll_vertical
	_release_inventory(); _clear(content); section_host=content
	scroll.vertical_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED if tab=="summary" and not stacked else ScrollContainer.SCROLL_MODE_AUTO
	match tab:
		"summary": _summary()
		"combat": _combat()
		"spells": _spells_page()
		"inventory": _inventory_page()
		"history": _history_page()
		"edit": _edit_page()
	if saved_scroll>0: scroll.set_deferred("scroll_vertical",saved_scroll)
	if detail.visible:
		_refresh_action_detail(); move_child(detail_overlay,get_child_count()-1)
func _refresh_action_detail() -> void:
	if not detail.visible or detail_action_id.is_empty() or refreshing_detail: return
	refreshing_detail=true
	var action={}; var spell={}; var selected_id=detail_action_id; var selected_spell=detail_spell_key
	for entry in data.get("actions",[]):
		if str(entry.get("id",""))==selected_id: action=entry; break
	for entry in data.get("spells",[]):
		if not selected_spell.is_empty() and Model.normalized(str(entry.get("name","")))==selected_spell: spell=entry; break
	var sc=detail_body.get_parent() as ScrollContainer; var offset=sc.scroll_vertical
	var old_button=detail_body.find_child("PrepareSheetAction",true,false) as Button
	var had_focus=old_button!=null and old_button.has_focus()
	if action.is_empty(): _show_detail("Acción no disponible","La ficha actual ya no contiene esta acción.")
	else: show_action(action,spell)
	sc.set_deferred("scroll_vertical",offset)
	var new_button=detail_body.find_child("PrepareSheetAction",true,false) as Button
	if had_focus and new_button and not new_button.disabled: new_button.grab_focus()
	refreshing_detail=false
func _sync_preview_state(opened: bool) -> void:
	if not ui: return
	var active=ui.get_active_token_node()
	for body in ui.tokens_by_node.values():
		if is_instance_valid(body): body.set_meta("character_sheet_open",opened and body==active)
func _clear(node: Node) -> void:
	for child in node.get_children(): node.remove_child(child); child.queue_free()
func _rebuild_stats() -> void:
	_clear(stats)
	var hp_text="%d / %d" % [int(data.get("hp",0)),int(data.get("hp_max",0))]
	for entry in [["Puntos de golpe",hp_text,"heart"],["Clase de armadura",str(data.get("ac","?")),"shield"],["Velocidad",Model.meters(float(data.get("speed",0)))+" m","speed"],["Iniciativa",Model.signed(int(data.get("initiative_bonus",0))),"initiative"],["Competencia",Model.signed(int(data.proficiency_bonus)),"star"]]:
		if entry[2]=="heart":
			stats.add_child(_hp_card(hp_text)); continue
		var p=W.stat_plate(); p.size_flags_horizontal=Control.SIZE_EXPAND_FILL; p.custom_minimum_size.y=76 if compact else 80; stats.add_child(p)
		if entry[2]=="shield": p.size_flags_stretch_ratio=.55
		var row=HBoxContainer.new(); row.add_theme_constant_override("separation",10); p.add_child(row)
		if entry[2]=="shield":
			row.alignment=BoxContainer.ALIGNMENT_CENTER
			var shield=W.ArmorBadge.new(); shield.custom_minimum_size=Vector2(88,66); shield.tooltip_text="Clase de armadura"; row.add_child(shield)
			var face=VBoxContainer.new(); face.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); face.offset_top=8; face.offset_bottom=-12; face.add_theme_constant_override("separation",-5); shield.add_child(face)
			var title=W.label("CA",13,true); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; face.add_child(title)
			var value=W.label(entry[1],27,true); value.name="SheetStat_shield"; value.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; face.add_child(value)
		else:
			row.add_child(W.image(entry[2],43))
			var box=VBoxContainer.new(); box.add_theme_constant_override("separation",0); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(box)
			box.add_child(W.label(entry[0],16,true,Art.INK))
			var value=W.label(entry[1],30,true,Art.INK); value.add_theme_font_override("font",W.font(true)); value.name="SheetStat_"+entry[2]; box.add_child(value)
		p.tooltip_text="Estados: "+Model.condition_text(data) if not data.get("conditions",[]).is_empty() else ""
func _hp_card(hp_text: String) -> PanelContainer:
	var p=PanelContainer.new(); p.name="SheetHPCard"; p.size_flags_horizontal=Control.SIZE_EXPAND_FILL; p.custom_minimum_size=Vector2(200,84)
	var inset=StyleBoxEmpty.new(); inset.content_margin_left=19; inset.content_margin_right=19; inset.content_margin_top=10; inset.content_margin_bottom=12; p.add_theme_stylebox_override("panel",inset)
	var backing=HPFinish.Backing.new(); p.add_child(backing); p.resized.connect(backing.queue_redraw)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",8); p.add_child(row)
	var heart=HPFinish.Heart.new(); heart.name="SheetHPHeart"; heart.custom_minimum_size=Vector2(49,49); heart.size_flags_vertical=Control.SIZE_SHRINK_CENTER; heart.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; heart.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; heart.mouse_filter=Control.MOUSE_FILTER_IGNORE; row.add_child(heart)
	var box=VBoxContainer.new(); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; box.add_theme_constant_override("separation",-2); row.add_child(box)
	var title=W.label("Puntos de golpe",16,true,Color("#fff0d3")); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; box.add_child(title)
	var values=HBoxContainer.new(); values.alignment=BoxContainer.ALIGNMENT_CENTER; values.add_theme_constant_override("separation",5); box.add_child(values)
	var value=W.label(hp_text,32,true,Color("#fff8e8")); value.name="SheetStat_heart"; value.add_theme_color_override("font_shadow_color",Color("#210206")); value.add_theme_constant_override("shadow_offset_y",2); values.add_child(value)
	if int(data.get("temp_hp",0))>0:
		var temp=W.label("+%d" % int(data.temp_hp),15,true,Color("#c7eee5")); temp.tooltip_text="Puntos de golpe temporales"; temp.mouse_filter=Control.MOUSE_FILTER_PASS; values.add_child(temp)
	var bar=ProgressBar.new(); bar.name="SheetHPBar"; bar.max_value=maxi(1,int(data.hp_max)); bar.value=clampi(int(data.hp),0,int(data.hp_max)); bar.show_percentage=false; bar.custom_minimum_size.y=10; bar.add_theme_stylebox_override("background",StyleBoxEmpty.new()); bar.add_theme_stylebox_override("fill",StyleBoxEmpty.new()); box.add_child(bar)
	var gloss=HPFinish.LifeBar.new(); bar.add_child(gloss); bar.resized.connect(gloss.queue_redraw); bar.value_changed.connect(func(_value): gloss.queue_redraw())
	p.tooltip_text="%s puntos de golpe%s" % [hp_text," · +%d temporales" % int(data.temp_hp) if int(data.get("temp_hp",0))>0 else ""]
	return p
func _section(title: String,icon: String="book",weight: float=1.0) -> VBoxContainer:
	var p=W.surface(10); p.size_flags_horizontal=Control.SIZE_EXPAND_FILL; p.size_flags_stretch_ratio=weight; section_host.add_child(p)
	var box=VBoxContainer.new(); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; box.add_theme_constant_override("separation",6); p.add_child(box); W.heading(box,title,icon); return box
func _summary() -> void:
	Summary.new().build(self)



func _row() -> void:
	var row=VBoxContainer.new() if stacked else HBoxContainer.new(); row.add_theme_constant_override("separation",10); row.size_flags_horizontal=Control.SIZE_EXPAND_FILL; content.add_child(row); section_host=row
func _attributes(parent: Node) -> void:
	var composer=Summary.new(); composer.sheet=self; composer.data=data; composer.attributes(parent)
func _actions(parent: Node,all: bool=true,maximum: int=0) -> void:
	var count=0
	for action in data.actions:
		if not all and Model.is_spell(action) and not action.has("damageDice"): continue
		if maximum>0 and count>=maximum: break
		_action_row(parent,action,maximum>0); count+=1
	if maximum>0 and data.actions.size()>count:
		var more=Art.button("Ver todas las acciones  ›"); more.pressed.connect(func(): select_tab("combat")); parent.add_child(more)
func _action_row(parent: Node,action: Dictionary,brief: bool=false) -> void:
	var f=Model.action_fields(action,data); var row=HBoxContainer.new(); row.add_theme_constant_override("separation",10); parent.add_child(row)
	row.add_child(W.icon_tile(Art.action_icon(action),33))
	var box=VBoxContainer.new(); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(box)
	var title=W.button(f.name,false,20); title.add_theme_font_override("font",W.font()); title.alignment=HORIZONTAL_ALIGNMENT_LEFT; box.add_child(title)
	var line=f.type+" · "+f.target+" · "+f.range+" · "+f.roll
	if not f.duration.is_empty(): line+=" · "+f.duration
	if not f.uses.is_empty(): line+=" · Reserva "+f.uses
	box.add_child(W.wrapped(line,16)); box.add_child(W.wrapped(f.effect,17)); title.pressed.connect(func(): show_action(action))
func _skills(parent: Node,summary: bool=false) -> void:
	var legend=HFlowContainer.new(); legend.add_theme_constant_override("h_separation",12); parent.add_child(legend)
	for state in [[-1,"Sin registrar"],[0,"Sin competencia"],[1,"Competencia"],[2,"Pericia"]]:
		var entry=HBoxContainer.new(); legend.add_child(entry); var seal=W.Paint.RankSeal.new(); seal.rank=state[0]; entry.add_child(seal); entry.add_child(W.label(state[1],14))
	var list=VBoxContainer.new(); list.add_theme_constant_override("separation",2)
	var inner=ScrollContainer.new(); inner.name="SheetSkillsScroll"; inner.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; inner.custom_minimum_size.y=140 if summary else 300; inner.size_flags_vertical=Control.SIZE_EXPAND_FILL; parent.add_child(inner); W.style_scroll(inner); list.size_flags_horizontal=Control.SIZE_EXPAND_FILL; inner.add_child(list)
	for skill in Model.SKILLS:
		var base=Model.modifier(int(data.get("abilities",{}).get(skill[1],10))); var rank=Model.rank(data,skill[0],base); var bonus=Model.skill_bonus(data,skill[0],skill[1])
		var b=W.skill_row(skill[0],skill[1],bonus,rank); b.name="DetailedSkill_"+skill[0]; b.tooltip_text="Competencia no registrada: modificador base" if rank<0 else "Bonificador total registrado"; list.add_child(b)
		b.pressed.connect(func(): _check(skill[0],bonus,"Habilidad · "+skill[1],rank>=0))
	W.heading(parent,"Salvaciones","shield")
	var saves=GridContainer.new(); saves.columns=3; parent.add_child(saves)
	for ability in Model.ABILITIES:
		var base=Model.modifier(int(data.get("abilities",{}).get(ability,10))); var confirmed=data.get("saves",{}).has(Model.ABILITIES[ability]); var bonus=int(data.get("saves",{}).get(Model.ABILITIES[ability],base)); var b=W.button(ability+" "+Model.signed(bonus)); b.add_theme_font_size_override("font_size",17); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; saves.add_child(b); b.pressed.connect(func(): _check("Salvación "+ability,bonus,"Salvación",confirmed))
func _resources(parent: Node) -> void:
	var resources: Dictionary=data.get("resources",{})
	for key in resources: W.slot_row(parent,str(key),resources[key])
	if not str(data.get("concentration","")).is_empty(): parent.add_child(W.wrapped("Concentración · "+str(data.concentration)))
	var conditions: Array=data.get("conditions",[])
	if not conditions.is_empty(): parent.add_child(W.wrapped("Estados · "+Model.condition_text(data)))
	if resources.is_empty() and str(data.get("concentration","")).is_empty(): parent.add_child(W.wrapped("Sin recursos limitados registrados.",15))
func _magic(parent: Node,summary: bool=false) -> void:
	var overview=HFlowContainer.new(); overview.name="SheetSpellOverview"; overview.add_theme_constant_override("h_separation",24); overview.add_theme_constant_override("v_separation",4); parent.add_child(overview)
	for field in [["CD",["CD","save_dc","saveDC"],"casting"],["Ataque",["Ataque","attack_bonus","attackBonus"],"concentration"]]:
		for key in field[1]:
			if not data.get("casting",{}).has(key): continue
			var metric=HBoxContainer.new(); metric.add_theme_constant_override("separation",6); overview.add_child(metric); metric.add_child(W.image(field[2],25)); metric.add_child(W.label(field[0],15,true)); metric.add_child(W.label(str(data.casting[key]),25,true)); break
	for key in data.get("resources",{}): W.slot_row(overview,str(key),data.resources[key])
	if not str(data.get("concentration","")).is_empty(): parent.add_child(W.label("Concentración · "+str(data.concentration),16,true))
	if not data.get("conditions",[]).is_empty(): parent.add_child(W.label(Model.condition_text(data),16,true))
	var groups=Model.spell_groups(data)
	for group in groups:
		if groups[group].is_empty(): continue
		var caption=HBoxContainer.new(); caption.add_theme_constant_override("separation",8); parent.add_child(caption); caption.add_child(W.image("spellbook" if group!="Trucos" else "magic",21))
		caption.add_child(W.label(group+" ("+str(groups[group].size())+")",20,true))
		if group=="Repertorio": caption.add_child(W.label("Preparación sin registrar",14,false,Art.MUTED))
		var grid=GridContainer.new(); grid.columns=1 if stacked else 2; grid.add_theme_constant_override("h_separation",10); grid.add_theme_constant_override("v_separation",7); parent.add_child(grid)
		for spell in groups[group]: _spell_card(grid,spell,summary)
func _spell_card(parent: Node,spell: Dictionary,brief: bool=false) -> void:
	var card=W.secondary(6); card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; parent.add_child(card)
	var content_box=VBoxContainer.new(); content_box.add_theme_constant_override("separation",1); card.add_child(content_box)
	var action: Dictionary=spell.get("action",{}); var f=Model.action_fields(action,data) if not action.is_empty() else {}
	var head=HBoxContainer.new(); head.add_theme_constant_override("separation",8); content_box.add_child(head)
	var title=W.button(str(spell.get("name","Conjuro")),false,20); title.add_theme_font_override("font",W.font()); title.alignment=HORIZONTAL_ALIGNMENT_LEFT; title.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	title.icon=W.symbol(Art.action_icon(action) if not action.is_empty() else Art.action_icon(spell)); title.expand_icon=true; title.add_theme_constant_override("icon_max_width",26)
	title.tooltip_text=str(spell.get("detail",""))+"\n"+str(action.get("castingTime","")); title.set_meta("action_id",str(action.get("id",""))); head.add_child(title); title.pressed.connect(func(): show_action(action,spell))
	var metadata=PackedStringArray()
	if not f.is_empty(): metadata.append(f.type)
	if not f.is_empty() and not f.uses.is_empty(): metadata.append(f.uses)
	elif spell.has("level") and int(spell.level)>0: metadata.append("Nv. "+str(spell.level))
	if spell.has("prepared"): metadata.append("Preparado" if spell.prepared else "No preparado")
	if spell.has("known"): metadata.append("Conocido" if spell.known else "No conocido")
	if not metadata.is_empty():
		var caption=W.label(" · ".join(metadata),14,true); caption.size_flags_vertical=Control.SIZE_SHRINK_CENTER; head.add_child(caption)
	if not f.is_empty():
		var parts=PackedStringArray([f.range])
		if f.roll!="—": parts.append(("Ataque " if f.roll_kind=="attack" else "")+f.roll)
		parts.append(f.effect)
		if not f.duration.is_empty() and not f.effect.to_lower().contains(f.duration.to_lower()): parts.append(f.duration)
		if action.has("castingTime"): parts.append(str(action.castingTime))
		var effect=W.wrapped(" · ".join(parts),16); effect.max_lines_visible=3; effect.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; effect.tooltip_text=effect.text; content_box.add_child(effect)
	elif not brief: content_box.add_child(W.wrapped(str(spell.get("detail","")),16))
func _features(parent: Node,maximum: int=0) -> void:
	var entries=Model.feature_entries(data); var count=0; var category=""
	for feature in entries:
		if maximum>0 and count>=maximum: break
		if feature.category!=category:
			var caption=HBoxContainer.new(); parent.add_child(caption); caption.add_child(W.image({"Especie":"leaf","Clase":"book","Subclase":"casting","Dotes":"star"}.get(feature.category,"history"),20)); caption.add_child(W.label(feature.category,19,true)); category=feature.category
		var b=W.button(feature.name,false,20); b.add_theme_font_override("font",W.font()); b.alignment=HORIZONTAL_ALIGNMENT_LEFT; parent.add_child(b)
		b.pressed.connect(func(): _show_detail(feature.name,feature.description))
		if maximum==0 and feature.description!=feature.name: parent.add_child(W.wrapped(feature.description,17))
		count+=1
	if maximum>0 and entries.size()>count:
		var more=W.button("Leer todos los rasgos  ›"); more.pressed.connect(func(): select_tab("history")); parent.add_child(more)
func _combat() -> void:
	_row()
	var abilities=_section("Defensas y atributos","shield"); _attributes(abilities); _resources(abilities)
	W.heading(abilities,"Acciones generales","hand",20)
	var general=HFlowContainer.new(); general.add_theme_constant_override("h_separation",5); general.add_theme_constant_override("v_separation",4); abilities.add_child(general)
	for key in Model.Catalogue.BASIC:
		var b=W.button(str(Model.Catalogue.BASIC[key]),false,17); b.custom_minimum_size.x=125; b.icon=W.symbol(Art.action_icon({"id":key})); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",21); b.pressed.connect(func(): close_callback.call(); ui.combat_controller._basic(key)); general.add_child(b)
	var actions=_section("Acciones disponibles","sword",2); _actions(actions)
	var skills=_section("Pruebas y salvaciones","die"); _skills(skills)
func _spells_page() -> void:
	_row()
	if data.spells.is_empty():
		var empty=_section("Magia y recursos","spellbook"); empty.add_child(W.wrapped("Este personaje no tiene conjuros registrados.",20))
		if not data.get("resources",{}).is_empty(): _resources(empty)
		var actions=W.button("Ver acciones y recursos  ›",false,18); actions.pressed.connect(func(): select_tab("combat")); empty.add_child(actions)
		return
	var feature_count=Model.feature_entries(data).size()
	var spells=_section("Repertorio mágico","magic",3 if feature_count<=3 else 2); spells.get_parent().name="DetailedSpellRepertoire"; _magic(spells)
	if feature_count>3:
		var notes=_section("Rasgos relacionados","book"); _features(notes)
	elif feature_count>0:
		var notes=HFlowContainer.new(); notes.name="CompactSpellTraits"; notes.add_theme_constant_override("h_separation",12); notes.add_theme_constant_override("v_separation",3); spells.add_child(notes)
		var caption=W.label("Rasgos",15,true); caption.size_flags_vertical=Control.SIZE_SHRINK_CENTER; notes.add_child(caption)
		for feature in Model.feature_entries(data):
			var button=W.button(feature.name,false,17); button.icon=W.symbol("leaf" if feature.category=="Especie" else "book"); button.expand_icon=true; button.add_theme_constant_override("icon_max_width",20); button.tooltip_text=feature.description; notes.add_child(button); button.pressed.connect(func(): _show_detail(feature.name,feature.description))
			button.custom_minimum_size.x=clampf(ceilf(button.get_theme_font("font").get_string_size(feature.name,HORIZONTAL_ALIGNMENT_LEFT,-1,17).x)+42,95,360)
func _history_page() -> void:
	section_host=content
	var story=_section("Crónica del aventurero","history"); story.get_parent().name="HistoryEditorialPage"
	var opening=HBoxContainer.new(); opening.add_theme_constant_override("separation",22); story.add_child(opening)
	var narrative=VBoxContainer.new(); narrative.size_flags_horizontal=Control.SIZE_EXPAND_FILL; narrative.size_flags_stretch_ratio=3; opening.add_child(narrative)
	narrative.add_child(W.label(str(data.get("background","")),27,true)); narrative.add_child(W.wrapped(str(data.identity),18))
	if not str(data.get("notes","")).is_empty(): narrative.add_child(W.wrapped(str(data.notes),20))
	var illustration=W.Landscape.new(); illustration.name="HistoryInkDrawing"; illustration.theme_key=W.Paint.ink_theme(data); illustration.custom_minimum_size=Vector2(220,126); illustration.size_flags_horizontal=Control.SIZE_EXPAND_FILL; opening.add_child(illustration)
	W.divider(story)
	var category=""
	for feature in Model.feature_entries(data):
		if feature.category!=category:
			var heading=HBoxContainer.new(); story.add_child(heading); heading.add_child(W.image({"Especie":"leaf","Clase":"book","Subclase":"casting","Dotes":"star"}.get(feature.category,"history"),25)); heading.add_child(W.label(feature.category,23,true)); category=feature.category
		var row=HBoxContainer.new(); row.add_theme_constant_override("separation",18); story.add_child(row)
		var title=W.button(str(feature.name),false,20); title.add_theme_font_override("font",W.font()); title.alignment=HORIZONTAL_ALIGNMENT_LEFT; title.custom_minimum_size.x=210; row.add_child(title); title.pressed.connect(func(): _show_detail(feature.name,feature.description))
		if feature.description!=feature.name: row.add_child(W.wrapped(str(feature.description),19))
	for section in data.get("details",[]):
		W.divider(story); story.add_child(W.label(str(section.get("title","Detalles")),25,true))
		for entry in section.get("entries",[]): story.add_child(W.wrapped(str(entry),19))
	for field in [["history","Historia personal"],["motivations","Motivaciones"],["personal_notes","Notas personales"]]:
		if not str(data.get(field[0],"")).is_empty():
			W.divider(story); story.add_child(W.label(field[1],25,true)); story.add_child(W.wrapped(str(data[field[0]]),19))
func _edit_page() -> void:
	section_host=content
	var edits=_section("Editar valores de mesa","hand")
	edits.add_child(Art.wrapped("Ajustes actuales del personaje. Los cambios de CA y velocidad se comparten con el combate.",15))
	for entry in [["ac","Clase de armadura",5,30,1],["speed","Velocidad (m)",3,18,1.5]]:
		var row=HBoxContainer.new(); edits.add_child(row); var label=Art.label(entry[1]); label.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(label)
		var spin=SpinBox.new(); spin.name="SheetEdit_"+entry[0]; spin.min_value=entry[2]; spin.max_value=entry[3]; spin.step=entry[4]; spin.value=float(data.get(entry[0],0)); spin.custom_minimum_size.x=130; row.add_child(spin)
		Art.style_field(spin.get_line_edit())
		spin.value_changed.connect(func(value):
			var a: Dictionary=ui.get_active_actor(); a[entry[0]]=int(value) if entry[0]=="ac" else value
			if ui.combat_controller and ui.combat_controller.rules.actors.has(str(a.id)):
				ui.combat_controller.rules.actors[str(a.id)][entry[0]]=a[entry[0]]; ui.combat_controller.rules.changed.emit()
			ui.refresh_all()
		)
	var hp=Art.button("Modificar puntos de golpe"); hp.pressed.connect(func():
		close_callback.call()
		if ui.current_role=="dm": ui.combat_controller.edit_combatant(str(data.id))
		else: ui.player_hud.open_modal("hp")
	); edits.add_child(hp)
func _build_detail() -> void:
	detail_overlay=Control.new(); detail_overlay.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(detail_overlay)
	var veil=ColorRect.new(); veil.color=Color("#30251c",.13); veil.mouse_filter=Control.MOUSE_FILTER_STOP; veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); veil.hide(); detail_overlay.add_child(veil)
	veil.gui_input.connect(func(event):
		if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT and event.pressed: detail.hide()
	)
	detail=W.surface(18); detail.name="SheetDetail"; detail.visible=false; detail.mouse_filter=Control.MOUSE_FILTER_STOP; detail_overlay.add_child(detail)
	var solid=detail.get_theme_stylebox("panel").duplicate(); solid.bg_color=Art.IVORY; solid.shadow_color=Color("#30251c",.4); solid.shadow_size=12; detail.add_theme_stylebox_override("panel",solid)
	var paper=W.Paint.Paper.new(); detail.add_child(paper); detail.move_child(paper,0); detail.resized.connect(paper.queue_redraw)
	detail.visibility_changed.connect(func(): veil.visible=detail.visible)
	var vb=VBoxContainer.new(); detail.add_child(vb)
	var close=Art.button("Cerrar detalle  ×"); close.pressed.connect(func(): detail.hide()); vb.add_child(close)
	var sc=ScrollContainer.new(); sc.size_flags_vertical=Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; vb.add_child(sc); W.style_scroll(sc)
	detail_body=VBoxContainer.new(); detail_body.size_flags_horizontal=Control.SIZE_EXPAND_FILL; detail_body.add_theme_constant_override("separation",10); sc.add_child(detail_body)
func _show_detail(title: String,text: String) -> void:
	detail_action_id=""; detail_spell_key=""
	_clear(detail_body)
	var row=HBoxContainer.new(); row.name="DetailTitleRow"; detail_body.add_child(row)
	var heading=W.wrapped(title,27); heading.add_theme_font_override("font",W.font()); row.add_child(heading)
	if not text.is_empty(): detail_body.add_child(W.wrapped(text,18))
	detail.show(); move_child(detail_overlay,get_child_count()-1); _layout()
func show_action(action: Dictionary,spell: Dictionary={}) -> void:
	var title=str(spell.get("name",action.get("label","Acción"))).split("·")[0].strip_edges()
	_show_detail(title,"")
	detail_action_id=str(action.get("id","")); detail_spell_key=Model.normalized(str(spell.get("name","")))
	if not action.is_empty():
		var heading=detail_body.get_node("DetailTitleRow"); var icon=W.image(Art.action_icon(action),32); heading.add_child(icon); heading.move_child(icon,0)
	if not action.is_empty():
		var fields=Model.action_fields(action,data)
		for entry in [["Tipo",fields.type],["Objetivo",fields.target],["Alcance",fields.range],["Duración",fields.duration],["Ataque / Salvación",fields.roll],["Daño / Efecto",fields.effect]]:
			if str(entry[1]).is_empty() or entry[1]=="—": continue
			var row=HBoxContainer.new(); detail_body.add_child(row); var caption=W.label(entry[0],17,true); caption.custom_minimum_size.x=145; row.add_child(caption); row.add_child(W.wrapped(str(entry[1]),18))
		if not fields.resource.is_empty():
			var r=fields.resource
			detail_body.add_child(W.wrapped(("Coste · %d espacio de conjuro" if r.kind=="spell_slot" else "Coste · %d uso") % int(r.cost),18))
			detail_body.add_child(W.wrapped(r.label+" · %d disponibles de %d" % [int(r.current),int(r.max)],17))
	if not spell.is_empty() and not str(spell.get("detail","")).is_empty(): detail_body.add_child(W.wrapped(str(spell.detail),17))
	for key in ["description","full_description","duration","casting_time","range","level"]:
		if spell.has(key): detail_body.add_child(W.wrapped(str({"description":"Descripción","full_description":"Descripción completa","duration":"Duración","casting_time":"Lanzamiento","range":"Alcance","level":"Nivel"}[key])+" · "+str(spell[key]),17))
	for key in ["description","guidance","effect","castingTime"]:
		if action.has(key): detail_body.add_child(W.wrapped(str(action[key]),17))
	if str(action.get("id","")).is_empty(): return
	var use=W.button("Preparar esta acción",true,19); use.name="PrepareSheetAction"; detail_body.add_child(use)
	var reason=str(ui.combat_controller.rules.availability(str(data.id),action))
	if ui.current_role=="dm" and ui.combat_controller.rules.active and ui.combat_controller.acting_id()!=str(data.id): reason="La miniatura consultada no es la que actúa."
	if not reason.is_empty(): use.disabled=true; detail_body.add_child(W.wrapped(reason,16))
	use.pressed.connect(func():
		if ui.current_role=="dm" and not ui.combat_controller.rules.active: ui.combat_controller._acting_override=str(data.id)
		close_callback.call(); ui.combat_controller.choose_action(str(action.id))
	)

func _check(title: String,bonus: int,kind: String,confirmed: bool) -> void:
	var text="1d20 físico "+Model.signed(bonus)+" · "+kind
	if not confirmed: text+=". Este es el modificador base; el DM debe confirmar la competencia."
	_show_detail(title,text)
	var b=Art.button("Solicitar tirada al DM",true); detail_body.add_child(b)
	b.pressed.connect(func():
		ui.dm_requests.insert(0,{"id":"sheet_"+str(Time.get_ticks_usec()),"actor":str(data.name),"action":title,"skill":text,"zone":ui.get_current_zone_display()})
		ui.notify_mesa("Tirada solicitada: "+title); ui.refresh_all(); detail.hide()
	)
func _unhandled_key_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		if detail.visible: detail.hide()
		else: close_callback.call()
		get_viewport().set_input_as_handled()
func _release_inventory() -> void:
	if not ui or not ui.player_hud: return
	var bag=ui.player_hud.inventory_modal
	if content and content.is_ancestor_of(bag):
		bag.hide(); bag.reparent(ui.player_hud.root,false); bag.set_embedded(false)
func _inventory_page() -> void:
	var bridge=ui.inventory_bridge
	if bridge.session.is_open and bridge.session.actor_id!=str(data.id): bridge.finish()
	if not bridge.session.is_open: bridge.begin()
	var row=HBoxContainer.new(); row.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_theme_constant_override("separation",14); content.add_child(row)
	var niche=MarginContainer.new(); niche.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(niche)
	var stage=Presentation.Stage.new(); stage.setup(ui,data); niche.add_child(stage); actor_view=stage.actor_view
	var bag=ui.player_hud.inventory_modal
	bag.reparent(row,false); bag.set_embedded(true); bag.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bag.size_flags_stretch_ratio=4; bag.show(); bag.refresh_view()
