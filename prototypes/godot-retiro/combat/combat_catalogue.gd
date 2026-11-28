extends RefCounted
const Targeting = preload("res://combat/action_targeting.gd")
static var data: Dictionary={}
static var textures: Dictionary={}
static var baked: Dictionary={}
static var _prewarmed_images: Dictionary={}
const BASIC := {"dash":"Correr","disengage":"Destrabarse","dodge":"Esquivar","help":"Ayudar","hide":"Esconderse","grapple":"Agarrar","shove":"Empujar / Derribar","drink-potion":"Beber poción","stabilize":"Estabilizar","short-rest":"Descanso corto","ready":"Preparar","search":"Buscar","study":"Estudiar","influence":"Influir","use-object":"Usar objeto","improvise":"Improvisar"}
const EXPLORE := [
	{"id":"jump","label":"Saltar","explore":true,"instant":"jump","detail":"Salto acrobático [J]"},
	{"id":"talk","label":"Hablar / Interactuar","explore":true,"instant":"talk","detail":"Hablar con un PNJ cercano o el grupo [T]"},
	{"id":"torch","label":"Antorcha","explore":true,"instant":"torch","detail":"Encender o apagar la antorcha [V]"},
	{"id":"stealth","label":"Sigilo","explore":true,"instant":"stealth","detail":"Agacharse en modo sigilo [Ctrl]"},
	{"id":"sit","label":"Sentarse","explore":true,"instant":"sit","detail":"Sentarse o levantarse [Z]"},
	{"id":"prone","label":"Tumbarse","explore":true,"instant":"prone","detail":"Tumbarse o incorporarse [X]"},
	{"id":"pick-lock","label":"Forzar cerradura","basic":true,"detail":"Herramientas de ladrón / Fuerza"},
	{"id":"disarm-trap","label":"Desarmar trampa","basic":true,"detail":"Inspeccionar o inutilizar mecanismo"},
	{"id":"climb","label":"Trepar","basic":true,"detail":"Escalar superficie o cuerda"},
	{"id":"swim","label":"Nadar","basic":true,"detail":"Desplazarse por el agua"},
]
static var _tick_regex: RegEx

static func load_data() -> Dictionary:
	if data.is_empty():
		var file := FileAccess.open("res://combat/catalogue.json",FileAccess.READ)
		if file: data=JSON.parse_string(file.get_as_text())
		var prepared:=FileAccess.open("res://combat/baked-frames.json",FileAccess.READ)
		if prepared: baked=JSON.parse_string(prepared.get_as_text())
	return data

static func frame_key(frame: Dictionary) -> String:
	return JSON.stringify([frame.url,frame.get("x",0),frame.get("y",0),frame.get("width",0),frame.get("height",0),frame.get("alphaSeeds",[])]).sha256_text()

static func profile(id: String) -> Dictionary:
	if id.begins_with("zombie-"): id="zombie"
	if id=="harpy-2": id="harpy"
	var p: Dictionary=load_data().get("profiles",{}).get("c4-zombie-1" if id=="zombie" else id,{}).duplicate(true)
	if id=="zombie":
		p.ruleTraits["undeadFortitude"]=true
		p["saves"]={"con":3}
	return p

static func weapon(id: String,label: String,bonus: int,dice: String,damage_bonus: int,damage_type: String,normal: float,long_range: float=0.0,animation: String="melee") -> Dictionary:
	return {"id":id,"label":label,"attackBonus":bonus,"damageDice":dice,"damageBonus":damage_bonus,"damageType":damage_type,"range":{"kind":"melee" if normal<=1.5 else "ranged","normalMeters":normal,"longMeters":maxf(normal,long_range)},"animationType":animation}

