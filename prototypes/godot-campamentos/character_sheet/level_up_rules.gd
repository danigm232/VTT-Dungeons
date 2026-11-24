extends RefCounted
## Rules-compliant D&D 5e (2024 / 2014) character progression engine.
## Computes pure before/after proposals, validates player choices and multiclass
## prerequisites, applies atomically, and records snapshots for safe rollback.
const Model=preload("res://character_sheet/sheet_model.gd")

const DEFAULT_EDITION:="dnd-2024"
const EDITIONS:={"dnd-2024":"D&D 5e (2024)","dnd-2014":"D&D 5e (2014)"}

const CLASSES:={
	"wizard":{
		"name":"Mago","hit_die":6,"fixed_hp":4,"primary":"INT","caster":"full","casting_ability":"INT",
		"subclasses":["Evocador","Abjurador","Adivinador","Ilusionista"],
		"scholar_skills":["Arcanos","Historia","Investigación","Medicina","Naturaleza","Religión"],
		"spells_by_level":{
			1:[
				{"id":"mage-armor","name":"Armadura de mago","level":1,"detail":"CA base 13 + DES durante 8 h · Toque","actionCost":"action","range":{"normalMeters":1.5},"resolution":"guided","magical":true,"resource":{"id":"spell-slot-1","cost":1},"guidance":"Toque · 8 h · La CA base del objetivo sin armadura pasa a 13 + DES."},
				{"id":"thunderwave","name":"Onda atronadora","level":1,"detail":"Salv. CON · 2d8 trueno y empuja 3 m · Cubo 4,5 m","actionCost":"action","range":{"normalMeters":4.5},"damageDice":"2d8","damageBonus":0,"damageType":"trueno","resolution":"guided","targeting":"point","magical":true,"resource":{"id":"spell-slot-1","cost":1},"guidance":"Cubo 4,5 m · CON CD de conjuro · 2d8 trueno y empuja 3 m (mitad al salvar)."},
				{"id":"magic-missile","name":"Misil mágico","level":1,"detail":"3 dardos infalibles · 1d4+1 fuerza · 36 m"},
				{"id":"burning-hands","name":"Manos ardientes","level":1,"detail":"Salv. DES · 3d6 fuego · Cono 4,5 m"},
				{"id":"shield","name":"Escudo","level":1,"detail":"Reacción +5 CA hasta inicio del siguiente turno"},
				{"id":"detect-magic","name":"Detectar magia","level":1,"detail":"Ritual / Concentración · 9 m"}
			],
			2:[
				{"id":"misty-step","name":"Paso brumoso","level":2,"detail":"Teletransporte 9 m · Acción adicional","actionCost":"bonus","range":{"normalMeters":9.0},"resolution":"guided","magical":true,"resource":{"id":"spell-slot-2","cost":1},"guidance":"Acción adicional · Teletransporte hasta 9 m a un espacio visible desocupado."}
			]
		}
	},
	"cleric":{
		"name":"Clériga","hit_die":8,"fixed_hp":5,"primary":"SAB","caster":"full","casting_ability":"SAB",
		"subclasses":["Dominio de la Vida","Dominio de la Luz","Dominio de la Guerra","Dominio del Engaño"],
		"spells_by_level":{
			1:[
				{"id":"cure-wounds","name":"Curar heridas","level":1,"detail":"2d8 + SAB PG (2024) · Toque","actionCost":"action","range":{"normalMeters":1.5},"damageDice":"2d8","damageBonus":3,"damageType":"","healing":true,"automaticHit":true,"magical":true,"resource":{"id":"spell-slot-1","cost":1}},
				{"id":"guiding-bolt","name":"Saeta guía","level":1,"detail":"Ataque de conjuro · 4d6 radiante · 36 m","actionCost":"action","range":{"kind":"ranged","normalMeters":36.0,"longMeters":36.0},"attackBonus":5,"damageDice":"4d6","damageBonus":0,"damageType":"radiante","magical":true,"resource":{"id":"spell-slot-1","cost":1}},
				{"id":"healing-word","name":"Palabra de curación","level":1,"detail":"2d4+3 PG (acción adicional, 2024) · 18 m"},
				{"id":"bless","name":"Bendición","level":1,"detail":"+1d4 a ataques y salvaciones (3 criaturas) · 9 m"},
				{"id":"shield-of-faith","name":"Escudo de fe","level":1,"detail":"+2 CA (concentración) · 18 m"}
			],
			2:[
				{"id":"spiritual-weapon","name":"Arma espiritual","level":2,"detail":"1d8 + SAB fuerza · Acción adicional · 18 m","actionCost":"bonus","range":{"kind":"ranged","normalMeters":18.0,"longMeters":18.0},"attackBonus":5,"damageDice":"1d8","damageBonus":3,"damageType":"fuerza","concentration":true,"magical":true,"resource":{"id":"spell-slot-2","cost":1}}
			]
		}
	},
	"rogue":{
		"name":"Pícara","hit_die":8,"fixed_hp":5,"primary":"DES","caster":"none","casting_ability":"",
		"subclasses":["Ladrón","Asesino","Embaucador arcano"],
		"spells_by_level":{}
	}
}

