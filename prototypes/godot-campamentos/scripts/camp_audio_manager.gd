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
var master_muted: bool = false

func _ready() -> void:
	for layer_name in ["ocean", "wind", "wood", "storm"]:
		var p := AudioStreamPlayer.new()
		p.name = "Layer_" + layer_name
		add_child(p)
		_players[layer_name] = p
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "SfxOneShot"
	add_child(_sfx_player)

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
