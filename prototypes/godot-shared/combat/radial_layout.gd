extends RefCounted
## Port of engine/client/radial-layout.ts: the control is the origin and
## the fan opens inward. Never relocate a full circle above the control.
static func arc(origin: Vector2,viewport: Vector2) -> Vector2:
	var left:=origin.x<viewport.x*.28; var right:=origin.x>viewport.x*.72
	var top:=origin.y<viewport.y*.28; var bottom:=origin.y>viewport.y*.72
	if left and top: return Vector2(0,PI*.5)
	if right and top: return Vector2(PI*.5,PI)
	if left and bottom: return Vector2(PI*1.5,TAU)
	if right and bottom: return Vector2(PI,PI*1.5)
	if left: return Vector2(-PI*.5,PI*.5)
	if right: return Vector2(PI*.5,PI*1.5)
	return Vector2(PI,TAU) if bottom or not top and origin.y>viewport.y*.5 else Vector2(0,PI)

static func arrange(origin: Vector2,viewport: Vector2,labels: Array,node_size: float=60.0,reserved: Array[Rect2]=[]) -> Dictionary:
	var span:=arc(origin,viewport)
	var bounds:=Rect2(Vector2(12,72),viewport-Vector2(24,86))
	for captions in [true,false]:
		for radius in range(150,367,6):
			var points: Array[Vector2]=[]; var boxes: Array[Rect2]=[]; var fits:=true
			for i in range(labels.size()):
				var t:=.5 if labels.size()==1 else float(i)/(labels.size()-1)
				var start_inset:=.4 if origin.y>viewport.y*.72 and origin.x>viewport.x*.72 else .18
				var end_inset:=.4 if origin.y>viewport.y*.72 and origin.x<viewport.x*.28 else .18
				var angle:=lerpf(span.x+start_inset,span.y-end_inset,t)
				var point:=origin+Vector2(cos(angle),sin(angle))*radius
				var icon_box:=Rect2(point-Vector2.ONE*node_size*.5,Vector2.ONE*node_size)
				var own: Array[Rect2]=[icon_box]
				if captions:
					var width:=clampf(str(labels[i]).length()*7.8+14,60,152)
					own.append(Rect2(point+Vector2(-width*.5,node_size*.5+3),Vector2(width,24)))
				for box in own:
					if not bounds.encloses(box): fits=false; break
					for obstacle in reserved:
						if obstacle.intersects(box): fits=false; break
					for previous in boxes:
						if previous.grow(4).intersects(box): fits=false; break
				if not fits: break
				points.append(point); boxes.append_array(own)
			if fits: return {"origin":origin,"arc":span,"radius":float(radius),"points":points,"captions":captions}
	# Small logical viewports keep four separate targets on two inward arcs.
	var points: Array[Vector2]=[]
	for i in range(labels.size()):
		var angle:=lerpf(span.x+.2,span.y-.2,float(i%2))
		var p:=origin+Vector2(cos(angle),sin(angle))*(100+floori(i/2.0)*82)
		points.append(Vector2(clampf(p.x,44,viewport.x-44),clampf(p.y,104,viewport.y-44)))
	return {"origin":origin,"arc":span,"radius":182.0,"points":points,"captions":false}
