# Specs — Certifications Kubernetes (CNCF / Linux Foundation) dans Certidrill

## 1. Objectif

Ajouter un troisième éditeur au catalogue, après Microsoft et AWS : les certifications Kubernetes de la CNCF, délivrées par The Linux Foundation. Seules les certifications à **questionnaire à choix multiple** sont couvertes, car c'est le seul format que Certidrill sait reproduire de façon réaliste.

## 2. Contenu livré

| Certification | Dossier | Examen | Domaines | Contenu |
| --- | --- | --- | --- | --- |
| **KCNA** (Kubernetes and Cloud Native Associate) | `content/kcna/` | 90 min, 60 questions, réussite à 75 % | `fundamentals` 44 %, `orchestration` 28 %, `delivery` 16 %, `architecture` 12 % | 70 objectifs, 14 chapitres (≈ 19 800 mots), 630 questions `single` (préfixe `kcna-`) |
| **KCSA** (Kubernetes and Cloud Native Security Associate) | `content/kcsa/` | 90 min, 60 questions, réussite à 75 % | `overview` 14 %, `components` 22 %, `fundamentals` 22 %, `threats` 16 %, `platform` 16 %, `compliance` 10 % | 138 objectifs, 44 chapitres courts (≈ 58 200 mots), 631 questions `single` (préfixe `kcsa-`) |

Points communs :

- `vendor: CNCF`, `active: false`, tout en `draft` jusqu'à relecture humaine.
- **Anglais seulement** (`certification.languages: [en]`) : les deux examens sont proposés en anglais, japonais et chinois simplifié, pas en français. Format de données « anglais seul » décrit dans `docs/SPECS-AWS.md` §3.7.
- **Version** : ni le programme ni la version de Kubernetes de ces examens ne sont publiés. `blueprint.version: 'v1.37'`, la dernière version mineure de Kubernetes au 23/11/2026, celle des programmes CKA/CKAD/CKS actuels. Les fonctions retirées (PodSecurityPolicy, dockershim, fournisseurs cloud intégrés, KMS v1…) n'apparaissent que comme mauvaises réponses.
- **Objectifs** : les programmes (PDF sur github.com/cncf/curriculum) ne donnent que des noms de compétences. Les objectifs sont rédigés par Certidrill, 3 à 7 par compétence, à partir de kubernetes.io et du livre blanc sécurité de la CNCF (indiqué en tête de `objectives.yaml`).
- **Types** : `single` seulement (4 options) ; le manuel du candidat ne mentionne aucune question à réponses multiples. `scoring` `all_or_nothing` pour la forme.
- **Score** : la Linux Foundation donne un pourcentage. `passScore: 75`, `maxScore: 100`. Les seuils de préparation et de progression des blueprints (définis sur 1 000 pour Microsoft et AWS) ont été divisés par 10 ; à vérifier dans le code que rien ne suppose une échelle de 1 000 (`lib/exam/scoring.ts` lit déjà l'échelle du blueprint).
- Résultats : 0 problème et 0 avertissement (`content:validate`, avec le correctif local de `factory/en-only-local.diff`), `check-cert` sans problème, 10 examens simulés sans répétition pour chacune. Points non vérifiés sur une page : `factory/reports/*kcna*.md` et `*kcsa*.md`.
- Points d'actualité : MITRE ATT&CK v19 a scindé « Defense Evasion » en « Stealth » et « Defense Impairment » (aucune question ne dépend du nom de la tactique) ; les « 4C » de la sécurité cloud native ne figurent plus sur les pages actuelles de kubernetes.io (questions conceptuelles seulement) ; kubernetes.io classe désormais `aescbc` comme faible (cours KCSA corrigé) ; en v1.37 le HPA peut descendre à zéro (bêta), le chapitre 42 de KCNA ne cite encore que KEDA et Knative.

## 3. Adaptations du code

### 3.1 Éditeur CNCF (`lib/vendors.ts`)

Nouvelle entrée `cncf` (alias `cncf`, `linux foundation`) :

- `name: "CNCF"`, `docsName: "Kubernetes Documentation"`.
- `docsHosts` : kubernetes.io, cncf.io et ses sous-domaines utiles (glossary, landscape, tag-security), les pages de la Linux Foundation (training, docs), github.com (programmes, projets), les sites officiels des projets CNCF cités (Helm, Prometheus, OpenTelemetry, Falco, Istio, Linkerd, Argo CD, Flux, etcd, containerd, CRI-O, Cilium, CoreDNS, OPA, Kyverno, Sigstore, in-toto, SPIFFE, cert-manager, Envoy, KEDA, Knative, Gateway API, Harbor…), gVisor, Kata Containers, Kubescape, Trivy, et les référentiels de sécurité du programme KCSA (slsa.dev, csrc.nist.gov, nvlpubs.nist.gov, attack.mitre.org, owasp.org).
- `localizeDocsUrl` et `docsPage` : identité (contenu anglais seul).
- `scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing" }`, `glossary: null`.

La liste exacte est dans `factory/en-only-local.diff` (partie `lib/vendors.ts`), utilisée localement pour valider le contenu.

### 3.2 Textes (`messages/en.json`, `messages/fr.json`)

Sous `vendors.cncf` :

- `trademark` : « Kubernetes is a registered trademark of The Linux Foundation. KCNA, KCSA, CKA, CKAD and CKS are trademarks of The Linux Foundation. Certidrill is not affiliated with The Linux Foundation or the CNCF. » (et la traduction française).
- `scoreNote` : « The Linux Foundation reports a percentage score (75% to pass). Here, score = 100 × points earned / points possible. » (et la traduction française).

### 3.3 Catalogue et interface

- Le catalogue groupe déjà par éditeur (`groupByVendor`) : un troisième groupe « CNCF » apparaît, après Microsoft et AWS.
- Le score s'affiche en pourcentage (`maxScore: 100`) : vérifier les écrans de résultat, de rapport et de progression (pas de « /1000 » en dur, pas d'arrondi qui suppose 1 000).
- Contenu anglais seul : même comportement que pour les certifications AWS anglaises (§3.7 de `docs/SPECS-AWS.md`).
- Blocs de code des cours et des questions : `yaml`, `bash`, `json`, `text` (déjà dans `COURSE_CODE_LANGUAGES`).

