extends RefCounted
## Illustrated materials only. All lettering and numbers remain native Controls.
const INK=Color("#30251c")
const MUTED=Color("#71604b")
const GOLD=Color("#b68a42")
const RED=Color("#642f32")
const IVORY=Color("#f4e5c8")
static var images: Dictionary={}
static var title_font: Font
static var body_font: Font
static var icon_atlas: Image
static var item_atlas: Image
const EXTRA_ICONS=["backpack","gold","potion","mace","handaxe","shortbow","dagger","frost","healing","bless","wand","spellbook","feather","stealth","key","holy","wizard","soldier","chainmail","gloves","torch","lantern","shield","hourglass"]
static func texture(file: String) -> Texture2D:
	if not images.has(file):
		var im=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/"+file))
		images[file]=ImageTexture.create_from_image(im) if im else null
	return images[file]
static func font(heading: bool=false) -> Font:
	if not title_font:
		title_font=_bundled_font("Cinzel.ttf",600)
		body_font=_bundled_font("CrimsonPro.ttf",500)
	return title_font if heading else body_font
static func _bundled_font(file: String,weight: int) -> Font:
	var raw=FontFile.new(); raw.data=FileAccess.get_file_as_bytes("res://character_sheet/fonts/"+file)
	var variation=FontVariation.new(); variation.base_font=raw; variation.variation_opentype={"wght":weight}
	return variation
static func label(text: String,points: int=16,heading: bool=false,color: Color=INK) -> Label:
	var l=Label.new(); l.text=text; l.add_theme_font_override("font",font(heading)); l.add_theme_font_size_override("font_size",points); l.add_theme_color_override("font_color",color); l.mouse_filter=Control.MOUSE_FILTER_IGNORE
	return l
static func wrapped(text: String,points: int=15) -> Label:
	var l=label(text,points); l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	return l
static func panel(inset: int=16,border: int=16) -> PanelContainer:
	var p=PanelContainer.new(); var empty=StyleBoxEmpty.new()
	for side in [SIDE_LEFT,SIDE_TOP,SIDE_RIGHT,SIDE_BOTTOM]: empty.set_content_margin(side,maxi(inset,border))
	p.add_theme_stylebox_override("panel",empty)
	var art=FrameArt.new(); art.border=maxi(9,border); art.file="v2/ornate-panel.png"; art.source_edge=Vector2(280,240); p.add_child(art); p.resized.connect(art.queue_redraw)
	return p
static func button(text: String,selected: bool=false) -> Button:
	var b=Button.new(); b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	b.add_theme_font_override("font",font(false)); b.add_theme_font_size_override("font_size",17)
	for state in ["normal","hover","pressed","disabled","focus"]:
		var box=StyleBoxFlat.new(); box.bg_color=RED if selected else Color("#e3c798")
		if state=="hover": box.bg_color=Color("#bc9559") if not selected else Color("#804144")
		if state=="pressed": box.bg_color=Color("#9c733f")
		if state=="disabled": box.bg_color=Color("#c9bea7")
		box.set_border_width_all(1); box.border_color=GOLD; box.corner_detail=1
		for side in [SIDE_LEFT,SIDE_RIGHT]: box.set_content_margin(side,12)
		for side in [SIDE_TOP,SIDE_BOTTOM]: box.set_content_margin(side,8)
		b.add_theme_stylebox_override(state,box)
		b.add_theme_color_override("font_"+state+"_color",IVORY if selected else INK)
	b.add_theme_color_override("font_color",IVORY if selected else INK); b.add_theme_color_override("font_disabled_color",MUTED)
	var engraving=ButtonEngraving.new(); b.add_child(engraving); b.resized.connect(engraving.queue_redraw); b.mouse_entered.connect(engraving.queue_redraw); b.mouse_exited.connect(engraving.queue_redraw)
	return b
