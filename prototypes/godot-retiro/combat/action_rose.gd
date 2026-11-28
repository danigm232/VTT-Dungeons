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
var _exiting_node: Dictionary = {}
var _live_points: Array[Vector2] = []
var _spin_phase := 0.0
var _anim_t := 1.0
const ANIM_DUR := 0.34

func register_orbital_item(ctrl: Control, curved_lbl: Control, target_idx: int, total_count: int) -> void:
	if target_idx < 0 or target_idx >= angles.size():
		return
	var target_ang := angles[target_idx]
	var step := (angles[1] - angles[0]) if angles.size() >= 2 else 0.24
	var start_ang := target_ang + float(rot_dir) * step
	var is_new := (rot_dir > 0 and target_idx == total_count - 1) or (rot_dir < 0 and target_idx == 0)
	_animated_nodes.append({
		"btn": ctrl,
		"lbl": curved_lbl,
		"a0": start_ang,
		"a1": target_ang,
		"is_new": is_new,
		"btn_half": (ctrl.size if ctrl.size.x > 1.0 else ctrl.custom_minimum_size if ctrl.custom_minimum_size.x > 1.0 else Vector2(54, 54)) * 0.5,
	})

func register_exiting_item(ctrl: Control, curved_lbl: Control, start_ang: float, end_ang: float) -> void:
	_exiting_node = {
		"btn": ctrl,
		"lbl": curved_lbl,
		"a0": start_ang,
		"a1": end_ang,
		"btn_half": (ctrl.size if ctrl.size.x > 1.0 else ctrl.custom_minimum_size if ctrl.custom_minimum_size.x > 1.0 else Vector2(54, 54)) * 0.5,
	}

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	pivot_offset = origin
	_live_points = points.duplicate()
	if reduced_motion:
		rot_dir = 0
		if not _exiting_node.is_empty() and is_instance_valid(_exiting_node.get("btn")):
			_exiting_node.btn.visible = false
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
	var safe_delta := minf(delta, 0.045)
	_anim_t = minf(1.0, _anim_t + safe_delta / ANIM_DUR)
	var eased := 1.0 - pow(1.0 - _anim_t, 3.0)
	_apply_orbital_progress(eased)
	if _anim_t >= 1.0:
		set_process(false)

func _apply_orbital_progress(t: float) -> void:
	var step := (angles[1] - angles[0]) if angles.size() >= 2 else 0.22
	_spin_phase = lerpf(float(rot_dir) * step, 0.0, t)
	_live_points.clear()
	for entry in _animated_nodes:
		var btn: Control = entry.btn
		if not is_instance_valid(btn):
			continue
		var ang := lerpf(float(entry.a0), float(entry.a1), t)
		var pt := origin + Vector2(cos(ang), sin(ang)) * radius
		_live_points.append(pt)
		var half: Vector2 = entry.btn_half
		btn.position = pt - half
		var fade := lerpf(0.0, 1.0, clampf(t * 1.35, 0.0, 1.0)) if bool(entry.is_new) else 1.0
		btn.modulate.a = fade
		btn.pivot_offset = half
		btn.scale = Vector2.ONE * (lerpf(0.35, 1.0, t) if bool(entry.is_new) else 1.0)
		var lbl: Control = entry.get("lbl")
		if is_instance_valid(lbl) and "center_angle" in lbl:
			lbl.center_angle = ang
			lbl.queue_redraw()
	if not _exiting_node.is_empty():
		var ebtn: Control = _exiting_node.get("btn")
		if is_instance_valid(ebtn):
			if t >= 0.99:
				ebtn.visible = false
			else:
				var eang := lerpf(float(_exiting_node.a0), float(_exiting_node.a1), t)
				var ept := origin + Vector2(cos(eang), sin(eang)) * radius
				var ehalf: Vector2 = _exiting_node.btn_half
				ebtn.position = ept - ehalf
				ebtn.pivot_offset = ehalf
				ebtn.scale = Vector2.ONE * lerpf(1.0, 0.32, t)
				ebtn.modulate.a = lerpf(1.0, 0.0, clampf(t * 1.35, 0.0, 1.0))
				var elbl: Control = _exiting_node.get("lbl")
				if is_instance_valid(elbl) and "center_angle" in elbl:
					elbl.center_angle = eang
					elbl.queue_redraw()
	queue_redraw()

