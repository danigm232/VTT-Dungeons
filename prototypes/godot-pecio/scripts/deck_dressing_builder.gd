class_name DeckDressingBuilder
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")

# Generador de Microdetalle, Dressing, Mobiliario Canónico y Faroles Ámbar
# Cubre Zona C1 (Principal), Zona C2 (Castillo Proa), Zona C3 (Castillo Popa) y Zona C10 (Cofa)
# Conforme a engine/client/wreck-deck-dressing.ts, wreck-runtime-v6.ts y PECIO_SPATIAL_PLAN.md

var mat_iron: StandardMaterial3D
var mat_wood_crate: StandardMaterial3D
var mat_rope: StandardMaterial3D
var mat_crab: StandardMaterial3D
var mat_seagull: StandardMaterial3D
var mat_skeleton: StandardMaterial3D
var mat_bronze: StandardMaterial3D
var mat_nest_thorns: StandardMaterial3D

var animated_fauna: Array[Node3D] = []
var flickering_lights: Array[Dictionary] = []

func _ready() -> void:
	setup_materials()
	build_zone_c1_main_deck()
	build_zone_c2_forecastle()
	build_zone_c3_poop_deck()
	build_zone_c10_crows_nest()
	build_ambient_lanterns()

func setup_materials() -> void:
	mat_iron = PbrMaterialKit.create_iron_pbr("#232524", 0.56, 0.78)

	mat_bronze = PbrMaterialKit.create_aged_copper_pbr("#665132")

	mat_wood_crate = PbrMaterialKit.create_oak_furniture_pbr("#4c3e2e")
	mat_wood_crate.roughness = 0.92

	mat_rope = PbrMaterialKit.create_rope_cable_pbr("#483b2a")

	mat_crab = StandardMaterial3D.new()
	mat_crab.albedo_color = Color("#6b3623")
	mat_crab.roughness = 0.58
	mat_crab.metallic_specular = 0.3

	mat_seagull = StandardMaterial3D.new()
	mat_seagull.albedo_color = Color("#c8cecc")
	mat_seagull.roughness = 0.75

	mat_skeleton = PbrMaterialKit.create_mineralized_bone_pbr("#a69e8c")

	mat_nest_thorns = PbrMaterialKit.create_oak_furniture_pbr("#32291c")
	mat_nest_thorns.roughness = 0.97

