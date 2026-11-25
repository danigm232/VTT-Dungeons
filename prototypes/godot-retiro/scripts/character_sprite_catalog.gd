class_name CharacterSpriteCatalog
extends RefCounted

# ==============================================================================
# CATÁLOGO UNIFICADO DE SPRITES Y ANIMACIONES DE BABYLON (TODOS LOS JUGADORES Y PNJs)
# - Recorta con precisión alfa y aislamiento BFS (atlas-isolation / facing-sprites)
#   los 8 rumbos para Clérigo (Mia), Mago (Mike), Zombi y Arpía sin recortar armas/capas.
# - Extrae ciclos 8-direccionales de caminar, correr, atacar y estados completos
#   (sigilo, nado, salto, trepar, interactuar, combate, derribado, arrastrarse,
#    inconsciente, impacto, arco, lanzar daga y pose sentado) para Maria Trinity y el grupo.
# ==============================================================================

const DIRS: Array[String] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]

static var _catalog_cache: Dictionary = {}
static var _raw_img_cache: Dictionary = {}
static var _trimmed_single_cache: Dictionary = {}
static var _prewarmed_trimmed_imgs: Dictionary = {}
static var _prewarmed_facing_imgs: Dictionary = {}
static var _prewarmed_maria_walks: Dictionary = {}
static var _prewarmed_maria_rows: Dictionary = {}

# Coordenadas exactas medidas por alfa (facing-sprites.ts): [left, top, right, bottom, seedX, seedY]
const FACING_REST_POSES: Dictionary = {
	"wizard": [
		[35,84,314,587,160,84], [355,86,611,590,477,86], [657,84,888,599,780,84], [940,84,1226,599,1070,84],
		[29,661,316,1174,164,661], [352,663,621,1178,477,663], [670,662,894,1179,748,662], [941,659,1215,1168,1053,659]
	],
	"cleric": [
		[7,209,346,585,155,209], [347,208,652,591,495,208], [680,208,890,595,787,208], [917,208,1249,600,1097,208],
		[7,714,325,1085,160,714], [321,714,625,1105,463,714], [650,714,884,1100,751,714], [946,714,1249,1094,1057,714]
	],
	"zombie": [
		[23,13,327,606,197,13], [380,12,654,611,556,12], [668,13,901,613,851,13], [933,9,1240,612,1114,9],
		[5,619,313,1226,159,619], [330,617,627,1227,415,617], [654,622,906,1224,704,622], [926,627,1241,1223,1006,627]
	],
	"harpy": [
		[5,93,295,612,161,93], [325,84,641,609,435,84], [651,83,904,617,746,83], [917,87,1252,618,1066,87],
		[12,664,318,1174,141,664], [324,663,627,1177,461,663], [688,662,903,1184,781,662], [910,662,1243,1173,1099,662]
	]
}

# Recortes exactos de los ciclos 8-direccionales de caminar (player-walk-frames.ts):
# [x, y, width, height, anchorX]
const TRINITY_WALK_V2: Dictionary = {
	"n": {
		"ref_h": 463,
		"frames": [
			[122,21,229,473,0.524], [473,19,229,476,0.485], [840,20,233,474,0.489], [1211,21,222,471,0.484],
			[101,521,230,462,0.486], [473,519,223,460,0.481], [853,519,228,461,0.519], [1225,522,223,454,0.465]
		]
	},
	"ne": {
		"ref_h": 468,
		"frames": [
			[83,22,255,476,0.466], [465,22,264,476,0.456], [873,22,229,473,0.482], [1224,21,266,477,0.476],
			[102,532,230,465,0.492], [467,531,265,469,0.488], [848,530,257,470,0.479], [1239,532,258,467,0.462]
		]
	},
	"nw": {
		"ref_h": 488,
		"frames": [
			[95,14,266,495,0.525], [463,12,270,499,0.523], [848,14,233,493,0.521], [1227,15,248,496,0.510],
			[111,516,223,474,0.513], [476,516,240,487,0.518], [838,517,264,491,0.524], [1220,519,224,485,0.529]
		]
	},
	"s": {
		"ref_h": 482,
		"frames": [
			[103,22,216,492,0.491], [476,20,217,486,0.475], [852,19,224,495,0.468], [1220,20,214,490,0.519],
			[95,526,222,478,0.511], [457,523,234,480,0.517], [843,525,218,486,0.520], [1215,526,223,485,0.542]
		]
	},
	"se": {
		"ref_h": 471,
		"frames": [
			[67,25,257,477,0.523], [454,23,249,477,0.527], [857,25,224,473,0.473], [1246,24,220,480,0.461],
			[71,535,252,464,0.522], [454,534,248,465,0.535], [843,534,243,470,0.544], [1217,532,253,476,0.524]
		]
	},
	"sw": {
		"ref_h": 480,
		"frames": [
			[91,18,258,481,0.478], [450,17,260,489,0.494], [831,17,261,485,0.507], [1217,17,262,489,0.497],
			[91,525,259,484,0.488], [464,525,239,484,0.480], [837,527,259,483,0.505], [1213,526,261,479,0.475]
		]
	},
	"w": {
		"ref_h": 466,
		"frames": [
			[64,25,302,472,0.521], [479,23,237,474,0.456], [845,24,235,474,0.486], [1173,23,306,478,0.530],
			[71,529,274,467,0.573], [483,528,248,464,0.464], [827,527,276,466,0.518], [1199,529,267,465,0.533]
		]
	}
}

