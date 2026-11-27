# Specs — Certifications Google Cloud dans Certidrill

## 1. Objectif

Ajouter un quatrième éditeur au catalogue, après Microsoft, AWS et la CNCF : Google Cloud.

Deux certifications sont livrées :

- la **Professional Cloud Architect** (`gcp-pca`), la certification Google Cloud la plus demandée sur le marché de l'emploi ;
- l'**Associate Cloud Engineer** (`gcp-ace`), la plus passée, orientée pratique (commandes `gcloud`, `kubectl` et `bq`, rôles IAM, réglages).

## 2. Contenu livré

### 2.1 Professional Cloud Architect

| Élément | Détail |
| --- | --- |
| Dossier | `content/gcp-pca/` |
| Examen | 2 h, 50 à 60 questions, choix unique et choix multiple (« Choose two. »), 2 études de cas par examen (20 à 30 % des questions) |
| Domaines | `design` 25 %, `provisioning` 17,5 %, `security` 17,5 %, `processes` 15 %, `implementation` 12,5 %, `operations` 12,5 % |
| Objectifs | 101, repris mot pour mot de l'exam guide (sections, sous-sections, puces) |
| Cours | 17 chapitres (≈ 41 500 mots), un par sous-section de l'exam guide, sauf 1.1, partagée en deux chapitres, et quelques sous-sections courtes regroupées |
| Banque | 638 questions (513 `single`, 125 `multi`) : 526 isolées (préfixes `gcppca-<n><lettre>-`) et 112 réparties dans 21 études de cas originales de 5 ou 6 questions (préfixes `gcppca-cs<n>`) |
| Quiz | 16 quiz de fin de chapitre (160 questions, ids `gcppca-qz-<ch>-NN`) au format de `docs/SPECS-QUIZ-CHAPITRE.md`, avec au moins deux `multi` en positions 6 à 10 |

### 2.2 Associate Cloud Engineer

| Élément | Détail |
| --- | --- |
| Dossier | `content/gcp-ace/` |
| Examen | 2 h, 50 à 60 questions, choix unique et choix multiple, sans étude de cas ; proposé en anglais, japonais, espagnol et portugais |
| Domaines | `setup` 20 %, `planning` 30 %, `operations` 30 %, `security` 20 % |
| Objectifs | 94, repris mot pour mot de l'exam guide |
| Cours | 18 chapitres (≈ 43 000 mots) |
| Banque | 630 questions isolées (502 `single`, 128 `multi`, préfixes `gcpace-<n><lettre>-`) ; chaque commande et chaque option ont été vérifiées sur la référence gcloud |
| Quiz | 17 quiz de fin de chapitre (170 questions, ids `gcpace-qz-<ch>-NN`) |

Résultats : `content:validate`, `check-cert` et `check-quiz` donnent 0 problème et 0 avertissement. Sur 10 examens simulés, de 50 à 59 questions, aucune question n'a été répétée et les poids des domaines étaient respectés à ±1 point. Deux passes de correction ont été faites contre la documentation : 25 chapitres corrigés au total, et environ 220 fichiers de questions modifiés, dont 7 doublons réécrits et les titres de référence complétés. Les points non vérifiés sont dans `factory/reports/*gcp-ace*.md`.

### 2.3 Points communs

- `vendor: Google Cloud`, `active: false`, tout en `draft` jusqu'à relecture humaine.
- **Anglais seulement** (`certification.languages: [en]`) : aucun des deux examens n'est proposé en français. Le format de données « anglais seul » est décrit dans `docs/SPECS-AWS.md` §3.7.
- **Score** : Google ne publie qu'un résultat réussi/échoué, sans score ni seuil.
  - Le blueprint compte en pourcentage : `maxScore: 100`, `passScore: 70`. Le seuil de 70 % est une hypothèse de Certidrill.
  - Les seuils de préparation et de progression sont alignés sur ce seuil (`minScore` 76, échelle 55–82, maîtrise 62/70/82).