# ==============================================================================
# ZONA 1: CUBIERTA PRINCIPAL (C1)
# ==============================================================================
func build_zone_c1_main_deck() -> void:
	var c1_node = Node3D.new()
	c1_node.name = "Zone_C1_MainDeck"
	add_child(c1_node)

	# 1. Base del Mástil Mayor con bancada de cabillas (Fife Rail) y cabos tensados
	var fife_rail = Node3D.new()
	fife_rail.name = "MastFifeRail"
	c1_node.add_child(fife_rail)

	var fife_st := ShipGeometry.begin(PbrMaterialKit.create_oak_furniture_pbr("#5c4c38"))
	for fx in [-0.70, 0.70]:
		for fz in [-0.70, 0.70]:
			ShipGeometry.beam(fife_st, Vector3(fx, 0.0, fz), Vector3(fx, 0.45, fz), 0.18)
		ShipGeometry.beam(fife_st, Vector3(fx, 0.40, -0.80), Vector3(fx, 0.40, 0.80), 0.20)
	ShipGeometry.beam(fife_st, Vector3(-0.80, 0.40, -0.70), Vector3(0.80, 0.40, -0.70), 0.20)
	ShipGeometry.commit(fife_rail, "FifeJoinery", fife_st)

	# Cabillas de forja en el borde de la bancada
	for dx in [-0.7, 0.7]:
		for dz in [-0.5, 0.0, 0.5]:
			var pin = MeshInstance3D.new()
			var pin_cyl = CylinderMesh.new()
			pin_cyl.top_radius = 0.02
			pin_cyl.bottom_radius = 0.02
			pin_cyl.height = 0.35
			pin.mesh = pin_cyl
			pin.material_override = mat_iron
			pin.position = Vector3(dx, 0.55, dz)
			fife_rail.add_child(pin)

	PbrMaterialKit.add_box_collider(fife_rail, "Col_FifeRail", Vector3(1.74, 1.15, 1.74), Vector3(0, 0.56, 0))

	var mast_shadow = PbrMaterialKit.create_blob_shadow(1.8, 1.8, 0.65)
	mast_shadow.position = Vector3(0.0, 0.02, 0.0)
	fife_rail.add_child(mast_shadow)

	var prop_fife = InteractiveProp.new()
	prop_fife.name = "PropFifeRail"
	prop_fife.prop_id = "c1_fife_rail"
	prop_fife.prompt_text = "Examinar Bancada de Cabillas del Mástil"
	prop_fife.inspection_message = "Cabos de cáñamo endurecidos por la salitre y cabillas de forja encajadas con firmeza tras 50 años."
	prop_fife.interaction_radius = 2.4
	fife_rail.add_child(prop_fife)

	# 2. Escotilla de Carga Principal (c1-hatch) en babor (-4.5, -6.75) despejando escalera C8
	var hatch_node = Node3D.new()
	hatch_node.name = "CargoHatch_C1"
	hatch_node.position = WreckStructure.get_world_pos(-4.5, 0.05, -6.75)
	c1_node.add_child(hatch_node)

	var hatch_st := ShipGeometry.begin(mat_wood_crate)
	for hz in [-0.80, 0.80]:
		ShipGeometry.beam(hatch_st, Vector3(-1.2, 0.09, hz), Vector3(1.2, 0.09, hz), 0.18)
	for hx in [-1.1, 1.1]:
		ShipGeometry.beam(hatch_st, Vector3(hx, 0.09, -0.80), Vector3(hx, 0.09, 0.80), 0.18)
	ShipGeometry.commit(hatch_node, "HatchJoinery", hatch_st)

	var pit_bg = MeshInstance3D.new()
	var pit_box = BoxMesh.new()
	pit_box.size = Vector3(2.05, 0.04, 1.45)
	pit_bg.mesh = pit_box
	var mat_pit := StandardMaterial3D.new()
	mat_pit.albedo_color = Color("#0c0c0d")
	mat_pit.roughness = 0.98
	pit_bg.material_override = mat_pit
	pit_bg.position = Vector3(0, 0.165, 0)
	hatch_node.add_child(pit_bg)

	for ix in range(5):
		var bar_x := lerpf(-0.85, 0.85, float(ix) / 4.0)
		var slat = MeshInstance3D.new()
		var sl_box = BoxMesh.new()
		sl_box.size = Vector3(0.06, 0.05, 1.48)
		slat.mesh = sl_box
		slat.material_override = mat_iron
		slat.position = Vector3(bar_x, 0.20, 0)
		hatch_node.add_child(slat)

	for iz in range(4):
		var bar_z := lerpf(-0.55, 0.55, float(iz) / 3.0)
		var cross = MeshInstance3D.new()
		var cr_box = BoxMesh.new()
		cr_box.size = Vector3(2.08, 0.05, 0.06)
		cross.mesh = cr_box
		cross.material_override = mat_iron
		cross.position = Vector3(0, 0.20, bar_z)
		hatch_node.add_child(cross)

	PbrMaterialKit.add_box_collider(hatch_node, "Col_CargoHatch", Vector3(2.42, 0.48, 1.82), Vector3(0, 0.24, 0))

	var hatch_shadow = PbrMaterialKit.create_blob_shadow(1.5, 1.2, 0.55)
	hatch_shadow.position = Vector3(0, 0.01, 0)
	hatch_node.add_child(hatch_shadow)

	# 3. Pila de Carga de Babor (Cajas, botellas, barriles de ron con colisionadores)
	var crate_res = load("res://assets/models/crate.glb")
	var crate_bot_res = load("res://assets/models/crate-bottles.glb")
	var barrel_res = load("res://assets/models/barrel.glb")

	if crate_res:
		var c1 = crate_res.instantiate()
		c1.position = WreckStructure.get_world_pos(-7.5, 0.0, -3.8)
		c1.rotation.y = 0.15
		c1.scale = Vector3(1.05, 1.05, 1.05)
		PbrMaterialKit.apply_kenney_material(c1)
		c1_node.add_child(c1)
		PbrMaterialKit.add_box_collider(c1_node, "Col_CrateC1_A", Vector3(1.02, 1.75, 1.02), c1.position + Vector3(0, 0.85, 0))
	var s_c1 = PbrMaterialKit.create_blob_shadow(0.95, 0.95, 0.6)
	s_c1.position = WreckStructure.get_world_pos(-7.5, 0.02, -3.8)
	c1_node.add_child(s_c1)

	if crate_bot_res:
		var cb = crate_bot_res.instantiate()
		cb.position = WreckStructure.get_world_pos(-7.4, 0.80, -3.75)
		cb.rotation.y = -0.3
		cb.scale = Vector3(0.9, 0.9, 0.9)
		PbrMaterialKit.apply_kenney_material(cb)
		c1_node.add_child(cb)

	if crate_res:
		var c2 = crate_res.instantiate()
		c2.position = WreckStructure.get_world_pos(-8.8, 0.0, -3.2)
		c2.rotation.y = -0.4
		c2.scale = Vector3(0.9, 0.9, 0.9)
		PbrMaterialKit.apply_kenney_material(c2)
		c1_node.add_child(c2)
		PbrMaterialKit.add_box_collider(c1_node, "Col_CrateC1_B", Vector3(0.85, 0.95, 0.85), c2.position + Vector3(0, 0.45, 0))
	var s_c2 = PbrMaterialKit.create_blob_shadow(0.85, 0.85, 0.55)
	s_c2.position = WreckStructure.get_world_pos(-8.8, 0.02, -3.2)
	c1_node.add_child(s_c2)

	# Barriles de ron dispersos a escala táctica D&D (1.0m altura)
	var barrels_c1 = [
		{"pos": WreckStructure.get_world_pos(-6.0, 0.0, -4.2), "rot": 0.4, "scale": Vector3(0.88, 0.88, 0.88)},
		{"pos": WreckStructure.get_world_pos(-6.2, 0.0, -3.0), "rot": -0.6, "scale": Vector3(0.82, 0.82, 0.82)},
		{"pos": WreckStructure.get_world_pos(7.2, 0.0, 3.8),   "rot": 0.3, "scale": Vector3(0.92, 0.92, 0.92)},
		{"pos": WreckStructure.get_world_pos(8.6, 0.0, 3.2),   "rot": -0.2, "scale": Vector3(0.82, 0.82, 0.82)}
	]
	for b_idx in range(barrels_c1.size()):
		var b = barrels_c1[b_idx]
		if barrel_res:
			var b_inst = barrel_res.instantiate()
			b_inst.position = b.pos
			b_inst.rotation.y = b.rot
			b_inst.scale = b.scale
			PbrMaterialKit.apply_kenney_material(b_inst)
			c1_node.add_child(b_inst)
			PbrMaterialKit.add_cyl_collider(c1_node, "Col_BarrelC1_%d" % b_idx, 0.42, 0.95, b.pos + Vector3(0, 0.45, 0))
		var b_shadow = PbrMaterialKit.create_blob_shadow(0.7, 0.7, 0.58)
		b_shadow.position = Vector3(b.pos.x, b.pos.y + 0.02, b.pos.z)
		c1_node.add_child(b_shadow)

	# Pila de Carga de Estribor (Cajas)
	if crate_res:
		var c3 = crate_res.instantiate()
		c3.position = WreckStructure.get_world_pos(7.8, 0.0, 2.4)
		c3.rotation.y = 0.5
		c3.scale = Vector3(0.95, 0.95, 0.95)
		PbrMaterialKit.apply_kenney_material(c3)
		c1_node.add_child(c3)
		PbrMaterialKit.add_box_collider(c1_node, "Col_CrateC1_C", Vector3(0.90, 1.0, 0.90), c3.position + Vector3(0, 0.48, 0))
	var s_c3 = PbrMaterialKit.create_blob_shadow(0.85, 0.85, 0.55)
	s_c3.position = WreckStructure.get_world_pos(7.8, 0.02, 2.4)
	c1_node.add_child(s_c3)

	# Rollos de cabos marineros (despejando brazola de escalera C8)
	var rope_spots = [
		Vector3(-2.0, 0.08, -4.5),
		Vector3(-6.5, 0.08, 2.2),
		Vector3(-5.0, 0.08, 3.8),
		Vector3(5.5, 0.08, -3.5)
	]
	for r_pos in rope_spots:
		var coil_st := ShipGeometry.begin(mat_rope)
		var spiral: Array[Vector3] = []
		for k in range(91):
			var t := float(k) / 90.0
			var radius := lerpf(0.08, 0.46, t)
			var angle := t * TAU * 2.5
			spiral.append(Vector3(cos(angle) * radius, 0.025, sin(angle) * radius))
		spiral.append(Vector3(-0.50, 0.025, 0.06))
		ShipGeometry.tube(coil_st, spiral, 0.025)
		var coil := ShipGeometry.commit(c1_node, "RopeCoil_%d" % c1_node.get_child_count(), coil_st)
		coil.position = r_pos

		var r_shadow = PbrMaterialKit.create_blob_shadow(0.65, 0.65, 0.5)
		r_shadow.position = Vector3(r_pos.x, 0.015, r_pos.z)
		c1_node.add_child(r_shadow)

	# Esqueleto de marinero ahogado en el imbornal de babor
	var bones := ShipGeometry.begin(mat_skeleton)
	ShipGeometry.tube(bones, [Vector3(-0.12, 0.05, 0), Vector3(0.10, 0.08, 0), Vector3(0.34, 0.06, 0)], 0.024)
	for side in [-1.0, 1.0]:
		ShipGeometry.tube(bones, [Vector3(-0.12, 0.05, 0), Vector3(-0.30, 0.04, side * 0.10), Vector3(-0.49, 0.03, side * 0.08)], 0.025)
		ShipGeometry.tube(bones, [Vector3(0.26, 0.06, side * 0.12), Vector3(0.08, 0.04, side * 0.22), Vector3(-0.10, 0.03, side * 0.20)], 0.019)
		for rib in range(5):
			var arc: Array[Vector3] = []
			for k in range(7):
				var t := float(k) / 6.0
				arc.append(Vector3(0.03 + rib * 0.045, 0.055 + sin(t * PI) * 0.075, side * sin(t * PI * 0.85) * (0.12 + rib * 0.004)))
			ShipGeometry.tube(bones, arc, 0.012)
	var skel1 := ShipGeometry.commit(c1_node, "SailorRemains_C1", bones)
	# Clear the adjacent barrel by 25 cm; interaction and all cargo collisions stay put.
	skel1.position = Vector3(-6.0, 0.04, -4.85)

	var skull1 = MeshInstance3D.new()
	var sph1 = SphereMesh.new()
	sph1.radius = 0.12
	sph1.height = 0.22
	skull1.mesh = sph1
	skull1.material_override = mat_skeleton
	skull1.position = Vector3(-5.5, 0.22, -4.7)
	c1_node.add_child(skull1)

	var prop_skel1 = InteractiveProp.new()
	prop_skel1.name = "PropSkelC1"
	prop_skel1.prop_id = "c1_sailor_remains"
	prop_skel1.prompt_text = "Inspeccionar Restos del Marinero de Cubierta"
	prop_skel1.inspection_message = "Un marinero caído durante la tormenta. Entre sus dedos agarrotados asoma un doblón corroído por el mar."
	prop_skel1.position = Vector3(-5.8, 0.2, -4.6)
	prop_skel1.interaction_radius = 2.2
	c1_node.add_child(prop_skel1)

	# Cangrejos en charcas de C1
	var crab1 = create_crab_mesh()
	crab1.position = Vector3(-4.0, 0.08, -2.5)
	c1_node.add_child(crab1)
	animated_fauna.append(crab1)

	var crab2 = create_crab_mesh()
	crab2.position = Vector3(1.5, 0.08, 3.0)
	c1_node.add_child(crab2)
	animated_fauna.append(crab2)