static func get_character_clips(char_key: String) -> Dictionary:
	if _catalog_cache.has(char_key):
		return _catalog_cache[char_key]

	var profile: Dictionary = {
		"dir_idle": {},
		"dir_walk": {},
		"dir_run": {},
		"dir_attack": {},
		"clips": {},
		"sneak_fx": []
	}

	match char_key:
		"silverfarben":
			profile=load("res://combat/combat_catalogue.gd").sprite_profile("silverfarben-hotel")
		"anteros":
			profile=load("res://combat/combat_catalogue.gd").sprite_profile("anteros")
		"rogue":
			_build_maria_clips(profile)
			var added: Dictionary=load("res://combat/combat_catalogue.gd").sprite_profile("rogue",["help","influence","hit-physical","hit-fire","hit-arcane","disengage","use-torch","fall","stand"])
			profile.clips.merge(added.clips,true)
		"cleric":
			_build_facing_hero_clips(profile, "cleric", "res://assets/tokens/cleric-rest-v1.png", "res://assets/tokens/animations/seated/cleric-seated.png")
		"wizard":
			_build_facing_hero_clips(profile, "wizard", "res://assets/tokens/wizard-rest-v1.png", "res://assets/tokens/animations/seated/wizard-seated.png")
		"harpy":
			if not preload("res://sprites/npc_sprite_library.gd").ready("harpy"): _build_harpy_clips(profile)
		"zombie":
			if not preload("res://sprites/npc_sprite_library.gd").ready("zombie"): _build_zombie_clips(profile)
		"zombie-2", "zombie-3", "zombie-4":
			pass # Own atlas only: never inherit another sailor's clothing.

	var inventory: Dictionary = preload("res://inventory/sprite_library.gd").profile(char_key)
	profile.clips.merge(inventory.clips)
	profile["dir_torch_walk"] = inventory.torch_walk
	profile["dir_torch_idle"] = inventory.torch_idle
	profile = preload("res://sprites/sprite_library.gd").apply(char_key, profile)
	profile = preload("res://sprites/npc_sprite_library.gd").apply(char_key, profile)
	_catalog_cache[char_key] = profile
	return profile

static func resolve_character_key(token_name: String) -> String:
	var low := token_name.to_lower()
	for variant in [2,3,4]:
		if "zombie-"+str(variant) in low or "zombie"+str(variant) in low: return "zombie-"+str(variant)
	if "silverfarben" in low: return "silverfarben"
	if "anteros" in low: return "anteros"
	if "rogue" in low or "maria" in low or "trinity" in low:
		return "rogue"
	if "wizard" in low or "mike" in low:
		return "wizard"
	if "cleric" in low or "mia" in low or "hero" in low:
		return "cleric"
	if "harpy" in low or "harpia" in low:
		return "harpy"
	if "zombie" in low or "zombi" in low:
		return "zombie"
	return "cleric"

static func _load_raw_image(res_path: String) -> Image:
	if _raw_img_cache.has(res_path):
		return _raw_img_cache[res_path]
	var img: Image = null
	var abs_path := ProjectSettings.globalize_path(res_path)
	if FileAccess.file_exists(abs_path):
		img = Image.load_from_file(abs_path)
	elif ResourceLoader.exists(res_path):
		var tex := load(res_path) as Texture2D
		if tex:
			img = tex.get_image()
	if img and not img.is_empty():
		if img.is_compressed():
			img.decompress()
		if img.get_format() != Image.FORMAT_RGBA8:
			img.convert(Image.FORMAT_RGBA8)
		_raw_img_cache[res_path] = img
		return img
	return null

static func _make_tex(img: Image) -> ImageTexture:
	if img.get_height() > 280:
		var scale := 280.0 / float(img.get_height())
		img = img.duplicate()
		img.resize(maxi(4, int(round(img.get_width() * scale))), 280, Image.INTERPOLATE_BILINEAR)
		img.fix_alpha_edges()
	if not img.has_mipmaps():
		img.generate_mipmaps()
	return ImageTexture.create_from_image(img)

static func _trim_alpha_bounds(img: Image, min_alpha_byte: int = 24) -> Rect2i:
	var w := img.get_width()
	var h := img.get_height()
	if w <= 0 or h <= 0:
		return Rect2i(0, 0, w, h)
	var used := img.get_used_rect()
	if used.size.x <= 0 or used.size.y <= 0:
		return Rect2i(0, 0, w, h)
	if min_alpha_byte <= 1:
		return used
	var data := img.get_data()
	var u_x0 := used.position.x
	var u_y0 := used.position.y
	var u_x1 := used.position.x + used.size.x
	var u_y1 := used.position.y + used.size.y
	var min_y := -1
	for y in range(u_y0, u_y1):
		var row_base := (y * w + u_x0) * 4 + 3
		for x in range(u_x0, u_x1):
			if data[row_base] >= min_alpha_byte:
				min_y = y
				break
			row_base += 4
		if min_y != -1:
			break
	if min_y == -1:
		return Rect2i(0, 0, w, h)
	var max_y := min_y
	for y in range(u_y1 - 1, min_y - 1, -1):
		var row_base := (y * w + u_x0) * 4 + 3
		var found := false
		for x in range(u_x0, u_x1):
			if data[row_base] >= min_alpha_byte:
				found = true
				break
			row_base += 4
		if found:
			max_y = y
			break
	var min_x := u_x1
	for x in range(u_x0, u_x1):
		var col_base := (min_y * w + x) * 4 + 3
		var found := false
		for y in range(min_y, max_y + 1):
			if data[col_base] >= min_alpha_byte:
				found = true
				break
			col_base += w * 4
		if found:
			min_x = x
			break
	var max_x := min_x
	for x in range(u_x1 - 1, min_x - 1, -1):
		var col_base := (min_y * w + x) * 4 + 3
		var found := false
		for y in range(min_y, max_y + 1):
			if data[col_base] >= min_alpha_byte:
				found = true
				break
			col_base += w * 4
		if found:
			max_x = x
			break
	return Rect2i(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1)

