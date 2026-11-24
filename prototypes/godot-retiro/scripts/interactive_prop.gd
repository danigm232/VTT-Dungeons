extends Node3D

## Elemento interactivo del mobiliario y entorno de El Retiro del Dragón:
## sillas, bancos, camas, hamacas, pozo, hogueras/braseros/fogones, baúles,
## cabrestante, altares, banco de artesanía, leñera, regadera, tablón, mesas y estanterías.

@export var prop_kind: String = "chair" # chair | bench | bed | hammock | well | fire | brazier | stove | chest | winch | shrine | workbench | firewood | watering | herbrack | weaponrack | noticeboard | refreshments | bookshelf | table
@export var display_name: String = "Asiento"
@export var interaction_hint: String = "[T] Sentarse"
@export var interact_radius: float = 2.45
@export var seat_offset: Vector3 = Vector3.ZERO
@export var seat_facing: String = "s"
@export var toast_text: String = ""
@export var seat_slots_local: Array[Vector3] = []
@export var seat_front_radius: float = 0.28
@export var seat_face_approach: bool = false
@export var seat_heading_local: Vector3 = Vector3(0.0, 0.0, 1.0)
@export var linked_fire_node_name: String = ""

var is_player_nearby: bool = false
var is_chest_open: bool = false
var fire_manual_override: bool = false
var fire_lit: bool = false
var fire_fuel: float = 0.85

var _fire_sync_accum: float = 0.0
var _check_accum: float = 0.0
var _lore_idx: int = 0
var _well_anim_active: bool = false
var _well_anim_time: float = 0.0
var _well_splash_played: bool = false
var _chest_blend: float = 0.0
var _gear_spin_timer: float = 0.0
var _shrine_glow_timer: float = 0.0
var _feedback_timer: float = 0.0
var _feedback_lbl: Label3D = null
var _audio_player: AudioStreamPlayer3D = null
var _vfx_particles: GPUParticles3D = null
var _fire_ember_particles: GPUParticles3D = null

const _BOOK_NOTES: Array[String] = [
	"Tratado de Teología: «Bahamut camina entre los mortales como un anciano amable rodeado de siete canarios dorados.»",
	"Crónica del Reposo del Dragón: «Astalagan, dragón de bronce, y Sharruth libraron aquí su último duelo; la paz del santuario aún guarda su eco.»",
	"Anales del Observatorio: «Las torres orientales miden las mareas y los astros; hace años nadie regresa sin la llave de piedra lunar.»",
	"Registro marítimo del claustro: «El Rosa de los Vientos encalló en los arrecifes del norte; la tumba de Brastos reposa en el acantilado noroeste.»"
]

const _NOTICE_NOTES: Array[String] = [
	"Aviso del Claustro: «Marea baja al amanecer para cruzar hacia las Cuevas de Pleamar; extremad la prudencia con la creciente.»",
	"Nota de Myla: «Vendo cualquier equipo corriente de aventurero en Celda 4. (Laylee: el fuego alquímico NO se toca).»",
	"Recado de Tarak: «Quien recoja hierbas junto a la plaza, que respete las raíces; necesito hongos sombrero de corazón de Pleamar.»",
	"Mensaje de Runara: «Comemos tres veces al día en el refectorio A3; todos los viajeros pacíficos tienen sitio a la mesa.»"
]

const _HERB_NOTES: Array[String] = [
	"Estantería de Tarak: dos pociones de curación recién filtradas con hongos sombrero de corazón y tinturas de salvia marina.",
	"Cuaderno botánico: «Si los micónidos comparten colmenilla rubí, podría destilar incluso un elixir de salud.»",
	"Mortero de piedra con hierbas recién machacadas: aroma a romero, tomillo y miel de acantilado."
]

const _WEAPON_NOTES: Array[String] = [
	"Escudo abollado de los Lobos Celestes guardado como recuerdo, junto a mazo, cincel y plomada de albañil: Varnoth ya no porta armas a la vista.",
	"Planos de mampostería para reparar el pórtico de Bahamut descansan ordenados junto a las herramientas de piedra."
]

const _WORKBENCH_NOTES: Array[String] = [
	"Alambique de vidrio, engranajes de bronce y notas arcanas de Myla: combina alquimia, ingeniería y magia en cada prototipo.",
	"Bocetos de prótesis alares y reparaciones para sus alas dañadas por estirges reposan junto al banco de trabajo."
]

const _MYLA_SHOP_CATALOG: Array[String] = [
	"Tienda de Myla (equipo del reglamento): Cuerda de cáñamo 15 m (1 po) · Antorchas ×10 (1 pp) · Farol con capucha (5 po) · Palanca (2 po).",
	"Tienda de Myla (suministros): Botiquín (5 po) · Raciones de viaje (5 pp/día) · Garfio (2 po) · Juego de herramientas (5–50 po).",
	"Tienda de Myla (alquimia): Ácido (25 po) · Fuego de alquimista (50 po — «Con permiso de Myla, prohibido a Laylee») · Aceite (1 pp)."
]

func _ready() -> void:
	add_to_group("interactive_props")
	if prop_kind in ["fire", "brazier", "stove"]:
		var layout := _get_layout_builder()
		var tod := str(layout.call("get_time_of_day")) if (layout and layout.has_method("get_time_of_day")) else "day"
		fire_lit = tod in ["dusk", "night"]
		if prop_kind == "stove":
			# El fogón de la cocina A3 mantiene brasas vivas listas para el caldo
			fire_lit = true
			fire_manual_override = true
			call_deferred("_sync_fire_visuals")

