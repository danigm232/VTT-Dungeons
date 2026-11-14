class_name VttCampaignData
extends RefCounted

# Datos canónicos de campaña y escenas para Dungeons VTT en Godot 4
# Paridad con campaigns/stormwreck-isle/private/seed.ts, public/pack.ts y engine/client/game-clock-overlay.ts

const CAMPAIGN_SPECIO_ID := "stormwreck-isle"

static func get_campaign_meta(is_retreat: bool) -> Dictionary:
	if is_retreat:
		return {
			"id": "stormwreck-isle",
			"title": "El Retiro del Dragón",
			"subtitle": "Cap. 1 · Monasterio en la Isla de las Tempestades",
			"default_zone": "Z1_BEACH",
			"default_zone_title": "Playa y Embarcadero"
		}
	return {
		"id": "stormwreck-isle",
		"title": "El Rosa de los Vientos",
		"subtitle": "Cap. 2 · Pecio en los arrecifes de la Isla de las Tempestades",
		"default_zone": "c1",
		"default_zone_title": "Cubierta Principal (C1)"
	}

static func create_default_actors() -> Array[Dictionary]:
	return [
		{
			"id": "mia",
			"node_name": "PlayerToken",
			"name": "Mia",
			"short_desc": "Clériga enana · Niv. 1 · Soldado",
			"archetype": "Clériga enana · Vida y escudos",
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
				{"name": "Palabra de curación", "detail": "1d4+3 PG (acción adicional) · 18 m"},
				{"name": "Bendición", "detail": "+1d4 a ataques y salvaciones (3 criaturas) · 9 m"},
				{"name": "Escudo de fe", "detail": "+2 CA (concentración) · 18 m"}
			],
			"gear": ["Cota de malla", "Escudo", "Maza", "Hacha de mano", "Símbolo sagrado", "Mochila", "Antorcha"],
			"notes": "Vanguardia resistente del grupo; aporta curación de emergencia y luz consagrada."
		},
		{
			"id": "maria",
			"node_name": "RogueToken",
			"name": "Trinity",
			"short_desc": "Pícara mediana · Niv. 1 · Criminal",
			"archetype": "Pícara mediana · Sigilo y arco",
			"level": 1,
			"class_line": "Pícara mediana · Criminal",
			"hp": 9,
			"hp_max": 9,
			"ac": 14,
			"speed": 7.5,
			"initiative_bonus": 3,
			"color": Color("#b66dc4"),
			"abilities": {"FUE": 10, "DES": 16, "CON": 12, "INT": 13, "SAB": 12, "CAR": 14},
			"features": [
				"Mediana piesligeros (sigilo tras criaturas medianas)",
				"Ataque furtivo (1d6 con ventaja o aliado adyacente)",
				"Pericia: Sigilo (+7) y Herramientas de ladrón (+7)",
				"Jerga de ladrones"
			],
			"attacks": [
				{"name": "Arco corto", "bonus": "+5", "damage": "1d6+3 perforante", "range": "24/96 m"},
				{"name": "Daga", "bonus": "+5", "damage": "1d4+3 perforante", "range": "1.5 m"},
				{"name": "Lanzar daga", "bonus": "+5", "damage": "1d4+3 perforante", "range": "6/18 m"}
			],
			"spells": [],
			"gear": ["Armadura de cuero", "Arco corto", "20 flechas", "2 dagas", "Herramientas de ladrón", "Mochila", "Antorcha"],
			"notes": "Exploradora ágil para abrir la puerta atrancada de C4, detectar la trampa de C6 y golpear desde la cubierta."
		},
		{
			"id": "mike",
			"node_name": "WizardToken",
			"name": "Mike",
			"short_desc": "Mago alto elfo · Niv. 1 · Erudito",
			"archetype": "Mago alto elfo · Arcano y control",
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
				"Recuperación arcana (1 espacio de conjuro en descanso corto)"
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
			"gear": ["Espada corta", "Saquito de componentes", "Libro de conjuros", "Mochila", "Antorcha"],
			"notes": "Especialista en alcance contra la arpía de C10 y lectura arcana de la bodega C9."
		}
	]

