extends Node
const ThemeKit=preload("res://scripts/vtt_ui_theme.gd")
const DEFAULTS:={"showGrid":true,"gridOpacity":.22,"gridThickness":1,"gridMode":"contrast","gridColor":"#c8cec3","gridRadius":50.0,"gridHeightOpacity":.3,"showMovementHints":true,"showSceneNotice":true,"sceneNoticeSeconds":8.0,"joystickOpacity":.72,"joystickX":.05,"joystickY":0.0,"joystickSize":2,"actionX":.99,"actionY":0.0,"actionSize":2,"wheelStyle":"filigree","wheelSlots":5,"initiativePosition":"top","identityMenuAlwaysOpen":false,"identityMenuSeconds":7.0,"sheetView":"summary","audioMuted":false,"reducedMotion":false}
const RANGES:={"gridOpacity":[.06,.7],"gridThickness":[1,3],"gridRadius":[10,100],"gridHeightOpacity":[.1,.7],"sceneNoticeSeconds":[3,25],"joystickOpacity":[.2,1],"joystickX":[0,1],"joystickY":[0,1],"joystickSize":[0,4],"actionX":[0,1],"actionY":[0,1],"actionSize":[0,4],"wheelSlots":[3,7],"identityMenuSeconds":[3,30]}

const KEYBIND_CATALOG: Array[Dictionary]=[
	{"id":"move_up","group":"MOVIMIENTO Y POSES","label":"Avanzar / Norte","default":KEY_W},
	{"id":"move_down","group":"MOVIMIENTO Y POSES","label":"Retroceder / Sur","default":KEY_S},
	{"id":"move_left","group":"MOVIMIENTO Y POSES","label":"Izquierda / Oeste","default":KEY_A},
	{"id":"move_right","group":"MOVIMIENTO Y POSES","label":"Derecha / Este","default":KEY_D},
	{"id":"sprint","group":"MOVIMIENTO Y POSES","label":"Correr (mantener)","default":KEY_SHIFT},
	{"id":"jump","group":"MOVIMIENTO Y POSES","label":"Saltar","default":KEY_J},
	{"id":"stealth","group":"MOVIMIENTO Y POSES","label":"Sigilo","default":KEY_CTRL},
	{"id":"sit","group":"MOVIMIENTO Y POSES","label":"Sentarse / Levantarse","default":KEY_Z},
	{"id":"prone","group":"MOVIMIENTO Y POSES","label":"Tumbarse / Incorporarse","default":KEY_X},
	{"id":"dive_toggle","group":"MOVIMIENTO Y POSES","label":"Bucear / Superficie","default":KEY_U},

	{"id":"interact","group":"ACCIONES E INTERFAZ","label":"Interactuar / Hablar / Puerta","default":KEY_T},
	{"id":"alt_route","group":"ACCIONES E INTERFAZ","label":"Ruta alternativa en cartel","default":KEY_M},
	{"id":"winch_lever","group":"ACCIONES E INTERFAZ","label":"Palanca / Cabrestante","default":KEY_G},
	{"id":"torch","group":"ACCIONES E INTERFAZ","label":"Encender / Apagar antorcha","default":KEY_V},
	{"id":"inventory","group":"ACCIONES E INTERFAZ","label":"Mochila e inventario","default":KEY_I},
	{"id":"party_chat","group":"ACCIONES E INTERFAZ","label":"Conversación de grupo","default":KEY_Y},
	{"id":"actions_wheel","group":"ACCIONES E INTERFAZ","label":"Rueda de acciones / Ataques","default":KEY_K},
	{"id":"spells_wheel","group":"ACCIONES E INTERFAZ","label":"Rueda de conjuros","default":KEY_L},
	{"id":"hit_anim","group":"ACCIONES E INTERFAZ","label":"Gesto de impacto","default":KEY_H},

	{"id":"party_1","group":"GRUPO Y MESAS","label":"Seleccionar personaje 1","default":KEY_1},
	{"id":"party_2","group":"GRUPO Y MESAS","label":"Seleccionar personaje 2","default":KEY_2},
	{"id":"party_3","group":"GRUPO Y MESAS","label":"Seleccionar personaje 3","default":KEY_3},
	{"id":"party_next","group":"GRUPO Y MESAS","label":"Siguiente personaje del grupo","default":KEY_TAB},
	{"id":"role_player","group":"GRUPO Y MESAS","label":"Vista Jugador","default":KEY_F1},
	{"id":"role_dm","group":"GRUPO Y MESAS","label":"Vista DM","default":KEY_F2},
	{"id":"role_projector","group":"GRUPO Y MESAS","label":"Vista Proyector","default":KEY_F3},
	{"id":"fullscreen","group":"GRUPO Y MESAS","label":"Pantalla completa","default":KEY_F11},

	{"id":"cam_orbit_left","group":"CÁMARA TÁCTICA","label":"Orbitar a la izquierda","default":KEY_Q},
	{"id":"cam_orbit_right","group":"CÁMARA TÁCTICA","label":"Orbitar a la derecha","default":KEY_E},
	{"id":"cam_tilt_up","group":"CÁMARA TÁCTICA","label":"Inclinar cámara arriba","default":KEY_R},
	{"id":"cam_tilt_down","group":"CÁMARA TÁCTICA","label":"Inclinar cámara abajo","default":KEY_F},
	{"id":"cam_center","group":"CÁMARA TÁCTICA","label":"Centrar cámara en personaje","default":KEY_SPACE},
	{"id":"cam_overview","group":"CÁMARA TÁCTICA","label":"Vista general del mapa","default":KEY_O},
	{"id":"cam_follow","group":"CÁMARA TÁCTICA","label":"Encuadre de combate / grupo","default":KEY_C},
	{"id":"cam_projection","group":"CÁMARA TÁCTICA","label":"Cambiar perspectiva / ortogonal","default":KEY_P},
	{"id":"cam_reset","group":"CÁMARA TÁCTICA","label":"Restablecer vista inicial","default":KEY_HOME},
]

