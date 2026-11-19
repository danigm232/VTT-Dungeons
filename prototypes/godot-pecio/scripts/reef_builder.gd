class_name ReefBuilder
extends Node3D

const PbrMaterialKit = preload("res://scripts/pbr_material_kit.gd")
const RowboatController = preload("res://scripts/rowboat_controller.gd")
const InteractiveProp = preload("res://scripts/interactive_prop.gd")

# Generador de Arrecifes de Basalto y Bote de Remos (Fase 2)
# Conforme a engine/client/wreck-ocean.ts y wreck-exterior.ts

var mat_basalt: StandardMaterial3D
var mat_seabed: StandardMaterial3D
var mat_kelp: StandardMaterial3D
var mat_boat: StandardMaterial3D

var _prebuilt: bool = false

func _ready() -> void:
	prebuild()

func prebuild() -> void:
	if _prebuilt:
		return
	_prebuilt = true
	setup_materials()
	build_seabed_terrain()
	build_stern_reef()
	build_bow_reef()
	build_rowboat()

func setup_materials() -> void:
	mat_basalt = PbrMaterialKit.create_basalt_rock_pbr("#6c7a7e") # Basalto volcánico húmedo legible
	mat_seabed = PbrMaterialKit.create_basalt_rock_pbr("#323f42", 0.16) # Fondo marino somero bajo arrecifes y quilla

	mat_kelp = StandardMaterial3D.new()
	mat_kelp.albedo_color = Color("#2e4231")
	mat_kelp.roughness = 0.65
	mat_kelp.metallic_specular = 0.25

	mat_boat = PbrMaterialKit.create_wood_planks_pbr("#826646", 0.30)

func build_seabed_terrain() -> void:
	# Relieve submarino continuo de arena basáltica y bajos arrecifales bajo el naufragio
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(mat_seabed)

	var x_min := -96.0
	var x_max := 96.0
	var z_min := -72.0
	var z_max := 72.0
	var step := 6.0

	var cols := int((x_max - x_min) / step)
	var rows := int((z_max - z_min) / step)
	for ix in range(cols):
		var x0 := x_min + ix * step
		var x1 := x0 + step
		for iz in range(rows):
			var z0 := z_min + iz * step
			var z1 := z0 + step

			var p00 := Vector3(x0, _seabed_height(x0, z0), z0)
			var p10 := Vector3(x1, _seabed_height(x1, z0), z0)
			var p11 := Vector3(x1, _seabed_height(x1, z1), z1)
			var p01 := Vector3(x0, _seabed_height(x0, z1), z1)

			st.set_uv(Vector2(x0 / 12.0, z0 / 12.0)); st.add_vertex(p00)
			st.set_uv(Vector2(x1 / 12.0, z0 / 12.0)); st.add_vertex(p10)
			st.set_uv(Vector2(x1 / 12.0, z1 / 12.0)); st.add_vertex(p11)
			st.set_uv(Vector2(x0 / 12.0, z0 / 12.0)); st.add_vertex(p00)
			st.set_uv(Vector2(x1 / 12.0, z1 / 12.0)); st.add_vertex(p11)
			st.set_uv(Vector2(x0 / 12.0, z1 / 12.0)); st.add_vertex(p01)

	st.generate_normals()
	st.generate_tangents()
	var seabed_inst := MeshInstance3D.new()
	seabed_inst.name = "SeabedTerrain"
	seabed_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	seabed_inst.mesh = st.commit()
	seabed_inst.create_trimesh_collision()
	add_child(seabed_inst)

func _seabed_height(x: float, z: float) -> float:
	var h := -7.8 + sin(x * 0.14) * cos(z * 0.18) * 0.55 + sin((x + z) * 0.08) * 0.35
	# Bajío somero bajo SternReef (-30, 14) y BowReef (28, -11)
	var d_stern := Vector2(x + 29.0, z - 14.5).length()
	var d_bow := Vector2(x - 28.0, z + 11.5).length()
	h += exp(-(d_stern * d_stern) / 95.0) * 3.6
	h += exp(-(d_bow * d_bow) / 72.0) * 3.3
	# Foso bajo quilla para no enterrar el suelo de Bodega C9 (-6.4m)
	if absf(x) < 27.0 and absf(z) < 7.5:
		h = minf(h, -8.35)
	return h