static func _isolate_rgba_crop(src: Image, rect: Rect2i, seed_local: Vector2i) -> Image:
	var w := rect.size.x
	var h := rect.size.y
	var cropped := Image.create(w, h, false, Image.FORMAT_RGBA8)
	cropped.blit_rect(src, rect, Vector2i.ZERO)
	var data: PackedByteArray = cropped.get_data()
	var n := w * h
	var kept := PackedByteArray()
	kept.resize(n)
	kept.fill(0)

	var queue := PackedInt32Array()
	queue.resize(n)
	var q_head := 0
	var q_tail := 0

	# Buscar semilla inicial si el punto exacto está casi transparente en el borde
	var sx := clampi(seed_local.x, 0, w - 1)
	var sy := clampi(seed_local.y, 0, h - 1)
	if data[(sy * w + sx) * 4 + 3] < 32:
		var found := false
		for dy in range(-12, 13):
			for dx in range(-12, 13):
				var tx := sx + dx
				var ty := sy + dy
				if tx >= 0 and tx < w and ty >= 0 and ty < h:
					if data[(ty * w + tx) * 4 + 3] >= 32:
						sx = tx
						sy = ty
						found = true
						break
			if found:
				break

	if data[(sy * w + sx) * 4 + 3] >= 32:
		var start_i := sy * w + sx
		kept[start_i] = 1
		queue[q_tail] = start_i
		q_tail += 1

		while q_head < q_tail:
			var cur := queue[q_head]
			q_head += 1
			var cx := cur % w
			var cy := int(cur / w)
			if cx > 0:
				var li := cur - 1
				if kept[li] == 0 and data[li * 4 + 3] >= 32:
					kept[li] = 1; queue[q_tail] = li; q_tail += 1
			if cx + 1 < w:
				var ri := cur + 1
				if kept[ri] == 0 and data[ri * 4 + 3] >= 32:
					kept[ri] = 1; queue[q_tail] = ri; q_tail += 1
			if cy > 0:
				var ui := cur - w
				if kept[ui] == 0 and data[ui * 4 + 3] >= 32:
					kept[ui] = 1; queue[q_tail] = ui; q_tail += 1
			if cy + 1 < h:
				var di := cur + w
				if kept[di] == 0 and data[di * 4 + 3] >= 32:
					kept[di] = 1; queue[q_tail] = di; q_tail += 1

		# Conservar 1 píxel suavizado en contorno y limpiar cualquier resto ajeno
		for i in range(n):
			if kept[i] == 0:
				var px := i % w
				var py := int(i / w)
				var touch := (px > 0 and kept[i - 1] == 1) or (px + 1 < w and kept[i + 1] == 1) or (py > 0 and kept[i - w] == 1) or (py + 1 < h and kept[i + w] == 1)
				if not touch:
					data[i * 4 + 3] = 0

	return Image.create_from_data(w, h, false, Image.FORMAT_RGBA8, data)

static func _load_trimmed_sequence(pattern: String, start_idx: int, end_idx: int, height_scale: float = 1.0) -> Array[Dictionary]:
	var frames: Array[Dictionary] = []
	for i in range(start_idx, end_idx + 1):
		var path := pattern % i
		var frame := _load_trimmed_single(path, height_scale)
		if not frame.is_empty():
			frames.append(frame)
	return frames

static func _load_trimmed_list(paths: Array[String], height_scale: float = 1.0) -> Array[Dictionary]:
	var frames: Array[Dictionary] = []
	for p in paths:
		var frame := _load_trimmed_single(p, height_scale)
		if not frame.is_empty():
			frames.append(frame)
	return frames

static func _load_trimmed_single(res_path: String, height_scale: float = 1.0) -> Dictionary:
	if res_path.is_empty():
		return {}
	var cache_key := "%s|%.4f" % [res_path, height_scale]
	if _trimmed_single_cache.has(cache_key):
		return (_trimmed_single_cache[cache_key] as Dictionary).duplicate()
	var trimmed: Image = _prewarmed_trimmed_imgs.get(res_path, null)
	if trimmed == null:
		var src := _load_raw_image(res_path)
		if not src:
			return {}
		trimmed = _extract_trimmed_single_img(src)
	else:
		_prewarmed_trimmed_imgs.erase(res_path)
	var out := {"tex": _make_tex(trimmed), "height_scale": height_scale, "flip_h": false}
	_trimmed_single_cache[cache_key] = out
	return out.duplicate()

static func _extract_trimmed_single_img(src: Image) -> Image:
	var bounds := _trim_alpha_bounds(src, 20)
	var trimmed := Image.create(bounds.size.x, bounds.size.y, false, Image.FORMAT_RGBA8)
	trimmed.blit_rect(src, bounds, Vector2i.ZERO)
	trimmed.generate_mipmaps()
	return trimmed

static func _extract_facing_hero_images(key: String, src: Image) -> Array[Image]:
	var poses: Array = FACING_REST_POSES[key]
	var cropped_imgs: Array[Image] = []
	var max_w := 0
	var max_h := 0
	for p in poses:
		var x0 := maxi(0, int(p[0]) - 2)
		var y0 := maxi(0, int(p[1]) - 2)
		var x1 := mini(src.get_width(), int(p[2]) + 2)
		var y1 := mini(src.get_height(), int(p[3]) + 2)
		var iso := _isolate_rgba_crop(src, Rect2i(x0, y0, x1 - x0, y1 - y0), Vector2i(int(p[4]) - x0, int(p[5]) - y0))
		var tb := _trim_alpha_bounds(iso, 24)
		var tight := Image.create(tb.size.x, tb.size.y, false, Image.FORMAT_RGBA8)
		tight.blit_rect(iso, tb, Vector2i.ZERO)
		cropped_imgs.append(tight)
		max_w = maxi(max_w, tight.get_width())
		max_h = maxi(max_h, tight.get_height())
	var out: Array[Image] = []
	for i in range(DIRS.size()):
		var img: Image = cropped_imgs[i]
		var pad := Image.create(max_w, max_h, false, Image.FORMAT_RGBA8)
		var dst_x := int((max_w - img.get_width()) * 0.5)
		var dst_y := max_h - img.get_height()
		pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(dst_x, dst_y))
		pad.generate_mipmaps()
		out.append(pad)
	return out