static var active_instance=null

var ui
var values: Dictionary=DEFAULTS.duplicate(true)
var role_values: Dictionary={}
var keybinds: Dictionary={}
var controls: Dictionary={}
var keybind_buttons: Dictionary={}
var keybind_status: Label
var _capturing_action: String=""
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
	active_instance=self
	keybinds=default_keybinds()
	storage_path=OS.get_data_dir().path_join("DungeonsVTT/player-display-v2.cfg")
	var config:=ConfigFile.new()
	if config.load(storage_path)==OK:
		for key in ["player","dm"]: role_values[key]=normalize(config.get_value("display",key,{}))
		var saved_kb=config.get_value("keybinds","bindings",{})
		if saved_kb is Dictionary: keybinds=normalize_keybinds(saved_kb)
	else:
		var legacy:=ConfigFile.new()
		if legacy.load("user://combat-ui.cfg")==OK: values.initiativePosition=legacy.get_value("ui","turn_line","top")
		role_values={"player":values.duplicate(true),"dm":DEFAULTS.duplicate(true)}
	values=role_values.player.duplicate(true)
	ui.role_changed.connect(switch_role)
	apply()

static func default_keybinds() -> Dictionary:
	var d: Dictionary={}
	for entry in KEYBIND_CATALOG:
		d[str(entry.id)]=int(entry.default)
	return d

static func normalize_keybinds(source: Dictionary) -> Dictionary:
	var out:=default_keybinds()
	for entry in KEYBIND_CATALOG:
		var id: String=str(entry.id)
		if source.has(id):
			var kc:=int(source[id])
			if kc>0 and kc!=KEY_ESCAPE:
				out[id]=kc
	return out

static func keycode_for(action_id: String) -> int:
	if active_instance!=null and active_instance.keybinds.has(action_id):
		return int(active_instance.keybinds[action_id])
	for entry in KEYBIND_CATALOG:
		if str(entry.id)==action_id: return int(entry.default)
	return KEY_NONE

static func matches_key(action_id: String,keycode: int) -> bool:
	return keycode!=KEY_NONE and keycode==keycode_for(action_id)

static func is_held(action_id: String) -> bool:
	var kc:=keycode_for(action_id)
	return kc!=KEY_NONE and Input.is_key_pressed(kc)

