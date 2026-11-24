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
	return Art.Symbols.icon(key)
static func v5_region(file: String,index: int=0,cols: int=1,rows: int=1) -> Texture2D:
	var key="v5/"+file+str([index,cols,rows])
	if not cache.has(key):
		var atlas=Image.load_from_file(ProjectSettings.globalize_path("res://character_sheet/art/v5/"+file))
		cache[key]=Art._atlas_region(atlas,index,cols,rows)
	return cache[key]
static func ink_theme(actor: Dictionary) -> String:
	var text=(str(actor.get("identity",""))+" "+str(actor.get("background",""))+" "+str(actor.get("notes",""))).to_lower()
	for pair in [["templo","mountains"],["clérig","mountains"],["erudito","library"],["arcano","library"],["mago","library"],["bosque","forest"],["marinero","coast"],["ruina","ruins"],["enana","mountains"],["enano","mountains"],["criminal","keep"]]:
		if text.contains(pair[0]): return pair[1]
	return "coast"
static func draw_paper(item: CanvasItem,rect: Rect2,reading: bool) -> void:
	if not rect.has_area(): return
	var paper=Art.texture("foundation/vellum.jpg")
	var sheet=item.get_parent()
	while sheet.get_parent() and str(sheet.name)!="CharacterSheetModal": sheet=sheet.get_parent()
	var extent: Vector2=sheet.size if sheet is Control else rect.size
	var offset=Vector2.ZERO
	if sheet is Control:
		offset=sheet.get_global_transform().affine_inverse()*(item.get_global_transform()*rect.position)
	var scale=minf(paper.get_width()/maxf(1,extent.x),paper.get_height()/maxf(1,extent.y))
	var origin=(paper.get_size()-extent*scale)*.5+offset*scale
	origin=origin.clamp(Vector2.ZERO,(paper.get_size()-rect.size*scale).max(Vector2.ZERO))
	item.draw_texture_rect_region(paper,rect,Rect2(origin,rect.size*scale))
	if reading: item.draw_rect(rect,Color("#fff4dc",.14))
static func contact(item: CanvasItem,rect: Rect2,depth: int=8,strength: float=.22) -> void:
	for i in range(depth):
		var inset=rect.grow(-float(i))
		if inset.size.x>1 and inset.size.y>1:
			var t=1.0-float(i)/float(depth)
			item.draw_rect(inset,Color("#472812",strength*t*t),false,1.0)
static func drop_shadow(item: CanvasItem,rect: Rect2,depth: int=6,offset_y: float=2.5) -> void:
	for i in range(depth,0,-1):
		var expand=float(i)*1.05
		var alpha=0.055*pow(1.0-float(i-1)/float(depth),1.45)
		var r=Rect2(rect.position+Vector2(-expand*.55,offset_y-expand*.25),rect.size+Vector2(expand*1.1,expand*1.15))
		item.draw_rect(r,Color("#241106",alpha),true)
