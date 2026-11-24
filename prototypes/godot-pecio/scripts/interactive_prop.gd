class_name InteractiveProp
extends Node3D

# Objeto o Elemento de Escenario Interactivo Canónico para Dungeons VTT
# Modela interacciones de inspección, mecanismos náuticos y examen de entorno:
# - Molinete de ancla (C2), Balista naval (C2), Cañón de proa (C2)
# - Timón del pecio (C3), Bitácora náutica (C3)
# - Carta náutica del capitán (C4), Camastro (C4)
# - Fogón de cocina (C5), Esqueleto sin cabeza (C5)
# - Literas marineras (C6), Trampa de aguja (C6)
# - Restos de bitácora (C7), Vajilla de peltre (C7)
# - Aguas de sentina (C8), Huesos sumergidos (C9)
# - Nido de arpía (C10), Cabo del bote de remos

signal prop_interacted()

@export var prop_id: String = "prop"
@export var prompt_text: String = "Examinar"
@export var inspection_message: String = "No hay nada inusual."
@export var sound_cue: String = "wood_creak"
@export var interaction_radius: float = 2.4
@export var anim_type: String = "none" # "rotate_y", "shake", "none"
@export var target_node: Node3D = null

var trigger_area: Area3D
var is_player_nearby: bool = false
var nearby_player: CharacterBody3D
var is_animating: bool = false
var interaction_count: int = 0

func _ready() -> void:
	build_trigger()

func build_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "PropTriggerArea"
	var col = CollisionShape3D.new()
	var sphere = SphereShape3D.new()
	sphere.radius = interaction_radius
	col.shape = sphere
	col.position = Vector3(0, 0.5, 0)
	trigger_area.add_child(col)

	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _on_body_entered(body: Node) -> void:
	if body is PlayerToken and body.is_active_player:
		var vessel = get_tree().root.find_child("ShipVessel", true, false)
		var p_y = vessel.to_local(body.global_position).y if vessel else body.global_position.y
		var m_y = vessel.to_local(global_position).y if vessel else global_position.y
		if abs(p_y - m_y) > 1.8:
			return
		is_player_nearby = true
		nearby_player = body
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.show_prompt("[T] " + prompt_text)

func _on_body_exited(body: Node) -> void:
	if body == nearby_player:
		is_player_nearby = false
		nearby_player = null
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.hide_prompt()

func interact() -> void:
	if is_animating:
		return
	interaction_count += 1

	if nearby_player and nearby_player.has_method("play_action_animation"):
		nearby_player.play_action_animation("interact")

	var canon := get_tree().root.find_child("PecioCanonController", true, false) if is_inside_tree() else null
	var handled_by_canon := false
	if canon:
		if prop_id == "c4_chart" and canon.has_method("open_c4_desk_modal"):
			canon.open_c4_desk_modal()
			handled_by_canon = true
		elif prop_id == "c5_skeleton" and canon.has_method("trigger_c5_crabs_scatter"):
			canon.trigger_c5_crabs_scatter()
			handled_by_canon = true
		elif prop_id == "c6_needle_trap" and canon.has_method("open_c6_stash_modal"):
			canon.open_c6_stash_modal()
			handled_by_canon = true
		elif prop_id.begins_with("c8_crate_") and canon.has_method("open_c8_crate_modal"):
			canon.open_c8_crate_modal(prop_id)
			handled_by_canon = true
		elif prop_id == "c9_iron_chest" and canon.has_method("open_c9_chest_modal"):
			canon.open_c9_chest_modal()
			handled_by_canon = true
		elif prop_id == "p01_mooring" and canon.has_method("toggle_rowboat_mooring"):
			canon.toggle_rowboat_mooring()
			handled_by_canon = true
		elif prop_id == "c9_air_pocket":
			if canon.has_method("_play_sfx"):
				canon._play_sfx(preload("res://scripts/pecio_sfx_kit.gd").make_bubble_burst())
			var ui_n := get_tree().root.find_child("VttRoleUi", true, false)
			if ui_n and ui_n.has_method("notify_mesa"):
				ui_n.notify_mesa("🫧 Bolsa de aire respirable (C9): recuperas el aliento bajo los tablones de la bodega.")
			handled_by_canon = true
		elif prop_id.begins_with("lantern:") and canon.has_method("toggle_lantern"):
			canon.toggle_lantern(prop_id.trim_prefix("lantern:"))
			var inv_l = get_tree().root.find_child("InventoryManager", true, false)
			if inv_l and is_player_nearby:
				inv_l.show_prompt("[T] " + prompt_text)
			handled_by_canon = true

	if not handled_by_canon:
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.show_notification(inspection_message)

	# Animación opcional del objeto (giro de timón, cabrestante, etc.)
	if anim_type == "rotate_y" and target_node:
		is_animating = true
		var tw = create_tween()
		tw.tween_property(target_node, "rotation_degrees:y", target_node.rotation_degrees.y + 90.0, 0.6).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.finished.connect(func(): is_animating = false)
	elif anim_type == "shake" and target_node:
		is_animating = true
		var orig_rot = target_node.rotation_degrees
		var tw = create_tween()
		tw.tween_property(target_node, "rotation_degrees:z", orig_rot.z + 4.0, 0.1)
		tw.tween_property(target_node, "rotation_degrees:z", orig_rot.z - 4.0, 0.15)
		tw.tween_property(target_node, "rotation_degrees:z", orig_rot.z, 0.1)
		tw.finished.connect(func(): is_animating = false)

	emit_signal("prop_interacted")

func _unhandled_input(event: InputEvent) -> void:
	if is_player_nearby and event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		if event.keycode == KEY_T:
			interact()
			get_viewport().set_input_as_handled()
