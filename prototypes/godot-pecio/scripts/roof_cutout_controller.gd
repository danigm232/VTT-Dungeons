class_name RoofCutoutController
extends Node3D

# Controlador de Recorte Cenital / Desvanecimiento de Techos y Mamparos Canónico (Fase 5)
# Cumple fielmente la arquitectura de recorte de Babylon en coordenadas locales del barco escorado:
# - engine/client/wreck-interior.ts: cutSide = +1 oculta techos y mamparos frontales (+Z -> -Z)
# - engine/shared/wreck-camera-profile.ts / wreck-camera.ts: Inclinación cenital adaptativa:
#   25.0° en cubiertas exteriores (C1, C2, C3, C10) <--> 10.0° en interiores (C4, C5, C6, C7, C8, C9)

@export var hull_builder: HullBuilder

var camera: TacticalCamera
var ship_vessel: Node3D
var lock_override_mode: bool = false

# Nodos cacheados
var deck_c1: Node3D
var deck_c2: Node3D
var deck_c3: Node3D
var stairs_node: Node3D
var stringers_node: Node3D
var frames_aft_up: Node3D
var frames_fore_up: Node3D
var dressing_c1: Node3D
var dressing_c2: Node3D
var dressing_c3: Node3D
var dressing_c10: Node3D
var rigging: Node3D

var aft_cabins: Node3D
var fore_cabins: Node3D
var lower_c8: Node3D
var submerged_c9: Node3D

var bulkhead_front_c4: Node3D
var bulkhead_front_c5: Node3D
var bulkhead_front_mid: Node3D
var bulkhead_spine_aft: Node3D
var hull_inner_aft_front: Node3D

var bulkhead_front_c6: Node3D
var bulkhead_front_c7: Node3D
var bulkhead_front_fore_mid: Node3D
var bulkhead_spine_fore: Node3D
var hull_inner_fore_front: Node3D
var hull_inner_c8_front: Node3D
var hull_inner_c9_front: Node3D

var ocean_water: Node3D
var grid_overlay: Node3D
var rowboat_node: Node3D
var mooring_painter_node: Node3D
var stern_reef_node: Node3D
var bow_reef_node: Node3D
var seabed_terrain_node: Node3D
var upper_nodes_for_lower_cutout: Array[Node3D] = []
var character_tokens: Array[Node3D] = []

var hull_lower_front: Node3D
var hull_lower_port: Node3D
var barnacles_front: Node3D
var barnacles_port: Node3D
var kelp_front: Node3D
var kelp_port: Node3D
var rust_front: Node3D
var c2_brow: Node3D
var c3_brow: Node3D
var bow_beak: Node3D
var transom: Node3D
var bulwark_waist_port: Node3D
var lantern_c1: Node3D
var lantern_c2: Node3D
var lantern_c8: Node3D
var stairs_c1_c8: Node3D
var dragon_bones: Node3D
var chainwales_port: Node3D
var chainwales_front: Node3D
var chainwale_aft_front: Node3D
var chainwale_fore_front: Node3D
var boarding_ladder: Node3D

var current_interior_state: String = "exterior"

func _ready() -> void:
	call_deferred("initialize_references")
	call_deferred("setup_trigger_areas")