# ==============================================================================
# ZONA 2: CASTILLO DE PROA (C2, +3.0m)
# ==============================================================================
func build_zone_c2_forecastle() -> void:
	var c2_node = Node3D.new()
	c2_node.name = "Zone_C2_Forecastle"
	add_child(c2_node)

	# 1. Trinquete roto (c2-mast) y tronco caído atravesando la borda (c2-mast-fallen)
	var foremast_stump = MeshInstance3D.new()
	foremast_stump.name = "ForemastStump_C2"
	var cyl_stump = CylinderMesh.new()
	cyl_stump.top_radius = 0.32
	cyl_stump.bottom_radius = 0.36
	cyl_stump.height = 2.2
	foremast_stump.mesh = cyl_stump
	foremast_stump.material_override = PbrMaterialKit.create_weathered_hull_pbr("#4a3e30")
	foremast_stump.position = Vector3(21.0, 4.1, 0.0)
	c2_node.add_child(foremast_stump)
	PbrMaterialKit.add_cyl_collider(c2_node, "Col_ForemastStump", 0.42, 2.3, foremast_stump.position)

	var stump_shadow = PbrMaterialKit.create_blob_shadow(1.1, 1.1, 0.6)
	stump_shadow.position = Vector3(21.0, 3.02, 0.0)
	c2_node.add_child(stump_shadow)

	# Tronco caído que cruza la borda norte hacia el arrecife con colisionador
	var fallen_mast = MeshInstance3D.new()
	fallen_mast.name = "FallenForemast_C2"
	var cyl_fallen = CylinderMesh.new()
	cyl_fallen.top_radius = 0.22
	cyl_fallen.bottom_radius = 0.30
	cyl_fallen.height = 11.5
	fallen_mast.mesh = cyl_fallen
	fallen_mast.material_override = PbrMaterialKit.create_weathered_hull_pbr("#4a3e30")
	fallen_mast.position = Vector3(25.5, 3.8, -4.5)
	fallen_mast.rotation_degrees = Vector3(14, -42, 68)
	c2_node.add_child(fallen_mast)
	var col_fallen := PbrMaterialKit.add_cyl_collider(c2_node, "Col_FallenForemast", 0.32, 11.2, fallen_mast.position)
	col_fallen.rotation_degrees = fallen_mast.rotation_degrees

	# 2. Balista Naval Canónica (c2-ballista-blockout)
	var ballista_node = Node3D.new()
	ballista_node.name = "NavalBallista_C2"
	ballista_node.position = Vector3(21.0, 3.15, -3.2)
	ballista_node.rotation_degrees = Vector3(0, -65, 0)
	c2_node.add_child(ballista_node)

	# Cureña / afuste de madera con pivote de bronce
	var carriage = MeshInstance3D.new()
	var car_box = BoxMesh.new()
	car_box.size = Vector3(1.8, 0.65, 0.7)
	carriage.mesh = car_box
	carriage.material_override = PbrMaterialKit.create_oak_furniture_pbr("#423525")
	carriage.position = Vector3(0, 0.32, 0)
	ballista_node.add_child(carriage)

	var pivot = MeshInstance3D.new()
	var piv_cyl = CylinderMesh.new()
	piv_cyl.top_radius = 0.08
	piv_cyl.bottom_radius = 0.12
	piv_cyl.height = 0.4
	pivot.mesh = piv_cyl
	pivot.material_override = mat_bronze
	pivot.position = Vector3(0, 0.75, 0)
	ballista_node.add_child(pivot)

	# Brazos curvados de tensión de la balista
	var bow_beam = MeshInstance3D.new()
	var bow_box = BoxMesh.new()
	bow_box.size = Vector3(0.18, 0.22, 2.4)
	bow_beam.mesh = bow_box
	bow_beam.material_override = PbrMaterialKit.create_oak_furniture_pbr("#362b1e")
	# Broken distal starboard arm: keep the original object and collision envelope.
	bow_box.size.z = 1.35
	bow_beam.position = Vector3(0.7, 0.85, -0.45)
	ballista_node.add_child(bow_beam)

	# Arpón/virote de hierro cargado
	var bolt = MeshInstance3D.new()
	var bolt_cyl = CylinderMesh.new()
	bolt_cyl.top_radius = 0.015
	bolt_cyl.bottom_radius = 0.03
	bolt_cyl.height = 1.9
	bolt.mesh = bolt_cyl
	bolt.material_override = mat_iron
	bolt.position = Vector3(-0.05, 0.15, 0.42)
	bolt.rotation_degrees = Vector3(0, 0, 90)
	ballista_node.add_child(bolt)

	PbrMaterialKit.add_box_collider(ballista_node, "Col_Ballista", Vector3(1.9, 1.2, 2.2), Vector3(0.1, 0.55, 0))

	var ballista_shadow = PbrMaterialKit.create_blob_shadow(1.4, 1.1, 0.6)
	ballista_shadow.position = Vector3(0, -0.13, 0)
	ballista_node.add_child(ballista_shadow)

	var prop_ballista = InteractiveProp.new()
	prop_ballista.name = "PropBallistaC2"
	prop_ballista.prop_id = "c2_ballista"
	prop_ballista.prompt_text = "Inspeccionar Balista Naval"
	prop_ballista.inspection_message = "Balista inutilizable: brazo partido, cuerda rota y virote oxidado depositado sobre el afuste."
	prop_ballista.interaction_radius = 2.4
	ballista_node.add_child(prop_ballista)

	# 3. Cañón Naval y Cureña con ruedas asentados en cubierta inclinada C2
	var cannon_pos = WreckStructure.get_world_pos(25.0, 3.0, 2.5)
	var cannon_res = load("res://assets/models/cannon.glb")
	if cannon_res:
		var c_inst = cannon_res.instantiate()
		c_inst.position = cannon_pos
		c_inst.rotation.y = deg_to_rad(75)
		c_inst.scale = Vector3(1.15, 1.15, 1.15)
		PbrMaterialKit.apply_kenney_material(c_inst)
		c2_node.add_child(c_inst)
		PbrMaterialKit.add_box_collider(c2_node, "Col_CannonC2", Vector3(1.5, 1.1, 1.1), cannon_pos + Vector3(0, 0.5, 0))

	# Mancha de escorrentía de óxido ferroso bajo el cañón (50 años de intemperie)
	var rust_cannon = PbrMaterialKit.create_rust_stain_mesh(1.8, 1.4, 0.75)
	rust_cannon.position = cannon_pos + Vector3(0, 0.015, 0)
	c2_node.add_child(rust_cannon)

	var cannon_shadow = PbrMaterialKit.create_blob_shadow(1.5, 1.1, 0.62)
	cannon_shadow.position = cannon_pos + Vector3(0, 0.02, 0)
	c2_node.add_child(cannon_shadow)

	var prop_cannon = InteractiveProp.new()
	prop_cannon.name = "PropCannonC2"
	prop_cannon.prop_id = "c2_cannon"
	prop_cannon.prompt_text = "Examinar Cañón Naval de Proa"
	prop_cannon.inspection_message = "Cañón naval de 18 libras desgastado por 50 años de temporal marino. En el muñón se aprecia la marca real de Waterdeep."
	prop_cannon.position = cannon_pos + Vector3(0, 0.2, 0)
	prop_cannon.interaction_radius = 2.4
	c2_node.add_child(prop_cannon)

	# Pirámide de balas de cañón con colisionador
	var cball_res = load("res://assets/models/cannon-ball.glb")
	if cball_res:
		for cb_pt in [Vector3(23.5, 3.0, 3.4), Vector3(23.8, 3.0, 3.2), Vector3(23.6, 3.2, 3.3)]:
			var cb_inst = cball_res.instantiate()
			cb_inst.position = WreckStructure.get_world_pos(cb_pt.x, cb_pt.y, cb_pt.z)
			cb_inst.scale = Vector3(1.4, 1.4, 1.4)
			PbrMaterialKit.apply_kenney_material(cb_inst)
			c2_node.add_child(cb_inst)
		PbrMaterialKit.add_cyl_collider(c2_node, "Col_CannonBallsC2", 0.42, 0.60, WreckStructure.get_world_pos(23.65, 3.25, 3.3))

	# 4. Molinete de ancla (Capstan) de madera con barras de maniobra y cabezal de hierro
	var capstan_node = Node3D.new()
	capstan_node.name = "Capstan_C2"
	capstan_node.position = WreckStructure.get_world_pos(25.6, 3.0, 0.0)
	c2_node.add_child(capstan_node)

	# Mancha concéntrica de óxido bajo el cabrestante de ancla
	var rust_capstan = PbrMaterialKit.create_rust_stain_mesh(1.6, 1.6, 0.68)
	rust_capstan.position = WreckStructure.get_world_pos(25.6, 3.015, 0.0)
	c2_node.add_child(rust_capstan)

	var cap_drum = MeshInstance3D.new()
	var cap_cyl = CylinderMesh.new()
	cap_cyl.top_radius = 0.38
	cap_cyl.bottom_radius = 0.45
	cap_cyl.height = 0.95
	cap_drum.mesh = cap_cyl
	cap_drum.material_override = PbrMaterialKit.create_oak_furniture_pbr("#554331")
	cap_drum.position = Vector3(0, 0.48, 0)
	capstan_node.add_child(cap_drum)

	var cap_collar = MeshInstance3D.new()
	var cap_col_cyl = CylinderMesh.new()
	cap_col_cyl.top_radius = 0.41
	cap_col_cyl.bottom_radius = 0.41
	cap_col_cyl.height = 0.14
	cap_collar.mesh = cap_col_cyl
	cap_collar.material_override = mat_iron
	cap_collar.position = Vector3(0, 0.85, 0)
	capstan_node.add_child(cap_collar)

	# Barras horizontales de empuje
	for rot_deg in [0, 45, 90, 135]:
		var bar = MeshInstance3D.new()
		var bar_cyl = CylinderMesh.new()
		bar_cyl.top_radius = 0.03
		bar_cyl.bottom_radius = 0.03
		bar_cyl.height = 1.6
		bar.mesh = bar_cyl
		bar.material_override = PbrMaterialKit.create_oak_furniture_pbr("#705942")
		bar.position = Vector3(0, 0.75, 0)
		bar.rotation_degrees = Vector3(90, rot_deg, 0)
		capstan_node.add_child(bar)

	var cap_shadow = PbrMaterialKit.create_blob_shadow(1.2, 1.2, 0.6)
	cap_shadow.position = Vector3(0, 0.02, 0)
	capstan_node.add_child(cap_shadow)

	PbrMaterialKit.add_cyl_collider(capstan_node, "Col_CapstanC2", 0.55, 1.1, Vector3(0, 0.55, 0))

	var prop_capstan = InteractiveProp.new()
	prop_capstan.name = "PropCapstanC2"
	prop_capstan.prop_id = "c2_capstan"
	prop_capstan.prompt_text = "Girar Molinete de Ancla"
	prop_capstan.inspection_message = "Empujas las barras de roble. El cabrestante cruje con fuerza liberando cascarillas de óxido."
	prop_capstan.interaction_radius = 2.4
	prop_capstan.anim_type = "rotate_y"
	prop_capstan.target_node = capstan_node
	capstan_node.add_child(prop_capstan)

	# 5. Cadena pesada de ancla hacia escobenes de proa y bitas de amarre (el bauprés completo vive en HullBuilder)
	var chain_node = Node3D.new()
	chain_node.name = "Chain_C2"
	c2_node.add_child(chain_node)
	for li in range(9):
		var lx := lerpf(26.0, 29.0, float(li) / 8.0)
		var link = MeshInstance3D.new()
		var l_tor = TorusMesh.new()
		l_tor.inner_radius = 0.055; l_tor.outer_radius = 0.095
		link.mesh = l_tor
		link.material_override = mat_iron
		link.position = WreckStructure.get_world_pos(lx, 3.07, sin(float(li) * 0.7) * 0.14 + 0.55)
		link.rotation_degrees = Vector3(90.0 if (li % 2 == 0) else 25.0, 12.0, 0.0)
		chain_node.add_child(link)

	for kz in [-1.05, 1.05]:
		var bitt = MeshInstance3D.new()
		var bt_box = BoxMesh.new()
		bt_box.size = Vector3(0.24, 0.72, 0.24)
		bitt.mesh = bt_box
		bitt.material_override = PbrMaterialKit.create_oak_furniture_pbr("#4c3c2c")
		bitt.position = WreckStructure.get_world_pos(28.3, 3.35, kz)
		c2_node.add_child(bitt)
		PbrMaterialKit.add_box_collider(c2_node, "Col_Bitt_%d" % int(sign(kz)), Vector3(0.28, 0.78, 0.28), bitt.position)

	# Gaviota posada sobre bita de amarre en proa (sin flotar)
	_spawn_perched_seagull(c2_node, 26.0, 3.0, 2.5, -1.2)

