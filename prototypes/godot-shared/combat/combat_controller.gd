extends Node
const Rules = preload("res://combat/combat_rules.gd")
const Catalogue = preload("res://combat/combat_catalogue.gd")
const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")
const Targeting = preload("res://combat/action_targeting.gd")
var ui: Node
var rules = Rules.new()
var armed: Dictionary={}
var target_id := ""
var trigger := ""
var wheel_open := false
var category := ""
var page := 0
var layer: Control
var timeline: BoxContainer
var wheel: Control
var prompt: PanelContainer
var dialog: PanelContainer
var hint: Label
var budget: Label
var action_tray: VBoxContainer
var preview_point:=Vector3.ZERO
var preview_valid:=false
var preview_target: String=""
var _wheel_origin:=Vector2.INF
var _last_touch_msec: int=-1000
var target_menu: OptionButton
var amount: SpinBox
var input_owner := ""
var initiative_position := "top"
var visuals: Node3D
var clock_accum := 0.0
var positions: Dictionary={}
var portraits: Dictionary={}
var _opening: Dictionary={}
var _refreshing := false
var _acting_override := ""
var _movement_waivers: Dictionary={}
var action_options: Dictionary={}
var _layout_viewport:=Vector2.ZERO
var _continuation_key: String=""

func setup(owner_ui: Node) -> void:
	ui=owner_ui
	name="CombatController"
	preload("res://sprites/npc_encounter_variants.gd").install(ui)
	if ui.tokens_by_node.has("ZombieToken") and not ui.enemies.any(func(enemy): return enemy.id=="zombie"):
		var zombie: Dictionary=preload("res://scripts/vtt_campaign_data.gd").create_default_enemies(false)[1].duplicate(true)
		zombie.zone=ui.get_current_zone_display(); ui.enemies.append(zombie)
	for source in ui.actors:
		var a: Dictionary=source.duplicate(true); a.kind="player"
		a["saves"]={"dex":5,"int":3} if a.id=="maria" else {"wis":5,"cha":3} if a.id=="mia" else {"int":5,"wis":3}
		a["ammunition"]={"arrow":20,"dagger":2} if a.id=="maria" else {}
		var p:=Catalogue.profile(str(a.id))
		if a.id in ["mia","mike"]: p["resources"]={"spell-slot-1":{"label":"Espacios nivel 1","current":2,"max":2}}
		rules.register(a,Catalogue.actions(str(a.id)),p)
	for source in ui.enemies:
		var a: Dictionary=source.duplicate(true); a.kind="enemy"
		rules.register(a,Catalogue.actions(str(a.id)),Catalogue.profile(str(a.id)))
	for id in rules.actors:
		var body:=token(id)
		if body: body.set_meta("combat_id",id); body.set_meta("combat_controller",self)
	var appearance=preload("res://characters/character_service.gd").new(); add_child(appearance); appearance.setup(self)
	_build()
	visuals=preload("res://combat/combat_visuals.gd").new(); visuals.controller=self; ui.main_ctrl.add_child(visuals)
	var overlay:=preload("res://combat/combat_overlay.gd").new(); overlay.controller=self; layer.add_child(overlay); layer.move_child(overlay,0)
	rules.changed.connect(refresh)
	rules.resolved.connect(_resolved)
	ui.role_changed.connect(func(_role): dialog.hide(); _clear(dialog); refresh())
	var button: Button=ui.player_hud.action_toggle_btn
	for container in [button.get_parent().get_parent(),ui.player_hud.toast_panel.get_parent()]: container.minimum_size_changed.connect(func(): _layout.call_deferred())
	for connection in button.pressed.get_connections(): button.pressed.disconnect(connection.callable)
	button.pressed.connect(func(): wheel_open=not wheel_open; refresh())
	_sync_positions(); refresh()

func token(id: String) -> Node3D:
	var a: Dictionary=rules.actors.get(id,{})
	return ui.tokens_by_node.get(a.get("node_name",""),null) if ui else null

func acting_id() -> String:
	if ui.current_role=="dm" and not rules.sequence.is_empty(): return str(rules.sequence.actor)
	if ui.current_role=="dm" and rules.active and not rules.current_id().is_empty(): return rules.current_id()
	if ui.current_role=="dm" and not _acting_override.is_empty(): return _acting_override
	return str(ui.selected_actor_id)

func legacy_action(label: String) -> void:
	_acting_override=""
	for action in rules.actors.get(acting_id(),{}).get("actions",[]):
		if str(action.get("label","")).split("·")[0].strip_edges().to_lower()==label.to_lower(): choose_action(str(action.id)); return
	wheel_open=true; category="spells" if label.to_lower() in ["conjurar","magia"] else "weapons"; page=0; refresh()

func enemy_action(id: String) -> void:
	if ui.current_role!="dm" or not rules.actors.has(id): return
	if rules.active and rules.current_id()!=id: ui.notify_mesa("Espera al turno de esa criatura o declara su reacción."); return
	_acting_override=id; wheel_open=true; category="weapons"; page=0; refresh()

func _build() -> void:
	layer=Control.new(); layer.name="NativeCombatUi"; layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); layer.mouse_filter=Control.MOUSE_FILTER_IGNORE
	ui.ui_root.add_child(layer)
	timeline=preload("res://combat/combat_turn_line.gd").new(); timeline.name="CombatTurnLine"; timeline.mouse_filter=Control.MOUSE_FILTER_IGNORE; timeline.add_theme_constant_override("separation",18)
	layer.add_child(timeline)
	hint=ThemeKit.make_label("",13,ThemeKit.COL_HEADING); hint.set_anchors_preset(Control.PRESET_CENTER_TOP); hint.position=Vector2(-290,180); hint.custom_minimum_size=Vector2(580,0); hint.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; hint.mouse_filter=Control.MOUSE_FILTER_IGNORE; layer.add_child(hint)
	budget=ThemeKit.make_label("",13,ThemeKit.COL_HEADING); budget.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); budget.position=Vector2(-300,-54); budget.custom_minimum_size=Vector2(600,0); budget.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; budget.mouse_filter=Control.MOUSE_FILTER_IGNORE; layer.add_child(budget)
	wheel=Control.new(); wheel.name="CombatActionWheel"; wheel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); wheel.mouse_filter=Control.MOUSE_FILTER_IGNORE; layer.add_child(wheel)
	action_tray=VBoxContainer.new(); action_tray.name="InlineActionControls"; action_tray.mouse_filter=Control.MOUSE_FILTER_IGNORE; action_tray.add_theme_constant_override("separation",5); layer.add_child(action_tray)
	prompt=ThemeKit.make_window_panel(ThemeKit.COL_GOLD,12); prompt.name="PhysicalDicePrompt"; prompt.set_anchors_preset(Control.PRESET_CENTER); prompt.position=Vector2(-260,-120); prompt.custom_minimum_size=Vector2(520,0); layer.add_child(prompt)
	dialog=ThemeKit.make_window_panel(ThemeKit.COL_GOLD,12); dialog.name="CombatRosterDialog"; dialog.set_anchors_preset(Control.PRESET_CENTER); dialog.position=Vector2(-260,-210); dialog.custom_minimum_size=Vector2(520,0); dialog.hide(); layer.add_child(dialog)
	var settings:=OptionButton.new(); settings.name="InitiativePositionSetting"; settings.add_item("Turnos: arriba",0); settings.add_item("Turnos: derecha",1); settings.add_item("Turnos: izquierda",2)
	settings.position=Vector2(10,160); layer.add_child(settings)
	var preferences:=ConfigFile.new()
	if preferences.load("user://combat-ui.cfg")==OK: initiative_position=str(preferences.get_value("ui","turn_line","top"))
	if initiative_position not in ["top","right","left"]: initiative_position="top"
	settings.select(["top","right","left"].find(initiative_position))
	settings.item_selected.connect(func(index):
		initiative_position=["top","right","left"][index]
		preferences.set_value("ui","turn_line",initiative_position); preferences.save("user://combat-ui.cfg"); refresh()
	)
	settings.visible=false; settings.set_meta("combat_setting",true)
	var dm_tools:=HFlowContainer.new(); dm_tools.name="CombatDmTools"; dm_tools.set_anchors_preset(Control.PRESET_BOTTOM_LEFT); dm_tools.position=Vector2(220,-88); dm_tools.size=Vector2(620,80); layer.add_child(dm_tools)
	_button(dm_tools,"Añadir Silverfarben",func(): add_silverfarben())
	_button(dm_tools,"Añadir Anteros",func(): add_anteros())
	_button(dm_tools,"Concentración",func(): concentration_menu())
	_button(dm_tools,"Reacción",func(): reaction_menu())
	_button(dm_tools,"Conocimiento",func(): knowledge_menu())
	_button(dm_tools,"Ficha combate",func(): edit_combatant())
	_button(dm_tools,"Guardar combate local",func(): save_local())
	_button(dm_tools,"Cargar combate local",func(): restore_local())
	dm_tools.set_meta("dm_only",true)

