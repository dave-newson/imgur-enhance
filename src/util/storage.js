/**
 * Utility: Storage helper
 * @Class ImgurEnhance.Storage
 */
Namespace('ImgurEnhance.Storage');
ImgurEnhance.Storage = {

    rootKey: 'ImgurEnhance',

    /**
     * Create a storage key using the given key.
     * If isShared is true, the account ID will be prepended.
     * If isShared is false, but the user isn't logged in, shared target will still be used.
     *
     * @param {string} key
     * @param {bool} isShared
     * @return {string}
     */
    getStorageKey: function (key, isShared) {

        var accountKey = '-1';

        // Try and get the account key when not shared storage
        if (!isShared) {


            // Desktop method
            if (Imgur.getInstance) {
                // Account might not be set. Try and find it.
                var imgur = Imgur.getInstance();
                if (imgur) {
                    var auth = imgur._.auth;
                    if (auth && auth.id) {
                        accountKey = auth.id;
                    }
                }
            }

            // Mobile method
            if (Imgur.Model) {
                if (Imgur.Model.Account) {
                    if (Imgur.Model.Account.getInstance) {
                        var account = Imgur.Model.Account.getInstance();
                        if (account.id) {
                            accountKey = account.id;
                        }
                    }
                }
            }
        }

        // Structure!
        return [this.rootKey, key, accountKey].join('.');
    }
};
