extends SceneTree

# Regression contract shared by both independent Godot projects.
const CameraScript = preload("res://scripts/camp_camera.gd")
const InteractionScript = preload("res://scripts/vtt_map_interaction.gd")
class PartyFixture extends Node3D:
	var party: Array[CharacterBody3D] = []
class TokenFixture extends CharacterBody3D:
	var is_active_player := true
	var input_override := Vector2.ZERO
	var is_transitioning := false
	var is_jumping := false
	var jump_timer := 0.0
class UiFixture extends Node:
	var camera: Camera3D
	var main_ctrl: Node3D
	var current_role := "dm"
	var map_interaction: Node
	var last_notice := ""
	func notify_mesa(message: String) -> void: last_notice = message

var passed := 0
var failed: Array[String] = []
func check(value: bool, label: String) -> void:
	if value: passed += 1
	else: failed.append(label); printerr("FAIL: ",label)
func near(a: float,b: float) -> bool: return absf(a-b)<0.001
func _initialize() -> void: run.call_deferred()
func touch(camera: Camera3D,index: int,point: Vector2,pressed: bool) -> void:
	var event := InputEventScreenTouch.new()
	event.index = index; event.position = point; event.pressed = pressed
	camera._handle_touch(event)
func drag(camera: Camera3D,index: int,point: Vector2) -> void:
	var event := InputEventScreenDrag.new()
	event.index = index; event.position = point
	camera._handle_touch(event)
