class_name PlayerToken
extends CharacterBody3D

# ==============================================================================
# TOKEN 2.5D CANONICO DE PERSONAJE - EL RETIRO DEL DRAGON
# ==============================================================================

const Structure = preload("res://scripts/retreat_structure.gd")
const Catalog = preload("res://scripts/character_sprite_catalog.gd")
const Registry = preload("res://characters/registry.gd")
const SeatSurface = preload("res://scripts/seated_character_surface.gd")
const RestSurface = preload("res://scripts/resting_character_surface.gd")

@export var token_name: String = "Mia"
@export var token_texture: Texture2D
@export var target_height: float = 1.95
@export var speed: float = 6.0
@export var camera: Camera3D
@export var is_active_player: bool = false
@export var is_npc: bool = false
@export var has_carried_light: bool = true
@export var ring_color: Color = Color(0.95, 0.78, 0.32, 0.88)

@export var hframes: int = 1
@export var vframes: int = 1
@export var default_frame: int = 0

@onready var sprite: Sprite3D = get_node_or_null("Sprite3D") as Sprite3D
@onready var collision: CollisionShape3D = get_node_or_null("CollisionShape3D") as CollisionShape3D

signal zone_changed(new_zone: Dictionary)
signal rest_released(bed_id: String)
signal seat_released(seat_id: String)

var carried_light: OmniLight3D
var torch_sparks: GPUParticles3D
var contact_shadow: MeshInstance3D
var selection_ring: MeshInstance3D
var action_vfx_sprite: Sprite3D
var _seat_surface: MeshInstance3D
var _seat_heading := Vector3.ZERO
var _seat_feet := Vector3.ZERO
var resting_on := ""
var seated_on := ""
var _rest_bed: Dictionary = {}
var _rest_surface: MeshInstance3D
var _action_is_gentle_pray: bool = false

var char_key: String = "cleric"
var char_profile: Dictionary = {}
var anim_clips: Dictionary = {}

# Estado de zona y locomocion
var current_zone: Dictionary = {}
var current_elevation: float = 0.25
var input_override: Vector2 = Vector2.ZERO
var is_transitioning: bool = false

# Estado de animacion y clips 8-dir
var _pose_world_heading := Vector3.ZERO
var facing_dir: String = "s":
	set(value):
		facing_dir = value
		_pose_world_heading = Vector3.ZERO
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

# Estados jugables
var is_sprinting: bool = false
var is_stealth: bool = false
var is_sitting: bool = false
var is_prone: bool = false
var is_defeated: bool = false
var is_in_combat_stance: bool = false
var in_water: bool = false

# Salto parabolico y micro-animaciones procedurales
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

# Antorcha viva
var is_torch_lit: bool = false
var flicker_time: float = 0.0

# Silueta rayo-X cuando la ficha queda detrás de roca/muros
var silhouette_mesh: MeshInstance3D
var _silhouette_mat: ShaderMaterial
static var _silhouette_shader_res: Shader

static var _shared_slash_tex: Texture2D
static var _shared_spell_tex: Texture2D

func _ready() -> void:
	floor_max_angle = deg_to_rad(68.0)
	floor_snap_length = 0.65
	add_to_group("party_tokens")
	safe_margin = 0.04
	floor_constant_speed = true
	floor_stop_on_slope = true

	# Mantener el transform de la escena; solo usar spawn canonico si no hay posicion asignada
	if global_position.is_equal_approx(Vector3.ZERO):
		global_position = Structure.LANDMARKS["spawn"]["world_pos"]

	var resolve_src: String = token_name if not token_name.is_empty() else String(name)
	_load_character_profile(resolve_src)

	setup_sprite_visuals()
	build_contact_shadow()
	build_selection_ring()
	build_action_vfx()
	if has_carried_light and not is_npc:
		build_carried_lantern()

	set_active(is_active_player)
	_resolve_and_apply_clip("idle", "s", true)

	current_zone = Structure.get_zone_at(global_position)
	current_elevation = global_position.y

func _load_character_profile(resolve_src: String) -> void:
	char_key = Catalog.resolve_character_key(resolve_src)
	preload("res://sprites/character_stature.gd").apply(self,char_key)
	anim_clips = Catalog.get_character_clips(char_key)
	char_profile = anim_clips
	var reg_def: Dictionary = Registry.character(resolve_src)
	if reg_def.is_empty():
		var alias_key := "mia" if char_key == "cleric" else ("mike" if char_key == "wizard" else ("maria" if char_key == "rogue" else char_key))
		reg_def = Registry.character(alias_key)
	if not reg_def.is_empty() and not Registry.data().get("animations", {}).is_empty():
		char_profile = Registry.with_animations(char_profile.duplicate(true), reg_def)
		anim_clips = char_profile

