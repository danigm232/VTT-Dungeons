class_name VTTCameraBase
extends Camera3D

# Cámara Táctica 2.5D Canónica para el Pecio Rosa de los Vientos (Paridad Completa con Babylon)
# Implementa fielmente todos los módulos de cámara del motor original:
# - engine/shared/camera.ts: Pasos orbitales de 15°, máx ±2 pasos ([-30°, +30°]) sobre frente activo
# - engine/shared/wreck-camera-profile.ts: Frente base +Z->-Z (0°) y reorientación por puerta de camarote (C4/C5 +45°, C6/C7 -45°)
# - Rango vertical [5°, 25°], hitos [5, 10, 15, 20, 25], interior 10°
# - engine/client/camera-tilt-input.ts (CameraTiltHold): Toque = salto 5°; mantener = barrido continuo con pausa en hitos
# - engine/client/interior-camera.ts (D8InteriorCameraTilt): Solo auto-adapta el tilt al cruzar umbral interior/exterior
# - engine/client/wreck-camera.ts: wreckOverviewFrame (encuadre dinámico mástil-quilla), wreckLongitudinalTarget, Cofa fija
# - engine/client/d8-camera.ts (D8CameraMotion): Muelle amortiguado crítico independiente de FPS, d8FocusHeight y zoom por zona
# - engine/client/camera-touch.ts: Gestos táctiles/trackpad (pinch zoom, órbita y tilt con eje bloqueado por gesto)
# - WASD/joystick conservan sus ejes de mapa al orbitar la cámara.

const CAMERA_ORBIT_STEP_DEGREES: float = 15.0
const CAMERA_ORBIT_MAX_STEP: float = 2.0
const CAMERA_TILT_STOPS: Array[float] = [5.0, 10.0, 15.0, 20.0, 25.0]
const CAMERA_DEFAULT_TILT: float = 25.0
const CAMERA_MIN_TILT: float = 5.0
const CAMERA_MAX_TILT: float = 25.0
const CAMERA_INTERIOR_TILT: float = 10.0


# Contorno 3D del barco (proa/popa/quilla/cofa) para encuadre Overview exacto (excluye mar/arrecifes)
const WRECK_MAST_TOP_POS := Vector3(0.35, 23.2, -0.48)
const WRECK_COFA_CENTER := Vector3(0.35, 15.2, -0.48)

@export var target: Node3D
@export var min_distance: float = 5.5
@export var max_distance: float = 56.0
@export var default_distance: float = 18.0
@export var pan_speed: float = 0.035
@export var detail_key_enabled: bool = true

var current_distance: float = 18.0
var target_distance: float = 18.0
var user_zoom_ratio: float = 1.0

# Órbita horizontal relativa (puede ser discreta en pasos de 15° o fraccionaria con gesto táctil)
var orbit_step: float = 0.0
var room_front_offset: float = 0.0 # Offset canónico de camarote: +45° C4/C5, -45° C6/C7, 0° resto
var current_yaw: float = 0.0
var target_yaw: float = 0.0

# Inclinación cenital (pitch) con control Hold-vs-Tap y detección de cruce de umbral
var current_pitch: float = CAMERA_DEFAULT_TILT
var target_pitch: float = CAMERA_DEFAULT_TILT
var _tilt_hold_dir: int = 0
var _tilt_hold_elapsed_ms: float = 0.0
var _tilt_hold_pause_ms: float = 0.0
var _tilt_hold_moved_continuously: bool = false

var _interior_initialized: bool = false
var _last_inside_zone: bool = false
var current_zone_id: String = "exterior"

# Estado de modos de encuadre
var focus_point: Vector3 = Vector3.ZERO
var target_focus: Vector3 = Vector3.ZERO
var is_panning: bool = false
var is_following: bool = true
var is_overview: bool = false
var is_combat_group_mode: bool = false
var is_detail_mode: bool = false
var _saved_combat_views: Dictionary = {} # Each local role keeps its own pre-combat frame.

# Estado del muelle amortiguado crítico (D8CameraMotion)
var _vel_yaw: float = 0.0
var _vel_pitch: float = 0.0
var _vel_distance: float = 0.0
var _vel_focus: Vector3 = Vector3.ZERO

# Puntos discretos del barco para Overview y gestos táctiles
var _overview_points: Array[Vector3] = []
var _touch_axis: String = "" # "", "orbit", "tilt", "zoom"

func _ready() -> void:
	if DisplayServer.get_name() == "headless": persist_preferences = false
	projection = PROJECTION_ORTHOGONAL
	near = 0.05
	far = 1200.0
	_build_overview_envelope_points()
	current_distance = default_distance
	target_distance = default_distance
	target_pitch = CAMERA_DEFAULT_TILT
	current_pitch = CAMERA_DEFAULT_TILT
	orbit_step = 0.0
	room_front_offset = 0.0
	target_yaw = 0.0
	current_yaw = 0.0

	if target:
		focus_point = calculate_zone_follow_target(target.global_position, current_zone_id)
		target_focus = focus_point
	else:
		focus_point = Vector3(0, 2.5, 0)
		target_focus = focus_point

	_load_preferences()
	_initial_view = get_view_state()
	update_camera_transform()
	_keep_target_visible()

