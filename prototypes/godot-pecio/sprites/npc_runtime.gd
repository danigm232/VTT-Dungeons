extends RefCounted
## Animates a collapse even while movement/collision are disabled by combat.
static func collapse(body: Node3D, delta: float) -> void:
	if not body.has_meta("npc_collapsing"):
		body.play_action_animation("fall",.8)
		body.is_defeated = true
		body.set_meta("npc_collapsing",true)
	body.set_physics_process(false)
	if body.get("collision"): body.collision.set_deferred("disabled",true)
	if body.has_method("process_frame_animation"): body.process_frame_animation(delta)
	else: body._process_frame_animation(delta)
	body._apply_procedural_motion(delta,Vector2.ZERO,"fall")

static func recover(body: Node3D) -> void:
	body.remove_meta("npc_collapsing")
	body.play_action_animation("idle")
	var present: bool=not body.has_meta("npc_reinforcement_visible") or body.is_visible_in_tree()
	body.set_physics_process(present)
	if body.get("collision"): body.collision.set_deferred("disabled",not present)
	body.play_action_animation("fortitude" if body.char_profile.get("npc_species","")=="zombie" else "stand",.8)
