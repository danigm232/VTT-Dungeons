extends Control
## One native 2D renderer for all skill definitions; original VTT atlas poses.
var data: Dictionary = {}
var session
var scene: Dictionary = {}
var atlases: Array = []
var plates: Dictionary = {}
var ground_contacts: Dictionary = {}
var clock: float = 0.0
var progress: float = 0.0
var phase: String = "ambient"
var success: bool = false
var height: float = 85.0
var base := Transform2D.IDENTITY
var current := Transform2D.IDENTITY
var font: Font = ThemeDB.fallback_font
var role_clocks: Dictionary = {}
var reduced: bool = false
var override_elapsed: float = -1.0

func configure(catalog: Dictionary, model) -> void:
	data = catalog
	session = model
	var contacts = JSON.parse_string(FileAccess.get_file_as_string("res://loading/ground_contacts.json"))
	ground_contacts = contacts.get("frames", {}) if contacts is Dictionary else {}
	load_art()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var serif := SystemFont.new()
	serif.font_names = PackedStringArray(["Georgia", "Liberation Serif", "serif"])
	font = serif

func load_art() -> void:
	if not atlases.is_empty(): return
	for i in range(int(data.atlasCount)): atlases.append(load("res://loading/art/atlas-%d.webp" % i))
	plates.floor = load("res://loading/art/floor.webp")
	plates.chasm = load("res://loading/art/chasm.webp")

func release_art() -> void:
	atlases.clear()
	plates.clear()

func _process(delta: float) -> void:
	if not reduced: clock += delta
	queue_redraw()

func _transform(pos: Vector2, tilt: float = 0, scale: Vector2 = Vector2.ONE) -> void:
	current = base * Transform2D(tilt, scale, 0.0, pos)
	draw_set_transform_matrix(current)

func _frame(id: int, scale: float, center: bool = false, tint: Color = Color.WHITE, flatten: float = 1.0) -> void:
	var f = data.frames[id]
	var origin = Vector2(-float(f.width) * 0.5 if center else -float(f.pivot), -float(f.height) * 0.5 if center else -float(f.floor)) * scale
	var size = Vector2(f.width, f.height) * scale
	origin.y *= flatten
	size.y *= flatten
	var r = f.region
	draw_texture_rect_region(atlases[int(f.atlas)], Rect2(origin, size), Rect2(r[0], r[1], r[2], r[3]), tint)

func _cell(group: String, index: int, scale: float, center: bool = false, tint: Color = Color.WHITE) -> void:
	_frame(int(data.groups[group].frames[index]), scale, center, tint)

func _shadow(pos: Vector2, width: float, opacity: float = 1.0) -> void:
	_transform(pos, 0, Vector2(width, 4))
	for i in range(5, 0, -1): draw_circle(Vector2.ZERO, float(i) / 5.0, Color(0.015, 0.035, 0.04, 0.045 * opacity))

static func sample(track: Array, at: float) -> Dictionary:
	var defaults = {"x": 0.0, "y": 0.0, "tilt": 0.0, "scale": 1.0, "opacity": 1.0, "cue": 0.0, "facing": 1.0}
	if track.is_empty(): return defaults
	var a: Dictionary = track[0][1]
	var b: Dictionary = a
	var mix: float = 0.0
	for i in range(1, track.size()):
		if at < float(track[i][0]):
			a = track[i - 1][1]
			b = track[i][1]
			mix = smoothstep(float(track[i - 1][0]), float(track[i][0]), at)
			break
		a = track[i][1]
		b = a
	var result = {}
	for key in defaults: result[key] = lerpf(float(a.get(key, defaults[key])), float(b.get(key, defaults[key])), mix) if key != "facing" else float(a.get(key, 1) if mix < 0.5 else b.get(key, 1))
	return result

