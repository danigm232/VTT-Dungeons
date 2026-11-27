class_name InteractivePickup
extends Node3D

# Objeto Recogible Canónico en el Tablero Táctico (Pecio Rosa de los Vientos)
# Modela los hallazgos descritos en el PDF (antorchas, brújula C4, oro, gemas de la cofa)
# - Modelo 3D con flotación suave y halo áureo
# - Detección de proximidad táctica y prompt contextual "[E] Recoger [Objeto]"
# - Añade el objeto a la mochila de la cuadrilla (InventoryManager)

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")

@export var pickup_id: String = "torch"
@export var item_name: String = "Antorcha de brea"
@export var amount: int = 1
@export var glow_color: Color = Color(0.95, 0.78, 0.25, 0.9)

var trigger_area: Area3D
var mesh_inst: MeshInstance3D
var _pickup_mat: StandardMaterial3D
var is_player_nearby: bool = false
var nearby_player: PlayerToken
var base_y: float = 0.0

func _ready() -> void:
	base_y = position.y
	build_visual()
	build_trigger()
	set_process(false) # Objetos apoyados en suelo con estética VTT (sin flotar ni girar)
	_sync_persisted_state.call_deferred()

func _sync_persisted_state() -> void:
	var vtt_ui := get_tree().root.find_child("VttRoleUi", true, false)
	if not (vtt_ui and "world_state" in vtt_ui and vtt_ui.world_state):
		return
	var ws = vtt_ui.world_state
	if pickup_id == "gems" and ws.c10_nest_looted:
		mark_collected_silent()
	elif ws.has_method("is_pickup_collected") and ws.is_pickup_collected(name):
		mark_collected_silent()
	elif name in ["PickupCartographerC4", "PickupDaggerC4", "PickupGoldC4"] and ws.c4_desk_looted:
		mark_collected_silent()
	elif name == "PickupCompassC4" and ws.c4_compass_taken:
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

	# Estética VTT realista: objetos apoyados en suelo/mesa sin brillo arcade ni giro perpetuo
	var mat = StandardMaterial3D.new()
	mat.albedo_color = glow_color.darkened(0.22)
	mat.emission_enabled = false
	mat.emission = glow_color
	mat.emission_energy_multiplier = 0.0
	mat.roughness = 0.58

	var shadow_rx := 0.34
	var shadow_rz := 0.28

	if pickup_id == "torch":
		# Antorcha de brea apagada reposando naturalmente tumbada sobre las tablas de cubierta
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.044
		cyl.bottom_radius = 0.032
		cyl.height = 0.56
		cyl.radial_segments = 10
		mesh_inst.mesh = cyl
		mesh_inst.position = Vector3(0.0, 0.045, 0.0)
		mesh_inst.rotation_degrees = Vector3(88.0, 26.0, 10.0)
		mat = PbrMaterialKit.create_oak_furniture_pbr("#523a23", 0.72)
		mat.roughness = 0.86
		mat.emission = Color("#d8a452")
		mat.emission_enabled = false

		var wrap = MeshInstance3D.new()
		var w_cyl = CylinderMesh.new()
		w_cyl.top_radius = 0.056; w_cyl.bottom_radius = 0.050; w_cyl.height = 0.16; w_cyl.radial_segments = 10
		wrap.mesh = w_cyl
		var w_mat = StandardMaterial3D.new()
		w_mat.albedo_color = Color("#241c15") # Trapo embreado apagado y tiznado
		w_mat.roughness = 0.95
		wrap.material_override = w_mat
		wrap.position = Vector3(0, 0.22, 0)
		mesh_inst.add_child(wrap)

		var band := MeshInstance3D.new()
		var b_tor := TorusMesh.new()
		b_tor.inner_radius = 0.040; b_tor.outer_radius = 0.054; b_tor.rings = 10; b_tor.ring_segments = 6
		band.mesh = b_tor
		band.material_override = PbrMaterialKit.create_iron_pbr("#26282a", 0.52, 0.74)
		band.position = Vector3(0, 0.14, 0)
		mesh_inst.add_child(band)
		shadow_rx = 0.44
		shadow_rz = 0.18
	elif pickup_id == "compass":
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.11
		cyl.bottom_radius = 0.11
		cyl.height = 0.04
		mesh_inst.mesh = cyl
		mesh_inst.position = Vector3(0.0, 0.025, 0.0)
		mat.albedo_color = Color("#b59246")
		mat.metallic = 0.72
		mat.roughness = 0.36
		shadow_rx = 0.22; shadow_rz = 0.22
	elif pickup_id == "dagger":
		var blade = BoxMesh.new()
		blade.size = Vector3(0.050, 0.016, 0.32)
		mesh_inst.mesh = blade
		mesh_inst.position = Vector3(0.0, 0.020, 0.0)
		mesh_inst.rotation_degrees = Vector3(0.0, 32.0, 0.0)
		mat.albedo_color = Color("#7e868c")
		mat.metallic = 0.78
		mat.roughness = 0.32
		var guard = MeshInstance3D.new()
		var g_box = BoxMesh.new()
		g_box.size = Vector3(0.13, 0.030, 0.032)
		guard.mesh = g_box
		var g_mat = StandardMaterial3D.new()
		g_mat.albedo_color = Color("#8f743a")
		g_mat.metallic = 0.65
		guard.material_override = g_mat
		guard.position = Vector3(0, 0, 0.15)
		mesh_inst.add_child(guard)
		var grip = MeshInstance3D.new()
		var gr_cyl = CylinderMesh.new()
		gr_cyl.top_radius = 0.020; gr_cyl.bottom_radius = 0.022; gr_cyl.height = 0.12
		grip.mesh = gr_cyl
		var gr_mat = StandardMaterial3D.new()
		gr_mat.albedo_color = Color("#4a2c1c")
		grip.material_override = gr_mat
		grip.rotation_degrees.x = 90.0
		grip.position = Vector3(0, 0, 0.22)
		mesh_inst.add_child(grip)
		shadow_rx = 0.36; shadow_rz = 0.16
	elif pickup_id == "cartographer_tools":
		var case_box = BoxMesh.new()
		case_box.size = Vector3(0.28, 0.05, 0.20)
		mesh_inst.mesh = case_box
		mesh_inst.position = Vector3(0.0, 0.028, 0.0)
		mesh_inst.rotation_degrees = Vector3(0.0, -14.0, 0.0)
		mat.albedo_color = Color("#5d442b")
		mat.metallic = 0.18
		mat.roughness = 0.74
		var arc = MeshInstance3D.new()
		var arc_tor = TorusMesh.new()
		arc_tor.inner_radius = 0.055; arc_tor.outer_radius = 0.075
		arc.mesh = arc_tor
		var b_mat = StandardMaterial3D.new()
		b_mat.albedo_color = Color("#b89544")
		b_mat.metallic = 0.72
		arc.material_override = b_mat
		arc.position = Vector3(0.03, 0.042, 0)
		mesh_inst.add_child(arc)
	elif pickup_id == "stash":
		var box = BoxMesh.new()
		box.size = Vector3(0.32, 0.16, 0.22)
		mesh_inst.mesh = box
		mesh_inst.position = Vector3(0.0, 0.08, 0.0)
		var oak_mat = StandardMaterial3D.new()
		oak_mat.albedo_color = Color("#5d432c")
		oak_mat.roughness = 0.78
		mat = oak_mat
	elif pickup_id == "potion":
		# Matraz de vidrio rubí apoyado verticalmente sobre la encimera
		var flask = SphereMesh.new()
		flask.radius = 0.10
		flask.height = 0.20
		mesh_inst.mesh = flask
		mesh_inst.position = Vector3(0.0, 0.10, 0.0)
		mat.albedo_color = Color("#8f1e2c")
		mat.roughness = 0.18
		mat.metallic_specular = 0.70

		var neck = MeshInstance3D.new()
		var n_cyl = CylinderMesh.new()
		n_cyl.top_radius = 0.035
		n_cyl.bottom_radius = 0.048
		n_cyl.height = 0.09
		neck.mesh = n_cyl
		neck.material_override = mat
		neck.position = Vector3(0, 0.12, 0)
		mesh_inst.add_child(neck)

		var cork = MeshInstance3D.new()
		var c_cyl = CylinderMesh.new()
		c_cyl.top_radius = 0.038
		c_cyl.bottom_radius = 0.032
		c_cyl.height = 0.045
		cork.mesh = c_cyl
		var c_mat = StandardMaterial3D.new()
		c_mat.albedo_color = Color("#7a5c3a")
		c_mat.roughness = 0.92
		cork.material_override = c_mat
		cork.position = Vector3(0, 0.18, 0)
		mesh_inst.add_child(cork)
		shadow_rx = 0.20; shadow_rz = 0.20
	elif pickup_id == "gold":
		var coin_stack = CylinderMesh.new()
		coin_stack.top_radius = 0.12
		coin_stack.bottom_radius = 0.14
		coin_stack.height = 0.075
		coin_stack.radial_segments = 10
		mesh_inst.mesh = coin_stack
		mesh_inst.position = Vector3(0.0, 0.038, 0.0)
		mat.albedo_color = Color("#b89535")
		mat.metallic = 0.80
		mat.roughness = 0.32
		shadow_rx = 0.24; shadow_rz = 0.24
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

	_pickup_mat = mat
	mesh_inst.material_override = mat
	add_child(mesh_inst)

	if pickup_id != "gems":
		var ao := PbrMaterialKit.create_blob_shadow(shadow_rx, shadow_rz, 0.54)
		ao.name = "PickupContactShadow"
		ao.position = Vector3(0.0, 0.010, 0.0)
		add_child(ao)

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

