extends SceneTree
const PAGES={"summary":"resumen","combat":"combate","spells":"conjuros","inventory":"inventario","history":"historia"}
var out_dir: String=""
var failures: Array[String]=[]
var geometry: Dictionary={}

func _initialize() -> void: run.call_deferred()

func frames(count: int=5) -> void:
	for i in range(count): await process_frame
	await RenderingServer.frame_post_draw

func check(ok: bool,message: String) -> void:
	if not ok:
		failures.append(message)
		printerr("FAIL ",message)

func shot(name: String) -> void:
	await frames(6)
	var full_path=ProjectSettings.globalize_path(out_dir+name+".png")
	DirAccess.make_dir_recursive_absolute(full_path.get_base_dir())
	check(root.get_texture().get_image().save_png(full_path)==OK,"captura "+name)
	print("CAPTURE ",out_dir+name+".png")

func pointer(pos: Vector2) -> void:
	root.warp_mouse(pos)
	var event=InputEventMouseMotion.new()
	event.position=pos
	root.push_input(event,true)

func record_rect(control: Control) -> Array:
	var r=control.get_global_rect()
	return [r.position.x,r.position.y,r.size.x,r.size.y]

func arg_value(flag: String,default_value: String) -> String:
	var args=OS.get_cmdline_user_args()
	for i in range(args.size()):
		if args[i]==flag and i+1<args.size(): return args[i+1]
		if args[i].begins_with(flag+"="): return args[i].substr(flag.length()+1)
	return default_value

func has_flag(flag: String) -> bool:
	return flag in OS.get_cmdline_user_args()

func run() -> void:
	var phase=arg_value("--phase","fase-0")
	out_dir="res://../../output/ficha-definitiva-20261123/phases/"+phase+"/"
	root.size=Vector2i(1600,900); root.content_scale_size=root.size
	var main=load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200
	ui.set_env_time("day"); ui.set_env_weather("clear")
	ui.selected_actor_id="mike"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	var panel=ui.player_hud.sheet_modal
	var resolutions: Array[Vector2i]=[Vector2i(1600,900)]
	if has_flag("--all-res"): resolutions=[Vector2i(1600,900),Vector2i(1366,768),Vector2i(1920,1080)]
	for resolution in resolutions:
		root.size=resolution; root.content_scale_size=resolution
		var reference=[]
		for page in PAGES:
			pointer(Vector2(2,2))
			panel.select_tab(page)
			await frames(6)
			var layout=[record_rect(panel),record_rect(panel.header),record_rect(panel.tabs),record_rect(panel.stats)]
			if reference.is_empty(): reference=layout
			check(layout==reference,"marco/cabecera "+page+" "+str(resolution))
			var id=str(resolution.x)+"-"+PAGES[page]
			geometry[id]=layout
			await shot(id)
	if has_flag("--with-hints"):
		root.size=Vector2i(1600,900); root.content_scale_size=root.size
		panel.select_tab("summary"); await frames(6)
		var button=panel.find_child("SheetAction_*",true,false)
		var hints=panel.get_node("SheetHints")
		if button and hints:
			pointer(button.get_global_rect().get_center())
			await create_timer(.85).timeout
			await frames(5)
			check(hints.card.visible,"ayuda visible")
			check(not hints.card.get_global_rect().intersects(button.get_global_rect()),"ayuda no cubre accion")
			await shot("1600-ayuda-accion")
			button.pressed.emit()
			pointer(Vector2(2,2))
			await frames(5)
			await shot("1600-detalle-accion")
			panel.detail.hide()
	if has_flag("--with-modals"):
		root.size=Vector2i(1600,900); root.content_scale_size=root.size
		# Action Book modal ("Todas las acciones")
		if panel.has_method("open_action_book"):
			panel.select_tab("summary"); await frames(4)
			panel.open_action_book(); await frames(6)
			await shot("1600-libro-acciones")
			panel.detail.hide()
		# Level-up / progression modal (opened from DM role so full edit & wizard controls are active)
		if panel.has_method("open_progression"):
			ui.set_role("dm"); ui.selected_actor_id="mike"; ui.refresh_all(); await frames(4)
			var dm_btn=ui.dm_hud.root.find_child("DmCharacterSheet_mike",true,false)
			if dm_btn and dm_btn is Button: dm_btn.pressed.emit()
			else: ui.player_hud.open_modal("sheet")
			await frames(5)
			panel.select_tab("summary"); await frames(4)
			panel.open_progression(); await frames(6)
			await shot("1600-progresion")
			var start_btn=panel.detail.find_child("StartLevelUpWizard",true,false)
			if start_btn and start_btn is Button and not start_btn.disabled:
				start_btn.pressed.emit(); await frames(6)
				await shot("1600-asistente-nivel")
			panel.detail.hide()
			panel.select_tab("edit"); await frames(6)
			await shot("1600-editar")
			ui.set_role("player"); ui.selected_actor_id="mike"; ui.refresh_all(); await frames(4)
		# Inline editable Biography inside Historia (Player role)
		ui.player_hud.open_modal("sheet"); await frames(4)
		panel.select_tab("history"); await frames(5)
		var edit_bio_btn=panel.find_child("HistoryEditBioBtn",true,false)
		if edit_bio_btn and edit_bio_btn is Button:
			edit_bio_btn.pressed.emit(); await frames(6)
			await shot("1600-historia-editar-bio")
			edit_bio_btn=panel.find_child("HistoryEditBioBtn",true,false)
			if edit_bio_btn and edit_bio_btn is Button: edit_bio_btn.pressed.emit(); await frames(4)
		# Standalone backpack
		ui.player_hud.open_modal("inventory"); await frames(6)
		await shot("1600-mochila-externa")
		ui.player_hud.open_modal("sheet"); await frames(4)
	if has_flag("--all-actors"):
		root.size=Vector2i(1600,900); root.content_scale_size=root.size
		for actor_id in ["mia","maria"]:
			ui.selected_actor_id=actor_id; ui.refresh_all()
			for page in ["summary","combat","spells","history"]:
				panel.select_tab(page); await frames(6)
				await shot("1600-"+actor_id+"-"+PAGES[page])
		ui.selected_actor_id="mike"; ui.refresh_all()
	var handle=FileAccess.open(ProjectSettings.globalize_path(out_dir+"resultado.json"),FileAccess.WRITE)
	if handle: handle.store_string(JSON.stringify({"phase":phase,"views":geometry.size(),"failures":failures,"geometry":geometry},"\t"))
	print("PHASE CAPTURE ",phase," views=",geometry.size()," failures=",failures.size())
	quit(0 if failures.is_empty() else 1)
