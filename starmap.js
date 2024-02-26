// For Star Clicks
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// Moving the controls:
let transitionInProgress = false;
let newTargetPosition = new THREE.Vector3();
let transitionSpeed = 0.1; // Adjust this value to control the speed of the transition

function centerView(position, controls) {
    newTargetPosition.copy(position);
    transitionInProgress = true;
}

function setTargetView() {

}

// Startup
document.addEventListener("DOMContentLoaded", function() {
    var starMaps = document.querySelectorAll('.star-map');

    starMaps.forEach(function(mapElement) {
        var coordinatesArray = JSON.parse(mapElement.getAttribute('data-coordinates'));
        console.log("Initializing starmap...");
    
        // Directly convert the simplified array of numbers into a Float32Array
        var coordinates = new Float32Array(coordinatesArray);
        var labelsArray = JSON.parse(mapElement.getAttribute('data-labels') || '[]'); // Ensure a default empty array if no labels are provided
        var linksArray = JSON.parse(mapElement.getAttribute('data-links') || '[]'); // Ensure a default empty array if no labels are provided
    
        // Pass the Float32Array to your initStarMap function
        initStarMap(mapElement, coordinates, labelsArray, linksArray);
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
    resetViewButton.style.fontSize = '18px';
    resetViewButton.style.color = 'black';
    resetViewButton.style.backgroundColor = 'rgba(255, 255, 240, 0.8)';
    resetViewButton.style.padding = '8px';

    resetViewButton.style.borderRadius = '3px';
    resetViewButton.style.border = '2px solid rgba(30, 30, 30, 1)'; // 2px wide, solid, dark gray border
    resetViewButton.style.cursor = 'pointer';
    resetViewButton.style.zIndex = '100'; // Ensure it's above other elements in the container


    // Append the button to the star map
    localContainer.appendChild(resetViewButton); 

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

function highlightStar(starMaterial, starPosition) {
    starMaterial.uniforms.highlightPosition.value = starPosition;
}

function setTime(starMaterial, starTime) {
    starMaterial.uniforms.time.value = starTime;
}

function showStarDetails(name, link, infoDiv) {

    // Create a div element for the details
    if (link == "") {
        infoDiv.innerHTML = `Planet ${name}`;
    }
    else
    {
        infoDiv.innerHTML = `Planet <a href="${link}" target="_blank">${name} </a>`;
    }
    console.log(infoDiv.innerHTML);
    infoDiv.style.display = 'block'; // Make visible
}


function hideStarDetails(infoDiv) {
    infoDiv.style.display = 'none'; // Hide info
 }

function setupStarClickHandler(container, renderer, camera, controls, starMaterial, inputStarField, labelsArray, linksArray) {
    
     // Create the label element once and reuse it
     var infoDiv = document.createElement('div');
     infoDiv.style.position = 'absolute';
     infoDiv.style.top = '20px'; // Adjust for top-right positioning
     infoDiv.style.left = '20px';
     infoDiv.style.fontFamily = 'Arial, sans-serif';
     infoDiv.style.fontSize = '18px';
     infoDiv.style.color = 'black';
     infoDiv.style.backgroundColor = 'rgba(255, 255, 240, 0.8)';
     infoDiv.style.padding = '8px';
     infoDiv.style.borderRadius = '3px';
     infoDiv.style.border = '2px solid rgba(30, 30, 30, 1)';
     infoDiv.style.display = 'none'; // Initially hidden
     container.appendChild(infoDiv); // Append to body or a specific container
    
     renderer.domElement.addEventListener('dblclick', function(event) {
        var mouse = new THREE.Vector2();
        var raycaster = new THREE.Raycaster();

        // Increase the raycaster threshold for points to make them easier to click
        raycaster.params.Points.threshold = 2.5; // Adjust this value as needed

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        event.preventDefault();
        var rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        console.log("mouse is" , mouse.x , " ", mouse.y)

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray, specifically looking for points
        var intersects = raycaster.intersectObjects([inputStarField], true);
        
        if (intersects.length > 0) {
            // Assuming the first intersected object is the star
            let selectedStar = intersects[0].object;
            let selectedIndex = intersects[0].index


            // Extracting name, link and position. The latter is not elegant because of the three assignments.
            let name = labelsArray[selectedIndex];
            let link = linksArray[selectedIndex];             
            let positions = inputStarField.geometry.attributes.position.array;
            let selectedPos = new THREE.Vector3(positions[selectedIndex * 3], positions[selectedIndex * 3 + 1], positions[selectedIndex * 3 + 2]);

            // Proceed to highlight the star and show details
            highlightStar(starMaterial, selectedPos);
            showStarDetails(name, link, infoDiv); // Adjust as needed

            // Center the view as well.
            centerView(selectedPos, controls);
        }
        else 
        {
            hideStarDetails(infoDiv);
            highlightStar(starMaterial, new THREE.Vector3(NaN, NaN, NaN));
        }
    }, false);
}


function initStarMap(container, coordinates, labelsArray, linksArray) {

    // Time now
    const startTime = Date.now();

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
            color: { value: new THREE.Color(0x000000) },
            pointSize: { value: 2.5 },
            maxSize: { value: 40 },
            highlightPosition: { value: new THREE.Vector3(-1000, -1000, -1000) }, // Default off-screen
            highlightColor: { value: new THREE.Color(0x000000) }, // Highlight color
            time: {value: 0.}
        },
        vertexShader: `
            uniform float pointSize;
            uniform float maxSize;
            uniform int selectedStarIndex;
            uniform vec3 highlightPosition;
            varying float isHighlighted;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = pointSize * (300.0 / -mvPosition.z);
                gl_PointSize = min(gl_PointSize, maxSize); // DOESN'T WORK
                gl_Position = projectionMatrix * mvPosition;

                // float distanceToHighlight = distance(mvPosition.xyz,highlightPosition.xyz);
                float distanceToHighlight = distance(mvPosition.xyz, (modelViewMatrix * vec4(highlightPosition, 1.0)).xyz);
                if (distanceToHighlight < 0.001)
                {
                    float highlightScale = 5.;
                    isHighlighted = 1.0;
                    gl_PointSize *= highlightScale;
                }
                else 
                {
                    isHighlighted = -1.0;
                }
            }
        `,

        fragmentShader: `
            #define M_PI 3.1415926535897932384626433832795
            uniform vec3 color;
            uniform vec3 highlightColor;
            varying float isHighlighted;
            uniform float time;

            void main() {
                float r = length(gl_PointCoord - vec2(0.5, 0.5));


                if (isHighlighted > 0.) {

                    float highlightScale = 5.;

                    // Radius pulsates every 2 seconds)
                    float innerRadius = sin (time * 12. / M_PI) * .1 + 1.1;

                    if (r > 0.5 / highlightScale && (r < innerRadius / highlightScale || r > (innerRadius + 0.3) / highlightScale) ){
                        discard;
                    }

                    gl_FragColor = vec4(highlightColor, 1.0);
                }
                else {
                    if (r > 0.5) {
                        discard;
                    }

                    gl_FragColor = vec4(color, 1.0);
                }
            }
        `,
        transparent: true,
    });

                    // // Highlight effect based on distance to highlightPosition
                // // This logic needs adjustment - it's a conceptual placeholder
                // if (length(position - highlightPosition) < someThreshold) {
                //     gl_FragColor = vec4(highlightColor, 1.0);
                // } else {
                //     gl_FragColor = vec4(color, 1.0);
                // }

    // Defining look for outer stars 
    var outerStarsMaterial = starMaterial.clone();
    outerStarsMaterial.uniforms.color.value = new THREE.Color(0xbbbbbb); 
    outerStarsMaterial.uniforms.pointSize.value = 1;
    outerStarsMaterial.uniforms.maxSize.value = 5;

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
    var outerStarsRadius = 100;
    var outerStarsAmount =5000;
    var outerStarsPosition = new Float32Array(outerStarsAmount * 3); // 1000 stars, 3 values (x, y, z) each
    for (let i = 0; i < outerStarsPosition.length; i++) {
        outerStarsPosition[i] = (normalRandom(rng.random())) * outerStarsRadius; // Distribute stars from -300 to 300 in all directions
    }
    outerStarsGeometry.setAttribute('position', new THREE.BufferAttribute(outerStarsPosition, 3));
    var outerStarField = new THREE.Points(outerStarsGeometry, outerStarsMaterial);
    scene.add(outerStarField);

    // Displaying the labels
    for (let i = 0; i < coordinates.length; i += 3) {
        if (i / 3 < labelsArray.length) {
            var labelDiv = document.createElement('div');
            labelDiv.className = 'star-label';
            labelDiv.textContent = labelsArray[i / 3];
            labelDiv.style.marginTop = '-1em'; // Adjust as needed
            labelDiv.style.fontSize = '18px'; // Adjust as needed
            var label = new THREE.CSS2DObject(labelDiv);
            yOffset = -0; 
            label.position.set(coordinates[i], coordinates[i + 1] + yOffset, coordinates[i + 2]);
            scene.add(label);
        }
    }

    // Create the button element
    addResetButtonToStarMap(container, camera, controls);

    // Star Click callback
    setupStarClickHandler(container, renderer, camera, controls, starMaterial, inputStarField, labelsArray, linksArray);

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = (Date.now() - startTime) / 1000.0; // Time in seconds
        starMaterial.uniforms.time.value = elapsedTime;

        // If the controls are moving:
        if (transitionInProgress) {
            // Smoothly interpolate the controls target towards the new target position
            controls.target.lerp(newTargetPosition, transitionSpeed);
    
            // Check if the transition is complete
            if (controls.target.distanceTo(newTargetPosition) < 1) {
                // Consider the transition complete if the distance is below a threshold
                transitionInProgress = false;
            }
        }

        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    }
    console.log("Calling animate");
    animate(starMaterial);
}
