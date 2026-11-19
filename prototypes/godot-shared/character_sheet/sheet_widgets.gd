extends RefCounted
## Sheet-scoped presentation. Inventory and the other VTT windows keep their own styles.
const Art=preload("res://character_sheet/skin.gd")
const Paint=preload("res://character_sheet/illuminated_materials.gd")
const H1=38
const H2=25
const H3=22
const H4=18
const BODY=17
const SECONDARY=15
const CAPTION=13
const VALUE=27
const TYPE={"h1":H1,"h2":H2,"h3":H3,"h4":H4,"body":BODY,"secondary":SECONDARY,"caption":CAPTION,"value":VALUE}
static var editorial: Font
static var display: Font
static var symbols: Dictionary={}
static func font(large: bool=false) -> Font:
	if not editorial:
		editorial=Art._bundled_font("CrimsonPro.ttf",650)
		display=Art._bundled_font("CrimsonPro.ttf",700)
	return display if large else editorial
static func label(text: String,points: int=BODY,bold: bool=false,color: Color=Art.INK) -> Label:
	var l=Art.label(text,points,false,color)
	if bold: l.add_theme_font_override("font",font())
	return l
static func wrapped(text: String,points: int=BODY) -> Label:
	var l=label(text,points); l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal=Control.SIZE_EXPAND_FILL; return l
static func surface(inset: int=10) -> PanelContainer:
	var p=PanelContainer.new(); var s=StyleBoxFlat.new(); s.bg_color=Color("#f4e5c8",.22)
	s.shadow_color=Color("#493023",.19); s.shadow_size=3; s.shadow_offset=Vector2(0,2)
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: s.set_content_margin(side,inset)
	p.add_theme_stylebox_override("panel",s)
	var carving=RoyalPanel.new(); p.add_child(carving); p.resized.connect(carving.queue_redraw)
	return p
static func button(text: String,selected: bool=false,points: int=BODY) -> Button:
	var b=Button.new(); b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font",Art.font()); b.add_theme_font_size_override("font_size",points)
	b.custom_minimum_size.y=30; b.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
	for state in ["normal","hover","pressed","disabled","focus"]:
		var s=StyleBoxFlat.new(); s.bg_color=Art.RED if selected else Color("#fff1cf",.22)
		if state=="hover": s.bg_color=Color("#dbc297",.7) if not selected else Color("#804144")
		if state=="pressed": s.bg_color=Color("#c0a06a",.7)
		if state=="disabled": s.bg_color=Color("#baa98b",.2)
		s.border_width_bottom=1; s.border_color=Color("#8f7045",.25); s.set_corner_radius_all(3)
		if state=="focus": s.set_border_width_all(1); s.border_color=Art.GOLD
		s.content_margin_left=6; s.content_margin_right=6; s.content_margin_top=2; s.content_margin_bottom=2
		b.add_theme_stylebox_override(state,s)
		b.add_theme_color_override("font_"+state+"_color",Art.IVORY if selected else Art.INK)
	b.add_theme_color_override("font_color",Art.IVORY if selected else Art.INK); b.add_theme_color_override("font_disabled_color",Art.MUTED)
	return b
static func image(key: String,pixels: int=24) -> TextureRect:
	var i=TextureRect.new(); i.texture=symbol(key); i.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; i.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; i.custom_minimum_size=Vector2(pixels,pixels); i.mouse_filter=Control.MOUSE_FILTER_IGNORE; return i
static func symbol(key: String) -> Texture2D: return Paint.icon(key)
static func heading(parent: Node,text: String,icon: String,points: int=H3) -> void:
	var band=PanelContainer.new(); var s=StyleBoxEmpty.new(); s.content_margin_left=9; s.content_margin_right=9; s.content_margin_top=3; s.content_margin_bottom=4; band.add_theme_stylebox_override("panel",s); parent.add_child(band)
	var ribbon=RoyalPanel.new(); ribbon.kind=2; ribbon.cap=Vector2(19,9); band.add_child(ribbon); band.resized.connect(ribbon.queue_redraw)
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",7); band.add_child(row); row.add_child(image(icon,23))
	var title=label(text,points,true,Art.IVORY); title.add_theme_font_override("font",font(true)); title.add_theme_color_override("font_shadow_color",Color("#1e0e05")); title.add_theme_constant_override("shadow_offset_y",1); title.size_flags_horizontal=Control.SIZE_EXPAND_FILL; title.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(title)
static func badge(text: String) -> Control:
	var p=PanelContainer.new(); p.custom_minimum_size=Vector2(44,29); p.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	var empty=StyleBoxEmpty.new(); p.add_theme_stylebox_override("panel",empty)
	var shape=ShieldBadge.new(); p.add_child(shape); p.resized.connect(shape.queue_redraw)
	var l=label(text,22,true); l.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; p.add_child(l); return p
