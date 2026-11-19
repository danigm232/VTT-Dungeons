extends RefCounted
const IDS := ["obsidian", "parchment", "astral"]
const PRESETS := {
	"obsidian": {"name":"Obsidiana y latón", "description":"Piedra oscura, metal grabado y luz de aventura.", "base":"#151d21", "surface":"#202c2e", "hover":"#34403d", "edge":"#756247", "accent":"#dbb876", "ink":"#ece6d9", "muted":"#a9b3ae", "danger":"#ed9384", "active":"#51442d"},
	"parchment": {"name":"Crónica de pergamino", "description":"Papel cálido y tinta de un cuaderno de campaña.", "base":"#e7dcc0", "surface":"#daceb0", "hover":"#cbb993", "edge":"#9a8057", "accent":"#765025", "ink":"#302b24", "muted":"#625747", "danger":"#9c342e", "active":"#c9b484"},
	"astral": {"name":"Atlas astral", "description":"Azul de medianoche, plata y mapas celestes.", "base":"#142236", "surface":"#20354b", "hover":"#324e64", "edge":"#5e7892", "accent":"#b6d1e7", "ink":"#e3edf5", "muted":"#a4bacb", "danger":"#f3a8a9", "active":"#36566b"}
}
static var _textures: Dictionary = {}
static func data(id: String) -> Dictionary:
	return PRESETS.get(id, PRESETS.obsidian)
static func color(id: String, key: String) -> Color:
	return Color(data(id)[key])
static func frame(id: String) -> StyleBoxTexture:
	if not _textures.has(id):
		var svg := FileAccess.get_file_as_string("res://dm_style/art/" + id + "-frame.svg")
		var image := Image.new()
		image.load_svg_from_string(svg)
		_textures[id] = ImageTexture.create_from_image(image)
	var result := StyleBoxTexture.new()
	result.texture = _textures[id]
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		result.set_texture_margin(side, 24)
		result.set_content_margin(side, 14 if side in [SIDE_LEFT, SIDE_RIGHT] else 12)
	return result
static func trim(id: String) -> StyleBoxTexture:
	var key := id + "-trim"
	if not _textures.has(key):
		var image := Image.new()
		image.load_svg_from_string(FileAccess.get_file_as_string("res://dm_style/art/" + key + ".svg"))
		_textures[key] = ImageTexture.create_from_image(image)
	var result := StyleBoxTexture.new(); result.texture = _textures[key]
	result.draw_center = false
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]: result.set_texture_margin(side, 24)
	return result
static func flat(id: String, fill: String, border: String, x: float = 10, y: float = 6) -> StyleBoxFlat:
	var result := StyleBoxFlat.new()
	result.bg_color = color(id, fill)
	result.border_color = color(id, border)
	result.set_border_width_all(1)
	result.set_corner_radius_all(3)
	result.content_margin_left = x; result.content_margin_right = x
	result.content_margin_top = y; result.content_margin_bottom = y
	return result