static func create_default_enemies(is_retreat: bool) -> Array[Dictionary]:
	if is_retreat:
		return [
			{
				"id": "kobold_scout",
				"node_name": "",
				"name": "Kobold vigilante",
				"zone": "A1 · Plaza Central",
				"hp": 5,
				"hp_max": 5,
				"ac": 12,
				"speed": 9.0,
				"initiative_bonus": 2,
				"color": Color("#b65c55"),
				"revealed": false,
				"traits": ["Táctica de manada", "Sensibilidad a la luz solar"],
				"actions": ["Daga · +4 · 1d4+2 perforante", "Honda · +4 · 1d4+2 contundente · 9/36 m"],
				"summary": "Centinela al servicio del templo de Astalagan."
			}
		]
	return [
		{
			"id": "harpy",
			"node_name": "HarpyToken",
			"name": "Arpía",
			"zone": "C10 · Cofa del Palo Mayor",
			"hp": 38,
			"hp_max": 38,
			"ac": 11,
			"speed": 6.0,
			"initiative_bonus": 1,
			"color": Color("#b65c55"),
			"revealed": true,
			"traits": [
				"Canto cautivador (Salvación Sabiduría CD 11; 90 m)",
				"Vuelo 12 m entre jarcia y vergas"
			],
			"actions": [
				"Multiataque: Garras (+3, 2d4+1 cortante) y Porra (+3, 1d4+1 contundente)",
				"Canto cautivador (acción): atrae hacia el peligro de la borda"
			],
			"summary": "Anida en la cofa C10 junto a gemas y monedas; canta para atraer a los aventureros hacia la escora."
		},
		{
			"id": "zombie",
			"node_name": "ZombieToken",
			"name": "Zombi ahogado",
			"zone": "C8 · Sentina Inundada",
			"hp": 22,
			"hp_max": 22,
			"ac": 8,
			"speed": 6.0,
			"initiative_bonus": -2,
			"color": Color("#6b8c6e"),
			"revealed": true,
			"traits": [
				"Fortaleza de muerto viviente (Salv. CON CD 5 + daño recibido)",
				"Inmune al veneno y al estado envenenado"
			],
			"actions": [
				"Golpe · +3 · 1d6+1 contundente · 1.5 m"
			],
			"summary": "Emerge entre el agua salobre de la sentina C8 cerca de la brecha de popa."
		}
	]

