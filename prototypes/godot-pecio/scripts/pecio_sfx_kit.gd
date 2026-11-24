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

static func make_plank_snap() -> AudioStreamWAV:
	if _cache.has("plank_snap"):
		return _cache["plank_snap"]
	var stream := _build_wav(0.75, func(t: float, _progress: float) -> float:
		var snap1 := sin(t * 12413.0) * exp(-t * 24.0) * 0.65
		var t2 := maxf(0.0, t - 0.09)
		var snap2 := sin(t2 * 9127.0) * exp(-t2 * 16.0) * (0.58 if t >= 0.09 else 0.0)
		var crack := sin(TAU * lerpf(240.0, 74.0, minf(1.0, t * 3.0)) * t) * exp(-t * 9.5) * 0.55
		return clampf((snap1 + snap2 + crack) * 0.85, -0.95, 0.95)
	)
	_cache["plank_snap"] = stream
	return stream

static func make_water_splash(heavy: bool = false) -> AudioStreamWAV:
	var key := "splash_heavy" if heavy else "splash_step"
	if _cache.has(key):
		return _cache[key]
	var dur := 0.78 if heavy else 0.28
	var stream := _build_wav(dur, func(t: float, progress: float) -> float:
		var env := sin(PI * minf(1.0, progress * 1.4)) * exp(-t * (4.2 if heavy else 10.5))
		var noise := sin(t * 7823.0 + sin(t * 1390.0)) * 0.45 + sin(t * 11311.0) * 0.30
		var plop := sin(TAU * lerpf(160.0 if heavy else 260.0, 480.0 if heavy else 520.0, progress) * t) * 0.35
		return clampf((noise + plop) * env * (0.72 if heavy else 0.42), -0.9, 0.9)
	)
	_cache[key] = stream
	return stream

static func make_bubble_burst() -> AudioStreamWAV:
	if _cache.has("bubble_burst"):
		return _cache["bubble_burst"]
	var stream := _build_wav(1.10, func(t: float, progress: float) -> float:
		var env := sin(PI * progress) * 0.75
		var f1 := 190.0 + progress * 240.0 + sin(TAU * 14.0 * t) * 45.0
		var f2 := 310.0 + progress * 340.0 + cos(TAU * 19.0 * t) * 55.0
		var glug := sin(TAU * f1 * t) * 0.45 + sin(TAU * f2 * t) * 0.35
		var fizz := sin(t * 9817.0) * 0.16
		return clampf((glug + fizz) * env, -0.9, 0.9)
	)
	_cache["bubble_burst"] = stream
	return stream

static func make_flint_ignite() -> AudioStreamWAV:
	if _cache.has("flint_ignite"):
		return _cache["flint_ignite"]
	var stream := _build_wav(0.42, func(t: float, _progress: float) -> float:
		var clink := sin(TAU * 2480.0 * t) * exp(-t * 36.0) * 0.45
		var t_whoosh := maxf(0.0, t - 0.08)
		var whoosh := sin(t_whoosh * 6947.0 + sin(t_whoosh * 420.0)) * exp(-t_whoosh * 9.0) * (0.55 if t >= 0.08 else 0.0)
		return clampf(clink + whoosh, -0.9, 0.9)
	)
	_cache["flint_ignite"] = stream
	return stream

static func make_dart_trap() -> AudioStreamWAV:
	if _cache.has("dart_trap"):
		return _cache["dart_trap"]
	var stream := _build_wav(0.32, func(t: float, progress: float) -> float:
		var twang := sin(TAU * lerpf(880.0, 220.0, progress) * t) * exp(-t * 16.0) * 0.65
		var hiss := sin(t * 14207.0) * exp(-t * 12.0) * 0.35
		return clampf(twang + hiss, -0.9, 0.9)
	)
	_cache["dart_trap"] = stream
	return stream

static func make_harpy_return() -> AudioStreamWAV:
	if _cache.has("harpy_return"):
		return _cache["harpy_return"]
	var stream := _build_wav(1.25, func(t: float, progress: float) -> float:
		var thud := sin(TAU * lerpf(85.0, 38.0, minf(1.0, t * 4.0)) * t) * exp(-t * 8.5) * 0.68
		var t_cry := maxf(0.0, t - 0.22)
		var cry_env := sin(PI * clampf(t_cry / 0.95, 0.0, 1.0)) * (1.0 if t >= 0.22 else 0.0)
		var cry_f := lerpf(620.0, 460.0, clampf(t_cry / 0.95, 0.0, 1.0)) + sin(TAU * 8.5 * t_cry) * 28.0
		var cry := (sin(TAU * cry_f * t_cry) * 0.42 + sin(TAU * cry_f * 1.5 * t_cry) * 0.22) * cry_env
		return clampf(thud + cry, -0.92, 0.92)
	)
	_cache["harpy_return"] = stream
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