func _keep_target_visible() -> void:
	# At a map boundary the authored focus may stop before the token does. Move
	# only enough to retain the full sprite; never correct visibility with zoom.
	if not is_following or not is_instance_valid(target) or target == _navigation_anchor or is_overview or is_combat_group_mode: return
	var viewport_size := get_viewport().get_visible_rect().size
	if viewport_size.x<100.0 or viewport_size.y<100.0: return
	var margin := viewport_size*Vector2(0.06,0.10)
	var height: float = float(target.get("target_height")) if target.get("target_height") != null else 1.65
	var shift := Vector2.ZERO
	for point in [target.global_position,target.global_position+Vector3.UP*height]:
		var screen := unproject_position(point)-shift
		shift += screen-screen.clamp(margin,viewport_size-margin)
	if shift.length_squared()<0.01: return
	var units := size/viewport_size.y
	var correction := (global_basis.x*shift.x-global_basis.y*shift.y)*units
	focus_point += correction
	target_focus += correction
	_vel_focus = Vector3.ZERO
	update_camera_transform()

func _build_overview_envelope_points() -> void:
	_overview_points = [Vector3(-34,-7,-12),Vector3(34,24,12)]

func _unhandled_input(event: InputEvent) -> void:
	if camera_role == "projector":
		return
	if _handle_touch(event):
		return
	# 1. Rueda del ratón y paneo manual con MMB/RMB
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.is_pressed():
			zoom_camera_step(-2.4)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.is_pressed():
			zoom_camera_step(+2.4)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			if event.is_pressed():
				is_panning = true
				is_following = false
				is_overview = false
				is_combat_group_mode = false
				is_detail_mode = false
			else:
				is_panning = false

	elif event is InputEventMouseMotion and is_panning:
		var delta_mouse := (event as InputEventMouseMotion).relative
		var right_vec := Vector3(global_transform.basis.x.x, 0.0, global_transform.basis.x.z).normalized()
		var forward_planar := Vector3(global_transform.basis.z.x, 0.0, global_transform.basis.z.z).normalized()
		var pan_factor := (current_distance / 20.0) * pan_speed
		target_focus -= (right_vec * delta_mouse.x - forward_planar * delta_mouse.y) * pan_factor
		target_focus = clamp_navigation_point(target_focus)
		get_viewport().set_input_as_handled()

	# 2. Gestos táctiles / trackpad (paridad camera-touch.ts: pinch zoom / eje bloqueado orbit vs tilt)
	elif event is InputEventMagnifyGesture:
		var mag := (event as InputEventMagnifyGesture).factor
		if mag > 0.01:
			zoom_camera_factor(1.0 / mag)
			get_viewport().set_input_as_handled()

	elif event is InputEventPanGesture:
		var pd := (event as InputEventPanGesture).delta
		_gesture_idle = 0.2
		if _touch_axis == "":
			if pd.length() > 0.15:
				_touch_axis = "orbit" if absf(pd.x) >= absf(pd.y) else "tilt"
		if _touch_axis == "orbit":
			orbit_step = clampf(orbit_step - pd.x * 0.12, -CAMERA_ORBIT_MAX_STEP, CAMERA_ORBIT_MAX_STEP)
			_recompute_target_yaw()
		elif _touch_axis == "tilt":
			target_pitch = clampf(target_pitch - pd.y * 2.5, CAMERA_MIN_TILT, CAMERA_MAX_TILT)
		get_viewport().set_input_as_handled()

	# 3. Teclado canónico
	elif event is InputEventKey:
		var kev := event as InputEventKey
		if kev.ctrl_pressed or kev.alt_pressed or kev.meta_pressed:
			return

		if kev.keycode in [KEY_R, KEY_PAGEUP]:
			if kev.is_pressed() and not kev.is_echo():
				_begin_tilt_hold(+1)
			elif not kev.is_pressed():
				_end_tilt_hold()
			get_viewport().set_input_as_handled()
		elif kev.keycode in [KEY_F, KEY_PAGEDOWN]:
			if kev.is_pressed() and not kev.is_echo():
				_begin_tilt_hold(-1)
			elif not kev.is_pressed():
				_end_tilt_hold()
			get_viewport().set_input_as_handled()
		elif kev.is_pressed() and not kev.is_echo():
			if kev.keycode == KEY_Q:
				step_orbit(-1)
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_E:
				step_orbit(+1)
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_SPACE:
				toggle_overview_or_follow()
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_O:
				set_overview_mode(not is_overview)
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_C:
				toggle_combat_group_view()
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_G and detail_key_enabled:
				frame_actor_detail()
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_P:
				toggle_projection_mode()
				get_viewport().set_input_as_handled()
			elif kev.keycode == KEY_HOME:
				reset_camera_view()
				get_viewport().set_input_as_handled()

func step_orbit(direction: int) -> void:
	var snapped := roundf(orbit_step)
	orbit_step = clampf(snapped + float(direction), -CAMERA_ORBIT_MAX_STEP, CAMERA_ORBIT_MAX_STEP)
	_recompute_target_yaw()

func _recompute_target_yaw() -> void:
	target_yaw = room_front_offset + orbit_step * CAMERA_ORBIT_STEP_DEGREES

static func wreck_camera_front_offset(zone_id: String) -> float:
	# Port directo de engine/shared/wreck-camera-profile.ts (wreckCameraFront):
	# C4/C5 abren mamparo hacia proa (+X): rotación +45° mirando hacia el interior desde SE
	# C6/C7 abren mamparo hacia popa (-X): rotación -45° mirando hacia el interior desde SW
	match zone_id:
		"aft_c4_port", "aft_c5_stbd", "aft_c4_c5", "c4", "c5":
			return 45.0
		"fore_c6_port", "fore_c7_stbd", "fore_c6_c7", "c6", "c7":
			return -45.0
		_:
			return 0.0

func _begin_tilt_hold(direction: int) -> void:
	_tilt_hold_dir = direction
	_tilt_hold_elapsed_ms = 0.0
	_tilt_hold_pause_ms = 0.0
	_tilt_hold_moved_continuously = false

