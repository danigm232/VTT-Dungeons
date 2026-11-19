extends SceneTree
## Lossless import: removes detached collage fragments and fixes one pivot and
## one pixel scale per atlas. Original generated PNGs are never modified.
const CELL := 192
const ALPHA := 128

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://sprites/art-sources.json"))
	var output := {"version": 1, "minimum_movement_frames": 8, "atlases": {}, "originals_preserved": true}
	var only := ""
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--only="): only = argument.trim_prefix("--only=")
	if not only.is_empty() and FileAccess.file_exists("res://sprites/frames.json"):
		output = JSON.parse_string(FileAccess.get_file_as_string("res://sprites/frames.json"))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://sprites/baked"))
	for key in manifest.atlases:
		if not only.is_empty() and not key.begins_with(only): continue
		var spec: Dictionary = manifest.atlases[key]
		var image := Image.load_from_file(ProjectSettings.globalize_path("res://sprites/" + spec.file))
		if image == null or image.is_empty(): push_error("Sprite source missing: " + key); quit(1); return
		image.convert(Image.FORMAT_RGBA8)
		var rows: Array = spec.get("row_edges", _row_edges(image))
		var parts: Array = _complete_poses(image, rows, key)
		if parts.size() != 64: quit(1); return
		var heights: Array = []
		var issues: Array = []
		for index in range(parts.size()):
			var used: Rect2i = parts[index].bounds
			if used.position.x == 0 or used.end.x == image.get_width() or used.position.y == 0 or used.end.y == image.get_height(): issues.append({"row": int(index / 8), "column": index % 8, "kind": "source_image_edge"})
			if index < 8: heights.append(used.size.y)
		heights.sort()
		# Use a standing ready pose for actions/attacks. A crouched running pose
		# would otherwise make every head and torso grow in the utility clips.
		var standing_row: bool = key.ends_with("-actions") or key.ends_with("-reactions") or key.ends_with("-utility")
		var reference_index := 56 if standing_row else 0
		var reference_height := float(spec.get("reference_height", parts[reference_index].image.get_height() if standing_row or key.ends_with("-attack") or key.ends_with("-unarmed") else (heights[3] + heights[4]) * .5))
		var cell_size := CELL
		for part in parts:
			cell_size = maxi(cell_size, int(ceil((maxf(part.pivot_x, part.image.get_width() - part.pivot_x) * 2 + 12) / 16)) * 16)
			cell_size = maxi(cell_size, int(ceil((part.image.get_height() + 12.0) / 16)) * 16)
		if cell_size > int(spec.get("max_cell",320)):
			push_error("Overlapping source poses in " + key); quit(1); return
		var atlas := Image.create(cell_size * 8, cell_size * 8, false, Image.FORMAT_RGBA8)
		var frames: Array = []
		for index in range(parts.size()):
			var part: Dictionary = parts[index]
			var size: Vector2i = part.image.get_size()
			var origin := Vector2i((index % 8) * cell_size, int(index / 8) * cell_size)
			# Preserve the horizontal centre of the authored cell, not the centre
			# of a swinging hand. Feet share a baseline; no per-frame stretching.
			var x := int(cell_size * .5 - part.pivot_x)
			var y := cell_size - 6 - size.y
			if x < 3 or x + size.x > cell_size - 3 or y < 3:
				push_error("Sprite does not fit padded atlas: " + key + " " + str(index) + " size=" + str(size) + " pivot=" + str(part.pivot_x)); quit(1); return
			atlas.blit_rect(part.image, Rect2i(Vector2i.ZERO, size), origin + Vector2i(x, y))
			frames.append({"x": origin.x, "y": origin.y, "width": cell_size, "height": cell_size, "height_scale": cell_size / reference_height, "source_bounds": [part.bounds.position.x, part.bounds.position.y, size.x, size.y], "clearance": [x, y, cell_size - x - size.x, 6]})
		var file: String = "baked/" + key + ".png"
		atlas.save_png(ProjectSettings.globalize_path("res://sprites/" + file))
		output.atlases[key] = {"file": file, "frames": frames, "row_edges": rows, "reference_height": reference_height, "source_issues": issues}
		print("BAKED ", key, " 64 frames; source edge notices=", issues.size())
	FileAccess.open("res://sprites/frames.json", FileAccess.WRITE).store_string(JSON.stringify(output, "\t"))
	print("SPRITE BAKE COMPLETE ", output.atlases.size())
	quit()

