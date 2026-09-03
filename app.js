// Application de gestion du Contrat d'Interface Salesforce <-> Codial (Google Light Style)

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
const STORAGE_KEY_PICKLISTS = "adlucem_picklists_admin_v2";
const STORAGE_KEY_COLORS   = "adlucem_picklists_colors_v1";

// Charge la map de couleurs { "flux::Salesforce => Codial": "#4285F4", ... }
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
  const defaultObjets = Array.isArray(defaultContractData) 
    ? [...new Set(defaultContractData.map(d => d.objetOnglet).filter(Boolean))].sort()
    : ["Comptes", "Contacts", "Devis / Commandes", "Projets"];

  return {
    flux: ["Salesforce => Codial", "Codial => Salesforce"],
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
      flux: "Ex: Bidirectionnel, Salesforce <=> Codial...",
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

  // Boutons du haut
  document.getElementById("btn-export").addEventListener("click", exportToCSV);
  document.getElementById("btn-add-row").addEventListener("click", () => openModal());

  // Modal
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("btn-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  // Modal Admin
  const adminOverlay = document.getElementById("modal-admin-overlay");
  if (adminOverlay) {
    adminOverlay.addEventListener("click", (e) => {
      if (e.target.id === "modal-admin-overlay") closeAdminModal();
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

  document.getElementById("btn-save").addEventListener("click", saveItemFromModal);
  document.getElementById("btn-delete").addEventListener("click", deleteItemFromModal);

  // Clic sur les KPIs pour filtrer rapidement
  document.getElementById("stat-total").addEventListener("click", () => resetFilters());
  document.getElementById("stat-oui").addEventListener("click", () => {
    setFilterVal("filter-interfacer", "oui");
  });
  document.getElementById("stat-non").addEventListener("click", () => {
    setFilterVal("filter-interfacer", "non");
  });
  document.getElementById("stat-creer").addEventListener("click", () => {
    setFilterVal("filter-cible", "Champ à créer");
  });
  document.getElementById("stat-sf-codial").addEventListener("click", () => {
    setFilterVal("filter-flux", "Salesforce => Codial");
  });
  document.getElementById("stat-codial-sf").addEventListener("click", () => {
    setFilterVal("filter-flux", "Codial => Salesforce");
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
  const sfCodial = contractItems.filter(i => (i.sensFlux || "").includes("Salesforce => Codial")).length;
  const codialSf = contractItems.filter(i => (i.sensFlux || "").includes("Codial => Salesforce")).length;

  document.getElementById("stat-val-total").textContent = total;
  document.getElementById("stat-val-oui").textContent = oui;
  document.getElementById("stat-val-non").textContent = non;
  document.getElementById("stat-val-creer").textContent = aCreer;
  document.getElementById("stat-val-sf").textContent = sfCodial;
  document.getElementById("stat-val-codial").textContent = codialSf;
  document.getElementById("total-count").textContent = total;
}

function render() {
  updateKPIs();
  const items = getFilteredData();
  
  const countText = document.getElementById("filter-count-text");
  countText.textContent = `Affichage de ${items.length} sur ${contractItems.length} règles de mapping`;

  const emptyState = document.getElementById("empty-state");
  const tableView = document.getElementById("table-view");
  const cardsView = document.getElementById("cards-view");

  if (items.length === 0) {
    emptyState.classList.remove("hidden");
    tableView.classList.add("hidden");
    cardsView.classList.add("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
    if (currentView === "table") {
      tableView.classList.remove("hidden");
      cardsView.classList.add("hidden");
      renderTable(items);
    } else {
      cardsView.classList.remove("hidden");
      tableView.classList.add("hidden");
      renderCards(items);
    }
  }
}

function renderTable(items) {
  const tbody = document.getElementById("table-body");
  
  tbody.innerHTML = items.map(item => {
    const isOui = (item.aInterfacer || "").includes("Oui");
    const isSfCodial = (item.sensFlux || "").includes("Salesforce => Codial");
    const isCodialSf = (item.sensFlux || "").includes("Codial => Salesforce");

    let fluxBadgeClass = "badge-flux-autre";
    if (isSfCodial) fluxBadgeClass = "badge-flux-sf-codial";
    else if (isCodialSf) fluxBadgeClass = "badge-flux-codial-sf";

    let fluxDisplay = item.sensFlux || "";
    if (fluxDisplay === "Salesforce => Codial") fluxDisplay = "Salesforce ➔ Codial";
    else if (fluxDisplay === "Codial => Salesforce") fluxDisplay = "Codial ➔ Salesforce";
    
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
            return `<span class="badge ${_cs ? '' : fluxBadgeClass}" style="${_cs}">${escapeHtml(fluxDisplay)}</span>`;
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
    const isSfCodial = (item.sensFlux || "").includes("Salesforce => Codial");
    const isCodialSf = (item.sensFlux || "").includes("Codial => Salesforce");

    let fluxBadgeClass = "badge-flux-autre";
    if (isSfCodial) fluxBadgeClass = "badge-flux-sf-codial";
    else if (isCodialSf) fluxBadgeClass = "badge-flux-codial-sf";

    let fluxDisplay = item.sensFlux || "";
    if (fluxDisplay === "Salesforce => Codial") fluxDisplay = "SF ➔ Codial";
    else if (fluxDisplay === "Codial => Salesforce") fluxDisplay = "Codial ➔ SF";

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
          ${item.sensFlux ? `
            <span class="badge ${fluxBadgeClass}">
              ${escapeHtml(fluxDisplay)}
            </span>
          ` : ''}
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
    document.getElementById("edit-flux").value = currentFilter.flux || "Salesforce => Codial";
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

// Menu Dropdown Export CSV
function toggleCsvMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("csv-dropdown");
  const caret = document.getElementById("btn-export-caret");
  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    updateCsvCounts();
    menu.classList.remove("hidden");
    caret.setAttribute("aria-expanded", "true");
  } else {
    closeCsvMenu();
  }
}

function closeCsvMenu() {
  const menu = document.getElementById("csv-dropdown");
  const caret = document.getElementById("btn-export-caret");
  if (menu) menu.classList.add("hidden");
  if (caret) caret.setAttribute("aria-expanded", "false");
}

function updateCsvCounts() {
  const allCount = contractItems.length;
  const sfCount = contractItems.filter(i => (i.sensFlux || "").includes("Salesforce => Codial")).length;
  const codialCount = contractItems.filter(i => (i.sensFlux || "").includes("Codial => Salesforce")).length;
  const interfacerCount = contractItems.filter(i => (i.aInterfacer || "").includes("Oui")).length;

  const elAll = document.getElementById("csv-count-all");
  const elSf = document.getElementById("csv-count-sf");
  const elCodial = document.getElementById("csv-count-codial");
  const elInterfacer = document.getElementById("csv-count-interfacer");

  if (elAll) elAll.textContent = `${allCount}`;
  if (elSf) elSf.textContent = `${sfCount}`;
  if (elCodial) elCodial.textContent = `${codialCount}`;
  if (elInterfacer) elInterfacer.textContent = `${interfacerCount}`;
}

// Fermeture du dropdown CSV au clic en dehors
window.addEventListener("click", (e) => {
  if (!e.target.closest("#csv-split-wrapper")) {
    closeCsvMenu();
  }
});

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

  closeCsvMenu();
  closeModal();

  showToast("Préparation du document PDF (format paysage adapté sur la largeur)...", "info");

  setTimeout(() => {
    window.print();
  }, 350);
}

// Helper pour nettoyer le HTML des commentaires pour les exports Excel / CSV
function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Export Excel Multi-onglets (.xlsx) avec 2 onglets : "Informations Projet" + "Contrat d'Interfaces"
function exportToExcel(scope = "all") {
  if (typeof XLSX === "undefined") {
    showToast("La librairie Excel est en cours de chargement... Veuillez réessayer.", "warning");
    return;
  }

  // 1. Filtrer les enregistrements selon le scope
  let itemsToExport = [...contractItems];
  let suffixLabel = "Complet";

  if (scope === "sf-codial") {
    itemsToExport = contractItems.filter(i => (i.sensFlux || "").includes("Salesforce => Codial"));
    suffixLabel = "Flux_SF_vers_Codial";
  } else if (scope === "codial-sf") {
    itemsToExport = contractItems.filter(i => (i.sensFlux || "").includes("Codial => Salesforce"));
    suffixLabel = "Flux_Codial_vers_SF";
  } else if (scope === "interfacer") {
    itemsToExport = contractItems.filter(i => (i.aInterfacer || "").includes("Oui"));
    suffixLabel = "A_Interfacer_Uniquement";
  }

  if (itemsToExport.length === 0) {
    showToast("Aucun champ ne correspond au périmètre sélectionné.", "danger");
    return;
  }

  // 2. Créer le classeur Excel
  const wb = XLSX.utils.book_new();

  // 3. Onglet 1 : Informations Projet (Cartouche d'en-tête bizKor)
  const metaSheetData = [
    ["SOCIÉTÉ", "bizKor"],
    ["CLIENT", projectMetadata.client || "ADLUCEM"],
    ["PROJET", projectMetadata.projet || "Intégration Codial"],
    ["DATE", projectMetadata.date || new Date().toISOString().slice(0, 10)],
    ["CHEF DE PROJET CLIENT", projectMetadata.cdpClient || "Orane LABROSSE"],
    ["CHEF DE PROJET BIZKOR", projectMetadata.cdpBizkor || "Michael MARCELINO"],
    ["PÉRIMÈTRE DE L'EXPORT", suffixLabel.replace(/_/g, " ")],
    [""],
    ["COMMENTAIRES & NOTES D'ARCHITECTURE"],
    [stripHtml(projectMetadata.commentaires || "")],
    [""],
    ["SYNTHÈSE STATISTIQUE DU CONTRAT"],
    ["Total des champs de mapping", contractItems.length],
    ["Champs à interfacer (✅ Oui)", contractItems.filter(i => (i.aInterfacer || "").includes("Oui")).length],
    ["Champs non interfacés (❌ Non)", contractItems.filter(i => (i.aInterfacer || "").includes("Non")).length],
    ["Champs à créer côté cible", contractItems.filter(i => (i.cibleExistante || "").includes("créer")).length],
    ["Flux Salesforce ➔ Codial", contractItems.filter(i => (i.sensFlux || "").includes("Salesforce => Codial")).length],
    ["Flux Codial ➔ Salesforce", contractItems.filter(i => (i.sensFlux || "").includes("Codial => Salesforce")).length]
  ];

  const wsMeta = XLSX.utils.aoa_to_sheet(metaSheetData);
  // Largeurs de colonnes pour l'onglet Informations Projet
  wsMeta["!cols"] = [{ wch: 35 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "Informations Projet");

  // 4. Onglet 2 : Contrat d'Interfaces (Données de mapping)
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
  // Largeurs de colonnes calibrées pour l'onglet Contrat
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

  // Nom du fichier
  const clientClean = (projectMetadata.client || "ADLUCEM").replace(/[^a-zA-Z0-9]/g, "_");
  const dateClean = (projectMetadata.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${dateClean}_${clientClean}_Contrat_des_interfaces_${suffixLabel}.xlsx`;

  XLSX.writeFile(wb, fileName);
  showToast(`Classeur Excel exporté avec succès (${itemsToExport.length} lignes) !`, "success");
}

function exportToCSV(scope = "all") {
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

  // Filtrer les enregistrements selon le scope sélectionné
  let itemsToExport = [...contractItems];
  let suffixLabel = "Complet";

  if (scope === "sf-codial") {
    itemsToExport = contractItems.filter(i => (i.sensFlux || "").includes("Salesforce => Codial"));
    suffixLabel = "Flux_SF_vers_Codial";
  } else if (scope === "codial-sf") {
    itemsToExport = contractItems.filter(i => (i.sensFlux || "").includes("Codial => Salesforce"));
    suffixLabel = "Flux_Codial_vers_SF";
  } else if (scope === "interfacer") {
    itemsToExport = contractItems.filter(i => (i.aInterfacer || "").includes("Oui"));
    suffixLabel = "A_Interfacer_Uniquement";
  }

  if (itemsToExport.length === 0) {
    showToast("Aucun champ ne correspond au périmètre sélectionné pour l'export.", "danger");
    return;
  }

  // Cartouche d'en-tête projet dans le CSV
  const headerMetaLines = [
    `# ==============================================================================`,
    `# CONTRAT D'INTERFACES - bizKor`,
    `# CLIENT : ${projectMetadata.client || "ADLUCEM"}`,
    `# PROJET : ${projectMetadata.projet || "Intégration Codial"}`,
    `# DATE : ${projectMetadata.date || new Date().toISOString().slice(0, 10)}`,
    `# CHEF DE PROJET CLIENT : ${projectMetadata.cdpClient || "Orane LABROSSE"}`,
    `# CHEF DE PROJET BIZKOR : ${projectMetadata.cdpBizkor || "Michael MARCELINO"}`,
    `# PÉRIMÈTRE : ${suffixLabel.replace(/_/g, " ")} (${itemsToExport.length} champs)`,
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
  
  const clientSanitized = (projectMetadata.client || "CLIENT").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = (projectMetadata.date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${dateStr}_${clientSanitized}_-_Integration_CODIAL_-_Contrat_${suffixLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Fichier CSV exporté (${itemsToExport.length} champs - ${suffixLabel.replace(/_/g, ' ')})`, "success");
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
