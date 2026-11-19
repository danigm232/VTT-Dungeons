class_name HelmController
extends InteractiveProp

# Controlador canónico e interactivo del Timón "Rosa de los Vientos" en C3:
# - Permite examinar el timón sin alterar su estado (Paso 3.1)
# - Al intentar girarlo, el timón se desencaja del eje deteriorado (Paso 3.2-3.3)
# - Salvación de Destreza CD 10 para sujetarlo antes de que caiga (Paso 3.4-3.5)
# - Si falla, impacta contra la cubierta con estrépito, alerta a los zombis de C4
#   y emite golpes repetitivos desde C4 cada 10-15 segundos (Paso 3.6-3.8)
# - Estado completamente persistente entre guardado y carga (Paso 3.9)

const PecioSfxKit = preload("res://scripts/pecio_sfx_kit.gd")
const PecioWorldState = preload("res://scripts/pecio_world_state.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")

signal helm_state_changed(new_state: String, c4_alerted: bool)
signal interaction_modal_requested(controller: HelmController)

var wheel_pivot: Node3D
var ped_node: Node3D
var wheel_collider: StaticBody3D
var attached_local_pos: Vector3 = Vector3(0.32, 1.12, 0.04)
var attached_local_rot_deg: Vector3 = Vector3(8.0, -13.0, -11.5)

var helm_state: String = "attached" # "attached" | "caught" | "fallen"
var c4_zombies_alerted: bool = false

var _wheel_sfx: AudioStreamPlayer3D
var _c4_bang_sfx: AudioStreamPlayer3D
var _bang_timer: Timer
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()
	super._ready()
	_setup_audio_nodes()
	_sync_initial_state.call_deferred()

func _setup_audio_nodes() -> void:
	_wheel_sfx = AudioStreamPlayer3D.new()
	_wheel_sfx.name = "HelmActionAudio"
	_wheel_sfx.max_distance = 28.0
	_wheel_sfx.unit_size = 4.5
	add_child(_wheel_sfx)

	_c4_bang_sfx = AudioStreamPlayer3D.new()
	_c4_bang_sfx.name = "C4ZombieBangAudio"
	_c4_bang_sfx.max_distance = 34.0
	_c4_bang_sfx.unit_size = 5.5
	_c4_bang_sfx.volume_db = 2.0
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if vessel:
		_c4_bang_sfx.position = vessel.to_global(WreckStructure.get_world_pos(-20.2, 1.35, -3.2)) - global_position
	add_child(_c4_bang_sfx)

	_bang_timer = Timer.new()
	_bang_timer.name = "C4BangRepeatTimer"
	_bang_timer.one_shot = true
	_bang_timer.timeout.connect(_on_c4_bang_timeout)
	add_child(_bang_timer)

func _sync_initial_state() -> void:
	var state_holder := _get_world_state()
	if state_holder:
		apply_world_state(state_holder.helm_state, state_holder.c4_zombies_alerted, true)
	else:
		_update_prompt_texts()

func _get_world_state() -> PecioWorldState:
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt_ui and "world_state" in vtt_ui and vtt_ui.world_state:
		return vtt_ui.world_state as PecioWorldState
	return null

func interact() -> void:
	if is_animating:
		return
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	var capture_hidden: bool = vtt_ui != null and bool(vtt_ui.get_meta("capture_hidden", false))
	if helm_state == "attached" and vtt_ui and not capture_hidden and vtt_ui.has_method("show_helm_interaction_modal"):
		emit_signal("interaction_modal_requested", self)
		vtt_ui.show_helm_interaction_modal(self)
		return
	examine_helm()

func examine_helm() -> void:
	interaction_count += 1
	if nearby_player and nearby_player.has_method("play_action_animation"):
		nearby_player.play_action_animation("interact")
	_play_creak()
	var msg := get_examine_message()
	_notify_player(msg)
	emit_signal("prop_interacted")

func get_examine_message() -> String:
	match helm_state:
		"caught":
			return "Sujetaste la rueda antes de que se estrellara contra cubierta. En el aro de madera envejecida brilla, boca abajo en nácar desgastado: «Rosa de los Vientos»."
		"fallen":
			return "El timón yace desencajado sobre las tablas de popa. En su aro roto aún se distingue, boca abajo y con nácar saltado, el nombre «Rosa de los Vientos»."
		_:
			return "El timón está torcido, descentrado y a punto de soltarse del eje oxidado. Tallado en el aro con incrustaciones de nácar desgastado, boca abajo, se lee: «Rosa de los Vientos»."

