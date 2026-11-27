class_name RetreatAquaticBuilder
extends RefCounted

# ==============================================================================
# ECOSISTEMA ACUÁTICO, ARRECIFES, LÍMITES DIEGÉTICOS Y FAUNA/FLORA SUBMARINA
# - Mar abierto Z1: Opción 1 (Arrecife volcánico "Dientes del Dragón") +
#   Opción 2 (Estacas, cabos y boyas del Claustro con canal de bote abierto) +
#   Opción 3 (Corriente visible de resaca en el canal exterior y fosa profunda).
# - Laguna interior (lagoon_bowl): Opción 1 suave + Opción 5 miniatura
#   (sillares musgosos del viejo espigón monástico) + flora y peces calmos.
# - Corales ramificados, corales cerebro, gorgonias, anémonas, kelp profundo,
#   praderas marinas, estrellas de mar, cardúmenes multi-cota y mantarrayas.
# ==============================================================================

const SceneEnhancer = preload("res://scripts/retreat_scene_enhancer.gd")

static func build_aquatic_limits_and_marine_life(builder: Node3D, parent: Node3D, rng: RandomNumberGenerator) -> Dictionary:
	var root := Node3D.new()
	root.name = "RetreatAquaticEcosystem"
	parent.add_child(root)

	var anim_state := {
		"buoys": [],
		"reef_fish": [],
		"lagoon_fish": [],
		"rays": [],
		"current_streaks": []
	}

	var tex_basalt: Texture2D = builder.call("_load_tex", "basalt-coastal-albedo-v1.webp")
	var tex_limestone: Texture2D = builder.call("_load_tex", "limestone-v3.webp")
	var tex_oak: Texture2D = builder.call("_load_tex", "oak-v4.webp")
	var norm_rock: Texture2D = builder.call("_load_tex", "rock-normal-v1.png")

	var mat_reef_rock: Material = builder.call("_make_textured_mat", Color("#9aa3a6"), 0.88, 0.02, tex_basalt, 0.22, true, norm_rock, 0.72)
	var mat_wet_rock: Material = builder.call("_make_textured_mat", Color("#5c6b6e"), 0.66, 0.04, tex_basalt, 0.26, true, norm_rock, 0.65)
	var mat_piling: Material = builder.call("_make_textured_mat", Color("#6a523b"), 0.86, 0.0, tex_oak, 0.32, true)
	var mat_buoy_wood: Material = builder.call("_make_textured_mat", Color("#8a4f34"), 0.76, 0.04, tex_oak, 0.45, true)
	var mat_rope: Material = builder.call("_make_mat", Color("#a9916d"), 0.92, 0.0)
	var mat_iron: Material = builder.call("_make_mat", Color("#32383a"), 0.46, 0.72)
	var mat_moss_stone: Material = builder.call("_make_textured_mat", Color("#9ea18d"), 0.84, 0.02, tex_limestone if tex_limestone else tex_basalt, 0.34, true, norm_rock, 0.52)
	var mat_current := _make_current_streak_mat()

	# --------------------------------------------------------------------------
	# 1. OPCIÓN 1: CORONA DE ARRECIFES VOLCÁNICOS "DIENTES DEL DRAGÓN"
	#    Arco semicircular físico con colisión sólida desde el lecho hasta +3m
	#    (deja abierto el canal del bote en x=18.5..27.5 protegido por resaca)
	# --------------------------------------------------------------------------
	var reef_root := Node3D.new()
	reef_root.name = "DragonTeethReefPerimeter"
	root.add_child(reef_root)

	var reef_body := StaticBody3D.new()
	reef_body.name = "DragonTeethReefColliders"
	reef_root.add_child(reef_body)

	var rock_mesh_a := SceneEnhancer.make_basalt_outcrop_mesh(211)
	var rock_mesh_b := SceneEnhancer.make_basalt_outcrop_mesh(347)

	# [pos_xz, scale_xyz, emergent_top_y, yaw_deg]
	var reef_arc_specs := [
		# Arco Oeste (variación orgánica de siluetas entre escollos bajos y farallones)
		[Vector2(-12.6, 105.5), Vector3(3.8, 3.0, 3.4), 0.95, 18.0],
		[Vector2(-11.4, 112.4), Vector3(4.5, 3.8, 3.9), 1.65, -34.0],
		[Vector2(-9.2, 119.5), Vector3(4.2, 3.2, 3.6), 0.70, 42.0],
		[Vector2(-6.0, 126.4), Vector3(5.2, 4.6, 4.4), 2.15, -18.0],
		[Vector2(-1.4, 132.4), Vector3(4.8, 3.9, 4.2), 1.20, 29.0],
		[Vector2(4.4, 137.0), Vector3(5.4, 4.8, 4.5), 2.25, -48.0],
		[Vector2(10.8, 140.0), Vector3(4.4, 3.6, 4.0), 0.95, 14.0],
		[Vector2(16.6, 141.4), Vector3(4.9, 4.4, 4.1), 1.85, -22.0],
		# Pináculo guardián occidental del canal de salida (escollo bajo con rompeolas natural)
		[Vector2(18.0, 137.8), Vector3(2.8, 3.2, 2.5), 0.85, 55.0],
		# --- Canal de salida del bote abierto en x=19.2..27.2 (gestionado por resaca visible Opción 3) ---
		# Pináculo guardián oriental del canal de salida
		[Vector2(28.4, 138.0), Vector3(3.0, 3.4, 2.7), 1.05, -42.0],
		# Arco Sur-Este y Este (conecta de vuelta con los acantilados bajo Z2)
		[Vector2(30.4, 141.2), Vector3(5.1, 4.6, 4.3), 2.05, 31.0],
		[Vector2(36.4, 138.8), Vector3(4.3, 3.5, 3.9), 0.85, -16.0],
		[Vector2(41.6, 134.2), Vector3(5.3, 4.7, 4.4), 2.10, 48.0],
		[Vector2(45.2, 127.8), Vector3(4.6, 3.9, 4.1), 1.35, -28.0],
		[Vector2(46.2, 120.8), Vector3(4.9, 4.2, 4.2), 1.75, 22.0],
		[Vector2(43.8, 114.6), Vector3(4.1, 3.1, 3.7), 0.90, -35.0],
	]

	for ri in range(reef_arc_specs.size()):
		var spec: Array = reef_arc_specs[ri]
		var xz: Vector2 = spec[0]
		var sc: Vector3 = spec[1]
		var top_y: float = float(spec[2])
		var yaw: float = deg_to_rad(float(spec[3]))
		var floor_y: float = float(builder.call("sample_aquatic_floor_height", xz.x, xz.y))
		var h_total := maxf(2.6, top_y - floor_y + 0.6)
		var base_y := floor_y + h_total * 0.34

		var rock := MeshInstance3D.new()
		rock.name = "ReefStack_%d" % ri
		rock.mesh = rock_mesh_a if (ri % 2 == 0) else rock_mesh_b
		rock.material_override = mat_reef_rock
		rock.position = Vector3(xz.x, base_y, xz.y)
		rock.rotation = Vector3(rng.randf_range(-0.14, 0.14), yaw, rng.randf_range(-0.14, 0.14))
		rock.scale = Vector3(sc.x * 0.92, h_total * 0.44, sc.z * 0.88)
		reef_root.add_child(rock)

		# Peñasco secundario inclinado al costado para romper la silueta uniforme y dejar que el ocean_shader dibuje su propia espuma orgánica
		var shoulder := MeshInstance3D.new()
		shoulder.name = "ReefBase_%d" % ri
		shoulder.mesh = rock_mesh_b if (ri % 2 == 0) else rock_mesh_a
		shoulder.material_override = mat_wet_rock
		shoulder.position = Vector3(xz.x + cos(yaw) * (sc.x * 0.52), floor_y + h_total * 0.22, xz.y + sin(yaw) * (sc.z * 0.52))
		shoulder.rotation = Vector3(0.16, yaw + 1.45, -0.14)
		shoulder.scale = Vector3(sc.x * 0.82, h_total * 0.32, sc.z * 0.78)
		reef_root.add_child(shoulder)

		# Colisionador cilíndrico vertical continuo (bloquea nado en superficie Y buceo profundo)
		var col := CollisionShape3D.new()
		col.name = "Col_ReefStack_%d" % ri
		var cyl := CylinderShape3D.new()
		cyl.radius = maxf(sc.x, sc.z) * 0.68
		cyl.height = 10.5
		col.shape = cyl
		col.position = Vector3(xz.x, -1.8, xz.y)
		reef_body.add_child(col)

	# Escollos intermedios sumergidos cerrando los huecos entre farallones principales (excepto canal del bote)
	var gap_pairs := [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[10,11],[11,12],[12,13],[13,14],[14,15]]
	for gp in gap_pairs:
		var p_a: Vector2 = reef_arc_specs[gp[0]][0]
		var p_b: Vector2 = reef_arc_specs[gp[1]][0]
		var mid := (p_a + p_b) * 0.5
		var fy: float = float(builder.call("sample_aquatic_floor_height", mid.x, mid.y))
		var ridge := MeshInstance3D.new()
		ridge.mesh = rock_mesh_b
		ridge.material_override = mat_wet_rock
		ridge.position = Vector3(mid.x, fy + 1.45, mid.y)
		ridge.rotation = Vector3(0.04, atan2(p_b.x - p_a.x, p_b.y - p_a.y), -0.04)
		ridge.scale = Vector3(3.1, 3.0, p_a.distance_to(p_b) * 0.56)
		reef_root.add_child(ridge)
		var seg_col := CollisionShape3D.new()
		var seg_box := BoxShape3D.new()
		seg_box.size = Vector3(2.4, 9.5, p_a.distance_to(p_b) * 0.92)
		seg_col.shape = seg_box
		seg_col.position = Vector3(mid.x, -2.0, mid.y)
		seg_col.rotation.y = atan2(p_b.x - p_a.x, p_b.y - p_a.y)
		reef_body.add_child(seg_col)

	# --------------------------------------------------------------------------
	# 2. OPCIÓN 2: ESTACAS, CABOS Y BOYAS DEL CLAUSTRO (PERÍMETRO SEGURO)
	#    Delimitación náutica amistosa frente al muelle, canal central abierto
	# --------------------------------------------------------------------------
	var buoys_root := Node3D.new()
	buoys_root.name = "CloisterHarborBuoys"
	root.add_child(buoys_root)

	var west_line := [
		Vector2(2.6, 118.4), Vector2(6.8, 123.0), Vector2(12.2, 126.4), Vector2(17.8, 128.4)
	]
	var east_line := [
		Vector2(28.4, 128.0), Vector2(33.4, 125.6), Vector2(37.8, 121.6), Vector2(40.2, 116.8)
	]
	for line_idx in range(2):
		var pts: Array = west_line if line_idx == 0 else east_line
		for bi in range(pts.size()):
			var p2: Vector2 = pts[bi]
			var fy: float = float(builder.call("sample_aquatic_floor_height", p2.x, p2.y))
			var is_channel_marker := (line_idx == 0 and bi == pts.size() - 1) or (line_idx == 1 and bi == 0)
			if bi % 2 == 0 or is_channel_marker:
				# Pilote de madera hundido en el fondo marino con aros de hierro
				var post_h := maxf(2.4, -fy + (1.35 if is_channel_marker else 0.92))
				var post := MeshInstance3D.new()
				post.name = "HarborPiling_%d_%d" % [line_idx, bi]
				var pcyl := CylinderMesh.new()
				pcyl.top_radius = 0.12 if is_channel_marker else 0.095
				pcyl.bottom_radius = 0.15 if is_channel_marker else 0.12
				pcyl.height = post_h
				pcyl.radial_segments = 8
				post.mesh = pcyl
				post.material_override = mat_piling
				post.position = Vector3(p2.x, fy + post_h * 0.5 - 0.15, p2.y)
				buoys_root.add_child(post)
				SceneEnhancer.add_cyl_collider(buoys_root, Vector3(p2.x, fy + post_h * 0.5, p2.y), 0.24, post_h)

				if is_channel_marker:
					# Farol de baliza portuaria en los 2 pilotes que flanquean el canal del bote
					var cap := MeshInstance3D.new()
					var cap_c := CylinderMesh.new()
					cap_c.top_radius = 0.06; cap_c.bottom_radius = 0.16; cap_c.height = 0.16; cap_c.radial_segments = 6
					cap.mesh = cap_c
					cap.material_override = mat_iron
					cap.position = Vector3(p2.x, 1.38, p2.y)
					buoys_root.add_child(cap)

					var glass := MeshInstance3D.new()
					var gc := CylinderMesh.new()
					gc.top_radius = 0.11; gc.bottom_radius = 0.10; gc.height = 0.22; gc.radial_segments = 6
					glass.mesh = gc
					var mat_glow := StandardMaterial3D.new()
					mat_glow.albedo_color = Color("#ffd07a")
					mat_glow.emission_enabled = true
					mat_glow.emission = Color("#ff9f38")
					mat_glow.emission_energy_multiplier = 1.65
					glass.material_override = mat_glow
					glass.position = Vector3(p2.x, 1.22, p2.y)
					buoys_root.add_child(glass)

					var lgt := OmniLight3D.new()
					lgt.light_color = Color("#ffae52")
					lgt.light_energy = 1.15
					lgt.omni_range = 7.5
					lgt.distance_fade_enabled = false
					lgt.position = Vector3(p2.x, 1.25, p2.y)
					buoys_root.add_child(lgt)
			else:
				# Boya flotante de tonel alquitranado amarrada al fondo con cabo vertical
				var buoy := Node3D.new()
				buoy.name = "HarborBuoy_%d_%d" % [line_idx, bi]
				buoy.position = Vector3(p2.x, 0.04, p2.y)
				buoys_root.add_child(buoy)

				var barrel := MeshInstance3D.new()
				var bc := CylinderMesh.new()
				bc.top_radius = 0.26; bc.bottom_radius = 0.26; bc.height = 0.56; bc.radial_segments = 10
				barrel.mesh = bc
				barrel.material_override = mat_buoy_wood
				barrel.rotation.z = PI * 0.5
				buoy.add_child(barrel)

				for bx_hoop in [-0.18, 0.18]:
					var hoop := MeshInstance3D.new()
					var hc := CylinderMesh.new()
					hc.top_radius = 0.275; hc.bottom_radius = 0.275; hc.height = 0.045; hc.radial_segments = 10
					hoop.mesh = hc
					hoop.material_override = mat_iron
					hoop.rotation.z = PI * 0.5
					hoop.position.x = bx_hoop
					buoy.add_child(hoop)

				# Cadena/cabo de anclaje bajando hasta el lecho marino
				var chain := MeshInstance3D.new()
				var ch_h := maxf(0.8, -fy)
				var ch_c := CylinderMesh.new()
				ch_c.top_radius = 0.025; ch_c.bottom_radius = 0.025; ch_c.height = ch_h; ch_c.radial_segments = 5
				chain.mesh = ch_c
				chain.material_override = mat_iron
				chain.position = Vector3(0.0, -ch_h * 0.5, 0.0)
				buoy.add_child(chain)

				anim_state["buoys"].append({"node": buoy, "base_xz": p2, "phase": float(line_idx * 4 + bi) * 1.15})

			# Catenaria de cabo marinero entre elementos consecutivos de la baliza (decorativa, por encima del agua para pasar buceando si se quiere llegar al arrecife)
			if bi < pts.size() - 1:
				var p_next: Vector2 = pts[bi + 1]
				var seg_len := p2.distance_to(p_next)
				var mid2 := (p2 + p_next) * 0.5
				var rope := MeshInstance3D.new()
				var rb := BoxMesh.new()
				rb.size = Vector3(0.045, 0.045, seg_len)
				rope.mesh = rb
				rope.material_override = mat_rope
				rope.position = Vector3(mid2.x, 0.24, mid2.y)
				rope.rotation.y = atan2(p_next.x - p2.x, p_next.y - p2.y)
				buoys_root.add_child(rope)

	# --------------------------------------------------------------------------
	# 3. OPCIÓN 3: ESTELAS SUTILES DE CORRIENTE / RESACA EN EL CANAL PROFUNDO
	# --------------------------------------------------------------------------
	var current_root := Node3D.new()
	current_root.name = "OpenSeaCurrentStreaks"
	root.add_child(current_root)
	for ci in range(5):
		var cx := lerpf(20.0, 26.4, float(ci) / 4.0) + rng.randf_range(-0.4, 0.4)
		var cz := 137.4 + sin(float(ci) * 2.1) * 1.4
		var streak := MeshInstance3D.new()
		streak.name = "CurrentStreak_%d" % ci
		var pm := PlaneMesh.new()
		pm.size = Vector2(rng.randf_range(0.75, 1.25), rng.randf_range(4.5, 7.2))
		streak.mesh = pm
		streak.material_override = mat_current
		streak.position = Vector3(cx, 0.04, cz)
		streak.rotation.y = rng.randf_range(-0.18, 0.18)
		streak.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		current_root.add_child(streak)
		anim_state["current_streaks"].append({"node": streak, "base_x": cx, "base_z": cz, "phase": float(ci) * 0.92})

	# --------------------------------------------------------------------------
	# 4. LAGUNA INTERIOR (lagoon_bowl): OPCIÓN 1 SUAVE + MINI OPCIÓN 5 MONÁSTICA
	#    Antiguo espigón monástico de caliza desgastada + rocas basálticas de ribera
	# --------------------------------------------------------------------------
	var lagoon_root := Node3D.new()
	lagoon_root.name = "InteriorLagoonSanctuary"
	root.add_child(lagoon_root)

	# Escalinata/espigón arruinado en caliza musgosa en la orilla NE de la laguna (aspecto arquitectónico, no bloques lisos)
	var quay_specs := [
		[Vector3(29.8, -0.35, 96.2), Vector3(1.65, 0.85, 1.35), 0.28],
		[Vector3(31.1, -0.18, 97.6), Vector3(1.50, 1.05, 1.40), -0.14],
		[Vector3(31.5, -0.42, 99.4), Vector3(1.55, 0.78, 1.25), 0.12],
		[Vector3(30.6, -0.78, 101.2), Vector3(1.35, 0.62, 1.15), -0.36],
	]
	for qi in range(quay_specs.size()):
		var qs: Array = quay_specs[qi]
		var qp: Vector3 = qs[0]
		var qsz: Vector3 = qs[1]
		var qy: float = float(qs[2])
		var plinth := MeshInstance3D.new()
		plinth.name = "LagoonQuayStone_%d" % qi
		var pm := BoxMesh.new()
		pm.size = qsz
		plinth.mesh = pm
		plinth.material_override = mat_moss_stone
		plinth.position = qp
		plinth.rotation = Vector3(rng.randf_range(-0.07, 0.07), qy, rng.randf_range(-0.07, 0.07))
		lagoon_root.add_child(plinth)
		# Losa superior sobresaliente desgastada (cornisa de espigón antiguo)
		var coping := MeshInstance3D.new()
		var cm := BoxMesh.new()
		cm.size = Vector3(qsz.x * 1.12, 0.16, qsz.z * 1.10)
		coping.mesh = cm
		coping.material_override = mat_moss_stone
		coping.position = Vector3(0.0, qsz.y * 0.5 + 0.06, 0.0)
		plinth.add_child(coping)
		SceneEnhancer.add_box_collider(lagoon_root, qp + Vector3(0.0, 0.35, 0.0), qsz * Vector3(0.95, 1.5, 0.95))

	# Tambores de columna cilíndrica caídos sobre el fondo esmeralda (punto de interés al bucear)
	for ci in range(2):
		var col_drum := MeshInstance3D.new()
		col_drum.name = "LagoonSunkenColumn_%d" % ci
		var cc := CylinderMesh.new()
		cc.top_radius = 0.28; cc.bottom_radius = 0.31; cc.height = 1.95 if ci == 0 else 1.45; cc.radial_segments = 10
		col_drum.mesh = cc
		col_drum.material_override = mat_moss_stone
		col_drum.position = Vector3(26.8, -2.18, 97.9) if ci == 0 else Vector3(24.0, -2.26, 96.6)
		col_drum.rotation = Vector3(PI * 0.47, 0.62 if ci == 0 else -0.48, 0.08)
		lagoon_root.add_child(col_drum)

	# Borde natural de cantos basálticos suavizando el contorno de la laguna (norte y este)
	var lagoon_rim_rocks := [
		[Vector3(20.2, 0.08, 93.6), Vector3(2.0, 1.10, 1.7)],
		[Vector3(23.2, 0.02, 93.0), Vector3(2.3, 1.20, 1.8)],
		[Vector3(26.6, 0.06, 93.2), Vector3(2.4, 1.25, 1.9)],
		[Vector3(29.2, 0.10, 94.2), Vector3(2.1, 1.15, 1.7)],
		[Vector3(29.4, -0.05, 102.6), Vector3(1.75, 0.72, 1.55)],
		[Vector3(28.0, -0.08, 104.2), Vector3(1.55, 0.62, 1.40)],
	]
	for lri in range(lagoon_rim_rocks.size()):
		var lr: Array = lagoon_rim_rocks[lri]
		var rnode := MeshInstance3D.new()
		rnode.name = "LagoonRimRock_%d" % lri
		rnode.mesh = rock_mesh_a if lri % 2 == 0 else rock_mesh_b
		rnode.material_override = mat_reef_rock
		rnode.position = lr[0]
		rnode.scale = lr[1]
		rnode.rotation.y = rng.randf_range(0.0, TAU)
		lagoon_root.add_child(rnode)
		if lri < 4:
			SceneEnhancer.add_cyl_collider(lagoon_root, lr[0] + Vector3(0.0, 0.3, 0.0), (lr[1] as Vector3).x * 0.55, 3.2)

	# --------------------------------------------------------------------------
	# 5. FLORA SUBMARINA: CORALES RAMIFICADOS, CORALES CEREBRO, GORGONIAS,
	#    ANÉMONAS, KELP PROFUNDO, PRADERAS MARINAS Y ESTRELLAS DE MAR
	# --------------------------------------------------------------------------
	_build_corals_and_benthic_flora(builder, root, rng, reef_arc_specs)

	# --------------------------------------------------------------------------
	# 6. FAUNA MARINA Y DE LAGUNA: CARDÚMENES MULTI-COTA + MANTARRAYAS + PECES LAGO
	# --------------------------------------------------------------------------
	_build_marine_and_lagoon_fauna(builder, root, rng, anim_state)

	return anim_state