# ==============================================================================
# ZONA 3: CASTILLO DE POPA (C3, +3.0m)
# ==============================================================================
func build_zone_c3_poop_deck() -> void:
	var c3_node = Node3D.new()
	c3_node.name = "Zone_C3_PoopDeck"
	add_child(c3_node)

	# 1. Timón Náutico (wheel-v3) con pedestal de engranajes y 8 radios
	var wheel_node = Node3D.new()
	wheel_node.name = "SteeringWheel_C3"
	wheel_node.position = WreckStructure.get_world_pos(-22.5, 3.0, 0.0)
	c3_node.add_child(wheel_node)

	# Pedestal de gobierno
	var pedestal = MeshInstance3D.new()
	var ped_box = BoxMesh.new()
	ped_box.size = Vector3(0.65, 1.15, 0.55)
	pedestal.mesh = ped_box
	pedestal.material_override = PbrMaterialKit.create_oak_furniture_pbr("#4f3e2b")
	pedestal.position = Vector3(0, 0.58, 0)
	wheel_node.add_child(pedestal)

	# Aro exterior del timón
	var wheel_ring = MeshInstance3D.new()
	var ring_torus = TorusMesh.new()
	ring_torus.inner_radius = 0.65
	ring_torus.outer_radius = 0.78
	wheel_ring.mesh = ring_torus
	wheel_ring.material_override = PbrMaterialKit.create_oak_furniture_pbr("#6b543b")
	wheel_ring.position = Vector3(0.25, 1.2, 0)
	wheel_ring.rotation_degrees = Vector3(0, 0, 90)
	wheel_node.add_child(wheel_ring)

	# Cubo central de bronce
	var hub = MeshInstance3D.new()
	var hub_cyl = CylinderMesh.new()
	hub_cyl.top_radius = 0.16
	hub_cyl.bottom_radius = 0.16
	hub_cyl.height = 0.35
	hub.mesh = hub_cyl
	hub.material_override = mat_bronze
	hub.position = Vector3(0.25, 1.2, 0)
	hub.rotation_degrees = Vector3(0, 0, 90)
	wheel_node.add_child(hub)

	# 8 radios torneados con mangos
	for i in range(8):
		var ang_deg = i * 45.0
		var spoke = MeshInstance3D.new()
		var spoke_cyl = CylinderMesh.new()
		spoke_cyl.top_radius = 0.02
		spoke_cyl.bottom_radius = 0.035
		spoke_cyl.height = 1.8
		spoke.mesh = spoke_cyl
		spoke.material_override = PbrMaterialKit.create_oak_furniture_pbr("#7a6144")
		spoke.position = Vector3(0.25, 1.2, 0)
		spoke.rotation_degrees = Vector3(ang_deg, 0, 0)
		wheel_node.add_child(spoke)

	var wheel_shadow = PbrMaterialKit.create_blob_shadow(1.1, 1.0, 0.6)
	wheel_shadow.position = Vector3(0, 0.02, 0)
	wheel_node.add_child(wheel_shadow)

	PbrMaterialKit.add_box_collider(wheel_node, "Col_WheelC3", Vector3(0.95, 1.6, 1.4), Vector3(0.1, 0.8, 0))

	var prop_wheel = InteractiveProp.new()
	prop_wheel.name = "PropWheelC3"
	prop_wheel.prop_id = "c3_wheel"
	prop_wheel.prompt_text = "Girar Rueda del Timón"
	prop_wheel.inspection_message = "Giras la rueda de 8 radios. Los guardines de hierro transmiten el movimiento a la pala del timón con un crujido sordo."
	prop_wheel.interaction_radius = 2.2
	prop_wheel.anim_type = "rotate_y"
	prop_wheel.target_node = wheel_node
	wheel_node.add_child(prop_wheel)

	# 2. Bitácora de Latón con base de roble, capuchón abovedado y visor de brújula
	var binnacle_node = Node3D.new()
	binnacle_node.name = "Binnacle_C3"
	binnacle_node.position = WreckStructure.get_world_pos(-21.2, 3.0, 0.0)
	c3_node.add_child(binnacle_node)

	var bin_base = MeshInstance3D.new()
	var bb_box = BoxMesh.new()
	bb_box.size = Vector3(0.55, 0.12, 0.55)
	bin_base.mesh = bb_box
	bin_base.material_override = PbrMaterialKit.create_oak_furniture_pbr("#4f3e2b")
	bin_base.position = Vector3(0, 0.06, 0)
	binnacle_node.add_child(bin_base)

	var binnacle = MeshInstance3D.new()
	var bin_cyl = CylinderMesh.new()
	bin_cyl.top_radius = 0.16
	bin_cyl.bottom_radius = 0.21
	bin_cyl.height = 0.85
	binnacle.mesh = bin_cyl
	binnacle.material_override = mat_bronze
	binnacle.position = Vector3(0, 0.54, 0)
	binnacle_node.add_child(binnacle)

	var bin_dome = MeshInstance3D.new()
	var bd_sph = SphereMesh.new()
	bd_sph.radius = 0.21
	bd_sph.height = 0.32
	bin_dome.mesh = bd_sph
	bin_dome.material_override = mat_bronze
	bin_dome.position = Vector3(0, 1.02, 0)
	binnacle_node.add_child(bin_dome)

	var bin_shadow = PbrMaterialKit.create_blob_shadow(0.65, 0.65, 0.55)
	bin_shadow.position = Vector3(0, 0.02, 0)
	binnacle_node.add_child(bin_shadow)

	PbrMaterialKit.add_cyl_collider(binnacle_node, "Col_BinnacleC3", 0.35, 1.2, Vector3(0, 0.6, 0))

	var prop_binnacle = InteractiveProp.new()
	prop_binnacle.name = "PropBinnacleC3"
	prop_binnacle.prop_id = "c3_binnacle"
	prop_binnacle.prompt_text = "Consultar Bitácora y Compás"
	prop_binnacle.inspection_message = "La aguja náutica de latón tiembla apuntando al abismo, perturbada por la presencia del dragón de oro."
	prop_binnacle.interaction_radius = 2.2
	binnacle_node.add_child(prop_binnacle)

	# 3. Tocón del palo de mesana roto
	var mizzen_stump = MeshInstance3D.new()
	var miz_cyl = CylinderMesh.new()
	miz_cyl.top_radius = 0.28
	miz_cyl.bottom_radius = 0.32
	miz_cyl.height = 1.9
	mizzen_stump.mesh = miz_cyl
	mizzen_stump.material_override = PbrMaterialKit.create_weathered_hull_pbr("#4a3e30")
	mizzen_stump.position = WreckStructure.get_world_pos(-17.5, 3.95, 0.0)
	c3_node.add_child(mizzen_stump)
	PbrMaterialKit.add_cyl_collider(c3_node, "Col_MizzenC3", 0.36, 2.0, mizzen_stump.position)

	var miz_shadow = PbrMaterialKit.create_blob_shadow(0.95, 0.95, 0.58)
	miz_shadow.position = WreckStructure.get_world_pos(-17.5, 3.02, 0.0)
	c3_node.add_child(miz_shadow)

	# 4. Farol de Popa Gran Almirante con jaula de forja octogonal en el espejo de popa
	var stern_bracket = MeshInstance3D.new()
	var brk_box = BoxMesh.new()
	brk_box.size = Vector3(0.8, 0.08, 0.08)
	stern_bracket.mesh = brk_box
	stern_bracket.material_override = mat_iron
	stern_bracket.position = Vector3(-28.0, 4.3, 0.0)
	c3_node.add_child(stern_bracket)

	var stern_lantern = _create_lantern_housing(0.24, 0.48, "#ff9830", 1.6)
	stern_lantern.position = Vector3(-28.4, 4.08, 0.0)
	c3_node.add_child(stern_lantern)

	# Luz puntual del farol de popa
	var stern_light = OmniLight3D.new()
	stern_light.name = "SternAdmiralLantern"
	stern_light.position = Vector3(-28.4, 4.1, 0.0)
	stern_light.light_color = Color("#ff9e3b")
	stern_light.light_energy = 1.8
	stern_light.omni_range = 10.5
	stern_light.omni_attenuation = 1.4
	stern_light.shadow_enabled = true
	stern_light.shadow_bias = 0.06
	stern_light.shadow_normal_bias = 2.0
	stern_light.shadow_blur = 1.6
	c3_node.add_child(stern_light)
	flickering_lights.append({"node": stern_light, "base": 1.8, "speed": 2.2, "offset": 1.2})

	var prop_lantern = InteractiveProp.new()
	prop_lantern.name = "PropSternLanternC3"
	prop_lantern.prop_id = "c3_stern_lantern"
	prop_lantern.prompt_text = "Examinar Farol de Popa Gran Almirante"
	prop_lantern.inspection_message = "Farol de bronce y cristal emplomado octogonal. Su llama ámbar resistió medio siglo de temporales marinos."
	prop_lantern.position = Vector3(-27.8, 3.8, 0.0)
	prop_lantern.interaction_radius = 2.4
	c3_node.add_child(prop_lantern)

	# Gaviota posada sobre bita de amarre en popa (sin flotar)
	_spawn_perched_seagull(c3_node, -24.5, 3.0, -3.8, 0.8)

