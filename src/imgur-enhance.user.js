// ==UserScript==
// @name         imgur-enhance
// @namespace    http://davenewson.com/
// @version      0.1
// @description  Enhance Imgur with some hacked in user features because we're impatient people
// @author       Dave Newson
// @include      *://imgur.com
// @include      *://imgur.com/*
// @include      *.imgur.com
// @include      *.imgur.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function(window, $) {

    // Stop TamperMonkey shitting itself
    if ($ === undefined || Namespace === undefined || Imgur === undefined) {
        return;
    }

    /**
     * Utility: Stylesheet manager
     * @Class ImgurEnhance.StyleSheet
     */
    Namespace('ImgurEnhance.StyleSheet');
    ImgurEnhance.StyleSheet = {

        /**
         * Create a stylesheet container we can append to
         * @return {CSSStyleSheet}
         */
        create: function () {
            // Create the <style> tag
            var style = document.createElement("style");

            // WebKit hack :(
            style.appendChild(document.createTextNode(""));

            // Add the <style> element to the page
            document.head.appendChild(style);
            return style.sheet;
        }
    };

    /**
     * Seent Model
     * Data container for local storage persistence
     * @Class ImgurEnhance.SeentModel
     */
    Namespace('ImgurEnhance.SeentModel');
    ImgurEnhance.SeentModel = function(a) {
        this.init(a);
    };
    ImgurEnhance.SeentModel.prototype = {

        /**
         * LocalStorage
         */
        storage: null,
        storageKey: "ImgurEnhance.Seent",

        /**
         * Hash lifetime values
         */
        lifetime: 5 * 86400,
        currentKey: 0,

        /**
         * @var {object} data container for localStorage
         */
        data: {
            visited: {},
            seentHide: false
        },

        /**
         * Constructor
         */
        init: function(storage) {

            // Load local storage
            this.storage = storage;
            this.data = $.extend(this.data, this.storage.get(this.storageKey));

            // Seent daily grouping key
            // timestamp = start of day stamp
            var now = new Date();
            var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            this.currentKey = startOfDay / 1000;

            // Prune the hash list
            this.pruneHashes();
        },

        /**
         * Add a hash to be tracked
         * @param {string} hash
         */
        addSeent: function(hash) {

            // Create container if not present
            if (this.data.visited[this.currentKey] === undefined) {
                this.data.visited[this.currentKey] = [];
            }

            // Add hash if not exists
            if (!this.hasSeent(hash)) {
                this.data.visited[this.currentKey].push(hash);

                // Update local storage
                this.storage.save(this.storageKey, this.data);
            }
        },

        /**
         * Check if an image hash as been seent
         * @param {string} hash
         * @return {boolean}
         */
        hasSeent: function(hash) {

            // Check all date groups
            for (var k in this.data.visited) {

                // Exists in group?
                if (this.data.visited[k].indexOf(hash) != -1) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Prune the stored seent image hashes
         * Remove by group, older than lifetime value
         */
        pruneHashes: function() {
            // Check all groups using their key
            for (var k in this.data.visited) {
                // Remove entries older than the lifetime
                if ((k + this.lifetime) < this.currentKey) {
                    delete this.data.visited[k];
                }
            }
        },

        /**
         * Set the "SeentHide" state
         * @param {boolean} state
         */
        setSeentHide: function(state) {
            this.data.seentHide = state;

            // Update local storage
            this.storage.save(this.storageKey, this.data);
        },

        /**
         * Get the "SeentHide" state
         * @return {boolean}
         */
        getSeentHide: function() {
            return this.data.seentHide;
        }
    };

    /**
     * Desktop version
     */
    function initDesktop() {

        /**
         * Feature: Seent
         * Adds a "seen it" feature, modifying the display for items you have seen before.
         * - Modifies DOM to inject some additional elements
         * - Adds some toggles in fun places.
         * - Uses local storage and groups memories by day, with periodic culling.
         */
        Namespace('ImgurEnhance.Seent');
        ImgurEnhance.Seent = Class.extend({

            /** @var {Element} */
            styleSheet: null,

            /** @var {ImgurEnhance.SeentModel} */
            data: null,

            /** @var {object} collection of in-page elements */
            elements: {
                $seentHideItem: null,
                $seentHideButton: null
            },

            /**
             * Initialise Seent
             */
            init: function() {

                this._ = {};

                // On the off-chance this isn't a gallery page,
                // like a profile page or something. Abort.
                if (Imgur.Gallery === undefined) {
                    return;
                }

                // Set up model with localStorage
                var storage = new Imgur.Storage.LocalStorage();
                this.data = new ImgurEnhance.SeentModel(storage);

                // Setup stylsheeys
                this.addStyles();

                // Seent tasks: Prune old, read page, attach display
                this.readSeent();
                this.attachGallerySeent();
                this.attachInsideGallerySeent();

                // Global seent MUST come last
                // due to init of seentHide
                this.attachGlobalSeent();
            },

            /**
             * Inject stylesheet hacks into DOM
             */
            addStyles: function() {
                var rules = [
                    // FP image
                    "#imagelist .seent { border-color: #2b2b2b; background: #000000; }",
                    "#imagelist .seent img { opacity: 0.33; }",
                    "#imagelist .seent:hover img { opacity: 1; }",

                    // FP Icon
                    "#imagelist .seent:hover .seent-icon { display:none; }",
                    "#imagelist .seent .seent-icon { display: block; position:absolute; right: 0px; bottom: 0px; width: 34px; height: 34px; background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat; background-position: -250px -184px; }",

                    // Sitebar Img
                    "#side-gallery .nav-image.seent .image-thumb { opacity: 0.33; }",
                    "#side-gallery .nav-image.seent:hover .image-thumb, #side-gallery .nav-image.seent.selected .image-thumb { opacity: 1; }",

                    // Seent hide
                    "#content .sort-options #seent-hide span { display: inline-block; width: 25px; height: 25px; image-rendering: optimizeQuality; -ms-interpolation-mode: nearest-neighbor; background: url(http://s.imgur.com/images/site-sprite.png) -256px -186px no-repeat transparent; }",
                    "#content .sort-options .active { opacity: 0.9; }"
                ];

                // Add all rules
                this.styleSheet = ImgurEnhance.StyleSheet.create();
                for(var k in rules) {
                    this.styleSheet.insertRule(rules[k], k);
                }
            },

            /**
             * Try to read seent out of the current page, and store the hash.
             */
            readSeent: function()
            {
                // Can't do anything without a hash
                if (!imgur._.hash) {
                    return;
                }

                // Persist seent value
                this.data.addSeent(imgur._.hash);
            },

            /**
             * Attach Seent elements to the global page (static) items.
             */
            attachGlobalSeent: function () {
                var _this = this;

                // Event: Add seent on click of FP images
                // Attach to static #content
                $('#content').on('click', '.post', function () {
                    $(this).addClass('seent');
                });

                // Event: Add seent on sidebar click
                // Attach to static #side-gallery
                $('#side-gallery').on('click', '.nav-image[data-hash]', function () {
                    $(this).addClass('seent');
                });

                // Event: Scrollin' on the FP
                Imgur.Gallery.getInstance()._.emitter.on('new gallery page', this, function () {
                    this.attachGallerySeent();
                });

                // Event: Changing view image
                Imgur.Gallery.getInstance()._.emitter.on('current image updated', this, function () {
                    this.readSeent();
                    this.attachInsideGallerySeent();
                });

                // Event: Scrollin' sidebar on inside gallery
                Imgur.Gallery.getInstance()._.emitter.on('pageLoad', this, function () {
                    this.attachInsideGallerySeent();
                });

                // Attach seent toggle to homepage
                // .each means this won't run without the element
                $('#content .sort-options ul').each(function() {

                    // Create seent button with click handler
                    var $seentHideItem = $('<li><a href="javascript:void(0)" id="seent-hide" title="Hide seen images"><span></span></a></li>');
                    _this.elements.$seentHideItem = $seentHideItem;
                    _this.elements.$seentHideButton = $seentHideItem.find('a');

                    // Add to start of Sort Orders list
                    var $sortOptionsList = $(this);
                    $sortOptionsList.prepend($seentHideItem);

                    // Event: On click seent hide, toggle state
                    _this.elements.$seentHideButton.on('click', function() {
                        // Toggle button and execute hide
                        _this.toggleSeentHide();
                    });

                    // Apply the seent-hide initial state
                    _this.toggleSeentHide(_this.data.getSeentHide());
                });
            },

            /**
             * Attach Seent elements to gallery
             * Note: May be called multiple times
             */
            attachGallerySeent: function () {
                var _this = this;

                // On Load: Attach seen styles on FP
                $('.post').not('.seent').each(function () {
                    var $post = $(this);

                    // Check each date block
                    if (_this.data.hasSeent($post.attr('id'))) {
                        $post.addClass('seent');
                        $post.append('<span class="seent-icon"></span>');
                    }
                });
            },

            /**
             * Attach Seent to inside-gallery items
             * On the right sidebar nav.
             */
            attachInsideGallerySeent: function () {
                var _this = this;

                // On Load: Attach seen styles on sidebar nav
                $('#side-gallery .nav-image[data-hash]').not('.seent').each(function () {
                    var $link = $(this);
                    var hash = $link.attr('data-hash');

                    // Check each container
                    if (_this.data.hasSeent(hash)) {
                        $link.addClass('seent');
                    }
                });
            },

            /**
             * Hide or unhide all seent items
             * @param {boolean} [forceHidden]
             */
            toggleSeentHide: function(forceHidden) {

                // Get state
                var $seentListItem = this.elements.$seentHideItem;
                state = (forceHidden !== undefined) ? forceHidden : !$seentListItem.hasClass('active');

                // Apply state
                $seentListItem.toggleClass('active', state);
                $('.seent').toggle(!state);

                // Persist state
                this.data.setSeentHide(state);
            }

        });
        Class.addSingleton(ImgurEnhance.Seent);

        /**
         * Always Bleed: Ensure the background gradient image is always present
         */
        Namespace('ImgurEnhance.AlwaysBleed');
        ImgurEnhance.AlwaysBleed = Class.extend({

            detectorSelector: '#fullbleed-bg',
            placement: '#content',
            html: '<div id="fullbleed-bg"></div>',

            /**
             * Engage!
             */
            init: function() {

                this._ = {};

                // No bleed? Make it bleed.
                if ($(this.detectorSelector).length < 1) {
                    $(this.html).insertBefore(this.placement);
                }
            }
        });
        Class.addSingleton(ImgurEnhance.AlwaysBleed);

        /**
         * Init: On document ready
         */
        $(function() {
            ImgurEnhance.Seent.getInstance();
            ImgurEnhance.AlwaysBleed.getInstance();
        });

    }

    /**
     * Mobile version
     */
    function initMobile() {

        /**
         * Utility: Mobile LocalStorage implementation
         * Because the Mobile framework is retarded.
         * This /tries/ to make it align with the one from Ract.
         */
        Namespace('ImgurEnhance.Storage');
        ImgurEnhance.SeentStorage = function() {
            this.init();
        };
        ImgurEnhance.SeentStorage.prototype = {

            storage: null,
            cookie: {
                expires: null,
                path: '/'
            },

            /**
             * Constructor to join Imgur's local storage
             */
            init: function() {
                this._ = {};
                this.storage = Imgur.Storage;

                // Set up expires time
                var c = new Date();
                c.setTime(c.getTime() + 315569e5);
                this.cookie.expires = c;
            },

            /**
             * Get value
             * @param {string} key
             * @return {object}
             */
            get: function(key) {
                try {
                    return JSON.parse(this.storage.get(key));
                } catch (e) {
                    return null;
                }
            },

            /**
             * Save value
             * @param {string} key
             * @param {object} value
             */
            save: function(key, value) {
                this.storage.set(key, JSON.stringify(value), this.cookie);
            }
        };
        Imgur.addSingleton(ImgurEnhance.SeentStorage);

        /**
         * Seent for mobile
         */
        Namespace('ImgurEnhance.Seent');
        ImgurEnhance.Seent = function() {
            this.init();
        };
        ImgurEnhance.Seent.prototype = {

            /** @var {Element} */
            styleSheet: null,

            /** @var {ImgurEnhance.SeentModel} */
            data: null,

            /**
             * Initialise Seent
             */
            init: function() {

                // Set up model for storage
                var storage = ImgurEnhance.SeentStorage.getInstance();
                this.data = new ImgurEnhance.SeentModel(storage);

                // add CSS styles
                this.addStyles();

                // Event: on change page, run them again!
                var _this = this;
                Imgur.Router.getInstance().header.on('change', function() {
                    _this.executeSeent();
                });

                // !!HACK!! Event: on Remove Loader
                // This is a monkey-patch into removeLoader on the Router
                // as there's no good event to latch onto.
                var cleanUp = Imgur.Router._instance.removeLoader;
                Imgur.Router._instance.removeLoader = function() {
                    // Run original
                    cleanUp.apply(this);

                    // Run seent, with a 500ms delay because something else
                    // around here is delaying things from being ready.
                    setTimeout(function() {
                        _this.executeSeent();
                    }, 500);

                };
            },

            /**
             * Inject stylesheet hack into DOM
             */
            addStyles: function() {
                var rules = [
                    // FP image seent
                    ".gallery .GalleryItem.seent .GalleryItem-imageContainer { opacity: 0.4 }",

                    // FP Icon
                    ".gallery .GalleryItem.seent .seent-icon { display: block; position:absolute; left: -6px; top: 4px; width: 34px; height: 34px; background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat; background-position: -250px -184px; }"
                ];

                // Add all rules
                this.styleSheet = ImgurEnhance.StyleSheet.create();
                for(var k in rules) {
                    this.styleSheet.insertRule(rules[k], k);
                }
            },

            /**
             * Run seent tasks
             * Mobile tends to reload the whole view, so do everything.
             */
            executeSeent: function() {
                this.readSeent();
                this.attachGallerySeent();
            },

            /**
             * Read the hash of the page and store it to Seent
             */
            readSeent: function() {
                var hash = Imgur.Router.getInstance().header.id;

                // Can't do anything without a hash
                if (hash === undefined) {
                    return;
                }

                // Persist seent value
                this.data.addSeent(hash);
            },

            /**
             * Modify the main gallery screen (where present)
             */
            attachGallerySeent: function() {
                var _this = this;

                // On Load: Attach seen styles on FP
                $('.gallery .GalleryItem').not('.seent').each(function () {
                    var $post = $(this);
                    var $img = $post.find('img[data-id]');

                    // Validate found id tag
                    if ($img.length < 1) { return };

                    // Check hash
                    var hash = $img.attr('data-id');
                    if (_this.data.hasSeent(hash)) {
                        $post.addClass('seent');
                        $post.append('<span class="seent-icon"></span>');
                    }
                });

            }

        };
        Imgur.addSingleton(ImgurEnhance.Seent);

        /**
         * Init: On document ready
         */
        $(function() {
            ImgurEnhance.Seent.getInstance();
        });
    }

    /**
     * Detect Desktop or Mobile
     * React = Desktop
     * Backbone = Mobile
     */
    if (window.React !== undefined) {
        initDesktop();
    } else if (window.Backbone !== undefined) {
        initMobile();
    }

})(window, window.jQuery, window.imgurEnhance);
