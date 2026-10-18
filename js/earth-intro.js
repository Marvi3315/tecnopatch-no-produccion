/* EARTH INTRO — cinematic zoom-out from a ground point to the whole planet,
   wrapped by a telecom constellation, live data links between cities, night
   lights, nebula backdrop, meteors and star dust. Plays once per session;
   always safe to skip, and never blocks the real page underneath. */
(function () {
    "use strict";

    var closed = false;
    var closedAt = 0;
    var overlay = document.getElementById('earthIntro');
    var canvas = document.getElementById('earthCanvas');
    var skipBtn = document.getElementById('eiSkip');
    var textEl = overlay ? overlay.querySelector('.ei-text') : null;
    if (!overlay || !canvas) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem('tpEarthIntroSeen') === '1'; } catch (e) { /* privacy mode etc */ }

    function closeOverlay(instant) {
        if (!overlay || closed) return;
        closed = true;
        closedAt = performance.now();
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

    var enterBtn = document.getElementById('eiEnter');

    if (enterBtn) {
        enterBtn.addEventListener('click', function () { closeOverlay(false); });
    }
    document.addEventListener('keydown', function (e) {
        if (!closed && (e.key === 'Escape' || e.key === 'Enter')) closeOverlay(false);
    });
    if (skipBtn) {
        skipBtn.addEventListener('click', function () { closeOverlay(false); });
    }

    /* ---------- config & helpers ---------- */
    var IS_MOBILE = window.innerWidth < 700;
    var SAT_COUNT = IS_MOBILE ? 130 : 240;
    var STAR_COUNT = IS_MOBILE ? 1500 : 2800;
    var DUST_COUNT = IS_MOBILE ? 240 : 520;
    var START_R = 1.09, END_R = 5.8;
    var ZOOM_MS = 7500;
    var SUN = new THREE.Vector3(0.92, 0.28, 0.28).normalize();

    function clamp01(x) { return Math.min(1, Math.max(0, x)); }
    function smoothstep(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; }
    function rgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function latLonToVec3(lat, lon, r) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
    }

    var renderer, scene, camera, world, earth, clouds, glow, raf;
    var started = false, startTime = null, lastTs = null, simTime = 0;
    var glowMats = [];
    var satellites = [];           // the 3 big ring satellites
    var constellation = null;      // swarm of small telecom satellites
    var arcs = [];                 // data links between cities
    var cityPts = null, cityInfo = [];
    var pulsePts = null, pulseInfo = [];
    var starsPts = null, backdrop = null, nightMat = null, hubDot = null, ripples = [];
    var meteors = [], nextMeteorAt = 0;
    var perfFrames = 0, perfSum = 0, perfChecked = false;
    var camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camZ = new THREE.Vector3(), camFwd = new THREE.Vector3();
    var tmpV = new THREE.Vector3();
    var dir = latLonToVec3(20.67, -103.35, 1).normalize();

    /* soft glowing points (stars, satellites, cities, pulses, dust) */
    function makeGlowMaterial(twinkle) {
        var m = new THREE.ShaderMaterial({
            uniforms: { uPR: { value: 1 }, uTime: { value: 0 } },
            defines: twinkle ? { TWINKLE: 1 } : {},
            vertexShader: [
                'attribute float aSize;',
                'attribute vec3 aColor;',
                'attribute float aAlpha;',
                '#ifdef TWINKLE',
                'attribute vec2 aPhase;',
                '#endif',
                'uniform float uPR;',
                'uniform float uTime;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main() {',
                '  vColor = aColor;',
                '  vAlpha = aAlpha;',
                '#ifdef TWINKLE',
                '  vAlpha *= 0.55 + 0.45 * sin(uTime * aPhase.y + aPhase.x);',
                '#endif',
                '  gl_PointSize = aSize * uPR;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main() {',
                '  float d = length(gl_PointCoord - vec2(0.5));',
                '  if (d > 0.5) discard;',
                '  float core = smoothstep(0.2, 0.0, d);',
                '  float halo = smoothstep(0.5, 0.0, d) * 0.45;',
                '  gl_FragColor = vec4(vColor, (core + halo) * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        glowMats.push(m);
        return m;
    }

    function makeGlowPoints(count, twinkle) {
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
        geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        var al = new Float32Array(count);
        for (var i = 0; i < count; i++) al[i] = 1;
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
        if (twinkle) geo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        var pts = new THREE.Points(geo, makeGlowMaterial(twinkle));
        pts.frustumCulled = false;
        return pts;
    }

    function setColor(pts, i, hex) {
        var c = rgb(hex), a = pts.geometry.attributes.aColor.array;
        a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2];
    }

    /* procedural nebula + Milky Way band, painted once on a canvas */
    function makeNebulaTexture() {
        var W = 2048, H = W / 2;
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var g = c.getContext('2d');
        g.fillStyle = '#02040a';
        g.fillRect(0, 0, W, H);
        function bandY(x) { return H * 0.5 + Math.sin(x / W * Math.PI * 4 + 0.6) * H * 0.035; }
        var palette = ['34,224,196', '60,110,230', '60,110,230', '140,90,220', '140,90,220', '34,224,196', '255,183,3'];
        var blobs = IS_MOBILE ? 70 : 140;
        for (var i = 0; i < blobs; i++) {
            var x = Math.random() * W;
            var y = bandY(x) + gauss() * H * 0.075;
            var rad = rand(W * 0.04, W * 0.12);
            var col = palette[Math.floor(Math.random() * palette.length)];
            var a = col === '255,183,3' ? rand(0.012, 0.025) : rand(0.018, 0.045);
            [0, -W, W].forEach(function (o) {
                if (x + o + rad < 0 || x + o - rad > W) return;
                var gr = g.createRadialGradient(x + o, y, 0, x + o, y, rad);
                gr.addColorStop(0, 'rgba(' + col + ',' + a + ')');
                gr.addColorStop(1, 'rgba(' + col + ',0)');
                g.fillStyle = gr;
                g.fillRect(x + o - rad, y - rad, rad * 2, rad * 2);
            });
        }
        var dust = IS_MOBILE ? 11000 : 16000;
        for (var j = 0; j < dust; j++) {
            var dx = Math.random() * W;
            var dy = bandY(dx) + gauss() * H * 0.07;
            g.fillStyle = 'rgba(210,222,255,' + rand(0.08, 0.5).toFixed(2) + ')';
            g.fillRect(dx, dy, rand(0.6, 1.6), rand(0.6, 1.6));
        }
        var tex = new THREE.CanvasTexture(c);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /* ---------- world data ---------- */
    var CITIES = [
        ['Guadalajara', 20.67, -103.35], ['Ciudad de México', 19.43, -99.13], ['Monterrey', 25.67, -100.31],
        ['Los Ángeles', 34.05, -118.24], ['Nueva York', 40.71, -74.0], ['Miami', 25.76, -80.19],
        ['Bogotá', 4.71, -74.07], ['São Paulo', -23.55, -46.63], ['Buenos Aires', -34.6, -58.38],
        ['Santiago', -33.45, -70.67], ['Madrid', 40.42, -3.7], ['Londres', 51.51, -0.13],
        ['Moscú', 55.75, 37.62], ['Lagos', 6.52, 3.38], ['El Cairo', 30.04, 31.24],
        ['Johannesburgo', -26.2, 28.05], ['Dubái', 25.2, 55.27], ['Bombay', 19.08, 72.88],
        ['Singapur', 1.35, 103.82], ['Shanghái', 31.23, 121.47], ['Tokio', 35.68, 139.69], ['Sídney', -33.87, 151.21]
    ];
    var SPOKES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 16, 20, 21];
    var EXTRA_LINKS = [[4, 11], [11, 16], [16, 18], [18, 20], [3, 20], [7, 13], [10, 7], [18, 21], [11, 12], [17, 19],
        [7, 8], [8, 9], [13, 14], [14, 16], [15, 13], [19, 20], [5, 6], [4, 5], [10, 13], [12, 16]];
    var SHELLS = [
        { frac: 0.32, r: 1.20, inc: 53, planes: 8 },
        { frac: 0.26, r: 1.32, inc: 70, planes: 6 },
        { frac: 0.20, r: 1.48, inc: 98, planes: 5 },
        { frac: 0.14, r: 1.70, inc: 30, planes: 4 },
        { frac: 0.08, r: 2.30, inc: 6, planes: 2 }
    ];

    /* ---------- scene ---------- */
    function init() {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.5 : 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 140);

        var manager = new THREE.LoadingManager(function () { start(); });
        var loader = new THREE.TextureLoader(manager);
        var aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);

        /* backdrop: nebula + milky way */
        backdrop = new THREE.Mesh(
            new THREE.SphereGeometry(80, 48, 32),
            new THREE.MeshBasicMaterial({ map: makeNebulaTexture(), side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 0.95 })
        );
        (function () {
            var f = dir.clone().negate();
            var rt = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
            var up = new THREE.Vector3().crossVectors(rt, f).normalize();
            var n = up.multiplyScalar(Math.cos(0.62)).addScaledVector(rt, Math.sin(0.62)).normalize();
            backdrop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        })();
        backdrop.renderOrder = -10;
        scene.add(backdrop);

        /* twinkling stars */
        starsPts = makeGlowPoints(STAR_COUNT, true);
        var sp = starsPts.geometry.attributes.position.array;
        var ss = starsPts.geometry.attributes.aSize.array;
        var sa = starsPts.geometry.attributes.aAlpha.array;
        var sph = starsPts.geometry.attributes.aPhase.array;
        var starCols = [0xcfdcff, 0xcfdcff, 0xcfdcff, 0xffe2b8, 0xa8fff0];
        for (var i = 0; i < STAR_COUNT; i++) {
            var r = rand(24, 46);
            var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
            sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
            sp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
            sp[i * 3 + 2] = r * Math.cos(ph);
            ss[i] = Math.random() < 0.04 ? rand(3, 4.6) : rand(1.1, 2.4);
            sa[i] = rand(0.45, 1);
            sph[i * 2] = rand(0, 6.28);
            sph[i * 2 + 1] = rand(0.5, 2.2);
            setColor(starsPts, i, starCols[Math.floor(Math.random() * starCols.length)]);
        }
        scene.add(starsPts);

        /* drifting dust: gives a sense of speed while the camera pulls back */
        var dust = makeGlowPoints(DUST_COUNT, false);
        var dp = dust.geometry.attributes.position.array;
        var ds = dust.geometry.attributes.aSize.array;
        var da = dust.geometry.attributes.aAlpha.array;
        for (i = 0; i < DUST_COUNT; i++) {
            var rr = rand(1.4, 7.5);
            var t2 = Math.random() * Math.PI * 2, p2 = Math.acos(2 * Math.random() - 1);
            dp[i * 3] = rr * Math.sin(p2) * Math.cos(t2);
            dp[i * 3 + 1] = rr * Math.sin(p2) * Math.sin(t2);
            dp[i * 3 + 2] = rr * Math.cos(p2);
            ds[i] = rand(1.1, 2.2);
            da[i] = rand(0.07, 0.2);
            setColor(dust, i, 0xcfe6ff);
        }
        scene.add(dust);

        /* lighting */
        scene.add(new THREE.AmbientLight(0x38507a, 1.15));
        var sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
        sunLight.position.copy(SUN).multiplyScalar(5);
        scene.add(sunLight);

        /* planet group: everything attached to the ground rotates together */
        world = new THREE.Group();
        scene.add(world);

        var dayMap = loader.load('img/earth_atmos_2048.jpg');
        dayMap.anisotropy = aniso;
        var cloudMap = loader.load('img/earth_clouds_1024.png');
        var lightsMap = loader.load('img/earth_lights_1024.jpg');

        earth = new THREE.Mesh(
            new THREE.SphereGeometry(1, 64, 64),
            new THREE.MeshPhongMaterial({ map: dayMap, specular: 0x222233, shininess: 9 })
        );
        world.add(earth);

        /* city lights on the night side */
        nightMat = new THREE.ShaderMaterial({
            uniforms: { tLights: { value: lightsMap }, uSun: { value: SUN.clone() }, uStrength: { value: 0 } },
            vertexShader: [
                'varying vec2 vUv;',
                'varying vec3 vN;',
                'void main() {',
                '  vUv = uv;',
                '  vN = normalize(mat3(modelMatrix) * normal);',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform sampler2D tLights;',
                'uniform vec3 uSun;',
                'uniform float uStrength;',
                'varying vec2 vUv;',
                'varying vec3 vN;',
                'void main() {',
                '  float l = texture2D(tLights, vUv, 1.0).r;',
                '  l = smoothstep(0.1, 0.5, l);',
                '  float night = smoothstep(0.10, -0.30, dot(normalize(vN), normalize(uSun)));',
                '  vec3 col = mix(vec3(1.0, 0.62, 0.22), vec3(1.0, 0.9, 0.68), l);',
                '  gl_FragColor = vec4(col * l * night * uStrength * 1.9, 1.0);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        world.add(new THREE.Mesh(new THREE.SphereGeometry(1.003, 64, 64), nightMat));

        clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.012, 64, 64),
            new THREE.MeshLambertMaterial({ map: cloudMap, transparent: true, opacity: 0.55 })
        );
        world.add(clouds);

        /* atmosphere rim glow */
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

        /* the three original orbit rings + their feature satellites */
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

        buildConstellation();
        buildNetwork();
        buildMeteors();

        glowMats.forEach(function (m) { m.uniforms.uPR.value = renderer.getPixelRatio(); });
        window.addEventListener('resize', onResize, { passive: true });

        // never wait on slow textures forever
        window.setTimeout(start, 3500);
    }

    /* ---------- telecom constellation ---------- */
    function buildConstellation() {
        var N = SAT_COUNT;
        constellation = makeGlowPoints(N, false);
        var satCols = [0xa8fff0, 0xa8fff0, 0xa8fff0, 0xffffff, 0xffffff, 0xffc94d, 0x6fb4ff];
        var list = [];
        SHELLS.forEach(function (sh, si) {
            var n = Math.round(sh.frac * N);
            var perPlane = Math.max(1, Math.ceil(n / sh.planes));
            var inc = sh.inc * Math.PI / 180;
            var made = 0;
            for (var p = 0; p < sh.planes && made < n; p++) {
                var raan = (p / sh.planes) * Math.PI * 2 + rand(-0.15, 0.15);
                var ux = Math.cos(raan), uz = Math.sin(raan);
                var px = -Math.sin(raan), pz = Math.cos(raan);
                var vx = Math.cos(inc) * px, vy = Math.sin(inc), vz = Math.cos(inc) * pz;
                var dirSign = (si === 2 && p % 2 === 1) ? -1 : 1;
                for (var k = 0; k < perPlane && made < n; k++, made++) {
                    list.push({
                        r: sh.r + rand(-0.012, 0.012),
                        ux: ux, uy: 0, uz: uz, vx: vx, vy: vy, vz: vz,
                        th: (k / perPlane) * Math.PI * 2 + rand(-0.12, 0.12),
                        om: dirSign * 0.00062 / Math.pow(sh.r, 1.5),
                        size: si === 4 ? rand(6.2, 7.6) : rand(4.4, 6.2),
                        reveal: rand(0.14, 0.82),
                        fr: rand(0.0012, 0.0042), ph: rand(0, 6.28)
                    });
                }
            }
        });
        // pad/truncate to exactly N points
        while (list.length < N) list.push(list[list.length - 1]);
        constellation.userData.list = list.slice(0, N);
        constellation.userData.list.forEach(function (s, i) {
            setColor(constellation, i, satCols[Math.floor(Math.random() * satCols.length)]);
        });
        scene.add(constellation);
    }

    function updateConstellation(tp) {
        var list = constellation.userData.list;
        var pos = constellation.geometry.attributes.position.array;
        var sz = constellation.geometry.attributes.aSize.array;
        var al = constellation.geometry.attributes.aAlpha.array;
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var th = s.th + s.om * simTime;
            var c = Math.cos(th) * s.r, sn = Math.sin(th) * s.r;
            pos[i * 3] = c * s.ux + sn * s.vx;
            pos[i * 3 + 1] = c * s.uy + sn * s.vy;
            pos[i * 3 + 2] = c * s.uz + sn * s.vz;
            sz[i] = s.size * smoothstep(s.reveal, s.reveal + 0.08, tp);
            al[i] = 0.78 + 0.22 * Math.sin(simTime * s.fr + s.ph);
        }
        constellation.geometry.attributes.position.needsUpdate = true;
        constellation.geometry.attributes.aSize.needsUpdate = true;
        constellation.geometry.attributes.aAlpha.needsUpdate = true;
    }

    /* ---------- cities, data arcs, pulses ---------- */
    function buildNetwork() {
        var vecs = CITIES.map(function (c) { return latLonToVec3(c[1], c[2], 1.01); });
        var hub = vecs[0];

        // order spokes by distance from Guadalajara so the network spreads outward
        var order = [], i;
        SPOKES.forEach(function (i) { order.push({ i: i, ang: hub.angleTo(vecs[i]) }); });
        order.sort(function (a, b) { return a.ang - b.ang; });

        cityPts = makeGlowPoints(CITIES.length, false);
        for (i = 0; i < CITIES.length; i++) {
            setColor(cityPts, i, 0xbffff4);
            var p = cityPts.geometry.attributes.position.array;
            p[i * 3] = vecs[i].x; p[i * 3 + 1] = vecs[i].y; p[i * 3 + 2] = vecs[i].z;
            cityInfo.push({ start: i === 0 ? 0 : 0.99, size: i === 0 ? 0 : 5.5 });
        }
        world.add(cityPts);

        var teal = new THREE.LineBasicMaterial({ color: 0x22e0c4, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
        var amber = new THREE.LineBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
        var SEG = 48;

        function addArc(a, b, mat, start, dur, pulseHex, pulses) {
            var A = vecs[a], B = vecs[b];
            var ang = A.angleTo(B);
            var peak = 1.035 + 0.2 * (ang / Math.PI);
            var rc = 2 * peak - Math.cos(ang / 2);
            var mid = A.clone().add(B);
            if (mid.length() < 0.001) return;
            mid.normalize().multiplyScalar(rc);
            var curve = new THREE.QuadraticBezierCurve3(A.clone(), mid, B.clone());
            var geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG));
            geo.setDrawRange(0, 0);
            var line = new THREE.Line(geo, mat);
            line.frustumCulled = false;
            world.add(line);
            arcs.push({ curve: curve, line: line, start: start, dur: dur, to: b, from: a, prog: 0 });
            cityInfo[a].start = Math.min(cityInfo[a].start, start);
            cityInfo[b].start = Math.min(cityInfo[b].start, start);
            for (var q = 0; q < pulses; q++) {
                pulseInfo.push({ arc: arcs.length - 1, off: Math.random(), speed: rand(0.00006, 0.00012), hex: pulseHex });
            }
        }

        order.forEach(function (o, idx) {
            var start = 0.26 + 0.5 * (idx / Math.max(1, order.length - 1));
            addArc(0, o.i, teal, start, 0.16, 0xa8fff0, 2);
        });
        EXTRA_LINKS.forEach(function (pair) {
            addArc(pair[0], pair[1], amber, 0.45 + Math.random() * 0.35, 0.18, 0xffd36b, 1);
        });

        pulsePts = makeGlowPoints(pulseInfo.length, false);
        pulseInfo.forEach(function (pi, k) {
            setColor(pulsePts, k, pi.hex);
            pulsePts.geometry.attributes.aSize.array[k] = 0;
        });
        world.add(pulsePts);

        // Guadalajara: the hub dot + two ripples that expand outward
        var hubVec = latLonToVec3(20.67, -103.35, 1.004);
        hubDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
        hubDot.position.copy(hubVec);
        world.add(hubDot);
        var zAxis = new THREE.Vector3(0, 0, 1), hubN = hubVec.clone().normalize();
        for (var q2 = 0; q2 < 2; q2++) {
            var rm = new THREE.Mesh(
                new THREE.RingGeometry(0.92, 1, 56),
                new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            rm.position.copy(hubVec);
            rm.quaternion.setFromUnitVectors(zAxis, hubN);
            world.add(rm);
            ripples.push(rm);
        }
    }

    function updateNetwork(tp) {
        // cities
        var cs = cityPts.geometry.attributes.aSize.array;
        for (var i = 0; i < cityInfo.length; i++) {
            cs[i] = cityInfo[i].size * smoothstep(cityInfo[i].start, cityInfo[i].start + 0.06, tp);
        }
        cityPts.geometry.attributes.aSize.needsUpdate = true;

        // arcs
        for (var a = 0; a < arcs.length; a++) {
            var arc = arcs[a];
            arc.prog = clamp01((tp - arc.start) / arc.dur);
            arc.line.geometry.setDrawRange(0, Math.floor(arc.prog * 49));
        }

        // pulses riding the finished arcs
        var pp = pulsePts.geometry.attributes.position.array;
        var ps = pulsePts.geometry.attributes.aSize.array;
        for (var k = 0; k < pulseInfo.length; k++) {
            var info = pulseInfo[k], ar = arcs[info.arc];
            if (ar.prog < 1) { ps[k] = 0; continue; }
            var u = (info.off + simTime * info.speed) % 1;
            ar.curve.getPoint(u, tmpV);
            pp[k * 3] = tmpV.x; pp[k * 3 + 1] = tmpV.y; pp[k * 3 + 2] = tmpV.z;
            ps[k] = 4.6 * (0.5 + 0.5 * Math.sin(u * Math.PI));
        }
        pulsePts.geometry.attributes.position.needsUpdate = true;
        pulsePts.geometry.attributes.aSize.needsUpdate = true;

        // hub ripples + dot pulse
        hubDot.scale.setScalar(1 + Math.sin(simTime * 0.006) * 0.35);
        for (var q = 0; q < ripples.length; q++) {
            var p = ((simTime / 2600) + q * 0.5) % 1;
            ripples[q].scale.setScalar(0.014 + 0.12 * p);
            ripples[q].material.opacity = 0.75 * Math.pow(1 - p, 1.6) * smoothstep(0, 0.08, p);
        }

        nightMat.uniforms.uStrength.value = smoothstep(0.0, 0.35, tp);
    }

    /* ---------- meteors ---------- */
    function buildMeteors() {
        for (var i = 0; i < 3; i++) {
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
            geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.9, 0.97, 1]), 3));
            var mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
            var line = new THREE.Line(geo, mat);
            line.frustumCulled = false;
            line.visible = false;
            scene.add(line);
            meteors.push({ line: line, active: false, t0: 0, life: 1100, head: new THREE.Vector3(), dir: new THREE.Vector3(), len: 1.6, speed: 9 });
        }
    }

    function spawnMeteor(m) {
        camera.updateMatrixWorld();
        camera.matrixWorld.extractBasis(camRight, camUp, camZ);
        camera.getWorldDirection(camFwd);
        var d = 16;
        var halfH = d * Math.tan(22.5 * Math.PI / 180), halfW = halfH * camera.aspect;
        m.head.copy(camera.position)
            .addScaledVector(camFwd, d)
            .addScaledVector(camRight, rand(-0.9, 0.9) * halfW)
            .addScaledVector(camUp, rand(-0.8, 0.8) * halfH);
        var a = rand(0.25, 0.9), sx = Math.random() < 0.5 ? -1 : 1;
        m.dir.set(0, 0, 0).addScaledVector(camRight, Math.cos(a) * sx).addScaledVector(camUp, -Math.sin(a)).normalize();
        m.t0 = simTime;
        m.life = rand(900, 1300);
        m.active = true;
        m.line.visible = true;
    }

    function updateMeteors(tp, k) {
        if (tp > 0.2 && simTime > nextMeteorAt) {
            for (var i = 0; i < meteors.length; i++) {
                if (!meteors[i].active) { spawnMeteor(meteors[i]); break; }
            }
            nextMeteorAt = simTime + rand(1600, 4200);
        }
        for (var j = 0; j < meteors.length; j++) {
            var m = meteors[j];
            if (!m.active) continue;
            var p = (simTime - m.t0) / m.life;
            if (p >= 1) { m.active = false; m.line.visible = false; continue; }
            m.head.addScaledVector(m.dir, m.speed * (k * 16.667 / 1000));
            var pos = m.line.geometry.attributes.position.array;
            pos[0] = m.head.x - m.dir.x * m.len; pos[1] = m.head.y - m.dir.y * m.len; pos[2] = m.head.z - m.dir.z * m.len;
            pos[3] = m.head.x; pos[4] = m.head.y; pos[5] = m.head.z;
            m.line.geometry.attributes.position.needsUpdate = true;
            m.line.material.opacity = Math.sin(p * Math.PI) * 0.9;
        }
    }

    /* ---------- loop ---------- */
    function onResize() {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function disposeAll() {
        try {
            window.removeEventListener('resize', onResize);
            scene.traverse(function (o) {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
                        if (m.map) m.map.dispose();
                        m.dispose();
                    });
                }
            });
            renderer.dispose();
            if (renderer.forceContextLoss) renderer.forceContextLoss();
        } catch (e) { /* nothing left to free */ }
    }

    function start() {
        if (started || closed) return;
        started = true;
        raf = requestAnimationFrame(frame);
    }

    function frame(ts) {
        if (closed && ts - closedAt > 1000) { disposeAll(); return; }
        if (startTime === null) { startTime = ts; lastTs = ts; }
        var dt = Math.min(ts - lastTs, 50);
        lastTs = ts;
        var k = dt / 16.667;              // frame-equivalent factor, keeps speed identical on 60/90/120 Hz
        simTime = ts - startTime;

        // if the device struggles, quietly drop to pixel ratio 1
        if (!perfChecked && simTime > 400) {
            perfFrames++; perfSum += dt;
            if (perfFrames >= 70) {
                perfChecked = true;
                if (perfSum / perfFrames > 38 && renderer.getPixelRatio() > 1) {
                    renderer.setPixelRatio(1);
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    glowMats.forEach(function (m) { m.uniforms.uPR.value = 1; });
                }
            }
        }

        var t = Math.min(simTime / ZOOM_MS, 1);
        var eased = easeInOutCubic(t);
        var radius = START_R + (END_R - START_R) * eased;

        var camPos = dir.clone().multiplyScalar(radius);
        // gentle lateral drift so the reveal doesn't feel perfectly locked-off
        camPos.x += Math.sin(eased * Math.PI) * 0.25;
        // after the zoom ends, a very slow breathing drift keeps the scene alive
        if (t >= 1) camPos.y += Math.sin((simTime - ZOOM_MS) * 0.0004) * 0.12;
        camera.position.copy(camPos);
        // frame the planet slightly above center so the text + button have room below
        camera.lookAt(0, -0.6 * eased, 0);

        // the planet only starts turning near the end of the zoom, so the camera stays on Guadalajara
        var spin = smoothstep(0.75, 1.0, t);
        world.rotation.y += 0.0009 * k * spin;
        clouds.rotation.y += 0.0005 * k * spin;
        backdrop.rotateY(0.00004 * k);

        satellites.forEach(function (s) { s.pivot.rotation.z += 0.0016 * s.speed * 10 * k; });

        starsPts.material.uniforms.uTime.value = simTime / 1000;
        updateConstellation(t);
        updateNetwork(t);
        updateMeteors(t, k);

        if (textEl && t > 0.55 && !textEl.classList.contains('vis')) {
            textEl.classList.add('vis');
        }
        if (enterBtn && t >= 1 && !enterBtn.classList.contains('vis')) {
            enterBtn.classList.add('vis');
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
    }

    try {
        init();
    } catch (e) {
        closeOverlay(true);
    }
})();
