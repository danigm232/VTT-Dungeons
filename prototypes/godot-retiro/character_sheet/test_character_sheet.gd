extends SceneTree
const Model=preload("res://character_sheet/sheet_model.gd")
const Art=preload("res://character_sheet/skin.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")
const Presentation=preload("res://character_sheet/presentation.gd")
var passed: int=0
var failures: Array[String]=[]
func _initialize() -> void: _run.call_deferred()
func check(value: bool,label: String) -> void:
	if value: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func find_button(node: Node,text: String) -> Button:
	for child in node.find_children("*","Button",true,false):
		if child.text==text: return child
	return null
func wait_layout() -> void:
	for i in range(4): await process_frame
func send_mouse(point: Vector2,button: MouseButton,pressed: bool) -> void:
	var event=InputEventMouseButton.new()
	event.position=point
	event.button_index=button; event.pressed=pressed
	if pressed and button==MOUSE_BUTTON_LEFT: event.button_mask=MOUSE_BUTTON_MASK_LEFT
	root.push_input(event,true)
func verify_scroll(ui,panel) -> void:
	ui.selected_actor_id="mike"
	var mage: Dictionary=ui.combat_controller.rules.actors.mike
	var actions: Array=mage.actions.duplicate()
	for index in range(40):
		var sample: Dictionary=actions[0].duplicate(true)
		sample.id="scroll-test-"+str(index)
		mage.actions.append(sample)
	ui.player_hud.open_modal("sheet"); panel.select_tab("combat"); await wait_layout()
	var pane: ScrollContainer=panel.find_child("SheetCombatActions",true,false)
	var bar=pane.get_v_scroll_bar()
	var grab=bar.get_global_rect().position+Vector2(bar.size.x*.5,8)
	var hover=InputEventMouseMotion.new()
	hover.position=grab
	root.push_input(hover,true); await process_frame
	send_mouse(grab,MOUSE_BUTTON_LEFT,true); await process_frame
	var drag=InputEventMouseMotion.new()
	drag.position=grab+Vector2(0,80); drag.relative=Vector2(0,80); drag.button_mask=MOUSE_BUTTON_MASK_LEFT
	root.push_input(drag,true); await process_frame
	send_mouse(drag.position,MOUSE_BUTTON_LEFT,false); await process_frame
	check(pane.scroll_vertical>0 and panel.scroll.scroll_vertical==0,"dragging the native combat scrollbar reaches later actions")
	pane.scroll_vertical=0; await process_frame
	send_mouse(pane.get_global_rect().get_center(),MOUSE_BUTTON_WHEEL_DOWN,true); await wait_layout()
	check(pane.scroll_vertical>0 and panel.scroll.scroll_vertical==0,"mouse wheel is routed to the long list inside the sheet")
	mage.actions=actions
	ui.player_hud.close_modals()
