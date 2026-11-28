class_name CampFaunaKit
extends RefCounted

## Articulated animated wildlife builders with cached procedural species textures,
## normal-map bump detail, glossy eyes, swept airfoil wings and finned river/sea fish.

const MatKit = preload("res://scripts/camp_material_kit.gd")

static var _tex_cache: Dictionary = {}
static var _mat_cache: Dictionary = {}
static var _wing_mesh_cache: Dictionary = {}
static var _eye_mat: StandardMaterial3D

static func set_behavior(
	agent: Dictionary,
	active_phases: Array,
	blocked_weather: Array,
	visit_cycle: float = 0.0,
	visit_duty: float = 1.0,
	visit_offset: float = 0.0,
	pause_mid: bool = true,
	shy_radius: float = 0.0
) -> void:
	agent["active_phases"] = active_phases
	agent["blocked_weather"] = blocked_weather
	agent["visit_cycle"] = visit_cycle
	agent["visit_duty"] = visit_duty
	agent["visit_offset"] = visit_offset
	agent["pause_mid"] = pause_mid
	agent["shy_radius"] = shy_radius

static func _nearest_hero_info(pos: Vector3, hero_positions: Array) -> Dictionary:
	var best_d2 := INF
	var best_p := Vector3.ZERO
	for hp in hero_positions:
		var hv: Vector3 = hp
		var dx := pos.x - hv.x
		var dz := pos.z - hv.z
		var d2 := dx * dx + dz * dz
		if d2 < best_d2:
			best_d2 = d2
			best_p = hv
	return {"dist": sqrt(best_d2) if best_d2 < INF else INF, "pos": best_p}

static func _hero_too_close(pos: Vector3, hero_positions: Array, radius: float) -> bool:
	if radius <= 0.05 or hero_positions.is_empty():
		return false
	var r2 := radius * radius
	for hp in hero_positions:
		var hv: Vector3 = hp
		if pos.distance_squared_to(hv) <= r2:
			return true
	return false

static func _probe_blocked(space: PhysicsDirectSpaceState3D, from_p: Vector3, dir_xz: Vector3, step_d: float, ground_y_fn: Callable, is_aquatic: bool) -> bool:
	var to_p := from_p + dir_xz * step_d
	if not is_aquatic and ground_y_fn.is_valid():
		var probe_gy: float = float(ground_y_fn.call(to_p.x, to_p.z))
		if probe_gy < -0.06:
			return true
	if space != null:
		var q := PhysicsRayQueryParameters3D.create(from_p + Vector3(0.0, 0.55, 0.0), to_p + Vector3(0.0, 0.55, 0.0))
		q.collide_with_areas = false
		q.collide_with_bodies = true
		var hit := space.intersect_ray(q)
		if not hit.is_empty():
			var nrm: Vector3 = hit.get("normal", Vector3.UP)
			if nrm.y < 0.65:
				return true
	return false

