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

(function(window, $, imgurEnhance) {

    // Stop TamperMonkey shitting itself
    if ($ === undefined) {
        return;
    }

    /**
     * Singleton container for imgurEnhance modules
     * Just makes loading and debugging easier.
     * @type {*|{}}
     */
    imgurEnhance = imgurEnhance || {
        modules: [],

        /**
         * Add a module for document-ready execution
         * @param module
         */
        addModule: function (module) {
            this.modules.push(module);
        },

        /**
         * Initialise all registered modules
         */
        init: function () {
            // Init all modules
            for (var k in this.modules) {
                this.modules[k].init();
            }
        }
    };

    /**
     * @Class imgurEnhance
     * Utility local storage helper
     */
    function ImgurEnhanceUtilLocalStorage() {
        // Load data
        this.loadData();
    };
    ImgurEnhanceUtilLocalStorage.prototype = {

        data: {},
        storageKey: 'imgurEnhance',

        /**
         * Load from local storage
         */
        loadData: function () {
            this.data = $.extend(this.data, JSON.parse(localStorage.getItem(this.storageKey)));
        },

        /**
         * Write to local storage
         */
        saveData: function () {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        }
    };

    /**
     * @Class ImgurEnhanceUtilStyleSheet
     * Utility Stylesheet builder helper
     */
    ImgurEnhanceUtilStyleSheet = function () {
        // Nothing
    };
    ImgurEnhanceUtilStyleSheet.prototype = {

        /**
         * Create a stylesheet container we can append to
         */
        createStyleSheet: function () {
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
     * Imgur Enhance: Seent
     * - Images that have been viewed are dimmed, and an icon is added
     * - Persists history of viewed item hashes for 5 days via localstorage.
     * @Class ImgurEnhanceSeent
     */
    function ImgurEnhanceSeent() {
        // Initialise local storage
        ImgurEnhanceUtilLocalStorage.call(this);
    }

    ImgurEnhanceSeent.prototype = $.extend(new ImgurEnhanceUtilLocalStorage(), new ImgurEnhanceUtilStyleSheet(), {

        storageKey: 'imgurEnhance.seent',
        currentKey: 0,
        lifetime: 5 * 86400,
        data: {
            visited: {},
            seentHide: false,
        },
        elements: {
            $seentHideButton: null
        },

        /**
         * Initialise seent
         */
        init: function () {
            var sheet = this.createStyleSheet();

            // FP Img
            sheet.insertRule("#imagelist .seent { border-color: #2b2b2b; background: #000000; }");
            sheet.insertRule("#imagelist .seent img { opacity: 0.33; }");
            sheet.insertRule("#imagelist .seent:hover img { opacity: 1; }");

            // FP Icon
            sheet.insertRule("#imagelist .seent:hover .seent-icon { display:none; }");
            sheet.insertRule("#imagelist .seent .seent-icon { display: block; position:absolute; right: 0px; bottom: 0px; width: 34px; height: 34px; background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat; background-position: -250px -184px; }");

            // Sidebar Img
            sheet.insertRule("#side-gallery .nav-image.seent .image-thumb { opacity: 0.33; }");
            sheet.insertRule("#side-gallery .nav-image.seent:hover .image-thumb, #side-gallery .nav-image.seent.selected .image-thumb { opacity: 1; }");

            // Seent hide button
            sheet.insertRule("#content .sort-options #seent-hide span { display: inline-block; width: 25px; height: 25px; image-rendering: optimizeQuality; -ms-interpolation-mode: nearest-neighbor; background: url(http://s.imgur.com/images/site-sprite.png) -256px -186px no-repeat transparent; }");
            sheet.insertRule("#content .sort-options .active { opacity: 0.9; }");

            // Seent daily grouping key
            // timestamp @ start of day
            var now = new Date();
            var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            this.currentKey = startOfDay / 1000;

            // Seent tasks: Prune old, read page, attach display
            this.pruneSeent();
            this.readSeent();
            this.attachGlobalSeent();
            this.attachGallerySeent();
            this.attachInsideGallerySeent();

            // Apply the seent-hide state
            this.toggleSeentHide(this.data.seentHide);
        },

        /**
         * Prune the Seent list and scrap old stuff
         */
        pruneSeent: function () {
            // Check all blocks
            for (var k in this.data.visited) {
                // Remove entries older than a week
                if ((k + this.lifetime) < this.currentKey) {
                    delete this.data.visited[k];
                }
            }
        },

        /**
         * Read page hash and add to seent cache
         */
        readSeent: function () {

            // Not viewing a thing?
            if (!imgur._.hash) {
                return;
            }

            // Create container if not present
            if (this.data.visited[this.currentKey] === undefined) {
                this.data.visited[this.currentKey] = [];
            }

            // Add hash if not exists
            if (this.data.visited[this.currentKey].indexOf(imgur._.hash) == -1) {
                this.data.visited[this.currentKey].push(imgur._.hash);

                // Update local storage
                this.saveData();
            }
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

            // Attach seent toggle to homepage:
            $('#content .sort-options ul').each(function() {

                // Create seent button with click handler
                $seentHideItem = $('<li><a href="javascript:void(0)" id="seent-hide" title="Hide seen images"><span></span></a></li>');
                _this.elements.$seentHideButton = $seentHideItem.find('a');

                // Event: On click seent hide, toggle state
                _this.elements.$seentHideButton.on('click', function() {
                    // Toggle button and execute hide
                    _this.toggleSeentHide();
                });

                // Add to start of Sort Orders list
                $sortOptionsList = $(this);
                $sortOptionsList.prepend($seentHideItem);
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
                if (_this.isVisited($post.attr('id'))) {
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
                if (_this.isVisited(hash)) {
                    $link.addClass('seent');
                }
            });
        },

        /**
         * Has hash been visited ever?
         */
        isVisited: function (hash) {
            for (var k in this.data.visited) {
                if (this.data.visited[k].indexOf(hash) != -1) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Hide or unhide all seent items
         * @param {boolean} forceHidden
         */
        toggleSeentHide: function(forceHidden) {

            // Get state
            $seentListItem = this.elements.$seentHideButton.parent();
            state = (forceHidden !== undefined) ? forceHidden : !$seentListItem.hasClass('active');

            // Apply state
            $seentListItem.toggleClass('active', state);
            $('.seent').toggle(!state);

            // Persist state
            this.data.seentHide = state;
            this.saveData();
        }
    });

    /**
     * Add the module for init
     */
    imgurEnhance.addModule(new ImgurEnhanceSeent());



    /**
     * Initialise registered modules on document ready
     */
    $(function () {
        imgurEnhance.init();
    });

})(window, window.jQuery, window.imgurEnhance);
