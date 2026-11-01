/* Instagram mute hitbox compatibility fix for Controls for Instagram Videos.
 * Keeps Instagram's visible audio icon and forwards clicks from a small,
 * transparent hitbox when the video/overlays intercept the pointer.
 */
(() => {
    'use strict';

    const HITBOX_CLASS = 'ctrls4insta-audio-hitbox';
    const audioLabelPattern = /audio|mute|unmute|volume|sound|som|silenci|sonido|lautst|sonor|sonido/i;
    const hitboxes = new Map();

    function norm(value) {
        return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function visibleVideoRect(video) {
        const r = video.getBoundingClientRect();
        return r.width >= 120 && r.height >= 120 &&
            r.right > 0 && r.left < window.innerWidth &&
            r.bottom > 0 && r.top < window.innerHeight ? r : null;
    }

    function findSpeaker(videoRect, icons) {
        let winner = null;
        let bestScore = -Infinity;

        for (const svg of icons) {
            const rect = svg.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10 ||
                rect.width > 65 || rect.height > 65) continue;

            if (rect.left < videoRect.left - 5 || rect.right > videoRect.right + 5 ||
                rect.top < videoRect.top - 5 || rect.bottom > videoRect.bottom + 5) continue;

            const iconLabel = [svg, svg.parentElement,
                svg.closest('button, [role="button"], [tabindex]')]
                .filter(Boolean)
                .map(el => norm([
                    el.getAttribute('aria-label'),
                    el.getAttribute('title'),
                    el.querySelector('title')?.textContent
                ].filter(Boolean).join(' '))).join(' ');
            const labelled = audioLabelPattern.test(iconLabel);

            // Fallback for unlabeled Instagram speaker icons: lower-right corner.
            const nearCorner = rect.right > videoRect.right - 85 &&
                rect.bottom > videoRect.bottom - 85;
            if (!labelled && !nearCorner) continue;

            const distance = Math.abs(videoRect.right - rect.right) +
                Math.abs(videoRect.bottom - rect.bottom);
            const score = (labelled ? 1000 : 0) - distance;
            if (score > bestScore) {
                winner = { svg, rect };
                bestScore = score;
            }
        }
        return winner;
    }

    function createHitbox() {
        const hitbox = document.createElement('span');
        hitbox.className = HITBOX_CLASS;
        hitbox.title = 'Ativar/desativar audio do Instagram';
        hitbox.style.cssText = [
            'position:fixed', 'display:none', 'box-sizing:border-box',
            'padding:0', 'margin:0', 'border:0', 'background:transparent',
            'pointer-events:auto!important', 'cursor:pointer',
            'z-index:2147483647!important'
        ].join(';');

        let target = null;
        hitbox.addEventListener('click', event => {
            event.stopPropagation();
            event.preventDefault();
            if (!target || !target.isConnected) return;
            // Dispatch on the actual SVG. The event bubbles to Instagram's
            // original React click handler even if its overlay ignores pointers.
            target.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true, composed: true,
                view: window
            }));
        });
        hitbox.setTarget = svg => { target = svg; };
        document.body.appendChild(hitbox);
        return hitbox;
    }

    function sync() {
        if (!document.body) return;
        const videos = [...document.querySelectorAll('video')];
        const icons = [...document.querySelectorAll('svg:not(.' + HITBOX_CLASS + ')')];
        const active = new Set();

        for (const video of videos) {
            const videoRect = visibleVideoRect(video);
            if (!videoRect) continue;
            const candidate = findSpeaker(videoRect, icons);
            if (!candidate) continue;
            active.add(video);
            let hitbox = hitboxes.get(video);
            if (!hitbox) {
                hitbox = createHitbox();
                hitboxes.set(video, hitbox);
            }

            // Only the speaker's immediate region intercepts input.
            const w = Math.max(30, Math.min(46, candidate.rect.width + 14));
            const h = Math.max(30, Math.min(46, candidate.rect.height + 14));
            hitbox.style.left = `${candidate.rect.left + (candidate.rect.width - w) / 2}px`;
            hitbox.style.top = `${candidate.rect.top + (candidate.rect.height - h) / 2}px`;
            hitbox.style.width = `${w}px`;
            hitbox.style.height = `${h}px`;
            hitbox.style.display = 'block';
            hitbox.setTarget(candidate.svg);
        }

        for (const [video, hitbox] of hitboxes) {
            if (!active.has(video)) {
                hitbox.remove();
                hitboxes.delete(video);
            }
        }
    }

    // The extension already polls videos. This independent fix follows reels,
    // scrolling, and overlays without depending on their obfuscated class names.
    const start = () => {
        sync();
        window.setInterval(sync, 700);
        window.addEventListener('scroll', sync, { passive: true, capture: true });
        window.addEventListener('resize', sync, { passive: true });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
