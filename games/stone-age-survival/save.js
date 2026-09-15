/* ============================================================
   Stone Age Survival — tallennus
   Kaikki eteneminen säilyy localStoragessa.
   ============================================================ */

(() => {
    'use strict';

    const Stone = window.StoneAge = window.StoneAge || {};

    const KEY = 'stone-age-survival-save-v1';

    function defaults() {
        return {
            coins: 0,
            currentLevel: 1,
            highestLevel: 1,
            unlockedLevels: 1,

            // Kosmetiikka
            ownedOutfits: ['caveman'],
            ownedHeads: ['none'],
            ownedBacks: ['none'],
            ownedSkins: ['default'],
            ownedEmotes: ['none'],
            ownedEffects: ['none'],
            ownedWeapons: ['club', 'sling', 'rock_throw'],

            equippedOutfit: 'caveman',
            equippedHead: 'none',
            equippedBack: 'none',
            equippedSkin: 'default',
            equippedEmote: 'none',
            equippedEffect: 'none',

            // Loadout
            loadout: {
                primary: 'sling',
                secondary: 'rock_throw',
                special: null,
                melee: 'club'
            },

            // Aseiden upit: { weaponId: { level: n } }
            upgrades: {},

            // Asetukset
            settings: {
                sound: true,
                music: true,
                showTouch: true,
                screenShake: true
            },

            stats: {
                levelsCleared: 0,
                enemiesDefeated: 0,
                bestScore: 0,
                totalCoinsEarned: 0,
                bossesDefeated: 0
            }
        };
    }

    let data = defaults();

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;

            const base = defaults();
            data = Object.assign(base, parsed);

            // Varmistetaan rakenteet, jos tallennus on vanhemmasta versiosta.
            data.settings = Object.assign(defaults().settings, parsed.settings || {});
            data.stats = Object.assign(defaults().stats, parsed.stats || {});
            data.loadout = Object.assign(defaults().loadout, parsed.loadout || {});
            data.upgrades = parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : {};

            ['ownedOutfits', 'ownedHeads', 'ownedBacks', 'ownedSkins',
                'ownedEmotes', 'ownedEffects', 'ownedWeapons'].forEach((key) => {
                if (!Array.isArray(data[key]) || !data[key].length) data[key] = defaults()[key];
            });

            // Numerot turvallisiksi
            data.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
            data.currentLevel = clampLevel(data.currentLevel);
            data.highestLevel = clampLevel(data.highestLevel);
            data.unlockedLevels = clampLevel(data.unlockedLevels);
        } catch (err) {
            data = defaults();
        }
    }

    function clampLevel(v) {
        const n = Math.floor(Number(v) || 1);
        return Math.min(Stone.MAX_LEVEL, Math.max(1, n));
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (err) {
            /* tallennus ei ole pakollinen */
        }
    }

    /* ---------- Kolikot ---------- */

    function coins() {
        return data.coins;
    }

    // Lisää kolikoita. Palauttaa uuden saldon. Saldo ei koskaan mene
    // negatiiviseksi, koska lisäys on aina positiivinen.
    function addCoins(amount) {
        const add = Math.max(0, Math.floor(Number(amount) || 0));
        data.coins += add;
        data.stats.totalCoinsEarned += add;
        save();
        return data.coins;
    }

    // Yrittää ostaa. Palauttaa 'ok', 'owned' tai 'poor'.
    function spendCoins(amount) {
        const price = Math.max(0, Math.floor(Number(amount) || 0));
        if (data.coins < price) return 'poor';
        data.coins -= price;
        save();
        return 'ok';
    }

    /* ---------- Omistus ja varustus ---------- */

    const OWNED_KEY = {
        outfit: 'ownedOutfits',
        head: 'ownedHeads',
        back: 'ownedBacks',
        skin: 'ownedSkins',
        emote: 'ownedEmotes',
        effect: 'ownedEffects',
        weapon: 'ownedWeapons'
    };

    const EQUIP_KEY = {
        outfit: 'equippedOutfit',
        head: 'equippedHead',
        back: 'equippedBack',
        skin: 'equippedSkin',
        emote: 'equippedEmote',
        effect: 'equippedEffect'
    };

    function owns(kind, id) {
        const key = OWNED_KEY[kind];
        if (!key) return false;
        return data[key].indexOf(id) !== -1;
    }

    function grant(kind, id) {
        const key = OWNED_KEY[kind];
        if (!key) return false;
        if (data[key].indexOf(id) === -1) {
            data[key].push(id);
            save();
        }
        return true;
    }

    function equip(kind, id) {
        const key = EQUIP_KEY[kind];
        if (!key) return false;
        if (!owns(kind, id)) return false;
        data[key] = id;
        save();
        return true;
    }

    function equipped(kind) {
        const key = EQUIP_KEY[kind];
        return key ? data[key] : null;
    }

    /* ---------- Loadout ---------- */

    function setLoadout(slot, weaponId) {
        if (!weaponId) {
            data.loadout[slot] = null;
            save();
            return true;
        }
        if (!owns('weapon', weaponId)) return false;
        data.loadout[slot] = weaponId;
        save();
        return true;
    }

    function loadout() {
        return data.loadout;
    }

    // Varmistaa, että loadoutissa on aina kelvollinen melee-ase.
    function ensureLoadout() {
        if (!data.loadout.melee || !owns('weapon', data.loadout.melee)) {
            data.loadout.melee = 'club';
        }
        ['primary', 'secondary', 'special'].forEach((slot) => {
            const id = data.loadout[slot];
            if (id && !owns('weapon', id)) data.loadout[slot] = null;
        });
        save();
    }

    /* ---------- Upit ---------- */

    function upgradeLevel(weaponId) {
        const u = data.upgrades[weaponId];
        return u ? Math.max(0, Math.floor(u.level) || 0) : 0;
    }

    // Upin hinta kasvaa portaittain. Enintään 10 tasoa per ase.
    function upgradeCost(weaponId) {
        const lvl = upgradeLevel(weaponId);
        return 150 + lvl * 220;
    }

    const MAX_UPGRADE = 10;

    function canUpgrade(weaponId) {
        return upgradeLevel(weaponId) < MAX_UPGRADE;
    }

    function doUpgrade(weaponId) {
        if (!canUpgrade(weaponId)) return 'max';
        const cost = upgradeCost(weaponId);
        const res = spendCoins(cost);
        if (res !== 'ok') return res;
        const lvl = upgradeLevel(weaponId) + 1;
        data.upgrades[weaponId] = { level: lvl };
        save();
        return 'ok';
    }

    /* ---------- Eteneminen ---------- */

    function completeLevel(level) {
        const l = clampLevel(level);
        data.stats.levelsCleared += 1;
        data.stats.bestScore = Math.max(data.stats.bestScore, 0);
        data.highestLevel = Math.max(data.highestLevel, l);
        data.unlockedLevels = Math.min(Stone.MAX_LEVEL, Math.max(data.unlockedLevels, l + 1));
        save();
    }

    function addStat(key, amount) {
        if (typeof data.stats[key] === 'number') {
            data.stats[key] += Math.max(0, Math.floor(amount) || 0);
            save();
        }
    }

    function setStat(key, value) {
        if (typeof data.stats[key] === 'number') {
            data.stats[key] = Math.max(data.stats[key], Math.floor(value) || 0);
            save();
        }
    }

    function stats() {
        return data.stats;
    }

    function addEnemiesDefeated(n) {
        addStat('enemiesDefeated', n);
    }

    function addBossDefeated() {
        addStat('bossesDefeated', 1);
    }

    /* ---------- Asetukset ---------- */

    function settings() {
        return data.settings;
    }

    function setSetting(key, value) {
        if (key in data.settings) {
            data.settings[key] = !!value;
            save();
        }
    }

    /* ---------- Nollaus ---------- */

    function reset() {
        data = defaults();
        save();
    }

    /* ---------- Julkaisu ---------- */

    Stone.Save = {
        load,
        save,
        reset,
        coins,
        addCoins,
        spendCoins,
        owns,
        grant,
        equip,
        equipped,
        setLoadout,
        loadout,
        ensureLoadout,
        upgradeLevel,
        upgradeCost,
        canUpgrade,
        doUpgrade,
        MAX_UPGRADE,
        completeLevel,
        addStat,
        setStat,
        stats,
        addEnemiesDefeated,
        addBossDefeated,
        settings,
        setSetting,
        raw: () => data
    };
})();
