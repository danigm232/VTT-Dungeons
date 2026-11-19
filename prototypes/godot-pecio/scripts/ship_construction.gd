class_name ShipConstruction
extends Node3D

const Structure = preload("res://scripts/wreck_structure.gd")
const Geometry = preload("res://scripts/ship_geometry.gd")
const Materials = preload("res://scripts/pbr_material_kit.gd")

var timber: Material
var endgrain: Material
var iron: Material
var rope: Material

func _ready() -> void:
	build.call_deferred()

func owner_node(id: String) -> Node3D:
	return get_parent().find_child(id, true, false) as Node3D

func point(x: float, y: float, z: float) -> Vector3:
	return Structure.get_world_pos(x, y, z)

func build() -> void:
	timber = Materials.create_oak_furniture_pbr("#665b48", 0.28)
	endgrain = Materials.create_oak_furniture_pbr("#968773", 0.28)
	iron = Materials.create_iron_pbr("#343b39", 0.40, 0.82)
	rope = Materials.create_rope_cable_pbr("#968b6b")
	_build_keel()
	_build_wales_and_breach()
	_build_waterways()
	_build_chainplates()
	_build_mast_joinery()
	_build_prop_joinery()
	set_meta("construction_revision", "2026-11-14-layers-1-3")

func _build_keel() -> void:
	var st := Geometry.begin(timber)
	var x := Structure.STERN_X
	while x < Structure.BOW_X - 0.001:
		var nx := minf(x + 1.5, Structure.BOW_X)
		var a := Structure.get_beam_at(x) * 0.18
		var b := Structure.get_beam_at(nx) * 0.18
		Geometry.quad(st, point(x, -7.10, -a), point(nx, -7.10, -b), point(nx, -7.10, b), point(x, -7.10, a))
		Geometry.beam(st, point(x, -7.19, 0), point(nx, -7.19, 0), 0.36, 0.26)
		x = nx
	Geometry.commit(owner_node("HullStrakes"), "KeelGarboard", st)

func _build_wales_and_breach() -> void:
	for side in [-1.0, 1.0]:
		var owner_id := "HullStrakes" if side < 0.0 else "HullStrakes_Front"
		var st := Geometry.begin(timber)
		for band in [[0.34, 1.0], [-1.15, 0.9863], [-4.8, 0.6307]]:
			var x := Structure.STERN_X
			while x < Structure.BOW_X - 0.01:
				var nx := minf(x + 1.5, Structure.BOW_X)
				if x < Structure.STERN_BREACH_END and nx > Structure.STERN_BREACH_END:
					nx = Structure.STERN_BREACH_END
				if not (side > 0 and band[0] < 0 and band[0] > -4 and x < Structure.STERN_BREACH_END):
					var a := point(x, band[0], side * (Structure.get_beam_at(x) * band[1] + 0.045))
					var b := point(nx, band[0], side * (Structure.get_beam_at(nx) * band[1] + 0.045))
					Geometry.beam(st, a, b, 0.13, 0.18)
				x = nx
		Geometry.commit(owner_node(owner_id), "HullWales", st)

	# Splintered strake ends at the existing breach: short tips only, no repair
	# beam across either the underwater P16 passage or the side opening.
	var fracture := Geometry.begin(endgrain)
	for i in range(7):
		var x := lerpf(-30.55, -24.25, float(i) / 6.0)
		var z := Structure.get_beam_at(x)
		Geometry.beam(fracture, point(x, 0.04, z), point(x + 0.12, -0.35 - float(i % 3) * 0.13, z * 0.985), 0.20, 0.15, 0.14)
		Geometry.beam(fracture, point(x, -4.03, z * 0.78), point(x - 0.10, -3.58 + float(i % 2) * 0.15, z * 0.81), 0.18, 0.14, 0.12)
	for i in range(5):
		var y := -3.7 + i * 0.72
		var fraction := lerpf(0.78, 1.0, (y + 4.0) / 4.0)
		var z := Structure.get_beam_at(-24.0) * fraction
		Geometry.beam(fracture, point(-23.98, y, z), point(-24.4 - float(i % 2) * 0.2, y + 0.10, z), 0.17, 0.13, 0.12)
	Geometry.commit(owner_node("HullStrakes_Front"), "BreachStrakeEndgrain", fracture)

func _build_waterways() -> void:
	for config in [["Deck_C1", -13.5, 13.5, 0.0], ["Deck_C2", 13.5, 30.75, 3.0], ["Deck_C3", -30.75, -13.5, 3.0]]:
		var st := Geometry.begin(timber)
		for side in [-1.0, 1.0]:
			var x: float = config[1]
			while x < config[2] - 0.01:
				var nx := minf(x + 1.5, config[2])
				# Stop before narrowing bow would cross the centreline.
				if Structure.get_beam_at(nx) > 0.50:
					var a := point(x, config[3] + 0.025, side * (Structure.get_beam_at(x) - 0.34))
					var b := point(nx, config[3] + 0.025, side * (Structure.get_beam_at(nx) - 0.34))
					Geometry.beam(st, a, b, 0.25, 0.08)
				x = nx
		Geometry.commit(owner_node(config[0]), "DeckWaterways", st)