func setup_sprite_visuals() -> void:
	if sprite:
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
			_update_sprite_scale_from_tex(token_texture, 1.0)
	_setup_occlusion_silhouette()

	if collision:
		# An instanced PackedScene shares subresources unless explicitly isolated.
		# Stature belongs to this miniature, never to the next actor loaded.
		if collision.shape: collision.shape=collision.shape.duplicate()
		if collision.shape is CapsuleShape3D:
			var cap := collision.shape as CapsuleShape3D
			cap.height = target_height * 0.95
			cap.radius = 0.36
			collision.position.y = cap.height * 0.5
		elif collision.shape is CylinderShape3D:
			var cyl := collision.shape as CylinderShape3D
			cyl.height = target_height * 0.95
			cyl.radius = 0.40
			collision.position.y = target_height * 0.5

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
	_action_is_gentle_pray = false
	if norm in ["stoke_fire", "open_chest", "gather", "crouch_work", "firewood"]:
		norm = "crouch_work"
	elif norm in ["use_torch", "talk", "search", "study", "open_door", "use_well", "pull_lever", "water_plants", "read", "examine", "cook", "winch"]:
		norm = "interact"
	elif norm in ["pray", "shrine", "warm_hands", "meditate_gesture"]:
		norm = "pray"
		_action_is_gentle_pray = true
	elif norm == "attack-arrow":
		norm = "attack_arrow"
	elif norm == "attack-throw":
		norm = "attack_throw"
	elif norm in ["combat-idle", "ready"]:
		norm = "combat_idle"

	match norm:
		"sit":
			if not resting_on.is_empty():
				_release_prop_pose()
			is_sitting = true
			is_prone = false
			action_lock_timer = 0.0
			var sit_state := "sit_on_prop" if (get_meta("prop_pose", "") == "sit_on_prop" and not char_profile.get("dir_states", {}).get("sit_on_prop", {}).is_empty()) else "sit"
			_resolve_and_apply_clip(sit_state, facing_dir, true)
			return
		"prone":
			is_prone = true
			is_sitting = false
			_release_prop_pose()
			action_lock_timer = 0.0
			_resolve_and_apply_clip("prone", facing_dir, true)
			return
		"defeated":
			is_defeated = true
			is_sitting = false
			_release_prop_pose()
			action_lock_timer = 0.0
			_resolve_and_apply_clip("defeated", facing_dir, true)
			return
		"idle":
			action_lock_timer = 0.0
			action_anim_name = ""
			is_sitting = false
			_release_prop_pose()
			is_prone = false
			is_defeated = false
			_resolve_and_apply_clip("idle", facing_dir, true)
			return
		"jump":
			_start_jump()
			return

	is_sitting = false
	_release_prop_pose()
	action_anim_name = norm
	action_lock_timer = duration
	anim_frame_idx = 0
	anim_timer = 0.0
	_resolve_and_apply_clip(norm, facing_dir, true)
	if not active_clip_loop and active_clip_frames.size() > 1:
		action_lock_timer = maxf(action_lock_timer, active_clip_frames.size() / maxf(1.0, active_clip_fps))

	if norm in ["attack", "attack_arrow", "attack_throw", "spell"]:
		_trigger_action_vfx(norm)
	elif norm == "hit":
		hit_flash_timer = 0.35

func set_stance(stance: String) -> void:
	if not resting_on.is_empty():
		_release_prop_pose()
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
	if not is_sitting:
		_release_prop_pose()

func is_resting_on_prop() -> bool:
	return not resting_on.is_empty() or (is_sitting and has_meta("prop_seat_pos")) or bool(get_meta("resting_on_prop", false))

func _release_prop_pose() -> void:
	var had_seat := has_meta("prop_seat_pos")
	var had_legacy := has_meta("resting_on_prop")
	if not had_seat and not had_legacy and resting_on.is_empty() and seated_on.is_empty():
		return
	var fallback_y := global_position.y
	var back_pos: Vector3 = get_meta("pre_interact_pos", get_meta("pre_rest_pos", Vector3(global_position.x, fallback_y, global_position.z)))
	if has_meta("prop_seat_pos"):
		remove_meta("prop_seat_pos")
	if has_meta("prop_pose"):
		remove_meta("prop_pose")
	if has_meta("resting_on_prop"):
		remove_meta("resting_on_prop")
	if has_meta("pre_rest_pos"):
		remove_meta("pre_rest_pos")
	if has_meta("hammock_sway"):
		remove_meta("hammock_sway")
	_seat_heading = Vector3.ZERO
	_seat_feet = Vector3.ZERO
	_pose_world_heading = Vector3.ZERO
	_clear_seat_surface()
	var bed_id := resting_on
	var seat_id := seated_on
	resting_on = ""
	seated_on = ""
	_rest_bed = {}
	if is_instance_valid(_rest_surface):
		_rest_surface.hide()
		if sprite:
			sprite.show()
	if has_meta("pre_interact_pos"):
		remove_meta("pre_interact_pos")
	global_position = back_pos
	if not bed_id.is_empty():
		rest_released.emit(bed_id)
	if not seat_id.is_empty():
		seat_released.emit(seat_id)

