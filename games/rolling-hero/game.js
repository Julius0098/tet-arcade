/* ============================================================
   Rolling Hero
   Värikäs 2D-tasohyppely: pyöreä sankari vierii, hyppää ja
   kukistaa viholliset. Puhdas HTML + CSS + vanilla JavaScript,
   ei riippuvuuksia, ei ulkoisia kuvia tai ääniä.

   Kaikki grafiikka piirretään canvasille ja äänet syntetisoidaan
   Web Audiolla, joten peli on täysin omaa tuotantoa.
   ============================================================ */

(() => {
    'use strict';

    /* ---------- Vakiot ---------- */

    const VIEW_W = 960;             // looginen piirtoleveys
    const VIEW_H = 540;             // looginen piirtokorkeus
    const GROUND_Y = 470;           // maan yläreuna

    const GRAVITY = 2200;
    const MAX_FALL = 1250;
    const MOVE_ACCEL = 2600;
    const AIR_ACCEL = 1500;
    const FRICTION = 2400;
    const MAX_SPEED = 340;
    const JUMP_VELOCITY = -820;
    const JUMP_CUT = 0.45;          // hypyn katkaisu, kun nappi vapautetaan
    const COYOTE_TIME = 0.1;        // hetki reunan jälkeen saa vielä hypätä
    const JUMP_BUFFER = 0.12;       // hyppy jonoon ennen maahan osumista
    const MAX_JUMPS = 2;            // kaksi hyppyä (pallo voi ponnistaa ilmassa)
    const BALL_R = 17;              // pallon säde

    const MAX_LIVES = 3;
    const LEVELS_TOTAL = 10;

    const DEATH_FALL_Y = 780;       // tämän alle pudotessa kuolee
    const LEVEL_END_PAD = 220;      // maalin jälkeen lisätilaa

    const STORAGE_KEY = 'rolling-hero-progress';
    const MUTE_KEY = 'rolling-hero-mute';
    const TOUCH_KEY = 'rolling-hero-touch';
    const VOLUME_KEY = 'rolling-hero-volume';
    const HELP_KEY = 'rolling-hero-help-seen';

    const clamp = (v, min, max) => (v < min ? min : (v > max ? max : v));

    /* ---------- KEHITYSKOUKKU ----------
       Vain testausta varten: tarjoaa pelin tilan tarkistuksia varten.
       Asetetaan vain jos window.__engine on olemassa, joten se ei vaikuta
       normaaliin peliin. */
    let devHook = null;
    function exposeDev() {
        if (!devHook) return;
        Object.assign(devHook, {
            state: () => state,
            player: () => player,
            level: () => level,
            levelIndex: () => levelIndex,
            lives: () => lives,
            score: () => score,
            coins: () => runCoins,
            deaths: () => runDeaths,
            levelTime: () => levelTime,
            levelsTotal: () => LEVELS_TOTAL,
            camera: () => camera,
            setState: (s) => { state = s; },
            loadLevel: (i, keep) => { loadLevel(i, keep); state = 'play'; },
            input: (dir, down) => setInput(dir, down),
            start: () => startGame()
        });
    }
    if (typeof window !== 'undefined' && window.__engine) devHook = window.__engine;

    /* ---------- Äänet ----------
       Pieni synteesimoottori: ääniä ei ladata tiedostoista. */

    const Sound = (() => {
        let ctxAudio = null;
        let master = null;
        let muted = false;
        let volume = 0.7;

        try {
            muted = localStorage.getItem(MUTE_KEY) === '1';
            const v = parseFloat(localStorage.getItem(VOLUME_KEY));
            if (!isNaN(v)) volume = clamp(v, 0, 1);
        } catch (err) { /* tallennus ei ole pakollinen */ }

        function ensure() {
            if (ctxAudio) return ctxAudio;
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            try {
                ctxAudio = new Ctor();
                master = ctxAudio.createGain();
                master.gain.value = muted ? 0 : volume;
                master.connect(ctxAudio.destination);
            } catch (err) {
                ctxAudio = null;
            }
            return ctxAudio;
        }

        function unlock() {
            const c = ensure();
            if (c && c.state === 'suspended') {
                try { c.resume(); } catch (err) { /* ei tuettu */ }
            }
        }

        function tone(opts) {
            if (muted || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            osc.type = opts.type || 'sine';
            osc.frequency.setValueAtTime(Math.max(20, opts.from), t0);
            if (opts.to && opts.to !== opts.from) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.duration);
            }
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, opts.gain || 0.15), t0 + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t0);
            osc.stop(t0 + opts.duration + 0.03);
        }

        function noise(opts) {
            if (muted || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const length = Math.max(1, Math.floor(ctxAudio.sampleRate * opts.duration));
            const buffer = ctxAudio.createBuffer(1, length, ctxAudio.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
            const src = ctxAudio.createBufferSource();
            src.buffer = buffer;
            const filter = ctxAudio.createBiquadFilter();
            filter.type = opts.filter || 'lowpass';
            filter.frequency.setValueAtTime(opts.cutoff || 900, t0);
            if (opts.cutoffTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.cutoffTo), t0 + opts.duration);
            const gain = ctxAudio.createGain();
            gain.gain.setValueAtTime(opts.gain || 0.16, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
            src.connect(filter); filter.connect(gain); gain.connect(master);
            src.start(t0);
        }

        return {
            unlock,
            isMuted: () => muted,
            getVolume: () => volume,
            setVolume(v) {
                volume = clamp(v, 0, 1);
                if (master) master.gain.value = muted ? 0 : volume;
                try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch (err) { /* ei pakollinen */ }
            },
            setMuted(next) {
                muted = !!next;
                if (master) master.gain.value = muted ? 0 : volume;
                try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (err) { /* ei pakollinen */ }
            },
            toggle() { this.setMuted(!muted); return muted; },
            jump() {
                tone({ from: 320, to: 620, duration: 0.14, gain: 0.14, type: 'triangle' });
            },
            doubleJump() {
                tone({ from: 520, to: 900, duration: 0.15, gain: 0.12, type: 'triangle' });
            },
            land() {
                noise({ duration: 0.1, gain: 0.07, cutoff: 460, cutoffTo: 160 });
            },
            coin() {
                tone({ from: 1050, to: 1050, duration: 0.06, gain: 0.11, type: 'triangle' });
                tone({ from: 1400, to: 1400, duration: 0.12, gain: 0.1, type: 'triangle' });
            },
            stomp() {
                tone({ from: 300, to: 90, duration: 0.18, gain: 0.16, type: 'square' });
                noise({ duration: 0.14, gain: 0.12, cutoff: 1400, cutoffTo: 200 });
            },
            hurt() {
                tone({ from: 200, to: 60, duration: 0.18, gain: 0.15, type: 'sawtooth' });
            },
            death() {
                tone({ from: 420, to: 70, duration: 0.5, gain: 0.17, type: 'sawtooth' });
                tone({ from: 280, to: 60, duration: 0.5, gain: 0.1, type: 'square' });
                noise({ duration: 0.35, gain: 0.16, cutoff: 1100, cutoffTo: 120 });
            },
            checkpoint() {
                tone({ from: 660, to: 660, duration: 0.1, gain: 0.12, type: 'triangle' });
                tone({ from: 880, to: 880, duration: 0.14, gain: 0.11, type: 'triangle' });
                tone({ from: 1170, to: 1170, duration: 0.2, gain: 0.1, type: 'triangle' });
            },
            win() {
                [523, 659, 784, 1046].forEach((f, i) => {
                    tone({ from: f, to: f, duration: 0.22, gain: 0.13, type: 'triangle' });
                });
                tone({ from: 523, to: 1046, duration: 0.5, gain: 0.1, type: 'sine' });
            },
            click() {
                tone({ from: 700, to: 900, duration: 0.05, gain: 0.07, type: 'square' });
            }
        };
    })();

    /* ---------- Palaset ---------- */

    // Suorakaide: x, y, leveys, korkeus.
    const P = (x, y, w, h) => ({ kind: 'solid', x, y, w, h });

    // Rampi: kolmio, jonka korkea reuna on vasemmalla (dir = -1) tai oikealla (1).
    const RAMP = (x, y, w, h, dir) => ({ kind: 'ramp', x, y, w, h, dir });

    // Liikkuva alusta: kulkee pisteiden x1..x2 (tai y1..y2) väliä.
    const MOVER = (x, y, w, h, axis, dist, speed) => ({
        kind: 'mover', x, y, w, h, axis, dist, speed, t: 0, dir: 1, dx: 0, dy: 0
    });

    // Putoava alusta: alkaa pudota, kun pelaaja osuu siihen.
    const FALLER = (x, y, w, h) => ({
        kind: 'faller', x, y, w, h, startY: y, y0: y, triggered: false, vy: 0, done: false, shake: 0
    });

    // Piikit: tappavat kosketuksesta.
    const SPIKE = (x, y, w) => ({ kind: 'spike', x, y, w, h: 16 });

    // Kolikko.
    const COIN = (x, y) => ({ x, y, r: 11, taken: false, spin: Math.random() * Math.PI * 2 });

    // Checkpoint: asettaa uuden syntymispisteen.
    const CHECK = (x, y) => ({ x, y, active: false, wave: 0 });

    // Maali.
    const GOAL = (x, y) => ({ x, y, wave: 0 });

    // Viholliset.
    const ENEMY_PATROL = (x, y, range, speed) => ({
        kind: 'patrol', x, y, w: 34, h: 26, x0: x, range: range || 110,
        speed: speed || 70, dir: 1, vy: 0, dead: 0, alive: true, wobble: 0
    });

    const ENEMY_CHASER = (x, y, speed) => ({
        kind: 'chaser', x, y, w: 32, h: 30, x0: x, speed: speed || 90,
        vy: 0, dead: 0, alive: true, wobble: 0, awake: false
    });

    const ENEMY_JUMPER = (x, y, range) => ({
        kind: 'jumper', x, y, w: 32, h: 28, x0: x, range: range || 70,
        dir: 1, vy: 0, dead: 0, alive: true, wobble: 0, timer: 0, hop: 0
    });

    function ground(x, w, y) {
        return P(x, y === undefined ? GROUND_Y : y, w, 320);
    }

    // Kenttärakenne: platforms, coins, enemies, spikes, checkpoints, goal.
    function makeLevel(name, build) {
        const level = {
            name: name,
            platforms: [],
            coins: [],
            enemies: [],
            spikes: [],
            checkpoints: [],
            goal: null,
            width: 2600
        };
        build(level);
        return level;
    }

    /* ---------- Kentät (10 kpl, vaikeutuvat) ---------- */

    const LEVELS = [
        // 1 — Kukkuloilla vieriminen
        makeLevel('Vihreät kukkulat', (l) => {
            l.platforms.push(ground(0, 1700));
            l.coins.push(COIN(320, 420), COIN(365, 420), COIN(410, 420));
            l.platforms.push(P(560, 380, 150, 26));
            l.coins.push(COIN(600, 336), COIN(645, 336));
            l.platforms.push(P(830, 320, 130, 26));
            l.coins.push(COIN(870, 276));
            l.enemies.push(ENEMY_PATROL(1120, GROUND_Y - 26, 130));
            l.coins.push(COIN(1240, 420), COIN(1285, 420));
            l.checkpoints.push(CHECK(1420, GROUND_Y));
            l.goal = GOAL(1600, GROUND_Y);
            l.width = 1900;
        }),

        // 2 — Ensimmäinen kuoppa
        makeLevel('Kuopan yli', (l) => {
            l.platforms.push(ground(0, 640));
            l.coins.push(COIN(300, 420), COIN(345, 420));
            l.platforms.push(P(520, 360, 120, 24));
            l.coins.push(COIN(560, 316));
            l.platforms.push(ground(760, 620));
            l.enemies.push(ENEMY_PATROL(1000, GROUND_Y - 26, 150));
            l.checkpoints.push(CHECK(1180, GROUND_Y));
            l.platforms.push(P(1300, 340, 140, 24));
            l.coins.push(COIN(1345, 296), COIN(1390, 296));
            l.platforms.push(ground(1500, 700));
            l.spikes.push(SPIKE(1700, GROUND_Y - 16, 64));
            l.goal = GOAL(1960, GROUND_Y);
            l.width = 2200;
        }),

        // 3 — Piikit ja ramppi
        makeLevel('Piikkien polku', (l) => {
            l.platforms.push(ground(0, 800));
            l.spikes.push(SPIKE(360, GROUND_Y - 16, 48));
            l.coins.push(COIN(380, 400));
            l.platforms.push(RAMP(520, GROUND_Y - 76, 130, 76, 1));
            l.spikes.push(SPIKE(700, GROUND_Y - 16, 64));
            l.coins.push(COIN(720, 400), COIN(765, 400));
            l.platforms.push(ground(880, 560));
            l.enemies.push(ENEMY_PATROL(1100, GROUND_Y - 26, 130));
            l.checkpoints.push(CHECK(1320, GROUND_Y));
            l.platforms.push(P(1420, 350, 120, 24));
            l.coins.push(COIN(1465, 306));
            l.platforms.push(ground(1600, 700));
            l.spikes.push(SPIKE(1820, GROUND_Y - 16, 80));
            l.goal = GOAL(2080, GROUND_Y);
            l.width = 2300;
        }),

        // 4 — Liikkuvat alustat
        makeLevel('Liikkuvat sillat', (l) => {
            l.platforms.push(ground(0, 620));
            l.coins.push(COIN(300, 420), COIN(345, 420));
            l.platforms.push(MOVER(700, 400, 130, 22, 'y', 110, 0.5));
            l.coins.push(COIN(765, 356));
            l.platforms.push(MOVER(960, 380, 120, 22, 'x', 160, 0.6));
            l.coins.push(COIN(1020, 336), COIN(1065, 336));
            l.platforms.push(ground(1220, 520));
            l.enemies.push(ENEMY_PATROL(1400, GROUND_Y - 26, 140));
            l.checkpoints.push(CHECK(1560, GROUND_Y));
            l.platforms.push(P(1680, 330, 130, 24));
            l.coins.push(COIN(1725, 286));
            l.platforms.push(ground(1860, 640));
            l.goal = GOAL(2340, GROUND_Y);
            l.width = 2550;
        }),

        // 5 — Putoavat alustat
        makeLevel('Sortuvat lattiat', (l) => {
            l.platforms.push(ground(0, 560));
            l.coins.push(COIN(280, 420), COIN(325, 420));
            l.platforms.push(FALLER(620, 400, 120, 22));
            l.coins.push(COIN(680, 356));
            l.platforms.push(FALLER(830, 360, 120, 22));
            l.coins.push(COIN(890, 316));
            l.platforms.push(ground(1040, 480));
            l.enemies.push(ENEMY_PATROL(1200, GROUND_Y - 26, 120));
            l.checkpoints.push(CHECK(1400, GROUND_Y));
            l.platforms.push(FALLER(1520, 380, 110, 22));
            l.platforms.push(P(1700, 330, 140, 24));
            l.coins.push(COIN(1750, 286), COIN(1795, 286));
            l.platforms.push(ground(1900, 700));
            l.spikes.push(SPIKE(2120, GROUND_Y - 16, 56));
            l.goal = GOAL(2380, GROUND_Y);
            l.width = 2600;
        }),

        // 6 — Hyppivät viholliset
        makeLevel('Pomppivat pedot', (l) => {
            l.platforms.push(ground(0, 900));
            l.enemies.push(ENEMY_JUMPER(520, GROUND_Y - 28, 90));
            l.coins.push(COIN(540, 400), COIN(585, 400));
            l.enemies.push(ENEMY_JUMPER(760, GROUND_Y - 28, 70));
            l.platforms.push(P(940, 340, 130, 24));
            l.coins.push(COIN(985, 296));
            l.platforms.push(ground(1120, 420));
            l.checkpoints.push(CHECK(1260, GROUND_Y));
            l.enemies.push(ENEMY_PATROL(1400, GROUND_Y - 26, 170, 90));
            l.platforms.push(MOVER(1620, 390, 120, 22, 'y', 120, 0.55));
            l.coins.push(COIN(1680, 346));
            l.platforms.push(ground(1840, 700));
            l.spikes.push(SPIKE(2060, GROUND_Y - 16, 96));
            l.goal = GOAL(2320, GROUND_Y);
            l.width = 2550;
        }),

        // 7 — Takaa-ajaja
        makeLevel('Varjo kannoilla', (l) => {
            l.platforms.push(ground(0, 760));
            l.coins.push(COIN(300, 420), COIN(345, 420), COIN(390, 420));
            l.checkpoints.push(CHECK(560, GROUND_Y));
            l.enemies.push(ENEMY_CHASER(820, GROUND_Y, 105));
            l.platforms.push(P(900, 350, 130, 24));
            l.coins.push(COIN(945, 306));
            l.platforms.push(ground(1060, 440));
            l.spikes.push(SPIKE(1240, GROUND_Y - 16, 48));
            l.platforms.push(RAMP(1340, GROUND_Y - 90, 140, 90, 1));
            l.enemies.push(ENEMY_CHASER(1560, GROUND_Y, 115));
            l.platforms.push(ground(1660, 700));
            l.coins.push(COIN(1800, 420), COIN(1845, 420));
            l.spikes.push(SPIKE(2020, GROUND_Y - 16, 64));
            l.goal = GOAL(2260, GROUND_Y);
            l.width = 2500;
        }),

        // 8 — Sokkelomainen torni
        makeLevel('Kerrosten sokkelo', (l) => {
            l.platforms.push(ground(0, 520));
            l.platforms.push(P(360, 380, 110, 22));
            l.coins.push(COIN(405, 336));
            l.platforms.push(P(540, 300, 110, 22));
            l.coins.push(COIN(585, 256));
            l.platforms.push(P(720, 220, 120, 22));
            l.coins.push(COIN(770, 176), COIN(815, 176));
            l.checkpoints.push(CHECK(770, 220));
            l.platforms.push(ground(900, 420));
            l.enemies.push(ENEMY_JUMPER(1080, GROUND_Y - 28, 80));
            l.platforms.push(MOVER(1360, 340, 130, 22, 'x', 180, 0.62));
            l.coins.push(COIN(1420, 296));
            l.platforms.push(ground(1620, 480));
            l.enemies.push(ENEMY_PATROL(1780, GROUND_Y - 26, 120));
            l.spikes.push(SPIKE(1980, GROUND_Y - 16, 80));
            l.platforms.push(P(2120, 320, 130, 22));
            l.coins.push(COIN(2165, 276));
            l.platforms.push(ground(2280, 560));
            l.goal = GOAL(2660, GROUND_Y);
            l.width = 2900;
        }),

        // 9 — Kaikki yhdessä
        makeLevel('Vaarojen rata', (l) => {
            l.platforms.push(ground(0, 560));
            l.spikes.push(SPIKE(280, GROUND_Y - 16, 64));
            l.coins.push(COIN(300, 400), COIN(345, 400));
            l.platforms.push(MOVER(640, 390, 120, 22, 'y', 130, 0.6));
            l.platforms.push(FALLER(820, 350, 110, 22));
            l.coins.push(COIN(870, 306));
            l.platforms.push(ground(980, 380));
            l.enemies.push(ENEMY_CHASER(1120, GROUND_Y, 120));
            l.checkpoints.push(CHECK(1280, GROUND_Y));
            l.platforms.push(RAMP(1400, GROUND_Y - 96, 140, 96, 1));
            l.spikes.push(SPIKE(1580, GROUND_Y - 16, 96));
            l.coins.push(COIN(1600, 400), COIN(1645, 400));
            l.platforms.push(ground(1740, 400));
            l.enemies.push(ENEMY_JUMPER(1880, GROUND_Y - 28, 90));
            l.platforms.push(MOVER(2100, 330, 130, 22, 'x', 200, 0.66));
            l.coins.push(COIN(2160, 286));
            l.enemies.push(ENEMY_PATROL(2300, GROUND_Y - 26, 150, 100));
            l.platforms.push(ground(2400, 620));
            l.spikes.push(SPIKE(2620, GROUND_Y - 16, 112));
            l.goal = GOAL(2900, GROUND_Y);
            l.width = 3150;
        }),

        // 10 — Loppuottelu
        makeLevel('Sankarin koe', (l) => {
            l.platforms.push(ground(0, 500));
            l.enemies.push(ENEMY_PATROL(300, GROUND_Y - 26, 120, 110));
            l.coins.push(COIN(240, 420), COIN(285, 420));
            l.platforms.push(FALLER(560, 390, 100, 22));
            l.platforms.push(MOVER(720, 340, 110, 22, 'y', 140, 0.66));
            l.coins.push(COIN(775, 296));
            l.platforms.push(ground(900, 340));
            l.checkpoints.push(CHECK(1060, GROUND_Y));
            l.enemies.push(ENEMY_JUMPER(1180, GROUND_Y - 28, 80));
            l.spikes.push(SPIKE(1300, GROUND_Y - 16, 64));
            l.platforms.push(RAMP(1420, GROUND_Y - 110, 150, 110, 1));
            l.coins.push(COIN(1470, 380), COIN(1520, 380));
            l.enemies.push(ENEMY_CHASER(1700, GROUND_Y, 130));
            l.platforms.push(ground(1760, 380));
            l.platforms.push(P(1960, 330, 120, 22));
            l.coins.push(COIN(2005, 286));
            l.platforms.push(MOVER(2160, 400, 120, 22, 'x', 190, 0.7));
            l.platforms.push(FALLER(2400, 360, 110, 22));
            l.platforms.push(ground(2560, 640));
            l.enemies.push(ENEMY_PATROL(2700, GROUND_Y - 26, 160, 120));
            l.spikes.push(SPIKE(2860, GROUND_Y - 16, 128));
            l.coins.push(COIN(2920, 400), COIN(2965, 400), COIN(3010, 400));
            l.goal = GOAL(3120, GROUND_Y);
            l.width = 3400;
        })
    ];

    /* ---------- Pelin tila ---------- */

    let state = 'help';             // help | play | pause | dead | win | final
    let levelIndex = 0;
    let level = null;

    let lives = MAX_LIVES;
    let score = 0;
    let runCoins = 0;
    let runDeaths = 0;
    let levelTime = 0;
    let totalTime = 0;
    let best = { score: 0, time: 0, coins: 0 };

    const player = {
        x: 0, y: 0, w: BALL_R * 2, h: BALL_R * 2,
        vx: 0, vy: 0, rot: 0, spin: 0,
        onGround: false, wasGround: false,
        coyote: 0, buffer: 0, jumps: 0,
        squash: 1, stretch: 1,
        hurtFlash: 0, invuln: 0
    };

    const camera = { x: 0, shake: 0 };
    const particles = [];
    const floaters = [];

    let spawnPoint = { x: 60, y: GROUND_Y - 60 };
    let hintTimer = 0;

    /* ---------- DOM ---------- */

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const stageEl = document.getElementById('stage');

    const hudLevel = document.getElementById('hudLevel');
    const hudLives = document.getElementById('hudLives');
    const hudScore = document.getElementById('hudScore');
    const hudCoins = document.getElementById('hudCoins');
    const hudTime = document.getElementById('hudTime');
    const hintEl = document.getElementById('hint');

    const soundBtn = document.getElementById('soundBtn');
    const soundIcon = document.getElementById('soundIcon');
    const pauseBtn = document.getElementById('pauseBtn');
    const btnPauseTouch = document.getElementById('btnPause');

    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseSub = document.getElementById('pauseSub');
    const settingsPanel = document.getElementById('settingsPanel');
    const optSound = document.getElementById('optSound');
    const optTouch = document.getElementById('optTouch');
    const optVolume = document.getElementById('optVolume');

    const winOverlay = document.getElementById('winOverlay');
    const winBadge = document.getElementById('winBadge');
    const winTitle = document.getElementById('winTitle');
    const winTime = document.getElementById('winTime');
    const winCoins = document.getElementById('winCoins');
    const winDeaths = document.getElementById('winDeaths');
    const winScore = document.getElementById('winScore');
    const winNote = document.getElementById('winNote');

    const finalOverlay = document.getElementById('finalOverlay');
    const finalTime = document.getElementById('finalTime');
    const finalCoins = document.getElementById('finalCoins');
    const finalDeaths = document.getElementById('finalDeaths');
    const finalScore = document.getElementById('finalScore');
    const finalNote = document.getElementById('finalNote');

    const helpOverlay = document.getElementById('helpOverlay');

    /* ---------- Tallennus ---------- */

    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                if (data.best) best = {
                    score: Number(data.best.score) || 0,
                    time: Number(data.best.time) || 0,
                    coins: Number(data.best.coins) || 0
                };
                if (Number.isInteger(data.level)) {
                    levelIndex = clamp(data.level, 0, LEVELS_TOTAL - 1);
                }
            }
        } catch (err) { /* ei pakollinen */ }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                best: best,
                level: levelIndex
            }));
        } catch (err) { /* ei pakollinen */ }
    }

    /* ---------- Koko ja skaalaus ----------
       Piirtoalue on aina 960x540. Canvas sovitetaan ruutuun CSS:llä
       (object-fit: contain), joten peli skaalautuu kaikille näytöille
       eikä mitään jää näytön ulkopuolelle. */

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Piirtoalueen ja puskurin on vastattava toisiaan, muuten puskuriin
        // jäisi piirtämätön alue. CSS huolehtii sovituksesta ruutuun.
        const box = stageEl.getBoundingClientRect();
        const ratio = VIEW_W / VIEW_H;
        let cssW = box.width;
        let cssH = box.height;
        if (cssW / cssH > ratio) cssW = cssH * ratio;
        else cssH = cssW / ratio;

        canvas.width = Math.round(VIEW_W * dpr);
        canvas.height = Math.round(VIEW_H * dpr);
        canvas.style.width = Math.round(cssW) + 'px';
        canvas.style.height = Math.round(cssH) + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
    }

    /* ---------- Syöte ---------- */

    const input = { left: false, right: false, jump: false };

    function setInput(dir, down) {
        if (dir === 'left') input.left = down;
        else if (dir === 'right') input.right = down;
        else if (dir === 'jump') {
            if (down && !input.jump) player.buffer = JUMP_BUFFER;
            input.jump = down;
        }
    }

    const KEY_LEFT = ['ArrowLeft', 'KeyA'];
    const KEY_RIGHT = ['ArrowRight', 'KeyD'];
    const KEY_JUMP = ['Space', 'ArrowUp', 'KeyW'];
    const KEY_PAUSE = ['KeyP', 'Escape'];

    window.addEventListener('keydown', (event) => {
        Sound.unlock();
        if (KEY_LEFT.includes(event.code)) { event.preventDefault(); setInput('left', true); }
        else if (KEY_RIGHT.includes(event.code)) { event.preventDefault(); setInput('right', true); }
        else if (KEY_JUMP.includes(event.code)) { event.preventDefault(); setInput('jump', true); }
        else if (KEY_PAUSE.includes(event.code)) {
            event.preventDefault();
            if (!event.repeat) togglePause();
        } else if (event.code === 'KeyR') {
            event.preventDefault();
            if (state === 'play' || state === 'pause') restartLevel();
        } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            if (state === 'help') { event.preventDefault(); startGame(); }
        }
    });

    window.addEventListener('keyup', (event) => {
        if (KEY_LEFT.includes(event.code)) setInput('left', false);
        else if (KEY_RIGHT.includes(event.code)) setInput('right', false);
        else if (KEY_JUMP.includes(event.code)) setInput('jump', false);
    });

    // Kosketusnapit: pointerdown/up kattaa hiiren ja sormen.
    function bindTouchButton(el, action) {
        if (!el) return;
        const down = (event) => {
            event.preventDefault();
            Sound.unlock();
            el.classList.add('is-down');
            if (action === 'pause') togglePause();
            else setInput(action, true);
        };
        const up = (event) => {
            if (event) event.preventDefault();
            el.classList.remove('is-down');
            if (action !== 'pause') setInput(action, false);
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', up);
        el.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    bindTouchButton(document.getElementById('btnLeft'), 'left');
    bindTouchButton(document.getElementById('btnRight'), 'right');
    bindTouchButton(document.getElementById('btnJump'), 'jump');
    bindTouchButton(btnPauseTouch, 'pause');

    // Sivun vieritys ja zoomaus estetään pelialueella.
    stageEl.addEventListener('gesturestart', (event) => event.preventDefault());
    stageEl.addEventListener('dblclick', (event) => event.preventDefault());
    stageEl.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('gesturestart', (event) => event.preventDefault());

    window.addEventListener('blur', () => {
        input.left = false;
        input.right = false;
        input.jump = false;
        if (state === 'play') togglePause();
    });

    /* ---------- Kentän lataus ---------- */

    function cloneLevel(source) {
        const copy = {
            name: source.name,
            width: source.width,
            platforms: [],
            coins: [],
            enemies: [],
            spikes: [],
            checkpoints: [],
            goal: null
        };

        source.platforms.forEach((p) => {
            if (p.kind === 'mover') {
                copy.platforms.push(Object.assign({}, p, { t: p.t || 0, dir: 1, dx: 0, dy: 0 }));
            } else if (p.kind === 'faller') {
                copy.platforms.push(Object.assign({}, p, {
                    y: p.y0, triggered: false, vy: 0, done: false, shake: 0
                }));
            } else {
                copy.platforms.push(Object.assign({}, p));
            }
        });

        source.coins.forEach((c) => copy.coins.push(Object.assign({}, c, { taken: false })));
        source.spikes.forEach((s) => copy.spikes.push(Object.assign({}, s)));
        source.checkpoints.forEach((c) => copy.checkpoints.push(Object.assign({}, c, { active: false })));

        source.enemies.forEach((e) => {
            copy.enemies.push(Object.assign({}, e, {
                x: e.x0, dir: 1, vy: 0, dead: 0, alive: true, timer: 0, hop: 0, awake: false
            }));
        });

        copy.goal = Object.assign({}, source.goal, { wave: 0 });

        return copy;
    }

    function loadLevel(index, keepScore) {
        levelIndex = clamp(index, 0, LEVELS_TOTAL - 1);
        level = cloneLevel(LEVELS[levelIndex]);

        if (!keepScore) {
            score = 0;
            runCoins = 0;
            runDeaths = 0;
            totalTime = 0;
        }
        lives = MAX_LIVES;
        levelTime = 0;

        spawnPoint = { x: 60, y: GROUND_Y - 60 };
        if (level.checkpoints.length) {
            // Ensimmäinen checkpoint on aina kentän alussa.
            spawnPoint = { x: 60, y: GROUND_Y - 60 };
        }

        placePlayerAtSpawn();
        camera.x = 0;
        camera.shake = 0;
        particles.length = 0;
        floaters.length = 0;
        hintTimer = 2.6;
        showHint('Kenttä ' + (levelIndex + 1) + ': ' + level.name);
        syncHud();
        saveProgress();
    }

    function placePlayerAtSpawn() {
        player.x = spawnPoint.x;
        player.y = spawnPoint.y;
        player.vx = 0;
        player.vy = 0;
        player.rot = 0;
        player.onGround = false;
        player.coyote = 0;
        player.buffer = 0;
        player.jumps = 0;
        player.invuln = 1.2;
        player.squash = 1;
        player.stretch = 1;
    }

    function respawnAtCheckpoint() {
        placePlayerAtSpawn();
        camera.shake = 8;
    }

    /* ---------- Fysiikka ---------- */

    function platformAt(platform) {
        return platform;
    }

    // Rampin pinta tietyllä x-kohdalla.
    function rampSurface(ramp, x) {
        const t = clamp((x - ramp.x) / ramp.w, 0, 1);
        const along = ramp.dir < 0 ? t : 1 - t;
        return ramp.y + ramp.h * along;
    }

    function updateSolids(dt) {
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];

            if (p.kind === 'mover') {
                if (p.startX === undefined) { p.startX = p.x; p.startY = p.y; }
                p.t += dt * p.speed;
                const offset = Math.sin(p.t) * p.dist * 0.5;
                const prevX = p.x;
                const prevY = p.y;
                if (p.axis === 'x') p.x = p.startX + offset;
                else p.y = p.startY + offset;
                p.dx = p.x - prevX;
                p.dy = p.y - prevY;
            } else if (p.kind === 'faller') {
                if (p.triggered && !p.done) {
                    p.shake += dt;
                    p.vy = Math.min(p.vy + GRAVITY * 0.7 * dt, 900);
                    const prevY = p.y;
                    p.y += p.vy * dt;
                    p.dy = p.y - prevY;
                    p.dx = 0;
                    if (p.y > GROUND_Y + 500) p.done = true;
                } else {
                    p.dx = 0;
                    p.dy = 0;
                }
            }
        }
    }

    function solidRects() {
        const out = [];
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            if (p.kind === 'faller' && p.done) continue;
            out.push(p);
        }
        return out;
    }

    function moveWithCollisions(dt) {
        const solids = solidRects();
        const steps = 3;                         // estetään läpi meneminen kovassa vauhdissa
        const stepDt = dt / steps;
        let landed = false;

        for (let s = 0; s < steps; s++) {
            // Vaakasuuntainen liike
            player.x += player.vx * stepDt;
            for (let i = 0; i < solids.length; i++) {
                const p = solids[i];
                if (p.kind === 'ramp') continue;
                if (!overlaps(player, p)) continue;
                if (player.vx > 0) player.x = p.x - player.w;
                else if (player.vx < 0) player.x = p.x + p.w;
                player.vx = 0;
            }

            // Pystyliike
            player.y += player.vy * stepDt;

            for (let i = 0; i < solids.length; i++) {
                const p = solids[i];

                if (p.kind === 'ramp') {
                    // Rampilla liu'utaan pintaa pitkin.
                    const cx = player.x + player.w / 2;
                    if (cx < p.x - 6 || cx > p.x + p.w + 6) continue;
                    const surface = rampSurface(p, cx);
                    const feet = player.y + player.h;
                    if (player.vy >= 0 && feet >= surface && feet <= surface + 46) {
                        player.y = surface - player.h;
                        player.vy = 0;
                        landed = true;
                        player.surface = p;
                    }
                    continue;
                }

                if (!overlaps(player, p)) continue;

                if (player.vy > 0) {
                    player.y = p.y - player.h;
                    landed = true;
                    player.vy = 0;
                    if (p.kind === 'faller' && !p.triggered) p.triggered = true;
                    if (p.kind === 'mover') player.ridePlatform = p;
                } else if (player.vy < 0) {
                    player.y = p.y + p.h;
                    player.vy = 0;
                }
            }
        }

        // Maassa olo paatellaan tormayksista: pelkka rajojen leikkaaminen ei
        // riita, koska pallo lepaa tarkalleen pinnan paalla eivatka rajat
        // silloin enaa leikkaa.
        player.onGround = landed;

        // Liikkuvan alustan kyydissa pysyminen
        if (player.ridePlatform && player.onGround) {
            const p = player.ridePlatform;
            if (p.kind === 'mover' && player.y + player.h > p.y - 8 && player.y + player.h < p.y + p.h + 8) {
                player.x += p.dx;
                player.y += p.dy;
            } else {
                player.ridePlatform = null;
            }
        } else if (!player.onGround) {
            player.ridePlatform = null;
        }
    }

    function overlaps(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function touchesSpikes() {
        for (let i = 0; i < level.spikes.length; i++) {
            const s = level.spikes[i];
            const box = { x: s.x, y: s.y + 3, w: s.w, h: s.h - 3 };
            if (overlaps(player, box)) return true;
        }
        return false;
    }

    /* ---------- Viholliset ---------- */

    function updateEnemies(dt) {
        const pcx = player.x + player.w / 2;

        for (let i = 0; i < level.enemies.length; i++) {
            const e = level.enemies[i];
            if (!e.alive) {
                e.dead -= dt;
                continue;
            }
            e.wobble += dt;

            if (e.kind === 'patrol') {
                e.x += e.dir * e.speed * dt;
                const left = e.x0 - e.range;
                const right = e.x0 + e.range;
                if (e.x < left) { e.x = left; e.dir = 1; }
                if (e.x > right) { e.x = right; e.dir = -1; }

            } else if (e.kind === 'chaser') {
                const dist = pcx - (e.x + e.w / 2);
                if (Math.abs(dist) < 340) e.awake = true;
                if (e.awake) {
                    e.dir = dist > 0 ? 1 : -1;
                    // Pysyy kentän rajoissa
                    const left = e.x0 - 260;
                    const right = e.x0 + 320;
                    e.x += e.dir * e.speed * dt;
                    e.x = clamp(e.x, left, right - e.w);
                }

            } else if (e.kind === 'jumper') {
                e.timer += dt;
                if (e.timer > 0.55) {
                    e.timer = 0;
                    if (nearGround(e)) { e.vy = -560; e.hop = 1; }
                }
                e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
                e.y += e.vy * dt;
                e.x += e.dir * e.speed * dt * 0.6;

                const left = e.x0 - e.range;
                const right = e.x0 + e.range;
                if (e.x < left) { e.x = left; e.dir = 1; }
                if (e.x > right) { e.x = right; e.dir = -1; }

                // Osuma maahan
                const feet = e.y + e.h;
                if (feet >= GROUND_Y && e.vy > 0) {
                    e.y = GROUND_Y - e.h;
                    e.vy = 0;
                    e.hop = 0;
                }
                for (let k = 0; k < level.platforms.length; k++) {
                    const p = level.platforms[k];
                    if (p.kind === 'ramp') continue;
                    if (p.kind === 'faller' && p.done) continue;
                    if (e.x + e.w < p.x || e.x > p.x + p.w) continue;
                    if (e.vy > 0 && feet >= p.y && feet <= p.y + 20) {
                        e.y = p.y - e.h;
                        e.vy = 0;
                        e.hop = 0;
                    }
                }
            }

            if (e.dead > 0) continue;
            checkPlayerEnemy(e);
        }
    }

    function nearGround(e) {
        if (e.y + e.h >= GROUND_Y - 4) return true;
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            if (p.kind === 'ramp') continue;
            if (p.kind === 'faller' && p.done) continue;
            if (e.x + e.w < p.x || e.x > p.x + p.w) continue;
            if (e.y + e.h >= p.y - 6 && e.y + e.h <= p.y + 12) return true;
        }
        return false;
    }

    function checkPlayerEnemy(e) {
        if (!overlaps(player, e)) return;

        // Päälle hyppääminen: pelaaja tulee ylhäältä ja liikkuu alaspäin.
        const feet = player.y + player.h;
        const fromAbove = player.vy > 60 && feet - e.y < e.h * 0.7;

        if (fromAbove) {
            defeatEnemy(e);
            return;
        }

        if (player.invuln > 0) return;
        hurtPlayer();
    }

    function defeatEnemy(e) {
        e.alive = false;
        e.dead = 0.45;
        player.vy = -560;                        // pieni ponnahdus
        addScore(50);
        addFloater(e.x + e.w / 2, e.y - 8, '+50');
        burst(e.x + e.w / 2, e.y + e.h / 2, 14);
        camera.shake = 5;
        Sound.stomp();
    }

    function hurtPlayer() {
        lives--;
        runDeaths++;
        player.invuln = 1.4;
        player.hurtFlash = 0.5;
        Sound.hurt();

        if (lives <= 0) {
            killPlayer();
        } else {
            respawnAtCheckpoint();
            showHint('Elämiä jäljellä: ' + lives);
            syncHud();
        }
    }

    function killPlayer() {
        state = 'dead';
        Sound.death();
        burst(player.x + player.w / 2, player.y + player.h / 2, 26);
        camera.shake = 14;
        setTimeout(() => {
            if (state !== 'dead') return;
            lives = MAX_LIVES;
            respawnAtCheckpoint();
            state = 'play';
            syncHud();
            showHint('Yritä uudelleen! Elämät: ' + lives);
        }, 1100);
    }

    /* ---------- Pisteytys ---------- */

    function addScore(amount) {
        score = Math.max(0, score + amount);
        syncHud();
    }

    function addFloater(x, y, text) {
        floaters.push({ x, y, text, life: 0.9 });
    }

    function burst(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 220;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                life: 0.5 + Math.random() * 0.5,
                max: 1,
                size: 2 + Math.random() * 3.5,
                hue: 250 + Math.random() * 80
            });
        }
    }

    /* ---------- Päivitys ---------- */

    function update(dt) {
        if (state !== 'play') {
            updateParticles(dt);
            return;
        }

        levelTime += dt;
        totalTime += dt;

        // Liike: kiihtyvyys ja kitka
        const accel = player.onGround ? MOVE_ACCEL : AIR_ACCEL;
        if (input.left && !input.right) {
            player.vx -= accel * dt;
        } else if (input.right && !input.left) {
            player.vx += accel * dt;
        } else if (player.onGround) {
            const drag = FRICTION * dt;
            if (Math.abs(player.vx) <= drag) player.vx = 0;
            else player.vx -= Math.sign(player.vx) * drag;
        } else {
            player.vx *= 0.995;
        }
        player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);

        // Painovoima ja hyppy
        player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL);
        if (player.vy < 0 && !input.jump) player.vy += GRAVITY * JUMP_CUT * dt;

        if (player.onGround) {
            player.coyote = COYOTE_TIME;
            player.jumps = MAX_JUMPS;
        } else {
            player.coyote = Math.max(0, player.coyote - dt);
        }
        player.buffer = Math.max(0, player.buffer - dt);

        if (player.buffer > 0) {
            const canFirst = player.coyote > 0 && player.jumps > 0;
            const canSecond = !canFirst && player.jumps > 0 && player.jumps < MAX_JUMPS;
            if (canFirst || canSecond) {
                player.vy = JUMP_VELOCITY;
                player.jumps -= 1;
                player.buffer = 0;
                player.coyote = 0;
                player.stretch = 1.22;
                player.squash = 0.85;
                if (canSecond) {
                    Sound.doubleJump();
                    burst(player.x + player.w / 2, player.y + player.h, 8);
                } else {
                    Sound.jump();
                }
            }
        }

        updateSolids(dt);
        moveWithCollisions(dt);
        updateEnemies(dt);
        updateCoins(dt);
        updateCheckpoints(dt);
        updateGoal(dt);
        updateParticles(dt);

        // Pyöriminen: kulmanopeus seuraa vauhtia
        player.spin = player.vx / BALL_R;
        player.rot += player.spin * dt;
        if (!player.onGround && Math.abs(player.vx) > 40) player.rot += player.spin * dt * 0.4;

        // Venymä ja litistymä palautuvat
        player.squash += (1 - player.squash) * Math.min(1, dt * 9);
        player.stretch += (1 - player.stretch) * Math.min(1, dt * 9);

        if (player.onGround && !player.wasGround) {
            player.squash = 0.78;
            player.stretch = 1.18;
            Sound.land();
            burst(player.x + player.w / 2, player.y + player.h, 5);
        }

        if (player.hurtFlash > 0) player.hurtFlash -= dt;
        if (player.invuln > 0) player.invuln -= dt;

        // Kuolemat: piikit ja putoaminen
        if (touchesSpikes()) {
            if (player.invuln <= 0) {
                lives--;
                runDeaths++;
                Sound.hurt();
                if (lives <= 0) killPlayer();
                else { respawnAtCheckpoint(); showHint('Elämiä jäljellä: ' + lives); syncHud(); }
            }
        }

        if (player.y > DEATH_FALL_Y) {
            lives--;
            runDeaths++;
            if (lives <= 0) killPlayer();
            else {
                respawnAtCheckpoint();
                showHint('Putosit! Elämiä jäljellä: ' + lives);
                syncHud();
            }
        }

        // Kamera seuraa pelaajaa pehmeästi
        const targetX = clamp(player.x - VIEW_W * 0.34, 0, Math.max(0, level.width - VIEW_W));
        camera.x += (targetX - camera.x) * Math.min(1, dt * 7);
        camera.shake = Math.max(0, camera.shake - dt * 26);

        if (hintTimer > 0) hintTimer -= dt;
        hintEl.classList.toggle('is-visible', hintTimer > 0);

        syncHud();
    }

    function updateCoins(dt) {
        const pcx = player.x + player.w / 2;
        const pcy = player.y + player.h / 2;

        for (let i = 0; i < level.coins.length; i++) {
            const c = level.coins[i];
            if (c.taken) continue;
            c.spin += dt * 4;

            // Keräysalue on palloa selvästi suurempi, jotta kerääminen tuntuu
            // reilulta eikä vaadi millintarkkaa osumaa.
            const dx = pcx - c.x;
            const dy = pcy - c.y;
            const reach = BALL_R + c.r + 14;
            if (dx * dx + dy * dy < reach * reach) {
                c.taken = true;
                runCoins++;
                addScore(10);
                addFloater(c.x, c.y - 14, '+10');
                Sound.coin();
                burst(c.x, c.y, 6);
            }
        }
    }

    function updateCheckpoints() {
        for (let i = 0; i < level.checkpoints.length; i++) {
            const c = level.checkpoints[i];
            if (c.active) continue;
            const dx = (player.x + player.w / 2) - c.x;
            const dy = (player.y + player.h / 2) - c.y;
            if (dx * dx + dy * dy < 90 * 90) {
                c.active = true;
                spawnPoint = { x: c.x, y: c.y - 60 };
                addScore(25);
                addFloater(c.x, c.y - 40, 'Checkpoint!');
                Sound.checkpoint();
                burst(c.x, c.y - 30, 16);
                showHint('Checkpoint tallennettu');
            }
        }
    }

    function updateGoal() {
        const g = level.goal;
        if (!g) return;
        g.wave += 0.05;
        const dx = (player.x + player.w / 2) - g.x;
        const dy = (player.y + player.h / 2) - (g.y - 60);
        if (dx * dx + dy * dy < 80 * 80) finishLevel();
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += 900 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (let i = floaters.length - 1; i >= 0; i--) {
            const f = floaters[i];
            f.y -= 26 * dt;
            f.life -= dt;
            if (f.life <= 0) floaters.splice(i, 1);
        }
    }

    /* ---------- Piirto ---------- */

    // Parallaksitausta: taivas, aurinko, kukkulat ja pilvet.
    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        sky.addColorStop(0, '#101a44');
        sky.addColorStop(0.5, '#2b3a86');
        sky.addColorStop(1, '#6d5bd0');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, VIEW_W, GROUND_Y);

        // Aurinko
        const sunX = VIEW_W * 0.78;
        const sunY = GROUND_Y * 0.42;
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 190);
        glow.addColorStop(0, 'rgba(255, 226, 160, 0.5)');
        glow.addColorStop(0.4, 'rgba(255, 200, 140, 0.16)');
        glow.addColorStop(1, 'rgba(255, 200, 140, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, VIEW_W, GROUND_Y);
        ctx.fillStyle = '#ffe9b8';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
        ctx.fill();

        // Kaukana olevat kukkulat (hitain parallaksi)
        drawHills(0.12, 96, 'rgba(46, 60, 132, 0.85)', 130);
        drawHills(0.24, 74, 'rgba(40, 96, 108, 0.85)', 240);
        drawHills(0.42, 52, 'rgba(34, 122, 96, 0.9)', 70);

        // Pilvet
        ctx.fillStyle = 'rgba(255, 233, 210, 0.22)';
        for (let i = 0; i < 5; i++) {
            const cx = ((i * 260 - camera.x * 0.18) % (VIEW_W + 260) + VIEW_W + 260) % (VIEW_W + 260) - 130;
            const cy = 70 + (i % 3) * 42;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 54, 17, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 34, cy - 8, 38, 14, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawHills(parallax, height, color, offset) {
        const shift = -((camera.x * parallax + offset) % 520);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(shift - 520, GROUND_Y);
        for (let x = shift - 520; x < VIEW_W + 520; x += 130) {
            ctx.quadraticCurveTo(x + 65, GROUND_Y - height, x + 130, GROUND_Y);
        }
        ctx.lineTo(VIEW_W + 520, GROUND_Y + 40);
        ctx.lineTo(shift - 520, GROUND_Y + 40);
        ctx.closePath();
        ctx.fill();
    }

    // Maan pinta kentän alueella.
    function drawGround() {
        const startX = Math.floor(camera.x / 60) * 60 - 60;
        const endX = camera.x + VIEW_W + 60;

        // Taustan maakerros
        ctx.fillStyle = '#123a2c';
        ctx.fillRect(camera.x - 40, GROUND_Y + 26, VIEW_W + 80, VIEW_H);

        for (let x = startX; x < endX; x += 60) {
            ctx.fillStyle = '#2f7a52';
            ctx.fillRect(x, GROUND_Y, 60, 30);
            ctx.fillStyle = '#4fbe7c';
            ctx.fillRect(x, GROUND_Y, 60, 7);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.fillRect(x, GROUND_Y, 60, 2);
        }
    }

    // Yksittäinen alusta tyypin mukaan.
    function drawPlatform(p) {
        if (p.kind === 'ramp') return drawRamp(p);
        if (p.kind === 'mover') return drawMover(p);
        if (p.kind === 'faller') return drawFaller(p);
        drawSolidBlock(p, '#5b4fd0', '#8b7cf6', '#c9c2ff');
    }

    function drawSolidBlock(p, dark, mid, light) {
        const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        grad.addColorStop(0, mid);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        roundRect(p.x, p.y, p.w, p.h, 5);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.fillRect(p.x + 2, p.y, p.w - 4, 3);
    }

    function drawRamp(r) {
        ctx.fillStyle = '#3f8f6a';
        ctx.beginPath();
        const highY = r.y;
        const lowY = r.y + r.h;
        if (r.dir < 0) {
            ctx.moveTo(r.x, lowY);
            ctx.lineTo(r.x + r.w, highY);
            ctx.lineTo(r.x + r.w, lowY);
        } else {
            ctx.moveTo(r.x, highY);
            ctx.lineTo(r.x + r.w, lowY);
            ctx.lineTo(r.x, lowY);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#7fe3a8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (r.dir < 0) {
            ctx.moveTo(r.x, lowY);
            ctx.lineTo(r.x + r.w, highY);
        } else {
            ctx.moveTo(r.x, highY);
            ctx.lineTo(r.x + r.w, lowY);
        }
        ctx.stroke();
    }

    function drawMover(p) {
        drawSolidBlock(p, '#2f4fa8', '#4f7fe0', '#bfe0ff');
        // Liikesuunnan nuoli
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        if (p.axis === 'x') {
            ctx.fillRect(cx - 12, cy - 2, 24, 4);
            ctx.beginPath();
            ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 8, cy - 5); ctx.lineTo(cx - 8, cy + 5);
            ctx.fill();
        } else {
            ctx.fillRect(cx - 2, cy - 10, 4, 20);
            ctx.beginPath();
            ctx.moveTo(cx, cy - 14); ctx.lineTo(cx - 5, cy - 6); ctx.lineTo(cx + 5, cy - 6);
            ctx.fill();
        }
    }

    function drawFaller(p) {
        const shaking = p.triggered && !p.done;
        const ox = shaking ? Math.sin(p.shake * 40) * 2 : 0;
        ctx.save();
        ctx.translate(ox, 0);
        drawSolidBlock(p, '#8a5a12', '#e0a63c', '#ffe8b0');
        // Halkeamat
        ctx.strokeStyle = 'rgba(90, 50, 10, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w * 0.3, p.y + 3);
        ctx.lineTo(p.x + p.w * 0.38, p.y + p.h - 3);
        ctx.moveTo(p.x + p.w * 0.68, p.y + 3);
        ctx.lineTo(p.x + p.w * 0.6, p.y + p.h - 3);
        ctx.stroke();
        ctx.restore();
    }

    function drawSpikes() {
        for (let i = 0; i < level.spikes.length; i++) {
            const s = level.spikes[i];
            const count = Math.max(1, Math.round(s.w / 16));
            const step = s.w / count;
            ctx.fillStyle = '#aab6dd';
            ctx.beginPath();
            for (let k = 0; k < count; k++) {
                const x = s.x + k * step;
                ctx.moveTo(x, s.y + s.h);
                ctx.lineTo(x + step / 2, s.y);
                ctx.lineTo(x + step, s.y + s.h);
            }
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Tumma juova
            ctx.fillStyle = 'rgba(20, 26, 50, 0.6)';
            ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
        }
    }

    function drawCoins() {
        for (let i = 0; i < level.coins.length; i++) {
            const c = level.coins[i];
            if (c.taken) continue;
            const bob = Math.sin(c.spin) * 3;
            const scaleX = Math.abs(Math.cos(c.spin * 0.8)) * 0.75 + 0.25;

            ctx.save();
            ctx.translate(c.x, c.y + bob);
            ctx.scale(scaleX, 1);

            const grad = ctx.createLinearGradient(0, -c.r, 0, c.r);
            grad.addColorStop(0, '#fff3cd');
            grad.addColorStop(0.5, '#ffd45e');
            grad.addColorStop(1, '#d99a1f');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, c.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#8a5a12';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.beginPath();
            ctx.arc(-c.r * 0.3, -c.r * 0.3, c.r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawCheckpoints() {
        for (let i = 0; i < level.checkpoints.length; i++) {
            const c = level.checkpoints[i];
            const active = c.active;
            c.wave += 0.06;

            // Tanko
            ctx.fillStyle = '#7b86b8';
            ctx.fillRect(c.x - 2, c.y - 84, 5, 84);
            // Lippu
            const wave = Math.sin(c.wave) * 4;
            ctx.fillStyle = active ? '#4fbe7c' : '#5a6a95';
            ctx.beginPath();
            ctx.moveTo(c.x + 3, c.y - 84);
            ctx.lineTo(c.x + 40 + wave, c.y - 70);
            ctx.lineTo(c.x + 3, c.y - 56);
            ctx.closePath();
            ctx.fill();
            if (active) {
                ctx.fillStyle = 'rgba(127, 227, 168, 0.3)';
                ctx.beginPath();
                ctx.arc(c.x + 2, c.y - 70, 26 + Math.sin(c.wave * 1.5) * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawGoal() {
        const g = level.goal;
        if (!g) return;
        const wave = Math.sin(g.wave) * 5;

        // Valopylväs
        const beam = ctx.createLinearGradient(0, g.y - 260, 0, g.y);
        beam.addColorStop(0, 'rgba(255, 212, 94, 0)');
        beam.addColorStop(1, 'rgba(255, 212, 94, 0.35)');
        ctx.fillStyle = beam;
        ctx.fillRect(g.x - 34, g.y - 260, 68, 260);

        // Tanko
        ctx.fillStyle = '#c9d2f0';
        ctx.fillRect(g.x - 3, g.y - 120, 6, 120);

        // Ruudullinen lippu
        const flagW = 58;
        const flagH = 40;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(g.x + 3, g.y - 120);
        ctx.lineTo(g.x + 3 + flagW + wave, g.y - 112);
        ctx.lineTo(g.x + 3 + flagW + wave, g.y - 112 + flagH);
        ctx.lineTo(g.x + 3, g.y - 80);
        ctx.closePath();
        ctx.clip();
        for (let ry = 0; ry < 3; ry++) {
            for (let rx = 0; rx < 5; rx++) {
                ctx.fillStyle = (rx + ry) % 2 === 0 ? '#ffffff' : '#ef5a63';
                ctx.fillRect(g.x + 3 + rx * 12, g.y - 120 + ry * 14, 12, 14);
            }
        }
        ctx.restore();
    }

    function drawEnemies() {
        for (let i = 0; i < level.enemies.length; i++) {
            const e = level.enemies[i];
            if (!e.alive && e.dead <= 0) continue;

            ctx.save();
            if (!e.alive) {
                // Kukistettu: litistyy ja häipyy
                const t = clamp(e.dead / 0.45, 0, 1);
                ctx.globalAlpha = t;
                ctx.translate(e.x + e.w / 2, e.y + e.h);
                ctx.scale(1, 0.3 + t * 0.4);
                ctx.translate(-(e.x + e.w / 2), -(e.y + e.h));
            }

            const squash = 1 + Math.sin(e.wobble * 6) * 0.05;

            if (e.kind === 'patrol') {
                ctx.fillStyle = '#ef5a63';
                roundRect(e.x, e.y, e.w, e.h * squash, 7);
                ctx.fill();
                drawEyes(e, -1);
            } else if (e.kind === 'chaser') {
                ctx.fillStyle = '#8b5cf6';
                roundRect(e.x, e.y, e.w, e.h, 9);
                ctx.fill();
                // Sarvet
                ctx.fillStyle = '#c4b5fd';
                ctx.beginPath();
                ctx.moveTo(e.x + 3, e.y);
                ctx.lineTo(e.x + 9, e.y - 9);
                ctx.lineTo(e.x + 14, e.y);
                ctx.closePath();
                ctx.moveTo(e.x + e.w - 3, e.y);
                ctx.lineTo(e.x + e.w - 9, e.y - 9);
                ctx.lineTo(e.x + e.w - 14, e.y);
                ctx.closePath();
                ctx.fill();
                drawEyes(e, 1);
            } else {
                // Hyppivä: vihreä, jaloissa pomppu
                ctx.fillStyle = '#3fae86';
                const hopLift = e.hop ? Math.abs(e.vy) * 0.01 : 0;
                roundRect(e.x, e.y, e.w, e.h * squash, 8);
                ctx.fill();
                ctx.fillStyle = '#2a7a5c';
                ctx.fillRect(e.x + 4, e.y + e.h - 3, 7, 5 + hopLift);
                ctx.fillRect(e.x + e.w - 11, e.y + e.h - 3, 7, 5 + hopLift);
                drawEyes(e, -1);
            }
            ctx.restore();
        }
    }

    function drawEyes(e, look) {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h * 0.42;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 6, cy, 4.6, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#131a33';
        ctx.beginPath();
        ctx.arc(cx - 6 + look * 1.6, cy + 0.5, 2.3, 0, Math.PI * 2);
        ctx.arc(cx + 6 + look * 1.6, cy + 0.5, 2.3, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPlayer() {
        if (state === 'dead') return;

        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;

        // Varjo maassa
        const shadowY = nearestGroundY(cx);
        if (shadowY !== null) {
            const dist = clamp(1 - (shadowY - (player.y + player.h)) / 220, 0.15, 1);
            ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.3 * dist).toFixed(3) + ')';
            ctx.beginPath();
            ctx.ellipse(cx, shadowY + 3, BALL_R * dist, BALL_R * 0.42 * dist, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(cx, player.y + player.h);           // jalat
        ctx.scale(1 / player.stretch, player.squash);      // venymä ja litistymä
        ctx.translate(-cx, -(player.y + player.h));

        // Välähdys osuman jälkeen
        const flashing = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
        ctx.globalAlpha = flashing ? 0.45 : 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(player.rot);

        const grad = ctx.createRadialGradient(-BALL_R * 0.35, -BALL_R * 0.4, BALL_R * 0.2, 0, 0, BALL_R * 1.25);
        grad.addColorStop(0, '#b9b0ff');
        grad.addColorStop(0.45, '#8b7cf6');
        grad.addColorStop(1, '#3b2f8f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
        ctx.fill();

        // Pyörimisen näyttävät kuviot
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_R * 0.62, 0.4, 2.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, BALL_R * 0.62, 3.6, 5.4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(-BALL_R * 0.34, -BALL_R * 0.38, BALL_R * 0.24, 0, Math.PI * 2);
        ctx.fill();

        // Silmät kertovat suunnasta
        const look = clamp(player.vx / MAX_SPEED, -1, 1) * 3;
        ctx.rotate(-player.rot);                     // silmät pysyvät pystyssä
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-5.5, -3, 4.4, 0, Math.PI * 2);
        ctx.arc(6.5, -3, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b2450';
        ctx.beginPath();
        ctx.arc(-5.5 + look, -2.4, 2.2, 0, Math.PI * 2);
        ctx.arc(6.5 + look, -2.4, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();

        if (player.hurtFlash > 0) {
            ctx.fillStyle = 'rgba(255, 90, 90, ' + (player.hurtFlash * 0.5).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(cx, cy, BALL_R + 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Lähin maanpinta varjoa varten.
    function nearestGroundY(x) {
        let best = GROUND_Y;
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            if (p.kind === 'faller' && p.done) continue;
            if (x < p.x || x > p.x + p.w) continue;
            if (p.y >= player.y + player.h - 2 && p.y < best) best = p.y;
        }
        return best;
    }

    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = clamp(p.life, 0, 1);
            ctx.fillStyle = 'hsl(' + p.hue + ', 90%, 68%)';
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < floaters.length; i++) {
            const f = floaters[i];
            ctx.globalAlpha = clamp(f.life, 0, 1);
            ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
            ctx.fillText(f.text, f.x + 1.5, f.y + 1.5);
            ctx.fillStyle = '#ffe9a8';
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);

        const shakeX = camera.shake ? (Math.random() - 0.5) * camera.shake : 0;
        const shakeY = camera.shake ? (Math.random() - 0.5) * camera.shake : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        drawBackground();

        ctx.save();
        ctx.translate(-camera.x, 0);

        drawGround();
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            if (p.x + p.w < camera.x - 60 || p.x > camera.x + VIEW_W + 60) continue;
            if (p.kind === 'faller' && p.done) continue;
            drawPlatform(p);
        }
        drawSpikes();
        drawCheckpoints();
        drawGoal();
        drawCoins();
        drawEnemies();
        drawPlayer();
        drawParticles();

        ctx.restore();
        ctx.restore();

        drawVignette();
    }

    function drawVignette() {
        const v = ctx.createRadialGradient(
            VIEW_W / 2, VIEW_H / 2, Math.min(VIEW_W, VIEW_H) * 0.42,
            VIEW_W / 2, VIEW_H / 2, Math.max(VIEW_W, VIEW_H) * 0.78
        );
        v.addColorStop(0, 'rgba(0, 0, 0, 0)');
        v.addColorStop(1, 'rgba(6, 9, 20, 0.45)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    function roundRect(x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /* ---------- Käyttöliittymä ---------- */

    function formatTime(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function syncHud() {
        hudLevel.textContent = String(levelIndex + 1);
        hudLives.textContent = String(Math.max(0, lives));
        hudScore.textContent = String(score);
        hudCoins.textContent = String(runCoins);
        hudTime.textContent = formatTime(levelTime + (totalTime - levelTime));
    }

    function showHint(text) {
        hintEl.textContent = text;
        hintTimer = 2.4;
        hintEl.classList.add('is-visible');
    }

    function syncSoundUI() {
        const muted = Sound.isMuted();
        soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        soundIcon.textContent = muted ? '🔇' : '🔊';
        if (optSound) optSound.checked = !muted;
    }

    function syncTouchUI() {
        const forced = document.body.classList.contains('show-touch');
        if (optTouch) optTouch.checked = forced;
    }

    function togglePause() {
        if (state === 'play') {
            state = 'pause';
            pauseOverlay.hidden = false;
            settingsPanel.hidden = true;
            pauseSub.textContent = 'Kenttä ' + (levelIndex + 1) + ' · ' + level.name;
            input.left = false;
            input.right = false;
            input.jump = false;
            Sound.click();
        } else if (state === 'pause') {
            state = 'play';
            pauseOverlay.hidden = true;
        }
    }

    function restartLevel() {
        pauseOverlay.hidden = true;
        winOverlay.hidden = true;
        finalOverlay.hidden = true;
        hurtlessReset();
        state = 'play';
    }

    function hurtlessReset() {
        level = cloneLevel(LEVELS[levelIndex]);
        lives = MAX_LIVES;
        levelTime = 0;
        spawnPoint = { x: 60, y: GROUND_Y - 60 };
        placePlayerAtSpawn();
        camera.x = 0;
        camera.shake = 0;
        particles.length = 0;
        floaters.length = 0;
        showHint('Kenttä ' + (levelIndex + 1) + ': ' + level.name);
        syncHud();
    }

    function startGame() {
        Sound.unlock();
        try { localStorage.setItem(HELP_KEY, '1'); } catch (err) { /* ei pakollinen */ }
        helpOverlay.hidden = true;
        loadLevel(levelIndex, false);
        state = 'play';
        showHint('Kenttä ' + (levelIndex + 1) + ': ' + level.name);
    }

    function finishLevel() {
        if (state !== 'play') return;
        state = 'win';
        Sound.win();

        const pending = level.coins.filter((c) => !c.taken).length;
        addScore(pending === 0 ? 150 : 50);

        const isLast = levelIndex >= LEVELS_TOTAL - 1;
        const prevBest = best.time;
        const isRecord = prevBest === 0 || levelTime < prevBest;

        if (score > best.score) best.score = score;
        if (isRecord) best.time = levelTime;
        if (runCoins > best.coins) best.coins = runCoins;
        saveProgress();

        winTime.textContent = formatTime(levelTime);
        winCoins.textContent = String(runCoins);
        winDeaths.textContent = String(runDeaths);
        winScore.textContent = String(score);

        winBadge.textContent = isLast ? 'Viimeinen kenttä läpi!' : 'Kenttä ' + (levelIndex + 1) + ' läpi!';
        winTitle.textContent = runDeaths === 0 ? 'Täydellinen suoritus!' : 'Hienoa!';

        if (isRecord && prevBest > 0) {
            winNote.hidden = false;
            winNote.textContent = 'Uusi ennätysaika! Edellinen ' + formatTime(prevBest) + '.';
        } else if (runDeaths === 0) {
            winNote.hidden = false;
            winNote.textContent = 'Selvisit ilman kuolemia — bonus +150 pistettä.';
        } else {
            winNote.hidden = true;
        }

        document.getElementById('btnNext').textContent = isLast ? 'Pelaa alusta' : 'Seuraava kenttä';
        winOverlay.hidden = false;
    }

    function nextLevel() {
        winOverlay.hidden = true;
        if (levelIndex >= LEVELS_TOTAL - 1) {
            showFinal();
            return;
        }
        loadLevel(levelIndex + 1, false);
        state = 'play';
    }

    function showFinal() {
        state = 'final';
        finalTime.textContent = formatTime(best.time);
        finalCoins.textContent = String(best.coins);
        finalDeaths.textContent = String(runDeaths);
        finalScore.textContent = String(best.score);
        finalNote.hidden = false;
        finalNote.textContent = 'Paras aikasi: ' + formatTime(best.time)
            + ' · Paras pistemääräsi: ' + best.score;
        finalOverlay.hidden = false;
    }

    function backToGames() {
        window.location.href = '../../index.html';
    }

    /* ---------- Napit ---------- */

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnContinue').addEventListener('click', () => {
        Sound.click();
        togglePause();
    });
    document.getElementById('btnRestart').addEventListener('click', () => {
        Sound.click();
        restartLevel();
    });
    document.getElementById('btnSettings').addEventListener('click', () => {
        Sound.click();
        settingsPanel.hidden = !settingsPanel.hidden;
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        Sound.click();
        settingsPanel.hidden = true;
    });
    document.getElementById('btnBackToGames').addEventListener('click', backToGames);
    document.getElementById('btnNext').addEventListener('click', () => {
        Sound.click();
        nextLevel();
    });
    document.getElementById('btnReplay').addEventListener('click', () => {
        Sound.click();
        winOverlay.hidden = true;
        hurtlessReset();
        state = 'play';
    });
    document.getElementById('btnWinBack').addEventListener('click', backToGames);
    document.getElementById('btnFinalReplay').addEventListener('click', () => {
        Sound.click();
        finalOverlay.hidden = true;
        loadLevel(0, false);
        state = 'play';
    });
    document.getElementById('btnFinalBack').addEventListener('click', backToGames);

    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            Sound.unlock();
            Sound.toggle();
            syncSoundUI();
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            Sound.click();
            togglePause();
        });
    }

    if (optSound) {
        optSound.addEventListener('change', () => {
            Sound.setMuted(!optSound.checked);
            syncSoundUI();
        });
    }

    if (optTouch) {
        optTouch.addEventListener('change', () => {
            document.body.classList.toggle('show-touch', optTouch.checked);
            try { localStorage.setItem(TOUCH_KEY, optTouch.checked ? '1' : '0'); } catch (err) { /* ei pakollinen */ }
        });
    }

    if (optVolume) {
        optVolume.value = String(Math.round(Sound.getVolume() * 100));
        optVolume.addEventListener('input', () => {
            Sound.setVolume(parseFloat(optVolume.value) / 100);
        });
    }

    // Selaimen oma Esc käsitellään jo näppäinkuuntelijassa.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'play') togglePause();
    });

    /* ---------- Koko ja kierto ---------- */

    window.addEventListener('resize', () => {
        resizeCanvas();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 180);
    });

    /* ---------- Pelisilmukka ---------- */

    let lastTime = 0;

    function frame(now) {
        let dt = lastTime ? (now - lastTime) / 1000 : 0;
        lastTime = now;
        if (dt > 0.05) dt = 0.05;              // esim. välilehden palaaminen

        update(dt);
        render();

        if (!(typeof window !== 'undefined' && typeof window.__stepFrames === 'function')) {
            requestAnimationFrame(frame);
        }
    }

    /* ---------- Käynnistys ---------- */

    function init() {
        loadProgress();

        const savedTouch = (() => {
            try { return localStorage.getItem(TOUCH_KEY); } catch (err) { return null; }
        })();
        if (savedTouch === '1') document.body.classList.add('show-touch');

        // Asetukset käyttöliittymään
        optVolume.value = String(Math.round(Sound.getVolume() * 100));
        syncSoundUI();
        syncTouchUI();

        // Ohjeet näytetään ensimmäisellä kerralla, muuten aloitetaan suoraan.
        let helpSeen = false;
        try { helpSeen = localStorage.getItem(HELP_KEY) === '1'; } catch (err) { /* ei pakollinen */ }

        loadLevel(levelIndex, false);
        resizeCanvas();

        if (helpSeen) {
            helpOverlay.hidden = true;
            state = 'play';
        } else {
            helpOverlay.hidden = false;
            state = 'help';
        }

        syncHud();
        requestAnimationFrame(frame);
    }

    exposeDev();
    init();

    /* Testeille: jos window.__stepFrames on asetettu, pelisilmukka ei pyydä
       animaatiokehystä itse vaan testi askeltaa sitä käsin. Normaalisti tämä
       ei muuta mitään. */
    if (typeof window !== 'undefined' && typeof window.__stepFrames === 'function') {
        window.__stepFrames((now) => frame(now));
    }
})();