const FEATS:={
	"alerta":{"name":"Alerta","description":"+Bonificador de competencia a la Iniciativa y no puedes ser sorprendido mientras estés consciente.","initiative_bonus":2},
	"duro":{"name":"Duro","description":"Tus PG máximos aumentan en 2 por cada nivel que tengas y +2 adicionales en cada subida futura.","hp_per_level":2},
	"mente-aguda":{"name":"Mente aguda","description":"+1 a Inteligencia y ventaja en pruebas de memoria o estudio arcano.","ability_bonus":{"INT":1}},
	"iniciado-magia":{"name":"Iniciado en la magia","description":"Aprendes un truco y un conjuro de nivel 1 que puedes lanzar una vez por descanso largo sin espacio."}
}

# Full-caster spell slots by total caster level (1..5+)
const FULL_CASTER_SLOTS:={
	1:{1:2},
	2:{1:3},
	3:{1:4,2:2},
	4:{1:4,2:3},
	5:{1:4,2:3,3:2},
	6:{1:4,2:3,3:3},
	7:{1:4,2:3,3:3,4:1},
	8:{1:4,2:3,3:3,4:2}
}

static func actor_edition(actor: Dictionary) -> String:
	var ed:=str(actor.get("rules_edition",""))
	if ed in EDITIONS: return ed
	# María/Trinity starter sheet explicitly retains 2014 legacy compatibility unless changed by DM.
	if str(actor.get("id",""))=="maria": return "dnd-2014"
	return DEFAULT_EDITION

static func infer_class_id(actor: Dictionary) -> String:
	var text:=(str(actor.get("class_line",""))+" "+str(actor.get("short_desc",""))+" "+str(actor.get("identity",""))).to_lower()
	if text.contains("mag"): return "wizard"
	if text.contains("clérig") or text.contains("clerig"): return "cleric"
	if text.contains("pícar") or text.contains("picar"): return "rogue"
	return "wizard"

static func actor_classes(actor: Dictionary) -> Array:
	var existing=actor.get("classes",[])
	if existing is Array and not existing.is_empty():
		var out: Array=[]
		for entry in existing:
			if entry is Dictionary:
				var d: Dictionary=entry.duplicate(true)
				if not d.has("id"): d["id"]=infer_class_id({"class_line":str(d.get("name",""))})
				if not d.has("name"): d["name"]=CLASSES.get(d.id,{}).get("name",str(d.id))
				if not d.has("level"): d["level"]=1
				out.append(d)
		if not out.is_empty(): return out
	var cid:=infer_class_id(actor)
	var cname:=str(CLASSES.get(cid,{}).get("name","Aventurero"))
	return [{"id":cid,"name":cname,"level":maxi(1,int(actor.get("level",1))),"subclass":str(actor.get("subclass",""))}]

static func total_level(classes: Array) -> int:
	var sum:=0
	for c in classes: sum+=int(c.get("level",1))
	return maxi(1,sum)

