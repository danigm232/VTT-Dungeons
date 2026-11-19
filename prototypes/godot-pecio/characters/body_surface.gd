extends MeshInstance3D
const Anchors=preload("res://characters/anchors.gd")
const EffectShader=preload("res://characters/body_effects.gdshader")
const Registry=preload("res://characters/registry.gd")
var body: Node3D
var source_sprite: Sprite3D
var effects: Dictionary={}
var intensity:=.85
var reduced:=false
var treatment:=2
var material: ShaderMaterial
var last_texture: Texture2D
var normalized: Dictionary={}
var effect_hash: int=-1
var _billboard_mesh := QuadMesh.new()
func normalize_effects() -> void:
	if effect_hash==effects.hash(): return
	effect_hash=effects.hash(); normalized.clear()
	for id in effects:
		var effect: String=str(Registry.data().overlays.get(id,{}).get("shaderEffect",id))
		normalized[effect]=maxf(float(normalized.get(effect,0)),float(effects[id]))
func _ready() -> void:
	process_priority=50; cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	material=ShaderMaterial.new(); material.shader=EffectShader; material.render_priority=12; material_override=material
	mesh=_billboard_mesh; follow()
func bits() -> int:
	normalize_effects()
	var result:=0
	for pair in [["poisoned",1],["petrified",2],["frosted",4],["burned",8],["cursed",16],["invisible",32],["paralysed",64],["charmed",128],["frightened",256],["blinded",512],["deafened",1024],["stunned",2048],["unconscious",4096],["exhaustion",8192],["incapacitated",16384],["prone",32768],["hidden",65536]]:
		if float(normalized.get(pair[0],0))>0: result|=int(pair[1])
	return result
func weights_a() -> Vector4:
	normalize_effects(); return Vector4(float(normalized.get("poisoned",0)),float(normalized.get("petrified",0)),float(normalized.get("frosted",0)),float(normalized.get("burned",0)))
func weights_b() -> Vector4:
	normalize_effects(); return Vector4(float(normalized.get("cursed",0)),float(normalized.get("invisible",0)),float(normalized.get("paralysed",0)),float(normalized.get("charmed",0)))
func _process(_delta: float) -> void: follow()
func follow() -> void:
	if body==null or not is_instance_valid(body) or not body.is_inside_tree() or body.sprite==null or body.sprite.texture==null: hide(); return
	if not is_visible_in_tree() and not body.is_visible_in_tree(): return
	var flags:=bits()
	if flags==0: hide(); return
	show()
	var sprite: Sprite3D=source_sprite if source_sprite else body.sprite
	if sprite.texture==null: hide(); return
	var texture: Texture2D=sprite.texture
	var attached: MeshInstance3D = body.active_prop_surface() if not source_sprite and body.has_method("active_prop_surface") else null
	var bound_mesh := attached != null
	var pad := Vector2.ZERO
	if bound_mesh:
		mesh = attached.mesh
		global_transform = attached.global_transform
	else:
		pad = Vector2(12.0/maxf(1,texture.get_width()),12.0/maxf(1,texture.get_height()))
		mesh = _billboard_mesh
		_billboard_mesh.size=Vector2(texture.get_width(),texture.get_height())*sprite.pixel_size*(Vector2.ONE+pad*2)
		global_transform=sprite.global_transform
	var offset := Anchors.plane(body).z
	if attached:
		offset = attached.get_meta("overlay_normal", offset)
	global_position += offset * 0.008
	material.set_shader_parameter("bound_mesh",bound_mesh)
	material.set_shader_parameter("padding",pad)
	layers=sprite.layers
	if texture!=last_texture:
		last_texture=texture
		var source_texture: Texture2D=texture
		var region:=Vector4(0,0,1,1)
		if texture is AtlasTexture:
			source_texture=texture.atlas
			region=Vector4(texture.region.position.x/source_texture.get_width(),texture.region.position.y/source_texture.get_height(),texture.region.size.x/source_texture.get_width(),texture.region.size.y/source_texture.get_height())
		material.set_shader_parameter("source_tex",source_texture); material.set_shader_parameter("source_region",region)
		var bounds:=Anchors.frame_bounds(texture)
		material.set_shader_parameter("visible_bounds",Vector4(bounds.position.x,bounds.position.y,bounds.size.x,bounds.size.y))
	material.set_shader_parameter("source_pixels",Vector2(texture.get_width(),texture.get_height()))
	material.set_shader_parameter("flip_h",sprite.flip_h)
	material.set_shader_parameter("effect_bits",flags)
	material.set_shader_parameter("intensity",intensity)
	material.set_shader_parameter("weights_a",weights_a())
	material.set_shader_parameter("weights_b",weights_b())
	material.set_shader_parameter("fear_weight",float(normalized.get("frightened",0)))
	material.set_shader_parameter("weights_c",Vector4(float(normalized.get("blinded",0)),float(normalized.get("deafened",0)),float(normalized.get("stunned",0)),float(normalized.get("unconscious",0))))
	material.set_shader_parameter("weights_d",Vector4(float(normalized.get("exhaustion",0)),float(normalized.get("incapacitated",0)),float(normalized.get("prone",0)),float(normalized.get("hidden",0))))
	if (flags&7680)!=0:
		var head: Array=Anchors.points(body,body.get_node("CharacterVisual").definition,body.get_node("CharacterVisual").corrections).get("head",[.5,.12]) if body.get_node_or_null("CharacterVisual") else [.5,.12]
		material.set_shader_parameter("head_anchor",Vector2(float(head[0]),float(head[1])))
	material.set_shader_parameter("inherited_alpha",sprite.modulate.a)
	material.set_shader_parameter("treatment",treatment)
	material.set_shader_parameter("clock",0.0 if reduced else float(body.get_meta("character_visual_clock",Time.get_ticks_msec()))*.001)
