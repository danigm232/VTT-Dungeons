class_name CampSceneController
extends Node3D

## Unified runtime controller for all 5 migrated campamentos in Godot 4 Forward+:
## 01 · Habitaciones A1, 02 · Bosque camino a Pleamar, 03 · Playa del pecio,
## 04 · Acantilados del Observatorio, 05 · Refugio costero de Pleamar.

const Structure = preload("res://scripts/camp_structure.gd")
const MatKit = preload("res://scripts/camp_material_kit.gd")
const FxScript = preload("res://scripts/camp_atmosphere_fx.gd")
const AudioScript = preload("res://scripts/camp_audio_manager.gd")
const A1BuilderScript = preload("res://scripts/camp_a1_builder.gd")
const OutdoorBuilderScript = preload("res://scripts/camp_outdoor_builder.gd")
const RoleUiScript = preload("res://scripts/vtt_role_ui.gd")

@export var camp_scene_id: String = ""

var scene_def: Dictionary = {}
var party_tokens: Array[Node3D] = []
var active_party_idx: int = 0

var fx: CampAtmosphereFx
var audio_mgr: CampAudioManager
var role_ui: Node
var grid_overlay: TacticalGridOverlay
var camera: TacticalCamera

var a1_builder: CampA1Builder
var outdoor_builder: CampOutdoorBuilder
var _cutaways: Array[Dictionary] = []
var _inspect_cutaway_id: String = ""

var fire_fuel: float = 0.82
var rest_phase: String = "dusk"
var nearest_point: Dictionary = {}
var _last_prompt: String = ""
var defer_async_build: bool = false
var _camp_built: bool = false

signal party_member_changed(idx: int, token: Node3D)

func _ready() -> void:
	if defer_async_build:
		return
	_build_sync()

func _begin_camp_setup() -> Dictionary:
	MatKit.reset_registry()
	var resolved_id := _resolve_scene_id()
	camp_scene_id = resolved_id
	Structure.set_active_scene_id(resolved_id)
	scene_def = Structure.get_scene_def(resolved_id)
	if scene_def.is_empty():
		push_error("CampSceneController: unknown scene id " + resolved_id)
		return {}

	rest_phase = "day" if resolved_id == "camp-a1-rooms" else "dusk"
	set_meta("map_bounds_xz", Structure.get_map_bounds(scene_def))
	set_meta("camp_scene_id", resolved_id)

	var env_node := get_node_or_null("WorldEnvironment") as WorldEnvironment
	var sun_node := get_node_or_null("DirectionalLight3D") as DirectionalLight3D
	camera = get_node_or_null("TacticalCamera") as TacticalCamera
	grid_overlay = get_node_or_null("TacticalGridOverlay") as TacticalGridOverlay

	fx = FxScript.new()
	fx.name = "CampAtmosphereFx"
	add_child(fx)
	fx.setup(env_node, sun_node, Structure.get_map_center(scene_def), rest_phase)
	var prof := str(scene_def.get("profile", "forest"))
	var is_a1 := resolved_id == "camp-a1-rooms"
	var bird_tint := Color("#eef3f8") if (is_a1 or prof in ["wreck-beach", "coastal-refuge"]) else (Color("#1d232c") if prof == "cliff-observatory" else Color("#4a5360"))
	var insect_cnt := 6 if is_a1 else (14 if prof == "forest" else (4 if prof in ["wreck-beach", "cliff-observatory"] else 8))
	var owls_cnt := 0 if prof == "coastal-refuge" else 1
	var bird_offset := Vector3(0.0, 2.2, 0.0)
	var bird_orbit_scale := 1.0
	if is_a1:
		bird_offset = Vector3(0.0, 9.5, 29.0)
		bird_orbit_scale = 0.52
	elif prof == "coastal-refuge":
		bird_offset = Vector3(0.0, 4.8, 10.5)
	elif prof == "cliff-observatory":
		bird_offset = Vector3(0.0, 4.2, 2.5)
	var bird_center := Structure.get_map_center(scene_def) + bird_offset
	fx.build_camp_life(self, bird_center, 4, insect_cnt, bird_tint, owls_cnt, bird_orbit_scale)

	audio_mgr = AudioScript.new()
	audio_mgr.name = "CampAudioManager"
	add_child(audio_mgr)
	return {"resolved_id": resolved_id, "prof": prof}

