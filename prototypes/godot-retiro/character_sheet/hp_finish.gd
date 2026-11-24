extends RefCounted
const Finish=preload("res://character_sheet/header_finish.gd")
static var sprites: Array[Texture2D]=[]
class Backing extends Node2D:
	func _draw() -> void:
		var rect=Rect2(Vector2.ZERO,get_parent().size)
		Finish.Paint.drop_shadow(self,rect,7,3.0)
		Finish.Paint.nine(self,Finish.piece(0),rect,Vector2(25,14),Vector2(.18,.26))
class Heart extends TextureRect:
	var frames: Array[Texture2D]=[]
	var elapsed: float=0
	func _ready() -> void:
		var lib=load("res://character_sheet/hp_finish.gd")
		if lib.sprites.is_empty():
			var original=Finish.piece(3).get_image()
			for scale_value in [0.87,0.94,1.0,0.91,0.97,0.89]:
				var frame=Image.create(96,96,false,Image.FORMAT_RGBA8); frame.fill(Color.TRANSPARENT)
				var source=original.duplicate(); var dimensions=source.get_size(); var factor=88.0/maxf(dimensions.x,dimensions.y)*scale_value
				source.resize(maxi(1,int(dimensions.x*factor)),maxi(1,int(dimensions.y*factor)),Image.INTERPOLATE_LANCZOS)
				frame.blit_rect(source,Rect2i(Vector2i.ZERO,source.get_size()),(Vector2i(96,96)-source.get_size())/2); lib.sprites.append(ImageTexture.create_from_image(frame))
		frames.assign(lib.sprites)
		texture=frames[0]
	func _process(delta: float) -> void:
		if frames.is_empty() or not is_visible_in_tree(): return
		elapsed=fmod(elapsed+delta,1.25); texture=frames[mini(5,int(elapsed/.12))]
class LifeBar extends Node2D:
	func _draw() -> void:
		var bar=get_parent(); var r=Rect2(Vector2.ZERO,bar.size)
		var track=StyleBoxFlat.new(); track.bg_color=Color("#210306"); track.border_color=Color("#a96824"); track.set_border_width_all(1); track.set_corner_radius_all(5); draw_style_box(track,r)
		var extent=maxf(0,(r.size.x-4)*bar.ratio)
		if extent<=0: return
		var fill=StyleBoxFlat.new(); fill.bg_color=Color("#ed181c"); fill.set_corner_radius_all(3)
		draw_style_box(fill,Rect2(Vector2(2,2),Vector2(extent,maxf(1,r.size.y-4))))
		if extent>4:
			draw_line(Vector2(4,3),Vector2(extent,3),Color("#ff9b62"),1.5,true)
			draw_line(Vector2(4,r.size.y-3),Vector2(extent,r.size.y-3),Color("#96080c"),1.5,true)
