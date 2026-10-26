# starmap_js
An embeddable starmap in js
[LIVE DEMO](https://test.thelazyforger.com/starmap/)

<img width="685" alt="image" src="https://github.com/thelazyone/starmap_js/assets/10134358/644aef4d-95cd-4b38-a941-80b63863b763">

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

## Json Configuration

It is possible to set up parameters for the stars in a JSON and set it in the `data-config-url` attribute of the div. 
Note that due to some CORS policies this works only if the .html is served or hosted online.

An example of json:
```json
{
    "stars": [
      {
        "coordinates": [0, 0, 0],
        "label": "Earth",
        "link": "https://fsd-wargame.com/",
        "description": "Good old earth"
      },
      {
        "coordinates": [-12, -30, -7],
        "label": "Another",
        "link": "",
        "description": ""
      }
    ]
  }
```

## Luyten system version

Serve this folder and open `luyten.html` for the separate system atlas. It loads
`luyten.js` and `luyten-system.json`; the original `index.html` and `starmap.js`
remain independent.

The configuration contains Sauguro, Claeo, Archon, Themis, and Ruun, in orbital
order. Each body has a schematic `radius`, `orbit` radius, and `angle` in degrees.
`moons` orbit their parent planet; `rings` lists planetary ring radii.
Themis has Domu, Norn, Maat, and Giano Habitat, plus L4/L5 asteroid clouds,
an L3 group, and scattered co-orbital asteroids. Unnamed moons from the reference
have no `name` field: their bodies and orbits remain visible, with no label or selection.
All distances, orbital phases, inclinations, and body sizes are illustrative.

Drag to rotate, scroll to zoom, and right-drag to pan. Double-click a body to
focus it, or use **Themis region**, **Full system**, and **Top view**. Labels
use continuous repulsion and draw thin leaders when displaced from their bodies.

## Original star map future steps:

* Add more configurations to the html
* Auto generate a list of the neighbours when selecting a star
* Being able to select areas-of-influence of stars, using the shader for this (in post-processing?)
* Creating highlighted routes between stars
