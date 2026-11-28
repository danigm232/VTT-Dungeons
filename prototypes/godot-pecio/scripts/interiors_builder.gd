class_name InteriorsBuilder
extends Node3D

const WreckStructure = preload("res://scripts/wreck_structure.gd")
const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")
const InteractiveTransition = preload("res://scripts/interactive_transition.gd")
const HullBuilder = preload("res://scripts/hull_builder.gd")
const ShipGeometry = preload("res://scripts/ship_geometry.gd")
const DragonBonesBuilder = preload("res://scripts/dragon_bones_builder.gd")

# Generador de Interiores Canónicos C4-C7, Cubierta Inferior C8 y Bodega Sumergida C9
# Conforme a engine/client/wreck-interior.ts, wreck-runtime-v6.ts y PECIO_SPATIAL_PLAN.md

var mat_bulkhead: StandardMaterial3D
var mat_furniture: StandardMaterial3D
var mat_metal: StandardMaterial3D
var mat_flood_water: Material
var mat_hold_water: Material
var mat_caustics: Material
var mat_bedding: StandardMaterial3D
var mat_blanket: StandardMaterial3D
var mat_furniture_trim: StandardMaterial3D
var mat_brass: StandardMaterial3D
var mat_skeleton: StandardMaterial3D
var mat_kelp: StandardMaterial3D
var mat_chart: StandardMaterial3D

var interior_lanterns: Array[Dictionary] = []
var galley_crabs: Array[Dictionary] = []
var _crab_anim_time: float = 0.0
var c9_fish: Array[Dictionary] = []
var _c9_fish_actors: Array[Node3D] = []
var _fish_anim_time: float = 0.0

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()
	set_process(not galley_crabs.is_empty() or not c9_fish.is_empty())

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	setup_materials()
	build_cabins_aft()      # C4 (Capitán) y C5 (Cocina) bajo C3
	build_cabins_fore()     # C6 (Camarote) y C7 (Comedor) bajo C2
	build_lower_deck_c8()   # Cubierta baja inundada (-3.2m)
	build_hold_c9()         # Bodega sumergida (-6.4m) y brecha submarina P16

func _process(delta: float) -> void:
	if not galley_crabs.is_empty():
		_crab_anim_time += delta
		for entry in galley_crabs:
			var crab: Node3D = entry["node"]
			if not is_instance_valid(crab):
				continue
			var phase: float = entry["phase"]
			var base_pos: Vector3 = entry["base_pos"]
			var base_yaw: float = entry["base_yaw"]
			var t := _crab_anim_time * 1.45 + phase
			crab.position = base_pos + Vector3(sin(t) * 0.08, 0.0, cos(t * 0.8) * 0.06)
			crab.rotation.y = base_yaw + sin(t * 0.7) * 0.28
	if not c9_fish.is_empty():
		_update_c9_fish(delta)

var mat_copper: StandardMaterial3D
var mat_floor_cabin: StandardMaterial3D

func setup_materials() -> void:
	mat_bulkhead = PbrMaterialKit.create_wood_planks_pbr("#9e8b74", 0.28)
	mat_bulkhead.roughness = 0.80
	mat_bulkhead.metallic_specular = 0.16
	mat_bulkhead.ao_light_affect = 0.20
	mat_bulkhead.normal_scale = 0.28
	mat_bulkhead.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat_floor_cabin = PbrMaterialKit.create_cabin_floor_pbr("#ddd0b8", 0.28)

	mat_furniture = PbrMaterialKit.create_oak_furniture_pbr("#806346", 0.42)
	mat_furniture_trim = PbrMaterialKit.create_oak_furniture_pbr("#5e4530", 0.48)
	mat_metal = PbrMaterialKit.create_iron_pbr("#262827", 0.56, 0.76)

	mat_copper = PbrMaterialKit.create_aged_copper_pbr("#614933")
	mat_brass = PbrMaterialKit.create_aged_copper_pbr("#b48f48")
	mat_brass.metallic = 0.68
	mat_brass.roughness = 0.44

	mat_bedding = PbrMaterialKit.create_moldy_cloth_pbr("#aaa28a")
	mat_blanket = PbrMaterialKit.create_moldy_cloth_pbr("#4d5d56")

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

func _add_rect_contact_shadow(parent: Node3D, world_x: float, world_z: float, width_x: float, depth_z: float, rot_y_deg: float = 0.0, opacity: float = 0.68) -> MeshInstance3D:
	var sh := PbrMaterialKit.create_contact_shadow_rect(width_x, depth_z, opacity, WreckStructure.LIST_SLOPE)
	sh.position = WreckStructure.get_world_pos(world_x, 0.014, world_z)
	sh.basis = Basis(Vector3.RIGHT, -atan(WreckStructure.LIST_SLOPE)) * Basis(Vector3.UP, deg_to_rad(rot_y_deg))
	parent.add_child(sh)
	return sh

func _add_round_contact_shadow(parent: Node3D, world_x: float, world_z: float, rx: float, rz: float, opacity: float = 0.64) -> MeshInstance3D:
	var sh := PbrMaterialKit.create_blob_shadow(rx, rz, opacity)
	sh.position = WreckStructure.get_world_pos(world_x, 0.014, world_z)
	sh.rotation.x = -atan(WreckStructure.LIST_SLOPE)
	parent.add_child(sh)
	return sh

func _build_galley_crab(parent: Node3D, crab_name: String, world_pos: Vector3, yaw_deg: float, phase: float) -> void:
	var crab := Node3D.new()
	crab.name = crab_name
	crab.position = world_pos
	crab.rotation.y = deg_to_rad(yaw_deg)
	crab.scale = Vector3.ONE * 1.25
	parent.add_child(crab)

	var mat_shell := PbrMaterialKit.create_oak_furniture_pbr("#8c3828", 1.5)
	mat_shell.roughness = 0.38
	mat_shell.metallic_specular = 0.40

	var body := MeshInstance3D.new()
	var b_cyl := CylinderMesh.new()
	b_cyl.top_radius = 0.085; b_cyl.bottom_radius = 0.075; b_cyl.height = 0.045
	b_cyl.radial_segments = 8
	body.mesh = b_cyl
	body.material_override = mat_shell
	body.scale = Vector3(1.25, 1.0, 0.95)
	body.position = Vector3(0, 0.042, 0)
	crab.add_child(body)

	for side in [-1.0, 1.0]:
		var claw := MeshInstance3D.new()
		var cl_box := BoxMesh.new()
		cl_box.size = Vector3(0.065, 0.032, 0.042)
		claw.mesh = cl_box
		claw.material_override = mat_shell
		claw.position = Vector3(side * 0.095, 0.045, 0.075)
		claw.rotation_degrees.y = side * -28.0
		crab.add_child(claw)

		for li in [-1, 0, 1]:
			var leg := MeshInstance3D.new()
			var l_box := BoxMesh.new()
			l_box.size = Vector3(0.095, 0.016, 0.018)
			leg.mesh = l_box
			leg.material_override = mat_shell
			leg.position = Vector3(side * 0.11, 0.025, float(li) * 0.038 - 0.01)
			leg.rotation_degrees = Vector3(0.0, side * float(li) * 14.0, side * -26.0)
			crab.add_child(leg)

	var c_sh := PbrMaterialKit.create_blob_shadow(0.18, 0.16, 0.58)
	c_sh.position = Vector3(0, 0.008, 0)
	crab.add_child(c_sh)

	galley_crabs.append({"node": crab, "base_pos": world_pos, "base_yaw": deg_to_rad(yaw_deg), "phase": phase})

func _build_rotten_chair(parent: Node3D, chair_name: String, pos: Vector3, rot_deg: Vector3, missing_slat: bool = false) -> void:
	var chair := Node3D.new()
	chair.name = chair_name
	chair.position = pos
	chair.rotation_degrees = rot_deg
	parent.add_child(chair)

	var seat := MeshInstance3D.new()
	var s_box := BoxMesh.new()
	s_box.size = Vector3(0.46, 0.06, 0.44)
	seat.mesh = s_box
	seat.material_override = mat_furniture
	seat.position = Vector3(0, 0.44, 0)
	chair.add_child(seat)

	for lx in [-0.18, 0.18]:
		for lz in [-0.17, 0.17]:
			var leg := MeshInstance3D.new()
			var l_box := BoxMesh.new()
			l_box.size = Vector3(0.055, 0.44, 0.055)
			leg.mesh = l_box
			leg.material_override = mat_furniture_trim
			leg.position = Vector3(lx, 0.22, lz)
			chair.add_child(leg)

	for bx in [-0.18, 0.18]:
		var stile := MeshInstance3D.new()
		var st_box := BoxMesh.new()
		st_box.size = Vector3(0.055, 0.48, 0.055)
		stile.mesh = st_box
		stile.material_override = mat_furniture_trim
		stile.position = Vector3(bx, 0.68, -0.18)
		chair.add_child(stile)

	var top_rail := MeshInstance3D.new()
	var tr_box := BoxMesh.new()
	tr_box.size = Vector3(0.42, 0.075, 0.045)
	top_rail.mesh = tr_box
	top_rail.material_override = mat_furniture
	top_rail.position = Vector3(0, 0.89, -0.18)
	if missing_slat:
		top_rail.rotation_degrees.z = -7.0
	chair.add_child(top_rail)

	if not missing_slat:
		var mid_slat := MeshInstance3D.new()
		var ms_box := BoxMesh.new()
		ms_box.size = Vector3(0.32, 0.06, 0.03)
		mid_slat.mesh = ms_box
		mid_slat.material_override = mat_furniture
		mid_slat.position = Vector3(0, 0.68, -0.18)
		chair.add_child(mid_slat)

	PbrMaterialKit.add_box_collider(chair, "Col_" + chair_name, Vector3(0.48, 0.90, 0.46), Vector3(0, 0.45, 0))

