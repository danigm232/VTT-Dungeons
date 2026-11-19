class_name PlayerToken
extends CharacterBody3D

# ==============================================================================
# TOKEN 2.5D CANÓNICO DE PERSONAJE (PARIDAD BABYLON + CATÁLOGO MULTI-ESTADO)
# - Dirección 8-octantes cámara-relativa (n, ne, e, se, s, sw, w, nw) para TODOS
#   los jugadores (Clériga Mia, Pícara Maria Trinity, Mago Mike) y PNJs (Arpía, Zombi).
# - Ciclos completos de sprites aislados por alfa + articulación expresiva Babylon:
#   idle, combat_idle, walk, run (Shift), stealth/dodge (Ctrl), jump (J),
#   climb (escalas C10), swim (sentina/bodega C8/C9), interact (T / V antorcha),
#   attack 8-dir (K + slash VFX), spell / attack_arrow (L), hit (H),
#   sit (Z), prone / crawl (X), defeated.
# ==============================================================================

const CharacterSpriteCatalog = preload("res://scripts/character_sprite_catalog.gd")
const OceanWaves = preload("res://scripts/ocean_waves.gd")
const WreckStructure = preload("res://scripts/wreck_structure.gd")

@export var token_name: String = "Hero"
@export var token_texture: Texture2D
@export var target_height: float = 1.95
@export var move_speed: float = 6.0
@export var is_active_player: bool = false
@export var is_npc: bool = false
@export var has_carried_light: bool = true
@export var ring_color: Color = Color(0.95, 0.78, 0.25, 0.9)

@export var hframes: int = 1
@export var vframes: int = 1
@export var default_frame: int = 0

@onready var sprite: Sprite3D = $Sprite3D
@onready var collision: CollisionShape3D = $CollisionShape3D

var carried_light: OmniLight3D
var torch_sparks: GPUParticles3D
var torch_prop: Node3D
var torch_flame_mesh: MeshInstance3D
var contact_shadow: MeshInstance3D
var selection_ring: MeshInstance3D
var action_vfx_sprite: Sprite3D

var char_key: String = "cleric"
var char_profile: Dictionary = {}

# Estado de animación y locomoción
var facing_dir: String = "s"
var current_anim: String = "idle"
var active_clip_frames: Array = []
var active_clip_fps: float = 4.0
var active_clip_loop: bool = true
var active_clip_flip_h: bool = false
var active_clip_drawn_motion: bool = false
var anim_frame_idx: int = 0
var anim_timer: float = 0.0
var action_lock_timer: float = 0.0
var action_anim_name: String = ""

# Estados persistentes jugables y ambientales
var is_sprinting: bool = false
var is_stealth: bool = false
var is_sitting: bool = false
var is_prone: bool = false
var is_defeated: bool = false
var is_in_combat_stance: bool = false
var in_water: bool = false
var in_shallow_water: bool = false
var in_open_ocean: bool = false
var in_boat: bool = false
var current_boat: Node3D = null
var swim_time: float = 0.0

# Salto parabólico y micro-animaciones procedurales
var is_jumping: bool = false
var jump_timer: float = 0.0
var jump_duration: float = 0.56
var jump_peak_height: float = 1.05
var walk_cycle: float = 0.0
var idle_breath_time: float = 0.0
var hit_flash_timer: float = 0.0
var vfx_timer: float = 0.0
var vfx_duration: float = 0.38
var vfx_mode: String = ""
var npc_ai_timer: float = 0.0
var current_height_scale: float = 1.0
var current_floor_offset: float = 0.0

# Sistema de Antorcha Viva
var is_torch_lit: bool = false
var flicker_time: float = 0.0
var is_transitioning: bool = false
var input_override: Vector2 = Vector2.ZERO

func _ready() -> void:
	floor_max_angle = deg_to_rad(60.0)
	floor_snap_length = 0.50
	floor_constant_speed = true
	floor_stop_on_slope = true
	wall_min_slide_angle = deg_to_rad(10.0)

	char_key = CharacterSpriteCatalog.resolve_character_key(token_name)
	preload("res://sprites/character_stature.gd").apply(self,char_key)
	load_character_animations()
	setup_sprite_visuals()
	build_contact_shadow()
	build_selection_ring()
	build_action_vfx()
	if has_carried_light and not is_npc:
		build_carried_lantern()

	set_active(is_active_player)
	_resolve_and_apply_clip("idle", "s", true)

	var inv = get_tree().root.find_child("InventoryManager", true, false)
	if inv and inv.has_signal("torch_toggled"):
		inv.torch_toggled.connect(set_torch_mode)

func load_character_animations() -> void:
	char_profile = CharacterSpriteCatalog.get_character_clips(char_key)

func setup_sprite_visuals() -> void:
	if not sprite:
		return
	sprite.hframes = 1
	sprite.vframes = 1
	sprite.frame = 0
	sprite.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sprite.render_priority = 10

	if sprite.texture == null and token_texture:
		sprite.texture = token_texture

	if collision:
		# An instanced PackedScene shares subresources unless explicitly isolated.
		# Stature belongs to this miniature, never to the next actor loaded.
		if collision.shape: collision.shape=collision.shape.duplicate()
		if collision.shape is CapsuleShape3D:
			var cap := collision.shape as CapsuleShape3D
			cap.height = target_height * 0.95
			cap.radius = 0.36
			collision.position.y = target_height * 0.5
		elif collision.shape is CylinderShape3D:
			var cyl := collision.shape as CylinderShape3D
			cyl.height = target_height * 0.95
			cyl.radius = 0.40
			collision.position.y = target_height * 0.5

func set_texture(new_tex: Texture2D) -> void:
	token_texture = new_tex
	if sprite:
		sprite.texture = new_tex
		_update_sprite_scale_from_tex(new_tex, 1.0)

