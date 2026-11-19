extends RefCounted
const Catalogue=preload("res://combat/combat_catalogue.gd")
const ABILITIES={"FUE":"str","DES":"dex","CON":"con","INT":"int","SAB":"wis","CAR":"cha"}
const SKILLS=[["Acrobacias","DES"],["Arcanos","INT"],["Atletismo","FUE"],["Engaño","CAR"],["Historia","INT"],["Interpretación","CAR"],["Intimidación","CAR"],["Investigación","INT"],["Juego de Manos","DES"],["Medicina","SAB"],["Naturaleza","INT"],["Percepción","SAB"],["Perspicacia","SAB"],["Persuasión","CAR"],["Religión","INT"],["Sigilo","DES"],["Supervivencia","SAB"],["Trato con animales","SAB"]]
const CONDITION_NAMES={"poisoned":"Envenenado","prone":"Derribado","unconscious":"Inconsciente","petrified":"Petrificado","blinded":"Cegado","deafened":"Ensordecido","frightened":"Asustado","charmed":"Hechizado","paralysed":"Paralizado","paralyzed":"Paralizado","stunned":"Aturdido","incapacitated":"Incapacitado","exhaustion":"Agotamiento","invisible":"Invisible","restrained":"Restringido","grappled":"Agarrado","hidden":"Oculto","dead":"Muerto","burned":"Quemado","frosted":"Congelado","cursed":"Maldito"}
static func condition_text(actor: Dictionary) -> String:
	var names=PackedStringArray()
	for condition in actor.get("conditions",[]):
		var key=str(condition); names.append(CONDITION_NAMES.get(key,key.replace("_"," ").capitalize()))
	return ", ".join(names)
