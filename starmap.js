document.addEventListener("DOMContentLoaded", function() {
    var starMaps = document.querySelectorAll('.star-map');

    starMaps.forEach(function(mapElement) {
        var coordinatesArray = JSON.parse(mapElement.getAttribute('data-coordinates'));
        console.log("Initializing starmap...");
    
        // Directly convert the simplified array of numbers into a Float32Array
        var coordinates = new Float32Array(coordinatesArray);
    
        // Pass the Float32Array to your initStarMap function
        initStarMap(mapElement, coordinates);
        console.log("Starmap started.");
    });
});


function initStarMap(container, coordinates) {
    // Your existing Three.js setup here, modified to use `container` and `coordinates`
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls for navigation
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0, 100); // Try adjusting this if stars aren't visible
    controls.update();

    // Create stars
    screen_width = 300;
    var starGeometry = new THREE.BufferGeometry();
    var stars = new Float32Array(1000 * 3); // 1000 stars, 3 values (x, y, z) each
    for (let i = 0; i < stars.length; i++) {
        stars[i] = (Math.random() - 0.5) * screen_width; // Distribute stars from -300 to 300 in all directions
    }

    var inputStars = coordinates.map(Number);
    console.log(coordinates);
    starGeometry.setAttribute('position', new THREE.BufferAttribute(inputStars, 3));
    console.log("Created 1000 stars");

    var starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
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
    var starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Required if controls.enableDamping or controls.autoRotate are set to true
        renderer.render(scene, camera);
    }
    console.log("Calling animate");
    animate();
}