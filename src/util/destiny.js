(function(window) {

    /**
     * Destiny is a monkey-patch mechanism for yet-to-be-loaded variables.
     * You can monitor a target object for changes, and Destiny will monkey-patch directly on-top of it.
     * If the monitoring target is already defined, it will get patched immediately.
     * It's magic! It's crazy! It's probably a massive liability full of bugs!
     *
     * Usage example:
     *  MyAppPatch = { // ... };
     *  Destiny.watchAndPatch(window, 'MyApp.SomeClass.Hello', MyAppPatch);
     *
     * When MyApp.SomeClass.Hello gets defined on the window (global scope), the MyAppPatch object will be
     * monkey-patched on top.
     *
     * Function quirks:
     *  When you use a monkey-patched function with Destiny, the original parent function will be passed
     *  to your override function, allowing you to modify arguments or execute it when you want to.
     *
     * Function example:
     *  MyApp.someFunc = function(name) { alert(name); };
     *  MyAppPatch.someFunc = function(parent, name) { console.log(name); parent(name); };
     *  MyApp.someFunc('jeff'); // Logs 'jeff' to the console, then opens an alert window.
     *
     * Write your own fate, rather than being stuck with what you're given.
     *
     * @Class Destiny
     * @constructor
     */
    var Destiny = function() {
        this.attachObjectWatch();
    };
    Destiny.prototype = {

        /**
         * Attach ObjectWatch capability
         * @link https://gist.github.com/eligrey/384583
         */
        attachObjectWatch: function() {

            if (!Object.prototype.watch) {
                Object.defineProperty(Object.prototype, "watch", {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: function(prop, handler) {
                        var oldVal = this[prop];
                        var newVal = oldVal;
                        var getter = function() {
                            return newVal;
                        };
                        var setter = function(val) {
                            oldVal = newVal;
                            return newVal = handler.call(this, prop, oldVal, val);
                        };

                        // can't watch constants
                        if (delete this[prop]) {
                            Object.defineProperty(
                                this,
                                prop,
                                {
                                    get: getter,
                                    set: setter,
                                    enumerable: true,
                                    configurable: true
                                }
                            );
                        }
                    }
                });
            }
        },

        /**
         * watchAndPatch is used to register an object you want to monkey-patch.
         * When the object is written to the expected {observable}.{property}, the {patch} object will be
         * monkey-patched on top of it.
         *
         * @param {object} observable
         * @param {string} property
         * @param {object} patchObject
         * @return {object}
         */
        watchAndPatch: function(observable, property, patchObject) {

            // Callback
            var _this = this;
            var doPatch = function(targetObject) {
                return _this.patchObject(targetObject, patchObject);
            };

            // Apply immediately if the property is already present
            // otherwise watch for definition
            if (observable.hasOwnProperty(property)) {
                return doPatch(observable[property]);
            } else {
                observable.watch(property, function(prop, oldVal, val) {
                    return doPatch(val);
                });
            }
        },

        /**
         * Monkey-patch the targetObject with properties of the patchObject
         * This is totally hairy.
         *
         * @param {object} targetObject
         * @param {object} patchObject
         * @return {object}
         */
        patchObject: function(targetObject, patchObject) {

            // We don't want to patch when the namespace is declared,
            // rather we want to do it when the object properties are defined.
            // Abort if Object.keys.length < 1
            if (Object.keys(targetObject).length < 1) {
                return;
            }

            // We don't want to apply > once.
            // If a class property gets defined twice we might be SOL with this constraint.
            if (targetObject._destinyPatched) {
                return;
            }

            // Break all of the things!
            for (var key in targetObject) {
                if (patchObject.hasOwnProperty(key)) {
                    this.patchProp(key, targetObject, patchObject);
                }
            }

            // Mark as patched so we don't stand on our own dicks.
            targetObject._destinyPatched = true;

            // Return the changed target.
            return targetObject;
        },

        /**
         * Monkey-patch a single property with another property
         * Note: A patched function will be passed the parent function ref as the first argument.
         * eg. myFunc(a, b) becomes myFunc(parent, a, b).
         * The Parent func can be called at any time and will have the appropriate scope.
         *
         * @param {string} propName
         * @param {object} objectTarget
         * @param {object} objectPatch
         */
        patchProp: function(propName, objectTarget, objectPatch) {
            if (typeof objectTarget[propName] != 'function') {
                // Extend to patch non-functions
                objectTarget[propName] = $.extend(objectTarget[propName], objectPatch[propName]);
            } else {

                // Store the parent function ref
                var srcFunc = objectTarget[propName];

                // Replace the function in the target
                objectTarget[propName] = function () {

                    // Preserve scope
                    var _this = this;

                    // Create parent function that's callable
                    var parentFunc = function () {
                        return srcFunc.apply(_this, arguments);
                    };

                    // Prepend the arguments list with Parent callable
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift(parentFunc);

                    // Execute the patch function
                    objectPatch[propName].apply(_this, args);
                };
            }
        }

    };

    // Make Destiny globally available.
    window.Destiny = new Destiny();

})(window);
