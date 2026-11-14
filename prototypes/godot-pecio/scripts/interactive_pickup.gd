class_name InteractivePickup
extends Node3D

# Objeto Recogible Canónico en el Tablero Táctico (Pecio Rosa de los Vientos)
# Modela los hallazgos descritos en el PDF (antorchas, brújula C4, oro, gemas de la cofa)
# - Modelo 3D con flotación suave y halo áureo
# - Detección de proximidad táctica y prompt contextual "[E] Recoger [Objeto]"
# - Añade el objeto a la mochila de la cuadrilla (InventoryManager)

@export var pickup_id: String = "torch"
@export var item_name: String = "Antorcha de brea"
@export var amount: int = 1
@export var glow_color: Color = Color(0.95, 0.78, 0.25, 0.9)

var trigger_area: Area3D
var mesh_inst: MeshInstance3D
var is_player_nearby: bool = false
var nearby_player: PlayerToken
var base_y: float = 0.0
var anim_time: float = 0.0

func _ready() -> void:
	base_y = position.y
	build_visual()
	build_trigger()

func build_visual() -> void:
	mesh_inst = MeshInstance3D.new()
	mesh_inst.name = "PickupMesh"

	var mat = StandardMaterial3D.new()
	mat.albedo_color = glow_color
	mat.emission_enabled = true
	mat.emission = glow_color
	mat.emission_energy_multiplier = 0.48 # Brillo táctico contenido sin quemar detalle cercano
	mat.roughness = 0.25

	if pickup_id == "torch":
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.06
		cyl.bottom_radius = 0.04
		cyl.height = 0.55
		mesh_inst.mesh = cyl
		mesh_inst.rotation_degrees = Vector3(15, 0, 45)
	elif pickup_id == "compass":
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.14
		cyl.bottom_radius = 0.14
		cyl.height = 0.05
		mesh_inst.mesh = cyl
		mat.metallic = 0.7
	elif pickup_id == "potion":
		# Matraz de vidrio rubí con cuello estrecho y tapón de corcho
		var flask = SphereMesh.new()
		flask.radius = 0.12
		flask.height = 0.24
		mesh_inst.mesh = flask
		mat.roughness = 0.15

		var neck = MeshInstance3D.new()
		var n_cyl = CylinderMesh.new()
		n_cyl.top_radius = 0.04
		n_cyl.bottom_radius = 0.055
		n_cyl.height = 0.11
		neck.mesh = n_cyl
		neck.material_override = mat
		neck.position = Vector3(0, 0.14, 0)
		mesh_inst.add_child(neck)

		var cork = MeshInstance3D.new()
		var c_cyl = CylinderMesh.new()
		c_cyl.top_radius = 0.045
		c_cyl.bottom_radius = 0.038
		c_cyl.height = 0.05
		cork.mesh = c_cyl
		var c_mat = StandardMaterial3D.new()
		c_mat.albedo_color = Color("#7a5c3a")
		c_mat.roughness = 0.9
		cork.material_override = c_mat
		cork.position = Vector3(0, 0.21, 0)
		mesh_inst.add_child(cork)
	elif pickup_id == "gold" or pickup_id == "gems":
		var sphere = SphereMesh.new()
		sphere.radius = 0.16
		sphere.height = 0.30
		mesh_inst.mesh = sphere
	else:
		var box = BoxMesh.new()
		box.size = Vector3(0.28, 0.22, 0.22)
		mesh_inst.mesh = box

	mesh_inst.material_override = mat
	add_child(mesh_inst)

func build_trigger() -> void:
	trigger_area = Area3D.new()
	trigger_area.name = "PickupTrigger"
	var col = CollisionShape3D.new()
	var sphere = SphereShape3D.new()
	sphere.radius = 1.8
	col.shape = sphere
	trigger_area.add_child(col)

	trigger_area.body_entered.connect(_on_body_entered)
	trigger_area.body_exited.connect(_on_body_exited)
	add_child(trigger_area)

func _process(delta: float) -> void:
	anim_time += delta * 2.5
	if mesh_inst:
		mesh_inst.position.y = sin(anim_time) * 0.05
		mesh_inst.rotate_y(delta * 1.3)

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
			inv.show_prompt("[T] Recoger " + item_name)

func _on_body_exited(body: Node) -> void:
	if body == nearby_player:
		is_player_nearby = false
		nearby_player = null
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.hide_prompt()

func collect() -> void:
	var inv = get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		inv.add_item(pickup_id, amount, item_name)
		inv.hide_prompt()

	if nearby_player:
		nearby_player.play_action_animation("interact")

	# Animación de recogida y desaparición
	var tw = create_tween()
	tw.set_parallel(true)
	tw.tween_property(mesh_inst, "scale", Vector3.ZERO, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
	tw.tween_property(mesh_inst, "position:y", mesh_inst.position.y + 0.6, 0.25)
	tw.finished.connect(func(): queue_free())

func _unhandled_input(event: InputEvent) -> void:
	if is_player_nearby and event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		if event.keycode == KEY_T:
			collect()
			get_viewport().set_input_as_handled()
