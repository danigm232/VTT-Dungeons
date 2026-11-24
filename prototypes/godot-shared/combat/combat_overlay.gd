extends Control
const Targeting=preload("res://combat/action_targeting.gd")
var controller: Node
func _ready() -> void:
	mouse_filter=Control.MOUSE_FILTER_IGNORE; set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
func _process(_delta: float) -> void:
	visible=controller!=null and controller.ui.current_role!="projector" and not controller.dialog.visible and not controller.ui.player_hud.modal_backdrop.visible and (not controller.armed.is_empty() or controller.rules.pending.get("kind","")=="guided")
	if visible: queue_redraw()
func _draw() -> void:
	if controller==null or not is_instance_valid(controller.ui.camera): return
	var pending: Dictionary = controller.rules.pending
	var selecting: bool = not controller.armed.is_empty()
	var action: Dictionary = controller.armed if selecting else pending.get("action", {})
	var actor_id: String = controller.acting_id() if selecting else str(pending.get("actor", ""))
	var origin: Node3D = controller.token(actor_id)
	if not is_instance_valid(origin) or not origin.is_visible_in_tree() or action.is_empty(): return
	var camera: Camera3D=controller.ui.camera
	var frame: Node3D=origin.get_parent()
	var local_origin: Vector3=frame.to_local(origin.global_position)
	var ranges: Dictionary=action.get("range",{})
	var geometry:=Targeting.geometry(action)
	var direction_only: bool=geometry.get("placement","")=="direction"
	var radius: float=float(ranges.get("normalMeters",0))
	if radius>0 and not direction_only and geometry.get("placement","")!="self":
		var long_range := float(ranges.get("longMeters", radius))
		if long_range > radius: _draw_bound(camera, frame, local_origin, long_range, Color(.98,.63,.29,.67), true)
		_draw_bound(camera, frame, local_origin, radius, Color(.55,.85,.70,.70), false)
	var point: Vector3 = controller.preview_point if selecting else pending.get("point", Vector3.ZERO)
	var has_point: bool = (controller.preview_valid if selecting else not pending.is_empty()) or geometry.get("placement","")=="self"
	if not geometry.is_empty() and has_point:
		var footprint:=Targeting.footprint(action,local_origin,frame.to_local(point))
		var polygon:=PackedVector2Array()
		for vertex in footprint:
			var world := frame.to_global(vertex + Vector3.UP * .07)
			if camera.is_position_behind(world):
				polygon.clear()
				break
			polygon.append(camera.unproject_position(world))
		if polygon.size()>=3:
			draw_colored_polygon(polygon,Color(.45,.83,.76,.12)); polygon.append(polygon[0]); draw_polyline(polygon,Color(.55,.9,.8,.75),1.7,true)
	if controller.preview_target.is_empty() or controller.armed.is_empty(): return
	var target: Node3D=controller.token(controller.preview_target)
	if not is_instance_valid(target) or not target.is_visible_in_tree() or camera.is_position_behind(target.global_position): return
	var color:=Color("8de1b3") if controller.preview_valid else Color("ef8d7b")
	var bounds: Dictionary = action.get("range", {})
	var normal := float(bounds.get("normalMeters", 0))
	if controller.preview_valid and normal > 0 and float(bounds.get("longMeters", normal)) > normal:
		if controller.rules.distance(actor_id, str(controller.preview_target)) > normal + .15: color = Color("f4b96c")
	var line:=PackedVector2Array()
	var basis: Basis = target.get_parent().global_basis
	for i in range(33): line.append(camera.unproject_position(target.global_position+basis*Vector3(cos(TAU*i/32.0)*.65,.08,sin(TAU*i/32.0)*.65)))
	draw_polyline(line,color,2,true)

func _draw_bound(camera: Camera3D, frame: Node3D, origin: Vector3, radius: float, color: Color, dashed: bool) -> void:
	var corners := PackedVector2Array()
	for corner in [Vector2(-1,-1), Vector2(1,-1), Vector2(1,1), Vector2(-1,1)]:
		var point := frame.to_global(origin + Vector3(corner.x * radius, .06, corner.y * radius))
		if camera.is_position_behind(point): return
		corners.append(camera.unproject_position(point))
	for index in range(4):
		var from := corners[index]
		var to := corners[(index + 1) % 4]
		if dashed: draw_dashed_line(from, to, color, 1.3, 8.0, false, true)
		else: draw_line(from, to, color, 1.5, true)
