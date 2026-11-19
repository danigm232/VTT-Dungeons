extends RefCounted
const Library = preload("res://sprites/sprite_library.gd")
const ZOMBIE_ROWS := ["attack_bite", "grapple", "hit", "fall", "stand", "crawl", "fortitude", "combat_idle"]
const HARPY_ROWS := ["song", "takeoff", "land", "hit", "fall", "stand", "crawl", "combat_idle"]
const CONDITIONS := ["agarrada","apresada","asustada","aturdida","cegada","derribada","ensordecida","hechizada","incapacitada","inconsciente","invisible","paralizada","petrificada","restringida","envenenada","agotamiento","oculta"]

static func supports(key: String) -> bool:
	return key in ["zombie","zombie-2","zombie-3","zombie-4","harpy"]

static func ready(key: String) -> bool:
	if not supports(key): return false
	var required: Array=[key+"-walk",key+"-attack",key+"-reactions"] if key.begins_with("zombie") else ["harpy-walk","harpy-claws","harpy-club","harpy-flight","harpy-utility"]
	var atlases: Dictionary=Library._manifest().get("atlases",{})
	for id in required:
		var spec: Dictionary=atlases.get(id,{})
		if spec.get("frames",[]).size()<64 or not FileAccess.file_exists("res://sprites/"+str(spec.get("file",""))): return false
	return true

static func apply(key: String, profile: Dictionary) -> Dictionary:
	if not ready(key): return profile
	var zombie := key.begins_with("zombie")
	var utility_id := key + ("-reactions" if zombie else "-utility")
	if Library._row(utility_id, 7, 4, true).is_empty(): return profile
	profile["npc_species"] = "zombie" if zombie else "harpy"
	if not profile.has("dir_states"): profile.dir_states = {}
	for index in range(8):
		var direction: String = Library.DIRECTIONS[index]
		var walk := Library._row(key + "-walk", index, 10 if zombie else 12, true)
		if not walk.is_empty(): profile.dir_walk[direction] = walk
		if profile.dir_walk.has(direction):
			var rest: Dictionary = profile.dir_walk[direction].duplicate()
			rest.frames = [rest.frames[0]]; rest.fps = 1
			profile.dir_idle[direction] = rest
			profile.dir_run[direction] = profile.dir_walk[direction].duplicate()
			profile.dir_run[direction].fps = 16
		var sprint := Library._row(key + "-run" if zombie else "harpy-flight", index, 16 if zombie else 12, true)
		if not sprint.is_empty(): profile.dir_run[direction] = sprint
		var attack := Library._row(key + "-attack" if zombie else "harpy-claws", index, 10, false)
		if not attack.is_empty(): profile.dir_attack[direction] = attack
		if not zombie:
			if not profile.dir_states.has("attack_club"): profile.dir_states.attack_club = {}
			profile.dir_states.attack_club[direction] = Library._row("harpy-club",index,10,false)
			profile.dir_states["fly"] = profile.dir_run
	var rows: Array = ZOMBIE_ROWS if zombie else HARPY_ROWS
	for index in range(rows.size()):
		var state: String = rows[index]
		var clip := Library._row(utility_id, index, 10 if state != "combat_idle" else 4, state in ["crawl","song","combat_idle"])
		profile.clips[state] = clip
		if state in ["attack_bite","grapple","crawl"]:
			var reversed: Dictionary = clip.duplicate(); reversed.flip_h = true
			profile.dir_states[state] = {"e":clip,"se":clip,"s":clip,"ne":clip,"w":reversed,"sw":reversed,"nw":reversed}
	for state in ["hit_physical","hit_fire","hit_arcane"]: profile.clips[state] = profile.clips.hit
	profile.clips.walk = profile.dir_walk.s; profile.clips.run = profile.dir_run.s
	profile.clips.attack = profile.dir_attack.s
	profile.clips.idle = profile.clips.combat_idle
	profile.clips.ready = profile.clips.combat_idle
	for state in ["dodge","help","search","study","interact"]: profile.clips[state] = profile.clips.combat_idle
	profile.clips.disengage = profile.clips.walk; profile.clips.flee = profile.clips.run
	if zombie: profile.clips.attack_secondary = profile.clips.attack_bite
	else:
		profile.clips.attack_club = profile.dir_states.attack_club.s
		profile.clips.fly = profile.dir_run.s
		profile.clips.spell = profile.clips.song
	var fallen: Dictionary = profile.clips.fall.duplicate()
	fallen.frames = [fallen.frames[-1]]; fallen.fps = 1; fallen.loop = true
	profile.clips.prone = fallen; profile.clips.defeated = fallen
	for condition in CONDITIONS:
		var pose: Dictionary = (fallen if condition in ["derribada","inconsciente"] else profile.clips.combat_idle).duplicate()
		pose.frames = [pose.frames[0]]; pose.fps = 1; pose.loop = true
		profile.clips["condition_" + condition] = pose
		if condition not in ["derribada","inconsciente"]:
			profile.dir_states["condition_"+condition]=profile.dir_idle
	return profile

static func condition_pose(conditions: Array) -> String:
	for key in ["inconsciente","petrificada","paralizada","derribada","aturdida","incapacitada"]:
		if key in conditions: return "condition_" + key
	return ""

static func action_pose(action: Dictionary) -> String:
	var id := str(action.get("id", ""))
	if id == "zombie-bite": return "attack_bite"
	if id == "zombie-grapple": return "grapple"
	if id == "harpy-club": return "attack_club"
	if id == "harpy-song": return "song"
	return ""
