extends Control
## A floating circular guide, never an enclosing window.
var reduced_motion:=false
func _ready() -> void:
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	pivot_offset=size*.5
	if not reduced_motion:
		modulate.a=0; scale=Vector2.ONE*.78
		var tween:=create_tween().set_ignore_time_scale(true).set_parallel(true)
		tween.tween_property(self,"modulate:a",1.0,.16)
		tween.tween_property(self,"scale",Vector2.ONE,.24).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
func _draw() -> void:
	var center:=size*.5
	draw_arc(center,102,0,TAU,96,Color(.72,.64,.42,.22),1,true)
	draw_arc(center,30,0,TAU,48,Color(.84,.75,.51,.28),1,true)
