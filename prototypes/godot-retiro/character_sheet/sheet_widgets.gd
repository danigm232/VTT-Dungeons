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
		display=Art._bundled_font("CrimsonPro.ttf",770)
	return display if large else editorial
static func label(text: String,points: int=BODY,bold: bool=false,color: Color=Art.INK) -> Label:
	var l=Art.label(text,points,false,color)
	if bold: l.add_theme_font_override("font",font(points>=H3))
	return l
const TYPE_ROLES={
	"identity":[42,true], "panel":[22,true], "subtitle":[18,false],
	"column":[16,true], "action":[18,false], "description":[17,false],
	"number":[27,true], "status":[14,false]
}
static func type_role(node: Label,role: String) -> void:
	var spec: Array=TYPE_ROLES[role]
	node.add_theme_font_size_override("font_size",spec[0])
	node.add_theme_font_override("font",Art.font() if role=="description" or role=="status" else font(spec[1]))
	node.set_meta("sheet_type_role",role)
static func manuscript_theme() -> Theme:
	var theme=Theme.new()
	theme.default_font=Art.font()
	theme.default_font_size=17
	var paper=StyleBoxFlat.new()
	paper.bg_color=Color("#efddba"); paper.border_color=Art.GOLD
	paper.set_border_width_all(2); paper.set_corner_radius_all(4)
	paper.shadow_color=Color("#342014",.30); paper.shadow_size=4
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: paper.set_content_margin(side,8)
	for owner in ["PopupMenu","TooltipPanel"]:
		theme.set_stylebox("panel",owner,paper)
	var hover=StyleBoxFlat.new(); hover.bg_color=Color("#6b3031"); hover.set_corner_radius_all(2)
	theme.set_stylebox("hover","PopupMenu",hover)
	theme.set_color("font_color","PopupMenu",Art.INK)
	theme.set_color("font_hover_color","PopupMenu",Art.IVORY)
	theme.set_color("font_color","TooltipLabel",Art.INK)
	for state in ["normal","hover","pressed","disabled","focus"]:
		var opt=StyleBoxFlat.new()
		opt.bg_color=Color("#efddba") if state=="normal" else Color("#dfc392") if state=="hover" else Color("#cda86b") if state=="pressed" else Color("#dfd3bc",.6) if state=="disabled" else Color("#efddba")
		opt.border_color=Color("#794826") if state=="focus" else Art.GOLD
		opt.set_border_width_all(2 if state=="focus" else 1); opt.set_corner_radius_all(4)
		opt.content_margin_left=8; opt.content_margin_right=8; opt.content_margin_top=4; opt.content_margin_bottom=4
		theme.set_stylebox(state,"OptionButton",opt)
		theme.set_color("font_"+state+"_color","OptionButton",Art.INK)
	theme.set_color("font_color","OptionButton",Art.INK)
	return theme
static func wrapped(text: String,points: int=BODY) -> Label:
	var l=label(text,points); type_role(l,"description"); l.add_theme_font_size_override("font_size",points); l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; l.size_flags_horizontal=Control.SIZE_EXPAND_FILL; return l
static func surface(inset: int=10) -> PanelContainer:
	var p=Art.Native.HintPanel.new(); var s=StyleBoxFlat.new(); s.bg_color=Color("#f4e5c8",.10)
	s.shadow_color=Color("#493023",.24); s.shadow_size=4; s.shadow_offset=Vector2(0,2)
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: s.set_content_margin(side,inset)
	p.add_theme_stylebox_override("panel",s)
	var carving=RoyalPanel.new(); p.add_child(carving); p.resized.connect(carving.queue_redraw)
	return p
