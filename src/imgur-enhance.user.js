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

(function(window, $) {

    // Stop TamperMonkey shitting itself
    if ($ === undefined || Namespace === undefined || Imgur === undefined) {
        return;
    }

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
        create: function () {
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
     * Seent Model
     * Data container for local storage persistence
     * @Class ImgurEnhance.SeentModel
     */
    Namespace('ImgurEnhance.SeentModel');
    ImgurEnhance.SeentModel = function(a) {
        this.init(a);
    };
    ImgurEnhance.SeentModel.prototype = {

        /**
         * LocalStorage
         */
        storage: null,
        storageKey: "ImgurEnhance.Seent",

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
        init: function(storage) {

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
        addSeent: function(hash) {

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
        hasSeent: function(hash) {

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
        pruneHashes: function() {
            // Check all groups using their key
            for (var k in this.data.visited) {
                // Remove entries older than the lifetime
                if ((k + this.lifetime) < this.currentKey) {
                    delete this.data.visited[k];
                }
            }
        },

        /**
         * Set the "SeentHide" state
         * @param {boolean} state
         */
        setSeentHide: function(state) {
            this.data.seentHide = state;

            // Update local storage
            this.storage.save(this.storageKey, this.data);
        },

        /**
         * Get the "SeentHide" state
         * @return {boolean}
         */
        getSeentHide: function() {
            return this.data.seentHide;
        }
    };

    /**
     * Desktop version
     */
    function initDesktop() {

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

            tpl: {
                seentToggle: '' +
                '<li>' +
                '   <a href="javascript:void(0)" id="seent-hide" title="Hide seen images">' +
                '       <span></span>' +
                '   </a>' +
                '</li>'
            },

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
                    "#imagelist .seent .seent-icon { " +
                    "   display: block;" +
                    "   position:absolute;" +
                    "   right: 0px; bottom: 0px;" +
                    "   width: 34px; height: 34px;" +
                    "   background: url('http://s.imgur.com/images/site-sprite.png') transparent no-repeat;" +
                    "   background-position: -250px -184px;" +
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
                    "#content .sort-options #seent-hide span {" +
                    "   display: inline-block;" +
                    "   width: 25px; height: 25px;" +
                    "   image-rendering: optimizeQuality;" +
                    "   -ms-interpolation-mode: nearest-neighbor;" +
                    "   background: url(http://s.imgur.com/images/site-sprite.png) -256px -186px no-repeat transparent;" +
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

                // Attach seent toggle to homepage
                // .each means this won't run without the element
                $('#content .sort-options ul').each(function() {

                    // Create seent button with click handler
                    var $seentHideItem = $(_this.tpl.seentToggle);
                    _this.elements.$seentHideItem = $seentHideItem;
                    _this.elements.$seentHideButton = $seentHideItem.find('a');

                    // Add to start of Sort Orders list
                    var $sortOptionsList = $(this);
                    $sortOptionsList.prepend($seentHideItem);

                    // Apply Tipsy to Seent toggle, for imgur tooltip style.
                    _this.elements.$seentHideButton.tipsy();

                    // Event: On click seent hide, toggle state
                    _this.elements.$seentHideButton.on('click', function() {
                        // Toggle button and execute hide
                        _this.toggleSeentHide();
                    });

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
                $('.post').not('.seent').each(function () {
                    var $post = $(this);

                    // Check each date block
                    if (_this.data.hasSeent($post.attr('id'))) {
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
                    if (_this.data.hasSeent(hash)) {
                        $link.addClass('seent');
                    }
                });
            },

            /**
             * Hide or unhide all seent items
             * @param {boolean} [forceHidden]
             */
            toggleSeentHide: function(forceHidden) {

                // Get state
                var $seentListItem = this.elements.$seentHideItem;
                state = (forceHidden !== undefined) ? forceHidden : !$seentListItem.hasClass('active');

                // Apply state
                $seentListItem.toggleClass('active', state);
                $('.seent').toggle(!state);

                // Persist state
                this.data.setSeentHide(state);
            }

        });
        Class.addSingleton(ImgurEnhance.Seent);

        /**
         * Always Bleed: Ensure the background gradient image is always present
         */
        Namespace('ImgurEnhance.AlwaysBleed');
        ImgurEnhance.AlwaysBleed = Class.extend({

            detectorSelector: '#fullbleed-bg',
            placement: '#content',
            html: '<div id="fullbleed-bg"></div>',

            /**
             * Engage!
             */
            init: function() {

                this._ = {};

                // No bleed? Make it bleed.
                if ($(this.detectorSelector).length < 1) {
                    $(this.html).insertBefore(this.placement);
                }
            }
        });
        Class.addSingleton(ImgurEnhance.AlwaysBleed);


        /**
         * Favourite Folders: Because jesus christ.
         * - Adds folder button to sidebar menu
         * - Tramples on the Favourites page
         * - Adds UI to the "Favourite" click, which lets you pick-a-folder!
         * - Uses local storage to persist your folder sets.
         */
        Namespace('ImgurEnhance.FavouriteFolders');
        ImgurEnhance.FavouriteFolders = Class.extend({

            /** @var {CSSStyleSheet} */
            styleSheet: null,

            /** @var {ImgurEnhance.FavouriteFoldersModel} */
            folders: null,

            /** @var {object} Html bits */
            tpl: {
                menuSplit: '<div class="split"></div>',
                foldersButton: '' +
                '<div class="textbox half half-second button folders">' +
                '   <h2>Folders</h2>' +
                '   <div class="active"></div>' +
                '</div>',
                foldersUserNav: '' +
                '<li>' +
                '   <a href="javascript:void(0);">folders</a>' +
                '</li>'
            },

            /** @var {object} elements */
            el: {
                $favouritesButton: null,
                $foldersButton: null,
                $foldersUserNav: null,
            },

            /** @var {object} Routing vars */
            routes: {
                folders: {
                    regex: '\/user\/(.*)\/favorites(\/.*)?',
                    fragment: 'folders'
                }
            },

            /** @var {string} Fragment to use for routing */
            fragment: 'folders',

            /** @var {bool} */
            isFoldersView: false,

            /**
             * Constructor
             */
            init: function() {
                this._ = {};

                // Create Folders model for storage
                var storage = new Imgur.Storage.LocalStorage();
                this.folders = new ImgurEnhance.FavouriteFolders.Model.Folders(storage);

                // Crowbar in some CSS
                this.addStyles();

                // Detect routes
                this.detectRoute();

                // Crowbar in menu items
                this.applyMenuChanges();

                // TODO -------------------------

                this.folders = [
                    {name: 'derpderpderpderpderpderpderpderpderpderp', images: ['4lyXrC5b', 'YhVf0wYb', 'YhVf0wYb', 'ReHZZPkb', 'ReHZZPkb', 'ReHZZPkb']},
                    {name: 'derp1', images: []},
                    {name: 'derp2', images: ['4lyXrC5b', 'ReHZZPkb']},
                    {name: 'derp3', images: ['YhVf0wYb']}
                ];

                // When in the folder-view Route, add the UI.
                if (this.isFoldersView) {
                    // Hack: Remove the Favourites page UI
                    this.removeFavoritesUi();
                    // Display the Folders UI
                    this.displayFavouriteFoldersUi();
                }

                // Embed the modal on all pages
                this.embedAddToFavouritesFolderModal();

                // Event: On click favourite button
                // Show the additional modal UI for add-to-folder
                $('.favorite-image.btn').on('click', _.bind(function(event) {

                    // On un-favourite, don't show the modal
                    // Note: This event happens AFTER the standard event
                    // so we only show the modal if we DO have the 'favorited' class.
                    if (!$(event.currentTarget).hasClass('favorited')) {
                        return;
                    }

                    // Get the hash. Do nothing if doesn't exist.
                    var imgur = Imgur.getInstance();
                    if (imgur._.hash === undefined) {
                        return;
                    }

                    // Display modal
                    this.showAddToFavouritesFolderModal(imgur._.hash);
                }, this));

            },

            /**
             * Inject stylesheet hacks into DOM
             */
            addStyles: function() {
                var rules = [

                    // Menu panel: Add "half" styles
                    // We can get away with fixed widths, because imgur uses them!
                    ".panel.menu .half {" +
                    "   width: 128px;" +
                    "   display: inline-block;" +
                    "}",
                    ".panel.menu .half.half-first {" +
                    "   margin-right: 0px;" +
                    "}",
                    ".panel.menu .half.half-first .split {" +
                    "   border-bottom: 18px solid transparent; " +
                    "   border-right: 14px solid #2b2b2b; " +
                    "   border-top: 18px solid transparent; " +
                    "   width: 0px; height: 0;" +
                    "   position: absolute; " +
                    "   top: 0; right: -1px;" +
                    "}",
                    ".panel.menu .half.half-second .active {" +
                    "   display: block;" +
                    "}",

                    // Styles for the folders index
                    // Because the Favorites gallery uses an ID to root the styles >:(
                    // It's OK if we do it though - we're hacking on top.
                    '#folders .thumbs {' +
                    '   line-height: 0;' +
                    '}',
                    // "link". Would be an anchor if this wasn't a hack.
                    '#folders .thumbs .folder {' +
                    '   position: relative;' +
                    '   float: left;' +
                    '   margin: 4px 3px 4px 4px;' +
                    '   width: 134px;' +
                    '   height: 134px;' +
                    '   border: 3px solid #444442;' + // 2?
                    '}',
                    '#folders .thumbs .folder:hover {' +
                    '   cursor: pointer;' +
                    '   border-color: #c29f37;' +
                    '}',
                    // Fix image width creep
                    '#folders .thumbs .folder img {' +
                    '   float: left;' +
                    '   width: 67px; height: 67px;' +
                    '}',

                    // Folder label. Gradient over folder image
                    //
                    '#folders .thumbs .folder .folder-info {' +
                    '   position: absolute;' +
                    '   left: 0px; bottom:0px;' +
                    '   width: 100%; height: 70px;' +
                    '   background: 0 0;' +
                    '   background: linear-gradient(to bottom,transparent,#000);' +
                    "   filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#000000', GradientType=0);" +
                    "}",
                    '#folders .thumbs .folder .folder-info .title {' +
                    '   position: absolute;' +
                    '   bottom: 0px;' +
                    '   width: 100%;' +
                    '   text-align: center;' +
                    '   line-height: 31px;' +
                    '   overflow: hidden;' +
                    '}',

                        // Missing image "Imgur" logo
                    '#folders .thumbs .folder .missing {' +
                    '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' +
                    '   width: 88px; height: 40px;' +
                    '   background-position: 0px -246px;' +
                    '   left: 28px; top: 46px;' +
                    '   position: absolute;' +
                    '}'
                ];

                // Add all rules
                this.styleSheet = ImgurEnhance.StyleSheet.create();
                for(var k in rules) {
                    this.styleSheet.insertRule(rules[k], k);
                }
            },

            /**
             * Detect if we're on a Folders route.
             * sets true/false to this.isFoldersView
             */
            detectRoute: function() {
                // Check the route
                // Confirm with a check of the fragment, and regex of the URL.
                // This is pretty loosey-goosey, but it's just to stop us being dumb.
                var imgur = Imgur.getInstance();
                var urlRegex = new RegExp(this.routes.folders.regex);
                this.isFoldersView = (
                    window.location.hash == '#' + this.routes.folders.fragment && urlRegex.test(imgur._.url)
                );
            },

            /**
             * Apply additional menu items to the page
             * This is just HTML hacks to add menu bits and bobs.
             */
            applyMenuChanges: function() {

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
                var $links = $()
                    .add(this.el.$foldersUserNav)
                    .add(this.el.$foldersButton);
                $($links).on('click', _.bind(function(e) {
                    e.preventDefault();

                    // Build and change page!
                    var accountUrl = Imgur.getInstance()._.auth.url;
                    var fragment = this.routes.folders.fragment;

                    // Build URL and try to change URL
                    var targetPath = "/user/" + accountUrl + "/favorites";
                    window.location = targetPath + '#' + fragment;

                    // Check if the new URL is the same as the old URL.
                    // If it is, we need to reload the page.
                    // Without this, going from Favourites to Folders (same page) doesn't cause a reload.
                    if (window.location.pathname == targetPath) {
                        window.location.reload();
                    }
                }, this));

                // Correct menu highlights if we're viewing folders
                if (this.isFoldersView) {

                    // Menu Sidebar
                    var $panelButtons = $('.panel.menu .textbox.button');
                    $panelButtons.removeClass('selected');
                    this.el.$foldersButton.addClass('selected');

                    // User Nav menu
                    var $navMenuItems = $('#secondary-nav .user-nav .account .user-dropdown li a');
                    $navMenuItems.removeClass('active');
                    this.el.$foldersUserNav.find('a').addClass('active');
                }

                // Tweak Favourites header if on Favorites page
                $('#likes .panel-header h2').each(function() {
                    $(this).text('Favorites');
                });
            },

            /**
             * !!HACK Remove the favourite folders UI
             * This is pretty violent and shonkey.
             */
            removeFavoritesUi: function() {
                // Disable infinite scroll
                Imgur.InfiniteScroll.getInstance().stopInfiniteScroll();

                // Clear existing view using nothing but brute force
                $('#content .left .panel').children().remove();
            },

            /**
             * Display the favourite folders UI
             * This is a react component. Neat!
             */
            displayFavouriteFoldersUi: function() {
                var $container = $('#content .left .panel');
                imgur._.favouriteFolders = React.renderComponent(
                    ImgurEnhance.FavouriteFolders.View.FolderList({
                        folders: this.folders
                    }),
                    $container.get(0)
                );
            },

            /**
             * Display the add-to-favourites modal window
             * @param {string} imageHash
             */
            showAddToFavouritesFolderModal: function(imageHash) {
                // Display the thing in a colorbox modal
                $.colorbox({
                    href: '#imgur-enhance-ff',
                    open: !0,
                    width: "580px",
                    inline: !0,
                    top: "15%",
                    className: "imgur-enhance-ff-colorbox",
                    transition: "none",
                    scrolling: !1,
                    onComplete: _.bind(function() {
                        // Hack to convery the hash to the modal
                        $('#imgur-enhance-ff [data-image-hash]').attr('data-image-hash', imageHash);
                    }, this)
                })
            },

            /**
             * !!HACK Jam in some HTML for the AddFavouriteToFolder HTML modal.
             */
            embedAddToFavouritesFolderModal: function() {

                // Create no-display container at body level
                var $container = $('<div class="nodisplay"></div>');
                $container.appendTo('body');

                // Initialise component under the container
                imgur._.favouriteFolders = React.renderComponent(
                    ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal({
                        folders: this.folders
                    }),
                    $container.get(0)
                );
            }

        });
        Class.addSingleton(ImgurEnhance.FavouriteFolders);

        /**
         * Favourite Folders (model) Folder
         * Data container for local storage persistence
         * @Class ImgurEnhance.FavouriteFolders.Model.Folders
         */
        Namespace('ImgurEnhance.FavouriteFolders.Model.Folders');
        ImgurEnhance.FavouriteFolders.Model.Folders = function(a) {
            this.init(a);
        };
        ImgurEnhance.FavouriteFolders.Model.Folders.prototype = {

            /**
             * LocalStorage
             */
            storage: null,
            storageKey: "ImgurEnhance.FavouriteFolders",

            /**
             * @var {object} data container
             */
            data: {
                folders: []
            },

            /**
             * Constructor
             */
            init: function(storage) {

                // Load local storage
                this.storage = storage;
                this.data = $.extend(this.data, this.storage.get(this.storageKey));
            },

            /**
             * Add an image to a folder
             * @param {string} imgHash
             * @param {string} folderKey
             */
            addFavouriteToFolder: function(imgHash, folderKey) {

                // Validate the folder exists.
                var folder = this.data.folders[folderKey];
                if (folder === undefined) {
                    return;
                }

                // Add the item if it doesn't exist in the folder.
                var index = folder.indexOf(imgHash);
                if (index < 0) {
                    folder.push(imgHash);
                }

                // Save changes
                this.storage.save(this.storageKey, this.data);
            },

            /**
             * Remove a favorite from this specific folder
             * @param {string} imgHash
             * @param {string} folderKey
             */
            removeFavouriteFromFolder: function(imgHash, folderKey) {

                // Validate the folder exists.
                var folder = this.data.folders[folderKey];
                if (folder === undefined) {
                    return;
                }

                // Remove item if it's in the folder
                var index = folder.indexOf(imgHash);
                if (index > -1) {
                    folder.splice(index, 1);
                }

                // Save changes
                this.storage.save(this.storageKey, this.data);
            },

            /**
             * Add a folder
             * @param {object} folder
             */
            addFolder: function(folder) {
                this.folders.push(folder);
                this.storage.save(this.storageKey, this.data);
            },

            /**
             * Get all folders
             * @return {Array}
             */
            getFolders: function() {
                return data.folders;
            },

            /**
             * Get a specific folder
             * @param {object|undefined} folderKey
             */
            getFolder: function(folderKey) {
                return data.folders[folderKey];
            },

            /**
             * Remove a folder
             * @param {int} folderKey
             */
            removeFolder: function(folderKey) {

                // Locate and remove folder
                var index = this.data.folders.indexOf(folderKey);
                if (index > -1) {
                    this.data.folders.splice(index, 1);
                }

                // Save changes
                this.storage.save(this.storageKey, this.data);
            }
        };

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
            getInitialState: function() {
                return {
                    showFolders: true,
                    folderKey: null
                };
            },

            /**
             * On click of a folder, open the folder.
             * @param {int} folderKey
             */
            onFolderClick: function (folderKey) {
                this.setState({
                    showFolders: false,
                    folderKey: folderKey
                });
            },

            /**
             * Get the view URL of an image
             * @param hash
             */
            getImageUrl: function (hash) {
                return '//i.imgur.com/' + hash + '.jpg';
            },

            /**
             * Get the Link URL to a Favourite Image page
             * @param hash
             */
            getFavouriteImagePageUrl: function (hash) {
                var auth = Imgur.getInstance()._.auth;
                return '//imgur.com/user/' + auth.url + '/favorites/' + hash;
            },

            /**
             * Render the initial view
             */
            render: function() {

                // Show folders index
                if (this.state.showFolders) {
                    return React.DOM.div({id: 'folders'},

                        // Folder gallery header
                        React.DOM.div({className: 'panel-header textbox'},
                            React.DOM.h2({}, "Favorites by folder"),
                            React.DOM.div({className: 'clear'})
                        ),

                        // Folders gallery container
                        React.DOM.div({className: 'thumbs'},

                            // Each folder
                            this.props.folders.map(_.bind(function (folder, index) {
                                return ImgurEnhance.FavouriteFolders.View.Folder({
                                    id: index,
                                    folder: folder,
                                    onClick: _.bind(function () {
                                        this.onFolderClick(index);
                                    }, this)
                                });
                            }, this))
                        ),

                        // Clearfix
                        React.DOM.div({className: 'clear'})
                    );
                }

                // Single folder
                if (this.state.folderKey !== null) {

                    // Load and validate folder
                    var folder = this.props.folders[this.state.folderKey];
                    if (folder === undefined) {
                        return;
                    }

                    // Images in folder
                    return React.DOM.div({id: 'likes'},

                        // Folder gallery header
                        React.DOM.div({className: 'panel-header textbox'},
                            React.DOM.h2({}, "Favorites folder: " + folder.name),
                            React.DOM.div({className: 'clear'})
                        ),

                        // Images gallery
                        React.DOM.div({className: 'thumbs'},

                            folder.images.map(_.bind(function (imageHash, index) {
                                return React.DOM.a({href: this.getFavouriteImagePageUrl(imageHash)},
                                    React.DOM.img({src: this.getImageUrl(imageHash)})
                                );
                            }, this))
                        )
                    );
                }
            },

            /**
             * On successful mount
             */
            componentDidMount: function() {
                var $el = $(this.getDOMNode());

                // Initialise tipsy on folders
                // for tooltip folder names
                $el.find('.folder').tipsy();
            }
        });

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
            populateFolderPreview: function(folder) {

                // Get 4 of the MOST RECENTLY ADDED images in each folder
                var images = folder.images.slice(0);
                images = images.slice(Math.max(images.length - 4, 0));

                // Empty? Well..
                if (images.length < 1) {
                    return React.DOM.div({className: 'missing'});
                }

                // Output up to 4 images
                var output = [];
                for (var k in images) {
                    output.push(
                        React.DOM.img({src: '//i.imgur.com/' + images[k] + '.jpg'})
                    );
                }

                return output;
            },

            /**
             * On folder click
             * @param event
             */
            onFolderClick: function(event) {
                this.props.onClick(this.props.id);
            },

            /**
             * Render the initial view
             */
            render: function () {

                // Title shows # images
                var title = this.props.folder.images.length;
                title += (title == 1) ? ' image' : ' images';

                // Wrapper div
                return React.DOM.div(
                    {
                        className: 'folder',
                        title: title,
                        'data-folder-id': this.props.id,
                        onClick: _.bind(this.onFolderClick, this)
                    },
                    this.populateFolderPreview(this.props.folder),
                    React.DOM.div({className:'folder-info'},
                        React.DOM.div({className:'title'}, this.props.folder.name)
                    )
                );
            }
        });


        /**
         * FavouriteFolder View AddToFavouriteFolderModal
         * HTML View for add-to-folder
         */
        Namespace('ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal');
        ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal = React.createClass({
            displayName: "AddToFavouriteFolderModal",
            propTypes: {
                folders: React.PropTypes.object.isRequired
            },

            /**
             * Initial state
             * @returns {object}
             */
            getInitialState: function() {
                return {
                };
            },

            /**
             * On click of a folder, open the folder.
             * @param {int} folderKey
             */
            onFolderClick: function (folderKey) {
                // TODO: Add to folder. Close modal.
            },

            /**
             * Get the view URL of an image
             * @param hash
             */
            getImageUrl: function (hash) {
                return '//i.imgur.com/' + hash + '.jpg';
            },

            /**
             * Render the modal view
             */
            render: function() {

                // Show folders index
                return React.DOM.div({id: 'imgur-enhance-ff'},

                    // Folder gallery header
                    React.DOM.div({className: 'panel-header textbox'},
                        React.DOM.h2({}, "Favorites by folder"),
                        React.DOM.div({className: 'clear'})
                    ),

                    // Folders gallery container
                    React.DOM.div({className: 'thumbs'},

                        // Each folder
                        this.props.folders.map(_.bind(function (folder, index) {
                            return ImgurEnhance.FavouriteFolders.View.Folder({
                                id: index,
                                folder: folder,
                                onClick: _.bind(function () {
                                    this.onFolderClick(index);
                                }, this)
                            });
                        }, this))
                    ),

                    // Clearfix
                    React.DOM.div({className: 'clear'})
                );
            },
        });

        /**
         * Init: On document ready
         */
        $(function() {
            ImgurEnhance.Seent.getInstance();
            ImgurEnhance.FavouriteFolders.getInstance();
            ImgurEnhance.AlwaysBleed.getInstance();
        });
    }

    /**
     * Mobile version
     */
    function initMobile() {

        /**
         * Utility: Mobile LocalStorage implementation
         * Because the Mobile framework is retarded.
         * This /tries/ to make it align with the one from Ract.
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

        /**
         * Init: On document ready
         */
        $(function() {
            ImgurEnhance.Seent.getInstance();
        });
    }

    /**
     * Detect Desktop or Mobile
     * React = Desktop
     * Backbone = Mobile
     */
    if (window.React !== undefined) {
        initDesktop();
    } else if (window.Backbone !== undefined) {
        initMobile();
    }

})(window, window.jQuery, window.imgurEnhance);
