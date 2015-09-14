;(function() {

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
        getInitialState: function () {
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
        onChangeFolderName: function (event) {

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
            this.props.folders.removeFavouriteFromFolder(img, this.props.folderKey);
            this.refreshImageCount();
        },

        /**
         * Refresh the image count state
         * State will reload if the count has changed.
         */
        refreshImageCount: function () {
            this.setState({
                imageCount: this.state.folder.images.length
            });
        },

        /**
         * Render the initial view
         */
        render: function () {

            // Load and validate folder
            var folder = this.state.folder;
            if (folder === undefined) {
                // Error, but just chuck bad an empty div.
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
    });

})();