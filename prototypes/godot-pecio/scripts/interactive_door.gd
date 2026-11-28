class_name InteractiveDoor
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")

# Puerta Interactiva Canónica para los Camarotes del Pecio Rosa de los Vientos
# Modela C4 (Capitán), C5 (Cocina), C6 (Tripulación) y C7 (Comedor)
# - Perfectamente alineada en el plano del mamparo (paralela a Z, grosor en X)
# - Marco estructural integrado: jambas laterales, dintel, sobrepaño hasta techo (2.85m) y umbral de suelo
# - Hoja batiente de roble envejecido ajustada con tolerancia de 1 cm al vano
# - Bisagras de gozne y herrajes de hierro forjado
# - Apertura animada suave hacia el interior del camarote contra el mamparo
# - Colisión física giratoria que bloquea el paso cuando está cerrada y libera el vano al abrirse
# - Prompt interactivo contextual "[E] Abrir / Cerrar"

signal door_state_changed(is_open: bool)

@export var door_id: String = "c4-barred-door"
@export var door_title: String = "Puerta del Camarote"
@export var is_open: bool = false
@export var swing_angle: float = 90.0
@export var swing_side: float = -1.0 # -1.0 abre hacia -X (camarotes de popa), +1.0 hacia +X (camarotes de proa)
@export var hinge_side: float = -1.0 # -1.0 bisagra en -Z (babor), +1.0 bisagra en +Z (estribor)

var door_frame: Node3D
var door_leaf: Node3D
var door_bar_mesh: MeshInstance3D
var has_bar_removed: bool = false
var static_body: StaticBody3D
var trigger_area: Area3D
var is_player_nearby: bool = false
var tween: Tween
var handle_offset := Vector3.ZERO
var _cutaway_visuals: Array[Node3D] = []
var _cutaway_hidden: bool = false

func _ready() -> void:
	build_door_frame()
	build_door_leaf()
	build_interaction_trigger()
	update_door_state(true)

func set_cutaway_hidden(cutaway: bool) -> void:
	_cutaway_hidden = cutaway
	for vis in _cutaway_visuals:
		if is_instance_valid(vis):
			vis.visible = not cutaway
	if is_instance_valid(door_bar_mesh):
		door_bar_mesh.visible = (not has_bar_removed) and (not cutaway)

func build_door_frame() -> void:
	door_frame = Node3D.new()
	door_frame.name = "DoorFrameAssembly"
	add_child(door_frame)

	# Tono de marco diferenciado y legible (#7d6954)
	var mat_frame = PbrMaterialKit.create_oak_furniture_pbr("#7d6954")
	mat_frame.roughness = 0.82
	
	# Sobrepaño a tono con los mamparos (#9e8b74)
	var mat_bulkhead = PbrMaterialKit.create_wood_planks_pbr("#9e8b74", 0.28)

	# 1. Jambas verticales laterales (conectan a ras con el mamparo a z = ±0.60m)
	# Jamba -Z (lado babor): z de -0.60 a -0.48, centro -0.54
	var jamb_left = MeshInstance3D.new()
	var jbox = BoxMesh.new()
	jbox.size = Vector3(0.18, 2.14, 0.12)
	jamb_left.mesh = jbox
	jamb_left.material_override = mat_frame
	jamb_left.position = Vector3(0, 1.11, -0.54)
	door_frame.add_child(jamb_left)
	_cutaway_visuals.append(jamb_left)

	# Jamba +Z (lado estribor): z de +0.48 a +0.60, centro +0.54
	var jamb_right = MeshInstance3D.new()
	jamb_right.mesh = jbox
	jamb_right.material_override = mat_frame
	jamb_right.position = Vector3(0, 1.11, 0.54)
	door_frame.add_child(jamb_right)
	_cutaway_visuals.append(jamb_right)

	# 2. Dintel horizontal superior (y = 2.06 a 2.18m)
	var lintel = MeshInstance3D.new()
	var lbox = BoxMesh.new()
	lbox.size = Vector3(0.18, 0.12, 1.20)
	lintel.mesh = lbox
	lintel.material_override = mat_frame
	lintel.position = Vector3(0, 2.12, 0)
	door_frame.add_child(lintel)
	_cutaway_visuals.append(lintel)

	# Colisionadores sólidos en jambas y dintel del marco para impedir atravesar el borde
	PbrMaterialKit.add_box_collider(door_frame, "Col_DoorJambPort", Vector3(0.38, 2.95, 0.24), Vector3(0, 1.48, -0.58))
	PbrMaterialKit.add_box_collider(door_frame, "Col_DoorJambStbd", Vector3(0.38, 2.95, 0.24), Vector3(0, 1.48, 0.58))
	PbrMaterialKit.add_box_collider(door_frame, "Col_DoorTransom", Vector3(0.38, 0.96, 1.24), Vector3(0, 2.54, 0))

	# 3. Sobrepaño ciego de mamparo (rellena desde el dintel 2.18m hasta el techo 3.00m)
	var transom = MeshInstance3D.new()
	var tbox = BoxMesh.new()
	tbox.size = Vector3(0.10, 0.82, 1.20)
	transom.mesh = tbox
	transom.material_override = mat_bulkhead
	transom.position = Vector3(0, 2.59, 0)
	door_frame.add_child(transom)
	_cutaway_visuals.append(transom)

	# 4. Umbral de cubierta (suelo de roble desgastado entre jambas)
	var sill = MeshInstance3D.new()
	var sbox = BoxMesh.new()
	sbox.size = Vector3(0.20, 0.04, 1.20)
	sill.mesh = sbox
	sill.material_override = mat_frame
	sill.position = Vector3(0, 0.02, 0)
	door_frame.add_child(sill)

	# 5. Galces / topes de puerta en el marco interior (impiden que la luz traspase)
	var stop_top = MeshInstance3D.new()
	var stbox = BoxMesh.new()
	stbox.size = Vector3(0.04, 0.03, 0.96)
	stop_top.mesh = stbox
	stop_top.material_override = mat_frame
	# Situado ligeramente retranqueado respecto al centro
	var stop_x = -0.03 if swing_side < 0.0 else 0.03
	stop_top.position = Vector3(stop_x, 2.05, 0)
	door_frame.add_child(stop_top)
	_cutaway_visuals.append(stop_top)