func _create_plaque_texture() -> ImageTexture:
	var w := 256; var h := 64
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var bg := Color("#2f2214")
	var border := Color("#b69249")
	var ink := Color("#efe1ba")
	for y in range(h):
		for x in range(w):
			var is_border := x < 4 or x >= w - 4 or y < 4 or y >= h - 4
			img.set_pixel(x, y, border if is_border else bg)
	# Lineas grabadas simulando "ALEITHA Y BRASTOS · Juntos para siempre"
	for px in range(28, 228):
		if (px / 6) % 3 != 0:
			for py in [20, 21, 22, 36, 37]:
				img.set_pixel(px, py, ink)
	img.generate_mipmaps()
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

	# Mamparo divisorio frontal cerrado con umbrales visibles hacia +Z de las escaleras (C4 z = -1.80, C5 z = +5.20)
	# 1. Mamparo babor Popa (C4): costado exterior, cierre bajo escalera (-3.50) y umbral visible de puerta C4 (-1.80)
	var front_c4 = Node3D.new()
	front_c4.name = "Bulkhead_Front_C4"
	aft_node.add_child(front_c4)
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -beam_aft), Vector3(-13.5, 0, -4.35), 2.95, "Bulkhead_C4_Outboard")
	PbrMaterialKit.add_occluder_box(front_c4, "Occ_FrontC4", Vector3(0.24, 2.7, maxf(1.0, beam_aft - 4.35)), WreckStructure.get_world_pos(-13.5, 1.4, -(beam_aft + 4.35) * 0.5))
	# Cierre inferior sólido bajo la escalera de popa babor (y <= 2.25m; bloquea paso bajo escalera y despeja C3 a y = 3.0m)
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -4.35), Vector3(-13.5, 0, -2.65), 2.25, "UnderStair_Aft_Port", true)
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -2.65), Vector3(-13.5, 0, -2.40), 2.95, "Wall_Aft_PortDoorToStair")
	build_bulkhead_wall(front_c4, Vector3(-13.5, 0, -1.20), Vector3(-13.5, 0, 0.0), 2.95, "Wall_Aft_PortDoorToSpine")

	# 2. Mamparo intermedio entre espina central (0.0) y escalera popa estribor (+2.65)
	var front_mid = Node3D.new()
	front_mid.name = "Bulkhead_Front_Mid"
	aft_node.add_child(front_mid)
	build_bulkhead_wall(front_mid, Vector3(-13.5, 0, 0.0), Vector3(-13.5, 0, 2.65), 2.95, "Bulkhead_Front_Mid_Mesh")
	PbrMaterialKit.add_occluder_box(front_mid, "Occ_FrontMid", Vector3(0.24, 2.7, 2.55), WreckStructure.get_world_pos(-13.5, 1.4, 1.325))

	# 3. Mamparo estribor Popa (C5): cierre bajo escalera, muro hasta puerta C5 (+5.2) y costado exterior
	var front_c5 = Node3D.new()
	front_c5.name = "Bulkhead_Front_C5"
	aft_node.add_child(front_c5)
	# Cierre inferior sólido bajo la escalera de popa estribor (y <= 2.25m)
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 2.65), Vector3(-13.5, 0, 4.35), 2.25, "UnderStair_Aft_Stbd", true)
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 4.35), Vector3(-13.5, 0, 4.60), 2.95, "Wall_Aft_StbdStairToDoor")
	build_bulkhead_wall(front_c5, Vector3(-13.5, 0, 5.80), Vector3(-13.5, 0, beam_aft), 2.95, "Bulkhead_C5_Outboard")
	PbrMaterialKit.add_occluder_box(front_c5, "Occ_FrontC5", Vector3(0.24, 2.7, maxf(1.0, beam_aft - 5.80)), WreckStructure.get_world_pos(-13.5, 1.4, (beam_aft + 5.80) * 0.5))

	# Mamparo longitudinal central completo hasta el espejo de popa (x = -30.75..-13.5) sin huecos
	var spine_aft = Node3D.new()
	spine_aft.name = "Bulkhead_Spine_Aft"
	aft_node.add_child(spine_aft)
	build_bulkhead_wall(spine_aft, Vector3(WreckStructure.STERN_X, 0, 0), Vector3(-13.5, 0, 0), 2.94, "Bulkhead_Spine_Aft_Mesh")
	PbrMaterialKit.add_occluder_box(spine_aft, "Occ_SpineAft", Vector3(16.8, 2.7, 0.24), WreckStructure.get_world_pos(-22.1, 1.4, 0.0))

	# Forros interiores curvos del casco en popa (para que C4 y C5 queden cerrados visual y físicamente)
	_build_hull_interior_lining(aft_node, "HullInner_Aft_Port", WreckStructure.STERN_X, -13.5, 0.0, 2.95, -1.0, 0.96, 0.98)
	_build_hull_interior_lining(aft_node, "HullInner_Aft_Front", WreckStructure.STERN_X, -13.5, 0.0, 2.95, 1.0, 0.96, 0.98)
	var stern_b = WreckStructure.get_beam_at(WreckStructure.STERN_X)
	build_bulkhead_wall(aft_node, Vector3(WreckStructure.STERN_X, 0, -stern_b), Vector3(WreckStructure.STERN_X, 0, 0.0), 2.94, "InteriorWall_Stern_C4")
	# Réplica interior de los ventanales de popa en C4 + banco/cofre bajo galería y alfombra de capitán
	var mat_stern_glass := StandardMaterial3D.new()
	mat_stern_glass.albedo_color = Color("#1e2e36")
	mat_stern_glass.roughness = 0.16
	mat_stern_glass.metallic_specular = 0.72
	mat_stern_glass.emission_enabled = true
	mat_stern_glass.emission = Color("#3a6978")
	mat_stern_glass.emission_energy_multiplier = 0.62

	for win_z in [-2.05, -0.72]:
		var iwin := MeshInstance3D.new()
		var iw_box := BoxMesh.new()
		iw_box.size = Vector3(0.06, 1.02, 0.84)
		iwin.mesh = iw_box
		iwin.material_override = mat_stern_glass
		iwin.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.15, 1.95, win_z)
		aft_node.add_child(iwin)

		var ilintel := MeshInstance3D.new()
		var il_box := BoxMesh.new()
		il_box.size = Vector3(0.14, 0.10, 0.98)
		ilintel.mesh = il_box
		ilintel.material_override = mat_furniture
		ilintel.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.17, 2.49, win_z)
		aft_node.add_child(ilintel)

		var isill := MeshInstance3D.new()
		var is_box := BoxMesh.new()
		is_box.size = Vector3(0.18, 0.11, 1.02)
		isill.mesh = is_box
		isill.material_override = mat_furniture
		isill.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.18, 1.40, win_z)
		aft_node.add_child(isill)

		for gz in [-0.15, 0.15]:
			var m_v := MeshInstance3D.new()
			var mv_box := BoxMesh.new()
			mv_box.size = Vector3(0.08, 1.00, 0.04)
			m_v.mesh = mv_box
			m_v.material_override = mat_metal
			m_v.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.17, 1.95, win_z + gz)
			aft_node.add_child(m_v)

	var win_fill := OmniLight3D.new()
	win_fill.name = "C4_SternWindowGlow"
	win_fill.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 1.25, 1.95, -1.6)
	win_fill.light_color = Color("#7ec4d6")
	win_fill.light_energy = 1.15
	win_fill.omni_range = 9.0
	aft_node.add_child(win_fill)

	var c4_fill := OmniLight3D.new()
	c4_fill.name = "C4_InteriorFill"
	c4_fill.position = WreckStructure.get_world_pos(-20.5, 2.25, -3.5)
	c4_fill.light_color = Color("#dfbe96")
	c4_fill.light_energy = 1.42
	c4_fill.omni_range = 14.0
	c4_fill.omni_attenuation = 1.0
	c4_fill.shadow_enabled = false
	aft_node.add_child(c4_fill)

	# Cortinajes rasgados y haces tenues de luz marina entrando por los ventanales de popa de C4
	var mat_curtain := PbrMaterialKit.create_moldy_cloth_pbr("#592822")
	mat_curtain.cull_mode = BaseMaterial3D.CULL_DISABLED
	for cz_drape in [-2.60, -1.40, -0.22]:
		var drape := MeshInstance3D.new()
		var dr_box := BoxMesh.new()
		dr_box.size = Vector3(0.08, 1.18, 0.24)
		drape.mesh = dr_box
		drape.material_override = mat_curtain
		drape.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.22, 1.92, cz_drape)
		drape.rotation_degrees = Vector3(0.0, 0.0, 4.0)
		aft_node.add_child(drape)

	var beam_sh := load("res://shaders/underwater_light_shaft.gdshader") as Shader
	var mat_c4_beam := ShaderMaterial.new()
	if beam_sh:
		mat_c4_beam.shader = beam_sh
		mat_c4_beam.set_shader_parameter("shaft_color", Color(0.76, 0.90, 0.96, 1.0))
		mat_c4_beam.set_shader_parameter("intensity", 0.14)
		mat_c4_beam.set_shader_parameter("edge_power", 2.2)
		mat_c4_beam.set_shader_parameter("scroll_speed", 0.08)
	for win_z in [-2.05, -0.72]:
		var ray_m := MeshInstance3D.new()
		var r_cyl := CylinderMesh.new()
		r_cyl.top_radius = 0.24
		r_cyl.bottom_radius = 0.56
		r_cyl.height = 2.65
		r_cyl.radial_segments = 12
		r_cyl.rings = 1
		r_cyl.cap_top = false
		r_cyl.cap_bottom = false
		ray_m.mesh = r_cyl
		ray_m.material_override = mat_c4_beam
		ray_m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ray_m.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 1.38, 1.32, win_z)
		ray_m.rotation_degrees = Vector3(8.0, 0.0, 56.0)
		aft_node.add_child(ray_m)

	# Banco corrido de popa bajo los ventanales (con respaldo, cartas enrolladas y sombra de contacto) y alfombra bordeada en popa C4
	var stern_bench := MeshInstance3D.new()
	var sb_box := BoxMesh.new()
	sb_box.size = Vector3(0.68, 0.46, 2.45)
	stern_bench.mesh = sb_box
	stern_bench.material_override = mat_furniture
	stern_bench.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.62, 0.24, -1.65)
	aft_node.add_child(stern_bench)
	# Cartas marinas enrolladas y cojín húmedo sobre el banco de popa
	for rz_off in [-0.75, -0.58, 0.62]:
		var scroll := MeshInstance3D.new()
		var sc_cyl := CylinderMesh.new()
		sc_cyl.top_radius = 0.045; sc_cyl.bottom_radius = 0.045; sc_cyl.height = 0.48; sc_cyl.radial_segments = 8
		scroll.mesh = sc_cyl
		scroll.material_override = mat_chart
		scroll.position = WreckStructure.get_world_pos(WreckStructure.STERN_X + 0.64, 0.51, -1.65 + rz_off)
		scroll.rotation_degrees = Vector3(0.0, 28.0 * sign(rz_off), 90.0)
		aft_node.add_child(scroll)
	PbrMaterialKit.add_box_collider(aft_node, "Col_SternBenchC4", Vector3(0.72, 0.50, 2.50), stern_bench.position)
	_add_rect_contact_shadow(aft_node, WreckStructure.STERN_X + 0.62, -1.65, 0.86, 2.65, 0.0, 0.72)

	# Silla de capitán ligeramente ladeada frente al escritorio + folios esparcidos en C4
	_build_rotten_chair(aft_node, "CaptainsChair_C4", WreckStructure.get_world_pos(-25.1, 0.0, -2.55), Vector3(0, -108, 0), false)
	_add_round_contact_shadow(aft_node, -25.1, -2.55, 0.42, 0.42, 0.68)
	for pg_pt in [Vector2(-24.2, -3.4), Vector2(-23.6, -2.1), Vector2(-21.9, -2.85), Vector2(-19.4, -4.6)]:
		var page := MeshInstance3D.new()
		var pg_p := PlaneMesh.new()
		pg_p.size = Vector2(0.28, 0.21)
		page.mesh = pg_p
		page.material_override = mat_chart
		page.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		page.position = WreckStructure.get_world_pos(pg_pt.x, 0.018, pg_pt.y)
		page.rotation = Vector3(-atan(WreckStructure.LIST_SLOPE), pg_pt.x * 1.9, 0.0)
		aft_node.add_child(page)

	var carpet_border := MeshInstance3D.new()
	carpet_border.name = "CaptainCarpetBorder_C4"
	var rug_b_box := BoxMesh.new()
	rug_b_box.size = Vector3(3.85, 0.018, 2.75)
	carpet_border.mesh = rug_b_box
	carpet_border.material_override = PbrMaterialKit.create_moldy_cloth_pbr("#9b7e4c")
	carpet_border.position = WreckStructure.get_world_pos(-26.5, 0.014, -2.5)
	carpet_border.rotation.x = -atan(WreckStructure.LIST_SLOPE)
	aft_node.add_child(carpet_border)

	var captain_rug := MeshInstance3D.new()
	captain_rug.name = "CaptainCarpet_C4"
	var rug_box := BoxMesh.new()
	rug_box.size = Vector3(3.45, 0.022, 2.35)
	captain_rug.mesh = rug_box
	captain_rug.material_override = PbrMaterialKit.create_moldy_cloth_pbr("#6a2d22")
	captain_rug.position = WreckStructure.get_world_pos(-26.5, 0.020, -2.5)
	captain_rug.rotation.x = -atan(WreckStructure.LIST_SLOPE)
	aft_node.add_child(captain_rug)

	var stern_c5_wall = Node3D.new()
	stern_c5_wall.name = "InteriorWall_Stern_C5_Root"
	aft_node.add_child(stern_c5_wall)
	build_bulkhead_wall(stern_c5_wall, Vector3(WreckStructure.STERN_X, 0, 0.0), Vector3(WreckStructure.STERN_X, 0, stern_b), 3.0, "InteriorWall_Stern_C5")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 4: CAMAROTE DEL CAPITÁN (C4, z < 0)
	# --------------------------------------------------------------------------
	# 1. Escritorio de tres patas del Capitán (reubicado sobre la alfombra popel, despejando P13 y DoorC4)
	var desk_node = Node3D.new()
	desk_node.name = "CaptainsDesk"
	desk_node.position = WreckStructure.get_world_pos(-26.8, 0.0, -2.5)
	desk_node.rotation_degrees = Vector3(1.8, 12.0, -3.5) # Inclinación leve al faltarle una pata delantera
	aft_node.add_child(desk_node)

	var desk_slab = MeshInstance3D.new()
	var d_slab_box = BoxMesh.new()
	d_slab_box.size = Vector3(1.85, 0.10, 0.98)
	desk_slab.mesh = d_slab_box
	desk_slab.material_override = mat_furniture
	desk_slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	desk_slab.position = Vector3(0, 0.80, 0)
	desk_node.add_child(desk_slab)

	# Cajonera intacta izquierda + 1 única pata trasera derecha + muñón fracturado (escritorio de tres patas canónico)
	var ped_left = MeshInstance3D.new()
	var p_box = BoxMesh.new()
	p_box.size = Vector3(0.50, 0.76, 0.86)
	ped_left.mesh = p_box
	ped_left.material_override = mat_furniture_trim
	ped_left.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ped_left.position = Vector3(-0.62, 0.38, 0)
	desk_node.add_child(ped_left)

	var leg_back_right = MeshInstance3D.new()
	var lbr_box = BoxMesh.new()
	lbr_box.size = Vector3(0.11, 0.76, 0.11)
	leg_back_right.mesh = lbr_box
	leg_back_right.material_override = mat_furniture_trim
	leg_back_right.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	leg_back_right.position = Vector3(0.72, 0.38, -0.34)
	desk_node.add_child(leg_back_right)

	var snapped_stump = MeshInstance3D.new()
	var ss_box = BoxMesh.new()
	ss_box.size = Vector3(0.10, 0.24, 0.10)
	snapped_stump.mesh = ss_box
	snapped_stump.material_override = mat_furniture_trim
	snapped_stump.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	snapped_stump.position = Vector3(0.72, 0.64, 0.34)
	snapped_stump.rotation_degrees.z = -18.0
	desk_node.add_child(snapped_stump)

	var apron = MeshInstance3D.new()
	var ap_box = BoxMesh.new()
	ap_box.size = Vector3(0.96, 0.16, 0.78)
	apron.mesh = ap_box
	apron.material_override = mat_furniture_trim
	apron.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	apron.position = Vector3(0.12, 0.68, 0)
	desk_node.add_child(apron)

	var inkwell = MeshInstance3D.new()
	var ink_cyl = CylinderMesh.new()
	ink_cyl.top_radius = 0.045; ink_cyl.bottom_radius = 0.06; ink_cyl.height = 0.08
	inkwell.mesh = ink_cyl
	inkwell.material_override = mat_brass
	inkwell.position = Vector3(0.52, 0.89, -0.24)
	desk_node.add_child(inkwell)

	var quill = MeshInstance3D.new()
	var ql_box = BoxMesh.new()
	ql_box.size = Vector3(0.014, 0.22, 0.025)
	quill.mesh = ql_box
	quill.material_override = mat_bedding
	quill.position = Vector3(0.54, 0.99, -0.24)
	quill.rotation_degrees = Vector3(0.0, 0.0, -24.0)
	desk_node.add_child(quill)

	# Astrolabio de latón sobre la carta náutica
	var astrolabe = MeshInstance3D.new()
	var ast_tor = TorusMesh.new()
	ast_tor.inner_radius = 0.06; ast_tor.outer_radius = 0.09
	astrolabe.mesh = ast_tor
	astrolabe.material_override = mat_brass
	astrolabe.position = Vector3(-0.32, 0.865, 0.22)
	desk_node.add_child(astrolabe)

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
		rod.material_override = mat_furniture_trim
		rod.position = Vector3(rod_x, 0.87, 0)
		rod.rotation_degrees.x = 90.0
		desk_node.add_child(rod)

	# Interacción contextual canónica: Escritorio, carta náutica, cajones y brújula (C4)
	var prop_chart = InteractiveProp.new()
	prop_chart.name = "PropChartC4"
	prop_chart.prop_id = "c4_chart"
	prop_chart.prompt_text = "Examinar Escritorio, Cajones y Brújula (C4)"
	prop_chart.inspection_message = "El mapa náutico detalla arrecifes traicioneros y la derrota hacia la Isla de los Naufragios."
	prop_chart.interaction_radius = 2.5
	desk_node.add_child(prop_chart)

	# Sillón del capitán retranqueado ligeramente hacia la popa del escritorio
	var mat_leather_pad := PbrMaterialKit.create_leather_pbr("#6d241b")
	var chair_seat = MeshInstance3D.new()
	var cs_box = BoxMesh.new()
	cs_box.size = Vector3(0.52, 0.08, 0.54)
	chair_seat.mesh = cs_box
	chair_seat.material_override = mat_furniture
	chair_seat.position = Vector3(0.76, 0.46, 0.08)
	desk_node.add_child(chair_seat)

	var chair_cushion = MeshInstance3D.new()
	var cc_box = BoxMesh.new()
	cc_box.size = Vector3(0.46, 0.045, 0.46)
	chair_cushion.mesh = cc_box
	chair_cushion.material_override = mat_leather_pad
	chair_cushion.position = Vector3(0.76, 0.52, 0.08)
	desk_node.add_child(chair_cushion)

	var chair_back = MeshInstance3D.new()
	var cb_box = BoxMesh.new()
	cb_box.size = Vector3(0.08, 0.64, 0.52)
	chair_back.mesh = cb_box
	chair_back.material_override = mat_furniture_trim
	chair_back.position = Vector3(0.99, 0.78, 0.08)
	desk_node.add_child(chair_back)

	var chair_back_pad = MeshInstance3D.new()
	var cbp_box = BoxMesh.new()
	cbp_box.size = Vector3(0.04, 0.48, 0.42)
	chair_back_pad.mesh = cbp_box
	chair_back_pad.material_override = mat_leather_pad
	chair_back_pad.position = Vector3(0.94, 0.80, 0.08)
	desk_node.add_child(chair_back_pad)

	for lz in [-0.14, 0.30]:
		for lx in [0.54, 0.98]:
			var leg = MeshInstance3D.new()
			var l_box = BoxMesh.new()
			l_box.size = Vector3(0.06, 0.46, 0.06)
			leg.mesh = l_box
			leg.material_override = mat_furniture_trim
			leg.position = Vector3(lx, 0.23, lz)
			desk_node.add_child(leg)
		var arm = MeshInstance3D.new()
		var a_box = BoxMesh.new()
		a_box.size = Vector3(0.46, 0.06, 0.06)
		arm.mesh = a_box
		arm.material_override = mat_furniture_trim
		arm.position = Vector3(0.76, 0.68, lz)
		desk_node.add_child(arm)

	PbrMaterialKit.add_box_collider(desk_node, "Col_CaptainsDesk", Vector3(2.05, 0.95, 1.00), Vector3(0.08, 0.48, 0.0))
	_add_rect_contact_shadow(aft_node, -26.8, -2.5, 2.25, 1.30, 12.0, 0.74)

	# 2. Cama con dosel desvencijada en nicho de babor (despejando (-24, -4) y (-19, -4))
	var bed_node = Node3D.new()
	bed_node.name = "CaptainsBed"
	bed_node.position = WreckStructure.get_world_pos(-22.8, 0.0, -5.8)
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
	bed_frame.material_override = mat_furniture_trim
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

	var wool_throw = MeshInstance3D.new()
	var wt_box = BoxMesh.new()
	wt_box.size = Vector3(1.25, 0.06, 1.64)
	wool_throw.mesh = wt_box
	wool_throw.material_override = mat_blanket
	wool_throw.position = Vector3(0.42, 0.71, 0)
	bed_node.add_child(wool_throw)

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
			post.material_override = mat_furniture_trim
			post.position = Vector3(bx, 1.18, bz)
			bed_node.add_child(post)

	for bz in [-0.8, 0.8]:
		var top_rail = MeshInstance3D.new()
		var tr_box = BoxMesh.new()
		tr_box.size = Vector3(2.26, 0.07, 0.07)
		top_rail.mesh = tr_box
		top_rail.material_override = mat_furniture_trim
		top_rail.position = Vector3(0, 2.32, bz)
		bed_node.add_child(top_rail)

	# Dosel rasgado y cortinajes caídos en la cama del Capitán (rompe postes desnudos)
	var mat_canopy := PbrMaterialKit.create_moldy_cloth_pbr("#5a2722")
	mat_canopy.cull_mode = BaseMaterial3D.CULL_DISABLED
	for bx in [-1.06, 1.06]:
		for bz in [-0.76, 0.76]:
			var corner_drape := MeshInstance3D.new()
			var cd_box := BoxMesh.new()
			cd_box.size = Vector3(0.16, 1.55, 0.26)
			corner_drape.mesh = cd_box
			corner_drape.material_override = mat_canopy
			corner_drape.position = Vector3(bx * 0.96, 1.52, bz * 0.96)
			corner_drape.rotation_degrees = Vector3(bz * 5.0, 0.0, -bx * 4.0)
			bed_node.add_child(corner_drape)
	for side_val in [-0.80, 0.80]:
		var valance := MeshInstance3D.new()
		var vl_box := BoxMesh.new()
		vl_box.size = Vector3(2.22, 0.26, 0.04)
		valance.mesh = vl_box
		valance.material_override = mat_canopy
		valance.position = Vector3(0.0, 2.18, side_val)
		bed_node.add_child(valance)

	PbrMaterialKit.add_box_collider(bed_node, "Col_CaptainsBed", Vector3(2.44, 1.10, 1.84), Vector3(0, 0.55, 0))
	_add_rect_contact_shadow(aft_node, -22.8, -5.8, 2.70, 2.10, 0.0, 0.76)

	# 3. Cofre de caudales de hierro (c4-gold) en rincón delantero-babor lejos de DoorC4 y P13
	var chest_pos = WreckStructure.get_world_pos(-16.2, 0.0, -5.8)
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		var c_inst = chest_res.instantiate()
		c_inst.position = chest_pos + Vector3(0, 0.085, 0)
		c_inst.rotation.y = 0.65
		c_inst.scale = Vector3(0.65, 0.65, 0.65)
		PbrMaterialKit.apply_kenney_material(c_inst)
		aft_node.add_child(c_inst)
		PbrMaterialKit.add_box_collider(aft_node, "Col_CaptainsChestC4", Vector3(0.85, 0.72, 0.62), chest_pos + Vector3(0, 0.36, 0))

	_add_rect_contact_shadow(aft_node, -16.2, -5.8, 1.05, 0.80, -37.0, 0.72)

	# 4. Estantería volcada junto al mamparo central + diarios mojados e interacción canónica
	var shelf_pos = WreckStructure.get_world_pos(-21.2, 0.0, -1.1)
	var shelf_node = Node3D.new()
	shelf_node.name = "OverturnedBookshelf"
	shelf_node.position = shelf_pos + Vector3(0, 0.25, 0)
	shelf_node.rotation_degrees = Vector3(-14, 8, 76)
	aft_node.add_child(shelf_node)

	var back_panel = MeshInstance3D.new()
	var bp_box = BoxMesh.new()
	bp_box.size = Vector3(1.56, 1.98, 0.06)
	back_panel.mesh = bp_box
	back_panel.material_override = mat_furniture_trim
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

	var mat_book := PbrMaterialKit.create_oak_furniture_pbr("#7a3326", 0.5)
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
	var prop_bookshelf = InteractiveProp.new()
	prop_bookshelf.name = "PropBookshelfC4"
	prop_bookshelf.prop_id = "c4_bookshelf"
	prop_bookshelf.prompt_text = "Examinar Estantería y Diarios Mojados"
	prop_bookshelf.inspection_message = "Tomos de derrota y bitácoras empapadas con apuntes sobre los dragones del arrecife."
	prop_bookshelf.interaction_radius = 2.4
	shelf_node.add_child(prop_bookshelf)

	_add_rect_contact_shadow(aft_node, -21.2, -1.1, 2.15, 0.95, 8.0, 0.72)

	# Diarios y volúmenes húmedos caídos junto a la estantería
	var mat_spilled_vellum := PbrMaterialKit.create_moldy_cloth_pbr("#c4b28a")
	var mat_spilled_leather := PbrMaterialKit.create_leather_pbr("#8c382b")
	var spilled_books := [
		Vector3(-20.2, 0.035, -1.85),
		Vector3(-20.6, 0.035, -2.05),
		Vector3(-21.7, 0.035, -1.90),
		Vector3(-22.1, 0.035, -1.55),
	]
	for idx in range(spilled_books.size()):
		var sb_p: Vector3 = spilled_books[idx]
		var sp_book := MeshInstance3D.new()
		var sb_m := BoxMesh.new()
		sb_m.size = Vector3(0.28, 0.06, 0.21)
		sp_book.mesh = sb_m
		sp_book.material_override = mat_spilled_vellum if idx % 2 == 0 else mat_spilled_leather
		sp_book.position = WreckStructure.get_world_pos(sb_p.x, sb_p.y, sb_p.z)
		sp_book.rotation_degrees = Vector3(0, 22.0 * float(idx) - 18.0, 0)
		aft_node.add_child(sp_book)

	# 5. Agujero P13 enmarcado en vigas rotas hacia la cubierta baja C8 + transición con cuerda
	build_hole_rim(aft_node, WreckStructure.get_world_pos(-17.5, 0.0, -3.2), 0.8)
	var trans_p13_down := InteractiveTransition.new()
	trans_p13_down.name = "Trans_P13_Down"
	trans_p13_down.position = WreckStructure.get_world_pos(-17.5, 0.12, -3.2)
	trans_p13_down.prompt_label = "Bajar por Boquete P13 a Sentina C8 (cuerda)"
	trans_p13_down.destination = Vector3(-18.1, -3.22, -3.2)
	trans_p13_down.transition_mode = "hatch"
	trans_p13_down.trigger_radius = 1.9
	aft_node.add_child(trans_p13_down)

	# Farol de escritorio elevado sobre pie de bronce en la mesa del Capitán (-27.25, 1.24, -2.10)
	var desk_lamp_stand := MeshInstance3D.new()
	var dls_cyl := CylinderMesh.new()
	dls_cyl.top_radius = 0.022; dls_cyl.bottom_radius = 0.075; dls_cyl.height = 0.28
	desk_lamp_stand.mesh = dls_cyl
	desk_lamp_stand.material_override = mat_brass
	desk_lamp_stand.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	desk_lamp_stand.position = WreckStructure.get_world_pos(-27.25, 0.98, -2.10)
	aft_node.add_child(desk_lamp_stand)
	build_wall_lantern(aft_node, WreckStructure.get_world_pos(-27.25, 1.24, -2.10), "Lantern_C4_Captain", "table")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 5: COCINA DE A BORDO (C5 - GALLEY, z > 0)
	# --------------------------------------------------------------------------
	# 1. Fogón / Estufa de hierro fundido desplazado al corazón de la cocina C5
	var stove_node = Node3D.new()
	stove_node.name = "GalleyStove"
	stove_node.position = WreckStructure.get_world_pos(-22.2, 0.0, 4.4)
	stove_node.rotation.y = 0.22
	aft_node.add_child(stove_node)

	var hearth = MeshInstance3D.new()
	var h_box = BoxMesh.new()
	h_box.size = Vector3(1.56, 0.12, 1.36)
	hearth.mesh = h_box
	hearth.material_override = mat_furniture_trim
	hearth.position = Vector3(0, 0.06, 0)
	stove_node.add_child(hearth)

	var mat_stove_cast := PbrMaterialKit.create_iron_pbr("#2f3335", 0.58, 0.52)
	var stove_body = MeshInstance3D.new()
	var stb_box = BoxMesh.new()
	stb_box.size = Vector3(1.36, 0.82, 1.16)
	stove_body.mesh = stb_box
	stove_body.material_override = mat_stove_cast
	stove_body.position = Vector3(0, 0.52, 0)
	stove_node.add_child(stove_body)

	var stove_top = MeshInstance3D.new()
	var stt_box = BoxMesh.new()
	stt_box.size = Vector3(1.44, 0.08, 1.24)
	stove_top.mesh = stt_box
	stove_top.material_override = mat_stove_cast
	stove_top.position = Vector3(0, 0.96, 0)
	stove_node.add_child(stove_top)

	# Tiro de chimenea remachado hasta el techo y leñera junto al fogón de C5 (sin duplicar la marmita existente)
	var stove_flue := MeshInstance3D.new()
	var sfl_cyl := CylinderMesh.new()
	sfl_cyl.top_radius = 0.14; sfl_cyl.bottom_radius = 0.17; sfl_cyl.height = 1.78; sfl_cyl.radial_segments = 10
	stove_flue.mesh = sfl_cyl
	stove_flue.material_override = mat_stove_cast
	stove_flue.position = Vector3(-0.25, 1.98, 0.20)
	stove_node.add_child(stove_flue)

	var logs_st := ShipGeometry.begin(PbrMaterialKit.create_oak_furniture_pbr("#4c3724", 0.55))
	for li in range(5):
		var ly := 0.08 + float(int(li / 3)) * 0.11
		var lz := -0.82 - float(li % 3) * 0.12
		ShipGeometry.tube(logs_st, [Vector3(-0.38, ly, lz), Vector3(0.32, ly, lz)], 0.055, 6)
	ShipGeometry.commit(stove_node, "GalleyFirewoodStack", logs_st)

	var ember_bed = MeshInstance3D.new()
	var emb_box = BoxMesh.new()
	emb_box.size = Vector3(0.04, 0.30, 0.46)
	ember_bed.mesh = emb_box
	var mat_ember := StandardMaterial3D.new()
	mat_ember.albedo_color = Color("#4a180a")
	mat_ember.emission_enabled = true
	mat_ember.emission = Color("#982a0a")
	mat_ember.emission_energy_multiplier = 0.85
	ember_bed.material_override = mat_ember
	ember_bed.position = Vector3(0.69, 0.44, 0)
	stove_node.add_child(ember_bed)

	var ash_slot = MeshInstance3D.new()
	var ash_box = BoxMesh.new()
	ash_box.size = Vector3(0.44, 0.08, 0.04)
	ash_slot.mesh = ash_box
	ash_slot.material_override = mat_ember
	ash_slot.position = Vector3(0.10, 0.28, -0.585)
	stove_node.add_child(ash_slot)

	var stove_door = MeshInstance3D.new()
	var std_box = BoxMesh.new()
	std_box.size = Vector3(0.06, 0.45, 0.62)
	stove_door.mesh = std_box
	stove_door.material_override = PbrMaterialKit.create_iron_pbr("#3e4244", 0.60, 0.48)
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
	_add_rect_contact_shadow(aft_node, -22.2, 4.4, 1.80, 1.56, -12.6, 0.78)

	var prop_stove = InteractiveProp.new()
	prop_stove.name = "PropStoveC5"
	prop_stove.prop_id = "c5_stove"
	prop_stove.prompt_text = "Inspeccionar Fogón de Cocina"
	prop_stove.inspection_message = "Fogón de hierro fundido apagado hace 50 años. El tiro de chimenea conserva restos de hollín."
	prop_stove.interaction_radius = 2.2
	stove_node.add_child(prop_stove)

	# 2. Encimera de carnicero apartada del umbral de DoorC5 (costado estribor C5)
	var counter_node = Node3D.new()
	counter_node.name = "GalleyCounter"
	counter_node.position = WreckStructure.get_world_pos(-17.8, 0.0, 6.4)
	counter_node.rotation.y = -0.18
	aft_node.add_child(counter_node)

	var counter_top = MeshInstance3D.new()
	var ct_box = BoxMesh.new()
	ct_box.size = Vector3(2.44, 0.09, 0.86)
	counter_top.mesh = ct_box
	counter_top.material_override = mat_furniture
	counter_top.position = Vector3(0, 0.82, 0)
	counter_node.add_child(counter_top)

	var counter_body = MeshInstance3D.new()
	var cnt_box = BoxMesh.new()
	cnt_box.size = Vector3(2.30, 0.76, 0.76)
	counter_body.mesh = cnt_box
	counter_body.material_override = mat_furniture_trim
	counter_body.position = Vector3(0, 0.39, 0)
	counter_node.add_child(counter_body)

	var board = MeshInstance3D.new()
	var bd_box = BoxMesh.new()
	bd_box.size = Vector3(0.55, 0.04, 0.38)
	board.mesh = bd_box
	board.material_override = mat_chart
	board.position = Vector3(0.55, 0.88, 0.06)
	counter_node.add_child(board)

	var cleaver = MeshInstance3D.new()
	var clv_box = BoxMesh.new()
	clv_box.size = Vector3(0.22, 0.02, 0.09)
	cleaver.mesh = clv_box
	cleaver.material_override = PbrMaterialKit.create_iron_pbr("#8d9295", 0.78, 0.32)
	cleaver.position = Vector3(0.58, 0.91, 0.06)
	cleaver.rotation_degrees.y = 26.0
	counter_node.add_child(cleaver)

	PbrMaterialKit.add_box_collider(counter_node, "Col_GalleyCounter", Vector3(2.44, 0.95, 0.86), Vector3(0, 0.48, 0))

	# Olla de cobre y especiero sobre la encimera
	var pot = MeshInstance3D.new()
	var p_cyl = CylinderMesh.new()
	p_cyl.top_radius = 0.16
	p_cyl.bottom_radius = 0.14
	p_cyl.height = 0.22
	pot.mesh = p_cyl
	pot.material_override = mat_copper
	pot.position = Vector3(-0.6, 0.96, 0)
	counter_node.add_child(pot)

	var prop_counter = InteractiveProp.new()
	prop_counter.name = "PropCounterC5"
	prop_counter.prop_id = "c5_counter"
	prop_counter.prompt_text = "Registrar Encimera y Tajos de Cocina"
	prop_counter.inspection_message = "Tajos de carnicero húmedos, un machete mellado y tarros de salazón vacíos."
	prop_counter.interaction_radius = 1.85
	counter_node.add_child(prop_counter)

	_add_rect_contact_shadow(aft_node, -17.8, 6.4, 2.65, 1.06, 10.3, 0.74)

	# 3. Esqueleto anatómico sin cabeza sentado en el suelo (c5-skeleton-blockout) + cangrejos inofensivos
	var skel_c5 = Node3D.new()
	skel_c5.name = "HeadlessSkeleton_C5"
	skel_c5.position = WreckStructure.get_world_pos(-20.4, 0.0, 1.65)
	skel_c5.rotation.y = 0.55
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

	_add_round_contact_shadow(aft_node, -20.4, 1.65, 0.72, 0.72, 0.68)

	# 3 cangrejos pequeños inofensivos moviendo el esqueleto (canon C5 · falsa alarma)
	_build_galley_crab(aft_node, "GalleyCrab_0", WreckStructure.get_world_pos(-20.0, 0.01, 2.02), -25.0, 0.0)
	_build_galley_crab(aft_node, "GalleyCrab_1", WreckStructure.get_world_pos(-20.75, 0.01, 1.95), 42.0, 2.1)
	_build_galley_crab(aft_node, "GalleyCrab_2", WreckStructure.get_world_pos(-20.25, 0.01, 1.25), 115.0, 4.2)

	var prop_skel = InteractiveProp.new()
	prop_skel.name = "PropSkelC5"
	prop_skel.prop_id = "c5_skeleton"
	prop_skel.prompt_text = "Registrar Esqueleto del Cocinero"
	prop_skel.inspection_message = "El esqueleto no tiene cráneo. Varios cangrejos diminutos bullen entre las costillas y mueven los huesos."
	prop_skel.interaction_radius = 2.2
	skel_c5.add_child(prop_skel)

	# 4. Barriles y cajón de salazón en la popa de la cocina C5 (manteniendo el centro despejado)
	var barrel_res = load("res://assets/models/barrel.glb")
	if barrel_res:
		for b_cfg in [
			{"name": "GalleyBarrelC5", "x": -26.2, "z": 5.0, "sc": 0.85, "r": 0.42},
			{"name": "GalleyBarrelC5_B", "x": -26.9, "z": 3.8, "sc": 0.72, "r": 0.36}
		]:
			var bp := WreckStructure.get_world_pos(b_cfg["x"], 0.0, b_cfg["z"])
			var bi = barrel_res.instantiate()
			bi.name = b_cfg["name"]
			bi.position = bp
			bi.scale = Vector3.ONE * b_cfg["sc"]
			PbrMaterialKit.apply_kenney_material(bi)
			aft_node.add_child(bi)
			PbrMaterialKit.add_cyl_collider(aft_node, "Col_" + b_cfg["name"], b_cfg["r"], 0.96 * b_cfg["sc"], bp + Vector3(0, 0.45, 0))
			_add_round_contact_shadow(aft_node, b_cfg["x"], b_cfg["z"], 0.62 * b_cfg["sc"], 0.62 * b_cfg["sc"], 0.68)

	var crate_res = load("res://assets/models/crate.glb")
	if crate_res:
		var c5_crate_pos := WreckStructure.get_world_pos(-25.4, 0.0, 6.1)
		var cr = crate_res.instantiate()
		cr.name = "GalleyCrateC5"
		cr.position = c5_crate_pos
		cr.rotation.y = 0.42
		cr.scale = Vector3(0.75, 0.75, 0.75)
		PbrMaterialKit.apply_kenney_material(cr)
		aft_node.add_child(cr)
		PbrMaterialKit.add_box_collider(aft_node, "Col_GalleyCrateC5", Vector3(0.75, 0.65, 0.75), c5_crate_pos + Vector3(0, 0.32, 0))
		_add_rect_contact_shadow(aft_node, -25.4, 6.1, 0.92, 0.92, -24.0, 0.70)

	# Despensa, sacos de harina, estantería de utensilios de cobre y farol de mamparo naval en C5 (sin farola de calle)
	var mat_burlap := PbrMaterialKit.create_moldy_cloth_pbr("#8d7a5a")
	for sack_pt in [Vector3(-25.4, 0.24, 3.65), Vector3(-24.8, 0.20, 4.15), Vector3(-26.1, 0.22, 2.95)]:
		var sack := MeshInstance3D.new()
		var sack_mesh := CylinderMesh.new()
		sack_mesh.top_radius = 0.19; sack_mesh.bottom_radius = 0.25; sack_mesh.height = 0.46; sack_mesh.radial_segments = 8
		sack.mesh = sack_mesh
		sack.material_override = mat_burlap
		sack.position = WreckStructure.get_world_pos(sack_pt.x, sack_pt.y, sack_pt.z)
		sack.rotation_degrees = Vector3(8.0, sack_pt.x * 19.0, -6.0)
		aft_node.add_child(sack)
		_add_round_contact_shadow(aft_node, sack_pt.x, sack_pt.z, 0.36, 0.36, 0.62)

	var rack_st := ShipGeometry.begin(mat_furniture)
	var rack_base := WreckStructure.get_world_pos(-26.8, 1.45, 2.1)
	ShipGeometry.beam(rack_st, rack_base + Vector3(0.18, 0.0, -0.85), rack_base + Vector3(0.18, 0.0, 0.85), 0.28, 0.06)
	ShipGeometry.beam(rack_st, rack_base + Vector3(0.18, 0.48, -0.85), rack_base + Vector3(0.18, 0.48, 0.85), 0.26, 0.06)
	ShipGeometry.commit(aft_node, "GalleyPantryShelves_C5", rack_st)
	for pan_z in [-0.55, -0.10, 0.35]:
		var pan := MeshInstance3D.new()
		var pn_cyl := CylinderMesh.new()
		pn_cyl.top_radius = 0.14; pn_cyl.bottom_radius = 0.14; pn_cyl.height = 0.04; pn_cyl.radial_segments = 10
		pan.mesh = pn_cyl
		pan.material_override = mat_copper
		pan.position = rack_base + Vector3(0.24, -0.22, pan_z)
		pan.rotation_degrees.z = 90.0
		aft_node.add_child(pan)

	# Farol de mamparo montado sobre el mamparo central/popa en C5 (sustituye farola callejera de pie)
	build_wall_lantern(aft_node, WreckStructure.get_world_pos(-19.5, 1.82, 0.32), "Lantern_C5_Galley", "wall_bracket")

	var c5_fill := OmniLight3D.new()
	c5_fill.name = "C5_InteriorFill"
	c5_fill.position = WreckStructure.get_world_pos(-21.8, 2.2, 4.0)
	c5_fill.light_color = Color("#d4cbb8")
	c5_fill.light_energy = 1.48
	c5_fill.omni_range = 14.0
	c5_fill.omni_attenuation = 1.0
	c5_fill.shadow_enabled = false
	aft_node.add_child(c5_fill)

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

	# Mamparo divisorio frontal cerrado con umbrales visibles hacia +Z de las escaleras (C6 z = -1.80, C7 z = +5.20)
	# 1. Mamparo babor Proa (C6): costado exterior, cierre bajo escalera (-3.50) y umbral visible de puerta C6 (-1.80)
	var front_c6 = Node3D.new()
	front_c6.name = "Bulkhead_Front_C6"
	fore_node.add_child(front_c6)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -beam_fore), Vector3(13.5, 0, -4.35), 2.95, "Bulkhead_C6_Outboard")
	PbrMaterialKit.add_occluder_box(front_c6, "Occ_FrontC6", Vector3(0.24, 2.7, maxf(1.0, beam_fore - 4.35)), WreckStructure.get_world_pos(13.5, 1.4, -(beam_fore + 4.35) * 0.5))
	# Cierre inferior sólido bajo escalera proa babor (y <= 2.25m; bloquea paso bajo escalera y despeja C2 a y = 3.0m)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -4.35), Vector3(13.5, 0, -2.65), 2.25, "UnderStair_Fore_Port", true)
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -2.65), Vector3(13.5, 0, -2.40), 2.95, "Wall_Fore_PortDoorToStair")
	build_bulkhead_wall(front_c6, Vector3(13.5, 0, -1.20), Vector3(13.5, 0, 0.0), 2.95, "Wall_Fore_PortDoorToSpine")

	# 2. Mamparo intermedio entre espina central (0.0) y escalera proa estribor (+2.65)
	var front_fore_mid = Node3D.new()
	front_fore_mid.name = "Bulkhead_Front_Fore_Mid"
	fore_node.add_child(front_fore_mid)
	build_bulkhead_wall(front_fore_mid, Vector3(13.5, 0, 0.0), Vector3(13.5, 0, 2.65), 2.95, "Bulkhead_Front_Fore_Mid_Mesh")
	PbrMaterialKit.add_occluder_box(front_fore_mid, "Occ_FrontForeMid", Vector3(0.24, 2.7, 2.55), WreckStructure.get_world_pos(13.5, 1.4, 1.325))

	# 3. Mamparo estribor Proa (C7): cierre bajo escalera, muro hasta puerta C7 (+5.2) y costado exterior
	var front_c7 = Node3D.new()
	front_c7.name = "Bulkhead_Front_C7"
	fore_node.add_child(front_c7)
	# Cierre inferior sólido bajo escalera proa estribor (y <= 2.25m)
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 2.65), Vector3(13.5, 0, 4.35), 2.25, "UnderStair_Fore_Stbd", true)
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 4.35), Vector3(13.5, 0, 4.60), 2.95, "Wall_Fore_StbdStairToDoor")
	build_bulkhead_wall(front_c7, Vector3(13.5, 0, 5.80), Vector3(13.5, 0, beam_fore), 2.95, "Bulkhead_C7_Outboard")
	PbrMaterialKit.add_occluder_box(front_c7, "Occ_FrontC7", Vector3(0.24, 2.7, maxf(1.0, beam_fore - 5.80)), WreckStructure.get_world_pos(13.5, 1.4, (beam_fore + 5.80) * 0.5))

	# Mamparo longitudinal central completo hasta la roda de proa (x = 13.5..30.75) sin sobresalir por Deck_C2 (y = 3.0)
	var spine_fore = Node3D.new()
	spine_fore.name = "Bulkhead_Spine_Fore"
	fore_node.add_child(spine_fore)
	build_bulkhead_wall(spine_fore, Vector3(13.5, 0, 0), Vector3(WreckStructure.BOW_X, 0, 0), 2.86, "Bulkhead_Spine_Fore_Mesh")
	PbrMaterialKit.add_occluder_box(spine_fore, "Occ_SpineFore", Vector3(16.5, 2.65, 0.24), WreckStructure.get_world_pos(22.0, 1.38, 0.0))

	# Forros interiores curvos de proa (babor C6 visible, estribor C7 recortable; enrasados bajo Deck_C2)
	_build_hull_interior_lining(fore_node, "HullInner_Fore_Port", 13.5, WreckStructure.BOW_X, 0.0, 2.92, -1.0, 0.96, 0.98)
	_build_hull_interior_lining(fore_node, "HullInner_Fore_Front", 13.5, WreckStructure.BOW_X, 0.0, 2.92, 1.0, 0.96, 0.98)
	var forepeak_b := maxf(0.5, WreckStructure.get_beam_at(27.2) - 0.30)
	build_bulkhead_wall(fore_node, Vector3(27.2, 0, -forepeak_b), Vector3(27.2, 0, 0.0), 2.86, "BowForepeakWall_Fore")
	var fp_stbd := Node3D.new()
	fp_stbd.name = "BowForepeakWall_Stbd"
	fore_node.add_child(fp_stbd)
	build_bulkhead_wall(fp_stbd, Vector3(27.2, 0, 0.0), Vector3(27.2, 0, forepeak_b), 2.86, "BowForepeakWall_Stbd_Mesh")

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 6: CAMAROTE DE TRIPULACIÓN (C6, z < 0)
	# --------------------------------------------------------------------------
	# 6 Literas marineras empotradas repartidas siguiendo la curvatura de babor (c6-bunk-01..06)
	var bunk_configs := [
		{"name": "Bunk_16", "x": 16.8, "z": -5.8, "yaw": 6.0},
		{"name": "Bunk_18", "x": 20.2, "z": -5.5, "yaw": -5.0},
		{"name": "Bunk_21", "x": 23.8, "z": -4.4, "yaw": -18.0},
	]
	for b_cfg in bunk_configs:
		var bunk = Node3D.new()
		bunk.name = b_cfg["name"]
		bunk.position = WreckStructure.get_world_pos(b_cfg["x"], 0.0, b_cfg["z"])
		bunk.rotation_degrees.y = b_cfg["yaw"]
		fore_node.add_child(bunk)

		# 4 postes de roble estructurales que soportan ambas literas
		for px in [-0.98, 0.98]:
			for pz in [-0.42, 0.42]:
				var post = MeshInstance3D.new()
				var p_box = BoxMesh.new()
				p_box.size = Vector3(0.09, 1.55, 0.09)
				post.mesh = p_box
				post.material_override = mat_furniture_trim
				post.position = Vector3(px, 0.775, pz)
				bunk.add_child(post)

		# Escalera de acceso frontal
		for rung_y in [0.58, 0.98]:
			var rung = MeshInstance3D.new()
			var rg_box = BoxMesh.new()
			rg_box.size = Vector3(0.38, 0.045, 0.045)
			rung.mesh = rg_box
			rung.material_override = mat_furniture
			rung.position = Vector3(-0.74, rung_y, 0.45)
			bunk.add_child(rung)

		# Litera inferior y superior con colchón de lino + manta doblada + almohada
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

			var blanket = MeshInstance3D.new()
			var bl_box = BoxMesh.new()
			bl_box.size = Vector3(1.05, 0.045, 0.84)
			blanket.mesh = bl_box
			blanket.material_override = mat_blanket
			blanket.position = Vector3(0.42, tier_y + 0.19, 0)
			bunk.add_child(blanket)

			var pillow_b = MeshInstance3D.new()
			var pb_box = BoxMesh.new()
			pb_box.size = Vector3(0.34, 0.08, 0.56)
			pillow_b.mesh = pb_box
			pillow_b.material_override = mat_chart
			pillow_b.position = Vector3(-0.72, tier_y + 0.21, 0)
			bunk.add_child(pillow_b)

			var guard = MeshInstance3D.new()
			var gd_box = BoxMesh.new()
			gd_box.size = Vector3(1.92, 0.14, 0.05)
			guard.mesh = gd_box
			guard.material_override = mat_furniture_trim
			guard.position = Vector3(0, tier_y + 0.15, 0.44)
			bunk.add_child(guard)

		PbrMaterialKit.add_box_collider(bunk, "Col_" + b_cfg["name"], Vector3(2.15, 1.65, 0.98), Vector3(0, 0.82, 0))
		_add_rect_contact_shadow(fore_node, b_cfg["x"], b_cfg["z"], 2.35, 1.18, b_cfg["yaw"], 0.74)

		if b_cfg["name"] == "Bunk_18":
			var prop_bunk = InteractiveProp.new()
			prop_bunk.name = "PropBunkC6"
			prop_bunk.prop_id = "c6_bunks"
			prop_bunk.prompt_text = "Registrar Literas Marineras"
			prop_bunk.inspection_message = "Paja mohosa y maderas carcomidas. En un madero hay tallada una plegaria a Selûne."
			prop_bunk.interaction_radius = 2.4
			bunk.add_child(prop_bunk)

	# Retrato canónico de Aleitha y Brastos + placa «juntos para siempre» en mamparo de proa (visible en cámara C6)
	var portrait_root = Node3D.new()
	portrait_root.name = "C6_AleithaPortrait"
	portrait_root.position = WreckStructure.get_world_pos(27.02, 1.50, -2.4)
	fore_node.add_child(portrait_root)

	# Contenedor descolgable del lienzo, marco y placa (puede guardarse en mochila y volver a colgarse)
	var hanging_canvas := Node3D.new()
	hanging_canvas.name = "PortraitHangingCanvas"
	portrait_root.add_child(hanging_canvas)

	var p_frame_back = MeshInstance3D.new()
	var pfb_box = BoxMesh.new()
	pfb_box.size = Vector3(0.06, 1.18, 0.96)
	p_frame_back.mesh = pfb_box
	p_frame_back.material_override = mat_furniture_trim
	hanging_canvas.add_child(p_frame_back)

	var p_brass_trim = MeshInstance3D.new()
	var pbt_box = BoxMesh.new()
	pbt_box.size = Vector3(0.075, 1.06, 0.84)
	p_brass_trim.mesh = pbt_box
	p_brass_trim.material_override = mat_brass
	p_brass_trim.position = Vector3(-0.008, 0, 0)
	hanging_canvas.add_child(p_brass_trim)

	var p_art_mesh = MeshInstance3D.new()
	var pa_quad = QuadMesh.new()
	pa_quad.size = Vector2(0.80, 1.02)
	p_art_mesh.mesh = pa_quad
	var p_tex := PbrMaterialKit._load_tex_safe("res://assets/textures/c6-aleitha-brastos-portrait-art10.png", null)
	var p_art_mat = StandardMaterial3D.new()
	if p_tex:
		p_art_mat.albedo_texture = p_tex
	else:
		p_art_mat.albedo_color = Color("#b89b72")
	p_art_mat.roughness = 0.68
	p_art_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	p_art_mesh.material_override = p_art_mat
	p_art_mesh.position = Vector3(-0.048, 0, 0)
	p_art_mesh.rotation.y = -PI * 0.5
	hanging_canvas.add_child(p_art_mesh)

	var plaque_mesh = MeshInstance3D.new()
	var plq_quad = QuadMesh.new()
	plq_quad.size = Vector2(0.88, 0.21)
	plaque_mesh.mesh = plq_quad
	var plq_mat = StandardMaterial3D.new()
	plq_mat.albedo_texture = _create_plaque_texture()
	plq_mat.metallic = 0.45
	plq_mat.roughness = 0.48
	plq_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	plaque_mesh.material_override = plq_mat
	plaque_mesh.position = Vector3(-0.045, -0.72, 0)
	plaque_mesh.rotation.y = -PI * 0.5
	hanging_canvas.add_child(plaque_mesh)

	# Huella pálida de humedad y clavo de latón que quedan en el mamparo si se descuelga el retrato
	var wall_mark := Node3D.new()
	wall_mark.name = "PortraitWallMark"
	wall_mark.visible = false
	portrait_root.add_child(wall_mark)

	var ghost_rect := MeshInstance3D.new()
	var gr_quad := QuadMesh.new()
	gr_quad.size = Vector2(0.92, 1.14)
	ghost_rect.mesh = gr_quad
	var mat_ghost := StandardMaterial3D.new()
	mat_ghost.albedo_color = Color(0.28, 0.24, 0.18, 0.48)
	mat_ghost.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_ghost.roughness = 0.94
	mat_ghost.cull_mode = BaseMaterial3D.CULL_DISABLED
	ghost_rect.material_override = mat_ghost
	ghost_rect.position = Vector3(-0.025, 0.0, 0.0)
	ghost_rect.rotation.y = -PI * 0.5
	wall_mark.add_child(ghost_rect)

	var wall_nail := MeshInstance3D.new()
	var wn_cyl := CylinderMesh.new()
	wn_cyl.top_radius = 0.015; wn_cyl.bottom_radius = 0.015; wn_cyl.height = 0.08
	wall_nail.mesh = wn_cyl
	wall_nail.material_override = mat_brass
	wall_nail.position = Vector3(-0.04, 0.48, 0.0)
	wall_nail.rotation_degrees.z = 90.0
	wall_mark.add_child(wall_nail)

	var sconce_hood := MeshInstance3D.new()
	var sh_box := BoxMesh.new()
	sh_box.size = Vector3(0.22, 0.06, 0.44)
	sconce_hood.mesh = sh_box
	sconce_hood.material_override = mat_brass
	sconce_hood.position = Vector3(-0.14, 0.68, 0)
	portrait_root.add_child(sconce_hood)

	var sconce_light := OmniLight3D.new()
	sconce_light.name = "C6_PortraitSconceLight"
	sconce_light.position = Vector3(-0.34, 0.58, 0)
	sconce_light.light_color = Color("#ffcf87")
	sconce_light.light_energy = 0.0
	sconce_light.set_meta("lantern_base_energy", 0.95)
	sconce_light.set_meta("lantern_lit", false)
	sconce_light.omni_range = 4.2
	sconce_light.shadow_enabled = false
	portrait_root.add_child(sconce_light)

	# Trigger situado a altura de suelo justo delante del cuadro (y local -1.25 => ~0.25 m sobre cubierta)
	var prop_portrait = InteractiveProp.new()
	prop_portrait.name = "PropPortraitC6"
	prop_portrait.prop_id = "c6_portrait"
	prop_portrait.prompt_text = "Examinar Retrato de Aleitha y Brastos"
	prop_portrait.inspection_message = "Retrato al óleo en marco de roble y latón. La placa reza: «Aleitha y Brastos: juntos para siempre»."
	prop_portrait.position = Vector3(-0.75, -1.25, 0.0)
	prop_portrait.interaction_radius = 2.5
	portrait_root.add_child(prop_portrait)

	# Tablón suelto del alijo con trampa de aguja oculta (c6-trapped-stash, 200 po)
	var stash_node = Node3D.new()
	stash_node.name = "TrappedStash_C6"
	stash_node.position = WreckStructure.get_world_pos(18.6, 0.03, -2.6)
	fore_node.add_child(stash_node)

	var recess = MeshInstance3D.new()
	var rec_box = BoxMesh.new()
	rec_box.size = Vector3(0.86, 0.025, 0.42)
	recess.mesh = rec_box
	recess.material_override = mat_metal
	stash_node.add_child(recess)

	var stash_plank = MeshInstance3D.new()
	stash_plank.name = "LoosePlankMeshC6"
	var sp_box = BoxMesh.new()
	sp_box.size = Vector3(0.92, 0.045, 0.44)
	stash_plank.mesh = sp_box
	stash_plank.material_override = PbrMaterialKit.create_wood_planks_pbr("#826646", 0.6)
	stash_plank.position = Vector3(0.0, 0.024, 0.0)
	stash_plank.rotation_degrees = Vector3(0.0, 1.5, 1.2)
	stash_node.add_child(stash_plank)

	var trap_needle = MeshInstance3D.new()
	trap_needle.name = "TrapNeedleC6"
	var tn_cyl = CylinderMesh.new()
	tn_cyl.top_radius = 0.012; tn_cyl.bottom_radius = 0.030; tn_cyl.height = 0.14
	trap_needle.mesh = tn_cyl
	trap_needle.material_override = mat_brass
	trap_needle.position = Vector3(-0.24, 0.04, -0.05)
	trap_needle.rotation_degrees = Vector3(0, 0, -48.0)
	trap_needle.visible = false
	stash_node.add_child(trap_needle)

	_add_rect_contact_shadow(fore_node, 18.6, -2.6, 1.15, 0.65, 14.0, 0.68)

	var prop_trap = InteractiveProp.new()
	prop_trap.name = "PropTrapC6"
	prop_trap.prop_id = "c6_needle_trap"
	prop_trap.prompt_text = "Inspeccionar tablones del suelo (Percepción CD 10)"
	prop_trap.inspection_message = "Bajo el tablón suelto se esconde un mecanismo de aguja envenenada y un alijo de 200 piezas de oro."
	prop_trap.interaction_radius = 2.0
	stash_node.add_child(prop_trap)

	# Baúles y pertenencias de la tripulación (c6:belonging) con sombras de contacto
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		for ch_cfg in [
			{"name": "CrewChestC6", "x": 16.2, "z": -3.7, "yaw": 0.45, "sc": 0.65, "prop": true},
			{"name": "CrewFootlockerC6", "x": 21.8, "z": -3.7, "yaw": -0.35, "sc": 0.56, "prop": false},
		]:
			var cp := WreckStructure.get_world_pos(ch_cfg["x"], 0.0, ch_cfg["z"])
			var c_crew = chest_res.instantiate()
			c_crew.name = ch_cfg["name"]
			c_crew.position = cp + Vector3(0, 0.085 * ch_cfg["sc"] / 0.65, 0)
			c_crew.rotation.y = ch_cfg["yaw"]
			c_crew.scale = Vector3.ONE * ch_cfg["sc"]
			PbrMaterialKit.apply_kenney_material(c_crew)
			fore_node.add_child(c_crew)
			PbrMaterialKit.add_box_collider(fore_node, "Col_" + ch_cfg["name"], Vector3(0.80, 0.68, 0.58) * (ch_cfg["sc"] / 0.65), cp + Vector3(0, 0.34, 0))
			_add_rect_contact_shadow(fore_node, ch_cfg["x"], ch_cfg["z"], 0.96 * (ch_cfg["sc"] / 0.65), 0.72 * (ch_cfg["sc"] / 0.65), rad_to_deg(-ch_cfg["yaw"]), 0.72)
			if ch_cfg["prop"]:
				var prop_chest = InteractiveProp.new()
				prop_chest.name = "PropChestC6"
				prop_chest.prop_id = "c6_belongings"
				prop_chest.prompt_text = "Registrar Pertenencias de la Tripulación"
				prop_chest.inspection_message = "Ropas húmedas, cartas sin enviar y amuletos tallados en hueso de ballena."
				prop_chest.interaction_radius = 2.2
				c_crew.add_child(prop_chest)

	# Petates enrollados y taburete de tripulación en C6
	for sb_cfg in [
		{"x": 24.8, "z": -1.65, "yaw": 24.0},
		{"x": 15.2, "z": -5.60, "yaw": -38.0},
	]:
		var seabag := MeshInstance3D.new()
		var sbg_cyl := CylinderMesh.new()
		sbg_cyl.top_radius = 0.14; sbg_cyl.bottom_radius = 0.16; sbg_cyl.height = 0.54
		seabag.mesh = sbg_cyl
		seabag.material_override = mat_bedding
		seabag.position = WreckStructure.get_world_pos(sb_cfg["x"], 0.15, sb_cfg["z"])
		seabag.rotation_degrees = Vector3(88.0, sb_cfg["yaw"], 0.0)
		fore_node.add_child(seabag)
		_add_round_contact_shadow(fore_node, sb_cfg["x"], sb_cfg["z"], 0.38, 0.28, 0.64)

	var crew_stool := Node3D.new()
	crew_stool.position = WreckStructure.get_world_pos(19.4, 0.0, -4.0)
	fore_node.add_child(crew_stool)
	var st_top := MeshInstance3D.new()
	var st_cyl := CylinderMesh.new()
	st_cyl.top_radius = 0.22; st_cyl.bottom_radius = 0.22; st_cyl.height = 0.05
	st_top.mesh = st_cyl
	st_top.material_override = mat_furniture
	st_top.position = Vector3(0, 0.42, 0)
	crew_stool.add_child(st_top)
	var st_leg := MeshInstance3D.new()
	var stl_cyl := CylinderMesh.new()
	stl_cyl.top_radius = 0.16; stl_cyl.bottom_radius = 0.20; stl_cyl.height = 0.40
	st_leg.mesh = stl_cyl
	st_leg.material_override = mat_furniture_trim
	st_leg.position = Vector3(0, 0.20, 0)
	crew_stool.add_child(st_leg)
	_add_round_contact_shadow(fore_node, 19.4, -4.0, 0.32, 0.32, 0.66)

	# Hamaca marinera de lona doble cara colgada en el rincón popa-babor de C6 (sin bloquear paso)
	var mat_hammock := PbrMaterialKit.create_moldy_cloth_pbr("#968a70")
	mat_hammock.cull_mode = BaseMaterial3D.CULL_DISABLED
	var hm_st := ShipGeometry.begin(mat_hammock)
	var hm_segs := 8
	for hi in range(hm_segs):
		var t0 := float(hi) / float(hm_segs)
		var t1 := float(hi + 1) / float(hm_segs)
		var c0 := WreckStructure.get_world_pos(lerpf(14.1, 15.8, t0), 1.48 - sin(t0 * PI) * 0.42, lerpf(-6.2, -7.8, t0))
		var c1 := WreckStructure.get_world_pos(lerpf(14.1, 15.8, t1), 1.48 - sin(t1 * PI) * 0.42, lerpf(-6.2, -7.8, t1))
		var w0 := Vector3(0.24, 0.05, 0.24) * (0.30 + 0.70 * sin(t0 * PI))
		var w1 := Vector3(0.24, 0.05, 0.24) * (0.30 + 0.70 * sin(t1 * PI))
		ShipGeometry.quad(hm_st, c0 - w0, c0 + w0, c1 + w1, c1 - w1)
	ShipGeometry.commit(fore_node, "CrewHammockMesh_C6", hm_st)

	# Faroles navales anclados a mamparos SIEMPRE VISIBLES en recorte C6 (forro curvo de babor + mamparo de proa)
	var c6_port_wall_z := -WreckStructure.get_beam_at(18.5) * 0.97 + 0.28
	build_wall_lantern(fore_node, WreckStructure.get_world_pos(18.5, 1.92, c6_port_wall_z), "Lantern_C6_Crew_A", "wall_bracket_port")
	build_wall_lantern(fore_node, WreckStructure.get_world_pos(26.86, 1.86, -1.10), "Lantern_C6_Crew_B", "wall_bracket_bow")

	var c6_fill = OmniLight3D.new()
	c6_fill.name = "C6_InteriorFill"
	c6_fill.position = WreckStructure.get_world_pos(20.8, 2.2, -2.8)
	c6_fill.light_color = Color("#ebd5b3")
	c6_fill.light_energy = 1.50
	c6_fill.omni_range = 14.5
	c6_fill.omni_attenuation = 1.0
	c6_fill.shadow_enabled = false
	fore_node.add_child(c6_fill)

	# --------------------------------------------------------------------------
	# MOBILIARIO DE ZONA 7: COMEDOR DE PROA (C7 - MESS HALL, z > 0)
	# --------------------------------------------------------------------------
	# 1. Mesa alargada de comedor fracturada en dos mitades (despejando (22,4) y puerta C7)
	var table_node = Node3D.new()
	table_node.name = "MessTable_C7"
	table_node.position = WreckStructure.get_world_pos(19.0, 0.0, 3.6)
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

	# Patas de caballete y travesaño inferior en contraste nogal
	for tx in [-1.4, 1.4]:
		var leg = MeshInstance3D.new()
		var leg_box = BoxMesh.new()
		leg_box.size = Vector3(0.14, 0.76, 0.85)
		leg.mesh = leg_box
		leg.material_override = mat_furniture_trim
		leg.position = Vector3(tx, 0.38, 0)
		table_node.add_child(leg)

	var stretcher = MeshInstance3D.new()
	var str_box = BoxMesh.new()
	str_box.size = Vector3(2.8, 0.09, 0.12)
	stretcher.mesh = str_box
	stretcher.material_override = mat_furniture_trim
	stretcher.position = Vector3(0, 0.22, 0)
	table_node.add_child(stretcher)

	# Vajilla de peltre (platos + jarras), botella verde tumbada y diario encuadernado
	var mat_pewter := PbrMaterialKit.create_iron_pbr("#6d7578", 0.55, 0.60)
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

	var mat_shard_glass := StandardMaterial3D.new()
	mat_shard_glass.albedo_color = Color(0.26, 0.56, 0.50, 0.72)
	mat_shard_glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_shard_glass.roughness = 0.12
	mat_shard_glass.metallic_specular = 0.85

	var fallen_bottle = MeshInstance3D.new()
	var fb_cyl = CylinderMesh.new()
	fb_cyl.top_radius = 0.035; fb_cyl.bottom_radius = 0.055; fb_cyl.height = 0.24
	fallen_bottle.mesh = fb_cyl
	fallen_bottle.material_override = mat_shard_glass
	fallen_bottle.position = Vector3(-0.08, 0.86, 0.28)
	fallen_bottle.rotation_degrees = Vector3(88.0, 38.0, 0.0)
	table_node.add_child(fallen_bottle)

	var logbook = MeshInstance3D.new()
	var lb_box = BoxMesh.new()
	lb_box.size = Vector3(0.38, 0.06, 0.28)
	logbook.mesh = lb_box
	logbook.material_override = PbrMaterialKit.create_oak_furniture_pbr("#7a3326")
	logbook.position = Vector3(0.45, 0.84, -0.05)
	logbook.rotation_degrees.y = 18.0
	table_node.add_child(logbook)

	PbrMaterialKit.add_box_collider(table_node, "Col_MessTable", Vector3(3.62, 0.90, 1.12), Vector3(0, 0.45, 0))
	_add_rect_contact_shadow(fore_node, 19.0, 3.6, 3.85, 1.32, 0.0, 0.76)

	var prop_log = InteractiveProp.new()
	prop_log.name = "PropLogC7"
	prop_log.prop_id = "c7_logbook"
	prop_log.prompt_text = "Examinar Restos del Diario de a Bordo"
	prop_log.inspection_message = "«...el dragón cayó envuelto en llamas sobre el arrecife y nuestro casco crujió...»"
	prop_log.position = Vector3(0.75, 0.0, -0.15)
	prop_log.interaction_radius = 1.65
	table_node.add_child(prop_log)

	var prop_plates = InteractiveProp.new()
	prop_plates.name = "PropPlatesC7"
	prop_plates.prop_id = "c7_tableware"
	prop_plates.prompt_text = "Examinar Vajilla de Peltre"
	prop_plates.inspection_message = "Jarras, fuentes de peltre abolladas y botellas estalladas por el encallamiento."
	prop_plates.position = Vector3(-1.05, 0.0, 0.15)
	prop_plates.interaction_radius = 1.65
	table_node.add_child(prop_plates)

	# 2. Bancos de madera corridos con soportes, colisionador y sombras de contacto
	var bench1 = MeshInstance3D.new()
	var b_box = BoxMesh.new()
	b_box.size = Vector3(3.2, 0.09, 0.36)
	bench1.mesh = b_box
	bench1.material_override = mat_furniture
	bench1.position = WreckStructure.get_world_pos(19.0, 0.40, 2.55)
	fore_node.add_child(bench1)
	for lx in [-1.25, 1.25]:
		var bl = MeshInstance3D.new()
		var bl_box = BoxMesh.new()
		bl_box.size = Vector3(0.12, 0.40, 0.32)
		bl.mesh = bl_box
		bl.material_override = mat_furniture_trim
		bl.position = WreckStructure.get_world_pos(19.0 + lx, 0.20, 2.55)
		fore_node.add_child(bl)
	PbrMaterialKit.add_box_collider(fore_node, "Col_Bench1", Vector3(3.2, 0.48, 0.38), WreckStructure.get_world_pos(19.0, 0.24, 2.55))
	_add_rect_contact_shadow(fore_node, 19.0, 2.55, 3.35, 0.56, 0.0, 0.68)

	# Banco volcado con sus patas completas hacia proa despejando la puerta C7 y el rayo de suelo (22, 4)
	var bench2 = Node3D.new()
	bench2.name = "OverturnedBench_C7"
	bench2.position = WreckStructure.get_world_pos(23.1, 0.22, 4.72)
	bench2.rotation_degrees = Vector3(84, -22, 4)
	fore_node.add_child(bench2)
	var b2_top = MeshInstance3D.new()
	b2_top.mesh = b_box
	b2_top.material_override = mat_furniture
	b2_top.position = Vector3(0, 0.20, 0)
	bench2.add_child(b2_top)
	for lx2 in [-1.20, 1.20]:
		var bl2 = MeshInstance3D.new()
		var bl2_box = BoxMesh.new()
		bl2_box.size = Vector3(0.12, 0.40, 0.32)
		bl2.mesh = bl2_box
		bl2.material_override = mat_furniture_trim
		bl2.position = Vector3(lx2, 0.0, 0.0)
		bench2.add_child(bl2)
	PbrMaterialKit.add_box_collider(fore_node, "Col_Bench2", Vector3(2.9, 0.46, 0.50), WreckStructure.get_world_pos(23.1, 0.22, 4.72))
	_add_rect_contact_shadow(fore_node, 23.1, 4.72, 3.05, 0.68, 22.0, 0.66)

	# 3. Las 4 sillas podridas canónicas (c7-chair-01..04) alrededor del comedor
	_build_rotten_chair(fore_node, "C7_Chair_01", WreckStructure.get_world_pos(17.9, 0.0, 4.65), Vector3(0, 14, 0), false)
	_add_round_contact_shadow(fore_node, 17.9, 4.65, 0.38, 0.38, 0.68)

	_build_rotten_chair(fore_node, "C7_Chair_02", WreckStructure.get_world_pos(20.2, 0.0, 4.55), Vector3(8, -28, 12), false)
	_add_round_contact_shadow(fore_node, 20.2, 4.55, 0.38, 0.38, 0.68)

	_build_rotten_chair(fore_node, "C7_Chair_03", WreckStructure.get_world_pos(16.7, 0.24, 3.60), Vector3(0, 22, -84), true)
	_add_rect_contact_shadow(fore_node, 16.7, 3.60, 0.85, 0.56, 22.0, 0.66)

	_build_rotten_chair(fore_node, "C7_Chair_04", WreckStructure.get_world_pos(21.2, 0.0, 2.85), Vector3(-6, 145, 0), true)
	_add_round_contact_shadow(fore_node, 21.2, 2.85, 0.38, 0.38, 0.68)

	# 4. Vajilla caída, cristales y loza rotos esparcidos por el suelo (c7:shard)
	for dx in [17.4, 19.6]:
		var fallen_mug := MeshInstance3D.new()
		var fm_cyl := CylinderMesh.new()
		fm_cyl.top_radius = 0.06; fm_cyl.bottom_radius = 0.075; fm_cyl.height = 0.15
		fallen_mug.mesh = fm_cyl
		fallen_mug.material_override = mat_pewter
		fallen_mug.position = WreckStructure.get_world_pos(dx, 0.075, 4.95)
		fallen_mug.rotation_degrees = Vector3(84.0, dx * 22.0, 12.0)
		fore_node.add_child(fallen_mug)

	var mat_crockery := PbrMaterialKit.create_moldy_cloth_pbr("#c8beaa")
	var shard_spots := [
		Vector2(17.8, 4.25), Vector2(18.6, 5.05), Vector2(19.9, 4.30),
		Vector2(20.6, 4.85), Vector2(18.2, 2.95), Vector2(21.4, 3.65),
		Vector2(22.9, 4.50)
	]
	for si in range(shard_spots.size()):
		var sp: Vector2 = shard_spots[si]
		var shard := MeshInstance3D.new()
		var crockery_shard_box := BoxMesh.new()
		crockery_shard_box.size = Vector3(0.11 + float(si % 2) * 0.05, 0.02, 0.07)
		shard.mesh = crockery_shard_box
		shard.material_override = mat_shard_glass if si % 2 == 0 else mat_crockery
		shard.position = WreckStructure.get_world_pos(sp.x, 0.018, sp.y)
		shard.rotation_degrees = Vector3(0, float(si) * 47.0, 0)
		fore_node.add_child(shard)

	# 5. Aparador de servicio, tonel y caja astillada junto al mamparo de proa C7
	var mess_barrel_res = load("res://assets/models/barrel.glb")
	if mess_barrel_res:
		var mb_pos := WreckStructure.get_world_pos(25.8, 0.0, 2.3)
		var mb = mess_barrel_res.instantiate()
		mb.name = "MessBarrelC7"
		mb.position = mb_pos
		mb.scale = Vector3(0.82, 0.82, 0.82)
		PbrMaterialKit.apply_kenney_material(mb)
		fore_node.add_child(mb)
		PbrMaterialKit.add_cyl_collider(fore_node, "Col_MessBarrelC7", 0.40, 0.90, mb_pos + Vector3(0, 0.45, 0))
		_add_round_contact_shadow(fore_node, 25.8, 2.3, 0.56, 0.56, 0.68)

	var mess_crate_res = load("res://assets/models/crate.glb")
	if mess_crate_res:
		var mc_pos := WreckStructure.get_world_pos(25.5, 0.0, 3.6)
		var mc = mess_crate_res.instantiate()
		mc.name = "MessCrateC7"
		mc.position = mc_pos
		mc.rotation.y = -0.32
		mc.scale = Vector3(0.75, 0.75, 0.75)
		PbrMaterialKit.apply_kenney_material(mc)
		fore_node.add_child(mc)
		PbrMaterialKit.add_box_collider(fore_node, "Col_MessCrateC7", Vector3(0.76, 0.64, 0.76), mc_pos + Vector3(0, 0.32, 0))
		_add_rect_contact_shadow(fore_node, 25.5, 3.6, 0.92, 0.92, 18.0, 0.70)

	# Escudillas de roble y jarras de peltre sobre la mesa de rancho C7
	for plate_x in [-0.95, 0.15, 0.92]:
		var plate := MeshInstance3D.new()
		var pl_cyl := CylinderMesh.new()
		pl_cyl.top_radius = 0.16; pl_cyl.bottom_radius = 0.12; pl_cyl.height = 0.03
		plate.mesh = pl_cyl
		plate.material_override = mat_furniture
		plate.position = Vector3(plate_x, 0.825, -0.18 if plate_x < 0.0 else 0.16)
		table_node.add_child(plate)

	# Alacena marinera con cuencos + astillas de madera y filtración junto al costado de estribor en C7
	var cupboard := Node3D.new()
	cupboard.name = "MessCupboard_C7"
	cupboard.position = WreckStructure.get_world_pos(26.55, 0.0, 1.25)
	fore_node.add_child(cupboard)
	var cb_body := MeshInstance3D.new()
	var cbb_box := BoxMesh.new()
	cbb_box.size = Vector3(0.54, 1.55, 1.28)
	cb_body.mesh = cbb_box
	cb_body.material_override = mat_furniture_trim
	cb_body.position = Vector3(0.0, 0.78, 0.0)
	cupboard.add_child(cb_body)
	var cb_shelf := MeshInstance3D.new()
	var cbs_box := BoxMesh.new()
	cbs_box.size = Vector3(0.60, 0.06, 1.34)
	cb_shelf.mesh = cbs_box
	cb_shelf.material_override = mat_furniture
	cb_shelf.position = Vector3(-0.04, 1.56, 0.0)
	cupboard.add_child(cb_shelf)
	PbrMaterialKit.add_box_collider(cupboard, "Col_MessCupboardC7", Vector3(0.62, 1.60, 1.36), Vector3(0.0, 0.80, 0.0))
	_add_rect_contact_shadow(fore_node, 26.55, 1.25, 0.80, 1.52, 0.0, 0.72)

	# Astillas de casco roto en el borde exterior estribor de C7 donde presionan los restos del dragón
	var c7_splint_st := ShipGeometry.begin(mat_furniture_trim)
	for sp_x in [16.5, 19.8, 22.8]:
		var b_stbd := WreckStructure.get_beam_at(sp_x) - 0.55
		for k in range(3):
			var p_in := WreckStructure.get_world_pos(sp_x + float(k - 1) * 0.45, 0.06, b_stbd)
			ShipGeometry.beam(c7_splint_st, p_in, p_in + Vector3(0.28, 0.24 + float(k) * 0.14, -0.58), 0.14, 0.05, 0.22)
	ShipGeometry.commit(fore_node, "MessHullSplinters_C7", c7_splint_st)

	# Farol de sobremesa elevado en MessTable_C7 + aplique proel + luz de rebote interior C7
	build_wall_lantern(fore_node, WreckStructure.get_world_pos(18.5, 1.08, 3.55), "Lantern_C7_Mess", "table")
	build_wall_lantern(fore_node, WreckStructure.get_world_pos(25.2, 1.85, 2.20), "Lantern_C7_Forward", "wall_bracket")

	var c7_fill := OmniLight3D.new()
	c7_fill.name = "C7_InteriorFill"
	c7_fill.position = WreckStructure.get_world_pos(20.8, 2.25, 3.8)
	c7_fill.light_color = Color("#dfc9a8")
	c7_fill.light_energy = 1.62
	c7_fill.omni_range = 14.5
	c7_fill.omni_attenuation = 1.0
	c7_fill.shadow_enabled = false
	fore_node.add_child(c7_fill)

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
		var b0 := WreckStructure.get_beam_at(x0) * 0.93
		var b1 := WreckStructure.get_beam_at(x1) * 0.93
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

	# Forros interiores húmedos y mamparos cerrados de proa/popa de C8 (sin huecos hacia el fondo o exterior)
	_build_hull_interior_lining(c8_node, "HullInner_C8_Port", -29.0, 26.5, -3.55, -0.22, -1.0, 0.92, 0.96)
	_build_hull_interior_lining(c8_node, "HullInner_C8_Front", -29.0, 26.5, -3.55, -0.22, 1.0, 0.92, 0.96)
	var b_bow_c8 := WreckStructure.get_beam_at(26.5) * 0.95
	build_bulkhead_wall(c8_node, Vector3(26.5, -3.55, -b_bow_c8), Vector3(26.5, -3.55, b_bow_c8), 3.38, "Bulkhead_C8_BowWall")
	var b_stern_c8 := WreckStructure.get_beam_at(-29.0) * 0.95
	build_bulkhead_wall(c8_node, Vector3(-29.0, -3.55, -b_stern_c8), Vector3(-29.0, -3.55, b_stern_c8), 3.38, "Bulkhead_C8_SternWall")

	# Pantalla oscura de profundidad bajo el hueco de la escalera C8->C9 para no ver vacío brillante debajo
	var stair_abyss := MeshInstance3D.new()
	stair_abyss.name = "C8_StairWellAbyss"
	var sa_pl := PlaneMesh.new()
	sa_pl.size = Vector2(6.2, 2.1)
	stair_abyss.mesh = sa_pl
	var mat_abyss := StandardMaterial3D.new()
	mat_abyss.albedo_color = Color("#03090c")
	mat_abyss.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	stair_abyss.material_override = mat_abyss
	stair_abyss.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	stair_abyss.position = WreckStructure.get_world_pos(15.75, -3.95, 2.25)
	c8_node.add_child(stair_abyss)

	# Brazola rota del pozo vertical P13/P14 también en cubierta C8 + puntales y vigas maestras
	build_hole_rim(c8_node, WreckStructure.get_world_pos(-17.5, -3.35, -3.2), 0.82)
	c8_node.get_child(c8_node.get_child_count() - 1).name = "BreachP13Coaming_C8"
	_build_stanchions_and_beams(c8_node, "HullLowerStanchions_C8", [-11.5, -5.5, 1.5, 8.5], [-2.8, 2.6], -3.45, -0.15)

	# Lámina de agua inundada canónica al nivel del mar (-3.05m -> 45cm babor / 15cm estribor) sin grietas en bordes
	_build_contoured_water_plane(c8_node, "C8_FloodWater", WreckStructure.C8_FLOOD_START, WreckStructure.C8_FLOOD_END, WreckStructure.SEA_HEIGHT, WreckStructure.C8_FLOOD_BEAM, mat_flood_water)

	# Iluminación de sentina en penumbra interior real (legible pero claramente bajo cubierta, realzada por haces cenitales y faroles)
	var c8_light = OmniLight3D.new()
	c8_light.name = "C8_WaterGlimmer"
	c8_light.position = Vector3(-1.5, -1.65, 1.5)
	c8_light.light_color = Color("#4d8684")
	c8_light.light_energy = 1.05
	c8_light.omni_range = 22.0
	c8_light.omni_attenuation = 1.12
	c8_node.add_child(c8_light)

	for fill_cfg in [
		{"name": "C8_AftFill",  "pos": Vector3(-18.5, -1.25, -0.4), "col": "#44726e", "energy": 0.78, "range": 17.5},
		{"name": "C8_ForeFill", "pos": Vector3(15.0, -1.25, 0.2),   "col": "#467570", "energy": 0.72, "range": 17.0},
	]:
		var fill := OmniLight3D.new()
		fill.name = fill_cfg["name"]
		fill.position = fill_cfg["pos"]
		fill.light_color = Color(fill_cfg["col"])
		fill.light_energy = fill_cfg["energy"]
		fill.omni_range = fill_cfg["range"]
		fill.omni_attenuation = 1.15
		fill.shadow_enabled = false
		c8_node.add_child(fill)

	# Haces de luz cenital cayendo desde aberturas superiores (escalera P11, escotilla P12, boquete P13 y trampas C1)
	_build_c8_overhead_light_shafts(c8_node)

	# Transiciones canónicas desde C8 hacia C1 (P12), C4 (P13) y C9 (P14)
	var trans_p12_up := InteractiveTransition.new()
	trans_p12_up.name = "Trans_P12_Up"
	trans_p12_up.position = Vector3(-4.5, -3.12, -5.1)
	trans_p12_up.prompt_label = "Subir por Escotilla de Carga (P12 → C1)"
	trans_p12_up.destination = Vector3(-4.5, 0.15, -5.35)
	trans_p12_up.transition_mode = "hatch"
	trans_p12_up.trigger_radius = 1.9
	c8_node.add_child(trans_p12_up)

	var trans_p13_up := InteractiveTransition.new()
	trans_p13_up.name = "Trans_P13_Up"
	trans_p13_up.position = Vector3(-18.3, -3.12, -3.2)
	trans_p13_up.prompt_label = "Subir por Boquete P13 a Camarote C4 (cuerda)"
	trans_p13_up.destination = Vector3(-17.5, 0.15, -3.2)
	trans_p13_up.transition_mode = "hatch"
	trans_p13_up.trigger_radius = 1.65
	c8_node.add_child(trans_p13_up)

	var trans_p14_down := InteractiveTransition.new()
	trans_p14_down.name = "Trans_P14_Down"
	trans_p14_down.position = Vector3(-16.6, -3.12, -3.2)
	trans_p14_down.prompt_label = "Sumergirse por Agujero P14 a Bodega C9"
	trans_p14_down.destination = Vector3(-17.5, -6.10, -3.2)
	trans_p14_down.transition_mode = "swim"
	trans_p14_down.trigger_radius = 1.65
	c8_node.add_child(trans_p14_down)

	# Farol secundario de mamparo amarrado al puntal popel (-11.5, -1.40, -2.8) para iluminar la zona de popa y la brecha P13
	build_wall_lantern(c8_node, WreckStructure.get_world_pos(-11.5, -1.40, -2.42), "Lantern_C8_Aft", "wall")

	# Maderos rotos, bombas de sentina, estiba inundada en bahías laterales y rollo de cabo en C8 (pasillos libres)
	var c8_stave_st := ShipGeometry.begin(mat_furniture_trim)
	for drift in [
		[Vector3(-15.2, -3.02, -4.8), Vector3(-13.1, -3.00, -4.1), 0.26, 0.08],
		[Vector3(-3.8, -3.03, -4.5), Vector3(-1.4, -3.01, -4.9), 0.24, 0.08],
		[Vector3(3.2, -3.02, -4.6), Vector3(5.6, -3.00, -4.0), 0.25, 0.08],
		[Vector3(-12.4, -3.01, 4.7), Vector3(-10.0, -3.02, 4.2), 0.26, 0.08],
		[Vector3(14.2, -3.02, -4.2), Vector3(16.6, -3.01, -3.6), 0.24, 0.08],
	]:
		ShipGeometry.beam(c8_stave_st, drift[0], drift[1], drift[2], drift[3])
	ShipGeometry.commit(c8_node, "C8FloatingCargoTimbers", c8_stave_st)

	# Banda de algas húmedas y percebes a lo largo del forro interior babor inundado de C8
	for kx8 in [-22.0, -14.0, -6.0, 2.0, 10.0, 18.0]:
		var b8 := WreckStructure.get_beam_at(kx8) * 0.86
		PbrMaterialKit.add_kelp_strand(c8_node, WreckStructure.get_world_pos(kx8, -2.55, -b8), Vector3(0.0, -1.0, 0.25), 0.68, 0.14, 800 + int(absf(kx8)))

	for beam_cfg in [
		{"pos": Vector3(-10.2, -3.02, -4.4), "rot": Vector3(4, 28, -5),  "size": Vector3(2.4, 0.14, 0.28)},
		{"pos": Vector3(6.8, -3.00, -4.6),   "rot": Vector3(-3, -34, 6), "size": Vector3(2.1, 0.14, 0.26)},
		{"pos": Vector3(9.4, -3.01, 4.4),    "rot": Vector3(5, 19, 4),   "size": Vector3(1.85, 0.14, 0.26)},
	]:
		var debris_p := MeshInstance3D.new()
		var dp_box := BoxMesh.new()
		dp_box.size = beam_cfg["size"]
		debris_p.mesh = dp_box
		debris_p.material_override = mat_furniture_trim
		debris_p.position = beam_cfg["pos"]
		debris_p.rotation_degrees = beam_cfg["rot"]
		c8_node.add_child(debris_p)

	var c8_coil_st := ShipGeometry.begin(PbrMaterialKit.create_rope_cable_pbr("#4c4230"))
	var c8_spiral: Array[Vector3] = []
	for k in range(55):
		var t := float(k) / 54.0
		var r := lerpf(0.10, 0.44, t)
		var a := t * TAU * 2.1
		c8_spiral.append(Vector3(cos(a) * r, 0.03 + sin(t * PI) * 0.02, sin(a) * r))
	ShipGeometry.tube(c8_coil_st, c8_spiral, 0.034)
	var c8_coil := ShipGeometry.commit(c8_node, "C8BilgeRopeCoil", c8_coil_st)
	c8_coil.position = Vector3(-6.2, -3.06, -4.1)

	# Bomba de sentina de roble y brazo de hierro junto al puntal proel de C8 (sin obstruir pasillos)
	var pump_shaft := MeshInstance3D.new()
	pump_shaft.name = "BilgePump_C8"
	var ps_cyl := CylinderMesh.new()
	ps_cyl.top_radius = 0.15; ps_cyl.bottom_radius = 0.18; ps_cyl.height = 3.10
	pump_shaft.mesh = ps_cyl
	pump_shaft.material_override = mat_furniture_trim
	pump_shaft.position = WreckStructure.get_world_pos(1.55, -1.92, -3.25)
	c8_node.add_child(pump_shaft)

	var pump_lever := MeshInstance3D.new()
	var plv_box := BoxMesh.new()
	plv_box.size = Vector3(1.15, 0.06, 0.06)
	pump_lever.mesh = plv_box
	pump_lever.material_override = mat_metal
	pump_lever.position = WreckStructure.get_world_pos(1.85, -1.78, -3.25)
	pump_lever.rotation_degrees.z = 22.0
	c8_node.add_child(pump_lever)

	# Cajas y barriles flotantes de C8 con colisionadores físicos
	var crate_res = load("res://assets/models/crate.glb")
	var barrel_res = load("res://assets/models/barrel.glb")

	var floating_crates = [
		Vector3(-20.0, -3.06, -4.5),
		Vector3(-16.0, -3.06, 4.0),
		Vector3(-8.0, -3.06, -4.2),
		Vector3(10.5, -3.06, -4.0),
		Vector3(18.0, -3.06, 3.8)
	]
	for idx_fc in range(floating_crates.size()):
		var fcp: Vector3 = floating_crates[idx_fc]
		if crate_res:
			var fc = crate_res.instantiate()
			fc.name = "FloatingCrate_C8_%d" % idx_fc
			fc.position = fcp
			fc.rotation_degrees = Vector3(randf_range(-8, 8), randf_range(0, 360), randf_range(-8, 8))
			fc.scale = Vector3(0.88, 0.88, 0.88)
			PbrMaterialKit.apply_kenney_material(fc)
			c8_node.add_child(fc)
			PbrMaterialKit.add_box_collider(c8_node, "Col_C8Crate_%d" % idx_fc, Vector3(0.88, 0.95, 0.88), fcp + Vector3(0, 0.42, 0))
			var prop_crate := InteractiveProp.new()
			prop_crate.name = "PropC8Crate_%d" % idx_fc
			prop_crate.prop_id = "c8_crate_%d" % idx_fc
			prop_crate.prompt_text = "Abrir Caja de Carga (1d6 · C8)"
			prop_crate.inspection_message = "Caja mercantil medio sumergida en la sentina."
			prop_crate.position = fcp + Vector3(0, 0.25, 0)
			prop_crate.interaction_radius = 2.2
			c8_node.add_child(prop_crate)
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
			fb.name = "FloatingBarrel_C8_%d" % idx_fb
			fb.position = fbp
			fb.rotation_degrees = Vector3(randf_range(15, 35), randf_range(0, 360), randf_range(-10, 10))
			fb.scale = Vector3(0.82, 0.82, 0.82)
			PbrMaterialKit.apply_kenney_material(fb)
			c8_node.add_child(fb)
			PbrMaterialKit.add_cyl_collider(c8_node, "Col_C8Barrel_%d" % idx_fb, 0.42, 0.92, fbp + Vector3(0, 0.42, 0))
			var prop_barrel := InteractiveProp.new()
			prop_barrel.name = "PropC8Barrel_%d" % idx_fb
			prop_barrel.prop_id = "c8_crate_barrel_%d" % idx_fb
			prop_barrel.prompt_text = "Registrar Barril de Carga (1d6 · C8)"
			prop_barrel.inspection_message = "Barril podrido entre el agua salobre de la sentina."
			prop_barrel.position = fbp + Vector3(0, 0.25, 0)
			prop_barrel.interaction_radius = 2.1
			c8_node.add_child(prop_barrel)
		var fb_sh = PbrMaterialKit.create_blob_shadow(0.7, 0.7, 0.52)
		fb_sh.position = Vector3(fbp.x, -3.08, fbp.z)
		c8_node.add_child(fb_sh)

	var prop_bilge = InteractiveProp.new()
	prop_bilge.name = "PropBilgeWater"
	prop_bilge.prop_id = "c8_bilge"
	prop_bilge.prompt_text = "Vadear Aguas Turbias de la Sentina"
	prop_bilge.inspection_message = "El agua salobre te llega a las rodillas (15 cm a estribor, 45 cm a babor · terreno difícil). Pequeños cangrejos huyen entre las cuadernas."
	prop_bilge.position = Vector3(-2.0, -3.1, 0.5)
	prop_bilge.interaction_radius = 1.8
	c8_node.add_child(prop_bilge)

	_build_c8_piercing_dragon_bones(c8_node)

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

	# 1. Cofre de hierro sumergido en el limo (~60 kg · c9-iron-chest) con colisionador e interacción canónica
	var chest_res = load("res://assets/models/chest.glb")
	if chest_res:
		var c_inst = chest_res.instantiate()
		c_inst.name = "IronChestMesh_C9"
		c_inst.position = Vector3(-19.5, -6.32, -3.2)
		c_inst.rotation_degrees = Vector3(6, -22, -4)
		c_inst.scale = Vector3(0.82, 0.82, 0.82)
		PbrMaterialKit.apply_kenney_material(c_inst)
		c9_node.add_child(c_inst)
		PbrMaterialKit.add_box_collider(c9_node, "Col_C9IronChest", Vector3(0.95, 0.78, 0.72), Vector3(-19.5, -6.02, -3.2))

	var prop_c9_chest := InteractiveProp.new()
	prop_c9_chest.name = "PropIronChestC9"
	prop_c9_chest.prop_id = "c9_iron_chest"
	prop_c9_chest.prompt_text = "Cofre de Hierro Sumergido (~60 kg · C9)"
	prop_c9_chest.inspection_message = "Pesado cofre de hierro caído desde el camarote del capitán."
	prop_c9_chest.position = Vector3(-19.5, -6.0, -3.2)
	prop_c9_chest.interaction_radius = 2.6
	c9_node.add_child(prop_c9_chest)

	# 2 bolsas de aire respirables bajo las tablas del techo de C9 (PDF p. 26: escalera P15 y bajo P14)
	for ap in [
		{"name": "PropAirPocket_Stairs", "pos": Vector3(13.2, -3.95, 2.25), "prompt": "Respirar en Bolsa de Aire (Escalera P15)"},
		{"name": "PropAirPocket_P14",    "pos": Vector3(-17.5, -4.05, -3.2), "prompt": "Respirar en Bolsa de Aire (Bajo Agujero P14)"},
	]:
		var p_air := InteractiveProp.new()
		p_air.name = str(ap["name"])
		p_air.prop_id = "c9_air_pocket"
		p_air.prompt_text = str(ap["prompt"])
		p_air.inspection_message = "Bolsa de aire atrapada bajo las vigas de cubierta."
		p_air.position = ap["pos"]
		p_air.interaction_radius = 2.5
		c9_node.add_child(p_air)

	# Transiciones de salida de C9: P14 hacia C8 y brecha submarina P16 hacia el mar abierto
	var trans_p14_up := InteractiveTransition.new()
	trans_p14_up.name = "Trans_P14_Up"
	trans_p14_up.position = Vector3(-17.5, -6.05, -3.2)
	trans_p14_up.prompt_label = "Subir nadando por Agujero P14 a Sentina C8"
	trans_p14_up.destination = Vector3(-16.6, -3.22, -3.2)
	trans_p14_up.transition_mode = "swim"
	trans_p14_up.trigger_radius = 2.0
	c9_node.add_child(trans_p14_up)

	var trans_p16_out := InteractiveTransition.new()
	trans_p16_out.name = "Trans_P16_Out"
	trans_p16_out.position = Vector3(-29.1, -5.80, 0.0)
	trans_p16_out.prompt_label = "Salir nadando al Mar por Brecha de Popa (P16)"
	trans_p16_out.destination = Vector3(-33.0, -3.35, 0.0)
	trans_p16_out.transition_mode = "swim"
	trans_p16_out.trigger_radius = 2.2
	c9_node.add_child(trans_p16_out)

	var c9_chest_sh = PbrMaterialKit.create_blob_shadow(0.75, 0.6, 0.65)
	c9_chest_sh.position = Vector3(-19.5, -6.38, -3.2)
	c9_node.add_child(c9_chest_sh)

	# 2. Ecosistema marino vivo en C9 (corales, musgo orgánico realista, percebes y cardumen reactivo; sin piedras de lastre)
	_build_c9_marine_ecosystem(c9_node)

	# 2b. Volumen y atmósfera submarina canónica de Bodega C9 (completamente sumergida bajo -3.05m)
	_build_hull_interior_lining(c9_node, "HullInner_C9_Port", WreckStructure.STERN_X, 27.5, -6.45, -3.35, -1.0, 0.72, 0.88)
	_build_hull_interior_lining(c9_node, "HullInner_C9_Front", WreckStructure.STERN_X, 27.5, -6.45, -3.35, 1.0, 0.72, 0.88)
	_build_contoured_water_plane(c9_node, "C9_WaterSurface", WreckStructure.STERN_X, 27.5, WreckStructure.SEA_HEIGHT, 0.84, mat_hold_water)
	_build_contoured_water_plane(c9_node, "C9_CausticsOverlay", WreckStructure.STERN_X, 27.5, -6.34, 0.70, mat_caustics)

	# Tonel hundido con aros y ánforas de terracota junto al lastre de C9 (sin invadir pasillo central)
	var c9_barrel_res = load("res://assets/models/barrel.glb")
	if c9_barrel_res:
		for sb_cfg in [
			{"pos": Vector3(-14.6, -6.18, -2.65), "rot": Vector3(18.0, 28.0, -72.0)},
			{"pos": Vector3(-9.4, -6.12, 2.75),  "rot": Vector3(-12.0, -40.0, 82.0)},
		]:
			var s_bar = c9_barrel_res.instantiate()
			s_bar.position = sb_cfg["pos"]
			s_bar.rotation_degrees = sb_cfg["rot"]
			s_bar.scale = Vector3(0.84, 0.84, 0.84)
			PbrMaterialKit.apply_kenney_material(s_bar)
			c9_node.add_child(s_bar)

	# Haces volumétricos subacuáticos AAA (shader Fresnel suave + cáusticas animadas; sin conos plásticos rígidos)
	var mat_shaft := ShaderMaterial.new()
	mat_shaft.shader = preload("res://shaders/underwater_light_shaft.gdshader")
	mat_shaft.set_shader_parameter("shaft_color", Color(0.28, 0.80, 0.90, 1.0))
	mat_shaft.set_shader_parameter("intensity", 0.26)
	mat_shaft.set_shader_parameter("speed", 0.65)
	for sh_cfg in [
		{"pos": Vector3(-25.8, -4.65, 0.0),  "rot": Vector3(0.0, 0.0, 32.0),  "r_top": 0.52, "r_bot": 1.85, "h": 4.2},
		{"pos": Vector3(-17.4, -4.70, -3.1), "rot": Vector3(8.0, 0.0, -14.0), "r_top": 0.46, "r_bot": 1.55, "h": 3.6},
		{"pos": Vector3(12.2, -4.75, 2.2),   "rot": Vector3(0.0, 0.0, -18.0), "r_top": 0.50, "r_bot": 1.65, "h": 3.8},
	]:
		var shaft := MeshInstance3D.new()
		shaft.name = "UnderwaterLightShaft"
		var s_cone := CylinderMesh.new()
		s_cone.top_radius = sh_cfg["r_top"]
		s_cone.bottom_radius = sh_cfg["r_bot"]
		s_cone.height = sh_cfg["h"]
		s_cone.radial_segments = 20
		s_cone.cap_top = false
		s_cone.cap_bottom = false
		shaft.mesh = s_cone
		shaft.material_override = mat_shaft
		shaft.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		shaft.position = sh_cfg["pos"]
		shaft.rotation_degrees = sh_cfg["rot"]
		c9_node.add_child(shaft)

	# Ánforas de terracota hundidas y cadena de ancla oxidada en bahías laterales de C9 (pasillo central libre)
	var mat_amphora := PbrMaterialKit.create_oak_furniture_pbr("#8c533b", 0.65)
	mat_amphora.roughness = 0.72
	for amp_cfg in [
		{"pos": Vector3(-16.0, -6.18, -2.95), "rot": Vector3(24.0, 18.0, -62.0)},
		{"pos": Vector3(-15.3, -6.14, -3.20), "rot": Vector3(-12.0, 42.0, 18.0)},
		{"pos": Vector3(-8.2, -6.16, 2.95),   "rot": Vector3(68.0, -35.0, 12.0)},
	]:
		var amp := MeshInstance3D.new()
		var am_cyl := CylinderMesh.new()
		am_cyl.top_radius = 0.08; am_cyl.bottom_radius = 0.16; am_cyl.height = 0.54; am_cyl.radial_segments = 10
		amp.mesh = am_cyl
		amp.material_override = mat_amphora
		amp.position = amp_cfg["pos"]
		amp.rotation_degrees = amp_cfg["rot"]
		c9_node.add_child(amp)

	# Escalera inferior física en C9 para subir de vuelta a C8 sin teletransporte
	# Escalera visual idéntica en capa C9 sin collider duplicado (la rampa física única vive en Stairs_C8_C9)
	HullBuilder.build_physical_stair_flight(c9_node, "Stairs_C9_ExitRamp", 12.75, 18.75, -3.28, -6.40, 2.25, 0.72, 16, mat_floor_cabin, mat_furniture, false)
	_build_stanchions_and_beams(c9_node, "HullHoldStanchions_C9", [-23.0, -13.0, -5.5, 3.0, 9.5], [-2.0, 1.8], -6.42, -3.42)

	var breach_glow = OmniLight3D.new()
	breach_glow.name = "C9_SternBreachGlow"
	breach_glow.position = Vector3(-28.0, -4.6, 0.5)
	breach_glow.light_color = Color("#6ce0f2")
	breach_glow.light_energy = 3.0
	breach_glow.omni_range = 28.0
	breach_glow.omni_attenuation = 1.0
	c9_node.add_child(breach_glow)

	# Filtración natural legible de luz marina a través del boquete y de la escotilla de C8 (sin neón artificial)
	var mid_breach_spill = OmniLight3D.new()
	mid_breach_spill.name = "HoldBreachWater_Glow"
	mid_breach_spill.position = Vector3(-8.0, -4.25, 1.2)
	mid_breach_spill.light_color = Color("#58c6da")
	mid_breach_spill.light_energy = 2.85
	mid_breach_spill.omni_range = 29.0
	mid_breach_spill.omni_attenuation = 1.02
	c9_node.add_child(mid_breach_spill)

	var stair_spill = OmniLight3D.new()
	stair_spill.name = "HoldStairHatch_Glow"
	stair_spill.position = Vector3(11.5, -4.05, -0.5)
	stair_spill.light_color = Color("#5ec4d6")
	stair_spill.light_energy = 2.45
	stair_spill.omni_range = 24.0
	stair_spill.omni_attenuation = 1.04
	c9_node.add_child(stair_spill)

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
	prop_dragon_ribs.position = Vector3(-14.5, -6.0, 1.2)
	prop_dragon_ribs.interaction_radius = 2.2
	c9_node.add_child(prop_dragon_ribs)

	_build_c9_submerged_dragon_bones(c9_node)

