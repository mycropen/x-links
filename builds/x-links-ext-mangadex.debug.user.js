// ==UserScript==
// @name        X-links Extension - Mangadex (debug)
// @namespace   mycropen
// @author      mycropen
// @version     1.6.2.-0xDB
// @description Linkify and format chapter links for Mangadex, Dynasty-Scans, comick.io and bato.to
// @include     http://boards.4chan.org/*
// @include     https://boards.4chan.org/*
// @include     http://boards.4channel.org/*
// @include     https://boards.4channel.org/*
// @include     http://8ch.net/*
// @include     https://8ch.net/*
// @include     https://archived.moe/*
// @include     https://boards.fireden.net/*
// @include     http://desuarchive.org/*
// @include     https://desuarchive.org/*
// @include     http://fgts.jp/*
// @include     https://fgts.jp/*
// @include     http://boards.38chan.net/*
// @include     http://forums.e-hentai.org/*
// @include     https://forums.e-hentai.org/*
// @include     https://meguca.org/*
// @homepage    https://dnsev-h.github.io/x-links/
// @supportURL  https://github.com/mycropen/x-links/issues
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA4klEQVR4Ae2ZoQ7CMBRF+VIMBjGDwSAwmImZGcQUYoYPq32fAPK8LCSleZCmzb3JcUtzD+ndBDslHuVVQr0zJdCAQHoaQEggTQYj9C8ggRVCAqPBDfoUkMBq8HAs4J8vLZ2uEH/VSqC6QEZmMbg7ZgiWzu2wJQEJZGRmgwn+cNf9jxXcRn0BCZA/33VKb848OfbQioAEikqni+MMpRugdGADFQQkEL7rlN7c3QG+2EZgrPUEJPD7V+RgcHQcoGAXDQlIoLx0/kxKhwbahoAEPn5ZYwKU7ldAAvqLSQLNRlEU5Q1O5fOjZV4u4AAAAABJRU5ErkJggg==
// @icon64      data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAOVBMVEUBAAAAAADmce/ml+/mje/mku/mhO/mY+/mbO/mdu/me+/mie/mXu/mm+/mpe/mf+/mqu/maO/moe9+hYmYAAAAAXRSTlMAQObYZgAAAJRJREFUeF7t1zkOAzEMBEFRe9+2//9YtzOCIOR8oEoX7GCgZEtXigWtb8qBF36ywIgD8gHcyAIHZqgHbnxwwRCPH1igEvCRCwMmZMd+cKVAjEwY0RpvgDkKAe/feANmVJxQC8TjHRssqDBHI5CPt6FihR8zjicQaD6eFW8sMEcxEI99fEG2vFrgwY4scEI/0P8X0HVf06IrwbJZHiwAAAAASUVORK5CYII=
// @grant       none
// @run-at      document-start
// ==/UserScript==
(function () {
    "use strict";

    var timing = (function () {
    	var perf = window.performance,
    		now, fn;

    	if (!perf || !(now = perf.now || perf.mozNow || perf.msNow || perf.oNow || perf.webkitNow)) {
    		perf = Date;
    		now = perf.now;
    	}

    	fn = function () { return now.call(perf); };
    	fn.start = now.call(perf);
    	return fn;
    })();
    (function (simple) {
    	var error_node = null,
    		function_names = [],
    		total_counter = 0,
    		function_counters = {},
    		timing_init = timing();

    	var set_timeout_0ms = (function () {
    		var callbacks = {},
    			origin = window.location.protocol + "//" + window.location.host;

    		var random_gen = function (count) {
    			var s = "",
    				i;

    			for (i = 0; i < count; ++i) s += ("" + Math.random()).replace(/\./, "");

    			return s;
    		};

    		window.addEventListener("message", function (event) {
    			if (event.origin === origin && event.data !== null && typeof(event.data) === "object") {
    				var key = event.data.set_timeout_0ms;
    				if (key in callbacks) {
    					callbacks[key].call(null);
    					delete callbacks[key];
    				}
    			}
    		}, false);

    		var fn = function (callback) {
    			var key = random_gen(4);
    			callbacks[key] = callback;
    			try {
    				window.postMessage({ set_timeout_0ms: key }, origin);
    			}
    			catch (e) {
    				delete callbacks[key];
    				setTimeout(function () {
    					callback.call(null);
    				}, 1);
    			}
    			return key;
    		};
    		fn.clear = function (key) {
    			delete callbacks[key];
    		};
    		return fn;
    	})();

    	var format_stack = function (stack) {
    		var output = "",
    			line_number = 0,
    			line, i, ii, p;

    		stack = stack.trim().replace(/\r\n/g, "\n").split("\n");
    		for (i = 0, ii = stack.length; i < ii; ++i) {
    			line = stack[i];
    			if ((p = line.indexOf("@")) >= 0) {
    				++p;
    				line = line.substr(0, p) + line.substr(p).replace(/[\w\-]+:(?:[\w\W]*?)([^\/]+?\.js)/ig, "$1");
    			}

    			if (!/^\s*Function\.prototype\._w/.test(line)) {
    				if (line_number++ > 0) output += "\n";
    				output += line;
    			}
    		}

    		return output;
    	};
    	var log = function (exception) {
    		if (error_node === null) {
    			var n0 = document.body || document.documentElement,
    				n1 = document.createElement("div"),
    				n2 = document.createElement("textarea");

    			n1.setAttribute("style", "position:fixed!important;right:0!important;top:0!important;bottom:0!important;width:20em!important;opacity:0.8!important;background:#fff!important;color:#000!important;z-index:999999999!important;");
    			n2.setAttribute("style", "position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;padding:0.5em!important;margin:0!important;color:inherit!important;background:transparent!important;font-family:inherit!important;font-size:8px!important;line-height:1.1em!important;border:none!important;resize:none!important;font-family:Courier,monospace!important;box-sizing:border-box!important;cursor:initial!important;");
    			n2.spellcheck = false;
    			n2.readOnly = true;
    			n2.wrap = "off";
    			n1.appendChild(n2);
    			if (n0) n0.appendChild(n1);

    			error_node = n2;
    		}

    		var s = "";
    		if (error_node.value.length > 0) s += "\n====================\n";
    		s += "" + exception + "\n" + (format_stack("" + exception.stack));
    		error_node.value += s;

    		console.log("Exception:", exception);
    	};

    	var increase_counter = function (fn_index) {
    		++total_counter;
    		if (fn_index in function_counters) {
    			++function_counters[fn_index];
    		}
    		else {
    			function_counters[fn_index] = 1;

    			if (log_calls_timer === null) {
    				log_calls_timer = set_timeout_0ms(log_calls);
    			}
    		}
    	};

    	var log_calls_timer = null;
    	var log_calls = function () {
    		log_calls_timer = null;

    		// Sort keys by name
    		var time_diff = timing() - timing_init,
    			keys = Object.keys(function_counters),
    			sortable = [],
    			count, i;

    		for (i = 0; i < keys.length; ++i) {
    			sortable.push([ function_counters[keys[i]], parseInt(keys[i], 10) ]);
    		}

    		sortable.sort(function (a, b) {
    			if (a[0] > b[0]) return -1;
    			if (a[0] < b[0]) return 1;
    			if (a[1] > b[1]) return -1;
    			if (a[1] < b[1]) return 1;
    			return 0;
    		});

    		for (i = 0; i < sortable.length; ++i) {
    			sortable[i] = function_names[sortable[i][1]] + ": " + sortable[i][0];
    		}

    		count = total_counter;
    		total_counter = 0;
    		function_counters = {};

    		if (time_diff >= 10000) {
    			time_diff = (time_diff / 1000).toFixed(1) + "s";
    		}
    		else {
    			time_diff = time_diff.toFixed(0) + "ms";
    		}

    		// Log
    		console.log("[Debug Function Call Counter] Init+" + time_diff + ": call_count=" + count + ";", sortable);
    	};

    	var last_error;
    	var last_error_clear_timer = false;
    	var last_error_clear = function () {
    		last_error = undefined;
    		last_error_clear_timer = false;
    	};
    	Function.prototype._w = function (fn_index) {
    		var fn = this;
    		return function () {
    			if (!simple) increase_counter(fn_index);

    			try {
    				return fn.apply(this, arguments);
    			}
    			catch (e) {
    				if (last_error !== e) {
    					if (!last_error_clear_timer) {
    						last_error_clear_timer = true;
    						set_timeout_0ms(last_error_clear);
    					}
    					last_error = e;
    					log(e);
    				}
    				throw e;
    			}
    		};
    	};
    })(true);

    var xlinks_api = (function () {
		"use strict";

		// Private
		var ready = (function () {

			var callbacks = [],
				check_interval = null,
				check_interval_time = 250;

			var callback_check = function () {
				if (
					(document.readyState === "interactive" || document.readyState === "complete") &&
					callbacks !== null
				) {
					var cbs = callbacks,
						cb_count = cbs.length,
						i;

					callbacks = null;

					for (i = 0; i < cb_count; ++i) {
						cbs[i].call(null);
					}

					window.removeEventListener("load", callback_check, false);
					window.removeEventListener("DOMContentLoaded", callback_check, false);
					document.removeEventListener("readystatechange", callback_check, false);

					if (check_interval !== null) {
						clearInterval(check_interval);
						check_interval = null;
					}

					return true;
				}

				return false;
			}._w(3);

			window.addEventListener("load", callback_check, false);
			window.addEventListener("DOMContentLoaded", callback_check, false);
			document.addEventListener("readystatechange", callback_check, false);

			return function (cb) {
				if (callbacks === null) {
					cb.call(null);
				}
				else {
					callbacks.push(cb);
					if (check_interval === null && callback_check() !== true) {
						check_interval = setInterval(callback_check, check_interval_time);
					}
				}
			}._w(4);

		}._w(2))();

		var ttl_1_hour = 60 * 60 * 1000;
		var ttl_1_day = 24 * ttl_1_hour;
		var ttl_1_year = 365 * ttl_1_day;

		var cache_prefix = "";
		var cache_storage = window.localStorage;
		var cache_set = function (key, data, ttl) {
			cache_storage.setItem(cache_prefix + "ext-" + key, JSON.stringify({
				expires: Date.now() + ttl,
				data: data
			}));
		}._w(5);
		var cache_get = function (key) {
			var json = parse_json(cache_storage.getItem(cache_prefix + "ext-" + key), null);

			if (
				json !== null &&
				typeof(json) === "object" &&
				Date.now() < json.expires &&
				typeof(json.data) === "object"
			) {
				return json.data;
			}

			cache_storage.removeItem(key);
			return null;
		}._w(6);

		var random_string_alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		var random_string = function (count) {
			var alpha_len = random_string_alphabet.length,
				s = "",
				i;
			for (i = 0; i < count; ++i) {
				s += random_string_alphabet[Math.floor(Math.random() * alpha_len)];
			}
			return s;
		}._w(7);

		var is_object = function (obj) {
			return (obj !== null && typeof(obj) === "object");
		}._w(8);

		var get_regex_flags = function (regex) {
			var s = "";
			if (regex.global) s += "g";
			if (regex.ignoreCase) s += "i";
			if (regex.multiline) s += "m";
			return s;
		}._w(9);

		var create_temp_storage = function () {
			var data = {};

			var fn = {
				length: 0,
				key: function (index) {
					return Object.keys(data)[index];
				}._w(11),
				getItem: function (key) {
					if (Object.prototype.hasOwnProperty.call(data, key)) {
						return data[key];
					}
					return null;
				}._w(12),
				setItem: function (key, value) {
					if (!Object.prototype.hasOwnProperty.call(data, key)) {
						++fn.length;
					}
					data[key] = value;
				}._w(13),
				removeItem: function (key) {
					if (Object.prototype.hasOwnProperty.call(data, key)) {
						delete data[key];
						--fn.length;
					}
				}._w(14),
				clear: function () {
					data = {};
					fn.length = 0;
				}._w(15)
			};

			return fn;
		}._w(10);

		var set_shared_node = function (node) {
			var par = document.querySelector(".xl-extension-sharing-elements"),
				id = random_string(32);

			if (par === null) {
				par = document.createElement("div");
				par.className = "xl-extension-sharing-elements";
				par.style.setProperty("display", "none", "important");
				document.body.appendChild(par);
			}

			try {
				node.setAttribute("data-xl-sharing-id", id);
				par.appendChild(node);
			}
			catch (e) {
				return null;
			}

			return id;
		}._w(16);

		var settings_descriptor_info_normalize = function (input) {
			var info = {},
				opt, label, desc, a, i, ii, v;

			if (typeof(input.type) === "string") {
				info.type = input.type;
			}
			if (Array.isArray((a = input.options))) {
				info.options = [];
				for (i = 0, ii = a.length; i < ii; ++i) {
					v = a[i];
					if (
						Array.isArray(v) &&
						v.length >= 2 &&
						typeof((label = v[1])) === "string"
					) {
						opt = [ v[0], v[1] ];
						if (typeof((desc = v[2])) === "string") {
							opt.push(desc);
						}
						info.options.push(opt);
					}
				}
			}

			return info;
		}._w(17);

		var config = {};


		var CommunicationChannel = function (name, key, is_extension, channel, callback) {
			var self = this;

			this.port = null;
			this.port_other = null;
			this.post = null;
			this.on_message = null;
			this.origin = null;
			this.name_key = null;
			this.is_extension = is_extension;
			this.name = name;
			this.key = key;
			this.callback = callback;

			if (channel === null) {
				this.name_key = name;
				if (key !== null) {
					this.name_key += "_";
					this.name_key += key;
				}
				this.origin = window.location.protocol + "//" + window.location.host;
				this.post = this.post_window;
				this.on_message = function (event) {
					self.on_window_message(event);
				}._w(19);
				window.addEventListener("message", this.on_message, false);
			}
			else {
				this.port = channel.port1;
				this.port_other = channel.port2;
				this.post = this.post_channel;
				this.on_message = function (event) {
					self.on_port_message(event);
				}._w(20);
				this.port.addEventListener("message", this.on_message, false);
				this.port.start();
			}
		}._w(18);

		CommunicationChannel.prototype.post_window = function (message, transfer) {
			var msg = {
				ext: this.is_extension,
				key: this.name_key,
				data: message
			};

			try {
				window.postMessage(msg, this.origin, transfer);
			}
			catch (e) {
				// Tampermonkey bug
				try {
					unsafeWindow.postMessage(msg, this.origin, transfer);
				}
				catch (e2) {}
			}
		}._w(21);
		CommunicationChannel.prototype.post_channel = function (message, transfer) {
			this.port.postMessage(message, transfer);
		}._w(22);
		CommunicationChannel.prototype.post_null = function () {
		}._w(23);
		CommunicationChannel.prototype.on_window_message = function (event) {
			var data = event.data;
			if (
				event.origin === this.origin &&
				is_object(data) &&
				data.ext === (!this.is_extension) && // jshint ignore:line
				data.key === this.name_key &&
				is_object((data = data.data))
			) {
				this.callback(event, data, this);
			}
		}._w(24);
		CommunicationChannel.prototype.on_port_message = function (event) {
			var data = event.data;
			if (is_object(data)) {
				this.callback(event, data, this);
			}
		}._w(25);
		CommunicationChannel.prototype.close = function () {
			if (this.on_message !== null) {
				if (this.port === null) {
					window.removeEventListener("message", this.on_message, false);
				}
				else {
					this.port.removeEventListener("message", this.on_message, false);
					this.port.close();
					this.port = null;
				}
				this.on_message = null;
				this.post = this.post_null;
			}
		}._w(26);


		var api = null;
		var API = function () {
			this.event = null;
			this.reply_callbacks = {};

			this.init_state = 0;

			this.handlers = API.handlers_init;
			this.functions = {};
			this.url_info_functions = {};
			this.url_info_to_data_functions = {};
			this.details_functions = {};
			this.actions_functions = {};

			var self = this;
			this.channel = new CommunicationChannel(
				"xlinks_broadcast",
				null,
				true,
				null,
				function (event, data, channel) {
					self.on_message(event, data, channel, {});
				}._w(28)
			);
		}._w(27);
		API.prototype.on_message = function (event, data, channel, handlers) {
			var action = data.xlinks_action,
				action_is_null = (action === null),
				action_data, reply, fn, err;

			if (
				(action_is_null || typeof(action) === "string") &&
				is_object((action_data = data.data))
			) {
				reply = data.reply;
				if (typeof(reply) === "string") {
					if (Object.prototype.hasOwnProperty.call(this.reply_callbacks, reply)) {
						fn = this.reply_callbacks[reply];
						delete this.reply_callbacks[reply];
						this.event = event;
						fn.call(this, null, action_data);
						this.event = null;
					}
					else {
						err = "Cannot reply to extension";
					}
				}
				else if (action_is_null) {
					err = "Missing extension action";
				}
				else if (Object.prototype.hasOwnProperty.call(handlers, action)) {
					handlers[action].call(this, action_data, channel, data.id);
				}
				else {
					err = "Invalid extension call";
				}

				if (err !== undefined && typeof((reply = data.id)) === "string") {
					this.send(
						channel,
						null,
						reply,
						{ err: "Invalid extension call" }
					);
				}
			}
		}._w(29);
		API.prototype.send = function (channel, action, reply_to, data, timeout_delay, on_reply) {
			var self = this,
				id = null,
				timeout = null,
				cb, i;

			if (on_reply !== undefined) {
				for (i = 0; i < 10; ++i) {
					id = random_string(32);
					if (!Object.prototype.hasOwnProperty.call(this.reply_callbacks)) break;
				}

				cb = function () {
					if (timeout !== null) {
						clearTimeout(timeout);
						timeout = null;
					}

					on_reply.apply(this, arguments);
				}._w(31);

				this.reply_callbacks[id] = cb;
				cb = null;

				if (timeout_delay >= 0) {
					timeout = setTimeout(function () {
						timeout = null;
						delete self.reply_callbacks[id];
						on_reply.call(self, "Response timeout");
					}._w(32), timeout_delay);
				}
			}

			channel.post({
				xlinks_action: action,
				data: data,
				id: id,
				reply: reply_to
			});
		}._w(30);
		API.prototype.reply_error = function (channel, reply_to, err) {
			channel.post({
				xlinks_action: null,
				data: { err: err },
				id: null,
				reply: reply_to
			});
		}._w(33);
		API.prototype.post_message = function (msg) {
			try {
				window.postMessage(msg, this.origin);
			}
			catch (e) {
				// Tampermonkey bug
				try {
					unsafeWindow.postMessage(msg, this.origin);
				}
				catch (e2) {
					console.log("window.postMessage failed! Your userscript manager may need to be updated!");
					console.log("window.postMessage exception:", e, e2);
				}
			}
		}._w(34);
		API.prototype.init = function (info, callback) {
			if (this.init_state !== 0) {
				if (typeof(callback) === "function") callback.call(null, this.init_state === 1 ? "Init active" : "Already started");
				return;
			}

			this.init_state = 1;

			var self = this,
				de = document.documentElement,
				count = info.registrations,
				namespace = info.namespace || "",
				send_info = {
					namespace: namespace
				},
				a, v, i;

			if (typeof((v = info.name)) === "string") send_info.name = v;
			if (typeof((v = info.author)) === "string") send_info.author = v;
			if (typeof((v = info.description)) === "string") send_info.description = v;
			if (Array.isArray((v = info.version))) {
				for (i = 0; i < v.length; ++i) {
					if (typeof(v[i]) !== "number") break;
				}
				if (i === v.length) send_info.version = v.slice(0);
			}

			if (typeof(count) !== "number" || count < 0) {
				count = 1;
			}

			send_info.registrations = count;

			send_info.main = (typeof(info.main) === "function") ? info.main.toString() : null;

			if (de) {
				a = de.getAttribute("data-xlinks-extensions-waiting");
				a = (a ? (parseInt(a, 10) || 0) : 0) + count;
				de.setAttribute("data-xlinks-extensions-waiting", a);
				de = null;
			}

			ready(function () {
				self.send(
					self.channel,
					"init",
					null,
					send_info,
					10000,
					function (err, data) {
						err = self.on_init(err, data, namespace);
						if (err === "Internal") {
							self.channel.close();
							this.init_state = 3;
						}
						if (typeof(callback) === "function") callback.call(null, err);
					}._w(37)
				);
			}._w(36));
		}._w(35);
		API.prototype.on_init = function (err, data, namespace) {
			var self = this,
				api_key, ch, v;

			if (err === null) {
				if (!is_object(data)) {
					err = "Could not generate extension key";
				}
				else if (typeof((err = data.err)) !== "string") {
					if (typeof((api_key = data.key)) !== "string") {
						err = "Could not generate extension key";
					}
					else {
						// Valid
						err = null;

						if (typeof((v = data.cache_prefix)) === "string") {
							cache_prefix = v;
						}
						if (typeof((v = data.cache_mode)) === "string") {
							if (v === "session") {
								cache_storage = window.sessionStorage;
							}
							else if (v === "none") {
								cache_storage = create_temp_storage();
							}
						}

						// New channel
						ch = (this.event.ports && this.event.ports.length === 1) ? {
							port1: this.event.ports[0],
							port2: null
						} : null;

						this.channel.close();
						this.channel = new CommunicationChannel(
							namespace,
							api_key,
							true,
							ch,
							function (event, data, channel) {
								self.on_message(event, data, channel, API.handlers);
							}._w(39)
						);
					}
				}
			}

			this.init_state = (err === null) ? 2 : 0;
			return err;
		}._w(38);
		API.prototype.register = function (data, callback) {
			if (this.init_state !== 2) {
				if (typeof(callback) === "function") callback.call(null, "API not init'd", 0);
				return;
			}

			// Data
			var send_data = {
				settings: {},
				request_apis: [],
				linkifiers: [],
				commands: [],
				create_url: null
			};

			var request_apis_response = [],
				command_fns = [],
				array, entry, fn_map, a_data, a, i, ii, k, o, v;

			// Settings
			o = data.settings;
			if (is_object(o)) {
				for (k in o) {
					a = o[k];
					if (Array.isArray(a)) {
						send_data.settings[k] = a_data = [];
						for (i = 0, ii = a.length; i < ii; ++i) {
							v = a[i];
							if (Array.isArray(v) && typeof(v[0]) === "string") {
								entry = [ v[0] ];
								if (v.length > 1) {
									entry.push(
										(v[1] === undefined ? null : v[1]),
										"" + (v[2] || ""),
										"" + (v[3] || "")
									);
									if (v.length > 4 && is_object(v[4])) {
										entry.push(settings_descriptor_info_normalize(v[4]));
									}
								}
								a_data.push(entry);
							}
						}
					}
				}
			}

			// Request APIs
			array = data.request_apis;
			if (Array.isArray(array)) {
				for (i = 0, ii = array.length; i < ii; ++i) {
					a = array[i];
					fn_map = {};
					a_data = {
						group: "other",
						namespace: "other",
						type: "other",
						count: 1,
						concurrent: 1,
						delays: { okay: 200, error: 5000 },
						functions: []
					};
					if (typeof((v = a.group)) === "string") a_data.group = v;
					if (typeof((v = a.namespace)) === "string") a_data.namespace = v;
					if (typeof((v = a.type)) === "string") a_data.type = v;
					if (typeof((v = a.count)) === "number") a_data.count = Math.max(1, v);
					if (typeof((v = a.concurrent)) === "number") a_data.concurrent = Math.max(1, v);
					if (typeof((v = a.delay_okay)) === "number") a_data.delay_okay = Math.max(0, v);
					if (typeof((v = a.delay_error)) === "number") a_data.delay_error = Math.max(0, v);
					if (is_object((o = a.functions))) {
						for (k in o) {
							v = o[k];
							if (typeof(v) === "function") {
								a_data.functions.push(k);
								fn_map[k] = v;
							}
						}
					}

					request_apis_response.push({
						functions: fn_map
					});
					send_data.request_apis.push(a_data);
				}
			}

			// Linkifiers
			array = data.linkifiers;
			if (Array.isArray(array)) {
				for (i = 0, ii = array.length; i < ii; ++i) {
					a = array[i];
					a_data = {
						regex: null,
						prefix_group: 0,
						prefix: ""
					};

					v = a.regex;
					if (typeof(v) === "string") {
						a_data.regex = [ v ];
					}
					else if (v instanceof RegExp) {
						a_data.regex = [ v.source, get_regex_flags(v) ];
					}
					else if (Array.isArray(v)) {
						if (typeof(v[0]) === "string") {
							if (typeof(v[1]) === "string") {
								a_data.regex = [ v[0], v[1] ];
							}
							else {
								a_data.regex = [ v[0] ];
							}
						}
					}

					if (typeof((v = a.prefix_group)) === "number") a_data.prefix_group = v;
					if (typeof((v = a.prefix)) === "string") a_data.prefix = v;

					send_data.linkifiers.push(a_data);
				}
			}

			// URL info functions
			array = data.commands;
			if (Array.isArray(array)) {
				for (i = 0, ii = array.length; i < ii; ++i) {
					a = array[i];
					a_data = {
						url_info: false,
						to_data: false,
						actions: false,
						details: false
					};
					o = {
						url_info: null,
						to_data: null,
						actions: null,
						details: null
					};

					if (typeof((v = a.url_info)) === "function") {
						a_data.url_info = true;
						o.url_info = v;
					}
					if (typeof((v = a.to_data)) === "function") {
						a_data.to_data = true;
						o.to_data = v;
					}
					if (typeof((v = a.actions)) === "function") {
						a_data.actions = true;
						o.actions = v;
					}
					if (typeof((v = a.details)) === "function") {
						a_data.details = true;
						o.details = v;
					}

					command_fns.push(o);
					send_data.commands.push(a_data);
				}
			}

			// URL create functions
			o = data.create_url;
			if (is_object(o)) {
				send_data.create_url = o;
			}

			// Send
			this.send(
				this.channel,
				"register",
				null,
				send_data,
				10000,
				function (err, data) {
					var o;
					if (err !== null || (err = data.err) !== null) {
						if (typeof(callback) === "function") callback.call(null, err, 0);
					}
					else if (!is_object((o = data.response))) {
						if (typeof(callback) === "function") callback.call(null, "Invalid extension response", 0);
					}
					else {
						var okay = this.register_complete(o, request_apis_response, command_fns, send_data.settings);
						if (typeof(callback) === "function") callback.call(null, null, okay);
					}
				}._w(41)
			);
		}._w(40);
		API.prototype.register_complete = function (data, request_apis, command_fns, settings) {
			var reg_count = 0,
				setting_ns, errors, name, fn, e, o, i, ii, k, v;

			// Request APIs
			errors = [];
			i = 0;
			if (Array.isArray((o = data.request_apis))) {
				for (ii = o.length; i < ii; ++i) {
					e = o[i];
					if (i >= request_apis.length) {
						errors.push("Invalid");
					}
					else if (typeof(e) === "string") {
						errors.push(e);
					}
					else if (!is_object(e)) {
						errors.push("Invalid");
					}
					else {
						++reg_count;
						for (k in e) {
							if (Object.prototype.hasOwnProperty.call(e, k) && Object.prototype.hasOwnProperty.call(request_apis[i].functions, k)) {
								fn = request_apis[i].functions[k];
								this.functions[e[k]] = fn;
							}
						}
					}
				}
			}
			for (ii = request_apis.length; i < ii; ++i) {
				errors.push("Invalid");
			}

			// URL infos
			errors = [];
			i = 0;
			if (Array.isArray((o = data.commands))) {
				for (ii = o.length; i < ii; ++i) {
					e = o[i];
					if (i >= command_fns.length) {
						errors.push("Invalid");
					}
					else if (typeof(e) === "string") {
						errors.push(e);
					}
					else if (!is_object(e) || typeof((k = e.id)) !== "string") {
						errors.push("Invalid");
					}
					else {
						++reg_count;
						this.url_info_functions[k] = command_fns[i].url_info;
						this.url_info_to_data_functions[k] = command_fns[i].to_data;
						if (command_fns[i].actions !== null) this.actions_functions[k] = command_fns[i].actions;
						if (command_fns[i].details !== null) this.details_functions[k] = command_fns[i].details;
					}
				}
			}
			for (ii = command_fns.length; i < ii; ++i) {
				errors.push("Invalid");
			}

			// Settings
			for (k in settings) {
				setting_ns = settings[k];
				for (i = 0, ii = setting_ns.length; i < ii; ++i) {
					name = setting_ns[i][0];
					if (
						!is_object(data.settings) ||
						!is_object((o = data.settings[k])) ||
						(v = o[name]) === undefined
					) {
						v = (setting_ns[i].length > 1) ? setting_ns[i][1] : false;
					}

					o = config[k];
					if (o === undefined) config[k] = o = {};
					o[name] = v;
				}
			}

			return reg_count;
		}._w(42);

		API.handlers_init = {};
		API.handlers = {
			request_end: function (data) {
				var id = data.id;
				if (typeof(id) === "string") {
					// Remove request
					delete requests_active[id];
				}
			}._w(43),
			api_function: function (data, channel, reply) {
				var self = this,
					req = null,
					state, id, args, fn, ret;

				if (
					typeof((id = data.id)) !== "string" ||
					!Array.isArray((args = data.args))
				) {
					// Error
					this.reply_error(channel, reply, "Invalid extension data");
					return;
				}

				// Exists
				if (!Array.prototype.hasOwnProperty.call(this.functions, id)) {
					// Error
					this.reply_error(channel, reply, "Invalid extension function");
					return;
				}
				fn = this.functions[id];

				// State
				if (is_object((state = data.state))) {
					id = state.id;
					req = requests_active[id];
					if (req === undefined) {
						requests_active[id] = req = new Request();
					}
					load_request_state(req, state);
				}

				// Callback
				args = Array.prototype.slice.call(args);
				args.push(function () {
					// Err
					var i = 0,
						ii = arguments.length,
						arguments_copy = new Array(ii);

					for (; i < ii; ++i) arguments_copy[i] = arguments[i];

					self.send(
						channel,
						null,
						reply,
						{
							err: null,
							args: arguments_copy
						}
					);
				}._w(45));

				// Call
				ret = fn.apply(req, args);
			}._w(44),
			url_info: function (data, channel, reply) {
				var self = this,
					id, url, fn;

				if (
					typeof((id = data.id)) !== "string" ||
					typeof((url = data.url)) !== "string"
				) {
					// Error
					this.reply_error(channel, reply, "Invalid extension data");
					return;
				}

				// Exists
				if (!Array.prototype.hasOwnProperty.call(this.url_info_functions, id)) {
					// Error
					this.reply_error(channel, reply, "Invalid extension function");
					return;
				}
				fn = this.url_info_functions[id];

				// Call
				fn(url, function (err, data) {
					self.send(
						channel,
						null,
						reply,
						{
							err: err,
							data: data
						}
					);
				}._w(47));
			}._w(46),
			url_info_to_data: function (data, channel, reply) {
				var self = this,
					id, url_info;

				if (
					typeof((id = data.id)) !== "string" ||
					!is_object((url_info = data.url))
				) {
					// Error
					this.reply_error(channel, reply, "Invalid extension data");
					return;
				}

				// Exists
				if (!Array.prototype.hasOwnProperty.call(this.url_info_to_data_functions, id)) {
					// Error
					this.reply_error(channel, reply, "Invalid extension function");
					return;
				}

				// Call
				this.url_info_to_data_functions[id](url_info, function (err, data) {
					self.send(
						channel,
						null,
						reply,
						{
							err: err,
							data: data
						}
					);
				}._w(49));
			}._w(48),
			create_actions: function (data, channel, reply) {
				var self = this,
					id, fn_data, fn_info;

				if (
					typeof((id = data.id)) !== "string" ||
					!is_object((fn_data = data.data)) ||
					!is_object((fn_info = data.info))
				) {
					// Error
					this.reply_error(channel, reply, "Invalid extension data");
					return;
				}

				// Exists
				if (!Array.prototype.hasOwnProperty.call(this.actions_functions, id)) {
					// Error
					this.reply_error(channel, reply, "Invalid extension function");
					return;
				}

				// Call
				this.actions_functions[id](fn_data, fn_info, function (err, data) {
					self.send(
						channel,
						null,
						reply,
						{
							err: err,
							data: data
						}
					);
				}._w(51));
			}._w(50),
			create_details: function (data, channel, reply) {
				var self = this,
					id, fn_data, fn_info;

				if (
					typeof((id = data.id)) !== "string" ||
					!is_object((fn_data = data.data)) ||
					!is_object((fn_info = data.info))
				) {
					// Error
					this.reply_error(channel, reply, "Invalid extension data");
					return;
				}

				// Exists
				if (!Array.prototype.hasOwnProperty.call(this.details_functions, id)) {
					// Error
					this.reply_error(channel, reply, "Invalid extension function");
					return;
				}

				// Call
				this.details_functions[id](fn_data, fn_info, function (err, data) {
					self.send(
						channel,
						null,
						reply,
						{
							err: err,
							data: set_shared_node(data)
						}
					);
				}._w(53));
			}._w(52),
		};

		var RequestErrorMode = {
			None: 0,
			NoCache: 1,
			Save: 2
		};

		var ImageFlags = {
			None: 0x0,
			NoLeech: 0x1
		};

		var requests_active = {};
		var Request = function () {
		}._w(54);

		var load_request_state = function (request, state) {
			for (var k in state) {
				request[k] = state[k];
			}
		}._w(55);


		// Public
		var init = function (info, callback) {
			if (api === null) api = new API();
			api.init(info, callback);
		}._w(56);

		var register = function (data, callback) {
			if (api === null) {
				callback.call(null, "API not init'd", 0);
				return;
			}

			api.register(data, callback);
		}._w(57);

		var request = function (namespace, type, unique_id, info, callback) {
			if (api === null || api.init_state !== 2) {
				callback.call(null, "API not init'd", null);
				return;
			}

			api.send(
				api.channel,
				"request",
				null,
				{
					namespace: namespace,
					type: type,
					id: unique_id,
					info: info
				},
				-1,
				function (err, data) {
					if (err !== null || (err = data.err) !== null) {
						data = null;
					}
					else if ((data = data.data) === null) {
						err = "Invalid extension data";
					}
					callback.call(null, err, data);
				}._w(59)
			);
		}._w(58);

		var insert_styles = function (styles) {
			var head = document.head,
				n;
			if (head) {
				n = document.createElement("style");
				n.textContent = styles;
				head.appendChild(n);
			}
		}._w(60);

		var parse_json = function (text, def) {
			try {
				return JSON.parse(text);
			}
			catch (e) {}
			return def;
		}._w(61);
		var parse_html = function (text, def) {
			try {
				return new DOMParser().parseFromString(text, "text/html");
			}
			catch (e) {}
			return def;
		}._w(62);
		var parse_xml = function (text, def) {
			try {
				return new DOMParser().parseFromString(text, "text/xml");
			}
			catch (e) {}
			return def;
		}._w(63);

		var get_domain = function (url) {
			var m = /^(?:[\w\-]+):\/*((?:[\w\-]+\.)*)([\w\-]+\.[\w\-]+)/i.exec(url);
			return (m === null) ? [ "", "" ] : [ m[1].toLowerCase(), m[2].toLowerCase() ];
		}._w(64);

		var get_image = function (url, flags, callback) {
			if (api === null || api.init_state !== 2) {
				callback.call(null, "API not init'd", null);
				return;
			}

			// Send
			api.send(
				api.channel,
				"get_image",
				null,
				{ url: url, flags: flags },
				10000,
				function (err, data) {
					if (err !== null) {
						data = null;
					}
					else if (!is_object(data)) {
						err = "Invalid data";
					}
					else if (typeof((err = data.err)) !== "string" && typeof((data = data.url)) !== "string") {
						data = null;
						err = "Invalid data";
					}

					callback.call(null, err, data);
				}._w(66)
			);
		}._w(65);


		// Exports
		return {
			RequestErrorMode: RequestErrorMode,
			ImageFlags: ImageFlags,
			init: init,
			config: config,
			register: register,
			request: request,
			get_image: get_image,
			insert_styles: insert_styles,
			parse_json: parse_json,
			parse_html: parse_html,
			parse_xml: parse_xml,
			get_domain: get_domain,
			random_string: random_string,
			is_object: is_object,
			ttl_1_hour: ttl_1_hour,
			ttl_1_day: ttl_1_day,
			ttl_1_year: ttl_1_year,
			cache_set: cache_set,
			cache_get: cache_get
		};

	}._w(1))();

    var main = function main_fn(xlinks_api) {
        var $$ = function (selector, root) {
            return (root || document).querySelectorAll(selector);
        }._w(68);
        var $ = (function () {

            var d = document;

            var Module = function (selector, root) {
                return (root || d).querySelector(selector);
            }._w(70);

            Module.add = function (parent, child) {
                return parent.appendChild(child);
            }._w(71);
            Module.tnode = function (text) {
                return d.createTextNode(text);
            }._w(72);
            Module.node = function (tag, class_name, text) {
                var elem = d.createElement(tag);
                elem.className = class_name;
                if (text !== undefined) {
                    elem.textContent = text;
                }
                return elem;
            }._w(73);
            Module.node_ns = function (namespace, tag, class_name) {
                var elem = d.createElementNS(namespace, tag);
                elem.setAttribute("class", class_name);
                return elem;
            }._w(74);
            Module.node_simple = function (tag) {
                return d.createElement(tag);
            }._w(75);

            return Module;

        }._w(69))();

        // utility
        var interpolate = function (str, params) {
            // evaluate template strings
            const names = Object.keys(params);
            const vals = Object.values(params);
            return new Function(...names, `return \`${str}\`;`)(...vals);
        }._w(76)

        var lang_to_flag = {
            "ja": "lang_jp",
            "jp": "lang_jp",
            "ko": "lang_kr",
            "cn": "lang_cn",
            "zh": "lang_cn",
            "zh-hk": "lang_hk",
            "id": "lang_id",
            "th": "lang_th",
        };

        var site_short = {
            "mangadex": "md",
            "dynasty": "ds",
            "bato": "bt",
            "comick": "ck",
        }
        
        var replace_icon = function (ch_id, site, icon_name, apply_style) {
            // url_info.icon was set to a placeholder if use_flags is set
            // this replaces it with the real icon (e.g. a flag) after the manga data was acquired
            // also applies a style to the icon if apply_style is true
            // site must be either "mangadex", "dynasty" or "bato" because it's directly used as the attribute name of xlinks_api.config
            var style_str = "";

            if (apply_style) {
                switch (xlinks_api.config[site].tag_filter_style) {
                    case "none":          style_str = ""; break;
                    case "rotate180":     style_str = "transform: rotate(180deg)"; break;
                    case "long_strip":    style_str = "transform: scaleX(0.5)"; break;
                    case "invert":        style_str = "filter: invert(1)"; break;
                    case "grayscale":     style_str = "filter: grayscale(1)"; break;
                    case "opacity50":     style_str = "filter: opacity(0.5)"; break;
                    case "drop_shadow":   style_str = "filter: drop-shadow(0.0rem 0.0rem 0.15rem #FF0000)"; break;
                    case "sepia":         style_str = "filter: sepia(1)"; break;
                    case "blur1.5":       style_str = "filter: blur(1.5px)"; break;
                    case "hue_rotate90":  style_str = "filter: hue-rotate(90deg)"; break;
                    case "hue_rotate180": style_str = "filter: hue-rotate(180deg)"; break;
                    case "hue_rotate270": style_str = "filter: hue-rotate(270deg)"; break;
                    case "custom":        style_str = xlinks_api.config[site].tag_filter_style_custom.trim(); break;
                }
            }
            // console.log([ch_id, apply_style, xlinks_api.config[site].tag_filter_style, style_str]);

            nodes = $$("span.xl-site-tag-icon[data-xl-site-tag-icon=replaceme-"+site_short[site]+"-"+ch_id+"]");
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("data-xl-site-tag-icon", icon_name);

                let node_style = nodes[i].getAttribute("style");
                if (node_style === undefined || node_style === null)
                    nodes[i].setAttribute("style", style_str) 
                else
                    nodes[i].setAttribute("style", [node_style.trim(";"), style_str].join(";")) 
            }
        }._w(77)


        // functions that interact with the API
        // Mangadex
        class MangadexDataAggregator {
            constructor(final_callback) {
                this.callback = final_callback;
                this.context = null;
                this.group_num = 0;
                this.author_num = 1;
                this.artist_num = 1;
                this.data = {
                    groups: Array(),
                    authors: Array(),
                    author_ids: Array(),
                    artist_ids: Array(),
                };
            }

            add_author_id(id) {
                this.data.author_ids.push(id);
            }

            add_artist_id(id) {
                this.data.artist_ids.push(id);
            }

            add_data(category, data) {
                if (category == "group")
                    this.data.groups.push(data);
                else if (category == "author")
                    this.data.authors.push(data);
                else
                    this.data[category] = data;
                this.validate();
            }

            validate() {
                // call this.callback if this.data has all necessary categories
                if (this.data.chapter == undefined)
                    return;
                if (this.data.manga == undefined)
                    return;
                if (xlinks_api.config.mangadex.show_group && this.data.groups.length < this.group_num)
                    return;
                if (xlinks_api.config.mangadex.show_author) {
                    let has_authors = 0;
                    for (let i = this.data.authors.length - 1; i >= 0; i--) {
                        if (this.data.author_ids.indexOf(this.data.authors[i].id) != -1)
                            has_authors++;
                    }
                    if (has_authors < this.author_num)
                        return;
                }
                if (xlinks_api.config.mangadex.show_artist) {
                    let has_artists = 0;
                    for (let i = this.data.authors.length - 1; i >= 0; i--) {
                        if (this.data.artist_ids.indexOf(this.data.authors[i].id) != -1)
                            has_artists++;
                    }
                    if (has_artists < this.artist_num)
                        return;
                }

                // console.log(["valid data", this.context, this.group_num, this.author_num, this.artist_num, this.data]);

                // make a usable object out of the categories
                var aggdata = {};
                var template = "";
                var data = this.data;

                data.final = {
                    manga_lang: "",
                    author: "",
                    manga: null,
                    volume: "",
                    chapter: "",
                    title: "",
                    pages: "",
                    group: "",
                };

                // aggdata.title
                // "${manga_lang} ${author} ${manga} ${volume} ${chapter} ${title} ${pages} ${group}"
                if (xlinks_api.config.mangadex.show_orig_lang && !xlinks_api.config.mangadex.use_flags && data.manga.originalLanguage)
                    template += "${manga_lang} ";
                if ((xlinks_api.config.mangadex.show_author || xlinks_api.config.mangadex.show_artist) && data.authors.length > 0 && this.author_num + this.artist_num > 0)
                    template += "${author} ";
                if (data.manga.title || data.manga.altTitles)
                    template += "${manga} ";
                if (xlinks_api.config.mangadex.show_volume && data.chapter.volume)
                    template += "${volume} ";
                if (data.chapter.chapter)
                    template += "${chapter} ";
                if (xlinks_api.config.mangadex.show_ch_title && data.chapter.title)
                    template += "${title} ";
                if (xlinks_api.config.mangadex.show_pages && data.chapter.pages)
                    template += "${pages} ";
                if (xlinks_api.config.mangadex.show_group && data.groups.length > 0)
                    template += "${group}";

                if (data.manga.originalLanguage)
                    data.final.manga_lang = "["+data.manga.originalLanguage+"]";

                if (data.authors.length > 0) {
                    var author_names = Array();
                    for (let i = 0; i < data.authors.length; i++) {
                        if (xlinks_api.config.mangadex.show_author && data.author_ids.indexOf(data.authors[i].id) != -1 && author_names.indexOf(data.authors[i].name) == -1) {
                            author_names.push(data.authors[i].name);
                        }
                        if (xlinks_api.config.mangadex.show_artist && data.artist_ids.indexOf(data.authors[i].id) != -1 && author_names.indexOf(data.authors[i].name) == -1) {
                            author_names.push(data.authors[i].name);
                        }
                    }
                    data.final.author = "[" + author_names.join(", ") + "]";
                }

                if (xlinks_api.config.mangadex.custom_title) {
                    var title_order = xlinks_api.config.mangadex.title_search_order.replace(/\s+/g, "").split(",");
                    var title_found = false;
                    for (let i = 0; i < title_order.length; i++) {
                        if (title_found) break;
                        lcode = title_order[i];
                        lcode = lcode.replace(/orig/i, data.manga.originalLanguage);
                        if (data.manga.title[lcode] !== undefined) {
                            data.final.manga = data.manga.title[lcode];
                            break;
                        }
                        else {
                            // altTitles is an array of objects with each single entries
                            for (var j = 0; j < data.manga.altTitles.length; j++) {
                                if (data.manga.altTitles[j][lcode] !== undefined) {
                                    data.final.manga = data.manga.altTitles[j][lcode];
                                    title_found = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (!data.final.manga) {
                    // take the default title
                    let keys = Object.keys(data.manga.title);
                    if (keys.length)
                        data.final.manga = data.manga.title[keys[0]];
                }

                if (data.chapter.volume)
                    data.final.volume = "vol. " + data.chapter.volume;
                if (data.chapter.chapter)
                    data.final.chapter = "ch. " + data.chapter.chapter;
                if (data.chapter.title)
                    data.final.title = '- "' + data.chapter.title + '"';
                if (data.chapter.pages)
                    data.final.pages = "(" + data.chapter.pages + "p)";
                if (xlinks_api.config.mangadex.show_group && data.groups.length > 0) {
                    combined_group_name = "";
                    for (let i = 0; i < data.groups.length; i++) {
                        combined_group_name += data.groups[i].name + ', '
                    }
                    combined_group_name = combined_group_name.replace(/, $/, "");
                    data.final.group = "[" + combined_group_name + "]";
                    if (combined_group_name == "null")
                        console.log(["null group name:", data.groups]);
                }

                aggdata.title = interpolate(template, data.final);
                aggdata.title = aggdata.title.replace(/^\s+/, "");
                aggdata.title = aggdata.title.replace(/\s$/, "");
                aggdata.title = aggdata.title.replace(/\s+/g, " ");

                if (xlinks_api.config.mangadex.show_icon) {
                    // modify the [MD] tag into an icon or flag
                    // apply a style if the tag filter is tripped
                    let icon_name = "site_MD";
                    let apply_style = false;

                    if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && lang_to_flag[data.manga.originalLanguage] !== undefined)
                        icon_name = lang_to_flag[data.manga.originalLanguage]

                    // search for tags matching the tag filter
                    if (xlinks_api.config.mangadex.tag_filter.trim() !== "") {
                        // "A a, bB, C c c" -> ["a a", "bb", "c c c"]
                        let tag_array = xlinks_api.config.mangadex.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");

                        for (let i = 0; i < data.manga.tags.length; i++) {
                            if (data.manga.tags[i].attributes.name.en !== undefined) {
                                if (tag_array.indexOf(data.manga.tags[i].attributes.name.en.toLowerCase()) >= 0) {
                                    apply_style = true;
                                    break;
                                }
                            }
                        }
                        // console.log([aggdata.title, data.manga.tags, tag_array, apply_style])
                    }

                    this.tag_filter_tripped = apply_style;
                    replace_icon(this.context, "mangadex", icon_name, apply_style);
                }

                this.callback(null, aggdata);
            }
        }

        var md_aggregators = {};

        var md_get_data = function (info, callback) {
            var data = xlinks_api.cache_get(info.id);
            callback(null, data);
        }._w(78);
        var md_set_data = function (data, info, callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            if (info.lifetime !== undefined) lifetime = info.lifetime;
            xlinks_api.cache_set(info.id, data, lifetime);
            callback(null);
        }._w(79);

        var md_generic_api_xhr = function (callback) {
            var info = this.infos[0];
            // context should be "{type}_{id}"
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;

            let req_url = "https://api.mangadex.org/" + info.type + "/" + info.id;
            if (info.includes !== undefined && info.includes.length > 0) {
                req_url += "?";
                for (let i = 0; i < info.includes.length; i++) {
                    req_url += "includes[]=" + info.includes[i] + "&";
                }
                req_url = req_url.replace(/&$/, "");
            }
            // console.log(["MD API call", info.type, info.id, info.includes, req_url]);

            callback(null, {
                method: "GET",
                url: req_url,
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(80);
        var md_generic_parse_response = function (xhr, callback) {
            // split xhr.context by '_' and forward to the actual parse_response function
            if (xhr.context) {
                var ctx = xhr.context.split("_");
                if (ctx[0] == "chapter")
                    md_chapter_parse_response(xhr, callback);
                else if (ctx[0] == "group")
                    md_group_parse_response(xhr, callback);
                else if (ctx[0] == "manga")
                    md_manga_parse_response(xhr, callback);
                else if (ctx[0] == "author")
                    md_author_parse_response(xhr, callback);
                else
                    callback("Invalid response context: " + xhr.context);
            }
            else
                callback("Invalid response: No context.");
        }._w(81);

        var md_chapter_setup_xhr = function (callback) {
            var info = this.infos[0];
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;
            callback(null, {
                method: "GET",
                url: "https://api.mangadex.org/chapter/" + info.id,
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(82);
        var md_chapter_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            var data = {
                id:        jsdata.data.id || null,
                chapter:   jsdata.data.attributes.chapter || null,
                volume:    jsdata.data.attributes.volume || null,
                publishAt: jsdata.data.attributes.publishAt || null,
                pages:     jsdata.data.attributes.pages || null,
                title:     jsdata.data.attributes.title || null,
            };

            if (jsdata.data.relationships !== undefined)
                data.relationships = jsdata.data.relationships;

            // console.log(["parse_ch_response", jsdata.data, data]);

            callback(null, [data]);
        }._w(83);

        var md_manga_setup_xhr = function (callback) {
            var info = this.infos[0];
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;
            callback(null, {
                method: "GET",
                url: "https://api.mangadex.org/manga/" + info.id,
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(84);
        var md_manga_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var ctx;
            if (xhr.context !== undefined) {
                ctx = xhr.context.split("_");
            }
            else {
                callback("Invalid response context");
                return;
            }
            var aggregator = md_aggregators[ctx[1]];

            var jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            var data = {
                id:               jsdata.data.id || null,
                title:            jsdata.data.attributes.title || null,
                altTitles:        jsdata.data.attributes.altTitles || null,
                descrition:       jsdata.data.attributes.descrition || null,
                originalLanguage: jsdata.data.attributes.originalLanguage || null,
                state:            jsdata.data.attributes.state || null,
                status:           jsdata.data.attributes.status || null,
                tags:             jsdata.data.attributes.tags || null,
                relationships:    jsdata.data.relationships || null,
            };

            // if (xlinks_api.config.mangadex.show_author || xlinks_api.config.mangadex.show_artist)
            md_get_other_manga_data(ctx[1], data, aggregator);

            xlinks_api.cache_set("manga_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            aggregator.add_data("manga", data);

            callback(null, [data]);
        }._w(85);
        var md_get_other_manga_data = function (context, data, aggregator) {
            var has_authors = 0;
            var author_num = 0;
            var has_artists = 0;
            var artist_num = 0;

            for (let i = 0; i < data.relationships.length; i++) {
                if (data.relationships[i].type == "author")
                    author_num++;
                if (data.relationships[i].type == "artist")
                    artist_num++;
            }
            aggregator.author_num = author_num;
            aggregator.artist_num = artist_num;

            var requested_authors = Array();
            var added_authors = Array();

            for (let i = 0; i < data.relationships.length; i++) {
                switch (data.relationships[i].type) {
                    case "author": {
                        has_authors++;
                        if (data.relationships[i].attributes !== undefined) {
                            let authordata = {
                                id:   data.relationships[i].id || null,
                                name: data.relationships[i].attributes.name || null,
                            };
                            xlinks_api.cache_set("author_" + authordata.id, authordata, 7 * xlinks_api.ttl_1_day);
                            aggregator.add_author_id(authordata.id);
                            if (added_authors.indexOf(authordata.id) != -1) break;
                            aggregator.add_data("author", authordata);
                        }
                        else {
                            let author_url_info = {
                                id: data.relationships[i].id,
                                context: "author_" + context,
                                type: "author",
                            };
                            aggregator.add_author_id(author_url_info.id);
                            if (added_authors.indexOf(author_url_info.id) != -1) break;

                            let cached_authordata = xlinks_api.cache_get("author_" + author_url_info.id);
                            if (cached_authordata !== null) {
                                added_authors.push(cached_authordata.id);
                                aggregator.add_data("author", cached_authordata);
                            }
                            else if (requested_authors.indexOf(author_url_info.id) == -1) {
                                xlinks_api.request("mangadex", "generic", author_url_info.id, author_url_info, (err, data) => {});
                                requested_authors.push(author_url_info.id);
                            }
                        }
                        break;
                    }

                    case "artist": {
                        has_artists++;
                        if (data.relationships[i].attributes !== undefined) {
                            let authordata = {
                                id:   data.relationships[i].id || null,
                                name: data.relationships[i].attributes.name || null,
                            };
                            xlinks_api.cache_set("author_" + authordata.id, authordata, 7 * xlinks_api.ttl_1_day);
                            aggregator.add_artist_id(authordata.id);
                            if (added_authors.indexOf(authordata.id) != -1) break;
                            aggregator.add_data("author", authordata);
                        }
                        else {
                            let author_url_info = {
                                id: data.relationships[i].id,
                                context: "author_" + context,
                                type: "author",
                            };
                            aggregator.add_artist_id(author_url_info.id);
                            if (added_authors.indexOf(author_url_info.id) != -1) break;

                            let cached_authordata = xlinks_api.cache_get("author_" + author_url_info.id);
                            if (cached_authordata !== null) {
                                added_authors.push(cached_authordata.id);
                                aggregator.add_data("author", cached_authordata);
                            }
                            else if (requested_authors.indexOf(author_url_info.id) == -1) {
                                xlinks_api.request("mangadex", "generic", author_url_info.id, author_url_info, (err, data) => {});
                                requested_authors.push(author_url_info.id);
                            }
                        }
                        break;
                    }
                }
            }

            if (xlinks_api.config.mangadex.show_author && has_authors < author_num) {
                // let authordata = {id: "fake_author", name: ""};
                // aggregator.add_author_id("fake_author");
                // aggregator.add_data("author", authordata);
                aggregator.author_num = has_authors;
                aggregator.validate();
            }
            if (xlinks_api.config.mangadex.show_artist && has_artists == artist_num) {
                // let artistdata = {id: "fake_artist", name: ""};
                // aggregator.add_artist_id("fake_artist");
                // aggregator.add_data("artist", artistdata);
                aggregator.artist_num = has_artists;
                aggregator.validate();
            }
        }._w(86);

        var md_group_setup_xhr = function (callback) {
            var info = this.infos[0];
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;
            callback(null, {
                method: "GET",
                url: "https://api.mangadex.org/group/" + info.id,
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(87);
        var md_group_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var ctx;
            if (xhr.context !== undefined) {
                ctx = xhr.context.split("_");
            }
            else {
                callback("Invalid response context");
                return;
            }

            var jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            var data = {
                id:   jsdata.data.id || null,
                name: jsdata.data.attributes.name || null,
            };

            xlinks_api.cache_set("group_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            md_aggregators[ctx[1]].add_data("group", data);

            callback(null, [data]);
        }._w(88);
        
        var md_author_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var ctx;
            if (xhr.context !== undefined) {
                ctx = xhr.context.split("_");
            }
            else {
                callback("Invalid response context");
                return;
            }

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            var data = {
                id:   jsdata.data.id || null,
                name: jsdata.data.attributes.name || null,
            };

            xlinks_api.cache_set("author_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            md_aggregators[ctx[1]].add_data("author", data);

            callback(null, [data]);
        }._w(89);

        var md_ch_url_get_info = function (url, callback) {
            var m = /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter\/([a-z0-9\-]+)/i.exec(url),
                url_info;
            if (m !== null && m[2] !== undefined) {
                url_info = {
                    id: m[2],
                    site: "mangadex",
                    type: "chapter",
                    tag: "MD",
                    context: "chapter_" + m[2],
                    includes: ["scanlation_group"],
                };

                // If we don't need the author or artist, we only need to make one API call
                // This will populate the chapter's relationship attributes with *some* manga information
                // if (!xlinks_api.config.mangadex.show_author && !xlinks_api.config.mangadex.show_artist)
                //     url_info.includes.push("manga");

                // hack a way to use the site icon as a language flag
                // The MangadexDataAggregator will decide if it's an icon or flag and how to style it
                if (xlinks_api.config.mangadex.show_icon)
                    url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        }._w(90);
        var md_ch_url_info_to_data = function (url_info, callback) {
            // make chapter api call with its id as context
            // the parse_response functions will then add their data to the aggregator
            var ctx = url_info.context.split("_");
            var aggregator = new MangadexDataAggregator(callback);
            aggregator.context = ctx[1];
            md_aggregators[ctx[1]] = aggregator;

            var chdata = xlinks_api.cache_get(url_info.id, null);
            if (chdata !== null) {
                aggregator.add_data("chapter", chdata);
                md_get_other_ch_data(url_info, chdata, aggregator);
            }
            else {
                xlinks_api.request("mangadex", "generic", url_info.id, url_info, (err, data) => {
                    if (err == null) {
                        md_set_data(data, url_info, (err) => {});
                        aggregator.add_data("chapter", data);
                        md_get_other_ch_data(url_info, data, aggregator);
                    }
                });
            }
        }._w(91);
        var md_get_other_ch_data = function (url_info, data, aggregator) {
            var has_manga = false;
            var has_groups = 0;
            var group_num = 0;

            if (data.relationships !== undefined) {
                for (let i = 0; i < data.relationships.length; i++) {
                    if (data.relationships[i].type == "scanlation_group")
                        group_num++;
                }
                if (xlinks_api.config.mangadex.show_group)
                    aggregator.group_num = group_num;

                for (let i = 0; i < data.relationships.length; i++) {
                    switch (data.relationships[i].type) {
                        case "scanlation_group": {
                            has_groups++;
                            if (data.relationships[i].attributes !== undefined) {
                                let groupdata = {
                                    id:   data.relationships[i].id || null,
                                    name: data.relationships[i].attributes.name || null,
                                };
                                xlinks_api.cache_set("group_" + groupdata.id, groupdata, 7 * xlinks_api.ttl_1_day);
                                aggregator.add_data("group", groupdata);
                            }
                            else {
                                let group_url_info = {
                                    id: data.relationships[i].id,
                                    context: "group_" + data.id,
                                    type: "group",
                                };
                                
                                let cached_groupdata = xlinks_api.cache_get("group_" + group_url_info.id);
                                if (cached_groupdata !== null)
                                    aggregator.add_data("group", cached_groupdata);
                                else
                                    xlinks_api.request("mangadex", "generic", group_url_info.id, group_url_info, (err, data) => {});
                            }
                            break;
                        }

                        case "manga": {
                            has_manga = true;
                            // (v1.4) new strategy: always make a manga API call to so we have the author/artist info ready for the actions pane
                            let manga_url_info = {
                                id: data.relationships[i].id,
                                context: "manga_" + data.id,
                                type: "manga",
                                includes: ["author", "artist"],
                            };
                            
                            let cached_mangadata = xlinks_api.cache_get("manga_" + manga_url_info.id);
                            if (cached_mangadata !== null && cached_mangadata.relationships) {
                                md_get_other_manga_data(data.id, cached_mangadata, aggregator);
                                aggregator.add_data("manga", cached_mangadata);
                            }
                            else
                                xlinks_api.request("mangadex", "generic", manga_url_info.id, manga_url_info, (err, data) => {});
                            break;
                        }
                    }
                }
            }

            if (!has_manga) {
                mangadata = {
                    title: null,
                    altTitles: null,
                    descrition: null,
                    originalLanguage: null,
                    state: null,
                    status: null,
                    tags: null,
                };
                aggregator.add_data("manga", mangadata);
            }
            if (xlinks_api.config.mangadex.show_group && has_groups < group_num) {
                aggregator.group_num = has_groups;
                aggregator.validate();
            }
        }._w(92);

        var md_create_actions = function (data, url_info, callback, retry = false) {
            let aggregator = md_aggregators[url_info.id];
            // console.log(["md_create_actions", data, url_info, aggregator]);

            const tag_marker_Y = " [X]";
            const tag_marker_N = "";

            // [id, base_title]
            var title_data = [aggregator.data.manga.id, aggregator.data.final.manga];

            // [[id, name], [id, name], ...]
            var group_data = Array();
            if (aggregator.data.groups.length > 0) {
                for (let i = 0; i < aggregator.data.groups.length; i++) {
                    group_data.push([aggregator.data.groups[i].id, aggregator.data.groups[i].name]);
                }
            }

            // [[id, name, roles], [id, name, roles], ...]
            var author_data = Array();
            var added_author_ids = Array();
            var mangadata;
            if (aggregator.data.authors.length > 0) {
                for (let i = 0; i < aggregator.data.authors.length; i++) {
                    if (added_author_ids.indexOf(aggregator.data.authors[i].id) != -1) continue;
                    let roles = Array();
                    if (aggregator.data.author_ids.indexOf(aggregator.data.authors[i].id) != -1)
                        roles.push("Author");
                    if (aggregator.data.artist_ids.indexOf(aggregator.data.authors[i].id) != -1)
                        roles.push("Artist");
                    author_data.push([aggregator.data.authors[i].id, aggregator.data.authors[i].name, roles]);
                    added_author_ids.push(aggregator.data.authors[i].id);
                }
            }
            else {
                // get data from aggregator's manga data or cached manga data
                var author_ids = Array();
                var artist_ids = Array();
                var author_list = Array();
                if (aggregator.data.manga.relationships)
                    mangadata = aggregator.data.manga;
                else
                    mangadata = xlinks_api.cache_get("manga_" + aggregator.data.manga.id);
                if (mangadata !== null && mangadata.relationships) {
                    for (let i = 0; i < mangadata.relationships.length; i++) {
                        if (mangadata.relationships[i].type != "author" && mangadata.relationships[i].type != "artist") continue;
                        author_list.push(mangadata.relationships[i])
                        if (mangadata.relationships[i].type == "author")
                            author_ids.push(mangadata.relationships[i].id)
                        if (mangadata.relationships[i].type == "artist")
                            artist_ids.push(mangadata.relationships[i].id)
                    }
                    for (let i = 0; i < author_list.length; i++) {
                        if (added_author_ids.indexOf(author_list[i].id) != -1) continue;
                        let roles = Array();
                        if (author_ids.indexOf(author_list[i].id) != -1)
                            roles.push("Author");
                        if (artist_ids.indexOf(author_list[i].id) != -1)
                            roles.push("Artist");
                        author_data.push([author_list[i].id, author_list[i].attributes.name, roles]);
                        added_author_ids.push(author_list[i].id);
                    }
                }
                else {
                    // console.log(["No cached manga data with relationships:", aggregator.data.manga.id, mangadata]);
                }
            }
            if (author_data.length == 0 && !retry) {
                // console.log("No authors found. Initiating new manga data request.");
                let manga_url_info = {
                    id: aggregator.data.manga.id,
                    context: "manga_" + aggregator.data.chapter.id,
                    type: "manga",
                    includes: ["author", "artist"],
                };
                // Not aborting here and returning incomplete details would lock the details pane until the page is reloaded.
                // Exit this function and let the request callback try again.
                xlinks_api.request("mangadex", "generic", manga_url_info.id, manga_url_info, (err, mdata) => {
                    if (err == null) {
                        md_create_actions(data, url_info, callback, true);
                    }
                });
                return;
            }

            // [[id, name, group], [id, name, group], ...]
            var tag_data = Array();
            var tag_groups = {};
            // console.log([]);
            if (aggregator.data.manga.tags)
                mangadata = aggregator.data.manga;
            else {
                let cached_mangadata = xlinks_api.cache_get("manga_" + aggregator.data.manga.id);
                if (cached_mangadata.tags)
                    mangadata = cached_mangadata;
                else
                    mangadata = {tags: []};
            }

            for (let i = 0; i < mangadata.tags.length; i++) {
                let tag_id = mangadata.tags[i].id;
                let tag_group = mangadata.tags[i].attributes.group;
                tag_group = tag_group.charAt(0).toUpperCase() + tag_group.substr(1);

                let tag_name = "";
                if (mangadata.tags[i].attributes.name.en !== undefined)
                    tag_name = mangadata.tags[i].attributes.name.en;
                else {
                    let keys = Object.keys(mangadata.tags[i].attributes.name);
                    tag_name = mangadata.tags[i].attributes.name[keys[0]];
                }
                
                if (tag_groups[tag_group] == undefined)
                    tag_groups[tag_group] = Array();
                tag_groups[tag_group].push([tag_id, tag_name, tag_group]);
            }

            let tag_group_keys = Object.keys(tag_groups);
            for (let i = 0; i < tag_group_keys.length; i++) {
                tag_data = tag_data.concat(tag_groups[tag_group_keys[i]]);
            }

            // array of [descriptor, url, link_text]
            let urls = [];
            let base_url = "https://mangadex.org/";
            let last_descriptor = "";
            let descriptor = "";
            let tag_marker = "";
            let tag_array = xlinks_api.config.mangadex.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");

            urls.push(["Title:", base_url + "title/" + title_data[0], title_data[1]]);
            for (let i = 0; i < group_data.length; i++) {
                descriptor = "Group:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                urls.push([descriptor, base_url + "group/" + group_data[i][0], group_data[i][1]]);
            }
            for (let i = 0; i < author_data.length; i++) {
                descriptor = author_data[i][2].join(", ") + ":";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                urls.push([descriptor, base_url + "author/" + author_data[i][0], author_data[i][1]]);
            }
            for (let i = 0; i < tag_data.length; i++) {
                descriptor = tag_data[i][2] + ":";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                tag_marker = (aggregator.tag_filter_tripped && (tag_array.indexOf(tag_data[i][1].toLowerCase()) >= 0)) ? tag_marker_Y : tag_marker_N;

                urls.push([descriptor+tag_marker, base_url + "tag/" + tag_data[i][0], tag_data[i][1]]);
            }

            callback(null, urls);
        }._w(93);


        // Dynasty-Scans
        var ds_get_data = function (info) {
            var data = xlinks_api.cache_get("ds_" + info.id);
            return data;
        }._w(94);
        var ds_set_data = function (data, info, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            if (info.lifetime !== undefined) lifetime = info.lifetime;
            xlinks_api.cache_set("ds_" + info.id, data, lifetime);
            if (err_callback !== null) err_callback(null);
        }._w(95);

        var ds_chapter_setup_xhr = function (callback) {
            var info = this.infos[0];
            callback(null, {
                method: "GET",
                url: "https://dynasty-scans.com/chapters/" + info.id,
            });
        }._w(96);
        var ds_chapter_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var html = xlinks_api.parse_html(xhr.responseText, null),
                info = this.infos[0],
                data, nn, n2;

            if (html === null) {
                callback("Invalid response");
                return;
            }

            data = {
                base_title: null,
                title: null,
                authors: [],
                groups: [],
                volumes: [],
                pages: null,
                releasedAt: null,
                tags: [],
                links: {
                    // each entry: [link, label]
                    // or {name: link}
                    base_title: [],
                    authors: {},
                    groups: {},
                    volumes: {},
                    tags: {},
                },
            };

            // title
            if ((nn = $("#chapter-title > b", html)) !== null) {
                data.base_title = nn.textContent.trim();
                if ((n2 = $("a", nn)) !== null)
                    data.links.base_title = [n2.getAttribute("href"), n2.innerText];
            }
            else {
                callback(null, [{error: "Invalid chapter"}]);
                return;
            }

            // authors
            if ((nn = $$("#chapter-title > a", html)).length > 0) {
                for (let i = 0; i < nn.length; i++) {
                    data.authors.push(nn[i].textContent.trim());
                    data.links.authors[nn[i].textContent.trim()] = nn[i].getAttribute("href");
                }
            }

            // pages
            data.pages = $$("a.page", html).length;

            // volumes
            if ((nn = $$("span.volumes > a", html)).length > 0) {
                for (let i = 0; i < nn.length; i++) {
                    data.volumes.push(nn[i].textContent.trim());
                    data.links.volumes[nn[i].textContent.trim()] = nn[i].getAttribute("href");
                }
            }

            // groups
            if ((nn = $$("span.scanlators > a", html)).length > 0) {
                for (let i = 0; i < nn.length; i++) {
                    if (nn[i].textContent.trim().length > 0) {
                        data.groups.push(nn[i].textContent.trim());
                        data.links.groups[nn[i].textContent.trim()] = nn[i].getAttribute("href");
                    }
                    else if ((n2 = $("img", nn[i])) !== null) {
                        // check the a > img.alt attribute, e.g. for /u/ scanlations
                        data.groups.push(n2.getAttribute("alt"));
                        data.links.groups[n2.getAttribute("alt")] = nn[i].getAttribute("href");
                    }
                }
            }

            // releasedAt
            if ((nn = $("span.released", html)) !== null) {
                data.releasedAt = nn.textContent.trim();
                data.releasedAt = data.releasedAt.replace(/\s+/g, " ");
            }

            // tags
            if ((nn = $$("span.tags > a.label", html)).length > 0) {
                for (let i = 0; i < nn.length; i++) {
                    data.tags.push(nn[i].textContent.trim());
                    data.links.tags[nn[i].textContent.trim()] = nn[i].getAttribute("href");
                }
            }

            ds_set_data(data, info, (err) => {
                if (err !== null)
                    console.log("Error caching Dynasty data.");
            })
            data.title = ds_make_title(data, info);

            callback(null, [data]);
        }._w(97);

        var ds_ch_url_get_info = function (url, callback) {
            var m = /(https?:\/*)?(?:www\.)?dynasty-scans\.com\/chapters\/([^#]+)/i.exec(url),
                url_info;
            if (m !== null && m[2] !== undefined) {
                url_info = {
                    id: m[2],
                    site: "dynasty",
                    type: "chapter",
                    tag: "DS",
                };

                if (xlinks_api.config.dynasty.show_icon) {
                    if (xlinks_api.config.dynasty.tag_filter.trim() !== "")
                        url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;
                    else
                        url_info.icon = "site_DS";
                }

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        }._w(98);
        var ds_ch_url_info_to_data = function (url_info, callback) {
            // var dsdata = xlinks_api.cache_get(url_info.id, null);
            var dsdata = ds_get_data(url_info);
            if (dsdata !== null) {
                dsdata.title = ds_make_title(dsdata, url_info);
                callback(null, dsdata);
            }
            else
                xlinks_api.request("dynasty", "chapter", url_info.id, url_info, callback);
        }._w(99);

        var ds_make_title = function (data, url_info) {
            var title = data.base_title;
            if (xlinks_api.config.dynasty.show_author && data.authors.length > 0)
                title = "[" + data.authors.join(", ") + "] " + title;
            if (xlinks_api.config.dynasty.show_pages)
                title += " (" + String(data.pages) + "p)";
            if (xlinks_api.config.dynasty.show_group && data.groups.length > 0) {
                title += " [" + data.groups.join(', ') + "]";
            }
            title = title.replace(/\s+/g, " ");

            // modify the icon if there's a tag filter defined
            if (xlinks_api.config.dynasty.tag_filter.trim() !== "") {
                // "A a, bB, C c c" -> ["a a", "bb", "c c c"]
                var tag_array = xlinks_api.config.dynasty.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");
                var filter_match = false;

                for (let i = 0; i < data.tags.length; i++) {
                    if (tag_array.indexOf(data.tags[i].toLowerCase()) >= 0) {
                        filter_match = true;
                        break;
                    }
                }

                // console.log([title, data.tags, tag_array, filter_match])
                replace_icon(url_info.id, "dynasty", "site_DS", filter_match);
            }

            return title;
        }._w(100);

        var ds_create_actions = function (data, info, callback, retry = false) {
            const tag_marker_Y = " [X]";
            const tag_marker_N = "";

            // console.log(["ds_create_actions", data, info, callback]);
            if (data.links == undefined) {
                if (retry) {
                    callback(null, [["Error:", null, "No details available. Try clearing the cache in the X-Links settings."],
                                    ["Hint:", null, "The [X-links] button at the top/bottom of the page or in the drop-down of the 4chan X header."]]);
                    return;
                }
                // No link data. Must be from an earlier version that didn't collect it.
                // Make a new request and let its callback try again.
                xlinks_api.request("dynasty", "chapter", info.id, info, (err, dsdata) => {
                    if (err == null) {
                        ds_create_actions(dsdata, info, callback, true);
                    }
                });
                return;
            }

            // array of [descriptor, url, link_text]
            var urls = Array();
            var base_url = "https://dynasty-scans.com";
            var last_descriptor = "";
            let descriptor = "";
            let tag_array = xlinks_api.config.dynasty.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");
            let tag_marker = "";

            if (data.releasedAt)
                urls.push(["Released:", null, data.releasedAt]);

            if (data.links.base_title.length > 0)
                urls.push(["Title:", base_url + data.links.base_title[0], data.links.base_title[1]]);

            for (i=0; i < data.authors.length; i++) {
                descriptor = "Author:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                urls.push([descriptor, base_url + data.links.authors[data.authors[i]], data.authors[i]]);
            }

            for (i=0; i < data.groups.length; i++) {
                descriptor = "Group:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                urls.push([descriptor, base_url + data.links.groups[data.groups[i]], data.groups[i]]);
            }

            for (i=0; i < data.volumes.length; i++) {
                descriptor = "Volume:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                urls.push([descriptor, base_url + data.links.volumes[data.volumes[i]], data.volumes[i]]);
            }

            for (i=0; i < data.tags.length; i++) {
                descriptor = "Tag:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor

                tag_marker = (tag_array.indexOf(data.tags[i].toLowerCase()) >= 0) ? tag_marker_Y : tag_marker_N;

                urls.push([descriptor+tag_marker, base_url + data.links.tags[data.tags[i]], data.tags[i]]);
            }

            callback(null, urls);
        }._w(101);


        // bato.to
        class BatoDataAggregator {
            constructor(final_callback) {
                this.callback = final_callback;
                this.context = null;
                this.tag_filter_tripped = false;
                this.domain = "bato.to";
                this.data = {
                    series: {
                        title: "",
                        language: "",
                        url: "",
                        genres: [],
                        // [[author, url], [author, url], ...]
                        authors: Array(),
                    },
                    chapter: {
                        series_id: "",
                        num: "",    // e.g. "Volume 5 Chapter 21.5"
                        title: "",  // e.g. "Extras: Volume 4 & Twitter Part 4"
                        // pages: 0,
                    }
                };
            }

            add_data(category, data) {
                this.data[category] = data;
                this.validate();
            }

            validate() {
                if (this.data.series.title == "") return;
                if (this.data.chapter.num == "") return;

                // make a usable object out of the categories
                var aggdata = {
                    language: "",
                    author: "",
                    series: "",
                    chapter_num: "",
                    chapter_title: "",
                    // pages: "",
                    title: "",
                };
                var template = "";

                // "${language} ${author} ${series} ${chapter_num} ${chapter_title} ${pages} ${group}"
                if (xlinks_api.config.bato.show_orig_lang && !xlinks_api.config.bato.use_flags && this.data.series.language)
                    template += "${language} ";
                if (xlinks_api.config.bato.show_author && this.data.series.authors.length > 0)
                    template += "${author} ";
                if (this.data.series.title)
                    template += "${series} ";
                if (this.data.chapter.num)
                    template += "${chapter_num} ";
                if (xlinks_api.config.bato.show_ch_title && this.data.chapter.title)
                    template += "${chapter_title} ";
                // if (xlinks_api.config.bato.show_pages && this.data.chapter.pages)
                //     template += "${pages} ";

                if (this.data.series.authors.length > 0) {
                    let author_names = Array();
                    for (let i = 0; i < this.data.series.authors.length; i++) {
                        author_names.push(this.data.series.authors[i][0]);
                    }
                    aggdata.author = "[" + author_names.join(", ") + "]";
                }

                if (this.data.series.title)    aggdata.series        = this.data.series.title;
                if (this.data.chapter.num)     aggdata.chapter_num   = this.data.chapter.num;
                if (this.data.chapter.title)   aggdata.chapter_title = '- "' + this.data.chapter.title + '"';
                if (this.data.series.language) aggdata.language      = '[' + this.data.series.language + ']';
                if (this.data.chapter.pages)   aggdata.pages         = "(" + this.data.chapter.pages + "p)";

                aggdata.title = interpolate(template, aggdata);
                aggdata.title = aggdata.title.replace(/^\s+/, "");
                aggdata.title = aggdata.title.replace(/\s$/, "");
                aggdata.title = aggdata.title.replace(/\s+/g, " ");

                if (xlinks_api.config.bato.show_icon) {
                    // modify the [MD] tag into an icon or flag
                    // apply a style if the tag filter is tripped
                    let icon_name = "site_BT";
                    let apply_style = false;

                    if (xlinks_api.config.bato.show_orig_lang && xlinks_api.config.bato.use_flags && lang_to_flag[this.data.series.language] !== undefined)
                        icon_name = lang_to_flag[this.data.series.language]

                    // search for tags matching the tag filter
                    if (xlinks_api.config.bato.tag_filter.trim() !== "") {
                        // "A a, bB, C c c" -> ["a a", "bb", "c c c"]
                        let tag_array = xlinks_api.config.bato.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");

                        for (let i = 0; i < this.data.series.genres.length; i++) {
                            if (tag_array.indexOf(this.data.series.genres[i].toLowerCase()) >= 0) {
                                apply_style = true;
                                break;
                            }
                        }
                        // console.log([aggdata.title, data.manga.tags, tag_array, apply_style])
                    }

                    this.tag_filter_tripped = apply_style;
                    replace_icon(this.context, "bato", icon_name, apply_style);
                }

                this.callback(null, aggdata);
            }
        }

        var bt_aggregators = {};

        var bt_v3_lang_short = {
            "Japanese": "jp",
            "Korean": "kr",
            "Chinese": "zh",
            "Chinese (繁)": "zh",
            "Chinese (粵)": "zh",
            "Indonesian": "id",
            "Thai": "th",
        };

        const bt_mirrors = [
            "xbato\\.com", "xbato\\.net", "xbato\\.org", "zbato\\.com", "zbato\\.net", "zbato\\.org", "readtoto\\.com",
            "readtoto\\.net", "readtoto\\.org", "batocomic\\.com", "batocomic\\.net", "batocomic\\.org", "batotoo\\.com",
            "batotwo\\.com", "battwo\\.com", "comiko\\.net", "comiko\\.org", "mangatoto\\.com", "mangatoto\\.net",
            "mangatoto\\.org", "dto\\.to", "fto\\.to", "jto\\.to", "hto\\.to", "mto\\.to", "wto\\.to", "bato\\.to",
        ];
        const bt_mirrors_re = bt_mirrors.join("|");

        var bt_get_data = function (key) {
            var data = xlinks_api.cache_get("bt_" + key);
            return data;
        }._w(102);
        var bt_set_data = function (key, data, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            xlinks_api.cache_set("bt_" + key, data, lifetime);
            if (err_callback !== null) err_callback(null);
        }._w(103);

        var bt_chapter_setup_xhr = function (callback) {
            var info = this.infos[0];

            // context should be "chapter_{id}"
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;

            if (info.bt_version == 2) {
                callback(null, {
                    method: "GET",
                    url: "https://"+info.domain+"/chapter/"+info.id+"/1",
                    context: [2, "chapter", ctx],
                });
            } else if (info.bt_version == 3) {
                callback(null, {
                    method: "GET",
                    url: "https://"+info.domain+"/title/"+info.series_id+"/"+info.id+"?load=0",
                    context: [3, "chapter", ctx],
                });
            } else {
                console.error(['bt_chapter_setup_xhr: Unsupported bt_version', info]);
            }
        }._w(104);
        var bt_series_setup_xhr = function (callback) {
            var info = this.infos[0];

            // context should be "chapter_{id}"
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;
            callback(null, {
                method: "GET",
                url: "https://"+info.domain+"/title/"+info.series_id,
                context: [3, "series", ctx],
            });
        }._w(105);
        var bt_generic_parse_response = function (xhr, callback) {
            var bt_version = xhr.context[0];
            var resp_type = xhr.context[1];

            if (resp_type == "chapter") {
                if      (bt_version == 2) bt_chapter_v2_parse_response(xhr, callback);
                else if (bt_version == 3) bt_chapter_v3_parse_response(xhr, callback);
                else console.error(['bt_generic_parse_response: Unsupported chapter bt_version', xhr]);
            } else if (resp_type = "series") {
                if (bt_version == 3) bt_series_v3_parse_response(xhr, callback);
                else console.error(['bt_generic_parse_response: Unsupported series bt_version', xhr]);
            } else {
                console.error(['bt_generic_parse_response: Unsupported response type', xhr]);
            }
        }._w(106)

        var bt_chapter_v2_parse_response = function (xhr, callback) {
            var ctx = xhr.context[2];
            var chapter_id = ctx.split('_')[1];

            var html = xlinks_api.parse_html(xhr.responseText, null);

            var ch_data = {
                series_id: "",
                num: "",
                title: "",
                // pages: 0,
            };

            // ch_data.pages = $$('img.page-img', html).length;
            // if (ch_data.pages == 0) ch_data.pages = $$('select optgroup[label="Page"] option', html).length;

            var series_a = $('h3.nav-title a', html);
            if (series_a !== null) {
                // "https://bato.to/series/137465" or just "/series/137465"
                let series_a_split = series_a.href.split('/');
                ch_data.series_id = series_a_split[series_a_split.length - 1];

                // make the series "API" request
                url_info = {
                    bt_version: 3,
                    id: chapter_id,
                    series_id: ch_data.series_id,
                    site: "bato",
                    type: "chapter",
                    tag: "BT",
                    context: ctx,
                }

                xlinks_api.request("bato", "series", url_info.series_id, url_info,
                    (err, data) => {
                        if (err !== null) return;
                        bt_set_data("series_"+url_info.series_id, data, (err) => {});
                        let aggregator = bt_aggregators[url_info.id];
                        aggregator.add_data("series", data);
                    }
                );
            } else console.error("bt_chapter_v2_parse_response: not found: 'h3.nav-title a'");

            // get chapter title from the dropdown
            var ch_option = $('select optgroup option[value="'+chapter_id+'"]', html);
            if (ch_option !== null) {
                // ch_option.innerText examples:
                //      "Volume 1 Chapter 1\n           : You’re a Bad Girl, Huh?\n                  "
                //      "Volume 5 Chapter 21.5\n           : Extras: Volume 4 & Twitter Part 4\n                  "
                //      "Chapter 1\n                  "
                // they always end on an extra \n and a bunch of spaces
                let title_split = ch_option.innerText.split('\n');

                if (title_split.length > 1) ch_data.num   = title_split[0].trim();
                if (title_split.length > 2) ch_data.title = title_split[1].trim();

                if (ch_data.title.startsWith(': ')) ch_data.title = ch_data.title.substring(2);
            } else console.error("bt_chapter_v2_parse_response: not found: 'select optgroup option[value=\""+chapter_id+"\"]'");

            callback(null, [ch_data]);
        }._w(107);
        var bt_chapter_v3_parse_response = function (xhr, callback) {
            var ctx = xhr.context[2];
            var chapter_id = ctx.split('_')[1];

            var html = xlinks_api.parse_html(xhr.responseText, null);
            // console.log(["bt_chapter_v3_parse_response", chapter_id, html]);

            var ch_data = {
                series_id: "",
                num: "",
                title: "",
                // pages: 0,
            };

            // ch_data.pages = $$('div[name="image-item"]', html).length;
            // console.log(["bt_chapter_v3_parse_response", "pages", $$('div[name="image-item"]', html)]);

            var series_a = $('h3 a[href*="/title/"]', html);
            if (series_a !== null) {
                var title_m = /title\/(\d+)/.exec(series_a.href);
                if (title_m) ch_data.series_id = title_m[1];
            }

            var ch_option = $('select optgroup[label="Chapters"] option[key="'+chapter_id+'"]', html);
            // console.log(["bt_chapter_v3_parse_response", ch_option]);
            if (ch_option !== null) {
                // ch_option.innerText examples:
                //      "Volume 5 Chapter 21.5 : Extras: Volume 4 & Twitter Part 4"
                //      "Volume 1 Chapter 1 : You’re a Bad Girl, Huh?"
                //      "Chapter 1"
                let title_split = ch_option.innerText.split(' : ');

                if (title_split.length > 0) ch_data.num   = title_split[0].trim();
                if (title_split.length > 1) ch_data.title = title_split[1].trim();
            } else console.error("bt_chapter_v3_parse_response: not found: 'select optgroup[label=\"Chapters\"] option[key=\""+chapter_id+"\"]'");

            callback(null, [ch_data]);
        }._w(108);
        var bt_series_v3_parse_response = function (xhr, callback) {
            var ctx = xhr.context[2];
            var chapter_id = ctx.split('_')[1];
            // console.log(["bt_series_v3_parse_response", xhr]);

            var html = xlinks_api.parse_html(xhr.responseText, null);

            var series_data = {
                title: "",
                language: "",
                url: "",
                genres: [],
                authors: [],
            };


            var series_a = $('h3 a[href*="/title/"]', html);
            if (series_a !== null) {
                series_data.title = series_a.innerText;
                // series_a.href would get expanded using the domain the script is running on and not bato.to
                series_data.url = series_a.getAttribute("href");
            }


            var language_spans = $$('div.whitespace-nowrap span', html);
            // console.log(["bt_series_v3_parse_response", "language_spans:", language_spans]);
            if (language_spans.length > 0) {
                // [🇬🇧, English, Tr From, 🇨🇳, Chinese]
                let orig_lang = language_spans[language_spans.length - 1].innerText;
                if (bt_v3_lang_short[orig_lang] !== undefined) series_data.language = bt_v3_lang_short[orig_lang];
            } else console.error("bt_series_v3_parse_response: not found: 'div.whitespace-nowrap span'");


            // <div class="flex items-center flex-wrap">
            //     <b class="hidden md:inline-block mr-2 text-base-content/50">Genres:</b>
            //     <span>
            //         <span class="font-bold">Manhua</span>
            //         <span class="text-base-content/80 px-1">,</span>
            //     </span>
            //     <span>
            //         <span class="font-bold">Webtoon</span>
            //         <span class="text-base-content/80 px-1">,</span>
            //     </span>

            // Maybe there's smart jquery that find this thing in one line, but I don't know it
            var genre_list_candidates_b = $$('div.flex b', html);
            var genre_list_div = null;
            var genre_spans = [];

            for (var i = 0; i < genre_list_candidates_b.length; i++) {
                if (genre_list_candidates_b[i].innerText.includes('Genres:')) {
                    genre_list_div = genre_list_candidates_b[i].parentNode;
                    break;
                }
            }

            if (genre_list_div !== null)
                genre_spans = $$('span span:nth-child(1)', genre_list_div);
            else console.error("bt_series_v3_parse_response: not found: 'span span:nth-child(1)'");

            for (var i = 0; i < genre_spans.length; i++) {
                series_data.genres.push(genre_spans[i].innerText);
            }


            // authors
            //  [[author, url], [author, url], ...]
            var author_a_list = $$('div.mt-3 div.mt-2 a[href*="v3x-search"]', html);
            for (var i = 0; i < author_a_list.length; i++) {
                // the .href attribute gets expanded automatically with the current domain
                series_data.authors.push([author_a_list[i].innerText, author_a_list[i].getAttribute('href')]);
            }


            // console.log(["bt_series_v3_parse_response", series_data]);
            callback(null, [series_data]);
        }._w(109);

        var bt_ch_url_get_info = function (url, callback) {
            let series_id, chapter_id;

            // https://bato.to/chapter/3362345
            // no series_id in the url
            //  m_v2[1] = "https://"
            //  m_v2[2] = domain
            //  m_v2[3] = chapter_id
            let m_v2 = new RegExp(String.raw`(https?:\/*)?(?:www\.)?(${bt_mirrors_re})\/chapter\/(\d+)`, "i").exec(url);

            // https://bato.to/title/137465-destroy-it-all-and-love-me-in-hell/3362345-vol_5-ch_21.5
            // https://bato.to/title/{series_id}-.../{chapter_id}-...
            //  m_v3[1] = "https://"
            //  m_v3[2] = domain
            //  m_v3[3] = series_id
            //  m_v3[4] = chapter_id
            let m_v3 = new RegExp(String.raw`(https?:\/*)?(?:www\.)?(${bt_mirrors_re})\/title\/(\d+)-[^\/]+\/(\d+)`, "i").exec(url);

            // console.log(["bt_ch_url_get_info", url, m_v2, m_v3]);

            if (m_v2 !== null) {
                // get the chapter html first and figure out the series url from there
                var url_info = {
                    domain: m_v2[2],
                    bt_version: 2,
                    id: m_v2[3],
                    site: "bato",
                    type: "chapter",
                    tag: "BT",
                    context: "chapter_" + m_v2[3],
                }

                // bato.to has language flags as well
                if (xlinks_api.config.bato.show_icon)
                    url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;

                // console.log(["bt_ch_url_get_info", "v2", url_info]);
                callback(null, url_info);
            } else if (m_v3 !== null) {
                // we can get both chapter and series html at once here
                var url_info = {
                    domain: m_v3[2],
                    bt_version: 3,
                    series_id: m_v3[3],
                    id: m_v3[4],
                    site: "bato",
                    type: "chapter",
                    tag: "BT",
                    context: "chapter_" + m_v3[4],
                }

                // bato.to has language flags as well
                if (xlinks_api.config.bato.show_icon)
                    url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;

                // console.log(["bt_ch_url_get_info", "v3", url_info]);
                callback(null, url_info);
            } else {
                callback(null, null);
            }
        }._w(110);
        var bt_ch_url_info_to_data = function (url_info, callback) {
            var aggregator = new BatoDataAggregator(callback);
            aggregator.context = url_info.id;
            if (url_info.domain) aggregator.domain = url_info.domain;
            bt_aggregators[url_info.id] = aggregator;

            var chapterdata = bt_get_data("chapter_"+url_info.id);
            var series_id = null;

            if (url_info.bt_version == 3)  series_id = url_info.series_id;
            else if (chapterdata !== null) series_id = chapterdata.series_id;
            url_info.series_id = url_info.series_id || series_id;

            var seriesdata = bt_get_data("series_"+url_info.series_id);
            // console.log(["bt_ch_url_info_to_data", url_info, series_id, chapterdata, seriesdata]);

            if (chapterdata !== null) {
                aggregator.add_data("chapter", chapterdata);
            } else {
                // console.log(["bt_ch_url_info_to_data", "making chapter request", url_info.id, url_info]);
                xlinks_api.request("bato", "chapter", url_info.id, url_info, 
                    (err, data) => {
                        if (err !== null) return;
                        bt_set_data("chapter_"+url_info.id, data, (err) => {});
                        aggregator.add_data("chapter", data);
                    }
                );
            }

            if (seriesdata !== null) {
                aggregator.add_data("series", seriesdata);
            } else if (series_id) {
                // console.log(["bt_ch_url_info_to_data", "making series request", series_id, url_info]);
                xlinks_api.request("bato", "series", series_id, url_info,
                    (err, data) => {
                        if (err !== null) return;
                        bt_set_data("series_"+series_id, data, (err) => {});
                        aggregator.add_data("series", data);
                    }
                );
            }
        }._w(111);

        var bt_create_actions = function (data, info, callback, retry = false) {
            const tag_marker_Y = " [X]";
            const tag_marker_N = "";

            // Todo: incorporate retry into this if necessary
            let aggregator = bt_aggregators[info.id];
            if (aggregator == undefined && !retry) return;

            // array of [descriptor, url, link_text]
            let urls = [];
            let last_descriptor = "";
            let descriptor = "";
            let tag_array = xlinks_api.config.bato.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");
            let tag_marker = "";
            let base_url = "https://" + aggregator.domain;

            if (aggregator.data.series.title) {
                descriptor = "Title:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                if (aggregator.data.series.url)
                    urls.push([descriptor, base_url+aggregator.data.series.url, aggregator.data.series.title]);
                else
                    urls.push([descriptor, null, aggregator.data.series.title]);
            }

            for (var i = 0; i < aggregator.data.series.authors.length; i++) {
                descriptor = "Author:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                urls.push([descriptor, base_url+aggregator.data.series.authors[i][1], aggregator.data.series.authors[i][0]]);
            }

            for (var i = 0; i < aggregator.data.series.genres.length; i++) {
                descriptor = "Genre:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                tag_marker = (aggregator.tag_filter_tripped && (tag_array.indexOf(aggregator.data.series.genres[i].toLowerCase()) >= 0)) ? tag_marker_Y : tag_marker_N;

                urls.push([descriptor+tag_marker, null, aggregator.data.series.genres[i]]);
            }

            callback(null, urls);
        }._w(112);


        // comick.io
        class ComickDataAggregator {
            constructor(final_callback) {
                this.callback = final_callback;
                this.context = null;
                this.tag_filter_tripped = false;
                this.data = {
                    series: {
                        slug: "",
                        // the default title
                        title: "",
                        // other language titles
                        // some have a "null" language in the API; we ignore those
                        // {"ja": "忍者と殺し屋のふたりぐらし", "ru": "Жизнь ниндзя и убийцы", ...}
                        titles: {},
                        // "iso639_1"
                        language: "",
                        // {genre_group: [[genre_name, genre_slug], ...], ...}
                        genres: {},
                        // [[tag_name, tag_slug], ...]
                        tags: [],
                        // [[author_name, author_slug, is_artist, is_author], ...]
                        authors: [],
                    },
                    chapter: {
                        vol: "",    // e.g. "5"
                        num: "",    // e.g. "21.5"
                        title: "",  // e.g. "Extras: Volume 4 & Twitter Part 4"
                        pages: 0,
                        // [[group_name, group_slug], [group_name, group_slug], ...]
                        groups: [],

                    },
                    final_title: "",
                };
            }

            add_data(category, data) {
                this.data[category] = data;
                this.validate();
            }

            validate() {
                if (this.data.series.title == "") return;
                if (this.data.chapter.num == "") return;

                // make a usable object out of the categories
                var aggdata = {
                    language: "",
                    author: "",
                    series: "",
                    volume: "",
                    chapter: "",
                    chapter_title: "",
                    pages: "",
                    title: "",
                    group: "",
                };
                var template = "";

                // "${language} ${author} ${series} ${chapter_num} ${chapter_title} ${pages} ${group}"
                if (xlinks_api.config.comick.show_orig_lang && !xlinks_api.config.comick.use_flags && this.data.series.language)
                    template += "${language} ";
                if (xlinks_api.config.comick.show_author && this.data.series.authors.length > 0)
                    template += "${author} ";
                if (this.data.series.title)
                    template += "${series} ";
                if (xlinks_api.config.comick.show_volume && this.data.chapter.vol)
                    template += "${volume} ";
                if (this.data.chapter.num)
                    template += "${chapter} ";
                if (xlinks_api.config.comick.show_ch_title && this.data.chapter.title)
                    template += "${chapter_title} ";
                if (xlinks_api.config.comick.show_pages && this.data.chapter.pages)
                    template += "${pages} ";
                if (xlinks_api.config.comick.show_group && data.chapter.groups.length > 0)
                    template += "${group}";

                if (this.data.series.authors.length > 0) {
                    let author_names = [];
                    for (let i = 0; i < this.data.series.authors.length; i++) {
                        author_names.push(this.data.series.authors[i][0]);
                    }
                    aggdata.author = "[" + author_names.join(", ") + "]";
                }

                if (this.data.series.title) {
                    // default title
                    aggdata.series = this.data.series.title;

                    if (xlinks_api.config.comick.custom_title) {
                        let title_order = xlinks_api.config.comick.title_search_order.replace(/\s+/g, "").split(",");
                        let title_found = false;

                        for (var i = 0; i < title_order.length; i++) {
                            if (title_found) break;
                            let lcode = title_order[i].replace(/orig/i, this.data.series.language);
                            console.log([this.data.series.title, lcode, this.data.series.titles[lcode]]);
                            if (this.data.series.titles[lcode] !== undefined) {
                                aggdata.series = this.data.series.titles[lcode];
                                title_found = true;
                            }
                        }
                    }

                    this.data.final_title = aggdata.series;
                }

                if (this.data.chapter.vol)     aggdata.volume        = "vol. " + this.data.chapter.vol;
                if (this.data.chapter.num)     aggdata.chapter       = "ch. " + this.data.chapter.num;
                if (this.data.chapter.title)   aggdata.chapter_title = '- "' + this.data.chapter.title + '"';
                if (this.data.series.language) aggdata.language      = '[' + this.data.series.language + ']';
                if (this.data.chapter.pages)   aggdata.pages         = "(" + this.data.chapter.pages + "p)";

                if (xlinks_api.config.comick.show_group && this.data.chapter.groups.length > 0) {
                    let group_names = [];
                    for (var i = 0; i < this.data.chapter.groups.length; i++) {
                        group_names.push(this.data.chapter.groups[i][0]);
                    }
                    aggdata.group = "[" + group_names.join(", ") + "]";
                }

                aggdata.title = interpolate(template, aggdata);
                aggdata.title = aggdata.title.replace(/^\s+/, "");
                aggdata.title = aggdata.title.replace(/\s$/, "");
                aggdata.title = aggdata.title.replace(/\s+/g, " ");

                if (xlinks_api.config.comick.show_icon) {
                    // modify the [MD] tag into an icon or flag
                    // apply a style if the tag filter is tripped
                    let icon_name = "site_CK";
                    let apply_style = false;

                    if (xlinks_api.config.comick.show_orig_lang && xlinks_api.config.comick.use_flags && lang_to_flag[this.data.series.language] !== undefined)
                        icon_name = lang_to_flag[this.data.series.language]

                    // search for tags matching the tag filter
                    if (xlinks_api.config.comick.tag_filter.trim() !== "") {
                        // "A a, bB, C c c" -> ["a a", "bb", "c c c"]
                        let tag_array = xlinks_api.config.comick.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");

                        // check genres
                        Object.keys(this.data.series.genres).forEach(key => {
                            for (var i = 0; i < this.data.series.genres.length; i++) {
                                if (tag_array.indexOf(this.data.series.genres[i][0].toLowercase() >= 0)) {
                                    apply_style = true;
                                    break;
                                }
                            }
                        });

                        // check tags
                        if (!apply_style) {
                            for (let i = 0; i < this.data.series.tags.length; i++) {
                                if (tag_array.indexOf(this.data.series.tags[i][0].toLowerCase()) >= 0) {
                                    apply_style = true;
                                    break;
                                }
                            }
                        }
                    }

                    this.tag_filter_tripped = apply_style;
                    replace_icon(this.context, "comick", icon_name, apply_style);
                }

                // For some reason I absolutely cannot grasp, calling the callback before the previous block
                // will lead to this.tag_filter_tripped being unreadable with its final value. I suspect some
                // sort of "optimization" that removes writes to fields if they're no longer read afterwards.
                // console.log(["validate", this.context, this, aggdata]);
                this.callback(null, aggdata);
            }
        }

        var ck_aggregators = {};

        var ck_get_data = function (key) {
            var data = xlinks_api.cache_get("ck_" + key);
            return data;
        }._w(113);
        var ck_set_data = function (key, data, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            xlinks_api.cache_set("ck_" + key, data, lifetime);
            if (err_callback !== null) err_callback(null);
        }._w(114);

        var ck_chapter_setup_xhr = function (callback) {
            var info = this.infos[0];
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;

            callback(null, {
                method: "GET",
                url: "https://api.comick.fun/chapter/"+info.id+"/?tachiyomi=false",
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(115);
        var ck_chapter_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response");
                return;
            }

            var jsdata = xlinks_api.parse_json(xhr.responseText, null);
            // console.log(["ck_chapter_parse_response", jsdata]);
            if (jsdata == null) {
                callback("Cannot parse response");
                return;
            }

            var ch_data = {
                vol: jsdata.chapter.vol || "",
                num: jsdata.chapter.chap || "",
                title: jsdata.chapter.title || "",
                pages: 0,
                // [[group_name, group_slug], [group_name, group_slug], ...]
                groups: [],
            };

            if (jsdata.chapter.md_images) ch_data.pages = jsdata.chapter.md_images.length;

            if (jsdata.chapter.md_chapters_groups) {
                for (var i = 0; i < jsdata.chapter.md_chapters_groups.length; i++) {
                    // "md_chapters_groups": [
                    //   {
                    //     "md_group_id": 35088,
                    //     "md_groups": {
                    //       "slug": "underpaid-civ-eng-scans",
                    //       "title": "Underpaid CivEng Scans"
                    //     }
                    //   }
                    // ]
                    let group_data = jsdata.chapter.md_chapters_groups[i];
                    ch_data.groups.push([group_data.md_groups.title, group_data.md_groups.slug]);
                }
            }

            callback(null, [ch_data]);
        }._w(116);

        var ck_series_setup_xhr = function (callback) {
            var info = this.infos[0];
            var ctx = null;
            if (info.context !== undefined) ctx = info.context;

            callback(null, {
                method: "GET",
                url: "https://api.comick.fun/comic/"+info.series_id+"/?tachiyomi=false",
                headers: {"accept": "application/json"},
                context: ctx,
            });
        }._w(117);
        var ck_series_parse_response = function (xhr, callback) {
            const base_url = "https://comick.io";

            if (xhr.status !== 200) {
                callback("Invalid response");
                return;
            }

            var jsdata = xlinks_api.parse_json(xhr.responseText, null);
            // console.log(["ck_series_parse_response", jsdata]);
            if (jsdata == null) {
                callback("Cannot parse response");
                return;
            }

            var series_data = {
                slug: jsdata.comic.slug || "",
                // the default title
                title: jsdata.comic.title || "",
                // other language titles
                // some have a "null" language in the API; we ignore those
                // {"ja": "忍者と殺し屋のふたりぐらし", "ru": "Жизнь ниндзя и убийцы", ...}
                titles: {},
                // "iso639_1"
                language: jsdata.comic.iso639_1 || jsdata.comic.country || "",
                // {genre_group: [[genre_name, genre_slug], ...], ...}
                genres: {},
                // [[tag_name, tag_slug], ...]
                tags: [],
                // [[author_name, author_slug, is_artist, is_author], ...]
                authors: [],
            };


            if (jsdata.comic.md_titles) {
                for (var i = 0; i < jsdata.comic.md_titles.length; i++) {
                    // "md_titles": [
                    //   {
                    //     "title": "アンドロイドは経験人数に入りますか？？",
                    //     "lang": "ja"
                    //   },
                    //   ...
                    // ]
                    let title_data = jsdata.comic.md_titles[i];
                    // ignore "null" languages
                    if (title_data.lang && series_data.titles[title_data.lang] == undefined)
                        series_data.titles[title_data.lang] = title_data.title;
                }
            }


            if (jsdata.comic.md_comic_md_genres) {
                for (var i = 0; i < jsdata.comic.md_comic_md_genres.length; i++) {
                    // "md_comic_md_genres": [
                    //   {
                    //     "md_genres": {
                    //       "name": "Ecchi",
                    //       "type": "main",
                    //       "slug": "ecchi",
                    //       "group": "Content"
                    //     }
                    //   },
                    //   ...
                    // ]
                    let genre_data = jsdata.comic.md_comic_md_genres[i].md_genres;
                    if (series_data.genres[genre_data.group] == undefined) series_data.genres[genre_data.group] = [];
                    series_data.genres[genre_data.group].push([genre_data.name, genre_data.slug]);
                }
            }


            if (jsdata.comic.mu_comics && jsdata.comic.mu_comics.mu_comic_categories) {
                for (var i = 0; i < jsdata.comic.mu_comics.mu_comic_categories.length; i++) {
                    // "mu_comic_categories": [
                    //   {
                    //     "mu_categories": {
                    //       "title": "Android/s",
                    //       "slug": "android-s"
                    //     },
                    //     "positive_vote": 5,
                    //     "negative_vote": 0
                    //   },
                    //   ...
                    // ]
                    let tag_data = jsdata.comic.mu_comics.mu_comic_categories[i].mu_categories;
                    series_data.tags.push([tag_data.title, tag_data.slug]);
                }
            }


            // {slug: [name, is_artist, is_author]}
            let author_data = {};

            if (jsdata.artists) {
                for (var i = 0; i < jsdata.artists.length; i++) {
                    // "artists": [
                    //   {
                    //     "name": "Yakiniku Teishoku",
                    //     "slug": "yakiniku-teishoku"
                    //   }
                    // ]
                    author_data[jsdata.artists[i].slug] = [jsdata.artists[i].name, true, false];
                }
            }

            if (jsdata.authors) {
                for (var i = 0; i < jsdata.authors.length; i++) {
                    // "authors": [
                    //   {
                    //     "name": "Yakiniku Teishoku",
                    //     "slug": "yakiniku-teishoku"
                    //   }
                    // ]
                    if (author_data[jsdata.authors[i].slug] == undefined)
                        author_data[jsdata.authors[i].slug] = [jsdata.authors[i].name, false, true];
                    else
                        author_data[jsdata.authors[i].slug][2] = true;
                }
            }

            Object.keys(author_data).forEach(key => {
                series_data.authors.push([author_data[key][0], key, author_data[key][1], author_data[key][2]]);
            });


            // console.log(["ck_series_parse_response", "series_data", series_data]);
            callback(null, [series_data]);
        }._w(118);

        var ck_ch_url_get_info = function (url, callback) {
            let series_id, chapter_id;

            let m = /(https?:\/*)?(?:www\.)?comick\.io\/comic\/([^\/]+)\/([^\/\-]+)/i.exec(url);

            if (m !== null) {
                var url_info = {
                    series_id: m[2],
                    id: m[3],
                    site: "comick",
                    type: "chapter",
                    tag: "CK",
                    context: "chapter_"+m[3],
                };

                // comick.io has a "country" field we can use for country flags
                if (xlinks_api.config.comick.show_icon)
                    url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;

                callback(null, url_info);
            } else {
                callback(null, null);
            }
        }._w(119);
        var ck_ch_url_info_to_data = function (url_info, callback) {
            var aggregator = new ComickDataAggregator(callback);
            aggregator.context = url_info.id;
            ck_aggregators[url_info.id] = aggregator;

            var chapterdata = ck_get_data("chapter_"+url_info.id);
            var seriesdata = ck_get_data("series_"+url_info.series_id);

            // console.log(["ck_ch_url_info_to_data", url_info.series_id, url_info.id, chapterdata, seriesdata]);

            if (chapterdata !== null) {
                aggregator.add_data("chapter", chapterdata);
            } else {
                xlinks_api.request("comick", "chapter", url_info.id, url_info,
                    (err, data) => {
                        if (err !== null) return;
                        ck_set_data("chapter_"+url_info.id, data, (err) => {});
                        aggregator.add_data("chapter", data);
                    }
                );
            }

            if (seriesdata !== null) {
                aggregator.add_data("series", seriesdata);
            } else {
                xlinks_api.request("comick", "series", url_info.series_id, url_info,
                    (err, data) => {
                        if (err !== null) return;
                        ck_set_data("series_"+url_info.series_id, data, (err) => {});
                        aggregator.add_data("series", data);
                    }
                );
            }
        }._w(120);

        var ck_create_actions = function (data, info, callback) {
            let aggregator = ck_aggregators[info.id];

            // do nothing if the aggregator doesn't have all the data yet
            if (aggregator.data.final_title == undefined) return;

            const base_url_series = "https://comick.io/comic/";
            const base_url_group  = "https://comick.io/group/";
            const base_url_author = "https://comick.io/people/";
            const base_url_genre  = "https://comick.io/search?genres=";
            const base_url_tag    = "https://comick.io/search?tags=";
            const tag_marker_Y    = " [X]";
            const tag_marker_N    = "";

            // [[author_name, author_slug], ...]
            let artists_authors = [];
            let authors = [];
            let artists = [];

            for (var i = 0; i < aggregator.data.series.authors.length; i++) {
                let [author_name, author_slug, is_artist, is_author] = aggregator.data.series.authors[i];

                if (is_artist && is_author) artists_authors.push([author_name, author_slug]);
                else if (is_artist)         artists.push([author_name, author_slug]);
                else if (is_author)         authors.push([author_name, author_slug]);
            }



            // array of [descriptor, url, link_text]
            let urls = [];
            let last_descriptor = "";
            let descriptor = "";
            let tag_array = xlinks_api.config.comick.tag_filter.trim().replace(/,\s+/g, ",").toLowerCase().split(",");
            let tag_marker = "";


            if (aggregator.data.final_title) {
                descriptor = "Title:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                if (aggregator.data.series.slug)
                    urls.push([descriptor, base_url_series+aggregator.data.series.slug, aggregator.data.final_title]);
                else
                    urls.push([descriptor, null, aggregator.data.final_title]);
            }

            for (var i = 0; i < aggregator.data.chapter.groups.length; i++) {
                descriptor = "Group:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                let [group_name, group_slug] = aggregator.data.chapter.groups[i];
                urls.push([descriptor, base_url_group+group_slug, group_name]);
            }

            for (var i = 0; i < artists_authors.length; i++) {
                descriptor = "Artist & Author:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                let [author_name, author_slug] = artists_authors[i];
                urls.push([descriptor, base_url_author+author_slug, author_name]);
            }

            for (var i = 0; i < artists.length; i++) {
                descriptor = "Artist:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                let [author_name, author_slug] = artists[i];
                urls.push([descriptor, base_url_author+author_slug, author_name]);
            }

            for (var i = 0; i < authors.length; i++) {
                descriptor = "Author:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                let [author_name, author_slug] = authors[i];
                urls.push([descriptor, base_url_author+author_slug, author_name]);
            }

            Object.keys(aggregator.data.series.genres).forEach(key => {
                for (var i = 0; i < aggregator.data.series.genres[key].length; i++) {
                    descriptor = key + ":";
                    if (last_descriptor == descriptor) descriptor = "";
                    else last_descriptor = descriptor;

                    let [genre_name, genre_slug] = aggregator.data.series.genres[key][i];
                    tag_marker = (aggregator.tag_filter_tripped && (tag_array.indexOf(genre_name.toLowerCase()) >= 0)) ? tag_marker_Y : tag_marker_N;
                    // console.log([genre_name, aggregator, aggregator.tag_filter_tripped, tag_array.indexOf(genre_name.toLowerCase()), tag_marker]);

                    urls.push([descriptor+tag_marker, base_url_genre+genre_slug, genre_name]);
                }
            });

            for (var i = 0; i < aggregator.data.series.tags.length; i++) {
                descriptor = "Tag:";
                if (last_descriptor == descriptor) descriptor = "";
                else last_descriptor = descriptor;

                let [tag_name, tag_slug] = aggregator.data.series.tags[i];
                tag_marker = (aggregator.tag_filter_tripped && (tag_array.indexOf(tag_name.toLowerCase()) >= 0)) ? tag_marker_Y : tag_marker_N;
                // console.log([tag_name, aggregator, aggregator.tag_filter_tripped, tag_array.indexOf(tag_name.toLowerCase()), tag_marker]);

                urls.push([descriptor+tag_marker, base_url_tag+tag_slug, tag_name]);
            }

            callback(null, urls);
        }._w(121);




        xlinks_api.init({
            namespace: "mangadex",
            name: "Mangadex & Dynasty links",
            author: "mycropen",
            description: "Linkify and format chapter links for Mangadex, Dynasty-Scans, comick.io and bato.to",
            version: [1,6,2,-0xDB],
            registrations: 1,
            main: main_fn
        }, function (err) {
            if (err === null) {
                xlinks_api.insert_styles(".xl-site-tag-icon[data-xl-site-tag-icon=lang_jp]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAUVBMVEX////89ffstsPjlaj77/LacYq+CTS8AC2/CjXacov78PP22+HGJUvGJkz23OLac4z99vjst8Tjlqnkl6nkmKrsuMW/CzbbdY3GJ0323ePadI1SYYEeAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAEkH80BkfYAAAB6SURBVCjPzZHJDoAgDEQRVBCVVXD5/w+VGIMQSrj6rvOaTlqE/kaHCcFdNe6HkQbYxOF8XujLKsD5mAejB4SBJkigH0sFpgpB0wxdCCYXbCHYXNhaK1yjpC9LIpkKO3AHvn75AR5bROM4K8+STw9/VZ4VUM4Yp9DfuAEcEgb8vRe9xgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMS0xMlQwMTozMToyMiswMDowMJwMZyQAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDEtMTBUMDM6NTA6NTkrMDA6MDAFGLMuAAAAAElFTkSuQmCC)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_cn]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAclBMVEXuHCXxQB/xRx7vKSP4oBD4pA/uHyX0cRf0cBfwOCDuIiTuICTuHSXvJCTvKyP6vQvxSh381wfvKCPvLyL6tgz//wDwMiH1fhX4mxD6uwv6wgryUB3vIyT1dxbyURz+7wPvJyP2iRP4oQ/zXRrzWRv///96F0p+AAAAAWJLR0QlwwHJDwAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAEkN/i0OQwAAABvSURBVCjPY2AgATAy4ZRiZgaRLKxsuBSwc4ApTi5uHiyyvHx8/Px8fLxApoCgEBYFwiKiQMAvBmRyiQtjtUFCVFQCr/MlpaQkISxprPIysjw8sjIglpy8GF6TFPiEufHJKyqx4dXPoKzCMAoGMwAAo/cEXRjamKYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDEtMTJUMDE6MzE6MjIrMDA6MDCcDGckAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAxLTEwVDAzOjUwOjU5KzAwOjAwBRizLgAAAABJRU5ErkJggg==)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_kr]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABoVBMVEX///+7u7vCwsLBwcG9vb3u7u4cHBySkpJ5eXl2dnYdHR3w8PBeXl5paWkwMDCHh4c3Nzf4+Pj29vaFhYU0NDRmZmaOjo6zs7MiIiJzc3NLS0tRUVF+fn56enpNTU1JSUmMjIxnZ2e2trbv7+8eHh4VFRWGhoYuLi75+fn9+PnpparYXGXPN0LPOEPYXWbqqa7++/tqamqxsbEXFxcbGxvNzc1/f3/Ozs733+HSQ07NLjrXWWL66+zY2NgYGBh8fHzPz8/09PSQkJBOTk739ffMOkdSUlKPj4/19fWkhKLrq6++vr56T3y0MUaWNVa3MUXZX2g0Rox7OGMCRp8AR6ADR55vOmjQPEcJTaNoOmzLLzvLLjtiO2+pP1kzbLMZRJQ3QIQXRJV9VYCOrdWjjaqUlJRPT099fX32+fwtZ7EyaK/69/lTU1PQ0NCAgIAxMTHh6fQya7Pm7fbX19czMzPT09MkJCSgoKD3+fyQr9Y1bbQKTqQ3b7SUstf5+/0nJyeRkZG0tLQhISGsrKxXV1d4eHhlZWX+/v5xcXG5ubm8vLzgoCRaAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAElAS4VndQAAAFISURBVCjPY2CgEmBkQhdhZkHmsbKxc6DKc7JzcSNxeXj5+AUEEXwhAWERUTEEX1xCUkpaBtkAWTl5BUUlGE9ZhV1VTV2DgUFTS1tHV0/fgIFBw9DImN2EFarA1IyP39icgcHC0goMrG0YGGzthEXsHWBGODo5Ay1wcbWCAmugGbJu7h5IdrIALfC0ggMvBgZBb4yw8IFI+vr5WwVgDaxAsHxQcEhoWDhWBRGRUVbRMSEgEItVQVxIfEIiWD4kCUOSCejI5BA4SAE6Ejl2PFLT0hkYMjJh8lnZDAwcOexCMPncvHx+Y1MGhgKoisIiBoZiO+ESs1KoAm4V9rJyUFBXVFZVV9fU1gEtMDSvb2CDBTVDY1Nzi3Q6spta03JYRJUQfB7efP4SISRHlQiLtKWiJhjJdmQT2jsaVJATDEMnSgIDga4uBioBAMJERI7yM7r7AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_hk]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABFFBMVEW6AAC6AQHFKSntvLzrtLS+DQ345OT+/f355+e7AgLWZmb+/Pzwycn////DIiLGKyvBGxu/ERHfiYnyzs7HMjLfiorilZXUYGC8BwfadXXxzc3VZ2f45eXln5/TXFz77+/vw8O7AwPTXl7xy8vYbm7ruLjGLCzmpqbtvr767u756urMQ0O8CAjz09P99vb34uLwx8fDICDHNDTLQEDMRETadnb12dnmoaG/ExPAFhboqan99fX02trgjIzEJibz0NDz1NTJNzfcf3/ZcXHuvr7MQUHuv7/EJSX9+Pj67e3SWFj//v6/EhLehob++/vwy8v88/Ppra3HMTHCHx/uwMDilJTWZ2f99/f12tq8BgbSWVnFKirY+jP4AAAAAWJLR0QN9rRh9QAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3Izr/obEAAACmSURBVCjPY2AYhIARvzQTMwteeVY2dg5OfAq4uHl4+XBJ8gsIMgqx8QqLiIqJS2BTIMnLKyUtIyvHwSbPrqCIRYESrzKviqqaugavjKaWNhYFOrp6+gaGRsYmpmbmFlgdYWllbWNrYmfvYIjTE45Ozi6uMmxuuOTdPXg1Pb14Nb19cCjw9fMPCAziFeYNxi5vEcKrF8rKEBYegTMwLSJBZFQ0w7ADACDyErqWmAEaAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_id]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYAQMAAAChnW13AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABlBMVEXnABH///9GPYQdAAAAAWJLR0QB/wIt3gAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3KkMjGRUAAAAQSURBVAjXY2CgAPwHAjIJAJsjL9Ejwc0pAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_th]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYBAMAAABpfeIHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAFVBMVEWlGTHq2d/09fhGQ18tKkrb2+L///+mSNUGAAAAAWJLR0QGYWa4fQAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3LkRO3QwAAAAkSURBVBjTY2CgAhBEAwxKaIAIAWM0wOCCBugkEIoGyPELFQAAxhk0Eaz+gbcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDEtMTJUMDE6MzE6MjIrMDA6MDCcDGckAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAxLTEwVDAzOjUwOjU5KzAwOjAwBRizLgAAAABJRU5ErkJggg==)}.xl-site-tag-icon[data-xl-site-tag-icon=site_DS]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAYBQTFRF+YqH/+XMlC4zbAMG/sSr2oN9/Hh58E1V1E1So4CX2dvn6ez3Zlqg/8uz/OrX+WVn49Xc2ur9/tvFuJag6+Tp/tO86Pf/ulZW5pWK2cPJnj1C9pyU/bql9t3Z2H13p0VIu2Zm06Sjy2lmpVZb9ePh9t3L/bSjwoeH/FtguXl82ouD/v/+qFxi5sjG3Z6YmU9W5qaZ+m1w/r+p+JKN2WVn+6mc1ztEzZaXwXFusjY9tEVL5by46mVo8f7/9LOg5Kqj6J2R7Hl327O128rP//Pa+qSYx3l049zk/cSyqmFl1ef9+r6x/K2fzDA62tPc3ef21ZeM9byq1a6w3uLt6bmo9q2cyq22yqOox46QpU5R88y+//v26omF9dbFilZz/LWo/NbO/fDs9MOw/M/B/8+3hh8l/9bC/8S9fhMZ/t/I8q+h+aCW2OX538/V/8ev8KeX1d7wsk9P/vTw8NbR0bzC9LWpvF9e+bylyZ6gznFs+YB/opfB1FxepWBvr2xu8vT5Ltt4cwAAA3xJREFUeNo0kflb2loQhseTEKgQwr6EyCprXJpQEFAUUUERceG2Ba1aldAAEo22aUnR+6/fg+39fjjPec68M9/MHDD/levtsP2528Y2l8tVt9XHNuDL5kajYf/ess+3XIXXsmf+2PMphqI/SaUSSnYR/OuxNxr3xx1/uz6/jJJlj3Pe419FNZpWfhZOCl0wm+32xuM4vNOut5Nsp+xZ8pd3ulKhp5CkIZOsAY7b79uRcN02vxPKJMsu6XO5tYS0niKSPi1YgWMMtOvdZN3WTmub6fKYSPP1GKvSJCmKXq0C9zPgF6rijtmHzBL/SYrxY7YUohWSEytRAzQw0FJVv82VVt3hAz69ilzPSGWHMw/OUIDHR7s9Ha0t2/yo0oum+dgrWrthQ7KsPtCi6KuA0+lMo6m2bitoihLt8Og1xt6GSpJEyD6FHA5xhVZoEtU6EfZBJCdni3I4KQe9vsz6GiF9VEQMmJ0sOVn5uhRVOCV6VkWdDiqZ+s/rfIRQFfIUHv3IR2o/VkocSSqTavrl3Yu3+GHhaeGJPyAe6FOox1TlISp6fXhwOvj5wGK52i5uW58jNxcLskbfQlL6SPoMmQmemuz50jGLJUaZtq0HxPLTRVLaPAWppoiG4IQTOY7r/YOuLJYSxQhfu8Svp5tFZAhCiOPEYHTYo2mSc59LFovFRAnMtw6RvFh4Dgcz4Es0E4bNwWGmVqEdA/XlStoQmFR2WTpb7JytaQYIBHLNL5mYRBDIPRi8R0SRYpgUAysL4SrPb5UgABCSCSx0Mhg47koyzICUkdpWlxerwS8QD5QIQkbhyv7cHAYO1aIgCKl8/ujINC1N4QecQ57w+hS3uz/AuvvWlE0UY5oBxnxehw9AUdNpMyEqPQd2cLgPr4sb+gZjzB8ZjUeMTm2DIFA67F0rbsesgpuuFHEOZcwbU0YjowOAQG2Y9L0EOQPmBv1+ODTSKQq3iSXo2SwIU5Oe/R/ABArlsjpeVYphBAovATamFGCAxsAc1q3sFfeyQOFRcHzUHIKgQzbQFGnHG7C7QrB0IjfKYvNZnngLOD5qcsrfArsxgnjfE6+vc6NR7lqk3ZcAgVyC2+/1B28F1uVX1B3c0fv74r4ys43DKHF415vlW63W3S1Z+v2OOLE63Hhxb6Zx2Do9v4zPtGi1rsks/u5VOWK9/PMWj5//J8AARTPMVw1SAkMAAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=site_MD]{background-image:url(data:image/png;base64,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)}.xl-site-tag-icon[data-xl-site-tag-icon=site_CK]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGMWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDIgNzkuYTFjZDEyZiwgMjAyNC8xMS8xMS0xOTowODo0NiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjQgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wNS0yNVQxNDoxMzoyMiswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDUtMjVUMTQ6MTQ6MjMrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMDUtMjVUMTQ6MTQ6MjMrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjllZWZlOTMwLWM0YjctMjM0OC1iOGFkLTVhOTY1Yzk0ZDBhNSIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjM1YjkwOWVmLWVhNjYtNjU0Ni04ZGZjLWM0YjViMDJiNTc1NCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOmU4ZmY4M2NmLWY3YjAtNmU0MS04YTZlLTAwOWMxZGZhMmUzMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ZThmZjgzY2YtZjdiMC02ZTQxLThhNmUtMDA5YzFkZmEyZTMwIiBzdEV2dDp3aGVuPSIyMDI1LTA1LTI1VDE0OjEzOjIyKzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjYuNCAoV2luZG93cykiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6OWVlZmU5MzAtYzRiNy0yMzQ4LWI4YWQtNWE5NjVjOTRkMGE1IiBzdEV2dDp3aGVuPSIyMDI1LTA1LTI1VDE0OjE0OjIzKzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjYuNCAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+jGxdIwAAHHlJREFUeNrdm3mYVNWd9z/nnLvU1tUr3dBAswjKjiCbyqoI4oZLNBEVY9xijDFqTIwLE2N0EuOaMWOiEzVOZhJjiEaDikpcEdwFF0BWAWloeqvu2u52zvtHdasoaDDD5H3fU899btVTt26d8/0t5/tbrjDG8OkhhGCfDwEomHrkZOyYjV/Mk7DiPL3o2QZp+JWJ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)}.xl-site-tag-icon[data-xl-site-tag-icon=site_BT]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAuCAYAAABXuSs3AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE7mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDIgNzkuYTFjZDEyZiwgMjAyNC8xMS8xMS0xOTowODo0NiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjQgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wNS0yNVQxNDoyMzowNiswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDUtMjVUMTQ6MjM6NDkrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMDUtMjVUMTQ6MjM6NDkrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjcwYWRjMWI3LTc2NTQtN2M0OS05ZTZmLWFmNjk2OTM2Y2RiYyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3MGFkYzFiNy03NjU0LTdjNDktOWU2Zi1hZjY5NjkzNmNkYmMiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3MGFkYzFiNy03NjU0LTdjNDktOWU2Zi1hZjY5NjkzNmNkYmMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjcwYWRjMWI3LTc2NTQtN2M0OS05ZTZmLWFmNjk2OTM2Y2RiYyIgc3RFdnQ6d2hlbj0iMjAyNS0wNS0yNVQxNDoyMzowNiswMjowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI2LjQgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmIIA3sAAAGpSURBVGje7ZlBagIxFIbnCl6hV+gVvIJX6BU8QaGbLLoQ2oUgCC1UcCMIRVoQRBBEF0ILhSoIUrpo7aa0u9R/MDIMMzomM0l+6OK5NF/e5P3vf0kgpQwYI/zpzZeL4PxS2I6SuKpdDMcjxOfP77cuuHQc4rR+27x7enlmA99toHzTbr2uvz7YwMM4qTXq47f3FR24gk87+16DIyrtbocSHGcefIzgsvo46FOCQybzBj+m4RgVae7gWZoF/h/dUXcDzsCjG9CBL+SoHG2ONMDPug/3jBkvRA4zn3FImk624VuKaECFqgpsb5rZ8lbHAc1msgT8CZWt3dSB3Jdlb8E3hSjRqGgnIESSsWIxWeEwnaTh/37chjTGVcZmAxKGhdty4lWuJ7OpbttXa0Wl0ro7xOL49KYjnHVwlX3TEc4JOApNt0idguO4mK7nBHw7f3KB686dzsCRZcyOJnqea3HaakDxe0SKlq+SFL30pwGPXwqxgAs0LTrwpDty78GhJEmvEl5PQGnQPoOLQ0OzL+ChzkM5sj7WOnlZxjSjXpQRaQPxQXDat3zG+AMriEnVrkkkswAAAABJRU5ErkJggg==)}");

                xlinks_api.register({
                    settings: {
                        sites: [ // namespace
                            //name,       default, title,               description,                             descriptor?
                            ["mangadex",  true,    "mangadex.org",      "Enable link processing for mangadex.org"],
                            ["dynasty",   true,    "dynasty-scans.com", "Enable link processing for dynasty-scans.com"],
                            ["comick.io", true,    "comick.io",         "Enable link processing for comick.io"],
                            ["bato.to",   true,    "bato.to",           "Enable link processing for bato.to"],
                            // descriptor: { type: string, options: <array of [string:value, string:label, string:description, {type: ...}]> }
                            //  the {type: ...} is optional and can take the following values: "checkbox", "select", "textbox", "textarea", "button"
                            //      {type: "checkbox"}
                            //      {type: "select", options: [[value, label_text, description?], [value, label_text, description?], ...]}
                            //      {type: "textbox"} or {type: "textbox", get: (v) => {...}, set: (v) => {...}}
                            //      {type: "textarea"}
                            //      {type: "button", text: "Clear", on_change: on_cache_clear_click}
                            // for pre-existing vars: [ "name" ]
                        ],
                        mangadex: [
                            ["show_icon", true, "Show an icon instead of an [MD] tag", ""],
                            ["show_orig_lang", true, "Show original language", "Include the original language of a series as a tag [ja], [ko], [zh], etc."],
                            ["use_flags", true, "Use country flags", "Show country flags instead of language tags in place of the [MD] tag or icon."],
                            ["show_author", true, "Show author name", ""],
                            ["show_artist", true, "Show artist name", "People that are both author and artist will only appear once."],
                            ["show_volume", true, "Show volume number", ""],
                            ["show_ch_title", true, "Show chapter title", ""],
                            ["show_pages", true, "Show page count", ""],
                            ["show_group", false, "Show group name", ""],
                            ["custom_title", false, "Non-default series title language", "With the default title as fallback"],
                            ["title_search_order", "en, orig-ro, orig", "Series title search order",
                                "orig = original language; -ro = romanized; e.g. ja, ja-ro, en, zh, zh-hk, ko, id, th, es, vi, de, ru, uk, fr, fa, pt, pt-br, tr, ...",
                                {type: "textbox"}
                            ],
                            // ["show_ch_lang", false, "Show chapter language", "Include the language a chapter was translated into"],
                            ["tag_filter", "", "Tag filter", "(https://mangadex.org/tag) List of English tag names separated by a comma; e.g. \"4-koma, genderswap, gore\"",
                                {type: "textbox"}
                            ],
                            ["tag_filter_style", "invert", "How to modify the icon on a tag filter match", "Only works if you show an icon or flag instead of an [MD] tag",
                                {
                                    type: "select",
                                    options: [
                                        // [ value, label_text, description? ]
                                        ["none",            "No change",        ""],
                                        ["rotate180",       "Rotate 180°",      "transform: rotate(180deg)"],
                                        ["long_strip",      "Long strip",       "transform: scaleX(0.5)"],
                                        ["invert",          "Invert colors",    "filter: invert(1)"],
                                        ["grayscale",       "Grayscale",        "filter: grayscale(1)"],
                                        ["opacity50",       "Opacity 50%",      "filter: opacity(0.5)"],
                                        ["drop_shadow",     "Drop shadow",      "filter: drop-shadow(0.0rem 0.0rem 0.15rem #FF0000)"],
                                        ["sepia",           "Sepia",            "filter: sepia(1)"],
                                        ["blur1.5",         "Blur",             "filter: blur(1.5px)"],
                                        ["hue_rotate90",    "Hue rotate 90°",   "filter: hue-rotate(90deg)"],
                                        ["hue_rotate180",   "Hue rotate 180°",  "filter: hue-rotate(180deg)"],
                                        ["hue_rotate270",   "Hue rotate 270°",  "filter: hue-rotate(270deg)"],
                                        ["custom",          "Custom CSS",       "<Your CSS here!>"],
                                    ]
                                }
                            ],
                            ["tag_filter_style_custom", "", "Custom CSS for matched tag filters", "If you picked \"Custom CSS\" above. I hope you know what you're doing.",
                                {type: "textbox"}
                            ],
                        ],
                        dynasty: [
                            ["show_icon", true, "Show an icon instead of a [DS] tag", ""],
                            ["show_author", true, "Show author name", ""],
                            ["show_pages", true, "Show page count", ""],
                            ["show_group", false, "Show group name", ""],
                            ["tag_filter", "", "Tag filter", "(https://dynasty-scans.com/tags) List of tags separated by a comma; e.g. \"long strip, het, elf\"",
                                {type: "textbox"}
                            ],
                            ["tag_filter_style", "invert", "How to modify the icon on a tag filter match", "Only works if you show an icon instead of a [DS] tag",
                                {
                                    type: "select",
                                    options: [
                                        // [ value, label_text, description? ]
                                        ["none",            "No change",        ""],
                                        ["rotate180",       "Rotate 180°",      "transform: rotate(180deg)"],
                                        ["long_strip",      "Long strip",       "transform: scaleX(0.5)"],
                                        ["invert",          "Invert colors",    "filter: invert(1)"],
                                        ["grayscale",       "Grayscale",        "filter: grayscale(1)"],
                                        ["opacity50",       "Opacity 50%",      "filter: opacity(0.5)"],
                                        ["drop_shadow",     "Drop shadow",      "filter: drop-shadow(0.0rem 0.0rem 0.15rem #FF0000)"],
                                        ["sepia",           "Sepia",            "filter: sepia(1)"],
                                        ["blur1.5",         "Blur",             "filter: blur(1.5px)"],
                                        ["hue_rotate90",    "Hue rotate 90°",   "filter: hue-rotate(90deg)"],
                                        ["hue_rotate180",   "Hue rotate 180°",  "filter: hue-rotate(180deg)"],
                                        ["hue_rotate270",   "Hue rotate 270°",  "filter: hue-rotate(270deg)"],
                                        ["custom",          "Custom CSS",       "<Your CSS here!>"],
                                    ]
                                }
                            ],
                            ["tag_filter_style_custom", "", "Custom CSS for matched tag filters", "If you picked \"Custom CSS\" above. I hope you know what you're doing.",
                                {type: "textbox"}
                            ],
                        ],
                        bato: [
                            ["show_icon", true, "Show an icon instead of a [BT] tag", ""],
                            ["show_orig_lang", true, "Show original language", "Include the original language of a series as a tag [ja], [ko], [zh], etc."],
                            ["use_flags", true, "Use country flags", "Show country flags instead of language tags in place of the [BT] tag or icon."],
                            ["show_author", true, "Show author name", ""],
                            ["show_ch_title", true, "Show chapter title", ""],
                            // ["show_pages", true, "Show page count", ""],
                            ["tag_filter", "", "Genre filter", "List of genres separated by a comma; e.g. \"Violence, Psychological\"",
                                {type: "textbox"}
                            ],
                            ["tag_filter_style", "invert", "How to modify the icon on a genre filter match", "Only works if you show an icon instead of a [BT] tag",
                                {
                                    type: "select",
                                    options: [
                                        // [ value, label_text, description? ]
                                        ["none",            "No change",        ""],
                                        ["rotate180",       "Rotate 180°",      "transform: rotate(180deg)"],
                                        ["long_strip",      "Long strip",       "transform: scaleX(0.5)"],
                                        ["invert",          "Invert colors",    "filter: invert(1)"],
                                        ["grayscale",       "Grayscale",        "filter: grayscale(1)"],
                                        ["opacity50",       "Opacity 50%",      "filter: opacity(0.5)"],
                                        ["drop_shadow",     "Drop shadow",      "filter: drop-shadow(0.0rem 0.0rem 0.15rem #FF0000)"],
                                        ["sepia",           "Sepia",            "filter: sepia(1)"],
                                        ["blur1.5",         "Blur",             "filter: blur(1.5px)"],
                                        ["hue_rotate90",    "Hue rotate 90°",   "filter: hue-rotate(90deg)"],
                                        ["hue_rotate180",   "Hue rotate 180°",  "filter: hue-rotate(180deg)"],
                                        ["hue_rotate270",   "Hue rotate 270°",  "filter: hue-rotate(270deg)"],
                                        ["custom",          "Custom CSS",       "<Your CSS here!>"],
                                    ]
                                }
                            ],
                            ["tag_filter_style_custom", "", "Custom CSS for matched genre filters", "If you picked \"Custom CSS\" above. I hope you know what you're doing.",
                                {type: "textbox"}
                            ],
                        ],
                        comick: [
                            ["show_icon", true, "Show an icon instead of a [CK] tag", ""],
                            ["show_orig_lang", true, "Show original language", "Include the original language of a series as a tag [ja], [ko], [zh], etc."],
                            ["use_flags", true, "Use country flags", "Show country flags instead of language tags in place of the [CK] tag or icon."],
                            ["show_author", true, "Show author name", ""],
                            ["show_artist", true, "Show artist name", "People that are both author and artist will only appear once."],
                            ["show_volume", true, "Show volume number", ""],
                            ["show_ch_title", true, "Show chapter title", ""],
                            ["show_pages", true, "Show page count", ""],
                            ["show_group", false, "Show group name", ""],
                            ["custom_title", false, "Non-default series title language", "With the default title as fallback"],
                            ["title_search_order", "en, orig", "Series title search order",
                                "orig = original language; e.g. ja, en, zh, zh-hk, ko, id, th, es, vi, de, ru, uk, fr, fa, pt, pt-br, tr, ...",
                                {type: "textbox"}
                            ],
                            ["tag_filter", "", "Genre & tag filter", "List of genres or tags separated by a comma; e.g. \"ninja, dumb female lead\"",
                                {type: "textbox"}
                            ],
                            ["tag_filter_style", "invert", "How to modify the icon on a genre filter match", "Only works if you show an icon instead of a [CK] tag",
                                {
                                    type: "select",
                                    options: [
                                        // [ value, label_text, description? ]
                                        ["none",            "No change",        ""],
                                        ["rotate180",       "Rotate 180°",      "transform: rotate(180deg)"],
                                        ["long_strip",      "Long strip",       "transform: scaleX(0.5)"],
                                        ["invert",          "Invert colors",    "filter: invert(1)"],
                                        ["grayscale",       "Grayscale",        "filter: grayscale(1)"],
                                        ["opacity50",       "Opacity 50%",      "filter: opacity(0.5)"],
                                        ["drop_shadow",     "Drop shadow",      "filter: drop-shadow(0.0rem 0.0rem 0.15rem #FF0000)"],
                                        ["sepia",           "Sepia",            "filter: sepia(1)"],
                                        ["blur1.5",         "Blur",             "filter: blur(1.5px)"],
                                        ["hue_rotate90",    "Hue rotate 90°",   "filter: hue-rotate(90deg)"],
                                        ["hue_rotate180",   "Hue rotate 180°",  "filter: hue-rotate(180deg)"],
                                        ["hue_rotate270",   "Hue rotate 270°",  "filter: hue-rotate(270deg)"],
                                        ["custom",          "Custom CSS",       "<Your CSS here!>"],
                                    ]
                                }
                            ],
                            ["tag_filter_style_custom", "", "Custom CSS for matched genre filters", "If you picked \"Custom CSS\" above. I hope you know what you're doing.",
                                {type: "textbox"}
                            ],
                        ],
                    },
                    request_apis: [
                        {
                            group: "mangadex",
                            namespace: "mangadex",
                            type: "generic",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 220,
                            delay_error: 5000,
                            functions: {
                                // get_data: md_get_data,
                                // set_data: md_set_data,
                                setup_xhr: md_generic_api_xhr,
                                parse_response: md_generic_parse_response
                            },
                        },
                        {
                            group: "dynasty",
                            namespace: "dynasty",
                            type: "chapter",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 100,
                            delay_error: 5000,
                            functions: {
                                setup_xhr: ds_chapter_setup_xhr,
                                parse_response: ds_chapter_parse_response
                            },
                        },
                        {
                            group: "bato",
                            namespace: "bato",
                            type: "chapter",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 100,
                            delay_error: 5000,
                            functions: {
                                setup_xhr: bt_chapter_setup_xhr,
                                parse_response: bt_generic_parse_response
                            },
                        },
                        {
                            group: "bato",
                            namespace: "bato",
                            type: "series",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 100,
                            delay_error: 5000,
                            functions: {
                                setup_xhr: bt_series_setup_xhr,
                                parse_response: bt_generic_parse_response
                            },
                        },
                        {
                            group: "comick",
                            namespace: "comick",
                            type: "chapter",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 200,
                            delay_error: 5000,
                            functions: {
                                setup_xhr: ck_chapter_setup_xhr,
                                parse_response: ck_chapter_parse_response
                            },
                        },
                        {
                            group: "comick",
                            namespace: "comick",
                            type: "series",
                            count: 1,
                            concurrent: 1,
                            delay_okay: 200,
                            delay_error: 5000,
                            functions: {
                                setup_xhr: ck_series_setup_xhr,
                                parse_response: ck_series_parse_response
                            },
                        },
                    ],
                    linkifiers: [
                        // Note for the future: Make sure these regex patterns capture the whole url. Without 4chan-x or
                        // similar installed, only the part of the url that's captured by these patterns will be
                        // replaced.
                        {
                            // mangadex.org can only be preceeded by "https://" or "www." or both or neither
                            // the link ends either with the ID, a "/", a "#" or "/5" (for page 5)
                            regex: /(https?:\/\/)?(www\.)?(?<=(www\.|\/\/|\s+|^))mangadex\.org\/chapter\/([a-z0-9\-]+)(\/|\/\d+|\/\d+)?#?/i,
                            prefix_group: 1,
                            prefix: "https://",
                        },
                        {
                            regex: /(https?:\/*)?(?:www\.)?dynasty-scans\.com\/chapters\/\S+/i,
                            prefix_group: 1,
                            prefix: "https://",
                        },
                        {
                            // bato.to v2: https://bato.to/chapter/3362345
                            // bato.to v3: https://bato.to/title/137465-destroy-it-all-and-love-me-in-hell/3362345-vol_5-ch_21.5
                            // bato.to also has a ton of mirrors, so defining the regex statically would be a pain
                            regex: new RegExp(String.raw`(https?:\/*)?(?:www\.)?(${bt_mirrors_re})\/(chapter|title\/[^\/]+)\/\S+`, "i"),
                            prefix_group: 1,
                            prefix: "https://",
                        },
                        {
                            // https://comick.io/comic/a-ninja-and-an-assassin-living-together/2JbmNIIV-chapter-36-en
                            regex: /(https?:\/*)?(?:www\.)?comick\.io\/comic\/([^\/]+)\/\S+/i,
                            prefix_group: 1,
                            prefix: "https://",
                        },
                    ],
                    commands: [
                        {
                            url_info: md_ch_url_get_info,
                            to_data: md_ch_url_info_to_data,
                            actions: md_create_actions,
                            // details: create_details
                        },
                        {
                            url_info: ds_ch_url_get_info,
                            to_data: ds_ch_url_info_to_data,
                            actions: ds_create_actions,
                            // details: create_details
                        },
                        {
                            url_info: bt_ch_url_get_info,
                            to_data: bt_ch_url_info_to_data,
                            actions: bt_create_actions,
                            // details: create_details
                        },
                        {
                            url_info: ck_ch_url_get_info,
                            to_data: ck_ch_url_info_to_data,
                            actions: ck_create_actions,
                            // details: create_details
                        },
                    ]
                });
            }
        }._w(122));
    }._w(67);
    main(xlinks_api);
})();