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
	_sync_c10_state.call_deferred()

func _sync_c10_state() -> void:
	if pickup_id != "gems":
		return
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt_ui and "world_state" in vtt_ui and vtt_ui.world_state and vtt_ui.world_state.c10_nest_looted:
		mark_collected_silent()

func mark_collected_silent() -> void:
	set_meta("collected_c10", true)
	is_player_nearby = false
	nearby_player = null
	visible = false
	set_process(false)
	if trigger_area:
		trigger_area.monitoring = false
	if pickup_id == "gems" and is_inside_tree():
		var treasures_n := get_tree().root.find_child("NestTreasures_C10", true, false) as Node3D
		if treasures_n:
			treasures_n.visible = false

func build_visual() -> void:
	mesh_inst = MeshInstance3D.new()
	mesh_inst.name = "PickupMesh"

	var mat = StandardMaterial3D.new()
	mat.albedo_color = glow_color
	mat.emission_enabled = true
	mat.emission = glow_color
	mat.emission_energy_multiplier = 0.32 # Brillo táctico contenido sin quemar detalle cercano
	mat.roughness = 0.30

	if pickup_id == "torch":
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.055
		cyl.bottom_radius = 0.036
		cyl.height = 0.52
		mesh_inst.mesh = cyl
		mesh_inst.rotation_degrees = Vector3(15, 0, 45)
		var wrap = MeshInstance3D.new()
		var w_cyl = CylinderMesh.new()
		w_cyl.top_radius = 0.068; w_cyl.bottom_radius = 0.062; w_cyl.height = 0.14
		wrap.mesh = w_cyl
		var w_mat = StandardMaterial3D.new()
		w_mat.albedo_color = Color("#3a2819")
		w_mat.roughness = 0.92
		wrap.material_override = w_mat
		wrap.position = Vector3(0, 0.21, 0)
		mesh_inst.add_child(wrap)
	elif pickup_id == "compass":
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.13
		cyl.bottom_radius = 0.13
		cyl.height = 0.05
		mesh_inst.mesh = cyl
		mat.metallic = 0.72
	elif pickup_id == "dagger":
		var blade = BoxMesh.new()
		blade.size = Vector3(0.055, 0.02, 0.34)
		mesh_inst.mesh = blade
		mat.metallic = 0.78
		mat.roughness = 0.25
		var guard = MeshInstance3D.new()
		var g_box = BoxMesh.new()
		g_box.size = Vector3(0.14, 0.035, 0.035)
		guard.mesh = g_box
		var g_mat = StandardMaterial3D.new()
		g_mat.albedo_color = Color("#b89548")
		g_mat.metallic = 0.65
		guard.material_override = g_mat
		guard.position = Vector3(0, 0, 0.16)
		mesh_inst.add_child(guard)
		var grip = MeshInstance3D.new()
		var gr_cyl = CylinderMesh.new()
		gr_cyl.top_radius = 0.022; gr_cyl.bottom_radius = 0.024; gr_cyl.height = 0.13
		grip.mesh = gr_cyl
		var gr_mat = StandardMaterial3D.new()
		gr_mat.albedo_color = Color("#4a2c1c")
		grip.material_override = gr_mat
		grip.rotation_degrees.x = 90.0
		grip.position = Vector3(0, 0, 0.23)
		mesh_inst.add_child(grip)
	elif pickup_id == "cartographer_tools":
		var case_box = BoxMesh.new()
		case_box.size = Vector3(0.28, 0.05, 0.20)
		mesh_inst.mesh = case_box
		mat.metallic = 0.28
		mat.roughness = 0.65
		var arc = MeshInstance3D.new()
		var arc_tor = TorusMesh.new()
		arc_tor.inner_radius = 0.06; arc_tor.outer_radius = 0.085
		arc.mesh = arc_tor
		var b_mat = StandardMaterial3D.new()
		b_mat.albedo_color = Color("#d4ad55")
		b_mat.metallic = 0.75
		arc.material_override = b_mat
		arc.position = Vector3(0.03, 0.045, 0)
		mesh_inst.add_child(arc)
	elif pickup_id == "stash":
		var box = BoxMesh.new()
		box.size = Vector3(0.32, 0.16, 0.22)
		mesh_inst.mesh = box
		var oak_mat = StandardMaterial3D.new()
		oak_mat.albedo_color = Color("#5d432c")
		oak_mat.roughness = 0.76
		mat = oak_mat
		var trim = MeshInstance3D.new()
		var t_box = BoxMesh.new()
		t_box.size = Vector3(0.34, 0.045, 0.24)
		trim.mesh = t_box
		var g_mat = StandardMaterial3D.new()
		g_mat.albedo_color = glow_color
		g_mat.metallic = 0.65
		g_mat.emission_enabled = true
		g_mat.emission = glow_color
		g_mat.emission_energy_multiplier = 0.40
		trim.material_override = g_mat
		trim.position = Vector3(0, 0.055, 0)
		mesh_inst.add_child(trim)
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
	elif pickup_id == "gold":
		var coin_stack = CylinderMesh.new()
		coin_stack.top_radius = 0.13
		coin_stack.bottom_radius = 0.15
		coin_stack.height = 0.08
		coin_stack.radial_segments = 10
		mesh_inst.mesh = coin_stack
		mat.metallic = 0.85
		mat.roughness = 0.24
		mat.emission_energy_multiplier = 0.18
	elif pickup_id == "gems":
		# Conjunto discreto del tesoro del nido (pulsera de oro, pendiente, 2 ojos de tigre y 1 heliotropo)
		# Sin halo luminoso exagerado: metal y gemas semienterrados entre hierba y virutas
		var gold_mat := StandardMaterial3D.new()
		gold_mat.albedo_color = Color("#8f6f26")
		gold_mat.metallic = 0.78
		gold_mat.roughness = 0.34
		var te_mat := StandardMaterial3D.new()
		te_mat.albedo_color = Color("#8f5c20")
		te_mat.roughness = 0.22
		te_mat.metallic_specular = 0.65
		var bs_mat := StandardMaterial3D.new()
		bs_mat.albedo_color = Color("#244230")
		bs_mat.roughness = 0.20
		bs_mat.metallic_specular = 0.62

		var bracelet := TorusMesh.new()
		bracelet.inner_radius = 0.042; bracelet.outer_radius = 0.062; bracelet.rings = 14; bracelet.ring_segments = 8
		mesh_inst.mesh = bracelet
		mesh_inst.rotation_degrees = Vector3(14.0, 22.0, -8.0)
		mat = gold_mat

		var earring := MeshInstance3D.new()
		var ear_tor := TorusMesh.new()
		ear_tor.inner_radius = 0.016; ear_tor.outer_radius = 0.025
		earring.mesh = ear_tor
		earring.material_override = gold_mat
		earring.position = Vector3(0.085, -0.012, 0.03)
		earring.rotation_degrees = Vector3(72.0, 15.0, 0.0)
		mesh_inst.add_child(earring)

		for g_pos in [Vector3(-0.068, -0.014, 0.042), Vector3(-0.024, -0.016, -0.062)]:
			var gem := MeshInstance3D.new()
			var gs := SphereMesh.new()
			gs.radius = 0.024; gs.height = 0.022
			gem.mesh = gs
			gem.material_override = te_mat
			gem.position = g_pos
			mesh_inst.add_child(gem)

		var bloodstone := MeshInstance3D.new()
		var bs_c := CylinderMesh.new()
		bs_c.top_radius = 0.020; bs_c.bottom_radius = 0.034; bs_c.height = 0.028; bs_c.radial_segments = 6
		bloodstone.mesh = bs_c
		bloodstone.material_override = bs_mat
		bloodstone.position = Vector3(0.035, -0.010, -0.048)
		mesh_inst.add_child(bloodstone)
		# Las 5 representaciones individuales ya están integradas discretamente dentro de NestTreasures_C10
		mesh_inst.visible = false
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
	if pickup_id == "gems":
		return
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
	if bool(get_meta("collected_c10", false)):
		return
	if pickup_id == "gems":
		var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
		if vtt_ui and vtt_ui.has_method("loot_c10_nest"):
			var res: Dictionary = vtt_ui.loot_c10_nest()
			var inv = get_tree().root.find_child("InventoryManager", true, false)
			if inv:
				inv.hide_prompt()
			if nearby_player:
				nearby_player.play_action_animation("interact")
			mark_collected_silent()
			if bool(res.get("already_looted", false)):
				return
			return
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
