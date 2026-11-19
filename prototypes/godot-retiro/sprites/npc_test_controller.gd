extends Node
var rules=preload("res://combat/combat_rules.gd").new()
var bodies: Dictionary={}
var ui: Node
func token(id: String) -> Node3D: return bodies.get(id)
