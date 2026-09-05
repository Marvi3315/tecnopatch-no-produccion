/* EARTH INTRO — cinematic zoom-out from a ground point to the whole planet,
   surrounded by an orbiting telecom/satellite network. Plays once per
   session; always safe to skip, and never blocks the real page underneath. */
(function () {
    "use strict";

    var overlay = document.getElementById('earthIntro');
    var canvas = document.getElementById('earthCanvas');
    var skipBtn = document.getElementById('eiSkip');
    var textEl = overlay ? overlay.querySelector('.ei-text') : null;
    if (!overlay || !canvas) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem('tpEarthIntroSeen') === '1'; } catch (e) { /* privacy mode etc */ }

    function closeOverlay(instant) {
        if (!overlay) return;
        if (instant) {
            overlay.style.transition = 'none';
        }
        overlay.classList.add('hide');
        try { sessionStorage.setItem('tpEarthIntroSeen', '1'); } catch (e) { }
        window.setTimeout(function () {
            if (overlay && overlay.parentNode) overlay.style.display = 'none';
        }, instant ? 0 : 900);
    }

    // Skip conditions: reduced motion, already seen this session, or no WebGL.
    var hasWebGL = false;
    try {
        var testCanvas = document.createElement('canvas');
        hasWebGL = !!(testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'));
    } catch (e) { hasWebGL = false; }

    if (reduced || alreadySeen || !hasWebGL || typeof THREE === 'undefined') {
        closeOverlay(true);
        return;
    }

    // Absolute safety net: never let the overlay trap the page.
    var hardTimeout = window.setTimeout(function () { closeOverlay(false); }, 9000);

    if (skipBtn) {
        skipBtn.addEventListener('click', function () {
            window.clearTimeout(hardTimeout);
            closeOverlay(false);
        });
    }

    function latLonToVec3(lat, lon, r) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
    }

    var renderer, scene, camera, earth, clouds, glow, dot, raf;
    var satellites = [];

    function init() {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);

        // Starfield
        var starGeo = new THREE.BufferGeometry();
        var starCount = 1400;
        var positions = new Float32Array(starCount * 3);
        for (var i = 0; i < starCount; i++) {
            var r = 18 + Math.random() * 18;
            var u = Math.random(), v = Math.random();
            var th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
            positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
            positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
            positions[i * 3 + 2] = r * Math.cos(ph);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.75 });
        scene.add(new THREE.Points(starGeo, starMat));

        // Lighting
        scene.add(new THREE.AmbientLight(0x38507a, 1.15));
        var sun = new THREE.DirectionalLight(0xffffff, 1.35);
        sun.position.set(5, 2, 3);
        scene.add(sun);

        var loader = new THREE.TextureLoader();
        var dayMap = loader.load('img/earth_atmos_2048.jpg');
        var cloudMap = loader.load('img/earth_clouds_1024.png');

        earth = new THREE.Mesh(
            new THREE.SphereGeometry(1, 64, 64),
            new THREE.MeshPhongMaterial({ map: dayMap, specular: 0x222233, shininess: 9 })
        );
        scene.add(earth);

        clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.012, 64, 64),
            new THREE.MeshLambertMaterial({ map: cloudMap, transparent: true, opacity: 0.55 })
        );
        scene.add(clouds);

        // Atmosphere rim glow
        var glowMat = new THREE.ShaderMaterial({
            uniforms: { glowColor: { value: new THREE.Color(0x22e0c4) } },
            vertexShader: [
                'varying vec3 vNormal;',
                'void main() {',
                '  vNormal = normalize(normalMatrix * normal);',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 glowColor;',
                'varying vec3 vNormal;',
                'void main() {',
                '  float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);',
                '  intensity = clamp(intensity, 0.0, 1.0);',
                '  gl_FragColor = vec4(glowColor, intensity * 0.5);',
                '}'
            ].join('\n'),
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        glow = new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 64), glowMat);
        scene.add(glow);

        // Telecom orbit rings + satellites — "rodeado por las telecomunicaciones"
        var ringColors = [0x22e0c4, 0xffb703, 0x22e0c4];
        var ringTilts = [0.35, -0.55, 1.15];
        var ringRadii = [1.55, 1.85, 2.1];
        for (var r2 = 0; r2 < 3; r2++) {
            var ringGeo = new THREE.TorusGeometry(ringRadii[r2], 0.004, 8, 128);
            var ringMat = new THREE.MeshBasicMaterial({
                color: ringColors[r2], transparent: true, opacity: 0.28,
                blending: THREE.AdditiveBlending
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + ringTilts[r2];
            ring.rotation.z = r2 * 0.6;
            scene.add(ring);

            var pivot = new THREE.Object3D();
            pivot.rotation.copy(ring.rotation);
            scene.add(pivot);
            var sat = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 12, 12),
                new THREE.MeshBasicMaterial({ color: ringColors[r2] })
            );
            sat.position.set(ringRadii[r2], 0, 0);
            pivot.add(sat);
            satellites.push({ pivot: pivot, speed: 0.15 + r2 * 0.08 });
        }

        // Ground marker — Guadalajara
        var markerVec = latLonToVec3(20.67, -103.35, 1.004);
        dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffb703 })
        );
        dot.position.copy(markerVec);
        scene.add(dot);

        window.addEventListener('resize', onResize, { passive: true });
    }

    function onResize() {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    var START_R = 1.09, END_R = 5.8;
    var ZOOM_MS = 3800, HOLD_MS = 1600;
    var startTime = null;
    var dir = latLonToVec3(20.67, -103.35, 1).normalize();

    function frame(ts) {
        if (startTime === null) startTime = ts;
        var elapsed = ts - startTime;
        var t = Math.min(elapsed / ZOOM_MS, 1);
        var eased = easeOutCubic(t);
        var radius = START_R + (END_R - START_R) * eased;

        var camPos = dir.clone().multiplyScalar(radius);
        // gentle lateral drift so the reveal doesn't feel perfectly locked-off
        camPos.x += Math.sin(eased * Math.PI) * 0.25;
        camera.position.copy(camPos);
        camera.lookAt(0, 0, 0);

        earth.rotation.y += 0.0009;
        clouds.rotation.y += 0.0014;
        satellites.forEach(function (s) { s.pivot.rotation.z += 0.0016 * s.speed * 10; });

        var dotScale = 1 + Math.sin(ts * 0.006) * 0.35;
        dot.scale.setScalar(dotScale);

        if (textEl && t > 0.55 && !textEl.classList.contains('vis')) {
            textEl.classList.add('vis');
        }

        renderer.render(scene, camera);

        if (elapsed < ZOOM_MS + HOLD_MS) {
            raf = requestAnimationFrame(frame);
        } else {
            window.clearTimeout(hardTimeout);
            closeOverlay(false);
            // keep a light idle render loop for the brief fade-out so it never freezes mid-motion
            var fadeStart = ts;
            (function idle(ts2) {
                earth.rotation.y += 0.0006;
                clouds.rotation.y += 0.0009;
                renderer.render(scene, camera);
                if (ts2 - fadeStart < 950) requestAnimationFrame(idle);
            })(ts);
        }
    }

    try {
        init();
        raf = requestAnimationFrame(frame);
    } catch (e) {
        window.clearTimeout(hardTimeout);
        closeOverlay(true);
    }
})();
