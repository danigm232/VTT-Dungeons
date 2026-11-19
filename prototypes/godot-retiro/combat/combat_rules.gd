extends RefCounted
const Targeting = preload("res://combat/action_targeting.gd")
## Local Godot authority. Physical dice only; no RNG or UI dependencies.
signal changed
signal resolved(event: Dictionary)

var actors: Dictionary = {}
var order: Array[String] = []
var active := false
var initiative_pending := false
var round_number := 1
var turn_index := 0
var turn_serial := 0
var pending: Dictionary = {}
var effects: Array[Dictionary] = []
var followups: Array[Dictionary] = []
var sequence: Dictionary = {}
var interrupted: Dictionary = {}
var visual_queue: Array[Dictionary]=[]
var last_error := ""
var serial := 0
var completed: Dictionary = {}
var blunt_knockout := true # Explicit table convention from the existing game.

func register(source: Dictionary, actions: Array = [], profile: Dictionary = {}) -> void:
	var a := source.duplicate(true)
	var id := str(a.id)
	a["name"] = a.get("name",a.get("label",id))
	a["kind"] = a.get("kind","player")
	a["hp_max"] = int(a.get("hp_max",profile.get("maxHp",10)))
	a["hp"] = int(a.get("hp",a.hp_max))
	a["ac"] = int(a.get("ac",profile.get("armorClass",10)))
	a["speed"] = float(a.get("speed",profile.get("speedMeters",9)))
	a["actions"] = actions.duplicate(true)
	a["resources"] = profile.get("resources",{}).duplicate(true)
	a["saves"] = a.get("saves",profile.get("saves",{})).duplicate(true)
	a["traits"] = profile.get("ruleTraits",{}).duplicate(true)
	a["resistances"] = profile.get("damageResistances",[]).duplicate()
	a["immunities"] = profile.get("damageImmunities",[]).duplicate()
	a["condition_immunities"] = profile.get("conditionImmunities",[]).duplicate()
	a["conditions"] = a.get("conditions",[]).duplicate()
	a["known_by"] = a.get("known_by",[]).duplicate()
	a["position"] = a.get("position",Vector3.ZERO)
	a["defeated"] = false
	a["dead"] = false
	a["stable"] = false
	a["death_success"] = 0
	a["death_failure"] = 0
	a["concentration"] = ""
	a["stance"] = ""
	a["readied_action"]=""; a["readied_spell"]=false
	a["init"] = null
	a["reaction_used"] = false
	a["action_used"] = false
	a["bonus_used"] = false
	a["movement"] = a.speed
	a["speed_effects"] = {}
	a["slot_turn"] = -1
	a["sneak_turn"] = -1
	a["recharge"] = {}
	for action in actions:
		if action.has("recharge"): a.recharge[action.id]=true
	actors[id] = a

func error(message: String) -> bool:
	last_error = message
	return false

func current_id() -> String:
	return order[turn_index] if active and not initiative_pending and not order.is_empty() else ""

func start(ids: Array) -> bool:
	if active: return error("Ya hay un combate activo.")
	if not pending.is_empty(): return error("Resuelve o cancela la acción pendiente.")
	var picked: Array[String] = []
	for value in ids:
		var id := str(value)
		if not actors.has(id) or id in picked or bool(actors[id].dead): return error("Participante no válido o repetido.")
		picked.append(id)
	if picked.size()<2: return error("Elige al menos dos participantes.")
	order = picked
	active = true; initiative_pending = true; round_number = 1; turn_index = 0
	sequence.clear(); completed.clear()
	for id in order: actors[id].init = null
	changed.emit()
	return true

func submit_initiative(id: String, total: int) -> bool:
	if not active or not initiative_pending or id not in order: return error("No se espera esa iniciativa.")
	if actors[id].init != null: return error("Iniciativa ya registrada.")
	if total < -20 or total > 100: return error("Introduce el total físico de iniciativa.")
	actors[id].init = total
	var complete := true
	for participant in order:
		if actors[participant].init == null: complete = false
	if complete:
		# Stable tie order is the DM's participant order, never a random roll.
		var tie_order:=order.duplicate()
		order.sort_custom(func(a,b): return tie_order.find(a)<tie_order.find(b) if int(actors[a].init)==int(actors[b].init) else int(actors[a].init)>int(actors[b].init))
		initiative_pending = false
		_begin_turn()
	changed.emit()
	return true

