extends PanelContainer
const Art=preload("res://character_sheet/skin.gd")
const Model=preload("res://character_sheet/sheet_model.gd")
const Presentation=preload("res://character_sheet/presentation.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")
const Summary=preload("res://character_sheet/summary_composer.gd")
const HeaderFinish=preload("res://character_sheet/header_finish.gd")
const HPFinish=preload("res://character_sheet/hp_finish.gd")
const Icons=preload("res://character_sheet/action_icons.gd")
const ActionBook=preload("res://character_sheet/action_book.gd")
const LevelUpWizard=preload("res://character_sheet/level_up_wizard.gd")
const BASIC_HELP={
	"dash":"Amplía el movimiento disponible del turno.",
	"disengage":"Activa Destrabarse en el turno actual.",
	"dodge":"Activa Esquivar en el turno actual.",
	"help":"Selecciona un aliado para proponer la ayuda.",
	"hide":"Solicita al DM resolver el intento de esconderse.",
	"ready":"Elige una acción y declara su desencadenante al DM.",
	"search":"Selecciona dónde buscar y solicita la resolución.",
	"study":"Solicita al DM resolver el estudio.",
	"influence":"Selecciona a quién quieres influir.",
	"use-object":"Selecciona el objeto con el que quieres interactuar.",
	"improvise":"Describe una acción al DM para que la resuelva.",
}
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
var level_button: Button
var identity_icon: TextureRect
var content: VBoxContainer
var section_host: Node
var stats: HBoxContainer
var paper_node: Node2D
var bio_editing: bool=false
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
var spell_selection: String=""
var combat_selection: String=""
var combat_inspector: VBoxContainer
var spell_inspector: VBoxContainer
var spell_query: Dictionary={}
var spell_level: Dictionary={}
var viewport_state: Dictionary={}
var rendered_key: String=""
var editor_dirty: bool=false
var history_sections: Dictionary={}
func setup(owner_ui,close_action: Callable) -> void:
	theme=W.manuscript_theme()
	ui=owner_ui; close_callback=close_action; name="CharacterSheetModal"; visible=false
	var blank=StyleBoxEmpty.new()
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: blank.set_content_margin(side,22)
	add_theme_stylebox_override("panel",blank)
	var paper=W.Paint.Paper.new(); paper_node=paper; add_child(paper); resized.connect(paper.queue_redraw)
	var art=Art.FrameArt.new(); art.border=30; art.draw_center=false; add_child(art); resized.connect(art.queue_redraw)
	var corners=W.Paint.Exterior.new(); add_child(corners); resized.connect(corners.queue_redraw)
	main_layout=VBoxContainer.new(); main_layout.add_theme_constant_override("separation",7); add_child(main_layout)
	header=HBoxContainer.new(); header.name="SheetHeader"; header.add_theme_constant_override("separation",10); main_layout.add_child(header)
	# Portrait medallion proudly overhangs the top-left corner and overlaps the left rim of the name scroll (Image 1).
	var portrait_slot=Control.new(); portrait_slot.name="PortraitOverhangSlot"; portrait_slot.custom_minimum_size=Vector2(96,112); portrait_slot.mouse_filter=Control.MOUSE_FILTER_IGNORE; portrait_slot.clip_contents=false; header.add_child(portrait_slot)
	profile_medallion=Presentation.Medallion.new(); profile_medallion.name="CharacterProfilePortrait"; profile_medallion.ornate=true; profile_medallion.closeup=true; profile_medallion.overhang=Vector2(-10,-8); profile_medallion.z_index=8; profile_medallion.custom_minimum_size=Vector2(118,118); profile_medallion.size=Vector2(118,118); portrait_slot.add_child(profile_medallion)
	var identity_frame=PanelContainer.new(); identity_frame.name="SheetIdentity"; identity_frame.size_flags_horizontal=Control.SIZE_EXPAND_FILL; identity_frame.size_flags_vertical=Control.SIZE_SHRINK_CENTER; var identity_margin=StyleBoxEmpty.new(); identity_margin.content_margin_left=32; identity_margin.content_margin_right=20; identity_margin.content_margin_top=10; identity_margin.content_margin_bottom=12; identity_frame.add_theme_stylebox_override("panel",identity_margin); header.add_child(identity_frame)
	var identity_art=HeaderFinish.Plate.new(); identity_frame.add_child(identity_art); identity_frame.resized.connect(identity_art.queue_redraw)
	var identity=VBoxContainer.new(); identity.custom_minimum_size.x=190; identity.add_theme_constant_override("separation",0); identity_frame.add_child(identity)
	var name_row=HBoxContainer.new(); name_row.add_theme_constant_override("separation",10); identity.add_child(name_row)
	title_label=W.label("",W.TYPE.h1,true); W.type_role(title_label,"identity"); title_label.custom_minimum_size.x=110; title_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; name_row.add_child(title_label)
	subtitle_label=W.label("",18,true); W.type_role(subtitle_label,"subtitle"); subtitle_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; subtitle_label.custom_minimum_size.y=23; subtitle_label.max_lines_visible=2
	var identity_meta=HBoxContainer.new(); identity_meta.add_theme_constant_override("separation",7); identity.add_child(identity_meta)
	identity_icon=W.image("wizard",18); identity_icon.size_flags_vertical=Control.SIZE_SHRINK_CENTER; identity_meta.add_child(identity_icon)
	subtitle_label.size_flags_horizontal=Control.SIZE_EXPAND_FILL; identity_meta.add_child(subtitle_label)
	level_button=Art.Native.HintButton.new(); level_button.name="SheetLevelButton"; level_button.size_flags_vertical=Control.SIZE_SHRINK_CENTER; level_button.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	level_button.set_meta("sheet_icon","star"); level_button.set_meta("sheet_title","Progresión y nivel")
	level_button.accessibility_name="Nivel del personaje. Abrir progresión y subida de nivel"
	for state in ["normal","hover","pressed","disabled","focus"]:
		var ls=StyleBoxFlat.new()
		ls.bg_color=Color("#edd19a") if state=="normal" else Color("#dfc080") if state=="hover" else Color("#cfa85d") if state=="pressed" else Color("#e6d4b0")
		ls.border_color=Color("#8c5820") if state!="focus" else Color("#6b2629")
		ls.set_border_width_all(2 if state in ["hover","focus"] else 1); ls.set_corner_radius_all(11)
		ls.content_margin_left=10; ls.content_margin_right=10; ls.content_margin_top=2; ls.content_margin_bottom=2
		level_button.add_theme_stylebox_override(state,ls)
		level_button.add_theme_color_override("font_"+state+"_color",Art.INK)
	level_button.add_theme_color_override("font_color",Art.INK)
	level_button.add_theme_font_override("font",W.font(true)); level_button.add_theme_font_size_override("font_size",16)
	level_button.pressed.connect(func(): open_progression())
	identity_meta.add_child(level_button)
	level_label=W.label("",16,true); level_label.visible=false; level_button.add_child(level_label)
	state_label=W.label("",15,true,Art.RED); W.type_role(state_label,"status"); state_label.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; state_label.visible=false; identity.add_child(state_label)
	tabs=HBoxContainer.new(); tabs.name="SheetPrimaryNavigation"; tabs.size_flags_vertical=Control.SIZE_SHRINK_CENTER; tabs.add_theme_constant_override("separation",-2); header.add_child(tabs)
	for entry in [["summary","Resumen","book"],["combat","Combate","sword"],["spells","Conjuros","magic"],["inventory","Inventario","backpack"],["history","Historia","history"]]:
		var b=HeaderFinish.navigation(entry[1]); b.set_meta("sheet_icon",entry[2]); b.name="SheetTab_"+entry[0]; b.icon=W.symbol(entry[2]); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",20)
		b.toggle_mode=true; b.tooltip_text=entry[1]
		b.custom_minimum_size=Vector2(ceilf(W.font(true).get_string_size(entry[1],HORIZONTAL_ALIGNMENT_LEFT,-1,18).x)+46,48)
		b.pressed.connect(func(): select_tab(entry[0])); tabs.add_child(b)
	var edit=W.icon_button("feather"); edit.icon=Art.icon("feather"); edit.expand_icon=true; edit.add_theme_constant_override("icon_max_width",20); edit.name="SheetEdit"; edit.tooltip_text="Editar valores de mesa"; edit.custom_minimum_size=Vector2(38,38); edit.size_flags_vertical=Control.SIZE_SHRINK_CENTER; edit.pressed.connect(func(): select_tab("edit")); header.add_child(edit)
	edit.accessibility_name="Editar ficha"
	var close=W.icon_button("","×"); close.name="SheetClose"; close.tooltip_text="Cerrar ficha · Esc"; close.custom_minimum_size=Vector2(38,38); close.size_flags_vertical=Control.SIZE_SHRINK_CENTER; close.pressed.connect(close_callback); header.add_child(close)
	close.accessibility_name="Cerrar ficha"
	stats=HBoxContainer.new(); stats.add_theme_constant_override("separation",10); main_layout.add_child(stats)
	scroll=ScrollContainer.new(); scroll.name="SheetScroll"; scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL; main_layout.add_child(scroll); W.style_scroll(scroll)
	body_box=VBoxContainer.new(); body_box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; body_box.size_flags_vertical=Control.SIZE_EXPAND_FILL; body_box.add_theme_constant_override("separation",8); scroll.add_child(body_box)
	content=VBoxContainer.new(); content.size_flags_horizontal=Control.SIZE_EXPAND_FILL; content.size_flags_vertical=Control.SIZE_EXPAND_FILL; content.add_theme_constant_override("separation",7); body_box.add_child(content)
	section_host=content; _build_detail()
	var hints=preload("res://character_sheet/manuscript_hint.gd").new(); hints.name="SheetHints"; add_child(hints)
	visibility_changed.connect(func():
		_sync_preview_state(is_visible_in_tree())
		if external_backdrop: external_backdrop.visible=is_visible_in_tree()
		if is_visible_in_tree():
			var host=get_parent(); host.get_parent().move_child(host,host.get_parent().get_child_count()-1)
			role_bar_was_visible=ui.role_switcher_panel.visible; ui.role_switcher_panel.hide()
			signature=""; refresh_view(); grab_focus()
		else:
			_remember_scroll()
			editor_dirty=false
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
	var width=minf(1540,view.x*.8875)
	var now_compact=width<1250; var now_stacked=view.x<1050
	var target=Vector2(width,minf(920,view.y*(.89 if now_compact else .867)))
	set_anchors_preset(Control.PRESET_TOP_LEFT); size=target; target=size; position=(view-target)*.5
	var msize=Vector2(94,94) if now_compact else Vector2(120,120)
	profile_medallion.custom_minimum_size=msize; profile_medallion.size=msize
	profile_medallion.overhang=Vector2(-7,-6) if now_compact else Vector2(-10,-8)
	var pslot=profile_medallion.get_parent() as Control
	if pslot: pslot.custom_minimum_size=Vector2(74,92) if now_compact else Vector2(96,112)
	title_label.add_theme_font_size_override("font_size",34 if now_compact else 42)
	if is_instance_valid(paper_node): paper_node.queue_redraw()
	if now_stacked and tabs.get_parent()==header:
		tabs.reparent(main_layout,false); main_layout.move_child(tabs,1)
	elif not now_stacked and tabs.get_parent()!=header:
		tabs.reparent(header,false); header.move_child(tabs,2)
	if now_compact!=compact or now_stacked!=stacked:
		compact=now_compact; stacked=now_stacked; signature=""; refresh_view()
	var overlay_extent=detail_overlay.size if detail_overlay.size.x>0 else target-Vector2(44,44)
	var wide_detail=detail_body!=null and (detail_body.find_child("ActionBookList",true,false)!=null or detail_body.find_child("LevelUpWizard",true,false)!=null)
	var detail_height=minf(640 if wide_detail else 590,overlay_extent.y-28)
	if detail_body: detail_height=minf(detail_height,maxf(220,detail_body.get_combined_minimum_size().y+96))
	detail.size=Vector2(minf(880 if wide_detail else 720,overlay_extent.x-28),detail_height)
	detail.position=(overlay_extent-detail.size)*.5
func select_tab(value: String) -> void:
	tab=value; bio_editing=false; signature=""; detail.hide(); refresh_view()
func _remember_scroll() -> void:
	if rendered_key.is_empty(): return
	var offsets={"outer":scroll.scroll_vertical}
	for pane in content.find_children("*","ScrollContainer",true,false):
		if not str(pane.name).begins_with("@"): offsets[str(pane.name)]=pane.scroll_vertical
	viewport_state[rendered_key]=offsets
func refresh_view() -> void:
	if not ui: return
	var current=Model.snapshot(ui)
	if current.is_empty(): return
	var rules=ui.combat_controller.rules
	var turn=[rules.active,rules.current_id(),rules.initiative_pending,rules.pending]
	var next=JSON.stringify([current,tab,compact,stacked,turn,ui.current_role,bio_editing])
	if next==signature: return
	var keep_inventory=tab=="inventory" and data.get("id","")==current.get("id","") and content.is_ancestor_of(ui.player_hud.inventory_modal)
	var current_key=str(current.id)+"/"+tab
	var keep_editor=tab=="edit" and rendered_key==current_key and content.find_child("SheetEdit_ac",true,false)!=null
	if rendered_key!=current_key: editor_dirty=false
	if not data.is_empty() and data.get("id","")!=current.get("id",""):
		detail.hide(); detail_action_id=""; detail_spell_key=""
		spell_selection=""
	data=current; signature=next
	_sync_preview_state(is_visible_in_tree())
	title_label.text=str(data.name)
	title_label.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	title_label.tooltip_text=title_label.text
	subtitle_label.text=str(data.identity)
	subtitle_label.tooltip_text=subtitle_label.text
	state_label.text=Model.condition_text(data); state_label.tooltip_text=state_label.text; state_label.visible=not state_label.text.is_empty()
	level_label.text="Nv. "+str(data.get("level",1)); level_label.add_theme_font_size_override("font_size",16)
	if is_instance_valid(level_button):
		level_button.text="Nv. "+str(data.get("level",1))
		level_button.tooltip_text="Nivel %d · Pulsa para abrir Progresión y subida de nivel" % int(data.get("level",1))
	if is_instance_valid(identity_icon):
		var id_low=str(data.identity).to_lower()
		identity_icon.texture=W.symbol("wizard" if id_low.contains("mag") else "holy" if id_low.contains("clérig") or id_low.contains("clerig") else "stealth" if id_low.contains("pícar") or id_low.contains("picar") else "soldier")
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
	if keep_editor and _can_edit_values():
		for key in ["ac","speed"]:
			var spin=content.find_child("SheetEdit_"+key,true,false) as SpinBox
			if spin and not editor_dirty and not spin.get_line_edit().has_focus(): spin.set_value_no_signal(float(data.get("base_"+key,0)))
		var health_value=content.find_child("SheetEditorHealth",true,false)
		if health_value: health_value.text="%d de %d PG" % [data.hp,data.hp_max]
		return
	_remember_scroll()
	var offsets: Dictionary=viewport_state.get(current_key,{})
	rendered_key=current_key
	_release_inventory(); _clear(content); section_host=content
	match tab:
		"summary": _summary()
		"combat": _combat()
		"spells": _spells_page()
		"inventory": _inventory_page()
		"history": _history_page()
		"edit": _edit_page()
	scroll.set_deferred("scroll_vertical",int(offsets.get("outer",0)))
	for pane in content.find_children("*","ScrollContainer",true,false):
		if offsets.has(str(pane.name)): pane.set_deferred("scroll_vertical",offsets[str(pane.name)])
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
		if entry[2]=="shield": p.size_flags_stretch_ratio=.76
		var row=HBoxContainer.new(); row.add_theme_constant_override("separation",10); p.add_child(row)
		if entry[2]=="shield":
			row.alignment=BoxContainer.ALIGNMENT_CENTER
			var crest=W.image("shield",42); crest.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(crest)
			var box=VBoxContainer.new(); box.add_theme_constant_override("separation",0); box.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(box)
			var title=W.label("CA",16,true,Art.INK); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; box.add_child(title)
			var value=W.label(entry[1],30,true,Art.INK); W.type_role(value,"number"); value.name="SheetStat_shield"; value.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; box.add_child(value)
		else:
			row.add_child(W.image(entry[2],42))
			var box=VBoxContainer.new(); box.add_theme_constant_override("separation",0); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; box.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(box)
			box.add_child(W.label(entry[0],16,true,Art.INK))
			var value=W.label(entry[1],30,true,Art.INK); W.type_role(value,"number"); value.name="SheetStat_"+entry[2]; box.add_child(value)
		var explanation=Model.stat_explanation(data,entry[2])
		p.tooltip_text=explanation
		p.accessibility_name=entry[0]+" "+entry[1]
		var inspect=Art.Native.HintButton.new()
		inspect.set_meta("sheet_icon",entry[2]); inspect.set_meta("sheet_title",entry[0])
		inspect.flat=true; inspect.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
		inspect.accessibility_name=entry[0]+" "+entry[1]+". Consultar modificadores"
		inspect.tooltip_text=explanation
		inspect.pressed.connect(func(): _show_detail(entry[0]+" · "+entry[1],explanation))
		var outline=StyleBoxFlat.new()
		outline.bg_color=Color.TRANSPARENT; outline.border_color=Art.RED; outline.set_border_width_all(2)
		inspect.add_theme_stylebox_override("focus",outline)
		p.add_child(inspect)
func _hp_card(hp_text: String) -> PanelContainer:
	var p=Art.Native.HintPanel.new(); p.name="SheetHPCard"; p.set_meta("sheet_icon","heart"); p.set_meta("sheet_title","Puntos de golpe"); p.size_flags_horizontal=Control.SIZE_EXPAND_FILL; p.custom_minimum_size=Vector2(200,84)
	var inset=StyleBoxEmpty.new(); inset.content_margin_left=19; inset.content_margin_right=19; inset.content_margin_top=10; inset.content_margin_bottom=12; p.add_theme_stylebox_override("panel",inset)
	var backing=HPFinish.Backing.new(); p.add_child(backing); p.resized.connect(backing.queue_redraw)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",8); p.add_child(row)
	var heart=HPFinish.Heart.new(); heart.name="SheetHPHeart"; heart.custom_minimum_size=Vector2(49,49); heart.size_flags_vertical=Control.SIZE_SHRINK_CENTER; heart.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; heart.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; heart.mouse_filter=Control.MOUSE_FILTER_IGNORE; row.add_child(heart)
	var box=VBoxContainer.new(); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; box.add_theme_constant_override("separation",-2); row.add_child(box)
	var title=W.label("Puntos de golpe",16,true,Color("#fff0d3")); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; box.add_child(title)
	var values=HBoxContainer.new(); values.alignment=BoxContainer.ALIGNMENT_CENTER; values.add_theme_constant_override("separation",5); box.add_child(values)
	var value=W.label(hp_text,32,true,Color("#fff8e8")); value.name="SheetStat_heart"; value.add_theme_color_override("font_shadow_color",Color("#210206")); value.add_theme_constant_override("shadow_offset_y",2); values.add_child(value)
	if int(data.get("temp_hp",0))>0:
		var temp=W.label("+%d temp." % int(data.temp_hp),15,true,Color("#c7eee5")); temp.tooltip_text="Puntos de golpe temporales"; temp.mouse_filter=Control.MOUSE_FILTER_PASS; values.add_child(temp)
	var bar=ProgressBar.new(); bar.name="SheetHPBar"; bar.max_value=maxi(1,int(data.hp_max)); bar.value=clampi(int(data.hp),0,int(data.hp_max)); bar.show_percentage=false; bar.custom_minimum_size.y=10; bar.add_theme_stylebox_override("background",StyleBoxEmpty.new()); bar.add_theme_stylebox_override("fill",StyleBoxEmpty.new()); box.add_child(bar)
	bar.accessibility_name="Puntos de golpe actuales"
	var gloss=HPFinish.LifeBar.new(); bar.add_child(gloss); bar.resized.connect(gloss.queue_redraw); bar.value_changed.connect(func(_value): gloss.queue_redraw())
	var hp_exp="PG actuales %d de %d máximos.%s" % [int(data.get("hp",0)),int(data.get("hp_max",0))," PG temporales activos: +%d (absorben daño antes que los PG normales)." % int(data.temp_hp) if int(data.get("temp_hp",0))>0 else " Sin PG temporales activos."]
	p.tooltip_text="%s puntos de golpe%s" % [hp_text," · +%d temporales" % int(data.temp_hp) if int(data.get("temp_hp",0))>0 else ""]
	var hp_inspect=Art.Native.HintButton.new(); hp_inspect.flat=true; hp_inspect.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	hp_inspect.set_meta("sheet_icon","heart"); hp_inspect.set_meta("sheet_title","Puntos de golpe")
	hp_inspect.tooltip_text=hp_exp; hp_inspect.accessibility_name="Puntos de golpe "+hp_text+". Consultar detalle"
	hp_inspect.pressed.connect(func(): _show_detail("Puntos de golpe · "+hp_text,hp_exp,"heart"))
	var hp_focus=StyleBoxFlat.new(); hp_focus.bg_color=Color.TRANSPARENT; hp_focus.border_color=Color("#f3d286"); hp_focus.set_border_width_all(2)
	hp_inspect.add_theme_stylebox_override("focus",hp_focus)
	p.add_child(hp_inspect)
	return p
func _section(title: String,icon: String="book",weight: float=1.0) -> VBoxContainer:
	var p=W.surface(10); p.size_flags_horizontal=Control.SIZE_EXPAND_FILL; p.size_flags_stretch_ratio=weight; section_host.add_child(p)
	var box=VBoxContainer.new(); box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; box.add_theme_constant_override("separation",6); p.add_child(box); W.heading(box,title,icon); return box
func _summary() -> void:
	Summary.new().build(self)



func _row() -> void:
	var row=VBoxContainer.new() if stacked else HBoxContainer.new(); row.add_theme_constant_override("separation",10); row.size_flags_horizontal=Control.SIZE_EXPAND_FILL; content.add_child(row); section_host=row
	if not stacked: row.size_flags_vertical=Control.SIZE_EXPAND_FILL
func _scroll_body(parent: Node, pane_name: String, minimum: int=120) -> VBoxContainer:
	var pane=ScrollContainer.new()
	pane.name=pane_name
	pane.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	pane.vertical_scroll_mode=ScrollContainer.SCROLL_MODE_RESERVE
	pane.custom_minimum_size.y=minimum
	pane.size_flags_vertical=Control.SIZE_EXPAND_FILL
	pane.follow_focus=true
	parent.add_child(pane)
	W.style_scroll(pane)
	var rows=VBoxContainer.new()
	rows.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	rows.add_theme_constant_override("separation",6)
	pane.add_child(rows)
	return rows
func _attributes(parent: Node) -> void:
	var composer=Summary.new(); composer.sheet=self; composer.data=data; composer.attributes(parent)
func _actions(parent: Node,all: bool=true,maximum: int=0) -> void:
	var count=0
	var seen: Dictionary={}
	var actions: Array=[]
	var source_list: Array=data.actions
	if tab=="combat":
		for cost in ["action","bonus","reaction","free","other"]:
			for action in source_list:
				var action_cost=str(action.get("actionCost","action"))
				if action_cost==cost or (cost=="other" and action_cost not in ["action","bonus","reaction","free"]):
					var dedup=str(action.get("id","")) if not str(action.get("id","")).is_empty() else Model.normalized(str(action.get("label","")))
					if not seen.has(dedup): seen[dedup]=true; actions.append(action)
	else:
		actions=source_list
	if tab=="combat" and not actions.is_empty():
		var valid_sel=false
		for a in actions:
			if str(a.get("id",""))==combat_selection and not combat_selection.is_empty(): valid_sel=true; break
		if not valid_sel: combat_selection=str(actions[0].get("id",""))
	for action in actions:
		if not all and Model.is_spell(action) and not action.has("damageDice"): continue
		if maximum>0 and count>=maximum: break
		_action_row(parent,action,count); count+=1
	if maximum>0 and data.actions.size()>count:
		var more=Art.button("Ver todas las acciones  ›"); more.pressed.connect(func(): open_action_book()); parent.add_child(more)
func _action_row(parent: Node,action: Dictionary,index: int=0) -> void:
	var f=Model.action_fields(action,data)
	var act_id=str(action.get("id",""))
	var is_selected=tab=="combat" and not act_id.is_empty() and act_id==combat_selection
	var b=W.button("",is_selected,16); b.custom_minimum_size.y=36; b.name="CombatAction_"+(act_id if not act_id.is_empty() else str(index))
	b.accessibility_name=f.name; b.set_meta("sheet_icon",Art.action_icon(action)); b.set_meta("sheet_detail",true)
	b.set_meta("combat_action_id",act_id)
	if not is_selected: W.stripe(b,index)
	else:
		var sel_s=b.get_theme_stylebox("normal").duplicate(); sel_s.bg_color=Color("#6b2629"); sel_s.border_color=Color("#d4a44c"); sel_s.set_border_width_all(1); b.add_theme_stylebox_override("normal",sel_s)
	var reason=str(ui.combat_controller.rules.availability(str(data.id),action)) if not act_id.is_empty() else "Solo consulta"
	var roll_text="Impacto auto." if f.roll=="Sin d20" else f.roll
	b.tooltip_text=f.name+"\n"+f.type+" · "+f.range+" · "+roll_text+"\n"+f.effect+("\n"+reason if not reason.is_empty() else "")
	var row=HBoxContainer.new(); row.mouse_filter=Control.MOUSE_FILTER_IGNORE; row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); row.offset_left=5; row.offset_right=-6; row.offset_top=2; row.offset_bottom=-2; row.add_theme_constant_override("separation",6); b.add_child(row)
	var txt_col=Art.IVORY if is_selected else Art.INK
	var sub_col=Color("#f5dec0") if is_selected else Art.MUTED
	var id_box=HBoxContainer.new(); id_box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; id_box.size_flags_stretch_ratio=2.05; id_box.add_theme_constant_override("separation",6); row.add_child(id_box)
	id_box.add_child(W.icon_tile(Art.action_icon(action),26))
	var name_lbl=W.label(f.name,16,true,txt_col); name_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; name_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; id_box.add_child(name_lbl)
	var type_lbl=W.label(f.type,14,f.type in ["Reacción","Adicional"],Color("#ffd996") if is_selected and f.type in ["Reacción","Adicional"] else Art.RED if not is_selected and f.type in ["Reacción","Adicional"] else txt_col)
	type_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; type_lbl.size_flags_stretch_ratio=1.28; type_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(type_lbl)
	var reach=f.range+(" · Conc." if f.duration=="Concentración" else "")
	var reach_lbl=W.label(reach,14,false,txt_col); reach_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; reach_lbl.size_flags_stretch_ratio=1.18; reach_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(reach_lbl)
	var roll_lbl=W.label(roll_text,14,true,txt_col); roll_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; roll_lbl.size_flags_stretch_ratio=1.18; roll_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(roll_lbl)
	var eff_lbl=W.label(f.effect,14,false,txt_col); eff_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; eff_lbl.size_flags_stretch_ratio=2.15; eff_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(eff_lbl)
	var uses_text="—" if f.uses.is_empty() else f.uses
	var uses_lbl=W.label(uses_text,14,not reason.is_empty(),Color("#ffb8a8") if is_selected and not reason.is_empty() else Art.RED if not is_selected and not reason.is_empty() else sub_col)
	uses_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; uses_lbl.size_flags_stretch_ratio=0.86; uses_lbl.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; uses_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(uses_lbl)
	b.pressed.connect(func():
		if tab=="combat" and is_instance_valid(combat_inspector):
			combat_selection=act_id
			_update_combat_inspector(action)
			_highlight_combat_row()
		else: show_action(action)
	)
	parent.add_child(b)
