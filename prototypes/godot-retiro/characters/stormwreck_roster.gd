extends RefCounted
const Registry=preload("res://characters/registry.gd")
static func ids() -> Array[String]:
	var found: Dictionary={}
	for id in Registry.data().characters:
		if Registry.data().characters[id].get("campaign","")=="stormwreck-isle": found[id]=true
	for animation in Registry.data().get("animations",{}).values():
		if animation.get("campaign","")=="stormwreck-isle": found[animation.character]=true
	var result: Array[String]=[]
	for id in found: result.append(str(id))
	result.sort()
	return result
static func idle_direction(id: String) -> String:
	var definition:=Registry.character(id)
	for animation in Registry.data().get("animations",{}).values():
		if animation.character==definition.id and animation.action=="idle" and animation.get("campaign","")=="stormwreck-isle": return animation.direction
	return str(definition.get("source",{}).get("directions",["se"])[0])
