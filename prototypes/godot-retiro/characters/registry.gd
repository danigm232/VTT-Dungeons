extends RefCounted
## Central adapter. Existing animation catalogues remain their authoritative source.
static var _data: Dictionary={}
static var _profiles: Dictionary={}
static var _prewarmed_profiles: Dictionary={}

static func collect_resident_cpu_profiles(ids: Array, reg_data: Dictionary, res_root_abs: String) -> Dictionary:
	var out: Dictionary = {}
	var chars: Dictionary = reg_data.get("characters", {})
	var anims: Dictionary = reg_data.get("animations", {})
	for raw_id in ids:
		var id := str(raw_id)
		if _profiles.has(id) or _prewarmed_profiles.has(id):
			continue
		var d: Dictionary = chars.get(id, {})
		if d.is_empty() or d.get("source", {}).get("kind", "") != "individual-frames":
			continue
		var frames_cpu: Array = []
		var reference := 0.0
		for path in d.source.get("frames", []):
			var abs_p := res_root_abs.path_join(str(path).trim_prefix("res://"))
			var image := Image.load_from_file(abs_p)
			if image == null or image.is_empty(): continue
			var used := image.get_used_rect()
			if used.size.x < 1 or used.size.y < 1: continue
			if d.source.get("preserveCanvas", false):
				var calibrated: float = float(d.source.get("referenceHeightPixels", used.size.y))
				var pivot: Array = d.source.get("pivot", [.5, 1])
				var orig_h := float(image.get_height())
				image = _prepare_modular_image(image, 192)
				frames_cpu.append({"img": image, "height_scale": orig_h / calibrated, "floor_offset": float(pivot[1]) - 1.0, "silhouette_size": Vector2(used.size) / calibrated})
			else:
				if reference == 0: reference = float(used.size.y)
				var cropped := _prepare_modular_image(image.get_region(used), 192)
				frames_cpu.append({"img": cropped, "height_scale": float(used.size.y) / reference, "floor_offset": 0.0, "silhouette_size": Vector2(used.size) / reference})
		if frames_cpu.is_empty(): continue
		var extra_anims: Array = []
		for anim_key in anims:
			var animation: Dictionary = anims[anim_key]
			if animation.get("character", "") != d.id or animation.get("anatomy", "") != d.anatomy:
				continue
			var a_frames: Array = []
			for frame in animation.get("runtimeFrames", []):
				var abs_f := res_root_abs.path_join(str(frame.file).trim_prefix("res://"))
				var img := Image.load_from_file(abs_f)
				if img == null or img.is_empty(): continue
				a_frames.append(_build_animation_pose_cpu(img, frame, animation))
			if not a_frames.is_empty():
				extra_anims.append({"animation": animation, "frames": a_frames})
		out[id] = {"def": d, "base_frames": frames_cpu, "extra_anims": extra_anims}
	return out

static func apply_resident_cpu_profiles(bundles: Dictionary) -> void:
	for id in bundles:
		if not _profiles.has(id):
			_prewarmed_profiles[id] = bundles[id]

static func _prepare_modular_image(image: Image, max_h: int = 192, _compress_vram: bool = false) -> Image:
	if image.get_format() != Image.FORMAT_RGBA8:
		image.convert(Image.FORMAT_RGBA8)
	if image.get_height() > max_h:
		var sc := float(max_h) / float(maxi(image.get_height(), 1))
		var nh := maxi(4, int(round(image.get_height() * sc)))
		var nw := maxi(4, int(round(image.get_width() * sc)))
		image.resize(nw, nh, Image.INTERPOLATE_BILINEAR)
	image.fix_alpha_edges()
	image.generate_mipmaps()
	return image