static func multiclass_check(actor: Dictionary,target_class_id: String) -> Dictionary:
	var classes:=actor_classes(actor)
	for c in classes:
		if str(c.id)==target_class_id: return {"allowed":true,"reason":"Clase actual del personaje."}
	var abilities: Dictionary=actor.get("abilities",{})
	var missing:=PackedStringArray()
	for c in classes:
		var req_ab:=str(CLASSES.get(c.id,{}).get("primary",""))
		if not req_ab.is_empty() and int(abilities.get(req_ab,10))<13:
			missing.append("%s %d/13 (por %s)" % [req_ab,int(abilities.get(req_ab,10)),c.name])
	var target_ab:=str(CLASSES.get(target_class_id,{}).get("primary",""))
	if not target_ab.is_empty() and int(abilities.get(target_ab,10))<13:
		missing.append("%s %d/13 (por %s)" % [target_ab,int(abilities.get(target_ab,10)),CLASSES.get(target_class_id,{}).get("name",target_class_id)])
	if missing.is_empty(): return {"allowed":true,"reason":"Cumple requisitos de multiclase (≥ 13)."}
	return {"allowed":false,"reason":"Requisito de multiclase no cumplido: "+", ".join(missing)+"."}

static func is_hill_dwarf(actor: Dictionary) -> bool:
	var blob:=(str(actor.get("species",""))+" "+str(actor.get("class_line",""))+" "+str(actor.get("features",[]))).to_lower()
	return blob.contains("enana de las colinas") or blob.contains("enano de las colinas")

static func required_choices(actor: Dictionary,class_id: String,new_class_level: int,edition: String) -> Dictionary:
	var needs: Dictionary={"subclass":false,"asi_or_feat":false,"scholar_skill":false,"spell_picks":0,"max_spell_level":0}
	var cdef: Dictionary=CLASSES.get(class_id,{})
	var existing_sub:=""
	for c in actor_classes(actor):
		if str(c.id)==class_id: existing_sub=str(c.get("subclass",""))
	var sub_level:=3 if edition=="dnd-2024" else (2 if class_id=="wizard" else (1 if class_id=="cleric" else 3))
	if new_class_level>=sub_level and existing_sub.is_empty() and not cdef.get("subclasses",[]).is_empty():
		needs.subclass=true
	if new_class_level in [4,8,12,16,19]:
		needs.asi_or_feat=true
	if edition=="dnd-2024" and class_id=="wizard" and new_class_level==2:
		needs.scholar_skill=true
	if cdef.get("caster","none")=="full":
		var max_sl:=1 if new_class_level<3 else (2 if new_class_level<5 else 3)
		needs.max_spell_level=max_sl
		needs.spell_picks=2 if class_id=="wizard" else 1
	return needs

static func unlocked_features(class_id: String,new_class_level: int,edition: String) -> Array:
	var out: Array=[]
	match class_id:
		"wizard":
			if new_class_level==2 and edition=="dnd-2024":
				out.append({"name":"Erudito (Mago Nv. 2)","category":"Clase","description":"Obtienes Pericia en una habilidad de saber en la que seas competente o entrenado."})
			elif new_class_level==2 and edition=="dnd-2014":
				out.append({"name":"Tradición arcana (Mago Nv. 2)","category":"Subclase","description":"Eliges una escuela de magia que define tu especialización arcana."})
			if new_class_level==3:
				out.append({"name":"Conjuros de nivel 2","category":"Clase","description":"Desbloqueas espacios de conjuro de nivel 2 y puedes añadir conjuros de nivel 2 a tu grimorio."})
			if new_class_level==5:
				out.append({"name":"Memorizar conjuro","category":"Clase","description":"Al completar un descanso corto puedes sustituir uno de tus conjuros preparados por otro de tu libro."})
		"cleric":
			if new_class_level==2:
				out.append({"name":"Canalizar divinidad","category":"Clase","uses_label":"2 usos / descanso" if edition=="dnd-2024" else "1 uso / descanso","description":"Canalizas energía divina para Expulsar muertos vivientes o invocar Chispa divina (curación o daño radiante)."})
			if new_class_level==3:
				out.append({"name":"Conjuros divinos de nivel 2","category":"Clase","description":"Accedes a conjuros divinos de nivel 2 y eliges tu Dominio divino."})
			if new_class_level==5:
				out.append({"name":"Abrasar muertos vivientes" if edition=="dnd-2024" else "Destruir muertos vivientes","category":"Clase","description":"Tu Canalizar divinidad inflige daño radiante adicional o destruye muertos vivientes menores."})
		"rogue":
			if new_class_level==2:
				out.append({"name":"Acción astuta","category":"Clase","description":"Puedes usar Correr, Destrabarse o Esconderse como acción adicional en cada turno."})
			if new_class_level==3:
				out.append({"name":"Ataque furtivo (2d6)","category":"Clase","description":"Tu daño de Ataque furtivo aumenta a 2d6 una vez por turno."})
				if edition=="dnd-2024":
					out.append({"name":"Puntería firme","category":"Clase","description":"Como acción adicional, ganas ventaja en tu siguiente tirada de ataque este turno si no te has movido."})
			if new_class_level==5:
				out.append({"name":"Esquiva asombrosa","category":"Clase","description":"Como reacción cuando un atacante que puedes ver te impacta, reduces el daño recibido a la mitad."})
				out.append({"name":"Ataque furtivo (3d6)","category":"Clase","description":"Tu daño de Ataque furtivo aumenta a 3d6."})
	return out

