extends RefCounted

const Agenda = preload("res://scripts/retreat_routine_directory.gd")
const ActivityTools = preload("res://scripts/retreat_activity_tools.gd")

const RANGE := 2.45
const CUES := {
	"page": [Vector3.ZERO, Vector3(0, 0, 1.15), 0.76],
	"write": [Vector3(-0.075, 0.025, 0.12), Vector3(0.42, 0, -0.23), 1.04],
	"roll": [Vector3(-0.035, 0.035, 0.07), Vector3(0.8, 0, 0), 0.70],
	"slide": [Vector3(0, 0.014, 0.11), Vector3(0, 0.14, 0), 0.72],
	"serve": [Vector3(0.10, 0.06, 0.07), Vector3(0, 0.09, 0.04), 0.87],
	"taste": [Vector3(0.02, 0.115, 0.06), Vector3(0.13, 0, 0), 1.04],
	"inspect": [Vector3(0, 0.045, 0.07), Vector3(0.08, 0.16, 0.17), 0.80],
	"tilt": [Vector3(0, 0.065, 0.035), Vector3(0, 0, -0.31), 0.80],
	"sort": [Vector3(-0.06, 0.045, -0.04), Vector3(0, 0.33, 0), 0.72],
	"polish": [Vector3(0.014, 0.04, 0.06), Vector3(0.08, 0.28, -0.10), 0.92],
	"turn": [Vector3.ZERO, Vector3(0, 0.64, 0.15), 0.96],
	"cloth": [Vector3(0.015, 0.052, 0), Vector3(0.055, 0, -0.13), 1.12],
	"water": [Vector3.ZERO, Vector3(0.08, 0, -0.64), 1.28],
	"chest": [Vector3(0, 0.014, 0), Vector3(-0.22, 0, 0), 0.62],
}

var targets: Dictionary = {}
var _motions: Dictionary = {}
var _owner: Node3D
var _map: Node3D
var tools := ActivityTools.new()

func bind(owner: Node3D, map: Node3D, workbench: Node, stove: Node3D, incense: Node3D) -> void:
	_owner = owner
	_map = map
	tools.bind(owner)
	for node in map.get_tree().get_nodes_in_group("retreat_routine_props"):
		if map.is_ancestor_of(node):
			targets[str(node.name)] = node
	for id: String in Agenda.NIGHT_REST:
		var support := map.find_child(Agenda.NIGHT_REST[id][0], true, false)
		if is_instance_valid(support):
			var prop_name := "Interactive_Hammock" if str(support.name).begins_with("KoboldHammock_") else "Interactive_Bed"
			_register("@rest/" + id, support.get_node_or_null(prop_name))
	_register("MeridianRing", map.find_child("MeridianRing", true, false))
	_register("@altar", map.find_child("BahamutOfferingAltar", true, false))
	for key: String in ["DressedAshlarBlock", "A3_PantryShelf", "BleppDaggerPeg", "MumpoHiddenCoin"]:
		_register(key, map.find_child(key, true, false))
	_register("@workbench", workbench)
	_register("@stove", stove)
	_register("@incense", incense)
	_register("@canaries", map.layout_builder)
	var well := map.find_child("MonasticFountainWell", true, false)
	if well:
		_register("@well", well.get_node_or_null("Interactive_Well"))
	var chest := map.find_child("BoundChest_132_84", true, false)
	if chest:
		_register("@east_chest", chest.get_node_or_null("Interactive_Chest"))

func _register(id: String, node: Node) -> void:
	if is_instance_valid(node):
		targets[id] = node

func anchor(id: String) -> Vector3:
	var node: Node3D = targets.get(id)
	return node.global_position if is_instance_valid(node) and id != "@canaries" else Vector3.INF

func working_anchor(id: String, verb: String) -> Vector3:
	if verb == "metalwork":
		return anchor("RetreatMylaWorkpiece")
	var target: Node3D = targets.get(id)
	if verb == "stonework" and is_instance_valid(target):
		return target.to_global(Vector3(0.04, 0.165, 0.10))
	return anchor(id)

func can_reach(actor: Node3D, id: String) -> bool:
	if id.is_empty():
		return true
	if not targets.has(id):
		return false
	if id == "@canaries":
		return actor.global_position.y > 26.0
	var offset := anchor(id) - actor.global_position
	return absf(offset.y) <= 2.0 and Vector2(offset.x, offset.z).length() <= (6.0 if id == "@altar" else RANGE)

func try_rest(actor: Node3D, id: String) -> bool:
	if not can_reach(actor, id) or not actor.char_profile.get("clips", {}).has("rest_on_prop"):
		return false
	var target: Node3D = targets.get(id)
	if not is_instance_valid(target):
		return false
	var support := target.get_parent()
	for child in support.get_children():
		if _motions.has(str(child.name)):
			return false
	var prop := target if target.has_method("try_attach_rest") else support.get_node_or_null("Interactive_Hammock") as Node3D
	return is_instance_valid(prop) and prop.try_attach_rest(actor)

