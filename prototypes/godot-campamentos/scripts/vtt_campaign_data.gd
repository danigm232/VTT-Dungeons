class_name VttCampaignData
extends RefCounted

## Canonical campaign metadata, actors, camp zones, exploration activities,
## clock formatting, and weather/time labels for the 5 migrated camp scenes.

const Structure = preload("res://scripts/camp_structure.gd")

static func get_campaign_meta(scene_ref: Variant = "") -> Dictionary:
	var sid := str(scene_ref) if (scene_ref is String and str(scene_ref) != "") else Structure.get_active_scene_id()
	var sdef := Structure.get_scene_def(sid)
	var title := str(sdef.get("title", "Campamentos de Descanso"))
	var notice := str(sdef.get("safetyNotice", "Campamento VTT interactivo."))
	var zlist := Structure.get_zones_for_scene(sdef)
	var def_z := str(zlist[0]["id"]) if not zlist.is_empty() else "overview"
	return {
		"id": "camp-rests",
		"scene_id": sid,
		"title": title,
		"subtitle": notice,
		"default_zone": def_z,
		"default_zone_title": title,
	}

static func create_default_actors() -> Array[Dictionary]:
	return [
		{
			"id": "mia",
			"node_name": "PlayerToken",
			"name": "Mia",
			"short_desc": "Clériga enana · Niv. 1 · Soldado",
			"archetype": "Clériga enana · Oración y hoguera",
			"level": 1,
			"class_line": "Clériga enana · Soldado",
			"hp": 11,
			"hp_max": 11,
			"ac": 18,
			"speed": 7.5,
			"initiative_bonus": 0,
			"color": Color("#d5a34b"),
			"abilities": {"FUE": 14, "DES": 10, "CON": 14, "INT": 10, "SAB": 16, "CAR": 12},
			"features": [
				"Enana de las colinas (+1 PG/nivel, visión en la oscuridad 18 m)",
				"Lanzamiento de conjuros divinos (CD 13 · +5 ataque de conjuro)"
			],
			"attacks": [
				{"name": "Maza", "bonus": "+4", "damage": "1d6+2 contundente", "range": "1.5 m"},
				{"name": "Hacha de mano", "bonus": "+4", "damage": "1d6+2 cortante", "range": "6/18 m"}
			],
			"spells": [
				{"name": "Llama sagrada", "detail": "Salv. DES CD 13 · 1d8 radiante · 18 m"},
				{"name": "Palabra de curación", "detail": "2d4+3 PG (acción adicional) · 18 m"},
				{"name": "Bendición", "detail": "+1d4 a ataques y salvaciones · 9 m"},
				{"name": "Escudo de fe", "detail": "+2 CA (concentración) · 18 m"}
			],
			"gear": ["Cota de malla", "Escudo", "Maza", "Símbolo sagrado", "Manto de viaje", "Yesca", "Antorcha"],
			"notes": "Vanguardia resistente; mantiene la hoguera, vigilia y el rincón de oración en el campamento."
		},
		{
			"id": "maria",
			"node_name": "RogueToken",
			"name": "Trinity",
			"short_desc": "Pícara mediana · Niv. 1 · Criminal",
			"archetype": "Pícara mediana · Guardia y mantenimiento",
			"level": 1,
			"class_line": "Pícara mediana · Criminal",
			"hp": 9,
			"hp_max": 9,
			"ac": 14,
			"speed": 7.5,
			"initiative_bonus": 3,
			"color": Color("#b66dc4"),
			"abilities": {"FUE": 8, "DES": 16, "CON": 12, "INT": 13, "SAB": 10, "CAR": 16},
			"features": [
				"Mediana piesligeros (sigilo tras criaturas medianas)",
				"Ataque furtivo (1d6 con ventaja o aliado adyacente)",
				"Pericia: Sigilo (+7) y Herramientas de ladrón (+7)"
			],
			"attacks": [
				{"name": "Arco corto", "bonus": "+5", "damage": "1d6+3 perforante", "range": "24/96 m"},
				{"name": "Daga", "bonus": "+5", "damage": "1d4+3 perforante", "range": "1.5 m"}
			],
			"spells": [],
			"gear": ["Armadura de cuero", "Arco corto", "20 flechas", "2 dagas", "Herramientas de ladrón", "Antorcha"],
			"notes": "Exploradora ágil; cubre la guardia nocturna y revisa herramientas y equipo."
		},
		{
			"id": "mike",
			"node_name": "WizardToken",
			"name": "Mike",
			"short_desc": "Mago alto elfo · Niv. 1 · Erudito",
			"archetype": "Mago alto elfo · Estudio y trance",
			"level": 1,
			"class_line": "Mago alto elfo · Erudito",
			"hp": 8,
			"hp_max": 8,
			"ac": 12,
			"speed": 9.0,
			"initiative_bonus": 2,
			"color": Color("#55b8d8"),
			"abilities": {"FUE": 8, "DES": 14, "CON": 12, "INT": 16, "SAB": 13, "CAR": 10},
			"features": [
				"Alto elfo (trance 4 h, competencia en Percepción)",
				"Recuperación arcana (1 espacio en descanso corto)"
			],
			"attacks": [
				{"name": "Espada corta", "bonus": "+4", "damage": "1d6+2 perforante", "range": "1.5 m"},
				{"name": "Rayo de escarcha", "bonus": "+5", "damage": "1d8 frío (vel. -3 m)", "range": "18 m"}
			],
			"spells": [
				{"name": "Proyectil mágico", "detail": "3 dardos infalibles · 1d4+1 fuerza · 36 m"},
				{"name": "Manos ardientes", "detail": "Salv. DES CD 13 · 3d6 fuego · Cono 4.5 m"},
				{"name": "Escudo", "detail": "Reacción +5 CA hasta inicio del siguiente turno"},
				{"name": "Detectar magia", "detail": "Ritual / Concentración · 9 m"}
			],
			"gear": ["Espada corta", "Saquito de componentes", "Libro de conjuros", "Atril plegable", "Pergaminos"],
			"notes": "Erudito del grupo; investiga grabados, reliquias y notas arcanas en la tienda o plaza."
		}
	]