func initialize_references() -> void:
	var root = get_tree().root
	camera = root.find_child("TacticalCamera", true, false) as TacticalCamera
	ship_vessel = root.find_child("ShipVessel", true, false)

	deck_c1 = root.find_child("Deck_C1", true, false)
	deck_c2 = root.find_child("Deck_C2", true, false)
	deck_c3 = root.find_child("Deck_C3", true, false)
	stairs_node = root.find_child("Stairs", true, false)
	stringers_node = root.find_child("StairStringers", true, false)
	frames_aft_up = root.find_child("Frames_AftUpper", true, false)
	frames_fore_up = root.find_child("Frames_ForeUpper", true, false)

	dressing_c1 = root.find_child("Zone_C1_MainDeck", true, false)
	dressing_c2 = root.find_child("Zone_C2_Forecastle", true, false)
	dressing_c3 = root.find_child("Zone_C3_PoopDeck", true, false)
	dressing_c10 = root.find_child("Zone_C10_CrowsNest", true, false)
	rigging = root.find_child("Rigging", true, false)

	aft_cabins = root.find_child("AftCabins_C4_C5", true, false)
	fore_cabins = root.find_child("ForeCabins_C6_C7", true, false)
	lower_c8 = root.find_child("LowerDeck_C8", true, false)
	submerged_c9 = root.find_child("SubmergedHold_C9", true, false)

	bulkhead_front_c4 = root.find_child("Bulkhead_Front_C4", true, false)
	bulkhead_front_c5 = root.find_child("Bulkhead_Front_C5", true, false)
	bulkhead_front_mid = root.find_child("Bulkhead_Front_Mid", true, false)
	bulkhead_spine_aft = root.find_child("Bulkhead_Spine_Aft", true, false)
	hull_inner_aft_front = root.find_child("HullInner_Aft_Front", true, false)

	bulkhead_front_c6 = root.find_child("Bulkhead_Front_C6", true, false)
	bulkhead_front_c7 = root.find_child("Bulkhead_Front_C7", true, false)
	bulkhead_front_fore_mid = root.find_child("Bulkhead_Front_Fore_Mid", true, false)
	bulkhead_spine_fore = root.find_child("Bulkhead_Spine_Fore", true, false)
	hull_inner_fore_front = root.find_child("HullInner_Fore_Front", true, false)
	hull_inner_c8_front = root.find_child("HullInner_C8_Front", true, false)
	hull_inner_c9_front = root.find_child("HullInner_C9_Front", true, false)

	hull_lower_front = root.find_child("HullStrakes_Front", true, false)
	hull_lower_port = root.find_child("HullStrakes", true, false)
	barnacles_front = root.find_child("WaterlineBarnacles_Front", true, false)
	barnacles_port = root.find_child("WaterlineBarnacles_Port", true, false)
	kelp_front = root.find_child("DrippingKelp_Front", true, false)
	kelp_port = root.find_child("DrippingKelp_Port", true, false)
	rust_front = root.find_child("HullRustStains_Front", true, false)
	c2_brow = root.find_child("C2_BrowBalustrade", true, false)
	c3_brow = root.find_child("C3_BrowBalustrade", true, false)
	bow_beak = root.find_child("BowBeakhead", true, false)
	transom = root.find_child("Transom", true, false)
	bulwark_waist_port = root.find_child("Bulwark_Waist_Port", true, false)
	lantern_c1 = root.find_child("LanternGroup_C1", true, false)
	lantern_c2 = root.find_child("LanternGroup_C2", true, false)
	lantern_c8 = root.find_child("LanternGroup_C8", true, false)
	stairs_c1_c8 = root.find_child("Stairs_C1_C8", true, false)
	dragon_bones = root.find_child("DragonBones", true, false)
	chainwales_port = root.find_child("Chainwales_Port", true, false)
	chainwales_front = root.find_child("Chainwales_Front", true, false)
	chainwale_aft_front = chainwales_front.get_node_or_null("Chainwale_Aft") if chainwales_front else null
	chainwale_fore_front = chainwales_front.get_node_or_null("Chainwale_Fore") if chainwales_front else null
	boarding_ladder = root.find_child("SideBoardingLadder", true, false)

	ocean_water = root.find_child("OceanWater", true, false)
	rowboat_node = root.find_child("Rowboat", true, false)
	mooring_painter_node = root.find_child("MooringPainter", true, false)
	stern_reef_node = root.find_child("SternReef", true, false)
	bow_reef_node = root.find_child("BowReef", true, false)
	seabed_terrain_node = root.find_child("SeabedTerrain", true, false)
	grid_overlay = root.find_child("TacticalGrid", true, false)
	if not grid_overlay:
		grid_overlay = root.find_child("TacticalGridOverlay", true, false)
	upper_nodes_for_lower_cutout.clear()
	for n_name in ["DoorC4", "DoorC5", "DoorC6", "DoorC7", "PickupTorchC1", "PickupTorchC4", "PickupTorchC7", "PickupCompassC4", "PickupCartographerC4", "PickupDaggerC4", "PickupGoldC4", "PickupPotionC5", "PickupStashC6", "PickupGemsCofa", "LadderCofa", "CofaExit"]:
		var n = root.find_child(n_name, true, false)
		if n:
			upper_nodes_for_lower_cutout.append(n)
	character_tokens.clear()
	for t_name in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken", "ZombieToken"]:
		var tok = root.find_child(t_name, true, false) as Node3D
		if tok:
			character_tokens.append(tok)

