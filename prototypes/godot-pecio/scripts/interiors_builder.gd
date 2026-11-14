class_name InteriorsBuilder
extends Node3D

const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")
const HullBuilder = preload("res://scripts/hull_builder.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")

# Generador de Interiores Canónicos C4-C7, Cubierta Inferior C8 y Bodega Sumergida C9
# Conforme a engine/client/wreck-interior.ts, wreck-runtime-v6.ts y PECIO_SPATIAL_PLAN.md

var mat_bulkhead: StandardMaterial3D
var mat_furniture: StandardMaterial3D
var mat_metal: StandardMaterial3D
var mat_flood_water: Material
var mat_hold_water: Material
var mat_caustics: Material
var mat_bedding: StandardMaterial3D
var mat_skeleton: StandardMaterial3D
var mat_kelp: StandardMaterial3D
var mat_chart: StandardMaterial3D

var interior_lanterns: Array[Dictionary] = []

func _ready() -> void:
	setup_materials()
	build_cabins_aft()      # C4 (Capitán) y C5 (Cocina) bajo C3
	build_cabins_fore()     # C6 (Camarote) y C7 (Comedor) bajo C2
	build_lower_deck_c8()   # Cubierta baja inundada (-3.2m)
	build_hold_c9()         # Bodega sumergida (-6.4m) y brecha submarina P16

var mat_copper: StandardMaterial3D
var mat_floor_cabin: StandardMaterial3D

func setup_materials() -> void:
	mat_bulkhead = PbrMaterialKit.create_wood_planks_pbr("#9e8b74", 0.28)
	mat_bulkhead.roughness = 0.80
	mat_bulkhead.metallic_specular = 0.16
	mat_bulkhead.ao_light_affect = 0.20
	mat_bulkhead.normal_scale = 0.28
	mat_bulkhead.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat_floor_cabin = PbrMaterialKit.create_cabin_floor_pbr("#b4b3a1", 0.34)

	mat_furniture = PbrMaterialKit.create_oak_furniture_pbr("#4c3d2d")
	mat_metal = PbrMaterialKit.create_iron_pbr("#262827", 0.56, 0.76)

	mat_copper = PbrMaterialKit.create_aged_copper_pbr("#614933")

	mat_bedding = PbrMaterialKit.create_moldy_cloth_pbr("#aaa28a")

	mat_skeleton = PbrMaterialKit.create_mineralized_bone_pbr("#a69e8c")

	mat_kelp = PbrMaterialKit.create_algae_pbr("#203624")

	mat_chart = StandardMaterial3D.new()
	mat_chart.albedo_texture = _create_nautical_chart_texture()
	mat_chart.albedo_color = Color("#bfb296")
	mat_chart.roughness = 0.96
	mat_chart.metallic_specular = 0.04

	# Agua inundada animada y translúcida de C8 (15-45 cm) y Bodega C9 sumergida
	mat_flood_water = PbrMaterialKit.create_flood_water_material(false)
	mat_hold_water = PbrMaterialKit.create_flood_water_material(true)
	mat_caustics = PbrMaterialKit.create_underwater_caustics_material()

func _create_nautical_chart_texture() -> ImageTexture:
	var w = 128
	var h = 96
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var bg = Color("#c8b791")
	var ink = Color("#4a3723")
	var sea_line = Color("#577576")
	var rose = Color("#8c2d23")
	for y in range(h):
		for x in range(w):
			var edge = 1.0 - max(abs(float(x) / w - 0.5), abs(float(y) / h - 0.5)) * 1.4
			var tone = bg.darkened(clamp(0.28 - edge * 0.25, 0.0, 0.35))
			img.set_pixel(x, y, tone)
	# Loxodromas y cuadrícula cartográfica
	for x in range(12, w - 12, 20):
		for y in range(8, h - 8):
			img.set_pixel(x, y, ink.lerp(bg, 0.55))
	for y in range(10, h - 10, 18):
		for x in range(8, w - 8):
			img.set_pixel(x, y, ink.lerp(bg, 0.55))
	# Isla de las Tempestades en tinta sepia
	for a in range(360):
		var rad = deg_to_rad(a)
		var rx = int(w * 0.52 + cos(rad) * (16 + sin(rad * 3.0) * 5))
		var ry = int(h * 0.48 + sin(rad) * (12 + cos(rad * 2.0) * 4))
		if rx >= 2 and rx < w - 2 and ry >= 2 and ry < h - 2:
			img.set_pixel(rx, ry, ink)
			img.set_pixel(rx + 1, ry, sea_line)
	# Rosa de los vientos en esquina
	var cx = 28; var cy = 70
	for r in range(-9, 10):
		img.set_pixel(cx + r, cy, rose)
		img.set_pixel(cx, cy + r, rose)
	return ImageTexture.create_from_image(img)

