class_name TacticalGridOverlay
extends "res://player/walkable_grid.gd"
var cutout_mode:="exterior"
func _ready() -> void:
	var source: Array=[]
	# Canonical hull bounds; physics rejects hatches, voids and furniture.
	for level in [0.0,3.0,-3.28,-6.4,15.0]:
		for col in range(-21,21):
			for row in range(-8,8):
				var x: float=(col+.5)*TILE; var z: float=(row+.5)*TILE
				if absf(z)>WreckStructure.get_beam_at(x): continue
				if level==3.0 and absf(x)<13.5: continue
				if level==15.0 and Vector2(x-.35,z+.48).length()>2.9: continue
				var cell:=square(col,row,level,"wood")
				for i in range(4): cell.corners[i].y+=WreckStructure.get_list_height(cell.corners[i].z)
				source.append(cell)
	# Existing HullBuilder collision ramp endpoints, including lower decks.
	for ends in [[10.2,13.5,0.0,3.0,-3.5,.85],[10.2,13.5,0.0,3.0,3.5,.85],[-10.2,-13.5,0.0,3.0,-3.5,.85],[-10.2,-13.5,0.0,3.0,3.5,.85],[-1.5,4.5,0.0,-3.28,5.25,.72],[12.75,18.75,-3.28,-6.4,2.25,.72]]:
		var steps:=ceili(absf(ends[1]-ends[0])/TILE)
		for i in range(steps):
			var a: float=float(i)/steps; var b: float=float(i+1)/steps
			var x0: float=lerpf(ends[0],ends[1],a); var x1: float=lerpf(ends[0],ends[1],b)
			var y0: float=lerpf(ends[2],ends[3],a); var y1: float=lerpf(ends[2],ends[3],b)
			source.append({"corners":[Vector3(x0,y0,ends[4]-ends[5]),Vector3(x1,y1,ends[4]-ends[5]),Vector3(x1,y1,ends[4]+ends[5]),Vector3(x0,y0,ends[4]+ends[5])],"material":"wood"})
	configure(source)
func sync_cutout_mode(mode: String) -> void: cutout_mode=mode