static func _build_animation_pose_cpu(image: Image, frame: Dictionary, animation: Dictionary) -> Dictionary:
	var orig_height: float = image.get_height()
	var pivot: Array = frame.pivot
	var mirror := bool(animation.get("mirrorHorizontally", false))
	if mirror:
		image.flip_x()
	# Reclining busts occupy only the upper part of the registration canvas.
	var max_h := 448 if animation.has("restVolume") else 192
	if animation.has("toolGrip") or str(animation.get("action", "")).begins_with("retreat_desk_"):
		max_h = 320
	if image.get_height() > max_h:
		var sc_f := float(max_h) / float(image.get_height())
		var nh_f := maxi(4, int(round(image.get_height() * sc_f)))
		var nw_f := maxi(4, int(round(image.get_width() * sc_f)))
		image.resize(nw_f, nh_f, Image.INTERPOLATE_BILINEAR)
	var pivot_u := 1.0 - float(pivot[0]) if mirror else float(pivot[0])
	var pivot_x := pivot_u * image.get_width()
	var half_width: int = ceili(maxf(pivot_x, image.get_width() - pivot_x))
	var padded := Image.create(half_width * 2, image.get_height(), false, Image.FORMAT_RGBA8)
	var padding_x := roundi(half_width - pivot_x)
	var source_width := image.get_width()
	padded.blit_rect(image, Rect2i(Vector2i.ZERO, image.get_size()), Vector2i(padding_x, 0))
	image = padded
	var pose := {"img": image, "tex": null, "height_scale": orig_height / float(animation.referenceHeight), "floor_offset": float(pivot[1]) - 1.0, "visual_pivot": Vector2(.5, float(pivot[1]))}
	if animation.has("toolGrip"):
		var grip: Array = animation.toolGrip
		var grip_u := 1.0 - float(grip[0]) if mirror else float(grip[0])
		var used := image.get_used_rect()
		var grip_px := Vector2(grip_u * source_width + padding_x, float(grip[1]) * image.get_height())
		pose["tool_grip"] = (grip_px - Vector2(used.position)) / Vector2(used.size)
		pose["tool_grip_uv"] = grip_px / Vector2(image.get_size())
	if animation.has("soleContact"):
		var sole: Array = animation.soleContact
		var sole_u := 1.0 - float(sole[0]) if mirror else float(sole[0])
		pose["sole_contact"] = Vector2((sole_u * source_width + padding_x) / image.get_width(), float(sole[1]))
	if animation.has("restVolume"):
		pose["rest_volume"] = animation.restVolume
		pose["rest_contour"] = _rest_contour(image)
		pose["rest_blanket"] = animation.get("restBlanket", {})
		var sculpt: Dictionary = animation.get("restSculpt", {}).duplicate(true)
		if not sculpt.is_empty():
			var nose_u := float(sculpt.nose[0])
			if mirror:
				nose_u = 1.0 - nose_u
			sculpt.nose[0] = (nose_u * source_width + padding_x) / image.get_width()
			sculpt.faceHalfWidth = float(sculpt.faceHalfWidth) * source_width / image.get_width()
		pose["rest_sculpt"] = sculpt
	image.fix_alpha_edges()
	image.generate_mipmaps()
	return pose

static func _finalize_prewarmed_pose(pose_cpu: Dictionary) -> Dictionary:
	var out: Dictionary = pose_cpu.duplicate()
	var img: Image = out.get("img", null)
	if img != null:
		out["tex"] = ImageTexture.create_from_image(img)
		out.erase("img")
	return out
static func data() -> Dictionary:
	if _data.is_empty():
		var path:="res://characters/catalogue.json"
		if not FileAccess.file_exists(path): path="res://characters/candidate-catalogue.json"
		if FileAccess.file_exists(path): _data=JSON.parse_string(FileAccess.get_file_as_string(path))
		if path.ends_with("/catalogue.json") and FileAccess.file_exists("res://characters/candidate-catalogue.json"):
			var candidate: Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://characters/candidate-catalogue.json"))
			if candidate.get("revision","")!=_data.get("revision",""): _data=candidate
	return _data
static func inspect_candidate() -> void:
	_data=JSON.parse_string(FileAccess.get_file_as_string("res://characters/candidate-catalogue.json")); _profiles.clear()
static func character(id: String) -> Dictionary:
	for key in data().get("characters",{}):
		var d: Dictionary=data().characters[key]
		if id.to_lower()==str(key).to_lower(): return d
		for alias in d.get("aliases",[]):
			if str(alias).to_lower()==id.to_lower(): return d
	return {}
static func _pack_modular_texture(image: Image, compress_vram: bool = true) -> ImageTexture:
	return ImageTexture.create_from_image(_prepare_modular_image(image, 224, compress_vram))