static func _build_facing_hero_clips(profile: Dictionary, key: String, rest_path: String, seated_path: String) -> void:
	var padded_imgs: Array[Image] = []
	if _prewarmed_facing_imgs.has(key):
		padded_imgs = _prewarmed_facing_imgs[key]
		_prewarmed_facing_imgs.erase(key)
	else:
		var src := _load_raw_image(rest_path)
		if src:
			padded_imgs = _extract_facing_hero_images(key, src)
	if padded_imgs.size() == DIRS.size():
		for i in range(DIRS.size()):
			var tex := _make_tex(padded_imgs[i])
			var clip_arr: Array[Dictionary] = [{"tex": tex, "height_scale": 1.0, "flip_h": false}]
			profile["dir_idle"][DIRS[i]] = {"frames": clip_arr, "fps": 1.0, "flip_h": false}
			profile["dir_walk"][DIRS[i]] = {"frames": clip_arr, "fps": 6.0, "flip_h": false}
			profile["dir_run"][DIRS[i]] = {"frames": clip_arr, "fps": 8.0, "flip_h": false}
			profile["dir_attack"][DIRS[i]] = {"frames": clip_arr, "fps": 8.0, "flip_h": false}

	var sit_frame := _load_trimmed_single(seated_path, 0.78)
	if not sit_frame.is_empty():
		profile["clips"]["sit"] = {"frames": [sit_frame], "fps": 1.0, "loop": true}

static func _extract_maria_walk_images(d: String, src: Image) -> Dictionary:
	var spec: Dictionary = TRINITY_WALK_V2[d]
	var frames_data: Array = spec["frames"]
	var ref_h := int(spec["ref_h"])
	var max_lw := 0
	var max_rw := 0
	var max_h := ref_h
	var cropped_list: Array[Dictionary] = []
	for f in frames_data:
		var crop := Image.create(int(f[2]), int(f[3]), false, Image.FORMAT_RGBA8)
		crop.blit_rect(src, Rect2i(int(f[0]), int(f[1]), int(f[2]), int(f[3])), Vector2i.ZERO)
		var tb := _trim_alpha_bounds(crop, 24)
		var tight := Image.create(tb.size.x, tb.size.y, false, Image.FORMAT_RGBA8)
		tight.blit_rect(crop, tb, Vector2i.ZERO)
		var ax_orig := float(f[2]) * float(f[4]) - float(tb.position.x)
		max_lw = maxi(max_lw, int(ceil(ax_orig)))
		max_rw = maxi(max_rw, tight.get_width() - int(floor(ax_orig)))
		max_h = maxi(max_h, tight.get_height())
		cropped_list.append({"img": tight, "ax": ax_orig})

	var half_w := maxi(max_lw, max_rw) + 4
	var out_w := half_w * 2
	var imgs: Array[Image] = []
	for item in cropped_list:
		var img: Image = item["img"]
		var ax := float(item["ax"])
		var pad := Image.create(out_w, max_h, false, Image.FORMAT_RGBA8)
		var dx := clampi(int(round(half_w - ax)), 0, out_w - img.get_width())
		var dy := max_h - img.get_height()
		pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(dx, dy))
		pad.generate_mipmaps()
		imgs.append(pad)
	return {"imgs": imgs, "height_scale": float(max_h) / float(ref_h)}