# ==============================================================================
# ZONA 10: NIDO DE LA ARPÍA EN LA COFA (C10, +15.2m)
# ==============================================================================
func build_zone_c10_crows_nest() -> void:
	var c10_node = Node3D.new()
	c10_node.name = "Zone_C10_CrowsNest"
	add_child(c10_node)

	# 1. Base del Nido Orgánico de Espinas y Huesos (harpy_nest_full)
	var nest_base = MeshInstance3D.new()
	var nest_cyl = CylinderMesh.new()
	nest_cyl.top_radius = 2.4
	nest_cyl.bottom_radius = 2.6
	nest_cyl.height = 0.35
	nest_base.mesh = nest_cyl
	nest_base.material_override = mat_nest_thorns
	nest_base.position = Vector3(0.35, 15.35, -0.48)
	c10_node.add_child(nest_base)

	# Ramas entrelazadas espinosas
	for i in range(12):
		var ang = deg_to_rad(i * 30.0)
		var twig = MeshInstance3D.new()
		var tw_box = BoxMesh.new()
		tw_box.size = Vector3(1.1, 0.08, 0.12)
		twig.mesh = tw_box
		twig.material_override = mat_nest_thorns
		twig.position = Vector3(0.35 + cos(ang) * 1.8, 15.48, -0.48 + sin(ang) * 1.8)
		twig.rotation_degrees = Vector3(randf_range(-15, 15), rad_to_deg(ang) + 45.0, randf_range(-10, 10))
		c10_node.add_child(twig)

	# Costillas y huesos humanos de marineros devorados tejidos en el nido
	for i in range(6):
		var ang = deg_to_rad(i * 60.0 + 15.0)
		var rib = MeshInstance3D.new()
		var rib_torus = TorusMesh.new()
		rib_torus.inner_radius = 0.25
		rib_torus.outer_radius = 0.32
		rib.mesh = rib_torus
		rib.material_override = mat_skeleton
		rib.position = Vector3(0.35 + cos(ang) * 1.2, 15.45, -0.48 + sin(ang) * 1.2)
		rib.rotation_degrees = Vector3(randf_range(30, 60), rad_to_deg(ang), randf_range(-20, 20))
		c10_node.add_child(rib)

	# Sombra de contacto del nido sobre la madera de la plataforma
	var nest_shadow = PbrMaterialKit.create_blob_shadow(2.7, 2.7, 0.7)
	nest_shadow.position = Vector3(0.35, 15.22, -0.48)
	c10_node.add_child(nest_shadow)

	var prop_nest = InteractiveProp.new()
	prop_nest.name = "PropHarpyNestC10"
	prop_nest.prop_id = "c10_nest"
	prop_nest.prompt_text = "Inspeccionar Nido de la Arpía"
	prop_nest.inspection_message = "Masa caótica de espinas, huesos pulidos de gaviotas y jirones de velamen donde destellan brazaletes y gemas."
	prop_nest.position = Vector3(0.35, 15.4, -0.48)
	prop_nest.interaction_radius = 2.4
	c10_node.add_child(prop_nest)