func _highlight_combat_row() -> void:
	var pane=content.find_child("SheetCombatActions",true,false)
	if not pane: return
	var rows=pane.get_child(0)
	if not rows: return
	for i in range(rows.get_child_count()):
		var b=rows.get_child(i)
		if not b is Button or not b.has_meta("combat_action_id"): continue
		var act_id=str(b.get_meta("combat_action_id",""))
		var selected=not act_id.is_empty() and act_id==combat_selection
		if selected:
			var sel_s=b.get_theme_stylebox("normal").duplicate(); sel_s.bg_color=Color("#6b2629"); sel_s.border_color=Color("#d4a44c"); sel_s.set_border_width_all(1); b.add_theme_stylebox_override("normal",sel_s)
		else:
			var norm=W.button("",false,16); W.stripe(norm,i); b.add_theme_stylebox_override("normal",norm.get_theme_stylebox("normal")); norm.free()
		for lbl in b.find_children("*","Label",true,false):
			lbl.add_theme_color_override("font_color",Art.IVORY if selected else Art.INK)
func _update_combat_inspector(action: Dictionary) -> void:
	if not is_instance_valid(combat_inspector): return
	_clear(combat_inspector)
	if action.is_empty():
		combat_inspector.add_child(W.wrapped("Selecciona una acción de la lista para ver sus requisitos y prepararla.",15))
		return
	var f=Model.action_fields(action,data)
	var act_id=str(action.get("id",""))
	var head=HBoxContainer.new(); head.add_theme_constant_override("separation",8); combat_inspector.add_child(head)
	head.add_child(W.icon_tile(Art.action_icon(action),30))
	var tcol=VBoxContainer.new(); tcol.size_flags_horizontal=Control.SIZE_EXPAND_FILL; tcol.add_theme_constant_override("separation",0); head.add_child(tcol)
	tcol.add_child(W.label(f.name,18,true))
	tcol.add_child(W.label("%s · %s · %s" % [f.type,f.target,f.range],13,false,Art.MUTED))
	if not f.uses.is_empty():
		var pill=W.label(f.uses,14,true,Art.RED); pill.size_flags_vertical=Control.SIZE_SHRINK_CENTER; head.add_child(pill)
	var desc=str(action.get("guidance",f.effect))
	var dl=W.wrapped(desc,14); dl.max_lines_visible=2; dl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; combat_inspector.add_child(dl)
	var reason=str(ui.combat_controller.rules.availability(str(data.id),action)) if not act_id.is_empty() else "Solo consulta"
	if ui.current_role=="dm" and ui.combat_controller.rules.active and ui.combat_controller.acting_id()!=str(data.id): reason="La miniatura consultada no es la que actúa."
	if not reason.is_empty():
		var rl=W.label(reason,13,true,Art.RED); rl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; combat_inspector.add_child(rl)
	var btns=HBoxContainer.new(); btns.add_theme_constant_override("separation",6); combat_inspector.add_child(btns)
	if not act_id.is_empty():
		var use=W.primary_button("Usar / Preparar",Art.action_icon(action),15); use.custom_minimum_size.y=30; use.disabled=not reason.is_empty(); use.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		use.pressed.connect(func():
			if ui.current_role=="dm" and not ui.combat_controller.rules.active: ui.combat_controller._acting_override=str(data.id)
			close_callback.call(); ui.combat_controller.choose_action(act_id)
		)
		btns.add_child(use)
	var more=W.button("Detalle",false,15); more.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; more.custom_minimum_size=Vector2(76,30); more.pressed.connect(func(): show_action(action)); btns.add_child(more)
	var book=W.button("Libro  ›",false,15); book.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; book.custom_minimum_size=Vector2(82,30); book.pressed.connect(func(): open_action_book()); btns.add_child(book)