static func _build_maria_clips(profile: Dictionary) -> void:
	# 1. Caminar 8-direccional (trinity-*-walk-v2, 8 fotogramas a 16 fps, espejando W -> E)
	for d in ["n", "ne", "nw", "s", "se", "sw", "w"]:
		var walk_data: Dictionary = {}
		if _prewarmed_maria_walks.has(d):
			walk_data = _prewarmed_maria_walks[d]
			_prewarmed_maria_walks.erase(d)
		else:
			var walk_path := "res://assets/tokens/animations/maria/walks-v2/trinity-%s-walk-v2.png" % d
			var src := _load_raw_image(walk_path)
			if src:
				walk_data = _extract_maria_walk_images(d, src)
		if not walk_data.is_empty():
			var hscale := float(walk_data["height_scale"])
			var built_frames: Array[Dictionary] = []
			for pad in walk_data["imgs"]:
				built_frames.append({"tex": _make_tex(pad), "height_scale": hscale, "flip_h": false})
			profile["dir_walk"][d] = {"frames": built_frames, "fps": 16.0, "flip_h": false}
			if d == "w":
				profile["dir_walk"]["e"] = {"frames": built_frames, "fps": 16.0, "flip_h": true}

	# 2. Idle direccional + reposo sur animado (maria_idle_01..04)
	var south_idle := _load_trimmed_sequence("res://assets/tokens/animations/maria/maria_idle_%02d.png", 1, 4, 1.0)
	if south_idle.size() > 0:
		profile["clips"]["idle"] = {"frames": south_idle, "fps": 4.0, "loop": true}
		profile["dir_idle"]["s"] = {"frames": south_idle, "fps": 4.0, "flip_h": false}
	for d in DIRS:
		if d == "s":
			continue
		if profile["dir_walk"].has(d):
			var wclip: Dictionary = profile["dir_walk"][d]
			var wframes: Array = wclip["frames"]
			if wframes.size() > 0:
				profile["dir_idle"][d] = {"frames": [wframes[0]], "fps": 1.0, "flip_h": wclip["flip_h"]}

	# 3. Correr 8-direccional (maria_run_sw_n_sheet, maria_run_w_nw_sheet, maria_correr_01..04)
	_wire_maria_4x2_directions(
		profile["dir_run"],
		"res://assets/tokens/animations/maria/maria_run_sw_n_sheet.png",
		"res://assets/tokens/animations/maria/maria_run_w_nw_sheet.png",
		_load_trimmed_sequence("res://assets/tokens/animations/maria/maria_correr_%02d.png", 1, 4, 1.0),
		11.0
	)

	# 4. Ataque con daga 8-direccional (maria_dagger_sw_n_4x2, maria_dagger_w_nw_4x2, maria_ataque_daga_01..05)
	_wire_maria_4x2_directions(
		profile["dir_attack"],
		"res://assets/tokens/animations/maria/maria_dagger_sw_n_4x2.png",
		"res://assets/tokens/animations/maria/maria_dagger_w_nw_4x2.png",
		_load_trimmed_sequence("res://assets/tokens/animations/maria/maria_ataque_daga_%02d.png", 1, 5, 1.0),
		11.0
	)

	# 5. Resto de acciones canónicas de Maria Trinity
	var seqs: Array = [
		["combat_idle", "res://assets/tokens/animations/maria/maria_combate_idle_%02d.png", 1, 3, 4.0, true, 1.0],
		["walk", "res://assets/tokens/animations/maria/maria_caminar_%02d.png", 1, 4, 9.0, true, 1.0],
		["run", "res://assets/tokens/animations/maria/maria_correr_%02d.png", 1, 4, 11.0, true, 1.0],
		["attack", "res://assets/tokens/animations/maria/maria_ataque_daga_%02d.png", 1, 5, 11.0, false, 1.0],
		["attack_arrow", "res://assets/tokens/animations/maria/maria_disparo_arco_%02d.png", 1, 6, 10.0, false, 1.0],
		["attack_throw", "res://assets/tokens/animations/maria/maria_lanzar_daga_%02d.png", 1, 3, 10.0, false, 1.0],
		["interact", "res://assets/tokens/animations/maria/maria_interactuar_%02d.png", 1, 4, 7.0, false, 1.0],
		["stealth", "res://assets/tokens/animations/maria/maria_sigilo_%02d.png", 1, 4, 7.0, true, 0.90],
		["dodge", "res://assets/tokens/animations/maria/maria_sigilo_%02d.png", 1, 4, 9.0, false, 0.90],
		["climb", "res://assets/tokens/animations/maria/maria_trepar_%02d.png", 1, 4, 7.0, true, 1.0],
		["swim", "res://assets/tokens/animations/maria/maria_nadar_%02d.png", 1, 4, 7.0, true, 0.56],
		["jump", "res://assets/tokens/animations/maria/maria_saltar_%02d.png", 1, 3, 8.0, false, 1.0],
		["hit", "res://assets/tokens/animations/maria/maria_hit_%02d.png", 1, 3, 10.0, false, 1.0],
		["crawl", "res://assets/tokens/animations/maria/maria_arrastrarse_%02d.png", 1, 3, 6.0, true, 0.72]
	]
	for item in seqs:
		var frames := _load_trimmed_sequence(item[1], item[2], item[3], item[6])
		if frames.size() > 0:
			profile["clips"][item[0]] = {"frames": frames, "fps": item[4], "loop": item[5]}

	var prone_frame := _load_trimmed_single("res://assets/tokens/animations/maria/maria_07_derribada.png", 0.50)
	if not prone_frame.is_empty():
		profile["clips"]["prone"] = {"frames": [prone_frame], "fps": 1.0, "loop": true}
	var def_frame := _load_trimmed_single("res://assets/tokens/animations/maria/maria_12_inconsciente.png", 0.38)
	if not def_frame.is_empty():
		profile["clips"]["defeated"] = {"frames": [def_frame], "fps": 1.0, "loop": true}
	var sit_frame := _load_trimmed_single("res://assets/tokens/animations/seated/rogue-seated.png", 0.78)
	if not sit_frame.is_empty():
		profile["clips"]["sit"] = {"frames": [sit_frame], "fps": 1.0, "loop": true}

	profile["sneak_fx"] = _load_trimmed_sequence("res://assets/tokens/animations/maria/maria_fx_ataque_furtivo_%02d.png", 1, 2, 1.0)

static func _wire_maria_4x2_directions(target: Dictionary, sw_n_path: String, w_nw_path: String, south_frames: Array[Dictionary], fps: float) -> void:
	var sw_row := _slice_1254_sheet_row(sw_n_path, 0)
	var n_row := _slice_1254_sheet_row(sw_n_path, 1)
	var w_row := _slice_1254_sheet_row(w_nw_path, 0)
	var nw_row := _slice_1254_sheet_row(w_nw_path, 1)

	if south_frames.size() > 0:
		target["s"] = {"frames": south_frames, "fps": fps, "flip_h": false}
	if n_row.size() > 0:
		target["n"] = {"frames": n_row, "fps": fps, "flip_h": false}
	if sw_row.size() > 0:
		target["sw"] = {"frames": sw_row, "fps": fps, "flip_h": false}
		target["se"] = {"frames": sw_row, "fps": fps, "flip_h": true}
	if w_row.size() > 0:
		target["w"] = {"frames": w_row, "fps": fps, "flip_h": false}
		target["e"] = {"frames": w_row, "fps": fps, "flip_h": true}
	if nw_row.size() > 0:
		target["nw"] = {"frames": nw_row, "fps": fps, "flip_h": false}
		target["ne"] = {"frames": nw_row, "fps": fps, "flip_h": true}

