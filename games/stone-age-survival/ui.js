/* ============================================================
   Stone Age Survival — käyttöliittymä
   Lobby, Locker, Loadout, Shop, Profile, Settings, Play,
   Level Complete ja Game Over.

   Lobby piirretään omalle canvasilleen: kivikautinen tukikohta,
   nuotio, vuoret ja liikkuvat eläimet, sekä pelaajan hahmo
   idle-animaatiossa.
   ============================================================ */

(() => {
    'use strict';

    const Stone = window.StoneAge = window.StoneAge || {};
    const Save = Stone.Save;
    const Draw = Stone.Draw;

    /* ============================================================
       APURIT
       ============================================================ */

    const $ = (id) => document.getElementById(id);
    const clamp = Stone.clamp;

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function formatNumber(n) {
        return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function rarityOf(id) {
        return Stone.RARITY[id] || Stone.RARITY.common;
    }

    function priceOf(item) {
        return Stone.priceWithRarity(item);
    }

    /* ============================================================
       TILA
       ============================================================ */

    let screen = 'lobby';              // lobby | locker | loadout | shop | profile | settings | play | game
    let lockerTab = 'outfit';
    let shopTab = 'outfit';
    let selectedLevel = 1;
    let lastResult = null;

    let lobbyRaf = null;
    let lobbyT = 0;

    /* ============================================================
       HAHMON ASETUKSET
       ============================================================ */

    function characterConfig() {
        const outfit = Stone.byId(Stone.OUTFITS, Save.equipped('outfit')) || Stone.OUTFITS[0];
        const head = Stone.byId(Stone.HEADS, Save.equipped('head')) || Stone.HEADS[0];
        const back = Stone.byId(Stone.BACKS, Save.equipped('back')) || Stone.BACKS[0];
        const skin = Stone.byId(Stone.SKINS, Save.equipped('skin')) || Stone.SKINS[0];
        const effect = Stone.byId(Stone.EFFECTS, Save.equipped('effect')) || Stone.EFFECTS[0];

        // Lobby näyttää lähitaisteluaseen, koska se on aina kädessä.
        const loadout = Save.loadout();
        const weaponId = loadout.melee || 'club';
        const weaponDef = Stone.byId(Stone.WEAPONS, weaponId) || Stone.WEAPONS[0];

        return {
            palette: outfit.palette,
            style: outfit.style,
            head,
            back,
            effect,
            weapon: { visual: weaponDef.visual, colors: skin.colors }
        };
    }

    /* ============================================================
       LOBBY-CANVAS
       ============================================================ */

    function startLobbyCanvas() {
        const canvas = $('lobbyCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function fit() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const box = canvas.parentElement.getBoundingClientRect();
            canvas.width = Math.max(1, Math.round(box.width * dpr));
            canvas.height = Math.max(1, Math.round(box.height * dpr));
            canvas.style.width = box.width + 'px';
            canvas.style.height = box.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        fit();
        window.addEventListener('resize', fit);
        window.addEventListener('orientationchange', () => setTimeout(fit, 200));

        let last = 0;

        function frame(now) {
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
            last = now;
            lobbyT += dt;
            drawLobby(ctx, canvas, dt);
            lobbyRaf = requestAnimationFrame(frame);
        }

        if (lobbyRaf) cancelAnimationFrame(lobbyRaf);
        lobbyRaf = requestAnimationFrame(frame);
    }

    function stopLobbyCanvas() {
        if (lobbyRaf) cancelAnimationFrame(lobbyRaf);
        lobbyRaf = null;
    }

    /* ---------- Lobbyn tausta ---------- */

    function drawLobby(ctx, canvas, dt) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        const t = lobbyT;

        const horizon = H * 0.62;

        // Taivas
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, '#1b2a52');
        sky.addColorStop(0.55, '#4a3a6a');
        sky.addColorStop(1, '#a05a4a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, horizon);

        // Tähtiä
        for (let i = 0; i < 50; i++) {
            const sx = ((i * 137.5) % W);
            const sy = ((i * 79.3) % (horizon * 0.7));
            const tw = 0.35 + Math.abs(Math.sin(t * 1.6 + i)) * 0.5;
            ctx.globalAlpha = tw;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx, sy, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;

        // Kuu
        const moonX = W * 0.82;
        const moonY = horizon * 0.24;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 90);
        moonGlow.addColorStop(0, 'rgba(255,240,210,0.32)');
        moonGlow.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
        ctx.fillStyle = '#ffeecb';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Vuoret — kolme kerrosta, hitain liike
        drawMountains(ctx, W, horizon, 46, '#2a2a4e', t * 1.2, 0.55);
        drawMountains(ctx, W, horizon, 76, '#22223f', t * 2.4, 0.4);
        drawMountains(ctx, W, horizon, 116, '#1a1a33', t * 4.2, 0.28);

        // Maanpinta
        const ground = ctx.createLinearGradient(0, horizon, 0, H);
        ground.addColorStop(0, '#3a3020');
        ground.addColorStop(0.35, '#2c2418');
        ground.addColorStop(1, '#1a1610');
        ctx.fillStyle = ground;
        ctx.fillRect(0, horizon, W, H - horizon);

        // Luolan suu
        drawCave(ctx, W * 0.13, horizon + 6, 110, 84);

        // Tukikohdan kivirakennelmat
        drawStoneCircle(ctx, W * 0.5, horizon + 34, t);

        // Puita
        drawTree(ctx, W * 0.05, horizon + 16, 0.9, t);
        drawTree(ctx, W * 0.95, horizon + 22, 1.1, t);
        drawTree(ctx, W * 0.26, horizon - 6, 0.62, t * 0.9);
        drawTree(ctx, W * 0.76, horizon - 2, 0.5, t * 1.1);

        // Nuotio hahmon vieressä, ei sen takana
        drawCampfire(ctx, W * 0.5 - Math.min(W * 0.27, 260), horizon + 104, t);

        // Liikkuvat eläimet kaukaisuudessa
        drawAnimals(ctx, W, horizon, t);

        // Hahmo keskellä
        drawStage(ctx, W, H, t);

        // Vinjetti
        const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(4,6,14,0.6)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }

    function drawMountains(ctx, W, horizon, height, color, offset, parallax) {
        const shift = -((offset * parallax * 40) % (W + 240));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(shift - 240, horizon);

        // Pehmeitä huippuja: vuoret ovat leveämpiä ja epäsäännöllisempiä kuin
        // pelkät kolmiot, jotta maisema näyttää luonnolliselta.
        let x = shift - 240;
        let i = 0;
        while (x < W + 240) {
            const peakW = 150 + ((i * 67) % 90);
            const peakH = height * (0.62 + ((i * 41) % 50) / 100);
            const midX = x + peakW * 0.5;

            ctx.quadraticCurveTo(x + peakW * 0.22, horizon - peakH * 0.55, midX, horizon - peakH);
            ctx.quadraticCurveTo(x + peakW * 0.78, horizon - peakH * 0.5, x + peakW, horizon);

            x += peakW;
            i++;
        }

        ctx.lineTo(W + 240, horizon + 12);
        ctx.lineTo(shift - 240, horizon + 12);
        ctx.closePath();
        ctx.fill();
    }

    function drawCave(ctx, x, y, w, h) {
        ctx.fillStyle = '#12101c';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.quadraticCurveTo(x, y - h * 1.3, x + w / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0a0812';
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.1, w * 0.3, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawStoneCircle(ctx, x, y, t) {
        for (let i = -2; i <= 2; i++) {
            const sx = x + i * 58;
            const h = 26 + Math.abs(i) * 4;
            ctx.fillStyle = i % 2 === 0 ? '#5a5668' : '#4a4658';
            ctx.beginPath();
            ctx.moveTo(sx - 12, y);
            ctx.lineTo(sx - 8, y - h);
            ctx.lineTo(sx + 8, y - h);
            ctx.lineTo(sx + 12, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    function drawTree(ctx, x, y, scale, t) {
        const sway = Math.sin(t * 0.9 + x) * 2 * scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(-5, -60, 10, 60);

        ctx.fillStyle = '#1f3a24';
        ctx.beginPath();
        ctx.arc(sway, -74, 30, 0, Math.PI * 2);
        ctx.arc(sway - 22, -60, 22, 0, Math.PI * 2);
        ctx.arc(sway + 22, -62, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2a4a30';
        ctx.beginPath();
        ctx.arc(sway - 6, -80, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawCampfire(ctx, x, y, t) {
        // Kivirengas
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            ctx.fillStyle = i % 2 === 0 ? '#5a5668' : '#48445a';
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * 34, y + Math.sin(a) * 12, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Polttopuut
        ctx.strokeStyle = '#3a2a18';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 4); ctx.lineTo(x + 20, y - 4);
        ctx.moveTo(x - 20, y - 4); ctx.lineTo(x + 20, y + 4);
        ctx.stroke();

        // Liekit
        const flick = Math.sin(t * 9) * 0.16 + Math.sin(t * 13) * 0.09;
        for (let layer = 0; layer < 3; layer++) {
            const scale = 1 - layer * 0.26;
            const colors = ['rgba(255,90,30,0.85)', 'rgba(255,160,50,0.9)', 'rgba(255,230,140,0.95)'];
            ctx.fillStyle = colors[layer];
            ctx.beginPath();
            const h = (52 + flick * 26) * scale;
            ctx.moveTo(x - 14 * scale, y);
            ctx.quadraticCurveTo(x - 8 * scale, y - h * 0.6, x + flick * 8, y - h);
            ctx.quadraticCurveTo(x + 8 * scale, y - h * 0.6, x + 14 * scale, y);
            ctx.closePath();
            ctx.fill();
        }

        // Hehku
        const glow = ctx.createRadialGradient(x, y - 16, 0, x, y - 16, 150);
        glow.addColorStop(0, 'rgba(255,150,60,' + (0.22 + Math.sin(t * 7) * 0.05).toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 150, y - 166, 300, 300);

        // Kipinät
        for (let i = 0; i < 9; i++) {
            const life = (t * 0.7 + i * 0.11) % 1;
            const px = x + Math.sin(t * 2 + i * 2.1) * 14 * life;
            const py = y - 10 - life * 90;
            ctx.globalAlpha = (1 - life) * 0.8;
            ctx.fillStyle = '#ffc46b';
            ctx.fillRect(px, py, 2.4, 2.4);
        }
        ctx.globalAlpha = 1;
    }

    function drawAnimals(ctx, W, horizon, t) {
        // Kaksi brontosaurusmaista hahmoa kävelee horisontissa
        for (let i = 0; i < 2; i++) {
            const speed = i === 0 ? 14 : -10;
            const dirRight = speed > 0;
            let x = ((t * speed + i * 500) % (W + 300));
            if (x < 0) x += W + 300;
            x -= 150;
            const y = horizon - 26 - i * 8;
            const scale = i === 0 ? 0.7 : 0.5;
            const legPhase = Math.sin(t * 3 + i * 2) * 0.3;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(dirRight ? scale : -scale, scale);
            ctx.fillStyle = 'rgba(30,28,48,0.85)';

            // Vartalo
            ctx.beginPath();
            ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Kaula ja pää
            ctx.beginPath();
            ctx.moveTo(24, -6);
            ctx.quadraticCurveTo(52, -28, 62, -34);
            ctx.lineTo(70, -30);
            ctx.quadraticCurveTo(56, -18, 32, 2);
            ctx.closePath();
            ctx.fill();
            // Häntä
            ctx.beginPath();
            ctx.moveTo(-30, -4);
            ctx.quadraticCurveTo(-56, -14 + legPhase * 8, -74, -4);
            ctx.lineTo(-74, 2);
            ctx.quadraticCurveTo(-52, -4, -30, 4);
            ctx.closePath();
            ctx.fill();
            // Jalat
            ctx.fillRect(-20, 8, 8, 20 + legPhase * 6);
            ctx.fillRect(12, 8, 8, 20 - legPhase * 6);

            ctx.restore();
        }
    }

    /* ---------- Hahmon esityslava ---------- */

    let stageGlow = 0;

    function drawStage(ctx, W, H, t) {
        const outfit = Stone.byId(Stone.OUTFITS, Save.equipped('outfit')) || Stone.OUTFITS[0];
        const rar = rarityOf(outfit.rarity);

        const cx = W * 0.5;
        // Kapeilla näytöillä hahmo nostetaan ylemmäs, jotta se ei jää
        // alareunan painikkeiden alle.
        const narrow = W < 720;
        const cy = H * (narrow ? 0.52 : 0.66);
        const baseScale = narrow ? Math.min(W / 420, H / 640) : Math.min(W / 620, H / 520);
        const scale = clamp(baseScale, 0.85, 2.4);

        // Korokkeen hehku
        const rarPulse = 0.6 + Math.sin(t * 2.4) * 0.4;
        stageGlow = rarPulse;
        const glow = ctx.createRadialGradient(cx, cy + 10, 0, cx, cy + 10, 180 * scale);
        glow.addColorStop(0, rar.glow.replace(/[\d.]+\)$/, (rarPulse * 0.5).toFixed(2) + ')'));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 200 * scale, cy - 190 * scale, 400 * scale, 380 * scale);

        // Korokkeen kivi
        ctx.fillStyle = '#494457';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, 86 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a5670';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 78 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rar.color;
        ctx.globalAlpha = 0.5 + rarPulse * 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 78 * scale, 16 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Renkaat harvinaisuuden mukaan
        if (rar.id === 'legendary' || rar.id === 'mythic') {
            ctx.strokeStyle = rar.color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 2.4;
            for (let i = 0; i < 3; i++) {
                const rr2 = (60 + i * 26 + Math.sin(t * 1.6 + i) * 6) * scale;
                ctx.beginPath();
                ctx.ellipse(cx, cy + 6, rr2, rr2 * 0.26, t * 0.6 + i, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Hahmo
        const cfg = characterConfig();
        cfg.emoteStyle = null;
        Draw.drawCharacter(ctx, cx, cy - 34 * scale, scale * 1.8, cfg, t);

        // Nimi ja harvinaisuus
        ctx.textAlign = 'center';
        ctx.font = 'bold ' + Math.round(19 * clamp(scale, 0.9, 1.5)) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(outfit.name, cx, cy + 54 * scale);

        ctx.font = 'bold ' + Math.round(12 * clamp(scale, 0.9, 1.5)) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = rar.color;
        ctx.fillText('★ ' + rar.name, cx, cy + 74 * scale);
        ctx.textAlign = 'left';
    }

    /* ============================================================
       HAHMON ESIKATSELU (Locker, Shop)
       ============================================================ */

    function startPreviewCanvas(canvasId, getConfig) {
        const canvas = $(canvasId);
        if (!canvas) return () => {};
        const ctx = canvas.getContext('2d');
        let raf = null;
        let t = 0;
        let last = 0;

        function fit() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const box = canvas.parentElement.getBoundingClientRect();
            canvas.width = Math.max(1, Math.round(box.width * dpr));
            canvas.height = Math.max(1, Math.round(box.height * dpr));
            canvas.style.width = box.width + 'px';
            canvas.style.height = box.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        fit();
        const onResize = () => fit();
        window.addEventListener('resize', onResize);

        function frame(now) {
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
            last = now;
            t += dt;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const W = canvas.width / dpr;
            const H = canvas.height / dpr;

            // Tausta
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, 'rgba(30,26,52,0.9)');
            bg.addColorStop(1, 'rgba(14,12,24,0.95)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Hehku
            const glow = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, W * 0.6);
            glow.addColorStop(0, 'rgba(255,170,90,0.14)');
            glow.addColorStop(1, 'rgba(255,170,90,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);

            const cfg = getConfig();
            const scale = clamp(Math.min(W / 300, H / 380), 0.7, 2.2);
            Draw.drawCharacter(ctx, W / 2, H * 0.78, scale * 1.7, cfg, t);

            raf = requestAnimationFrame(frame);
        }

        raf = requestAnimationFrame(frame);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        };
    }

    let disposeLockerPreview = null;
    let disposeLockerBig = null;

    /* ============================================================
       RUUDUN VAIHTO
       ============================================================ */

    const SCREENS = ['lobby', 'locker', 'loadout', 'shop', 'profile', 'settings', 'play', 'game'];

    function showScreen(name) {
        screen = name;

        SCREENS.forEach((s) => {
            const node = $('screen-' + s);
            if (node) node.hidden = s !== name;
        });

        // Lobby-canvas pyörii vain lobbyssä
        if (name === 'lobby') startLobbyCanvas();
        else stopLobbyCanvas();

        if (name === 'locker') {
            renderLocker();
            if (!disposeLockerPreview) {
                disposeLockerPreview = startPreviewCanvas('lockerPreview', () => {
                    const cfg = characterConfig();
                    cfg.emoteStyle = lockerEmote;
                    cfg.emoteT = lockerEmoteT;
                    return cfg;
                });
            }
        } else {
            if (disposeLockerPreview) { disposeLockerPreview(); disposeLockerPreview = null; }
        }

        if (name === 'shop') {
            renderShop();
            if (!disposeLockerBig) {
                disposeLockerBig = startPreviewCanvas('shopPreview', () => {
                    const cfg = characterConfig();
                    const preview = shopPreviewItem;
                    if (preview) {
                        if (preview.kind === 'outfit') { cfg.palette = preview.palette; cfg.style = preview.style; }
                        else if (preview.kind === 'head') cfg.head = preview;
                        else if (preview.kind === 'back') cfg.back = preview;
                        else if (preview.kind === 'skin') cfg.weapon = { visual: (Stone.byId(Stone.WEAPONS, Save.loadout().melee) || Stone.WEAPONS[0]).visual, colors: preview.colors };
                        else if (preview.kind === 'effect') cfg.effect = preview;
                    }
                    return cfg;
                });
            }
        } else {
            if (disposeLockerBig) { disposeLockerBig(); disposeLockerBig = null; }
        }

        if (name === 'play') renderPlay();
        if (name === 'loadout') renderLoadout();
        if (name === 'profile') renderProfile();
        if (name === 'settings') renderSettings();

        refreshCurrency();
        updateNavActive();

        // Vieritys takaisin alkuun näkymän vaihtuessa
        const active = $('screen-' + name);
        if (active) {
            const scroller = active.querySelector('.scroll');
            if (scroller) scroller.scrollTop = 0;
        }
    }

    function updateNavActive() {
        const nav = $('nav');
        if (!nav) return;
        Array.prototype.forEach.call(nav.querySelectorAll('[data-nav]'), (btn) => {
            btn.classList.toggle('is-active', btn.getAttribute('data-nav') === screen);
        });
    }

    function refreshCurrency() {
        const nodes = document.querySelectorAll('[data-coins]');
        Array.prototype.forEach.call(nodes, (n) => { n.textContent = formatNumber(Save.coins()); });

        // Lobbyn seuraava kenttä
        const next = $('lobbyNextLevel');
        if (next) next.textContent = formatNumber(Save.raw().unlockedLevels);
    }

    /* ============================================================
       LOCKER
       ============================================================ */

    const LOCKER_TABS = [
        { id: 'outfit', label: 'OUTFIT', kind: 'outfit', list: () => Stone.OUTFITS },
        { id: 'head', label: 'HEAD', kind: 'head', list: () => Stone.HEADS },
        { id: 'back', label: 'BACK ITEM', kind: 'back', list: () => Stone.BACKS },
        { id: 'skin', label: 'WEAPON SKIN', kind: 'skin', list: () => Stone.SKINS },
        { id: 'emote', label: 'EMOTE', kind: 'emote', list: () => Stone.EMOTES }
    ];

    let lockerEmote = 'none';
    let lockerEmoteT = 0;
    let lockerEmoteTimer = null;

    function playLockerEmote(style, duration) {
        lockerEmote = style;
        lockerEmoteT = 0;
        if (lockerEmoteTimer) clearInterval(lockerEmoteTimer);
        const started = performance.now();
        lockerEmoteTimer = setInterval(() => {
            lockerEmoteT = (performance.now() - started) / 1000;
            if (lockerEmoteT > duration) {
                clearInterval(lockerEmoteTimer);
                lockerEmoteTimer = null;
                lockerEmote = 'none';
            }
        }, 40);
    }

    function renderLocker() {
        const tabs = $('lockerTabs');
        tabs.innerHTML = '';
        LOCKER_TABS.forEach((tab) => {
            const btn = el('button', 'tab' + (tab.id === lockerTab ? ' is-active' : ''), tab.label);
            btn.type = 'button';
            btn.addEventListener('click', () => {
                lockerTab = tab.id;
                Stone.Sound.unlock();
                renderLocker();
            });
            tabs.appendChild(btn);
        });

        const active = LOCKER_TABS.filter((t) => t.id === lockerTab)[0] || LOCKER_TABS[0];
        const list = active.list();
        const grid = $('lockerGrid');
        grid.innerHTML = '';

        list.forEach((item) => {
            const owned = Save.owns(active.kind, item.id);
            const equippedId = Save.equipped(active.kind);
            const isEquipped = equippedId === item.id || (active.kind === 'skin' && equippedId === item.id);

            const card = el('button', 'item' + (isEquipped ? ' is-equipped' : '') + (owned ? '' : ' is-locked'));
            card.type = 'button';
            card.setAttribute('data-rarity', item.rarity);

            const thumb = el('span', 'item__thumb');
            const cv = document.createElement('canvas');
            cv.width = 120;
            cv.height = 120;
            thumb.appendChild(cv);
            card.appendChild(thumb);

            const name = el('span', 'item__name', item.name);
            card.appendChild(name);

            const rar = el('span', 'item__rarity', rarityOf(item.rarity).name);
            rar.style.color = rarityOf(item.rarity).color;
            card.appendChild(rar);

            if (!owned) {
                const lock = el('span', 'item__lock', '🔒 ' + formatNumber(priceOf(item)));
                card.appendChild(lock);
            } else if (isEquipped) {
                card.appendChild(el('span', 'item__equipped', 'KÄYTÖSSÄ'));
            }

            // Ikonin piirto
            const cctx = cv.getContext('2d');
            const cssW = 120;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = Math.round(cssW * dpr);
            cv.height = Math.round(cssW * dpr);
            cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cctx.clearRect(0, 0, cssW, cssW);
            cctx.save();
            cctx.translate(0, 0);
            Draw.drawItemIcon(cctx, item, cssW / 2, cssW / 2 + 6, cssW * 0.82, performance.now() / 1000);
            cctx.restore();

            card.addEventListener('click', () => {
                Stone.Sound.unlock();
                if (!owned) {
                    toast('Osta esine Shopista', 'warn');
                    return;
                }
                if (active.kind === 'emote') {
                    Save.equip('emote', item.id);
                    if (item.style !== 'none') playLockerEmote(item.style, item.duration);
                } else {
                    Save.equip(active.kind, item.id);
                }
                Stone.Sound.coin();
                renderLocker();
            });

            grid.appendChild(card);
        });

        // Lokerin yhteenveto
        const summary = $('lockerSummary');
        const outfit = Stone.byId(Stone.OUTFITS, Save.equipped('outfit'));
        summary.textContent = outfit ? outfit.name + ' · ' + rarityOf(outfit.rarity).name : '';
    }

    /* ============================================================
       LOADOUT
       ============================================================ */

    const LOADOUT_SLOTS = [
        { id: 'primary', label: 'PRIMARY' },
        { id: 'secondary', label: 'SECONDARY' },
        { id: 'special', label: 'SPECIAL' },
        { id: 'melee', label: 'MELEE' }
    ];

    let loadoutSlot = 'primary';

    function renderLoadout() {
        const slotBar = $('loadoutSlots');
        slotBar.innerHTML = '';
        LOADOUT_SLOTS.forEach((slot) => {
            const id = Save.loadout()[slot.id];
            const w = id ? Stone.byId(Stone.WEAPONS, id) : null;
            const btn = el('button', 'slot' + (slot.id === loadoutSlot ? ' is-active' : ''));
            btn.type = 'button';
            btn.appendChild(el('span', 'slot__label', slot.label));
            btn.appendChild(el('span', 'slot__name', w ? w.name : '— tyhjä —'));
            if (w) btn.setAttribute('data-rarity', w.rarity);
            btn.addEventListener('click', () => {
                loadoutSlot = slot.id;
                Stone.Sound.unlock();
                renderLoadout();
            });
            slotBar.appendChild(btn);
        });

        const grid = $('loadoutGrid');
        grid.innerHTML = '';

        const candidates = Stone.WEAPONS.filter((w) => w.slot === loadoutSlot);
        candidates.forEach((w) => {
            const owned = Save.owns('weapon', w.id);
            const equippedNow = Save.loadout()[loadoutSlot] === w.id;

            const card = el('button', 'item item--weapon' + (equippedNow ? ' is-equipped' : '') + (owned ? '' : ' is-locked'));
            card.type = 'button';
            card.setAttribute('data-rarity', w.rarity);

            const thumb = el('span', 'item__thumb');
            const cv = document.createElement('canvas');
            const cssW = 120;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = Math.round(cssW * dpr);
            cv.height = Math.round(cssW * dpr);
            cv.style.width = cssW + 'px';
            cv.style.height = cssW + 'px';
            const cctx = cv.getContext('2d');
            cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cctx.save();
            cctx.translate(cssW / 2, cssW / 2 + 10);
            cctx.scale(1.5, 1.5);
            Draw.drawWeaponShape(cctx, w.visual, 60, 90, 1, null);
            cctx.restore();
            thumb.appendChild(cv);
            card.appendChild(thumb);

            card.appendChild(el('span', 'item__name', w.name));

            const rar = el('span', 'item__rarity', rarityOf(w.rarity).name);
            rar.style.color = rarityOf(w.rarity).color;
            card.appendChild(rar);

            // Tilastot
            const stats = el('span', 'item__stats');
            stats.appendChild(el('span', null, 'DMG ' + Math.round(w.damage)));
            stats.appendChild(el('span', null, 'SPD ' + w.fireRate.toFixed(1) + '/s'));
            stats.appendChild(el('span', null, 'RNG ' + Math.round(w.range)));
            card.appendChild(stats);

            // Upit
            const lvl = Save.upgradeLevel(w.id);
            if (owned) {
                card.appendChild(el('span', 'item__upgrade', 'UPGRADE LV ' + lvl + ' / ' + Save.MAX_UPGRADE));
            } else {
                card.appendChild(el('span', 'item__lock', '🔒 ' + formatNumber(priceOf(w))));
            }

            if (equippedNow) card.appendChild(el('span', 'item__equipped', 'KÄYTÖSSÄ'));

            card.addEventListener('click', () => {
                Stone.Sound.unlock();
                if (!owned) {
                    const price = priceOf(w);
                    if (Save.coins() < price) { toast('NOT ENOUGH COINS', 'warn'); return; }
                    Save.spendCoins(price);
                    Save.grant('weapon', w.id);
                    Save.setLoadout(loadoutSlot, w.id);
                    Stone.Sound.coin();
                    toast('Ostettu: ' + w.name, 'ok');
                    renderLoadout();
                    refreshCurrency();
                    return;
                }
                Save.setLoadout(loadoutSlot, w.id);
                Stone.Sound.click();
                renderLoadout();
            });

            // Up-nappi omistetuille
            if (owned && Save.canUpgrade(w.id)) {
                const cost = Save.upgradeCost(w.id);
                const up = el('span', 'item__upbtn', 'UPGRADE · ' + formatNumber(cost) + ' 🪙');
                up.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    Stone.Sound.unlock();
                    const res = Save.doUpgrade(w.id);
                    if (res === 'poor') { toast('NOT ENOUGH COINS', 'warn'); return; }
                    if (res === 'max') { toast('Jo maksimitaso', 'warn'); return; }
                    Stone.Sound.pickup();
                    toast(w.name + ' päivitetty!', 'ok');
                    renderLoadout();
                    refreshCurrency();
                });
                card.appendChild(up);
            } else if (owned) {
                card.appendChild(el('span', 'item__upbtn is-max', 'MAX LEVEL'));
            }

            grid.appendChild(card);
        });

        // Lähitaisteluase on aina kädessä lobbyssä
        const meleeId = Save.loadout().melee;
        const melee = meleeId ? Stone.byId(Stone.WEAPONS, meleeId) : null;
        $('loadoutHint').textContent = melee
            ? 'Lobbyssä hahmo pitää kädessään: ' + melee.name
            : 'Valitse lähitaisteluase.';
    }

    /* ============================================================
       SHOP
       ============================================================ */

    const SHOP_TABS = [
        { id: 'outfit', label: 'OUTFITS' },
        { id: 'skin', label: 'WEAPON SKINS' },
        { id: 'back', label: 'BACK ITEMS' },
        { id: 'emote', label: 'EMOTES' },
        { id: 'effect', label: 'EFFECTS' },
        { id: 'head', label: 'HEAD' },
        { id: 'weapon', label: 'WEAPONS' }
    ];

    let shopPreviewItem = null;

    function shopListFor(tab) {
        if (tab === 'weapon') {
            return Stone.WEAPONS.filter((w) => w.price > 0);
        }
        const map = Stone.shopByCategory();
        return (map[tab] || []).map((entry) => entry.ref);
    }

    function kindForTab(tab) {
        return tab === 'weapon' ? 'weapon' : tab;
    }

    function renderShop() {
        const tabs = $('shopTabs');
        tabs.innerHTML = '';
        SHOP_TABS.forEach((tab) => {
            const btn = el('button', 'tab' + (tab.id === shopTab ? ' is-active' : ''), tab.label);
            btn.type = 'button';
            btn.addEventListener('click', () => {
                shopTab = tab.id;
                shopPreviewItem = null;
                Stone.Sound.unlock();
                renderShop();
            });
            tabs.appendChild(btn);
        });

        const kind = kindForTab(shopTab);
        const list = shopListFor(shopTab);
        const grid = $('shopGrid');
        grid.innerHTML = '';

        list.forEach((item) => {
            const owned = Save.owns(kind, item.id);
            const price = priceOf(item);
            const affordable = Save.coins() >= price;
            const rar = rarityOf(item.rarity);

            const card = el('button', 'shopitem' + (owned ? ' is-owned' : ''));
            card.type = 'button';
            card.setAttribute('data-rarity', item.rarity);

            const top = el('div', 'shopitem__top');
            const thumb = el('span', 'item__thumb item__thumb--sm');
            const cv = document.createElement('canvas');
            const cssW = 92;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = Math.round(cssW * dpr);
            cv.height = Math.round(cssW * dpr);
            cv.style.width = cssW + 'px';
            cv.style.height = cssW + 'px';
            const cctx = cv.getContext('2d');
            cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (kind === 'weapon') {
                cctx.save();
                cctx.translate(cssW / 2, cssW / 2 + 8);
                cctx.scale(1.3, 1.3);
                Draw.drawWeaponShape(cctx, item.visual, 60, 90, 1, null);
                cctx.restore();
            } else {
                Draw.drawItemIcon(cctx, item, cssW / 2, cssW / 2 + 5, cssW * 0.78, performance.now() / 1000);
            }
            thumb.appendChild(cv);
            top.appendChild(thumb);

            const info = el('div', 'shopitem__info');
            info.appendChild(el('div', 'shopitem__name', item.name));
            const rarEl = el('div', 'shopitem__rarity', rar.name);
            rarEl.style.color = rar.color;
            info.appendChild(rarEl);
            info.appendChild(el('div', 'shopitem__price', '🪙 ' + formatNumber(price)));
            top.appendChild(info);
            card.appendChild(top);

            const action = el('div', 'shopitem__action');
            if (owned) {
                action.appendChild(el('span', 'shopitem__owned', 'OMISTAT'));
            } else if (!affordable) {
                const b = el('span', 'shopitem__buy is-poor', 'NOT ENOUGH COINS');
                action.appendChild(b);
            } else {
                const b = el('span', 'shopitem__buy', 'BUY');
                action.appendChild(b);
            }
            card.appendChild(action);

            card.addEventListener('click', () => {
                Stone.Sound.unlock();
                shopPreviewItem = item;
                if (owned) {
                    toast('Omistat jo: ' + item.name, 'ok');
                    return;
                }
                if (!affordable) {
                    toast('NOT ENOUGH COINS', 'warn');
                    return;
                }
                const res = Save.spendCoins(price);
                if (res !== 'ok') { toast('NOT ENOUGH COINS', 'warn'); return; }

                Save.grant(kind, item.id);
                Stone.Sound.coin();

                // Ostettu esine otetaan heti käyttöön, jos mahdollista
                if (kind !== 'weapon') Save.equip(kind, item.id);
                else Save.setLoadout('melee', item.id);

                toast('Ostettu: ' + item.name, 'ok');
                coinBurst();
                renderShop();
                refreshCurrency();
            });

            grid.appendChild(card);
        });
    }

    /* ============================================================
       PROFILE
       ============================================================ */

    function renderProfile() {
        const s = Save.stats();
        $('profileCoins').textContent = formatNumber(Save.coins());
        $('profileLevel').textContent = formatNumber(Save.raw().highestLevel);
        $('profileCleared').textContent = formatNumber(s.levelsCleared);
        $('profileEnemies').textContent = formatNumber(s.enemiesDefeated);
        $('profileBosses').textContent = formatNumber(s.bossesDefeated);
        $('profileBest').textContent = formatNumber(s.bestScore);
        $('profileEarned').textContent = formatNumber(s.totalCoinsEarned);

        // Kokoelman edistyminen
        const collections = [
            { label: 'Asut', owned: Save.raw().ownedOutfits.length, total: Stone.OUTFITS.length },
            { label: 'Päähineet', owned: Save.raw().ownedHeads.length, total: Stone.HEADS.length },
            { label: 'Selkäesineet', owned: Save.raw().ownedBacks.length, total: Stone.BACKS.length },
            { label: 'Aseet', owned: Save.raw().ownedWeapons.length, total: Stone.WEAPONS.length },
            { label: 'Aseen skinit', owned: Save.raw().ownedSkins.length, total: Stone.SKINS.length },
            { label: 'Emotet', owned: Save.raw().ownedEmotes.length, total: Stone.EMOTES.length },
            { label: 'Efektit', owned: Save.raw().ownedEffects.length, total: Stone.EFFECTS.length }
        ];

        const wrap = $('profileCollections');
        wrap.innerHTML = '';
        collections.forEach((c) => {
            const row = el('div', 'progress');
            const head = el('div', 'progress__head');
            head.appendChild(el('span', null, c.label));
            head.appendChild(el('strong', null, c.owned + ' / ' + c.total));
            row.appendChild(head);

            const bar = el('div', 'progress__bar');
            const fill = el('div', 'progress__fill');
            fill.style.width = Math.round((c.owned / c.total) * 100) + '%';
            bar.appendChild(fill);
            row.appendChild(bar);

            wrap.appendChild(row);
        });
    }

    /* ============================================================
       SETTINGS
       ============================================================ */

    function renderSettings() {
        const s = Save.settings();
        $('setSound').checked = s.sound;
        $('setMusic').checked = s.music;
        $('setShake').checked = s.screenShake;
        $('setTouch').checked = s.showTouch;
        applyTouchVisibility();
    }

    function applyTouchVisibility() {
        const s = Save.settings();
        document.body.classList.toggle('hide-touch', !s.showTouch);
    }

    /* ============================================================
       PLAY
       ============================================================ */

    function renderPlay() {
        const def = Stone.buildLevel(selectedLevel);
        const stars = def.difficulty;
        const unlocked = selectedLevel <= Save.raw().unlockedLevels;

        $('playLevel').textContent = 'LEVEL ' + def.level;
        $('playName').textContent = def.name + ' · ' + def.biome.name;
        $('playReward').textContent = '+' + formatNumber(def.reward) + ' COINS';
        $('playStars').innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = el('span', 'star' + (i <= stars ? ' is-on' : ''), '★');
            $('playStars').appendChild(star);
        }
        $('playBiome').textContent = def.biome.name;
        $('playWaves').textContent = def.waves.length + ' aaltoa';
        $('playEnemies').textContent = def.waves.reduce((n, w) => n + w.length, 0) + ' vihollista';
        $('playBoss').textContent = def.boss ? def.boss.name : 'Ei bossia';
        $('playBoss').className = def.boss ? 'playmeta__value is-boss' : 'playmeta__value';

        const btn = $('btnStartLevel');
        btn.disabled = !unlocked;
        btn.textContent = unlocked ? 'START LEVEL' : 'LOCKED';

        $('playLockNote').hidden = unlocked;

        // Tason valitsin
        const slider = $('playSlider');
        slider.max = String(Save.raw().unlockedLevels);
        slider.value = String(selectedLevel);

        const best = Save.raw();
        $('playProgress').textContent = 'Avattu ' + formatNumber(best.unlockedLevels) + ' / ' +
            formatNumber(Stone.MAX_LEVEL) + ' kenttää';
    }

    /* ============================================================
       PELIN KÄYNNISTYS
       ============================================================ */

    function launchLevel(levelNumber) {
        Stone.Sound.unlock();
        showScreen('game');
        const canvas = $('gameCanvas');

        // Annetaan selaimen asetella layout ennen canvaksen mittausta
        requestAnimationFrame(() => {
            Stone.Game.attach(canvas);
            Stone.Game.resize();
            const def = Stone.Game.start(levelNumber, {
                onFinish: handleLevelFinish
            });
            updateGameHud();
            $('gameLevelLabel').textContent = 'LEVEL ' + def.level + ' · ' + def.name;
            $('gameBossLabel').textContent = def.boss ? 'BOSS: ' + def.boss.name : '';
        });
    }

    function handleLevelFinish(result) {
        lastResult = result;
        Stone.Game.detach();
        showResult(result);
    }

    function showResult(result) {
        const overlay = $('resultOverlay');
        overlay.hidden = false;

        if (result.victory) {
            $('resultBadge').textContent = 'LEVEL COMPLETE!';
            $('resultBadge').className = 'overlay__badge overlay__badge--gold';
        } else {
            $('resultBadge').textContent = 'GAME OVER';
            $('resultBadge').className = 'overlay__badge overlay__badge--danger';
        }

        $('resultTitle').textContent = result.victory
            ? '🏆 LEVEL ' + result.level
            : 'Selviytyminen päättyi';

        $('resultScore').textContent = formatNumber(result.score);
        $('resultEnemies').textContent = formatNumber(result.enemiesDefeated);
        $('resultTime').textContent = formatDuration(result.time);
        $('resultDamage').textContent = formatNumber(result.damageTaken);

        $('resultReward').textContent = '+' + formatNumber(result.coins) + ' COINS';
        $('resultTotal').textContent = formatNumber(Save.coins()) + ' COINS';

        // Bonukset
        const bonusWrap = $('resultBonus');
        bonusWrap.innerHTML = '';
        if (result.bonus.length) {
            result.bonus.forEach((b) => {
                const row = el('div', 'bonusrow');
                row.appendChild(el('span', null, b.label));
                row.appendChild(el('strong', null, '+' + b.coins + ' 🪙'));
                bonusWrap.appendChild(row);
            });
        } else {
            bonusWrap.appendChild(el('div', 'bonusrow bonusrow--none', 'Ei bonuksia tällä kertaa'));
        }

        // Tähdet
        const stars = $('resultStars');
        stars.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            stars.appendChild(el('span', 'star star--big' + (i <= result.stars ? ' is-on' : ''), '★'));
        }

        $('btnNextLevel').hidden = !result.victory;
        $('btnRetryLevel').textContent = result.victory ? 'REPLAY' : 'Yritä uudelleen';

        overlay.scrollTop = 0;
        coinBurst();
    }

    function formatDuration(sec) {
        const total = Math.max(0, Math.floor(sec));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    /* ============================================================
       ILMOITUKSET JA KOLIKKOANIMAATIO
       ============================================================ */

    let toastTimer = null;

    function toast(text, kind) {
        const node = $('toast');
        node.textContent = text;
        node.className = 'toast is-visible' + (kind ? ' toast--' + kind : '');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            node.className = 'toast';
        }, 1900);
    }

    function coinBurst() {
        const layer = $('coinLayer');
        if (!layer) return;
        for (let i = 0; i < 14; i++) {
            const c = el('span', 'coinfly', '🪙');
            c.style.left = (20 + Math.random() * 60) + '%';
            c.style.bottom = (10 + Math.random() * 30) + '%';
            c.style.animationDelay = (i * 0.06) + 's';
            layer.appendChild(c);
            setTimeout(() => c.remove(), 1600 + i * 60);
        }

        // Saldon korostus
        document.querySelectorAll('[data-coins]').forEach((n) => {
            n.classList.remove('is-bump');
            void n.offsetWidth;
            n.classList.add('is-bump');
        });
    }

    /* ============================================================
       PELIN HUD
       ============================================================ */

    let hudTimer = null;

    function updateGameHud() {
        const s = Stone.Game.snapshot();

        $('hudHp').style.width = Math.max(0, (s.playerHp / 100) * 100) + '%';
        $('hudHpText').textContent = Math.max(0, Math.round(s.playerHp)) + ' / 100';
        $('hudScore').textContent = formatNumber(s.score);
        $('hudCoins').textContent = formatNumber(s.coinsEarned);
        $('hudWave').textContent = 'WAVE ' + Math.min(s.wave, s.waves) + ' / ' + s.waves;
        $('hudEnemies').textContent = s.enemies + ' vihollista';
        $('hudCombo').hidden = s.combo < 2;
        $('hudCombo').textContent = 'COMBO x' + s.combo;

        // Asevalinnat
        const loadout = Save.loadout();
        const slots = ['primary', 'secondary', 'special', 'melee'];
        slots.forEach((slot, i) => {
            const node = $('slotBtn' + i);
            if (!node) return;
            const id = loadout[slot];
            const w = id ? Stone.byId(Stone.WEAPONS, id) : null;
            node.hidden = !w;
            if (w) {
                node.querySelector('.slotbtn__name').textContent = w.name;
                node.querySelector('.slotbtn__key').textContent = String(i + 1);
            }
        });
    }

    function startHudLoop() {
        if (hudTimer) clearInterval(hudTimer);
        hudTimer = setInterval(() => {
            if (screen === 'game' && Stone.Game.getState() !== 'idle') updateGameHud();
        }, 100);
    }

    /* ============================================================
       TAPAHTUMAT
       ============================================================ */

    function bindEvents() {
        // Navigointi
        Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), (btn) => {
            btn.addEventListener('click', () => {
                Stone.Sound.unlock();
                Stone.Sound.click();
                showScreen(btn.getAttribute('data-nav'));
            });
        });

        // Paluu arcade-valikkoon
        Array.prototype.forEach.call(document.querySelectorAll('[data-arcade]'), (btn) => {
            btn.addEventListener('click', () => {
                Stone.Game.detach();
                window.location.href = '../../index.html';
            });
        });

        // Tason valinta
        const slider = $('playSlider');
        slider.addEventListener('input', () => {
            selectedLevel = clampInt(parseInt(slider.value, 10) || 1, 1, Save.raw().unlockedLevels);
            $('playLevelInput').value = String(selectedLevel);
            renderPlay();
        });

        $('playLevelInput').addEventListener('change', () => {
            let v = parseInt($('playLevelInput').value, 10) || 1;
            v = clampInt(v, 1, Save.raw().unlockedLevels);
            selectedLevel = v;
            renderPlay();
        });

        $('btnLevelDown').addEventListener('click', () => {
            selectedLevel = clampInt(selectedLevel - 1, 1, Save.raw().unlockedLevels);
            renderPlay();
        });
        $('btnLevelUp').addEventListener('click', () => {
            selectedLevel = clampInt(selectedLevel + 1, 1, Save.raw().unlockedLevels);
            renderPlay();
        });
        $('btnLevelMax').addEventListener('click', () => {
            selectedLevel = Save.raw().unlockedLevels;
            renderPlay();
        });

        // Tason aloitus
        $('btnStartLevel').addEventListener('click', () => {
            if (selectedLevel > Save.raw().unlockedLevels) return;
            launchLevel(selectedLevel);
        });

        // Lobbyn iso PLAY-nappi aloittaa seuraavan kentän
        $('btnLobbyPlay').addEventListener('click', () => {
            Stone.Sound.unlock();
            Stone.Sound.click();
            selectedLevel = clampInt(Save.raw().unlockedLevels, 1, Stone.MAX_LEVEL);
            launchLevel(selectedLevel);
        });

        // Pause
        $('btnGamePause').addEventListener('click', () => {
            Stone.Game.setPaused(true);
            $('pauseOverlay').hidden = false;
        });
        $('btnResume').addEventListener('click', () => {
            Stone.Game.setPaused(false);
            $('pauseOverlay').hidden = true;
        });
        $('btnRestartLevel').addEventListener('click', () => {
            $('pauseOverlay').hidden = true;
            Stone.Game.detach();
            launchLevel(lastResult ? lastResult.level : selectedLevel);
        });
        $('btnQuitLevel').addEventListener('click', () => {
            $('pauseOverlay').hidden = true;
            Stone.Game.detach();
            showScreen('lobby');
        });

        // Aseiden vaihto pelissä
        for (let i = 0; i < 4; i++) {
            const btn = $('slotBtn' + i);
            if (!btn) continue;
            btn.addEventListener('click', () => {
                if (typeof Stone.Game.selectSlot === 'function') Stone.Game.selectSlot(i);
            });
        }

        // Pause näppäimistöltä
        window.addEventListener('keydown', (e) => {
            if (screen !== 'game') return;
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                const paused = Stone.Game.getState() === 'pause';
                Stone.Game.setPaused(!paused);
                $('pauseOverlay').hidden = paused;
            }
        });

        // Tulokset
        $('btnNextLevel').addEventListener('click', () => {
            const next = clampInt((lastResult ? lastResult.level : 1) + 1, 1, Stone.MAX_LEVEL);
            selectedLevel = next;
            $('resultOverlay').hidden = true;
            launchLevel(next);
        });
        $('btnRetryLevel').addEventListener('click', () => {
            const lvl = lastResult ? lastResult.level : selectedLevel;
            $('resultOverlay').hidden = true;
            launchLevel(lvl);
        });
        $('btnResultLobby').addEventListener('click', () => {
            $('resultOverlay').hidden = true;
            showScreen('lobby');
        });

        // Asetukset
        $('setSound').addEventListener('change', (e) => {
            Save.setSetting('sound', e.target.checked);
            Stone.Sound.refresh();
        });
        $('setMusic').addEventListener('change', (e) => {
            Save.setSetting('music', e.target.checked);
        });
        $('setShake').addEventListener('change', (e) => {
            Save.setSetting('screenShake', e.target.checked);
        });
        $('setTouch').addEventListener('change', (e) => {
            Save.setSetting('showTouch', e.target.checked);
            applyTouchVisibility();
        });
        $('btnResetSave').addEventListener('click', () => {
            if (confirm('Nollataanko kaikki edistyminen? Tätä ei voi perua.')) {
                Save.reset();
                Save.ensureLoadout();
                selectedLevel = 1;
                refreshCurrency();
                renderSettings();
                renderProfile();
                toast('Edistyminen nollattu', 'warn');
            }
        });

        // Näppäimistö valikoissa
        window.addEventListener('keydown', (e) => {
            if (screen === 'game') return;
            if (e.code === 'Escape' && screen !== 'lobby') {
                e.preventDefault();
                showScreen('lobby');
            }
        });
    }

    function clampInt(v, a, b) {
        return Math.min(b, Math.max(a, v));
    }

    /* ============================================================
       KÄYNNISTYS
       ============================================================ */

    function init() {
        Save.load();
        Save.ensureLoadout();
        selectedLevel = clampInt(Save.raw().unlockedLevels, 1, Stone.MAX_LEVEL);

        bindEvents();
        applyTouchVisibility();
        startHudLoop();
        showScreen('lobby');
        refreshCurrency();

        // Kehityskoukku testaukseen
        window.__engine = window.__engine || {};
        if (window.__engine) {
            Object.assign(window.__engine, {
                screen: () => screen,
                showScreen,
                showResult,
                save: Save,
                data: Stone,
                game: Stone.Game,
                selectLevel: (n) => { selectedLevel = clampInt(n, 1, Stone.MAX_LEVEL); renderPlay(); },
                selectedLevel: () => selectedLevel,
                lastResult: () => lastResult,
                launch: (n) => launchLevel(n),
                setLockerTab: (t) => { lockerTab = t; renderLocker(); },
                setShopTab: (t) => { shopTab = t; renderShop(); },
                setLoadoutSlot: (s) => { loadoutSlot = s; renderLoadout(); },
                lockerTab: () => lockerTab,
                shopTab: () => shopTab,
                loadoutSlot: () => loadoutSlot,
                toast
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