func _draw() -> void:
	var draw_pts := _live_points if not _live_points.is_empty() else points
	if draw_pts.is_empty():
		return
	var r := origin.distance_to(draw_pts[0])
	var a_min := angles[0] if not angles.is_empty() else effective_arc.x
	var a_max := angles[angles.size() - 1] if not angles.is_empty() else effective_arc.y
	if a_max < a_min:
		var tmp := a_min
		a_min = a_max
		a_max = tmp

	var arc_col := Color(0.84, 0.72, 0.42, 0.28)
	var sub_col := Color(0.84, 0.72, 0.42, 0.14)
	var dot_col := Color(0.94, 0.84, 0.56, 0.62)
	match wheel_style:
		"minimal":
			arc_col = Color(0.70, 0.88, 0.92, 0.22)
			sub_col = Color(0.70, 0.88, 0.92, 0.09)
			dot_col = Color(0.72, 0.92, 0.98, 0.48)
		"bg3":
			arc_col = Color(0.82, 0.64, 0.34, 0.34)
			sub_col = Color(0.82, 0.64, 0.34, 0.18)
			dot_col = Color(0.98, 0.84, 0.48, 0.68)
		"vellum":
			arc_col = Color(0.45, 0.31, 0.15, 0.40)
			sub_col = Color(0.78, 0.66, 0.42, 0.24)
			dot_col = Color(0.90, 0.78, 0.52, 0.68)
		"compass":
			arc_col = Color(0.79, 0.53, 0.33, 0.34)
			sub_col = Color(0.40, 0.76, 0.78, 0.18)
			dot_col = Color(0.42, 0.80, 0.82, 0.65)

	draw_arc(origin, r, a_min - 0.06, a_max + 0.06, 52, arc_col, 1.6, true)
	draw_arc(origin, r - 36.0, a_min - 0.04, a_max + 0.04, 44, sub_col, 1.0, true)
	# Animated astrolabe ticks + inner rotating hub ring that visibly spin with the wheel
	var tick_step := maxf(0.06, (a_max - a_min) / 14.0)
	for tick_i in range(-2, 17):
		var ta := a_min + float(tick_i) * tick_step + _spin_phase
		if ta < a_min - 0.08 or ta > a_max + 0.08:
			continue
		var tdir := Vector2(cos(ta), sin(ta))
		var tlen := 6.5 if wrapi(tick_i, 0, 3) == 0 else 3.2
		draw_line(origin + tdir * (r - 36.0 - tlen), origin + tdir * (r - 36.0), Color(arc_col.r, arc_col.g, arc_col.b, arc_col.a * 1.15), 1.2, true)
	draw_arc(origin, 62.0, a_min - 0.05, a_max + 0.05, 32, Color(arc_col.r, arc_col.g, arc_col.b, arc_col.a * 0.85), 1.2, true)
	for k in range(5):
		var ha := lerpf(a_min, a_max, float(k) / 4.0) + _spin_phase * 1.35
		if ha >= a_min - 0.12 and ha <= a_max + 0.12:
			var hdir := Vector2(cos(ha), sin(ha))
			draw_line(origin + hdir * 54.0, origin + hdir * 62.0, dot_col, 1.4, true)
	for point in draw_pts:
		var direction: Vector2 = (point - origin).normalized()
		draw_line(origin + direction * 62.0, point - direction * 34.0, Color(arc_col.r, arc_col.g, arc_col.b, arc_col.a * 0.72), 1.1, true)
		draw_circle(point - direction * 34.0, 2.3, dot_col)