static func _build_corals_and_benthic_flora(builder: Node3D, parent: Node3D, rng: RandomNumberGenerator, reef_arc_specs: Array) -> void:
	var branch_xf: Array[Transform3D] = []
	var branch_col: Array[Color] = []
	var brain_xf: Array[Transform3D] = []
	var brain_col: Array[Color] = []
	var fan_xf: Array[Transform3D] = []
	var fan_col: Array[Color] = []
	var kelp_xf: Array[Transform3D] = []
	var kelp_col: Array[Color] = []
	var star_xf: Array[Transform3D] = []
	var star_col: Array[Color] = []

	var branch_pal: Array[Color] = [
		Color("#d66a4a"), Color("#e08b4f"), Color("#c75668"), Color("#cf9b48"), Color("#9e5c8a")
	]
	var brain_pal: Array[Color] = [
		Color("#c6984a"), Color("#8fa354"), Color("#b86b52"), Color("#8e79a8"), Color("#5ea392")
	]
	var fan_pal: Array[Color] = [
		Color("#c94c5c"), Color("#de8640"), Color("#a85296"), Color("#d4b44c")
	]
	var kelp_pal: Array[Color] = [
		Color("#1c402c"), Color("#244f33"), Color("#2c5a30"), Color("#18362a")
	]
	var star_pal: Array[Color] = [
		Color("#d95f3c"), Color("#e6a23c"), Color("#c24864")
	]

	# A) Bancos de coral en la plataforma de buceo (-1.1m a -4.9m) y alrededor de los arrecifes
	var coral_clusters: Array[Vector2] = [
		Vector2(8.0, 122.0), Vector2(14.5, 124.5), Vector2(19.5, 126.8), Vector2(25.5, 127.0),
		Vector2(31.5, 124.0), Vector2(36.0, 121.5), Vector2(4.0, 128.5), Vector2(11.0, 131.5),
		Vector2(17.5, 132.5), Vector2(24.0, 133.5), Vector2(30.5, 132.0), Vector2(37.0, 129.0),
		Vector2(6.5, 135.0), Vector2(14.0, 136.8), Vector2(32.5, 136.2), Vector2(40.5, 125.0),
		Vector2(-3.5, 121.5), Vector2(-1.0, 127.5), Vector2(22.0, 122.0)
	]
	for spec in reef_arc_specs:
		var rxz: Vector2 = spec[0]
		# Desplazar ligeramente hacia el interior de la cala para formar jardines de coral al pie del farallón
		var inward := (Vector2(22.0, 118.0) - rxz).normalized()
		coral_clusters.append(rxz + inward * 3.1)

	for cl in coral_clusters:
		var base_count := 4
		for _i in range(base_count):
			var wx := cl.x + rng.randf_range(-2.6, 2.6)
			var wz := cl.y + rng.randf_range(-2.4, 2.4)
			var sy: float = float(builder.call("sample_aquatic_floor_height", wx, wz))
			if sy > -0.75 or sy < -5.3:
				continue
			var sc := rng.randf_range(0.55, 1.28)
			var b := Basis.from_euler(Vector3(rng.randf_range(-0.14, 0.14), rng.randf_range(0.0, TAU), rng.randf_range(-0.14, 0.14))).scaled(Vector3(sc, sc * rng.randf_range(0.85, 1.35), sc))
			if rng.randf() < 0.56:
				branch_xf.append(Transform3D(b, Vector3(wx, sy + 0.04, wz)))
				branch_col.append(branch_pal[rng.randi() % branch_pal.size()])
			else:
				var bsc := rng.randf_range(0.45, 1.10)
				var bb := Basis.from_euler(Vector3(rng.randf_range(-0.1, 0.1), rng.randf_range(0.0, TAU), rng.randf_range(-0.1, 0.1))).scaled(Vector3(bsc * 1.2, bsc * 0.72, bsc * 1.15))
				brain_xf.append(Transform3D(bb, Vector3(wx, sy + 0.02, wz)))
				brain_col.append(brain_pal[rng.randi() % brain_pal.size()])
			if rng.randf() < 0.42:
				var fsc := rng.randf_range(0.65, 1.25)
				var fb := Basis.from_euler(Vector3(rng.randf_range(-0.12, 0.12), rng.randf_range(0.0, TAU), rng.randf_range(-0.12, 0.12))).scaled(Vector3(fsc, fsc * 1.15, fsc))
				fan_xf.append(Transform3D(fb, Vector3(wx + rng.randf_range(-0.6, 0.6), sy + 0.04, wz + rng.randf_range(-0.6, 0.6))))
				fan_col.append(fan_pal[rng.randi() % fan_pal.size()])

	# B) Flora de aguas calmas en la laguna interior (lagoon_bowl: x=20..30, z=94.5..103.5)
	for _li in range(28):
		var lx := rng.randf_range(20.4, 30.2)
		var lz := rng.randf_range(94.6, 103.2)
		var lsy: float = float(builder.call("sample_aquatic_floor_height", lx, lz))
		if lsy > -0.55 or lsy < -3.2:
			continue
		var ksc := rng.randf_range(0.45, 0.88)
		var kb := Basis.from_euler(Vector3(rng.randf_range(-0.08, 0.08), rng.randf_range(0.0, TAU), rng.randf_range(-0.08, 0.08))).scaled(Vector3(ksc, rng.randf_range(0.55, 1.05), ksc))
		kelp_xf.append(Transform3D(kb, Vector3(lx, lsy + 0.02, lz)))
		kelp_col.append(Color("#2a684a") if rng.randf() < 0.55 else Color("#357a54"))
		if rng.randf() < 0.35:
			var s_sc := rng.randf_range(0.28, 0.55)
			var sb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(s_sc, s_sc * 0.65, s_sc))
			brain_xf.append(Transform3D(sb, Vector3(lx + 0.35, lsy + 0.02, lz - 0.25)))
			brain_col.append(Color("#6ea87e") if rng.randf() < 0.5 else Color("#a6b562"))

	# C) Bosque de kelp profundo y praderas marinas en mar abierto (-1.2m a -5.2m)
	for _ki in range(110):
		var kx := rng.randf_range(-8.0, 42.0)
		var kz := rng.randf_range(117.5, 141.0)
		var ksy: float = float(builder.call("sample_aquatic_floor_height", kx, kz))
		if ksy > -0.85 or ksy < -5.4:
			continue
		var depth_f := clampf((-ksy - 0.8) / 3.8, 0.0, 1.0)
		var kh := lerpf(0.65, 2.35, depth_f) * rng.randf_range(0.75, 1.25)
		var kw := rng.randf_range(0.55, 1.10)
		var kb := Basis.from_euler(Vector3(rng.randf_range(-0.10, 0.10), rng.randf_range(0.0, TAU), rng.randf_range(-0.10, 0.10))).scaled(Vector3(kw, kh, kw))
		kelp_xf.append(Transform3D(kb, Vector3(kx, ksy + 0.02, kz)))
		kelp_col.append(kelp_pal[rng.randi() % kelp_pal.size()])

	# D) Estrellas de mar en bancos de arena someros y lecho de laguna/arrecife
	for _si in range(36):
		var in_lag := rng.randf() < 0.28
		var sx := rng.randf_range(21.0, 29.2) if in_lag else rng.randf_range(3.0, 36.0)
		var sz := rng.randf_range(95.2, 103.5) if in_lag else rng.randf_range(113.0, 134.0)
		var ssy: float = float(builder.call("sample_aquatic_floor_height", sx, sz))
		if ssy > -0.22 or ssy < -4.2:
			continue
		var st_sc := rng.randf_range(0.18, 0.34)
		var stb := Basis.from_euler(Vector3(0.0, rng.randf_range(0.0, TAU), 0.0)).scaled(Vector3(st_sc, 0.06, st_sc))
		star_xf.append(Transform3D(stb, Vector3(sx, ssy + 0.04, sz)))
		star_col.append(star_pal[rng.randi() % star_pal.size()])

	var mat_coral := StandardMaterial3D.new()
	mat_coral.vertex_color_use_as_albedo = true
	mat_coral.vertex_color_is_srgb = true
	mat_coral.roughness = 0.72
	mat_coral.metallic = 0.02

	if not branch_xf.is_empty():
		var mm_br: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_SeaBranchCorals", _make_branch_coral_mesh(), mat_coral, branch_xf, branch_col)
		mm_br.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_br)
	if not brain_xf.is_empty():
		var mm_bn: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_SeaBrainCorals", _make_brain_coral_mesh(), mat_coral, brain_xf, brain_col)
		mm_bn.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_bn)
	if not fan_xf.is_empty():
		var mm_fn: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_SeaFans", _make_sea_fan_mesh(), _make_swaying_flora_mat(0.10, 1.45), fan_xf, fan_col)
		mm_fn.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_fn)
	if not kelp_xf.is_empty():
		var mm_kp: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_DeepKelpForest", _make_tall_kelp_mesh(), _make_swaying_flora_mat(0.18, 1.15), kelp_xf, kelp_col)
		mm_kp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_kp)
	if not star_xf.is_empty():
		var mm_st: MultiMeshInstance3D = builder.call("_make_multimesh_batch", "MM_BenthicStarfish", _make_starfish_mesh(), mat_coral, star_xf, star_col)
		mm_st.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mm_st)

