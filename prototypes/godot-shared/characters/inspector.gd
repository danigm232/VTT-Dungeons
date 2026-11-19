extends Node
## One world and one camera. All controls use the same runtime as map actors.
const Stage=preload("res://characters/review_stage.gd")
const Registry=preload("res://characters/registry.gd")
const Anchors=preload("res://characters/anchors.gd")
const StormwreckRoster=preload("res://characters/stormwreck_roster.gd")
var stage: Dictionary
var body: Node3D
var visual: Node3D
var panel: VBoxContainer
var anchor_canvas: Control
var actor_menu: OptionButton
var animation_menu: OptionButton
var direction_menu: OptionButton
var anchor_menu: OptionButton
var frame_slider: HSlider
var note: Label
var playing:=false
var accumulator:=0.0
var direction:="s"
var animation:="idle"
var selected_anchor:="head"
var anchor_visible:=true
var compare_base:=false
var dragging:=false
var gear_controls: Array=[]
var state_controls: Array=[]
var slots: VBoxContainer
var frame_label: Label
var frame_index:=0
var changing:=false
var campaign_filter:=""
func _ready() -> void:
	Registry.inspect_candidate()
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--campaign="): campaign_filter=argument.trim_prefix("--campaign=")
	get_window().title="VTT · Taller de personajes"
	get_window().size=Vector2i(1440,900)
	stage=Stage.create(self,true)
	stage.camera.h_offset=-.65
	var canvas:=CanvasLayer.new(); add_child(canvas)
	var backing:=ColorRect.new(); backing.position=Vector2(10,10); backing.size=Vector2(350,880); backing.color=Color("162329"); backing.mouse_filter=Control.MOUSE_FILTER_IGNORE; canvas.add_child(backing)
	var scroll:=ScrollContainer.new(); scroll.position=Vector2(18,18); scroll.size=Vector2(342,864); canvas.add_child(scroll)
	panel=VBoxContainer.new(); panel.custom_minimum_size.x=320; panel.add_theme_constant_override("separation",9); scroll.add_child(panel)
	_title("Taller de personajes",24)
	_title("Candidata · revisión visual pendiente",14)
	actor_menu=_menu("Personaje")
	var available: Array=StormwreckRoster.ids() if campaign_filter=="stormwreck-isle" else Registry.data().characters.keys()
	for id in available: actor_menu.add_item(Registry.data().characters[id].name); actor_menu.set_item_metadata(actor_menu.item_count-1,id)
	actor_menu.item_selected.connect(func(index): select_actor(str(actor_menu.get_item_metadata(index))))
	animation_menu=_menu("Animación"); animation_menu.item_selected.connect(func(index): animation=animation_menu.get_item_text(index); frame_index=0; pose())
	direction_menu=_menu("Dirección en el mapa")
	for dir in ["n","ne","e","se","s","sw","w","nw"]: direction_menu.add_item(dir.to_upper())
	direction_menu.select(4); direction_menu.item_selected.connect(func(index): direction=direction_menu.get_item_text(index).to_lower(); pose())
	var play:=CheckButton.new(); play.text="Reproducir"; panel.add_child(play); play.toggled.connect(func(on): playing=on)
	frame_label=_title("Fotograma 1",14)
	frame_slider=_slider(0,7,1,0); frame_slider.value_changed.connect(func(value): if not changing: frame_index=int(value); pose())
	_title("Zoom",14); var zoom:=_slider(1.8,7,.05,3.7); zoom.value_changed.connect(func(value): stage.camera.size=value)
	_title("Giro de cámara",14); var orbit:=_slider(-180,180,5,0); orbit.value_changed.connect(func(value): var angle=deg_to_rad(value); stage.camera.position=Vector3(sin(angle)*10,4,cos(angle)*10); stage.camera.look_at(Vector3(0,.9,0)); pose())
	var base:=CheckButton.new(); base.text="Comparar: mostrar original"; panel.add_child(base); base.toggled.connect(func(on): compare_base=on; visual.visible=not on; if on: body.sprite.modulate.a=1)
	var dots:=CheckButton.new(); dots.text="Anclajes · arrastra para corregir"; dots.button_pressed=true; panel.add_child(dots); dots.toggled.connect(func(on): anchor_visible=on)
	anchor_menu=_menu("Anclaje seleccionado"); anchor_menu.item_selected.connect(func(index): selected_anchor=anchor_menu.get_item_text(index))
	_button("Guardar correcciones en la definición",save_anchors)
	var equipment_title:=_title("Equipo · fase aplazada",17); slots=VBoxContainer.new(); panel.add_child(slots)
	equipment_title.visible="--inspect-equipment" in OS.get_cmdline_user_args(); slots.visible=equipment_title.visible
	_title("Estados corporales",17)
	for id in Registry.data().overlays:
		var line:=CheckButton.new(); line.text=Registry.data().overlays[id].name; line.set_meta("effect",id); panel.add_child(line); state_controls.append(line)
		line.toggled.connect(func(on): if visual: visual.set_effect(str(line.get_meta("effect")),1 if on else 0))
	_title("Intensidad de los estados",14); var amount:=_slider(0,1,.05,.85); amount.value_changed.connect(func(value): if visual: visual.intensity=value; visual.sync_render())
	var bindings:=_menu("Sujeción física · causa visual"); bindings.add_item("Ninguna"); bindings.set_item_metadata(0,"")
	for id in Registry.data().bindings: bindings.add_item(Registry.data().bindings[id].name); bindings.set_item_metadata(bindings.item_count-1,id)
	bindings.item_selected.connect(func(index): visual.set_binding(str(bindings.get_item_metadata(index))))
	_title("Cobertura de la sujeción",14); var coverage:=_slider(.1,1,.05,.7); coverage.value_changed.connect(func(value): visual.coverage=value; visual.sync_render())
	var reduced:=CheckButton.new(); reduced.text="Movimiento reducido"; panel.add_child(reduced); reduced.toggled.connect(func(on): visual.reduced=on)
	var variants:=_menu("Variantes de la biblioteca"); variants.add_item("Selecciona una variante…"); variants.set_item_metadata(0,"")
	for id in Registry.data().variants:
		if not Registry.data().variants[id].get("deferred",false): variants.add_item(Registry.data().variants[id].name); variants.set_item_metadata(variants.item_count-1,id)
	variants.item_selected.connect(func(index): var id=str(variants.get_item_metadata(index)); if not id.is_empty(): note.text="Variante aplicada" if visual.apply_variant(id) else "Esta variante pertenece a otro personaje")
	_button("Capturar vista actual",capture)
	_button("Validar biblioteca con Godot",validate_library)
	note=_title("",13); note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	anchor_canvas=Control.new(); anchor_canvas.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); anchor_canvas.mouse_filter=Control.MOUSE_FILTER_IGNORE; canvas.add_child(anchor_canvas)
	anchor_canvas.draw.connect(draw_anchors)
	select_actor("mike")