func _advance_tilt_hold(delta_ms: float) -> void:
	if _tilt_hold_dir == 0:
		return
	var before := _tilt_hold_elapsed_ms
	_tilt_hold_elapsed_ms += delta_ms
	var remaining: float = maxf(0.0, _tilt_hold_elapsed_ms - 180.0) - maxf(0.0, before - 180.0)
	if remaining <= 0.0:
		return
	_tilt_hold_moved_continuously = true
	while remaining > 0.001:
		if _tilt_hold_pause_ms > 0.0:
			var used: float = minf(remaining, _tilt_hold_pause_ms)
			remaining -= used
			_tilt_hold_pause_ms -= used
			continue
		var next_stop := _find_next_tilt_stop(target_pitch, _tilt_hold_dir)
		if absf(next_stop - target_pitch) < 0.001:
			break
		var to_stop := absf(next_stop - target_pitch) / 0.01 # 10°/s
		var used_ms := minf(to_stop, remaining)
		target_pitch = clampf(target_pitch + float(_tilt_hold_dir) * 0.01 * used_ms, CAMERA_MIN_TILT, CAMERA_MAX_TILT)
		remaining -= used_ms
		if used_ms >= to_stop - 0.001:
			_tilt_hold_pause_ms = 120.0

func _end_tilt_hold() -> void:
	if _tilt_hold_dir != 0 and not _tilt_hold_moved_continuously:
		step_tilt(_tilt_hold_dir)
	_tilt_hold_dir = 0

func _find_next_tilt_stop(angle: float, direction: int) -> float:
	var current := clampf(angle, CAMERA_MIN_TILT, CAMERA_MAX_TILT)
	if direction > 0:
		for stop in CAMERA_TILT_STOPS:
			if stop > current + 0.05:
				return stop
		return CAMERA_MAX_TILT
	else:
		var rev := CAMERA_TILT_STOPS.duplicate()
		rev.reverse()
		for stop in rev:
			if stop < current - 0.05:
				return stop
		return CAMERA_MIN_TILT

func step_tilt(direction: int) -> void:
	target_pitch = _find_next_tilt_stop(target_pitch, direction)

func get_world_visual_bounds() -> Rect2:
	return Rect2()

func get_player_max_distance(zone_id: String = "") -> float:
	var z := zone_id if zone_id != "" else current_zone_id
	return minf(get_zone_zoom_limits(z).y, 36.0)

func _view_xz_extents(dist: float, pitch_deg: float, yaw_deg: float, aspect: float) -> Vector2:
	var tan_half_fov := maxf(0.1, tan(deg_to_rad(fov * 0.5)))
	var half_h := maxf(0.5, dist * tan_half_fov)
	var half_w := half_h * maxf(0.25, aspect)
	var sin_p := maxf(0.08, sin(deg_to_rad(clampf(pitch_deg, CAMERA_MIN_TILT, CAMERA_MAX_TILT))))
	var half_depth := half_h / sin_p
	var yaw_rad := deg_to_rad(yaw_deg)
	var ca := absf(cos(yaw_rad))
	var sa := absf(sin(yaw_rad))
	return Vector2(half_w * ca + half_depth * sa, half_w * sa + half_depth * ca)

func _compute_world_fit_max_distance(world_rect: Rect2, pitch_deg: float, yaw_deg: float, aspect: float, floor_dist: float) -> float:
	var unit_ext := _view_xz_extents(1.0, pitch_deg, yaw_deg, aspect)
	var max_x := (world_rect.size.x * 0.5) / maxf(0.001, unit_ext.x)
	var max_z := (world_rect.size.y * 0.5) / maxf(0.001, unit_ext.y)
	return maxf(floor_dist, minf(max_x, max_z))

func _effective_zoom_bounds(zone_id: String = "", pitch_deg: float = target_pitch, yaw_deg: float = target_yaw) -> Vector2:
	var z_id := zone_id if zone_id != "" else current_zone_id
	var bounds := get_zone_zoom_limits(z_id)
	if camera_role == "player":
		bounds.y = minf(bounds.y, get_player_max_distance(z_id))
		var world_rect := get_world_visual_bounds()
		if world_rect.has_area():
			bounds.y = minf(bounds.y, _compute_world_fit_max_distance(world_rect, pitch_deg, yaw_deg, _get_viewport_aspect(), bounds.x))
	bounds.y = maxf(bounds.x, bounds.y)
	return bounds

func _clamp_focus_to_world_bounds(point: Vector3, dist: float, pitch_deg: float, yaw_deg: float) -> Vector3:
	if camera_role != "player":
		return point
	var world_rect := get_world_visual_bounds()
	if not world_rect.has_area():
		return point
	var ext := _view_xz_extents(dist, pitch_deg, yaw_deg, _get_viewport_aspect())
	var min_x := world_rect.position.x + ext.x
	var max_x := world_rect.end.x - ext.x
	var min_z := world_rect.position.y + ext.y
	var max_z := world_rect.end.y - ext.y
	var out := point
	out.x = (world_rect.position.x + world_rect.size.x * 0.5) if min_x >= max_x else clampf(point.x, min_x, max_x)
	out.z = (world_rect.position.y + world_rect.size.y * 0.5) if min_z >= max_z else clampf(point.z, min_z, max_z)
	return out

func zoom_camera_step(delta_dist: float) -> void:
	is_overview = false
	is_combat_group_mode = false
	is_detail_mode = false
	var bounds := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(target_distance + delta_dist, bounds.x, bounds.y)
	user_zoom_ratio = clampf(target_distance / default_distance, 0.3, 3.0)