static func _extract_1254_row_images(src: Image, row: int) -> Array[Image]:
	var cropped_imgs: Array[Image] = []
	var max_w := 0
	var max_h := 0
	for col in range(4):
		var x := col * 313 + 3
		var y := row * 627 + 3
		var w := mini(307, src.get_width() - x)
		var h := mini(572, src.get_height() - y)
		if w <= 16 or h <= 16:
			continue
		var cell := Image.create(w, h, false, Image.FORMAT_RGBA8)
		cell.blit_rect(src, Rect2i(x, y, w, h), Vector2i.ZERO)
		# Eliminar línea divisoria o resto semitransparente aislado en el borde
		var tb := _trim_alpha_bounds(cell, 48)
		var tight := Image.create(tb.size.x, tb.size.y, false, Image.FORMAT_RGBA8)
		tight.blit_rect(cell, tb, Vector2i.ZERO)
		cropped_imgs.append(tight)
		max_w = maxi(max_w, tight.get_width())
		max_h = maxi(max_h, tight.get_height())

	var out: Array[Image] = []
	for img in cropped_imgs:
		var pad := Image.create(max_w, max_h, false, Image.FORMAT_RGBA8)
		pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(int((max_w - img.get_width()) * 0.5), max_h - img.get_height()))
		pad.generate_mipmaps()
		out.append(pad)
	return out

static func _slice_1254_sheet_row(res_path: String, row: int) -> Array[Dictionary]:
	var row_key := "%s|%d" % [res_path, row]
	var padded_imgs: Array[Image] = []
	if _prewarmed_maria_rows.has(row_key):
		padded_imgs = _prewarmed_maria_rows[row_key]
		_prewarmed_maria_rows.erase(row_key)
	else:
		var src := _load_raw_image(res_path)
		if not src:
			return []
		padded_imgs = _extract_1254_row_images(src, row)

	var out: Array[Dictionary] = []
	for pad in padded_imgs:
		out.append({"tex": _make_tex(pad), "height_scale": 1.0, "flip_h": false})
	return out

static func _build_harpy_clips(profile: Dictionary) -> void:
	_build_facing_hero_clips(profile, "harpy", "res://assets/tokens/harpy-rest-v1.png", "")
	var seqs: Array = [
		["idle", "res://assets/tokens/animations/harpy/harpia_idle_suelo_%02d.png", 1, 3, 4.0, true, 1.0],
		["walk", "res://assets/tokens/animations/harpy/harpia_caminar_%02d.png", 1, 4, 7.0, true, 1.0],
		["run", "res://assets/tokens/animations/harpy/harpia_volar_%02d.png", 1, 4, 8.0, true, 1.0],
		["attack", "res://assets/tokens/animations/harpy/harpia_ataque_garra_%02d.png", 1, 4, 9.0, false, 1.0]
	]
	for item in seqs:
		var frames := _load_trimmed_sequence(item[1], item[2], item[3], item[6])
		if frames.size() > 0:
			profile["clips"][item[0]] = {"frames": frames, "fps": item[4], "loop": item[5]}
	var h_hit := _load_trimmed_single("res://assets/tokens/animations/harpy/harpia_hit_01.png", 1.0)
	if not h_hit.is_empty():
		profile["clips"]["hit"] = {"frames": [h_hit], "fps": 6.0, "loop": false}
	var h_dead := _load_trimmed_single("res://assets/tokens/animations/harpy/harpia_muerta.png", 0.52)
	if not h_dead.is_empty():
		profile["clips"]["defeated"] = {"frames": [h_dead], "fps": 1.0, "loop": true}

static func _build_zombie_clips(profile: Dictionary) -> void:
	_build_facing_hero_clips(profile, "zombie", "res://assets/tokens/zombie-rest-v1.png", "")
	var z_idle := _load_trimmed_list([
		"res://assets/tokens/animations/zombie/zombie1_idle_01.png",
		"res://assets/tokens/animations/zombie/zombie1_idle_02.png",
		"res://assets/tokens/animations/zombie/zombie1_idle_03.png",
		"res://assets/tokens/animations/zombie/zombie1_tambaleo.png"
	], 1.0)
	if z_idle.size() > 0:
		profile["clips"]["idle"] = {"frames": z_idle, "fps": 3.0, "loop": true}

	var z_combat := _load_trimmed_list([
		"res://assets/tokens/animations/zombie/zombie1_acecho.png",
		"res://assets/tokens/animations/zombie/zombie1_amenaza.png",
		"res://assets/tokens/animations/zombie/zombie1_pausa.png",
		"res://assets/tokens/animations/zombie/zombie1_acecho.png"
	], 1.0)
	if z_combat.size() > 0:
		profile["clips"]["combat_idle"] = {"frames": z_combat, "fps": 4.0, "loop": true}

	var seqs: Array = [
		["walk", "res://assets/tokens/animations/zombie/zombie1_caminar_%02d.png", 1, 4, 6.0, true, 1.0],
		["run", "res://assets/tokens/animations/zombie/zombie1_moverse_rapido_%02d.png", 1, 4, 8.0, true, 1.0],
		["attack", "res://assets/tokens/animations/zombie/zombie1_ataque_%02d.png", 1, 4, 8.0, false, 1.0],
		["grapple", "res://assets/tokens/animations/zombie/zombie1_agarrar_%02d.png", 1, 4, 6.0, false, 1.0],
		["crawl", "res://assets/tokens/animations/zombie/zombie1_arrastrarse_%02d.png", 1, 4, 5.0, true, 0.56],
		["stand", "res://assets/tokens/animations/zombie/zombie1_levantarse_%02d.png", 1, 4, 6.0, false, 1.0]
	]
	for item in seqs:
		var frames := _load_trimmed_sequence(item[1], item[2], item[3], item[6])
		if frames.size() > 0:
			profile["clips"][item[0]] = {"frames": frames, "fps": item[4], "loop": item[5]}
	var z_hit := _load_trimmed_list([
		"res://assets/tokens/animations/zombie/zombie1_hit_01.png",
		"res://assets/tokens/animations/zombie/zombie1_hit_02.png",
		"res://assets/tokens/animations/zombie/zombie1_herido.png"
	], 1.0)
	if z_hit.size() > 0:
		profile["clips"]["hit"] = {"frames": z_hit, "fps": 8.0, "loop": false}
	var z_dead := _load_trimmed_single("res://assets/tokens/animations/zombie/zombie1_muerto.png", 0.40)
	if not z_dead.is_empty():
		profile["clips"]["defeated"] = {"frames": [z_dead], "fps": 1.0, "loop": true}

