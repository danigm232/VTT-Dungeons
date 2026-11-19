class_name ShipEnvironment
extends Node3D

const Geometry = preload("res://scripts/ship_geometry.gd")
const Waves = preload("res://scripts/ocean_waves.gd")
const Structure = preload("res://scripts/wreck_structure.gd")
const TIMES = ["day", "dusk", "night"]
const WEATHER = ["clear", "rain", "storm", "fog"]
var time_of_day := "day"
var weather := "clear"
var wetness := 0.0
var target_wetness := 0.0
var reduced_effects := false
var exterior_fog_density := 0.002
var ready_for_review := false
var wet_materials: Array[Dictionary] = []
var shader_materials: Array[ShaderMaterial] = []
var actors: Array[Node3D] = []
var local_lights: Array[Dictionary] = []
var vessel: Node3D
var sun: DirectionalLight3D
var environment: Environment
var sky_material: ProceduralSkyMaterial
var water: ShaderMaterial
var vfx: Node3D
var roof: Node3D
var controls: PanelContainer
var hud_layer: CanvasLayer
var hud_toggle_button: Button
var external_ui_managed: bool = false

func _ready() -> void:
	initialize.call_deferred()

func initialize() -> void:
	var main := get_parent()
	vessel = main.get_node("ShipVessel")
	sun = main.get_node("SunLight")
	environment = main.get_node("WorldEnvironment").environment
	sky_material = environment.sky.sky_material
	water = main.get_node("OceanWater").get_active_material(0)
	if water and vessel:
		water.set_shader_parameter("hull_inv_matrix", vessel.global_transform.affine_inverse())
		water.set_shader_parameter("hull_mask_enabled", 1.0)
	vfx = vessel.get_node("Vfx")
	roof = vessel.get_node("RoofCutout")
	_build_horizon(main.get_node("OceanWater"))
	_catalogue_surfaces(main)
	_build_shadow_blockers(main)
	sun.light_cull_mask = 1 # Skylight cannot illuminate a cutaway cabin through its missing roof.
	for light: OmniLight3D in main.find_children("*", "OmniLight3D", true, false):
		var room_mask := mask_at(vessel.to_local(light.global_position))
		light.light_cull_mask = room_mask | 128
		if light.get_parent() is CharacterBody3D:
			continue
		local_lights.append({"node": light, "room": room_mask})
		light.shadow_enabled = not ("Glimmer" in light.name or "Ambient" in light.name or "Glow" in light.name or "Fill" in light.name)
		if light.name in ["C9_DepthGlimmer", "C9_HoldAmbient"]:
			light.light_energy = 0.0 # Only the breach, hatch spill and carried lamps provide light below.
	for id in ["PlayerToken", "RogueToken", "WizardToken", "HarpyToken", "ZombieToken"]:
		var actor := vessel.get_node_or_null(id) as Node3D
		if actor:
			actors.append(actor)
			var sprite := actor.get_node_or_null("Sprite3D") as Sprite3D
			if sprite:
				sprite.set_draw_flag(SpriteBase3D.FLAG_SHADED, true)
	_build_controls()
	ready_for_review = true
	apply_state(true)

func mask_at(p: Vector3) -> int:
	if p.x < Structure.STERN_X - 0.5 or p.x > Structure.BOW_X + 0.5 or absf(p.z) > Structure.get_beam_at(clampf(p.x, Structure.STERN_X, Structure.BOW_X)) + 0.5: return 1
	if p.y < -4.15: return 64
	if p.y < -1.1: return 32
	if p.y < 2.75 and p.x < -13.3 and p.x > -30.8: return 2 if p.z < 0 else 4
	if p.y < 2.75 and p.x > 13.3 and p.x < 30.8: return 8 if p.z < 0 else 16
	return 1

