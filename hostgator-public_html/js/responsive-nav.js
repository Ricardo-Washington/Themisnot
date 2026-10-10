(function () {
    function setup(nav) {
        var links = nav.querySelector('.nav-links, .nav-actions');
        if (!links || nav.querySelector('.mobile-menu-btn, .mobile-menu-button')) return;

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'rn-toggle';
        button.setAttribute('aria-label', 'Abrir menu');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '&#9776;';
        links.parentNode.insertBefore(button, links);
        nav.classList.add('rn-ready');

        function setOpen(open) {
            nav.classList.toggle('rn-open', open);
            button.setAttribute('aria-expanded', String(open));
            button.innerHTML = open ? '&#10005;' : '&#9776;';
        }

        button.addEventListener('click', function () {
            setOpen(!nav.classList.contains('rn-open'));
        });
        links.addEventListener('click', function (event) {
            if (event.target.closest('a')) setOpen(false);
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) setOpen(false);
        });
    }

    function init() {
        document.querySelectorAll('.navbar').forEach(setup);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
