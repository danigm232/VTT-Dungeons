@tool
extends SceneTree

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	print("==================================================")
	print("AUTOMATED VERIFICATION: CABIN DOORS ALIGNMENT")
	print("==================================================")
	
	var main_scene = load("res://scenes/main.tscn")
	if not main_scene:
		printerr("FAIL: Could not load main.tscn")
		quit(1)
		return
		
	var root_node = main_scene.instantiate()
	root.add_child(root_node)
	
	await process_frame
	await process_frame
	await physics_frame
	
	await test_doors(root_node)

func test_doors(root_node: Node) -> void:
	var doors = {
		"DoorC4": {"expected_pos": Vector3(-13.5, 0, -1.8), "expected_swing": -1.0, "expected_hinge": -1.0},
		"DoorC5": {"expected_pos": Vector3(-13.5, 0, 5.2), "expected_swing": -1.0, "expected_hinge": 1.0},
		"DoorC6": {"expected_pos": Vector3(13.5, 0, -1.8), "expected_swing": 1.0, "expected_hinge": -1.0},
		"DoorC7": {"expected_pos": Vector3(13.5, 0, 5.2), "expected_swing": 1.0, "expected_hinge": 1.0}
	}
	
	var all_ok = true
	
	for door_name in doors.keys():
		var expected = doors[door_name]
		var door = root_node.find_child(door_name, true, false)
		if not door:
			printerr("FAIL: Door node not found: ", door_name)
			all_ok = false
			continue
			
		print("\n--- Verifying ", door_name, " (", door.door_title, ") ---")
		print("  Position: ", door.position, " (Expected: ", expected["expected_pos"], ")")
		if door.position.distance_to(expected["expected_pos"]) > 0.001:
			printerr("FAIL: Position mismatch on ", door_name)
			all_ok = false
			
		print("  swing_side: ", door.swing_side, " (Expected: ", expected["expected_swing"], ")")
		print("  hinge_side: ", door.hinge_side, " (Expected: ", expected["expected_hinge"], ")")
		if door.swing_side != expected["expected_swing"] or door.hinge_side != expected["expected_hinge"]:
			printerr("FAIL: swing_side or hinge_side mismatch on ", door_name)
			all_ok = false
			
		# Check door frame assembly
		var frame = door.get_node_or_null("DoorFrameAssembly")
		if not frame:
			printerr("FAIL: DoorFrameAssembly missing on ", door_name)
			all_ok = false
		else:
			print("  DoorFrameAssembly: OK (children count: ", frame.get_child_count(), ")")
			
		# Check door leaf hinge
		var leaf = door.get_node_or_null("DoorLeafHinge")
		if not leaf:
			printerr("FAIL: DoorLeafHinge missing on ", door_name)
			all_ok = false
		else:
			print("  DoorLeafHinge: OK")
			print("  Initial (Closed) Leaf Rotation: ", leaf.rotation_degrees)
			if abs(leaf.rotation_degrees.y) > 0.001:
				printerr("FAIL: Initial rotation should be 0 when closed!")
				all_ok = false
				
			# Test open angle
			var open_rot = door.get_open_rotation_deg()
			print("  Calculated Open Rotation: ", open_rot, " deg")
			
			door.toggle_door()
			door.update_door_state(true) # instant apply
			print("  After toggle_door(): is_open = ", door.is_open, ", leaf rot = ", leaf.rotation_degrees.y)
			if abs(leaf.rotation_degrees.y - open_rot) > 0.001:
				printerr("FAIL: Leaf rotation did not match open_rot!")
				all_ok = false
				
			# Toggle back to close
			door.toggle_door()
			door.update_door_state(true)
			print("  After toggle back: is_open = ", door.is_open, ", leaf rot = ", leaf.rotation_degrees.y)
			if abs(leaf.rotation_degrees.y) > 0.001:
				printerr("FAIL: Leaf rotation did not return to 0!")
				all_ok = false
				
		# Check static body collision
		var sb = door.find_child("DoorStaticBody", true, false)
		if not sb:
			printerr("FAIL: DoorStaticBody missing on ", door_name)
			all_ok = false
		else:
			print("  DoorStaticBody: OK")

	# Verificar mapeo de teclado sin colisiones: T=Interactuar, E=Orbitar cámara, V=Antorcha
	var door_c4 := root_node.find_child("DoorC4", true, false) as InteractiveDoor
	var inv_mgr: Node = root_node.find_child("InventoryManager", true, false)
	var cam := root_node.find_child("TacticalCamera", true, false) as TacticalCamera
	if door_c4 and inv_mgr and cam:
		door_c4.is_player_nearby = true
		door_c4.update_prompt()
		if not inv_mgr.prompt_text.begins_with("[T]"):
			printerr("FAIL [Keymap]: Expected '[T]' prompt, got: ", inv_mgr.prompt_text)
			all_ok = false

		var ev_e := InputEventKey.new()
		ev_e.keycode = KEY_E
		ev_e.pressed = true
		cam._unhandled_input(ev_e)
		door_c4._unhandled_input(ev_e)
		if door_c4.is_open:
			printerr("FAIL [Keymap]: KEY_E must orbit camera, not open DoorC4!")
			all_ok = false
		if absf(cam.orbit_step - 1.0) > 0.01:
			printerr("FAIL [Keymap]: KEY_E did not orbit TacticalCamera!")
			all_ok = false

		var ev_t := InputEventKey.new()
		ev_t.keycode = KEY_T
		ev_t.pressed = true
		door_c4._unhandled_input(ev_t)
		inv_mgr._unhandled_input(ev_t)
		if not door_c4.is_open:
			printerr("FAIL [Keymap]: KEY_T failed to open DoorC4!")
			all_ok = false
		if inv_mgr.items["torch"]["equipped"]:
			printerr("FAIL [Keymap]: KEY_T should not toggle torch!")
			all_ok = false

		var ev_v := InputEventKey.new()
		ev_v.keycode = KEY_V
		ev_v.pressed = true
		var vtt_ui := root_node.find_child("VttRoleUi", true, false)
		if inv_mgr.external_ui_managed and vtt_ui and vtt_ui.has_method("_unhandled_input"):
			vtt_ui._unhandled_input(ev_v)
			await process_frame
			await process_frame
		else:
			inv_mgr._unhandled_input(ev_v)
		if not inv_mgr.items["torch"]["equipped"]:
			printerr("FAIL [Keymap]: KEY_V failed to equip/toggle torch!")
			all_ok = false
		print("  Keymap (T=Interact, E=Orbit+45, V=Torch): OK")

	print("\n==================================================")
	if all_ok:
		print("RESULT: ALL 4 CABIN DOORS VERIFIED AND PROPERLY ALIGNED!")
		quit(0)
	else:
		printerr("RESULT: VERIFICATION FAILED WITH ERRORS")
		quit(1)