func _catalogue_surfaces(main: Node3D) -> void:
	var variants: Dictionary = {}
	for mesh: MeshInstance3D in main.find_children("*", "MeshInstance3D", true, false):
		var id := str(main.get_path_to(mesh))
		var interior := "AftCabins_C4_C5" in id or "ForeCabins_C6_C7" in id or "LowerDeck_C8" in id or "SubmergedHold_C9" in id
		if interior:
			var center := vessel.to_local(mesh.to_global(mesh.get_aabb().get_center()))
			mesh.layers = mask_at(center)
			if "Floor_Aft" in id or "Spine_Aft" in id: mesh.layers = 2 | 4
			if "Floor_Fore" in id or "Spine_Fore" in id: mesh.layers = 8 | 16
			# Los mamparos frontales exteriores dan al combés/cubierta principal abierta C1; deben recibir sol directo (capa 1)
			if "Bulkhead_Front" in id or "Outboard" in id or "UnderStair" in id or "Door" in id or "Wall_" in id:
				mesh.layers = 1 | mask_at(center)
			continue
		if not mesh.mesh: continue
		for surface in range(mesh.mesh.get_surface_count()):
			var original := mesh.get_active_material(surface)
			var wettable: bool = original is StandardMaterial3D and original.albedo_texture != null and original.transparency == BaseMaterial3D.TRANSPARENCY_DISABLED
			var wet_shader: bool = original is ShaderMaterial and ("hull_weathered" in original.shader.resource_path or "kenney_weathered" in original.shader.resource_path or "cloth_sail" in original.shader.resource_path or "wreck_plank" in original.shader.resource_path)
			if not wettable and not wet_shader: continue
			var key := original.get_instance_id()
			var variant: Material
			if variants.has(key):
				variant = variants[key]
			else:
				variant = original.duplicate()
				variants[key] = variant
				if wettable:
					wet_materials.append({"material": variant, "albedo": variant.albedo_color, "roughness": variant.roughness, "specular": variant.metallic_specular})
				else:
					shader_materials.append(variant)
			if mesh.material_override: mesh.material_override = variant
			else: mesh.set_surface_override_material(surface, variant)

func set_weather(value: String, immediate: bool = false) -> bool:
	if value not in WEATHER: return false
	weather = value
	target_wetness = 1.0 if value == "storm" else (0.7 if value == "rain" else 0.0)
	if immediate: wetness = target_wetness
	if ready_for_review: apply_state(immediate)
	return true

func _build_shadow_blockers(main: Node3D) -> void:
	# Cutaway walls must keep blocking the neighbouring room's light even while
	# their visible faces are hidden. These copies cast shadows only, never collide.
	var blockers := Node3D.new()
	blockers.name = "InteriorShadowBlockers"
	add_child(blockers)
	for original: MeshInstance3D in main.find_children("*", "MeshInstance3D", true, false):
		if not original.mesh or not (original.name.begins_with("Bulkhead") or original.name.begins_with("HullInner")): continue
		var copy := MeshInstance3D.new()
		copy.name = str(original.name) + "_Shadow"
		copy.mesh = original.mesh
		copy.layers = original.layers
		copy.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY
		blockers.add_child(copy)
		copy.global_transform = original.global_transform

func set_time_of_day(value: String) -> bool:
	if value not in TIMES: return false
	time_of_day = value
	if ready_for_review: apply_state(true)
	return true

func set_reduced_effects(value: bool) -> void:
	reduced_effects = value
	if ready_for_review: apply_state(true)

func _process(delta: float) -> void:
	if not ready_for_review: return
	var next_wetness := move_toward(wetness, target_wetness, delta * 0.18)
	if not is_equal_approx(next_wetness, wetness):
		wetness = next_wetness
		_apply_wetness()
	sync_zone_lighting()