static func create_default_enemies(scene_ref: Variant = "") -> Array[Dictionary]:
	var sid := str(scene_ref) if scene_ref is String else Structure.get_active_scene_id()
	return [
		{
			"id": "night_prowler",
			"node_name": "",
			"name": "Acechador nocturno",
			"zone": sid,
			"hp": 11,
			"hp_max": 11,
			"ac": 13,
			"speed": 9.0,
			"initiative_bonus": 2,
			"color": Color("#b65c55"),
			"revealed": false,
			"traits": ["Táctica de manada", "Sigilo entre sombras"],
			"actions": ["Mordisco o garra · +4 · 1d6+2"],
			"summary": "Amenaza opcional para encuentros durante una guardia nocturna."
		},
		{
			"id": "zombie",
			"node_name": "",
			"name": "Muerto errante costero",
			"zone": sid,
			"hp": 22,
			"hp_max": 22,
			"ac": 8,
			"speed": 6.0,
			"initiative_bonus": -2,
			"color": Color("#6b8c6e"),
			"revealed": false,
			"traits": ["Fortaleza de muerto viviente"],
			"actions": ["Golpe · +3 · 1d6+1 contundente"],
			"summary": "Encuentro costero opcional invocable por el DM."
		}
	]

static func get_campaign_maps() -> Array[Dictionary]:
	return [
		{
			"id": "pecio_main",
			"label": "El Rosa de los Vientos · Pecio",
			"short": "Pecio Rosa",
			"project": "pecio",
			"project_dir": "godot-pecio",
			"scene_path": "res://scenes/main.tscn",
			"note": "Galeón varado en los escollos (cubiertas C1–C10)."
		},
		{
			"id": "retiro_main",
			"label": "El Retiro del Dragón · Monasterio",
			"short": "Retiro Principal",
			"project": "retiro",
			"project_dir": "godot-retiro",
			"scene_path": "res://scenes/main.tscn",
			"note": "Playa, escalinata, plazas A1–A4 y Templo A5."
		},
		{
			"id": "retiro_pleamar",
			"label": "Cuevas de Pleamar",
			"short": "Pleamar",
			"project": "retiro",
			"project_dir": "godot-retiro",
			"scene_path": "res://scenes/pleamar_coves.tscn",
			"note": "Calas costeras, grutas marinas y sendero occidental."
		},
		{
			"id": "retiro_observatory",
			"label": "Aproximación al Observatorio",
			"short": "Observatorio",
			"project": "retiro",
			"project_dir": "godot-retiro",
			"scene_path": "res://scenes/observatory_approach.tscn",
			"note": "Riscos altos hacia la cúpula del observatorio."
		},
		{
			"id": "retiro_pecio_cove",
			"label": "Arrecife del Pecio Rosa",
			"short": "Arrecife",
			"project": "retiro",
			"project_dir": "godot-retiro",
			"scene_path": "res://scenes/pecio_cove_arrival.tscn",
			"note": "Caleta de embarque frente a los escollos del Pecio."
		},
		{
			"id": "camp-a1-rooms",
			"label": "Camp. 01 · Habitaciones A1",
			"short": "Camp. 01 A1",
			"project": "campamentos",
			"project_dir": "godot-campamentos",
			"scene_path": "res://scenes/camp_a1_rooms.tscn",
			"camp_id": "camp-a1-rooms",
			"note": "Celdas excavadas de A1 y estatua de Astalagan."
		},
		{
			"id": "camp-forest-pleamar",
			"label": "Camp. 02 · Bosque camino a Pleamar",
			"short": "Camp. 02 Bosque",
			"project": "campamentos",
			"project_dir": "godot-campamentos",
			"scene_path": "res://scenes/camp_forest_pleamar.tscn",
			"camp_id": "camp-forest-pleamar",
			"note": "Claro boscoso junto al arroyo en ruta hacia Pleamar."
		},
		{
			"id": "camp-wreck-beach",
			"label": "Camp. 03 · Playa del pecio",
			"short": "Camp. 03 Playa",
			"project": "campamentos",
			"project_dir": "godot-campamentos",
			"scene_path": "res://scenes/camp_wreck_beach.tscn",
			"camp_id": "camp-wreck-beach",
			"note": "Campamento costero en la arena frente al arrecife."
		},
		{
			"id": "camp-cliffs-observatory",
			"label": "Camp. 04 · Acantilados del Observatorio",
			"short": "Camp. 04 Acant.",
			"project": "campamentos",
			"project_dir": "godot-campamentos",
			"scene_path": "res://scenes/camp_cliffs_observatory.tscn",
			"camp_id": "camp-cliffs-observatory",
			"note": "Meseta elevada con cristales arcanos hacia el Observatorio."
		},
		{
			"id": "camp-coastal-refuge",
			"label": "Camp. 05 · Refugio costero de Pleamar",
			"short": "Camp. 05 Refugio",
			"project": "campamentos",
			"project_dir": "godot-campamentos",
			"scene_path": "res://scenes/camp_coastal_refuge.tscn",
			"camp_id": "camp-coastal-refuge",
			"note": "Gruta litoral protegida cerca de las Cuevas de Pleamar."
		}
	]