func _build_c8_overhead_light_shafts(c8_node: Node3D) -> void:
	var beam_sh := load("res://shaders/underwater_light_shaft.gdshader") as Shader
	var mat_c8_shaft := ShaderMaterial.new()
	if beam_sh:
		mat_c8_shaft.shader = beam_sh
		mat_c8_shaft.set_shader_parameter("shaft_color", Color(0.76, 0.90, 0.92, 1.0))
		mat_c8_shaft.set_shader_parameter("intensity", 0.16)
		mat_c8_shaft.set_shader_parameter("speed", 0.24)

	var permanent_shafts := [
		{"name": "C8LightShaft_P11Stair", "pos": Vector3(1.5, -1.48, 5.15),   "r_top": 0.65, "r_bot": 1.65, "h": 2.95, "rot": Vector3(6.0, 0.0, -8.0),  "energy": 1.05, "visible": true},
		{"name": "C8LightShaft_P12Hatch", "pos": Vector3(-4.5, -1.48, -5.65), "r_top": 0.55, "r_bot": 1.35, "h": 2.95, "rot": Vector3(-8.0, 0.0, 7.0),  "energy": 0.85, "visible": true},
		{"name": "C8LightShaft_P13Hole",  "pos": Vector3(-17.5, -1.48, -3.2), "r_top": 0.52, "r_bot": 1.45, "h": 2.95, "rot": Vector3(5.0, 0.0, 11.0),  "energy": 1.00, "visible": true},
		# 4 haces ocultos que se revelan automáticamente cuando el jugador rompe las trampas de tablones en C1
		{"name": "C8TrapLightShaft_c1_weak_plank_1", "pos": Vector3(-4.2, -1.48, -1.6), "r_top": 0.44, "r_bot": 1.25, "h": 2.95, "rot": Vector3(4.0, 0.0, -6.0), "energy": 0.90, "visible": false},
		{"name": "C8TrapLightShaft_c1_weak_plank_2", "pos": Vector3(5.2, -1.48, 1.0),   "r_top": 0.44, "r_bot": 1.25, "h": 2.95, "rot": Vector3(4.0, 0.0, -6.0), "energy": 0.90, "visible": false},
		{"name": "C8TrapLightShaft_c1_weak_plank_3", "pos": Vector3(-3.8, -1.48, 3.4),  "r_top": 0.44, "r_bot": 1.25, "h": 2.95, "rot": Vector3(4.0, 0.0, -6.0), "energy": 0.90, "visible": false},
		{"name": "C8TrapLightShaft_c1_weak_plank_4", "pos": Vector3(5.8, -1.48, -2.6),  "r_top": 0.44, "r_bot": 1.25, "h": 2.95, "rot": Vector3(4.0, 0.0, -6.0), "energy": 0.90, "visible": false},
	]
	for sh in permanent_shafts:
		var holder := Node3D.new()
		holder.name = str(sh["name"])
		holder.position = sh["pos"]
		holder.visible = bool(sh["visible"])
		c8_node.add_child(holder)

		var ray := MeshInstance3D.new()
		ray.name = "ShaftCone"
		var cyl := CylinderMesh.new()
		cyl.top_radius = float(sh["r_top"])
		cyl.bottom_radius = float(sh["r_bot"])
		cyl.height = float(sh["h"])
		cyl.radial_segments = 16
		cyl.cap_top = false
		cyl.cap_bottom = false
		ray.mesh = cyl
		ray.material_override = mat_c8_shaft
		ray.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ray.rotation_degrees = sh["rot"]
		holder.add_child(ray)

		var pool_light := OmniLight3D.new()
		pool_light.name = "C8_ShaftLight_" + str(sh["name"])
		pool_light.position = Vector3(0.0, 0.25, 0.0)
		pool_light.light_color = Color("#b4d8dc")
		pool_light.light_energy = float(sh["energy"])
		pool_light.set_meta("c8_shaft_base_energy", float(sh["energy"]))
		pool_light.omni_range = 10.5
		pool_light.omni_attenuation = 1.12
		pool_light.shadow_enabled = false
		holder.add_child(pool_light)

