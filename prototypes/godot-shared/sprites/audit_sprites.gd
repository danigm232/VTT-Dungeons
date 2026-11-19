extends SceneTree
## Audits the actual runtime catalogue, not filenames in an asset directory.
const HEROES := ["cleric", "rogue", "wizard", "silverfarben", "zombie"]
const DIRECTIONS := ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const MOVEMENTS := ["walk", "run", "stealth", "climb", "swim", "crawl", "jump"]
var texture_hashes := {}

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var destination := ProjectSettings.globalize_path("res://../../output/sprite-audit-20261115")
	var phase := "before"
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--phase="): phase = argument.trim_prefix("--phase=")
		if argument.begins_with("--destination="): destination = argument.trim_prefix("--destination=")
	DirAccess.make_dir_recursive_absolute(destination)
	var catalogue = load("res://scripts/character_sprite_catalog.gd")
	var report := {"phase": phase, "minimum_movement_frames": 8, "characters": {}, "short_movements": [], "empty_frames": [], "runtime": "Godot actual CharacterSpriteCatalog"}
	for hero in HEROES:
		var profile: Dictionary = catalogue.get_character_clips(hero)
		var summary := {}
		for bucket in ["dir_idle", "dir_walk", "dir_run", "dir_attack", "dir_torch_walk", "clips"]:
			summary[bucket] = {}
			for name in profile.get(bucket, {}):
				var clip: Dictionary = profile[bucket][name]
				var frames: Array = clip.get("frames", [])
				var hashes := {}
				var sizes: Array = []
				for index in range(frames.size()):
					var texture: Texture2D = frames[index].get("tex")
					if texture == null:
						report.empty_frames.append([hero, bucket, name, index])
						continue
					var image: Image = texture.get_image()
					var bounds := image.get_used_rect()
					if bounds.size.x == 0 or bounds.size.y == 0: report.empty_frames.append([hero, bucket, name, index])
					var texture_id := texture.get_instance_id()
					if not texture_hashes.has(texture_id):
						var hash := HashingContext.new()
						hash.start(HashingContext.HASH_SHA256)
						hash.update(image.get_data())
						texture_hashes[texture_id] = hash.finish().hex_encode()
					hashes[texture_hashes[texture_id]] = true
					sizes.append([texture.get_width(), texture.get_height(), frames[index].get("height_scale", 1)])
				summary[bucket][name] = {"frames": frames.size(), "distinct_images": hashes.size(), "fps": clip.get("fps", 1), "sizes": sizes}
				if (bucket in ["dir_walk", "dir_run", "dir_torch_walk"] or (bucket == "clips" and name in MOVEMENTS)) and (frames.size() < 8 or hashes.size() < 8):
					report.short_movements.append([hero, bucket, name, frames.size(), hashes.size()])
		report.characters[hero] = summary
		_save_sheet(profile, hero, phase, destination)
		print("SPRITE AUDIT ", hero, " complete")
	var file := FileAccess.open(destination.path_join(phase + ".json"), FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "\t"))
	print("SPRITE AUDIT ", phase, " short=", report.short_movements.size(), " empty=", report.empty_frames.size())
	quit(0 if phase == "before" or (report.short_movements.is_empty() and report.empty_frames.is_empty()) else 1)

func _save_sheet(profile: Dictionary, hero: String, phase: String, destination: String) -> void:
	var groups: Array = []
	for direction in DIRECTIONS: groups.append(profile.get("dir_walk", {}).get(direction, {}))
	for state in MOVEMENTS.slice(1): groups.append(profile.get("clips", {}).get(state, {}))
	var sheet := Image.create(1280, groups.size() * 180, false, Image.FORMAT_RGBA8)
	sheet.fill(Color("172529"))
	for row in range(groups.size()):
		var frames: Array = groups[row].get("frames", [])
		for column in range(8):
			if frames.is_empty(): continue
			var frame: Dictionary = frames[mini(column, frames.size() - 1)]
			var image: Image = frame.tex.get_image().duplicate()
			if image.is_compressed(): image.decompress()
			image.clear_mipmaps()
			var scale := minf(140.0 / image.get_width(), 158.0 / image.get_height())
			image.resize(maxi(1, int(image.get_width() * scale)), maxi(1, int(image.get_height() * scale)), Image.INTERPOLATE_LANCZOS)
			if groups[row].get("flip_h", false) or frame.get("flip_h", false): image.flip_x()
			sheet.blend_rect(image, Rect2i(Vector2i.ZERO, image.get_size()), Vector2i(column * 160 + (160 - image.get_width()) / 2, row * 180 + 170 - image.get_height()))
	sheet.save_png(destination.path_join(hero + "-" + phase + ".png"))