static func _build_marine_and_lagoon_fauna(builder: Node3D, parent: Node3D, rng: RandomNumberGenerator, anim_state: Dictionary) -> void:
	var fauna_root := Node3D.new()
	fauna_root.name = "RetreatMarineFauna"
	parent.add_child(fauna_root)

	var mat_eye: Material = builder.call("_make_mat", Color("#101418"), 0.08, 0.15)
	var palettes := [
		# 0: Peces de arrecife dorado-coral
		[builder.call("_make_mat", Color("#e09b3e"), 0.26, 0.25), builder.call("_make_mat", Color("#f2c86b"), 0.34, 0.14)],
		# 1: Damiselas azul cobalto-turquesa
		[builder.call("_make_mat", Color("#2d8cb8"), 0.22, 0.34), builder.call("_make_mat", Color("#64c7de"), 0.32, 0.16)],
		# 2: Doradas/meros azul marino profundo
		[builder.call("_make_mat", Color("#466c85"), 0.24, 0.38), builder.call("_make_mat", Color("#7ea2b8"), 0.35, 0.18)],
	]

	# 28 peces de arrecife y mar abierto distribuidos en varias cotas (-0.9m a -4.1m)
	var sea_schools := [
		{"center": Vector3(10.5, -1.35, 123.5), "count": 6, "pal": 0, "rx": 3.4, "rz": 2.2, "scale": 0.92},
		{"center": Vector3(22.5, -2.25, 129.0), "count": 6, "pal": 1, "rx": 4.2, "rz": 2.8, "scale": 0.98},
		{"center": Vector3(32.5, -1.95, 125.0), "count": 5, "pal": 0, "rx": 3.2, "rz": 2.1, "scale": 0.90},
		{"center": Vector3(14.5, -3.20, 134.0), "count": 6, "pal": 2, "rx": 4.6, "rz": 2.6, "scale": 1.24},
		{"center": Vector3(29.0, -3.35, 134.5), "count": 5, "pal": 1, "rx": 4.0, "rz": 2.4, "scale": 1.15},
	]
	var fi_idx := 0
	for sc_def in sea_schools:
		var pal: Array = palettes[int(sc_def["pal"])]
		var cnt: int = int(sc_def["count"])
		var c0: Vector3 = sc_def["center"]
		for k in range(cnt):
			var off := Vector3(rng.randf_range(-1.6, 1.6), rng.randf_range(-0.32, 0.28), rng.randf_range(-1.4, 1.4))
			var pos := c0 + off
			var f_sc: float = float(sc_def["scale"]) * rng.randf_range(0.84, 1.18)
			var fnode: Node3D = builder.call("_create_coastal_fish_node", "SeaReefFish_%d" % fi_idx, pos, f_sc, pal[0], pal[1], mat_eye)
			fauna_root.add_child(fnode)
			anim_state["reef_fish"].append({
				"node": fnode,
				"tail": fnode.get_node_or_null("TailPivot"),
				"center": pos,
				"rx": float(sc_def["rx"]) * rng.randf_range(0.75, 1.15),
				"rz": float(sc_def["rz"]) * rng.randf_range(0.75, 1.15),
				"speed": rng.randf_range(0.36, 0.64),
				"phase": float(fi_idx) * 0.85 + rng.randf_range(0.0, 1.2)
			})
			fi_idx += 1

	# 10 peces tranquilos propios de la laguna interior (verde-bronce esmeralda)
	var mat_lag_body: Material = builder.call("_make_mat", Color("#769e6a"), 0.26, 0.28)
	var mat_lag_fin: Material = builder.call("_make_mat", Color("#b8c982"), 0.36, 0.14)
	for li in range(10):
		var lpos := Vector3(rng.randf_range(22.2, 28.4), rng.randf_range(-1.85, -0.68), rng.randf_range(96.0, 102.2))
		var lnode: Node3D = builder.call("_create_coastal_fish_node", "LagoonFish_%d" % li, lpos, rng.randf_range(0.78, 1.05), mat_lag_body, mat_lag_fin, mat_eye)
		fauna_root.add_child(lnode)
		anim_state["lagoon_fish"].append({
			"node": lnode,
			"tail": lnode.get_node_or_null("TailPivot"),
			"center": lpos,
			"rx": rng.randf_range(1.15, 2.25),
			"rz": rng.randf_range(0.95, 1.85),
			"speed": rng.randf_range(0.24, 0.42),
			"phase": float(li) * 1.12
		})

	# 3 mantarrayas elegantes planeando sobre el fondo arenoso profundo al bucear
	var mat_ray_top: Material = builder.call("_make_mat", Color("#324e5e"), 0.42, 0.12)
	var mat_ray_belly: Material = builder.call("_make_mat", Color("#a8c2c8"), 0.56, 0.04)
	var ray_specs := [
		{"center": Vector3(13.0, -3.15, 132.0), "rx": 6.2, "rz": 3.4, "speed": 0.20, "phase": 0.4, "scale": 1.18},
		{"center": Vector3(26.5, -3.55, 133.2), "rx": 6.8, "rz": 3.6, "speed": 0.18, "phase": 2.5, "scale": 1.32},
		{"center": Vector3(34.0, -2.55, 126.5), "rx": 4.8, "rz": 2.9, "speed": 0.22, "phase": 4.6, "scale": 1.02},
	]
	for ri in range(ray_specs.size()):
		var rs: Dictionary = ray_specs[ri]
		var rnode := _create_manta_ray_node("SeaMantaRay_%d" % ri, float(rs["scale"]), mat_ray_top, mat_ray_belly)
		rnode.position = rs["center"]
		fauna_root.add_child(rnode)
		anim_state["rays"].append({
			"node": rnode,
			"wing_l": rnode.get_node_or_null("WingL"),
			"wing_r": rnode.get_node_or_null("WingR"),
			"tail": rnode.get_node_or_null("RayTail"),
			"center": rs["center"],
			"rx": float(rs["rx"]),
			"rz": float(rs["rz"]),
			"speed": float(rs["speed"]),
			"phase": float(rs["phase"])
		})

