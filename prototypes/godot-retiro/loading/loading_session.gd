extends RefCounted
## Authoritative, campaign-independent demo ledger. No gameplay mutations.
var catalog: Dictionary
var clients: Dictionary = {}
var entry: Dictionary = {}
var serial: int = 0
var projector_ready: bool = false
var rng := RandomNumberGenerator.new()

func _init(data: Dictionary = {}) -> void:
	catalog = data
	rng.randomize()

func eligible() -> Array:
	var ids: Array = []
	for client in clients.values():
		if not ids.has(client.character): ids.append(client.character)
	return ids

func join(id: String, character: String) -> bool:
	if not catalog.get("actors", {}).has(character): return false
	for owner in clients:
		if owner != id and clients[owner].character == character: return false
	if clients.has(id) and clients[id].character != character: leave(id)
	if clients.has(id):
		clients[id].seen = Time.get_ticks_msec()
		return true
	clients[id] = {"character": character, "ready": false, "continued": false, "seen": Time.get_ticks_msec()}
	if not entry.is_empty() and entry.participants.is_empty(): _choose()
	return true

func leave(id: String) -> void:
	if not clients.has(id): return
	var character = clients[id].character
	clients.erase(id)
	if not entry.is_empty() and entry.participants.has(character) and not entry.rolls.has(character):
		if not entry.rolls.is_empty():
			entry.cancelled = true
			return
		entry.participants = []
		entry.mode = "individual"
		_choose()

func begin(scene_id: String = "", destination: String = "", contest: bool = false) -> void:
	serial += 1
	if scene_id.is_empty(): scene_id = catalog.scenes[rng.randi_range(0, catalog.scenes.size() - 1)].id
	entry = {"id": str(serial) + "-" + str(Time.get_ticks_usec()), "skill": scene_id, "destination": destination, "mode": "contest" if contest and eligible().size() >= 2 else "individual", "participants": [], "rolls": {}, "started": Time.get_ticks_msec(), "resolved": -1, "closed": false, "variant": "owl"}
	projector_ready = false
	for c in clients.values(): c.continued = false
	_choose()

func _choose() -> void:
	var ids = eligible()
	if ids.is_empty(): return
	var first = ids[rng.randi_range(0, ids.size() - 1)]
	entry.participants = [first]
	ids.erase(first)
	if entry.mode == "contest" and not ids.is_empty(): entry.participants.append(ids[rng.randi_range(0, ids.size() - 1)])
	var visitors: Array = ["owl", "goblin", "mouse", "kobold"]
	for id in ids: visitors.append(id)
	entry.variant = visitors[rng.randi_range(0, visitors.size() - 1)]

func roll(client_id: String, entry_id: String, forced: int = 0) -> bool:
	if not clients.has(client_id) or entry.is_empty() or entry.id != entry_id or entry.closed or entry.get("cancelled", false): return false
	var id = clients[client_id].character
	if not entry.participants.has(id) or entry.rolls.has(id) or clients[client_id].continued: return false
	# Forced values are only supplied by the native review harness, never the HTTP route.
	var natural = clampi(forced, 1, 20) if forced else rng.randi_range(1, 20)
	entry.rolls[id] = {"natural": natural, "total": natural, "at": Time.get_ticks_msec()}
	if entry.rolls.size() == entry.participants.size(): entry.resolved = Time.get_ticks_msec()
	return true

func continue_client(client_id: String, entry_id: String) -> bool:
	if not clients.has(client_id) or entry.is_empty() or entry.id != entry_id or not projector_ready or not clients[client_id].ready: return false
	clients[client_id].continued = true
	return true

func complete() -> bool:
	if entry.is_empty() or entry.get("closed", true) or not projector_ready or clients.is_empty(): return false
	for client in clients.values():
		if not client.ready or not client.continued: return false
	return true

func success(character: String, dc: int) -> bool:
	if not entry.rolls.has(character): return false
	if entry.mode == "individual": return entry.rolls[character].total >= dc
	var other = entry.participants[1] if entry.participants[0] == character else entry.participants[0]
	return entry.rolls.has(other) and entry.rolls[character].total >= entry.rolls[other].total

func state(client_id: String) -> Dictionary:
	var client = clients.get(client_id, {})
	var character = client.get("character", "")
	var ml := Engine.get_main_loop()
	var mt := (ml as SceneTree).root.get_node_or_null("MapTransition") if ml is SceneTree else null
	var tide := str(mt.get("tide_state")) if mt else "low"
	return {"entry": entry.get("id", ""), "visible": not entry.get("closed", true), "skill": entry.get("skill", ""), "participants": entry.get("participants", []), "character": character, "canRoll": entry.get("participants", []).has(character) and not entry.get("rolls", {}).has(character) and not client.get("continued", false) and not entry.get("closed", true) and not entry.get("cancelled", false), "roll": entry.get("rolls", {}).get(character, {}), "ready": projector_ready and client.get("ready", false), "continued": client.get("continued", false), "roster": catalog.get("actors", {}).keys(), "tide": tide}
