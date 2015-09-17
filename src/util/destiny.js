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
     * Class quirks:
     *  When you point Destiny at a variable which becomes populated by a class, it will automatically
     *  monkey patch the prototype elements of that class.
     *  Currently you can't monkey-patch constructors of classes.
     *  This is because prototypes cannot be replaced with setters, so we can't watch them.
     *
     * Class Example:
     *  MyNamespace.MyApp = function() { }
     *  MyNamespace.MyApp.prototype = {a:1, b:2}
     *  Destiny.watchAndPatch(window, 'MyNamespace.MyApp', {c: 3});
     *  // MyNamespace.MyApp.prototype = {a:1, b:2, c:3}
     *
     * Write your own fate, rather than being stuck with what you're given.
     *
     * @Class Destiny
     * @constructor
     */
    var Destiny = {

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

            // Split props to array
            var propList = this.propToArray(property);
            var initProp = propList[0];

            // Make the new interceptor
            var interceptor = new Destiny.ObjectPropertyInterceptor(null, observable, initProp);

            // Attach handler
            var _this = this;
            interceptor.addHandler(propList, function(targetObject) {
                return _this.patchObject.apply(_this, [targetObject, patchObject]);
            });

            // Apply with full settings
            interceptor.apply();
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
                return targetObject;
            }

            // We don't want to apply > once.
            // If a class property gets defined twice we might be SOL with this constraint.
            if (targetObject._destinyPatched) {
                return targetObject;
            }

            // Annoying quirk notice!
            // We can't override the constant prop "prototype"
            // So if the target of the patch is a class, we step into the prototype and work on that
            // Note: This means you can't monkey-patch the constructor!
            // Note: You must refer to the Class constructor, NOT the class prototype to edit prototypes.
            // TODO: This above is super hairy and super dodgy and not at all intuitive.
            var targetRef = targetObject;
            if (typeof targetObject == "function") {
                targetRef = targetObject.prototype;
            }

            // Get keys
            var targetKeys = Object.keys(targetRef);
            var patchKeys = Object.keys(patchObject);
            var keys = targetKeys.concat(patchKeys);

            // Unique keys
            keys = this.unique(keys);

            // Break all of the things!
            // WARNING: NOT a recursive object merge! Supports light patching only!
            for (var k in keys) {

                // Get key
                var key = keys[k];

                // Patch from patchObject
                if (patchObject.hasOwnProperty(key)) {

                    // Monkey-patch or add?
                    if (targetRef.hasOwnProperty(key)) {
                        this.patchProp(key, targetRef, patchObject);
                    } else {
                        this.addProp(key, targetRef, patchObject);
                    }
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
                // WARNING: Relies on jQuery being loaded by now.
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
                    return objectPatch[propName].apply(_this, args);
                };
            }
        },

        /**
         * Add the specified prop to the object, rather than monkey-patching
         *
         * @param {string} propName
         * @param {object} objectTarget
         * @param {object} objectPatch
         */
        addProp: function(propName, objectTarget, objectPatch) {
            objectTarget[propName] = objectPatch[propName];
        },

        /**
         * Split the dot-dlimited property list to an array
         * @param {string} prop
         * @returns {string[]|Array}
         */
        propToArray: function splitProp(prop) {
            return prop.split('.');
        },

        /**
         * Make array members unique
         *
         * @param {Array} a
         * @returns {Array}
         */
        unique: function(a)
        {
            return a.reduce(function(p, c) {
                if (p.indexOf(c) < 0) p.push(c);
                return p;
            }, []);
        }
    };

    /**
     * @Class Destiny.ObjectPropertyInterceptor
     * Used to intercept getter/setter calls and create a tree of getter/settes that can run registered handlers.
     * A necessary evil because objects keep insisting on moving about and being overwritten.
     *
     * @param {Destiny.ObjectPropertyInterceptor|null} parent
     * @param {Object} propertyObject
     * @param {string} propertyName
     * @constructor
     */
    Destiny.ObjectPropertyInterceptor = function(parent, propertyObject, propertyName) {

        // Set object props
        this.parent = parent;
        this.propertyObject = propertyObject;
        this.propertyName = propertyName;
        this.value = this.propertyObject[propertyName];
        this.handlers = [];
    };
    Destiny.ObjectPropertyInterceptor.prototype = {

        parent: null,           // Parent setter in the chain
        propertyObject: null,   // Object this prop belongs to
        propertyName: null,     // Name of the property this is acting on
        value: null,            // Value this property stores
        handlers: [],           // Handlers applied directly to this object, to observe

        /**
         * Initialise this interceptor on the object
         */
        apply: function() {

            // Don't re-link something that already been linked.
            if (this.propertyObject.hasOwnProperty('__opi') &&
                this.propertyObject.__opi.hasOwnProperty(this.propertyName)
            ) {
                return;
            }

            // delete existing and take its place.
            if (delete this.propertyObject[this.propertyName]) {

                Object.defineProperty(
                    this.propertyObject,
                    this.propertyName,
                    {
                        get: this.getter.bind(this),
                        set: this.setter.bind(this),
                        enumerable: true,
                        configurable: true
                    }
                );

                // Apply destiny
                this.propertyObject.__opi = this;

                // Use setter to re-apply the value.
                // This should cause any props on the child object to get applied
                if (this.value !== undefined) {
                    this.propertyObject[this.propertyName] = this.value;
                }
            }
        },

        /**
         * Get the value
         * @return {*}
         */
        getter: function() {
            return this.value;
        },

        /**
         * Set the value
         * @param {*} newValue
         */
        setter: function(newValue) {

            // Run any handlers
            this.value = this.executeHandlers(newValue);

            // Return the result
            return this.value;
        },

        /**
         * Add a handler
         *
         * @param {Array} pathArray
         * @param {function} handler
         */
        addHandler: function(pathArray, handler) {
            this.handlers.push({
                path: pathArray,
                handler: handler
            });
        },

        /**
         * Execute handlers to occur during setter
         * Set up any setters on the child that are needed
         *
         * @param {*} value
         */
        executeHandlers: function(value) {

            // Get all handles that apply to this object
            var handlers = this.requestWatchTargets([]);

            // Initialise additional setters in the tree, recursively
            // If the length > 0, then we're in the tree, but we're not the target.
            for (var h in handlers) {
                if (handlers[h].path.length > 0) {
                    this.applyPropertyInterceptorToChild(value, handlers);
                    break;
                }
            }

            // For each handler, if there's no more path, you're supposed to run here.
            for (var i in handlers) {
                if (handlers[i].path.length == 0) {
                    value = handlers[i].handler(value);
                }
            }

            return value;
        },

        /**
         * Called by children (or self) to get the watch target for a property
         *
         * @param childPropArray
         */
        requestWatchTargets: function(childPropArray) {

            // Add self to list
            childPropArray.unshift(this.propertyName);

            // List of handles to return
            var handlers = [];

            // Continue up the tree
            if (this.parent != null) {
                handlers = this.parent.requestWatchTargets(childPropArray);
            }

            // Add any handles at this level pointing to the property structure
            if (this.handlers.length) {
                for(var i in this.handlers) {

                    var trimPath = this.handlers[i].path.slice();
                    trimPath.splice(childPropArray.length);

                    // !!HACK shortcut comparison because no libs
                    // Might cause mismatch fun
                    // @link http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
                    if (trimPath.toString() == childPropArray.toString()) {
                        handlers.push({
                            path: this.handlers[i].path.slice(),
                            handler: this.handlers[i].handler
                        });
                    }
                }
            }

            // For every handle which passed up the tree, strip an element
            for(var j in handlers) {
                // Splice the first item off
                var propName = handlers[j].path.splice(0, 1);

                // Throw a wobbler if the path doesn't match
                if (propName[0] != this.propertyName) {
                    throw new Error('Bad property. Expected "' + this.propertyName + '" received "' + propName + '".');
                }
            }

            return handlers;
        },

        /**
         * Apply a property interceptor to [childObject] using paths found in [handlers]
         *
         * @param {object} childObject
         * @param {array} handlers
         */
        applyPropertyInterceptorToChild: function(childObject, handlers)
        {
            // Validate: usable type
            if (typeof childObject != 'object' && typeof childObject.prototype != 'object') {
                throw new Error(
                    'Variable considered for InterceptorProperty is of incompatible type ' +
                    typeof childObject
                );
            }

            // Get list of handlers (unique)
            var props = {};
            for(var h in handlers) {
                props[handlers[h].path[0]] = true;
            }

            // Instantiate on unique properties
            for (var prop in props) {

                // re-link parent if OPI already exists
                // Or walk into child prop
                if (childObject.hasOwnProperty('__opi') && childObject.__opi[prop] !== undefined) {
                    childObject.__opi[prop].relinkParent(this);
                } else {
                    var interceptor = new Destiny.ObjectPropertyInterceptor(this, childObject, prop);
                    interceptor.apply();
                }
            }
        },

        /**
         * Relink the upstream parent relationship.
         *
         * @param parent
         */
        relinkParent: function(parent) {
            this.parent = parent;
        }

    };

    // Make Destiny globally available.
    window.Destiny = Destiny;

})(window);
