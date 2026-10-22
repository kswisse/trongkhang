/* Arctic backdrop: photo layer, veil, falling snow, victory ribbon badge. */
(function () {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function injectBackdrop() {
        if (!document.querySelector('.arctic-bg')) {
            const bg = document.createElement('div');
            bg.className = 'arctic-bg';
            bg.setAttribute('aria-hidden', 'true');
            document.body.appendChild(bg);
        }
        if (!document.querySelector('.arctic-veil')) {
            const veil = document.createElement('div');
            veil.className = 'arctic-veil';
            veil.setAttribute('aria-hidden', 'true');
            document.body.appendChild(veil);
        }
        if (!document.querySelector('.victory-badge')) {
            const badge = document.createElement('a');
            badge.className = 'victory-badge';
            badge.href = '/';
            badge.title = '50 years of Victory, 1945-1995';
            badge.innerHTML = '<span class="ribbon"></span><span class="label">50 лет Победы · 1945–1995</span>';
            document.body.appendChild(badge);
        }
    }

    function snow() {
        if (reduced) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'snow';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let flakes = [];

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const count = Math.min(140, Math.round(window.innerWidth / 9));
            flakes = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: 0.6 + Math.random() * 2.2,
                v: 0.25 + Math.random() * 0.8,
                d: (Math.random() - 0.5) * 0.5,
                o: 0.25 + Math.random() * 0.55,
            }));
        }

        function frame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const f of flakes) {
                f.y += f.v;
                f.x += f.d;
                if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width; }
                if (f.x < -5) f.x = canvas.width + 5;
                if (f.x > canvas.width + 5) f.x = -5;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
                ctx.fill();
            }
            requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(frame);
    }

    function boot() {
        injectBackdrop();
        snow();
    }

    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
})();
