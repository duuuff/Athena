# ScriptaAI — Éditeur de documents académiques

Éditeur de texte riche orienté académique, construit avec Next.js 16 / React 19 / TipTap 3.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16.2.2 (App Router) |
| UI | React 19, CSS-in-JS inline styles |
| Éditeur | TipTap 3.x (ProseMirror) |
| Persistence | localStorage (scripta_documents, scripta_versions) |
| Polices | Syne (UI), Crimson Pro (corps document), DM Mono (code/mono) |

---

## Architecture des fichiers

```
src/
├── app/
│   ├── page.tsx                  → Route "/" → renvoie <Dashboard>
│   ├── editor/[id]/page.tsx      → Route "/editor/:id" → renvoie <EditorPage>
│   ├── layout.tsx                → Layout racine (fonts, metadata)
│   └── globals.css               → Variables CSS, styles TipTap, print CSS
├── components/
│   ├── dashboard/
│   │   └── Dashboard.tsx         → Page d'accueil : templates + documents récents
│   └── editor/
│       ├── EditorPage.tsx        → Orchestrateur : état doc, sauvegarde, panels
│       ├── EditorToolbar.tsx     → Barre d'outils formatage (40px de hauteur)
│       ├── EditorCanvas.tsx      → Rendu A4 + TipTap + pagination + zoom
│       ├── SidebarPanel.tsx      → Panels IA / LaTeX / TOC / Bibliographie
│       ├── VersionHistoryModal.tsx → Modal historique des versions
│       ├── EquationModal.tsx     → Modal palette de symboles mathématiques
│       └── ImageSettingsPanel.tsx → Panel float/taille image au clic
└── lib/
    ├── types.ts                  → Interfaces : Document, DocumentVersion, SaveStatus, EditorMode, PanelId
    ├── storage.ts                → CRUD localStorage + countWords
    └── defaultContent.ts        → Contenus HTML de départ pour les templates
```

---

## Fonctionnalités implémentées

### Dashboard (`/`)
- **Templates** : Document vierge, Thèse/Mémoire, Rapport technique, Article scientifique, CV académique
- **Documents récents** : grille de cartes avec aperçu miniature (HTML rendu à 8px)
- **Recherche** : filtre temps-réel par titre
- **Suppression** : confirmation modale avant suppression (irréversible)
- **Timestamps relatifs** : "À l'instant", "Il y a 5 min", "Hier", etc.

### Éditeur (`/editor/:id`)

#### Modes d'affichage
- **Visuel** : éditeur WYSIWYG seul
- **Split** : éditeur + panneau LaTeX côte à côte
- **LaTeX** : panneau LaTeX forcé ouvert

#### Mise en page
- Rendu A4 (794×1123 px à 96dpi) avec marges (80px V, 90px H)
- Pagination automatique : moteur CSS via marginTop + MutationObserver
- Numéros de page centrés en bas de chaque feuille
- Zoom 50–150% (pas de 10%)

#### Formatage (barre d'outils)
- Style de paragraphe : Corps, Titres H1–H4, Citation, Code
- Police : Crimson Pro, Syne, DM Mono, Arial, Georgia, Times New Roman
- Taille de police (8–72px)
- Gras, Italique, Souligné, Barré
- Couleur du texte (color picker)
- Surlignage multicolore (color picker)
- Alignement : gauche, centre, droite, justifié
- Listes : puces, numérotées, tâches (cochables, imbriquées)
- Indentation (Tab / Shift+Tab dans les listes)
- Images : upload fichier, coller (presse-papiers), glisser-déposer
- Tableaux : insert 3×3, +col, –col, +ligne, –ligne, supprimer (toolbar contextuelle)
- Équations : palette de symboles (grec, opérateurs, calcul, ensembles, flèches…)
- Lien hypertexte
- Exposant, Indice
- Séparateur horizontal
- Annuler / Rétablir / Effacer la mise en forme

#### Sauvegarde
- **Auto-save** : 2 secondes après la dernière modification (debounce)
- **Indicateur** : point coloré (vert = sauvegardé, orange = non sauvegardé, violet = en cours)
- **Compteur de mots** en temps réel dans la barre supérieure

#### Versionnage
- Sauvegarde manuelle d'une version (bouton "💾 Version")
- Maximum 20 versions par document (les plus anciennes sont purgées)
- Modal "Historique" : liste chronologique, bouton "Restaurer" pour chaque version
- Label automatique avec date/heure de création

#### Export PDF
- Via iframe caché + `window.print()` (CSS @page A4)
- Styles dédiés : Georgia, marges 20mm×25mm, typographie propre

#### Panels latéraux
| ID | Titre | État |
|---|---|---|
| `ai` | ScriptaAI | Stub UI — intégration Anthropic prévue Phase 3 |
| `latex` | LaTeX Source | Conversion HTML→LaTeX pseudo-syntaxe live |
| `toc` | Plan du document | Extraction H1–H4, affichage hiérarchique |
| `refs` | Bibliographie | Démo statique, bouton "Ajouter" non fonctionnel |