func _begin_turn() -> void:
	turn_serial += 1
	for actor in actors.values(): actor.speed_effects.erase(current_id())
	var a: Dictionary = actors[current_id()]
	if a.readied_spell: end_concentration(current_id())
	a.readied_action=""; a.readied_spell=false
	if a.get("shield_active",false): a.ac-=5; a.shield_active=false
	a.action_used = false; a.bonus_used = false; a.reaction_used = false
	a.movement = effective_speed(current_id()); a.stance = ""
	if a.hp==0 and a.kind=="player" and not a.dead and not a.stable:
		pending = {"kind":"death","owner":current_id(),"label":"Salvación de muerte · d20 natural","committed":true}
	for action in a.actions:
		if action.has("recharge") and not a.recharge.get(action.id,true): followups.append({"kind":"recharge","owner":current_id(),"action_id":action.id,"minimum":int(action.recharge.minimum),"label":"Recarga %s · d6 físico, recupera con %d–6" % [action.label,int(action.recharge.minimum)],"committed":true})
	if pending.is_empty(): _next_followup()

func next_turn(requester: String, dm := false) -> bool:
	if not active or initiative_pending: return error("Faltan iniciativas.")
	if not dm and requester!=current_id(): return error("Solo puedes terminar tu turno.")
	if not pending.is_empty(): return error("Primero resuelve la tirada pendiente.")
	if not interrupted.is_empty(): return error("Termina la reacción antes de avanzar el turno.")
	_flush_visuals()
	sequence.clear()
	for _i in range(order.size()):
		turn_index += 1
		if turn_index>=order.size(): turn_index=0; round_number+=1
		var a: Dictionary = actors[order[turn_index]]
		if not a.dead and (not a.defeated or a.kind=="player" and a.hp==0):
			_begin_turn(); changed.emit(); return true
	finish("Sin combatientes capaces de continuar")
	return true

func finish(reason := "Fin del combate") -> void:
	if interrupted.has("visuals"):
		var previous: Array=interrupted.visuals.duplicate(true); previous.append_array(visual_queue); visual_queue.assign(previous)
	_flush_visuals()
	active=false; initiative_pending=false; order.clear(); pending.clear(); followups.clear(); sequence.clear(); interrupted.clear()
	# Concentration and its world effect can persist after initiative ends.
	resolved.emit({"type":"end","label":reason}); changed.emit()

func withdraw(id: String) -> bool:
	if not active or id not in order or not pending.is_empty(): return error("No se puede retirar esa ficha ahora.")
	var index := order.find(id)
	var was_current: bool=index==turn_index
	order.remove_at(index)
	if index<turn_index: turn_index-=1
	if order.size()<2: finish("Retirada confirmada por el DM"); return true
	turn_index=posmod(turn_index,order.size())
	if was_current and not initiative_pending: _begin_turn()
	_auto_end(); changed.emit(); return true

func action_for(id: String, action_id: String) -> Dictionary:
	if not actors.has(id): return {}
	for action in actors[id].actions:
		if str(action.id)==action_id: return action
	return {}

func distance(a: String,b: String) -> float:
	var p: Vector3=actors[a].position; var q: Vector3=actors[b].position
	# 5-foot grid diagonals, physical heights preserved in the renderer.
	return maxf(maxf(absf(p.x-q.x),absf(p.z-q.z)),absf(p.y-q.y))

func availability(id: String, action: Dictionary, trigger := "") -> String:
	if not actors.has(id): return "Ficha desconocida"
	var a: Dictionary=actors[id]
	var continuing: bool = sequence.get("actor","")==id and sequence.get("action","")==action.get("id","") and int(sequence.get("remaining",0))>0
	if (a.dead or a.defeated or a.hp<=0 or _incapacitated(a)) and not (continuing and action.get("id","")=="magic-missile"): return "No puede actuar"
	if not pending.is_empty(): return "Hay una tirada o confirmación pendiente"
	if active and not str(action.get("castingTime","")).is_empty(): return "Tiempo de lanzamiento prolongado: %s. Resolver fuera de la secuencia de acción instantánea." % action.castingTime
	if active and initiative_pending: return "Primero deben registrarse todas las iniciativas"
	var cost := str(sequence.get("cost",action.get("actionCost","action"))) if continuing else str(action.get("actionCost","action"))
	if continuing: trigger=str(sequence.get("trigger",trigger))
	if cost=="reaction" and trigger.is_empty(): return "Requiere un desencadenante confirmado por el DM"
	if action.has("recharge") and not continuing and not a.recharge.get(action.id,true): return "Debe recuperar la recarga con un d6 físico"
	if active:
		if id not in order: return "No participa en este combate"
		if cost=="reaction":
			if trigger.is_empty(): return "Requiere un desencadenante confirmado por el DM"
			if bool(a.reaction_used) and not continuing: return "Reacción gastada hasta el inicio de su turno"
		elif id!=current_id(): return "No es su turno"
		elif not continuing and bool(a.get("bonus_used" if cost=="bonus" else "action_used",false)): return "Recurso de turno gastado"
	if action.has("resource") and not continuing:
		var resource: Dictionary=action.resource
		if int(a.resources.get(resource.id,{}).get("current",0))<int(resource.get("cost",1)): return "No quedan recursos"
		if active and str(resource.id).begins_with("spell-slot") and int(a.slot_turn)==turn_serial: return "Solo un espacio de conjuro por turno"
		var suspended: Dictionary=interrupted.get("pending",interrupted)
		if active and str(resource.id).begins_with("spell-slot") and suspended.get("actor","")==id and str(suspended.get("action",{}).get("resource",{}).get("id","")).begins_with("spell-slot"): return "El conjuro pendiente ya usa el espacio de este turno"
	if action.has("inventoryCost"):
		var item := str(action.inventoryCost)
		if a.has("ammunition") and int(a.ammunition.get(item,0))<1: return "No queda munición"
	return ""

