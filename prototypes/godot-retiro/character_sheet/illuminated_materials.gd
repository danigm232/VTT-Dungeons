extends RefCounted
## Reusable painted component assets. Native controls own all data, lettering and hit areas.
const Art=preload("res://character_sheet/skin.gd")
static var cache: Dictionary={}
static func region(file: String,index: int=0,cols: int=1,rows: int=1) -> Texture2D:
	var key=file+str([index,cols,rows])
	if not cache.has(key):
		var atlas=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v4/"+file))
		cache[key]=Art._atlas_region(atlas,index,cols,rows)
	return cache[key]
static func icon(key: String) -> Texture2D:
	var specific=preload("res://character_sheet/action_icons.gd").PAINTED.find(key)
	if specific>=0: return v5_region("action-icons.png",specific,4,3)
	var keys=["heart","shield","speed","initiative","star","hand","dexterity","book","eye","history","feather","magic","casting","die","leaf"]
	return region("illustrated-icons.png",keys.find(key),5,3) if key in keys else Art.icon(key)
static func v5_region(file: String,index: int=0,cols: int=1,rows: int=1) -> Texture2D:
	var key="v5/"+file+str([index,cols,rows])
	if not cache.has(key):
		var atlas=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v5/"+file))
		cache[key]=Art._atlas_region(atlas,index,cols,rows)
	return cache[key]
static func ink_theme(actor: Dictionary) -> String:
	var text=(str(actor.get("identity",""))+" "+str(actor.get("background",""))+" "+str(actor.get("notes",""))).to_lower()
	for pair in [["erudito","library"],["arcano","library"],["mago","library"],["enana","mountains"],["enano","mountains"],["criminal","keep"],["bosque","forest"],["marinero","coast"],["ruina","ruins"]]:
		if text.contains(pair[0]): return pair[1]
	return "coast"
class Paper extends Node2D:
	func _draw() -> void:
		var rect=Rect2(Vector2(16,16),get_parent().size-Vector2(32,32))
		draw_rect(rect,Art.IVORY)
		draw_texture_rect(Art.texture("v5/paper.png"),rect,false,Color(1,1,1,.72))
class Exterior extends Node2D:
	func _draw() -> void:
		var s=get_parent().size; var leaf=load("res://character_sheet/illuminated_materials.gd").ornament(3)
		for entry in [[Vector2(7,7),0.0],[Vector2(s.x-7,7),PI*.5],[s-Vector2(7,7),PI],[Vector2(7,s.y-7),-PI*.5]]:
			draw_set_transform(entry[0],entry[1]); draw_texture_rect(leaf,Rect2(Vector2.ZERO,Vector2(44,44)),false,Color(1,1,1,.9))
		draw_set_transform(Vector2.ZERO)
class Relief extends Node2D:
	var principal: bool=false
	func _draw() -> void:
		var s=get_parent().size
		var tex=Art.texture("v2/ornate-panel.png")
		# Nine-slice an existing carved frame; the writing area is always live paper.
		var cuts=Vector2(280,240); var extent=tex.get_size(); var cap=Vector2(10,10)
		var xx=[0.0,cap.x,s.x-cap.x,s.x]; var yy=[0.0,cap.y,s.y-cap.y,s.y]
		var sx=[0.0,cuts.x,extent.x-cuts.x,extent.x]; var sy=[0.0,cuts.y,extent.y-cuts.y,extent.y]
		for y in range(3):
			for x in range(3):
				if x==1 and y==1: continue
				draw_texture_rect_region(tex,Rect2(Vector2(xx[x],yy[y]),Vector2(xx[x+1]-xx[x],yy[y+1]-yy[y])),Rect2(Vector2(sx[x],sy[y]),Vector2(sx[x+1]-sx[x],sy[y+1]-sy[y])),Color(1,1,1,.8))
