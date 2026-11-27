extends SceneTree

# ==============================================================================
# FASE 1 — PRUEBAS AUTOMATIZADAS OBLIGATORIAS DE PARIDAD Y SINCRONIZACIÓN A1
# Verifica contra la fuente única compartida en prototypes/godot-shared/retreat_a1/:
# 1. Modificar prop/material canónico refleja el cambio en FULL_RETREAT y A1_CAMP sin copiar archivos.
# 2. Manifiesto A1 idéntico (IDs, transforms, 6 celdas, camas, bancos, pozo, estatua, cutaways).
# 3. Salida de la plaza bloqueada física y visualmente en A1_CAMP; abierta en FULL_RETREAT.
# 4. Cero nodos externos a A1 (A2–A5, muelle, escaleras, bosque lejano, R3Land) en A1_CAMP.
# 5. Interacciones (6 camas/hamacas, 2 bancos de plaza, pozo, estatua, hoguera, 6 cutaways) y cámara.
# ==============================================================================

var _passed := 0
var _failed := 0

func _check(cond: bool, msg: String) -> void:
	if cond:
		_passed += 1
	else:
		_failed += 1
		push_error("FAIL: " + msg)
		print("FAIL: " + msg)

func _init() -> void:
	call_deferred("_run")

func _shared_script(fname: String) -> GDScript:
	var p := ProjectSettings.globalize_path("res://").path_join("../godot-shared/retreat_a1/" + fname).simplify_path()
	return ResourceLoader.load(p) as GDScript