func declare(id: String, action_id: String, target_id: String="", options: Dictionary = {}) -> bool:
	var action := action_for(id,action_id).duplicate(true)
	if action.is_empty(): return error("La ficha no tiene esa acción.")
	var continuing: bool=sequence.get("actor","")==id and sequence.get("action","")==action_id and int(sequence.get("remaining",0))>0
	if continuing and sequence.get("cost","")=="reaction": options["trigger"]=sequence.get("trigger","")
	if options.get("trigger","") in ["opportunity","ready"]:
		if options.trigger=="opportunity" and action.get("range",{}).get("kind","")!="melee": return error("La oportunidad requiere un ataque cuerpo a cuerpo.")
		if options.trigger=="opportunity": action.erase("attackCount")
		if options.trigger=="ready" and not continuing:
			if actors[id].get("stance","")!="ready" or actors[id].readied_action!=action_id: return error("No es la acción que se había preparado.")
		if options.trigger=="ready" and (actors[id].readied_spell or sequence.get("prepaid_spell",false)):
			action.erase("resource"); options["prepaid_spell"]=true
		action.actionCost="reaction"
	var issue := availability(id,action,str(options.get("trigger","")))
	if not issue.is_empty(): return error(issue)
	var point: Vector3=options.get("point",Vector3.ZERO)
	var range_point: Vector3=options.get("range_point",point)
	var target_mode:=Targeting.mode(action)
	if target_mode in ["none","self"]:
		target_id=id; range_point=actors[id].position; point=options.get("point",range_point)
	elif target_mode in ["point","object"]:
		if not options.has("point"): return error("Elige una casilla / área." if target_mode=="point" else "Selecciona un objeto o describe el objeto al DM.")
		if target_mode=="object" and str(options.get("object_label","")).strip_edges().is_empty(): return error("Describe el objeto que vas a utilizar.")
		target_id=""
	elif not Targeting.accepts(action,actors[id],actors.get(target_id,{})): return error("Elige un objetivo válido: "+Targeting.label(action)+".")
	if Targeting.geometry(action).get("placement","")=="direction":
		var direction: Vector3=range_point-actors[id].position; direction.y=0
		if direction.length_squared()<.001: return error("Marca la dirección del área.")
		options["direction"]=direction.normalized(); range_point=actors[id].position
	var range_data: Dictionary=action.get("range",{"normalMeters":1.5,"kind":"melee"})
	if options.get("knockout",false) and range_data.get("kind","")!="melee": return error("Dejar inconsciente requiere un ataque cuerpo a cuerpo.")
	var meters: float=distance(id,target_id) if actors.has(target_id) else maxf(maxf(absf(actors[id].position.x-range_point.x),absf(actors[id].position.z-range_point.z)),absf(actors[id].position.y-range_point.y))
	if meters>float(range_data.get("longMeters",range_data.get("normalMeters",1.5)))+.15: return error("Objetivo fuera de alcance.")
	if not sequence.is_empty() and sequence.get("actor","")==id and sequence.get("action","")==action_id and sequence.get("locked",false) and sequence.get("target",target_id)!=target_id: return error("Esta secuencia está fijada al mismo objetivo.")
	if options.get("sneak",false) and (not actors[id].traits.has("sneakAttackDice") or int(actors[id].sneak_turn)==turn_serial or not action.get("finesse",false) and range_data.get("kind","")!="ranged"): return error("Ataque furtivo no elegible o ya usado este turno.")
	if action.get("resolution","")!="guided" and actors.has(target_id) and actors[target_id].dead and not (continuing and action_id=="magic-missile" and sequence.get("target","")==target_id): return error("Ese objetivo está muerto.")
	serial+=1
	pending={"id":serial,"actor":id,"action":action.duplicate(true),"target":target_id,"owner":id,"point":point,"committed":false,"options":options.duplicate(true),"long_range":meters>float(range_data.get("normalMeters",1.5))+.15}
	if action.get("resolution","")=="guided":
		pending.kind="guided"; pending.label=str(action.get("guidance",action.label))+" · confirma el DM"
	elif action.has("save"):
		pending.kind="save"; pending.owner=target_id
		pending.save_uses_total=actors[target_id].get("abilities",{}).is_empty() and not actors[target_id].saves.has(action.save.ability)
		pending.label="Salvación %s · CD %d · %s" % [str(action.save.ability).to_upper(),int(action.save.dc),"total físico con modificador confirmado por el DM" if pending.save_uses_total else "d20 natural %+d de la ficha" % _save_modifier(target_id,str(action.save.ability))]
		if actors[target_id].traits.get("magicResistance",false) and action.get("magical",false): pending.label+=" · ventaja: usa el mayor de 2d20"
	elif action.get("automaticHit",false):
		pending.kind="damage"; pending.label=_damage_label(action,false,bool(options.get("sneak",false)),id)
		if action_id=="magic-missile" and actors[target_id].get("shield_active",false): pending.kind="blocked"; pending.label="Escudo bloquea este dardo · confirma sin tirar daño"
	else:
		pending.kind="attack"
		var a: Dictionary=actors[id]
		var target: Dictionary=actors[target_id]
		var disadvantage: bool=pending.long_range or target.get("stance","")=="dodge" or "envenenada" in a.conditions or "asustada" in a.conditions
		var advantage: bool=options.get("advantage",false) or "paralizada" in target.conditions or "inconsciente" in target.conditions or "invisible" in a.conditions
		if "derribada" in target.conditions:
			if meters<=1.5: advantage=true
			else: disadvantage=true
		if "derribada" in a.conditions or "invisible" in target.conditions: disadvantage=true
		if range_data.get("kind","")=="ranged":
			for other in actors:
				if other!=id and actors[other].kind!=a.kind and not actors[other].defeated and distance(id,other)<=1.5: disadvantage=true
		var roll_note: String="(ventaja: el mayor de 2d20)" if advantage and not disadvantage else "(desventaja: el menor de 2d20)" if disadvantage and not advantage else "(ventaja y desventaja se anulan)" if advantage and disadvantage else ""
		if options.get("sneak",false) and disadvantage and not advantage:
			pending.clear(); return error("No se puede aplicar ataque furtivo con desventaja.")
		pending.label="Ataque · d20 natural %s %+d contra CA %d" % [roll_note,int(action.get("attackBonus",0)),int(target.ac)]
	changed.emit(); return true