static func style_field(field: LineEdit) -> void:
	field.add_theme_font_override("font",font()); field.add_theme_font_size_override("font_size",18)
	field.add_theme_color_override("font_color",INK); field.add_theme_color_override("font_placeholder_color",MUTED); field.add_theme_color_override("caret_color",RED); field.add_theme_color_override("selection_color",RED)
	for state in ["normal","focus","read_only"]:
		var box=StyleBoxFlat.new(); box.bg_color=Color("#f0ddb7"); box.border_color=GOLD; box.set_border_width_all(2 if state=="focus" else 1)
		box.content_margin_left=9; box.content_margin_right=9; box.content_margin_top=7; box.content_margin_bottom=7; field.add_theme_stylebox_override(state,box)
static func heading(parent: Node,text: String,icon_name: String="book") -> void:
	var band=PanelContainer.new(); var style=StyleBoxFlat.new(); style.bg_color=RED; style.border_color=GOLD; style.border_width_bottom=2
	style.content_margin_left=10; style.content_margin_right=10; style.content_margin_top=6; style.content_margin_bottom=6
	band.add_theme_stylebox_override("panel",style); parent.add_child(band)
	var trim=FrameArt.new(); trim.border=20; trim.border_y=6; trim.file="leather-ribbon.png"; trim.source_edge=Vector2(310,100); band.add_child(trim); band.resized.connect(trim.queue_redraw)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",8); band.add_child(row)
	var image=TextureRect.new(); image.texture=icon(icon_name); image.custom_minimum_size=Vector2(24,24); image.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; image.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; row.add_child(image)
	var title=label(text,19,true,IVORY); title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; title.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(title)
static func icon(key: String) -> Texture2D:
	if images.has(key): return images[key]
	var extra=EXTRA_ICONS.find(key)
	if extra>=0:
		if not item_atlas: item_atlas=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v2/icons-v2.png"))
		images[key]=_atlas_region(item_atlas,extra,6,4); return images[key]
	var keys=["heart","shield","speed","initiative","star","sword","book","magic","history","die","eye","hand"]
	var atlas_path=ProjectSettings.globalize_path("res://character_sheet/art/engraved-icons.png")
	if FileAccess.file_exists(atlas_path):
		if not icon_atlas: icon_atlas=Image.load_from_file(atlas_path)
		var index=maxi(0,keys.find(key)); var column=index%4; var row=floori(float(index)/4)
		var x0=roundi(float(icon_atlas.get_width())*column/4); var x1=roundi(float(icon_atlas.get_width())*(column+1)/4)
		var y0=roundi(float(icon_atlas.get_height())*row/3); var y1=roundi(float(icon_atlas.get_height())*(row+1)/3)
		var tile=icon_atlas.get_region(Rect2i(x0,y0,x1-x0,y1-y0))
		# Remove barely transparent export colour fringes; keep the original atlas untouched.
		for y in range(tile.get_height()):
			for x in range(tile.get_width()):
				if tile.get_pixel(x,y).a<.125: tile.set_pixel(x,y,Color.TRANSPARENT)
		var used=tile.get_used_rect()
		if used.has_area(): tile=tile.get_region(used)
		tile.generate_mipmaps(); images[key]=ImageTexture.create_from_image(tile); return images[key]
	var paths={
		"heart":"M16 28C-5 15 6-4 16 7 26-4 37 15 16 28Z",
		"shield":"M16 2 28 6v10c-1 6-7 11-12 14C11 27 5 22 4 16V6L16 2Zm0 5v18M9 12h14",
		"speed":"m4 27 9-10-3-5 6-7 5 3-3 6 8 3-2 5-10-4m0 0 5-7M22 2l5 2",
		"initiative":"M8 2h16M8 30h16M10 3c0 12 12 14 12 26M22 3C22 15 10 16 10 29M11 7h10m-10 18h10",
		"star":"m16 2 4 9 10 1-8 7 2 11-8-6-8 6 2-11-8-7 10-1 4-9Z",
		"sword":"m4 29 7-7m-6-5 10 10m-5-6L25 3l4-1-1 5-16 17",
		"book":"M16 7C9 2 5 2 2 3v23c4-1 9 0 14 4 5-4 10-5 14-4V3c-5-1-9 0-14 4Zm0 0v23M6 9l6 2m-6 4 6 2m8-6 6-2m-6 8 6-2",
		"magic":"m16 1 3 10 10 5-10 4-3 11-4-11-11-4 11-5 4-10Z",
		"history":"M7 3h20l-2 5v20H5l2-5V3Zm-3 0h7m2 6h9m-9 5h9m-9 5h6",
		"die":"m16 1 14 8v15l-14 7-14-7V9l14-8Zm0 0v30M2 9l14 7 14-7M2 24l14-8 14 8",
		"eye":"M1 16c9-14 21-14 30 0-9 14-21 14-30 0Zm10 0a5 5 0 1 0 10 0 5 5 0 0 0-10 0",
		"hand":"M6 29V15l-4-3 2-4 6 5V4l3-2 2 11 1-12h3l1 12 2-10h3v14l4-4 2 3-6 13H6Z"}
	var path: String=paths.get(key,paths.star)
	var svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><path d="'+path+'" fill="#b68a42" fill-opacity=".8" stroke="#65451e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
	var im=Image.new(); im.load_svg_from_string(svg); images[key]=ImageTexture.create_from_image(im); return images[key]