func set_active(active: bool) -> void:
	is_active_player = active
	if selection_ring:
		selection_ring.visible = is_active_player and not is_npc
	if carried_light:
		carried_light.visible = is_torch_lit
		carried_light.light_energy = (2.6 if is_active_player else 1.4) if is_torch_lit else 0.0
	_sync_torch_sparks()

func set_torch_mode(lit: bool, animate: bool = true) -> void:
	is_torch_lit = lit
	if animate and is_active_player and not is_npc:
		play_action_animation("interact", 0.42)
	if carried_light:
		carried_light.visible = is_torch_lit
		if is_torch_lit:
			carried_light.light_color = Color("#ff9a35")
			carried_light.omni_range = 20.0
			carried_light.omni_attenuation = 1.1
			carried_light.shadow_enabled = false
			carried_light.light_energy = 2.6 if is_active_player else 1.4
		else:
			carried_light.light_energy = 0.0
	_sync_torch_sparks()

func play_action_animation(action: String, duration: float = 0.62) -> void:
	var norm := action.to_lower()
	if norm == "use_torch" or norm == "talk" or norm == "search" or norm == "study":
		norm = "interact"
	elif norm == "attack-arrow":
		norm = "attack_arrow"
	elif norm == "attack-throw":
		norm = "attack_throw"
	elif norm == "combat-idle" or norm == "ready":
		norm = "combat_idle"

	if norm == "sit":
		is_sitting = true
		is_prone = false
		action_lock_timer = 0.0
		_resolve_and_apply_clip("sit", facing_dir, true)
		return
	elif norm == "prone":
		is_prone = true
		is_sitting = false
		action_lock_timer = 0.0
		_resolve_and_apply_clip("prone", facing_dir, true)
		return
	elif norm == "defeated":
		is_defeated = true
		action_lock_timer = 0.0
		_resolve_and_apply_clip("defeated", facing_dir, true)
		return
	elif norm == "idle":
		action_lock_timer = 0.0
		action_anim_name = ""
		is_sitting = false
		is_prone = false
		is_defeated = false
		_resolve_and_apply_clip("idle", facing_dir, true)
		return
	elif norm == "jump":
		_start_jump()
		return

	is_sitting = false
	action_anim_name = norm
	action_lock_timer = duration
	anim_frame_idx = 0
	anim_timer = 0.0
	_resolve_and_apply_clip(norm, facing_dir, true)
	if not active_clip_loop:
		action_lock_timer = maxf(action_lock_timer, active_clip_frames.size() / maxf(1.0, active_clip_fps))

	if norm.begins_with("attack") or norm == "spell":
		_trigger_action_vfx(norm)
	elif norm == "hit":
		hit_flash_timer = 0.35

func set_stance(stance: String) -> void:
	match stance:
		"stealth":
			is_stealth = not is_stealth
			is_sitting = false
			is_prone = false
		"sit":
			is_sitting = not is_sitting
			is_prone = false
			is_stealth = false
		"prone":
			is_prone = not is_prone
			is_sitting = false
			is_stealth = false
		"combat":
			is_in_combat_stance = not is_in_combat_stance
		"reset":
			is_stealth = false
			is_sitting = false
			is_prone = false
			is_defeated = false
			is_in_combat_stance = false

func _start_jump() -> void:
	if is_jumping or is_defeated or in_boat:
		return
	is_sitting = false
	is_prone = false
	is_jumping = true
	jump_timer = 0.0
	if in_open_ocean:
		velocity.y = 6.2
	action_anim_name = "jump"
	action_lock_timer = jump_duration
	anim_frame_idx = 0
	anim_timer = 0.0
	_resolve_and_apply_clip("jump", facing_dir, true)

func _unhandled_input(event: InputEvent) -> void:
	var combat=get_meta("combat_controller") if has_meta("combat_controller") else null
	if combat and event is InputEventKey and event.pressed and combat.shortcut(self,event.keycode):
		get_viewport().set_input_as_handled()
		return
	if not _camera_allows_keyboard() or is_npc or is_transitioning:
		return
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		var kev := event as InputEventKey
		if kev.alt_pressed or kev.meta_pressed:
			return
		if kev.ctrl_pressed and kev.keycode != KEY_CTRL:
			return
		match kev.keycode:
			KEY_J:
				_start_jump()
				get_viewport().set_input_as_handled()
			KEY_K:
				play_action_animation("attack", 0.56)
				get_viewport().set_input_as_handled()
			KEY_L:
				var rng_state := "attack_arrow" if char_key == "rogue" else "spell"
				play_action_animation(rng_state, 0.65)
				get_viewport().set_input_as_handled()
			KEY_H:
				play_action_animation("hit", 0.45)
				get_viewport().set_input_as_handled()
			KEY_CTRL:
				set_stance("stealth")
				get_viewport().set_input_as_handled()
			KEY_Z:
				set_stance("sit")
				get_viewport().set_input_as_handled()
			KEY_X:
				set_stance("prone")
				get_viewport().set_input_as_handled()

func _dir_from_vector(v: Vector2) -> String:
	var ang := atan2(v.y, v.x)
	var octant := int(round(ang / (PI / 4.0))) % 8
	if octant < 0:
		octant += 8
	# ang=0 -> +X (Este), +PI/2 -> +Y (Sur), +PI -> -X (Oeste), -PI/2 -> -Y (Norte)
	const OCTANT_DIRS: Array[String] = ["e", "se", "s", "sw", "w", "nw", "n", "ne"]
	return OCTANT_DIRS[octant]