# ==============================================================================
# ZONAS C4 Y C5: CAMAROTE DEL CAPITÁN Y COCINA (BAJO CASTILLO DE POPA C3)
# ==============================================================================
func build_cabins_aft() -> void:
	var aft_node = Node3D.new()
	aft_node.name = "AftCabins_C4_C5"
	add_child(aft_node)

	# Suelo entarimado continuo con recorte exacto para la brecha P13 (c4 -> C8) y colisión física
	_build_contoured_cabin_floor(aft_node, "Floor_AftCabins", WreckStructure.STERN_X, WreckStructure.STERN_DECK_END, true)

	var beam_aft = WreckStructure.get_beam_at(-13.5) + 0.18

	# Mamparo divisorio frontal cerrado con umbrales despejados para escaleras (z = ±3.5)
	# 1. Mamparo babor Popa (C4): costado exterior, umbral de puerta C4 (z = -5.20) y cierre bajo escalera
	var front_c4 = Node3D.new()
	front_c4.name = "Bulkhead_Front_C4"
	aft_node.add_child(front_c4)
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -beam_aft), Vector3(-13.5, 0, -5.80), 2.95, "Bulkhead_C4_Outboard")
	PbrMaterialKit.add_occluder_box(front_c4, "Occ_FrontC4", Vector3(0.24, 2.7, maxf(1.0, beam_aft - 5.80)), WreckStructure.get_world_pos(-13.5, 1.4, -(beam_aft + 5.80) * 0.5))
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -4.60), Vector3(-13.5, 0, -4.35), 2.95, "Wall_Aft_PortDoorToStair")
	# Cierre inferior bajo la escalera de popa babor (y <= 2.50m; deja paso libre al combés y cubierta C3 a y = 3.0m)
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -4.35), Vector3(-13.5, 0, -2.65), 2.50, "UnderStair_Aft_Port", false)

	# 2. Mamparo intermedio central entre escalera popa babor y puerta C5 (z = 1.25)
	var front_mid = Node3D.new()
	front_mid.name = "Bulkhead_Front_Mid"
	aft_node.add_child(front_mid)
	build_bulkhead_wall(front_mid, Vector3(-13.5, 0, -2.65), Vector3(-13.5, 0, 1.25), 2.95, "Bulkhead_Front_Mid_Mesh")
	PbrMaterialKit.add_occluder_box(front_mid, "Occ_FrontMid", Vector3(0.24, 2.7, 3.8), WreckStructure.get_world_pos(-13.5, 1.4, -0.70))

	# 3. Mamparo estribor Popa (C5): tramo junto a puerta C5, cierre bajo escalera y costado exterior
	var front_c5 = Node3D.new()
	front_c5.name = "Bulkhead_Front_C5"
	aft_node.add_child(front_c5)
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 2.35), Vector3(-13.5, 0, 2.65), 2.95, "Wall_Aft_StbdDoorToStair")
	# Cierre inferior bajo la escalera de popa estribor (y <= 2.50m)
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 2.65), Vector3(-13.5, 0, 4.35), 2.50, "UnderStair_Aft_Stbd", false)
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 4.35), Vector3(-13.5, 0, beam_aft), 2.95, "Bulkhead_C5_Outboard")
	PbrMaterialKit.add_occluder_box(front_c5, "Occ_FrontC5", Vector3(0.24, 2.7, maxf(1.0, beam_aft - 4.35)), WreckStructure.get_world_pos(-13.5, 1.4, (beam_aft + 4.35) * 0.5))

	# Mamparo longitudinal central completo hasta el espejo de popa (x = -30.75..-13.5) sin huecos
	var spine_aft = Node3D.new()
	spine_aft.name = "Bulkhead_Spine_Aft"
	aft_node.add_child(spine_aft)
	build_bulkhead_wall(spine_aft, Vector3(WreckStructure.STERN_X, 0, 0), Vector3(-13.5, 0, 0), 3.0, "Bulkhead_Spine_Aft_Mesh")
	PbrMaterialKit.add_occluder_box(spine_aft, "Occ_SpineAft", Vector3(16.8, 2.7, 0.24), WreckStructure.get_world_pos(-22.1, 1.4, 0.0))

	# Forros interiores curvos del casco en popa (para que C4 y C5 queden cerrados visual y físicamente)
	_build_hull_interior_lining(aft_node, "HullInner_Aft_Port", WreckStructure.STERN_X, -13.5, 0.0, 3.05, -1.0, 0.96, 0.98)
	_build_hull_interior_lining(aft_node, "HullInner_Aft_Front", WreckStructure.STERN_X, -13.5, 0.0, 3.05, 1.0, 0.96, 0.98)
	var stern_b = WreckStructure.get_beam_at(WreckStructure.STERN_X)
	build_bulkhead_wall(aft_node, Vector3(WreckStructure.STERN_X, 0, -stern_b), Vector3(WreckStructure.STERN_X, 0, 0.0), 3.0, "InteriorWall_Stern_C4")
	var stern_c5_wall = Node3D.new()
	stern_c5_wall.name = "InteriorWall_Stern_C5_Root"
	aft_node.add_child(stern_c5_wall)
	build_bulkhead_wall(stern_c5_wall, Vector3(WreckStructure.STERN_X, 0, 0.0), Vector3(WreckStructure.STERN_X, 0, stern_b), 3.0, "InteriorWall_Stern_C5")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 4: CAMAROTE DEL CAPITÁN (C4, z < 0)
	# --------------------------------------------------------------------------
	# 1. Escritorio náutico del Capitán (tablero, cajoneras, tintero y sillón de roble)
	var desk_node = Node3D.new()
	desk_node.name = "CaptainsDesk"
	desk_node.position = WreckStructure.get_world_pos(-16.5, 0.0, -4.5)
	aft_node.add_child(desk_node)

	var desk_slab = MeshInstance3D.new()
	var d_slab_box = BoxMesh.new()
	d_slab_box.size = Vector3(1.85, 0.10, 0.98)
	desk_slab.mesh = d_slab_box
	desk_slab.material_override = mat_furniture
	desk_slab.position = Vector3(0, 0.80, 0)
	desk_node.add_child(desk_slab)

	for px in [-0.62, 0.62]:
		var ped = MeshInstance3D.new()
		var p_box = BoxMesh.new()
		p_box.size = Vector3(0.50, 0.76, 0.86)
		ped.mesh = p_box
		ped.material_override = mat_furniture
		ped.position = Vector3(px, 0.38, 0)
		desk_node.add_child(ped)

	var apron = MeshInstance3D.new()
	var ap_box = BoxMesh.new()
	ap_box.size = Vector3(0.84, 0.16, 0.78)
	apron.mesh = ap_box
	apron.material_override = mat_furniture
	apron.position = Vector3(0, 0.68, 0)
	desk_node.add_child(apron)

	var inkwell = MeshInstance3D.new()
	var ink_cyl = CylinderMesh.new()
	ink_cyl.top_radius = 0.045; ink_cyl.bottom_radius = 0.06; ink_cyl.height = 0.08
	inkwell.mesh = ink_cyl
	inkwell.material_override = mat_copper
	inkwell.position = Vector3(0.52, 0.89, -0.24)
	desk_node.add_child(inkwell)

	# Carta de navegación náutica extendida sobre la mesa (con varillas de pergamino)
	var chart = MeshInstance3D.new()
	var ch_plane = PlaneMesh.new()
	ch_plane.size = Vector2(0.95, 0.62)
	chart.mesh = ch_plane
	chart.material_override = mat_chart
	chart.position = Vector3(-0.08, 0.86, 0)
	desk_node.add_child(chart)

	for rod_x in [-0.55, 0.39]:
		var rod = MeshInstance3D.new()
		var rod_cyl = CylinderMesh.new()
		rod_cyl.top_radius = 0.022
		rod_cyl.bottom_radius = 0.022
		rod_cyl.height = 0.68
		rod.mesh = rod_cyl
		rod.material_override = mat_furniture
		rod.position = Vector3(rod_x, 0.87, 0)
		rod.rotation_degrees.x = 90.0
		desk_node.add_child(rod)

	# Interacción contextual canónica: [E] Examinar Carta Náutica
	var prop_chart = InteractiveProp.new()
	prop_chart.name = "PropChartC4"
	prop_chart.prop_id = "c4_chart"
	prop_chart.prompt_text = "Examinar Carta Náutica de la Costa de la Espada"
	prop_chart.inspection_message = "El mapa náutico detalla arrecifes traicioneros y la derrota hacia la Isla de los Naufragios."
	prop_chart.interaction_radius = 2.4
	desk_node.add_child(prop_chart)

	# Sillón del capitán con patas, asiento, respaldo y reposabrazos
	var chair_seat = MeshInstance3D.new()
	var cs_box = BoxMesh.new()
	cs_box.size = Vector3(0.52, 0.08, 0.54)
	chair_seat.mesh = cs_box
	chair_seat.material_override = mat_furniture
	chair_seat.position = Vector3(0.76, 0.46, 0)
	desk_node.add_child(chair_seat)

	var chair_back = MeshInstance3D.new()
	var cb_box = BoxMesh.new()
	cb_box.size = Vector3(0.08, 0.64, 0.52)
	chair_back.mesh = cb_box
	chair_back.material_override = mat_furniture
	chair_back.position = Vector3(0.99, 0.78, 0)
	desk_node.add_child(chair_back)

	for lz in [-0.22, 0.22]:
		for lx in [0.54, 0.98]:
			var leg = MeshInstance3D.new()
			var l_box = BoxMesh.new()
			l_box.size = Vector3(0.06, 0.46, 0.06)
			leg.mesh = l_box
			leg.material_override = mat_furniture
			leg.position = Vector3(lx, 0.23, lz)
			desk_node.add_child(leg)
		var arm = MeshInstance3D.new()
		var a_box = BoxMesh.new()
		a_box.size = Vector3(0.46, 0.06, 0.06)
		arm.mesh = a_box
		arm.material_override = mat_furniture
		arm.position = Vector3(0.76, 0.68, lz)
		desk_node.add_child(arm)

	PbrMaterialKit.add_box_collider(desk_node, "Col_CaptainsDesk", Vector3(2.05, 0.95, 1.00), Vector3(0.08, 0.48, 0.0))

	var desk_shadow = PbrMaterialKit.create_blob_shadow(1.5, 1.1, 0.62)
	desk_shadow.position = Vector3(0, 0.02, 0)
	desk_node.add_child(desk_shadow)

	# 2. Cama con dosel desvencijada (cabecero, travesaños y colisionador)
	var bed_node = Node3D.new()
	bed_node.name = "CaptainsBed"
	bed_node.position = WreckStructure.get_world_pos(-20.0, 0.0, -4.2)
	aft_node.add_child(bed_node)

	var prop_bed = InteractiveProp.new()
	prop_bed.name = "PropBedC4"
	prop_bed.prop_id = "c4_bed"
	prop_bed.prompt_text = "Registrar Camastro del Capitán"
	prop_bed.inspection_message = "Entre las mantas descubres una hebilla de plata grabada con la Rosa de los Vientos."
	prop_bed.interaction_radius = 2.4
	bed_node.add_child(prop_bed)

	var bed_frame = MeshInstance3D.new()
	var bf_box = BoxMesh.new()
	bf_box.size = Vector3(2.4, 0.52, 1.8)
	bed_frame.mesh = bf_box
	bed_frame.material_override = mat_furniture
	bed_frame.position = Vector3(0, 0.26, 0)
	bed_node.add_child(bed_frame)

	var headboard = MeshInstance3D.new()
	var hb_box = BoxMesh.new()
	hb_box.size = Vector3(0.12, 1.15, 1.78)
	headboard.mesh = hb_box
	headboard.material_override = mat_furniture
	headboard.position = Vector3(-1.14, 0.72, 0)
	bed_node.add_child(headboard)

	var mattress = MeshInstance3D.new()
	var mat_box = BoxMesh.new()
	mat_box.size = Vector3(2.2, 0.2, 1.6)
	mattress.mesh = mat_box
	mattress.material_override = mat_bedding
	mattress.position = Vector3(0, 0.60, 0)
	bed_node.add_child(mattress)

	var pillow = MeshInstance3D.new()
	var pil_box = BoxMesh.new()
	pil_box.size = Vector3(0.42, 0.14, 1.15)
	pillow.mesh = pil_box
	pillow.material_override = mat_chart
	pillow.position = Vector3(-0.82, 0.74, 0)
	bed_node.add_child(pillow)

	# Postes y bastidor superior del dosel
	for bx in [-1.1, 1.1]:
		for bz in [-0.8, 0.8]:
			var post = MeshInstance3D.new()
			var p_cyl = CylinderMesh.new()
			p_cyl.top_radius = 0.045
			p_cyl.bottom_radius = 0.055
			p_cyl.height = 2.35
			post.mesh = p_cyl
			post.material_override = mat_furniture
			post.position = Vector3(bx, 1.18, bz)
			bed_node.add_child(post)

	for bz in [-0.8, 0.8]:
		var top_rail = MeshInstance3D.new()
		var tr_box = BoxMesh.new()
		tr_box.size = Vector3(2.26, 0.07, 0.07)
		top_rail.mesh = tr_box
		top_rail.material_override = mat_furniture
		top_rail.position = Vector3(0, 2.32, bz)
		bed_node.add_child(top_rail)

	PbrMaterialKit.add_box_collider(bed_node, "Col_CaptainsBed", Vector3(2.44, 1.10, 1.84), Vector3(0, 0.55, 0))

	var bed_shadow = PbrMaterialKit.create_blob_shadow(1.8, 1.3, 0.65)
	bed_shadow.position = Vector3(0, 0.02, 0)
	bed_node.add_child(bed_shadow)

	# 3. Cofre de caudales de hierro (c4-gold) asentado sobre entarimado en escala táctica real
	var chest_pos = WreckStructure.get_world_pos(-15.0, 0.0, -2.5)
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		var c_inst = chest_res.instantiate()
		c_inst.position = chest_pos + Vector3(0, 0.085, 0)
		c_inst.rotation.y = 1.9
		c_inst.scale = Vector3(0.65, 0.65, 0.65)
		PbrMaterialKit.apply_kenney_material(c_inst)
		aft_node.add_child(c_inst)
		PbrMaterialKit.add_box_collider(aft_node, "Col_CaptainsChestC4", Vector3(0.85, 0.72, 0.62), chest_pos + Vector3(0, 0.36, 0))

	var chest_shadow = PbrMaterialKit.create_blob_shadow(0.65, 0.55, 0.6)
	chest_shadow.position = chest_pos + Vector3(0, 0.02, 0)
	aft_node.add_child(chest_shadow)

	# 4. Estantería volcada con baldas, cuadernos de bitácora y colisionador
	var shelf_pos = WreckStructure.get_world_pos(-18.5, 0.0, -1.6)
	var shelf_node = Node3D.new()
	shelf_node.name = "OverturnedBookshelf"
	shelf_node.position = shelf_pos + Vector3(0, 0.25, 0)
	shelf_node.rotation_degrees = Vector3(12, 35, 78)
	aft_node.add_child(shelf_node)

	var back_panel = MeshInstance3D.new()
	var bp_box = BoxMesh.new()
	bp_box.size = Vector3(1.56, 1.98, 0.06)
	back_panel.mesh = bp_box
	back_panel.material_override = mat_furniture
	back_panel.position = Vector3(0, 0, -0.19)
	shelf_node.add_child(back_panel)

	for sx in [-0.75, 0.75]:
		var stile = MeshInstance3D.new()
		var st_box = BoxMesh.new()
		st_box.size = Vector3(0.08, 2.0, 0.44)
		stile.mesh = st_box
		stile.material_override = mat_furniture
		stile.position = Vector3(sx, 0, 0)
		shelf_node.add_child(stile)

	for sy in [-0.94, -0.32, 0.30, 0.94]:
		var plank = MeshInstance3D.new()
		var pl_box = BoxMesh.new()
		pl_box.size = Vector3(1.48, 0.06, 0.42)
		plank.mesh = pl_box
		plank.material_override = mat_furniture
		plank.position = Vector3(0, sy, 0.01)
		shelf_node.add_child(plank)

	var mat_book := PbrMaterialKit.create_oak_furniture_pbr("#6d2f24", 0.5)
	for bi in range(4):
		var book = MeshInstance3D.new()
		var bk_box = BoxMesh.new()
		bk_box.size = Vector3(0.24, 0.06, 0.30)
		book.mesh = bk_box
		book.material_override = mat_book
		book.position = Vector3(-0.35 + bi * 0.24, -0.25 + (bi % 2) * 0.62, 0.06)
		book.rotation_degrees.z = -8.0 + bi * 5.0
		shelf_node.add_child(book)

	PbrMaterialKit.add_box_collider(shelf_node, "Col_Bookshelf", Vector3(1.62, 2.02, 0.48), Vector3.ZERO)

	var shelf_shadow = PbrMaterialKit.create_blob_shadow(1.2, 0.8, 0.55)
	shelf_shadow.position = shelf_pos + Vector3(0, 0.02, 0)
	aft_node.add_child(shelf_shadow)

	# 5. Agujero P13 enmarcado en vigas rotas hacia la cubierta baja C8
	build_hole_rim(aft_node, WreckStructure.get_world_pos(-17.5, 0.0, -3.2), 0.8)

	# Farol de pared de C4
	build_wall_lantern(aft_node, Vector3(-16.0, 2.0, -4.5), "Lantern_C4_Captain")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 5: COCINA DE A BORDO (C5 - GALLEY, z > 0)
	# --------------------------------------------------------------------------
	# 1. Fogón / Estufa de hierro fundido con hogar, tiro y caldera de cobre
	var stove_node = Node3D.new()
	stove_node.name = "GalleyStove"
	stove_node.position = WreckStructure.get_world_pos(-19.5, 0.0, 4.5)
	aft_node.add_child(stove_node)

	var hearth = MeshInstance3D.new()
	var h_box = BoxMesh.new()
	h_box.size = Vector3(1.56, 0.12, 1.36)
	hearth.mesh = h_box
	hearth.material_override = mat_furniture
	hearth.position = Vector3(0, 0.06, 0)
	stove_node.add_child(hearth)

	var stove_body = MeshInstance3D.new()
	var stb_box = BoxMesh.new()
	stb_box.size = Vector3(1.36, 0.82, 1.16)
	stove_body.mesh = stb_box
	stove_body.material_override = mat_metal
	stove_body.position = Vector3(0, 0.52, 0)
	stove_node.add_child(stove_body)

	var stove_top = MeshInstance3D.new()
	var stt_box = BoxMesh.new()
	stt_box.size = Vector3(1.44, 0.08, 1.24)
	stove_top.mesh = stt_box
	stove_top.material_override = mat_metal
	stove_top.position = Vector3(0, 0.96, 0)
	stove_node.add_child(stove_top)

	var stove_door = MeshInstance3D.new()
	var std_box = BoxMesh.new()
	std_box.size = Vector3(0.06, 0.45, 0.62)
	stove_door.mesh = std_box
	stove_door.material_override = PbrMaterialKit.create_iron_pbr("#3a3d3f")
	stove_door.position = Vector3(0.70, 0.48, 0)
	stove_node.add_child(stove_door)

	for gz in [-0.20, -0.07, 0.07, 0.20]:
		var bar = MeshInstance3D.new()
		var bar_box = BoxMesh.new()
		bar_box.size = Vector3(0.04, 0.36, 0.03)
		bar.mesh = bar_box
		bar.material_override = mat_metal
		bar.position = Vector3(0.73, 0.48, gz)
		stove_node.add_child(bar)

	var kettle = MeshInstance3D.new()
	var ket_cyl = CylinderMesh.new()
	ket_cyl.top_radius = 0.22
	ket_cyl.bottom_radius = 0.25
	ket_cyl.height = 0.30
	kettle.mesh = ket_cyl
	kettle.material_override = mat_copper
	kettle.position = Vector3(0.28, 1.15, -0.22)
	stove_node.add_child(kettle)

	var skillet = MeshInstance3D.new()
	var sk_cyl = CylinderMesh.new()
	sk_cyl.top_radius = 0.20; sk_cyl.bottom_radius = 0.17; sk_cyl.height = 0.08
	skillet.mesh = sk_cyl
	skillet.material_override = mat_metal
	skillet.position = Vector3(0.24, 1.04, 0.28)
	stove_node.add_child(skillet)

	var collar_flange = MeshInstance3D.new()
	var fl_cyl = CylinderMesh.new()
	fl_cyl.top_radius = 0.20; fl_cyl.bottom_radius = 0.24; fl_cyl.height = 0.12
	collar_flange.mesh = fl_cyl
	collar_flange.material_override = mat_metal
	collar_flange.position = Vector3(-0.25, 1.05, 0.2)
	stove_node.add_child(collar_flange)

	# Tubo vertical de chimenea con collarín remachado hasta techo C3
	var chimney = MeshInstance3D.new()
	var ch_cyl = CylinderMesh.new()
	ch_cyl.top_radius = 0.12
	ch_cyl.bottom_radius = 0.14
	ch_cyl.height = 2.05
	chimney.mesh = ch_cyl
	chimney.material_override = mat_metal
	chimney.position = Vector3(-0.25, 2.00, 0.2)
	stove_node.add_child(chimney)

	PbrMaterialKit.add_box_collider(stove_node, "Col_GalleyStove", Vector3(1.58, 1.25, 1.38), Vector3(0, 0.62, 0))

	var stove_shadow = PbrMaterialKit.create_blob_shadow(1.2, 1.0, 0.65)
	stove_shadow.position = Vector3(0, 0.02, 0)
	stove_node.add_child(stove_shadow)

	var prop_stove = InteractiveProp.new()
	prop_stove.name = "PropStoveC5"
	prop_stove.prop_id = "c5_stove"
	prop_stove.prompt_text = "Inspeccionar Fogón de Cocina"
	prop_stove.inspection_message = "Fogón de hierro fundido apagado hace 50 años. El tiro de chimenea conserva restos de hollín."
	prop_stove.interaction_radius = 2.2
	stove_node.add_child(prop_stove)

	# 2. Encimera de carnicero y preparación con colisionador
	var counter_node = Node3D.new()
	counter_node.name = "GalleyCounter"
	counter_node.position = WreckStructure.get_world_pos(-16.0, 0.0, 5.0)
	aft_node.add_child(counter_node)

	var counter_mesh = MeshInstance3D.new()
	var cnt_box = BoxMesh.new()
	cnt_box.size = Vector3(2.4, 0.85, 0.8)
	counter_mesh.mesh = cnt_box
	counter_mesh.material_override = mat_furniture
	counter_mesh.position = Vector3(0, 0.425, 0)
	counter_node.add_child(counter_mesh)

	PbrMaterialKit.add_box_collider(counter_node, "Col_GalleyCounter", Vector3(2.42, 0.95, 0.84), Vector3(0, 0.48, 0))

	# Olla de cobre y cuchillo de picar
	var pot = MeshInstance3D.new()
	var p_cyl = CylinderMesh.new()
	p_cyl.top_radius = 0.16
	p_cyl.bottom_radius = 0.14
	p_cyl.height = 0.22
	pot.mesh = p_cyl
	pot.material_override = mat_copper
	pot.position = Vector3(-0.6, 0.96, 0)
	counter_node.add_child(pot)

	var counter_shadow = PbrMaterialKit.create_blob_shadow(1.6, 0.9, 0.6)
	counter_shadow.position = Vector3(0, 0.02, 0)
	counter_node.add_child(counter_shadow)

	# 3. Esqueleto anatómico sin cabeza sentado en el suelo (c5-skeleton-blockout)
	var skel_c5 = Node3D.new()
	skel_c5.name = "HeadlessSkeleton_C5"
	skel_c5.position = WreckStructure.get_world_pos(-18.5, 0.0, 2.2)
	aft_node.add_child(skel_c5)

	# Pelvis, columna, costillas arqueadas y extremidades (sin cráneo según canon)
	var pelvis = MeshInstance3D.new()
	var pelv_box = BoxMesh.new()
	pelv_box.size = Vector3(0.24, 0.14, 0.34)
	pelvis.mesh = pelv_box
	pelvis.material_override = mat_skeleton
	pelvis.position = Vector3(0, 0.09, 0)
	skel_c5.add_child(pelvis)

	var spine = MeshInstance3D.new()
	var sp_cyl = CylinderMesh.new()
	sp_cyl.top_radius = 0.04
	sp_cyl.bottom_radius = 0.05
	sp_cyl.height = 0.52
	spine.mesh = sp_cyl
	spine.material_override = mat_skeleton
	spine.position = Vector3(-0.06, 0.35, 0)
	spine.rotation_degrees = Vector3(0, 0, 18)
	skel_c5.add_child(spine)

	for rib_y in [0.34, 0.42, 0.50]:
		var rib_cage = MeshInstance3D.new()
		var rib_tor = TorusMesh.new()
		rib_tor.inner_radius = 0.09
		rib_tor.outer_radius = 0.13
		rib_cage.mesh = rib_tor
		rib_cage.material_override = mat_skeleton
		rib_cage.position = Vector3(-0.02, rib_y, 0)
		rib_cage.scale = Vector3(0.75, 1.0, 1.15)
		skel_c5.add_child(rib_cage)

	for leg_side in [-0.13, 0.13]:
		var femur = MeshInstance3D.new()
		var l_cyl = CylinderMesh.new()
		l_cyl.top_radius = 0.035
		l_cyl.bottom_radius = 0.03
		l_cyl.height = 0.48
		femur.mesh = l_cyl
		femur.material_override = mat_skeleton
		femur.position = Vector3(0.22, 0.06, leg_side * 1.15)
		femur.rotation_degrees = Vector3(0, 15 * sign(leg_side), 86)
		skel_c5.add_child(femur)

	var skel_shadow = PbrMaterialKit.create_blob_shadow(0.9, 0.9, 0.6)
	skel_shadow.position = Vector3(0, 0.02, 0)
	skel_c5.add_child(skel_shadow)

	var prop_skel = InteractiveProp.new()
	prop_skel.name = "PropSkelC5"
	prop_skel.prop_id = "c5_skeleton"
	prop_skel.prompt_text = "Registrar Esqueleto del Cocinero"
	prop_skel.inspection_message = "El esqueleto no tiene cráneo. En su jubón andrajoso encuentras un viejo gancho de salazón."
	prop_skel.interaction_radius = 2.2
	skel_c5.add_child(prop_skel)

	# 4. Barriles de salazón asentados en entarimado C5
	var b1_pos = WreckStructure.get_world_pos(-14.5, 0.0, 5.5)
	var barrel_res = load("res://assets/models/barrel.glb")
	if barrel_res:
		var b1 = barrel_res.instantiate()
		b1.position = b1_pos
		b1.scale = Vector3(0.85, 0.85, 0.85)
		PbrMaterialKit.apply_kenney_material(b1)
		aft_node.add_child(b1)
		PbrMaterialKit.add_cyl_collider(aft_node, "Col_GalleyBarrelC5", 0.42, 0.96, b1_pos + Vector3(0, 0.48, 0))

	var b1_shadow = PbrMaterialKit.create_blob_shadow(0.85, 0.85, 0.58)
	b1_shadow.position = b1_pos + Vector3(0, 0.02, 0)
	aft_node.add_child(b1_shadow)

	# Farol de pared de C5
	build_wall_lantern(aft_node, Vector3(-16.0, 2.0, 4.5), "Lantern_C5_Galley")