static func is_capturing_key() -> bool:
	return active_instance!=null and not str(active_instance._capturing_action).is_empty()

static func keycode_label(kc: int) -> String:
	match kc:
		KEY_SPACE: return "Espacio"
		KEY_SHIFT: return "Mayús"
		KEY_CTRL: return "Ctrl"
		KEY_ALT: return "Alt"
		KEY_TAB: return "Tab"
		KEY_HOME: return "Inicio"
		KEY_END: return "Fin"
		KEY_PAGEUP: return "RePág"
		KEY_PAGEDOWN: return "AvPág"
		KEY_ENTER, KEY_KP_ENTER: return "Enter"
		KEY_UP: return "↑"
		KEY_DOWN: return "↓"
		KEY_LEFT: return "←"
		KEY_RIGHT: return "→"
		KEY_NONE: return "—"
	return OS.get_keycode_string(kc)

static func key_label(action_id: String) -> String:
	return keycode_label(keycode_for(action_id))

func _input(event: InputEvent) -> void:
	if _capturing_action.is_empty(): return
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var ek:=event as InputEventKey
		var kc: int=ek.keycode
		if kc==KEY_NONE: return
		get_viewport().set_input_as_handled()
		if kc==KEY_ESCAPE:
			_capturing_action=""
			sync_keybind_controls("Reasignación cancelada.")
			return
		var notice:=set_keybind(_capturing_action,kc)
		_capturing_action=""
		sync_keybind_controls(notice)

func set_keybind(action_id: String,keycode: int) -> String:
	if keycode<=0 or keycode==KEY_ESCAPE:
		return "Esc está reservada para cerrar o cancelar."
	var prev_key:=int(keybinds.get(action_id,keycode))
	var swapped_with:=""
	for other_id in keybinds:
		if other_id!=action_id and int(keybinds[other_id])==keycode:
			keybinds[other_id]=prev_key
			swapped_with=other_id
			break
	keybinds[action_id]=keycode
	save()
	if ui and ui.has_method("refresh_all"): ui.refresh_all()
	if not swapped_with.is_empty():
		var other_label:=swapped_with
		for entry in KEYBIND_CATALOG:
			if str(entry.id)==swapped_with: other_label=str(entry.label); break
		return "Tecla '%s' asignada (intercambiada con '%s')." % [keycode_label(keycode),other_label]
	return "Tecla '%s' guardada." % keycode_label(keycode)

func reset_keybinds() -> void:
	_capturing_action=""
	keybinds=default_keybinds()
	save()
	if ui and ui.has_method("refresh_all"): ui.refresh_all()
	sync_keybind_controls("Atajos restablecidos a los valores originales.")

func cancel_keybind_capture() -> void:
	if not _capturing_action.is_empty():
		_capturing_action=""
		sync_keybind_controls("")

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
	for key in ["gridThickness","joystickSize","actionSize","wheelSlots"]: result[key]=roundi(result[key])
	result.wheelSlots = 3 if int(result.wheelSlots) <= 3 else (7 if int(result.wheelSlots) >= 7 else 5)
	if result.wheelStyle not in ["filigree","bg3","minimal","vellum","compass"]: result.wheelStyle="filigree"
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
	config.set_value("keybinds","bindings",keybinds)
	DirAccess.make_dir_recursive_absolute(storage_path.get_base_dir())
	var err:=config.save(storage_path)
	if err!=OK and ui: ui.notify_mesa("No se pudieron guardar las preferencias locales.")