func build_door_leaf() -> void:
	# Hoja de puerta en roble envejecido más claro (#9a8268) para contraste directo con mamparos
	var door_mat = PbrMaterialKit.create_wood_planks_pbr("#9a8268", 0.28)
	door_mat.roughness = 0.76

	var iron_mat = PbrMaterialKit.create_iron_pbr("#232423", 0.56, 0.76)

	# Bisagra y conjunto giratorio
	door_leaf = Node3D.new()
	door_leaf.name = "DoorLeafHinge"
	
	# La bisagra pivota desde el borde interior de la jamba correspondiente (±0.47m en Z)
	var h_z = -0.47 if hinge_side < 0.0 else 0.47
	door_leaf.position = Vector3(0, 0, h_z)
	add_child(door_leaf)
	_cutaway_visuals.append(door_leaf)

	# Hoja de madera (ancho en Z = 0.94m, alto en Y = 2.00m, grosor en X = 0.06m)
	# Desplazada respecto al gozne para pivotar desde su borde
	var leaf_offset_z = 0.47 if hinge_side < 0.0 else -0.47
	var leaf_mesh = MeshInstance3D.new()
	var box = BoxMesh.new()
	box.size = Vector3(0.06, 2.00, 0.94)
	leaf_mesh.mesh = box
	leaf_mesh.material_override = door_mat
	leaf_mesh.position = Vector3(0, 1.04, leaf_offset_z)
	door_leaf.add_child(leaf_mesh)

	# Bandas horizontales de hierro forjado (herrajes de gozne de proa a popa)
	for band_y in [0.38, 1.62]:
		var band = MeshInstance3D.new()
		var band_box = BoxMesh.new()
		band_box.size = Vector3(0.076, 0.07, 0.86)
		band.mesh = band_box
		band.material_override = iron_mat
		band.position = Vector3(0, band_y, leaf_offset_z)
		door_leaf.add_child(band)

		# Nudillo de gozne cilíndrico en el eje de rotación
		var knuckle = MeshInstance3D.new()
		var kn_cyl = CylinderMesh.new()
		kn_cyl.top_radius = 0.024
		kn_cyl.bottom_radius = 0.024
		kn_cyl.height = 0.09
		knuckle.mesh = kn_cyl
		knuckle.material_override = iron_mat
		knuckle.position = Vector3(0, band_y, 0)
		door_leaf.add_child(knuckle)

	# Picaporte / tirador de argolla de forja en el borde libre
	var handle_z = (leaf_offset_z * 2.0) - (0.12 * sign(leaf_offset_z))
	handle_offset = Vector3(0.0, 1.02, handle_z)
	for face_side in [-0.038, 0.038]:
		var handle = MeshInstance3D.new()
		var h_box = BoxMesh.new()
		h_box.size = Vector3(0.02, 0.14, 0.06)
		handle.mesh = h_box
		handle.material_override = iron_mat
		handle.position = Vector3(face_side, 1.02, handle_z)
		door_leaf.add_child(handle)

		var ring = MeshInstance3D.new()
		var torus = TorusMesh.new()
		torus.inner_radius = 0.025
		torus.outer_radius = 0.045
		ring.mesh = torus
		ring.material_override = iron_mat
		ring.position = Vector3(face_side * 1.5, 0.98, handle_z)
		ring.rotation_degrees.z = 90.0
		door_leaf.add_child(ring)

	# Colisión física sólida y gruesa
	static_body = StaticBody3D.new()
	static_body.name = "DoorStaticBody"
	var col = CollisionShape3D.new()
	var col_box = BoxShape3D.new()
	col_box.size = Vector3(0.28, 2.12, 1.04)
	col.shape = col_box
	col.position = Vector3(0, 1.06, leaf_offset_z)
	static_body.add_child(col)
	door_leaf.add_child(static_body)

	# Tranca / listón canónico en Puerta atrancada de C4 (c4-barred-door)
	if door_id == "c4-barred-door":
		for bz in [-0.36, 0.36]:
			var bracket = MeshInstance3D.new()
			var br_box = BoxMesh.new()
			br_box.size = Vector3(0.08, 0.14, 0.08)
			bracket.mesh = br_box
			bracket.material_override = iron_mat
			bracket.position = Vector3(0.055, 1.08, leaf_offset_z + bz)
			door_leaf.add_child(bracket)
		door_bar_mesh = MeshInstance3D.new()
		door_bar_mesh.name = "BarredDoorTimber"
		var bar_box = BoxMesh.new()
		bar_box.size = Vector3(0.055, 0.095, 1.06)
		door_bar_mesh.mesh = bar_box
		door_bar_mesh.material_override = PbrMaterialKit.create_oak_furniture_pbr("#6d5238")
		door_bar_mesh.position = Vector3(0.065, 1.08, leaf_offset_z)
		door_leaf.add_child(door_bar_mesh)