func _append_c8_torn_breach(st_oak: SurfaceTool, st_dark: SurfaceTool, breach_center: Vector3, inward_dir: Vector3, rib_r: float, seed_val: int) -> void:
	var in_n := Vector3(inward_dir.x, 0.0, inward_dir.z).normalized()
	if in_n.length_squared() < 0.01:
		in_n = Vector3(0.0, 0.0, -1.0)
	var tan_v := Vector3(-in_n.z, 0.0, in_n.x).normalized()
	var up_v := Vector3(0.0, 1.0, 0.0)

	# 1. Grieta profunda de madera aplastada y rasgada rodeando la perforación del forro
	var hw := clampf(rib_r * 1.45, 0.42, 0.78)
	var hh := clampf(rib_r * 1.35, 0.40, 0.74)
	for vs in [-1.0, 1.0]:
		ShipGeometry.beam(st_dark, breach_center - tan_v * (hw * 1.35) + up_v * (vs * hh), breach_center + tan_v * (hw * 1.35) + up_v * (vs * hh), 0.16, 0.12, 0.85)
	for hs in [-1.0, 1.0]:
		ShipGeometry.beam(st_dark, breach_center + tan_v * (hs * hw * 1.05) - up_v * (hh * 1.15), breach_center + tan_v * (hs * hw * 1.05) + up_v * (hh * 1.15), 0.14, 0.12, 0.80)

	# 2. Tablas desgarradas del forro dobladas HACIA DENTRO en el sentido del impacto óseo (jamás pinchos verticales)
	var tear_specs := [
		[-1.0,  0.58, 0.96,  0.18, 0.46, 0.16],
		[ 1.0,  0.46, 0.88, -0.22, 0.42, 0.15],
		[-1.0, -0.24, 1.04, -0.16, 0.52, 0.17],
		[ 1.0, -0.38, 0.92,  0.20, 0.44, 0.15],
		[-0.5,  0.86, 0.72,  0.26, 0.36, 0.13],
		[ 0.5, -0.68, 0.78, -0.20, 0.38, 0.14],
	]
	for ti in range(tear_specs.size()):
		var ts: Array = tear_specs[ti]
		var s_t := float(ts[0])
		var s_y := float(ts[1])
		var plen := float(ts[2])
		var tilt := float(ts[3])
		var peel := float(ts[4])
		var w := float(ts[5])
		var jit := sin(float(seed_val * 7 + ti * 5)) * 0.08
		var p0 := breach_center + tan_v * (s_t * hw * 1.40) + up_v * (s_y * hh + jit) - in_n * 0.08
		var p1 := breach_center + tan_v * (s_t * (hw * 0.35 - plen * 0.18)) + up_v * (s_y * hh + tilt * 0.42 + jit) + in_n * (peel + absf(jit))
		ShipGeometry.beam(st_oak, p0, p1, w, 0.052, 0.22)

	# 3. Astillas caídas y tablones rotos flotando junto a la brecha en el agua de sentina
	var water_base := Vector3(breach_center.x, -3.03, breach_center.z) + in_n * 0.65
	for wi in range(3):
		var ang := float(seed_val * 3 + wi * 2) * 1.1
		var d_v := (tan_v * cos(ang) + in_n * sin(ang)).normalized()
		var c_w := water_base + tan_v * (float(wi - 1) * 0.48) + in_n * (0.28 + float(wi % 2) * 0.32)
		ShipGeometry.beam(st_oak, c_w - d_v * 0.46, c_w + d_v * 0.46, 0.14, 0.04, 0.30)

