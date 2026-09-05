// MOTION PREFERENCE
var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// SCROLL REVEAL (.rv / .rvl / .rvr) — real IntersectionObserver, with a safety net
// so content is never left invisible if something goes wrong.
(function () {
    var targets = document.querySelectorAll('.rv, .rvl, .rvr');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        document.documentElement.classList.add('no-reveal');
        return;
    }

    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('vis');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { obs.observe(el); });

    // Safety net: guarantee everything is visible a few seconds after load,
    // even if a target never intersects (e.g. hidden container, edge case).
    setTimeout(function () {
        targets.forEach(function (el) { el.classList.add('vis'); });
    }, 3500);
})();

// HERO PARALLAX — subtle cursor-driven depth on the hero photo itself.
// The image is never hidden or swapped, only nudged a few pixels for depth.
(function () {
    if (prefersReducedMotion) return;
    var hero = document.querySelector('.hero');
    var img = document.querySelector('.hero-media img');
    if (!hero || !img || !window.matchMedia('(pointer: fine)').matches) return;

    hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width - .5) * 18;
        var py = ((e.clientY - r.top) / r.height - .5) * 12;
        img.style.setProperty('--px', px.toFixed(1) + 'px');
        img.style.setProperty('--py', py.toFixed(1) + 'px');
    }, { passive: true });

    hero.addEventListener('mouseleave', function () {
        img.style.setProperty('--px', '0px');
        img.style.setProperty('--py', '0px');
    }, { passive: true });
})();

// 3D TILT — service cards follow the cursor for a real 3D perspective effect.
(function () {
    if (prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    var cards = document.querySelectorAll('.scard');
    if (!cards.length) return;

    cards.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var r = card.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width;
            var py = (e.clientY - r.top) / r.height;
            var rx = (0.5 - py) * 10;
            var ry = (px - 0.5) * 12;
            card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
        }, { passive: true });

        card.addEventListener('mouseleave', function () {
            card.style.transform = '';
        }, { passive: true });
    });
})();

// CHAPTER RAIL — scroll-spy + click-to-scroll for the cinematic services sequence
(function () {
    var rail = document.querySelector('.chrail');
    var chapters = document.querySelectorAll('.chapter');
    if (!rail || !chapters.length) return;

    var items = rail.querySelectorAll('.chrail-item');
    items.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = document.getElementById(btn.getAttribute('data-target'));
            if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        });
    });

    if ('IntersectionObserver' in window) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.id;
                items.forEach(function (btn) {
                    btn.classList.toggle('active', btn.getAttribute('data-target') === id);
                });
            });
        }, { threshold: .5 });
        chapters.forEach(function (ch) { spy.observe(ch); });
    }
})();

// THEME TOGGLE
function toggleTheme() {
    var isLight = document.body.classList.toggle('light');
    try { localStorage.setItem('tp_theme', isLight ? 'light' : 'dark'); } catch (e) { }
}

// Restaurar tema guardado al cargar
(function () {
    try {
        if (localStorage.getItem('tp_theme') === 'light') document.body.classList.add('light');
    } catch (e) { }
})();

// NAV
window.addEventListener('scroll', function () {
    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('on', window.scrollY > 40);
}, { passive: true });

// MOBILE MENU
function tmob() {
    var nav = document.getElementById('mnav');
    var btn = document.getElementById('hbg');
    if (!nav || !btn) return;
    var isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function cmob() {
    var nav = document.getElementById('mnav');
    var btn = document.getElementById('hbg');
    if (nav) nav.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

// COUNTERS
function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

function counter(el, target, suffix, dur) {
    if (!el) return;
    var start = performance.now();
    function step(now) {
        var p = Math.min((now - start) / dur, 1);
        el.textContent = Math.floor(easeOut(p) * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
}

(function () {
    var stats = document.getElementById('sr');
    if (!stats || !('IntersectionObserver' in window)) {
        counter(document.getElementById('c2'), 8, '+', 800);
        return;
    }

    var ran = false;
    var cobs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !ran) {
                ran = true;
                counter(document.getElementById('c2'), 8, '+', 800);
                cobs.disconnect();
            }
        });
    }, { threshold: .25 });
    cobs.observe(stats);
})();

// FAQ
function ftog(btn) {
    var item = btn.closest('.fi');
    if (!item) return;
    var open = item.classList.contains('open');
    document.querySelectorAll('.fi.open').forEach(function (i) { i.classList.remove('open'); });
    if (!open) item.classList.add('open');
}

// FORMULARIO - Web3Forms
async function smail(e) {
    e.preventDefault();
    var b = document.getElementById('sb');
    var form = document.getElementById('cForm');
    var email = document.getElementById('fe');
    var name = document.getElementById('fn');
    var message = document.getElementById('fm');
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!b || !form || !email || !name || !message) return;

    if (!name.value || !message.value || !emailRegex.test(email.value)) {
        b.textContent = 'Por favor, llena los campos correctamente';
        b.style.background = '#ff4a6e';
        setTimeout(function () {
            b.textContent = 'Enviar Solicitud \u2192';
            b.style.background = '';
        }, 3000);
        return;
    }

    b.textContent = 'Enviando...';
    b.disabled = true;
    b.style.opacity = '.7';

    try {
        var res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: new FormData(form)
        });
        var json = await res.json();
        if (!json.success) throw new Error('Error');

        b.textContent = '\u2713 Mensaje enviado';
        b.style.background = '#27c97b';
        b.style.opacity = '1';
        form.reset();
    } catch (err) {
        b.textContent = 'Error al enviar - intentalo de nuevo';
        b.style.background = '#ff4a6e';
        b.style.opacity = '1';
    } finally {
        setTimeout(function () {
            b.textContent = 'Enviar Solicitud \u2192';
            b.style.background = '';
            b.disabled = false;
            b.style.opacity = '1';
        }, 4000);
    }
}
