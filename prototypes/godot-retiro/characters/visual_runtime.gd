extends Node3D
signal visual_changed(state: Dictionary)
const Registry=preload("res://characters/registry.gd")
const Anchors=preload("res://characters/anchors.gd")
const Surface=preload("res://characters/body_surface.gd")
const Equipment=preload("res://characters/equipment_layer.gd")
const Binding=preload("res://characters/binding_layer.gd")
const GearShader=preload("res://characters/gear_effects.gdshader")
const CONDITION_EFFECTS={"envenenada":"poisoned","petrificada":"petrified","invisible":"invisible","paralizada":"paralysed","hechizada":"charmed","asustada":"frightened","cegada":"blinded","ensordecida":"deafened","aturdida":"stunned","inconsciente":"unconscious","agotamiento":"exhaustion","incapacitada":"incapacitated","derribada":"prone","oculta":"hidden"}
var body: Node3D
var definition: Dictionary={}
var surface
var equipment
var binding
var extra_effects: Dictionary={}
var rule_effects: Dictionary={}
var restriction:=""
var coverage:=.7
var corrections: Dictionary={}
var intensity:=.85
var treatment:=2
var reduced:=false
var inspection:=false
var actor_id:=""
var variant_id:=""
var binding_preference:="arcane-bindings"
var _old_alpha:=1.0
var _was_invisible:=false
var _was_hidden:=false
static func attach(token: Node3D,id: String="",review: bool=false) -> Node3D:
	var previous:=token.get_node_or_null("CharacterVisual")
	if previous: return previous
	var node=load("res://characters/visual_runtime.gd").new(); node.name="CharacterVisual"; node.body=token; node.inspection=review
	node.definition=Registry.character(id if not id.is_empty() else str(token.token_name))
	if node.definition.is_empty(): node.definition=Registry.character(str(token.token_name))
	if node.definition.is_empty():
		var anatomy: String="winged" if token.char_key=="harpy" else "humanoid-small" if token.char_key=="rogue" else "humanoid-dwarf" if token.char_key in ["cleric","silverfarben"] else "humanoid-tall"
		node.definition={"id":token.char_key,"anatomy":anatomy,"equipmentSlots":[],"embeddedSlots":[],"frameOverrides":{},"legacy":true}
	token.add_child(node); return node
func _ready() -> void:
	process_priority=45
	surface=Surface.new(); surface.name="BodyStateSurface"; surface.body=body; add_child(surface)
	equipment=Equipment.new(); equipment.name="ModularEquipment"; equipment.body=body; equipment.definition=definition; add_child(equipment)
	binding=Binding.new(); binding.name="PhysicalStateBinding"; binding.body=body; binding.definition=definition; add_child(binding)
	# The runtime advances layers once, after the character animator. Avoid three
	# independent copies of anchor resolution/material work in the same frame.
	surface.set_process(false); equipment.set_process(false); binding.set_process(false)
	actor_id=str(body.get_meta("combat_id",body.token_name))
func _process(_delta: float) -> void: sync_render()
func set_effect(id: String,value: float) -> bool:
	if not is_finite(value): return false
	if not Registry.data().get("overlays",{}).has(id): return false
	if value<=0: extra_effects.erase(id)
	else: extra_effects[id]=clampf(value,0,1)
	sync_render(); visual_changed.emit(state()); return true
func set_binding(id: String) -> bool:
	if not binding.set_kind(id): return false
	restriction=id; visual_changed.emit(state()); return true
func equip(slot: String,id: String) -> Dictionary:
	if not inspection and not id.is_empty() and not Registry.data().equipment.get(id,{}).get("productionEnabled",false): return {"ok":false,"reason":"Vestimenta aplazada; recurso de inspección"}
	var result: Dictionary=equipment.set_equipment(slot,id)
	if result.ok: visual_changed.emit(state())
	return result
func from_rules(actor: Dictionary,options: Dictionary={}) -> void:
	rule_effects.clear()
	var condition_keys: Array=preload("res://sprites/condition_overlay_library.gd").active(actor)
	for key in condition_keys:
		if CONDITION_EFFECTS.has(key): rule_effects[CONDITION_EFFECTS[key]]=1.0
	reduced=bool(options.get("reduced_motion",false))
	var restrained: bool=condition_keys.any(func(key): return key in ["restringida","apresada","agarrada"])
	if restriction.is_empty():
		var cause: String=str(actor.get("visual_binding",binding_preference))
		binding.set_kind(cause if restrained and Registry.data().bindings.has(cause) else "")
	sync_render()
func sync_render() -> void:
	if surface==null or not is_instance_valid(body): return
	var effects: Dictionary=extra_effects.duplicate()
	for key in rule_effects: effects[key]=rule_effects[key]
	surface.effects=effects; surface.intensity=intensity; surface.reduced=reduced; surface.treatment=treatment
	surface.normalize_effects()
	var invisible: bool=surface.normalized.has("invisible"); var hidden: bool=surface.normalized.has("hidden")
	if invisible or hidden:
		if not (_was_invisible or _was_hidden) or body.sprite.modulate.a>.8: _old_alpha=body.sprite.modulate.a
		body.sprite.modulate.a=lerpf(_old_alpha,.12 if invisible else .62,float(surface.normalized.get("invisible",surface.normalized.get("hidden",0))))
	elif _was_invisible or _was_hidden: body.sprite.modulate.a=_old_alpha
	_was_invisible=invisible; _was_hidden=hidden
	if body.has_method("active_prop_surface"):
		var attached: MeshInstance3D = body.active_prop_surface()
		if attached:
			attached.sync_color(body.sprite.modulate)
	surface.follow()
	equipment.effects=effects; equipment.corrections=corrections; equipment.follow()
	binding.corrections=corrections; binding.coverage=coverage; binding.follow()
	if not equipment.equipped.is_empty(): _apply_gear_effects(equipment)