static func update_agents(
	agents: Array[Dictionary],
	time_s: float,
	weather_id: String,
	phase_id: String,
	hero_positions: Array = [],
	ground_height_fn: Callable = Callable(),
	stream_clamp_fn: Callable = Callable()
) -> void:
	var world_space: PhysicsDirectSpaceState3D = null
	for fa in agents:
		var node: Node3D = fa.get("node")
		if not is_instance_valid(node):
			continue
		if world_space == null and node.is_inside_tree() and node.get_world_3d():
			world_space = node.get_world_3d().direct_space_state
		if not fa.has("_base_scale"):
			fa["_base_scale"] = node.scale
		var base_scale: Vector3 = fa.get("_base_scale", Vector3.ONE)

		var gait := str(fa.get("gait", "walk"))
		var p_val: float = float(fa.get("phase", 0.0))
		var prev_t: float = float(fa.get("_prev_t", time_s))
		if time_s < prev_t - 0.5:
			fa["_flee_active"] = false
			fa["_flee_elapsed"] = 0.0
			fa["_fly_escape"] = 0.0
			fa["_fly_enter"] = 0.0
			fa["_flee_cooldown_cycle"] = -1
			fa["_spooked_until_t"] = -1.0
			fa["_waiting_fresh_entry"] = false
			fa["_was_active"] = false
			node.scale = base_scale
		var dt := clampf(time_s - prev_t, 0.0, 0.12)
		fa["_prev_t"] = time_s

		# 1. Time-of-day, weather & intermittent presence scheduling
		var sched_ok := true
		var gate := str(fa.get("time_gate", "always"))
		if gate == "day_clear":
			sched_ok = (phase_id in ["day", "arrival", "dawn"]) and not (weather_id in ["rain", "storm", "snow"])
		elif gate == "nocturnal":
			sched_ok = (phase_id in ["dusk", "night", "dawn"]) and not (weather_id in ["storm"])

		var a_phases: Array = fa.get("active_phases", [])
		if sched_ok and not a_phases.is_empty():
			sched_ok = phase_id in a_phases
		var b_weather: Array = fa.get("blocked_weather", [])
		if sched_ok and not b_weather.is_empty():
			sched_ok = not (weather_id in b_weather)

		var v_cyc: float = float(fa.get("visit_cycle", 0.0))
		var v_duty: float = clampf(float(fa.get("visit_duty", 1.0)), 0.05, 1.0)
		var v_off: float = float(fa.get("visit_offset", 0.0))
		var u_active := 0.5
		var cur_cycle_idx := 0
		if sched_ok and v_cyc > 0.1:
			var t_adj := maxf(0.0, time_s + v_off)
			cur_cycle_idx = int(floorf(t_adj / v_cyc))
			var u_c := fmod(t_adj, v_cyc) / v_cyc
			if u_c >= v_duty:
				sched_ok = false
			else:
				u_active = u_c / v_duty

		var shy_r: float = float(fa.get("shy_radius", 0.0))
		if shy_r <= 0.05 and gait in ["glb", "trot", "hop"]:
			shy_r = 7.5
		var h_info := _nearest_hero_info(node.global_position, hero_positions)
		var h_dist: float = float(h_info["dist"])
		var hero_near := (shy_r > 0.05) and (h_dist <= shy_r)

		# Check distance from hero to animal's natural HOME/SPAWN spot (prevents infinite flee->popback->flee loops!)
		var pts_chk: Array = fa.get("waypoints", [])
		var home_pos: Vector3 = fa.get("base_pos", pts_chk[0] if not pts_chk.is_empty() else node.global_position)
		var hero_home_info := _nearest_hero_info(home_pos, hero_positions)
		var hero_home_dist: float = float(hero_home_info["dist"])
		var spook_until: float = float(fa.get("_spooked_until_t", -1.0))

		# Reset flee lock cleanly ONLY once cooldown duration elapsed, cycle rolled over, AND hero left home zone
		if int(fa.get("_flee_cooldown_cycle", -1)) != cur_cycle_idx and time_s >= spook_until and hero_home_dist > maxf(shy_r * 1.65, 10.5):
			fa["_flee_cooldown_cycle"] = -1
			fa["_flee_active"] = false
			fa["_flee_elapsed"] = 0.0
			fa["_fly_escape"] = 0.0

		var fleeing := bool(fa.get("_flee_active", false))
		if int(fa.get("_flee_cooldown_cycle", -1)) == cur_cycle_idx or time_s < spook_until:
			sched_ok = false

		# Prevent animals emerging mid-trail or right beside a stationary hero
		var was_active := bool(fa.get("_was_active", false))
		if sched_ok and not was_active and not fleeing and dt > 0.0001:
			if hero_home_dist <= maxf(shy_r * 1.65, 9.5):
				sched_ok = false
			elif bool(fa.get("_waiting_fresh_entry", false)):
				if gait in ["perch", "butterfly"]:
					fa["_waiting_fresh_entry"] = false
				elif v_cyc > 0.1 and u_active > 0.10:
					sched_ok = false
				else:
					fa["_waiting_fresh_entry"] = false

		# Trigger natural flee (instead of disappearing in place!) when hero approaches
		if sched_ok and hero_near and not fleeing and gait in ["glb", "trot", "hop", "scuttle", "swim_crawl", "perch", "butterfly"]:
			fleeing = true
			fa["_flee_active"] = true
			fa["_flee_elapsed"] = 0.0
			if gait in ["perch", "butterfly"] and float(fa.get("_fly_enter", 0.0)) > 0.02:
				fa["_fly_escape"] = clampf(1.0 - float(fa.get("_fly_enter", 0.0)), 0.06, 0.90)
				fa["_fly_enter"] = 0.0
			var away := node.global_position - (h_info["pos"] as Vector3)
			away.y = 0.0
			# Bias escape gently outward from camp center (18, 16.5) so deer/rabbits dash into outer woods
			var out_woods := Vector3(node.global_position.x - 18.0, 0.0, node.global_position.z - 16.5)
			if out_woods.length_squared() > 0.5:
				away = away.normalized() * 0.72 + out_woods.normalized() * 0.28
			if away.length_squared() < 0.01:
				away = Vector3(cos(p_val), 0.0, sin(p_val))
			fa["_flee_dir"] = away.normalized()
			fa["_flee_pos"] = node.position

		# 2b. Wide banking thermal soaring cliff birds (coastal gulls & abyss ravens)
		if gait == "soar":
			node.visible = sched_ok
			fa["_was_active"] = sched_ok
			if not sched_ok:
				continue
			var center_s: Vector3 = fa.get("center", Vector3(26.0, 2.0, 6.0))
			var rx_s: float = float(fa.get("radius_x", 16.0))
			var rz_s: float = float(fa.get("radius_z", 12.0))
			var period_s: float = maxf(6.0, float(fa.get("period", 24.0)))
			var dir_sgn: float = float(fa.get("orbit_dir", 1.0))
			var ang_s := dir_sgn * (time_s / period_s) * TAU + p_val
			var bob_y := sin(ang_s * 2.0 + p_val) * float(fa.get("amp_y", 1.4))
			node.position = Vector3(
				center_s.x + cos(ang_s) * rx_s,
				center_s.y + bob_y,
				center_s.z + sin(ang_s) * rz_s
			)
			var vx_s := -sin(ang_s) * rx_s * dir_sgn
			var vz_s := cos(ang_s) * rz_s * dir_sgn
			node.rotation.y = atan2(vx_s, vz_s)
			node.rotation.x = clampf(-cos(ang_s * 2.0 + p_val) * 0.10, -0.18, 0.18)
			node.rotation.z = -dir_sgn * (0.24 + sin(ang_s) * 0.08)
			var lw_s: Node3D = fa.get("lw")
			var rw_s: Node3D = fa.get("rw")
			# Realistic seabird flight: long effortless thermal glides punctuated by brief slow wingbeats
			var glide_cyc := fmod(time_s * 0.34 + p_val, 3.8)
			var flap_s := (sin(time_s * 8.2 + p_val) * 0.44) if glide_cyc < 0.95 else (0.06 + sin(time_s * 1.8 + p_val) * 0.04)
			if is_instance_valid(lw_s): lw_s.rotation.z = flap_s
			if is_instance_valid(rw_s): rw_s.rotation.z = -flap_s
			continue

		# 2. Perched birds & hovering butterflies: smooth canopy fly-in / fly-away escape (NO instant pop!)
		if gait in ["perch", "butterfly"]:
			var fly_esc: float = float(fa.get("_fly_escape", 0.0))
			if not sched_ok or fleeing:
				if dt <= 0.0001 and not fleeing:
					node.visible = false
					node.scale = base_scale
					fa["_fly_enter"] = 1.0
					fa["_was_active"] = false
					continue
				if node.visible or fleeing:
					fly_esc = minf(1.0, fly_esc + dt / 1.15)
					fa["_fly_escape"] = fly_esc
					if fly_esc >= 1.0:
						node.visible = false
						node.scale = base_scale
						fa["_flee_active"] = false
						fa["_flee_cooldown_cycle"] = cur_cycle_idx
						if fleeing:
							fa["_spooked_until_t"] = time_s + 28.0
						fa["_waiting_fresh_entry"] = true
						fa["_fly_enter"] = 1.0
						fa["_was_active"] = false
						continue
				else:
					fa["_was_active"] = false
					continue
			else:
				if not node.visible:
					fa["_fly_enter"] = 1.0 if dt > 0.0001 else 0.0
					fa["_fly_escape"] = 0.0
					if not fa.has("_flee_dir"):
						fa["_flee_dir"] = Vector3(cos(p_val), 0.0, sin(p_val)).normalized()
				fly_esc = 0.0
				var f_in: float = maxf(0.0, float(fa.get("_fly_enter", 0.0)) - dt / 1.25)
				fa["_fly_enter"] = f_in

			node.visible = true
			fa["_was_active"] = true
			var esc_u: float = maxf(fly_esc, float(fa.get("_fly_enter", 0.0)))
			var vis_sc := 1.0 if esc_u <= 0.55 else clampf(1.0 - (esc_u - 0.55) / 0.45, 0.04, 1.0)
			node.scale = base_scale * vis_sc
			if gait == "perch":
				var base_pos: Vector3 = fa.get("base_pos", node.position)
				var base_yaw: float = float(fa.get("base_yaw", 0.0))
				var hop_cyc: float = fmod(time_s * 0.48 + p_val, 3.2)
				var hop_h: float = sin(hop_cyc * PI / 0.35) * 0.09 if (hop_cyc < 0.35 and esc_u <= 0.01) else 0.0
				var flee_dir_b: Vector3 = fa.get("_flee_dir", Vector3(cos(p_val), 0.0, sin(p_val)).normalized())
				var aerial_off := (flee_dir_b * 7.5 + Vector3(0.0, 9.0, 0.0)) * (esc_u * esc_u)
				node.position = base_pos + Vector3(sin(p_val) * hop_h * 0.3, hop_h, 0.0) + aerial_off
				node.rotation.y = (atan2(flee_dir_b.x, flee_dir_b.z) if fly_esc > 0.01 else (base_yaw + sin(time_s * 1.15 + p_val * 2.0) * 0.55))
				var head_n: Node3D = fa.get("head_node")
				if is_instance_valid(head_n):
					var peck := maxf(0.0, sin(time_s * 2.1 + p_val * 3.0))
					head_n.rotation.x = -0.52 * pow(peck, 6.0) if esc_u <= 0.01 else -0.15
					head_n.rotation.y = sin(time_s * 2.7 + p_val) * 0.38 if esc_u <= 0.01 else 0.0
				var lw: Node3D = fa.get("lw")
				var rw: Node3D = fa.get("rw")
				var stretch := maxf(0.0, sin(time_s * 0.85 + p_val))
				var wing_a := (sin(time_s * 22.0 + p_val) * 0.82) if esc_u > 0.01 else (0.25 if stretch < 0.92 else 0.25 + sin(time_s * 14.0) * 0.45)
				if is_instance_valid(lw): lw.rotation.z = wing_a
				if is_instance_valid(rw): rw.rotation.z = -wing_a
				var tail_n: Node3D = fa.get("tail_node")
				if is_instance_valid(tail_n):
					tail_n.rotation.x = 0.18 + sin(time_s * 4.5 + p_val) * 0.14
				continue
			else:
				var anchor: Vector3 = fa.get("base_pos", node.position)
				var ang := time_s * 1.45 + p_val * 2.3
				var climb_b := Vector3(cos(ang) * 3.2, 6.5, sin(ang) * 3.2) * (esc_u * esc_u)
				node.position = anchor + Vector3(
					cos(ang) * 0.65 + sin(ang * 2.1) * 0.25,
					0.28 + sin(time_s * 3.1 + p_val) * 0.16,
					sin(ang * 1.3) * 0.55
				) + climb_b
				node.rotation.y = -ang
				var lw_b: Node3D = fa.get("lw")
				var rw_b: Node3D = fa.get("rw")
				var flap := sin(time_s * (26.0 if esc_u > 0.01 else 18.0) + p_val * 4.0) * 1.05
				if is_instance_valid(lw_b): lw_b.rotation.z = flap
				if is_instance_valid(rw_b): rw_b.rotation.z = -flap
				continue

		# 3. Active ground flee (obstacle-steered sprint into cover instead of getting stuck or popping!)
		if fleeing and gait in ["glb", "trot", "hop", "scuttle", "swim_crawl"]:
			var flee_t: float = float(fa.get("_flee_elapsed", 0.0)) + dt
			fa["_flee_elapsed"] = flee_t
			var fdir: Vector3 = fa.get("_flee_dir", Vector3(-1.0, 0.0, 0.0))
			if hero_near and h_dist > 0.1:
				var re_away := node.global_position - (h_info["pos"] as Vector3)
				re_away.y = 0.0
				if re_away.length_squared() > 0.01:
					fdir = fdir.lerp(re_away.normalized(), clampf(dt * 3.6, 0.0, 1.0)).normalized()
			var cur_fp: Vector3 = fa.get("_flee_pos", node.position)
			var fspeed := 6.4 if gait in ["glb", "trot"] else (4.4 if gait == "hop" else 2.2)
			var is_aq := gait == "swim_crawl"
			var probe_d := maxf(1.35, fspeed * dt * 8.0)
			if _probe_blocked(world_space, cur_fp, fdir, probe_d, ground_height_fn, is_aq):
				var turn_sgn := 1.0 if int(round(p_val * 10.0)) % 2 == 0 else -1.0
				var chosen := fdir
				for ang_d: float in [0.68 * turn_sgn, -0.68 * turn_sgn, 1.28 * turn_sgn, -1.28 * turn_sgn, 2.05 * turn_sgn, -2.05 * turn_sgn]:
					var cand := fdir.rotated(Vector3.UP, ang_d).normalized()
					if not _probe_blocked(world_space, cur_fp, cand, probe_d, ground_height_fn, is_aq):
						chosen = cand
						break
				fdir = fdir.lerp(chosen, clampf(dt * 12.0 + 0.35, 0.0, 1.0)).normalized()
			fa["_flee_dir"] = fdir
			var fpos: Vector3 = cur_fp + fdir * (fspeed * dt)
			if ground_height_fn.is_valid():
				fpos.y = float(ground_height_fn.call(fpos.x, fpos.z))
			if gait == "hop":
				fpos.y += absf(sin(time_s * 11.0 + p_val)) * 0.24
			fa["_flee_pos"] = Vector3(fpos.x, fpos.y, fpos.z)
			node.position = fpos
			node.rotation.y = atan2(fdir.x, fdir.z) + (PI * 0.5 if gait == "scuttle" else 0.0)
			var flee_fade := 1.0 if flee_t < 3.35 else clampf(1.0 - (flee_t - 3.35) / 0.85, 0.04, 1.0)
			node.scale = base_scale * flee_fade
			var ap_f: AnimationPlayer = fa.get("ap")
			if is_instance_valid(ap_f):
				var run_c := str(fa.get("walk_clip", "Walk"))
				if ap_f.has_animation("Run"):
					run_c = "Run"
				elif ap_f.has_animation("Gallop"):
					run_c = "Gallop"
				if run_c != "" and ap_f.current_animation != run_c and ap_f.has_animation(run_c):
					ap_f.play(run_c, -1, 1.65)
			node.visible = true
			fa["_was_active"] = true
			if h_dist >= 26.0 or flee_t >= 4.2:
				node.visible = false
				node.scale = base_scale
				fa["_flee_active"] = false
				fa["_flee_cooldown_cycle"] = cur_cycle_idx
				fa["_spooked_until_t"] = time_s + (34.0 if gait in ["glb", "trot"] else 28.0)
				fa["_waiting_fresh_entry"] = true
				fa["_was_active"] = false
			continue

		node.visible = sched_ok
		fa["_was_active"] = sched_ok
		if not sched_ok:
			node.scale = base_scale
			continue

		# Smooth emergence/exit scaling at entry/exit thickets
		if v_cyc > 0.1 and gait in ["glb", "trot", "hop", "scuttle"]:
			var edge_u := minf(u_active, 1.0 - u_active)
			node.scale = base_scale * (1.0 if edge_u >= 0.06 else clampf(edge_u / 0.06, 0.06, 1.0))
		else:
			node.scale = base_scale

		# 4. Natural Catmull-Rom visit trajectory (entry off-screen -> graze/look pause -> exit off-screen)
		var pts: Array = fa.get("waypoints", [])
		if pts.size() < 2:
			continue
		var period: float = maxf(2.0, float(fa.get("period", 26.0)))
		var t_raw := u_active if v_cyc > 0.1 else (fmod(time_s * float(fa.get("speed", 1.0)) + p_val, period) / period)
		var is_paused := false
		var t_spline := t_raw
		if bool(fa.get("pause_mid", false)):
			if t_raw < 0.34:
				t_spline = (t_raw / 0.34) * 0.50
			elif t_raw <= 0.66:
				t_spline = 0.50
				is_paused = not _hero_too_close(node.global_position, hero_positions, shy_r)
			else:
				t_spline = 0.50 + ((t_raw - 0.66) / 0.34) * 0.50

		var scaled := t_spline * float(pts.size() - 1)
		var idx := mini(int(floorf(scaled)), pts.size() - 2)
		var frac := scaled - float(idx)
		var p0: Vector3 = pts[maxi(0, idx - 1)]
		var p1: Vector3 = pts[idx]
		var p2: Vector3 = pts[idx + 1]
		var p3: Vector3 = pts[mini(pts.size() - 1, idx + 2)]
		var pos := _catmull_rom(p0, p1, p2, p3, frac)
		var next_pos := _catmull_rom(p0, p1, p2, p3, clampf(frac + 0.02, 0.0, 1.0))
		if bool(fa.get("clamp_to_river", false)) and stream_clamp_fn.is_valid():
			var c_now: Vector2 = stream_clamp_fn.call(pos.x, pos.z)
			var c_nxt: Vector2 = stream_clamp_fn.call(next_pos.x, next_pos.z)
			pos.x = c_now.x
			next_pos.x = c_nxt.x
		if ground_height_fn.is_valid() and gait in ["glb", "trot", "hop", "scuttle", "swim_crawl"]:
			pos.y = float(ground_height_fn.call(pos.x, pos.z))

		# Sync GLB AnimationPlayer clip between Walk & Eating/Idle during natural stops
		var ap: AnimationPlayer = fa.get("ap")
		if is_instance_valid(ap):
			var target_clip := str(fa.get("pause_clip", "Eating")) if is_paused else str(fa.get("walk_clip", "Walk"))
			if target_clip != "" and ap.current_animation != target_clip and ap.has_animation(target_clip):
				var anim_res := ap.get_animation(target_clip)
				if anim_res:
					anim_res.loop_mode = Animation.LOOP_LINEAR
				ap.play(target_clip)

		# Gait overlays on position & pitch
		var leap_pitch := 0.0
		if gait == "hop" and not is_paused:
			var arc := absf(sin(time_s * 4.2 + p_val))
			pos.y += arc * 0.22
			node.rotation.x = cos(time_s * 4.2 + p_val) * -0.18
		elif gait == "hop" and is_paused:
			node.rotation.x = sin(time_s * 5.0 + p_val) * 0.08 - 0.12
		elif gait == "bat":
			pos.y += sin(time_s * 2.6 + p_val) * 0.22
		elif gait == "swim_ocean_jump":
			var leap_period: float = float(fa.get("leap_period", 11.5))
			var l_cyc: float = fmod(time_s + p_val * 2.3, leap_period)
			if l_cyc < 1.35 and not (weather_id in ["rain", "storm", "snow"]):
				var lt := l_cyc / 1.35
				var jump_h: float = float(fa.get("leap_height", 0.36))
				pos.y += sin(lt * PI) * jump_h
				leap_pitch = -cos(lt * PI) * 0.52

		node.position = pos
		var dir := next_pos - pos
		if dir.length_squared() > 0.0001 and not is_paused:
			var yaw := atan2(dir.x, dir.z)
			if gait == "scuttle":
				yaw += PI * 0.5
			node.rotation.y = yaw
		elif is_paused and dir.length_squared() > 0.0001:
			var yaw_p := atan2(dir.x, dir.z) + sin(time_s * 0.8 + p_val) * 0.25
			if gait == "scuttle":
				yaw_p += PI * 0.5
			node.rotation.y = yaw_p
		if gait == "swim_ocean_jump":
			node.rotation.x = leap_pitch

		# Articulated limbs / wings / tail animation (standing/grazing cleanly when paused!)
		if gait == "trot":
			var legs: Array = fa.get("legs", [])
			for li in range(legs.size()):
				var leg_n: Node3D = legs[li]
				if is_instance_valid(leg_n):
					if is_paused:
						leg_n.rotation.x = 0.0
					else:
						var sgn := 1.0 if (li == 0 or li == 3) else -1.0
						leg_n.rotation.x = sin(time_s * 7.8 + p_val) * 0.42 * sgn
			var head_t: Node3D = fa.get("head_node")
			if is_instance_valid(head_t):
				head_t.rotation.x = (-0.42 + sin(time_s * 3.4 + p_val) * 0.14) if is_paused else (sin(time_s * 2.2 + p_val) * 0.14)
				head_t.rotation.y = sin(time_s * 1.4 + p_val) * 0.28 if is_paused else 0.0
			var tail_t: Node3D = fa.get("tail_node")
			if is_instance_valid(tail_t):
				tail_t.rotation.y = sin(time_s * (2.5 if is_paused else 5.2) + p_val) * 0.22
		elif gait == "scuttle":
			var wnode: Node3D = fa.get("wiggle_node")
			if is_instance_valid(wnode):
				wnode.rotation.z = 0.0 if is_paused else sin(time_s * 12.0 + p_val) * 0.09
			var claws: Array = fa.get("legs", [])
			for ci in range(claws.size()):
				var cn: Node3D = claws[ci]
				if is_instance_valid(cn):
					cn.rotation.x = -0.25 + sin(time_s * (3.2 if is_paused else 9.0) + float(ci) * 1.4 + p_val) * 0.24
		elif gait == "swim_crawl":
			var flip: Array = fa.get("legs", [])
			for fi in range(flip.size()):
				var fn: Node3D = flip[fi]
				if is_instance_valid(fn):
					var f_side := -1.0 if fi % 2 == 0 else 1.0
					fn.rotation.y = sin(time_s * (1.2 if is_paused else 3.4) + p_val + float(fi) * 0.5) * (0.15 if is_paused else 0.45) * f_side
		elif gait in ["swim_fish", "swim_ocean_jump"]:
			var tail_f: Node3D = fa.get("wiggle_node")
			if is_instance_valid(tail_f):
				tail_f.rotation.y = sin(time_s * (4.0 if is_paused else 11.5) + p_val) * (0.14 if is_paused else 0.34)
		elif gait == "bat":
			var lw_f: Node3D = fa.get("lw")
			var rw_f: Node3D = fa.get("rw")
			var bf := sin(time_s * 14.5 + p_val * 2.0) * 0.78
			if is_instance_valid(lw_f): lw_f.rotation.z = bf
			if is_instance_valid(rw_f): rw_f.rotation.z = -bf
		else:
			var wn: Node3D = fa.get("wiggle_node")
			if is_instance_valid(wn):
				wn.rotation.y = sin(time_s * 9.5 + p_val) * 0.26

