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
		var lib=load("res://character_sheet/header_finish.gd")
		Paint.nine(self,lib.piece(index),Rect2(Vector2.ZERO,get_parent().size),Vector2(27,14),Vector2(.18,.26))
class TabArt extends Node2D:
	func _draw() -> void:
		var b=get_parent(); var s=b.size; var selected=bool(b.get_meta("fantasy_selected",false))
		var lib=load("res://character_sheet/header_finish.gd")
		var tint=Color.WHITE if selected or b.is_hovered() else Color(.78,.73,.67)
		Paint.nine(self,lib.piece(0 if selected else 2),Rect2(Vector2(0,0 if selected else 3),s-Vector2(0,3 if selected else 6)),Vector2(16,10),Vector2(.18,.28),tint)
		if selected:
			var c=Vector2(s.x*.5,s.y-1)
			draw_colored_polygon(PackedVector2Array([c+Vector2(0,-5),c+Vector2(5,0),c+Vector2(0,5),c+Vector2(-5,0)]),Color("#f6d18b"))
static func navigation(text: String,selected: bool=false) -> Button:
	var b=Button.new(); b.text=text; b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
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
	b.resized.connect(paint.queue_redraw); b.mouse_entered.connect(paint.queue_redraw); b.mouse_exited.connect(paint.queue_redraw)
	return b