static func button(text: String,selected: bool=false,points: int=BODY) -> Button:
	var b=Art.Native.HintButton.new(); b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font",Art.font()); b.add_theme_font_size_override("font_size",points)
	b.custom_minimum_size.y=30; b.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
	for state in ["normal","hover","pressed","disabled","focus"]:
		var s=StyleBoxFlat.new(); s.bg_color=Art.RED if selected else Color("#fff1cf",.22)
		if state=="hover": s.bg_color=Color("#dbc297",.7) if not selected else Color("#804144")
		if state=="pressed": s.bg_color=Color("#c0a06a",.7)
		if state=="disabled": s.bg_color=Color("#baa98b",.2)
		s.border_width_bottom=1; s.border_color=Color("#8f7045",.25); s.set_corner_radius_all(3)
		if state=="focus":
			s.bg_color=Color.TRANSPARENT
			s.set_border_width_all(2)
			s.border_color=Color("#794826")
		s.content_margin_left=6; s.content_margin_right=6; s.content_margin_top=2; s.content_margin_bottom=2
		b.add_theme_stylebox_override(state,s)
		b.add_theme_color_override("font_"+state+"_color",Art.IVORY if selected else Art.INK)
	b.add_theme_color_override("font_color",Art.IVORY if selected else Art.INK); b.add_theme_color_override("font_disabled_color",Art.MUTED)
	b.add_theme_color_override("icon_disabled_color",Color("#c1b39b",.58))
	return b
static func highlight_choice(button: Button) -> void:
	var selected=button.get_theme_stylebox("pressed").duplicate()
	selected.bg_color=Art.RED
	selected.border_color=Art.GOLD
	button.add_theme_stylebox_override("pressed",selected)
	button.add_theme_stylebox_override("hover_pressed",selected)
	button.add_theme_color_override("font_pressed_color",Art.IVORY)
	button.add_theme_color_override("font_hover_pressed_color",Art.IVORY)
	button.add_theme_color_override("font_focus_color",Art.INK)
static func image(key: String,pixels: int=24) -> TextureRect:
	var i=TextureRect.new(); i.set_meta("sheet_icon",key); i.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; i.texture=symbol(key); i.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; i.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; i.custom_minimum_size=Vector2(pixels,pixels); i.mouse_filter=Control.MOUSE_FILTER_IGNORE; return i
static func symbol(key: String) -> Texture2D: return Paint.icon(key)
static func heading(parent: Node,text: String,icon: String,points: int=H3,centered: bool=false) -> HBoxContainer:
	var band=PanelContainer.new(); var s=StyleBoxEmpty.new(); s.content_margin_left=12; s.content_margin_right=12; s.content_margin_top=4; s.content_margin_bottom=5; band.add_theme_stylebox_override("panel",s); parent.add_child(band)
	var ribbon=Cartouche.new(); ribbon.secondary=points<H3; ribbon.magical=icon in ["magic","spellbook","casting"]; ribbon.centered_flourish=centered; band.add_child(ribbon); band.resized.connect(ribbon.queue_redraw)
	var row=HBoxContainer.new(); row.alignment=BoxContainer.ALIGNMENT_CENTER; row.add_theme_constant_override("separation",7); band.add_child(row)
	if centered:
		var sp_l=Control.new(); sp_l.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(sp_l)
	var crest=image(icon,23); crest.size_flags_vertical=Control.SIZE_SHRINK_CENTER; crest.modulate=Color("#ffecc4"); row.add_child(crest)
	var title=label(text,points,true,Art.IVORY); type_role(title,"panel"); title.add_theme_font_size_override("font_size",points); title.add_theme_color_override("font_shadow_color",Color("#1e0e05")); title.add_theme_constant_override("shadow_offset_y",1); title.size_flags_horizontal=Control.SIZE_SHRINK_CENTER if centered else Control.SIZE_EXPAND_FILL; title.size_flags_vertical=Control.SIZE_SHRINK_CENTER; title.text_overrun_behavior=TextServer.OVERRUN_NO_TRIMMING if centered else TextServer.OVERRUN_TRIM_ELLIPSIS; row.add_child(title)
	if centered:
		var sp_r=Control.new(); sp_r.size_flags_horizontal=Control.SIZE_EXPAND_FILL; row.add_child(sp_r)
	title.tooltip_text=text
	title.mouse_filter=Control.MOUSE_FILTER_PASS
	return row
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
		var sh=PackedVector2Array([Vector2(9,4),Vector2(s.x-7,4),Vector2(s.x-1,s.y*.5+2),Vector2(s.x-7,s.y),Vector2(9,s.y),Vector2(3,s.y*.5+2)])
		draw_colored_polygon(sh,Color("#3b210e",.28))
		var outline=PackedVector2Array([Vector2(8,2),Vector2(s.x-8,2),Vector2(s.x-2,s.y*.5),Vector2(s.x-8,s.y-2),Vector2(8,s.y-2),Vector2(2,s.y*.5)])
		draw_colored_polygon(outline,Color("#f5e3b6")); outline.append(outline[0]); draw_polyline(outline,Color("#9f712c"),1.6,true)
		var inner=PackedVector2Array([Vector2(9,4),Vector2(s.x-9,4),Vector2(s.x-4,s.y*.5),Vector2(s.x-9,s.y-4),Vector2(9,s.y-4),Vector2(4,s.y*.5)])
		inner.append(inner[0]); draw_polyline(inner,Color("#fff7df",.85),1.0,true)

