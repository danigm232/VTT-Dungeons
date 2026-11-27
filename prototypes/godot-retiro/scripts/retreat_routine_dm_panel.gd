extends VBoxContainer

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")

var _village: Node3D
var _camera: Camera3D
var _people := OptionButton.new()
var _actions := OptionButton.new()
var _detail := Label.new()
var _paused: Button
var _assign: Button

func build(village: Node3D, view: Camera3D) -> void:
	_village = village
	_camera = view
	add_theme_constant_override("separation", 7)
	add_child(ThemeKit.make_eyebrow("RUTINAS DEL RETIRO"))
	var global := CheckButton.new()
	global.text = "Pausar actividad autónoma"
	global.button_pressed = _village.autonomy_paused
	global.toggled.connect(_village.set_autonomy_paused)
	add_child(global)
	for id: String in _village.residents:
		_people.add_item(_village.residents[id].token_name)
		_people.set_item_metadata(_people.item_count - 1, id)
	_people.item_selected.connect(func(_index: int): _select_resident())
	add_child(_people)
	_detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(_detail)
	add_child(_actions)
	_assign = _button("Asignar rutina", _assign_action)
	_paused = _button("Pausar PNJ", _toggle_resident)
	_button("Llevar al foco de cámara", _go_to_focus)
	var poll := Timer.new()
	poll.wait_time = 0.4
	poll.autostart = true
	poll.timeout.connect(_refresh)
	add_child(poll)
	_select_resident()

func _button(label: String, action: Callable) -> Button:
	var button := Button.new()
	button.text = label
	ThemeKit.style_button(button, "secondary", 7, 8, 5)
	button.pressed.connect(action)
	add_child(button)
	return button

func _id() -> String:
	return str(_people.get_item_metadata(_people.selected)) if _people.selected >= 0 else ""

func _select_resident() -> void:
	_actions.clear()
	for task: Array in _village.list_characteristic_routines(_id()):
		_actions.add_item(task[3])
		_actions.set_item_metadata(_actions.item_count - 1, task[0])
	_refresh()

func _refresh() -> void:
	var status: Dictionary = _village.routine_status(_id())
	if status.is_empty():
		_detail.text = "Cargando habitantes…"
		_assign.disabled = true
		_paused.disabled = true
		return
	_detail.text = "%s\nDestino: %s" % [status.activity, status.destination]
	_assign.disabled = _actions.item_count == 0 or _village.table_in_combat()
	_paused.disabled = false
	_paused.text = "Activar PNJ" if status.individually_paused else "Pausar PNJ"

func _assign_action() -> void:
	if _actions.selected < 0:
		return
	if not _village.request_characteristic_routine(_id(), str(_actions.get_item_metadata(_actions.selected))):
		_village.get_parent().vtt_ui.notify_mesa("Actividad indisponible por ocupación, clima o prioridad de mesa.")
	_refresh()

func _toggle_resident() -> void:
	var status: Dictionary = _village.routine_status(_id())
	if not status.is_empty():
		_village.set_resident_paused(_id(), not status.individually_paused)
	_refresh()

func _go_to_focus() -> void:
	if not _village.move_resident(_id(), _camera.focus_point):
		_village.get_parent().vtt_ui.notify_mesa("No hay una ruta transitable hasta el foco de cámara.")
	_refresh()