func _title(text: String,size: int) -> Label:
	var label:=Label.new(); label.text=text; label.add_theme_font_size_override("font_size",size); panel.add_child(label); return label
func _menu(title: String) -> OptionButton:
	_title(title,14); var menu:=OptionButton.new(); menu.custom_minimum_size.y=34; panel.add_child(menu); return menu
func _slider(minimum: float,maximum: float,step: float,value: float) -> HSlider:
	var slider:=HSlider.new(); slider.min_value=minimum; slider.max_value=maximum; slider.step=step; slider.value=value; panel.add_child(slider); return slider
func _button(text: String,action: Callable) -> void:
	var button:=Button.new(); button.text=text; button.custom_minimum_size.y=34; panel.add_child(button); button.pressed.connect(action)
func select_actor(id: String) -> void:
	if body: stage.world.remove_child(body); body.free()
	body=Stage.actor(stage.world,id); visual=body.get_node("CharacterVisual"); frame_index=0
	for index in range(actor_menu.item_count):
		if actor_menu.get_item_metadata(index)==id: actor_menu.select(index)
	for line in state_controls: line.set_pressed_no_signal(false)
	animation_menu.clear(); var names: Dictionary={"idle":true}
	for key in body.char_profile.get("clips",{}): names[key]=true
	for key in body.char_profile.get("dir_states",{}): names[key]=true
	for key in ["walk","run","attack"]:
		if not body.char_profile.get("dir_"+key,{}).is_empty(): names[key]=true
	for key in names: animation_menu.add_item(key)
	animation="idle"; animation_menu.select(0)
	anchor_menu.clear()
	for key in Registry.data().anatomies[visual.definition.anatomy].anchors: anchor_menu.add_item(key)
	selected_anchor=anchor_menu.get_item_text(0)
	for child in slots.get_children(): slots.remove_child(child); child.queue_free()
	for slot in visual.definition.get("equipmentSlots",[]):
		var label:=Label.new(); label.text=slot; slots.add_child(label)
		var menu:=OptionButton.new(); menu.add_item("Sin pieza adicional"); menu.set_item_metadata(0,""); slots.add_child(menu)
		for item_id in Registry.data().equipment:
			if Registry.data().equipment[item_id].slot==slot and Registry.compatible(id,item_id).ok: menu.add_item(Registry.data().equipment[item_id].name); menu.set_item_metadata(menu.item_count-1,item_id)
		menu.item_selected.connect(func(index): var result: Dictionary=visual.equip(slot,str(menu.get_item_metadata(index))); note.text="" if result.ok else result.reason)
	var single_view: bool=visual.definition.get("source",{}).get("kind","")=="individual-frames"
	if single_view or campaign_filter=="stormwreck-isle": direction=StormwreckRoster.idle_direction(id)
	for index in range(direction_menu.item_count):
		var item_dir: String=direction_menu.get_item_text(index).to_lower()
		direction_menu.set_item_disabled(index,single_view and item_dir!=direction)
		if item_dir==direction: direction_menu.select(index)
	note.text="Ocho fases de reposo en una vista base. Las demás direcciones aún no están dibujadas." if single_view else "Se conservan las direcciones y acciones existentes. El reposo nuevo se indica por su vista y número de fotogramas."
	pose()