func build_stern_reef() -> void:
	# Espigón de rocas basálticas en el cuadrante de popa suroeste (estrictamente fuera de la manga del casco)
	var reef_node = Node3D.new()
	reef_node.name = "SternReef"
	add_child(reef_node)

	var rock_res_a = load("res://assets/models/rocks-a.glb")
	var rock_res_b = load("res://assets/models/rocks-b.glb")
	var rock_res_c = load("res://assets/models/rocks-c.glb")

	# Escalas calibradas a AABB real (~4.5m base) para evitar intrusión en camarotes C4/C5
	var rocks = [
		{"pos": Vector3(-28.0, -3.4, 14.0), "scale": Vector3(2.1, 2.0, 2.1), "rot": 0.4, "res": rock_res_a},
		{"pos": Vector3(-32.5, -3.2, 13.5), "scale": Vector3(2.2, 2.2, 2.2), "rot": -0.6, "res": rock_res_b},
		{"pos": Vector3(-23.0, -3.5, 16.0), "scale": Vector3(1.8, 1.5, 1.8), "rot": 0.8, "res": rock_res_c},
		{"pos": Vector3(-35.0, -3.2, 10.5), "scale": Vector3(2.0, 1.8, 2.0), "rot": 0.2, "res": rock_res_a},
		{"pos": Vector3(-19.5, -3.6, 16.5), "scale": Vector3(1.6, 1.4, 1.6), "rot": -0.3, "res": rock_res_b},
		{"pos": Vector3(-29.5, -3.1, 18.5), "scale": Vector3(2.0, 2.1, 2.0), "rot": 0.5, "res": rock_res_c}
	]

	for ri in range(rocks.size()):
		var r = rocks[ri]
		if r["res"]:
			var inst = r["res"].instantiate()
			inst.position = r["pos"]
			inst.rotation = Vector3(deg_to_rad(sin(float(ri) * 2.1) * 7.5), r["rot"], deg_to_rad(cos(float(ri) * 1.7) * 6.5))
			inst.scale = r["scale"]
			# Aplicar textura de basalto ilustrada a todas las mallas de la roca
			_apply_basalt_material(inst)
			reef_node.add_child(inst)
			PbrMaterialKit.add_cyl_collider(reef_node, "Col_SternRock", r["scale"].x * 1.15, r["scale"].y * 2.2, r["pos"] + Vector3(0, 0.8, 0))
			# Piedra angular secundaria junto a la base para romper siluetas hexagonales uniformes
			var crag := MeshInstance3D.new()
			crag.mesh = create_faceted_rock(Vector3(r["scale"].x * 1.15, r["scale"].y * 0.90, r["scale"].z * 1.10))
			crag.material_override = mat_basalt
			crag.position = r["pos"] + Vector3(cos(r["rot"]) * 1.45, 0.10, sin(r["rot"]) * 1.35)
			crag.rotation = Vector3(0.14, r["rot"] + 1.1, -0.12)
			reef_node.add_child(crag)
		else:
			var rock_mesh = create_faceted_rock(r["scale"])
			var inst = MeshInstance3D.new()
			inst.mesh = rock_mesh
			inst.material_override = mat_basalt
			inst.position = r["pos"]
			inst.rotation.y = r["rot"]
			reef_node.add_child(inst)
			inst.create_trimesh_collision()

	PbrMaterialKit.add_occluder_box(reef_node, "Occ_SternReef", Vector3(8.5, 2.8, 5.5), Vector3(-29.5, -2.5, 14.5))

