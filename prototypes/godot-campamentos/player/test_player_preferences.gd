extends SceneTree
const Prefs=preload("res://player/player_preferences.gd")
const Grid=preload("res://player/walkable_grid.gd")
const Rules=preload("res://combat/combat_rules.gd")
const Catalogue=preload("res://combat/combat_catalogue.gd")
const Targeting=preload("res://combat/action_targeting.gd")
var passed:=0
var failures: Array=[]
func check(ok: bool,label: String) -> void:
	if ok: passed+=1
	else: failures.append(label); printerr("FAIL ",label)
func _initialize() -> void:
	var p:=Prefs.normalize({"gridStyle":{"opacity":.67,"mode":"fixed","color":"#112233","thickness":3},"joystickSize":4,"sceneNoticeSeconds":21})
	check(p.gridOpacity==.67 and p.gridThickness==3 and p.gridColor=="#112233" and p.gridMode=="fixed","web grid schema migrates without losing preferences")
	check(p.joystickSize==4 and p.sceneNoticeSeconds==21,"legacy display options migrate")
	p=Prefs.normalize({"gridRadius":-5,"gridOpacity":8,"gridColor":"garbage","joystickOpacity":null,"sheetView":"unknown","initiativePosition":"below"})
	check(p.gridRadius==10 and p.gridOpacity==.7 and p.gridColor==Prefs.DEFAULTS.gridColor and p.joystickOpacity==.72,"invalid input is bounded or ignored")
	check(p.sheetView=="summary" and p.initiativePosition=="top","unknown enumerations get safe defaults")
	for viewport in [Vector2(1280,720),Vector2(720,1280),Vector2(800,600)]:
		for point in [Vector2.ZERO,Vector2.ONE]: check(Rect2(Vector2.ZERO,viewport).encloses(Rect2(Prefs.control_position(viewport,Vector2(150,150),point.x,point.y),Vector2(150,150))),"control positions stay on screen "+str(viewport)+str(point))
	var game:=Rules.new()
	for entry in [["mike","player"],["mia","player"],["zombie","enemy"]]: game.register({"id":entry[0],"kind":entry[1],"position":Vector3.ZERO},Catalogue.actions(entry[0]),{"resources":{"spell-slot-1":{"current":3}}})
	check(Targeting.mode(game.action_for("mike","detect-magic"))=="self","detect magic auto-selects caster")
	check(game.declare("mike","detect-magic") and game.pending.target=="mike","personal ritual declares without target")
	game.cancel()
	check(not game.declare("mike","ray-of-frost"),"attack still requires creature")
	check(not game.declare("mia","healing-word","zombie"),"healing filters to allied party")
	check(game.declare("mia","healing-word","mia"),"healing accepts self explicitly")
	game.cancel()
	check(not game.declare("mike","burning-hands"),"area still requires a point")
	check(game.declare("mike","burning-hands","",{"point":Vector3(4.5,0,0)}),"area accepts an aim direction without creature")
	game.cancel()
	game.register({"id":"aoife","kind":"player","position":Vector3.ZERO},Catalogue.actions("aoife"),Catalogue.profile("aoife"))
	check(not game.declare("aoife","mending","",{"point":Vector3.ZERO}),"object spell needs object description")
	check(game.declare("aoife","mending","",{"point":Vector3.ZERO,"object_label":"Cuerda rota"}),"object spell uses described object without creature")
	game.cancel()
	for basic in ["dash","dodge","disengage","hide","study","ready"]: check(Targeting.mode({"id":basic})=="none","no target required for "+basic)
	check(Targeting.mode({"id":"search"})=="point","search marks a zone without requiring a creature")
	var matrix: Array=[]
	for profile in Catalogue.load_data().profiles:
		for action in Catalogue.actions(profile):
			check(Targeting.mode(action) in Targeting.LABELS,"classified "+str(profile)+"/"+str(action.id))
			matrix.append({"profile":profile,"action":action.id,"label":action.label,"target":Targeting.mode(action),"resolution":action.get("resolution","attack")})
	for id in Catalogue.BASIC: matrix.append({"profile":"all","action":id,"label":Catalogue.BASIC[id],"target":Targeting.mode({"id":id}),"resolution":"instant" if id in ["dash","disengage","dodge"] else "DM"})
	FileAccess.open(ProjectSettings.globalize_path("res://../../output/godot-player-audit-20261115/action-targets.json"),FileAccess.WRITE).store_string(JSON.stringify(matrix,"\t"))
	print(JSON.stringify({"passed":passed,"failed":failures.size(),"errors":failures})); quit(1 if failures.size()>0 else 0)
