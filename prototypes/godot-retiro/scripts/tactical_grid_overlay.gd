class_name TacticalGridOverlay
extends "res://player/walkable_grid.gd"
const TERRAIN_JSON_PATH:="res://assets/data/retreat-terrain-v2.json"
func _ready() -> void:
	var data=JSON.parse_string(FileAccess.get_file_as_string(TERRAIN_JSON_PATH))
	var source: Array=[]
	for surface in data.get("surfaces",[]):
		var sid: String=str(surface.id)
		for entry in surface.get("tiles",[]):
			if entry.get("medium","solid")!="solid": continue
			var col:=int(entry.cell.col); var row:=int(entry.cell.row)
			if sid in ["beach","pleamar","island-pleamar-low"] and col<=11 and row>=56: continue
			if sid=="island-pleamar-low" and col<=13 or sid=="island-pleamar-high" and col<=16 or sid=="island-observatory" and (row<=16 or col>=100): continue
			var c: Array=entry.corners
			var cell:=square(col,row,0,str(entry.get("materialId","")))
			for i in range(4): cell.corners[i].y=float(c[i])
			cell["movement_cost"]=entry.get("movementCost",1)
			source.append(cell)
	configure(source)