static func get_pecio_zones() -> Array[Dictionary]:
	return [
		{
			"id": "exterior",
			"code": "EXT",
			"label": "Exterior · Barco completo",
			"cutout": "exterior",
			"overview": true,
			"focus": Vector3(0.0, 2.5, 0.0),
			"distance": 38.0,
			"note": "El pecio El Rosa de los Vientos encallado sobre huesos de dragón con 9.5° de escora hacia babor. La arpía vigila desde C10."
		},
		{
			"id": "c1",
			"code": "C1",
			"label": "C1 · Cubierta Principal",
			"cutout": "exterior",
			"overview": false,
			"focus": Vector3(0.0, 0.4, 0.0),
			"distance": 18.0,
			"note": "Combés principal entre el castillo de proa y el alcázar de popa. Escotilla central, cabilleros, obenques hacia C10 y escala hacia C8."
		},
		{
			"id": "c2",
			"code": "C2",
			"label": "C2 · Castillo de Proa",
			"cutout": "exterior",
			"overview": false,
			"focus": Vector3(21.5, 3.2, 0.0),
			"distance": 15.0,
			"note": "Cubierta elevada de proa con molinete de ancla, balista naval, cañón de hierro y jarcias del bauprés."
		},
		{
			"id": "c3",
			"code": "C3",
			"label": "C3 · Alcázar de Popa",
			"cutout": "exterior",
			"overview": false,
			"focus": Vector3(-21.5, 3.2, 0.0),
			"distance": 15.0,
			"note": "Popa escorada con la rueda del timón sujeta por tensión. Al soltarse (Destreza CD 10), la rueda oscila con fuerza (1d6 contundente)."
		},
		{
			"id": "c4",
			"code": "C4",
			"label": "C4 · Camarote del Capitán",
			"cutout": "aft_c4_port",
			"overview": false,
			"focus": Vector3(-18.5, 0.6, -4.0),
			"distance": 11.5,
			"note": "Puerta atrancada desde fuera/corredera. Dentro esperan la carta náutica de la Costa de la Espada, brújula de latón y 50 po."
		},
		{
			"id": "c5",
			"code": "C5",
			"label": "C5 · Cocina de a Bordo",
			"cutout": "aft_c5_stbd",
			"overview": false,
			"focus": Vector3(-18.5, 0.6, 3.8),
			"distance": 11.5,
			"note": "Fogón oxidado y útiles de cocina escorados. Una poción de curación rueda junto al aparador de estribor."
		},
		{
			"id": "c6",
			"code": "C6",
			"label": "C6 · Camarote de Tripulación",
			"cutout": "fore_c6_port",
			"overview": false,
			"focus": Vector3(18.5, 0.6, -3.5),
			"distance": 11.5,
			"note": "Literas marineras con un alijo oculto de 200 po y posible trampa de aguja (Percepción / Herramientas de ladrón CD 12)."
		},
		{
			"id": "c7",
			"code": "C7",
			"label": "C7 · Comedor de Proa",
			"cutout": "fore_c7_stbd",
			"overview": false,
			"focus": Vector3(18.5, 0.6, 3.5),
			"distance": 11.5,
			"note": "Mesa larga corrida por la escora, vajilla de peltre y restos del cuaderno de bitácora."
		},
		{
			"id": "c8",
			"code": "C8",
			"label": "C8 · Sentina Inundada",
			"cutout": "lower_c8_bilge",
			"overview": false,
			"focus": Vector3(-3.0, -3.0, 0.8),
			"distance": 18.0,
			"note": "Cubierta inferior inundada hasta los tobillos (terreno difícil en partes). Aquí acecha el zombi ahogado."
		},
		{
			"id": "c9",
			"code": "C9",
			"label": "C9 · Bodega Sumergida",
			"cutout": "lower_c9_hold",
			"overview": false,
			"focus": Vector3(-6.0, -6.1, -1.0),
			"distance": 16.0,
			"note": "Bodega completamente sumergida salvo bolsas de aire junto a la brecha de popa. Cofre sumergido cerca del talismán."
		},
		{
			"id": "c10",
			"code": "C10",
			"label": "C10 · Cofa del Palo Mayor",
			"cutout": "exterior",
			"overview": false,
			"focus": Vector3(0.35, 15.2, -0.48),
			"distance": 11.0,
			"note": "Plataforma circular a +15 m sobre la cubierta. Nido de la arpía con gemas y pulsera de oro; ascenso por obenques (Atletismo CD 10)."
		}
	]

static func get_retreat_zones() -> Array[Dictionary]:
	return [
		{"id": "overview", "code": "ALL", "label": "Vista General del Monasterio", "preset": "overview", "note": "Panorámica completa de El Retiro del Dragón sobre el acantilado."},
		{"id": "beach", "code": "Z1", "label": "Playa y Embarcadero", "preset": "beach", "note": "Desembarco inicial de los aventureros en la Isla de las Tempestades."},
		{"id": "a1", "code": "A1", "label": "A1 · Celdas y Plaza Central", "preset": "a1", "note": "Hoguera comunitaria, estatua de Astalagan y celdas de peregrinos."},
		{"id": "a2", "code": "A2", "label": "A2 · Cabrestante y Almacén", "preset": "a2", "note": "Mecanismo de torno junto al acantilado oriental."},
		{"id": "a3", "code": "A3", "label": "A3 · Comedor y Cocina", "preset": "a3", "note": "Hospitalidad de Runara y los habitantes del monasterio."},
		{"id": "a4", "code": "A4", "label": "A4 · Biblioteca (Scriptorium)", "preset": "a4", "note": "Investigación sobre dragones, Runara y los pecios cercanos."},
		{"id": "a5", "code": "A5", "label": "A5 · Templo de Bahamut", "preset": "a5", "note": "Santuario superior del acantilado y efigie del Dragón de Platino."}
	]