func _on_body_entered(body: Node) -> void:
	if body is PlayerToken and body.is_active_player:
		var vessel = get_tree().root.find_child("ShipVessel", true, false)
		var p_y = vessel.to_local(body.global_position).y if vessel else body.global_position.y
		var m_y = vessel.to_local(global_position).y if vessel else global_position.y
		if abs(p_y - m_y) > 1.8:
			return
		is_player_nearby = true
		nearby_player = body
		if _pickup_mat and pickup_id != "gems":
			_pickup_mat.emission_enabled = true
			_pickup_mat.emission_energy_multiplier = 0.20
		var inv = get_tree().root.find_child("InventoryManager", true, false)
		if inv:
			inv.show_prompt("[T] Recoger " + item_name)

func _on_body_exited(body: Node) -> void:
	if body == nearby_player:
		is_player_nearby = false
		nearby_player = null
		if _pickup_mat:
			_pickup_mat.emission_enabled = false
			_pickup_mat.emission_energy_multiplier = 0.0
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
				nearby_player.play_object_action("stow_item", global_position)
			mark_collected_silent()
			if bool(res.get("already_looted", false)):
				return
			return
	var vtt := get_tree().root.find_child("VttRoleUi", true, false)
	if vtt and "world_state" in vtt and vtt.world_state and vtt.world_state.has_method("mark_pickup_collected"):
		var ws_p = vtt.world_state
		ws_p.mark_pickup_collected(name)
		if name == "PickupCompassC4":
			ws_p.c4_compass_taken = true
			ws_p.save_state()
		elif name in ["PickupGoldC4", "PickupCartographerC4", "PickupDaggerC4"]:
			if ws_p.is_pickup_collected("PickupGoldC4") and ws_p.is_pickup_collected("PickupCartographerC4") and ws_p.is_pickup_collected("PickupDaggerC4"):
				ws_p.c4_desk_looted = true
				ws_p.save_state()
	var inv = get_tree().root.find_child("InventoryManager", true, false)
	if inv:
		inv.add_item(pickup_id, amount, item_name)
		inv.hide_prompt()

	if nearby_player:
		nearby_player.play_object_action("stow_item", global_position)

	mark_collected_silent()

func _unhandled_input(event: InputEvent) -> void:
	if is_player_nearby and event is InputEventKey and event.is_pressed() and not event.is_echo() and not event.ctrl_pressed and not event.alt_pressed:
		if event.keycode == KEY_T:
			collect()
			get_viewport().set_input_as_handled()
