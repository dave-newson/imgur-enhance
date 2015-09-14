;(function() {

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
        populateFolderPreview: function (folder) {

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
                    React.DOM.img({src: '//i.imgur.com/' + images[k].t + 'b.jpg'})
                );
            }

            return output;
        },

        /**
         * On folder click
         * @param event
         */
        onFolderClick: function (event) {
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
                React.DOM.div({className: 'folder-info'},
                    React.DOM.div({className: 'title'}, this.props.folder.name)
                )
            );
        }
    });

})();