func _process(delta: float) -> void:
	if _well_anim_active:
		_update_well_animation(delta)
	if prop_kind == "chest":
		var target_c := 1.0 if is_chest_open else 0.0
		if not is_equal_approx(_chest_blend, target_c):
			_chest_blend = move_toward(_chest_blend, target_c, delta * 3.1)
			var lid := get_parent().get_node_or_null("ChestLidPivot") as Node3D if get_parent() else null
			if is_instance_valid(lid):
				lid.rotation.x = -smoothstep(0.0, 1.0, _chest_blend) * 1.24
	if _gear_spin_timer > 0.0:
		_gear_spin_timer = maxf(0.0, _gear_spin_timer - delta)
		var gear := get_parent().get_node_or_null("BrassGearPivot") as Node3D if get_parent() else null
		if is_instance_valid(gear):
			gear.rotation.y += delta * (3.6 * clampf(_gear_spin_timer, 0.25, 1.0))
	if _shrine_glow_timer > 0.0:
		_shrine_glow_timer = maxf(0.0, _shrine_glow_timer - delta)
	if prop_kind in ["fire", "brazier", "stove"] and fire_lit:
		if fire_fuel > 1.0:
			fire_fuel = maxf(1.0, fire_fuel - delta * 0.025)
			_fire_sync_accum += delta
			if _fire_sync_accum >= 0.45:
				_fire_sync_accum = 0.0
				_apply_fire_fuel_to_builder()
	if _feedback_timer > 0.0:
		_feedback_timer = maxf(0.0, _feedback_timer - delta)
		if is_instance_valid(_feedback_lbl):
			_feedback_lbl.position.y += delta * 0.16
			if _feedback_timer <= 0.0:
				_feedback_lbl.visible = false
	_check_accum += delta
	if _check_accum < 0.05:
		return
	_check_accum = 0.0
	refresh_proximity()

func refresh_proximity() -> void:
	if not is_visible_in_tree():
		is_player_nearby = false
		return
	var active_tok := _get_active_player()
	if not is_instance_valid(active_tok):
		is_player_nearby = false
		return
	var d_xz := Vector2(global_position.x - active_tok.global_position.x, global_position.z - active_tok.global_position.z).length()
	is_player_nearby = d_xz <= interact_radius and absf(global_position.y - active_tok.global_position.y) <= 2.0

func get_interaction_prompt() -> String:
	var tok := _get_active_player()
	match prop_kind:
		"chair", "bench":
			if is_instance_valid(tok) and bool(tok.get("is_sitting")):
				return "[T] Levantarse de %s" % display_name
			return interaction_hint
		"bed", "hammock":
			if is_instance_valid(tok) and (not str(tok.get("resting_on")).is_empty() or bool(tok.get("is_sitting"))):
				return "[T] Levantarse de %s" % display_name
			return interaction_hint
		"fire", "brazier":
			_refresh_fire_lit_from_world()
			return "[T] Avivar %s" % display_name if fire_lit else "[T] Encender %s" % display_name
		"stove":
			_refresh_fire_lit_from_world()
			return "[T] Avivar fogón y remover caldero" if fire_lit else "[T] Encender fogón de cocina"
		"well":
			if is_instance_valid(tok):
				var inv := _resolve_actor_inventory(tok, _get_vtt_ui())
				if _find_empty_canteen_key(inv).is_empty():
					return "[T] Sacar agua fresca y beber del pozo"
			return "[T] Sacar agua del pozo · Llenar cantimplora"
		"chest":
			return "[T] Cerrar %s" % display_name if is_chest_open else "[T] Abrir %s" % display_name
		"winch":
			var lb := _get_layout_builder()
			var lowered := bool(lb.get("winch_is_lowered")) if lb else false
			return "[T] Subir plataforma del cabrestante" if lowered else "[T] Bajar plataforma del cabrestante"
	return interaction_hint

func spin_workbench_gear() -> void:
	if prop_kind == "workbench":
		_gear_spin_timer = 2.6

func begin_well_cycle(restart := true) -> bool:
	if prop_kind != "well" or (_well_anim_active and not restart):
		return false
	_well_anim_active = true
	_well_anim_time = 0.0
	_well_splash_played = false
	_play_prop_sound("pulley")
	return true

func show_watering_contact(spout_world := Vector3.INF) -> void:
	if prop_kind == "watering":
		if spout_world.is_finite():
			var owner_node := get_parent() as Node3D
			_emit_burst_particles(Color(0.58, 0.90, 1.0, 0.90), owner_node.to_local(spout_world), 18, true)
		else:
			_trigger_water_droplets()
		_play_prop_sound("splash")

func interact() -> void:
	var tok := _get_active_player()
	if not is_instance_valid(tok):
		return
	var ui := _get_vtt_ui()
	match prop_kind:
		"chair", "bench":
			_interact_seat(tok, ui)
		"bed", "hammock":
			_interact_bed(tok, ui)
		"well":
			_interact_well(tok, ui)
		"fire", "brazier", "stove":
			_interact_fire(tok, ui)
		"chest":
			_interact_chest(tok, ui)
		"winch":
			_interact_winch(tok, ui)
		"shrine":
			_interact_shrine(tok, ui)
		"workbench":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.72)
			spin_workbench_gear()
			_play_prop_sound("metal")
			_show_feedback("⚙ Engranaje en marcha", Color("#f2cf7c"))
			var msg := toast_text if not toast_text.is_empty() else _WORKBENCH_NOTES[_lore_idx % _WORKBENCH_NOTES.size()]
			_lore_idx += 1
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"firewood":
			_interact_firewood(tok, ui)
		"watering":
			_interact_watering(tok, ui)
		"herbrack":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.65)
			_play_prop_sound("parchment")
			_show_feedback("🌿 Hierbas de Tarak", Color("#9be08a"))
			var msg := _HERB_NOTES[_lore_idx % _HERB_NOTES.size()]
			_lore_idx += 1
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"weaponrack":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.62)
			_play_prop_sound("metal")
			var msg := _WEAPON_NOTES[_lore_idx % _WEAPON_NOTES.size()]
			_lore_idx += 1
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"noticeboard":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.62)
			_play_prop_sound("parchment")
			var msg := toast_text if not toast_text.is_empty() else _NOTICE_NOTES[_lore_idx % _NOTICE_NOTES.size()]
			_lore_idx += 1
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"refreshments":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.68)
			_play_prop_sound("splash")
			_show_feedback("🍞 Refrigerio del claustro", Color("#f5d999"))
			if ui and ui.has_method("notify_mesa"):
				var r_msg := toast_text if not toast_text.is_empty() else ("%s bebe agua fresca y comparte pan recién horneado de la mesa del claustro." % _actor_label(tok))
				ui.notify_mesa(r_msg)
		"bookshelf":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.64)
			_play_prop_sound("parchment")
			var msg := _contextual_lore_message(tok, toast_text if not toast_text.is_empty() else _BOOK_NOTES[_lore_idx % _BOOK_NOTES.size()])
			_lore_idx += 1
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"table":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.60)
			_play_prop_sound("parchment")
			var msg := _contextual_lore_message(tok, toast_text if not toast_text.is_empty() else "Examinas los útiles y documentos dispuestos sobre %s." % display_name)
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(msg)
		"shop":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.64)
			_play_prop_sound("metal")
			_show_feedback("🛒 Tienda de Myla", Color("#f5d27a"))
			if ui and ui.has_method("open_myla_shop") and DisplayServer.get_name() != "headless":
				ui.call("open_myla_shop")
			else:
				var smsg := _MYLA_SHOP_CATALOG[_lore_idx % _MYLA_SHOP_CATALOG.size()]
				_lore_idx += 1
				if ui and ui.has_method("notify_mesa"):
					ui.notify_mesa(smsg)
		"secret":
			_face_prop(tok)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("interact", 0.70)
			_play_prop_sound("parchment")
			var sec_id := str(get_meta("secret_id", ""))
			if not sec_id.is_empty():
				_record_clue_in_residents(sec_id)
			var sec_msg := _contextual_secret_message(tok, toast_text)
			_show_feedback("🔎 Hallazgo", Color("#ffd882"))
			if ui and ui.has_method("notify_mesa"):
				ui.notify_mesa(sec_msg)