# ==============================================================================
# ZONAS C6 Y C7: CAMAROTE DE TRIPULACIÓN Y COMEDOR (BAJO CASTILLO DE PROA C2)
# ==============================================================================
func build_cabins_fore() -> void:
	var fore_node = Node3D.new()
	fore_node.name = "ForeCabins_C6_C7"
	add_child(fore_node)

	# Suelo entarimado perfilado al casco para los camarotes de proa (C6 y C7) con colisión física
	_build_contoured_cabin_floor(fore_node, "Floor_ForeCabins", WreckStructure.BOW_DECK_START, WreckStructure.BOW_X, false)

	var beam_fore = WreckStructure.get_beam_at(13.5) + 0.18

	# Mamparo divisorio frontal cerrado con umbrales despejados para escaleras (z = ±3.5)
	# 1. Mamparo babor Proa (C6): costado exterior, cierre bajo escalera (z = -3.5) y jamba hacia puerta C6
	var front_c6 = Node3D.new()
	front_c6.name = "Bulkhead_Front_C6"
	fore_node.add_child(front_c6)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -beam_fore), Vector3(13.5, 0, -4.35), 2.95, "Bulkhead_C6_Outboard")
	PbrMaterialKit.add_occluder_box(front_c6, "Occ_FrontC6", Vector3(0.24, 2.7, maxf(1.0, beam_fore - 4.35)), WreckStructure.get_world_pos(13.5, 1.4, -(beam_fore + 4.35) * 0.5))
	# Cierre inferior bajo escalera proa babor (y <= 2.50m; deja paso libre a cubierta C2 a y = 3.0m)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -4.35), Vector3(13.5, 0, -2.65), 2.50, "UnderStair_Fore_Port", false)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -2.65), Vector3(13.5, 0, -2.35), 2.95, "Wall_Fore_PortStairToDoor")

	# 2. Mamparo intermedio central entre vanos de puerta C6 y C7
	var front_fore_mid = Node3D.new()
	front_fore_mid.name = "Bulkhead_Front_Fore_Mid"
	fore_node.add_child(front_fore_mid)
	build_bulkhead_wall(front_fore_mid, Vector3(13.5, 0, -1.25), Vector3(13.5, 0, 1.25), 2.95, "Bulkhead_Front_Fore_Mid_Mesh")
	PbrMaterialKit.add_occluder_box(front_fore_mid, "Occ_FrontForeMid", Vector3(0.24, 2.7, 2.4), WreckStructure.get_world_pos(13.5, 1.4, 0.0))

	# 3. Mamparo estribor Proa (C7): tramo junto a puerta C7, cierre bajo escalera y costado exterior
	var front_c7 = Node3D.new()
	front_c7.name = "Bulkhead_Front_C7"
	fore_node.add_child(front_c7)
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 2.35), Vector3(13.5, 0, 2.65), 2.95, "Wall_Fore_StbdDoorToStair")
	# Cierre inferior bajo escalera proa estribor (y <= 2.50m)
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 2.65), Vector3(13.5, 0, 4.35), 2.50, "UnderStair_Fore_Stbd", false)
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 4.35), Vector3(13.5, 0, beam_fore), 2.95, "Bulkhead_C7_Outboard")
	PbrMaterialKit.add_occluder_box(front_c7, "Occ_FrontC7", Vector3(0.24, 2.7, maxf(1.0, beam_fore - 4.35)), WreckStructure.get_world_pos(13.5, 1.4, (beam_fore + 4.35) * 0.5))

	# Mamparo longitudinal central completo hasta la roda de proa (x = 13.5..30.75) sin huecos
	var spine_fore = Node3D.new()
	spine_fore.name = "Bulkhead_Spine_Fore"
	fore_node.add_child(spine_fore)
	build_bulkhead_wall(spine_fore, Vector3(13.5, 0, 0), Vector3(WreckStructure.BOW_X, 0, 0), 3.0, "Bulkhead_Spine_Fore_Mesh")
	PbrMaterialKit.add_occluder_box(spine_fore, "Occ_SpineFore", Vector3(16.5, 2.7, 0.24), WreckStructure.get_world_pos(22.0, 1.4, 0.0))

	# Forros interiores curvos de proa (babor C6 visible, estribor C7 recortable)
	_build_hull_interior_lining(fore_node, "HullInner_Fore_Port", 13.5, WreckStructure.BOW_X, 0.0, 3.05, -1.0, 0.96, 0.98)
	_build_hull_interior_lining(fore_node, "HullInner_Fore_Front", 13.5, WreckStructure.BOW_X, 0.0, 3.05, 1.0, 0.96, 0.98)
	var forepeak_b := WreckStructure.get_beam_at(27.2) + 0.15
	build_bulkhead_wall(fore_node, Vector3(27.2, 0, -forepeak_b), Vector3(27.2, 0, 0.0), 3.0, "BowForepeakWall_Fore")
	var fp_stbd := Node3D.new()
	fp_stbd.name = "BowForepeakWall_Stbd"
	fore_node.add_child(fp_stbd)
	build_bulkhead_wall(fp_stbd, Vector3(27.2, 0, 0.0), Vector3(27.2, 0, forepeak_b), 3.0, "BowForepeakWall_Stbd_Mesh")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 6: CAMAROTE DE TRIPULACIÓN (C6, z < 0)
	# --------------------------------------------------------------------------
	# 6 Literas marineras empotradas (c6-bunk-01 a c6-bunk-06)
	var bunk_x_coords = [16.0, 18.5, 21.0]
	for bx in bunk_x_coords:
		var bunk = Node3D.new()
		bunk.name = "Bunk_%d" % int(bx)
		bunk.position = WreckStructure.get_world_pos(bx, 0.0, -4.5)
		fore_node.add_child(bunk)

		# 4 postes de roble estructurales que soportan ambas literas
		for px in [-0.98, 0.98]:
			for pz in [-0.42, 0.42]:
				var post = MeshInstance3D.new()
				var p_box = BoxMesh.new()
				p_box.size = Vector3(0.09, 1.55, 0.09)
				post.mesh = p_box
				post.material_override = mat_furniture
				post.position = Vector3(px, 0.775, pz)
				bunk.add_child(post)

		# Litera inferior y superior
		for tier_y in [0.25, 1.35]:
			var frame = MeshInstance3D.new()
			var fr_box = BoxMesh.new()
			fr_box.size = Vector3(2.1, 0.15, 0.95)
			frame.mesh = fr_box
			frame.material_override = mat_furniture
			frame.position = Vector3(0, tier_y, 0)
			bunk.add_child(frame)

			var straw = MeshInstance3D.new()
			var st_box = BoxMesh.new()
			st_box.size = Vector3(1.95, 0.12, 0.82)
			straw.mesh = st_box
			straw.material_override = mat_bedding
			straw.position = Vector3(0, tier_y + 0.12, 0)
			bunk.add_child(straw)

			var guard = MeshInstance3D.new()
			var gd_box = BoxMesh.new()
			gd_box.size = Vector3(1.92, 0.14, 0.05)
			guard.mesh = gd_box
			guard.material_override = mat_furniture
			guard.position = Vector3(0, tier_y + 0.15, 0.44)
			bunk.add_child(guard)

		PbrMaterialKit.add_box_collider(bunk, "Col_Bunk_" + str(bx), Vector3(2.15, 1.65, 0.98), Vector3(0, 0.82, 0))

		var bunk_shadow = PbrMaterialKit.create_blob_shadow(1.8, 0.9, 0.6)
		bunk_shadow.position = Vector3(0, 0.02, 0)
		bunk.add_child(bunk_shadow)

		PbrMaterialKit.add_box_collider(bunk, "Col_Bunk_" + str(bx), Vector3(2.15, 1.65, 1.02), Vector3(0, 0.82, 0))

		if bx == 18.5:
			var prop_bunk = InteractiveProp.new()
			prop_bunk.name = "PropBunkC6"
			prop_bunk.prop_id = "c6_bunks"
			prop_bunk.prompt_text = "Registrar Literas Marineras"
			prop_bunk.inspection_message = "Paja mohosa y maderas carcomidas. En un madero hay tallada una plegaria a Selûne."
			prop_bunk.interaction_radius = 2.4
			bunk.add_child(prop_bunk)

	# Tablón del alijo con trampa de aguja oculta (c6-trapped-stash, 200 po)
	var stash_node = Node3D.new()
	stash_node.name = "TrappedStash_C6"
	stash_node.position = WreckStructure.get_world_pos(17.5, 0.03, -2.5)
	fore_node.add_child(stash_node)

	var stash_plank = MeshInstance3D.new()
	var sp_box = BoxMesh.new()
	sp_box.size = Vector3(0.9, 0.04, 0.45)
	stash_plank.mesh = sp_box
	stash_plank.material_override = PbrMaterialKit.create_wood_planks_pbr("#584632", 0.6)
	stash_node.add_child(stash_plank)

	var stash_shadow = PbrMaterialKit.create_blob_shadow(0.8, 0.5, 0.55)
	stash_shadow.position = Vector3(0, -0.01, 0)
	stash_node.add_child(stash_shadow)

	var prop_trap = InteractiveProp.new()
	prop_trap.name = "PropTrapC6"
	prop_trap.prop_id = "c6_needle_trap"
	prop_trap.prompt_text = "Desarmar Trampa de Aguja del Alijo"
	prop_trap.inspection_message = "¡Desarmas el resorte con cuidado! El alijo contiene 200 piezas de oro seguras."
	prop_trap.interaction_radius = 2.0
	stash_node.add_child(prop_trap)

	# Baúles marineros a escala táctica real
	var crew_chest_pos = WreckStructure.get_world_pos(19.8, 0.0, -2.5)
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		var c_crew = chest_res.instantiate()
		c_crew.position = crew_chest_pos + Vector3(0, 0.085, 0)
		c_crew.rotation.y = 0.6
		c_crew.scale = Vector3(0.65, 0.65, 0.65)
		PbrMaterialKit.apply_kenney_material(c_crew)
		fore_node.add_child(c_crew)
		PbrMaterialKit.add_box_collider(fore_node, "Col_CrewChestC6", Vector3(0.82, 0.68, 0.60), crew_chest_pos + Vector3(0, 0.34, 0))

	var c_crew_shadow = PbrMaterialKit.create_blob_shadow(0.6, 0.5, 0.55)
	c_crew_shadow.position = crew_chest_pos + Vector3(0, 0.02, 0)
	fore_node.add_child(c_crew_shadow)

	# Faroles despejados del pasillo central de C6 (sin colisionar con literas)
	build_wall_lantern(fore_node, Vector3(16.5, 2.05, -2.8), "Lantern_C6_Crew_A")
	build_wall_lantern(fore_node, Vector3(20.5, 2.05, -2.8), "Lantern_C6_Crew_B")

	var c6_fill = OmniLight3D.new()
	c6_fill.name = "C6_InteriorFill"
	c6_fill.position = Vector3(18.5, 2.0, -2.5)
	c6_fill.light_color = Color("#ffe2b8")
	c6_fill.light_energy = 3.0
	c6_fill.omni_range = 12.0
	c6_fill.omni_attenuation = 1.0
	c6_fill.shadow_enabled = false
	fore_node.add_child(c6_fill)

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 7: COMEDOR DE PROA (C7 - MESS HALL, z > 0)
	# --------------------------------------------------------------------------
	# 1. Mesa alargada de comedor fracturada en dos mitades + vajilla de peltre y diario
	var table_node = Node3D.new()
	table_node.name = "MessTable_C7"
	table_node.position = Vector3(17.5, 0.0, 4.0)
	fore_node.add_child(table_node)

	var half_l = MeshInstance3D.new()
	var hl_box = BoxMesh.new()
	hl_box.size = Vector3(1.78, 0.11, 1.08)
	half_l.mesh = hl_box
	half_l.material_override = mat_furniture
	half_l.position = Vector3(-0.92, 0.78, -0.02)
	half_l.rotation_degrees = Vector3(2.0, 1.5, -3.5)
	table_node.add_child(half_l)

	var half_r = MeshInstance3D.new()
	var hr_box = BoxMesh.new()
	hr_box.size = Vector3(1.74, 0.11, 1.08)
	half_r.mesh = hr_box
	half_r.material_override = mat_furniture
	half_r.position = Vector3(0.90, 0.75, 0.06)
	half_r.rotation_degrees = Vector3(-1.5, -2.5, 4.5)
	table_node.add_child(half_r)

	# Patas de caballete y travesaño inferior
	for tx in [-1.4, 1.4]:
		var leg = MeshInstance3D.new()
		var leg_box = BoxMesh.new()
		leg_box.size = Vector3(0.14, 0.76, 0.85)
		leg.mesh = leg_box
		leg.material_override = mat_furniture
		leg.position = Vector3(tx, 0.38, 0)
		table_node.add_child(leg)

	var stretcher = MeshInstance3D.new()
	var str_box = BoxMesh.new()
	str_box.size = Vector3(2.8, 0.09, 0.12)
	stretcher.mesh = str_box
	stretcher.material_override = mat_furniture
	stretcher.position = Vector3(0, 0.22, 0)
	table_node.add_child(stretcher)

	# Vajilla de peltre (platos + jarras) y diario encuadernado sobre la mesa
	var mat_pewter := PbrMaterialKit.create_iron_pbr("#4c5152", 0.48, 0.72)
	for px in [-1.15, -0.35, 1.05]:
		var plate = MeshInstance3D.new()
		var pl_cyl = CylinderMesh.new()
		pl_cyl.top_radius = 0.16; pl_cyl.bottom_radius = 0.12; pl_cyl.height = 0.03
		plate.mesh = pl_cyl
		plate.material_override = mat_pewter
		plate.position = Vector3(px, 0.85, -0.18 if px < 0 else 0.15)
		table_node.add_child(plate)

	for mx in [-0.75, 0.65]:
		var mug = MeshInstance3D.new()
		var mg_cyl = CylinderMesh.new()
		mg_cyl.top_radius = 0.065; mg_cyl.bottom_radius = 0.08; mg_cyl.height = 0.16
		mug.mesh = mg_cyl
		mug.material_override = mat_pewter
		mug.position = Vector3(mx, 0.91, 0.24)
		table_node.add_child(mug)

	var logbook = MeshInstance3D.new()
	var lb_box = BoxMesh.new()
	lb_box.size = Vector3(0.38, 0.06, 0.28)
	logbook.mesh = lb_box
	logbook.material_override = PbrMaterialKit.create_oak_furniture_pbr("#6b2d22")
	logbook.position = Vector3(0.45, 0.84, -0.05)
	logbook.rotation_degrees.y = 18.0
	table_node.add_child(logbook)

	PbrMaterialKit.add_box_collider(table_node, "Col_MessTable", Vector3(3.62, 0.90, 1.12), Vector3(0, 0.45, 0))

	var table_shadow = PbrMaterialKit.create_blob_shadow(2.2, 1.0, 0.65)
	table_shadow.position = Vector3(0, 0.02, 0)
	table_node.add_child(table_shadow)

	var prop_log = InteractiveProp.new()
	prop_log.name = "PropLogC7"
	prop_log.prop_id = "c7_logbook"
	prop_log.prompt_text = "Examinar Restos del Diario de a Bordo"
	prop_log.inspection_message = "«...el dragón cayó envuelto en llamas sobre el arrecife y nuestro casco crujió...»"
	prop_log.interaction_radius = 2.4
	table_node.add_child(prop_log)

	var prop_plates = InteractiveProp.new()
	prop_plates.name = "PropPlatesC7"
	prop_plates.prop_id = "c7_tableware"
	prop_plates.prompt_text = "Examinar Vajilla de Peltre"
	prop_plates.inspection_message = "Jarras y fuentes de peltre abolladas por el violento encallamiento."
	prop_plates.interaction_radius = 2.2
	table_node.add_child(prop_plates)

	# 2. Bancos de madera corridos con soportes y colisionador
	var bench1 = MeshInstance3D.new()
	var b_box = BoxMesh.new()
	b_box.size = Vector3(3.2, 0.09, 0.36)
	bench1.mesh = b_box
	bench1.material_override = mat_furniture
	bench1.position = Vector3(17.5, 0.40, 2.8)
	fore_node.add_child(bench1)
	for lx in [-1.25, 1.25]:
		var bl = MeshInstance3D.new()
		var bl_box = BoxMesh.new()
		bl_box.size = Vector3(0.12, 0.40, 0.32)
		bl.mesh = bl_box
		bl.material_override = mat_furniture
		bl.position = Vector3(17.5 + lx, 0.20, 2.8)
		fore_node.add_child(bl)
	PbrMaterialKit.add_box_collider(fore_node, "Col_Bench1", Vector3(3.2, 0.48, 0.38), Vector3(17.5, 0.24, 2.8))

	var b1_sh = PbrMaterialKit.create_blob_shadow(1.9, 0.45, 0.58)
	b1_sh.position = Vector3(17.5, 0.02, 2.8)
	fore_node.add_child(b1_sh)

	# Banco volcado atravesado con colisionador
	var bench2 = MeshInstance3D.new()
	bench2.mesh = b_box
	bench2.material_override = mat_furniture
	bench2.position = Vector3(17.5, 0.2, 5.3)
	bench2.rotation_degrees = Vector3(72, 15, -10)
	fore_node.add_child(bench2)
	PbrMaterialKit.add_box_collider(fore_node, "Col_Bench2", Vector3(3.1, 0.48, 0.45), Vector3(17.5, 0.22, 5.3))

	var b2_sh = PbrMaterialKit.create_blob_shadow(1.8, 0.6, 0.55)
	b2_sh.position = Vector3(17.5, 0.02, 5.3)
	fore_node.add_child(b2_sh)

	build_wall_lantern(fore_node, Vector3(17.0, 2.0, 3.5), "Lantern_C7_Mess")

