Les opérations de sécurité mettent à l'épreuve toutes les autres décisions de conception : une attaque qui passe doit être détectée, corrélée, contenue et investiguée. L'examen vous demande de placer correctement Microsoft Defender XDR et Microsoft Sentinel, de décider où vont les journaux et combien de temps ils restent, d'étendre la surveillance aux serveurs locaux, à AWS et à GCP, de choisir la bonne couche d'automatisation et d'évaluer la couverture de détection avec les matrices MITRE ATT&CK.

<!-- section: xdr-siem | objectives: 2.1.1 -->
## Détection et réponse : XDR et SIEM

Les deux moitiés de la pile de détection et de réponse de Microsoft font des travaux différents :

| | Microsoft Defender XDR | Microsoft Sentinel |
| --- | --- | --- |
| Catégorie | Détection et réponse étendues (XDR) | Gestion des informations et des événements de sécurité (SIEM), avec SOAR |
| Données | Signaux natifs des produits de sécurité Microsoft : Defender for Endpoint, Defender for Office 365, Defender for Identity, Defender for Cloud Apps, plus les alertes de Defender pour le cloud | Toute source : services Microsoft, pare-feu, proxys, appliances Syslog et CEF, AWS, GCP, applications SaaS, journaux personnalisés |
| Point fort | Détections approfondies propres à chaque produit, corrélation interdomaine en incidents, actions de réponse intégrées sur les appareils, les boîtes aux lettres et les identités | Corrélation large de sources non Microsoft, règles d'analytique personnalisées, longue rétention, playbooks |
| Logique de licence | Inclus dans les licences des produits Defender | Facturation à la consommation sur les données ingérées et stockées |

La **plateforme d'opérations de sécurité unifiée** réunit les deux dans le **portail Microsoft Defender** : une seule file d'incidents, une seule expérience de recherche avancée sur les tables Sentinel et Defender XDR, des détections personnalisées qui interrogent les deux, et le moteur de corrélation de Defender XDR qui fusionne les alertes Sentinel et Defender dans les mêmes incidents. Microsoft Learn indique qu'après le **31 mars 2027**, Microsoft Sentinel n'est plus pris en charge dans le portail Azure et n'est disponible que dans le portail Defender. Le passage au portail Defender n'a pas de coût supplémentaire, et Sentinel peut y être utilisé même sans Defender XDR ni licence E5.

Conséquences de conception de la plateforme unifiée :

- Les alertes des produits de sécurité Microsoft arrivent dans Sentinel par le **connecteur Microsoft Defender XDR**, et seulement dans l'**espace de travail principal** ; les connecteurs autonomes des produits sont déconnectés.
- Fusion et les règles de création d'incidents Microsoft sont désactivées : les incidents viennent du moteur de corrélation de Defender XDR.
- Les détections personnalisées peuvent interroger les tables Defender XDR sans ingérer ces données dans Sentinel.

| Exigence | Recommandation |
| --- | --- |
| Corréler les attaques sur les points de terminaison, la messagerie et les identités avec le moins d'effort | Defender XDR, déjà sous licence avec Microsoft 365 E5 |
| Corréler un pare-feu Palo Alto, AWS CloudTrail et Okta avec les signaux Microsoft | Microsoft Sentinel, dans le portail Defender |
| Une seule file et une seule expérience de repérage pour tout le SOC | Plateforme d'opérations de sécurité unifiée (Sentinel connecté au portail Defender) |
| Conserver des données de sécurité pendant des années au moindre coût | Niveau lac de données (data lake) de Sentinel, pas une longue rétention analytique |

> **Piège d'examen.** Defender XDR et Sentinel ne sont pas des alternatives. Defender XDR couvre en profondeur les charges de travail protégées par Microsoft ; Sentinel est la réponse dès que le scénario ajoute des sources non Microsoft, une logique de détection personnalisée ou une longue rétention. Une conception « Sentinel seul » perd les actions de réponse natives des produits Defender.

<!-- section: centralized-logging | objectives: 2.1.2 -->
## Journalisation et audit centralisés

Une conception de journalisation répond à quatre questions : quelles sources, quelle destination, combien de temps, et qui peut lire.

**Espaces de travail Log Analytics.** Commencez avec le moins d'espaces de travail possible : un seul espace de travail Sentinel simplifie la corrélation et le repérage. Ne séparez que pour une raison claire : résidence des données (garder les données européennes dans une région de l'UE), propriété ou facturation distinctes, ou frontière réglementaire. Plusieurs locataires ou clients (un MSSP) se gèrent avec **Azure Lighthouse** et des vues multiespaces de travail plutôt qu'en copiant les données.

**Niveaux de rétention** (Sentinel) :

