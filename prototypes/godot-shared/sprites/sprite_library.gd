extends RefCounted
## Character art is independent of map geometry, rules, HP and equipment stock.
const MINIMUM_MOVEMENT_FRAMES := 8
const DIRECTIONS := ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const ACTIONS := ["run", "stealth", "climb", "swim", "crawl", "jump", "attack", "spell"]
static var _data: Dictionary = {}
static var _textures: Dictionary = {}

static func _manifest() -> Dictionary:
	if _data.is_empty() and FileAccess.file_exists("res://sprites/frames.json"):
		_data = JSON.parse_string(FileAccess.get_file_as_string("res://sprites/frames.json"))
	return _data

static func _row(atlas_id: String, row: int, fps: float, loop: bool) -> Dictionary:
	var spec: Dictionary = _manifest().get("atlases", {}).get(atlas_id, {})
	if spec.is_empty(): return {}
	if not _textures.has(atlas_id):
		var image := Image.load_from_file(ProjectSettings.globalize_path("res://sprites/" + spec.file))
		if image == null: return {}
		# Neutralise invisible RGB before filtering transparent atlas borders.
		image.fix_alpha_edges()
		image.generate_mipmaps()
		_textures[atlas_id] = ImageTexture.create_from_image(image)
	var frames: Array = []
	for entry in spec.frames.slice(row * 8, row * 8 + 8):
		var texture := AtlasTexture.new()
		texture.atlas = _textures[atlas_id]
		texture.region = Rect2(entry.x, entry.y, entry.width, entry.height)
		texture.filter_clip = true
		var bounds: Array=entry.get("source_bounds",[0,0,entry.width,entry.height])
		var silhouette:=Vector2(float(bounds[2]),float(bounds[3]))/float(spec.reference_height)
		frames.append({"tex": texture, "height_scale": entry.height_scale, "flip_h": false, "floor_offset": -6.0 / entry.height, "silhouette_size":silhouette})
	if frames.size() < MINIMUM_MOVEMENT_FRAMES:
		push_error("Incomplete movement atlas: " + atlas_id)
		return {}
	return {"frames": frames, "fps": fps, "loop": loop, "drawn_motion": true, "source_atlas": atlas_id, "source_row": row}

static func apply(hero: String, profile: Dictionary) -> Dictionary:
	var atlases: Dictionary = _manifest().get("atlases", {})
	if not atlases.has(hero + "-actions"): return profile
	profile["dir_states"] = {}
	for index in range(8):
		var direction: String = DIRECTIONS[index]
		if hero == "silverfarben" and profile.clips.has("idle_" + direction): profile.dir_idle[direction] = profile.clips["idle_" + direction]
		var walk := _row(hero + "-walk", index, 10.0 if hero == "zombie" else 12.0, true)
		if not walk.is_empty(): profile.dir_walk[direction] = walk
		# Existing reviewed Trinity/Silverfarben walks already have eight poses.
		if profile.dir_walk.has(direction):
			var run: Dictionary = profile.dir_walk[direction].duplicate()
			run.fps = 16.0 if hero == "zombie" else 18.0
			run["reuses_walk"] = true
			profile.dir_run[direction] = run
		var authored_run := _row(hero + "-run", index, 16.0 if hero == "zombie" else 18.0, true)
		if not authored_run.is_empty(): profile.dir_run[direction] = authored_run
		var torch := _row(hero + "-torch", index, 12.0, true)
		if not torch.is_empty():
			profile.dir_torch_walk[direction] = torch
			var rest: Dictionary = torch.duplicate()
			rest.frames = [torch.frames[0]]
			rest.fps = 1.0
			profile.dir_torch_idle[direction] = rest
	for index in range(ACTIONS.size()):
		var state: String = ACTIONS[index]
		if hero == "zombie" and state == "spell": state = "grapple"
		var loop: bool = state in ["run", "stealth", "climb", "swim", "crawl"]
		var clip := _row(hero + "-actions", index, 14.285714 if state == "jump" else 10.0, loop)
		profile.clips[state] = clip
		if state not in ["climb", "spell", "run", "attack"]:
			var reverse: Dictionary = clip.duplicate()
			reverse.flip_h = true
			profile.dir_states[state] = {"e": clip, "se": clip, "s": clip, "ne": clip, "w": reverse, "sw": reverse, "nw": reverse}
		if state == "attack":
			profile.dir_attack.e = clip
			var reverse: Dictionary = clip.duplicate()
			reverse.flip_h = true
			profile.dir_attack.w = reverse
	# Generic aliases must resolve to the same complete current cycles.
	profile.clips.walk = profile.dir_walk.get("s", {})
	profile.clips.run = profile.dir_run.get("s", profile.clips.run)
	profile.clips.dodge = profile.clips.stealth
	profile.clips.climbing = profile.clips.climb
	profile.clips.swimming = profile.clips.swim
	profile.clips.jumping = profile.clips.jump
	for index in range(8):
		var direction: String = DIRECTIONS[index]
		var attack := _row(hero + "-attack", index, 10.0, false)
		if not attack.is_empty(): profile.dir_attack[direction] = attack
		var unarmed := _row(hero + "-unarmed", index, 10.0, false)
		if not unarmed.is_empty():
			if not profile.dir_states.has("attack_unarmed"): profile.dir_states.attack_unarmed = {}
			profile.dir_states.attack_unarmed[direction] = unarmed
			if direction == "s": profile.clips.attack_unarmed = unarmed
	if profile.dir_attack.has("s"): profile.clips.attack = profile.dir_attack.s
	return profile

static func torch_profile(hero: String) -> Dictionary:
	var result := {"walk": {}, "idle": {}}
	for index in range(8):
		var clip := _row(hero + "-torch", index, 12.0, true)
		if clip.is_empty(): continue
		result.walk[DIRECTIONS[index]] = clip
		var rest: Dictionary = clip.duplicate()
		rest.frames = [clip.frames[0]]
		rest.fps = 1.0
		result.idle[DIRECTIONS[index]] = rest
	return result