# ==============================================================================
# ZONA 8: CUBIERTA BAJA INUNDADA (C8, -3.50m babor a -3.20m estribor; agua a -3.05m)
# ==============================================================================
func build_lower_deck_c8() -> void:
	var c8_node = Node3D.new()
	c8_node.name = "LowerDeck_C8"
	add_child(c8_node)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_floor_cabin)

	var cuts: Array[float] = []
	var cur := -29.0
	while cur < 26.5 - 0.001:
		cuts.append(cur)
		cur += 1.5
	cuts.append(26.5)
	for hx in [-18.3, -16.7, 12.75, 18.75]:
		if not cuts.has(hx):
			cuts.append(hx)
	cuts.sort()

	for i in range(cuts.size() - 1):
		var x0 := cuts[i]
		var x1 := cuts[i + 1]
		if x1 - x0 < 0.01:
			continue
		var b0 := WreckStructure.get_beam_at(x0) * 0.88
		var b1 := WreckStructure.get_beam_at(x1) * 0.88
		var in_p13 := (x0 >= -18.31 and x1 <= -16.69)
		var in_c9_stair := (x0 >= 12.74 and x1 <= 18.76)

		var strips: Array = [[-b0, b0, -b1, b1]]
		if in_p13:
			strips = [[-b0, -4.0, -b1, -4.0], [-2.4, b0, -2.4, b1]]
		elif in_c9_stair:
			strips = [[-b0, 1.35, -b1, 1.35], [3.15, b0, 3.15, b1]]

		for s in strips:
			var y0_a := lerpf(-3.50, -3.20, clampf((s[0] + b0) / maxf(0.1, 2.0 * b0), 0.0, 1.0))
			var y0_b := lerpf(-3.50, -3.20, clampf((s[1] + b0) / maxf(0.1, 2.0 * b0), 0.0, 1.0))
			var y1_a := lerpf(-3.50, -3.20, clampf((s[2] + b1) / maxf(0.1, 2.0 * b1), 0.0, 1.0))
			var y1_b := lerpf(-3.50, -3.20, clampf((s[3] + b1) / maxf(0.1, 2.0 * b1), 0.0, 1.0))

			var p0 = WreckStructure.get_world_pos(x0, y0_a, s[0])
			var p1 = WreckStructure.get_world_pos(x1, y1_a, s[2])
			var p2 = WreckStructure.get_world_pos(x1, y1_b, s[3])
			var p3 = WreckStructure.get_world_pos(x0, y0_b, s[1])

			st.set_uv(Vector2(x0 / 3.0, s[0] / 3.0)); st.add_vertex(p0)
			st.set_uv(Vector2(x1 / 3.0, s[2] / 3.0)); st.add_vertex(p1)
			st.set_uv(Vector2(x1 / 3.0, s[3] / 3.0)); st.add_vertex(p2)
			st.set_uv(Vector2(x0 / 3.0, s[0] / 3.0)); st.add_vertex(p0)
			st.set_uv(Vector2(x1 / 3.0, s[3] / 3.0)); st.add_vertex(p2)
			st.set_uv(Vector2(x0 / 3.0, s[1] / 3.0)); st.add_vertex(p3)

	st.generate_normals()
	st.generate_tangents()
	var c8_mesh_inst = MeshInstance3D.new()
	c8_mesh_inst.name = "Deck_C8"
	c8_mesh_inst.mesh = st.commit()
	c8_node.add_child(c8_mesh_inst)
	c8_mesh_inst.create_trimesh_collision()
	ShipGeometry.slab_shell(c8_mesh_inst, mat_furniture, 0.20)

	# Escalera física descendente C8 -> Bodega Sumergida C9 (x: 12.75..18.75, z = 2.25)
	HullBuilder.build_physical_stair_flight(c8_node, "Stairs_C8_C9", 12.75, 18.75, -3.28, -6.40, 2.25, 0.72, 16, mat_floor_cabin, mat_furniture)

	# Forros interiores húmedos de C8 (babor visible, estribor recortable en vista interior baja)
	_build_hull_interior_lining(c8_node, "HullInner_C8_Port", -29.0, 26.5, -3.55, 0.05, -1.0, 0.88, 0.96)
	_build_hull_interior_lining(c8_node, "HullInner_C8_Front", -29.0, 26.5, -3.55, 0.05, 1.0, 0.88, 0.96)

	# Brazola rota del pozo vertical P13 también en cubierta C8 + puntales y vigas maestras
	build_hole_rim(c8_node, WreckStructure.get_world_pos(-17.5, -3.35, -3.2), 0.82)
	c8_node.get_child(c8_node.get_child_count() - 1).name = "BreachP13Coaming_C8"
	_build_stanchions_and_beams(c8_node, "HullLowerStanchions_C8", [-11.5, -5.5, 1.5, 8.5], [-2.8, 2.6], -3.45, -0.15)

	# Lámina de agua inundada canónica al nivel del mar (-3.05m -> 45cm babor / 15cm estribor)
	_build_contoured_water_plane(c8_node, "C8_FloodWater", -29.0, 26.5, WreckStructure.SEA_HEIGHT, 0.89, mat_flood_water)

	# Luz de destello verde-azulada del agua en C8
	var c8_light = OmniLight3D.new()
	c8_light.name = "C8_WaterGlimmer"
	c8_light.position = Vector3(-1.5, -2.0, 2.0)
	c8_light.light_color = Color("#78d2c3")
	c8_light.light_energy = 2.6
	c8_light.omni_range = 18.0
	c8_light.omni_attenuation = 1.2
	c8_node.add_child(c8_light)

	# Cajas y barriles flotantes de C8 con colisionadores físicos
	var crate_res = load("res://assets/models/crate.glb")
	var barrel_res = load("res://assets/models/barrel.glb")

	var floating_crates = [
		Vector3(-20.0, -3.06, -4.5),
		Vector3(-16.0, -3.06, 4.0),
		Vector3(18.0, -3.06, 3.8)
	]
	for idx_fc in range(floating_crates.size()):
		var fcp: Vector3 = floating_crates[idx_fc]
		if crate_res:
			var fc = crate_res.instantiate()
			fc.position = fcp
			fc.rotation_degrees = Vector3(randf_range(-8, 8), randf_range(0, 360), randf_range(-8, 8))
			fc.scale = Vector3(0.88, 0.88, 0.88)
			PbrMaterialKit.apply_kenney_material(fc)
			c8_node.add_child(fc)
			PbrMaterialKit.add_box_collider(c8_node, "Col_C8Crate_%d" % idx_fc, Vector3(0.88, 0.95, 0.88), fcp + Vector3(0, 0.42, 0))
		var fc_sh = PbrMaterialKit.create_blob_shadow(0.85, 0.85, 0.55)
		fc_sh.position = Vector3(fcp.x, -3.08, fcp.z)
		c8_node.add_child(fc_sh)

	var floating_barrels = [
		Vector3(-24.0, -3.06, -3.5),
		Vector3(-21.0, -3.06, 4.5),
		Vector3(2.0, -3.06, -4.0),
		Vector3(21.0, -3.06, -2.5)
	]
	for idx_fb in range(floating_barrels.size()):
		var fbp: Vector3 = floating_barrels[idx_fb]
		if barrel_res:
			var fb = barrel_res.instantiate()
			fb.position = fbp
			fb.rotation_degrees = Vector3(randf_range(15, 35), randf_range(0, 360), randf_range(-10, 10))
			fb.scale = Vector3(0.82, 0.82, 0.82)
			PbrMaterialKit.apply_kenney_material(fb)
			c8_node.add_child(fb)
			PbrMaterialKit.add_cyl_collider(c8_node, "Col_C8Barrel_%d" % idx_fb, 0.42, 0.92, fbp + Vector3(0, 0.42, 0))
		var fb_sh = PbrMaterialKit.create_blob_shadow(0.7, 0.7, 0.52)
		fb_sh.position = Vector3(fbp.x, -3.08, fbp.z)
		c8_node.add_child(fb_sh)

	var prop_bilge = InteractiveProp.new()
	prop_bilge.name = "PropBilgeWater"
	prop_bilge.prop_id = "c8_bilge"
	prop_bilge.prompt_text = "Vadear Aguas Turbias de la Sentina"
	prop_bilge.inspection_message = "El agua salobre te llega a las rodillas. Pequeños cangrejos y carroñeros marinos huyen entre las cuadernas."
	prop_bilge.position = Vector3(-6.0, -3.1, 0.0)
	prop_bilge.interaction_radius = 4.0
	c8_node.add_child(prop_bilge)

