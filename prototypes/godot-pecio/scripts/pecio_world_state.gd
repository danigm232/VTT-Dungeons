class_name PecioWorldState
extends RefCounted

# Persistencia integral de eventos, botín, puertas, trampas y estado del Pecio Rosa de los Vientos
# Conforme al Capítulo 3 de «Los Dragones de la Isla de las Tempestades» (pp. 22-27)

const DEFAULT_SAVE_PATH := "user://pecio-world-state.v1.cfg"
const VALID_HELM_STATES := ["attached", "caught", "fallen"]
const VALID_C6_STATES := ["hidden", "discovered", "disarmed", "triggered", "looted"]
const VALID_C9_STATES := ["submerged", "opened_underwater", "hoisted", "looted"]
const VALID_TALISMAN_STATES := ["in_chest", "held", "shown_runara", "destroyed_aboard", "buried_brastos"]
const VALID_HARPY_STATES := ["absent", "returned", "negotiated", "fled", "defeated"]

# Campos históricos conservados por retrocompatibilidad con tests existentes
var helm_state: String = "attached"
var c4_zombies_alerted: bool = false
var c10_nest_looted: bool = false
var harpy_present: bool = true

# Campos canónicos completos (Cap. 3 pp. 22-27 + reglas del usuario)
var party_level: int = 1
var strict_canon_mode: bool = false
var c4_door_unbarred: bool = false
var c4_door_fail_count: int = 0
var opened_doors: Dictionary = {}
var collected_pickups: Dictionary = {}
var c4_desk_looted: bool = false
var c4_compass_taken: bool = false
var c6_stash_state: String = "hidden"
var c8_crates_opened: Dictionary = {}
var c8_rolled_results: Array = []
var c9_chest_state: String = "submerged"
var c9_chest_found: bool = false
var logbook_read: bool = false
var talisman_state: String = "in_chest"
var harpy_state: String = "absent"
var harpy_return_triggered: bool = false
var boat_moored: bool = true
var c1_weak_planks_broken: Dictionary = {}
var lit_lanterns: Dictionary = {}

var _save_path: String = DEFAULT_SAVE_PATH
var _persistence_enabled: bool = true

func _init(save_path: String = DEFAULT_SAVE_PATH, allow_headless_io: bool = false) -> void:
	_save_path = save_path
	var headless := DisplayServer.get_name() == "headless"
	_persistence_enabled = (not headless) or allow_headless_io

func reset_defaults() -> void:
	helm_state = "attached"
	c4_zombies_alerted = false
	c10_nest_looted = false
	harpy_present = true
	party_level = 1
	strict_canon_mode = false
	c4_door_unbarred = false
	c4_door_fail_count = 0
	opened_doors = {}
	collected_pickups = {}
	c4_desk_looted = false
	c4_compass_taken = false
	c6_stash_state = "hidden"
	c8_crates_opened = {}
	c8_rolled_results = []
	c9_chest_state = "submerged"
	c9_chest_found = false
	logbook_read = false
	talisman_state = "in_chest"
	harpy_state = "absent"
	harpy_return_triggered = false
	boat_moored = true
	c1_weak_planks_broken = {}
	lit_lanterns = {}

func to_dict() -> Dictionary:
	return {
		"helm_state": helm_state,
		"c4_zombies_alerted": c4_zombies_alerted,
		"c10_nest_looted": c10_nest_looted,
		"harpy_present": harpy_present,
		"party_level": party_level,
		"strict_canon_mode": strict_canon_mode,
		"c4_door_unbarred": c4_door_unbarred,
		"c4_door_fail_count": c4_door_fail_count,
		"opened_doors": opened_doors.duplicate(),
		"collected_pickups": collected_pickups.duplicate(),
		"c4_desk_looted": c4_desk_looted,
		"c4_compass_taken": c4_compass_taken,
		"c6_stash_state": c6_stash_state,
		"c8_crates_opened": c8_crates_opened.duplicate(),
		"c8_rolled_results": c8_rolled_results.duplicate(),
		"c9_chest_state": c9_chest_state,
		"c9_chest_found": c9_chest_found,
		"logbook_read": logbook_read,
		"talisman_state": talisman_state,
		"harpy_state": harpy_state,
		"harpy_return_triggered": harpy_return_triggered,
		"boat_moored": boat_moored,
		"c1_weak_planks_broken": c1_weak_planks_broken.duplicate(),
		"lit_lanterns": lit_lanterns.duplicate(),
	}

