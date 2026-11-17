Les réglementations nomment rarement un produit : elles demandent des contrôles, comme « les données personnelles doivent rester dans l'UE », « l'accès aux données des titulaires de carte doit être journalisé et révisé », « les enregistrements doivent être conservés sept ans ». L'architecte traduit chaque exigence en contrôles techniques, choisit l'outil Microsoft qui applique ou mesure chacun d'eux, et prouve l'alignement aux auditeurs. L'examen teste trois outils faciles à confondre : Microsoft Purview, Azure Policy et le tableau de bord de conformité réglementaire de Microsoft Defender pour le cloud.

<!-- section: requirements-to-controls | objectives: 2.4.1 -->
## Traduire les exigences de conformité en contrôles de sécurité

Méthode :

1. **Identifier les obligations** : réglementations (RGPD, NIS2, DORA, HIPAA, PCI DSS), normes sectorielles (ISO/IEC 27001, SOC 2), contrats et stratégies internes, ainsi que les données, systèmes et régions concernés.
2. **Appliquer le modèle de responsabilité partagée** : Microsoft est responsable du centre de données physique et de la plateforme, et le documente dans ses rapports d'audit sur le **Portail d'approbation de services (Service Trust Portal)** ; le client garde toujours la responsabilité des données, des identités, des comptes et des appareils, et davantage en passant du SaaS au PaaS puis à l'IaaS.
3. **Associer chaque exigence à des familles de contrôles**, avec un référentiel déjà mis en correspondance avec les normes : le **benchmark de sécurité cloud Microsoft (MCSB)** associe ses contrôles aux CIS Controls, à NIST SP 800-53 et à PCI DSS.
4. **Choisir un contrôle préventif, détectif ou correctif** et l'outil qui l'implémente.
5. **Mesurer et collecter des preuves** en continu, pas seulement avant l'audit.

| Exigence | Contrôle | Solution Microsoft |
| --- | --- | --- |
| Les données doivent rester dans une zone géographique | Emplacements autorisés pour les ressources ; engagements de résidence des données | Azure Policy (emplacements autorisés), choix de la région Azure, EU Data Boundary pour les services cloud Microsoft |
| Chiffrer les données au repos avec des clés que le client contrôle | Clés gérées par le client, journalisation de l'accès aux clés | Azure Key Vault ou Managed HSM ; Purview Customer Key pour Microsoft 365 |
| Les ingénieurs Microsoft ne doivent pas accéder au contenu sans approbation | Approbation de l'accès du support | Customer Lockbox |
| Journaliser l'activité des administrateurs et des utilisateurs, la conserver des années | Piste d'audit centrale, rétention | Purview Audit (Premium), niveau lac de données de Sentinel, paramètres de diagnostic |
| Les données personnelles doivent être trouvées et protégées | Classification, étiquetage, DLP | Microsoft Purview Information Protection et protection contre la perte de données |
| Conserver les enregistrements sept ans, puis les supprimer | Rétention et destruction | Purview Data Lifecycle Management et Records Management |
| Seules les personnes autorisées accèdent aux systèmes sensibles ; accès révisé | Privilège minimum, recertification | PIM, révisions d'accès, accès conditionnel |
| Les ressources doivent respecter la base de référence de sécurité | Normes de configuration, détection des écarts | Azure Policy, recommandations de Defender pour le cloud |

> **Piège d'examen.** Les certifications de Microsoft couvrent la part du service qui revient à Microsoft. Une charge de travail du client n'est pas conforme PCI DSS parce qu'Azure l'est : le client doit implémenter et prouver ses propres contrôles.

<!-- section: purview-compliance | objectives: 2.4.2 -->
## Répondre aux exigences de conformité avec Microsoft Purview

Le **Gestionnaire de conformité Microsoft Purview** (Compliance Manager) transforme les réglementations en **évaluations** :

| Élément | Sens |
| --- | --- |
| Modèle de réglementation | Une liste prédéfinie de contrôles pour une réglementation ou une norme (des centaines disponibles, modèles personnalisés possibles) |
| Évaluation | Un modèle appliqué à votre environnement, avec son propre score |
| Contrôle | Une exigence de la réglementation |
| Action d'amélioration | Ce que vous devez faire pour satisfaire un contrôle ; attribuée à un propriétaire, avec état, notes et preuves ; les actions techniques sont testées automatiquement quand c'est possible |
| Score de conformité | Progression sur les actions d'amélioration, pondérée par le risque ; inclut les actions gérées par Microsoft et les vôtres |

Le Gestionnaire de conformité évalue Microsoft 365 par défaut et peut évaluer d'autres clouds par des connecteurs. Le score de conformité mesure la progression sur les actions recommandées ; ce n'est pas une certification.

