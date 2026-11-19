extends SceneTree

const CharacterSpriteCatalog = preload("res://scripts/character_sprite_catalog.gd")

func _initialize() -> void:
	var packed: PackedScene = load("res://scenes/main.tscn")
	if not packed:
		printerr("FAIL: Could not load res://scenes/main.tscn")
		quit(1)
		return

	var root_node := packed.instantiate()
	root.add_child(root_node)
	await process_frame
	await process_frame

	var ok := true
	var cleric := root_node.find_child("PlayerToken", true, false) as PlayerToken
	var rogue := root_node.find_child("RogueToken", true, false) as PlayerToken
	var wizard := root_node.find_child("WizardToken", true, false) as PlayerToken
	var harpy := root_node.find_child("HarpyToken", true, false) as PlayerToken
	var zombie := root_node.find_child("ZombieToken", true, false) as PlayerToken

	for label_tok in [["Cleric", cleric], ["Rogue", rogue], ["Wizard", wizard], ["Harpy", harpy], ["Zombie", zombie]]:
		if not label_tok[1]:
			printerr("FAIL: Missing token node ", label_tok[0])
			ok = false

	# 1. Verificar Maria Trinity (8 direcciones walk/run/attack + todas las acciones de Babylon)
	if rogue:
		var prof := rogue.char_profile
		var d_walk: Dictionary = prof.get("dir_walk", {})
		var d_run: Dictionary = prof.get("dir_run", {})
		var d_atk: Dictionary = prof.get("dir_attack", {})
		var d_idle: Dictionary = prof.get("dir_idle", {})
		for d in CharacterSpriteCatalog.DIRS:
			if not d_walk.has(d) or d_walk[d]["frames"].size() < 8:
				printerr("FAIL [Rogue]: dir_walk missing/incomplete for ", d)
				ok = false
			if not d_run.has(d) or d_run[d]["frames"].size() < 4:
				printerr("FAIL [Rogue]: dir_run missing/incomplete for ", d)
				ok = false
			if not d_atk.has(d) or d_atk[d]["frames"].size() < 4:
				printerr("FAIL [Rogue]: dir_attack missing/incomplete for ", d)
				ok = false
			if not d_idle.has(d) or d_idle[d]["frames"].size() < 1:
				printerr("FAIL [Rogue]: dir_idle missing for ", d)
				ok = false

		var clips: Dictionary = prof.get("clips", {})
		var expected_counts := {
			"idle": 4, "combat_idle": 3, "walk": 4, "run": 4, "attack": 5,
			"attack_arrow": 6, "attack_throw": 3, "interact": 4, "stealth": 4,
			"dodge": 4, "climb": 4, "swim": 4, "jump": 3, "hit": 3,
			"prone": 1, "crawl": 3, "defeated": 1, "sit": 1
		}
		for sname in expected_counts:
			if not clips.has(sname) or clips[sname]["frames"].size() < expected_counts[sname]:
				printerr("FAIL [Rogue]: clip ", sname, " missing or short: got ", clips.get(sname, {}).get("frames", []).size())
				ok = false
		if prof.get("sneak_fx", []).size() < 2:
			printerr("FAIL [Rogue]: sneak_fx missing")
			ok = false

	# 2. Verificar Clériga (Mia) y Mago (Mike): 8 rumbos aislados por BFS alfa + pose sentado + estados procedurales
	for hero_pair in [["Cleric", cleric], ["Wizard", wizard]]:
		var hname: String = hero_pair[0]
		var htok: PlayerToken = hero_pair[1]
		if not htok:
			continue
		var hprof := htok.char_profile
		var hd_idle: Dictionary = hprof.get("dir_idle", {})
		var textures_seen := {}
		for d in CharacterSpriteCatalog.DIRS:
			if not hd_idle.has(d) or hd_idle[d]["frames"].size() < 1:
				printerr("FAIL [", hname, "]: missing directional facing ", d)
				ok = false
			else:
				var f: Dictionary = hd_idle[d]["frames"][0]
				var t: Texture2D = f.get("tex", null)
				if not t:
					printerr("FAIL [", hname, "]: null texture for facing ", d)
					ok = false
				else:
					textures_seen[t.get_instance_id()] = true
		if textures_seen.size() < 8:
			printerr("FAIL [", hname, "]: expected 8 distinct isolated facing textures, got ", textures_seen.size())
			ok = false
		var hclips: Dictionary = hprof.get("clips", {})
		if not hclips.has("sit") or hclips["sit"]["frames"].size() < 1:
			printerr("FAIL [", hname, "]: missing sit pose")
			ok = false

	# 3. Verificar simulación de movimiento, salto, sigilo, nado, sentado, cuerpo a tierra, ataque y escalado
	if rogue:
		rogue.set_active(true)
		rogue.facing_dir = "ne"
		rogue._resolve_and_apply_clip("walk", "ne", true)
		var f0_tex := rogue.sprite.texture
		rogue.input_override = Vector2(0.7, -0.7)
		rogue._physics_process(0.10)
		rogue._physics_process(0.10)
		if rogue.current_anim != "walk":
			printerr("FAIL [Sim]: expected walk state, got ", rogue.current_anim)
			ok = false
		if rogue.sprite.texture == f0_tex and rogue.active_clip_frames.size() > 1:
			printerr("FAIL [Sim]: sprite frame did not advance during walk")
			ok = false
		rogue.input_override = Vector2.ZERO

		# Probar animación durante transición (ej. trepando a la Cofa C10)
		rogue.is_transitioning = true
		rogue.play_action_animation("climb", 1.0)
		var c0 := rogue.sprite.texture
		rogue._physics_process(0.20)
		rogue._physics_process(0.20)
		if rogue.sprite.texture == c0:
			printerr("FAIL [Sim]: climb animation froze during is_transitioning")
			ok = false
		rogue.is_transitioning = false
		rogue.play_action_animation("idle")

		# Probar postura sentado y derribado (altura reducida y en suelo)
		rogue.play_action_animation("sit")
		if rogue.current_anim != "sit" or rogue.current_height_scale > 0.85:
			printerr("FAIL [Sim]: rogue sit height scale unexpected ", rogue.current_height_scale)
			ok = false
		rogue.play_action_animation("prone")
		if rogue.current_anim != "prone" or rogue.current_height_scale > 0.60:
			printerr("FAIL [Sim]: rogue prone height scale unexpected ", rogue.current_height_scale)
			ok = false
		rogue.play_action_animation("idle")

	if cleric:
		cleric.play_action_animation("attack", 0.5)
		if not cleric.action_vfx_sprite or not cleric.action_vfx_sprite.visible:
			printerr("FAIL [Sim]: Cleric attack VFX sprite did not activate")
			ok = false
		cleric.play_action_animation("sit")
		if cleric.current_anim != "sit":
			printerr("FAIL [Sim]: Cleric failed to enter sit state")
			ok = false
		cleric.play_action_animation("idle")

	# 4. Verificar NPCs (Arpía y Zombi) con sus ciclos completos
	if zombie and zombie.char_profile.get("clips", {}).size() < 8:
		printerr("FAIL [Zombie]: expected full Babylon action clips (>=8), got ", zombie.char_profile.get("clips", {}).size())
		ok = false
	if harpy and harpy.char_profile.get("clips", {}).size() < 6:
		printerr("FAIL [Harpy]: expected full Babylon action clips (>=6), got ", harpy.char_profile.get("clips", {}).size())
		ok = false

	if ok:
		print("==================================================")
		print("RESULT: ALL PLAYER & NPC SPRITES/ANIMATIONS VERIFIED!")
		print("==================================================")
	quit(0 if ok else 1)
