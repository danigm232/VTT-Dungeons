extends RefCounted
const Registry=preload("res://characters/registry.gd")
static var _bounds: Dictionary={}
static var _head_centers: Dictionary={}
static func head_center(texture: Texture2D) -> Vector2:
	if texture==null: return Vector2(.5,.12)
	var id:=texture.get_instance_id()
	if not _head_centers.has(id):
		var image:=texture.get_image(); var bounds:=image.get_used_rect()
		var sum:=0.0; var weight:=0.0
		for y in range(bounds.position.y,bounds.position.y+maxi(2,int(bounds.size.y*.16)),3):
			for x in range(bounds.position.x,bounds.end.x,3):
				var alpha:=image.get_pixel(x,y).a
				sum+=float(x-bounds.position.x)/bounds.size.x*alpha; weight+=alpha
		_head_centers[id]=Vector2(sum/maxf(1,weight),.12)
	return _head_centers[id]
static func frame_key(body: Node3D) -> String:
	var direction: String=preload("res://sprites/sprite_facing.gd").view_direction(body,str(body.facing_dir))
	return str(body.current_anim)+":"+direction+":"+str(body.anim_frame_idx)
static func frame_bounds(texture: Texture2D) -> Rect2:
	if texture==null: return Rect2(0,0,1,1)
	var key:=texture.get_instance_id()
	if not _bounds.has(key):
		var image:=texture.get_image()
		var used:=image.get_used_rect() if image else Rect2i(0,0,texture.get_width(),texture.get_height())
		_bounds[key]=Rect2(Vector2(used.position)/Vector2(texture.get_width(),texture.get_height()),Vector2(used.size)/Vector2(texture.get_width(),texture.get_height()))
	return _bounds[key]
static func points(body: Node3D,definition: Dictionary,overrides: Dictionary={}) -> Dictionary:
	var anatomy: Dictionary=Registry.data().get("anatomies",{}).get(definition.get("anatomy","humanoid-tall"),{})
	var result: Dictionary=anatomy.get("anchors",{}).duplicate(true)
	if result.has("head") and str(definition.get("anatomy","")).begins_with("humanoid"):
		var head:=head_center(body.sprite.texture)
		result.head[0]=head.x
		for center_anchor in ["neck","torso","back","waist","hip"]:
			if result.has(center_anchor): result[center_anchor][0]=head.x
	# Templates describe anatomical sides, not screen-left/right. Project those
	# sides using the actual drawn direction; corrections remain authoritative.
	var direction: String=preload("res://sprites/sprite_facing.gd").view_direction(body,str(body.facing_dir))
	var dirs: Array=["e","se","s","sw","w","nw","n","ne"]
	var angle: float=maxi(0,dirs.find(direction))*PI/4.0
	if str(definition.get("anatomy","")).begins_with("humanoid") or definition.get("anatomy","")=="winged":
		for anchor in result:
			if str(anchor).ends_with("_left") or str(anchor).ends_with("_right"):
				result[anchor][0]=.5-(float(result[anchor][0])-.5)*sin(angle)
	var key:=frame_key(body)
	for correction in [definition.get("frameOverrides",{}).get(key,{}),overrides.get(key,{})]:
		for anchor in correction: result[anchor]=correction[anchor]
	return result
static func plane(body: Node3D) -> Basis:
	var camera:=body.get_viewport().get_camera_3d()
	var up: Vector3=body.sprite.global_basis.y.normalized()
	var forward:=camera.global_basis.z if camera else Vector3.BACK
	var right: Vector3=up.cross(forward).normalized()
	if right.length_squared()<.01: right=Vector3.RIGHT
	return Basis(right,up,right.cross(up).normalized())
static func local_point(body: Node3D,uv: Vector2,depth: float=0.0) -> Vector3:
	var texture: Texture2D=body.sprite.texture
	if texture==null: return Vector3.ZERO
	var bounds:=frame_bounds(texture)
	var pixel:=bounds.position+bounds.size*uv
	if body.sprite.flip_h: pixel.x=1.0-pixel.x
	var width: float=texture.get_width()*body.sprite.pixel_size*body.sprite.scale.x
	var height: float=texture.get_height()*body.sprite.pixel_size*body.sprite.scale.y
	var basis:=plane(body)
	var global: Vector3=body.sprite.global_position+basis.x*((pixel.x-.5)*width)+basis.y*((.5-pixel.y)*height)+basis.z*depth
	return body.to_local(global)
static func resolved(body: Node3D,definition: Dictionary,overrides: Dictionary={}) -> Dictionary:
	var result: Dictionary={}
	var declared:=points(body,definition,overrides)
	for key in declared: result[key]=local_point(body,Vector2(declared[key][0],declared[key][1]))
	return result
