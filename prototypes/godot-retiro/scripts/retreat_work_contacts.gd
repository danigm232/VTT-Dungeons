extends RefCounted
## Landmark coordinates in the occupied alpha bounds of the original sprites.

const Anchors = preload("res://characters/anchors.gd")
const PRIMARY_BY_CLIP := {
	"sw-frub-retreat-lift-w": [
		Vector2(.14, .88), Vector2(.14, .78), Vector2(.15, .70), Vector2(.15, .62),
		Vector2(.14, .58), Vector2(.15, .54), Vector2(.15, .52), Vector2(.15, .48),
	],
	"sw-zark-retreat-lift-e": [
		Vector2(.91, .91), Vector2(.91, .80), Vector2(.92, .71), Vector2(.92, .64),
		Vector2(.91, .62), Vector2(.91, .59), Vector2(.91, .55), Vector2(.92, .49),
	],
	"sw-varnoth-retreat-stonework-n": [
		Vector2(.92, .37), Vector2(.95, .31), Vector2(.79, .10), Vector2(.89, .36),
		Vector2(.93, .37), Vector2(.94, .32), Vector2(.93, .37), Vector2(.94, .39),
	],
	"sw-myla-retreat-metalwork-n": [
		Vector2(.91, .43), Vector2(.94, .34), Vector2(.89, .19), Vector2(.94, .34),
		Vector2(.94, .40), Vector2(.94, .39), Vector2(.94, .40), Vector2(.94, .41),
	],
	"sw-laylee-retreat-woodwork-n": [
		Vector2(.88, .41), Vector2(.92, .39), Vector2(.89, .21), Vector2(.93, .29),
		Vector2(.93, .40), Vector2(.93, .37), Vector2(.92, .42), Vector2(.91, .43),
	],
	"sw-varnoth-retreat-masonry-rear": [
		Vector2(.93, .57), Vector2(.94, .51), Vector2(.94, .60), Vector2(.94, .40),
		Vector2(.93, .32), Vector2(.94, .33), Vector2(.93, .53), Vector2(.93, .57),
	],
	"sw-myla-retreat-tinker-rear": [
		Vector2(.82, .32), Vector2(.94, .34), Vector2(.94, .28), Vector2(.92, .30),
		Vector2(.94, .24), Vector2(.94, .30), Vector2(.94, .31), Vector2(.94, .34),
	],
	"sw-laylee-retreat-sort-rear": [
		Vector2(.81, .40), Vector2(.91, .37), Vector2(.95, .31), Vector2(.95, .30),
		Vector2(.93, .31), Vector2(.95, .36), Vector2(.82, .39), Vector2(.82, .39),
	],
	"sw-zark-retreat-tidy-rear": [
		Vector2(.82, .41), Vector2(.86, .36), Vector2(.94, .34), Vector2(.95, .34),
		Vector2(.93, .36), Vector2(.90, .39), Vector2(.85, .40), Vector2(.84, .41),
	],
	"sw-rix-retreat-sweep-n": [
		Vector2(.19, .27), Vector2(.14, .27), Vector2(.11, .31),
		Vector2(.84, .27), Vector2(.84, .27), Vector2(.69, .34),
	],
	"sw-zark-retreat-wipe-e": [
		Vector2(.90, .285), Vector2(.92, .275), Vector2(.93, .265),
		Vector2(.92, .270), Vector2(.91, .285), Vector2(.91, .290),
	],
}
const SWEEP_SUPPORT := [
	Vector2(.06, .44), Vector2(.06, .44), Vector2(.06, .46),
	Vector2(.92, .45), Vector2(.91, .45), Vector2(.77, .47),
]
const SIDE_PRIMARY := {
	"varnoth": Vector2(.94, .45),
	"myla": Vector2(.92, .43),
	"laylee": Vector2(.92, .45),
	"rix": Vector2(.91, .38),
	"frub": Vector2(.91, .45),
	"zark": Vector2(.92, .41),
}

static func hands(actor: Node3D) -> Array[Vector3]:
	var definition: String = actor.active_clip_definition
	var measured: Array = PRIMARY_BY_CLIP.get(definition, [])
	var primary := Vector2(.72, .46)
	var support := Vector2(.38, .54)
	if not measured.is_empty():
		var index: int = actor.anim_frame_idx
		if actor._work_prop == "unload" and "-retreat-lift-" in definition:
			index = measured.size() - 1 - index
		primary = measured[clampi(index, 0, measured.size() - 1)]
		if "-retreat-lift-" in definition:
			support = Vector2(primary.x + (0.08 if definition.ends_with("-w") else -0.075), primary.y - 0.06)
		if definition == "sw-rix-retreat-sweep-n":
			support = SWEEP_SUPPORT[clampi(actor.anim_frame_idx, 0, SWEEP_SUPPORT.size() - 1)]
		if definition == "sw-varnoth-retreat-stonework-n":
			support = Vector2(.065, .33)
	elif definition.ends_with("-work-e") or definition.ends_with("-work-w") or definition.ends_with("-carry-e") or definition.ends_with("-carry-w"):
		primary = SIDE_PRIMARY.get(actor.resident_id, Vector2(.92, .45))
		support = Vector2(primary.x - 0.22, primary.y + 0.11)
		if definition.ends_with("-w"):
			primary.x = 1.0 - primary.x
			support.x = 1.0 - support.x
	elif definition.ends_with("-work-s"):
		primary.x = 0.36
		support.x = 0.65
	return [
		actor.to_global(Anchors.local_point(actor, primary, 0.014)),
		actor.to_global(Anchors.local_point(actor, support, 0.014)),
	]
