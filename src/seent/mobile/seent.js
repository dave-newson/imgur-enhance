;(function() {

    // Only include if Mobile
    if (!ImgurEnhance.isMobile()) {
        return;
    }

    // Observe: GalleryItem
    Destiny.watchAndPatch(window, 'Imgur.View.GalleryItem', {
        render: function render(parent) {
            var content = parent();

            // Apply seen to gallery item
            if (content.model && content.el) {
                ImgurEnhance.Seent.getInstance().attachySeentToGalleryItem(content.el, content.model.id);
            }
            return content;
        }
    });

    // Observe: GalleryInside
    Destiny.watchAndPatch(window, 'Imgur.View.GalleryInside', {
        render: function(parent) {
            var content = parent();

            // Apply seent read
            if (content.model) {
                ImgurEnhance.Seent.getInstance().trackSeent(content.model.id);
            }

            return content;
        }
    });

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
         * Read the hash of the page and store it to Seent
         * @param {string} hash
         */
        trackSeent: function(hash) {

            // Can't do anything without a hash
            if (!hash) {
                return;
            }

            // Persist seent value
            this.data.addSeent(hash);
        },

        /**
         * Modify the main gallery screen (where present)
         * @param {DOMElement} domElement
         */
        attachySeentToGalleryItem: function attachGallerySeent(domElement, hash) {
            var _this = this;
            $element = $(domElement);

            // Attach seen styles on FP
            $element.find('.GalleryItem').not('.seent').each(function () {
                var $post = $(this);
                var $img = $post.find('img');

                // Validate found id tag
                if ($img.length < 1) {
                    return;
                }

                // Check hash
                if (_this.data.hasSeent(hash)) {
                    $post.addClass('seent');
                    $post.append('<span class="seent-icon"></span>');
                }
            });
        }

    };
    Imgur.addSingleton(ImgurEnhance.Seent);

})();