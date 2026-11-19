extends Control
## Inward fan attached to the original action control; no enclosing window.
var reduced_motion:=false
var origin:=Vector2.ZERO
var points: Array[Vector2]=[]
func _ready() -> void:
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	pivot_offset=origin
	if not reduced_motion:
		modulate.a=0; scale=Vector2.ONE*.78
		var tween:=create_tween().set_ignore_time_scale(true).set_parallel(true)
		tween.tween_property(self,"modulate:a",1.0,.16)
		tween.tween_property(self,"scale",Vector2.ONE,.24).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
func _draw() -> void:
	for point in points:
		var direction: Vector2=(point-origin).normalized()
		draw_line(origin+direction*40,point-direction*35,Color(.72,.64,.42,.20),1,true)
		draw_circle(point-direction*35,2,Color(.84,.75,.51,.4))
