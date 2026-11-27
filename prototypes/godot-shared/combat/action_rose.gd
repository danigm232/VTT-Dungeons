extends Control
## Inward orbital fan attached to the original action control; draws radial guide arc,
## curved orbital rotation animation along the circle, and aesthetic-matched back/arrow themes.
var reduced_motion := false
var wheel_style := "filigree"
var origin := Vector2.ZERO
var arc_span := Vector2(PI, PI * 1.5)
var effective_arc := Vector2(PI + 0.30, PI * 1.5 - 0.04)
var radius := 292.0
var points: Array[Vector2] = []
var angles: Array[float] = []
var rot_dir := 0

var _animated_nodes: Array[Dictionary] = []
var _anim_t := 1.0
const ANIM_DUR := 0.19

func register_orbital_item(ctrl: Control, caption_ctrl: Control, target_idx: int, total_count: int, radial_extra: float = 0.0) -> void:
	if target_idx < 0 or target_idx >= angles.size():
		return
	var target_ang := angles[target_idx]
	var step := (angles[1] - angles[0]) if angles.size() >= 2 else 0.24
	var start_ang := target_ang + float(rot_dir) * step
	var is_new := (rot_dir > 0 and target_idx == total_count - 1) or (rot_dir < 0 and target_idx == 0)
	_animated_nodes.append({
		"btn": ctrl,
		"cap": caption_ctrl,
		"a0": start_ang,
		"a1": target_ang,
		"is_new": is_new,
		"btn_half": ctrl.size * 0.5,
		"extra": radial_extra,
	})

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	pivot_offset = origin
	if reduced_motion:
		rot_dir = 0
		return
	if rot_dir == 0:
		modulate.a = 0.0
		scale = Vector2.ONE * 0.86
		var tween := create_tween().set_ignore_time_scale(true).set_parallel(true)
		tween.tween_property(self, "modulate:a", 1.0, 0.14)
		tween.tween_property(self, "scale", Vector2.ONE, 0.20).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	elif not _animated_nodes.is_empty():
		_anim_t = 0.0
		_apply_orbital_progress(0.0)
		set_process(true)

func _process(delta: float) -> void:
	if _anim_t >= 1.0:
		set_process(false)
		return
	_anim_t = minf(1.0, _anim_t + delta / ANIM_DUR)
	var eased := 1.0 - pow(1.0 - _anim_t, 3.0)
	_apply_orbital_progress(eased)
	if _anim_t >= 1.0:
		set_process(false)

func _apply_orbital_progress(t: float) -> void:
	var vp := size
	for entry in _animated_nodes:
		var btn: Control = entry.btn
		if not is_instance_valid(btn):
			continue
		var ang := lerpf(float(entry.a0), float(entry.a1), t)
		var pt := origin + Vector2(cos(ang), sin(ang)) * radius
		var half: Vector2 = entry.btn_half
		btn.position = pt - half
		var fade := lerpf(0.25, 1.0, t) if bool(entry.is_new) else 1.0
		btn.modulate.a = fade
		btn.pivot_offset = half
		btn.scale = Vector2.ONE * (lerpf(0.68, 1.0, t) if bool(entry.is_new) else 1.0)
		var cap: Control = entry.cap
		if is_instance_valid(cap):
			cap.position = preload("res://combat/radial_layout.gd").caption_pos(pt, ang, cap.size, vp, float(entry.get("extra", 0.0)))
			cap.modulate.a = fade

func _draw() -> void:
	if points.is_empty():
		return
	var r := origin.distance_to(points[0])
	var a_min := angles[0] if not angles.is_empty() else effective_arc.x
	var a_max := angles[angles.size() - 1] if not angles.is_empty() else effective_arc.y
	if a_max < a_min:
		var tmp := a_min
		a_min = a_max
		a_max = tmp

	var arc_col := Color(0.84, 0.72, 0.42, 0.28)
	var sub_col := Color(0.84, 0.72, 0.42, 0.13)
	var dot_col := Color(0.94, 0.84, 0.56, 0.58)
	match wheel_style:
		"minimal":
			arc_col = Color(0.70, 0.88, 0.92, 0.22)
			sub_col = Color(0.70, 0.88, 0.92, 0.08)
			dot_col = Color(0.72, 0.92, 0.98, 0.45)
		"bg3":
			arc_col = Color(0.82, 0.64, 0.34, 0.34)
			sub_col = Color(0.82, 0.64, 0.34, 0.16)
			dot_col = Color(0.98, 0.84, 0.48, 0.66)
		"vellum":
			arc_col = Color(0.45, 0.31, 0.15, 0.40)
			sub_col = Color(0.78, 0.66, 0.42, 0.24)
			dot_col = Color(0.90, 0.78, 0.52, 0.68)
		"compass":
			arc_col = Color(0.79, 0.53, 0.33, 0.34)
			sub_col = Color(0.40, 0.76, 0.78, 0.18)
			dot_col = Color(0.42, 0.80, 0.82, 0.65)

	draw_arc(origin, r, a_min - 0.06, a_max + 0.06, 48, arc_col, 1.6, true)
	draw_arc(origin, r - 36.0, a_min - 0.04, a_max + 0.04, 40, sub_col, 1.0, true)
	if wheel_style == "compass" or wheel_style == "bg3":
		# Graduated compass ticks along the outer guide ring
		for tick_i in range(13):
			var ta := lerpf(a_min - 0.04, a_max + 0.04, float(tick_i) / 12.0)
			var tdir := Vector2(cos(ta), sin(ta))
			var tlen := 6.0 if tick_i % 3 == 0 else 3.0
			draw_line(origin + tdir * (r - 36.0 - tlen), origin + tdir * (r - 36.0), arc_col, 1.1, true)
	for point in points:
		var direction: Vector2 = (point - origin).normalized()
		draw_line(origin + direction * 42.0, point - direction * 34.0, Color(arc_col.r, arc_col.g, arc_col.b, arc_col.a * 0.72), 1.1, true)
		draw_circle(point - direction * 34.0, 2.3, dot_col)
