extends RefCounted
## Explicit target contract shared by UI and rules. Unknown directed abilities
## remain creature-targeted; a guided resolution never implies target-free.
const PERSONAL := ["detect-magic","shield","light-torch","harpy-song","drink-potion","torch","channel-life","arcane-recovery","steady-aim","short-rest"]
const ALLIES := ["healing-word","bless","shield-of-faith","feather-fall","stabilize"]
const BASIC := {
	"dash":"none","disengage":"none","dodge":"none","hide":"none","ready":"none",
	"search":"point","study":"none","improvise":"none","withdraw":"none",
	"end-concentration":"self","help":"ally","influence":"creature","use-object":"object",
	"grapple":"enemy","shove":"enemy","drink-potion":"self","stabilize":"ally","short-rest":"none","end-turn":"none",
	"talk":"none","pick-lock":"object","disarm-trap":"object",
	"climb":"point","swim":"point","jump":"none","torch":"self","sit":"none","prone":"none"
}
const LABELS := {"none":"Sin objetivo","self":"Sobre ti","point":"Casilla / área","ally":"Aliado o tú","enemy":"Enemigo","creature":"Criatura","object":"Objeto"}
static func mode(action: Dictionary) -> String:
	if action.has("target_mode"): return str(action.target_mode)
	var id:=str(action.get("id","")).trim_suffix("-exploration")
	if id in PERSONAL: return "self"
	if id in ALLIES or action.get("healing",false): return "ally"
	if action.get("target","")=="object": return "object"
	if action.get("targeting","")=="point" or action.get("target","")=="point": return "point"
	if BASIC.has(id): return BASIC[id]
	return "creature" if action.get("resolution","")=="guided" else "enemy"
static func label(action: Dictionary) -> String: return LABELS.get(mode(action),"Criatura")
static func geometry(action: Dictionary) -> Dictionary:
	var id:=str(action.get("id","")).trim_suffix("-exploration")
	match id:
		"burning-hands": return {"shape":"cone","radius":4.5,"placement":"direction"}
		"fog-cloud": return {"shape":"circle","radius":6.0,"placement":"point"}
		"detect-magic": return {"shape":"circle","radius":9.0,"placement":"self"}
		"harpy-song": return {"shape":"circle","radius":90.0,"placement":"self"}
		"search": return {"shape":"cell","radius":.75,"placement":"point"}
	return {"shape":"cell","radius":.75,"placement":"point"} if mode(action)=="point" else {}

static func footprint(action: Dictionary,origin: Vector3,point: Vector3) -> PackedVector3Array:
	var spec:=geometry(action); var result:=PackedVector3Array()
	if spec.is_empty(): return result
	var radius: float=spec.radius
	var center:=origin if spec.placement=="self" else point
	if spec.shape=="cone":
		var forward:=point-origin; forward.y=0
		if forward.length_squared()<.001: forward=Vector3.FORWARD
		forward=forward.normalized(); var side:=Vector3(-forward.z,0,forward.x)
		result.append_array([origin,origin+forward*radius+side*radius*.5,origin+forward*radius-side*radius*.5])
	elif spec.shape=="circle":
		for i in range(64): result.append(center+Vector3(cos(TAU*i/64.0)*radius,0,sin(TAU*i/64.0)*radius))
	else:
		var x:=floorf(center.x/1.5)*1.5; var z:=floorf(center.z/1.5)*1.5
		for offset in [Vector3.ZERO,Vector3(1.5,0,0),Vector3(1.5,0,1.5),Vector3(0,0,1.5)]: result.append(Vector3(x,center.y,z)+offset)
	return result
static func accepts(action: Dictionary,actor: Dictionary,target: Dictionary) -> bool:
	if target.is_empty(): return false
	match mode(action):
		"self": return actor.id==target.id
		"ally": return actor.kind==target.kind
		# Offensive actions prefer enemies in the UI. Preserve the table's
		# existing ability to deliberately attack another creature or oneself.
		"enemy": return true
	return true
