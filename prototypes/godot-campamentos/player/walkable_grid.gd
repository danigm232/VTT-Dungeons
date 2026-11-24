extends Node3D
## One indexed ribbon mesh per 12 m chunk. Physics is the authority for support;
## canonical cells bound the candidate area. No per-frame rebuild or ray casts.
const TILE:=1.5
const GridShader=preload("res://player/walkable_grid.gdshader")
var cells: Array=[]
var chunks: Dictionary={}
var material: ShaderMaterial
var focus_position:=Vector3.ZERO
var radius_meters:=64.0
var verified_cells: Array=[]
var build_stats: Dictionary={}
var revision:=0
var _excluded: Array[RID]=[]
var _last_chunk:=Vector3.INF
var _last_radius:=-1.0
var _clearance_shape: CapsuleShape3D
var _support_cache: Dictionary={}
var _hit_cache: Dictionary={}
var navigation: Dictionary={}
var _centers: Array[Vector3]=[]
var _hint_key:=""
var _hints: MeshInstance3D
var _doors: Array=[]
var _visual_area: Area3D

func configure(source_cells: Array) -> void:
	cells=source_cells; revision+=1
	_rebuild.call_deferred(revision)

func configure_box_surfaces(owner_root: Node3D) -> void:
	# Connected destinations author floors and ramps as oriented box colliders.
	# Derive the candidate footprint from those existing top faces, including
	# approach trails and piers that lay outside the old central grid rectangle.
	# A query-only layer follows the authored visible floors. It cannot block
	# characters and prevents rectangular legacy colliders advertising sea/air.
	var visible_floors: Array=owner_root.find_children("*","MeshInstance3D",true,false).filter(func(node): return node.get_meta("grid_surface",false))
	if not visible_floors.is_empty():
		_visual_area=Area3D.new(); _visual_area.name="GridVisibleSupportQuery"; _visual_area.collision_layer=1<<30; _visual_area.collision_mask=0; _visual_area.monitoring=false; _visual_area.monitorable=false; add_child(_visual_area)
		for floor_mesh in visible_floors:
			var collider:=CollisionShape3D.new(); var shape: ConcavePolygonShape3D=floor_mesh.mesh.create_trimesh_shape(); shape.backface_collision=true; collider.shape=shape; _visual_area.add_child(collider); collider.global_transform=floor_mesh.global_transform
	var source: Array=[]; var seen: Dictionary={}
	for collider in owner_root.find_children("*","CollisionShape3D",true,false):
		if not collider.shape is BoxShape3D or collider.disabled or not collider.get_parent() is StaticBody3D: continue
		var extent: Vector3=collider.shape.size*.5
		var normal: Vector3=collider.global_basis.y.normalized()
		if normal.y<.65: continue
		var top: Vector3=collider.to_global(Vector3(0,extent.y,0))
		var polygon:=PackedVector2Array()
		for offset in [Vector3(-extent.x,extent.y,-extent.z),Vector3(extent.x,extent.y,-extent.z),Vector3(extent.x,extent.y,extent.z),Vector3(-extent.x,extent.y,extent.z)]:
			var world: Vector3=collider.to_global(offset); polygon.append(Vector2(world.x,world.z))
		var bounds:=Rect2(polygon[0],Vector2.ZERO)
		for point in polygon: bounds=bounds.expand(point)
		for col in range(floori(bounds.position.x/TILE),ceili(bounds.end.x/TILE)):
			for row in range(floori(bounds.position.y/TILE),ceili(bounds.end.y/TILE)):
				var center:=Vector2((col+.5)*TILE,(row+.5)*TILE)
				if not Geometry2D.is_point_in_polygon(center,polygon): continue
				var center_height: float=top.y-(normal.x*(center.x-top.x)+normal.z*(center.y-top.z))/normal.y
				var key:=Vector3i(col,roundi(center_height*10),row)
				if seen.has(key): continue
				seen[key]=true
				var cell:=square(col,row)
				for i in range(4):
					var p: Vector3=cell.corners[i]
					p.y=top.y-(normal.x*(p.x-top.x)+normal.z*(p.z-top.z))/normal.y
					cell.corners[i]=to_local(p)
				source.append(cell)
	configure(source)

