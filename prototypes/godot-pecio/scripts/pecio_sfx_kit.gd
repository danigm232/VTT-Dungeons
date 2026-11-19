class_name PecioSfxKit
extends RefCounted

# Sintetizador PCM 16-bit procedural para eventos canónicos del Pecio:
# - Crujido de madera y cabos al examinar o sujetar el timón
# - Impacto pesado del timón sobre la cubierta de C3
# - Golpe sordo repetitivo procedente del camarote C4 (zombis alterados cada 10-15 s)

const SAMPLE_RATE := 22050
static var _cache: Dictionary = {}

static func make_wood_creak() -> AudioStreamWAV:
	if _cache.has("creak"):
		return _cache["creak"]
	var stream := _build_wav(0.55, func(t: float, progress: float) -> float:
		var env := sin(PI * progress) * pow(1.0 - progress * 0.55, 1.3)
		var f := lerpf(118.0, 84.0, progress) + sin(TAU * 7.5 * t) * 14.0
		var stick := sin(TAU * f * t) * 0.55 + sin(TAU * f * 2.02 * t) * 0.25
		var pulse := 0.65 + 0.35 * sin(TAU * 13.0 * t)
		return stick * env * pulse * 0.48
	)
	_cache["creak"] = stream
	return stream

static func make_helm_crash() -> AudioStreamWAV:
	if _cache.has("crash"):
		return _cache["crash"]
	var stream := _build_wav(0.95, func(t: float, progress: float) -> float:
		var thud_env := exp(-t * 11.5)
		var rattle_env := exp(-maxf(0.0, t - 0.11) * 7.8) * smoothstep(0.05, 0.14, t)
		var low := sin(TAU * lerpf(98.0, 42.0, minf(1.0, t * 4.5)) * t) * thud_env
		var wood_body := (sin(TAU * 165.0 * t) * 0.42 + sin(TAU * 282.0 * t) * 0.28) * exp(-t * 8.0)
		var chatter := sin(TAU * 212.0 * t) * sin(TAU * 19.0 * t) * rattle_env * 0.36
		var crack := sin(t * 9731.0) * exp(-t * 28.0) * 0.32
		return clampf((low * 0.78 + wood_body + chatter + crack) * 0.85, -0.95, 0.95)
	)
	_cache["crash"] = stream
	return stream

static func make_c4_zombie_bang() -> AudioStreamWAV:
	if _cache.has("c4_bang"):
		return _cache["c4_bang"]
	# Dos golpes sordos apagados tras la puerta atrancada / bajo el entarimado de C3
	var stream := _build_wav(0.85, func(t: float, _progress: float) -> float:
		var env1 := exp(-t * 10.0)
		var t2 := maxf(0.0, t - 0.24)
		var env2 := exp(-t2 * 11.0) * (1.0 if t >= 0.24 else 0.0)
		var beat1 := (sin(TAU * 62.0 * t) * 0.72 + sin(TAU * 118.0 * t) * 0.28) * env1
		var beat2 := (sin(TAU * 58.0 * t2) * 0.65 + sin(TAU * 112.0 * t2) * 0.24) * env2
		return clampf((beat1 + beat2 * 0.82) * 0.82, -0.92, 0.92)
	)
	_cache["c4_bang"] = stream
	return stream

static func _build_wav(duration_sec: float, fn: Callable) -> AudioStreamWAV:
	var frame_count := maxi(1, int(round(duration_sec * float(SAMPLE_RATE))))
	var data := PackedByteArray()
	data.resize(frame_count * 2)
	for i in range(frame_count):
		var t := float(i) / float(SAMPLE_RATE)
		var progress := float(i) / float(frame_count)
		var sample_f := clampf(float(fn.call(t, progress)), -1.0, 1.0)
		var sample_i := int(round(sample_f * 32767.0))
		data[i * 2] = sample_i & 0xFF
		data[i * 2 + 1] = (sample_i >> 8) & 0xFF
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = SAMPLE_RATE
	wav.stereo = false
	wav.data = data
	return wav