func stand_from_bed() -> void:
	if not resting_on.is_empty() or is_sitting or not seated_on.is_empty() or has_meta("prop_seat_pos") or has_meta("resting_on_prop"):
		is_sitting = false
		is_prone = false
		_release_prop_pose()
		_resolve_and_apply_clip("idle", facing_dir, true)

func stand_from_seat() -> void:
	stand_from_bed()

func rest_footprint() -> Vector2:
	var clip: Dictionary = char_profile.get("clips", {}).get("rest_on_prop", {})
	if clip.is_empty() or clip.get("frames", []).is_empty():
		return Vector2(0.70, 1.65)
	var pose: Dictionary = clip.frames[0]
	var height := target_height * float(pose.height_scale)
	var texture: Texture2D = pose.tex
	if texture == null or texture.get_height() <= 0:
		return Vector2(0.70, 1.65)
	return Vector2(height * float(texture.get_width()) / float(texture.get_height()),
		height * (1.0 - float(pose.visual_pivot.y)))

func attach_to_bed(bed_id: String, bed: Dictionary) -> void:
	_release_prop_pose()
	is_sitting = false
	is_stealth = false
	is_prone = false
	action_lock_timer = 0.0
	action_anim_name = ""
	resting_on = bed_id
	_rest_bed = bed
	set_meta("pre_interact_pos", global_position)
	set_meta("resting_on_prop", true)
	var head: Vector3 = bed.head
	var forward: Vector3 = bed.forward
	global_position = head + forward * (rest_footprint().y * 0.5)
	set_meta("prop_seat_pos", global_position)
	set_meta("prop_pose", "rest_on_prop")
	face_world_direction(forward)
	_resolve_and_apply_clip("rest_on_prop", facing_dir, true)
	_update_rest_surface("rest_on_prop")
	_sync_occlusion_silhouette(0.0)

func attach_to_seat(slot: Vector3, heading: Vector3, feet: Vector3, seat_id: String = "") -> void:
	_release_prop_pose()
	is_sitting = true
	is_prone = false
	is_stealth = false
	action_lock_timer = 0.0
	action_anim_name = ""
	seated_on = seat_id
	set_meta("pre_interact_pos", global_position)
	set_meta("resting_on_prop", true)
	global_position = slot
	set_meta("prop_seat_pos", slot)
	set_meta("prop_pose", "sit_on_prop")
	var clean_heading := heading
	clean_heading.y = 0.0
	if clean_heading.length_squared() < 0.0001:
		clean_heading = Vector3.BACK
	else:
		clean_heading = clean_heading.normalized()
	face_world_direction(clean_heading)
	_seat_heading = clean_heading
	_seat_feet = feet
	# A high seat lets the feet hang instead of stretching a short character.
	_seat_feet.y = maxf(feet.y, slot.y - target_height * 0.30)
	var sit_state := "sit_on_prop" if not char_profile.get("dir_states", {}).get("sit_on_prop", {}).is_empty() else "sit"
	_resolve_and_apply_clip(sit_state, facing_dir, true)
	_update_seat_surface(sit_state)
	_sync_occlusion_silhouette(0.0)

func _start_jump() -> void:
	if is_jumping or is_defeated:
		return
	is_sitting = false
	_release_prop_pose()
	is_prone = false
	is_jumping = true
	jump_timer = 0.0
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
			KEY_V:
				if not bool(get_meta("inventory_input_managed", false)):
					set_torch_mode(not is_torch_lit)
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
	const OCTANT_DIRS: Array[String] = ["e", "se", "s", "sw", "w", "nw", "n", "ne"]
	return OCTANT_DIRS[octant]

func face_world_direction(heading: Vector3) -> void:
	heading.y = 0.0
	if heading.length_squared() <= 0.0001:
		return
	facing_dir = preload("res://sprites/sprite_facing.gd").world_octant(heading)
	_pose_world_heading = heading.normalized()

