@tool
extends EditorPlugin
var dialog: AcceptDialog
var form: ConfirmationDialog
var identifier: LineEdit
var kinds: OptionButton
var anatomy: OptionButton
func _enter_tree() -> void:
	add_tool_menu_item("Personajes · inspección",open_inspector)
	add_tool_menu_item("Personajes · validar e importar",validate_library)
	add_tool_menu_item("Personajes · nueva definición",new_definition)
	dialog=AcceptDialog.new(); dialog.title="Pipeline de personajes"; get_editor_interface().get_base_control().add_child(dialog)
	form=ConfirmationDialog.new(); form.title="Crear desde plantilla · no incorpora a producción"; get_editor_interface().get_base_control().add_child(form)
	var box:=VBoxContainer.new(); form.add_child(box)
	identifier=LineEdit.new(); identifier.placeholder_text="identificador-en-minusculas"; identifier.custom_minimum_size.x=420; box.add_child(identifier)
	kinds=OptionButton.new(); box.add_child(kinds)
	for kind in ["character","variant","animation","equipment","held-object","overlay","binding"]: kinds.add_item(kind)
	anatomy=OptionButton.new(); box.add_child(anatomy)
	for profile in ["humanoid-tall","humanoid-small","humanoid-dwarf","winged","quadruped","plant"]: anatomy.add_item(profile)
	form.confirmed.connect(create_definition)
func _exit_tree() -> void:
	for item in ["Personajes · inspección","Personajes · validar e importar","Personajes · nueva definición"]: remove_tool_menu_item(item)
	if dialog: dialog.queue_free()
	if form: form.queue_free()
func open_inspector() -> void:
	OS.create_process(OS.get_executable_path(),["--path",ProjectSettings.globalize_path("res://"),"--script","res://characters/inspection_boot.gd","--","--loading-port=48229"])
func run_pipeline(arguments: Array) -> int:
	var output: Array=[]
	var args: Array=[ProjectSettings.globalize_path("res://../../scripts/character-pipeline.mjs")]; args.append_array(arguments)
	var code:=OS.execute("node",args,output,true)
	dialog.dialog_text=("Operación validada. Revisa la candidata en el taller.\n" if code==0 else "No se incorpora: hay errores bloqueantes.\n")+str(output).left(6000)
	dialog.popup_centered(Vector2i(850,480)); get_editor_interface().get_resource_filesystem().scan(); return code
func validate_library() -> void:
	if run_pipeline(["import"])==0:
		var output: Array=[]
		var code:=OS.execute("node",[ProjectSettings.globalize_path("res://../../scripts/install-character-modular.mjs")],output,true)
		if code!=0: dialog.dialog_text="No se ha instalado la candidata: "+str(output); return
		OS.create_process(OS.get_executable_path(),["--headless","--path",ProjectSettings.globalize_path("res://"),"--script","res://characters/validate_import.gd","--","--loading-port=48229"])
func new_definition() -> void: form.popup_centered()
func create_definition() -> void:
	run_pipeline(["create","--id",identifier.text.strip_edges(),"--kind",kinds.get_item_text(kinds.selected),"--template",anatomy.get_item_text(anatomy.selected)])