#### Image Settings Panel
- Clic sur une image : panel flottant (position relative au clic)
- Réglages : taille (px), alignement float (gauche, droite, centre), reset

---

## Améliorations implémentées (Session 2 — 2026-04-17)

### 1. Mode Focus (distraction-free writing)
- Bouton dans la barre supérieure (⛶ Focus / ✕ Quitter)
- Masque : barre d'outils, barre latérale, tous les panneaux ouverts
- Réduit la barre supérieure à un bandeau minimal (titre + statut sauvegarde)
- Touche `Escape` pour quitter le mode focus
- Le canvas A4 prend toute la largeur disponible

### 2. Statistiques du document
- Bouton "Stats" dans la barre supérieure → modal dédiée
- Affiche : mots, caractères (avec/sans espaces), paragraphes, titres, temps de lecture estimé
- Extraction depuis le HTML du document courant

### 3. Dashboard : tri + duplication
- **Tri** : dropdown avec 4 options (Plus récent, Plus ancien, A–Z, Plus long)
- **Dupliquer** : icône sur chaque carte de document → crée une copie avec "(Copie)" dans le titre
- Résumé global : nombre de documents + total de mots

### 4. Rechercher & Remplacer (Ctrl+F / Cmd+F)
- Barre contextuelle sous la toolbar (s'affiche/masque avec Ctrl+F)
- Champ de recherche + navigation (↑ ↓ ou Entrée) + compteur "N / Total"
- Champ de remplacement + "Remplacer" (occurrence courante) + "Tout remplacer"
- Surlignage des occurrences dans le DOM de l'éditeur (fond orange)
- Fermeture avec Échap

---

## Variables CSS globales

```css
--bg: #0f0f11           /* fond de page */
--surface: #16161a      /* surface principale */
--surface2: #1e1e24     /* surface secondaire */
--surface3: #26262e     /* surface tertiaire / hover */
--border: #2e2e38       /* bordures */
--accent: #c8b4f0       /* violet clair (logo, titres) */
--accent2: #7c6aff      /* violet vif (boutons, actifs) */
--accent3: #f0d090      /* doré (LaTeX, déco) */
--text: #e8e8f0         /* texte principal */
--text2: #9090a8        /* texte secondaire */
--text3: #5a5a72        /* texte tertiaire / placeholder */
--doc-bg: #faf9f7       /* fond des feuilles A4 */
--doc-border: #e0ddd8   /* bordure feuilles */
--green: #6fcf97        /* statut sauvegardé */
--red: #eb5757          /* suppression */
--orange: #f2994a       /* statut non sauvegardé */
--sidebar-w: 44px       /* largeur sidebar icônes */
```

---

## Améliorations implémentées (Session 3 — 2026-04-17)

### 1. Bannière de statistiques (Dashboard)
- 3 cartes en haut du dashboard (visible dès le premier document) : nombre de documents, total de mots, temps de lecture global
- Complète le compteur inline déjà présent dans le header

### 2. Temps de lecture estimé (TopBar éditeur)
- Affichage `N mots · ~X min` (base : 200 mots/min) dans la barre supérieure
- S'adapte en temps réel au compteur de mots live

### 3. Bouton Copier dans le panneau LaTeX
- Bouton « Copier » dans l'en-tête du panneau LaTeX
- Copie le source LaTeX complet (avec header `\documentclass`) dans le presse-papiers
- Feedback visuel `✓ Copié` pendant 2 secondes

### 4. Modal Recherche & Remplacement (FindReplaceModal)
- Accès via Ctrl+H / Cmd+H  
- « Compter » : compte les occurrences sans modifier (traversal ProseMirror)
- « Tout remplacer » : remplace via transactions ProseMirror en ordre inverse
- Feedback coloré : violet = trouvé, vert = remplacé, gris = aucun résultat

---

### 5. Templates complets Article et CV
- **Article scientifique** : vrai article IEEE avec abstract, sections, formules, tableau comparatif, références
- **CV académique** : CV structuré complet (formation, publications, expériences, compétences, langues, distinctions)

### 6. Export Markdown
- Nouveau bouton `↓ MD` dans la TopBar éditeur
- Convertisseur HTML → Markdown (`src/lib/htmlToMarkdown.ts`) : titres, gras/italique, code, tableaux, listes, blockquotes, liens, images
- Téléchargement du fichier `.md` directement dans le navigateur

### 7. Labels personnalisés pour les versions
- Input inline dans la TopBar éditeur (`Nom de version…`)
- Appui sur Entrée ou clic 💾 → sauvegarde avec le label saisi
- Si l'input est vide : label automatique horodaté (comportement précédent)

### 8. Vue liste sur le Dashboard
- Toggle ⊞ / ≡ à droite du sélecteur de tri
- Vue liste : icône document miniature + titre + date + compteur de mots + actions (dupliquer, supprimer)

---

---

## Améliorations implémentées (Session 4 — 2026-04-17)

### 1. Bibliographie fonctionnelle (RefsPanel)
- CRUD complet : formulaire d'ajout (auteurs *, titre *, année, journal/conférence/éditeur, URL optionnelle)
- Auto-numérotation `[1]`, `[2]`… — renumérote automatiquement à chaque suppression
- Bouton **↩ Insérer [N]** : insère la citation à la position du curseur TipTap via `editor.commands.insertContent`
- Bouton **✎ Éditer** : charge les champs dans le formulaire, mode édition
- Suppression avec confirmation inline (double-clic → rouge → confirme)
- Persistance par document dans localStorage (`scripta_refs_<docId>`)
- Compteur de références dans l'en-tête du panel
- Validation : bouton désactivé si auteurs ou titre manquants

### 2. Tags colorés sur les documents (Dashboard)
- 8 tags prédéfinis avec couleurs propres : Thèse, Rapport, Article, CV, Brouillon, Travail, Perso, Urgent
- Popover d'ajout/retrait (icône 🏷) visible au survol de chaque carte/ligne
- Badges colorés affichés sur les cartes (grille) et les lignes (liste)
- **Filtre par tag** : barre de capsules cliquables sous les contrôles — filtre multi-tag (AND)
- Bouton "✕ Effacer" pour réinitialiser le filtre de tags
- Définis dans `TAG_PRESETS` (`src/lib/types.ts`) pour cohérence dashboard ↔ popover
- Champ `tags: string[]` ajouté à l'interface `Document` ; préservé lors de l'auto-save

### 3. Épingler des documents (Dashboard)
- Bouton 📌 au survol de chaque carte/ligne → toggle `pinned: boolean`
- Documents épinglés : toujours en tête de liste, avant le tri normal
- Bordure et icône violette distinctive pour les cartes épinglées
- Icône miniature 📌 dans la vue liste à la place de 📄
- Champ `pinned: boolean` ajouté à l'interface `Document` ; préservé lors de l'auto-save

### 4. Mode sombre du canvas (éditeur)
- Bouton 🌙 / ☀ dans la TopBar de l'éditeur
- Bascule le fond du canvas : `#e8e7e3` (clair) ↔ `#111115` (sombre)
- Fond des feuilles A4 : `var(--doc-bg)` (clair) ↔ `#1e1e2e` (sombre)
- Classe CSS `.canvas-dark` appliquée au wrapper contenu — override complet du thème ProseMirror (texte, titres, tableaux, blockquotes, code…)
- Préférence persistée dans localStorage (`scripta_canvas_dark`)

---

## Améliorations planifiées (Session 4 — 2026-04-17) [COMPLÉTÉ]

### 1. Bibliographie fonctionnelle
- Panneau `refs` : CRUD complet (ajout formulaire, suppression)
- Champs : auteurs, titre, année, journal/conférence, URL (optionnel)
- Auto-numérotation `[1]`, `[2]`... — persistance localStorage par document (clé `scripta_refs_<docId>`)
- Bouton « Insérer » : insère la citation `[N]` à la position du curseur TipTap via `editor.commands.insertContent`
- Passage de `documentId` et `onInsertCitation(text)` callback depuis EditorPage → SidebarPanel → RefsPanel

### 2. Tags colorés sur les documents
- Nouveau champ `tags: string[]` dans l'interface `Document`
- 8 tags prédéfinis colorés (Thèse, Rapport, Article, CV, Brouillon, Travail, Perso, Urgent)
- Gestion via popover sur les cartes du dashboard (ajout / retrait)
- Filtre par tag dans la barre de recherche du dashboard (dropdown multi-sélection)

### 3. Épingler des documents
- Nouveau champ `pinned: boolean` dans l'interface `Document`
- Icône punaise sur chaque carte/ligne du dashboard (toggle)
- Documents épinglés : section dédiée en haut de la liste, avant le tri normal

### 4. Mode sombre du canvas
- Toggle 🌙 / ☀ dans la TopBar de l'éditeur
- Bascule le fond du canvas entre blanc (`#faf9f7`) et sombre (`#1a1a22`)
- Texte du document adapté en conséquence (couleur du corps de texte inversée)
- Préférence persistée dans localStorage (`scripta_canvas_dark`)

---

## Roadmap (non implémenté)

- **Phase 3** : Intégration API Anthropic (panel IA fonctionnel : reformulation, génération, correction)
- **Phase 4** : Backend (base de données, authentification, collaboration temps-réel)
- **Export** : .docx, LaTeX compilable
- **Dossiers / espaces de travail** sur le dashboard (groupement de documents)
- **Import** : fichier .md, .docx, .tex
- **Collaboration** : commentaires, suggestions de révision, multi-curseur