static func profile(id: String) -> Dictionary:
	var d:=character(id)
	if d.is_empty(): return {}
	if d.source.kind=="legacy-profile":
		if not _profiles.has(d.id): _profiles[d.id]=with_animations(load("res://scripts/character_sprite_catalog.gd").get_character_clips(str(d.source.key)).duplicate(true),d)
		return _profiles[d.id]
	if _profiles.has(d.id): return _profiles[d.id]
	if _prewarmed_profiles.has(d.id):
		var bundle: Dictionary = _prewarmed_profiles[d.id]
		_prewarmed_profiles.erase(d.id)
		var b_frames: Array = []
		for pf in bundle.get("base_frames", []):
			b_frames.append(_finalize_prewarmed_pose(pf))
		if not b_frames.is_empty():
			var clip_p: Dictionary = {"frames": b_frames, "fps": float(d.source.get("fps", 3)), "loop": true, "drawn_motion": true}
			if d.get("campaign", "") == "stormwreck-isle": clip_p.modular_definition = d.id
			var dirs_p: Dictionary = {}
			for dir in d.source.get("directions", ["n", "ne", "e", "se", "s", "sw", "w", "nw"]): dirs_p[dir] = clip_p
			var res_p: Dictionary = {"clips": {"idle": clip_p, "combat_idle": clip_p}, "dir_idle": dirs_p, "dir_walk": {}, "dir_run": {}, "dir_attack": {}, "dir_states": {}, "anatomy": d.anatomy, "individual_source": true}
			for extra in bundle.get("extra_anims", []):
				var a_def: Dictionary = extra["animation"]
				var a_frames: Array = []
				for apf in extra["frames"]:
					a_frames.append(_finalize_prewarmed_pose(apf))
				if a_frames.is_empty(): continue
				var a_clip: Dictionary = {"frames": a_frames, "fps": a_def.fps, "loop": a_def.get("loop", false), "drawn_motion": true, "modular_definition": a_def.id, "events": a_def.get("events", [])}
				if a_def.has("viewAngleDegrees"):
					a_clip["view_bearing"] = deg_to_rad(float(a_def.viewAngleDegrees))
				var act: String = a_def.action
				var direc: String = a_def.get("direction", "s")
				if not res_p.dir_states.has(act): res_p.dir_states[act] = {}
				res_p.dir_states[act][direc] = a_clip
				if direc == "s": res_p.clips[act] = a_clip
				if act == "idle" and a_def.get("production", {}).get("method", "") == "reuse-existing-authored-idle-row":
					var old_st: Dictionary = res_p.clips.get("combat_idle", {})
					for alias in ["combat_idle", "ready", "dodge", "help", "search", "study", "interact"]:
						if res_p.clips.get(alias, {}) == old_st: res_p.clips[alias] = a_clip
					if not res_p.dir_states.has("combat_idle"): res_p.dir_states.combat_idle = {}
					res_p.dir_states.combat_idle[direc] = a_clip
			_profiles[d.id] = res_p
			return _profiles[d.id]
	var frames: Array=[]
	var reference:=0.0
	for path in d.source.get("frames",[]):
		var image:=Image.load_from_file(ProjectSettings.globalize_path(path))
		if image==null or image.is_empty(): continue
		var used:=image.get_used_rect()
		if used.size.x<1 or used.size.y<1: continue
		if d.source.get("preserveCanvas",false):
			var calibrated: float=float(d.source.get("referenceHeightPixels",used.size.y))
			var pivot: Array=d.source.get("pivot",[.5,1])
			var orig_h := float(image.get_height())
			frames.append({"tex":_pack_modular_texture(image),"height_scale":orig_h/calibrated,"floor_offset":float(pivot[1])-1.0,"silhouette_size":Vector2(used.size)/calibrated})
			continue
		if reference==0: reference=float(used.size.y)
		var cropped:=image.get_region(used)
		frames.append({"tex":_pack_modular_texture(cropped),"height_scale":float(used.size.y)/reference,"floor_offset":0.0,"silhouette_size":Vector2(used.size)/reference})
	if frames.is_empty(): return {}
	var clip: Dictionary={"frames":frames,"fps":float(d.source.get("fps",3)),"loop":true,"drawn_motion":true}
	if d.get("campaign","")=="stormwreck-isle": clip.modular_definition=d.id
	var directions: Dictionary={}
	for dir in d.source.get("directions",["n","ne","e","se","s","sw","w","nw"]): directions[dir]=clip
	var result: Dictionary={"clips":{"idle":clip,"combat_idle":clip},"dir_idle":directions,"dir_walk":{},"dir_run":{},"dir_attack":{},"dir_states":{},"anatomy":d.anatomy,"individual_source":true}
	_profiles[d.id]=with_animations(result,d); return _profiles[d.id]
