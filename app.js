const STORAGE_KEY = 'photo360_project_v2';

const state = {
  scenes: [],
  activeSceneId: null,
  selectedCoords: null,
};

const els = {
  sceneName: document.getElementById('sceneName'),
  sceneImage: document.getElementById('sceneImage'),
  addSceneBtn: document.getElementById('addSceneBtn'),
  sceneSelect: document.getElementById('sceneSelect'),
  hotspotType: document.getElementById('hotspotType'),
  hotspotTitle: document.getElementById('hotspotTitle'),
  hotspotDesc: document.getElementById('hotspotDesc'),
  hotspotImage: document.getElementById('hotspotImage'),
  hotspotTarget: document.getElementById('hotspotTarget'),
  pitchValue: document.getElementById('pitchValue'),
  yawValue: document.getElementById('yawValue'),
  pitchInput: document.getElementById('pitchInput'),
  yawInput: document.getElementById('yawInput'),
  addHotspotBtn: document.getElementById('addHotspotBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  clearBtn: document.getElementById('clearBtn'),
  infoModal: document.getElementById('infoModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalDescription: document.getElementById('modalDescription'),
  modalImage: document.getElementById('modalImage'),
  closeModal: document.getElementById('closeModal'),
};

let viewer;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getActiveScene = () => state.scenes.find((scene) => scene.id === state.activeSceneId);

const saveProject = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const normalizeProject = (parsed) => {
  if (!Array.isArray(parsed.scenes)) return null;
  return {
    scenes: parsed.scenes.map((scene) => ({
      ...scene,
      hotspots: Array.isArray(scene.hotspots)
        ? scene.hotspots.map((h) => ({
            ...h,
            type: h.type === 'scene' ? 'scene' : 'info',
            icon: h.icon || (h.type === 'scene' ? 'arrow' : 'zoom'),
          }))
        : [],
    })),
    activeSceneId: parsed.activeSceneId || parsed.scenes[0]?.id || null,
    selectedCoords: null,
  };
};

const restoreProject = () => {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('photo360_project_v1');
  if (!raw) return;

  try {
    const parsed = normalizeProject(JSON.parse(raw));
    if (!parsed) return;
    state.scenes = parsed.scenes;
    state.activeSceneId = parsed.activeSceneId;
    state.selectedCoords = null;
  } catch {
    console.warn('Nie udało się odtworzyć projektu z localStorage.');
  }
};

const updateCoordsUI = () => {
  if (!state.selectedCoords) {
    els.pitchValue.textContent = '-';
    els.yawValue.textContent = '-';
    return;
  }

  els.pitchValue.textContent = String(state.selectedCoords.pitch);
  els.yawValue.textContent = String(state.selectedCoords.yaw);
  els.pitchInput.value = String(state.selectedCoords.pitch);
  els.yawInput.value = String(state.selectedCoords.yaw);
};

const setSelectedCoords = (pitch, yaw) => {
  state.selectedCoords = {
    pitch: Number(Math.max(-90, Math.min(90, pitch)).toFixed(2)),
    yaw: Number(Math.max(-180, Math.min(180, yaw)).toFixed(2)),
  };
  updateCoordsUI();
};

const createInfoHotspotButton = (hotspot) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hotspot-btn info-btn';
  btn.title = hotspot.title || 'Pokaż szczegóły';
  btn.textContent = '🔍';

  btn.addEventListener('click', () => {
    els.modalTitle.textContent = hotspot.title || 'Informacja';
    els.modalDescription.textContent = hotspot.description || 'Brak opisu.';

    if (hotspot.image) {
      els.modalImage.src = hotspot.image;
      els.modalImage.style.display = 'block';
    } else {
      els.modalImage.removeAttribute('src');
      els.modalImage.style.display = 'none';
    }

    els.infoModal.showModal();
  });

  return btn;
};

const createArrowHotspotButton = (hotspot) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hotspot-btn arrow-btn';
  btn.title = hotspot.title || 'Przejdź';
  btn.textContent = '➜';

  btn.addEventListener('click', () => {
    if (!viewer || !hotspot.targetSceneId) return;
    viewer.loadScene(hotspot.targetSceneId, null, null, 1000);
  });

  return btn;
};

const renderSceneOptions = () => {
  els.sceneSelect.innerHTML = '';
  els.hotspotTarget.innerHTML = '<option value="">Wybierz scenę docelową</option>';

  state.scenes.forEach((scene) => {
    const option = document.createElement('option');
    option.value = scene.id;
    option.textContent = scene.name;
    els.sceneSelect.append(option.cloneNode(true));
    els.hotspotTarget.append(option);
  });

  if (state.activeSceneId) {
    els.sceneSelect.value = state.activeSceneId;
  }
};

const buildHotspot = (h) => {
  if (h.type === 'scene') {
    return {
      pitch: h.pitch,
      yaw: h.yaw,
      cssClass: 'arrow-hotspot-container',
      createTooltipFunc: (container) => container.appendChild(createArrowHotspotButton(h)),
    };
  }

  return {
    pitch: h.pitch,
    yaw: h.yaw,
    cssClass: 'info-hotspot-container',
    createTooltipFunc: (container) => container.appendChild(createInfoHotspotButton(h)),
  };
};

