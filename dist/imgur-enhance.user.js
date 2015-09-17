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
'use strict';

(function (window, $) {

    /**
     * ImgurEnhance utilities class
     * @Class ImgurEnhance
     */
    window.ImgurEnhance = {

        modules: [],

        /**
         * Modules list
         */
        getModules: function getModules() {
            return [ImgurEnhance.Seent, ImgurEnhance.FavouriteFolders, ImgurEnhance.AlwaysBleed];
        },

        /**
         * Initialise all modules
         * Not all modules may be available, so let them fail if they want to.
         */
        init: function init() {
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
        isMobile: function isMobile() {
            return window.Backbone !== undefined;
        },

        /**
         * Detect desktop
         */
        isDesktop: function isDesktop() {
            return window.React !== undefined;
        }
    };

    // Stop TamperMonkey shitting itself on invalid pages
    if ($ === undefined || Namespace === undefined || Imgur === undefined) {
        return;
    }

    /**
     * On page ready: Initialise all modules
     */
    $(function () {
        // Initialise the whole shebang.
        window.ImgurEnhance.init();
    });
})(window, window.jQuery);

;(function () {

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
        init: function init() {

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
        addStyles: function addStyles() {
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            this.styleSheet.insertRule('#fullbleed-bg {z-index: -1; position: fixed; top: 0;}', 0);
            this.styleSheet.insertRule('body {z-index: -2; position: relative;}', 1);
        }
    });
    Class.addSingleton(ImgurEnhance.AlwaysBleed);
})();
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * Favourite Folders: Because jesus christ.
     * - Adds folder button to sidebar menu
     * - Tramples on the Favourites page
     * - Adds an extra "Favourite Folder" button to GalleryInner, which lets you pick-a-folder!
     * - Uses local storage to persist your folder sets (ew).
     */
    Namespace('ImgurEnhance.FavouriteFolders');
    ImgurEnhance.FavouriteFolders = Class.extend({

        /** @var {CSSStyleSheet} */
        styleSheet: null,

        /** @var {ImgurEnhance.FavouriteFoldersModel} */
        folders: null,

        /** @var {object} Html bits */
        tpl: {
            // Sidebar menu: divider for half-buttons
            menuSplit: '<div class="split"></div>',

            // Sidebar menu: Folder button
            foldersButton: '' + '<div class="textbox half half-second button folders">' + '   <h2>Folders</h2>' + '   <div class="active"></div>' + '</div>',

            // User Nav menu: Folder button
            foldersUserNav: '' + '<li>' + '   <a href="javascript:void(0);">folders</a>' + '</li>',

            // Gallery Inner: Favorite folder button
            galleryFavoriteFolderButton: '' + '<span class="favorite-folder-image btn btn-grey left title" href="javascript:;" title="Add to favorite folder">' + '   <span class="icon-grid"></span>' + '</span>'
        },

        /** @var {object} elements */
        el: {
            $favouritesButton: null,
            $foldersButton: null,
            $foldersUserNav: null,
            $galleryFavoriteFolderButton: null
        },

        /** @var {object} Routing vars */
        routes: {
            folders: {
                url: '^\/user\/(.*)\/favorites\/$',
                fragment: '^#\/folders$',
                controller: function controller() {
                    this.foldersListCtrl();
                },
                getUrl: function getUrl() {
                    var accountUrl = Imgur.getInstance()._.auth.url;
                    return "/user/" + accountUrl + "/favorites/#/folders";
                }
            },
            folderView: {
                url: '^\/user\/(.*)\/favorites\/$',
                fragment: '^#\/folders\/(.*)$',
                controller: function controller() {
                    this.folderViewCtrl();
                },
                getUrl: function getUrl(folderKey) {
                    var accountUrl = Imgur.getInstance()._.auth.url;
                    return "/user/" + accountUrl + "/favorites/#/folders/" + folderKey;
                }
            }
        },

        /** @var {bool} */
        isFoldersRoute: false,

        /**
         * Constructor
         */
        init: function init() {
            this._ = {};

            // Create Folders model for storage
            var storage = new Imgur.Storage.LocalStorage();
            this.folders = new ImgurEnhance.FavouriteFolders.Model.Folders(storage);

            // Crowbar in some CSS
            this.addStyles();

            // Attach the FavoriteFolder instigation button to the UI
            this.attachFavoriteFolderButton();

            // Crowbar in menu items
            this.applyMenuChanges();

            // Execute routing
            this.runRouting();

            // Change the selected menu item if necessary
            this.applyMenuSelection();
        },

        /**
         * Inject stylesheet hacks into DOM
         */
        addStyles: function addStyles() {
            var rules = [

            // Menu panel: Add "half" styles
            // We can get away with fixed widths, because imgur uses them!
            ".panel.menu .half {" + "   width: 128px;" + "   display: inline-block;" + "}", ".panel.menu .half.half-first {" + "   margin-right: 0px;" + "}", ".panel.menu .half.half-first .split {" + "   border-bottom: 18px solid transparent; " + "   border-right: 14px solid #2b2b2b; " + "   border-top: 18px solid transparent; " + "   width: 0px; height: 0;" + "   position: absolute; " + "   top: 0; right: -1px;" + "}", ".panel.menu .half.half-second .active {" + "   display: block;" + "}",

            // Gallery-inner button style
            '.favorite-folder-image {' + '   padding: 10px 12px 6px;' + '   margin-top: 1px;' + '   font-size: 1.1em;' + '}',

            // Styles for the folders index
            // Because the Favorites gallery uses an ID to root the styles >:(
            '.folder-list .thumbs {' + '   line-height: 0;' + '}',
            // "link". Would be an anchor if this wasn't a hack.
            '.folder-list .thumbs .folder {' + '   position: relative;' + '   float: left;' + '   margin: 4px 3px 4px 4px;' + '   width: 134px;' + '   height: 134px;' + '   border: 3px solid #444442;' + // 2?
            '}', '.folder-list .thumbs .folder:hover {' + '   cursor: pointer;' + '   border-color: #c29f37;' + '}',
            // Fix image width creep
            '.folder-list .thumbs .folder img {' + '   float: left;' + '   width: 67px; height: 67px;' + '}',

            // Folder label. Gradient over folder image
            //
            '.folder-list .thumbs .folder .folder-info {' + '   position: absolute;' + '   left: 0px; bottom:0px;' + '   width: 100%; height: 70px;' + '   background: 0 0;' + '   background: linear-gradient(to bottom,transparent,#000);' + "   filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#000000', GradientType=0);" + "}", '.folder-list .thumbs .folder .folder-info .title {' + '   position: absolute;' + '   bottom: 0px;' + '   width: 100%;' + '   text-align: center;' + '   line-height: 31px;' + '   overflow: hidden;' + '}',

            // Missing image "Imgur" logo
            '.folder-list .thumbs .folder .missing {' + '   position: absolute;' + '   left: 28px; top: 46px;' + '   width: 88px; height: 40px;' + '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' + '   background-position: 0px -246px;' + '}',

            // Modal: Nudge the title
            '.imgur-enhance-ff-colorbox #cboxTitle {' + '   padding-left: 0.5em;' + '}',

            // "Add Folder" icon
            '.folder-list .thumbs .folder.folder-add .icon-add {' + '   position: absolute;' + '   left: 57px; top: 57px;' + '   width: 22px; height: 22px;' + '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' + '   background-position: -282px -32px;' + '}', '.thumbs a {' + '   position: relative;' + '}',

            // "Delete Image" icon
            '.thumbs a .icon-remove {' + '   position: absolute;' + '   right: 10px; bottom: 10px;' + '   width: 20px; height: 20px;' + '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' + '   background-position: -110px -80px;' + '}',

            // "Add Folder" input field for name
            '.folder-list .folder-add input {' + '   border: 1px solid #665d32;' + '   border-radius: 2px;' + '   background: #000;' + '   color: #fff;' + '   padding: 4px;' + '   line-height: 1.2em;' + '   position: absolute;' + '   bottom: 2px; left: 2px;' + '   width: 130px;' + '   margin: 0' + '}',

            // "Add Folder" background image override
            '.folder-list .folder.folder-add img {' + '   width: 100%; height: 100%;' + '   position: inline;' + '   float: none;' + '}',

            // Folder title edit
            '.folder-title-edit {' + '   background: #000;' + '   color: #fff;' + '   border: 1px solid #665d32;' + '   font-size: inherit;' + '   font-weight: inherit;' + '}'];

            // Add all rules
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            for (var k in rules) {
                this.styleSheet.insertRule(rules[k], k);
            }
        },

        /**
         * Apply additional menu items to the page
         * This is just HTML hacks to add menu bits and bobs.
         */
        applyMenuChanges: function applyMenuChanges() {

            // Find favourites button
            this.el.$favouritesButton = $('.panel.menu .textbox.button.likes');
            // Half-ify the button
            this.el.$favouritesButton.addClass('half').addClass('half-first');
            this.el.$favouritesButton.append(this.tpl.menuSplit);
            // Fix the text to just "Favorites"
            this.el.$favouritesButton.find('h2').text('Favorites');
            // Append additional "Folders" button
            this.el.$foldersButton = $(this.tpl.foldersButton);
            this.el.$foldersButton.insertBefore(this.el.$favouritesButton.next());

            // Crowbar secondary nav position
            // Find the nav pos for Favourites
            var $userNav = $('#secondary-nav .user-nav .account .user-dropdown');
            var $userNavFavourites = $userNav.find(':contains("favorites")').parent('li');
            // Jam in a new item after "Favorites".
            this.el.$foldersUserNav = $(this.tpl.foldersUserNav);
            $userNavFavourites.after(this.el.$foldersUserNav);

            // Event: On click of either "folders" link
            var $links = $().add(this.el.$foldersUserNav).add(this.el.$foldersButton);
            $($links).on('click', _.bind(function (e) {
                e.preventDefault();

                // Build and change page!
                var accountUrl = Imgur.getInstance()._.auth.url;
                window.location = "/user/" + accountUrl + "/favorites/#/folders";

                // Check if the new URL is the same as the old URL.
                // If it is, we need to reload the page.
                // Without this, going from Favourites to Folders (same page) doesn't cause a reload.
                var targetRegex = new RegExp(this.routes.folders.url);
                if (targetRegex.test(window.location.pathname)) {
                    window.location.reload();
                }
            }, this));

            // Tweak Favourites header if on Favorites page
            $('#likes .panel-header h2').each(function () {
                $(this).text('Favorites');
            });
        },

        /**
         * Apply menu selection changes
         */
        applyMenuSelection: function applyMenuSelection() {
            // Correct menu highlights if we're viewing folders
            if (this.isFoldersRoute) {

                // Menu Sidebar
                var $panelButtons = $('.panel.menu .textbox.button');
                $panelButtons.removeClass('selected');
                this.el.$foldersButton.addClass('selected');

                // User Nav menu
                var $navMenuItems = $('#secondary-nav .user-nav .account .user-dropdown li a');
                $navMenuItems.removeClass('active');
                this.el.$foldersUserNav.find('a').addClass('active');
            }
        },

        /**
         * !!HACK Remove the favourite folders UI
         * This is pretty violent and shonkey.
         */
        removeFavoritesUi: function removeFavoritesUi() {
            // Disable infinite scroll
            Imgur.InfiniteScroll.getInstance().stopInfiniteScroll();

            // Clear existing view using nothing but brute force
            $('#content .left .panel').children().remove();
        },

        /**
         * Display the favourite folders UI
         * This is a react component. Neat!
         */
        displayFavouriteFoldersListUi: function displayFavouriteFoldersListUi() {
            var $container = $('#content .left .panel');
            React.render(React.createElement(ImgurEnhance.FavouriteFolders.View.FolderList, { folders: this.folders }), $container.get(0));
        },

        /**
         * Display a single favourite folder
         * @param {string} folderKey
         */
        displayFavouriteFolderViewUi: function displayFavouriteFolderViewUi(folderKey) {
            var $container = $('#content .left .panel');
            React.render(React.createElement(ImgurEnhance.FavouriteFolders.View.FolderView, { folders: this.folders, folderKey: folderKey }), $container.get(0));
        },

        /**
         * On Gallery pages, attach the FavoriteFolder button
         */
        attachFavoriteFolderButton: function attachFavoriteFolderButton() {

            // Find favourite button
            var $target = $('.favorite-image.btn');

            // Abort if button not found
            if (!$target.length) {
                return;
            }

            // Append the new button
            this.el.$galleryFavoriteFolderButton = $(this.tpl.galleryFavoriteFolderButton);
            this.el.$galleryFavoriteFolderButton.insertAfter($target);

            // Event: On click favourite button
            // Show the additional modal UI for add-to-folder
            this.el.$galleryFavoriteFolderButton.on('click', _.bind(function (event) {

                // If the favorite button hasn't been clicked, click it.
                if (!$target.hasClass('favorited')) {
                    $target.trigger('click');
                }

                // Get the hash.
                // Do nothing if doesn't exist (system failure).
                try {
                    var image = Imgur.Gallery.getInstance().imgurInsideNav.getImage();
                    var hash = image.hash;
                    var thumb = image.album_cover ? image.album_cover : image.hash;
                } catch (e) {}

                // Display modal
                // Note: short keys, because space is at a premium in localStorage
                this.showAddToFavouritesFolderModal({
                    h: hash,
                    t: thumb
                });
            }, this));

            // Apply tipsy
            this.el.$galleryFavoriteFolderButton.tipsy({
                gravity: "s",
                opacity: 1
            });
        },

        /**
         * Display the add-to-favourites modal window
         * @param {object} img
         */
        showAddToFavouritesFolderModal: function showAddToFavouritesFolderModal(img) {
            // Display the thing in a colorbox modal
            var modal = $.colorbox({
                href: '',
                title: 'Add favorite to folder',
                open: true,
                width: "610px",
                height: "492px",
                inline: true,
                top: "15%",
                className: "imgur-enhance-ff-colorbox",
                transition: "none",
                scrolling: true
            });

            // Initialise component under the container
            React.render(React.createElement(ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal, { folders: this.folders, img: img, closeModal: modal.colorbox.close }), $('.imgur-enhance-ff-colorbox #cboxLoadedContent').get(0));
        },

        /**
         * Router
         * - Determine which route, if any, is running
         */
        runRouting: function runRouting() {

            var imgur = Imgur.getInstance();
            var currentUrl = imgur._.url;
            var currentFragment = window.location.hash;

            // Check each route
            for (var k in this.routes) {

                // Get the route
                var route = this.routes[k];

                // Construct regexes
                var urlRegex = new RegExp(route.url);
                var fragmentRegex = new RegExp(route.fragment);

                // Desired URL?
                if (urlRegex.test(currentUrl) && fragmentRegex.test(currentFragment)) {

                    // Ensure route is recognised
                    this.isFoldersRoute = true;

                    // Execute controller
                    route.controller.apply(this);
                    break;
                }
            }

            // It's OK to not match any route.
        },

        /**
         * Controller: List Folders
         */
        foldersListCtrl: function foldersListCtrl() {
            // Hack: Remove the Favourites page UI
            this.removeFavoritesUi();

            // Display the Folders UI
            this.displayFavouriteFoldersListUi();
        },

        /**
         * Controller: View Folder
         */
        folderViewCtrl: function folderViewCtrl() {
            // Hack: Remove the Favourites page UI
            this.removeFavoritesUi();

            // get the folderKey from the fragment using router
            // yes yes, if the router was a real router it would pass this to us.
            var regex = new RegExp(this.routes.folderView.fragment);

            // get folder key
            var folderKey = regex.exec(window.location.hash)[1];

            // Display the Folders UI
            this.displayFavouriteFolderViewUi(folderKey);
        }

    });
    Class.addSingleton(ImgurEnhance.FavouriteFolders);
})();
/**
 * Seent Model
 * Data container for local storage persistence
 * @Class ImgurEnhance.SeentModel
 */