static func signed(value: int) -> String: return ("+" if value>=0 else "−")+str(absi(value))
static func meters(value: float) -> String: return str(int(value)) if is_equal_approx(value,roundf(value)) else str(value).replace(".",",")
static func modifier(score: int) -> int: return floori(float(score-10)/2.0)
static func snapshot(ui) -> Dictionary:
	var source: Dictionary=ui.get_active_actor()
	if source.is_empty(): return {}
	var a=source.duplicate(true); var id=str(a.id)
	var profile=Catalogue.profile(id); var sheet: Dictionary=profile.get("sheet",{})
	var runtime: Dictionary=ui.combat_controller.rules.actors.get(id,{}) if ui.combat_controller else {}
	# Combat owns transient values; the existing campaign record owns identity/base edits.
	for key in ["hp","hp_max","temp_hp","ac","speed","conditions","resources","concentration","actions","saves","movement","action_used","bonus_used","reaction_used","ammunition","stance"]:
		if runtime.has(key): a[key]=runtime[key].duplicate(true) if runtime[key] is Dictionary or runtime[key] is Array else runtime[key]
	var level=int(a.get("level",sheet.get("level",1)))
	a["proficiency_bonus"]=int(a.get("proficiency_bonus",sheet.get("proficiencyBonus",2+floori(float(level-1)/4))))
	var legacy_identity=str(a.get("class_line",a.get("short_desc","")))
	a["identity"]=legacy_identity
	if not a.get("classes",[]).is_empty():
		var classes=PackedStringArray()
		for entry in a.classes:
			if entry is Dictionary:
				var text=str(entry.get("name",entry.get("class","")))
				if entry.has("subclass") and not str(entry.subclass).is_empty(): text+=" · "+str(entry.subclass)
				if entry.has("level"): text+=" "+str(entry.level)
				classes.append(text)
			else: classes.append(str(entry))
		a.identity=" / ".join(classes)
	a["species"]=str(a.get("species",sheet.get("species","")))
	if a.species.is_empty(): a.species=str(a.get("race",sheet.get("race","")))
	a["background"]=str(a.get("background",sheet.get("background","")))
	if a.background.is_empty() and legacy_identity.contains("·"): a.background=legacy_identity.split("·")[-1].strip_edges()
	for field in ["species","subclass","background"]:
		var value=str(a.get(field,""))
		if not value.is_empty() and not a.identity.to_lower().contains(value.to_lower()): a.identity+=(" · " if not a.identity.is_empty() else "")+value
	a["skills"]=a.get("skills",sheet.get("skills",{})).duplicate(true)
	a["details"]=[]; a["features"]=a.get("features",[]).duplicate(true)
	for feature in sheet.get("features",[]):
		if feature not in a.features: a.features.append(feature)
	# Import confirmed legacy sheet totals, never infer that an absent competence is absent.
	for section in sheet.get("details",[]):
		var title=str(section.get("title",""))
		if title.to_lower().contains("equipo") or title.to_lower().contains("inventario"): continue
		a.details.append(section)
		for entry in section.get("entries",[]):
			for skill in SKILLS:
				var expression=RegEx.new(); expression.compile("(?i)"+skill[0]+" ([+−-][0-9]+)")
				var found=expression.search(str(entry))
				if found and not a.skills.has(skill[0]): a.skills[skill[0]]=int(found.get_string(1).replace("−","-"))
	# An explicitly named feature competence is data, not an inferred class choice.
	for feature in a.features:
		for skill in SKILLS:
			if a.skills.has(skill[0]): continue
			var competence=RegEx.new(); competence.compile("(?i)competencia(?: en)?\\s+"+skill[0]+"(?:[,. ;)]|$)")
			if competence.search(str(feature)):
				a.skills[skill[0]]={"bonus":modifier(int(a.get("abilities",{}).get(skill[1],10)))+int(a.proficiency_bonus),"proficiency_rank":1,"source":str(feature)}
	a["actions"]=runtime.get("actions",Catalogue.actions(id)).duplicate(true)
	if a.actions.is_empty():
		for attack in a.get("attacks",[]): a.actions.append({"id":"","label":attack.get("name","Acción"),"summary":"%s · %s · %s" % [attack.get("bonus",""),attack.get("damage",""),attack.get("range","")],"consult_only":true})
	var unique_spells={}
	for spell in a.get("spells",[]):
		var key=normalized(str(spell.get("name","")))
		if unique_spells.has(key): unique_spells[key].merge(spell,true)
		else: unique_spells[key]=spell.duplicate(true)
	a["spells"]=unique_spells.values()
	# Unbounded list: include every registered magical action, not only campaign summary entries.
	for action in a.actions:
		if not is_spell(action): continue
		var matched=false
		for sp in a.spells:
			if normalized(str(sp.get("name","")))!=normalized(str(action.get("label",""))): continue
			sp["action_id"]=str(action.get("id","")); sp["name"]=str(action.get("label",sp.name)).split("·")[0].strip_edges(); matched=true; break
		if not matched:
			a.spells.append({"name":str(action.get("label","")),"detail":action_summary(action),"action_id":str(action.get("id",""))})
	a["casting"]=a.get("spellcasting",sheet.get("spellcasting",{})).duplicate(true)
	if not a.spells.is_empty():
		var expression=RegEx.new(); expression.compile("CD ([0-9]+).*?([+][0-9]+) ataque")
		for feature in a.features:
			var found=expression.search(str(feature))
			if found:
				if not a.casting.has("CD"): a.casting["CD"]=int(found.get_string(1))
				if not a.casting.has("Ataque"): a.casting["Ataque"]=found.get_string(2)
		# Import only consistent values already recorded on this actor's spells/actions.
		# Guided area actions can carry a placeholder attackBonus=0; it is not an attack roll.
		var spell_attacks={}; var spell_dcs={}; var dc_pattern=RegEx.new(); dc_pattern.compile("CD ([0-9]+)")
		for action in a.actions:
			if not is_spell(action): continue
			if action.has("save"): spell_dcs[int(action.save.get("dc",0))]=true
			elif action.get("resolution","")!="guided" and action.has("attackBonus") and not action.get("automaticHit",false) and int(action.attackBonus)!=0: spell_attacks[int(action.attackBonus)]=true
		for spell in a.spells:
			var found=dc_pattern.search(str(spell.get("detail","")))
			if found: spell_dcs[int(found.get_string(1))]=true
		if not a.casting.has("CD") and spell_dcs.size()==1: a.casting["CD"]=spell_dcs.keys()[0]
		if not a.casting.has("Ataque") and spell_attacks.size()==1: a.casting["Ataque"]=signed(int(spell_attacks.keys()[0]))
		# No guessing of casting ability, preparation status or spell level from class names.
	return a