func world_heading_for_pose(direction: String) -> Vector3:
	if is_sitting and _seat_heading != Vector3.ZERO:
		return _seat_heading
	return _pose_world_heading if direction == facing_dir else Vector3.ZERO

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
	if hit_flash_timer > 0.0:
		hit_flash_timer = maxf(0.0, hit_flash_timer - delta)
	_update_action_vfx(delta)

	in_water = global_position.y <= 0.14 or current_zone.get("id", "") == "ocean"

	var input_dir := input_override
	var can_move := (_camera_allows_keyboard() and not is_npc) or input_override.length_squared() > 0.0001
	is_sprinting = false

	if not is_transitioning and can_move:
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
			if is_sitting or not resting_on.is_empty() or has_meta("prop_seat_pos") or (is_prone and bool(get_meta("resting_on_prop", false))):
				is_sitting = false
				is_prone = false
				_release_prop_pose()
			else:
				is_sitting = false
			facing_dir = _dir_from_vector(input_dir)
			_pose_world_heading = Vector3.ZERO

		if has_meta("prop_seat_pos") or (bool(get_meta("resting_on_prop", false)) and (is_sitting or is_prone or not resting_on.is_empty()) and input_dir.length_squared() <= 0.04):
			velocity = Vector3.ZERO
			if has_meta("prop_seat_pos"):
				global_position = get_meta("prop_seat_pos") as Vector3
		else:
			if not is_on_floor():
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
			elif is_stealth:
				speed_mult = 0.62
			elif is_sprinting:
				speed_mult = 1.55

			var world_dir := _camera_relative_dir(input_dir)
			velocity.x = world_dir.x * speed * speed_mult
			velocity.z = world_dir.z * speed * speed_mult
			var combat=get_meta("combat_controller") if has_meta("combat_controller") else null
			var before:=global_position
			if combat and not combat.can_move(self): velocity.x=0; velocity.z=0
			move_and_slide()
			if combat: combat.moved(self,before)

		var min_x := 0.25
		var min_z := 0.25
		var max_x := float(Structure.GRID_COLS) * Structure.TILE_METERS - 0.25
		var max_z := float(Structure.GRID_ROWS) * Structure.TILE_METERS - 0.25
		var scene_root := get_tree().current_scene
		if scene_root and scene_root.has_meta("map_bounds_xz"):
			var b: Rect2 = scene_root.get_meta("map_bounds_xz")
			min_x = b.position.x
			min_z = b.position.y
			max_x = b.position.x + b.size.x
			max_z = b.position.y + b.size.y
		global_position.x = clampf(global_position.x, min_x, max_x)
		global_position.z = clampf(global_position.z, min_z, max_z)

		if global_position.y < -1.5:
			if scene_root and scene_root.has_meta("map_bounds_xz"):
				global_position.y = 0.6
			else:
				var fallback_zone := Structure.get_zone_at(global_position)
				global_position.y = maxf(0.25, float(fallback_zone.get("elevation_min", 0.25))) + 0.35
			velocity = Vector3.ZERO
	else:
		velocity = Vector3.ZERO
		input_dir = Vector2.ZERO
		if has_meta("prop_seat_pos"):
			global_position = get_meta("prop_seat_pos") as Vector3
		elif not is_on_floor():
			# Aplicar apoyo vertical suave al iniciar sobre el suelo si aun no reposa
			velocity.y = -4.0
			move_and_slide()
			if global_position.y < -0.8:
				global_position.y = maxf(0.25, float(current_zone.get("elevation_min", 0.25))) + 0.35
			velocity = Vector3.ZERO

	var new_zone := Structure.get_zone_at(global_position)
	if new_zone.get("id", "") != current_zone.get("id", ""):
		current_zone = new_zone
		emit_signal("zone_changed", current_zone)
	current_elevation = global_position.y

	if is_npc and not is_defeated and str(get_meta("npc_condition_pose", "")).is_empty():
		_process_npc_ambience(delta)

	if action_lock_timer > 0.0:
		action_lock_timer -= delta
		if action_lock_timer <= 0.0:
			action_anim_name = ""

	if is_jumping:
		jump_timer += delta
		if jump_timer >= jump_duration:
			is_jumping = false
			jump_timer = 0.0

	var desired_state := _resolve_desired_state(input_dir)
	_process_pose_visuals(delta, input_dir, desired_state)

func _process_pose_visuals(delta: float, input_dir: Vector2, desired_state: String) -> void:
	if desired_state != current_anim or _needs_direction_refresh(desired_state):
		_resolve_and_apply_clip(desired_state, facing_dir, desired_state != current_anim)

	_process_frame_animation(delta)
	_apply_procedural_motion(delta, input_dir, desired_state)
	_update_carried_torch_flicker(delta)

func _camera_relative_dir(input_dir: Vector2) -> Vector3:
	if input_dir.length_squared() <= 0.0001:
		return Vector3.ZERO
	var active_cam := camera if camera else get_viewport().get_camera_3d()
	if active_cam and active_cam.has_method("screen_vector_to_world"):
		return active_cam.screen_vector_to_world(input_dir)
	if active_cam:
		var basis := active_cam.global_transform.basis
		var right_v := Vector3(basis.x.x, 0.0, basis.x.z)
		var fwd_v := Vector3(basis.z.x, 0.0, basis.z.z)
		if right_v.length_squared() > 0.0001 and fwd_v.length_squared() > 0.0001:
			return (right_v.normalized() * input_dir.x + fwd_v.normalized() * input_dir.y).normalized()
	return Vector3(input_dir.x, 0.0, input_dir.y).normalized()

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
	if not resting_on.is_empty():
		return "rest_on_prop"
	if is_prone:
		return "crawl" if is_moving else "prone"
	if is_sitting:
		if get_meta("prop_pose", "") == "sit_on_prop" and not char_profile.get("dir_states", {}).get("sit_on_prop", {}).is_empty():
			return "sit_on_prop"
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
	if state == "rest_on_prop":
		return false
	return not char_profile.get("dir_states", {}).get(state, {}).is_empty() or state in ["idle", "combat_idle", "walk", "run", "attack", "stealth", "swim", "crawl", "jump", "torch_walk", "torch_run", "torch_idle"]

