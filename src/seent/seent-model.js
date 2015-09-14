/**
 * Seent Model
 * Data container for local storage persistence
 * @Class ImgurEnhance.SeentModel
 */
Namespace('ImgurEnhance.SeentModel');
ImgurEnhance.SeentModel = function(a) {
    this.init(a);
};
ImgurEnhance.SeentModel.prototype = {

    /**
     * LocalStorage
     */
    storage: null,
    storageKey: "ImgurEnhance.Seent",

    /**
     * Hash lifetime values
     */
    lifetime: 5 * 86400,
    currentKey: 0,

    /**
     * @var {object} data container for localStorage
     */
    data: {
        visited: {},
        seentHide: false
    },

    /**
     * Constructor
     */
    init: function(storage) {

        // Load local storage
        this.storage = storage;
        this.data = $.extend(this.data, this.storage.get(this.storageKey));

        // Seent daily grouping key
        // timestamp = start of day stamp
        var now = new Date();
        var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        this.currentKey = startOfDay / 1000;

        // Prune the hash list
        this.pruneHashes();
    },

    /**
     * Add a hash to be tracked
     * @param {string} hash
     */
    addSeent: function(hash) {

        // Create container if not present
        if (this.data.visited[this.currentKey] === undefined) {
            this.data.visited[this.currentKey] = [];
        }

        // Add hash if not exists
        if (!this.hasSeent(hash)) {
            this.data.visited[this.currentKey].push(hash);

            // Update local storage
            this.storage.save(this.storageKey, this.data);
        }
    },

    /**
     * Check if an image hash as been seent
     * @param {string} hash
     * @return {boolean}
     */
    hasSeent: function(hash) {

        // Check all date groups
        for (var k in this.data.visited) {

            // Exists in group?
            if (this.data.visited[k].indexOf(hash) != -1) {
                return true;
            }
        }
        return false;
    },

    /**
     * Prune the stored seent image hashes
     * Remove by group, older than lifetime value
     */
    pruneHashes: function() {
        // Check all groups using their key
        for (var k in this.data.visited) {
            // Remove entries older than the lifetime
            if ((k + this.lifetime) < this.currentKey) {
                delete this.data.visited[k];
            }
        }
    },

    /**
     * Set the "SeentHide" state
     * @param {boolean} state
     */
    setSeentHide: function(state) {
        this.data.seentHide = state;

        // Update local storage
        this.storage.save(this.storageKey, this.data);
    },

    /**
     * Get the "SeentHide" state
     * @return {boolean}
     */
    getSeentHide: function() {
        return this.data.seentHide;
    }
};
