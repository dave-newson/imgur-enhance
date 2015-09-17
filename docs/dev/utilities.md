# Utilities and Helpers

## ImgurEnhance.Storage

While not a storage class in itself, the `ImgurEnhance.Storage` class provides a `getStorageKey` function.
This provides a namespaced LocalStorage key, including the ability to namespace by Account ID on both desktop and mobile.

```javascript
var key = ImgurEnhance.Storage.getStorageKey('Seent', false);
// "ImgurEnhance.Seent.123456789"
```

The second argument can be set to true to force a shared storage (`-1`), so regardless of the logged in account the same
storage is always used.

## ImgurEnhance.StyleSheet

A stylesheet helper to take some of the effort out of dealing with stylesheets in JavaScript.
```javascript
var styleSheet = ImgurEnhance.StyleSheet.create();
stylesheet.insertRule('body { background:red; }', 0);
```
