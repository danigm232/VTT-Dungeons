extends RefCounted
const Art=preload("res://character_sheet/skin.gd")
const Paint=preload("res://character_sheet/illuminated_materials.gd")
## Decorative UI themes are tied to registered identity, never added to world lore or rules.
const PROFILES={
	"mia":{"portrait":"v2/mia-portrait.png","stage":"v2/mia-stage.png","theme":"devotion","label":"Piedra y devoción"},
	"maria":{"portrait":"v2/maria-portrait.png","stage":"v2/maria-stage.png","theme":"street","label":"Calles y secretos"},
	"mike":{"portrait":"v2/mike-portrait.png","stage":"v2/mike-stage.png","theme":"arcane","label":"Estudio arcano"}
}
static func profile(id: String) -> Dictionary: return PROFILES.get(id,{"stage":"empty-alcove.png","theme":"devotion","label":"El aventurero"})
static func portrait(actor: Dictionary,body: Node3D=null) -> Texture2D:
	if body and body.has_meta("appearance_portrait") and body.get_meta("appearance_portrait") is Texture2D: return body.get_meta("appearance_portrait")
	var p=profile(str(actor.get("id","")))
	if p.has("portrait"): return Art.texture(p.portrait)
	if body and body.get("sprite") and body.sprite.texture: return body.sprite.texture
	return null
class Medallion extends Control:
	var texture: Texture2D
	var ornate: bool=false
	var closeup: bool=false
	var overhang: Vector2=Vector2.ZERO
	func _ready() -> void:
		mouse_filter=Control.MOUSE_FILTER_IGNORE
		clip_contents=false
		if custom_minimum_size==Vector2.ZERO: custom_minimum_size=Vector2(72,72)
	func _draw() -> void:
		var draw_size=size+(Vector2(20,20) if ornate else Vector2.ZERO)
		var center=size*.5+overhang
		var radius=minf(draw_size.x,draw_size.y)*(.38 if ornate else .5)-4
		# Rich multi-layered drop shadow so the circular portrait proudly floats over the corner & name scroll.
		if ornate:
			for sh in range(6,0,-1):
				draw_circle(center+Vector2(2.0,3.5),radius+4.0+float(sh)*1.6,Color("#180a04",0.075*(1.0-float(sh-1)/6.0)))
		draw_circle(center,radius+5,Color("#351d10")); draw_circle(center,radius+3,Color("#b88838")); draw_circle(center,radius+1,Color("#e8c373"))
		if texture:
			var points=PackedVector2Array(); var uvs=PackedVector2Array()
			for i in range(64):
				var v=Vector2.from_angle(TAU*i/64); points.append(center+v*(radius-1.5)); uvs.append(Vector2(.51,.34)+v*.30 if closeup else Vector2(.5,.45)+v*.44 if ornate else Vector2(.5,.5)+v*.5)
			draw_polygon(points,PackedColorArray([Color.WHITE]),uvs,texture)
		# Inner shadow rim inside portrait glass + crisp gilded inner ring.
		draw_arc(center,radius-2.0,0,TAU,64,Color("#241106",.38),2.5,true)
		draw_arc(center,radius-0.5,0,TAU,64,Color("#f5dca1"),1.8,true)
		if ornate:
			var ring_span=minf(draw_size.x,draw_size.y)*1.04
			draw_texture_rect(Paint.ornament(0),Rect2(center-Vector2.ONE*(ring_span*.5),Vector2.ONE*ring_span),false)
			# Iconic bottom & top sculpted compass-diamond stars (matching reference Image 1).
			for star_spec in [[PI*.5,13.5,8.5],[PI*1.5,8.5,5.5]]:
				var p=center+Vector2.from_angle(star_spec[0])*(radius+3.5)
				var r_maj: float=star_spec[1]; var r_min: float=star_spec[2]
				var sh_star=PackedVector2Array([p+Vector2(1,2-r_maj),p+Vector2(1+r_min,2),p+Vector2(1,2+r_maj),p+Vector2(1-r_min,2)])
				draw_colored_polygon(sh_star,Color("#1a0a04",.52))
				var s_out=PackedVector2Array([p+Vector2(0,-r_maj),p+Vector2(r_min,0),p+Vector2(0,r_maj),p+Vector2(-r_min,0)])
				draw_colored_polygon(s_out,Color("#b5812f"))
				var s_mid=PackedVector2Array([p+Vector2(0,-r_maj*.72),p+Vector2(r_min*.72,0),p+Vector2(0,r_maj*.72),p+Vector2(-r_min*.72,0)])
				draw_colored_polygon(s_mid,Color("#f5d484"))
				var s_hi=PackedVector2Array([p+Vector2(0,-r_maj*.4),p+Vector2(r_min*.38,0),p+Vector2(0,r_maj*.25),p+Vector2(-r_min*.38,0)])
				draw_colored_polygon(s_hi,Color("#fff6d4"))
				s_out.append(s_out[0]); draw_polyline(s_out,Color("#543111"),1.3,true)
		else:
			for a in [0.0,PI*.5,PI,PI*1.5]:
				var p=center+Vector2.from_angle(a)*(radius+2)
				draw_colored_polygon(PackedVector2Array([p+Vector2(0,-3),p+Vector2(3,0),p+Vector2(0,3),p+Vector2(-3,0)]),Color("#e1b965"))
