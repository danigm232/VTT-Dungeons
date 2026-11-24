extends Node
const ThemeKit=preload("res://scripts/vtt_ui_theme.gd")
const DEFAULTS:={"showGrid":true,"gridOpacity":.22,"gridThickness":1,"gridMode":"contrast","gridColor":"#c8cec3","gridRadius":64.0,"gridHeightOpacity":.3,"showMovementHints":true,"showSceneNotice":true,"sceneNoticeSeconds":8.0,"joystickOpacity":.72,"joystickX":.05,"joystickY":0.0,"joystickSize":2,"actionX":.99,"actionY":0.0,"actionSize":2,"initiativePosition":"top","identityMenuAlwaysOpen":false,"identityMenuSeconds":7.0,"sheetView":"summary","audioMuted":false,"reducedMotion":false}
const RANGES:={"gridOpacity":[.06,.7],"gridThickness":[1,3],"gridRadius":[10,100],"gridHeightOpacity":[.1,.7],"sceneNoticeSeconds":[3,25],"joystickOpacity":[.2,1],"joystickX":[0,1],"joystickY":[0,1],"joystickSize":[0,4],"actionX":[0,1],"actionY":[0,1],"actionSize":[0,4],"identityMenuSeconds":[3,30]}
var ui
var values: Dictionary=DEFAULTS.duplicate(true)
var role_values: Dictionary={}
var controls: Dictionary={}
var storage_path: String
var role:="player"
var notice_time:=0.0
var identity_time:=0.0
var last_zone:=""
var last_identity_open:=false
var status: Label
var _layout_key:=""

func setup(owner_ui) -> void:
	ui=owner_ui; name="PlayerPreferences"
	storage_path=OS.get_data_dir().path_join("DungeonsVTT/player-display-v2.cfg")
	var config:=ConfigFile.new()
	if config.load(storage_path)==OK:
		for key in ["player","dm"]: role_values[key]=normalize(config.get_value("display",key,{}))
		if not config.get_value("migrations","gridRadius64",false):
			role_values["player"]["gridRadius"]=maxf(float(role_values["player"].get("gridRadius",64.0)),64.0)
			config.set_value("display","player",role_values["player"])
			config.set_value("migrations","gridRadius64",true)
			DirAccess.make_dir_recursive_absolute(storage_path.get_base_dir())
			config.save(storage_path)
	else:
		var legacy:=ConfigFile.new()
		if legacy.load("user://combat-ui.cfg")==OK: values.initiativePosition=legacy.get_value("ui","turn_line","top")
		role_values={"player":values.duplicate(true),"dm":DEFAULTS.duplicate(true)}
	values=role_values.player.duplicate(true)
	ui.role_changed.connect(switch_role)
	apply()

static func normalize(source: Dictionary) -> Dictionary:
	var result:=DEFAULTS.duplicate(true)
	var data:=source.duplicate(true)
	if data.get("gridStyle") is Dictionary:
		for pair in [["opacity","gridOpacity"],["thickness","gridThickness"],["mode","gridMode"],["color","gridColor"]]:
			if data.gridStyle.has(pair[0]): data[pair[1]]=data.gridStyle[pair[0]]
	for key in DEFAULTS:
		if not data.has(key): continue
		var value=data[key]
		if RANGES.has(key):
			if not (value is float or value is int) or not is_finite(float(value)): continue
			result[key]=clampf(float(value),RANGES[key][0],RANGES[key][1])
		elif DEFAULTS[key] is bool:
			if value is bool: result[key]=value
		elif value is String: result[key]=value
	for key in ["gridThickness","joystickSize","actionSize"]: result[key]=roundi(result[key])
	if result.gridMode not in ["fixed","contrast"]: result.gridMode="contrast"
	if result.initiativePosition not in ["top","right","left"]: result.initiativePosition="top"
	if result.sheetView not in ["summary","full"]: result.sheetView="summary"
	if not Color.html_is_valid(result.gridColor): result.gridColor=DEFAULTS.gridColor
	return result