func zoom_camera_factor(factor: float) -> void:
	is_overview = false
	is_combat_group_mode = false
	is_detail_mode = false
	var bounds := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(target_distance * factor, bounds.x, bounds.y)
	user_zoom_ratio = clampf(target_distance / default_distance, 0.3, 3.0)

func get_zone_zoom_limits(zone_id: String) -> Vector2:
	# Port de cameraZoomLimits: distancia mínima legible del actor y máxima según espacio de zona
	match zone_id:
		"aft_c4_port", "aft_c5_stbd", "aft_c4_c5", "fore_c6_port", "fore_c7_stbd", "fore_c6_c7", "c4", "c5", "c6", "c7":
			return Vector2(5.5, 24.0)
		"c10", "crows_nest":
			return Vector2(5.5, 20.0)
		"lower_c8_bilge", "lower_c9_hold", "c8", "c9":
			return Vector2(7.0, 32.0)
		_:
			return Vector2(min_distance, max_distance)

func reset_camera_view() -> void:
	_restore_combat_view_if_needed()
	orbit_step = 0.0
	target_pitch = CAMERA_INTERIOR_TILT if _last_inside_zone else CAMERA_DEFAULT_TILT
	is_overview = false
	is_combat_group_mode = false
	is_detail_mode = false
	is_following = true
	var r_bounds := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(default_distance, r_bounds.x, r_bounds.y)
	user_zoom_ratio = 1.0
	_recompute_target_yaw()
	if target:
		target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)

func toggle_overview_or_follow() -> void:
	if is_overview or is_combat_group_mode:
		set_overview_mode(false)
	else:
		is_detail_mode = false
		is_following = true
		if target:
			target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)

func set_overview_mode(enable: bool) -> void:
	is_overview = enable
	if is_overview:
		_restore_combat_view_if_needed()
		is_following = false
		is_detail_mode = false
		is_combat_group_mode = false
		room_front_offset = 0.0
		_recompute_target_yaw()
		var frame := calculate_wreck_overview_frame(target_yaw, target_pitch, _get_viewport_aspect())
		if camera_role == "player":
			var p_bounds := _effective_zoom_bounds(current_zone_id)
			target_distance = clampf(float(frame["distance"]), p_bounds.x, p_bounds.y)
			target_focus = _clamp_focus_to_world_bounds(frame["target"], target_distance, target_pitch, target_yaw)
		else:
			target_focus = frame["target"]
			target_distance = frame["distance"]
	else:
		is_following = true
		var bounds := _effective_zoom_bounds(current_zone_id)
		target_distance = clampf(default_distance * user_zoom_ratio, bounds.x, bounds.y)
		if target:
			room_front_offset = wreck_camera_front_offset(current_zone_id)
			_recompute_target_yaw()
			target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)

func calculate_wreck_overview_frame(yaw: float,pitch: float,aspect: float) -> Dictionary:
	if _overview_points.is_empty(): _build_overview_envelope_points()
	var back := Vector3(sin(deg_to_rad(yaw))*cos(deg_to_rad(pitch)),sin(deg_to_rad(pitch)),cos(deg_to_rad(yaw))*cos(deg_to_rad(pitch)))
	var right := Vector3.UP.cross(back).normalized()
	var up := back.cross(right).normalized()
	var low := Vector2(INF,INF); var high := Vector2(-INF,-INF)
	for point in _overview_points:
		var projected := Vector2(point.dot(right),point.dot(up))
		low = low.min(projected); high = high.max(projected)
	var center := (low+high)*0.5
	var half_height := maxf((high.y-low.y)*0.5,(high.x-low.x)*0.5/maxf(0.25,aspect))*1.1
	return {"target":right*center.x+up*center.y,"distance":maxf(34.0,half_height/tan(deg_to_rad(fov*0.5)))}

func toggle_combat_group_view() -> void:
	if is_combat_group_mode:
		_restore_combat_view_if_needed()
		return
	var main_ctrl := get_parent()
	var pts: Array[Vector3] = []
	if main_ctrl and "party" in main_ctrl:
		for member in main_ctrl.party:
			if member is Node3D:
				pts.append((member as Node3D).global_position)
	if pts.is_empty():
		return

	_saved_combat_views[camera_role] = get_view_state()
	is_overview = false
	is_detail_mode = false
	is_following = false
	is_combat_group_mode = true
	orbit_step = 0.0
	room_front_offset = 0.0
	_recompute_target_yaw()

	var frame := calculate_encounter_frame(pts, 4.5)
	target_focus = frame["target"]
	target_distance = frame["distance"]

func _restore_combat_view_if_needed() -> void:
	if _saved_combat_views.has(camera_role):
		var saved: Dictionary = _saved_combat_views[camera_role]
		_saved_combat_views.erase(camera_role)
		apply_view_state(saved)

func end_combat_framing() -> void:
	_restore_combat_view_if_needed()
	for role in _saved_combat_views:
		_role_views[role] = _saved_combat_views[role]
	_saved_combat_views.clear()
	is_combat_group_mode = false
	if _shared_view.get("combat",false): _shared_view.clear()