| Niveau | Usage | Rétention |
| --- | --- | --- |
| Analytique (Analytics) | Règles d'analytique, détections personnalisées, repérage rapide, classeurs | Jusqu'à 2 ans ; 90 jours gratuits pour les tables des solutions Sentinel |
| Lac de données (Data lake) | Stockage à faible coût de données volumineuses ou rarement interrogées, travaux KQL, notebooks | Jusqu'à 12 ans |
| Par défaut de Defender XDR | Tables de recherche avancée de Defender XDR | 30 jours sauf extension dans l'espace de travail |

**Microsoft Purview Audit** est le journal d'audit unifié de Microsoft 365 (Exchange, SharePoint, OneDrive, Teams, Microsoft Entra ID, Copilot et de nombreux autres services). Il est activé par défaut.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Rétention par défaut | 180 jours | 1 an pour les enregistrements Microsoft Entra ID, Exchange, OneDrive et SharePoint ; 180 jours pour les autres |
| Rétention plus longue | Non | Stratégies de rétention des journaux d'audit par service, activité ou utilisateur, jusqu'à 1 an, ou 10 ans avec le module complémentaire 10-Year Audit Log Retention (non rétroactif) |
| Événements forensiques | Événements standard | Informations intelligentes, par exemple `MailItemsAccessed` avec l'étiquette de confidentialité de l'élément consulté, événements de lecture de messages Teams |
| Office 365 Management Activity API | Bande passante de base | Environ deux fois plus de bande passante |
| Recherche | Portail Purview, `Search-UnifiedAuditLog`, Audit Search Graph API | Identique |

L'Office 365 Management Activity API est le chemin pour exporter les enregistrements d'audit vers un SIEM ; dans Sentinel, les connecteurs Microsoft 365 et Microsoft Entra ID apportent les journaux opérationnels dans l'espace de travail.

| Exigence | Recommandation |
| --- | --- |
| Déterminer quels éléments de boîte aux lettres un attaquant a lus | Audit (Premium), `MailItemsAccessed` |
| Conserver 10 ans les enregistrements d'audit SharePoint d'une équipe réglementée | Stratégie de rétention Audit (Premium) + module complémentaire 10-Year Audit Log Retention |
| Corréler l'activité Microsoft 365 avec les journaux de pare-feu | Connecteurs Sentinel vers l'espace de travail |
| Centraliser les journaux de ressources Azure de chaque abonnement, y compris les nouveaux | Paramètres de diagnostic imposés par Azure Policy (`deployIfNotExists`) au groupe d'administration |

> **Piège d'examen.** Purview Audit répond à « qui a fait quoi dans Microsoft 365 » pour la conformité et l'investigation ; ce n'est pas un SIEM et il ne corrèle pas. Les enregistrements plus anciens que la période de rétention sont perdus : une stratégie de 10 ans ne protège que les enregistrements créés après son existence.

<!-- section: hybrid-multicloud-monitoring | objectives: 2.1.3 -->
## Surveiller les environnements hybrides et multiclouds