static func normalized(value: String) -> String:
	return value.to_lower().split("·")[0].strip_edges().replace("proyectil mágico","misil mágico")
static func is_spell(action: Dictionary) -> bool:
	return action.get("magical",false) or str(action.get("resource",{}).get("id","")).begins_with("spell-slot") or action.get("kind","") in ["spell","cantrip"]
static func rank(a: Dictionary,skill: String,base: int) -> int:
	var explicit: Dictionary=a.get("skill_proficiencies",{})
	if explicit.has(skill): return int(explicit[skill])
	if not a.skills.has(skill): return -1
	var total=a.skills[skill]; total=total.get("bonus",base) if total is Dictionary else total
	if a.skills[skill] is Dictionary:
		var record: Dictionary=a.skills[skill]
		if record.has("proficiency_rank"): return clampi(int(record.proficiency_rank),0,2)
		if record.get("expertise",false): return 2
		if record.has("proficient"): return 1 if record.proficient else 0
		if record.has("other_bonus") or record.has("otherBonus"): return -1
	return clampi(roundi(float(int(total)-base)/maxi(1,int(a.proficiency_bonus))),0,2)
static func skill_note(a: Dictionary,key: String) -> String:
	var value=a.get("skills",{}).get(key,{})
	if value is Dictionary:
		if value.has("source"): return "Fuente · "+str(value.source)
		if value.has("other_bonus") or value.has("otherBonus"): return "Otras bonificaciones registradas: "+signed(int(value.get("other_bonus",value.get("otherBonus",0))))
	return ""
static func skill_bonus(a: Dictionary,key: String,ability: String) -> int:
	var base=modifier(int(a.get("abilities",{}).get(ability,10))); var value=a.get("skills",{}).get(key,base)
	if not a.get("skills",{}).has(key) and a.get("skill_proficiencies",{}).has(key): return base+clampi(int(a.skill_proficiencies[key]),0,2)*int(a.proficiency_bonus)
	return int(value.get("bonus",base)) if value is Dictionary else int(value)
static func action_summary(action: Dictionary) -> String:
	if action.has("summary"): return str(action.summary)
	var parts=PackedStringArray(); var cost=str(action.get("actionCost","action"))
	parts.append({"action":"Acción","bonus":"Adicional","reaction":"Reacción","free":"Libre"}.get(cost,cost))
	var r: Dictionary=action.get("range",{}); var range_meters=float(r.get("normalMeters",0))
	if range_meters>0:
		var distance=meters(range_meters)+" m"
		if float(r.get("longMeters",range_meters))>range_meters: distance=meters(range_meters)+"/"+meters(float(r.longMeters))+" m"
		parts.append(distance)
	if action.has("save"):
		var ability=str(action.save.get("ability","")); var keys=ABILITIES.find_key(ability)
		parts.append("%s CD %d" % [str(keys) if keys!=null else ability.to_upper(),int(action.save.get("dc",0))])
	elif action.has("attackBonus") and not action.get("automaticHit",false) and action.get("resolution","")!="guided": parts.append(signed(int(action.attackBonus))+" impacto")
	if action.has("damageDice"):
		var damage=str(action.damageDice)+(signed(int(action.damageBonus)) if int(action.get("damageBonus",0))!=0 else "")
		if str(action.damageDice).ends_with("d1"): damage=str(int(str(action.damageDice).split("d")[0])+int(action.get("damageBonus",0)))
		parts.append(damage+" "+str(action.get("damageType","PG" if action.get("healing",false) else "")))
	if action.get("concentration",false): parts.append("Concentración")
	if action.has("resource"):
		var key=str(action.resource.get("id","")); var label="espacio de nivel "+key.trim_prefix("spell-slot-") if key.begins_with("spell-slot-") else str(action.resource.get("label",key))
		parts.append(("%d espacio · %s" if key.begins_with("spell-slot-") else "%d uso · %s") % [int(action.resource.get("cost",1)),label])
	if action.has("castingTime"): parts.append(str(action.castingTime))
	if action.has("duration"): parts.append(str(action.duration))
	return " · ".join(parts)
