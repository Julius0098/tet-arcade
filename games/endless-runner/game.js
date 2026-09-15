/* =========================================================
   Endless Runner
   Puhdas HTML + CSS + vanilla JavaScript. Ei riippuvuuksia.
   ========================================================= */
(() => {
    'use strict';

    /* ---------- Perusasetukset ---------- */

    const WIDTH = 960;              // looginen piirtopinta
    const HEIGHT = 360;
    const GROUND_Y = 300;           // maan yläreuna

    const GRAVITY = 2600;           // px / s^2
    const JUMP_VELOCITY = -920;     // px / s
    const FAST_FALL = 3200;         // lisäpainovoima kun hyppy vapautetaan
    const COYOTE_TIME = 0.12;       // armomsekunnit reunan jälkeen
    const JUMP_BUFFER = 0.15;       // hypyn ennakkopainallus

    const START_SPEED = 340;        // maailman nopeus px / s
    const MAX_SPEED = 760;
    const SPEED_GAIN = 5.5;         // kiihtyvyys ajan mukana, px / s^2
    const SPEED_PER_SCORE = 0.11;   // kiihtyvyys pisteen mukana, px / s per piste
    const STEP_LENGTH = 70;         // px yhtä pistettä kohti

    const SCORE_PER_SECOND = 20;    // pisteet elinajasta
    const RANKS = [0, 100, 250, 500, 1000, 2000];
    const BEST_KEY = 'endless-runner-best';
    const CHARACTER_KEY = 'endless-runner-character';
    const LEVEL_KEY = 'endless-runner-level';
    const RECORD_STEP = 150;        // pisteet, joilla nykyinen ennätys on tehty
    const MAX_LEVEL = 100;          // level ei koskaan ylitä tätä
    const START_HINT_TIME = 2.2;    // "Valittu: ..." -tekstin kesto

    // Hahmon pikseligrafiikka: 1 = vartalo, 2 = yksityiskohta.
    // 4 x 6 ruudukkoa -> 28 x 42 px, joten kaikki hahmot mahtuvat samaan
    // törmäyslaatikkoon eikä pelattavuus muutu hahmon mukana.
    const CHARACTERS = [
        {
            id: 'runner',
            name: 'Juoksija',
            tagline: 'Kevyt ja nopea',
            art: [
                [1, 1, 1, 1],
                [1, 2, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
            ],
            body: '#5fd6a8',
            accent: '#0d1017',
        },
        {
            id: 'robot',
            name: 'Robotti',
            tagline: 'Terästä kantapäissä',
            art: [
                [1, 1, 1, 1],
                [2, 2, 2, 2],
                [1, 1, 1, 1],
                [1, 0, 0, 1],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
            ],
            body: '#63b9ff',
            accent: '#08131f',
        },
        {
            id: 'ninja',
            name: 'Ninja',
            tagline: 'Hiljainen varjo',
            art: [
                [1, 1, 1, 1],
                [1, 2, 2, 1],
                [1, 1, 1, 1],
                [2, 2, 2, 2],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
            ],
            body: '#b48cff',
            accent: '#150e26',
        },
        {
            id: 'knight',
            name: 'Ritari',
            tagline: 'Raskas mutta vakaa',
            art: [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 2, 2, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 0, 1],
            ],
            body: '#dfe7f5',
            accent: '#232a3a',
        },
        {
            id: 'bunny',
            name: 'Pupu',
            tagline: 'Pomppii kevyesti',
            art: [
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 1],
                [2, 1, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 1, 0],
            ],
            body: '#ff9ecb',
            accent: '#2a1420',
        },
    ];
    const PLAYER_PIXEL = 7;                                   // yksi "pikseli" = 7x7
    const PLAYER_W = CHARACTERS[0].art[0].length * PLAYER_PIXEL;   // 28
    const PLAYER_H = CHARACTERS[0].art.length * PLAYER_PIXEL;      // 42
    const PLAYER_X = 128;

    const DEATH_GRAVITY = 2100;     // kuolinanimaation painovoima
    const DEATH_SPIN = 3.2;         // rad / s
    const DEATH_TIME = 0.95;        // s ennen loppuruutua
    const SCORE_EASE = 12;          // pistenäytön liukuvuus

    const START_LEAN = 0.045;       // hahmon etunoja ra / s
    const SPEED_LINES = 9;          // taustan vauhtiviivat
    const DUST_INTERVAL = 0.11;     // askelpölyn väli sekunteina

    const LABEL_FONT = '600 12px "Segoe UI", system-ui, sans-serif';
    const SMALL_FONT = '600 14px "Segoe UI", system-ui, sans-serif';
    const KEY_FONT = '700 13px "Segoe UI", system-ui, sans-serif';
    const NAME_FONT = '600 18px "Segoe UI", system-ui, sans-serif';
    const TITLE_FONT = '700 34px "Segoe UI", system-ui, sans-serif';

    /* ---------- Väripaletti ----------
       Hillitty, ammattimainen sävy: kylmä sininen tausta, neutraali
       vaaleansininen korostus ja lämmin oranssi vain esteille. */

    const C = {
        /* Luonto-teema: iltataivas, vuoret, metsä ja ruohoinen maa. */
        skyTop: '#16264a',
        skyMid: '#2c3d6b',
        skyLow: '#6d6a94',
        skyHorizon: '#c98a6e',
        skyWarm: '#f0bb85',
        glow: 'rgba(255, 196, 128, 0.22)',
        glowEnd: 'rgba(255, 196, 128, 0)',
        sun: '#ffe3ac',
        sunGlow: 'rgba(255, 220, 160, 0.35)',

        mountainFar: '#3a4666',
        mountainMid: '#2f3a55',
        forestFar: '#22304a',
        forestMid: '#1a2638',
        forestNear: '#131d2b',

        cloud: '#f6d9c4',
        cloudShade: '#e8b79c',
        star: '#dfe7f7',
        streak: '#e8f2ff',

        groundTop: '#3a7d52',
        groundMid: '#2b5c3d',
        groundLow: '#1d3f2b',
        groundEdge: 'rgba(255, 255, 255, 0.08)',
        groundEdgeStrong: 'rgba(198, 240, 190, 0.55)',
        grass: '#5fa86a',
        grassDark: '#2f6b41',
        pebble: '#8fa08c',

        platformTop: '#4a8f5e',
        platformLow: '#2a5238',
        platformEdge: 'rgba(198, 240, 190, 0.45)',
        platformHighlight: 'rgba(220, 250, 210, 0.8)',
        pitVoid: 'rgba(10, 14, 12, 0.94)',
        pitEarth: '#2a1f18',

        obstacleA: '#2f8f5b',        // kaktus: luonnonvihreä
        obstacleB: '#a4713c',        // laatikko: puu
        obstacleInk: 'rgba(30, 20, 12, 0.35)',
        obstacleShine: 'rgba(255, 255, 255, 0.30)',

        coinEdge: '#8a5a12',
        coinBody: '#f7c948',
        coinFace: '#ffe9a8',
        coinSpark: '#fff6d8',

        shadow: 'rgba(12, 20, 16, 0.30)',
        playerShadow: 'rgba(12, 20, 16, 0.34)',
        dust: '#8a9c7c',
        debris: '#b9c7a8',
        debrisDead: '#ff9f5a',

        panel: 'rgba(10, 16, 27, 0.62)',
        panelEdge: 'rgba(255, 255, 255, 0.10)',
        text: '#e9eefa',
        textDim: '#93a1bb',
        accent: '#63b3ed',
        accentSoft: 'rgba(99, 179, 237, 0.95)',
        barTrack: 'rgba(255, 255, 255, 0.18)',
        barFill: 'rgba(99, 179, 237, 0.92)',
        badgeBg: 'rgba(255, 255, 255, 0.07)',
        badgeEdge: 'rgba(255, 255, 255, 0.20)',
        warn: '#f5b544',
    };

    /* ---------- DOM ---------- */

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const coinsEl = document.getElementById('coins');
    const levelEl = document.getElementById('level');
    const levelFillEl = document.getElementById('levelFill');
    const bestWrap = document.getElementById('best');
    const bestEl = document.getElementById('bestScore');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayScore = document.getElementById('overlayScore');
    const overlayNote = document.getElementById('overlayNote');
    const soundBtn = document.getElementById('soundBtn');
    const soundIcon = document.getElementById('soundIcon');
    const soundLabel = document.getElementById('soundLabel');
    const overlayBtn = document.getElementById('overlayBtn');
    const overlayHint = document.getElementById('overlayHint');
    const rotateTip = document.getElementById('rotateTip');
    const panelEl = document.getElementById('panel');
    const pickerEl = document.getElementById('picker');
    const pickerHintEl = document.getElementById('pickerHint');
    const pickerButtons = [];

    /* ---------- Palaset ---------- */

    // Esteet: kaksi eri kokoluokkaa ja kahta tyylia -> ainakin nelja eri kokoa.
    const OBSTACLE_TYPES = [
        { w: 24, h: 40, style: 'cactus', size: 'small' },
        { w: 30, h: 54, style: 'cactus', size: 'small' },
        { w: 42, h: 32, style: 'crate', size: 'small' },
        { w: 34, h: 68, style: 'cactus', size: 'large' },
        { w: 40, h: 84, style: 'cactus', size: 'large' },
        { w: 56, h: 42, style: 'crate', size: 'large' },
        { w: 64, h: 30, style: 'crate', size: 'large' },
    ];

    // Kolikko: pyoreä pikseligrafiikka, 1 = kulta, 2 = korostus.
    const COIN_ART = [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 0, 1, 1, 0, 1, 0],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 1, 1, 0, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
    ];
    const COIN_PIXEL = 3;
    const COIN_W = COIN_ART[0].length * COIN_PIXEL;     // 24
    const COIN_H = COIN_ART.length * COIN_PIXEL;        // 24
    // Törmäyslaatikko on grafiikkaa pienempi, jotta kerääminen tuntuu reilulta.
    const COIN_PAD = 7;
    const COIN_JUMP_VELOCITY = -300;    // kaarelle asetettujen kolikoiden nousu
    const COIN_GRAVITY = 1100;
    const CLOUD_ART = [        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 0, 0],
    ];

    /* ---------- Pelitila ---------- */

    let state = 'ready';            // ready | running | dying | over
    let width = WIDTH;
    let height = HEIGHT;
    let groundY = GROUND_Y;
    let dpr = 1;

    const player = {
        x: 0, y: 0, w: PLAYER_W, h: PLAYER_H, vy: 0, rot: 0, spin: 0,
        onGround: true,
        surface: GROUND_Y,          // alusta, jonka päällä hahmo seisoo
        prevBottom: GROUND_Y,       // edellisen askeleen jalkojen alareuna
        prevHead: GROUND_Y - PLAYER_H,   // edellisen askeleen pään yläreuna
    };
    let selected = 0;               // valittu hahmo
    let bodyColor = CHARACTERS[0].body;
    let accentColor = CHARACTERS[0].accent;
    let legColor = CHARACTERS[0].body;
    let startHint = 0;              // "Valittu: ..." -tekstin jäljellä oleva aika
    const run = { speed: START_SPEED, distance: 0, score: 0, shown: 0, spawnTimer: 0, time: 0, rank: 0 };
    const death = { t: 0, type: 'crash' };   // crash = törmäys, pit = rotkoon putoaminen

    let obstacles = [];
    let coins = [];                 // kerättävät kolikot
    let coinCount = 0;              // kerättyjen kolikoiden laskuri
    let coinSpin = 0;               // kolikoiden pyörähdysvaihe
    let clouds = [];
    let particles = [];
    let streaks = [];               // taustan nopeusviivat
    let stars = [];                 // kaukana liikkuvat pisteet
    let dustTimer = 0;              // askelpölyn ajastin
    let bestScore = 0;
    let level = 1;                  // level 1 alussa, kasvaa ennätyksistä
    let records = 0;                // montako ennätystä on tehty
    let hudScore = 0;               // HUD-tekstin liukuva arvo
    let hurry = false;
    let coyote = 0;
    let jumpBuffer = 0;
    let holdingJump = false;

    /* ---------- Maailma: maa ja kerrokset ----------
       solids sisältää sekä maanpinnan palat että koholla olevat tasot.
       Maanpalojen väliin jää rotko, johon voi pudota. */

    // Kerrosten korkeudet on mitoitettu hypyn ja hahmon koon mukaan.
    // Kerroksen alla oleva tila on (korkeus - PLATFORM_THICKNESS), koska
    // kerroslaatta on 16 px paksu:
    //  - kerros 1: 70 px  -> tilaa alla 54 px (hahmo 42 px mahtuu)
    //  - kerros 2: 140 px -> tilaa alla 124 px ja välissä 1. kerrokseen 54 px
    //  - hyppy nostaa 163 px, joten kerros 2 (140 px) yletytään maasta ja
    //    kerrosten väli (70 px) yletytään kerrokselta 1
    const LEVEL_H1 = GROUND_Y - 70;     // ensimmäinen kerros
    const LEVEL_H2 = GROUND_Y - 140;    // toinen kerros
    const PLATFORM_THICKNESS = 16;
    const PIT_DROP = 80;                // kuinka syvälle rotkoon voi pudota

    let solids = [];
    let worldCursor = 0;            // mihin x-kohtaan maata on syntynyt
    let spawnCursor = 0;            // milloin seuraava este/kolikko syntyy
    let fallLimit = 0;              // rotkon pohja: tämän alle pudotessa kuolee

    // Pystysuuntainen liike lasketaan kiinteällä askeleella, jotta nopea
    // putoaminen ei mene kerrosten läpi.
    const FIXED_STEP = 1 / 120;
    let accumulator = 0;

    // Seuranta: onko hahmo seissyt kerroksilla (käytetään myös testeissä).
    const reached = { platform: false, high: false, lowest: Infinity };

    try {
        const stored = parseInt(localStorage.getItem(BEST_KEY), 10);
        if (Number.isFinite(stored) && stored > 0) bestScore = stored;

        // Palautetaan viimeksi valittu hahmo.
        const storedCharacter = localStorage.getItem(CHARACTER_KEY);
        const found = CHARACTERS.findIndex((c) => c.id === storedCharacter);
        if (found >= 0) selected = found;

        // Palautetaan level ja siihen johtaneiden ennätysten määrä.
        const storedLevel = parseInt(localStorage.getItem(LEVEL_KEY), 10);
        if (Number.isFinite(storedLevel) && storedLevel >= 1) {
            level = clamp(storedLevel, 1, MAX_LEVEL);
            records = level - 1;
        }
    } catch (err) {
        bestScore = 0;              // esim. file:// ja estetty tallennus
    }
    equipCharacter();

    /* ---------- Äänitehosteet ----------
       Pieni synteesimoottori Web Audiolla: ei äänitiedostoja eikä
       riippuvuuksia. Selain sallii äänen vasta käyttäjän eleestä, joten
       AudioContext luodaan ensimmäisellä napautuksella tai näppäimellä. */

    const MUTE_KEY = 'endless-runner-mute';

    const Sound = (() => {
        let audioCtx = null;
        let master = null;
        let muted = false;
        let noiseBuffer = null;

        try {
            muted = localStorage.getItem(MUTE_KEY) === '1';
        } catch (err) {
            muted = false;
        }

        // Luodaan tai herätetään äänikonteksti. Kutsutaan käyttäjän eleestä.
        function unlock() {
            try {
                if (!audioCtx) {
                    const Ctor = window.AudioContext || window.webkitAudioContext;
                    if (!Ctor) return null;
                    audioCtx = new Ctor();
                    master = audioCtx.createGain();
                    master.gain.value = muted ? 0 : 0.85;
                    master.connect(audioCtx.destination);

                    // Kohinapuskuri rätinöitä ja kolahduksia varten.
                    const length = Math.floor(audioCtx.sampleRate * 0.5);
                    noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
                    const data = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
                }
                if (audioCtx.state === 'suspended') audioCtx.resume();
            } catch (err) {
                audioCtx = null;        // ääni ei ole pakollinen
            }
            return audioCtx;
        }

        // Yksi sävel: taajuus liukuu from -> to ja äänenvoimakkuus vaimenee.
        function tone(options) {
            const audio = unlock();
            if (!audio || muted) return;

            const now = audio.currentTime;
            const duration = options.duration || 0.15;
            const osc = audio.createOscillator();
            const gain = audio.createGain();

            osc.type = options.type || 'triangle';
            osc.frequency.setValueAtTime(Math.max(20, options.from), now);
            if (options.to && options.to !== options.from) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), now + duration);
            }

            const peak = options.gain || 0.2;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + duration + 0.02);
        }

        // Lyhyt kohinapurskaus: rätinä, kolahdus ja törmäys.
        function noise(options) {
            const audio = unlock();
            if (!audio || muted || !noiseBuffer) return;

            const now = audio.currentTime;
            const duration = options.duration || 0.2;
            const source = audio.createBufferSource();
            const filter = audio.createBiquadFilter();
            const gain = audio.createGain();

            source.buffer = noiseBuffer;
            filter.type = options.filter || 'lowpass';
            filter.frequency.setValueAtTime(options.cutoff || 900, now);
            if (options.cutoffTo) {
                filter.frequency.exponentialRampToValueAtTime(Math.max(60, options.cutoffTo), now + duration);
            }

            gain.gain.setValueAtTime(options.gain || 0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            source.start(now);
            source.stop(now + duration + 0.02);
        }

        return {
            unlock,
            isMuted: () => muted,
            toggle() {
                muted = !muted;
                try {
                    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
                } catch (err) {
                    /* tallennus ei ole pakollinen */
                }
                if (master) master.gain.value = muted ? 0 : 0.85;
                if (!muted) tone({ from: 660, to: 990, duration: 0.1, gain: 0.14, type: 'triangle' });
                return muted;
            },
            jump() {
                tone({ from: 330, to: 640, duration: 0.16, gain: 0.16, type: 'triangle' });
                tone({ from: 170, to: 95, duration: 0.12, gain: 0.09, type: 'sine' });
            },
            coin() {
                tone({ from: 988, to: 988, duration: 0.07, gain: 0.13, type: 'triangle' });
                tone({ from: 1319, to: 1319, duration: 0.14, gain: 0.12, type: 'triangle' });
            },
            land() {
                noise({ duration: 0.13, gain: 0.09, cutoff: 520, cutoffTo: 180, filter: 'lowpass' });
            },
            death() {
                tone({ from: 420, to: 70, duration: 0.55, gain: 0.2, type: 'sawtooth' });
                tone({ from: 300, to: 60, duration: 0.55, gain: 0.11, type: 'square' });
                noise({ duration: 0.4, gain: 0.22, cutoff: 1200, cutoffTo: 120, filter: 'lowpass' });
            },
            fall() {
                tone({ from: 520, to: 90, duration: 0.7, gain: 0.18, type: 'sine' });
            },
            levelUp() {
                tone({ from: 659, to: 659, duration: 0.1, gain: 0.13, type: 'triangle' });
                tone({ from: 880, to: 880, duration: 0.1, gain: 0.13, type: 'triangle' });
                tone({ from: 1175, to: 1175, duration: 0.18, gain: 0.13, type: 'triangle' });
            },
        };
    })();

    /* ---------- KEHITYSKOUKKU ----------
       Vain testausta varten: tarjoaa pelin omat koordinaatit ja
       törmäysfunktiot invarianttien tarkistamiseen (esim. selaimen
       konsolista window.__engine.coins()). Asetetaan vain jos
       window.__engine on olemassa, joten se ei vaikuta normaaliin peliin. */
    if (typeof window !== 'undefined' && window.__engine) {
        Object.assign(window.__engine, {
            coins: () => coins,
            obstacles: () => obstacles,
            solids: () => solids,
            player: () => player,
            obstacleBox: obstacleBox,
            hits: hits,
            state: () => state,
            lastDeath: () => death.type,
            die: (type) => die(type),
            worldCursor: () => worldCursor,
            distance: () => run.distance,
            width: () => width,
            // Testeille: siirrä hahmo tiettyyn kohtaan ja nollaa liike.
            place: (x, y) => {
                player.x = x;
                player.y = y;
                player.vy = 0;
                player.onGround = false;
                player.prevBottom = y + player.h;
                player.prevHead = y;
            },
            restart: () => {
                reset();
                startRun();
            },
            speed: () => run.speed,
            gravity: () => GRAVITY,
            jumpVelocity: () => JUMP_VELOCITY,
            // Testeille: aseta siemen, jolloin maailma on toistettava.
            seed: (value) => {
                let state = (value >>> 0) || 1;
                randomSource = () => {
                    state = (state + 0x6D2B79F5) >>> 0;
                    let t = state;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            },
            reachedPlatform: () => reached.platform,
            reachedHighPlatform: () => reached.high,
            highestSurface: () => reached.lowest,
            planJumpNeed: () => planJumpNeed(player.surface, run.speed),
            planJumpDebug: () => planJumpDebug(),
            // Onko edessä rotko, jonka yli pitää hypätä? Palauttaa etäisyyden.
            pitAhead: () => {
                const front = player.x + player.w;
                let nearest = Infinity;
                let cover = 0;
                for (let i = 0; i < solids.length; i++) {
                    const solid = solids[i];
                    if (solid.kind === 'pit') { nearest = Math.min(nearest, solid.x - front); continue; }
                    if (solid.x <= front + 14) cover = Math.max(cover, solid.x + solid.w);
                }
                if (!Number.isFinite(nearest)) return Infinity;
                return cover - front;
            },        });
    }

    /* ---------- Pieniä apureita ---------- */

    // Satunnaisluku väliltä [min, max]. Testeissä voidaan asettaa siemen,
    // jolloin maailma syntyy aina samanlaisena.
    let randomSource = Math.random;

    function rand(min, max) {
        return min + randomSource() * (max - min);
    }

    // Rajaa arvo välille [min, max].
    function clamp(value, min, max) {
        return value < min ? min : value > max ? max : value;
    }

    /* ---------- Värien käsittely ---------- */

    // Kirkastaa tai tummentaa hex-väriä kertoimella.
    function shade(hex, factor) {
        const value = parseInt(hex.slice(1), 16);
        const channel = (shift) => {
            const part = (value >> shift) & 0xff;
            return clamp(Math.round((factor >= 1
                ? part + (255 - part) * (factor - 1)
                : part * factor)), 0, 255);
        };
        return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
    }

    // Karkea suhteellinen luminanssi, jolla valitaan reunaviivan sävy.
    function luminance(hex) {
        const value = parseInt(hex.slice(1), 16);
        const r = (value >> 16) & 0xff;
        const g = (value >> 8) & 0xff;
        const b = value & 0xff;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    // Ottaa hahmon käyttöön: vartalon, yksityiskohdan ja jalkojen värit.
    function equipCharacter() {
        const character = CHARACTERS[selected] || CHARACTERS[0];
        bodyColor = character.body;
        accentColor = character.accent;
        legColor = shade(character.body, 0.72);
    }

    // Vaihtaa hahmoa ja tallentaa valinnan.
    function cycleCharacter(step) {
        const count = CHARACTERS.length;
        selected = ((selected + step) % count + count) % count;
        equipCharacter();
        syncCharacterUI();
        try {
            localStorage.setItem(CHARACTER_KEY, CHARACTERS[selected].id);
        } catch (err) {
            /* tallennus ei ole pakollinen */
        }
    }

    /* ---------- Hahmovalitsin paneelissa ---------- */

    // Piirretään hahmon pikseligrafiikasta SVG-esikatselu paneeliin.
    function createCharacterIcon(character) {
        const pixel = 5;
        const art = character.art;
        const width = art[0].length * pixel;
        const height = art.length * pixel;
        const bodyFill = shade(character.body, 1.25);
        const accentFill = shade(character.body, 0.6);
        const parts = [`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">`];

        for (let row = 0; row < art.length; row++) {
            for (let col = 0; col < art[row].length; col++) {
                const value = art[row][col];
                if (!value) continue;
                const fill = value === 2 ? accentFill : bodyFill;
                parts.push(`<rect x="${col * pixel}" y="${row * pixel}" width="${pixel}" height="${pixel}" fill="${fill}"/>`);
            }
        }

        parts.push('</svg>');
        return parts.join('');
    }

    // Rakentaa hahmonappien sisällön hahmomäärittelystä.
    function buildCharacterPicker() {
        if (!pickerEl) return;

        for (let i = 0; i < CHARACTERS.length; i++) {
            const character = CHARACTERS[i];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'picker__item';
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', 'false');
            button.dataset.index = String(i);
            button.innerHTML =
                '<span class="picker__icon">' + createCharacterIcon(character) + '</span>' +
                '<span class="picker__meta">' +
                '<span class="picker__name">' + character.name + '</span>' +
                '<span class="picker__tag">' + character.tagline + '</span>' +
                '</span>';

            button.addEventListener('click', () => {
                if (state !== 'ready' && state !== 'over') return;   // kesken pelin ei vaihdeta
                selected = i;
                equipCharacter();
                syncCharacterUI();
                try {
                    localStorage.setItem(CHARACTER_KEY, character.id);
                } catch (err) {
                    /* tallennus ei ole pakollinen */
                }
            });

            pickerEl.appendChild(button);
            pickerButtons.push(button);
        }
    }

    // Päivittää valitun hahmon korostuksen ja paneelin tilan.
    function syncCharacterUI() {
        for (let i = 0; i < pickerButtons.length; i++) {
            const active = i === selected;
            pickerButtons[i].classList.toggle('is-selected', active);
            pickerButtons[i].setAttribute('aria-checked', active ? 'true' : 'false');
        }

        if (!panelEl) return;
        const locked = state === 'running' || state === 'dying';
        panelEl.classList.toggle('is-locked', locked);

        if (pickerHintEl) {
            pickerHintEl.textContent = locked
                ? 'Hahmo on lukittu kesken pelin. Palaa aloitusruutuun vaihtaaksesi.'
                : 'Vaihda myös vasemmalla ja oikealla nuolinäppäimellä.';
        }
    }

    // Piirtää pikseligrafiikan: jokainen 1/2 on yksi neliö.
    // flash != null maalaa kaikki pikselit sillä värillä (esim. keräysvälähdys).
    function drawBitmap(art, originX, originY, pixel, color1, color2, flash) {
        for (let row = 0; row < art.length; row++) {
            const line = art[row];
            for (let col = 0; col < line.length; col++) {
                const value = line[col];
                if (!value) continue;
                ctx.fillStyle = flash != null && value === 1 ? flash : (value === 2 ? color2 : color1);
                ctx.fillRect(originX + col * pixel, originY + row * pixel, pixel, pixel);
            }
        }
    }

    // Pyöristetty suorakaide.
    function roundRect(x, y, w, h, radius) {
        const r = Math.min(radius, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Pistemäärää vastaava arvonimi.
    function rankFor(score) {
        let index = 0;
        for (let i = 1; i < RANKS.length; i++) {
            if (score >= RANKS[i]) index = i;
        }
        return index;
    }

    // Nopeus kasvaa sekä ajan että pistemäärän mukana, mutta ei koskaan yli maksimin.
    function speedFor(score) {
        return Math.min(MAX_SPEED, START_SPEED + score * SPEED_PER_SCORE);
    }

    /* ---------- Levelit ----------
       Jokainen uusi ennätys nostaa leveliä yhdellä. Level 1 alussa ja
       enintään MAX_LEVEL. Nykyinen ennätys on tehty records * RECORD_STEP
       pisteellä, joten siihen verraten voi laskea edistymisen. */

    function levelFor(recordCount) {
        return clamp(1 + recordCount, 1, MAX_LEVEL);
    }

    function recordBase() {
        return records * RECORD_STEP;
    }

    // Kuinka pitkalla seuraavasta ennätystavoitteesta ollaan (0-1).
    // Jokainen uusi ennätys nostaa levelin, joten palkki nayttaa matkaa
    // eteenpain: 0 % ilman ennätystä, 50 % tavoitteessa RECORD_STEP.
    // 100. levelilla palkki on täysi.
    function levelProgress() {
        if (level >= MAX_LEVEL) return 1;
        if (bestScore <= 0) return 0;
        return clamp(bestScore / (bestScore + RECORD_STEP), 0, 1);
    }

    // Paivittaa level-nayton pelialueen alla.
    function syncLevelUI() {
        if (levelEl) levelEl.textContent = String(level);
        if (levelFillEl) levelFillEl.style.width = Math.round(levelProgress() * 100) + '%';
    }

    // Äänenapin tila: kuvake ja painalluksen tila.
    function syncSoundUI() {
        const muted = Sound.isMuted();
        if (soundBtn) soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        if (soundIcon) soundIcon.textContent = muted ? '🔇' : '🔊';
        if (soundLabel) soundLabel.textContent = muted ? 'Äänet pois' : 'Äänet';
    }

    /* ---------- Puhelimen pelitila ja koko ruutu ----------
       Puhelimella valikot piilotetaan pelin ajaksi, jotta itse peli näkyy
       mahdollisimman isona. Lisäksi pelin voi avata koko ruudulle. */

    // Onko kyseessä kosketuslaite (kapea näyttö tai karkea osoitin)?
    function isSmallScreen() {
        if (window.matchMedia) {
            if (window.matchMedia('(max-width: 900px)').matches) return true;
            if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
        }
        return window.innerWidth <= 900;
    }

    // Päivittää pelitila-luokan: valikot piiloon vain pelin aikana.
    // Luokka asetetaan vain pienille näytöille, jotta työpöydän asettelu
    // säilyy ennallaan. JS hoitaa rajauksen, koska resize() lukee saman
    // luokan eikä CSS-mediakyselyä voi kysyä sieltä käsin.
    let lastPlayMode = null;
    function syncPlayMode() {
        const playing = state === 'running' || state === 'dying';
        const active = playing && isSmallScreen();
        if (active === lastPlayMode) return;
        lastPlayMode = active;
        document.body.classList.toggle('is-playing', active);
        syncRotateTip();
        resize();                               // peli saa koko ruudun korkeuden
    }

    // Pyydetään vaakatasoa, jotta vaakasuuntainen peli näkyy kunnolla.
    // Selain voi evätä pyynnön (esim. työpöydällä), jolloin peli toimii
    // pystyssäkin ja kääntökehotus opastaa pelaajaa.
    function lockLandscape() {
        const orientation = screen.orientation;
        if (!orientation || typeof orientation.lock !== 'function') return;
        try {
            const result = orientation.lock('landscape');
            if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (err) {
            /* ei tuettu tai estetty */
        }
    }

    // Pystysuunnassa olevalle puhelimelle kehotetaan kääntämään laite, koska
    // peli on vaakasuuntainen. Kehotus näytetään vain kosketuslaitteilla ja
    // vain pelin aikana; CSS huolehtii suunnasta.
    function syncRotateTip() {
        if (!rotateTip) return;

        const coarse = window.matchMedia
            ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
            : false;

        // Työpöydällä ei kehoteta kääntämään näyttöä.
        if (!coarse || !isSmallScreen()) {
            rotateTip.hidden = true;
            return;
        }

        const portrait = window.matchMedia
            ? window.matchMedia('(orientation: portrait)').matches
            : window.innerHeight > window.innerWidth;
        rotateTip.hidden = !portrait;
    }

    // Näkyykö pelaajan törmäyslaatikon ympärillä esteitä? -> varoitus.
    function obstacleNear() {
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const gap = obstacle.x - (player.x + player.w);
            if (gap > 0 && gap < 230) return true;
        }
        return false;
    }

    // Esteen törmäyslaatikko on sivuilta hieman grafiikkaa kapeampi, jolloin
    // reunaan osuminen tuntuu reilulta.
    const OBSTACLE_HIT_PAD = 3;

    function obstacleBox(obstacle) {
        return {
            left: obstacle.x + OBSTACLE_HIT_PAD,
            right: obstacle.x + obstacle.w - OBSTACLE_HIT_PAD,
            top: obstacle.y,
            bottom: obstacle.y + obstacle.h,
        };
    }

    // Yksinkertainen törmäystarkistus (AABB).
    function hits(obstacle) {
        const box = obstacleBox(obstacle);
        return player.x < box.right &&
            player.x + player.w > box.left &&
            player.y < box.bottom &&
            player.y + player.h > box.top;
    }

    /* ---------- Koko ja skaalaus ---------- */

    function resize() {
        // Pelin looginen koordinaatisto on aina 960 px leveä; canvas skaalataan siihen.
        // Puhelimessa marginaalit ja ylätila ovat pienemmät, jotta pelialue
        // saadaan mahdollisimman suureksi.
        const compact = window.innerWidth < 620 || window.innerHeight < 560;

        // Pelitilassa (puhelin) valikot on piilotettu, joten koko ruutu on pelin
        // käytössä: ei marginaaleja eikä yläpalkin varausta.
        const playMode = document.body.classList.contains('is-playing');

        const sideMargin = playMode ? 0 : (compact ? 22 : 48);
        // Otsikko, HUD ja level-palkki vievät tilaa. Puhelimessa ne ovat
        // pienemmät, ja pelialueelle taataan aina reilu osa ruudusta.
        const chromeHeight = playMode ? 0 : (compact ? 118 : 230);

        const availableWidth = clamp(
            Math.min(canvas.parentElement.clientWidth || window.innerWidth,
                window.innerWidth - sideMargin),
            260,
            WIDTH
        );
        let availableHeight = Math.max(100, window.innerHeight - chromeHeight);
        if (!playMode && compact) {
            availableHeight = Math.max(availableHeight, Math.round(window.innerHeight * 0.6));
        }

        // Pelitilassa canvas täyttää ruudun: CSS skaalaa sen (object-fit: cover)
        // ja hahmon kohta jää näkyviin. Siksi piirtotarkkuus mitoitetaan
        // ruudun koon mukaan eikä canvasin näkyvän laatikon mukaan.
        const scale = playMode
            ? Math.max(availableWidth / WIDTH, availableHeight / HEIGHT)
            : Math.min(availableWidth / WIDTH, availableHeight / HEIGHT, 1);

        height = Math.round(HEIGHT * scale);
        groundY = Math.round((GROUND_Y * height) / HEIGHT);

        // Tarkka piirtotarkkuus myös puhelimessa. Puhelimella raja on hieman
        // pienempi, jotta piirtäminen pysyy sulavana (~2,5 M pikseliä/kehys).
        dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.75 : 2);

        // Canvaksen ulkoasu tulee CSS:stä (mukaan lukien pelitilan koko ruudun
        // sovitus), jotta inline-tyylit eivät kumoa sitä.
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

        // Pidetään hahmo ja esteet uudella maanpinnalla.
        player.y = clamp(player.y, 0, groundY - player.h);
        if (state === 'running' && player.onGround) player.y = groundY - player.h;
        for (let i = 0; i < obstacles.length; i++) {
            obstacles[i].y = groundY - obstacles[i].h;
        }

        buildScenery();
    }

    function buildScenery() {
        clouds = [];
        const cloudCount = Math.max(3, Math.round(width / 260));
        for (let i = 0; i < cloudCount; i++) {
            clouds.push({
                x: rand(0, width),
                y: rand(40, groundY * 0.5),
                scale: rand(2.4, 4.6),
                depth: rand(0.05, 0.13),
                alpha: rand(0.14, 0.26),
            });
        }

        // Vauhtiviivat: nopeimmin liikkuva kerros, joka korostuu vauhdin kasvaessa.
        streaks = [];
        for (let i = 0; i < SPEED_LINES; i++) {
            streaks.push({
                x: rand(0, width),
                y: rand(groundY * 0.18, groundY - 14),
                len: rand(40, 130),
                depth: rand(1.55, 2.6),
                alpha: rand(0.10, 0.24),
            });
        }

        // Kaukana liikkuvat tähdet / roskat.
        stars = [];
        for (let i = 0; i < 26; i++) {
            stars.push({
                x: rand(0, width),
                y: rand(14, groundY * 0.55),
                size: rand(1, 2.5),
                depth: rand(0.012, 0.045),
                alpha: rand(0.15, 0.5),
            });
        }
    }

    /* ---------- Pelin kulku ---------- */

    function reset() {
        run.speed = START_SPEED;
        run.distance = 0;
        run.score = 0;
        run.shown = 0;
        run.time = 0;
        run.rank = 0;
        spawnCursor = 520;              // ensimmäinen este hetken päästä

        player.w = PLAYER_W;
        player.h = PLAYER_H;
        player.x = PLAYER_X;
        player.y = groundY - player.h;
        player.vy = 0;
        player.rot = 0;
        player.spin = 0;
        player.onGround = true;
        player.surface = groundY;
        player.prevBottom = groundY;
        player.prevHead = groundY - player.h;

        death.t = 0;
        death.type = 'crash';
        obstacles = [];
        coins = [];
        coinCount = 0;
        particles = [];
        hurry = false;
        coyote = COYOTE_TIME;
        jumpBuffer = 0;
        holdingJump = false;
        dustTimer = 0;
        accumulator = 0;
        fallLimit = height + PIT_DROP;

        // Maailma alkaa umpinaisella maalla; rotkoja alkaa tulla myöhemmin.
        solids = [];
        worldCursor = -40;
        addTerrain(width * 2.2, 'flat');

        hudScore = 0;
        scoreEl.textContent = '0';
        coinsEl.textContent = '0';
        startHint = 0;
        reached.platform = false;
        reached.high = false;
        reached.lowest = Infinity;
        if (overlayNote) overlayNote.hidden = true;
        // Ennatys naytetaan aina, myos ennen ensimmaista pelia.
        bestEl.textContent = bestScore;
        bestWrap.hidden = false;
        syncLevelUI();
    }

    // Aloitusruutu: ei pysäytä peliä, vain vaihtaa tilan.
    function startRun() {
        state = 'running';
        overlay.hidden = true;
        jumpBuffer = 0;
        startHint = START_HINT_TIME;    // näytetään hetki valittu hahmo
    }

    // Välitön uusi peli (R-näppäin tai nappi loppuruudussa).
    function restart() {
        reset();
        startRun();
    }

    // type: 'crash' = törmäys esteeseen, 'pit' = rotkoon putoaminen.
    function die(type) {
        if (state !== 'running') return;
        state = 'dying';
        death.t = 0;
        death.type = type === 'pit' ? 'pit' : 'crash';

        if (death.type === 'pit') {
            // Rotkoon pudotaan: hahmo jatkaa matkaa alas.
            player.spin = DEATH_SPIN * 0.5;
            player.vy = Math.max(player.vy, 120);
            Sound.fall();
        } else {
            // Törmäys: pieni pomppu ja hahmo jää makaamaan alustalleen.
            player.spin = -DEATH_SPIN * 0.6;
            player.vy = -520;
            burst(player.x + player.w / 2, player.y + player.h / 2, 16);
            Sound.death();
        }
    }

    function finishDeath() {
        state = 'over';
        player.rot = 0;
        // Törmäyksessä hahmo jää makaamaan maan pinnalle; rotkossa se on jo poissa.
        const support = supportAt(player.x, groundY);
        player.y = (death.type === 'pit' ? groundY : (support ? support.y : groundY)) - player.h;

        // Uusi ennätys = uusi level.
        const isRecord = run.score > bestScore;
        let levelUp = false;

        if (isRecord) {
            bestScore = run.score;
            if (level < MAX_LEVEL) {
                records++;
                level = levelFor(records);
                levelUp = true;
            }
            try {
                localStorage.setItem(BEST_KEY, String(bestScore));
                localStorage.setItem(LEVEL_KEY, String(level));
            } catch (err) {
                /* tallennus ei ole pakollinen */
            }
            bestEl.textContent = bestScore;
            bestWrap.hidden = false;
            syncLevelUI();
        }

        overlayTitle.textContent = isRecord && run.score > 0 ? 'Uusi ennätys!' : 'Peli loppui';
        overlayScore.textContent = 'Pisteet ' + run.score + '  ·  Kolikot ' + coinCount + '  ·  Ennätys ' + bestScore;

        // Puhelimella loppuruudun ohje kertoo napautuksesta, työpöydällä näppäimistä.
        if (overlayHint) {
            overlayHint.textContent = isSmallScreen()
                ? 'Napauta peliä tai paina nappia aloittaaksesi uuden pelin.'
                : 'Aloita uusi peli painamalla Enter, Space tai klikkaamalla';
        }

        if (overlayNote) {
            overlayNote.hidden = !levelUp;
            if (levelUp) {
                Sound.levelUp();
                overlayNote.textContent = level >= MAX_LEVEL
                    ? 'Level ' + MAX_LEVEL + ' – maksimi saavutettu!'
                    : 'Level ' + level + '!';
            }
        }

        overlay.hidden = false;
    }

    /* ---------- Päivitys ---------- */

    function updateRunning(dt) {
        run.time += dt;
        startHint = Math.max(0, startHint - dt);
        const distanceDelta = run.speed * dt;
        run.distance += distanceDelta;
        run.score = Math.floor(run.distance / STEP_LENGTH) + Math.floor(run.time * SCORE_PER_SECOND);

        // Nopeus kasvaa hitaasti: ajan mukana sekä pisteiden mukana.
        const baseSpeed = Math.min(MAX_SPEED, START_SPEED + SPEED_GAIN * run.time);
        run.speed = Math.max(run.speed, baseSpeed, speedFor(run.score));
        run.shown += (run.score - run.shown) * Math.min(1, SCORE_EASE * dt);

        const nextRank = rankFor(run.score);
        if (nextRank > run.rank) {
            run.rank = nextRank;
            burst(player.x + player.w / 2, player.y + player.h / 2, 10);
        }

        hurry = obstacleNear();

        // Hyppy: buffered syöte + coyote-aika.
        jumpBuffer = Math.max(0, jumpBuffer - dt);
        coyote = player.onGround ? COYOTE_TIME : Math.max(0, coyote - dt);
        if (jumpBuffer > 0 && coyote > 0) {
            player.vy = JUMP_VELOCITY;
            player.onGround = false;
            coyote = 0;
            jumpBuffer = 0;
            Sound.jump();
        }

        // Pystyliike kiinteällä askeleella: kerrosten läpi ei putoa.
        accumulator = Math.min(accumulator + dt, 0.25);
        while (accumulator >= FIXED_STEP) {
            const wasGrounded = player.onGround;
            stepVertical(FIXED_STEP);
            if (!wasGrounded && player.onGround) {
                // Laskeutuminen: pölähdys ja pehmeä ääni.
                burst(player.x + player.w / 2, player.y + player.h, 4);
                Sound.land();
            }
            accumulator -= FIXED_STEP;
        }

        // Askelpölyä vain kun hahmo juoksee alustalla.
        if (player.onGround) {
            dustTimer -= dt;
            if (dustTimer <= 0) {
                dustTimer = DUST_INTERVAL * rand(0.7, 1.3);
                spawnDust();
            }

            // Merkitään, että hahmo on seissyt kerroksella.
            if (player.surface < groundY - 20) {
                reached.platform = true;
                reached.lowest = Math.min(reached.lowest, player.surface);
                if (player.surface < LEVEL_H1 - 20) reached.high = true;
            }
        }

        // Vauhtiviivat kiihtyvat nopeuden mukana.
        for (let i = 0; i < streaks.length; i++) {
            const streak = streaks[i];
            streak.x -= run.speed * streak.depth * dt;
            if (streak.x + streak.len < -20) {
                streak.x = width + rand(20, 260);
                streak.y = rand(groundY * 0.18, groundY - 14);
                streak.len = rand(40, 130);
                streak.depth = rand(1.55, 2.6);
                streak.alpha = rand(0.10, 0.24);
            }
        }

        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            star.x -= run.speed * star.depth * dt;
            if (star.x < -6) {
                star.x = width + rand(0, 80);
                star.y = rand(14, groundY * 0.55);
                star.size = rand(1, 2.5);
            }
        }

        updateSolids(dt, distanceDelta);
        updateObstacles(dt);
        resolveCoinOverlaps();
        updateCoins(dt);
        updateParticles(dt);

        // Törmäys.
        for (let i = 0; i < obstacles.length; i++) {
            if (hits(obstacles[i])) {
                die('crash');
                break;
            }
        }

        // Rotkoon putoaminen: hahmo on vajonnut näkyvän alueen alle.
        if (state === 'running' && player.y > fallLimit) {
            die('pit');
        }

        // Maailma liikkuu oikealta vasemmalle.
        for (let i = 0; i < clouds.length; i++) {
            const cloud = clouds[i];
            cloud.x -= run.speed * cloud.depth * dt;
            if (cloud.x < -cloud.scale * CLOUD_ART[0].length - 40) {
                cloud.x = width + rand(20, 160);
                cloud.y = rand(40, groundY * 0.5);
                cloud.scale = rand(2.4, 4.6);
                cloud.depth = rand(0.05, 0.13);
            }
        }
    }

    // Maanpinnan korkeus: kaikkien maapalojen ylin pinta.
    function groundTypeLevel() {
        let level = groundY;
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind === 'platform') continue;
            if (solid.y < level) level = solid.y;
        }
        return level;
    }

    // Kuinka lähellä on hypättävä: 0 = heti, Infinity = ei tarvetta.
    // Lasketaan samalla logiikalla kuin testien autopilotti, jotta pelin
    // vaikeustaso on mitattavissa ja tarkistettavissa.
    function planJumpNeed(surfaceY, speed) {
        const feet = player.y + player.h;
        const gravity = GRAVITY;
        const jumpV = JUMP_VELOCITY;
        const flight = (2 * Math.abs(jumpV)) / gravity;
        const jumpDistance = speed * flight;
        const front = player.x + player.w;
        let need = Infinity;

        // 1. Este: hypättävä niin, että ollaan tarpeeksi korkealla sen kohdalla.
        for (let i = 0; i < obstacles.length; i++) {
            const box = obstacleBox(obstacles[i]);
            if (box.right < front) continue;
            const clearance = feet - box.top + 8;
            const disc = jumpV * jumpV - 2 * gravity * clearance;
            const t = disc > 0 ? (-jumpV - Math.sqrt(disc)) / gravity : 0;
            need = Math.min(need, box.left - front - speed * Math.max(0, t) - 12);
        }

        // 2. Jyrkänne: mihin asti alas voi laskeutua. Luetaan yhtenäinen
        // vyöhyke kulkemalla maanpaloja ja kerroksia eteenpäin: kerrokselle
        // voi pudota tai hypätä, joten se jatkaa reittiä.
        const edge = reachableEdge(front);
        if (Number.isFinite(edge)) {
            need = Math.min(need, edge - front - jumpDistance * 0.45);
        }

        // 3. Kerros, jolle voi hypätä.
        const platformY = typeof surfaceY === 'number' ? surfaceY : groundY;
        let nearest = Infinity;
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind !== 'platform') continue;
            if (solid.y >= platformY - 6) continue;
            if (solid.x + solid.w < front) continue;
            nearest = Math.min(nearest, solid.x - front);
        }
        if (Number.isFinite(nearest)) {
            need = Math.min(need, nearest - jumpDistance * 0.35);
        }

        return need;
    }

    // Kuinka pitkälle eteenpäin on yhtenäistä alustaa, jolle voi laskeutua?
    // Kerrokset lasketaan mukaan, jos niiden väli on hypättävissä.
    function reachableEdge(front) {
        const zone = [];
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind === 'pit') continue;
            if (solid.x + solid.w < front) continue;
            if (solid.x > front + 2400) continue;
            zone.push(solid);
        }
        if (!zone.length) return Infinity;

        const groundLevel = groundTypeLevel();
        let edge = 0;
        let changed = true;
        const used = new Set();

        // Aloitetaan pinnoista, jotka ovat hahmon alla tai sen tasolla.
        while (changed) {
            changed = false;
            for (let i = 0; i < zone.length; i++) {
                if (used.has(i)) continue;
                const solid = zone[i];
                const touches = solid.x <= front + 14 ||
                    (edge > 0 && solid.x <= edge + 180);
                if (!touches) continue;

                // Liian korkealle ei ylety.
                const minY = Math.min(groundLevel, player.y + player.h - 6);
                if (solid.y < minY - 150) {
                    if (edge === 0) continue;
                }

                used.add(i);
                edge = Math.max(edge, solid.x + solid.w);
                changed = true;
            }
        }

        return edge > 0 ? edge : Infinity;
    }

    // Sama kuin planJumpNeed mutta erittelee syyn (diagnostiikkaa varten).
    function planJumpDebug() {
        const surfaceY = player.surface;
        const speed = run.speed;
        const feet = player.y + player.h;
        const gravity = GRAVITY;
        const jumpV = JUMP_VELOCITY;
        const flight = (2 * Math.abs(jumpV)) / gravity;
        const jumpDistance = speed * flight;
        const front = player.x + player.w;
        const out = { obstacle: Infinity, edge: Infinity, platform: Infinity, front: Math.round(front), speed: Math.round(speed) };

        for (let i = 0; i < obstacles.length; i++) {
            const box = obstacleBox(obstacles[i]);
            if (box.right < front) continue;
            const clearance = feet - box.top + 8;
            const disc = jumpV * jumpV - 2 * gravity * clearance;
            const t = disc > 0 ? (-jumpV - Math.sqrt(disc)) / gravity : 0;
            out.obstacle = Math.min(out.obstacle, box.left - front - speed * Math.max(0, t) - 6);
        }

        if (typeof surfaceY === 'number' && surfaceY > 0) {
            const edge = reachableEdge(front);
            if (Number.isFinite(edge)) out.edge = edge - front - jumpDistance * 0.45;
        }

        const platformY = typeof surfaceY === 'number' ? surfaceY : groundY;
        let nearest = Infinity;
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind !== 'platform') continue;
            if (solid.y >= platformY - 6) continue;
            if (solid.x + solid.w < front) continue;
            nearest = Math.min(nearest, solid.x - front);
        }
        if (Number.isFinite(nearest)) out.platform = nearest - jumpDistance * 0.3;
        out.need = Math.min(out.obstacle, out.edge, out.platform);
        return out;
    }

    /* ---------- Maan palat ja kerrokset ---------- */
    function addSolid(kind, x, y, w, h) {
        solids.push({ kind: kind, x: x, y: y, w: w, h: h });
    }

    // Maanpinnan pala. kind: 'flat' | 'terrain' | 'pit'
    function addTerrain(len, kind) {
        addSolid(kind || 'terrain', worldCursor, groundY, len, PIT_DROP);
        worldCursor += len;
    }

    // Koholla oleva taso. Palauttaa tiedot, jotta päälle voi sijoittaa esteitä.
    function addPlatform(x, y, w) {
        addSolid('platform', x, y, w, PLATFORM_THICKNESS);
        return { x: x, y: y, w: w };
    }

    // Luo seuraavan pätkän maailmaa. Rotko on aina hypättävissä nykyisellä
    // nopeudella, joten peli pysyy läpäistävissä.
    //
    // HUOM: tämä funktio luo AINA täsmälleen yhden maanpalan ja palaa.
    // Kutsuja täyttää maailmaa silmukassa, kunnes sitä on tarpeeksi edessä.
    // Rotko sijoitetaan aina maapalan sisään, jolloin väliin ei synny
    // vahingossa liian leveää aukkoa.
    function generateWorldAhead() {
        // Hypyn kesto ja sitä vastaava vaakamatka.
        const airTime = (2 * Math.abs(JUMP_VELOCITY)) / GRAVITY;      // ~0.71 s
        const jumpDistance = run.speed * airTime;

        // Jyrkänteet: alussa ei lainkaan, sitten satunnaisesti. Leveys on
        // enintään 60 % hypyn pituudesta, joten yli ehtii aina.
        if (worldCursor > width * 1.6 && randomSource() < 0.45) {
            const before = rand(60, 140);
            const gap = clamp(jumpDistance * rand(0.3, 0.6), 70, 210);
            const after = rand(280, 460);

            addTerrain(before, 'terrain');
            const pitX = worldCursor;
            addTerrain(gap, 'pit');
            addTerrain(after, 'terrain');

            // Kerros heti rotkon jälkeen palkitsee hyvästä hypystä.
            if (randomSource() < 0.5) {
                addPlatform(pitX + gap + rand(60, 130), LEVEL_H1, rand(170, 250));
            }
            return;
        }

        addTerrain(rand(320, 580), 'terrain');

        // Kerros maanpinnan päälle. Se sijoitetaan aina maan kohdalle ja
        // sopivan matkan päähän edellisestä kerroksesta, jotta sinne voi
        // hypätä myös kerrokselta toiselle.
        const last = solids[solids.length - 2];
        const lastPlatform = last && last.kind === 'platform' ? last : null;
        if (worldCursor > width * 1.3 && randomSource() < 0.6) {
            const y = randomSource() < 0.45 ? LEVEL_H2 : LEVEL_H1;
            let x = worldCursor + rand(20, 70);
            if (lastPlatform && y < lastPlatform.y) {
                // Korkeampi kerros: väli mitoitetaan hypyn pituuden mukaan.
                // Liian lyhyellä välillä hahmo ei ehdi nousta tarpeeksi, liian
                // pitkällä hän ei yllä perille.
                const rise = lastPlatform.y - y;
                const v = Math.abs(JUMP_VELOCITY);
                const time = (v + Math.sqrt(Math.max(1, v * v - 2 * GRAVITY * rise))) / GRAVITY;
                const flight = run.speed * time + player.w;
                const edge = lastPlatform.x + lastPlatform.w;
                const minGap = Math.round(flight * 0.8) + 20;
                const maxGap = Math.round(flight * 1.1) + 30;
                x = edge + clamp(x - edge, minGap, maxGap);
            }
            addPlatform(x, y, rand(170, 260));
        }
    }

    // Siirtää maata ja kerroksia sekä luo uutta eteen. Samalla syntyvät
    // esteet ja kolikot: ne sijoitetaan maan tai kerroksen päälle, joten
    // rotkon kohdalle ei koskaan tule estettä.
    // Kerros ei koskaan saa peittää rotkoa: muuten hahmo kävelisi kerrosta
    // pitkin rotkon yli eikä putoaisi. Poistetaan päällekkäiset kerrokset
    // heti syntymisen jälkeen.
    function removePlatformsOverPits() {
        for (let i = solids.length - 1; i >= 0; i--) {
            const platform = solids[i];
            if (platform.kind !== 'platform') continue;
            for (let j = 0; j < solids.length; j++) {
                const pit = solids[j];
                if (pit.kind !== 'pit') continue;
                if (platform.x < pit.x + pit.w && platform.x + platform.w > pit.x) {
                    solids.splice(i, 1);
                    break;
                }
            }
        }
    }

    function updateSolids(dt, distanceDelta) {
        for (let i = solids.length - 1; i >= 0; i--) {
            const solid = solids[i];
            solid.x -= distanceDelta;
            if (solid.x + solid.w < -80) solids.splice(i, 1);
        }

        // Maailmankoordinaatistoa siirretään samalla, jotta syntyvät palat
        // osuvat saumatta edellisten jatkoksi.
        worldCursor -= distanceDelta;
        spawnCursor -= distanceDelta;

        // Täytetään maailmaa, kunnes sitä on tarpeeksi edessä.
        let guard = 0;
        while (worldCursor - run.distance < width * 2 && guard++ < 40) {
            const before = worldCursor;
            generateWorldAhead();
            if (worldCursor === before) break;      // varmistus silmukalle
        }

        // Siivotaan kerrokset, jotka osuisivat rotkon päälle.
        removePlatformsOverPits();

        // Syntyvät esteet ja kolikot
        const spacing = 300 + run.speed * 0.42;
        if (spawnCursor <= 0) {
            spawnCursor = spacing + rand(-60, 140);
            spawnChunk(width + 60);
        }
    }

    // Sijoittaa esteen ja/tai kolikoita annetun x-kohdan kohdalle.
    function spawnChunk(x) {
        const support = surfaceAt(x);
        if (!support) return;                       // rotkon kohdalla ei ole estettä

        const onPlatform = support.kind === 'platform';
        const roll = randomSource();

        if (!onPlatform && roll < 0.55) {
            spawnObstacle(support.y);
            if (roll < 0.12) spawnCoins(support.y, 'ground');    // esteen taakse jää kolikoita
        } else if (onPlatform) {
            // Kerroksella on usein kolikoita, jotta sinne kannattaa hypätä.
            spawnCoins(support.y, 'row');
            if (roll < 0.3) spawnObstacle(support.y);
        } else if (roll < 0.85) {
            spawnCoins(groundY, 'row');
        }
    }

    // Onko annetun x-kohdan kohdalla maata tai kerrosta, ja mikä on sen pinta?
    function surfaceAt(x) {
        let best = null;
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (x < solid.x || x > solid.x + solid.w) continue;
            if (!best || solid.y < best.y) best = solid;
        }
        return best;
    }

    // Onko hahmon kohdalla maata tai tasoa, jonka päällä voi seisoa?
    // Rotko ei kelpaa alustaksi.
    function supportAt(x, y) {
        const px = x + 14;                          // hahmon keskikohta
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind === 'pit') continue;
            if (px < solid.x || px > solid.x + solid.w) continue;
            if (solid.y >= y - 1 && solid.y < y + 26) return solid;
        }
        return null;
    }

    // Lasketaan pystysuuntainen liike yhdellä kiinteällä askeleella.
    function stepVertical(dt) {
        player.prevBottom = player.y + player.h;

        let gravity = GRAVITY;
        if (!holdingJump && player.vy < 0) gravity += FAST_FALL * 0.35;
        player.vy += gravity * dt;
        player.y += player.vy * dt;

        const bottom = player.y + player.h;
        const head = player.y;

        // Nousu pysähtyy kerroksen alapintaan: alapuolelta ei voi hypätä läpi.
        if (player.vy < 0) {
            for (let i = 0; i < solids.length; i++) {
                const solid = solids[i];
                if (solid.kind !== 'platform') continue;
                const underside = solid.y + solid.h;
                if (head > underside) continue;                             // yläpuolella
                if (player.prevHead < underside - 2) continue;              // oltiin jo yläpuolella
                if (player.x + player.w < solid.x || player.x > solid.x + solid.w) continue;

                player.y = underside;
                player.vy = 0;
                break;
            }
        }

        // Laskeudutaan alustalle vain alaspäin tultaessa. Rotko EI ole alusta:
        // sen kohdalla hahmo putoaa.
        if (player.vy >= 0) {
            for (let i = 0; i < solids.length; i++) {
                const solid = solids[i];
                if (solid.kind === 'pit') continue;                 // rotkon yli pudotaan
                if (bottom < solid.y) continue;
                if (player.x + player.w < solid.x || player.x > solid.x + solid.w) continue;
                if (player.prevBottom > solid.y + 2) continue;      // oltiin jo alapuolella

                player.y = solid.y - player.h;
                player.vy = 0;
                player.onGround = true;
                player.surface = solid.y;
                return;
            }
        }

        // Seisotaan edelleen saman alustan päällä?
        const support = supportAt(player.x, player.y + player.h);
        if (support && Math.abs(player.y + player.h - support.y) <= 2 && player.vy >= 0) {
            player.y = support.y - player.h;
            player.vy = 0;
            player.onGround = true;
            player.surface = support.y;
            return;
        }

        player.onGround = false;
        player.prevHead = player.y;
    }

    /* ---------- Esteet ---------- */

    function spawnObstacle(surfaceY) {
        // Alussa syntyy vain pienia esteita; isoja alkaa tulla matkan kasvaessa.
        const maxIndex = Math.min(OBSTACLE_TYPES.length - 1, Math.floor(run.distance / 1100) + 2);
        const type = OBSTACLE_TYPES[Math.floor(randomSource() * (maxIndex + 1))];
        const base = typeof surfaceY === 'number' ? surfaceY : groundY;

        obstacles.push({
            x: width + 24,
            w: type.w,
            h: type.h,
            y: base - type.h,
            style: type.style,
            size: type.size,
            seed: randomSource() * 1000,
        });
    }

    // Pieni pölypilvi hahmon jaloissa, sen alustan pinnalla jolla se seisoo.
    function spawnDust() {
        const intensity = clamp((run.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1);
        const count = 1 + Math.round(intensity * 2);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: player.x + rand(0, player.w * 0.7),
                y: player.surface - rand(0, 3),
                vx: -run.speed * rand(0.08, 0.2),
                vy: rand(-46, -8),
                life: rand(0.2, 0.45),
                max: 0.45,
                size: rand(1.5, 3.5),
                dust: true,
            });
        }
    }

    /* ---------- Kolikot ---------- */

    // Onko kolikko auton sisällä tai niin lahella, etta se osuisi siihen?
    // Käytetään samaa törmäyslaatikkoa kuin pelaajalle.
    function overlapsObstacle(cx, cy, radiusX, radiusY) {
        const margin = 4;
        for (let i = 0; i < obstacles.length; i++) {
            const box = obstacleBox(obstacles[i]);
            if (cx + radiusX + margin > box.left &&
                cx - radiusX - margin < box.right &&
                cy + radiusY + margin > box.top &&
                cy - radiusY - margin < box.bottom) {
                return true;
            }
        }
        return false;
    }

    // Kolikoita syntyy maan tai kerroksen päälle, esteiden väliin.
    // surfaceY = pinnan korkeus, mode: 'row' = rivi pinnalle, 'ground' = esteen taakse.
    function spawnCoins(surfaceY, mode) {
        const base = typeof surfaceY === 'number' ? surfaceY : groundY;
        const count = 2 + Math.floor(randomSource() * 3);   // 2-4 kolikkoa
        const radiusX = COIN_W / 2 - 2;                  // törmäyslaatikon puolileveys
        const radiusY = COIN_H / 2 - 2;

        if (mode === 'ground') {
            // Matala rivi esteen taakse: palkitsee juoksemisesta.
            const startX = width + 150;
            const step = COIN_W + 22;
            const coinY = base - COIN_H - 12;
            for (let i = 0; i < count; i++) {
                const x = startX + i * step;
                if (overlapsObstacle(x + radiusX, coinY + radiusY, radiusX, radiusY)) continue;
                coins.push(makeCoin(x, coinY, 0, 0));
            }
            return;
        }

        // Rivi pinnalle: kerroksella tämä houkuttelee hyppäämään ylös.
        const step = COIN_W + 20;
        const height = base - COIN_H - rand(10, 26);
        const startX = width - run.speed * 0.2 + rand(0, 40);
        for (let i = 0; i < count; i++) {
            const x = startX + i * step;
            if (overlapsObstacle(x + radiusX, height + radiusY, radiusX, radiusY)) continue;
            coins.push(makeCoin(x, height, 0, 0));
        }
    }

    function makeCoin(x, y, delay, peak) {
        return {
            x: x,
            y: y,
            baseY: y,
            vy: 0,
            delay: delay || 0,
            peak: peak || 0,
            bob: rand(0, Math.PI * 2),
            spin: rand(0, Math.PI * 2),
            collected: 0,
        };
    }

    // Esteet voivat siirtyä oikealle välin kasvattamiseksi, jolloin ne voivat
    // liukua jo syntyneen kolikon päälle. Siirretään kolikko turvaan silloin kun
    // se on vielä ruudun ulkopuolella; muuten se poistetaan.
    function resolveCoinOverlaps() {
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            if (coin.collected > 0) continue;

            const radiusX = COIN_W / 2 - 3;
            const radiusY = COIN_H / 2 - 3;
            const cx = coin.x + COIN_W / 2;
            const cy = coin.y + COIN_H / 2;

            for (let j = 0; j < obstacles.length; j++) {
                const box = obstacleBox(obstacles[j]);
                if (cx + radiusX <= box.left || cx - radiusX >= box.right ||
                    cy + radiusY <= box.top || cy - radiusY >= box.bottom) {
                    continue;
                }

                // Auto, jonka jälkeen kolikko voi jatkaa.
                let limit = Infinity;
                for (let k = 0; k < obstacles.length; k++) {
                    const other = obstacles[k];
                    if (other.x > box.right && other.x < limit) limit = other.x;
                }

                const target = box.right + radiusX + 6;
                if (coin.x > width + 10 && target + COIN_W + 10 < limit - 10) {
                    coin.x = target;               // siirretään auton taakse
                } else {
                    coins.splice(i, 1);            // ei mahdu -> jätetään väliin
                }
                break;
            }
        }
    }

    function updateCoins(dt) {
        coinSpin += dt;

        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];

            // Kaarella oleva kolikko odottaa omaa lahtoaan.
            if (coin.delay > 0) {
                coin.delay -= dt;
                if (coin.delay > 0) {
                    coin.x -= run.speed * dt;
                    continue;
                }
                coin.vy = COIN_JUMP_VELOCITY;   // lahtee nousuun
            }

            if (coin.collected > 0) {
                // Keräysvälähdys: kolikko katoaa nopeasti.
                coin.collected -= dt;
                if (coin.collected <= 0) coins.splice(i, 1);
                continue;
            }

            coin.x -= run.speed * dt;

            // Kaarelle asetettu kolikko nousee ja laskeutuu maan tasoon.
            if (coin.peak > 0) {
                coin.vy += COIN_GRAVITY * dt;
                coin.y += coin.vy * dt;
                const floor = groundY - COIN_H - 8;
                if (coin.y >= floor) {
                    coin.y = floor;
                    coin.vy = 0;
                    coin.peak = 0;
                }
            }

            if (coin.x + COIN_W < -20) {
                coins.splice(i, 1);
                continue;
            }

            // Keräys: törmäyslaatikko on grafiikkaa pienempi.
            const overlapX = player.x < coin.x + COIN_W - COIN_PAD && player.x + player.w > coin.x + COIN_PAD;
            const overlapY = player.y < coin.y + COIN_H - COIN_PAD && player.y + player.h > coin.y + COIN_PAD;
            if (overlapX && overlapY) collectCoin(coin);
        }
    }

    function collectCoin(coin) {
        coinCount++;
        coin.collected = 0.28;                  // välähdys ennen katoamista
        coinsEl.textContent = String(coinCount);
        Sound.coin();

        // Kipinäpisteet kolikon kohdalle.
        for (let i = 0; i < 7; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(40, 150);
            particles.push({
                x: coin.x + COIN_W / 2,
                y: coin.y + COIN_H / 2,
                vx: Math.cos(angle) * speed - run.speed * 0.2,
                vy: Math.sin(angle) * speed - 40,
                life: rand(0.2, 0.42),
                max: 0.42,
                size: rand(1.5, 3),
                coin: true,
            });
        }
    }

    function updateObstacles(dt) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            obstacle.x -= run.speed * dt;
            if (obstacle.x + obstacle.w < -40) {
                obstacles.splice(i, 1);
            }
        }

        // Peräkkäiset autot eivät saa sulautua yhteen hyppäämättömäksi ruuhkaksi.
        for (let i = 0; i < obstacles.length - 1; i++) {
            const current = obstacles[i];
            const next = obstacles[i + 1];
            const minGap = player.w + 88;
            if (current.x + current.w + minGap > next.x) {
                next.x = current.x + current.w + minGap;
            }
        }

        // Liian korkea hyppy-yhdistelmä korjataan kasvattamalla väliä.
        for (let i = 0; i < obstacles.length - 1; i++) {
            const current = obstacles[i];
            const next = obstacles[i + 1];
            const gap = next.x - (current.x + current.w);
            const need = Math.round((run.speed * run.speed) / (2 * Math.abs(JUMP_VELOCITY)) - 130);
            if (current.h + next.h > 132 && gap < need) {
                next.x = current.x + current.w + need;
            }
        }
    }

    function burst(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(40, 240);
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed - run.speed * 0.25,
                vy: Math.sin(angle) * speed - 60,
                life: rand(0.25, 0.6),
                max: 0.6,
                size: rand(2, 5),
            });
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.life -= dt;
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            // Pöly leijuu kevyesti, sirpaleet putoavat.
            particle.vy += (particle.dust ? 40 : 900) * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
        }
    }

    function updateDying(dt) {
        death.t += dt;
        player.spin += DEATH_SPIN * dt * 0.5;
        player.rot += player.spin * dt * 2.2;
        player.vy += DEATH_GRAVITY * dt;
        player.y += player.vy * dt;

        if (death.type === 'pit') {
            // Rotkossa hahmo jatkaa putoamistaan, kunnes peli päättyy.
            if (death.t >= DEATH_TIME * 0.8) finishDeath();
        } else {
            const rest = player.surface;
            if (player.y >= rest - player.h) {
                player.y = rest - player.h;
                player.vy = 0;
                player.spin = 0;
                player.rot = -0.45;
            }
        }

        updateParticles(dt);
        if (death.type !== 'pit' && death.t >= DEATH_TIME) finishDeath();
    }

    /* ---------- Piirto ---------- */

    /* ---------- Luontomaisema ----------
       Iltataivas, aurinko horisontissa, vuoret, metsän reuna ja ruohoinen
       maa. Kerrokset liikkuvat eri nopeuksilla, mikä synnyttää syvyyden. */

    // Piirtää metsän reunan: yhtenäinen metsä, jonka yläreunassa on puiden latvoja.
    function drawForest(baseY, canopyHeight, parallax, offset, color) {
        const span = 46;
        const shift = -((run.distance * parallax + offset) % span);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(shift - span, baseY);

        let index = 0;
        for (let x = shift - span; x < width + span; x += span) {
            // Jokaisen puun korkeus vaihtelee saumattomasti siniaallolla.
            const wobble = Math.sin((index + offset) * 1.7) * 0.5 + Math.sin((index + offset) * 0.6) * 0.5;
            const top = baseY - canopyHeight * (0.55 + 0.45 * wobble);
            ctx.quadraticCurveTo(x + span * 0.5, top - canopyHeight * 0.25, x + span, baseY - canopyHeight * 0.35);
            index++;
        }

        ctx.lineTo(width + span, baseY);
        ctx.lineTo(width + span, height);
        ctx.lineTo(shift - span, height);
        ctx.closePath();
        ctx.fill();
    }

    // Vuorijono: teräväpiirteinen siluetti.
    function drawMountains(baseY, peakHeight, parallax, offset, color) {
        const span = 300;
        const shift = -((run.distance * parallax + offset) % span);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(shift - span, baseY);

        let index = 0;
        for (let x = shift - span; x < width + span; x += span) {
            const wobble = Math.sin((index + offset) * 1.3) * 0.5 + Math.cos((index + offset) * 0.7) * 0.5;
            const peak = baseY - peakHeight * (0.5 + 0.5 * wobble);
            ctx.lineTo(x + span * 0.35, peak);
            ctx.lineTo(x + span * 0.55, peak + peakHeight * 0.22);
            ctx.lineTo(x + span * 0.75, peak + peakHeight * 0.5);
            ctx.lineTo(x + span, baseY);
            index++;
        }

        ctx.lineTo(width + span, baseY);
        ctx.lineTo(width + span, height);
        ctx.lineTo(shift - span, height);
        ctx.closePath();
        ctx.fill();
    }

    function drawBackground() {
        // Iltataivas: kylmä ylhäällä, lämmin horisontissa.
        const sky = ctx.createLinearGradient(0, 0, 0, groundY);
        sky.addColorStop(0, C.skyTop);
        sky.addColorStop(0.45, C.skyMid);
        sky.addColorStop(0.78, C.skyLow);
        sky.addColorStop(0.94, C.skyHorizon);
        sky.addColorStop(1, C.skyWarm);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, groundY);

        // Aurinko laskee horisonttiin ja hehkuu sen yllä.
        const sunX = width * 0.72;
        const sunY = groundY * 0.62;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, groundY * 0.9);
        sunGlow.addColorStop(0, C.sunGlow);
        sunGlow.addColorStop(0.35, 'rgba(255, 200, 140, 0.16)');
        sunGlow.addColorStop(1, 'rgba(255, 200, 140, 0)');
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, width, groundY);

        ctx.fillStyle = C.sun;
        ctx.beginPath();
        ctx.arc(sunX, sunY, Math.max(16, groundY * 0.11), 0, Math.PI * 2);
        ctx.fill();

        // Taivaan kirkkaat tähdet (näkyvät vain ylhäällä).
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const fade = 1 - clamp(star.y / (groundY * 0.7), 0, 1);
            if (fade <= 0.05) continue;
            ctx.globalAlpha = star.alpha * fade * 0.8;
            ctx.fillStyle = C.star;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        ctx.globalAlpha = 1;

        // Vuoret kauimpana.
        drawMountains(groundY + 2, 120, 0.008, 0, C.mountainFar);
        drawMountains(groundY + 2, 86, 0.018, 45, C.mountainMid);

        // Metsän reunat kolmena kerroksena.
        drawForest(groundY + 2, 74, 0.03, 0, C.forestFar);
        drawForest(groundY + 2, 54, 0.06, 8, C.forestMid);
        drawForest(groundY + 2, 36, 0.11, 16, C.forestNear);

        // Vauhtiviivat: voimistuvat kun nopeus kasvaa.
        const rush = clamp((run.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1);
        ctx.strokeStyle = C.streak;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < streaks.length; i++) {
            const streak = streaks[i];
            ctx.globalAlpha = streak.alpha * (0.35 + 0.65 * rush) * 0.7;
            ctx.beginPath();
            ctx.moveTo(streak.x, streak.y);
            ctx.lineTo(streak.x + streak.len, streak.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Pilvet auringonlaskun väreissä.
        for (let i = 0; i < clouds.length; i++) {
            const cloud = clouds[i];
            ctx.globalAlpha = cloud.alpha * 0.9;
            drawBitmap(CLOUD_ART, cloud.x, cloud.y, cloud.scale, C.cloud, C.cloudShade);
            ctx.globalAlpha = 1;
        }
    }

    /* ---------- Maanpalojen ja kerrosten piirto ---------- */

    // Ruohotupsut pinnan päälle. Sama kuvio toistuu maailman mukana.
    function drawGrassTufts(x, y, w, density, color) {
        const step = Math.max(9, density);
        const shift = -((run.distance + x) % step);
        ctx.fillStyle = color;
        for (let gx = shift - step; gx < w + step; gx += step) {
            const px = x + gx;
            if (px < x - 2 || px > x + w + 2) continue;
            // Kolme pientä kortta, korkeus vaihtelee sijainnin mukaan.
            const h = 3 + ((Math.sin((px + run.distance) * 0.35) + 1) * 1.6);
            ctx.fillRect(px, y - h, 1.4, h);
            ctx.fillRect(px + 2.4, y - h * 0.75, 1.4, h * 0.75);
            ctx.fillRect(px + 4.6, y - h * 0.9, 1.4, h * 0.9);
        }
    }

    // Pinnan yläreunan kiiltoreuna ja tumma varjo sen alla.
    function drawSurfaceEdge(x, y, w, highlight) {
        ctx.fillStyle = highlight || C.groundEdgeStrong;
        ctx.fillRect(x, y - 1, w, 2);
        const fade = ctx.createLinearGradient(0, y + 1, 0, y + 16);
        fade.addColorStop(0, 'rgba(0, 0, 0, 0.40)');
        fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fade;
        ctx.fillRect(x, y + 1, w, 15);
    }

    // Maanpinnan pala: ruohokaista, multa ja rotkon reuna.
    function drawTerrainSegment(solid) {
        const top = solid.y;
        const bottom = Math.min(height + PIT_DROP, top + solid.h);
        const body = ctx.createLinearGradient(0, top, 0, bottom);
        body.addColorStop(0, C.groundTop);
        body.addColorStop(0.35, C.groundMid);
        body.addColorStop(1, C.groundLow);
        ctx.fillStyle = body;
        ctx.fillRect(solid.x, top, solid.w, bottom - top);

        // Paksu ruohokaista pinnan alla.
        const turf = ctx.createLinearGradient(0, top, 0, top + 12);
        turf.addColorStop(0, C.grass);
        turf.addColorStop(1, 'rgba(47, 107, 65, 0)');
        ctx.fillStyle = turf;
        ctx.fillRect(solid.x, top, solid.w, 12);

        // Maa-aineksen rakeisuus: pienet kivet ja juovat.
        ctx.save();
        ctx.beginPath();
        ctx.rect(solid.x, top + 6, solid.w, Math.min(30, solid.h - 6));
        ctx.clip();
        ctx.fillStyle = C.pebble;
        for (let sx = solid.x - ((run.distance * 0.6) % 34); sx < solid.x + solid.w; sx += 34) {
            const jitter = Math.sin(sx * 0.7) * 8;
            ctx.globalAlpha = 0.18;
            ctx.fillRect(sx + jitter, top + 14, 5, 3);
            ctx.fillRect(sx + jitter + 13, top + 22, 7, 3);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        drawSurfaceEdge(solid.x, top, solid.w, C.groundEdgeStrong);
        drawGrassTufts(solid.x, top, solid.w, 13, C.grassDark);

        // Rotkon reuna: tumma pystysuora varjo palan päissä.
        const edge = 16;
        const left = ctx.createLinearGradient(solid.x, 0, solid.x + edge, 0);
        left.addColorStop(0, 'rgba(8, 14, 10, 0.6)');
        left.addColorStop(1, 'rgba(8, 14, 10, 0)');
        ctx.fillStyle = left;
        ctx.fillRect(solid.x, top, edge, bottom - top);

        const right = ctx.createLinearGradient(solid.x + solid.w - edge, 0, solid.x + solid.w, 0);
        right.addColorStop(0, 'rgba(8, 14, 10, 0)');
        right.addColorStop(1, 'rgba(8, 14, 10, 0.6)');
        ctx.fillStyle = right;
        ctx.fillRect(solid.x + solid.w - edge, top, edge, bottom - top);
    }

    // Koholla oleva kerros: ruohokansi ja multainen kylki.
    function drawPlatform(solid) {
        const body = ctx.createLinearGradient(0, solid.y, 0, solid.y + solid.h);
        body.addColorStop(0, C.platformTop);
        body.addColorStop(0.4, C.platformLow);
        body.addColorStop(1, C.groundLow);
        roundRect(solid.x, solid.y, solid.w, solid.h, 5);
        ctx.fillStyle = body;
        ctx.fill();

        ctx.strokeStyle = C.platformEdge;
        ctx.lineWidth = 1.5;
        roundRect(solid.x + 0.75, solid.y + 0.75, solid.w - 1.5, solid.h - 1.5, 5);
        ctx.stroke();

        drawSurfaceEdge(solid.x + 2, solid.y, solid.w - 4, C.platformHighlight);
        drawGrassTufts(solid.x + 4, solid.y, solid.w - 8, 15, C.grassDark);
    }

    function drawWorld() {
        // Rotkon pohja: tumma multakuoppa, joka näkyy maanpalojen välissä.
        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind !== 'pit') continue;
            const depth = ctx.createLinearGradient(0, solid.y, 0, height);
            depth.addColorStop(0, C.pitEarth);
            depth.addColorStop(0.5, C.pitVoid);
            depth.addColorStop(1, C.pitVoid);
            ctx.fillStyle = depth;
            ctx.fillRect(solid.x, solid.y, solid.w, height - solid.y);

            // Rotkon reunat: multaa ja juuria.
            ctx.fillStyle = 'rgba(20, 14, 10, 0.85)';
            ctx.fillRect(solid.x, solid.y, 4, height - solid.y);
            ctx.fillRect(solid.x + solid.w - 4, solid.y, 4, height - solid.y);
        }

        for (let i = 0; i < solids.length; i++) {
            const solid = solids[i];
            if (solid.kind === 'platform') drawPlatform(solid);
            else if (solid.kind !== 'pit') drawTerrainSegment(solid);
        }
    }

    function drawObstacle(obstacle) {
        // Varjo esteen alla: este seisoo joko maassa tai kerroksella.
        const baseY = obstacle.y + obstacle.h;
        ctx.save();
        ctx.fillStyle = C.shadow;
        ctx.beginPath();
        ctx.ellipse(obstacle.x + obstacle.w / 2, baseY + 4, obstacle.w * 0.55, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (obstacle.style === 'crate') {
            roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 5);
            ctx.fillStyle = C.obstacleB;
            ctx.fill();
            ctx.strokeStyle = C.obstacleInk;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 6, obstacle.y + 6);
            ctx.lineTo(obstacle.x + obstacle.w - 6, obstacle.y + obstacle.h - 6);
            ctx.moveTo(obstacle.x + obstacle.w - 6, obstacle.y + 6);
            ctx.lineTo(obstacle.x + 6, obstacle.y + obstacle.h - 6);
            ctx.stroke();
        } else {
            roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 4);
            ctx.fillStyle = C.obstacleA;
            ctx.fill();
            ctx.fillStyle = C.obstacleShine;
            ctx.fillRect(obstacle.x + obstacle.w * 0.62, obstacle.y + 8, 3, obstacle.h - 18);
        }

        ctx.fillStyle = C.obstacleShine;
        ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.w - 8, 3);
    }

    function drawPlayer() {
        const dead = state === 'dying' || state === 'over';
        const speedRatio = clamp((run.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1);

        if (player.onGround && !dead) {
            ctx.save();
            ctx.fillStyle = C.playerShadow;
            ctx.beginPath();
            ctx.ellipse(player.x + player.w / 2, groundY + 3, player.w * 0.7, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Pöly sijaitsee maan päällä, joten se piirretään ennen hahmoa.
        drawParticles();

        // Juoksusykli: kaksi askelta yhtä jalkaparia kohti.
        const cadence = 13 + speedRatio * 9;
        const phase = run.time * cadence;
        const lift = player.onGround && !dead ? 1.4 + speedRatio * 1.8 : 0;
        const bob = Math.abs(Math.sin(phase)) * lift;
        const lean = player.onGround && !dead ? START_LEAN + speedRatio * 0.05 : 0;

        ctx.save();
        ctx.translate(player.x + player.w / 2, player.y + player.h / 2 - bob);
        ctx.rotate(player.rot + lean);

        if (state === 'dying') ctx.globalAlpha = 0.85;

        const originX = -player.w / 2;
        const originY = -player.h / 2;

        ctx.fillStyle = C.shadow;
        ctx.fillRect(originX + 3, originY + 4, player.w, player.h);

        // Piirtolaatta: reunaviiva varmistaa, että vaalea hahmo (Ritari) erottuu.
        drawBitmap(CHARACTERS[selected].art, originX, originY, PLAYER_PIXEL, bodyColor, accentColor);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = luminance(bodyColor) > 0.62 ? 'rgba(10, 14, 22, 0.5)' : 'rgba(255, 255, 255, 0.16)';
        ctx.strokeRect(originX + 0.75, originY + 0.75, player.w - 1.5, player.h - 1.5);

        // Jalat: maassa vuorotellen eteen ja taakse, ilmassa koukkuun.
        // Tummempi savy erottaa ne vartalosta myos huonolla kontrastilla.
        ctx.fillStyle = legColor;
        const footY = originY + player.h - 1;
        if (dead) {
            ctx.fillRect(originX + 2, footY, 8, 5);
            ctx.fillRect(originX + player.w - 10, footY, 8, 5);
        } else if (player.onGround) {
            const swing = Math.sin(phase) * 4.5;
            const liftFront = Math.max(0, Math.sin(phase + Math.PI / 2)) * 3;
            const liftBack = Math.max(0, Math.sin(phase - Math.PI / 2)) * 3;
            ctx.fillRect(originX + 1 + swing, footY + liftFront, 8, 7);
            ctx.fillRect(originX + player.w - 9 - swing, footY + liftBack, 8, 7);
            // Kengot erottuvat selvemmin.
            ctx.fillStyle = 'rgba(9, 12, 19, 0.75)';
            ctx.fillRect(originX + 1 + swing, footY + 5 + liftFront, 8, 2);
            ctx.fillRect(originX + player.w - 9 - swing, footY + 5 + liftBack, 8, 2);
        } else {
            ctx.fillRect(originX, footY - 3, 9, 6);
            ctx.fillRect(originX + player.w - 9, footY - 6, 9, 6);
        }

        // Vauhtiviivat nopeuden kasvaessa.
        if (run.speed > START_SPEED + 60 && !dead) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const offsetY = originY + 8 + i * 12;
                const length = 12 + speedRatio * 22;
                ctx.moveTo(originX - 8, offsetY);
                ctx.lineTo(originX - 8 - length, offsetY);
            }
            ctx.stroke();
        }

        ctx.restore();

        if (hurry && state === 'running') {
            const blink = 0.5 + 0.5 * Math.sin(run.time * 12);
            ctx.globalAlpha = 0.55 + 0.45 * blink;
            ctx.fillStyle = C.warn;
            ctx.font = LABEL_FONT;
            ctx.textAlign = 'center';
            ctx.fillText('Vauhtia!', player.x + player.w / 2, player.y - 34);
            ctx.globalAlpha = 1;
            ctx.fillStyle = C.warn;
            ctx.fillRect(player.x + player.w / 2 - 1, player.y - 28, 2, 12);
            ctx.beginPath();
            ctx.moveTo(player.x + player.w / 2 - 5, player.y - 17);
            ctx.lineTo(player.x + player.w / 2 + 5, player.y - 17);
            ctx.lineTo(player.x + player.w / 2, player.y - 10);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            ctx.globalAlpha = clamp(particle.life / particle.max, 0, 1) * 0.85;
            if (particle.dust) ctx.fillStyle = C.dust;
            else if (particle.coin) ctx.fillStyle = C.coinSpark;
            else ctx.fillStyle = state === 'running' ? C.debris : C.debrisDead;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
        ctx.globalAlpha = 1;
    }

    // Kolikko: pyörii pystyakselinsa ympäri (leveys skaalautuu).
    function drawCoins() {
        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            const collecting = coin.collected > 0;
            const cx = coin.x + COIN_W / 2;

            if (collecting) {
                // Keräysvälähdys: vaalea kehä joka kutistuu pois.
                const t = clamp(coin.collected / 0.28, 0, 1);
                ctx.globalAlpha = t * 0.9;
                ctx.strokeStyle = C.coinSpark;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, coin.y + COIN_H / 2, COIN_W * (0.6 + (1 - t) * 0.9), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                continue;
            }

            // Pyörähdys: leveys vaihtelee, jolloin syntyy mielikuva kiertymisestä.
            const phase = coin.spin + coinSpin * 3.4;
            const spin = Math.abs(Math.cos(phase));
            const bob = Math.sin(coinSpin * 2.6 + coin.bob) * 2;
            const top = coin.y + bob;

            // Hehku kolikon takana
            ctx.globalAlpha = 0.16 + 0.12 * spin;
            ctx.fillStyle = C.coinBody;
            roundRect(cx - COIN_W * 0.72, top - 3, COIN_W * 1.44, COIN_H + 6, 8);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Tumma reunus erottaa kolikon taustasta
            ctx.fillStyle = C.coinEdge;
            roundRect(cx - (COIN_W * spin) / 2 - 1.5, top - 1.5, COIN_W * spin + 3, COIN_H + 3, 5);
            ctx.fill();

            // Itse kolikko litistyy pyörähdyksen mukana
            ctx.save();
            ctx.translate(cx, top + COIN_H / 2);
            ctx.scale(Math.max(0.14, spin), 1);
            drawBitmap(COIN_ART, -COIN_W / 2, -COIN_H / 2, COIN_PIXEL, C.coinBody, C.coinFace);
            ctx.restore();

            // Ohut kirkas reuna, kun kolikko on laakeimmillaan
            if (spin < 0.28) {
                ctx.globalAlpha = (0.28 - spin) / 0.28;
                ctx.fillStyle = C.coinFace;
                ctx.fillRect(cx - 1.5, top + 2, 3, COIN_H - 4);
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawHud() {
        // Pistenäyttö liukuu pehmeästi kohti todellista arvoa.
        if (run.shown < 0.5) {
            hudScore = run.score;
        } else {
            hudScore += (run.score - hudScore) * 0.18;
        }
        scoreEl.textContent = String(Math.round(hudScore));

        if (state === 'running') {
            const progress = clamp((run.speed - START_SPEED) / (MAX_SPEED - START_SPEED), 0, 1);
            const barWidth = Math.min(220, width * 0.26);
            const barY = groundY - 28;

            ctx.fillStyle = C.textDim;
            ctx.font = LABEL_FONT;
            ctx.textAlign = 'right';
            ctx.fillText('NOPEUS', width - 24, barY - 6);

            ctx.fillStyle = C.barTrack;
            roundRect(width - 24 - barWidth, barY, barWidth, 5, 3);
            ctx.fill();

            if (progress > 0.002) {
                ctx.fillStyle = C.barFill;
                roundRect(width - 24 - barWidth, barY, Math.max(4, barWidth * progress), 5, 3);
                ctx.fill();
            }
        }

        // Aloitusruutu piirretaan canvakselle.
        if (state === 'ready') {
            drawStartScreen();
        } else if (startHint > 0) {
            // Kerrotaan hetki, milla hahmolla pelataan.
            ctx.globalAlpha = clamp(startHint, 0, 1);
            ctx.fillStyle = C.text;
            ctx.font = SMALL_FONT;
            ctx.textAlign = 'center';
            ctx.fillText('Hahmo: ' + CHARACTERS[selected].name, width / 2, groundY * 0.4);
            ctx.globalAlpha = 1;
        }
    }

    // Piirtää yhden nappaimen "badgen" annettuun kohtaan (badgen keskipiste).
    function drawKeyBadge(label, cx, cy) {
        ctx.font = KEY_FONT;
        const w = Math.max(30, ctx.measureText(label).width + 20);
        const h = 26;
        ctx.fillStyle = C.badgeBg;
        roundRect(cx - w / 2, cy - h / 2, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = C.badgeEdge;
        ctx.lineWidth = 1;
        roundRect(cx - w / 2 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1, 6);
        ctx.stroke();
        ctx.fillStyle = C.text;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy + 5);
        return w;
    }

    // Aloitusruutu: pelin nimi, valittu hahmo, ohjaimet ja kehoite aloittaa.
    // Itse hahmonvalinta on vasemman paneelin napeissa.
    function drawStartScreen() {
        const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 420);
        const centerX = width / 2;
        const character = CHARACTERS[selected];

        // Taustapaneeli
        ctx.fillStyle = C.panel;
        roundRect(centerX - 242, 54, 484, 220, 14);
        ctx.fill();
        ctx.strokeStyle = C.panelEdge;
        ctx.lineWidth = 1;
        roundRect(centerX - 241.5, 54.5, 483, 219, 14);
        ctx.stroke();

        ctx.fillStyle = C.text;
        ctx.font = TITLE_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('ENDLESS RUNNER', centerX, 94);

        ctx.fillStyle = C.textDim;
        ctx.font = LABEL_FONT;
        ctx.fillText('JUOKSE NIIN PITKÄLLE KUIN PYSTYT', centerX, 114);

        // Valittu hahmo (valinta tapahtuu vasemman paneelin napeista)
        ctx.fillStyle = C.accent;
        ctx.font = NAME_FONT;
        ctx.fillText(CHARACTERS[selected].name, centerX, 148);
        ctx.fillStyle = C.textDim;
        ctx.font = LABEL_FONT;
        ctx.fillText(CHARACTERS[selected].tagline, centerX, 170);

        // Ohjaimet
        ctx.fillText('HYPPY', centerX - 96, 190);
        drawKeyBadge('SPACE', centerX - 96, 211);
        ctx.fillText('UUSI PELI / PALUU', centerX + 82, 190);
        drawKeyBadge('ENTER', centerX + 30, 211);
        drawKeyBadge('R', centerX + 104, 211);

        // Kehoite
        ctx.globalAlpha = pulse;
        ctx.fillStyle = C.text;
        ctx.fillText('Aloita painamalla Space, Enter tai klikkaamalla', centerX, 252);
        ctx.globalAlpha = 1;
    }

    // HUD-tekstin liukuva arvo (hitaampi kuin pelin oma laskuri).
    function render() {
        ctx.clearRect(0, 0, width, height);
        drawBackground();
        drawWorld();

        // Kolikot ja esteet piirretaan ennen hahmoa, jotta hahmo on päällimmäisenä.
        for (let i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
        drawCoins();

        drawPlayer();
        drawAtmosphere();
        drawHud();
    }

    // Ilmakehä: lämpimän illan utu horisontissa ja pehmeä vinjetti.
    function drawAtmosphere() {
        const haze = ctx.createLinearGradient(0, groundY - 100, 0, groundY + 6);
        haze.addColorStop(0, 'rgba(240, 187, 133, 0)');
        haze.addColorStop(0.65, 'rgba(226, 168, 130, 0.18)');
        haze.addColorStop(1, 'rgba(210, 150, 120, 0.34)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, groundY - 100, width, 106);

        const vignette = ctx.createRadialGradient(
            width / 2, height * 0.46, Math.min(width, height) * 0.34,
            width / 2, height * 0.46, Math.max(width, height) * 0.74
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(12, 20, 30, 0.34)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Pääsilmukka ---------- */

    let lastTime = 0;
    let lastState = '';

    function frame(now) {
        let dt = lastTime ? (now - lastTime) / 1000 : 0;
        lastTime = now;
        if (dt > 0.05) dt = 0.05;               // esim. välilehden palaaminen

        if (state === 'running') updateRunning(dt);
        else if (state === 'dying') updateDying(dt);

        // Paneelin hahmovalitsin seuraa pelin tilaa (lukittu kesken pelin).
        if (state !== lastState) {
            lastState = state;
            syncCharacterUI();
            syncPlayMode();                     // puhelin: valikot piiloon
        }

        render();
        requestAnimationFrame(frame);
    }

    /* ---------- Syöte ---------- */

    // Puhelimella peli pyytää vaakatasoa heti alkaessaan, jotta vaakasuuntainen
    // peli näkyy mahdollisimman isona. Kutsu tapahtuu käyttäjän eleestä
    // (napautus tai näppäin), kuten selaimet vaativat.
    function startRunOnPhone() {
        if (state === 'ready' && isSmallScreen()) lockLandscape();
        startRun();
    }

    function jumpOrRestart() {
        if (state === 'ready') startRunOnPhone();
        else if (state === 'running') jumpBuffer = JUMP_BUFFER;
        else if (state === 'over') restart();
    }

    // Enter: aloittaa pelin, ja loppuruudusta uuden pelin.
    function enterPressed() {
        if (state === 'ready') startRunOnPhone();
        else if (state === 'over') restart();
    }

    const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];

    window.addEventListener('keydown', (event) => {
        Sound.unlock();                         // ääni sallitaan käyttäjän eleestä
        if (JUMP_KEYS.includes(event.code)) {
            event.preventDefault();
            if (!event.repeat) {
                holdingJump = true;
                jumpOrRestart();
            }
        } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            event.preventDefault();
            if (!event.repeat) enterPressed();
        } else if (event.code === 'KeyR') {
            event.preventDefault();
            restart();
        } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
            // Nuolilla vaihdetaan hahmoa aloitus- ja loppuruudussa.
            if (state === 'ready' || state === 'over') {
                event.preventDefault();
                if (!event.repeat) {
                    cycleCharacter(event.code === 'ArrowRight' ? 1 : -1);
                    if (state === 'over') {
                        reset();
                        state = 'ready';
                        overlay.hidden = true;
                    }
                }
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        if (JUMP_KEYS.includes(event.code)) {
            holdingJump = false;
        }
    });

    // Klikkaus / napautus: aloita, hyppää tai aloita uudelleen.
    // Toimii sekä hiirellä että sormella (pointerdown kattaa molemmat).
    canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();                 // estää valinnan ja kaksoisnapautuszoomin
        Sound.unlock();                         // ääni sallitaan käyttäjän eleestä
        holdingJump = true;
        jumpOrRestart();
    });
    // Sormen nosto voi tapahtua canvasin ulkopuolella: kuunnellaan ikkunaa.
    window.addEventListener('pointerup', () => {
        holdingJump = false;
    });
    window.addEventListener('pointercancel', () => {
        holdingJump = false;
    });

    window.addEventListener('blur', () => {
        holdingJump = false;
    });

    // Kääntö: päivitetään kääntökehotus.
    window.addEventListener('orientationchange', () => {
        syncRotateTip();
    });

    // Puhelimen kääntö ja selaimen palkkien piiloutuminen muuttavat kokoa.
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        resize();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 220);
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(resize, 220);
    });

    /* ---------- Käynnistys ---------- */

    buildCharacterPicker();
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            Sound.unlock();
            Sound.toggle();
            syncSoundUI();
        });
    }
    if (overlayBtn) {
        overlayBtn.addEventListener('click', (event) => {
            event.stopPropagation();            // ei laukaise canvasin napautusta
            Sound.unlock();
            restart();
        });
    }

    resize();
    reset();
    syncCharacterUI();
    syncSoundUI();
    syncRotateTip();
    requestAnimationFrame(frame);
})();