func _run() -> void:
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900)
	var path="res://scenes/main.tscn" if FileAccess.file_exists("res://scenes/main.tscn") else "res://scenes/camp_a1_rooms.tscn"
	var main=load(path).instantiate(); root.add_child(main)
	current_scene=main
	for i in range(12): await process_frame
	var ui=main.find_child("VttRoleUi",true,false); ui.set_role("player"); ui.clock_running=false
	if "--verify-restart" in OS.get_cmdline_user_args():
		ui.set_role("dm"); ui.selected_actor_id="mia"
		ui.combat_controller.restore_local("user://sheet-integral-audit.save")
		var items=ui.inventory_bridge.items_for_actor("mia")
		check(items.has("sheet_test_healing") and items.sheet_test_healing.count==(2 if ui.inv_mgr else 1),"full Godot restart restores inventory quantity")
		check(ui.get_active_actor().ac==19 and ui.get_active_actor().get("history","")=="Crónica de prueba","full Godot restart restores sheet edits")
		check(ui.combat_controller.rules.actors.mia.hp==9 and ui.get_active_token_node().get("is_torch_lit"),"full Godot restart restores health and equipped torch")
		finish_report()
		return
	var hud=ui.player_hud; var panel=hud.sheet_modal
	await verify_scroll(ui,panel)
	var portraits=[]; var stages=[]
	check(Art.font(true) is FontVariation and Art.font(false) is FontVariation,"bundled RPG typography independent of installed fonts")
	check(Art.font(false).has_char(241) and Art.font(true).has_char(225),"Spanish accents supported by bundled fonts")
	for icon in Art.EXTRA_ICONS: check(Art.icon(icon)!=null,"illustrated inventory/action icon "+icon)
	for key in preload("res://character_sheet/action_icons.gd").PAINTED:
		check(W.symbol(key)!=null,"semantic painted icon decodes "+key)
	var arch=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v5/arch-frame.png"))
	check(arch.get_pixel(0,0).a<.01 and arch.get_pixel(arch.get_width()/2,arch.get_height()/2).a<.01,"arch rim has real transparent exterior and opening")
	var ink=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v5/ink-places.png"))
	check(ink.get_pixel(0,0).a<.01,"ink catalogue has no rectangular paper backing")
	for id in ["mia","maria","mike"]:
		ui.selected_actor_id=id; hud.open_modal("sheet"); panel.refresh_view(); await wait_layout()
		var a=ui.get_active_actor(); var model=Model.snapshot(ui)
		check(panel.visible and panel.data.id==id,"sheet follows selected "+id)
		check(panel.title_label.text.contains(str(a.name)),"real identity "+id)
		check(model.hp==ui.combat_controller.rules.actors[id].hp,"authoritative HP "+id)
		if id=="mike":
			check(model.casting.get("CD",0)==13 and model.casting.get("Ataque","")=="+5","spell DC / bonus derived from registered Mike data without class assumptions")
			check(Model.action_fields(ui.combat_controller.rules.action_for("mike","burning-hands"),model).roll=="DES CD 13","guided area spell never shown as a placeholder +0 attack")
			check(Model.skill_bonus(model,"Percepción","SAB")==3 and Model.rank(model,"Percepción",1)==1 and Model.skill_note(model,"Percepción").contains("Alto elfo"),"explicit elven Perception competence reaches skills with provenance")
			for spell in model.spells:
				if spell.get("action_id","")=="magic-missile": check(spell.name=="Misil mágico","linked spell uses the authoritative action name across tabs")
			var seen={}
			for action_id in ["magic-missile","burning-hands","shield","detect-magic"]: seen[Art.action_icon(ui.combat_controller.rules.action_for(id,action_id))]=true
			check(seen.size()==4,"distinct arcane actions never collapse to the same generic wand")
		check(panel.get_global_rect().end.x<=1600 and panel.get_global_rect().end.y<=900,"desktop fits "+id)
		check(panel.size.x<=1600*.92 and panel.size.y<=900*.92,"game remains visible around character window "+id)
		check(hud.modal_backdrop.color.a==0 and panel.external_backdrop.color.a<=.25,"map remains readable outside window "+id)
		check(panel.profile_medallion.texture!=null,"personal profile portrait "+id)
		var hp_card=panel.find_child("SheetHPCard",true,false)
		check(hp_card.get_global_rect().grow(-9).encloses(panel.find_child("SheetHPBar",true,false).get_global_rect()),"HP bar stays inset inside the carved frame "+id)
		check(panel.find_child("SheetHPHeart",true,false).frames.size()==6,"six cached heartbeat sprites available "+id)
		for navigation in panel.tabs.get_children():
			check(panel.get_global_rect().encloses(navigation.get_global_rect()),"header navigation stays inside sheet "+str(navigation.name)+" "+id)
		portraits.append(panel.profile_medallion.texture.get_instance_id()); stages.append(Presentation.profile(id).stage)
		var stage=panel.find_child("CharacterStage",true,false); check(stage!=null and stage.phase>0,"native background accents animated "+id)
		check(stage.actor_view.material is ShaderMaterial and stage.actor_view.get_meta("fitted_visible_height",0)>0,"arched window and measured live body fit "+id)
		check(panel.actor_view.token==ui.get_active_token_node(),"live renderer binds original "+id)
		check(panel.actor_view.mirrors.has(ui.get_active_token_node().sprite),"main sprite mirrored "+id)
		check(panel.actor_view.viewport.scaling_3d_mode==Viewport.SCALING_3D_MODE_BILINEAR and is_equal_approx(panel.actor_view.viewport.scaling_3d_scale,1.0),"preview preserves alpha independently of map FSR "+id)
		# Observe source and read-only mirror in the same update; process_frame resumes before node processing.
		panel.actor_view._process(0.0)
		check(panel.actor_view.mirrors[ui.get_active_token_node().sprite].texture==ui.get_active_token_node().sprite.texture,"same current texture "+id)
		check(panel.actor_view.mirrors[ui.get_active_token_node().sprite].flip_h==ui.get_active_token_node().sprite.flip_h,"same orientation "+id)
		check(not ui.role_switcher_panel.visible,"role picker does not overlap sheet "+id)
		check(panel.tabs.get_node("SheetTab_spells").visible,"spell tab present even without magic "+id)
		check(panel.tabs.get_node_or_null("SheetTab_inventory")!=null,"inventory reuses backpack in principal navigation "+id)
		check(panel.tabs.get_child_count()==5 and panel.tabs is HBoxContainer,"five primary tabs in one row "+id)
		check(panel.title_label.size.x>=80 and panel.title_label.text==str(a.name),"name is readable in actual case "+id)
		var summary_bounds=panel.scroll.get_global_rect()
		for key in ["SummarySkills","SummaryMagic","SummaryTraits"]:
			var section=panel.find_child(key,true,false)
			check(section!=null and summary_bounds.encloses(section.get_global_rect()),"lower block visible without general scrolling "+id+" "+key)
		var summary_bar=panel.scroll.get_v_scroll_bar()
		check(summary_bar.max_value<=summary_bar.page and panel.scroll.scroll_vertical==0,"desktop summary avoids global scrolling "+id)
		check(panel.find_child("SummarySaves",true,false).get_child_count()==6,"all six saves visible in summary "+id)
		var fields=Model.action_fields(model.actions[0],model)
		check(fields.has("target_mode") and fields.has("roll") and fields.has("effect") and fields.has("type"),"structured action columns from real data "+id)
		var frame=panel.get_global_rect()
		for value in ["combat","spells","inventory","history","edit","summary"]:
			panel.select_tab(value); await wait_layout(); check(panel.tab==value,"navigation "+id+" "+value)
			check(panel.get_global_rect().is_equal_approx(frame),"sheet frame stays fixed "+id+" "+value)
		check(panel.find_children("SummarySkill_*","Button",true,false).size()==3,"summary showcases three whole skill rows "+id)
		panel.select_tab("combat"); await wait_layout()
		var skills=panel.find_child("SheetSkillsScroll",true,false)
		check(skills.find_children("*","Button",true,false).size()==18,"all 18 skills remain in the detailed list "+id)
		panel.select_tab("summary"); await wait_layout()
		for button in panel.find_children("SummarySkill_*","Button",true,false):
			check(not button.text.contains("?") and button.has_meta("proficiency_rank"),"skill rank represented independently of font glyph "+id+" "+str(button.name))
	check(portraits[0]!=portraits[1] and portraits[1]!=portraits[2],"each player has a distinct portrait")
	check(stages[0]!=stages[1] and stages[1]!=stages[2],"each player has a distinct story platform/background")
	ui.selected_actor_id="maria"; panel.refresh_view(); await wait_layout()
	var rogue=Model.snapshot(ui)
	check(rogue.skills.size()==18 and rogue.skills.Sigilo==7,"confirmed full legacy skill totals imported")
	check(Model.rank(rogue,"Sigilo",3)==2 and Model.rank(rogue,"Acrobacias",3)==1 and Model.rank(rogue,"Historia",1)==0,"expertise / proficiency / untrained distinguished")
	var extra=rogue.duplicate(true); extra.skills.Sigilo={"bonus":8,"proficiency_rank":2,"other_bonus":1}
	check(Model.skill_bonus(extra,"Sigilo","DES")==8 and Model.rank(extra,"Sigilo",3)==2 and Model.skill_note(extra,"Sigilo").contains("+1"),"registered extra skill bonuses preserve total and explicit expertise")
	var typed=rogue.duplicate(true); typed.skills.erase("Atletismo"); typed["skill_proficiencies"]={"Atletismo":1}
	check(Model.skill_bonus(typed,"Atletismo","FUE")==1,"explicit typed proficiency without a stored total applies the registered bonus once")
	check(rogue.spells.is_empty(),"no magic granted to rogue")
	ui.selected_actor_id="mia"; panel.refresh_view(); await wait_layout()
	check(Model.rank(panel.data,"Medicina",3)==-1,"unknown competence never invented from reference")
	var sheet_frame=panel.get_global_rect()
	panel.select_tab("history"); await wait_layout(); panel._layout(); await wait_layout()
	check(panel.get_global_rect().is_equal_approx(sheet_frame),"short narrative keeps the exterior frame stable")
	panel.select_tab("summary"); await wait_layout()
	var source=ui.get_active_actor(); var saved_identity=source.class_line
	source["classes"]=[{"name":"Mago","level":2,"subclass":"Escuela de prueba"},{"name":"Clériga","level":1}]; source["species"]="Especie de prueba"; source["background"]="Trasfondo de prueba"
	var mixed=Model.snapshot(ui)
	check(mixed.identity.contains("Mago") and mixed.identity.contains("Clériga") and mixed.identity.contains("Escuela de prueba"),"explicit multiclass / subclass data rendered generically")
	check(mixed.identity.contains("Especie de prueba") and mixed.background=="Trasfondo de prueba","explicit species and background retained")
	source.erase("classes"); source.erase("species"); source.erase("background"); source.class_line=saved_identity
	var rules=ui.combat_controller.rules; var original_hp=rules.actors.mia.hp
	rules.actors.mia.hp=7; rules.actors.mia.temp_hp=3; rules.actors.mia.resources["spell-slot-1"].current=1; rules.actors.mia.concentration="Bendición"
	panel.refresh_view(); await wait_layout()
	check(panel.data.hp==7 and panel.data.temp_hp==3,"current / temp HP updated while open")
	check(panel.find_child("SheetHPBar",true,false).value==7 and panel.find_child("SheetHPBar",true,false).max_value==11,"dynamic HP bar represents current / max HP")
	var groups=Model.spell_groups(panel.data)
	check(groups.Trucos.size()==1 and groups.Preparados.is_empty(),"cantrip separate; no invented prepared status")
	var probe=panel.data.duplicate(true); var duplicate=probe.spells[0].duplicate(true); duplicate.prepared=true
	var test_groups=Model.spell_groups({"spells":[duplicate],"actions":probe.actions})
	check(test_groups.Trucos.size()==1 and test_groups.Preparados.is_empty(),"prepared flag never counts a cantrip as a prepared leveled spell")
	var saved_abilities=source.abilities.duplicate(true); source.abilities.FUE=18; panel.refresh_view(); await wait_layout()
	panel.find_child("SheetAbility_FUE",true,false).pressed.emit()
	check(panel.detail_body.get_child(1).text.contains("+4"),"ability edit reflected in real physical-roll request")
	panel.detail.hide(); source.abilities=saved_abilities; panel.refresh_view(); await wait_layout()
	check(panel.data.resources["spell-slot-1"].current==1 and panel.data.concentration=="Bendición","spent slots / concentration updated while open")
	rules.actors.mia.resources["spell-slot-1"].current=0; panel.refresh_view(); panel.show_action(rules.action_for("mia","healing-word")); await wait_layout()
	check(find_button(panel.detail_body,"Preparar esta acción").disabled,"spent spell slots disable casting with authoritative availability")
	rules.actors.mia.resources["spell-slot-1"].current=1; panel.detail.hide(); panel.refresh_view(); await wait_layout()
	var unchanged=panel.actor_view; panel.refresh_view(); check(panel.actor_view==unchanged,"unchanged refresh keeps live view")
	panel.select_tab("edit"); await wait_layout()
	check(panel.find_child("SheetEdit_ac",true,false)==null,"player cannot edit the base AC")
	var base_ac=int(source.ac)
	rules.actors.mia.ac=base_ac+5
	ui.set_role("dm"); ui.dm_hud.refresh(); await wait_layout()
	ui.dm_hud.root.find_child("DmCharacterSheet_mia",true,false).pressed.emit()
	panel.select_tab("edit"); await wait_layout()
	var spin=panel.find_child("SheetEdit_ac",true,false)
	check(int(spin.value)==base_ac,"narrative editor shows base AC while shield is active")
	spin.value=19
	check(source.ac==base_ac and rules.actors.mia.ac==base_ac+5,"draft does not change authoritative stats")
	panel.find_child("SheetCancelEdits",true,false).pressed.emit()
	check(int(spin.value)==base_ac,"cancel resets draft from registered actor")
	spin.value=19
	var notes=panel.find_children("*","TextEdit",true,false)
	notes[0].text="Crónica de prueba"
	notes[0].text_changed.emit()
	panel.find_child("SheetSaveEdits",true,false).pressed.emit()
	check(source.ac==19 and rules.actors.mia.ac==24,"DM edit updates base AC and preserves active shield modifier")
	check(source.get("history","")=="Crónica de prueba","narrative edits use the same confirm")
	rules.actors.mia.ac=19
	hud.close_modals(); ui.set_role("player"); hud.open_modal("sheet")
	panel.select_tab("summary"); await wait_layout()
	panel.show_action(rules.action_for("mia","mace")); await wait_layout()
	check(panel.detail.visible and panel.detail.get_global_rect().size.x<panel.size.x,"action details are readable overlay")
	check(panel.detail.size.y<400,"short action detail avoids empty oversized dialog")
	check(panel.detail.get_global_rect().get_center().distance_to(panel.get_global_rect().get_center())<1,"action detail centres on the actual sheet content host")
	var use=find_button(panel.detail_body,"Preparar esta acción"); use.pressed.emit(); await wait_layout()
	check(not panel.visible and ui.combat_controller.armed.get("id","")=="mace","prepare uses real combat action and closes sheet")
	check(rules.actors.mia.resources["spell-slot-1"].current==1,"merely preparing spends nothing")
	ui.combat_controller.armed.clear(); hud.open_modal("sheet"); await wait_layout()
	panel._check("Salvación SAB",5,"Salvación",true); var request=find_button(panel.detail_body,"Solicitar tirada al DM"); var count=ui.dm_requests.size(); request.pressed.emit()
	check(ui.dm_requests.size()==count+1 and ui.dm_requests[0].skill.contains("1d20 físico +5"),"physical roll sent through existing DM requests")
	panel.detail.hide(); panel.select_tab("summary"); await wait_layout()
	var body=ui.get_active_token_node(); var source_texture=body.sprite.texture; var old_color=body.sprite.modulate
	var old_phase=body.idle_breath_time; var old_position=body.global_position
	await create_timer(.6).timeout
	check(body.idle_breath_time>old_phase+.2,"real idle clock keeps advancing with sheet open")
	check(body.global_position.distance_to(old_position)<.001 and body.velocity.length_squared()<.001,"idle preview never moves the actual actor")
	body.sprite.modulate=Color(.6,.7,.8,.6); await wait_layout()
	check(panel.actor_view.mirrors[body.sprite].modulate==body.sprite.modulate,"temporary appearance mirrored without new animation logic")
	check(body.char_profile==ui.get_active_token_node().char_profile,"preview retains actual appearance profile")
	body.sprite.modulate=old_color
	# Stress data is isolated test input, never persisted or presented as campaign canon.
	var old_actions=rules.actors.mia.actions.duplicate(true); var old_features=ui.get_active_actor().features.duplicate(true)
	for i in range(50):
		var action=old_actions[0].duplicate(true); action.id="stress_"+str(i); action.label="Prueba extensa de acción "+str(i); rules.actors.mia.actions.append(action)
		ui.get_active_actor().features.append("Texto largo de prueba "+str(i)+". "+"Descripción extensa para verificar el desplazamiento. ".repeat(12))
	for i in range(16):
		var spell_action=old_actions[0].duplicate(true); spell_action.id="spell_stress_"+str(i); spell_action.label="Conjuro de prueba "+str(i); spell_action.magical=true; spell_action.kind="spell"; spell_action.resource={"id":"spell-slot-1","cost":1}; rules.actors.mia.actions.append(spell_action)
	panel.select_tab("spells"); await wait_layout(); check(panel.data.spells.size()>=16,"many spells retained without four-spell truncation")
	var search=panel.find_children("*","LineEdit",true,false)[0]
	search.text="conjuro de prueba 12"; search.text_changed.emit(search.text); await wait_layout()
	check(find_button(panel,"Conjuro de prueba 12")!=null and find_button(panel,"Conjuro de prueba 13")==null,"spell search filters only matching visible actions")
	var level_filter=panel.find_children("*","OptionButton",true,false)[0]
	search.text=""; search.text_changed.emit(""); level_filter.select(1); level_filter.item_selected.emit(1); await wait_layout()
	check(find_button(panel,"Llama sagrada")!=null and find_button(panel,"Conjuro de prueba 12")==null,"cantrip filtering uses registered legacy IDs")
	level_filter.select(0); level_filter.item_selected.emit(0)
	panel.select_tab("combat"); await wait_layout()
	var action_pane=panel.find_child("SheetCombatActions",true,false) as ScrollContainer
	var action_bar=action_pane.get_v_scroll_bar()
	check(action_bar.max_value>action_bar.page,"many actions scroll within the combat column")
	action_pane.scroll_vertical=100000; await wait_layout()
	check(action_pane.scroll_vertical>0 and panel.scroll.scroll_vertical==0,"combat actions reach the bottom without moving the exterior")
	panel.select_tab("history"); await wait_layout()
	var chronicle=panel.find_child("SheetChronicle",true,false).get_v_scroll_bar()
	check(chronicle.max_value>chronicle.page,"long narrative scrolls in its own column")
	rules.actors.mia.actions=old_actions; ui.get_active_actor().features=old_features; rules.actors.mia.hp=original_hp
	panel.select_tab("summary"); root.content_scale_size=Vector2i(1366,768); root.size=Vector2i(1366,768); await wait_layout(); panel._layout(); await wait_layout()
	check(panel.get_global_rect().end.x<=1366 and panel.get_global_rect().end.y<=768,"1366x768 sheet stays in viewport")
	check(panel.scroll.horizontal_scroll_mode==ScrollContainer.SCROLL_MODE_DISABLED,"no horizontal scrolling required")
	check(panel.find_child("SheetHPCard",true,false).get_global_rect().grow(-9).encloses(panel.find_child("SheetHPBar",true,false).get_global_rect()),"compact HP bar stays inside its artwork")
	for navigation in panel.tabs.get_children():
		check(panel.get_global_rect().encloses(navigation.get_global_rect()),"compact header keeps tab visible "+str(navigation.name))
	check(panel.get_global_rect().end.y<=768 and panel.position.y>=0,"small desktop window keeps its safety margins")
	var compact_frame=panel.get_global_rect()
	for page in ["combat","spells","inventory","history","edit","summary"]:
		panel.select_tab(page); await wait_layout()
		check(panel.get_global_rect().is_equal_approx(compact_frame),"compact frame stays fixed "+page)
	var small_bounds=panel.scroll.get_global_rect()
	for key in ["SummarySkills","SummaryMagic","SummaryTraits"]:
		check(small_bounds.encloses(panel.find_child(key,true,false).get_global_rect()),"small desktop bottom content fits "+key)
	var old_conditions=rules.actors.mia.conditions.duplicate(); rules.actors.mia.conditions=["envenenada"]
	panel.refresh_view(); await wait_layout(); panel._layout(); await wait_layout()
	check(panel.get_global_rect().end.y<=768 and panel.position.y>=0,"small desktop with temporary HP and status never clips the window")
	rules.actors.mia.conditions=old_conditions; panel.refresh_view(); await wait_layout()
	hud.close_modals(); check(ui.role_switcher_panel.visible,"role picker restored on close")
	ui.set_role("dm"); ui.dm_hud.refresh(); await wait_layout()
	var dm_open=ui.dm_hud.root.find_child("DmCharacterSheet_maria",true,false); check(dm_open!=null,"DM player card offers the same character sheet")
	dm_open.pressed.emit(); await wait_layout()
	check(ui.current_role=="dm" and panel.is_visible_in_tree() and panel.data.id=="maria","DM reads character sheet without changing role")
	check(panel.external_backdrop.visible,"shared sheet blocks background in DM")
	ui.set_role("projector"); await wait_layout(); check(not panel.visible and not panel.external_backdrop.visible,"private sheet closes before entering projector")
	ui.set_role("player"); ui.selected_actor_id="mia"; hud.open_modal("sheet"); panel.select_tab("inventory"); await wait_layout()
	var bag=hud.inventory_modal; var bridge=ui.inventory_bridge; var stock=bridge.items()
	check(bag.visible and bag.embedded and panel.visible and panel.content.is_ancestor_of(bag),"same backpack component embedded in inventory tab")
	var original_id=bag.get_instance_id()
	stock["sheet_test_dagger"]={"name":"Daga de prueba","count":2,"desc":"Solo prueba, no se persiste.","equipped":false}
	bag.selected_key="sheet_test_dagger"; await create_timer(.25).timeout
	check(bag.detail_title.text.contains("×2"),"embedded view follows authoritative external stock update")
	bridge.prepare("sheet_test_dagger","take"); await wait_layout()
	check(bridge.session.pending.size()==1 and not bridge.playing,"equipment waits while integrated inventory is open")
	panel.select_tab("summary"); await wait_layout()
	check(bridge.session.is_open and bridge.session.pending.size()==1 and not bridge.playing,"tab navigation preserves pending equipment")
	hud.open_modal("inventory"); await wait_layout()
	check(bag.get_instance_id()==original_id and bag.visible and not bag.embedded and bag.get_parent()==hud.root,"standalone is the same component restored to its original presentation")
	check(bridge.session.pending.size()==1 and not bridge.playing,"transfer to standalone preserves same session")
	ui.add_inventory_item("sheet_test_dagger",2,"Daga de prueba"); bag.refresh_view(); await wait_layout()
	check(int(stock.sheet_test_dagger.count)==4 and bag.detail_title.text.contains("×4"),"standalone addition updates the same stock")
	hud.open_modal("sheet"); panel.select_tab("inventory"); await wait_layout()
	check(bag.get_instance_id()==original_id and bag.detail_title.text.contains("×4"),"return to inventory reflects standalone modification")
	hud.close_modals(); await create_timer(.12).timeout
	check(not bridge.session.is_open and bridge.playing,"closing the complete inventory starts existing deferred playback")
	await create_timer(1.4).timeout
	check(int(stock.sheet_test_dagger.count)==4 and bool(stock.sheet_test_dagger.equipped) and bridge.actual_held("sheet_test_dagger"),"equipment playback updates shared equipped state without consuming stock")
	hud.open_modal("sheet"); panel.select_tab("inventory"); await wait_layout()
	check(bag.store_button.disabled==false and bag.take_button.disabled,"equipped state reflected on return")
	bridge.prepare("sheet_test_dagger","store"); hud.close_modals(); await create_timer(1.5).timeout
	check(not bool(stock.sheet_test_dagger.equipped) and not bridge.actual_held("sheet_test_dagger"),"unequip updates single source of truth")
	hud.open_modal("inventory"); stock.sheet_test_dagger.count=3; await create_timer(.25).timeout
	check(bag.detail_title.text.contains("×3"),"external consumption/change updates standalone view")
	hud.open_modal("sheet"); panel.select_tab("inventory"); await wait_layout()
	check(bag.detail_title.text.contains("×3"),"consumed quantity identical in integrated view")
	stock.erase("sheet_test_dagger"); await create_timer(.25).timeout
	check(bag.selected_key!="sheet_test_dagger","removed item disappears from integrated inventory")
	hud.close_modals(); hud.open_modal("inventory"); await wait_layout()
	check(bag.selected_key!="sheet_test_dagger" and bag.get_instance_id()==original_id,"removal identical in restored standalone component")
	hud.close_modals()
	var bless=Model.action_fields(rules.action_for("mia","bless"),Model.snapshot(ui))
	check(bless.uses.contains("Nv.1") and bless.resource.kind=="spell_slot" and bless.effect.contains("+1d4"),"spell-slot reserve labelled and registered blessing effect shown")
	var missile=Model.action_fields(rules.action_for("mike","magic-missile"),rules.actors.mike)
	check(missile.effect.contains("3 ×") and missile.roll=="Sin d20","automatic three-dart action displayed without ambiguous Auto label")
	ui.selected_actor_id="mia"; hud.open_modal("sheet"); panel.select_tab("summary"); await wait_layout()
	rules.actors.mia.resources["spell-slot-1"].current=1; panel.refresh_view(); panel.show_action(rules.action_for("mia","healing-word")); await wait_layout()
	rules.actors.mia.resources["spell-slot-1"].current=0; panel.refresh_view(); await wait_layout()
	check(find_button(panel.detail_body,"Preparar esta acción").disabled,"open action detail revalidates availability when a slot is spent elsewhere")
	rules.actors.mia.resources["spell-slot-1"].current=1; panel.refresh_view(); await wait_layout()
	check(not find_button(panel.detail_body,"Preparar esta acción").disabled,"open action detail recovers after authoritative slot restoration")
	ui.selected_actor_id="mike"; panel.refresh_view(); await wait_layout()
	check(not panel.detail.visible,"changing actor closes the previous actor's action detail")
	var detection=Model.action_fields(rules.action_for("mike","detect-magic"),Model.snapshot(ui))
	check(detection.target_mode=="self" and detection.range.contains("9"),"personal area spell preserves its registered radius")
	check(Model.condition_text({"conditions":["poisoned","prone"]})=="Envenenado, Derribado","registered condition IDs have consistent Spanish presentation")
	panel.detail.hide(); panel.select_tab("spells"); await wait_layout(); panel._layout(); await wait_layout()
	root.size=Vector2i(1600,900); root.content_scale_size=Vector2i(1600,900); await wait_layout(); panel._layout(); await wait_layout()
	var spell_reference=panel.find_child("SheetSpellReference",true,false)
	check(spell_reference!=null and panel.scroll.get_global_rect().encloses(spell_reference.get_global_rect()),"spell detail stays inside the stable frame")
	var spell_list=panel.find_child("SheetSpellList",true,false)
	var spell_button=find_button(spell_list,"Detectar magia")
	spell_button.pressed.emit(); await wait_layout()
	check(panel.spell_selection==Model.normalized("Detectar magia") and find_button(spell_reference,"Consultar acción  ›")!=null,"spell selection updates the real action reference")
	panel.select_tab("inventory"); await wait_layout(); panel._layout(); await wait_layout()
	check(panel.scroll.get_global_rect().encloses(bag.take_button.get_global_rect()) and panel.scroll.get_global_rect().encloses(bag.store_button.get_global_rect()),"small inventory keeps take and store controls visible")
	check(panel.get_global_rect().is_equal_approx(sheet_frame),"inventory uses the same exterior as the other tabs")
	var current_stock=bridge.items()
	var inventory_snapshot=current_stock.duplicate(true)
	for quantity in [4,20,50]:
		current_stock.clear()
		for index in range(quantity):
			current_stock["test_"+str(index)]={"name":"Objeto de prueba "+str(index),"count":1}
		bag.refresh_view(); await wait_layout()
		var slots=bag.grid.find_children("*","Button",false,false)
		check(slots.size()==quantity,"inventory renders all %d entries" % quantity)
		slots[-1].grab_focus(); await wait_layout()
		var focused=root.gui_get_focus_owner()
		var last_key="test_"+str(quantity-1)
		check(is_instance_valid(focused) and focused.get_meta("inventory_item","")==last_key and bag.item_scroll.get_global_rect().grow(1).encloses(focused.get_global_rect()),"keyboard focus reaches final inventory entry at %d items" % quantity)
	current_stock.clear(); current_stock.merge(inventory_snapshot); bag.refresh_view()
	root.size=Vector2i(1920,1080); root.content_scale_size=root.size
	await wait_layout()
	var wide_frame=panel.get_global_rect()
	for page in ["summary","combat","spells","inventory","history","edit"]:
		panel.select_tab(page); await wait_layout()
		check(panel.get_global_rect().is_equal_approx(wide_frame),"wide frame stays fixed "+page)
	panel.select_tab("spells"); await wait_layout()
	var current_data=panel.data; panel.data=current_data.duplicate(true); panel.data.saves={}
	var unknown_host=VBoxContainer.new(); panel._skills(unknown_host)
	find_button(unknown_host,"FUE −1").pressed.emit(); await wait_layout()
	check(panel.detail_body.get_child(1).text.contains("confirmar"),"unregistered detailed save never silently claims confirmed proficiency")
	unknown_host.free(); panel.data=current_data; hud.close_modals()
	ui.selected_actor_id="mia"
	var potion=bridge.items_for_actor("mia")
	potion["sheet_test_healing"]={"name":"Poción de prueba","count":3,"healing_range":[4,10],"healing_dice":"2d4+2"}
	rules.actors.mia.hp=4
	check(not bridge.consume_healing_item("sheet_test_healing",3) and potion.sheet_test_healing.count==3,"invalid physical roll preserves stock")
	hud.open_modal("sheet"); panel.select_tab("inventory"); await wait_layout()
	bag.selected_key="sheet_test_healing"; bag.refresh_view()
	bag.consume_button.pressed.emit()
	bag.operation_amount.value=5
	find_button(bag.operation_row,"Confirmar").pressed.emit()
	check(rules.actors.mia.hp==9 and potion.sheet_test_healing.count==2 and bag.detail_title.text.contains("×2"),"physical healing through the inventory controls updates rules and stock")
	hud.close_modals()
	check(not bridge.transfer_item("sheet_test_healing","mike",1),"player cannot transfer stock")
	ui.set_role("dm")
	if ui.inv_mgr:
		check(not bridge.transfer_item("sheet_test_healing","mike",1),"group inventory stays a single reserve")
	else:
		check(bridge.transfer_item("sheet_test_healing","mike",1) and potion.sheet_test_healing.count==1 and bridge.items_for_actor("mike").sheet_test_healing.count==1,"authorized personal stock transfer preserves count across actors")
	var saved_count=int(potion.sheet_test_healing.count)
	var save_path="user://sheet-integral-audit.save"
	ui.get_active_token_node().set_torch_mode(true,false)
	ui.combat_controller.save_local(save_path)
	check(FileAccess.file_exists(save_path),"shared DM checkpoint exists")
	main.queue_free(); await wait_layout()
	main=load(path).instantiate(); root.add_child(main); current_scene=main
	for i in range(12): await process_frame
	ui=main.find_child("VttRoleUi",true,false); ui.set_role("dm"); ui.selected_actor_id="mia"
	ui.combat_controller.restore_local(save_path)
	await wait_layout()
	var restored=ui.inventory_bridge.items_for_actor("mia")
	check(restored.has("sheet_test_healing") and restored.sheet_test_healing.count==saved_count,"reopened scene restores inventory from DM checkpoint")
	check(ui.get_active_actor().ac==19 and ui.combat_controller.rules.actors.mia.ac==19 and ui.get_active_actor().get("history","")=="Crónica de prueba","reopened scene restores registered AC and written narrative")
	check(ui.combat_controller.rules.actors.mia.hp==9 and ui.get_active_token_node().get("is_torch_lit"),"reopened scene restores current health and torch")
	var restored_rules=ui.combat_controller.rules
	restored_rules.actors.mia.temp_hp=3
	restored_rules.damage("mia",2,"fuerza")
	check(restored_rules.actors.mia.hp==9 and restored_rules.actors.mia.temp_hp==1,"temporary HP absorbs damage before current health")
	restored_rules.damage("mia",3,"fuerza")
	check(restored_rules.actors.mia.hp==7 and restored_rules.actors.mia.temp_hp==0,"remaining damage reaches current health")
	ui.combat_controller.edit_combatant("mia")
	var dialog=ui.combat_controller.dialog
	var fields=dialog.find_children("*","SpinBox",true,false)
	fields[1].value=4
	fields[3].value=2
	find_button(dialog,"Aplicar resolución").pressed.emit()
	check(restored_rules.actors.mia.temp_hp==4 and restored_rules.actors.mia.resources["spell-slot-1"].current==2,"DM panel records temporary HP and restores spent slots")
	# Phase 2 & 6 verification: Action Book, Spell Preparation, Level-Up Rules (Mike, Mia, Trinity, ASI, Multiclass, Undo & Persistence)
	var LvlRules=preload("res://character_sheet/level_up_rules.gd")
	ui.set_role("dm"); ui.selected_actor_id="mike"; ui.refresh_all()
	hud=ui.player_hud; panel=hud.sheet_modal; hud.open_modal("sheet"); panel.select_tab("summary"); await wait_layout()
	check(panel.level_button!=null and panel.level_button.text=="Nv. 1","header level pill is interactive button")
	panel.open_action_book(); await wait_layout()
	var book_search=panel.detail.find_child("ActionBookSearch",true,false) as LineEdit
	check(book_search!=null and panel.detail.find_child("ActionBookList",true,false)!=null,"Action Book opens with search and catalog list")
	book_search.text="escudo"; book_search.text_changed.emit("escudo"); await wait_layout()
	check(panel.detail.find_child("BookEntry_act_shield",true,false)!=null,"Action Book filters actions from shared combat catalog")
	panel.detail.hide()
	# Interactive spell preparation toggle
	panel.select_tab("spells"); await wait_layout()
	var mm_btn=find_button(panel.find_child("SheetSpellList",true,false),"Misil mágico")
	check(mm_btn!=null,"Magic Missile visible in spells tab")
	mm_btn.pressed.emit(); await wait_layout()
	var prep_btn=panel.find_child("PrepareSpellBtn",true,false) as Button
	check(prep_btn!=null and not prep_btn.disabled,"leveled spell offers preparation toggle outside combat")
	prep_btn.pressed.emit(); await wait_layout()
	check(Model.spell_groups(panel.data).Preparados.size()>=1,"toggling preparation marks spell prepared")
	# Level-Up: Mike 1 -> 2 -> 3 (Subclass) -> 4 (ASI +2 INT) + Multiclass + Anti-Double-Apply + Undo
	var mike_actor: Dictionary=ui.get_active_actor()
	var mike_rt: Dictionary=restored_rules.actors.mike
	var bad_mike=LvlRules.propose(mike_actor,mike_rt,{"edition":"dnd-2024","class_id":"wizard","hp_method":"fixed"})
	check(not bad_mike.valid and bad_mike.errors.size()>=2,"Mike level 1->2 rejects incomplete choices without auto-picking")
	var prop_m2=LvlRules.propose(mike_actor,mike_rt,{"edition":"dnd-2024","class_id":"wizard","hp_method":"fixed","scholar_skill":"Arcanos","spells":["Armadura de mago","Onda atronadora"]})
	check(prop_m2.valid and prop_m2.new_hp_max==13 and prop_m2.new_slots.get(1,0)==3,"Mike 1->2 proposal computes +5 HP and 3 level-1 slots")
	var app_m2=LvlRules.apply(ui,"mike",prop_m2)
	check(app_m2.ok and mike_actor.level==2 and mike_rt.hp_max==13 and mike_rt.resources["spell-slot-1"].max==3,"Mike 1->2 applies atomically to actor and combat rules")
	var dup_m2=LvlRules.apply(ui,"mike",prop_m2)
	check(not dup_m2.ok,"anti-double-apply prevents applying the same level-up twice")
	var prop_m3=LvlRules.propose(mike_actor,mike_rt,{"edition":"dnd-2024","class_id":"wizard","hp_method":"fixed","subclass":"Evocador","spells":["Paso brumoso"]})
	check(prop_m3.valid and prop_m3.new_slots.get(2,0)==2,"Mike 2->3 unlocks Evocador subclass and level-2 spell slots")
	check(LvlRules.apply(ui,"mike",prop_m3).ok and mike_actor.level==3 and mike_rt.resources["spell-slot-2"].max==2,"Mike 2->3 applies subclass and level-2 slots")
	var prop_m4=LvlRules.propose(mike_actor,mike_rt,{"edition":"dnd-2024","class_id":"wizard","hp_method":"fixed","asi_mode":"asi2","asi_primary":"INT","spells":[]})
	check(prop_m4.valid and int(prop_m4.new_abilities.INT)==18 and prop_m4.new_cast_dc==14 and prop_m4.new_cast_atk==6,"Mike 3->4 ASI +2 INT recalculates spell DC 14 and attack +6")
	check(LvlRules.apply(ui,"mike",prop_m4).ok and int(mike_actor.abilities.INT)==18,"Mike 3->4 applies ASI cleanly")
	check(LvlRules.multiclass_check(mike_actor,"rogue").allowed and LvlRules.multiclass_check(mike_actor,"cleric").allowed,"Mike meets INT/DES/SAB >= 13 multiclass prerequisites")
	# Mia 1 -> 2 (Hill Dwarf +1 HP/lvl + Channel Divinity)
	var mia_actor: Dictionary={}
	for a in ui.actors:
		if a.id=="mia": mia_actor=a; break
	var prop_mia2=LvlRules.propose(mia_actor,restored_rules.actors.mia,{"edition":"dnd-2024","class_id":"cleric","hp_method":"fixed","spells":["Curar heridas"]})
	check(prop_mia2.valid and prop_mia2.hp_gain==8,"Mia 1->2 includes fixed 5 + 2 CON + 1 Hill Dwarf = +8 HP")
	check(LvlRules.apply(ui,"mia",prop_mia2).ok and restored_rules.actors.mia.resources.has("channel-divinity"),"Mia 1->2 unlocks Channel Divinity resource and action")
	# Trinity / Maria 1 -> 2 (D&D 2014 + Cunning Action + Multiclass prerequisite check)
	var maria_actor: Dictionary={}
	for a in ui.actors:
		if a.id=="maria": maria_actor=a; break
	check(not LvlRules.multiclass_check(maria_actor,"cleric").allowed and LvlRules.multiclass_check(maria_actor,"wizard").allowed,"Trinity multiclass blocks Cleric (SAB 10<13) and allows Wizard (INT 13>=13)")
	var prop_tr2=LvlRules.propose(maria_actor,restored_rules.actors.maria,{"edition":"dnd-2014","class_id":"rogue","hp_method":"fixed"})
	check(prop_tr2.valid and prop_tr2.hp_gain==6,"Trinity 1->2 computes fixed 5 + 1 CON = +6 HP")
	check(LvlRules.apply(ui,"maria",prop_tr2).ok and restored_rules.action_for("maria","cunning-action").size()>0,"Trinity 1->2 unlocks Cunning Action in combat rules")
	# Progression wizard UI opens & rollback restores original level 1 cleanly
	panel.open_progression(); await wait_layout()
	check(panel.detail.find_child("StartLevelUpWizard",true,false)!=null and panel.detail.find_child("UndoLevelUpBtn",true,false)!=null,"Progression modal offers Level-Up wizard and Undo rollback")
	# Persistence check for level-up state
	var lvl_save:="user://sheet-levelup-test.save"
	ui.combat_controller.save_local(lvl_save)
	check(LvlRules.undo_last(ui,"mike").ok and mike_actor.level==3,"Undo rollback restores Mike to previous level 3")
	ui.combat_controller.restore_local(lvl_save)
	check(mike_actor.level==4 and int(mike_actor.abilities.INT)==18 and str(mike_actor.get("subclass",""))=="Evocador","restore_local recovers leveled-up level, abilities, and subclass")
	for _step in range(3): LvlRules.undo_last(ui,"mike")
	LvlRules.undo_last(ui,"mia"); LvlRules.undo_last(ui,"maria")
	check(mike_actor.level==1 and mia_actor.level==1 and maria_actor.level==1,"full rollback cleanly restores all three heroes to level 1")
	# Inline editable Biography in Historia (works in Player role too!)
	ui.set_role("player"); ui.selected_actor_id="mike"; hud.open_modal("sheet"); panel.select_tab("history"); await wait_layout()
	var edit_bio=panel.find_child("HistoryEditBioBtn",true,false) as Button
	check(edit_bio!=null,"Historia provides inline Edit Biography button for players")
	edit_bio.pressed.emit(); await wait_layout()
	var bio_field=panel.find_child("HistoryBioInput_history",true,false) as TextEdit
	check(bio_field!=null,"inline Biography editor opens TextEdit inside Historia")
	bio_field.text="Nacido en las altas torres de Lythariel, dedicado al estudio arcano."
	panel.find_child("HistorySaveBioBtn",true,false).pressed.emit(); await wait_layout()
	check(ui.get_active_actor().get("history","").contains("Lythariel") and not panel.bio_editing,"saving inline Biography persists text and returns to illuminated chronicle")
	ui.get_active_actor().erase("history")
	panel.detail.hide(); hud.close_modals()
	finish_report()

func finish_report() -> void:
	var report={"passed":passed,"failed":failures.size(),"failures":failures}
	print("CHARACTER SHEET TEST ",JSON.stringify(report)); quit(0 if failures.is_empty() else 1)
