extends Node
## Small LAN control adapter for the standalone Godot prototype, not campaign persistence.
var server := TCPServer.new()
var peers: Array = []
var session
var port: int = 47920
var tokens: Dictionary = {}
var last_cleanup: int = 0
var available: bool = false
var visual_service: Node

func start(model, requested_port: int = 47920) -> Error:
	session = model
	port = requested_port
	var err = server.listen(port, "0.0.0.0")
	available = err == OK
	return err

func _process(_delta: float) -> void:
	if not available: return
	while server.is_connection_available(): peers.append({"socket": server.take_connection(), "bytes": PackedByteArray(), "at": Time.get_ticks_msec()})
	for i in range(peers.size() - 1, -1, -1):
		var peer = peers[i]
		var socket: StreamPeerTCP = peer.socket
		socket.poll()
		if socket.get_status() in [StreamPeerTCP.STATUS_NONE, StreamPeerTCP.STATUS_ERROR]:
			peers.remove_at(i)
			continue
		if socket.get_status() != StreamPeerTCP.STATUS_CONNECTED: continue
		var available_bytes = socket.get_available_bytes()
		if available_bytes > 0:
			var received = socket.get_partial_data(available_bytes)
			if received[0] == OK: peer.bytes.append_array(received[1])
		if peer.bytes.size() > 32768 or Time.get_ticks_msec() - peer.at > 5000:
			socket.disconnect_from_host()
			peers.remove_at(i)
			continue
		var request = peer.bytes.get_string_from_utf8()
		var split = request.find("\r\n\r\n")
		if split < 0: continue
		var head = request.substr(0, split)
		var length: int = 0
		var headers: Dictionary = {}
		for line in head.split("\r\n"):
			var colon = line.find(":")
			if colon > 0: headers[line.substr(0, colon).to_lower()] = line.substr(colon + 1).strip_edges()
		length = int(headers.get("content-length", "0"))
		if peer.bytes.size() < split + 4 + length: continue
		var first = head.get_slice("\r\n", 0).split(" ")
		if first.size() < 2:
			_reply(socket, 400, {})
		else:
			var origin = str(headers.get("origin", ""))
			var host = str(headers.get("host", ""))
			if not origin.is_empty() and origin != "http://" + host:
				_reply(socket, 403, {"error": "Origen no autorizado"})
			else:
				_route(socket, first[0], first[1], request.substr(split + 4, length))
		peers.remove_at(i)
	if Time.get_ticks_msec() - last_cleanup > 1000:
		last_cleanup = Time.get_ticks_msec()
		for token in tokens.keys():
			if session.clients.has(token) and last_cleanup - session.clients[token].seen > 30000:
				session.leave(token)
				tokens.erase(token)

func _route(socket: StreamPeerTCP, method: String, path: String, body: String) -> void:
	if method == "GET" and path == "/roster":
		var roster = []
		for id in session.catalog.actors: roster.append({"id": id, "label": session.catalog.actors[id].label})
		_reply(socket, 200, roster)
		return
	if method == "GET" and path == "/die.js":
		_reply(socket, 200, FileAccess.get_file_as_string("res://loading/die.js"), "application/javascript; charset=utf-8")
		return
	if method == "GET" and path == "/":
		var html = FileAccess.get_file_as_string("res://loading/mobile.html")
		_reply(socket, 200, html, "text/html; charset=utf-8")
		return
	var payload = JSON.parse_string(body) if not body.is_empty() else {}
	if not payload is Dictionary: payload = {}
	var token = str(payload.get("token", ""))
	if method == "GET" and path.begins_with("/state?token="): token = path.trim_prefix("/state?token=").uri_decode()
	if method == "GET" and path.begins_with("/appearance?token="): token = path.trim_prefix("/appearance?token=").uri_decode()
	if method == "POST" and path == "/join":
		if not tokens.has(token): token = Crypto.new().generate_random_bytes(24).hex_encode()
		if not session.join(token, str(payload.get("character", ""))):
			_reply(socket, 409, {"error": "Personaje no disponible"})
			return
		tokens[token] = true
		_reply(socket, 200, {"token": token, "state": session.state(token)})
		return
	if not tokens.has(token) or not session.clients.has(token):
		_reply(socket, 401, {"error": "Conecta tu personaje"})
		return
	session.clients[token].seen = Time.get_ticks_msec()
	if method == "GET" and path.begins_with("/state?"):
		_reply(socket, 200, session.state(token))
		return
	if path.begins_with("/appearance"):
		if not is_instance_valid(visual_service): _reply(socket,409,{"error":"No hay mapa activo"}); return
		if method=="GET" and path.begins_with("/appearance?token="):
			_reply(socket,200,{"appearance":visual_service.snapshot()}); return
		if method=="POST" and path == "/appearance/preferences":
			var owner: String=str(session.clients[token].character)
			if payload.has("actor") and str(payload.actor)!=owner: _reply(socket,403,{"error":"No controlas ese personaje"}); return
			var values: Dictionary={}
			for key in ["intensity","coverage","treatment"]:
				if payload.has(key): values[key]=payload[key]
			var result: Dictionary=visual_service.appearance_preferences(owner,values)
			_reply(socket,200 if result.ok else 409,{"accepted":result.ok,"appearance":visual_service.snapshot()}); return
		if method=="POST" and path == "/appearance/equip":
			var owner: String=str(session.clients[token].character)
			if payload.has("actor") and str(payload.actor)!=owner: _reply(socket,403,{"error":"No controlas ese personaje"}); return
			var result: Dictionary=visual_service.equip_owned(owner,str(payload.get("slot","")),str(payload.get("item","")))
			_reply(socket,200 if result.ok else 409,{"accepted":result.ok,"reason":result.get("reason",""),"appearance":visual_service.snapshot()}); return
		_reply(socket,404,{"error":"Acción visual desconocida"}); return
	var accepted = false
	if method == "POST":
		match path:
			"/ready":
				session.clients[token].ready = true
				accepted = true
			"/roll": accepted = session.roll(token, str(payload.get("entry", "")))
			"/continue": accepted = session.continue_client(token, str(payload.get("entry", "")))
			"/leave":
				session.leave(token)
				tokens.erase(token)
				accepted = true
	_reply(socket, 200 if accepted else 409, {"accepted": accepted, "state": session.state(token)})

func _reply(socket: StreamPeerTCP, code: int, value, content_type: String = "application/json; charset=utf-8") -> void:
	var text = value if value is String else JSON.stringify(value)
	var bytes = str(text).to_utf8_buffer()
	var header = "HTTP/1.1 %d Response\r\nContent-Type: %s\r\nContent-Length: %d\r\nCache-Control: no-store\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n" % [code, content_type, bytes.size()]
	socket.put_data(header.to_utf8_buffer())
	socket.put_data(bytes)

func _exit_tree() -> void:
	server.stop()
	for peer in peers: peer.socket.disconnect_from_host()