func try_desk_seat(actor: Node3D) -> bool:
	var chair: Node3D = targets.get("RetreatEastDeskSeat")
	return is_instance_valid(chair) and can_reach(actor, "RetreatEastDeskSeat") and chair.try_attach_seat(actor)

func desk_book_contact(id: String) -> Vector3:
	var book: Node3D = targets.get(id)
	return book.to_global(Vector3(0.41, 0.026, 0.13)) if is_instance_valid(book) else Vector3.INF

func react(actor: Node3D, id: String, verb: String) -> bool:
	if verb in ["observe", "social"]:
		return can_reach(actor, id)
	if verb in ["fishing", "sweep", "carry_box", "carry_sack", "unload"]:
		return tools.start(actor, verb, Vector3.INF)
	if id.is_empty():
		return true
	if not can_reach(actor, id):
		return false
	var target: Node3D = targets[id]
	if verb in ["stonework", "metalwork", "woodwork", "dagger", "coin", "wipe", "alchemy", "tea"]:
		var point := working_anchor(id, verb)
		if not point.is_finite():
			return false
		var borrowed: Array[Node3D] = []
		if verb == "stonework":
			for name in ["MasonMalletHead", "MasonMalletHandle", "MasonChisel"]:
				var prop := target.get_parent().get_node_or_null(name) as Node3D
				if is_instance_valid(prop):
					borrowed.append(prop)
		if verb == "metalwork":
			target.spin_workbench_gear()
		return tools.start(actor, verb, point, borrowed)
	match verb:
		"doze":
			return false
		"cloth":
			var hammock := target.get_parent().get_node_or_null("Interactive_Hammock")
			if is_instance_valid(hammock) and hammock._is_bed_occupied(str(target.get_parent().name), actor):
				return false
		"draw":
			return target.begin_well_cycle(false)
		"gear":
			target.spin_workbench_gear()
			return true
		"simmer", "incense":
			return _owner.play_routine_vapor(verb)
		"birds":
			target.attract_sanctuary_canaries(actor.global_position)
			return true
		"chest":
			if target.is_chest_open:
				return true
			target = targets.get("RetreatChestLatch")
	if not is_instance_valid(target) or not CUES.has(verb) or _motions.has(id):
		return false
	var cue: Array = CUES[verb]
	var at_peak := Callable()
	if verb == "water":
		var ahead := target.global_position - actor.global_position
		ahead.y = 0.0
		ahead = ahead.normalized()
		var grip := actor.global_position + ahead * 0.34 + Vector3.UP.cross(ahead) * 0.12
		grip.y += float(actor.get("target_height")) * 0.72
		var local_grip: Vector3 = target.get_parent().to_local(grip)
		var handle := target.basis * Basis.from_euler(cue[1]) * Vector3(-0.14, 0.22, 0.0)
		cue = [local_grip - target.position - handle, cue[1], cue[2]]
		var fountain := target.get_parent().get_node_or_null("Interactive_Watering")
		if fountain and not _map.vtt_ui.get_env_reduced_effects():
			at_peak = func():
				var plants: Vector3 = fountain.get_parent().to_global(Vector3(0.36, 0.28, 0.10))
				fountain.show_watering_contact(target.to_global(Vector3(0.28, 0.32, 0.04)), plants)
	_animate(id, target, cue, at_peak)
	return true

func _animate(id: String, node: Node3D, cue: Array, at_peak: Callable) -> void:
	var home := node.transform
	var raised := home
	raised.origin += cue[0]
	raised.basis = home.basis * Basis.from_euler(cue[1])
	var duration: float = cue[2]
	var tween := _owner.create_tween().set_trans(Tween.TRANS_SINE)
	_motions[id] = {"node": node, "frame": home, "tween": tween}
	tween.tween_property(node, "transform", raised, duration * 0.38).set_ease(Tween.EASE_OUT)
	if at_peak.is_valid():
		tween.tween_callback(at_peak)
	tween.tween_interval(duration * 0.18)
	tween.tween_property(node, "transform", home, duration * 0.44).set_ease(Tween.EASE_IN_OUT)
	tween.finished.connect(func(): _motions.erase(id))

func stop_all() -> void:
	for id: String in _motions.keys():
		stop_target(id)
	tools.stop_all()

func stop_target(id: String) -> void:
	if not _motions.has(id):
		return
	var task: Dictionary = _motions[id]
	task.tween.kill()
	if is_instance_valid(task.node):
		task.node.transform = task.frame
		var watering: Node = task.node.get_parent().get_node_or_null("Interactive_Watering")
		if is_instance_valid(watering):
			watering.stop_watering_contact()
	_motions.erase(id)

func release_actor(id: String) -> void:
	tools.release(id)
