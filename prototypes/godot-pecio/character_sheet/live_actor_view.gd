extends SubViewportContainer
## Read-only mirror of the live token's rendering, not another actor/animation player.
## Textures, materials, transforms and state overlays come from the original each frame.
var token: Node3D
var viewport: SubViewport
var stage: Node3D
var camera: Camera3D
var mirrors: Dictionary={}
var scan_time: float=0
var fitted_height: float=0
var fit_aspect: float=0
var bounds_cache: Dictionary={}
func _ready() -> void:
	stretch=true; mouse_filter=Control.MOUSE_FILTER_IGNORE; texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
	viewport=SubViewport.new(); viewport.name="LiveAppearanceRender"; viewport.transparent_bg=true; viewport.own_world_3d=true; viewport.size=Vector2i(360,520); viewport.render_target_update_mode=SubViewport.UPDATE_WHEN_VISIBLE; add_child(viewport)
	# Map-level FSR settings can discard the transparent render's alpha channel.
	# Keep this tiny preview at native resolution without changing world rendering.
	viewport.scaling_3d_mode=Viewport.SCALING_3D_MODE_BILINEAR; viewport.scaling_3d_scale=1.0
	stage=Node3D.new(); viewport.add_child(stage)
	camera=Camera3D.new(); camera.projection=Camera3D.PROJECTION_ORTHOGONAL; camera.size=2.35; camera.position=Vector3(0,.98,5); camera.current=true; viewport.add_child(camera)
	var light=DirectionalLight3D.new(); light.rotation_degrees=Vector3(-30,-25,0); light.light_energy=.74; viewport.add_child(light)
	for side in [-1,1]:
		var warm=OmniLight3D.new(); warm.position=Vector3(side*1.1,1.3,1); warm.light_color=Color("#ffcf9a"); warm.light_energy=.28 if side<0 else .16; warm.omni_range=4; viewport.add_child(warm)
	var env=WorldEnvironment.new(); var settings=Environment.new(); settings.background_mode=Environment.BG_CLEAR_COLOR; settings.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; settings.ambient_light_color=Color("#fff8e9"); settings.ambient_light_energy=.63; env.environment=settings; viewport.add_child(env)
func bind(body: Node3D) -> void:
	if body==token: return
	token=body
	for copy in mirrors.values(): copy.queue_free()
	mirrors.clear(); scan_time=0; fitted_height=0; fit_aspect=0; bounds_cache.clear()
func _process(delta: float) -> void:
	if not is_visible_in_tree() or not is_instance_valid(token) or not stage: return
	scan_time-=delta
	if scan_time<=0:
		scan_time=.4; _scan(token)
	var inverse=token.global_transform.affine_inverse()
	_fit_body(inverse)
	for source in mirrors.keys():
		var copy=mirrors[source]
		if not is_instance_valid(source): copy.queue_free(); mirrors.erase(source); continue
		copy.visible=source.is_visible_in_tree(); copy.transform=inverse*source.global_transform
		if source is Sprite3D:
			copy.texture=source.texture; copy.pixel_size=source.pixel_size; copy.flip_h=source.flip_h; copy.flip_v=source.flip_v; copy.modulate=source.modulate; copy.offset=source.offset; copy.axis=source.axis; copy.billboard=source.billboard; copy.shaded=source.shaded; copy.no_depth_test=source.no_depth_test; copy.render_priority=source.render_priority; copy.material_override=source.material_override
		elif source is MeshInstance3D:
			copy.mesh=source.mesh; copy.material_override=source.material_override
			for surface in range(source.get_surface_override_material_count()): copy.set_surface_override_material(surface,source.get_surface_override_material(surface))
		elif source is OmniLight3D:
			copy.light_color=source.light_color; copy.light_energy=source.light_energy; copy.omni_range=source.omni_range
		elif source is GPUParticles3D or source is CPUParticles3D:
			copy.emitting=source.emitting
func _fit_body(inverse: Transform3D) -> void:
	var sprite=token.get("sprite") as Sprite3D
	if not sprite or not sprite.texture or size.y<1: return
	var tex=sprite.texture; var key=tex.get_instance_id()
	if not bounds_cache.has(key):
		var image=tex.get_image(); bounds_cache[key]=image.get_used_rect() if image else Rect2i(Vector2i.ZERO,tex.get_size())
	var used: Rect2i=bounds_cache[key]; var relative=inverse*sprite.global_transform
	var sy=relative.basis.y.length()*sprite.pixel_size; var sx=relative.basis.x.length()*sprite.pixel_size
	var height=maxf(.1,used.size.y*sy); var width=used.size.x*sx; var aspect=size.x/size.y
	# Keep breathing and idle motion; refit only for a real silhouette/viewport change.
	if fitted_height>0 and absf(height-fitted_height)<fitted_height*.16 and is_equal_approx(aspect,fit_aspect): return
	fitted_height=height; fit_aspect=aspect
	var view_height=maxf(height/.68,width/maxf(.1,aspect*.82))
	var bottom=relative.origin.y+(tex.get_height()*.5-used.end.y+sprite.offset.y)*sy
	var center_x=relative.origin.x+(used.get_center().x-tex.get_width()*.5+sprite.offset.x)*sx
	camera.size=view_height; camera.position=Vector3(center_x,bottom+(.865-.5)*view_height,5)
	set_meta("fitted_visible_height",height); set_meta("feet_anchor",.865)
func _scan(node: Node) -> void:
	for child in node.get_children():
		var key=str(child.name).to_lower()
		if key.contains("selection") or key.contains("tactical") or key.contains("collision"): continue
		if child is Sprite3D or child is MeshInstance3D or child is OmniLight3D or child is GPUParticles3D or child is CPUParticles3D:
			if not mirrors.has(child):
				var copy=Sprite3D.new() if child is Sprite3D else MeshInstance3D.new() if child is MeshInstance3D else OmniLight3D.new() if child is OmniLight3D else child.duplicate(0)
				if copy is Sprite3D: copy.texture_filter=BaseMaterial3D.TEXTURE_FILTER_NEAREST; copy.alpha_cut=child.alpha_cut
				stage.add_child(copy); mirrors[child]=copy
		_scan(child)
