extends Node3D
const Registry=preload("res://characters/registry.gd")
const Anchors=preload("res://characters/anchors.gd")
const Geometry=preload("res://characters/equipment_geometry.gd")
const Painted=preload("res://characters/equipment_sprites.gd")
var body: Node3D
var definition: Dictionary={}
var equipped: Dictionary={}
var nodes: Dictionary={}
var corrections: Dictionary={}
var effects: Dictionary={}
func set_equipment(slot: String,item_id: String) -> Dictionary:
	if item_id.is_empty():
		equipped.erase(slot)
		if nodes.has(slot): remove_child(nodes[slot]); nodes[slot].queue_free(); nodes.erase(slot)
		return {"ok":true}
	var compatible:=Registry.compatible(str(definition.get("id","")),item_id)
	if not compatible.ok: return compatible
	var item: Dictionary=Registry.data().equipment[item_id]
	if item.slot!=slot: return {"ok":false,"reason":"Ranura incorrecta"}
	if nodes.has(slot): remove_child(nodes[slot]); nodes[slot].queue_free(); nodes.erase(slot)
	var object:=Painted.create(item,body) if item.get("rendering","")=="painted-sprite-layer" else Geometry.create(item)
	add_child(object); nodes[slot]=object; equipped[slot]=item_id
	follow(); return {"ok":true}
func _ready() -> void: process_priority=60
func _process(_delta: float) -> void: follow()
func follow() -> void:
	if equipped.is_empty(): return
	if body==null or not is_instance_valid(body) or body.sprite==null: return
	var points:=Anchors.resolved(body,definition,corrections)
	var basis:=Anchors.plane(body)
	for slot in equipped:
		var item: Dictionary=Registry.data().equipment[equipped[slot]]
		var node: Node3D=nodes.get(slot)
		if node==null: continue
		var anchor: String=str(item.anchor)
		if not points.has(anchor): node.hide(); continue
		node.visible=body.is_visible_in_tree()
		var depth: float=(-.075 if item.drawOrder=="rear" else .07)*body.target_height
		node.position=points[anchor]+body.global_basis.inverse()*basis.z*depth
		var dimensions: Array=item.scaleRelativeToHeight
		node.basis=body.global_basis.inverse()*basis
		node.scale=Vector3(float(dimensions[0]),float(dimensions[1]),float(dimensions[2]))*body.target_height
		if item.get("rendering","")=="painted-sprite-layer": Painted.update(node,body,item)
		if slot=="waist": node.position+=body.global_basis.inverse()*basis.x*body.target_height*.16
		if slot=="head" and item.get("rendering","")!="painted-sprite-layer": node.position+=body.global_basis.inverse()*basis.y*body.target_height*.04
		var fit: Dictionary=definition.get("equipmentFit",{}).get(str(item.id),{})
		var offset: Array=fit.get("offset",[0,0])
		node.position+=body.global_basis.inverse()*(basis.x*float(offset[0])+basis.y*float(offset[1]))*body.target_height
		if item.get("rendering","")=="painted-sprite-layer":
			node.get_node("Artwork").pixel_size*=float(fit.get("scale",1.0))
		var view: String=preload("res://sprites/sprite_facing.gd").view_direction(body,str(body.facing_dir))
		if view in definition.get("occludedEquipmentViews",{}).get(slot,[]): node.hide()
		node.set_meta("visual_anchor",anchor); node.set_meta("frame_key",Anchors.frame_key(body))
