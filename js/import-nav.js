(function() {
    const CACHE_KEY = 'navHTML';

    function initNav() {
        // Initialize hamburger menu functionality after nav is inserted
        const hamburger = document.querySelector('.hamburger');
        const nav = document.querySelector('.site-nav');
        const socialIcons = document.querySelector('.social-icons');
        const headerWrapper = document.querySelector('.site-nav-wrapper');
        const socialLinks = socialIcons ? Array.from(socialIcons.querySelectorAll('a')) : [];
        const htmlEl = document.documentElement;

        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });

        document.addEventListener('click', function(event) {
            if (!hamburger.contains(event.target) && !nav.contains(event.target)) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
            }
        });

        // Mobile-specific layout adjustments
        function isMobile() {
            return window.innerWidth <= 768;
        }

        function isHomePage() {
            const path = window.location.pathname || '';
            return path === '/' || path.endsWith('/index.html');
        }

        function getPageBackgroundColor() {
            try {
                const rootStyles = window.getComputedStyle(htmlEl);
                let bg = rootStyles.getPropertyValue('--background').trim();
                if (!bg) {
                    bg = rootStyles.getPropertyValue('--background-color').trim();
                }
                if (bg) return bg;
                const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                return bodyBg || '#ffffff';
            } catch (_) {
                return '#ffffff';
            }
        }

        function applyHeaderMode() {
            if (!headerWrapper) return;
            const onHome = isHomePage();
            const mobile = isMobile();
            const isDarkTheme = htmlEl.getAttribute('data-theme') === 'dark';
            const pageBg = getPageBackgroundColor();

            if (onHome) {
                // Homepage: fully transparent, no blur
                headerWrapper.style.setProperty('backdrop-filter', 'none', 'important');
                headerWrapper.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                headerWrapper.style.setProperty('background-color', 'transparent', 'important');
                headerWrapper.style.setProperty('border-bottom', 'none', 'important');
            } else {
                if (mobile) {
                    // Non-home pages on mobile: opaque header to prevent content showing through
                    headerWrapper.style.setProperty('backdrop-filter', 'none', 'important');
                    headerWrapper.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                    headerWrapper.style.setProperty('background-color', isDarkTheme ? '#121212' : pageBg, 'important');
                    headerWrapper.style.setProperty('border-bottom', '1px solid var(--border-background-color)', 'important');
                    // Match the slide-down mobile menu background as well
                    if (nav) {
                        nav.style.setProperty('background-color', isDarkTheme ? '#121212' : pageBg, 'important');
                    }
                } else {
                    // Desktop non-home: allow existing styles (e.g., subtle blur) unless overridden elsewhere
                    // Clear mobile-only overrides
                    headerWrapper.style.removeProperty('background-color');
                    headerWrapper.style.removeProperty('border-bottom');
                    headerWrapper.style.removeProperty('backdrop-filter');
                    headerWrapper.style.removeProperty('-webkit-backdrop-filter');
                    if (nav) {
                        nav.style.removeProperty('background-color');
                    }
                }
            }
        }

        function mountMobileHeader() {
            if (!nav || !socialIcons) return;
            // Ensure a container exists inside nav for mobile social links
            let mobileSocial = nav.querySelector('.mobile-social');
            if (!mobileSocial) {
                mobileSocial = document.createElement('div');
                mobileSocial.className = 'mobile-social';
                nav.appendChild(mobileSocial);
            }

            if (isMobile()) {
                // Move the social links into the nav's mobile-social container
                socialLinks.forEach(link => {
                    if (link.parentElement !== mobileSocial) {
                        mobileSocial.appendChild(link);
                    }
                });
            } else {
                // On desktop, move links back into the header
                socialLinks.forEach(link => {
                    if (link.parentElement !== socialIcons) {
                        socialIcons.appendChild(link);
                    }
                });
            }
        }

        mountMobileHeader();
        applyHeaderMode();
        window.addEventListener('resize', function() {
            mountMobileHeader();
            applyHeaderMode();
        });
    }

    function injectNav(html) {
        document.body.insertAdjacentHTML('afterbegin', html);
        initNav();
    }

    function fetchNav(onLoaded) {
        fetch('/templates/nav.html')
            .then(response => response.text())
            .then(html => {
                try { sessionStorage.setItem(CACHE_KEY, html); } catch (e) {}
                if (onLoaded) onLoaded(html);
            })
            .catch(error => console.error('Error loading navigation:', error));
    }

    function start() {
        // build.py writes the header into each page, so usually it is already here
        if (document.querySelector('.site-nav-wrapper')) {
            initNav();
            return;
        }
        let cached = null;
        try { cached = sessionStorage.getItem(CACHE_KEY); } catch (e) {}
        if (cached) {
            // Nav is already in this tab's cache: inject before first paint so it
            // doesn't pop in, then refresh the cache in the background so edits to
            // nav.html appear on the next page view.
            injectNav(cached);
            fetchNav(null);
        } else {
            fetchNav(injectNav);
        }
    }

    // Script tags for this file sit inside <body>, so injection can happen
    // synchronously during parsing. DOMContentLoaded fallback covers the case
    // where it's ever included from <head>.
    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }
})();
