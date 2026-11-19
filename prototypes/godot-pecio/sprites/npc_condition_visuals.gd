extends RefCounted
## Retargeted condition art for players, NPCs and monsters; Rules own state/time.
const Sprites = preload("res://sprites/npc_sprite_library.gd")
const Art = preload("res://sprites/condition_overlay_library.gd")

static func sync(body: Node3D, actor: Dictionary, options: Dictionary={}) -> void:
	if body==null or body.get("sprite")==null: return
	# An unrevealed optional miniature must not become an invisible obstacle.
	if body.has_meta("npc_reinforcement_visible"):
		var shown: bool=body.is_visible_in_tree()
		if shown!=bool(body.get_meta("npc_reinforcement_visible")):
			body.set_meta("npc_reinforcement_visible",shown)
			body.set_physics_process(shown and not actor.get("defeated",false))
			if body.get("collision"): body.collision.set_deferred("disabled",not shown or actor.get("defeated",false))
	var keys: Array=Art.active(actor)
	var pose: String="" if actor.get("defeated",false) else Sprites.condition_pose(keys)
	# Retain existing authored poses; these overlays do not grant states.
	if body.char_profile.has("npc_species") or body.char_key in ["silverfarben","rogue"]:
		body.set_meta("npc_condition_pose",pose)
	var modular=body.get_node_or_null("CharacterVisual")
	if modular==null: modular=preload("res://characters/visual_runtime.gd").attach(body,str(actor.get("id","")))
	if modular: modular.from_rules(actor,options)
	var modular_conditions: Array=["envenenada","petrificada","invisible","paralizada","hechizada","asustada","restringida","apresada","agarrada","cegada","ensordecida","aturdida","inconsciente","agotamiento","incapacitada","derribada","oculta"]
	if modular: keys=keys.filter(func(key): return key not in modular_conditions)
	var nodes: Dictionary=body.get_meta("condition_layers",{})
	for node in nodes.values():
		if is_instance_valid(node): node.hide()
	var legacy:=body.get_node_or_null("NpcConditionAccent") as Sprite3D
	if legacy: legacy.hide()
	if body.has_meta("npc_condition_tint"):
		body.sprite.modulate=Color.WHITE; body.remove_meta("npc_condition_tint")
	body.remove_meta("npc_condition_color")
	if keys.is_empty(): return
	var tint:=Color.WHITE
	if "petrificada" in keys: tint=Color(.63,.69,.69)
	if "invisible" in keys: tint.a=.24
	elif "oculta" in keys: tint.a=.62
	if tint!=Color.WHITE:
		body.sprite.modulate=tint; body.set_meta("npc_condition_color",tint); body.set_meta("npc_condition_tint",true)
	var reduced: bool=bool(options.get("reduced_motion",false))
	var phase: int=Art.frame(body,reduced)
	var visible_keys: Array=keys.filter(func(key): return Art.data().art[key].anchor!="none")
	var budget:=1.0/sqrt(maxi(1,visible_keys.size()))
	for index in range(visible_keys.size()):
		var key: String=visible_keys[index]
		var overlay: Sprite3D=nodes.get(index)
		if overlay==null:
			overlay=Sprite3D.new()
			# Preserve the primary node name used by existing scene observers.
			overlay.name="NpcConditionAccent" if legacy==null else "ConditionAccent_"+str(index)
			overlay.billboard=BaseMaterial3D.BILLBOARD_FIXED_Y
			overlay.no_depth_test=false; overlay.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			overlay.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
			overlay.render_priority=11; body.add_child(overlay)
			if legacy==null: legacy=overlay
			nodes[index]=overlay
		var placement: Dictionary=Art.placement(body,key)
		var style: String=Art.style_for(body,key)
		overlay.texture=Art.texture(key,phase,style); overlay.pixel_size=body.target_height/256.0
		overlay.position=placement.position; overlay.position.z+=index*.001
		overlay.scale=placement.scale
		overlay.modulate=Color(1,1,1,.74*budget*tint.a)
		overlay.set_meta("condition_key",key); overlay.set_meta("condition_anchor",placement.anchor)
		overlay.set_meta("condition_phase",phase); overlay.show()
		overlay.set_meta("condition_style",style)
	body.set_meta("condition_layers",nodes)