func _row_edges(image: Image) -> Array:
	var data := image.get_data()
	var width := image.get_width()
	var height := image.get_height()
	var counts := PackedInt32Array()
	counts.resize(height)
	for y in range(height):
		for x in range(width):
			if data[(y * width + x) * 4 + 3] >= ALPHA: counts[y] += 1
	var edges: Array = [0]
	for row in range(1, 8):
		var expected := int(float(row) * height / 8)
		var best := expected
		var score := INF
		for y in range(maxi(edges[-1] + 16, expected - height / 16), mini(height - 16, expected + height / 16)):
			var next_score := counts[y] * 1000.0 + absf(y - expected)
			if next_score < score: score = next_score; best = y
		edges.append(best)
	edges.append(height)
	return edges

## Find complete silhouettes on the WHOLE sheet before assigning their cells.
## This retains an elbow/boot that crosses an approximate grid line without
## importing any pixels from the neighbouring character.
func _complete_poses(image: Image, rows: Array, key: String) -> Array:
	var width := image.get_width()
	var height := image.get_height()
	var data := image.get_data()
	var labels := PackedInt32Array()
	labels.resize(width * height)
	var components: Array = []
	for seed in range(labels.size()):
		if labels[seed] or data[seed * 4 + 3] < ALPHA: continue
		var id := components.size() + 1
		var queue := PackedInt32Array([seed])
		labels[seed] = id
		var head := 0
		var min_x := width
		var min_y := height
		var max_x := 0
		var max_y := 0
		var sum_x := 0.0
		var sum_y := 0.0
		while head < queue.size():
			var current := queue[head]
			head += 1
			var x := current % width
			var y := int(current / width)
			min_x = mini(min_x, x); max_x = maxi(max_x, x)
			min_y = mini(min_y, y); max_y = maxi(max_y, y)
			sum_x += x; sum_y += y
			for next in [current - 1 if x > 0 else -1, current + 1 if x + 1 < width else -1, current - width if y > 0 else -1, current + width if y + 1 < height else -1]:
				if next >= 0 and not labels[next] and data[next * 4 + 3] >= ALPHA:
					labels[next] = id
					queue.append(next)
		components.append({"id": id, "size": queue.size(), "centre": Vector2(sum_x / queue.size(), sum_y / queue.size()), "bounds": Rect2i(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1)})
	var primary := {}
	for component in components:
		if component.size < 200: continue
		var row := 7
		for index in range(8):
			if component.centre.y < rows[index + 1]: row = index; break
		var column := clampi(int(component.centre.x * 8 / width), 0, 7)
		var slot := row * 8 + column
		if not primary.has(slot) or component.size > primary[slot].size: primary[slot] = component
	if primary.size() != 64:
		push_error("Expected 64 complete sprite bodies in " + key + "; found " + str(primary.size()))
		return []
	var primary_ids := {}
	var selected := {}
	for slot in primary:
		primary_ids[primary[slot].id] = true
		selected[slot] = [primary[slot].id]
	for component in components:
		if primary_ids.has(component.id) or component.size < 24: continue
		var best := -1
		var distance := INF
		for slot in primary:
			var candidate: float = component.centre.distance_squared_to(primary[slot].centre)
			if candidate < distance: distance = candidate; best = slot
		if best >= 0 and component.size >= primary[best].size * .025:
			selected[best].append(component.id)
	var result: Array = []
	for slot in range(64):
		var bounds: Rect2i = primary[slot].bounds
		for component in components:
			if component.id in selected[slot]: bounds = bounds.merge(component.bounds)
		bounds = bounds.grow(1).intersection(Rect2i(0, 0, width, height))
		var crop := image.get_region(bounds)
		var cropped := crop.get_data()
		for y in range(bounds.size.y):
			for x in range(bounds.size.x):
				var source_index := (bounds.position.y + y) * width + bounds.position.x + x
				var keep: bool = labels[source_index] in selected[slot]
				if not keep and data[source_index * 4 + 3] >= 32:
					for next in [source_index - 1 if bounds.position.x + x > 0 else -1, source_index + 1 if bounds.position.x + x + 1 < width else -1, source_index - width if bounds.position.y + y > 0 else -1, source_index + width if bounds.position.y + y + 1 < height else -1]:
						if next >= 0 and labels[next] in selected[slot]: keep = true; break
				if not keep: cropped[(y * bounds.size.x + x) * 4 + 3] = 0
		crop = Image.create_from_data(bounds.size.x, bounds.size.y, false, Image.FORMAT_RGBA8, cropped)
		result.append({"image": crop, "bounds": bounds, "pivot_x": (slot % 8 + .5) * width / 8.0 - bounds.position.x})
	return result