func _skills(parent: Node,include_saves: bool=true) -> void:
	var legend=HFlowContainer.new(); legend.add_theme_constant_override("h_separation",6); legend.add_theme_constant_override("v_separation",2); parent.add_child(legend)
	for state in [[-1,"Sin reg."],[1,"Comp."],[2,"Pericia"]]:
		var entry=HBoxContainer.new(); entry.add_theme_constant_override("separation",3); legend.add_child(entry); var seal=W.Paint.RankSeal.new(); seal.custom_minimum_size=Vector2(17,17); seal.rank=state[0]; entry.add_child(seal); entry.add_child(W.label(state[1],13))
	var list=_scroll_body(parent,"SheetSkillsScroll",140 if include_saves or stacked else 112)
	list.add_theme_constant_override("separation",2)
	for skill in Model.SKILLS:
		var base=Model.modifier(int(data.get("abilities",{}).get(skill[1],10))); var rank=Model.rank(data,skill[0],base); var bonus=Model.skill_bonus(data,skill[0],skill[1])
		var b=W.skill_row(skill[0],skill[1],bonus,rank); b.name="DetailedSkill_"+skill[0]; b.tooltip_text="Competencia no registrada: modificador base" if rank<0 else "Bonificador total registrado"; list.add_child(b)
		b.pressed.connect(func(): _check(skill[0],bonus,"Habilidad · "+skill[1],rank>=0))
	if not include_saves: return
	W.heading(parent,"Salvaciones","shield",19)
	var saves=GridContainer.new(); saves.columns=3; saves.add_theme_constant_override("h_separation",4); saves.add_theme_constant_override("v_separation",4); parent.add_child(saves)
	for ability in Model.ABILITIES:
		var base=Model.modifier(int(data.get("abilities",{}).get(ability,10))); var confirmed=data.get("saves",{}).has(Model.ABILITIES[ability]); var bonus=int(data.get("saves",{}).get(Model.ABILITIES[ability],base)); var b=W.button(ability+" "+Model.signed(bonus)); b.add_theme_font_size_override("font_size",16); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; saves.add_child(b); b.pressed.connect(func(): _check("Salvación "+ability,bonus,"Salvación",confirmed))
func _resources(parent: Node) -> void:
	var resources: Dictionary=data.get("resources",{})
	for key in resources: W.slot_row(parent,str(key),resources[key])
	if not str(data.get("concentration","")).is_empty(): parent.add_child(W.wrapped("Concentración · "+str(data.concentration)))
	var conditions: Array=data.get("conditions",[])
	if not conditions.is_empty(): parent.add_child(W.wrapped("Estados · "+Model.condition_text(data)))
	if resources.is_empty() and str(data.get("concentration","")).is_empty(): parent.add_child(W.wrapped("Sin recursos limitados registrados.",15))
