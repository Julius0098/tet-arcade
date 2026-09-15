/* ============================================================
   Stone Age Survival — hahmon ja esineiden piirto
   Kaikki grafiikka piirretään ohjelmallisesti canvasille.
   Samaa piirtokoodia käyttävät lobby, locker, shop ja peli.
   ============================================================ */

(() => {
    'use strict';

    const Stone = window.StoneAge = window.StoneAge || {};

    /* ---------- Apurit ---------- */

    function rr(ctx, x, y, w, h, r) {
        const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

    function shade(hex, amount) {
        const h = String(hex || '#000000').replace('#', '');
        const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const num = parseInt(full, 16);
        let r = (num >> 16) & 255;
        let g = (num >> 8) & 255;
        let b = num & 255;
        if (amount >= 0) {
            r = Math.round(r + (255 - r) * amount);
            g = Math.round(g + (255 - g) * amount);
            b = Math.round(b + (255 - b) * amount);
        } else {
            const k = 1 + amount;
            r = Math.round(r * k);
            g = Math.round(g * k);
            b = Math.round(b * k);
        }
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    Stone.shade = shade;
    Stone.roundRect = rr;

    /* ============================================================
       HAHMON PIIRTO
       Piirtää hahmon annettuun kohtaan. Kokoa säädetään skaalalla.
       Suunta: 1 = oikealle, -1 = vasemmalle.
       ============================================================ */

    // Asun tyylikohtaiset lisäosat.
    function drawOutfitExtras(ctx, cfg, w, h, scale) {
        const p = cfg.palette;
        const style = cfg.style;

        if (style === 'armored' || style === 'volcanic') {
            // Rintapanssari
            ctx.fillStyle = style === 'volcanic' ? '#7a3a2a' : '#8a94a0';
            rr(ctx, -w * 0.34, -h * 0.1, w * 0.68, h * 0.34, 3 * scale);
            ctx.fill();
            ctx.fillStyle = style === 'volcanic' ? '#ff7a3c' : '#b0b8c4';
            ctx.fillRect(-w * 0.3, -h * 0.06, w * 0.6, 2.4 * scale);
        } else if (style === 'fur' || style === 'frost') {
            // Turkiskaulus
            ctx.fillStyle = style === 'frost' ? '#d8f0ff' : '#b08a5a';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.32, w * 0.34, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === 'leafy') {
            // Lehdet
            ctx.fillStyle = '#3f8a3a';
            for (let i = -2; i <= 2; i++) {
                ctx.save();
                ctx.translate(i * w * 0.13, -h * 0.28);
                ctx.rotate(i * 0.3);
                ctx.beginPath();
                ctx.ellipse(0, 0, w * 0.07, h * 0.09, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else if (style === 'bone') {
            // Luukoristeet
            ctx.strokeStyle = '#e8e0d0';
            ctx.lineWidth = 2.2 * scale;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * w * 0.16, -h * 0.24);
                ctx.lineTo(i * w * 0.16, h * 0.12);
                ctx.stroke();
            }
        } else if (style === 'crystal') {
            // Kristallit
            ctx.fillStyle = '#7cf0ff';
            for (let i = -1; i <= 1; i++) {
                ctx.save();
                ctx.translate(i * w * 0.2, -h * 0.16);
                ctx.rotate(i * 0.4);
                ctx.beginPath();
                ctx.moveTo(0, -h * 0.11);
                ctx.lineTo(w * 0.06, 0);
                ctx.lineTo(0, h * 0.07);
                ctx.lineTo(-w * 0.06, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        } else if (style === 'royal' || style === 'golden' || style === 'deity') {
            // Kultaiset koristeet
            ctx.fillStyle = style === 'deity' ? '#ffe9a8' : '#ffd45e';
            ctx.fillRect(-w * 0.34, -h * 0.06, w * 0.68, 3 * scale);
            ctx.beginPath();
            ctx.arc(0, -h * 0.1, w * 0.07, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === 'shadow' || style === 'void') {
            // Varjohelma
            ctx.fillStyle = style === 'void' ? 'rgba(139,92,246,0.5)' : 'rgba(20,12,40,0.55)';
            ctx.beginPath();
            ctx.moveTo(-w * 0.36, h * 0.2);
            ctx.lineTo(w * 0.36, h * 0.2);
            ctx.lineTo(w * 0.28, h * 0.5);
            ctx.lineTo(-w * 0.28, h * 0.5);
            ctx.closePath();
            ctx.fill();
        } else if (style === 'dino' || style === 'dragon') {
            // Suomut
            ctx.fillStyle = style === 'dragon' ? '#ff5c8a' : '#5fd88a';
            for (let row = 0; row < 3; row++) {
                for (let col = -1; col <= 1; col++) {
                    ctx.beginPath();
                    ctx.arc(col * w * 0.17, -h * 0.16 + row * h * 0.13, w * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (style === 'storm') {
            // Salamakuvio
            ctx.strokeStyle = '#8fd8ff';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(-w * 0.14, -h * 0.24);
            ctx.lineTo(w * 0.04, -h * 0.04);
            ctx.lineTo(-w * 0.06, -h * 0.02);
            ctx.lineTo(w * 0.12, h * 0.2);
            ctx.stroke();
        } else if (style === 'shaman') {
            // Helmikoristeet
            ctx.fillStyle = '#ffd45e';
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(-w * 0.24 + i * w * 0.12, h * 0.06, w * 0.035, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Piirtää hahmon.
     * cfg: { palette, style, head:{style,color}, back:{style,color},
     *        weapon:{visual,colors}, effect:{style,color}, emoteT, t }
     */
    function drawCharacter(ctx, x, y, scale, cfg, t) {
        const w = 34 * scale;
        const h = 56 * scale;
        const p = cfg.palette;

        ctx.save();
        ctx.translate(x, y);

        // Emote-animaatiot vaikuttavat koko hahmoon
        const emote = cfg.emoteStyle || 'none';
        const et = cfg.emoteT || 0;
        let bob = Math.sin(t * 2.4) * 1.6 * scale;
        let tilt = 0;
        let lift = 0;

        if (emote === 'dance' || emote === 'stone') {
            bob = Math.abs(Math.sin(et * 7)) * 7 * scale;
            tilt = Math.sin(et * 7) * 0.16;
        } else if (emote === 'pose') {
            tilt = -0.12;
        } else if (emote === 'jump') {
            lift = -Math.abs(Math.sin(et * 5)) * 22 * scale;
        } else if (emote === 'roar') {
            tilt = Math.sin(et * 3) * 0.08;
        } else if (emote === 'spin') {
            tilt = et * 6;
        } else if (emote === 'levitate') {
            lift = -Math.sin(et * 2) * 14 * scale;
        }

        ctx.translate(0, lift);

        // Varjo
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * scale - lift, w * 0.5, h * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(0, -h * 0.5 + bob);
        if (tilt) ctx.rotate(tilt * 0.25);

        // Selkäesine piirretään hahmon taakse
        if (cfg.back && cfg.back.style !== 'none') {
            drawBackItem(ctx, cfg.back, w, h, scale, t);
        }

        // Jalat
        ctx.fillStyle = shade(p.body, -0.22);
        rr(ctx, -w * 0.3, h * 0.1, w * 0.24, h * 0.42, 3 * scale);
        ctx.fill();
        rr(ctx, w * 0.06, h * 0.1, w * 0.24, h * 0.42, 3 * scale);
        ctx.fill();

        // Jalkaterät
        ctx.fillStyle = shade(p.accent, -0.1);
        rr(ctx, -w * 0.34, h * 0.46, w * 0.3, h * 0.1, 3 * scale);
        ctx.fill();
        rr(ctx, w * 0.04, h * 0.46, w * 0.3, h * 0.1, 3 * scale);
        ctx.fill();

        // Vartalo
        ctx.fillStyle = p.body;
        rr(ctx, -w * 0.36, -h * 0.2, w * 0.72, h * 0.34, 5 * scale);
        ctx.fill();

        // Asun lisäosat
        ctx.save();
        ctx.translate(0, 0);
        drawOutfitExtras(ctx, cfg, w, h, scale);
        ctx.restore();

        // Kädet
        const armSwing = Math.sin(t * 2.4) * 0.12;
        ctx.fillStyle = p.skin;
        ctx.save();
        ctx.translate(-w * 0.4, -h * 0.12);
        ctx.rotate(armSwing);
        rr(ctx, -w * 0.12, 0, w * 0.14, h * 0.3, 3 * scale);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(w * 0.4, -h * 0.12);
        ctx.rotate(-armSwing * 0.6);
        rr(ctx, -w * 0.02, 0, w * 0.14, h * 0.3, 3 * scale);
        ctx.fill();
        ctx.restore();

        // Pää
        ctx.fillStyle = p.skin;
        ctx.beginPath();
        ctx.arc(0, -h * 0.34, w * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Hiukset
        ctx.fillStyle = p.hair;
        ctx.beginPath();
        ctx.arc(0, -h * 0.4, w * 0.28, Math.PI, Math.PI * 2);
        ctx.fill();

        // Silmät
        const blink = (t % 4) < 0.12;
        ctx.fillStyle = '#1a1410';
        if (!blink) {
            ctx.beginPath();
            ctx.arc(-w * 0.1, -h * 0.34, w * 0.045, 0, Math.PI * 2);
            ctx.arc(w * 0.1, -h * 0.34, w * 0.045, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(-w * 0.14, -h * 0.345, w * 0.08, 1.6 * scale);
            ctx.fillRect(w * 0.06, -h * 0.345, w * 0.08, 1.6 * scale);
        }

        // Suu (emote voi avata sen)
        ctx.strokeStyle = '#5a3a2a';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        if (emote === 'roar') {
            ctx.arc(0, -h * 0.28, w * 0.09, 0, Math.PI);
        } else {
            ctx.moveTo(-w * 0.06, -h * 0.28);
            ctx.lineTo(w * 0.06, -h * 0.28);
        }
        ctx.stroke();

        // Päähine
        if (cfg.head && cfg.head.style !== 'none') {
            drawHeadItem(ctx, cfg.head, w, h, scale, t);
        }

        // Ase kädessä
        if (cfg.weapon) {
            ctx.save();
            ctx.translate(w * 0.46, -h * 0.02);
            ctx.rotate(-0.4 + armSwing * 0.5);
            drawWeaponShape(ctx, cfg.weapon.visual, w, h, scale, cfg.weapon.colors);
            ctx.restore();
        }

        ctx.restore();

        // Efekti hahmon ympärillä
        if (cfg.effect && cfg.effect.style !== 'none') {
            drawEffect(ctx, cfg.effect, x, y, scale, t);
        }

        ctx.restore();
    }

    /* ---------- Päähineet ---------- */

    function drawHeadItem(ctx, head, w, h, scale, t) {
        const top = -h * 0.62;
        ctx.save();

        if (head.style === 'cap' || head.style === 'hood') {
            ctx.fillStyle = head.color;
            ctx.beginPath();
            ctx.arc(0, -h * 0.4, w * 0.3, Math.PI, Math.PI * 2);
            ctx.fill();
            if (head.style === 'hood') {
                ctx.beginPath();
                ctx.moveTo(-w * 0.3, -h * 0.4);
                ctx.lineTo(-w * 0.42, h * 0.06);
                ctx.lineTo(-w * 0.2, h * 0.02);
                ctx.closePath();
                ctx.fill();
            }
        } else if (head.style === 'helm') {
            ctx.fillStyle = head.color;
            ctx.beginPath();
            ctx.arc(0, -h * 0.4, w * 0.32, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-w * 0.32, -h * 0.42, w * 0.64, h * 0.05);
        } else if (head.style === 'horned') {
            ctx.fillStyle = head.color;
            ctx.beginPath();
            ctx.arc(0, -h * 0.4, w * 0.3, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f0e8d8';
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.moveTo(-w * 0.26, -h * 0.46);
            ctx.quadraticCurveTo(-w * 0.46, -h * 0.66, -w * 0.34, -h * 0.78);
            ctx.moveTo(w * 0.26, -h * 0.46);
            ctx.quadraticCurveTo(w * 0.46, -h * 0.66, w * 0.34, -h * 0.78);
            ctx.stroke();
        } else if (head.style === 'crown' || head.style === 'halo') {
            if (head.style === 'halo') {
                ctx.strokeStyle = head.color;
                ctx.lineWidth = 2.6 * scale;
                const bob = Math.sin(t * 2) * 2 * scale;
                ctx.beginPath();
                ctx.ellipse(0, top - 4 * scale + bob, w * 0.34, w * 0.1, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = head.color;
                ctx.beginPath();
                ctx.moveTo(-w * 0.32, -h * 0.44);
                ctx.lineTo(-w * 0.32, -h * 0.58);
                ctx.lineTo(-w * 0.16, -h * 0.48);
                ctx.lineTo(0, -h * 0.62);
                ctx.lineTo(w * 0.16, -h * 0.48);
                ctx.lineTo(w * 0.32, -h * 0.58);
                ctx.lineTo(w * 0.32, -h * 0.44);
                ctx.closePath();
                ctx.fill();
            }
        } else if (head.style === 'mask') {
            ctx.fillStyle = head.color;
            rr(ctx, -w * 0.28, -h * 0.52, w * 0.56, h * 0.22, 4 * scale);
            ctx.fill();
            ctx.fillStyle = '#1a1410';
            ctx.beginPath();
            ctx.arc(-w * 0.1, -h * 0.42, w * 0.06, 0, Math.PI * 2);
            ctx.arc(w * 0.1, -h * 0.42, w * 0.06, 0, Math.PI * 2);
            ctx.fill();
        } else if (head.style === 'crystal') {
            ctx.fillStyle = head.color;
            for (let i = -1; i <= 1; i++) {
                ctx.save();
                ctx.translate(i * w * 0.18, -h * 0.5);
                ctx.rotate(i * 0.35);
                ctx.beginPath();
                ctx.moveTo(0, -h * 0.18);
                ctx.lineTo(w * 0.08, 0);
                ctx.lineTo(0, h * 0.08);
                ctx.lineTo(-w * 0.08, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        } else if (head.style === 'dragon') {
            ctx.fillStyle = head.color;
            rr(ctx, -w * 0.3, -h * 0.56, w * 0.6, h * 0.2, 5 * scale);
            ctx.fill();
            ctx.fillStyle = '#f0e8d8';
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, -h * 0.44);
            ctx.lineTo(-w * 0.5, -h * 0.3);
            ctx.lineTo(-w * 0.28, -h * 0.36);
            ctx.closePath();
            ctx.moveTo(w * 0.3, -h * 0.44);
            ctx.lineTo(w * 0.5, -h * 0.3);
            ctx.lineTo(w * 0.28, -h * 0.36);
            ctx.closePath();
            ctx.fill();
        } else if (head.style === 'void') {
            ctx.fillStyle = head.color;
            const pulse = 0.9 + Math.sin(t * 3) * 0.1;
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.42, w * 0.32 * pulse, h * 0.16 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(200,150,255,0.6)';
            ctx.beginPath();
            ctx.arc(0, -h * 0.42, w * 0.12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ---------- Selkäesineet ---------- */

    function drawBackItem(ctx, back, w, h, scale, t) {
        ctx.save();
        const bob = Math.sin(t * 2) * 1.4 * scale;

        if (back.style === 'pack' || back.style === 'bundle') {
            ctx.fillStyle = back.color;
            rr(ctx, -w * 0.3, -h * 0.16, w * 0.6, h * 0.34, 4 * scale);
            ctx.fill();
            ctx.fillStyle = shade(back.color, 0.25);
            ctx.fillRect(-w * 0.22, -h * 0.1, w * 0.44, 2.4 * scale);
        } else if (back.style === 'quiver') {
            ctx.fillStyle = back.color;
            rr(ctx, -w * 0.22, -h * 0.28, w * 0.44, h * 0.5, 3 * scale);
            ctx.fill();
            ctx.strokeStyle = '#e8e0d0';
            ctx.lineWidth = 2 * scale;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * w * 0.1, -h * 0.28);
                ctx.lineTo(i * w * 0.1, -h * 0.48);
                ctx.stroke();
            }
        } else if (back.style === 'totem') {
            ctx.fillStyle = back.color;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, -h * 0.2 + i * h * 0.16, w * 0.14, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (back.style === 'crystal') {
            ctx.fillStyle = back.color;
            ctx.shadowColor = back.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.34);
            ctx.lineTo(w * 0.16, 0);
            ctx.lineTo(0, h * 0.24);
            ctx.lineTo(-w * 0.16, 0);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (back.style === 'flame') {
            ctx.fillStyle = back.color;
            for (let i = -1; i <= 1; i++) {
                const flick = Math.sin(t * 8 + i) * 0.2;
                ctx.beginPath();
                ctx.moveTo(i * w * 0.14, h * 0.1);
                ctx.quadraticCurveTo(i * w * 0.14 - w * 0.1, -h * 0.14 + flick * 10,
                    i * w * 0.14, -h * 0.34 + flick * 14);
                ctx.quadraticCurveTo(i * w * 0.14 + w * 0.1, -h * 0.14 + flick * 10,
                    i * w * 0.14, h * 0.1);
                ctx.fill();
            }
        } else if (back.style === 'wings' || back.style === 'cape') {
            const flap = Math.sin(t * 2.6) * 0.14;
            ctx.fillStyle = back.color;
            ctx.save();
            ctx.rotate(-0.2 + flap);
            ctx.beginPath();
            ctx.moveTo(-w * 0.18, -h * 0.24);
            ctx.quadraticCurveTo(-w * 0.9, -h * 0.1, -w * 0.7, h * 0.32);
            ctx.quadraticCurveTo(-w * 0.4, h * 0.1, -w * 0.18, h * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.rotate(0.2 - flap);
            ctx.beginPath();
            ctx.moveTo(w * 0.18, -h * 0.24);
            ctx.quadraticCurveTo(w * 0.9, -h * 0.1, w * 0.7, h * 0.32);
            ctx.quadraticCurveTo(w * 0.4, h * 0.1, w * 0.18, h * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (back.style === 'portal') {
            const pulse = 1 + Math.sin(t * 3) * 0.12;
            ctx.strokeStyle = back.color;
            ctx.lineWidth = 3 * scale;
            ctx.shadowColor = back.color;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.06, w * 0.42 * pulse, h * 0.26 * pulse, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1.4 * scale;
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.06, w * 0.28 * pulse, h * 0.17 * pulse, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ---------- Efektit ---------- */

    function drawEffect(ctx, effect, x, y, scale, t) {
        ctx.save();
        ctx.translate(x, y);

        if (effect.style === 'dust' || effect.style === 'leaf') {
            ctx.fillStyle = effect.color;
            for (let i = 0; i < 6; i++) {
                const a = t * 2 + i * 1.05;
                const px = Math.cos(a) * 26 * scale;
                const py = Math.sin(a) * 8 * scale + 22 * scale;
                ctx.globalAlpha = 0.35 + Math.sin(a) * 0.2;
                ctx.beginPath();
                ctx.arc(px, py, 3 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (effect.style === 'ember' || effect.style === 'flame') {
            for (let i = 0; i < 8; i++) {
                const a = t * 1.6 + i * 0.8;
                ctx.globalAlpha = 0.4 + Math.sin(a * 2) * 0.25;
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 20 * scale, -20 * scale - (i % 3) * 8 * scale, 2.6 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (effect.style === 'frost' || effect.style === 'spark' || effect.style === 'glow') {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 2 * scale;
            const r = 30 * scale + Math.sin(t * 3) * 3 * scale;
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < 5; i++) {
                const a = t * 1.2 + i * 1.26;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.4, 2 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (effect.style === 'wisp' || effect.style === 'ring') {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 2.4 * scale;
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 12;
            for (let i = 0; i < 2; i++) {
                const r = (26 + i * 16) * scale;
                ctx.beginPath();
                ctx.ellipse(0, 0, r, r * 0.32, t * 1.5 + i, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /* ---------- Aseet ---------- */

    function drawWeaponShape(ctx, visual, w, h, scale, colors) {
        const main = (colors && colors.main) || '#8a5a2b';
        const accent = (colors && colors.accent) || '#c9a06b';
        const len = h * 0.5;

        ctx.save();

        if (visual === 'club') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.05, -len * 0.3, w * 0.1, len, 3 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(0, -len * 0.42, w * 0.16, 0, Math.PI * 2);
            ctx.fill();
        } else if (visual === 'axe') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.04, -len * 0.2, w * 0.08, len, 2 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.42);
            ctx.lineTo(w * 0.3, -len * 0.3);
            ctx.lineTo(w * 0.3, -len * 0.05);
            ctx.lineTo(0, -len * 0.12);
            ctx.closePath();
            ctx.fill();
        } else if (visual === 'spear' || visual === 'lance') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.025, -len * 0.6, w * 0.05, len * 1.4, 2 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.85);
            ctx.lineTo(w * 0.11, -len * 0.56);
            ctx.lineTo(0, -len * 0.44);
            ctx.lineTo(-w * 0.11, -len * 0.56);
            ctx.closePath();
            ctx.fill();
        } else if (visual === 'blade' || visual === 'cleaver') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.03, -len * 0.2, w * 0.06, len * 0.6, 2 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.66);
            ctx.lineTo(w * (visual === 'cleaver' ? 0.22 : 0.13), -len * 0.4);
            ctx.lineTo(0, -len * 0.14);
            ctx.lineTo(-w * 0.07, -len * 0.4);
            ctx.closePath();
            ctx.fill();
        } else if (visual === 'bow' || visual === 'firebow' || visual === 'crystalbow' || visual === 'stormbow') {
            ctx.strokeStyle = main;
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.arc(0, -len * 0.3, len * 0.42, -1.2, 1.2);
            ctx.stroke();
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.4 * scale;
            ctx.beginPath();
            ctx.moveTo(Math.cos(-1.2) * len * 0.42, -len * 0.3 + Math.sin(-1.2) * len * 0.42);
            ctx.lineTo(Math.cos(1.2) * len * 0.42, -len * 0.3 + Math.sin(1.2) * len * 0.42);
            ctx.stroke();
        } else if (visual === 'sling') {
            ctx.strokeStyle = main;
            ctx.lineWidth = 2.4 * scale;
            ctx.beginPath();
            ctx.arc(0, -len * 0.3, len * 0.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(0, -len * 0.3, w * 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else if (visual === 'rock' || visual === 'boulder') {
            ctx.fillStyle = main;
            ctx.beginPath();
            ctx.arc(0, -len * 0.4, w * (visual === 'boulder' ? 0.26 : 0.16), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(-w * 0.05, -len * 0.45, w * 0.07, 0, Math.PI * 2);
            ctx.fill();
        } else if (visual === 'dart') {
            ctx.fillStyle = main;
            for (let i = -1; i <= 1; i++) {
                rr(ctx, i * w * 0.08 - w * 0.02, -len * 0.5, w * 0.04, len * 0.5, 2 * scale);
                ctx.fill();
            }
        } else if (visual === 'firepot') {
            ctx.fillStyle = main;
            ctx.beginPath();
            ctx.ellipse(0, -len * 0.4, w * 0.16, w * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.62);
            ctx.quadraticCurveTo(w * 0.1, -len * 0.5, 0, -len * 0.4);
            ctx.quadraticCurveTo(-w * 0.1, -len * 0.5, 0, -len * 0.62);
            ctx.fill();
        } else if (visual === 'iceshard' || visual === 'shard') {
            ctx.fillStyle = accent;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * w * 0.1, -len * 0.66);
                ctx.lineTo(i * w * 0.1 + w * 0.07, -len * 0.3);
                ctx.lineTo(i * w * 0.1, -len * 0.16);
                ctx.lineTo(i * w * 0.1 - w * 0.07, -len * 0.3);
                ctx.closePath();
                ctx.fill();
            }
        } else if (visual === 'volcano') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.2, -len * 0.3, w * 0.4, len * 0.5, 4 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(0, -len * 0.72);
            ctx.lineTo(w * 0.16, -len * 0.4);
            ctx.lineTo(-w * 0.16, -len * 0.4);
            ctx.closePath();
            ctx.fill();
        } else if (visual === 'voidbeam') {
            ctx.fillStyle = main;
            rr(ctx, -w * 0.12, -len * 0.3, w * 0.24, len * 0.6, 4 * scale);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.shadowColor = accent;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, -len * 0.56, w * 0.13, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Yleinen
            ctx.fillStyle = main;
            rr(ctx, -w * 0.06, -len * 0.4, w * 0.12, len * 0.7, 3 * scale);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ---------- Esineen esikatseluikoni ---------- */

    // Piirtää esineen pienenä ikonina ruudukkoa varten.
    function drawItemIcon(ctx, item, x, y, size, t) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 100;

        if (item.kind === 'outfit') {
            ctx.fillStyle = item.palette.body;
            rr(ctx, -26 * s, -20 * s, 52 * s, 40 * s, 8 * s);
            ctx.fill();
            ctx.fillStyle = item.palette.skin;
            ctx.beginPath();
            ctx.arc(0, -26 * s, 15 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = item.palette.accent;
            ctx.fillRect(-24 * s, 8 * s, 48 * s, 5 * s);
        } else if (item.kind === 'head') {
            ctx.fillStyle = '#d8a878';
            ctx.beginPath();
            ctx.arc(0, 6 * s, 20 * s, 0, Math.PI * 2);
            ctx.fill();
            if (item.style !== 'none') {
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(0, 2 * s, 22 * s, Math.PI, Math.PI * 2);
                ctx.fill();
            }
        } else if (item.kind === 'back') {
            ctx.fillStyle = item.color;
            rr(ctx, -22 * s, -22 * s, 44 * s, 44 * s, 8 * s);
            ctx.fill();
        } else if (item.kind === 'skin' || item.kind === 'weapon') {
            const visual = item.kind === 'weapon' ? item.visual : 'club';
            ctx.scale(s * 1.6, s * 1.6);
            drawWeaponShape(ctx, visual, 60, 90, 1, item.colors);
        } else if (item.kind === 'emote') {
            ctx.fillStyle = '#ffd45e';
            const bob = Math.sin(t * 4) * 4 * s;
            ctx.beginPath();
            ctx.arc(0, bob, 18 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1410';
            ctx.fillRect(-8 * s, bob - 4 * s, 5 * s, 5 * s);
            ctx.fillRect(3 * s, bob - 4 * s, 5 * s, 5 * s);
            ctx.beginPath();
            ctx.arc(0, bob + 2 * s, 7 * s, 0, Math.PI);
            ctx.fill();
        } else if (item.kind === 'effect') {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 3 * s;
            const r = 22 * s + Math.sin(t * 3) * 3 * s;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    Stone.Draw = {
        drawCharacter,
        drawWeaponShape,
        drawItemIcon,
        drawEffect,
        roundRect: rr,
        shade
    };
})();