func _finish_camp_setup() -> void:
	if grid_overlay:
		grid_overlay.build_for_scene(scene_def)
	_place_party_tokens()
	if outdoor_builder and outdoor_builder.has_method("set_party_tokens"):
		outdoor_builder.set_party_tokens(party_tokens)
	if outdoor_builder and outdoor_builder.has_method("sync_wildlife"):
		outdoor_builder.sync_wildlife()
	if camera:
		camera.configure_for_scene(scene_def)
		if not party_tokens.is_empty():
			camera.target = party_tokens[active_party_idx]
			camera.set_follow_mode("follow")
	role_ui = RoleUiScript.new()
	role_ui.name = "VttRoleUi"
	add_child(role_ui)
	var mt := get_node_or_null("/root/MapTransition")
	if mt and str(mt.get("pending_role")) != "" and role_ui.has_method("set_role"):
		role_ui.set_role(str(mt.get("pending_role")))
		mt.set("pending_role", "")
	audio_mgr.apply_scene_profile(scene_def)
	_camp_built = true

func _build_sync() -> void:
	if _camp_built:
		return
	var ctx := _begin_camp_setup()
	if ctx.is_empty():
		return
	var resolved_id := str(ctx["resolved_id"])
	var prof := str(ctx["prof"])
	if resolved_id == "camp-a1-rooms":
		a1_builder = A1BuilderScript.new()
		a1_builder.name = "CampA1Builder"
		add_child(a1_builder)
		var res: Dictionary = a1_builder.build(scene_def, fx)
		_cutaways = res.get("cutaways", [])
	else:
		outdoor_builder = OutdoorBuilderScript.new()
		outdoor_builder.name = "CampOutdoorBuilder"
		add_child(outdoor_builder)
		var res: Dictionary = outdoor_builder.build(scene_def, fx)
		_cutaways = res.get("cutaways", [])
		fx.set_campfire_auto_by_phase(true)
		var cols_m := float(scene_def.get("cols", 25)) * Structure.TILE_METERS
		var rows_m := float(scene_def.get("rows", 22)) * Structure.TILE_METERS
		fx.build_biome_ambience(prof, Vector2(cols_m, rows_m))
		fx.apply_lighting_phase(rest_phase)
	_finish_camp_setup()

func build_camp_async(tree: SceneTree, progress_cb: Callable = Callable()) -> void:
	if _camp_built:
		return
	var ctx := _begin_camp_setup()
	if ctx.is_empty():
		return
	if progress_cb.is_valid(): progress_cb.call(0.20)
	await tree.process_frame
	var resolved_id := str(ctx["resolved_id"])
	var prof := str(ctx["prof"])
	if resolved_id == "camp-a1-rooms":
		a1_builder = A1BuilderScript.new()
		a1_builder.name = "CampA1Builder"
		add_child(a1_builder)
		var res: Dictionary = a1_builder.build(scene_def, fx)
		_cutaways = res.get("cutaways", [])
	else:
		outdoor_builder = OutdoorBuilderScript.new()
		outdoor_builder.name = "CampOutdoorBuilder"
		add_child(outdoor_builder)
		var res: Dictionary = await outdoor_builder.build_async(scene_def, fx, tree)
		_cutaways = res.get("cutaways", [])
		if progress_cb.is_valid(): progress_cb.call(0.65)
		await tree.process_frame
		fx.set_campfire_auto_by_phase(true)
		var cols_m := float(scene_def.get("cols", 25)) * Structure.TILE_METERS
		var rows_m := float(scene_def.get("rows", 22)) * Structure.TILE_METERS
		fx.build_biome_ambience(prof, Vector2(cols_m, rows_m))
		fx.apply_lighting_phase(rest_phase)
	if progress_cb.is_valid(): progress_cb.call(0.85)
	await tree.process_frame
	_finish_camp_setup()
	if progress_cb.is_valid(): progress_cb.call(1.0)

func _resolve_scene_id() -> String:
	if camp_scene_id != "" and not Structure.get_scene_def(camp_scene_id).is_empty():
		return camp_scene_id
	if scene_file_path != "":
		var from_path := Structure.scene_id_from_path(scene_file_path)
		if not Structure.get_scene_def(from_path).is_empty() and Structure.scene_path_for_id(from_path) == scene_file_path:
			return from_path
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--camp="):
			var v := arg.substr(7).strip_edges()
			if not Structure.get_scene_def(v).is_empty():
				return v
	return Structure.get_active_scene_id()