func _magic(parent: Node) -> void:
	var groups=Model.spell_groups(data)
	var shown=0
	var id=str(data.id)
	var query=Model.normalized(str(spell_query.get(id,"")))
	var selected_level=int(spell_level.get(id,-1))
	for group in groups:
		var matches: Array=groups[group].filter(func(spell):
			return (query.is_empty() or Model.normalized(str(spell.name)+" "+str(spell.get("detail",""))).contains(query)) and (selected_level<0 or int(spell.get("level",-1))==selected_level)
		)
		if matches.is_empty(): continue
		shown+=matches.size()
		var section_title=group+" ("+str(matches.size())+")"
		if group=="Repertorio": section_title="Conjuros del repertorio ("+str(matches.size())+")"
		W.heading(parent,section_title,"magic" if group=="Trucos" else "spellbook",18)
		if group=="Repertorio":
			var note=W.label("Preparación sin registrar en ficha base · Puedes marcar preparados desde el inspector.",13,false,Art.MUTED)
			parent.add_child(note)
		var list_box=VBoxContainer.new(); list_box.add_theme_constant_override("separation",4); parent.add_child(list_box)
		for spell in matches: _spell_card(list_box,spell)
	if shown==0: parent.add_child(W.wrapped("Ningún conjuro coincide con la búsqueda o el filtro activo.",17))
	elif shown<=6:
		var spacer=Control.new(); spacer.size_flags_vertical=Control.SIZE_EXPAND_FILL; parent.add_child(spacer)
		var art=W.Landscape.new(); art.theme_key="ruins"; art.align_x=.5; art.edge_softness=.22; art.custom_minimum_size=Vector2(200,74); art.opacity=.68; parent.add_child(art)
func _magic_resources(parent: Node) -> void:
	var bar=HBoxContainer.new(); bar.name="SheetSpellOverview"; bar.add_theme_constant_override("separation",10); parent.add_child(bar)
	for field in [["CD de conjuro",["CD","save_dc","saveDC"],"casting"],["Ataque de conjuro",["Ataque","attack_bonus","attackBonus"],"wand"]]:
		for key in field[1]:
			if not data.get("casting",{}).has(key): continue
			W.magic_stat(bar,field[0],str(data.casting[key]),field[2]); break
	var slots_card=W.secondary(6); slots_card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bar.add_child(slots_card)
	var slots_box=VBoxContainer.new(); slots_box.add_theme_constant_override("separation",2); slots_card.add_child(slots_box)
	slots_box.add_child(W.label("Espacios de conjuro",13,true))
	if data.get("resources",{}).is_empty(): slots_box.add_child(W.label("Sin espacios registrados",14,false,Art.MUTED))
	else:
		for key in data.get("resources",{}): W.slot_row(slots_box,str(key),data.resources[key])
	if not str(data.get("concentration","")).is_empty():
		var conc_row=HBoxContainer.new(); conc_row.add_theme_constant_override("separation",8); parent.add_child(conc_row)
		conc_row.add_child(W.image("concentration",19))
		var cl=W.label("Concentración activa · "+str(data.concentration),15,true,Art.RED); cl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; conc_row.add_child(cl)
		var end_c=W.button("Terminar",false,14); end_c.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; end_c.custom_minimum_size=Vector2(86,26); end_c.pressed.connect(func(): ui.combat_controller._basic("end-concentration"); refresh_view()); conc_row.add_child(end_c)
	if not data.get("conditions",[]).is_empty(): parent.add_child(W.label("Estados · "+Model.condition_text(data),15,true,Art.RED))
func _spell_card(parent: Node,spell: Dictionary,brief: bool=false) -> void:
	var action: Dictionary=spell.get("action",{}); var f=Model.action_fields(action,data) if not action.is_empty() else {}
	var meta=Model.spell_metadata(spell,action)
	var norm_name=Model.normalized(str(spell.name))
	var selected=(norm_name==spell_selection)
	var card=PanelContainer.new(); card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; card.set_meta("spell_card_key",norm_name); parent.add_child(card)
	var st=StyleBoxFlat.new()
	st.bg_color=Color("#f3dc9e",.85) if selected else Color("#f4e5c8",.34)
	st.border_color=Color("#b97c2b") if selected else Color("#a17c43",.5)
	st.set_border_width_all(2 if selected else 1); st.set_corner_radius_all(4)
	st.content_margin_left=6; st.content_margin_right=8; st.content_margin_top=3; st.content_margin_bottom=3
	card.add_theme_stylebox_override("panel",st)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",8); card.add_child(row)
	var icon_key=Art.action_icon(action) if not action.is_empty() else Art.action_icon(spell)
	row.add_child(W.icon_tile(icon_key,30))
	var mid=VBoxContainer.new(); mid.size_flags_horizontal=Control.SIZE_EXPAND_FILL; mid.add_theme_constant_override("separation",0); row.add_child(mid)
	var title=W.button(str(spell.get("name","Conjuro")),false,18); title.add_theme_font_override("font",W.font(true)); title.alignment=HORIZONTAL_ALIGNMENT_LEFT; title.size_flags_horizontal=Control.SIZE_EXPAND_FILL; title.custom_minimum_size.y=26
	for state in ["normal","hover","pressed","disabled","focus"]:
		var bs=StyleBoxEmpty.new(); bs.content_margin_left=2; bs.content_margin_right=2; title.add_theme_stylebox_override(state,bs)
		title.add_theme_color_override("font_"+state+"_color",Art.RED if selected else Art.INK)
	title.add_theme_color_override("font_color",Art.RED if selected else Art.INK)
	title.set_meta("sheet_icon",icon_key); title.set_meta("action_id",str(action.get("id",""))); title.set_meta("spell_choice",norm_name)
	title.tooltip_text=title.text+"\n"+str(meta.get("effect",spell.get("detail","")))
	title.toggle_mode=not stacked
	title.set_pressed_no_signal(selected)
	title.pressed.connect(func():
		if is_instance_valid(spell_inspector) and tab=="spells" and not stacked: _inspect_spell(spell)
		else: show_action(action,spell)
	)
	mid.add_child(title)
	if not f.is_empty():
		var parts=PackedStringArray([f.range])
		if f.roll!="—": parts.append("Impacto auto." if f.roll=="Sin d20" else (("Ataque " if f.roll_kind=="attack" else "")+f.roll))
		parts.append(f.effect)
		var effect_lbl=W.label(" · ".join(parts),14,false,Art.MUTED); effect_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; mid.add_child(effect_lbl)
	elif not brief:
		var det_lbl=W.label(str(spell.get("detail","")),14,false,Art.MUTED); det_lbl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; mid.add_child(det_lbl)
	var right_col=VBoxContainer.new(); right_col.alignment=BoxContainer.ALIGNMENT_CENTER; right_col.add_theme_constant_override("separation",1); row.add_child(right_col)
	var lvl_text="Truco" if meta.level==0 or (not f.is_empty() and f.type=="Truco") else "Nv. "+str(meta.level) if meta.level>0 else (f.type if not f.is_empty() else "")
	if not lvl_text.is_empty():
		var lvl_lbl=W.label(lvl_text,14,true,Art.RED if selected else Art.INK); lvl_lbl.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; right_col.add_child(lvl_lbl)
	var tags=PackedStringArray()
	if meta.ritual: tags.append("Ritual")
	if meta.concentration: tags.append("Conc.")
	if spell.has("prepared"): tags.append("Preparado" if spell.prepared else "No prep.")
	if not tags.is_empty():
		var tag_lbl=W.label(" · ".join(tags),12,false,Art.MUTED); tag_lbl.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; right_col.add_child(tag_lbl)
func _features(parent: Node,maximum: int=0) -> void:
	var entries=Model.feature_entries(data); var count=0; var category=""
	for feature in entries:
		if maximum>0 and count>=maximum: break
		if feature.category!=category:
			var caption=HBoxContainer.new(); parent.add_child(caption); caption.add_child(W.image(Icons.feature(feature),20)); caption.add_child(W.label(feature.category,19,true)); category=feature.category
		var b=W.button(feature.name,false,20); b.add_theme_font_override("font",W.font()); b.alignment=HORIZONTAL_ALIGNMENT_LEFT; parent.add_child(b)
		b.pressed.connect(func(): _show_detail(feature.name,feature.description))
		if maximum==0 and feature.description!=feature.name: parent.add_child(W.wrapped(feature.description,17))
		count+=1
	if maximum>0 and entries.size()>count:
		var more=W.button("Leer todos los rasgos  ›"); more.pressed.connect(func(): select_tab("history")); parent.add_child(more)