func _motion(prop: Dictionary, action: String) -> Dictionary:
	var idle = sample(prop.get("ambient", []), fmod(clock / 3.2, 1.0) if not reduced else 0.0)
	if phase in ["ambient", "roll"]: return idle
	var track = prop.get(action, [])
	if track.is_empty(): return idle
	# Preparation blends into the first action key, never into the middle of a jump.
	var target = sample(track, 0.0 if phase == "prepare" else progress)
	if phase == "prepare":
		for key in target: target[key] = lerpf(idle[key], target[key], progress) if key != "facing" else target[key]
	return target

func _set_phase(character: String) -> float:
	phase = "ambient"
	progress = 0
	success = session.success(character, int(scene.defaultDC))
	var action = scene.successAnimation if success else scene.failureAnimation
	var rolled = session.entry.rolls.get(character, {})
	if rolled.is_empty(): return -1.0
	var start = session.entry.resolved if session.entry.mode == "contest" else rolled.at
	if int(start) < 0: return -1.0
	var elapsed = override_elapsed if override_elapsed >= 0 else (Time.get_ticks_msec() - int(start)) / 1000.0
	if elapsed < 1.2:
		phase = "roll"
	elif elapsed < 1.6:
		phase = "prepare"
		progress = (elapsed - 1.2) / 0.4
	else:
		phase = "success" if success else "failure"
		progress = clampf((elapsed - 1.6) / (float(action.get("durationMs", 3800)) / 1000.0), 0, 1)
		if progress >= 1: phase = "settledSuccess" if success else "settledFailure"
		if reduced: progress = 1
	return elapsed

func _selection(character: String) -> Dictionary:
	var config = data.actors[character].scenes[scene.id]
	if phase in ["success", "failure"]: return config[phase][clampi(int(progress * 128), 0, 128)]
	return config.get("ambient" if phase == "roll" else phase, config.ambient)

static func playback_frame(count: int, fps: float, elapsed: float, looped: bool, pose: float = -1.0) -> int:
	if count < 1: return 0
	if pose >= 0: return clampi(int(pose * count), 0, count - 1)
	var index = int(maxf(0, elapsed) * fps)
	return index % count if looped else mini(count - 1, index)

func _contact_shadows(id: int, pose: Transform2D, sprite_scale: float, opacity: float) -> bool:
	var entry: Dictionary = ground_contacts.get(str(id), {})
	if entry.is_empty(): return false
	var frame = data.frames[id]
	# A repacked atlas must regenerate its measured supports.
	if entry.region != [frame.atlas, frame.region[0], frame.region[1], frame.region[2], frame.region[3]]: return false
	for point in entry.points:
		var contact := pose * (Vector2(point[0], point[1]) * sprite_scale)
		_shadow(contact + Vector2(0, 0.65), maxf(9.0, float(point[2]) * sprite_scale * 0.64), opacity * 1.65)
	return true

func _actor(character: String, pos: Vector2, motion: Dictionary, selected: Dictionary = {}) -> void:
	if float(motion.opacity) <= 0.001: return
	height = float(data.actors[character].height)
	var choice = _selection(character) if selected.is_empty() else selected
	var balance_ambient = session.entry.mode == "contest" and scene.id == "acrobatics" and phase in ["ambient", "roll", "prepare"]
	if balance_ambient: choice = data.actors[character].scenes.acrobatics.success[64]
	var clip = data.selections[int(choice.clip)]
	var key = character + ":clip:" + str(choice.clip)
	if not role_clocks.has(key): role_clocks[key] = clock
	var time = clock - float(role_clocks[key])
	var index = playback_frame(clip.frames.size(), 3.0 if balance_ambient else float(clip.fps), time, bool(clip.loop), float(choice.get("pose", -1)))
	if reduced: index = clip.frames.size() - 1 if choice.has("pose") else 0
	var scale = height / float(clip.referenceHeight)
	var breath = 1.0 if choice.role in ["run_loop", "walk_loop", "sneak_loop", "jump", "slip"] or reduced else 1.0 + sin(clock * 2.7) * 0.0025
	var sprite_pos := pos + Vector2(float(motion.x), float(motion.y))
	var facing := float(motion.facing) * (-1 if clip.mirror else 1)
	var sprite_size := Vector2(facing, breath) * float(motion.scale)
	var id := int(clip.frames[index])
	if clip.paired:
		var pose := Transform2D(float(motion.tilt), sprite_size, 0.0, sprite_pos)
		if not _contact_shadows(id, pose, scale, motion.opacity):
			_shadow(Vector2(sprite_pos.x, 202), height * 0.36, motion.opacity)
			_shadow(Vector2(sprite_pos.x + 60, 202), 31, motion.opacity)
	_transform(sprite_pos, float(motion.tilt), sprite_size)
	_frame(id, scale, false, Color(1, 1, 1, float(motion.opacity)))

