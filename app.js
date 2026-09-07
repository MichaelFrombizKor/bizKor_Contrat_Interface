// Application de gestion du Contrat d'Interface Salesforce <->  (Google Light Style)

// Clé de stockage : supporte l'isolation par onglet via ?contractKey=...
const _urlKey = new URLSearchParams(window.location.search).get("contractKey");
const STORAGE_KEY_DATA = _urlKey ? _urlKey + "_data" : "bizkor_contract_data";
const STORAGE_KEY_META = _urlKey ? _urlKey + "_meta" : "bizkor_contract_meta";

// Données de mapping
let contractItems = [];

// Métadonnées du projet (toujours vierges au démarrage)
let projectMetadata = {
  client: "",
  projet: "",
  date: new Date().toISOString().slice(0, 10),
  cdpClient: "",
  cdpBizkor: "",
  commentaires: ""
};

let currentFilter = {
  search: "",
  objet: "",
  flux: "",
  interfacer: "",
  cible: ""
};

let currentSort = {
  column: "id",
  ascending: true
};

let currentView = "table"; // 'table' ou 'cards'

// Initialisation
function init() {
  loadMetadata();
  loadData();
  populateFilterDropdowns();
  setupEventListeners();
  setupRichTextToolbar();
  render();
}

function loadMetadata() {
  const savedMeta = localStorage.getItem(STORAGE_KEY_META);
  if (savedMeta) {
    try {
      projectMetadata = { ...projectMetadata, ...JSON.parse(savedMeta) };
    } catch (e) {
      console.error("Erreur de chargement des métadonnées projet", e);
    }
  }

  // Remplir les champs dans l'interface
  const metaClient = document.getElementById("meta-client");
  const metaProjet = document.getElementById("meta-projet");
  const metaDate = document.getElementById("meta-date");
  const metaCdpClient = document.getElementById("meta-cdp-client");
  const metaCdpBizkor = document.getElementById("meta-cdp-bizkor");
  const metaComments = document.getElementById("meta-commentaires");

  if (metaClient) metaClient.value = projectMetadata.client || "";
  if (metaProjet) metaProjet.value = projectMetadata.projet || "";
  if (metaDate) metaDate.value = projectMetadata.date || new Date().toISOString().slice(0, 10);
  if (metaCdpClient) metaCdpClient.value = projectMetadata.cdpClient || "";
  if (metaCdpBizkor) metaCdpBizkor.value = projectMetadata.cdpBizkor || "";
  if (metaComments) metaComments.innerHTML = projectMetadata.commentaires || "";
}

function saveMetadata() {
  projectMetadata.client = document.getElementById("meta-client").value;
  projectMetadata.projet = document.getElementById("meta-projet").value;
  projectMetadata.date = document.getElementById("meta-date").value;
  projectMetadata.cdpClient = document.getElementById("meta-cdp-client").value;
  projectMetadata.cdpBizkor = document.getElementById("meta-cdp-bizkor").value;
  projectMetadata.commentaires = document.getElementById("meta-commentaires").innerHTML;

  localStorage.setItem(STORAGE_KEY_META, JSON.stringify(projectMetadata));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY_DATA);
  if (saved) {
    try {
      contractItems = JSON.parse(saved);
    } catch (e) {
      console.error("Erreur lors de la lecture du localStorage", e);
      contractItems = [];
    }
  } else {
    // Toujours démarrer avec un contrat vierge
    contractItems = [];
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(contractItems));
}

function resetToDefault() {
  if (confirm("Voulez-vous vider entièrement le contrat ? Toutes les règles de mapping et les métadonnées seront supprimées.")) {
    // Vider les règles de mapping
    contractItems = [];
    saveData();

    // Vider les métadonnées
    projectMetadata = {
      client: "",
      projet: "",
      date: new Date().toISOString().slice(0, 10),
      cdpClient: "",
      cdpBizkor: "",
      commentaires: ""
    };
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(projectMetadata));

    // Réinitialiser les champs dans l'interface
    document.getElementById("meta-client").value = "";
    document.getElementById("meta-projet").value = "";
    document.getElementById("meta-date").value = projectMetadata.date;
    document.getElementById("meta-cdp-client").value = "";
    document.getElementById("meta-cdp-bizkor").value = "";
    document.getElementById("meta-commentaires").innerHTML = "";

    populateFilterDropdowns();
    render();
    showToast("Contrat vidé avec succès", "success");
  }
}

function setupRichTextToolbar() {
  document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      document.getElementById("meta-commentaires").focus();
      saveMetadata();
    });
  });

  const editor = document.getElementById("meta-commentaires");
  if (editor) {
    editor.addEventListener("input", saveMetadata);
  }
}

// ==============================================================================
// GESTIONNAIRE D'ADMINISTRATION DES PICKLISTS (RÉFÉRENTIELS)
// ==============================================================================
const STORAGE_KEY_PICKLISTS = "_picklists_admin_v2";
const STORAGE_KEY_COLORS   = "_picklists_colors_v1";

// Charge la map de couleurs { "flux::Salesforce => ": "#4285F4", ... }
function getPicklistColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COLORS);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function savePicklistColors(colors) {
  try {
    localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(colors));
  } catch (e) { console.error("Erreur sauvegarde couleurs picklist", e); }
}

// Retourne la couleur d'une valeur ou null
function getValColor(category, val) {
  const colors = getPicklistColors();
  return colors[`${category}::${val}`] || null;
}

// Génère le style inline pour un badge coloré
function badgeColorStyle(category, val) {
  const color = getValColor(category, val);
  if (!color) return "";
  // Calcule un fond clair à partir de la couleur hex
  const r = parseInt(color.slice(1,3),16);
  const g = parseInt(color.slice(3,5),16);
  const b = parseInt(color.slice(5,7),16);
  return `background:rgba(${r},${g},${b},0.15);color:${color};border-color:rgba(${r},${g},${b},0.35);`;
}

// Sauvegarde la couleur d'une valeur (appelé par oninput du color picker)
function adminSetColor(category, val, colorHex) {
  const colors = getPicklistColors();
  if (colorHex) {
    colors[`${category}::${val}`] = colorHex;
  } else {
    delete colors[`${category}::${val}`];
  }
  savePicklistColors(colors);
  // Refresh du badge preview sans re-rendre tout le tableau
  const preview = document.getElementById(`preview-${CSS.escape(category + '::' + val)}`);
  if (preview) {
    preview.style.cssText = badgeColorStyle(category, val);
  }
  render();
}

let adminActiveTab = "flux"; // 'flux', 'objet', 'synchro', 'cible'

// Récupère les référentiels initiaux par défaut
function getDefaultPicklists() {
  const defaultObjets = (typeof defaultContractData !== "undefined" && Array.isArray(defaultContractData)) 
    ? [...new Set(defaultContractData.map(d => d.objetOnglet).filter(Boolean))].sort()
    : ["Comptes", "Contacts", "Devis / Commandes", "Projets"];

  return {
    flux: ["Salesforce => ", " => Salesforce"],
    objet: defaultObjets,
    synchro: ["Création", "Modification", "Création/Modification"],
    cible: ["Champ existant", "Champ à créer", "Champ à modifier"],
    dml: ["Insert", "Update", "Upsert", "Delete"]
  };
}

// Charge les picklists administrées (localStorage avec fallback)
function getAdminPicklists() {
  const defaults = getDefaultPicklists();
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PICKLISTS);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return {
      flux: Array.isArray(parsed.flux) && parsed.flux.length ? parsed.flux : defaults.flux,
      objet: Array.isArray(parsed.objet) && parsed.objet.length ? parsed.objet : defaults.objet,
      synchro: Array.isArray(parsed.synchro) && parsed.synchro.length ? parsed.synchro : defaults.synchro,
      cible: Array.isArray(parsed.cible) && parsed.cible.length ? parsed.cible : defaults.cible,
      dml: Array.isArray(parsed.dml) && parsed.dml.length ? parsed.dml : defaults.dml
    };
  } catch (e) {
    console.error("Erreur lecture picklists admin", e);
    return defaults;
  }
}

// Sauvegarde les picklists administrées
function saveAdminPicklists(data) {
  try {
    localStorage.setItem(STORAGE_KEY_PICKLISTS, JSON.stringify(data));
  } catch (e) {
    console.error("Erreur sauvegarde picklists admin", e);
  }
}

// Ouvre le modal d'administration
function openAdminModal(tabName = "flux") {
  const overlay = document.getElementById("modal-admin-overlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  switchAdminTab(tabName);
}

// Ferme le modal d'administration
function closeAdminModal() {
  const overlay = document.getElementById("modal-admin-overlay");
  if (overlay) overlay.classList.add("hidden");
  populateFilterDropdowns();
  render();
}

// Change d'onglet dans l'administration
function switchAdminTab(tabName) {
  adminActiveTab = tabName;
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.classList.remove("active");
  });
  const currentTabBtn = document.getElementById(`tab-${tabName}`);
  if (currentTabBtn) currentTabBtn.classList.add("active");

  const inputNew = document.getElementById("admin-input-new");
  if (inputNew) {
    inputNew.value = "";
    const placeholders = {
      flux: "Ex: Bidirectionnel, Salesforce <=> ...",
      objet: "Ex: Factures, Affaires, Lignes de commande...",
      synchro: "Ex: Temps réel, Différé, Nocturne...",
      cible: "Ex: Champ facultatif, Champ système...",
      dml: "Ex: Insert, Update, Upsert, Delete, HardDelete..."
    };
    inputNew.placeholder = placeholders[tabName] || "Nouvelle valeur de picklist...";
    inputNew.focus();
  }

  renderAdminTabContent();
}

// Calcule l'utilisation d'une valeur dans les données
function getValUsageCount(category, val) {
  if (!Array.isArray(contractItems)) return 0;
  if (category === "flux") {
    return contractItems.filter(i => i.sensFlux === val).length;
  } else if (category === "objet") {
    return contractItems.filter(i => i.objetOnglet === val).length;
  } else if (category === "synchro") {
    return contractItems.filter(i => i.synchro === val).length;
  } else if (category === "cible") {
    return contractItems.filter(i => i.cibleExistante === val).length;
  } else if (category === "dml") {
    return contractItems.filter(i => i.operationsDml === val).length;
  }
  return 0;
}

