;(function() {

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
        getInitialState: function () {
            return {
                mode: this.props.mode
            };
        },

        /**
         * On state change
         */
        componentDidUpdate: function() {
            if (this.state.mode > 0) {
                this.el.$parentListItem.addClass('active');
            } else {
                this.el.$parentListItem.removeClass('active');
            }
        },

        /**
         * JSON click toggle, walk states
         */
        onClick: function() {
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
        getIcon: function() {

            var icon = [];
            icon.push(<span className="icon-seent"></span>);
            if (this.state.mode == 2) {
                icon.push(<span className="icon-block"></span>);
            }
            return icon;
        },

        /**
         * Render toggle
         * @returns {XML}
         */
        render: function() {
            return (
                <a href="javascript:;" id="seent-hide" title="Hide seen images" onClick={this.onClick}>
                    {this.getIcon()}
                </a>
            );
        },

        /**
         * On Component mount
         */
        componentDidMount: function() {
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