static func has_icon(key: String) -> bool:
	return key in EXTRA_ICONS or key in ["heart","speed","initiative","star","sword","book","magic","history","die","eye","hand"]
static func _atlas_region(atlas: Image,index: int,columns: int,rows: int) -> Texture2D:
	var column=index%columns; var row=floori(float(index)/columns)
	var x0=roundi(float(atlas.get_width())*column/columns); var x1=roundi(float(atlas.get_width())*(column+1)/columns)
	var y0=roundi(float(atlas.get_height())*row/rows); var y1=roundi(float(atlas.get_height())*(row+1)/rows)
	var tile=atlas.get_region(Rect2i(x0,y0,x1-x0,y1-y0))
	for y in range(tile.get_height()):
		for x in range(tile.get_width()):
			if tile.get_pixel(x,y).a<.125: tile.set_pixel(x,y,Color.TRANSPARENT)
	var used=tile.get_used_rect()
	if used.has_area(): tile=tile.get_region(used)
	tile.generate_mipmaps(); return ImageTexture.create_from_image(tile)
static func action_icon(action: Dictionary) -> String:
	return preload("res://character_sheet/action_icons.gd").key(action)
class FrameArt extends Node2D:
	var border: int=16
	var border_y: int=-1
	var draw_center: bool=true
	var file: String="manuscript-frame.png"
	var source_edge=Vector2(196,178)
	func _draw() -> void:
		var p=get_parent() as Control
		if not p: return
		var tex=load("res://character_sheet/skin.gd").texture(file)
		if not tex: return
		var s=tex.get_size(); var edge=source_edge; var dest=Vector2(border,border if border_y<0 else border_y)
		var xx=[0.0,dest.x,maxf(dest.x,p.size.x-dest.x),p.size.x]; var yy=[0.0,dest.y,maxf(dest.y,p.size.y-dest.y),p.size.y]
		var sx=[0.0,edge.x,s.x-edge.x,s.x]; var sy=[0.0,edge.y,s.y-edge.y,s.y]
		for y in range(3):
			for x in range(3):
				if not draw_center and x==1 and y==1: continue
				draw_texture_rect_region(tex,Rect2(xx[x],yy[y],xx[x+1]-xx[x],yy[y+1]-yy[y]),Rect2(sx[x],sy[y],sx[x+1]-sx[x],sy[y+1]-sy[y]))
class ButtonEngraving extends Node2D:
	func _draw() -> void:
		var p=get_parent() as Control
		if not p: return
		var r=Rect2(Vector2(3,3),p.size-Vector2(6,6)); var cut=5.0
		var points=PackedVector2Array([r.position+Vector2(cut,0),Vector2(r.end.x-cut,r.position.y),Vector2(r.end.x,r.position.y+cut),r.end-Vector2(0,cut),r.end-Vector2(cut,0),Vector2(r.position.x+cut,r.end.y),Vector2(r.position.x,r.end.y-cut),r.position+Vector2(0,cut),r.position+Vector2(cut,0)])
		draw_polyline(points,Color("#a27b43"),1,true)
		for x in [r.position.x+4,r.end.x-4]:
			draw_line(Vector2(x,p.size.y*.5-3),Vector2(x,p.size.y*.5+3),Color("#b68a42"),1,true)
