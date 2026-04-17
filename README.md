# ScriptaAI — Éditeur de documents académiques

> Meilleur que Word. Plus simple qu'Overleaf. Boosté à l'IA.

**Stack** : Next.js 16, React 19, TipTap 3, TypeScript, Tailwind CSS, localStorage

---

## Lancer le projet

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## ✅ Fonctionnalités implémentées

### Dashboard
- Liste des documents avec recherche en temps réel
- Modèles : document vierge, thèse/mémoire, rapport technique, article scientifique, CV académique
- Aperçu miniature des documents (rendu HTML miniaturisé)
- Suppression avec modale de confirmation
- Formatage de date relatif (« Il y a 5 min », « Hier »…)
- Bannière de statistiques (nbre de documents, total de mots)
- Options de tri : plus récent, alphabétique, nombre de mots

### Éditeur
- Éditeur riche TipTap avec rendu A4 multi-pages (794 px × 1123 px)
- Autosauvegarde avec délai 2 secondes
- Compteur de mots en temps réel + temps de lecture estimé
- 3 modes d'affichage : Visuel, Split, LaTeX
- Barre de titre éditable + indicateur de statut de sauvegarde
- Historique des versions (sauvegarder + restaurer, max 20 versions par doc)
- Export PDF via iframe d'impression (mise en page A4)
- **Mode Focus** : écriture sans distraction (masque toolbar et panneaux)
- **Recherche & Remplacement** : modal Ctrl+H avec comptage de correspondances

### Barre d'outils (Toolbar)
- Sélecteur de style (H1-H4, citation, code)
- Sélecteur de police (Crimson Pro, Syne, DM Mono, Arial, Georgia, Times)
- Taille de police (8–72 px)
- Gras, Italique, Souligné, Barré
- Couleur de texte + surlignage multicolore
- Alignement (Gauche, Centre, Droite, Justifié)
- Listes (puces, numérotées, tâches avec cases à cocher)
- Retrait / Sortie de retrait
- Insertion d'image (fichier, glisser-déposer, coller depuis presse-papiers)
- Modal d'équation LaTeX (∑)
- Insertion de tableau 3×3 + contrôles contextuels (+ col, − col, + lig, − lig, ✕ tab)
- Séparateur horizontal
- Insertion de lien
- Indice / Exposant
- Annuler / Rétablir
- Effacer la mise en forme

### Panneaux latéraux
- **Panneau IA** : interface chat (non connecté — intégration Anthropic prévue Phase 3)
- **Panneau LaTeX** : conversion pseudo-LaTeX du HTML + bouton copier dans presse-papiers
- **Panneau Plan du document** : extraction et affichage hiérarchique des titres H1-H4
- **Panneau Bibliographie** : données de démo avec bouton d'ajout

### Stockage
- Persistance localStorage (clés `scripta_documents`, `scripta_versions`)
- CRUD complet des documents
- Gestion des versions (max 20 par document, élagage automatique)
- Comptage des mots (strip HTML)

---

## 🗂 Structure des fichiers

```
src/
├── app/
│   ├── editor/[id]/page.tsx     → Route dynamique de l'éditeur
│   ├── globals.css              → Variables CSS, styles TipTap, print
│   ├── layout.tsx               → Layout racine
│   └── page.tsx                 → Page d'accueil (→ Dashboard)
├── components/
│   ├── dashboard/
│   │   └── Dashboard.tsx        → Liste docs, templates, tri, stats
│   └── editor/
│       ├── EditorPage.tsx       → Orchestrateur (état, sauvegarde, versioning)
│       ├── EditorToolbar.tsx    → Barre d'outils formatting
│       ├── EditorCanvas.tsx     → Rendu A4, pagination, TipTap
│       ├── SidebarPanel.tsx     → Panneaux IA / LaTeX / TOC / Refs
│       ├── VersionHistoryModal.tsx → Modal historique des versions
│       ├── FindReplaceModal.tsx → Modal recherche & remplacement
│       └── ImageSettingsPanel.tsx  → Panneau réglages image au clic
└── lib/
    ├── types.ts                 → Interfaces TypeScript
    ├── storage.ts               → CRUD localStorage + countWords
    └── defaultContent.ts        → Contenu par défaut des templates
```

---

## 🔮 Prochaines étapes (non implémentées)

- **Phase 3** : Intégration Anthropic Claude pour le panneau IA
- **Contenu templates** : Contenu réel pour « Article scientifique » et « CV académique »
- **Bibliographie** : Panneau Refs fonctionnel (ajout, suppression, insertion en citation)
- **Footnotes / Annotations** : Notes de bas de page TipTap
- **Collaboration** : Sync temps-réel (Y.js / CRDTs)
- **Backend** : Migration localStorage → base de données (PostgreSQL / Supabase)