func apply() -> void:
	if not ui: return
	ui.grid_enabled=values.showGrid; ui.grid_opacity=values.gridOpacity; ui.show_scene_notice=values.showSceneNotice; ui.audio_muted=values.audioMuted
	AudioServer.set_bus_mute(0,values.audioMuted)
	if ui.combat_controller:
		ui.combat_controller.initiative_position=values.initiativePosition
		if ui.combat_controller.wheel_open:
			ui.combat_controller.scroll_offset=0
			ui.combat_controller.refresh()
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
		var scroll: ScrollContainer=hud.settings_modal.find_child("PlayerSettingsScroll",true,false) as ScrollContainer
		if scroll:
			scroll.custom_minimum_size=Vector2(minf(610,viewport.x-48),minf(470,viewport.y-190))
		hud.settings_modal.set_anchors_preset(Control.PRESET_TOP_LEFT)
		hud.settings_modal.size=hud.settings_modal.get_combined_minimum_size()
		hud.settings_modal.position=Vector2(clampf((viewport.x-hud.settings_modal.size.x)*.5,12.0,maxf(12.0,viewport.x-hud.settings_modal.size.x-12.0)),clampf((viewport.y-hud.settings_modal.size.y)*.5,56.0,maxf(56.0,viewport.y-hud.settings_modal.size.y-16.0)))

static func control_position(viewport: Vector2,size: Vector2,x: float,y: float) -> Vector2:
	return Vector2(lerpf(16,maxf(16,viewport.x-size.x-16),x),lerpf(maxf(100,viewport.y-size.y-16),100,y))

func build_wheel_controls(parent: VBoxContainer) -> void:
	parent.add_child(ThemeKit.make_eyebrow("ESTÉTICA Y CAPACIDAD DE LA ROSA DE ACCIONES"))
	choice(parent,"wheelStyle","Estilo visual de la rosa",[
		["filigree","1 · Cartela Filigrana (oro y cristal)"],
		["bg3","2 · Astrolabio Imperial (color por categoría)"],
		["minimal","3 · Orbes Rúnicos Minimalistas"],
		["vellum","4 · Lacre y Pergamino Iluminado"],
		["compass","5 · Brújula Náutica (mar y cobre)"],
	])
	choice(parent,"wheelSlots","Acciones visibles al mismo tiempo",[
		[3,"3 acciones por arco (compacto)"],
		[5,"5 acciones por arco (recomendado)"],
		[7,"7 acciones por arco (ampliado)"],
	])
	var wheel_note:=ThemeKit.make_label("Cuando una categoría tenga más acciones, la rosa rueda suavemente con la rueda del ratón o con las flechas del arco sin mostrar numeración.",12,ThemeKit.COL_MUTED)
	wheel_note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	parent.add_child(wheel_note)
	parent.add_child(HSeparator.new())
	parent.add_child(ThemeKit.make_eyebrow("POSICIÓN Y TAMAÑO DE CONTROLES"))
	slider(parent,"joystickOpacity","Opacidad del joystick",.2,1,.05,"%")
	for control in [["joystick","Joystick"],["action","Botón Acciones"]]:
		slider(parent,control[0]+"X",control[1]+" · horizontal",0,1,.01,"%")
		slider(parent,control[0]+"Y",control[1]+" · altura",0,1,.01,"%")
		slider(parent,control[0]+"Size",control[1]+" · tamaño",0,4,1,"")

func build_controls(parent: VBoxContainer) -> void:
	parent.add_child(ThemeKit.make_eyebrow("CUADRÍCULA · GUARDADO AUTOMÁTICO LOCAL"))
	check(parent,"showGrid","Mostrar cuadrícula caminable")
	slider(parent,"gridOpacity","Opacidad",.06,.7,.01,"%")
	slider(parent,"gridThickness","Grosor de línea",1,3,1,"px")
	choice(parent,"gridMode","Modo de color",[["contrast","Contraste por superficie"],["fixed","Color fijo"]])
	var color_row:=HBoxContainer.new(); color_row.add_theme_constant_override("separation",8); parent.add_child(color_row)
	var color_lbl:=ThemeKit.make_label("Color personalizado de cuadrícula",13,ThemeKit.COL_INK); color_lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL; color_row.add_child(color_lbl)
	var color:=ColorPickerButton.new(); color.name="Setting_gridColor"; color.text=""; color.color=Color(values.gridColor); color.edit_alpha=false; color.custom_minimum_size=Vector2(116,32); color_row.add_child(color); controls.gridColor=color
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
	var import_button:=Button.new(); import_button.text="Importar preferencias web (.json)"; import_button.custom_minimum_size.y=42; ThemeKit.style_button(import_button,"secondary",8,12,6); parent.add_child(import_button)
	import_button.pressed.connect(func():
		var file:=FileDialog.new(); file.file_mode=FileDialog.FILE_MODE_OPEN_FILE; file.access=FileDialog.ACCESS_FILESYSTEM; file.filters=PackedStringArray(["*.json ; Preferencias del jugador"]); ui.ui_root.add_child(file)
		file.file_selected.connect(func(path):
			if import_web_file(path): status.text="Preferencias web importadas y guardadas."
			else: status.text="El archivo no contiene preferencias reconocibles."
			file.queue_free()
		); file.canceled.connect(func(): file.queue_free()); file.popup_centered(Vector2i(720,480))
	)
	var reset:=Button.new(); reset.text="Restablecer preferencias de esta vista"; reset.custom_minimum_size.y=42; ThemeKit.style_button(reset,"secondary",8,12,6); parent.add_child(reset)
	reset.pressed.connect(func(): values=DEFAULTS.duplicate(true); role_values[role]=values.duplicate(true); save(); apply(); sync_controls())
	status=ThemeKit.make_label("Preferencias independientes de Jugador y DM. Compartidas entre mapas Godot.",12,ThemeKit.COL_MUTED); status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; parent.add_child(status)