func calculate_encounter_frame(points: Array[Vector3], padding: float = 4.5) -> Dictionary:
	# Port de engine/client/combat-camera.ts (combatEncounterBounds + combatCamera3DFit)
	var min_p := Vector3(INF, INF, INF)
	var max_p := Vector3(-INF, -INF, -INF)
	for p in points:
		min_p = min_p.min(p)
		max_p = max_p.max(p)
	var center := (min_p + max_p) * 0.5 + Vector3(0.0, 1.0, 0.0)
	var half_size := Vector3(
		maxf(5.0, (max_p.x - min_p.x) * 0.5 + padding),
		maxf(2.0, (max_p.y - min_p.y) * 0.5 + 2.0),
		maxf(5.0, (max_p.z - min_p.z) * 0.5 + padding)
	)
	var pitch_rad := deg_to_rad(current_pitch)
	var tan_v := maxf(0.1, tan(deg_to_rad(fov * 0.5)))
	var tan_h := tan_v * maxf(0.25, _get_viewport_aspect())
	var back := Vector3(0.0, sin(pitch_rad), cos(pitch_rad)).normalized()
	var right := Vector3.RIGHT
	var up := back.cross(right).normalized()
	var dist := 12.0
	for sx in [-1.0, 1.0]:
		for sy in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				var corner := Vector3(sx * half_size.x, sy * half_size.y, sz * half_size.z)
				var d := corner.dot(back) + maxf(absf(corner.dot(right)) / tan_h, absf(corner.dot(up)) / tan_v)
				dist = maxf(dist, d * 1.12)
	return {"target": center, "distance": clampf(dist, min_distance, max_distance)}

func frame_actor_detail() -> void:
	# Port de world.ts (frameActorDetail -> actorDetailZoom): primer plano táctico centrado en el personaje activo
	if not target:
		return
	_restore_combat_view_if_needed()
	is_overview = false
	is_combat_group_mode = false
	is_following = true
	is_detail_mode = true
	var actor_h := float(target.get("target_height")) if target.get("target_height") != null else 1.65
	var half_fov := maxf(0.1, tan(deg_to_rad(fov * 0.5)))
	target_distance = clampf(actor_h / (0.36 * 2.0 * half_fov), 5.8, 10.5)
	user_zoom_ratio = target_distance / default_distance
	target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)

func set_target_character(new_target: Node3D) -> void:
	if _navigation_anchor and new_target != _navigation_anchor:
		_navigation_anchor.visible = false
	target = new_target
	is_overview = false
	is_combat_group_mode = false
	is_following = follow_mode != "fixed"
	if target:
		target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)

func detect_wreck_zone(world_pos: Vector3) -> String:
	var ship := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	var lp := ship.to_local(world_pos) if ship else world_pos
	if lp.y >= 11.5:
		return "c10"
	if lp.y < -4.8:
		return "c9"
	if lp.y < -1.0:
		return "c8"
	if lp.x < -13.3 and lp.x > -29.5 and lp.y < 2.75 and lp.y > -0.9:
		return "c4" if lp.z < 0.0 else "c5"
	if lp.x > 13.3 and lp.x < 29.5 and lp.y < 2.75 and lp.y > -0.9:
		return "c6" if lp.z < 0.0 else "c7"
	if lp.x <= -13.5 and lp.y >= 2.1:
		return "c3"
	if lp.x >= 13.5 and lp.y >= 2.1:
		return "c2"
	if absf(lp.x) < 31.0 and absf(lp.z) < 11.0 and lp.y >= -1.0:
		return "main"
	return "sea"

func calculate_zone_follow_target(actor_pos: Vector3, zone_id: String = "") -> Vector3:
	# Port unificado de wreckLongitudinalTarget + Cofa centrada + d8FocusHeight
	var z_id := zone_id if zone_id != "" else detect_wreck_zone(actor_pos)
	var actor_h := float(target.get("target_height")) if (target and target.get("target_height") != null) else 1.65
	var sin_p := maxf(0.16, sin(deg_to_rad(clampf(target_pitch, CAMERA_MIN_TILT, CAMERA_MAX_TILT))))
	# d8FocusHeight suavizado para que los pies/cabeza del sprite queden centrados en inclinaciones bajas (5°-25°)
	var height_offset := minf(1.45, actor_h * 0.40 / maxf(0.32, sin_p) * 0.55 + 0.55)

	if z_id == "c10":
		return Vector3(WRECK_COFA_CENTER.x, actor_pos.y + height_offset, WRECK_COFA_CENTER.z)

	var out := Vector3(actor_pos.x, actor_pos.y + height_offset, actor_pos.z)

	# Si está en zoom cercano (detail/estrecho), centrar directo en el personaje
	if is_detail_mode or target_distance < 12.5:
		return out

	# Estabilización longitudinal en cubiertas exteriores cuando está en escala táctica normal
	var center_x := 0.0
	var run := -1.0
	if z_id == "main":
		center_x = 0.0
		run = 8.5
	elif z_id == "c2":
		center_x = 22.1
		run = 4.32
	elif z_id == "c3":
		center_x = -22.1
		run = 4.32

	if run > 0.0:
		out.x = clampf(actor_pos.x, center_x - run, center_x + run)
		var rail_margin := 4.2
		out.z = (absf(actor_pos.z) - rail_margin) * signf(actor_pos.z) * 0.8 if absf(actor_pos.z) > rail_margin else 0.0
	return out

func _apply_zone_boundary_transition(inside: bool, room_mode: String, _custom_interior_pitch: float = CAMERA_INTERIOR_TILT) -> void:
	# Port de D8InteriorCameraTilt + wreckCameraFront(room)
	current_zone_id = room_mode
	var new_front := wreck_camera_front_offset(room_mode)
	if not is_overview and not is_combat_group_mode and absf(new_front - room_front_offset) > 0.01:
		room_front_offset = new_front
		_recompute_target_yaw()

	var boundary := _interior_initialized and (inside != _last_inside_zone)
	var first := not _interior_initialized
	_interior_initialized = true
	_last_inside_zone = inside
	if (boundary or (first and not _restored_preferences)) and not is_overview:
		target_pitch = CAMERA_INTERIOR_TILT if inside else CAMERA_DEFAULT_TILT

