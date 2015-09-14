;(function() {

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
        getInitialState: function () {
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
        onFolderClick: function (folderKey) {

            // Add favourite
            this.props.folders.addFavouriteToFolder(this.props.img, folderKey);

            // Close this modal
            this.closeModal();
        },

        /**
         * Get the view URL of an image
         * @param img
         */
        getImageUrl: function (img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * On click folder add
         */
        toggleAddFolder: function () {

            // Toggle the add-folder state
            this.setState({
                addFolder: true
            });
        },

        /**
         * Create the folder
         */
        createFolder: function (event) {

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
        closeModal: function () {
            this.props.closeModal();
        },

        /**
         * Render the modal view
         */
        render: function () {

            // Show folders index
            return React.DOM.div({id: 'imgur-enhance-ff', className: 'folder-list'},

                // Folders gallery container
                React.DOM.div({className: 'thumbs'},

                    // Each folder
                    this.props.folders.getFolders().map(_.bind(function (folder, index) {
                        return ImgurEnhance.FavouriteFolders.View.Folder({
                            id: index,
                            folder: folder,
                            onClick: _.bind(function () {
                                this.onFolderClick(index);
                            }, this)
                        });
                    }, this)),

                    // "Add folder" fake folder
                    React.DOM.div(
                        {
                            className: 'folder folder-add',
                            onClick: _.bind(this.toggleAddFolder, this)
                        },
                        _.bind(function () {

                            // AddFolder mode or SelectFolder mode?
                            if (this.state.addFolder) {

                                // Show folder info on image
                                return [
                                    React.DOM.img({src: this.getImageUrl(this.props.img)}),
                                    React.DOM.div({className: 'folder-info'},
                                        React.DOM.input({
                                            onKeyUp: this.createFolder
                                        })
                                    )
                                ];
                            } else {
                                // Show the add icon
                                return React.DOM.div({className: 'icon-add'})
                            }
                        }, this)()
                    )
                ),

                // Clearfix
                React.DOM.div({className: 'clear'})
            );
        }
    });

})();