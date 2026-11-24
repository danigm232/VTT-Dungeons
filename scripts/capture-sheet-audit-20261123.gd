extends SceneTree
const PAGES=[["summary","resumen"],["combat","combate"],["spells","conjuros"],["inventory","inventario"],["history","historia"],["edit","editar"]]
var refinement=false
var output="res://../../output/ficha-auditoria-20261123/"
func _initialize() -> void: _run.call_deferred()
func shot(name: String) -> void:
	await create_timer(.65).timeout
	for i in range(4): await process_frame
	await RenderingServer.frame_post_draw
	var result=root.get_texture().get_image().save_png(ProjectSettings.globalize_path(output+name+".png"))
	print("CAPTURE ",name," ",result)
func compact_shots(panel) -> void:
	root.size=Vector2i(1366,768); root.content_scale_size=root.size
	var number=10
	for entry in PAGES:
		panel.select_tab(entry[0]); await shot("%d-compacto-%s" % [number,entry[1]])
		number+=1
func class_shots(ui,panel) -> void:
	ui.selected_actor_id="maria"; ui.refresh_all(); panel.select_tab("spells"); await shot("trinit-recursos")
	ui.selected_actor_id="mia"; ui.refresh_all(); panel.select_tab("spells"); await shot("mia-conjuros")
func health_and_editor_shots(ui,panel) -> void:
	var rules=ui.combat_controller.rules
	rules.damage("mia",4,"fuerza")
	rules.actors.mia.temp_hp=3
	rules.changed.emit()
	panel.select_tab("summary"); panel.refresh_view(); await shot("mia-pg-temporales")
	panel.select_tab("inventory"); await process_frame
	var bag=ui.player_hud.inventory_modal
	bag.selected_key="potion"; bag.refresh_view()
	bag.consume_button.pressed.emit()
	await shot("inventario-consumir")
	ui.set_role("dm"); ui.dm_hud.refresh()
	await process_frame
	ui.dm_hud.root.find_child("DmCharacterSheet_mia",true,false).pressed.emit()
	panel.select_tab("edit"); panel.refresh_view()
	panel.find_child("SheetEdit_ac",true,false).value=19
	await shot("editar-dm")
func _run() -> void:
	var args=OS.get_cmdline_user_args()
	refinement="--refinement" in args
	if refinement: output="res://../../output/ficha-refinamiento-20261123/"
	if "--full-audit" in args:
		refinement=true
		output="res://../../output/ficha-auditoria-integral/"
	root.size=Vector2i(1600,900); root.content_scale_size=root.size
	var main=load("res://scenes/main.tscn").instantiate(); root.add_child(main)
	for i in range(16): await process_frame
	var ui=main.find_child("VttRoleUi",true,false)
	ui.set_role("player"); ui.clock_running=false; ui.clock_seconds=43200; ui.set_env_time("day"); ui.set_env_weather("clear")
	ui.selected_actor_id="mike"; ui.refresh_all(); ui.player_hud.open_modal("sheet")
	var panel=ui.player_hud.sheet_modal
	if "--standalone-sizes" in args:
		ui.player_hud.open_modal("inventory")
		root.size=Vector2i(1366,768); root.content_scale_size=root.size
		await shot("compacto-mochila-independiente")
		root.size=Vector2i(1920,1080); root.content_scale_size=root.size
		await shot("amplio-mochila-independiente")
		quit()
		return
	if "--additional-views" in args:
		await class_shots(ui,panel)
		await health_and_editor_shots(ui,panel)
		quit()
		return
	if "--personal-inventory" in args:
		ui.set_role("dm"); ui.dm_hud.refresh()
		await process_frame
		ui.dm_hud.root.find_child("DmCharacterSheet_mia",true,false).pressed.emit()
		panel.select_tab("inventory")
		await process_frame
		var bag=ui.player_hud.inventory_modal
		bag.transfer_button.pressed.emit()
		await shot("inventario-personal-transferir")
		quit()
		return
	if "--editor-only" in args:
		ui.set_role("dm"); ui.dm_hud.refresh()
		await process_frame
		ui.dm_hud.root.find_child("DmCharacterSheet_mia",true,false).pressed.emit()
		var actor=ui.combat_controller.rules.actors.mia
		actor.hp=7; actor.temp_hp=3
		panel.select_tab("edit"); panel.refresh_view()
		panel.find_child("SheetEdit_ac",true,false).value=19
		await shot("editar-dm")
		quit()
		return
	if "--sample" in args:
		await shot("muestra-fase-2"); quit(); return
	if refinement and "--compact-only" in OS.get_cmdline_user_args():
		await compact_shots(panel)
		ui.selected_actor_id="mia"; ui.refresh_all(); panel.select_tab("summary"); await shot("mia-compacto")
		print("CAPTURE COMPLETE"); quit(); return
	for entry in [["summary","01-resumen"],["combat","02-combate"],["spells","03-conjuros"],["inventory","04-inventario"],["history","05-historia"],["edit","06-editar"]]:
		panel.select_tab(entry[0]); await shot(entry[1])
		if entry[0] in ["combat","edit"]:
			if refinement and entry[0]=="combat":
				for name in ["SheetCombatBasics","SheetCombatActions","SheetSkillsScroll"]:
					var pane=panel.find_child(name,true,false)
					pane.scroll_vertical=10000
				await shot("combate-listas-desplazadas")
			elif not refinement:
				panel.scroll.scroll_vertical=10000; await shot(entry[1]+"-desplazado")
	ui.selected_actor_id="mia"; ui.refresh_all(); panel.select_tab("summary"); await shot("07-mia-resumen")
	ui.selected_actor_id="maria"; ui.refresh_all(); panel.select_tab("summary"); await shot("08-maria-resumen")
	ui.selected_actor_id="mike"; ui.refresh_all(); ui.player_hud.open_modal("inventory"); await shot("09-mochila-independiente")
	ui.player_hud.open_modal("sheet")
	await compact_shots(panel)
	if "--full-audit" in args:
		ui.selected_actor_id="mia"; ui.refresh_all(); panel.select_tab("summary"); await shot("mia-compacto")
		ui.selected_actor_id="mike"; ui.refresh_all()
	if refinement:
		root.size=Vector2i(1920,1080); root.content_scale_size=root.size
		for entry in PAGES:
			panel.select_tab(entry[0]); await shot("amplio-"+entry[1])
		if "--full-audit" not in args:
			root.size=Vector2i(1600,900); root.content_scale_size=root.size
			await class_shots(ui,panel)
	print("CAPTURE COMPLETE"); quit()