static func _catmull_rom(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: float) -> Vector3:
	var t2 := t * t
	var t3 := t2 * t
	return 0.5 * (
		(2.0 * p1)
		+ (-p0 + p2) * t
		+ (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
		+ (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
	)

# ------------------------------------------------------------------------------
# Cached procedural species textures + micro-normals (fast 1-time 96x96 synthesis)
# ------------------------------------------------------------------------------
static func _species_textures(pattern: String, col_a: Color, col_b: Color, accent: Color) -> Dictionary:
	var k := "%s_%s_%s_%s" % [pattern, col_a.to_html(false), col_b.to_html(false), accent.to_html(false)]
	if _tex_cache.has(k):
		return _tex_cache[k]

	var sz := 160 if pattern == "alpine_fur" else 96
	var img_alb := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var img_nrm := Image.create(sz, sz, false, Image.FORMAT_RGB8)
	var hmap: PackedFloat32Array = PackedFloat32Array()
	hmap.resize(sz * sz)

	for y in range(sz):
		var v := float(y) / float(sz)
		for x in range(sz):
			var u := float(x) / float(sz)
			var n := sin(u * 29.0 + cos(v * 17.0) * 1.4) * cos(v * 23.0 - u * 7.0) * 0.5 + 0.5
			var h := 0.5
			var col := col_a
			match pattern:
				"feather":
					var fx := fmod(u * 12.0 + float(y % 8) * 0.08, 1.0)
					var fy := fmod(v * 10.0, 1.0)
					var barb := sin(fx * PI) * sin(fy * PI)
					var shaft := smoothstep(0.10, 0.02, absf(fx - 0.5))
					col = col_a.lerp(col_b, clampf(0.25 + barb * 0.45 + n * 0.25, 0.0, 1.0))
					if u > 0.72: # Wingtip primary feathers darkening
						col = col.lerp(accent, smoothstep(0.70, 0.95, u) * 0.85)
					col = col.lerp(col_b.lightened(0.18), shaft * 0.28)
					h = 0.42 + barb * 0.40 + shaft * 0.16
				"fur":
					var hair := sin(u * 62.0 + sin(v * 18.0) * 2.2) * 0.5 + 0.5
					var guard := sin(u * 124.0 + v * 32.0) * 0.5 + 0.5
					col = col_a.lerp(col_b, clampf(hair * 0.55 + n * 0.35, 0.0, 1.0))
					if guard > 0.78:
						col = col.lerp(accent, 0.34)
					h = 0.35 + hair * 0.45 + guard * 0.20
				"alpine_fur":
					# Organic mottled mountain-coat fur (multi-octave value-like noise + soft dorsal/belly shading, ZERO regular zebra stripes!)
					var n1 := sin(u * 13.0 + cos(v * 11.0) * 2.3) * cos(v * 17.0 - sin(u * 9.0) * 1.9) * 0.5 + 0.5
					var n2 := sin(u * 37.0 + v * 19.0 + n1 * 4.5) * cos(v * 41.0 - u * 23.0) * 0.5 + 0.5
					var fine_tuft := fposmod(sin(floorf(u * 64.0) * 127.1 + floorf(v * 28.0) * 311.7) * 43758.5453, 1.0)
					var dorsal_band := 1.0 - smoothstep(0.18, 0.48, absf(v - 0.22))
					var belly_light := smoothstep(0.62, 0.90, v)
					col = col_a.lerp(col_b, clampf(n1 * 0.52 + n2 * 0.26 + fine_tuft * 0.22, 0.0, 1.0))
					col = col.lerp(accent, dorsal_band * 0.58)
					col = col.lerp(col_b.lightened(0.28), belly_light * 0.48)
					h = 0.32 + fine_tuft * 0.40 + n2 * 0.28
				"turtle":
					var cx := floorf(u * 4.0) + (0.5 if int(floorf(v * 4.0)) % 2 == 1 else 0.0)
					var cy := floorf(v * 4.0)
					var lx := (u * 4.0) - cx
					var ly := (v * 4.0) - cy
					var dist_c := sqrt(lx * lx + ly * ly)
					var seam := smoothstep(0.42, 0.52, dist_c)
					var scute_glow := clampf(1.0 - dist_c * 1.45, 0.0, 1.0)
					col = col_a.lerp(col_b, scute_glow * 0.75 + n * 0.15)
					col = col.lerp(accent, seam * 0.88)
					h = 0.75 - seam * 0.55 + n * 0.12
				"crab":
					var spots := pow(sin(u * 19.0 + cos(v * 23.0)) * cos(v * 21.0) * 0.5 + 0.5, 2.5)
					var ridge := smoothstep(0.08, 0.01, absf(v - 0.5 - sin(u * TAU) * 0.08))
					col = col_a.lerp(col_b, spots * 0.68 + n * 0.24).lerp(accent, ridge * 0.65)
					h = 0.45 + spots * 0.32 + ridge * 0.22
				"scales":
					var sx := fmod(u * 16.0 + (0.5 if int(v * 14.0) % 2 == 1 else 0.0), 1.0) - 0.5
					var sy := fmod(v * 14.0, 1.0) - 0.5
					var s_edge := smoothstep(0.32, 0.52, sqrt(sx * sx + sy * sy))
					var dorsal := smoothstep(0.55, 0.18, v)
					var stripe := smoothstep(0.12, 0.02, absf(v - 0.48))
					col = col_a.lerp(col_b, (1.0 - dorsal) * 0.75)
					col = col.lerp(accent, stripe * 0.65 + (0.45 if (dorsal > 0.4 and n > 0.76) else 0.0))
					col = col.darkened(s_edge * 0.24)
					h = 0.68 - s_edge * 0.42
				"horn":
					var ring := sin(v * 54.0 + n * 1.5) * 0.5 + 0.5
					col = col_a.lerp(col_b, ring * 0.7 + n * 0.2)
					h = 0.35 + ring * 0.55
				"butterfly":
					var wing_d := sqrt(pow(u - 0.5, 2.0) + pow(v - 0.5, 2.0))
					var vein := smoothstep(0.06, 0.01, absf(sin((u * 3.0 + v * 2.0) * PI)))
					var rim := smoothstep(0.36, 0.49, wing_d)
					var eye_spot := smoothstep(0.11, 0.05, sqrt(pow(u - 0.72, 2.0) + pow(v - 0.35, 2.0)))
					col = col_a.lerp(col_b, n * 0.4).lerp(accent, clampf(rim * 0.9 + vein * 0.55, 0.0, 1.0))
					col = col.lerp(Color("#f7f4e4"), eye_spot * 0.85)
					h = 0.5 + vein * 0.25
			img_alb.set_pixel(x, y, col)
			hmap[y * sz + x] = h

	for y in range(sz):
		var ym := (y - 1 + sz) % sz
		var yp := (y + 1) % sz
		for x in range(sz):
			var xm := (x - 1 + sz) % sz
			var xp := (x + 1) % sz
			var dx := (hmap[y * sz + xm] - hmap[y * sz + xp]) * 1.4
			var dy := (hmap[ym * sz + x] - hmap[yp * sz + x]) * 1.4
			var nv := Vector3(dx, dy, 1.0).normalized() * 0.5 + Vector3(0.5, 0.5, 0.5)
			img_nrm.set_pixel(x, y, Color(nv.x, nv.y, nv.z, 1.0))

	var pair := {
		"alb": ImageTexture.create_from_image(img_alb),
		"nrm": ImageTexture.create_from_image(img_nrm),
	}
	_tex_cache[k] = pair
	return pair

static func _species_mat(key: String, pattern: String, col_a: Color, col_b: Color, accent: Color, rough: float = 0.72, metallic: float = 0.0, double_sided: bool = false) -> StandardMaterial3D:
	if _mat_cache.has(key):
		return _mat_cache[key]
	var texs := _species_textures(pattern, col_a, col_b, accent)
	var m := StandardMaterial3D.new()
	m.albedo_texture = texs["alb"]
	m.normal_enabled = true
	m.normal_texture = texs["nrm"]
	m.normal_scale = 0.52
	m.roughness = rough
	m.metallic = metallic
	m.rim_enabled = true
	m.rim = 0.10
	m.rim_tint = 0.25
	if double_sided:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mat_cache[key] = m
	return m

static func _get_eye_mat() -> StandardMaterial3D:
	if _eye_mat == null:
		_eye_mat = StandardMaterial3D.new()
		_eye_mat.albedo_color = Color("#111318")
		_eye_mat.roughness = 0.05
		_eye_mat.metallic = 0.15
		_eye_mat.metallic_specular = 0.96
	return _eye_mat

static func _add_eyes(parent: Node3D, offsets: Array[Vector3], r: float) -> void:
	var m_eye := _get_eye_mat()
	var sm := SphereMesh.new(); sm.radius = r; sm.height = r * 2.0; sm.radial_segments = 6; sm.rings = 3
	for off in offsets:
		var e := MeshInstance3D.new(); e.mesh = sm; e.material_override = m_eye; e.position = off
		e.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(e)

static func _add_sphere(parent: Node3D, r: float, h: float, pos: Vector3, scl: Vector3, mat: Material, shadow: bool = true) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var sm := SphereMesh.new(); sm.radius = r; sm.height = h; sm.radial_segments = 8; sm.rings = 4
	m.mesh = sm; m.material_override = mat
	m.position = pos; m.scale = scl
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
	return m

static func _add_leg_pivot(parent: Node3D, pivot_pos: Vector3, r_top: float, r_bot: float, len_m: float, mat: Material) -> Node3D:
	var piv := Node3D.new(); piv.position = pivot_pos; parent.add_child(piv)
	var m := MeshInstance3D.new()
	var cm := CylinderMesh.new(); cm.top_radius = r_top; cm.bottom_radius = r_bot; cm.height = len_m; cm.radial_segments = 6
	m.mesh = cm; m.material_override = mat; m.position.y = -len_m * 0.5
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	piv.add_child(m)
	return piv

static func _get_wing_mesh(side: float, s: float) -> ArrayMesh:
	var key := "wing_%.2f_%.2f" % [side, s]
	if _wing_mesh_cache.has(key):
		return _wing_mesh_cache[key]
	# Swept curved bird airfoil (inner shoulder -> elbow -> swept wrist -> tapered primary tip)
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var p_sh_f := Vector3(0.0, 0.01 * s, 0.09 * s)
	var p_sh_b := Vector3(0.0, -0.005 * s, -0.09 * s)
	var p_md_f := Vector3(side * 0.22 * s, 0.03 * s, 0.08 * s)
	var p_md_b := Vector3(side * 0.20 * s, 0.01 * s, -0.08 * s)
	var p_tp_f := Vector3(side * 0.44 * s, 0.01 * s, -0.02 * s)
	var p_tp_b := Vector3(side * 0.41 * s, 0.0, -0.11 * s)
	var tris := [
		[p_sh_f, Vector2(0.0, 0.2), p_md_f, Vector2(0.48, 0.2), p_md_b, Vector2(0.48, 0.8)],
		[p_sh_f, Vector2(0.0, 0.2), p_md_b, Vector2(0.48, 0.8), p_sh_b, Vector2(0.0, 0.8)],
		[p_md_f, Vector2(0.48, 0.2), p_tp_f, Vector2(0.98, 0.25), p_tp_b, Vector2(0.98, 0.82)],
		[p_md_f, Vector2(0.48, 0.2), p_tp_b, Vector2(0.98, 0.82), p_md_b, Vector2(0.48, 0.8)],
	]
	for t in tris:
		st.set_uv(t[1]); st.add_vertex(t[0])
		st.set_uv(t[3]); st.add_vertex(t[2])
		st.set_uv(t[5]); st.add_vertex(t[4])
	st.generate_normals()
	var mesh := st.commit()
	_wing_mesh_cache[key] = mesh
	return mesh

# ------------------------------------------------------------------------------
# Species builders
# ------------------------------------------------------------------------------
static func spawn_fox(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_fur := _species_mat("fox_fur_v2", "fur", Color("#9e3e16"), Color("#ba5624"), Color("#421d0c"), 0.74)
	var m_cream := _species_mat("fox_cream_v2", "fur", Color("#d8cbb2"), Color("#e8dec8"), Color("#a8967d"), 0.78)
	var m_dark := _species_mat("fox_dark_v2", "fur", Color("#221b17"), Color("#342a24"), Color("#120e0c"), 0.68)

	_add_sphere(root, 0.135, 0.24, Vector3(0, 0.24, 0.0), Vector3(0.84, 0.86, 1.95), m_fur)
	_add_sphere(root, 0.095, 0.18, Vector3(0, 0.27, 0.16), Vector3(0.85, 0.95, 1.15), m_cream)

	var head := Node3D.new(); head.position = Vector3(0, 0.32, 0.21); root.add_child(head)
	_add_sphere(head, 0.09, 0.15, Vector3(0, 0.02, 0.06), Vector3(0.92, 0.86, 1.32), m_fur)
	_add_sphere(head, 0.038, 0.085, Vector3(0, 0.0, 0.17), Vector3(0.78, 0.68, 1.35), m_fur)
	_add_sphere(head, 0.018, 0.02, Vector3(0, 0.01, 0.23), Vector3.ONE, m_dark, false)
	_add_eyes(head, [Vector3(-0.046, 0.055, 0.12), Vector3(0.046, 0.055, 0.12)], 0.016)
	for es in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var em := CylinderMesh.new(); em.top_radius = 0.006; em.bottom_radius = 0.032; em.height = 0.09; em.radial_segments = 4
		ear.mesh = em; ear.material_override = m_dark; ear.position = Vector3(es * 0.055, 0.11, 0.02); ear.rotation.z = -es * 0.18
		head.add_child(ear)

	var tail := Node3D.new(); tail.position = Vector3(0, 0.27, -0.24); tail.rotation.x = 0.28; root.add_child(tail)
	_add_sphere(tail, 0.072, 0.36, Vector3(0, 0.0, -0.17), Vector3(0.9, 0.88, 1.15), m_fur)
	_add_sphere(tail, 0.056, 0.15, Vector3(0, 0.0, -0.34), Vector3(0.9, 0.9, 1.1), m_cream, false)

	var legs: Array = []
	for lp in [Vector3(-0.075, 0.20, 0.14), Vector3(0.075, 0.20, 0.14), Vector3(-0.075, 0.20, -0.14), Vector3(0.075, 0.20, -0.14)]:
		legs.append(_add_leg_pivot(root, lp, 0.032, 0.018, 0.20, m_dark))

	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "trot", "legs": legs, "head_node": head, "tail_node": tail,
	})

static func spawn_rabbit(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, fur_tint: Color = Color("#6b5644")) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_fur := _species_mat("rab2_" + fur_tint.to_html(false), "fur", fur_tint.darkened(0.18), fur_tint, fur_tint.darkened(0.45), 0.80)
	var m_tail := _species_mat("rab_tail2", "fur", Color("#ded8cb"), Color("#eee9df"), Color("#bfb7a6"), 0.86)
	_add_sphere(root, 0.105, 0.20, Vector3(0, 0.10, -0.01), Vector3(0.88, 0.88, 1.32), m_fur)
	_add_sphere(root, 0.068, 0.13, Vector3(0, 0.17, 0.11), Vector3(0.9, 0.9, 1.05), m_fur)
	_add_sphere(root, 0.038, 0.05, Vector3(0, 0.11, -0.14), Vector3.ONE, m_tail, false)
	_add_eyes(root, [Vector3(-0.044, 0.19, 0.155), Vector3(0.044, 0.19, 0.155)], 0.013)
	for es in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var em := CylinderMesh.new(); em.top_radius = 0.012; em.bottom_radius = 0.022; em.height = 0.13; em.radial_segments = 5
		ear.mesh = em; ear.material_override = m_fur; ear.position = Vector3(es * 0.032, 0.26, 0.10); ear.rotation = Vector3(-0.22, 0.0, -es * 0.18)
		root.add_child(ear)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "hop",
	})