func _face_prop(tok: Node3D) -> void:
	if is_instance_valid(tok) and tok.has_method("face_world_direction"):
		var delta_v := global_position - tok.global_position
		delta_v.y = 0.0
		if delta_v.length_squared() > 0.001:
			tok.face_world_direction(delta_v)

func _interact_seat(tok: Node3D, ui: Node) -> void:
	if bool(tok.get("is_sitting")) or not str(tok.get("resting_on")).is_empty():
		if tok.has_method("stand_from_bed"):
			tok.stand_from_bed()
		elif tok.has_method("play_action_animation"):
			tok.play_action_animation("idle")
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("%s se levanta de %s." % [_actor_label(tok), display_name])
		return

	var parent_n := get_parent() as Node3D
	var slots_world := _compute_seat_slots_world(parent_n)
	var chosen_slot := _pick_free_seat_slot(slots_world, tok)
	if chosen_slot == Vector3.INF:
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("No hay plazas libres en %s." % display_name)
		return

	var heading := _resolve_seat_heading_world(parent_n, tok.global_position)
	var feet := _seat_foot_contact(chosen_slot, heading, seat_front_radius, tok.global_position)
	var seat_id := str(parent_n.name) if parent_n else str(name)
	if tok.has_method("attach_to_seat"):
		tok.attach_to_seat(chosen_slot, heading, feet, seat_id)
	else:
		if not tok.has_meta("pre_rest_pos"):
			tok.set_meta("pre_rest_pos", tok.global_position)
		tok.set_meta("resting_on_prop", true)
		tok.global_position = chosen_slot
		tok.set("facing_dir", seat_facing)
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("sit")
	_play_prop_sound("wood")
	if ui and ui.has_method("notify_mesa"):
		var verb := "medita en silencio en" if "contemplación" in display_name.to_lower() else "toma asiento en"
		ui.notify_mesa("%s %s %s (pulsa [T] o muévete para levantarte)." % [_actor_label(tok), verb, display_name])

func _interact_bed(tok: Node3D, ui: Node) -> void:
	if not str(tok.get("resting_on")).is_empty() or bool(tok.get("is_prone")) or bool(tok.get("is_sitting")):
		if tok.has_method("stand_from_bed"):
			tok.stand_from_bed()
		elif tok.has_method("play_action_animation"):
			tok.play_action_animation("idle")
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("%s se incorpora de %s." % [_actor_label(tok), display_name])
		return

	var parent_n := get_parent() as Node3D
	var bed_id := str(parent_n.name) if parent_n else str(name)
	if _is_bed_occupied(bed_id, tok):
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("%s ya está ocupado por otro compañero." % display_name)
		return

	var used_3d_rest := false
	if parent_n and parent_n.has_meta("rest_head") and tok.has_method("attach_to_bed") and tok.has_method("rest_footprint"):
		var head_local: Vector3 = parent_n.get_meta("rest_head")
		var bedding_y_local: float = float(parent_n.get_meta("rest_bedding", 0.62))
		var foot_z_local: float = float(parent_n.get_meta("rest_foot", 0.96))
		var width_local: float = float(parent_n.get_meta("rest_width", 1.10))
		var bed_anchor := {
			"head": parent_n.to_global(head_local),
			"bedding_y": parent_n.to_global(Vector3(0.0, bedding_y_local, 0.0)).y,
			"forward": Vector3(parent_n.global_basis.z.x, 0.0, parent_n.global_basis.z.z).normalized(),
			"available_length": foot_z_local - head_local.z,
			"available_width": width_local,
		}
		var body: Vector2 = tok.rest_footprint()
		if body != Vector2.ZERO and body.x <= float(bed_anchor.available_width) + 0.06 and body.y <= float(bed_anchor.available_length) + 0.06:
			tok.attach_to_bed(bed_id, bed_anchor)
			if prop_kind == "hammock":
				tok.set_meta("hammock_sway", true)
			used_3d_rest = true

	if not used_3d_rest:
		# Alternativa limpia para actores/lechos sin encaje 3D: sentarse/recostarse en el lecho con sprites 8-dir
		var slots := _compute_seat_slots_world(parent_n)
		var slot_pos := slots[0] if not slots.is_empty() else to_global(seat_offset)
		var heading := _resolve_seat_heading_world(parent_n, tok.global_position)
		var feet := _seat_foot_contact(slot_pos, heading, 0.30, tok.global_position)
		if tok.has_method("attach_to_seat"):
			tok.attach_to_seat(slot_pos, heading, feet)
			if prop_kind == "hammock":
				tok.set_meta("hammock_sway", true)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("sit")
		else:
			if not tok.has_meta("pre_rest_pos"):
				tok.set_meta("pre_rest_pos", tok.global_position)
			tok.set_meta("resting_on_prop", true)
			tok.global_position = slot_pos
			tok.set("facing_dir", seat_facing)
			if tok.has_method("play_action_animation"):
				tok.play_action_animation("prone")

	_play_prop_sound("cloth")
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("%s se tumba a descansar en %s (pulsa [T] o muévete para levantarte)." % [_actor_label(tok), display_name])