func _button(parent: Node,label: String,action: Callable) -> Button:
	var button:=Button.new(); button.text=label; ThemeKit.style_button(button,"secondary",8,9,6); button.pressed.connect(action); parent.add_child(button); return button

func _clear(node: Node) -> void:
	for child in node.get_children(): node.remove_child(child); child.queue_free()

func refresh() -> void:
	if ui==null or layer==null or _refreshing: return
	_refreshing=true
	_sync_ui_state()
	var projector: bool=ui.current_role=="projector"
	for child in layer.get_children():
		if child.get_meta("dm_only",false): child.visible=ui.current_role=="dm"
		if child.get_meta("combat_setting",false): child.visible=false
	ui.player_hud.combat_strip.hide(); ui.player_hud.combat_notice_panel.hide()
	ui.player_hud.exploration_menu.hide()
	ui.player_hud.scene_notice_panel.visible=not rules.active and ui.show_scene_notice
	ui.player_hud.end_turn_btn.visible=rules.active
	if not rules.active: ui.player_hud.status_chip.text="Exploración"
	elif rules.initiative_pending: ui.player_hud.status_chip.text="Iniciativa pendiente"
	var selected: Dictionary=rules.actors.get(str(ui.selected_actor_id),{})
	if not selected.is_empty():
		ui.player_hud.hp_btn.text="♥ PG %d/%d" % [selected.hp,selected.hp_max]
		if selected.dead: ui.player_hud.status_chip.text="Muerto"
		elif selected.defeated: ui.player_hud.status_chip.text="Estable" if selected.stable else "Inconsciente"
		elif rules.active and not rules.initiative_pending: ui.player_hud.status_chip.text="¡Tu turno!" if rules.current_id()==str(ui.selected_actor_id) else "En combate"
	if rules.sequence.is_empty(): _continuation_key=""
	elif rules.pending.is_empty() and str(rules.sequence.actor)==acting_id():
		var key: String=str(rules.sequence.actor)+":"+str(rules.sequence.action)+":"+str(rules.sequence.remaining)
		if key!=_continuation_key:
			_continuation_key=key; armed=rules.action_for(acting_id(),str(rules.sequence.action)).duplicate(true); wheel_open=false
	timeline.visible=rules.active; prompt.visible=false
	_refresh_timeline()
	var actor: Dictionary=rules.actors.get(acting_id(),{})
	budget.visible=rules.active and not projector
	budget.text="Movimiento %.1f m · Acción %s · Adicional %s · Reacción %s" % [float(actor.get("movement",0)),"—" if actor.get("action_used",false) else "●","—" if actor.get("bonus_used",false) else "●","—" if actor.get("reaction_used",false) else "●"]
	if rules.initiative_pending:
		hint.text="Esperando iniciativas físicas · sin tiradas automáticas"
		if not projector: _initiative_prompt()
	elif not rules.pending.is_empty():
		hint.text=""
		if not projector and rules.pending.get("kind","") not in ["guided","basic","withdraw"]: _roll_prompt()
	else: hint.text=""
	_refresh_action_tray()
	_refresh_wheel()
	for panel in [prompt,dialog]:
		for label in panel.find_children("*","Label",true,false):
			label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
			label.custom_minimum_size.x=minf(110 if label.get_parent() is HBoxContainer else 460,layer.size.x-64)
		panel.custom_minimum_size.x=minf(520,layer.size.x-32)
		panel.position.x=-panel.custom_minimum_size.x*.5
	if dialog.visible or ui.current_role=="player" and ui.player_hud.modal_backdrop.visible: prompt.hide(); wheel.hide(); action_tray.hide()
	_layout.call_deferred()
	ui.player_hud.end_turn_btn.disabled=rules.initiative_pending or not rules.pending.is_empty() or rules.current_id()!=str(ui.selected_actor_id)
	_refreshing=false

func _layout() -> void:
	if layer==null: return
	var viewport:=layer.get_viewport_rect().size
	_layout_viewport=viewport
	var margin:=57.0
	var min_line:=timeline.get_combined_minimum_size()
	timeline.set_anchors_preset(Control.PRESET_TOP_LEFT)
	timeline.position=Vector2((viewport.x-min_line.x)*.5,margin) if initiative_position=="top" else Vector2(viewport.x-margin-min_line.x if initiative_position=="right" else margin,maxf(margin,(viewport.y-min_line.y)*.5))
	for panel in [prompt,dialog]:
		panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
		panel.size=panel.get_combined_minimum_size()
		panel.position=Vector2(maxf(16,(viewport.x-panel.size.x)*.5),maxf(150,(viewport.y-panel.size.y)*.5))
	hint.set_anchors_preset(Control.PRESET_TOP_LEFT); hint.position=Vector2((viewport.x-580)*.5,185)
	var notices: Control=ui.player_hud.toast_panel.get_parent()
	notices.set_anchors_preset(Control.PRESET_TOP_LEFT); notices.size=notices.get_combined_minimum_size()
	notices.position=Vector2((viewport.x-notices.size.x)*.5,140 if rules.active else 60)
	budget.set_anchors_preset(Control.PRESET_TOP_LEFT); budget.position=Vector2((viewport.x-600)*.5,viewport.y-56)
	action_tray.position=Vector2(maxf(16,(viewport.x-560)*.5),viewport.y-170); action_tray.size=Vector2(minf(560,viewport.x-32),0)
	var tools:=layer.get_node_or_null("CombatDmTools")
	if tools: tools.set_anchors_preset(Control.PRESET_TOP_LEFT); tools.position=Vector2(220,viewport.y-145)
	# Containers own their children's coordinates. Position the whole dock;
	# placing a child at viewport coordinates would move it off screen.
	var actions: Control=ui.player_hud.action_toggle_btn.get_parent().get_parent()
	actions.set_anchors_preset(Control.PRESET_TOP_LEFT); actions.size=actions.get_combined_minimum_size()
	actions.position=Vector2(maxf(16,viewport.x-actions.size.x-22),viewport.y-actions.size.y-22)
	if ui.preferences: ui.preferences._layout_key=""; ui.preferences._layout_controls()

func _sync_ui_state() -> void:
	ui.combat_active=rules.active; ui.combat_round=rules.round_number; ui.combat_turn_idx=rules.turn_index
	ui.combat_order.clear()
	for id in rules.order:
		var a: Dictionary=rules.actors[id]
		ui.combat_order.append({"id":id,"name":a.name,"kind":a.kind,"init":int(a.init) if a.init!=null else 0,"color":a.get("color",Color.WHITE)})
	for list in [ui.actors,ui.enemies]:
		for actor in list:
			if rules.actors.has(actor.id): actor.hp=rules.actors[actor.id].hp

