// ==UserScript==
// @name         imgur-enhance
// @namespace    http://davenewson.com/
// @version      0.1
// @description  Enhance Imgur with some hacked in user features because we're impatient people
// @author       Dave Newson
// @include      http://imgur.com
// @include      http://imgur.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/**
 * Singleton container for imgurEnhance modules
 * Just makes loading and debugging easier.
 * @type {*|{}}
 */
var imgurEnhance = imgurEnhance || {
    modules: [],

    /**
     * Add a module for document-ready execution
     * @param module
     */
    addModule: function(module) {
        this.modules.push(module);
    },

    /**
     * Initialise all registered modules
     */
    init: function() {
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
    loadData: function() {
        this.data = $.extend(this.data, JSON.parse(localStorage.getItem(this.storageKey)));
    },

    /**
     * Write to local storage
     */
    saveData: function() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    },
};

/**
 * @Class ImgurEnhanceUtilStyleSheet
 * Utility Stylesheet builder helper
 */
ImgurEnhanceUtilStyleSheet = function() {
    // Nothing
}
ImgurEnhanceUtilStyleSheet.prototype = {
    
    /**
     * Create a stylesheet container we can append to
     */
    createStyleSheet: function() {
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
 * Initialise registered modules on document ready
 */
$(function() {
    imgurEnhance.init();
});


/**
 * Imgur Enhance: Seent
 * - Images that have been viewed are dimmed, and an icon is added
 * - Persists history of viewed item hashes for 5 days via localstorage.
 */
;(function($, imgurEnhance) {

    /**
     * Imgur Enhance Seent: Add "seen it" functionality
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
        },

        /**
         * Initialise seent
         */
        init: function() {
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

            // Seent daily grouping key
            // timestamp @ start of day
            var now = new Date();
            var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            this.currentKey = startOfDay / 1000;

            // Seent tasks: Prune old, read page, attach display
            this.pruneSeent();
            this.readSeent();
            this.attachSeent();
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
         * Attach Seent events and features
         */
        attachSeent: function () {

            var _this = this;

            // On Load: Attach seen styles on FP
            $('.post').each(function () {
                var $post = $(this);

                // Check each date block
                if (_this.isVisited($post.attr('id'))) {
                    $post.addClass('seent');
                    $post.append('<span class="seent-icon"></span>');
                }
            });

            // Event: Add seent on click of FP images
            $('.post').on('click', function () {
                $(this).addClass('seent');
            });

            // On Load: Attach seen styles on sidebar nav
            $('#side-gallery .nav-image[data-hash]').each(function () {
                var $link = $(this);
                var hash = $link.attr('data-hash');

                // Check each container
                if (_this.isVisited(hash)) {
                    $link.addClass('seent');
                }
            });

            // Event: Add seent on sidebar click
            $('#side-gallery .nav-image[data-hash]').click(function () {
                $(this).addClass('seent');
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
        }
    });

    /**
     * Add the module for init
     */
    imgurEnhance.addModule(new ImgurEnhanceSeent());

})(jQuery, imgurEnhance);


