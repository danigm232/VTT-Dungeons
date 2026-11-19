extends Node
## Optional native viewer transport over the existing authenticated LAN adapter.
## Does not implement movement authority or campaign persistence.
var service: Node
var request: HTTPRequest
var base_url:=""
var session_token:=""
var accumulator:=0.0
var pending:=false
var last_result: Dictionary={}
func _ready() -> void:
	request=HTTPRequest.new(); add_child(request); request.request_completed.connect(_received)
func connect_authority(url: String,token: String) -> bool:
	if not url.begins_with("http://") and not url.begins_with("https://"): return false
	base_url=url.trim_suffix("/"); session_token=token; accumulator=1; return true
func _process(delta: float) -> void:
	if base_url.is_empty() or pending: return
	accumulator+=delta
	if accumulator>=.5:
		accumulator=0; pending=request.request(base_url+"/appearance?token="+session_token.uri_encode())==OK
func equip(slot: String,item_id: String) -> bool:
	if pending or base_url.is_empty(): return false
	var payload: String=JSON.stringify({"token":session_token,"slot":slot,"item":item_id})
	pending=request.request(base_url+"/appearance/equip",["Content-Type: application/json"],HTTPClient.METHOD_POST,payload)==OK
	return pending
func preferences(values: Dictionary) -> bool:
	if pending or base_url.is_empty(): return false
	var payload: Dictionary=values.duplicate(); payload.token=session_token
	pending=request.request(base_url+"/appearance/preferences",["Content-Type: application/json"],HTTPClient.METHOD_POST,JSON.stringify(payload))==OK
	return pending
func _received(result: int,code: int,_headers: PackedStringArray,body: PackedByteArray) -> void:
	pending=false
	if result!=HTTPRequest.RESULT_SUCCESS or code!=200: last_result={"ok":false,"http":code}; return
	var value=JSON.parse_string(body.get_string_from_utf8())
	if not value is Dictionary: return
	var snapshot: Dictionary=value.get("appearance",{})
	if service and snapshot.get("catalogue","")==preload("res://characters/registry.gd").data().revision: last_result=service.restore_state(snapshot)
	else: last_result={"ok":false,"reason":"La biblioteca del visor no coincide con la autoridad"}