func _apply_wetness() -> void:
	for entry in wet_materials:
		var mat: StandardMaterial3D = entry["material"]
		mat.albedo_color = entry["albedo"] * Color(1.0 - wetness * 0.22, 1.0 - wetness * 0.19, 1.0 - wetness * 0.16, 1.0)
		mat.roughness = lerpf(entry["roughness"], 0.46, wetness)
		mat.metallic_specular = lerpf(entry["specular"], 0.28, wetness)
	for mat in shader_materials:
		mat.set_shader_parameter("rain_wetness", wetness)
		if "cloth_sail" in mat.shader.resource_path:
			mat.set_shader_parameter("wind_amplitude", 0.035 if reduced_effects else (0.24 if weather == "storm" else 0.12))
			mat.set_shader_parameter("tear_flutter", 0.06 if reduced_effects else (0.45 if weather == "storm" else 0.22))

func apply_state(_immediate: bool = true) -> void:
	var night := time_of_day == "night"
	var dusk := time_of_day == "dusk"
	var overcast := weather in ["rain", "storm", "fog"]
	sun.light_energy = (0.14 if night else (0.80 if dusk else 1.30)) * (0.45 if overcast else 1.0)
	sun.light_color = Color("#b2c7e5") if night else (Color("#ffd5a3") if dusk else Color("#fff5e8"))
	sun.rotation_degrees = Vector3(-24 if dusk else -48, -35 if night else -42, 0)
	environment.ambient_light_color = Color("#637e9c") if night else Color("#91acb8")
	environment.ambient_light_energy = 0.16 if night else (0.34 if dusk else 0.54)
	environment.ssao_intensity = 0.85
	environment.ssao_power = 1.15
	environment.ssao_radius = 0.85
	environment.glow_intensity = 0.30
	environment.glow_bloom = 0.04
	exterior_fog_density = 0.014 if weather == "fog" else (0.006 if weather == "storm" else 0.002)
	environment.volumetric_fog_density = exterior_fog_density
	environment.volumetric_fog_albedo = Color("#526678") if night else Color("#9bafb6")
	environment.volumetric_fog_emission_energy = 0.0
	sky_material.sky_top_color = Color("#07101f") if night else (Color("#534c65") if dusk else Color("#577e96"))
	sky_material.sky_horizon_color = Color("#263547") if night else (Color("#c7a38b") if dusk else Color("#b6c7c9"))
	if overcast:
		sky_material.sky_top_color = sky_material.sky_top_color.lerp(Color("#4e626d"), 0.55)
		sky_material.sky_horizon_color = sky_material.sky_horizon_color.lerp(Color("#71858e"), 0.45)
	sky_material.ground_horizon_color = sky_material.sky_horizon_color
	water.set_shader_parameter("wave_amplitude", 0.42 if weather == "storm" else 0.30)
	var breach_light := vessel.find_child("C9_SternBreachGlow", true, false) as OmniLight3D
	if breach_light: breach_light.light_energy = 0.08 if night else (0.24 if dusk else 0.48)
	Waves.current_amplitude = 0.42 if weather == "storm" else 0.30
	var boat := get_parent().find_child("Rowboat", true, false)
	if boat: boat.wave_amplitude = Waves.current_amplitude
	_apply_wetness()
	sync_zone_lighting()

func sync_zone_lighting() -> void:
	var active_mask := 1
	match roof.current_interior_state:
		"aft_c4_port": active_mask = 2
		"aft_c5_stbd": active_mask = 4
		"aft_c4_c5": active_mask = 2 | 4
		"fore_c6_port": active_mask = 8
		"fore_c7_stbd": active_mask = 16
		"fore_c6_c7": active_mask = 8 | 16
		"lower_c8_bilge": active_mask = 32
		"lower_c9_hold": active_mask = 64
		"lower_c8_c9": active_mask = 32 | 64
	for entry in local_lights:
		entry["node"].visible = (entry["room"] & active_mask) != 0
	for actor in actors:
		var mask := mask_at(vessel.to_local(actor.global_position)) | 128
		var light := actor.get_node_or_null("CarriedLantern") as OmniLight3D
		if light and light.light_cull_mask != mask: light.light_cull_mask = mask
	var interior: bool = roof.current_interior_state != "exterior"
	environment.volumetric_fog_density = (0.0032 if roof.current_interior_state == "lower_c9_hold" else 0.0006) if interior else exterior_fog_density
	vfx.set_environment(weather, interior, reduced_effects)
	var caustic := vessel.find_child("C9_CausticsOverlay", true, false) as MeshInstance3D
	if caustic:
		var mat := caustic.get_active_material(0) as ShaderMaterial
		if mat: mat.set_shader_parameter("light_energy", 0.12 if time_of_day == "night" else 0.24)

