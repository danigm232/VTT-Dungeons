extends SceneTree
var passed: int = 0
var failed: int = 0
func _initialize() -> void: _run.call_deferred()
func check(value: bool, message: String) -> void:
	if value: passed += 1
	else:
		failed += 1
		printerr("FAIL: ", message)
func prepared(loading) -> void:
	var until = Time.get_ticks_msec() + 120000
	while not loading.session.projector_ready and Time.get_ticks_msec() < until: await create_timer(0.02).timeout
	check(loading.session.projector_ready, "Actual resource and scene readiness")
	check(loading.panel.visible, "Presentation persists until Continue")
func enter(loading) -> void:
	check(loading.session.continue_client("desktop", loading.session.entry.id), "Prepared local player may Continue")
	await loading.map_entered
	check(not loading.panel.visible, "Fade finishes before control returns")
func _run() -> void:
	await process_frame
	var loading = root.get_node("SkillLoading")
	var transition = root.get_node("MapTransition")
	loading.load_map("res://scenes/main.tscn", "Retiro", "initial")
	check(not loading.session.projector_ready, "No fabricated readiness before initial load")
	await prepared(loading)
	await enter(loading)
	var initial = loading.session.entry.id
	var exit_node
	for candidate in transition.get_scene_exits(current_scene):
		if candidate.exit_id == "pleamar-low": exit_node = candidate
	check(exit_node != null, "Canonical map exit retained")
	if exit_node == null: quit(1); return
	var expected_facing = exit_node.entry_facing
	check(transition.begin_transition(exit_node, current_scene.get_node("PlayerToken")), "Real MapTransition starts native loading")
	check(loading.session.entry.id != initial, "New unique entry per map change")
	check(not loading.session.roll("desktop", initial), "Old map roll rejected")
	await prepared(loading)
	check(current_scene.name == "PleamarCoves", "Destination scene installed")
	var spawn = current_scene.find_child("Spawn_from_pleamar_low", true, false)
	var actor = current_scene.get_node("PlayerToken")
	check(spawn != null and actor.global_position.distance_to(spawn.global_position) < 0.75, "Arrival spawn preserved")
	check(actor.facing_dir == expected_facing, "Arrival orientation preserved: " + str(expected_facing))
	await enter(loading)
	check(not transition.is_transitioning, "MapTransition completes after shared gate")
	var back
	for candidate in transition.get_scene_exits(current_scene):
		if candidate.exit_id == "back-pleamar-low": back = candidate
	check(back != null, "Return exit retained")
	if back == null: quit(1); return
	check(transition.begin_transition(back, actor), "Return starts a second native entry")
	await prepared(loading)
	check(current_scene.name == "Main", "Return to original map")
	await enter(loading)
	print("MAP_LOADING_TESTS ", passed, " passed; ", failed, " failed")
	quit(0 if failed == 0 else 1)
