extends MeshInstance3D

const WoolShader = preload("res://shaders/rest_blanket.gdshader")
const BodyMesh = preload("res://scripts/resting_body_mesh.gd")
const COVER_START := 0.42
const BODY_END_UNDER_COVER := 0.46
const COVER_ROWS := 40
const COVER_COLUMNS := 28
const EMISSION := 0.13

static var _wool_tex_cache: Texture2D = null

var _material := StandardMaterial3D.new()
var _blanket: MeshInstance3D

static func _load_wool_tex() -> Texture2D:
	if _wool_tex_cache != null:
		return _wool_tex_cache
	var path := "res://assets/textures/wool-v4.webp"
	if FileAccess.file_exists(path):
		var img := Image.new()
		var bytes := FileAccess.get_file_as_bytes(path)
		if not bytes.is_empty() and img.load_webp_from_buffer(bytes) == OK:
			img.generate_mipmaps()
			_wool_tex_cache = ImageTexture.create_from_image(img)
			return _wool_tex_cache
	if ResourceLoader.exists(path):
		_wool_tex_cache = load(path) as Texture2D
		return _wool_tex_cache
	var fallback := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	fallback.fill(Color(0.75, 0.72, 0.68, 1.0))
	_wool_tex_cache = ImageTexture.create_from_image(fallback)
	return _wool_tex_cache

func _ready() -> void:
	material_override = _material
	_material.cull_mode = BaseMaterial3D.CULL_BACK
	_material.roughness = 0.88
	_material.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	_material.emission_enabled = true
	_material.emission = Color.WHITE
	_material.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
	_material.emission_energy_multiplier = EMISSION
	_material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	_material.alpha_scissor_threshold = 0.47
	set_meta("overlay_normal", Vector3.UP)

func fit(sprite: Sprite3D, frame: Dictionary, bed: Dictionary) -> void:
	var size := sprite.get_item_rect().size * sprite.pixel_size
	var pivot: Vector2 = frame.visual_pivot
	var volume: Dictionary = frame.rest_volume
	var cover: Dictionary = frame.rest_blanket
	var head: Vector3 = bed.head
	var forward: Vector3 = bed.forward
	var right := Vector3.UP.cross(forward).normalized()
	layers = sprite.layers
	_material.albedo_texture = sprite.texture
	_material.emission_texture = sprite.texture
	sync_color(sprite.modulate)

	var placement := global_transform.affine_inverse() * Transform3D(Basis(right, Vector3.UP, forward), head)
	var visible_length := 0.998 if cover.is_empty() else BODY_END_UNDER_COVER
	mesh = BodyMesh.build(frame, size, bed, placement, visible_length)
	if not cover.is_empty():
		var profile: Array[Vector2] = [
			Vector2(COVER_START, volume.chest), Vector2(0.52, volume.hips),
			Vector2(0.72, volume.calves), Vector2(0.80, volume.calves * 0.84),
			Vector2(0.93, volume.boots), Vector2(1.0, 0.017),
		]
		_fit_blanket(size, pivot, bed, cover, profile)
	elif is_instance_valid(_blanket):
		_blanket.hide()

func _fit_blanket(size: Vector2, pivot: Vector2, bed: Dictionary, style: Dictionary, profile: Array[Vector2]) -> void:
	if not _blanket:
		_blanket = MeshInstance3D.new()
		_blanket.name = "RestBlanket"
		add_child(_blanket)
		var wool := ShaderMaterial.new()
		wool.shader = WoolShader
		wool.set_shader_parameter("woven_wool", _load_wool_tex())
		_blanket.material_override = wool
	_blanket.layers = layers
	var head: Vector3 = bed.head
	var forward: Vector3 = bed.forward
	var right := Vector3.UP.cross(forward).normalized()
	var half_width := minf(size.x * 0.79, float(bed.available_width) * 0.465)
	var start := (COVER_START - pivot.y) * size.y
	var end := minf((1.0 - pivot.y) * size.y + 0.10, float(bed.available_length) - 0.015)
	var base := Color.html(style.base)
	var trim := Color.html(style.trim)
	var bands := int(style.bands)
	var vertices := PackedVector3Array()
	var uvs := PackedVector2Array()
	var colors := PackedColorArray()
	for row in range(COVER_ROWS + 1):
		var v := float(row) / COVER_ROWS
		var body_v := lerpf(COVER_START, 1.0, v)
		var ridge := (0.026 + _height_at(body_v, profile) * size.y) * (1.0 - smoothstep(0.77, 1.0, v) * 0.95)
		for col in range(COVER_COLUMNS + 1):
			var u := float(col) / COVER_COLUMNS
			var x := u * 2.0 - 1.0
			var hem_wave := sin(u * 14.0 + bands) * 0.012
			var spread := half_width * (0.94 + 0.06 * sin(v * PI) - 0.10 * smoothstep(0.55, 1.0, v))
			var point := head + right * (x * spread) + forward * (lerpf(start, end, v) + hem_wave)
			var center_height := ridge * pow(maxf(0.0, 1.0 - x * x), 0.86)
			var folds := sin(x * 16.0 + v * 5.0) * 0.012 * absf(x)
			var between_legs := exp(-pow(x / 0.17, 2.0)) * sin(smoothstep(0.25, 1.0, v) * PI) * size.y * 0.029
			var cuff := maxf(0.0, 1.0 - absf(v - 0.05) * 22.0) * 0.017
			var edge_drop := smoothstep(0.62, 1.0, absf(x)) * 0.032
			point.y = float(bed.bedding_y) + 0.014 + center_height + folds + cuff - between_legs - edge_drop
			vertices.append(to_local(point))
			uvs.append(Vector2(u, v))
			var edge := col <= 1 or col >= COVER_COLUMNS - 1
			var band := row == 2 or row == COVER_ROWS - 2 or (bands == 2 and (row == 4 or row == COVER_ROWS - 4))
			colors.append(trim if edge or band else base)
	_blanket.mesh = _build_surface(vertices, uvs, COVER_COLUMNS, COVER_ROWS, colors)
	_blanket.show()

func _build_surface(vertices: PackedVector3Array, uvs: PackedVector2Array, width: int, rows: int, colors := PackedColorArray()) -> ArrayMesh:
	var stride := width + 1
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	for row in range(rows + 1):
		for col in range(stride):
			var vertex := row * stride + col
			var across := vertices[row * stride + mini(col + 1, width)] - vertices[row * stride + maxi(col - 1, 0)]
			var along := vertices[mini(row + 1, rows) * stride + col] - vertices[maxi(0, row - 1) * stride + col]
			normals.append(along.cross(across).normalized())
			if row < rows and col < width:
				indices.append_array(PackedInt32Array([
					vertex, vertex + 1, vertex + stride,
					vertex + 1, vertex + stride + 1, vertex + stride,
				]))

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	if not colors.is_empty():
		arrays[Mesh.ARRAY_COLOR] = colors
	var surface := ArrayMesh.new()
	surface.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return surface

func _height_at(v: float, profile: Array[Vector2]) -> float:
	for i in range(1, profile.size()):
		var next := profile[i]
		if v <= next.x:
			var previous := profile[i - 1]
			return lerpf(previous.y, next.y, smoothstep(previous.x, next.x, v))
	return 0.0

func sync_color(color: Color) -> void:
	_material.albedo_color = Color(color.r * 0.76, color.g * 0.76, color.b * 0.76, color.a)
	_material.emission_energy_multiplier = EMISSION * color.a
