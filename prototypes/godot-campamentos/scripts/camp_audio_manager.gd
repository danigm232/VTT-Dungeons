class_name CampAudioManager
extends Node

## Layered camp ambient & SFX player migrated from campaigns/camp-rests/public/pack.ts audio profiles.

const TRACK_PATHS := {
	"stormwreck-loop-sanctuary": "res://assets/audio/ambience/stormwreck-loop-sanctuary.mp3",
	"stormwreck-loop-forest": "res://assets/audio/ambience/stormwreck-loop-forest.mp3",
	"stormwreck-loop-forest-night": "res://assets/audio/ambience/stormwreck-loop-forest-night.mp3",
	"stormwreck-loop-forest-fire": "res://assets/audio/ambience/stormwreck-loop-forest-fire.mp3",
	"stormwreck-loop-forest-river-01": "res://assets/audio/ambience/stormwreck-loop-forest-river-01.mp3",
	"stormwreck-loop-boat-waves": "res://assets/audio/ambience/stormwreck-loop-boat-waves.mp3",
	"stormwreck-loop-cliff-wind": "res://assets/audio/ambience/stormwreck-loop-cliff-wind.ogg",
	"stormwreck-loop-rain": "res://assets/audio/ambience/stormwreck-loop-rain.mp3",
	"stormwreck-loop-storm": "res://assets/audio/ambience/stormwreck-loop-storm.ogg",
	"stormwreck-loop-thunder": "res://assets/audio/ambience/stormwreck-loop-thunder.ogg",
	"stormwreck-loop-ocean": "res://assets/audio/sfx/ambient-ocean.wav",
	"stormwreck-loop-wind": "res://assets/audio/sfx/ambient-wind.wav",
	"stormwreck-loop-wood": "res://assets/audio/sfx/ambient-wood.wav",
	"camp-loop-drips-v1": "res://assets/audio/sheltered-drips.wav",
	"camp-loop-thunder-v1": "res://assets/audio/distant-thunder.wav",
}

var _players: Dictionary = {}
var _sfx_player: AudioStreamPlayer
var _river_3d: AudioStreamPlayer3D
var _fire_3d: AudioStreamPlayer3D
var _footstep_3d: AudioStreamPlayer3D
var master_muted: bool = false
var last_footstep_surface: String = ""
var footstep_count_by_surface: Dictionary = {"earth": 0, "wood": 0, "water": 0}
var current_fire_audio_gain: float = 0.0

static var _footstep_streams: Dictionary = {}

func _ready() -> void:
	for layer_name in ["ocean", "wind", "wood", "storm"]:
		var p := AudioStreamPlayer.new()
		p.name = "Layer_" + layer_name
		add_child(p)
		_players[layer_name] = p
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "SfxOneShot"
	add_child(_sfx_player)
	_river_3d = AudioStreamPlayer3D.new()
	_river_3d.name = "StreamRiverAudio"
	_river_3d.unit_size = 5.6
	_river_3d.max_distance = 32.0
	_river_3d.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	_river_3d.volume_db = linear_to_db(0.40)
	add_child(_river_3d)
	_fire_3d = AudioStreamPlayer3D.new()
	_fire_3d.name = "HearthFireAudio"
	_fire_3d.unit_size = 3.8
	_fire_3d.max_distance = 16.5
	_fire_3d.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	_fire_3d.volume_db = linear_to_db(0.36)
	add_child(_fire_3d)
	_footstep_3d = AudioStreamPlayer3D.new()
	_footstep_3d.name = "FootstepAudio3D"
	_footstep_3d.unit_size = 4.2
	_footstep_3d.max_distance = 22.0
	_footstep_3d.volume_db = linear_to_db(0.38)
	add_child(_footstep_3d)
	_ensure_footstep_streams()

static func _ensure_footstep_streams() -> void:
	if not _footstep_streams.is_empty():
		return
	_footstep_streams["earth"] = _build_footstep_wav("earth")
	_footstep_streams["wood"] = _build_footstep_wav("wood")
	_footstep_streams["water"] = _build_footstep_wav("water")