func _apply_gear_effects(node: Node) -> void:
	for child in node.get_children():
		if child.get_script()==Surface:
			child.effects=surface.effects; child.intensity=intensity; child.reduced=reduced; child.treatment=treatment; child.follow()
			continue
		if child is MeshInstance3D:
			if not child.has_meta("visual_base_material"): child.set_meta("visual_base_material",child.material_override)
			var base=child.get_meta("visual_base_material")
			if surface.bits()==0: child.material_override=base
			else:
				var mat: ShaderMaterial=child.get_meta("visual_effect_material") if child.has_meta("visual_effect_material") else null
				if mat==null: mat=ShaderMaterial.new(); mat.shader=GearShader; child.set_meta("visual_effect_material",mat)
				mat.set_shader_parameter("base_color",base.albedo_color if base is StandardMaterial3D else Color.WHITE)
				mat.set_shader_parameter("effect_bits",surface.bits()); mat.set_shader_parameter("body_alpha",body.sprite.modulate.a); mat.set_shader_parameter("amount",intensity)
				mat.set_shader_parameter("weights_a",surface.weights_a()); mat.set_shader_parameter("weights_b",surface.weights_b())
				child.material_override=mat
		_apply_gear_effects(child)
func animation_for(state_name: String) -> String:
	if equipment and equipment.equipped.has("main_hand"):
		var alternate: String=str(definition.get("equipmentPoseOverrides",{}).get(state_name,state_name))
		if body.char_profile.get("clips",{}).has(alternate) or body.char_profile.get("dir_states",{}).has(alternate): return alternate
	return state_name
func apply_variant(id: String) -> bool:
	var variant: Dictionary=Registry.data().get("variants",{}).get(id,{})
	if variant.is_empty() or variant.base!=definition.id: return false
	var value:=state(); value.variant=id; value.equipment=variant.get("equipment",{}).duplicate()
	value.effects=variant.get("effects",{}).duplicate()
	return apply_state(value)
func state() -> Dictionary:
	return {"version":1,"actor":actor_id,"character":definition.get("id",""),"variant":variant_id,"equipment":equipment.equipped.duplicate(),"effects":extra_effects.duplicate(),"binding":restriction,"bindingPreference":binding_preference,"intensity":intensity,"treatment":treatment,"coverage":coverage,"corrections":corrections.duplicate(true)}
func apply_state(value: Dictionary) -> bool:
	if int(value.get("version",0))!=1 or value.get("character","")!=definition.get("id",""): return false
	if not value.get("equipment",{}) is Dictionary or not value.get("effects",{}) is Dictionary: return false
	if value.get("equipment",{}).size()>16 or value.get("effects",{}).size()>16 or JSON.stringify(value).length()>1000000: return false
	for key in ["intensity","coverage"]:
		var number=value.get(key,.85)
		if (not number is float and not number is int) or not is_finite(float(number)) or number<0 or number>1: return false
	var variant: String=str(value.get("variant",""))
	if not variant.is_empty() and Registry.data().get("variants",{}).get(variant,{}).get("base","")!=definition.id: return false
	var preference: String=str(value.get("bindingPreference","arcane-bindings"))
	if not Registry.data().bindings.has(preference): return false
	if not value.get("treatment",2) is int and not value.get("treatment",2) is float: return false
	if float(value.get("treatment",2)) not in [0.0,1.0,2.0]: return false
	for slot in value.get("equipment",{}):
		if not Registry.compatible(str(definition.id),str(value.equipment[slot])).ok: return false
		if not inspection and not Registry.data().equipment[value.equipment[slot]].get("productionEnabled",false): return false
		if Registry.data().equipment[value.equipment[slot]].slot!=slot: return false
	for key in value.get("effects",{}):
		if not Registry.data().overlays.has(key) or not value.effects[key] is float and not value.effects[key] is int: return false
		if not is_finite(float(value.effects[key])) or value.effects[key]<0 or value.effects[key]>1: return false
	if not str(value.get("binding","")).is_empty() and not Registry.data().bindings.has(value.binding): return false
	var anatomy: Dictionary=Registry.data().anatomies[definition.anatomy]
	if not value.get("corrections",{}) is Dictionary: return false
	for key in value.get("corrections",{}):
		if not value.corrections[key] is Dictionary: return false
		for anchor in value.corrections[key]:
			var point=value.corrections[key][anchor]
			if not anatomy.anchors.has(anchor) or not point is Array or point.size()!=2: return false
			for coordinate in point:
				if (not coordinate is float and not coordinate is int) or not is_finite(float(coordinate)) or coordinate<-.25 or coordinate>1.25: return false
	for slot in equipment.equipped.keys(): equipment.set_equipment(slot,"")
	for slot in value.get("equipment",{}): equipment.set_equipment(slot,str(value.equipment[slot]))
	extra_effects=value.get("effects",{}).duplicate(); intensity=clampf(float(value.get("intensity",.85)),0,1)
	coverage=clampf(float(value.get("coverage",.7)),0,1)
	variant_id=str(value.get("variant","")); corrections=value.get("corrections",{}).duplicate(true)
	binding_preference=preference
	treatment=int(value.get("treatment",2))
	set_binding(str(value.get("binding",""))); sync_render(); return true
