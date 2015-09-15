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
            return {};
        },

        /**
         * On click of a folder, open the folder.
         * @param {int} folderKey
         */
        onFolderClick: function (folderKey) {
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
        getImageUrl: function (img) {
            return '//i.imgur.com/' + img.t + 'b.jpg';
        },

        /**
         * Render the initial view
         */
        render: function () {
            var _this = this;
            return (
                <div id="folders" className="folder-list">
                    <div className="panel-header textbox">
                        <h2>Favorites by folder</h2>
                        <div className="clear"></div>
                    </div>

                    <div className="thumbs">
                        {
                            // Each folder
                            this.props.folders.getFolders().map(function (folder, index) {
                                return (
                                    <ImgurEnhance.FavouriteFolders.View.Folder
                                        id={index}
                                        folder={folder}
                                        onClick={_this.onFolderClick.bind(_this, index)}/>
                                );
                            })
                        }
                        <div className="clear"></div>
                    </div>
                </div>
            );
        },

        /**
         * On successful mount
         * - Add tipsy
         */
        componentDidMount: function () {
            var $el = $(this.getDOMNode());

            // Initialise tipsy on folders
            // for tooltip folder names
            $el.find('.folder').tipsy();
        }
    });

})();