func _place_party_tokens() -> void:
	party_tokens.clear()
	var spawns: Array = scene_def.get("spawns", [])
	var tile := Structure.TILE_METERS
	var node_names := ["PlayerToken", "RogueToken", "WizardToken"]
	for i in range(node_names.size()):
		var tok := get_node_or_null(node_names[i]) as Node3D
		if not tok:
			continue
		var s_cell: Dictionary = spawns[i % maxi(1, spawns.size())] if not spawns.is_empty() else {"col": 12 + i * 2, "row": 14}
		tok.global_position = Vector3((float(s_cell["col"]) + 0.5) * tile, 0.05, (float(s_cell["row"]) + 0.5) * tile)
		if "camera" in tok:
			tok.camera = camera
		if tok.has_signal("rest_released"):
			tok.rest_released.connect(_release_bed)
		party_tokens.append(tok)
	select_party_member(0)

func select_party_member(idx: int) -> void:
	if party_tokens.is_empty():
		return
	active_party_idx = clampi(idx, 0, party_tokens.size() - 1)
	for i in range(party_tokens.size()):
		var tok := party_tokens[i]
		if tok.has_method("set_active"):
			tok.set_active(i == active_party_idx)
	if camera and is_instance_valid(party_tokens[active_party_idx]):
		camera.set_target_character(party_tokens[active_party_idx])
	_sync_party_ambient_lights()
	emit_signal("party_member_changed", active_party_idx, party_tokens[active_party_idx])

func _sync_party_ambient_lights() -> void:
	if camp_scene_id == "camp-a1-rooms":
		return
	var is_daylight := rest_phase in ["day", "arrival"]
	for i in range(party_tokens.size()):
		var tok := party_tokens[i]
		if not is_instance_valid(tok) or not ("carried_light" in tok):
			continue
		var cl: OmniLight3D = tok.carried_light
		if not is_instance_valid(cl):
			continue
		if bool(tok.get("is_torch_lit")):
			cl.light_energy = 2.4 if i == active_party_idx else 1.2
		elif is_daylight:
			cl.light_energy = 0.0
		else:
			cl.light_energy = 0.36 if i == active_party_idx else 0.0

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed:
		var kev := event as InputEventKey
		if kev.keycode == KEY_TAB:
			select_party_member((active_party_idx + 1) % maxi(1, party_tokens.size()))
			get_viewport().set_input_as_handled()
		elif kev.keycode == KEY_E:
			# Note: Q/E orbit camera in tactical view; Space/F interact or click HUD when near point!
			pass
		elif kev.keycode == KEY_F5:
			trigger_nearest_interaction()
			get_viewport().set_input_as_handled()

func _process(delta: float) -> void:
	_update_cutaways()
	_update_nearest_interaction()
	_update_fire_fuel(delta)

func _update_cutaways() -> void:
	var tok: Node3D = party_tokens[active_party_idx] if active_party_idx < party_tokens.size() else null
	var p2 := Vector2(tok.global_position.x, tok.global_position.z) if is_instance_valid(tok) else Vector2(-999, -999)
	for cw in _cutaways:
		var node: Node3D = cw.get("node")
		if not is_instance_valid(node):
			continue
		var rect: Rect2 = cw["rect"]
		var cid := str(cw.get("id", ""))
		var inside := rect.has_point(p2) or (_inspect_cutaway_id != "" and cid == _inspect_cutaway_id)
		node.visible = not inside

func set_inspect_cutaway(zone_id: String) -> void:
	_inspect_cutaway_id = zone_id
	_update_cutaways()

