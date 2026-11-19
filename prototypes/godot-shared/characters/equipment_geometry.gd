extends RefCounted
## Reusable physical accessories. No full-body character is replaced by a model.
static var _materials: Dictionary={}
static func material(color: Color,metal: float=0.0) -> StandardMaterial3D:
	var key:=str(color)+"/"+str(metal)
	if not _materials.has(key):
		var mat:=StandardMaterial3D.new(); mat.albedo_color=color; mat.metallic=metal; mat.roughness=.67; _materials[key]=mat
	return _materials[key]
static func piece(parent: Node3D,mesh: Mesh,position: Vector3,scale: Vector3,color: Color,metal: float=0.0) -> MeshInstance3D:
	var node:=MeshInstance3D.new(); node.mesh=mesh; node.position=position; node.scale=scale; node.material_override=material(color,metal); parent.add_child(node); return node
static func box(parent: Node3D,p: Vector3,s: Vector3,c: Color,metal: float=0.0) -> MeshInstance3D:
	return piece(parent,BoxMesh.new(),p,s,c,metal)
static func create(item: Dictionary) -> Node3D:
	var root:=Node3D.new(); root.name="Equipment_"+str(item.id)
	var leather:=Color("674431"); var dark:=Color("342d28"); var steel:=Color("89949b"); var gold:=Color("b59b65")
	match str(item.geometry):
		"helmet":
			var cap:=SphereMesh.new(); cap.is_hemisphere=true; cap.radial_segments=20; cap.rings=10
			piece(root,cap,Vector3(0,.02,0),Vector3(.5,.72,.48),steel,.6)
			var rim:=TorusMesh.new(); rim.inner_radius=.44; rim.outer_radius=.49; rim.rings=20; rim.ring_segments=8
			piece(root,rim,Vector3(0,0,0),Vector3(.52,.50,.50),dark,.4)
			box(root,Vector3(0,-.03,.245),Vector3(.07,.25,.045),steel,.6)
			box(root,Vector3(-.20,-.12,.08),Vector3(.07,.26,.20),steel,.6)
			box(root,Vector3(.20,-.12,.08),Vector3(.07,.26,.20),steel,.6)
		"armor":
			var chest:=SphereMesh.new(); chest.radial_segments=16; chest.rings=10
			piece(root,chest,Vector3.ZERO,Vector3(.50,.48,.28),leather)
			box(root,Vector3(0,.02,.26),Vector3(.36,.62,.035),Color("806047"))
			for x in [-.17,.17]:
				box(root,Vector3(x,.31,.03),Vector3(.09,.33,.40),dark)
				for y in [-.20,.02,.24]: piece(root,SphereMesh.new(),Vector3(x,y,.29),Vector3(.024,.024,.012),gold,.6)
			box(root,Vector3(0,-.20,.28),Vector3(.45,.08,.04),dark)
		"sword":
			var grip:=CylinderMesh.new(); grip.top_radius=.035; grip.bottom_radius=.035; grip.height=.22; grip.radial_segments=12
			piece(root,grip,Vector3.ZERO,Vector3.ONE,dark)
			for i in range(7):
				var wrap:=TorusMesh.new(); wrap.inner_radius=.032; wrap.outer_radius=.040; wrap.rings=12; wrap.ring_segments=4
				piece(root,wrap,Vector3(0,-.09+i*.03,0),Vector3.ONE,leather)
			var guard:=CapsuleMesh.new(); guard.radius=.023; guard.height=.34; guard.radial_segments=10; guard.rings=4
			var crossguard:=piece(root,guard,Vector3(0,.13,0),Vector3.ONE,steel,.7); crossguard.rotation.z=PI/2
			var blade:=CylinderMesh.new(); blade.top_radius=0; blade.bottom_radius=.065; blade.height=.70; blade.radial_segments=4; blade.rings=1
			piece(root,blade,Vector3(0,.50,0),Vector3(1,1,.4),Color("c4cdd0"),.7)
			piece(root,SphereMesh.new(),Vector3(0,-.14,0),Vector3(.07,.07,.05),gold,.7)
		"shield":
			var disk:=CylinderMesh.new(); disk.top_radius=.47; disk.bottom_radius=.47; disk.height=.06; disk.radial_segments=24; disk.rings=1
			var face:=piece(root,disk,Vector3.ZERO,Vector3.ONE,leather); face.rotation.x=PI/2
			var rim:=TorusMesh.new(); rim.inner_radius=.43; rim.outer_radius=.48; rim.rings=24; rim.ring_segments=6
			var ring:=piece(root,rim,Vector3(0,0,.04),Vector3.ONE,steel,.7); ring.rotation.x=PI/2
			piece(root,SphereMesh.new(),Vector3(0,0,.07),Vector3(.13,.13,.07),steel,.7)
			for x in [-.22,0,.22]: box(root,Vector3(x,0,.035),Vector3(.013,.76,.01),dark)
		"backpack":
			box(root,Vector3.ZERO,Vector3(.8,.9,.42),leather)
			box(root,Vector3(0,.32,.06),Vector3(.86,.23,.50),Color("87664c"))
			box(root,Vector3(0,-.18,.27),Vector3(.53,.30,.14),Color("805e43"))
			for x in [-.24,.24]: box(root,Vector3(x,0,.29),Vector3(.06,.86,.035),dark)
			var roll:=CylinderMesh.new(); roll.top_radius=.14; roll.bottom_radius=.14; roll.height=.94; roll.radial_segments=16
			var bed:=piece(root,roll,Vector3(0,.61,0),Vector3.ONE,Color("758174")); bed.rotation.z=PI/2
		"pouch":
			piece(root,SphereMesh.new(),Vector3(0,-.08,0),Vector3(.42,.55,.26),leather)
			box(root,Vector3(0,.20,0),Vector3(.46,.16,.40),Color("927351"))
			box(root,Vector3(0,.20,.23),Vector3(.08,.22,.04),gold,.4)
	return root
