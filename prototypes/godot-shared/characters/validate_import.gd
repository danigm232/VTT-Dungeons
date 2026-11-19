extends SceneTree
const Registry=preload("res://characters/registry.gd")
const Painted=preload("res://characters/equipment_sprites.gd")
var checks:=0
var errors: Array=[]
var warnings: Array=[]
func check(ok: bool,message: String) -> void:
	checks+=1
	if not ok: errors.append(message); printerr("IMPORT BLOCKED: ",message)
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	Registry.inspect_candidate()
	var data:=Registry.data()
	check(not data.is_empty(),"Catalogue can be decoded by Godot")
	for id in data.characters:
		var definition: Dictionary=data.characters[id]
		check(data.anatomies.has(definition.anatomy),id+" anatomical profile")
		var profile:=Registry.profile(id)
		check(not profile.is_empty(),id+" actual source animation decoded")
		var frames: Array=profile.get("clips",{}).get("idle",{}).get("frames",[])
		if frames.is_empty(): frames=profile.get("dir_idle",{}).get("s",{}).get("frames",[])
		check(not frames.is_empty(),id+" idle source exists")
		for frame in frames:
			var texture: Texture2D=frame.tex; var image:=texture.get_image()
			check(image!=null and not image.is_empty(),id+" frame is decodable")
			if image: check(image.get_used_rect().has_area(),id+" frame is nonempty")
	for id in data.equipment:
		var item: Dictionary=data.equipment[id]
		if item.get("source",{}).get("kind","")=="directional-atlas":
			var imported:=Painted.frames(item)
			check(not imported.is_empty(),id+" safe cell extraction")
			check(imported.get("frames",{}).size()==item.source.directions.size(),id+" every declared direction decodes")
			for dir in imported.get("frames",{}):
				var image: Image=imported.frames[dir].texture.get_image()
				check(image.detect_alpha()!=Image.ALPHA_NONE,id+"/"+dir+" transparent silhouette")
		else: warnings.append(id+": procedural accessory; rendered fit requires visual inspection")
	for path in ["body_effects.gdshader","gear_effects.gdshader"]:
		check(load("res://characters/"+path) is Shader,path+" parses as a native Shader resource; GPU compilation covered by rendered tests")
	for path in ["inspector.gd","visual_runtime.gd","equipment_layer.gd","binding_layer.gd"]:
		var script=load("res://characters/"+path)
		check(script!=null and script.can_instantiate(),path+" native script compiles")
	var atlas_data: Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://sprites/frames.json"))
	var decoded_frames:=0
	for id in atlas_data.atlases:
		var spec: Dictionary=atlas_data.atlases[id]
		var atlas:=Image.load_from_file(ProjectSettings.globalize_path("res://sprites/"+str(spec.file)))
		check(atlas!=null and not atlas.is_empty(),id+" actual atlas decode")
		if atlas==null: continue
		var extent:=Rect2i(Vector2i.ZERO,atlas.get_size())
		for entry in spec.frames:
			var region:=Rect2i(int(entry.x),int(entry.y),int(entry.width),int(entry.height))
			check(region.has_area() and extent.encloses(region),id+" frame region is inside its atlas")
			if extent.encloses(region): check(atlas.get_region(region).get_used_rect().has_area(),id+" frame has visible pixels")
			decoded_frames+=1
	var report: Dictionary={"version":1,"revision":data.revision,"engine":Engine.get_version_info(),"project":ProjectSettings.get_setting("application/config/name"),"checks":checks,"decodedLegacyFrames":decoded_frames,"errors":errors,"warnings":warnings,"passed":errors.is_empty(),"scope":"Native decoding, sprite cells, alpha, script compilation. GPU and artistic review are separate."}
	var folder:=ProjectSettings.globalize_path("res://../../output/character-modular-20261116")
	DirAccess.make_dir_recursive_absolute(folder)
	FileAccess.open(folder.path_join("native-import-validation.json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("NATIVE IMPORT ",checks," checks; ",errors.size()," errors; ",warnings.size()," warnings")
	quit(0 if errors.is_empty() else 1)
