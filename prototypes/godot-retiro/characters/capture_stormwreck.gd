extends SceneTree
const Registry=preload("res://characters/registry.gd")
const Stage=preload("res://characters/review_stage.gd")
const Roster=preload("res://characters/stormwreck_roster.gd")
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720); Registry.inspect_candidate()
	var stage:=Stage.create(root)
	var folder:=ProjectSettings.globalize_path("res://../../output/stormwreck-characters-20261117/native")
	DirAccess.make_dir_recursive_absolute(folder)
	var selected:=""
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--stormwreck-id="): selected=argument.trim_prefix("--stormwreck-id=")
	var records: Array=[]; var failures: Array=[]
	var reusable: Dictionary={}
	var checkpoint_path:=folder.path_join("idle-checkpoint.json")
	if FileAccess.file_exists(checkpoint_path):
		var saved: Dictionary=JSON.parse_string(FileAccess.get_file_as_string(checkpoint_path))
		if saved.get("revision","")==Registry.data().revision:
			for record in saved.get("records",[]):
				var hashes: Dictionary=record.get("captureFileHashes",{})
				var valid: bool=hashes.size()==8
				for failure in saved.get("failures",[]):
					if str(failure).begins_with(str(record.id)+":"): valid=false
				for filename in hashes:
					var path:=folder.path_join(filename)
					if not FileAccess.file_exists(path) or FileAccess.get_file_as_bytes(path).hex_encode().sha256_text()!=hashes[filename]: valid=false
				if valid: reusable[record.id]=record
	for id in Roster.ids():
		var definition: Dictionary=Registry.data().characters[id]
		if not selected.is_empty() and id!=selected: continue
		if reusable.has(id):
			records.append(reusable[id]); print("IDLE VERIFIED SAME REVISION ",id); continue
		var body=Stage.actor(stage.world,id); var textures: Dictionary={}; var supports: Array=[]
		stage.camera.size=maxf(3.7,body.target_height*1.5)
		stage.camera.look_at(Vector3(0,body.target_height*.52,0))
		var direction: String=Roster.idle_direction(id)
		await process_frame
		if definition.source.kind=="legacy-profile":
			var candidate_profile: Dictionary=body.char_profile
			body.char_profile=load("res://scripts/character_sprite_catalog.gd").get_character_clips(str(definition.source.key))
			Stage.pose(body,"idle",direction,0)
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(folder.path_join(id+"-before.png"))
			body.char_profile=candidate_profile
		var rendered: Dictionary={}; var capture_hashes: Dictionary={}
		for index in range(8):
			Stage.pose(body,"idle",direction,index)
			textures[body.sprite.texture.get_instance_id()]=true
			var texture: Texture2D=body.sprite.texture; var used:=texture.get_image().get_used_rect()
			supports.append(body.sprite.position.y+(texture.get_height()*.5-used.end.y)*body.sprite.pixel_size)
			await RenderingServer.frame_post_draw
			var capture: Image=root.get_texture().get_image()
			rendered[capture.get_data().hex_encode().sha256_text()]=true
			var filename: String=id+"-idle-"+str(index+1).pad_zeros(2)+".png"
			capture.save_png(folder.path_join(filename))
			capture_hashes[filename]=FileAccess.get_file_as_bytes(folder.path_join(filename)).hex_encode().sha256_text()
		if body.active_clip_frames.size()!=8: failures.append(id+": not exactly eight idle frames")
		if textures.size()!=8: failures.append(id+": frames repeat the same texture")
		if rendered.size()!=8: failures.append(id+": native captures repeat; render synchronisation or animation is incorrect")
		Stage.pose(body,"idle",direction,0)
		var advanced: Dictionary={}
		for tick in range(8):
			advanced[body.anim_frame_idx]=true
			body.process_frame_animation(1.0/body.active_clip_fps+.00001)
		if advanced.size()!=8 or body.anim_frame_idx!=0: failures.append(id+": real animator does not advance and loop through all eight phases")
		var low: float=supports.min(); var high: float=supports.max()
		if high-low>.015: failures.append(id+": foot support drifts by more than 1.5 cm")
		records.append({"id":id,"frames":body.active_clip_frames.size(),"distinctTextures":textures.size(),"distinctRenders":rendered.size(),"animatorPhases":advanced.size(),"captureFileHashes":capture_hashes,"heightMeters":body.target_height,"supportRangeMeters":[low,high],"direction":direction,"source":definition.source,"camera":[0,4,10],"target":[0,body.target_height*.52,0],"orthographicSize":stage.camera.size})
		FileAccess.open(folder.path_join("idle-checkpoint.json"),FileAccess.WRITE).store_string(JSON.stringify({"revision":Registry.data().revision,"records":records,"failures":failures},"\t"))
		print("IDLE CHECKED ",id," · ",records.size()," actors")
		stage.world.remove_child(body); body.free()
	var report: Dictionary={"revision":Registry.data().revision,"records":records,"failures":failures,"scope":"native base-view idle render; no eight-direction or physical-device claim"}
	FileAccess.open(folder.path_join("idle-proof"+("-"+selected if not selected.is_empty() else "")+".json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("STORMWRECK IDLE ",records.size()," actors, ",failures.size()," failures")
	for failure in failures: printerr(failure)
	stage.world.free(); quit(0 if failures.is_empty() else 1)