static func with_animations(profile: Dictionary,definition: Dictionary) -> Dictionary:
	if not profile.has("clips"): profile["clips"] = {}
	for animation in data().get("animations",{}).values():
		if animation.character!=definition.id or animation.anatomy!=definition.anatomy: continue
		var frames: Array=[]
		for frame in animation.get("runtimeFrames",[]):
			var image:=Image.load_from_file(ProjectSettings.globalize_path(frame.file))
			if image==null or image.is_empty(): continue
			var pose_cpu := _build_animation_pose_cpu(image, frame, animation)
			frames.append(_finalize_prewarmed_pose(pose_cpu))
		if frames.is_empty(): continue
		var clip: Dictionary={"frames":frames,"fps":animation.fps,"loop":animation.get("loop",false),"drawn_motion":true,"modular_definition":animation.id,"events":animation.get("events",[])}
		if animation.has("viewAngleDegrees"):
			clip["view_bearing"] = deg_to_rad(float(animation.viewAngleDegrees))
		var action: String=animation.action; var direction: String=animation.get("direction","s")
		if not profile.has("dir_states"): profile.dir_states={}
		if not profile.dir_states.has(action): profile.dir_states[action]={}
		profile.dir_states[action][direction]=clip
		if direction=="s": profile.clips[action]=clip
		if action=="idle" and animation.get("production",{}).get("method","")=="reuse-existing-authored-idle-row":
			# NPC ambience alternates idle/combat_idle. Keep its reused stance
			# aliases on the same registered frames so the root never jumps.
			var old_stance: Dictionary=profile.clips.get("combat_idle",{})
			for alias in ["combat_idle","ready","dodge","help","search","study","interact"]:
				if profile.clips.get(alias,{})==old_stance: profile.clips[alias]=clip
			if not profile.dir_states.has("combat_idle"): profile.dir_states.combat_idle={}
			profile.dir_states.combat_idle[direction]=clip
	return profile

static func _rest_contour(image: Image) -> Array[PackedVector2Array]:
	var contour: Array[PackedVector2Array] = []
	for row in range(73):
		var y := roundi(float(row) / 72.0 * (image.get_height() - 1))
		var spans := PackedVector2Array()
		var start := -1
		for x in range(image.get_width()):
			if image.get_pixel(x, y).a >= 0.5:
				if start < 0: start = x
			elif start >= 0:
				# Ignore isolated outline pixels. Real gaps between boots stay open.
				if x - start >= 5:
					spans.append(Vector2(start, x) / float(image.get_width()))
				start = -1
		if start >= 0 and image.get_width() - start >= 5:
			spans.append(Vector2(float(start) / image.get_width(), 1.0))
		contour.append(spans)
	return contour
static func compatible(character_id: String,item_id: String) -> Dictionary:
	var d:=character(character_id)
	var item: Dictionary=data().get("equipment",{}).get(item_id,{})
	if d.is_empty() or item.is_empty(): return {"ok":false,"reason":"Recurso no registrado"}
	if str(item.get("review",{}).get("visual","")).begins_with("rejected"): return {"ok":false,"reason":"Este acabado fue rechazado y está en revisión"}
	if d.anatomy not in item.get("anatomies",[]): return {"ok":false,"reason":"Este objeto no es compatible con la anatomía"}
	if item.slot not in d.get("equipmentSlots",[]): return {"ok":false,"reason":"Esta ranura todavía no está adaptada"}
	if item.slot in d.get("embeddedSlots",[]) and not item.has("replacementMask"): return {"ok":false,"reason":"El equipo original está pintado: falta una máscara de reemplazo revisada"}
	return {"ok":true}
