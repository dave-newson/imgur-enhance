;(function() {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

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
            this.updateSeent();

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
                "#imagelist .seent {" +
                "   border-color: #2b2b2b;" +
                "   background: #000000;" +
                "}",
                "#imagelist .seent-hide {" +
                "   display: none;" +
                "}",
                "#imagelist .seent img {" +
                "   opacity: 0.33;" +
                "}",
                "#imagelist .seent:hover img {" +
                "   opacity: 1;" +
                "}",

                // FP Icon
                "#imagelist .seent:hover .seent-icon {" +
                "   display:none;" +
                "}",
                "#imagelist .seent-icon { " +
                "   display: none;" +
                "   position:absolute;" +
                "   right: 0px; bottom: 0px;" +
                "   width: 34px; height: 34px;" +
                "   background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat;" +
                "   background-position: -250px -184px;" +
                "}",
                "#imagelist .seent .seent-icon {" +
                "   display: block;" +
                "}",

                // Sitebar Img
                "#side-gallery .nav-image.seent .image-thumb {" +
                "   opacity: 0.33;" +
                "}",
                "#side-gallery .nav-image.seent:hover .image-thumb," +
                "#side-gallery .nav-image.seent.selected .image-thumb {" +
                "   opacity: 1;" +
                "}",

                // Seent hide
                "#content .sort-options #seent-hide .icon-seent {" +
                "   display: inline-block;" +
                "   width: 25px; height: 25px;" +
                "   image-rendering: optimizeQuality;" +
                "   -ms-interpolation-mode: nearest-neighbor;" +
                "   background: url(http://s.imgur.com/images/site-sprite.png) -256px -186px no-repeat transparent;" +
                "}",
                "#content .sort-options #seent-hide .icon-block {" +
                "   position: absolute;" +
                "   top: 4px; left: 3px;" +
                "   display: block;" +
                "   width: 20px; height: 20px;" +
                "   image-rendering: optimizeQuality;" +
                "   -ms-interpolation-mode: nearest-neighbor;" +
                "   background: url(http://s.imgur.com/images/site-sprite.png) -290px -216px no-repeat transparent;" +
                "}",
                "#content .sort-options .active {" +
                "   opacity: 0.9;" +
                "}"
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
                $(this).attr('data-seent', true);
                this.updateSeent();
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

                // Create a menu item for the button to sit under
                var $menuItem = $('<li></li>');

                // Add to start of Sort Orders list
                var $sortOptionsList = $(this);
                $sortOptionsList.prepend($menuItem);

                // Add toggle button to menu
                React.render(
                    <ImgurEnhance.Seent.View.SeentToggle mode={_this.data.getSeentHide()} onClick={_this.toggleSeentHide.bind(_this)} />,
                    $menuItem.get(0)
                );

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
            $('.post').not('[data-seent]').each(function () {
                var $post = $(this);

                // Check each date block
                if (_this.data.hasSeent($post.attr('id'))) {
                    $post.attr('data-seent', true);
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
         * Set the mode of the Seent images system
         * @param {int} mode
         */
        toggleSeentHide: function(mode) {

            // Persist state
            this.data.setSeentHide(mode);
            this.updateSeent();
        },

        /**
         * Update seent on page
         */
        updateSeent: function() {
            var mode = this.data.getSeentHide()

            // Get state
            var $seentItems = $('[data-seent]');

            // 0 = disabled
            if (mode == 0) {
                $seentItems.removeClass('seent');
                $seentItems.removeClass('seent-hide');
            }

            // 1 = highlight
            if (mode == 1) {
                $seentItems.addClass('seent');
                $seentItems.removeClass('seent-hide');
            }

            // 2 = hide
            if (mode == 2) {
                // Apply hide
                $seentItems.addClass('seent-hide');
            }
        }

    });
    Class.addSingleton(ImgurEnhance.Seent);

})();