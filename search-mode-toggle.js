// == TypingMind Extension: Search-mode toggle =============================
// v0.3 – 2025-10-13
(() => {

  const STORAGE_KEY     = 'TM_searchModeOn';
  const SEARCH_SUFFIX   = ':search';
  const SEND_BTN_SEL    = '[data-element-id="send-button"]'; 

  
  const log   = (...m) => console.log('[Search-mode]', ...m);
  const isOn  = ()    => localStorage.getItem(STORAGE_KEY) === 'true';
  const setOn = v     => localStorage.setItem(STORAGE_KEY, v);

 
  const nativeFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    try {
      if (typeof input === 'string' && /\/chat\/completions/.test(input) && init.body) {
        const body = JSON.parse(init.body);
        if (isOn()) {
          if (!body.model.endsWith(SEARCH_SUFFIX)) body.model += SEARCH_SUFFIX;
        } else {
          body.model = body.model.replace(new RegExp(SEARCH_SUFFIX + '$'), '');
        }
        init.body = JSON.stringify(body);
      }
    } catch (err) {
      log('fetch patch error', err);
    }
    return nativeFetch.call(this, input, init);
  };

 
  function makeButton(template) {
    const btn = document.createElement('button');
    btn.id    = 'tm-search-toggle';
    btn.className = template.className;   
    btn.style.marginRight = '4px';
    btn.textContent = '🔍';
    btn.title = 'Toggle :search sub-model (Alt+S)';
    const paint = () => {
      btn.style.backgroundColor = isOn() ? 'rgb(59 130 246)' : '';
      btn.style.color           = isOn() ? '#fff'            : '';
    };
    btn.onclick = () => { setOn(!isOn()); paint(); };
    paint();
    document.addEventListener('keydown', e => {
      if (e.altKey && e.key.toLowerCase() === 's') { btn.click(); }
    });
    return btn;
  }

 
  const observer = new MutationObserver(() => {
    const send = document.querySelector(SEND_BTN_SEL);
    if (send && !document.getElementById('tm-search-toggle')) {
      send.parentElement.insertBefore(makeButton(send), send);
      log('Toggle button injected');
    }
  });
  observer.observe(document.body, {subtree: true, childList: true});

  log('extension loaded');
})();