func _combat() -> void:
	_row()
	var left_col=VBoxContainer.new(); left_col.size_flags_horizontal=Control.SIZE_EXPAND_FILL; left_col.size_flags_vertical=Control.SIZE_EXPAND_FILL; left_col.size_flags_stretch_ratio=1.02; left_col.add_theme_constant_override("separation",8); section_host.add_child(left_col)
	var prev_host=section_host
	section_host=left_col
	var top_left=_section("Defensas y atributos","shield",1.0)
	top_left.get_parent().size_flags_vertical=Control.SIZE_FILL
	var ab_box=VBoxContainer.new(); ab_box.add_theme_constant_override("separation",2); top_left.add_child(ab_box)
	_attributes(ab_box)
	for key in data.get("resources",{}): W.slot_row(top_left,str(key),data.resources[key])
	var bot_left=_section("Acciones generales","speed",1.0)
	bot_left.get_parent().size_flags_vertical=Control.SIZE_EXPAND_FILL
	var gen_scroll=_scroll_body(bot_left,"SheetCombatBasics",96)
	var general=GridContainer.new(); general.columns=2; general.add_theme_constant_override("h_separation",5); general.add_theme_constant_override("v_separation",4); general.size_flags_horizontal=Control.SIZE_EXPAND_FILL; gen_scroll.add_child(general)
	for key in Model.Catalogue.BASIC:
		var b=W.button(str(Model.Catalogue.BASIC[key]),false,15); b.custom_minimum_size.y=28; b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; b.icon=W.symbol(Art.action_icon({"id":key})); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",19); b.tooltip_text=str(Model.Catalogue.BASIC[key])+"\n"+BASIC_HELP.get(key,b.text); b.set_meta("sheet_icon",Art.action_icon({"id":key})); b.pressed.connect(func(): close_callback.call(); ui.combat_controller._basic(key)); general.add_child(b)
	var mid_col=VBoxContainer.new(); mid_col.size_flags_horizontal=Control.SIZE_EXPAND_FILL; mid_col.size_flags_vertical=Control.SIZE_EXPAND_FILL; mid_col.size_flags_stretch_ratio=2.05; mid_col.add_theme_constant_override("separation",8); prev_host.add_child(mid_col)
	section_host=mid_col
	var actions_panel=_section("Acciones disponibles","sword",1.75)
	actions_panel.get_parent().size_flags_vertical=Control.SIZE_EXPAND_FILL; actions_panel.get_parent().size_flags_stretch_ratio=1.65
	var hdr_plate=W.secondary(3); actions_panel.add_child(hdr_plate)
	var hdr=HBoxContainer.new(); hdr.add_theme_constant_override("separation",6); hdr_plate.add_child(hdr)
	for col in [["Acción",2.05],["Tipo",1.28],["Alcance",1.18],["Ataque/CD",1.18],["Daño / Efecto",2.15],["Usos",0.86]]:
		var cl=W.label(col[0],15,true); W.type_role(cl,"column"); cl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; cl.size_flags_stretch_ratio=col[1]; cl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
		if col[0]=="Usos": cl.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT
		hdr.add_child(cl)
	var act_list=_scroll_body(actions_panel,"SheetCombatActions",140)
	act_list.add_theme_constant_override("separation",2)
	_actions(act_list)
	var bottom_mid=_section("Reacciones y condiciones","shield",1.0)
	bottom_mid.get_parent().size_flags_vertical=Control.SIZE_EXPAND_FILL; bottom_mid.get_parent().size_flags_stretch_ratio=1.0
	var react_split=HBoxContainer.new(); react_split.add_theme_constant_override("separation",10); react_split.size_flags_vertical=Control.SIZE_EXPAND_FILL; bottom_mid.add_child(react_split)
	var sel_card=W.secondary(8); sel_card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; sel_card.size_flags_stretch_ratio=1.25; react_split.add_child(sel_card)
	combat_inspector=VBoxContainer.new(); combat_inspector.add_theme_constant_override("separation",4); sel_card.add_child(combat_inspector)
	var initial_action={}
	for a in data.actions:
		if str(a.get("id",""))==combat_selection: initial_action=a; break
	if initial_action.is_empty() and not data.actions.is_empty(): initial_action=data.actions[0]
	_update_combat_inspector(initial_action)
	var cond_card=W.secondary(8); cond_card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; cond_card.size_flags_stretch_ratio=1.0; react_split.add_child(cond_card)
	var cond_box=VBoxContainer.new(); cond_box.add_theme_constant_override("separation",4); cond_card.add_child(cond_box)
	var conc_head=HBoxContainer.new(); conc_head.add_theme_constant_override("separation",6); cond_box.add_child(conc_head)
	conc_head.add_child(W.image("concentration",20))
	conc_head.add_child(W.label("Concentración y estados",16,true))
	var conc=str(data.get("concentration",""))
	if not conc.is_empty():
		var clbl=W.wrapped("Activo: "+conc,15); clbl.add_theme_color_override("font_color",Art.RED); cond_box.add_child(clbl)
		var end_c=W.button("Terminar concentración",false,14); end_c.custom_minimum_size.y=26; end_c.pressed.connect(func(): ui.combat_controller._basic("end-concentration"); refresh_view()); cond_box.add_child(end_c)
	else:
		cond_box.add_child(W.wrapped("Sin concentración activa.",14))
	var conds=Model.condition_text(data)
	cond_box.add_child(W.wrapped("Estados: "+conds if not conds.is_empty() else "Sin condiciones alteradas.",14))
	if data.get("combat_active",false):
		var econ="Acción: %s · Adicional: %s · Reacción: %s" % ["gastada" if data.get("action_used",false) else "libre","gastada" if data.get("bonus_used",false) else "libre","gastada" if data.get("reaction_used",false) else "libre"]
		cond_box.add_child(W.wrapped(econ,13))
	var combat_ink=W.Landscape.new(); combat_ink.theme_key="mountains"; combat_ink.fill_cover=true; combat_ink.opacity=.78; combat_ink.align_x=.5; combat_ink.align_y=.74; combat_ink.edge_softness=.26; combat_ink.custom_minimum_size=Vector2(200,30); bottom_mid.add_child(combat_ink)
	var right_col=VBoxContainer.new(); right_col.size_flags_horizontal=Control.SIZE_EXPAND_FILL; right_col.size_flags_vertical=Control.SIZE_EXPAND_FILL; right_col.size_flags_stretch_ratio=1.08; right_col.add_theme_constant_override("separation",8); prev_host.add_child(right_col)
	section_host=right_col
	var skills_panel=_section("Pruebas y habilidades","die",1.0)
	skills_panel.get_parent().size_flags_vertical=Control.SIZE_EXPAND_FILL
	_skills(skills_panel,false)
	var saves_panel=_section("Salvaciones","shield",1.0)
	saves_panel.get_parent().size_flags_vertical=Control.SIZE_FILL
	var saves=GridContainer.new(); saves.columns=3; saves.add_theme_constant_override("h_separation",5); saves.add_theme_constant_override("v_separation",4); saves_panel.add_child(saves)
	for ability in Model.ABILITIES:
		var base=Model.modifier(int(data.get("abilities",{}).get(ability,10))); var confirmed=data.get("saves",{}).has(Model.ABILITIES[ability]); var bonus=int(data.get("saves",{}).get(Model.ABILITIES[ability],base)); var b=W.button(ability+" "+Model.signed(bonus),false,16); b.custom_minimum_size.y=28; b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; b.tooltip_text="Salvación registrada" if confirmed else "Base; competencia pendiente"; saves.add_child(b); b.pressed.connect(func(): _check("Salvación "+ability,bonus,"Salvación",confirmed))
	section_host=prev_host
func _spells_page() -> void:
	_row()
	if data.spells.is_empty():
		var panel=_section("Recursos y capacidades","spellbook")
		var empty=_scroll_body(panel,"SheetNonCaster")
		empty.add_child(W.wrapped("Este personaje no tiene conjuros registrados.",19))
		_resources(empty)
		_features(empty)
		var actions=W.button("Ver acciones y recursos  ›",false,18); actions.pressed.connect(func(): select_tab("combat")); empty.add_child(actions)
		return
	var spells=_section("Repertorio mágico","magic",1.48)
	spells.get_parent().name="DetailedSpellRepertoire"
	_magic_resources(spells)
	var list=_scroll_body(spells,"SheetSpellList",185)
	_spell_filters(spells,list)
	_magic(list)
	if stacked: return
	var reference=_section("Conjuro seleccionado","spellbook",1.22)
	var reading=_scroll_body(reference,"SheetSpellReference")
	spell_inspector=VBoxContainer.new()
	spell_inspector.add_theme_constant_override("separation",8)
	reading.add_child(spell_inspector)
	var available=[]
	for group in Model.spell_groups(data).values(): available.append_array(group)
	var current: Dictionary=available[0]
	for spell in available:
		if Model.normalized(str(spell.name))==spell_selection: current=spell; break
	_inspect_spell(current)
	if not Model.feature_entries(data).is_empty():
		var traits=W.button("Rasgos mágicos y trasfondo  ›",false,15); traits.custom_minimum_size.y=26
		traits.pressed.connect(func(): select_tab("history"))
		reference.add_child(traits)
func _spell_filters(parent: Node,list: VBoxContainer) -> void:
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",6)
	parent.add_child(row)
	parent.move_child(row,list.get_parent().get_index())
	var id=str(data.id)
	var pills: Dictionary={}
	var levels=OptionButton.new()
	levels.accessibility_name="Filtrar por nivel"
	levels.add_item("Todos",0)
	levels.add_item("Trucos",1)
	for level in range(1,10): levels.add_item("Nv. "+str(level),level+1)
	levels.select(clampi(int(spell_level.get(id,-1))+1,0,10))
	var filter_changed=func():
		for k in pills: pills[k].set_pressed_no_signal(int(spell_level.get(id,-1))==k)
		_clear(list)
		_magic(list)
		list.get_parent().scroll_vertical=0
		_mark_selected_spell()
	for chip in [[-1,"Todos"],[0,"Trucos"],[1,"Nv. 1"]]:
		var cb=W.button(chip[1],int(spell_level.get(id,-1))==chip[0],14); cb.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; cb.toggle_mode=true; cb.custom_minimum_size=Vector2(ceilf(W.font().get_string_size(chip[1],HORIZONTAL_ALIGNMENT_LEFT,-1,14).x)+20,28); W.highlight_choice(cb); cb.set_pressed_no_signal(int(spell_level.get(id,-1))==chip[0])
		cb.pressed.connect(func(): spell_level[id]=chip[0]; levels.select(chip[0]+1); filter_changed.call())
		row.add_child(cb); pills[chip[0]]=cb
	var search=LineEdit.new()
	search.placeholder_text="Buscar conjuro..."; search.accessibility_name="Buscar conjuros"
	search.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	Art.style_field(search); search.text=str(spell_query.get(id,"")); row.add_child(search)
	row.add_child(levels)
	search.text_changed.connect(func(value): spell_query[id]=value; filter_changed.call())
	levels.item_selected.connect(func(index): spell_level[id]=index-1; filter_changed.call())
func _mark_selected_spell() -> void:
	var list=content.find_child("SheetSpellList",true,false)
	if not list: return
	for card in list.find_children("*","PanelContainer",true,false):
		if not card.has_meta("spell_card_key"): continue
		var selected=(str(card.get_meta("spell_card_key",""))==spell_selection)
		var st=card.get_theme_stylebox("panel").duplicate()
		st.bg_color=Color("#f3dc9e",.85) if selected else Color("#f4e5c8",.34)
		st.border_color=Color("#b97c2b") if selected else Color("#a17c43",.5)
		st.set_border_width_all(2 if selected else 1)
		card.add_theme_stylebox_override("panel",st)
	for button in list.find_children("*","Button",true,false):
		if button.has_meta("spell_choice"):
			var sel=(button.get_meta("spell_choice")==spell_selection)
			button.set_pressed_no_signal(sel)
			button.add_theme_color_override("font_color",Art.RED if sel else Art.INK)
func _toggle_spell_prepared(spell_name: String) -> void:
	var actor: Dictionary=ui.get_active_actor()
	if actor.is_empty(): return
	var target_key=Model.normalized(spell_name)
	var updated=false
	for sp in actor.get("spells",[]):
		if Model.normalized(str(sp.get("name","")))==target_key:
			sp["prepared"]=not bool(sp.get("prepared",false))
			updated=true; break
	if not updated:
		actor.spells.append({"name":spell_name,"prepared":true})
	ui.notify_mesa("Preparación actualizada: "+spell_name)
	signature=""; refresh_view()