func build_keybinds_ui(parent: VBoxContainer) -> void:
	keybind_buttons.clear()
	keybind_status=ThemeKit.make_label("Pulsa una tecla para reasignarla. Esc cancela; si ya existe en otra acción, se intercambian.",12,ThemeKit.COL_MUTED)
	keybind_status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	parent.add_child(keybind_status)
	var current_group:=""
	for entry in KEYBIND_CATALOG:
		var grp: String=str(entry.group)
		if grp!=current_group:
			current_group=grp
			parent.add_child(ThemeKit.make_eyebrow(grp))
		var row:=HBoxContainer.new()
		row.add_theme_constant_override("separation",8)
		parent.add_child(row)
		var lbl:=ThemeKit.make_label(str(entry.label),13,ThemeKit.COL_INK)
		lbl.size_flags_horizontal=Control.SIZE_EXPAND_FILL
		row.add_child(lbl)
		var aid: String=str(entry.id)
		var btn:=Button.new()
		btn.name="Keybind_"+aid
		btn.custom_minimum_size=Vector2(130,32)
		btn.text=keycode_label(int(keybinds.get(aid,entry.default)))
		ThemeKit.style_button(btn,"secondary",8,10,4)
		btn.pressed.connect(func():
			_capturing_action=aid
			sync_keybind_controls("Pulsa la nueva tecla para '%s' (Esc para cancelar)..." % str(entry.label))
		)
		row.add_child(btn)
		keybind_buttons[aid]=btn
	var sep:=HSeparator.new(); parent.add_child(sep)
	var note:=ThemeKit.make_label("Atajos contextuales fijos: Esc (cerrar/cancelar), 1–9 (elegir respuesta en diálogo), Rueda (zoom / rotar acciones / scroll crónica).",11,ThemeKit.COL_MUTED)
	note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; parent.add_child(note)
	var reset_kb:=Button.new(); reset_kb.name="ResetKeybindsButton"; reset_kb.text="Restablecer teclas por defecto"; reset_kb.custom_minimum_size.y=40
	ThemeKit.style_button(reset_kb,"secondary",8,12,6)
	reset_kb.pressed.connect(reset_keybinds)
	parent.add_child(reset_kb)

func sync_keybind_controls(msg: String="") -> void:
	for entry in KEYBIND_CATALOG:
		var aid: String=str(entry.id)
		if not keybind_buttons.has(aid): continue
		var btn: Button=keybind_buttons[aid]
		if not is_instance_valid(btn): continue
		var active: bool=_capturing_action==aid
		btn.text="Pulsa tecla..." if active else keycode_label(int(keybinds.get(aid,entry.default)))
		ThemeKit.style_button(btn,"primary" if active else "secondary",8,10,4)
	if is_instance_valid(keybind_status) and not msg.is_empty():
		keybind_status.text=msg

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
	sync_keybind_controls()
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
