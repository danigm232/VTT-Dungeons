extends SceneTree
func _initialize() -> void:
	var inspector=load("res://characters/inspector.gd").new()
	root.add_child.call_deferred(inspector)