| Environnement | Posture et protection des charges de travail | Collecte SIEM |
| --- | --- | --- |
| Serveurs locaux et d'autres clouds | Intégration à Azure Arc, puis Defender for Servers | Agent Azure Monitor (AMA) sur le serveur avec Azure Arc, piloté par des règles de collecte de données (DCR) |
| Comptes AWS | Connecteur AWS de Defender pour le cloud (CSPM sans agent, plans par compte ; instances EC2 intégrées par Azure Arc avec Defender for Servers) | Connecteurs AWS de Sentinel (CloudTrail, journaux de flux VPC, GuardDuty via un compartiment S3) |
| Projets GCP | Connecteur GCP de Defender pour le cloud | Connecteurs GCP de Sentinel (Pub/Sub) |
| Équipements réseau, appliances | Sans objet | Syslog ou CEF via AMA par un redirecteur de journaux Linux |
| Applications SaaS | Defender for Cloud Apps (connecteurs d'applications, découverte du shadow IT) | Connecteur Defender XDR, connecteurs des éditeurs SaaS |
| Active Directory local | Capteurs Defender for Identity | Connecteur Defender XDR, Windows Security Events via AMA |

Règles de conception :

- Toute machine hors Azure a besoin d'**Azure Arc** avant que la collecte par AMA et Azure Policy puissent s'y appliquer ; Arc lui donne un ID de ressource Azure, le RBAC, des étiquettes et des stratégies.
- Les DCR filtrent et transforment à la source : ne collectez que les événements utilisés par les détections, pour maîtriser les coûts.
- Pour une organisation AWS, Defender pour le cloud connecte le compte de gestion, qui intègre les comptes membres.
- Utilisez le **portail Defender** comme vue unique : les alertes de Defender pour le cloud et les incidents Sentinel arrivent dans la même file.

> **Conseil d'examen.** « Surveiller les serveurs locaux et AWS avec le même agent et les mêmes stratégies » désigne Azure Arc + AMA + DCR, pas l'agent Log Analytics (MMA) mis hors service.

<!-- section: soar | objectives: 2.1.4 -->
## Orchestration de la sécurité et réponse automatisée

Deux couches d'automatisation existent, et elles se complètent :

| Couche | Mécanisme | Usage typique |
| --- | --- | --- |
| Defender XDR | **Investigation et réponse automatisées (AIR)**, régies par le niveau d'automatisation des groupes d'appareils | Investiguer une alerte et corriger les preuves (fichiers, processus, éléments de boîte aux lettres) |
| Defender XDR | **Interruption automatique des attaques** | Contenir les utilisateurs et appareils compromis pendant un rançongiciel ou une compromission de messagerie professionnelle, avec une confiance élevée, avant la réaction du SOC |
| Sentinel | **Règles d'automatisation** | Tri sans code : changer la gravité ou l'état, attribuer un propriétaire, ajouter des étiquettes ou des tâches, exécuter un playbook |
| Sentinel | **Playbooks** (Azure Logic Apps) | Réponses en plusieurs étapes avec des connecteurs : ouvrir un ticket ServiceNow, bloquer une IP sur un pare-feu tiers, désactiver un compte dans Okta, notifier Teams |

Dans le portail Defender, les règles d'automatisation à déclencheur d'alerte n'agissent que sur les alertes Sentinel, sauf avec l'**Enhanced Alert Trigger**, et la condition Incident provider n'existe plus. Les mises à jour d'incidents arrivent dans Sentinel avec un léger délai (jusqu'à quelques minutes) : un SLA qui exige une réponse en secondes relève de l'interruption des attaques ou d'AIR, pas d'un playbook.

Conception des playbooks : une **identité managée** limitée aux rôles dont l'action a besoin, les secrets des connecteurs dans Key Vault, et une étape d'approbation humaine pour les actions destructrices sur les ressources critiques.

| Exigence | Recommandation |
| --- | --- |
| Fermer automatiquement les faux positifs connus d'un scanner | Règle d'automatisation Sentinel |
| Isoler les appareils et désactiver les comptes dès qu'un rançongiciel est détecté | Interruption automatique des attaques de Defender XDR |
| Créer un ticket dans l'outil ITSM pour chaque incident de gravité élevée | Règle d'automatisation qui exécute un playbook |
| Corriger les fichiers malveillants sur les serveurs avec le moins d'effort | AIR avec automatisation complète sur le groupe d'appareils |

> **Piège d'examen.** Un playbook n'est la réponse que si l'action exige un connecteur ou plusieurs étapes. « Réduire l'effort d'administration » avec une action simple (état, propriétaire, gravité, étiquette) désigne une règle d'automatisation.

<!-- section: security-workflows | objectives: 2.1.5 -->
## Workflows de sécurité : réponse aux incidents, repérage et gestion des incidents

La **réponse aux incidents** suit un cycle : préparation, détection et analyse, confinement, éradication et récupération, puis retour d'expérience. Microsoft publie des playbooks de réponse aux incidents pour les attaques courantes (hameçonnage, pulvérisation de mots de passe, octroi de consentement d'application) qui définissent les étapes, les données à collecter et les rôles. Une conception précise :

| Élément | Décision de conception |
| --- | --- |
| Rôles | SOC à niveaux (tri, investigation, repérage), responsable d'incident, contacts juridiques et communication |
| Autorisations | Privilège minimum : Microsoft Sentinel Responder pour les analystes, Contributor pour les ingénieurs, rôles RBAC unifié de Defender XDR limités par groupe d'appareils |
| Gravité et SLA | La gravité pilote l'attribution et le délai de réponse ; les règles d'automatisation les appliquent |
| Actions de confinement | Actions préapprouvées (isoler l'appareil, désactiver l'utilisateur, révoquer les sessions) et qui peut les déclencher |
| Communication hors bande | Un canal qui fonctionne encore quand Microsoft 365 ou le système d'identité est compromis |
| Preuves | Rétention suffisante pour l'investigation et la conservation légale |

Le **repérage des menaces** est proactif : partez d'une hypothèse (une technique MITRE, du renseignement sur les menaces, une anomalie), interrogez les données, enregistrez les résultats en signets, et transformez un repérage fructueux en **détection personnalisée** ou en règle d'analytique pour qu'il ne dépende plus d'un humain. Utilisez la recherche avancée du portail Defender sur les tables Defender XDR et Sentinel, et le lac de données (travaux KQL, notebooks) pour les repérages sur de longues périodes.

La **gestion des incidents** évalue le flux des incidents : une file unique, la déduplication par corrélation, des tâches pour les étapes standard, des commentaires pour la passation, des motifs de clôture qui alimentent le réglage, et des métriques (délai moyen de prise en compte, de réponse) revues régulièrement. Les recommandations d'**optimisation SOC** du portail Defender signalent les lacunes de couverture et les données ingérées mais inutilisées.

> **Conseil d'examen.** Quand une question demande d'« évaluer » un workflow, cherchez l'étape manquante : pas de responsable du confinement, pas de boucle de retour d'expérience, des repérages qui ne deviennent jamais des détections, ou des analystes avec des droits Contributor dont ils n'ont pas besoin.

<!-- section: mitre-coverage | objectives: 2.1.6 -->
## Couverture de détection avec MITRE ATT&CK

MITRE ATT&CK est une base de connaissances des **tactiques** de l'adversaire (l'objectif, comme l'accès initial ou le mouvement latéral) et de ses **techniques** (le comment). Elle compte trois matrices :

| Matrice | Couvre | Sources Microsoft de détections |
| --- | --- | --- |
| Enterprise | Windows, macOS, Linux, cloud (fournisseurs d'identité, SaaS, IaaS, suite Office), équipements réseau, conteneurs | Produits Defender XDR, Defender pour le cloud, règles d'analytique Sentinel |
| Mobile | Appareils Android et iOS | Defender for Endpoint sur Android et iOS, signaux de conformité Intune |
| ICS | Systèmes de contrôle industriels : automates (PLC), IHM, stations d'ingénierie, protocoles OT | Microsoft Defender pour IoT, dont les alertes OT portent des tactiques et techniques MITRE ATT&CK (ID `T0xxx`) |

La **page MITRE ATT&CK de Microsoft Sentinel** (portail Defender, gestion des menaces de Microsoft Sentinel, en préversion) affiche la matrice avec le nombre de détections par technique. Elle est alignée sur MITRE ATT&CK version 18.

| Vue | Affiche |
| --- | --- |
| Couverture active (par défaut) | Les règles d'analytique planifiées et quasi en temps réel (NRT) actuellement activées dans l'espace de travail |
| Couverture simulée | Les détections disponibles (modèles) mais non configurées : la couverture que vous auriez en les activant |
| Détails d'une technique | Règles et requêtes de repérage associées ; dans le portail Defender, couverture recommandée (rapport entre détections et produits actifs et ceux recommandés) |

La couverture vient des règles, des incidents et des requêtes de repérage associés à des techniques, et une règle ne fonctionne que si un connecteur ingère les données dont elle a besoin.

Comment évaluer la couverture :

1. Sélectionnez les menaces qui comptent pour l'entreprise (renseignement sur le secteur, rançongiciel, environnement OT).
2. Listez les techniques de ces acteurs, dans la bonne matrice.
3. Comparez avec la couverture active ; utilisez la couverture simulée pour trouver les modèles qui comblent les lacunes.
4. Vérifiez les sources de données : une technique sans les journaux nécessaires ne peut pas être détectée.
5. Priorisez les lacunes sur les ressources vitales pour l'entreprise et validez par simulation d'attaque ou purple teaming.

> **Piège d'examen.** Une usine avec des automates et des stations d'ingénierie s'évalue avec la matrice **ICS** et se protège avec Defender pour IoT, pas avec Defender for Endpoint seul. Et la couverture simulée n'est pas une protection : elle montre ce que vous pourriez détecter après avoir activé des règles et connecté des données.

<!-- section: key-points -->
## Points clés

- Defender XDR : détection et réponse approfondies sur les charges de travail Microsoft. Sentinel : SIEM et SOAR pour toutes les sources. Ensemble dans le portail Defender ; Sentinel quitte le portail Azure après le 31 mars 2027.
- Peu d'espaces de travail ; séparer uniquement pour la résidence, la propriété ou la réglementation. Niveau lac de données pour une longue rétention bon marché.
- Purview Audit Standard conserve 180 jours ; Premium ajoute 1 an pour les services principaux, des stratégies de rétention, 10 ans avec le module complémentaire, et `MailItemsAccessed`.
- Serveurs hors Azure : Azure Arc + AMA + DCR. AWS et GCP : connecteurs Defender pour le cloud pour la posture, connecteurs Sentinel pour les journaux.
- Interruption des attaques et AIR pour un confinement rapide ; règles d'automatisation pour le tri sans code ; playbooks pour les connecteurs et les réponses en plusieurs étapes.
- Les repérages deviennent des détections ; les workflows d'incident exigent des rôles, des SLA, des responsables du confinement et un retour d'expérience.
- Matrices MITRE : Enterprise, Mobile, ICS. La page MITRE de Sentinel montre la couverture active et simulée.
