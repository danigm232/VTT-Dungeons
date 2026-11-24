extends Node2D
const W=preload("res://character_sheet/sheet_widgets.gd")
const Art=preload("res://character_sheet/skin.gd")
var card: PanelContainer
var emblem: TextureRect
var heading: Label
var description: Label
var subject: WeakRef
var delay:=0.0
var keyboard:=false
var last_text:=""

func _ready() -> void:
	z_index=100
	card=W.surface(13)
	card.name="ManuscriptHint"
	card.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(card)
	var style=card.get_theme_stylebox("panel").duplicate()
	style.bg_color=Color("#ecd9b7")
	style.shadow_size=5
	card.add_theme_stylebox_override("panel",style)
	var lines=VBoxContainer.new()
	lines.mouse_filter=Control.MOUSE_FILTER_IGNORE
	card.add_child(lines)
	var title_row=HBoxContainer.new()
	title_row.mouse_filter=Control.MOUSE_FILTER_IGNORE
	title_row.add_theme_constant_override("separation",8)
	lines.add_child(title_row)
	emblem=W.image("book",24)
	title_row.add_child(emblem)
	heading=W.wrapped("",19)
	heading.max_lines_visible=2
	heading.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
	heading.add_theme_font_override("font",W.font(true))
	title_row.add_child(heading)
	var rule=ColorRect.new(); rule.custom_minimum_size.y=1; rule.color=Color("#b68a42",.55); rule.mouse_filter=Control.MOUSE_FILTER_IGNORE; lines.add_child(rule)
	description=W.wrapped("",16)
	description.max_lines_visible=5
	description.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS
	lines.add_child(description)
	card.hide()

func _input(event: InputEvent) -> void:
	if not is_visible_in_tree(): return
	if event is InputEventMouseMotion: keyboard=false
	elif event is InputEventMouseButton or event is InputEventScreenTouch:
		keyboard=false
		delay=0
		card.hide()
	elif event is InputEventKey and event.pressed:
		keyboard=event.keycode in [KEY_TAB,KEY_LEFT,KEY_RIGHT,KEY_UP,KEY_DOWN]
		delay=0
		card.hide()

func _process(delta: float) -> void:
	if not is_visible_in_tree():
		subject=null
		card.hide()
		return
	var sheet=get_parent()
	var current=get_viewport().gui_get_focus_owner() if keyboard else get_viewport().gui_get_hovered_control()
	if current and sheet.is_ancestor_of(current):
		while current and current!=sheet:
			if current is Control and (not current.tooltip_text.is_empty() or current.has_meta("sheet_hint")): break
			current=current.get_parent()
	else: current=null
	if current==sheet: current=null
	if current==null or subject==null or subject.get_ref()!=current:
		subject=weakref(current) if current else null
		delay=0
		card.hide()
	if current:
		delay+=delta
		var copy=str(current.get_meta("sheet_hint","")) if current.tooltip_text.is_empty() else str(current.tooltip_text)
		if delay>=.46 and (not card.visible or copy!=last_text): present(current,copy)
		elif card.visible: place(current)

func present(control: Control,copy: String) -> void:
	last_text=copy
	var parts=copy.strip_edges().split("\n",false)
	if parts.is_empty(): return
	var title=str(control.get_meta("sheet_title",control.accessibility_name))
	if title.is_empty() and control is Button: title=control.text.strip_edges()
	if title.is_empty() or parts.size()>1: title=parts[0]
	if title==parts[0]: parts.remove_at(0)
	var width=minf(332,get_viewport_rect().size.x-24)
	# Measure at the final line width, including the crest and the panel insets.
	# A new wrapped Label initially measures as a single-letter column.
	heading.size.x=maxf(1,width-58)
	description.size.x=maxf(1,width-26)
	heading.text=title
	if control.has_meta("sheet_detail"):
		parts=parts.slice(0,1)
		parts.append("Pulsa para consultar el detalle.")
	description.text="\n".join(parts).strip_edges()
	description.visible=not description.text.is_empty()
	emblem.texture=control.icon if control is Button and control.icon else W.symbol(str(control.get_meta("sheet_icon","book")))
	card.custom_minimum_size.x=width
	card.size=Vector2(width,0)
	card.show()
	card.reset_size()
	place(control)
	# Wrapped labels can finish measuring at the end of the layout pass.
	place.call_deferred(control)

func place(control: Control) -> void:
	if not is_instance_valid(control) or not card.visible: return
	var area=get_viewport_rect().grow(-9)
	var natural=card.get_combined_minimum_size()
	if absf(card.size.y-natural.y)>.5: card.size.y=natural.y
	var source=control.get_global_rect()
	var block=source
	var parent=control.get_parent()
	while parent and parent!=get_parent():
		if parent is PanelContainer and parent.size.y>=90:
			block=parent.get_global_rect()
			break
		parent=parent.get_parent()
	var gap=8
	var stage_node=get_parent().find_child("CharacterStoryStage",true,false)
	var stage_rect=stage_node.get_global_rect() if stage_node is Control and stage_node.is_visible_in_tree() else Rect2()
	var options=[
		Vector2(source.position.x+20,source.end.y+gap),
		Vector2(source.position.x+20,source.position.y-card.size.y-gap),
		Vector2(block.end.x+gap,source.position.y),
		Vector2(source.position.x,block.end.y+gap),
		Vector2(source.position.x,block.position.y-card.size.y-gap),
		Vector2(block.position.x-card.size.x-gap,source.position.y)
	]
	var best=Vector2.ZERO
	var least=INF
	for idx in range(options.size()):
		var candidate: Vector2=options[idx]
		var pos=Vector2(candidate).clamp(area.position,(area.end-card.size).max(area.position))
		var rect=Rect2(pos,card.size)
		var hero_overlap=rect.intersection(stage_rect).get_area()*500.0 if stage_rect.has_area() else 0.0
		var cost=rect.intersection(source).get_area()*2000.0+hero_overlap+rect.intersection(block).get_area()*0.25+pos.distance_to(candidate)*4.0+idx*8.0
		if cost<least:
			best=pos
			least=cost
	card.global_position=best.round()