static func _build_footstep_wav(kind: String) -> AudioStreamWAV:
	var mix_rate := 22050
	var dur_s := 0.18 if kind == "water" else (0.12 if kind == "wood" else 0.11)
	var sample_count := int(round(float(mix_rate) * dur_s))
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	var seed_state: int = 13579 if kind == "earth" else (24681 if kind == "wood" else 97531)
	var lp := 0.0
	for i in range(sample_count):
		var t := float(i) / float(mix_rate)
		var u := float(i) / float(max(1, sample_count - 1))
		seed_state = (seed_state * 1103515245 + 12345) & 0x7fffffff
		var white := (float(seed_state & 0xffff) / 32767.5) - 1.0
		var sig := 0.0
		match kind:
			"wood":
				# Hollow timber plank step (StreamFootbridge): resonant 175 Hz & 335 Hz wood modes + short heel tap
				var env_tap := exp(-u * 26.0)
				var env_body := sin(minf(1.0, u * 12.0) * PI * 0.5) * exp(-u * 10.5)
				var mode_1 := sin(t * TAU * 176.0) * 0.55
				var mode_2 := sin(t * TAU * 334.0 + 0.4) * 0.35
				lp = lerpf(lp, white, 0.32)
				sig = (mode_1 + mode_2) * env_body + lp * env_tap * 0.42
			"water":
				# Shallow river wading splash: dual-pulse slosh + modulated droplet ripples
				var env_slosh := sin(u * PI) * exp(-u * 2.8)
				var mod_f := 420.0 + sin(t * TAU * 19.0) * 240.0 + cos(t * TAU * 33.0) * 140.0
				lp = lerpf(lp, white, 0.48)
				var bubble := sin(t * TAU * mod_f) * 0.36
				sig = (lp * 0.72 + bubble) * env_slosh
			_:
				# Forest earth & dry leaf litter step: low 112 Hz soil thud + soft leaf crunch
				var env_thud := exp(-u * 19.0)
				var env_crunch := sin(u * PI) * exp(-u * 7.5)
				lp = lerpf(lp, white, 0.24)
				var thud := sin(t * TAU * (118.0 - u * 42.0)) * 0.62
				sig = thud * env_thud + lp * env_crunch * 0.48
		var pcm := clampi(int(round(clampf(sig, -0.95, 0.95) * 28000.0)), -32767, 32767)
		data.encode_s16(i * 2, pcm)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = mix_rate
	wav.stereo = false
	wav.data = data
	return wav

## Paso 17.21: Differentiate footstep sounds on earth, wood (bridge) and water (river wading)
func play_footstep(surface: String, world_pos: Vector3, pitch_jitter: float = 0.0) -> void:
	_ensure_footstep_streams()
	var norm_s := surface if _footstep_streams.has(surface) else "earth"
	last_footstep_surface = norm_s
	footstep_count_by_surface[norm_s] = int(footstep_count_by_surface.get(norm_s, 0)) + 1
	if is_instance_valid(_footstep_3d):
		_footstep_3d.global_position = world_pos + Vector3(0.0, 0.12, 0.0)
		_footstep_3d.stream = _footstep_streams.get(norm_s) as AudioStream
		_footstep_3d.pitch_scale = clampf(1.0 + pitch_jitter, 0.88, 1.14)
		var gain := 0.44 if norm_s == "water" else (0.40 if norm_s == "wood" else 0.35)
		_footstep_3d.volume_db = linear_to_db(gain)
		if DisplayServer.get_name() != "headless" and not master_muted and _footstep_3d.stream != null:
			_footstep_3d.play()

## Paso 17.17 & 17.20: Update 3D river tracking & link fire audio gain/pitch to fire intensity & fuel
func update_spatial_sources(nearest_river_pos: Vector3, fire_lit: bool, fire_fuel: float, stoke_boost: float) -> void:
	if is_instance_valid(_river_3d) and nearest_river_pos != Vector3.ZERO:
		_river_3d.global_position = nearest_river_pos + Vector3(0.0, 0.25, 0.0)
	if not fire_lit:
		current_fire_audio_gain = 0.0
	else:
		var ember_factor := 0.48 if (fire_fuel < 0.28 and stoke_boost <= 0.01) else 1.0
		current_fire_audio_gain = clampf((0.20 + fire_fuel * 0.22 + stoke_boost * 0.18) * ember_factor, 0.10, 0.56)
	if is_instance_valid(_fire_3d):
		if fire_lit and current_fire_audio_gain > 0.01:
			_fire_3d.volume_db = linear_to_db(current_fire_audio_gain)
			_fire_3d.pitch_scale = clampf(0.92 + fire_fuel * 0.10 + stoke_boost * 0.14, 0.88, 1.18)
		elif _fire_3d.playing:
			_fire_3d.stop()

