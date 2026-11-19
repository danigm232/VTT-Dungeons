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
	var action: Dictionary=controller.armed if not controller.armed.is_empty() else controller.rules.pending.get("action",{})
	var origin: Node3D=controller.token(controller.acting_id())
	if origin==null or action.is_empty(): return
	var camera: Camera3D=controller.ui.camera
	var frame: Node3D=origin.get_parent()
	var local_origin: Vector3=frame.to_local(origin.global_position)
	var ranges: Dictionary=action.get("range",{})
	var geometry:=Targeting.geometry(action)
	var direction_only: bool=geometry.get("placement","")=="direction"
	var radius: float=float(ranges.get("normalMeters",0))
	if radius>0 and not direction_only and geometry.get("placement","")!="self":
		var line:=PackedVector2Array()
		for corner in [Vector2(-1,-1),Vector2(1,-1),Vector2(1,1),Vector2(-1,1),Vector2(-1,-1)]: line.append(camera.unproject_position(frame.to_global(local_origin+Vector3(corner.x*radius,.06,corner.y*radius))))
		draw_polyline(line,Color(.55,.85,.7,.24),1.2,true)
	var point: Vector3=controller.rules.pending.get("point",controller.preview_point)
	var has_point: bool=controller.preview_valid or not controller.rules.pending.is_empty() or geometry.get("placement","")=="self"
	if not geometry.is_empty() and has_point:
		var footprint:=Targeting.footprint(action,local_origin,frame.to_local(point))
		var polygon:=PackedVector2Array()
		for vertex in footprint: polygon.append(camera.unproject_position(frame.to_global(vertex+Vector3.UP*.07)))
		if polygon.size()>=3:
			draw_colored_polygon(polygon,Color(.45,.83,.76,.12)); polygon.append(polygon[0]); draw_polyline(polygon,Color(.55,.9,.8,.75),1.7,true)
	if controller.preview_target.is_empty() or controller.armed.is_empty(): return
	var target: Node3D=controller.token(controller.preview_target)
	if target==null: return
	var color:=Color("8de1b3") if controller.preview_valid else Color("ef8d7b")
	var line:=PackedVector2Array()
	for i in range(33): line.append(camera.unproject_position(target.global_position+Vector3(cos(TAU*i/32.0)*.65,.08,sin(TAU*i/32.0)*.65)))
	draw_polyline(line,color,2,true)