// Rend le tableau des valeurs de la picklist active
function renderAdminTabContent() {
  const picklists = getAdminPicklists();
  const values = picklists[adminActiveTab] || [];
  const tbody = document.getElementById("admin-values-tbody");

  // Met à jour les badges de comptage sur tous les onglets
  ["flux", "objet", "synchro", "cible", "dml"].forEach(cat => {
    const badge = document.getElementById(`admin-count-${cat}`);
    if (badge) badge.textContent = `${(picklists[cat] || []).length}`;
  });

  if (!tbody) return;

  if (values.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--g-text-secondary); padding: 1.5rem;">Aucune valeur définie pour cette picklist.</td></tr>`;
    return;
  }

  tbody.innerHTML = values.map((val, idx) => {
    const count = getValUsageCount(adminActiveTab, val);
    const countBadge = count > 0 
      ? `<span class="admin-val-badge" style="background: var(--g-blue-tonal); color: var(--g-blue-text);">${count} champ${count > 1 ? 's' : ''}</span>`
      : `<span class="admin-val-badge" style="background: var(--g-surface-variant); color: var(--g-text-secondary);">Non utilisé</span>`;

    const currentColor = getValColor(adminActiveTab, val) || "";
    const previewStyle = badgeColorStyle(adminActiveTab, val);
    const previewId = `preview-${adminActiveTab}::${escapeHtml(val)}`;
    // Valeur sûre pour les callbacks JS inline
    const valSafe = escapeHtml(val).replace(/'/g, "\\'");
    const catSafe = adminActiveTab;

    return `
      <tr>
        <td style="text-align: center;">
          <div class="color-picker-wrapper">
            <input
              type="color"
              class="admin-color-input"
              value="${currentColor || '#4285F4'}"
              title="Changer la couleur du label"
              oninput="adminSetColor('${catSafe}','${valSafe}',this.value)"
            />
          </div>
        </td>
        <td>
          <span class="badge" id="${previewId}" style="${previewStyle}">${escapeHtml(val)}</span>
        </td>
        <td style="text-align: center;">
          ${countBadge}
        </td>
        <td style="text-align: right;">
          <button class="btn-admin-action" title="Renommer cette valeur" onclick="adminRenameValue('${valSafe}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-admin-action danger" title="Supprimer de la picklist" onclick="adminDeleteValue('${valSafe}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// Ajoute une nouvelle valeur dans la picklist active
function adminAddCurrentValue() {
  const input = document.getElementById("admin-input-new");
  if (!input) return;
  const newVal = input.value.trim();
  if (!newVal) {
    showToast("Veuillez saisir une valeur non vide.", "danger");
    input.focus();
    return;
  }

  const picklists = getAdminPicklists();
  const list = picklists[adminActiveTab] || [];

  if (list.includes(newVal)) {
    showToast(`La valeur "${newVal}" existe déjà dans cette picklist.`, "warning");
    input.focus();
    return;
  }

  list.push(newVal);
  picklists[adminActiveTab] = list;
  saveAdminPicklists(picklists);

  input.value = "";
  renderAdminTabContent();
  populateFilterDropdowns();
  showToast(`Valeur "${newVal}" ajoutée avec succès !`, "success");
}

// ---------------------------------------------------------------
// Modal de renommage custom
// ---------------------------------------------------------------
let _renameContext = { oldVal: null, resolve: null };

function openRenameModal(oldVal) {
  return new Promise((resolve) => {
    _renameContext = { oldVal, resolve };

    const overlay = document.getElementById("modal-rename-overlay");
    const input   = document.getElementById("rename-input");
    const sub     = document.getElementById("rename-modal-sub");
    const errDiv  = document.getElementById("rename-error");

    sub.textContent = `Valeur actuelle : « ${oldVal} »`;
    input.value = oldVal;
    input.classList.remove("error");
    errDiv.classList.add("hidden");

    overlay.classList.remove("hidden");

    // Focus + sélection après l'animation
    setTimeout(() => {
      input.focus();
      input.select();
    }, 80);
  });
}

function closeRenameModal(result = null) {
  const overlay = document.getElementById("modal-rename-overlay");
  const dialog  = document.getElementById("modal-rename-dialog");

  // Petite animation de fermeture
  dialog.style.animation = "renameDialogIn 0.15s cubic-bezier(0.55, 0, 1, 0.45) reverse both";
  setTimeout(() => {
    overlay.classList.add("hidden");
    dialog.style.animation = "";
    if (_renameContext.resolve) {
      _renameContext.resolve(result);
      _renameContext = { oldVal: null, resolve: null };
    }
  }, 140);
}

function confirmRenameModal() {
  const input  = document.getElementById("rename-input");
  const errDiv = document.getElementById("rename-error");
  const newVal = input.value.trim();

  // Validation
  if (!newVal) {
    input.classList.add("error");
    input.focus();
    return;
  }

  // Vérifier doublon (si différent de l'ancienne valeur)
  if (newVal !== _renameContext.oldVal) {
    const picklists = getAdminPicklists();
    const list = picklists[adminActiveTab] || [];
    if (list.includes(newVal)) {
      input.classList.add("error");
      errDiv.textContent = `"${newVal}" existe déjà dans cette liste.`;
      errDiv.classList.remove("hidden");
      input.focus();
      return;
    }
  }

  input.classList.remove("error");
  errDiv.classList.add("hidden");
  closeRenameModal(newVal);
}

// Gestion clavier dans le modal rename
document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById("modal-rename-overlay");
  if (!overlay || overlay.classList.contains("hidden")) return;
  if (e.key === "Enter")  { e.preventDefault(); confirmRenameModal(); }
  if (e.key === "Escape") { e.preventDefault(); closeRenameModal(null); }
});

// Clic en dehors = fermer
document.getElementById("modal-rename-overlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeRenameModal(null);
});

// Renomme une valeur et répercute en cascade sur tous les champs concernés
async function adminRenameValue(oldVal) {
  const newVal = await openRenameModal(oldVal);
  if (!newVal || newVal === oldVal) return;

  const trimmedNew = newVal.trim();
  const picklists = getAdminPicklists();
  const list = picklists[adminActiveTab] || [];

  const idx = list.indexOf(oldVal);
  if (idx !== -1) {
    list[idx] = trimmedNew;
    picklists[adminActiveTab] = list;
    saveAdminPicklists(picklists);
  }

  // Répercussion automatique sur tous les champs existants
  let updatedCount = 0;
  contractItems.forEach(item => {
    if (adminActiveTab === "flux" && item.sensFlux === oldVal) {
      item.sensFlux = trimmedNew; updatedCount++;
    } else if (adminActiveTab === "objet" && item.objetOnglet === oldVal) {
      item.objetOnglet = trimmedNew; updatedCount++;
    } else if (adminActiveTab === "synchro" && item.synchro === oldVal) {
      item.synchro = trimmedNew; updatedCount++;
    } else if (adminActiveTab === "cible" && item.cibleExistante === oldVal) {
      item.cibleExistante = trimmedNew; updatedCount++;
    } else if (adminActiveTab === "dml" && item.operationsDml === oldVal) {
      item.operationsDml = trimmedNew; updatedCount++;
    }
  });

  if (updatedCount > 0) saveData();

  renderAdminTabContent();
  populateFilterDropdowns();
  render();
  showToast(`✏️ Renommé en « ${trimmedNew} » — ${updatedCount} champ${updatedCount > 1 ? 's mis à jour' : ' mis à jour'}`, "success");
}


// Supprime une valeur de la picklist
function adminDeleteValue(val) {
  const count = getValUsageCount(adminActiveTab, val);
  if (count > 0) {
    if (!confirm(`Attention : la valeur "${val}" est actuellement utilisée par ${count} champ${count > 1 ? 's' : ''}.\n\nSouhaitez-vous vraiment la retirer de la liste des choix proposés ?`)) {
      return;
    }
  }

  const picklists = getAdminPicklists();
  let list = picklists[adminActiveTab] || [];
  list = list.filter(v => v !== val);
  picklists[adminActiveTab] = list;
  saveAdminPicklists(picklists);

  renderAdminTabContent();
  populateFilterDropdowns();
  showToast(`Valeur "${val}" supprimée de la picklist`, "info");
}

// Rétablir les valeurs par défaut
function adminResetDefault() {
  if (!confirm(`Rétablir les valeurs par défaut pour la picklist "${adminActiveTab}" ?`)) return;
  const defaults = getDefaultPicklists();
  const picklists = getAdminPicklists();
  picklists[adminActiveTab] = defaults[adminActiveTab] || [];
  saveAdminPicklists(picklists);
  renderAdminTabContent();
  populateFilterDropdowns();
  showToast(`Valeurs par défaut restaurées pour "${adminActiveTab}"`, "success");
}

// Alimentation synchronisée de tous les selects & filtres
function populateFilterDropdowns() {
  const picklists = getAdminPicklists();

  // 1. Filtre Objets / Tables
  const filterObjSelect = document.getElementById("filter-objet");
  if (filterObjSelect) {
    const cur = filterObjSelect.value;
    filterObjSelect.innerHTML = '<option value="">Tous les objets / tables</option>' + 
      (picklists.objet || []).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    if (cur) filterObjSelect.value = cur;
  }

  // 2. Filtre Sens du flux
  const filterFluxSelect = document.getElementById("filter-flux");
  if (filterFluxSelect) {
    const cur = filterFluxSelect.value;
    filterFluxSelect.innerHTML = '<option value="">Tous les flux</option>' + 
      (picklists.flux || []).map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
    if (cur) filterFluxSelect.value = cur;
  }

  // 3. Filtre Cible
  const filterCibleSelect = document.getElementById("filter-cible");
  if (filterCibleSelect) {
    const cur = filterCibleSelect.value;
    filterCibleSelect.innerHTML = '<option value="">Toutes cibles</option>' + 
      (picklists.cible || []).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    if (cur) filterCibleSelect.value = cur;
  }

  // 4. Modal d'édition : Select Flux
  const editFluxSelect = document.getElementById("edit-flux");
  if (editFluxSelect) {
    const cur = editFluxSelect.value;
    editFluxSelect.innerHTML = '<option value="">-- Sélectionner un flux --</option>' + 
      (picklists.flux || []).map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
    if (cur) editFluxSelect.value = cur;
  }

  // 5. Modal d'édition : Select Objet / Table
  const editObjSelect = document.getElementById("edit-objet");
  if (editObjSelect) {
    const cur = editObjSelect.value;
    editObjSelect.innerHTML = '<option value="">-- Sélectionner un objet / table --</option>' + 
      (picklists.objet || []).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    if (cur) editObjSelect.value = cur;
  }

  // 6. Modal d'édition : Select Synchro
  const editSynchroSelect = document.getElementById("edit-synchro");
  if (editSynchroSelect) {
    const cur = editSynchroSelect.value;
    editSynchroSelect.innerHTML = '<option value="">-- Non spécifié --</option>' + 
      (picklists.synchro || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    if (cur) editSynchroSelect.value = cur;
  }

  // 7. Modal d'édition : Select Cible
  const editCibleSelect = document.getElementById("edit-cible");
  if (editCibleSelect) {
    const cur = editCibleSelect.value;
    editCibleSelect.innerHTML = '<option value="">--</option>' + 
      (picklists.cible || []).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    if (cur) editCibleSelect.value = cur;
  }

  // 8. Modal d'édition : Select Opérations DML
  const editDmlSelect = document.getElementById("edit-operations-dml");
  if (editDmlSelect) {
    const cur = editDmlSelect.value;
    editDmlSelect.innerHTML = '<option value="">-- Non spécifié --</option>' + 
      (picklists.dml || []).map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
    if (cur) editDmlSelect.value = cur;
  }

  // 9. Datalist Types de données
  const typeDatalist = document.getElementById("type-list");
  if (typeDatalist) {
    const types = [...new Set(contractItems.map(d => d.dataTypeSource).filter(Boolean))].sort();
    typeDatalist.innerHTML = types.map(t => `<option value="${escapeHtml(t)}"></option>`).join("");
  }
}

function setupEventListeners() {
  // Écouteurs sur les métadonnées projet (sauvegarde instantanée)
  ["meta-client", "meta-projet", "meta-date", "meta-cdp-client", "meta-cdp-bizkor"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", saveMetadata);
  });

  // Recherche
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  
  searchInput.addEventListener("input", (e) => {
    currentFilter.search = e.target.value.trim().toLowerCase();
    searchClear.classList.toggle("visible", !!currentFilter.search);
    render();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    currentFilter.search = "";
    searchClear.classList.remove("visible");
    render();
  });

  // Filtres Select
  document.getElementById("filter-objet").addEventListener("change", (e) => {
    currentFilter.objet = e.target.value;
    render();
  });

  document.getElementById("filter-flux").addEventListener("change", (e) => {
    currentFilter.flux = e.target.value;
    render();
  });

  document.getElementById("filter-interfacer").addEventListener("change", (e) => {
    currentFilter.interfacer = e.target.value;
    render();
  });

  document.getElementById("filter-cible").addEventListener("change", (e) => {
    currentFilter.cible = e.target.value;
    render();
  });

  document.getElementById("btn-reset-filters").addEventListener("click", resetFilters);
  document.getElementById("btn-reset-empty").addEventListener("click", resetFilters);

  // Vue Tableau / Cartes
  const btnTable = document.getElementById("view-table");
  const btnCards = document.getElementById("view-cards");
  const tableView = document.getElementById("table-view");
  const cardsView = document.getElementById("cards-view");

  btnTable.addEventListener("click", () => {
    currentView = "table";
    btnTable.classList.add("active");
    btnCards.classList.remove("active");
    tableView.classList.remove("hidden");
    cardsView.classList.add("hidden");
    render();
  });

  btnCards.addEventListener("click", () => {
    currentView = "cards";
    btnCards.classList.add("active");
    btnTable.classList.remove("active");
    cardsView.classList.remove("hidden");
    tableView.classList.add("hidden");
    render();
  });

  // Tri de tableau
  document.querySelectorAll(".th-sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (currentSort.column === col) {
        currentSort.ascending = !currentSort.ascending;
      } else {
        currentSort.column = col;
        currentSort.ascending = true;
      }
      updateSortIcons();
      render();
    });
  });

  // Bouton Nouveau champ
  const btnAddRow = document.getElementById("btn-add-row");
  if (btnAddRow) btnAddRow.onclick = () => openModal();

  // Modal
  const modalClose = document.getElementById("modal-close");
  if (modalClose) modalClose.onclick = closeModal;

  const btnCancel = document.getElementById("btn-cancel");
  if (btnCancel) btnCancel.onclick = closeModal;

  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModal();
    });
  }

  // Modal Admin
  const adminOverlay = document.getElementById("modal-admin-overlay");
  if (adminOverlay) {
    adminOverlay.addEventListener("click", (e) => {
      if (e.target.id === "modal-admin-overlay") closeAdminModal();
    });
  }

  // Modal Import
  const importOverlay = document.getElementById("modal-import-overlay");
  if (importOverlay) {
    importOverlay.addEventListener("click", (e) => {
      if (e.target.id === "modal-import-overlay") closeImportModal();
    });
  }

  const adminInputNew = document.getElementById("admin-input-new");
  if (adminInputNew) {
    adminInputNew.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        adminAddCurrentValue();
      }
    });
  }

  const btnSave = document.getElementById("btn-save");
  if (btnSave) btnSave.onclick = saveItemFromModal;

  const btnDelete = document.getElementById("btn-delete");
  if (btnDelete) btnDelete.onclick = deleteItemFromModal;

  // Clic sur les KPIs pour filtrer rapidement
  document.getElementById("stat-total")?.addEventListener("click", () => resetFilters());
  document.getElementById("stat-oui")?.addEventListener("click", () => {
    setFilterVal("filter-interfacer", "oui");
  });
  document.getElementById("stat-non")?.addEventListener("click", () => {
    setFilterVal("filter-interfacer", "non");
  });
  document.getElementById("stat-creer")?.addEventListener("click", () => {
    setFilterVal("filter-cible", "Champ à créer");
  });
}

function setFilterVal(elementId, val) {
  const el = document.getElementById(elementId);
  el.value = val;
  el.dispatchEvent(new Event("change"));
}

function resetFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").classList.remove("visible");
  document.getElementById("filter-objet").value = "";
  document.getElementById("filter-flux").value = "";
  document.getElementById("filter-interfacer").value = "";
  document.getElementById("filter-cible").value = "";

  currentFilter = {
    search: "",
    objet: "",
    flux: "",
    interfacer: "",
    cible: ""
  };
  render();
}

function updateSortIcons() {
  document.querySelectorAll(".th-sortable").forEach(th => {
    const col = th.dataset.col;
    const icon = th.querySelector(".sort-icon");
    if (currentSort.column === col) {
      icon.textContent = currentSort.ascending ? "▲" : "▼";
      th.style.color = "var(--g-blue)";
    } else {
      icon.textContent = "↕";
      th.style.color = "";
    }
  });
}

function getFilteredData() {
  return contractItems.filter(item => {
    if (currentFilter.search) {
      const s = currentFilter.search;
      const match = (
        (item.champ && item.champ.toLowerCase().includes(s)) ||
        (item.objetOnglet && item.objetOnglet.toLowerCase().includes(s)) ||
        (item.apiNameSource && item.apiNameSource.toLowerCase().includes(s)) ||
        (item.fieldLabelCible && item.fieldLabelCible.toLowerCase().includes(s)) ||
        (item.apiNameCible && item.apiNameCible.toLowerCase().includes(s)) ||
        (item.commentaires && item.commentaires.toLowerCase().includes(s))
      );
      if (!match) return false;
    }

    if (currentFilter.objet && item.objetOnglet !== currentFilter.objet) {
      return false;
    }

    if (currentFilter.flux && item.sensFlux !== currentFilter.flux) {
      return false;
    }

    if (currentFilter.interfacer) {
      const isYes = (item.aInterfacer || "").includes("Oui");
      if (currentFilter.interfacer === "oui" && !isYes) return false;
      if (currentFilter.interfacer === "non" && isYes) return false;
    }

    if (currentFilter.cible && item.cibleExistante !== currentFilter.cible) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    let valA = a[currentSort.column] || "";
    let valB = b[currentSort.column] || "";
    
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return currentSort.ascending ? -1 : 1;
    if (valA > valB) return currentSort.ascending ? 1 : -1;
    return 0;
  });
}

function updateKPIs() {
  const total = contractItems.length;
  const oui = contractItems.filter(i => (i.aInterfacer || "").includes("Oui")).length;
  const non = contractItems.filter(i => (i.aInterfacer || "").includes("Non")).length;
  const aCreer = contractItems.filter(i => (i.cibleExistante || "").includes("créer")).length;

  const statValTotal = document.getElementById("stat-val-total");
  if (statValTotal) statValTotal.textContent = total;
  const statValOui = document.getElementById("stat-val-oui");
  if (statValOui) statValOui.textContent = oui;
  const statValNon = document.getElementById("stat-val-non");
  if (statValNon) statValNon.textContent = non;
  const statValCreer = document.getElementById("stat-val-creer");
  if (statValCreer) statValCreer.textContent = aCreer;
  const totalCount = document.getElementById("total-count");
  if (totalCount) totalCount.textContent = total;

  // Cartes dynamiques générées à partir de la picklist "Sens du flux"
  const container = document.getElementById("stat-flux-container");
  if (container) {
    const picklists = getAdminPicklists();
    const fluxList = picklists.flux || [];
    const colors = ["blue", "purple", "amber", "green"];

    container.innerHTML = fluxList.map((fluxVal, idx) => {
      const count = contractItems.filter(i => i.sensFlux === fluxVal).length;
      const colorClass = colors[idx % colors.length];
      const customColor = getValColor('flux', fluxVal);
      const iconStyle = customColor ? `background: rgba(${parseInt(customColor.slice(1,3),16)}, ${parseInt(customColor.slice(3,5),16)}, ${parseInt(customColor.slice(5,7),16)}, 0.15); color: ${customColor};` : '';
      const safeVal = escapeHtml(fluxVal);

      return `
        <div class="stat-card" data-flux="${safeVal}" title="Cliquez pour filtrer le flux ${safeVal}">
          <div class="stat-icon stat-icon-${colorClass}" style="${iconStyle}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">${count}</span>
            <span class="stat-label">${safeVal}</span>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".stat-card").forEach(card => {
      card.addEventListener("click", () => {
        const flux = card.getAttribute("data-flux");
        setFilterVal("filter-flux", flux);
      });
    });
  }
}

