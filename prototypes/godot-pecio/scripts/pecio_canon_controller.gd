class_name PecioCanonController
extends Node

# Controlador Canónico del Capítulo 3 (Pecio Rosa de los Vientos, PDF pp. 22-27)
# Centraliza:
# - Zombis reactivos de C4 (alerta tras timón o >1 fallo en DoorC4 + golpes periódicos)
# - Escalado nivel 1 / nivel 2 (3er zombi C4, +2 zombis C8, 2ª arpía C2)
# - Regreso automático de la arpía (cofre C9 -> volver a C8, o descanso a bordo) y resoluciones no letales
# - Puerta atrancada C4 (Fuerza CD 10), Cajones/Brújula C4, Cangrejos inofensivos C5
# - Tablón/Trampa de aguja C6 (Percepción CD 10, dardo +5 / 1d4 + CON CD 11 1d6, 200 po)
# - Cajas saqueables C8 con tabla canónica 1d6 única por resultado
# - Cofre de hierro ~60 kg C9 (abrir sumergido con burbuja + paquete flotante / izar, 5 tesoros, Bitácora y Talismán de Orcus)
# - Epílogo de la maldición (Runara / tumba de Brastos / destruir a bordo)
# - Faroles del pecio apagados por defecto y encendibles/apagables con [T]