# ==============================================================================
# ZONA 9: BODEGA SUMERGIDA (C9, -6.4m)
# ==============================================================================
func build_hold_c9() -> void:
	var c9_node = Node3D.new()
	c9_node.name = "SubmergedHold_C9"
	add_child(c9_node)

	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bulkhead)

	var step_x = 1.5
	var x = WreckStructure.STERN_X
	var x_max_c9 = 27.5
	while x < x_max_c9 - 0.001:
		var nx = minf(x_max_c9, x + step_x)
		var b0 = WreckStructure.get_beam_at(x) * 0.82
		var b1 = WreckStructure.get_beam_at(nx) * 0.82

		var p0 = WreckStructure.get_world_pos(x, -6.4, -b0)
		var p1 = WreckStructure.get_world_pos(nx, -6.4, -b1)
		var p2 = WreckStructure.get_world_pos(nx, -6.4, b1)
		var p3 = WreckStructure.get_world_pos(x, -6.4, b0)

		ShipGeometry.quad(st, p0, p1, p2, p3)
		x += step_x

	st.generate_normals()
	var c9_mesh_inst = MeshInstance3D.new()
	c9_mesh_inst.name = "Deck_C9"
	c9_mesh_inst.mesh = st.commit()
	c9_node.add_child(c9_mesh_inst)
	c9_mesh_inst.create_trimesh_collision()
	ShipGeometry.slab_shell(c9_mesh_inst, mat_furniture, 0.22)

	# Base de colisión física sólida bajo toda la cubierta de C9 para garantizar que nada pueda caer al vacío
	var c9_col_body := StaticBody3D.new()
	c9_col_body.name = "Deck_C9_SolidFloorCol"
	var cx := WreckStructure.STERN_X
	while cx < x_max_c9 - 0.001:
		var ncx := minf(x_max_c9, cx + 2.5)
		var mid_x := (cx + ncx) * 0.5
		var seg_len := ncx - cx
		var b_mid := WreckStructure.get_beam_at(mid_x) * 0.85
		var cs := CollisionShape3D.new()
		var bx := BoxShape3D.new()
		bx.size = Vector3(seg_len + 0.15, 0.85, b_mid * 2.0 + 0.5)
		cs.shape = bx
		cs.position = WreckStructure.get_world_pos(mid_x, -6.80, 0.0)
		c9_col_body.add_child(cs)
		cx += 2.5
	c9_node.add_child(c9_col_body)

	# Mamparo proel de cierre para C9 (+27.5m)
	var b_bow_c9 := WreckStructure.get_beam_at(27.5) * 0.82
	build_bulkhead_wall(c9_node, Vector3(27.5, -6.4, -b_bow_c9), Vector3(27.5, -6.4, b_bow_c9), 3.2, "Bulkhead_C9_BowWall")

	# Mamparo popel de cierre para C9 (STERN_X = -30.75m) a ambos lados de la brecha submarina P16
	var b_stern_c9 := WreckStructure.get_beam_at(WreckStructure.STERN_X) * 0.82
	build_bulkhead_wall(c9_node, Vector3(WreckStructure.STERN_X, -6.4, -b_stern_c9), Vector3(WreckStructure.STERN_X, -6.4, -1.45), 3.2, "Bulkhead_C9_SternPort")
	build_bulkhead_wall(c9_node, Vector3(WreckStructure.STERN_X, -6.4, 1.45), Vector3(WreckStructure.STERN_X, -6.4, b_stern_c9), 3.2, "Bulkhead_C9_SternFront")
	# Umbral y rampa continua en la brecha submarina P16 para conectar con el lecho marino
	PbrMaterialKit.add_box_collider(c9_node, "Col_C9_BreachFloor", Vector3(1.8, 0.85, 3.2), WreckStructure.get_world_pos(WreckStructure.STERN_X - 0.6, -6.80, 0.0))

	# 1. Cofre de hierro sumergido en el limo (c9-iron-chest) con colisionador
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		var c_inst = chest_res.instantiate()
		c_inst.position = Vector3(-19.5, -6.32, -3.2)
		c_inst.rotation_degrees = Vector3(6, -22, -4)
		c_inst.scale = Vector3(0.75, 0.75, 0.75)
		PbrMaterialKit.apply_kenney_material(c_inst)
		c9_node.add_child(c_inst)
		PbrMaterialKit.add_box_collider(c9_node, "Col_C9IronChest", Vector3(0.92, 0.75, 0.68), Vector3(-19.5, -6.02, -3.2))

	var c9_chest_sh = PbrMaterialKit.create_blob_shadow(0.75, 0.6, 0.65)
	c9_chest_sh.position = Vector3(-19.5, -6.38, -3.2)
	c9_node.add_child(c9_chest_sh)

	# 2. Piedras de lastre volcánicas con colisionadores
	var rocks_c = load("res://assets/models/rocks-c.glb")
	if rocks_c:
		for rx in [-15.0, -10.0, 5.0, 12.0]:
			var r_inst = rocks_c.instantiate()
			r_inst.position = Vector3(rx, -6.38, 0.0)
			r_inst.scale = Vector3(1.1, 0.72, 1.1)
			_apply_rock_mat(r_inst)
			c9_node.add_child(r_inst)
			PbrMaterialKit.add_cyl_collider(c9_node, "Col_C9Rock_%d" % int(rx), 0.75, 1.0, Vector3(rx, -5.9, 0.0))

	# 2b. Volumen y atmósfera submarina canónica de Bodega C9 (completamente sumergida bajo -3.05m)
	_build_hull_interior_lining(c9_node, "HullInner_C9_Port", WreckStructure.STERN_X, 27.5, -6.45, -3.35, -1.0, 0.72, 0.88)
	_build_hull_interior_lining(c9_node, "HullInner_C9_Front", WreckStructure.STERN_X, 27.5, -6.45, -3.35, 1.0, 0.72, 0.88)
	_build_contoured_water_plane(c9_node, "C9_WaterSurface", WreckStructure.STERN_X, 27.5, WreckStructure.SEA_HEIGHT, 0.84, mat_hold_water)
	_build_contoured_water_plane(c9_node, "C9_CausticsOverlay", WreckStructure.STERN_X, 27.5, -6.34, 0.70, mat_caustics)

	# Escalera inferior física en C9 para subir de vuelta a C8 sin teletransporte
	HullBuilder.build_physical_stair_flight(c9_node, "Stairs_C9_ExitRamp", 12.75, 18.75, -3.28, -6.40, 2.25, 0.72, 16, mat_floor_cabin, mat_furniture)
	_build_stanchions_and_beams(c9_node, "HullHoldStanchions_C9", [-23.0, -13.0, -5.5, 3.0, 9.5], [-2.0, 1.8], -6.42, -3.42)

	var breach_glow = OmniLight3D.new()
	breach_glow.name = "C9_SternBreachGlow"
	breach_glow.position = Vector3(-28.0, -4.6, 0.5)
	breach_glow.light_color = Color("#5fd3ea")
	breach_glow.light_energy = 3.6
	breach_glow.omni_range = 16.0
	c9_node.add_child(breach_glow)

	# 3. Luz de profundidad submarina (Depth Glimmer)
	var depth_light = OmniLight3D.new()
	depth_light.name = "C9_DepthGlimmer"
	depth_light.position = Vector3(-18.5, -5.0, -3.2)
	depth_light.light_color = Color("#4fd6db")
	depth_light.light_energy = 3.8
	depth_light.omni_range = 16.0
	depth_light.omni_attenuation = 1.0
	c9_node.add_child(depth_light)

	var ambient_hold = OmniLight3D.new()
	ambient_hold.name = "C9_HoldAmbient"
	ambient_hold.position = Vector3(-14.0, -4.8, 0.0)
	ambient_hold.light_color = Color("#3aa8c1")
	ambient_hold.light_energy = 2.5
	ambient_hold.omni_range = 20.0
	ambient_hold.omni_attenuation = 1.1
	c9_node.add_child(ambient_hold)

	var prop_dragon_ribs = InteractiveProp.new()
	prop_dragon_ribs.name = "PropDragonRibs"
	prop_dragon_ribs.prop_id = "c9_dragon_ribs"
	prop_dragon_ribs.prompt_text = "Tocar Costillas Fosilizadas Sumergidas"
	prop_dragon_ribs.inspection_message = "El hueso fósil de dragón resuena con un zumbido arcano helado bajo el agua marina."
	prop_dragon_ribs.position = Vector3(-17.0, -6.0, 0.0)
	prop_dragon_ribs.interaction_radius = 4.0
	c9_node.add_child(prop_dragon_ribs)