func setup_trigger_areas() -> void:
	create_cabin_area("Area_AftCabins", Vector3(-19.5, 1.35, 0.0), Vector3(12.0, 2.5, 18.0))
	create_cabin_area("Area_ForeCabins", Vector3(19.5, 1.35, 0.0), Vector3(12.0, 2.5, 18.0))
	create_cabin_area("Area_LowerDecks", Vector3(0.0, -4.8, 0.0), Vector3(56.0, 5.5, 18.0))

func create_cabin_area(area_name: String, pos: Vector3, size: Vector3) -> void:
	var area = Area3D.new()
	area.name = area_name
	area.position = pos
	add_child(area)

	var col = CollisionShape3D.new()
	var box = BoxShape3D.new()
	box.size = size
	col.shape = box
	area.add_child(col)

	area.body_entered.connect(func(body): if is_active_player_body(body): check_exit_to_exterior())
	area.body_exited.connect(func(body): if is_active_player_body(body): check_exit_to_exterior())

func is_active_player_body(body: Node) -> bool:
	if body is PlayerToken:
		return body.is_active_player
	return body is CharacterBody3D

func _set_vis(node: Node3D, state: bool) -> void:
	if node:
		node.visible = state

func set_interior_mode(new_mode: String, lock_mode: bool = false) -> void:
	if lock_mode:
		lock_override_mode = true
	if current_interior_state == new_mode and not lock_mode:
		return
	current_interior_state = new_mode

	if not deck_c2 or not deck_c3:
		initialize_references()

	# Restaurar visibilidad completa antes de aplicar recorte selectivo
	_set_vis(deck_c1, true); _set_vis(deck_c2, true); _set_vis(deck_c3, true)
	_set_vis(stairs_node, true); _set_vis(stringers_node, true)
	_set_vis(frames_aft_up, true); _set_vis(frames_fore_up, true)
	_set_vis(dressing_c1, true); _set_vis(dressing_c2, true); _set_vis(dressing_c3, true); _set_vis(dressing_c10, true)
	_set_vis(rigging, true)
	_set_vis(aft_cabins, true); _set_vis(fore_cabins, true); _set_vis(lower_c8, true); _set_vis(submerged_c9, false)
	_set_vis(bulkhead_front_c4, true); _set_vis(bulkhead_front_c5, true)
	_set_vis(bulkhead_front_mid, true); _set_vis(bulkhead_spine_aft, true)
	_set_vis(hull_inner_aft_front, true)
	_set_vis(bulkhead_front_c6, true); _set_vis(bulkhead_front_c7, true)
	_set_vis(bulkhead_front_fore_mid, true); _set_vis(bulkhead_spine_fore, true)
	_set_vis(hull_inner_fore_front, true); _set_vis(hull_inner_c8_front, true); _set_vis(hull_inner_c9_front, true)
	_set_vis(hull_lower_front, true); _set_vis(hull_lower_port, true); _set_vis(barnacles_front, true); _set_vis(barnacles_port, true); _set_vis(kelp_front, true); _set_vis(kelp_port, true); _set_vis(rust_front, true)
	_set_vis(c2_brow, true); _set_vis(c3_brow, true); _set_vis(bow_beak, true); _set_vis(transom, true)
	_set_vis(bulwark_waist_port, true)
	_set_vis(lantern_c1, true); _set_vis(lantern_c2, true); _set_vis(lantern_c8, true)
	_set_vis(stairs_c1_c8, true)
	_set_vis(dragon_bones, true)
	_set_vis(chainwales_port, true); _set_vis(chainwales_front, true)
	_set_vis(chainwale_aft_front, true); _set_vis(chainwale_fore_front, true)
	_set_vis(boarding_ladder, true)
	_set_vis(ocean_water, true); _set_vis(grid_overlay, true)
	_set_vis(rowboat_node, true); _set_vis(mooring_painter_node, true)
	_set_vis(stern_reef_node, true); _set_vis(bow_reef_node, true); _set_vis(seabed_terrain_node, true)
	var frames_low = get_tree().root.find_child("Frames", true, false) as Node3D
	var hull_core_occ = get_tree().root.find_child("HullCoreOccluder", true, false) as Node3D
	var hull_up_aft_front = get_tree().root.find_child("Hull_Upper_Aft_Front", true, false) as Node3D
	var hull_up_aft_port = get_tree().root.find_child("Hull_Upper_Aft_Port", true, false) as Node3D
	var hull_up_fore_front = get_tree().root.find_child("Hull_Upper_Fore_Front", true, false) as Node3D
	var hull_up_fore_port = get_tree().root.find_child("Hull_Upper_Fore_Port", true, false) as Node3D
	var bulwark_waist_front = get_tree().root.find_child("Bulwark_Waist_Front", true, false) as Node3D
	var breach_aft_front = get_tree().root.find_child("BreachSplinters_AftFront", true, false) as Node3D
	var breach_fore_front = get_tree().root.find_child("BreachSplinters_ForeFront", true, false) as Node3D
	_set_vis(frames_low, true)
	_set_vis(hull_core_occ, true)
	_set_vis(hull_up_aft_front, true); _set_vis(hull_up_aft_port, true)
	_set_vis(hull_up_fore_front, true); _set_vis(hull_up_fore_port, true)
	_set_vis(bulwark_waist_front, true)
	_set_vis(breach_aft_front, true); _set_vis(breach_fore_front, true)
	for un in upper_nodes_for_lower_cutout:
		if un.name == "PickupGemsCofa" and bool(un.get_meta("collected_c10", false)):
			_set_vis(un, false)
		else:
			_set_vis(un, true)

	if grid_overlay and grid_overlay.has_method("sync_cutout_mode"):
		grid_overlay.call("sync_cutout_mode", new_mode)

	match new_mode:
		"aft_c4_port", "aft_c4_c5":
			_set_vis(deck_c3, false); _set_vis(dressing_c3, false); _set_vis(frames_aft_up, false); _set_vis(c3_brow, false)
			_set_vis(hull_up_aft_front, false); _set_vis(hull_inner_aft_front, false); _set_vis(breach_aft_front, false); _set_vis(chainwale_aft_front, false)
			_set_vis(bulkhead_front_c4, false); _set_vis(bulkhead_front_c5, false); _set_vis(bulkhead_front_mid, false)
			if new_mode == "aft_c4_port":
				_set_vis(bulkhead_spine_aft, false)
			if camera: camera.set_interior_cutout(true, 10.0, new_mode)

		"aft_c5_stbd":
			_set_vis(deck_c3, false); _set_vis(dressing_c3, false); _set_vis(frames_aft_up, false); _set_vis(c3_brow, false)
			_set_vis(hull_up_aft_front, false); _set_vis(hull_inner_aft_front, false); _set_vis(breach_aft_front, false); _set_vis(chainwale_aft_front, false)
			_set_vis(bulkhead_front_c4, false); _set_vis(bulkhead_front_c5, false); _set_vis(bulkhead_front_mid, false)
			if camera: camera.set_interior_cutout(true, 10.0, new_mode)

		"fore_c6_port", "fore_c6_c7":
			_set_vis(deck_c2, false); _set_vis(dressing_c2, false); _set_vis(dressing_c10, false); _set_vis(frames_fore_up, false); _set_vis(c2_brow, false)
			_set_vis(hull_up_fore_front, false); _set_vis(hull_inner_fore_front, false); _set_vis(breach_fore_front, false); _set_vis(chainwale_fore_front, false); _set_vis(lantern_c2, false)
			_set_vis(rigging, false)
			_set_vis(bulkhead_front_c6, false); _set_vis(bulkhead_front_c7, false); _set_vis(bulkhead_front_fore_mid, false)
			if new_mode == "fore_c6_port":
				_set_vis(bulkhead_spine_fore, false)
			if camera: camera.set_interior_cutout(true, 10.0, new_mode)

		"fore_c7_stbd":
			_set_vis(deck_c2, false); _set_vis(dressing_c2, false); _set_vis(dressing_c10, false); _set_vis(frames_fore_up, false); _set_vis(c2_brow, false)
			_set_vis(hull_up_fore_front, false); _set_vis(hull_inner_fore_front, false); _set_vis(breach_fore_front, false); _set_vis(chainwale_fore_front, false); _set_vis(lantern_c2, false)
			_set_vis(rigging, false)
			_set_vis(bulkhead_front_c6, false); _set_vis(bulkhead_front_c7, false); _set_vis(bulkhead_front_fore_mid, false)
			if camera: camera.set_interior_cutout(true, 10.0, new_mode)

		"lower_c8_bilge", "lower_c8_c9", "lower_c9_hold":
			_set_vis(deck_c1, false); _set_vis(deck_c2, false); _set_vis(deck_c3, false)
			_set_vis(stairs_node, false); _set_vis(stringers_node, false)
			_set_vis(frames_aft_up, false); _set_vis(frames_fore_up, false); _set_vis(frames_low, false)
			_set_vis(hull_up_aft_front, false); _set_vis(hull_up_aft_port, false)
			_set_vis(hull_up_fore_front, false); _set_vis(hull_up_fore_port, false)
			_set_vis(bulwark_waist_front, false); _set_vis(bulwark_waist_port, false); _set_vis(hull_core_occ, false)
			_set_vis(c2_brow, false); _set_vis(c3_brow, false); _set_vis(bow_beak, false); _set_vis(transom, false)
			_set_vis(hull_lower_front, false); _set_vis(barnacles_front, false); _set_vis(kelp_front, false); _set_vis(rust_front, false)
			_set_vis(hull_inner_c8_front, false); _set_vis(hull_inner_c9_front, false)
			_set_vis(dressing_c1, false); _set_vis(dressing_c2, false); _set_vis(dressing_c3, false); _set_vis(dressing_c10, false)
			_set_vis(lantern_c1, false); _set_vis(lantern_c2, false)
			_set_vis(rigging, false); _set_vis(aft_cabins, false); _set_vis(fore_cabins, false)
			_set_vis(dragon_bones, false)
			_set_vis(chainwales_port, false); _set_vis(chainwales_front, false); _set_vis(boarding_ladder, false)
			_set_vis(ocean_water, false)
			_set_vis(rowboat_node, false); _set_vis(mooring_painter_node, false)
			_set_vis(stern_reef_node, false); _set_vis(bow_reef_node, false); _set_vis(seabed_terrain_node, false)
			for un in upper_nodes_for_lower_cutout:
				_set_vis(un, false)
			if new_mode == "lower_c9_hold":
				_set_vis(lower_c8, false)
				_set_vis(hull_lower_port, false)
				_set_vis(barnacles_port, false)
				_set_vis(kelp_port, false)
				_set_vis(stairs_c1_c8, false)
				_set_vis(lantern_c8, false)
				_set_vis(submerged_c9, true)
			elif new_mode == "lower_c8_c9":
				_set_vis(submerged_c9, true)
			if camera: camera.set_interior_cutout(true, 10.0, new_mode)

		"exterior":
			if camera: camera.set_interior_cutout(false, 25.0, "exterior")

	_sync_entity_visibility(new_mode)

