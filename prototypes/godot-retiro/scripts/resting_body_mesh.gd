extends RefCounted
## Closed, smooth cross-sections for the visible part of a reclining character.
## The front UVs keep the landmarks of the painted pose in register.

const RINGS := 96
const SIDES := 112

static func build(frame: Dictionary, size: Vector2, bed: Dictionary, placement: Transform3D, end_v: float) -> ArrayMesh:
	var sculpt: Dictionary = frame.get("rest_sculpt", {})
	var contour: Array = frame.rest_contour
	var volume: Dictionary = frame.rest_volume
	var pivot: Vector2 = frame.visual_pivot
	var eyes := float(sculpt.get("eyes", 0.135))
	var uncovered: bool = frame.get("rest_blanket", {}).is_empty()
	var nose: Array = sculpt.get("nose", [0.5, 0.155])
	var jaw := float(sculpt.get("jaw", 0.193))
	var face_width := float(sculpt.get("faceHalfWidth", 0.165))
	var tilt := deg_to_rad(float(sculpt.get("recline", 14.0)))
	var pillow_end := float(bed.get("pillow_end", 0.0))
	if pillow_end > 0.0:
		tilt = 0.0
	var beard_end := float(sculpt.get("beardEnd", 0.0))
	var pillow: Vector3 = bed.head
	var support_offset := float(bed.bedding_y) - pillow.y
	var crown_row := 0
	while crown_row < contour.size() - 1 and contour[crown_row].is_empty():
		crown_row += 1
	var crown := float(crown_row) / (contour.size() - 1)

	var vertices := PackedVector3Array()
	var uvs := PackedVector2Array()
	for ring in range(RINGS + 1):
		var v := lerpf(crown, end_v, float(ring) / RINGS)
		var outline := _outline(contour, v)
		var painted := _painted_row(contour, v)
		var rim_fit := lerpf(0.45, 1.0, sin(smoothstep(crown, crown + 0.027, v) * PI * 0.5))
		var rim_midpoint := (outline.x + outline.y) * 0.5
		outline = Vector2(lerpf(rim_midpoint, outline.x, rim_fit), lerpf(rim_midpoint, outline.y, rim_fit))
		var neck := smoothstep(jaw - 0.012, jaw + 0.075, v)
		var crown_rise := smoothstep(crown - 0.017, eyes - 0.041, v)
		var chin_round := 1.0 - 0.15 * smoothstep(float(nose[1]), jaw, v)
		var neck_under := 1.0 - smoothstep(jaw - 0.007, jaw + 0.067, v)
		var skull := crown_rise * chin_round * neck_under
		var chest := smoothstep(jaw + 0.015, jaw + 0.106, v) * (1.0 - smoothstep(0.32, 0.55, v) * 0.22)
		if uncovered:
			chest *= 1.0 - smoothstep(0.51, 0.78, v)
		var legs := smoothstep(0.52, 0.72, v)
		var legs_depth := lerpf(float(volume.hips), float(volume.calves), smoothstep(0.54, 0.80, v))
		legs_depth = lerpf(legs_depth, float(volume.boots), smoothstep(0.86, 0.98, v))
		var length := (v - pivot.y) * size.y
		var support := support_offset * neck
		if pillow_end > 0.0:
			support = support_offset * smoothstep(pillow_end - 0.012, pillow_end + 0.26, length)
		var heading_tilt := tilt * (1.0 - smoothstep(jaw - 0.012, jaw + 0.052, v))
		var base_depth := (0.035 + 0.027 * skull) * size.y
		var front_depth := (0.037 + float(volume.head) * 0.71 * skull + float(volume.chest) * 0.79 * chest) * size.y * rim_fit
		var nose_along := _bell((v - float(nose[1])) / 0.014)
		var cheek_along := _bell((v - lerpf(eyes, jaw, 0.42)) / 0.033)
		var beard_along := smoothstep(0.149, 0.193, v) * (1.0 - smoothstep(beard_end - 0.09, beard_end, v)) if beard_end > 0.0 else 0.0
		for column in range(SIDES + 1):
			var angle := TAU * float(column % SIDES) / SIDES - PI
			var cross := sin(angle)
			var front := cos(angle)
			var u := lerpf(outline.x, outline.y, cross * 0.5 + 0.5)
			var depth := -base_depth * maxf(0.0, -front)
			if front >= 0.0:
				var face_x := (u - float(nose[0])) / face_width
				var facial_features := nose_along * _bell(face_x / 0.21) * 0.011
				facial_features += cheek_along * _bell((absf(face_x) - 0.63) / 0.33) * 0.009
				var sleeve := _bell((absf(cross) - 0.72) / 0.19) * chest * 0.042
				var beard := beard_along * _bell(face_x / 1.0) * 0.038
				depth = front_depth * pow(front, 0.93) + size.y * front * (facial_features + sleeve + beard)
				if uncovered:
					var thighs := _bell((absf(cross) - 0.47) / 0.43)
					depth += size.y * front * legs * legs_depth * (0.2 + thighs * 0.58)
			var point := Vector3((u - pivot.x) * size.x, depth, length)
			point = point.rotated(Vector3.RIGHT, heading_tilt)
			point.y += support
			vertices.append(placement * point)
			var projected_arc := asin(clampf(cross, -1.0, 1.0))
			var mapped := _unwrap_flank(projected_arc) * lerpf(1.0, 0.64, maxf(0.0, -front))
			var paint_u := lerpf(painted.x, painted.y, mapped * 0.5 + 0.5)
			if uncovered and front >= 0.0:
				paint_u = lerpf(paint_u, u, smoothstep(0.0, 0.54, front))
			uvs.append(Vector2(paint_u, v))

	var stride := SIDES + 1
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	for ring in range(RINGS + 1):
		for column in range(stride):
			var vertex := ring * stride + column
			var previous_col := posmod(column - 1, SIDES)
			var next_col := (column + 1) % SIDES
			var around := vertices[ring * stride + next_col] - vertices[ring * stride + previous_col]
			var along := vertices[mini(ring + 1, RINGS) * stride + column] - vertices[maxi(0, ring - 1) * stride + column]
			normals.append(along.cross(around).normalized())
			if ring < RINGS and column < SIDES:
				indices.append_array(PackedInt32Array([
					vertex, vertex + 1, vertex + stride,
					vertex + 1, vertex + stride + 1, vertex + stride,
				]))
	for column in range(1, SIDES - 1):
		indices.append_array(PackedInt32Array([0, column + 1, column]))
		var last_ring := RINGS * stride
		indices.append_array(PackedInt32Array([last_ring, last_ring + column, last_ring + column + 1]))

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh

static func _outline(contour: Array, v: float) -> Vector2:
	var row := v * (contour.size() - 1)
	var line := floori(row)
	var fraction := row - line
	var pair := Vector2.ZERO
	var weight_sum := 0.0
	for offset in range(-3, 4):
		var index := clampi(line + offset, 0, contour.size() - 1)
		var spans: PackedVector2Array = contour[index]
		if not spans.is_empty():
			var weight := _bell((offset - fraction) / 2.0)
			pair += Vector2(spans[0].x, spans[spans.size() - 1].y) * weight
			weight_sum += weight
	if weight_sum == 0.0:
		return Vector2(0.495, 0.505)
	pair /= weight_sum
	return Vector2(maxf(pair.x - 0.009, 0.0), minf(pair.y + 0.009, 1.0))

static func _painted_row(contour: Array, v: float) -> Vector2:
	var row := v * (contour.size() - 1)
	var low := floori(row)
	var high := mini(low + 1, contour.size() - 1)
	var a: PackedVector2Array = contour[low]
	var b: PackedVector2Array = contour[high]
	if a.is_empty():
		a = b
	if b.is_empty():
		b = a
	if a.is_empty():
		return _outline(contour, v)
	var span_a := Vector2(a[0].x, a[a.size() - 1].y)
	var span_b := Vector2(b[0].x, b[b.size() - 1].y)
	var span := span_a.lerp(span_b, row - low)
	var inset := (span.y - span.x) * 0.064
	return span + Vector2(inset, -inset)

static func _unwrap_flank(angle: float) -> float:
	const FACE_EDGE := 0.43
	var side := absf(angle)
	if side <= FACE_EDGE:
		return sin(angle)
	var span := PI * 0.5 - FACE_EDGE
	var t := (side - FACE_EDGE) / span
	var face_edge_x := sin(FACE_EDGE)
	var tangent := cos(FACE_EDGE) * span
	var wrapped := lerpf(face_edge_x, 1.0, t * t * (3.0 - 2.0 * t))
	wrapped += tangent * t * pow(1.0 - t, 2.0) - 0.39 * t * t * (1.0 - t)
	return signf(angle) * wrapped

static func _bell(x: float) -> float:
	return exp(-x * x)