func _portrait(id: String) -> Texture2D:
	if portraits.has(id): return portraits[id]
	var body:=token(id)
	if body==null or body.get("sprite")==null or body.sprite.texture==null: return Catalogue.icon("actions")
	var texture: Texture2D=body.sprite.texture
	var atlas:=AtlasTexture.new(); atlas.atlas=texture; atlas.region=Rect2(0,0,texture.get_width(),texture.get_height()*.52); portraits[id]=atlas; return atlas

func _refresh_timeline() -> void:
	_clear(timeline)
	var vertical: bool=initiative_position!="top"
	timeline.vertical=vertical
	for entry in rules.timeline():
		var actor: Dictionary=rules.actors[entry.id]
		var box:=VBoxContainer.new(); timeline.add_child(box)
		var portrait:=TextureRect.new(); portrait.texture=_portrait(str(entry.id)); portrait.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; portrait.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; portrait.custom_minimum_size=Vector2(54,54) if entry.offset==0 else Vector2(42,42)
		box.add_child(portrait)
		portrait.modulate=Color(1,1,1,.45) if entry.offset>3 else Color.WHITE
		var caption: String=("Por tirar" if entry.init==null else "Inic. %d" % int(entry.init)) if rules.initiative_pending else "Ahora" if entry.offset==0 else "+%d · R%d" % [entry.offset,entry.round]
		box.add_child(ThemeKit.make_label(caption,11,ThemeKit.COL_HEADING))
		portrait.tooltip_text=_knowledge(str(entry.id)); portrait.mouse_filter=Control.MOUSE_FILTER_STOP
		portrait.gui_input.connect(func(event):
			if event is InputEventScreenTouch:
				portrait.set_meta("pressed",event.pressed)
				if event.pressed:
					get_tree().create_timer(.55).timeout.connect(func():
						if is_instance_valid(portrait) and portrait.get_meta("pressed",false): _show_knowledge(str(entry.id))
					)
		)

func _knowledge(id: String) -> String:
	var actor: Dictionary=rules.actors[id]
	if _is_known(id): return "%s\nPG %d/%d · CA %d · Vel. %.1f m\n%s" % [actor.name,actor.hp,actor.hp_max,actor.ac,actor.speed,", ".join(actor.conditions)]
	return str(actor.name)+"\nInformación no investigada"

func _is_known(id: String) -> bool:
	var actor: Dictionary=rules.actors.get(id,{})
	return actor.get("kind","")=="player" or ui.current_role=="dm" or actor.get("known",false) or ui.current_role=="player" and str(ui.selected_actor_id) in actor.get("known_by",[])

func _show_knowledge(id: String) -> void:
	if not rules.pending.is_empty() or rules.initiative_pending: return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label(_knowledge(id),15,ThemeKit.COL_HEADING))
	_button(list,"Cerrar",func(): dialog.hide()); dialog.show(); refresh()

func knowledge_menu(viewer: String="") -> void:
	if ui.current_role!="dm": return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Información investigada · decide el DM según la ficción",15,ThemeKit.COL_HEADING))
	var viewers: Array[String]=[""]; var choice:=OptionButton.new(); choice.add_item("Conocimiento compartido con todo el grupo"); list.add_child(choice)
	for actor in ui.actors: viewers.append(str(actor.id)); choice.add_item(str(actor.name))
	choice.select(maxi(0,viewers.find(viewer))); choice.item_selected.connect(func(index): knowledge_menu(viewers[index]))
	for id in rules.actors:
		if rules.actors[id].kind!="enemy": continue
		var check:=CheckBox.new(); check.text=rules.actors[id].name; check.button_pressed=rules.actors[id].get("known",false) if viewer.is_empty() else viewer in rules.actors[id].known_by; list.add_child(check)
		check.toggled.connect(func(value):
			if viewer.is_empty(): rules.actors[id].known=value
			elif value and viewer not in rules.actors[id].known_by: rules.actors[id].known_by.append(viewer)
			elif not value: rules.actors[id].known_by.erase(viewer)
			refresh()
		)
	_button(list,"Cerrar",func(): dialog.hide()); dialog.show(); refresh()

func edit_combatant(selected: String="") -> void:
	if ui.current_role!="dm": return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Ajustes de combate · resolución del DM",16,ThemeKit.COL_HEADING))
	var who:=OptionButton.new(); var ids: Array=[]; list.add_child(who)
	for id in rules.actors: ids.append(id); who.add_item(str(rules.actors[id].name))
	if selected.is_empty(): selected=acting_id()
	who.select(maxi(0,ids.find(selected)))
	who.item_selected.connect(func(index): edit_combatant(str(ids[index])))
	var actor: Dictionary=rules.actors[selected]
	var armor:=_number_field(list,"CA efectiva",actor.ac,0,50)
	var movement:=_number_field(list,"Movimiento restante (m)",actor.movement,0,300)
	movement.step=.1
	var conditions:=LineEdit.new(); conditions.text=", ".join(actor.conditions); conditions.placeholder_text="Condiciones separadas por comas"; list.add_child(conditions)
	var resources: Dictionary={}
	for id in actor.resources:
		resources[id]=_number_field(list,str(actor.resources[id].get("label",id)),actor.resources[id].current,0,actor.resources[id].get("max",99))
	var ammunition: Dictionary={}
	for id in actor.get("ammunition",{}): ammunition[id]=_number_field(list,"Munición · "+str(id),actor.ammunition[id],0,10000)
	_button(list,"Aplicar resolución",func():
		actor.ac=int(armor.value); actor.movement=float(movement.value)
		actor.conditions.clear()
		for entry in conditions.text.split(","):
			var value:=entry.strip_edges().to_lower()
			if not value.is_empty(): rules.add_condition(selected,value)
		for id in resources: actor.resources[id].current=int(resources[id].value)
		for id in ammunition: actor.ammunition[id]=int(ammunition[id].value)
		dialog.hide(); rules.changed.emit(); refresh()
	)
	_button(list,"Cancelar",func(): dialog.hide()); dialog.show(); refresh()

func _number_field(parent: Node,label: String,value: float,minimum: float,maximum: float) -> SpinBox:
	var row:=HBoxContainer.new(); parent.add_child(row); row.add_child(ThemeKit.make_label(label,13,ThemeKit.COL_INK))
	var input:=SpinBox.new(); input.min_value=minimum; input.max_value=maximum; input.value=value; row.add_child(input); return input

func concentration_menu() -> void:
	if ui.current_role!="dm": return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Finalizar concentración · no consume acción",15,ThemeKit.COL_HEADING))
	for id in rules.actors:
		if not str(rules.actors[id].concentration).is_empty(): _button(list,str(rules.actors[id].name)+" · "+str(rules.actors[id].concentration),func(): rules.end_concentration(id); dialog.hide(); refresh())
	_button(list,"Cerrar",func(): dialog.hide()); dialog.show(); refresh()

func _initiative_prompt() -> void:
	_clear(prompt); var list:=VBoxContainer.new(); prompt.add_child(list)
	list.add_child(ThemeKit.make_label("Iniciativa · introduce el total físico",17,ThemeKit.COL_HEADING))
	for id in rules.order:
		var a: Dictionary=rules.actors[id]
		if a.init!=null: continue
		if ui.current_role!="dm" and id!=str(ui.selected_actor_id): continue
		if ui.current_role=="dm" and a.kind=="player": continue
		var row:=HBoxContainer.new(); list.add_child(row); row.add_child(ThemeKit.make_label(str(a.name),14,ThemeKit.COL_INK))
		var input:=SpinBox.new(); input.min_value=-20; input.max_value=100; input.value=10; row.add_child(input)
		_button(row,"Registrar",func(): rules.submit_initiative(id,int(input.value)); _after_start())
	list.add_child(ThemeKit.make_label("Cada jugador registra su iniciativa; el DM registra PNJ.\nLos empates conservan el orden de participantes elegido por el DM.",11,ThemeKit.COL_MUTED))
	if ui.current_role=="dm": _button(list,"Cancelar combate",func(): end_combat())
	prompt.show()