func _process_npc_ambience(delta: float) -> void:
	# Authored NPCs retain their heading; ambient timers cannot trigger flight.
	if char_profile.has("npc_species"): return
	npc_ai_timer += delta
	if char_key == "zombie":
		var cycle := fmod(npc_ai_timer, 8.0)
		var next_s := "idle" if cycle < 5.0 else "combat_idle"
		if action_lock_timer <= 0.0 and current_anim != next_s:
			_resolve_and_apply_clip(next_s, facing_dir, true)
	elif char_key == "harpy":
		var cycle := fmod(npc_ai_timer, 7.5)
		var next_s := "idle" if cycle < 4.2 else "run"
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

	if (state == "attack_arrow" or state == "attack_throw") and view_dir in ["w", "nw", "sw"]:
		active_clip_flip_h = true
	if (state in ["interact", "crouch_work", "pray"]) and view_dir in ["w", "nw", "sw"]:
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
	if state == "sit_on_prop": state = "sit"
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
		"crouch_work":
			# Animación dibujada de 8 fotogramas agachándose y manipulando (avivar fuego, abrir baúles, recoger leña)
			if clips.has("backpack_take"):
				var cw: Dictionary = clips["backpack_take"].duplicate()
				cw["fps"] = 10.0
				cw["loop"] = false
				return cw
			if clips.has("interact"): return clips["interact"]
			if d_idle.has(dir): return d_idle[dir]
		"pray":
			# Gesto solemne con manos alzadas (altares, estatua de Astalagan, calentar manos)
			if clips.has("spell"):
				var pr: Dictionary = clips["spell"].duplicate()
				pr["fps"] = 7.0
				pr["loop"] = false
				return pr
			if clips.has("interact"): return clips["interact"]
			if clips.has("backpack_take"): return clips["backpack_take"]
			if d_idle.has(dir): return d_idle[dir]
		"interact":
			if clips.has("interact"): return clips["interact"]
			# Mia y Mike usan su ciclo dibujado de 8 fotogramas en lugar de quedar congelados en idle
			if clips.has("backpack_take"):
				var ic: Dictionary = clips["backpack_take"].duplicate()
				ic["fps"] = 11.0
				ic["loop"] = false
				return ic
			if d_idle.has(dir): return d_idle[dir]
		"spell", "stealth", "dodge", "swim", "jump", "hit", "prone", "crawl", "defeated", "sit", "attack_arrow", "attack_throw", "combat_idle":
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

func _process_frame_animation(delta: float) -> void:
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
	if not sprite or active_clip_frames.is_empty():
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
	_sync_occlusion_silhouette(0.0)

