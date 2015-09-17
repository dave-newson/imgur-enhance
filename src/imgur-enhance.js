// ==UserScript==
// @name         imgur-enhance
// @namespace    http://davenewson.com/
// @version      0.0.3
// @description  Enhance Imgur with some hacked in user features because we're impatient people
// @author       Dave Newson
// @include      *://imgur.com
// @include      *://imgur.com/*
// @include      *://*.imgur.com
// @include      *://*.imgur.com/*
// @exclude      *://imgur.com/ads*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function(window, $) {

    /**
     * ImgurEnhance utilities class
     * @Class ImgurEnhance
     */
    window.ImgurEnhance = {

        modules: [],

        /**
         * Modules list
         */
        getModules: function () {
            return [
                ImgurEnhance.Seent,
                ImgurEnhance.FavouriteFolders,
                ImgurEnhance.AlwaysBleed
            ];
        },

        /**
         * Initialise all modules
         * Not all modules may be available, so let them fail if they want to.
         */
        init: function () {
            var modules = this.getModules();
            for (var k in modules) {

                // Skip anything that doesn't exist.
                if (modules[k] == undefined) {
                    continue;
                }

                // Initialise the module
                this.modules.push(modules[k].getInstance());
            }
        },

        /**
         * Detect mobile
         */
        isMobile: function () {
            return (window.Backbone !== undefined);
        },

        /**
         * Detect desktop
         */
        isDesktop: function () {
            return (window.React !== undefined);
        }
    };

    // Stop TamperMonkey shitting itself on invalid pages
    if ($ === undefined || Namespace === undefined || Imgur === undefined) {
        return;
    }

    /**
     * On page ready: Initialise all modules
     */
    $(function() {
        // Initialise the whole shebang.
        window.ImgurEnhance.init();
    });

})(window, window.jQuery);