func run() -> void:
	var scene := PartyFixture.new()
	scene.name = "Main"
	root.add_child(scene)
	var token := TokenFixture.new()
	token.position = Vector3(10,0,10)
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.3; capsule.height = 1.6
	shape.shape = capsule; shape.position.y = 0.8
	token.add_child(shape)
	scene.add_child(token); scene.party.append(token)
	var camera := CameraScript.new()
	camera.persist_preferences = false; camera.target = token
	scene.add_child(camera)
	camera.set_process(false)
	camera.is_overview = false
	check(camera.projection == Camera3D.PROJECTION_ORTHOGONAL,"orthographic on startup")
	camera.toggle_projection_mode()
	check(camera.projection == Camera3D.PROJECTION_ORTHOGONAL,"projection cannot switch to perspective")
	camera.room_front_offset = 0; camera.orbit_step = 0
	camera.step_orbit(99)
	check(near(camera.target_yaw,30),"horizontal upper limit")
	camera.step_orbit(-99)
	check(near(camera.target_yaw,-30),"horizontal lower limit")
	for yaw in [-30.0,0.0,30.0,45.0]:
		camera.current_yaw = yaw
		check(camera.screen_vector_to_world(Vector2(0,-1)).is_equal_approx(Vector3.FORWARD),"W stable at yaw "+str(yaw))
	camera.target_pitch = 25
	camera._begin_tilt_hold(-1); camera._advance_tilt_hold(80); camera._end_tilt_hold()
	check(near(camera.target_pitch,20),"tap reaches next 5 degree stop")
	camera._begin_tilt_hold(-1); camera._advance_tilt_hold(437); camera._end_tilt_hold()
	check(near(camera.target_pitch,17.43),"hold releases at fractional angle")
	camera.target_pitch = 10
	camera._begin_tilt_hold(1); camera._advance_tilt_hold(700)
	check(near(camera.target_pitch,15),"hold pauses at 5 degree detent")
	camera._advance_tilt_hold(120); camera._end_tilt_hold()
	check(camera.target_pitch>15 and camera.target_pitch<16,"hold resumes after detent")
	camera._interior_initialized = false
	camera._apply_zone_boundary_transition(false,"exterior")
	camera.target_pitch = 7.3; camera.target_distance = 19.4
	camera._apply_zone_boundary_transition(false,"exterior")
	check(near(camera.target_pitch,7.3),"same exterior preserves manual tilt")
	camera._apply_zone_boundary_transition(true,"c4",14)
	check(near(camera.target_pitch,10),"entry always uses 10 degrees")
	check(near(camera.target_distance,19.4),"entry preserves zoom")
	camera.target_pitch = 6.7
	camera._apply_zone_boundary_transition(true,"c5")
	check(near(camera.target_pitch,6.7),"moving between interiors preserves manual tilt")
	camera._apply_zone_boundary_transition(false,"exterior")
	check(near(camera.target_pitch,25),"exit uses 25 degrees")
	check(near(camera.target_distance,19.4),"exit preserves zoom")
	camera.target_pitch = 10; camera.orbit_step = 0
	touch(camera,0,Vector2(100,100),true); touch(camera,1,Vector2(200,100),true)
	drag(camera,0,Vector2(100,80)); drag(camera,1,Vector2(200,80))
	check(camera._touch_axis=="tilt" and near(camera.target_pitch,12),"two fingers vertical controls tilt")
	camera._process(0.016)
	check(camera._touch_axis=="tilt","gesture axis survives render frame")
	drag(camera,0,Vector2(140,73)); drag(camera,1,Vector2(240,73))
	check(near(camera.target_pitch,12.7) and near(camera.orbit_step,0),"fractional tilt and axis lock")
	touch(camera,0,Vector2.ZERO,false); touch(camera,1,Vector2.ZERO,false)
	camera.orbit_step = 0
	touch(camera,0,Vector2(100,100),true); touch(camera,1,Vector2(200,100),true)
	drag(camera,0,Vector2(130,100)); drag(camera,1,Vector2(230,100))
	check(near(camera.orbit_step,0.3),"two fingers horizontal controls orbit")
	touch(camera,0,Vector2.ZERO,false); touch(camera,1,Vector2.ZERO,false)
	camera.current_zone_id = "exterior"; camera.target_distance = 20
	touch(camera,0,Vector2(100,100),true); touch(camera,1,Vector2(200,100),true)
	drag(camera,0,Vector2(80,100)); drag(camera,1,Vector2(220,100))
	check(camera._touch_axis=="zoom" and camera.target_distance<20,"pinch controls zoom")
	touch(camera,0,Vector2.ZERO,false); touch(camera,1,Vector2.ZERO,false)
	camera.target_pitch = 7.3; camera.target_distance = 19.4; camera.orbit_step = 0.7
	camera.set_view_role("dm")
	var original := token.global_position
	camera.explore_point(Vector3(15,0,15))
	camera.target_pitch = 12.6; camera.target_distance = 12.5
	camera.set_view_role("projector")
	check(near(camera.target_pitch,7.3),"private DM tilt does not leak to first projector visit")
	check(camera.target == token,"private DM anchor does not leak to projector")
	camera.set_view_role("dm")
	check(near(camera.target_pitch,12.6),"DM view restored")
	check(token.global_position==original,"DM exploration does not move character")
	camera.share_camera = true
	camera.set_view_role("projector")
	check(near(camera.target_pitch,12.6) and near(camera.target_distance,12.5),"shared projector includes tilt and zoom")
	var shared_focus: Vector3 = camera.target_focus
	camera.set_view_role("dm"); camera.share_camera = false
	camera.explore_point(Vector3(28,0,18))
	camera.set_view_role("projector"); camera._process(0.016)
	check(camera.target_focus.is_equal_approx(shared_focus),"private exploration cannot mutate last shared projector anchor")
	camera.set_view_role("player")
	check(near(camera.target_pitch,7.3) and near(camera.target_distance,19.4),"player keeps personal tilt and zoom")
	camera.set_view_role("dm")
	scene.name = "RouteMap"
	camera.set_follow_mode("fixed")
	camera.set_target_character(token)
	check(not camera.is_following,"selection preserves fixed mode")
	var saved := camera.get_view_state()
	camera.toggle_combat_group_view()
	check(camera.is_combat_group_mode,"combat framing starts")
	camera.toggle_combat_group_view()
	check(near(camera.target_pitch,saved.pitch) and near(camera.target_distance,saved.distance) and near(camera.orbit_step,saved.orbit),"combat restores complete user framing")
	check(not camera.is_following and camera.follow_mode=="fixed","combat restores fixed mode")
	camera.toggle_combat_group_view()
	camera.set_view_role("player")
	camera.end_combat_framing()
	camera.set_view_role("dm")
	check(not camera.is_combat_group_mode and near(camera.target_pitch,saved.pitch) and near(camera.target_distance,saved.distance),"ending combat from another role restores private DM view")
	var ui := UiFixture.new()
	ui.name = "VttRoleUi"; ui.camera = camera; ui.main_ctrl = scene
	scene.add_child(ui)
	var interaction := InteractionScript.new()
	ui.map_interaction = interaction; ui.add_child(interaction)
	check(not camera.accepts_token_input(token),"DM without selection cannot move character")
	interaction.selected = token
	check(camera.accepts_token_input(token),"DM selected character accepts keyboard")
	camera.camera_role = "projector"
	check(not camera.accepts_token_input(token),"projector cannot move character")
	camera.camera_role = "dm"
	await physics_frame
	check(interaction.place_selected(Vector3(18,0,18)),"DM placement on free point")
	check(token.global_position.is_equal_approx(Vector3(18,0.12,18)),"placement reaches destination")
	interaction._undo_place()
	check(token.global_position.is_equal_approx(original),"placement undo")
	var obstacle := StaticBody3D.new()
	var wall_shape := CollisionShape3D.new()
	wall_shape.shape = BoxShape3D.new(); wall_shape.shape.size = Vector3(3,3,3)
	obstacle.position = Vector3(22,1,22); obstacle.add_child(wall_shape); scene.add_child(obstacle)
	await process_frame
	await physics_frame
	await process_frame
	check(not interaction.place_selected(Vector3(22,0,22)) and token.global_position==original,"blocked placement is atomic")
	token.is_transitioning = true
	check(not interaction.place_selected(Vector3(18,0,18)),"animated transition cannot be interrupted by placement")
	token.is_transitioning = false
	camera.set_follow_mode("follow")
	camera.current_pitch = 5; camera.target_pitch = 5
	camera.focus_point = Vector3(-30,1,-10); camera.target_focus = camera.focus_point
	camera.current_distance = 6; camera.target_distance = 6
	camera.update_camera_transform(); camera._keep_target_visible()
	var screen := camera.unproject_position(token.global_position)
	check(Rect2(Vector2.ZERO,root.get_visible_rect().size).has_point(screen),"follow safety keeps token visible after boundary or teleport")
	check(near(camera.target_distance,6) and near(camera.target_pitch,5),"visibility safety changes neither zoom nor tilt")
	for aspect in [0.5,16.0/9.0]:
		var frame: Dictionary = camera.calculate_wreck_overview_frame(30,5,aspect)
		var back := Vector3(sin(deg_to_rad(30.0))*cos(deg_to_rad(5.0)),sin(deg_to_rad(5.0)),cos(deg_to_rad(30.0))*cos(deg_to_rad(5.0)))
		var right := Vector3.UP.cross(back).normalized(); var up := back.cross(right).normalized()
		var half_y: float = frame.distance*tan(deg_to_rad(camera.fov*0.5))
		var fits := true
		for point in camera._overview_points:
			var offset: Vector3 = point-frame.target
			if absf(offset.dot(right))>half_y*aspect or absf(offset.dot(up))>half_y: fits = false
		check(fits,"overview fits all scene points at aspect "+str(aspect))
	camera.preferences_file = "user://camera-contract-test.cfg"
	camera.persist_preferences = true; camera._preference_elapsed = 0; camera._last_preference = ""
	camera.target_pitch = 7.3; camera.orbit_step = 0.3; camera.target_distance = 19.4
	camera._save_preferences_if_changed(0.5)
	camera.target_pitch = 25; camera.orbit_step = 0; camera.target_distance = 24
	camera._load_preferences()
	check(near(camera.target_pitch,7.3) and near(camera.orbit_step,0.3) and near(camera.target_distance,19.4),"preferences retain fractional angle and zoom")
	scene.scene_file_path = "res://another-map.tscn"
	camera.target_pitch = 21.2
	camera._load_preferences()
	check(near(camera.target_pitch,21.2),"another map does not inherit saved tilt")
	camera.persist_preferences = false
	DirAccess.remove_absolute(ProjectSettings.globalize_path(camera.preferences_file))
	print("CAMERA CONTRACT: ",passed," PASS / ",failed.size()," FAIL")
	scene.free()
	quit(0 if failed.is_empty() else 1)
