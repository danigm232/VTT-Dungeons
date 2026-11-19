class_name ShipVessel
extends Node3D

# Control de Escora y Cimentación del Pecio Rosa de los Vientos sobre Huesos de Dragón
# Aplica la escora canónica (~9.5° a estribor + 1.2° de asiento a popa)
# según engine/shared/wreck-structure.ts y las reglas de diseño del proyecto

@export var list_angle: float = 9.5  # Escora lateral a estribor (+Z)
@export var trim_angle: float = 1.2  # Asiento longitudinal a popa (-X)

func _ready() -> void:
	rotation_degrees = Vector3(list_angle, 0.0, trim_angle)
	_sync_ocean_hull_mask.call_deferred()

func _sync_ocean_hull_mask() -> void:
	var ocean := get_tree().root.find_child("OceanWater", true, false) as MeshInstance3D
	if ocean:
		var mat := ocean.get_active_material(0) as ShaderMaterial
		if mat:
			mat.set_shader_parameter("hull_inv_matrix", global_transform.affine_inverse())
			mat.set_shader_parameter("hull_mask_enabled", 1.0)