func pose() -> void:
	if not body: return
	Stage.pose(body,animation,direction,frame_index)
	for index in range(animation_menu.item_count):
		if animation_menu.get_item_text(index)==animation: animation_menu.select(index)
	changing=true; frame_slider.max_value=maxi(0,body.active_clip_frames.size()-1); frame_index=mini(frame_index,int(frame_slider.max_value)); frame_slider.value=frame_index; changing=false
	frame_label.text="Fotograma %d / %d · vista %s" % [frame_index+1,body.active_clip_frames.size(),Anchors.frame_key(body).split(":")[1]]
func _process(delta: float) -> void:
	if body and playing:
		accumulator+=delta
		if accumulator>=1.0/maxf(1,float(body.active_clip_fps)): accumulator=0; frame_index=(frame_index+1)%maxi(1,body.active_clip_frames.size()); pose()
	if visual and compare_base: visual.visible=false; body.sprite.modulate.a=1
	if anchor_canvas: anchor_canvas.queue_redraw()
func draw_anchors() -> void:
	if not body or not anchor_visible: return
	var points:=Anchors.resolved(body,visual.definition,visual.corrections)
	for key in points:
		var screen: Vector2=stage.camera.unproject_position(body.to_global(points[key])); var active: bool=key==selected_anchor
		anchor_canvas.draw_circle(screen,6 if active else 3,Color("f5ce7c") if active else Color("64c6b8"))
		if active: anchor_canvas.draw_string(ThemeDB.fallback_font,screen+Vector2(10,-7),key,HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE)
func _input(event: InputEvent) -> void:
	if not body or not anchor_visible: return
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		if not event.pressed: dragging=false; return
		if event.position.x<375: return
		var points:=Anchors.resolved(body,visual.definition,visual.corrections)
		for key in points:
			if stage.camera.unproject_position(body.to_global(points[key])).distance_to(event.position)<14: selected_anchor=key; dragging=true; get_viewport().set_input_as_handled(); return
	if event is InputEventMouseMotion and dragging:
		var p0: Vector2=stage.camera.unproject_position(body.to_global(Anchors.local_point(body,Vector2.ZERO)))
		var px: Vector2=stage.camera.unproject_position(body.to_global(Anchors.local_point(body,Vector2.RIGHT)))-p0
		var py: Vector2=stage.camera.unproject_position(body.to_global(Anchors.local_point(body,Vector2.DOWN)))-p0
		var p: Vector2=event.position-p0; var determinant: float=px.cross(py)
		if absf(determinant)>.01:
			var key:=Anchors.frame_key(body)
			if not visual.corrections.has(key): visual.corrections[key]={}
			visual.corrections[key][selected_anchor]=[clampf(p.cross(py)/determinant,-.25,1.25),clampf(px.cross(p)/determinant,-.25,1.25)]
			visual.sync_render(); note.text="Corrección sin guardar · "+key+" · "+selected_anchor
func save_anchors() -> void:
	var path:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116/anchor-edits-"+str(visual.definition.id)+".json")
	FileAccess.open(path,FileAccess.WRITE).store_string(JSON.stringify({"character":visual.definition.id,"corrections":visual.corrections},"\t"))
	var result: Array=[]; var code:=OS.execute("node",[ProjectSettings.globalize_path("res://../../scripts/character-pipeline.mjs"),"anchors","--file",path],result,true)
	note.text="Guardado y validado. Reimporta para compartirlo con otros mapas." if code==0 else "No se ha incorporado: "+str(result)
func capture() -> void:
	await RenderingServer.frame_post_draw
	var path:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116/inspector-current.png")
	get_viewport().get_texture().get_image().save_png(path); note.text="Captura guardada en output/character-modular-20261116/inspector-current.png"
func validate_library() -> void:
	var out: Array=[]; var script:=ProjectSettings.globalize_path("res://../../scripts/character-pipeline.mjs")
	var code:=OS.execute("node",[script,"validate"],out,true)
	note.text="Definiciones válidas. La aceptación artística se revisa aquí, por fotograma." if code==0 else "Errores bloqueantes: "+str(out)