class Landscape extends Control:
	var theme_key: String="mountains"
	var opacity: float=.88
	var align_x: float=.65
	var align_y: float=1.0
	var fill_cover: bool=false
	var edge_softness: float=.18
	func _ready() -> void:
		mouse_filter=Control.MOUSE_FILTER_IGNORE
		clip_contents=true
		custom_minimum_size=custom_minimum_size.max(Vector2(90,30))
		var mat:=ShaderMaterial.new()
		mat.shader=preload("res://character_sheet/ink_engraving.gdshader")
		mat.set_shader_parameter("ink_tint",Color("#3d2511"))
		mat.set_shader_parameter("ink_strength",clampf(opacity*1.05,0.2,1.25))
		mat.set_shader_parameter("edge_softness",edge_softness)
		material=mat
	func _draw() -> void:
		if size.y<24 or size.x<60: return
		var texture=Art.texture("foundation/ink-"+theme_key+".png")
		if not texture: return
		var sx=size.x/maxf(1.0,float(texture.get_width()))
		var sy=size.y/maxf(1.0,float(texture.get_height()))
		var factor=maxf(sx,sy) if fill_cover else minf(sx,sy)
		var extent=texture.get_size()*factor
		var pos=Vector2((size.x-extent.x)*align_x,(size.y-extent.y)*align_y)
		if material is ShaderMaterial:
			material.set_shader_parameter("ink_strength",clampf(opacity*1.05,0.2,1.25))
			material.set_shader_parameter("edge_softness",edge_softness)
			var u0=clampf(-pos.x/maxf(1.0,extent.x),0.0,1.0)
			var v0=clampf(-pos.y/maxf(1.0,extent.y),0.0,1.0)
			var u1=clampf((size.x-pos.x)/maxf(1.0,extent.x),0.0,1.0)
			var v1=clampf((size.y-pos.y)/maxf(1.0,extent.y),0.0,1.0)
			material.set_shader_parameter("uv_bounds",Vector4(u0,v0,u1,v1))
		draw_texture_rect(texture,Rect2(pos,extent),false,Color(1,1,1,opacity))
static func divider(parent: Node) -> void:
	var line=TextureRect.new(); line.texture=Paint.ornament(4); line.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; line.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; line.custom_minimum_size.y=12; line.mouse_filter=Control.MOUSE_FILTER_IGNORE; parent.add_child(line)

static func stat_plate() -> PanelContainer:
	var p=Art.Native.HintPanel.new(); var style=StyleBoxEmpty.new()
	for side in [SIDE_LEFT,SIDE_RIGHT]: style.set_content_margin(side,12)
	for side in [SIDE_TOP,SIDE_BOTTOM]: style.set_content_margin(side,7)
	p.add_theme_stylebox_override("panel",style); var painting=RoyalPanel.new(); painting.cap=Vector2(23,12); p.add_child(painting); p.resized.connect(painting.queue_redraw); return p
static func secondary(inset: int=8) -> PanelContainer:
	var panel=PanelContainer.new(); var style=StyleBoxFlat.new(); style.bg_color=Color("#f4e5c8",.28); style.border_color=Color("#a17c43",.55); style.set_border_width_all(1)
	style.shadow_color=Color("#493023",.1); style.shadow_size=2; style.shadow_offset=Vector2(0,1)
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: style.set_content_margin(side,inset)
	panel.add_theme_stylebox_override("panel",style); return panel