static func available_spells_for_pick(actor: Dictionary,class_id: String,max_spell_level: int) -> Array:
	var cdef: Dictionary=CLASSES.get(class_id,{})
	var existing_names: Dictionary={}
	for sp in actor.get("spells",[]): existing_names[Model.normalized(str(sp.get("name","")))]=true
	var pool: Array=[]
	for lvl in range(1,max_spell_level+1):
		for sp in cdef.get("spells_by_level",{}).get(lvl,[]):
			if not existing_names.has(Model.normalized(str(sp.name))):
				pool.append(sp.duplicate(true))
	return pool

static func propose(actor: Dictionary,runtime: Dictionary,choices: Dictionary) -> Dictionary:
	var edition:=str(choices.get("edition",actor_edition(actor)))
	var classes:=actor_classes(actor)
	var from_level:=total_level(classes)
	var to_level:=from_level+1
	var class_id:=str(choices.get("class_id",classes[0].id))
	var errors: Array[String]=[]
	var mc:=multiclass_check(actor,class_id)
	if not mc.allowed: errors.append(mc.reason)
	var new_classes: Array=classes.duplicate(true)
	var found_cls: Dictionary={}
	for c in new_classes:
		if str(c.id)==class_id:
			c["level"]=int(c.level)+1
			found_cls=c; break
	if found_cls.is_empty():
		var cname:=str(CLASSES.get(class_id,{}).get("name",class_id.capitalize()))
		found_cls={"id":class_id,"name":cname,"level":1,"subclass":""}
		new_classes.append(found_cls)
	var new_class_level:=int(found_cls.level)
	var cdef: Dictionary=CLASSES.get(class_id,{})
	var req:=required_choices(actor,class_id,new_class_level,edition)
	# Validate abilities & ASI/Feat
	var new_abilities: Dictionary=actor.get("abilities",{}).duplicate(true)
	var gained_feat: Dictionary={}
	if req.asi_or_feat:
		var asi_mode:=str(choices.get("asi_mode",""))
		if asi_mode=="asi2":
			var ab:=str(choices.get("asi_primary",""))
			if ab.is_empty() or not new_abilities.has(ab): errors.append("Elige la característica para +2.")
			elif int(new_abilities[ab])>=20: errors.append(ab+" ya está en el máximo de 20.")
			else: new_abilities[ab]=mini(20,int(new_abilities[ab])+2)
		elif asi_mode=="asi11":
			var ab1:=str(choices.get("asi_primary","")); var ab2:=str(choices.get("asi_secondary",""))
			if ab1.is_empty() or ab2.is_empty() or ab1==ab2: errors.append("Elige dos características distintas para +1/+1.")
			else:
				new_abilities[ab1]=mini(20,int(new_abilities.get(ab1,10))+1)
				new_abilities[ab2]=mini(20,int(new_abilities.get(ab2,10))+1)
		elif asi_mode=="feat":
			var fid:=str(choices.get("feat_id",""))
			if not FEATS.has(fid): errors.append("Selecciona una dote válida.")
			else:
				gained_feat=FEATS[fid].duplicate(true); gained_feat["id"]=fid
				for k in gained_feat.get("ability_bonus",{}):
					new_abilities[k]=mini(20,int(new_abilities.get(k,10))+int(gained_feat.ability_bonus[k]))
		else:
			errors.append("Debes elegir Mejora de característica (+2 / +1+1) o Dote.")
	# Validate subclass
	var chosen_subclass:=str(choices.get("subclass",""))
	if req.subclass:
		if chosen_subclass.is_empty(): errors.append("Debes elegir una subclase para este nivel.")
		else: found_cls["subclass"]=chosen_subclass
	# Validate scholar skill
	var chosen_scholar:=str(choices.get("scholar_skill",""))
	if req.scholar_skill and chosen_scholar.is_empty():
		errors.append("Debes elegir una habilidad para Erudito (Pericia).")
	# Validate spells
	var chosen_spells: Array=choices.get("spells",[]).duplicate(true)
	var spell_pool:=available_spells_for_pick(actor,class_id,req.max_spell_level) if req.spell_picks>0 else []
	var expected_picks:=mini(req.spell_picks,spell_pool.size())
	if expected_picks>0 and chosen_spells.size()<expected_picks:
		errors.append("Selecciona %d conjuro(s) nuevo(s) para este nivel." % expected_picks)
	# HP calculation
	var old_con_mod:=Model.modifier(int(actor.get("abilities",{}).get("CON",10)))
	var new_con_mod:=Model.modifier(int(new_abilities.get("CON",10)))
	var hit_die:=int(cdef.get("hit_die",8))
	var hp_method:=str(choices.get("hp_method","fixed"))
	var base_roll:=int(cdef.get("fixed_hp",5)) if hp_method=="fixed" else clampi(int(choices.get("hp_roll",int(cdef.get("fixed_hp",5)))),1,hit_die)
	var hp_gain:=maxi(1,base_roll+new_con_mod)
	if is_hill_dwarf(actor): hp_gain+=1
	if new_con_mod>old_con_mod: hp_gain+=(new_con_mod-old_con_mod)*from_level
	if gained_feat.has("hp_per_level"): hp_gain+=int(gained_feat.hp_per_level)*to_level
	elif _has_tough_feat(actor): hp_gain+=2
	var old_hp_max:=int(runtime.get("hp_max",actor.get("hp_max",10)))
	var new_hp_max:=old_hp_max+hp_gain
	# Proficiency bonus
	var old_prof:=2+floori(float(from_level-1)/4.0)
	var new_prof:=2+floori(float(to_level-1)/4.0)
	# Spell slots (combined full caster levels)
	var caster_lvl:=0
	for c in new_classes:
		if CLASSES.get(c.id,{}).get("caster","none")=="full": caster_lvl+=int(c.level)
	var new_slots: Dictionary=FULL_CASTER_SLOTS.get(mini(caster_lvl,8),{}) if caster_lvl>0 else {}
	# Casting stats
	var cast_ab:=str(cdef.get("casting_ability",""))
	var new_cast_dc:=0; var new_cast_atk:=0
	if not cast_ab.is_empty():
		var ab_mod:=Model.modifier(int(new_abilities.get(cast_ab,10)))
		new_cast_dc=8+new_prof+ab_mod
		new_cast_atk=new_prof+ab_mod
	# New features & actions
	var new_features:=unlocked_features(class_id,new_class_level,edition)
	if not chosen_subclass.is_empty():
		new_features.append({"name":"Subclase · "+chosen_subclass,"category":"Subclase","description":"Especialización de %s elegida al alcanzar el nivel %d (%s)." % [found_cls.name,new_class_level,EDITIONS.get(edition,edition)]})
	if not chosen_scholar.is_empty():
		new_features.append({"name":"Pericia (Erudito): "+chosen_scholar,"category":"Clase","description":"Duplicas tu bonificador de competencia en las pruebas de "+chosen_scholar+"."})
	if not gained_feat.is_empty():
		new_features.append({"name":"Dote · "+str(gained_feat.name),"category":"Dotes","description":str(gained_feat.description)})
	var new_actions: Array=[]
	if class_id=="rogue" and new_class_level==2:
		new_actions.append({"id":"cunning-action","label":"Acción astuta · Correr / Destrabarse / Esconderse","actionCost":"bonus","resolution":"guided","range":{"normalMeters":0.0},"guidance":"Acción adicional: puedes Correr, Destrabarse o Esconderse en este turno."})
	if class_id=="cleric" and new_class_level==2:
		new_actions.append({"id":"channel-divinity","label":"Canalizar divinidad · Chispa divina / Expulsar","actionCost":"action","magical":true,"resolution":"guided","range":{"normalMeters":9.0},"resource":{"id":"channel-divinity","cost":1},"guidance":"El DM resuelve Expulsar muertos vivientes (SAB CD "+str(new_cast_dc)+") o Chispa divina (1d8+"+str(Model.modifier(int(new_abilities.get("SAB",16))))+" PG/radiante)."})
	if class_id=="rogue" and new_class_level==5:
		new_actions.append({"id":"uncanny-dodge","label":"Esquiva asombrosa · mitad de daño","actionCost":"reaction","resolution":"guided","range":{"normalMeters":0.0},"guidance":"Reacción: reduces a la mitad el daño de un ataque que te impacte de un atacante visible."})
	for sp_name in chosen_spells:
		for candidate in spell_pool:
			if str(candidate.name)==str(sp_name) and candidate.has("id"):
				var act: Dictionary=candidate.duplicate(true)
				act["label"]=str(candidate.name)
				if act.has("attackBonus") and new_cast_atk>0: act["attackBonus"]=new_cast_atk
				new_actions.append(act)
	return {
		"valid":errors.is_empty(),
		"errors":errors,
		"edition":edition,
		"from_level":from_level,
		"to_level":to_level,
		"class_id":class_id,
		"class_name":str(found_cls.name),
		"new_class_level":new_class_level,
		"classes":new_classes,
		"hit_die":hit_die,
		"hp_method":hp_method,
		"base_roll":base_roll,
		"hp_gain":hp_gain,
		"old_hp_max":old_hp_max,
		"new_hp_max":new_hp_max,
		"old_prof":old_prof,
		"new_prof":new_prof,
		"old_abilities":actor.get("abilities",{}).duplicate(true),
		"new_abilities":new_abilities,
		"new_slots":new_slots,
		"new_cast_dc":new_cast_dc,
		"new_cast_atk":new_cast_atk,
		"subclass":chosen_subclass,
		"scholar_skill":chosen_scholar,
		"feat":gained_feat,
		"chosen_spells":chosen_spells,
		"spell_pool":spell_pool,
		"new_features":new_features,
		"new_actions":new_actions,
		"serial":"lvl_%s_%d_to_%d" % [str(actor.get("id","")),from_level,to_level]
	}