func _inspect_spell(spell: Dictionary) -> void:
	spell_selection=Model.normalized(str(spell.name))
	_mark_selected_spell()
	_clear(spell_inspector)
	var action: Dictionary=spell.get("action",{})
	var meta=Model.spell_metadata(spell,action)
	var icon_key=Art.action_icon(action) if not action.is_empty() else Art.action_icon(spell)
	var name_row=HBoxContainer.new(); name_row.add_theme_constant_override("separation",10)
	spell_inspector.add_child(name_row)
	name_row.add_child(W.icon_tile(icon_key,44))
	var title_col=VBoxContainer.new(); title_col.size_flags_horizontal=Control.SIZE_EXPAND_FILL; title_col.add_theme_constant_override("separation",0); name_row.add_child(title_col)
	var heading=W.wrapped(str(spell.name),25); heading.add_theme_font_override("font",W.font(true)); title_col.add_child(heading)
	var school_part=(" de "+meta.school.to_lower()) if not meta.school.is_empty() else ""
	var sub_text=("Truco"+school_part) if meta.level==0 else ("Conjuro"+school_part+" de nivel "+str(meta.level)) if meta.level>0 else ("Conjuro"+school_part)
	if meta.ritual: sub_text+=" · Ritual"
	title_col.add_child(W.label(sub_text,15,false,Art.MUTED))
	var facts_card=W.secondary(10); spell_inspector.add_child(facts_card)
	var facts=VBoxContainer.new(); facts.add_theme_constant_override("separation",4); facts_card.add_child(facts)
	var f=Model.action_fields(action,data) if not action.is_empty() else {}
	var roll_str="Impacto automático" if f.get("roll","")=="Sin d20" else str(f.get("roll",""))
	var rows_data=[
		["Tiempo de lanzamiento",meta.casting_time if not meta.casting_time.is_empty() else (f.type if not f.is_empty() else "")],
		["Alcance",meta.range if not meta.range.is_empty() else str(f.get("range",""))],
		["Objetivo / Área",str(f.get("target",""))],
		["Duración",meta.duration if not meta.duration.is_empty() else str(f.get("duration",""))],
		["Concentración","Sí (requiere mantener concentración)" if meta.concentration else "No"],
		["Componentes",meta.components],
		["Tirada / Salvación",roll_str]
	]
	for entry in rows_data:
		var val=str(entry[1])
		if val.is_empty() or val=="—": continue
		var fr=HBoxContainer.new(); fr.add_theme_constant_override("separation",8); facts.add_child(fr)
		var kl=W.label(entry[0],15,true); kl.custom_minimum_size.x=155; fr.add_child(kl)
		fr.add_child(W.wrapped(val,15))
	if not f.is_empty() and not f.resource.is_empty():
		var r=f.resource
		var rr=HBoxContainer.new(); rr.add_theme_constant_override("separation",8); facts.add_child(rr)
		var rk=W.label("Recursos",15,true); rk.custom_minimum_size.x=155; rr.add_child(rk)
		rr.add_child(W.wrapped("%s · %d/%d disponibles" % [r.label,int(r.current),int(r.max)],15))
	var eff_title=HBoxContainer.new(); eff_title.add_theme_constant_override("separation",6); spell_inspector.add_child(eff_title)
	eff_title.add_child(W.image("star",17)); eff_title.add_child(W.label("Efecto",17,true))
	var eff_body=meta.effect if not meta.effect.is_empty() else str(spell.get("detail",""))
	if not eff_body.is_empty(): spell_inspector.add_child(W.wrapped(eff_body,16))
	if not meta.higher.is_empty():
		var hi_card=W.secondary(8); spell_inspector.add_child(hi_card)
		var hi_box=VBoxContainer.new(); hi_box.add_theme_constant_override("separation",2); hi_card.add_child(hi_box)
		hi_box.add_child(W.label("A niveles superiores",15,true))
		hi_box.add_child(W.wrapped(meta.higher,15))
	var reason=""
	if not action.is_empty() and not str(action.get("id","")).is_empty():
		reason=str(ui.combat_controller.rules.availability(str(data.id),action))
		if ui.current_role=="dm" and ui.combat_controller.rules.active and ui.combat_controller.acting_id()!=str(data.id): reason="La miniatura consultada no es la que actúa."
		if not reason.is_empty():
			var rl=W.wrapped(reason,14); rl.add_theme_color_override("font_color",Art.RED); spell_inspector.add_child(rl)
	var btn_row=HBoxContainer.new(); btn_row.add_theme_constant_override("separation",8); spell_inspector.add_child(btn_row)
	if meta.level>0 and Model.can_prepare_spells(data):
		var is_prep=bool(spell.get("prepared",false))
		var prep_btn=W.button("Quitar prep." if is_prep else "Preparar conjuro",is_prep,15); prep_btn.name="PrepareSpellBtn"; prep_btn.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; prep_btn.custom_minimum_size.y=34; prep_btn.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		prep_btn.disabled=bool(data.get("combat_active",false))
		prep_btn.tooltip_text="Cambiar preparación del conjuro (fuera de combate)" if not prep_btn.disabled else "No puedes cambiar conjuros preparados durante combate activo."
		prep_btn.pressed.connect(func(): _toggle_spell_prepared(str(spell.name)))
		btn_row.add_child(prep_btn)
	if not action.is_empty() and not str(action.get("id","")).is_empty():
		var cast_label="Lanzar ritual" if meta.ritual and f.resource.is_empty() else "Lanzar conjuro"
		var cast_btn=W.primary_button(cast_label,icon_key,16); cast_btn.name="CastSpellBtn"; cast_btn.custom_minimum_size.y=34; cast_btn.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		cast_btn.disabled=not reason.is_empty()
		cast_btn.pressed.connect(func():
			if ui.current_role=="dm" and not ui.combat_controller.rules.active: ui.combat_controller._acting_override=str(data.id)
			close_callback.call(); ui.combat_controller.choose_action(str(action.id))
		)
		btn_row.add_child(cast_btn)
	var details=W.button("Consultar acción  ›",false,15); details.custom_minimum_size.y=28
	details.pressed.connect(func(): show_action(action,spell))
	spell_inspector.add_child(details)
func _action_facts(parent: Node,action: Dictionary,spell: Dictionary) -> void:
	var f=Model.action_fields(action,data)
	for entry in [["Alcance",f.range],["Tirada",f.roll],["Efecto",f.effect],["Lanzamiento",action.get("castingTime",spell.get("casting_time",""))],["Duración",f.duration],["Concentración","Sí" if action.get("concentration",false) and not f.duration.to_lower().contains("concentración") else ""],["Componentes",spell.get("components",action.get("components",""))]]:
		var value=str(entry[1])
		if value.is_empty() or value=="—": continue
		parent.add_child(W.wrapped(str(entry[0])+" · "+value,17))
	if not f.resource.is_empty():
		var r=f.resource
		parent.add_child(W.wrapped(("%s · %d de %d disponibles" % [r.label,int(r.current),int(r.max)]),17))
func _history_page() -> void:
	var outer=VBoxContainer.new(); outer.name="HistoryEditorialPage"; outer.size_flags_horizontal=Control.SIZE_EXPAND_FILL; outer.size_flags_vertical=Control.SIZE_EXPAND_FILL; outer.add_theme_constant_override("separation",8); content.add_child(outer)
	W.heading(outer,"Crónica del aventurero","history",22,true)
	var cols: BoxContainer=VBoxContainer.new() if stacked else HBoxContainer.new()
	cols.size_flags_horizontal=Control.SIZE_EXPAND_FILL; cols.size_flags_vertical=Control.SIZE_EXPAND_FILL; cols.add_theme_constant_override("separation",10); outer.add_child(cols)
	var prev_host=section_host
	# Decorative tall architectural ink margin on desktop (matching Reference Image 2 left edge, GPU multiply).
	if not stacked and not compact:
		var arch_strip=W.Landscape.new()
		arch_strip.name="HistoryMarginEngraving"
		var margin_base:=W.Paint.ink_theme(data)
		arch_strip.theme_key="library" if margin_base=="library" else "ruins"
		arch_strip.fill_cover=true; arch_strip.align_x=.25 if margin_base=="library" else .35; arch_strip.align_y=.5; arch_strip.opacity=.78; arch_strip.edge_softness=.18
		arch_strip.custom_minimum_size=Vector2(118,240)
		arch_strip.size_flags_vertical=Control.SIZE_EXPAND_FILL
		cols.add_child(arch_strip)
	# Column 1: Identity & Origin
	var id_panel=W.surface(9); id_panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; id_panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; id_panel.size_flags_stretch_ratio=0.88; cols.add_child(id_panel)
	var id_scroll=_scroll_body(id_panel,"HistoryOriginScroll",140)
	id_scroll.add_theme_constant_override("separation",6)
	var id_parts=str(data.identity).split("·")
	var class_part=id_parts[0].strip_edges() if id_parts.size()>0 else str(data.get("class_line",""))
	var species_val=str(data.get("species",""))
	if species_val.is_empty():
		for candidate in ["Alto elfo","Enana de las colinas","Mediana piesligeros","Enana","Elfo","Mediana"]:
			if str(data.identity).to_lower().contains(candidate.to_lower()) or str(data.get("features",[])).to_lower().contains(candidate.to_lower()): species_val=candidate; break
	var subclass_val=str(data.get("subclass",""))
	if subclass_val.is_empty() and data.get("classes",[]) is Array:
		for cls in data.get("classes",[]):
			if cls is Dictionary and not str(cls.get("subclass","")).is_empty(): subclass_val=str(cls.subclass); break
	var feats_list: Array=data.get("feats",[])
	var feats_val="Sin dotes registradas"
	if not feats_list.is_empty():
		var fnames=PackedStringArray()
		for ft in feats_list: fnames.append(str(ft.get("name",ft)) if ft is Dictionary else str(ft))
		feats_val=", ".join(fnames)
	var origin_cards=[
		["Especie","leaf",species_val if not species_val.is_empty() else "Según ficha base"],
		["Clase","book","%s · Nivel %d" % [class_part,int(data.get("level",1))]],
		["Subclase","casting",subclass_val if not subclass_val.is_empty() else "Sin subclase registrada"],
		["Dotes","star",feats_val],
		["Trasfondo","history",str(data.get("background","Sin registrar"))]
	]
	for oc in origin_cards:
		var box=W.secondary(5); id_scroll.add_child(box)
		var vb=VBoxContainer.new(); vb.add_theme_constant_override("separation",2); box.add_child(vb)
		W.heading(vb,oc[0],oc[1],15)
		var vl=W.wrapped(oc[2],15); vl.add_theme_font_override("font",W.font(true)); vb.add_child(vl)
	# Column 2: Traits & Features (ScrollContainer named SheetChronicle for long-narrative tests)
	section_host=cols
	var traits_box=_section("Rasgos y características","star",1.24)
	traits_box.get_parent().size_flags_vertical=Control.SIZE_EXPAND_FILL
	var story=_scroll_body(traits_box,"SheetChronicle",160)
	story.add_theme_constant_override("separation",6)
	var groups: Dictionary={}
	var entries=Model.feature_entries(data)
	for feature in entries:
		if not groups.has(feature.category): groups[feature.category]=[]
		groups[feature.category].append(feature)
	for category in groups:
		var items: Array=groups[category]
		var rows=VBoxContainer.new(); rows.add_theme_constant_override("separation",4)
		if entries.size()>8:
			var section_key=str(data.id)+"/"+str(category)
			var button=W.button(str(category)+" ("+str(items.size())+")",true,17)
			button.alignment=HORIZONTAL_ALIGNMENT_LEFT; button.toggle_mode=true
			button.set_pressed_no_signal(bool(history_sections.get(section_key,true)))
			rows.visible=button.button_pressed
			button.toggled.connect(func(opened): history_sections[section_key]=opened; rows.visible=opened)
			story.add_child(button)
		else:
			var cat_head=HBoxContainer.new(); cat_head.add_theme_constant_override("separation",6); story.add_child(cat_head)
			cat_head.add_child(W.image(Icons.feature({"category":category}),18))
			cat_head.add_child(W.label(str(category),17,true,Art.RED))
		story.add_child(rows)
		for feature in items:
			var fcard=W.secondary(7); rows.add_child(fcard)
			var frow=HBoxContainer.new(); frow.add_theme_constant_override("separation",10); fcard.add_child(frow)
			frow.add_child(W.icon_tile(Icons.feature(feature),30))
			var fcol=VBoxContainer.new(); fcol.size_flags_horizontal=Control.SIZE_EXPAND_FILL; fcol.add_theme_constant_override("separation",1); frow.add_child(fcol)
			var title=W.button(str(feature.name),false,17); title.add_theme_font_override("font",W.font(true)); title.alignment=HORIZONTAL_ALIGNMENT_LEFT; title.custom_minimum_size.y=24
			for st_name in ["normal","hover","pressed","disabled","focus"]:
				var es=StyleBoxEmpty.new(); title.add_theme_stylebox_override(st_name,es)
			title.tooltip_text=feature.name+"\n"+feature.description+"\nPulsa para ver el rasgo completo."
			title.set_meta("sheet_icon",Icons.feature(feature)); title.set_meta("sheet_detail",true)
			title.pressed.connect(func(): _show_detail(feature.name,feature.description,Icons.feature(feature)))
			fcol.add_child(title)
			var explanation=str(feature.description) if feature.description!=feature.name else ""
			if not str(feature.uses).is_empty(): explanation+=(" · " if not explanation.is_empty() else "")+str(feature.uses)
			if not explanation.is_empty():
				var el=W.wrapped(explanation,15); el.max_lines_visible=3; el.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; fcol.add_child(el)
	for section in data.get("details",[]):
		W.divider(story); story.add_child(W.label(str(section.get("title","Detalles")),18,true,Art.RED))
		for entry in section.get("entries",[]): story.add_child(W.wrapped(str(entry),15))
	# Column 3: Inline Editable Personal Chronicle / Biography + GPU-Multiplied Ink Illustration
	var bio_panel=W.surface(10); bio_panel.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bio_panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; bio_panel.size_flags_stretch_ratio=1.18; cols.add_child(bio_panel)
	var bio_box=VBoxContainer.new(); bio_box.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bio_box.add_theme_constant_override("separation",6); bio_panel.add_child(bio_box)
	var bio_head_row=W.heading(bio_box,"Biografía","feather",20)
	var edit_bio_btn=W.button("Cerrar" if bio_editing else "Editar",false,14); edit_bio_btn.name="HistoryEditBioBtn"; edit_bio_btn.icon=W.symbol("feather"); edit_bio_btn.expand_icon=true; edit_bio_btn.add_theme_constant_override("icon_max_width",15); edit_bio_btn.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; edit_bio_btn.custom_minimum_size=Vector2(86,24)
	for st_name in ["normal","hover","pressed","focus"]:
		var es=StyleBoxFlat.new()
		es.bg_color=Color("#efddba") if st_name=="normal" else Color("#ffecc4") if st_name=="hover" else Color("#d9bd88")
		es.border_color=Color("#b68a42"); es.set_border_width_all(1); es.set_corner_radius_all(4)
		es.content_margin_left=7; es.content_margin_right=7; es.content_margin_top=1; es.content_margin_bottom=1
		edit_bio_btn.add_theme_stylebox_override(st_name,es)
		edit_bio_btn.add_theme_color_override("font_"+st_name+"_color",Art.INK)
	edit_bio_btn.add_theme_color_override("font_color",Art.INK)
	edit_bio_btn.tooltip_text="Editar biografía, motivaciones y notas del personaje"
	edit_bio_btn.pressed.connect(func(): bio_editing=not bio_editing; signature=""; refresh_view())
	bio_head_row.add_child(edit_bio_btn)
	var bio_scroll=_scroll_body(bio_box,"HistoryBioScroll",140)
	bio_scroll.add_theme_constant_override("separation",8)
	if bio_editing:
		var actor_id=str(data.id)
		var bio_inputs: Dictionary={}
		for field in [["history","Historia personal",108],["motivations","Motivaciones",64],["personal_notes","Notas personales",64]]:
			bio_scroll.add_child(W.label(field[1],15,true,Art.RED))
			var area=TextEdit.new(); area.name="HistoryBioInput_"+field[0]
			area.text=str(data.get(field[0],""))
			area.placeholder_text="Escribe aquí "+field[1].to_lower()+"..."
			area.accessibility_name=field[1]; area.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
			area.custom_minimum_size.y=field[2]
			area.add_theme_font_override("font",Art.font()); area.add_theme_font_size_override("font_size",16)
			area.add_theme_color_override("font_color",Art.INK); area.add_theme_color_override("font_placeholder_color",Color("#7a6244",.80)); area.add_theme_color_override("caret_color",Art.RED)
			var abox=StyleBoxFlat.new(); abox.bg_color=Color("#f3e3c2"); abox.border_color=Art.GOLD; abox.set_border_width_all(1); abox.set_corner_radius_all(4)
			for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: abox.set_content_margin(side,6)
			area.add_theme_stylebox_override("normal",abox)
			bio_scroll.add_child(area); bio_inputs[field[0]]=area
		var btn_bar=HBoxContainer.new(); btn_bar.add_theme_constant_override("separation",8); bio_scroll.add_child(btn_bar)
		var save_bio=W.primary_button("Guardar biografía","feather",16); save_bio.name="HistorySaveBioBtn"; save_bio.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		save_bio.pressed.connect(func():
			var actor: Dictionary=ui.get_active_actor()
			if actor.is_empty() or str(actor.get("id",""))!=actor_id: return
			for k in bio_inputs: actor[k]=bio_inputs[k].text.substr(0,8000)
			bio_editing=false; signature=""; ui.notify_mesa("Biografía guardada para "+str(actor.name)); ui.refresh_all(); refresh_view()
		)
		var cancel_bio=W.button("Cancelar",false,16); cancel_bio.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING; cancel_bio.custom_minimum_size=Vector2(96,36)
		cancel_bio.pressed.connect(func(): bio_editing=false; signature=""; refresh_view())
		btn_bar.add_child(save_bio); btn_bar.add_child(cancel_bio)
	else:
		var has_custom_bio=false
		for field in [["history","Historia personal"],["motivations","Motivaciones"],["personal_notes","Notas personales"]]:
			var body_txt=str(data.get(field[0],"")).strip_edges()
			if not body_txt.is_empty():
				if has_custom_bio: W.divider(bio_scroll)
				bio_scroll.add_child(W.label(field[1],17,true,Art.RED))
				bio_scroll.add_child(_drop_cap_paragraph(body_txt) if not has_custom_bio else W.wrapped(body_txt,16))
				has_custom_bio=true
		var campaign_notes=str(data.get("notes","")).strip_edges()
		if not campaign_notes.is_empty():
			if has_custom_bio: W.divider(bio_scroll)
			bio_scroll.add_child(W.label("Resumen de campaña",16,true))
			bio_scroll.add_child(_drop_cap_paragraph(campaign_notes) if not has_custom_bio else W.wrapped(campaign_notes,15))
		if not has_custom_bio:
			var empty_card=W.secondary(8); bio_scroll.add_child(empty_card)
			var empty_box=VBoxContainer.new(); empty_box.add_theme_constant_override("separation",4); empty_card.add_child(empty_box)
			empty_box.add_child(W.label("Crónica personal sin redactar",15,true,Art.MUTED))
			empty_box.add_child(W.wrapped("Pulsa «Editar» arriba para escribir la biografía, motivaciones y notas reales de este personaje.",14))
		var bio_spacer=Control.new(); bio_spacer.size_flags_vertical=Control.SIZE_EXPAND_FILL; bio_scroll.add_child(bio_spacer)
		W.divider(bio_scroll)
		var base_theme:=W.Paint.ink_theme(data)
		var right_theme:="keep" if base_theme=="library" else ("mountains" if base_theme=="temple" else base_theme)
		var illustration=W.Landscape.new(); illustration.name="HistoryInkDrawing"; illustration.theme_key=right_theme; illustration.opacity=.92; illustration.align_x=.5; illustration.edge_softness=.20; illustration.custom_minimum_size=Vector2(200,150 if compact else 188); illustration.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bio_scroll.add_child(illustration)
	section_host=prev_host