func _build_c8_piercing_dragon_bones(c8_node: Node3D) -> void:
	var bones_c8 := Node3D.new()
	bones_c8.name = "DragonBones_C8"
	c8_node.add_child(bones_c8)

	# Shader unificado de hueso antiguo de Clyssavar (idéntico al exterior y a C9)
	var mat_gold := PbrMaterialKit.create_dragon_bone_shader_material("#cbb580", "#3a301e")
	var mat_dark := PbrMaterialKit.create_dragon_bone_shader_material("#8e7950", "#292217")
	var st_gold := ShipGeometry.begin(mat_gold)
	var st_dark := ShipGeometry.begin(mat_dark)

	var mat_c8_splint := PbrMaterialKit.create_oak_furniture_pbr("#5c442c")
	mat_c8_splint.roughness = 0.92
	var mat_c8_fracture := PbrMaterialKit.create_weathered_hull_pbr("#1c140e")
	mat_c8_fracture.roughness = 0.98
	var st_oak := ShipGeometry.begin(mat_c8_splint)
	var st_dark_wood := ShipGeometry.begin(mat_c8_fracture)

	var mat_water_collar := StandardMaterial3D.new()
	mat_water_collar.albedo_color = Color(0.54, 0.68, 0.66, 0.34)
	mat_water_collar.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_water_collar.roughness = 0.45
	mat_water_collar.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED

	# 1. Costillas titánicas perforando el costado estribor de popa hacia C8 con brecha desgarrada real
	var aft_stbd_xs := [-26.5, -22.5, -18.5, -14.5, -10.5]
	for idx in range(aft_stbd_xs.size()):
		var x_pos: float = aft_stbd_xs[idx]
		var beam_here := WreckStructure.get_beam_at(x_pos) * 0.92
		var root := Vector3(x_pos, -3.45, beam_here + 0.55)
		var mid := Vector3(x_pos + 0.45, -1.25, beam_here - 1.55)
		var tip := Vector3(x_pos + 0.95, -0.48, beam_here - 3.35)
		DragonBonesBuilder.add_sculpted_rib_arch(st_gold, root, mid, tip, 0.54, 0.15, 10, 8)
		_append_c8_torn_breach(st_oak, st_dark_wood, Vector3(x_pos + 0.18, -2.35, beam_here - 0.08), Vector3(0.0, 0.0, -1.0), 0.52, idx + 1)

	# Espolón vertebral incrustado junto a la brecha de popa-estribor de C8
	var stern_spur: Array[Vector3] = [
		Vector3(-28.2, -3.35, 5.2),
		Vector3(-25.8, -2.65, 5.4),
		Vector3(-23.0, -2.85, 5.0),
		Vector3(-20.5, -3.30, 5.3),
	]
	DragonBonesBuilder.add_flanged_bone_tube(st_dark, stern_spur, 0.44, 0.38, 0.24, 0.20, 8, true, true)
	DragonBonesBuilder.add_vertebra_segment(st_gold, Vector3(-25.8, -2.65, 5.4), Vector3(1.0, 0.0, 0.0), 1.05)

	# 2. Costillas que perforan el forro babor-popa y las amuras de babor y estribor en proa (TODAS con pared rota y desgarrada!)
	var side_ribs := [
		{"root": Vector3(-26.5, -3.45, -7.2), "mid": Vector3(-25.5, -1.55, -5.8), "tip": Vector3(-24.2, -0.85, -4.6), "r": 0.48, "side": -1.0, "seed": 11},
		{"root": Vector3(19.2, -3.45, -7.4),  "mid": Vector3(19.6, -1.45, -5.8),  "tip": Vector3(20.0, -0.60, -4.4),  "r": 0.46, "side": -1.0, "seed": 12},
		{"root": Vector3(22.6, -3.45, -6.6),  "mid": Vector3(22.8, -1.60, -5.1),  "tip": Vector3(23.2, -0.78, -4.0),  "r": 0.42, "side": -1.0, "seed": 13},
		{"root": Vector3(21.4, -3.45,  7.0),  "mid": Vector3(21.2, -1.45,  5.4),  "tip": Vector3(20.8, -0.58,  4.1),  "r": 0.44, "side":  1.0, "seed": 14},
	]
	for sr in side_ribs:
		var r0: Vector3 = sr["root"]
		var r1: Vector3 = sr["mid"]
		var r2: Vector3 = sr["tip"]
		var side: float = float(sr["side"])
		DragonBonesBuilder.add_sculpted_rib_arch(st_gold, r0, r1, r2, float(sr["r"]), 0.13, 10, 8)
		var b_wall := WreckStructure.get_beam_at(r0.x) * 0.92
		var wall_hit := Vector3(r0.x + 0.15, -2.42, side * (b_wall - 0.06))
		_append_c8_torn_breach(st_oak, st_dark_wood, wall_hit, Vector3(0.0, 0.0, -side), float(sr["r"]), int(sr["seed"]))

		# Anillo de contacto húmedo donde la costilla rompe la lámina de agua de sentina
		var ring := MeshInstance3D.new()
		ring.name = "C8RibWaterRing_%d" % int(sr["seed"])
		var r_tor := TorusMesh.new()
		r_tor.inner_radius = float(sr["r"]) * 0.82
		r_tor.outer_radius = float(sr["r"]) * 1.48
		r_tor.rings = 14
		r_tor.ring_segments = 6
		ring.mesh = r_tor
		ring.material_override = mat_water_collar
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ring.position = Vector3(lerpf(r0.x, r1.x, 0.25), -3.035, lerpf(r0.z, r1.z, 0.25))
		ring.scale = Vector3(1.0, 0.14, 1.18)
		bones_c8.add_child(ring)

	ShipGeometry.commit(bones_c8, "C8BoneBreachSplinters", st_oak)
	ShipGeometry.commit(bones_c8, "C8BoneBreachFracture", st_dark_wood)
	DragonBonesBuilder._commit_bone_mesh(bones_c8, "C8PiercingRibsMesh", st_gold)
	DragonBonesBuilder._commit_bone_mesh(bones_c8, "C8FracturedSpineMesh", st_dark)

