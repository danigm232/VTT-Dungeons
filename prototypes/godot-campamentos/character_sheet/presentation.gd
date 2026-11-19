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
	func _ready() -> void:
		mouse_filter=Control.MOUSE_FILTER_IGNORE
		if custom_minimum_size==Vector2.ZERO: custom_minimum_size=Vector2(72,72)
	func _draw() -> void:
		var center=size*.5; var radius=minf(size.x,size.y)*(.36 if ornate else .5)-4
		draw_circle(center,radius+4,Color("#493023")); draw_circle(center,radius+2,Color("#b68a42"))
		if texture:
			var points=PackedVector2Array(); var uvs=PackedVector2Array()
			for i in range(64):
				var v=Vector2.from_angle(TAU*i/64); points.append(center+v*(radius-2)); uvs.append(Vector2(.51,.34)+v*.30 if closeup else Vector2(.5,.45)+v*.44 if ornate else Vector2(.5,.5)+v*.5)
			draw_polygon(points,PackedColorArray([Color.WHITE]),uvs,texture)
		draw_arc(center,radius-1,0,TAU,64,Color("#eed39b"),1.5,true)
		for a in [0.0,PI*.5,PI,PI*1.5]:
			var p=center+Vector2.from_angle(a)*(radius+2)
			draw_colored_polygon(PackedVector2Array([p+Vector2(0,-3),p+Vector2(3,0),p+Vector2(0,3),p+Vector2(-3,0)]),Color("#e1b965"))
		if ornate: draw_texture_rect(Paint.ornament(0),Rect2((size-Vector2.ONE*minf(size.x,size.y))*.5,Vector2.ONE*minf(size.x,size.y)),false)
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
			var radius=Vector2(size.x*(.24-layer*.018),size.y*(.026-layer*.002))
			var ellipse=PackedVector2Array()
			for i in range(40): ellipse.append(Vector2(size.x*.5,size.y*.865)+Vector2(cos(TAU*i/40),sin(TAU*i/40))*radius)
			draw_colored_polygon(ellipse,Color(.09,.065,.04,.055))
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