static func spawn_ibex(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_coat := _species_mat("ibex_coat2", "fur", Color("#5c4f44"), Color("#75675a"), Color("#2c251f"), 0.84)
	var m_horn := _species_mat("ibex_horn2", "horn", Color("#352d26"), Color("#4f4339"), Color("#1e1814"), 0.56)
	var m_hoof := _species_mat("ibex_hoof2", "fur", Color("#221e1b"), Color("#302b27"), Color("#12100e"), 0.68)
	_add_sphere(root, 0.19, 0.34, Vector3(0, 0.39, 0.0), Vector3(0.82, 0.90, 1.65), m_coat)
	_add_sphere(root, 0.12, 0.24, Vector3(0, 0.48, 0.20), Vector3(0.78, 1.15, 0.95), m_coat)
	var head := Node3D.new(); head.position = Vector3(0, 0.56, 0.25); root.add_child(head)
	_add_sphere(head, 0.10, 0.20, Vector3(0, 0.03, 0.06), Vector3(0.82, 0.88, 1.35), m_coat)
	_add_sphere(head, 0.038, 0.11, Vector3(0, -0.07, 0.09), Vector3(0.65, 1.1, 0.7), m_horn, false) # goatee
	_add_eyes(head, [Vector3(-0.058, 0.06, 0.11), Vector3(0.058, 0.06, 0.11)], 0.017)
	for hs in [-1.0, 1.0]:
		var h1 := MeshInstance3D.new()
		var hm1 := CylinderMesh.new(); hm1.top_radius = 0.024; hm1.bottom_radius = 0.034; hm1.height = 0.22; hm1.radial_segments = 6
		h1.mesh = hm1; h1.material_override = m_horn
		h1.position = Vector3(hs * 0.055, 0.16, -0.03); h1.rotation = Vector3(-0.55, 0.0, -hs * 0.18)
		head.add_child(h1)
		var h2 := MeshInstance3D.new()
		var hm2 := CylinderMesh.new(); hm2.top_radius = 0.010; hm2.bottom_radius = 0.023; hm2.height = 0.20; hm2.radial_segments = 6
		h2.mesh = hm2; h2.material_override = m_horn
		h2.position = Vector3(hs * 0.088, 0.22, -0.15); h2.rotation = Vector3(-1.32, 0.0, -hs * 0.26)
		head.add_child(h2)
	var legs: Array = []
	for lp in [Vector3(-0.10, 0.28, 0.18), Vector3(0.10, 0.28, 0.18), Vector3(-0.10, 0.28, -0.20), Vector3(0.10, 0.28, -0.20)]:
		legs.append(_add_leg_pivot(root, lp, 0.044, 0.024, 0.28, m_hoof))
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "trot", "legs": legs, "head_node": head,
	})

