extends RefCounted
const DIRECTIONS := ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const ROW_EDGES := {
	"cleric": [0, 219, 418, 623, 815, 1014, 1254],
	"rogue": [0, 212, 414, 623, 822, 1022, 1254],
	"wizard": [0, 223, 426, 615, 796, 982, 1254]
}
static var _profiles: Dictionary = {}

static func profile(hero: String) -> Dictionary:
	if _profiles.has(hero):
		return _profiles[hero]
	var result: Dictionary = {"clips": {}, "torch_walk": {}, "torch_idle": {}}
	var path := "res://inventory/art/%s-backpack-torch-v1.png" % hero
	if not FileAccess.file_exists(path):
		return result
	var image := Image.new()
	if image.load_png_from_buffer(FileAccess.get_file_as_bytes(path)) != OK or image.is_empty():
		return result
	image.convert(Image.FORMAT_RGBA8)
	# Measured alpha bands: generated rows have different heights, particularly
	# Mike's final four rows. Uniform division would cut heads and torch flames.
	var rows: Array = ROW_EDGES[hero]
	for row in range(2):
		var frames: Array = []
		for column in range(8):
			frames.append(_frame(image, column, row, rows))
		result.clips["backpack_take" if row == 0 else "backpack_store"] = {"frames": frames, "fps": 8.0, "loop": false}
	for index in range(8):
		var frames: Array = []
		var row := 2 + index / 2
		for step in range(4):
			frames.append(_frame(image, (index % 2) * 4 + step, row, rows))
		result.torch_walk[DIRECTIONS[index]] = {"frames": frames, "fps": 8.0, "loop": true}
		result.torch_idle[DIRECTIONS[index]] = {"frames": [frames[0]], "fps": 1.0, "loop": false}
	# Match standing body height to the existing hero, even when crouching or
	# carrying a flame above the head. Shared frame dictionaries keep idle aligned.
	var standing_height: float = result.clips.backpack_take.frames[0].tex.get_height()
	for clip in result.clips.values() + result.torch_walk.values():
		for frame in clip.frames:
			frame.height_scale = float(frame.tex.get_height()) / maxf(standing_height, 1.0)
	var complete_torch: Dictionary = load("res://sprites/sprite_library.gd").torch_profile(hero)
	if not complete_torch.walk.is_empty():
		result.torch_walk = complete_torch.walk
		result.torch_idle = complete_torch.idle
	_profiles[hero] = result
	return result

static func _frame(source: Image, column: int, row: int, rows: Array) -> Dictionary:
	var left: int = int(float(column) * source.get_width() / 8)
	var right: int = int(float(column + 1) * source.get_width() / 8)
	var cell := Vector2i(right - left, rows[row + 1] - rows[row])
	var part := source.get_region(Rect2i(left, rows[row], cell.x, cell.y))
	# The source is preserved. Alpha cutoff is a runtime import operation, as in
	# the existing facing-sprite isolation: remove near-transparent colour bleed.
	var data := part.get_data()
	for index in range(3, data.size(), 4):
		if data[index] < 32:
			data[index] = 0
	part = Image.create_from_data(cell.x, cell.y, false, Image.FORMAT_RGBA8, data)
	var used := part.get_used_rect()
	if used.size.y < 1:
		used = Rect2i(Vector2i.ZERO, cell)
	# Keep the whole cell width to preserve the horizontal pivot through a crouch.
	part = part.get_region(Rect2i(0, used.position.y, cell.x, used.size.y))
	part.generate_mipmaps()
	return {"tex": ImageTexture.create_from_image(part), "height_scale": float(used.size.y) / (float(cell.y) * 0.78), "flip_h": false, "top_clearance": used.position.y, "bottom_clearance": cell.y - used.end.y}