func _roll_prompt() -> void:
	_clear(prompt); var list:=VBoxContainer.new(); prompt.add_child(list)
	var p: Dictionary=rules.pending; var owner: Dictionary=rules.actors.get(p.owner,{})
	var roll_label: String=str(p.get("label","Tirada física"))
	if owner.get("kind","")=="enemy" and not _is_known(str(p.owner)): roll_label="El DM resuelve los dados de "+str(owner.name)
	elif p.kind=="attack" and rules.actors[p.target].kind=="enemy" and not _is_known(str(p.target)): roll_label=roll_label.split("contra CA")[0]+"· defensa no investigada"
	list.add_child(ThemeKit.make_label(roll_label,14,ThemeKit.COL_HEADING))
	list.add_child(ThemeKit.make_label("Tira: "+str(owner.get("name","DM")),13,ThemeKit.COL_INK))
	if p.kind=="death": list.add_child(ThemeKit.make_label("Éxitos %d/3 · Fallos %d/3" % [owner.death_success,owner.death_failure],13,ThemeKit.COL_HEADING))
	if p.kind=="opportunity":
		var allowed: bool=ui.current_role=="dm" if owner.get("kind","")=="enemy" else ui.current_role=="player" and str(ui.selected_actor_id)==str(p.owner)
		if allowed:
			_button(list,"Usar reacción · ataque de oportunidad",func():
				var previous: Dictionary=rules.pending.duplicate(true); rules.pending.clear()
				if not rules.react(str(previous.owner),str(previous.action_id),str(previous.target),"opportunity"): ui.notify_mesa(rules.last_error)
				refresh()
			)
			_button(list,"No usar reacción",func(): rules.pending.clear(); refresh())
		prompt.show(); return
	var can_submit: bool=ui.current_role=="dm" if p.kind in ["guided","basic","withdraw"] else (ui.current_role=="dm" if owner.get("kind","")=="enemy" else ui.current_role=="player" and str(ui.selected_actor_id)==str(p.owner))
	if can_submit:
		amount=SpinBox.new(); amount.min_value=0 if p.kind=="damage" else 1; amount.max_value=10000 if p.kind=="damage" else 20; amount.value=1 if p.kind in ["guided","basic","withdraw"] else 10; list.add_child(amount)
		if p.get("save_uses_total",false): amount.min_value=-20; amount.max_value=100
		if p.kind=="blocked": amount.min_value=1; amount.max_value=1; amount.value=1
		_button(list,"Confirmar bloqueo" if p.kind=="blocked" else "Confirmar efecto del DM" if p.kind in ["guided","basic","withdraw"] else "Confirmar dado físico",func():
			var ok: bool=rules.submit(int(amount.value),str(p.owner),str(Time.get_ticks_usec()))
			if not ok: ui.notify_mesa(rules.last_error)
			refresh()
		)
	else: list.add_child(ThemeKit.make_label("Esperando a quien tiene este dado. F1/F2 cambia la vista local.",12,ThemeKit.COL_MUTED))
	if not p.get("committed",false) and (ui.current_role=="dm" or str(ui.selected_actor_id)==str(p.get("actor",""))): _button(list,"Cancelar",func(): rules.cancel(); armed.clear(); refresh())
	prompt.show()

func selected_action_id() -> String:
	if not armed.is_empty(): return str(armed.id)
	if rules.pending.get("actor","")==acting_id() and not rules.pending.get("committed",false): return str(rules.pending.get("action",{}).get("id",rules.pending.get("basic","withdraw" if rules.pending.get("kind","")=="withdraw" else "")))
	return ""

func cancel_selection() -> void:
	if not rules.pending.is_empty():
		if rules.pending.get("actor","")!=acting_id() or not rules.cancel(): ui.notify_mesa("Termina de resolver el resultado confirmado."); return
	armed.clear(); action_options.clear(); preview_valid=false; preview_target=""; wheel_open=true; refresh()

func _refresh_action_tray() -> void:
	_clear(action_tray)
	action_tray.visible=ui.current_role!="projector" and not rules.initiative_pending and (not armed.is_empty() or rules.pending.get("kind","") in ["guided","basic","withdraw"])
	if not action_tray.visible: return
	if not rules.pending.is_empty():
		var p: Dictionary=rules.pending
		var caption:=ThemeKit.make_label("DM · "+str(p.get("action",{}).get("label",p.get("basic","Resolución"))).split("·")[0]+" · resolver efecto",13,ThemeKit.COL_HEADING); caption.tooltip_text=str(p.get("label","")); action_tray.add_child(caption)
		if ui.current_role=="dm": _button(action_tray,"Aplicar resolución",func(): rules.submit(1,str(p.owner),str(Time.get_ticks_usec())); refresh())
		else: action_tray.add_child(ThemeKit.make_label("Pendiente del DM · vuelve a pulsar la acción para quitarla",12,ThemeKit.COL_MUTED))
		return
	var mode:=Targeting.mode(armed); var geometry:=Targeting.geometry(armed)
	var instruction: String="Marca la dirección del cono" if geometry.get("placement","")=="direction" else "Marca la zona en el terreno" if mode=="point" else "Toca el objeto en el mapa" if mode=="object" else "Toca una criatura en el mapa"
	var label:=ThemeKit.make_label(instruction,14,ThemeKit.COL_HEADING); label.add_theme_constant_override("outline_size",3); label.add_theme_color_override("font_outline_color",Color.BLACK); action_tray.add_child(label)
	if mode=="object":
		var field:=LineEdit.new(); field.name="ObjectDescription"; field.placeholder_text="Objeto al alcance (o tócalo en el mapa)"; field.text=action_options.get("object_label",""); field.custom_minimum_size=Vector2(330,36); action_tray.add_child(field); field.text_changed.connect(func(value): action_options.object_label=value)
	if armed.get("basic",false) or armed.get("resolution","")=="guided" or armed.get("healing",false): return
	var options:=HBoxContainer.new(); action_tray.add_child(options)
	for option in [["advantage","Ventaja"],["knockout","No letal"],["sneak","Furtivo"]]:
		if option[0]=="knockout" and armed.get("range",{}).get("kind","")!="melee": continue
		if option[0]=="sneak" and not rules.actors[acting_id()].traits.has("sneakAttackDice"): continue
		var box:=CheckBox.new(); box.text=option[1]; box.button_pressed=action_options.get(option[0],false); options.add_child(box); box.toggled.connect(func(value): action_options[option[0]]=value)

