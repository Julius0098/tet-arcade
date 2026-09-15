/* ============================================================
   Stone Age Survival — sisältödata
   Kaikki kosmeettiset esineet, aseet ja kenttägeneraattori.
   Ei riippuvuuksia, ei ulkoisia tiedostoja.

   Kaikki sisältö on fiktiivistä ja omaa tuotantoa.
   ============================================================ */

(() => {
    'use strict';

    const Stone = window.StoneAge = window.StoneAge || {};

    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

    /* ============================================================
       HARVINAISUUDET
       ============================================================ */

    const RARITY = {
        common: { id: 'common', name: 'COMMON', color: '#9fb0c9', glow: 'rgba(159,176,201,0.35)', mult: 1, weight: 0 },
        uncommon: { id: 'uncommon', name: 'UNCOMMON', color: '#5fd88a', glow: 'rgba(95,216,138,0.4)', mult: 1.6, weight: 1 },
        rare: { id: 'rare', name: 'RARE', color: '#5fa8ff', glow: 'rgba(95,168,255,0.45)', mult: 2.6, weight: 2 },
        epic: { id: 'epic', name: 'EPIC', color: '#b57cff', glow: 'rgba(181,124,255,0.5)', mult: 4, weight: 3 },
        legendary: { id: 'legendary', name: 'LEGENDARY', color: '#ffb347', glow: 'rgba(255,179,71,0.55)', mult: 6, weight: 4 },
        mythic: { id: 'mythic', name: 'MYTHIC', color: '#ff5c8a', glow: 'rgba(255,92,138,0.6)', mult: 9, weight: 5 }
    };

    const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

    /* ============================================================
       VÄRIPALETIT
       Hahmot ja esineet piirretään ohjelmallisesti, joten jokainen
       asu on vain joukko värejä ja muotoparametreja.
       ============================================================ */

    // runko = vartalon väri, iho = ihon väri, korostus = yksityiskohdat
    const PALETTES = [
        { body: '#c98a5a', skin: '#e8b98d', accent: '#8a5a2b', hair: '#4a2f1a' },
        { body: '#8a6b4a', skin: '#d8a878', accent: '#5c4028', hair: '#2e1c10' },
        { body: '#6b8f5a', skin: '#c9a878', accent: '#3f5c33', hair: '#33261a' },
        { body: '#5a7a9a', skin: '#e0c0a0', accent: '#33506b', hair: '#2a3a4a' },
        { body: '#9a5a5a', skin: '#e8b090', accent: '#6b3333', hair: '#3a1a1a' },
        { body: '#7a5a9a', skin: '#d8b0c0', accent: '#4a3363', hair: '#2f1f3f' },
        { body: '#b08a3a', skin: '#f0d0a0', accent: '#7a5a1f', hair: '#5a4010' },
        { body: '#3f6b6b', skin: '#c0d8d0', accent: '#244747', hair: '#1a3030' },
        { body: '#a86a3a', skin: '#e8c090', accent: '#6b4020', hair: '#4a2a10' },
        { body: '#5a5a7a', skin: '#c8c8e0', accent: '#38385a', hair: '#252540' }
    ];

    /* ============================================================
       ASUT (OUTFITS)
       Jokainen asu määrittää värin, rungon muodon ja erikoisuuden.
       ============================================================ */

    function outfit(id, name, rarity, palette, style, price, desc, unlock) {
        return {
            id, name, rarity, kind: 'outfit', price: price || 0,
            palette: PALETTES[palette % PALETTES.length],
            style: style || 'basic',
            desc: desc || '',
            unlock: unlock || null
        };
    }

    const OUTFITS = [
        // Perusasut — osa avautuu heti
        outfit('caveman', 'Caveman', 'common', 0, 'basic', 0, 'Perusasu jokaiselle kivikauden selviytyjälle.', { type: 'default' }),
        outfit('hunter', 'Jungle Hunter', 'common', 2, 'leafy', 300, 'Viidakkotyylinen asu lehväkoristeilla.'),
        outfit('stone_warrior', 'Stone Warrior', 'uncommon', 1, 'armored', 600, 'Kivikauden soturi kivisellä rintapanssarilla.'),
        outfit('ice_survivor', 'Ice Survivor', 'uncommon', 3, 'fur', 700, 'Jäävuorten selviytyjä paksussa turkissa.'),
        outfit('scout', 'Cave Scout', 'common', 6, 'basic', 250, 'Kevyt asu nopealle tiedustelijalle.'),
        outfit('bone_collector', 'Bone Collector', 'uncommon', 9, 'bone', 800, 'Luisilla koristeilla peitetty asu.'),
        outfit('tribe_shaman', 'Tribe Shaman', 'rare', 5, 'shaman', 1100, 'Heimonsa henkien tulkitsija.'),
        outfit('volcano_warrior', 'Volcano Warrior', 'rare', 4, 'volcanic', 1200, 'Tulivuorimaailman soturi hehkuvin kuvioin.'),
        outfit('crystal_warrior', 'Crystal Warrior', 'rare', 7, 'crystal', 1300, 'Kristalliluolien teemainen asu.'),
        outfit('mammoth_rider', 'Mammoth Rider', 'rare', 1, 'fur', 1400, 'Villamammutin ratsastajan asu.'),
        outfit('ancient_king', 'Ancient King', 'epic', 6, 'royal', 2000, 'Harvinainen kuninkaallinen kivikausiasu.'),
        outfit('dino_rider', 'Dino Rider', 'epic', 2, 'dino', 2200, 'Dinosaurusteemainen harvinainen asu.'),
        outfit('storm_caller', 'Storm Caller', 'epic', 3, 'storm', 2400, 'Myrskyn kutsuma, salamakuvioinen asu.'),
        outfit('magma_lord', 'Magma Lord', 'epic', 4, 'volcanic', 2600, 'Sulan kiven valtias.'),
        outfit('shadow_hunter', 'Shadow Hunter', 'legendary', 9, 'shadow', 3200, 'Tumma legendaarinen asu, joka imee valon.'),
        outfit('frost_giant', 'Frost Giant', 'legendary', 3, 'frost', 3400, 'Jäätyneen jättiläisen perintö.'),
        outfit('sun_priest', 'Sun Priest', 'legendary', 6, 'royal', 3600, 'Auringon papin kultainen asu.'),
        outfit('void_walker', 'Void Walker', 'legendary', 5, 'void', 4000, 'Tyhjyydestä saapunut hahmo.'),
        outfit('golden_survivor', 'Golden Survivor', 'mythic', 6, 'golden', 5000, 'Erittäin harvinainen kultainen selviytyjä.'),
        outfit('ancient_deity', 'Ancient Deity', 'mythic', 7, 'deity', 6000, 'Muinaisten jumalten avatar.'),
        outfit('primal_dragon', 'Primal Dragon', 'mythic', 4, 'dragon', 7000, 'Lohikäärmeen suomuista punottu asu.'),
        outfit('crystal_queen', 'Crystal Queen', 'mythic', 3, 'crystal', 8000, 'Kristallien kuningatar, hehkuva ja harvinainen.')
    ];

    /* ============================================================
       PÄÄHINEET (HEAD)
       ============================================================ */

    function head(id, name, rarity, style, color, price, desc) {
        return { id, name, rarity, kind: 'head', style, color, price: price || 0, desc: desc || '' };
    }

    const HEADS = [
        head('none', 'Paljas', 'common', 'none', '#000000', 0, 'Ei päähinettä.'),
        head('fur_cap', 'Fur Cap', 'common', 'cap', '#8a6b4a', 150, 'Lämmin turkislakki.'),
        head('bone_helm', 'Bone Helm', 'uncommon', 'helm', '#e0d8c8', 400, 'Luista veistetty kypärä.'),
        head('stone_helm', 'Stone Helm', 'uncommon', 'helm', '#9aa4b0', 500, 'Raskas kivikypärä.'),
        head('leaf_crown', 'Leaf Crown', 'uncommon', 'crown', '#5fd88a', 450, 'Viidakon lehdistä punottu kruunu.'),
        head('horned_helm', 'Horned Helm', 'rare', 'horned', '#b08a3a', 900, 'Sarvilla koristeltu kypärä.'),
        head('crystal_helm', 'Crystal Helm', 'rare', 'crystal', '#7cf0ff', 1100, 'Kristallista kasvanut kypärä.'),
        head('skull_mask', 'Skull Mask', 'rare', 'mask', '#e8e0d0', 1000, 'Pääkallonaamio.'),
        head('flame_crown', 'Flame Crown', 'epic', 'crown', '#ff7a3c', 1800, 'Liekehtivä kruunu.'),
        head('ice_crown', 'Ice Crown', 'epic', 'crown', '#8fd8ff', 1800, 'Jäinen kruunu.'),
        head('shadow_hood', 'Shadow Hood', 'epic', 'hood', '#3a2a5a', 2000, 'Varjoista kudottu huppu.'),
        head('golden_crown', 'Golden Crown', 'legendary', 'crown', '#ffd45e', 3000, 'Kultainen kruunu.'),
        head('dragon_helm', 'Dragon Helm', 'legendary', 'dragon', '#ff5c8a', 3400, 'Lohikäärmeen pääkallo.'),
        head('void_mask', 'Void Mask', 'legendary', 'void', '#6a3ca0', 3600, 'Naamio tyhjyydestä.'),
        head('deity_halo', 'Deity Halo', 'mythic', 'halo', '#ffe9a8', 5000, 'Jumalten sädekehä.')
    ];

    /* ============================================================
       SELKÄESINEET (BACK ITEM)
       ============================================================ */

    function back(id, name, rarity, style, color, price, desc) {
        return { id, name, rarity, kind: 'back', style, color, price: price || 0, desc: desc || '' };
    }

    const BACKS = [
        back('none', 'Ei mitään', 'common', 'none', '#000000', 0, 'Tyhjä selkä.'),
        back('wood_bundle', 'Wood Bundle', 'common', 'bundle', '#8a5a2b', 120, 'Kimppu polttopuita.'),
        back('stone_pack', 'Stone Pack', 'common', 'pack', '#8a94a0', 180, 'Kivinen reppu.'),
        back('hide_pack', 'Hide Pack', 'uncommon', 'pack', '#a86a3a', 380, 'Nahkainen reppu.'),
        back('spear_quiver', 'Spear Quiver', 'uncommon', 'quiver', '#6b4020', 420, 'Keihäitä selässä.'),
        back('bone_totem', 'Bone Totem', 'rare', 'totem', '#e0d8c8', 850, 'Luisia toteemeja.'),
        back('crystal_shard', 'Crystal Shard', 'rare', 'crystal', '#7cf0ff', 1000, 'Selässä hehkuva kristalli.'),
        back('flame_backpack', 'Flame Backpack', 'rare', 'flame', '#ff7a3c', 1100, 'Liekehtivä reppu.'),
        back('ice_wings', 'Ice Wings', 'epic', 'wings', '#8fd8ff', 1900, 'Jäiset siivet.'),
        back('shadow_cape', 'Shadow Cape', 'epic', 'cape', '#3a2a5a', 2000, 'Varjoista kudottu viitta.'),
        back('dragon_wings', 'Dragon Wings', 'legendary', 'wings', '#ff5c8a', 3200, 'Lohikäärmeen siivet.'),
        back('golden_cape', 'Golden Cape', 'legendary', 'cape', '#ffd45e', 3000, 'Kultainen viitta.'),
        back('void_portal', 'Void Portal', 'mythic', 'portal', '#8b5cf6', 5500, 'Selässä leijuva portaali.')
    ];

    /* ============================================================
       ASEET
       Aseilla on suorituskyky, joka vaikuttaa peliin.
       Ne avautuvat tasojen myötä tai ostetaan kolikoilla.
       ============================================================ */

    function weapon(id, name, slot, rarity, price, stats, desc, visual) {
        return {
            id, name, slot, rarity, kind: 'weapon', price: price || 0,
            damage: stats.damage,
            fireRate: stats.fireRate,      // laukausta sekunnissa
            range: stats.range,
            spread: stats.spread || 0,
            pellets: stats.pellets || 1,
            projectileSpeed: stats.projectileSpeed || 620,
            unlockLevel: stats.unlockLevel || 1,
            desc: desc || '',
            visual: visual || 'club'
        };
    }

    const WEAPONS = [
        // MELEE
        weapon('club', 'Wooden Club', 'melee', 'common', 0,
            { damage: 26, fireRate: 2.2, range: 62, unlockLevel: 1 }, 'Yksinkertainen puinen nuija.', 'club'),
        weapon('stone_axe', 'Stone Axe', 'melee', 'common', 0,
            { damage: 38, fireRate: 1.7, range: 68, unlockLevel: 3 }, 'Kivestä veistetty kirves.', 'axe'),
        weapon('bone_spear', 'Bone Spear', 'melee', 'uncommon', 700,
            { damage: 46, fireRate: 1.5, range: 88, unlockLevel: 1 }, 'Pitkä luinen keihäs.', 'spear'),
        weapon('obsidian_blade', 'Obsidian Blade', 'melee', 'rare', 1600,
            { damage: 62, fireRate: 1.8, range: 74, unlockLevel: 1 }, 'Terävä obsidiaaniterä.', 'blade'),
        weapon('crystal_cleaver', 'Crystal Cleaver', 'melee', 'epic', 3000,
            { damage: 84, fireRate: 1.6, range: 80, unlockLevel: 1 }, 'Kristallinen halkaisija.', 'cleaver'),

        // PRIMARY
        weapon('sling', 'Stone Sling', 'primary', 'common', 0,
            { damage: 12, fireRate: 3.2, range: 380, unlockLevel: 1 }, 'Nopea linko kivillä.', 'sling'),
        weapon('short_bow', 'Short Bow', 'primary', 'common', 0,
            { damage: 20, fireRate: 2.0, range: 470, unlockLevel: 2 }, 'Lyhyt metsästysjousi.', 'bow'),
        weapon('bone_bow', 'Bone Bow', 'primary', 'uncommon', 800,
            { damage: 30, fireRate: 2.2, range: 520, unlockLevel: 1 }, 'Luinen jousi.', 'bow'),
        weapon('atlatl', 'Atlatl Thrower', 'primary', 'uncommon', 900,
            { damage: 34, fireRate: 1.7, range: 560, unlockLevel: 1 }, 'Keihäänheittäjä.', 'atlatl'),
        weapon('fire_bow', 'Fire Bow', 'primary', 'rare', 1800,
            { damage: 42, fireRate: 2.4, range: 540, unlockLevel: 1 }, 'Tulisia nuolia ampuva jousi.', 'firebow'),
        weapon('crystal_bow', 'Crystal Bow', 'primary', 'epic', 3200,
            { damage: 56, fireRate: 2.8, range: 600, unlockLevel: 1 }, 'Kristallinuolia ampuva jousi.', 'crystalbow'),
        weapon('storm_bow', 'Storm Bow', 'primary', 'legendary', 5200,
            { damage: 72, fireRate: 3.0, range: 640, unlockLevel: 1 }, 'Myrskyn voimalla ampua.', 'stormbow'),

        // SECONDARY
        weapon('rock_throw', 'Rock Throw', 'secondary', 'common', 0,
            { damage: 16, fireRate: 2.6, range: 420, unlockLevel: 1 }, 'Heitä kiviä.', 'rock'),
        weapon('bone_dart', 'Bone Darts', 'secondary', 'common', 0,
            { damage: 14, fireRate: 4.0, range: 400, spread: 0.06, unlockLevel: 4 }, 'Nopeita luisia tikareita.', 'dart'),
        weapon('fire_pot', 'Fire Pot', 'secondary', 'rare', 1500,
            { damage: 52, fireRate: 1.1, range: 340, unlockLevel: 1 }, 'Palava saviastia.', 'firepot'),
        weapon('ice_shard', 'Ice Shards', 'secondary', 'epic', 2900,
            { damage: 26, fireRate: 3.4, range: 460, pellets: 3, spread: 0.2, unlockLevel: 1 }, 'Kolme jäistä sirpaletta.', 'iceshard'),

        // SPECIAL
        weapon('boulder_roll', 'Boulder Roll', 'special', 'uncommon', 1000,
            { damage: 70, fireRate: 0.7, range: 500, unlockLevel: 1 }, 'Vierittää raskaan kiven.', 'boulder'),
        weapon('volcano_blast', 'Volcano Blast', 'special', 'legendary', 4800,
            { damage: 96, fireRate: 0.9, range: 420, pellets: 5, spread: 0.5, unlockLevel: 1 }, 'Tulivuoren purkaus.', 'volcano'),
        weapon('crystal_lance', 'Crystal Lance', 'special', 'epic', 3400,
            { damage: 88, fireRate: 1.0, range: 620, unlockLevel: 1 }, 'Lävistävä kristallikeihäs.', 'lance'),
        weapon('void_beam', 'Void Beam', 'special', 'mythic', 6500,
            { damage: 120, fireRate: 1.4, range: 680, unlockLevel: 1 }, 'Tyhjyyden säde.', 'voidbeam')
    ];

    /* ============================================================
       ASEIDEN SKINIT
       Skinit muuttavat vain ulkonäköä, eivät ominaisuuksia.
       ============================================================ */

    function skin(id, name, rarity, price, colors, effect) {
        return {
            id, name, rarity, kind: 'skin', price: price || 0,
            colors, effect: effect || null
        };
    }

    const SKINS = [
        skin('default', 'Perus', 'common', 0, { main: '#8a5a2b', accent: '#c9a06b', glow: null }),
        skin('stone_camo', 'Stone Camo', 'common', 200, { main: '#7a828c', accent: '#b0b8c0', glow: null }),
        skin('jungle_camo', 'Jungle Camo', 'uncommon', 450, { main: '#3f6b3a', accent: '#7fc06a', glow: null }),
        skin('ice_camo', 'Ice Camo', 'uncommon', 500, { main: '#7fb8d8', accent: '#d8f0ff', glow: 'rgba(143,216,255,0.4)' }),
        skin('bone', 'Bone', 'uncommon', 550, { main: '#d8d0c0', accent: '#f0e8d8', glow: null }),
        skin('volcano', 'Volcano', 'rare', 1100, { main: '#8a2f1f', accent: '#ff7a3c', glow: 'rgba(255,122,60,0.5)' }),
        skin('crystal', 'Crystal', 'rare', 1300, { main: '#3f7a8a', accent: '#7cf0ff', glow: 'rgba(124,240,255,0.5)' }),
        skin('ancient', 'Ancient', 'epic', 2200, { main: '#6b5a3a', accent: '#ffd45e', glow: 'rgba(255,212,94,0.4)' }),
        skin('shadow', 'Shadow', 'epic', 2400, { main: '#2a2340', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' }),
        skin('dragon', 'Dragon', 'legendary', 3800, { main: '#7a1f3a', accent: '#ff5c8a', glow: 'rgba(255,92,138,0.55)' }),
        skin('golden', 'Golden', 'legendary', 4200, { main: '#8a6a1f', accent: '#ffe07a', glow: 'rgba(255,224,122,0.6)' }),
        skin('void', 'Void', 'mythic', 6000, { main: '#3a1f5a', accent: '#c084ff', glow: 'rgba(192,132,255,0.65)' })
    ];

    /* ============================================================
       EMOTET
       ============================================================ */

    function emote(id, name, rarity, price, style, duration) {
        return { id, name, rarity, kind: 'emote', price: price || 0, style, duration: duration || 2 };
    }

    const EMOTES = [
        emote('none', 'Ei emotee', 'common', 0, 'none', 0.1),
        emote('victory_dance', 'Victory Dance', 'common', 250, 'dance', 2.4),
        emote('stone_dance', 'Stone Dance', 'uncommon', 500, 'stone', 2.6),
        emote('warrior_pose', 'Warrior Pose', 'uncommon', 550, 'pose', 2.2),
        emote('happy_jump', 'Happy Jump', 'rare', 900, 'jump', 2.0),
        emote('victory_roar', 'Victory Roar', 'rare', 1000, 'roar', 2.4),
        emote('spinning_swing', 'Spinning Swing', 'epic', 1800, 'spin', 2.6),
        emote('crystal_shimmer', 'Crystal Shimmer', 'epic', 2000, 'shimmer', 3.0),
        emote('flame_burst', 'Flame Burst', 'legendary', 3200, 'flame', 3.0),
        emote('void_levitate', 'Void Levitate', 'mythic', 5500, 'levitate', 3.4)
    ];

    /* ============================================================
       ERIKOISEFEKTIT (SPECIAL EFFECTS)
       ============================================================ */

    function effect(id, name, rarity, price, style, color) {
        return { id, name, rarity, kind: 'effect', price: price || 0, style, color };
    }

    const EFFECTS = [
        effect('none', 'Ei efektiä', 'common', 0, 'none', '#000000'),
        effect('dust_trail', 'Dust Trail', 'common', 300, 'dust', '#c9a06b'),
        effect('leaf_trail', 'Leaf Trail', 'uncommon', 650, 'leaf', '#5fd88a'),
        effect('ember_trail', 'Ember Trail', 'rare', 1400, 'ember', '#ff7a3c'),
        effect('frost_aura', 'Frost Aura', 'rare', 1500, 'frost', '#8fd8ff'),
        effect('crystal_spark', 'Crystal Spark', 'epic', 2600, 'spark', '#7cf0ff'),
        effect('shadow_wisp', 'Shadow Wisp', 'epic', 2800, 'wisp', '#8b5cf6'),
        effect('golden_glow', 'Golden Glow', 'legendary', 4400, 'glow', '#ffd45e'),
        effect('void_ring', 'Void Ring', 'mythic', 7000, 'ring', '#c084ff')
    ];

    /* ============================================================
       KAUPPATUOTTEET
       Kauppa myy kaikkea kosmeettista. Ei oikeaa rahaa, ei
       loot boxeja, ei pay-to-win -mekaniikkoja.
       ============================================================ */

    function buildShop() {
        const items = [];

        // Asut, joilla on hinta > 0
        OUTFITS.forEach((o) => {
            if (o.price > 0) items.push({ category: 'outfit', ref: o });
        });
        HEADS.forEach((h) => {
            if (h.price > 0) items.push({ category: 'head', ref: h });
        });
        BACKS.forEach((b) => {
            if (b.price > 0) items.push({ category: 'back', ref: b });
        });
        SKINS.forEach((s) => {
            if (s.price > 0) items.push({ category: 'skin', ref: s });
        });
        EMOTES.forEach((e) => {
            if (e.price > 0) items.push({ category: 'emote', ref: e });
        });
        EFFECTS.forEach((e) => {
            if (e.price > 0) items.push({ category: 'effect', ref: e });
        });

        return items;
    }

    /* ============================================================
       KENTTÄGENERAATTORI — 1000 tasoa
       Jokainen taso on deterministinen: sama taso tuottaa aina
       saman kentän. Vaikeus kasvaa asteittain, ja joka 10. taso on
       bossikenttä.
       ============================================================ */

    // Yksinkertainen siemenellinen satunnaislukugeneraattori.
    function makeRandom(seed) {
        let state = (seed >>> 0) || 1;
        return function () {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const BIOMES = [
        { id: 'plains', name: 'Savanni', ground: '#5a6b3a', groundAlt: '#4a5a30', rock: '#7a7458', sky: '#3a4a6a' },
        { id: 'jungle', name: 'Viidakko', ground: '#2f5a34', groundAlt: '#264a2c', rock: '#4a6b4a', sky: '#25402a' },
        { id: 'ice', name: 'Jäämaa', ground: '#7fa8c0', groundAlt: '#6a94ac', rock: '#a8c8dc', sky: '#4a6a8a' },
        { id: 'volcano', name: 'Tulivuori', ground: '#4a2a26', groundAlt: '#3a1f1c', rock: '#7a3a2a', sky: '#5a2a20' },
        { id: 'crystal', name: 'Kristalliluolat', ground: '#3a3a5a', groundAlt: '#2f2f4a', rock: '#6a6aa0', sky: '#252545' },
        { id: 'swamp', name: 'Suo', ground: '#3a4a34', groundAlt: '#2f3f2a', rock: '#5a5a44', sky: '#2f3a2a' }
    ];

    const ENEMY_KINDS = [
        { id: 'raptor', name: 'Raptor', hp: 30, speed: 96, damage: 8, size: 20, color: '#8a6a3a', behavior: 'chase' },
        { id: 'boar', name: 'Wild Boar', hp: 46, speed: 78, damage: 11, size: 24, color: '#6b4a3a', behavior: 'charge' },
        { id: 'slinger', name: 'Tribal Slinger', hp: 34, speed: 58, damage: 9, size: 21, color: '#9a5a5a', behavior: 'ranged' },
        { id: 'bat', name: 'Cave Bat', hp: 22, speed: 118, damage: 6, size: 16, color: '#5a4a6a', behavior: 'erratic' },
        { id: 'brute', name: 'Stone Brute', hp: 90, speed: 52, damage: 16, size: 30, color: '#7a828c', behavior: 'chase' },
        { id: 'scorpion', name: 'Giant Scorpion', hp: 40, speed: 88, damage: 12, size: 22, color: '#8a5a2b', behavior: 'chase' },
        { id: 'shaman', name: 'Enemy Shaman', hp: 52, speed: 54, damage: 10, size: 22, color: '#6a4a9a', behavior: 'ranged' },
        { id: 'wolf', name: 'Dire Wolf', hp: 38, speed: 128, damage: 10, size: 21, color: '#8a8a94', behavior: 'pack' }
    ];

    const BOSSES = [
        { id: 'king_rex', name: 'King Rex', hp: 900, speed: 66, damage: 22, size: 60, color: '#7a3a3a', pattern: 'charge' },
        { id: 'mammoth', name: 'Ancient Mammoth', hp: 1300, speed: 46, damage: 26, size: 66, color: '#6b5a4a', pattern: 'stomp' },
        { id: 'crystal_titan', name: 'Crystal Titan', hp: 1700, speed: 54, damage: 24, size: 64, color: '#5a7a9a', pattern: 'shards' },
        { id: 'volcano_drake', name: 'Volcano Drake', hp: 2100, speed: 78, damage: 28, size: 62, color: '#8a3a2a', pattern: 'fire' },
        { id: 'void_lord', name: 'Void Lord', hp: 2600, speed: 70, damage: 30, size: 64, color: '#5a3a8a', pattern: 'mixed' }
    ];

    const LEVEL_NAMES = [
        'Camp', 'Valley', 'Ridge', 'Canyon', 'Basin', 'Peaks', 'Hollow',
        'Marsh', 'Dunes', 'Gorge', 'Highlands', 'Caverns', 'Wastes', 'Summit',
        'Depths', 'Frontier', 'Badlands', 'Sanctum', 'Abyss', 'Citadel'
    ];

    // Tason palkkio kolikoina. Kasvaa vaikeuden mukana.
    function rewardFor(level) {
        const l = Math.max(1, level);
        // Kevyt kaava, joka antaa suunnilleen pyydetyt arvot:
        // 1 -> 100, 10 -> 150, 50 -> 300, 100 -> 500, 500 -> 1000, 1000 -> 5000
        let base = 100 + Math.round(Math.pow(l, 0.62) * 22);
        if (l >= 100) base = Math.round(base * 1.1);
        if (l >= 500) base = Math.round(base * 1.35);
        if (l >= 1000) base = Math.round(base * 1.6);
        return Math.round(base / 10) * 10;
    }

    // Vaikeustähdet 1-5
    function difficultyFor(level) {
        return Math.min(5, Math.max(1, Math.ceil(level / 200)));
    }

    function isBossLevel(level) {
        return level % 10 === 0;
    }

    // Rakentaa tason kuvauksen. Deterministinen siemenen perusteella.
    function buildLevel(level) {
        const l = Math.max(1, level);
        const rnd = makeRandom(l * 7919 + 104729);

        const biome = BIOMES[Math.floor(rnd() * BIOMES.length)];
        const boss = isBossLevel(l);
        const diff = difficultyFor(l);

        // Vaikeuskertoimet
        const hpScale = 1 + (l - 1) * 0.045;
        const speedScale = 1 + (l - 1) * 0.0045;
        const countBase = 6 + Math.floor(l / 8);

        // Montako vihollista
        const waveCount = Math.min(46, countBase + Math.floor(diff * 2));

        // Montako aaltoa
        const waves = boss ? 3 : Math.min(5, 1 + Math.floor(l / 40));

        // Sallitut vihollistyypit vaikeuden mukaan
        const pool = ENEMY_KINDS.filter((e, i) => i <= Math.min(ENEMY_KINDS.length - 1, 1 + Math.floor(l / 45)));

        const enemies = [];
        for (let w = 0; w < waves; w++) {
            const wave = [];
            const inWave = Math.max(2, Math.round(waveCount / waves));
            for (let i = 0; i < inWave; i++) {
                const kind = pool[Math.floor(rnd() * pool.length)];
                wave.push({
                    kind: kind.id,
                    hp: Math.round(kind.hp * hpScale),
                    speed: kind.speed * speedScale,
                    damage: kind.damage,
                    size: kind.size,
                    color: kind.color,
                    behavior: kind.behavior
                });
            }
            enemies.push(wave);
        }

        let bossDef = null;
        if (boss) {
            const b = BOSSES[Math.min(BOSSES.length - 1, Math.floor(l / 100))];
            bossDef = {
                kind: b.id,
                name: b.name,
                hp: Math.round(b.hp * (1 + (l - 1) * 0.02)),
                speed: b.speed * speedScale,
                damage: b.damage,
                size: b.size,
                color: b.color,
                pattern: b.pattern
            };
        }

        const nameIndex = (l + Math.floor(rnd() * 3)) % LEVEL_NAMES.length;

        return {
            level: l,
            name: LEVEL_NAMES[nameIndex],
            biome,
            difficulty: diff,
            boss: bossDef,
            waves: enemies,
            reward: rewardFor(l),
            arenaWidth: 1400 + Math.min(600, l * 2),
            arenaHeight: 900 + Math.min(400, l)
        };
    }

    /* ============================================================
       APURIT
       ============================================================ */

    function byId(list, id) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function priceWithRarity(item) {
        const r = RARITY[item.rarity] || RARITY.common;
        return Math.round((item.price || 0) * r.mult / 10) * 10;
    }

    // Ryhmittelee kaupan tuotteet kategorioittain.
    function shopByCategory() {
        const all = buildShop();
        const map = {};
        all.forEach((entry) => {
            if (!map[entry.category]) map[entry.category] = [];
            map[entry.category].push(entry);
        });
        Object.keys(map).forEach((key) => {
            map[key].sort((a, b) => priceWithRarity(a.ref) - priceWithRarity(b.ref));
        });
        return map;
    }

    /* ============================================================
       JULKAISU
       ============================================================ */

    Stone.RARITY = RARITY;
    Stone.RARITY_ORDER = RARITY_ORDER;
    Stone.clamp = clamp;
    Stone.PALETTES = PALETTES;
    Stone.OUTFITS = OUTFITS;
    Stone.HEADS = HEADS;
    Stone.BACKS = BACKS;
    Stone.WEAPONS = WEAPONS;
    Stone.SKINS = SKINS;
    Stone.EMOTES = EMOTES;
    Stone.EFFECTS = EFFECTS;
    Stone.BIOMES = BIOMES;
    Stone.ENEMY_KINDS = ENEMY_KINDS;
    Stone.BOSSES = BOSSES;
    Stone.buildShop = buildShop;
    Stone.shopByCategory = shopByCategory;
    Stone.priceWithRarity = priceWithRarity;
    Stone.buildLevel = buildLevel;
    Stone.rewardFor = rewardFor;
    Stone.difficultyFor = difficultyFor;
    Stone.isBossLevel = isBossLevel;
    Stone.makeRandom = makeRandom;
    Stone.byId = byId;
    Stone.MAX_LEVEL = 1000;
})();
