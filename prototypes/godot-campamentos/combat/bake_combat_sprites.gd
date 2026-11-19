extends SceneTree
## Mechanical lossless extraction of existing frame crops, never new artwork.
const Catalogue=preload("res://combat/combat_catalogue.gd")
func _initialize() -> void:
	var result: Dictionary={}; var images: Dictionary={}
	var folder:=ProjectSettings.globalize_path("res://../godot-shared/combat/baked")
	DirAccess.make_dir_recursive_absolute(folder)
	for token_id in Catalogue.load_data().frames:
		for clip in Catalogue.data.frames[token_id].values():
			for f in clip.frames:
				var key:=Catalogue.frame_key(f)
				if result.has(key): continue
				var path: String=f.url
				if not images.has(path):
					images[path]=Image.load_from_file(ProjectSettings.globalize_path(path))
					images[path].convert(Image.FORMAT_RGBA8)
				var original: Image=images[path]
				var crop:=Rect2i(int(f.get("x",0)),int(f.get("y",0)),int(f.get("width",original.get_width())),int(f.get("height",original.get_height())))
				var image: Image=original.get_region(crop)
				if f.has("alphaSeeds") and not f.alphaSeeds.is_empty():
					var seed: Array=f.alphaSeeds[0]
					image=preload("res://scripts/character_sprite_catalog.gd")._isolate_rgba_crop(original,crop,Vector2i(int(seed[0]),int(seed[1])))
				var bounds:=image.get_used_rect()
				if bounds.size.x<1 or bounds.size.y<1: printerr("Empty frame ",path); quit(1); return
				image=image.get_region(bounds)
				if image.save_png(folder.path_join(key+".png"))!=OK: quit(1); return
				result[key]="res://combat/baked/"+key+".png"
		print("BAKED ",token_id," unique total ",result.size())
	FileAccess.open(folder.get_base_dir().path_join("baked-frames.json"),FileAccess.WRITE).store_string(JSON.stringify(result,"\t"))
	print("BAKED FRAMES: ",result.size()," lossless source crops; no scaling")
	quit()