static func navigation(text: String,selected: bool=false) -> Button:
	var b=button(text,selected,19); b.add_theme_font_override("font",font())
	for state in ["normal","hover","pressed","disabled","focus"]:
		var s=b.get_theme_stylebox(state).duplicate(); s.bg_color=Color.TRANSPARENT
		if state=="hover": s.bg_color=Color(1,.9,.65,.15)
		s.border_color=Art.GOLD; s.set_border_width_all(1 if state=="focus" else 0); s.content_margin_left=12; s.content_margin_right=12; s.content_margin_top=6; s.content_margin_bottom=6; b.add_theme_stylebox_override(state,s)
		b.add_theme_color_override("font_"+state+"_color",Art.IVORY)
	b.add_theme_color_override("font_color",Art.IVORY); b.add_theme_color_override("icon_normal_color",Color("#e4c07a"))
	b.set_meta("fantasy_selected",selected); var painting=Paint.Painted.new(); painting.show_behind_parent=true; painting.kind="navigation"; b.add_child(painting); b.resized.connect(painting.queue_redraw)
	return b
class ArmorBadge extends Control:
	func _ready() -> void:
		if custom_minimum_size==Vector2.ZERO: custom_minimum_size=Vector2(74,64)
		mouse_filter=Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		var texture=Paint.ornament(1); var scale=minf(size.x/texture.get_width(),size.y/texture.get_height())
		var extent=texture.get_size()*scale; draw_texture_rect(texture,Rect2((size-extent)*.5,extent),false)

class CornerInk extends Node2D:
	func _draw() -> void:
		var s=get_parent().size; var ink=Color("#8f7045",.65)
		for point in [Vector2(3,3),Vector2(s.x-3,3),Vector2(3,s.y-3),s-Vector2(3,3)]:
			var dir=Vector2(1 if point.x<10 else -1,1 if point.y<10 else -1)
			draw_polyline(PackedVector2Array([point+Vector2(0,12)*dir,point,point+Vector2(16,0)*dir]),ink,1,true)
			draw_arc(point+Vector2(5,5)*dir,3,0,TAU,12,ink,1,true)
class Ribbon extends Node2D:
	func _draw() -> void:
		var s=get_parent().size
		var points=PackedVector2Array([Vector2(8,1),Vector2(s.x-10,1),Vector2(s.x-3,6),Vector2(s.x-7,s.y*.5),Vector2(s.x-3,s.y-3),Vector2(10,s.y-1),Vector2(3,s.y-6),Vector2(5,s.y*.5),Vector2(3,6)])
		draw_colored_polygon(points,Art.RED); points.append(points[0]); draw_polyline(points,Art.GOLD,1.2,true)
		var tex=Art.texture("leather-ribbon.png"); var source=tex.get_size()
		draw_texture_rect_region(tex,Rect2(Vector2(10,3),s-Vector2(21,7)),Rect2(source*Vector2(.2,.25),source*Vector2(.6,.5)),Color(1,1,1,.52))
		draw_line(Vector2(14,s.y-4),Vector2(s.x-16,s.y-4),Color("#c8a160",.7),1,true)
class ShieldBadge extends Node2D:
	func _draw() -> void:
		var s=get_parent().size
		var outline=PackedVector2Array([Vector2(8,2),Vector2(s.x-8,2),Vector2(s.x-2,s.y*.5),Vector2(s.x-8,s.y-2),Vector2(8,s.y-2),Vector2(2,s.y*.5)])
		draw_colored_polygon(outline,Color("#f6e5bd")); outline.append(outline[0]); draw_polyline(outline,Color("#b3853c"),1.4,true)
		draw_line(Vector2(9,4),Vector2(s.x-9,4),Color("#fff7df"),1,true)

class Landscape extends Control:
	var theme_key: String="mountains"
	var opacity: float=.8
	func _ready() -> void: mouse_filter=Control.MOUSE_FILTER_IGNORE; custom_minimum_size=Vector2(90,30)
	func _draw() -> void:
		var index=maxi(0,["mountains","keep","ruins","forest","library","coast"].find(theme_key))
		var texture=Paint.v5_region("ink-places.png",index,3,2); var scale=minf(size.x/texture.get_width(),size.y/texture.get_height()); var extent=texture.get_size()*scale
		draw_texture_rect(texture,Rect2((size-extent)*.5,extent),false,Color(1,1,1,opacity))
static func divider(parent: Node) -> void:
	var line=TextureRect.new(); line.texture=Paint.ornament(4); line.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; line.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; line.custom_minimum_size.y=12; line.mouse_filter=Control.MOUSE_FILTER_IGNORE; parent.add_child(line)

static func stat_plate() -> PanelContainer:
	var p=PanelContainer.new(); var style=StyleBoxEmpty.new()
	for side in [SIDE_LEFT,SIDE_RIGHT]: style.set_content_margin(side,12)
	for side in [SIDE_TOP,SIDE_BOTTOM]: style.set_content_margin(side,7)
	p.add_theme_stylebox_override("panel",style); var painting=RoyalPanel.new(); painting.cap=Vector2(23,12); p.add_child(painting); p.resized.connect(painting.queue_redraw); return p
