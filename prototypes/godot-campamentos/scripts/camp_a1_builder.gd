class_name CampA1Builder
extends Node3D

## Builds canonical 01 · Habitaciones A1 directly from El Retiro del Dragón's
## sculpted architecture, geography, cave vaults, Astalagan dragon statue,
## artisan furniture, plaza hearth, and coastal backdrop, shifted by -A1_TRANSLATION
## (-Vector3(72.0, 9.0, 72.0)) so A1 in Campamentos is literally the exact same zone.

const Structure = preload("res://scripts/camp_structure.gd")
const RetreatBuilderScript = preload("res://scripts/retreat_layout_builder.gd")
const RetreatStruct = preload("res://scripts/retreat_structure.gd")
const PropFactory = preload("res://scripts/camp_prop_factory.gd")

var cutaway_roofs: Array[Dictionary] = []
var seat_anchors: Dictionary = {}
var beds: Dictionary = {}
var retreat_world: Node3D

func build(scene_def: Dictionary, fx: CampAtmosphereFx) -> Dictionary:
	cutaway_roofs.clear()
	var a1: Dictionary = Structure.get_a1_layout()
	var tile := Structure.TILE_METERS
	var cols := int(scene_def.get("cols", 48))
	var rows := int(scene_def.get("rows", 22))
	var width_m := float(cols) * tile
	var depth_m := float(rows) * tile

	# 1. Mount El Retiro del Dragón's single canonical A1 sector in restricted A1_CAMP load profile
	#    (builds ONLY A1 + immediate visual context + camp-mode-only closures; zero A2-A5/pier/forest nodes)
	retreat_world = RetreatBuilderScript.new()
	retreat_world.name = "RetreatA1World"
	retreat_world.load_profile = 1
	retreat_world.camp_fx = fx
	retreat_world.position = -RetreatStruct.A1_TRANSLATION
	add_child(retreat_world)
	retreat_world.set("_cave_roofs_force_open", true)

	# 2. Tune light range for tactical overview (no inter-map exits are instantiated in A1_CAMP mode)
	_tune_retreat_lights(retreat_world)

	# 3. Map Retiro's sculpted CaveRoof_cell_1..6 vaults to Campamentos cutaways
	for rm in a1.get("rooms", []):
		var rid := int(rm.get("id", 1))
		var rkey := str(rm.get("key", "cell-%d" % rid))
		var cave_node := retreat_world.find_child("CaveRoof_cell_%d" % rid, true, false) as Node3D
		if cave_node:
			cave_node.name = "CutawayRoof_%s" % rkey
			cave_node.visible = true
			var c0 := float(rm["colMin"]) * tile
			var c1 := float(int(rm["colMax"]) + 1) * tile
			var r0 := float(rm["rowMin"]) * tile
			var r1 := float(int(rm["rowMax"]) + 1) * tile
			cutaway_roofs.append({
				"id": rkey,
				"node": cave_node,
				"rect": Rect2(c0, r0, c1 - c0, (r1 - r0) + tile * 0.35),
			})

	# 4. Bind Astalagan statue anchor & animate plaza campfire dynamically via CampAtmosphereFx
	#    (hiding placeholder static flame cones/light on the canonical hearth so there are zero double flames)
	var statue_anchor := retreat_world.find_child("A1_Dragon_Statue", true, false) as Node3D
	if statue_anchor:
		statue_anchor.name = "AstalaganStatue"
	var a1_camp_node := retreat_world.find_child("A1_Campfire", true, false) as Node3D
	if a1_camp_node:
		var static_flame := a1_camp_node.get_node_or_null("CampfireFlame") as Node3D
		if static_flame:
			static_flame.visible = false
		var static_light := a1_camp_node.get_node_or_null("CampfireLight") as OmniLight3D
		if static_light:
			static_light.visible = false
			static_light.light_energy = 0.0
	var hearth_ring := retreat_world.find_child("PlazaHearthRing", true, false) as Node3D
	if hearth_ring:
		for ch in hearth_ring.get_children():
			if ch is Node3D and str(ch.name).begins_with("ClusterFlameCone"):
				ch.remove_from_group("night_flame")
				(ch as Node3D).visible = false
	var fire_pos := RetreatStruct.cell_to_world(72, 62, RetreatStruct.ELEV_A1_PLAZA) - RetreatStruct.A1_TRANSLATION
	fx.build_campfire(self, fire_pos + Vector3(0.0, 0.08, 0.0), false, false)

	# 5. Walkable ground continuity & doorway edge colliders
	var floor_body := StaticBody3D.new()
	floor_body.name = "A1WalkableFloor"
	add_child(floor_body)
	var floor_col := CollisionShape3D.new()
	var fbox := BoxShape3D.new()
	fbox.size = Vector3(width_m + 6.0, 1.0, depth_m + 6.0)
	floor_col.shape = fbox
	floor_col.position = Vector3(width_m * 0.5, -0.5, depth_m * 0.5)
	floor_body.add_child(floor_col)
	_build_blocked_edge_colliders(scene_def.get("blockedEdges", []), tile)
	_register_plaza_benches(scene_def.get("interactionPoints", []))
	_register_beds(scene_def.get("interactionPoints", []))

	return {"cutaways": cutaway_roofs}

