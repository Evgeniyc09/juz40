
document.addEventListener("DOMContentLoaded", (event) => {
	popupWindow()
});
function popupWindow() {
  const ScrollLock = (() => {
    let locked = false, scrollTop = 0;
    let bodyOrigPaddingRight = '';
    const propsToClear = ['position','top','left','right','width','overflow'];

    const getCompensators = () => document.querySelectorAll('[data-scrollbar-compensate]');

    const addScrollbarCompensation = (px) => {
      bodyOrigPaddingRight = document.body.style.paddingRight || '';
      const bodyComputedPR = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = (bodyComputedPR + px) + 'px';

      getCompensators().forEach(el => {
        el.dataset.origPr = el.style.paddingRight || '';
        const pr = parseFloat(getComputedStyle(el).paddingRight) || 0;
        el.style.paddingRight = (pr + px) + 'px';
      });
    };

    const removeScrollbarCompensation = () => {
      if (bodyOrigPaddingRight) {
        document.body.style.paddingRight = bodyOrigPaddingRight;
      } else {
        document.body.style.removeProperty('padding-right');
      }
      bodyOrigPaddingRight = '';

      getCompensators().forEach(el => {
        const orig = el.dataset.origPr || '';
        if (orig) {
          el.style.paddingRight = orig;
        } else {
          el.style.removeProperty('padding-right');
        }
        delete el.dataset.origPr;
      });
    };

    return {
      lock() {
        if (locked) return;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) addScrollbarCompensation(scrollbarWidth);

        scrollTop = window.scrollY || document.documentElement.scrollTop;

        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollTop}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        document.documentElement.classList.add('is-scroll-locked'); // на случай CSS-хуков
        locked = true;
      },
      unlock() {
        if (!locked) return;

        propsToClear.forEach(p => document.body.style.removeProperty(p));
        removeScrollbarCompensation();

        document.documentElement.classList.remove('is-scroll-locked');

        window.scrollTo(0, scrollTop);
        locked = false;
      }
    };
  })();

  const Popup = {
    open(id) {
      const el = document.getElementById(id);
      if (!el || el.classList.contains('active')) return;

      el.classList.remove('closing');
      el.classList.add('active');
      el.setAttribute('aria-hidden', 'false');

      const content = el.querySelector('.popup-window__content');
      if (content) setTimeout(() => content.focus(), 0);

      if (!document.querySelector('.popup-window.active:not(#' + CSS.escape(id) + ')')) {
        ScrollLock.lock();
      }
    },
    close(id) {
      const el = document.getElementById(id);
      if (!el || !el.classList.contains('active')) return;

      el.classList.add('closing');
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');

      const onEnd = (e) => {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        el.classList.remove('closing');

        if (!document.querySelector('.popup-window.active')) {
          ScrollLock.unlock();
        }
      };

      let transitionHandled = false;
      const safety = setTimeout(() => {
        if (!transitionHandled) {
          el.classList.remove('closing');
          if (!document.querySelector('.popup-window.active')) {
            ScrollLock.unlock();
          }
        }
      }, 50);

      el.addEventListener('transitionend', (ev) => {
        transitionHandled = true;
        clearTimeout(safety);
        onEnd(ev);
      }, { once: true });
    },
    closeAll() {
      document.querySelectorAll('.popup-window.active').forEach(el => this.close(el.id));
    }
  };

  window.Popup = Popup;

  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-popup-open]');
    const closeBtn = e.target.closest('[data-popup-close]');

    if (openBtn) {
      e.preventDefault();
      const id = openBtn.getAttribute('data-popup-open');
      if (id) Popup.open(id);
    }

    if (closeBtn) {
      e.preventDefault();
      const popup = closeBtn.closest('.popup-window');
      if (popup?.id) Popup.close(popup.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const actives = document.querySelectorAll('.popup-window.active');
      const last = actives[actives.length - 1];
      if (last?.id) Popup.close(last.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const actives = document.querySelectorAll('.popup-window.active');
    if (!actives.length) return;
    const content = actives[actives.length - 1].querySelector('.popup-window__content');
    if (!content) return;

    const focusables = content.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });
}