static func spawn_turtle(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var m_shell := _species_mat("turtle_shell", "turtle", Color("#56663c"), Color("#a58b46"), Color("#2c2516"), 0.42)
	var m_skin := _species_mat("turtle_skin", "crab", Color("#6a7449"), Color("#868e5e"), Color("#3d442a"), 0.56)
	_add_sphere(root, 0.26, 0.20, Vector3(0, 0.09, 0.0), Vector3(0.95, 0.72, 1.24), m_shell)
	_add_sphere(root, 0.07, 0.14, Vector3(0, 0.09, 0.34), Vector3(0.88, 0.82, 1.15), m_skin)
	_add_eyes(root, [Vector3(-0.044, 0.11, 0.39), Vector3(0.044, 0.11, 0.39)], 0.014)
	var legs: Array = []
	for fp in [Vector3(-0.22, 0.06, 0.16), Vector3(0.22, 0.06, 0.16), Vector3(-0.18, 0.05, -0.20), Vector3(0.18, 0.05, -0.20)]:
		var piv := Node3D.new(); piv.position = fp; root.add_child(piv)
		var fm := _add_sphere(piv, 0.095, 0.035, Vector3(signf(fp.x) * 0.11, 0.0, -0.03), Vector3(1.45, 0.45, 0.65), m_skin, false)
		fm.rotation.y = signf(fp.x) * -0.4
		legs.append(piv)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "swim_crawl", "legs": legs,
	})