func get_a1_manifest() -> Dictionary:
	if retreat_world == null:
		return {}
	return RetreatBuilderScript._a1_canon().collect_a1_manifest(retreat_world, Vector3.ZERO)

func _find_by_canonical_id(root_node: Node, cid: String) -> Node3D:
	if root_node is Node3D and str(root_node.get_meta("canonical_id", "")) == cid:
		return root_node as Node3D
	for ch in root_node.get_children():
		var hit := _find_by_canonical_id(ch, cid)
		if hit != null:
			return hit
	return null

func _register_beds(points: Array) -> void:
	beds.clear()
	for point: Dictionary in points:
		if point.get("kind") != "bed":
			continue
		var id := str(point.id)
		var model := _find_by_canonical_id(retreat_world, id)
		if model == null:
			model = retreat_world.find_child(id, true, false) as Node3D
		if not model or not model.has_meta("rest_head"):
			continue
		beds[id] = {"rest": PropFactory.rest_anchor(model, model.get_meta("rest_head"),
			model.get_meta("rest_bedding"), model.get_meta("rest_foot"), model.get_meta("rest_width"))}

func _register_plaza_benches(points: Array) -> void:
	seat_anchors.clear()
	var models := {"a1-seat-west-point": "PlazaBenchWest", "a1-seat-east-point": "PlazaBenchEast"}
	for point: Dictionary in points:
		var id := str(point.get("id", ""))
		if not models.has(id):
			continue
		var bench := retreat_world.find_child(models[id], true, false) as Node3D
		if not bench:
			continue
		var stand := Structure.tile_to_world(int(point.col), int(point.row), 0.05)
		var positions: Array[Vector3] = []
		var cushions: Array[MeshInstance3D] = []
		if bench.has_meta("seat_slots"):
			for sp in bench.get_meta("seat_slots"):
				if sp is Vector3:
					positions.append(sp as Vector3)
		else:
			for cushion_name in ["LeftCushion", "RightCushion"]:
				var cushion := bench.get_node_or_null(cushion_name) as MeshInstance3D
				if cushion:
					cushions.append(cushion)
					positions.append(cushion.position)
		if positions.is_empty():
			positions = [Vector3(-0.44, 0.515, 0.03), Vector3(0.44, 0.515, 0.03)]
		seat_anchors[id] = PropFactory.seat_anchor(bench, positions, 0.28, stand, false, Vector3.ZERO, cushions)
		seat_anchors[id]["type"] = "plaza-bench"

func _tune_retreat_lights(node: Node) -> void:
	if node is OmniLight3D or node is SpotLight3D:
		var l3 := node as Light3D
		l3.distance_fade_enabled = false
	for ch in node.get_children():
		_tune_retreat_lights(ch)

func _build_blocked_edge_colliders(edges: Array, tile: float) -> void:
	if edges.is_empty():
		return
	var body := StaticBody3D.new()
	body.name = "A1BlockedEdges"
	add_child(body)
	for e in edges:
		var fc := int(e.get("fromCol", e["from"]["col"] if e.has("from") else 0))
		var fr := int(e.get("fromRow", e["from"]["row"] if e.has("from") else 0))
		var tc := int(e.get("toCol", e["to"]["col"] if e.has("to") else 0))
		var tr := int(e.get("toRow", e["to"]["row"] if e.has("to") else 0))
		var mid_x := ((float(fc) + float(tc)) * 0.5 + 0.5) * tile
		var mid_z := ((float(fr) + float(tr)) * 0.5 + 0.5) * tile
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		if fc == tc:
			bs.size = Vector3(tile * 0.98, 2.2, 0.16)
		else:
			bs.size = Vector3(0.16, 2.2, tile * 0.98)
		cs.shape = bs
		cs.position = Vector3(mid_x, 1.1, mid_z)
		body.add_child(cs)