func _physics_process(delta: float) -> void:
	var sheet_open := bool(get_meta("character_sheet_open", false))
	if (sheet_open or bool(get_meta("inventory_modal_open", false)) or bool(get_meta("player_settings_modal", false))):
		input_override = Vector2.ZERO
		velocity.x = 0; velocity.z = 0
		if sheet_open:
			velocity = Vector3.ZERO
			# The real actor keeps its existing idle/state renderer while translation is blocked.
			idle_breath_time += delta
			if action_lock_timer > 0.0:
				action_lock_timer = maxf(0.0, action_lock_timer - delta)
				if action_lock_timer <= 0.0: action_anim_name = ""
			_process_pose_visuals(delta, Vector2.ZERO, _resolve_desired_state(Vector2.ZERO))
		return
	idle_breath_time += delta
	swim_time += delta
	if hit_flash_timer > 0.0:
		hit_flash_timer = maxf(0.0, hit_flash_timer - delta)
	_update_action_vfx(delta)

	if in_boat:
		in_water = false
		in_shallow_water = false
		in_open_ocean = false
		is_sitting = true
		if current_anim != "sit":
			_resolve_and_apply_clip("sit", facing_dir, true)
		process_frame_animation(delta)
		_apply_procedural_motion(delta, Vector2.ZERO, "sit")
		_update_carried_torch_flicker(delta)
		return

	var vessel := get_parent() as Node3D
	var local_pos := vessel.to_local(global_position) if vessel else position
	var beam_here := WreckStructure.get_beam_at(local_pos.x)
	var inside_hull := (local_pos.x >= WreckStructure.STERN_X - 0.35 and local_pos.x <= WreckStructure.BOW_X + 0.35 and absf(local_pos.z) <= beam_here + 0.35)
	var wave_state := OceanWaves.sample_wave_state(Vector2(global_position.x, global_position.z), swim_time)
	var sea_y: float = float(wave_state["surface_y"])

	in_open_ocean = (not inside_hull) and (global_position.y <= sea_y - 0.12)
	var in_c9_submerged := inside_hull and (local_pos.y < -4.15)
	in_shallow_water = inside_hull and (local_pos.y >= -3.95 and local_pos.y <= -2.95)
	in_water = in_open_ocean or in_c9_submerged

	var input_dir := input_override
	is_sprinting = false
	if not is_transitioning:
		if input_dir == Vector2.ZERO and _camera_allows_keyboard() and not is_npc:
			if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
				input_dir.x += 1.0
			if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
				input_dir.x -= 1.0
			if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
				input_dir.y += 1.0
			if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
				input_dir.y -= 1.0
			is_sprinting = Input.is_key_pressed(KEY_SHIFT)

		input_dir = input_dir.normalized()
		if input_dir.length_squared() > 0.04:
			is_sitting = false
			facing_dir = _dir_from_vector(input_dir)

		var climbing_hull_ramp := in_open_ocean and is_on_floor() and get_floor_normal().y > 0.45 and global_position.y > -5.5
		if in_open_ocean and not climbing_hull_ramp:
			if velocity.y > 0.05:
				velocity.y -= 14.0 * delta
			else:
				velocity.y = 0.0
				global_position.y = lerpf(global_position.y, sea_y - 0.42, clampf(delta * 9.0, 0.0, 1.0))
		elif not is_on_floor():
			velocity.y -= 18.0 * delta
		else:
			velocity.y = -0.5

		var speed_mult := 1.0
		if is_defeated:
			speed_mult = 0.0
		elif is_prone:
			speed_mult = 0.38
		elif in_water:
			speed_mult = 0.72
		elif in_shallow_water:
			speed_mult = 0.78
		elif is_stealth:
			speed_mult = 0.62
		elif is_sprinting:
			speed_mult = 1.55

		var dir := Vector3(input_dir.x, 0, input_dir.y)
		var cam := get_viewport().get_camera_3d()
		if cam and cam.has_method("screen_vector_to_world") and input_dir.length_squared() > 0.001:
			dir = cam.screen_vector_to_world(input_dir)
		velocity.x = dir.x * move_speed * speed_mult
		velocity.z = dir.z * move_speed * speed_mult
		var combat=get_meta("combat_controller") if has_meta("combat_controller") else null
		var before:=global_position
		if combat and not combat.can_move(self): velocity.x=0; velocity.z=0

		# Freno hidrodinámico: bajo el agua la velocidad de caída vertical está amortiguada
		if in_water or in_open_ocean:
			velocity.y = maxf(velocity.y, -3.2)

		move_and_slide()
		if combat: combat.moved(self,before)

		# ----------------------------------------------------------------------
		# SALVA-VACÍO ABSOLUTO: NUNCA CAER AL VACÍO
		# ----------------------------------------------------------------------
		# 1. Contención perimetral de mapa
		global_position.x = clampf(global_position.x, -46.0, 46.0)
		global_position.z = clampf(global_position.z, -34.0, 34.0)

		# 2. Suelo físico mínimo (fondo marino / quilla / tarima C9)
		var reef_node = vessel.find_child("ReefBuilder", true, false) if vessel else null
		var seabed_h: float = -8.2
		if reef_node and reef_node.has_method("_seabed_height"):
			seabed_h = reef_node._seabed_height(global_position.x, global_position.z)
		var floor_limit: float = maxf(seabed_h + 0.05, -8.35)

		# En la bodega sumergida C9, la tarima sólida está a -6.40m
		if inside_hull and local_pos.y < -4.0 and local_pos.x > WreckStructure.STERN_X + 0.15:
			floor_limit = maxf(floor_limit, -6.40)

		if global_position.y <= floor_limit:
			global_position.y = floor_limit
			velocity.y = maxf(0.0, velocity.y)

		# 3. Rescate de emergencia instantáneo ante cualquier anomalía física
		if global_position.y < -8.4:
			global_position.y = -6.35 if inside_hull else (sea_y - 0.42)
			velocity = Vector3.ZERO
	else:
		velocity = Vector3.ZERO
		input_dir = Vector2.ZERO

	# Animación ambiental autónoma de PNJs (Arpía en C10, Zombi en C8)
	if is_npc and not is_defeated and str(get_meta("npc_condition_pose", "")).is_empty():
		_process_npc_ambience(delta)

	# Determinar estado canónico de animación (prioridad Babylon)
	var desired_state := _resolve_desired_state(input_dir)
	if action_lock_timer > 0.0:
		action_lock_timer -= delta
		if action_lock_timer <= 0.0:
			action_anim_name = ""

	if is_jumping:
		jump_timer += delta
		if jump_timer >= jump_duration:
			is_jumping = false
			jump_timer = 0.0

	_process_pose_visuals(delta, input_dir, desired_state)

