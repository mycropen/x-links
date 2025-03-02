/* jshint eqnull:true, noarg:true, noempty:true, eqeqeq:true, bitwise:false, strict:true, undef:true, curly:false, browser:true, devel:true, newcap:false, maxerr:50 */
/* globals xlinks_api */
(function () {
    "use strict";

    /*#{begin_debug:timing=true}#*/

    /*#{require:../../extensions/api.js#tabs=1}#*/

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
            this.author_num = 1;
            this.artist_num = 1;
            this.data = {
                groups: Array(),
                authors: Array(),
                author_ids: Array(),
                artist_ids: Array(),
            };
        };
        DataAggregator.prototype.add_author_id = function (id) {
            this.data.author_ids.push(id);
        };
        DataAggregator.prototype.add_artist_id = function (id) {
            this.data.artist_ids.push(id);
        };
        DataAggregator.prototype.add_data = function (category, data) {
            if (category == "group")
                this.data.groups.push(data);
            else if (category == "author")
                this.data.authors.push(data);
            else
                this.data[category] = data;
            this.validate();
        };
        DataAggregator.prototype.validate = function () {
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
                for (i = 0; i < data.authors.length; i++) {
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
                for (i = 0; i < data.groups.length; i++) {
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

            this.callback(null, aggdata);
        };

        var aggregators = {};
        
        var replace_icon = function (ch_id, site, icon_name, apply_style) {
            // url_info.icon was set to a placeholder if use_flags is set
            // this replaces it with the real icon (e.g. a flag) after the manga data was acquired
            // also applies a style to the icon if apply_style is true
            // site must be either "dynasty" or "mangadex" because it's directly used as the attribute name of xlinks_api.config
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

            nodes = $$("span.xl-site-tag-icon[data-xl-site-tag-icon=replaceme-"+ch_id+"]");
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].setAttribute("data-xl-site-tag-icon", icon_name);

                let node_style = nodes[i].getAttribute("style");
                if (node_style === undefined || node_style === null)
                    nodes[i].setAttribute("style", style_str) 
                else
                    nodes[i].setAttribute("style", [node_style.trim(";"), style_str].join(";")) 
            }
        }


        // functions that interact with the API
        // Mangadex
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
        };
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

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
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

            var ctx;
            if (xhr.context !== undefined) {
                ctx = xhr.context.split("_");
            }
            else {
                callback("Invalid response context");
                return;
            }
            var aggregator = aggregators[ctx[1]];

            jsdata = xlinks_api.parse_json(xhr.responseText, null);
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

            if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && ctx[1] !== undefined)
                if (lang_to_flag[data.originalLanguage] !== undefined)
                    replace_icon(ctx[1], "mangadex", lang_to_flag[data.originalLanguage], false);
                else
                    // flag not implemented
                    replace_icon(ctx[1], "mangadex", "site_MD", false);

            // if (xlinks_api.config.mangadex.show_author || xlinks_api.config.mangadex.show_artist)
            get_other_manga_data(ctx[1], data, aggregator);

            xlinks_api.cache_set("manga_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            aggregator.add_data("manga", data);

            callback(null, [data]);
        };
        var get_other_manga_data = function (context, data, aggregator) {
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

            xlinks_api.cache_set("group_" + jsdata.data.id, data, 7 * xlinks_api.ttl_1_day);
            aggregators[ctx[1]].add_data("group", data);

            callback(null, [data]);
        };
        
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
            aggregators[ctx[1]].add_data("author", data);

            callback(null, [data]);
        };

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
                if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags)
                    url_info.icon = "replaceme-"+url_info.id;
                else if (xlinks_api.config.mangadex.show_icon)
                    url_info.icon = "site_MD";

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        };
        var md_ch_url_info_to_data = function (url_info, callback) {
            // make chapter api call with its id as context
            // the parse_response functions will then add their data to the aggregator
            var ctx = url_info.context.split("_");
            var aggregator = new DataAggregator(callback);
            aggregator.context = ctx[1];
            aggregators[ctx[1]] = aggregator;

            var chdata = xlinks_api.cache_get(url_info.id, null);
            if (chdata !== null) {
                aggregator.add_data("chapter", chdata);
                get_other_ch_data(url_info, chdata, aggregator);
            }
            else {
                xlinks_api.request("mangadex", "generic", url_info.id, url_info, (err, data) => {
                    if (err == null) {
                        md_set_data(data, url_info, (err) => {});
                        aggregator.add_data("chapter", data);
                        get_other_ch_data(url_info, data, aggregator);
                    }
                });
            }
        };
        var get_other_ch_data = function (url_info, data, aggregator) {
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
                                if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && lang_to_flag[cached_mangadata.originalLanguage] !== undefined)
                                    replace_icon(data.id, "mangadex", lang_to_flag[cached_mangadata.originalLanguage], false);
                                // if (xlinks_api.config.mangadex.show_author || xlinks_api.config.mangadex.show_artist)
                                get_other_manga_data(data.id, cached_mangadata, aggregator);
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
        }

        var md_create_actions = function (data, url_info, callback, retry = false) {
            // console.log(["md_create_actions", data, url_info, callback, aggregators[url_info.id]]);

            // [id, base_title]
            var title_data = [aggregators[url_info.id].data.manga.id, aggregators[url_info.id].data.final.manga];

            // [[id, name], [id, name], ...]
            var group_data = Array();
            if (aggregators[url_info.id].data.groups.length > 0) {
                for (let i = 0; i < aggregators[url_info.id].data.groups.length; i++) {
                    group_data.push([aggregators[url_info.id].data.groups[i].id, aggregators[url_info.id].data.groups[i].name]);
                }
            }

            // [[id, name, roles], [id, name, roles], ...]
            var author_data = Array();
            var added_author_ids = Array();
            if (aggregators[url_info.id].data.authors.length > 0) {
                for (let i = 0; i < aggregators[url_info.id].data.authors.length; i++) {
                    if (added_author_ids.indexOf(aggregators[url_info.id].data.authors[i].id) != -1) continue;
                    let roles = Array();
                    if (aggregators[url_info.id].data.author_ids.indexOf(aggregators[url_info.id].data.authors[i].id) != -1)
                        roles.push("Author");
                    if (aggregators[url_info.id].data.artist_ids.indexOf(aggregators[url_info.id].data.authors[i].id) != -1)
                        roles.push("Artist");
                    author_data.push([aggregators[url_info.id].data.authors[i].id, aggregators[url_info.id].data.authors[i].name, roles]);
                    added_author_ids.push(aggregators[url_info.id].data.authors[i].id);
                }
            }
            else {
                // get data from aggregator's manga data or cached manga data
                var author_ids = Array();
                var artist_ids = Array();
                var mangadata;
                var author_list = Array();
                if (aggregators[url_info.id].data.manga.relationships)
                    mangadata = aggregators[url_info.id].data.manga;
                else
                    mangadata = xlinks_api.cache_get("manga_" + aggregators[url_info.id].data.manga.id);
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
                    // console.log(["No cached manga data with relationships:", aggregators[url_info.id].data.manga.id, mangadata]);
                }
            }
            if (author_data.length == 0 && !retry) {
                // console.log("No authors found. Initiating new manga data request.");
                let manga_url_info = {
                    id: aggregators[url_info.id].data.manga.id,
                    context: "manga_" + aggregators[url_info.id].data.chapter.id,
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
            var tag_groups = {
                "Genre:": [],
                "Theme:": [],
                "Format:": [],
            };
            var mangadata;
            // console.log([]);
            if (aggregators[url_info.id].data.manga.tags)
                mangadata = aggregators[url_info.id].data.manga;
            else {
                let cached_mangadata = xlinks_api.cache_get("manga_" + aggregators[url_info.id].data.manga.id);
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
            var urls = Array();
            var base_url = "https://mangadex.org/";
            var last_descriptor = "";

            urls.push(["Title:", base_url + "title/" + title_data[0], title_data[1]]);
            for (let i = 0; i < group_data.length; i++) {
                let descriptor = "Group:";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + "group/" + group_data[i][0], group_data[i][1]]);
            }
            for (let i = 0; i < author_data.length; i++) {
                let descriptor = author_data[i][2].join(", ") + ":";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + "author/" + author_data[i][0], author_data[i][1]]);
            }
            for (let i = 0; i < tag_data.length; i++) {
                let descriptor = tag_data[i][2] + ":";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + "tag/" + tag_data[i][0], tag_data[i][1]]);
            }

            callback(null, urls);
        };

        // Dynasty-Scans
        var ds_get_data = function (info, callback) {
            var data = xlinks_api.cache_get(info.id);
            callback(null, data);
        };
        var ds_set_data = function (data, info, callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            if (info.lifetime !== undefined) lifetime = info.lifetime;
            xlinks_api.cache_set(info.id, data, lifetime);
            callback(null);
        };

        var ds_chapter_setup_xhr = function (callback) {
            var info = this.infos[0];
            callback(null, {
                method: "GET",
                url: "https://dynasty-scans.com/chapters/" + info.id,
            });
        };
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
        };

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
                        url_info.icon = "replaceme-"+url_info.id;
                    else
                        url_info.icon = "site_DS";
                }

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        };
        var ds_ch_url_info_to_data = function (url_info, callback) {
            var dsdata = xlinks_api.cache_get(url_info.id, null);
            if (dsdata !== null) {
                dsdata.title = ds_make_title(dsdata, url_info);
                callback(null, dsdata);
            }
            else
                xlinks_api.request("dynasty", "chapter", url_info.id, url_info, callback);
        };

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
            if (xlinks_api.config.dynasty.tag_filter !== "") {
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
        }

        var ds_create_actions = function (data, info, callback, retry = false) {
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

            if (data.releasedAt)
                urls.push(["Released:", null, data.releasedAt]);
            if (data.links.base_title.length > 0)
                urls.push(["Title:", base_url + data.links.base_title[0], data.links.base_title[1]]);
            for (i=0; i < data.authors.length; i++) {
                let descriptor = "Author:";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + data.links.authors[data.authors[i]], data.authors[i]]);
            }
            for (i=0; i < data.groups.length; i++) {
                let descriptor = "Group:";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + data.links.groups[data.groups[i]], data.groups[i]]);
            }
            for (i=0; i < data.volumes.length; i++) {
                let descriptor = "Volume:";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + data.links.volumes[data.volumes[i]], data.volumes[i]]);
            }
            for (i=0; i < data.tags.length; i++) {
                let descriptor = "Tag:";
                if (last_descriptor == descriptor)
                    descriptor = "";
                else
                    last_descriptor = descriptor
                urls.push([descriptor, base_url + data.links.tags[data.tags[i]], data.tags[i]]);
            }

            callback(null, urls);
        };

        xlinks_api.init({
            namespace: "mangadex",
            name: "Mangadex & Dynasty links",
            author: "#{json:#author}#",
            description: "#{json:#description}#",
            version: [/*#{version:,}#*/],
            registrations: 1,
            main: main_fn
        }, function (err) {
            if (err === null) {
                xlinks_api.insert_styles("#{style:../../resources/stylesheets/extensions/mangadex.css}#");

                xlinks_api.register({
                    settings: {
                        sites: [ // namespace
                            //name,      default, title,               description,                             descriptor?
                            ["mangadex", true,    "mangadex.org",      "Enable link processing for mangadex.org"],
                            ["dynasty",  true,    "dynasty-scans.com", "Enable link processing for dynasty-scans.com"],
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
                                {type: "textbox"}],
                            // ["show_ch_lang", false, "Show chapter language", "Include the language a chapter was translated into"],
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
                        ]
                    },
                    request_apis: [{
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
                    }],
                    linkifiers: [{
                        // mangadex.org can only be preceeded by "https://" or "www." or both or neither
                        // the link ends either with the ID, a "/", a "#" or "/5" (for page 5)
                        regex: /(https?:\/\/)?(www\.)?(?<=(www\.|\/\/|\s+|^))mangadex\.org\/chapter\/([a-z0-9\-]+)(\/|\/\d+|\/\d+)?#?/i,
                        prefix_group: 1,
                        prefix: "https://",
                    },
                    {
                        regex: /(https?:\/*)?(?:www\.)?dynasty-scans.com\/chapters\/(?:[^\s]+)?/i,
                        prefix_group: 1,
                        prefix: "https://",
                    }],
                    commands: [{
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
                    }]
                });
            }
        });
    };
    main(xlinks_api);
})();