static func spawn_crab(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, tint: Color = Color("#b8452a")) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var mat_shell := _species_mat("crab_" + tint.to_html(false), "crab", tint, tint.lightened(0.28), tint.darkened(0.45), 0.36)
	var mat_leg := _species_mat("crab_leg_" + tint.to_html(false), "crab", tint.darkened(0.22), tint, tint.darkened(0.55), 0.48)
	var carapace := _add_sphere(root, 0.125, 0.09, Vector3(0, 0.06, 0.0), Vector3(1.24, 0.58, 0.92), mat_shell)
	_add_eyes(root, [Vector3(-0.045, 0.095, 0.088), Vector3(0.045, 0.095, 0.088)], 0.012)
	var claws: Array = []
	for s_side in [-1.0, 1.0]:
		for l_i in range(3):
			var leg := MeshInstance3D.new()
			var lm := CylinderMesh.new(); lm.top_radius = 0.011; lm.bottom_radius = 0.016; lm.height = 0.15; lm.radial_segments = 4
			leg.mesh = lm; leg.material_override = mat_leg
			leg.position = Vector3(s_side * 0.13, 0.042, float(l_i - 1) * 0.055)
			leg.rotation = Vector3(0.0, 0.0, s_side * 1.12)
			root.add_child(leg)
		var cpiv := Node3D.new(); cpiv.position = Vector3(s_side * 0.11, 0.055, 0.11); root.add_child(cpiv)
		_add_sphere(cpiv, 0.042, 0.065, Vector3(0, 0, 0.045), Vector3(0.88, 0.68, 1.38), mat_shell, false)
		claws.append(cpiv)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "scuttle", "wiggle_node": carapace, "legs": claws,
	})

static func spawn_fish(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, tint: Color = Color("#2f5866"), gait_mode: String = "swim_fish", scale_v: float = 1.0) -> void:
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; parent.add_child(root)
	var is_trout := tint.g > tint.b * 0.92 and tint.r > 0.25
	var col_top := tint
	var col_belly := tint.lightened(0.45) if not is_trout else Color("#d2dad6")
	var col_stripe := Color("#d88682") if is_trout else Color("#9fd8ea")
	var mat_f := _species_mat("fish_" + tint.to_html(false), "scales", col_top, col_belly, col_stripe, 0.22, 0.28, true)
	var mat_fin := _species_mat("fin_" + tint.to_html(false), "scales", col_top.darkened(0.1), col_belly, col_stripe, 0.34, 0.12, true)

	var body := _add_sphere(root, 0.062 * scale_v, 0.34 * scale_v, Vector3.ZERO, Vector3(0.68, 1.0, 1.12), mat_f, false)
	body.rotation.x = PI * 0.5
	_add_eyes(root, [Vector3(-0.028 * scale_v, 0.015 * scale_v, 0.12 * scale_v), Vector3(0.028 * scale_v, 0.015 * scale_v, 0.12 * scale_v)], 0.012 * scale_v)

	# Dorsal fin & paired pectoral fins
	var dorsal := MeshInstance3D.new()
	var dm := BoxMesh.new(); dm.size = Vector3(0.012 * scale_v, 0.075 * scale_v, 0.11 * scale_v)
	dorsal.mesh = dm; dorsal.material_override = mat_fin
	dorsal.position = Vector3(0, 0.055 * scale_v, -0.02 * scale_v); dorsal.rotation.x = -0.32
	root.add_child(dorsal)
	for side_f in [-1.0, 1.0]:
		var pf := MeshInstance3D.new()
		var pfm := PlaneMesh.new(); pfm.size = Vector2(0.07 * scale_v, 0.055 * scale_v)
		pf.mesh = pfm; pf.material_override = mat_fin
		pf.position = Vector3(side_f * 0.055 * scale_v, -0.015 * scale_v, 0.04 * scale_v)
		pf.rotation = Vector3(0.1, side_f * 0.55, side_f * -0.25)
		root.add_child(pf)

	var tail_piv := Node3D.new(); tail_piv.position = Vector3(0.0, 0.0, -0.15 * scale_v); root.add_child(tail_piv)
	for f_dir in [-1.0, 1.0]:
		var lobe := MeshInstance3D.new()
		var lm := BoxMesh.new(); lm.size = Vector3(0.014 * scale_v, 0.065 * scale_v, 0.11 * scale_v)
		lobe.mesh = lm; lobe.material_override = mat_fin
		lobe.position = Vector3(0, f_dir * 0.022 * scale_v, -0.055 * scale_v)
		lobe.rotation.x = f_dir * 0.42
		tail_piv.add_child(lobe)

	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": gait_mode, "wiggle_node": tail_piv, "leap_period": 11.5, "leap_height": 0.36 * scale_v,
	})