const ThemeKit = preload("res://scripts/vtt_ui_theme.gd")
const SfxKit = preload("res://scripts/pecio_sfx_kit.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PecioWorldState = preload("res://scripts/pecio_world_state.gd")

const C8_CRATE_TABLE := {
	1: {"id": "c8_fine_wine", "name": "Caja de vino fino (100 po)", "desc": "4 botellas selladas con cera que resistieron el naufragio."},
	2: {"id": "c8_cloves_spices", "name": "Saco de clavos y especias (50 po)", "desc": "Especias aromáticas intactas en lona encerada."},
	3: {"id": "c8_silver_ingots", "name": "Lingotes de plata (100 po)", "desc": "Barras de plata mercantil grabadas con sello de Neverwinter."},
	4: {"id": "c8_silver_candlesticks", "name": "Candelabros de plata (75 po)", "desc": "Juego de candelabros de plata labrada."},
	5: {"id": "c8_crafted_lute", "name": "Laúd artesanal (100 po)", "desc": "Instrumento de fina marquetería en estuche hermético."},
	6: {"id": "c8_spell_scroll", "name": "Pergamino de conjuro", "desc": "Pergamino arcano sellado en tubo impermeable de cuero."},
}

var _sfx_player: AudioStreamPlayer
var _modal: PanelContainer
var _c4_bang_timer: float = 9.0
var _wander_time: float = 0.0
var _lantern_registry: Dictionary = {} # lantern_name -> {light, flame, glass, base_energy, ember_name, prop}
var _c5_crabs_scattered: bool = false
var _last_player_zone: String = "exterior"

func _ready() -> void:
	name = "PecioCanonController"
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "CanonSfxPlayer"
	_sfx_player.volume_db = -5.0
	add_child(_sfx_player)
	call_deferred("_post_ready_sync")

func _get_vtt_ui() -> Node:
	return get_tree().root.find_child("VttRoleUi", true, false) if is_inside_tree() else null

func _get_world_state() -> PecioWorldState:
	var ui := _get_vtt_ui()
	if ui and "world_state" in ui:
		return ui.world_state as PecioWorldState
	return null

func _notify(msg: String) -> void:
	var ui := _get_vtt_ui()
	if ui and ui.has_method("notify_mesa"):
		ui.notify_mesa(msg)
		return
	var inv := get_tree().root.find_child("InventoryManager", true, false)
	if inv and inv.has_method("show_notification"):
		inv.show_notification(msg)

func _play_sfx(stream: AudioStreamWAV) -> void:
	if _sfx_player and stream and DisplayServer.get_name() != "headless":
		_sfx_player.stream = stream
		_sfx_player.play()

func _post_ready_sync() -> void:
	if not is_inside_tree():
		return
	_auto_register_ship_lanterns()
	var ws := _get_world_state()
	if ws:
		apply_party_level(ws.party_level, false)
		apply_strict_canon_mode(ws.strict_canon_mode, false)
		sync_c4_zombies_behavior()
		sync_c6_stash_visuals()
		sync_c9_chest_visuals()
		sync_persisted_doors()
		sync_all_lanterns_from_state()

func _auto_register_ship_lanterns() -> void:
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if not vessel:
		return
	for light: OmniLight3D in vessel.find_children("*", "OmniLight3D", true, false):
		if not light.has_meta("lantern_base_energy"):
			continue
		var base_e := float(light.get_meta("lantern_base_energy"))
		var ember_nm := str(light.get_meta("lantern_ember_name")) if light.has_meta("lantern_ember_name") else ""
		var prop_n: Node = light.get_meta("lantern_prop") if light.has_meta("lantern_prop") else null
		var housing: Node = light.get_meta("lantern_housing") if light.has_meta("lantern_housing") else null
		var flame_n: Node3D = housing.find_child("LanternFlame", true, false) as Node3D if housing else null
		var glass_n: MeshInstance3D = housing.find_child("LanternGlass", true, false) as MeshInstance3D if housing else (light.get_meta("lantern_glass") as MeshInstance3D if light.has_meta("lantern_glass") else null)
		register_lantern(light.name, light, flame_n, glass_n, base_e, ember_nm, prop_n)

# ==============================================================================
# MODAL REUTILIZABLE DE DECISIONES CANÓNICAS
# ==============================================================================
func show_choice_modal(title_text: String, body_text: String, buttons: Array) -> void:
	var ui := _get_vtt_ui()
	if not ui or not ("ui_root" in ui) or not ui.ui_root:
		return
	if _modal and is_instance_valid(_modal):
		_modal.queue_free()
	_modal = ThemeKit.make_window_panel(ThemeKit.COL_GOLD, 14)
	_modal.name = "PecioCanonModal"
	_modal.set_anchors_preset(Control.PRESET_CENTER)
	_modal.offset_left = -255
	_modal.offset_top = -170
	_modal.offset_right = 255
	_modal.offset_bottom = 170
	ui.ui_root.add_child(_modal)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	_modal.add_child(vb)

	var title := ThemeKit.make_label(title_text, 16, ThemeKit.COL_HEADING)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(title)

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(460, 120)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vb.add_child(scroll)

	var desc := ThemeKit.make_label(body_text, 13, ThemeKit.COL_INK)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.custom_minimum_size = Vector2(440, 0)
	scroll.add_child(desc)

	var btn_box := VBoxContainer.new()
	btn_box.add_theme_constant_override("separation", 6)
	vb.add_child(btn_box)

	for b_cfg in buttons:
		var b := Button.new()
		b.text = str(b_cfg.get("label", "Aceptar"))
		b.disabled = bool(b_cfg.get("disabled", false))
		var style_kind := str(b_cfg.get("style", "secondary"))
		ThemeKit.style_button(b, style_kind, 8, 10, 6)
		var cb: Callable = b_cfg.get("cb", Callable())
		var keep_open := bool(b_cfg.get("keep_open", false))
		b.pressed.connect(func():
			if not keep_open and is_instance_valid(_modal):
				_modal.visible = false
			if cb.is_valid():
				cb.call()
		)
		btn_box.add_child(b)

	var close_b := Button.new()
	close_b.text = "Cerrar"
	ThemeKit.style_button(close_b, "ghost", 6, 8, 4)
	close_b.pressed.connect(func():
		if is_instance_valid(_modal):
			_modal.visible = false
	)
	vb.add_child(close_b)
	ui.ui_root.move_child(_modal, ui.ui_root.get_child_count() - 1)

# ==============================================================================
# A1/A2/A3 · ZOMBIS C4 REACTIVOS, NIVEL 1/2 Y REGRESO DE LA ARPÍA
# ==============================================================================
func _process(delta: float) -> void:
	if not is_inside_tree():
		return
	var ws := _get_world_state()
	if not ws:
		return

	_wander_time += delta
	_update_c4_zombies_idle_or_banging(delta, ws)
	_check_harpy_return_on_c8_reentry(ws)

func _update_c4_zombies_idle_or_banging(delta: float, ws: PecioWorldState) -> void:
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if not vessel:
		return
	var door_c4 := vessel.find_child("DoorC4", true, false)
	var door_closed := door_c4 != null and not bool(door_c4.get("is_open"))
	var z_a := vessel.get_node_or_null("ZombieC4_A") as Node3D
	var z_b := vessel.get_node_or_null("ZombieC4_B") as Node3D

	if ws.c4_zombies_alerted:
		if z_a:
			z_a.position = z_a.position.lerp(Vector3(-14.65, 0.1, -1.75), clampf(delta * 2.5, 0.0, 1.0))
		if z_b:
			z_b.position = z_b.position.lerp(Vector3(-14.95, 0.1, -2.55), clampf(delta * 2.5, 0.0, 1.0))
		if door_closed:
			_c4_bang_timer -= delta
			if _c4_bang_timer <= 0.0:
				_c4_bang_timer = randf_range(10.5, 14.5)
				_play_sfx(SfxKit.make_c4_zombie_bang())
				if door_c4 is Node3D:
					var orig_x: float = door_c4.position.x
					var tw := create_tween()
					tw.tween_property(door_c4, "position:x", orig_x + 0.045, 0.06)
					tw.tween_property(door_c4, "position:x", orig_x, 0.09)
	else:
		# Vagar suavemente dentro de C4 cuando NO han sido alertados
		if z_a:
			z_a.position.x = -19.5 + sin(_wander_time * 0.42) * 1.15
			z_a.position.z = -3.4 + cos(_wander_time * 0.35) * 0.65
		if z_b:
			z_b.position.x = -23.2 + cos(_wander_time * 0.38) * 0.95
			z_b.position.z = -2.9 + sin(_wander_time * 0.45) * 0.55

func sync_c4_zombies_behavior() -> void:
	var ws := _get_world_state()
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if not ws or not vessel:
		return
	var z_a := vessel.get_node_or_null("ZombieC4_A") as Node3D
	var z_b := vessel.get_node_or_null("ZombieC4_B") as Node3D
	if ws.c4_zombies_alerted:
		if z_a: z_a.position = Vector3(-14.65, 0.1, -1.75)
		if z_b: z_b.position = Vector3(-14.95, 0.1, -2.55)

func apply_party_level(lvl: int, save_flag: bool = true) -> void:
	var ws := _get_world_state()
	if ws:
		if save_flag:
			ws.set_party_level(lvl)
		else:
			ws.party_level = clampi(lvl, 1, 3)
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	var is_lvl2 := lvl >= 2
	if vessel:
		for n_name in ["ZombieC4_C_Lvl2", "ZombieC8_B_Lvl2", "ZombieC8_C_Lvl2"]:
			var tok := vessel.get_node_or_null(n_name) as Node3D
			if tok:
				tok.set_meta("adventure_present", is_lvl2)
				tok.visible = is_lvl2
		var h2 := vessel.get_node_or_null("HarpyToken_C2") as Node3D
		if h2:
			var show_h2 := is_lvl2 and (ws != null and ws.harpy_present)
			h2.set_meta("adventure_present", show_h2)
			h2.visible = show_h2
	var ui := _get_vtt_ui()
	if ui and "enemies" in ui:
		for e in ui.enemies:
			if int(e.get("min_level", 1)) >= 2:
				e["revealed"] = is_lvl2 and (e["id"] != "harpy_c2_lvl2" or (ws != null and ws.harpy_present))
	var roof := get_tree().root.find_child("RoofCutout", true, false)
	if roof and roof.has_method("_sync_entity_visibility"):
		roof._sync_entity_visibility(roof.current_interior_state)
	if save_flag:
		_notify("Nivel de encuentro ajustado a Nivel %d (%s)" % [lvl, "refuerzos en C4, C8 y 2ª arpía en C2 activos" if is_lvl2 else "encuentros estándar Nivel 1"])

func _check_harpy_return_on_c8_reentry(ws: PecioWorldState) -> void:
	var roof := get_tree().root.find_child("RoofCutout", true, false)
	if not roof:
		return
	var cur_mode: String = str(roof.current_interior_state)
	if cur_mode != _last_player_zone:
		var was_c9 := (_last_player_zone == "lower_c9_hold")
		_last_player_zone = cur_mode
		if was_c9 and cur_mode != "lower_c9_hold" and ws.c9_chest_found and not ws.harpy_return_triggered and ws.harpy_state == "absent":
			trigger_harpy_return("Al regresar de la bodega C9 con el hallazgo del cofre")

func trigger_harpy_return(reason: String = "") -> void:
	var ws := _get_world_state()
	if not ws:
		return
	ws.harpy_return_triggered = true
	ws.harpy_state = "returned"
	ws.set_harpy_present(true)
	var ui := _get_vtt_ui()
	if ui and ui.has_method("_apply_harpy_world_presence"):
		ui._apply_harpy_world_presence(true, true)
	apply_party_level(ws.party_level, false)
	_play_sfx(SfxKit.make_harpy_return())
	var extra_c2 := " ¡Una SEGUNDA arpía aterriza en la balista de C2 (Nivel 2)!" if ws.party_level >= 2 else ""
	_notify("🦅 ¡Regreso de la Arpía! %s, un golpe pesado sacude la cofa y resuena su Canto Cautivador (SAV SAB CD 11).%s" % [reason, extra_c2])
	if ui and ui.has_method("refresh_all"):
		ui.refresh_all()

func resolve_harpy(resolution: String) -> void:
	var ws := _get_world_state()
	if not ws:
		return
	ws.set_harpy_resolution(resolution)
	var ui := _get_vtt_ui()
	if ui and ui.has_method("_apply_harpy_world_presence"):
		ui._apply_harpy_world_presence(false, true)
	apply_party_level(ws.party_level, false)
	var msg := ""
	match resolution:
		"negotiated":
			msg = "🕊 Arpía persuadida / botín devuelto: abandona el pecio sin combate. Recuerda (PDF p. 27): esto reduce los naufragios, pero NO levanta la maldición del barco."
		"fled":
			msg = "🪶 La arpía huye herida (<50 % PG) hacia el mar abierto. La maldición de Orcus sigue activa hasta resolver el Talismán."
		"defeated":
			msg = "⚔ Arpía derrotada. Los naufragios cesarán, pero el pecio no desaparecerá hasta romper la maldición con el Talismán de Orcus."
		_:
			msg = "Estado de arpía actualizado: " + resolution
	_notify(msg)
	if ui and ui.has_method("refresh_all"):
		ui.refresh_all()

func open_ship_rest_modal() -> void:
	show_choice_modal(
		"DESCANSO A BORDO DEL PECIO (PDF p. 27)",
		"Descansar en el Rosa de los Vientos permite recuperar fuerzas, pero según el capítulo, completar un descanso corto o largo a bordo hace regresar a la arpía cazadora a la cofa.",
		[
			{"label": "Descanso corto (1 hora · recupera dados de golpe)", "style": "primary", "cb": func(): _complete_ship_rest(false)},
			{"label": "Descanso largo (8 horas · restaura PG completos)", "style": "secondary", "cb": func(): _complete_ship_rest(true)},
		]
	)

func _complete_ship_rest(is_long: bool) -> void:
	var ui := _get_vtt_ui()
	if ui:
		if "clock_seconds" in ui:
			ui.clock_seconds += (28800 if is_long else 3600)
		if is_long and "actors" in ui:
			for a in ui.actors:
				a["hp"] = a.get("hp_max", a.get("hp", 10))
		ui.refresh_all()
	_notify("⛺ %s completado a bordo." % ("Descanso largo" if is_long else "Descanso corto"))
	var ws := _get_world_state()
	if ws and not ws.harpy_return_triggered and ws.harpy_state == "absent":
		trigger_harpy_return("Tras completar el descanso a bordo")

# ==============================================================================
# B4 · PUERTA ATRANCADA C4 (FUERZA CD 10, >1 FALLO ALERTA A C4)
# ==============================================================================
func open_c4_barred_door_modal(door: Node) -> void:
	var ws := _get_world_state()
	var fails := ws.c4_door_fail_count if ws else 0
	var warn := "\n⚠ Ya hubo %d intento fallido: otro fallo alertará a los zombis tras la puerta." % fails if fails == 1 else ("\n⚠ Los zombis de C4 ya están alertados golpeando la puerta." if fails > 1 else "")
	show_choice_modal(
		"PUERTA ATRANCADA · CAMAROTE DEL CAPITÁN (C4 · CD 10)",
		"Un listón de madera podrido atranca la puerta por dentro. Se requiere una prueba de Fuerza CD 10 para derribarla (si se falla más de un intento, los zombis de C4 se sitúan detrás y golpean cada 10–15 s)." + warn,
		[
			{"label": "🎲 Forzar puerta (Tirar 1d20 + FUE vs CD 10)", "style": "primary", "cb": func(): _roll_c4_barred_door(door)},
			{"label": "✓ Arbitraje DM: Supera y abre", "style": "secondary", "cb": func(): resolve_c4_barred_door(door, true)},
			{"label": "✕ Arbitraje DM: Falla el intento", "style": "combat", "cb": func(): resolve_c4_barred_door(door, false)},
		]
	)

func _roll_c4_barred_door(door: Node) -> void:
	var ui := _get_vtt_ui()
	var str_score := 12
	var actor_name := "Aventurero"
	if ui and ui.has_method("get_active_actor"):
		var a: Dictionary = ui.get_active_actor()
		actor_name = str(a.get("name", actor_name))
		str_score = int(a.get("abilities", {}).get("FUE", 12))
	var mod := int(floor(float(str_score - 10) / 2.0))
	var d20 := randi_range(1, 20)
	var total := d20 + mod
	var ok := total >= 10
	_notify("🎲 %s fuerza la puerta de C4: 1d20(%d) %+d = %d vs CD 10 → %s" % [actor_name, d20, mod, total, "¡ABRE!" if ok else "FALLA"])
	resolve_c4_barred_door(door, ok)

func resolve_c4_barred_door(door: Node, succeeded: bool) -> void:
	var ws := _get_world_state()
	if succeeded:
		if ws:
			ws.mark_c4_door_unbarred()
		_play_sfx(SfxKit.make_plank_snap())
		if door and door.has_method("force_unbar_and_open"):
			door.force_unbar_and_open()
		_notify("🚪 ¡El listón podrido cede con un crujido! La puerta del camarote del capitán (C4) queda abierta.")
	else:
		_play_sfx(SfxKit.make_wood_creak())
		if ws:
			var alerted := ws.record_c4_door_fail()
			if alerted:
				sync_c4_zombies_behavior()
				_play_sfx(SfxKit.make_c4_zombie_bang())
				_notify("🧟 ¡El estruendo alerta a los zombis de C4! Se agolpan tras la puerta golpeándola con furia cada 10–15 s.")
			else:
				_notify("La puerta resiste el primer envite (fallos: %d). Un segundo fallo alertará a los ocupantes de C4." % ws.c4_door_fail_count)

func sync_persisted_doors() -> void:
	var ws := _get_world_state()
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if not ws or not vessel:
		return
	for d_name in ["DoorC4", "DoorC5", "DoorC6", "DoorC7"]:
		var d := vessel.get_node_or_null(d_name)
		if not d:
			continue
		var did := str(d.get("door_id"))
		if did == "c4-barred-door" and ws.c4_door_unbarred:
			d.set("has_bar_removed", true)
			if d.get("door_bar_mesh"):
				d.get("door_bar_mesh").visible = false
		if ws.opened_doors.has(did):
			d.set("is_open", bool(ws.opened_doors[did]))
			if d.has_method("update_door_state"):
				d.update_door_state(true)

# ==============================================================================
# B8 · ESCRITORIO DE C4 (CAJONES: 50 po, CARTÓGRAFO, DAGA) + BRÚJULA DESMONTABLE (25 po)
# ==============================================================================
func open_c4_desk_modal() -> void:
	var ws := _get_world_state()
	var drawers_done := ws != null and ws.c4_desk_looted
	var compass_done := ws != null and ws.c4_compass_taken
	show_choice_modal(
		"ESCRITORIO DE TRES PATAS DEL CAPITÁN (C4 · PDF p. 24)",
		"Un escritorio inclinado con la carta náutica de la Costa de la Espada, cajones hinchados por la humedad y una fina brújula de latón atornillada al tablero.",
		[
			{"label": "Examinar Carta Náutica", "style": "secondary", "cb": func(): _notify("🗺 La carta náutica señala los arrecifes del norte y la derrota mortal del Rosa de los Vientos.")},
			{"label": "Registrar cajones (50 po, herramientas de cartógrafo y daga)" if not drawers_done else "Cajones ya registrados ✓", "disabled": drawers_done, "style": "primary", "cb": func(): _loot_c4_drawers()},
			{"label": "Desmontar brújula de latón (25 po)" if not compass_done else "Brújula ya desmontada ✓", "disabled": compass_done, "style": "primary", "cb": func(): _loot_c4_compass()},
		]
	)

func _loot_c4_drawers() -> void:
	var ws := _get_world_state()
	if ws and ws.c4_desk_looted:
		return
	if ws:
		ws.c4_desk_looted = true
		ws.save_state()
	var ui := _get_vtt_ui()
	if ui and ui.has_method("add_inventory_item"):
		ui.add_inventory_item("gold", 50, "50 po (cajones C4)")
		ui.add_inventory_item("cartographer_tools", 1, "Herramientas de cartógrafo")
		ui.add_inventory_item("dagger", 1, "Daga")
	_hide_legacy_pickups(["PickupCartographerC4", "PickupDaggerC4", "PickupGoldC4"])
	_notify("✨ Cajones de C4 registrados: +50 po, Herramientas de cartógrafo y 1 Daga.")

func _loot_c4_compass() -> void:
	var ws := _get_world_state()
	if ws and ws.c4_compass_taken:
		return
	if ws:
		ws.c4_compass_taken = true
		ws.save_state()
	var ui := _get_vtt_ui()
	if ui and ui.has_method("add_inventory_item"):
		ui.add_inventory_item("compass", 1, "Brújula náutica (25 po)")
	_hide_legacy_pickups(["PickupCompassC4"])
	_notify("🧭 Desmontas la brújula de latón del escritorio (valor: 25 po).")

func _hide_legacy_pickups(names: Array[String]) -> void:
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	if not vessel:
		return
	for nm in names:
		var p := vessel.get_node_or_null(nm)
		if p and p.has_method("mark_collected_silent"):
			p.mark_collected_silent()

# ==============================================================================
# B8 · C5 CANGREJOS INOFENSIVOS Y ESQUELETO SIN CABEZA (FALSA ALARMA)
# ==============================================================================
func trigger_c5_crabs_scatter() -> void:
	var aft := get_tree().root.find_child("AftCabins_C4_C5", true, false) as Node3D
	if aft and not _c5_crabs_scattered:
		_c5_crabs_scattered = true
		for child in aft.find_children("GalleyCrab_*", "Node3D", true, false):
			var c3 := child as Node3D
			var tw := create_tween()
			var away := Vector3(randf_range(-1.6, 1.4), 0.0, randf_range(0.6, 1.8))
			tw.tween_property(c3, "position", c3.position + away, 0.85).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_notify("🦀 ¡Falsa alarma! Los huesos se movían por media docena de pequeños cangrejos inofensivos que huyen al acercarte (PDF p. 24: sin combate).")

# ==============================================================================
# B3 · C6 TABLÓN SUELTO Y TRAMPA DE AGUJA (PERCEPCIÓN CD 10 · 200 po)
# ==============================================================================
func sync_c6_stash_visuals() -> void:
	var ws := _get_world_state()
	var state := ws.c6_stash_state if ws else "hidden"
	# Ocultar siempre el antiguo cubo brillante PickupStashC6 (unificado en TrappedStash_C6)
	_hide_legacy_pickups(["PickupStashC6"])
	var stash_node := get_tree().root.find_child("TrappedStash_C6", true, false) as Node3D
	if stash_node:
		var needle := stash_node.find_child("TrapNeedleC6", true, false) as Node3D
		if needle:
			needle.visible = (state == "discovered")
		var prop := stash_node.find_child("PropTrapC6", true, false)
		if prop:
			match state:
				"hidden": prop.prompt_text = "Inspeccionar tablones del suelo (Percepción CD 10)"
				"discovered": prop.prompt_text = "Alijo con Trampa de Aguja (C6)"
				"disarmed", "triggered": prop.prompt_text = "Recoger 200 po del Alijo Secreto (C6)"
				"looted": prop.prompt_text = "Alijo Secreto de C6 (vacío)"

func open_c6_stash_modal() -> void:
	var ws := _get_world_state()
	var state := ws.c6_stash_state if ws else "hidden"
	match state:
		"hidden":
			show_choice_modal(
				"TABLONES DEL SUELO EN C6 (PDF p. 24)",
				"Una junta de madera junto a las literas parece ligeramente levantada. Se requiere Percepción CD 10 para descubrir el alijo oculto.",
				[
					{"label": "🎲 Buscar con Percepción (1d20 + SAB vs CD 10)", "style": "primary", "cb": func(): _roll_c6_perception()},
					{"label": "✓ Arbitraje DM: Descubrir tablón suelto", "style": "secondary", "cb": func(): _discover_c6_stash()},
				]
			)
		"discovered":
			show_choice_modal(
				"ALIJO CON TRAMPA DE AGUJA ENVENENADA (C6)",
				"Bajo el tablón suelto se aprecia un mecanismo de resorte con un dardo envenenado (+5 ataque, 1d4 perf. + Salv. CON CD 11 o 1d6 veneno) y una bolsa pesada de oro.",
				[
					{"label": "🛠 Desarmar resorte (Juego de Manos / Herramientas CD 11)", "style": "primary", "cb": func(): _attempt_disarm_c6()},
					{"label": "🪝 Abrir desde distancia segura (el dardo falla automáticamente)", "style": "secondary", "cb": func(): _open_c6_safe_distance()},
					{"label": "✋ Levantar tablón directamente (dispara el dardo)", "style": "combat", "cb": func(): _trigger_c6_dart_and_open()},
				]
			)
		"disarmed", "triggered":
			_loot_c6_200gp()
		"looted":
			_notify("El hueco bajo el tablón de C6 ya está vacío (las 200 po fueron recogidas).")

func _roll_c6_perception() -> void:
	var ui := _get_vtt_ui()
	var wis := 12
	var nm := "Aventurero"
	if ui and ui.has_method("get_active_actor"):
		var a: Dictionary = ui.get_active_actor()
		nm = str(a.get("name", nm))
		wis = int(a.get("abilities", {}).get("SAB", 12))
	var mod := int(floor(float(wis - 10) / 2.0))
	var d20 := randi_range(1, 20)
	if d20 + mod >= 10:
		_notify("👁 %s descubre el tablón suelto de C6 (1d20(%d) %+d = %d vs CD 10)." % [nm, d20, mod, d20 + mod])
		_discover_c6_stash()
	else:
		_notify("👁 %s no percibe nada anómalo aún (1d20(%d) %+d = %d vs CD 10)." % [nm, d20, mod, d20 + mod])

func _discover_c6_stash() -> void:
	var ws := _get_world_state()
	if ws:
		ws.set_c6_stash_state("discovered")
	sync_c6_stash_visuals()
	open_c6_stash_modal()

func _attempt_disarm_c6() -> void:
	var ui := _get_vtt_ui()
	var dex := 14
	var nm := "Aventurero"
	if ui and ui.has_method("get_active_actor"):
		var a: Dictionary = ui.get_active_actor()
		nm = str(a.get("name", nm))
		dex = int(a.get("abilities", {}).get("DES", 14))
	var mod := int(floor(float(dex - 10) / 2.0)) + 2
	var d20 := randi_range(1, 20)
	if d20 + mod >= 11:
		var ws := _get_world_state()
		if ws: ws.set_c6_stash_state("disarmed")
		_notify("🛠 ¡%s desarma limpiamente la aguja (1d20(%d) %+d = %d)!" % [nm, d20, mod, d20 + mod])
		_loot_c6_200gp()
	else:
		_notify("⚠ %s tropieza con el resorte al desarmarlo (1d20(%d) %+d = %d)." % [nm, d20, mod, d20 + mod])
		_trigger_c6_dart_and_open()

func _open_c6_safe_distance() -> void:
	_play_sfx(SfxKit.make_dart_trap())
	var ws := _get_world_state()
	if ws: ws.set_c6_stash_state("triggered")
	_notify("🪝 ¡ZAS! El dardo envenenado se clava en la pared vacía desde distancia segura (trampa gastada).")
	_loot_c6_200gp()

func _trigger_c6_dart_and_open() -> void:
	_play_sfx(SfxKit.make_dart_trap())
	var ws := _get_world_state()
	if ws: ws.set_c6_stash_state("triggered")
	var ui := _get_vtt_ui()
	var atk := randi_range(1, 20) + 5
	var ac := 14
	var actor_id := "mia"
	var nm := "Aventurero"
	var con_mod := 1
	if ui and ui.has_method("get_active_actor"):
		var a: Dictionary = ui.get_active_actor()
		actor_id = str(a.get("id", "mia"))
		nm = str(a.get("name", nm))
		ac = int(a.get("ac", 14))
		con_mod = int(floor(float(int(a.get("abilities", {}).get("CON", 12)) - 10) / 2.0))
	if atk >= ac:
		var pierce := randi_range(1, 4)
		var save_roll := randi_range(1, 20) + con_mod
		var poison := randi_range(1, 6) if save_roll < 11 else 0
		var total_dmg := pierce + poison
		if ui and ui.has_method("apply_hp_delta"):
			ui.apply_hp_delta(actor_id, -total_dmg)
		_notify("☠ ¡Dardo impacta a %s (ataque %d vs CA %d)! %d perf.%s" % [nm, atk, ac, pierce, " + %d veneno (CON %d vs CD 11)" % [poison, save_roll] if poison > 0 else " (supera CON %d vs CD 11, sin veneno)" % save_roll])
	else:
		_notify("🛡 El dardo (+5 → %d) rebota contra la armadura de %s (CA %d). Trampa agotada." % [atk, nm, ac])
	_loot_c6_200gp()

func _loot_c6_200gp() -> void:
	var ws := _get_world_state()
	if ws and ws.c6_stash_state == "looted":
		return
	if ws:
		ws.set_c6_stash_state("looted")
	var ui := _get_vtt_ui()
	if ui and ui.has_method("add_inventory_item"):
		ui.add_inventory_item("gold", 200, "200 po (Alijo Secreto C6)")
	sync_c6_stash_visuals()
	_notify("💰 ¡Alijo secreto de C6 recuperado! +200 piezas de oro reales añadidas a la mochila.")

# ==============================================================================
# B2 · CAJAS SAQUEABLES DE C8 (TABLA CANÓNICA 1d6 ÚNICA POR RESULTADO · PDF p. 25)
# ==============================================================================
func open_c8_crate_modal(crate_id: String) -> void:
	var ws := _get_world_state()
	if ws and ws.c8_crates_opened.has(crate_id):
		var prev := int(ws.c8_crates_opened[crate_id])
		var prev_txt := str(C8_CRATE_TABLE[prev]["name"]) if C8_CRATE_TABLE.has(prev) else "mercancía podrida"
		_notify("📦 Esta caja de C8 ya fue abierta (%s)." % prev_txt)
		return
	var rolled: Array = ws.c8_rolled_results if ws else []
	var remaining: Array[int] = []
	for i in range(1, 7):
		if not rolled.has(i):
			remaining.append(i)
	var btns: Array = []
	btns.append({
		"label": "🎲 Abrir caja y tirar 1d6 (1 min con palanqueta · 10 min sin ella)",
		"style": "primary",
		"cb": func():
			var d6 := randi_range(1, 6)
			resolve_c8_crate(crate_id, d6)
	})
	for r_num in remaining:
		var entry: Dictionary = C8_CRATE_TABLE[r_num]
		btns.append({
			"label": "DM · Resultado d6 #%d: %s" % [r_num, entry["name"]],
			"style": "secondary",
			"cb": func(): resolve_c8_crate(crate_id, r_num)
		})
	if remaining.is_empty():
		btns.append({
			"label": "Registrar caja (ya salieron los 6 tesoros únicos de C8)",
			"style": "secondary",
			"cb": func(): resolve_c8_crate(crate_id, 0)
		})
	show_choice_modal(
		"CAJA DE CARGA EN SENTINA C8 (TABLA 1d6 · PDF p. 25)",
		"Abrir una caja lleva 1 minuto con palanqueta o 10 minutos sin ella. Según el PDF, cada resultado 1–6 solo puede obtenerse una vez; si se repite un número, la caja contiene género podrido (o adjudica el DM).",
		btns
	)

func resolve_c8_crate(crate_id: String, roll_val: int) -> void:
	var ws := _get_world_state()
	var already_taken := ws != null and roll_val > 0 and ws.c8_rolled_results.has(roll_val)
	if ws:
		ws.record_c8_crate_roll(crate_id, 0 if already_taken else roll_val)
	_play_sfx(SfxKit.make_wood_creak())
	if roll_val >= 1 and roll_val <= 6 and not already_taken:
		var entry: Dictionary = C8_CRATE_TABLE[roll_val]
		var ui := _get_vtt_ui()
		if ui and ui.has_method("add_inventory_item"):
			ui.add_inventory_item(str(entry["id"]), 1, str(entry["name"]))
		_notify("📦 Caja C8 (d6 = %d): ¡%s! %s" % [roll_val, entry["name"], entry["desc"]])
	else:
		_notify("📦 Caja C8 (d6 = %d): %s" % [roll_val, "Resultado repetido — solo telas y provisiones empapadas sin valor." if already_taken else "Mercancía podrida por décadas bajo el agua."])

# ==============================================================================
# B1 · COFRE DE HIERRO ~60 kg EN C9 + BURBUJA + PAQUETE ENCERADO + BITÁCORA + TALISMÁN
# ==============================================================================
func sync_c9_chest_visuals() -> void:
	var ws := _get_world_state()
	var st := ws.c9_chest_state if ws else "submerged"
	_hide_legacy_pickups(["PickupHoldChestC9"])
	var chest_prop := get_tree().root.find_child("PropIronChestC9", true, false)
	if chest_prop:
		chest_prop.prompt_text = "Revisar Cofre de Hierro C9 (Bitácora y Talismán)" if st in ["opened_underwater", "hoisted", "looted"] else "Cofre de Hierro Sumergido (~60 kg · C9)"

func open_c9_chest_modal() -> void:
	var ws := _get_world_state()
	var st := ws.c9_chest_state if ws else "submerged"
	if st in ["opened_underwater", "hoisted", "looted"]:
		open_logbook_and_talisman_modal()
		return
	show_choice_modal(
		"COFRE DE HIERRO SUMERGIDO (~60 kg · C9 · PDF p. 26)",
		"Un pesado cofre de hierro caído por el boquete P13/P14 descansa sobre el limo de la bodega inundada.\n• Si lo abres bajo el agua, se escapa una gran burbuja de aire y un paquete de cuero encerado asciende flotando hacia el techo.\n• También podéis atarle una cuerda e izarlo (~60 kg) por el agujero P14 o la escalera P15 antes de abrirlo.",
		[
			{"label": "🫧 Abrir bajo el agua (libera gran burbuja y paquete encerado flotante)", "style": "primary", "cb": func(): _collect_c9_chest(true)},
			{"label": "🪢 Izar el cofre (~60 kg) por P14 / escalera y abrirlo arriba", "style": "secondary", "cb": func(): _collect_c9_chest(false)},
		]
	)

func _collect_c9_chest(opened_underwater: bool) -> void:
	var ws := _get_world_state()
	if ws and ws.c9_chest_state in ["opened_underwater", "hoisted", "looted"]:
		open_logbook_and_talisman_modal()
		return
	if ws:
		ws.mark_c9_chest_state("opened_underwater" if opened_underwater else "hoisted")
	if opened_underwater:
		_play_sfx(SfxKit.make_bubble_burst())
		_spawn_c9_waxed_parcel_float_vfx()
	else:
		_play_sfx(SfxKit.make_wood_creak())
	var ui := _get_vtt_ui()
	if ui and ui.has_method("add_inventory_item"):
		ui.add_inventory_item("gold", 55, "55 po (Cofre C9)")
		ui.add_inventory_item("turquoise_c9", 3, "Turquesa (10 po c/u)")
		ui.add_inventory_item("boots_of_elvenkind", 1, "Botas élficas")
		ui.add_inventory_item("captain_logbook", 1, "Bitácora protegida de Aleitha")
		ui.add_inventory_item("orcus_talisman", 1, "Talismán de Orcus (Nigromancia)")
	sync_c9_chest_visuals()
	_notify("✨ ¡Cofre de C9 abierto! +55 po, 3 turquesas (10 po c/u), Botas élficas, Bitácora protegida y Talismán de Orcus.")
	open_logbook_and_talisman_modal()

func _spawn_c9_waxed_parcel_float_vfx() -> void:
	var c9 := get_tree().root.find_child("SubmergedHold_C9", true, false) as Node3D
	if not c9:
		return
	var parcel := MeshInstance3D.new()
	parcel.name = "FloatingWaxedParcel_C9"
	var bx := BoxMesh.new()
	bx.size = Vector3(0.38, 0.14, 0.28)
	parcel.mesh = bx
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("#6e5332")
	mat.roughness = 0.42
	parcel.material_override = mat
	parcel.position = WreckStructure.get_world_pos(-19.5, -5.85, -3.2)
	c9.add_child(parcel)
	var tw := create_tween()
	tw.tween_property(parcel, "position:y", -3.85, 2.2).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(3.0)
	tw.tween_callback(func():
		if is_instance_valid(parcel):
			parcel.queue_free()
	)

func open_logbook_and_talisman_modal() -> void:
	var ws := _get_world_state()
	if ws:
		ws.logbook_read = true
		ws.save_state()
	var t_state := ws.talisman_state if ws else "held"
	var body := (
		"BITÁCORA PROTEGIDA DE LA CAPITANA ALEITHA (PDF p. 26):\n"
		+ "«Tras la muerte de mi amado Brastos, rogué desesperada a Orcus, Señor de los No Muertos, para que nos reuniera para siempre. El barco encalló sobre los huesos del dragón y la maldición atrapó a toda mi tripulación.»\n\n"
		+ "TALISMÁN DE CABELLOS Y HUESOS (Estado: %s):\n"
		+ "• Marcando la última página cuelga un inquietante talismán trenzado con cabellos y huesos.\n"
		+ "• Detectar magia revela un aura poderosa de NIGROMANCIA.\n"
		+ "• Epílogo (PDF p. 27): llevarlo a Runara identifica la tumba de Brastos; enterrarlo/quemarlo allí o destruirlo a bordo rompe la maldición. Un suspiro recorre la bruma y el pecio se disolverá al día siguiente, otorgando al clérigo un sueño revelador y la subida de nivel."
	) % t_state
	show_choice_modal(
		"BITÁCORA DE ALEITHA Y TALISMÁN DE ORCUS (EPÍLOGO · PDF p. 27)",
		body,
		[
			{"label": "✨ Lanzar Detectar Magia sobre el Talismán", "style": "secondary", "keep_open": true, "cb": func(): _notify("🔮 Detectar magia: el Talismán de Orcus irradia un aura intensa y helada de NIGROMANCIA que liga el pecio al arrecife.")},
			{"label": "🐉 Llevar el Talismán a Runara (identifica tumba de Brastos)", "style": "secondary", "cb": func(): _resolve_curse("shown_runara")},
			{"label": "⚰ Enterrar o quemar en la tumba de Brastos (Rompe maldición)", "style": "primary", "cb": func(): _resolve_curse("buried_brastos")},
			{"label": "🔥 Destruir el Talismán a bordo (Rompe maldición)", "style": "combat", "cb": func(): _resolve_curse("destroyed_aboard")},
		]
	)

func _resolve_curse(new_state: String) -> void:
	var ws := _get_world_state()
	if ws:
		ws.set_talisman_state(new_state)
	match new_state:
		"shown_runara":
			_notify("🐉 Runara reconoce el lazo de Aleitha y señala la tumba de Brastos en el cementerio del claustro.")
		"buried_brastos", "destroyed_aboard":
			_play_sfx(SfxKit.make_harpy_return())
			_notify("🌫 ¡Maldición rota! Un suspiro espectral se eleva entre la niebla. El Rosa de los Vientos se disolverá al amanecer del día siguiente (sueño del clérigo y hito de subida de nivel).")

# ==============================================================================
# P01 AMARRE DEL BOTE Y MODO CANON ESTRICTO (EXTRAS VTT)
# ==============================================================================
func toggle_rowboat_mooring() -> void:
	var ws := _get_world_state()
	var moored := not (ws.boat_moored if ws else true)
	if ws:
		ws.boat_moored = moored
		ws.save_state()
	var painter := get_tree().root.find_child("MooringPainter", true, false) as Node3D
	if painter:
		painter.visible = moored
	_play_sfx(SfxKit.make_wood_creak())
	_notify("🪢 Bote de remos %s en la jarcia de estribor (P01)." % ("amarrado firmemente" if moored else "soltado y listo para remar"))

func apply_strict_canon_mode(enabled: bool, save_flag: bool = true) -> void:
	var ws := _get_world_state()
	if ws:
		if save_flag:
			ws.set_strict_canon_mode(enabled)
		else:
			ws.strict_canon_mode = enabled
	var vessel := get_tree().root.find_child("ShipVessel", true, false) as Node3D
	var roof := get_tree().root.find_child("RoofCutout", true, false)
	var in_lower_cutout := roof != null and str(roof.current_interior_state) in ["lower_c8_bilge", "lower_c9_hold", "lower_c8_c9"]
	if vessel:
		for extra_name in ["PickupPotionC5", "PickupTorchC1", "PickupTorchC4", "PickupTorchC7"]:
			var n := vessel.get_node_or_null(extra_name) as Node3D
			if n and not bool(n.get_meta("collected_c10", false)):
				n.visible = (not enabled) and (not in_lower_cutout)
				var area := n.find_child("PickupTrigger", true, false) as Area3D
				if area:
					area.monitoring = not enabled
	if save_flag:
		_notify("📖 Modo Canon Estricto: %s (poción de C5 y antorchas extra de cubierta %s)." % ["ACTIVADO" if enabled else "DESACTIVADO", "ocultas" if enabled else "visibles"])

# ==============================================================================
# FAROLES DEL PECIO APAGADOS POR DEFECTO Y ENCENDIBLES CON [T] (REQ. #7)
# ==============================================================================
func register_lantern(lantern_id: String, light: OmniLight3D, flame_node: Node3D, glass_node: MeshInstance3D, base_energy: float, ember_name: String = "", prop_node: Node = null) -> void:
	var ws := _get_world_state()
	var lit := ws.is_lantern_lit(lantern_id) if ws else false
	_lantern_registry[lantern_id] = {
		"light": light,
		"flame": flame_node,
		"glass": glass_node,
		"base_energy": base_energy,
		"ember_name": ember_name,
		"prop": prop_node,
		"lit": lit,
	}
	_apply_lantern_visuals(lantern_id, lit)

func is_lantern_lit(lantern_id: String) -> bool:
	if _lantern_registry.has(lantern_id):
		return bool(_lantern_registry[lantern_id]["lit"])
	var ws := _get_world_state()
	return ws.is_lantern_lit(lantern_id) if ws else false

func toggle_lantern(lantern_id: String) -> bool:
	if not _lantern_registry.has(lantern_id):
		return false
	var next_lit := not bool(_lantern_registry[lantern_id]["lit"])
	set_lantern_lit(lantern_id, next_lit, true)
	return next_lit

func set_lantern_lit(lantern_id: String, lit: bool, announce: bool = false) -> void:
	if not _lantern_registry.has(lantern_id):
		return
	_lantern_registry[lantern_id]["lit"] = lit
	var ws := _get_world_state()
	if ws:
		ws.set_lantern_lit(lantern_id, lit)
	_apply_lantern_visuals(lantern_id, lit)
	if announce:
		_play_sfx(SfxKit.make_flint_ignite())
		_notify("🔥 Farol encendido." if lit else "💨 Farol apagado.")

func set_all_lanterns(lit: bool) -> void:
	for lid in _lantern_registry.keys():
		set_lantern_lit(lid, lit, false)
	_play_sfx(SfxKit.make_flint_ignite())
	_notify("🔥 Todos los faroles del barco encendidos." if lit else "💨 Todos los faroles del barco apagados.")

func sync_all_lanterns_from_state() -> void:
	var ws := _get_world_state()
	for lid in _lantern_registry.keys():
		var lit := ws.is_lantern_lit(lid) if ws else false
		_lantern_registry[lid]["lit"] = lit
		_apply_lantern_visuals(lid, lit)

func _apply_lantern_visuals(lantern_id: String, lit: bool) -> void:
	if not _lantern_registry.has(lantern_id):
		return
	var entry: Dictionary = _lantern_registry[lantern_id]
	var light := entry.get("light") as OmniLight3D
	if light and is_instance_valid(light):
		light.light_energy = float(entry["base_energy"]) if lit else 0.0
		light.set_meta("lantern_lit", lit)
	var flame := entry.get("flame") as Node3D
	if flame and is_instance_valid(flame):
		flame.visible = lit
	var glass := entry.get("glass") as MeshInstance3D
	if glass and is_instance_valid(glass):
		var mat := glass.material_override as StandardMaterial3D
		if mat:
			mat.emission_enabled = lit
			mat.albedo_color = Color(0.97, 0.72, 0.34, 0.64) if lit else Color(0.24, 0.28, 0.30, 0.45)
	var prop = entry.get("prop")
	if prop and is_instance_valid(prop):
		prop.prompt_text = "Apagar farol" if lit else "Encender farol"
		prop.inspection_message = "La llama del farol ilumina suavemente la madera." if lit else "El farol de hierro está frío y apagado."
	var vfx := get_tree().root.find_child("Vfx", true, false)
	var ember_nm := str(entry.get("ember_name", ""))
	if vfx and ember_nm != "" and vfx.has_method("set_lantern_ember_lit"):
		vfx.call("set_lantern_ember_lit", ember_nm, lit)