static func actions(id: String) -> Array:
	if id.begins_with("zombie-"): id="zombie"
	if id=="harpy-2": id="harpy"
	var p := profile(id)
	var result: Array=p.get("attacks",[]).duplicate(true)
	for exploration in p.get("explorationActions",[]):
		var base_id:=str(exploration.id).trim_suffix("-exploration")
		if exploration.get("target","")=="point" and result.any(func(existing): return existing.id==base_id and existing.get("resolution","")=="guided" and existing.get("targeting","")=="point"): continue
		var action: Dictionary=exploration.duplicate(true)
		action["range"]={"kind":"ranged","normalMeters":action.get("rangeMeters",1.5)}
		action["resolution"]="guided"; action["magical"]=true
		action["targeting"]="point" if action.get("target","") in ["point","object"] else "creature"
		action["animationType"]="spell"
		result.append(action)
	# Existing Godot character sheets expose these spells explicitly. They are
	# not granted to an unconfigured web character or to a rogue subclass.
	if id=="mia":
		result=[weapon("mace","Maza",4,"1d6",2,"contundente",1.5),weapon("handaxe","Hacha de mano",4,"1d6",2,"cortante",1.5),weapon("thrown-handaxe","Lanzar hacha de mano",4,"1d6",2,"cortante",6,18,"thrownWeapon")]
		var flame:=weapon("sacred-flame","Llama sagrada",0,"1d8",0,"radiante",18,18,"magicalProjectile")
		flame["save"]={"ability":"dex","dc":13}; flame["magical"]=true; result.append(flame)
		var healing:=weapon("healing-word","Palabra de curación",0,"2d4",3,"",18,18,"spell")
		healing["automaticHit"]=true; healing["healing"]=true; healing["actionCost"]="bonus"; healing["resource"]={"id":"spell-slot-1","cost":1}; result.append(healing)
		for entry in [["bless","Bendición",9.0],["shield-of-faith","Escudo de fe",18.0]]:
			result.append({"id":entry[0],"label":entry[1],"resolution":"guided","concentration":true,"magical":true,"range":{"normalMeters":entry[2]},"resource":{"id":"spell-slot-1","cost":1},"actionCost":"bonus" if entry[0]=="shield-of-faith" else "action","guidance":"El DM confirma objetivos y efecto de la ficha; no se inventa un resultado."})
		result.append({"id":"channel-life","label":"Preservar vida · Canalizar divinidad","resolution":"guided","healing":true,"magical":true,"range":{"normalMeters":9.0},"guidance":"Canalizar divinidad: reparte hasta 5 PG en criaturas a 9 m que no superen la mitad de sus PG."})
	elif id=="maria":
		result.append({"id":"steady-aim","label":"Apuntar con calma","actionCost":"bonus","resolution":"guided","range":{"normalMeters":0.0},"guidance":"Acción adicional (sin moverte): ganas ventaja en tu próximo ataque este turno."})
	elif id=="mike":
		result=[weapon("shortsword","Espada corta",4,"1d6",2,"perforante",1.5),weapon("ray-of-frost","Rayo de escarcha",5,"1d8",0,"frío",18,18,"magicalProjectile")]
		result[1]["magical"]=true
		var missile:=weapon("magic-missile","Misil mágico",0,"1d4",1,"fuerza",36,36,"magicalProjectile")
		missile["automaticHit"]=true; missile["attackCount"]=3; missile["resource"]={"id":"spell-slot-1","cost":1}; result.append(missile)
		var burning:=weapon("burning-hands","Manos ardientes",0,"3d6",0,"fuego",4.5,4.5,"fireProjectile")
		burning["resolution"]="guided"; burning["targeting"]="point"; burning["resource"]={"id":"spell-slot-1","cost":1}; burning["magical"]=true
		burning["guidance"]="Cono de 4,5 m · DES CD 13 · daño 3d6 fuego, mitad al salvar. El DM delimita el cono, registra todos los dados físicos y aplica los PG de cada afectado antes de confirmar. Un único espacio y acción para el área."
		result.append(burning)
		result.append({"id":"shield","label":"Escudo · reacción a impacto o misil mágico","magical":true,"actionCost":"reaction","resolution":"guided","range":{"normalMeters":0.0},"resource":{"id":"spell-slot-1","cost":1},"guidance":"Reacción: el DM verifica el desencadenante y aplica +5 CA hasta el inicio de tu próximo turno."})
		result.append({"id":"detect-magic","label":"Detectar magia · ritual","castingTime":"11 minutos (ritual)","kind":"spell","resolution":"guided","magical":true,"concentration":true,"range":{"normalMeters":9.0},"guidance":"El DM confirma ritual, tiempo y auras realmente perceptibles."})
		result.append({"id":"arcane-recovery","label":"Recuperación arcana · descanso corto","resolution":"guided","range":{"normalMeters":0.0},"guidance":"Durante un descanso corto, recupera 1 espacio de conjuro de nivel 1."})
	elif id=="zombie" and result.is_empty():
		result=[weapon("zombie-slam","Golpe",3,"1d6",1,"contundente",1.5)]
	elif id=="harpy":
		var multi: Dictionary=result[0].duplicate(true); multi.id="harpy-multiattack"; multi.label="Multiataque · garras y después porra"; multi.attackCount=2; multi.followUpActionId="harpy-club"; result.insert(0,multi)
		result.append({"id":"harpy-song","label":"Canto cautivador · SAB CD 11 · 90 m","magical":true,"resolution":"guided","targeting":"point","range":{"normalMeters":90},"guidance":"Canto cautivador: el DM comprueba audición y objetivos, registra las salvaciones físicas SAB CD 11 y la condición que corresponda. Se confirma después de todos los dados."})
	for action in result: action["target_mode"]=Targeting.mode(action)
	return result

