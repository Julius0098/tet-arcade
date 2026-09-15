/* ============================================================
   TET Arcade — etusivun logiikka
   Lukee games.json ja rakentaa pelikortit. Ei riippuvuuksia.

   Pelien kansikuvat ovat ohjelmallisesti piirrettyjä SVG-maisemia:
   yhtään kuvatiedostoa ei tarvita.
   ============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------
       Kansikuvat
       Jokainen maisema on vektoripiirros, joka skaalautuu joka
       kokoon. Värit tulevat pelin accent-väristä (--accent).
       ------------------------------------------------------------ */

    // Taivaan liukuväri: kylmä ylhäällä, accent-väri horisontissa.
    function skyGradient(id) {
        return '<defs>'
            + '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
            + '<stop offset="0" stop-color="#0a1024"/>'
            + '<stop offset="0.45" stop-color="#1b2a4d"/>'
            + '<stop offset="0.8" stop-color="var(--accent)" stop-opacity="0.55"/>'
            + '<stop offset="1" stop-color="#f0bb85" stop-opacity="0.9"/>'
            + '</linearGradient>'
            + '<radialGradient id="' + id + '-sun" cx="0.5" cy="0.5" r="0.5">'
            + '<stop offset="0" stop-color="#ffe3ac" stop-opacity="0.95"/>'
            + '<stop offset="0.55" stop-color="#ffd08a" stop-opacity="0.35"/>'
            + '<stop offset="1" stop-color="#ffd08a" stop-opacity="0"/>'
            + '</radialGradient>'
            + '<linearGradient id="' + id + '-gnd" x1="0" y1="0" x2="0" y2="1">'
            + '<stop offset="0" stop-color="#3f8a58"/>'
            + '<stop offset="1" stop-color="#17301f"/>'
            + '</linearGradient>'
            + '</defs>';
    }

    // Maisemat. Jokainen funktio saa yksilöivän id:n liukuväreille.
    var SCENES = {
        // Juoksijan maisema: iltataivas, vuoret, metsä ja ruohoinen maa.
        runner: function (id) {
            return skyGradient(id)
                + '<rect width="320" height="140" fill="url(#' + id + ')"/>'
                + '<circle cx="246" cy="92" r="54" fill="url(#' + id + '-sun)"/>'
                + '<circle cx="246" cy="92" r="13" fill="#ffe3ac" opacity="0.92"/>'
                // Vuoret
                + '<path d="M0 108 L46 62 L74 88 L112 54 L150 96 L186 70 L224 104 L268 66 L320 108 L320 140 L0 140 Z" fill="#2b3a5c" opacity="0.95"/>'
                // Metsän reuna
                + '<path d="M0 116 Q16 96 32 116 Q48 98 64 116 Q80 94 96 116 Q112 100 128 116 Q144 92 160 116 Q176 100 192 116 Q208 96 224 116 Q240 100 256 116 Q272 94 288 116 Q304 100 320 116 L320 140 L0 140 Z" fill="#1a2638"/>'
                + '<path d="M0 124 Q20 112 40 124 Q60 110 80 124 Q100 112 120 124 Q140 110 160 124 Q180 112 200 124 Q220 110 240 124 Q260 112 280 124 Q300 110 320 124 L320 140 L0 140 Z" fill="#131d2b"/>'
                // Ruohoinen maa
                + '<rect y="124" width="320" height="16" fill="url(#' + id + '-gnd)"/>'
                + '<rect y="123" width="320" height="2.5" fill="#7fd08f" opacity="0.75"/>'
                // Rotko maassa
                + '<path d="M138 125 L178 125 L174 140 L142 140 Z" fill="#070c08"/>'
                // Kerros, jolla on ruohokansi
                + '<rect x="200" y="100" width="62" height="9" rx="3" fill="#2c6540"/>'
                + '<rect x="200" y="99" width="62" height="2.5" rx="1.2" fill="#8adaa0" opacity="0.85"/>'
                // Kolikot kerroksen yllä — tumma reunus erottaa ne auringon hehkusta
                + '<g stroke="#7a4d0c" stroke-width="1.8" fill="#f7c948">'
                + '<circle cx="216" cy="85" r="6.5"/>'
                + '<circle cx="232" cy="85" r="6.5"/>'
                + '<circle cx="248" cy="85" r="6.5"/>'
                + '</g>'
                + '<g fill="#fff3cd">'
                + '<circle cx="214" cy="83" r="1.9"/>'
                + '<circle cx="230" cy="83" r="1.9"/>'
                + '<circle cx="246" cy="83" r="1.9"/>'
                + '</g>'
                // Kaktus
                + '<g fill="#2f8f5b">'
                + '<rect x="66" y="98" width="9" height="26" rx="3.5"/>'
                + '<rect x="58" y="104" width="6" height="13" rx="3"/>'
                + '<rect x="77" y="100" width="6" height="15" rx="3"/>'
                + '</g>'
                // Puinen laatikko
                + '<rect x="112" y="108" width="17" height="16" rx="3" fill="#a4713c"/>'
                + '<rect x="112" y="108" width="17" height="4" rx="2" fill="#c48d4f" opacity="0.7"/>'
                // Juoksija maan pinnalla
                + '<g transform="translate(26 90)">'
                + '<rect x="3" y="0" width="12" height="11" rx="3" fill="#4fd1a5"/>'
                + '<rect x="4.5" y="12" width="9" height="12" rx="3" fill="#3fae86"/>'
                + '<rect x="1" y="25" width="6" height="7" rx="2.5" fill="#3fae86"/>'
                + '<rect x="11" y="24" width="6" height="8" rx="2.5" fill="#3fae86"/>'
                + '</g>';
        },

        // Matopeli: ruudukko, mato ja omena.
        snake: function (id) {
            var cells = '';
            for (var x = 20; x < 320; x += 20) {
                cells += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="140" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>';
            }
            for (var y = 20; y < 140; y += 20) {
                cells += '<line x1="0" y1="' + y + '" x2="320" y2="' + y + '" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>';
            }
            return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">'
                + '<stop offset="0" stop-color="#07130d"/><stop offset="1" stop-color="#0c2418"/>'
                + '</linearGradient></defs>'
                + '<rect width="320" height="140" fill="url(#' + id + ')"/>'
                + cells
                + '<g fill="var(--accent)">'
                + '<rect x="150" y="60" width="38" height="38" rx="9"/>'
                + '<rect x="150" y="98" width="38" height="38" rx="9"/>'
                + '<rect x="112" y="98" width="38" height="38" rx="9" opacity="0.85"/>'
                + '<rect x="74" y="98" width="38" height="38" rx="9" opacity="0.7"/>'
                + '</g>'
                + '<circle cx="169" cy="79" r="4.5" fill="#04140c"/>'
                + '<circle cx="183" cy="79" r="4.5" fill="#04140c"/>'
                + '<g><circle cx="248" cy="86" r="13" fill="#e5484d"/>'
                + '<path d="M248 74 q5 -7 10 -6 q-3 6 -9 7 Z" fill="#3fae86"/>'
                + '<circle cx="243" cy="82" r="3.4" fill="#ffffff" opacity="0.45"/></g>';
        },

        // Pallo ja mailat.
        pong: function (id) {
            return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
                + '<stop offset="0" stop-color="#050b18"/><stop offset="1" stop-color="#0d1a33"/>'
                + '</linearGradient></defs>'
                + '<rect width="320" height="140" fill="url(#' + id + ')"/>'
                + '<line x1="160" y1="0" x2="160" y2="140" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="10 12"/>'
                + '<rect x="30" y="48" width="7" height="44" rx="3.5" fill="var(--accent)"/>'
                + '<rect x="283" y="34" width="7" height="44" rx="3.5" fill="var(--accent)"/>'
                + '<circle cx="176" cy="70" r="8" fill="#ffffff"/>'
                + '<g fill="#ffffff" opacity="0.16" font-family="monospace" font-size="26" font-weight="700">'
                + '<text x="112" y="34">3</text><text x="192" y="34">5</text></g>';
        },

        // Avaruus: tähdet ja alukset.
        space: function (id) {
            var stars = '';
            var seed = 7;
            function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
            for (var i = 0; i < 60; i++) {
                var sx = (rnd() * 320).toFixed(1);
                var sy = (rnd() * 140).toFixed(1);
                var sr = (0.5 + rnd() * 1.3).toFixed(2);
                var so = (0.25 + rnd() * 0.7).toFixed(2);
                stars += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="#ffffff" opacity="' + so + '"/>';
            }
            var aliens = '';
            for (var row = 0; row < 2; row++) {
                for (var col = 0; col < 4; col++) {
                    var ax = 92 + col * 40;
                    var ay = 26 + row * 30;
                    aliens += '<g transform="translate(' + ax + ' ' + ay + ')" fill="var(--accent)" opacity="' + (row === 0 ? 0.95 : 0.7) + '">'
                        + '<rect x="0" y="4" width="18" height="9" rx="4"/>'
                        + '<rect x="-5" y="0" width="6" height="6" rx="2"/>'
                        + '<rect x="17" y="0" width="6" height="6" rx="2"/>'
                        + '<circle cx="5.5" cy="8" r="1.9" fill="#05101f"/>'
                        + '<circle cx="12.5" cy="8" r="1.9" fill="#05101f"/>'
                        + '</g>';
                }
            }
            return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
                + '<stop offset="0" stop-color="#05060f"/><stop offset="1" stop-color="#111a3a"/>'
                + '</linearGradient></defs>'
                + '<rect width="320" height="140" fill="url(#' + id + ')"/>'
                + stars + aliens
                + '<g transform="translate(24 108)" fill="#7fe3b0">'
                + '<path d="M0 12 L8 0 L16 12 Z"/><rect x="5" y="10" width="6" height="9" rx="2"/>'
                + '</g>';
        },

        // Yleinen arcade-maisema: pelihalli ja neonvalot.
        arcade: function (id) {
            var lights = '';
            for (var i = 0; i < 9; i++) {
                lights += '<circle cx="' + (26 + i * 34) + '" cy="22" r="4" fill="var(--accent)" opacity="' + (0.35 + (i % 3) * 0.22).toFixed(2) + '"/>';
            }
            return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
                + '<stop offset="0" stop-color="#120a26"/><stop offset="1" stop-color="#06060f"/>'
                + '</linearGradient></defs>'
                + '<rect width="320" height="140" fill="url(#' + id + ')"/>'
                + lights
                + '<rect y="112" width="320" height="28" fill="#0b0b18"/>'
                + '<g fill="var(--accent)" opacity="0.85">'
                + '<rect x="96" y="70" width="44" height="42" rx="6"/>'
                + '<rect x="106" y="80" width="24" height="16" rx="3" fill="#0b0b18"/>'
                + '<rect x="114" y="104" width="8" height="8" rx="2"/>'
                + '</g>'
                + '<g fill="var(--accent)" opacity="0.45">'
                + '<rect x="182" y="80" width="40" height="32" rx="6"/>'
                + '<rect x="190" y="88" width="24" height="12" rx="3" fill="#0b0b18"/>'
                + '</g>';
        }
    };

    // Palauttaa kansikuvan SVG:nä. Tuntematon teema putoaa arcadeen.
    function sceneSvg(name) {
        var build = SCENES[name] || SCENES.arcade;
        return '<svg class="card__svg" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice"'
            + ' role="img" aria-hidden="true" focusable="false">'
            + build('sc-' + name)
            + '</svg>';
    }

    /* ------------------------------------------------------------
       Apurit
       ------------------------------------------------------------ */

    var listEl = document.getElementById('games');
    var stateEl = document.getElementById('state');
    var countEl = document.getElementById('resultCount');
    var statsEl = document.getElementById('stats');
    var searchEl = document.getElementById('search');
    var searchWrap = document.getElementById('searchWrap');

    var allGames = [];

    function el(tag, className, content) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined && content !== null) node.textContent = content;
        return node;
    }

    function showState(message, isError) {
        if (!stateEl) return;
        stateEl.hidden = false;
        stateEl.textContent = message;
        stateEl.classList.toggle('state--error', Boolean(isError));
    }

    function hideState() {
        if (stateEl) stateEl.hidden = true;
    }

    function accentOf(game) {
        return typeof game.accent === 'string' && /^#[0-9a-f]{3,8}$/i.test(game.accent)
            ? game.accent
            : '#63b3ed';
    }

    // Pelin osoite suhteellisena, jotta arcade toimii myös alihakemistosta.
    function playHref(path) {
        return String(path || '').replace(/^\/+/, '');
    }

    /* ------------------------------------------------------------
       Kortin rakentaminen
       ------------------------------------------------------------ */

    function buildCard(game, index) {
        var item = el('li', 'card');
        item.style.setProperty('--accent', accentOf(game));
        item.style.animationDelay = (index * 80) + 'ms';

        // Kansikuva
        var scene = el('div', 'card__scene');
        scene.innerHTML = sceneSvg(game.scene || 'arcade');   // oma vakio-SVG
        scene.appendChild(el('div', 'card__fade'));

        if (game.kicker) scene.appendChild(el('span', 'card__kicker', game.kicker));
        if (game.status) scene.appendChild(el('span', 'card__status', game.status));

        item.appendChild(scene);

        // Tekstisisältö
        var body = el('div', 'card__body');
        body.appendChild(el('h3', 'card__title', game.title || 'Nimetön peli'));
        if (game.tagline) body.appendChild(el('p', 'card__tagline', game.tagline));
        if (game.description) body.appendChild(el('p', 'card__text', game.description));

        if (Array.isArray(game.tags) && game.tags.length) {
            var tags = el('ul', 'card__tags');
            game.tags.forEach(function (tag) {
                tags.appendChild(el('li', null, String(tag)));
            });
            body.appendChild(tags);
        }

        // Pelaa-painike
        var actions = el('div', 'card__actions');
        var play = el('a', 'play');
        play.href = playHref(game.path);
        play.setAttribute('aria-label', 'Pelaa: ' + (game.title || 'peli'));
        play.appendChild(el('span', null, 'Pelaa'));

        var arrow = el('span', 'play__arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        play.appendChild(arrow);

        actions.appendChild(play);
        body.appendChild(actions);
        item.appendChild(body);

        return item;
    }

    /* ------------------------------------------------------------
       Lukurivi
       ------------------------------------------------------------ */

    function buildStats(games) {
        if (!statsEl) return;
        statsEl.textContent = '';

        var tagCount = {};
        games.forEach(function (game) {
            (game.tags || []).forEach(function (tag) {
                tagCount[tag] = true;
            });
        });

        var items = [
            { value: String(games.length), label: games.length === 1 ? 'Peli' : 'Peliä' },
            { value: String(Object.keys(tagCount).length), label: 'Aihetta' },
            { value: '0', label: 'Riippuvuutta' }
        ];

        items.forEach(function (item) {
            var li = el('li', 'stats__item');
            li.appendChild(el('span', 'stats__value', item.value));
            li.appendChild(el('span', 'stats__label', item.label));
            statsEl.appendChild(li);
        });
    }

    /* ------------------------------------------------------------
       Haku
       ------------------------------------------------------------ */

    function matches(game, query) {
        if (!query) return true;
        var haystack = [
            game.title,
            game.tagline,
            game.description,
            game.kicker,
            (game.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return haystack.indexOf(query) !== -1;
    }

    function render(games) {
        listEl.textContent = '';

        var query = searchEl ? searchEl.value.trim().toLowerCase() : '';
        var visible = games.filter(function (game) {
            return matches(game, query);
        });

        if (visible.length === 0) {
            if (games.length === 0) {
                showState('Ei vielä pelejä. Lisää ensimmäinen peli games.json-tiedostoon.');
            } else {
                showState('Ei hakutuloksia haulle “' + query + '”.');
            }
            if (countEl) countEl.textContent = '';
            return;
        }

        hideState();

        var fragment = document.createDocumentFragment();
        visible.forEach(function (game, index) {
            fragment.appendChild(buildCard(game, index));
        });
        listEl.appendChild(fragment);

        if (countEl) {
            countEl.textContent = query
                ? visible.length + ' / ' + games.length + ' peliä'
                : (games.length === 1 ? '1 peli' : games.length + ' peliä');
        }
    }

    /* ------------------------------------------------------------
       Lataus
       ------------------------------------------------------------ */

    function load() {
        if (typeof fetch !== 'function') {
            showState('Selain ei tue peliluettelon lataamista.', true);
            return;
        }

        fetch('games.json', { cache: 'no-cache' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                allGames = (data && Array.isArray(data.games)) ? data.games : [];

                buildStats(allGames);
                render(allGames);

                // Haku näytetään vasta kun pelejä on enemmän kuin yksi.
                if (searchWrap && searchEl && allGames.length > 1) {
                    searchWrap.hidden = false;
                    searchEl.addEventListener('input', function () {
                        render(allGames);
                    });
                }
            })
            .catch(function (error) {
                var isFile = location.protocol === 'file:';
                showState(
                    isFile
                        ? 'Peliluetteloa ei voi ladata file://-osoitteesta. Käynnistä palvelin: node server.mjs'
                        : 'Peliluettelon lataus epäonnistui (' + error.message + ').',
                    true
                );
            });
    }

    load();
}());
