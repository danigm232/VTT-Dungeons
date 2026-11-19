extends RefCounted
## Stable semantic keys shared by Summary, Combat, spells and their detail view.
## UI pictograms only: these are not equipable layers or alternate character art.
const EXACT={
	"shortsword":"short-sword", "short-sword":"short-sword", "magic-missile":"arcane-missiles",
	"burning-hands":"burning-hands", "shield":"arcane-barrier", "detect-magic":"magic-detection",
	"sacred-flame":"sacred-flame", "ray-of-frost":"frost", "healing-word":"healing",
	"bless":"bless", "shield-of-faith":"holy", "mace":"mace", "handaxe":"handaxe",
	"throw-handaxe":"handaxe", "dagger":"dagger", "throw-dagger":"dagger", "shortbow":"shortbow",
	"help":"help", "dodge":"dodge", "disengage":"disengage", "dash":"dash", "hide":"hide",
	"ready":"initiative", "search":"eye", "study":"book", "influence":"star", "use-object":"backpack", "improvise":"hand"
}
const PAINTED=["short-sword","arcane-missiles","burning-hands","arcane-barrier","magic-detection","sacred-flame","help","dodge","disengage","dash","hide","concentration"]
const ALIASES={"espada corta":"short-sword","misil mágico":"arcane-missiles","proyectil mágico":"arcane-missiles","manos ardientes":"burning-hands","escudo de fe":"holy","detectar magia":"magic-detection","escudo":"arcane-barrier","llama sagrada":"sacred-flame","rayo de escarcha":"frost","palabra de curación":"healing","bendición":"bless","maza":"mace","hacha":"handaxe","arco":"shortbow","daga":"dagger"}
static func key(action: Dictionary) -> String:
	var id=str(action.get("id",action.get("action_id","")))
	if EXACT.has(id): return EXACT[id]
	var name=str(action.get("label",action.get("name",""))).to_lower()
	for alias in ALIASES:
		if name.contains(alias): return ALIASES[alias]
	if action.get("healing",false): return "healing"
	var element=str(action.get("damageType",""))
	if element in ["cold","frío"]: return "frost"
	if element in ["fire","fuego"]: return "sacred-flame"
	if action.get("concentration",false): return "concentration"
	return "magic" if action.get("magical",false) or action.has("resource") else "sword"