# ==============================================================================
# FAROLES AMBIENTALES Y MICRO-ANIMACIÓN
# ==============================================================================
func _create_lantern_housing(radius: float, height: float, hex_color: String, emission_mult: float) -> Node3D:
	var lan_root = Node3D.new()
	lan_root.name = "LanternHousing"

	var base = MeshInstance3D.new()
	var b_cyl = CylinderMesh.new()
	b_cyl.top_radius = radius * 0.92
	b_cyl.bottom_radius = radius * 0.65
	b_cyl.height = height * 0.16
	b_cyl.radial_segments = 6
	base.mesh = b_cyl
	base.material_override = mat_iron
	base.position = Vector3(0, -height * 0.45, 0)
	lan_root.add_child(base)

	var cap = MeshInstance3D.new()
	var c_cyl = CylinderMesh.new()
	c_cyl.top_radius = radius * 0.25
	c_cyl.bottom_radius = radius * 1.15
	c_cyl.height = height * 0.28
	c_cyl.radial_segments = 6
	cap.mesh = c_cyl
	cap.material_override = mat_iron
	cap.position = Vector3(0, height * 0.48, 0)
	lan_root.add_child(cap)

	var glass = MeshInstance3D.new()
	var g_cyl = CylinderMesh.new()
	g_cyl.top_radius = radius * 0.85
	g_cyl.bottom_radius = radius * 0.72
	g_cyl.height = height * 0.70
	g_cyl.radial_segments = 6
	glass.mesh = g_cyl
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_glass = StandardMaterial3D.new()
	mat_glass.albedo_color = Color(hex_color)
	mat_glass.emission_enabled = true
	mat_glass.emission = Color(hex_color)
	mat_glass.emission_energy_multiplier = emission_mult
	glass.material_override = mat_glass
	glass.position = Vector3(0, 0, 0)
	lan_root.add_child(glass)

	return lan_root