static func animate_marine_life(anim_state: Dictionary, t: float, sea_y: float) -> void:
	if anim_state.is_empty():
		return
	for b in anim_state.get("buoys", []):
		var bn: Node3D = b.get("node")
		if not is_instance_valid(bn):
			continue
		var ph: float = float(b.get("phase", 0.0))
		bn.position.y = sea_y + 0.04 + sin(t * 1.85 + ph) * 0.09
		bn.rotation.x = sin(t * 1.45 + ph) * 0.10
		bn.rotation.z = cos(t * 1.25 + ph * 0.7) * 0.12

	for cs in anim_state.get("current_streaks", []):
		var cn: Node3D = cs.get("node")
		if not is_instance_valid(cn):
			continue
		var ph: float = float(cs.get("phase", 0.0))
		var cycle := fposmod(t * 0.55 + ph, 1.0)
		# Estelas de espuma moviéndose hacia la costa (-Z) mostrando visualmente la resaca
		cn.position = Vector3(float(cs["base_x"]) + sin(t * 1.1 + ph) * 0.25, sea_y + 0.055, float(cs["base_z"]) + 2.2 - cycle * 4.4)

	for group_key in ["reef_fish", "lagoon_fish"]:
		for cf in anim_state.get(group_key, []):
			var fn: Node3D = cf.get("node")
			if not is_instance_valid(fn):
				continue
			var c: Vector3 = cf["center"]
			var rx: float = float(cf["rx"])
			var rz: float = float(cf["rz"])
			var spd: float = float(cf["speed"])
			var ph: float = float(cf["phase"])
			var ang := t * spd + ph
			var px := c.x + cos(ang) * rx
			var pz := c.z + sin(ang * 2.0) * rz * 0.55
			var vx := -sin(ang) * rx * spd
			var vz := cos(ang * 2.0) * rz * 1.1 * spd
			fn.position = Vector3(px, sea_y + c.y + sin(ang * 1.6) * 0.10, pz)
			if vx * vx + vz * vz > 0.0001:
				fn.rotation.y = atan2(vx, vz)
			var tp: Node3D = cf.get("tail")
			if is_instance_valid(tp):
				tp.rotation.y = sin(t * 9.0 + ph) * 0.36

	for mr in anim_state.get("rays", []):
		var rn: Node3D = mr.get("node")
		if not is_instance_valid(rn):
			continue
		var c: Vector3 = mr["center"]
		var rx: float = float(mr["rx"])
		var rz: float = float(mr["rz"])
		var spd: float = float(mr["speed"])
		var ph: float = float(mr["phase"])
		var ang := t * spd + ph
		var px := c.x + cos(ang) * rx
		var pz := c.z + sin(ang) * rz
		var vx := -sin(ang) * rx * spd
		var vz := cos(ang) * rz * spd
		rn.position = Vector3(px, sea_y + c.y + sin(t * 1.2 + ph) * 0.16, pz)
		if vx * vx + vz * vz > 0.0001:
			rn.rotation.y = atan2(vx, vz)
		var flap := sin(t * 2.6 + ph) * 0.24
		var wl: Node3D = mr.get("wing_l")
		var wr: Node3D = mr.get("wing_r")
		var rt: Node3D = mr.get("tail")
		if is_instance_valid(wl):
			wl.rotation.z = flap
		if is_instance_valid(wr):
			wr.rotation.z = -flap
		if is_instance_valid(rt):
			rt.rotation.y = sin(t * 2.6 + ph - 0.8) * 0.18

