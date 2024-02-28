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

async function loadConfigFromURL(configUrl) {

    console.log("Using URL ", configUrl);

    let starMapConfig = {
        coordinates: [],
        labels: [],
        links: [],
        descriptions: []
    };

    try {
        const response = await fetch(configUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        starMapConfig.coordinates = new Float32Array(data.stars.map(star => star.coordinates).flat());
        starMapConfig.labels = data.stars.map(star => star.label);
        starMapConfig.links = data.stars.map(star => star.link);
        starMapConfig.descriptions = data.stars.map(star => star.description);

        // Now starMapConfig is populated and can be used to initialize the star map
    } catch (error) {
        console.error("Failed to load star map configuration:", error);
    }

    return starMapConfig;
}

function loadConfigFromAttributes(mapElement) {

    console.log("Using Attributes");

    return {
    coordinates: new Float32Array(JSON.parse(mapElement.getAttribute('data-coordinates'))),
    labels: JSON.parse(mapElement.getAttribute('data-labels') || '[]'),
    links: JSON.parse(mapElement.getAttribute('data-links') || '[]'),
    descriptions: JSON.parse(mapElement.getAttribute('data-descriptions') || '[]')};
}

document.addEventListener("DOMContentLoaded", async function() {
    var starMaps = document.querySelectorAll('.star-map');

    for (const mapElement of starMaps) {
        let configuration;

        // Checking if there's a JSON config file to read.
        var configUrl = mapElement.getAttribute('data-config-url');

        if (configUrl) {
            configuration = await loadConfigFromURL(configUrl);
            console.log("DEBUG: ", configuration);
        } else {
            configuration = loadConfigFromAttributes(mapElement);
        }
        initStarMap(mapElement, configuration);

        console.log("Starmap started.");
    };
});


// Returning  random bell point
function normalRandom(randomNumber) {
    var halfBell = 1 - Math.sqrt(Math.log(1/(-randomNumber + 1))); 
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

function showStarDetails(name, link, description, infoDiv) {

    // Create a div element for the details
    if (!link || link == "") {
        infoDiv.innerHTML = `Planet ${name}`;
    }
    else
    {
        infoDiv.innerHTML = `Planet <a href="${link}" target="_blank">${name} </a>`;
    }
    infoDiv.innerHTML += `<br/>`
    if (description)
    {
        infoDiv.innerHTML += `<div style="font-size:12px;">${description}</div>`;
    }

    infoDiv.style.display = 'block'; // Make visible
}


function hideStarDetails(infoDiv) {
    infoDiv.style.display = 'none'; // Hide info
 }

function setupStarClickHandler(container, renderer, camera, controls, starMaterial, inputStarField, configuration) {
    
     // Create the label element once and reuse it
     var infoDiv = document.createElement('div');
     infoDiv.style.position = 'absolute';
     infoDiv.style.top = '20px'; // Adjust for top-right positioning
     infoDiv.style.left = '20px';
     infoDiv.style.maxWidth = '30%';
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
            let name = configuration.labels[selectedIndex];
            let link = configuration.links[selectedIndex];   
            let description = configuration.descriptions[selectedIndex];          
            let positions = inputStarField.geometry.attributes.position.array;
            let selectedPos = new THREE.Vector3(positions[selectedIndex * 3], positions[selectedIndex * 3 + 1], positions[selectedIndex * 3 + 2]);

            // Proceed to highlight the star and show details
            highlightStar(starMaterial, selectedPos);
            showStarDetails(name, link, description, infoDiv); // Adjust as needed

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


// Adding some simple legend
function addLegend(container){
    var legendDiv = document.createElement('div');
    legendDiv.style.position = 'absolute';
    legendDiv.style.bottom = '10px'; 
    legendDiv.style.left = '50%'; 
    legendDiv.style.transform = 'translateX(-50%)'; 
    legendDiv.style.fontFamily = 'Arial, sans-serif';
    legendDiv.style.fontSize = '12px';
    legendDiv.style.color = 'black';
    legendDiv.style.backgroundColor = 'rgba(255, 255, 240, 0.8)';
    legendDiv.style.padding = '8px';
    legendDiv.style.borderRadius = '3px';
    legendDiv.style.textAlign = 'center'; 
    legendDiv.innerHTML = `Navigate with mouse; double click for more info.`;
    container.appendChild(legendDiv); 
}


function initStarMap(container, configuration) {
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
            pointSize: { value: 3.5 },
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
            varying float roundRadius;

            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = pointSize * (300.0 / -mvPosition.z);
                gl_PointSize = min(gl_PointSize, maxSize); // DOESN'T WORK
                gl_Position = projectionMatrix * mvPosition;
                roundRadius = gl_PointSize;

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
            varying float roundRadius;

            void main() {
                float r = length(gl_PointCoord - vec2(0.5, 0.5));
                float smoothArea = min(0.4, 20./pow(roundRadius, 1.5));
                float highlightScale = 5.;


                if (isHighlighted > 0.) {

                    // Radius pulsates every 2 seconds)
                    float innerRadius = sin (time * 12. / M_PI) * .1 + 1.1;
                    float ringThickness = 0.6;
                    float outerRadius = innerRadius + ringThickness;
                    r *= highlightScale;

                    if (r > 0.5 && (r < innerRadius || r > outerRadius)){
                        discard;
                    }

                    // float alpha = smoothstep(0.5, 0.5 - smoothArea, r) + 
                    // smoothstep(innerRadius, innerRadius + smoothArea, r) - 
                    // smoothstep(outerRadius - smoothArea, outerRadius, r);

                    gl_FragColor = vec4(highlightColor, 1.0);
                }
                else {
                    if (r > 0.5) {
                        discard;
                    }

                    float alpha = smoothstep(0.5, 0.5 - smoothArea, r);

                    gl_FragColor = vec4(color, 1.0);
                }
            }
        `,
        transparent: true,
    });

    // Defining look for outer stars 
    var outerStarsMaterial = starMaterial.clone();
    outerStarsMaterial.uniforms.color.value = new THREE.Color(0xbbbbbb); 
    outerStarsMaterial.uniforms.pointSize.value = 1.5;
    outerStarsMaterial.uniforms.maxSize.value = 5;

    // OrbitControls for navigation
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0, 100); // Try adjusting this if stars aren't visible
    controls.maxDistance = 200;
    controls.minDistance = 40;
    controls.update();

    // Create stars
    var inputStarsGeometry = new THREE.BufferGeometry();
    var inputStarsPosition = configuration.coordinates.map(Number);
    inputStarsGeometry.setAttribute('position', new THREE.BufferAttribute(inputStarsPosition, 3));
    var inputStarField = new THREE.Points(inputStarsGeometry, starMaterial);
    scene.add(inputStarField);

    // Adding background stars
    var rng = new SeededRandom(0);
    var outerStarsGeometry = new THREE.BufferGeometry();
    var outerStarsRadius = 300;
    var outerStarsAmount = 5000;
    var outerStarsPosition = new Float32Array(outerStarsAmount * 3); // 1000 stars, 3 values (x, y, z) each
    for (let i = 0; i < outerStarsPosition.length; i++) {
        outerStarsPosition[i] = (normalRandom(rng.random())) * outerStarsRadius; // Distribute stars from -300 to 300 in all directions
    }
    outerStarsGeometry.setAttribute('position', new THREE.BufferAttribute(outerStarsPosition, 3));
    var outerStarField = new THREE.Points(outerStarsGeometry, outerStarsMaterial);
    scene.add(outerStarField);

    // Displaying the labels
    for (let i = 0; i < configuration.coordinates.length / 3; i += 1) {
        if (i < configuration.labels.length) {
            var labelDiv = document.createElement('div');
            labelDiv.className = 'star-label';
            if (configuration.labels){
                labelDiv.textContent = configuration.labels[i];
            }
            labelDiv.style.marginTop = '-1em'; // Adjust as needed
            labelDiv.style.fontSize = '18px'; // Adjust as needed
            var label = new THREE.CSS2DObject(labelDiv);
            yOffset = -0; 
            label.position.set(configuration.coordinates[i*3], configuration.coordinates[i*3 + 1] + yOffset, configuration.coordinates[i*3 + 2]);
            scene.add(label);
        }
    }

    // Create the button element
    addResetButtonToStarMap(container, camera, controls);

    // Star Click callback
    setupStarClickHandler(container, renderer, camera, controls, starMaterial, inputStarField, configuration);

    // Adding small legend 
    addLegend(container); 

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