func _build_c9_submerged_dragon_bones(c9_node: Node3D) -> void:
	var bones_c9 := Node3D.new()
	bones_c9.name = "DragonBones_C9"
	c9_node.add_child(bones_c9)

	# Hueso sumergido con pátina marina y algas basales (shader unificado de Clyssavar)
	var mat_gold := PbrMaterialKit.create_dragon_bone_shader_material("#c4b282", "#312d21")
	var mat_dark := PbrMaterialKit.create_dragon_bone_shader_material("#8c7c56", "#25231b")
	var st_gold := ShipGeometry.begin(mat_gold)
	var st_dark := ShipGeometry.begin(mat_dark)

	# 5 costillas fósiles colosales perforando el casco sumergido de estribor en C9 junto a PropDragonRibs (-17, -6, 0)
	for x_pos in [-26.5, -22.5, -18.5, -14.5, -10.5]:
		var root := Vector3(x_pos, -6.55, 7.6)
		var mid := Vector3(x_pos + 0.4, -4.05, 5.0)
		var tip := Vector3(x_pos + 0.8, -3.65, 2.25)
		DragonBonesBuilder.add_sculpted_rib_arch(st_gold, root, mid, tip, 0.64, 0.18, 11, 8)

	# Arcos costales altos atravesando el techo de la bodega C9 (paso libre bajo y=-3.75)
	for ax in [-16.0, -11.5]:
		DragonBonesBuilder.add_sculpted_rib_arch(st_gold, Vector3(ax, -6.50, 7.4), Vector3(ax + 0.3, -3.68, 0.8), Vector3(ax + 0.6, -4.05, -4.2), 0.56, 0.22, 12, 8)

	# Costilla caída y vértebras parcialmente enterradas en el limo junto a PropDragonRibs (canal z=-2.2..1.6 y cofre -19.5 libres)
	DragonBonesBuilder.add_sculpted_rib_arch(st_gold, Vector3(-18.2, -6.48, 3.6), Vector3(-17.4, -5.65, 2.45), Vector3(-16.2, -6.28, 1.82), 0.46, 0.14, 9, 8)
	DragonBonesBuilder.add_flanged_bone_tube(st_dark, [
		Vector3(-25.8, -6.38, 3.2),
		Vector3(-21.8, -6.15, 2.55),
		Vector3(-17.2, -6.28, 2.15),
		Vector3(-12.5, -6.35, 3.0),
	], 0.52, 0.42, 0.30, 0.24, 8, true, true)
	DragonBonesBuilder.add_vertebra_segment(st_gold, Vector3(-21.8, -6.15, 2.55), Vector3(1.0, 0.0, -0.1), 1.15)
	DragonBonesBuilder.add_vertebra_segment(st_gold, Vector3(-17.2, -6.28, 2.15), Vector3(1.0, 0.0, -0.1), 1.05)

	# Contracostillas sumergidas de babor y esquirlas en proa-estribor de C9 (lejos de (5,-6.4,-3) y cofre)
	DragonBonesBuilder.add_sculpted_rib_arch(st_gold, Vector3(-26.5, -6.55, -7.0), Vector3(-25.6, -4.4, -5.2), Vector3(-24.6, -3.75, -3.8), 0.54, 0.16, 10, 8)
	DragonBonesBuilder.add_sculpted_rib_arch(st_gold, Vector3(-22.5, -6.55, -7.2), Vector3(-21.8, -4.5, -5.5), Vector3(-21.0, -3.85, -4.3), 0.50, 0.15, 10, 8)
	DragonBonesBuilder.add_sculpted_rib_arch(st_gold, Vector3(10.8, -6.55, 6.8), Vector3(11.4, -4.35, 5.2), Vector3(12.2, -3.80, 3.8), 0.52, 0.15, 10, 8)

	# Astillas interiores donde las costillas sumergidas perforan el casco de C9
	var mat_c9_splint := PbrMaterialKit.create_oak_furniture_pbr("#3d3124")
	mat_c9_splint.roughness = 0.90
	var st_c9_splint := ShipGeometry.begin(mat_c9_splint)
	for rx9 in [-26.5, -22.5]:
		for k9 in range(5):
			var ka9 := TAU * float(k9) / 5.0
			var p9 := Vector3(rx9 + cos(ka9) * 0.55, -5.55 + sin(ka9) * 0.45, -5.85)
			ShipGeometry.beam(st_c9_splint, p9, p9 + Vector3(cos(ka9) * 0.25, 0.52, 0.34), 0.14, 0.06, 0.18)
	ShipGeometry.commit(bones_c9, "C9BoneBreachSplinters", st_c9_splint)

	DragonBonesBuilder._commit_bone_mesh(bones_c9, "C9SubmergedRibsMesh", st_gold)
	DragonBonesBuilder._commit_bone_mesh(bones_c9, "C9HoldVertebraeMesh", st_dark)

func _build_c9_marine_ecosystem(c9_node: Node3D) -> void:
	_build_c9_corals(c9_node)
	_build_c9_realistic_moss(c9_node)
	_build_c9_barnacles(c9_node)
	_build_c9_fish_school(c9_node)

func _create_coral_pbr(hex: String, rough_val: float = 0.74, spec_val: float = 0.24) -> StandardMaterial3D:
	var mat := PbrMaterialKit.create_barnacle_pbr(hex)
	mat.roughness = rough_val
	mat.metallic_specular = spec_val
	mat.normal_scale = 0.95
	return mat

func _add_brain_coral_dome(st: SurfaceTool, center: Vector3, radius: float, height: float, seed_val: float) -> void:
	var segs := 10
	var mid_pts: Array[Vector3] = []
	var base_pts: Array[Vector3] = []
	for i in range(segs):
		var a := TAU * float(i) / float(segs)
		var w := 0.85 + 0.22 * sin(a * 3.0 + seed_val) + 0.10 * cos(a * 5.0 - seed_val)
		base_pts.append(center + Vector3(cos(a) * radius * w, 0.01, sin(a) * radius * w))
		mid_pts.append(center + Vector3(cos(a) * radius * 0.62 * w, height * (0.76 + 0.12 * cos(a * 4.0 + seed_val)), sin(a) * radius * 0.62 * w))
	var crown := center + Vector3(0.0, height, 0.0)
	for i in range(segs):
		var ni := (i + 1) % segs
		st.set_uv(Vector2(0.5, 0.5)); st.add_vertex(crown)
		st.set_uv(Vector2(0.0, 1.0)); st.add_vertex(mid_pts[i])
		st.set_uv(Vector2(1.0, 1.0)); st.add_vertex(mid_pts[ni])
		ShipGeometry.quad(st, mid_pts[i], base_pts[i], base_pts[ni], mid_pts[ni])

func _build_c9_corals(parent: Node3D) -> void:
	var root := Node3D.new()
	root.name = "Corals_C9"
	parent.add_child(root)

	var mat_stag := _create_coral_pbr("#e0a6b4", 0.44, 0.50)
	mat_stag.emission_enabled = true
	mat_stag.emission = Color("#5a3240")
	mat_stag.emission_energy_multiplier = 0.14
	var mat_ochre := _create_coral_pbr("#e3d2a8", 0.48, 0.42)
	var mat_teal := _create_coral_pbr("#66dfd8", 0.38, 0.58)
	mat_teal.emission_enabled = true
	mat_teal.emission = Color("#247c80")
	mat_teal.emission_energy_multiplier = 0.22

	var st_stag := ShipGeometry.begin(mat_stag)
	var st_ochre := ShipGeometry.begin(mat_ochre)
	var st_teal := ShipGeometry.begin(mat_teal)

	# Arrecifes ramificados y domos de coral cerebro en bahías laterales (pasillo central z in [-1.2, 1.2] libre)
	var stag_clusters := [
		{"pos": Vector3(-24.2, -6.39, -2.35), "yaw": 0.4,  "scale": 1.42},
		{"pos": Vector3(-16.2, -6.39, -2.45), "yaw": 1.1,  "scale": 1.56},
		{"pos": Vector3(-11.0, -6.39, 2.35),  "yaw": -0.7, "scale": 1.50},
		{"pos": Vector3(-6.0, -6.39, -2.35),  "yaw": 0.2,  "scale": 1.45},
		{"pos": Vector3(-1.4, -6.39, 2.45),   "yaw": 2.1,  "scale": 1.48},
		{"pos": Vector3(4.2, -6.39, -2.40),   "yaw": -1.3, "scale": 1.52},
		{"pos": Vector3(8.8, -6.39, 2.35),    "yaw": 0.85, "scale": 1.44},
		{"pos": Vector3(-19.8, -6.39, -2.45), "yaw": 2.4,  "scale": 1.32},
		{"pos": Vector3(11.4, -6.39, -2.25),  "yaw": 0.9,  "scale": 1.38},
	]
	for idx in range(stag_clusters.size()):
		var cl: Dictionary = stag_clusters[idx]
		var raw_center: Vector3 = cl["pos"]
		var center := WreckStructure.get_world_pos(raw_center.x, raw_center.y, raw_center.z)
		var yaw: float = cl["yaw"]
		var sc: float = cl["scale"]
		var sh := PbrMaterialKit.create_blob_shadow(0.58 * sc, 0.54 * sc, 0.48)
		sh.position = WreckStructure.get_world_pos(raw_center.x, -6.385, raw_center.z)
		root.add_child(sh)

		_add_brain_coral_dome(st_stag, center, 0.28 * sc, 0.20 * sc, float(idx) * 1.3)
		for b_i in range(6):
			var ba := yaw + TAU * float(b_i) / 6.0 + float((idx + b_i) % 3) * 0.14
			var lean := Vector3(cos(ba), 0.0, sin(ba))
			var base_p := center + lean * (0.07 * sc)
			var mid_p := center + lean * (0.25 * sc) + Vector3(0.0, 0.32 * sc, 0.0)
			var tip_a := mid_p + lean * (0.17 * sc) + Vector3(0.0, 0.28 * sc, 0.0)
			var side_dir := Vector3(-lean.z, 0.0, lean.x)
			var tip_b := mid_p + (lean * 0.12 + side_dir * 0.17) * sc + Vector3(0.0, 0.22 * sc, 0.0)
			var rad_main := 0.060 * sc
			ShipGeometry.tube(st_stag, [base_p, mid_p], rad_main, 6)
			ShipGeometry.tube(st_stag, [mid_p, tip_a], rad_main * 0.65, 5)
			ShipGeometry.tube(st_stag, [mid_p, tip_b], rad_main * 0.54, 5)

	# Esponjas tubulares / cáliz marfil junto al casco interior, toneles y brecha
	var tube_clusters := [
		Vector3(-27.2, -6.39, -2.05),
		Vector3(-18.5, -6.39, 2.15),
		Vector3(-14.6, -6.39, -2.10),
		Vector3(-9.6, -6.39, 2.35),
		Vector3(-3.8, -6.39, -2.25),
		Vector3(3.6, -6.39, 2.25),
		Vector3(10.6, -6.39, -2.35),
	]
	for t_idx in range(tube_clusters.size()):
		var raw_tc: Vector3 = tube_clusters[t_idx]
		var tc := WreckStructure.get_world_pos(raw_tc.x, raw_tc.y, raw_tc.z)
		var sh_t := PbrMaterialKit.create_blob_shadow(0.54, 0.50, 0.46)
		sh_t.position = WreckStructure.get_world_pos(raw_tc.x, -6.385, raw_tc.z)
		root.add_child(sh_t)
		_add_brain_coral_dome(st_ochre, tc + Vector3(0.18, 0.0, -0.14), 0.24, 0.18, float(t_idx) * 2.1)
		for k in range(5):
			var ka := TAU * float(k) / 5.0 + float(t_idx) * 0.55
			var tube_pos := tc + Vector3(cos(ka) * 0.20, 0.0, sin(ka) * 0.20)
			var h := 0.42 + 0.14 * float((k + t_idx) % 3)
			var top_off := Vector3(cos(ka) * 0.07, h, sin(ka) * 0.07)
			ShipGeometry.tube(st_ochre, [tube_pos, tube_pos + top_off * 0.55, tube_pos + top_off], 0.092 - float(k % 2) * 0.015, 7)

	# Abanicos marinos turquesa-coral adheridos a costillas sumergidas y puntales
	var fan_spots := [
		{"pos": Vector3(-22.8, -5.85, -2.05), "dir": Vector3(0.25, 0.25, 0.92)},
		{"pos": Vector3(-13.0, -5.70, 1.82),  "dir": Vector3(0.30, 0.28, -0.90)},
		{"pos": Vector3(-5.5, -5.90, -2.02),  "dir": Vector3(-0.20, 0.28, 0.92)},
		{"pos": Vector3(3.0, -5.75, 1.84),    "dir": Vector3(0.25, 0.25, -0.92)},
		{"pos": Vector3(-16.9, -5.65, 2.25),  "dir": Vector3(-0.22, 0.35, -0.90)},
		{"pos": Vector3(9.5, -5.80, -2.00),   "dir": Vector3(-0.25, 0.28, 0.92)},
	]
	for fs: Dictionary in fan_spots:
		var raw_or: Vector3 = fs["pos"]
		var origin := WreckStructure.get_world_pos(raw_or.x, raw_or.y, raw_or.z)
		var fwd: Vector3 = (fs["dir"] as Vector3).normalized()
		var up_v := Vector3(0.0, 1.0, 0.0)
		var right_v := fwd.cross(up_v).normalized()
		for r_i in range(-2, 3):
			var fan_dir := (fwd * 0.68 + right_v * (float(r_i) * 0.36) + up_v * (0.55 - absf(float(r_i)) * 0.06)).normalized()
			var p_mid := origin + fan_dir * 0.36
			var p_end := origin + fan_dir * 0.72
			ShipGeometry.tube(st_teal, [origin, p_mid, p_end], 0.036, 5)
			if r_i != 0:
				var twig := p_mid + (fan_dir * 0.65 + right_v * signf(float(r_i)) * 0.38).normalized() * 0.28
				ShipGeometry.tube(st_teal, [p_mid, twig], 0.024, 4)

	ShipGeometry.commit(root, "C9CoralsStaghorn", st_stag)
	ShipGeometry.commit(root, "C9CoralsTubeSponge", st_ochre)
	ShipGeometry.commit(root, "C9CoralsSeaFan", st_teal)