function render() {
  updateKPIs();
  const items = getFilteredData();
  
  const countText = document.getElementById("filter-count-text");
  if (countText) countText.textContent = `Affichage de ${items.length} sur ${contractItems.length} règles de mapping`;

  const emptyState = document.getElementById("empty-state");
  const tableView = document.getElementById("table-view");
  const cardsView = document.getElementById("cards-view");

  if (items.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (tableView) tableView.classList.add("hidden");
    if (cardsView) cardsView.classList.add("hidden");
    return;
  } else {
    if (emptyState) emptyState.classList.add("hidden");
    if (currentView === "table") {
      if (tableView) tableView.classList.remove("hidden");
      if (cardsView) cardsView.classList.add("hidden");
      renderTable(items);
    } else {
      if (cardsView) cardsView.classList.remove("hidden");
      if (tableView) tableView.classList.add("hidden");
      renderCards(items);
    }
  }
}

function renderTable(items) {
  const tbody = document.getElementById("table-body");
  
  tbody.innerHTML = items.map(item => {
    const isOui = (item.aInterfacer || "").includes("Oui");
    const fluxVal = item.sensFlux || "";
    
    let cibleBadgeClass = "badge-existant";
    if ((item.cibleExistante || "").includes("créer")) cibleBadgeClass = "badge-creer";
    else if ((item.cibleExistante || "").includes("modifier")) cibleBadgeClass = "badge-modifier";

    return `
      <tr data-id="${item.id}">
        <td class="th-actions col-actions">
          <div class="row-actions">
            <button class="btn-icon-action" title="Modifier" onclick="openModal(${item.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn-icon-action" title="Dupliquer" onclick="duplicateItem(${item.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </td>
        <td class="col-flux">
          ${item.sensFlux ? (()=>{
            const _cs = badgeColorStyle('flux', item.sensFlux);
            return `<span class="badge ${_cs ? '' : 'badge-flux-autre'}" style="${_cs}">${escapeHtml(item.sensFlux)}</span>`;
          })() : '<span style="color: var(--g-text-muted);">-</span>'}
        </td>
        <td class="col-objet">
          ${(()=>{
            const _cs = badgeColorStyle('objet', item.objetOnglet);
            return `<span class="badge ${_cs ? '' : 'badge-object'}" style="${_cs}">${escapeHtml(item.objetOnglet || "-")}</span>`;
          })()}
        </td>
        <td class="col-champ">
          <strong style="color: var(--g-text-primary); cursor: pointer;" onclick="openModal(${item.id})">${escapeHtml(item.champ || "")}</strong>
          ${item.values ? `<div style="font-size: 0.68rem; color: var(--g-text-secondary); margin-top: 1px;">Valeurs: ${escapeHtml(item.values)}</div>` : ""}
        </td>
        <td class="col-api-source">
          ${item.apiNameSource ? `<span class="code-pill">${escapeHtml(item.apiNameSource)}</span>` : '<span style="color: var(--g-text-muted);">-</span>'}
        </td>
        <td class="col-type">
          <span style="font-size: 0.72rem; color: var(--g-text-secondary);">${escapeHtml(item.dataTypeSource || "-")}</span>
        </td>
        <td class="th-center col-requis">
          ${item.required ? '<span style="color: var(--g-red); font-weight: bold; font-size: 0.9rem;">●</span>' : '<span style="color: var(--g-text-muted);">○</span>'}
        </td>
        <td class="th-center col-interfacer">
          <span class="badge ${isOui ? 'badge-yes' : 'badge-no'}" style="cursor: pointer;" onclick="toggleInterfacer(${item.id})">
            ${isOui ? '✅ Oui' : '❌ Non'}
          </span>
        </td>
        <td class="col-synchro">
          <span style="font-size: 0.72rem;">${escapeHtml(item.synchro || "-")}</span>
        </td>
        <td class="col-cible">
          ${item.cibleExistante ? `<span class="badge ${cibleBadgeClass}">${escapeHtml(item.cibleExistante)}</span>` : '<span style="color: var(--g-text-muted);">-</span>'}
        </td>
        <td class="col-label-cible">${escapeHtml(item.fieldLabelCible || "-")}</td>
        <td class="col-api-cible">
          ${item.apiNameCible ? `<span class="code-pill">${escapeHtml(item.apiNameCible)}</span>` : '<span style="color: var(--g-text-muted);">-</span>'}
        </td>
        <td class="col-commentaires">
          ${item.commentaires ? `<span style="font-size: 0.72rem; color: var(--g-amber-text);" title="${escapeHtml(item.commentaires)}">💬 ${escapeHtml(item.commentaires)}</span>` : '<span style="color: var(--g-text-muted);">-</span>'}
        </td>
      </tr>
    `;
  }).join("");
}