func _draw() -> void:
	if data.is_empty() or session.entry.is_empty() or atlases.is_empty(): return
	var entry = session.entry
	for candidate in data.scenes:
		if candidate.id == entry.skill: scene = candidate; break
	if scene.is_empty(): return
	var s = minf(size.x / 1280.0, size.y / 720.0)
	var offset = (size - Vector2(1280, 720) * s) / 2
	draw_set_transform(offset, 0, Vector2.ONE * s)
	draw_rect(Rect2(Vector2.ZERO, Vector2(1280, 720)), Color("0a2024"))
	var plate = plates.chasm if scene.get("terrain", "") == "chasm" and entry.mode != "contest" else plates.floor
	draw_texture_rect(plate, Rect2(0, 0, 1280, 720), false)
	var title = scene.name
	if entry.mode == "contest": title = "Duelo de " + scene.name.to_lower()
	_text(title, 132, 46)
	var abilities = {"str": "Fuerza", "dex": "Destreza", "int": "Inteligencia", "wis": "Sabiduría", "cha": "Carisma"}
	_text(abilities[scene.ability] + (" · Tirada enfrentada" if entry.mode == "contest" else " · CD " + str(int(scene.defaultDC))), 83, 24, Color("dfbc83"))
	_text(entry.destination, 45, 14, Color("c3d1c8"))
	draw_line(Vector2(520, 186), Vector2(625, 186), Color("b79661"), 1)
	draw_line(Vector2(655, 186), Vector2(760, 186), Color("b79661"), 1)
	draw_polyline(PackedVector2Array([Vector2(640, 179), Vector2(646, 186), Vector2(640, 193), Vector2(634, 186), Vector2(640, 179)]), Color("cfad74"), 1.5, true)
	var desc = scene.description
	var participants = entry.participants
	if participants.is_empty():
		_text("Esperando a los jugadores…", 360, 24)
		draw_set_transform_matrix(Transform2D.IDENTITY)
		return
	var zoom = 2.0 if scene.get("terrain", "") == "chasm" else 1.86
	base = Transform2D(0, Vector2.ONE * s, 0, offset) * Transform2D(0, Vector2.ONE * zoom, 0, Vector2(640 - 320 * zoom, 471 - 202 * zoom))
	var character = str(participants[0])
	if not data.actors.has(character): return
	var elapsed = _set_phase(character)
	var action_key = "success" if success else "failure"
	var action = scene.successAnimation if success else scene.failureAnimation
	var movement = _motion({"ambient": scene.actor.get("ambient", []), "success": scene.successAnimation.get("actor", []), "failure": scene.failureAnimation.get("actor", [])}, action_key)
	var actor_pos = Vector2(scene.actor.x, scene.actor.y)
	height = float(data.actors[character].height)
	if scene.id == "animal-handling" and phase not in ["ambient", "roll"]: movement.x += (85 - height) * 0.35 * minf(1, progress / 0.25)
	if entry.mode == "contest":
		for i in range(participants.size()):
			character = participants[i]
			_set_phase(character)
			var pos = Vector2(245 + i * 150, 190 if scene.id == "acrobatics" else 202)
			_shadow(Vector2(pos.x, 202), 26)
			var motion = sample([], 0)
			if scene.id == "acrobatics":
				_transform(pos)
				for post in [-32, 32]: draw_line(Vector2(post, 0), Vector2(post, 12), Color("80633e"), 5)
				draw_line(Vector2(-40, 0), Vector2(40, 0), Color("d2ac78"), 3)
			_actor(character, pos, motion)
			if scene.id == "performance":
				_transform(pos + Vector2(30, -float(data.actors[character].height) * 0.8))
				draw_string(font, Vector2(0, sin(clock * 4 + i) * 4), "♪ ♫", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("dab77b"))
	else:
		if scene.id == "athletics" and (elapsed < 2.688 and not reduced): _running_floor(offset, s, elapsed)
		if scene.id == "acrobatics" and _selection(character).role in ["walk_loop", "hang"]:
			var x = actor_pos.x + movement.x
			movement.y = 169 + 6 * maxf(0, 1 - pow((x - 324) / 137, 2)) - actor_pos.y
		var clip = data.selections[int(_selection(character).clip)]
		var paired = bool(clip.paired)
		# The rear legs of the stool sit behind the front foot in the painting.
		# Place the whole pair far enough onto the stone to support both depths.
		if paired and scene.id == "medicine": actor_pos.y += 4.0
		if not paired and (not scene.has("terrain") or actor_pos.x + movement.x < 196 or actor_pos.x + movement.x > 453):
			_shadow(Vector2(actor_pos.x + movement.x, 202), float(data.actors[character].height) * 0.36, movement.opacity)
		for front in [false, true]:
			if front: _actor(character, actor_pos, movement)
			for prop in scene.props:
				if bool(prop.get("front", false)) != front: continue
				if paired and (prop.art in ["patient", "merchant"] or prop.id == "pocket-owner"): continue
				if prop.art in ["ledge-left", "ledge-right"]: continue
				_draw_prop(prop, _motion(prop, action_key), character)
	draw_set_transform(offset, 0, Vector2.ONE * s)
	if elapsed >= 1.2 and elapsed < 4.5:
		var total = entry.rolls[participants[0]].total
		var result_text = ("Éxito" if success else "Fallo") + " · " + str(total)
		if entry.mode == "contest": result_text = "%s: %d · %s: %d" % [data.actors[participants[0]].label, total, data.actors[participants[1]].label, entry.rolls[participants[1]].total]
		_text(result_text, 170, 18, Color("efcb91"))
	var caption = scene.prompt if elapsed < 1.2 else action.caption
	if entry.mode == "contest":
		caption = "Cada participante tira desde su pantalla."
		if entry.get("cancelled", false): caption = "Demostración interrumpida · Sin ganador"
		if int(entry.resolved) >= 0 and elapsed >= 1.2:
			var a = entry.rolls[participants[0]].total
			var b = entry.rolls[participants[1]].total
			caption = "Empate amistoso" if a == b else data.actors[participants[0] if a > b else participants[1]].label + " gana la demostración"
	var caption_y := 526 if scene.id in ["persuasion", "investigation"] else 514
	_wrap(caption, caption_y, 23, 1080)
	_wrap(desc, 555, 18, 900)
	draw_set_transform_matrix(Transform2D.IDENTITY)