func _refresh_wheel() -> void:
	var old_focus:=get_viewport().gui_get_focus_owner()
	var restore_focus: bool=old_focus!=null and wheel.is_ancestor_of(old_focus)
	var focus_name: String=old_focus.name if restore_focus else ""
	var focus_candidates: Array[Button]=[]
	_clear(wheel)
	wheel.visible=wheel_open and ui.current_role!="projector" and not rules.initiative_pending and (rules.pending.is_empty() or not selected_action_id().is_empty())
	if not wheel.visible: return
	var id:=acting_id(); var actor: Dictionary=rules.actors.get(id,{})
	if actor.is_empty(): return
	var items: Array=[]
	if category.is_empty():
		for group in [["weapons","Ataques"],["cantrips","Trucos"],["spells","Conjuros"],["other","Otras acciones"]]:
			var count: int=actor.actions.filter(func(action): return _action_category(action)==group[0]).size()
			if group[0]=="other": count+=Catalogue.BASIC.size()
			items.append({"id":group[0],"label":group[1],"category":true,"count":count})
	else:
		for action in actor.actions:
			if _action_category(action)==category: items.append(action)
		if category=="other":
			for key in Catalogue.BASIC: items.append({"id":key,"label":Catalogue.BASIC[key],"basic":true})
			if rules.active: items.append({"id":"withdraw","label":"Huir","basic":true})
			if not str(actor.concentration).is_empty(): items.append({"id":"end-concentration","label":"Terminar concentración","basic":true})
	var viewport:=layer.get_viewport_rect().size
	var origin: Vector2=ui.player_hud.action_toggle_btn.get_global_rect().get_center()
	_wheel_origin=origin
	var capacity:=4; var pages:=maxi(1,ceili(items.size()/float(capacity))); page=clampi(page,0,pages-1)
	var visible_items: Array=items.slice(page*capacity,mini(items.size(),(page+1)*capacity))
	var captions: Array=visible_items.map(func(item): return str(item.label).split("·")[0].strip_edges().replace("Otras acciones","Otras"))
	var reserved: Array[Rect2]=[ui.player_hud.action_toggle_btn.get_parent().get_parent().get_global_rect().grow(8),ui.player_hud.joystick.get_parent().get_global_rect().grow(8)]
	var layout:=preload("res://combat/radial_layout.gd").arrange(origin,viewport,captions,60,reserved)
	var rose:=preload("res://combat/action_rose.gd").new(); rose.name="FloatingActionRose"; rose.reduced_motion=ui.preferences.values.reducedMotion if ui.preferences else false; rose.size=viewport; rose.origin=origin; rose.points.assign(layout.points); wheel.add_child(rose)
	var feedback:=ThemeKit.make_label("",12,ThemeKit.COL_HEADING); feedback.position=Vector2(maxf(12,viewport.x*.5-280),viewport.y-208); feedback.size=Vector2(minf(560,viewport.x-24),30); feedback.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; feedback.clip_text=true; feedback.mouse_filter=Control.MOUSE_FILTER_IGNORE; feedback.add_theme_color_override("font_outline_color",Color.BLACK); feedback.add_theme_constant_override("outline_size",3); rose.add_child(feedback)
	var selected:=selected_action_id()
	for index in range(visible_items.size()):
		var item: Dictionary=visible_items[index]; var point: Vector2=layout.points[index]
		var button:=Button.new(); button.name="CombatIcon_"+str(item.id); button.icon=Catalogue.icon(str(item.id)); button.icon_alignment=HORIZONTAL_ALIGNMENT_CENTER; button.expand_icon=true; button.add_theme_constant_override("icon_max_width",32); button.custom_minimum_size=Vector2(60,60); button.size=Vector2(60,60); button.position=point-Vector2(30,30)
		var is_selected: bool=str(item.id)==selected
		ThemeKit.style_button(button,"pill_active" if is_selected else "pill",999,12,10); button.tooltip_text=str(item.label); button.focus_mode=Control.FOCUS_ALL; rose.add_child(button)
		var detail: String=Targeting.label(item)
		if item.get("category",false): button.disabled=int(item.count)==0; detail="%d opciones" % int(item.count)
		elif not is_selected and item.id not in ["withdraw","end-concentration"]:
			var issue: String=rules.availability(id,item); button.disabled=not issue.is_empty()
			if not issue.is_empty(): detail=issue
		if is_selected: detail="Seleccionada · pulsa para quitarla"
		button.tooltip_text+="\n"+detail
		if button.disabled: button.modulate.a=.45
		if layout.captions:
			var label:=ThemeKit.make_label(captions[index],14,ThemeKit.COL_GOLD_BRIGHT if is_selected else ThemeKit.COL_HEADING); var width:=clampf(str(captions[index]).length()*7.8+14,60,152); label.position=point+Vector2(-width*.5,33); label.size=Vector2(width,24); label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; label.clip_text=true; label.mouse_filter=Control.MOUSE_FILTER_IGNORE; label.add_theme_color_override("font_outline_color",Color(0,0,0,.95)); label.add_theme_constant_override("outline_size",3); rose.add_child(label)
		var full_hint: String=str(item.label).split("·")[0]+" · "+detail
		button.mouse_entered.connect(func(): feedback.text=full_hint); button.mouse_exited.connect(func(): feedback.text=""); button.focus_entered.connect(func(): feedback.text=full_hint)
		if not button.disabled: focus_candidates.append(button)
		button.pressed.connect(func():
			if item.get("category",false): category=item.id; page=0; refresh()
			elif item.get("basic",false): _basic(str(item.id))
			else: choose_action(str(item.id))
		)
	var upward: bool=origin.y>viewport.y*.5
	var nav:=HBoxContainer.new(); nav.position=origin+Vector2(-55,-100 if upward else 58); rose.add_child(nav)
	if not category.is_empty(): _button(nav,"↶",func(): category=""; page=0; refresh()).tooltip_text="Volver a categorías"
	if pages>1:
		var previous:=_button(nav,"‹",func(): page=maxi(0,page-1); refresh()); previous.disabled=page==0
		nav.add_child(ThemeKit.make_label("%d/%d" % [page+1,pages],12,ThemeKit.COL_MUTED))
		var next:=_button(nav,"›",func(): page=mini(pages-1,page+1); refresh()); next.disabled=page==pages-1
	if restore_focus and not focus_candidates.is_empty():
		var next_focus: Button=focus_candidates[0]
		for button in focus_candidates:
			if button.name==focus_name: next_focus=button
		next_focus.grab_focus.call_deferred()

func _action_category(action: Dictionary) -> String:
	if str(action.get("resource",{}).get("id","")).begins_with("spell-slot") or action.get("kind","")=="spell": return "spells"
	if action.get("kind","")=="cantrip" or action.get("id","") in ["fire-bolt","ray-of-frost","sacred-flame"]: return "cantrips"
	if action.get("resolution","")=="guided": return "other"
	return "weapons"

func choose_action(action_id: String) -> void:
	if selected_action_id()==action_id: cancel_selection(); return
	if not rules.pending.is_empty(): ui.notify_mesa("Termina la resolución pendiente."); return
	armed=rules.action_for(acting_id(),action_id).duplicate(true)
	if armed.is_empty(): return
	wheel_open=true; target_id=""; action_options.clear(); preview_valid=false; preview_target=""
	if category.is_empty(): category=_action_category(armed)
	var body:=token(acting_id()); var shape:=Targeting.geometry(armed)
	if body and not shape.is_empty(): update_preview_point(body.global_position+body.get_parent().global_basis*Vector3.FORWARD*float(shape.radius))
	ui.player_hud.close_modals(); refresh()
	if Targeting.mode(armed) in ["none","self"]: declare_target(acting_id(),token(acting_id()).global_position if token(acting_id()) else Vector3.ZERO)

func declare_target(id: String,point:=Vector3.ZERO) -> void:
	if armed.is_empty(): return
	var actor_id:=acting_id()
	if armed.get("basic",false):
		var context:=action_options.duplicate(true); context["target"]=id; context["point"]=point
		if rules.request_basic(actor_id,str(armed.id),str(armed.label),"",context): armed.clear()
		else: ui.notify_mesa(rules.last_error)
		refresh(); return
	if not rules.active and Targeting.mode(armed)=="enemy" and not armed.get("healing",false):
		if not rules.actors.has(id) or rules.actors[id].dead: ui.notify_mesa("Elige una criatura válida."); return
		var range_data: Dictionary=armed.get("range",{})
		if rules.distance(actor_id,id)>float(range_data.get("longMeters",range_data.get("normalMeters",1.5)))+.15: ui.notify_mesa("Objetivo fuera de alcance."); return
		_opening={"actor":actor_id,"action":str(armed.id),"target":id,"point":point}
		if ui.current_role=="dm": show_roster([actor_id,id])
		else:
			ui.dm_requests.insert(0,{"id":"combat-opening","actor":rules.actors[actor_id].name,"action":"Declarar ataque y pedir iniciativa","skill":str(armed.label),"zone":ui.get_current_zone_display()}); ui.notify_mesa("Ataque declarado: el DM selecciona implicados e inicia iniciativa.")
		return
	var origin:=token(actor_id)
	var options: Dictionary={"point":point,"range_point":origin.get_parent().to_local(point) if origin else point,"trigger":trigger}
	options.merge(action_options,true)
	if rules.declare(actor_id,str(armed.id),id,options): armed.clear()
	else: ui.notify_mesa(rules.last_error)
	refresh()