func attempt_turn_helm(forced_d20: int = -1) -> Dictionary:
	if is_animating:
		return {"state": helm_state, "already_resolved": true}
	if helm_state != "attached":
		examine_helm()
		return {"state": helm_state, "already_resolved": true}

	interaction_count += 1
	if nearby_player and nearby_player.has_method("play_action_animation"):
		nearby_player.play_action_animation("interact")

	var dex_mod := _get_active_hero_dex_mod()
	var roll := clampi(forced_d20, 1, 20) if forced_d20 >= 1 else _rng.randi_range(1, 20)
	var total := roll + dex_mod
	var success := total >= 10

	is_animating = true
	var ws := _get_world_state()

	var mod_str := ("+%d" % dex_mod) if dex_mod >= 0 else str(dex_mod)
	if success:
		helm_state = "caught"
		if ws:
			ws.mark_helm_caught()
		_play_creak()
		_animate_caught_wheel()
		var ok_msg := "DES CD 10: ¡ÉXITO! (d20=%d %s = %d). Al girar el timón, el eje cede y la rueda se desencaja, pero logras atraparla sin golpear la cubierta." % [roll, mod_str, total]
		_notify_player(ok_msg)
	else:
		helm_state = "fallen"
		c4_zombies_alerted = true
		if ws:
			ws.mark_helm_fallen()
		_animate_fallen_wheel()
		_play_crash_and_alert()
		var fail_msg := "DES CD 10: FALLO (d20=%d %s = %d). ¡El timón se suelta del eje y se estrella contra las tablas! Unos golpes sordos empiezan a resonar desde el camarote C4." % [roll, mod_str, total]
		_notify_player(fail_msg)

	_update_collider_for_state()
	_update_prompt_texts()
	_sync_ui_after_change()
	emit_signal("helm_state_changed", helm_state, c4_zombies_alerted)
	emit_signal("prop_interacted")
	return {
		"state": helm_state,
		"roll": roll,
		"dex_mod": dex_mod,
		"total": total,
		"success": success,
		"c4_alerted": c4_zombies_alerted,
	}

func apply_world_state(target_state: String, alerted: bool, immediate: bool = true) -> void:
	helm_state = target_state if target_state in PecioWorldState.VALID_HELM_STATES else "attached"
	c4_zombies_alerted = alerted
	if wheel_pivot:
		match helm_state:
			"attached":
				wheel_pivot.position = attached_local_pos
				wheel_pivot.rotation_degrees = attached_local_rot_deg
			"caught":
				wheel_pivot.position = Vector3(-0.32, 0.72, 0.56)
				wheel_pivot.rotation_degrees = Vector3(-16.0, 28.0, 14.0)
			"fallen":
				wheel_pivot.position = Vector3(0.76, 0.14, 0.42)
				wheel_pivot.rotation_degrees = Vector3(84.0, -24.0, 18.0)
	_update_collider_for_state()
	_update_prompt_texts()
	if c4_zombies_alerted:
		start_c4_bang_loop(immediate)
	else:
		stop_c4_bang_loop()
	emit_signal("helm_state_changed", helm_state, c4_zombies_alerted)

func silence_c4_alert() -> void:
	c4_zombies_alerted = false
	stop_c4_bang_loop()
	var ws := _get_world_state()
	if ws:
		ws.set_c4_zombies_alerted(false)
	_sync_ui_after_change()
	emit_signal("helm_state_changed", helm_state, c4_zombies_alerted)

func reset_helm_to_attached() -> void:
	var ws := _get_world_state()
	if ws:
		ws.helm_state = "attached"
		ws.c4_zombies_alerted = false
		ws.save_state()
	apply_world_state("attached", false, true)
	_sync_ui_after_change()

func start_c4_bang_loop(initial_short_delay: bool = false) -> void:
	if not _bang_timer or not is_inside_tree():
		return
	_bang_timer.stop()
	var wait_sec := _rng.randf_range(10.0, 15.0)
	if initial_short_delay:
		wait_sec = _rng.randf_range(2.2, 4.5)
	_bang_timer.start(wait_sec)

