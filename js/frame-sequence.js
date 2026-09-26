/* FRAME SEQUENCE — sequência de frames controlada por ScrollTrigger.
   Módulos: FrameLoader (progressivo) + FrameRenderer (canvas cover) +
   ScrollController (GSAP pin/scrub) + ResponsiveController (DPR/resize).
   Trocar vídeo: gerar images/frames/frame_%04d.webp e ajustar FRAMES.count. */
(function frameSequence() {
    'use strict';

    var FRAMES = {
        base: 'images/frames',
        prefix: 'frame_',
        digits: 4,
        ext: 'webp',
        count: 96,
        frameW: 1280,
        frameH: 720,
        lerp: 0.045,
        concurrency: 6,
        framesEnd: 0.62,
        titleStart: 45,
        titleEnd: 95,
        hlStart: 68,
        hlEnd: 95
    };

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var homeView = document.getElementById('view-home');
    var hero = document.querySelector('#view-home .home-hero');
    var wrap = document.querySelector('[data-frame-wrap]');
    var canvas = document.querySelector('[data-frame-canvas]');
    if (!homeView || !hero || !wrap || !canvas) return;

    var debug = /[?&]debug=frames/.test(location.search);
    var debugEl = document.querySelector('[data-frame-debug]');

    try {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch (e) {}

    /* ---------- FrameLoader ---------- */
    var images = new Array(FRAMES.count);
    var pending = {};
    var loaded = 0;
    var progressEl = document.querySelector('[data-frame-progress]');

    function frameURL(i) {
        return FRAMES.base + '/' + FRAMES.prefix + String(i + 1).padStart(FRAMES.digits, '0') + '.' + FRAMES.ext;
    }

    function loadOne(i) {
        if (images[i] && images[i].naturalWidth) return Promise.resolve(true);
        if (pending[i]) return pending[i];
        pending[i] = new Promise(function (resolve) {
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () {
                images[i] = img;
                loaded += 1;
                if (progressEl) progressEl.style.transform = 'scaleX(' + (loaded / FRAMES.count) + ')';
                resolve(true);
            };
            img.onerror = function () { resolve(false); };
            img.src = frameURL(i);
        });
        return pending[i];
    }

    function loadAll() {
        var queue = [];
        for (var i = 0; i < FRAMES.count; i++) queue.push(i);

        var workers = [];
        for (var w = 0; w < FRAMES.concurrency; w++) {
            workers.push((function next() {
                var i = queue.shift();
                if (i === undefined) return Promise.resolve();
                return loadOne(i).then(next);
            })());
        }
        return Promise.all(workers);
    }

    /* ---------- FrameRenderer (cover, DPR capado) ---------- */
    var ctx = canvas.getContext('2d');
    var isNarrowViewport = function () {
        return window.matchMedia('(max-width: 820px)').matches;
    };
    var dprCap = isNarrowViewport() ? 1.25 : 1.75;
    var canvasW = 0;
    var canvasH = 0;
    var currentIndex = -1;

    function sizeCanvas() {
        var vw = window.innerWidth || 1280;
        var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 800;
        var w = vw;
        var h = vh;
        if (currentViewName() !== 'home') {
            var rect = hero.getBoundingClientRect();
            if (rect.width > 2 && rect.height > 2) {
                w = rect.width;
                h = rect.height;
            }
        }
        var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
        canvasW = Math.max(1, Math.round(w * dpr));
        canvasH = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== canvasW || canvas.height !== canvasH) {
            canvas.width = canvasW;
            canvas.height = canvasH;
        }
        currentIndex = -1;
        render(currentFloat);
    }

    function drawCover(img) {
        var scale = Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
        var portrait = canvasH > canvasW;
        if (portrait || isNarrowViewport()) scale *= 1.05;
        var w = img.naturalWidth * scale;
        var h = img.naturalHeight * scale;
        var fx = 0.5;
        var fy = (portrait || isNarrowViewport()) ? 0.35 : 0.5;
        ctx.fillStyle = '#05070c';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, (canvasW - w) * fx, (canvasH - h) * fy, w, h);
    }

    function markReady() {
        if (canvas.classList) canvas.classList.add('is-ready');
    }

    function render(f) {
        if (!isFinite(f)) return;
        var idx = Math.max(0, Math.min(FRAMES.count - 1, Math.round(f)));
        if (idx === currentIndex) return;
        var img = images[idx];
        if (!img || !img.complete || !img.naturalWidth) return;
        currentIndex = idx;
        drawCover(img);
        markReady();
        if (idx !== dbgFrame) { dbgFrame = idx; paintDebug(); }
    }

    /* ---------- CineController: frames primeiro, conteúdo depois ---------- */
    var titleEl = hero.querySelector('[data-cine="title"]');
    var copyEl = hero.querySelector('[data-cine="copy"]');
    var actionsEl = hero.querySelector('[data-cine="actions"]');
    var pathsEl = hero.querySelector('[data-cine="paths"]');
    var caminhoEls = pathsEl ? Array.prototype.slice.call(pathsEl.querySelectorAll('.caminho')) : [];
    var pulsoEl = pathsEl ? pathsEl.querySelector('.caminho-pulso') : null;
    var drawGroups = caminhoEls.map(function (c) {
        return Array.prototype.slice.call(c.querySelectorAll('svg .draw'));
    });
    var noEls = caminhoEls.map(function (c) { return c.querySelector('.caminho-no'); });
    var drawSmooth = 0;
    var hlSmooth = 0;
    var pulseSmooth = 0;
    var targetPulse = 0;
    var pulseTrackW = -1;
    function paintPulse(p) {
        if (!pulsoEl || !pathsEl) return;
        p = Math.max(0, Math.min(1, p));
        pulsoEl.style.opacity = (p > 0.005 && p < 0.999) ? '1' : '0';
        var pc = p < 0.33 ? '#ff5d73' : (p < 0.66 ? '#ffd60a' : '#2ea968');
        pulsoEl.style.setProperty('--pulso-c', pc);
        if (pulseTrackW < 0) pulseTrackW = pathsEl.offsetWidth - 44;
        if (pulseTrackW > 0) pulsoEl.style.transform = 'translate(-50%, -50%) translate3d(' + (p * pulseTrackW).toFixed(1) + 'px, 0, 0)';
    }
    function easeInOut(t) {
        t = Math.max(0, Math.min(1, t));
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    var panelEl = hero.querySelector('[data-cine="panel"]');
    var metricEls = Array.prototype.slice.call(hero.querySelectorAll('[data-cine="metric"]'));
    var splitInstance = null;
    var wordEls = [];
    var titleText = titleEl ? titleEl.textContent.trim() : '';
    var splitDone = false;
    var metricsFired = false;
    var dbgFrame = -1;
    var dbgCp = -1;
    var dbgWords = '';
    var dbgSt = -1;

    function seg(p, a, b) {
        if (p <= a) return 0;
        if (p >= b) return 1;
        return (p - a) / (b - a);
    }

    function paintDebug() {
        if (!debug || !debugEl) return;
        var parts = [];
        if (dbgFrame >= 0) {
            parts.push('frame ' + (dbgFrame + 1) + '/' + FRAMES.count +
                ' · progress ' + (dbgFrame / (FRAMES.count - 1)).toFixed(3) +
                ' · loaded ' + loaded + '/' + FRAMES.count);
        }
        parts.push('fase ' + (dbgCp > 0.02 ? 'conteúdo' : 'frames'));
        if (st) parts.push('range ' + Math.round(st.start) + '→' + Math.round(st.end));
        if (dbgSt >= 0) parts.push('st ' + dbgSt.toFixed(3));
        if (dbgWords) parts.push('palavras ' + dbgWords);
        debugEl.textContent = parts.join(' · ');
    }

    function setSt(p) {
        var r = Math.round(p * 1000) / 1000;
        if (r !== dbgSt) { dbgSt = r; paintDebug(); }
    }

    function ensureSplit() {
        if (splitDone || !titleEl) return;
        splitDone = true;
        // SplitText é plugin Club pago — CDN pode 403/404. Fallback próprio
        // sempre disponível garante o anúncio SR do título (aria-label).
        try {
            fallbackSplit();
        } catch (e) {}
        if (!wordEls.length && titleEl) fallbackSplit();
        wordEls.forEach(function (w) {
            if (w.closest && w.closest('.hl')) w.classList.add('in-hl');
        });
        applyCine(currentContent, true);
    }

    function fallbackSplit() {
        if (!titleEl) return;
        titleEl.setAttribute('aria-label', titleText);
        var nodes = Array.prototype.slice.call(titleEl.childNodes);
        titleEl.innerHTML = '';
        wordEls = [];
        nodes.forEach(function (node) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('hl')) {
                var hl = document.createElement('span');
                hl.className = 'hl';
                hl.setAttribute('aria-hidden', 'true');
                titleEl.appendChild(hl);
                String(node.textContent).split(/\s+/).forEach(function (w) {
                    if (!w) return;
                    var s = document.createElement('span');
                    s.className = 'cine-word in-hl';
                    s.setAttribute('aria-hidden', 'true');
                    s.style.display = 'inline-block';
                    var fill = document.createElement('span');
                    fill.className = 'hl-fill';
                    fill.setAttribute('aria-hidden', 'true');
                    var tx = document.createElement('span');
                    tx.className = 'hl-text';
                    tx.textContent = w;
                    s.appendChild(fill);
                    s.appendChild(tx);
                    hl.appendChild(s);
                    hl.appendChild(document.createTextNode(' '));
                    wordEls.push(s);
                });
                titleEl.appendChild(document.createTextNode(' '));
            } else {
                String(node.textContent || '').split(/\s+/).forEach(function (w) {
                    if (!w) return;
                    var s = document.createElement('span');
                    s.className = 'cine-word';
                    s.setAttribute('aria-hidden', 'true');
                    s.textContent = w;
                    titleEl.appendChild(s);
                    titleEl.appendChild(document.createTextNode(' '));
                    wordEls.push(s);
                });
            }
        });
    }

    function setBlock(el, p) {
        if (!el) return;
        var t = Math.max(0, Math.min(1, p));
        var o = t * t * (3 - 2 * t);
        el.style.opacity = o.toFixed(3);
        el.style.transform = 'translate3d(0, ' + ((1 - o) * 22).toFixed(1) + 'px, 0)';
        el.style.filter = '';
        el.style.visibility = o <= 0.01 ? 'hidden' : 'visible';
        el.style.pointerEvents = o <= 0.01 ? 'none' : 'auto';
    }

    function applyCine(cp, force) {
        cp = Math.max(0, Math.min(1, cp));
        hero.classList.toggle('is-content-in', cp > 0.02);
        if (!splitDone) return;
        var frameNow = currentFloat;
        var titleGate = seg(frameNow, FRAMES.titleStart, FRAMES.titleStart + 5);
        var twFrame = seg(frameNow, FRAMES.titleStart, FRAMES.titleEnd);
        var twContent = seg(cp, 0, 0.38);
        var tw = Math.max(twFrame, twContent);
        var hlContent = seg(cp, 0.30, 0.68);
        var hlTarget = hlContent;
        if (force) hlSmooth = hlTarget;
        else {
            hlSmooth += (hlTarget - hlSmooth) * 0.18;
            if (Math.abs(hlTarget - hlSmooth) < 0.0005) hlSmooth = hlTarget;
        }
        var hlP = easeInOut(hlSmooth);
        if (titleEl) {
            titleEl.classList.toggle('is-hl-on', hlP > 0.05);
            titleEl.style.visibility = titleGate <= 0.01 ? 'hidden' : 'visible';
        }
        if (wordEls.length) {
            var n = wordEls.length;
            for (var i = 0; i < n; i++) {
                var local = Math.max(0, Math.min(1, tw * n - i));
                if (!force && wordEls[i]._cine === local && wordEls[i]._gate === titleGate) {
                    // ainda atualiza o highlight mesmo sem mudança de opacidade
                } else {
                    wordEls[i]._cine = local;
                    wordEls[i]._gate = titleGate;
                    var wOp = titleGate <= 0.01 ? 0 : local;
                    wordEls[i].style.opacity = wOp.toFixed(3);
                    wordEls[i].style.transform = 'translate3d(0, ' + ((1 - local) * 14).toFixed(1) + 'px, 0)';
                }
            }
            var hlEls = [];
            for (var hj = 0; hj < n; hj++) {
                if (wordEls[hj].classList && wordEls[hj].classList.contains('in-hl')) hlEls.push(wordEls[hj]);
            }
            for (var hk = 0; hk < hlEls.length; hk++) {
                var start = hk === 0 ? 0 : 0.5;
                var end = hk === 0 ? 0.5 : 1;
                var frac = Math.max(0, Math.min(1, (hlP - start) / (end - start)));
                frac = frac * frac * (3 - 2 * frac);
                var fill = hlEls[hk].querySelector ? hlEls[hk].querySelector('.hl-fill') : null;
                var txt = hlEls[hk].querySelector ? hlEls[hk].querySelector('.hl-text') : null;
                if (fill) fill.style.transform = 'scaleX(' + frac.toFixed(3) + ')';
                if (txt) txt.style.color = frac > 0.55 ? '#04140c' : '';
            }
            if (debug && debugEl) {
                var vis = Math.floor(tw * n);
                var key = vis + '/' + n;
                if (key !== dbgWords) { dbgWords = key; paintDebug(); }
            }
        } else if (titleEl) {
            setBlock(titleEl, seg(cp, 0, 0.38));
        }
        setBlock(copyEl, seg(cp, 0.38, 0.52));
        setBlock(actionsEl, seg(cp, 0.48, 0.62));
        setBlock(pathsEl, seg(cp, 0.58, 0.66));
        var pp = seg(cp, 0.70, 0.88);
        caminhoEls.forEach(function (c, k) {
            setBlock(c, seg(cp, 0.60 + k * 0.07, 0.72 + k * 0.07));
        });
        if (pathsEl) {
            pathsEl.style.setProperty('--paths-p', pp.toFixed(3));
            pathsEl.classList.toggle('is-paths-done', pp >= 0.999);
        }
        var ppDrawTarget = easeInOut(pp);
        drawSmooth += (ppDrawTarget - drawSmooth) * (force ? 1 : 0.22);
        if (Math.abs(ppDrawTarget - drawSmooth) < 0.0005) drawSmooth = ppDrawTarget;
        var pd = drawSmooth;
        for (var g = 0; g < drawGroups.length; g++) {
            var glocal = easeInOut(seg(pd, g * 0.22, 0.56 + g * 0.22));
            var paths = drawGroups[g];
            for (var q = 0; q < paths.length; q++) {
                var sub = easeInOut(seg(glocal, q * 0.25, 0.70 + q * 0.15));
                paths[q].style.strokeDashoffset = (1 - sub).toFixed(4);
            }
            if (noEls[g]) {
                var pop = 0.90 + 0.10 * glocal;
                noEls[g].style.transform = 'scale(' + pop.toFixed(3) + ')';
                noEls[g].style.opacity = (0.35 + 0.65 * Math.max(glocal, seg(cp, 0.60 + g * 0.07, 0.72 + g * 0.07))).toFixed(3);
            }
        }
        targetPulse = easeInOut(pp);
        if (force) pulseSmooth = targetPulse;
        paintPulse(force ? targetPulse : pulseSmooth);
        setBlock(panelEl, seg(cp, 0.84, 0.94));
        var mp = seg(cp, 0.90, 1);
        metricEls.forEach(function (m, k) {
            setBlock(m, seg(cp, 0.90 + k * 0.05, 0.97 + k * 0.03));
        });
        if (mp > 0.4 && !metricsFired) {
            metricsFired = true;
            fireHomeMetrics();
        } else if (mp <= 0.15 && metricsFired) {
            metricsFired = false;
            resetHomeMetrics();
        }
        if (cp !== dbgCp) { dbgCp = cp; dbgWords = ''; paintDebug(); }
    }

    /* ---------- ScrollController (GSAP) + interpolação ---------- */
    var targetFloat = 0;
    var currentFloat = 0;
    var targetContent = 0;
    var currentContent = 0;
    var rafId = 0;
    var st = null;
    var mm = null;
    var active = false;
    var lastTick = 0;
    var tickCount = 0;
    var lastDiff = 0;
    var lastErr = '';
    var lastFramesDone = false;

    function setChrome(show) {
        show = !!show;
        if (show === lastFramesDone) return;
        lastFramesDone = show;
        document.body.classList.toggle('is-frames-done', show);
        if (!show) {
            var widget = document.querySelector('[data-chatbot]');
            if (widget && widget.classList.contains('is-open')) {
                widget.classList.remove('is-open');
                var t = widget.querySelector('[data-chatbot-toggle]');
                if (t) t.setAttribute('aria-expanded', 'false');
            }
        }
    }

    function initChromeObserver() {
        var alvo = document.getElementById('diferenciais');
        if (!alvo || !('IntersectionObserver' in window)) return;
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (currentViewName() !== 'home') return;
                setChrome(entry.isIntersecting);
            });
        }, { threshold: 0.2 });
        obs.observe(alvo);
    }

    function fireHomeMetrics() {
        if (window.__slidingHome && window.__slidingHome.animate) {
            try { window.__slidingHome.animate(); } catch (e) {}
        }
    }

    function resetHomeMetrics() {
        if (window.__slidingHome && window.__slidingHome.reset) {
            try { window.__slidingHome.reset(); } catch (e) {}
        }
    }

    function damp(rate, dt) {
        return 1 - Math.pow(1 - rate, dt / 16.67);
    }

    function loop(now) {
        rafId = 0;
        if (!active) return;
        tickCount += 1;
        var settled = true;
        try {
        var t = now || performance.now();
        var dt = lastTick ? Math.max(1, Math.min(100, t - lastTick)) : 16.67;
        lastTick = t;
        var kf = damp(FRAMES.lerp, dt);
        var kc = damp(0.085, dt);
        var frameDirty = false;
        var contentDirty = false;
        var diff = targetFloat - currentFloat;
        lastDiff = diff;
        if (Math.abs(diff) > 0.02) {
            currentFloat += diff * kf;
            render(currentFloat);
            settled = false;
            frameDirty = true;
        } else if (currentFloat !== targetFloat) {
            currentFloat = targetFloat;
            render(currentFloat);
            frameDirty = true;
        }
        var dc = targetContent - currentContent;
        if (Math.abs(dc) > 0.0008) {
            currentContent += dc * kc;
            settled = false;
            contentDirty = true;
        } else if (currentContent !== targetContent) {
            currentContent = targetContent;
            contentDirty = true;
        }
        if (frameDirty || contentDirty) {
            applyCine(currentContent, false);
        }
        var kp = damp(0.055, dt);
        var dpulse = targetPulse - pulseSmooth;
        if (Math.abs(dpulse) > 0.0004) {
            pulseSmooth += dpulse * kp;
            paintPulse(pulseSmooth);
            settled = false;
        } else if (pulseSmooth !== targetPulse) {
            pulseSmooth = targetPulse;
            paintPulse(pulseSmooth);
        }
        } catch (e) {
            lastErr = String(e && e.message || e);
        }
        if (active && !settled) rafId = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (!active) return;
        lastTick = 0;
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function stopLoop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        lastTick = 0;
    }

    function onProgress(p) {
        p = Math.max(0, Math.min(1, p));
        var fp = Math.max(0, Math.min(1, p / FRAMES.framesEnd));
        targetFloat = fp * (FRAMES.count - 1);
        var cp = Math.max(0, Math.min(1, (p - FRAMES.framesEnd) / (1 - FRAMES.framesEnd)));
        if (cp > 0) ensureSplit();
        targetContent = cp;
        startLoop();
    }

    function buildTrigger() {
        if (!window.gsap || !window.ScrollTrigger) return;
        gsap.registerPlugin(ScrollTrigger);
        if (mm) mm.revert();
        mm = gsap.matchMedia();
        mm.add(
            {
                isNarrow: '(max-width: 820px)',
                isWide: '(min-width: 821px)'
            },
            function () {
                st = ScrollTrigger.create({
                    trigger: wrap,
                    start: 'top top',
                    end: function () {
                        var h = wrap.offsetHeight || (window.innerHeight * 3.4);
                        var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                        return '+=' + Math.max(1, Math.round(h - vh));
                    },
                    scrub: 2,
                    invalidateOnRefresh: true,
                    onUpdate: function (self) { setSt(self.progress); onProgress(self.progress); },
                    onRefresh: function (self) { sizeCanvas(); setSt(self.progress); onProgress(self.progress); }
                });
                return function () {
                    if (st) { st.kill(); st = null; }
                };
            }
        );
    }

    /* ---------- ResponsiveController ---------- */
    var resizeTimer = 0;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            dprCap = isNarrowViewport() ? 1.25 : 1.75;
            sizeCanvas();
            pulseTrackW = -1;
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        }, 200);
    }

    /* ---------- SPA: só anima na view home ---------- */
    function currentViewName() {
        if (document.body.dataset.view) return document.body.dataset.view;
        var h = (location.hash || '').replace('#', '');
        return h || 'home';
    }

    function renderFirstFrame(force) {
        var idx = Math.max(0, Math.min(FRAMES.count - 1, Math.round(currentFloat)));
        var img = images[idx];
        if ((!img || !img.complete || !img.naturalWidth) && images[FRAMES.count - 1] && images[FRAMES.count - 1].naturalWidth) {
            idx = FRAMES.count - 1;
            img = images[idx];
        }
        if ((!img || !img.complete || !img.naturalWidth) && images[0] && images[0].naturalWidth) {
            idx = 0;
            img = images[0];
        }
        if (!img || !img.complete || !img.naturalWidth) return;
        if (!force && idx === currentIndex) return;
        currentIndex = idx;
        drawCover(img);
        markReady();
    }

    function syncWithView() {
        var isHome = currentViewName() === 'home';
        active = isHome && !reduceMotion;
        if (active) {
            if (!st) buildTrigger();
            if (st) st.enable();
            sizeCanvas();
            renderFirstFrame(true);
            render(currentFloat);
            ensureSplit();
            applyCine(currentContent, true);
            setChrome(false);
            initChromeObserver();
            startLoop();
        } else {
            stopLoop();
            if (st) st.disable(false);
        }
    }

    /* ---------- boot ---------- */
    if (reduceMotion) {
        hero.classList.add('is-content-in', 'is-static');
        canvas.classList.add('is-static');
        document.body.classList.add('is-frames-done');
        if (titleEl) titleEl.classList.add('is-hl-on');
        ensureSplit();
        wordEls.forEach(function (w) {
            w.style.opacity = '';
            w.style.transform = '';
            var f = w.querySelector ? w.querySelector('.hl-fill') : null;
            if (f) f.style.transform = '';
            var t = w.querySelector ? w.querySelector('.hl-text') : null;
            if (t) t.style.color = '';
        });
        fireHomeMetrics();
        loadOne(0).then(function () { sizeCanvas(); render(0); });
        return;
    }

    hero.classList.add('has-frames', 'is-cine');
    ensureSplit();
    applyCine(0, true);
    sizeCanvas();

    /* Pré-carrega frame 0 (início) + 95 (fundo final) p/ is-ready rápido;
       resto em background. Fallback = poster frame 96 via CSS. */
    loadOne(0).then(function () {
        sizeCanvas();
        renderFirstFrame(true);
        if (debug && debugEl) debugEl.hidden = false;
    });
    loadOne(FRAMES.count - 1).then(function () { sizeCanvas(); });
    loadAll().then(function () {
        render(currentFloat);
        if (progressEl) progressEl.parentElement.classList.add('is-done');
    });

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('hashchange', function () {
        setTimeout(syncWithView, 50);
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
            sizeCanvas();
            if (st) { st.refresh(); }
        });
    }

    function waitGSAP(tries) {
        if (window.gsap && window.ScrollTrigger) {
            var ready = document.readyState === 'interactive' || document.readyState === 'complete';
            var homeVisible = homeView.classList.contains('is-active-view') || currentViewName() === 'home' && homeView.offsetParent !== null;
            if (ready && homeVisible) {
                if (window.ScrollTrigger) ScrollTrigger.refresh();
                buildTrigger();
                syncWithView();
                if (st) onProgress(st.progress);
                return;
            }
        }
        if (tries > 80) {
            if (window.gsap && window.ScrollTrigger) {
                buildTrigger();
                syncWithView();
            } else {
                document.body.classList.add('is-frames-done');
                ensureSplit();
                applyCine(1, true);
                fireHomeMetrics();
                loadOne(FRAMES.count - 1).then(function () {
                    sizeCanvas();
                    targetFloat = currentFloat = FRAMES.count - 1;
                    render(FRAMES.count - 1);
                });
            }
            return;
        }
        setTimeout(function () { waitGSAP(tries + 1); }, 100);
    }
    waitGSAP(0);

    window.__cine = {
        state: function () {
            return {
                targetFloat: +targetFloat.toFixed(2),
                currentFloat: +currentFloat.toFixed(2),
                targetContent: +targetContent.toFixed(3),
                currentContent: +currentContent.toFixed(3),
                active: active,
                raf: !!rafId,
                framesEnd: FRAMES.framesEnd,
                sts: window.ScrollTrigger ? ScrollTrigger.getAll().length : -1,
                ticks: tickCount,
                lastDiff: +(+lastDiff).toFixed(2),
                lastErr: lastErr
            };
        }
    };
})();
