# 📋 Contrat d'Interfaces · Salesforce ↔ CODIAL

> Application web de gestion, édition et export du contrat d'interfaces entre **Salesforce** et l'ERP **Codial** — développée par **bizKor** pour le projet **ADLUCEM — Intégration Codial**.

---

## ✨ Fonctionnalités

### 📊 Tableau de bord
- **250+ règles de mapping** chargées depuis `data.js`
- **KPIs en temps réel** : total des champs, champs à interfacer, flux SF↔Codial
- **Vue Tableau** et **Vue Cartes** interchangeables
- **Tri** sur toutes les colonnes cliquables
- **Filtres combinés** : Objet/Table, Sens du flux, À interfacer, Statut cible
- **Recherche plein texte** instantanée

### ✏️ Édition des règles
Formulaire modal complet avec :
- **Section Source** : Sens du flux, Objet/Table, Nom du champ, Nom API, Type, Synchro, À interfacer, Requis, Valeurs (picklist/formule)
- **Section Champ cible** : Label, Nom API cible, Statut champ cible
- **Section Commentaires**
- **Section Paramètres Techniques d'Intégration** :
  - Fichier à plat
  - Fréquence des dépôts du fichier
  - Opérations DML (Insert / Update / Upsert / Delete)
  - Clé d'intégration
  - Filtres des données à traiter

### 🎨 Administration des Picklists
Accessible via le bouton **Administration** dans la barre supérieure :
- Gérer les valeurs de **5 picklists** : Sens du flux, Objet/Table, Synchro, Statut cible, Opérations DML
- **Ajouter**, **renommer** (modal moderne avec validation), **supprimer** des valeurs
- **Compteur d'utilisation** par valeur (ex : "56 champs")
- **Renommage en cascade** sur tout le contrat avec sauvegarde automatique
- **🎨 Couleur personnalisée** par valeur de picklist : color picker circulaire avec aperçu du badge en temps réel
- **Restauration des valeurs par défaut**

### 📤 Exports
| Format | Détails |
|--------|---------|
| **Excel `.xlsx`** | 2 onglets : Informations Projet + Contrat d'Interfaces (18 colonnes) |
| **CSV** | En-tête cartouche projet + 18 colonnes de données |
| **PDF** | Impression paysage optimisée |

Les 3 exports proposent 4 périmètres : Complet, SF→Codial, Codial→SF, À interfacer uniquement.

### 💾 Persistance
Toutes les données sont stockées dans le `localStorage` du navigateur :
- `adlucem_contract_data_v2` — règles de mapping
- `adlucem_contract_metadata_v2` — métadonnées projet
- `adlucem_picklists_admin_v2` — valeurs des picklists
- `adlucem_picklists_colors_v1` — couleurs des labels

---

## 🗂️ Structure du projet

```
adlucem-interface-contract/
├── index.html          # Interface principale (SPA)
├── style.css           # Styles Material 3 (Google Light Theme)
├── app.js              # Logique applicative complète (~1 500 lignes)
├── data.js             # Données initiales du contrat (250 règles)
├── xlsx.full.min.js    # Librairie SheetJS pour l'export Excel
├── logo-bizkor.png     # Logo bizKor (en-tête)
├── source_contract.csv # Données source CSV d'origine
└── README.md           # Ce fichier
```

---

## 🚀 Démarrage rapide

### Option 1 — Serveur Python (recommandé)
```bash
cd adlucem-interface-contract
python3 -m http.server 4321
# Ouvrir : http://localhost:4321
```

### Option 2 — npm (via package.json)
```bash
cd adlucem-interface-contract
npm start       # Démarre sur http://localhost:4321
npm run open    # Démarre et ouvre le navigateur automatiquement
```

> ⚠️ **Pas de `npm install` nécessaire** — le projet n'a aucune dépendance npm. Le serveur est fourni par le script `serve` défini dans `package.json`.

---

## 🏗️ Architecture technique

- **Vanilla JS** (ES2020+) — aucun framework
- **CSS custom** (Material 3 inspiré, variables CSS, animations)
- **SheetJS** (XLSX) pour l'export Excel multi-onglets
- **localStorage** pour la persistance sans backend
- **Aucun bundler** — servi directement en HTTP statique

---

## 👥 Équipe projet

| Rôle | Nom |
|------|-----|
| Chef de projet Client | Orane LABROSSE |
| Chef de projet bizKor | Michael MARCELINO |
| Client | ADLUCEM |
| Projet | Intégration Codial |
| Date | 03/09/2026 |

---

## 📝 Licence

Usage interne — © bizKor 2026. Tous droits réservés.