func build_bow_reef() -> void:
	# Arrecife en proa (estrictamente exterior a la borda de babor C6 para no invadir camarotes)
	var reef_node = Node3D.new()
	reef_node.name = "BowReef"
	add_child(reef_node)

	var rock_res_a = load("res://assets/models/rocks-a.glb")
	var rock_res_b = load("res://assets/models/rocks-b.glb")

	var rocks = [
		{"pos": Vector3(25.0, -3.3, -13.8), "scale": Vector3(1.8, 1.8, 1.8), "rot": 0.3, "res": rock_res_a},
		{"pos": Vector3(28.8, -3.1, -10.5), "scale": Vector3(1.9, 1.9, 1.9), "rot": -0.5, "res": rock_res_b},
		{"pos": Vector3(21.0, -3.5, -15.5), "scale": Vector3(1.7, 1.4, 1.7), "rot": 0.7, "res": rock_res_a},
		{"pos": Vector3(32.5, -3.4, -5.0),  "scale": Vector3(1.8, 1.6, 1.8), "rot": -0.2, "res": rock_res_b}
	]

	for bi in range(rocks.size()):
		var r = rocks[bi]
		if r["res"]:
			var inst = r["res"].instantiate()
			inst.position = r["pos"]
			inst.rotation = Vector3(deg_to_rad(cos(float(bi) * 2.3) * 8.0), r["rot"], deg_to_rad(sin(float(bi) * 1.9) * 6.0))
			inst.scale = r["scale"]
			_apply_basalt_material(inst)
			reef_node.add_child(inst)
			PbrMaterialKit.add_cyl_collider(reef_node, "Col_BowRock", r["scale"].x * 1.15, r["scale"].y * 2.2, r["pos"] + Vector3(0, 0.8, 0))
			var crag := MeshInstance3D.new()
			crag.mesh = create_faceted_rock(Vector3(r["scale"].x * 1.10, r["scale"].y * 0.85, r["scale"].z * 1.05))
			crag.material_override = mat_basalt
			crag.position = r["pos"] + Vector3(sin(r["rot"]) * 1.35, 0.08, cos(r["rot"]) * 1.30)
			crag.rotation = Vector3(-0.12, r["rot"] - 0.9, 0.10)
			reef_node.add_child(crag)
		else:
			var rock_mesh = create_faceted_rock(r["scale"])
			var inst = MeshInstance3D.new()
			inst.mesh = rock_mesh
			inst.material_override = mat_basalt
			inst.position = r["pos"]
			inst.rotation.y = r["rot"]
			reef_node.add_child(inst)
			inst.create_trimesh_collision()

	PbrMaterialKit.add_occluder_box(reef_node, "Occ_BowReef", Vector3(6.2, 2.6, 5.2), Vector3(27.5, -2.5, -11.5))

func _apply_basalt_material(node: Node) -> void:
	if node is MeshInstance3D:
		node.material_override = mat_basalt
		node.create_trimesh_collision()
	for child in node.get_children():
		_apply_basalt_material(child)

func create_faceted_rock(size: Vector3) -> ArrayMesh:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	# Poliedro facetado irregular con bobinado CCW (Counter-Clockwise) correcto
	var hx = size.x * 0.5
	var hy = size.y * 0.5
	var hz = size.z * 0.5

	var v = [
		Vector3(-hx * 0.8, -hy, -hz * 0.8), # 0
		Vector3(hx * 0.9, -hy, -hz * 0.7),  # 1
		Vector3(hx * 0.8, -hy, hz * 0.9),   # 2
		Vector3(-hx * 0.9, -hy, hz * 0.8),  # 3
		Vector3(-hx * 0.5, hy * 0.9, -hz * 0.4), # 4
		Vector3(hx * 0.6, hy * 0.8, -hz * 0.3),  # 5
		Vector3(hx * 0.4, hy * 1.0, hz * 0.5),   # 6
		Vector3(-hx * 0.5, hy * 0.7, hz * 0.4)   # 7
	]

	# Caras facetadas con orden anti-horario hacia el exterior
	var faces = [
		# Laterales (CCW)
		[0, 5, 4], [0, 1, 5],
		[1, 6, 5], [1, 2, 6],
		[2, 7, 6], [2, 3, 7],
		[3, 4, 7], [3, 0, 4],
		# Superior (CCW)
		[4, 5, 6], [4, 6, 7],
		# Inferior (CCW)
		[0, 2, 1], [0, 3, 2]
	]

	for f in faces:
		var p0 = v[f[0]]
		var p1 = v[f[1]]
		var p2 = v[f[2]]
		st.set_uv(Vector2(p0.x, p0.z))
		st.add_vertex(p0)
		st.set_uv(Vector2(p1.x, p1.z))
		st.add_vertex(p1)
		st.set_uv(Vector2(p2.x, p2.z))
		st.add_vertex(p2)

	st.generate_normals()
	return st.commit()

func _collect_glb_meshes(node: Node, acc_pos: Vector3, out: Array[Dictionary]) -> void:
	var here := acc_pos + (node as Node3D).position if node is Node3D else acc_pos
	if node is MeshInstance3D:
		out.append({"node": node, "pos": here})
	for child in node.get_children():
		_collect_glb_meshes(child, here, out)

