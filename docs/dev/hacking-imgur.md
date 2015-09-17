# Hacking Imgur

Setting up Classes and Views is all well and good, but really we want to hack into the existing code and augment it.

This is kinda hard because Imgur defines and runs all its libraries immediately, which makes it almost impossible to
latch in and monkey-patch prototypes, as they become instantiated classes lost and tied up in scopes of other objects.

## Destiny

.. almost impossible. Destiny is a small (ish) library which can be used to observe arbitrary object setters.

### What it do

In practical terms, we can instruct Destiny to watch for `Imgur.Gallery.Post` being set, and it can then monkey-patch
the properties contained within whatever was set at that location.

```javascript
Destiny.watchAndPatch(window, 'MyNamespace.MyApp', {c: 3});
MyNamespace = {}
MyNamespace.MyApp = {a:1, b:2}
MyNamespace.MyApp // {a:1, b:2, c:3}
```

The real power of Destiny is its ability to deal with each step (`StepOne.StepTwo.StepThree`) being individually
reset or overwritten as further objects are defined in the tree.
Destiny can still observe the intended target and monkey-patch when it is created.

> It's magic! It's crazy! It's probably a massive liability full of bugs!

### Using it for good or evil

Seent Mobile is a good example of Destiny being put to use. We desire to monkey-patch into the render functions of
several Imgur classes, so we use Destiny to `watchAndPatch` a target.

```javascript
    // Observe: GalleryItem
    Destiny.watchAndPatch(window, 'Imgur.View.GalleryItem', {
        render: function render(parent) {
            var content = parent();

            // Apply seen to gallery item
            if (content.model && content.el) {
                ImgurEnhance.Seent.getInstance().attachySeentToGalleryItem(content.el, content.model.id);
            }
            return content;
        }
    });
```
In the above code, `parent` is a new argument which is supplied to the monkey-patched function.
This contains a correctly scoped reference to the original function. You can thus decide when it is called, with what
arguments, and what you do with the returned data.

In the case of *Seent*, we attach further HTML to the raw elements created during the React render cycle.
Like magic.

