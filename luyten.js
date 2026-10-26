// Standalone system atlas. Requires Three.js r126 and OrbitControls.
// Positions are a static schematic; distances, sizes and angles are not physical data.
(() => {
    'use strict';
    const TAU = Math.PI * 2;
    const radians = degrees => degrees * Math.PI / 180;

    async function init(container) {
        const response = await fetch(container.dataset.configUrl || 'luyten-system.json');
        if (!response.ok) throw new Error(`Unable to load system (${response.status})`);
        const config = await response.json();
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-300, 300, 300, -300, 0.1, 4000);
        // Orbits lie in XY, so Z is the system's vertical axis. A tiny tilt
        // avoids the look-at singularity directly above the orbital plane.
        camera.up.set(0, 0, 1);
        camera.position.set(0, -0.001, 900);
        const orbitToY = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
        const orbitFromY = orbitToY.clone().invert();
        function cameraOrbit() {
            return new THREE.Spherical().setFromVector3(
                camera.position.clone().sub(controls.target).applyQuaternion(orbitToY));
        }
        function orbitOffset(orbit) {
            return new THREE.Vector3().setFromSpherical(orbit).applyQuaternion(orbitFromY);
        }
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor('#f3f4f7');
        container.appendChild(renderer.domElement);
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.12;
        controls.minZoom = 0.65;
        controls.maxZoom = 18;
        controls.maxPolarAngle = Math.PI;
        // Keep mouse navigation, with a separate two-finger touch mapping.
        controls.touches.ONE = THREE.TOUCH.PAN;
        controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        const touchLayout = window.matchMedia('(pointer: coarse), (max-width: 700px)');
        const instructions = document.getElementById('map-instructions');
        function updateInstructions(touch = touchLayout.matches) {
            if (instructions) instructions.textContent = touch
                ? 'One finger to pan · two fingers to rotate · pinch to zoom · double-tap to explore'
                : 'Drag to rotate · scroll to zoom · right-drag to pan · double-click to explore';
        }
        touchLayout.addEventListener('change', () => updateInstructions());
        updateInstructions();
        const labelsLayer = document.createElement('div');
        Object.assign(labelsLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
        container.appendChild(labelsLayer);
        const leaderLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        Object.assign(leaderLayer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
        container.insertBefore(leaderLayer, labelsLayer);
        const bodies = [], labels = [], pointMaterials = [];
        const black = new THREE.MeshBasicMaterial({ color: '#10100e' });
        const sphere = new THREE.SphereGeometry(1, 48, 32);
        const orbitMaterial = new THREE.LineBasicMaterial({ color: '#b4b4a4', transparent: true, opacity: 0.65, depthWrite: false });
        let width = 1, height = 1, transition = null;
        const extent = Math.max(250, ...config.planets.map(p => p.orbit + Math.max(0, ...(p.moons || []).map(m => m.orbit)) + 25));
        let seed = 1701;
        const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

        function addLabel(name, anchor, radius, kind = '') {
            const element = document.createElement('div');
            element.className = `luyten-label ${kind}`;
            element.textContent = kind === 'star' ? 'LUYTEN' : name;
            labelsLayer.appendChild(element);
            const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leader.setAttribute('stroke', '#aaa99a');
            leader.setAttribute('stroke-width', '.7');
            leaderLayer.appendChild(leader);
            labels.push({ element, anchor, radius, kind, leader, motion: null });
        }
        function addOrbit(parent, radius, inclination = 0, material = orbitMaterial) {
            const points = Array.from({ length: 256 }, (_, i) => new THREE.Vector3(
                radius * Math.cos(i * TAU / 256), radius * Math.sin(i * TAU / 256), 0));
            const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
            orbit.rotation.x = radians(inclination);
            orbit.renderOrder = -1;
            parent.add(orbit);
        }
        function addBody(data, parent, kind) {
            const anchor = new THREE.Group();
            if (data.orbit) {
                addOrbit(parent, data.orbit, data.inclination);
                const angle = radians(data.angle || 0), tilt = radians(data.inclination || 0);
                anchor.position.set(data.orbit * Math.cos(angle), data.orbit * Math.sin(angle) * Math.cos(tilt), data.orbit * Math.sin(angle) * Math.sin(tilt));
            }
            parent.add(anchor);
            const geometry = data.habitat ? new THREE.TorusGeometry(data.radius, data.radius * 0.18, 12, 48) : sphere;
            const mesh = new THREE.Mesh(geometry, black);
            if (!data.habitat) mesh.scale.setScalar(data.radius);
            anchor.add(mesh);
            mesh.userData.body = { data, anchor, kind };
            bodies.push(mesh);
            if (data.name && data.name.trim()) addLabel(data.name, anchor, data.radius, kind);
            (data.rings || []).forEach(radius => addOrbit(anchor, radius, 0, new THREE.LineBasicMaterial({ color: '#55554a' })));
            (data.moons || []).forEach(moon => addBody({ ...moon, parentName: data.name }, anchor, moon.habitat ? 'habitat' : 'moon'));
            return anchor;
        }
        function pointCloud(points, color, background = false) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.slice(0, 3)), 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(points.map(p => p[3]), 1));
            const material = new THREE.ShaderMaterial({
                uniforms: { color: { value: new THREE.Color(color) }, pixelsPerUnit: { value: 1 },
                    minSize: { value: background ? 1.1 * renderer.getPixelRatio() : 1.8 },
                    maxSize: { value: background ? 1.8 * renderer.getPixelRatio() : 64 } },
                vertexShader: `attribute float size; uniform float pixelsPerUnit; uniform float minSize; uniform float maxSize; varying float diameter;
                    void main() { diameter = clamp(size * pixelsPerUnit, minSize, maxSize); gl_PointSize = diameter;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `uniform vec3 color; varying float diameter;
                    void main() { float r = length(gl_PointCoord - 0.5);
                    float alpha = 1.0 - smoothstep(max(0.0, 0.5 - 1.0 / diameter), 0.5, r);
                    if(alpha <= 0.0) discard; gl_FragColor = vec4(color, alpha); }`,
                transparent: true, depthWrite: false
            });
            const cloud = new THREE.Points(geometry, material);
            cloud.renderOrder = background ? -3 : -2;
            scene.add(cloud);
            pointMaterials.push(material);
        }
        function addAsteroids(planet) {
            const points = [], base = radians(planet.angle || 0);
            const planetX = Math.cos(base) * planet.orbit;
            const planetY = Math.sin(base) * planet.orbit;
            const clearRadius = Math.max(planet.radius, ...(planet.moons || []).map(moon => moon.orbit + moon.radius)) + 12;
            const scatter = (angle, spread, count, radialSpread) => {
                for (let i = 0; i < count; i++) {
                    const a = angle + (random() + random() - 1) * spread;
                    const r = planet.orbit + (random() + random() - 1) * radialSpread;
                    const x = Math.cos(a) * r, y = Math.sin(a) * r;
                    const z = (random() - .5) * 3, diameter = 1.5 + random() * 3.2;
                    // Leave the entire satellite system clear, including each
                    // asteroid's radius and a buffer beyond the outermost moon.
                    if (Math.hypot(x - planetX, y - planetY) >= clearRadius + diameter / 2) {
                        points.push([x, y, z, diameter]);
                    }
                }
            };
            const region = (angle, name) => {
                const anchor = new THREE.Object3D();
                anchor.position.set(Math.cos(angle) * (planet.orbit + 18), Math.sin(angle) * (planet.orbit + 18), 0);
                scene.add(anchor);
                addLabel(name, anchor, 0, 'region');
            };
            if (planet.asteroids.trojans) {
                scatter(base + Math.PI / 3, .24, 160, 14);
                scatter(base - Math.PI / 3, .24, 160, 14);
                region(base + Math.PI / 3, 'L4 · Trojan asteroids');
                region(base - Math.PI / 3, 'L5 · Trojan asteroids');
            }
            if (planet.asteroids.opposition) {
                scatter(base + Math.PI, .15, 38, 10);
                region(base + Math.PI, 'L3 · asteroid group');
            }
            for (let i = 0; i < (planet.asteroids.scattered || 0); i++) scatter(random() * TAU, 0, 1, 10);
            pointCloud(points, '#77776b');
        }
        addBody(config.star, scene, 'star');
        config.planets.forEach(planet => {
            addBody(planet, scene, 'planet');
            if (planet.asteroids) addAsteroids(planet);
        });
        pointCloud(Array.from({ length: 5000 }, () => [(random() - .5) * 2000, (random() - .5) * 2000, -160, .25 + random() * .6]), '#cccabd', true);

        const toolbar = document.createElement('div');
        toolbar.className = 'map-toolbar';
        const caption = document.createElement('div');
        caption.className = 'map-caption';
        caption.textContent = 'System not to scale';
        container.append(toolbar, caption);
        function transitionTo(target, zoom, topView = false) {
            const orbit = cameraOrbit();
            transition = {
                target: target.clone(), zoom,
                orbit: topView ? new THREE.Spherical(900, 0.000001, 0) : orbit.clone()
            };
        }
        function focus(body) {
            const target = body ? body.anchor.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
            const regionRadius = body ? Math.max(35, ...(body.data.moons || []).map(m => m.orbit + 12)) : extent;
            transitionTo(target, body ? Math.min(12, extent / regionRadius) : 1, !body);
        }
        function button(text, action) {
            const button = document.createElement('button');
            button.textContent = text;
            button.addEventListener('click', action);
            toolbar.appendChild(button);
        }
        button('Full system', () => focus(null));
        const themis = bodies.find(body => body.userData.body.data.name === 'Themis');
        if (themis) button('Themis region', () => focus(themis.userData.body));
        button('Top view', () => {
            transitionTo(controls.target, camera.zoom, true);
        });
        controls.addEventListener('start', () => { transition = null; });
        const raycaster = new THREE.Raycaster();
        function selectBody(clientX, clientY) {
            const rect = renderer.domElement.getBoundingClientRect();
            raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
            const hit = raycaster.intersectObjects(bodies)[0];
            const body = hit && hit.object.userData.body;
            if (body && body.data.name && body.data.name.trim()) focus(body);
        }
        let lastTouchTime = -Infinity;
        renderer.domElement.addEventListener('dblclick', event => {
            if (performance.now() - lastTouchTime > 600) selectBody(event.clientX, event.clientY);
        });
        // Detect genuine taps; a drag, pinch, or cancelled contact cannot select.
        const contacts = new Set();
        let tap = null, lastTap = null;
        renderer.domElement.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch') { updateInstructions(false); return; }
            updateInstructions(true);
            contacts.add(event.pointerId);
            if (contacts.size > 1) { tap = null; lastTap = null; return; }
            tap = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
        });
        renderer.domElement.addEventListener('pointermove', event => {
            if (tap && tap.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) {
                tap = null; lastTap = null;
            }
        });
        renderer.domElement.addEventListener('pointerup', event => {
            if (event.pointerType !== 'touch') return;
            contacts.delete(event.pointerId);
            const now = performance.now();
            lastTouchTime = now;
            if (tap && tap.id === event.pointerId && now - tap.time < 300 && contacts.size === 0) {
                if (lastTap && now - lastTap.time < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 24) {
                    selectBody(event.clientX, event.clientY);
                    lastTap = null;
                } else lastTap = { x: tap.x, y: tap.y, time: now };
            } else lastTap = null;
            tap = null;
        });
        renderer.domElement.addEventListener('pointercancel', event => {
            contacts.delete(event.pointerId); tap = null; lastTap = null;
        });
        function resize() {
            width = container.clientWidth; height = container.clientHeight;
            const aspect = width / height;
            const halfHeight = extent * 1.16 / Math.min(1, aspect);
            camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
            camera.top = halfHeight; camera.bottom = -halfHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
        new ResizeObserver(resize).observe(container);
        resize();

        const world = new THREE.Vector3(), projected = new THREE.Vector3();
        function layoutLabels(step) {
            const pixels = height * camera.zoom / (camera.top - camera.bottom);
            const obstacles = [];
            const visible = labels.map(label => {
                label.anchor.getWorldPosition(world);
                const depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
                projected.copy(world).project(camera);
                const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2;
                const onScreen = projected.z >= -1 && projected.z <= 1 && x > -40 && x < width + 40 && y > -40 && y < height + 40;
                label.element.style.display = onScreen ? '' : 'none';
                label.leader.style.display = 'none';
                if (!onScreen) return null;
                const hw = label.element.offsetWidth / 2, hh = label.element.offsetHeight / 2;
                const radius = label.radius * pixels, homeY = -(hh + radius + 5);
                if (radius) obstacles.push({ label, x, y, radius });
                if (label.kind === 'star') {
                    // The whole text rectangle must fit inside the stellar disc.
                    const fits = Math.hypot(hw + 3, hh + 3) <= radius;
                    label.element.style.opacity = fits ? '1' : '0';
                    label.element.style.transform = `translate(${x - hw}px, ${y - hh}px)`;
                    label.element.style.zIndex = '1';
                    return null;
                }
                // Screen size governs readability, so small satellites reveal later.
                const proximity = label.kind === 'region' ? (pixels - 0.85) / 0.65 : (radius * 2 - 4) / 5;
                const t = Math.max(0, Math.min(1, proximity));
                const opacity = t * t * (3 - 2 * t);
                label.element.style.opacity = String(opacity);
                label.leader.style.opacity = String(opacity);
                if (opacity === 0) { label.motion = null; return null; }
                label.motion ||= { x: 0, y: homeY, vx: 0, vy: 0 };
                return { ...label, x, y, depth, hw, hh, radius, homeY, cx: x + label.motion.x, cy: y + label.motion.y,
                    fx: -label.motion.x * .025, fy: (homeY - label.motion.y) * .025 };
            }).filter(Boolean).sort((a, b) => a.depth - b.depth);
            function repel(a, x, y, ex, ey, strength) {
                const dx = (a.cx - x) / ex, dy = (a.cy - y) / ey, d = Math.hypot(dx, dy);
                if (d >= 1.5) return;
                const force = (1.5 - d) * strength;
                a.fx += force * dx / (d || 1);
                a.fy += force * (d < .001 ? -1 : dy / d);
            }
            visible.forEach((a, i) => {
                visible.forEach((b, j) => {
                    if (i === j) return;
                    repel(a, b.cx, b.cy, a.hw + b.hw + 6, a.hh + b.hh + 6, i > j ? 3 : .8);
                });
                obstacles.forEach(body => {
                    if (body.label.anchor !== a.anchor) repel(a, body.x, body.y,
                        a.hw + body.radius + 6, a.hh + body.radius + 6, 4);
                });
                const m = a.motion;
                m.vx = (m.vx + a.fx * step) * Math.pow(.65, step);
                m.vy = (m.vy + a.fy * step) * Math.pow(.65, step);
                const limit = Math.min(1, 3 / (Math.hypot(m.vx, m.vy) || 1));
                m.x += m.vx * limit * step; m.y += m.vy * limit * step;
                m.y = Math.min(m.y, a.homeY);
                const cx = Math.max(a.hw + 4, Math.min(width - a.hw - 4, a.x + m.x));
                const cy = Math.max(a.hh + 52, Math.min(height - a.hh - 28, a.y + m.y));
                a.element.style.transform = `translate(${cx - a.hw}px, ${cy - a.hh}px)`;
                a.element.style.zIndex = String(visible.length - i);
                if (Math.hypot(cx - a.x, cy - a.y) > a.radius + a.hh + 18 && a.kind !== 'region') {
                    const dx = cx - a.x, dy = cy - a.y, length = Math.hypot(dx, dy);
                    a.leader.setAttribute('x1', a.x + dx / length * (a.radius + 3));
                    a.leader.setAttribute('y1', a.y + dy / length * (a.radius + 3));
                    a.leader.setAttribute('x2', cx); a.leader.setAttribute('y2', cy + a.hh);
                    a.leader.style.display = '';
                }
            });
        }
        let previous = performance.now();
        function animate(now) {
            requestAnimationFrame(animate);
            const step = Math.min(2, (now - previous) / (1000 / 60)); previous = now;
            if (transition) {
                // Frame-rate-independent easing; interpolate orbital angles so
                // the camera travels around the system rather than through it.
                const easing = 1 - Math.exp(-0.045 * step);
                const orbit = cameraOrbit();
                const angleDelta = Math.atan2(Math.sin(transition.orbit.theta - orbit.theta), Math.cos(transition.orbit.theta - orbit.theta));
                orbit.theta += angleDelta * easing;
                orbit.phi += (transition.orbit.phi - orbit.phi) * easing;
                orbit.radius += (transition.orbit.radius - orbit.radius) * easing;
                controls.target.lerp(transition.target, easing);
                camera.position.copy(controls.target).add(orbitOffset(orbit));
                camera.zoom += (transition.zoom - camera.zoom) * easing;
                camera.updateProjectionMatrix();
                if (controls.target.distanceTo(transition.target) < .01 && Math.abs(camera.zoom - transition.zoom) < .001
                    && Math.abs(angleDelta) < .0001 && Math.abs(orbit.phi - transition.orbit.phi) < .0001
                    && Math.abs(orbit.radius - transition.orbit.radius) < .01) {
                    controls.target.copy(transition.target);
                    camera.position.copy(transition.target).add(orbitOffset(transition.orbit));
                    camera.zoom = transition.zoom;
                    camera.updateProjectionMatrix();
                    transition = null;
                }
            }
            controls.update();
            const pixels = height * camera.zoom / (camera.top - camera.bottom) * renderer.getPixelRatio();
            pointMaterials.forEach(material => { material.uniforms.pixelsPerUnit.value = pixels; });
            renderer.render(scene, camera);
            layoutLabels(step);
        }
        requestAnimationFrame(animate);
    }
    document.querySelectorAll('.luyten-map').forEach(container => init(container).catch(error => {
        console.error(error);
        container.textContent = `The system map could not load: ${error.message}`;
    }));
})();
