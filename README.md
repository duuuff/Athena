# ScriptaAI — Éditeur de documents académiques

Application web d'édition de documents académiques construite avec Next.js 16, React 19 et TipTap 3.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19.2, CSS Variables (design system dark) |
| Éditeur | TipTap 3.22 (ProseMirror) |
| Polices | Crimson Pro (corps), Syne (titres/UI), DM Mono (mono) |
| Persistance | localStorage (scripta_documents, scripta_versions) |
| State | useState/useCallback local — zustand installé mais non utilisé |
| Typage | TypeScript strict |

---

## Architecture fichiers

```
src/
├── app/
│   ├── page.tsx                 → Route racine (Dashboard)
│   ├── editor/[id]/page.tsx     → Route éditeur (dynamic)
│   ├── layout.tsx               → Root layout + polices
│   └── globals.css              → Design system complet (CSS vars, TipTap, print)
├── components/
│   ├── dashboard/
│   │   └── Dashboard.tsx        → Page d'accueil, liste + templates
│   └── editor/
│       ├── EditorPage.tsx       → Orchestrateur éditeur + TopBar + LeftSidebar
│       ├── EditorToolbar.tsx    → Barre d'outils riche TipTap
│       ├── EditorCanvas.tsx     → Canvas A4 multi-pages + TipTap instance
│       ├── SidebarPanel.tsx     → Panneaux latéraux (AI, LaTeX, TOC, Refs)
│       ├── VersionHistoryModal.tsx → Modal historique des versions
│       ├── EquationModal.tsx    → Insertion d'équations LaTeX
│       └── ImageSettingsPanel.tsx → Réglages image (taille, float)
└── lib/
    ├── types.ts                 → Document, DocumentVersion, SaveStatus, EditorMode, PanelId
    ├── storage.ts               → CRUD localStorage + countWords
    └── defaultContent.ts        → Templates par défaut (HTML)
```

---

## Modèle de données

### `Document`
```ts
{ id, title, content (HTML), createdAt, updatedAt, wordCount }
```

### `DocumentVersion`
```ts
{ id, documentId, content (HTML), savedAt, label? }
```

Limité à **20 versions par document** (pruning auto dans `saveVersion`).

---

## Fonctionnalités implémentées

### Dashboard
- [x] Liste des documents récents avec aperçu miniature (HTML 8px)
- [x] Recherche en temps réel par titre
- [x] Création depuis templates (vierge, thèse, rapport technique, article*, CV*)
- [x] Suppression avec modal de confirmation
- [x] Formatage relatif des dates (il y a X min / il y a X h / hier / etc.)
- [x] **[v2] Tri par date modifiée, nom, ou comptage de mots**
- [x] **[v2] Bascule vue grille / vue liste**
- [x] **[v2] Templates Article et CV complétés**

### Éditeur — TopBar
- [x] Titre éditable inline avec auto-save
- [x] Indicateur de statut sauvegarde (saved / saving / unsaved / error) avec pulse
- [x] Compteur de mots live
- [x] **[v2] Temps de lecture estimé (mots / 200)**
- [x] Modes : Visuel / Split / LaTeX
- [x] Bouton "💾 Version" → sauvegarde manuelle avec label auto
- [x] **[v2] Label personnalisé pour les versions (input inline dans la TopBar)**
- [x] Bouton "Historique" → modal des versions
- [x] Bouton "Exporter PDF" (print via iframe caché)
- [x] **[v2] Bouton "Exporter MD" (téléchargement Markdown)**

### Éditeur — Toolbar TipTap
- [x] Sélecteur style (Titre 1-4, Corps, Citation, Code)
- [x] Sélecteur police (Crimson Pro, Syne, DM Mono, Arial, Georgia, TNR)
- [x] Taille de police (8–72px)
- [x] Gras, Italique, Souligné, Barré
- [x] Couleur texte + Surlignage (color pickers natifs)
- [x] Alignement (gauche, centre, droite, justifié)
- [x] Listes : puces, numérotées, tâches (checkboxes)
- [x] Indentation (sink/lift list item)
- [x] Insertion image (bouton, drag & drop sur canvas, coller presse-papiers)
- [x] Modal équations LaTeX (`code.equation`)
- [x] Tableaux avec toolbar contextuelle (+ col, − col, + lig, − lig, ✕ tab)
- [x] Séparateur horizontal, Lien, Indice, Exposant
- [x] Annuler / Rétablir, Effacer mise en forme

### Éditeur — Canvas A4
- [x] Simulation A4 multi-pages (794×1123px, 96dpi) avec gaps visuels entre pages
- [x] Numérotation de pages centrée en bas
- [x] Moteur de saut de page par injection de `marginTop` sur les blocs
- [x] Zoom 50%–150% (boutons −/+, step 10)
- [x] Drag & drop images sur la zone d'édition
- [x] Panel flottant réglages image (taille, flottement gauche/droite/centre)

### Panneaux latéraux
- [x] **AI (placeholder)** — suggestions statiques, input textarea, note "Phase 3"
- [x] **LaTeX Source** — conversion HTML → pseudo-LaTeX (sections, env quote, etc.)
- [x] **Plan (TOC)** — extraction des headings H1-H4 depuis le HTML
- [x] **Bibliographie** — liste démo + bouton "ajouter" (statique)

### Versioning
- [x] Sauvegarde manuelle de snapshots (max 20 / document)
- [x] **[v2] Label personnalisé saisi lors de la sauvegarde**
- [x] Modal historique : liste chronologique avec bouton "Restaurer"
- [x] Restauration : injecte le HTML dans l'éditeur et déclenche l'auto-save

---

## Ce qui reste à faire (Phase 3+)

- [ ] Intégration Anthropic SDK (Claude) pour l'AI Panel
- [ ] Tags / dossiers sur le dashboard
- [ ] Export .docx (mammoth.js ou libreoffice)
- [ ] Collaboration temps réel (y.js + WebSocket)
- [ ] Bibliographie réelle (DOI lookup, BibTeX import/export)
- [ ] Dark/light mode toggle
- [ ] Numérotation automatique des sections
- [ ] Commentaires / annotations dans le texte

---

## Historique des modifications

### v1 (commit initial)
- Bootstrap Next.js + TipTap
- Dashboard + éditeur + templates thèse/rapport
- Versioning localStorage, export PDF, zoom, modes split/LaTeX
- Panneaux AI/LaTeX/TOC/Refs

### v2 (2026-04-17)
- **README.md** : documentation complète du projet
- **Templates** : Article scientifique (IEEE) et CV académique complétés
- **Dashboard** : tri par date/nom/mots + bascule vue grille↔liste
- **Export Markdown** : conversion HTML→Markdown + téléchargement fichier `.md`
- **Version labels** : saisie du label au moment de la sauvegarde (input inline dans TopBar)
- **Stats enrichies** : temps de lecture estimé (mots ÷ 200 arrondi) affiché dans la TopBar