static func get_pecio_zone_label(zone_key: String) -> String:
	match zone_key:
		"c1", "main", "exterior":
			return "Cubierta Principal (C1)"
		"c2":
			return "Castillo de Proa (C2)"
		"c3":
			return "Alcázar de Popa (C3)"
		"c4", "aft_c4_port":
			return "Camarote del Capitán (C4)"
		"c5", "aft_c5_stbd":
			return "Cocina de a Bordo (C5)"
		"c6", "fore_c6_port":
			return "Camarote de Tripulación (C6)"
		"c7", "fore_c7_stbd":
			return "Comedor de Proa (C7)"
		"c8", "lower_c8_bilge":
			return "Sentina Inundada (C8)"
		"c9", "lower_c9_hold":
			return "Bodega Sumergida (C9)"
		"c10", "crows_nest":
			return "Cofa del Palo Mayor (C10)"
		"sea":
			return "Aguas del Arrecife"
		_:
			return "Cubierta Principal (C1)"

static func get_basic_exploration_actions() -> Array[Dictionary]:
	return [
		{"id": "talk", "label": "Hablar", "category": "social", "detail": "Conversar con aliados o criaturas cercanas", "anim": "interact"},
		{"id": "influence", "label": "Influir", "category": "social", "detail": "Persuasión, Intimidación o Engaño", "anim": "cast"},
		{"id": "help", "label": "Ayudar", "category": "support", "detail": "Dar ventaja a un compañero cercano", "anim": "interact"},
		{"id": "hide", "label": "Esconderse", "category": "stealth", "detail": "Prueba de Destreza (Sigilo)", "anim": "stealth"},
		{"id": "search", "label": "Buscar", "category": "explore", "detail": "Prueba de Sabiduría (Percepción)", "anim": "interact"},
		{"id": "study", "label": "Estudiar", "category": "explore", "detail": "Analizar pistas, mapas o mecanismos", "anim": "interact"},
		{"id": "utilize", "label": "Utilizar objeto", "category": "explore", "detail": "Manipular palancas, cabos u objetos", "anim": "interact"},
		{"id": "lockpick", "label": "Forzar cerradura", "category": "skill", "detail": "Herramientas de ladrón / Fuerza CD 12", "anim": "interact"},
		{"id": "climb", "label": "Trepar", "category": "athletics", "detail": "Fuerza (Atletismo) · Obenques o borda", "anim": "interact"},
		{"id": "swim", "label": "Nadar", "category": "athletics", "detail": "Fuerza (Atletismo) · Sentina / Bodega", "anim": "interact"},
		{"id": "jump", "label": "Saltar", "category": "athletics", "detail": "Salto en carrera o desde el lugar [J]", "anim": "jump"}
	]

static func get_initial_dm_requests(is_retreat: bool) -> Array[Dictionary]:
	if is_retreat:
		return [
			{"id": "req_retiro_1", "actor": "Mia", "action": "Examinar estatua del Dragón", "skill": "Religión CD 11", "zone": "A1"},
			{"id": "req_retiro_2", "actor": "Trinity", "action": "Inspeccionar mecanismo del cabrestante", "skill": "Investigación CD 12", "zone": "A2"}
		]
	return [
		{"id": "req_cofa", "actor": "Trinity", "action": "Trepar por los obenques hacia C10", "skill": "Atletismo CD 10", "zone": "C1 -> C10"},
		{"id": "req_helm", "actor": "Mia", "action": "Desenganchar o sujetar el Timón", "skill": "Destreza CD 10", "zone": "C3"},
		{"id": "req_c4", "actor": "Mike", "action": "Revisar carta náutica y brújula", "skill": "Investigación CD 12", "zone": "C4"}
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
		"time_only": "%02d:%02d:%02d" % [hour, minute, second]
	}

static func get_time_label_es(time_id: String) -> String:
	match time_id:
		"day": return "Mediodía"
		"dusk": return "Atardecer"
		"night": return "Noche"
		_: return "Mediodía"

static func get_weather_label_es(weather_id: String) -> String:
	match weather_id:
		"clear": return "Despejado"
		"rain": return "Lluvia"
		"storm": return "Tormenta"
		"fog": return "Bruma"
		_: return "Despejado"