func set_interior_cutout(is_interior: bool, interior_pitch: float = CAMERA_INTERIOR_TILT, room_mode: String = "") -> void:
	var zone_name := room_mode
	if zone_name == "" and target:
		zone_name = detect_wreck_zone(target.global_position)
	elif zone_name == "":
		zone_name = "c4" if is_interior else "exterior"
	_apply_zone_boundary_transition(is_interior, zone_name, interior_pitch)

func screen_vector_to_world(input_dir: Vector2) -> Vector3:
	# Ejes estables de mapa: orbitar nunca modifica el movimiento ni el ángulo elegido.
	if input_dir.length_squared() < 0.0001:
		return Vector3.ZERO
	return Vector3(input_dir.x, 0.0, input_dir.y).normalized()

func get_hud_status_text() -> String:
	var mode_tag := "Barco Completo" if is_overview else ("Grupo" if is_combat_group_mode else ("Detalle" if is_detail_mode else ("Camarote" if _last_inside_zone else "Cubierta")))
	var orbit_deg := roundi(orbit_step * CAMERA_ORBIT_STEP_DEGREES)
	var orbit_str := "Frontal" if orbit_deg == 0 else ("%d° %s" % [abs(orbit_deg), "Izq" if orbit_deg < 0 else "Der"])
	return "Cámara: %s · %s · %.0f° [Q/E · F/R · Espacio · Inicio]" % [mode_tag, orbit_str, current_pitch]

func _get_viewport_aspect() -> float:
	var vp := get_viewport()
	if vp:
		var sz := vp.get_visible_rect().size
		if sz.y > 1.0:
			return sz.x / sz.y
	return 16.0 / 9.0

static func _damp_scalar(current: float, target_val: float, velocity: float, dt: float, smooth_time: float) -> Vector2:
	var omega := 2.0 / maxf(0.01, smooth_time)
	var disp := current - target_val
	var decay := exp(-omega * dt)
	var change := (velocity + omega * disp) * dt
	var next_val := target_val + (disp + change) * decay
	var next_vel := (velocity - omega * change) * decay
	if absf(next_val - target_val) < 0.0001 and absf(next_vel) < 0.0005:
		return Vector2(target_val, 0.0)
	return Vector2(next_val, next_vel)

func _process(delta: float) -> void:
	var dt := minf(0.1, delta)
	_gesture_idle = maxf(0.0,_gesture_idle-dt)
	if _gesture_idle<=0.0 and _touches.size()<2: _touch_axis = ""
	_advance_tilt_hold(dt * 1000.0)

	if is_overview:
		var ov := calculate_wreck_overview_frame(target_yaw, target_pitch, _get_viewport_aspect())
		if camera_role == "player":
			var ov_bounds := _effective_zoom_bounds(current_zone_id)
			target_distance = clampf(float(ov["distance"]), ov_bounds.x, ov_bounds.y)
			target_focus = _clamp_focus_to_world_bounds(ov["target"], target_distance, target_pitch, target_yaw)
		else:
			target_focus = ov["target"]
			target_distance = ov["distance"]
	elif is_following and target:
		var detected := detect_wreck_zone(target.global_position)
		if current_zone_id == "exterior" or current_zone_id == "" or detected != current_zone_id:
			var inside := is_interior_zone(detected)
			if detected != "":
				_apply_zone_boundary_transition(inside, detected)
		target_focus = calculate_zone_follow_target(target.global_position, current_zone_id)
		if follow_mode == "semiFixed":
			target_focus = target_focus.snapped(Vector3(6.0, 0.01, 6.0))
		if current_zone_id != "sea": target_focus = clamp_navigation_point(target_focus)

	_save_preferences_if_changed(delta)
	# Muelle amortiguado crítico D8CameraMotion (ángulos/distancia smoothTime 0.16s, foco 0.20s)
	var sy := _damp_scalar(current_yaw, current_yaw + rad_to_deg(angle_difference(deg_to_rad(current_yaw), deg_to_rad(target_yaw))), _vel_yaw, dt, 0.16)
	current_yaw = wrapf(sy.x, -180.0, 180.0); _vel_yaw = sy.y

	var sp := _damp_scalar(current_pitch, target_pitch, _vel_pitch, dt, 0.16)
	current_pitch = clampf(sp.x, CAMERA_MIN_TILT, CAMERA_MAX_TILT); _vel_pitch = sp.y

	var desired_distance := target_distance
	if camera_role == "player":
		var live_bounds := _effective_zoom_bounds(current_zone_id, current_pitch, current_yaw)
		var role_cap := minf(get_zone_zoom_limits(current_zone_id).y, get_player_max_distance(current_zone_id))
		target_distance = clampf(target_distance, live_bounds.x, maxf(live_bounds.x, role_cap))
		desired_distance = clampf(target_distance, live_bounds.x, live_bounds.y)
	var sd := _damp_scalar(current_distance, desired_distance, _vel_distance, dt, 0.16)
	current_distance = maxf(2.0, sd.x); _vel_distance = sd.y
	if camera_role == "player":
		var clamped_dist := clampf(current_distance, _effective_zoom_bounds(current_zone_id, current_pitch, current_yaw).x, _effective_zoom_bounds(current_zone_id, current_pitch, current_yaw).y)
		if clamped_dist < current_distance:
			current_distance = clamped_dist
			_vel_distance = 0.0
		target_focus = _clamp_focus_to_world_bounds(target_focus, desired_distance, target_pitch, target_yaw)

	var fx := _damp_scalar(focus_point.x, target_focus.x, _vel_focus.x, dt, 0.20)
	var fy := _damp_scalar(focus_point.y, target_focus.y, _vel_focus.y, dt, 0.20)
	var fz := _damp_scalar(focus_point.z, target_focus.z, _vel_focus.z, dt, 0.20)
	focus_point = Vector3(fx.x, fy.x, fz.x)
	if camera_role == "player":
		focus_point = _clamp_focus_to_world_bounds(focus_point, current_distance, current_pitch, current_yaw)
	_vel_focus = Vector3(fx.y, fy.y, fz.y)

	update_camera_transform()
	_keep_target_visible()