func apply_preferences(prefs: Dictionary,focus: Vector3) -> void:
	focus_position=focus; radius_meters=float(prefs.get("gridRadius",50))
	if material:
		material.set_shader_parameter("focus_position",focus)
		material.set_shader_parameter("radius_meters",radius_meters)
		material.set_shader_parameter("opacity",prefs.get("gridOpacity",.22) if prefs.get("showGrid",true) else 0.0)
		material.set_shader_parameter("thickness",prefs.get("gridThickness",1))
		material.set_shader_parameter("contrast_mode",prefs.get("gridMode","contrast")=="contrast")
		material.set_shader_parameter("line_color",Color(str(prefs.get("gridColor","#c8cec3"))))
		material.set_shader_parameter("other_height_opacity",prefs.get("gridHeightOpacity",.3))
	var current_chunk:=Vector3(floorf(focus.x/6),floorf(focus.y),floorf(focus.z/6))
	if current_chunk!=_last_chunk or radius_meters!=_last_radius:
		_last_chunk=current_chunk; _last_radius=radius_meters
		for key in chunks:
			var chunk: MeshInstance3D=chunks[key]
			var center: Vector3=chunk.get_meta("center")
			chunk.visible=Vector2(center.x-focus.x,center.z-focus.z).length()<radius_meters+12
	if _hints: _hints.visible=bool(prefs.get("showMovementHints",true))

func _rebuild(version: int) -> void:
	while is_inside_tree() and not can_process():
		await get_tree().physics_frame
	await get_tree().physics_frame
	await get_tree().physics_frame
	if not is_inside_tree() or version!=revision: return
	var started:=Time.get_ticks_usec()
	for child in get_children():
		if child!=_visual_area: child.queue_free()
	chunks.clear(); verified_cells.clear(); _excluded.clear(); _support_cache.clear(); _hit_cache.clear(); navigation.clear(); _centers.clear(); _hint_key=""; _hints=null
	_clearance_shape=CapsuleShape3D.new(); _clearance_shape.radius=.36; _clearance_shape.height=1.63
	_collect_tokens(get_tree().current_scene if get_tree().current_scene else get_parent())
	material=ShaderMaterial.new(); material.shader=GridShader
	var edges: Dictionary={}; var batches: Dictionary={}; var rejected:=0
	for cell in cells:
		var corners: Array=cell.corners
		var center: Vector3=(corners[0]+corners[1]+corners[2]+corners[3])*.25
		if not _supported(center): rejected+=1; continue
		verified_cells.append(cell); _centers.append(center)
		var tint: Color=Color("202a2b") if cell.get("material","") in ["sand","retreat-sand","stair-edge"] else Color("f0e6cd")
		for i in range(4):
			var a: Vector3=corners[i]; var b: Vector3=corners[(i+1)%4]
			# Small segments clip edges against the same collision surface and
			# follow actual stair treads, without drawing over holes or furniture.
			for part in range(4):
				var p:=a.lerp(b,float(part)/4); var q:=a.lerp(b,float(part+1)/4)
				var mid:=p.lerp(q,.5)
				if not _supported(mid): continue
				var hp:=_floor_hit(p); var hq:=_floor_hit(q)
				if hp.is_empty() or hq.is_empty(): continue
				p=to_local(hp.position)+Vector3.UP*.035; q=to_local(hq.position)+Vector3.UP*.035
				var ka:=str((p*100).round()); var kb:=str((q*100).round()); var edge_key:=ka+kb if ka<kb else kb+ka
				if edges.has(edge_key): continue
				edges[edge_key]=true
				var key:=Vector2i(floori(mid.x/12),floori(mid.z/12))
				if not batches.has(key): batches[key]=[]
				batches[key].append([p,q,tint])
	for key in batches:
		var st:=SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
		for edge in batches[key]:
			var a: Vector3=edge[0]; var b: Vector3=edge[1]; var tangent: Vector3=(b-a).normalized()
			for v in [[a,-1.0],[a,1.0],[b,1.0],[a,-1.0],[b,1.0],[b,-1.0]]:
				st.set_normal(tangent); st.set_color(edge[2]); st.set_uv(Vector2(0,v[1])); st.add_vertex(v[0])
		var mesh:=MeshInstance3D.new(); mesh.name="WalkableChunk_%s_%s" % [key.x,key.y]; mesh.mesh=st.commit(); mesh.material_override=material; mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mesh.extra_cull_margin=2; add_child(mesh); chunks[key]=mesh; mesh.set_meta("center",to_global(Vector3(key.x*12+6,0,key.y*12+6)))
	_build_navigation()
	build_stats={"candidates":cells.size(),"walkable":verified_cells.size(),"rejected":rejected,"edges":edges.size(),"chunks":chunks.size(),"build_ms":(Time.get_ticks_usec()-started)/1000.0,"physics_source":"existing world collisions"}
	_last_chunk=Vector3.INF; print("WALKABLE_GRID ",JSON.stringify(build_stats))

