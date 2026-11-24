extends RefCounted
## Keep the accessible tooltip text on each native control. The sheet places
## its own reading card outside the hovered row instead of opening a second OS popup.
class HintButton extends Button:
	func _get_tooltip(_position: Vector2) -> String: return ""
class HintLabel extends Label:
	func _get_tooltip(_position: Vector2) -> String: return ""
class HintPanel extends PanelContainer:
	func _get_tooltip(_position: Vector2) -> String: return ""
