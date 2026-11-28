extends RefCounted
## Port of engine/client/radial-layout.ts: the control is the origin and
## the fan opens inward at an invariant arc radius for all submenus.
const FIXED_RADIUS := 324.0

static func reach_radius(reach_id: String) -> float:
	match reach_id:
		"compact": return 280.0
		"wide": return 368.0
		_: return 324.0

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

static func effective_angles(origin: Vector2, viewport: Vector2, slot_count: int) -> Vector2:
	var span := arc(origin, viewport)
	var bottom_right := origin.y > viewport.y * .72 and origin.x > viewport.x * .72
	var bottom_left := origin.y > viewport.y * .72 and origin.x < viewport.x * .28
	var top_left := origin.y < viewport.y * .28 and origin.x < viewport.x * .28
	var top_right := origin.y < viewport.y * .28 and origin.x > viewport.x * .72
	var wider := slot_count >= 7
	var start_inset := (0.36 if wider else 0.40) if bottom_right else ((-0.02 if wider else 0.04) if bottom_left else (0.12 if top_left else 0.08))
	var end_inset := (0.36 if wider else 0.40) if bottom_left else ((-0.02 if wider else 0.04) if bottom_right else (0.12 if top_right else 0.08))
	return Vector2(span.x + start_inset, span.y - end_inset)

static func _circle_intersects_rect(center: Vector2, radius: float, rect: Rect2) -> bool:
	var closest := Vector2(clampf(center.x, rect.position.x, rect.end.x), clampf(center.y, rect.position.y, rect.end.y))
	return center.distance_squared_to(closest) < radius * radius

static func slot_angles(origin: Vector2, viewport: Vector2, item_count: int, slot_capacity: int = 5) -> Array[float]:
	var eff := effective_angles(origin, viewport, maxi(slot_capacity, item_count))
	var angles: Array[float] = []
	if item_count <= 0:
		return angles
	var denom_slots := maxi(item_count, mini(5, slot_capacity))
	if item_count < denom_slots:
		# Center sparse items cleanly inside the canonical arc so arm length & spacing match full views.
		var step := (eff.y - eff.x) / float(maxi(1, denom_slots - 1))
		var mid := (eff.x + eff.y) * 0.5
		var first := mid - step * float(item_count - 1) * 0.5
		for i in range(item_count):
			angles.append(first + step * float(i))
	else:
		for i in range(item_count):
			var t := 0.5 if item_count == 1 else float(i) / float(item_count - 1)
			angles.append(lerpf(eff.x, eff.y, t))
	return angles

static func arrange(origin: Vector2,viewport: Vector2,labels: Array,node_size: float=54.0,reserved: Array[Rect2]=[],preferred_radius: float=324.0,slot_capacity: int=0) -> Dictionary:
	var span:=arc(origin,viewport)
	var bounds:=Rect2(Vector2(10,66),viewport-Vector2(20,76))
	var eff_cap := slot_capacity if slot_capacity > 0 else labels.size()
	var base_r := roundi(preferred_radius)
	var radii: Array[int]=[base_r, 324, 340, 296, 280, 260, 240, 222, 204, 186, 168]
	var angs := slot_angles(origin, viewport, labels.size(), eff_cap)
	var ring_margin := 12.5
	for check_ring in [true, false]:
		for radius in radii:
			var points: Array[Vector2]=[]; var fits:=true
			var half_n := node_size * 0.5
			var check_r := half_n + (ring_margin if check_ring else 0.0)
			for i in range(labels.size()):
				var angle:=angs[i]
				var point:=origin+Vector2(cos(angle),sin(angle))*float(radius)
				var outer_box:=Rect2(point-Vector2.ONE*check_r,Vector2.ONE*(check_r*2.0))
				if not bounds.encloses(outer_box): fits=false; break
				for obstacle in reserved:
					if obstacle.intersects(Rect2(point-Vector2.ONE*(half_n + 6.0),Vector2.ONE*((half_n + 6.0)*2.0))): fits=false; break
				if not fits: break
				for prev_pt in points:
					if prev_pt.distance_to(point) < node_size + 1.5: fits=false; break
				if not fits: break
				points.append(point)
			if fits: return {"origin":origin,"arc":span,"effective_arc":effective_angles(origin,viewport,eff_cap),"angles":angs,"radius":float(radius),"points":points,"captions":true}
	# Small logical viewports keep separate targets cleanly inside bounds.
	var points: Array[Vector2]=[]
	var fallback_angles: Array[float]=[]
	for i in range(labels.size()):
		var angle:=lerpf(span.x+.24,span.y-.14,float(i%2) if labels.size()<=4 else float(i%3)/maxf(1.0,minf(2.0,float(labels.size()-1))))
		var p:=origin+Vector2(cos(angle),sin(angle))*(108+floori(i/2.0)*82)
		points.append(Vector2(clampf(p.x,44,viewport.x-44),clampf(p.y,104,viewport.y-44)))
		fallback_angles.append(angle)
	return {"origin":origin,"arc":span,"effective_arc":Vector2(span.x+.24,span.y-.14),"angles":fallback_angles,"radius":186.0,"points":points,"captions":false}
