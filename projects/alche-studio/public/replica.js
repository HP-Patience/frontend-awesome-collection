/** Small, editable accessibility layer; scene and navigation are the original public runtime. */
(() => {
  if (window.__alcheReplicaReady) return;
  window.__alcheReplicaReady = true;
  function enhancePage() {
    const main = document.querySelector('main');
    if (main) { main.id = 'main-content'; main.tabIndex = -1; }
    const logo = document.querySelector('header a[href="/"]');
    if (logo) logo.setAttribute('aria-label', 'Alche — Home');
    document.querySelectorAll('a[target="_blank"]').forEach(a => {
      a.rel = 'noopener noreferrer';
    });
    document.querySelectorAll('img:not([alt])').forEach(img => { img.alt = ''; });
  }
  const skip = document.createElement('a');
  skip.className = 'replica-skip';
  skip.href = '#main-content';
  skip.textContent = 'Skip to content';
  skip.dataset.noSwup = '';
  skip.addEventListener('click', event => {
    event.preventDefault();
    document.querySelector('main')?.focus({ preventScroll: true });
  });
  document.body.prepend(skip);
  const toggle = document.querySelector('.SideMenu__hamburger');
  const menu = document.querySelector('.SideMenu__menu');
  if (toggle && menu) {
    menu.id = 'mobile-navigation';
    toggle.setAttribute('aria-controls', menu.id);
    const syncMenu = () => {
      const open = toggle.dataset.open === 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      menu.inert = !open;
    };
    new MutationObserver(syncMenu).observe(toggle, { attributes: true, attributeFilter: ['data-open'] });
    syncMenu();
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.dataset.open === 'true') {
        toggle.click();
        toggle.focus();
      }
    });
  }
  enhancePage();
  document.addEventListener('astro:page-load', enhancePage);
})();