func react(id: String,action_id: String,target_id: String,event: String,options: Dictionary={}) -> bool:
	if not interrupted.is_empty(): return error("Resuelve la reacción actual.")
	if event not in ["impact","fall","opportunity","ready"]: return error("Falta un desencadenante válido.")
	if action_for(id,action_id).get("actionCost","")!="reaction" and event not in ["opportunity","ready"]: return error("Esa acción no es una reacción.")
	if action_id=="shield" and (pending.is_empty() or pending.get("target","")!=id or pending.get("kind","")!="damage"): return error("Escudo necesita un impacto pendiente sobre quien lo lanza.")
	if action_id=="feather-fall" and event!="fall": return error("Caída de pluma solo al caer.")
	var previous: Dictionary={"pending":pending.duplicate(true),"sequence":sequence.duplicate(true),"visuals":visual_queue.duplicate(true)}
	pending.clear(); sequence.clear(); visual_queue.clear(); interrupted=previous
	var reaction_options:=options.duplicate(true); reaction_options["trigger"]=event
	if not declare(id,action_id,target_id,reaction_options): _restore_interruption(); return false
	return true

func _restore_interruption() -> void:
	var frame:=interrupted; interrupted={}
	pending=frame.get("pending",frame); sequence=frame.get("sequence",{})
	visual_queue.assign(frame.get("visuals",[]))

func cancel() -> bool:
	if pending.is_empty(): return true
	if pending.get("committed",false): return error("La tirada ya está confirmada; el DM debe terminar de resolverla.")
	if not sequence.is_empty(): pending.clear()
	elif not interrupted.is_empty(): _restore_interruption()
	else: pending.clear()
	changed.emit(); return true

