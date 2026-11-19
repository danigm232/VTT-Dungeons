extends Control
var controller: Node

func _ready() -> void:
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func _process(_delta: float) -> void:
	visible=controller!=null and controller.ui.current_role!="projector" and (controller.rules.active or not controller.armed.is_empty())
	if visible: queue_redraw()

func _draw() -> void:
	if controller==null or not is_instance_valid(controller.ui.camera): return
	var camera: Camera3D=controller.ui.camera
	for id in controller.rules.actors:
		var token: Node3D=controller.token(id)
		if token==null or not token.is_visible_in_tree() or camera.is_position_behind(token.global_position): continue
		var frame: Node3D=token.get_parent() as Node3D
		var p: Vector3=frame.to_local(token.global_position)
		var x:=floorf(p.x/1.5)*1.5; var z:=floorf(p.z/1.5)*1.5
		var polygon:=PackedVector2Array()
		for offset in [Vector3(0,.05,0),Vector3(1.5,.05,0),Vector3(1.5,.05,1.5),Vector3(0,.05,1.5)]: polygon.append(camera.unproject_position(frame.to_global(Vector3(x,p.y,z)+offset)))
		var color:=Color("71d6ef") if controller.rules.actors[id].kind=="player" else Color("ef8d7b")
		draw_colored_polygon(polygon,Color(color,.09))
		polygon.append(polygon[0]); draw_polyline(polygon,Color(color,.8),1.7,true)
		draw_circle(camera.unproject_position(token.global_position),2.8,color)
	if controller.armed.is_empty(): return
	var origin: Node3D=controller.token(controller.acting_id())
	if origin==null: return
	var action: Dictionary=controller.armed
	var ranges: Dictionary=action.get("range",{})
	var normal:=float(ranges.get("normalMeters",1.5)); var long_range:=float(ranges.get("longMeters",normal))
	for entry in [[normal,Color("8de1b3")],[long_range,Color("dfb86a")]]:
		if entry[0]<=0 or entry[0]==normal and entry[0]==long_range and entry[1]==Color("dfb86a"): continue
		var line:=PackedVector2Array()
		# The rules use equal-cost grid diagonals, so the boundary is a square.
		# A circle would wrongly mark legal diagonal cells as out of range.
		for corner in [Vector2(-1,-1),Vector2(1,-1),Vector2(1,1),Vector2(-1,1),Vector2(-1,-1)]:
			var offset: Vector3=origin.get_parent().global_basis*Vector3(corner.x*float(entry[0]),.06,corner.y*float(entry[0]))
			line.append(camera.unproject_position(origin.global_position+offset))
		draw_polyline(line,Color(entry[1],.7),2.0,true)