static func get_camp_zones(scene_id: String = "") -> Array[Dictionary]:
	var sid := scene_id if scene_id != "" else Structure.get_active_scene_id()
	var sdef := Structure.get_scene_def(sid)
	if sdef.is_empty():
		return [{"id": "overview", "code": "GEN", "label": "Vista general", "note": ""}]
	return Structure.get_zones_for_scene(sdef)

static func get_basic_exploration_actions() -> Array[Dictionary]:
	var acts: Array[Dictionary] = []
	for item in Structure.get_activities_catalog():
		acts.append({
			"id": str(item.get("id", "inspect")),
			"label": str(item.get("label", "Acción")),
			"category": "camp",
			"detail": str(item.get("description", "")),
			"anim": "sit" if str(item.get("id", "")) in ["rest", "sit", "warm"] else "interact",
		})
	if acts.is_empty():
		acts = [
			{"id": "fire-toggle", "label": "Encender / apagar hoguera", "category": "camp", "detail": "Prender o extinguir manualmente la hoguera del campamento.", "anim": "interact"},
			{"id": "warm", "label": "Calentarse al fuego", "category": "camp", "detail": "Acercarse a las brasas para entrar en calor.", "anim": "sit"},
			{"id": "cook", "label": "Calentar rancho", "category": "camp", "detail": "Revisar o remover el cazo sobre la hoguera.", "anim": "interact"},
			{"id": "tend-fire", "label": "Avivar fuego", "category": "camp", "detail": "Añadir leña seca y reavivar la llama.", "anim": "interact"},
			{"id": "rest", "label": "Descansar / Sentarse", "category": "camp", "detail": "Reposar en petate, tronco o piedra natural.", "anim": "sit"},
			{"id": "chest-toggle", "label": "Abrir / cerrar mochila o baúl", "category": "camp", "detail": "Abrir o cerrar la mochila personal (o baúl en A1).", "anim": "interact"},
			{"id": "study", "label": "Estudiar y anotar", "category": "camp", "detail": "Consultar el libro de conjuros o diario.", "anim": "interact"},
			{"id": "pray", "label": "Orar / Vigilia", "category": "camp", "detail": "Momento de recogimiento junto al altar o símbolo.", "anim": "interact"},
			{"id": "tools", "label": "Revisar equipo", "category": "camp", "detail": "Ordenar herramientas y flechas.", "anim": "interact"},
			{"id": "guard", "label": "Hacer guardia", "category": "camp", "detail": "Vigilar el perímetro del campamento.", "anim": "interact"},
		]
	elif Structure.get_active_scene_id() != "camp-a1-rooms":
		acts.insert(0, {"id": "fire-toggle", "label": "Encender / apagar hoguera", "category": "camp", "detail": "Prender o extinguir manualmente la hoguera del campamento.", "anim": "interact"})
	acts.append({"id": "hide", "label": "Sigilo / Agacharse", "category": "stealth", "detail": "Moverse con cautela por el entorno.", "anim": "stealth"})
	acts.append({"id": "jump", "label": "Saltar", "category": "athletics", "detail": "Salto breve [J]", "anim": "jump"})
	return acts