func _update_nearest_interaction() -> void:
	nearest_point = {}
	var tok: Node3D = party_tokens[active_party_idx] if active_party_idx < party_tokens.size() else null
	if not is_instance_valid(tok):
		return
	var best_d := 2.45
	var best_object_d := INF
	var resting_id := str(tok.get("resting_on"))
	for pt in scene_def.get("interactionPoints", []):
		if not resting_id.is_empty():
			if pt.get("id") == resting_id:
				nearest_point = pt
				break
			continue
		var p_world := Structure.tile_to_world(int(pt["objectCol"]), int(pt["objectRow"]), 0.0)
		var p_stand := Structure.tile_to_world(int(pt["col"]), int(pt["row"]), 0.0)
		var object_d := tok.global_position.distance_to(p_world)
		var d := minf(object_d, tok.global_position.distance_to(p_stand))
		# Several outdoor props share an approach cell. Prefer the prop
		# under the character when two candidates have the same reach.
		if d < best_d or (is_equal_approx(d, best_d) and object_d < best_object_d):
			best_d = d
			best_object_d = object_d
			nearest_point = pt

	var prompt := ""
	if not nearest_point.is_empty():
		var verb := _default_verb_for_kind(str(nearest_point["kind"])) if resting_id.is_empty() else "Levantarse"
		prompt = "%s · %s" % [str(nearest_point["label"]), verb]
	if prompt != _last_prompt:
		_last_prompt = prompt
		if role_ui and role_ui.player_hud:
			role_ui.player_hud.set_interaction_prompt(prompt, prompt != "", role_ui.trigger_camp_interact)

func _default_verb_for_kind(kind: String) -> String:
	var is_a1 := camp_scene_id == "camp-a1-rooms"
	match kind:
		"fire": return "Avivar / Calentar"
		"chest": return "Abrir / Cerrar baúl" if is_a1 else "Abrir / Cerrar mochila"
		"seat": return "Sentarse"
		"bed": return "Tumbarse"
		"tent": return "Refugiarse / Tienda" if is_a1 else "Abrigo bajo la lona"
		"personal": return "Revisar equipo"
		"guard": return "Hacer guardia"
		_: return "Examinar"

func _update_fire_fuel(delta: float) -> void:
	if fx and not fx.campfire_lit:
		return
	var drain := 0.0020
	if fx:
		# Coastal refuge (cave shelter) shields embers against outdoor rain/storm
		var shelter_mult := 0.25 if camp_scene_id == "camp-coastal-refuge" else (0.55 if camp_scene_id == "camp-forest-pleamar" else 1.0)
		if fx.current_weather == "rain":
			drain = 0.0052 * shelter_mult
		elif fx.current_weather == "storm":
			drain = 0.0092 * shelter_mult
	fire_fuel = clampf(fire_fuel - drain * delta, 0.18, 1.0)
	if fx:
		fx.set_campfire_fuel(fire_fuel)

func trigger_nearest_interaction(activity_id: String = "") -> void:
	if nearest_point.is_empty():
		if role_ui and role_ui.has_method("notify_mesa"):
			role_ui.notify_mesa("Acércate a la hoguera, petate, mochila o asiento para interactuar.")
		return
	var act := activity_id
	if act == "":
		match str(nearest_point.get("kind", "")):
			"fire": act = "warm"
			"chest": act = "chest-toggle"
			"seat": act = "sit"
			"bed": act = "rest"
			"guard": act = "guard"
			"personal": act = "study"
			_: act = "inspect"
	perform_camp_activity(act, nearest_point)