## 4. Certifications non couvertes

- **CKA, CKAD, CKS** : examens pratiques en ligne de commande sur de vrais clusters (2 heures, tâches notées par un correcteur automatique). Un QCM ne serait pas un examen blanc réaliste ; ils demanderaient un environnement d'exercices (clusters éphémères, terminal dans le navigateur, correction par scripts), soit un autre produit. À étudier séparément si besoin.
- **Autres QCM de la Linux Foundation** (CNPA, CGOA, PCA, ICA, CCA, OTCA…) : possibles sur le même modèle ; demande moindre. À décider.

## 5. Procédure

Comme pour AWS : implémenter §3 (code), §3.7 de `docs/SPECS-AWS.md` (langues), puis lancer `npm run content:validate`, `npm run check-cert -- kcna` et `kcsa`, les tests unitaires et e2e (un examen KCNA de bout en bout, score en pourcentage, contenu en anglais avec l'interface en français).

## 6. Critères d'acceptation

- `content:validate` : 0 problème et 0 avertissement sur `kcna` et `kcsa` (aucun « vendor has no entry », aucune référence hors des hôtes de la CNCF).
- Le catalogue affiche le groupe CNCF ; les deux certifications restent inactives (`active: false`) jusqu'à relecture.
- Un examen blanc KCNA se passe de bout en bout : 60 questions, 90 minutes, score en pourcentage, réussite à 75 %, mention de marque CNCF/Linux Foundation affichée.
- Avec l'interface en français, le cours et l'examen s'affichent en anglais avec la mention prévue au §3.7.