func submit(value: int, owner: String, command_id: String) -> bool:
	if completed.has(command_id): return true
	if pending.is_empty(): return error("No hay tirada pendiente.")
	if owner!=str(pending.owner): return error("El dado pertenece a otra ficha.")
	var kind := str(pending.kind)
	if kind=="save" and pending.get("save_uses_total",false):
		if value < -20 or value>100: return error("Introduce el total físico de salvación confirmado por el DM.")
	elif kind in ["attack","save","concentration","death","fortitude"] and (value<1 or value>20): return error("Introduce un d20 natural entre 1 y 20.")
	if kind=="attack":
		var action: Dictionary=pending.action
		var hit: bool=value==20 or value!=1 and value+int(action.get("attackBonus",0))>=int(actors[pending.target].ac)
		pending.critical=value==20 or hit and distance(str(pending.actor),str(pending.target))<=1.5 and ("paralizada" in actors[pending.target].conditions or "inconsciente" in actors[pending.target].conditions); pending.committed=true
		pending.natural=value
		if hit:
			pending.kind="damage"; pending.label=_damage_label(action,bool(pending.critical),bool(pending.options.get("sneak",false)),str(pending.actor))
		else: _commit_result(0,false)
	elif kind=="save":
		var action: Dictionary=pending.action
		var modifier := _save_modifier(str(pending.target),str(action.save.ability))
		var succeeded: bool=value+modifier>=int(action.save.dc)
		pending.saved=succeeded; pending.committed=true
		if succeeded and not action.get("saveHalf",false): _commit_result(0,false)
		elif action.get("damageDice","1d1")=="1d1" and int(action.get("damageBonus",0))==0: _commit_result(0,true)
		else: pending.kind="damage"; pending.owner=pending.actor; pending.label=_damage_label(action,false)
	elif kind=="damage":
		var bounds := damage_bounds(pending.action,bool(pending.get("critical",false)),bool(pending.get("options",{}).get("sneak",false)),str(pending.actor))
		if value<bounds.x or value>bounds.y: return error("La suma física de dados debe estar entre %d y %d; el modificador se añade aparte." % [bounds.x,bounds.y])
		var damage := maxi(0,value+int(pending.action.get("damageBonus",0)))
		if pending.get("saved",false): damage=floori(damage/2.0)
		_commit_result(damage,true)
	elif kind=="guided":
		if value!=1: return error("El DM debe confirmar el efecto.")
		_commit_result(0,true)
	elif kind=="blocked":
		if value!=1: return error("Confirma el bloqueo sin tirar daño.")
		_commit_result(0,false)
	elif kind=="basic":
		if value!=1: return error("El DM debe confirmar la resolución.")
		var requested := pending.duplicate(true)
		pending.clear()
		var context: Dictionary=requested.get("context",{}).duplicate(true); context["dm_confirmed"]=true; context["prepared_action"]=requested.get("prepared_action","")
		if not basic(str(requested.owner),str(requested.basic),context): pending=requested; return false
	elif kind=="withdraw":
		if value!=1: return error("La retirada la confirma el DM.")
		var withdrawing: String=pending.owner
		pending.clear(); withdraw(withdrawing)
	elif kind=="concentration":
		if value+_save_modifier(owner,"con")<int(pending.dc): end_concentration(owner)
		pending.clear(); _next_followup()
	elif kind=="fortitude":
		if value+_save_modifier(owner,"con")>=int(pending.dc): heal(owner,1)
		else: actors[owner].dead=true; actors[owner].defeat_style="blood"
		pending.clear(); _next_followup(); _auto_end()
	elif kind=="recharge":
		if value<1 or value>6: return error("La recarga requiere un d6 físico.")
		actors[owner].recharge[pending.action_id]=value>=int(pending.minimum)
		pending.clear(); _next_followup()
	elif kind=="death":
		var a: Dictionary=actors[owner]
		if value==20:
			heal(owner,1)
			if current_id()==owner: a.movement=effective_speed(owner)
		elif value>=10: a.death_success+=1
		else: a.death_failure+=2 if value==1 else 1
		if int(a.death_failure)>=3: a.dead=true; a.defeated=true
		if a.dead: a.defeat_style="blood"
		if int(a.death_success)>=3: a.stable=true; a.death_success=0; a.death_failure=0
		pending.clear()
		_next_followup()
	completed[command_id]=true
	changed.emit(); return true

func _spend(id: String,action: Dictionary) -> void:
	var a: Dictionary=actors[id]
	var continuing: bool=sequence.get("actor","")==id and sequence.get("action","")==action.id and int(sequence.get("remaining",0))>0
	if action.has("inventoryCost") and a.has("ammunition"): a.ammunition[action.inventoryCost]=int(a.ammunition.get(action.inventoryCost,0))-1
	if continuing: return
	if active: a["bonus_used" if action.get("actionCost","")=="bonus" else "reaction_used" if action.get("actionCost","")=="reaction" else "action_used"]=true
	if action.has("resource"):
		a.resources[action.resource.id].current-=int(action.resource.get("cost",1))
		if active and str(action.resource.id).begins_with("spell-slot"): a.slot_turn=turn_serial
	if action.has("recharge"): a.recharge[action.id]=false
	if int(action.get("attackCount",1))>1: sequence={"actor":id,"action":action.id,"remaining":int(action.attackCount),"locked":action.get("lockSequenceTarget",false),"target":pending.get("target",""),"cost":action.get("actionCost","action"),"trigger":pending.get("options",{}).get("trigger",""),"prepaid_spell":pending.get("options",{}).get("prepaid_spell",false)}