static func collect_required_keys(scene_root: Node, extra_keys: Array[String] = []) -> Array[String]:
	var keys: Array[String] = []
	for k in extra_keys:
		if not k.is_empty() and k not in keys and not _catalog_cache.has(k):
			keys.append(k)
	if scene_root == null:
		return keys
	var stack: Array[Node] = [scene_root]
	while not stack.is_empty():
		var n: Node = stack.pop_back()
		if "token_name" in n:
			var hidden_npc := bool(n.get("is_npc")) and n is Node3D and not (n as Node3D).visible
			var tn := str(n.get("token_name"))
			if not hidden_npc and not tn.is_empty():
				var resolved := resolve_character_key(tn)
				if not resolved.is_empty() and resolved not in keys and not _catalog_cache.has(resolved):
					keys.append(resolved)
		for child in n.get_children():
			stack.append(child)
	return keys

static func build_prewarm_job(keys: Array[String], resident_ids: Array[String] = []) -> Dictionary:
	var spr_lib = preload("res://sprites/sprite_library.gd")
	var combat_cat = preload("res://combat/combat_catalogue.gd")
	var npc_lib = preload("res://sprites/npc_sprite_library.gd")
	var reg = preload("res://characters/registry.gd")
	return {
		"keys": keys.duplicate(),
		"resident_ids": resident_ids.duplicate(),
		"res_root_abs": ProjectSettings.globalize_path("res://"),
		"sprites_dir_abs": ProjectSettings.globalize_path("res://sprites"),
		"inv_dir_abs": ProjectSettings.globalize_path("res://inventory/art"),
		"sprites_manifest": spr_lib._manifest().duplicate(true),
		"combat_data": combat_cat.load_data().duplicate(true),
		"combat_baked": combat_cat.baked.duplicate(true),
		"registry_data": reg.data().duplicate(true) if not resident_ids.is_empty() else {},
		"harpy_npc_ready": npc_lib.ready("harpy"),
		"zombie_npc_ready": npc_lib.ready("zombie")
	}

static func _load_rgba_from_abs(res_path: String, res_root_abs: String) -> Image:
	var abs_path := res_root_abs.path_join(res_path.trim_prefix("res://"))
	if not FileAccess.file_exists(abs_path):
		return null
	var img := Image.load_from_file(abs_path)
	if img != null and not img.is_empty():
		if img.is_compressed():
			img.decompress()
		if img.get_format() != Image.FORMAT_RGBA8:
			img.convert(Image.FORMAT_RGBA8)
		return img
	return null

