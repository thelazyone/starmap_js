# starmap_js
An embeddable starmap in js
[LIVE DEMO](https://test.thelazyforger.com/starmap/)

## Simple usage:

Bring the starmap.js into your storage, and in the html load it by including 

```html
    <script src="https://unpkg.com/three@0.126.1/build/three.min.js"></script>
    <script src="https://unpkg.com/three@0.126.1/examples/js/controls/OrbitControls.js"></script>
    <script src="https://unpkg.com/three@0.126.1/examples/js/renderers/CSS2DRenderer.js"></script>
    <script src="starmap.js" data-trunk rel="copy-file"></script>
```

To embed one (or more) starmaps into your page, just add the div with parameters. 
As an example: 

```html
<div class="star-map" 
    data-coordinates='[0, 0, 0, 30, 40, 31, 44, -21, 10, 12, 11, 7, -12, -30, -7]' 
    data-labels='["Earth", "Seguro", "Vavach", "Proxima", "Another"]' 
    data-links='["https://fsd-wargame.com/", "TestLink", "Test2", "test3", ""]'
    style="width: 800px; height: 600px; position: relative;">
</div>
```