func _run() -> void:
	var C := _shared_script("retreat_a1_config.gd")
	var Canon := _shared_script("retreat_a1_canonical_builder.gd")
	var RetreatBuilderScript := load("res://scripts/retreat_layout_builder.gd")

	_check(C != null and Canon != null, "Fuente canónica única cargada desde ../godot-shared/retreat_a1/")

	# --- PRUEBA 1: Cargar escena completa camp_a1_rooms.tscn (A1_CAMP) ---
	var camp_packed: PackedScene = load("res://scenes/camp_a1_rooms.tscn")
	var camp_inst := camp_packed.instantiate()
	root.add_child(camp_inst)
	for _i in range(4):
		await process_frame

	var camp_world: Node3D = camp_inst.a1_builder.retreat_world
	_check(camp_world != null, "CampA1Builder monta RetreatA1World")
	_check(int(camp_world.get("load_profile")) == 1, "CampA1Builder usa perfil restringido A1_CAMP (load_profile=1)")

	var m_camp: Dictionary = Canon.collect_a1_manifest(camp_world, Vector3.ZERO)

	# --- PRUEBA 2: Nodos fuera de A1 NO instanciados ni procesados en A1_CAMP ---
	var outer_in_camp: Array = m_camp.get("outer_nodes_present", [])
	_check(outer_in_camp.is_empty(), "Cero sectores externos instanciados en A1_CAMP (encontrados: %s)" % str(outer_in_camp))

	var forbidden_glb_found: Array[String] = []
	_scan_forbidden_glb(camp_world, C.A1_CAMP_FORBIDDEN_PREFIXES, forbidden_glb_found)
	_check(forbidden_glb_found.is_empty(), "Cero mallas GLB externas (A2-A5/Shore/Conn/R3Land) en A1_CAMP (encontradas: %s)" % str(forbidden_glb_found))

	# --- PRUEBA 3: Cierres exclusivos en modo campamento (verjas oeste y este + colisiones alineadas) ---
	var camp_closures: Array = m_camp.get("camp_closures", [])
	_check(camp_closures.has("A1CampClosure_West") and camp_closures.has("A1CampClosure_East"), "Cierres A1CampClosure_West y A1CampClosure_East creados en A1_CAMP")
	for cname in ["A1CampClosure_West", "A1CampClosure_East"]:
		var cn := camp_world.find_child(cname, true, false) as Node3D
		var col := cn.find_child("StaticCollider", true, false) as StaticBody3D if cn else null
		_check(col != null and col.get_child_count() > 0, "%s dispone de colisión sólida bloqueando la salida" % cname)
	_check(camp_world.find_child("MapTransitionPaths", true, false) == null, "Sin portales MapTransitionPaths/Exit_* en A1_CAMP")

	# --- PRUEBA 4: Interacciones (6 camas/hamacas, 2 bancos, pozo, estatua, 6 cutaways) ---
	_check(camp_inst.a1_builder.beds.size() == 6, "Las 6 camas/hamacas canónicas registradas en A1 (actual=%d)" % camp_inst.a1_builder.beds.size())
	for bid in ["a1-room-1-bed", "a1-room-2-bed", "a1-room-3-bed", "a1-room-4-bed", "a1-room-5-hammocks", "a1-room-6-hammocks"]:
		_check(camp_inst.a1_builder.beds.has(bid), "Anclaje de cama canónico registrado: " + bid)
	_check(camp_inst.a1_builder.seat_anchors.has("a1-seat-west-point") and camp_inst.a1_builder.seat_anchors.has("a1-seat-east-point"), "Bancos de plaza oeste y este registrados")
	_check(camp_inst.a1_builder.cutaway_roofs.size() == 6, "Las 6 bóvedas cutaway registradas en A1")
	_check(camp_world.find_child("MonasticFountainWell", true, false) != null, "Pozo monástico presente en A1_CAMP")
	_check(camp_world.find_child("AstalaganCircularPedestal", true, false) != null, "Pedestal circular de Astalagan presente en A1_CAMP")

	# Verificar cutaway interactivo en las 6 habitaciones
	for cdef: Dictionary in C.A1_CELLS:
		var ck := str(cdef["camp_key"])
		var cr := camp_world.find_child("CutawayRoof_" + ck, true, false) as Node3D
		_check(cr != null and cr.visible, "Techo cutaway %s inicialmente visible" % ck)

	camp_inst.queue_free()
	await process_frame

	# --- PRUEBA 5: Modificación en fuente canónica única se refleja automáticamente en AMBOS modos ---
	var orig_color: Color = C.STYLE_TUNING["bench_rug_main"]
	var sentinel_color := Color("#2a6f5c")
	C.STYLE_TUNING["bench_rug_main"] = sentinel_color

	var world_camp: Node3D = RetreatBuilderScript.new()
	world_camp.set("load_profile", 1)
	root.add_child(world_camp)
	await process_frame
	var m_camp_mut: Dictionary = Canon.collect_a1_manifest(world_camp, Vector3.ZERO)

	# Instanciar perfil FULL_RETREAT usando el mismo módulo canónico (sin cierres de campamento)
	var world_full := Node3D.new()
	world_full.name = "FullRetreatCanonicalProbe"
	root.add_child(world_full)
	var full_builder: Node3D = RetreatBuilderScript.new()
	full_builder.set("load_profile", 0)
	world_full.add_child(full_builder)
	await process_frame
	var m_full_mut: Dictionary = Canon.collect_a1_manifest(full_builder, Vector3.ZERO)

	# Restaurar estilo original inmediatamente
	C.STYLE_TUNING["bench_rug_main"] = orig_color

	_check(m_camp_mut["bench_rug_color"] == sentinel_color.to_html(false), "A1_CAMP refleja inmediatamente mutación de material canónico (%s)" % m_camp_mut["bench_rug_color"])
	_check(m_full_mut["bench_rug_color"] == sentinel_color.to_html(false), "FULL_RETREAT refleja inmediatamente mutación de material canónico (%s)" % m_full_mut["bench_rug_color"])
	_check(m_full_mut["camp_closures"].is_empty(), "FULL_RETREAT NO contiene cierres de plaza (salida libre)")
	_check(not m_full_mut["outer_nodes_present"].is_empty(), "FULL_RETREAT sí construye sectores externos fuera de A1")

	# --- PRUEBA 6: Comparación de manifiesto A1 (IDs y transforms idénticos entre A1_CAMP y FULL_RETREAT) ---
	for kname: String in m_camp_mut["key_nodes"].keys():
		var in_full: bool = m_full_mut["key_nodes"].has(kname)
		_check(in_full, "Manifiesto A1 clave presente en FULL_RETREAT: " + kname)
		if in_full:
			var pc: Array = m_camp_mut["key_nodes"][kname]["pos"]
			var pf: Array = m_full_mut["key_nodes"][kname]["pos"]
			var eq := is_equal_approx(float(pc[0]), float(pf[0])) and is_equal_approx(float(pc[1]), float(pf[1])) and is_equal_approx(float(pc[2]), float(pf[2]))
			_check(eq, "Paridad de posición exacta en %s: camp=%s full=%s" % [kname, str(pc), str(pf)])

	for cid: String in m_camp_mut["rooms"].keys():
		var rc: Dictionary = m_camp_mut["rooms"][cid]
		var rf: Dictionary = m_full_mut["rooms"].get(cid, {})
		_check(rc.get("bed_present", false) and rf.get("bed_present", false), "Cama/hamaca canónica presente en ambos modos para " + cid)
		_check(rc.get("bed_canonical_id", "") == rf.get("bed_canonical_id", ""), "ID canónico de cama idéntico en " + cid)
		_check(str(rc.get("bed_pos", [])) == str(rf.get("bed_pos", [])), "Transform de cama idéntico en " + cid)

	# Guardar manifiesto de A1_CAMP para contraste cruzado con godot-retiro real
	var met_dir := "c:/Users/User/Desktop/Dungeons/output/campamentos-aaa/01-a1-rooms/metrics"
	DirAccess.make_dir_recursive_absolute(met_dir)
	var mf := FileAccess.open(met_dir + "/manifest_a1_camp.json", FileAccess.WRITE)
	mf.store_string(JSON.stringify(m_camp, "\t"))
	mf.close()

	world_camp.queue_free()
	world_full.queue_free()
	await process_frame

	print("A1_PARITY_TESTS PASSED=%d FAILED=%d" % [_passed, _failed])
	quit(0 if _failed == 0 else 1)

func _scan_forbidden_glb(node: Node, prefixes: Array[String], out: Array[String]) -> void:
	if node is MeshInstance3D:
		var low := node.name.to_lower()
		for pfx in prefixes:
			if low.begins_with(pfx):
				out.append(node.name)
				break
	for ch in node.get_children():
		_scan_forbidden_glb(ch, prefixes, out)