func _process_pose_visuals(delta: float, input_dir: Vector2, desired_state: String) -> void:
	if desired_state != current_anim or _needs_direction_refresh(desired_state):
		_resolve_and_apply_clip(desired_state, facing_dir, desired_state != current_anim)

	process_frame_animation(delta)
	_apply_procedural_motion(delta, input_dir, desired_state)
	_update_carried_torch_flicker(delta)

func _resolve_desired_state(input_dir: Vector2) -> String:
	var is_moving := input_dir.length_squared() > 0.04
	if is_defeated:
		return "defeated"
	var condition_pose: String = str(get_meta("npc_condition_pose", ""))
	if condition_pose == "condition_derribada" and is_moving: return "crawl"
	if not condition_pose.is_empty(): return condition_pose
	if current_anim.begins_with("condition_"): return "idle"
	if action_lock_timer > 0.0 and action_anim_name != "":
		return action_anim_name
	if is_jumping:
		return "jump"
	if is_prone:
		return "crawl" if is_moving else "prone"
	if is_sitting:
		return "sit"
	if in_water:
		return "swim"
	if is_stealth:
		return "stealth"
	if is_moving:
		if is_torch_lit and not char_profile.get("dir_torch_walk", {}).is_empty():
			return "torch_run" if is_sprinting else "torch_walk"
		return "run" if is_sprinting else "walk"
	if is_npc:
		return "idle" if char_profile.has("npc_species") else current_anim
	if is_torch_lit and not char_profile.get("dir_torch_idle", {}).is_empty():
		return "torch_idle"
	return "combat_idle" if is_in_combat_stance else "idle"

func _needs_direction_refresh(state: String) -> bool:
	return not char_profile.get("dir_states", {}).get(state, {}).is_empty() or state in ["idle", "combat_idle", "walk", "run", "attack", "stealth", "swim", "crawl", "jump", "torch_walk", "torch_run", "torch_idle"]

func enter_boat(boat: Node3D) -> void:
	in_boat = true
	current_boat = boat
	in_water = false
	in_shallow_water = false
	in_open_ocean = false
	is_sitting = true
	is_prone = false
	is_stealth = false
	velocity = Vector3.ZERO
	if collision:
		collision.disabled = true
	_resolve_and_apply_clip("sit", facing_dir, true)

func exit_boat(world_pos: Vector3) -> void:
	in_boat = false
	current_boat = null
	is_sitting = false
	if collision:
		collision.disabled = false
	global_position = world_pos
	velocity = Vector3.ZERO
	_resolve_and_apply_clip("idle", facing_dir, true)

func sync_boat_heading(dir_xz: Vector2) -> void:
	if dir_xz.length_squared() > 0.01:
		facing_dir = _dir_from_vector(Vector2(dir_xz.x, dir_xz.y))

func _process_npc_ambience(delta: float) -> void:
	# Authored NPCs retain their heading; ambient timers cannot trigger flight.
	if char_profile.has("npc_species"): return
	npc_ai_timer += delta
	if char_key == "harpy":
		var cycle := fmod(npc_ai_timer, 7.5)
		var next_s := "idle" if cycle < 4.2 else "run" # "run" en arpía = harpia_volar
		if action_lock_timer <= 0.0 and current_anim != next_s:
			_resolve_and_apply_clip(next_s, facing_dir, true)
	elif char_key.begins_with("zombie"):
		var cycle := fmod(npc_ai_timer, 8.0)
		var next_s := "idle" if cycle < 5.0 else "combat_idle"
		if action_lock_timer <= 0.0 and current_anim != next_s:
			_resolve_and_apply_clip(next_s, facing_dir, true)

func _resolve_and_apply_clip(state: String, dir: String, reset_idx: bool) -> void:
	var previous_phase := (float(anim_frame_idx) + anim_timer * active_clip_fps) / maxf(1.0, active_clip_frames.size())
	var locomotion := ["walk", "run", "torch_walk", "torch_run"]
	var preserve_stride := current_anim in locomotion and state in locomotion and not active_clip_frames.is_empty()
	var view_dir: String = preload("res://sprites/sprite_facing.gd").view_direction(self,dir)
	var clip := _pick_clip_from_profile(state, view_dir)
	var preserve_registered_idle: bool = state != current_anim and current_anim in ["idle", "combat_idle", "ready"] and state in ["idle", "combat_idle", "ready"] and str(clip.get("modular_definition", "")).begins_with("sw-") and not active_clip_frames.is_empty() and not clip.get("frames", []).is_empty() and active_clip_frames[0].get("tex") == clip.frames[0].get("tex")
	current_anim = state
	if clip.is_empty():
		return
	active_clip_frames = clip.get("frames", [])
	active_clip_fps = float(clip.get("fps", 4.0))
	active_clip_loop = bool(clip.get("loop", true))
	active_clip_flip_h = bool(clip.get("flip_h", false))
	active_clip_drawn_motion = bool(clip.get("drawn_motion", false)) or (state in ["walk", "run"] and active_clip_frames.size() >= 8)

	# Algunas acciones de proyectil hacia el oeste invierten la orientación
	if (state == "attack_arrow" or state == "attack_throw") and (view_dir == "w" or view_dir == "nw" or view_dir == "sw"):
		active_clip_flip_h = true

	if (preserve_stride or preserve_registered_idle) and not active_clip_frames.is_empty():
		var progress := fmod(previous_phase, 1.0) * active_clip_frames.size()
		anim_frame_idx = int(progress)
		anim_timer = (progress - anim_frame_idx) / maxf(1.0, active_clip_fps)
	elif reset_idx:
		anim_frame_idx = 0
		anim_timer = 0.0
	elif active_clip_frames.size() > 0:
		anim_frame_idx = anim_frame_idx % active_clip_frames.size()
	update_sprite_frame()

