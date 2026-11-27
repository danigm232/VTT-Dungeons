extends RefCounted

const COMBAT_TURN_SECONDS := 6.0
const SURFACE_FOOT_OFFSET := 0.42
const DIVE_BELOW_SURFACE := 1.6

var surface_available := false
var wants_dive := false
var submerged := false
var in_water := false
var immersion := 0.0
var wetness := 0.0
var air_remaining := -1.0
var suffocation_exhaustion := 0
var breathes_water := false
var _suffocation_seconds := 0.0
var _pocket_time := 0.0

static func breath_capacity(constitution: int) -> float:
	return maxf(30.0, 60.0 * (1 + floori((constitution - 10) / 2.0)))

func sample(delta: float, open_ocean: bool, flooded_hold: bool, water_over_feet: float, height: float, climate: String, sheltered: bool) -> void:
	surface_available = open_ocean
	in_water = open_ocean or flooded_hold
	if not open_ocean:
		wants_dive = false
	_pocket_time = maxf(0.0, _pocket_time - delta)
	var deep_enough := water_over_feet >= SURFACE_FOOT_OFFSET + (0.48 if submerged else 0.65)
	submerged = flooded_hold or (open_ocean and deep_enough)
	immersion = clampf(water_over_feet / maxf(height, 0.5), 0.0, 1.0)
	if submerged:
		immersion = 1.0
	var rain := not sheltered and climate in ["rain", "storm"]
	var target := maxf(immersion, 0.72 if rain else 0.0)
	if target >= wetness:
		wetness = move_toward(wetness, target, delta * (2.8 if immersion > 0.0 else 0.024))
	else:
		var dry_seconds := 26.0 if climate == "clear" else 55.0
		wetness = move_toward(wetness, target, delta / dry_seconds)

func take_air() -> void:
	_pocket_time = 2.0

func can_breathe() -> bool:
	return not submerged or _pocket_time > 0.0 or breathes_water

func update_breath(constitution: int, water_breathing: bool, seconds: float, turn_ended: bool = false) -> void:
	var capacity := breath_capacity(constitution)
	breathes_water = water_breathing
	if can_breathe():
		air_remaining = capacity
		suffocation_exhaustion = 0
		_suffocation_seconds = 0.0
		return
	if air_remaining < 0.0:
		air_remaining = capacity
	air_remaining = minf(air_remaining, capacity)
	var spent_without_air := maxf(0.0, seconds - air_remaining)
	air_remaining = maxf(0.0, minf(air_remaining, capacity) - seconds)
	if turn_ended and is_zero_approx(air_remaining):
		suffocation_exhaustion = mini(6, suffocation_exhaustion + 1)
	elif not turn_ended and spent_without_air > 0.0:
		_suffocation_seconds += spent_without_air
		if _suffocation_seconds >= COMBAT_TURN_SECONDS:
			suffocation_exhaustion = mini(6, suffocation_exhaustion + int(_suffocation_seconds / COMBAT_TURN_SECONDS))
			_suffocation_seconds = fmod(_suffocation_seconds, COMBAT_TURN_SECONDS)