static func get_initial_dm_requests(scene_ref: Variant = "") -> Array[Dictionary]:
	var sid := str(scene_ref) if (scene_ref is String and str(scene_ref) != "") else Structure.get_active_scene_id()
	match sid:
		"camp-a1-rooms":
			return [
				{"id": "req_a1_dragon", "actor": "Mike", "action": "Examinar estatua de Astalagan", "skill": "Conocimiento Arcano CD 10", "zone": "Plaza A1"},
				{"id": "req_a1_fire", "actor": "Mia", "action": "Encender velas votivas y preparar rancho", "skill": "Interpretación narrativa", "zone": "Plaza A1"},
			]
		"camp-cliffs-observatory":
			return [
				{"id": "req_cliff_crystal", "actor": "Mike", "action": "Analizar cristales arcanos de basalto", "skill": "Arcano CD 12", "zone": "Meseta"},
				{"id": "req_cliff_watch", "actor": "Trinity", "action": "Vigilar horizonte entre nubes y aurora", "skill": "Percepción CD 11", "zone": "Mirador"},
			]
		_:
			return [
				{"id": "req_camp_watch", "actor": "Trinity", "action": "Establecer guardia perimetral del campamento", "skill": "Percepción CD 11", "zone": "Perímetro"},
				{"id": "req_camp_rest", "actor": "Mia", "action": "Solicitar validación de descanso al DM", "skill": "Decisión del DM", "zone": "Hoguera"},
			]

static func format_clock_day_time(total_seconds: int) -> Dictionary:
	var sec := maxi(0, total_seconds)
	var day := int(sec / 86400) + 1
	var sec_in_day := sec % 86400
	var hour := int(sec_in_day / 3600)
	var minute := int((sec_in_day % 3600) / 60)
	var second := sec_in_day % 60
	return {
		"day": day,
		"hour": hour,
		"minute": minute,
		"second": second,
		"day_label": "Día %d · %02d:%02d:%02d" % [day, hour, minute, second],
		"time_only": "%02d:%02d:%02d" % [hour, minute, second],
	}

static func get_time_label_es(time_id: String) -> String:
	match time_id:
		"day", "arrival": return "Llegada / Día"
		"dusk": return "Atardecer"
		"night": return "Noche"
		"dawn": return "Amanecer"
		"finalization": return "Cierre / Salida"
		_: return "Atardecer"

static func get_weather_label_es(weather_id: String) -> String:
	match weather_id:
		"clear": return "Despejado"
		"rain": return "Lluvia"
		"storm": return "Tormenta"
		"fog": return "Bruma"
		"snow": return "Nieve"
		_: return "Despejado"
