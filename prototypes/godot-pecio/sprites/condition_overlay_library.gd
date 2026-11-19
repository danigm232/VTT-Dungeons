extends RefCounted
## Shared, vector-authored conditions. Rigs are visual anchors, never physics.
static var _data: Dictionary={}
static var _textures: Dictionary={}
static var _settings:=ConfigFile.new()
static var _settings_loaded:=false
const ORDER := ["inconsciente","petrificada","paralizada","aturdida","cegada","ensordecida","restringida","agarrada","hechizada","asustada","envenenada","incapacitada","agotamiento","derribada","invisible","oculta"]
static func data() -> Dictionary:
	if _data.is_empty(): _data=JSON.parse_string(FileAccess.get_file_as_string("res://sprites/condition-art.json"))
	return _data
static func active(actor: Dictionary) -> Array:
	var keys: Array=[]
	var immune: Array=actor.get("condition_immunities",[]).map(func(key): return str(data().aliases.get(key,key)))
	for key in actor.get("conditions",[]):
		if key in actor.get("condition_immunities",[]): continue
		var canonical: String=str(data().aliases.get(key,key))
		if canonical in immune: continue
		if data().art.has(canonical) and canonical not in keys: keys.append(canonical)
	return ORDER.filter(func(key): return key in keys)
static func rig(body: Node3D) -> Dictionary:
	var id: String=str(body.char_profile.get("condition_rig",body.char_key))
	if id.begins_with("zombie"): id="zombie"
	return data().rigs.get(id,data().rigs.humanoid)
static func frame(body: Node3D,reduced: bool) -> int:
	if reduced: return 0
	return posmod(int(float(body.get_meta("condition_clock_ms",Time.get_ticks_msec()))/float(data().frameMs)),int(data().frames))
static func actor_key(body: Node3D) -> String:
	return str(body.get_meta("combat_id",body.token_name))
static func selected_style(body: Node3D) -> String:
	if not _settings_loaded:
		_settings.load("user://condition-overlays.cfg"); _settings_loaded=true
	return str(_settings.get_value("actors",actor_key(body),"auto"))
static func select_style(body: Node3D,style: String) -> void:
	selected_style(body)
	if style!="auto" and not data().styles.has(style): return
	_settings.set_value("actors",actor_key(body),style)
	_settings.save("user://condition-overlays.cfg")
static func style_for(body: Node3D,key: String) -> String:
	var explicit: String=str(body.get_meta("condition_style_preview",selected_style(body)))
	if data().styles.has(explicit): return explicit
	var id: String=str(body.char_profile.get("condition_rig",body.char_key))
	if id.begins_with("zombie"): id="zombie"
	var assignment: Dictionary=data().assignments.get(id,data().assignments.humanoid)
	return str(assignment.get("conditions",{}).get(key,assignment.style))
static func texture(key: String,phase: int,style: String="mist") -> Texture2D:
	var id:=style+"/"+key+"/"+str(phase)
	if not _textures.has(id):
		var image:=Image.new()
		var result:=image.load_svg_from_string(str(data().art[key].variants[style][phase]))
		if result!=OK: push_error("Cannot load condition vector "+id); return null
		image.fix_alpha_edges(); image.generate_mipmaps()
		_textures[id]=ImageTexture.create_from_image(image)
	return _textures[id]
static func placement(body: Node3D,key: String) -> Dictionary:
	var profile:=rig(body)
	var silhouette: Vector2=body.get_meta("sprite_silhouette_size",Vector2(.65,1))
	var h: float=body.target_height
	var actual:=silhouette*h
	var lying: bool=silhouette.y<.60
	var anchor: String=str(data().art[key].anchor)
	var unit:=minf(h,actual.y)
	var width: float=profile.torso_width*unit
	var height: float=profile.torso_height*unit
	var center:=Vector3(0,profile.torso_y*unit,.018)
	if anchor=="head":
		width=profile.head_width*unit; height=.30*unit
		center.y=profile.head_y*unit
	elif anchor=="ground":
		width=maxf(actual.x*.9,profile.torso_width*h); height=.16*h
		center.y=.035*h
	if lying:
		width=maxf(.25*h,actual.x*(.32 if anchor=="head" else .66))
		height=maxf(.10*h,actual.y*(.70 if anchor=="head" else .90))
		center.y=actual.y*.52
		if anchor=="head": center.x=actual.x*.28*(-1 if body.sprite.flip_h else 1)
		if anchor=="ground": width=actual.x*.94; height=.10*h; center.y=.025*h
	# Use the logical jump, not the previous pose's sprite centre: a pose change
	# can update its frame before its procedural position is refreshed.
	if body.is_jumping:
		center.y+=sin(clampf(body.jump_timer/body.jump_duration,0,1)*PI)*body.jump_peak_height
	return {"position":center,"scale":Vector3(width/h,height/h,1),"anchor":anchor,"lying":lying}