func _sync_entity_visibility(mode: String) -> void:
	if not is_inside_tree() or not ship_vessel or not ship_vessel.is_inside_tree():
		return
	for tok in character_tokens:
		if not is_instance_valid(tok) or not tok.is_inside_tree():
			continue
		if tok.name == "HarpyToken" and not bool(tok.get_meta("adventure_present", true)):
			tok.visible = false
			continue
		if tok.get("is_active_player"):
			tok.visible = true
			continue
		var lp: Vector3 = ship_vessel.to_local(tok.global_position)
		var is_upper_castle := (lp.y >= 2.2) # C2, C3, C10
		var is_main_or_cabin := (lp.y > -1.2 and lp.y < 2.2)
		var is_c8 := (lp.y <= -1.2 and lp.y >= -4.15)
		var is_c9 := (lp.y < -4.15)
		match mode:
			"exterior":
				tok.visible = (not is_c8) and (not is_c9)
			"aft_c4_port", "aft_c5_stbd", "aft_c4_c5":
				if is_upper_castle or is_c8 or is_c9:
					tok.visible = false
				else:
					tok.visible = (lp.x > -13.3 or mode == "aft_c4_c5" or (mode == "aft_c4_port" and lp.z < 0.2) or (mode == "aft_c5_stbd" and lp.z >= -0.2))
			"fore_c6_port", "fore_c7_stbd", "fore_c6_c7":
				if is_upper_castle or is_c8 or is_c9:
					tok.visible = false
				else:
					tok.visible = (lp.x < 13.3 or mode == "fore_c6_c7" or (mode == "fore_c6_port" and lp.z < 0.2) or (mode == "fore_c7_stbd" and lp.z >= -0.2))
			"lower_c8_bilge":
				tok.visible = is_c8
			"lower_c8_c9":
				tok.visible = is_c8 or is_c9
			"lower_c9_hold":
				tok.visible = is_c9
			_:
				tok.visible = true