# ==============================================================================
# HELPERS CONSTRUCTIVOS
# ==============================================================================
func _build_contoured_cabin_floor(parent: Node3D, floor_name: String, x_start: float, x_end: float, has_p13_hole: bool = false) -> void:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_floor_cabin)

	var cuts: Array[float] = []
	var cur = x_start
	while cur < x_end - 0.001:
		cuts.append(cur)
		cur += 1.5
	cuts.append(x_end)
	if has_p13_hole:
		for hx in [-18.3, -16.7]:
			if hx > x_start + 0.01 and hx < x_end - 0.01 and not cuts.has(hx):
				cuts.append(hx)
	cuts.sort()

	for i in range(cuts.size() - 1):
		var x0 = cuts[i]
		var x1 = cuts[i + 1]
		if x1 - x0 < 0.01:
			continue
		var b0 = WreckStructure.get_beam_at(x0) - 0.12
		var b1 = WreckStructure.get_beam_at(x1) - 0.12
		var in_p13_x = has_p13_hole and x0 >= -18.31 and x1 <= -16.69
		var strips = [[-b0, -4.0, -b1, -4.0], [-2.4, b0, -2.4, b1]] if in_p13_x else [[-b0, b0, -b1, b1]]

		for s in strips:
			var p0 = WreckStructure.get_world_pos(x0, 0.0, s[0])
			var p1 = WreckStructure.get_world_pos(x1, 0.0, s[2])
			var p2 = WreckStructure.get_world_pos(x1, 0.0, s[3])
			var p3 = WreckStructure.get_world_pos(x0, 0.0, s[1])
			st.set_uv(Vector2(x0 / 3.0, s[0] / 3.0)); st.add_vertex(p0)
			st.set_uv(Vector2(x1 / 3.0, s[2] / 3.0)); st.add_vertex(p1)
			st.set_uv(Vector2(x1 / 3.0, s[3] / 3.0)); st.add_vertex(p2)
			st.set_uv(Vector2(x0 / 3.0, s[0] / 3.0)); st.add_vertex(p0)
			st.set_uv(Vector2(x1 / 3.0, s[3] / 3.0)); st.add_vertex(p2)
			st.set_uv(Vector2(x0 / 3.0, s[1] / 3.0)); st.add_vertex(p3)

	st.generate_normals()
	st.generate_tangents()
	var mesh_inst = MeshInstance3D.new()
	mesh_inst.name = floor_name
	mesh_inst.mesh = st.commit()
	parent.add_child(mesh_inst)
	mesh_inst.create_trimesh_collision()
	ShipGeometry.slab_shell(mesh_inst, mat_furniture, 0.18)