func _drop_cap_paragraph(text: String) -> Control:
	var trimmed=text.strip_edges()
	if trimmed.length()<2: return W.wrapped(trimmed,16)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",9)
	# Illuminated medieval drop cap (deep enamel teal/slate + carved double gold frame, inspired by Reference Image 2).
	var cap=PanelContainer.new(); cap.custom_minimum_size=Vector2(48,50); cap.size_flags_vertical=Control.SIZE_SHRINK_BEGIN
	var cs=StyleBoxFlat.new(); cs.bg_color=Color("#1f424a"); cs.border_color=Color("#d4a44c"); cs.set_border_width_all(2); cs.set_corner_radius_all(4)
	cs.shadow_color=Color("#2b1508",.42); cs.shadow_size=3; cs.shadow_offset=Vector2(1,2)
	cap.add_theme_stylebox_override("panel",cs)
	var cl=W.label(trimmed.substr(0,1).to_upper(),33,true,Color("#f8dc8c")); cl.add_theme_color_override("font_shadow_color",Color("#111f24")); cl.add_theme_constant_override("shadow_offset_y",2); cl.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; cl.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; cap.add_child(cl)
	row.add_child(cap)
	var rest=W.wrapped(trimmed.substr(1),16); rest.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(rest)
	return row
func _can_edit_values() -> bool:
	return ui.current_role=="dm"
func _edit_page() -> void:
	_row()
	var edits=_section("Editar valores de mesa","feather",1.25)
	var editable=_can_edit_values()
	edits.add_child(W.wrapped("Revisa los valores y pulsa Guardar cambios para aplicarlos a la mesa." if editable else "El DM puede ajustar la clase de armadura y la velocidad.",18))
	var fields: Dictionary={}
	var narrative_fields: Dictionary={}
	for entry in [["ac","Clase de armadura",5,30,1],["speed","Velocidad (m)",3,18,1.5]]:
		var field=W.secondary(12); edits.add_child(field)
		var row=HBoxContainer.new(); field.add_child(row)
		var info=VBoxContainer.new(); info.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(info)
		info.add_child(W.label(entry[1],21,true))
		if not editable:
			row.add_child(W.label(Model.meters(float(data.get(entry[0],0))),25,true))
			continue
		info.add_child(W.wrapped("Intervalo de mesa %s–%s" % [Model.meters(entry[2]),Model.meters(entry[3])],15))
		var base=float(data.get("base_"+entry[0],0))
		var spin=SpinBox.new(); spin.name="SheetEdit_"+entry[0]; spin.min_value=minf(entry[2],base); spin.max_value=maxf(entry[3],base); spin.step=entry[4]; spin.value=base; spin.custom_minimum_size.x=120; spin.size_flags_vertical=Control.SIZE_SHRINK_CENTER; row.add_child(spin)
		Art.style_field(spin.get_line_edit())
		spin.get_line_edit().set_meta("sheet_hint",str(entry[1])+" · Intro para confirmar el campo")
		spin.get_line_edit().accessibility_name=entry[1]
		fields[entry[0]]=spin
	if editable:
		var status=W.wrapped("",16)
		status.name="SheetEditorStatus"
		edits.add_child(status)
		var footer=HBoxContainer.new()
		edits.add_child(footer)
		var apply=W.button("Guardar cambios",true,18)
		apply.name="SheetSaveEdits"; apply.disabled=true
		var reset=W.button("Cancelar cambios",false,18)
		reset.name="SheetCancelEdits"; reset.disabled=true
		apply.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		reset.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		footer.add_child(apply); footer.add_child(reset)
		for spin in fields.values():
			spin.value_changed.connect(func(_value):
				editor_dirty=true
				apply.disabled=false; reset.disabled=false
				status.text="Cambios pendientes"
			)
		var notes=_section("Crónica y notas","history",1.2)
		var writing=_scroll_body(notes,"SheetNarrativeEditor",205)
		for entry in [["history","Historia personal"],["motivations","Motivaciones"],["personal_notes","Notas personales"]]:
			writing.add_child(W.label(entry[1],17,true))
			var area=TextEdit.new()
			area.text=str(data.get(entry[0],""))
			area.accessibility_name=entry[1]; area.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
			area.custom_minimum_size.y=68
			area.add_theme_font_override("font",Art.font())
			area.add_theme_font_size_override("font_size",17)
			area.add_theme_color_override("font_color",Art.INK)
			area.add_theme_color_override("caret_color",Art.INK)
			var box=W.secondary(5)
			area.add_theme_stylebox_override("normal",box.get_theme_stylebox("panel"))
			box.free()
			writing.add_child(area)
			narrative_fields[entry[0]]=area
			area.text_changed.connect(func():
				editor_dirty=true
				apply.disabled=false; reset.disabled=false
				status.text="Cambios pendientes"
			)
		var actor_id=str(data.id)
		apply.pressed.connect(func():
			var actor: Dictionary=ui.get_active_actor()
			if not _can_edit_values() or str(actor.get("id",""))!=actor_id: return
			var runtime: Dictionary=ui.combat_controller.rules.actors.get(actor_id,{})
			for key in fields:
				var value: float=fields[key].value
				var previous=float(actor.get(key,value))
				var modifier=float(runtime.get(key,previous))-previous
				actor[key]=int(value) if key=="ac" else value
				if not runtime.is_empty(): runtime[key]=int(value+modifier) if key=="ac" else value+modifier
			for key in narrative_fields:
				actor[key]=narrative_fields[key].text.substr(0,8000)
			editor_dirty=false
			apply.disabled=true; reset.disabled=true
			status.text="Cambios aplicados a la sesión"
			ui.combat_controller.rules.changed.emit()
			ui.refresh_all()
		)
		reset.pressed.connect(func():
			for key in fields: fields[key].set_value_no_signal(float(data.get("base_"+key,0)))
			for key in narrative_fields:
				narrative_fields[key].set_block_signals(true)
				narrative_fields[key].text=str(data.get(key,""))
				narrative_fields[key].set_block_signals(false)
			editor_dirty=false
			apply.disabled=true; reset.disabled=true
			status.text="Cambios descartados"
		)
	var health=_section("Puntos de golpe","heart")
	var health_value=W.label("%d de %d PG" % [data.hp,data.hp_max],25,true)
	health_value.name="SheetEditorHealth"
	health.add_child(health_value)
	var temp_hp=int(data.get("temp_hp",0))
	if temp_hp>0: health.add_child(W.label("+%d PG temporales" % temp_hp,17,true))
	health.add_child(W.wrapped("Usa el control de PG para registrar daño o curación." if ui.current_role=="player" else "Abre la edición del combatiente para los ajustes disponibles de PG y estado.",18))
	var hp=W.primary_button("Abrir control de PG  ›","heart",17); hp.pressed.connect(func():
		close_callback.call()
		if ui.current_role=="dm": ui.combat_controller.edit_combatant(str(data.id))
		else: ui.player_hud.open_modal("hp")
	); health.add_child(hp)
	W.divider(health)
	health.add_child(W.label("Progresión y nivel",19,true))
	health.add_child(W.wrapped("Nivel actual %d · Reglas %s. Abre el asistente para aplicar subidas de nivel conformes a las reglas." % [int(data.get("level",1)),str(LevelUpWizard.Rules.EDITIONS.get(LevelUpWizard.Rules.actor_edition(ui.get_active_actor()),"D&D 5e"))],15))
	var lvl_btn=W.primary_button("Abrir Progresión y subir nivel  ›","star",16); lvl_btn.name="SheetEditLevelUpBtn"; lvl_btn.pressed.connect(func(): open_progression()); health.add_child(lvl_btn)