static func _create_manta_ray_node(r_name: String, sc: float, mat_top: Material, mat_belly: Material) -> Node3D:
	var root := Node3D.new()
	root.name = r_name
	root.scale = Vector3(sc, sc, sc)

	var body := MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.42; bm.height = 0.22; bm.radial_segments = 10; bm.rings = 5
	body.mesh = bm
	body.material_override = mat_top
	body.scale = Vector3(1.15, 0.55, 1.55)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(body)

	var belly := MeshInstance3D.new()
	belly.mesh = bm
	belly.material_override = mat_belly
	belly.scale = Vector3(1.02, 0.35, 1.38)
	belly.position.y = -0.04
	belly.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(belly)

	for side in [-1.0, 1.0]:
		var wp := Node3D.new()
		wp.name = "WingL" if side < 0.0 else "WingR"
		wp.position = Vector3(side * 0.32, 0.0, 0.05)
		root.add_child(wp)
		var wm := MeshInstance3D.new()
		var wb := PrismMesh.new()
		wb.size = Vector3(0.95, 0.08, 1.05)
		wm.mesh = wb
		wm.material_override = mat_top
		wm.position = Vector3(side * 0.44, 0.0, -0.05)
		wm.rotation.y = side * 0.38
		wm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		wp.add_child(wm)

	var tp := Node3D.new()
	tp.name = "RayTail"
	tp.position = Vector3(0.0, 0.0, -0.55)
	root.add_child(tp)
	var tm := MeshInstance3D.new()
	var tc := CylinderMesh.new()
	tc.top_radius = 0.015; tc.bottom_radius = 0.055; tc.height = 1.15; tc.radial_segments = 5
	tm.mesh = tc
	tm.material_override = mat_top
	tm.rotation.x = PI * 0.5
	tm.position = Vector3(0.0, 0.0, -0.55)
	tm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tp.add_child(tm)
	return root

