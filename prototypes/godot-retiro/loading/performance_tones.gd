extends RefCounted
## Same original triangle timbres/envelopes as skill-performance-sound.ts.
static func make(success: bool) -> AudioStreamWAV:
	var notes: Array = [293.66, 440.0, 587.33] if success else [293.66, 278.0]
	var rate: int = 22050
	var count = int(((notes.size() - 1) * 0.16 + 0.22) * rate)
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for i in range(count):
		var t = float(i) / rate
		var value: float = 0.0
		for n in range(notes.size()):
			var local = t - n * 0.16
			if local < 0 or local >= 0.22: continue
			var gain = 0.0001 * pow(700.0, local / 0.016) if local < 0.016 else 0.07 * pow(0.0001 / 0.07, minf(1, (local - 0.016) / 0.194))
			value += (2.0 / PI) * asin(sin(TAU * float(notes[n]) * local)) * gain
		bytes.encode_s16(i * 2, int(clampf(value, -1, 1) * 32767))
	var wave := AudioStreamWAV.new()
	wave.format = AudioStreamWAV.FORMAT_16_BITS
	wave.mix_rate = rate
	wave.data = bytes
	return wave