func _setup_occlusion_silhouette() -> void:
	if is_npc or not sprite:
		return
	if silhouette_mesh == null:
		if _silhouette_shader_res == null:
			var sh := Shader.new()
			sh.code = """shader_type spatial;
render_mode unshaded, depth_test_disabled, depth_draw_never, cull_disabled, blend_mix;

uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform sampler2D sprite_tex : source_color, filter_linear_mipmap;
uniform vec4 sprite_uv_rect = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec4 silhouette_color : source_color = vec4(1.0, 0.78, 0.36, 0.50);
uniform bool flip_x = false;
uniform float lean_z = 0.0;

varying float v_view_dist;

void vertex() {
	float c = cos(lean_z);
	float s = sin(lean_z);
	vec2 rxy = vec2(VERTEX.x * c - VERTEX.y * s, VERTEX.x * s + VERTEX.y * c);
	VERTEX.x = rxy.x;
	VERTEX.y = rxy.y;
	vec3 scale_v = vec3(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz), length(MODEL_MATRIX[2].xyz));
	vec3 cam_right = normalize(vec3(INV_VIEW_MATRIX[0].x, 0.0, INV_VIEW_MATRIX[0].z));
	vec3 cam_up = vec3(0.0, 1.0, 0.0);
	vec3 cam_fwd = cross(cam_right, cam_up);
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		vec4(cam_right * scale_v.x, 0.0),
		vec4(cam_up * scale_v.y, 0.0),
		vec4(cam_fwd * scale_v.z, 0.0),
		MODEL_MATRIX[3]
	);
	v_view_dist = -(MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).z;
}

void fragment() {
	vec2 local_uv = vec2(flip_x ? (1.0 - UV.x) : UV.x, UV.y);
	vec2 tex_sz = max(vec2(textureSize(sprite_tex, 0)), vec2(1.0));
	vec2 half_px = vec2(0.5) / tex_sz;
	vec2 min_uv = sprite_uv_rect.xy + half_px;
	vec2 max_uv = sprite_uv_rect.xy + sprite_uv_rect.zw - half_px;
	vec2 uv = clamp(sprite_uv_rect.xy + local_uv * sprite_uv_rect.zw, min_uv, max(min_uv, max_uv));
	vec4 tex_col = texture(sprite_tex, uv);
	float tex_a = tex_col.a;
	if (tex_a < 0.25) {
		discard;
	}
	float scene_raw_d = texture(depth_tex, SCREEN_UV).r;
	vec4 scene_view = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, scene_raw_d, 1.0);
	float scene_dist = -(scene_view.z / max(abs(scene_view.w), 0.0001));
	if (scene_dist >= v_view_dist - 0.36) {
		discard;
	}
	vec2 step_uv = vec2(2.4) / tex_sz;
	float a_n = (uv.y - step_uv.y >= sprite_uv_rect.y) ? texture(sprite_tex, uv + vec2(0.0, -step_uv.y)).a : 0.0;
	float a_s = (uv.y + step_uv.y <= sprite_uv_rect.y + sprite_uv_rect.w) ? texture(sprite_tex, uv + vec2(0.0, step_uv.y)).a : 0.0;
	float a_e = (uv.x + step_uv.x <= sprite_uv_rect.x + sprite_uv_rect.z) ? texture(sprite_tex, uv + vec2(step_uv.x, 0.0)).a : 0.0;
	float a_w = (uv.x - step_uv.x >= sprite_uv_rect.x) ? texture(sprite_tex, uv + vec2(-step_uv.x, 0.0)).a : 0.0;
	float min_neighbor = min(min(a_n, a_s), min(a_e, a_w));
	float rim = clamp((tex_a - min_neighbor) * 1.85, 0.0, 1.0);
	vec3 inner_col = mix(vec3(0.42, 0.34, 0.20), tex_col.rgb * 1.15, 0.45);
	vec3 rim_col = silhouette_color.rgb;
	ALBEDO = mix(inner_col, rim_col, rim);
	ALPHA = mix(0.24, 0.80, rim) * smoothstep(0.25, 0.60, tex_a);
}
"""
			_silhouette_shader_res = sh
		_silhouette_mat = ShaderMaterial.new()
		_silhouette_mat.shader = _silhouette_shader_res
		_silhouette_mat.render_priority = 11
		silhouette_mesh = MeshInstance3D.new()
		silhouette_mesh.name = "OcclusionSilhouette"
		var qm := QuadMesh.new()
		qm.size = Vector2(1.0, 1.0)
		silhouette_mesh.mesh = qm
		silhouette_mesh.material_override = _silhouette_mat
		silhouette_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(silhouette_mesh)
	_sync_occlusion_silhouette(0.0)

