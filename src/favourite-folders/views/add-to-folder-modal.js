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

            var _this = this;
            var addFolder = [];
            if (this.state.addFolder) {
                // AddFolder mode or SelectFolder mode?
                // Show folder info on image
                addFolder.push(
                    <img src={this.getImageUrl(this.props.img)} />
                );
                addFolder.push(
                    <div className="folder-info">
                        <input className="" type="text" onKeyUp={this.createFolder} />
                    </div>
                );
            } else {
                addFolder.push(
                    <div className='icon-add'></div>
                );
            }

            // Show folders index
            return (
                <div id='imgur-enhance-ff' className='folder-list'>
                    <div className='thumbs'>
                        {
                            this.props.folders.getFolders().map(function (folder, index) {
                                return (
                                    <ImgurEnhance.FavouriteFolders.View.Folder
                                        id={index}
                                        folder={folder}
                                        onClick={_this.onFolderClick.bind(_this, index)} />
                                );
                            })
                        }
                        <div className='folder folder-add' onClick={this.toggleAddFolder}>
                            {addFolder}
                        </div>
                        <div className="clear"></div>
                    </div>
                </div>
            );
        },

        /**
         * On update re-render
         */
        componentDidUpdate: function () {
            var $el = $(this.getDOMNode());

            // Grab focus on the input field
            $el.find('.folder-info input').focus();
        }
    });

})();