func update_camera_transform() -> void:
	far = maxf(1200.0,current_distance*4.0)
	var yaw_rad := deg_to_rad(current_yaw)
	var pitch_rad := deg_to_rad(current_pitch)
	var offset := Vector3(
		sin(yaw_rad) * cos(pitch_rad),
		sin(pitch_rad),
		cos(yaw_rad) * cos(pitch_rad)
	) * maxf(240.0, current_distance * 2.0)

	if projection == PROJECTION_ORTHOGONAL:
		size = maxf(2.0, current_distance * 2.0 * tan(deg_to_rad(fov * 0.5)))

	global_position = focus_point + offset
	look_at(focus_point, Vector3.UP)

# Local role snapshots. These include scene references; they are not network messages.
@export var persist_preferences: bool = true
@export var preferences_file: String = "user://vtt-camera.cfg"
var camera_role: String = "player"
var _initial_view: Dictionary = {}
var _gesture_idle: float = 0.0
var follow_mode: String = "follow"
var share_camera: bool = false
var _role_views: Dictionary = {}
var _shared_view: Dictionary = {}
var _navigation_anchor: Node3D
var _restored_preferences: bool = false
var _preference_elapsed: float = 0.0
var _last_preference: String = ""
var _touches: Dictionary = {}
var _touch_updated: Dictionary = {}
var _touch_start_center := Vector2.ZERO
var _touch_start_span: float = 1.0
var _touch_start_pitch: float = 25.0
var _touch_start_orbit: float = 0.0
var _touch_start_distance: float = 18.0

func is_interior_zone(zone: String) -> bool:
	return zone in ["c4","c5","c6","c7","c8","c9","aft_c4_port","aft_c5_stbd","fore_c6_port","fore_c7_stbd","lower_c8_bilge","lower_c9_hold"]

func clamp_navigation_point(point: Vector3) -> Vector3:
	return Vector3(clampf(point.x,-38.0,38.0),point.y,clampf(point.z,-20.0,20.0))

func set_follow_mode(mode: String) -> void:
	if mode not in ["fixed","semiFixed","follow"]:
		return
	follow_mode = mode
	is_following = mode != "fixed"
	is_overview = false

func explore_point(point: Vector3) -> void:
	if camera_role != "dm":
		return
	if not is_instance_valid(_navigation_anchor):
		_navigation_anchor = Node3D.new()
		_navigation_anchor.name = "DmCameraAnchor"
		get_parent().add_child(_navigation_anchor)
	_navigation_anchor.global_position = clamp_navigation_point(point)
	target = _navigation_anchor
	is_following = true
	is_overview = false
	is_detail_mode = true
	is_combat_group_mode = false
	target_focus = _navigation_anchor.global_position + Vector3.UP * 0.9
	var root_node := get_tree().root.find_child("RoofCutout",true,false)
	if root_node:
		root_node.set("lock_override_mode",false)

func pan_pixels(delta: Vector2) -> void:
	var units := size / maxf(1.0,get_viewport().get_visible_rect().size.y)
	var right := global_basis.x
	var forward := Vector3(-sin(deg_to_rad(current_yaw)),0.0,-cos(deg_to_rad(current_yaw)))
	var point := target.global_position if target == _navigation_anchor and is_instance_valid(target) else target_focus - Vector3.UP * 0.9
	point += -right * delta.x * units + forward * delta.y * units / maxf(0.08,sin(deg_to_rad(current_pitch)))
	explore_point(point)

func toggle_projection_mode() -> void:
	projection = PROJECTION_ORTHOGONAL

func get_view_state() -> Dictionary:
	return {"focus":target_focus,"distance":target_distance,"pitch":target_pitch,"orbit":orbit_step,"front":room_front_offset,"zone":current_zone_id,"inside":_last_inside_zone,"initialized":_interior_initialized,"target":target,"following":is_following,"overview":is_overview,"detail":is_detail_mode,"follow_mode":follow_mode,"combat":is_combat_group_mode,"zoom_ratio":user_zoom_ratio}

func apply_view_state(state: Dictionary, instant: bool = false) -> void:
	target_focus = state.get("focus",target_focus)
	var st_bounds := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(float(state.get("distance",target_distance)), st_bounds.x, st_bounds.y)
	target_pitch = clampf(float(state.get("pitch",target_pitch)),5.0,25.0)
	orbit_step = clampf(float(state.get("orbit",orbit_step)),-2.0,2.0)
	room_front_offset = float(state.get("front",0.0))
	current_zone_id = str(state.get("zone",current_zone_id))
	_last_inside_zone = bool(state.get("inside",false))
	_interior_initialized = bool(state.get("initialized",false))
	var saved_target: Node3D = state.get("target")
	if is_instance_valid(saved_target): target = saved_target
	is_following = bool(state.get("following",false))
	is_overview = bool(state.get("overview",false))
	is_detail_mode = bool(state.get("detail",false))
	follow_mode = str(state.get("follow_mode","follow"))
	is_combat_group_mode = bool(state.get("combat",false))
	user_zoom_ratio = float(state.get("zoom_ratio",target_distance/default_distance))
	_recompute_target_yaw()
	if instant:
		focus_point = target_focus; current_pitch = target_pitch; current_yaw = target_yaw; current_distance = target_distance
		_vel_focus = Vector3.ZERO; _vel_yaw = 0.0; _vel_pitch = 0.0; _vel_distance = 0.0
		update_camera_transform()

