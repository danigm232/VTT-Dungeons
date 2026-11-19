class_name BuoyantBoat
extends Node3D

# Animación física de flotabilidad sincronizada con el campo Gerstner de OceanWaves.
# Simula elevación (heave), cabeceo (pitch) y balanceo (roll) siguiendo el oleaje real.

const OceanWaves = preload("res://scripts/ocean_waves.gd")

@export var base_y: float = -2.85
@export var wave_amplitude: float = OceanWaves.DEFAULT_AMPLITUDE
@export var wave_speed: float = OceanWaves.DEFAULT_SPEED
@export var pitch_response: float = 1.10
@export var roll_response: float = 1.25

var time: float = 0.0
var initial_rot_x: float = 0.0
var initial_rot_y: float = 0.0
var initial_rot_z: float = 0.0
var freeboard_offset: float = 0.20

func _ready() -> void:
	initial_rot_x = rotation.x
	initial_rot_y = rotation.y
	initial_rot_z = rotation.z
	freeboard_offset = base_y - OceanWaves.SEA_LEVEL

func _process(delta: float) -> void:
	time += delta
	var state: Dictionary = OceanWaves.sample_wave_state(Vector2(position.x, position.z), time, wave_amplitude, wave_speed)
	var target_y: float = state["surface_y"] + freeboard_offset
	var n: Vector3 = state["normal"]

	# Proyectar la normal de la ola al marco yaw local del bote (proa hacia +X, manga en Z)
	var cos_y: float = cos(initial_rot_y)
	var sin_y: float = sin(initial_rot_y)
	var local_nx: float = n.x * cos_y - n.z * sin_y
	var local_nz: float = n.x * sin_y + n.z * cos_y

	var target_rot_x: float = initial_rot_x + atan2(local_nz, max(0.25, n.y)) * roll_response
	var target_rot_z: float = initial_rot_z - atan2(local_nx, max(0.25, n.y)) * pitch_response

	var blend: float = min(1.0, delta * 8.0)
	position.y = lerpf(position.y, target_y, blend)
	rotation.x = lerpf(rotation.x, target_rot_x, blend)
	rotation.z = lerpf(rotation.z, target_rot_z, blend)