func _text(text: String, y: float, pixels: int, color: Color = Color("f1e4c6")) -> void:
	draw_string(font, Vector2((1280 - font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, pixels).x) / 2, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, pixels, color)

func _wrap(text: String, y: float, pixels: int, width: float) -> void:
	var line = ""
	for word in text.split(" "):
		if font.get_string_size(line + word, HORIZONTAL_ALIGNMENT_LEFT, -1, pixels).x > width:
			_text(line.strip_edges(), y, pixels)
			y += pixels * 1.35
			line = ""
		line += word + " "
	_text(line.strip_edges(), y, pixels)

func _running_floor(offset: Vector2, s: float, elapsed: float) -> void:
	draw_set_transform(offset, 0, Vector2.ONE * s)
	var travel = fmod(clock * 120, 1280)
	var edge = 1280.0 if elapsed < 0 else lerpf(1280, 392, smoothstep(0, 1.6, elapsed))
	for i in range(-1, 2):
		var left = i * 1280 - travel
		var visible_width = minf(1280, edge - left)
		if visible_width > 0: draw_texture_rect_region(plates.floor, Rect2(left, 454, visible_width, 266), Rect2(0, 568, visible_width * 1.25, 332), Color(1, 1, 1, 1 - smoothstep(2.208, 2.688, maxf(0, elapsed))))