static func _make_branch_coral_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var branches := [
		[Vector3(0.0, 0.0, 0.0), Vector3(0.02, 0.42, 0.01), 0.09, 0.05],
		[Vector3(0.01, 0.24, 0.0), Vector3(0.24, 0.68, 0.14), 0.06, 0.025],
		[Vector3(0.01, 0.28, 0.0), Vector3(-0.22, 0.72, 0.12), 0.06, 0.024],
		[Vector3(0.0, 0.22, 0.01), Vector3(0.10, 0.66, -0.24), 0.055, 0.022],
		[Vector3(-0.02, 0.32, 0.02), Vector3(-0.14, 0.78, -0.18), 0.05, 0.020],
		[Vector3(0.14, 0.48, 0.08), Vector3(0.34, 0.82, 0.22), 0.04, 0.016],
		[Vector3(-0.13, 0.50, 0.06), Vector3(-0.34, 0.85, 0.18), 0.04, 0.016],
	]
	for br in branches:
		_add_taper_limb(st, br[0], br[1], float(br[2]), float(br[3]), 5)
	st.generate_normals()
	return st.commit()

static func _add_taper_limb(st: SurfaceTool, a: Vector3, b: Vector3, r0: float, r1: float, sides: int) -> void:
	var axis := (b - a).normalized()
	var up := Vector3.UP if absf(axis.dot(Vector3.UP)) < 0.92 else Vector3.RIGHT
	var u := axis.cross(up).normalized()
	var v := axis.cross(u).normalized()
	var ring0: Array[Vector3] = []
	var ring1: Array[Vector3] = []
	for i in range(sides):
		var ang := TAU * float(i) / float(sides)
		var d := u * cos(ang) + v * sin(ang)
		ring0.append(a + d * r0)
		ring1.append(b + d * r1)
	for i in range(sides):
		var ni := (i + 1) % sides
		st.set_color(Color.WHITE); st.add_vertex(ring0[i])
		st.set_color(Color.WHITE); st.add_vertex(ring0[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring1[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring0[i])
		st.set_color(Color.WHITE); st.add_vertex(ring1[ni])
		st.set_color(Color.WHITE); st.add_vertex(ring1[i])

static func _make_brain_coral_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := 4
	var segs := 10
	var layers: Array = []
	for ri in range(rings + 1):
		var phi := (float(ri) / float(rings)) * (PI * 0.5)
		var rr := cos(phi) * 0.45
		var yy := sin(phi) * 0.36
		var row: Array[Vector3] = []
		for si in range(segs):
			var th := TAU * float(si) / float(segs)
			var bump := 1.0 + 0.14 * sin(th * 5.0 + float(ri) * 1.4) * cos(phi * 3.0)
			row.append(Vector3(cos(th) * rr * bump, yy * bump, sin(th) * rr * bump))
		layers.append(row)
	for ri in range(rings):
		var a: Array = layers[ri]
		var b: Array = layers[ri + 1]
		for si in range(segs):
			var ns := (si + 1) % segs
			st.set_color(Color.WHITE); st.add_vertex(a[si])
			st.set_color(Color.WHITE); st.add_vertex(a[ns])
			st.set_color(Color.WHITE); st.add_vertex(b[ns])
			st.set_color(Color.WHITE); st.add_vertex(a[si])
			st.set_color(Color.WHITE); st.add_vertex(b[ns])
			st.set_color(Color.WHITE); st.add_vertex(b[si])
	st.generate_normals()
	return st.commit()

static func _make_sea_fan_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for fi in range(5):
		var spread := lerpf(-0.55, 0.55, float(fi) / 4.0)
		var h := 0.72 - absf(spread) * 0.25
		var p0 := Vector3(-0.04, 0.0, 0.0)
		var p1 := Vector3(0.04, 0.0, 0.0)
		var p2 := Vector3(spread + 0.10, h, sin(float(fi)) * 0.06)
		var p3 := Vector3(spread - 0.10, h, sin(float(fi)) * 0.06)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 0)); st.add_vertex(p1)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 0)); st.add_vertex(p0)
		st.set_color(Color.WHITE); st.set_uv(Vector2(1, 1)); st.add_vertex(p2)
		st.set_color(Color.WHITE); st.set_uv(Vector2(0, 1)); st.add_vertex(p3)
	st.generate_normals()
	return st.commit()