func _pick_clip_from_profile(state: String, dir: String) -> Dictionary:
	var modular_visual=get_node_or_null("CharacterVisual")
	if modular_visual: state=modular_visual.animation_for(state)
	var authored: Dictionary = char_profile.get("dir_states", {}).get(state, {})
	if authored.has(dir): return authored[dir]
	if state in ["torch_walk", "torch_run", "torch_idle"]:
		var directions: Dictionary = char_profile.get("dir_torch_idle" if state == "torch_idle" else "dir_torch_walk", {})
		if directions.has(dir):
			var torch_clip: Dictionary = directions[dir].duplicate()
			if state == "torch_run":
				torch_clip["fps"] = 18.0
			return torch_clip
	var clips: Dictionary = char_profile.get("clips", {})
	var d_walk: Dictionary = char_profile.get("dir_walk", {})
	var d_run: Dictionary = char_profile.get("dir_run", {})
	var d_idle: Dictionary = char_profile.get("dir_idle", {})
	var d_atk: Dictionary = char_profile.get("dir_attack", {})

	match state:
		"walk":
			if d_walk.has(dir): return d_walk[dir]
			if clips.has("walk"): return clips["walk"]
		"run":
			if d_run.has(dir): return d_run[dir]
			if clips.has("run"): return clips["run"]
			if d_walk.has(dir): return d_walk[dir]
		"attack":
			if d_atk.has(dir): return d_atk[dir]
			if clips.has("attack"): return clips["attack"]
		"climb":
			if clips.has("climb"): return clips["climb"]
			if d_idle.has("n"): return d_idle["n"]
		"interact", "spell", "stealth", "dodge", "swim", "jump", "hit", "prone", "crawl", "defeated", "sit", "attack_arrow", "attack_throw", "combat_idle":
			if clips.has(state): return clips[state]
			if d_idle.has(dir): return d_idle[dir]
		"idle":
			if d_idle.has(dir): return d_idle[dir]
			if clips.has("idle"): return clips["idle"]

	if clips.has(state):
		return clips[state]
	if d_idle.has(dir):
		return d_idle[dir]
	if clips.has("idle"):
		return clips["idle"]
	if d_idle.has("s"):
		return d_idle["s"]
	return {}

func process_frame_animation(delta: float) -> void:
	if active_clip_frames.size() <= 1:
		return
	var frame_dur := 1.0 / maxf(1.0, active_clip_fps)
	anim_timer += delta
	while anim_timer >= frame_dur:
		anim_timer -= frame_dur
		if anim_frame_idx + 1 < active_clip_frames.size():
			anim_frame_idx += 1
		elif active_clip_loop:
			anim_frame_idx = 0
		update_sprite_frame()

func update_sprite_frame() -> void:
	if not sprite or active_clip_frames.size() == 0:
		return
	var idx := clampi(anim_frame_idx, 0, active_clip_frames.size() - 1)
	var fdata: Dictionary = active_clip_frames[idx]
	var tex := fdata.get("tex", null) as Texture2D
	if not tex:
		return
	current_height_scale = float(fdata.get("height_scale", 1.0))
	current_floor_offset = float(fdata.get("floor_offset", 0.0))
	set_meta("sprite_silhouette_size",fdata.get("silhouette_size",Vector2(.65,1)))
	sprite.texture = tex
	sprite.flip_h = active_clip_flip_h or bool(fdata.get("flip_h", false))
	_update_sprite_scale_from_tex(tex, current_height_scale)

func _update_sprite_scale_from_tex(tex: Texture2D, h_scale: float) -> void:
	if not sprite or not tex:
		return
	var th := float(tex.get_height())
	if th > 0.0:
		sprite.pixel_size = (target_height * h_scale) / th

