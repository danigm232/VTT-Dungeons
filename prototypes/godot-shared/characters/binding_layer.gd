extends Node3D
const Anchors=preload("res://characters/anchors.gd")
const Registry=preload("res://characters/registry.gd")
var body: Node3D
var definition: Dictionary={}
var kind:=""
var intensity:=.8
var coverage:=.7
var corrections: Dictionary={}
var instance_node: MultiMeshInstance3D
var material: StandardMaterial3D
var last_signature:=0
var rebuild_count:=0
static var _meshes: Dictionary={}
static func primitive(id: String) -> Mesh:
	if _meshes.has(id): return _meshes[id]
	var mesh: Mesh
	if id=="chains" or id=="arcane-bindings":
		var ring:=TorusMesh.new(); ring.inner_radius=.63; ring.outer_radius=1.0; ring.rings=10; ring.ring_segments=6; mesh=ring
	elif id=="binding-ice":
		var crystal:=CylinderMesh.new(); crystal.top_radius=0; crystal.bottom_radius=1; crystal.height=1; crystal.radial_segments=5; crystal.rings=1; mesh=crystal
	elif id=="spectral-grasp":
		var builder:=SurfaceTool.new(); builder.begin(Mesh.PRIMITIVE_TRIANGLES)
		var palm:=SphereMesh.new(); palm.radius=.5; palm.height=1; palm.radial_segments=12; palm.rings=6
		builder.append_from(palm,0,Transform3D(Basis.IDENTITY.scaled(Vector3(.42,.38,.14)),Vector3.ZERO))
		for i in range(4):
			var bone:=CapsuleMesh.new(); bone.radius=.035; bone.height=.28; bone.radial_segments=8; bone.rings=3
			builder.append_from(bone,0,Transform3D(Basis.IDENTITY,Vector3(-.15+i*.10,.26,0)))
			builder.append_from(bone,0,Transform3D(Basis(Vector3.RIGHT,-.8),Vector3(-.15+i*.10,.44,.10)))
		mesh=builder.commit()
	else:
		var stem:=CylinderMesh.new(); stem.top_radius=1; stem.bottom_radius=1; stem.height=1; stem.radial_segments=9; stem.rings=1; mesh=stem
	_meshes[id]=mesh; return mesh
func _ready() -> void:
	process_priority=65
	instance_node=MultiMeshInstance3D.new(); instance_node.name="PhysicalBindingInstances"; add_child(instance_node)
	instance_node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	material=StandardMaterial3D.new(); material.roughness=.82
	instance_node.material_override=material
func set_kind(id: String) -> bool:
	if not id.is_empty() and not Registry.data().get("bindings",{}).has(id): return false
	if kind==id and instance_node and instance_node.multimesh: return true
	kind=id
	if not is_node_ready(): return true
	if id.is_empty(): hide(); return true
	# A newly allocated mesh must rebuild even if the same pose and cause
	# were visible just before the condition was cleared.
	last_signature = 0
	var multimesh:=MultiMesh.new(); multimesh.transform_format=MultiMesh.TRANSFORM_3D; multimesh.mesh=primitive(id); multimesh.instance_count=0; instance_node.multimesh=multimesh
	material.albedo_color=Color("655039") if id=="roots" else Color("c9d5d8") if id=="webs" else Color("858c92") if id=="chains" else Color("88c6de") if id=="binding-ice" else Color("9185c9")
	material.metallic=.7 if id=="chains" else .0
	material.emission_enabled=id in ["arcane-bindings","spectral-grasp","binding-ice"]
	material.emission=material.albedo_color*.27
	if id=="roots":
		var bark:=ShaderMaterial.new(); bark.shader=preload("res://characters/root_bark.gdshader"); instance_node.material_override=bark
	else: instance_node.material_override=material
	if id in ["webs","spectral-grasp"]:
		material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA; material.albedo_color.a=.70 if id=="webs" else .65
	else: material.transparency=BaseMaterial3D.TRANSPARENCY_DISABLED
	show(); follow(); return true
func _process(_delta: float) -> void: follow()
func segment(a: Vector3,b: Vector3,radius: float) -> Transform3D:
	var up: Vector3=(b-a).normalized()
	if up.length_squared()<.01: up=Vector3.UP
	var right:=up.cross(Vector3.FORWARD).normalized()
	if right.length_squared()<.01: right=Vector3.RIGHT
	var basis:=Basis(right*radius,up*maxf(.001,a.distance_to(b)),right.cross(up).normalized()*radius)
	return Transform3D(basis,(a+b)*.5)
