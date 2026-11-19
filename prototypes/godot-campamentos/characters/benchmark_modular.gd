extends SceneTree
const Stage=preload("res://characters/review_stage.gd")
func _initialize() -> void: _run.call_deferred()
func _run() -> void:
	root.size=Vector2i(1280,720)
	var stage:=Stage.create(root,true); stage.camera.size=9
	var rows: Array=[]
	for count in [1,6,12]:
		for enabled in [false,true]:
			var actors: Array=[]
			for i in range(count):
				var body=Stage.actor(stage.world,"mike" if i%2==0 else "anteros"); body.position=Vector3((i%4-1.5)*1.3,0,(i/4-1)*1.5)
				var visual=body.get_node("CharacterVisual"); actors.append(body)
				if enabled:
					visual.set_effect("poisoned",.8); visual.set_binding("roots")
			for i in range(45): await process_frame
			var timings: Array=[]; var calls: Array=[]; var previous:=Time.get_ticks_usec()
			for sample in range(90):
				for body in actors: Stage.pose(body,"walk","s",(sample/6)%8)
				await process_frame
				var now:=Time.get_ticks_usec(); timings.append((now-previous)/1000.0); previous=now
				calls.append(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
			timings.sort(); calls.sort()
			rows.append({"actors":count,"modularEffects":enabled,"medianFrameMs":timings[45],"p95FrameMs":timings[85],"medianDrawCalls":calls[45],"samples":90,"viewportCount":root.find_children("*","SubViewport",true,false).size()})
			for body in actors: stage.world.remove_child(body); body.free()
	var report: Dictionary={"revision":preload("res://characters/registry.gd").data().revision,"engine":Engine.get_version_info(),"adapter":RenderingServer.get_video_adapter_name(),"resolution":[1280,720],"scene":"isolated reusable character stage; not full campaign scene","frameLimit":60,"samples":rows}
	FileAccess.open(ProjectSettings.globalize_path("res://../../output/character-modular-20261116/performance.json"),FileAccess.WRITE).store_string(JSON.stringify(report,"\t"))
	print("CHARACTER PERFORMANCE ",JSON.stringify(rows)); stage.world.free(); quit()