class Stage extends Control:
	var ui
	var stage_profile: Dictionary={}
	var phase: float=0
	var actor_view
	var motes
	var background: Texture2D
	var frame: Texture2D
	func setup(owner_ui,actor: Dictionary) -> void:
		name="CharacterStage"
		ui=owner_ui; stage_profile=load("res://character_sheet/presentation.gd").profile(str(actor.get("id","")))
		custom_minimum_size=Vector2(212,318); mouse_filter=Control.MOUSE_FILTER_IGNORE
		background=Art.texture(stage_profile.stage); frame=Art.texture("v5/arch-frame.png")
		actor_view=load("res://character_sheet/live_actor_view.gd").new(); actor_view.name="SheetLiveActor"; actor_view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); add_child(actor_view); actor_view.bind(ui.get_active_token_node())
		var mask=ShaderMaterial.new(); mask.shader=preload("res://character_sheet/arched_preview.gdshader"); actor_view.material=mask
		motes=Motes.new(); motes.host=self; motes.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); motes.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(motes)
		var rim=ArchRim.new(); rim.host=self; rim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); add_child(rim)
		resized.connect(func(): queue_redraw(); rim.queue_redraw())
	func _draw() -> void:
		if not background: return
		# The backdrop itself has an arched silhouette, not a rectangular image of an arch.
		var points=PackedVector2Array(); var uv=PackedVector2Array()
		for i in range(49):
			var a=PI+PI*i/48; var point=Vector2(.5+cos(a)*.465,.31+sin(a)*.285)
			points.append(point*size); uv.append(point)
		for point in [Vector2(.965,.974),Vector2(.035,.974)]: points.append(point*size); uv.append(point)
		draw_polygon(points,PackedColorArray([Color("#e2d4c1")]),uv,background)
		# A soft contact shadow rests on the painted platform at the same feet anchor.
		for layer in range(8):
			var radius=Vector2(size.x*(.26-layer*.020),size.y*(.025-layer*.002))
			var ellipse=PackedVector2Array()
			for i in range(40): ellipse.append(Vector2(size.x*.5,size.y*.865)+Vector2(cos(TAU*i/40),sin(TAU*i/40))*radius)
			draw_colored_polygon(ellipse,Color(.09,.065,.04,.075))
	func _process(delta: float) -> void:
		if not is_visible_in_tree(): return
		if ui.preferences and ui.preferences.values.reducedMotion: phase=0
		else: phase+=delta
		motes.queue_redraw()
class ArchRim extends Control:
	var host
	func _ready() -> void: mouse_filter=Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		if host and host.frame: draw_texture_rect(host.frame,Rect2(Vector2.ZERO,size),false)
class Motes extends Control:
	var host
	func _draw() -> void:
		if not host: return
		var t=host.phase; var kind=str(host.stage_profile.get("theme","devotion"))
		for i in range(9):
			var v=fmod(t*(.10+i*.004)+i*.123,1.0); var alpha=sin(v*PI)*.6
			var x=(.1+.8*(.5+.5*sin(i*5.1+t*.3)))*size.x
			var y=(.85-v*.65)*size.y
			if kind=="devotion":
				x=(.12 if i%2==0 else .88)*size.x+sin(t*2+i)*5
				draw_circle(Vector2(x,y),1.2,Color(1,.7,.24,alpha))
			elif kind=="street":
				var p=Vector2(x,y); draw_colored_polygon(PackedVector2Array([p+Vector2(-3,0),p+Vector2(0,-2),p+Vector2(3,0),p+Vector2(0,2)]),Color(.61,.68,.34,alpha))
			else:
				draw_circle(Vector2(x,y),1.6,Color(.5,.8,1,alpha)); draw_arc(Vector2(x,y),3,0,TAU,12,Color(.54,.8,1,alpha*.2),1,true)