function renderCards(items) {
  const container = document.getElementById("cards-grid");

  container.innerHTML = items.map(item => {
    const isOui = (item.aInterfacer || "").includes("Oui");

    return `
      <div class="contract-card">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(item.champ || "Sans nom")}</div>
            <div style="font-size: 0.75rem; color: var(--g-text-secondary); margin-top: 2px;">
              ${escapeHtml(item.objetOnglet || "Objet indéfini")}
            </div>
          </div>
          <span class="badge ${isOui ? 'badge-yes' : 'badge-no'}" onclick="toggleInterfacer(${item.id})" style="cursor: pointer;">
            ${isOui ? '✅ Oui' : '❌ Non'}
          </span>
        </div>

        <div class="card-tags">
          ${item.sensFlux ? (()=>{
            const _cs = badgeColorStyle('flux', item.sensFlux);
            return `<span class="badge ${_cs ? '' : 'badge-flux-autre'}" style="${_cs}">${escapeHtml(item.sensFlux)}</span>`;
          })() : ''}
          ${item.cibleExistante ? `<span class="badge badge-existant">${escapeHtml(item.cibleExistante)}</span>` : ''}
          ${item.dataTypeSource ? `<span class="badge badge-object">${escapeHtml(item.dataTypeSource)}</span>` : ''}
          ${item.required ? `<span class="badge badge-modifier">Requis</span>` : ''}
        </div>

        <div class="card-body">
          <div class="card-row">
            <span class="card-label">Source API:</span>
            <span class="code-pill">${escapeHtml(item.apiNameSource || "-")}</span>
          </div>
          <div class="card-row">
            <span class="card-label">Cible Label:</span>
            <span>${escapeHtml(item.fieldLabelCible || "-")}</span>
          </div>
          <div class="card-row">
            <span class="card-label">Cible API:</span>
            <span class="code-pill">${escapeHtml(item.apiNameCible || "-")}</span>
          </div>
          ${item.synchro ? `
            <div class="card-row">
              <span class="card-label">Synchro:</span>
              <span>${escapeHtml(item.synchro)}</span>
            </div>
          ` : ''}
        </div>

        ${item.commentaires ? `
          <div class="card-comment">
            <strong>Note:</strong> ${escapeHtml(item.commentaires)}
          </div>
        ` : ''}

        <div class="card-footer">
          <button class="btn-icon-action" title="Dupliquer" onclick="duplicateItem(${item.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon-action" title="Modifier" onclick="openModal(${item.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// Toggle rapide "À interfacer"
function toggleInterfacer(id) {
  const item = contractItems.find(i => i.id === id);
  if (!item) return;
  const isOui = (item.aInterfacer || "").includes("Oui");
  item.aInterfacer = isOui ? "❌ Non" : "✅ Oui";
  saveData();
  render();
  showToast(`Champ "${item.champ}" : Interfaçage passé à ${item.aInterfacer}`, "success");
}

function ensureSelectHasOption(selectEl, val) {
  if (!selectEl || !val) return;
  const exists = Array.from(selectEl.options).some(opt => opt.value === val);
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  }
}

// Modal Édition & Ajout
function openModal(id = null) {
  const overlay = document.getElementById("modal-overlay");
  const title = document.getElementById("modal-title");
  const btnDelete = document.getElementById("btn-delete");
  
  populateFilterDropdowns(); // s'assurer que les options de picklists administrées sont fraîches
  overlay.classList.remove("hidden");

  if (id) {
    const item = contractItems.find(i => i.id === id);
    if (!item) return;

    title.textContent = `Modifier : ${item.champ}`;
    btnDelete.classList.remove("hidden");

    document.getElementById("edit-id").value = item.id;
    document.getElementById("edit-champ").value = item.champ || "";

    const editFlux = document.getElementById("edit-flux");
    ensureSelectHasOption(editFlux, item.sensFlux);
    editFlux.value = item.sensFlux || "";

    const editObj = document.getElementById("edit-objet");
    ensureSelectHasOption(editObj, item.objetOnglet);
    editObj.value = item.objetOnglet || "";

    const editSynchro = document.getElementById("edit-synchro");
    ensureSelectHasOption(editSynchro, item.synchro);
    editSynchro.value = item.synchro || "";

    const editCible = document.getElementById("edit-cible");
    ensureSelectHasOption(editCible, item.cibleExistante);
    editCible.value = item.cibleExistante || "";

    const editDml = document.getElementById("edit-operations-dml");
    ensureSelectHasOption(editDml, item.operationsDml);
    editDml.value = item.operationsDml || "";

    document.getElementById("edit-api-source").value = item.apiNameSource || "";
    document.getElementById("edit-datatype").value = item.dataTypeSource || "";
    document.getElementById("edit-required").checked = !!item.required;
    document.getElementById("edit-interfacer").checked = (item.aInterfacer || "").includes("Oui");
    document.getElementById("edit-values").value = item.values || "";
    document.getElementById("edit-label-cible").value = item.fieldLabelCible || "";
    document.getElementById("edit-api-cible").value = item.apiNameCible || "";
    document.getElementById("edit-commentaires").value = item.commentaires || "";

    // Nouveaux champs techniques d'intégration
    document.getElementById("edit-fichier-plat").value = item.fichierPlat || "";
    document.getElementById("edit-frequence-depot").value = item.frequenceDepot || "";
    document.getElementById("edit-cle-integration").value = item.cleIntegration || "";
    document.getElementById("edit-filtres-donnees").value = item.filtresDonnees || "";
  } else {
    title.textContent = "Ajouter une nouvelle règle d'interface";
    btnDelete.classList.add("hidden");

    document.getElementById("edit-id").value = "";
    document.getElementById("edit-champ").value = "";
    document.getElementById("edit-objet").value = currentFilter.objet || "";
    document.getElementById("edit-flux").value = currentFilter.flux || "Salesforce => ";
    document.getElementById("edit-api-source").value = "";
    document.getElementById("edit-datatype").value = "Text";
    document.getElementById("edit-required").checked = false;
    document.getElementById("edit-interfacer").checked = true;
    document.getElementById("edit-values").value = "";
    document.getElementById("edit-synchro").value = "Création/Modification";
    document.getElementById("edit-cible").value = "Champ existant";
    document.getElementById("edit-operations-dml").value = "Upsert";
    document.getElementById("edit-label-cible").value = "";
    document.getElementById("edit-api-cible").value = "";
    document.getElementById("edit-commentaires").value = "";

    // Nouveaux champs techniques d'intégration
    document.getElementById("edit-fichier-plat").value = "";
    document.getElementById("edit-frequence-depot").value = "";
    document.getElementById("edit-cle-integration").value = "";
    document.getElementById("edit-filtres-donnees").value = "";
  }

  document.getElementById("edit-flux").focus();
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

function saveItemFromModal() {
  const champName = document.getElementById("edit-champ").value.trim();
  if (!champName) {
    showToast("Le nom du champ est obligatoire.", "danger");
    document.getElementById("edit-champ").focus();
    return;
  }

  const idVal = document.getElementById("edit-id").value;
  const isInterfacer = document.getElementById("edit-interfacer").checked;
  const sensFluxVal = document.getElementById("edit-flux").value;
  const objetVal = document.getElementById("edit-objet").value;

  const payload = {
    champ: champName,
    objetOnglet: objetVal,
    sensFlux: sensFluxVal,
    apiNameSource: document.getElementById("edit-api-source").value.trim(),
    dataTypeSource: document.getElementById("edit-datatype").value.trim(),
    required: document.getElementById("edit-required").checked,
    values: document.getElementById("edit-values").value.trim(),
    aInterfacer: isInterfacer ? "✅ Oui" : "❌ Non",
    synchro: document.getElementById("edit-synchro").value,
    cibleExistante: document.getElementById("edit-cible").value,
    fieldLabelCible: document.getElementById("edit-label-cible").value.trim(),
    apiNameCible: document.getElementById("edit-api-cible").value.trim(),
    commentaires: document.getElementById("edit-commentaires").value.trim(),
    // Paramètres techniques d'intégration
    fichierPlat: document.getElementById("edit-fichier-plat").value.trim(),
    frequenceDepot: document.getElementById("edit-frequence-depot").value.trim(),
    operationsDml: document.getElementById("edit-operations-dml").value,
    cleIntegration: document.getElementById("edit-cle-integration").value.trim(),
    filtresDonnees: document.getElementById("edit-filtres-donnees").value.trim()
  };

  if (idVal) {
    const id = parseInt(idVal, 10);
    const index = contractItems.findIndex(i => i.id === id);
    if (index !== -1) {
      contractItems[index] = { ...contractItems[index], ...payload };
      showToast("Champ mis à jour avec succès", "success");
    }
  } else {
    const newId = contractItems.length > 0 ? Math.max(...contractItems.map(i => i.id || 0)) + 1 : 1;
    contractItems.unshift({ id: newId, ...payload });
    showToast("Nouveau champ ajouté avec succès", "success");
  }

  saveData();
  populateFilterDropdowns();
  closeModal();
  render();
}

function deleteItemFromModal() {
  const idVal = document.getElementById("edit-id").value;
  if (!idVal) return;
  const id = parseInt(idVal, 10);
  
  if (confirm("Êtes-vous sûr de vouloir supprimer ce champ du contrat d'interface ?")) {
    contractItems = contractItems.filter(i => i.id !== id);
    saveData();
    populateFilterDropdowns();
    closeModal();
    render();
    showToast("Champ supprimé du contrat", "success");
  }
}

function duplicateItem(id) {
  const item = contractItems.find(i => i.id === id);
  if (!item) return;

  const newId = Math.max(...contractItems.map(i => i.id || 0)) + 1;
  const duplicated = {
    ...JSON.parse(JSON.stringify(item)),
    id: newId,
    champ: `${item.champ} (Copie)`
  };

  const index = contractItems.findIndex(i => i.id === id);
  contractItems.splice(index + 1, 0, duplicated);
  saveData();
  render();
  showToast(`Champ "${item.champ}" dupliqué`, "success");
}



// Export PDF pleine largeur format paysage
function exportToPDF() {
  // S'assurer que le tableau est actif et complet pour l'impression
  if (currentView !== "table") {
    currentView = "table";
    const btnTable = document.getElementById("view-table");
    const btnCards = document.getElementById("view-cards");
    const tableView = document.getElementById("table-view");
    const cardsView = document.getElementById("cards-view");
    if (btnTable) btnTable.classList.add("active");
    if (btnCards) btnCards.classList.remove("active");
    if (tableView) tableView.classList.remove("hidden");
    if (cardsView) cardsView.classList.add("hidden");
    render();
  }

  closeModal();

  const originalTitle = document.title;
  const clientName = (projectMetadata.client || "").trim();
  const projectName = (projectMetadata.projet || "").trim();
  const pdfTitleParts = [clientName, projectName || "Contrat d'Interfaces"].filter(Boolean);
  document.title = pdfTitleParts.join(" - ") + " — bizKor";

  showToast("Préparation du document PDF (format paysage)...", "info");

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, 350);
}

// Helper pour nettoyer le HTML des commentaires pour les exports Excel / CSV
function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Export Excel Multi-onglets (.xlsx) avec 2 onglets : "Informations Projet" + "Contrat d'Interfaces" (Complet)
function exportToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("La librairie Excel est en cours de chargement... Veuillez réessayer.", "warning");
    return;
  }

  const itemsToExport = [...contractItems];

  if (itemsToExport.length === 0) {
    showToast("Le contrat est actuellement vide. Aucun champ à exporter.", "danger");
    return;
  }

  // 1. Créer le classeur Excel
  const wb = XLSX.utils.book_new();

  // 2. Onglet 1 : Informations Projet (Cartouche d'en-tête bizKor)
  const metaSheetData = [
    ["SOCIÉTÉ", "bizKor"],
    ["CLIENT", projectMetadata.client || "-"],
    ["PROJET", projectMetadata.projet || "Contrat d'Interfaces"],
    ["DATE", projectMetadata.date || new Date().toISOString().slice(0, 10)],
    ["CHEF DE PROJET CLIENT", projectMetadata.cdpClient || "-"],
    ["CHEF DE PROJET BIZKOR", projectMetadata.cdpBizkor || "-"],
    ["PÉRIMÈTRE DE L'EXPORT", "Contrat Complet"],
    [""],
    ["COMMENTAIRES & NOTES D'ARCHITECTURE"],
    [stripHtml(projectMetadata.commentaires || "")],
    [""],
    ["SYNTHÈSE DU CONTRAT"],
    ["Total des champs de mapping", contractItems.length],
    ["Champs à interfacer (✅ Oui)", contractItems.filter(i => (i.aInterfacer || "").includes("Oui")).length],
    ["Champs non interfacés (❌ Non)", contractItems.filter(i => (i.aInterfacer || "").includes("Non")).length],
    ["Champs à créer côté cible", contractItems.filter(i => (i.cibleExistante || "").includes("créer")).length]
  ];

  const wsMeta = XLSX.utils.aoa_to_sheet(metaSheetData);
  wsMeta["!cols"] = [{ wch: 35 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "Informations Projet");

  // 3. Onglet 2 : Contrat d'Interfaces (Données de mapping)
  const headers = [
    "Sens du flux",
    "Objet / Table",
    "Nom du champ",
    "API Name (source)",
    "Data Type (source)",
    "Required",
    "Values (Picklist, Formula)",
    "A interfacer",
    "Synchro",
    "Cible existante",
    "Field Label (cible)",
    "API Name (cible)",
    "Fichier à plat",
    "Fréquence des dépôts",
    "Opérations DML",
    "Clé d'intégration",
    "Filtres des données",
    "Commentaires"
  ];

  const contractRows = [headers];

  itemsToExport.forEach(item => {
    contractRows.push([
      item.sensFlux || "",
      item.objetOnglet || "",
      item.champ || "",
      item.apiNameSource || "",
      item.dataTypeSource || "",
      item.required ? "true" : "false",
      item.values || "",
      item.aInterfacer || "",
      item.synchro || "",
      item.cibleExistante || "",
      item.fieldLabelCible || "",
      item.apiNameCible || "",
      item.fichierPlat || "",
      item.frequenceDepot || "",
      item.operationsDml || "",
      item.cleIntegration || "",
      item.filtresDonnees || "",
      item.commentaires || ""
    ]);
  });

  const wsContract = XLSX.utils.aoa_to_sheet(contractRows);
  wsContract["!cols"] = [
    { wch: 22 }, // Sens du flux
    { wch: 25 }, // Objet / Table
    { wch: 25 }, // Nom du champ
    { wch: 28 }, // API Name (source)
    { wch: 18 }, // Type
    { wch: 10 }, // Requis
    { wch: 25 }, // Valeurs
    { wch: 14 }, // A interfacer
    { wch: 20 }, // Synchro
    { wch: 18 }, // Cible
    { wch: 25 }, // Label cible
    { wch: 25 }, // API cible
    { wch: 25 }, // Fichier à plat
    { wch: 25 }, // Fréquence
    { wch: 18 }, // DML
    { wch: 22 }, // Clé d'intégration
    { wch: 35 }, // Filtres
    { wch: 50 }  // Commentaires
  ];

  XLSX.utils.book_append_sheet(wb, wsContract, "Contrat d'Interfaces");

  // Nom du fichier sans mention 
  const clientClean = (projectMetadata.client || "Client").replace(/[^a-zA-Z0-9]/g, "_");
  const projetClean = (projectMetadata.projet || "Contrat_Interfaces").replace(/[^a-zA-Z0-9]/g, "_");
  const dateClean = (projectMetadata.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${dateClean}_${clientClean}_${projetClean}.xlsx`;

  XLSX.writeFile(wb, fileName);
  showToast(`Classeur Excel exporté (${itemsToExport.length} lignes) !`, "success");
}

// Export CSV complet avec métadonnées d'en-tête (sans mention )
function exportToCSV() {
  const headers = [
    "Sens du flux",
    "Objet / Table",
    "Nom du champ",
    "API Name (source)",
    "Data Type (source)",
    "Required",
    "Values (Picklist, Formula)",
    "A interfacer",
    "Synchro",
    "Cible existante",
    "Field Label (cible)",
    "API Name (cible)",
    "Fichier à plat",
    "Fréquence des dépôts",
    "Opérations DML",
    "Clé d'intégration",
    "Filtres des données",
    "Commentaires"
  ];

  function escapeCSV(val) {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const itemsToExport = [...contractItems];

  if (itemsToExport.length === 0) {
    showToast("Le contrat est actuellement vide. Aucun champ à exporter.", "danger");
    return;
  }

  // Cartouche d'en-tête projet dans le CSV
  const headerMetaLines = [
    `# ==============================================================================`,
    `# CONTRAT D'INTERFACES - bizKor`,
    `# CLIENT : ${projectMetadata.client || "-"}`,
    `# PROJET : ${projectMetadata.projet || "Contrat d'Interfaces"}`,
    `# DATE : ${projectMetadata.date || new Date().toISOString().slice(0, 10)}`,
    `# CHEF DE PROJET CLIENT : ${projectMetadata.cdpClient || "-"}`,
    `# CHEF DE PROJET BIZKOR : ${projectMetadata.cdpBizkor || "-"}`,
    `# PÉRIMÈTRE : Contrat Complet (${itemsToExport.length} champs)`,
    `# ==============================================================================`
  ];

  const rows = [headers.map(escapeCSV).join(",")];

  itemsToExport.forEach(item => {
    const row = [
      escapeCSV(item.sensFlux || ""),
      escapeCSV(item.objetOnglet || ""),
      escapeCSV(item.champ || ""),
      escapeCSV(item.apiNameSource || ""),
      escapeCSV(item.dataTypeSource || ""),
      item.required ? "true" : "false",
      escapeCSV(item.values || ""),
      escapeCSV(item.aInterfacer || ""),
      escapeCSV(item.synchro || ""),
      escapeCSV(item.cibleExistante || ""),
      escapeCSV(item.fieldLabelCible || ""),
      escapeCSV(item.apiNameCible || ""),
      escapeCSV(item.fichierPlat || ""),
      escapeCSV(item.frequenceDepot || ""),
      escapeCSV(item.operationsDml || ""),
      escapeCSV(item.cleIntegration || ""),
      escapeCSV(item.filtresDonnees || ""),
      escapeCSV(item.commentaires || "")
    ];
    rows.push(row.join(","));
  });

  const fullContent = headerMetaLines.join("\r\n") + "\r\n" + rows.join("\r\n");
  const csvContent = "\uFEFF" + fullContent; // UTF-8 BOM pour Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const clientSanitized = (projectMetadata.client || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
  const projetSanitized = (projectMetadata.projet || "Contrat_Interfaces").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = (projectMetadata.date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${dateStr}_${clientSanitized}_${projetSanitized}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Fichier CSV exporté (${itemsToExport.length} champs)`, "success");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==============================================================================
// GESTIONNAIRE D'IMPORTATION DE FICHIER & MAPPING ASSISTANT (BIZKOR MODÈLE)
// ==============================================================================

// Définition des champs cibles du contrat d'interface bizKor
const CONTRACT_TARGET_FIELDS = [
  {
    key: "sensFlux",
    label: "Sens du flux",
    required: false,
    section: "flux",
    description: "Sens de l'échange (ex: Salesforce => ERP)",
    aliases: ["sens du flux", "sens", "flux", "direction", "flow", "sens flux", "sens de flux"]
  },
  {
    key: "champ",
    label: "Nom du champ (Source)",
    required: true,
    section: "source",
    description: "Libellé source (ex: Field Label, Nom du champ)",
    aliases: ["fiel label", "field label", "nom du champ", "champ", "field", "field name", "nom", "libelle", "libellé", "label", "source label", "source field label"]
  },
  {
    key: "apiNameSource",
    label: "API Name (Source)",
    required: false,
    section: "source",
    description: "Nom technique / API source",
    aliases: ["api name", "apiname", "api name (source)", "source api", "champ technique source", "source field"]
  },
  {
    key: "required",
    label: "Required (Source)",
    required: false,
    section: "source",
    description: "Obligatoire côté source (True / False)",
    aliases: ["required", "requis", "obligatoire", "mandatory", "is required", "source required"]
  },
  {
    key: "dataTypeSource",
    label: "Data Type (Source)",
    required: false,
    section: "source",
    description: "Type de données source (Text, Picklist, Date...)",
    aliases: ["data type", "datatype", "data type (source)", "type", "type de donnees", "type de données"]
  },
  {
    key: "lengthSource",
    label: "Length / Longueur (Source)",
    required: false,
    section: "source",
    description: "Taille ou longueur du champ source",
    aliases: ["lenght", "length", "longueur", "taille", "source length"]
  },
  {
    key: "values",
    label: "Values / Formules (Source)",
    required: false,
    section: "source",
    description: "Valeurs autorisées de picklist ou formules",
    aliases: ["values (picklist, formula)", "values", "valeurs", "picklist values", "valeurs autorisees", "valeurs autorisées", "liste"]
  },
  {
    key: "commentairesSource",
    label: "Commentaires (Source)",
    required: false,
    section: "source",
    description: "Notes ou règles côté source",
    aliases: ["commentaires", "commentaire", "comment", "comments", "notes", "remarques", "source comments"]
  },
  {
    key: "aInterfacer",
    label: "À interfacer",
    required: false,
    section: "synchro",
    description: "Périmètre d'interface (Oui / Non)",
    aliases: ["a interfacer", "à interfacer", "interfacer", "a synchroniser", "à synchroniser", "synchroniser", "scope", "perimetre", "périmètre"]
  },
  {
    key: "action",
    label: "Action",
    required: false,
    section: "synchro",
    description: "Action d'intégration / Mapping",
    aliases: ["action", "action d'integration", "action d'intégration", "type action"]
  },
  {
    key: "synchro",
    label: "Synchro",
    required: false,
    section: "synchro",
    description: "Mode de synchronisation (Création, Modification...)",
    aliases: ["synchro", "synchronisation", "sync", "mode synchro", "type synchro", "sync type"]
  },
  {
    key: "cibleExistante",
    label: "Cible existante",
    required: false,
    section: "cible",
    description: "Statut cible (Champ existant, à créer, à modifier)",
    aliases: ["cible existante", "cible", "statut cible", "action cible", "target status"]
  },
  {
    key: "fieldLabelCible",
    label: "Field Label (Cible)",
    required: false,
    section: "cible",
    description: "Libellé côté système cible",
    aliases: ["field label", "field label (cible)", "target label", "label cible", "libelle cible", "libellé cible", "fiel label cible"]
  },
  {
    key: "apiNameCible",
    label: "API Name (Cible)",
    required: false,
    section: "cible",
    description: "Nom technique / API côté système cible",
    aliases: ["api name", "api name (cible)", "target api", "api cible", "champ technique cible", "nom technique cible"]
  },
  {
    key: "dataTypeCible",
    label: "Data Type (Cible)",
    required: false,
    section: "cible",
    description: "Type de données côté système cible",
    aliases: ["data type", "datatype", "data type (cible)", "type cible", "target data type"]
  },
  {
    key: "lengthCible",
    label: "Length / Longueur (Cible)",
    required: false,
    section: "cible",
    description: "Longueur ou taille côté cible",
    aliases: ["length", "lenght", "longueur cible", "target length"]
  },
  {
    key: "fieldTypeCible",
    label: "Field Type (Cible)",
    required: false,
    section: "cible",
    description: "Type de champ cible",
    aliases: ["field type", "type de champ", "type champ cible", "target field type"]
  },
  {
    key: "requiredCible",
    label: "Required (Cible)",
    required: false,
    section: "cible",
    description: "Obligatoire côté cible",
    aliases: ["required", "requis", "obligatoire", "target required"]
  },
  {
    key: "valuesCible",
    label: "Values (Cible)",
    required: false,
    section: "cible",
    description: "Valeurs autorisées de picklist côté cible",
    aliases: ["values (picklist, formula)", "values", "valeurs", "target values"]
  },
  {
    key: "commentaires",
    label: "Commentaires (Général / Cible)",
    required: false,
    section: "cible",
    description: "Notes d'architecture, règles fonctionnelles",
    aliases: ["commentaires", "commentaire", "comment", "comments", "notes", "remarques", "regles", "règles", "target comments"]
  },
  {
    key: "objetOnglet",
    label: "Objet / Table",
    required: false,
    section: "autre",
    description: "Objet ou entité Salesforce / ERP",
    aliases: ["objet / table", "objet", "table", "object", "entity", "entite", "entité", "objet / onglet", "onglet"]
  },
  {
    key: "fichierPlat",
    label: "Fichier à plat",
    required: false,
    section: "autre",
    description: "Nom du fichier ou interface plate",
    aliases: ["fichier a plat", "fichier à plat", "flat file", "fichier plat", "fichier"]
  },
  {
    key: "frequenceDepot",
    label: "Fréquence des dépôts",
    required: false,
    section: "autre",
    description: "Périodicité des transferts",
    aliases: ["frequence des depots", "fréquence des dépôts", "frequence", "fréquence", "periodicite", "périodicité", "frequency"]
  },
  {
    key: "operationsDml",
    label: "Opérations DML",
    required: false,
    section: "autre",
    description: "Opération DML (Insert, Update, Upsert...)",
    aliases: ["operations dml", "opérations dml", "dml", "operation dml", "opération dml"]
  },
  {
    key: "cleIntegration",
    label: "Clé d'intégration",
    required: false,
    section: "autre",
    description: "Identifiant unique externe ou clé de rapprochement",
    aliases: ["cle d'integration", "clé d'intégration", "cle integration", "clé intégration", "integration key", "external id", "cle"]
  },
  {
    key: "filtresDonnees",
    label: "Filtres des données",
    required: false,
    section: "autre",
    description: "Conditions ou filtres appliqués à l'extraction",
    aliases: ["filtres des donnees", "filtres des données", "filtres", "filter", "filters", "conditions"]
  }
];

// État d'importation en cours
let currentImportState = {
  workbook: null,
  fileName: "",
  sheetNames: [],
  selectedSheet: "",
  rawRows: [],       // Données brutes [ [col0, col1, ...], ... ]
  fileColumns: [],   // [ { index: 0, name: "Sens du flux", label: "Col 1: Sens du flux" }, ... ]
  fieldMapping: {},  // { targetKey: columnIndex (int ou string) }
  dataStartIndex: 1  // Index de la 1ère ligne de données
};

function openImportModal() {
  const overlay = document.getElementById("modal-import-overlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");

  // Si aucun fichier n'a encore été chargé, afficher la zone de drop
  if (!currentImportState.rawRows || currentImportState.rawRows.length === 0) {
    document.getElementById("import-step-upload").classList.remove("hidden");
    document.getElementById("import-step-mapping").classList.add("hidden");
    document.getElementById("btn-confirm-import").disabled = true;
  }
}

function closeImportModal() {
  const overlay = document.getElementById("modal-import-overlay");
  if (overlay) overlay.classList.add("hidden");
}

function resetImportFile() {
  currentImportState = {
    workbook: null,
    fileName: "",
    sheetNames: [],
    selectedSheet: "",
    rawRows: [],
    fileColumns: [],
    fieldMapping: {},
    dataStartIndex: 1
  };
  const fileInput = document.getElementById("input-import-file");
  if (fileInput) fileInput.value = "";
  const fileInputModal = document.getElementById("input-import-file-modal");
  if (fileInputModal) fileInputModal.value = "";

  document.getElementById("import-step-upload").classList.remove("hidden");
  document.getElementById("import-step-mapping").classList.add("hidden");
  document.getElementById("btn-confirm-import").disabled = true;
}

function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  openImportModal();
  processUploadedFile(file);
}

// Support Drag & Drop sur la zone d'upload
document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("import-step-upload");
  if (dropZone) {
    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
      }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
      }, false);
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        processUploadedFile(file);
      }
    }, false);
  }
});

function processUploadedFile(file) {
  currentImportState.fileName = file.name;
  showToast(`Lecture de ${file.name}...`, "info");

  const reader = new FileReader();
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  reader.onload = function(e) {
    try {
      if (typeof XLSX === "undefined") {
        showToast("Librairie de lecture XLSX non disponible.", "danger");
        return;
      }

      let workbook;
      if (isCsv) {
        const text = e.target.result;
        workbook = XLSX.read(text, { type: "string", raw: true });
      } else {
        const data = new Uint8Array(e.target.result);
        workbook = XLSX.read(data, { type: "array" });
      }

      currentImportState.workbook = workbook;
      currentImportState.sheetNames = workbook.SheetNames || [];

      if (currentImportState.sheetNames.length === 0) {
        showToast("Le fichier ne contient aucune feuille lisible.", "danger");
        return;
      }

      let defaultSheet = currentImportState.sheetNames[0];
      const foundContractSheet = currentImportState.sheetNames.find(name => 
        name.toLowerCase().includes("contrat") || name.toLowerCase().includes("interface") || name.toLowerCase().includes("mapping")
      );
      if (foundContractSheet) {
        defaultSheet = foundContractSheet;
      } else if (currentImportState.sheetNames.length > 1 && currentImportState.sheetNames[1]) {
        defaultSheet = currentImportState.sheetNames[1];
      }

      currentImportState.selectedSheet = defaultSheet;

      const sheetSelectorGroup = document.getElementById("import-sheet-selector-group");
      const sheetSelect = document.getElementById("import-sheet-select");
      if (currentImportState.sheetNames.length > 1) {
        sheetSelectorGroup.classList.remove("hidden");
        sheetSelect.innerHTML = currentImportState.sheetNames.map(name => 
          `<option value="${escapeHtml(name)}" ${name === defaultSheet ? 'selected' : ''}>${escapeHtml(name)}</option>`
        ).join("");
      } else {
        sheetSelectorGroup.classList.add("hidden");
      }

      loadSheetData(defaultSheet);

    } catch (err) {
      console.error("Erreur lecture fichier", err);
      showToast("Impossible de lire ce fichier. Assurez-vous qu'il s'agit d'un Excel ou CSV valide.", "danger");
    }
  };

  if (isCsv) {
    reader.readAsText(file, "UTF-8");
  } else {
    reader.readAsArrayBuffer(file);
  }
}

function handleImportSheetChange() {
  const sheetSelect = document.getElementById("import-sheet-select");
  if (!sheetSelect) return;
  const newSheet = sheetSelect.value;
  currentImportState.selectedSheet = newSheet;
  loadSheetData(newSheet);
}

function loadSheetData(sheetName) {
  const sheet = currentImportState.workbook.Sheets[sheetName];
  if (!sheet) return;

  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (!rawData || rawData.length === 0) {
    showToast(`La feuille "${sheetName}" est vide.`, "warning");
    return;
  }

  // Détecter la ligne d'en-tête (en ignorant métadonnées #)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawData.length, 15); i++) {
    const row = rawData[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    const firstCell = String(row[0] || "").trim();
    if (firstCell.startsWith("#")) continue;

    const nonEmptyCells = row.filter(c => String(c).trim() !== "");
    if (nonEmptyCells.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = (rawData[headerRowIndex] || []).map(h => String(h || "").trim());
  
  // Construction des colonnes du fichier avec leur index unique pour gérer les doublons (ex: 2x API Name, 2x Data Type, etc.)
  const fileColumns = [];
  rawHeaders.forEach((h, idx) => {
    const colName = h || `Colonne ${idx + 1}`;
    fileColumns.push({
      index: idx,
      name: colName,
      label: `Col ${idx + 1}: ${colName}`
    });
  });

  const dataRows = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    const firstCell = String(row[0] || "").trim();
    if (firstCell.startsWith("#")) continue;
    const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "");
    if (hasData) {
      dataRows.push(row);
    }
  }

  currentImportState.rawRows = dataRows;
  currentImportState.fileColumns = fileColumns;
  currentImportState.dataStartIndex = headerRowIndex + 1;

  document.getElementById("import-file-name").textContent = currentImportState.fileName + (currentImportState.sheetNames.length > 1 ? ` (${sheetName})` : "");
  document.getElementById("import-file-stats").textContent = `${fileColumns.length} colonnes détectées • ${dataRows.length} lignes de données prêtes`;

  document.getElementById("import-step-upload").classList.add("hidden");
  document.getElementById("import-step-mapping").classList.remove("hidden");

  // Détection automatique du mapping basée sur le modèle bizKor
  autoDetectMapping();

  document.getElementById("btn-confirm-import").disabled = (dataRows.length === 0);
  document.getElementById("btn-confirm-import-text").textContent = `Importer ${dataRows.length} champ${dataRows.length > 1 ? 's' : ''}`;
}

// Fonction de normalisation pour la comparaison fuzzy de colonnes
function normalizeHeader(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9]/g, "");     // Garder uniquement caractères alphanumériques
}

// Détection intelligente du mapping bizKor
function autoDetectMapping() {
  const mapping = {};
  const fileCols = currentImportState.fileColumns || [];
  const assignedColIndices = new Set();

  // Détecter si le fichier suit la structure bizKor (ex: Cible existante à mi-chemin)
  let cibleIndex = -1;
  fileCols.forEach(col => {
    const norm = normalizeHeader(col.name);
    if (norm.includes("cibleexistante") || norm === "cible") {
      cibleIndex = col.index;
    }
  });

  CONTRACT_TARGET_FIELDS.forEach(target => {
    let matchedCol = null;

    // Plage d'indices privilégiée selon la section (Source vs Cible)
    let candidateCols = fileCols;
    if (cibleIndex !== -1) {
      if (target.section === "source") {
        candidateCols = fileCols.filter(c => c.index < cibleIndex);
      } else if (target.section === "cible") {
        candidateCols = fileCols.filter(c => c.index >= cibleIndex);
      }
    }

    // 1. Recherche exacte sur les alias dans les colonnes candidates non encore assignées
    for (const col of candidateCols) {
      if (assignedColIndices.has(col.index)) continue;
      const normH = normalizeHeader(col.name);

      for (const alias of target.aliases) {
        const normAlias = normalizeHeader(alias);
        if (normH === normAlias) {
          matchedCol = col;
          break;
        }
      }
      if (matchedCol) break;
    }

    // 2. Si pas trouvé dans les candidates, recherche sur l'ensemble des colonnes non assignées
    if (!matchedCol) {
      for (const col of fileCols) {
        if (assignedColIndices.has(col.index)) continue;
        const normH = normalizeHeader(col.name);

        for (const alias of target.aliases) {
          const normAlias = normalizeHeader(alias);
          if (normH === normAlias) {
            matchedCol = col;
            break;
          }
        }
        if (matchedCol) break;
      }
    }

    // 3. Recherche par inclusion partielle
    if (!matchedCol) {
      for (const col of candidateCols) {
        if (assignedColIndices.has(col.index)) continue;
        const normH = normalizeHeader(col.name);
        const normTarget = normalizeHeader(target.key);
        const normLabel = normalizeHeader(target.label);

        if (normH.includes(normTarget) || normH.includes(normLabel)) {
          matchedCol = col;
          break;
        }
      }
    }

    if (matchedCol) {
      mapping[target.key] = matchedCol.index;
      assignedColIndices.add(matchedCol.index);
    }
  });

  currentImportState.fieldMapping = mapping;
  renderMappingTable();
  renderImportPreview();
}

function renderMappingTable() {
  const tbody = document.getElementById("import-mapping-tbody");
  if (!tbody) return;

  const fileCols = currentImportState.fileColumns || [];
  const sampleRow = currentImportState.rawRows[0] || [];

  tbody.innerHTML = CONTRACT_TARGET_FIELDS.map(target => {
    const isRequired = target.required;
    const selectedColIdx = currentImportState.fieldMapping[target.key];
    const isMapped = (selectedColIdx !== undefined && selectedColIdx !== null && selectedColIdx !== "");

    let sampleVal = "-";
    if (isMapped) {
      const idx = parseInt(selectedColIdx, 10);
      if (sampleRow[idx] !== undefined && sampleRow[idx] !== null) {
        sampleVal = String(sampleRow[idx]);
      }
    }

    const optionsHtml = [
      `<option value="">-- Ignorer ce champ --</option>`,
      ...fileCols.map(c => {
        const isSel = (isMapped && parseInt(selectedColIdx, 10) === c.index);
        return `<option value="${c.index}" ${isSel ? 'selected' : ''}>${escapeHtml(c.label)}</option>`;
      })
    ].join("");

    const sectionBadge = target.section === "source" 
      ? '<span style="font-size:0.65rem; background:#E8F0FE; color:#1A73E8; padding:1px 5px; border-radius:4px; margin-left:4px;">Source</span>'
      : (target.section === "cible" ? '<span style="font-size:0.65rem; background:#FCE8E6; color:#D93025; padding:1px 5px; border-radius:4px; margin-left:4px;">Cible</span>' : '');

    return `
      <tr>
        <td>
          <div class="import-target-field">
            <span class="import-target-name">
              ${escapeHtml(target.label)}
              ${isRequired ? '<span class="required-star" title="Champ obligatoire">*</span>' : ''}
              ${sectionBadge}
            </span>
            <span class="import-target-key">${escapeHtml(target.description)}</span>
          </div>
        </td>
        <td>
          <select 
            class="import-select-source ${isMapped ? 'mapped' : ''}" 
            data-target="${target.key}" 
            onchange="handleMappingChange('${target.key}', this.value)"
          >
            ${optionsHtml}
          </select>
        </td>
        <td>
          <span class="import-sample-pill" id="sample-preview-${target.key}" title="${escapeHtml(sampleVal)}">
            ${escapeHtml(sampleVal)}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function handleMappingChange(targetKey, selectedColIndex) {
  if (selectedColIndex !== "" && selectedColIndex !== undefined && selectedColIndex !== null) {
    currentImportState.fieldMapping[targetKey] = parseInt(selectedColIndex, 10);
  } else {
    delete currentImportState.fieldMapping[targetKey];
  }

  const samplePill = document.getElementById(`sample-preview-${targetKey}`);
  if (samplePill) {
    let sampleVal = "-";
    if (selectedColIndex !== "" && selectedColIndex !== undefined) {
      const idx = parseInt(selectedColIndex, 10);
      const sampleRow = currentImportState.rawRows[0] || [];
      if (sampleRow[idx] !== undefined && sampleRow[idx] !== null) {
        sampleVal = String(sampleRow[idx]);
      }
    }
    samplePill.textContent = sampleVal;
    samplePill.title = sampleVal;
  }

  const selectEl = document.querySelector(`.import-select-source[data-target="${targetKey}"]`);
  if (selectEl) {
    selectEl.classList.toggle("mapped", selectedColIndex !== "");
  }

  renderImportPreview();
}

function renderImportPreview() {
  const container = document.getElementById("import-preview-table-wrapper");
  if (!container) return;

  const previewRows = (currentImportState.rawRows || []).slice(0, 3);
  const mappedTargets = CONTRACT_TARGET_FIELDS.filter(t => currentImportState.fieldMapping[t.key] !== undefined);

  if (mappedTargets.length === 0) {
    container.innerHTML = `<div style="padding: 0.75rem; font-size: 0.78rem; color: var(--g-text-secondary); text-align: center;">Aucune colonne mappée pour le moment. Associez au moins le nom du champ ci-dessus.</div>`;
    return;
  }

  const thHtml = mappedTargets.map(t => `<th>${escapeHtml(t.label)}</th>`).join("");
  
  const trsHtml = previewRows.map(row => {
    const tds = mappedTargets.map(t => {
      const colIdx = currentImportState.fieldMapping[t.key];
      let val = (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== null) ? String(row[colIdx]) : "";
      
      if (t.key === "aInterfacer") {
        val = (val.toLowerCase().includes("oui") || val === "1" || val.toLowerCase() === "true") ? "✅ Oui" : "❌ Non";
      }
      return `<td>${escapeHtml(val || "-")}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  container.innerHTML = `
    <table class="import-preview-table">
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${trsHtml}</tbody>
    </table>
  `;
}

// Confirmation et ingestion des données mappées selon le modèle bizKor
function confirmImportData() {
  const mapping = currentImportState.fieldMapping;
  const rawRows = currentImportState.rawRows || [];

  if (rawRows.length === 0) {
    showToast("Aucune donnée à importer.", "danger");
    return;
  }

  if (mapping.champ === undefined && mapping.apiNameSource === undefined) {
    showToast("Veuillez associer au moins la colonne 'Nom du champ (Source)' ou 'API Name (Source)' pour importer vos données.", "warning");
    return;
  }

  const mode = document.querySelector('input[name="import-mode"]:checked')?.value || "append";

  let nextId = 1;
  if (mode === "append" && contractItems.length > 0) {
    nextId = Math.max(...contractItems.map(i => i.id || 0)) + 1;
  }

  const newItems = [];
  const detectedPicklists = {
    flux: new Set(),
    objet: new Set(),
    synchro: new Set(),
    cible: new Set(),
    dml: new Set()
  };

  rawRows.forEach(row => {
    const getVal = (key) => {
      const idx = mapping[key];
      if (idx === undefined || idx === null || row[idx] === undefined || row[idx] === null) return "";
      return String(row[idx]).trim();
    };

    let champName = getVal("champ");
    const apiSource = getVal("apiNameSource");
    if (!champName && apiSource) {
      champName = apiSource;
    }

    if (!champName) {
      return;
    }

    // Normalisation 'aInterfacer'
    const rawInterfacer = getVal("aInterfacer");
    let aInterfacerVal = "✅ Oui";
    if (rawInterfacer) {
      const lower = rawInterfacer.toLowerCase();
      if (lower.includes("non") || lower === "0" || lower === "false" || lower === "no") {
        aInterfacerVal = "❌ Non";
      }
    }

    // Normalisation 'required'
    const rawReq = getVal("required");
    let isRequired = false;
    if (rawReq) {
      const lowerReq = rawReq.toLowerCase();
      if (lowerReq === "true" || lowerReq === "1" || lowerReq === "oui" || lowerReq === "yes" || lowerReq.includes("requis") || lowerReq.includes("obligatoire")) {
        isRequired = true;
      }
    }

    // Normalisation type de données / longueur
    let dataTypeSourceVal = getVal("dataTypeSource");
    const lengthSourceVal = getVal("lengthSource");
    if (lengthSourceVal && dataTypeSourceVal && !dataTypeSourceVal.includes("(")) {
      dataTypeSourceVal = `${dataTypeSourceVal}(${lengthSourceVal})`;
    }

    // Commentaires fusionnés
    const commSource = getVal("commentairesSource");
    const commCible = getVal("commentaires");
    let fullCommentaires = "";
    if (commSource && commCible && commSource !== commCible) {
      fullCommentaires = `${commSource} | ${commCible}`;
    } else {
      fullCommentaires = commSource || commCible || "";
    }

    const sensFluxVal = getVal("sensFlux");
    const objetVal = getVal("objetOnglet");
    const synchroVal = getVal("synchro");
    const cibleVal = getVal("cibleExistante");
    const dmlVal = getVal("operationsDml");

    if (sensFluxVal) detectedPicklists.flux.add(sensFluxVal);
    if (objetVal) detectedPicklists.objet.add(objetVal);
    if (synchroVal) detectedPicklists.synchro.add(synchroVal);
    if (cibleVal) detectedPicklists.cible.add(cibleVal);
    if (dmlVal) detectedPicklists.dml.add(dmlVal);

    newItems.push({
      id: nextId++,
      champ: champName,
      objetOnglet: objetVal,
      sensFlux: sensFluxVal,
      apiNameSource: apiSource,
      dataTypeSource: dataTypeSourceVal,
      required: isRequired,
      values: getVal("values") || getVal("valuesCible"),
      aInterfacer: aInterfacerVal,
      synchro: synchroVal,
      cibleExistante: cibleVal,
      fieldLabelCible: getVal("fieldLabelCible"),
      apiNameCible: getVal("apiNameCible"),
      commentaires: fullCommentaires,
      fichierPlat: getVal("fichierPlat"),
      frequenceDepot: getVal("frequenceDepot"),
      operationsDml: dmlVal,
      cleIntegration: getVal("cleIntegration"),
      filtresDonnees: getVal("filtresDonnees")
    });
  });

  if (newItems.length === 0) {
    showToast("Aucune ligne valide n'a pu être extraite avec ce mapping.", "danger");
    return;
  }

  // Enrichir les picklists administrées
  const currentPicklists = getAdminPicklists();
  let picklistsUpdated = false;

  ["flux", "objet", "synchro", "cible", "dml"].forEach(cat => {
    const detectedSet = detectedPicklists[cat];
    if (detectedSet && detectedSet.size > 0) {
      const existing = currentPicklists[cat] || [];
      detectedSet.forEach(val => {
        if (val && !existing.includes(val)) {
          existing.push(val);
          picklistsUpdated = true;
        }
      });
      currentPicklists[cat] = existing;
    }
  });

  if (picklistsUpdated) {
    saveAdminPicklists(currentPicklists);
    populateFilterDropdowns();
  }

  // Appliquer le mode choisi
  if (mode === "replace") {
    contractItems = newItems;
    showToast(`✅ Contrat remplacé avec succès : ${newItems.length} champs importés`, "success");
  } else {
    contractItems = [...contractItems, ...newItems];
    showToast(`✅ ${newItems.length} champs ajoutés au contrat existant`, "success");
  }

  saveData();
  closeImportModal();
  render();
}

// Ouvre un nouveau contrat vierge dans une nouvelle fenêtre
function openNewContract() {
  const newWindow = window.open("about:blank", "_blank");
  if (!newWindow) {
    showToast("Le navigateur a bloqué l'ouverture d'une nouvelle fenêtre. Autorisez les popups.", "danger");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  // Identifiant court aléatoire (8 caractères alphanumériques)
  const shortId = Math.random().toString(36).slice(2, 10);
  const uniqueKey = "bk_" + shortId;

  // Données vierges dans le localStorage pour la nouvelle fenêtre
  localStorage.setItem(uniqueKey + "_data", JSON.stringify([]));
  localStorage.setItem(uniqueKey + "_meta", JSON.stringify({
    client: "",
    projet: "",
    date: today,
    cdpClient: "",
    cdpBizkor: "",
    commentaires: ""
  }));

  // On génère une version de index.html qui utilise une clé de stockage unique
  const currentUrl = window.location.href.replace(/[?#].*/, "");
  newWindow.location.href = currentUrl + "?contractKey=" + uniqueKey;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.addEventListener("DOMContentLoaded", init);
