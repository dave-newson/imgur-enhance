;(function() {

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
        getInitialState: function () {
            return {
                showFolders: true,
                folderEdit: false,
                folderKey: null,
                imageCount: 0,
                folderName: ''
            };
        },

        /**
         * On click of a folder, open the folder.
         * @param {int} folderKey
         */
        onFolderClick: function (folderKey) {
            var folder = this.props.folders.getFolder(folderKey);

            this.setState({
                showFolders: false,
                folderKey: folderKey,
                imageCount: folder.images.length,
                folderName: folder.name
            });
        },

        /**
         * Get the view URL of an image
         * @param {object} img
         */
        getImageUrl: function (img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * Get the Link URL to a Favourite Image page
         * @param {object} img
         */
        getFavouriteImagePageUrl: function (img) {
            var auth = Imgur.getInstance()._.auth;
            return '//imgur.com/user/' + auth.url + '/favorites/' + img.h;
        },

        /**
         * On click of EditFolder button
         * - Switch to Edit mode
         */
        onEditFolder: function () {
            this.setState({
                folderEdit: !this.state.folderEdit
            });
        },

        /**
         * Event: User clicked delete folder
         * - Confirm before deletion
         */
        onDeleteFolder: function () {
            if (confirm('Are you sure you want to delete this folder?')) {
                this.deleteFolder();
            }
        },

        /**
         * Delete the given folder
         */
        deleteFolder: function () {
            this.props.folders.removeFolder(this.state.folderKey);
            window.location.reload();
        },

        /**
         * Rename the folder
         * @param {object} event
         */
        onChangeFolderName: function (event) {

            // Get the value
            var newName = event.target.value;

            // Persist
            var folder = this.props.folders.getFolder(this.state.folderKey);
            folder.name = newName;
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
        onClickImage: function (event) {
            if (this.state.folderEdit) {
                event.preventDefault();
                return false;
            }
        },

        /**
         * Remove an image from this folder
         * @param {object} img
         */
        removeImage: function (img) {
            this.props.folders.removeFavouriteFromFolder(img, this.state.folderKey);
            this.refreshImageCount();
        },

        /**
         * Refresh the image count state
         * State will reload if the count has changed.
         */
        refreshImageCount: function () {
            this.setState({
                imageCount: this.props.folders.getFolder(this.state.folderKey).images.length
            });
        },

        /**
         * Render the initial view
         */
        render: function () {

            // Show folders index
            if (this.state.showFolders) {
                return React.DOM.div({id: 'folders', className: 'folder-list'},

                    // Folder gallery header
                    React.DOM.div({className: 'panel-header textbox'},
                        React.DOM.h2({}, "Favorites by folder"),
                        React.DOM.div({className: 'clear'})
                    ),

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
                        }, this))
                    ),

                    // Clearfix
                    React.DOM.div({className: 'clear'})
                );
            }

            // Single folder
            if (this.state.folderKey !== null) {

                // Load and validate folder
                var folder = this.props.folders.getFolder(this.state.folderKey);
                if (folder === undefined) {
                    // Error, but just chuck bad an emtpy div.
                    return React.DOM.div({id: 'likes'});
                }

                // Images in folder
                return React.DOM.div({id: 'likes'},

                    // Folder gallery header
                    React.DOM.div({className: 'panel-header textbox'},
                        React.DOM.h2({},
                            "Favorites folder: ",
                            _.bind(function () {

                                // Edit or view mode?
                                if (this.state.folderEdit) {
                                    var name = this.state.folderName;
                                    return React.DOM.input({
                                        className: 'folder-title-edit',
                                        value: name,
                                        onChange: this.onChangeFolderName
                                    });
                                } else {
                                    return folder.name;
                                }

                            }, this)()
                        ),
                        React.DOM.div({className: 'options'},
                            React.DOM.ul({},
                                React.DOM.li({},
                                    React.DOM.a({
                                            href: 'javascript:void(0);',
                                            onClick: this.onEditFolder
                                        },
                                        _.bind(function () {

                                            // Determine text
                                            if (this.state.folderEdit) {
                                                return 'View'
                                            } else {
                                                return 'Edit';
                                            }

                                        }, this)()
                                    )
                                )
                            )
                        ),
                        React.DOM.div({className: 'clear'})
                    ),

                    // Images gallery
                    React.DOM.div({className: 'thumbs'},

                        folder.images.map(_.bind(function (img, index) {
                            return React.DOM.a({
                                    href: this.getFavouriteImagePageUrl(img),
                                    onClick: this.onClickImage
                                },
                                React.DOM.img({src: this.getImageUrl(img)}),
                                _.bind(function () {

                                    // Edit mode: show delete button
                                    if (this.state.folderEdit) {
                                        return React.DOM.div({
                                            className: 'icon-remove',
                                            onClick: _.bind(function () {
                                                this.removeImage(img);
                                            }, this)
                                        })
                                    }
                                }, this)()
                            );
                        }, this))
                    ),

                    _.bind(function () {
                        if (this.state.folderEdit) {

                            // Show the Delete Folder panel at the bottom
                            return React.DOM.div({className: 'panel-header textbox'},
                                React.DOM.div({className: 'options'},
                                    React.DOM.ul({},
                                        React.DOM.li({},
                                            React.DOM.a({
                                                href: 'javascript:void(0);',
                                                onClick: this.onDeleteFolder
                                            }, 'Delete folder')
                                        )
                                    )
                                ),
                                React.DOM.div({className: 'clear'})
                            );
                        }
                    }, this)()
                );
            }
        },

        /**
         * On successful mount
         */
        componentDidMount: function () {
            var $el = $(this.getDOMNode());

            // Initialise tipsy on folders
            // for tooltip folder names
            $el.find('.folder').tipsy();
        }
    });

})();