func _sync_occlusion_silhouette(lean_z: float) -> void:
	if not silhouette_mesh or not _silhouette_mat or not sprite:
		return
	var show := (not is_npc) and visible and sprite.visible and sprite.texture != null
	silhouette_mesh.visible = show
	if not show:
		return
	var tex := sprite.texture
	var shader_tex: Texture2D = tex
	var uv_rect := Vector4(0.0, 0.0, 1.0, 1.0)
	if tex is AtlasTexture:
		var at := tex as AtlasTexture
		if at.atlas != null:
			shader_tex = at.atlas
			var aw := maxf(float(at.atlas.get_width()), 1.0)
			var ah := maxf(float(at.atlas.get_height()), 1.0)
			var reg := at.region
			if reg.size.x > 0.0 and reg.size.y > 0.0:
				uv_rect = Vector4(reg.position.x / aw, reg.position.y / ah, reg.size.x / aw, reg.size.y / ah)
	silhouette_mesh.position = sprite.position
	silhouette_mesh.scale = Vector3(
		float(tex.get_width()) * sprite.pixel_size * sprite.scale.x,
		float(tex.get_height()) * sprite.pixel_size * sprite.scale.y,
		1.0
	)
	_silhouette_mat.set_shader_parameter("sprite_tex", shader_tex)
	_silhouette_mat.set_shader_parameter("sprite_uv_rect", uv_rect)
	_silhouette_mat.set_shader_parameter("flip_x", sprite.flip_h)
	_silhouette_mat.set_shader_parameter("lean_z", lean_z)

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
	var is_directional_sprite_cycle := state.begins_with("torch_") or state.begins_with("backpack_") or state in ["crouch_work", "pray", "sit_on_prop", "rest_on_prop"] or (char_key == "rogue" and state in ["walk", "run", "attack", "stealth", "swim", "climb", "jump", "interact"])

	if state in ["idle", "combat_idle", "sit"]:
		var breath := sin(idle_breath_time * (3.4 if state == "combat_idle" else 2.2))
		sy = 1.0 + breath * 0.015
		sx = 1.0 - breath * 0.008
		if state == "sit" and not active_clip_drawn_motion:
			base_y *= 0.88
		if is_npc and char_key == "harpy":
			bob_y += absf(breath) * 0.03
		elif is_npc and char_key == "zombie":
			rot_z += breath * 0.035

	if state in ["walk", "run"]:
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
	elif state == "swim":
		walk_cycle += delta * 6.5
		bob_y = sin(walk_cycle) * 0.07 - 0.14
		rot_z = cos(walk_cycle * 0.7) * 0.12
		mod = Color(0.80, 0.95, 1.0, 0.96)
	elif state == "interact":
		var p := clampf(1.0 - (action_lock_timer / 0.62), 0.0, 1.0)
		var reach := sin(p * PI)
		if char_key != "rogue" and active_clip_frames.size() <= 1:
			rot_z = -dir_sign * reach * 0.11
			bob_y = reach * 0.05
			sx = 1.0 + reach * 0.04
	elif state == "crouch_work":
		pass
	elif state == "pray":
		var p_pr := clampf(1.0 - (action_lock_timer / 0.85), 0.0, 1.0)
		var glow_w := sin(p_pr * PI)
		mod = Color(1.0 + glow_w * 0.14, 1.0 + glow_w * 0.10, 1.0 - glow_w * 0.02)
	elif state in ["attack", "attack_arrow", "attack_throw", "spell"]:
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
	elif state in ["prone", "crawl", "defeated"]:
		var drawn_lying: bool=sprite.texture!=null and sprite.texture.get_width()>sprite.texture.get_height()*1.2
		rot_z = 0.0 if drawn_lying else deg_to_rad(-74.0)
		base_y = maxf(.18,target_height*current_height_scale*.5) if drawn_lying else .46
		if state == "crawl":
			walk_cycle += delta * 8.0
			bob_y = absf(sin(walk_cycle)) * 0.04
		elif state == "prone":
			var p_breath := sin(idle_breath_time * 1.65)
			sy = 1.0 + p_breath * 0.012
			bob_y = p_breath * 0.008
	else:
		walk_cycle = 0.0

	if is_jumping:
		var t := clampf(jump_timer / jump_duration, 0.0, 1.0)
		jump_y = sin(t * PI) * jump_peak_height
		if char_key != "rogue":
			sy = 1.0 + sin(t * PI) * 0.10
			sx = 1.0 - sin(t * PI) * 0.05

	# Authored poses already contain limb movement and posture. Preserve their
	# proportions instead of bending/flattening the entire drawing a second time,
	# except for procedural rest states (prone/sit/crawl/defeated) that use idle frames.
	if active_clip_drawn_motion and not (state in ["prone", "crawl", "defeated", "sit"]):
		rot_z = 0.0
		sx = 1.0
		sy = 1.0
		bob_y = 0.0
		base_y = target_height * current_height_scale * (0.5 + current_floor_offset) + (0.0 if state in ["sit_on_prop", "rest_on_prop"] else 0.018)

	if in_water and state != "swim":
		mod = mod * Color(0.84, 0.95, 1.0)

	sprite.position = Vector3(0.0, base_y + jump_y + bob_y + (0.018 if not active_clip_drawn_motion else 0.0), 0.0)
	if absf(rot_z) > 0.25:
		sprite.billboard = BaseMaterial3D.BILLBOARD_DISABLED
		var cam_node := camera if camera else (get_viewport().get_camera_3d() if get_viewport() else null)
		var cam_yaw := cam_node.global_rotation.y if cam_node else 0.0
		sprite.rotation = Vector3(0.0, cam_yaw, rot_z)
	else:
		sprite.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
		sprite.rotation = Vector3(0.0, 0.0, rot_z)
	sprite.scale = Vector3(sx, sy, 1.0)
	if has_meta("npc_condition_color"): mod = mod * get_meta("npc_condition_color")
	sprite.modulate = mod
	_update_seat_surface(state)
	_update_rest_surface(state)
	_sync_occlusion_silhouette(rot_z)

	if contact_shadow:
		contact_shadow.visible = state not in ["sit_on_prop", "rest_on_prop"]
		var alt_factor := clampf(1.0 - (jump_y / (jump_peak_height * 1.45)), 0.35, 1.0)
		var state_shadow := 0.85 if state == "sit" else (1.25 if state in ["prone", "crawl", "defeated"] else 1.0)
		# La huella se adapta a la estatura canónica del actor (Trinity < Mia < Mike)
		var stature_shadow := clampf(target_height * current_height_scale / 1.82, 0.62, 1.12)
		if state in ["prone", "crawl", "defeated"]:
			stature_shadow = clampf(target_height / 1.82, 0.7, 1.12)
		var airborne := clampf(jump_y / maxf(jump_peak_height, 0.01), 0.0, 1.0)
		if char_key == "harpy" and state in ["run", "fly"]:
			airborne = 0.7
		contact_shadow.scale = Vector3(alt_factor * state_shadow * stature_shadow, 1.0, alt_factor * state_shadow * stature_shadow)
		var shadow_mat := contact_shadow.material_override as StandardMaterial3D
		if shadow_mat:
			# Cuanto más lejos del suelo, más tenue la sombra de contacto
			shadow_mat.albedo_color.a = lerpf(1.0, 0.38, airborne)
	if selection_ring:
		var sitting_prop := state in ["sit_on_prop", "rest_on_prop"]
		selection_ring.visible = is_active_player and not is_npc and not sitting_prop
		var m := selection_ring.material_override as StandardMaterial3D
		if m:
			m.albedo_color.a = 0.0 if sitting_prop else (0.28 if is_stealth else ring_color.a)
			m.emission_enabled = not sitting_prop and not is_stealth
			# Pulso lento del anillo (respeta el movimiento reducido y atenúa emisión en sigilo)
			var loading_node := get_node_or_null("/root/SkillLoading")
			var calm: bool = loading_node != null and bool(loading_node.get("reduced"))
			var stealth_mul := 0.0 if (sitting_prop or is_stealth) else 1.0
			if calm:
				m.emission_energy_multiplier = 1.5 * stealth_mul
				selection_ring.scale = Vector3.ONE
			else:
				var pulse := 0.5 + 0.5 * sin(float(Time.get_ticks_msec()) * 0.0028)
				m.emission_energy_multiplier = lerpf(1.25, 1.85, pulse) * stealth_mul
				var ring_scale := 1.0 + pulse * 0.025
				selection_ring.scale = Vector3(ring_scale, 1.0, ring_scale)