func build_bulkhead_wall(parent: Node3D, a: Vector3, b: Vector3, height: float, wall_name: String = "BulkheadWall", with_collider: bool = true) -> MeshInstance3D:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bulkhead)

	var span := b - a
	var wall_dir := Vector3(span.x, 0.0, span.z).normalized()
	if wall_dir.length_squared() < 0.001:
		wall_dir = Vector3.RIGHT
	var half_thick := Vector3(-wall_dir.z, 0.0, wall_dir.x) * 0.07

	var p0_f = WreckStructure.get_world_pos(a.x + half_thick.x, a.y, a.z + half_thick.z)
	var p1_f = WreckStructure.get_world_pos(b.x + half_thick.x, b.y, b.z + half_thick.z)
	var p2_f = WreckStructure.get_world_pos(b.x + half_thick.x, b.y + height, b.z + half_thick.z)
	var p3_f = WreckStructure.get_world_pos(a.x + half_thick.x, a.y + height, a.z + half_thick.z)

	var p0_b = WreckStructure.get_world_pos(a.x - half_thick.x, a.y, a.z - half_thick.z)
	var p1_b = WreckStructure.get_world_pos(b.x - half_thick.x, b.y, b.z - half_thick.z)
	var p2_b = WreckStructure.get_world_pos(b.x - half_thick.x, b.y + height, b.z - half_thick.z)
	var p3_b = WreckStructure.get_world_pos(a.x - half_thick.x, a.y + height, a.z - half_thick.z)

	var wall_u := maxf(1.0, a.distance_to(b)) / 2.2
	var wall_v := height / 2.2

	# Cara +normal
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0_f)
	st.set_uv(Vector2(wall_u, 0.0)); st.add_vertex(p1_f)
	st.set_uv(Vector2(wall_u, wall_v)); st.add_vertex(p2_f)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p0_f)
	st.set_uv(Vector2(wall_u, wall_v)); st.add_vertex(p2_f)
	st.set_uv(Vector2(0.0, wall_v)); st.add_vertex(p3_f)

	# Cara -normal (invertida correctamente sin z-fighting)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p1_b)
	st.set_uv(Vector2(wall_u, 0.0)); st.add_vertex(p0_b)
	st.set_uv(Vector2(wall_u, wall_v)); st.add_vertex(p3_b)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p1_b)
	st.set_uv(Vector2(wall_u, wall_v)); st.add_vertex(p3_b)
	st.set_uv(Vector2(0.0, wall_v)); st.add_vertex(p2_b)

	# Remate superior del mamparo
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p3_f)
	st.set_uv(Vector2(wall_u, 0.0)); st.add_vertex(p2_f)
	st.set_uv(Vector2(wall_u, 0.2)); st.add_vertex(p2_b)
	st.set_uv(Vector2(0.0, 0.0)); st.add_vertex(p3_f)
	st.set_uv(Vector2(wall_u, 0.2)); st.add_vertex(p2_b)
	st.set_uv(Vector2(0.0, 0.2)); st.add_vertex(p3_b)

	# Close both exposed end grains and bottom; the original door apertures stay open.
	ShipGeometry.quad(st, p0_b, p0_f, p3_f, p3_b)
	ShipGeometry.quad(st, p1_f, p1_b, p2_b, p2_f)
	ShipGeometry.quad(st, p0_f, p0_b, p1_b, p1_f)

	st.generate_normals()
	st.generate_tangents()
	var wall = MeshInstance3D.new()
	wall.name = wall_name
	wall.mesh = st.commit()
	parent.add_child(wall)
	var joinery := ShipGeometry.begin(mat_furniture)
	for level in [0.10, height - 0.12]:
		ShipGeometry.beam(joinery, WreckStructure.get_world_pos(a.x, a.y + level, a.z), WreckStructure.get_world_pos(b.x, b.y + level, b.z), 0.18)
	var divisions := maxi(1, int(ceilf(a.distance_to(b) / 2.6)))
	for division in range(divisions + 1):
		var p := a.lerp(b, float(division) / float(divisions))
		ShipGeometry.beam(joinery, WreckStructure.get_world_pos(p.x, p.y + 0.1, p.z), WreckStructure.get_world_pos(p.x, p.y + height - 0.12, p.z), 0.18)
	ShipGeometry.commit(wall, "BulkheadJoinery", joinery)

	# Colisionador sólido BoxShape3D grueso (>= 0.32m) para impedir atravesar mamparos sin sobresalir de cubiertas superiores
	if with_collider:
		var col_h := maxf(0.40, height - 0.08)
		var mid_local := (a + b) * 0.5
		var wall_world := WreckStructure.get_world_pos(mid_local.x, mid_local.y + col_h * 0.5, mid_local.z)
		var span_len := maxf(0.25, Vector2(span.x, span.z).length() + 0.12)
		var sb := PbrMaterialKit.add_box_collider(wall, wall_name + "_SolidCol", Vector3(span_len, col_h, 0.32), wall_world)
		sb.rotation.y = -atan2(span.z, span.x)
	return wall