func build_rowboat() -> void:
	# Bote de remos canónico compartido con El Retiro del Dragón (espacio para 3-4 jugadores y 2 remos funcionales)
	var boat_node = RowboatController.new()
	boat_node.name = "Rowboat"
	boat_node.position = Vector3(2.5, -2.85, 15.6)
	boat_node.rotation.y = 0.05
	boat_node.base_y = -2.85
	add_child(boat_node)

	var mat_bench := PbrMaterialKit.create_wood_planks_pbr("#a07c54", 0.22)
	var mat_oar := PbrMaterialKit.create_wood_planks_pbr("#cca26c", 0.16)
	var mat_iron := PbrMaterialKit.create_iron_pbr("#343c3a")

	var hull_visual := Node3D.new()
	hull_visual.name = "RetiroRowboatHull"
	hull_visual.rotation_degrees = Vector3(0.0, -90.0, 0.0) # Proa (-Z Retiro) apuntando hacia +X local
	hull_visual.scale = Vector3(1.52, 1.28, 1.48) # ~2.40m manga x 5.18m eslora para 3-4 jugadores
	boat_node.add_child(hull_visual)

	var bytes := FileAccess.get_file_as_bytes("res://assets/models/retreat_refinement_p2_runtime.glb")
	var loaded_meshes: Array[Dictionary] = []
	var scene_root: Node = null
	if not bytes.is_empty():
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		if doc.append_from_buffer(bytes, "", state) == OK:
			scene_root = doc.generate_scene(state)
			if scene_root:
				_collect_glb_meshes(scene_root, Vector3.ZERO, loaded_meshes)

	var anchor_pos := Vector3(20.25, -0.16, -117.0)
	for entry in loaded_meshes:
		var m := entry["node"] as MeshInstance3D
		if m and m.name == "P2_CANON_Rowing_Boat_Hull":
			anchor_pos = entry["pos"]
			break

	var oar_parts := {
		0: {"shaft": null, "blade": null},
		1: {"shaft": null, "blade": null},
	}
	for entry in loaded_meshes:
		var m := entry["node"] as MeshInstance3D
		if not m:
			continue
		var m_name := String(m.name)
		var is_hull_part := m_name.begins_with("P2_CANON_Rowing_")
		var is_oar_0 := m_name in ["P2_VTT_Oar_Shaft_0", "P2_VTT_Oar_Blade_0"]
		var is_oar_1 := m_name in ["P2_VTT_Oar_Shaft_1", "P2_VTT_Oar_Blade_1"]
		if not (is_hull_part or is_oar_0 or is_oar_1):
			continue
		if m.get_parent():
			m.get_parent().remove_child(m)
		m.owner = null
		m.rotation = Vector3.ZERO
		m.scale = Vector3.ONE
		if is_hull_part:
			m.position = entry["pos"] - anchor_pos
			m.material_override = mat_boat if m_name.contains("Hull") else mat_bench
			hull_visual.add_child(m)
		elif is_oar_0:
			oar_parts[0]["shaft" if m_name.contains("Shaft") else "blade"] = m
		elif is_oar_1:
			oar_parts[1]["shaft" if m_name.contains("Shaft") else "blade"] = m

	if scene_root:
		scene_root.queue_free()

	# Banco central adicional para alojar cómodamente a 3-4 aventureros
	var center_thwart := MeshInstance3D.new()
	center_thwart.name = "CenterRowingThwart"
	var thwart_box := BoxMesh.new()
	thwart_box.size = Vector3(1.18, 0.09, 0.26)
	center_thwart.mesh = thwart_box
	center_thwart.material_override = mat_bench
	center_thwart.position = Vector3(0.0, 0.45, 0.0)
	hull_visual.add_child(center_thwart)

	# Enjaretado de piso interior (duckboards) y pequeño farol de proa para nivel visual Triple-A del bote
	for dz in [-0.30, -0.10, 0.10, 0.30]:
		var slat := MeshInstance3D.new()
		var sl_box := BoxMesh.new()
		sl_box.size = Vector3(0.11, 0.03, 2.35)
		slat.mesh = sl_box
		slat.material_override = mat_bench
		slat.position = Vector3(dz, 0.16, 0.0)
		hull_visual.add_child(slat)

	var bow_lan_cap := MeshInstance3D.new()
	var blc_cyl := CylinderMesh.new()
	blc_cyl.top_radius = 0.05; blc_cyl.bottom_radius = 0.09; blc_cyl.height = 0.16; blc_cyl.radial_segments = 6
	bow_lan_cap.mesh = blc_cyl
	bow_lan_cap.material_override = mat_iron
	bow_lan_cap.position = Vector3(0.0, 0.72, -1.62)
	hull_visual.add_child(bow_lan_cap)

	var bow_lan_glass := MeshInstance3D.new()
	var blg_cyl := CylinderMesh.new()
	blg_cyl.top_radius = 0.055; blg_cyl.bottom_radius = 0.05; blg_cyl.height = 0.12; blg_cyl.radial_segments = 6
	bow_lan_glass.mesh = blg_cyl
	var mat_blg := StandardMaterial3D.new()
	mat_blg.albedo_color = Color("#ffcf80")
	mat_blg.emission_enabled = true
	mat_blg.emission = Color("#ff9c38")
	mat_blg.emission_energy_multiplier = 0.85
	bow_lan_glass.material_override = mat_blg
	bow_lan_glass.position = Vector3(0.0, 0.62, -1.62)
	hull_visual.add_child(bow_lan_glass)

	# Únicamente 2 remos funcionales apoyados sobre chumaceras de hierro en las bordas (-Z babor / +Z estribor)
	var oar_specs := [
		{"name": "OarPivot_Port", "side": -1.0, "rot": Vector3(10.0, 188.0, 0.0), "idx": 0},
		{"name": "OarPivot_Stbd", "side": 1.0, "rot": Vector3(10.0, -8.0, 0.0), "idx": 1},
	]
	for spec in oar_specs:
		var z_side: float = spec["side"] * 1.12
		var lock := MeshInstance3D.new()
		lock.name = "Rowlock_" + ("Port" if spec["side"] < 0.0 else "Stbd")
		var lock_t := TorusMesh.new()
		lock_t.inner_radius = 0.05
		lock_t.outer_radius = 0.09
		lock.mesh = lock_t
		lock.material_override = mat_iron
		lock.position = Vector3(0.08, 0.94, z_side)
		lock.rotation_degrees = Vector3(0.0, 0.0, 90.0)
		boat_node.add_child(lock)

		var pivot := Node3D.new()
		pivot.name = spec["name"]
		pivot.position = Vector3(0.08, 0.94, z_side)
		pivot.rotation_degrees = spec["rot"]
		boat_node.add_child(pivot)

		var parts: Dictionary = oar_parts[spec["idx"]]
		var shaft := parts["shaft"] as MeshInstance3D
		if shaft:
			shaft.position = Vector3(0.0, -0.025, 0.44)
			shaft.scale = Vector3(1.35, 1.35, 1.35)
			shaft.material_override = mat_oar
			pivot.add_child(shaft)
		var blade := parts["blade"] as MeshInstance3D
		if blade:
			blade.position = Vector3(0.0, -0.02, 1.80)
			blade.scale = Vector3(1.45, 1.35, 1.45)
			blade.material_override = mat_oar
			pivot.add_child(blade)

		if spec["side"] < 0.0:
			boat_node.oar_port = pivot
		else:
			boat_node.oar_stbd = pivot

	# Cubierta pisable ampliada dentro del casco para 3-4 personajes
	var boat_sb := PbrMaterialKit.add_box_collider(boat_node, "Col_RowboatDeck", Vector3(4.2, 0.35, 1.85), Vector3(0.0, 0.22, 0.0))
	if boat_sb.get_child_count() > 0:
		boat_node.deck_collider = boat_sb.get_child(0) as CollisionShape3D

	# Rollo de cabo marinero en la popa del bote
	var torus = MeshInstance3D.new()
	var t_mesh = TorusMesh.new()
	t_mesh.inner_radius = 0.15
	t_mesh.outer_radius = 0.35
	torus.mesh = t_mesh
	var mat_rope = PbrMaterialKit.create_rope_cable_pbr("#443728")
	torus.material_override = mat_rope
	torus.position = Vector3(-1.85, 0.56, 0.0)
	boat_node.add_child(torus)

	# Sombra de contacto suave en el agua
	var shadow = PbrMaterialKit.create_blob_shadow(4.6, 2.2, 0.6)
	shadow.position = Vector3(0, 0.02, 0)
	boat_node.add_child(shadow)

	# Cabo de amarre desde la proa del bote hacia la borda de estribor del pecio
	var rope_start = Vector3(5.05, -2.07, 15.6)
	var rope_end = Vector3(3.5, -1.15, 10.5)
	var rope_dir = rope_end - rope_start

	var rope_cyl = CylinderMesh.new()
	rope_cyl.top_radius = 0.025
	rope_cyl.bottom_radius = 0.025
	rope_cyl.height = rope_dir.length()
	rope_cyl.radial_segments = 6

	var rope_inst = MeshInstance3D.new()
	rope_inst.name = "MooringPainter"
	rope_inst.mesh = rope_cyl
	rope_inst.material_override = mat_rope
	add_child(rope_inst)
	boat_node.painter_rope = rope_inst

	rope_inst.position = (rope_start + rope_end) * 0.5
	rope_inst.look_at_from_position(rope_inst.position, rope_end, Vector3.UP)
	rope_inst.rotate_object_local(Vector3.RIGHT, deg_to_rad(90))