func _apply_procedural_motion(delta: float, input_dir: Vector2, state: String) -> void:
	if not sprite:
		return
	var base_y := (target_height * current_height_scale) * 0.5
	var jump_y := 0.0
	var bob_y := 0.0
	var rot_z := 0.0
	var sx := 1.0
	var sy := 1.0
	var mod := Color.WHITE

	var dir_sign := 1.0 if facing_dir in ["e", "ne", "se"] else (-1.0 if facing_dir in ["w", "nw", "sw"] else 0.0)
	var is_directional_sprite_cycle := state.begins_with("torch_") or state.begins_with("backpack_") or (char_key == "rogue" and state in ["walk", "run", "attack", "stealth", "swim", "climb", "jump", "interact"])

	# Respiración sutil en reposo y pose sentada para todos los personajes
	if state == "idle" or state == "combat_idle" or state == "sit":
		var breath := sin(idle_breath_time * (3.4 if state == "combat_idle" else 2.2))
		sy = 1.0 + breath * 0.015
		sx = 1.0 - breath * 0.008
		if is_npc and char_key == "harpy":
			bob_y += absf(breath) * 0.03
		elif is_npc and char_key == "zombie":
			rot_z += breath * 0.035

	# Locomoción expresiva (ciclo nativo para Maria; paso ágil + inclinación para Mia Clériga, Mike Mago y Arpía)
	if state == "walk" or state == "run":
		var speed_hz := 14.0 if state == "run" else 10.5
		walk_cycle += delta * speed_hz
		if not is_directional_sprite_cycle:
			bob_y = absf(sin(walk_cycle)) * (0.11 if state == "run" else 0.07)
			rot_z = sin(walk_cycle) * (0.08 if state == "run" else 0.045) - dir_sign * (0.07 if state == "run" else 0.03)
			sy = 1.0 + cos(walk_cycle * 2.0) * 0.025
		else:
			bob_y = absf(sin(walk_cycle * 0.5)) * 0.02
	elif state == "stealth":
		if char_key != "rogue":
			sy = 0.85
			sx = 1.06
			base_y *= 0.85
		if input_dir.length_squared() > 0.04:
			walk_cycle += delta * 7.5
			bob_y = absf(sin(walk_cycle)) * 0.03
			rot_z = sin(walk_cycle) * 0.035
		mod = Color(0.76, 0.80, 0.90, 0.92)
	elif state == "climb":
		walk_cycle += delta * 9.5
		bob_y = sin(walk_cycle) * 0.08
		rot_z = cos(walk_cycle) * 0.09
	elif state == "swim":
		walk_cycle += delta * 6.5
		bob_y = sin(walk_cycle) * 0.07 - 0.14
		rot_z = cos(walk_cycle * 0.7) * 0.12
		mod = Color(0.80, 0.95, 1.0, 0.96)
	elif state == "interact":
		var p := clampf(1.0 - (action_lock_timer / 0.62), 0.0, 1.0)
		var reach := sin(p * PI)
		if char_key != "rogue":
			rot_z = -dir_sign * reach * 0.11
			bob_y = reach * 0.05
			sx = 1.0 + reach * 0.04
	elif state == "attack" or state == "attack_arrow" or state == "attack_throw" or state == "spell":
		var p := clampf(1.0 - (action_lock_timer / 0.62), 0.0, 1.0)
		var lunge := sin(p * PI)
		if state == "spell":
			bob_y = lunge * 0.12
			sy = 1.0 + lunge * 0.08
			mod = Color(1.32, 1.24, 0.92) if char_key == "cleric" else Color(0.82, 1.18, 1.48)
		elif char_key != "rogue":
			rot_z = -dir_sign * lunge * 0.18
			bob_y = lunge * 0.08
			sx = 1.0 + lunge * 0.06
	elif state == "hit":
		var flash := hit_flash_timer / 0.35
		mod = Color(1.45, 0.62, 0.62) if flash > 0.0 else Color.WHITE
		rot_z = dir_sign * 0.18 * flash
		bob_y = 0.06 * flash
	elif (state == "prone" or state == "crawl" or state == "defeated") and char_key != "rogue":
		var drawn_lying: bool=sprite.texture!=null and sprite.texture.get_width()>sprite.texture.get_height()*1.2
		rot_z = 0.0 if drawn_lying else deg_to_rad(-74.0)
		base_y = maxf(.18,target_height*current_height_scale*.5) if drawn_lying else .46
		if state == "crawl":
			walk_cycle += delta * 8.0
			bob_y = absf(sin(walk_cycle)) * 0.04
	else:
		walk_cycle = 0.0

	if is_jumping:
		var t := clampf(jump_timer / jump_duration, 0.0, 1.0)
		jump_y = sin(t * PI) * jump_peak_height
		if char_key != "rogue":
			sy = 1.0 + sin(t * PI) * 0.10
			sx = 1.0 - sin(t * PI) * 0.05

	# Authored poses already contain limb movement and posture. Preserve their
	# proportions instead of bending/flattening the entire drawing a second time.
	if active_clip_drawn_motion:
		rot_z = 0.0
		sx = 1.0
		sy = 1.0
		bob_y = 0.0
		base_y = target_height * current_height_scale * (0.5 + current_floor_offset)

	if in_water and state != "swim":
		mod = mod * Color(0.84, 0.95, 1.0)

	sprite.position.y = base_y + jump_y + bob_y
	sprite.rotation.z = rot_z
	sprite.scale = Vector3(sx, sy, 1.0)
	if has_meta("npc_condition_color"): mod = mod * get_meta("npc_condition_color")
	sprite.modulate = mod

	# Ajustar sombra de contacto al salto, postura sentado o cuerpo a tierra
	if contact_shadow:
		var alt_factor := clampf(1.0 - (jump_y / (jump_peak_height * 1.45)), 0.35, 1.0)
		var state_shadow := 0.85 if state == "sit" else (1.25 if state in ["prone", "crawl", "defeated"] else 1.0)
		contact_shadow.scale = Vector3(alt_factor * state_shadow, 1.0, alt_factor * state_shadow)
	if selection_ring:
		var m := selection_ring.material_override as StandardMaterial3D
		if m:
			m.albedo_color.a = 0.38 if is_stealth else ring_color.a

func _trigger_action_vfx(mode_name: String) -> void:
	vfx_mode = mode_name
	vfx_timer = vfx_duration
	if action_vfx_sprite:
		action_vfx_sprite.visible = true
		var sneak_frames: Array = char_profile.get("sneak_fx", [])
		if mode_name == "attack" and char_key == "rogue" and sneak_frames.size() > 0:
			var first: Dictionary = sneak_frames[0]
			action_vfx_sprite.texture = first["tex"]
			action_vfx_sprite.pixel_size = 1.65 / float(first["tex"].get_height())
			action_vfx_sprite.modulate = Color(1.0, 0.95, 0.85, 0.95)
		else:
			action_vfx_sprite.texture = _get_generated_fx_tex(mode_name)
			action_vfx_sprite.pixel_size = 1.60 / 128.0
			if mode_name == "spell":
				action_vfx_sprite.modulate = Color("#ffd97a") if char_key == "cleric" else Color("#7cdbff")
			else:
				action_vfx_sprite.modulate = Color("#f6ebd0")
		var d_x := 0.55 if facing_dir in ["e", "ne", "se"] else (-0.55 if facing_dir in ["w", "nw", "sw"] else 0.0)
		action_vfx_sprite.position = Vector3(d_x, target_height * 0.52, 0.12)

