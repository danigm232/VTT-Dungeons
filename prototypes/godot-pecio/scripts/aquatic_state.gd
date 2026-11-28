extends RefCounted

const COMBAT_TURN_SECONDS := 6.0
const SURFACE_FOOT_OFFSET := 0.42
const DIVE_BELOW_SURFACE := 1.6
const MOISTURE_THRESHOLD := 0.045
const BAND_COUNT := 8
const SWIMMING_WATERLINE := 0.78

var surface_available := false
var wants_dive := false
var submerged := false
var in_water := false
var immersion := 0.0
var wetness := 0.0
var wet_lower := Vector4.ZERO
var wet_upper := Vector4.ZERO
var drying_factor := 1.0
var air_remaining := -1.0
var suffocation_exhaustion := 0
var breathes_water := false
var _suffocation_seconds := 0.0
var _pocket_time := 0.0

static func breath_capacity(constitution: int) -> float:
	return maxf(30.0, 60.0 * (1 + floori((constitution - 10) / 2.0)))

func sample(delta: float, open_ocean: bool, flooded_hold: bool, water_over_feet: float, height: float, climate: String, sheltered: bool, daylight := "day") -> void:
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
	var sun := 1.0 if daylight == "day" else (0.62 if daylight == "night" else 0.8)
	drying_factor = sun * (1.0 if climate == "clear" else (0.48 if climate == "fog" else 0.34))
	# The surface swimmer floats horizontally. Foot depth alone would treat the
	# torso as dry even though only the head is held above the water.
	var waterline := maxf(immersion, SWIMMING_WATERLINE) if open_ocean else immersion
	_sample_moisture(delta, waterline, rain, drying_factor * (0.82 if sheltered else 1.0))

func _sample_moisture(delta: float, waterline: float, rain: bool, drying: float) -> void:
	if waterline <= 0.0 and not rain and wetness <= 0.0:
		return
	var sum := 0.0
	for index in BAND_COUNT:
		var band := float(index) / BAND_COUNT
		var contact := smoothstep(band, band + 0.105, waterline)
		var upper := index >= 4
		var channel := index % 4
		var value := wet_upper[channel] if upper else wet_lower[channel]
		var rain_limit := lerpf(0.34, 0.78, band) if rain else 0.0
		if contact > value:
			value = move_toward(value, contact, delta * 4.8)
		elif rain_limit > value:
			value = move_toward(value, rain_limit, delta * lerpf(0.008, 0.033, band))
		else:
			var dry_seconds := lerpf(43.0, 27.0, band)
			value = move_toward(value, maxf(contact, rain_limit), delta * drying / dry_seconds)
		if upper:
			wet_upper[channel] = value
		else:
			wet_lower[channel] = value
		sum += value
	wetness = sum / BAND_COUNT

func wet_height(threshold := 0.24) -> float:
	for index in range(BAND_COUNT - 1, -1, -1):
		if (wet_upper[index - 4] if index >= 4 else wet_lower[index]) > threshold:
			return (index + 1.0) / BAND_COUNT
	return 0.0

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
