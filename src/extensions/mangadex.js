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

            if (xlinks_api.config.mangadex.custom_title) {
                var title_order = xlinks_api.config.mangadex.title_search_order.replace(/\s+/g, "").split(",");
                var title_found = false;
                for (var i = 0; i < title_order.length; i++) {
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

            if (xlinks_api.config.mangadex.show_orig_lang && xlinks_api.config.mangadex.use_flags && xhr.context !== undefined)
                if (lang_to_flag[data.originalLanguage] !== undefined)
                    replace_icon(xhr.context, lang_to_flag[data.originalLanguage]);
                else
                    // flag not implemented
                    replace_icon(xhr.context, 'site_MD');

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
        
        var md_ch_url_get_info = function (url, callback) {
            var m = /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter\/([a-z0-9\-]+)/i.exec(url),
                url_info;
            if (m !== null && m[2] !== undefined) {
                url_info = {
                    id: m[2],
                    site: "mangadex",
                    type: "chapter",
                    tag: "MD",
                    context: m[2],
                };

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
            var aggregator = new DataAggregator(callback);
            aggregator.context = url_info.context;
            aggregators[url_info.context] = aggregator;

            var chdata = xlinks_api.cache_get(url_info.id, null);
            if (chdata !== null) {
                aggregator.add_data("chapter", chdata);
                get_manga_group_data(url_info, chdata, aggregator);
            }
            else {
                xlinks_api.request("mangadex", "chapter", url_info.id, url_info, (err, data) => {
                    if (err == null) {
                        md_set_data(data, url_info, (err) => {});
                        aggregator.add_data("chapter", data);
                        get_manga_group_data(url_info, data, aggregator);
                    }
                });
            }
        };
        var get_manga_group_data = function (url_info, data, aggregator) {
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
            };

            // title
            if ((nn = $("#chapter-title > b", html)) !== null)
                data.base_title = nn.textContent.trim();
            else {
                callback(null, [{error: "Invalid chapter"}]);
                return;
            }

            // authors
            if ((nn = $$("#chapter-title > a", html)).length > 0) {
                for (var i = 0; i < nn.length; i++) {
                    data.authors.push(nn[i].textContent.trim());
                }
            }

            // pages
            data.pages = $$("a.page", html).length;

            // volumes
            if ((nn = $$("span.volumes > a", html)).length > 0) {
                for (var i = 0; i < nn.length; i++) {
                    data.volumes.push(nn[i].textContent.trim());
                }
            }

            // groups
            if ((nn = $$("span.scanlators > a", html)).length > 0) {
                for (var i = 0; i < nn.length; i++) {
                    if (nn[i].textContent.trim().length > 0)
                        data.groups.push(nn[i].textContent.trim());
                    else if ((n2 = $("img", nn[i])) !== null)
                        // check the a > img.alt attribute, e.g. for /u/ scanlations
                        data.groups.push(n2.getAttribute("alt"));
                }
            }

            // releasedAt
            if ((nn = $("span.released", html)) !== null) {
                data.releasedAt = nn.textContent.trim();
                data.releasedAt = data.releasedAt.replace(/\s+/g, " ");
            }

            // tags
            if ((nn = $$("span.tags > a.label", html)).length > 0) {
                for (var i = 0; i < nn.length; i++) {
                    data.tags.push(nn[i].textContent.trim());
                }
            }

            ds_set_data(data, info, (err) => {
                if (err !== null)
                    console.log("Error caching Dynasty data.");
            })
            data.title = ds_make_title(data);

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

                if (xlinks_api.config.dynasty.show_icon)
                    url_info.icon = "site_DS";

                callback(null, url_info);
            }
            else {
                callback(null, null);
            }
        };
        var ds_ch_url_info_to_data = function (url_info, callback) {
            var dsdata = xlinks_api.cache_get(url_info.id, null);
            if (dsdata !== null) {
                dsdata.title = ds_make_title(dsdata);
                callback(null, dsdata);
            }
            else
                xlinks_api.request("dynasty", "chapter", url_info.id, url_info, callback);
        };

        var ds_make_title = function (data) {
            var title = data.base_title;
            if (xlinks_api.config.dynasty.show_pages)
                title += " (" + String(data.pages) + "p)";
            if (xlinks_api.config.dynasty.show_group && data.groups.length > 0) {
                title += " [" + data.groups.join(', ') + "]";
            }
            title = title.replace(/\s+/g, " ");
            return title;
        }

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
                            // descriptor: { type: string, options: <array of [string:value, string:label, string:description]> }
                            // for pre-existing vars: [ "name" ]
                        ],
                        mangadex: [
                            ["show_icon", true, "Show an icon instead of an [MD] tag", ""],
                            ["show_orig_lang", true, "Show original language", "Include the original language of a series as a tag [jp], etc."],
                            ["use_flags", true, "Use country flags", "Show country flags instead of language tags in place of the [MD] tag or icon."],
                            ["show_volume", true, "Show volume number", ""],
                            ["show_ch_title", true, "Show chapter title", ""],
                            ["show_pages", true, "Show page number", ""],
                            ["show_group", false, "Show group name", ""],
                            ["custom_title", false, "Non-default series title language", "With the default title as fallback"],
                            ["title_search_order", "en, orig-ro, orig", "Series title search order",
                                "orig = original language; -ro = romanized; e.g. ja, ja-ro, en, zh, zh-hk, ko, id, th, es, vi, de, ru, uk, fr, fa, pt, pt-br, tr, ...",
                                {type: "textbox"}],
                            // ["show_ch_lang", false, "Show chapter language", "Include the language a chapter was translated into"],
                        ],
                        dynasty: [
                            ["show_icon", true, "Show an icon instead of a [DS] tag", ""],
                            ["show_pages", true, "Show page number", ""],
                            ["show_group", false, "Show group name", ""],
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
                            // get_data: md_get_data,
                            // set_data: md_set_data,
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
                        regex: /(https?:\/*)?(?:www\.)?mangadex\.org\/chapter(?:\/[a-z0-9\-]*)?/i,
                        prefix_group: 1,
                        prefix: "https://",
                    },
                    {
                        regex: /(https?:\/*)?(?:www\.)?dynasty-scans.com\/chapters\/(?:.+)?/i,
                        prefix_group: 1,
                        prefix: "https://",
                    }],
                    commands: [{
                        url_info: md_ch_url_get_info,
                        to_data: md_ch_url_info_to_data,
                        // actions: create_actions,
                        // details: create_details
                    },
                    {
                        url_info: ds_ch_url_get_info,
                        to_data: ds_ch_url_info_to_data,
                        // actions: create_actions,
                        // details: create_details
                    }]
                });
            }
        });
    };
    main(xlinks_api);
})();