func _basic(kind: String) -> void:
	if selected_action_id()==kind: cancel_selection(); return
	if not rules.pending.is_empty(): ui.notify_mesa("Termina la resolución pendiente."); return
	armed.clear(); preview_valid=false; preview_target=""; action_options.clear()
	if kind=="end-concentration": rules.end_concentration(acting_id()); refresh(); return
	if kind=="ready": _choose_ready(); return
	if kind=="withdraw": rules.request_withdraw(acting_id()); wheel_open=false; refresh(); return
	if kind in ["help","influence","use-object","search"]:
		armed={"id":kind,"label":Catalogue.BASIC[kind],"basic":true,"target_mode":Targeting.mode({"id":kind})}; action_options.clear(); preview_valid=false; wheel_open=true; refresh(); return
	if kind in ["dash","dodge","disengage"]:
		if not rules.basic(acting_id(),kind): ui.notify_mesa(rules.last_error)
		refresh(); return
	if not rules.request_basic(acting_id(),kind,Catalogue.BASIC[kind]): ui.notify_mesa(rules.last_error)
	wheel_open=false; refresh()

func _choose_ready() -> void:
	var id:=acting_id()
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Preparar · elige acción y declara un desencadenante al DM",15,ThemeKit.COL_HEADING))
	var choices:=OptionButton.new(); var ids: Array[String]=[]; list.add_child(choices)
	for action in rules.actors[id].actions:
		if action.get("actionCost","action")!="action" or not str(action.get("castingTime","")).is_empty(): continue
		if not rules.availability(id,action).is_empty(): continue
		choices.add_item(str(action.label)); ids.append(str(action.id))
	list.add_child(ThemeKit.make_label("Un conjuro gasta el espacio al prepararlo y exige concentración hasta liberarlo. El ataque y el daño se tiran cuando ocurre el desencadenante.",12,ThemeKit.COL_MUTED))
	_button(list,"Preparar con el DM",func():
		if choices.selected<0: return
		if rules.request_basic(id,"ready","Preparar "+str(rules.action_for(id,ids[choices.selected]).label),ids[choices.selected]): dialog.hide(); wheel_open=false
		else: ui.notify_mesa(rules.last_error)
		refresh()
	)
	_button(list,"Cancelar",func(): dialog.hide(); refresh()); dialog.show(); refresh()

func show_roster(preselected: Array=[]) -> void:
	if ui.current_role!="dm": return
	if rules.active: ui.notify_mesa("Termina el encuentro actual antes de elegir otro."); return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Implicados · iniciativa con dados físicos",16,ThemeKit.COL_HEADING))
	var checks: Dictionary={}
	for id in rules.actors:
		var body:=token(id)
		if body==null or not body.is_visible_in_tree(): continue
		var box:=CheckBox.new(); box.text=str(rules.actors[id].name); box.button_pressed=id in preselected or preselected.is_empty() and not rules.actors[id].defeated; list.add_child(box); checks[id]=box
	_button(list,"Pedir iniciativas",func():
		var ids: Array=[]
		for id in checks:
			if checks[id].button_pressed: ids.append(id)
		if rules.start(ids): dialog.hide(); wheel_open=true; category=""; _fit_encounter(); ui.refresh_all(); refresh()
		else: ui.notify_mesa(rules.last_error)
	)
	_button(list,"Cancelar",func(): dialog.hide()); dialog.show()

func _after_start() -> void:
	if not rules.initiative_pending:
		wheel_open=true
		if not _opening.is_empty() and rules.current_id()==_opening.actor: armed=rules.action_for(str(_opening.actor),str(_opening.action)).duplicate(true)
		_opening.clear()
	ui.refresh_all(); refresh()

func next_turn() -> void:
	var previous_round: int=rules.round_number
	if not rules.next_turn(str(ui.selected_actor_id),ui.current_role=="dm"): ui.notify_mesa(rules.last_error)
	if rules.round_number>previous_round: ui.advance_clock_seconds((rules.round_number-previous_round)*6)
	armed.clear(); wheel_open=true; page=0; ui.refresh_all(); refresh()

func end_combat() -> void:
	if ui.current_role!="dm": return
	rules.finish("Combate cancelado/finalizado por el DM"); armed.clear(); wheel_open=false; ui.refresh_all(); refresh()

func _resolved(event: Dictionary) -> void:
	_sync_ui_state()
	if event.get("type","")=="end":
		if ui.camera: ui.camera.end_combat_framing()
		armed.clear(); wheel_open=false
		ui.notify_mesa(str(event.label))
	elif event.get("type","")=="action":
		visuals.play(event)
		wheel_open=true; category=""; page=0
		ui.notify_mesa("%s · %s%s" % [rules.actors[event.actor].name,str(event.action.label).split("·")[0]," · %d" % event.amount if int(event.amount)>0 else ""])
	elif event.get("type","")=="basic":
		var body:=token(str(event.actor))
		if body: body.play_action_animation({"ready":"combat_idle","dash":"run","hide":"stealth","disengage":"disengage","dodge":"dodge","help":"help","influence":"influence","use-object":"interact"}.get(event.action.id,"interact"),.65)
	ui.refresh_all(); refresh()

func _process(delta: float) -> void:
	if ui==null: return
	var focus:=get_viewport().gui_get_focus_owner()
	var typing: bool=focus!=null and action_tray.is_ancestor_of(focus) and (focus is LineEdit or focus is TextEdit)
	for body in ui.tokens_by_node.values(): body.set_meta("combat_text_input",typing)
	_sync_positions()
	if wheel_open and not _wheel_origin.is_equal_approx(ui.player_hud.action_toggle_btn.get_global_rect().get_center()): _refresh_wheel()
	if not _layout_viewport.is_equal_approx(layer.get_viewport_rect().size): _layout()
	clock_accum+=delta
	if clock_accum>.3:
		clock_accum=0; budget.text="Movimiento %.1f m · Acción %s · Adicional %s · Reacción %s" % _budget_values()
		if rules.active and not armed.is_empty(): _ensure_target_visible()

func _budget_values() -> Array:
	var a: Dictionary=rules.actors.get(acting_id(),{})
	return [float(a.get("movement",0)),"—" if a.get("action_used",false) else "●","—" if a.get("bonus_used",false) else "●","—" if a.get("reaction_used",false) else "●"]

func _sync_positions() -> void:
	for id in rules.actors:
		var body:=token(id)
		if body: rules.actors[id].position=body.get_parent().to_local(body.global_position)

func _fit_encounter() -> void:
	if not ui.camera: return
	var points: Array[Vector3]=[]
	for id in rules.order:
		var body:=token(id)
		if body and body.is_visible_in_tree(): points.append(body.global_position)
	if points.is_empty(): return
	if not ui.camera.is_combat_group_mode: ui.camera.toggle_combat_group_view()
	var frame: Dictionary=ui.camera.calculate_encounter_frame(points,4.5)
	if ui.camera.projection==Camera3D.PROJECTION_ORTHOGONAL:
		var extent:=Vector2.ZERO
		for point in points:
			for height in [0.0,2.2]:
				var difference: Vector3=point+Vector3.UP*height-frame.target
				extent=extent.max(Vector2(absf(difference.dot(ui.camera.global_basis.x)),absf(difference.dot(ui.camera.global_basis.y))))
		var viewport:=layer.get_viewport_rect().size
		var aspect:=maxf(.25,viewport.x/maxf(1,viewport.y))
		var view_height:=maxf((extent.y+1.2)*2/.62,(extent.x+1.2)*2/(aspect*.85))
		frame.distance=clampf(view_height/(2*tan(deg_to_rad(ui.camera.fov*.5))),ui.camera.min_distance,ui.camera.max_distance)
	ui.camera.target_focus=frame.target; ui.camera.target_distance=frame.distance

func _ensure_target_visible() -> void:
	var rect:=Rect2(Vector2(40,170),layer.get_viewport_rect().size-Vector2(80,300))
	for id in rules.order:
		var body:=token(id)
		if body and not rules.actors[id].defeated and not rect.has_point(ui.camera.unproject_position(body.global_position+Vector3.UP)):
			_fit_encounter(); return