func stop_c4_bang_loop() -> void:
	if _bang_timer:
		_bang_timer.stop()

func _on_c4_bang_timeout() -> void:
	if not c4_zombies_alerted:
		return
	trigger_c4_bang_pulse()
	_bang_timer.start(_rng.randf_range(10.0, 15.0))

func trigger_c4_bang_pulse() -> void:
	if _c4_bang_sfx and is_inside_tree():
		_c4_bang_sfx.stream = PecioSfxKit.make_c4_zombie_bang()
		if DisplayServer.get_name() != "headless":
			_c4_bang_sfx.play()
	# Sacudida visual sutil de la puerta de C4 si existe en el árbol
	var door_c4 := get_tree().root.find_child("DoorC4", true, false) as Node3D
	if door_c4 and is_inside_tree():
		var orig_x := door_c4.position.x
		var tw := door_c4.create_tween()
		tw.tween_property(door_c4, "position:x", orig_x + 0.025, 0.06)
		tw.tween_property(door_c4, "position:x", orig_x - 0.02, 0.07)
		tw.tween_property(door_c4, "position:x", orig_x, 0.08)

func _animate_caught_wheel() -> void:
	if not wheel_pivot:
		is_animating = false
		return
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(wheel_pivot, "rotation_degrees", Vector3(-16.0, 28.0, 14.0), 0.52).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(wheel_pivot, "position", Vector3(-0.32, 0.72, 0.56), 0.52).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.finished.connect(func(): is_animating = false)

func _animate_fallen_wheel() -> void:
	if not wheel_pivot:
		is_animating = false
		return
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(wheel_pivot, "position", Vector3(0.76, 0.14, 0.42), 0.36).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)
	tw.tween_property(wheel_pivot, "rotation_degrees", Vector3(84.0, -24.0, 18.0), 0.36).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.finished.connect(func(): is_animating = false)

func _update_collider_for_state() -> void:
	if not wheel_collider:
		return
	for child in wheel_collider.get_children():
		if child is CollisionShape3D and child.shape is BoxShape3D:
			var box := child.shape as BoxShape3D
			if helm_state == "attached":
				box.size = Vector3(0.95, 1.6, 1.45)
				child.position = Vector3(0.10, 0.80, 0.0)
			else:
				# Con la rueda fuera del eje, el pedestal ocupa mucho menos ancho de paso
				box.size = Vector3(0.68, 1.15, 0.62)
				child.position = Vector3(0.0, 0.58, 0.0)

func _update_prompt_texts() -> void:
	match helm_state:
		"caught":
			prompt_text = "Examinar Timón (sujetado)"
		"fallen":
			prompt_text = "Examinar Timón caído"
		_:
			prompt_text = "Examinar o girar el Timón"
	if is_player_nearby:
		var inv := get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.show_prompt("[T] " + prompt_text)

func _play_creak() -> void:
	if _wheel_sfx and is_inside_tree():
		_wheel_sfx.stream = PecioSfxKit.make_wood_creak()
		if DisplayServer.get_name() != "headless":
			_wheel_sfx.play()

func _play_crash_and_alert() -> void:
	if _wheel_sfx and is_inside_tree():
		_wheel_sfx.stream = PecioSfxKit.make_helm_crash()
		if DisplayServer.get_name() != "headless":
			_wheel_sfx.play()
	start_c4_bang_loop(true)

func _get_active_hero_dex_mod() -> int:
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt_ui and vtt_ui.has_method("get_active_actor"):
		var actor: Dictionary = vtt_ui.get_active_actor()
		var abilities: Dictionary = actor.get("abilities", {})
		if abilities.has("DES"):
			return int(floor((float(abilities["DES"]) - 10.0) * 0.5))
	return 1

func _notify_player(msg: String) -> void:
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if inv and inv.has_method("show_notification"):
		inv.show_notification(msg)
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt_ui and vtt_ui.has_method("notify_mesa"):
		vtt_ui.notify_mesa(msg)

func _sync_ui_after_change() -> void:
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt_ui and vtt_ui.has_method("refresh_all"):
		vtt_ui.refresh_all()