func _commit_result(amount: int,hit: bool) -> void:
	var p := pending.duplicate(true)
	var action: Dictionary=p.action
	_spend(str(p.actor),action)
	if p.get("options",{}).get("trigger","")=="ready":
		actors[p.actor].readied_action=""; actors[p.actor].stance=""
		if actors[p.actor].readied_spell: end_concentration(str(p.actor))
	if not sequence.is_empty():
		sequence.remaining-=1
		if int(sequence.remaining)<=0: sequence.clear()
		elif action.has("followUpActionId"): sequence.action=action.followUpActionId
	if hit and p.get("options",{}).get("sneak",false): actors[p.actor].sneak_turn=turn_serial
	if hit:
		if action.id=="ray-of-frost":
			actors[p.target].speed_effects[p.actor]=-3.0
			actors[p.target].movement=maxf(0,float(actors[p.target].movement)-3.0)
		if action.id=="shield" and not actors[p.actor].get("shield_active",false): actors[p.actor].ac+=5; actors[p.actor].shield_active=true
		if action.get("healing",false): heal(str(p.target),amount)
		elif amount>0: damage(str(p.target),amount,str(action.get("damageType","")),bool(p.get("critical",false)),bool(p.get("options",{}).get("knockout",false)) or blunt_knockout and action.get("damageType","")=="contundente" and action.get("range",{}).get("kind","")=="melee")
		if action.has("save") and not p.get("saved",false) and action.save.has("failureCondition"): add_condition(str(p.target),str(action.save.failureCondition))
		if action.get("concentration",false):
			end_concentration(str(p.actor)); actors[p.actor].concentration=action.id
		if str(action.id).begins_with("fog-cloud"):
			effects.append({"actor":p.actor,"kind":"fog","point":p.point,"radius":6.0,"remaining_seconds":3600.0})
	if not sequence.is_empty() and sequence.get("action","")!="magic-missile" and actors[sequence.actor].defeated: sequence.clear()
	# Only this final event may animate attacker, impact, sound, or damage text.
	p.type="action"; p.hit=hit; p.amount=amount
	pending.clear()
	if int(action.get("attackCount",1))>1 or not visual_queue.is_empty():
		visual_queue.append(p)
		if sequence.is_empty(): _flush_visuals()
	else: resolved.emit(p)
	if not interrupted.is_empty() and sequence.is_empty():
		_restore_interruption()
		var original: Dictionary=pending.get("action",{})
		var target: Dictionary=actors.get(pending.get("target",""),{})
		if pending.get("kind","")=="damage" and (original.get("id","")=="magic-missile" and target.get("shield_active",false) or pending.get("natural",20)!=20 and int(pending.get("natural",20))+int(original.get("attackBonus",0))<int(target.get("ac",0))):
			_commit_result(0,false)
		elif pending.is_empty(): _next_followup()
	else: _next_followup()
	_auto_end()

func _flush_visuals() -> void:
	var ready:=visual_queue.duplicate(true); visual_queue.clear()
	for event in ready: resolved.emit(event)

func advance_time(seconds: float) -> void:
	var ended: Array=[]
	for effect in effects:
		if not effect.has("remaining_seconds"): continue
		effect.remaining_seconds=maxf(0,float(effect.remaining_seconds)-seconds)
		if effect.remaining_seconds<=0: ended.append(effect.actor)
	for id in ended: end_concentration(id)

func _next_followup() -> void:
	if not followups.is_empty(): pending=followups.pop_front()

func damage(id: String,amount: int,type: String,critical := false,knockout := false) -> void:
	if not actors.has(id) or amount<0: return
	var a: Dictionary=actors[id]
	if type in a.immunities: amount=0
	elif type in a.resistances: amount=floori(amount/2.0)
	if amount>0 and a.hp==0 and not a.dead:
		if a.stable: a.stable=false; a.death_success=0; a.death_failure=0
		a.death_failure+=2 if critical else 1
		if a.death_failure>=3: a.dead=true
	var excess: int=amount-int(a.hp)
	a.hp=maxi(0,int(a.hp)-amount)
	if a.hp==0:
		end_concentration(id)
		if knockout: a.hp=1; a.stable=true; a.defeated=true; a.defeat_style="unconscious"; add_condition(id,"inconsciente")
		else:
			a.defeated=true; a.dead=a.kind!="player" or excess>=int(a.hp_max) or a.dead
			if a.kind=="enemy" and a.traits.get("undeadFortitude",false) and amount>0 and not critical and type!="radiante":
				a.dead=false
				followups.append({"kind":"fortitude","owner":id,"dc":5+amount,"label":"Fortaleza de no muerto · CON CD %d · d20 natural" % (5+amount),"committed":true})
			a.defeat_style="blood"; add_condition(id,"inconsciente")
	elif amount>0 and not str(a.concentration).is_empty():
		followups.append({"kind":"concentration","owner":id,"dc":maxi(10,mini(30,floori(amount/2.0))),"label":"Concentración · CON CD %d" % maxi(10,mini(30,floori(amount/2.0))),"committed":true})
	changed.emit()

