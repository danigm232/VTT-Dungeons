class_name OceanWaves
extends RefCounted

# Campo armónico Gerstner compartido entre el shader ocean_water.gdshader,
# el bote de remos (BuoyantBoat) y el sistema de rompientes (VfxManager).

const SEA_LEVEL: float = -3.05
const DEFAULT_AMPLITUDE: float = 0.30
const DEFAULT_SPEED: float = 1.15
const GRAVITY: float = 9.81
static var current_amplitude: float = DEFAULT_AMPLITUDE

# Cada onda: [dir_x, dir_z, wavelength, weight, pinch_ratio]
const WAVES := [
	[0.42, -0.9075, 21.0, 0.48, 3.2],
	[-0.48, -0.8773, 12.8, 0.27, 2.6],
	[0.86, -0.5103, 6.8, 0.16, 2.0],
	[0.24, -0.9708, 3.6, 0.09, 1.6],
]

static func sample_wave_state(world_xz: Vector2, t: float, amplitude: float = -1.0, speed: float = DEFAULT_SPEED) -> Dictionary:
	if amplitude < 0.0: amplitude = current_amplitude
	var disp := Vector3.ZERO
	var tangent := Vector3(1.0, 0.0, 0.0)
	var binormal := Vector3(0.0, 0.0, 1.0)
	var crest_compression: float = 0.0

	for w in WAVES:
		var dir := Vector2(w[0], w[1]).normalized()
		var wavelength: float = w[2]
		var a: float = amplitude * w[3]
		var k: float = TAU / wavelength
		var h: float = a * w[4] # Excursión orbital horizontal controlada
		var omega: float = sqrt(GRAVITY * k) * speed * 0.42
		var phase: float = k * dir.dot(world_xz) - omega * t
		var c: float = cos(phase)
		var s: float = sin(phase)

		disp.x += dir.x * h * c
		disp.y += a * s
		disp.z += dir.y * h * c

		var kh_s: float = k * h * s
		var ka_c: float = k * a * c
		tangent.x -= dir.x * dir.x * kh_s
		tangent.y += dir.x * ka_c
		tangent.z -= dir.x * dir.y * kh_s

		binormal.x -= dir.x * dir.y * kh_s
		binormal.y += dir.y * ka_c
		binormal.z -= dir.y * dir.y * kh_s

		crest_compression += max(0.0, s) * w[3]

	var normal: Vector3 = binormal.cross(tangent).normalized()
	if normal.y < 0.0:
		normal = -normal

	return {
		"offset": disp,
		"surface_y": SEA_LEVEL + disp.y,
		"normal": normal,
		"crest": crest_compression,
	}
