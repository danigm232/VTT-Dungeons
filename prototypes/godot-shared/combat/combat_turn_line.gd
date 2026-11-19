extends BoxContainer
## A continuous line behind portraits; no window or enclosing card.
func _process(_delta: float) -> void: queue_redraw()
func _draw() -> void:
	var points: Array[Vector2]=[]
	for child in get_children():
		if child.get_child_count()==0: continue
		var portrait: Control=child.get_child(0)
		points.append(child.position+portrait.position+portrait.size*.5)
	for i in range(points.size()-1): draw_line(points[i],points[i+1],Color("9f9981"),1.5,true)
	for i in range(points.size()):
		var p:=points[i]; var r:=29.0 if i==0 else 23.0
		var diamond:=PackedVector2Array([p+Vector2(0,-r),p+Vector2(r,0),p+Vector2(0,r),p+Vector2(-r,0)])
		draw_colored_polygon(diamond,Color("142831"))
		diamond.append(diamond[0]); draw_polyline(diamond,Color("80dbf1") if i==0 else Color("bcac83"),2 if i==0 else 1,true)
