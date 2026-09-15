/* ============================================================
   TET Arcade — etusivun logiikka
   Lukee games.json ja rakentaa pelikortit. Ei riippuvuuksia.
   ============================================================ */

(function () {
    'use strict';

    var list = document.getElementById('games');
    var state = document.getElementById('state');
    var count = document.getElementById('gameCount');

    // Näytetään viesti ruudulla.
    function showState(message, isError) {
        if (!state) return;
        state.hidden = false;
        state.textContent = message;
        state.classList.toggle('state--error', Boolean(isError));
    }

    function hideState() {
        if (state) state.hidden = true;
    }

    // Turvallinen tekstin asetus: ei koskaan innerHTML:ää pelidatasta.
    function text(tag, className, content) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (content !== undefined && content !== null) el.textContent = content;
        return el;
    }

    // Tumma väri, jos games.json ei anna omaa accent-väriä.
    function accentOf(game) {
        return typeof game.accent === 'string' && /^#[0-9a-f]{3,8}$/i.test(game.accent)
            ? game.accent
            : '#63b3ed';
    }

    // Lyhyt tunnus kansikuvaan, esim. "Endless Runner" -> "ER".
    function initials(title) {
        var words = String(title || '').trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return '?';
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    // Pelin osoite: suhteellinen polku, joten arcade toimii myös
    // alihakemistosta tarjoiltuna.
    function playHref(path) {
        return String(path || '').replace(/^\/+/, '');
    }

    function buildCard(game, index) {
        var item = text('li', 'card');
        item.style.setProperty('--accent', accentOf(game));
        item.style.animationDelay = (index * 70) + 'ms';

        // Kansikuva
        var art = text('div', 'card__art');
        art.appendChild(text('span', 'card__glyph', initials(game.title)));
        art.appendChild(text('span', 'card__lines'));
        item.appendChild(art);

        // Tekstisisältö
        var body = text('div', 'card__body');
        var head = text('div', 'card__head');
        head.appendChild(text('h3', 'card__title', game.title || 'Nimetön peli'));
        body.appendChild(head);

        if (game.tagline) body.appendChild(text('p', 'card__tagline', game.tagline));
        if (game.description) body.appendChild(text('p', 'card__text', game.description));

        if (Array.isArray(game.tags) && game.tags.length) {
            var tags = text('ul', 'card__tags');
            game.tags.forEach(function (tag) {
                tags.appendChild(text('li', null, String(tag)));
            });
            body.appendChild(tags);
        }

        // Pelaa-painike
        var actions = text('div', 'card__actions');
        var play = text('a', 'play');
        play.href = playHref(game.path);
        play.setAttribute('aria-label', 'Pelaa: ' + (game.title || 'peli'));
        play.appendChild(text('span', null, 'Pelaa'));
        var arrow = text('span', 'play__arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        play.appendChild(arrow);
        actions.appendChild(play);
        body.appendChild(actions);

        item.appendChild(body);
        return item;
    }

    function render(games) {
        list.textContent = '';

        if (!Array.isArray(games) || games.length === 0) {
            showState('Ei vielä pelejä. Lisää ensimmäinen peli games.json-tiedostoon.');
            if (count) count.textContent = '';
            return;
        }

        var fragment = document.createDocumentFragment();
        games.forEach(function (game, index) {
            fragment.appendChild(buildCard(game, index));
        });
        list.appendChild(fragment);

        hideState();
        if (count) {
            count.textContent = games.length === 1
                ? '1 peli'
                : games.length + ' peliä';
        }
    }

    // Ladataan peliluettelo. Jos sivu avataan file://-osoitteesta, selain
    // estää fetchin — silloin kerrotaan miten sivu avataan oikein.
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
                render(data && data.games);
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