func _build_chainplates() -> void:
	for side in [-1.0, 1.0]:
		var owner_id := "Chainwales_Port" if side < 0 else "Chainwales_Front"
		var straps := Geometry.begin(iron)
		var lanyards := Geometry.begin(rope)
		for i in range(4):
			var x: float = -2.0 + i
			var z: float = side * (Structure.get_beam_at(-0.5) + 0.36)
			Geometry.beam(straps, point(x, -1.0, z - side * 0.25), point(x, 0.65, z), 0.07, 0.06)
			for dz in [-0.07, 0.0, 0.07]:
				Geometry.beam(lanyards, point(x + dz, 0.57, z), point(x + dz, 0.84, z), 0.025)
			for y in [0.52, 0.85]:
				var deadeye := MeshInstance3D.new()
				deadeye.name = "Deadeye_%d_%d" % [i, int(y * 100)]
				var disc := CylinderMesh.new()
				disc.top_radius = 0.12
				disc.bottom_radius = 0.12
				disc.height = 0.08
				disc.radial_segments = 10
				deadeye.mesh = disc
				deadeye.material_override = timber
				deadeye.position = point(x, y, z)
				deadeye.rotation.x = PI / 2
				owner_node(owner_id).add_child(deadeye)
		Geometry.commit(owner_node(owner_id), "ChainplateStraps", straps)
		Geometry.commit(owner_node(owner_id), "DeadeyeLanyards", lanyards)

func _build_mast_joinery() -> void:
	var crow := owner_node("CrowsNest_P10")
	var st := Geometry.begin(timber)
	for i in range(16):
		var a := TAU * float(i) / 16.0
		var b := TAU * float(i + 1) / 16.0
		if i != 2 and i != 3:
			Geometry.beam(st, Vector3(cos(a) * 2.86, 0.96, sin(a) * 2.86), Vector3(cos(b) * 2.86, 0.96, sin(b) * 2.86), 0.13)
		if i % 2 == 0:
			Geometry.beam(st, Vector3(cos(a) * 0.50, -0.75, sin(a) * 0.50), Vector3(cos(a) * 2.5, -0.12, sin(a) * 2.5), 0.13)
	Geometry.commit(crow, "CrowRimAndKnees", st)
	var mast := owner_node("MainMastSpar")
	for y in [-8.0, -4.5, -1.0, 2.5, 6.0, 9.0]:
		var band := MeshInstance3D.new()
		var torus := TorusMesh.new()
		var radius := lerpf(0.62, 0.36, (y + 11.5) / 23.0)
		torus.inner_radius = radius - 0.015
		torus.outer_radius = radius + 0.035
		torus.rings = 12
		torus.ring_segments = 6
		band.mesh = torus
		band.material_override = iron
		band.position.y = y
		mast.add_child(band)
	# Upper edge lashings run along the same transverse axis as the yards.
	var ties := Geometry.begin(rope)
	for config in [[-4.5, 4.5, 11.40], [3.8, 4.8, 11.30], [-2.0, 3.2, 14.0]]:
		var z: float = config[0]
		var half: float = config[1] * 0.5
		Geometry.beam(ties, Vector3(0.36, config[2], z - half), Vector3(0.36, config[2], z + half), 0.035)
		for k in range(4):
			var knot_z := lerpf(z - half, z + half, float(k) / 3.0)
			Geometry.beam(ties, Vector3(0.35, config[2], knot_z), Vector3(0.35, config[2] + 0.20, knot_z), 0.025)
	Geometry.commit(owner_node("MainMastRigging"), "SailHeadLashings", ties)

func _build_prop_joinery() -> void:
	var ballista := owner_node("NavalBallista_C2")
	var wood := Geometry.begin(timber)
	var metal := Geometry.begin(iron)
	for z in [-0.27, 0.27]:
		Geometry.beam(wood, Vector3(-0.8, 0.14, z), Vector3(0.75, 0.14, z), 0.17)
		Geometry.beam(wood, Vector3(-0.65, 0.16, z), Vector3(0.15, 0.65, z), 0.12)
		Geometry.beam(metal, Vector3(-0.72, 0.54, z), Vector3(0.8, 0.54, z), 0.045)
	var bowstring := Geometry.begin(rope)
	Geometry.beam(bowstring, Vector3(0.7, 0.85, -1.12), Vector3(-0.40, 0.88, 0), 0.028)
	Geometry.beam(bowstring, Vector3(-0.40, 0.88, 0), Vector3(-0.15, 0.35, 0.48), 0.028)
	Geometry.commit(ballista, "BallistaCarriageJoinery", wood)
	Geometry.commit(ballista, "BallistaIronStraps", metal)
	Geometry.commit(ballista, "BallistaBowstring", bowstring)
	for spar_config in [["ForemastStump_C2", 1.1, 0.26], ["FallenForemast_C2", -5.75, 0.18]]:
		var fracture := Geometry.begin(endgrain)
		var direction := 1.0 if spar_config[1] > 0 else -1.0
		for k in range(8):
			var angle := TAU * float(k) / 8.0
			var base := Vector3(cos(angle) * spar_config[2], spar_config[1], sin(angle) * spar_config[2])
			Geometry.beam(fracture, base, base + Vector3(0, direction * (0.12 + (k % 3) * 0.07), 0), 0.12, 0.10, 0.10)
		Geometry.commit(owner_node(spar_config[0]), "SparFracture", fracture)
