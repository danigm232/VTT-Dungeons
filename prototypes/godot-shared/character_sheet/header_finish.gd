extends RefCounted
## Native text and input over alpha-trimmed UI atlas regions. Character art is unchanged.
const Art=preload("res://character_sheet/skin.gd")
const Paint=preload("res://character_sheet/illuminated_materials.gd")
const W=preload("res://character_sheet/sheet_widgets.gd")
static var pieces: Array[Texture2D]=[]
static func piece(index: int) -> Texture2D:
	if pieces.is_empty():
		var source=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v7/royal-controls.png"))
		for i in range(4):
			pieces.append(Art._atlas_region(source,i,2,2))
	return pieces[index]
class Plate extends Node2D:
	var index: int=1
	func _draw() -> void:
		var rect=Rect2(Vector2.ZERO,get_parent().size)
		Paint.drop_shadow(self,rect,7,3.0)
		var inside=rect.grow(-3)
		Paint.draw_paper(self,inside,true)
		Paint.contact(self,inside,10,.28)
		Paint.nine(self,Art.texture("foundation/gilt.png"),rect,Vector2(27,14),Vector2(.19,.38),Color.WHITE,false)
		# Delicate engraved inner scroll rule and right-side filigree ornament on the name cartouche.
		draw_rect(inside.grow(-5),Color("#9c7236",.28),false,1.0)
		if rect.size.x>250:
			draw_texture_rect(Paint.ornament(4),Rect2(Vector2(rect.size.x-132,14),Vector2(66,18)),false,Color("#9b6f2f",.62))
		draw_line(Vector2(16,rect.size.y+1.0),Vector2(rect.size.x-16,rect.size.y+1.0),Color("#2b1508",.44),1.5,true)
class TabArt extends Node2D:
	func _draw() -> void:
		var b=get_parent(); var s=b.size; var selected=bool(b.get_meta("fantasy_selected",false))
		var lib=load("res://character_sheet/header_finish.gd")
		var tint=Color.WHITE if selected or b.is_hovered() else Color(.90,.85,.78)
		if b.disabled: tint=Color(.58,.52,.45,.83)
		var tab_rect=Rect2(Vector2(0,0 if selected else 4),s-Vector2(0,2 if selected else 6))
		if selected:
			Paint.drop_shadow(self,tab_rect,5,2.5)
		Paint.nine(self,lib.piece(0 if selected else 2),tab_rect,Vector2(16,10),Vector2(.18,.28),tint)
		if selected:
			draw_line(Vector2(14,2),Vector2(s.x-14,2),Color("#ffecb5",.62),1.2,true)
			var c=Vector2(s.x*.5,s.y-1)
			draw_colored_polygon(PackedVector2Array([c+Vector2(0,-6),c+Vector2(6,0),c+Vector2(0,6),c+Vector2(-6,0)]),Color("#f8d78e"))
			draw_colored_polygon(PackedVector2Array([c+Vector2(0,-3),c+Vector2(3,0),c+Vector2(0,3),c+Vector2(-3,0)]),Color("#fff5d2"))
static func navigation(text: String,selected: bool=false) -> Button:
	var b=Art.Native.HintButton.new(); b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS; b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_font_override("font",W.font(true)); b.add_theme_font_size_override("font_size",18)
	for state in ["normal","hover","pressed","disabled","focus"]:
		var style=StyleBoxFlat.new(); style.bg_color=Color.TRANSPARENT
		style.content_margin_left=12; style.content_margin_right=12; style.content_margin_top=9; style.content_margin_bottom=9
		if state=="focus": style.set_border_width_all(2); style.border_color=Color("#f2d398")
		b.add_theme_stylebox_override(state,style)
		b.add_theme_color_override("font_"+state+"_color",Color("#fff0cd"))
	b.add_theme_color_override("font_color",Color("#fff0cd")); b.add_theme_color_override("font_shadow_color",Color("#160605")); b.add_theme_constant_override("shadow_offset_y",1)
	b.add_theme_color_override("icon_normal_color",Color("#f5cd80"))
	b.set_meta("fantasy_selected",selected)
	var paint=TabArt.new(); paint.show_behind_parent=true; b.add_child(paint)
	b.draw.connect(paint.queue_redraw)
	b.resized.connect(paint.queue_redraw); b.mouse_entered.connect(paint.queue_redraw); b.mouse_exited.connect(paint.queue_redraw)
	return b
