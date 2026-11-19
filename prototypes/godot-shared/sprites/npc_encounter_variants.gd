extends RefCounted
## Add the campaign's optional C2 reinforcement without revealing or activating it.
static func install(ui: Node) -> void:
	var resident: Node3D = ui.tokens_by_node.get("HarpyToken")
	if resident == null or ui.tokens_by_node.has("HarpyReinforcementToken"): return
	var originals: Array = ui.enemies.filter(func(a): return a.id=="harpy")
	if originals.is_empty(): return
	var extra: Dictionary = originals[0].duplicate(true)
	extra.id="harpy-2"; extra.node_name="HarpyReinforcementToken"
	extra.name="Arpía · refuerzo de C2"; extra.zone="C2 · Balista de proa"
	extra.revealed=false
	var body = load("res://scenes/player_token.tscn").instantiate()
	body.name=extra.node_name; body.token_name="Harpy · refuerzo C2"
	body.is_npc=true; body.is_active_player=false; body.has_carried_light=false
	body.target_height=resident.target_height
	body.position=Vector3(24,3.02,1.5); body.visible=false
	resident.get_parent().add_child(body)
	body.set_meta("npc_reinforcement_visible",false)
	body.set_physics_process(false)
	if body.get("collision"): body.collision.set_deferred("disabled",true)
	ui.tokens_by_node[extra.node_name]=body
	ui.enemies.append(extra)
