extends RefCounted

static func support(body: CharacterBody3D, point: Vector3, above: float, below: float) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(point + Vector3.UP * above,
		point - Vector3.UP * below, body.collision_mask, [body.get_rid()])
	var hit := body.get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty() or hit.normal.y < 0.56 or hit.collider is CharacterBody3D:
		return {}
	return hit