func perform_camp_activity(activity_id: String, pt: Dictionary = {}) -> void:
	var tok: Node3D = party_tokens[active_party_idx] if active_party_idx < party_tokens.size() else null
	var msg := ""
	var point_info := pt if not pt.is_empty() else nearest_point
	var pid := str(point_info.get("id", ""))
	if tok and not bool(tok.get("is_sitting")) and point_info.has_all(["objectCol", "objectRow"]) and tok.has_method("face_world_direction"):
		var obj_w := Structure.tile_to_world(int(point_info["objectCol"]), int(point_info["objectRow"]), 0.0)
		tok.face_world_direction(obj_w - tok.global_position)

	match activity_id:
		"fire-toggle":
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			var nxt := not (fx.campfire_lit if fx else false)
			if fx: fx.set_campfire_lit(nxt, true)
			msg = "Enciendes la hoguera con pedernal y yesca." if nxt else "Apagas las brasas y cubres la hoguera con tierra y ceniza."
		"tend-fire":
			fire_fuel = clampf(fire_fuel + 0.35, 0.25, 1.0)
			if fx:
				fx.set_campfire_fuel(fire_fuel)
				if not fx.campfire_lit:
					fx.set_campfire_lit(true, true)
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			msg = "Avivas la hoguera con leña seca (%d%% de brasa)." % roundi(fire_fuel * 100.0)
		"warm", "cook":
			if fx and not fx.campfire_lit:
				fx.set_campfire_lit(true, true)
			if tok and tok.has_method("set_stance"): tok.set_stance("sit")
			msg = "Te sientas junto a las brasas para %s." % ("calentarte" if activity_id == "warm" else "preparar rancho caliente")
		"prepare-bed":
			if _bed_is_occupied(pid):
				role_ui.notify_mesa("El lecho está ocupado.")
				return
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			if outdoor_builder and pid != "" and outdoor_builder.bedrolls.has(pid):
				var cur := str(outdoor_builder.bedrolls[pid].get("state", "prepared"))
				var nxt := "rolled" if cur != "rolled" else "prepared"
				outdoor_builder.set_bedroll_state(pid, nxt)
				msg = "%s: petate %s." % [str(point_info.get("label", "Petate")), "enrollado para marcha" if nxt == "rolled" else "extendido y listo"]
			else:
				msg = "Acomodas la manta y el petate."
		"rest":
			msg = _use_bed(tok, pid)
		"sit":
			var was_sitting := bool(tok.get("is_sitting")) if tok else false
			if tok and not was_sitting:
				var seats: Dictionary = outdoor_builder.seat_anchors if outdoor_builder else a1_builder.seat_anchors
				if seats.has(pid):
					var s_info: Dictionary = seats[pid]
					var slots: Array = s_info.get("slots_world", [])
					var slot_pos := _available_seat_slot(slots, tok)
					if slot_pos == Vector3.INF:
						if role_ui and role_ui.has_method("notify_mesa"):
							role_ui.notify_mesa("No hay plazas libres en este asiento.")
						return
					var heading: Vector3 = s_info.world_forward
					var feet := _seat_foot_contact(slot_pos, heading, float(s_info.front_radius), s_info.stand_pos)
					tok.attach_to_seat(slot_pos, heading, feet)
			if tok and tok.has_method("set_stance"): tok.set_stance("sit")
			msg = "Te levantas." if was_sitting else "Descansas en %s." % str(point_info.get("label", "el campamento"))
		"chest-toggle":
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			if outdoor_builder and pid != "" and outdoor_builder.has_method("toggle_chest"):
				var opened := outdoor_builder.toggle_chest(pid)
				var noun := "Baúl" if camp_scene_id == "camp-a1-rooms" else "Mochila"
				msg = "%s %s: %s." % [noun, "abierta" if (opened and noun == "Mochila") else ("abierto" if opened else ("cerrada" if noun == "Mochila" else "cerrado")), str(point_info.get("description", ""))]
			else:
				msg = "Revisas el equipo guardado."
		"shelter":
			if tok and outdoor_builder and outdoor_builder.shelter_anchors.has(pid):
				var sh: Dictionary = outdoor_builder.shelter_anchors[pid]
				var sc: Vector3 = sh.get("center", tok.global_position)
				var off := Vector3(float(active_party_idx - 1) * 0.85, 0.05, 0.25)
				tok.global_position = Vector3(sc.x + off.x, 0.05, sc.z + off.z)
				if tok.has_method("set_stance"): tok.set_stance("sit")
				msg = "Te refugias bajo la lona (capacidad para %d aventureros)." % int(sh.get("capacity", 2))
			else:
				if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
				msg = "Buscas abrigo en el refugio natural."
		"guard":
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			msg = "Asumes el turno de guardia y vigilas los accesos."
		"study", "pray", "tools":
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			msg = str(point_info.get("description", "Dedicas unos minutos a tu equipo personal."))
		_:
			if tok and tok.has_method("play_action_animation"): tok.play_action_animation("interact")
			msg = str(point_info.get("description", "Observas el campamento con atención."))

	if role_ui and role_ui.has_method("notify_mesa"):
		role_ui.notify_mesa(msg)

func _bed_is_occupied(id: String) -> bool:
	return not id.is_empty() and party_tokens.any(func(member: Node3D) -> bool:
		return member.get("resting_on") == id)

func _release_bed(id: String) -> void:
	if is_instance_valid(outdoor_builder) and outdoor_builder.bedrolls.has(id):
		outdoor_builder.set_bedroll_state(id, "prepared")