Les autres solutions Purview implémentent les contrôles :

| Exigence | Solution Purview |
| --- | --- |
| Classer et protéger les documents et e-mails où qu'ils aillent (chiffrement, marquage) | Information Protection, étiquettes de confidentialité |
| Empêcher le partage de numéros de carte ou de données de santé dans les e-mails, Teams, les points de terminaison, les navigateurs | Protection contre la perte de données (DLP) |
| Conserver ou supprimer du contenu pendant une durée définie | Data Lifecycle Management (stratégies et étiquettes de rétention) |
| Déclarer des enregistrements, immuables, avec révision avant destruction | Records Management |
| Conserver et collecter du contenu pour un litige ou une enquête | eDiscovery (conservations, recherches, jeux à réviser) |
| Enquêter sur qui a fait quoi | Audit (Standard ou Premium) |
| Détecter le vol de données par des employés sur le départ | Gestion des risques internes (Insider Risk Management) |
| Détecter le harcèlement ou les violations réglementaires dans les messages | Conformité des communications (Communication Compliance) |
| Contrôler les données sensibles dans les applications d'IA générative et Microsoft 365 Copilot | Data Security Posture Management (DSPM) for AI, avec étiquettes et DLP |
| Inventorier et classer les données dans Azure, AWS, des bases de données locales | Purview Data Map et Unified Catalog (gouvernance des données) |

> **Piège d'examen.** Purview gouverne et protège les **données** (Microsoft 365, points de terminaison, patrimoines de données). Il n'évalue pas la configuration des ressources Azure : « les comptes de stockage doivent refuser l'accès public » relève d'Azure Policy ou de Defender pour le cloud, pas de Purview.

<!-- section: azure-policy | objectives: 2.4.3 -->
## Solutions Azure Policy pour la sécurité et la conformité

Azure Policy évalue les requêtes Azure Resource Manager et les ressources existantes par rapport à des règles.

| Élément | Usage en conception |
| --- | --- |
| Définition | Une règle avec un effet |
| Initiative (ensemble de stratégies) | Un groupe de définitions pour un objectif ; les initiatives réglementaires intégrées (ISO 27001, NIST SP 800-53, PCI DSS...) associent les définitions aux contrôles de la norme |
| Attribution | Applique une définition ou une initiative à un groupe d'administration, un abonnement ou un groupe de ressources ; héritée en dessous ; exclusions possibles |
| Exemption | Une ressource ou une étendue échappe à une attribution, catégorie **Waiver** ou **Mitigated**, avec une expiration facultative |
| Tâche de correction | Corrige les ressources existantes pour `deployIfNotExists` et `modify`, avec l'identité managée de l'attribution |

| Effet | Usage de sécurité |
| --- | --- |
| `deny` | Empêcher les ressources non conformes (IP publique sur un sous-réseau de bases de données, stockage sans HTTPS uniquement) |
| `audit` / `auditIfNotExists` | Signaler la non-conformité ou une ressource associée manquante sans bloquer |
| `deployIfNotExists` | Déployer ce qui manque : paramètres de diagnostic vers l'espace de travail central, un plan Defender, un agent |
| `modify` | Ajouter ou modifier des propriétés et des étiquettes, par exemple désactiver l'accès réseau public |
| `denyAction` | Bloquer les opérations de suppression sur les ressources protégées |
| `manual` | Contrôles attestés qui ne peuvent pas être vérifiés automatiquement |

Principes de conception :

- Attribuer au **groupe d'administration le plus haut** qui correspond à l'exigence, comme dans les zones d'atterrissage Azure, pour que les nouveaux abonnements héritent des contrôles.
- Déployer d'abord en **audit** (ou avec le mode d'application désactivé), puis en **deny** une fois l'impact connu.
- Gérer les définitions et les attributions comme du code, avec versionnement et revue.
- Aller au-delà d'Azure : **Azure Arc** place les serveurs locaux et d'autres clouds et les clusters Kubernetes sous Azure Policy ; la **configuration machine** audite ou configure des paramètres dans le système d'exploitation ; **Azure Policy pour Kubernetes** applique des règles d'admission aux clusters.

| Exigence | Recommandation |
| --- | --- |
| Uniquement des régions de l'UE pour chaque abonnement, y compris les futurs | Emplacements autorisés, `deny`, au groupe d'administration supérieur |
| Toutes les ressources doivent envoyer leurs journaux à l'espace de travail central | Initiative de paramètres de diagnostic `deployIfNotExists` avec correction |
| Signaler les paramètres de stratégie de mot de passe dans les serveurs Windows Azure et locaux | Configuration machine, serveurs intégrés avec Azure Arc |
| Une application héritée a besoin d'une dérogation temporaire | Exemption, catégorie Waiver, avec une date d'expiration |

