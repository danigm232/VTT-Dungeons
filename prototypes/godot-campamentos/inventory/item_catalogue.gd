extends RefCounted
static var _icons: Dictionary = {}
const MATCHES := [
	["torch", "antorcha|brea"], ["lantern", "farol|linterna"], ["potion", "pocion|elixir"],
	["dagger", "daga|cuchillo"], ["shortbow", "arco"], ["arrows", "flecha|virote|municion"],
	["handaxe", "hacha"], ["mace", "maza"], ["sword", "espada|estoque"], ["spear", "lanza|jabalina"],
	["shield", "escudo"], ["chainmail", "cota|malla"], ["leather", "armadura|cuero"], ["robe", "tunica|ropa"],
	["cloak", "capa|capucha"], ["boots", "bota"], ["gloves", "guante"], ["helmet", "casco|yelmo"],
	["ring", "anillo"], ["amulet", "amuleto|simbolo|sagrado"], ["book", "libro|conjuro|grimorio"],
	["scroll", "pergamino|documento|carta"], ["map", "mapa"], ["compass", "brujula"], ["key", "llave"],
	["rope", "cuerda|cordel"], ["tools", "herramienta|ladron|ganzua"], ["hammer", "martillo"],
	["crowbar", "palanqueta"], ["tinderbox", "yesquero|pedernal"], ["waterskin", "cantimplora|agua"],
	["rations", "racion|comida|pan"], ["bottle", "vino|botella"], ["gem", "gema|joya|tesoro"],
	["gold", "moneda|oro|gold"], ["bedroll", "manta|saco de dormir"], ["backpack", "mochila"],
	["feather", "pluma"], ["ink", "tinta"], ["components", "componente"], ["chest", "cofre|alijo|stash"]
]

static func normalized(text: String) -> String:
	var result := text.to_lower()
	for pair in [["á", "a"], ["é", "e"], ["í", "i"], ["ó", "o"], ["ú", "u"]]:
		result = result.replace(pair[0], pair[1])
	return result

static func item_icon_id(key: String, item: Dictionary = {}) -> String:
	var text := normalized(key + " " + str(item.get("name", "")))
	for pair in MATCHES:
		var expression := RegEx.new()
		expression.compile(pair[1])
		if expression.search(text):
			return pair[0]
	return "other"

static func category(key: String, item: Dictionary) -> String:
	var icon := item_icon_id(key, item)
	if icon in ["dagger", "shortbow", "arrows", "handaxe", "mace", "sword", "spear"]:
		return "weapons"
	if icon in ["shield", "chainmail", "leather", "robe", "cloak", "boots", "gloves", "helmet", "ring", "amulet"]:
		return "armor"
	if icon in ["potion", "rations", "waterskin", "bottle"]:
		return "consumables"
	if icon in ["gold", "gem", "chest"]:
		return "treasure"
	return "gear"

static func icon(id: String) -> Texture2D:
	if _icons.has(id):
		return _icons[id]
	var path := "res://inventory/icons/%s.svg" % id
	if not FileAccess.file_exists(path):
		path = "res://inventory/icons/other.svg"
	var image := Image.new()
	if image.load_svg_from_string(FileAccess.get_file_as_string(path)) != OK:
		return null
	var texture := ImageTexture.create_from_image(image)
	_icons[id] = texture
	return texture