func heal(id: String,amount: int) -> void:
	if not actors.has(id) or actors[id].dead or amount<=0: return
	var a: Dictionary=actors[id]
	a.hp=mini(int(a.hp_max),int(a.hp)+maxi(0,amount))
	if a.hp>0: a.defeated=false; a.stable=false; a.death_success=0; a.death_failure=0; a.conditions.erase("inconsciente")
	changed.emit()

func add_condition(id: String,condition: String) -> void:
	if not actors.has(id) or condition in actors[id].condition_immunities: return
	if condition not in actors[id].conditions: actors[id].conditions.append(condition)
	if condition in ["inconsciente","paralizada","aturdida","incapacitada"]: end_concentration(id)

func end_concentration(id: String) -> void:
	if actors.has(id):
		actors[id].concentration=""
		if actors[id].readied_spell: actors[id].readied_spell=false; actors[id].readied_action=""; actors[id].stance=""
	for i in range(effects.size()-1,-1,-1):
		if effects[i].actor==id: effects.remove_at(i)
	changed.emit()

func basic(id: String,kind: String,extra: Dictionary={}) -> bool:
	var action := {"id":kind,"label":kind,"actionCost":extra.get("actionCost","action")}
	var issue := availability(id,action)
	if not issue.is_empty(): return error(issue)
	if kind not in ["dash","disengage","dodge","help","hide","ready","search","study","influence","use-object","improvise"]: return error("Acción desconocida.")
	if kind in ["help","hide","ready","search","study","influence","use-object","improvise"] and not extra.get("dm_confirmed",false): return error("Esta acción requiere descripción y resolución del DM; no todas necesitan objetivo.")
	if not _valid_basic_context(id,kind,extra): return false
	if kind=="ready":
		var selected: Dictionary=action_for(id,str(extra.get("prepared_action",""))).duplicate(true)
		if selected.is_empty() or selected.get("actionCost","action")!="action": return error("Elige una acción que pueda prepararse.")
		var unavailable:=availability(id,selected)
		if not unavailable.is_empty(): return error(unavailable)
		selected.erase("attackCount"); selected.erase("inventoryCost"); _spend(id,selected)
		actors[id].readied_action=selected.id
		if selected.get("magical",false) or str(selected.get("resource",{}).get("id","")).begins_with("spell-slot"):
			end_concentration(id); actors[id].readied_spell=true; actors[id].concentration="ready:"+str(selected.id)
	else: _spend(id,action)
	if kind=="dash": actors[id].movement+=effective_speed(id)
	else: actors[id].stance=kind
	resolved.emit({"type":"basic","actor":id,"action":action}); changed.emit(); return true

func _valid_basic_context(id: String,kind: String,context: Dictionary) -> bool:
	if kind=="search" and not context.has("point"): return error("Marca la zona que quieres examinar.")
	if kind in ["help","influence"]:
		var target:=str(context.get("target",""))
		if not Targeting.accepts({"id":kind},actors[id],actors.get(target,{})) or target==id: return error("Elige otra criatura válida para "+kind+".")
		if actors[target].dead: return error("Ese objetivo está muerto.")
		if kind=="help" and distance(id,target)>1.65: return error("Acércate al aliado para ayudarle.")
	if kind=="use-object" and str(context.get("object_label","")).strip_edges().is_empty(): return error("Describe el objeto que utilizas.")
	return true

func request_basic(id: String,kind: String,label: String,prepared_action: String="",context: Dictionary={}) -> bool:
	var issue := availability(id,{"id":kind})
	if not issue.is_empty(): return error(issue)
	if not _valid_basic_context(id,kind,context): return false
	if kind=="ready" and prepared_action.is_empty():
		for candidate in actors[id].actions:
			if candidate.get("actionCost","action")=="action" and candidate.get("range",{}).get("kind","")=="melee": prepared_action=candidate.id; break
	pending={"kind":"basic","basic":kind,"prepared_action":prepared_action,"actor":id,"owner":id,"context":context.duplicate(true),"label":label+" · "+Targeting.label({"id":kind})+". Describe la intención; el DM resuelve la prueba física y confirma el efecto.","committed":false}
	changed.emit(); return true

