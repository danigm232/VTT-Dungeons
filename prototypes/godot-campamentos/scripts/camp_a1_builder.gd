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

	# 1. Mount El Retiro del Dragón's canonical sculpted A1 world aligned 1:1 to y=0, x=0..72, z=0..33
	retreat_world = RetreatBuilderScript.new()
	retreat_world.name = "RetreatA1World"
	retreat_world.position = -RetreatStruct.A1_TRANSLATION
	add_child(retreat_world)
	retreat_world.set("_cave_roofs_force_open", true)

	# 2. Disable inter-map exit portals in camp mode and preserve light range for tactical overview
	var paths_node := retreat_world.get_node_or_null("MapTransitionPaths")
	if paths_node:
		for ch in paths_node.get_children():
			if ch is Area3D or ch.name.begins_with("Exit_"):
				ch.queue_free()
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

	# 4. Bind Astalagan statue anchor & animate plaza campfire fuel dynamically via CampAtmosphereFx
	var statue_anchor := retreat_world.find_child("A1_Dragon_Statue", true, false) as Node3D
	if statue_anchor:
		statue_anchor.name = "AstalaganStatue"
	var static_flame := retreat_world.find_child("CampfireFlame", true, false) as Node3D
	if static_flame:
		static_flame.visible = false
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

func _register_beds(points: Array) -> void:
	beds.clear()
	for point: Dictionary in points:
		if point.get("kind") != "bed":
			continue
		var id := str(point.id)
		var model := retreat_world.find_child(id, true, false) as Node3D
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
		for cushion_name in ["LeftCushion", "RightCushion"]:
			var cushion := bench.get_node(cushion_name) as MeshInstance3D
			cushions.append(cushion)
			positions.append(cushion.position)
		seat_anchors[id] = PropFactory.seat_anchor(bench, positions, 0.28, stand, false, Vector3.ZERO, cushions)
		seat_anchors[id]["type"] = "plaza-bench"

func _tune_retreat_lights(node: Node) -> void:
	if node is OmniLight3D:
		var ol := node as OmniLight3D
		ol.distance_fade_begin = 72.0
		ol.distance_fade_length = 24.0
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