func _collect_tokens(node: Node) -> void:
	if node is CharacterBody3D: _excluded.append(node.get_rid())
	if node.has_signal("door_state_changed") and node not in _doors:
		_doors.append(node)
		node.connect("door_state_changed",func(_opened):
			get_tree().create_timer(.6).timeout.connect(func(): configure(cells))
		)
	for child in node.get_children(): _collect_tokens(child)

func _floor_hit(local: Vector3) -> Dictionary:
	var key: Vector3=(local*1000).round()
	if _hit_cache.has(key): return _hit_cache[key]
	var pos:=to_global(local)
	var query:=PhysicsRayQueryParameters3D.create(pos+Vector3.UP*.38,pos-Vector3.UP*.42)
	query.exclude=_excluded
	var hit:=get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty() or hit.normal.y<.65: hit={}
	if not hit.is_empty() and _visual_area:
		var visual_query:=PhysicsRayQueryParameters3D.create(pos+Vector3.UP*.5,pos-Vector3.UP*.5,1<<30)
		visual_query.collide_with_areas=true; visual_query.collide_with_bodies=false
		var visual:=get_world_3d().direct_space_state.intersect_ray(visual_query)
		if visual.is_empty() or absf(visual.normal.y)<.65 or absf(visual.position.y-hit.position.y)>.26: hit={}
		else: hit.position=visual.position
	_hit_cache[key]=hit
	return hit

func _supported(local: Vector3) -> bool:
	var key: Vector3=(local*1000).round()
	if _support_cache.has(key): return _support_cache[key]
	var hit:=_floor_hit(local)
	if hit.is_empty(): return false
	# Clearance at the token's centre rejects tables, closed walls and props.
	var query:=PhysicsShapeQueryParameters3D.new(); query.shape=_clearance_shape; query.exclude=_excluded; query.transform.origin=hit.position+Vector3.UP*.87; query.margin=.005
	var free:=get_world_3d().direct_space_state.intersect_shape(query,1).is_empty()
	_support_cache[key]=free; return free

func is_walkable_point(world: Vector3) -> bool:
	_support_cache.clear(); _hit_cache.clear()
	return _supported(to_local(world))

func _build_navigation() -> void:
	var buckets: Dictionary={}
	for i in range(_centers.size()):
		var c:=_centers[i]; var key:=Vector2i(floori(c.x/TILE),floori(c.z/TILE))
		if not buckets.has(key): buckets[key]=[]
		buckets[key].append(i); navigation[i]=[]
	for i in range(_centers.size()):
		var c:=_centers[i]; var key:=Vector2i(floori(c.x/TILE),floori(c.z/TILE))
		for dx in range(-1,2):
			for dz in range(-1,2):
				for other in buckets.get(key+Vector2i(dx,dz),[]):
					if other==i: continue
					var difference: Vector3=_centers[other]-c
					if absf(difference.y)>.85 or Vector2(difference.x,difference.z).length()>2.15: continue
					var mid:=_floor_hit(c.lerp(_centers[other],.5))
					if mid.is_empty() or not _supported(c.lerp(_centers[other],.5)): continue
					var start:=_floor_hit(c)
					var end:=_floor_hit(_centers[other])
					if start.is_empty() or end.is_empty(): continue
					# Sweep with the same clearance used by the grid, so doors,
					# rails and diagonal corners cannot create phantom routes.
					var query:=PhysicsShapeQueryParameters3D.new(); query.shape=_clearance_shape; query.exclude=_excluded; query.margin=.005; query.transform.origin=start.position+Vector3.UP*.87; query.motion=end.position-start.position
					var sweep:=get_world_3d().direct_space_state.cast_motion(query)
					if sweep.size()>0 and sweep[0]<.99: continue
					navigation[i].append(other)