func can_move(body: Node3D) -> bool:
	if not rules.active: return true
	var id:=str(body.get_meta("combat_id",""))
	if rules.sequence.get("actor","")==id and rules.sequence.get("action","")=="magic-missile": return false
	return id==rules.current_id() and rules.pending.is_empty() and not rules.actors[id].defeated and float(rules.actors[id].movement)>.001

func moved(body: Node3D,before: Vector3) -> void:
	if not rules.active: return
	var id:=str(body.get_meta("combat_id",""))
	if not rules.actors.has(id): return
	var from: Vector3=body.get_parent().to_local(before); var to: Vector3=body.get_parent().to_local(body.global_position)
	if rules.pending.is_empty() and rules.actors[id].get("stance","")!="disengage":
		for other in rules.order:
			var enemy: Dictionary=rules.actors[other]
			if enemy.kind==rules.actors[id].kind or enemy.defeated or enemy.reaction_used: continue
			var key: String=other+":"+id+":"+str(rules.turn_serial)
			if _movement_waivers.has(key): continue
			var old_distance:=maxf(maxf(absf(from.x-enemy.position.x),absf(from.z-enemy.position.z)),absf(from.y-enemy.position.y))
			var new_distance:=maxf(maxf(absf(to.x-enemy.position.x),absf(to.z-enemy.position.z)),absf(to.y-enemy.position.y))
			if old_distance<=1.55 and new_distance>1.55:
				for action in enemy.actions:
					if action.get("range",{}).get("kind","")=="melee":
						_movement_waivers[key]=true; body.global_position=before; body.velocity=Vector3.ZERO
						rules.pending={"kind":"opportunity","owner":other,"target":id,"action_id":action.id,"label":"Sale de tu alcance · ¿usas tu reacción?","committed":true}; refresh(); return
	var meters:=maxf(absf(to.x-from.x),absf(to.z-from.z))
	if not rules.spend_movement(id,meters,bool(rules.actors[id].get("difficult",false))): body.global_position=before; body.velocity.x=0; body.velocity.z=0

func reaction_menu() -> void:
	if ui.current_role!="dm": return
	_clear(dialog); var list:=VBoxContainer.new(); dialog.add_child(list)
	list.add_child(ThemeKit.make_label("Desencadenante de reacción · confirma el DM",16,ThemeKit.COL_HEADING))
	var who:=OptionButton.new(); var ids: Array[String]=[]
	for id in rules.actors:
		if not rules.actors[id].defeated: ids.append(id); who.add_item(str(rules.actors[id].name))
	list.add_child(who)
	var event:=OptionButton.new(); list.add_child(event)
	for label in ["Impacto sobre el lanzador","Caída visible","Acción preparada"]: event.add_item(label)
	var target_choice:=OptionButton.new(); var target_ids: Array[String]=[]; list.add_child(target_choice)
	for id in rules.actors:
		if token(id) and token(id).is_visible_in_tree(): target_ids.append(id); target_choice.add_item(str(rules.actors[id].name))
	var spells:=OptionButton.new(); list.add_child(spells)
	var action_ids: Array[String]=[]
	var rebuild:=func():
		spells.clear(); action_ids.clear()
		if who.selected<0: return
		for action in rules.actors[ids[who.selected]].actions:
			if event.selected==2 and action.id==rules.actors[ids[who.selected]].readied_action or event.selected!=2 and action.get("actionCost","")=="reaction":
				spells.add_item(str(action.label)); action_ids.append(str(action.id))
	who.item_selected.connect(func(_index): rebuild.call()); event.item_selected.connect(func(_index): rebuild.call()); rebuild.call()
	_button(list,"Confirmar desencadenante",func():
		if who.selected<0 or spells.selected<0: return
		var reactor: String=ids[who.selected]
		var selected_action: String=action_ids[spells.selected]
		var target: String=reactor if event.selected==0 or target_choice.selected<0 else target_ids[target_choice.selected]
		var options: Dictionary={}
		if token(target) and token(reactor): options={"point":token(target).global_position,"range_point":token(reactor).get_parent().to_local(token(target).global_position)}
		if rules.react(reactor,selected_action,target,["impact","fall","ready"][event.selected],options): dialog.hide()
		else: ui.notify_mesa(rules.last_error)
		refresh()
	)
	_button(list,"Cerrar",func(): dialog.hide()); dialog.show()

func update_preview_point(point: Vector3,hovered_id: String="") -> void:
	preview_point=point; preview_target=hovered_id; preview_valid=false
	if armed.is_empty(): return
	var origin:=token(acting_id())
	if not origin: return
	var mode:=Targeting.mode(armed); var geometry:=Targeting.geometry(armed)
	var range_data: Dictionary=armed.get("range",{})
	var local_point: Vector3=origin.get_parent().to_local(point)
	var difference: Vector3=local_point-rules.actors[acting_id()].position
	var meters:=maxf(maxf(absf(difference.x),absf(difference.z)),absf(difference.y))
	preview_valid=range_data.is_empty() or meters<=float(range_data.get("longMeters",range_data.get("normalMeters",1.5)))+.15
	if geometry.get("placement","")=="direction": preview_valid=Vector2(difference.x,difference.z).length()>.01
	if mode in ["enemy","ally","creature"]: preview_valid=preview_valid and Targeting.accepts(armed,rules.actors[acting_id()],rules.actors.get(hovered_id,{})) and not rules.actors.get(hovered_id,{}).get("dead",true)

func _preview_at(screen: Vector2) -> void:
	var body: Node3D=ui.map_interaction._token_at(screen)
	if body and body.has_meta("combat_id"):
		update_preview_point(body.global_position,str(body.get_meta("combat_id"))); return
	var hit: Dictionary=ui.map_interaction._pick(screen)
	if hit.is_empty(): preview_valid=false; preview_target=""
	else: update_preview_point(hit.position)

func _input(event: InputEvent) -> void:
	if ui==null or armed.is_empty() or ui.current_role=="projector" or dialog.visible or ui.player_hud.modal_backdrop.visible or not rules.pending.is_empty(): return
	if event is InputEventMouseMotion:
		var hovered:=get_viewport().gui_get_hovered_control()
		if hovered and (wheel.is_ancestor_of(hovered) or action_tray.is_ancestor_of(hovered)): return
		_preview_at(event.position)

func _select_map_point(screen: Vector2) -> void:
	_preview_at(screen)
	var mode:=Targeting.mode(armed)
	if mode in ["enemy","ally","creature"]:
		if preview_target.is_empty(): return
		declare_target(preview_target,preview_point)
	elif mode in ["point","object"]:
		if not preview_valid: ui.notify_mesa("Zona fuera de alcance o sin superficie válida."); return
		if mode=="object" and str(action_options.get("object_label","")).strip_edges().is_empty():
			var hit: Dictionary=ui.map_interaction._pick(screen)
			var node: Node=hit.get("collider")
			while node and str(node.name).begins_with("@"): node=node.get_parent()
			action_options["object_label"]=str(node.name).replace("_"," ") if node else "Objeto señalado a la mesa"
		declare_target("",preview_point)

func _unhandled_input(event: InputEvent) -> void:
	if ui==null or ui.current_role=="projector" or dialog.visible: return
	if event is InputEventKey and event.pressed and event.keycode==KEY_ESCAPE:
		if not selected_action_id().is_empty(): cancel_selection()
		elif wheel_open: wheel_open=false; category=""; refresh()
		get_viewport().set_input_as_handled(); return
	if armed.is_empty() or not rules.pending.is_empty() or ui.player_hud.modal_backdrop.visible: return
	if event is InputEventScreenTouch and event.pressed:
		_last_touch_msec=Time.get_ticks_msec(); _select_map_point(event.position); get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT:
		if Time.get_ticks_msec()-_last_touch_msec<250: return
		_select_map_point(event.position); get_viewport().set_input_as_handled()

