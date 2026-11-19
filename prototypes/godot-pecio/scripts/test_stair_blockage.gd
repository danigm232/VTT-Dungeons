@tool
extends SceneTree

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	print("\n==================================================")
	print("AUTOMATED VERIFICATION: STAIR TRANSITIONS (4 FLIGHTS)")
	print("==================================================")

	var main_scene = load("res://scenes/main.tscn")
	if not main_scene:
		printerr("FAIL: Could not load main.tscn")
		quit(1)
		return

	var root_node = main_scene.instantiate()
	root.add_child(root_node)

	# Allow scene tree and physics server to initialize
	await process_frame
	await process_frame
	await physics_frame

	var player = root_node.find_child("PlayerToken", true, false) as CharacterBody3D
	if not player:
		printerr("FAIL: PlayerToken not found")
		quit(1)
		return

	var test_stairs = [
		{"name": "Fore Port (C1 -> C2 Ascend)", "start": Vector3(9.2, 0.8, -3.5), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": 2.7},
		{"name": "Fore Starboard (C1 -> C2 Ascend)", "start": Vector3(9.2, 0.8, 3.5), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": 2.7},
		{"name": "Aft Port (C1 -> C3 Ascend)", "start": Vector3(-9.2, 0.8, -3.5), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": 2.7},
		{"name": "Aft Starboard (C1 -> C3 Ascend)", "start": Vector3(-9.2, 0.8, 3.5), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": 2.7},
		{"name": "Fore Port (C2 -> C1 Descend)", "start": Vector3(14.5, 3.1, -3.5), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": -0.2},
		{"name": "Fore Starboard (C2 -> C1 Descend)", "start": Vector3(14.5, 3.1, 3.5), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": -0.2},
		{"name": "Aft Port (C3 -> C1 Descend)", "start": Vector3(-14.5, 3.1, -3.5), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": -0.2},
		{"name": "Aft Starboard (C3 -> C1 Descend)", "start": Vector3(-14.5, 3.1, 3.5), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 5.5, "target_y": -0.2},
		{"name": "Center Well (C1 -> C8 Descend)", "start": Vector3(-2.5, 0.8, 5.25), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 7.0, "target_y": -2.5},
		{"name": "Center Well (C8 -> C1 Ascend)", "start": Vector3(5.5, -2.5, 5.25), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 7.0, "target_y": -0.2},
		{"name": "Hold Well (C8 -> C9 Descend)", "start": Vector3(11.8, -2.5, 2.25), "dir": Vector3(1.0, 0.0, 0.0), "min_dist": 7.0, "target_y": -5.5},
		{"name": "Hold Well (C9 -> C8 Ascend)", "start": Vector3(19.6, -5.8, 2.25), "dir": Vector3(-1.0, 0.0, 0.0), "min_dist": 7.0, "target_y": -3.5}
	]

	var all_ok = true

	for st in test_stairs:
		print("\n--- Testing: ", st["name"], " ---")
		player.position = st["start"]
		player.velocity = Vector3.ZERO
		# Settle on deck first
		for _s in range(10):
			await physics_frame
			player.velocity = Vector3(0, -4.0, 0)
			player.move_and_slide()
		var initial_x = player.position.x

		# Move for 140 physics frames (~2.33s) so longer 6m stairs finish full transition
		for step in range(140):
			await physics_frame
			player.velocity = st["dir"] * 4.5 + Vector3(0, -1.5, 0)
			player.move_and_slide()

		var delta_x = abs(player.position.x - initial_x)
		var end_y = player.position.y
		var climb_ok = delta_x >= st["min_dist"]
		if st["name"].find("Ascend") != -1:
			climb_ok = climb_ok and (end_y >= st["target_y"])
		else:
			climb_ok = climb_ok and (end_y <= st["target_y"] + 0.6)
		print("  Moved X distance: ", "%.2f" % delta_x, "m (target >= ", st["min_dist"], "m, final local pos: ", player.position, ")")
		if not climb_ok:
			printerr("  BLOCKED! Player could not traverse stair!")
			all_ok = false
		else:
			print("  PASSED: Traversal smooth and unhindered!")

	print("\n==================================================")
	if all_ok:
		print("RESULT: ALL 4 STAIR FLIGHTS 100% WALKABLE IN BOTH DIRECTIONS!")
		print("==================================================")
		quit(0)
	else:
		printerr("RESULT: STAIR TRAVERSAL TEST FAILED!")
		print("==================================================")
		quit(1)