func setup_spatial_ambience(scene_id: String, fire_pos: Vector3, river_pos: Vector3 = Vector3.ZERO) -> void:
	if is_instance_valid(_fire_3d):
		_fire_3d.global_position = fire_pos + Vector3(0.0, 0.35, 0.0)
	if is_instance_valid(_river_3d):
		_river_3d.global_position = river_pos + Vector3(0.0, 0.25, 0.0)
	if DisplayServer.get_name() == "headless" or master_muted:
		return
	if scene_id == "camp-forest-pleamar" and is_instance_valid(_river_3d):
		var rpath: String = TRACK_PATHS.get("stormwreck-loop-forest-river-01", "")
		if rpath != "" and ResourceLoader.exists(rpath):
			_river_3d.stream = load(rpath) as AudioStream
			if _river_3d.stream and not _river_3d.playing:
				_river_3d.play()

func sync_phase_and_fire(scene_id: String, phase_id: String, fire_lit: bool) -> void:
	if not fire_lit:
		current_fire_audio_gain = 0.0
	elif current_fire_audio_gain <= 0.01:
		current_fire_audio_gain = 0.36
	if DisplayServer.get_name() == "headless" or master_muted:
		if is_instance_valid(_fire_3d):
			_fire_3d.stop()
		return
	if scene_id == "camp-forest-pleamar":
		var wp: AudioStreamPlayer = _players.get("wood") as AudioStreamPlayer
		if is_instance_valid(wp):
			var is_night := phase_id in ["night", "dusk"]
			var track := "stormwreck-loop-forest-night" if is_night else "stormwreck-loop-forest"
			var tpath: String = TRACK_PATHS.get(track, "")
			if tpath != "" and ResourceLoader.exists(tpath):
				var s := load(tpath) as AudioStream
				if s and wp.stream != s:
					wp.stream = s
					wp.volume_db = linear_to_db(0.22 if is_night else 0.24)
					wp.play()
	if is_instance_valid(_fire_3d):
		if fire_lit:
			var fpath: String = TRACK_PATHS.get("stormwreck-loop-forest-fire", "")
			if fpath != "" and ResourceLoader.exists(fpath):
				if _fire_3d.stream == null:
					_fire_3d.stream = load(fpath) as AudioStream
				_fire_3d.volume_db = linear_to_db(maxf(0.14, current_fire_audio_gain))
				if _fire_3d.stream and not _fire_3d.playing:
					_fire_3d.play()
		else:
			_fire_3d.stop()

func apply_scene_profile(scene_def: Dictionary) -> void:
	if DisplayServer.get_name() == "headless":
		return
	var prof: Dictionary = scene_def.get("audioProfile", {})
	var layers: Dictionary = prof.get("layers", {})
	for layer_name in _players:
		var player: AudioStreamPlayer = _players[layer_name]
		var cfg: Dictionary = layers.get(layer_name, {})
		if cfg.is_empty() or not bool(cfg.get("playing", false)):
			player.stop()
			continue
		var track_id := str(cfg.get("id", ""))
		var path: String = TRACK_PATHS.get(track_id, "")
		if path != "" and ResourceLoader.exists(path):
			var stream := load(path) as AudioStream
			if stream:
				player.stream = stream
				var vol := clampf(float(cfg.get("volume", 0.2)), 0.01, 1.0)
				player.volume_db = linear_to_db(vol)
				player.play()

func play_sfx(track_id: String, vol: float = 0.55) -> void:
	if DisplayServer.get_name() == "headless" or master_muted:
		return
	var path: String = TRACK_PATHS.get(track_id, "")
	if path != "" and ResourceLoader.exists(path):
		var stream := load(path) as AudioStream
		if stream:
			_sfx_player.stream = stream
			_sfx_player.volume_db = linear_to_db(vol)
			_sfx_player.play()