static func _make_tall_kelp_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for bi in range(4):
		var yaw := float(bi) * (TAU / 4.0) + 0.25
		var ca := cos(yaw)
		var sa := sin(yaw)
		var w0 := 0.08
		var segs := 4
		for si in range(segs):
			var t0 := float(si) / float(segs)
			var t1 := float(si + 1) / float(segs)
			var x_off0 := sin(t0 * PI) * 0.14
			var x_off1 := sin(t1 * PI) * 0.14
			var hw0 := w0 * (1.0 - t0 * 0.55)
			var hw1 := w0 * (1.0 - t1 * 0.65)
			var a0 := Vector3(ca * (x_off0 - hw0), t0, sa * (x_off0 - hw0))
			var b0 := Vector3(ca * (x_off0 + hw0), t0, sa * (x_off0 + hw0))
			var b1 := Vector3(ca * (x_off1 + hw1), t1, sa * (x_off1 + hw1))
			var a1 := Vector3(ca * (x_off1 - hw1), t1, sa * (x_off1 - hw1))
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t0)); st.add_vertex(a0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t0)); st.add_vertex(b0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t1)); st.add_vertex(b1)
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t0)); st.add_vertex(a0)
			st.set_color(Color.WHITE); st.set_uv(Vector2(1, t1)); st.add_vertex(b1)
			st.set_color(Color.WHITE); st.set_uv(Vector2(0, t1)); st.add_vertex(a1)
	st.generate_normals()
	return st.commit()

