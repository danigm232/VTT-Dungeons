class_name DeckDressingBuilder
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")
const HelmController = preload("res://scripts/helm_controller.gd")
const CrowsNestBuilder = preload("res://scripts/crows_nest_builder.gd")
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

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
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
	mat_crab.albedo_color = Color("#4d271a")
	mat_crab.roughness = 0.42
	mat_crab.metallic_specular = 0.45

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

	# Argollas y esquineros remachados en brazola de escotilla
	for hx_pull in [-0.92, 0.92]:
		var pull_ring := MeshInstance3D.new()
		var pr_tor := TorusMesh.new()
		pr_tor.inner_radius = 0.045; pr_tor.outer_radius = 0.08
		pull_ring.mesh = pr_tor
		pull_ring.material_override = mat_iron
		pull_ring.position = Vector3(hx_pull, 0.24, 0.72)
		pull_ring.rotation_degrees.x = 72.0
		hatch_node.add_child(pull_ring)

	PbrMaterialKit.add_box_collider(hatch_node, "Col_CargoHatch", Vector3(2.42, 0.48, 1.82), Vector3(0, 0.24, 0))

	# Percha de respeto trincada junto a la amurada de babor (C1)
	var spare_spar := MeshInstance3D.new()
	spare_spar.name = "SpareMastSpar_C1"
	var sp_cyl := CylinderMesh.new()
	sp_cyl.top_radius = 0.14; sp_cyl.bottom_radius = 0.19; sp_cyl.height = 8.4
	spare_spar.mesh = sp_cyl
	spare_spar.material_override = PbrMaterialKit.create_weathered_hull_pbr("#6d5a42")
	spare_spar.position = WreckStructure.get_world_pos(-3.2, 0.22, -7.65)
	spare_spar.rotation_degrees = Vector3(0.0, 2.0, 90.0)
	c1_node.add_child(spare_spar)
	for lx_off in [-2.8, 0.0, 2.8]:
		var lashing := MeshInstance3D.new()
		var ls_tor := TorusMesh.new()
		ls_tor.inner_radius = 0.15; ls_tor.outer_radius = 0.20
		lashing.mesh = ls_tor
		lashing.material_override = mat_rope
		lashing.position = Vector3(0.0, lx_off, 0.0)
		spare_spar.add_child(lashing)

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
		c2.position = WreckStructure.get_world_pos(-6.8, 0.0, -5.0)
		c2.rotation.y = -0.4
		c2.scale = Vector3(0.9, 0.9, 0.9)
		PbrMaterialKit.apply_kenney_material(c2)
		c1_node.add_child(c2)
		PbrMaterialKit.add_box_collider(c1_node, "Col_CrateC1_B", Vector3(0.85, 0.95, 0.85), c2.position + Vector3(0, 0.45, 0))
	var s_c2 = PbrMaterialKit.create_blob_shadow(0.85, 0.85, 0.55)
	s_c2.position = WreckStructure.get_world_pos(-6.8, 0.02, -5.0)
	c1_node.add_child(s_c2)

	# Barriles de ron dispersos a escala táctica D&D (1.0m altura)
	var barrels_c1 = [
		{"pos": WreckStructure.get_world_pos(-6.0, 0.0, -4.2), "rot": 0.4, "scale": Vector3(0.88, 0.88, 0.88)},
		{"pos": WreckStructure.get_world_pos(-6.2, 0.0, -3.0), "rot": -0.6, "scale": Vector3(0.82, 0.82, 0.82)},
		{"pos": WreckStructure.get_world_pos(7.2, 0.0, 3.8),   "rot": 0.3, "scale": Vector3(0.92, 0.92, 0.92)},
		{"pos": WreckStructure.get_world_pos(7.4, 0.0, 4.9),   "rot": -0.2, "scale": Vector3(0.82, 0.82, 0.82)}
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

	# Rollos de cabos marineros en 3D con volumen real y argollas de cubierta (sin bloquear paso)
	var rope_spots = [
		Vector2(-2.0, -4.5),
		Vector2(-6.5, 2.2),
		Vector2(-5.0, 3.8),
		Vector2(5.5, -3.5),
		Vector2(9.2, -4.2),
		Vector2(-9.8, 3.6),
	]
	for r_xy in rope_spots:
		var world_r := WreckStructure.get_world_pos(r_xy.x, 0.02, r_xy.y)
		var coil_st := ShipGeometry.begin(mat_rope)
		var spiral: Array[Vector3] = []
		for k in range(91):
			var t := float(k) / 90.0
			var radius := lerpf(0.09, 0.44, t)
			var angle := t * TAU * 2.5
			var lift := 0.028 + maxf(0.0, sin(t * PI)) * 0.028
			spiral.append(Vector3(cos(angle) * radius, lift, sin(angle) * radius))
		spiral.append(Vector3(-0.48, 0.028, 0.08))
		ShipGeometry.tube(coil_st, spiral, 0.036)
		var coil := ShipGeometry.commit(c1_node, "RopeCoil_%d" % c1_node.get_child_count(), coil_st)
		coil.position = world_r

		var r_shadow = PbrMaterialKit.create_blob_shadow(0.62, 0.62, 0.52)
		r_shadow.position = WreckStructure.get_world_pos(r_xy.x, 0.012, r_xy.y)
		c1_node.add_child(r_shadow)

	# Argollas de forja para amarre de carga en cubierta C1 (bajo relieve no bloqueante)
	for rb_pt in [Vector2(-10.5, -4.5), Vector2(-10.5, 4.5), Vector2(9.8, 4.2), Vector2(9.8, -4.5)]:
		var rb_ring := MeshInstance3D.new()
		var rb_tor := TorusMesh.new()
		rb_tor.inner_radius = 0.06
		rb_tor.outer_radius = 0.11
		rb_ring.mesh = rb_tor
		rb_ring.material_override = mat_iron
		rb_ring.position = WreckStructure.get_world_pos(rb_pt.x, 0.035, rb_pt.y)
		c1_node.add_child(rb_ring)

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
	foremast_stump.material_override = PbrMaterialKit.create_weathered_hull_pbr("#6d5b44")
	foremast_stump.position = Vector3(21.0, 4.1, 0.0)
	c2_node.add_child(foremast_stump)
	PbrMaterialKit.add_cyl_collider(c2_node, "Col_ForemastStump", 0.42, 2.3, foremast_stump.position)

	var stump_shadow = PbrMaterialKit.create_blob_shadow(1.1, 1.1, 0.6)
	stump_shadow.position = Vector3(21.0, 3.02, 0.0)
	c2_node.add_child(stump_shadow)

	# Zunchos de hierro forjado en el tocón y en el palo trinquete caído
	for by in [3.55, 4.35, 4.95]:
		var band := MeshInstance3D.new()
		var b_tor := TorusMesh.new()
		b_tor.inner_radius = 0.31
		b_tor.outer_radius = 0.37
		band.mesh = b_tor
		band.material_override = mat_iron
		band.position = Vector3(21.0, by, 0.0)
		c2_node.add_child(band)

	# Tronco caído que cruza la borda norte hacia el arrecife con colisionador
	var fallen_mast = MeshInstance3D.new()
	fallen_mast.name = "FallenForemast_C2"
	var cyl_fallen = CylinderMesh.new()
	cyl_fallen.top_radius = 0.22
	cyl_fallen.bottom_radius = 0.30
	cyl_fallen.height = 11.5
	fallen_mast.mesh = cyl_fallen
	fallen_mast.material_override = PbrMaterialKit.create_weathered_hull_pbr("#6d5b44")
	fallen_mast.position = Vector3(24.8, 3.42, -5.1)
	fallen_mast.rotation_degrees = Vector3(18, -32, 74)
	c2_node.add_child(fallen_mast)
	for fy in [-3.4, 0.0, 3.2]:
		var fband := MeshInstance3D.new()
		var f_tor := TorusMesh.new()
		f_tor.inner_radius = 0.24
		f_tor.outer_radius = 0.30
		fband.mesh = f_tor
		fband.material_override = mat_iron
		fband.position = Vector3(0.0, fy, 0.0)
		fallen_mast.add_child(fband)
	var col_fallen := PbrMaterialKit.add_cyl_collider(c2_node, "Col_FallenForemast", 0.32, 11.2, fallen_mast.position)
	col_fallen.rotation_degrees = fallen_mast.rotation_degrees

	# Cabillero lateral / cornamusa y rollo de jarcia en proa babor (despejando paso)
	var c2_rope_st := ShipGeometry.begin(mat_rope)
	var c2_spiral: Array[Vector3] = []
	for k in range(65):
		var t := float(k) / 64.0
		var r := lerpf(0.10, 0.42, t)
		var a := t * TAU * 2.2
		c2_spiral.append(Vector3(cos(a) * r, 0.03 + sin(t * PI) * 0.025, sin(a) * r))
	ShipGeometry.tube(c2_rope_st, c2_spiral, 0.035)
	var c2_coil := ShipGeometry.commit(c2_node, "ForecastleRopeCoil_C2", c2_rope_st)
	c2_coil.position = WreckStructure.get_world_pos(16.2, 3.02, -5.8)

	var lock_box := MeshInstance3D.new()
	var lb_mesh := BoxMesh.new()
	lb_mesh.size = Vector3(1.15, 0.48, 0.56)
	lock_box.mesh = lb_mesh
	lock_box.material_override = mat_wood_crate
	lock_box.position = WreckStructure.get_world_pos(15.2, 3.24, -6.9)
	c2_node.add_child(lock_box)
	PbrMaterialKit.add_box_collider(c2_node, "Col_CordageLockerC2", Vector3(1.18, 0.52, 0.58), lock_box.position)

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

	# Pirámide de 4 balas de cañón en hierro forjado junto al afuste (con colisionador)
	var cball_res = load("res://assets/models/cannon-ball.glb")
	if cball_res:
		var mat_cball_iron := PbrMaterialKit.create_iron_pbr("#282b30", 0.44, 0.85)
		for cb_pt in [
			Vector3(23.84, 3.0, 3.26),
			Vector3(24.12, 3.0, 3.26),
			Vector3(23.98, 3.0, 3.01),
			Vector3(23.98, 3.20, 3.18),
		]:
			var cb_inst = cball_res.instantiate()
			cb_inst.position = WreckStructure.get_world_pos(cb_pt.x, cb_pt.y, cb_pt.z)
			cb_inst.scale = Vector3(0.38, 0.38, 0.38)
			_override_mesh_material(cb_inst, mat_cball_iron)
			c2_node.add_child(cb_inst)
		PbrMaterialKit.add_cyl_collider(c2_node, "Col_CannonBallsC2", 0.34, 0.45, WreckStructure.get_world_pos(23.98, 3.20, 3.16))

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

	# Gaviota posada sobre la bita de amarre babor de proa (despejando el cañón)
	_spawn_perched_seagull(c2_node, 28.3, 3.0, -1.05, -0.95, false, 0.71)

# ==============================================================================
# ZONA 3: CASTILLO DE POPA (C3, +3.0m)
# ==============================================================================
func build_zone_c3_poop_deck() -> void:
	var c3_node = Node3D.new()
	c3_node.name = "Zone_C3_PoopDeck"
	add_child(c3_node)

	# 1. Timón Náutico arruinado y desencajado ("Rosa de los Vientos" en nácar boca abajo)
	_build_c3_helm(c3_node)

	# 2. Bitácora de Latón con base de roble, capuchón abovedado y visor de brújula
	var binnacle_node = Node3D.new()
	binnacle_node.name = "Binnacle_C3"
	binnacle_node.position = WreckStructure.get_world_pos(-21.2, 3.0, 0.0)
	c3_node.add_child(binnacle_node)

	var bin_base = MeshInstance3D.new()
	var bb_box = BoxMesh.new()
	bb_box.size = Vector3(0.55, 0.12, 0.55)
	bin_base.mesh = bb_box
	bin_base.material_override = PbrMaterialKit.create_wet_wreck_wood_pbr("#3b372c", 0.44, 0.66, 0.34)
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

	var compass_face = MeshInstance3D.new()
	var cf_cyl = CylinderMesh.new()
	cf_cyl.top_radius = 0.13; cf_cyl.bottom_radius = 0.13; cf_cyl.height = 0.02
	compass_face.mesh = cf_cyl
	var mat_compass_dial := StandardMaterial3D.new()
	mat_compass_dial.albedo_color = Color("#1e363a")
	mat_compass_dial.emission_enabled = true
	mat_compass_dial.emission = Color("#5ec4b8")
	mat_compass_dial.emission_energy_multiplier = 0.45
	mat_compass_dial.roughness = 0.15
	compass_face.material_override = mat_compass_dial
	compass_face.position = Vector3(-0.08, 1.04, 0)
	compass_face.rotation_degrees.z = 52.0
	binnacle_node.add_child(compass_face)

	var bin_shadow = PbrMaterialKit.create_blob_shadow(0.68, 0.68, 0.66)
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

	# 3. Tocón astillado del palo de mesana roto (lanza rota + fibras + jarcias)
	_build_c3_broken_mizzen(c3_node)

	# 4. Farol de Popa Gran Almirante anclado al espejo de popa (taffrail) con pescante curvo de hierro forjado
	var stern_wall_plate = MeshInstance3D.new()
	var swp_box = BoxMesh.new()
	swp_box.size = Vector3(0.10, 0.52, 0.24)
	stern_wall_plate.mesh = swp_box
	stern_wall_plate.material_override = mat_iron
	stern_wall_plate.position = WreckStructure.get_world_pos(-30.42, 3.62, 0.0)
	c3_node.add_child(stern_wall_plate)

	var stern_bracket = MeshInstance3D.new()
	var brk_box = BoxMesh.new()
	brk_box.size = Vector3(0.68, 0.07, 0.07)
	stern_bracket.mesh = brk_box
	stern_bracket.material_override = mat_iron
	stern_bracket.position = WreckStructure.get_world_pos(-30.72, 3.74, 0.0)
	c3_node.add_child(stern_bracket)

	var stern_strut = MeshInstance3D.new()
	var str_box = BoxMesh.new()
	str_box.size = Vector3(0.42, 0.05, 0.05)
	stern_strut.mesh = str_box
	stern_strut.material_override = mat_iron
	stern_strut.position = WreckStructure.get_world_pos(-30.58, 3.55, 0.0)
	stern_strut.rotation_degrees = Vector3(0, 0, -40.0)
	c3_node.add_child(stern_strut)

	var stern_lantern = _create_lantern_housing(0.24, 0.48, "#ff9b38", 1.5)
	stern_lantern.position = WreckStructure.get_world_pos(-30.98, 3.44, 0.0)
	c3_node.add_child(stern_lantern)

	# Luz puntual del farol de popa
	var stern_light = OmniLight3D.new()
	stern_light.name = "SternAdmiralLantern"
	stern_light.position = WreckStructure.get_world_pos(-30.98, 3.44, 0.0)
	stern_light.light_color = Color("#ff9e3b")
	stern_light.light_energy = 2.0
	stern_light.omni_range = 11.5
	stern_light.omni_attenuation = 1.35
	stern_light.shadow_enabled = true
	stern_light.shadow_bias = 0.05
	stern_light.shadow_normal_bias = 1.8
	stern_light.shadow_blur = 1.5
	c3_node.add_child(stern_light)
	flickering_lights.append({"node": stern_light, "base": 2.0, "speed": 2.2, "offset": 1.2})

	var prop_lantern = InteractiveProp.new()
	prop_lantern.name = "PropSternLanternC3"
	prop_lantern.prop_id = "c3_stern_lantern"
	prop_lantern.prompt_text = "Examinar Farol de Popa Gran Almirante"
	prop_lantern.inspection_message = "Farol de bronce y cristal emplomado octogonal. Su llama ámbar resistió medio siglo de temporales marinos."
	prop_lantern.position = WreckStructure.get_world_pos(-29.8, 3.4, 0.0)
	prop_lantern.interaction_radius = 2.6
	c3_node.add_child(prop_lantern)

	# Gaviota posada sobre bita de amarre en popa (sin flotar)
	_spawn_perched_seagull(c3_node, -24.5, 3.0, -3.8, 0.8)

	# 5. Claraboyas bajas con enjaretado sobre camarotes C4/C5 (x = -25.8, z = ±2.8)
	var mat_skylight_glass := StandardMaterial3D.new()
	mat_skylight_glass.albedo_color = Color("#18252b")
	mat_skylight_glass.roughness = 0.16
	mat_skylight_glass.metallic_specular = 0.72
	mat_skylight_glass.emission_enabled = true
	mat_skylight_glass.emission = Color("#4d3218")
	mat_skylight_glass.emission_energy_multiplier = 0.35

	var mat_skylight_frame := PbrMaterialKit.create_oak_furniture_pbr("#484234", 0.48)
	mat_skylight_frame.roughness = 0.74
	for side_s in [-1.0, 1.0]:
		var sky_root := Node3D.new()
		sky_root.name = "Skylight_C3_%s" % ("Port" if side_s < 0.0 else "Stbd")
		sky_root.position = WreckStructure.get_world_pos(-25.8, 3.02, side_s * 2.8)
		c3_node.add_child(sky_root)

		var sky_st := ShipGeometry.begin(mat_skylight_frame)
		for sz_edge in [-0.72, 0.72]:
			ShipGeometry.beam(sky_st, Vector3(-0.95, 0.08, sz_edge), Vector3(0.95, 0.08, sz_edge), 0.12, 0.18)
		for sx_edge in [-0.90, 0.0, 0.90]:
			ShipGeometry.beam(sky_st, Vector3(sx_edge, 0.08, -0.72), Vector3(sx_edge, 0.08, 0.72), 0.10, 0.18)
		ShipGeometry.commit(sky_root, "SkylightFrame", sky_st)

		var pane := MeshInstance3D.new()
		var p_box := BoxMesh.new()
		p_box.size = Vector3(1.74, 0.04, 1.32)
		pane.mesh = p_box
		pane.material_override = mat_skylight_glass
		pane.position = Vector3(0.0, 0.12, 0.0)
		sky_root.add_child(pane)
		var sky_ao := PbrMaterialKit.create_contact_shadow_rect(2.12, 1.68, 0.62, WreckStructure.LIST_SLOPE)
		sky_ao.position = Vector3(0.0, -0.005, 0.0)
		sky_root.add_child(sky_ao)
		PbrMaterialKit.add_box_collider(sky_root, "Col_Skylight", Vector3(1.96, 0.24, 1.52), Vector3(0, 0.12, 0))

	# Bancos/cofres artesanales con tapa moldurada y herrajes junto al coronamento de popa (despejando farol y timón)
	var mat_locker_body := PbrMaterialKit.create_oak_furniture_pbr("#443d30", 0.44)
	mat_locker_body.roughness = 0.78
	var mat_locker_lid := PbrMaterialKit.create_oak_furniture_pbr("#564c3a", 0.44)
	mat_locker_lid.roughness = 0.70
	for side_b in [-1.0, 1.0]:
		var locker_root := Node3D.new()
		locker_root.name = "SternDeckChest_%s" % ("Port" if side_b < 0.0 else "Stbd")
		locker_root.position = WreckStructure.get_world_pos(-29.1, 3.00, side_b * 2.15)
		c3_node.add_child(locker_root)

		var locker := MeshInstance3D.new()
		var lk_box := BoxMesh.new()
		lk_box.size = Vector3(0.60, 0.38, 1.50)
		locker.mesh = lk_box
		locker.material_override = mat_locker_body
		locker.position = Vector3(0.0, 0.19, 0.0)
		locker_root.add_child(locker)

		var lid := MeshInstance3D.new()
		var lid_box := BoxMesh.new()
		lid_box.size = Vector3(0.66, 0.07, 1.56)
		lid.mesh = lid_box
		lid.material_override = mat_locker_lid
		lid.position = Vector3(0.0, 0.415, 0.0)
		locker_root.add_child(lid)

		for strap_z in [-0.52, 0.52]:
			var strap := MeshInstance3D.new()
			var st_box := BoxMesh.new()
			st_box.size = Vector3(0.67, 0.43, 0.06)
			strap.mesh = st_box
			strap.material_override = mat_iron
			strap.position = Vector3(0.0, 0.225, strap_z)
			locker_root.add_child(strap)

		var latch := MeshInstance3D.new()
		var lt_box := BoxMesh.new()
		lt_box.size = Vector3(0.04, 0.14, 0.12)
		latch.mesh = lt_box
		latch.material_override = mat_bronze
		latch.position = Vector3(0.33, 0.36, 0.0)
		locker_root.add_child(latch)

		var lk_ao := PbrMaterialKit.create_contact_shadow_rect(0.84, 1.72, 0.66, WreckStructure.LIST_SLOPE)
		lk_ao.position = Vector3(0.0, 0.014, 0.0)
		locker_root.add_child(lk_ao)
		PbrMaterialKit.add_box_collider(c3_node, "Col_SternLocker_%d" % int(sign(side_b)), Vector3(0.66, 0.48, 1.58), WreckStructure.get_world_pos(-29.1, 3.22, side_b * 2.15))

	var c3_coil_st := ShipGeometry.begin(mat_rope)
	var c3_spiral: Array[Vector3] = []
	for k in range(55):
		var t := float(k) / 54.0
		var r := lerpf(0.08, 0.36, t)
		var a := t * TAU * 2.1
		c3_spiral.append(Vector3(cos(a) * r, 0.025 + sin(t * PI) * 0.02, sin(a) * r))
	# Cabo suelto deshilachándose hacia las tablas
	var last_p := c3_spiral[-1]
	ShipGeometry.tube(c3_coil_st, c3_spiral, 0.030)
	ShipGeometry.tube(c3_coil_st, [last_p, last_p + Vector3(0.24, -0.008, 0.18), last_p + Vector3(0.46, -0.01, 0.08), last_p + Vector3(0.66, -0.012, 0.28)], 0.022)
	var c3_coil := ShipGeometry.commit(c3_node, "MizzenRopeCoil_C3", c3_coil_st)
	c3_coil.position = WreckStructure.get_world_pos(-16.2, 3.02, 1.35)

	# 6. Envejecimiento, algas, percebes, tablones hundidos y detalles narrativos del naufragio
	_build_c3_aging_and_narrative(c3_node)

func _build_c3_helm(c3_node: Node3D) -> void:
	var wheel_node := Node3D.new()
	wheel_node.name = "SteeringWheel_C3"
	wheel_node.position = WreckStructure.get_world_pos(-22.5, 3.0, 0.0)
	c3_node.add_child(wheel_node)

	var mat_ped_dark := PbrMaterialKit.create_wet_wreck_wood_pbr("#3e453b", 0.45, 0.70, 0.28)
	var mat_helm_oak := PbrMaterialKit.create_wet_wreck_wood_pbr("#6d5b44", 0.65, 0.60, 0.30)
	var mat_helm_grip := PbrMaterialKit.create_oak_furniture_pbr("#876d4c", 0.72)
	var mat_inlay_back := PbrMaterialKit.create_wet_wreck_wood_pbr("#1c2220", 0.90, 0.78, 0.18)
	var mat_nacre := PbrMaterialKit.create_nacre_inlay_material()
	var mat_rust := PbrMaterialKit.create_iron_pbr("#523424", 0.48, 0.86)

	# Zócalo y cuerpo del pedestal deteriorado con placas metálicas flojas
	var plinth := MeshInstance3D.new()
	var pl_box := BoxMesh.new()
	pl_box.size = Vector3(0.72, 0.14, 0.66)
	plinth.mesh = pl_box
	plinth.material_override = mat_ped_dark
	plinth.position = Vector3(0.0, 0.07, 0.0)
	wheel_node.add_child(plinth)

	var pedestal := MeshInstance3D.new()
	var ped_box := BoxMesh.new()
	ped_box.size = Vector3(0.56, 1.04, 0.48)
	pedestal.mesh = ped_box
	pedestal.material_override = mat_ped_dark
	pedestal.position = Vector3(0.0, 0.64, 0.0)
	pedestal.rotation_degrees = Vector3(1.8, 0.0, -2.2)
	wheel_node.add_child(pedestal)

	# Costillas laterales y herrajes oxidados del pedestal (cojinete desgastado a punto de ceder)
	for sz_rib in [-0.245, 0.245]:
		var plate := MeshInstance3D.new()
		var p_box := BoxMesh.new()
		p_box.size = Vector3(0.48, 0.10, 0.04)
		plate.mesh = p_box
		plate.material_override = mat_rust
		plate.position = Vector3(0.01, 1.06, sz_rib)
		plate.rotation_degrees = Vector3(0.0, 0.0, -3.5)
		wheel_node.add_child(plate)

	var bearing_housing := MeshInstance3D.new()
	var bh_cyl := CylinderMesh.new()
	bh_cyl.top_radius = 0.125; bh_cyl.bottom_radius = 0.135; bh_cyl.height = 0.22
	bearing_housing.mesh = bh_cyl
	bearing_housing.material_override = mat_bronze
	bearing_housing.position = Vector3(0.24, 1.14, 0.0)
	bearing_housing.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	wheel_node.add_child(bearing_housing)

	# Eje torcido y suelto sobresaliendo del pedestal
	var spindle := MeshInstance3D.new()
	var sp_cyl := CylinderMesh.new()
	sp_cyl.top_radius = 0.052; sp_cyl.bottom_radius = 0.056; sp_cyl.height = 0.42
	spindle.mesh = sp_cyl
	spindle.material_override = mat_rust
	spindle.position = Vector3(0.24, 1.12, 0.02)
	spindle.rotation_degrees = Vector3(0.0, -9.0, 98.0)
	wheel_node.add_child(spindle)

	# Perno partido asomando del collarín de bronce
	var loose_pin := MeshInstance3D.new()
	var lp_cyl := CylinderMesh.new()
	lp_cyl.top_radius = 0.018; lp_cyl.bottom_radius = 0.018; lp_cyl.height = 0.14
	loose_pin.mesh = lp_cyl
	loose_pin.material_override = mat_iron
	loose_pin.position = Vector3(0.31, 1.24, 0.05)
	loose_pin.rotation_degrees = Vector3(24.0, 12.0, -18.0)
	wheel_node.add_child(loose_pin)

	# Pivote móvil de la rueda del timón (desencajado, descentrado y torcido respecto al pedestal)
	var wheel_pivot := Node3D.new()
	wheel_pivot.name = "HelmWheelPivot"
	wheel_pivot.position = Vector3(0.32, 1.12, 0.04)
	wheel_pivot.rotation_degrees = Vector3(8.0, -13.0, -11.5)
	wheel_node.add_child(wheel_pivot)

	# Aro exterior principal de roble + banda interior y cartela oscura tallada para el nácar
	var wheel_ring := MeshInstance3D.new()
	var ring_torus := TorusMesh.new()
	ring_torus.inner_radius = 0.56
	ring_torus.outer_radius = 0.74
	ring_torus.rings = 32
	ring_torus.ring_segments = 16
	wheel_ring.mesh = ring_torus
	wheel_ring.material_override = mat_helm_oak
	wheel_ring.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	wheel_pivot.add_child(wheel_ring)

	# Cartela frontal y trasera embutida en la corona superior donde va "Rosa de los Vientos" boca abajo
	var inlay_st := ShipGeometry.begin(mat_inlay_back)
	var nacre_trim_st := ShipGeometry.begin(mat_nacre)
	var arc_steps := 16
	var r_in := 0.585
	var r_out := 0.715
	var arc_span := deg_to_rad(142.0)
	for face_sign: float in [-1.0, 1.0]:
		var fx: float = face_sign * 0.095
		for s in range(arc_steps):
			var a0 := lerpf(-arc_span * 0.5, arc_span * 0.5, float(s) / float(arc_steps))
			var a1 := lerpf(-arc_span * 0.5, arc_span * 0.5, float(s + 1) / float(arc_steps))
			var p00 := Vector3(fx, r_in * cos(a0), -r_in * sin(a0))
			var p01 := Vector3(fx, r_out * cos(a0), -r_out * sin(a0))
			var p11 := Vector3(fx, r_out * cos(a1), -r_out * sin(a1))
			var p10 := Vector3(fx, r_in * cos(a1), -r_in * sin(a1))
			if face_sign > 0.0:
				ShipGeometry.quad(inlay_st, p00, p01, p11, p10)
			else:
				ShipGeometry.quad(inlay_st, p10, p11, p01, p00)
			# Filetes finos de nácar desgastado en los extremos de la cartela
			if s == 0 or s == arc_steps - 1:
				var f_mid := lerpf(a0, a1, 0.5)
				var pt := Vector3(fx + face_sign * 0.005, ((r_in + r_out) * 0.5) * cos(f_mid), -((r_in + r_out) * 0.5) * sin(f_mid))
				ShipGeometry.beam(nacre_trim_st, pt - Vector3(0.0, 0.025, 0.0), pt + Vector3(0.0, 0.025, 0.0), 0.018, 0.008)
	ShipGeometry.commit(wheel_pivot, "HelmInlayPlaque", inlay_st)
	ShipGeometry.commit(wheel_pivot, "HelmNacreTrim", nacre_trim_st)

	# Inscripción curva «Rosa de los Vientos» incrustada en nácar y orientada BOCA ABAJO (180° invertida)
	var font_res: Font = null
	if ResourceLoader.exists("res://assets/ui/fonts/Metamorphous-Regular.ttf"):
		font_res = load("res://assets/ui/fonts/Metamorphous-Regular.ttf") as Font
	var text_str := "Rosa de los Vientos"
	var text_len := text_str.length()
	var nacre_text_r := 0.648
	var half_arc := deg_to_rad(60.0)
	for face_sign: float in [1.0, -1.0]:
		var fx: float = face_sign * 0.097
		for c_idx in range(text_len):
			var ch := text_str.substr(c_idx, 1)
			if ch == " ":
				continue
			var t: float = (float(c_idx) / float(maxi(1, text_len - 1))) - 0.5
			var a: float = -t * (half_arc * 2.0) * face_sign
			var radial_out := Vector3(0.0, cos(a), -sin(a))
			var tangent := Vector3(0.0, -sin(a), -cos(a)) * face_sign
			var face_n := Vector3(face_sign, 0.0, 0.0)
			# Invertida 180° respecto al marco derecho-arriba: ejes X e Y del glifo negados en su plano
			var g_x := -tangent
			var g_y := -radial_out
			var lbl := Label3D.new()
			lbl.text = ch
			if font_res:
				lbl.font = font_res
			lbl.font_size = 52
			lbl.pixel_size = 0.00195
			lbl.shaded = false
			lbl.double_sided = false
			lbl.outline_size = 7
			lbl.outline_modulate = Color("#101716")
			# Variación sutil de desgaste sobre el nácar (matiz perlado envejecido, no blanco plano)
			var chip_wear := ((c_idx * 7) % 5 == 0)
			lbl.modulate = Color("#8aa49e") if chip_wear else (Color("#b7d0cb") if c_idx % 2 == 0 else Color("#aec6cc"))
			lbl.position = radial_out * nacre_text_r + face_n * fx
			lbl.basis = Basis(g_x, g_y, face_n)
			wheel_pivot.add_child(lbl)

	# Cubo central metálico desgastado y aro de refuerzo
	var hub := MeshInstance3D.new()
	var hub_cyl := CylinderMesh.new()
	hub_cyl.top_radius = 0.155; hub_cyl.bottom_radius = 0.175; hub_cyl.height = 0.28
	hub.mesh = hub_cyl
	hub.material_override = mat_bronze
	hub.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	wheel_pivot.add_child(hub)

	# 8 radios torneados separados del aro exterior y con empuñaduras redondeadas + anillas
	for i in range(8):
		var ang_deg := i * 45.0
		var ang := deg_to_rad(ang_deg)
		var dir_vec := Vector3(0.0, cos(ang), sin(ang))

		var spoke := MeshInstance3D.new()
		var sp_c := CylinderMesh.new()
		sp_c.top_radius = 0.028; sp_c.bottom_radius = 0.022; sp_c.height = 0.44
		spoke.mesh = sp_c
		spoke.material_override = mat_helm_oak
		spoke.position = dir_vec * 0.36
		spoke.rotation_degrees = Vector3(ang_deg, 0.0, 0.0)
		wheel_pivot.add_child(spoke)

		var grip := MeshInstance3D.new()
		var gp_c := CylinderMesh.new()
		gp_c.top_radius = 0.019; gp_c.bottom_radius = 0.029; gp_c.height = 0.24
		grip.mesh = gp_c
		grip.material_override = mat_helm_grip
		grip.position = dir_vec * 0.87
		grip.rotation_degrees = Vector3(ang_deg, 0.0, 0.0)
		wheel_pivot.add_child(grip)

		var ferrule := MeshInstance3D.new()
		var fr_c := CylinderMesh.new()
		fr_c.top_radius = 0.031; fr_c.bottom_radius = 0.031; fr_c.height = 0.032
		ferrule.mesh = fr_c
		ferrule.material_override = mat_bronze
		ferrule.position = dir_vec * 0.77
		ferrule.rotation_degrees = Vector3(ang_deg, 0.0, 0.0)
		wheel_pivot.add_child(ferrule)

	var wheel_shadow := PbrMaterialKit.create_blob_shadow(1.12, 1.02, 0.68)
	wheel_shadow.position = Vector3(0.08, 0.018, 0.0)
	wheel_node.add_child(wheel_shadow)

	var wheel_col := PbrMaterialKit.add_box_collider(wheel_node, "Col_WheelC3", Vector3(0.95, 1.6, 1.45), Vector3(0.10, 0.80, 0.0))

	var prop_wheel := HelmController.new()
	prop_wheel.name = "PropWheelC3"
	prop_wheel.prop_id = "c3_wheel"
	prop_wheel.prompt_text = "Examinar o girar el Timón"
	prop_wheel.inspection_message = "El timón está torcido y a punto de desprenderse del eje corroído."
	prop_wheel.interaction_radius = 2.4
	prop_wheel.target_node = wheel_pivot
	prop_wheel.wheel_pivot = wheel_pivot
	prop_wheel.ped_node = pedestal
	prop_wheel.wheel_collider = wheel_col
	wheel_node.add_child(prop_wheel)

func _build_c3_broken_mizzen(c3_node: Node3D) -> void:
	var stump_root := Node3D.new()
	stump_root.name = "BrokenMizzenMast_C3"
	stump_root.position = WreckStructure.get_world_pos(-17.5, 3.0, 0.0)
	c3_node.add_child(stump_root)

	var mat_bark := PbrMaterialKit.create_wet_wreck_wood_pbr("#3a443b", 0.36, 0.70, 0.30)
	var mat_splinter := PbrMaterialKit.create_wood_shaving_pbr("#736348")
	var mat_rag := PbrMaterialKit.create_moldy_cloth_pbr("#837b65")

	# Fogonadura octogonal / cuello estructural unido a cubierta + zuncho de hierro
	var coat := MeshInstance3D.new()
	var coat_c := CylinderMesh.new()
	coat_c.top_radius = 0.44; coat_c.bottom_radius = 0.52; coat_c.height = 0.24; coat_c.radial_segments = 8
	coat.mesh = coat_c
	coat.material_override = mat_bark
	coat.position = Vector3(0.0, 0.12, 0.0)
	stump_root.add_child(coat)

	var iron_band := MeshInstance3D.new()
	var ib_c := CylinderMesh.new()
	ib_c.top_radius = 0.355; ib_c.bottom_radius = 0.365; ib_c.height = 0.11; ib_c.radial_segments = 14
	iron_band.mesh = ib_c
	iron_band.material_override = mat_iron
	iron_band.position = Vector3(0.0, 0.28, 0.0)
	stump_root.add_child(iron_band)

	# Tronco grueso inclinado ligeramente hacia popa-babor
	var trunk_tilt := Node3D.new()
	trunk_tilt.rotation_degrees = Vector3(4.5, 12.0, 5.2)
	stump_root.add_child(trunk_tilt)

	var trunk := MeshInstance3D.new()
	var tr_c := CylinderMesh.new()
	tr_c.top_radius = 0.26; tr_c.bottom_radius = 0.345; tr_c.height = 1.65; tr_c.radial_segments = 12
	trunk.mesh = tr_c
	trunk.material_override = mat_bark
	trunk.position = Vector3(0.0, 0.86, 0.0)
	trunk_tilt.add_child(trunk)

	# Núcleo fracturado claro y 8 astillas afiladas estilo lanza rota hacia lo alto
	var core := MeshInstance3D.new()
	var cr_c := CylinderMesh.new()
	cr_c.top_radius = 0.06; cr_c.bottom_radius = 0.22; cr_c.height = 0.65; cr_c.radial_segments = 7
	core.mesh = cr_c
	core.material_override = mat_splinter
	core.position = Vector3(0.0, 1.92, 0.0)
	trunk_tilt.add_child(core)

	var splinters := ShipGeometry.begin(mat_splinter)
	var bark_shards := ShipGeometry.begin(mat_bark)
	var splinter_specs := [
		[0.0, 2.86, 0.08, 0.05, 0.14, 0.12],
		[0.55, 2.52, 0.16, 0.08, 0.12, 0.10],
		[1.15, 2.28, -0.06, 0.18, 0.11, 0.09],
		[1.92, 2.64, -0.15, 0.06, 0.13, 0.10],
		[2.75, 2.15, -0.17, -0.14, 0.10, 0.08],
		[3.55, 2.42, 0.02, -0.20, 0.12, 0.10],
		[4.35, 1.98, 0.18, -0.11, 0.11, 0.08],
		[5.20, 2.26, 0.20, 0.09, 0.10, 0.09],
	]
	for sp_idx in range(splinter_specs.size()):
		var spec: Array = splinter_specs[sp_idx]
		var ang: float = spec[0]
		var top_y: float = spec[1]
		var tip_off_x: float = spec[2]
		var tip_off_z: float = spec[3]
		var w: float = spec[4]
		var d: float = spec[5]
		var bx := cos(ang) * 0.21
		var bz := sin(ang) * 0.21
		var base_p := Vector3(bx, 1.32 + float(sp_idx % 3) * 0.11, bz)
		var apex_p := Vector3(bx * 0.45 + tip_off_x, top_y, bz * 0.45 + tip_off_z)
		ShipGeometry.beam(splinters, base_p, apex_p, w, d, 0.08)
		ShipGeometry.beam(bark_shards, base_p * 1.16 - Vector3(0, 0.35, 0), base_p + (apex_p - base_p) * 0.56 + Vector3(cos(ang) * 0.03, 0, sin(ang) * 0.03), w * 1.05, 0.05, 0.18)
	ShipGeometry.commit(trunk_tilt, "MizzenSplintersInner", splinters)
	ShipGeometry.commit(trunk_tilt, "MizzenSplinterBark", bark_shards)

	# Cuerdas desgastadas rodeando el muñón con un cabo caído sobre la cubierta + jirón de lona vieja
	var rope_st := ShipGeometry.begin(mat_rope)
	var wrap_pts: Array[Vector3] = []
	for k in range(36):
		var t := float(k) / 35.0
		var ang := t * TAU * 3.4
		var r := lerpf(0.32, 0.29, t)
		wrap_pts.append(Vector3(cos(ang) * r, 0.92 + t * 0.52, sin(ang) * r))
	wrap_pts.append(Vector3(0.42, 0.72, 0.18))
	wrap_pts.append(Vector3(0.58, 0.06, 0.28))
	wrap_pts.append(Vector3(0.84, 0.025, 0.14))
	ShipGeometry.tube(rope_st, wrap_pts, 0.026, 6)
	ShipGeometry.commit(trunk_tilt, "MizzenRottenLashing", rope_st)

	var rag_st := ShipGeometry.begin(mat_rag)
	ShipGeometry.quad(rag_st, Vector3(0.18, 1.85, 0.16), Vector3(-0.18, 1.78, 0.19), Vector3(-0.32, 1.08, 0.30), Vector3(0.12, 1.18, 0.32))
	ShipGeometry.quad(rag_st, Vector3(-0.32, 1.08, 0.30), Vector3(0.12, 1.18, 0.32), Vector3(0.06, 0.86, 0.35), Vector3(-0.24, 0.94, 0.34))
	ShipGeometry.commit(trunk_tilt, "MizzenTornSailRag", rag_st)

	PbrMaterialKit.add_contact_ao_disc(stump_root, Vector3(0.0, 0.018, 0.0), 0.92, 0.92, 0.74, WreckStructure.LIST_SLOPE)
	PbrMaterialKit.add_kelp_strand(stump_root, Vector3(-0.36, 0.26, 0.14), Vector3(-0.35, -0.92, 0.18), 0.28, 0.075, 311)
	PbrMaterialKit.add_cyl_collider(c3_node, "Col_MizzenC3", 0.36, 2.0, WreckStructure.get_world_pos(-17.5, 3.95, 0.0))

func _build_c3_aging_and_narrative(c3_node: Node3D) -> void:
	var details := Node3D.new()
	details.name = "C3_AgingAndNarrative"
	c3_node.add_child(details)

	var mat_plank_wear := PbrMaterialKit.create_oak_furniture_pbr("#4c4c3d", 0.42)
	mat_plank_wear.roughness = 0.84
	var mat_loose_plank := PbrMaterialKit.create_oak_furniture_pbr("#5e5745", 0.48)
	mat_loose_plank.roughness = 0.82
	var mat_leather := PbrMaterialKit.create_leather_pbr("#3b271c")
	var mat_rust := PbrMaterialKit.create_iron_pbr("#4a2d20", 0.44, 0.90)

	# Deformaciones menores y tablones hundidos/astillados pegados a juntas fuera del paso central
	var wear_patches := [
		[Vector3(-24.4, 3.004, -5.2), Vector3(1.8, 0.016, 0.30), Vector3(0.7, 0.6, -0.9)],
		[Vector3(-19.8, 3.004, -5.8), Vector3(1.6, 0.016, 0.28), Vector3(-0.8, -0.5, 0.9)],
		[Vector3(-25.1, 3.004, 5.4), Vector3(1.9, 0.016, 0.31), Vector3(0.8, -0.8, -0.7)],
		[Vector3(-16.2, 3.004, 5.6), Vector3(1.5, 0.016, 0.29), Vector3(-0.6, 0.8, 1.0)],
	]
	for patch in wear_patches:
		var raw_p: Vector3 = patch[0]
		var sz: Vector3 = patch[1]
		var rot: Vector3 = patch[2]
		var dp := MeshInstance3D.new()
		var dp_b := BoxMesh.new()
		dp_b.size = sz
		dp.mesh = dp_b
		dp.material_override = mat_plank_wear
		dp.position = WreckStructure.get_world_pos(raw_p.x, raw_p.y, raw_p.z)
		dp.rotation_degrees = rot
		details.add_child(dp)

	# Algas húmedas en juntas de barandillas, bordas y escotillas (sin obstaculizar paso)
	var kelp_spots := [
		[Vector3(-13.65, 3.84, -4.9), Vector3(0.08, -1.0, -0.08), 0.42, 0.085, 301],
		[Vector3(-13.65, 3.84, 5.0), Vector3(0.08, -1.0, 0.08), 0.38, 0.075, 302],
		[Vector3(-13.65, 3.84, -1.5), Vector3(0.10, -1.0, 0.0), 0.34, 0.07, 303],
		[Vector3(-26.8, 3.24, -7.8), Vector3(0.0, -1.0, 0.22), 0.46, 0.09, 304],
		[Vector3(-28.4, 3.45, 7.2), Vector3(0.0, -1.0, -0.22), 0.48, 0.09, 305],
		[Vector3(-22.5, 3.04, -0.24), Vector3(0.0, -1.0, -0.25), 0.22, 0.06, 306],
	]
	for ks in kelp_spots:
		var wp := WreckStructure.get_world_pos(ks[0].x, ks[0].y, ks[0].z)
		PbrMaterialKit.add_kelp_strand(details, wp, ks[1], ks[2], ks[3], ks[4])

	# Brotes orgánicos de algas húmedas junto al imbornal de babor y estribor
	PbrMaterialKit.add_kelp_strand(details, WreckStructure.get_world_pos(-21.0, 3.04, -(WreckStructure.get_beam_at(-21.0) - 0.6)), Vector3(0.4, -0.25, 0.8), 0.42, 0.085, 307)
	PbrMaterialKit.add_kelp_strand(details, WreckStructure.get_world_pos(-23.5, 3.04, WreckStructure.get_beam_at(-23.5) - 0.6), Vector3(-0.3, -0.25, -0.8), 0.44, 0.085, 308)

	# Percebes sutiles en superficies exteriores / coronamento húmedo (exteriores, nunca en zona central limpia)
	var barnacle_spots := [
		[Vector3(-30.1, 3.35, -5.8), Vector3(0.8, 0.2, 0.5), 6, 0.044, 401],
		[Vector3(-30.0, 3.32, 5.9), Vector3(0.8, 0.2, -0.5), 7, 0.044, 402],
		[Vector3(-19.2, 3.28, -9.2), Vector3(0.1, 0.2, 1.0), 7, 0.040, 403],
		[Vector3(-21.6, 3.30, 8.95), Vector3(0.1, 0.2, -1.0), 6, 0.040, 404],
		[Vector3(-13.7, 3.38, 1.85), Vector3(-1.0, 0.2, 0.0), 5, 0.034, 405],
	]
	for bs in barnacle_spots:
		var bp := WreckStructure.get_world_pos(bs[0].x, bs[0].y, bs[0].z)
		PbrMaterialKit.add_barnacle_cluster(details, bp, bs[1], bs[2], bs[3], bs[4])

	# Detalles narrativos opcionales en bordes (manteniendo centro despejado y SIN nuevos cofres/documentos/cadáveres)
	# 1. Pequeños fragmentos de tablón desprendido
	for loose in [
		[Vector3(-23.9, 3.025, -4.5), Vector3(0.95, 0.04, 0.22), Vector3(1.5, 19.0, -3.5)],
		[Vector3(-19.2, 3.025, 4.9), Vector3(0.78, 0.04, 0.19), Vector3(-2.0, -28.0, 2.5)],
	]:
		var lp := MeshInstance3D.new()
		var lp_b := BoxMesh.new()
		lp_b.size = loose[1]
		lp.mesh = lp_b
		lp.material_override = mat_loose_plank
		lp.position = WreckStructure.get_world_pos(loose[0].x, loose[0].y, loose[0].z)
		lp.rotation_degrees = loose[2]
		details.add_child(lp)

	# 2. Resto de jarcia/cabo suelto junto a la balaustrada de proa de C3
	var stray_st := ShipGeometry.begin(mat_rope)
	ShipGeometry.tube(stray_st, [
		Vector3(0.0, 0.02, 0.0), Vector3(0.38, 0.024, 0.26), Vector3(0.84, 0.018, 0.12), Vector3(1.18, 0.02, -0.22)
	], 0.022, 6)
	var stray_rope := ShipGeometry.commit(details, "StrayRiggingScrap_C3", stray_st)
	stray_rope.position = WreckStructure.get_world_pos(-15.2, 3.01, -4.15)

	# 3. Herrajes oxidados pequeños y pasador roto junto al mecanismo del timón
	var scrap_root := Node3D.new()
	scrap_root.name = "HelmRustedHardware_C3"
	scrap_root.position = WreckStructure.get_world_pos(-22.15, 3.02, 0.68)
	details.add_child(scrap_root)
	var gear := MeshInstance3D.new()
	var g_tor := TorusMesh.new()
	g_tor.inner_radius = 0.055; g_tor.outer_radius = 0.10
	gear.mesh = g_tor
	gear.material_override = mat_rust
	gear.position = Vector3(0.0, 0.025, 0.0)
	scrap_root.add_child(gear)
	var bracket_frag := MeshInstance3D.new()
	var bf_b := BoxMesh.new()
	bf_b.size = Vector3(0.22, 0.028, 0.065)
	bracket_frag.mesh = bf_b
	bracket_frag.material_override = mat_rust
	bracket_frag.position = Vector3(0.14, 0.018, -0.11)
	bracket_frag.rotation_degrees.y = 38.0
	scrap_root.add_child(bracket_frag)

	# 4. Par de botas viejas de marinero abandonadas junto al arcón de popa estribor
	var boots := Node3D.new()
	boots.name = "SeaBoots_C3"
	boots.position = WreckStructure.get_world_pos(-27.2, 3.01, 3.15)
	details.add_child(boots)
	for b_idx in range(2):
		var boot := Node3D.new()
		boot.position = Vector3(float(b_idx) * 0.22, 0.0, float(b_idx) * 0.14)
		boot.rotation_degrees = Vector3(0.0, 18.0 + float(b_idx) * 34.0, 76.0 if b_idx == 1 else 4.0)
		boots.add_child(boot)
		var foot := MeshInstance3D.new()
		var f_b := BoxMesh.new()
		f_b.size = Vector3(0.12, 0.08, 0.26)
		foot.mesh = f_b
		foot.material_override = mat_leather
		foot.position = Vector3(0.0, 0.04, 0.04)
		boot.add_child(foot)
		var shaft := MeshInstance3D.new()
		var s_c := CylinderMesh.new()
		s_c.top_radius = 0.062; s_c.bottom_radius = 0.055; s_c.height = 0.26
		shaft.mesh = s_c
		shaft.material_override = mat_leather
		shaft.position = Vector3(0.0, 0.16, -0.04)
		boot.add_child(shaft)
	PbrMaterialKit.add_contact_ao_disc(boots, Vector3(0.11, 0.012, 0.07), 0.34, 0.30, 0.56, WreckStructure.LIST_SLOPE)

	# 5. Señales discretas del naufragio (mancha oscura difusa y trazo de humedad vieja)
	var old_stain := PbrMaterialKit.create_blob_shadow(1.05, 0.82, 0.20)
	old_stain.position = WreckStructure.get_world_pos(-26.3, 3.014, 1.45)
	old_stain.rotation.x = -atan(WreckStructure.LIST_SLOPE)
	details.add_child(old_stain)

	var grime_mark := PbrMaterialKit.create_blob_shadow(1.12, 0.85, 0.18)
	grime_mark.position = WreckStructure.get_world_pos(-24.2, 3.014, -1.65)
	grime_mark.rotation.x = -atan(WreckStructure.LIST_SLOPE)
	details.add_child(grime_mark)


# ==============================================================================
# ZONA 10: NIDO DE LA ARPÍA EN LA COFA (C10, +15.0m)
# ==============================================================================
func _c10_nest_height(dx: float, dz: float) -> float:
	return CrowsNestBuilder.nest_surface_height(dx, dz)

func _build_nest_skull(parent: Node3D, pos: Vector3, yaw_deg: float, bone_mat: Material, socket_mat: Material) -> void:
	var sk := Node3D.new()
	sk.position = pos
	sk.rotation_degrees = Vector3(-14.0, yaw_deg, 10.0)
	parent.add_child(sk)
	var cranium := MeshInstance3D.new()
	var cr_s := SphereMesh.new()
	cr_s.radius = 0.135; cr_s.height = 0.24; cr_s.radial_segments = 10; cr_s.rings = 6
	cranium.mesh = cr_s
	cranium.material_override = bone_mat
	cranium.scale = Vector3(0.86, 0.90, 1.08)
	sk.add_child(cranium)
	var jaw := MeshInstance3D.new()
	var jw_b := BoxMesh.new()
	jw_b.size = Vector3(0.10, 0.05, 0.12)
	jaw.mesh = jw_b
	jaw.material_override = bone_mat
	jaw.position = Vector3(0.0, -0.068, 0.070)
	sk.add_child(jaw)
	for sx in [-0.044, 0.044]:
		var eye := MeshInstance3D.new()
		var ey_s := SphereMesh.new()
		ey_s.radius = 0.030; ey_s.height = 0.048
		eye.mesh = ey_s
		eye.material_override = socket_mat
		eye.position = Vector3(sx, -0.01, 0.110)
		eye.scale = Vector3(1.0, 0.95, 0.45)
		sk.add_child(eye)
	PbrMaterialKit.add_contact_ao_disc(parent, Vector3(pos.x, pos.y - 0.065, pos.z), 0.22, 0.22, 0.58, 0.0)

func build_zone_c10_crows_nest() -> void:
	var c10_node = Node3D.new()
	c10_node.name = "Zone_C10_CrowsNest"
	add_child(c10_node)

	# Bloques A, B y C del Nido de la Arpía (entramado completo, restos, 5 tesoros ocultos y viento/oclusión)
	var nest_mats := CrowsNestBuilder.build_materials()
	CrowsNestBuilder.build_complete_nest(c10_node, nest_mats, self)

	var c10_rope_st := ShipGeometry.begin(mat_rope)
	var c10_spiral: Array[Vector3] = []
	for k in range(45):
		var t := float(k) / 44.0
		var r := lerpf(0.07, 0.28, t)
		var a := t * TAU * 2.0
		c10_spiral.append(Vector3(cos(a) * r, 0.022 + sin(t * PI) * 0.015, sin(a) * r))
	ShipGeometry.tube(c10_rope_st, c10_spiral, 0.024)
	var c10_coil := ShipGeometry.commit(c10_node, "CrowsNestHalyardCoil", c10_rope_st)
	c10_coil.position = Vector3(1.48, 15.05, 1.02)

	var dead_signal := _create_lantern_housing(0.11, 0.26, "#4f4332", 0.0)
	dead_signal.position = Vector3(-1.35, 15.14, 1.05)
	dead_signal.rotation_degrees = Vector3(72.0, 24.0, 14.0)
	c10_node.add_child(dead_signal)
	PbrMaterialKit.add_contact_ao_disc(c10_node, Vector3(-1.35, 15.035, 1.05), 0.24, 0.24, 0.52, 0.0)

# ==============================================================================
# FAROLES AMBIENTALES Y MICRO-ANIMACIÓN
# ==============================================================================
func _create_lantern_housing(radius: float, height: float, hex_color: String, emission_mult: float) -> Node3D:
	var lan_root = Node3D.new()
	lan_root.name = "LanternHousing"

	var base = MeshInstance3D.new()
	var b_cyl = CylinderMesh.new()
	b_cyl.top_radius = radius * 0.96
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
	c_cyl.bottom_radius = radius * 1.18
	c_cyl.height = height * 0.28
	c_cyl.radial_segments = 6
	cap.mesh = c_cyl
	cap.material_override = mat_iron
	cap.position = Vector3(0, height * 0.48, 0)
	lan_root.add_child(cap)

	var ring = MeshInstance3D.new()
	var r_tor = TorusMesh.new()
	r_tor.inner_radius = radius * 0.16
	r_tor.outer_radius = radius * 0.28
	ring.mesh = r_tor
	ring.material_override = mat_iron
	ring.rotation_degrees = Vector3(90, 0, 0)
	ring.position = Vector3(0, height * 0.64, 0)
	lan_root.add_child(ring)

	# 4 barrotes protectores de forja en la jaula exterior
	for cage_ang in [0.0, PI * 0.5, PI, PI * 1.5]:
		var bar = MeshInstance3D.new()
		var bar_cyl = CylinderMesh.new()
		bar_cyl.top_radius = radius * 0.08
		bar_cyl.bottom_radius = radius * 0.08
		bar_cyl.height = height * 0.78
		bar.mesh = bar_cyl
		bar.material_override = mat_iron
		bar.position = Vector3(cos(cage_ang) * radius * 0.90, 0.0, sin(cage_ang) * radius * 0.90)
		lan_root.add_child(bar)

	# Núcleo vivo de llama en lágrima interior
	var flame = MeshInstance3D.new()
	var f_cone = CylinderMesh.new()
	f_cone.top_radius = 0.008
	f_cone.bottom_radius = radius * 0.28
	f_cone.height = height * 0.36
	flame.mesh = f_cone
	flame.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_flame = StandardMaterial3D.new()
	mat_flame.albedo_color = Color("#fff4c4")
	mat_flame.emission_enabled = true
	mat_flame.emission = Color("#ffd36e")
	mat_flame.emission_energy_multiplier = emission_mult * 2.2
	flame.material_override = mat_flame
	flame.position = Vector3(0, -height * 0.04, 0)
	lan_root.add_child(flame)

	var glass = MeshInstance3D.new()
	var g_cyl = CylinderMesh.new()
	g_cyl.top_radius = radius * 0.85
	g_cyl.bottom_radius = radius * 0.72
	g_cyl.height = height * 0.70
	g_cyl.radial_segments = 6
	glass.mesh = g_cyl
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_glass = StandardMaterial3D.new()
	var col := Color(hex_color)
	mat_glass.albedo_color = Color(col.r, col.g, col.b, 0.62)
	mat_glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_glass.roughness = 0.25
	mat_glass.emission_enabled = true
	mat_glass.emission = col
	mat_glass.emission_energy_multiplier = emission_mult * 0.85
	glass.material_override = mat_glass
	glass.position = Vector3(0, 0, 0)
	lan_root.add_child(glass)

	return lan_root

func _override_mesh_material(node: Node, mat: Material) -> void:
	if node is MeshInstance3D:
		node.material_override = mat
	for child in node.get_children():
		_override_mesh_material(child, mat)

func _spawn_perched_seagull(parent: Node3D, x: float, y_deck: float, z: float, rot_y: float, spawn_bitt: bool = true, custom_perch_h: float = 0.93) -> void:
	var bitt_pos = WreckStructure.get_world_pos(x, y_deck, z)
	if spawn_bitt:
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
	bird.position = bitt_pos + Vector3(0, custom_perch_h, 0)
	bird.rotation.y = rot_y
	parent.add_child(bird)
	animated_fauna.append(bird)

func build_ambient_lanterns() -> void:
	var lantern_node = Node3D.new()
	lantern_node.name = "AmbientLanterns"
	add_child(lantern_node)

	# Todos los faroles quedan amarrados físicamente mediante abrazadera y brazo de hierro a su mástil o puntal
	var spots = [
		{"pos": WreckStructure.get_world_pos(0.95, 1.85, 0.78), "anchor": WreckStructure.get_world_pos(0.35, 2.00, 0.32), "energy": 1.65, "range": 9.5, "shadow": true,  "name": "Lantern_C1_Mid",       "group": "LanternGroup_C1"},
		{"pos": WreckStructure.get_world_pos(21.0, 4.72, -0.92), "anchor": WreckStructure.get_world_pos(21.0, 4.86, 0.00), "energy": 1.45, "range": 9.0, "shadow": false, "name": "Lantern_C2_Bow",       "group": "LanternGroup_C2"},
		{"pos": WreckStructure.get_world_pos(-5.5, -1.35, 2.18), "anchor": WreckStructure.get_world_pos(-5.5, -1.20, 2.60), "energy": 1.35, "range": 8.0, "shadow": false, "name": "Lantern_C8_HoldStair", "group": "LanternGroup_C8"}
	]

	for s in spots:
		var grp := Node3D.new()
		grp.name = s["group"]
		lantern_node.add_child(grp)

		var lpos: Vector3 = s["pos"]
		var apos: Vector3 = s["anchor"]

		# Abrazadera sobre el mástil / puntal de madera
		var collar = MeshInstance3D.new()
		var col_cyl = CylinderMesh.new()
		col_cyl.top_radius = 0.24
		col_cyl.bottom_radius = 0.24
		col_cyl.height = 0.14
		collar.mesh = col_cyl
		collar.material_override = mat_iron
		collar.position = apos
		grp.add_child(collar)

		# Brazo horizontal de hierro que sostiene el farol desde el mástil/puntal
		var arm_vec := Vector3(lpos.x - apos.x, 0.0, lpos.z - apos.z)
		var arm_len := maxf(0.30, arm_vec.length())
		var arm = MeshInstance3D.new()
		var arm_box = BoxMesh.new()
		arm_box.size = Vector3(0.06, 0.06, arm_len)
		arm.mesh = arm_box
		arm.material_override = mat_iron
		arm.position = Vector3((lpos.x + apos.x) * 0.5, apos.y, (lpos.z + apos.z) * 0.5)
		if arm_vec.length_squared() > 0.0001:
			arm.rotation.y = atan2(arm_vec.x, arm_vec.z)
		grp.add_child(arm)

		# Cadena / tirante corto vertical al farol
		var stem = MeshInstance3D.new()
		var s_cyl = CylinderMesh.new()
		s_cyl.top_radius = 0.025
		s_cyl.bottom_radius = 0.025
		s_cyl.height = maxf(0.10, apos.y - lpos.y)
		stem.mesh = s_cyl
		stem.material_override = mat_iron
		stem.position = Vector3(lpos.x, (apos.y + lpos.y) * 0.5 + 0.05, lpos.z)
		grp.add_child(stem)

		var housing = _create_lantern_housing(0.14, 0.34, "#ffa840", 1.45)
		housing.position = lpos
		grp.add_child(housing)

		var light = OmniLight3D.new()
		light.name = s.name
		light.position = lpos
		light.light_color = Color("#ffbd66")
		light.light_energy = s.energy
		light.omni_range = s.range
		light.omni_attenuation = 1.45
		light.shadow_enabled = s["shadow"]
		if light.shadow_enabled:
			light.shadow_bias = 0.05
			light.shadow_normal_bias = 1.6
			light.shadow_blur = 1.5
		grp.add_child(light)

		flickering_lights.append({"node": light, "base": s.energy, "speed": 2.4, "offset": randf() * 10.0})

func create_crab_mesh() -> Node3D:
	var root = Node3D.new()
	root.set_meta("type", "crab")

	var shell = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 0.14
	sphere.height = 0.10
	shell.mesh = sphere
	shell.material_override = mat_crab
	shell.scale = Vector3(1.15, 0.72, 0.88)
	root.add_child(shell)

	var crab_st := ShipGeometry.begin(mat_crab)
	for side in [-1.0, 1.0]:
		# Pinza articulada (brazo + tenaza)
		ShipGeometry.tube(crab_st, [Vector3(0.08, 0.01, side * 0.09), Vector3(0.18, 0.03, side * 0.18), Vector3(0.24, 0.02, side * 0.14)], 0.022)
		# Tres pares de patas caminadoras articuladas
		for leg_i in range(3):
			var lx := 0.02 - float(leg_i) * 0.055
			ShipGeometry.tube(crab_st, [
				Vector3(lx, 0.0, side * 0.09),
				Vector3(lx - 0.02, 0.03, side * 0.17),
				Vector3(lx - 0.04, -0.04, side * 0.22),
			], 0.012)
	ShipGeometry.commit(root, "CrabLegs", crab_st)

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