func switch_role(new_role: String) -> void:
	if new_role=="projector": apply(); return
	role_values[role]=values.duplicate(true); role=new_role
	values=role_values.get(role,DEFAULTS).duplicate(true); _layout_key=""; last_zone=""; apply(); sync_controls()

func set_value(key: String,value) -> void:
	var draft:=values.duplicate(true); draft[key]=value; values=normalize(draft)
	role_values[role]=values.duplicate(true); save(); apply(); sync_controls()

func save() -> void:
	var config:=ConfigFile.new()
	for key in role_values: config.set_value("display",key,role_values[key])
	DirAccess.make_dir_recursive_absolute(storage_path.get_base_dir())
	var err:=config.save(storage_path)
	if err!=OK and ui: ui.notify_mesa("No se pudieron guardar las preferencias locales.")

func apply() -> void:
	if not ui: return
	ui.grid_enabled=values.showGrid; ui.grid_opacity=values.gridOpacity; ui.show_scene_notice=values.showSceneNotice; ui.audio_muted=values.audioMuted
	AudioServer.set_bus_mute(0,values.audioMuted)
	if ui.combat_controller: ui.combat_controller.initiative_position=values.initiativePosition
	ui._sync_grid_and_rings()
	if ui.player_hud:
		if ui.player_hud._sheet_tab!="edit": ui.player_hud._sheet_tab=values.sheetView
		_layout_key=""
		if values.identityMenuAlwaysOpen: ui.player_hud.identity_menu_open=true; ui.player_hud.identity_menu.show()

func _process(delta: float) -> void:
	if not ui or not ui.player_hud: return
	var hud=ui.player_hud
	var active=ui.get_active_token_node()
	if values.identityMenuAlwaysOpen and not hud.modal_backdrop.visible:
		hud.identity_menu_open=true; hud.identity_menu.show()
	if ui.grid_node and ui.grid_node.has_method("apply_preferences") and active: ui.grid_node.apply_preferences(values,active.global_position)
	if ui.grid_node and ui.grid_node.has_method("update_movement_hints") and active:
		var budget: float=ui.combat_controller.rules.actors.get(str(ui.selected_actor_id),{}).get("movement",0) if ui.combat_controller else 0.0
		ui.grid_node.update_movement_hints(active.global_position,budget,bool(values.showMovementHints) and ui.combat_active and ui.current_role!="projector" and ui.combat_controller.rules.current_id()==str(ui.selected_actor_id))
	var zone: String=ui.get_current_zone_display()
	if zone!=last_zone: last_zone=zone; notice_time=float(values.sceneNoticeSeconds)
	notice_time=maxf(0,notice_time-delta)
	hud.scene_notice_panel.visible=bool(values.showSceneNotice) and notice_time>0 and not ui.combat_active
	if hud.identity_menu_open and not last_identity_open: identity_time=float(values.identityMenuSeconds)
	last_identity_open=hud.identity_menu_open
	var focus_owner: Control=hud.root.get_viewport().gui_get_focus_owner()
	var menu_has_focus: bool=focus_owner!=null and hud.identity_menu.is_ancestor_of(focus_owner)
	if hud.identity_menu_open and not values.identityMenuAlwaysOpen and not hud.identity_menu.get_global_rect().has_point(hud.root.get_global_mouse_position()) and not menu_has_focus:
		identity_time-=delta
		if identity_time<=0: hud.identity_menu_open=false; hud.identity_menu.hide()
	for body in ui.tokens_by_node.values():
		body.set_meta("player_settings_modal",hud.modal_backdrop.visible and ui.current_role=="player")
		body.set_meta("player_reduced_motion",values.reducedMotion)
	if active and active.get("selection_ring"):
		active.selection_ring.visible=ui.current_role!="projector" and values.showMovementHints
	_layout_controls()