static func apply(ui,actor_id: String,proposal: Dictionary) -> Dictionary:
	if not proposal.get("valid",false): return {"ok":false,"error":"La propuesta contiene decisiones pendientes."}
	var actor: Dictionary={}
	for candidate in ui.actors:
		if str(candidate.id)==actor_id: actor=candidate; break
	if actor.is_empty(): return {"ok":false,"error":"Personaje no encontrado."}
	if int(actor.get("level",1))!=int(proposal.from_level):
		return {"ok":false,"error":"Esta subida ya fue aplicada o el nivel cambió."}
	var runtime: Dictionary=ui.combat_controller.rules.actors.get(actor_id,{})
	# Save full recoverable pre-level snapshot
	if not actor.has("level_history") or not actor.level_history is Array: actor["level_history"]=[]
	var backup: Dictionary={
		"serial":proposal.serial,
		"from_level":proposal.from_level,
		"to_level":proposal.to_level,
		"actor_snapshot":_copy_actor_state(actor),
		"runtime_snapshot":_copy_runtime_state(runtime)
	}
	actor.level_history.append(backup)
	# Apply core level, edition, classes & identity
	actor["rules_edition"]=proposal.edition
	actor["level"]=proposal.to_level
	actor["classes"]=proposal.classes.duplicate(true)
	if not str(proposal.subclass).is_empty(): actor["subclass"]=str(proposal.subclass)
	var cls_labels:=PackedStringArray()
	for c in proposal.classes:
		var lbl:=str(c.name)
		if not str(c.get("subclass","")).is_empty(): lbl+=" ("+str(c.subclass)+")"
		if proposal.classes.size()>1: lbl+=" "+str(c.level)
		cls_labels.append(lbl)
	var bg:=str(actor.get("background",""))
	if bg.is_empty() and str(actor.get("class_line","")).contains("·"): bg=str(actor.class_line).split("·")[-1].strip_edges()
	actor["class_line"]=" / ".join(cls_labels)+(" · "+bg if not bg.is_empty() else "")
	# HP & Hit Dice
	actor["hp_max"]=proposal.new_hp_max
	actor["hp"]=mini(proposal.new_hp_max,int(actor.get("hp",proposal.old_hp_max))+int(proposal.hp_gain))
	if not runtime.is_empty():
		runtime["hp_max"]=proposal.new_hp_max
		runtime["hp"]=mini(proposal.new_hp_max,int(runtime.get("hp",proposal.old_hp_max))+int(proposal.hp_gain))
	# Abilities, Proficiency, Initiative
	actor["abilities"]=proposal.new_abilities.duplicate(true)
	actor["proficiency_bonus"]=proposal.new_prof
	var dex_diff:=Model.modifier(int(proposal.new_abilities.get("DES",10)))-Model.modifier(int(proposal.old_abilities.get("DES",10)))
	actor["initiative_bonus"]=int(actor.get("initiative_bonus",0))+dex_diff+int(proposal.feat.get("initiative_bonus",0))
	if not runtime.is_empty(): runtime["initiative_bonus"]=actor.initiative_bonus
	# Feats
	if not proposal.feat.is_empty():
		if not actor.has("feats") or not actor.feats is Array: actor["feats"]=[]
		actor.feats.append(proposal.feat.duplicate(true))
	# Scholar expertise
	if not str(proposal.scholar_skill).is_empty():
		if not actor.has("skill_proficiencies") or not actor.skill_proficiencies is Dictionary: actor["skill_proficiencies"]={}
		actor.skill_proficiencies[str(proposal.scholar_skill)]=2
		if not actor.has("skills") or not actor.skills is Dictionary: actor["skills"]={}
		var sk_ab:="INT"
		for pair in Model.SKILLS:
			if pair[0]==str(proposal.scholar_skill): sk_ab=pair[1]; break
		actor.skills[str(proposal.scholar_skill)]={"bonus":Model.modifier(int(proposal.new_abilities.get(sk_ab,10)))+proposal.new_prof*2,"proficiency_rank":2,"source":"Erudito (Mago Nv. 2)"}
	# Features
	if not actor.has("features") or not actor.features is Array: actor["features"]=[]
	for f in proposal.new_features:
		var line:=str(f.name)+" ("+str(f.description)+")"
		if line not in actor.features: actor.features.append(line)
	# Spell slots & class resources
	if not runtime.is_empty():
		if not runtime.has("resources") or not runtime.resources is Dictionary: runtime["resources"]={}
		for slot_lvl in proposal.new_slots:
			var rkey:="spell-slot-"+str(slot_lvl)
			var new_max:=int(proposal.new_slots[slot_lvl])
			var prev_max:=int(runtime.resources.get(rkey,{}).get("max",0))
			var prev_cur:=int(runtime.resources.get(rkey,{}).get("current",0))
			runtime.resources[rkey]={"label":"Espacios Nv. "+str(slot_lvl),"current":mini(new_max,prev_cur+maxi(0,new_max-prev_max)),"max":new_max}
		if proposal.class_id=="cleric" and proposal.new_class_level>=2:
			var cd_max:=2 if proposal.edition=="dnd-2024" else 1
			runtime.resources["channel-divinity"]={"label":"Canalizar divinidad","current":cd_max,"max":cd_max}
	# Casting stats
	if proposal.new_cast_dc>0:
		actor["spellcasting"]={"CD":proposal.new_cast_dc,"Ataque":Model.signed(proposal.new_cast_atk)}
	# Spells & Actions
	if not actor.has("spells") or not actor.spells is Array: actor["spells"]=[]
	for sp_name in proposal.chosen_spells:
		for cand in proposal.spell_pool:
			if str(cand.name)==str(sp_name):
				actor.spells.append({"name":str(cand.name),"level":int(cand.get("level",1)),"detail":str(cand.get("detail","")),"prepared":true})
				break
	if not runtime.is_empty():
		if not runtime.has("actions") or not runtime.actions is Array: runtime["actions"]=[]
		for new_act in proposal.new_actions:
			var dup:=false
			for ex in runtime.actions:
				if str(ex.get("id",""))==str(new_act.get("id","")): dup=true; break
			if not dup: runtime.actions.append(new_act.duplicate(true))
		# Update existing spell save DC & attack bonuses if prof/casting mod grew
		if proposal.new_cast_dc>0:
			for act in runtime.actions:
				if act.has("save") and Model.is_spell(act): act.save["dc"]=proposal.new_cast_dc
				elif Model.is_spell(act) and act.has("attackBonus") and not act.get("automaticHit",false) and act.get("resolution","")!="guided":
					act["attackBonus"]=proposal.new_cast_atk
		if int(proposal.new_prof)>int(proposal.old_prof):
			var delta_p: int=int(proposal.new_prof)-int(proposal.old_prof)
			for act in runtime.actions:
				if not Model.is_spell(act) and act.has("attackBonus"):
					act["attackBonus"]=int(act.attackBonus)+delta_p
		# Rogue Sneak Attack scaling
		if str(proposal.class_id)=="rogue" and runtime.has("traits"):
			var dice_n: int=ceili(float(proposal.new_class_level)/2.0)
			runtime.traits["sneakAttackDice"]=str(dice_n)+"d6"
	ui.combat_controller.rules.changed.emit()
	ui.refresh_all()
	ui.notify_mesa("%s sube a nivel %d (%s)" % [str(actor.name),proposal.to_level,proposal.class_name])
	return {"ok":true,"level":proposal.to_level}

