# Code Guide

## Loading

Code loads in via the `window.ImgurEnhance` loader from `imgur-enhance.js`.
Each module class should be listed as part of the `getModules` function array.

On `document.ready` the `ImgurEnhance.init` function is called, which instantiates each module.
It's assumed that not all modules will be available (this is most true on mobile), so modules are
allowed to gracefully fail. Successfully loaded modules appear in the `ImgurEnhance.modules` array.

## Defining Modules

Most files wrap their code with in a function call for scope cleanliness.

An `isMobile` or `isDesktop` check also blocks code from executing if the appropriate platform isn't detected.
The primary purposes of `isMobile` and `isDesktop` is to create platform-specific versions of modules, however
 it serves a dual purposes of preventing loading if neither platform is found.

## Namespaces and Classes

We try to mimic Imgur's own code where possible. This includes defining classes with the
`Namespace` and `Class.extend` or `React.view` methods.

### Classes

A class definition may look like this:

```javascript
;(function() {

    // Only include if Desktop
    if (!ImgurEnhance.isDesktop()) {
        return;
    }

    Namespace('ImgurEnhance.FavouriteFolders');
    ImgurEnhance.FavouriteFolders = Class.extend({
        // ...
    });
    Class.addSingleton(ImgurEnhance.FavouriteFolders);
})();
```
Note the class is set as a singleton. It can be fetched in code as follows:
```javascript
var myThing = ImgurEnhance.FavouriteFolders.getInstance()
```

### Views
A view definition may look like this:
```javascript
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
        //...
        render: function() {
            // ...
        }
    });
})();
```

# Imgur, Enhance! gotchas

## Persistent Storage

The real elephant in the room with *Imgur, Enhance!* is persistant storage.

We can't just make schema on Imgurs side, and nobody would remotely trust (and I don't want to be) storing data on a
seperate server at a different domain.

The only solution left to us is LocalStorage, which if you don't know is like Cookies but marginally less worse.

### Hijacking Imgur storage

I'm super lazy, so rather than roll my own code I decided to hijack Imgur's own LocalStorage class.

#### Desktop
```
var key = "ImgurEnhance.MyKey"
var value = {a:1, b:2};

this.storage = new Imgur.Storage.LocalStorage();
this.storage.save(key, value);
this.storage.get(key);
// {a:1, b:2}
```

#### Mobile
```javascript
var key = "ImgurEnhance.MyKey"
var value = {a:1, b:2};

this.storage = Imgur.Storage;
this.storage.set(key, JSON.stringify(value), this.cookie);
var fetchedValye = JSON.parse(this.storage.get(key));
// {a:1, b:2}
```

Note that the interfaces of the two storage classes are different. Mobile does not automatically JSON-ify your data.
Seent overcomes this with the `ImgurEnhance.SeentStorage` adapter, making my life easier.
