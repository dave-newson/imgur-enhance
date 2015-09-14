;(function() {

    // Only include if Mobile
    if (!ImgurEnhance.isMobile()) {
        return;
    }

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

            Imgur.Router.getInstance().header.on('change', _.bind(function() {
                this.executeSeent();
            }, this));

            // !!HACK!! Event: on Remove Loader
            // This is a monkey-patch into removeLoader on the Router
            // as there's no good event to latch onto >:(
            var cleanUp = Imgur.Router._instance.removeLoader;
            var _this = this;
            Imgur.Router._instance.removeLoader = function() {
                // Run original
                cleanUp.apply(this);

                // Run seent, with a 500ms delay because something else
                // around here is delaying things from being ready >:(
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
                ".gallery .GalleryItem.seent .GalleryItem-imageContainer {" +
                "   opacity: 0.4" +
                "}",

                // FP Icon
                ".gallery .GalleryItem.seent .seent-icon {" +
                "   display: block;" +
                "   position:absolute;" +
                "   left: -6px; top: 4px;" +
                "   width: 34px; height: 34px;" +
                "   background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat;" +
                "   background-position: -250px -184px;" +
                "}"
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
                if ($img.length < 1) { return; };

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

})();