static func build_bird_node(bird_name: String, body_col: Color, wing_col: Color, scale_v: float = 1.0, cast_shadow: bool = false, beak_col: Color = Color("#e2a238")) -> Dictionary:
	var root := Node3D.new(); root.name = bird_name
	var m_body := _species_mat("bird_b_" + body_col.to_html(false), "feather", body_col, body_col.lightened(0.08), wing_col, 0.66)
	var m_wing := _species_mat("bird_w_" + wing_col.to_html(false), "feather", wing_col.lightened(0.06), body_col, wing_col.darkened(0.45), 0.64, 0.0, true)
	var m_beak := _species_mat("bird_bk_" + beak_col.to_html(false), "horn", beak_col, beak_col.lightened(0.14), beak_col.darkened(0.38), 0.44)

	_add_sphere(root, 0.08 * scale_v, 0.28 * scale_v, Vector3.ZERO, Vector3(0.95, 0.85, 1.35), m_body, cast_shadow).rotation.x = PI * 0.45

	var head := Node3D.new(); head.position = Vector3(0, 0.075 * scale_v, 0.14 * scale_v); root.add_child(head)
	_add_sphere(head, 0.052 * scale_v, 0.10 * scale_v, Vector3.ZERO, Vector3(0.92, 0.92, 1.05), m_body, cast_shadow)
	_add_eyes(head, [Vector3(-0.034 * scale_v, 0.015 * scale_v, 0.036 * scale_v), Vector3(0.034 * scale_v, 0.015 * scale_v, 0.036 * scale_v)], 0.011 * scale_v)
	var beak := MeshInstance3D.new()
	var bkm := CylinderMesh.new(); bkm.top_radius = 0.004 * scale_v; bkm.bottom_radius = 0.018 * scale_v; bkm.height = 0.075 * scale_v; bkm.radial_segments = 4
	beak.mesh = bkm; beak.material_override = m_beak; beak.position = Vector3(0, -0.005 * scale_v, 0.068 * scale_v); beak.rotation.x = PI * 0.5
	head.add_child(beak)

	var tail := Node3D.new(); tail.position = Vector3(0, 0.02 * scale_v, -0.15 * scale_v); root.add_child(tail)
	for tf in [-0.22, 0.0, 0.22]:
		var tm := MeshInstance3D.new()
		var tbm := PlaneMesh.new(); tbm.size = Vector2(0.07 * scale_v, 0.18 * scale_v)
		tm.mesh = tbm; tm.material_override = m_wing; tm.position.z = -0.085 * scale_v; tm.rotation.y = tf
		tail.add_child(tm)

	var lw := Node3D.new(); lw.position = Vector3(-0.042 * scale_v, 0.03 * scale_v, 0.02 * scale_v); root.add_child(lw)
	var lwm := MeshInstance3D.new(); lwm.mesh = _get_wing_mesh(-1.0, scale_v); lwm.material_override = m_wing
	lwm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	lw.add_child(lwm)

	var rw := Node3D.new(); rw.position = Vector3(0.042 * scale_v, 0.03 * scale_v, 0.02 * scale_v); root.add_child(rw)
	var rwm := MeshInstance3D.new(); rwm.mesh = _get_wing_mesh(1.0, scale_v); rwm.material_override = m_wing
	rwm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	rw.add_child(rwm)

	return {"root": root, "lw": lw, "rw": rw, "head": head, "tail": tail}

static func spawn_perched_bird(parent: Node3D, agents: Array[Dictionary], node_name: String, pos: Vector3, yaw: float, body_col: Color, wing_col: Color, scale_v: float, phase: float, beak_col: Color = Color("#e2a238")) -> void:
	var b := build_bird_node(node_name, body_col, wing_col, scale_v, true, beak_col)
	var root: Node3D = b["root"]
	root.position = pos; root.rotation.y = yaw
	parent.add_child(root)
	agents.append({
		"node": root, "gait": "perch", "base_pos": pos, "base_yaw": yaw, "phase": phase,
		"lw": b["lw"], "rw": b["rw"], "head_node": b["head"], "tail_node": b["tail"],
	})

static func spawn_soaring_bird(
	parent: Node3D,
	agents: Array[Dictionary],
	node_name: String,
	center: Vector3,
	radius_x: float,
	radius_z: float,
	period: float,
	phase: float,
	body_col: Color,
	wing_col: Color,
	scale_v: float = 1.25,
	orbit_dir: float = 1.0,
	amp_y: float = 1.4,
	beak_col: Color = Color("#d8a43a")
) -> void:
	var b := build_bird_node(node_name, body_col, wing_col, scale_v, false, beak_col)
	var root: Node3D = b["root"]
	root.position = center + Vector3(cos(phase) * radius_x, 0.0, sin(phase) * radius_z)
	parent.add_child(root)
	agents.append({
		"node": root, "gait": "soar", "center": center, "radius_x": radius_x, "radius_z": radius_z,
		"period": period, "phase": phase, "orbit_dir": orbit_dir, "amp_y": amp_y,
		"lw": b["lw"], "rw": b["rw"], "head_node": b["head"], "tail_node": b["tail"],
	})

