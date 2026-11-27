extends RefCounted
## Facing is stored in stable world axes; choose the drawn view from camera yaw.
const DIRECTIONS := ["e","se","s","sw","w","nw","n","ne"]

static func world_octant(heading: Vector3) -> String:
	var octant := posmod(roundi(atan2(heading.z, heading.x) / (PI / 4)), 8)
	return DIRECTIONS[octant]

static func view_bearing(body: Node3D, direction: String) -> float:
	var index:=DIRECTIONS.find(direction)
	var camera:=body.get_viewport().get_camera_3d() if body.is_inside_tree() else null
	var nominal := float(maxi(0, index)) * PI / 4.0
	if index<0 or camera==null: return nominal
	var heading:=Vector3(cos(nominal),0,sin(nominal))
	if body.has_method("world_heading_for_pose"):
		var exact: Vector3 = body.world_heading_for_pose(direction)
		if exact.length_squared() > .0001:
			heading = exact
	var right:=Vector3(camera.global_basis.x.x,0,camera.global_basis.x.z).normalized()
	var back:=Vector3(camera.global_basis.z.x,0,camera.global_basis.z.z).normalized()
	if right.length_squared()<.01 or back.length_squared()<.01: return nominal
	return atan2(heading.dot(back), heading.dot(right))

static func view_direction(body: Node3D, direction: String) -> String:
	if not direction in DIRECTIONS:
		return direction
	var bearing := view_bearing(body, direction)
	var octant := posmod(roundi(bearing / (PI / 4)), 8)
	if body.has_method("stabilize_view_octant"):
		octant = body.stabilize_view_octant(bearing)
	return DIRECTIONS[octant]
