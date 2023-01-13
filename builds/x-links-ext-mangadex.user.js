// ==UserScript==
// @name        X-links Extension - Mangadex
// @namespace   mycropen
// @author      mycropen
// @version     1.1
// @description Linkify and format Mangadex links
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
// @updateURL   https://raw.githubusercontent.com/mycropen/x-links/stable/builds/x-links-ext-mangadex.meta.js
// @downloadURL https://raw.githubusercontent.com/mycropen/x-links/stable/builds/x-links-ext-mangadex.user.js
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA4klEQVR4Ae2ZoQ7CMBRF+VIMBjGDwSAwmImZGcQUYoYPq32fAPK8LCSleZCmzb3JcUtzD+ndBDslHuVVQr0zJdCAQHoaQEggTQYj9C8ggRVCAqPBDfoUkMBq8HAs4J8vLZ2uEH/VSqC6QEZmMbg7ZgiWzu2wJQEJZGRmgwn+cNf9jxXcRn0BCZA/33VKb848OfbQioAEikqni+MMpRugdGADFQQkEL7rlN7c3QG+2EZgrPUEJPD7V+RgcHQcoGAXDQlIoLx0/kxKhwbahoAEPn5ZYwKU7ldAAvqLSQLNRlEU5Q1O5fOjZV4u4AAAAABJRU5ErkJggg==
// @icon64      data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAOVBMVEUBAAAAAADmce/ml+/mje/mku/mhO/mY+/mbO/mdu/me+/mie/mXu/mm+/mpe/mf+/mqu/maO/moe9+hYmYAAAAAXRSTlMAQObYZgAAAJRJREFUeF7t1zkOAzEMBEFRe9+2//9YtzOCIOR8oEoX7GCgZEtXigWtb8qBF36ywIgD8gHcyAIHZqgHbnxwwRCPH1igEvCRCwMmZMd+cKVAjEwY0RpvgDkKAe/feANmVJxQC8TjHRssqDBHI5CPt6FihR8zjicQaD6eFW8sMEcxEI99fEG2vFrgwY4scEI/0P8X0HVf06IrwbJZHiwAAAAASUVORK5CYII=
// @grant       none
// @run-at      document-start
// ==/UserScript==
(function () {
    "use strict";

    /*#{begin_debug:timing=true}#*/

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
			};

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
			};

		})();

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
		};
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
		};

		var random_string_alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		var random_string = function (count) {
			var alpha_len = random_string_alphabet.length,
				s = "",
				i;
			for (i = 0; i < count; ++i) {
				s += random_string_alphabet[Math.floor(Math.random() * alpha_len)];
			}
			return s;
		};

		var is_object = function (obj) {
			return (obj !== null && typeof(obj) === "object");
		};

		var get_regex_flags = function (regex) {
			var s = "";
			if (regex.global) s += "g";
			if (regex.ignoreCase) s += "i";
			if (regex.multiline) s += "m";
			return s;
		};

		var create_temp_storage = function () {
			var data = {};

			var fn = {
				length: 0,
				key: function (index) {
					return Object.keys(data)[index];
				},
				getItem: function (key) {
					if (Object.prototype.hasOwnProperty.call(data, key)) {
						return data[key];
					}
					return null;
				},
				setItem: function (key, value) {
					if (!Object.prototype.hasOwnProperty.call(data, key)) {
						++fn.length;
					}
					data[key] = value;
				},
				removeItem: function (key) {
					if (Object.prototype.hasOwnProperty.call(data, key)) {
						delete data[key];
						--fn.length;
					}
				},
				clear: function () {
					data = {};
					fn.length = 0;
				}
			};

			return fn;
		};

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
		};

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
		};

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
				};
				window.addEventListener("message", this.on_message, false);
			}
			else {
				this.port = channel.port1;
				this.port_other = channel.port2;
				this.post = this.post_channel;
				this.on_message = function (event) {
					self.on_port_message(event);
				};
				this.port.addEventListener("message", this.on_message, false);
				this.port.start();
			}
		};

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
		};
		CommunicationChannel.prototype.post_channel = function (message, transfer) {
			this.port.postMessage(message, transfer);
		};
		CommunicationChannel.prototype.post_null = function () {
		};
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
		};
		CommunicationChannel.prototype.on_port_message = function (event) {
			var data = event.data;
			if (is_object(data)) {
				this.callback(event, data, this);
			}
		};
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
		};


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
				}
			);
		};
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
		};
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
				};

				this.reply_callbacks[id] = cb;
				cb = null;

				if (timeout_delay >= 0) {
					timeout = setTimeout(function () {
						timeout = null;
						delete self.reply_callbacks[id];
						on_reply.call(self, "Response timeout");
					}, timeout_delay);
				}
			}

			channel.post({
				xlinks_action: action,
				data: data,
				id: id,
				reply: reply_to
			});
		};
		API.prototype.reply_error = function (channel, reply_to, err) {
			channel.post({
				xlinks_action: null,
				data: { err: err },
				id: null,
				reply: reply_to
			});
		};
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
		};
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
					}
				);
			});
		};
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
							}
						);
					}
				}
			}

			this.init_state = (err === null) ? 2 : 0;
			return err;
		};
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
				}
			);
		};
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
		};

		API.handlers_init = {};
		API.handlers = {
			request_end: function (data) {
				var id = data.id;
				if (typeof(id) === "string") {
					// Remove request
					delete requests_active[id];
				}
			},
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
				});

				// Call
				ret = fn.apply(req, args);
			},
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
				});
			},
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
				});
			},
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
				});
			},
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
				});
			},
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
		};

		var load_request_state = function (request, state) {
			for (var k in state) {
				request[k] = state[k];
			}
		};


		// Public
		var init = function (info, callback) {
			if (api === null) api = new API();
			api.init(info, callback);
		};

		var register = function (data, callback) {
			if (api === null) {
				callback.call(null, "API not init'd", 0);
				return;
			}

			api.register(data, callback);
		};

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
				}
			);
		};

		var insert_styles = function (styles) {
			var head = document.head,
				n;
			if (head) {
				n = document.createElement("style");
				n.textContent = styles;
				head.appendChild(n);
			}
		};

		var parse_json = function (text, def) {
			try {
				return JSON.parse(text);
			}
			catch (e) {}
			return def;
		};
		var parse_html = function (text, def) {
			try {
				return new DOMParser().parseFromString(text, "text/html");
			}
			catch (e) {}
			return def;
		};
		var parse_xml = function (text, def) {
			try {
				return new DOMParser().parseFromString(text, "text/xml");
			}
			catch (e) {}
			return def;
		};

		var get_domain = function (url) {
			var m = /^(?:[\w\-]+):\/*((?:[\w\-]+\.)*)([\w\-]+\.[\w\-]+)/i.exec(url);
			return (m === null) ? [ "", "" ] : [ m[1].toLowerCase(), m[2].toLowerCase() ];
		};

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
				}
			);
		};


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

	})();

    var main = function main_fn(xlinks_api) {
        var $$ = function (selector, root) {
            return (root || document).querySelectorAll(selector);
        };
        var $ = (function () {

            var d = document;

            var Module = function (selector, root) {
                return (root || d).querySelector(selector);
            };

            Module.add = function (parent, child) {
                return parent.appendChild(child);
            };
            Module.tnode = function (text) {
                return d.createTextNode(text);
            };
            Module.node = function (tag, class_name, text) {
                var elem = d.createElement(tag);
                elem.className = class_name;
                if (text !== undefined) {
                    elem.textContent = text;
                }
                return elem;
            };
            Module.node_ns = function (namespace, tag, class_name) {
                var elem = d.createElementNS(namespace, tag);
                elem.setAttribute("class", class_name);
                return elem;
            };
            Module.node_simple = function (tag) {
                return d.createElement(tag);
            };

            return Module;

        })();

        // utility
        var interpolate = function (str, params) {
            // evaluate template strings
            const names = Object.keys(params);
            const vals = Object.values(params);
            return new Function(...names, `return \`${str}\`;`)(...vals);
        }

        var lang_to_flag = {
            "ja": "lang_jp",
            "jp": "lang_jp",
            "ko": "lang_kr",
            "zh": "lang_cn",
            "zh-hk": "lang_hk",
            "id": "lang_id",
            "th": "lang_th",
        };

        var DataAggregator = function (final_callback) {
            this.callback = final_callback;
            this.context = null;
            this.group_num = 0;
            this.data = {
                groups: Array(),
            };
        }
        DataAggregator.prototype.add_data = function (category, data) {
            if (category == "group")
                this.data.groups.push(data);
            else
                this.data[category] = data;
            this.validate();
        };
        DataAggregator.prototype.validate = function () {
            // call this.callback if this.data has all necessary categories
            if (this.data.chapter == undefined) {
                return;
            }
            if (this.data.manga == undefined) {
                return;
            }
            if (xlinks_api.config.mangadex.show_group && this.data.groups.length < this.group_num) {
                return;
            }

            // make a usable object out of the categories
            var aggdata = {};
            var template = "";
            var data = this.data;

            data.final = {
                manga_lang: "",
                manga: null,
                volume: "",
                chapter: "",
                title: "",
                pages: "",
                group: "",
            };

            // aggdata.title
            // "${manga_lang} ${manga} ${volume} ${chapter} ${title} ${pages} ${group}"
            if (xlinks_api.config.mangadex.show_orig_lang && !xlinks_api.config.mangadex.use_flags && data.manga.originalLanguage)
                template += "${manga_lang} ";
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
            if (xlinks_api.config.mangadex.show_group && this.data.groups.length > 0)
                template += "${group}";

            if (data.manga.originalLanguage)
                data.final.manga_lang = "["+data.manga.originalLanguage+"]";

            if (data.manga.title.en !== undefined)
                data.final.manga = data.manga.title.en;
            else if (data.manga.title.ja !== undefined)
                data.final.manga = data.manga.title.ja;
            else if (data.manga.altTitles !== undefined) {
                if (data.manga.altTitles.ja !== undefined)
                    data.final.manga = data.manga.title.ja;
                else if (data.manga.altTitles["ja-ro"] !== undefined)
                    data.final.manga = data.manga.title["ja-ro"];
            }
            if (!data.final.manga) {
                // take the first title you find
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
            if (xlinks_api.config.mangadex.show_group && this.data.groups.length > 0) {
                combined_group_name = "";
                for (i = 0; i < this.data.groups.length; i++) {
                    combined_group_name += this.data.groups[i].name + ', '
                }
                combined_group_name = combined_group_name.replace(/, $/, "");
                data.final.group = "[" + combined_group_name + "]";
            }

            aggdata.title = interpolate(template, data.final);
            aggdata.title = aggdata.title.replace(/^\s+/, "");
            aggdata.title = aggdata.title.replace(/\s$/, "");
            aggdata.title = aggdata.title.replace(/\s+/g, " ");

            this.callback(null, aggdata);
        };

        var aggregators = {};
        
        var replace_icon = function (ch_id, flag) {
            // url_info.icon was set to a placeholder if use_flags is set
            // this replaces it with the real flag icon after the manga data was acquired
            nodes = $$("span.xl-site-tag-icon[data-xl-site-tag-icon=replaceme-"+ch_id+"]");
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("data-xl-site-tag-icon", flag);
            }
        }

        // functions that interact with the API
        var md_get_data = function (info, callback) {
            var data = xlinks_api.cache_get(info.id);
            callback(null, data);
        };
        var md_set_data = function (data, info, callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            if (info.lifetime !== undefined) lifetime = info.lifetime;
            xlinks_api.cache_set(info.id, data, lifetime);
            callback(null);
        };

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
        };
        var md_chapter_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            var aggregator, ch_context;
            if (xhr.context !== undefined) {
                aggregator = aggregators[xhr.context];
                ch_context = xhr.context;
            }
            else {
                aggregator = new DataAggregator(callback);
                var m = /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter\/([a-z0-9\-]+)/i.exec(url);
                if (m !== null)
                    ch_context = m[2];
                else
                    ch_context = null;
                aggregator.context = ch_context;
            }

            data = {
                id: null,
                chapter: null,
                volume: null,
                publishAt: null,
                pages: null,
                title: null,
            };

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            if (jsdata.data.id) data.id = jsdata.data.id;
            if (jsdata.data.attributes.chapter) data.chapter = jsdata.data.attributes.chapter;
            if (jsdata.data.attributes.volume) data.volume = jsdata.data.attributes.volume;
            if (jsdata.data.attributes.publishAt) data.publishAt = jsdata.data.attributes.publishAt;
            if (jsdata.data.attributes.pages) data.pages = jsdata.data.attributes.pages;
            if (jsdata.data.attributes.title) data.title = jsdata.data.attributes.title;

            // this should be done in the request callback
            // aggregator.add_data("chapter", data);

            if (jsdata.data.relationships !== undefined) {
                data.relationships = jsdata.data.relationships;
            }
            else {
            }

            callback(null, [data]);
        };

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
        };
        var md_manga_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            data = {
                title: null,
                altTitles: null,
                descrition: null,
                originalLanguage: null,
                state: null,
                status: null,
                tags: null,
            };

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            if (jsdata.data.attributes.title) data.title = jsdata.data.attributes.title;
            if (jsdata.data.attributes.altTitles) data.altTitles = jsdata.data.attributes.altTitles;
            if (jsdata.data.attributes.descrition) data.descrition = jsdata.data.attributes.descrition;
            if (jsdata.data.attributes.originalLanguage) data.originalLanguage = jsdata.data.attributes.originalLanguage;
            if (jsdata.data.attributes.state) data.state = jsdata.data.attributes.state;
            if (jsdata.data.attributes.status) data.status = jsdata.data.attributes.status;
            if (jsdata.data.attributes.tags) data.tags = jsdata.data.attributes.tags;

            if (data.originalLanguage == "ja") data.originalLanguage = "jp";

            if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && lang_to_flag[data.originalLanguage] !== undefined && xhr.context !== undefined)
                replace_icon(xhr.context, lang_to_flag[data.originalLanguage]);

            xlinks_api.cache_set("manga_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            if (xhr.context !== undefined) {
                aggregators[xhr.context].add_data("manga", data);
            }

            callback(null, [data]);
        };

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
        };
        var md_group_parse_response = function (xhr, callback) {
            if (xhr.status !== 200) {
                callback("Invalid response.");
                return;
            }

            data = {
                name: null,
            };

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
            if (jsdata == null || jsdata.data == undefined || jsdata.data.attributes == undefined) {
                callback("Cannot parse response.");
                return;
            }

            if (jsdata.data.attributes.name) data.name = jsdata.data.attributes.name;

            xlinks_api.cache_set("group_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            if (xhr.context !== undefined) {
                aggregators[xhr.context].add_data("group", data);
            }

            callback(null, [data]);
        };
        
        var ch_url_get_info = function (url, callback) {
            var m = /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter\/([a-z0-9\-]+)/i.exec(url),
                url_info;
            if (m !== null && m[2] !== undefined) {
                url_info = {
                    id: m[2],
                    type: "chapter",
                    tag: "MD",
                    context: m[2],
                };

                // hack a way to use the site icon as a language flag
                if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags)
                    url_info.icon = "replaceme-"+url_info.id;

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        };
        var ch_url_info_to_data = function (url_info, callback) {
            // make chapter api call with its id as context
            // the parse_response functions will then add their data to the aggregator
            var aggregator = new DataAggregator(callback);
            aggregator.context = url_info.context;
            aggregators[url_info.context] = aggregator;
            xlinks_api.request("mangadex", "chapter", url_info.id, url_info, (err, data) => {
                if (err == null) {
                    aggregator.add_data("chapter", data);

                    var has_manga = false;
                    var has_groups = 0;
                    var group_num = 0;

                    if (data.relationships !== undefined) {
                        for (var i = 0; i < data.relationships.length; i++) {
                            if (data.relationships[i].type == "scanlation_group") {
                                group_num++;
                            }
                        }
                        aggregator.group_num = group_num;

                        for (var i = 0; i < data.relationships.length; i++) {
                            if (data.relationships[i].type == "scanlation_group") {
                                has_groups++;

                                group_url_info = {
                                    id: data.relationships[i].id,
                                    context: data.id,
                                    type: "group",
                                }
                                var groupdata = xlinks_api.cache_get("group_" + group_url_info.id);
    
                                if (groupdata !== null) {
                                    aggregator.add_data("group", groupdata);
                                }
                                else {
                                    // no cached group data
                                    xlinks_api.request("mangadex", "group", group_url_info.id, group_url_info, (err, data) => {});
                                }
                            }
                            else if (data.relationships[i].type == "manga") {
                                has_manga = true;
                                manga_url_info = {
                                    id: data.relationships[i].id,
                                    context: data.id,
                                    type: "manga",
                                }
                                var mangadata = xlinks_api.cache_get("manga_" + manga_url_info.id);
    
                                if (mangadata !== null) {
                                    if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && lang_to_flag[mangadata.originalLanguage] !== undefined)
                                        replace_icon(data.id, lang_to_flag[mangadata.originalLanguage]);
                                    aggregator.add_data("manga", mangadata);
                                }
                                else {
                                    // no cached manga data
                                    xlinks_api.request("mangadex", "manga", manga_url_info.id, manga_url_info, (err, data) => {});
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

                        if (has_groups == 0) {
                            groupdata = {
                                name: null,
                            };
                            aggregator.add_data("group", groupdata);
                        }
                    }
                }
            });
        };

        xlinks_api.init({
            namespace: "mangadex",
            name: "Mangadex links",
            author: "mycropen",
            description: "Linkify and format Mangadex links",
            version: ["1#version1"],
            registrations: 1,
            main: main_fn
        }, function (err) {
            if (err === null) {
                xlinks_api.insert_styles(".xl-site-tag-icon[data-xl-site-tag-icon=lang_jp]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAUVBMVEX////89ffstsPjlaj77/LacYq+CTS8AC2/CjXacov78PP22+HGJUvGJkz23OLac4z99vjst8Tjlqnkl6nkmKrsuMW/CzbbdY3GJ0323ePadI1SYYEeAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAEkH80BkfYAAAB6SURBVCjPzZHJDoAgDEQRVBCVVXD5/w+VGIMQSrj6rvOaTlqE/kaHCcFdNe6HkQbYxOF8XujLKsD5mAejB4SBJkigH0sFpgpB0wxdCCYXbCHYXNhaK1yjpC9LIpkKO3AHvn75AR5bROM4K8+STw9/VZ4VUM4Yp9DfuAEcEgb8vRe9xgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMS0xMlQwMTozMToyMiswMDowMJwMZyQAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDEtMTBUMDM6NTA6NTkrMDA6MDAFGLMuAAAAAElFTkSuQmCC)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_cn]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAclBMVEXuHCXxQB/xRx7vKSP4oBD4pA/uHyX0cRf0cBfwOCDuIiTuICTuHSXvJCTvKyP6vQvxSh381wfvKCPvLyL6tgz//wDwMiH1fhX4mxD6uwv6wgryUB3vIyT1dxbyURz+7wPvJyP2iRP4oQ/zXRrzWRv///96F0p+AAAAAWJLR0QlwwHJDwAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAEkN/i0OQwAAABvSURBVCjPY2AgATAy4ZRiZgaRLKxsuBSwc4ApTi5uHiyyvHx8/Px8fLxApoCgEBYFwiKiQMAvBmRyiQtjtUFCVFQCr/MlpaQkISxprPIysjw8sjIglpy8GF6TFPiEufHJKyqx4dXPoKzCMAoGMwAAo/cEXRjamKYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDEtMTJUMDE6MzE6MjIrMDA6MDCcDGckAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAxLTEwVDAzOjUwOjU5KzAwOjAwBRizLgAAAABJRU5ErkJggg==)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_kr]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABoVBMVEX///+7u7vCwsLBwcG9vb3u7u4cHBySkpJ5eXl2dnYdHR3w8PBeXl5paWkwMDCHh4c3Nzf4+Pj29vaFhYU0NDRmZmaOjo6zs7MiIiJzc3NLS0tRUVF+fn56enpNTU1JSUmMjIxnZ2e2trbv7+8eHh4VFRWGhoYuLi75+fn9+PnpparYXGXPN0LPOEPYXWbqqa7++/tqamqxsbEXFxcbGxvNzc1/f3/Ozs733+HSQ07NLjrXWWL66+zY2NgYGBh8fHzPz8/09PSQkJBOTk739ffMOkdSUlKPj4/19fWkhKLrq6++vr56T3y0MUaWNVa3MUXZX2g0Rox7OGMCRp8AR6ADR55vOmjQPEcJTaNoOmzLLzvLLjtiO2+pP1kzbLMZRJQ3QIQXRJV9VYCOrdWjjaqUlJRPT099fX32+fwtZ7EyaK/69/lTU1PQ0NCAgIAxMTHh6fQya7Pm7fbX19czMzPT09MkJCSgoKD3+fyQr9Y1bbQKTqQ3b7SUstf5+/0nJyeRkZG0tLQhISGsrKxXV1d4eHhlZWX+/v5xcXG5ubm8vLzgoCRaAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDAElAS4VndQAAAFISURBVCjPY2CgEmBkQhdhZkHmsbKxc6DKc7JzcSNxeXj5+AUEEXwhAWERUTEEX1xCUkpaBtkAWTl5BUUlGE9ZhV1VTV2DgUFTS1tHV0/fgIFBw9DImN2EFarA1IyP39icgcHC0goMrG0YGGzthEXsHWBGODo5Ay1wcbWCAmugGbJu7h5IdrIALfC0ggMvBgZBb4yw8IFI+vr5WwVgDaxAsHxQcEhoWDhWBRGRUVbRMSEgEItVQVxIfEIiWD4kCUOSCejI5BA4SAE6Ejl2PFLT0hkYMjJh8lnZDAwcOexCMPncvHx+Y1MGhgKoisIiBoZiO+ESs1KoAm4V9rJyUFBXVFZVV9fU1gEtMDSvb2CDBTVDY1Nzi3Q6spta03JYRJUQfB7efP4SISRHlQiLtKWiJhjJdmQT2jsaVJATDEMnSgIDga4uBioBAMJERI7yM7r7AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_hk]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAMAAACsjQ8GAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABFFBMVEW6AAC6AQHFKSntvLzrtLS+DQ345OT+/f355+e7AgLWZmb+/Pzwycn////DIiLGKyvBGxu/ERHfiYnyzs7HMjLfiorilZXUYGC8BwfadXXxzc3VZ2f45eXln5/TXFz77+/vw8O7AwPTXl7xy8vYbm7ruLjGLCzmpqbtvr767u756urMQ0O8CAjz09P99vb34uLwx8fDICDHNDTLQEDMRETadnb12dnmoaG/ExPAFhboqan99fX02trgjIzEJibz0NDz1NTJNzfcf3/ZcXHuvr7MQUHuv7/EJSX9+Pj67e3SWFj//v6/EhLehob++/vwy8v88/Ppra3HMTHCHx/uwMDilJTWZ2f99/f12tq8BgbSWVnFKirY+jP4AAAAAWJLR0QN9rRh9QAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3Izr/obEAAACmSURBVCjPY2AYhIARvzQTMwteeVY2dg5OfAq4uHl4+XBJ8gsIMgqx8QqLiIqJS2BTIMnLKyUtIyvHwSbPrqCIRYESrzKviqqaugavjKaWNhYFOrp6+gaGRsYmpmbmFlgdYWllbWNrYmfvYIjTE45Ozi6uMmxuuOTdPXg1Pb14Nb19cCjw9fMPCAziFeYNxi5vEcKrF8rKEBYegTMwLSJBZFQ0w7ADACDyErqWmAEaAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_id]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYAQMAAAChnW13AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABlBMVEXnABH///9GPYQdAAAAAWJLR0QB/wIt3gAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3KkMjGRUAAAAQSURBVAjXY2CgAPwHAjIJAJsjL9Ejwc0pAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAxLTEyVDAxOjMxOjIyKzAwOjAwnAxnJAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMS0xMFQwMzo1MDo1OSswMDowMAUYsy4AAAAASUVORK5CYII=)}.xl-site-tag-icon[data-xl-site-tag-icon=lang_th]{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYBAMAAABpfeIHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAFVBMVEWlGTHq2d/09fhGQ18tKkrb2+L///+mSNUGAAAAAWJLR0QGYWa4fQAAAAlwSFlzAAAABAAAAAQAYp+hIAAAAAd0SU1FB+cBDQA3LkRO3QwAAAAkSURBVBjTY2CgAhBEAwxKaIAIAWM0wOCCBugkEIoGyPELFQAAxhk0Eaz+gbcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDEtMTJUMDE6MzE6MjIrMDA6MDCcDGckAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAxLTEwVDAzOjUwOjU5KzAwOjAwBRizLgAAAABJRU5ErkJggg==)}");

                xlinks_api.register({
                    settings: {
                        sites: [ // namespace
                            //name,      default, title,          description,                             descriptor?
                            ["mangadex", true,    "mangadex.org", "Enable link processing for mangadex.org"],
                            // descriptor: { type: string, options: <array of [string:value, string:label, string:description]> }
                            // for pre-existing vars: [ "name" ]
                        ],
                        mangadex: [
                            ["show_orig_lang", true, "Show original language", "Include the original language of a series as a tag [jp], etc."],
                            ["use_flags", true, "Use country flags", "Show country flags instead of language tags. These will replace [MD]."],
                            ["show_volume", true, "Show volume number", ""],
                            ["show_ch_title", true, "Show chapter title", ""],
                            ["show_pages", true, "Show page number", ""],
                            ["show_group", false, "Show group name", ""],
                            // ["show_ch_lang", false, "Show chapter language", "Include the language a chapter was translated into"],
                        ]
                    },
                    request_apis: [{
                        group: "mangadex",
                        namespace: "mangadex",
                        type: "chapter",
                        count: 1,
                        concurrent: 1,
                        delay_okay: 350,
                        delay_error: 5000,
                        functions: {
                            get_data: md_get_data,
                            set_data: md_set_data,
                            setup_xhr: md_chapter_setup_xhr,
                            parse_response: md_chapter_parse_response
                        },
                    },
                    {
                        group: "mangadex",
                        namespace: "mangadex",
                        type: "manga",
                        count: 1,
                        concurrent: 1,
                        delay_okay: 350,
                        delay_error: 5000,
                        functions: {
                            setup_xhr: md_manga_setup_xhr,
                            parse_response: md_manga_parse_response
                        },
                    },
                    {
                        group: "mangadex",
                        namespace: "mangadex",
                        type: "group",
                        count: 1,
                        concurrent: 1,
                        delay_okay: 350,
                        delay_error: 5000,
                        functions: {
                            setup_xhr: md_group_setup_xhr,
                            parse_response: md_group_parse_response
                        },
                    }],
                    linkifiers: [{
                        regex: /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter(?:\/[a-z0-9\-]*)?/i,
                        prefix_group: 1,
                        prefix: "https://",
                    }],
                    commands: [{
                        url_info: ch_url_get_info,
                        to_data: ch_url_info_to_data,
                        // actions: create_actions,
                        // details: create_details
                    }]
                });
            }
        });
    };
    main(xlinks_api);
})();