;(function() {

    // Only include if Mobile
    if (!ImgurEnhance.isMobile()) {
        return;
    }

    /**
     * Utility: Mobile LocalStorage implementation
     * Because the Mobile framework is retarded.
     * This /tries/ to make it align with the one from React.
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

})();