func _spawn_perched_seagull(parent: Node3D, x: float, y_deck: float, z: float, rot_y: float) -> void:
	var bitt_pos = WreckStructure.get_world_pos(x, y_deck, z)
	var bitt = MeshInstance3D.new()
	var b_cyl = CylinderMesh.new()
	b_cyl.top_radius = 0.12
	b_cyl.bottom_radius = 0.14
	b_cyl.height = 0.90
	bitt.mesh = b_cyl
	bitt.material_override = mat_wood_crate
	bitt.position = bitt_pos + Vector3(0, 0.45, 0)
	parent.add_child(bitt)

	var bitt_sh = PbrMaterialKit.create_blob_shadow(0.35, 0.35, 0.5)
	bitt_sh.position = bitt_pos + Vector3(0, 0.02, 0)
	parent.add_child(bitt_sh)

	var bird = create_seagull_mesh()
	bird.position = bitt_pos + Vector3(0, 0.93, 0)
	bird.rotation.y = rot_y
	parent.add_child(bird)
	animated_fauna.append(bird)

func build_ambient_lanterns() -> void:
	var lantern_node = Node3D.new()
	lantern_node.name = "AmbientLanterns"
	add_child(lantern_node)

	var spots = [
		{"pos": Vector3(0.0, 1.8, 0.0),    "energy": 1.4, "range": 8.0, "name": "Lantern_C1_Mid", "group": "LanternGroup_C1"},
		{"pos": Vector3(20.0, 4.5, 0.0),   "energy": 1.3, "range": 8.5, "name": "Lantern_C2_Bow", "group": "LanternGroup_C2"},
		{"pos": Vector3(-5.0, -1.8, 0.0),  "energy": 1.1, "range": 7.0, "name": "Lantern_C8_HoldStair", "group": "LanternGroup_C8"}
	]

	for s in spots:
		var grp := Node3D.new()
		grp.name = s["group"]
		lantern_node.add_child(grp)

		var post = MeshInstance3D.new()
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.04
		cyl.bottom_radius = 0.04
		cyl.height = 0.5
		post.mesh = cyl
		post.material_override = mat_iron
		post.position = s.pos + Vector3(0, -0.25, 0)
		grp.add_child(post)

		var housing = _create_lantern_housing(0.13, 0.32, "#fcd07c", 1.4)
		housing.position = s.pos
		grp.add_child(housing)

		var light = OmniLight3D.new()
		light.name = s.name
		light.position = s.pos
		light.light_color = Color("#f7bf6d")
		light.light_energy = s.energy
		light.omni_range = s.range
		light.omni_attenuation = 1.6
		light.shadow_enabled = false
		grp.add_child(light)

		flickering_lights.append({"node": light, "base": s.energy, "speed": 2.4, "offset": randf() * 10.0})

