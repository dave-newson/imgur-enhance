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
         * Because not all pages have compatible styles, the fullbleed can appear on top in some cases.
         * This fixes the z-index hand fiddles with the body props to compensate.
         * Also adds "fixed" because I think it looks nice.
         */
        addStyles: function () {
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            this.styleSheet.insertRule('#fullbleed-bg {z-index: -1; position: fixed; top: 0;}', 0);
            this.styleSheet.insertRule('body {z-index: -2; position: relative;}', 1);
        }
    });
    Class.addSingleton(ImgurEnhance.AlwaysBleed);

})();