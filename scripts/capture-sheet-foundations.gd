extends SceneTree
const Symbols=preload("res://character_sheet/sheet_symbols.gd")
const Widgets=preload("res://character_sheet/sheet_widgets.gd")
const Items=preload("res://inventory/item_catalogue.gd")
const OUT="res://../../output/ficha-fase-0/"
const PAGES={"summary":"resumen","combat":"combate","spells":"conjuros","inventory":"inventario","history":"historia"}
var failures: Array[String]=[]
var geometry: Dictionary={}

func _initialize() -> void: run.call_deferred()

func frames() -> void:
	for i in range(5): await process_frame
	await RenderingServer.frame_post_draw

func check(ok: bool,message: String) -> void:
	if not ok:
		failures.append(message)
		printerr("FAIL ",message)

func shot(id: String) -> void:
	await frames()
	check(root.get_texture().get_image().save_png(ProjectSettings.globalize_path(OUT+id+".png"))==OK,"captura "+id)
	print("CAPTURE ",id)

func pointer(pos: Vector2) -> void:
	root.warp_mouse(pos)
	var event=InputEventMouseMotion.new()
	event.position=pos
	root.push_input(event,true)

func record_rect(control: Control) -> Array:
	var r=control.get_global_rect()
	return [r.position.x,r.position.y,r.size.x,r.size.y]

func icon_plate(panel) -> void:
	# Reachable item types and buttons are included even when the bag is empty.
	var encountered=Symbols.textures.keys()
	for pair in Items.MATCHES: Symbols.icon(pair[0])
	for key in ["other","edit","close","plus","undo","store","take"]: Symbols.icon(key)
	for key in Symbols.catalogue(): Symbols.icon(key)
	var keys=Symbols.textures.keys()
	keys.sort()
	var rows=[]
	var contact=Image.create(96*8,96*ceili(keys.size()/8.0),false,Image.FORMAT_RGBA8)
	for i in range(keys.size()):
		var id=keys[i]
		var im=Symbols.textures[id].get_image()
		im.clear_mipmaps()
		var bounds=im.get_used_rect()
		check(bounds.has_area() and Rect2i(3,3,90,90).encloses(bounds),"margen de "+id)
		contact.blit_rect(im,Rect2i(Vector2i.ZERO,im.get_size()),Vector2i(i%8*96,floori(i/8.)*96))
		var fallback=("combat/icons/" if str(id).begins_with("combat/") else "inventory/icons/")+str(id).trim_prefix("combat/")+".svg"
		if id in Symbols.LOCAL_VECTORS: fallback="character_sheet/art/foundation/"+id+".svg"
		rows.append({"id":id,"seen":id in encountered,"source":Symbols.catalogue().get(id,{}).get("source",fallback),"bounds":[bounds.position.x,bounds.position.y,bounds.size.x,bounds.size.y]})
	contact.save_png(ProjectSettings.globalize_path(OUT+"simbolos-godot.png"))
	write_json("simbolos.json",rows)
	# Separate procedural artwork is exported from the actual player controls.
	panel.select_tab("summary")
	await frames()
	var hp=panel.find_child("SheetHPCard",true,false)
	for child in hp.find_children("*","TextureRect",true,false):
		if "frames" in child:
			for i in range(child.frames.size()):
				child.frames[i].get_image().save_png(ProjectSettings.globalize_path(OUT+"latido-"+str(i)+".png"))
	var badge=Widgets.Paint.ornament(1).get_image()
	badge.clear_mipmaps()
	badge.save_png(ProjectSettings.globalize_path(OUT+"insignia-ca.png"))

func write_json(file: String,value: Variant) -> void:
	var handle=FileAccess.open(OUT+file,FileAccess.WRITE)
	handle.store_string(JSON.stringify(value,"\t"))

func control_states(panel) -> void:
	var tab=panel.find_child("SheetTab_combat",true,false)
	for state in ["normal","hover","selected","disabled"]:
		panel.select_tab("combat" if state=="selected" else "summary")
		tab.disabled=state=="disabled"
		pointer(tab.get_global_rect().get_center() if state=="hover" else Vector2(2,2))
		await frames()
		if state=="hover": check(tab.is_hovered(),"pestaña bajo el puntero")
		if state=="selected": check(tab.button_pressed,"pestaña seleccionada")
		var rect=Rect2i(tab.get_global_rect().grow(2))
		root.get_texture().get_image().get_region(rect).save_png(ProjectSettings.globalize_path(OUT+"estado-"+state+".png"))
	tab.disabled=false
	panel.select_tab("summary")

