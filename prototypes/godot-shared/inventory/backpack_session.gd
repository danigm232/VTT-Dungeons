extends RefCounted
## A modal records intent, never plays an action or modifies stock itself.
var is_open: bool = false
var actor_id: String = ""
var pending: Dictionary = {}

func begin(id: String) -> void:
	is_open = true
	actor_id = id
	pending.clear()

func prepare(item_id: String, action: String, initial: bool = false) -> void:
	if not is_open or action not in ["take", "store"]:
		return
	if (action == "take") == initial:
		pending.erase(item_id)
	else:
		pending[item_id] = {"actor_id": actor_id, "item_id": item_id, "action": action}

func desired(item_id: String, initial: bool) -> bool:
	return pending[item_id].action == "take" if pending.has(item_id) else initial

func finish() -> Array:
	var result: Array = pending.values().duplicate(true)
	pending.clear()
	is_open = false
	return result

func discard() -> void:
	pending.clear()
