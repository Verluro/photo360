const STORAGE_KEY = 'photo360_project_v1';

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
  hotspotTitle: document.getElementById('hotspotTitle'),
  hotspotDesc: document.getElementById('hotspotDesc'),
  hotspotImage: document.getElementById('hotspotImage'),
  hotspotTarget: document.getElementById('hotspotTarget'),
  addHotspotBtn: document.getElementById('addHotspotBtn'),
  pitchValue: document.getElementById('pitchValue'),
  yawValue: document.getElementById('yawValue'),
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

const saveProject = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const restoreProject = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.scenes)) return;

    state.scenes = parsed.scenes;
    state.activeSceneId = parsed.activeSceneId || parsed.scenes[0]?.id || null;
  } catch {
    console.warn('Nie udało się odtworzyć projektu z localStorage.');
  }
};

const createInfoHotspotMarkup = (hotspot) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-hotspot';
  btn.textContent = 'i';
  btn.title = hotspot.title;
  btn.style.cssText =
    'width:30px;height:30px;border-radius:999px;border:0;background:#2cc5ff;color:#00172f;font-weight:700;box-shadow:0 8px 18px rgba(0,0,0,0.35);cursor:pointer;';

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

const renderSceneOptions = () => {
  els.sceneSelect.innerHTML = '';
  els.hotspotTarget.innerHTML = '<option value="">Brak przejścia</option>';

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

const ensureViewer = () => {
  const firstScene = state.scenes[0];
  if (!firstScene) return;

  if (viewer) {
    viewer.destroy();
  }

  viewer = pannellum.viewer('viewer', {
    default: {
      firstScene: state.activeSceneId || firstScene.id,
      sceneFadeDuration: 750,
      autoLoad: true,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
    },
    scenes: Object.fromEntries(
      state.scenes.map((scene) => [
        scene.id,
        {
          title: scene.name,
          type: 'equirectangular',
          panorama: scene.image,
          hotSpots: scene.hotspots.map((h) => {
            if (h.type === 'scene') {
              return {
                pitch: h.pitch,
                yaw: h.yaw,
                type: 'scene',
                text: h.title || 'Przejdź dalej',
                sceneId: h.targetSceneId,
              };
            }

            return {
              pitch: h.pitch,
              yaw: h.yaw,
              cssClass: 'custom-info-hotspot-container',
              createTooltipFunc: (container) => {
                container.appendChild(createInfoHotspotMarkup(h));
              },
            };
          }),
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

    state.selectedCoords = { pitch: Number(coords[0].toFixed(2)), yaw: Number(coords[1].toFixed(2)) };
    els.pitchValue.textContent = String(state.selectedCoords.pitch);
    els.yawValue.textContent = String(state.selectedCoords.yaw);
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
  const scene = {
    id: crypto.randomUUID(),
    name,
    image,
    hotspots: [],
  };

  state.scenes.push(scene);
  state.activeSceneId = scene.id;
  state.selectedCoords = null;

  els.sceneName.value = '';
  els.sceneImage.value = '';
  els.pitchValue.textContent = '-';
  els.yawValue.textContent = '-';

  renderSceneOptions();
  ensureViewer();
  saveProject();
};

const addHotspot = async () => {
  const scene = getActiveScene();
  if (!scene) {
    alert('Najpierw dodaj scenę.');
    return;
  }

  if (!state.selectedCoords) {
    alert('Kliknij najpierw punkt na panoramie, aby ustawić hotspot.');
    return;
  }

  const title = els.hotspotTitle.value.trim();
  const description = els.hotspotDesc.value.trim();
  const targetSceneId = els.hotspotTarget.value || null;
  const imageFile = els.hotspotImage.files?.[0];
  const image = imageFile ? await readFileAsDataUrl(imageFile) : null;

  scene.hotspots.push({
    id: crypto.randomUUID(),
    type: targetSceneId ? 'scene' : 'info',
    title,
    description,
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
  els.pitchValue.textContent = '-';
  els.yawValue.textContent = '-';

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
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.scenes)) {
    throw new Error('Niepoprawny format pliku projektu.');
  }

  state.scenes = parsed.scenes;
  state.activeSceneId = parsed.activeSceneId || parsed.scenes[0]?.id || null;
  state.selectedCoords = null;

  renderSceneOptions();
  ensureViewer();
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
  els.pitchValue.textContent = '-';
  els.yawValue.textContent = '-';
};

els.addSceneBtn.addEventListener('click', () => {
  addScene().catch((error) => {
    console.error(error);
    alert('Nie udało się dodać sceny. Sprawdź plik i spróbuj ponownie.');
  });
});

els.sceneSelect.addEventListener('change', () => {
  state.activeSceneId = els.sceneSelect.value;
  if (viewer && state.activeSceneId) {
    viewer.loadScene(state.activeSceneId);
  }
  saveProject();
});

els.addHotspotBtn.addEventListener('click', () => {
  addHotspot().catch((error) => {
    console.error(error);
    alert('Nie udało się dodać hotspotu.');
  });
});

els.exportBtn.addEventListener('click', exportProject);

els.importInput.addEventListener('change', () => {
  const file = els.importInput.files?.[0];
  if (!file) return;

  importProject(file)
    .catch((error) => {
      console.error(error);
      alert('Nie udało się zaimportować projektu.');
    })
    .finally(() => {
      els.importInput.value = '';
    });
});

els.clearBtn.addEventListener('click', clearProject);
els.closeModal.addEventListener('click', () => els.infoModal.close());

restoreProject();
renderSceneOptions();
ensureViewer();