func export_seals() -> void:
	var swatch=SubViewport.new()
	swatch.size=Vector2i(288,48)
	swatch.transparent_bg=true
	swatch.render_target_update_mode=SubViewport.UPDATE_ALWAYS
	root.add_child(swatch)
	for i in range(6):
		var marker: Control
		if i<4:
			marker=Widgets.Paint.RankSeal.new()
			marker.rank=i-1
		else:
			marker=Widgets.Paint.SlotSeal.new()
			marker.filled=i==4
		swatch.add_child(marker); marker.position=Vector2(i*48,0); marker.size=Vector2(48,48)
	await frames()
	var saved=swatch.get_texture().get_image().save_png(ProjectSettings.globalize_path(OUT+"sellos.png"))
	check(saved==OK,"sellos de competencia y de espacios")

func run() -> void:
	root.size=Vector2i(1600,900); root.content_scale_size=root.size
	var main=load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200
	ui.set_env_time("day"); ui.set_env_weather("clear")
	ui.selected_actor_id="mike"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	var panel=ui.player_hud.sheet_modal
	for resolution in [Vector2i(1600,900),Vector2i(1366,768),Vector2i(1920,1080)]:
		root.size=resolution; root.content_scale_size=resolution
		var reference=[]
		for page in PAGES:
			pointer(Vector2(2,2))
			panel.select_tab(page)
			await frames()
			var layout=[record_rect(panel),record_rect(panel.header),record_rect(panel.tabs),record_rect(panel.stats)]
			if reference.is_empty(): reference=layout
			check(layout==reference,"marco/cabecera "+page+" "+str(resolution))
			check(panel.get_global_rect().encloses(panel.tabs.get_global_rect()),"navegación "+page)
			var id=str(resolution.x)+"-"+PAGES[page]
			geometry[id]=layout
			await shot(id)
			if "--sample" in OS.get_cmdline_user_args():
				quit(); return
		if resolution.x==1600:
			panel.select_tab("summary")
			await frames()
			var button=panel.find_child("SheetAction_*",true,false)
			var hints=panel.get_node("SheetHints")
			pointer(button.get_global_rect().get_center())
			await create_timer(.90).timeout
			await frames()
			check(hints.card.visible and hints.heading.text==button.accessibility_name,"ayuda al señalar una acción")
			check(not hints.card.get_global_rect().intersects(button.get_global_rect()),"ayuda fuera de la acción")
			await create_timer(.55).timeout
			await frames()
			check(hints.card.visible and hints.heading.text==button.accessibility_name,"ayuda sostenida")
			check(root.get_visible_rect().encloses(hints.card.get_global_rect()) and hints.card.size.y<200,"altura y límites de la ayuda")
			write_json("ayuda.json",{"card":record_rect(hints.card),"source":record_rect(button),"title":hints.heading.text,"description":hints.description.text})
			root.get_texture().get_image().save_png(ProjectSettings.globalize_path(OUT+"ayuda-accion.png"))
			button.pressed.emit()
			pointer(Vector2(2,2))
			await frames()
			check(panel.detail.visible and not hints.card.visible,"detalle persistente al pulsar")
			await shot("detalle-accion")
			panel.detail.hide()
			await control_states(panel)
			if "--hints" in OS.get_cmdline_user_args():
				write_json("prueba-ayuda.json",{"failures":failures})
				quit(0 if failures.is_empty() else 1); return
	for actor in ["mia","maria"]:
		ui.selected_actor_id=actor; ui.refresh_all()
		for page in PAGES:
			panel.select_tab(page); await frames()
	await icon_plate(panel)
	await export_seals()
	write_json("geometria.json",geometry)
	write_json("resultado.json",{"views":geometry.size(),"failures":failures})
	print("FOUNDATIONS ",geometry.size()," views / ",failures.size()," failures")
	quit(0 if failures.is_empty() else 1)