static func spawn_highland_ibex(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float, scale_v: float = 1.05) -> void:
	# Anatomically proportioned alpine ibex with mottled mountain coat, muscular chest/haunches, articulated bent legs & 5-segment curved scimitar horns!
	var root := Node3D.new(); root.name = node_name; root.position = waypoints[0]; root.scale = Vector3.ONE * scale_v; parent.add_child(root)
	var m_coat := _species_mat("ibex_alpine_coat", "alpine_fur", Color("#6c5d4e"), Color("#8e7e6c"), Color("#322a23"), 0.86)
	var m_dark := _species_mat("ibex_alpine_dark", "alpine_fur", Color("#3a322b"), Color("#4d4239"), Color("#1e1915"), 0.80)
	var m_horn := _species_mat("ibex_scimitar_horn", "horn", Color("#2d251e"), Color("#56483b"), Color("#191410"), 0.48)
	var m_hoof := _species_mat("ibex_hoof_dark", "horn", Color("#191614"), Color("#2a2521"), Color("#0d0b0a"), 0.56)

	# Sculpted multi-zone body: broad muscular chest, barrel mid-torso, compact haunch & stubby raised tail
	_add_sphere(root, 0.20, 0.36, Vector3(0.0, 0.49, 0.14), Vector3(0.84, 0.96, 1.08), m_coat)
	_add_sphere(root, 0.175, 0.32, Vector3(0.0, 0.48, -0.04), Vector3(0.82, 0.90, 1.18), m_coat)
	_add_sphere(root, 0.185, 0.34, Vector3(0.0, 0.49, -0.22), Vector3(0.84, 0.94, 0.96), m_coat)
	# Dark dorsal shoulder ridge & tail
	_add_sphere(root, 0.085, 0.14, Vector3(0.0, 0.62, 0.14), Vector3(0.65, 0.65, 1.75), m_dark, false)
	var tail := Node3D.new(); tail.position = Vector3(0.0, 0.52, -0.36); root.add_child(tail)
	var tm := MeshInstance3D.new()
	var tcm := CylinderMesh.new(); tcm.top_radius = 0.014; tcm.bottom_radius = 0.030; tcm.height = 0.14; tcm.radial_segments = 5
	tm.mesh = tcm; tm.material_override = m_dark; tm.position = Vector3(0.0, 0.03, -0.04); tm.rotation.x = -0.82
	tail.add_child(tm)

	# Muscular arched neck leading to articulated head
	var neck := MeshInstance3D.new()
	var nm := CylinderMesh.new(); nm.top_radius = 0.082; nm.bottom_radius = 0.135; nm.height = 0.29; nm.radial_segments = 8
	neck.mesh = nm; neck.material_override = m_coat
	neck.position = Vector3(0.0, 0.62, 0.28); neck.rotation.x = 0.54
	root.add_child(neck)

	var head := Node3D.new(); head.position = Vector3(0.0, 0.72, 0.35); root.add_child(head)
	# Cranium + tapered wedge snout + dark nose bridge + beard + angled ears
	_add_sphere(head, 0.092, 0.17, Vector3(0.0, 0.02, 0.04), Vector3(0.86, 0.90, 1.12), m_coat)
	var muzzle := MeshInstance3D.new()
	var mm := CylinderMesh.new(); mm.top_radius = 0.038; mm.bottom_radius = 0.068; mm.height = 0.15; mm.radial_segments = 7
	muzzle.mesh = mm; muzzle.material_override = m_dark
	muzzle.position = Vector3(0.0, -0.02, 0.15); muzzle.rotation.x = PI * 0.56
	head.add_child(muzzle)
	var beard := MeshInstance3D.new()
	var bdm := CylinderMesh.new(); bdm.top_radius = 0.008; bdm.bottom_radius = 0.032; bdm.height = 0.13; bdm.radial_segments = 5
	beard.mesh = bdm; beard.material_override = m_dark
	beard.position = Vector3(0.0, -0.10, 0.12); beard.rotation.x = -0.22
	head.add_child(beard)
	_add_eyes(head, [Vector3(-0.064, 0.045, 0.085), Vector3(0.064, 0.045, 0.085)], 0.015)

	for sgn: float in [-1.0, 1.0]:
		var ear := MeshInstance3D.new()
		var em := CylinderMesh.new(); em.top_radius = 0.006; em.bottom_radius = 0.022; em.height = 0.11; em.radial_segments = 5
		ear.mesh = em; ear.material_override = m_coat
		ear.position = Vector3(sgn * 0.082, 0.072, -0.01); ear.rotation = Vector3(-0.28, 0.0, -sgn * 0.92)
		head.add_child(ear)

		# True 5-segment sweeping curved alpine ibex scimitar horn with transverse ridges!
		var h_pts := [
			Vector3(sgn * 0.032, 0.095, 0.025),
			Vector3(sgn * 0.065, 0.215, -0.035),
			Vector3(sgn * 0.110, 0.305, -0.155),
			Vector3(sgn * 0.155, 0.335, -0.305),
			Vector3(sgn * 0.195, 0.300, -0.445),
			Vector3(sgn * 0.218, 0.225, -0.535),
		]
		var h_rads := [0.036, 0.031, 0.026, 0.021, 0.015, 0.006]
		for hi in range(h_pts.size() - 1):
			var ha: Vector3 = h_pts[hi]
			var hb: Vector3 = h_pts[hi + 1]
			var hd := hb - ha
			var hlen := hd.length()
			var hy := hd / maxf(0.001, hlen)
			var href := Vector3.UP if absf(hy.y) < 0.92 else Vector3.FORWARD
			var hx := href.cross(hy).normalized()
			var hz := hx.cross(hy).normalized()
			var hseg := MeshInstance3D.new()
			var hcm := CylinderMesh.new()
			hcm.bottom_radius = h_rads[hi]; hcm.top_radius = h_rads[hi + 1]; hcm.height = hlen * 1.06; hcm.radial_segments = 7
			hseg.mesh = hcm; hseg.material_override = m_horn
			hseg.transform = Transform3D(Basis(hx, hy, hz), (ha + hb) * 0.5)
			head.add_child(hseg)

	# Articulated two-tone mountain legs (muscular upper haunch/foreleg + slender dark lower shin + cloven hoof!)
	var legs: Array = []
	var leg_specs := [
		Vector3(-0.105, 0.38, 0.19), Vector3(0.105, 0.38, 0.19),
		Vector3(-0.105, 0.38, -0.23), Vector3(0.105, 0.38, -0.23),
	]
	for li in range(leg_specs.size()):
		var lp: Vector3 = leg_specs[li]
		var piv := Node3D.new(); piv.position = lp; root.add_child(piv)
		var is_rear := li >= 2
		var up := MeshInstance3D.new()
		var um := CylinderMesh.new(); um.top_radius = 0.056 if is_rear else 0.048; um.bottom_radius = 0.030; um.height = 0.21; um.radial_segments = 6
		up.mesh = um; up.material_override = m_coat
		up.position = Vector3(0.0, -0.10, -0.025 if is_rear else 0.010)
		up.rotation.x = 0.24 if is_rear else -0.08
		piv.add_child(up)
		var lo := MeshInstance3D.new()
		var lm := CylinderMesh.new(); lm.top_radius = 0.028; lm.bottom_radius = 0.022; lm.height = 0.20; lm.radial_segments = 6
		lo.mesh = lm; lo.material_override = m_dark
		lo.position = Vector3(0.0, -0.28, -0.035 if is_rear else 0.015)
		lo.rotation.x = -0.12 if is_rear else 0.04
		piv.add_child(lo)
		var hf := MeshInstance3D.new()
		var hfm := CylinderMesh.new(); hfm.top_radius = 0.025; hfm.bottom_radius = 0.030; hfm.height = 0.042; hfm.radial_segments = 6
		hf.mesh = hfm; hf.material_override = m_hoof
		hf.position = Vector3(0.0, -0.37, -0.022 if is_rear else 0.022)
		piv.add_child(hf)
		legs.append(piv)

	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "trot", "legs": legs, "head_node": head, "tail_node": tail,
	})

static func spawn_bat(parent: Node3D, agents: Array[Dictionary], node_name: String, waypoints: Array, period: float, phase: float) -> void:
	var b := build_bird_node(node_name, Color("#3a2f2b"), Color("#29211f"), 0.85, false)
	var root: Node3D = b["root"]
	root.position = waypoints[0]; parent.add_child(root)
	agents.append({
		"node": root, "waypoints": waypoints, "period": period, "speed": 1.0, "phase": phase,
		"gait": "bat", "time_gate": "nocturnal", "lw": b["lw"], "rw": b["rw"],
	})

static func spawn_butterflies(parent: Node3D, agents: Array[Dictionary], prefix: String, anchor: Vector3, count: int, seed_v: float) -> void:
	var cols: Array[Color] = [Color("#f0c850"), Color("#7abbe8"), Color("#e88a5a"), Color("#d69be6")]
	for i in range(count):
		var root := Node3D.new(); root.name = "%s_%d" % [prefix, i]
		var wcol: Color = cols[(i + int(round(seed_v))) % cols.size()]
		var mat := _species_mat("bfly_" + wcol.to_html(false), "butterfly", wcol, wcol.lightened(0.25), Color("#261d19"), 0.55, 0.0, true)
		var wm := PlaneMesh.new(); wm.size = Vector2(0.095, 0.12)
		var lw := Node3D.new(); root.add_child(lw)
		var lwm := MeshInstance3D.new(); lwm.mesh = wm; lwm.material_override = mat; lwm.position.x = -0.048; lw.add_child(lwm)
		var rw := Node3D.new(); root.add_child(rw)
		var rwm := MeshInstance3D.new(); rwm.mesh = wm; rwm.material_override = mat; rwm.position.x = 0.048; rw.add_child(rwm)
		parent.add_child(root)
		agents.append({
			"node": root, "gait": "butterfly", "time_gate": "day_clear",
			"base_pos": anchor + Vector3(cos(seed_v + float(i) * 2.1) * 0.4, 0.25, sin(seed_v + float(i) * 2.1) * 0.4),
			"phase": seed_v + float(i) * 1.37, "lw": lw, "rw": rw,
		})

static func spawn_seastar(parent: Node3D, pos: Vector3, tint: Color, seed_v: float) -> void:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sm := SphereMesh.new(); sm.radius = 0.045; sm.height = 0.025; sm.radial_segments = 6; sm.rings = 3
	for i in range(5):
		var a := seed_v + float(i) * (TAU / 5.0)
		var b := Basis.from_euler(Vector3(0.0, -a, 0.0)).scaled(Vector3(1.65, 0.6, 0.42))
		st.append_from(sm, 0, Transform3D(b, Vector3(cos(a) * 0.055, 0.012, sin(a) * 0.055)))
	st.generate_normals()
	var m := MeshInstance3D.new(); m.mesh = st.commit()
	m.material_override = _species_mat("star_" + tint.to_html(false), "crab", tint, tint.lightened(0.32), tint.darkened(0.35), 0.44)
	m.position = pos; m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)
