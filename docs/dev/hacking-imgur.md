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


# Best Practices

There's a lot Imgur can do to shit on this script, so we want to try and play nice with their code.
To that end, please try to obey the following best practice rules.

## Allow for graceful failure

We're building a house on the sand, and it's constantly shifting. We need to allow our code to gracefully fail when
 an update occurs to the Imgur source, so that people using this script aren't left with a broken website.

### Element checking

Before a module is loaded, you may want to abort it due to an element not existing in the source.
This can be achieved as follows:

```javascript
if (document.querySelector("#elemId")) {
    return
}
```

During execution, you can check if an element exists with jQuery, via either of the following:
```javascript
$('element').each(function() {
   // ... only runs if the element is found
});
if ($('element').length) {
   // ... only runs if the element is found
}
```

## Don't cause API Requests

We don't want to risk overloading imgur's API in the name of adding features, as if we become the source of problems on
 their end, they will shut us down.

For this reason, don't make any API requests to Imgur outside of what their own code decides to do.
If a feature causes excessive loading where normally Imgur would not, figure out a way to prevent it.

## Don't make external requests, or require external resources

This includes importing resources, scripts, storing or requesting data from another website, or making custom requests
direct to Imgur's API.  We don't want to introduce anything to this codebase that could be misconstrued as a security
flaw, monitoring, or generally a liability to the end-user.

In some cases this will mean sacrificing functionality.