> **Piège d'examen.** Azure Policy ne peut pas évaluer un compte AWS ou un projet GCP. Pour la conformité de configuration multicloud, utilisez les normes de Defender pour le cloud sur les connecteurs AWS et GCP ; Azure Policy n'atteint les autres clouds que par les serveurs et clusters Kubernetes avec Azure Arc.

<!-- section: defender-regulatory | objectives: 2.4.4 -->
## Valider l'alignement avec la conformité réglementaire de Defender pour le cloud

Le **tableau de bord de conformité réglementaire** de Defender pour le cloud affiche chaque norme attribuée, ses contrôles et les ressources qui réussissent ou échouent aux évaluations derrière chaque contrôle.

| Élément | Détail |
| --- | --- |
| Norme par défaut | Azure : MCSB. AWS : MCSB et AWS Foundational Security Best Practices. GCP : MCSB et GCP Default |
| Normes pour Azure, AWS et GCP | Entre autres : ISO/IEC 27001:2022, NIST SP 800-53, NIST CSF v2.0, PCI DSS v4.0.1, CIS Controls v8.1, SOC, EU GDPR, NIS2, DORA, EU AI Act |
| Normes propres à un cloud | Benchmarks CIS pour Azure, AWS, GCP et leurs services Kubernetes ; HIPAA et FedRAMP pour Azure ; AWS Well-Architected Framework |
| Prérequis pour ajouter des normes | Un plan Defender pour le cloud payant, sauf Defender for Servers Plan 1 et Defender for APIs Plan 1 |
| État des contrôles | Les contrôles évalués automatiquement sont conformes ou non conformes ; ceux qui ne peuvent pas l'être sont grisés et demandent des preuves manuelles |
| Où | Configuration et attribution dans le portail Azure ; supervision en lecture seule dans le portail Defender |

Le MCSB est la norme de sécurité derrière les recommandations de Defender pour le cloud et le **degré de sécurisation de Defender pour le cloud** ; les normes réglementaires réutilisent les mêmes évaluations, associées à leurs propres contrôles. Dans Azure, ces normes sont des initiatives Azure Policy.

Comment l'utiliser dans une conception :

1. Attribuer les normes que l'entreprise doit respecter au niveau du groupe d'administration, de l'organisation AWS ou de l'organisation GCP.
2. Corriger les recommandations en échec, ou les imposer (`deny`, `deployIfNotExists`) pour qu'elles ne reviennent pas.
3. Attester les contrôles manuels avec des preuves, et exempter les ressources protégées par un autre contrôle (Mitigated).
4. Exporter les résultats et télécharger les rapports d'audit de Microsoft pour l'auditeur ; suivre les tendances dans le temps.

| Outil | Répond à |
| --- | --- |
| Conformité réglementaire de Defender pour le cloud | Mes ressources Azure, AWS et GCP respectent-elles les contrôles techniques d'une norme ? |
| Gestionnaire de conformité Purview | Où en est l'organisation, Microsoft 365 compris, dans l'implémentation de tous les contrôles d'une réglementation, techniques et organisationnels ? |
| Azure Policy | Imposer ou auditer une règle de configuration sur les ressources Azure |
| Niveau de sécurité Microsoft (Microsoft Secure Score) | Posture de sécurité des charges de travail Microsoft 365 et d'identité |

> **Piège d'examen.** Une norme au vert dans Defender pour le cloud signifie que les vérifications automatisées réussissent, pas que l'organisation est certifiée. Et le tableau de bord de conformité réglementaire exige un plan payant pour ajouter des normes au-delà du MCSB : Defender for Servers Plan 1 seul ne suffit pas.

<!-- section: key-points -->
## Points clés

- Exigence, puis contrôle, puis outil : préventif (Azure Policy `deny`, DLP), détectif (Defender pour le cloud, Audit), correctif (correction, rétention).
- Responsabilité partagée : les rapports d'audit de Microsoft sur le Portail d'approbation de services ne couvrent pas les contrôles du client.
- Le MCSB est associé aux CIS, NIST et PCI DSS et c'est la norme par défaut de Defender pour le cloud.
- Purview protège et gouverne les données ; le Gestionnaire de conformité note la progression sur les réglementations avec des actions d'amélioration.
- Azure Policy impose la configuration dans Azure et, par Arc, sur les serveurs hybrides et Kubernetes ; attribuer aux groupes d'administration, auditer avant de refuser.
- La conformité réglementaire de Defender pour le cloud valide les ressources Azure, AWS et GCP par rapport aux normes ; ajouter des normes exige un plan payant autre que Servers Plan 1 ou APIs Plan 1.