func spend_movement(id: String,meters: float,difficult := false) -> bool:
	if meters<0 or not actors.has(id): return false
	if not active: return true
	if initiative_pending or current_id()!=id or not pending.is_empty() or actors[id].defeated: return false
	if sequence.get("actor","")==id and sequence.get("action","")=="magic-missile": return false
	if "apresada" in actors[id].conditions or "restringida" in actors[id].conditions or "paralizada" in actors[id].conditions: return false
	var cost := meters*(1.0+(1.0 if difficult else 0.0)+(1.0 if "derribada" in actors[id].conditions else 0.0))
	if cost>float(actors[id].movement)+.001: return false
	actors[id].movement=maxf(0,float(actors[id].movement)-cost)
	return true

func effective_speed(id: String) -> float:
	var a: Dictionary=actors[id]
	for condition in ["apresada","restringida","paralizada","aturdida","inconsciente"]:
		if condition in a.conditions: return 0
	var penalty:=0.0
	for effect in a.speed_effects.values(): penalty=minf(penalty,float(effect))
	return maxf(0,float(a.speed)+penalty)

func request_withdraw(id: String) -> bool:
	if not active or id not in order or not pending.is_empty(): return error("No se puede declarar retirada ahora.")
	pending={"kind":"withdraw","owner":id,"actor":id,"label":"Retirada: el DM confirma si has escapado del encuentro. No es teletransporte ni movimiento gratuito.","committed":false}
	changed.emit(); return true

func _incapacitated(a: Dictionary) -> bool:
	for c in ["inconsciente","paralizada","aturdida","incapacitada"]:
		if c in a.conditions: return true
	return false

func _save_modifier(id: String,ability: String) -> int:
	var a: Dictionary=actors[id]
	if a.has("saves") and a.saves.has(ability): return int(a.saves[ability])
	var names := {"str":"FUE","dex":"DES","con":"CON","int":"INT","wis":"SAB","cha":"CAR"}
	return floori((int(a.get("abilities",{}).get(names.get(ability,"CON"),10))-10)/2.0)

func damage_bounds(action: Dictionary,critical: bool,sneak := false,id := "") -> Vector2i:
	var dice := str(action.get("damageDice","1d1")).split("d")
	var count := int(dice[0]); var sides := int(dice[1]) if dice.size()>1 else 1
	count*=2 if critical else 1
	var result := Vector2i(count,count*sides)
	if sneak and actors.has(id) and actors[id].traits.has("sneakAttackDice") and int(actors[id].sneak_turn)!=turn_serial:
		var extra := str(actors[id].traits.sneakAttackDice).split("d")
		if extra.size()==2: result+=Vector2i(int(extra[0]),int(extra[0])*int(extra[1]))*(2 if critical else 1)
	return result

func _damage_label(action: Dictionary,critical: bool,sneak := false,id := "") -> String:
	var expression: String=str(action.get("damageDice","1d1"))
	if sneak and actors.has(id) and actors[id].traits.has("sneakAttackDice"): expression+=" + "+str(actors[id].traits.sneakAttackDice)+" furtivo"
	return "Dados físicos %s%s · introduce solo la suma de dados; modificador %+d aparte" % [expression," · duplica TODOS los dados (crítico)" if critical else "",int(action.get("damageBonus",0))]

func _auto_end() -> void:
	if not active or initiative_pending: return
	if sequence.get("action","")=="magic-missile" and int(sequence.get("remaining",0))>0: return
	if pending.get("kind","")=="fortitude": return
	for followup in followups:
		if followup.get("kind","")=="fortitude": return
	var enemies_alive := false; var enemies_present := false; var party_alive := false
	for id in order:
		var a: Dictionary=actors[id]
		if a.kind=="enemy": enemies_present=true; enemies_alive=enemies_alive or not a.defeated and not a.dead
		else: party_alive=party_alive or not a.dead
	if enemies_present and not enemies_alive: finish("Todos los enemigos han sido derrotados")
	elif not party_alive: finish("Grupo fuera de combate · resuelve el DM")

func timeline() -> Array[Dictionary]:
	var result: Array[Dictionary]=[]
	if not active or order.is_empty(): return result
	var eligible: Array[String]=[]
	for id in order:
		var actor: Dictionary=actors[id]
		if initiative_pending or not actor.dead and (not actor.defeated or actor.kind=="player" and actor.hp==0): eligible.append(id)
	if eligible.is_empty(): return result
	var start_index:=maxi(0,eligible.find(current_id()))
	for i in range(mini(7,eligible.size() if initiative_pending else 7)):
		var index := posmod(start_index+i,eligible.size())
		var a: Dictionary=actors[eligible[index]]
		result.append({"id":a.id,"name":a.name,"init":a.init,"offset":i,"round":round_number+floori((start_index+i)/float(eligible.size()))})
	return result
