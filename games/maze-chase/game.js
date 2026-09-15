/* ============================================================
   Maze Chase
   Nopeatempoinen ylhäältä kuvattu sokkelopeli. Puhdas HTML + CSS +
   vanilla JavaScript, ei riippuvuuksia eikä ulkoisia tiedostoja.

   Kaikki grafiikka piirretään canvasille ja äänet syntetisoidaan
   Web Audiolla, joten peli on täysin omaa tuotantoa.

   Sokkelot ovat merkkijonoja:
     #  seinä
     .  energiapiste
     o  kolikko
     *  kristalli
     1-5  power-up (1 kilpi, 2 vauhti, 3 jäädytys, 4 metsästäjätila, 5 magneetti)
     E  vihollisen lähtöpaikka (metsästäjä)
     H  vihollisen lähtöpaikka (partio)
     A  vihollisen lähtöpaikka (väijyjä)
     R  vihollisen lähtöpaikka (juoksija)
     @  pelaajan lähtöpaikka
     (väli) = käytävä; tyhjät käytävät täytetään automaattisesti energiapisteillä
   ============================================================ */

(() => {
    'use strict';

    /* ============================================================
       1. VAKIOT
       ============================================================ */

    const COLS = 21;
    const ROWS = 17;
    const VIEW_RATIO = COLS / ROWS;         // pelialueen kuvasuhde

    const MAX_LIVES = 3;
    const LEVELS_TOTAL = 15;

    // Pisteet
    const POINTS_PELLET = 10;
    const POINTS_COIN = 50;
    const POINTS_CRYSTAL = 200;
    const POINTS_POWERUP = 100;
    const POINTS_ENEMY = 300;
    const BONUS_TIME = 500;
    const BONUS_FLAWLESS = 1000;

    // Combo
    const COMBO_WINDOW = 2.6;               // sekuntia keräysten välillä
    const COMBO_MAX = 8;

    // Nopeudet (ruutua sekunnissa)
    const PLAYER_SPEED = 5.2;
    const PLAYER_SPEED_BOOSTED = 8.2;

    // Power-upien kestot (sekuntia)
    const DUR_SHIELD = 0;                   // kilpi kestää kunnes osutaan
    const DUR_SPEED = 7;
    const DUR_FREEZE = 5.5;
    const DUR_HUNTER = 7;
    const DUR_MAGNET = 9;

    const START_LIVES = 3;
    const RESPAWN_DELAY = 1.2;

    const STORAGE_KEY = 'maze-chase-progress';
    const SETTINGS_KEY = 'maze-chase-settings';

    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ============================================================
       2. SOKKELOT (15 kpl, vaikeutuvat)
       ============================================================ */

    // Jokainen kenttä: nimi, väri, sokkelorivit, vihollisten nopeus ja
    // power-upien kestot. Rivit ovat 21 merkkiä × 17 riviä.
    const LEVELS = [
        {
            name: 'Neonkäytävät', hue: 265, speed: 3.4, enemyCount: 2,
            rows: [
                '#####################',
                '#....o.........*....#',
                '#.###.#####.###.###.#',
                '#.#.2...........#...#',
                '#.#.###.###.###.#.#.#',
                '#...#.......#...#.#.#',
                '###.#.#####.#.###.#.#',
                '#...#.#...#.#.#...#.#',
                '#.###.#.#.#.#.#.###.#',
                '#.....#.#.#.#.#.o...#',
                '#.###.#.#.#.#.#####.#',
                '#.#3..#...#...#...#.#',
                '#.#.#####.###.#.#.#.#',
                '#...#...H.....#...#.#',
                '###.#.#####.#####.#.#',
                '#..@..#.1..E.4....#.#',
                '#####################'
            ]
        },
        {
            name: 'Kidepolut', hue: 200, speed: 3.6, enemyCount: 2,
            rows: [
                '#####################',
                '#.....#.......#..*..#',
                '#.###.#.#####.#.###.#',
                '#.#...#...#...#...#.#',
                '#.#.#####.#.#####.#.#',
                '#...#.....#.....#...#',
                '#####.###.#.###.#####',
                '#.......#.#.#...o...#',
                '#.#####.#.#.#.#####.#',
                '#.#...#.......#...#.#',
                '#.#.#.#####.#####.#.#',
                '#...#.2...H.....#...#',
                '#####.###.#.###.#####',
                '#..o....#.#.#....1..#',
                '#.#####.#.#.#.#####.#',
                '#..@....#.E.#....#..#',
                '#####################'
            ]
        },
        {
            name: 'Kaksoissilmukka', hue: 150, speed: 3.7, enemyCount: 3,
            rows: [
                '#####################',
                '#.....*...........o.#',
                '#.###.###.#.###.###.#',
                '#.#.2.#...#...#...#.#',
                '#.#.#.#.#####.#.#.#.#',
                '#...#.#...#...#.#...#',
                '###.#.###.#.###.#.###',
                '#...#.....#.....#...#',
                '#.###.###.#.###.###.#',
                '#.#..1..H.....#..3..#',
                '#.#.###.###.###.###.#',
                '#...#.#.......#.#...#',
                '###.#.#.#####.#.#.###',
                '#..o..#...#...#.....#',
                '#.#####.#.#.#.#####.#',
                '#..@....E...#.....A.#',
                '#####################'
            ]
        },
        {
            name: 'Spiraali', hue: 30, speed: 3.8, enemyCount: 3,
            rows: [
                '#####################',
                '#....*.......o......#',
                '#.#################.#',
                '#.#.....2.........#.#',
                '#.#.#############.#.#',
                '#.#.#...........#.#.#',
                '#.#.#.#########.#.#.#',
                '#.#.#.#...o...#.#.#.#',
                '#.#.#.#.#####.#.#.#.#',
                '#.#.#.#.#.H.#.#.#.#.#',
                '#.#.#.#.#####.#.#.#.#',
                '#.#.#.#..3....#.#.#.#',
                '#.#.#.#########.#.#.#',
                '#.#.#...........#.#.#',
                '#.#.#############.#.#',
                '#..@............E..#.#',
                '#####################'
            ]
        },
        {
            name: 'Ristikot', hue: 340, speed: 4.0, enemyCount: 3,
            rows: [
                '#####################',
                '#.....#..*....#.....#',
                '#.###.#.#####.#.###.#',
                '#.#.2.#.#...#.#...#.#',
                '#.#.###.#.#.#.###.#.#',
                '#...#...#.#...#...#.#',
                '###.#.###.#.###.#.###',
                '#...#.......#.....o.#',
                '#.###.#####.#.#####.#',
                '#.#...#..H..#...#...#',
                '#.#.#.#.###.#.#.#.#.#',
                '#...#.#...#.#...#...#',
                '###.#.###.#.###.#####',
                '#..o#...#.#...#.....#',
                '#.#####.#.#.#.#####.#',
                '#..@....E...#...1.A.#',
                '#####################'
            ]
        },
        {
            name: 'Jääluolat', hue: 190, speed: 4.1, enemyCount: 4,
            rows: [
                '#####################',
                '#...*...............#',
                '#.#.#####.###.#####.#',
                '#.#.#.2.#...#...#.#.#',
                '#.#.#.#.#####.#.#.#.#',
                '#.#...#.......#...#.#',
                '#.#####.#####.#####.#',
                '#.......#...#.....o.#',
                '#.#####.#.#.#.#####.#',
                '#.#...#.#.#.#.#...#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#...#...#H#...#...#.#',
                '#####.###.#.###.#####',
                '#....1..#.#.#....3..#',
                '#.#####.#.#.#.#####.#',
                '#..@....E.R.A...H...#',
                '#####################'
            ]
        },
        {
            name: 'Tulirengas', hue: 15, speed: 4.2, enemyCount: 4,
            rows: [
                '#####################',
                '#....*....#....o....#',
                '#.#####.#.#.#.#####.#',
                '#.#.2.#.#.#.#.#...#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#...#...#.#...#...#.#',
                '#####.###.#.###.#####',
                '#.......#...#....1..#',
                '#.#####.#####.#####.#',
                '#.#.....3.........#.#',
                '#.#.###.#####.###.#.#',
                '#...#...#.#...#...#.#',
                '###.#.#.#.#.#.#.#.###',
                '#..o#.#...#...#.#...#',
                '#.###.###.#.###.###.#',
                '#..@....E.H.A.R.....#',
                '#####################'
            ]
        },
        {
            name: 'Verkko', hue: 100, speed: 4.3, enemyCount: 4,
            rows: [
                '#####################',
                '#.....#.#.#.#.#..*..#',
                '#.###.#.#.#.#.#.###.#',
                '#.#.....2.#.......#.#',
                '#.#.#####.#.#####.#.#',
                '#...#.....#.....#...#',
                '###.#.###.#.###.#.###',
                '#...#.#..o....#.#...#',
                '#.###.#.#####.#.###.#',
                '#.....#...#...#.....#',
                '#.#####.#.#.#.#####.#',
                '#.#..1..#.#.#..3..#.#',
                '#.#.###.#.#.#.###.#.#',
                '#...#...#...#...#...#',
                '###.#.#####.#####.#.#',
                '#..@....E.H.A.R.....#',
                '#####################'
            ]
        },
        {
            name: 'Kadonneet käytävät', hue: 280, speed: 4.5, enemyCount: 5,
            rows: [
                '#####################',
                '#.#....*..........#.#',
                '#.#.###########.#.#.#',
                '#.#.#...2.....#.#.#.#',
                '#.#.#.#######.#.#.#.#',
                '#...#.#.....#.#.#...#',
                '###.#.#.###.#.#.#.###',
                '#...#.#.#.#.#.#.#...#',
                '#.###.#.#.#.#.#.###.#',
                '#.....#.#.#.#.#..o..#',
                '#.#####.#.#.#.#####.#',
                '#.#..1..#.#.#..3..#.#',
                '#.#.#####.#.#####.#.#',
                '#...#...........#...#',
                '###.#.#####.#####.#.#',
                '#..@....E.H.A.R..P..#',
                '#####################'
            ]
        },
        {
            name: 'Kvartetti', hue: 220, speed: 4.6, enemyCount: 5,
            rows: [
                '#####################',
                '#....*....o.........#',
                '#.###.###.#.###.###.#',
                '#.#.2.#...#...#...#.#',
                '#.#.#.#.###.#.#.#.#.#',
                '#...#.#.#...#.#.#...#',
                '###.#.#.#.###.#.#.###',
                '#...#...#.....#.....#',
                '#.#####.#####.#####.#',
                '#.#..3............#.#',
                '#.#.###.#####.###.#.#',
                '#.#.#...#...#...#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#...#.#...#...#.#...#',
                '#.###.###.#.###.###.#',
                '#..@....E.H.A.R.P...#',
                '#####################'
            ]
        },
        {
            name: 'Kaksi sydäntä', hue: 320, speed: 4.7, enemyCount: 5,
            rows: [
                '#####################',
                '#....*...#....o.....#',
                '#.#####.#.#.#.#####.#',
                '#.#.2.#.#.#.#.#...#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#...#...#...#...#...#',
                '###.###.#####.###.###',
                '#.....#...1...#.....#',
                '#.###.#.#####.#.###.#',
                '#.#...#...#...#...#.#',
                '#.#.#####.#.#####.#.#',
                '#.#..3..#.#.#..5..#.#',
                '#.#####.#.#.#.#####.#',
                '#.....#.#.#.#.#.....#',
                '#.###.#.#.#.#.#.###.#',
                '#..@....E.H.A.R.P...#',
                '#####################'
            ]
        },
        {
            name: 'Vahtitorni', hue: 45, speed: 4.9, enemyCount: 6,
            rows: [
                '#####################',
                '#.#....*..........#.#',
                '#.#.#####.#####.#.#.#',
                '#.#.#...2.....#.#.#.#',
                '#.#.#.#######.#.#.#.#',
                '#.#.#.#..o..#.#.#.#.#',
                '#...#.#.###.#.#.#...#',
                '###.#.#.#.#.#.#.#.###',
                '#...#.#.#.#.#.#.#...#',
                '#.###.#.#.#.#.#.###.#',
                '#.....#.#.#.#.#..1..#',
                '#.#####.#.#.#.#####.#',
                '#.#..3..#.#.#..5..#.#',
                '#.#.#####.#.#####.#.#',
                '#...#...........#...#',
                '#..@....E.H.A.R.P..#.#',
                '#####################'
            ]
        },
        {
            name: 'Kaaos', hue: 0, speed: 5.0, enemyCount: 6,
            rows: [
                '#####################',
                '#...*.....o.....#...#',
                '#.#.#.###.#.###.#.#.#',
                '#.#.2.#...#...#...#.#',
                '#.#####.#####.#####.#',
                '#.......#...#....1..#',
                '###.###.#.#.#.###.###',
                '#...#...#.#...#...#.#',
                '#.#.#.###.#.###.#.#.#',
                '#.#...#..3....#...#.#',
                '#.###.#.#####.#.###.#',
                '#.....#.#...#.#.....#',
                '#.#####.#.#.#.#####.#',
                '#.......#.#.#.......#',
                '#.#####.#.#.#.#####.#',
                '#..@....E.H.A.R.P..#.#',
                '#####################'
            ]
        },
        {
            name: 'Pimeä verkko', hue: 330, speed: 5.2, enemyCount: 7,
            rows: [
                '#####################',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#....*..o.2.......1..#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#....3............o.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#........5..........#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#...................#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#.#.#.#.#.#.#.#.#.#.#',
                '#..@....E.H.A.R.P..#.#',
                '#####################'
            ]
        },
        {
            name: 'Loppuottelu', hue: 285, speed: 5.5, enemyCount: 8,
            rows: [
                '#####################',
                '#.#....*..........#.#',
                '#.#.###.#####.###.#.#',
                '#.#.#...2.......#.#.#',
                '#.#.#.#########.#.#.#',
                '#...#.#...o...#.#...#',
                '###.#.#.#####.#.#.###',
                '#...#.#.#.3.#.#.#...#',
                '#.###.#.#.#.#.#.###.#',
                '#.....#.#.#.#.#..5..#',
                '#.#####.#.#.#.#####.#',
                '#.#..1..#.#.#.....#.#',
                '#.#.#####.#.#####.#.#',
                '#...#...........#...#',
                '###.#.#####.#####.#.#',
                '#..@....E.H.A.R.P..#.#',
                '#####################'
            ]
        }
    ];

    /* ============================================================
       3. ÄÄNET (Web Audio, ei tiedostoja)
       ============================================================ */

    const Sound = (() => {
        let ctxAudio = null;
        let master = null;
        let musicGain = null;
        let musicTimer = null;
        let musicStep = 0;
        let soundOn = true;
        let musicOn = true;

        function loadSettings() {
            try {
                const raw = localStorage.getItem(SETTINGS_KEY);
                if (!raw) return;
                const s = JSON.parse(raw);
                if (typeof s.sound === 'boolean') soundOn = s.sound;
                if (typeof s.music === 'boolean') musicOn = s.music;
            } catch (err) { /* ei pakollinen */ }
        }

        function saveSettings() {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: soundOn, music: musicOn }));
            } catch (err) { /* ei pakollinen */ }
        }

        function ensure() {
            if (ctxAudio) return ctxAudio;
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            try {
                ctxAudio = new Ctor();
                master = ctxAudio.createGain();
                master.gain.value = soundOn ? 0.85 : 0;
                master.connect(ctxAudio.destination);
                musicGain = ctxAudio.createGain();
                musicGain.gain.value = musicOn ? 0.16 : 0;
                musicGain.connect(ctxAudio.destination);
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
            if (!soundOn || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            osc.type = opts.type || 'square';
            osc.frequency.setValueAtTime(Math.max(20, opts.from), t0);
            if (opts.to && opts.to !== opts.from) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.duration);
            }
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, opts.gain || 0.12), t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t0);
            osc.stop(t0 + opts.duration + 0.03);
        }

        function noise(opts) {
            if (!soundOn || !ensure()) return;
            const t0 = ctxAudio.currentTime;
            const len = Math.max(1, Math.floor(ctxAudio.sampleRate * opts.duration));
            const buffer = ctxAudio.createBuffer(1, len, ctxAudio.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = ctxAudio.createBufferSource();
            src.buffer = buffer;
            const filter = ctxAudio.createBiquadFilter();
            filter.type = opts.filter || 'lowpass';
            filter.frequency.setValueAtTime(opts.cutoff || 1200, t0);
            if (opts.cutoffTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.cutoffTo), t0 + opts.duration);
            const gain = ctxAudio.createGain();
            gain.gain.setValueAtTime(opts.gain || 0.14, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
            src.connect(filter); filter.connect(gain); gain.connect(master);
            src.start(t0);
        }

        // Yksinkertainen taustamelodia: lyhyt sävelkierros, joka toistuu.
        const MELODY = [220, 277, 330, 277, 247, 294, 370, 294];
        const BASS = [110, 110, 123, 123, 131, 131, 98, 98];

        function startMusic() {
            if (!ensure() || musicTimer) return;
            musicStep = 0;
            musicTimer = setInterval(() => {
                if (!musicOn || !ctxAudio) return;
                const t0 = ctxAudio.currentTime;
                const note = MELODY[musicStep % MELODY.length];
                const bass = BASS[musicStep % BASS.length];

                const osc = ctxAudio.createOscillator();
                const g = ctxAudio.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note, t0);
                g.gain.setValueAtTime(0.0001, t0);
                g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
                osc.connect(g); g.connect(musicGain);
                osc.start(t0); osc.stop(t0 + 0.28);

                const osc2 = ctxAudio.createOscillator();
                const g2 = ctxAudio.createGain();
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(bass, t0);
                g2.gain.setValueAtTime(0.0001, t0);
                g2.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02);
                g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
                osc2.connect(g2); g2.connect(musicGain);
                osc2.start(t0); osc2.stop(t0 + 0.34);

                musicStep++;
            }, 300);
        }

        function stopMusic() {
            if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
        }

        loadSettings();

        return {
            unlock,
            startMusic,
            stopMusic,
            isSoundOn: () => soundOn,
            isMusicOn: () => musicOn,
            setSound(on) {
                soundOn = !!on;
                if (master) master.gain.value = soundOn ? 0.85 : 0;
                saveSettings();
            },
            setMusic(on) {
                musicOn = !!on;
                if (musicGain) musicGain.gain.value = musicOn ? 0.16 : 0;
                saveSettings();
            },
            pellet() {
                tone({ from: 520, to: 640, duration: 0.05, gain: 0.05, type: 'square' });
            },
            coin() {
                tone({ from: 1046, to: 1046, duration: 0.07, gain: 0.1, type: 'triangle' });
                tone({ from: 1568, to: 1568, duration: 0.13, gain: 0.09, type: 'triangle' });
            },
            crystal() {
                [784, 988, 1319, 1568].forEach((f, i) => {
                    tone({ from: f, to: f, duration: 0.18, gain: 0.09, type: 'triangle' });
                });
            },
            powerup() {
                tone({ from: 392, to: 1175, duration: 0.34, gain: 0.13, type: 'sawtooth' });
                tone({ from: 523, to: 1568, duration: 0.34, gain: 0.08, type: 'triangle' });
            },
            eatEnemy() {
                tone({ from: 160, to: 620, duration: 0.22, gain: 0.15, type: 'sawtooth' });
                noise({ duration: 0.2, gain: 0.1, cutoff: 1800, cutoffTo: 300 });
            },
            hurt() {
                tone({ from: 330, to: 70, duration: 0.32, gain: 0.16, type: 'sawtooth' });
                noise({ duration: 0.22, gain: 0.12, cutoff: 900, cutoffTo: 150 });
            },
            shieldBreak() {
                tone({ from: 900, to: 300, duration: 0.24, gain: 0.14, type: 'square' });
                noise({ duration: 0.18, gain: 0.1, cutoff: 2400, cutoffTo: 400 });
            },
            combo(level) {
                const base = 620 + level * 90;
                tone({ from: base, to: base * 1.5, duration: 0.14, gain: 0.11, type: 'triangle' });
            },
            levelClear() {
                [523, 659, 784, 1046, 1319].forEach((f, i) => {
                    tone({ from: f, to: f, duration: 0.24, gain: 0.12, type: 'triangle' });
                });
            },
            gameOver() {
                [392, 330, 262, 196].forEach((f) => {
                    tone({ from: f, to: f * 0.7, duration: 0.4, gain: 0.14, type: 'sawtooth' });
                });
            },
            click() {
                tone({ from: 700, to: 900, duration: 0.05, gain: 0.06, type: 'square' });
            },
            pause() {
                tone({ from: 600, to: 400, duration: 0.12, gain: 0.1, type: 'triangle' });
            }
        };
    })();

    /* ============================================================
       4. SOKKELON JÄSENNYS
       ============================================================ */

    const WALL = 0;
    const OPEN = 1;

    function parseLevel(def, index) {
        const rows = def.rows;
        const grid = [];
        const pellets = [];
        const coins = [];
        const crystals = [];
        const powerups = [];
        const enemySpawns = [];

        let playerStart = { c: 1, r: 1 };

        for (let r = 0; r < ROWS; r++) {
            const line = rows[r] || '';
            const rowTypes = [];
            for (let c = 0; c < COLS; c++) {
                const ch = line[c] || ' ';
                const border = (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1);
                let open = true;
                let ingredient = null;

                if (ch === '#') open = false;
                else if (ch === '.') ingredient = 'pellet';
                else if (ch === 'o') ingredient = 'coin';
                else if (ch === '*') ingredient = 'crystal';
                else if (ch >= '1' && ch <= '5') ingredient = 'powerup';
                else if (ch === 'E' || ch === 'H' || ch === 'A' || ch === 'R') {
                    ingredient = 'enemy';
                } else if (ch === '@') {
                    playerStart = { c, r };
                }

                // Reunat ovat aina seiniä.
                if (border) open = false;

                rowTypes.push(open ? OPEN : WALL);

                if (!open) continue;

                if (ingredient === 'pellet') pellets.push({ c, r, eaten: false, phase: Math.random() * 6 });
                else if (ingredient === 'coin') coins.push({ c, r, taken: false, phase: Math.random() * 6, big: true });
                else if (ingredient === 'crystal') crystals.push({ c, r, taken: false, phase: 0 });
                else if (ingredient === 'powerup') {
                    // Power-upin tyyppi valitaan kentän mukaan, jotta jokaisessa
                    // kentässä on järkevä yhdistelmä.
                    const pool = (index < 5) ? [1, 2, 5] : (index < 10 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5]);
                    powerups.push({ c, r, taken: false, type: pool[(index + powerups.length) % pool.length], phase: 0 });
                } else if (ingredient === 'enemy') {
                    const kind = ch === 'E' ? 'hunter' : (ch === 'H' ? 'patrol' : (ch === 'A' ? 'ambusher' : 'runner'));
                    enemySpawns.push({ c, r, kind });
                }
            }
            grid.push(rowTypes);
        }

        // Täytetään tyhjät käytävät energiapisteillä, jotta sokkelot ovat
        // pelillisesti täynnä kerättävää. Erityisruudut säilyvät ennallaan.
        const special = new Set();
        [pellets, coins, crystals, powerups].forEach((list) => {
            list.forEach((it) => special.add(it.r * COLS + it.c));
        });
        enemySpawns.forEach((e) => special.add(e.r * COLS + e.c));
        special.add(playerStart.r * COLS + playerStart.c);
        special.add(13 * COLS + 10);
        special.add(13 * COLS + 11);

        for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
                if (grid[r][c] !== OPEN) continue;
                if (special.has(r * COLS + c)) continue;
                pellets.push({ c, r, eaten: false, phase: Math.random() * 6 });
            }
        }

        // Varmistetaan, että kaikki käytävät ovat yhteydessä pelaajan
        // lähtöpaikkaan. Jos jokin alue on eristynyt, siihen avataan ovi
        // poistamalla sitä ympäröivä seinä. Näin yksikään kenttä ei voi olla
        // läpäisemätön.
        const reachGrid = new Uint8Array(COLS * ROWS);
        markReachable(grid, reachGrid, playerStart.c, playerStart.r);

        for (let pass = 0; pass < 12; pass++) {
            let isolatedCount = 0;
            for (let r = 1; r < ROWS - 1; r++) {
                for (let c = 1; c < COLS - 1; c++) {
                    if (grid[r][c] !== OPEN || reachGrid[r * COLS + c]) continue;
                    isolatedCount++;
                }
            }
            if (isolatedCount === 0) break;

            // Etsitään seinä, joka erottaa saavutettavan ja eristyneen alueen.
            let opened = false;
            for (let r = 1; r < ROWS - 1 && !opened; r++) {
                for (let c = 1; c < COLS - 1 && !opened; c++) {
                    if (grid[r][c] !== WALL) continue;
                    let touchesReach = false;
                    let touchesIsolated = false;
                    for (let i = 0; i < 4; i++) {
                        const nc = c + (i === 0 ? 1 : i === 1 ? -1 : 0);
                        const nr = r + (i === 2 ? 1 : i === 3 ? -1 : 0);
                        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
                        if (grid[nr][nc] !== OPEN) continue;
                        if (reachGrid[nr * COLS + nc]) touchesReach = true;
                        else touchesIsolated = true;
                    }
                    if (touchesReach && touchesIsolated) {
                        grid[r][c] = OPEN;
                        pellets.push({ c, r, eaten: false, phase: Math.random() * 6 });
                        markReachable(grid, reachGrid, playerStart.c, playerStart.r);
                        opened = true;
                    }
                }
            }
            if (!opened) break;
        }

        return {
            name: def.name,
            hue: def.hue,
            enemySpeed: def.speed,
            enemyCount: def.enemyCount,
            grid,
            pellets,
            coins,
            crystals,
            powerups,
            enemySpawns,
            playerStart,
            totalPellets: pellets.length,
            totalCoins: coins.length,
            totalCrystals: crystals.length
        };
    }

    // Merkitsee kaikki pelaajan lähtöpaikasta saavutettavat käytävät.
    function markReachable(grid, reach, startC, startR) {
        reach.fill(0);
        const queue = new Int16Array(COLS * ROWS);
        let head = 0;
        let tail = 0;
        const start = startR * COLS + startC;
        reach[start] = 1;
        queue[tail++] = start;

        while (head < tail) {
            const idx = queue[head++];
            const r = (idx / COLS) | 0;
            const c = idx - r * COLS;
            for (let i = 0; i < 4; i++) {
                const nc = c + (i === 0 ? 1 : i === 1 ? -1 : 0);
                const nr = r + (i === 2 ? 1 : i === 3 ? -1 : 0);
                if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
                if (grid[nr][nc] !== OPEN) continue;
                const nIdx = nr * COLS + nc;
                if (reach[nIdx]) continue;
                reach[nIdx] = 1;
                queue[tail++] = nIdx;
            }
        }
    }

    /* ============================================================
       5. PELIN TILA
       ============================================================ */

    let state = 'help';        // help | ready | play | dying | pause | clear | over | final
    let levelIndex = 0;
    let level = null;

    let score = 0;
    let lives = START_LIVES;
    let levelCoins = 0;
    let totalCoins = 0;
    let combo = 1;
    let comboTimer = 0;
    let levelTime = 0;
    let totalTime = 0;
    let flawless = true;
    let pelletsLeft = 0;

    let freezeTimer = 0;
    let hunterTimer = 0;
    let speedTimer = 0;
    let magnetTimer = 0;
    let shieldActive = false;

    let respawnTimer = 0;
    let flashTimer = 0;
    let shakeAmount = 0;

    const particles = [];
    const floaters = [];
    const ripples = [];

    let progress = {
        best: 0,
        level: 0,
        coins: 0,
        bestTimes: {}
    };

    const player = {
        c: 1, r: 1,
        x: 1, y: 1,             // jatkuvat koordinaatit ruutuina
        dir: { x: 0, y: 0 },
        next: { x: 0, y: 0 },
        speed: PLAYER_SPEED,
        moving: false,
        mouth: 0,
        invuln: 0,
        trail: []
    };

    let enemies = [];
    let cameraShake = 0;

    /* ============================================================
       6. DOM
       ============================================================ */

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const stageEl = document.getElementById('stage');

    const hudScore = document.getElementById('hudScore');
    const hudCoins = document.getElementById('hudCoins');
    const hudLevel = document.getElementById('hudLevel');
    const hudLives = document.getElementById('hudLives');
    const hudCombo = document.getElementById('hudCombo');
    const hudComboWrap = document.getElementById('hudComboWrap');
    const hudPower = document.getElementById('hudPower');
    const hudPellets = document.getElementById('hudPellets');

    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseSub = document.getElementById('pauseSub');
    const settingsPanel = document.getElementById('settingsPanel');
    const optSound = document.getElementById('optSound');
    const optMusic = document.getElementById('optMusic');
    const optDpad = document.getElementById('optDpad');

    const clearOverlay = document.getElementById('clearOverlay');
    const clearTitle = document.getElementById('clearTitle');
    const clearScore = document.getElementById('clearScore');
    const clearCoins = document.getElementById('clearCoins');
    const clearTime = document.getElementById('clearTime');
    const clearBonus = document.getElementById('clearBonus');
    const clearNote = document.getElementById('clearNote');

    const overOverlay = document.getElementById('overOverlay');
    const overScore = document.getElementById('overScore');
    const overCoins = document.getElementById('overCoins');
    const overLevel = document.getElementById('overLevel');
    const overBest = document.getElementById('overBest');
    const overNote = document.getElementById('overNote');

    const finalOverlay = document.getElementById('finalOverlay');
    const finalScore = document.getElementById('finalScore');
    const finalCoins = document.getElementById('finalCoins');
    const finalTime = document.getElementById('finalTime');
    const finalBest = document.getElementById('finalBest');

    const helpOverlay = document.getElementById('helpOverlay');
    const dpad = document.getElementById('dpad');
    const btnPause = document.getElementById('btnPause');
    const btnSound = document.getElementById('btnSound');
    const btnMusic = document.getElementById('btnMusic');

    /* ============================================================
       7. TALLENNUS
       ============================================================ */

    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return;
            progress.best = Number(data.best) || 0;
            progress.level = clamp(Number(data.level) || 0, 0, LEVELS_TOTAL - 1);
            progress.coins = Number(data.coins) || 0;
            progress.bestTimes = data.bestTimes && typeof data.bestTimes === 'object' ? data.bestTimes : {};
        } catch (err) { /* ei pakollinen */ }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (err) { /* ei pakollinen */ }
    }

    /* ============================================================
       8. KOKO JA SKAALAUS
       Piirtoalue on aina sama riippumatta näytöstä: solu on CELL yksikköä,
       joten pelin logiikka toimii vakioyksiköissä ja canvas sovitetaan
       ruutuun CSS:llä. Näin peli skaalautuu kaikille näytöille.
       ============================================================ */

    const CELL = 32;
    const VIEW_W = COLS * CELL;
    const VIEW_H = ROWS * CELL;

    let cell = CELL;            // nykyinen solukoko piirtoyksiköissä

    function fitCanvas() {
        const box = stageEl.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Pelialue täyttää mahdollisimman suuren osan ruudusta.
        let cssW = box.width;
        let cssH = box.height;
        if (cssW / cssH > VIEW_RATIO) cssW = cssH * VIEW_RATIO;
        else cssH = cssW / VIEW_RATIO;

        canvas.width = Math.round(VIEW_W * dpr);
        canvas.height = Math.round(VIEW_H * dpr);
        canvas.style.width = Math.round(cssW) + 'px';
        canvas.style.height = Math.round(cssH) + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cell = CELL;
    }

    /* ============================================================
       9. SYÖTE
       ============================================================ */

    const DIRS = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
        none: { x: 0, y: 0 }
    };

    function isOpen(c, r) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
        return level.grid[r][c] === OPEN;
    }

    function requestDirection(name) {
        if (state !== 'play') return;
        const dir = DIRS[name];
        if (!dir) return;
        player.next = { x: dir.x, y: dir.y };
        // Jos suunta on heti mahdollinen, vaihdetaan saman tien – peli tuntuu
        // silloin välittömältä.
        tryTurn();
    }

    // Käännytään jos seuraava ruutu haluttuun suuntaan on auki. Samalla
    // toinen koordinaatti lukitaan ruudun keskelle, jotta liike pysyy
    // ruudukossa eikä jumiudu diagonaaliasentoon.
    function tryTurn() {
        const n = player.next;
        if (!n || (n.x === 0 && n.y === 0)) return;

        const cx = Math.round(player.x);
        const cy = Math.round(player.y);
        if (!isOpen(cx + n.x, cy + n.y)) return;

        if (n.x !== 0) player.y = cy;        // vaakaliike: lukitse korkeus
        else player.x = cx;                  // pystyliike: lukitse vaakakohta
        player.dir = { x: n.x, y: n.y };
    }

    const KEY_MAP = {
        ArrowUp: 'up', KeyW: 'up',
        ArrowDown: 'down', KeyS: 'down',
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right'
    };

    window.addEventListener('keydown', (event) => {
        Sound.unlock();
        if (KEY_MAP[event.code]) {
            event.preventDefault();
            requestDirection(KEY_MAP[event.code]);
        } else if (event.code === 'KeyP' || event.code === 'Escape') {
            event.preventDefault();
            togglePause();
        } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            if (state === 'help') { event.preventDefault(); startGame(); }
        } else if (event.code === 'Space') {
            event.preventDefault();
            if (state === 'help') startGame();
        }
    });

    // Kosketus: D-pad
    function bindDpad(buttonId, dirName) {
        const el = document.getElementById(buttonId);
        if (!el) return;
        const press = (event) => {
            event.preventDefault();
            Sound.unlock();
            el.classList.add('is-down');
            requestDirection(dirName);
        };
        const release = (event) => {
            if (event) event.preventDefault();
            el.classList.remove('is-down');
        };
        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);
        el.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    bindDpad('btnUp', 'up');
    bindDpad('btnDown', 'down');
    bindDpad('btnLeft', 'left');
    bindDpad('btnRight', 'right');

    // Kosketus: pyyhkäisy
    let swipeStart = null;

    stageEl.addEventListener('pointerdown', (event) => {
        Sound.unlock();
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        swipeStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    }, { passive: true });

    stageEl.addEventListener('pointermove', (event) => {
        if (!swipeStart) return;
        const dx = event.clientX - swipeStart.x;
        const dy = event.clientY - swipeStart.y;
        const threshold = 26;
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

        if (Math.abs(dx) > Math.abs(dy)) requestDirection(dx > 0 ? 'right' : 'left');
        else requestDirection(dy > 0 ? 'down' : 'up');

        // Uusi lähtöpiste, jotta voi pyyhkäistä useaan suuntaan peräkkäin.
        swipeStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    }, { passive: true });

    const endSwipe = () => { swipeStart = null; };
    stageEl.addEventListener('pointerup', endSwipe, { passive: true });
    stageEl.addEventListener('pointercancel', endSwipe, { passive: true });

    // Estä sivun vieritys, zoomaus ja tekstin valinta pelialueella.
    stageEl.addEventListener('gesturestart', (event) => event.preventDefault());
    stageEl.addEventListener('dblclick', (event) => event.preventDefault());
    stageEl.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('gesturestart', (event) => event.preventDefault());

    window.addEventListener('blur', () => {
        if (state === 'play') togglePause();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'play') togglePause();
    });

    /* ============================================================
       10. KENTÄN LATAUS
       ============================================================ */

    function resetTransient() {
        freezeTimer = 0;
        hunterTimer = 0;
        speedTimer = 0;
        magnetTimer = 0;
        shieldActive = false;
        combo = 1;
        comboTimer = 0;
        particles.length = 0;
        floaters.length = 0;
        ripples.length = 0;
        cameraShake = 0;
        flashTimer = 0;
        respawnTimer = 0;
    }

    function spawnEnemies() {
        enemies = [];
        const list = level.enemySpawns;
        const wanted = level.enemyCount;

        for (let i = 0; i < Math.min(wanted, list.length); i++) {
            const spawn = list[i];
            enemies.push(makeEnemy(spawn.kind, spawn.c, spawn.r, i));
        }
        // Jos kentässä on vähemmän lähtöpaikkoja kuin haluttu määrä, loput
        // sijoitetaan kaukaisimpiin nurkkiin.
        const corners = [
            { c: COLS - 2, r: 1 }, { c: 1, r: ROWS - 2 },
            { c: COLS - 2, r: ROWS - 2 }, { c: 1, r: 1 }
        ];
        let ci = 0;
        while (enemies.length < wanted && ci < corners.length) {
            const corner = corners[ci++];
            if (!isOpen(corner.c, corner.r)) continue;
            enemies.push(makeEnemy('patrol', corner.c, corner.r, enemies.length));
        }
    }

    function makeEnemy(kind, c, r, index) {
        const palette = {
            hunter: { main: '#ff5c7a', accent: '#ffd0da', speed: 1.0 },
            patrol: { main: '#4fd1c5', accent: '#c9fff8', speed: 0.92 },
            ambusher: { main: '#b98cff', accent: '#ebdcff', speed: 0.96 },
            runner: { main: '#ffd45e', accent: '#fff4cc', speed: 1.22 }
        };
        const style = palette[kind] || palette.patrol;
        // Hajaantumispiste: jokaisella vihollisella oma nurkkansa.
        const corners = [
            { c: COLS - 2, r: 1 },
            { c: 1, r: 1 },
            { c: COLS - 2, r: ROWS - 2 },
            { c: 1, r: ROWS - 2 }
        ];
        const scatter = corners[index % corners.length];

        return {
            kind,
            c, r,
            x: c, y: r,
            startC: c, startR: r,
            scatterC: isOpen(scatter.c, scatter.r) ? scatter.c : 1,
            scatterR: isOpen(scatter.c, scatter.r) ? scatter.r : 1,
            dir: { x: 0, y: 0 },
            speedMul: style.speed,
            main: style.main,
            accent: style.accent,
            mode: 'scatter',          // chase | scatter | frightened | eaten
            modeTimer: 4 + index * 0.6,
            wobble: Math.random() * 6,
            index,
            lastC: c,
            lastR: r,
            lastDir: null,
            stillTime: 0
        };
    }

    function loadLevel(index, keepScore) {
        levelIndex = clamp(index, 0, LEVELS_TOTAL - 1);
        level = parseLevel(LEVELS[levelIndex], levelIndex);

        if (!keepScore) {
            score = 0;
            totalCoins = 0;
            totalTime = 0;
        }
        lives = START_LIVES;
        levelCoins = 0;
        levelTime = 0;
        flawless = true;
        pelletsLeft = level.totalPellets;

        resetTransient();
        spawnEnemies();
        resetPlayer();
        syncHud();

        progress.level = Math.max(progress.level, levelIndex);
        saveProgress();
    }

    function resetPlayer() {
        player.c = level.playerStart.c;
        player.r = level.playerStart.r;
        player.x = player.c;
        player.y = player.r;
        player.dir = { x: 0, y: 0 };
        player.next = { x: 0, y: 0 };
        player.moving = false;
        player.mouth = 0;
        player.invuln = 1.6;
        player.trail = [];

        // Viholliset palaavat lähtöpaikoilleen.
        enemies.forEach((e) => {
            e.c = e.startC;
            e.r = e.startR;
            e.x = e.c;
            e.y = e.r;
            e.mode = 'scatter';
            e.modeTimer = 3;
        });
    }

    /* ============================================================
       11. PELAAJAN PÄIVITYS
       ============================================================ */

    function updatePlayer(dt) {
        if (state !== 'play') return;
        if (player.invuln > 0) player.invuln -= dt;

        // Nopeus: perusnopeus + vauhtipower-up
        player.speed = speedTimer > 0 ? PLAYER_SPEED_BOOSTED : PLAYER_SPEED;

        tryTurn();

        // Liike ruudukkoa pitkin: liikutaan yhdessä suunnassa kerrallaan ja
        // pysähdytään ruudun keskelle, jos edessä on seinä.
        let moved = false;
        if (player.dir.x !== 0 || player.dir.y !== 0) {
            const step = player.speed * dt;

            if (player.dir.x !== 0) {
                // Vaakaliike – pysytään ruudukon rivillä.
                const cy = Math.round(player.y);
                player.y = cy;

                const cx = Math.round(player.x);
                const target = player.x + player.dir.x * step;
                const passedCenter = Math.abs(target - cx) <= 0.5 &&
                    Math.sign(cx - player.x) === player.dir.x;

                if (passedCenter && !isOpen(cx + player.dir.x, cy)) {
                    player.x = cx;
                } else {
                    player.x = clamp(target, 1, COLS - 2);
                    moved = true;
                }
            } else {
                // Pystyliike – pysytään ruudukon sarakkeessa.
                const cx = Math.round(player.x);
                player.x = cx;

                const cy = Math.round(player.y);
                const target = player.y + player.dir.y * step;
                const passedCenter = Math.abs(target - cy) <= 0.5 &&
                    Math.sign(cy - player.y) === player.dir.y;

                if (passedCenter && !isOpen(cx, cy + player.dir.y)) {
                    player.y = cy;
                } else {
                    player.y = clamp(target, 1, ROWS - 2);
                    moved = true;
                }
            }
        }

        player.moving = moved;

        if (moved) player.mouth += dt * 12;

        player.c = Math.round(player.x);
        player.r = Math.round(player.y);

        // Jälki
        player.trail.unshift({ x: player.x, y: player.y });
        if (player.trail.length > 12) player.trail.pop();

        collectItems();
    }

    function collectItems() {
        const px = player.x;
        const py = player.y;
        const radius = 0.52;

        // Energiapisteet
        for (let i = 0; i < level.pellets.length; i++) {
            const p = level.pellets[i];
            if (p.eaten) continue;
            if (Math.abs(p.c - px) < radius && Math.abs(p.r - py) < radius) {
                p.eaten = true;
                pelletsLeft--;
                addScore(POINTS_PELLET, false);
                bumpCombo();
                Sound.pellet();
                addRipple(p.c + 0.5, p.r + 0.5, 0.3, 'rgba(150, 220, 255, 0.5)');
            }
        }

        // Kolikot (magneetti vetää puoleensa)
        const magnet = magnetTimer > 0 ? 2.6 : 0;
        for (let i = 0; i < level.coins.length; i++) {
            const c = level.coins[i];
            if (c.taken) continue;
            const dx = c.c - px;
            const dy = c.r - py;
            const dist = Math.hypot(dx, dy);

            if (magnet > 0 && dist < magnet) {
                c.c -= (dx / dist) * lastDt * 1.4;
                c.r -= (dy / dist) * lastDt * 1.4;
            }
            if (dist < radius + 0.1) {
                c.taken = true;
                levelCoins++;
                totalCoins++;
                addScore(POINTS_COIN, true);
                bumpCombo();
                Sound.coin();
                addRipple(c.c + 0.5, c.r + 0.5, 0.6, 'rgba(255, 212, 94, 0.55)');
                burstAt(c.c + 0.5, c.r + 0.5, 10, '#ffd45e');
            }
        }

        // Kristallit
        for (let i = 0; i < level.crystals.length; i++) {
            const k = level.crystals[i];
            if (k.taken) continue;
            if (Math.abs(k.c - px) < radius && Math.abs(k.r - py) < radius) {
                k.taken = true;
                addScore(POINTS_CRYSTAL, true);
                bumpCombo();
                Sound.crystal();
                addFloater(k.c + 0.5, k.r, '+' + POINTS_CRYSTAL);
                burstAt(k.c + 0.5, k.r + 0.5, 18, '#7cf0ff');
                addRipple(k.c + 0.5, k.r + 0.5, 1.1, 'rgba(124, 240, 255, 0.6)');
            }
        }

        // Power-upit
        for (let i = 0; i < level.powerups.length; i++) {
            const u = level.powerups[i];
            if (u.taken) continue;
            if (Math.abs(u.c - px) < radius && Math.abs(u.r - py) < radius) {
                u.taken = true;
                applyPowerup(u.type);
                addScore(POINTS_POWERUP, true);
                Sound.powerup();
                burstAt(u.c + 0.5, u.r + 0.5, 22, powerupColor(u.type));
                addRipple(u.c + 0.5, u.r + 0.5, 1.3, powerupColor(u.type));
            }
        }
    }

    // Pieni apuri: kuluvan kehyksen kesto, jotta ajastukset ovat
    // kehysriippumattomia.
    let lastDt = 1 / 60;

    function powerupColor(type) {
        return ['#8b7cf6', '#4fd1c5', '#63b3ed', '#ff5c7a', '#ffd45e'][type - 1] || '#8b7cf6';
    }

    function powerupName(type) {
        return ['Energiakilpi', 'Vauhtivirtaus', 'Jäädytys', 'Metsästäjätila', 'Magneetti'][type - 1] || 'Power-up';
    }

    function applyPowerup(type) {
        addFloater(player.x, player.y - 0.6, powerupName(type));
        if (type === 1) {
            shieldActive = true;
        } else if (type === 2) {
            speedTimer = DUR_SPEED;
        } else if (type === 3) {
            freezeTimer = DUR_FREEZE;
        } else if (type === 4) {
            hunterTimer = DUR_HUNTER;
            enemies.forEach((e) => { if (e.mode !== 'eaten') e.mode = 'frightened'; });
        } else if (type === 5) {
            magnetTimer = DUR_MAGNET;
        }
        syncHud();
    }

    function addScore(amount, useCombo) {
        const mult = useCombo ? combo : 1;
        score += amount * mult;
        syncHud();
    }

    function bumpCombo() {
        combo = Math.min(COMBO_MAX, combo + 1);
        comboTimer = COMBO_WINDOW;
        if (combo > 1) {
            Sound.combo(combo);
            addFloater(player.x, player.y - 1.0, 'COMBO x' + combo);
        }
        syncHud();
    }

    /* ============================================================
       12. VIHOLLISTEN TEKOÄLY
       Reitinhaku tehdään BFS:llä ruudukossa. Jokainen vihollinen laskee
       lyhyimmän reitin ruutuun, jonka se aikoo saavuttaa. Tavoite riippuu
       vihollistyypistä, ja osa vihollisista näkee pelaajan vain ajoittain,
       jolloin ne joutuvat arvaamaan.
       ============================================================ */

    const DIR_LIST = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    // BFS: palauttaa etäisyydet lähtöruudusta jokaiseen käytävään.
    // yksi kartta per kutsu; käytetään uudelleenkäytettävää puskuria.
    const distBuf = new Int16Array(COLS * ROWS);
    const queueBuf = new Int16Array(COLS * ROWS);

    function bfsDistances(fromC, fromR) {
        distBuf.fill(-1);
        let head = 0;
        let tail = 0;
        const start = fromR * COLS + fromC;
        distBuf[start] = 0;
        queueBuf[tail++] = start;

        while (head < tail) {
            const idx = queueBuf[head++];
            const r = (idx / COLS) | 0;
            const c = idx - r * COLS;
            const d = distBuf[idx];

            for (let i = 0; i < DIR_LIST.length; i++) {
                const nc = c + DIR_LIST[i].x;
                const nr = r + DIR_LIST[i].y;
                if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
                if (level.grid[nr][nc] !== OPEN) continue;
                const nIdx = nr * COLS + nc;
                if (distBuf[nIdx] !== -1) continue;
                distBuf[nIdx] = d + 1;
                queueBuf[tail++] = nIdx;
            }
        }
        return distBuf;
    }

    // Valitsee suunnan, joka lyhentää matkaa tavoitteeseen. Palauttaa null,
    // jos tavoite on jo käsillä (silloin kutsuja valitsee toisen suunnan).
    function stepToward(e, targetC, targetR) {
        if (e.c === targetC && e.r === targetR) return null;

        const dist = bfsDistances(targetC, targetR);
        let best = null;
        let bestDist = Infinity;

        for (let i = 0; i < DIR_LIST.length; i++) {
            const d = DIR_LIST[i];
            const nc = e.c + d.x;
            const nr = e.r + d.y;
            if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            if (level.grid[nr][nc] !== OPEN) continue;
            const nd = dist[nr * COLS + nc];
            if (nd === -1) continue;

            // Tasatilanteessa jatketaan samaan suuntaan — mutta ei koskaan
            // suuntaan, josta juuri tultiin, jottei vihollinen jää
            // heilahtelemaan kahden ruudun väliä.
            const keepsDirection = d.x === e.dir.x && d.y === e.dir.y;
            const isReverse = e.lastDir &&
                d.x === -e.lastDir.x && d.y === -e.lastDir.y;

            const better = nd < bestDist;
            const tieKeep = nd === bestDist && keepsDirection && !isReverse;

            if (better || tieKeep) {
                bestDist = nd;
                best = d;
            }
        }
        return best;
    }

    // Suunta, jota vihollinen käyttää: reitinhaku, tai jos se ei tuota
    // tulosta (esim. tavoite on jo käsillä), avoin suunta. Suoraan taakse
    // ei käännytä, jottei vihollinen jää heilahtelemaan kahden ruudun väliä.
    function safeStep(e, targetC, targetR) {
        const dir = stepToward(e, targetC, targetR);
        if (canStep(e, dir) && !isReverse(e, dir)) return dir;
        const open = pickOpenDir(e, dir);
        if (open) return open;
        if (canStep(e, dir)) return dir;
        return randomStep(e, false);
    }

    function isReverse(e, dir) {
        if (!dir || !e.lastDir) return false;
        return dir.x === e.lastDir.x && dir.y === e.lastDir.y;
    }

    // Valitse satunnainen suunta, joka ei ole täysin umpikuja (käytetään
    // harhailuun ja juoksijan virheisiin).
    function randomStep(e, avoidReverse) {
        const options = [];
        for (let i = 0; i < DIR_LIST.length; i++) {
            const nc = e.c + DIR_LIST[i].x;
            const nr = e.r + DIR_LIST[i].y;
            if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            if (level.grid[nr][nc] !== OPEN) continue;
            if (avoidReverse && DIR_LIST[i].x === -e.dir.x && DIR_LIST[i].y === -e.dir.y) continue;
            options.push(DIR_LIST[i]);
        }
        if (!options.length) return { x: -e.dir.x, y: -e.dir.y };
        return options[Math.floor(Math.random() * options.length)];
    }

    function updateEnemies(dt) {
        if (state !== 'play') return;

        const frozen = freezeTimer > 0;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];

            // Peliaika: välillä jahdataan, välillä hajaannutaan.
            e.modeTimer -= dt;
            if (e.mode === 'frightened') {
                if (hunterTimer <= 0) e.mode = 'scatter';
            } else if (e.modeTimer <= 0) {
                if (e.mode === 'chase') {
                    e.mode = 'scatter';
                    e.modeTimer = 5;
                } else {
                    e.mode = 'chase';
                    e.modeTimer = 8;
                }
            }

            if (e.mode === 'eaten') {
                // Palataan lähtöpaikkaan ja herätään henkiin.
                const dir = safeStep(e, e.startC, e.startR);
                const speed = level.enemySpeed * 2.2 * dt;
                moveEnemy(e, dir, speed);
                if (e.c === e.startC && e.r === e.startR) {
                    e.mode = 'scatter';
                    e.modeTimer = 3;
                }
                continue;
            }

            if (frozen) continue;

            // Nopeus: perusnopeus kentän mukaan, frightened hidastaa.
            let speed = level.enemySpeed * e.speedMul * dt;
            if (e.mode === 'frightened') speed *= 0.62;

            let dir;
            const seesPlayer = enemySeesPlayer(e);

            if (e.mode === 'frightened') {
                // Pakoon pelaajaa: valitaan suunta, joka kasvattaa etäisyyttä.
                dir = fleeFrom(e);
            } else if (!seesPlayer) {
                // Ei näe pelaajaa: harhailee kohti omaa nurkkaansa.
                dir = safeStep(e, e.scatterC, e.scatterR);
            } else {
                dir = chooseEnemyDir(e);
            }

            moveEnemy(e, dir, speed);
            checkEnemyPlayer(e);

            // Jumiutumisen esto: jos vihollinen ei ole vaihtanut ruutua
            // pitkään aikaan, sille arvotaan uusi suunta.
            if (e.c === e.lastC && e.r === e.lastR) {
                e.stillTime += dt;
                if (e.stillTime > 0.9) {
                    e.stillTime = 0;
                    const alt = pickOpenDir(e, null) || randomStep(e, true);
                    if (alt) {
                        e.lastDir = { x: -e.dir.x, y: -e.dir.y };
                        e.dir = alt;
                    }
                }
            } else {
                e.lastC = e.c;
                e.lastR = e.r;
                e.stillTime = 0;
            }
        }
    }

    // Näkeekö vihollinen pelaajan? Osa vihollisista näkee vain läheltä.
    function enemySeesPlayer(e) {
        const dx = player.c - e.c;
        const dy = player.r - e.r;
        const dist = Math.hypot(dx, dy);

        if (e.kind === 'hunter') return dist < 12;
        if (e.kind === 'ambusher') return dist < 9;
        if (e.kind === 'runner') return dist < 6 || Math.random() < 0.02;
        return dist < 7;                // patrol
    }

    function chooseEnemyDir(e) {
        // Jos vihollinen on samassa ruudussa pelaajan kanssa, valitaan
        // satunnainen suunta – muuten reitinhaku palauttaisi tyhjän.
        if (e.c === player.c && e.r === player.r) {
            return pickOpenDir(e, null) || randomStep(e, false);
        }

        if (e.kind === 'hunter') {
            // Suoraan pelaajan perään.
            return safeStep(e, player.c, player.r);
        }

        if (e.kind === 'ambusher') {
            // Ennakoi pelaajan liikesuunnan.
            const lead = 4;
            let tc = player.c + player.dir.x * lead;
            let tr = player.r + player.dir.y * lead;
            // Jos ennakko osuu seinään, käytetään pelaajan sijaintia.
            if (!isOpen(tc, tr)) { tc = player.c; tr = player.r; }
            return safeStep(e, tc, tr);
        }

        if (e.kind === 'runner') {
            // Nopea mutta tekee virheitä: 25 % todennäköisyydellä harhautuu.
            if (Math.random() < 0.25) {
                const lead = 2;
                const tc = clamp(player.c + player.dir.x * lead, 1, COLS - 2);
                const tr = clamp(player.r + player.dir.y * lead, 1, ROWS - 2);
                return safeStep(e, tc, tr);
            }
            return safeStep(e, player.c, player.r);
        }

        // Patrol: partioi oman alueensa ympäri, mutta voi myös jahdata.
        if (e.mode === 'chase') {
            return safeStep(e, player.c, player.r);
        }
        return randomStep(e, true);
    }

    function fleeFrom(e) {
        const dist = bfsDistances(player.c, player.r);
        let best = null;
        let bestDist = -1;
        for (let i = 0; i < DIR_LIST.length; i++) {
            const nc = e.c + DIR_LIST[i].x;
            const nr = e.r + DIR_LIST[i].y;
            if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            if (level.grid[nr][nc] !== OPEN) continue;
            const d = dist[nr * COLS + nc];
            if (d > bestDist) {
                bestDist = d;
                best = DIR_LIST[i];
            }
        }
        return best || randomStep(e, true);
    }

    // Onko suuntaan askeltaminen mahdollista tästä ruudusta?
    function canStep(e, dir) {
        if (!dir || (dir.x === 0 && dir.y === 0)) return false;
        return isOpen(e.c + dir.x, e.r + dir.y);
    }

    // Liikuttaa vihollista ruudukkoa pitkin, kuten pelaajaa: liike on lukittu
    // yhteen akseliin ja uusi suunta valitaan aina ruudun keskellä.
    // Toleranssi on väljä, koska liikeaskel ei osu aina tarkalleen keskelle.
    function moveEnemy(e, dir, step) {
        const atCenterX = Math.abs(e.x - Math.round(e.x)) <= step * 0.75;
        const atCenterY = Math.abs(e.y - Math.round(e.y)) <= step * 0.75;

        if (atCenterX && atCenterY) {
            // Napautetaan tarkalleen ruudun keskelle ennen suunnan valintaa.
            e.x = Math.round(e.x);
            e.y = Math.round(e.y);
            e.c = e.x;
            e.r = e.y;

            // Suunta on pakko vaihtaa, jos edessä on seinä.
            const blocked = !canStep(e, e.dir);
            const wantsTurn = dir && (dir.x !== e.dir.x || dir.y !== e.dir.y)
                && canStep(e, dir);

            if (blocked || wantsTurn) {
                const chosen = (dir && canStep(e, dir)) ? dir : null;
                if (chosen) e.dir = chosen;
                else e.dir = pickOpenDir(e, dir) || e.dir;
            }

            // Ei koskaan jäädä seinää vasten.
            if (!canStep(e, e.dir)) {
                const forced = pickOpenDir(e, null);
                if (forced) e.dir = forced;
            }

            // Viimeinen varmistus: valitaan mikä tahansa avoin suunta.
            if (!canStep(e, e.dir)) {
                for (let i = 0; i < DIR_LIST.length; i++) {
                    if (canStep(e, DIR_LIST[i])) { e.dir = DIR_LIST[i]; break; }
                }
            }

            if (e.dir.x !== 0) e.y = e.r;
            else e.x = e.c;

            // Muistetaan, mistä suunnasta tultiin, jotta sitä ei valita heti
            // uudelleen – muuten vihollinen heilahtelisi edestakaisin.
            e.lastDir = { x: -e.dir.x, y: -e.dir.y };
        }

        // Liikutaan eteenpäin.
        if (e.dir.x !== 0) {
            e.x = clamp(e.x + e.dir.x * step, 1, COLS - 2);
            e.y = Math.round(e.y);
        } else if (e.dir.y !== 0) {
            e.y = clamp(e.y + e.dir.y * step, 1, ROWS - 2);
            e.x = Math.round(e.x);
        }

        e.c = clamp(Math.round(e.x), 1, COLS - 2);
        e.r = clamp(Math.round(e.y), 1, ROWS - 2);
        e.wobble += step * 6;
    }

    // Valitsee avoimen suunnan, joka ei ole seinään eikä suoraan taakse.
    function pickOpenDir(e, preferred, step) {
        const options = [];
        for (let i = 0; i < DIR_LIST.length; i++) {
            const d = DIR_LIST[i];
            if (d.x === -e.dir.x && d.y === -e.dir.y) continue;      // ei takaisin
            if (!isOpen(e.c + d.x, e.r + d.y)) continue;
            options.push(d);
        }
        if (!options.length) {
            // Umpikuja: käännytään takaisin.
            return { x: -e.dir.x, y: -e.dir.y };
        }
        // Suositaan reitinhaussa annettua suuntaa, jos se on mahdollinen.
        if (preferred) {
            for (let i = 0; i < options.length; i++) {
                if (options[i].x === preferred.x && options[i].y === preferred.y) return preferred;
            }
        }
        return options[Math.floor(Math.random() * options.length)];
    }

    function checkEnemyPlayer(e) {
        if (e.mode === 'eaten') return;
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        if (Math.hypot(dx, dy) > 0.72) return;

        if (e.mode === 'frightened' || hunterTimer > 0) {
            // Pelaaja on metsästäjätilassa: vihollinen voitetaan.
            e.mode = 'eaten';
            addScore(POINTS_ENEMY, true);
            bumpCombo();
            addFloater(e.x, e.y - 0.7, '+' + POINTS_ENEMY * combo);
            burstAt(e.x + 0.5, e.y + 0.5, 20, e.main);
            Sound.eatEnemy();
            cameraShake = 7;
            return;
        }

        if (player.invuln > 0) return;
        hurtPlayer();
    }

    function hurtPlayer() {
        if (shieldActive) {
            shieldActive = false;
            player.invuln = 1.6;
            Sound.shieldBreak();
            addFloater(player.x, player.y - 0.8, 'Kilpi rikki!');
            burstAt(player.x + 0.5, player.y + 0.5, 22, '#8b7cf6');
            addRipple(player.x + 0.5, player.y + 0.5, 1.4, 'rgba(139, 124, 246, 0.7)');
            cameraShake = 8;
            syncHud();
            return;
        }

        lives--;
        flawless = false;
        combo = 1;
        comboTimer = 0;
        respawnTimer = RESPAWN_DELAY;
        cameraShake = 16;
        flashTimer = 0.45;
        Sound.hurt();
        burstAt(player.x + 0.5, player.y + 0.5, 26, '#ff5c7a');
        addRipple(player.x + 0.5, player.y + 0.5, 1.8, 'rgba(255, 92, 122, 0.7)');
        syncHud();

        if (lives <= 0) {
            state = 'dying';
            setTimeout(() => {
                if (state === 'dying') gameOver();
            }, 1100);
        } else {
            state = 'dying';
            setTimeout(() => {
                if (state !== 'dying') return;
                resetPlayer();
                state = 'play';
            }, RESPAWN_DELAY * 1000);
        }
    }

    /* ============================================================
       13. EFEKTIT
       ============================================================ */

    function burstAt(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.35 + Math.random() * 0.45,
                max: 0.8,
                size: 1.5 + Math.random() * 2.6,
                color: color || '#ffffff'
            });
        }
    }

    function addFloater(x, y, text) {
        floaters.push({ x, y, text, life: 1.1, max: 1.1 });
    }

    function addRipple(x, y, radius, color) {
        ripples.push({ x, y, r: 0.2, max: radius, life: 0.5, maxLife: 0.5, color });
    }

    function updateEffects(dt) {
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
            f.y -= dt * 1.1;
            f.life -= dt;
            if (f.life <= 0) floaters.splice(i, 1);
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.r = lerp(0.2, r.max, 1 - r.life / r.maxLife);
            r.life -= dt;
            if (r.life <= 0) ripples.splice(i, 1);
        }
        if (cameraShake > 0) cameraShake = Math.max(0, cameraShake - dt * 40);
        if (flashTimer > 0) flashTimer -= dt;
    }

    /* ============================================================
       14. PÄÄPÄIVITYS
       ============================================================ */

    function update(dt) {
        lastDt = dt;

        if (state === 'play' || state === 'dying') {
            levelTime += dt;
            totalTime += dt;
        }

        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) {
                combo = 1;
                syncHud();
            }
        }

        if (freezeTimer > 0) freezeTimer -= dt;
        if (hunterTimer > 0) {
            hunterTimer -= dt;
            if (hunterTimer <= 0) {
                enemies.forEach((e) => { if (e.mode === 'frightened') e.mode = 'scatter'; });
            }
        }
        if (speedTimer > 0) speedTimer -= dt;
        if (magnetTimer > 0) magnetTimer -= dt;

        if (state === 'dying') {
            updateEffects(dt);
            return;
        }

        if (state !== 'play') {
            updateEffects(dt);
            return;
        }

        updatePlayer(dt);
        updateEnemies(dt);
        updateEffects(dt);

        // Kenttä läpi, kun kaikki energiapisteet ja kolikot on kerätty.
        const coinsLeft = level.coins.filter((c) => !c.taken).length;
        if (pelletsLeft <= 0 && coinsLeft === 0) {
            finishLevel();
        }

        syncHud();
    }

    /* ============================================================
       15. PIIRTO
       ============================================================ */

    // Sokkelon väri kentän sävystä.
    function wallColors() {
        const hue = level.hue;
        return {
            fill: 'hsl(' + hue + ', 55%, 26%)',
            edge: 'hsl(' + hue + ', 85%, 62%)',
            glow: 'hsla(' + hue + ', 90%, 65%, 0.28)',
            floor: 'hsl(' + hue + ', 40%, 8%)',
            floorAlt: 'hsl(' + hue + ', 42%, 11%)'
        };
    }

    function drawBackground(colors) {
        const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
        grad.addColorStop(0, 'hsl(' + level.hue + ', 45%, 9%)');
        grad.addColorStop(1, 'hsl(' + level.hue + ', 50%, 5%)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);

        // Kevyt ruudukko käytäville
        ctx.strokeStyle = 'hsla(' + level.hue + ', 60%, 60%, 0.06)';
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CELL, 0);
            ctx.lineTo(c * CELL, VIEW_H);
            ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CELL);
            ctx.lineTo(VIEW_W, r * CELL);
            ctx.stroke();
        }
    }

    function drawWalls(colors) {
        // Ensin pehmeä hehku seinien alle
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 12;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (level.grid[r][c] !== WALL) continue;
                const x = c * CELL;
                const y = r * CELL;

                const grad = ctx.createLinearGradient(x, y, x, y + CELL);
                grad.addColorStop(0, colors.edge);
                grad.addColorStop(0.18, colors.fill);
                grad.addColorStop(1, 'hsl(' + level.hue + ', 55%, 16%)');
                ctx.fillStyle = grad;

                roundRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 7);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;

        // Ohut kirkas reuna
        ctx.strokeStyle = 'hsla(' + level.hue + ', 90%, 75%, 0.35)';
        ctx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (level.grid[r][c] !== WALL) continue;
                roundRect(c * CELL + 1.5, r * CELL + 1.5, CELL - 3, CELL - 3, 7);
                ctx.stroke();
            }
        }
    }

    function drawPellets() {
        ctx.fillStyle = 'rgba(180, 235, 255, 0.9)';
        for (let i = 0; i < level.pellets.length; i++) {
            const p = level.pellets[i];
            if (p.eaten) continue;
            const pulse = 2.2 + Math.sin(p.phase + performance.now() * 0.003) * 0.5;
            ctx.beginPath();
            ctx.arc(p.c * CELL + CELL / 2, p.r * CELL + CELL / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCoins() {
        for (let i = 0; i < level.coins.length; i++) {
            const c = level.coins[i];
            if (c.taken) continue;
            const cx = c.c * CELL + CELL / 2;
            const cy = c.r * CELL + CELL / 2;
            const wobble = Math.sin(c.phase + performance.now() * 0.004) * 1.6;
            const scaleX = Math.abs(Math.cos(c.phase + performance.now() * 0.003)) * 0.6 + 0.4;

            ctx.save();
            ctx.translate(cx, cy + wobble);
            ctx.scale(scaleX, 1);
            ctx.shadowColor = 'rgba(255, 212, 94, 0.7)';
            ctx.shadowBlur = 10;
            const grad = ctx.createLinearGradient(0, -8, 0, 8);
            grad.addColorStop(0, '#fff3cd');
            grad.addColorStop(0.5, '#ffd45e');
            grad.addColorStop(1, '#c9901c');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#8a5a12';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawCrystals() {
        for (let i = 0; i < level.crystals.length; i++) {
            const k = level.crystals[i];
            if (k.taken) continue;
            const cx = k.c * CELL + CELL / 2;
            const cy = k.r * CELL + CELL / 2;
            const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.12;
            const spin = performance.now() * 0.0016;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(spin);
            ctx.scale(pulse, pulse);
            ctx.shadowColor = 'rgba(124, 240, 255, 0.9)';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#7cf0ff';
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(9, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-9, 0);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function drawPowerups() {
        const now = performance.now();
        for (let i = 0; i < level.powerups.length; i++) {
            const u = level.powerups[i];
            if (u.taken) continue;
            const cx = u.c * CELL + CELL / 2;
            const cy = u.r * CELL + CELL / 2 + Math.sin(now * 0.004 + u.c) * 2;
            const color = powerupColor(u.type);
            const pulse = 10 + Math.sin(now * 0.006) * 1.6;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.shadowColor = color;
            ctx.shadowBlur = 18;
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(a) * pulse;
                const py = Math.sin(a) * pulse;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
            ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(u.type), 0, 1);
            ctx.restore();
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    function drawPlayer() {
        const cx = player.x * CELL + CELL / 2;
        const cy = player.y * CELL + CELL / 2;
        const radius = CELL * 0.42;

        // Jälki
        for (let i = player.trail.length - 1; i > 0; i--) {
            const t = player.trail[i];
            const alpha = (1 - i / player.trail.length) * 0.22;
            ctx.fillStyle = 'rgba(120, 220, 255, ' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(t.x * CELL + CELL / 2, t.y * CELL + CELL / 2, radius * (1 - i / 16), 0, Math.PI * 2);
            ctx.fill();
        }

        // Kilpi
        if (shieldActive) {
            ctx.strokeStyle = 'rgba(139, 124, 246, 0.85)';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 6 + Math.sin(performance.now() * 0.006) * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(200, 190, 255, 0.4)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        const flashing = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
        const hunterGlow = hunterTimer > 0;

        ctx.save();
        ctx.globalAlpha = flashing ? 0.55 : 1;
        ctx.shadowColor = hunterGlow ? 'rgba(255, 92, 122, 0.95)' : 'rgba(110, 220, 255, 0.8)';
        ctx.shadowBlur = hunterGlow ? 22 : 14;

        // Suuaukko kertoo suunnan
        const baseAngle = Math.atan2(player.dir.y || 0, player.dir.x || (player.moving ? 1 : 0));
        const angle = player.moving || player.dir.x || player.dir.y ? baseAngle : -Math.PI / 2;
        const mouth = 0.18 + Math.abs(Math.sin(player.mouth)) * 0.22;

        const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, radius * 0.2, cx, cy, radius * 1.15);
        grad.addColorStop(0, hunterGlow ? '#ffd0da' : '#eafcff');
        grad.addColorStop(0.5, hunterGlow ? '#ff5c7a' : '#5fd8ff');
        grad.addColorStop(1, hunterGlow ? '#a3203c' : '#1a6fa8');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle + mouth, angle - mouth + Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Silmä
        const eyeX = cx + Math.cos(angle - Math.PI / 2) * radius * 0.35;
        const eyeY = cy + Math.sin(angle - Math.PI / 2) * radius * 0.35;
        ctx.fillStyle = '#0b1024';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX - 1, eyeY - 1, radius * 0.07, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Jokaisella vihollistyypillä oma muotonsa.
    function drawEnemies() {
        const now = performance.now();
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const cx = e.x * CELL + CELL / 2;
            const cy = e.y * CELL + CELL / 2;
            const r = CELL * 0.36;
            const frightened = e.mode === 'frightened';
            const eaten = e.mode === 'eaten';
            const wobble = Math.sin(e.wobble) * 1.6;

            ctx.save();
            ctx.translate(cx, cy + wobble);

            if (eaten) {
                ctx.globalAlpha = 0.45;
            }

            const color = frightened ? '#3b6fd4' : e.main;
            const accent = frightened ? '#cfe0ff' : e.accent;
            ctx.shadowColor = frightened ? 'rgba(90, 140, 255, 0.8)' : color;
            ctx.shadowBlur = 12;

            if (e.kind === 'hunter') {
                // Terävä kolmio
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, -r);
                ctx.lineTo(r * 0.95, r * 0.8);
                ctx.lineTo(-r * 0.95, r * 0.8);
                ctx.closePath();
                ctx.fill();
            } else if (e.kind === 'patrol') {
                // Pyöreä
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.kind === 'ambusher') {
                // Vinoneliö
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, -r);
                ctx.lineTo(r, 0);
                ctx.lineTo(0, r);
                ctx.lineTo(-r, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                // Juoksija: pitkulainen
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;

            // Silmät
            const look = e.dir.x || e.dir.y ? Math.atan2(e.dir.y, e.dir.x) : 0;
            const ox = Math.cos(look) * r * 0.25;
            const oy = Math.sin(look) * r * 0.25;

            ctx.fillStyle = frightened ? '#0b1024' : accent;
            ctx.beginPath();
            ctx.arc(-r * 0.3 + ox, -r * 0.1 + oy, r * 0.19, 0, Math.PI * 2);
            ctx.arc(r * 0.3 + ox, -r * 0.1 + oy, r * 0.19, 0, Math.PI * 2);
            ctx.fill();

            if (frightened) {
                // Pelästynyt ilme: suu
                ctx.strokeStyle = '#cfe0ff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(0, r * 0.35, r * 0.28, 0, Math.PI);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function drawEffects() {
        for (let i = 0; i < ripples.length; i++) {
            const rp = ripples[i];
            ctx.strokeStyle = rp.color;
            ctx.globalAlpha = clamp(rp.life / rp.maxLife, 0, 1) * 0.8;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(rp.x * CELL, rp.y * CELL, rp.r * CELL, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            const s = p.size;
            ctx.fillRect(p.x * CELL - s / 2, p.y * CELL - s / 2, s, s);
        }
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        for (let i = 0; i < floaters.length; i++) {
            const f = floaters[i];
            ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
            ctx.fillStyle = 'rgba(6, 10, 20, 0.7)';
            ctx.fillText(f.text, f.x * CELL + 1.5, f.y * CELL + 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(f.text, f.x * CELL, f.y * CELL);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawVignette() {
        const v = ctx.createRadialGradient(
            VIEW_W / 2, VIEW_H / 2, Math.min(VIEW_W, VIEW_H) * 0.4,
            VIEW_W / 2, VIEW_H / 2, Math.max(VIEW_W, VIEW_H) * 0.75
        );
        v.addColorStop(0, 'rgba(0, 0, 0, 0)');
        v.addColorStop(1, 'rgba(3, 5, 12, 0.55)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    function render() {
        const colors = wallColors();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);

        const sx = cameraShake ? (Math.random() - 0.5) * cameraShake : 0;
        const sy = cameraShake ? (Math.random() - 0.5) * cameraShake : 0;

        ctx.save();
        ctx.translate(sx, sy);

        drawBackground(colors);
        drawWalls(colors);
        drawPellets();
        drawCoins();
        drawCrystals();
        drawPowerups();
        drawEnemies();
        if (state !== 'dying' || lives > 0) drawPlayer();
        drawEffects();

        ctx.restore();

        // Jäädytyksen sävy
        if (freezeTimer > 0) {
            ctx.fillStyle = 'rgba(120, 200, 255, ' + (0.12 * clamp(freezeTimer / DUR_FREEZE, 0, 1)).toFixed(3) + ')';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        // Metsästäjätilan sävy
        if (hunterTimer > 0) {
            ctx.fillStyle = 'rgba(255, 92, 122, ' + (0.08 * clamp(hunterTimer / DUR_HUNTER, 0, 1)).toFixed(3) + ')';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }

        drawVignette();

        if (flashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 80, 110, ' + (flashTimer * 0.8).toFixed(3) + ')';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
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

    /* ============================================================
       16. KÄYTTÖLIITTYMÄ
       ============================================================ */

    function formatTime(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function activePowerText() {
        const parts = [];
        if (shieldActive) parts.push('Kilpi');
        if (speedTimer > 0) parts.push('Vauhti ' + Math.ceil(speedTimer) + 's');
        if (freezeTimer > 0) parts.push('Jäädytys ' + Math.ceil(freezeTimer) + 's');
        if (hunterTimer > 0) parts.push('Metsästäjä ' + Math.ceil(hunterTimer) + 's');
        if (magnetTimer > 0) parts.push('Magneetti ' + Math.ceil(magnetTimer) + 's');
        return parts.join(' · ');
    }

    function syncHud() {
        hudScore.textContent = String(score);
        hudCoins.textContent = String(totalCoins);
        hudLevel.textContent = String(levelIndex + 1);
        hudLives.textContent = lives > 0 ? '❤️'.repeat(Math.min(lives, 5)) : '—';
        hudPellets.textContent = String(Math.max(0, pelletsLeft));

        if (combo > 1) {
            hudComboWrap.hidden = false;
            hudCombo.textContent = 'x' + combo;
        } else {
            hudComboWrap.hidden = true;
        }

        const power = activePowerText();
        hudPower.hidden = power === '';
        hudPower.textContent = power;
    }

    function togglePause() {
        if (state === 'play') {
            state = 'pause';
            pauseOverlay.hidden = false;
            settingsPanel.hidden = true;
            pauseSub.textContent = 'Kenttä ' + (levelIndex + 1) + ' · ' + level.name;
            Sound.pause();
            Sound.stopMusic();
        } else if (state === 'pause') {
            state = 'play';
            pauseOverlay.hidden = true;
            Sound.click();
            Sound.startMusic();
        }
    }

    function restartLevel() {
        pauseOverlay.hidden = true;
        loadLevel(levelIndex, true);
        state = 'play';
    }

    function startGame() {
        Sound.unlock();
        try { localStorage.setItem('maze-chase-help', '1'); } catch (err) { /* ei pakollinen */ }
        helpOverlay.hidden = true;
        loadLevel(levelIndex, false);
        state = 'play';
        Sound.startMusic();
    }

    function finishLevel() {
        if (state !== 'play') return;
        state = 'clear';

        const timeBonus = Math.max(0, Math.round(BONUS_TIME - levelTime * 8));
        const flawlessBonus = flawless ? BONUS_FLAWLESS : 0;
        score += timeBonus + flawlessBonus;

        if (score > progress.best) progress.best = score;
        progress.coins = Math.max(progress.coins, totalCoins);
        const key = String(levelIndex);
        if (!progress.bestTimes[key] || levelTime < progress.bestTimes[key]) {
            progress.bestTimes[key] = levelTime;
        }
        progress.level = Math.max(progress.level, Math.min(levelIndex + 1, LEVELS_TOTAL - 1));
        saveProgress();

        Sound.levelClear();
        Sound.stopMusic();

        clearTitle.textContent = 'Kenttä ' + (levelIndex + 1) + ' läpi!';
        clearScore.textContent = String(score);
        clearCoins.textContent = String(levelCoins) + ' / ' + level.totalCoins;
        clearTime.textContent = formatTime(levelTime);
        clearBonus.textContent = '+' + (timeBonus + flawlessBonus);

        if (flawless) {
            clearNote.hidden = false;
            clearNote.textContent = 'Selvisit ilman osumia — täydellisyysbonus +' + BONUS_FLAWLESS + '!';
        } else {
            clearNote.hidden = true;
        }

        const isLast = levelIndex >= LEVELS_TOTAL - 1;
        document.getElementById('btnNext').textContent = isLast ? 'Lopputulokset' : 'Seuraava kenttä';
        clearOverlay.hidden = false;
        syncHud();
    }

    function nextLevel() {
        clearOverlay.hidden = true;
        if (levelIndex >= LEVELS_TOTAL - 1) {
            showFinal();
            return;
        }
        loadLevel(levelIndex + 1, true);
        state = 'play';
        Sound.startMusic();
    }

    function showFinal() {
        state = 'final';
        finalScore.textContent = String(score);
        finalCoins.textContent = String(totalCoins);
        finalTime.textContent = formatTime(totalTime);
        finalBest.textContent = String(progress.best);
        finalOverlay.hidden = false;

        if (score >= progress.best) {
            finalBest.textContent = String(score) + ' (uusi ennätys!)';
        }
    }

    function gameOver() {
        state = 'over';
        Sound.gameOver();
        Sound.stopMusic();

        if (score > progress.best) progress.best = score;
        saveProgress();

        overScore.textContent = String(score);
        overCoins.textContent = String(totalCoins);
        overLevel.textContent = String(levelIndex + 1) + ' / ' + LEVELS_TOTAL;
        overBest.textContent = String(progress.best);

        if (score >= progress.best && score > 0) {
            overNote.hidden = false;
            overNote.textContent = 'Uusi ennätys!';
        } else {
            overNote.hidden = true;
        }

        overOverlay.hidden = false;
    }

    function backToGames() {
        window.location.href = '../../index.html';
    }

    function syncToggleUI() {
        btnSound.textContent = Sound.isSoundOn() ? '🔊' : '🔇';
        btnSound.setAttribute('aria-pressed', Sound.isSoundOn() ? 'false' : 'true');
        btnMusic.textContent = Sound.isMusicOn() ? '🎵' : '🎵̸';
        btnMusic.setAttribute('aria-pressed', Sound.isMusicOn() ? 'false' : 'true');
        if (optSound) optSound.checked = Sound.isSoundOn();
        if (optMusic) optMusic.checked = Sound.isMusicOn();
    }

    /* ============================================================
       17. NAPPIEN KYTKENNÄT
       ============================================================ */

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnContinue').addEventListener('click', togglePause);
    document.getElementById('btnRestart').addEventListener('click', restartLevel);
    document.getElementById('btnSettings').addEventListener('click', () => {
        Sound.click();
        settingsPanel.hidden = !settingsPanel.hidden;
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        Sound.click();
        settingsPanel.hidden = true;
    });
    document.getElementById('btnBackToGames').addEventListener('click', backToGames);
    document.getElementById('btnNext').addEventListener('click', nextLevel);
    document.getElementById('btnClearBack').addEventListener('click', backToGames);
    document.getElementById('btnRetry').addEventListener('click', () => {
        Sound.click();
        overOverlay.hidden = true;
        loadLevel(levelIndex, true);
        state = 'play';
        Sound.startMusic();
    });
    document.getElementById('btnOverBack').addEventListener('click', backToGames);
    document.getElementById('btnFinalReplay').addEventListener('click', () => {
        Sound.click();
        finalOverlay.hidden = true;
        loadLevel(0, false);
        state = 'play';
        Sound.startMusic();
    });
    document.getElementById('btnFinalBack').addEventListener('click', backToGames);

    btnPause.addEventListener('click', () => {
        Sound.unlock();
        togglePause();
    });

    btnSound.addEventListener('click', () => {
        Sound.unlock();
        Sound.setSound(!Sound.isSoundOn());
        syncToggleUI();
    });

    btnMusic.addEventListener('click', () => {
        Sound.unlock();
        Sound.setMusic(!Sound.isMusicOn());
        syncToggleUI();
        if (Sound.isMusicOn() && state === 'play') Sound.startMusic();
        else if (!Sound.isMusicOn()) Sound.stopMusic();
    });

    if (optSound) {
        optSound.addEventListener('change', () => {
            Sound.setSound(optSound.checked);
            syncToggleUI();
        });
    }

    if (optMusic) {
        optMusic.addEventListener('change', () => {
            Sound.setMusic(optMusic.checked);
            syncToggleUI();
            if (Sound.isMusicOn() && state === 'play') Sound.startMusic();
            else if (!Sound.isMusicOn()) Sound.stopMusic();
        });
    }

    if (optDpad) {
        optDpad.addEventListener('change', () => {
            document.body.classList.toggle('hide-dpad', !optDpad.checked);
            try {
                localStorage.setItem('maze-chase-dpad', optDpad.checked ? '1' : '0');
            } catch (err) { /* ei pakollinen */ }
        });
    }

    // D-padin voi piilottaa, jos haluaa pelata pelkillä pyyhkäisyillä.
    (function initDpadSetting() {
        let showDpad = true;
        try {
            const saved = localStorage.getItem('maze-chase-dpad');
            if (saved === '0') showDpad = false;
        } catch (err) { /* ei pakollinen */ }
        if (optDpad) optDpad.checked = showDpad;
        document.body.classList.toggle('hide-dpad', !showDpad);
    }());

    /* ============================================================
       18. KOKO JA SUUNTA
       ============================================================ */

    window.addEventListener('resize', () => {
        fitCanvas();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(fitCanvas, 200);
    });

    /* ============================================================
       19. PELISILMUKKA
       ============================================================ */

    let lastTime = 0;

    function frame(now) {
        let dt = lastTime ? (now - lastTime) / 1000 : 0;
        lastTime = now;
        if (dt > 0.05) dt = 0.05;

        update(dt);
        render();

        if (!(typeof window !== 'undefined' && typeof window.__stepFrames === 'function')) {
            requestAnimationFrame(frame);
        }
    }

    /* ============================================================
       20. KEHITYSKOUKKU (vain testaukseen)
       ============================================================ */

    let devHook = null;
    function exposeDev() {
        if (!devHook) return;
        Object.assign(devHook, {
            state: () => state,
            levelIndex: () => levelIndex,
            levelsTotal: () => LEVELS_TOTAL,
            level: () => level,
            player: () => player,
            enemies: () => enemies,
            score: () => score,
            lives: () => lives,
            coins: () => totalCoins,
            combo: () => combo,
            pelletsLeft: () => pelletsLeft,
            freezeTimer: () => freezeTimer,
            hunterTimer: () => hunterTimer,
            speedTimer: () => speedTimer,
            magnetTimer: () => magnetTimer,
            shield: () => shieldActive,
            setState: (s) => { state = s; },
            loadLevel: (i, keep) => { loadLevel(i, keep); state = 'play'; },
            move: (name) => requestDirection(name),
            start: () => startGame(),
            applyPowerup: (t) => applyPowerup(t),
            eatAll: () => {
                level.pellets.forEach((p) => { p.eaten = true; });
                level.coins.forEach((c) => { c.taken = true; });
                pelletsLeft = 0;
            },
            placePlayer: (c, r) => {
                player.c = c; player.r = r;
                player.x = c; player.y = r;
            },
            placeEnemy: (i, c, r) => {
                const e = enemies[i];
                if (!e) return;
                e.c = c; e.r = r; e.x = c; e.y = r;
            }
        });
    }
    if (typeof window !== 'undefined' && window.__engine) devHook = window.__engine;

    /* ============================================================
       21. KÄYNNISTYS
       ============================================================ */

    function init() {
        loadProgress();
        syncToggleUI();

        loadLevel(progress.level, false);
        fitCanvas();
        syncHud();

        let helpSeen = false;
        try { helpSeen = localStorage.getItem('maze-chase-help') === '1'; } catch (err) { /* ei pakollinen */ }
        if (helpSeen) {
            helpOverlay.hidden = true;
            state = 'play';
            Sound.startMusic();
        } else {
            helpOverlay.hidden = false;
            state = 'help';
        }

        exposeDev();
        requestAnimationFrame(frame);

        if (typeof window !== 'undefined' && typeof window.__stepFrames === 'function') {
            window.__stepFrames((now) => frame(now));
        }
    }

    init();
})();