static func undo_last(ui,actor_id: String) -> Dictionary:
	var actor: Dictionary={}
	for candidate in ui.actors:
		if str(candidate.id)==actor_id: actor=candidate; break
	if actor.is_empty(): return {"ok":false,"error":"Personaje no encontrado."}
	var history=actor.get("level_history",[])
	if not history is Array or history.is_empty(): return {"ok":false,"error":"No hay subidas registradas para deshacer."}
	var last: Dictionary=history.pop_back()
	var snap: Dictionary=last.get("actor_snapshot",{})
	for k in snap: actor[k]=snap[k].duplicate(true) if snap[k] is Dictionary or snap[k] is Array else snap[k]
	for optional_key in ["classes","subclass","feats","spellcasting","skill_proficiencies"]:
		if not snap.has(optional_key): actor.erase(optional_key)
	var runtime: Dictionary=ui.combat_controller.rules.actors.get(actor_id,{})
	var rsnap: Dictionary=last.get("runtime_snapshot",{})
	if not runtime.is_empty() and not rsnap.is_empty():
		for k in rsnap: runtime[k]=rsnap[k].duplicate(true) if rsnap[k] is Dictionary or rsnap[k] is Array else rsnap[k]
	ui.combat_controller.rules.changed.emit()
	ui.refresh_all()
	ui.notify_mesa("%s regresa al nivel %d" % [str(actor.name),int(actor.get("level",1))])
	return {"ok":true,"level":int(actor.get("level",1))}

static func _has_tough_feat(actor: Dictionary) -> bool:
	for ft in actor.get("feats",[]):
		var n:=str(ft.get("id",ft.get("name","")) if ft is Dictionary else ft).to_lower()
		if n.contains("duro"): return true
	return false

static func _copy_actor_state(actor: Dictionary) -> Dictionary:
	var out: Dictionary={}
	for k in ["level","class_line","hp","hp_max","abilities","proficiency_bonus","initiative_bonus","features","spells","skills","skill_proficiencies","classes","subclass","feats","spellcasting","rules_edition"]:
		if actor.has(k): out[k]=actor[k].duplicate(true) if actor[k] is Dictionary or actor[k] is Array else actor[k]
	return out

static func _copy_runtime_state(runtime: Dictionary) -> Dictionary:
	var out: Dictionary={}
	for k in ["hp","hp_max","initiative_bonus","resources","actions","traits","saves"]:
		if runtime.has(k): out[k]=runtime[k].duplicate(true) if runtime[k] is Dictionary or runtime[k] is Array else runtime[k]
	return out