func _update_action_vfx(delta: float) -> void:
	if not action_vfx_sprite or vfx_timer <= 0.0:
		if action_vfx_sprite and action_vfx_sprite.visible:
			action_vfx_sprite.visible = false
		return
	vfx_timer -= delta
	var progress := clampf(1.0 - (vfx_timer / vfx_duration), 0.0, 1.0)
	var sneak_frames: Array = char_profile.get("sneak_fx", [])
	if vfx_mode == "attack" and char_key == "rogue" and sneak_frames.size() >= 2 and progress > 0.5:
		var second: Dictionary = sneak_frames[1]
		action_vfx_sprite.texture = second["tex"]
	action_vfx_sprite.modulate.a = 1.0 - progress
	var sc := 0.78 + progress * 0.52
	action_vfx_sprite.scale = Vector3(sc, sc, 1.0)

static var _shared_slash_tex: Texture2D
static var _shared_spell_tex: Texture2D

func _get_generated_fx_tex(mode_name: String) -> Texture2D:
	if mode_name == "spell":
		if not _shared_spell_tex:
			var grad := Gradient.new()
			grad.set_color(0, Color(1.0, 1.0, 1.0, 0.92))
			grad.set_color(0.45, Color(0.85, 0.95, 1.0, 0.45))
			grad.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
			var gt := GradientTexture2D.new()
			gt.gradient = grad; gt.fill = GradientTexture2D.FILL_RADIAL
			gt.fill_from = Vector2(0.5, 0.5); gt.fill_to = Vector2(1.0, 0.5)
			gt.width = 128; gt.height = 128
			_shared_spell_tex = gt
		return _shared_spell_tex
	if not _shared_slash_tex:
		var img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
		for y in range(128):
			for x in range(128):
				var fx := (float(x) - 64.0) / 54.0
				var fy := (float(y) - 64.0) / 54.0
				var r := sqrt(fx * fx + fy * fy)
				var ang := atan2(fy, fx)
				var crescent := clampf(1.0 - absf(r - 0.72) * 8.0, 0.0, 1.0) * clampf(1.0 - absf(ang + 0.3) * 0.95, 0.0, 1.0)
				if crescent > 0.02:
					img.set_pixel(x, y, Color(1.0, 0.96, 0.85, crescent))
		_shared_slash_tex = ImageTexture.create_from_image(img)
	return _shared_slash_tex

func build_action_vfx() -> void:
	action_vfx_sprite = Sprite3D.new()
	action_vfx_sprite.name = "ActionVfxSprite"
	action_vfx_sprite.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	action_vfx_sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	action_vfx_sprite.render_priority = 12
	action_vfx_sprite.visible = false
	add_child(action_vfx_sprite)

func _update_carried_torch_flicker(delta: float) -> void:
	if carried_light and is_torch_lit:
		flicker_time += delta
		var base_e := 2.6 if is_active_player else 1.4
		var flicker := sin(flicker_time * 4.5) * 0.08 + cos(flicker_time * 7.2) * 0.04
		carried_light.light_energy = base_e + flicker

func _sync_torch_sparks() -> void:
	var drawn_in_sprite: bool = not char_profile.get("dir_torch_walk", {}).is_empty()
	if torch_prop:
		torch_prop.visible = is_torch_lit and not drawn_in_sprite
	if torch_flame_mesh:
		var fl_scale := 1.15 if is_torch_lit else 0.72
		torch_flame_mesh.scale = Vector3(fl_scale, fl_scale, fl_scale)
	if not torch_sparks:
		return
	torch_sparks.visible = is_torch_lit and not drawn_in_sprite
	torch_sparks.amount_ratio = 1.0 if is_torch_lit else 0.35
	var pm := torch_sparks.process_material as ParticleProcessMaterial
	if pm:
		pm.initial_velocity_max = 1.45 if is_torch_lit else 0.55
		pm.scale_max = 0.20 if is_torch_lit else 0.12
		pm.color = Color(1.0, 0.72, 0.28, 0.95) if is_torch_lit else Color(1.0, 0.85, 0.50, 0.72)

func build_contact_shadow() -> void:
	contact_shadow = MeshInstance3D.new()
	contact_shadow.name = "ContactShadow"
	contact_shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var plane := PlaneMesh.new()
	plane.size = Vector2(1.1, 1.1)

	var grad := Gradient.new()
	grad.set_color(0, Color(0.02, 0.04, 0.05, 0.75))
	grad.set_color(1, Color(0.02, 0.04, 0.05, 0.0))

	var circle_tex := GradientTexture2D.new()
	circle_tex.gradient = grad
	circle_tex.fill = GradientTexture2D.FILL_RADIAL
	circle_tex.fill_from = Vector2(0.5, 0.5)
	circle_tex.fill_to = Vector2(1.0, 0.5)
	circle_tex.width = 64
	circle_tex.height = 64

	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_texture = circle_tex
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat.render_priority = 2

	contact_shadow.mesh = plane
	contact_shadow.material_override = mat
	contact_shadow.position = Vector3(0, 0.02, 0)
	add_child(contact_shadow)