## A presentation adapter, never a second rules engine. Every displayed field comes from the real action.
static func action_fields(action: Dictionary,actor: Dictionary) -> Dictionary:
	var spell={}
	for entry in actor.get("spells",[]):
		if not str(action.get("id","")).is_empty() and str(entry.get("action_id",""))==str(action.get("id","")) or normalized(str(entry.get("name","")))==normalized(str(action.get("label",""))): spell=entry; break
	var cost=str(action.get("actionCost","action")); var r: Dictionary=action.get("range",{})
	var distance="—"; var normal=float(r.get("normalMeters",0)); var far=float(r.get("longMeters",normal))
	if normal>0: distance=meters(normal)+("/"+meters(far) if far>normal else "")+" m"
	var save: Dictionary=action.get("save",{}).duplicate()
	if save.is_empty():
		# Adapter for existing guided/legacy descriptions; never modifies a combat rule.
		var pattern=RegEx.new(); pattern.compile("(FUE|DES|CON|INT|SAB|CAR|STR|DEX|WIS|CHA)\\s+CD\\s*([0-9]+)")
		var match_save=pattern.search(str(action.get("guidance",""))+" "+str(spell.get("detail","")))
		if match_save: save={"label":match_save.get_string(1),"dc":int(match_save.get_string(2))}
	var roll="—"; var roll_kind="effect"
	if not save.is_empty():
		var ability=save.get("label",ABILITIES.find_key(save.get("ability","")))
		roll=str(ability)+" CD "+str(save.get("dc",0)); roll_kind="save"
	elif action.get("healing",false): roll="Curación"; roll_kind="healing"
	elif action.get("automaticHit",false): roll="Sin d20"; roll_kind="direct"
	elif action.get("resolution","")!="guided" and action.has("attackBonus"):
		roll=signed(int(action.attackBonus)); roll_kind="attack"
	var effect=str(action.get("effect",spell.get("effect","")))
	if action.has("damageDice"):
		effect=str(action.damageDice)+(signed(int(action.get("damageBonus",0))) if int(action.get("damageBonus",0))!=0 else "")
		if str(action.damageDice).ends_with("d1"): effect=str(int(str(action.damageDice).split("d")[0])+int(action.get("damageBonus",0)))
		if int(action.get("attackCount",1))>1: effect=str(action.attackCount)+" × ("+effect+")"
		effect+=" PG" if action.get("healing",false) else " "+str(action.get("damageType",""))
	elif effect.is_empty(): effect=str(spell.get("detail",action.get("guidance",""))).split("·")[0].strip_edges()
	if effect.is_empty(): effect="Concentración" if action.get("concentration",false) else "Efecto al DM"
	var uses=""; var resource_data={}
	if action.has("resource"):
		var key=str(action.resource.get("id","")); var resource: Dictionary=actor.get("resources",{}).get(key,{})
		var is_slot=key.begins_with("spell-slot-")
		resource_data={"id":key,"kind":"spell_slot" if is_slot else "uses","current":int(resource.get("current",0)),"max":int(resource.get("max",0)),"cost":int(action.resource.get("cost",1)),"label":"Espacios de nivel "+key.trim_prefix("spell-slot-") if is_slot else str(resource.get("label",key))}
		uses=("Nv."+key.trim_prefix("spell-slot-")+" " if is_slot else "")+str(resource_data.current)+"/"+str(resource_data.max)
	var kind={"action":"Acción","bonus":"Adicional","reaction":"Reacción","free":"Libre"}.get(cost,cost)
	if cost=="action" and not is_spell(action): kind="Cuerpo a cuerpo" if r.get("kind","")=="melee" else "A distancia"
	if cost=="action" and is_spell(action): kind="Truco" if action.get("kind","")=="cantrip" or action.get("id","") in ["fire-bolt","ray-of-frost","sacred-flame"] else "Conjuro"
	var target=Catalogue.Targeting.mode(action)
	if target=="self":
		distance="Personal"
		var area=Catalogue.Targeting.geometry(action)
		if area.get("placement","")=="self" and float(area.get("radius",0))>0: distance="Radio "+meters(float(area.radius))+" m"
	var duration=str(action.get("duration",spell.get("duration","Concentración" if action.get("concentration",false) else "")))
	return {"name":str(action.get("label","Acción")).split("·")[0].strip_edges(),"type":kind,"range":distance,"duration":duration,"roll":roll,"roll_kind":roll_kind,"effect":effect.strip_edges(),"uses":uses,"resource":resource_data,"target_mode":target,"target":Catalogue.Targeting.label(action)}

