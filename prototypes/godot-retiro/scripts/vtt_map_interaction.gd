extends Node

var ui: Node
var camera: Camera3D
var selected: Node3D
var menu: PopupMenu
var anchor: Vector3
var _dragging: bool = false
var _drag_moved: bool = false
var _drag_start := Vector2.ZERO
var _undo: Array[Dictionary] = []

func _ready() -> void:
	ui = get_parent()
	camera = ui.camera
	menu = PopupMenu.new()
	menu.name = "DmMapContextMenu"
	add_child(menu)
	menu.id_pressed.connect(_choose)
	if ui.has_signal("role_changed"):
		ui.role_changed.connect(func(_role):
			_dragging = false
			menu.hide()
		)

func _unhandled_input(event: InputEvent) -> void:
	if ui.current_role != "dm": return
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		selected = null; _dragging = false
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and event.pressed and event.ctrl_pressed and event.keycode == KEY_Z:
		_undo_place(); get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.double_click and event.pressed:
				selected = _token_at(event.position)
				if not selected:
					var hit := _pick(event.position)
					selected = hit.get("collider") as Node3D
				get_viewport().set_input_as_handled()
			elif not selected:
				_dragging = event.pressed; _drag_start = event.position; _drag_moved = false
				get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			var hit := _pick(event.position)
			if not hit.is_empty():
				anchor = hit["position"]
				_open_menu(event.position)
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _dragging:
		if event.position.distance_to(_drag_start)>6.0: _drag_moved = true
		if _drag_moved: camera.pan_pixels(event.relative)
		get_viewport().set_input_as_handled()

func _token_at(point: Vector2) -> Node3D:
	var closest: Node3D
	var nearest: float = INF
	for token in ui.main_ctrl.find_children("*","CharacterBody3D",true,false):
		if not token.is_visible_in_tree() or camera.is_position_behind(token.global_position): continue
		var height: float = float(token.get("target_height")) if token.get("target_height") != null else 1.65
		var foot: Vector2 = camera.unproject_position(token.global_position)
		var head: Vector2 = camera.unproject_position(token.global_position+Vector3.UP*height)
		var width := maxf(12.0,foot.distance_to(head)*0.75)
		var rect := Rect2(Vector2(head.x-width*0.5,minf(head.y,foot.y)-5.0),Vector2(width,absf(foot.y-head.y)+10.0))
		var distance: float = camera.global_position.distance_squared_to(token.global_position)
		if rect.has_point(point) and distance<nearest: closest = token; nearest = distance
	return closest

func _pick(point: Vector2) -> Dictionary:
	var start := camera.project_ray_origin(point)
	var query := PhysicsRayQueryParameters3D.create(start,start+camera.project_ray_normal(point)*1800.0)
	return camera.get_world_3d().direct_space_state.intersect_ray(query)

func _open_menu(point: Vector2) -> void:
	menu.clear()
	if is_instance_valid(selected) and selected is CharacterBody3D:
		menu.add_item("Colocar aquí",0)
		menu.add_item("Seguir ficha",1)
		menu.add_item("Mostrar / ocultar ficha",5)
	menu.add_item("Mirar aquí · entrar al interior",2)
	menu.add_item("Bajar una planta aquí",6)
	menu.add_item("Subir una planta aquí",7)
	menu.add_item("Deseleccionar",3)
	if not _undo.is_empty(): menu.add_item("Deshacer traslado",4)
	menu.position = Vector2i(point)
	menu.popup()

func _choose(id: int) -> void:
	match id:
		0: place_selected(anchor)
		1:
			if is_instance_valid(selected):
				camera.set_follow_mode("follow")
				camera.set_target_character(selected)
		2: camera.explore_point(anchor)
		3: selected = null
		4: _undo_place()
		5:
			if is_instance_valid(selected): selected.visible = not selected.visible
		6,7: _explore_layer(id == 7)

func place_selected(point: Vector3) -> bool:
	if not is_instance_valid(selected) or not selected is CharacterBody3D: return false
	# An animated stair/ladder tween owns the position until it finishes.
	if selected.get("is_transitioning") == true:
		ui.notify_mesa("Espera a que termine el acceso antes de trasladar la ficha.")
		return false
	var destination := point+Vector3.UP*0.12
	for shape: CollisionShape3D in selected.find_children("*","CollisionShape3D",true,false):
		if shape.get_parent() != selected or not shape.shape: continue
		var query := PhysicsShapeQueryParameters3D.new()
		query.shape = shape.shape
		query.transform = shape.global_transform
		query.transform.origin += destination-selected.global_position
		query.exclude = [selected.get_rid()]
		query.margin = 0.01
		if not camera.get_world_3d().direct_space_state.intersect_shape(query,1).is_empty():
			ui.notify_mesa("Ese destino está ocupado o bloqueado.")
			return false
	_undo.append({"token":selected,"position":selected.global_position})
	if _undo.size()>20: _undo.pop_front()
	_relocate(selected,destination)
	ui.notify_mesa("Ficha colocada · Ctrl+Z para deshacer")
	return true

func _relocate(token: CharacterBody3D, destination: Vector3) -> void:
	if token.get("in_boat") == true:
		var boat: Node3D = token.get("current_boat")
		if is_instance_valid(boat) and boat.has_method("disembark"): boat.disembark()
	token.global_position = destination
	token.velocity = Vector3.ZERO
	if token.get("input_override") != null: token.set("input_override",Vector2.ZERO)
	if token.get("is_jumping") != null: token.set("is_jumping",false)
	if token.get("jump_timer") != null: token.set("jump_timer",0.0)

func _undo_place() -> void:
	if _undo.is_empty(): return
	var previous: Dictionary = _undo.pop_back()
	var token: Node3D = previous["token"]
	if is_instance_valid(token):
		if token.get("is_transitioning") == true:
			_undo.append(previous)
			return
		_relocate(token,previous["position"])

func _explore_layer(up: bool) -> void:
	var point: Vector3 = camera.target.global_position if camera.target else anchor
	var query := PhysicsRayQueryParameters3D.create(point+Vector3.UP*(100.0 if up else -0.3),point+Vector3.DOWN*150.0)
	var excluded: Array[RID] = []
	for _i in range(20):
		query.exclude = excluded
		var hit := camera.get_world_3d().direct_space_state.intersect_ray(query)
		if hit.is_empty(): break
		var height: float = hit["position"].y
		if hit["normal"].y>0.5 and ((up and height>point.y+0.4) or (not up and height<point.y-0.4)):
			camera.explore_point(hit["position"]); return
		excluded.append(hit["rid"])
	ui.notify_mesa("No hay otra planta en este punto.")