- **Études de cas (PCA seulement)** : Google publie quatre études de cas, qui sont lues par les candidats avant l'examen. Certidrill ne les reproduit pas.
  - Les études de cas de Certidrill sont des entreprises fictives originales, au même format que celles de Google : Company overview, Solution concept, Existing technical environment, Business requirements, Technical requirements, Executive statement.
  - Le blueprint en tire 2 par examen (`caseStudies.count` 2, 5 à 8 questions chacune, `placement: interleaved`).
- **Résultats PCA** : `content:validate` (avec le correctif local) donne 0 problème et 0 avertissement ; `check-cert` et `check-quiz` aussi. Sur 10 examens simulés, de 50 à 59 questions, aucune question n'a été répétée, chaque examen avait 2 études de cas et les poids des domaines étaient respectés à ±1 point.
- **Passe de correction PCA** : tout a été relu contre la documentation, avec 27 corrections dans 12 chapitres et une vingtaine de questions modifiées. Les points restés non vérifiés sont dans `factory/reports/*gcp-pca*.md`.
- **Noms de produits** : ceux de l'exam guide et de la documentation de novembre 2026 (Gemini Enterprise Agent Platform, Agent Platform Pipelines, Cloud Run functions, Chrome Enterprise Premium…).

## 3. Adaptations du code

### 3.1 Éditeur Google Cloud (`lib/vendors.ts`)

Nouvelle entrée `google`, alias `google cloud`, `google` et `gcp` :

- `name: "Google Cloud"`, `docsName: "Google Cloud Documentation"`.
- `docsHosts` :
  - cloud.google.com et docs.cloud.google.com ;
  - services.google.com (exam guides) et support.google.com ;
  - ai.google.dev, developers.google.com et firebase.google.com ;
  - registry.terraform.io et developer.hashicorp.com (Terraform) ;
  - github.com (Fabric FAST), geminicli.com et antigravity.google (outils cités par l'exam guide de l'Associate Cloud Engineer).
- `localizeDocsUrl` et `docsPage` : identité.
- `scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing" }` : Google ne donne pas de crédit partiel connu.
- `glossary: null`.

Le correctif exact est dans `factory/gcp-local.diff`. Il a servi localement à valider le contenu et n'est pas commité.

### 3.2 Textes (`messages/en.json`, `messages/fr.json`)

Sous `vendors.google`, avec la traduction française pour chaque texte :

- `trademark` : « Google Cloud, Professional Cloud Architect and Associate Cloud Engineer are trademarks of Google LLC. Certidrill is not affiliated with or endorsed by Google. »
- `scoreNote` : « Google reports pass or fail only and publishes no passing score. Here, score = 100 × points earned / points possible, and 70% is Certidrill's practice threshold. »

### 3.3 Examen blanc

- **Deux études de cas par examen** : vérifier que le moteur d'examen sait en tirer plus d'une (`structure.caseStudies.count.min = max = 2`).
  - Les deux doivent être différentes.
  - Leurs questions sont intercalées au hasard parmi les autres (`placement: interleaved` ; `random` place les études de cas en sections verrouillées au début ou à la fin, comme chez Microsoft).
- **Affichage côte à côte** : comme à l'examen réel, l'étude de cas reste visible pendant qu'on répond à ses questions.
  - Desktop : écran partagé ; mobile : onglet ou panneau repliable.
  - Le composant des études de cas de l'AZ-305 peut servir s'il le permet.
- **Choix multiple** : le nombre de réponses attendues est donné dans l'énoncé (« Choose two. »). L'interface affiche déjà « Select N » pour le type `multi`.
- **Score en pourcentage** : même traitement que la CNCF, sans « /1000 » en dur. Le résultat affiche aussi « Pass » ou « Fail » et la note `scoreNote`.

### 3.4 Catalogue