const ensureViewer = () => {
  const firstScene = state.scenes[0];
  if (!firstScene) return;

  if (viewer) viewer.destroy();

  viewer = pannellum.viewer('viewer', {
    default: {
      firstScene: state.activeSceneId || firstScene.id,
      sceneFadeDuration: 1000,
      autoLoad: true,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      compass: true,
    },
    scenes: Object.fromEntries(
      state.scenes.map((scene) => [
        scene.id,
        {
          title: scene.name,
          type: 'equirectangular',
          panorama: scene.image,
          hotSpots: scene.hotspots.map(buildHotspot),
        },
      ]),
    ),
  });

  viewer.on('scenechange', (sceneId) => {
    state.activeSceneId = sceneId;
    els.sceneSelect.value = sceneId;
    saveProject();
  });

  viewer.on('mousedown', (event) => {
    const coords = viewer.mouseEventToCoords(event);
    if (!coords) return;
    setSelectedCoords(coords[0], coords[1]);
  });
};

const addScene = async () => {
  const name = els.sceneName.value.trim();
  const file = els.sceneImage.files?.[0];

  if (!name || !file) {
    alert('Podaj nazwę sceny i wybierz plik zdjęcia.');
    return;
  }

  const image = await readFileAsDataUrl(file);
  state.scenes.push({ id: crypto.randomUUID(), name, image, hotspots: [] });
  state.activeSceneId = state.scenes[state.scenes.length - 1].id;

  els.sceneName.value = '';
  els.sceneImage.value = '';
  state.selectedCoords = null;
  updateCoordsUI();

  renderSceneOptions();
  ensureViewer();
  saveProject();
};

const addHotspot = async () => {
  const scene = getActiveScene();
  if (!scene) return alert('Najpierw dodaj scenę.');

  let pitch = Number(els.pitchInput.value);
  let yaw = Number(els.yawInput.value);

  if (Number.isNaN(pitch) || Number.isNaN(yaw)) {
    if (!state.selectedCoords) return alert('Kliknij panoramę lub wpisz ręcznie Pitch i Yaw.');
    pitch = state.selectedCoords.pitch;
    yaw = state.selectedCoords.yaw;
  }

  setSelectedCoords(pitch, yaw);

  const type = els.hotspotType.value;
  const targetSceneId = els.hotspotTarget.value || null;

  if (type === 'scene' && !targetSceneId) {
    return alert('Dla hotspotu strzałki wybierz scenę docelową.');
  }

  const imageFile = els.hotspotImage.files?.[0];
  const image = imageFile ? await readFileAsDataUrl(imageFile) : null;

  scene.hotspots.push({
    id: crypto.randomUUID(),
    type,
    icon: type === 'scene' ? 'arrow' : 'zoom',
    title: els.hotspotTitle.value.trim(),
    description: els.hotspotDesc.value.trim(),
    image,
    targetSceneId,
    pitch: state.selectedCoords.pitch,
    yaw: state.selectedCoords.yaw,
  });

  els.hotspotTitle.value = '';
  els.hotspotDesc.value = '';
  els.hotspotImage.value = '';
  els.hotspotTarget.value = '';
  state.selectedCoords = null;
  els.pitchInput.value = '';
  els.yawInput.value = '';
  updateCoordsUI();

  ensureViewer();
  saveProject();
};

const exportProject = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'photo360-project.json';
  a.click();
  URL.revokeObjectURL(url);
};

const importProject = async (file) => {
  const parsed = normalizeProject(JSON.parse(await file.text()));
  if (!parsed) throw new Error('Niepoprawny format pliku projektu.');

  state.scenes = parsed.scenes;
  state.activeSceneId = parsed.activeSceneId;
  state.selectedCoords = null;

  renderSceneOptions();
  ensureViewer();
  updateCoordsUI();
  saveProject();
};

const clearProject = () => {
  if (!confirm('Czy na pewno chcesz usunąć cały projekt?')) return;

  state.scenes = [];
  state.activeSceneId = null;
  state.selectedCoords = null;

  localStorage.removeItem(STORAGE_KEY);

  if (viewer) {
    viewer.destroy();
    viewer = null;
  }

  document.getElementById('viewer').innerHTML = '';
  renderSceneOptions();
  els.pitchInput.value = '';
  els.yawInput.value = '';
  updateCoordsUI();
};

els.addSceneBtn.addEventListener('click', () => addScene().catch(() => alert('Nie udało się dodać sceny.')));
els.sceneSelect.addEventListener('change', () => {
  state.activeSceneId = els.sceneSelect.value;
  if (viewer && state.activeSceneId) viewer.loadScene(state.activeSceneId, null, null, 1000);
  saveProject();
});
els.addHotspotBtn.addEventListener('click', () => addHotspot().catch(() => alert('Nie udało się dodać hotspotu.')));
els.pitchInput.addEventListener('input', () => {
  const pitch = Number(els.pitchInput.value);
  const yaw = Number(els.yawInput.value);
  if (!Number.isNaN(pitch) && !Number.isNaN(yaw)) setSelectedCoords(pitch, yaw);
});
els.yawInput.addEventListener('input', () => {
  const pitch = Number(els.pitchInput.value);
  const yaw = Number(els.yawInput.value);
  if (!Number.isNaN(pitch) && !Number.isNaN(yaw)) setSelectedCoords(pitch, yaw);
});

els.exportBtn.addEventListener('click', exportProject);
els.importInput.addEventListener('change', () => {
  const file = els.importInput.files?.[0];
  if (!file) return;
  importProject(file)
    .catch(() => alert('Nie udało się zaimportować projektu.'))
    .finally(() => {
      els.importInput.value = '';
    });
});
els.clearBtn.addEventListener('click', clearProject);
els.closeModal.addEventListener('click', () => els.infoModal.close());

restoreProject();
renderSceneOptions();
ensureViewer();
updateCoordsUI();