func reachable(world: Vector3,budget: float) -> Dictionary:
	var local:=to_local(world); var nearest:=-1; var minimum:=2.5
	for i in range(_centers.size()):
		var d:=_centers[i].distance_to(local)
		if d<minimum: minimum=d; nearest=i
	if nearest<0: return {}
	var costs: Dictionary={nearest:0.0}; var queue: Array=[nearest]
	while not queue.is_empty():
		var current: int=queue.pop_front()
		for other in navigation.get(current,[]):
			var difference: Vector3=_centers[other]-_centers[current]
			var cost: float=costs[current]+maxf(absf(difference.x),absf(difference.z))*float(verified_cells[other].get("movement_cost",1))
			if cost>budget+.01 or costs.has(other) and costs[other]<=cost: continue
			costs[other]=cost; queue.append(other)
	return costs

func find_path(from_world: Vector3,to_world: Vector3) -> PackedVector3Array:
	var start_l:=to_local(from_world); var goal_l:=to_local(to_world)
	var start_i:=-1; var goal_i:=-1; var min_s:=3.0; var min_g:=3.0
	for i in range(_centers.size()):
		var ds:=Vector2(_centers[i].x-start_l.x,_centers[i].z-start_l.z).length()
		if ds<min_s: min_s=ds; start_i=i
		var dg:=Vector2(_centers[i].x-goal_l.x,_centers[i].z-goal_l.z).length()
		if dg<min_g: min_g=dg; goal_i=i
	if start_i<0 or goal_i<0: return PackedVector3Array()
	if start_i==goal_i: return PackedVector3Array([to_global(_centers[goal_i])])
	var dist: Dictionary={start_i:0.0}; var prev: Dictionary={}; var open: Array[int]=[start_i]
	while not open.is_empty():
		var best_pos:=0; var best_d: float=float(dist[open[0]])
		for k in range(1,open.size()):
			var dk: float=float(dist[open[k]])
			if dk<best_d: best_d=dk; best_pos=k
		var cur: int=open[best_pos]; open.remove_at(best_pos)
		if cur==goal_i: break
		for other in navigation.get(cur,[]):
			var diff: Vector3=_centers[other]-_centers[cur]
			var step_len:=Vector2(diff.x,diff.z).length()
			var step_cost:=step_len*float(verified_cells[other].get("movement_cost",1.0))
			var cand: float=float(dist[cur])+step_cost
			if not dist.has(other) or cand<float(dist[other]):
				dist[other]=cand; prev[other]=cur
				if not open.has(other): open.append(other)
	if not prev.has(goal_i): return PackedVector3Array()
	var rev: Array[Vector3]=[]
	var node:=goal_i
	while node!=start_i:
		rev.append(to_global(_centers[node]))
		node=int(prev[node])
	rev.append(to_global(_centers[start_i]))
	rev.reverse()
	var out:=PackedVector3Array()
	for p in rev: out.append(p)
	return out

func update_movement_hints(world: Vector3,budget: float,enabled: bool) -> void:
	if _hints: _hints.visible=enabled
	if not enabled or _centers.is_empty(): return
	var local:=to_local(world)
	var key:=str((local*2).round())+":"+str(snappedf(budget,.5))+":"+str(revision)
	if key==_hint_key: return
	_hint_key=key
	if _hints: _hints.queue_free()
	var costs:=reachable(world,budget)
	if costs.is_empty(): return
	var st:=SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in costs:
		var c:=_centers[i]
		for delta in [Vector3(-.24,0,-.24),Vector3(.24,0,.24),Vector3(.24,0,-.24),Vector3(-.24,0,-.24),Vector3(-.24,0,.24),Vector3(.24,0,.24)]: st.add_vertex(c+delta+Vector3.UP*.055)
	_hints=MeshInstance3D.new(); _hints.name="ReachableMovementHints"; _hints.mesh=st.commit(); _hints.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var hint_material:=StandardMaterial3D.new(); hint_material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; hint_material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA; hint_material.albedo_color=Color(.3,.8,.85,.14); _hints.material_override=hint_material; add_child(_hints)

static func square(col: int,row: int,height: float=0.0,material_id: String="") -> Dictionary:
	var x:=col*TILE; var z:=row*TILE
	return {"corners":[Vector3(x,height,z),Vector3(x+TILE,height,z),Vector3(x+TILE,height,z+TILE),Vector3(x,height,z+TILE)],"material":material_id}