func _interact_fire(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	_refresh_fire_lit_from_world()
	var was_lit := fire_lit
	var used_wood := false
	var inv := _resolve_actor_inventory(tok, ui)
	if inv.has("lena_seca") and inv["lena_seca"] is Dictionary and int(inv["lena_seca"].get("count", 0)) > 0:
		var rem := int(inv["lena_seca"].get("count", 1)) - 1
		if rem <= 0:
			inv.erase("lena_seca")
		else:
			inv["lena_seca"]["count"] = rem
		used_wood = true

	fire_manual_override = true
	fire_lit = true
	if not was_lit:
		fire_fuel = 1.18 if used_wood else 1.0
	else:
		fire_fuel = clampf(fire_fuel + (0.45 if used_wood else 0.32), 0.95, 1.48)

	if tok.has_method("play_action_animation"):
		tok.play_action_animation("stoke_fire", 0.86)

	_sync_fire_visuals()
	_trigger_ember_burst()
	_play_prop_sound("fire")
	if ui and ui.has_method("refresh_all"):
		ui.refresh_all()

	var msg := ""
	if not was_lit:
		_show_feedback("🔥 %s encendido" % display_name, Color("#ffb65c"))
		msg = "%s enciende %s con pedernal y yesca; las llamas prenden con fuerza." % [_actor_label(tok), display_name]
	elif prop_kind == "stove":
		_show_feedback("🍲 Fogón avivado (%d%%)" % roundi(fire_fuel * 100.0), Color("#ffbc66"))
		msg = "%s aviva las brasas del fogón y remueve el caldero humeante del refectorio." % _actor_label(tok)
	else:
		_show_feedback("🔥 Fuego avivado (%d%%)" % roundi(fire_fuel * 100.0), Color("#ffb65c"))
		if used_wood:
			msg = "%s añade leña seca y aviva %s; una lluvia de chispas ilumina el claustro." % [_actor_label(tok), display_name]
		else:
			msg = "%s remueve los tizones y aviva %s (%d%% de intensidad)." % [_actor_label(tok), display_name, roundi(fire_fuel * 100.0)]
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa(msg)

func _interact_chest(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	is_chest_open = not is_chest_open
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("open_chest", 0.68)
	_play_prop_sound("wood")
	_show_feedback("Baúl abierto" if is_chest_open else "Baúl cerrado", Color("#f2d084"))
	if ui and ui.has_method("notify_mesa"):
		if is_chest_open:
			var contents := toast_text if not toast_text.is_empty() else "Mantas dobladas, mudas de lino y provisiones secas descansan ordenadas dentro del baúl."
			ui.notify_mesa("%s abre %s: %s" % [_actor_label(tok), display_name, contents])
		else:
			ui.notify_mesa("%s cierra la tapa de %s." % [_actor_label(tok), display_name])

func _interact_winch(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("pull_lever", 0.72)
	var lb := _get_layout_builder()
	var lowered := false
	if lb and lb.has_method("toggle_winch_lever"):
		lowered = bool(lb.call("toggle_winch_lever"))
	_play_prop_sound("pulley")
	_show_feedback("⚓ Plataforma bajando" if lowered else "⚓ Plataforma subiendo", Color("#f2d084"))
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("%s acciona la palanca del cabrestante: la plataforma %s lentamente." % [_actor_label(tok), "desciende hacia la caleta" if lowered else "asciende hacia la terraza A2"])

func _interact_shrine(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("pray", 0.95)
	_shrine_glow_timer = 3.5
	var layout := _get_layout_builder()
	if layout and layout.has_method("set_local_fire_state") and get_parent() is Node3D:
		layout.call("set_local_fire_state", get_parent() as Node3D, true, 1.22)
	_trigger_shrine_sparkles()
	_play_prop_sound("chime")
	var hero_id := _hero_role_key(tok)
	var low_name := display_name.to_lower()
	var msg := toast_text if not toast_text.is_empty() else "%s inclina la cabeza en señal de respeto y aviva las velas votivas." % _actor_label(tok)
	if "bahamut" in low_name:
		_show_feedback("✨ Bendición de Astalagan (+1d4 salv.)", Color("#ffe599"))
		msg = "Las 4 hendiduras cardinales desprenden incienso sereno. El aura protectora de Astalagan otorga +1d4 a las tiradas de salvación en el templo (criaturas no malvadas)."
		if hero_id == "mike":
			msg += " [Mike · Detectar magia]: Percibes un tenue resplandor de abjuración dracónica alrededor de la estatua de Bahamut y sus siete canarios."
		elif hero_id == "mia":
			msg += " [Mia · Clériga]: La presencia del Dragón de Platino templa la sombra de muerte de tus sueños y señala hacia los arrecifes del norte."
	elif "astalagan" in low_name:
		_show_feedback("🐉 Estatua de Astalagan", Color("#f2d084"))
		if hero_id == "mike":
			msg = "Estatua de piedra de Astalagan. [Mike · C. Arcano]: Reconoces inequívocamente la cresta y el porte de un dragón de bronce (CD 10)."
	elif "brastos" in low_name:
		_show_feedback("🕊 Tumba de Brastos", Color("#d8ecf8"))
		_record_clue_in_residents("brastos_grave")
		if hero_id == "mia":
			msg = "Tumba de Brastos cubierta de flores silvestres blancas. [Mia · Clériga]: Sientes que devolver aquí el talismán de Aleitha cerraría la maldición del Rosa de los Vientos."
	else:
		_show_feedback("✨ Ofrenda serena", Color("#ffe599"))
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa(msg)

func _record_clue_in_residents(clue_id: String) -> void:
	if clue_id.is_empty():
		return
	var tree := get_tree()
	if not tree:
		return
	var mt := tree.root.get_node_or_null("MapTransition")
	if mt:
		var clues: Dictionary = mt.get_meta("retreat_discovered_clues", {})
		clues[clue_id] = true
		mt.set_meta("retreat_discovered_clues", clues)
	var main := tree.current_scene
	if main:
		var res := main.get_node_or_null("RetreatResidents")
		if is_instance_valid(res) and res.has_method("record_discovered_clue"):
			res.call("record_discovered_clue", clue_id)

func _hero_role_key(tok: Node3D) -> String:
	if not is_instance_valid(tok):
		return ""
	var n := str(tok.name).to_lower()
	var tn := str(tok.get("token_name")).to_lower()
	if "rogue" in n or "trinity" in tn or "maria" in tn or "maría" in tn:
		return "trinity"
	if "wizard" in n or "mike" in tn:
		return "mike"
	if "player" in n or "mia" in tn:
		return "mia"
	return ""

func _contextual_secret_message(tok: Node3D, fallback_text: String) -> String:
	var sec_id := str(get_meta("secret_id", ""))
	var hero_id := _hero_role_key(tok)
	match sec_id:
		"tarak_daggers":
			if hero_id == "trinity":
				return "Bajo la tabla reposan tres dagas equilibradas de acero oscuro. [Trinity · Trasfondo Criminal]: Reconoces al instante el equilibrio de hoja y el nudo dorado grabado del gremio del Cadalso Dorado."
		"varnoth_sword":
			if hero_id == "mia":
				return "Bajo el colchón descansa una vieja espada corta con el emblema raspado de los Lobos Celestes. [Mia · Soldado]: Reconoces el acero reglamentario de la legendaria compañía mercenaria."
		"brastos_grave":
			if hero_id == "mia":
				return "Lápida de madera desgastada con el nombre «Brastos» entre flores blancas. [Mia · Clériga]: Depositar, enterrar o quemar aquí el talismán de Aleitha traería descanso a los muertos del pecio."
	return fallback_text

func _contextual_lore_message(tok: Node3D, fallback_text: String) -> String:
	var topic := str(get_meta("lore_topic", ""))
	var hero_id := _hero_role_key(tok)
	match topic:
		"history_theology":
			if hero_id == "trinity":
				return fallback_text + " [Trinity · Pista]: Un margen anotado cita al Cadalso Dorado y un antiguo envenenador huido hacia la costa."
			if hero_id == "mia":
				return fallback_text + " [Mia · Pista]: Una crónica reciente menciona la sombra no muerta que acecha cerca del pecio del Rosa de los Vientos."
		"runara_codex":
			if hero_id == "mike":
				return fallback_text + " [Mike · Erudito]: Coincide con la carta de tu colega sobre el Observatorio oriental; Runara parece saber cómo cruzar hacia allí."
		"island_chart":
			if hero_id == "mike":
				return fallback_text + " [Mike · Erudito]: Las marcas astronómicas en el extremo oriental de la carta corresponden al antiguo Observatorio."
			if hero_id == "mia":
				return fallback_text + " [Mia · Clériga]: Los arrecifes del norte muestran la posición exacta del pecio del Rosa de los Vientos y el cementerio en los acantilados al NO."
	return fallback_text

func _interact_firewood(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("firewood", 0.70)
	_play_prop_sound("wood")
	var inv := _resolve_actor_inventory(tok, ui)
	var cur := int(inv["lena_seca"].get("count", 0)) if (inv.has("lena_seca") and inv["lena_seca"] is Dictionary) else 0
	if cur >= 3:
		_show_feedback("Leña suficiente (×%d)" % cur, Color("#e8c882"))
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("%s ya lleva suficiente leña seca (×%d) para avivar la hoguera." % [_actor_label(tok), cur])
		return
	if inv.has("lena_seca") and inv["lena_seca"] is Dictionary:
		inv["lena_seca"]["count"] = cur + 1
	else:
		inv["lena_seca"] = {"name": "Leña seca", "count": 1, "desc": "Astillas y troncos de roble secos del claustro para avivar hogueras.", "equipped": false}
	if ui and ui.has_method("refresh_all"):
		ui.refresh_all()
	_show_feedback("🪵 Leña seca (+1)", Color("#e6bf78"))
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("%s recoge un brazado de leña seca de la pila del hogar (×%d)." % [_actor_label(tok), cur + 1])

func _interact_watering(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	if tok.has_method("play_action_animation"):
		tok.play_action_animation("water_plants", 0.85)
	show_watering_contact()
	_show_feedback("💧 Hierbas regadas", Color("#9ee8ff"))
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("%s toma la regadera monástica y riega la salvia, lavandas y macetas del claustro." % _actor_label(tok))

func _resolve_actor_inventory(tok: Node3D, ui: Node) -> Dictionary:
	if ui and ui.has_method("get_inventory_items"):
		var items = ui.call("get_inventory_items")
		if items is Dictionary:
			return items
	if tok.has_meta("fallback_inventory"):
		return tok.get_meta("fallback_inventory") as Dictionary
	var default_inv := {
		"cantimplora_vacia": {"name": "Cantimplora vacía", "count": 1, "desc": "Recipiente de cuero vacío.", "equipped": false}
	}
	tok.set_meta("fallback_inventory", default_inv)
	return default_inv

func _find_empty_canteen_key(inv: Dictionary) -> String:
	for k in inv.keys():
		var kl := str(k).to_lower()
		var nl := str(inv[k].get("name", "")).to_lower() if inv[k] is Dictionary else ""
		if ("cantimplora" in kl or "cantimplora" in nl or "waterskin" in kl) and ("vacia" in kl or "vacía" in nl or "empty" in kl):
			if int(inv[k].get("count", 0)) > 0:
				return str(k)
	return ""

func _interact_well(tok: Node3D, ui: Node) -> void:
	_face_prop(tok)
	var inv := _resolve_actor_inventory(tok, ui)
	var empty_key := _find_empty_canteen_key(inv)

	if tok.has_method("play_action_animation"):
		tok.play_action_animation("use_well", 1.15)

	# Siempre activar la animación real de polea, cuerda y cubo + sonido y gotas
	begin_well_cycle()

	if empty_key.is_empty():
		_show_feedback("💧 Agua fresca del pozo", Color("#8fe8ff"))
		if ui and ui.has_method("notify_mesa"):
			ui.notify_mesa("%s baja el cubo al pozo, bebe agua fresca del manantial subterráneo y refresca el rostro." % _actor_label(tok))
		return

	var cur_empty := int(inv[empty_key].get("count", 1))
	if cur_empty <= 1:
		inv.erase(empty_key)
	else:
		inv[empty_key]["count"] = cur_empty - 1

	var target_full_key := "cantimplora_llena"
	if inv.has(target_full_key) and inv[target_full_key] is Dictionary:
		inv[target_full_key]["count"] = int(inv[target_full_key].get("count", 0)) + 1
	else:
		inv[target_full_key] = {
			"name": "Cantimplora llena",
			"count": 1,
			"desc": "Agua fresca y cristalina extraída del pozo profundo del claustro de A1.",
			"equipped": false
		}

	if ui and ui.has_method("refresh_all"):
		ui.refresh_all()
	_show_feedback("💧 Cantimplora llena (+1)", Color("#8fe8ff"))
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa("%s baja el cubo al fondo del pozo, recoge agua fresca y llena su cantimplora (Cantimplora llena ×%d)." % [_actor_label(tok), int(inv[target_full_key].get("count", 1))])

func _update_well_animation(delta: float) -> void:
	_well_anim_time += delta
	var w_parent := get_parent()
	if not w_parent:
		_well_anim_active = false
		return
	var bucket := w_parent.get_node_or_null("WellBucketRig") as Node3D
	var rope := w_parent.get_node_or_null("WellRopeMesh") as Node3D
	var roller := w_parent.get_node_or_null("WellRollerNode") as Node3D
	var water_fill := w_parent.get_node_or_null("WellBucketRig/BucketWaterFill") as Node3D

	var total_dur := 1.65
	var t := clampf(_well_anim_time / total_dur, 0.0, 1.0)
	var depth_f := 0.0
	if t < 0.42:
		depth_f = smoothstep(0.0, 1.0, t / 0.42)
	elif t < 0.58:
		depth_f = 1.0
		if not _well_splash_played:
			_well_splash_played = true
			if is_instance_valid(water_fill):
				water_fill.visible = true
			_play_prop_sound("splash")
			_trigger_water_droplets()
	else:
		depth_f = 1.0 - smoothstep(0.0, 1.0, (t - 0.58) / 0.42)

	var top_anchor_y := 1.96
	var bucket_y := lerpf(1.18, 0.22, depth_f)
	if is_instance_valid(bucket):
		bucket.position.y = bucket_y
		bucket.rotation.z = sin(_well_anim_time * 11.0) * 0.06 * (1.0 - t * 0.5)
	if is_instance_valid(rope):
		var rope_len := maxf(0.25, top_anchor_y - (bucket_y + 0.16))
		rope.position.y = top_anchor_y - rope_len * 0.5
		rope.scale.y = rope_len / 0.78
	if is_instance_valid(roller):
		roller.rotation.x = depth_f * TAU * 2.2

	if _well_anim_time >= total_dur:
		_well_anim_active = false

func _refresh_fire_lit_from_world() -> void:
	if fire_manual_override:
		return
	var layout := _get_layout_builder()
	var tod := str(layout.call("get_time_of_day")) if (layout and layout.has_method("get_time_of_day")) else "day"
	fire_lit = tod in ["dusk", "night"]

func _sync_fire_visuals() -> void:
	var targets := _collect_fire_targets()
	var layout := _get_layout_builder()
	var any_has_light := false
	for t_node in targets:
		if t_node is OmniLight3D or not t_node.find_children("*", "OmniLight3D", true, false).is_empty():
			any_has_light = true
			break
	for idx in range(targets.size()):
		var t_node: Node3D = targets[idx]
		var allow_new_light := (not any_has_light) and (idx == 0)
		if layout and layout.has_method("set_local_fire_state"):
			layout.call("set_local_fire_state", t_node, fire_lit, fire_fuel, allow_new_light)
		else:
			_apply_fire_fallback(t_node)

func _apply_fire_fuel_to_builder() -> void:
	var layout := _get_layout_builder()
	if not layout:
		return
	for t_node in _collect_fire_targets():
		if layout.has_method("set_local_fire_fuel"):
			layout.call("set_local_fire_fuel", t_node, fire_fuel)
		elif layout.has_method("set_local_fire_state"):
			layout.call("set_local_fire_state", t_node, fire_lit, fire_fuel, false)

func _collect_fire_targets() -> Array[Node3D]:
	var out: Array[Node3D] = []
	var p := get_parent() as Node3D
	if is_instance_valid(p):
		out.append(p)
	if not linked_fire_node_name.is_empty():
		var lb := _get_layout_builder()
		if lb:
			var linked := lb.find_child(linked_fire_node_name, true, false) as Node3D
			if is_instance_valid(linked) and not out.has(linked):
				out.append(linked)
	return out

func _apply_fire_fallback(root_n: Node3D) -> void:
	for child in root_n.find_children("*", "Node3D", true, false):
		var low := child.name.to_lower()
		if child is OmniLight3D:
			child.visible = fire_lit
		elif child is MeshInstance3D and (child.is_in_group("night_flame") or "flame" in low or "ember" in low):
			child.visible = fire_lit

static var _soft_spark_tex: ImageTexture = null

static func _get_soft_spark_tex() -> ImageTexture:
	if _soft_spark_tex != null:
		return _soft_spark_tex
	var sz := 24
	var img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var c := (float(sz) - 1.0) * 0.5
	for y in range(sz):
		for x in range(sz):
			var d := Vector2(float(x) - c, float(y) - c).length() / c
			var a := clampf(1.0 - smoothstep(0.18, 1.0, d), 0.0, 1.0)
			img.set_pixel(x, y, Color(1.0, 1.0, 1.0, a * a))
	_soft_spark_tex = ImageTexture.create_from_image(img)
	return _soft_spark_tex

func _trigger_ember_burst() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var parent_n := get_parent() as Node3D
	if not parent_n:
		return
	if not is_instance_valid(_fire_ember_particles):
		_fire_ember_particles = GPUParticles3D.new()
		_fire_ember_particles.name = "FireStokeEmbers"
		_fire_ember_particles.amount = 28
		_fire_ember_particles.lifetime = 1.15
		_fire_ember_particles.one_shot = true
		_fire_ember_particles.explosiveness = 0.72
		_fire_ember_particles.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var pm := ParticleProcessMaterial.new()
		pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
		pm.emission_sphere_radius = 0.34
		pm.direction = Vector3(0.0, 1.0, 0.0)
		pm.spread = 38.0
		pm.initial_velocity_min = 0.9
		pm.initial_velocity_max = 2.1
		pm.gravity = Vector3(0.0, 0.25, 0.0)
		pm.scale_min = 0.14
		pm.scale_max = 0.32
		pm.color = Color(1.0, 0.68, 0.22, 0.95)
		_fire_ember_particles.process_material = pm
		var qm := QuadMesh.new()
		qm.size = Vector2(0.32, 0.32)
		var sm := StandardMaterial3D.new()
		sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		sm.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		sm.billboard_keep_scale = true
		sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		sm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		sm.albedo_texture = _get_soft_spark_tex()
		sm.albedo_color = Color(1.0, 0.76, 0.28, 0.95)
		qm.material = sm
		_fire_ember_particles.draw_pass_1 = qm
		var y_off := 1.12 if prop_kind == "stove" else (0.96 if prop_kind == "brazier" else 0.48)
		_fire_ember_particles.position = Vector3(-0.55 if prop_kind == "stove" else 0.0, y_off, 0.0)
		parent_n.add_child(_fire_ember_particles)
	_fire_ember_particles.restart()
	_fire_ember_particles.emitting = true

func _trigger_water_droplets() -> void:
	_emit_burst_particles(Color(0.58, 0.90, 1.0, 0.90), Vector3(0.0, 1.05 if prop_kind == "well" else 0.45, 0.0), 18)

func _trigger_shrine_sparkles() -> void:
	_emit_burst_particles(Color(1.0, 0.90, 0.56, 0.92), Vector3(0.0, 0.95, 0.0), 16)

func _emit_burst_particles(col: Color, pos_local: Vector3, count: int, from_spout := false) -> void:
	if DisplayServer.get_name() == "headless":
		return
	var parent_n := get_parent() as Node3D
	if not parent_n:
		return
	if not is_instance_valid(_vfx_particles):
		_vfx_particles = GPUParticles3D.new()
		_vfx_particles.name = "PropActionParticles"
		_vfx_particles.amount = count
		_vfx_particles.lifetime = 0.85
		_vfx_particles.one_shot = true
		_vfx_particles.explosiveness = 0.80
		_vfx_particles.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var pm := ParticleProcessMaterial.new()
		pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
		pm.initial_velocity_min = 0.6
		pm.initial_velocity_max = 1.4
		pm.gravity = Vector3(0.0, -1.2 if prop_kind in ["well", "watering"] else 0.35, 0.0)
		pm.scale_min = 0.14
		pm.scale_max = 0.28
		_vfx_particles.process_material = pm
		var qm := QuadMesh.new()
		qm.size = Vector2(0.28, 0.28)
		var sm := StandardMaterial3D.new()
		sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		sm.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		sm.billboard_keep_scale = true
		sm.albedo_texture = _get_soft_spark_tex()
		sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		sm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		sm.albedo_color = col
		qm.material = sm
		_vfx_particles.draw_pass_1 = qm
		parent_n.add_child(_vfx_particles)
	var process_material := _vfx_particles.process_material as ParticleProcessMaterial
	process_material.emission_sphere_radius = 0.029 if from_spout else 0.28
	process_material.direction = Vector3(0.6, -1.0, 0.0) if from_spout else Vector3.UP
	process_material.spread = 14.0 if from_spout else 48.0
	_vfx_particles.position = pos_local
	_vfx_particles.restart()
	_vfx_particles.emitting = true

func _compute_seat_slots_world(parent_n: Node3D) -> Array[Vector3]:
	var out: Array[Vector3] = []
	var src: Array[Vector3] = seat_slots_local
	if src.is_empty():
		var fallback_y := seat_offset.y if seat_offset.y >= 0.08 else 0.46
		src = [Vector3(seat_offset.x, fallback_y, seat_offset.z)]
	for s in src:
		out.append(parent_n.to_global(s) if parent_n else to_global(s))
	return out

func _pick_free_seat_slot(slots: Array[Vector3], actor: Node3D) -> Vector3:
	if slots.is_empty():
		return Vector3.INF
	var tree := get_tree()
	var tokens: Array = tree.get_nodes_in_group("party_tokens") if tree else []
	var best := Vector3.INF
	var best_d := 1e9
	for slot in slots:
		var occupied := false
		for m in tokens:
			if m is Node3D and m != actor:
				var other_pos: Vector3 = m.get_meta("prop_seat_pos", Vector3.INF)
				if other_pos != Vector3.INF and other_pos.distance_squared_to(slot) < 0.16:
					occupied = true
					break
		if not occupied:
			var d := actor.global_position.distance_squared_to(slot)
			if d < best_d:
				best_d = d
				best = slot
	return best

func _resolve_seat_heading_world(parent_n: Node3D, approach_pos: Vector3) -> Vector3:
	var fwd := Vector3.ZERO
	if parent_n:
		fwd = parent_n.global_basis * seat_heading_local
		fwd.y = 0.0
	if fwd.length_squared() < 0.0001:
		const DIR_MAP := {
			"n": Vector3(0.0, 0.0, -1.0), "ne": Vector3(0.707, 0.0, -0.707),
			"e": Vector3(1.0, 0.0, 0.0), "se": Vector3(0.707, 0.0, 0.707),
			"s": Vector3(0.0, 0.0, 1.0), "sw": Vector3(-0.707, 0.0, 0.707),
			"w": Vector3(-1.0, 0.0, 0.0), "nw": Vector3(-0.707, 0.0, -0.707),
		}
		fwd = DIR_MAP.get(seat_facing, Vector3(0.0, 0.0, 1.0))
	else:
		fwd = fwd.normalized()
	if seat_face_approach and parent_n:
		var side := (approach_pos - parent_n.global_position).dot(fwd)
		if side < 0.0:
			fwd = -fwd
	return fwd

func _seat_foot_contact(slot: Vector3, heading: Vector3, front_radius: float, stand: Vector3) -> Vector3:
	var feet := slot + heading * maxf(0.24, front_radius + 0.045)
	var world := get_world_3d()
	if world and world.direct_space_state:
		var excluded: Array[RID] = []
		if get_tree():
			for member in get_tree().get_nodes_in_group("party_tokens"):
				if member is CollisionObject3D:
					excluded.append((member as CollisionObject3D).get_rid())
		var query := PhysicsRayQueryParameters3D.create(feet + Vector3.UP * 0.10, feet - Vector3.UP * 1.4, 0xFFFFFFFF, excluded)
		var ground := world.direct_space_state.intersect_ray(query)
		if not ground.is_empty() and ground.normal.y > 0.6:
			feet.y = ground.position.y + 0.006
			return feet
	feet.y = stand.y + 0.006
	return feet

func _is_bed_occupied(bed_id: String, actor: Node3D) -> bool:
	var tree := get_tree()
	if not tree or bed_id.is_empty():
		return false
	for m in tree.get_nodes_in_group("party_tokens"):
		if m is Node3D and m != actor and str(m.get("resting_on")) == bed_id:
			return true
	return false

func _show_feedback(text: String, col: Color) -> void:
	var w_parent := get_parent()
	if not w_parent:
		return
	if not is_instance_valid(_feedback_lbl):
		_feedback_lbl = Label3D.new()
		_feedback_lbl.name = "PropFeedbackLabel3D"
		_feedback_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		_feedback_lbl.font_size = 26
		_feedback_lbl.pixel_size = 0.0048
		_feedback_lbl.outline_size = 5
		_feedback_lbl.outline_modulate = Color(0.08, 0.06, 0.04, 0.95)
		w_parent.add_child(_feedback_lbl)
	_feedback_lbl.text = text
	_feedback_lbl.modulate = col
	_feedback_lbl.position = Vector3(0.0, 2.72 if prop_kind == "well" else 1.75, 0.0)
	_feedback_lbl.visible = true
	_feedback_timer = 2.1

func _play_prop_sound(kind: String) -> void:
	if DisplayServer.get_name() == "headless" or AudioServer.get_driver_name() == "Dummy":
		return
	if not is_instance_valid(_audio_player):
		_audio_player = AudioStreamPlayer3D.new()
		_audio_player.name = "PropAudioPlayer3D"
		_audio_player.max_distance = 24.0
		var gen := AudioStreamGenerator.new()
		gen.mix_rate = 22050.0
		gen.buffer_length = 0.45
		_audio_player.stream = gen
		add_child(_audio_player)
	_audio_player.play()
	var pb := _audio_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if pb == null:
		return
	var frames := mini(pb.get_frames_available(), 8600)
	for i in range(frames):
		var tm := float(i) / 22050.0
		var sample := 0.0
		match kind:
			"splash":
				var env := exp(-tm * 6.5)
				sample = (sin(tm * 340.0 + sin(tm * 48.0) * 4.0) * 0.45 + sin(tm * 620.0) * 0.25 + (fmod(tm * 997.0, 1.0) - 0.5) * 0.35) * env * 0.22
			"pulley":
				var env := exp(-tm * 5.0)
				sample = (sin(tm * 185.0 + sin(tm * 26.0) * 3.2) * 0.55 + sin(tm * 92.0) * 0.35) * env * 0.18
			"fire":
				var env := exp(-tm * 4.2)
				var crackle := (fmod(tm * 1423.0 + sin(tm * 73.0), 1.0) - 0.5) * 0.65
				var whoosh := sin(tm * 128.0 + sin(tm * 19.0) * 2.5) * 0.35
				sample = (crackle + whoosh) * env * 0.22
			"chime":
				var env := exp(-tm * 3.1)
				sample = (sin(tm * 528.0 * TAU * 0.25) * 0.50 + sin(tm * 792.0 * TAU * 0.25) * 0.30 + sin(tm * 1056.0 * TAU * 0.25) * 0.18) * env * 0.16
			"metal":
				var env := exp(-tm * 11.0)
				sample = (sin(tm * 880.0 * TAU * 0.25) * 0.48 + sin(tm * 1340.0 * TAU * 0.25) * 0.32) * env * 0.16
			"parchment":
				var env := exp(-tm * 9.5)
				sample = (fmod(tm * 1871.0, 1.0) - 0.5) * env * 0.12
			"cloth":
				var env := exp(-tm * 8.5)
				sample = (fmod(tm * 911.0, 1.0) - 0.5) * sin(tm * 42.0) * env * 0.14
			_:
				var env := exp(-tm * 9.0)
				sample = (sin(tm * 145.0 * TAU * 0.25) * 0.6 + sin(tm * 72.0 * TAU * 0.25) * 0.4) * env * 0.18
		pb.push_frame(Vector2(sample, sample))

func _actor_label(tok: Node3D) -> String:
	var n := String(tok.get("token_name")) if tok.get("token_name") != null else String(tok.name)
	return n.capitalize() if not n.is_empty() else "Aventurero"

func _get_active_player() -> Node3D:
	var tree := get_tree()
	if not tree:
		return null
	var fallback: Node3D = null
	for p in tree.get_nodes_in_group("party_tokens"):
		if p is Node3D:
			if bool(p.get("is_active_player")):
				return p as Node3D
			if fallback == null and not bool(p.get("is_npc")):
				fallback = p as Node3D
	return fallback

func _get_vtt_ui() -> Node:
	var tree := get_tree()
	if not tree:
		return null
	return tree.get_first_node_in_group("vtt_role_ui")

func _get_layout_builder() -> Node:
	var tree := get_tree()
	if not tree:
		return null
	if tree.current_scene:
		var found := tree.current_scene.find_child("RetreatLayoutBuilder", true, false)
		if found:
			return found
	if tree.root:
		return tree.root.find_child("RetreatLayoutBuilder", true, false)
	return null