func apply_dict(data: Dictionary) -> void:
	var h := str(data.get("helm_state", "attached"))
	helm_state = h if h in VALID_HELM_STATES else "attached"
	c4_zombies_alerted = bool(data.get("c4_zombies_alerted", false))
	c10_nest_looted = bool(data.get("c10_nest_looted", false))
	harpy_present = bool(data.get("harpy_present", true))
	party_level = clampi(int(data.get("party_level", 1)), 1, 3)
	strict_canon_mode = bool(data.get("strict_canon_mode", false))
	c4_door_unbarred = bool(data.get("c4_door_unbarred", false))
	c4_door_fail_count = maxi(0, int(data.get("c4_door_fail_count", 0)))
	opened_doors = data.get("opened_doors", {}).duplicate() if data.get("opened_doors") is Dictionary else {}
	collected_pickups = data.get("collected_pickups", {}).duplicate() if data.get("collected_pickups") is Dictionary else {}
	c4_desk_looted = bool(data.get("c4_desk_looted", false))
	c4_compass_taken = bool(data.get("c4_compass_taken", false))
	var s6 := str(data.get("c6_stash_state", "hidden"))
	c6_stash_state = s6 if s6 in VALID_C6_STATES else "hidden"
	c8_crates_opened = data.get("c8_crates_opened", {}).duplicate() if data.get("c8_crates_opened") is Dictionary else {}
	c8_rolled_results = data.get("c8_rolled_results", []).duplicate() if data.get("c8_rolled_results") is Array else []
	var s9 := str(data.get("c9_chest_state", "submerged"))
	c9_chest_state = s9 if s9 in VALID_C9_STATES else "submerged"
	c9_chest_found = bool(data.get("c9_chest_found", false))
	logbook_read = bool(data.get("logbook_read", false))
	var ts := str(data.get("talisman_state", "in_chest"))
	talisman_state = ts if ts in VALID_TALISMAN_STATES else "in_chest"
	var hs := str(data.get("harpy_state", "returned" if harpy_present else "absent"))
	harpy_state = hs if hs in VALID_HARPY_STATES else "absent"
	harpy_return_triggered = bool(data.get("harpy_return_triggered", false))
	boat_moored = bool(data.get("boat_moored", true))
	c1_weak_planks_broken = data.get("c1_weak_planks_broken", {}).duplicate() if data.get("c1_weak_planks_broken") is Dictionary else {}
	lit_lanterns = data.get("lit_lanterns", {}).duplicate() if data.get("lit_lanterns") is Dictionary else {}

func load_state() -> bool:
	reset_defaults()
	if not _persistence_enabled or _save_path.is_empty():
		return false
	var cfg := ConfigFile.new()
	if cfg.load(_save_path) != OK:
		return false
	var d := {}
	for key in to_dict().keys():
		if cfg.has_section_key("pecio_world", key):
			d[key] = cfg.get_value("pecio_world", key)
	apply_dict(d)
	return true

func save_state() -> bool:
	if not _persistence_enabled or _save_path.is_empty():
		return false
	var cfg := ConfigFile.new()
	var d := to_dict()
	for key in d.keys():
		cfg.set_value("pecio_world", key, d[key])
	return cfg.save(_save_path) == OK

func mark_helm_caught() -> void:
	helm_state = "caught"
	save_state()

func mark_helm_fallen() -> void:
	helm_state = "fallen"
	c4_zombies_alerted = true
	save_state()

func set_c4_zombies_alerted(alerted: bool) -> void:
	c4_zombies_alerted = alerted
	save_state()

func record_c4_door_fail() -> bool:
	c4_door_fail_count += 1
	var triggered_alert := false
	if c4_door_fail_count > 1 and not c4_zombies_alerted:
		c4_zombies_alerted = true
		triggered_alert = true
	save_state()
	return triggered_alert

func mark_c4_door_unbarred() -> void:
	c4_door_unbarred = true
	opened_doors["c4-barred-door"] = true
	save_state()

func set_door_open(door_id: String, open_flag: bool) -> void:
	opened_doors[door_id] = open_flag
	save_state()

func is_pickup_collected(key: String) -> bool:
	return bool(collected_pickups.get(key, false))

func mark_pickup_collected(key: String) -> bool:
	if bool(collected_pickups.get(key, false)):
		return false
	collected_pickups[key] = true
	save_state()
	return true

func mark_c10_nest_looted() -> bool:
	if c10_nest_looted:
		return false
	c10_nest_looted = true
	save_state()
	return true

func set_harpy_present(present: bool) -> void:
	harpy_present = present
	if present and harpy_state == "absent":
		harpy_state = "returned"
	elif not present and harpy_state == "returned":
		harpy_state = "absent"
	save_state()

func set_harpy_resolution(state_name: String) -> void:
	if state_name in VALID_HARPY_STATES:
		harpy_state = state_name
		harpy_present = (state_name == "returned")
		save_state()

func set_c6_stash_state(new_state: String) -> void:
	if new_state in VALID_C6_STATES:
		c6_stash_state = new_state
		save_state()

func record_c8_crate_roll(crate_id: String, roll_val: int) -> bool:
	if c8_crates_opened.has(crate_id):
		return false
	c8_crates_opened[crate_id] = roll_val
	if roll_val >= 1 and roll_val <= 6 and not c8_rolled_results.has(roll_val):
		c8_rolled_results.append(roll_val)
	save_state()
	return true

func mark_c9_chest_state(new_state: String) -> void:
	if new_state in VALID_C9_STATES:
		c9_chest_state = new_state
		c9_chest_found = true
		if new_state in ["opened_underwater", "looted"] and talisman_state == "in_chest":
			talisman_state = "held"
		save_state()

func set_talisman_state(new_state: String) -> void:
	if new_state in VALID_TALISMAN_STATES:
		talisman_state = new_state
		save_state()

func mark_weak_plank_broken(trap_id: String) -> void:
	c1_weak_planks_broken[trap_id] = true
	save_state()

func is_weak_plank_broken(trap_id: String) -> bool:
	return bool(c1_weak_planks_broken.get(trap_id, false))

func set_lantern_lit(lantern_id: String, lit: bool) -> void:
	lit_lanterns[lantern_id] = lit
	save_state()

func is_lantern_lit(lantern_id: String) -> bool:
	return bool(lit_lanterns.get(lantern_id, false))

func set_party_level(lvl: int) -> void:
	party_level = clampi(lvl, 1, 3)
	save_state()

func set_strict_canon_mode(enabled: bool) -> void:
	strict_canon_mode = enabled
	save_state()
