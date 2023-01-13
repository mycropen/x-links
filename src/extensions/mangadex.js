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
            author: "#{json:#author}#",
            description: "#{json:#description}#",
            version: ["#{version:#version}#"],
            registrations: 1,
            main: main_fn
        }, function (err) {
            if (err === null) {
                xlinks_api.insert_styles("#{style:../../resources/stylesheets/extensions/mangadex.css}#");

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