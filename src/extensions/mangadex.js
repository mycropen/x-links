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

            nodes = $$("span.xl-site-tag-icon[data-xl-site-tag-icon=replaceme-"+CSS.escape(site_short[site])+"-"+CSS.escape(ch_id)+"]");
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
                        let lcode = title_order[i];
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
                    let combined_group_name = "";
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
        };
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
            md_aggregators[ctx[1]].add_data("author", data);

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
                // The MangadexDataAggregator will decide if it's an icon or flag and how to style it
                if (xlinks_api.config.mangadex.show_icon)
                    url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;

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
        };
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
        };

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
        };


        // Dynasty-Scans
        var ds_get_data = function (info) {
            var data = xlinks_api.cache_get("ds_" + info.id);
            return data;
        };
        var ds_set_data = function (data, info, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            if (info.lifetime !== undefined) lifetime = info.lifetime;
            xlinks_api.cache_set("ds_" + info.id, data, lifetime);
            if (err_callback !== null) err_callback(null);
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
                        url_info.icon = "replaceme-"+site_short[url_info.site]+"-"+url_info.id;
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
            // var dsdata = xlinks_api.cache_get(url_info.id, null);
            var dsdata = ds_get_data(url_info);
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
        };

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
        };


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
        };
        var bt_set_data = function (key, data, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            xlinks_api.cache_set("bt_" + key, data, lifetime);
            if (err_callback !== null) err_callback(null);
        };

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
        };
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
        };
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
        }

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
        };
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
        };
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
        };

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
        };
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
        };

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
        };


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
                if (xlinks_api.config.comick.show_group && this.data.chapter.groups.length > 0)
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
                            // console.log([this.data.series.title, lcode, this.data.series.titles[lcode]]);
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
        };
        var ck_set_data = function (key, data, err_callback) {
            var lifetime = 7 * xlinks_api.ttl_1_day;
            xlinks_api.cache_set("ck_" + key, data, lifetime);
            if (err_callback !== null) err_callback(null);
        };

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
        };
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
        };

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
        };
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
        };

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
        };
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
        };

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
        });
    };
    main(xlinks_api);
})();