func build_selection_ring() -> void:
	selection_ring = MeshInstance3D.new()
	selection_ring.name = "SelectionRing"
	selection_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var torus := TorusMesh.new()
	torus.inner_radius = 0.44
	torus.outer_radius = 0.52
	torus.rings = 32
	torus.ring_segments = 16

	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = ring_color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission = ring_color
	mat.emission_energy_multiplier = 1.6
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mat.render_priority = 3

	selection_ring.mesh = torus
	selection_ring.material_override = mat
	selection_ring.position = Vector3(0, 0.035, 0)
	selection_ring.visible = is_active_player and not is_npc
	add_child(selection_ring)

func build_carried_lantern() -> void:
	carried_light = OmniLight3D.new()
	carried_light.name = "CarriedLantern"
	carried_light.position = Vector3(0.28, 1.08, 0.16)
	carried_light.light_color = Color("#ff9a35")
	carried_light.light_energy = 0.0
	carried_light.omni_range = 20.0
	carried_light.omni_attenuation = 1.1
	carried_light.shadow_enabled = false
	carried_light.visible = false
	add_child(carried_light)

	# Antorcha física de madera, cesta de hierro y llama viva en mano del personaje
	torch_prop = Node3D.new()
	torch_prop.name = "CarriedTorchProp"
	torch_prop.position = Vector3(0.0, -0.14, 0.0)
	carried_light.add_child(torch_prop)

	var handle := MeshInstance3D.new()
	var h_cyl := CylinderMesh.new()
	h_cyl.top_radius = 0.026
	h_cyl.bottom_radius = 0.018
	h_cyl.height = 0.34
	handle.mesh = h_cyl
	handle.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_h := StandardMaterial3D.new()
	mat_h.albedo_color = Color("#4a2d18")
	mat_h.roughness = 0.88
	handle.material_override = mat_h
	handle.position = Vector3(0.0, -0.06, 0.0)
	handle.rotation_degrees = Vector3(0, 0, -14.0)
	torch_prop.add_child(handle)

	var basket := MeshInstance3D.new()
	var b_cyl := CylinderMesh.new()
	b_cyl.top_radius = 0.055
	b_cyl.bottom_radius = 0.028
	b_cyl.height = 0.08
	basket.mesh = b_cyl
	basket.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_b := StandardMaterial3D.new()
	mat_b.albedo_color = Color("#202226")
	mat_b.metallic = 0.75
	mat_b.roughness = 0.45
	basket.material_override = mat_b
	basket.position = Vector3(0.04, 0.11, 0.0)
	torch_prop.add_child(basket)

	torch_flame_mesh = MeshInstance3D.new()
	var f_cone := CylinderMesh.new()
	f_cone.top_radius = 0.008
	f_cone.bottom_radius = 0.048
	f_cone.height = 0.14
	torch_flame_mesh.mesh = f_cone
	torch_flame_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat_f := StandardMaterial3D.new()
	mat_f.albedo_color = Color("#fff4c4")
	mat_f.emission_enabled = true
	mat_f.emission = Color("#ffa630")
	mat_f.emission_energy_multiplier = 3.2
	torch_flame_mesh.material_override = mat_f
	torch_flame_mesh.position = Vector3(0.04, 0.18, 0.0)
	torch_prop.add_child(torch_flame_mesh)

	torch_sparks = GPUParticles3D.new()
	torch_sparks.name = "TorchSparks"
	torch_sparks.amount = 22
	torch_sparks.lifetime = 0.85
	torch_sparks.preprocess = 1.0
	torch_sparks.randomness = 0.6
	torch_sparks.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	pm.emission_sphere_radius = 0.09
	pm.direction = Vector3(0.0, 1.0, 0.0)
	pm.spread = 28.0
	pm.initial_velocity_min = 0.25
	pm.initial_velocity_max = 0.45
	pm.gravity = Vector3(0.0, 0.65, 0.0)
	pm.scale_min = 0.05
	pm.scale_max = 0.10
	pm.color = Color(1.0, 0.85, 0.50, 0.55)
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.45
	torch_sparks.process_material = pm

	var grad := Gradient.new()
	grad.set_color(0, Color(1.0, 0.92, 0.65, 0.95))
	grad.set_color(1, Color(1.0, 0.45, 0.10, 0.0))
	var spark_tex := GradientTexture2D.new()
	spark_tex.gradient = grad
	spark_tex.fill = GradientTexture2D.FILL_RADIAL
	spark_tex.fill_from = Vector2(0.5, 0.5)
	spark_tex.fill_to = Vector2(1.0, 0.5)
	spark_tex.width = 32
	spark_tex.height = 32

	var mat_sp := StandardMaterial3D.new()
	mat_sp.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_sp.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat_sp.albedo_texture = spark_tex
	mat_sp.vertex_color_use_as_albedo = true
	mat_sp.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_sp.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat_sp.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED

	var q := QuadMesh.new()
	q.size = Vector2(0.18, 0.18)
	q.material = mat_sp
	torch_sparks.draw_pass_1 = q
	carried_light.add_child(torch_sparks)
	_sync_torch_sparks()

func _camera_allows_keyboard() -> bool:
	if bool(get_meta("combat_text_input",false)): return false
	if (bool(get_meta("inventory_modal_open", false)) or bool(get_meta("player_settings_modal", false))):
		return false
	var active_camera := get_viewport().get_camera_3d()
	if active_camera and active_camera.has_method("accepts_token_input"):
		return active_camera.accepts_token_input(self)
	return is_active_player

func set_equipment_appearance(portrait_texture: Texture2D, animation_profile: Dictionary) -> bool:
	if portrait_texture == null or animation_profile.get("dir_idle", {}).is_empty():
		return false
	char_profile = animation_profile
	set_meta("appearance_portrait", portrait_texture)
	_resolve_and_apply_clip("idle", facing_dir, true)
	_sync_torch_sparks()
	return true