func build_interaction_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "TriggerArea"
	var col = CollisionShape3D.new()
	var sphere = SphereShape3D.new()
	sphere.radius = 2.4
	col.shape = sphere
	col.position = Vector3(0, 1.0, 0)
	trigger_area.add_child(col)

	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _on_body_entered(body: Node) -> void:
	if body is PlayerToken and body.is_active_player:
		is_player_nearby = true
		update_prompt()

func _on_body_exited(body: Node) -> void:
	if body is PlayerToken:
		is_player_nearby = false
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.hide_prompt()

func update_prompt() -> void:
	if not is_player_nearby:
		return
	var inv = get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		var action_text = "Cerrar " if is_open else ("Retirar tranca y abrir " if (door_id == "c4-barred-door" and not has_bar_removed) else "Abrir ")
		inv.show_prompt("[T] " + action_text + door_title)

func force_unbar_and_open() -> void:
	has_bar_removed = true
	if door_bar_mesh:
		door_bar_mesh.visible = false
	if not is_open:
		toggle_door()
	else:
		update_prompt()

func interact_or_toggle() -> void:
	if door_id == "c4-barred-door" and not is_open and not has_bar_removed and DisplayServer.get_name() != "headless":
		var canon := get_tree().root.find_child("PecioCanonController", true, false)
		if canon and canon.has_method("open_c4_barred_door_modal"):
			canon.open_c4_barred_door_modal(self)
			return
	toggle_door()

func toggle_door() -> void:
	is_open = not is_open
	if is_open and door_bar_mesh and not has_bar_removed:
		has_bar_removed = true
		door_bar_mesh.visible = false
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false) if is_inside_tree() else null
	var hand_reach_time := 0.0
	if is_player_nearby and vtt_ui and vtt_ui.has_method("get_active_token_node"):
		var body: Node3D = vtt_ui.get_active_token_node()
		if body is PlayerToken and body.global_position.distance_squared_to(global_position) < 7.0:
			body.play_object_action("open_door", door_leaf.to_global(handle_offset) if door_leaf else global_position)
			hand_reach_time = 0.18
	if vtt_ui and "world_state" in vtt_ui and vtt_ui.world_state:
		if has_bar_removed and door_id == "c4-barred-door":
			vtt_ui.world_state.mark_c4_door_unbarred()
		vtt_ui.world_state.set_door_open(door_id, is_open)
	update_door_state(false, hand_reach_time)
	update_prompt()
	emit_signal("door_state_changed", is_open)

func get_open_rotation_deg() -> float:
	# inward_x: -1.0 para camarotes de popa (C4, C5 abren hacia -X), +1.0 para proa (C6, C7 abren hacia +X)
	var inward_x = swing_side
	# Si hinge_side == -1.0 (bisagra en -Z): hoja hacia +Z => giro = inward_x * swing_angle
	# Si hinge_side == +1.0 (bisagra en +Z): hoja hacia -Z => giro = -inward_x * swing_angle
	return inward_x * swing_angle if hinge_side < 0.0 else (-inward_x * swing_angle)

func update_door_state(instant: bool, contact_delay := 0.0) -> void:
	if not door_leaf:
		return

	var target_deg = get_open_rotation_deg() if is_open else 0.0
	if instant:
		door_leaf.rotation_degrees.y = target_deg
	else:
		if tween and tween.is_running():
			tween.kill()
		tween = create_tween()
		if contact_delay > 0.0:
			tween.tween_interval(contact_delay)
		tween.tween_property(door_leaf, "rotation_degrees:y", target_deg, 0.45).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func _unhandled_input(event: InputEvent) -> void:
	if is_player_nearby and event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		if event.keycode == KEY_T:
			interact_or_toggle()
			get_viewport().set_input_as_handled()