class Paper extends Node2D:
	func _draw() -> void:
		var lib=load("res://character_sheet/illuminated_materials.gd")
		var host=get_parent() as Control
		if not host: return
		var s=host.size
		var rect=Rect2(Vector2(3,3),s-Vector2(6,6))
		lib.draw_paper(self,rect,false)
		# Rich antique parchment perimeter shading & aged depth.
		lib.contact(self,rect.grow(-16),24,.26)
		# Subtle darker antique-vellum frieze band behind header & stats crown.
		var crown_h=minf(206.0,s.y*.265)
		var frieze=Rect2(Vector2(20,18),Vector2(s.x-40,crown_h))
		draw_rect(frieze,Color("#5c3a1a",.095),true)
		# Delicate etched manuscript filigree rules across the frieze & bottom margin.
		var rule_ink=Color("#7a5228",.24)
		var y_div=18.0+crown_h
		draw_line(Vector2(28,y_div),Vector2(s.x-28,y_div),Color("#5a3719",.34),1.4,true)
		draw_line(Vector2(28,y_div+3),Vector2(s.x-28,y_div+3),Color("#c99e4c",.38),1.0,true)
		# Subtle corner scrollwork curls etched into the background parchment margins.
		for cx in [34.0,s.x-34.0]:
			var dir=1.0 if cx<s.x*.5 else -1.0
			draw_arc(Vector2(cx+dir*14,y_div-10),8.0,0.0,TAU,20,rule_ink,1.1,true)
			draw_arc(Vector2(cx+dir*28,y_div-7),5.0,0.0,TAU,16,rule_ink,1.0,true)
		# Faint sepia architectural watermark etching in the top-right background behind tabs/stats.
		var keep=Art.texture("foundation/ink-keep.png")
		if keep and s.x>900:
			var kw=minf(260.0,s.x*.18)
			var kh=kw*(float(keep.get_height())/maxf(1.0,float(keep.get_width())))
			draw_texture_rect(keep,Rect2(Vector2(s.x-kw-28,y_div-kh-4),Vector2(kw,kh)),false,Color("#5a3818",.26))
		# Recessed dark-walnut & brass crown housing the navigation tabs so they anchor to the outer frame!
		var tabs_node=host.get("tabs") as Control
		var close_node=host.find_child("SheetClose",true,false) as Control
		if tabs_node and tabs_node.is_visible_in_tree() and tabs_node.get_parent()==host.get("header"):
			var inv=host.get_global_transform().affine_inverse()
			var t_rect=tabs_node.get_global_rect()
			var p0=inv*t_rect.position
			var p1=inv*(close_node.get_global_rect().end if close_node and close_node.is_visible_in_tree() else t_rect.end)
			var bay=Rect2(Vector2(p0.x-10,8.0),Vector2(maxf(120.0,(s.x-8.0)-(p0.x-10)),maxf(56.0,p1.y-8.0+11.0)))
			# Soft shadow cast by the dark walnut crown onto the parchment below.
			lib.drop_shadow(self,bay,7,3.0)
			# Dark walnut & ebony carved bezel seamlessly joining the outer top-right wooden binding.
			var bevel=PackedVector2Array([
				Vector2(bay.position.x-12,bay.position.y),
				Vector2(bay.end.x,bay.position.y),
				Vector2(bay.end.x,bay.end.y),
				Vector2(bay.position.x+8,bay.end.y),
				Vector2(bay.position.x-4,bay.end.y-12)
			])
			draw_colored_polygon(bevel,Color("#24120c",.97))
			var inner_bevel=PackedVector2Array([
				Vector2(bay.position.x-7,bay.position.y+4),
				Vector2(bay.end.x-4,bay.position.y+4),
				Vector2(bay.end.x-4,bay.end.y-4),
				Vector2(bay.position.x+10,bay.end.y-4),
				Vector2(bay.position.x,bay.end.y-14)
			])
			draw_colored_polygon(inner_bevel,Color("#190b07",.90))
			bevel.append(bevel[0])
			draw_polyline(bevel,Color("#b9893d",.92),2.0,true)
			draw_line(Vector2(bay.position.x+8,bay.end.y-2),Vector2(bay.end.x-6,bay.end.y-2),Color("#e6c072",.76),1.2,true)
class Exterior extends Node2D:
	func _draw() -> void:
		var s=get_parent().size; var leaf=load("res://character_sheet/illuminated_materials.gd").ornament(3)
		for entry in [[Vector2(7,7),0.0],[Vector2(s.x-7,7),PI*.5],[s-Vector2(7,7),PI],[Vector2(7,s.y-7),-PI*.5]]:
			# Cast subtle dark relief shadow behind each gilded brass corner bracket.
			draw_set_transform(entry[0]+Vector2(1.5,2.5),entry[1]); draw_texture_rect(leaf,Rect2(Vector2.ZERO,Vector2(48,48)),false,Color("#1c0d05",.48))
			draw_set_transform(entry[0],entry[1]); draw_texture_rect(leaf,Rect2(Vector2.ZERO,Vector2(48,48)),false,Color(1,1,1,.96))
		draw_set_transform(Vector2.ZERO)
		# Sculpted golden diamond clasp at bottom-center of the outer wooden frame.
		for cy in [s.y-10.0]:
			var c=Vector2(s.x*.5,cy)
			var sh=PackedVector2Array([c+Vector2(0,-10),c+Vector2(15,2),c+Vector2(0,13),c+Vector2(-15,2)])
			draw_colored_polygon(sh,Color("#1a0c05",.55))
			var outer=PackedVector2Array([c+Vector2(0,-10),c+Vector2(14,0),c+Vector2(0,10),c+Vector2(-14,0)])
			draw_colored_polygon(outer,Color("#b78637"))
			var inner=PackedVector2Array([c+Vector2(0,-7),c+Vector2(10,0),c+Vector2(0,7),c+Vector2(-10,0)])
			draw_colored_polygon(inner,Color("#f5d68a"))
			var core=PackedVector2Array([c+Vector2(0,-4),c+Vector2(5,0),c+Vector2(0,4),c+Vector2(-5,0)])
			draw_colored_polygon(core,Color("#fff4cf"))
			outer.append(outer[0])
			draw_polyline(outer,Color("#5c3614"),1.5,true)
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
