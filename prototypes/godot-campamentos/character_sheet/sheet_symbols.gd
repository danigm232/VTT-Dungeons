extends RefCounted
## Raster UI symbols have optically centred, padded cells. Other item symbols
## retain the inventory catalogue's semantic IDs and use the same clear margin.
const ROOT="res://character_sheet/art/foundation/"
const LOCAL_VECTORS=["transfer","arrows","robe","rations","ink"]
static var entries: Dictionary={}
static var atlas: Image
static var textures: Dictionary={}

static func catalogue() -> Dictionary:
	if entries.is_empty():
		entries=JSON.parse_string(FileAccess.get_file_as_string(ROOT+"catalogue.json")).symbols
	return entries

static func brass_combat_symbol(svg: String) -> String:
	# The tactical palette is designed for a black HUD. Engrave the same paths
	# twice so they read on both pale vellum and the dark action tiles.
	var body=svg.substr(svg.find(">")+1).trim_suffix("</svg>").strip_edges().trim_suffix("</svg>")
	var code_ticks=RegEx.new()
	code_ticks.compile('<path d="M[0-9.]+ 25v2"\\s*/>')
	body=code_ticks.sub(body,"",true)
	return '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="-3 -3 30 30"><g fill="none" stroke-linejoin="round" stroke-linecap="round"><g stroke="#50351e" stroke-width="2.8">'+body+'</g><g stroke="#edc775" stroke-width="1.15">'+body+'</g></g></svg>'

static func icon(key: String) -> Texture2D:
	if textures.has(key): return textures[key]
	var image: Image
	if catalogue().has(key):
		if atlas==null: atlas=Image.load_from_file(ProjectSettings.globalize_path(ROOT+"symbols.png"))
		var index=int(entries[key].cell)
		image=atlas.get_region(Rect2i(index%8*96,floori(index/8.0)*96,96,96))
	else:
		var combat=key.begins_with("combat/")
		var id=key.trim_prefix("combat/")
		var file=("res://combat/icons/" if combat else "res://inventory/icons/")+id+".svg"
		if id in LOCAL_VECTORS and not combat: file=ROOT+id+".svg"
		if not id.is_valid_filename() or not FileAccess.file_exists(file): file="res://inventory/icons/other.svg"
		var svg=FileAccess.get_file_as_string(file)
		if combat: svg=brass_combat_symbol(svg)
		var raw=Image.new()
		if raw.load_svg_from_string(svg,1.5)!=OK: return null
		var used=raw.get_used_rect()
		if not used.has_area(): return null
		raw=raw.get_region(used)
		var scale=84.0/maxi(raw.get_width(),raw.get_height())
		raw.resize(maxi(1,roundi(raw.get_width()*scale)),maxi(1,roundi(raw.get_height()*scale)),Image.INTERPOLATE_LANCZOS)
		image=Image.create(96,96,false,Image.FORMAT_RGBA8)
		image.blit_rect(raw,Rect2i(Vector2i.ZERO,raw.get_size()),(Vector2i(96,96)-raw.get_size())/2)
	image.generate_mipmaps()
	textures[key]=ImageTexture.create_from_image(image)
	textures[key].resource_name=key
	return textures[key]
