;(function() {

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
        init: function (storage) {

            // Load local storage
            this.storage = storage;
            this.data = $.extend(this.data, this.storage.get(this.storageKey));
        },

        /**
         * Add an image to a folder
         * @param {object} img
         * @param {string} folderKey
         */
        addFavouriteToFolder: function (img, folderKey) {

            // Validate the folder exists.
            var folder = this.data.folders[folderKey];
            if (folder === undefined) {
                return;
            }

            // Don't re-add if already present
            if (_.findIndex(folder, {h: img.h}) >= 0) {
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
        removeFavouriteFromFolder: function (img, folderKey) {

            // Validate the folder exists.
            var folder = this.data.folders[folderKey];
            if (folder === undefined) {
                return;
            }

            // Remove item if it's in the folder
            var index = _.findIndex(folder, {h: img.h});
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
        addFolder: function (folder) {

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
        getFolders: function () {
            return this.data.folders;
        },

        /**
         * Get a specific folder
         * @param {int} folderKey
         */
        getFolder: function (folderKey) {
            return this.data.folders[folderKey];
        },

        /**
         * Remove a folder
         * @param {int} folderKey
         */
        removeFolder: function (folderKey) {

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
        save: function () {
            this.storage.save(this.storageKey, this.data);
        }
    };

})();