class_name PecioWorldState
extends RefCounted

# Persistencia de eventos y estado del Pecio Rosa de los Vientos:
# - Estado del timón de C3 ("attached" | "caught" | "fallen")
# - Alerta de los zombis de C4 tras el estruendo del timón
# - Saqueo único e idempotente del tesoro del nido de C1/C10 (sin duplicación al guardar/cargar)
# - Estado de presencia o ausencia de la arpía en la cofa según la aventura

const DEFAULT_SAVE_PATH := "user://pecio-world-state.v1.cfg"
const VALID_HELM_STATES := ["attached", "caught", "fallen"]

var helm_state: String = "attached"
var c4_zombies_alerted: bool = false
var c10_nest_looted: bool = false
var harpy_present: bool = true

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

func to_dict() -> Dictionary:
	return {
		"helm_state": helm_state,
		"c4_zombies_alerted": c4_zombies_alerted,
		"c10_nest_looted": c10_nest_looted,
		"harpy_present": harpy_present,
	}

func apply_dict(data: Dictionary) -> void:
	var h := str(data.get("helm_state", "attached"))
	helm_state = h if h in VALID_HELM_STATES else "attached"
	c4_zombies_alerted = bool(data.get("c4_zombies_alerted", false))
	c10_nest_looted = bool(data.get("c10_nest_looted", false))
	harpy_present = bool(data.get("harpy_present", true))
	# Consistencia canónica: si el timón está colocado o atrapado por defecto al cargar,
	# solo conservamos c4_zombies_alerted si fue persistido explícitamente (por ejemplo fallen o DM).

func load_state() -> bool:
	reset_defaults()
	if not _persistence_enabled or _save_path.is_empty():
		return false
	var cfg := ConfigFile.new()
	if cfg.load(_save_path) != OK:
		return false
	apply_dict({
		"helm_state": cfg.get_value("pecio_world", "helm_state", "attached"),
		"c4_zombies_alerted": cfg.get_value("pecio_world", "c4_zombies_alerted", false),
		"c10_nest_looted": cfg.get_value("pecio_world", "c10_nest_looted", false),
		"harpy_present": cfg.get_value("pecio_world", "harpy_present", true),
	})
	return true

func save_state() -> bool:
	if not _persistence_enabled or _save_path.is_empty():
		return false
	var cfg := ConfigFile.new()
	cfg.set_value("pecio_world", "helm_state", helm_state)
	cfg.set_value("pecio_world", "c4_zombies_alerted", c4_zombies_alerted)
	cfg.set_value("pecio_world", "c10_nest_looted", c10_nest_looted)
	cfg.set_value("pecio_world", "harpy_present", harpy_present)
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

func mark_c10_nest_looted() -> bool:
	if c10_nest_looted:
		return false
	c10_nest_looted = true
	save_state()
	return true

func set_harpy_present(present: bool) -> void:
	harpy_present = present
	save_state()
