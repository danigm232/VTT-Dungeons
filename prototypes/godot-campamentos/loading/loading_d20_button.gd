extends BaseButton
## Native Godot port of Codex's projected 20-face SkillD20 button for desktop player loading.

const PHI := (1.0 + sqrt(5.0)) / 2.0
const ROLL_DURATION_MS := 1115.0
const VERTICES := [
	Vector3(-1, PHI, 0), Vector3(1, PHI, 0), Vector3(-1, -PHI, 0), Vector3(1, -PHI, 0),
	Vector3(0, -1, PHI), Vector3(0, 1, PHI), Vector3(0, -1, -PHI), Vector3(0, 1, -PHI),
	Vector3(PHI, 0, -1), Vector3(PHI, 0, 1), Vector3(-PHI, 0, -1), Vector3(-PHI, 0, 1),
]
const FACES := [
	[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
	[1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
	[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
	[4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
]
static var IDLE_HEX := PackedVector2Array([
	Vector2(110, 53), Vector2(163, 83), Vector2(163, 142),
	Vector2(110, 173), Vector2(57, 142), Vector2(57, 83),
])
static var IDLE_CROWN := PackedVector2Array([
	Vector2(110, 53), Vector2(163, 83), Vector2(110, 72), Vector2(57, 83),
])
static var IDLE_CENTER := PackedVector2Array([
	Vector2(110, 72), Vector2(143, 133), Vector2(77, 133),
])
const IDLE_RIBS := [
	[Vector2(57, 83), Vector2(77, 133)],
	[Vector2(77, 133), Vector2(57, 142)],
	[Vector2(77, 133), Vector2(110, 173)],
	[Vector2(110, 173), Vector2(143, 133)],
	[Vector2(143, 133), Vector2(163, 142)],
	[Vector2(143, 133), Vector2(163, 83)],
	[Vector2(110, 53), Vector2(110, 72)],
]
const IDLE_SIDE_FACETS := [
	["7", Vector2(80, 99), -0.908],
	["13", Vector2(141, 99), 0.855],
	["3", Vector2(110, 151), 0.0],
	["5", Vector2(66, 127), -1.204],
	["2", Vector2(154, 127), 1.204],
]

var text: String = "⬡ 20"
var reduced_motion: bool = false
var _font: Font
var _natural_value: int = 20
var _has_roll: bool = false
var _roll_started_ms: int = -1
var _orbit_angle: float = 0.0
var _tumble_progress: float = -1.0

func _ready() -> void:
	focus_mode = Control.FOCUS_ALL
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	tooltip_text = "Lanzar d20 de práctica"
	var serif := SystemFont.new()
	serif.font_names = PackedStringArray(["Georgia", "Liberation Serif", "serif"])
	_font = serif
	mouse_entered.connect(queue_redraw)
	mouse_exited.connect(queue_redraw)
	focus_entered.connect(queue_redraw)
	focus_exited.connect(queue_redraw)

func reset_die() -> void:
	_has_roll = false
	_roll_started_ms = -1
	_tumble_progress = -1.0
	_natural_value = 20
	text = "⬡ 20"
	queue_redraw()

func set_roll_state(own_roll: Dictionary, is_reduced: bool, now_ms: int = -1) -> void:
	reduced_motion = is_reduced
	if own_roll.is_empty():
		if _has_roll or _tumble_progress >= 0.0:
			reset_die()
		return
	var current_ms := Time.get_ticks_msec() if now_ms < 0 else now_ms
	_natural_value = clampi(int(own_roll.get("natural", 20)), 1, 20)
	_roll_started_ms = int(own_roll.get("at", current_ms))
	_has_roll = true
	var elapsed := maxf(0.0, float(current_ms - _roll_started_ms))
	if not reduced_motion and elapsed < ROLL_DURATION_MS:
		_tumble_progress = clampf(elapsed / ROLL_DURATION_MS, 0.0, 1.0)
		text = "⬡ %d" % (1 + int(elapsed / 45.0) % 20)
	else:
		_tumble_progress = -1.0
		text = "⬡ %d" % _natural_value
	queue_redraw()

func is_tumbling() -> bool:
	return _tumble_progress >= 0.0 and _tumble_progress < 1.0

func _process(delta: float) -> void:
	if not visible:
		return
	if not reduced_motion and (not disabled or is_tumbling()):
		_orbit_angle = fmod(_orbit_angle + delta * 0.48, TAU)
		queue_redraw()

static func project_faces(progress: float, scale_factor: float = 1.4, center := Vector2(110.0, 110.0)) -> Array[Dictionary]:
	var t := clampf(progress, 0.0, 1.0)
	var turn := 1.0 - pow(1.0 - t, 2.2)
	var ax := 0.4 + turn * PI * 5.0
	var ay := 0.7 + turn * PI * 7.0
	var az := turn * PI * 3.0
	var points: Array[Vector3] = []
	points.resize(VERTICES.size())
	for idx in range(VERTICES.size()):
		var v: Vector3 = VERTICES[idx]
		var y1 := v.y * cos(ax) - v.z * sin(ax)
		var z1 := v.y * sin(ax) + v.z * cos(ax)
		var x2 := v.x * cos(ay) + z1 * sin(ay)
		var z2 := -v.x * sin(ay) + z1 * cos(ay)
		var x3 := x2 * cos(az) - y1 * sin(az)
		var y3 := x2 * sin(az) + y1 * cos(az)
		var perspective := 1.0 / (1.0 - z2 * 0.13)
		var px := center.x + (x3 * 31.0 * perspective) * scale_factor
		var py := center.y + (y3 * 31.0 * perspective) * scale_factor
		points[idx] = Vector3(px, py, z2)

	var sorted: Array[Dictionary] = []
	for face_idx in range(FACES.size()):
		var face: Array = FACES[face_idx]
		var p0: Vector3 = points[face[0]]
		var p1: Vector3 = points[face[1]]
		var p2: Vector3 = points[face[2]]
		var z_avg := (p0.z + p1.z + p2.z) / 3.0
		var poly := PackedVector2Array([Vector2(p0.x, p0.y), Vector2(p1.x, p1.y), Vector2(p2.x, p2.y)])
		var area := absf((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y))
		var light_pct := clampf(15.0 + (z_avg + 1.6) * 7.0, 6.0, 44.0)
		sorted.append({
			"number": face_idx + 1,
			"z": z_avg,
			"poly": poly,
			"center": (poly[0] + poly[1] + poly[2]) / 3.0,
			"angle": atan2(p1.y - p0.y, p1.x - p0.x),
			"area": area,
			"fill": _hsl_color(34.0 / 360.0, 0.48, light_pct / 100.0),
		})
	sorted.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a.z) < float(b.z))
	return sorted

static func _hsl_color(h: float, s: float, l: float) -> Color:
	var v := l + s * minf(l, 1.0 - l)
	var sv := 0.0 if v <= 0.0 else 2.0 * (1.0 - l / v)
	return Color.from_hsv(h, sv, v)

func _draw() -> void:
	var scale_s := minf(size.x, size.y) / 220.0
	if scale_s <= 0.0:
		return
	var offset := (size - Vector2(220.0, 220.0) * scale_s) * 0.5
	var hovered := not disabled and (is_hovered() or has_focus())
	var settled := _has_roll and not is_tumbling()
	var die_alpha := 0.62 if settled and not hovered else 1.0
	var glow_boost := 1.35 if hovered else (0.65 if disabled and not is_tumbling() else 1.0)

	draw_set_transform(offset, 0.0, Vector2.ONE * scale_s)
	_draw_halo_and_orbit(glow_boost)

	if is_tumbling():
		var toss := _toss_offset(_tumble_progress)
		draw_set_transform(offset + toss * scale_s, 0.0, Vector2.ONE * scale_s)
		_draw_tumbling_icosahedron(_tumble_progress)
	else:
		_draw_idle_die(die_alpha, hovered)

	draw_set_transform_matrix(Transform2D.IDENTITY)

func _toss_offset(t: float) -> Vector2:
	# Mirrors skill-die-roll keyframe arc without leaving the button footprint.
	var arc := sin(clampf(t, 0.0, 1.0) * PI)
	return Vector2(sin(t * TAU) * 4.5 * (1.0 - t), -10.0 * arc)

func _draw_halo_and_orbit(glow_boost: float) -> void:
	var center := Vector2(110.0, 110.0)
	for i in range(6, 0, -1):
		var frac := float(i) / 6.0
		var a := (1.0 - frac) * 0.11 * glow_boost
		draw_circle(center, 104.0 * frac, Color(0.95, 0.70, 0.33, a))
	var ring_alpha := clampf(0.45 * glow_boost, 0.14, 0.85)
	var orbit_col := Color(0.97, 0.73, 0.40, ring_alpha)
	draw_arc(center, 97.0, _orbit_angle, _orbit_angle + PI * 0.72, 24, orbit_col, 1.6, true)
	draw_arc(center, 97.0, _orbit_angle + PI * 1.04, _orbit_angle + PI * 1.76, 24, orbit_col, 1.4, true)
	var glint := Color(1.0, 0.89, 0.64, clampf(0.65 * glow_boost, 0.2, 0.95))
	for ang_off in [0.15, 2.35, 4.4]:
		var p := center + Vector2.from_angle(_orbit_angle + ang_off) * 97.0
		draw_line(p - Vector2(3.5, 0), p + Vector2(3.5, 0), glint, 1.1)
		draw_line(p - Vector2(0, 3.5), p + Vector2(0, 3.5), glint, 1.1)

func _draw_idle_die(alpha: float, hovered: bool) -> void:
	var edge := Color("fff1b3") if hovered else Color("efb85f")
	edge.a = alpha
	var gem_dark := Color(0.18, 0.13, 0.10, 0.94 * alpha)
	var crown_col := Color(0.71, 0.51, 0.29, 0.54 * alpha)
	var center_col := Color(0.20, 0.16, 0.11, 0.86 * alpha)
	draw_colored_polygon(IDLE_HEX, gem_dark)
	draw_colored_polygon(IDLE_CROWN, crown_col)
	draw_colored_polygon(IDLE_CENTER, center_col)
	var border := PackedVector2Array(IDLE_HEX)
	border.append(IDLE_HEX[0])
	draw_polyline(border, edge, 2.4, true)
	draw_polyline(IDLE_CENTER + PackedVector2Array([IDLE_CENTER[0]]), edge, 1.8, true)
	for seg in IDLE_RIBS:
		draw_line(seg[0], seg[1], edge, 1.7, true)
	if _font == null:
		return
	var facet_col := Color(0.86, 0.64, 0.33, 0.72 * alpha)
	for facet in IDLE_SIDE_FACETS:
		_draw_centered_text(str(facet[0]), facet[1], 9, facet_col, float(facet[2]))
	var label_str := str(_natural_value) if _has_roll else "20"
	var text_col := Color(1.0, 0.95, 0.77, alpha)
	_draw_centered_text(label_str, Vector2(110.0, 116.5), 25, text_col, 0.0)

func _draw_tumbling_icosahedron(progress: float) -> void:
	var sorted := project_faces(progress, 1.4, Vector2(110.0, 110.0))
	var edge := Color("edbd71")
	var text_col := Color("ffe9ac")
	for tile in sorted:
		var poly: PackedVector2Array = tile.poly
		draw_colored_polygon(poly, tile.fill)
		var ring := PackedVector2Array(poly)
		ring.append(poly[0])
		draw_polyline(ring, edge, 1.8, true)
		if float(tile.z) > 0.0 and float(tile.area) > 135.0 and _font != null:
			var px := clampi(roundi(sqrt(float(tile.area)) * 0.45), 9, 24)
			_draw_centered_text(str(tile.number), tile.center, px, text_col, float(tile.angle))

func _draw_centered_text(msg: String, pos: Vector2, font_px: int, color: Color, angle: float) -> void:
	var scale_s := minf(size.x, size.y) / 220.0
	var offset := (size - Vector2(220.0, 220.0) * scale_s) * 0.5
	var toss := _toss_offset(_tumble_progress) if is_tumbling() else Vector2.ZERO
	var base_xf := Transform2D(0.0, Vector2.ONE * scale_s, 0.0, offset + toss * scale_s)
	draw_set_transform_matrix(base_xf * Transform2D(angle, Vector2.ONE, 0.0, pos))
	var sz := _font.get_string_size(msg, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px)
	var ascent := _font.get_ascent(font_px)
	var descent := _font.get_descent(font_px)
	draw_string(_font, Vector2(-sz.x * 0.5, (ascent - descent) * 0.5), msg, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, color)
	draw_set_transform_matrix(base_xf)