static func spell_groups(actor: Dictionary) -> Dictionary:
	var result={"Trucos":[],"Preparados":[],"Conocidos":[],"Repertorio":[]}
	for original in actor.get("spells",[]):
		var spell: Dictionary=original.duplicate(true); var action={}
		for candidate in actor.get("actions",[]):
			if not str(candidate.get("id","")).is_empty() and str(candidate.get("id",""))==str(spell.get("action_id","")) or normalized(str(candidate.get("label","")))==normalized(str(spell.get("name",""))): action=candidate; break
		# Same explicit cantrip IDs as the existing combat controller; no class-based inference.
		var cantrip=spell.get("level",-1)==0 or action.get("kind","")=="cantrip" or action.get("id","") in ["fire-bolt","ray-of-frost","sacred-flame"]
		var slot=str(action.get("resource",{}).get("id",""))
		if not spell.has("level") and slot.begins_with("spell-slot-"): spell["level"]=int(slot.trim_prefix("spell-slot-"))
		var category="Trucos" if cantrip else "Preparados" if spell.get("prepared",false) else "Conocidos" if spell.get("known",false) else "Repertorio"
		spell["action"]=action; result[category].append(spell)
	return result
static func feature_entries(actor: Dictionary) -> Array:
	var result=[]; var seen={}
	var legacy_categories={"Enana de las colinas":"Especie","Alto elfo":"Especie","Mediana piesligeros":"Especie","Lanzamiento de conjuros divinos":"Clase","Recuperación arcana":"Clase","Ataque furtivo":"Clase","Jerga de ladrones":"Clase"}
	for group in [["species_features","Especie"],["class_features","Clase"],["subclass_features","Subclase"],["feats","Dotes"],["special_abilities","Capacidades"],["features","Rasgos"]]:
		for f in actor.get(group[0],[]):
			var text=str(f.get("name",f.get("title","Rasgo"))) if f is Dictionary else str(f)
			var desc=str(f.get("description",f.get("detail",""))) if f is Dictionary else text
			var category=str(f.get("category",group[1])) if f is Dictionary else str(group[1])
			# Legacy flat strings remain intact; their parenthetical explanation becomes the excerpt.
			if not f is Dictionary and text.count("(")==1 and text.ends_with(")"):
				text=text.split("(")[0].strip_edges(); desc=str(f).trim_prefix(text).strip_edges().trim_prefix("(").trim_suffix(")")
			var identity=normalized(text); var dice=RegEx.new(); dice.compile("\\s+[0-9]+d[0-9]+([+−-][0-9]+)?$"); identity=dice.sub(identity,"")
			if seen.has(identity): continue
			seen[identity]=true
			if category=="Rasgos":
				for title in legacy_categories:
					if text.begins_with(title): category=legacy_categories[title]; break
			result.append({"name":text,"description":desc,"category":category})
	return result
