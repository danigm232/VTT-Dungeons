extends SceneTree
const Grid=preload("res://player/walkable_grid.gd")
var passed:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	if ok: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func _initialize() -> void: run.call_deferred()
func box(parent: Node3D,at: Vector3,size: Vector3) -> void:
	var body:=StaticBody3D.new(); var collider:=CollisionShape3D.new(); var shape:=BoxShape3D.new(); shape.size=size; collider.shape=shape; body.add_child(collider); parent.add_child(body); body.position=at
func run() -> void:
	var scene:=Node3D.new(); root.add_child(scene); current_scene=scene
	box(scene,Vector3(3,-.2,1.5),Vector3(6,.4,3))
	box(scene,Vector3(3,1.0,1.5),Vector3(.3,2,3))
	box(scene,Vector3(.75,2.8,5.25),Vector3(1.5,.4,1.5))
	var grid:=Grid.new(); scene.add_child(grid)
	var cells: Array=[]
	for x in range(5):
		for z in range(2): cells.append(Grid.square(x,z))
	cells.append(Grid.square(0,3,3))
	grid.configure(cells)
	for i in range(90):
		if not grid.build_stats.is_empty(): break
		await process_frame
	check(grid.verified_cells.size()==9,"unsupported cells over void are rejected")
	check(grid.is_walkable_point(Vector3(.75,0,.75)),"real floor is supported")
	check(not grid.is_walkable_point(Vector3(6.75,0,.75)),"void never becomes walkable")
	check(not grid.is_walkable_point(Vector3(3,0,.75)),"wall blocks ground clearance")
	var reachable:=grid.reachable(Vector3(.75,0,.75),50)
	check(reachable.size()==4,"movement preview cannot cross a closed wall or jump to another height")
	check(grid.reachable(Vector3(.75,0,.75),0).size()==1,"zero movement highlights only origin")
	grid.apply_preferences({"gridRadius":25.0,"gridHeightOpacity":.15,"gridOpacity":.5,"gridThickness":3,"showGrid":false},Vector3.ONE)
	check(grid.material.get_shader_parameter("opacity")==0.0,"hidden grid has zero alpha independently of movement hints")
	check(grid.radius_meters==25 and grid.material.get_shader_parameter("thickness")==3,"radius and pixel width are actual material parameters")
	grid.update_movement_hints(Vector3(.75,0,.75),3,true)
	check(grid.get_node_or_null("ReachableMovementHints")!=null,"reachable preview builds from verified navigation")
	grid.update_movement_hints(Vector3(.75,0,.75),3,false)
	check(not grid._hints.visible,"movement hints can be independently disabled")
	var old_revision: int=grid.revision
	grid.configure_box_surfaces(scene)
	for i in range(90):
		if grid.revision>old_revision and grid.build_stats.get("candidates",0)==9: break
		await process_frame
	check(grid.cells.size()==9 and grid.verified_cells.size()==9,"oriented physical floor tops supply the full candidate footprint")
	var visible_floor:=MeshInstance3D.new(); var plane:=PlaneMesh.new(); plane.size=Vector2(3,3); visible_floor.mesh=plane; scene.add_child(visible_floor); visible_floor.position=Vector3(1.5,0,1.5); visible_floor.set_meta("grid_surface",true)
	grid.build_stats.clear(); grid.configure_box_surfaces(scene)
	for i in range(4): await physics_frame
	await process_frame
	check(grid.verified_cells.size()==4,"visual support rejects invisible collider extensions over sea or air")
	scene.free(); print(JSON.stringify({"suite":"grid-navigation","passed":passed,"failed":failures.size(),"errors":failures})); quit(1 if failures.size()>0 else 0)
