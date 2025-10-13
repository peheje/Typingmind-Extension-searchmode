// == TypingMind Extension: Search-mode toggle =============================
// v1.5 – 2025-10-13
(() => {

  const STORAGE_KEY           = 'TM_searchModeOn';
  const MODELS_SEARCH_SUPPORT = 'TM_modelsSearchSupport';
  const MODEL_NAME_TO_ID      = 'TM_modelNameToId';
  const SEARCH_SUFFIX         = ':search';

  
  const log   = (...m) => console.log('[Search-mode]', ...m);
  const isOn  = ()    => localStorage.getItem(STORAGE_KEY) === 'true';
  const setOn = v     => localStorage.setItem(STORAGE_KEY, v);
  
  const getModelNameMapping = () => {
    const data = localStorage.getItem(MODEL_NAME_TO_ID);
    return data ? JSON.parse(data) : {};
  };
  const setModelNameMapping = (displayName, modelId) => {
    const mapping = getModelNameMapping();
    mapping[displayName] = modelId;
    localStorage.setItem(MODEL_NAME_TO_ID, JSON.stringify(mapping));
    log(`🔗 Mapped "${displayName}" → "${modelId}"`);
  };
  const getModelIdFromName = (displayName) => {
    const mapping = getModelNameMapping();
    return mapping[displayName] || null;
  };

  const getSearchSupportedModels = () => {
    const data = localStorage.getItem(MODELS_SEARCH_SUPPORT);
    return data ? JSON.parse(data) : {};
  };
  const setModelSearchSupport = (modelId, supported) => {
    const models = getSearchSupportedModels();
    models[modelId] = supported;
    localStorage.setItem(MODELS_SEARCH_SUPPORT, JSON.stringify(models));
    log(`✅ Model "${modelId}" search support set to:`, supported);
    setTimeout(checkAndUpdateSwitch, 200);
  };
  const isModelSearchSupported = (modelId) => {
    if (!modelId) return false;
    return getSearchSupportedModels()[modelId] === true;
  };

  const getCurrentModelFromButton = () => {
    const buttons = document.querySelectorAll('button[id^="headlessui-menu-button-"]');
    
    for (const button of buttons) {
      const modelSpan = button.querySelector('span.truncate');
      if (modelSpan) {
        const displayName = modelSpan.textContent?.trim();
        if (displayName) {
          const modelId = getModelIdFromName(displayName);
          if (modelId) {
            log('🎯 Found model:', displayName, '→', modelId);
            return modelId;
          } else {
            log('⚠️ Display name found but no mapping:', displayName);
          }
        }
      }
    }
    return null;
  };

  const getCurrentModel = () => {
    try {
      const model = getCurrentModelFromButton();
      if (model) return model;
      
      log('⚠️ No model detected from button');
    } catch (err) {
      log('❌ Error getting current model', err);
    }
    return null;
  };

 
  const nativeFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    try {
      if (typeof input === 'string' && /\/chat\/completions/.test(input) && init.body) {
        const body = JSON.parse(init.body);
        const originalModel = body.model;
        
        if (isOn()) {
          if (!body.model.endsWith(SEARCH_SUFFIX)) {
            body.model += SEARCH_SUFFIX;
            log('🔍 Added :search suffix:', originalModel, '→', body.model);
          }
        } else {
          body.model = body.model.replace(new RegExp(SEARCH_SUFFIX + '$'), '');
          if (originalModel !== body.model) {
            log('🔍 Removed :search suffix:', originalModel, '→', body.model);
          }
        }
        init.body = JSON.stringify(body);
      }
    } catch (err) {
      log('❌ fetch patch error', err);
    }
    return nativeFetch.call(this, input, init);
  };

 
  function makeSwitch() {
    const container = document.createElement('div');
    container.id = 'tm-search-toggle-container';
    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
    `;

    const label = document.createElement('span');
    label.id = 'tm-search-icon';
    label.textContent = '🔍';
    label.style.cssText = `
      font-size: 16px;
      user-select: none;
      transition: all 0.3s;
    `;

    const switchWrapper = document.createElement('label');
    switchWrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;
    `;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isOn();
    input.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;

    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      border-radius: 24px;
      transition: 0.3s;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.3s;
    `;
    slider.appendChild(knob);

    const updateSwitch = () => {
      const active = isOn();
      input.checked = active;
      slider.style.backgroundColor = active ? 'rgb(59, 130, 246)' : '#ccc';
      knob.style.transform = active ? 'translateX(20px)' : 'translateX(0)';
    };

    input.onchange = () => {
      setOn(input.checked);
      updateSwitch();
      log('🔍 Search mode:', input.checked ? 'ON' : 'OFF');
    };

    switchWrapper.appendChild(input);
    switchWrapper.appendChild(slider);
    
    container.appendChild(label);
    container.appendChild(switchWrapper);

    document.addEventListener('keydown', e => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        input.checked = !input.checked;
        input.onchange();
      }
    });

    updateSwitch();
    return container;
  }

  let lastDisplayedModel = null;
  function checkAndUpdateSwitch() {
    const switchContainer = document.getElementById('tm-search-toggle-container');
    const icon = document.getElementById('tm-search-icon');
    
    if (!switchContainer || !icon) return;

    const currentModel = getCurrentModel();
    
    if (currentModel === lastDisplayedModel) {
      return;
    }

    lastDisplayedModel = currentModel;
    log('🔄 Current model:', currentModel);
    log('📋 Models with search support:', Object.keys(getSearchSupportedModels()));

    const isSupported = currentModel && isModelSearchSupported(currentModel);

    if (isSupported) {
      icon.textContent = '🔍';
      icon.style.filter = 'none';
      switchContainer.title = 'Toggle :search sub-model (Alt+S)';
      log('✅ Model supports :search');
    } else {
      icon.textContent = '⚠️';
      icon.style.filter = 'hue-rotate(0deg) saturate(2)';
      icon.style.color = '#dc2626'; 
      switchContainer.title = 'Might not be supported on this model';
      log('⚠️ Model might not support :search');
    }
  }

  function createModalSwitch(currentModelId, currentModelName) {
    const switchContainer = document.createElement('div');
    switchContainer.className = 'flex items-center justify-start';
    switchContainer.id = 'tm-search-modal-switch';

    const label = document.createElement('label');
    label.className = 'inline-flex items-center justify-start flex-shrink-0 w-full';

    const button = document.createElement('button');
    button.className = isModelSearchSupported(currentModelId) 
      ? 'bg-blue-600 h-6 w-11 cursor-default relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
      : 'custom-plugins-switch-disabled-state bg-gray-200 dark:bg-zinc-700 h-6 w-11 cursor-default relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2';
    button.setAttribute('role', 'switch');
    button.setAttribute('type', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-checked', isModelSearchSupported(currentModelId) ? 'true' : 'false');

    const knob = document.createElement('span');
    knob.setAttribute('aria-hidden', 'true');
    knob.className = isModelSearchSupported(currentModelId)
      ? 'translate-x-5 h-5 w-5 pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
      : 'translate-x-0 h-5 w-5 pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out';

    button.appendChild(knob);

    const textContainer = document.createElement('div');
    textContainer.className = 'w-full';

    const title = document.createElement('div');
    title.className = 'ml-2';
    title.textContent = 'Support :search Suffix';

    const description = document.createElement('div');
    description.className = 'ml-2 text-gray-500 text-xs w-full';
    description.textContent = 'Enable if the model supports the ":search" suffix for web search capabilities.';

    textContainer.appendChild(title);
    textContainer.appendChild(description);

    label.appendChild(button);
    label.appendChild(textContainer);
    switchContainer.appendChild(label);

    button.onclick = () => {
      const isChecked = button.getAttribute('aria-checked') === 'true';
      const newState = !isChecked;
      
      button.setAttribute('aria-checked', newState ? 'true' : 'false');
      button.className = newState
        ? 'bg-blue-600 h-6 w-11 cursor-default relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
        : 'custom-plugins-switch-disabled-state bg-gray-200 dark:bg-zinc-700 h-6 w-11 cursor-default relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2';
      knob.className = newState
        ? 'translate-x-5 h-5 w-5 pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
        : 'translate-x-0 h-5 w-5 pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out';

      setModelSearchSupport(currentModelId, newState);
      if (currentModelName) {
        setModelNameMapping(currentModelName, currentModelId);
      }
    };

    return switchContainer;
  }

  function injectSearchSupportSwitch() {
    const modal = document.querySelector('[data-element-id="pop-up-modal"]');
    if (!modal) return;

    const modalTitle = modal.querySelector('h1');
    if (!modalTitle || modalTitle.textContent !== 'Edit Custom Model') return;

    if (modal.querySelector('#tm-search-modal-switch')) return;

    const modelIdInput = modal.querySelector('input[placeholder="e.g., ggml-gpt4all-j-v1.3-groovy.bin"]');
    const modelNameInput = modal.querySelector('input[placeholder="e.g., GPT4All"]');
    
    if (!modelIdInput || !modelIdInput.value) return;

    const currentModelId = modelIdInput.value;
    const currentModelName = modelNameInput?.value || null;

    if (currentModelName) {
      setModelNameMapping(currentModelName, currentModelId);
    }

    const capabilitiesSection = Array.from(modal.querySelectorAll('h3')).find(h3 => 
      h3.textContent === 'Model Capabilities'
    );
    
    if (!capabilitiesSection) return;

    const switchesContainer = capabilitiesSection.closest('.bg-white, .dark\\:bg-gray-800')
      ?.querySelector('.space-y-3');
    
    if (!switchesContainer) return;

    const searchSwitch = createModalSwitch(currentModelId, currentModelName);
    switchesContainer.appendChild(searchSwitch);
    log('✅ Search support switch injected into modal');
    log('📝 Model ID:', currentModelId, '| Name:', currentModelName);
  }

  const switchObserver = new MutationObserver(() => {
    if (document.getElementById('tm-search-toggle-container')) {
      checkAndUpdateSwitch();
      return;
    }
    
    const relativeContainers = document.querySelectorAll('.sm\\:relative');
    let pluginContainer = null;
    relativeContainers.forEach(container => {
      const hasPluginBtn = container.querySelector('[id^="headlessui-menu-button-"]');
      if (hasPluginBtn) {
        pluginContainer = container;
      }
    });
    
    if (pluginContainer) {
      pluginContainer.parentElement.insertBefore(makeSwitch(), pluginContainer.nextSibling);
      log('✅ Toggle switch injected (always visible)');
      setTimeout(checkAndUpdateSwitch, 300);
    }
  });
  switchObserver.observe(document.body, {subtree: true, childList: true});

  const modalObserver = new MutationObserver(() => {
    injectSearchSupportSwitch();
  });
  modalObserver.observe(document.body, {subtree: true, childList: true});

  setInterval(checkAndUpdateSwitch, 1000);
  document.addEventListener('click', () => setTimeout(checkAndUpdateSwitch, 300));

  log('🚀 Extension loaded (always visible with warning state)');
  log('💡 Open model settings to create name→ID mapping');
  setTimeout(checkAndUpdateSwitch, 1500);
})();