func check_exit_to_exterior() -> void:
	if not is_inside_tree():
		return
	if lock_override_mode:
		_sync_entity_visibility(current_interior_state)
		return

	var main_ctrl = get_tree().root.find_child("Main", true, false)
	var active_tok: Node3D = null
	if camera and camera.target:
		active_tok = camera.target
	elif main_ctrl and "party" in main_ctrl and main_ctrl.party.size() > 0:
		active_tok = main_ctrl.party[main_ctrl.active_party_index]
	elif camera and camera.target:
		active_tok = camera.target

	if active_tok:
		if active_tok.get("in_boat") or active_tok.get("in_open_ocean"):
			set_interior_mode("exterior")
			_sync_entity_visibility(current_interior_state)
			return
		# Convertir a coordenadas locales del navío (imprescindible por la escora de 9.5°)
		var pos = ship_vessel.to_local(active_tok.global_position) if ship_vessel else active_tok.position
		if pos.y < -4.15:
			set_interior_mode("lower_c9_hold")
			_sync_entity_visibility(current_interior_state)
			return
		elif pos.y < -1.10:
			set_interior_mode("lower_c8_bilge")
			_sync_entity_visibility(current_interior_state)
			return
		elif pos.x < -13.3 and pos.x > -30.5 and pos.y < 2.75 and pos.y > -0.9:
			set_interior_mode("aft_c4_port" if pos.z < 0.0 else "aft_c5_stbd")
			_sync_entity_visibility(current_interior_state)
			return
		elif pos.x > 13.3 and pos.x < 30.5 and pos.y < 2.75 and pos.y > -0.9:
			set_interior_mode("fore_c6_port" if pos.z < 0.0 else "fore_c7_stbd")
			_sync_entity_visibility(current_interior_state)
			return

	set_interior_mode("exterior")
	_sync_entity_visibility(current_interior_state)

func _process(_delta: float) -> void:
	if Engine.get_process_frames() % 10 == 0:
		check_exit_to_exterior()