static func secondary(inset: int=8) -> PanelContainer:
	var panel=PanelContainer.new(); var style=StyleBoxFlat.new(); style.bg_color=Color("#f4e5c8",.28); style.border_color=Color("#a17c43",.55); style.set_border_width_all(1)
	style.shadow_color=Color("#493023",.1); style.shadow_size=2; style.shadow_offset=Vector2(0,1)
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: style.set_content_margin(side,inset)
	panel.add_theme_stylebox_override("panel",style); return panel
static func icon_button(icon: String,text: String="") -> Button:
	var b=button(text,false,24); b.custom_minimum_size=Vector2(33,33); b.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	var paint=Paint.Painted.new(); paint.show_behind_parent=true; paint.kind="button"; b.add_child(paint); b.resized.connect(paint.queue_redraw)
	if not icon.is_empty(): b.icon=symbol(icon); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",17)
	return b
static func style_scroll(sc: ScrollContainer) -> void:
	for bar in [sc.get_v_scroll_bar(),sc.get_h_scroll_bar()]:
		for state in ["scroll","scroll_focus","grabber","grabber_highlight","grabber_pressed"]:
			var style=StyleBoxFlat.new(); style.bg_color=Color("#d8c39e") if state.begins_with("scroll") else Color("#927040") if state=="grabber" else Color("#b79150")
			style.set_corner_radius_all(3); style.content_margin_left=3; style.content_margin_right=3; style.content_margin_top=3; style.content_margin_bottom=3
			if not state.begins_with("scroll"): style.border_color=Color("#6f512e"); style.set_border_width_all(1)
			bar.add_theme_stylebox_override(state,style)
static func skill_row(name: String,ability: String,total: int,rank: int) -> Button:
	var b=button(""); b.custom_minimum_size.y=27; b.set_meta("proficiency_rank",rank); b.set_meta("skill_total",total)
	var row=HBoxContainer.new(); row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); row.offset_left=4; row.offset_right=-5; row.offset_top=1; row.offset_bottom=-1; row.mouse_filter=Control.MOUSE_FILTER_IGNORE; b.add_child(row)
	var seal=Paint.RankSeal.new(); seal.rank=rank; row.add_child(seal)
	var title=label(name,17); title.size_flags_horizontal=Control.SIZE_EXPAND_FILL; title.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(title)
	row.add_child(label(ability,13,false,Art.MUTED)); var value=label(("+" if total>=0 else "−")+str(absi(total)),21,true); value.custom_minimum_size.x=32; value.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; row.add_child(value)
	return b
static func magic_stat(parent: Node,title: String,value: String,key: String) -> void:
	var plate=secondary(3); plate.size_flags_horizontal=Control.SIZE_EXPAND_FILL; parent.add_child(plate)
	var card=HBoxContainer.new(); card.size_flags_horizontal=Control.SIZE_EXPAND_FILL; plate.add_child(card); card.add_child(image(key,25))
	var box=VBoxContainer.new(); box.add_theme_constant_override("separation",0); card.add_child(box); box.add_child(label(title,13,true)); box.add_child(label(value,23,true))
static func slot_row(parent: Node,key: String,resource: Dictionary) -> void:
	var row=HBoxContainer.new(); row.add_theme_constant_override("separation",3); parent.add_child(row)
	row.add_child(label("Espacios · Nv. "+key.trim_prefix("spell-slot-") if key.begins_with("spell-slot-") else str(resource.get("label",key)),15,true))
	for i in range(mini(int(resource.get("max",0)),9)):
		var seal=Paint.SlotSeal.new(); seal.filled=i<int(resource.get("current",0)); row.add_child(seal)
	row.add_child(label("%d/%d" % [int(resource.get("current",0)),int(resource.get("max",0))],15))

class RoyalPanel extends Node2D:
	var kind: int=1
	var cap: Vector2=Vector2(21,16)
	func _draw() -> void:
		var finish=load("res://character_sheet/header_finish.gd")
		var s=get_parent().size; var tall=kind==1 and s.y>130
		if tall:
			var rect=Rect2(Vector2(6,6),s-Vector2(12,12)); draw_rect(rect,Art.IVORY); draw_texture_rect(Art.texture("v5/paper.png"),rect,false,Color(1,1,1,.65))
		Paint.nine(self,finish.piece(kind),Rect2(Vector2.ZERO,s),cap,Vector2(.18,.26),Color.WHITE,not tall)

static func icon_tile(key: String,pixels: int=28) -> Control:
	var p=PanelContainer.new(); p.mouse_filter=Control.MOUSE_FILTER_IGNORE; p.custom_minimum_size=Vector2(pixels,pixels); p.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	var s=StyleBoxFlat.new(); s.bg_color=Color("#47251d"); s.border_color=Color("#c89b45"); s.set_border_width_all(1); s.set_corner_radius_all(4); s.shadow_size=1; s.shadow_color=Color("#442a19",.4)
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: s.set_content_margin(side,3)
	p.add_theme_stylebox_override("panel",s); p.add_child(image(key,pixels-6)); return p

static func stripe(button: Button,index: int) -> void:
	var style=button.get_theme_stylebox("normal").duplicate(); style.bg_color=Color("#e6cc9c",.42) if index%2==0 else Color("#fff4d7",.35); button.add_theme_stylebox_override("normal",style)