func follow() -> void:
	if kind.is_empty() or body==null or not is_instance_valid(body) or instance_node==null or not instance_node.multimesh: return
	visible=body.is_visible_in_tree() and intensity>0 and coverage>0
	if not visible: return
	var signature: int=[kind,Anchors.frame_key(body),body.sprite.transform,Anchors.plane(body),body.target_height,coverage,intensity,corrections.hash()].hash()
	if signature==last_signature: return
	last_signature=signature; rebuild_count+=1
	var points:=Anchors.resolved(body,definition,corrections)
	if not points.has("torso") and not points.has("stem"): hide(); return
	var center: Vector3=points.get("torso",points.get("stem",Vector3.ZERO))
	var basis:=body.global_basis.inverse()*Anchors.plane(body)
	var h: float=body.target_height
	var width: float=h*float(definition.get("bindingFit",{}).get("torsoHalfWidth",.18))
	if str(definition.get("anatomy","")).begins_with("humanoid") or definition.get("anatomy","")=="winged":
		var direction: String=preload("res://sprites/sprite_facing.gd").view_direction(body,str(body.facing_dir))
		width*=.60 if direction in ["e","w"] else .85 if direction in ["ne","nw","se","sw"] else 1.0
	var transforms: Array[Transform3D]=[]
	if kind in ["binding-ice","spectral-grasp"]:
		var anchors: Array=[]
		for key in points:
			if str(key).begins_with("foot") or (kind=="spectral-grasp" and str(key).begins_with("hand")): anchors.append(key)
		if anchors.is_empty(): anchors=["torso" if points.has("torso") else "stem"]
		for key in anchors:
			var position: Vector3=points[key]+basis.z*h*.025
			var size:=Vector3(.10,.25,.10)*h*intensity
			if kind=="spectral-grasp": size=Vector3.ONE*h*.29
			else: position+=basis.y*h*.09
			transforms.append(Transform3D(basis.scaled(size),position))
	else:
		var paths: Array=[]
		for ring in range(maxi(1,ceili(coverage*4))):
			var path: Array[Vector3]=[]
			for i in range(49):
				var angle: float=i*TAU/48.0
				var swell: float=1.0+.07*sin(angle*3+ring*1.9)
				path.append(center+basis.x*cos(angle)*width*swell+basis.z*sin(angle)*h*.075+basis.y*((ring-1)*h*.12+sin(angle*2+ring)*h*.035))
			paths.append(path)
		if kind in ["roots","webs"]:
			for key in points:
				if str(key).begins_with("foot") or str(key).begins_with("hand") or str(key)=="root":
					var path: Array[Vector3]=[]
					var start: Vector3=points[key]+basis.z*h*.045
					for i in range(25):
						var t: float=i/24.0
						path.append(start.lerp(center+basis.z*h*.075,t)+basis.x*sin(t*TAU+start.x*7)*h*.045*sin(t*PI)+basis.z*sin(t*PI)*h*.025)
					paths.append(path)
					if kind=="roots":
						var twig: Array[Vector3]=[]
						for i in range(10):
							var t: float=i/9.0
							twig.append(path[9]+basis.x*t*h*.10+basis.y*sin(t*1.8)*h*.055+basis.z*h*.01)
						paths.append(twig)
		if kind=="webs":
			# Crossed spans make a net around the anatomy, rather than three
			# identical independent hoops. Rear spans naturally depth-occlude.
			for i in range(12):
				var path: Array[Vector3]=[]
				for step in range(17):
					var t: float=step/16.0
					var angle: float=i*TAU/12.0+t*.35*(1 if i%2 else -1)
					path.append(center+basis.x*cos(angle)*width+basis.z*sin(angle)*h*.078+basis.y*lerpf(-.15,.24*coverage,t)*h)
				paths.append(path)
		for path in paths:
			for i in range(path.size()-1):
				var a: Vector3=path[i]; var b: Vector3=path[i+1]
				if kind in ["chains","arcane-bindings"]:
					var tangent: Vector3=(b-a).normalized()
					var normal: Vector3=basis.z.normalized()
					var side: Vector3=normal.cross(tangent).normalized()
					if side.length_squared()<.01: side=basis.x.normalized()
					var t:=Transform3D(Basis(side*h*.018,normal*h*.018,tangent*h*.036),(a+b)*.5)
					if i%2: t.basis=t.basis.rotated((b-a).normalized(),PI*.5)
					transforms.append(t)
				else:
					var taper: float=lerpf(1.0,.36,float(i)/maxi(1,path.size()-1)) if path.size()<30 else 1.0+.12*sin(i*.6)
					transforms.append(segment(a,b,h*(.0025 if kind=="webs" else .013)*intensity*taper))
	instance_node.multimesh.instance_count=transforms.size()
	for i in range(transforms.size()): instance_node.multimesh.set_instance_transform(i,transforms[i])