func _layout_controls() -> void:
	var hud=ui.player_hud
	var viewport: Vector2=hud.root.get_viewport_rect().size
	var key:=str(viewport)+JSON.stringify(values)+str(hud.action_toggle_btn.get_parent().get_parent().get_combined_minimum_size())
	if key==_layout_key: return
	_layout_key=key
	var sizes: Array=[.75,.875,1.0,1.25,1.5]
	var joy: Control=hud.joystick.get_parent()
	var scale: float=sizes[int(values.joystickSize)]
	hud.joystick.custom_minimum_size=Vector2(128,128)*scale; hud.joystick.max_radius=42*scale
	joy.set_anchors_preset(Control.PRESET_TOP_LEFT); joy.size=joy.get_combined_minimum_size(); joy.modulate.a=values.joystickOpacity
	joy.position=control_position(viewport,joy.size,values.joystickX,values.joystickY)
	var dock: Control=hud.action_toggle_btn.get_parent().get_parent()
	var action_scale: float=sizes[int(values.actionSize)]
	hud.action_toggle_btn.custom_minimum_size=Vector2(96,44)*action_scale
	dock.set_anchors_preset(Control.PRESET_TOP_LEFT); dock.size=dock.get_combined_minimum_size()
	dock.position=control_position(viewport,dock.size,values.actionX,values.actionY)
	if hud.settings_modal.visible:
		var scroll: ScrollContainer=hud.settings_modal.get_node("PlayerSettingsScroll")
		scroll.custom_minimum_size=Vector2(minf(560,viewport.x-60),minf(560,viewport.y-160))
		hud.settings_modal.set_anchors_preset(Control.PRESET_TOP_LEFT)
		hud.settings_modal.size=hud.settings_modal.get_combined_minimum_size()
		hud.settings_modal.position=(viewport-hud.settings_modal.size)*.5

static func control_position(viewport: Vector2,size: Vector2,x: float,y: float) -> Vector2:
	return Vector2(lerpf(16,maxf(16,viewport.x-size.x-16),x),lerpf(maxf(100,viewport.y-size.y-16),100,y))

func build_controls(parent: VBoxContainer) -> void:
	parent.add_child(ThemeKit.make_eyebrow("CUADRÍCULA · GUARDADO AUTOMÁTICO LOCAL"))
	check(parent,"showGrid","Mostrar cuadrícula caminable")
	slider(parent,"gridOpacity","Opacidad",.06,.7,.01,"%")
	slider(parent,"gridThickness","Grosor de línea",1,3,1,"px")
	choice(parent,"gridMode","Color",[["contrast","Contraste por superficie"],["fixed","Color fijo"]])
	var color:=ColorPickerButton.new(); color.name="Setting_gridColor"; color.text="Color fijo"; color.color=Color(values.gridColor); color.edit_alpha=false; color.custom_minimum_size.y=40; parent.add_child(color); controls.gridColor=color
	color.color_changed.connect(func(value): set_value("gridColor","#"+value.to_html(false)))
	slider(parent,"gridRadius","Radio alrededor del personaje",10,100,5,"m")
	slider(parent,"gridHeightOpacity","Intensidad en otras alturas",.1,.7,.05,"%")
	check(parent,"showMovementHints","Marcas de movimiento / selección")
	parent.add_child(ThemeKit.make_eyebrow("PRESENTACIÓN Y ACCESIBILIDAD"))
	check(parent,"showSceneNotice","Aviso del escenario")
	slider(parent,"sceneNoticeSeconds","Duración del aviso",3,25,1,"s")
	choice(parent,"initiativePosition","Línea de turnos",[["top","Arriba"],["right","Derecha"],["left","Izquierda"]])
	choice(parent,"sheetView","Vista inicial de ficha",[["summary","Resumen"],["full","Completa"]])
	check(parent,"identityMenuAlwaysOpen","Mantener menú personal abierto")
	slider(parent,"identityMenuSeconds","Cierre automático del menú",3,30,1,"s")
	check(parent,"audioMuted","Silenciar audio local")
	check(parent,"reducedMotion","Reducir movimiento de efectos")
	parent.add_child(ThemeKit.make_eyebrow("CONTROLES · POSICIÓN Y TAMAÑO"))
	slider(parent,"joystickOpacity","Opacidad del joystick",.2,1,.05,"%")
	for control in [["joystick","Joystick"],["action","Acciones"]]:
		slider(parent,control[0]+"X",control[1]+" · horizontal",0,1,.01,"%")
		slider(parent,control[0]+"Y",control[1]+" · altura",0,1,.01,"%")
		slider(parent,control[0]+"Size",control[1]+" · tamaño",0,4,1,"")
	var import_button:=Button.new(); import_button.text="Importar preferencias web (.json)"; import_button.custom_minimum_size.y=44; parent.add_child(import_button)
	import_button.pressed.connect(func():
		var file:=FileDialog.new(); file.file_mode=FileDialog.FILE_MODE_OPEN_FILE; file.access=FileDialog.ACCESS_FILESYSTEM; file.filters=PackedStringArray(["*.json ; Preferencias del jugador"]); ui.ui_root.add_child(file)
		file.file_selected.connect(func(path):
			if import_web_file(path): status.text="Preferencias web importadas y guardadas."
			else: status.text="El archivo no contiene preferencias reconocibles."
			file.queue_free()
		); file.canceled.connect(func(): file.queue_free()); file.popup_centered(Vector2i(720,480))
	)
	var reset:=Button.new(); reset.text="Restablecer preferencias de esta vista"; reset.custom_minimum_size.y=44; parent.add_child(reset)
	reset.pressed.connect(func(): values=DEFAULTS.duplicate(true); role_values[role]=values.duplicate(true); save(); apply(); sync_controls())
	status=ThemeKit.make_label("Preferencias independientes de Jugador y DM. Compartidas entre mapas Godot.",12,ThemeKit.COL_MUTED); status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; parent.add_child(status)