func shortcut(body: Node3D,key: int) -> bool:
	if key not in [KEY_K,KEY_L,KEY_H]: return false
	if key!=KEY_H and body.has_meta("combat_id"):
		wheel_open=true; category="spells" if key==KEY_L else "weapons"; page=0; refresh()
	return true

func add_silverfarben() -> void:
	if ui.current_role!="dm" or rules.actors.has("aoife"): return
	var origin: Node3D=ui.get_active_token_node()
	if origin==null: return
	var body: Node3D=load("res://scenes/player_token.tscn").instantiate(); body.name="SilverfarbenToken"; body.token_name="Silverfarben Hotel"; body.target_height=1.37; body.is_active_player=false; body.has_carried_light=false
	if "camera" in body: body.camera=ui.camera
	origin.get_parent().add_child(body)
	if not _place_new_token(body,origin,1.5): body.queue_free(); return
	var p:=Catalogue.profile("aoife")
	var actor: Dictionary={"id":"aoife","node_name":"SilverfarbenToken","name":"Silverfarben Hotel","kind":"player","color":Color("c6ccd9"),"archetype":"Maga enana","class_line":"Maga enana","short_desc":"Maga enana · nivel 1","level":1,"hp":p.get("maxHp",7),"hp_max":p.get("maxHp",7),"ac":p.get("armorClass",12),"speed":p.get("speedMeters",7.5),"initiative_bonus":p.get("initiativeBonus",2),"attacks":[],"spells":[],"features":[],"gear":[],"notes":"Perfil canónico de D8","abilities":{"FUE":10,"DES":14,"CON":14,"INT":14,"SAB":10,"CAR":10}}
	actor["saves"]={"int":4,"wis":2}
	actor.gear=p.get("inventory",[]).duplicate(); actor.features=p.get("sheet",{}).get("features",[]).duplicate()
	for action in Catalogue.actions("aoife"):
		var label:=str(action.label).split("·")[0].strip_edges()
		if _action_category(action) in ["spells","cantrips"]: actor.spells.append({"name":label,"detail":action.label})
		else: actor.attacks.append({"name":label,"bonus":"%+d" % int(action.get("attackBonus",0)),"damage":str(action.get("damageDice","")),"range":"%.1f m" % float(action.get("range",{}).get("normalMeters",1.5))})
	body.set_meta("inventory_input_managed",ui.ui_active)
	ui.actors.append(actor); ui.tokens_by_node[body.name]=body; ui.main_ctrl.party.append(body); rules.register(actor,Catalogue.actions("aoife"),p); body.set_meta("combat_id","aoife"); body.set_meta("combat_controller",self)
	_sync_positions(); ui.refresh_all(); refresh()

func save_local(path: String="user://combat-local.v1.save") -> void:
	if ui.current_role!="dm": return
	_sync_positions()
	var state: Dictionary={"version":1,"scene":get_tree().current_scene.scene_file_path if get_tree().current_scene else "","actors":rules.actors,"order":rules.order,"active":rules.active,"initiative":rules.initiative_pending,"round":rules.round_number,"turn":rules.turn_index,"turn_serial":rules.turn_serial,"pending":rules.pending,"effects":rules.effects,"sequence":rules.sequence,"followups":rules.followups,"interrupted":rules.interrupted,"serial":rules.serial,"completed":rules.completed}
	var file:=FileAccess.open(path,FileAccess.WRITE)
	state["visual_queue"]=rules.visual_queue
	state["character_appearance"]=get_node("CharacterAppearanceService").export_state()
	if file: file.store_var(state,false); ui.notify_mesa("Combate local guardado · no es el guardado de campaña web")

func add_anteros() -> void:
	if ui.current_role!="dm" or rules.actors.has("anteros-temple"): return
	var origin: Node3D=ui.get_active_token_node()
	if origin==null: return
	var body: Node3D=load("res://scenes/player_token.tscn").instantiate(); body.name="AnterosToken"; body.token_name="Anteros"; body.target_height=2.1; body.is_npc=true; body.is_active_player=false; body.has_carried_light=false
	if "camera" in body: body.camera=ui.camera
	origin.get_parent().add_child(body)
	if not _place_new_token(body,origin,4.5): body.queue_free(); return
	var p:=Catalogue.profile("anteros-temple")
	var actor: Dictionary={"id":"anteros-temple","node_name":"AnterosToken","name":"Anteros","kind":"enemy","color":Color("dcad7c"),"hp":p.get("maxHp",71),"hp_max":p.get("maxHp",71),"ac":p.get("armorClass",16),"speed":p.get("speedMeters",9),"initiative_bonus":p.get("initiativeBonus",4),"revealed":true,"traits":[],"actions":[],"zone":ui.get_current_zone_display(),"summary":"Miniatura añadida explícitamente por el DM; no cambia la historia de este mapa."}
	actor.traits=p.get("traits",[]).duplicate()
	for action in Catalogue.actions("anteros-temple"): actor.actions.append(str(action.label))
	ui.enemies.append(actor); ui.tokens_by_node[body.name]=body; rules.register(actor,Catalogue.actions("anteros-temple"),p); body.set_meta("combat_id","anteros-temple"); body.set_meta("combat_controller",self)
	_sync_positions(); ui.refresh_all(); refresh()

func _place_new_token(body: CharacterBody3D,origin: Node3D,spacing: float) -> bool:
	var previous: Node3D=ui.map_interaction.selected
	ui.map_interaction.selected=body
	for step in [Vector3(spacing,0,0),Vector3(-spacing,0,0),Vector3(0,0,spacing),Vector3(0,0,-spacing),Vector3(spacing,0,spacing),Vector3(-spacing,0,-spacing)]:
		var candidate: Vector3=origin.global_position+origin.get_parent().global_basis*step
		var up: Vector3=origin.get_parent().global_basis*Vector3.UP
		var query:=PhysicsRayQueryParameters3D.create(candidate+up*1.5,candidate-up*2.0,1,[body.get_rid()])
		var hit:=body.get_world_3d().direct_space_state.intersect_ray(query)
		if not hit.is_empty() and ui.map_interaction.place_selected(hit.position):
			ui.map_interaction.selected=previous; return true
	ui.map_interaction.selected=previous; ui.notify_mesa("No hay espacio libre cercano. Sitúa al personaje activo en una zona despejada y vuelve a añadir la miniatura."); return false

func restore_local(path: String="user://combat-local.v1.save") -> void:
	if ui.current_role!="dm": return
	var file:=FileAccess.open(path,FileAccess.READ)
	if not file or file.get_length()>4000000: return
	var value=file.get_var(false)
	if not value is Dictionary or value.get("version",0)!=1: ui.notify_mesa("Guardado de combate no válido"); return
	if get_tree().current_scene and value.get("scene","")!=get_tree().current_scene.scene_file_path: ui.notify_mesa("Ese combate pertenece a otra escena"); return
	for id in value.actors:
		if not rules.actors.has(id): ui.notify_mesa("Falta una ficha de esta sesión; no se ha restaurado"); return
	rules.actors=value.actors; rules.order.assign(value.order); rules.active=value.active; rules.initiative_pending=value.initiative; rules.round_number=value.round; rules.turn_index=value.turn; rules.turn_serial=value.turn_serial; rules.pending=value.pending; rules.effects.assign(value.effects); rules.sequence=value.sequence; rules.followups.assign(value.followups); rules.serial=value.serial; rules.completed=value.completed
	rules.interrupted=value.get("interrupted",{})
	rules.visual_queue.assign(value.get("visual_queue",[]))
	for id in rules.actors:
		var body:=token(id)
		if body: body.position=rules.actors[id].position; body.velocity=Vector3.ZERO
	if value.has("character_appearance"): get_node("CharacterAppearanceService").restore_state(value.get("character_appearance",{}))
	ui.refresh_all(); refresh(); ui.notify_mesa("Restaurado solo el estado local de combate")