func active_prop_surface() -> MeshInstance3D:
	if is_instance_valid(_rest_surface) and _rest_surface.visible:
		return _rest_surface
	if is_instance_valid(_seat_surface) and _seat_surface.visible:
		return _seat_surface
	return null

func _update_rest_surface(state: String) -> void:
	if state != "rest_on_prop" or active_clip_frames.is_empty():
		if is_instance_valid(_rest_surface) and _rest_surface.visible:
			_rest_surface.hide()
			if sprite:
				sprite.show()
		return
	var frame0: Dictionary = active_clip_frames[0]
	if not frame0.has("rest_contour") or _rest_bed.is_empty():
		return
	if not _rest_surface:
		_rest_surface = RestSurface.new()
		_rest_surface.name = "RestingCharacterSurface"
		add_child(_rest_surface)
		_rest_surface.hide()
	if not _rest_surface.visible:
		_rest_surface.fit(sprite, frame0, _rest_bed)
		_rest_surface.show()
	if bool(get_meta("hammock_sway", false)):
		_rest_surface.rotation.z = sin(idle_breath_time * 1.45) * 0.04
	else:
		_rest_surface.rotation.z = 0.0
	if sprite:
		sprite.hide()

func _update_seat_surface(state: String) -> void:
	var view := camera if camera else (get_viewport().get_camera_3d() if get_viewport() else null)
	if state != "sit_on_prop" or not view or active_clip_frames.is_empty():
		_clear_seat_surface()
		return
	var frame: Dictionary = active_clip_frames[clampi(anim_frame_idx, 0, active_clip_frames.size() - 1)]
	if not frame.has("sole_contact"):
		_clear_seat_surface()
		return
	if not _seat_surface:
		_seat_surface = SeatSurface.new()
		_seat_surface.name = "SeatedCharacterSurface"
		add_child(_seat_surface)
	_seat_surface.fit(sprite, view, frame.visual_pivot, frame.sole_contact, _seat_feet, _seat_heading)
	_seat_surface.show()
	sprite.hide()

func _clear_seat_surface() -> void:
	if is_instance_valid(_seat_surface) and _seat_surface.visible:
		_seat_surface.hide()
		if sprite:
			sprite.show()

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

func _get_generated_fx_tex(mode_name: String) -> Texture2D:
	if mode_name == "spell":
		if not _shared_spell_tex:
			var grad := Gradient.new()
			grad.set_color(0, Color(1.0, 1.0, 1.0, 0.92))
			grad.set_color(0.45, Color(0.85, 0.95, 1.0, 0.45))
			grad.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
			var gt := GradientTexture2D.new()
			gt.gradient = grad
			gt.fill = GradientTexture2D.FILL_RADIAL
			gt.fill_from = Vector2(0.5, 0.5)
			gt.fill_to = Vector2(1.0, 0.5)
			gt.width = 128
			gt.height = 128
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
	if not torch_sparks:
		return
	torch_sparks.visible = is_torch_lit and char_profile.get("dir_torch_walk", {}).is_empty()
	torch_sparks.amount_ratio = 1.0 if is_torch_lit else 0.25
	var pm := torch_sparks.process_material as ParticleProcessMaterial
	if pm:
		pm.initial_velocity_max = 1.45 if is_torch_lit else 0.45
		pm.scale_max = 0.20 if is_torch_lit else 0.10
		pm.color = Color(1.0, 0.72, 0.28, 0.95) if is_torch_lit else Color(1.0, 0.85, 0.50, 0.55)

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
	carried_light.position = Vector3(0.25, 0.95, 0.15)
	carried_light.light_color = Color("#ff9a35")
	carried_light.light_energy = 0.0
	carried_light.omni_range = 20.0
	carried_light.omni_attenuation = 1.1
	carried_light.shadow_enabled = false
	carried_light.visible = false
	add_child(carried_light)

	torch_sparks = GPUParticles3D.new()
	torch_sparks.name = "TorchSparks"
	torch_sparks.amount = 18
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