func _build_detail() -> void:
	detail_overlay=Control.new(); detail_overlay.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(detail_overlay)
	var veil=ColorRect.new(); veil.color=Color("#241810",.28); veil.mouse_filter=Control.MOUSE_FILTER_STOP; veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); veil.hide(); detail_overlay.add_child(veil)
	veil.gui_input.connect(func(event):
		if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT and event.pressed: detail.hide()
	)
	detail=W.surface(16); detail.name="SheetDetail"; detail.visible=false; detail.mouse_filter=Control.MOUSE_FILTER_STOP; detail_overlay.add_child(detail)
	var solid=detail.get_theme_stylebox("panel").duplicate(); solid.bg_color=Art.IVORY; solid.shadow_color=Color("#22140c",.52); solid.shadow_size=14; detail.add_theme_stylebox_override("panel",solid)
	var paper=W.Paint.Paper.new(); detail.add_child(paper); detail.move_child(paper,0); detail.resized.connect(paper.queue_redraw)
	detail.visibility_changed.connect(func(): veil.visible=detail.visible)
	var vb=VBoxContainer.new(); vb.add_theme_constant_override("separation",10); detail.add_child(vb)
	var top_bar=HBoxContainer.new(); top_bar.name="DetailChromeBar"; top_bar.add_theme_constant_override("separation",8); vb.add_child(top_bar)
	var ribbon=PanelContainer.new(); ribbon.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	var rs=StyleBoxEmpty.new(); rs.content_margin_left=12; rs.content_margin_right=12; rs.content_margin_top=5; rs.content_margin_bottom=6; ribbon.add_theme_stylebox_override("panel",rs)
	var cart=W.Cartouche.new(); ribbon.add_child(cart); ribbon.resized.connect(cart.queue_redraw)
	var rrow=HBoxContainer.new(); rrow.add_theme_constant_override("separation",8); ribbon.add_child(rrow)
	var ricon=W.image("book",22); ricon.name="DetailRibbonIcon"; ricon.modulate=Color("#ffecc4"); rrow.add_child(ricon)
	var rtitle=W.label("Detalle",22,true,Art.IVORY); rtitle.name="DetailRibbonTitle"; rtitle.add_theme_color_override("font_shadow_color",Color("#1e0e05")); rtitle.add_theme_constant_override("shadow_offset_y",1); rtitle.size_flags_horizontal=Control.SIZE_EXPAND_FILL; rtitle.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; rrow.add_child(rtitle)
	top_bar.add_child(ribbon)
	var close=W.icon_button("","×"); close.name="SheetDetailClose"; close.tooltip_text="Cerrar detalle · Esc"; close.accessibility_name="Cerrar detalle"; close.pressed.connect(func(): detail.hide()); top_bar.add_child(close)
	var sc=ScrollContainer.new(); sc.size_flags_vertical=Control.SIZE_EXPAND_FILL; sc.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED; vb.add_child(sc); W.style_scroll(sc)
	detail_body=VBoxContainer.new(); detail_body.size_flags_horizontal=Control.SIZE_EXPAND_FILL; detail_body.add_theme_constant_override("separation",10); sc.add_child(detail_body)
func _show_detail(title: String,text: String,icon_key: String="book") -> void:
	detail_action_id=""; detail_spell_key=""
	_clear(detail_body)
	var rtitle=detail.find_child("DetailRibbonTitle",true,false) as Label
	if rtitle: rtitle.text=title
	var ricon=detail.find_child("DetailRibbonIcon",true,false) as TextureRect
	if ricon: ricon.texture=W.symbol(icon_key)
	var row=HBoxContainer.new(); row.name="DetailTitleRow"; row.add_theme_constant_override("separation",10); detail_body.add_child(row)
	var heading=W.wrapped(title,24); W.type_role(heading,"panel"); heading.add_theme_font_size_override("font_size",24); row.add_child(heading)
	if not text.is_empty(): detail_body.add_child(W.wrapped(text,18))
	detail.show(); move_child(detail_overlay,get_child_count()-1); _layout()
func open_action_book() -> void:
	ActionBook.open(self)
func open_progression() -> void:
	LevelUpWizard.open_progression(self)
func show_action(action: Dictionary,spell: Dictionary={}) -> void:
	var title=str(spell.get("name",action.get("label","Acción"))).split("·")[0].strip_edges()
	var icon_key=Art.action_icon(action) if not action.is_empty() else Art.action_icon(spell) if not spell.is_empty() else "sword"
	_show_detail(title,"",icon_key)
	detail_action_id=str(action.get("id","")); detail_spell_key=Model.normalized(str(spell.get("name","")))
	if not action.is_empty():
		var heading=detail_body.get_node("DetailTitleRow"); var icon=W.icon_tile(icon_key,34); heading.add_child(icon); heading.move_child(icon,0)
	if not action.is_empty():
		var fields=Model.action_fields(action,data)
		var card=W.secondary(10); detail_body.add_child(card)
		var facts=VBoxContainer.new(); facts.add_theme_constant_override("separation",5); card.add_child(facts)
		for entry in [["Tipo",fields.type],["Objetivo",fields.target],["Alcance",fields.range],["Duración",fields.duration],["Ataque / Salvación",fields.roll],["Daño / Efecto",fields.effect]]:
			if str(entry[1]).is_empty() or entry[1]=="—": continue
			var row=HBoxContainer.new(); facts.add_child(row); var caption=W.label(entry[0],17,true); caption.custom_minimum_size.x=150; row.add_child(caption); row.add_child(W.wrapped(str(entry[1]),17))
		if not fields.resource.is_empty():
			var r=fields.resource
			facts.add_child(W.wrapped(("Coste · %d espacio de conjuro" if r.kind=="spell_slot" else "Coste · %d uso") % int(r.cost),17))
			facts.add_child(W.wrapped(r.label+" · %d disponibles de %d" % [int(r.current),int(r.max)],16))
	if not spell.is_empty() and not str(spell.get("detail","")).is_empty(): detail_body.add_child(W.wrapped(str(spell.detail),17))
	for key in ["description","full_description","duration","casting_time","range","level"]:
		if spell.has(key): detail_body.add_child(W.wrapped(str({"description":"Descripción","full_description":"Descripción completa","duration":"Duración","casting_time":"Lanzamiento","range":"Alcance","level":"Nivel"}[key])+" · "+str(spell[key]),17))
	for key in ["description","guidance","effect","castingTime"]:
		if action.has(key): detail_body.add_child(W.wrapped(str(action[key]),17))
	if str(action.get("id","")).is_empty(): return
	var use=W.primary_button("Preparar esta acción",icon_key,18); use.name="PrepareSheetAction"; detail_body.add_child(use)
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
	_show_detail(title,text,"die")
	var b=W.primary_button("Solicitar tirada al DM","die",18); detail_body.add_child(b)
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
	var row=HBoxContainer.new(); row.size_flags_vertical=Control.SIZE_EXPAND_FILL; row.add_theme_constant_override("separation",12); content.add_child(row)
	var left_col=VBoxContainer.new(); left_col.size_flags_vertical=Control.SIZE_EXPAND_FILL; left_col.add_theme_constant_override("separation",8); left_col.custom_minimum_size.x=180 if compact else 212; row.add_child(left_col)
	var niche=MarginContainer.new(); niche.name="InventoryActorStage"; niche.size_flags_horizontal=Control.SIZE_SHRINK_CENTER; left_col.add_child(niche)
	var stage=Presentation.Stage.new(); stage.setup(ui,data); stage.custom_minimum_size=Vector2(168,246) if compact else Vector2(198,292); niche.add_child(stage); actor_view=stage.actor_view
	var equip_panel=W.surface(8); equip_panel.size_flags_vertical=Control.SIZE_EXPAND_FILL; left_col.add_child(equip_panel)
	var eq_box=VBoxContainer.new(); eq_box.add_theme_constant_override("separation",4); equip_panel.add_child(eq_box)
	W.heading(eq_box,"Equipo en uso","shield",17)
	var stock: Dictionary=bridge.items()
	var held_key=str(bridge.held.get(str(data.id),""))
	var held_name=str(stock.get(held_key,{}).get("name",""))
	var hand_row=HBoxContainer.new(); hand_row.add_theme_constant_override("separation",6); eq_box.add_child(hand_row)
	hand_row.add_child(W.image("short-sword" if held_key.is_empty() else preload("res://inventory/item_catalogue.gd").item_icon_id(held_key,stock.get(held_key,{})),18))
	hand_row.add_child(W.wrapped("En mano: "+(held_name if not held_name.is_empty() else "Equipo base"),14))
	var torch_row=HBoxContainer.new(); torch_row.add_theme_constant_override("separation",6); eq_box.add_child(torch_row)
	torch_row.add_child(W.image("torch",18))
	torch_row.add_child(W.wrapped("Antorcha: "+("Encendida" if ui.is_torch_lit() else "Apagada"),14))
	var gear_list: Array=data.get("gear",[])
	if not gear_list.is_empty():
		var gl=W.wrapped("Ficha: "+", ".join(gear_list.slice(0,5)),13); gl.add_theme_color_override("font_color",Art.MUTED); gl.max_lines_visible=3; gl.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; eq_box.add_child(gl)
	var bag_frame=W.surface(10); bag_frame.name="InventorySheetPanel"; bag_frame.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bag_frame.size_flags_vertical=Control.SIZE_EXPAND_FILL; bag_frame.size_flags_stretch_ratio=4; row.add_child(bag_frame)
	var bag=ui.player_hud.inventory_modal
	bag.reparent(bag_frame,false); bag.set_embedded(true); bag.size_flags_horizontal=Control.SIZE_EXPAND_FILL; bag.size_flags_vertical=Control.SIZE_EXPAND_FILL; bag.show(); bag.refresh_view()
