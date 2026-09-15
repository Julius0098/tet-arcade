/* ============================================================
   Stone Age Survival — pelimoottori
   Ylhäältä kuvattu selviytymistaistelu. Puhdas canvas + vanilla JS.

   Ohjaus:
     - Liiku: WASD / nuolet, vasen virtuaalitatti
     - Tähtää ja ammu: hiiren osoitin + vasen nappi / Space,
       oikea virtuaalitatti (twin-stick)
     - Vaihda ase: 1-4 / Q
     - Tauko: P / Esc
   ============================================================ */

(() => {
    'use strict';

    const Stone = window.StoneAge = window.StoneAge || {};
    const Save = Stone.Save;
    const Draw = Stone.Draw;

    /* ============================================================
       VAKIOT
       ============================================================ */

    const ARENA_W = 1600;
    const ARENA_H = 1000;
    const PAD = 1.2;                    // kuinka paljon reunojen ulkopuolelta piirretään

    const PLAYER_RADIUS = 18;
    const PLAYER_SPEED = 240;
    const PLAYER_MAX_HP = 100;

    const MELEE_ARC = Math.PI * 0.7;    // lähitaistelun kaari
    const MELEE_DURATION = 0.18;

    const INVULN_TIME = 1.4;
    const HIT_FLASH = 0.25;

    const SLOT_ORDER = ['primary', 'secondary', 'special', 'melee'];

    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
    const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
    const rand = (a, b) => a + Math.random() * (b - a);

    /* ============================================================
       TILA
       ============================================================ */

    let canvas = null;
    let ctx = null;

    let state = 'idle';                 // idle | play | pause | dead | clear
    let level = 1;
    let levelDef = null;
    let onFinish = null;                // kutsu: (result) => void

    let player = null;
    let enemies = [];
    let bullets = [];
    let enemyBullets = [];
    let pickups = [];
    let particles = [];
    let floaters = [];

    let waveIndex = 0;
    let waveTimer = 0;
    let waveState = 'intro';            // intro | fighting | cleared | boss
    let bossActive = false;

    let score = 0;
    let coinsEarned = 0;
    let enemiesDefeated = 0;
    let damageTaken = 0;
    let elapsed = 0;
    let comboCount = 0;
    let comboTimer = 0;

    let camX = 0;
    let camY = 0;
    let shakeAmount = 0;
    let flashTimer = 0;

    let viewScale = 1;

    // Kuolinanimaation ajastin. Käytetään omaa laskuria setTimeoutin sijaan,
    // jotta ajastus etenee pelisilmukan tahdissa eikä jää jumiin.
    let deathDelay = 0;

    /* ============================================================
       SYÖTE
       ============================================================ */

    const keys = Object.create(null);
    const moveStick = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
    const aimStick = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
    const mouse = { x: ARENA_W / 2, y: ARENA_H / 2, down: false, active: false };

    const KEY_MAP = {
        KeyW: 'up', ArrowUp: 'up',
        KeyS: 'down', ArrowDown: 'down',
        KeyA: 'left', ArrowLeft: 'left',
        KeyD: 'right', ArrowRight: 'right'
    };

    function onKeyDown(e) {
        if (KEY_MAP[e.code]) {
            keys[KEY_MAP[e.code]] = true;
            e.preventDefault();
            return;
        }
        if (e.code === 'Space') {
            keys.fire = true;
            e.preventDefault();
            return;
        }
        if (e.code === 'Digit1') { selectSlot(0); e.preventDefault(); return; }
        if (e.code === 'Digit2') { selectSlot(1); e.preventDefault(); return; }
        if (e.code === 'Digit3') { selectSlot(2); e.preventDefault(); return; }
        if (e.code === 'Digit4') { selectSlot(3); e.preventDefault(); return; }
        if (e.code === 'KeyQ') { cycleSlot(); e.preventDefault(); }
    }

    function onKeyUp(e) {
        if (KEY_MAP[e.code]) { keys[KEY_MAP[e.code]] = false; e.preventDefault(); }
        if (e.code === 'Space') { keys.fire = false; e.preventDefault(); }
    }

    function bindInput() {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            // Muunnetaan hiiren sijainti pelialueen koordinaatteihin.
            const localX = (e.clientX - rect.left) / viewScale;
            const localY = (e.clientY - rect.top) / viewScale;
            mouse.x = camX + localX;
            mouse.y = camY + localY;
            mouse.active = true;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { mouse.down = true; mouse.active = true; }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) mouse.down = false;
        });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Kosketus: kaksi virtuaalitattia
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        window.addEventListener('blur', () => {
            Object.keys(keys).forEach((k) => { keys[k] = false; });
            if (state === 'play' && typeof Stone.onAutoPause === 'function') Stone.onAutoPause();
        });
    }

    function touchCanvasPos(touch) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) / rect.width,
            y: (touch.clientY - rect.top) / rect.height
        };
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const p = touchCanvasPos(touch);
            if (p.x < 0.5 && !moveStick.active) {
                moveStick.active = true;
                moveStick.id = touch.identifier;
                moveStick.ox = touch.clientX - rect.left;
                moveStick.oy = touch.clientY - rect.top;
                moveStick.x = 0;
                moveStick.y = 0;
            } else if (p.x >= 0.5 && !aimStick.active) {
                aimStick.active = true;
                aimStick.id = touch.identifier;
                aimStick.ox = touch.clientX - rect.left;
                aimStick.oy = touch.clientY - rect.top;
                aimStick.x = 0;
                aimStick.y = 0;
            }
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const maxR = Math.min(rect.width, rect.height) * 0.18;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const dx = (touch.clientX - rect.left) - (moveStick.id === touch.identifier ? moveStick.ox : aimStick.ox);
            const dy = (touch.clientY - rect.top) - (moveStick.id === touch.identifier ? moveStick.oy : aimStick.oy);

            const stick = moveStick.id === touch.identifier ? moveStick : (aimStick.id === touch.identifier ? aimStick : null);
            if (!stick) continue;

            const len = Math.hypot(dx, dy);
            if (len < 0.001) { stick.x = 0; stick.y = 0; continue; }
            const k = Math.min(1, len / maxR);
            stick.x = (dx / len) * k;
            stick.y = (dy / len) * k;
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (moveStick.id === touch.identifier) {
                moveStick.active = false;
                moveStick.id = null;
                moveStick.x = 0;
                moveStick.y = 0;
            }
            if (aimStick.id === touch.identifier) {
                aimStick.active = false;
                aimStick.id = null;
                aimStick.x = 0;
                aimStick.y = 0;
            }
        }
    }

    /* ============================================================
       ASEET
       ============================================================ */

    function weaponStats(weaponId) {
        const base = Stone.byId(Stone.WEAPONS, weaponId);
        if (!base) return null;
        const lvl = Save.upgradeLevel(weaponId);
        const bonus = 1 + lvl * 0.12;         // +12 % per uppitaso
        return {
            id: base.id,
            name: base.name,
            slot: base.slot,
            visual: base.visual,
            damage: base.damage * bonus,
            fireRate: base.fireRate * (1 + lvl * 0.03),
            range: base.range,
            spread: base.spread,
            pellets: base.pellets,
            projectileSpeed: base.projectileSpeed,
            level: lvl
        };
    }

    function currentWeapon() {
        const slot = SLOT_ORDER[player.slot];
        const id = Save.loadout()[slot];
        if (!id) return null;
        return weaponStats(id);
    }

    function selectSlot(index) {
        if (!player) return;
        const slot = SLOT_ORDER[index];
        if (!Save.loadout()[slot]) return;
        player.slot = index;
        player.cooldown = Math.min(player.cooldown, 0.12);
        if (typeof Stone.onSlotChange === 'function') Stone.onSlotChange(index);
    }

    function cycleSlot() {
        if (!player) return;
        for (let i = 1; i <= SLOT_ORDER.length; i++) {
            const next = (player.slot + i) % SLOT_ORDER.length;
            if (Save.loadout()[SLOT_ORDER[next]]) {
                selectSlot(next);
                return;
            }
        }
    }

    /* ============================================================
       TASON KÄYNNISTYS
       ============================================================ */

    function start(levelNumber, callbacks) {
        level = clamp(levelNumber, 1, Stone.MAX_LEVEL);
        levelDef = Stone.buildLevel(level);
        onFinish = callbacks && callbacks.onFinish ? callbacks.onFinish : function () {};

        const spawn = spawnPoint();
        const weaponId = Save.loadout().melee || 'club';
        const ws = weaponStats(weaponId);

        player = {
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            hp: PLAYER_MAX_HP,
            maxHp: PLAYER_MAX_HP,
            facing: 0,
            slot: 3,                       // aloitetaan lähitaisteluaseella
            cooldown: 0,
            invuln: 1.2,
            hitFlash: 0,
            meleeTimer: 0,
            meleeAngle: 0,
            alive: true,
            walkPhase: 0,
            weapon: ws
        };

        // Valitaan ensimmäinen olemassa oleva ase
        for (let i = 0; i < SLOT_ORDER.length; i++) {
            if (Save.loadout()[SLOT_ORDER[i]]) { player.slot = i; break; }
        }

        enemies = [];
        bullets = [];
        enemyBullets = [];
        pickups = [];
        particles = [];
        floaters = [];

        waveIndex = 0;
        waveTimer = 1.2;
        waveState = 'intro';
        bossActive = false;

        score = 0;
        coinsEarned = 0;
        enemiesDefeated = 0;
        damageTaken = 0;
        elapsed = 0;
        comboCount = 0;
        comboTimer = 0;

        camX = 0;
        camY = 0;
        shakeAmount = 0;
        flashTimer = 0;
        deathDelay = 0;

        state = 'play';
        return levelDef;
    }

    // Pelaaja syntyy kentän keskelle, vapaaseen kohtaan.
    function spawnPoint() {
        return { x: ARENA_W / 2, y: ARENA_H / 2 };
    }

    /* ============================================================
       AALTOJEN HALLINTA
       ============================================================ */

    function updateWaves(dt) {
        const totalWaves = levelDef.waves.length;

        if (waveState === 'intro') {
            waveTimer -= dt;
            if (waveTimer <= 0) {
                spawnWave();
                waveState = 'fighting';
            }
            return;
        }

        if (waveState === 'fighting') {
            if (enemies.length === 0) {
                waveIndex++;
                if (waveIndex >= totalWaves) {
                    if (levelDef.boss && !bossActive) {
                        spawnBoss();
                        bossActive = true;
                        waveState = 'fighting';
                    } else {
                        finishLevel(true);
                    }
                } else {
                    waveState = 'intro';
                    waveTimer = 1.1;
                }
            }
            return;
        }
    }

    function spawnWave() {
        const wave = levelDef.waves[waveIndex] || [];
        wave.forEach((def, i) => {
            const angle = (i / Math.max(1, wave.length)) * Math.PI * 2 + Math.random();
            const radius = rand(380, 620);
            const x = clamp(ARENA_W / 2 + Math.cos(angle) * radius, 60, ARENA_W - 60);
            const y = clamp(ARENA_H / 2 + Math.sin(angle) * radius, 60, ARENA_H - 60);
            enemies.push(makeEnemy(def, x, y));
        });
    }

    function spawnBoss() {
        const b = levelDef.boss;
        enemies.push(makeEnemy(b, ARENA_W / 2, 140, true));
        addFloater(ARENA_W / 2, 180, b.name.toUpperCase(), '#ff5c8a', 3);
        shakeAmount = 14;
    }

    function makeEnemy(def, x, y, isBoss) {
        return {
            x, y,
            vx: 0, vy: 0,
            hp: def.hp,
            maxHp: def.hp,
            speed: def.speed,
            damage: def.damage,
            size: def.size,
            color: def.color,
            behavior: def.behavior || 'chase',
            kind: def.kind,
            isBoss: !!isBoss,
            name: def.name || def.kind,
            pattern: def.pattern || null,
            cooldown: rand(0.4, 1.6),
            chargeTimer: 0,
            chargeDir: { x: 0, y: 0 },
            hurtFlash: 0,
            wobble: Math.random() * 6,
            phase: 1,
            phaseTimer: 0,
            angle: 0
        };
    }

    /* ============================================================
       PÄIVITYS
       ============================================================ */

    function update(dt) {
        if (state !== 'play' && state !== 'dead' && state !== 'clear') return;

        if (state === 'play') {
            elapsed += dt;
            if (comboTimer > 0) {
                comboTimer -= dt;
                if (comboTimer <= 0) comboCount = 0;
            }
        }

        if (player) updatePlayer(dt);
        updateEnemies(dt);
        updateBullets(dt);
        updateEnemyBullets(dt);
        updatePickups(dt);
        updateParticles(dt);

        if (state === 'play') updateWaves(dt);

        // Kuolinanimaatio: tulostaulu vasta lyhyen hetken jälkeen.
        if (state === 'dead' && deathDelay > 0) {
            deathDelay -= dt;
            if (deathDelay <= 0) {
                deathDelay = 0;
                finishLevel(false);
            }
        }

        updateCamera(dt);

        if (shakeAmount > 0) shakeAmount = Math.max(0, shakeAmount - dt * 40);
        if (flashTimer > 0) flashTimer -= dt;
    }

    function moveAxis(entity, dt) {
        entity.x = clamp(entity.x, entity.size, ARENA_W - entity.size);
        entity.y = clamp(entity.y, entity.size, ARENA_H - entity.size);
    }

    function updatePlayer(dt) {
        if (!player.alive) return;

        // Liikesuunta: näppäimistö + virtuaalitatti
        let mx = 0;
        let my = 0;
        if (keys.left) mx -= 1;
        if (keys.right) mx += 1;
        if (keys.up) my -= 1;
        if (keys.down) my += 1;
        if (moveStick.active) { mx += moveStick.x; my += moveStick.y; }

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }

        player.vx = mx * PLAYER_SPEED;
        player.vy = my * PLAYER_SPEED;
        player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS, ARENA_W - PLAYER_RADIUS);
        player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS, ARENA_H - PLAYER_RADIUS);

        if (len > 0.05) player.walkPhase += dt * 9;

        // Tähtäys: virtuaalitatti tai hiiri
        let aimX = null;
        let aimY = null;
        if (aimStick.active && Math.hypot(aimStick.x, aimStick.y) > 0.15) {
            aimX = player.x + aimStick.x * 300;
            aimY = player.y + aimStick.y * 300;
        } else if (mouse.active) {
            aimX = mouse.x;
            aimY = mouse.y;
        }

        if (aimX !== null) {
            player.facing = Math.atan2(aimY - player.y, aimX - player.x);
        } else if (len > 0.05) {
            player.facing = Math.atan2(my, mx);
        }

        // Ampuminen
        if (player.cooldown > 0) player.cooldown -= dt;
        if (player.meleeTimer > 0) player.meleeTimer -= dt;
        if (player.invuln > 0) player.invuln -= dt;
        if (player.hitFlash > 0) player.hitFlash -= dt;

        const wantsFire = keys.fire || mouse.down || (aimStick.active && Math.hypot(aimStick.x, aimStick.y) > 0.55);
        if (wantsFire && player.cooldown <= 0) {
            fireWeapon();
        }

        // Kosketus: automaattinen lähitaistelu, jos ollaan lähellä vihollista
        if (aimStick.active && !wantsFire && player.cooldown <= 0) {
            const near = nearestEnemy(player.x, player.y, 90);
            if (near && SLOT_ORDER[player.slot] === 'melee') fireWeapon();
        }
    }

    function nearestEnemy(x, y, maxDist) {
        let best = null;
        let bestD = maxDist;
        for (let i = 0; i < enemies.length; i++) {
            const d = dist(x, y, enemies[i].x, enemies[i].y);
            if (d < bestD) { bestD = d; best = enemies[i]; }
        }
        return best;
    }

    function fireWeapon() {
        const w = currentWeapon();
        if (!w) return;

        player.cooldown = 1 / w.fireRate;

        if (w.slot === 'melee') {
            player.meleeTimer = MELEE_DURATION;
            player.meleeAngle = player.facing;
            // Osutaan kaikkiin kaaren sisällä oleviin
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                const d = dist(player.x, player.y, e.x, e.y);
                if (d > w.range + e.size) continue;
                const a = Math.atan2(e.y - player.y, e.x - player.x);
                let diff = Math.abs(((a - player.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
                if (diff > MELEE_ARC / 2) continue;
                damageEnemy(e, w.damage, a);
            }
            Sound.melee();
            return;
        }

        const count = w.pellets || 1;
        for (let i = 0; i < count; i++) {
            const spread = (w.spread || 0.04) * (count > 1 ? (i - (count - 1) / 2) : (Math.random() - 0.5));
            const angle = player.facing + spread;
            bullets.push({
                x: player.x + Math.cos(angle) * 20,
                y: player.y + Math.sin(angle) * 20,
                vx: Math.cos(angle) * w.projectileSpeed,
                vy: Math.sin(angle) * w.projectileSpeed,
                damage: w.damage,
                life: w.range / w.projectileSpeed,
                radius: w.slot === 'special' ? 9 : 5,
                color: bulletColor(w),
                pierce: w.slot === 'special' ? 1 : 0,
                trail: []
            });
        }

        if (w.slot === 'primary') Sound.shootBow();
        else if (w.slot === 'secondary') Sound.shootThrow();
        else Sound.shootHeavy();

        shakeAmount = Math.min(6, shakeAmount + (w.slot === 'special' ? 4 : 1.6));
    }

    function bulletColor(w) {
        const skinId = Save.equipped('skin');
        const skin = Stone.byId(Stone.SKINS, skinId);
        if (skin && skin.colors && skin.colors.glow) return skin.colors.glow;
        if (w.slot === 'special') return 'rgba(255,140,60,0.9)';
        if (w.slot === 'secondary') return 'rgba(200,200,180,0.9)';
        return 'rgba(255,230,150,0.95)';
    }

    /* ---------- Viholliset ---------- */

    function updateEnemies(dt) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.wobble += dt * 5;
            if (e.hurtFlash > 0) e.hurtFlash -= dt;
            if (e.cooldown > 0) e.cooldown -= dt;

            if (e.isBoss) updateBoss(e, dt);
            else updateEnemyBehavior(e, dt);

            // Osuma pelaajaan
            if (player.alive && dist(e.x, e.y, player.x, player.y) < e.size + PLAYER_RADIUS - 4) {
                hurtPlayer(e.damage);
                // Törmäys työntää vihollista taaksepäin
                const a = Math.atan2(e.y - player.y, e.x - player.x);
                e.x += Math.cos(a) * 18;
                e.y += Math.sin(a) * 18;
            }

            if (e.hp <= 0) {
                killEnemy(e);
                enemies.splice(i, 1);
            }
        }
    }

    function updateEnemyBehavior(e, dt) {
        const d = dist(e.x, e.y, player.x, player.y);
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.angle = angle;

        if (e.behavior === 'chase') {
            e.x += Math.cos(angle) * e.speed * dt;
            e.y += Math.sin(angle) * e.speed * dt;

        } else if (e.behavior === 'charge') {
            e.chargeTimer -= dt;
            if (e.chargeTimer <= 0) {
                e.chargeTimer = rand(1.6, 2.6);
                e.chargeDir = { x: Math.cos(angle), y: Math.sin(angle) };
                e.charging = 1;
            }
            if (e.charging > 0) {
                e.charging -= dt;
                e.x += e.chargeDir.x * e.speed * 2.1 * dt;
                e.y += e.chargeDir.y * e.speed * 2.1 * dt;
            } else {
                e.x += Math.cos(angle) * e.speed * 0.5 * dt;
                e.y += Math.sin(angle) * e.speed * 0.5 * dt;
            }

        } else if (e.behavior === 'ranged') {
            // Pysyy etäisyydellä ja ampuaan
            const ideal = 300;
            const move = d > ideal + 40 ? 1 : (d < ideal - 40 ? -1 : 0);
            e.x += Math.cos(angle) * e.speed * move * dt;
            e.y += Math.sin(angle) * e.speed * move * dt;
            // Sivuttaisliike
            e.x += Math.cos(angle + Math.PI / 2) * e.speed * 0.5 * dt * Math.sin(e.wobble * 0.5);
            e.y += Math.sin(angle + Math.PI / 2) * e.speed * 0.5 * dt * Math.sin(e.wobble * 0.5);

            if (e.cooldown <= 0 && d < 520) {
                e.cooldown = rand(1.4, 2.4);
                enemyShoot(e, angle);
            }

        } else if (e.behavior === 'erratic') {
            e.wobble += dt * 6;
            const a = angle + Math.sin(e.wobble) * 0.9;
            e.x += Math.cos(a) * e.speed * dt;
            e.y += Math.sin(a) * e.speed * dt;

        } else if (e.behavior === 'pack') {
            // Hakeutuu lähimmän lajitoverin viereen ja jahtaa
            let cx = 0;
            let cy = 0;
            let n = 0;
            for (let i = 0; i < enemies.length; i++) {
                const o = enemies[i];
                if (o === e) continue;
                if (dist(o.x, o.y, e.x, e.y) < 220) { cx += o.x; cy += o.y; n++; }
            }
            if (n > 0) {
                cx /= n; cy /= n;
                e.x += (cx - e.x) * 0.6 * dt;
                e.y += (cy - e.y) * 0.6 * dt;
            }
            e.x += Math.cos(angle) * e.speed * dt;
            e.y += Math.sin(angle) * e.speed * dt;
        }

        moveAxis(e, dt);
    }

    function updateBoss(e, dt) {
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
            e.phaseTimer = rand(2.2, 3.4);
            e.phase = e.phase === 1 ? 2 : 1;
        }

        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.angle = angle;
        const speed = e.speed * (e.phase === 2 ? 1.5 : 1);

        const pattern = e.pattern || 'charge';

        if (pattern === 'charge' || pattern === 'stomp') {
            e.chargeTimer -= dt;
            if (e.chargeTimer <= 0) {
                e.chargeTimer = rand(1.8, 2.8);
                e.chargeDir = { x: Math.cos(angle), y: Math.sin(angle) };
                e.charging = 0.7;
                if (pattern === 'stomp') {
                    // Jysähdys: rengas joka vahingoittaa lähellä
                    for (let i = 0; i < 14; i++) {
                        const a = (i / 14) * Math.PI * 2;
                        spawnParticle(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, a, 180, '#c9a06b', 0.5, 4);
                    }
                    if (dist(e.x, e.y, player.x, player.y) < 150) hurtPlayer(e.damage * 0.7);
                    shakeAmount = 16;
                }
            }
            if (e.charging > 0) {
                e.charging -= dt;
                e.x += e.chargeDir.x * speed * 2.2 * dt;
                e.y += e.chargeDir.y * speed * 2.2 * dt;
            } else {
                e.x += Math.cos(angle) * speed * 0.6 * dt;
                e.y += Math.sin(angle) * speed * 0.6 * dt;
            }

        } else if (pattern === 'shards' || pattern === 'fire' || pattern === 'mixed') {
            // Liikkuu kiertäen ja ampuu kuvioita
            const orbit = angle + Math.PI / 2;
            e.x += Math.cos(orbit) * speed * 0.8 * dt;
            e.y += Math.sin(orbit) * speed * 0.8 * dt;

            if (e.cooldown <= 0) {
                e.cooldown = pattern === 'fire' ? 1.5 : 1.9;
                const shots = pattern === 'mixed' ? 10 : 7;
                for (let i = 0; i < shots; i++) {
                    const a = angle + (i - (shots - 1) / 2) * 0.22;
                    enemyShoot(e, a, e.damage * 0.55);
                }
            }
        }

        moveAxis(e, dt);
    }

    function enemyShoot(e, angle, damageOverride) {
        enemyBullets.push({
            x: e.x + Math.cos(angle) * (e.size + 6),
            y: e.y + Math.sin(angle) * (e.size + 6),
            vx: Math.cos(angle) * 260,
            vy: Math.sin(angle) * 260,
            damage: damageOverride || e.damage * 0.7,
            life: 2.4,
            radius: 7,
            color: e.isBoss ? '#ff7a3c' : '#c9a06b'
        });
        Sound.enemyShoot();
    }

    function damageEnemy(e, amount, angle) {
        e.hp -= amount;
        e.hurtFlash = HIT_FLASH;
        addFloater(e.x, e.y - e.size, Math.round(amount), '#ffe9a8', 0.7);

        // Osumapisteet
        const p = Math.round(amount * (1 + comboCount * 0.1));
        score += p;

        for (let i = 0; i < 5; i++) {
            spawnParticle(e.x, e.y, angle + rand(-0.8, 0.8), rand(60, 200), e.color, 0.35, 3);
        }

        if (e.hp <= 0) killEnemy(e);
    }

    function killEnemy(e) {
        enemiesDefeated++;
        comboCount++;
        comboTimer = 3.0;

        const base = e.isBoss ? 2500 : 60;
        const gained = Math.round(base * (1 + comboCount * 0.15));
        score += gained;

        // Kolikot: viholliset pudottavat pieniä summia, bossit enemmän
        const coinDrop = e.isBoss ? 150 : Math.round(rand(2, 7));
        coinsEarned += coinDrop;
        Save.addCoins(coinDrop);

        addFloater(e.x, e.y - e.size - 10, '+' + gained, '#7cf0ff', 1);
        addFloater(e.x, e.y - e.size + 8, '+' + coinDrop + ' 🪙', '#ffd45e', 1);

        for (let i = 0; i < (e.isBoss ? 40 : 12); i++) {
            spawnParticle(e.x, e.y, rand(0, Math.PI * 2), rand(80, 340), e.color, rand(0.4, 0.9), e.isBoss ? 6 : 3.5);
        }

        // Viholliset pudottavat joskus parannuspaketin
        if (e.isBoss || Math.random() < 0.09) {
            pickups.push({
                x: e.x, y: e.y, kind: 'health', value: e.isBoss ? 45 : 22,
                life: 16, bob: 0
            });
        }

        if (e.isBoss) {
            Save.addBossDefeated();
            shakeAmount = 22;
            flashTimer = 0.4;
            Sound.bossDown();
        } else {
            Sound.enemyDown();
        }
        Save.addEnemiesDefeated(1);
    }

    /* ---------- Luodit ---------- */

    function updateBullets(dt) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            if (b.x < 0 || b.y < 0 || b.x > ARENA_W || b.y > ARENA_H || b.life <= 0) {
                bullets.splice(i, 1);
                continue;
            }

            let hit = false;
            for (let k = enemies.length - 1; k >= 0; k--) {
                const e = enemies[k];
                if (dist(b.x, b.y, e.x, e.y) < e.size + b.radius) {
                    damageEnemy(e, b.damage, Math.atan2(b.vy, b.vx));
                    if (b.pierce > 0) {
                        b.pierce--;
                    } else {
                        hit = true;
                    }
                    break;
                }
            }
            if (hit) bullets.splice(i, 1);
        }
    }

    function updateEnemyBullets(dt) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > ARENA_W + 40 || b.y > ARENA_H + 40) {
                enemyBullets.splice(i, 1);
                continue;
            }
            if (player.alive && dist(b.x, b.y, player.x, player.y) < PLAYER_RADIUS + b.radius) {
                hurtPlayer(b.damage);
                enemyBullets.splice(i, 1);
            }
        }
    }

    function updatePickups(dt) {
        for (let i = pickups.length - 1; i >= 0; i--) {
            const p = pickups[i];
            p.life -= dt;
            p.bob += dt * 4;

            // Magneetti: kerätään kun ollaan lähellä
            const d = dist(p.x, p.y, player.x, player.y);
            if (d < 260) {
                const a = Math.atan2(player.y - p.y, player.x - p.x);
                p.x += Math.cos(a) * 190 * dt;
                p.y += Math.sin(a) * 190 * dt;
            }
            if (d < PLAYER_RADIUS + 14) {
                player.hp = Math.min(player.maxHp, player.hp + p.value);
                addFloater(player.x, player.y - 30, '+' + p.value + ' HP', '#5fd88a', 1);
                Sound.pickup();
                pickups.splice(i, 1);
                continue;
            }
            if (p.life <= 0) pickups.splice(i, 1);
        }
    }

    function hurtPlayer(amount) {
        if (!player.alive) return;
        if (player.godMode) return;                // vain testikäytössä
        if (player.invuln > 0) return;
        const dmg = Math.max(1, Math.round(amount));
        player.hp -= dmg;
        damageTaken += dmg;
        player.invuln = INVULN_TIME;
        player.hitFlash = 0.45;
        comboCount = 0;
        comboTimer = 0;
        shakeAmount = 10;
        Sound.playerHit();
        addFloater(player.x, player.y - 30, '-' + dmg, '#ff5c7a', 0.9);

        for (let i = 0; i < 10; i++) {
            spawnParticle(player.x, player.y, rand(0, Math.PI * 2), rand(60, 220), '#ff5c7a', 0.5, 3);
        }

        if (player.hp <= 0) {
            player.hp = 0;
            player.alive = false;
            state = 'dead';
            deathDelay = 1.5;
            Sound.playerDown();
            shakeAmount = 24;
        }
    }

    /* ---------- Hiukkaset ---------- */

    function spawnParticle(x, y, angle, speed, color, life, size) {
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life, max: life,
            color, size
        });
    }

    function addFloater(x, y, text, color, life) {
        floaters.push({ x, y, text: String(text), color: color || '#ffffff', life: life || 1, max: life || 1 });
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (let i = floaters.length - 1; i >= 0; i--) {
            const f = floaters[i];
            f.y -= dt * 34;
            f.life -= dt;
            if (f.life <= 0) floaters.splice(i, 1);
        }
    }

    /* ---------- Kamera ---------- */

    function updateCamera(dt) {
        const viewW = canvas ? canvas.width / (window.devicePixelRatio || 1) / viewScale : ARENA_W;
        const viewH = canvas ? canvas.height / (window.devicePixelRatio || 1) / viewScale : ARENA_H;

        const targetX = clamp(player.x - viewW / 2, 0, Math.max(0, ARENA_W - viewW));
        const targetY = clamp(player.y - viewH / 2, 0, Math.max(0, ARENA_H - viewH));

        camX += (targetX - camX) * Math.min(1, dt * 7);
        camY += (targetY - camY) * Math.min(1, dt * 7);
    }

    /* ---------- Tason päätös ---------- */

    function finishLevel(victory) {
        if (state === 'clear') return;
        state = 'clear';

        const noDamage = damageTaken === 0;
        const fastClear = elapsed <= 90;
        const allEnemies = true;              // kaikki aallot on aina tapettu
        const allBonus = noDamage && fastClear;

        // Bonukset
        const bonus = [];
        if (noDamage) bonus.push({ id: 'no_damage', label: 'NO DAMAGE', coins: 100 });
        if (fastClear) bonus.push({ id: 'fast_clear', label: 'FAST CLEAR', coins: 150 });
        if (allEnemies) bonus.push({ id: 'all_enemies', label: 'ALL ENEMIES DEFEATED', coins: 100 });
        if (allBonus) bonus.push({ id: 'all_bonus', label: 'ALL BONUS ITEMS', coins: 200 });

        const bonusCoins = bonus.reduce((sum, b) => sum + b.coins, 0);
        const baseReward = victory ? levelDef.reward : Math.round(levelDef.reward * 0.25);
        const total = baseReward + bonusCoins;

        Save.addCoins(total);
        if (victory) Save.completeLevel(level);
        Save.setStat('bestScore', score);

        // Tähtiä suorituksen mukaan
        let stars = 1;
        if (noDamage) stars++;
        if (fastClear) stars++;

        onFinish({
            victory,
            level,
            score,
            coins: total,
            baseReward,
            bonusCoins,
            bonus,
            stars,
            enemiesDefeated,
            damageTaken,
            time: elapsed,
            bonusPickups: coinsEarned
        });
    }

    /* ============================================================
       PIIRTO
       ============================================================ */

    function resize() {
        if (!canvas) return;
        const parent = canvas.parentElement;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const box = parent.getBoundingClientRect();

        canvas.width = Math.max(1, Math.round(box.width * dpr));
        canvas.height = Math.max(1, Math.round(box.height * dpr));
        canvas.style.width = box.width + 'px';
        canvas.style.height = box.height + 'px';

        const viewW = canvas.width / dpr;
        const viewH = canvas.height / dpr;
        viewScale = Math.max(viewW / ARENA_W, viewH / ARENA_H);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render() {
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewW = canvas.width / dpr;
        const viewH = canvas.height / dpr;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const sx = shakeAmount ? (Math.random() - 0.5) * shakeAmount : 0;
        const sy = shakeAmount ? (Math.random() - 0.5) * shakeAmount : 0;

        ctx.save();
        ctx.scale(viewScale, viewScale);
        ctx.translate(-camX + sx / viewScale, -camY + sy / viewScale);

        drawArena(viewW / viewScale, viewH / viewScale);
        drawPickups();
        drawEnemyBullets();
        drawEnemies();
        drawPlayer();
        drawBullets();
        drawParticles();

        ctx.restore();

        drawHudOverlay(viewW, viewH);

        if (flashTimer > 0) {
            ctx.fillStyle = 'rgba(255,80,110,' + (flashTimer * 0.6).toFixed(3) + ')';
            ctx.fillRect(0, 0, viewW, viewH);
        }

        if (state === 'dead') {
            ctx.fillStyle = 'rgba(20,4,10,0.55)';
            ctx.fillRect(0, 0, viewW, viewH);
        }
    }

    function drawArena(viewW, viewH) {
        const biome = levelDef.biome;

        // Tausta
        ctx.fillStyle = biome.sky;
        ctx.fillRect(camX - 40, camY - 40, viewW + 80, viewH + 80);

        // Maan ruudukko
        const tile = 120;
        const startX = Math.floor((camX - 60) / tile) * tile;
        const startY = Math.floor((camY - 60) / tile) * tile;
        const endX = camX + viewW + 60;
        const endY = camY + viewH + 60;

        for (let x = startX; x < endX; x += tile) {
            for (let y = startY; y < endY; y += tile) {
                const even = ((x / tile) + (y / tile)) % 2 === 0;
                ctx.fillStyle = even ? biome.ground : biome.groundAlt;
                ctx.fillRect(x, y, tile, tile);
            }
        }

        // Kivimuodostelmat reunoilla
        ctx.fillStyle = biome.rock;
        drawRocks();

        // Kentän raja
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, ARENA_W - 8, ARENA_H - 8);

        // Syntymisportaali, kun aalto on tulossa
        if (waveState === 'intro' && state === 'play') {
            const pulse = 1 + Math.sin(elapsed * 6) * 0.15;
            ctx.strokeStyle = 'rgba(255,122,60,0.55)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(ARENA_W / 2, ARENA_H / 2, 90 * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(ARENA_W / 2, ARENA_H / 2, 130 * pulse, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Deterministiset kivet, jotta ne eivät vilku.
    let rockCache = null;
    function drawRocks() {
        if (!rockCache) {
            const rnd = Stone.makeRandom(level * 3301 + 17);
            rockCache = [];
            for (let i = 0; i < 26; i++) {
                const edge = Math.floor(rnd() * 4);
                let x, y;
                if (edge === 0) { x = rnd() * ARENA_W; y = rnd() * 40; }
                else if (edge === 1) { x = rnd() * ARENA_W; y = ARENA_H - rnd() * 40; }
                else if (edge === 2) { x = rnd() * 40; y = rnd() * ARENA_H; }
                else { x = ARENA_W - rnd() * 40; y = rnd() * ARENA_H; }
                rockCache.push({
                    x, y,
                    r: 14 + rnd() * 26,
                    sides: 5 + Math.floor(rnd() * 3),
                    rot: rnd() * Math.PI,
                    shade: 0.75 + rnd() * 0.4
                });
            }
        }

        for (let i = 0; i < rockCache.length; i++) {
            const r = rockCache[i];
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.rot);
            ctx.fillStyle = Draw.shade(levelDef.biome.rock, (r.shade - 1) * 0.5);
            ctx.beginPath();
            for (let k = 0; k < r.sides; k++) {
                const a = (k / r.sides) * Math.PI * 2;
                const px = Math.cos(a) * r.r;
                const py = Math.sin(a) * r.r * 0.8;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function drawPlayer() {
        if (!player) return;
        const flash = player.hitFlash > 0 && Math.floor(player.hitFlash * 20) % 2 === 0;
        const blinking = player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0;

        ctx.save();
        ctx.translate(player.x, player.y);

        // Varjo
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, PLAYER_RADIUS * 0.7, PLAYER_RADIUS * 0.9, PLAYER_RADIUS * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = blinking ? 0.55 : 1;

        // Vartalo
        ctx.fillStyle = flash ? '#ffffff' : '#c98a5a';
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Hahmon asun väri hartioilla
        const outfit = Stone.byId(Stone.OUTFITS, Save.equipped('outfit'));
        if (outfit && outfit.palette) {
            ctx.fillStyle = outfit.palette.body;
            ctx.beginPath();
            ctx.arc(0, 3, PLAYER_RADIUS * 0.72, 0.2, Math.PI - 0.2);
            ctx.fill();
        }

        // Aseen suunta
        ctx.rotate(player.facing);
        ctx.fillStyle = '#e8c090';
        ctx.beginPath();
        ctx.arc(PLAYER_RADIUS * 0.55, 0, PLAYER_RADIUS * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Ase
        const w = currentWeapon();
        if (w && w.visual) {
            ctx.save();
            ctx.translate(PLAYER_RADIUS * 0.9, 0);
            const visual = w.visual;
            if (visual === 'bow' || visual === 'firebow' || visual === 'crystalbow' || visual === 'stormbow') {
                ctx.strokeStyle = '#8a5a2b';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 12, -1.1, 1.1);
                ctx.stroke();
            } else if (visual === 'sling') {
                ctx.strokeStyle = '#8a5a2b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 9, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#8a5a2b';
                ctx.fillRect(0, -3, 24, 6);
                ctx.fillStyle = '#c9a06b';
                ctx.fillRect(18, -5, 10, 10);
            }
            ctx.restore();
        }

        ctx.restore();

        // Lähitaistelun kaari
        if (player.meleeTimer > 0) {
            const t = 1 - player.meleeTimer / MELEE_DURATION;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.meleeAngle);
            const radius = w ? w.range : 60;
            ctx.strokeStyle = 'rgba(255,240,200,' + (0.8 * (1 - t)).toFixed(3) + ')';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.arc(0, 0, radius * (0.7 + t * 0.5), -MELEE_ARC / 2, MELEE_ARC / 2);
            ctx.stroke();
            ctx.restore();
        }

        // Tähtäysviiva
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.facing);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(PLAYER_RADIUS + 8, 0);
        ctx.lineTo(PLAYER_RADIUS + 70, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawEnemies() {
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            ctx.save();
            ctx.translate(e.x, e.y);

            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.beginPath();
            ctx.ellipse(0, e.size * 0.7, e.size * 0.9, e.size * 0.32, 0, 0, Math.PI * 2);
            ctx.fill();

            const flash = e.hurtFlash > 0;
            const color = flash ? '#ffffff' : e.color;

            if (e.isBoss) {
                // Bossi: iso, sarvet ja hehku
                ctx.shadowColor = '#ff5c8a';
                ctx.shadowBlur = 20;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, e.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Sarvet
                ctx.fillStyle = '#f0e8d8';
                ctx.beginPath();
                ctx.moveTo(-e.size * 0.6, -e.size * 0.5);
                ctx.lineTo(-e.size * 0.95, -e.size * 0.95);
                ctx.lineTo(-e.size * 0.3, -e.size * 0.7);
                ctx.closePath();
                ctx.moveTo(e.size * 0.6, -e.size * 0.5);
                ctx.lineTo(e.size * 0.95, -e.size * 0.95);
                ctx.lineTo(e.size * 0.3, -e.size * 0.7);
                ctx.closePath();
                ctx.fill();

                // Silmät
                ctx.fillStyle = '#ff2f4f';
                ctx.beginPath();
                ctx.arc(-e.size * 0.28, -e.size * 0.16, e.size * 0.14, 0, Math.PI * 2);
                ctx.arc(e.size * 0.28, -e.size * 0.16, e.size * 0.14, 0, Math.PI * 2);
                ctx.fill();

                // HP-palkki
                const w = e.size * 2.4;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(-w / 2, -e.size - 26, w, 10);
                ctx.fillStyle = '#ff5c8a';
                ctx.fillRect(-w / 2 + 1, -e.size - 25, (w - 2) * clamp(e.hp / e.maxHp, 0, 1), 8);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(e.name.toUpperCase(), 0, -e.size - 34);
                ctx.textAlign = 'left';
            } else {
                // Perusvihollinen: muoto käyttäytymisen mukaan
                ctx.fillStyle = color;
                ctx.beginPath();
                if (e.behavior === 'chase') {
                    ctx.arc(0, 0, e.size, 0, Math.PI * 2);
                } else if (e.behavior === 'charge') {
                    ctx.ellipse(0, 0, e.size * 1.15, e.size * 0.85, e.angle, 0, Math.PI * 2);
                } else if (e.behavior === 'ranged') {
                    ctx.moveTo(0, -e.size);
                    ctx.lineTo(e.size, e.size * 0.8);
                    ctx.lineTo(-e.size, e.size * 0.8);
                    ctx.closePath();
                } else if (e.behavior === 'erratic') {
                    for (let k = 0; k < 6; k++) {
                        const a = (k / 6) * Math.PI * 2 + e.wobble * 0.3;
                        const px = Math.cos(a) * e.size;
                        const py = Math.sin(a) * e.size * 0.8;
                        if (k === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else {
                    ctx.ellipse(0, 0, e.size, e.size * 0.9, e.angle, 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                // Silmät
                ctx.fillStyle = '#ffe9a8';
                ctx.beginPath();
                ctx.arc(-e.size * 0.3, -e.size * 0.2, e.size * 0.16, 0, Math.PI * 2);
                ctx.arc(e.size * 0.3, -e.size * 0.2, e.size * 0.16, 0, Math.PI * 2);
                ctx.fill();

                // HP-palkki vain vahingoittuneille
                if (e.hp < e.maxHp) {
                    const w = e.size * 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(-w / 2, -e.size - 12, w, 5);
                    ctx.fillStyle = '#ff7a3c';
                    ctx.fillRect(-w / 2 + 0.5, -e.size - 11.5, (w - 1) * clamp(e.hp / e.maxHp, 0, 1), 4);
                }
            }

            ctx.restore();
        }
    }

    function drawBullets() {
        for (let i = 0; i < bullets.length; i++) {
            const b = bullets[i];
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function drawEnemyBullets() {
        for (let i = 0; i < enemyBullets.length; i++) {
            const b = enemyBullets[i];
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function drawPickups() {
        for (let i = 0; i < pickups.length; i++) {
            const p = pickups[i];
            const bob = Math.sin(p.bob) * 4;
            const fade = p.life < 3 ? (Math.floor(p.life * 6) % 2 === 0 ? 0.35 : 1) : 1;

            ctx.save();
            ctx.globalAlpha = fade;
            ctx.translate(p.x, p.y + bob);
            ctx.fillStyle = '#5fd88a';
            ctx.shadowColor = '#5fd88a';
            ctx.shadowBlur = 14;
            ctx.fillRect(-9, -4, 18, 8);
            ctx.fillRect(-4, -9, 8, 18);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
        for (let i = 0; i < floaters.length; i++) {
            const f = floaters[i];
            ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillText(f.text, f.x + 1.5, f.y + 1.5);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    // Minimikartta ja aaltotiedot canvasin päälle.
    function drawHudOverlay(viewW, viewH) {
        if (!player) return;

        // Minimikartta oikeaan alakulmaan
        const mapW = 130;
        const mapH = mapW * (ARENA_H / ARENA_W);
        const mx = viewW - mapW - 14;
        const my = viewH - mapH - 14;

        ctx.fillStyle = 'rgba(6,10,20,0.6)';
        ctx.fillRect(mx, my, mapW, mapH);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mapW, mapH);

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            ctx.fillStyle = e.isBoss ? '#ff5c8a' : '#ff7a3c';
            ctx.fillRect(mx + (e.x / ARENA_W) * mapW - 1.5, my + (e.y / ARENA_H) * mapH - 1.5,
                e.isBoss ? 5 : 3, e.isBoss ? 5 : 3);
        }
        for (let i = 0; i < pickups.length; i++) {
            const p = pickups[i];
            ctx.fillStyle = '#5fd88a';
            ctx.fillRect(mx + (p.x / ARENA_W) * mapW - 1.5, my + (p.y / ARENA_H) * mapH - 1.5, 3, 3);
        }

        ctx.fillStyle = '#7cf0ff';
        ctx.beginPath();
        ctx.arc(mx + (player.x / ARENA_W) * mapW, my + (player.y / ARENA_H) * mapH, 3.4, 0, Math.PI * 2);
        ctx.fill();

        // Aaltotieto
        ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'right';
        const waveNo = Math.min(waveIndex + 1, levelDef.waves.length);
        ctx.fillText('WAVE ' + waveNo + ' / ' + levelDef.waves.length, viewW - 16, my - 10);
        if (levelDef.boss) {
            ctx.fillStyle = bossActive || enemies.some((e) => e.isBoss) ? '#ff5c8a' : 'rgba(255,92,138,0.45)';
            ctx.fillText('BOSS', viewW - 16, my - 28);
        }
        ctx.textAlign = 'left';

        // Combo
        if (comboCount > 1) {
            ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
            ctx.fillStyle = '#ffd45e';
            ctx.textAlign = 'center';
            ctx.fillText('COMBO x' + comboCount, viewW / 2, viewH - 24);
            ctx.textAlign = 'left';
        }

        // Aseen lataus
        if (player.cooldown > 0) {
            const w = currentWeapon();
            if (w && w.slot !== 'melee') {
                const barW = 90;
                const total = 1 / w.fireRate;
                const pct = 1 - clamp(player.cooldown / total, 0, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(16, viewH - 26, barW, 6);
                ctx.fillStyle = '#7cf0ff';
                ctx.fillRect(16, viewH - 26, barW * pct, 6);
            }
        }
    }

    /* ============================================================
       PELISILMUKKA
       ============================================================ */

    let rafId = null;
    let lastTime = 0;

    function loop(now) {
        const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
        lastTime = now;

        update(dt);
        render();

        rafId = requestAnimationFrame(loop);
    }

    function attach(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
        bindInput();
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function detach() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        lastTime = 0;
    }

    function setPaused(paused) {
        if (state === 'play' && paused) state = 'pause';
        else if (state === 'pause' && !paused) state = 'play';
    }

    function getState() {
        return state;
    }

    function snapshot() {
        return {
            state,
            level,
            score,
            coinsEarned,
            enemiesDefeated,
            damageTaken,
            time: elapsed,
            playerHp: player ? player.hp : 0,
            enemies: enemies.length,
            wave: waveIndex + 1,
            waves: levelDef ? levelDef.waves.length : 0,
            combo: comboCount,
            boss: !!(levelDef && levelDef.boss)
        };
    }

    /* ============================================================
       ÄÄNET (Web Audio, ei tiedostoja)
       ============================================================ */

    const Sound = (() => {
        let ctxAudio = null;
        let master = null;

        function settings() { return Save.settings(); }

        function ensure() {
            if (ctxAudio) return ctxAudio;
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            try {
                ctxAudio = new Ctor();
                master = ctxAudio.createGain();
                master.gain.value = settings().sound ? 0.5 : 0;
                master.connect(ctxAudio.destination);
            } catch (err) { ctxAudio = null; }
            return ctxAudio;
        }

        function unlock() {
            const c = ensure();
            if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { /* ei tuettu */ } }
        }

        function refresh() {
            if (master) master.gain.value = settings().sound ? 0.5 : 0;
        }

        function tone(o) {
            if (!settings().sound || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const osc = ctxAudio.createOscillator();
            const g = ctxAudio.createGain();
            osc.type = o.type || 'square';
            osc.frequency.setValueAtTime(Math.max(20, o.from), t0);
            if (o.to && o.to !== o.from) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.duration);
            }
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.gain || 0.1), t0 + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
            osc.connect(g); g.connect(master);
            osc.start(t0); osc.stop(t0 + o.duration + 0.02);
        }

        function noise(o) {
            if (!settings().sound || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const len = Math.max(1, Math.floor(ctxAudio.sampleRate * o.duration));
            const buf = ctxAudio.createBuffer(1, len, ctxAudio.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = ctxAudio.createBufferSource();
            src.buffer = buf;
            const f = ctxAudio.createBiquadFilter();
            f.type = o.filter || 'lowpass';
            f.frequency.setValueAtTime(o.cutoff || 1200, t0);
            if (o.cutoffTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.cutoffTo), t0 + o.duration);
            const g = ctxAudio.createGain();
            g.gain.setValueAtTime(o.gain || 0.1, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
            src.connect(f); f.connect(g); g.connect(master);
            src.start(t0);
        }

        return {
            unlock, refresh,
            melee() { noise({ duration: 0.12, gain: 0.09, cutoff: 900, cutoffTo: 200 }); },
            shootBow() { tone({ from: 620, to: 260, duration: 0.1, gain: 0.07, type: 'triangle' }); },
            shootThrow() { noise({ duration: 0.08, gain: 0.06, cutoff: 1800, cutoffTo: 600 }); },
            shootHeavy() { tone({ from: 180, to: 70, duration: 0.22, gain: 0.12, type: 'sawtooth' }); },
            enemyShoot() { tone({ from: 300, to: 180, duration: 0.12, gain: 0.05, type: 'triangle' }); },
            enemyDown() { tone({ from: 260, to: 90, duration: 0.16, gain: 0.09, type: 'square' }); },
            bossDown() {
                [330, 262, 196, 131].forEach((f) => tone({ from: f, to: f * 0.7, duration: 0.36, gain: 0.12, type: 'sawtooth' }));
            },
            playerHit() {
                tone({ from: 220, to: 80, duration: 0.2, gain: 0.12, type: 'sawtooth' });
                noise({ duration: 0.14, gain: 0.08, cutoff: 800, cutoffTo: 200 });
            },
            playerDown() {
                [392, 311, 247, 165].forEach((f) => tone({ from: f, to: f * 0.6, duration: 0.4, gain: 0.13, type: 'sawtooth' }));
            },
            pickup() { tone({ from: 620, to: 940, duration: 0.14, gain: 0.09, type: 'triangle' }); },
            coin() { tone({ from: 1100, to: 1400, duration: 0.1, gain: 0.08, type: 'triangle' }); },
            click() { tone({ from: 720, to: 980, duration: 0.05, gain: 0.05, type: 'square' }); }
        };
    })();

    Stone.Sound = Sound;

    /* ============================================================
       JULKAISU
       ============================================================ */

    Stone.Game = {
        attach,
        detach,
        start,
        setPaused,
        getState,
        snapshot,
        resize,
        selectSlot,
        ARENA_W,
        ARENA_H,

        /* Vain testausta varten: mahdollistaa pelitilan tarkistamisen
           ilman oikeaa syötettä. Nämä eivät vaikuta normaaliin peliin. */
        dev: {
            clearEnemies() {
                for (let i = enemies.length - 1; i >= 0; i--) {
                    killEnemy(enemies[i]);
                    enemies.splice(i, 1);
                }
            },
            spawnBossNow() {
                if (levelDef && levelDef.boss) { spawnBoss(); bossActive = true; }
            },
            skipWave() {
                enemies.length = 0;
            },
            godMode(on) {
                if (player) player.godMode = !!on;
            },
            player() { return player; },
            enemies() { return enemies; },
            bullets() { return bullets; },
            enemyBullets() { return enemyBullets; },
            pickups() { return pickups; },
            levelDef() { return levelDef; },
            forceWave(i) { waveIndex = i; enemies.length = 0; waveState = 'fighting'; },
            setHp(v) { if (player) player.hp = v; }
        }
    };
})();