func _use_bed(actor: Node3D, id: String) -> String:
	if not actor:
		return ""
	if not str(actor.get("resting_on")).is_empty():
		actor.stand_from_bed()
		return "Te levantas."
	var beds: Dictionary = outdoor_builder.bedrolls if outdoor_builder else a1_builder.beds
	if not beds.has(id):
		if id.ends_with("-hammocks"):
			var was_sitting := bool(actor.get("is_sitting"))
			actor.set_stance("sit")
			return "Te levantas." if was_sitting else "Descansas en las hamacas."
		return "Acércate a una cama o un petate."
	if _bed_is_occupied(id):
		return "El lecho está ocupado."
	var bed: Dictionary = beds[id].rest
	var body: Vector2 = actor.rest_footprint()
	if body == Vector2.ZERO:
		return "La postura de descanso no está disponible para este personaje."
	if body.x > float(bed.available_width) or body.y > float(bed.available_length):
		return "Este lecho es demasiado pequeño para el personaje."
	actor.attach_to_bed(id, bed)
	if outdoor_builder:
		outdoor_builder.set_bedroll_state(id, "occupied")
	return "Te tumbas."

func _available_seat_slot(slots: Array, actor: Node3D) -> Vector3:
	for offset in range(slots.size()):
		var slot: Vector3 = slots[(active_party_idx + offset) % slots.size()]
		var occupied := party_tokens.any(func(member: Node3D) -> bool:
			return member != actor and member.get_meta("prop_seat_pos", Vector3.INF) == slot)
		if not occupied:
			return slot
	return Vector3.INF

func _seat_foot_contact(slot: Vector3, heading: Vector3, front_radius: float, stand: Vector3) -> Vector3:
	var feet := slot + heading * maxf(0.25, front_radius + 0.045)
	var excluded: Array[RID] = []
	for member in party_tokens:
		if member is CollisionObject3D:
			excluded.append(member.get_rid())
	var query := PhysicsRayQueryParameters3D.create(feet + Vector3.UP * 0.07, feet - Vector3.UP, 0xFFFFFFFF, excluded)
	var ground := get_world_3d().direct_space_state.intersect_ray(query)
	feet.y = ground.position.y + 0.006 if not ground.is_empty() and ground.normal.y > 0.6 else stand.y - 0.044
	return feet

func set_env_time(phase_id: String) -> void:
	rest_phase = phase_id
	if fx:
		fx.fire_manual_override = ""
		fx.apply_lighting_phase(phase_id)
	if outdoor_builder and outdoor_builder.has_method("sync_wildlife"):
		outdoor_builder.sync_wildlife()
	_sync_party_ambient_lights()

func set_env_weather(weather_id: String) -> void:
	if fx:
		fx.apply_weather(weather_id)
	if outdoor_builder and outdoor_builder.has_method("sync_wildlife"):
		outdoor_builder.sync_wildlife()
	if audio_mgr:
		if weather_id == "storm":
			audio_mgr.play_sfx("camp-loop-thunder-v1", 0.5)

func set_env_reduced_effects(v: bool) -> void:
	if fx:
		fx.reduced_motion = v
	if outdoor_builder:
		outdoor_builder._reduced_motion = v

func toggle_chest_by_id(chest_id: String) -> bool:
	if outdoor_builder and outdoor_builder.has_method("toggle_chest"):
		return outdoor_builder.toggle_chest(chest_id)
	return false

func get_chest_ids() -> Array[String]:
	var out: Array[String] = []
	if outdoor_builder:
		for k in outdoor_builder.chest_lids.keys():
			out.append(str(k))
	return out

func switch_camp_scene(next_camp_id: String) -> void:
	var target_path := Structure.scene_path_for_id(next_camp_id)
	if not ResourceLoader.exists(target_path):
		push_warning("Missing target camp scene: " + target_path)
		return
	var mt := get_node_or_null("/root/MapTransition")
	if mt and role_ui and "current_role" in role_ui:
		mt.set("pending_role", str(role_ui.current_role))
	Structure.set_active_scene_id(next_camp_id)
	var sl := get_node_or_null("/root/SkillLoading")
	var sdef := Structure.get_scene_def(next_camp_id)
	var dest_label := str(sdef.get("title", next_camp_id))
	if sl and sl.has_method("load_map"):
		sl.load_map(target_path, dest_label, "camp_switch")
	else:
		get_tree().change_scene_to_file(target_path)