static func _make_starfish_mesh() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var center_top := Vector3(0.0, 0.25, 0.0)
	for i in range(5):
		var a_tip := TAU * float(i) / 5.0
		var a_l := a_tip - TAU / 10.0
		var a_r := a_tip + TAU / 10.0
		var tip := Vector3(cos(a_tip), 0.0, sin(a_tip))
		var pl := Vector3(cos(a_l) * 0.36, 0.04, sin(a_l) * 0.36)
		var pr := Vector3(cos(a_r) * 0.36, 0.04, sin(a_r) * 0.36)
		st.set_color(Color.WHITE); st.add_vertex(center_top)
		st.set_color(Color.WHITE); st.add_vertex(pl)
		st.set_color(Color.WHITE); st.add_vertex(tip)
		st.set_color(Color.WHITE); st.add_vertex(center_top)
		st.set_color(Color.WHITE); st.add_vertex(tip)
		st.set_color(Color.WHITE); st.add_vertex(pr)
	st.generate_normals()
	return st.commit()

static func _make_swaying_flora_mat(sway_amp: float, sway_spd: float) -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_disabled;
uniform float sway_amp = %.3f;
uniform float sway_spd = %.3f;
varying vec4 vcol;
void vertex() {
	vcol = COLOR;
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float h = clamp(VERTEX.y, 0.0, 1.5);
	VERTEX.x += sin(TIME * sway_spd + wp.x * 0.45 + wp.z * 0.35 + h * 2.2) * sway_amp * h;
	VERTEX.z += cos(TIME * sway_spd * 0.82 + wp.z * 0.42) * sway_amp * 0.72 * h;
}
void fragment() {
	ALBEDO = vcol.rgb;
	ROUGHNESS = 0.84;
	METALLIC = 0.0;
}
""" % [sway_amp, sway_spd]
	var sm := ShaderMaterial.new()
	sm.shader = sh
	return sm

static func _make_surf_foam_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	float pulse = 0.55 + 0.45 * sin(TIME * 2.1 + UV.x * 18.0);
	float lace = 0.5 + 0.5 * sin(UV.x * 36.0 + TIME * 1.4) * cos(UV.y * 12.0 - TIME * 1.8);
	ALBEDO = vec3(0.86, 0.94, 0.96);
	ALPHA = clamp(0.22 + 0.44 * pulse * lace, 0.0, 0.68);
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.render_priority = 1
	return sm

static func _make_current_streak_mat() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never;
void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r_ell = length(vec2(p.x * 1.15, p.y));
	float mask = 1.0 - smoothstep(0.25, 0.95, r_ell);
	float wisp = 0.5 + 0.5 * sin(UV.y * 14.0 + TIME * 3.4 + sin(UV.x * 9.0) * 2.2) * cos(UV.x * 11.0 - TIME * 1.6);
	float lace = smoothstep(0.38, 0.85, wisp);
	ALBEDO = mix(vec3(0.45, 0.78, 0.84), vec3(0.86, 0.94, 0.96), lace);
	ALPHA = mask * lace * 0.28;
}
"""
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sm.render_priority = 2
	return sm