static func ornament(index: int) -> Texture2D: return region("ornaments.png",index,3,2)
static func nine(item: CanvasItem,texture: Texture2D,rect: Rect2,cap: Vector2=Vector2(24,14),edge: Vector2=Vector2(.17,.2),tint: Color=Color.WHITE,center: bool=true) -> void:
	var source=texture.get_size(); var dest=Vector2(minf(cap.x,rect.size.x*.35),minf(cap.y,rect.size.y*.45)); var cut=source*edge
	var xx=[0.0,dest.x,rect.size.x-dest.x,rect.size.x]; var yy=[0.0,dest.y,rect.size.y-dest.y,rect.size.y]
	var sx=[0.0,cut.x,source.x-cut.x,source.x]; var sy=[0.0,cut.y,source.y-cut.y,source.y]
	for y in range(3):
		for x in range(3):
			if not center and x==1 and y==1: continue
			item.draw_texture_rect_region(texture,Rect2(rect.position+Vector2(xx[x],yy[y]),Vector2(xx[x+1]-xx[x],yy[y+1]-yy[y])),Rect2(Vector2(sx[x],sy[y]),Vector2(sx[x+1]-sx[x],sy[y+1]-sy[y])),tint)
class Painted extends Node2D:
	var kind: String="plate"
	var variant: int=0
	func _draw() -> void:
		var lib=load("res://character_sheet/illuminated_materials.gd"); var s=get_parent().size
		match kind:
			"plate": lib.nine(self,lib.region("stat-plate.png"),Rect2(Vector2.ZERO,s),Vector2(23,12),Vector2(.18,.21))
			"ribbon": lib.nine(self,lib.region("ribbons.png",variant,1,3),Rect2(Vector2.ZERO,s),Vector2(26,8),Vector2(.19,.22))
			"name": lib.nine(self,lib.region("ribbons.png",1,1,3),Rect2(Vector2(-5,-1),Vector2(minf(s.x+10,430),s.y)),Vector2(28,12),Vector2(.16,.2),Color(1,1,1,.7))
			"navigation":
				var selected=bool(get_parent().get_meta("fantasy_selected",false))
				lib.nine(self,lib.region("ribbons.png",0 if selected else 2,1,3),Rect2(Vector2.ZERO,s),Vector2(14,9),Vector2(.15,.22))
				if selected:
					draw_line(Vector2(15,s.y-2),Vector2(s.x-15,s.y-2),Color("#f1cd7e"),2,true)
					var c=Vector2(s.x*.5,s.y-1)
					draw_colored_polygon(PackedVector2Array([c+Vector2(0,-4),c+Vector2(4,0),c+Vector2(0,4),c+Vector2(-4,0)]),Color("#f1cd7e"))
			"button": draw_texture_rect(lib.ornament(2),Rect2(Vector2.ZERO,s),false)
class RankSeal extends Control:
	var rank: int=-1
	func _ready() -> void:
		custom_minimum_size=Vector2(21,21); mouse_filter=Control.MOUSE_FILTER_IGNORE
		tooltip_text="Sin registrar" if rank<0 else ["Sin competencia","Competencia","Pericia"][clampi(rank,0,2)]
	func _draw() -> void:
		var center=size*.5; var r=minf(size.x,size.y)*.35
		draw_circle(center,r+2,Color("#72532f")); draw_circle(center,r,Color("#dfc590") if rank>0 else Color("#f1e0bd"))
		draw_arc(center,r+1,0,TAU,32,Color("#ba9553"),1.1,true)
		if rank<0:
			draw_line(center+Vector2(-3,2),center+Vector2(3,-3),Color("#877860"),1.2,true)
		elif rank>0:
			var points=PackedVector2Array()
			for i in range(10): points.append(center+Vector2.from_angle(-PI*.5+i*PI/5)*(r*.83 if i%2==0 else r*.36))
			draw_colored_polygon(points,Color("#795126"))
			if rank==2: draw_arc(center,r+4,0,TAU,32,Color("#b28a43"),1.2,true)
class SlotSeal extends Control:
	var filled: bool=true
	func _ready() -> void: custom_minimum_size=Vector2(20,22); mouse_filter=Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		var center=size*.5; var p=PackedVector2Array([center+Vector2(0,-9),center+Vector2(7,0),center+Vector2(0,9),center+Vector2(-7,0)])
		draw_colored_polygon(p,Color("#a8813d") if filled else Color("#e6d2ab")); p.append(p[0]); draw_polyline(p,Color("#7c5b2f"),1,true)
		if filled: draw_line(center+Vector2(-2,-4),center+Vector2(1,-6),Color("#f7e9b8"),1,true)
