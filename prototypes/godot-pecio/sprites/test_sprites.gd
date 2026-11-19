extends SceneTree
var checks := 0
var failures: Array = []

func check(value: bool, label: String) -> void:
	checks += 1
	if not value: failures.append(label); printerr("SPRITE FAIL ", label)

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var catalogue = load("res://scripts/character_sprite_catalog.gd")
	var packed: PackedScene = load("res://scenes/player_token.tscn")
	var container := Node3D.new()
	root.add_child(container)
	for hero in ["cleric", "rogue", "wizard", "silverfarben", "zombie"]:
		var profile: Dictionary = catalogue.get_character_clips(hero)
		for bucket in ["dir_walk", "dir_run", "dir_attack"]:
			for direction in catalogue.DIRS:
				var clip: Dictionary = profile.get(bucket, {}).get(direction, {})
				check(clip.get("frames", []).size() >= 8, hero + " " + bucket + " " + direction + " has eight frames")
				check(not clip.get("reuses_walk", false), hero + " " + bucket + " " + direction + " is authored")
				var hashes := {}
				for frame in clip.get("frames", []):
					var texture: Texture2D = frame.get("tex")
					check(texture != null, hero + " usable frame")
					if texture:
						var image: Image = texture.get_image()
						var bounds := image.get_used_rect()
						check(bounds.size.x > 0 and bounds.size.y > 0, hero + " nonempty frame")
						var hash := HashingContext.new()
						hash.start(HashingContext.HASH_SHA256); hash.update(image.get_data())
						hashes[hash.finish().hex_encode()] = true
				check(hashes.size() >= 8, hero + " " + bucket + " " + direction + " eight distinct images")
		for state in ["stealth", "climb", "swim", "crawl", "jump"]:
			check(profile.clips.get(state, {}).get("frames", []).size() >= 8, hero + " complete " + state)
		for clip in profile.get("dir_torch_walk", {}).values(): check(clip.frames.size() >= 8, hero + " complete torch stride")
		var token = packed.instantiate()
		token.token_name = hero
		token.has_carried_light = false
		container.add_child(token)
		token.set_physics_process(false)
		token._resolve_and_apply_clip("walk", "n", true)
		token.anim_frame_idx = 3
		token.anim_timer = .5 / token.active_clip_fps
		token._resolve_and_apply_clip("run", "w", true)
		check(token.anim_frame_idx == 3 and token.anim_timer > 0, hero + " turn/run preserves half-stride")
		var before: int = token.anim_frame_idx
		if token.has_method("process_frame_animation"): token.process_frame_animation(1.01 / token.active_clip_fps)
		else: token._process_frame_animation(1.01 / token.active_clip_fps)
		check(token.anim_frame_idx != before, hero + " runtime advances frame")
		token.facing_dir = "e"
		token.play_action_animation("attack", .1)
		check(token.active_clip_frames.size() >= 8 and token.action_lock_timer >= .79, hero + " attack can finish all poses")
		token._resolve_and_apply_clip("crawl", "e", true)
		token._apply_procedural_motion(.2, Vector2.RIGHT, "crawl")
		check(token.sprite.scale.is_equal_approx(Vector3.ONE) and absf(token.sprite.rotation.z) < .001, hero + " drawn crawl is not rotated/deformed")
		var image: Image = token.sprite.texture.get_image()
		var empty_bottom: float = image.get_height() - image.get_used_rect().end.y
		var foot_y: float = token.sprite.position.y - image.get_height() * token.sprite.pixel_size * .5 + empty_bottom * token.sprite.pixel_size
		check(absf(foot_y) < .035, hero + " body touches ground instead of floating")
		print("SPRITE CONTRACT ", hero, " complete")
	var destination := ProjectSettings.globalize_path("res://../../output/sprite-audit-20261115")
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--destination="): destination = argument.trim_prefix("--destination=")
	DirAccess.make_dir_recursive_absolute(destination)
	FileAccess.open(destination.path_join("tests.json"), FileAccess.WRITE).store_string(JSON.stringify({"checks": checks, "failures": failures}, "\t"))
	print("SPRITE CONTRACT ", checks, " checks; ", failures.size(), " failures")
	container.free()
	quit(0 if failures.is_empty() else 1)
