document.addEventListener("DOMContentLoaded", function() {
    var starMaps = document.querySelectorAll('.star-map');

    starMaps.forEach(function(mapElement) {
        var coordinatesArray = JSON.parse(mapElement.getAttribute('data-coordinates'));
        console.log("Initializing starmap...");
    
        // Directly convert the simplified array of numbers into a Float32Array
        var coordinates = new Float32Array(coordinatesArray);
        var labelsArray = JSON.parse(mapElement.getAttribute('data-labels') || '[]'); // Ensure a default empty array if no labels are provided
    
        // Pass the Float32Array to your initStarMap function
        initStarMap(mapElement, coordinates, labelsArray);
        console.log("Starmap started.");
    });
});


// Returning  random bell point
function normalRandom(randomNumber) {
    var halfBell = Math.sqrt(Math.log(1/randomNumber));
    return halfBell * Math.sign(randomNumber%0.01 - 0.005);
}


// Seeded random
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        // Constants for a simple LCG (values from Numerical Recipes)
        const m = 4294967296; // 2**32
        const a = 1664525;
        const c = 1013904223;

        // Update the seed and return a value between 0 and 1
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }
}

function addResetButtonToStarMap(localContainer, camera, controls) {
    // Create the button element
    var resetViewButton = document.createElement('button');
    resetViewButton.innerHTML = 'Reset View';
    resetViewButton.style.position = 'absolute';
    resetViewButton.style.bottom = '20px';
    resetViewButton.style.right = '20px';
    resetViewButton.style.fontFamily = 'Arial, sans-serif';
    resetViewButton.style.fontSize = '10px';
    resetViewButton.style.color = 'black';
    resetViewButton.style.backgroundColor = 'rgba(255, 255, 240, 0.8)';
    resetViewButton.style.padding = '2px';
    
    resetViewButton.style.borderRadius = '3px';
    resetViewButton.style.border = '2px solid rgba(30, 30, 30, 1)'; // 2px wide, solid, dark gray border
    resetViewButton.style.cursor = 'pointer';
    resetViewButton.style.zIndex = '100'; // Ensure it's above other elements in the container


    // Append the button to the star map
    localContainer.appendChild(resetViewButton); // THIS ONE GIVES ERROR.

    // Add click event listener for the reset functionality
    resetViewButton.addEventListener('click', function() {
        console.log("Reset view clicked"); // Placeholder for actual reset logic
        camera.position.set(0, 0, 100); // Reset camera position
        if (controls) {
            controls.target.set(0, 0, 0); // Reset controls target
            controls.update();
        }    
    });
}

function initStarMap(container, coordinates, labelsArray) {
    // Your existing Three.js setup here, modified to use `container` and `coordinates`
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(new THREE.Color('#fffdf5'), 1); // Set renderer background color
    container.appendChild(renderer.domElement);

    // Initialize CSS2DRenderer
    var labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.offsetWidth, container.offsetHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none'; // Ignore pointer events
    container.appendChild(labelRenderer.domElement);

    // Defining Star Material
    var starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x000000) }, // Black color for dots/stars
            pointSize: { value: 1.5 }
        },
        vertexShader: `
            uniform float pointSize;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = pointSize * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            void main() {
                float r = length(gl_PointCoord - vec2(0.5, 0.5));
                if (r > 0.5) {
                    discard;
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        transparent: true,
    });

    // Defining look for outer stars 
    var outerStarsMaterial = starMaterial.clone();
    outerStarsMaterial.uniforms.color.value = new THREE.Color(0xbbbbbb); 
    outerStarsMaterial.uniforms.pointSize.value = 1;

    // OrbitControls for navigation
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0, 100); // Try adjusting this if stars aren't visible
    controls.update();

    // Create stars
    var inputStarsGeometry = new THREE.BufferGeometry();
    var inputStarsPosition = coordinates.map(Number);
    inputStarsGeometry.setAttribute('position', new THREE.BufferAttribute(inputStarsPosition, 3));
    var inputStarField = new THREE.Points(inputStarsGeometry, starMaterial);
    scene.add(inputStarField);

    // Adding background stars
    var rng = new SeededRandom(0);
    var outerStarsGeometry = new THREE.BufferGeometry();
    var outerStarsRadius = 50;
    var outerStarsAmount = 50;
    var outerStarsPosition = new Float32Array(outerStarsAmount * 3); // 1000 stars, 3 values (x, y, z) each
    for (let i = 0; i < outerStarsPosition.length; i++) {
        outerStarsPosition[i] = (normalRandom(rng.random())) * outerStarsRadius; // Distribute stars from -300 to 300 in all directions
    }
    console.log(outerStarsPosition)
    outerStarsGeometry.setAttribute('position', new THREE.BufferAttribute(outerStarsPosition, 3));
    var outerStarField = new THREE.Points(outerStarsGeometry, outerStarsMaterial);
    scene.add(outerStarField);

    // Displaying the labels
    for (let i = 0; i < coordinates.length; i += 3) {
        if (i / 3 < labelsArray.length) {
            var labelDiv = document.createElement('div');
            labelDiv.className = 'star-label';
            labelDiv.textContent = labelsArray[i / 3];
            labelDiv.style.marginTop = '-3em'; // Adjust as needed
            var label = new THREE.CSS2DObject(labelDiv);
            yOffset = -0; 
            label.position.set(coordinates[i], coordinates[i + 1] + yOffset, coordinates[i + 2]);
            scene.add(label);
        }
    }

    // Create the button element
    addResetButtonToStarMap(container, camera, controls);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    }
    console.log("Calling animate");
    animate();
}

