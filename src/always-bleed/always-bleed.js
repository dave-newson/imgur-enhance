;(function() {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * Always Bleed: Ensure the background gradient image is always present
     */
    Namespace('ImgurEnhance.AlwaysBleed');
    ImgurEnhance.AlwaysBleed = Class.extend({

        detectorSelector: '#fullbleed-bg',
        placement: 'body',
        html: '<div id="fullbleed-bg"></div>',
        stylsheet: null,

        /**
         * Engage!
         */
        init: function () {

            this._ = {};

            // No bleed? Make it bleed.
            if ($(this.detectorSelector).length < 1) {
                $(this.placement).prepend(this.html);
            }

            this.addStyles();
        },

        /**
         * Fix z-index issue with the background
         * Without this, it appears on top on certain pages.
         */
        addStyles: function () {
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            this.styleSheet.insertRule('#fullbleed-bg {z-index: -1;}', 0);
        }
    });
    Class.addSingleton(ImgurEnhance.AlwaysBleed);

})();