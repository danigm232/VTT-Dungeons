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
		"rogue":
			_build_maria_clips(profile)
		"cleric":
			_build_facing_hero_clips(profile, "cleric", "res://assets/tokens/cleric-rest-v1.png", "res://assets/tokens/animations/seated/cleric-seated.png")
		"wizard":
			_build_facing_hero_clips(profile, "wizard", "res://assets/tokens/wizard-rest-v1.png", "res://assets/tokens/animations/seated/wizard-seated.png")
		"harpy":
			_build_harpy_clips(profile)
		"zombie":
			_build_zombie_clips(profile)

	_catalog_cache[char_key] = profile
	return profile

static func resolve_character_key(token_name: String) -> String:
	var low := token_name.to_lower()
	if "rogue" in low or "maria" in low or "trinity" in low:
		return "rogue"
	if "wizard" in low or "mike" in low:
		return "wizard"
	if "cleric" in low or "mia" in low or "hero" in low:
		return "cleric"
	if "harpy" in low or "harpia" in low:
		return "harpy"
	if "zombie" in low:
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
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)

static func _trim_alpha_bounds(img: Image, min_alpha_byte: int = 24) -> Rect2i:
	var w := img.get_width()
	var h := img.get_height()
	var data := img.get_data()
	var min_x := w
	var min_y := h
	var max_x := -1
	var max_y := -1
	var idx := 3
	for y in range(h):
		for x in range(w):
			if data[idx] >= min_alpha_byte:
				if x < min_x: min_x = x
				if x > max_x: max_x = x
				if y < min_y: min_y = y
				if y > max_y: max_y = y
			idx += 4
	if max_x < min_x or max_y < min_y:
		return Rect2i(0, 0, w, h)
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
	var src := _load_raw_image(res_path)
	if not src:
		return {}
	var bounds := _trim_alpha_bounds(src, 20)
	var trimmed := Image.create(bounds.size.x, bounds.size.y, false, Image.FORMAT_RGBA8)
	trimmed.blit_rect(src, bounds, Vector2i.ZERO)
	return {"tex": _make_tex(trimmed), "height_scale": height_scale, "flip_h": false}

static func _build_facing_hero_clips(profile: Dictionary, key: String, rest_path: String, seated_path: String) -> void:
	var src := _load_raw_image(rest_path)
	if src:
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

		for i in range(DIRS.size()):
			var img: Image = cropped_imgs[i]
			var pad := Image.create(max_w, max_h, false, Image.FORMAT_RGBA8)
			var dst_x := int((max_w - img.get_width()) * 0.5)
			var dst_y := max_h - img.get_height()
			pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(dst_x, dst_y))
			var tex := _make_tex(pad)
			var clip_arr: Array[Dictionary] = [{"tex": tex, "height_scale": 1.0, "flip_h": false}]
			profile["dir_idle"][DIRS[i]] = {"frames": clip_arr, "fps": 1.0, "flip_h": false}
			profile["dir_walk"][DIRS[i]] = {"frames": clip_arr, "fps": 6.0, "flip_h": false}
			profile["dir_run"][DIRS[i]] = {"frames": clip_arr, "fps": 8.0, "flip_h": false}
			profile["dir_attack"][DIRS[i]] = {"frames": clip_arr, "fps": 8.0, "flip_h": false}

	var sit_frame := _load_trimmed_single(seated_path, 0.78)
	if not sit_frame.is_empty():
		profile["clips"]["sit"] = {"frames": [sit_frame], "fps": 1.0, "loop": true}

static func _build_maria_clips(profile: Dictionary) -> void:
	# 1. Caminar 8-direccional (trinity-*-walk-v2, 8 fotogramas a 16 fps, espejando W -> E)
	for d in ["n", "ne", "nw", "s", "se", "sw", "w"]:
		var walk_path := "res://assets/tokens/animations/maria/walks-v2/trinity-%s-walk-v2.png" % d
		var spec: Dictionary = TRINITY_WALK_V2[d]
		var frames_data: Array = spec["frames"]
		var ref_h := int(spec["ref_h"])
		var src := _load_raw_image(walk_path)
		if src:
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
			var built_frames: Array[Dictionary] = []
			for item in cropped_list:
				var img: Image = item["img"]
				var ax := float(item["ax"])
				var pad := Image.create(out_w, max_h, false, Image.FORMAT_RGBA8)
				var dx := clampi(int(round(half_w - ax)), 0, out_w - img.get_width())
				var dy := max_h - img.get_height()
				pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(dx, dy))
				var tex := _make_tex(pad)
				built_frames.append({"tex": tex, "height_scale": float(max_h) / float(ref_h), "flip_h": false})

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

static func _slice_1254_sheet_row(res_path: String, row: int) -> Array[Dictionary]:
	var src := _load_raw_image(res_path)
	if not src:
		return []
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

	var out: Array[Dictionary] = []
	for img in cropped_imgs:
		var pad := Image.create(max_w, max_h, false, Image.FORMAT_RGBA8)
		pad.blit_rect(img, Rect2i(0, 0, img.get_width(), img.get_height()), Vector2i(int((max_w - img.get_width()) * 0.5), max_h - img.get_height()))
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