static func icon(id: String) -> Texture2D:
	var key := id.trim_suffix("-exploration")
	key={
		"weapons":"attacks","cantrips":"cat-cantrips","spells":"spells","other":"actions",
		"explore":"cat-explore","withdraw":"withdraw","shove":"shove-action",
		"talk":"message","torch":"light","sit":"sit","prone":"feign-death","stealth":"stealth",
		"channel-life":"channel-life","stabilize":"stabilize","short-rest":"catnap",
		"pick-lock":"pick-lock","disarm-trap":"disarm-trap",
		"climb":"climb","swim":"swim","jump":"jump","drink-potion":"drink-potion",
		"end-turn":"end-turn","end-concentration":"dispel-magic"
	}.get(key,key)
	var icons: Dictionary=load_data().get("icons",{})
	var direct := "res://combat/icons/%s.svg" % key
	if FileAccess.file_exists(direct):
		icons = icons.duplicate()
		icons[key] = direct
	elif not icons.has(key):
		key="actions" if (key in BASIC or key in ["talk","torch","sit","prone","stealth"]) else "spells"
	if textures.has(key): return textures[key]
	var path: String=icons.get(key,"")
	if path.is_empty() or not FileAccess.file_exists(path): return null
	var svg := FileAccess.get_file_as_string(path)
	if _tick_regex == null:
		_tick_regex = RegEx.new()
		_tick_regex.compile("<path[^>]*\\bd=\"M[^\"]*\\b25[vV]2\"[^>]*/>")
	svg = _tick_regex.sub(svg, "", true)
	svg = svg.replace("viewBox=\"0 0 24 28\"", "viewBox=\"0 0 24 24\"")
	svg = svg.replace("stroke-width=\"1.55\"", "stroke-width=\"1.85\"")
	var image := Image.new()
	if image.load_svg_from_string(svg, 3.0) != OK: return null
	# Normalize every icon onto an identical 72x72 canvas so all medallions have matching visual scale.
	var canvas := Image.create(72, 72, false, Image.FORMAT_RGBA8)
	canvas.fill(Color(0, 0, 0, 0))
	var used := image.get_used_rect()
	if used.size.x > 0 and used.size.y > 0:
		var cropped := image.get_region(used)
		var fit_s := 52.0 / float(maxi(cropped.get_width(), cropped.get_height()))
		var tw := maxi(1, roundi(cropped.get_width() * fit_s))
		var th := maxi(1, roundi(cropped.get_height() * fit_s))
		cropped.resize(tw, th, Image.INTERPOLATE_BILINEAR)
		canvas.blit_rect(cropped, Rect2i(0, 0, tw, th), Vector2i((72 - tw) / 2, (72 - th) / 2))
	textures[key]=ImageTexture.create_from_image(canvas)
	return textures[key]

static func collect_cpu_images(keys: Array, combat_data: Dictionary, baked_map: Dictionary, res_root_abs: String) -> Dictionary:
	var frames_root: Dictionary = combat_data.get("frames", {})
	var target_tokens: Array = []
	for k in keys:
		if k == "rogue": target_tokens.append(["rogue", ["help","influence","hit-physical","hit-fire","hit-arcane","disengage","use-torch"]])
		elif k == "silverfarben": target_tokens.append(["silverfarben-hotel", []])
		elif k == "anteros": target_tokens.append(["anteros", []])
	var images: Dictionary = {}
	var out: Dictionary = {}
	var iso_script = preload("res://scripts/character_sprite_catalog.gd")
	for pair in target_tokens:
		var states: Dictionary = frames_root.get(pair[0], {})
		var only_states: Array = pair[1]
		for state in states:
			if not only_states.is_empty() and state not in only_states: continue
			for f in states[state].get("frames", []):
				var key := frame_key(f)
				if textures.has(key) or _prewarmed_images.has(key) or out.has(key): continue
				if baked_map.has(key):
					var b_abs: String = res_root_abs.path_join(str(baked_map[key]).trim_prefix("res://"))
					if FileAccess.file_exists(b_abs):
						var prep := Image.load_from_file(b_abs)
						if prep != null and not prep.is_empty():
							prep.generate_mipmaps()
							out[key] = prep
						continue
				var path: String = f.url
				var p_abs: String = res_root_abs.path_join(path.trim_prefix("res://"))
				if not images.has(path):
					images[path] = Image.load_from_file(p_abs) if FileAccess.file_exists(p_abs) else null
				var image: Image = images[path]
				if image == null or image.is_empty(): continue
				var crop := Rect2i(int(f.get("x",0)),int(f.get("y",0)),int(f.get("width",image.get_width())),int(f.get("height",image.get_height())))
				var isolated: Image = image.get_region(crop)
				if f.has("alphaSeeds") and not f.alphaSeeds.is_empty():
					var seed: Array = f.alphaSeeds[0]
					isolated = iso_script._isolate_rgba_crop(image, crop, Vector2i(int(seed[0]), int(seed[1])))
				var bounds := isolated.get_used_rect()
				if bounds.size.x < 1 or bounds.size.y < 1: continue
				var trimmed: Image = isolated.get_region(bounds)
				trimmed.generate_mipmaps()
				out[key] = trimmed
	return out