func check(parent: Node,key: String,label: String) -> void:
	var field:=CheckButton.new(); field.name="Setting_"+key; field.text=label; field.button_pressed=values[key]; field.custom_minimum_size.y=40; parent.add_child(field); controls[key]=field
	field.toggled.connect(func(value): set_value(key,value))

func slider(parent: Node,key: String,label: String,minimum: float,maximum: float,step: float,unit: String) -> void:
	var box:=VBoxContainer.new(); parent.add_child(box)
	var caption:=ThemeKit.make_label(label,13,ThemeKit.COL_HEADING); box.add_child(caption)
	var field:=HSlider.new(); field.name="Setting_"+key; field.min_value=minimum; field.max_value=maximum; field.step=step; field.value=values[key]; field.custom_minimum_size=Vector2(300,28); box.add_child(field)
	field.set_meta("caption",caption); field.set_meta("label",label); field.set_meta("unit",unit); controls[key]=field
	field.value_changed.connect(func(value): set_value(key,value))

func choice(parent: Node,key: String,label: String,items: Array) -> void:
	parent.add_child(ThemeKit.make_label(label,13,ThemeKit.COL_HEADING))
	var field:=OptionButton.new(); field.name="Setting_"+key; field.custom_minimum_size.y=40; parent.add_child(field)
	for item in items: field.add_item(item[1])
	field.set_meta("values",items.map(func(item): return item[0])); controls[key]=field
	field.item_selected.connect(func(index): set_value(key,items[index][0]))

func sync_controls() -> void:
	for key in controls:
		var field: Control=controls[key]
		if field is CheckButton: field.set_pressed_no_signal(values[key])
		elif field is HSlider:
			field.set_value_no_signal(values[key]); var unit: String=field.get_meta("unit")
			field.get_meta("caption").text=field.get_meta("label")+": "+str(roundi(float(values[key])*(100 if unit=="%" else 1)))+" "+unit
		elif field is OptionButton: field.select(field.get_meta("values").find(values[key]))
		elif field is ColorPickerButton: field.color=Color(values[key]); field.disabled=values.gridMode!="fixed"
	_layout_key=""

func import_web_file(path: String) -> bool:
	var data=JSON.parse_string(FileAccess.get_file_as_string(path))
	if not data is Dictionary: return false
	if not data.has("gridStyle") and not data.has("showGrid"):
		for key in data:
			if str(key).begins_with("dnd-player-display.v1:"):
				data=JSON.parse_string(data[key]) if data[key] is String else data[key]; break
	if not data is Dictionary or not (data.has("gridStyle") or data.has("showGrid")): return false
	values=normalize(data); role_values[role]=values.duplicate(true); save(); apply(); sync_controls(); return true