func _create_organic_moss_material(dark_hex: String, mid_hex: String, bright_hex: String) -> StandardMaterial3D:
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.seed = 417
	noise.frequency = 0.115
	noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	noise.fractal_octaves = 4
	noise.fractal_gain = 0.60

	var sz := 128
	var n_img := noise.get_seamless_image(sz, sz, false, false)
	var moss_img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	var c_dark := Color(dark_hex)
	var c_mid := Color(mid_hex)
	var c_bright := Color(bright_hex)

	for y in range(sz):
		for x in range(sz):
			var v := clampf(n_img.get_pixel(x, y).r, 0.0, 1.0)
			var col := c_dark.lerp(c_mid, clampf(v * 2.0, 0.0, 1.0)) if v < 0.5 else c_mid.lerp(c_bright, clampf((v - 0.5) * 2.0, 0.0, 1.0))
			moss_img.set_pixel(x, y, Color(col.r, col.g, col.b, 1.0))
	moss_img.generate_mipmaps()
	var moss_tex := ImageTexture.create_from_image(moss_img)

	var mat := StandardMaterial3D.new()
	mat.albedo_texture = moss_tex
	mat.albedo_color = Color(0.95, 1.0, 0.94, 1.0)
	mat.roughness = 0.78
	mat.metallic_specular = 0.22
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	mat.uv1_scale = Vector3(2.2, 2.2, 2.2)
	mat.uv1_triplanar = true
	mat.uv1_triplanar_sharpness = 2.6
	PbrMaterialKit._attach_pbr_channels(mat, moss_tex, 4.4, 1.30, 0.65, 0.94, 0.58)
	return mat

func _add_organic_moss_lobe(st_moss: SurfaceTool, st_kelp: SurfaceTool, center: Vector3, rad: float, h: float, seed_v: float) -> void:
	var ring_pts := 16
	var inner_pts: Array[Vector3] = []
	var outer_pts: Array[Vector3] = []
	for i in range(ring_pts):
		var ang := TAU * float(i) / float(ring_pts)
		var wobble := 0.74 + 0.18 * sin(ang * 2.0 + seed_v) + 0.12 * cos(ang * 5.0 + seed_v * 1.9) + 0.07 * sin(ang * 7.0 - seed_v)
		var inner_r := rad * 0.50 * wobble
		var outer_r := rad * wobble
		inner_pts.append(center + Vector3(cos(ang) * inner_r, h * (0.68 + 0.22 * cos(ang * 3.0 + seed_v)), sin(ang) * inner_r))
		outer_pts.append(center + Vector3(cos(ang) * outer_r, 0.008, sin(ang) * outer_r))
	var peak := center + Vector3(0.0, h * 1.10, 0.0)
	for i in range(ring_pts):
		var ni := (i + 1) % ring_pts
		st_moss.set_uv(Vector2(0.5, 0.5)); st_moss.add_vertex(peak)
		st_moss.set_uv(Vector2(0.0, 1.0)); st_moss.add_vertex(inner_pts[i])
		st_moss.set_uv(Vector2(1.0, 1.0)); st_moss.add_vertex(inner_pts[ni])
		ShipGeometry.quad(st_moss, inner_pts[i], outer_pts[i], outer_pts[ni], inner_pts[ni])

	for tuft in range(4):
		var ta := float(tuft) * 1.57 + seed_v
		var t_base := center + Vector3(cos(ta) * rad * 0.34, h * 0.35, sin(ta) * rad * 0.34)
		var t_tip := t_base + Vector3(cos(ta) * 0.11, 0.32 + 0.06 * float(tuft % 3), sin(ta) * 0.11)
		var s_v := Vector3(-sin(ta), 0.0, cos(ta)) * 0.075
		ShipGeometry.quad(st_kelp, t_base - s_v, t_base + s_v, t_tip + s_v * 0.25, t_tip - s_v * 0.25)

func _build_c9_realistic_moss(parent: Node3D) -> void:
	var root := Node3D.new()
	root.name = "SeaMoss_C9"
	parent.add_child(root)

	var mat_moss := _create_organic_moss_material("#1d3d20", "#325c2c", "#507c3e")
	var mat_kelp_ribbon := _create_organic_moss_material("#224626", "#396935", "#5a8c49")
	var st_moss := ShipGeometry.begin(mat_moss)
	var st_kelp := ShipGeometry.begin(mat_kelp_ribbon)

	# Manchas orgánicas asimétricas de musgo marino (lóbulo principal + sub-cojines periféricos para romper simetrías)
	var moss_spots := [
		{"pos": Vector3(-28.8, -6.39, -1.55), "r": 0.85, "h": 0.14},
		{"pos": Vector3(-28.4, -6.39, 1.50),  "r": 0.82, "h": 0.13},
		{"pos": Vector3(-23.2, -6.39, -1.95), "r": 0.94, "h": 0.14},
		{"pos": Vector3(-19.5, -5.82, -3.20), "r": 0.44, "h": 0.08},
		{"pos": Vector3(-15.5, -6.39, 2.05),  "r": 1.00, "h": 0.15},
		{"pos": Vector3(-14.6, -5.88, -2.65), "r": 0.40, "h": 0.08},
		{"pos": Vector3(-12.6, -6.39, -2.05), "r": 0.92, "h": 0.14},
		{"pos": Vector3(-9.4, -5.86, 2.75),   "r": 0.40, "h": 0.08},
		{"pos": Vector3(-5.3, -6.39, -1.95),  "r": 0.96, "h": 0.15},
		{"pos": Vector3(-0.8, -6.39, 2.05),   "r": 0.92, "h": 0.14},
		{"pos": Vector3(3.1, -6.39, -1.95),   "r": 0.98, "h": 0.15},
		{"pos": Vector3(7.6, -6.39, 2.00),    "r": 0.88, "h": 0.13},
		{"pos": Vector3(9.8, -6.39, -1.95),   "r": 0.92, "h": 0.14},
	]
	for idx in range(moss_spots.size()):
		var ms: Dictionary = moss_spots[idx]
		var raw_c: Vector3 = ms["pos"]
		var center := WreckStructure.get_world_pos(raw_c.x, raw_c.y, raw_c.z)
		var rad: float = ms["r"]
		var h: float = ms["h"]
		var seed_v := float(idx) * 2.13
		_add_organic_moss_lobe(st_moss, st_kelp, center, rad, h, seed_v)
		if rad > 0.7:
			var sub_a := seed_v * 0.7
			var sub_off := Vector3(cos(sub_a) * rad * 0.58, 0.0, sin(sub_a) * rad * 0.58)
			_add_organic_moss_lobe(st_moss, st_kelp, center + sub_off, rad * 0.56, h * 0.72, seed_v + 1.8)
			var sub_off2 := Vector3(cos(sub_a + 2.4) * rad * 0.52, 0.0, sin(sub_a + 2.4) * rad * 0.52)
			_add_organic_moss_lobe(st_moss, st_kelp, center + sub_off2, rad * 0.44, h * 0.58, seed_v + 3.4)

	# Tiras largas de algas/kelp onduladas colgando desde puntales sumergidos, brecha P16 y costillas
	var kelp_anchors := [
		Vector3(-30.3, -4.45, -1.40),
		Vector3(-30.3, -4.55, 1.40),
		Vector3(-23.0, -4.35, -2.02),
		Vector3(-23.0, -4.45, 1.82),
		Vector3(-13.0, -4.35, -2.02),
		Vector3(-13.0, -4.45, 1.82),
		Vector3(-5.5, -4.38, -2.02),
		Vector3(3.0, -4.42, 1.82),
		Vector3(9.5, -4.42, -2.02),
		Vector3(-17.8, -5.35, 2.38),
	]
	for k_i in range(kelp_anchors.size()):
		var top := WreckStructure.get_world_pos(kelp_anchors[k_i].x, kelp_anchors[k_i].y, kelp_anchors[k_i].z)
		for blade in range(3):
			var b_off := Vector3((float(blade) - 1.0) * 0.16, -float(blade % 2) * 0.12, (float((k_i + blade) % 3) - 1.0) * 0.12)
			var cur_p := top + b_off
			var segs := 6
			var blade_w := 0.14 - float(blade % 2) * 0.03
			for s in range(segs):
				var t0 := float(s) / float(segs)
				var t1 := float(s + 1) / float(segs)
				var w0 := blade_w * (1.0 - t0 * 0.55)
				var w1 := blade_w * (1.0 - t1 * 0.55)
				var sway0 := Vector3(sin(t0 * 4.5 + float(k_i + blade)) * 0.13, -t0 * 1.65, cos(t0 * 3.8 + float(blade)) * 0.10)
				var sway1 := Vector3(sin(t1 * 4.5 + float(k_i + blade)) * 0.13, -t1 * 1.65, cos(t1 * 3.8 + float(blade)) * 0.10)
				var p0 := cur_p + sway0
				var p1 := cur_p + sway1
				var side := Vector3(0.0, 0.0, 1.0).rotated(Vector3.UP, float(k_i + blade) * 0.9)
				ShipGeometry.quad(st_kelp, p0 - side * w0, p0 + side * w0, p1 + side * w1, p1 - side * w1)

	ShipGeometry.commit(root, "C9SeaMossPatches", st_moss)
	ShipGeometry.commit(root, "C9KelpRibbons", st_kelp)

func _add_barnacle_cone(st_shell: SurfaceTool, st_pit: SurfaceTool, origin: Vector3, normal: Vector3, base_r: float, height: float) -> void:
	var n := normal.normalized()
	var ref := Vector3.UP if absf(n.dot(Vector3.UP)) < 0.92 else Vector3.RIGHT
	var u := n.cross(ref).normalized()
	var v := n.cross(u).normalized()
	var top_c := origin + n * height
	var top_r := base_r * 0.44
	var sides := 6
	for s in range(sides):
		var a0 := TAU * float(s) / float(sides)
		var a1 := TAU * float((s + 1) % sides) / float(sides)
		var b0 := origin + (u * cos(a0) + v * sin(a0)) * base_r
		var b1 := origin + (u * cos(a1) + v * sin(a1)) * base_r
		var t0 := top_c + (u * cos(a0) + v * sin(a0)) * top_r
		var t1 := top_c + (u * cos(a1) + v * sin(a1)) * top_r
		ShipGeometry.quad(st_shell, b0, b1, t1, t0)
		var p_center := top_c - n * (height * 0.25)
		st_pit.set_uv(Vector2(0.5, 0.5)); st_pit.add_vertex(p_center)
		st_pit.set_uv(Vector2(0.0, 0.0)); st_pit.add_vertex(t1)
		st_pit.set_uv(Vector2(1.0, 0.0)); st_pit.add_vertex(t0)

func _build_c9_barnacles(parent: Node3D) -> void:
	var root := Node3D.new()
	root.name = "Barnacles_C9"
	parent.add_child(root)

	var mat_shell := PbrMaterialKit.create_barnacle_pbr("#ebe5d4")
	mat_shell.roughness = 0.66
	mat_shell.metallic_specular = 0.30
	var mat_pit := PbrMaterialKit.create_barnacle_pbr("#1d2320")
	mat_pit.roughness = 0.95

	var st_shell := ShipGeometry.begin(mat_shell)
	var st_pit := ShipGeometry.begin(mat_pit)

	# Racimos densos de percebes calcáreos en cara interior del forro (ajustados a HullInner_C9_Port/Front con get_world_pos)
	for side_z: float in [-1.0, 1.0]:
		for bx in range(-28, 22, 4):
			var fx := float(bx)
			for row in range(2):
				var cy := -5.95 + float(row) * 0.78
				var t_h := clampf((cy - (-6.45)) / (-3.35 - (-6.45)), 0.0, 1.0)
				var wall_factor := lerpf(0.72, 0.88, t_h)
				var wall_z: float = side_z * WreckStructure.get_beam_at(fx) * wall_factor
				var center := WreckStructure.get_world_pos(fx + float(row) * 0.55, cy, wall_z)
				var nrm := Vector3(0.0, 0.25, -side_z).normalized()
				var tan_x := Vector3(1.0, 0.0, 0.0)
				for k in range(6):
					var ka := TAU * float(k) / 6.0
					var p := center + tan_x * (cos(ka) * 0.32) + Vector3(0.0, sin(ka) * 0.25, 0.0)
					_add_barnacle_cone(st_shell, st_pit, p, nrm, 0.078 + 0.025 * float(k % 3), 0.068 + 0.024 * float((k + row) % 2))

	# Percebes incrustados en las zonas iluminadas por cáusticas: pies de puntales, entablado lateral, costillas, brecha P16, cofre y toneles
	var prop_barnacle_clusters := [
		{"pos": Vector3(-30.5, -5.8, -1.45), "nrm": Vector3(0.7, 0.2, 0.7)},
		{"pos": Vector3(-30.5, -5.8, 1.45),  "nrm": Vector3(0.7, 0.2, -0.7)},
		{"pos": Vector3(-23.0, -6.28, -1.96), "nrm": Vector3(0.15, 0.80, 0.55)},
		{"pos": Vector3(-13.0, -6.28, 1.76),  "nrm": Vector3(0.15, 0.80, -0.55)},
		{"pos": Vector3(-5.5, -6.28, -1.96),  "nrm": Vector3(0.0, 0.85, 0.52)},
		{"pos": Vector3(3.0, -6.28, 1.76),    "nrm": Vector3(0.0, 0.85, -0.52)},
		{"pos": Vector3(9.5, -6.28, -1.96),   "nrm": Vector3(-0.15, 0.85, 0.50)},
		{"pos": Vector3(-8.2, -6.38, -2.15),  "nrm": Vector3(0.0, 0.98, 0.15)},
		{"pos": Vector3(-2.4, -6.38, 1.92),   "nrm": Vector3(0.0, 0.98, -0.15)},
		{"pos": Vector3(1.4, -6.38, -2.05),   "nrm": Vector3(0.0, 0.98, 0.15)},
		{"pos": Vector3(6.4, -6.38, 1.85),    "nrm": Vector3(0.0, 0.98, -0.15)},
		{"pos": Vector3(-19.5, -6.08, -2.85), "nrm": Vector3(0.2, 0.55, 0.80)},
		{"pos": Vector3(-14.6, -5.95, -2.65), "nrm": Vector3(0.0, 0.95, 0.2)},
		{"pos": Vector3(-9.4, -5.92, 2.75),   "nrm": Vector3(0.0, 0.95, -0.2)},
		{"pos": Vector3(-21.8, -5.92, 2.55),  "nrm": Vector3(0.0, 0.90, -0.4)},
		{"pos": Vector3(-17.2, -6.02, 2.15),  "nrm": Vector3(0.0, 0.90, -0.4)},
	]
	for bc: Dictionary in prop_barnacle_clusters:
		var raw_bp: Vector3 = bc["pos"]
		var cpos := WreckStructure.get_world_pos(raw_bp.x, raw_bp.y, raw_bp.z)
		var cnrm: Vector3 = (bc["nrm"] as Vector3).normalized()
		var t_a := cnrm.cross(Vector3.UP if absf(cnrm.y) < 0.9 else Vector3.RIGHT).normalized()
		var t_b := cnrm.cross(t_a).normalized()
		for k in range(7):
			var ka := TAU * float(k) / 7.0
			var dist := 0.06 if k == 0 else 0.24
			var off := (t_a * cos(ka) + t_b * sin(ka)) * dist
			_add_barnacle_cone(st_shell, st_pit, cpos + off, cnrm, 0.075 + 0.025 * float(k % 3), 0.062 + 0.022 * float(k % 2))

	ShipGeometry.commit(root, "C9BarnacleShells", st_shell)
	ShipGeometry.commit(root, "C9BarnacleApertures", st_pit)

func _build_fish_template_meshes(body_hex: String, belly_hex: String, fin_hex: String, body_len: float) -> Dictionary:
	# Textura procedural de escamas iridiscentes y franjas dorsales para evitar peces triangulares planos
	var fish_img := Image.create(32, 16, false, Image.FORMAT_RGBA8)
	var c_top := Color(body_hex).darkened(0.22)
	var c_mid := Color(body_hex).lightened(0.10)
	var c_bot := Color(belly_hex)
	for fy in range(16):
		var v := float(fy) / 15.0
		var row_col := c_top.lerp(c_mid, clampf(v * 2.0, 0.0, 1.0)) if v < 0.5 else c_mid.lerp(c_bot, (v - 0.5) * 2.0)
		for fx in range(32):
			var u := float(fx) / 31.0
			var stripe := 0.88 + 0.18 * sin(u * TAU * 4.5) * (1.0 - v)
			var eye := (Vector2(u, v).distance_to(Vector2(0.82, 0.36)) < 0.09)
			var px := Color(0.06, 0.09, 0.12, 1.0) if eye else Color(row_col.r * stripe, row_col.g * stripe, row_col.b * stripe, 1.0)
			fish_img.set_pixel(fx, fy, px)
	fish_img.generate_mipmaps()
	var fish_tex := ImageTexture.create_from_image(fish_img)

	var mat_body := StandardMaterial3D.new()
	mat_body.albedo_texture = fish_tex
	mat_body.albedo_color = Color.WHITE
	mat_body.roughness = 0.18
	mat_body.metallic = 0.34
	mat_body.metallic_specular = 0.88

	var mat_belly := StandardMaterial3D.new()
	mat_belly.albedo_texture = fish_tex
	mat_belly.albedo_color = Color(belly_hex).lightened(0.15)
	mat_belly.roughness = 0.16
	mat_belly.metallic = 0.36
	mat_belly.metallic_specular = 0.90

	var mat_fin := StandardMaterial3D.new()
	mat_fin.albedo_color = Color(fin_hex)
	mat_fin.roughness = 0.32
	mat_fin.cull_mode = BaseMaterial3D.CULL_DISABLED

	# Fuselaje 3D con orientación -Z hacia la nariz y +Z hacia la cola (dorso + vientre)
	var st_body := SurfaceTool.new()
	st_body.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_body.set_material(mat_body)

	var st_belly := SurfaceTool.new()
	st_belly.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_belly.set_material(mat_belly)

	var hl := body_len * 0.5
	var w := body_len * 0.15
	var h := body_len * 0.26
	var nose := Vector3(0.0, 0.0, -hl)
	var peduncle := Vector3(0.0, 0.0, hl)
	var ring_a := [
		Vector3(0.0, h * 0.72, -hl * 0.38),
		Vector3(w * 0.85, 0.0, -hl * 0.38),
		Vector3(0.0, -h * 0.62, -hl * 0.38),
		Vector3(-w * 0.85, 0.0, -hl * 0.38),
	]
	var ring_b := [
		Vector3(0.0, h, 0.0),
		Vector3(w, 0.0, 0.0),
		Vector3(0.0, -h * 0.78, 0.0),
		Vector3(-w, 0.0, 0.0),
	]
	var ring_c := [
		Vector3(0.0, h * 0.45, hl * 0.58),
		Vector3(w * 0.42, 0.0, hl * 0.58),
		Vector3(0.0, -h * 0.38, hl * 0.58),
		Vector3(-w * 0.42, 0.0, hl * 0.58),
	]
	for k in range(4):
		var nk := (k + 1) % 4
		var st_side := st_belly if (k == 1 or k == 2) else st_body
		st_side.set_uv(Vector2(0, 0)); st_side.add_vertex(nose)
		st_side.set_uv(Vector2(1, 0)); st_side.add_vertex(ring_a[nk])
		st_side.set_uv(Vector2(0, 1)); st_side.add_vertex(ring_a[k])
		ShipGeometry.quad(st_side, ring_a[k], ring_a[nk], ring_b[nk], ring_b[k])
		ShipGeometry.quad(st_side, ring_b[k], ring_b[nk], ring_c[nk], ring_c[k])
		st_side.set_uv(Vector2(0, 0)); st_side.add_vertex(peduncle)
		st_side.set_uv(Vector2(1, 0)); st_side.add_vertex(ring_c[k])
		st_side.set_uv(Vector2(0, 1)); st_side.add_vertex(ring_c[nk])
	st_body.generate_normals()
	var body_mesh := st_body.commit()
	st_belly.generate_normals()
	st_belly.commit(body_mesh)

	# Aleta dorsal y aletas pectorales compartidas en superficie del cuerpo
	var st_fins := SurfaceTool.new()
	st_fins.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_fins.set_material(mat_fin)
	ShipGeometry.quad(
		st_fins,
		Vector3(0.0, h * 0.85, -hl * 0.15),
		Vector3(0.0, h * 1.52, hl * 0.08),
		Vector3(0.0, h * 1.28, hl * 0.36),
		Vector3(0.0, h * 0.55, hl * 0.32)
	)
	for side_x in [-1.0, 1.0]:
		ShipGeometry.quad(
			st_fins,
			Vector3(side_x * w * 0.85, -h * 0.10, -hl * 0.25),
			Vector3(side_x * w * 2.25, -h * 0.34, hl * 0.08),
			Vector3(side_x * w * 1.95, -h * 0.42, hl * 0.24),
			Vector3(side_x * w * 0.80, -h * 0.22, -hl * 0.02)
		)
	st_fins.generate_normals()
	st_fins.commit(body_mesh)

	# Aleta caudal bifurcada separada para rotar desde TailPivot (+Z respecto al centro)
	var st_tail := SurfaceTool.new()
	st_tail.begin(Mesh.PRIMITIVE_TRIANGLES)
	st_tail.set_material(mat_fin)
	var tl := body_len * 0.36
	var th := body_len * 0.28
	st_tail.set_uv(Vector2(0, 0.5)); st_tail.add_vertex(Vector3.ZERO)
	st_tail.set_uv(Vector2(1, 0));   st_tail.add_vertex(Vector3(0.0, th, tl))
	st_tail.set_uv(Vector2(0.7, 0.5)); st_tail.add_vertex(Vector3(0.0, 0.0, tl * 0.55))
	st_tail.set_uv(Vector2(0, 0.5)); st_tail.add_vertex(Vector3.ZERO)
	st_tail.set_uv(Vector2(0.7, 0.5)); st_tail.add_vertex(Vector3(0.0, 0.0, tl * 0.55))
	st_tail.set_uv(Vector2(1, 1));   st_tail.add_vertex(Vector3(0.0, -th * 0.92, tl))
	st_tail.generate_normals()
	var tail_mesh := st_tail.commit()

	return {"body_mesh": body_mesh, "tail_mesh": tail_mesh, "peduncle_z": hl}