func set_view_role(role: String) -> void:
	if role == camera_role: return
	_save_preferences_if_changed(0.4)
	_role_views[camera_role] = get_view_state()
	if camera_role == "dm" and share_camera: _shared_view = get_view_state()
	camera_role = role
	_tilt_hold_dir = 0; _touches.clear(); _touch_axis = ""
	if role == "projector" and share_camera and not _shared_view.is_empty():
		apply_view_state(_shared_view,true)
	elif _role_views.has(role):
		apply_view_state(_role_views[role],true)
	else:
		apply_view_state(_role_views.get("player",_initial_view),true)
		_restored_preferences = false
		_load_preferences()
	# The private DM anchor is mutable. A shared snapshot must not keep following
	# that same object after sharing is disabled and the DM explores elsewhere.
	if role == "projector" and target == _navigation_anchor:
		is_following = false

func _load_preferences() -> void:
	if not persist_preferences: return
	var config := ConfigFile.new()
	if config.load(preferences_file) != OK: return
	var section := _preference_section()
	if not config.has_section_key(section,"pitch"): return
	target_pitch = clampf(float(config.get_value(section,"pitch",25.0)),5.0,25.0)
	current_pitch = target_pitch
	orbit_step = clampf(float(config.get_value(section,"orbit",0.0)),-2.0,2.0)
	var pref_bounds := _effective_zoom_bounds(current_zone_id)
	target_distance = clampf(float(config.get_value(section,"distance",default_distance)),pref_bounds.x,pref_bounds.y)
	current_distance = target_distance
	_last_inside_zone = bool(config.get_value(section,"inside",false))
	_interior_initialized = true
	_restored_preferences = true
	_recompute_target_yaw()

func _preference_section() -> String:
	# Distinct scenes in the same project must not overwrite one another.
	return camera_role+"@"+str(get_parent().scene_file_path)

func _save_preferences_if_changed(delta: float) -> void:
	if camera_role == "projector" or not persist_preferences or is_overview or is_combat_group_mode: return
	_preference_elapsed += delta
	if _preference_elapsed < 0.4: return
	_preference_elapsed = 0.0
	var fingerprint := str([_preference_section(),target_pitch,orbit_step,target_distance,_last_inside_zone])
	if fingerprint == _last_preference: return
	_last_preference = fingerprint
	var config := ConfigFile.new()
	config.load(preferences_file)
	var section := _preference_section()
	config.set_value(section,"pitch",target_pitch)
	config.set_value(section,"orbit",orbit_step)
	config.set_value(section,"distance",target_distance)
	config.set_value(section,"inside",_last_inside_zone)
	config.save(preferences_file)

func _handle_touch(event: InputEvent) -> bool:
	if event is InputEventScreenTouch:
		if event.pressed: _touches[event.index] = event.position
		else: _touches.erase(event.index)
		if _touches.size() == 2:
			_touch_updated.clear()
			var pair: Array = _touches.values()
			_touch_start_center = (pair[0]+pair[1])*0.5
			_touch_start_span = maxf(1.0,pair[0].distance_to(pair[1]))
			_touch_start_pitch = target_pitch; _touch_start_orbit = orbit_step; _touch_start_distance = target_distance
			_touch_axis = ""
		elif _touches.size() < 2:
			_touch_axis = ""; _touch_updated.clear()
		return false
	if event is InputEventScreenDrag and _touches.has(event.index):
		_touches[event.index] = event.position
		if _touches.size() != 2: return false
		_touch_updated[event.index] = true
		# Both fingers arrive as separate events. Wait for the pair before choosing
		# an axis, otherwise every parallel swipe initially looks like a pinch.
		if _touch_axis == "" and _touch_updated.size() < 2: return true
		var pair: Array = _touches.values()
		var center: Vector2 = (pair[0]+pair[1])*0.5
		var span: float = maxf(1.0,pair[0].distance_to(pair[1]))
		var travel := center - _touch_start_center
		if _touch_axis == "" and maxf(travel.length(),absf(span-_touch_start_span)) > 8.0:
			_touch_axis = "zoom" if absf(span-_touch_start_span)>travel.length() else ("orbit" if absf(travel.x)>=absf(travel.y) else "tilt")
		match _touch_axis:
			"zoom":
				var bounds := _effective_zoom_bounds(current_zone_id)
				target_distance = clampf(_touch_start_distance*_touch_start_span/span,bounds.x,bounds.y)
				is_overview = false
			"orbit":
				orbit_step = clampf(_touch_start_orbit+travel.x*0.01,-2.0,2.0)
				_recompute_target_yaw()
			"tilt": target_pitch = clampf(_touch_start_pitch-travel.y*0.1,5.0,25.0)
		get_viewport().set_input_as_handled()
		return true
	return false

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		_tilt_hold_dir = 0
		is_panning = false
		_touches.clear()
		_touch_axis = ""

func accepts_token_input(token: Node3D) -> bool:
	if camera_role == "projector": return false
	if camera_role == "player": return bool(token.get("is_active_player"))
	var ui := get_tree().root.find_child("VttRoleUi",true,false)
	return ui != null and ui.map_interaction != null and ui.map_interaction.selected == token