- Un quatrième groupe « Google Cloud » apparaît dans `groupByVendor`.
- Blocs de code des cours et des questions : `bash`, `yaml`, `json` et `text`, déjà dans `COURSE_CODE_LANGUAGES`. Le Terraform, quand il y en a, est en `text`.

### 3.5 Vérificateur des quiz (`factory/check-quiz.ts`)

La règle « au moins deux formats autres que `single` en positions 6 à 10 » ne peut pas s'appliquer quand le `typeMix` du blueprint n'offre qu'un seul autre format, comme chez Google (`multi`). Dans ce cas, le vérificateur exige deux questions de ce format. Le changement est dans ce commit ; les autres certifications ne sont pas touchées (az-104 : 0 problème).

## 4. Décisions humaines ouvertes

- **Seuil de réussite de 70 %** : c'est une hypothèse, puisque Google ne publie aucun seuil.
- **Gemini Cloud Assist** : le produit est en Preview, mais les objectifs 1.2.6 et 5.1.5 le citent nommément.
  - Il reste la bonne réponse uniquement dans les questions de ces deux objectifs (11 questions), et leurs explications le disent.
  - À garder ou à retirer.
- **Noms renommés en 2026** : les questions utilisent les noms actuels, alors que les candidats verront peut-être encore les anciens noms à l'examen.
  - Exemples : Managed Service for Apache Spark (ex-Dataproc), Managed Service for Apache Airflow (ex-Cloud Composer), Observability Analytics (ex-Log Analytics), Agent Platform (ex-Vertex AI), rôles de base Admin, Writer et Reader.
  - Les explications donnent l'ancien nom (« formerly … »).
- **ACE, outils récents** : l'exam guide cite Gemini CLI, Google Antigravity et Application Design Center. Leur stade de lancement n'est pas toujours affiché ; les questions les testent sur des faits stables, et Gemini Cloud Assist (Preview) n'est une bonne réponse que là où un objectif le nomme. Les budgets à plafond de dépenses (spend cap) sont une bonne réponse dans une question : ils ne couvrent qu'une liste courte de services.
- **Mention de « Claude »** : le chapitre 14 cite Claude parmi les modèles partenaires de Model Garden. C'est un fait du catalogue Google, pas un identifiant de modèle.

## 5. Suite possible

- Les autres certifications Google Cloud ont le même format QCM et peuvent suivre le même modèle :
  - Professional Data Engineer ;
  - Professional Cloud DevOps Engineer ;
  - Professional Cloud Security Engineer.
- À décider selon la demande.

## 6. Procédure

1. Implémenter le §3, avec le format anglais seul du §3.7 de `docs/SPECS-AWS.md`.
2. Lancer `npm run content:validate -- --cert gcp-pca` et `--cert gcp-ace`, puis `npx tsx factory/check-cert.ts` et `npx tsx factory/check-quiz.ts` pour chacune.
3. Lancer les tests unitaires et e2e : un examen blanc `gcp-pca` de bout en bout, avec 2 études de cas, un examen `gcp-ace` sans étude de cas, un score en pourcentage et l'interface en français.

## 7. Critères d'acceptation

- `content:validate` : 0 problème et 0 avertissement sur `gcp-pca` et `gcp-ace`.
  - Aucun « vendor has no entry ».
  - Aucune référence hors des hôtes de l'éditeur Google.
- Le catalogue affiche le groupe Google Cloud. Les deux certifications restent inactives jusqu'à relecture.
- Un examen blanc se passe de bout en bout :
  - 50 à 60 questions en 120 minutes ;
  - exactement 2 études de cas différentes, affichées à côté de leurs questions ;
  - score en pourcentage, réussite à 70 % ;
  - note de score et mention de marque Google affichées.
- Avec l'interface en français, le cours et l'examen s'affichent en anglais, avec la mention prévue au §3.7 de `docs/SPECS-AWS.md`.