static func bandit_escape_frame(at: float) -> int:
	# The v5 escape row depicts another man. Keep the hooded bandit's own poses.
	return 14 if at < 0.35 else 15

static func prop_position(prop: Dictionary, motion: Dictionary) -> Vector2:
	var elevated = prop.art in ["crystal", "owl", "notes", "smoke", "spores", "fall-mist", "laughter", "sound", "spring", "loose-pages", "symbol-match", "rope"] or str(prop.art).begins_with("tracks-")
	# The plate's stone begins at the horizon behind the figures. Allow room
	# inside it for the farther feet of the furniture's painted perspective.
	var floor_y := 220.0 if prop.art == "table" else 216.0 if prop.art == "mechanism" else 202.0
	return Vector2(prop.x + motion.x, (prop.y if elevated else floor_y) + motion.y)

func _draw_prop(prop: Dictionary, motion: Dictionary, character: String) -> void:
	if motion.opacity < 0.001: return
	var art = str(prop.art)
	var floating = art in ["crystal", "owl", "notes", "smoke", "spores", "fall-mist", "laughter", "sound", "spring", "loose-pages", "symbol-match"]
	var pos = prop_position(prop, motion)
	if art == "crystal" and success and phase not in ["ambient", "roll", "prepare"]:
		_transform(Vector2(pos.x, 202), 0, Vector2(1, 0.16))
		for i in range(10, 0, -1): draw_circle(Vector2.ZERO, i * 8, Color(1, 0.8, 0.4, 0.012 * float(motion.cue)))
	if art == "owl":
		art = session.entry.variant
		floating = art == "owl"
		if art != "owl": pos = Vector2(prop.x + (83 * progress if success else 400 * progress), 202)
	if not floating and art not in ["rope", "horse"] and not art.begins_with("tracks-"):
		var furniture = art in ["table", "mechanism"]
		var width := 61.0 if art == "audience" else 43.0 if furniture else 35.0
		var shadow_pos := Vector2(pos.x + 10, pos.y - 5) if furniture else Vector2(pos.x, 202)
		_shadow(shadow_pos, width * motion.scale, motion.opacity * (1.6 if furniture else 1.0))
	# Applause frames face right; the audience stands to the musician's right.
	# Mirror only this authored row, preserving ambient and departing poses.
	var facing = -motion.facing if art == "audience" and success and phase not in ["ambient", "roll", "prepare"] else motion.facing
	_transform(pos, motion.tilt, Vector2(facing, 1) * motion.scale)
	var tint = Color(1, 1, 1, motion.opacity)
	var cycle = int(clock * 3.8) % 4
	var cue = float(motion.cue)
	var resolved = phase not in ["ambient", "roll", "prepare"]
	var row = {"guard": 0, "sleepy-guard": 0, "merchant": 1, "bandit": 2, "traveler": 3, "patient": 4, "audience": 5}.get(art, -1)
	if row >= 0:
		var group = "people"
		var order: Array = [0, 1, 0, 1]
		var index = int(row) * 6 + order[cycle]
		if art == "merchant": order = [2, 3, 4, 3] if cue > 0.5 else [5, 5, 5, 5] if cue < -0.4 else order
		if art == "bandit" and cue < -0.3: order = [4, 5, 4, 5]
		if art == "guard" and cue > 0.4: order = [2, 3, 2, 3]
		index = int(row) * 6 + order[cycle]
		var extended_row: int = -1
		var column: int = 0
		if art == "guard" and resolved and not success:
			extended_row = 0
			column = mini(1, int(progress / 0.19)) if progress < 0.38 else 2 + int(clock * 7.5) % 6
		if art == "bandit" and resolved and success:
			index = bandit_escape_frame(progress)
		if art == "audience" and resolved:
			extended_row = 2 if success else 5
			column = int(clock * 4.4) % 8
		if art == "traveler" and scene.id == "insight":
			extended_row = 3
			column = (3 if progress < 0.4 else 4 if progress < 0.7 else 5) if success and resolved else (2 if progress < 0.45 else 6 if progress < 0.75 else 7) if resolved else [0, 1, 2, 3][cycle]
		if art == "sleepy-guard":
			extended_row = 4
			column = (0 if progress < 0.42 else 4 if progress < 0.6 else 5 if progress < 0.8 else 7) if resolved and not success else cycle % 2
		var ref = float(data.groups.people.referenceHeight)
		if extended_row >= 0:
			group = "npcs"
			index = extended_row * 8 + column
			ref = float(data.groups.npcs.rowHeights[extended_row])
		elif art == "audience": ref = float(data.frames[int(data.groups.people.frames[30])].height)
		_cell(group, index, (110.0 if art == "audience" else 82.0 if art == "patient" else 108.0) / ref, false, tint)
		return
	if data.actors.has(art):
		var guest_role = "idle" if phase.begins_with("settled") or success and progress > 0.62 else "walk" if success else "run"
		_actor(art, pos, motion.merged({"x": 0.0, "y": 0.0}, true), data.actors[art].guest[guest_role])
		return
	if art in ["goblin", "kobold", "mouse"]:
		var r = ["goblin", "kobold", "mouse"].find(art)
		_cell("creatures", r * 8 + (2 + int(clock * 7) % 6 if resolved and not success else 1), (15.0 if art == "mouse" else 69.0) / float(data.groups.creatures.rowHeights[r]), false, tint)
		return
	if art == "horse":
		var order: Array = [0, 1, 2, 1]
		if cue > 0.65: order = [6, 8, 6, 8] if height < 75 else [5, 7, 5, 7]
		elif cue > 0.1: order = [2, 3, 4, 3]
		elif cue < -0.4: order = [10, 11, 10, 11] if phase.begins_with("settled") else [8, 9, 10, 11]
		var id := int(data.groups.horse.frames[order[cycle]])
		var scale := 154.0 / float(data.groups.horse.referenceHeight)
		var sprite_size := Vector2(facing, 1) * float(motion.scale)
		var pose := Transform2D(float(motion.tilt), sprite_size, 0.0, pos)
		if not _contact_shadows(id, pose, scale, motion.opacity):
			_shadow(Vector2(pos.x, 202), 35 * motion.scale, motion.opacity)
		_transform(pos, motion.tilt, sprite_size)
		_frame(id, scale, false, tint)
		return
	var environment = {"crystal": [0, 64], "table": [1, 96], "bush": [2, 89], "pebble": [3, 17], "sign": [4, 49], "heraldry": [5, 64]}
	if environment.has(art):
		var config = environment[art]
		var f = data.frames[int(data.groups.environment.frames[int(config[0])])]
		if art == "crystal" and success and resolved:
			for i in range(12, 0, -1): draw_circle(Vector2.ZERO, i * 6, Color(1, 0.8, 0.4, 0.014 * cue))
			tint = Color(1.0 + cue * 0.8, 1.0 + cue * 0.7, 1.0 + cue * 0.4, motion.opacity)
		if art == "heraldry": _transform(pos, motion.tilt, Vector2(-1, 1))
		if art == "bush": _transform(pos, motion.tilt + sin(clock * 2.4) * (0.012 + maxf(0, cue) * 0.03), Vector2(motion.facing, 1) * motion.scale)
		_cell("environment", int(config[0]), float(config[1]) / float(f.width), art == "crystal", tint)
	elif art.begins_with("tracks-"):
		var f = data.frames[int(data.groups.tracks.frames[0 if art == "tracks-boar" else 1])]
		var scale = 131.0 / float(f.width)
		_transform(pos + Vector2(0, 8), 0, Vector2(1, 18.0 / (float(f.height) * scale)))
		_frame(int(data.groups.tracks.frames[0 if art == "tracks-boar" else 1]), scale, true, tint)
	elif art == "mechanism":
		_cell("environment", 9 if cue < 0 else 8 + mini(3, int(cue * 3.99)), 96.0 / float(data.frames[int(data.groups.environment.frames[8])].width), false, tint)
	elif art == "owl":
		_cell("environment", 13 + [0, 1, 2, 1][int(clock * 9) % 4] if cue > 0.6 else 12, 28.0 / float(data.frames[int(data.groups.environment.frames[12])].height), false, tint)
	elif art in ["plant-broad", "plant-narrow", "altar"]:
		var index = 8 if art == "plant-broad" else 9 if art == "plant-narrow" else 10
		var f = data.frames[int(data.groups.objects.frames[index])]
		_transform(pos, sin(clock * 2.4) * (0.025 + maxf(0, cue) * 0.1) if art != "altar" else 0, Vector2.ONE * motion.scale)
		_cell("objects", index, (47.0 if index == 8 else 38.0 if index == 9 else 90.0) / float(f.width), false, tint)
	elif art == "rope":
		for x in [-137, 137]: draw_line(Vector2(x, -5), Vector2(x, 33), Color("a48762"), 5)
		var points := PackedVector2Array()
		for i in range(33):
			var x = -137.0 + i * 274.0 / 32.0
			points.append(Vector2(x, 6 * (1 - pow(x / 137, 2))))
		draw_polyline(points, Color("d9b47e"), 2.6, true)
	elif art == "laughter": draw_string(font, Vector2(-42, sin(clock * 6) * 2), "¡Ja, ja, ja!", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("edcf91"))
	elif art == "notes":
		for i in range(3 if cue > 0.35 else 1): draw_string(font, Vector2(i * 20, -i * 8 + sin(clock * 4 + i) * 4), "♪", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(0.88, 0.74, 0.48, motion.opacity))
	elif art in ["smoke", "spores", "fall-mist"]:
		for i in range(12):
			var center = Vector2(sin(clock * 0.8 + i * 2.1) * (8 + i), -i * 3 + cos(clock + i) * 3)
			for layer in range(6, 0, -1): draw_circle(center, (10 + i) * layer / 6.0, Color(0.64, 0.62, 0.72, motion.opacity * 0.015))
	elif art == "spring":
		var points := PackedVector2Array()
		for i in range(12): points.append(Vector2(-18 + i * 3, -5 if i % 2 else 5))
		draw_polyline(points, Color("d8c69f"), 2)
	elif art == "symbol-match":
		for x in [-18, 26]: draw_polyline(PackedVector2Array([Vector2(x, -10), Vector2(x + 8, 0), Vector2(x, 10), Vector2(x - 8, 0), Vector2(x, -10)]), Color("e6c68b"), 1.5)
	elif art == "loose-pages":
		for i in range(4): draw_rect(Rect2(14 + i * 13 + sin(clock + i) * 6, -25 + fmod(clock * 0.18 + i * 0.23, 1) * 86, 12, 16), Color("ddc79e"))
	elif art == "sound":
		for i in range(3): draw_arc(Vector2.ZERO, 8 + i * 6, -1.3, -0.3, 12, Color(0.9, 0.8, 0.6, motion.opacity), 1.5)