func _build_hull_interior_lining(parent: Node3D, node_name: String, x_start: float, x_end: float, y_bot: float, y_top: float, side: float, f_bot: float, f_top: float) -> MeshInstance3D:
	# Revestimiento interior de casco con normales hacia adentro para cerrar camarotes y cubiertas bajas
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_bulkhead)
	var sb := StaticBody3D.new()
	sb.name = node_name + "_Col"

	var x := x_start
	var step_x := 1.5
	while x < x_end - 0.001:
		var nx := minf(x_end, x + step_x)
		var b0 := WreckStructure.get_beam_at(x)
		var b1 := WreckStructure.get_beam_at(nx)
		var p0 := WreckStructure.get_world_pos(x, y_bot, side * b0 * f_bot)
		var p1 := WreckStructure.get_world_pos(nx, y_bot, side * b1 * f_bot)
		var p2 := WreckStructure.get_world_pos(nx, y_top, side * b1 * f_top)
		var p3 := WreckStructure.get_world_pos(x, y_top, side * b0 * f_top)

		var u0 := x / 2.5; var u1 := nx / 2.5
		if side < 0.0:
			st.set_uv(Vector2(u0, 0.0)); st.add_vertex(p0)
			st.set_uv(Vector2(u1, 0.0)); st.add_vertex(p1)
			st.set_uv(Vector2(u1, 1.5)); st.add_vertex(p2)
			st.set_uv(Vector2(u0, 0.0)); st.add_vertex(p0)
			st.set_uv(Vector2(u1, 1.5)); st.add_vertex(p2)
			st.set_uv(Vector2(u0, 1.5)); st.add_vertex(p3)
		else:
			st.set_uv(Vector2(u0, 0.0)); st.add_vertex(p0)
			st.set_uv(Vector2(u1, 1.5)); st.add_vertex(p2)
			st.set_uv(Vector2(u1, 0.0)); st.add_vertex(p1)
			st.set_uv(Vector2(u0, 0.0)); st.add_vertex(p0)
			st.set_uv(Vector2(u0, 1.5)); st.add_vertex(p3)
			st.set_uv(Vector2(u1, 1.5)); st.add_vertex(p2)

		var seg_mid := ((p0 + p1) * 0.5 + (p2 + p3) * 0.5) * 0.5
		var seg_vec := p1 - p0
		var cs := CollisionShape3D.new()
		var cbx := BoxShape3D.new()
		cbx.size = Vector3(seg_vec.length() + 0.22, absf(y_top - y_bot) + 0.35, 0.65)
		cs.shape = cbx
		cs.position = seg_mid + Vector3(0, 0, side * 0.12)
		cs.rotation.y = -atan2(seg_vec.z, seg_vec.x)
		sb.add_child(cs)

		# Colisionador de zócalo a ras de suelo para sellar cualquier unión con la tarima e impedir caídas
		var cs_bot := CollisionShape3D.new()
		var cbx_bot := BoxShape3D.new()
		cbx_bot.size = Vector3(seg_vec.length() + 0.22, 0.95, 0.65)
		cs_bot.shape = cbx_bot
		cs_bot.position = (p0 + p1) * 0.5 + Vector3(0.0, 0.42, side * 0.12)
		cs_bot.rotation.y = -atan2(seg_vec.z, seg_vec.x)
		sb.add_child(cs_bot)
		x += step_x

	st.generate_normals()
	st.generate_tangents()
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	mi.add_child(sb)
	parent.add_child(mi)
	# Inner frames belong to the lining so front-side cutout hides their details too.
	var ribs := ShipGeometry.begin(mat_furniture)
	var rib_x := x_start + 1.2
	while rib_x < x_end - 0.4:
		var width := WreckStructure.get_beam_at(rib_x)
		var low := WreckStructure.get_world_pos(rib_x, y_bot + 0.12, side * (width * f_bot - 0.08))
		var high := WreckStructure.get_world_pos(rib_x, y_top - 0.12, side * (width * f_top - 0.08))
		ShipGeometry.beam(ribs, low, high, 0.16)
		ShipGeometry.beam(ribs, high - Vector3(0, 0.45, 0), high - Vector3(0, 0, side * 0.45), 0.14)
		rib_x += 3.0
	ShipGeometry.commit(mi, "LiningFramesAndKnees", ribs)
	return mi

func _build_contoured_water_plane(parent: Node3D, node_name: String, x_start: float, x_end: float, y_level: float, beam_factor: float, mat: Material) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat)
	var x := x_start
	var step_x := 1.5
	while x < x_end - 0.001:
		var nx := minf(x_end, x + step_x)
		var b0 := WreckStructure.get_beam_at(x) * beam_factor
		var b1 := WreckStructure.get_beam_at(nx) * beam_factor
		var p0 := Vector3(x, y_level, -b0)
		var p1 := Vector3(nx, y_level, -b1)
		var p2 := Vector3(nx, y_level, b1)
		var p3 := Vector3(x, y_level, b0)
		st.set_uv(Vector2(x / 4.0, -b0 / 4.0)); st.add_vertex(p0)
		st.set_uv(Vector2(nx / 4.0, -b1 / 4.0)); st.add_vertex(p1)
		st.set_uv(Vector2(nx / 4.0, b1 / 4.0)); st.add_vertex(p2)
		st.set_uv(Vector2(x / 4.0, -b0 / 4.0)); st.add_vertex(p0)
		st.set_uv(Vector2(nx / 4.0, b1 / 4.0)); st.add_vertex(p2)
		st.set_uv(Vector2(x / 4.0, b0 / 4.0)); st.add_vertex(p3)
		x += step_x
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = st.commit()
	parent.add_child(mi)
	return mi

func _build_stanchions_and_beams(parent: Node3D, node_name: String, x_list: Array, z_list: Array, y_bot: float, y_top: float) -> void:
	# Puntales estructurales de roble y baos transversales bajo cubierta
	var root := Node3D.new()
	root.name = node_name
	parent.add_child(root)
	var h := absf(y_top - y_bot)
	var mid_y := (y_bot + y_top) * 0.5
	for px_val in x_list:
		var px := float(px_val)
		var beam_span := minf(WreckStructure.get_beam_at(px) * 1.45, 7.2)
		var beam := MeshInstance3D.new()
		var bbx := BoxMesh.new()
		bbx.size = Vector3(0.26, 0.24, beam_span)
		beam.mesh = bbx
		beam.material_override = mat_furniture
		beam.position = WreckStructure.get_world_pos(px, y_top - 0.12, 0.0)
		root.add_child(beam)

		for pz_val in z_list:
			var pz := float(pz_val)
			var pillar := MeshInstance3D.new()
			var pbx := BoxMesh.new()
			pbx.size = Vector3(0.28, h, 0.28)
			pillar.mesh = pbx
			pillar.material_override = mat_furniture
			pillar.position = WreckStructure.get_world_pos(px, mid_y, pz)
			root.add_child(pillar)
			PbrMaterialKit.add_box_collider(root, "Col_Pillar_%d_%d" % [int(px), int(pz)], Vector3(0.32, h, 0.32), pillar.position)
			var knees := ShipGeometry.begin(mat_furniture)
			for side in [-1.0, 1.0]:
				ShipGeometry.beam(knees, WreckStructure.get_world_pos(px, y_top - 0.65, pz), WreckStructure.get_world_pos(px, y_top - 0.18, pz + side * 0.48), 0.14)
			ShipGeometry.commit(root, "PillarKnees_%d_%d" % [int(px), int(pz)], knees)

func build_hole_rim(parent: Node3D, pos: Vector3, half_size: float) -> void:
	# Marco rectangular de vigas de roble astilladas alrededor de la brecha P13
	var rim_node = Node3D.new()
	rim_node.name = "BreachP13Coaming"
	rim_node.position = pos
	parent.add_child(rim_node)

	for cfg in [
		{"pos": Vector3(-half_size, 0.05, 0), "size": Vector3(0.14, 0.12, half_size * 2.0 + 0.14)},
		{"pos": Vector3(half_size, 0.05, 0),  "size": Vector3(0.14, 0.12, half_size * 2.0 + 0.14)},
		{"pos": Vector3(0, 0.05, -half_size), "size": Vector3(half_size * 2.0, 0.12, 0.14)},
		{"pos": Vector3(0, 0.05, half_size),  "size": Vector3(half_size * 2.0, 0.12, 0.14)}
	]:
		var beam = MeshInstance3D.new()
		var box = BoxMesh.new()
		box.size = cfg["size"]
		beam.mesh = box
		beam.material_override = mat_furniture
		beam.position = cfg["pos"]
		rim_node.add_child(beam)

func build_wall_lantern(parent: Node3D, pos: Vector3, light_name: String) -> void:
	var lan_root = Node3D.new()
	lan_root.name = light_name + "_Fixture"
	lan_root.position = pos
	parent.add_child(lan_root)

	var post = MeshInstance3D.new()
	var cyl = CylinderMesh.new()
	cyl.top_radius = 0.025
	cyl.bottom_radius = 0.025
	cyl.height = 0.28
	post.mesh = cyl
	post.material_override = mat_metal
	post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	post.position = Vector3(0, -0.18, 0)
	lan_root.add_child(post)

	# Capuchón y base de hierro forjado
	var cap = MeshInstance3D.new()
	var cap_cyl = CylinderMesh.new()
	cap_cyl.top_radius = 0.04
	cap_cyl.bottom_radius = 0.15
	cap_cyl.height = 0.11
	cap.mesh = cap_cyl
	cap.material_override = mat_metal
	cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cap.position = Vector3(0, 0.17, 0)
	lan_root.add_child(cap)

	var glass = MeshInstance3D.new()
	var g_cyl = CylinderMesh.new()
	g_cyl.top_radius = 0.09
	g_cyl.bottom_radius = 0.075
	g_cyl.height = 0.20
	g_cyl.radial_segments = 6
	glass.mesh = g_cyl
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_glass = StandardMaterial3D.new()
	mat_glass.albedo_color = Color("#f7be63")
	mat_glass.emission_enabled = true
	mat_glass.emission = Color("#f5a642")
	mat_glass.emission_energy_multiplier = 1.4
	glass.material_override = mat_glass
	glass.position = Vector3(0, 0.02, 0)
	lan_root.add_child(glass)

	var light = OmniLight3D.new()
	light.name = light_name
	light.position = pos
	light.light_color = Color("#f7bf6d")
	light.light_energy = 2.6
	light.omni_range = 13.0
	light.omni_attenuation = 1.15
	light.shadow_enabled = false
	parent.add_child(light)

func _apply_rock_mat(node: Node) -> void:
	if node is MeshInstance3D:
		node.material_override = PbrMaterialKit.create_basalt_rock_pbr("#3d4648")
	for child in node.get_children():
		_apply_rock_mat(child)