Namespace('ImgurEnhance.SeentModel');
ImgurEnhance.SeentModel = function (a) {
    this.init(a);
};
ImgurEnhance.SeentModel.prototype = {

    /**
     * LocalStorage
     */
    storage: null,
    storageKey: null,

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
    init: function init(storage) {

        // Setup storage key
        this.storageKey = ImgurEnhance.Storage.getStorageKey('Seent', false);

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
    addSeent: function addSeent(hash) {

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
    hasSeent: function hasSeent(hash) {

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
    pruneHashes: function pruneHashes() {
        // Check all groups using their key
        for (var k in this.data.visited) {
            // Remove entries older than the lifetime
            if (k + this.lifetime < this.currentKey) {
                delete this.data.visited[k];
            }
        }
    },

    /**
     * Set the "SeentHide" state
     * @param {boolean} state
     */
    setSeentHide: function setSeentHide(state) {
        this.data.seentHide = state;

        // Update local storage
        this.storage.save(this.storageKey, this.data);
    },

    /**
     * Get the "SeentHide" state
     * @return {boolean}
     */
    getSeentHide: function getSeentHide() {
        return this.data.seentHide;
    }
};

(function (window) {

    /**
     * Destiny is a monkey-patch mechanism for yet-to-be-loaded variables.
     * You can monitor a target object for changes, and Destiny will monkey-patch directly on-top of it.
     * If the monitoring target is already defined, it will get patched immediately.
     * It's magic! It's crazy! It's probably a massive liability full of bugs!
     *
     * Usage example:
     *  MyAppPatch = { // ... };
     *  Destiny.watchAndPatch(window, 'MyApp.SomeClass.Hello', MyAppPatch);
     *
     * When MyApp.SomeClass.Hello gets defined on the window (global scope), the MyAppPatch object will be
     * monkey-patched on top.
     *
     * Function quirks:
     *  When you use a monkey-patched function with Destiny, the original parent function will be passed
     *  to your override function, allowing you to modify arguments or execute it when you want to.
     *
     * Function example:
     *  MyApp.someFunc = function(name) { alert(name); };
     *  MyAppPatch.someFunc = function(parent, name) { console.log(name); parent(name); };
     *  MyApp.someFunc('jeff'); // Logs 'jeff' to the console, then opens an alert window.
     *
     * Class quirks:
     *  When you point Destiny at a variable which becomes populated by a class, it will automatically
     *  monkey patch the prototype elements of that class.
     *  Currently you can't monkey-patch constructors of classes.
     *  This is because prototypes cannot be replaced with setters, so we can't watch them.
     *
     * Class Example:
     *  MyNamespace.MyApp = function() { }
     *  MyNamespace.MyApp.prototype = {a:1, b:2}
     *  Destiny.watchAndPatch(window, 'MyNamespace.MyApp', {c: 3});
     *  // MyNamespace.MyApp.prototype = {a:1, b:2, c:3}
     *
     * Write your own fate, rather than being stuck with what you're given.
     *
     * @Class Destiny
     * @constructor
     */
    var Destiny = {

        /**
         * watchAndPatch is used to register an object you want to monkey-patch.
         * When the object is written to the expected {observable}.{property}, the {patch} object will be
         * monkey-patched on top of it.
         *
         * @param {object} observable
         * @param {string} property
         * @param {object} patchObject
         * @return {object}
         */
        watchAndPatch: function watchAndPatch(observable, property, patchObject) {

            // Split props to array
            var propList = this.propToArray(property);
            var initProp = propList[0];

            // Make the new interceptor
            var interceptor = new Destiny.ObjectPropertyInterceptor(null, observable, initProp);

            // Attach handler
            var _this = this;
            interceptor.addHandler(propList, function (targetObject) {
                return _this.patchObject.apply(_this, [targetObject, patchObject]);
            });

            // Apply with full settings
            interceptor.apply();
        },

        /**
         * Monkey-patch the targetObject with properties of the patchObject
         * This is totally hairy.
         *
         * @param {object} targetObject
         * @param {object} patchObject
         * @return {object}
         */
        patchObject: function patchObject(targetObject, _patchObject) {

            // We don't want to patch when the namespace is declared,
            // rather we want to do it when the object properties are defined.
            // Abort if Object.keys.length < 1
            if (Object.keys(targetObject).length < 1) {
                return targetObject;
            }

            // We don't want to apply > once.
            // If a class property gets defined twice we might be SOL with this constraint.
            if (targetObject._destinyPatched) {
                return targetObject;
            }

            // Annoying quirk notice!
            // We can't override the constant prop "prototype"
            // So if the target of the patch is a class, we step into the prototype and work on that
            // Note: This means you can't monkey-patch the constructor!
            // Note: You must refer to the Class constructor, NOT the class prototype to edit prototypes.
            // TODO: This above is super hairy and super dodgy and not at all intuitive.
            var targetRef = targetObject;
            if (typeof targetObject == "function") {
                targetRef = targetObject.prototype;
            }

            // Get keys
            var targetKeys = Object.keys(targetRef);
            var patchKeys = Object.keys(_patchObject);
            var keys = targetKeys.concat(patchKeys);

            // Unique keys
            keys = this.unique(keys);

            // Break all of the things!
            // WARNING: NOT a recursive object merge! Supports light patching only!
            for (var k in keys) {

                // Get key
                var key = keys[k];

                // Patch from patchObject
                if (_patchObject.hasOwnProperty(key)) {

                    // Monkey-patch or add?
                    if (targetRef.hasOwnProperty(key)) {
                        this.patchProp(key, targetRef, _patchObject);
                    } else {
                        this.addProp(key, targetRef, _patchObject);
                    }
                }
            }

            // Mark as patched so we don't stand on our own dicks.
            targetObject._destinyPatched = true;

            // Return the changed target.
            return targetObject;
        },

        /**
         * Monkey-patch a single property with another property
         * Note: A patched function will be passed the parent function ref as the first argument.
         * eg. myFunc(a, b) becomes myFunc(parent, a, b).
         * The Parent func can be called at any time and will have the appropriate scope.
         *
         * @param {string} propName
         * @param {object} objectTarget
         * @param {object} objectPatch
         */
        patchProp: function patchProp(propName, objectTarget, objectPatch) {
            if (typeof objectTarget[propName] != 'function') {
                // Extend to patch non-functions
                // WARNING: Relies on jQuery being loaded by now.
                objectTarget[propName] = $.extend(objectTarget[propName], objectPatch[propName]);
            } else {

                // Store the parent function ref
                var srcFunc = objectTarget[propName];

                // Replace the function in the target
                objectTarget[propName] = function () {

                    // Preserve scope
                    var _this = this;

                    // Create parent function that's callable
                    var parentFunc = function parentFunc() {
                        return srcFunc.apply(_this, arguments);
                    };

                    // Prepend the arguments list with Parent callable
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift(parentFunc);

                    // Execute the patch function
                    return objectPatch[propName].apply(_this, args);
                };
            }
        },

        /**
         * Add the specified prop to the object, rather than monkey-patching
         *
         * @param {string} propName
         * @param {object} objectTarget
         * @param {object} objectPatch
         */
        addProp: function addProp(propName, objectTarget, objectPatch) {
            objectTarget[propName] = objectPatch[propName];
        },

        /**
         * Split the dot-dlimited property list to an array
         * @param {string} prop
         * @returns {string[]|Array}
         */
        propToArray: function splitProp(prop) {
            return prop.split('.');
        },

        /**
         * Make array members unique
         *
         * @param {Array} a
         * @returns {Array}
         */
        unique: function unique(a) {
            return a.reduce(function (p, c) {
                if (p.indexOf(c) < 0) p.push(c);
                return p;
            }, []);
        }
    };

    /**
     * @Class Destiny.ObjectPropertyInterceptor
     * Used to intercept getter/setter calls and create a tree of getter/settes that can run registered handlers.
     * A necessary evil because objects keep insisting on moving about and being overwritten.
     *
     * @param {Destiny.ObjectPropertyInterceptor|null} parent
     * @param {Object} propertyObject
     * @param {string} propertyName
     * @constructor
     */
    Destiny.ObjectPropertyInterceptor = function (parent, propertyObject, propertyName) {

        // Set object props
        this.parent = parent;
        this.propertyObject = propertyObject;
        this.propertyName = propertyName;
        this.value = this.propertyObject[propertyName];
        this.handlers = [];
    };
    Destiny.ObjectPropertyInterceptor.prototype = {

        parent: null, // Parent setter in the chain
        propertyObject: null, // Object this prop belongs to
        propertyName: null, // Name of the property this is acting on
        value: null, // Value this property stores
        handlers: [], // Handlers applied directly to this object, to observe

        /**
         * Initialise this interceptor on the object
         */
        apply: function apply() {

            // Don't re-link something that already been linked.
            if (this.propertyObject.hasOwnProperty('__opi') && this.propertyObject.__opi.hasOwnProperty(this.propertyName)) {
                return;
            }

            // delete existing and take its place.
            if (delete this.propertyObject[this.propertyName]) {

                Object.defineProperty(this.propertyObject, this.propertyName, {
                    get: this.getter.bind(this),
                    set: this.setter.bind(this),
                    enumerable: true,
                    configurable: true
                });

                // Apply destiny
                this.propertyObject.__opi = this;

                // Use setter to re-apply the value.
                // This should cause any props on the child object to get applied
                if (this.value !== undefined) {
                    this.propertyObject[this.propertyName] = this.value;
                }
            }
        },

        /**
         * Get the value
         * @return {*}
         */
        getter: function getter() {
            return this.value;
        },

        /**
         * Set the value
         * @param {*} newValue
         */
        setter: function setter(newValue) {

            // Run any handlers
            this.value = this.executeHandlers(newValue);

            // Return the result
            return this.value;
        },

        /**
         * Add a handler
         *
         * @param {Array} pathArray
         * @param {function} handler
         */
        addHandler: function addHandler(pathArray, handler) {
            this.handlers.push({
                path: pathArray,
                handler: handler
            });
        },

        /**
         * Execute handlers to occur during setter
         * Set up any setters on the child that are needed
         *
         * @param {*} value
         */
        executeHandlers: function executeHandlers(value) {

            // Get all handles that apply to this object
            var handlers = this.requestWatchTargets([]);

            // Initialise additional setters in the tree, recursively
            // If the length > 0, then we're in the tree, but we're not the target.
            for (var h in handlers) {
                if (handlers[h].path.length > 0) {
                    this.applyPropertyInterceptorToChild(value, handlers);
                    break;
                }
            }

            // For each handler, if there's no more path, you're supposed to run here.
            for (var i in handlers) {
                if (handlers[i].path.length == 0) {
                    value = handlers[i].handler(value);
                }
            }

            return value;
        },

        /**
         * Called by children (or self) to get the watch target for a property
         *
         * @param childPropArray
         */
        requestWatchTargets: function requestWatchTargets(childPropArray) {

            // Add self to list
            childPropArray.unshift(this.propertyName);

            // List of handles to return
            var handlers = [];

            // Continue up the tree
            if (this.parent != null) {
                handlers = this.parent.requestWatchTargets(childPropArray);
            }

            // Add any handles at this level pointing to the property structure
            if (this.handlers.length) {
                for (var i in this.handlers) {

                    var trimPath = this.handlers[i].path.slice();
                    trimPath.splice(childPropArray.length);

                    // !!HACK shortcut comparison because no libs
                    // Might cause mismatch fun
                    // @link http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
                    if (trimPath.toString() == childPropArray.toString()) {
                        handlers.push({
                            path: this.handlers[i].path.slice(),
                            handler: this.handlers[i].handler
                        });
                    }
                }
            }

            // For every handle which passed up the tree, strip an element
            for (var j in handlers) {
                // Splice the first item off
                var propName = handlers[j].path.splice(0, 1);

                // Throw a wobbler if the path doesn't match
                if (propName[0] != this.propertyName) {
                    throw new Error('Bad property. Expected "' + this.propertyName + '" received "' + propName + '".');
                }
            }

            return handlers;
        },

        /**
         * Apply a property interceptor to [childObject] using paths found in [handlers]
         *
         * @param {object} childObject
         * @param {array} handlers
         */
        applyPropertyInterceptorToChild: function applyPropertyInterceptorToChild(childObject, handlers) {
            // Validate: usable type
            if (typeof childObject != 'object' && typeof childObject.prototype != 'object') {
                throw new Error('Variable considered for InterceptorProperty is of incompatible type ' + typeof childObject);
            }

            // Get list of handlers (unique)
            var props = {};
            for (var h in handlers) {
                props[handlers[h].path[0]] = true;
            }

            // Instantiate on unique properties
            for (var prop in props) {

                // re-link parent if OPI already exists
                // Or walk into child prop
                if (childObject.hasOwnProperty('__opi') && childObject.__opi[prop] !== undefined) {
                    childObject.__opi[prop].relinkParent(this);
                } else {
                    var interceptor = new Destiny.ObjectPropertyInterceptor(this, childObject, prop);
                    interceptor.apply();
                }
            }
        },

        /**
         * Relink the upstream parent relationship.
         *
         * @param parent
         */
        relinkParent: function relinkParent(parent) {
            this.parent = parent;
        }

    };

    // Make Destiny globally available.
    window.Destiny = Destiny;
})(window);

/**
 * Utility: Storage helper
 * @Class ImgurEnhance.Storage
 */
Namespace('ImgurEnhance.Storage');
ImgurEnhance.Storage = {

    rootKey: 'ImgurEnhance',

    /**
     * Create a storage key using the given key.
     * If isShared is true, the account ID will be prepended.
     * If isShared is false, but the user isn't logged in, shared target will still be used.
     *
     * @param {string} key
     * @param {bool} isShared
     * @return {string}
     */
    getStorageKey: function getStorageKey(key, isShared) {

        var accountKey = '-1';

        // Try and get the account key when not shared storage
        if (!isShared) {

            // Desktop method
            if (Imgur.getInstance) {
                // Account might not be set. Try and find it.
                var imgur = Imgur.getInstance();
                if (imgur) {
                    var auth = imgur._.auth;
                    if (auth && auth.id) {
                        accountKey = auth.id;
                    }
                }
            }

            // Mobile method
            if (Imgur.Model) {
                if (Imgur.Model.Account) {
                    if (Imgur.Model.Account.getInstance) {
                        var account = Imgur.Model.Account.getInstance();
                        if (account.id) {
                            accountKey = account.id;
                        }
                    }
                }
            }
        }

        // Structure!
        return [this.rootKey, key, accountKey].join('.');
    }
};

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
    create: function create() {
        // Create the <style> tag
        var style = document.createElement("style");

        // WebKit hack :(
        style.appendChild(document.createTextNode(""));

        // Add the <style> element to the page
        document.head.appendChild(style);
        return style.sheet;
    }
};
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * Favourite Folders (model) Folder
     * Data container for local storage persistence
     * @Class ImgurEnhance.FavouriteFolders.Model.Folders
     */
    Namespace('ImgurEnhance.FavouriteFolders.Model.Folders');
    ImgurEnhance.FavouriteFolders.Model.Folders = function (a) {
        this.init(a);
    };
    ImgurEnhance.FavouriteFolders.Model.Folders.prototype = {

        /**
         * LocalStorage
         */
        storage: null,
        storageKey: null,

        /**
         * @var {object} data container
         */
        data: {
            folders: []
        },

        /**
         * Constructor
         */
        init: function init(storage) {

            // Setup storage key
            this.storageKey = ImgurEnhance.Storage.getStorageKey('FavouriteFolders', false);

            // Load local storage
            this.storage = storage;
            this.data = $.extend(this.data, this.storage.get(this.storageKey));
        },

        /**
         * Add an image to a folder
         * @param {object} img
         * @param {string} folderKey
         */
        addFavouriteToFolder: function addFavouriteToFolder(img, folderKey) {

            // Validate the folder exists.
            var folder = this.data.folders[folderKey];
            if (folder === undefined) {
                return;
            }

            // Don't re-add if already present
            if (_.findIndex(folder.images, { h: img.h }) >= 0) {
                return;
            }

            folder.images.push(img);

            // Save changes
            this.save();
        },

        /**
         * Remove a favorite from this specific folder
         * @param {object} img
         * @param {string} folderKey
         */
        removeFavouriteFromFolder: function removeFavouriteFromFolder(img, folderKey) {

            // Validate the folder exists.
            var folder = this.data.folders[folderKey];
            if (folder === undefined) {
                return;
            }

            // Remove item if it's in the folder
            var index = _.findIndex(folder, { h: img.h });
            if (index > -1) {
                folder.images.splice(index, 1);
            }

            // Save changes
            this.save();
        },

        /**
         * Add a folder
         * @param {object} folder
         * @return {int} New folder key
         */
        addFolder: function addFolder(folder) {

            // Folder template
            var folderTpl = {
                name: 'New Folder',
                images: []
            };

            // Add folder and save
            var key = this.data.folders.push($.extend(folderTpl, folder));
            this.storage.save(this.storageKey, this.data);

            // Return the new index (length - 1)
            return key - 1;
        },

        /**
         * Get all folders
         * @return {Array}
         */
        getFolders: function getFolders() {
            return this.data.folders;
        },

        /**
         * Get a specific folder
         * @param {int} folderKey
         */
        getFolder: function getFolder(folderKey) {
            return this.data.folders[folderKey];
        },

        /**
         * Remove a folder
         * @param {int} folderKey
         */
        removeFolder: function removeFolder(folderKey) {

            // Locate and remove folder
            var folder = this.data.folders[folderKey];
            if (folder !== undefined) {
                this.data.folders.splice(folderKey, 1);
            }

            // Save changes
            this.save();
        },

        /**
         * Save changes
         */
        save: function save() {
            this.storage.save(this.storageKey, this.data);
        }
    };
})();
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * FavouriteFolder View AddToFavouriteFolderModal
     * HTML View for add-to-folder
     */
    Namespace('ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal');
    ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal = React.createClass({
        displayName: "AddToFavouriteFolderModal",
        propTypes: {
            folders: React.PropTypes.object.isRequired,
            img: React.PropTypes.object.isRequired,
            closeModel: React.PropTypes.func.isRequired
        },

        /**
         * Initial state
         * @returns {object}
         */
        getInitialState: function getInitialState() {
            return {
                addFolder: false
            };
        },

        /**
         * On click of a folder
         * - add the hash to the folder
         * - close the modal
         * @param {int} folderKey
         */
        onFolderClick: function onFolderClick(folderKey) {

            // Add favourite
            this.props.folders.addFavouriteToFolder(this.props.img, folderKey);

            // Close this modal
            this.closeModal();
        },

        /**
         * Get the view URL of an image
         * @param img
         */
        getImageUrl: function getImageUrl(img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * On click folder add
         */
        toggleAddFolder: function toggleAddFolder() {

            // Toggle the add-folder state
            this.setState({
                addFolder: true
            });
        },

        /**
         * Create the folder
         */
        createFolder: function createFolder(event) {

            // Detect [enter] key
            if (event.keyCode != 13) {
                return;
            }

            // Create the folder
            var folderKey = this.props.folders.addFolder({
                name: $(event.currentTarget).val(),
                images: []
            });

            // Add the image
            this.props.folders.addFavouriteToFolder(this.props.img, folderKey);

            // Close modal
            this.closeModal();
        },

        /**
         * Close the modal
         */
        closeModal: function closeModal() {
            this.props.closeModal();
        },

        /**
         * Render the modal view
         */
        render: function render() {

            var _this = this;
            var addFolder = [];
            if (this.state.addFolder) {
                // AddFolder mode or SelectFolder mode?
                // Show folder info on image
                addFolder.push(React.createElement('img', { src: this.getImageUrl(this.props.img) }));
                addFolder.push(React.createElement(
                    'div',
                    { className: 'folder-info' },
                    React.createElement('input', { className: '', type: 'text', onKeyUp: this.createFolder })
                ));
            } else {
                addFolder.push(React.createElement('div', { className: 'icon-add' }));
            }

            // Show folders index
            return React.createElement(
                'div',
                { id: 'imgur-enhance-ff', className: 'folder-list' },
                React.createElement(
                    'div',
                    { className: 'thumbs' },
                    this.props.folders.getFolders().map(function (folder, index) {
                        return React.createElement(ImgurEnhance.FavouriteFolders.View.Folder, {
                            id: index,
                            folder: folder,
                            onClick: _this.onFolderClick.bind(_this, index) });
                    }),
                    React.createElement(
                        'div',
                        { className: 'folder folder-add', onClick: this.toggleAddFolder },
                        addFolder
                    ),
                    React.createElement('div', { className: 'clear' })
                )
            );
        },

        /**
         * On update re-render
         */
        componentDidUpdate: function componentDidUpdate() {
            var $el = $(this.getDOMNode());

            // Grab focus on the input field
            $el.find('.folder-info input').focus();
        }
    });
})();
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * FavouriteFolders View FolderList
     * HTML View for the folder list. Basically like a gallery.
     */
    Namespace('ImgurEnhance.FavouriteFolders.View.FolderList');
    ImgurEnhance.FavouriteFolders.View.FolderList = React.createClass({
        displayName: "FolderList",
        propTypes: {
            folders: React.PropTypes.object.isRequired
        },

        /**
         * Initial state
         * @returns {object}
         */
        getInitialState: function getInitialState() {
            return {};
        },

        /**
         * On click of a folder, open the folder.
         * @param {int} folderKey
         */
        onFolderClick: function onFolderClick(folderKey) {
            // TODO: My kingdom for a router
            var accountUrl = Imgur.getInstance()._.auth.url;
            window.location = "/user/" + accountUrl + "/favorites/#/folders/" + folderKey;

            // Can guarantee we're on the favourites page
            // So a force refresh is needed to force the re-route
            window.location.reload();
        },

        /**
         * Get the view URL of an image
         * @param {object} img
         */
        getImageUrl: function getImageUrl(img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * Render the initial view
         */
        render: function render() {
            var _this = this;
            return React.createElement(
                'div',
                { id: 'folders', className: 'folder-list' },
                React.createElement(
                    'div',
                    { className: 'panel-header textbox' },
                    React.createElement(
                        'h2',
                        null,
                        'Favorites by folder'
                    ),
                    React.createElement('div', { className: 'clear' })
                ),
                React.createElement(
                    'div',
                    { className: 'thumbs' },

                    // Each folder
                    this.props.folders.getFolders().map(function (folder, index) {
                        return React.createElement(ImgurEnhance.FavouriteFolders.View.Folder, {
                            id: index,
                            folder: folder,
                            onClick: _this.onFolderClick.bind(_this, index) });
                    }),
                    React.createElement('div', { className: 'clear' })
                )
            );
        },

        /**
         * On successful mount
         * - Add tipsy
         */
        componentDidMount: function componentDidMount() {
            var $el = $(this.getDOMNode());

            // Initialise tipsy on folders
            // for tooltip folder names
            $el.find('.folder').tipsy();
        }
    });
})();
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * FavouriteFolders View FolderView
     * HTML View for a specific folder. Gallery view.
     */
    Namespace('ImgurEnhance.FavouriteFolders.View.FolderView');
    ImgurEnhance.FavouriteFolders.View.FolderView = React.createClass({
        displayName: "FolderView",
        propTypes: {
            folderKey: React.PropTypes.string.isRequired,
            folders: React.PropTypes.object.isRequired
        },

        /**
         * Initial state
         * @returns {object}
         */
        getInitialState: function getInitialState() {
            var folder = this.props.folders.getFolder(this.props.folderKey);
            return {
                folderEdit: false,
                imageCount: 0,
                folderName: folder.name,
                folder: folder
            };
        },

        /**
         * Get the view URL of an image
         * @param {object} img
         */
        getImageUrl: function getImageUrl(img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * Get the Link URL to a Favourite Image page
         * @param {object} img
         */
        getFavouriteImagePageUrl: function getFavouriteImagePageUrl(img) {
            var auth = Imgur.getInstance()._.auth;
            return '//imgur.com/user/' + auth.url + '/favorites/' + img.h;
        },

        /**
         * On click of EditFolder button
         * - Switch to Edit mode
         */
        onEditFolder: function onEditFolder() {
            this.setState({
                folderEdit: !this.state.folderEdit
            });
        },

        /**
         * Event: User clicked delete folder
         * - Confirm before deletion
         */
        onDeleteFolder: function onDeleteFolder() {
            if (confirm('Are you sure you want to delete this folder?')) {
                this.deleteFolder();
            }
        },

        /**
         * Delete the given folder
         */
        deleteFolder: function deleteFolder() {
            this.props.folders.removeFolder(this.props.folderKey);
            // TODO: Yeah, a router would be useful right about now.

            // Build URL and redirect to folder index
            var accountUrl = Imgur.getInstance()._.auth.url;
            window.location = "/user/" + accountUrl + "/favorites/#/folders";

            // Can garentee we're on the same favourites page
            // So a force refresh is needed to bump the re-routing.
            window.location.reload(true);
        },

        /**
         * Rename the folder
         * @param {object} event
         */
        onChangeFolderName: function onChangeFolderName(event) {

            // Get the value
            var newName = event.target.value;

            // Persist
            this.state.folder.name = newName;
            this.props.folders.save();

            // Update the view state
            this.setState({
                folderName: newName
            });
        },

        /**
         * On click of a favourite image in the folder
         * - If editing, suppress the standard event
         * @param {object} event
         */
        onClickImage: function onClickImage(event) {
            if (this.state.folderEdit) {
                event.preventDefault();
                return false;
            }
        },

        /**
         * Remove an image from this folder
         * @param {object} img
         */
        removeImage: function removeImage(img) {
            this.props.folders.removeFavouriteFromFolder(img, this.props.folderKey);
            this.refreshImageCount();
        },

        /**
         * Refresh the image count state
         * State will reload if the count has changed.
         */
        refreshImageCount: function refreshImageCount() {
            this.setState({
                imageCount: this.state.folder.images.length
            });
        },

        folderName: function folderName() {
            if (this.state.folderEdit) {
                return React.createElement('input', { type: 'text', value: this.state.folderName, className: 'folder-title-edit',
                    onChange: this.onChangeFolderName });
            } else {
                return React.createElement(
                    'span',
                    null,
                    this.state.folderName
                );
            }
        },

        folderMode: function folderMode() {
            return this.state.folderEdit ? 'Done' : 'Edit folder';
        },

        showRemoveImageIcon: function showRemoveImageIcon(img) {
            if (this.state.folderEdit) {
                return React.createElement('div', { className: 'icon-remove', onClick: this.removeImage.bind(this, img) });
            }
        },

        showDeleteFolder: function showDeleteFolder() {
            if (this.state.folderEdit) {
                return React.createElement(
                    'div',
                    { className: 'panel-header textbox' },
                    React.createElement(
                        'div',
                        { className: 'options' },
                        React.createElement(
                            'ul',
                            null,
                            React.createElement(
                                'li',
                                null,
                                React.createElement(
                                    'a',
                                    { href: 'javascript:;', onClick: this.onDeleteFolder },
                                    'Delete folder'
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'clear' })
                );
            }
        },

        /**
         * Render the initial view
         */
        render: function render() {

            var _this = this;

            // Load and validate folder
            var folder = this.state.folder;
            if (folder === undefined) {
                // Error, but just chuck bad an empty div.
                return React.createElement('div', { id: 'likes' });
            }

            // Images in folder
            return React.createElement(
                'div',
                { id: 'likes' },
                React.createElement(
                    'div',
                    { className: 'panel-header textbox' },
                    React.createElement(
                        'h2',
                        null,
                        'Favorites folder: ',
                        _this.folderName()
                    ),
                    React.createElement(
                        'div',
                        { className: 'options' },
                        React.createElement(
                            'ul',
                            null,
                            React.createElement(
                                'li',
                                null,
                                React.createElement(
                                    'a',
                                    { href: 'javascript:;', onClick: this.onEditFolder },
                                    _this.folderMode()
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'clear' })
                ),
                React.createElement(
                    'div',
                    { className: 'thumbs' },
                    folder.images.map(function (img, index) {
                        return React.createElement(
                            'a',
                            { href: _this.getFavouriteImagePageUrl(img), onClick: _this.onClickImage },
                            React.createElement('img', { src: _this.getImageUrl(img) }),
                            _this.showRemoveImageIcon(img)
                        );
                    })
                ),
                _this.showDeleteFolder()
            );
        }
    });
})();
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * FavouriteFolders Folder
     * HTML View for a single Folder in a list of folders.
     */
    Namespace('ImgurEnhance.FavouriteFolders.View.Folder');
    ImgurEnhance.FavouriteFolders.View.Folder = React.createClass({
        displayName: "Folder",
        propTypes: {
            id: React.PropTypes.number.isRequired,
            folder: React.PropTypes.object.isRequired,
            onClick: React.PropTypes.func.isRequired
        },

        /**
         * Populate preview images on a Folder
         * - Shows up to 4 images in a tile
         * - Shows imgur logo if all images missing
         * @param folder
         */
        populateFolderPreview: function populateFolderPreview(folder) {

            // Get 4 of the MOST RECENTLY ADDED images in each folder
            var images = folder.images.slice(0);
            images = images.slice(Math.max(images.length - 4, 0));

            // Empty? Well..
            if (images.length < 1) {
                return React.createElement('div', { className: 'missing' });
            }

            // Output up to 4 images
            var output = [];
            for (var k in images) {
                var src = '//i.imgur.com/' + images[k].t + 'b.jpg';
                output.push(React.createElement('img', { src: src }));
            }

            return output;
        },

        /**
         * On folder click
         * @param event
         */
        onFolderClick: function onFolderClick(event) {
            this.props.onClick(this.props.id);
        },

        /**
         * Render the initial view
         */
        render: function render() {

            // Title shows # images
            var title = this.props.folder.images.length;
            title += title == 1 ? ' image' : ' images';

            // Wrapper div
            return React.createElement(
                'div',
                { className: 'folder', title: title, 'data-folder-id': this.props.id, onClick: this.onFolderClick.bind(this) },
                this.populateFolderPreview(this.props.folder),
                React.createElement(
                    'div',
                    { className: 'folder-info' },
                    React.createElement(
                        'div',
                        { className: 'title' },
                        this.props.folder.name
                    )
                )
            );
        }
    });
})();
;(function () {

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
        init: function init() {

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
        addStyles: function addStyles() {
            var rules = [
            // FP image
            "#imagelist .seent {" + "   border-color: #2b2b2b;" + "   background: #000000;" + "}", "#imagelist .seent-hide {" + "   display: none;" + "}", "#imagelist .seent img {" + "   opacity: 0.33;" + "}", "#imagelist .seent:hover img {" + "   opacity: 1;" + "}",

            // FP Icon
            "#imagelist .seent:hover .seent-icon {" + "   display:none;" + "}", "#imagelist .seent-icon { " + "   display: none;" + "   position:absolute;" + "   right: 0px; bottom: 0px;" + "   width: 34px; height: 34px;" + "   background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat;" + "   background-position: -250px -184px;" + "}", "#imagelist .seent .seent-icon {" + "   display: block;" + "}",

            // Sitebar Img
            "#side-gallery .nav-image.seent .image-thumb {" + "   opacity: 0.33;" + "}", "#side-gallery .nav-image.seent:hover .image-thumb," + "#side-gallery .nav-image.seent.selected .image-thumb {" + "   opacity: 1;" + "}",

            // Seent hide
            "#content .sort-options #seent-hide .icon-seent {" + "   display: inline-block;" + "   width: 25px; height: 25px;" + "   image-rendering: optimizeQuality;" + "   -ms-interpolation-mode: nearest-neighbor;" + "   background: url(http://s.imgur.com/images/site-sprite.png) -256px -186px no-repeat transparent;" + "}", "#content .sort-options #seent-hide .icon-block {" + "   position: absolute;" + "   top: 4px; left: 3px;" + "   display: block;" + "   width: 20px; height: 20px;" + "   image-rendering: optimizeQuality;" + "   -ms-interpolation-mode: nearest-neighbor;" + "   background: url(http://s.imgur.com/images/site-sprite.png) -290px -216px no-repeat transparent;" + "}", "#content .sort-options .active {" + "   opacity: 0.9;" + "}"];

            // Add all rules
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            for (var k in rules) {
                this.styleSheet.insertRule(rules[k], k);
            }
        },

        /**
         * Try to read seent out of the current page, and store the hash.
         */
        readSeent: function readSeent() {
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
        attachGlobalSeent: function attachGlobalSeent() {
            var _this = this;

            // Event: Add seent on click of FP images
            // Attach to static #content
            $('#content').on('click', '.post', function () {
                $(this).attr('data-seent', true);
                _this.updateSeent();
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
            $('#content .sort-options ul').each(function () {

                // Create a menu item for the button to sit under
                var $menuItem = $('<li></li>');

                // Add to start of Sort Orders list
                var $sortOptionsList = $(this);
                $sortOptionsList.prepend($menuItem);

                // Add toggle button to menu
                React.render(React.createElement(ImgurEnhance.Seent.View.SeentToggle, { mode: _this.data.getSeentHide(), onClick: _this.toggleSeentHide.bind(_this) }), $menuItem.get(0));

                // Apply the seent-hide initial state
                _this.toggleSeentHide(_this.data.getSeentHide());
            });
        },

        /**
         * Attach Seent elements to gallery
         * Note: May be called multiple times
         */
        attachGallerySeent: function attachGallerySeent() {
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
        attachInsideGallerySeent: function attachInsideGallerySeent() {
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
        toggleSeentHide: function toggleSeentHide(mode) {

            // Persist state
            this.data.setSeentHide(mode);
            this.updateSeent();
        },

        /**
         * Update seent on page
         */
        updateSeent: function updateSeent() {
            var mode = this.data.getSeentHide();

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
;(function () {

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
    ImgurEnhance.SeentStorage = function () {
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
        init: function init() {
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
        get: function get(key) {
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
        save: function save(key, value) {
            this.storage.set(key, JSON.stringify(value), this.cookie);
        }
    };
    Imgur.addSingleton(ImgurEnhance.SeentStorage);
})();
;(function () {

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
        render: function render(parent) {
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
    ImgurEnhance.Seent = function () {
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
        init: function init() {

            // Set up model for storage
            var storage = ImgurEnhance.SeentStorage.getInstance();
            this.data = new ImgurEnhance.SeentModel(storage);

            // add CSS styles
            this.addStyles();
        },

        /**
         * Inject stylesheet hack into DOM
         */
        addStyles: function addStyles() {
            var rules = [
            // FP image seent
            ".gallery .GalleryItem.seent .GalleryItem-imageContainer {" + "   opacity: 0.4" + "}",

            // FP Icon
            ".gallery .GalleryItem.seent .seent-icon {" + "   display: block;" + "   position:absolute;" + "   left: -6px; top: 4px;" + "   width: 34px; height: 34px;" + "   background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat;" + "   background-position: -250px -184px;" + "}"];

            // Add all rules
            this.styleSheet = ImgurEnhance.StyleSheet.create();
            for (var k in rules) {
                this.styleSheet.insertRule(rules[k], k);
            }
        },

        /**
         * Read the hash of the page and store it to Seent
         * @param {string} hash
         */
        trackSeent: function trackSeent(hash) {

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
;(function () {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    /**
     * Seent Toggle
     * Little button for switching seent state
     */
    Namespace('ImgurEnhance.Seent.View.SeentToggle');
    ImgurEnhance.Seent.View.SeentToggle = React.createClass({
        displayName: 'SeentToggle',

        propTypes: {
            mode: React.PropTypes.number.isRequired,
            onClick: React.PropTypes.func.isRequired
        },

        el: {
            $parentListItem: null
        },

        /**
         * Initial state
         * @returns {object}
         */
        getInitialState: function getInitialState() {
            return {
                mode: this.props.mode
            };
        },

        /**
         * On state change
         */
        componentDidUpdate: function componentDidUpdate() {
            if (this.state.mode > 0) {
                this.el.$parentListItem.addClass('active');
            } else {
                this.el.$parentListItem.removeClass('active');
            }
        },

        /**
         * JSON click toggle, walk states
         */
        onClick: function onClick() {
            var mode = this.state.mode;
            mode += 1;
            mode = mode > 2 ? 0 : mode;

            // Update parent
            this.props.onClick(mode);

            // Mode button state
            this.setState({
                mode: mode
            });
        },

        /**
         * Get the icon
         */
        getIcon: function getIcon() {

            var icon = [];
            icon.push(React.createElement('span', { className: 'icon-seent' }));
            if (this.state.mode == 2) {
                icon.push(React.createElement('span', { className: 'icon-block' }));
            }
            return icon;
        },

        /**
         * Render toggle
         * @returns {XML}
         */
        render: function render() {
            return React.createElement(
                'a',
                { href: 'javascript:;', id: 'seent-hide', title: 'Hide seen images', onClick: this.onClick },
                this.getIcon()
            );
        },

        /**
         * On Component mount
         */
        componentDidMount: function componentDidMount() {
            // store link to li
            var $this = $(this.getDOMNode());
            this.el.$parentListItem = $this.parent();

            // trigger state change cb to fix underly li style
            this.componentDidUpdate();

            // Apply Tipsy to Seent toggle, for imgur tooltip style.
            $this.tipsy();
        }
    });
})();
// ==/UserScript==