static func apply_cpu_images(imgs: Dictionary) -> void:
	for k in imgs:
		if not textures.has(k):
			_prewarmed_images[k] = imgs[k]

static func _make_combat_tex(img: Image) -> ImageTexture:
	if img.get_height() > 280:
		var scale := 280.0 / float(img.get_height())
		img = img.duplicate()
		img.resize(maxi(4, int(round(img.get_width() * scale))), 280, Image.INTERPOLATE_BILINEAR)
		img.fix_alpha_edges()
	if not img.has_mipmaps():
		img.generate_mipmaps()
	return ImageTexture.create_from_image(img)

static func sprite_profile(token_id: String,only_states: Array=[]) -> Dictionary:
	var states: Dictionary=load_data().get("frames",{}).get(token_id,{})
	var result := {"dir_idle":{},"dir_walk":{},"dir_run":{},"dir_attack":{},"clips":{},"sneak_fx":[]}
	var aliases := {"moving":"walk","running":"run","combat-idle":"combat_idle","attack-arrow":"attack_arrow","attack-throw":"attack_throw","swimming":"swim","stealth":"stealth"}
	var images: Dictionary={}
	for state in states:
		if not only_states.is_empty() and state not in only_states: continue
		var entry: Dictionary=states[state]
		var frames: Array=[]
		for f in entry.get("frames",[]):
			var key:=frame_key(f)
			if textures.has(key):
				frames.append({"tex":textures[key],"height_scale":float(f.get("logicalHeight",92.0))/92.0,"flip_h":entry.get("flipX",false)}); continue
			if _prewarmed_images.has(key):
				var pre_img: Image = _prewarmed_images[key]
				_prewarmed_images.erase(key)
				textures[key] = _make_combat_tex(pre_img)
				frames.append({"tex":textures[key],"height_scale":float(f.get("logicalHeight",92.0))/92.0,"flip_h":entry.get("flipX",false)}); continue
			var path: String=f.url
			if baked.has(key) and FileAccess.file_exists(str(baked[key])):
				var prepared:=Image.load_from_file(ProjectSettings.globalize_path(str(baked[key])))
				textures[key]=_make_combat_tex(prepared)
				frames.append({"tex":textures[key],"height_scale":float(f.get("logicalHeight",92.0))/92.0,"flip_h":entry.get("flipX",false)}); continue
			if not images.has(path): images[path]=Image.load_from_file(ProjectSettings.globalize_path(path))
			var image: Image=images[path]
			if image==null or image.is_empty(): continue
			var crop := Rect2i(int(f.get("x",0)),int(f.get("y",0)),int(f.get("width",image.get_width())),int(f.get("height",image.get_height())))
			var isolated: Image=image.get_region(crop)
			if f.has("alphaSeeds") and not f.alphaSeeds.is_empty():
				var seed: Array=f.alphaSeeds[0]
				isolated=preload("res://scripts/character_sprite_catalog.gd")._isolate_rgba_crop(image,crop,Vector2i(int(seed[0]),int(seed[1])))
			var bounds := isolated.get_used_rect()
			if bounds.size.x<1 or bounds.size.y<1: continue
			var trimmed: Image=isolated.get_region(bounds)
			textures[key]=_make_combat_tex(trimmed)
			frames.append({"tex":textures[key],"height_scale":float(f.get("logicalHeight",92.0))/92.0,"flip_h":entry.get("flipX",false)})
		if frames.is_empty(): continue
		var clip := {"frames":frames,"fps":float(entry.get("fps",8)),"loop":state in ["idle","moving","running","combat-idle"]}
		var key: String=aliases.get(state,state.replace("-","_"))
		result.clips[key]=clip
		for mapping in [["direction-","dir_idle"],["moving-","dir_walk"],["running-","dir_run"],["attack-","dir_attack"]]:
			if state.begins_with(mapping[0]) and state.trim_prefix(mapping[0]) in ["n","ne","e","se","s","sw","w","nw"]: result[mapping[1]][state.trim_prefix(mapping[0])]=clip
	if token_id=="anteros" and result.clips.has("prone"): result.clips["defeated"]=result.clips.prone
	return result