static func icon_button(icon: String,text: String="") -> Button:
	var b=Art.Native.HintButton.new(); b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font",font(true)); b.add_theme_font_size_override("font_size",22)
	b.custom_minimum_size=Vector2(36,36); b.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	for state in ["normal","hover","pressed","disabled","focus"]:
		var s=StyleBoxFlat.new()
		s.bg_color=Color("#3a1e18") if state=="normal" else Color("#682b2d") if state=="hover" else Color("#522021") if state=="pressed" else Color("#4a3b30",.55) if state=="disabled" else Color("#3a1e18")
		s.border_color=Color("#f1cd7e") if state in ["hover","focus"] else Color("#c49746")
		s.set_border_width_all(2); s.set_corner_radius_all(6)
		s.shadow_color=Color("#24110a",.35); s.shadow_size=2; s.shadow_offset=Vector2(0,1)
		for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: s.set_content_margin(side,4)
		b.add_theme_stylebox_override(state,s)
		b.add_theme_color_override("font_"+state+"_color",Color("#fff0cf"))
		b.add_theme_color_override("icon_"+state+"_color",Color("#f7d996"))
	b.add_theme_color_override("font_color",Color("#fff0cf")); b.add_theme_color_override("icon_normal_color",Color("#f7d996"))
	if not icon.is_empty(): b.icon=symbol(icon); b.expand_icon=true; b.icon_alignment=HORIZONTAL_ALIGNMENT_CENTER; b.add_theme_constant_override("icon_max_width",19)
	return b
static func primary_button(text: String,icon_key: String="",points: int=18) -> Button:
	var b=Art.Native.HintButton.new(); b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font",font(true)); b.add_theme_font_size_override("font_size",points)
	b.custom_minimum_size.y=36; b.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
	for state in ["normal","hover","pressed","disabled","focus"]:
		var s=StyleBoxFlat.new()
		s.bg_color=Color("#6b2629") if state=="normal" else Color("#863437") if state=="hover" else Color("#4e1a1c") if state=="pressed" else Color("#8c7c66",.42) if state=="disabled" else Color("#6b2629")
		s.border_color=Color("#f3d286") if state in ["hover","focus"] else Color("#c89a45") if state!="disabled" else Color("#9a876c",.6)
		s.set_border_width_all(2); s.set_corner_radius_all(5)
		s.shadow_color=Color("#2b150c",.32); s.shadow_size=3; s.shadow_offset=Vector2(0,1)
		s.content_margin_left=12; s.content_margin_right=12; s.content_margin_top=6; s.content_margin_bottom=6
		b.add_theme_stylebox_override(state,s)
		b.add_theme_color_override("font_"+state+"_color",Color("#fff2d4") if state!="disabled" else Color("#5e4f3e"))
	b.add_theme_color_override("font_color",Color("#fff2d4")); b.add_theme_color_override("font_disabled_color",Color("#5e4f3e"))
	if not icon_key.is_empty(): b.icon=symbol(icon_key); b.expand_icon=true; b.add_theme_constant_override("icon_max_width",20)
	return b
static func style_scroll(sc: ScrollContainer) -> void:
	sc.follow_focus=true
	for bar in [sc.get_v_scroll_bar(),sc.get_h_scroll_bar()]:
		for state in ["scroll","scroll_focus","grabber","grabber_highlight","grabber_pressed"]:
			var style=StyleBoxFlat.new(); style.bg_color=Color("#d8c39e") if state.begins_with("scroll") else Color("#927040") if state=="grabber" else Color("#b79150")
			style.set_corner_radius_all(4); style.content_margin_left=4; style.content_margin_right=4; style.content_margin_top=4; style.content_margin_bottom=4
			if not state.begins_with("scroll"): style.border_color=Color("#6f512e"); style.set_border_width_all(1)
			bar.add_theme_stylebox_override(state,style)
static func skill_row(name: String,ability: String,total: int,rank: int) -> Button:
	var b=button(""); b.custom_minimum_size.y=27; b.set_meta("proficiency_rank",rank); b.set_meta("skill_total",total)
	b.set_meta("sheet_icon","die"); b.set_meta("sheet_title",name)
	var row=HBoxContainer.new(); row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); row.offset_left=4; row.offset_right=-5; row.offset_top=1; row.offset_bottom=-1; row.mouse_filter=Control.MOUSE_FILTER_IGNORE; b.add_child(row)
	var seal=Paint.RankSeal.new(); seal.rank=rank; row.add_child(seal)
	b.accessibility_name="%s, %s, %s" % [name,"modificador "+str(total),["sin competencia","competencia","pericia"][rank] if rank>=0 and rank<=2 else "competencia sin registrar"]
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