func _build_c9_fish_school(parent: Node3D) -> void:
	c9_fish.clear()
	_c9_fish_actors.clear()
	var root := Node3D.new()
	root.name = "FishSchool_C9"
	parent.add_child(root)

	var bream_tpl := _build_fish_template_meshes("#8ec8d4", "#dff1f4", "#6396a6", 0.78)
	var perch_tpl := _build_fish_template_meshes("#ded0ac", "#f2ecda", "#aa9a74", 0.68)

	var fish_spawns := [
		{"pos": Vector3(-22.5, -5.05, -0.6), "dir": Vector3(0.9, 0.0, 0.4),  "tpl": 0, "sc": 1.05},
		{"pos": Vector3(-20.6, -4.85, 0.9),  "dir": Vector3(0.8, 0.0, -0.5), "tpl": 1, "sc": 0.96},
		{"pos": Vector3(-16.5, -5.15, 0.5),  "dir": Vector3(-0.7, 0.0, 0.6), "tpl": 0, "sc": 1.12},
		{"pos": Vector3(-14.2, -4.78, -0.9), "dir": Vector3(0.6, 0.0, 0.7),  "tpl": 0, "sc": 0.94},
		{"pos": Vector3(-9.8, -5.20, -0.3),  "dir": Vector3(-0.9, 0.0, -0.3),"tpl": 1, "sc": 1.04},
		{"pos": Vector3(-7.2, -4.88, 1.3),   "dir": Vector3(0.7, 0.0, -0.6), "tpl": 0, "sc": 1.10},
		{"pos": Vector3(-4.2, -5.10, -1.1),  "dir": Vector3(-0.5, 0.0, 0.8), "tpl": 1, "sc": 0.95},
		{"pos": Vector3(-1.2, -4.82, 0.8),   "dir": Vector3(0.8, 0.0, 0.5),  "tpl": 0, "sc": 1.06},
		{"pos": Vector3(1.8, -5.18, -1.4),   "dir": Vector3(-0.8, 0.0, 0.4), "tpl": 0, "sc": 0.98},
		{"pos": Vector3(4.5, -4.90, 1.2),    "dir": Vector3(-0.6, 0.0, -0.7),"tpl": 1, "sc": 1.08},
		{"pos": Vector3(6.8, -5.22, -0.6),   "dir": Vector3(-0.9, 0.0, 0.2), "tpl": 0, "sc": 1.02},
		{"pos": Vector3(9.0, -4.86, 0.5),    "dir": Vector3(-0.7, 0.0, 0.6), "tpl": 1, "sc": 0.92},
		{"pos": Vector3(-3.0, -5.30, 2.0),   "dir": Vector3(0.6, 0.0, -0.7), "tpl": 0, "sc": 1.05},
		{"pos": Vector3(2.8, -5.00, 1.7),    "dir": Vector3(-0.9, 0.0, 0.3), "tpl": 1, "sc": 1.00},
		{"pos": Vector3(-6.2, -4.95, -2.0),  "dir": Vector3(0.8, 0.0, 0.5),  "tpl": 0, "sc": 1.08},
	]
	for idx in range(fish_spawns.size()):
		var cfg: Dictionary = fish_spawns[idx]
		var tpl: Dictionary = bream_tpl if int(cfg["tpl"]) == 0 else perch_tpl
		var fish_root := Node3D.new()
		fish_root.name = "Fish_C9_%02d" % (idx + 1)
		fish_root.position = cfg["pos"]
		fish_root.scale = Vector3.ONE * float(cfg["sc"])
		var init_dir: Vector3 = (cfg["dir"] as Vector3).normalized()
		fish_root.rotation.y = atan2(-init_dir.x, -init_dir.z)

		var body_mi := MeshInstance3D.new()
		body_mi.name = "Body"
		body_mi.mesh = tpl["body_mesh"]
		body_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		fish_root.add_child(body_mi)

		var tail_pivot := Node3D.new()
		tail_pivot.name = "TailPivot"
		tail_pivot.position = Vector3(0.0, 0.0, float(tpl["peduncle_z"]))
		var tail_mi := MeshInstance3D.new()
		tail_mi.name = "TailFin"
		tail_mi.mesh = tpl["tail_mesh"]
		tail_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		tail_pivot.add_child(tail_mi)
		fish_root.add_child(tail_pivot)

		root.add_child(fish_root)
		c9_fish.append({
			"node": fish_root,
			"tail": tail_pivot,
			"home": cfg["pos"],
			"vel": init_dir * 0.78,
			"base_speed": 0.68 + 0.08 * float(idx % 4),
			"phase": float(idx) * 1.17,
		})

func _refresh_c9_fish_actors() -> void:
	if not _c9_fish_actors.is_empty():
		return
	var search_root := get_parent() if get_parent() else get_tree().current_scene
	if not search_root:
		return
	for actor_name in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken", "ZombieToken"]:
		var tok := search_root.find_child(actor_name, true, false) as Node3D
		if tok:
			_c9_fish_actors.append(tok)

func _update_c9_fish(delta: float) -> void:
	var dt := minf(delta, 0.05)
	_fish_anim_time += dt
	_refresh_c9_fish_actors()

	# Actores actualmente sumergidos o cercanos a la bodega C9 en espacio local del cardumen
	var fish_root: Node3D = c9_fish[0]["node"].get_parent() as Node3D
	var c9_threats: Array[Dictionary] = []
	for actor in _c9_fish_actors:
		if not is_instance_valid(actor):
			continue
		var actor_local: Vector3 = fish_root.to_local(actor.global_position) if fish_root else actor.position
		if actor_local.y < -3.65:
			c9_threats.append({
				"pos": actor_local,
				"radius": 5.8 if bool(actor.get("is_active_player")) else 4.5,
			})

	for entry in c9_fish:
		var fish: Node3D = entry["node"]
		if not is_instance_valid(fish):
			continue
		var pos: Vector3 = fish.position
		var vel: Vector3 = entry["vel"]
		var home: Vector3 = entry["home"]
		var phase: float = entry["phase"]
		var base_speed: float = entry["base_speed"]

		var steer := Vector3.ZERO
		var fleeing := false

		# Evasión reactiva al acercarse cualquier héroe/token a los peces
		for threat: Dictionary in c9_threats:
			var tpos: Vector3 = threat["pos"]
			var tradius: float = threat["radius"]
			var to_fish := pos - tpos
			var dist := Vector2(to_fish.x, to_fish.z).length()
			if dist < tradius and absf(to_fish.y) < 3.2:
				fleeing = true
				var strength := clampf(1.0 - dist / tradius, 0.15, 1.0)
				var escape_dir := Vector3(to_fish.x, to_fish.y * 0.25, to_fish.z)
				if escape_dir.length_squared() < 0.001:
					escape_dir = Vector3(cos(phase), 0.0, sin(phase))
				steer += escape_dir.normalized() * (6.5 * strength)

		# Patrulla sinusoidal tranquila por su zona en la bodega cuando no hay amenaza
		var orbit_target := Vector3(
			clampf(home.x + cos(_fish_anim_time * 0.42 + phase) * 3.1, -26.5, 11.2),
			clampf(home.y + sin(_fish_anim_time * 0.75 + phase) * 0.22, -5.65, -4.50),
			home.z + sin(_fish_anim_time * 0.56 + phase * 1.3) * 1.45
		)
		if not fleeing:
			steer += (orbit_target - pos) * 0.72

		# Contención estricta dentro del casco de Bodega C9 (y evita colisionar con escalera C8/C9)
		var max_z := maxf(1.15, WreckStructure.get_beam_at(clampf(pos.x, -29.0, 24.0)) * 0.62)
		if pos.x < -27.2: steer.x += (-27.2 - pos.x) * 4.5
		if pos.x > 11.4:  steer.x -= (pos.x - 11.4) * 4.5
		if pos.z > max_z: steer.z -= (pos.z - max_z) * 5.2
		if pos.z < -max_z: steer.z += (-max_z - pos.z) * 5.2
		if pos.x > 10.0 and pos.z > 0.65:
			steer += Vector3(-3.2, 0.0, -3.5)
		if pos.y < -5.70: steer.y += (-5.70 - pos.y) * 4.8
		if pos.y > -4.48: steer.y -= (pos.y - (-4.48)) * 4.8

		var target_speed := 3.35 if fleeing else base_speed
		vel = vel.lerp((vel + steer * dt * 2.8).normalized() * target_speed, clampf(dt * (6.2 if fleeing else 2.6), 0.0, 1.0))
		pos += vel * dt
		pos.x = clampf(pos.x, -28.0, 12.0)
		pos.y = clampf(pos.y, -5.80, -4.42)
		var clamp_z := maxf(1.20, WreckStructure.get_beam_at(clampf(pos.x, -29.0, 24.0)) * 0.65)
		pos.z = clampf(pos.z, -clamp_z, clamp_z)

		fish.position = pos
		entry["vel"] = vel

		if Vector2(vel.x, vel.z).length_squared() > 0.0004:
			var desired_yaw := atan2(-vel.x, -vel.z)
			fish.rotation.y = lerp_angle(fish.rotation.y, desired_yaw, clampf(dt * (10.0 if fleeing else 4.5), 0.0, 1.0))
			var target_pitch := clampf(vel.y * 0.35, -0.35, 0.35)
			fish.rotation.x = lerpf(fish.rotation.x, target_pitch, clampf(dt * 5.0, 0.0, 1.0))

		var tail: Node3D = entry["tail"]
		if is_instance_valid(tail):
			var wag_freq := 18.0 if fleeing else 6.8
			var wag_amp := 0.42 if fleeing else 0.24
			tail.rotation.y = sin(_fish_anim_time * wag_freq + phase) * wag_amp

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
	var joinery := ShipGeometry.begin(mat_furniture_trim)
	for level in [0.09, height - 0.10]:
		ShipGeometry.beam(joinery, WreckStructure.get_world_pos(a.x, a.y + level, a.z), WreckStructure.get_world_pos(b.x, b.y + level, b.z), 0.21)
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
		cbx.size = Vector3(seg_vec.length() + 0.22, absf(y_top - y_bot) + 0.12, 0.65)
		cs.shape = cbx
		cs.position = seg_mid + Vector3(0.0, -0.06, side * 0.12)
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
	# Moldura superior continua de corte diorama + cuadernas interiores
	var cap_rail := ShipGeometry.begin(mat_furniture_trim)
	var cap_x := x_start
	while cap_x < x_end - 0.001:
		var cap_nx := minf(x_end, cap_x + 1.5)
		var b_c0 := WreckStructure.get_beam_at(cap_x)
		var b_c1 := WreckStructure.get_beam_at(cap_nx)
		ShipGeometry.beam(cap_rail, WreckStructure.get_world_pos(cap_x, y_top - 0.04, side * b_c0 * f_top), WreckStructure.get_world_pos(cap_nx, y_top - 0.04, side * b_c1 * f_top), 0.19)
		cap_x += 1.5
	ShipGeometry.commit(mi, "CutawayCapRail", cap_rail)

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
	# Brecha P13 astillada e irregular hacia la sentina inundada (rompe apariencia de claraboya cuadrada)
	var rim_node = Node3D.new()
	rim_node.name = "BreachP13Coaming"
	rim_node.position = pos
	parent.add_child(rim_node)

	var mat_splint := PbrMaterialKit.create_wood_shaving_pbr("#5a4732")
	var rim_st := ShipGeometry.begin(mat_furniture)
	var splint_st := ShipGeometry.begin(mat_splint)
	var sides := 10
	for i in range(sides):
		var a0 := TAU * float(i) / float(sides)
		var a1 := TAU * float(i + 1) / float(sides)
		var r0 := half_size * (0.94 + sin(float(i) * 2.7) * 0.14)
		var r1 := half_size * (0.94 + sin(float((i + 1) % sides) * 2.7) * 0.14)
		var p0 := Vector3(cos(a0) * r0, 0.03, sin(a0) * r0)
		var p1 := Vector3(cos(a1) * r1, 0.03, sin(a1) * r1)
		ShipGeometry.beam(rim_st, p0, p1, 0.15, 0.09)
		# Dientes de tablas rotas apuntando hacia el abismo de la sentina C8
		var mid := (p0 + p1) * 0.5
		var inward := Vector3(-mid.x, -0.26, -mid.z).normalized()
		var jag_len := 0.24 + float((i * 3) % 3) * 0.09
		ShipGeometry.beam(splint_st, mid + Vector3(0.0, 0.02, 0.0), mid + inward * jag_len, 0.13, 0.045, 0.22)
	ShipGeometry.commit(rim_node, "BreachRimBeams", rim_st)
	ShipGeometry.commit(rim_node, "BreachBrokenPlanks", splint_st)

	# Pozo de sombra profunda bajo la brecha para evitar que parezca una claraboya de cristal azul claro
	var dark_pit := MeshInstance3D.new()
	var pit_pl := PlaneMesh.new()
	pit_pl.size = Vector2(half_size * 1.92, half_size * 1.92)
	dark_pit.mesh = pit_pl
	var mat_pit := StandardMaterial3D.new()
	mat_pit.albedo_color = Color(0.02, 0.05, 0.06, 0.78)
	mat_pit.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_pit.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_pit.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	dark_pit.material_override = mat_pit
	dark_pit.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	dark_pit.position = Vector3(0.0, -0.18, 0.0)
	rim_node.add_child(dark_pit)

func build_wall_lantern(parent: Node3D, pos: Vector3, light_name: String, support_mode: String = "hanging") -> void:
	var lan_root = Node3D.new()
	lan_root.name = light_name + "_Fixture"
	lan_root.position = pos
	parent.add_child(lan_root)

	if support_mode in ["wall_bracket", "wall_bracket_port", "wall_bracket_bow"]:
		# Aplique naval de hierro forjado anclado al mamparo (reemplaza las viejas farolas callejeras de pie)
		var brk_root := Node3D.new()
		lan_root.add_child(brk_root)
		var wall_z := -0.22 if pos.z > 0.0 else 0.22
		if support_mode == "wall_bracket_port":
			wall_z = -0.26
		elif support_mode == "wall_bracket_bow":
			wall_z = 0.26
			brk_root.rotation_degrees.y = 90.0
		var plate := MeshInstance3D.new()
		var pl_box := BoxMesh.new()
		pl_box.size = Vector3(0.14, 0.34, 0.04)
		plate.mesh = pl_box
		plate.material_override = mat_metal
		plate.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		plate.position = Vector3(0.0, 0.08, wall_z)
		brk_root.add_child(plate)

		var jib := MeshInstance3D.new()
		var jb_box := BoxMesh.new()
		jb_box.size = Vector3(0.045, 0.045, absf(wall_z) + 0.06)
		jib.mesh = jb_box
		jib.material_override = mat_metal
		jib.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		jib.position = Vector3(0.0, 0.21, wall_z * 0.5)
		brk_root.add_child(jib)

		var strut := MeshInstance3D.new()
		var st_box := BoxMesh.new()
		st_box.size = Vector3(0.035, 0.035, 0.24)
		strut.mesh = st_box
		strut.material_override = mat_metal
		strut.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		strut.position = Vector3(0.0, 0.11, wall_z * 0.62)
		strut.rotation_degrees.x = 42.0 if wall_z < 0.0 else -42.0
		brk_root.add_child(strut)
	elif support_mode == "post":
		var floor_y := WreckStructure.get_list_height(pos.z)
		var post_h := maxf(0.35, pos.y - 0.10 - floor_y)
		var stanchion := MeshInstance3D.new()
		var st_cyl := CylinderMesh.new()
		st_cyl.top_radius = 0.030
		st_cyl.bottom_radius = 0.045
		st_cyl.height = post_h
		stanchion.mesh = st_cyl
		stanchion.material_override = mat_metal
		stanchion.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		stanchion.position = Vector3(0, -0.10 - post_h * 0.5, 0)
		lan_root.add_child(stanchion)

		var plinth := MeshInstance3D.new()
		var pl_cyl := CylinderMesh.new()
		pl_cyl.top_radius = 0.13
		pl_cyl.bottom_radius = 0.16
		pl_cyl.height = 0.07
		pl_cyl.radial_segments = 8
		plinth.mesh = pl_cyl
		plinth.material_override = mat_metal
		plinth.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		plinth.position = Vector3(0, floor_y - pos.y + 0.035, 0)
		lan_root.add_child(plinth)
	elif support_mode == "table":
		var foot := MeshInstance3D.new()
		var ft_cyl := CylinderMesh.new()
		ft_cyl.top_radius = 0.09
		ft_cyl.bottom_radius = 0.12
		ft_cyl.height = 0.04
		ft_cyl.radial_segments = 8
		foot.mesh = ft_cyl
		foot.material_override = mat_metal
		foot.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		foot.position = Vector3(0, -0.11, 0)
		lan_root.add_child(foot)
	else:
		var post = MeshInstance3D.new()
		var cyl = CylinderMesh.new()
		cyl.top_radius = 0.025
		cyl.bottom_radius = 0.025
		cyl.height = 0.36
		post.mesh = cyl
		post.material_override = mat_metal
		post.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		post.position = Vector3(0, 0.24, 0)
		lan_root.add_child(post)

	# Capuchón y cazoleta inferior de hierro forjado
	var base_cup = MeshInstance3D.new()
	var bc_cyl = CylinderMesh.new()
	bc_cyl.top_radius = 0.11
	bc_cyl.bottom_radius = 0.075
	bc_cyl.height = 0.055
	bc_cyl.radial_segments = 6
	base_cup.mesh = bc_cyl
	base_cup.material_override = mat_metal
	base_cup.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	base_cup.position = Vector3(0, -0.09, 0)
	lan_root.add_child(base_cup)

	var cap = MeshInstance3D.new()
	var cap_cyl = CylinderMesh.new()
	cap_cyl.top_radius = 0.04
	cap_cyl.bottom_radius = 0.16
	cap_cyl.height = 0.11
	cap.mesh = cap_cyl
	cap.material_override = mat_metal
	cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cap.position = Vector3(0, 0.17, 0)
	lan_root.add_child(cap)

	for rib_ang in [0.0, PI * 0.5, PI, PI * 1.5]:
		var rib = MeshInstance3D.new()
		var r_cyl = CylinderMesh.new()
		r_cyl.top_radius = 0.012
		r_cyl.bottom_radius = 0.012
		r_cyl.height = 0.24
		rib.mesh = r_cyl
		rib.material_override = mat_metal
		rib.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		rib.position = Vector3(cos(rib_ang) * 0.105, 0.03, sin(rib_ang) * 0.105)
		lan_root.add_child(rib)

	var flame = MeshInstance3D.new()
	flame.name = "LanternFlame"
	var f_cone = CylinderMesh.new()
	f_cone.top_radius = 0.006
	f_cone.bottom_radius = 0.036
	f_cone.height = 0.11
	flame.mesh = f_cone
	flame.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_flame = StandardMaterial3D.new()
	mat_flame.albedo_color = Color("#fff3c2")
	mat_flame.emission_enabled = true
	mat_flame.emission = Color("#ffd26c")
	mat_flame.emission_energy_multiplier = 3.2
	flame.material_override = mat_flame
	flame.position = Vector3(0, 0.01, 0)
	flame.visible = false
	lan_root.add_child(flame)

	var glass = MeshInstance3D.new()
	glass.name = "LanternGlass"
	var g_cyl = CylinderMesh.new()
	g_cyl.top_radius = 0.095
	g_cyl.bottom_radius = 0.078
	g_cyl.height = 0.21
	g_cyl.radial_segments = 6
	glass.mesh = g_cyl
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_glass = StandardMaterial3D.new()
	mat_glass.albedo_color = Color(0.24, 0.28, 0.30, 0.45)
	mat_glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_glass.emission_enabled = false
	mat_glass.emission = Color("#f5a642")
	mat_glass.emission_energy_multiplier = 1.25
	glass.material_override = mat_glass
	glass.position = Vector3(0, 0.02, 0)
	lan_root.add_child(glass)

	var ember_map := {
		"Lantern_C4_Captain": "LanternEmbers_C4",
		"Lantern_C5_Galley":  "LanternEmbers_C5",
		"Lantern_C6_Crew_A":  "LanternEmbers_C6_A",
		"Lantern_C6_Crew_B":  "LanternEmbers_C6_B",
		"Lantern_C7_Mess":    "LanternEmbers_C7",
		"Lantern_C8_Aft":     "LanternEmbers_C8",
	}

	var light = OmniLight3D.new()
	light.name = light_name
	light.position = pos
	light.light_color = Color("#ffbd66")
	light.light_energy = 0.0
	light.set_meta("lantern_base_energy", 2.4)
	light.set_meta("lantern_lit", false)
	light.set_meta("lantern_housing", lan_root)
	light.set_meta("lantern_ember_name", str(ember_map.get(light_name, "")))
	light.omni_range = 13.5
	light.omni_attenuation = 1.15
	light.shadow_enabled = (light_name in ["Lantern_C4_Captain", "Lantern_C7_Mess"])
	if light.shadow_enabled:
		light.shadow_bias = 0.022
		light.shadow_normal_bias = 0.85
		light.shadow_blur = 1.25
	parent.add_child(light)

	var prop_lan := InteractiveProp.new()
	prop_lan.name = "Prop_" + light_name
	prop_lan.prop_id = "lantern:" + light_name
	prop_lan.prompt_text = "Encender farol"
	prop_lan.inspection_message = "El farol de hierro está frío y apagado."
	prop_lan.position = Vector3(pos.x, pos.y - 1.15 if support_mode != "table" else pos.y - 0.55, pos.z)
	prop_lan.interaction_radius = 1.55
	parent.add_child(prop_lan)
	light.set_meta("lantern_prop", prop_lan)
