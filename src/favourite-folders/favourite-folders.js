;(function() {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

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
            '</li>',
            galleryFavoriteFolderButton: '' +
            '<span class="favorite-folder-image btn btn-grey left title" href="javascript:;" title="Add to favorite folder">' +
            '   <span class="icon-grid"></span>' +
            '</span>'
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

            // When in the folder-view Route, add the UI.
            if (this.isFoldersView) {
                // Hack: Remove the Favourites page UI
                this.removeFavoritesUi();
                // Display the Folders UI
                this.displayFavouriteFoldersUi();
            }

            // Attach the FavoriteFolder instigation button to the UI
            this.attachFavoriteFolderButton();
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

                // Gallery-inner button style
                '.favorite-folder-image {' +
                '   padding: 10px 12px 6px;' +
                '   margin-top: 1px;' +
                '   font-size: 1.1em;' +
                '}',

                // Styles for the folders index
                // Because the Favorites gallery uses an ID to root the styles >:(
                '.folder-list .thumbs {' +
                '   line-height: 0;' +
                '}',
                // "link". Would be an anchor if this wasn't a hack.
                '.folder-list .thumbs .folder {' +
                '   position: relative;' +
                '   float: left;' +
                '   margin: 4px 3px 4px 4px;' +
                '   width: 134px;' +
                '   height: 134px;' +
                '   border: 3px solid #444442;' + // 2?
                '}',
                '.folder-list .thumbs .folder:hover {' +
                '   cursor: pointer;' +
                '   border-color: #c29f37;' +
                '}',
                // Fix image width creep
                '.folder-list .thumbs .folder img {' +
                '   float: left;' +
                '   width: 67px; height: 67px;' +
                '}',

                // Folder label. Gradient over folder image
                //
                '.folder-list .thumbs .folder .folder-info {' +
                '   position: absolute;' +
                '   left: 0px; bottom:0px;' +
                '   width: 100%; height: 70px;' +
                '   background: 0 0;' +
                '   background: linear-gradient(to bottom,transparent,#000);' +
                "   filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#000000', GradientType=0);" +
                "}",
                '.folder-list .thumbs .folder .folder-info .title {' +
                '   position: absolute;' +
                '   bottom: 0px;' +
                '   width: 100%;' +
                '   text-align: center;' +
                '   line-height: 31px;' +
                '   overflow: hidden;' +
                '}',

                // Missing image "Imgur" logo
                '.folder-list .thumbs .folder .missing {' +
                '   position: absolute;' +
                '   left: 28px; top: 46px;' +
                '   width: 88px; height: 40px;' +
                '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' +
                '   background-position: 0px -246px;' +
                '}',

                // Modal: Nudge the title
                '.imgur-enhance-ff-colorbox #cboxTitle {' +
                '   padding-left: 0.5em;' +
                '}',

                // "Add Folder" icon
                '.folder-list .thumbs .folder.folder-add .icon-add {' +
                '   position: absolute;' +
                '   left: 57px; top: 57px;' +
                '   width: 22px; height: 22px;' +
                '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' +
                '   background-position: -282px -32px;' +
                '}',

                '.thumbs a {' +
                '   position: relative;' +
                '}',

                // "Delete Image" icon
                '.thumbs a .icon-remove {' +
                '   position: absolute;' +
                '   right: 10px; bottom: 10px;' +
                '   width: 20px; height: 20px;' +
                '   background: url(//s.imgur.com/images/site-sprite.png) no-repeat no-repeat;' +
                '   background-position: -110px -80px;' +
                '}',

                // "Add Folder" input field for name
                '.folder-list .folder-add input {' +
                '   border: 1px solid #665d32;' +
                '   border-radius: 2px;' +
                '   background: #000;' +
                '   color: #fff;' +
                '   padding: 4px;' +
                '   line-height: 1.2em;' +
                '   position: absolute;' +
                '   bottom: 2px; left: 2px;' +
                '   width: 120px;' +
                '}',

                // "Add Folder" background image override
                '.folder-list .folder.folder-add img {' +
                '   width: 100%; height: 100%;' +
                '   position: inline;' +
                '   float: none;' +
                '}',

                // Folder title edit
                '.folder-title-edit {' +
                '   background: #000;' +
                '   color: #fff;' +
                '   border: 1px solid #665d32;' +
                '   font-size: inherit;' +
                '   font-weight: inherit;' +
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
         * On Gallery pages, attach the FavoriteFolder button
         */
        attachFavoriteFolderButton: function() {

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
            this.el.$galleryFavoriteFolderButton.on('click', _.bind(function(event) {

                // If the favorite button hasn't been clicked, click it.
                if (!$target.hasClass('favorited')) {
                    $target.trigger('click');
                }

                // Get the hash.
                // Do nothing if doesn't exist (system failure).
                try {
                    var image = Imgur.Gallery.getInstance().imgurInsideNav.getImage();
                    var hash = image.hash;
                    var thumb = (image.album_cover) ? image.album_cover : image.hash;
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
        showAddToFavouritesFolderModal: function(img) {
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
            imgur._.favouriteFolders = React.renderComponent(
                ImgurEnhance.FavouriteFolders.View.AddToFavouriteFolderModal({
                    folders: this.folders,
                    img: img,
                    closeModal: function() {
                        modal.colorbox.close();
                    }
                }),
                $('.imgur-enhance-ff-colorbox #cboxLoadedContent').get(0)
            );

        },

    });
    Class.addSingleton(ImgurEnhance.FavouriteFolders);

})();