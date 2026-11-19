extends RefCounted
## Grid extraction with alpha gutters. Never crop across a neighbouring cell.
static var _cache: Dictionary={}
static func frames(item: Dictionary) -> Dictionary:
	if _cache.has(item.id): return _cache[item.id]
	var path: String="res://characters/"+str(item.source.file)
	var image:=Image.load_from_file(ProjectSettings.globalize_path(path))
	if image==null or image.is_empty(): return {}
	# Some generated RGBA files carry alpha=1/255 across their empty canvas.
	# Clean only this invisible import matte; the source PNG stays byte-exact.
	image.convert(Image.FORMAT_RGBA8)
	var pixels:=image.get_data()
	for offset in range(3,pixels.size(),4):
		if pixels[offset]<=2:
			pixels[offset]=0; pixels[offset-1]=0; pixels[offset-2]=0; pixels[offset-3]=0
	image=Image.create_from_data(image.get_width(),image.get_height(),false,Image.FORMAT_RGBA8,pixels)
	var cols: int=item.source.columns; var rows: int=item.source.rows
	var result: Dictionary={"reference_height":0.0,"frames":{}}
	for i in range(item.source.directions.size()):
		var x:=i%cols; var y:=i/cols
		var begin:=Vector2i(roundi(float(x)*image.get_width()/cols),roundi(float(y)*image.get_height()/rows))
		var end:=Vector2i(roundi(float(x+1)*image.get_width()/cols),roundi(float(y+1)*image.get_height()/rows))
		var size:=end-begin
		var cell:=image.get_region(Rect2i(begin,size))
		var used:=cell.get_used_rect()
		if used.size.x<1 or used.size.y<1:
			push_error("Empty equipment view "+str(item.id)+"/"+str(i)); return {}
		if used.position.x<3 or used.position.y<3 or used.end.x>size.x-3 or used.end.y>size.y-3:
			push_error("Equipment reaches atlas cell edge; neighbour crop is unsafe: "+str(item.id)+"/"+str(i)); return {}
		var cropped:=cell.get_region(used); cropped.fix_alpha_edges(); cropped.generate_mipmaps()
		result.frames[str(item.source.directions[i])]={"texture":ImageTexture.create_from_image(cropped),"bounds":used,"cell":Rect2i(begin,size)}
		result.reference_height=maxf(result.reference_height,float(used.size.y))
	_cache[item.id]=result; return result
static func create(item: Dictionary,body: Node3D) -> Node3D:
	var root:=Node3D.new(); root.name="PaintedEquipment_"+str(item.id)
	var sprite:=Sprite3D.new(); sprite.name="Artwork"; sprite.billboard=BaseMaterial3D.BILLBOARD_FIXED_Y
	sprite.no_depth_test=false; sprite.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sprite.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sprite.render_priority=9 if item.drawOrder=="rear" else 11
	root.add_child(sprite)
	var surface=preload("res://characters/body_surface.gd").new(); surface.name="PaintedStateSurface"; surface.body=body; surface.source_sprite=sprite; root.add_child(surface)
	return root
static func update(root: Node3D,body: Node3D,item: Dictionary) -> void:
	var data:=frames(item)
	if data.is_empty(): root.hide(); return
	var direction: String=preload("res://sprites/sprite_facing.gd").view_direction(body,str(body.facing_dir))
	var frame: Dictionary=data.frames.get(direction,data.frames.get("s",{}))
	if frame.is_empty(): root.hide(); return
	var sprite:=root.get_node("Artwork") as Sprite3D
	sprite.texture=frame.texture; sprite.layers=body.sprite.layers
	var remap: Dictionary=item.get("viewRemap",{}).get(direction,{})
	if not remap.is_empty(): sprite.texture=data.frames[str(remap.source)].texture
	sprite.flip_h=bool(remap.get("flip",false))
	sprite.modulate.a=body.sprite.modulate.a
	sprite.pixel_size=body.target_height*float(item.get("heightRelativeToCharacter",.2))/float(data.reference_height)
	root.scale=Vector3.ONE
	var pivot: Array=item.get("pivot",[.5,.5])
	sprite.position=Vector3((.5-float(pivot[0]))*sprite.texture.get_width()*sprite.pixel_size,(float(pivot[1])-.5)*sprite.texture.get_height()*sprite.pixel_size,0)