func _build_horizon(ocean: MeshInstance3D) -> void:
	var st := Geometry.begin(ocean.get_active_material(0))
	for side in range(4):
		for i in range(128):
			var t0 := -1.0 + 2.0 * float(i) / 128.0
			var t1 := -1.0 + 2.0 * float(i + 1) / 128.0
			var a: Vector3
			var b: Vector3
			var c: Vector3
			var d: Vector3
			if side < 2:
				var sign_z := -1.0 if side == 0 else 1.0
				a = Vector3(t0 * 140, 0, sign_z * 120); b = Vector3(t1 * 140, 0, sign_z * 120)
				c = Vector3(t1 * 1000, 0, sign_z * 1000); d = Vector3(t0 * 1000, 0, sign_z * 1000)
			else:
				var sign_x := -1.0 if side == 2 else 1.0
				a = Vector3(sign_x * 140, 0, t0 * 120); b = Vector3(sign_x * 140, 0, t1 * 120)
				c = Vector3(sign_x * 1000, 0, t1 * 1000); d = Vector3(sign_x * 1000, 0, t0 * 1000)
			if side in [0, 3]: Geometry.quad(st, d, c, b, a)
			else: Geometry.quad(st, a, b, c, d)
	var horizon := Geometry.commit(ocean, "OceanHorizon", st)
	horizon.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func _build_controls() -> void:
	hud_layer = CanvasLayer.new()
	hud_layer.layer = 110
	add_child(hud_layer)
	var anchor := Control.new()
	anchor.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_layer.add_child(anchor)
	hud_toggle_button = Button.new()
	hud_toggle_button.text = "Ambiente · F6"
	hud_toggle_button.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	hud_toggle_button.position = Vector2(-175, 18)
	hud_toggle_button.size = Vector2(155, 34)
	hud_toggle_button.visible = not external_ui_managed
	anchor.add_child(hud_toggle_button)
	controls = PanelContainer.new()
	controls.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	controls.position = Vector2(-265, 62)
	controls.custom_minimum_size = Vector2(245, 0)
	anchor.add_child(controls)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	controls.add_child(box)
	var title := Label.new(); title.text = "Hora y tiempo"; box.add_child(title)
	var times := OptionButton.new()
	for label in ["Día", "Atardecer", "Noche"]: times.add_item(label)
	times.item_selected.connect(func(index): set_time_of_day(TIMES[index]))
	box.add_child(times)
	var climates := OptionButton.new()
	for label in ["Despejado", "Lluvia", "Tormenta", "Bruma"]: climates.add_item(label)
	climates.item_selected.connect(func(index): set_weather(WEATHER[index]))
	box.add_child(climates)
	var gentle := CheckButton.new(); gentle.text = "Efectos suaves"
	gentle.toggled.connect(set_reduced_effects); box.add_child(gentle)
	controls.hide()
	hud_toggle_button.pressed.connect(func(): controls.visible = not controls.visible)

func set_external_ui_managed(managed: bool) -> void:
	external_ui_managed = managed
	if hud_toggle_button:
		hud_toggle_button.visible = not external_ui_managed
	if external_ui_managed and controls:
		controls.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F6:
		controls.visible = not controls.visible
		get_viewport().set_input_as_handled()