static func run_prewarm_job(job: Dictionary) -> Dictionary:
	var keys: Array = job.get("keys", [])
	var res_root: String = str(job.get("res_root_abs", ""))
	var facing_out: Dictionary = {}
	var walks_out: Dictionary = {}
	var rows_out: Dictionary = {}
	var trimmed_out: Dictionary = {}
	var single_paths: Array[String] = []

	for k in keys:
		match k:
			"cleric":
				var src := _load_rgba_from_abs("res://assets/tokens/cleric-rest-v1.png", res_root)
				if src: facing_out["cleric"] = _extract_facing_hero_images("cleric", src)
				single_paths.append("res://assets/tokens/animations/seated/cleric-seated.png")
			"wizard":
				var src := _load_rgba_from_abs("res://assets/tokens/wizard-rest-v1.png", res_root)
				if src: facing_out["wizard"] = _extract_facing_hero_images("wizard", src)
				single_paths.append("res://assets/tokens/animations/seated/wizard-seated.png")
			"rogue":
				for d in ["n", "ne", "nw", "s", "se", "sw", "w"]:
					var w_src := _load_rgba_from_abs("res://assets/tokens/animations/maria/walks-v2/trinity-%s-walk-v2.png" % d, res_root)
					if w_src: walks_out[d] = _extract_maria_walk_images(d, w_src)
				for sheet_pair in [
					["res://assets/tokens/animations/maria/maria_run_sw_n_sheet.png", 0],
					["res://assets/tokens/animations/maria/maria_run_sw_n_sheet.png", 1],
					["res://assets/tokens/animations/maria/maria_run_w_nw_sheet.png", 0],
					["res://assets/tokens/animations/maria/maria_run_w_nw_sheet.png", 1],
					["res://assets/tokens/animations/maria/maria_dagger_sw_n_4x2.png", 0],
					["res://assets/tokens/animations/maria/maria_dagger_sw_n_4x2.png", 1],
					["res://assets/tokens/animations/maria/maria_dagger_w_nw_4x2.png", 0],
					["res://assets/tokens/animations/maria/maria_dagger_w_nw_4x2.png", 1]
				]:
					var s_path: String = sheet_pair[0]
					var r_idx: int = int(sheet_pair[1])
					var r_src := _load_rgba_from_abs(s_path, res_root)
					if r_src: rows_out["%s|%d" % [s_path, r_idx]] = _extract_1254_row_images(r_src, r_idx)
				for seq in [
					["res://assets/tokens/animations/maria/maria_idle_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_correr_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_ataque_daga_%02d.png", 1, 5],
					["res://assets/tokens/animations/maria/maria_combate_idle_%02d.png", 1, 3],
					["res://assets/tokens/animations/maria/maria_caminar_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_disparo_arco_%02d.png", 1, 6],
					["res://assets/tokens/animations/maria/maria_lanzar_daga_%02d.png", 1, 3],
					["res://assets/tokens/animations/maria/maria_interactuar_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_sigilo_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_trepar_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_nadar_%02d.png", 1, 4],
					["res://assets/tokens/animations/maria/maria_saltar_%02d.png", 1, 3],
					["res://assets/tokens/animations/maria/maria_hit_%02d.png", 1, 3],
					["res://assets/tokens/animations/maria/maria_arrastrarse_%02d.png", 1, 3],
					["res://assets/tokens/animations/maria/maria_fx_ataque_furtivo_%02d.png", 1, 2]
				]:
					for idx in range(int(seq[1]), int(seq[2]) + 1):
						single_paths.append(seq[0] % idx)
				single_paths.append("res://assets/tokens/animations/maria/maria_07_derribada.png")
				single_paths.append("res://assets/tokens/animations/maria/maria_12_inconsciente.png")
				single_paths.append("res://assets/tokens/animations/seated/rogue-seated.png")
			"harpy":
				if not bool(job.get("harpy_npc_ready", false)):
					var h_src := _load_rgba_from_abs("res://assets/tokens/harpy-rest-v1.png", res_root)
					if h_src: facing_out["harpy"] = _extract_facing_hero_images("harpy", h_src)
					for seq in [
						["res://assets/tokens/animations/harpy/harpia_idle_suelo_%02d.png", 1, 3],
						["res://assets/tokens/animations/harpy/harpia_caminar_%02d.png", 1, 4],
						["res://assets/tokens/animations/harpy/harpia_volar_%02d.png", 1, 4],
						["res://assets/tokens/animations/harpy/harpia_ataque_garra_%02d.png", 1, 4]
					]:
						for idx in range(int(seq[1]), int(seq[2]) + 1):
							single_paths.append(seq[0] % idx)
					single_paths.append("res://assets/tokens/animations/harpy/harpia_hit_01.png")
					single_paths.append("res://assets/tokens/animations/harpy/harpia_muerta.png")
			"zombie":
				if not bool(job.get("zombie_npc_ready", false)):
					var z_src := _load_rgba_from_abs("res://assets/tokens/zombie-rest-v1.png", res_root)
					if z_src: facing_out["zombie"] = _extract_facing_hero_images("zombie", z_src)
					for p in [
						"res://assets/tokens/animations/zombie/zombie1_idle_01.png",
						"res://assets/tokens/animations/zombie/zombie1_idle_02.png",
						"res://assets/tokens/animations/zombie/zombie1_idle_03.png",
						"res://assets/tokens/animations/zombie/zombie1_tambaleo.png",
						"res://assets/tokens/animations/zombie/zombie1_acecho.png",
						"res://assets/tokens/animations/zombie/zombie1_amenaza.png",
						"res://assets/tokens/animations/zombie/zombie1_pausa.png",
						"res://assets/tokens/animations/zombie/zombie1_hit_01.png",
						"res://assets/tokens/animations/zombie/zombie1_hit_02.png",
						"res://assets/tokens/animations/zombie/zombie1_herido.png",
						"res://assets/tokens/animations/zombie/zombie1_muerto.png"
					]:
						single_paths.append(p)
					for seq in [
						["res://assets/tokens/animations/zombie/zombie1_caminar_%02d.png", 1, 4],
						["res://assets/tokens/animations/zombie/zombie1_moverse_rapido_%02d.png", 1, 4],
						["res://assets/tokens/animations/zombie/zombie1_ataque_%02d.png", 1, 4],
						["res://assets/tokens/animations/zombie/zombie1_agarrar_%02d.png", 1, 4],
						["res://assets/tokens/animations/zombie/zombie1_arrastrarse_%02d.png", 1, 4],
						["res://assets/tokens/animations/zombie/zombie1_levantarse_%02d.png", 1, 4]
					]:
						for idx in range(int(seq[1]), int(seq[2]) + 1):
							single_paths.append(seq[0] % idx)

	for sp in single_paths:
		if not trimmed_out.has(sp):
			var img := _load_rgba_from_abs(sp, res_root)
			if img:
				trimmed_out[sp] = _extract_trimmed_single_img(img)

	var spr_lib = preload("res://sprites/sprite_library.gd")
	var inv_lib = preload("res://inventory/sprite_library.gd")
	var combat_cat = preload("res://combat/combat_catalogue.gd")
	var atlas_imgs: Dictionary = spr_lib.collect_cpu_images(keys, job.get("sprites_manifest", {}), str(job.get("sprites_dir_abs", "")))
	var inv_profs: Dictionary = inv_lib.collect_cpu_profiles(keys, str(job.get("inv_dir_abs", "")))
	var combat_imgs: Dictionary = combat_cat.collect_cpu_images(keys, job.get("combat_data", {}), job.get("combat_baked", {}), res_root)
	var reg_ids: Array = job.get("resident_ids", [])
	var reg_data: Dictionary = job.get("registry_data", {})
	var resident_profs: Dictionary = preload("res://characters/registry.gd").collect_resident_cpu_profiles(reg_ids, reg_data, res_root) if not reg_ids.is_empty() else {}

	return {
		"facing": facing_out,
		"walks": walks_out,
		"rows": rows_out,
		"trimmed": trimmed_out,
		"atlas_imgs": atlas_imgs,
		"inv_profs": inv_profs,
		"combat_imgs": combat_imgs,
		"resident_profs": resident_profs
	}

static func apply_prewarm_result(res: Dictionary) -> void:
	for k in res.get("facing", {}): _prewarmed_facing_imgs[k] = res["facing"][k]
	for d in res.get("walks", {}): _prewarmed_maria_walks[d] = res["walks"][d]
	for rk in res.get("rows", {}): _prewarmed_maria_rows[rk] = res["rows"][rk]
	for sp in res.get("trimmed", {}): _prewarmed_trimmed_imgs[sp] = res["trimmed"][sp]
	preload("res://sprites/sprite_library.gd").apply_cpu_images(res.get("atlas_imgs", {}))
	preload("res://inventory/sprite_library.gd").apply_cpu_profiles(res.get("inv_profs", {}))
	preload("res://combat/combat_catalogue.gd").apply_cpu_images(res.get("combat_imgs", {}))
	preload("res://characters/registry.gd").apply_resident_cpu_profiles(res.get("resident_profs", {}))
