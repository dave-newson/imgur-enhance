/**
 * Utility: Stylesheet manager
 * @Class ImgurEnhance.StyleSheet
 */
Namespace('ImgurEnhance.StyleSheet');
ImgurEnhance.StyleSheet = {

    /**
     * Create a stylesheet container we can append to
     * @return {CSSStyleSheet}
     */
    create: function () {
        // Create the <style> tag
        var style = document.createElement("style");

        // WebKit hack :(
        style.appendChild(document.createTextNode(""));

        // Add the <style> element to the page
        document.head.appendChild(style);
        return style.sheet;
    }
};