class Cartouche extends Node2D:
	var secondary=false
	var magical=false
	var centered_flourish=false
	func _draw() -> void:
		var size: Vector2=get_parent().size
		# Sculpted drop shadow cast by the crimson header ribbon onto the parchment below.
		for i in range(4,0,-1):
			var sh=Rect2(Vector2(3,float(i)+1.5),Vector2(maxf(1.0,size.x-6),size.y))
			draw_rect(sh,Color("#281207",0.075*(1.0-float(i-1)/4.0)),true)
		var ribbon=Paint.region("ribbons.png",0 if magical else 2,1,3)
		var cap=Vector2(17,7) if secondary else Vector2(28,9)
		Paint.nine(self,ribbon,Rect2(Vector2.ZERO,size),cap,Vector2(.19,.23),Color("#e8d4b6") if secondary else Color.WHITE)
		# Crisp carved gilded top sheen and recessed bottom shade.
		draw_line(Vector2(14,2),Vector2(size.x-14,2),Color("#ffe7a6",.42),1.0,true)
		draw_line(Vector2(10,size.y-1),Vector2(size.x-10,size.y-1),Color("#240c06",.55),1.2,true)
		if size.x>205 and not secondary:
			draw_texture_rect(Paint.ornament(4),Rect2(size-Vector2(50,size.y*.5+6),Vector2(36,12)),false,Color("#f2d28c",.92))
			if centered_flourish:
				draw_texture_rect(Paint.ornament(4),Rect2(Vector2(14,size.y*.5-6),Vector2(36,12)),false,Color("#f2d28c",.92))

class RoyalPanel extends Node2D:
	var kind: int=1
	var cap: Vector2=Vector2(21,16)
	func _draw() -> void:
		var finish=load("res://character_sheet/header_finish.gd")
		var rect=Rect2(Vector2.ZERO,get_parent().size)
		if kind==1:
			# Multi-layered outer relief drop shadow so every gilded frame lifts off the parchment.
			Paint.drop_shadow(self,rect,6,2.5)
			var inside=rect.grow(-3)
			Paint.draw_paper(self,inside,true)
			# Deep inner contact occlusion along the carved gilt frame molding.
			Paint.contact(self,inside,9,.26)
			# Fine inner engraved gold/sepia hairline inside larger panels.
			if inside.size.x>120 and inside.size.y>68:
				draw_rect(inside.grow(-5),Color("#9e7438",.26),false,1.0)
			Paint.nine(self,Art.texture("foundation/gilt.png"),rect,cap,Vector2(.19,.38),Color.WHITE,false)
			# Warm dark shadow line under the bottom gold rim & top specular highlight.
			draw_line(Vector2(rect.position.x+16,rect.position.y+1.5),Vector2(rect.end.x-16,rect.position.y+1.5),Color("#fff2c2",.36),1.0,true)
			draw_line(Vector2(rect.position.x+12,rect.end.y+1.0),Vector2(rect.end.x-12,rect.end.y+1.0),Color("#2a1408",.42),1.4,true)
		else:
			Paint.drop_shadow(self,rect,5,2.0)
			Paint.nine(self,finish.piece(kind),rect,cap,Vector2(.18,.26))

static func icon_tile(key: String,pixels: int=28) -> Control:
	var p=PanelContainer.new(); p.mouse_filter=Control.MOUSE_FILTER_IGNORE; p.custom_minimum_size=Vector2(pixels,pixels); p.size_flags_vertical=Control.SIZE_SHRINK_CENTER
	var s=StyleBoxFlat.new(); s.bg_color=Color("#2c1914"); s.border_color=Color("#ce9f48"); s.set_border_width_all(2 if pixels>=26 else 1); s.set_corner_radius_all(4); s.shadow_size=2; s.shadow_color=Color("#3a2112",.38)
	var margin=1
	for side in [SIDE_LEFT,SIDE_RIGHT,SIDE_TOP,SIDE_BOTTOM]: s.set_content_margin(side,margin)
	p.add_theme_stylebox_override("panel",s); p.add_child(image(key,pixels-margin*2)); return p

static func stripe(button: Button,index: int) -> void:
	var style=button.get_theme_stylebox("normal").duplicate(); style.bg_color=Color("#e6cc9c",.42) if index%2==0 else Color("#fff4d7",.35); button.add_theme_stylebox_override("normal",style)