func create_crab_mesh() -> Node3D:
	var root = Node3D.new()
	root.set_meta("type", "crab")

	var shell = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 0.18
	sphere.height = 0.12
	shell.mesh = sphere
	shell.material_override = mat_crab
	root.add_child(shell)

	for side in [-1.0, 1.0]:
		var claw = MeshInstance3D.new()
		var claw_box = BoxMesh.new()
		claw_box.size = Vector3(0.12, 0.06, 0.16)
		claw.mesh = claw_box
		claw.material_override = mat_crab
		claw.position = Vector3(0.18, 0, side * 0.22)
		root.add_child(claw)

	return root

func create_seagull_mesh() -> Node3D:
	var root = Node3D.new()
	root.set_meta("type", "seagull")
	root.set_meta("bob_timer", randf() * 3.0)

	var mat_wing = StandardMaterial3D.new()
	mat_wing.albedo_color = Color("#8e989c")
	mat_wing.roughness = 0.72

	var mat_legs = StandardMaterial3D.new()
	mat_legs.albedo_color = Color("#d98b34")
	mat_legs.roughness = 0.6

	var body = MeshInstance3D.new()
	var cap = CapsuleMesh.new()
	cap.radius = 0.10
	cap.height = 0.42
	body.mesh = cap
	body.material_override = mat_seagull
	body.position = Vector3(0, 0.10, 0)
	body.rotation_degrees = Vector3(68, 0, 0)
	root.add_child(body)

	# Alas grises plegadas sobre el lomo
	for side in [-1.0, 1.0]:
		var wing = MeshInstance3D.new()
		var w_box = BoxMesh.new()
		w_box.size = Vector3(0.05, 0.12, 0.34)
		wing.mesh = w_box
		wing.material_override = mat_wing
		wing.position = Vector3(side * 0.09, 0.13, -0.04)
		wing.rotation_degrees = Vector3(-12, side * 8, 0)
		root.add_child(wing)

		var leg = MeshInstance3D.new()
		var l_cyl = CylinderMesh.new()
		l_cyl.top_radius = 0.012
		l_cyl.bottom_radius = 0.012
		l_cyl.height = 0.10
		leg.mesh = l_cyl
		leg.material_override = mat_legs
		leg.position = Vector3(side * 0.045, 0.02, 0)
		root.add_child(leg)

	var head = MeshInstance3D.new()
	var sph = SphereMesh.new()
	sph.radius = 0.08
	sph.height = 0.16
	head.name = "Head"
	head.mesh = sph
	head.material_override = mat_seagull
	head.position = Vector3(0, 0.24, 0.16)
	root.add_child(head)

	var beak = MeshInstance3D.new()
	var cone = CylinderMesh.new()
	cone.top_radius = 0.005
	cone.bottom_radius = 0.028
	cone.height = 0.11
	beak.mesh = cone
	beak.material_override = mat_legs
	beak.position = Vector3(0, -0.01, 0.10)
	beak.rotation_degrees = Vector3(82, 0, 0)
	head.add_child(beak)

	return root

func _process(delta: float) -> void:
	# Parpadeo natural y suave de llamas de faroles (respiración lumínica orgánica sin saltos estroboscópicos)
	var time_now = Time.get_ticks_msec() * 0.001
	for fl in flickering_lights:
		var node = fl["node"] as OmniLight3D
		if node:
			var base = fl["base"] as float
			var speed = fl["speed"] as float
			var offset = fl["offset"] as float
			var flicker = sin(time_now * speed + offset) * 0.04 + cos(time_now * (speed * 1.5) + offset) * 0.02
			node.light_energy = max(0.2, base + flicker)

	# Micro-animación procedural de fauna
	for f in animated_fauna:
		var type = f.get_meta("type", "")
		if type == "seagull":
			var timer = f.get_meta("bob_timer", 0.0) + delta
			f.set_meta("bob_timer", timer)
			var head = f.get_node_or_null("Head")
			if head:
				var bob = sin(timer * 4.0) * 0.025 if fmod(timer, 4.0) < 1.0 else 0.0
				head.position.y = 0.24 + bob
		elif type == "crab":
			f.rotation.y += sin(Time.get_ticks_msec() * 0.003) * 0.002
