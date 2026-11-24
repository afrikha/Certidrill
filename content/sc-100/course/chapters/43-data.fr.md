La sécurité des données à l'examen SC-100 suit une séquence : trouver et classer les données, décider quelles menaces atténuer en premier, choisir le modèle de chiffrement, puis spécifier les contrôles de chaque service de données (Azure SQL, Azure Synapse Analytics, Azure Cosmos DB, Stockage Azure et les données utilisées par les charges de travail IA) ainsi que les plans Defender for Cloud qui les surveillent. Attendez-vous à des questions « que devez-vous recommander » où une contrainte, comme le contrôle des clés par le client ou l'absence totale de clés, élimine la réponse évidente.

<!-- section: discovery-classification | objectives: 4.3.1 -->
## Recherche et classification des données

On ne protège pas ce qu'on n'a pas trouvé. Chaque outil découvre une partie différente du patrimoine :

| Exigence | Solution |
| --- | --- |
| Classer les documents et les e-mails dans Microsoft 365 et sur les points de terminaison | **Types d'informations sensibles** de Microsoft Purview (intégrés, entités nommées, personnalisés, correspondance exacte des données), **classifieurs entraînables**, **étiquettes de confidentialité** |
| Analyser et classer les sources de données dans Azure, d'autres clouds et les bases de données locales, et construire un catalogue gouverné | **Data Map** et **Unified Catalog** de Microsoft Purview |
| Trouver quels stockages et bases de données cloud contiennent des données sensibles, et s'en servir pour hiérarchiser les chemins d'attaque | **Defender CSPM** avec l'extension de **découverte des données sensibles** |
| Classer les colonnes d'une base Azure SQL et auditer qui les interroge | **Découverte et classification des données** dans Azure SQL (étiquettes et types d'informations sur les colonnes, visibles dans les journaux d'audit) |
| Classer les invites et les réponses des applications d'IA | Purview DSPM (types d'informations sensibles et classifieurs sur les interactions IA) |
| Hiérarchiser les risques liés aux données à partir de tous les signaux | **Gestion de la posture de sécurité des données (DSPM)** de Purview |

Règles de classification : un motif fixe (numéro de carte, numéro d'identité national) est un type d'informations sensibles ; une liste exacte de valeurs clients relève de la correspondance exacte des données ; une catégorie de document qu'aucun motif ne décrit (contrats, code source) relève d'un classifieur entraînable. Une **étiquette de confidentialité** est la décision métier (« Confidentiel ») qui porte la protection ; la classification l'alimente, manuellement ou par étiquetage automatique.

> **Piège d'examen.** Purview Data Map classe et catalogue ; il ne bloque rien. La découverte des données sensibles de Defender CSPM ajoute le contexte des données à la posture cloud et aux chemins d'attaque. Aucun des deux ne remplace la DLP ou le chiffrement.

<!-- section: data-threat-priorities | objectives: 4.3.2 -->
## Priorités pour atténuer les menaces sur les données

Les recommandations de Microsoft sur les données suivent **connaître ses données, protéger ses données, empêcher la perte de données, gouverner ses données**, et la Confiance Zéro ajoute : supposer une violation, vérifier explicitement chaque accès, accorder le privilège minimum. Hiérarchisez selon la sensibilité et la criticité métier des données, puis selon leur exposition.

| Menace | Premières atténuations |
| --- | --- |
| Données accessibles depuis Internet (points de terminaison publics, accès anonyme aux objets blob) | Points de terminaison privés, accès au réseau public désactivé, accès anonyme désactivé, Azure Policy `Deny` |
| Clés et chaînes de connexion volées ou divulguées | Authentification Microsoft Entra avec des identités managées, clés de compte désactivées (Shared Key, `disableLocalAuth`), secrets dans Key Vault |
| Rançongiciels et administrateurs malveillants | Sauvegardes immuables, suppression réversible et contrôle de version, protection contre le vidage sur les coffres de clés, verrous de ressources, autorisation multi-utilisateur pour les sauvegardes, accès privilégié avec PIM |
| Exfiltration par un initié | DLP, gestion des risques internes, étiquettes de confidentialité avec chiffrement, contrôles de session de Defender for Cloud Apps |
| Injection et requêtes anormales | Code paramétré, protection contre les menaces de Defender for Azure SQL, WAF |
| Programme malveillant chargé dans le stockage | Analyse des programmes malveillants de Defender for Storage |
| Dérive de configuration | Azure Policy, recommandations et chemins d'attaque de Defender CSPM |
| Perte de contrôle sur les clés (régulateur, souveraineté) | Clés gérées par le client dans Key Vault ou Managed HSM |

> **Conseil d'examen.** Quand un scénario dit « en premier » ou « priorité la plus élevée », commencez par les données les plus sensibles exposées à Internet et par l'accès fondé sur l'identité : supprimer les clés et l'exposition publique ferme plus de chemins d'attaque que n'importe quel outil de détection.

<!-- section: encryption | objectives: 4.3.3 -->
## Chiffrement au repos et en transit

Azure chiffre les données au repos par défaut en AES-256 avec des **clés gérées par Microsoft**, par chiffrement d'enveloppe : une clé de chiffrement des données (DEK) chiffre les données et une clé de chiffrement de clé (KEK) protège la DEK. Les choix de conception portent sur qui contrôle la KEK :

| Exigence | Recommandation |
| --- | --- |
| Chiffrement au repos sans gestion de clés | Comportement par défaut de la plateforme (clés gérées par Microsoft) |
| Contrôler la rotation et pouvoir révoquer l'accès aux données | **Clés gérées par le client (CMK)** dans Azure Key Vault ou Managed HSM ; coffre avec suppression réversible **et** protection contre le vidage |
| Clés dans des HSM dédiés à un seul locataire, avec votre propre domaine de sécurité | **Azure Key Vault Managed HSM** |
| Une deuxième couche de chiffrement avec un autre algorithme et une autre clé | **Chiffrement d'infrastructure** (double chiffrement, toujours avec une clé gérée par Microsoft) ; pour un compte de stockage, à définir **uniquement à la création** ; sur un compte qui ne l'a pas, une nouvelle étendue de chiffrement de Stockage Blob peut l'activer à la création de l'étendue |
| Chiffrer les disques temporaires, les caches et les flux de données des machines virtuelles vers le stockage | **Chiffrement sur l'hôte** ; la mise hors service d'Azure Disk Encryption est prévue le 15 septembre 2028 |
| Des colonnes que les administrateurs de bases de données ne doivent jamais lire en clair | **Always Encrypted** (clés côté client), éventuellement avec enclaves sécurisées (les enclaves Intel SGX de la série DC arrivent en fin de support le 31 octobre 2027 ; enclaves VBS sur les autres niveaux de calcul) |
| Des données protégées pendant leur traitement | Informatique confidentielle (machines virtuelles et conteneurs confidentiels) |

Options de Key Vault :

| Option | Protection | Usage |
| --- | --- | --- |
| Key Vault Standard | Clés protégées par logiciel, secrets, certificats | Secrets et certificats des applications |
| Key Vault Premium | Ajoute les clés protégées par HSM (HSM validés FIPS 140-3 niveau 3 pour les nouvelles clés ; des versions de clés plus anciennes peuvent être sur des HSM FIPS 140-2 niveau 2) | CMK qui doit rester dans un HSM |
| Managed HSM | Pool HSM monolocataire, clés uniquement, RBAC local | Isolation maximale et souveraineté des clés |

**En transit** : exigez HTTPS et **TLS 1.2** comme minimum sur les comptes de stockage, Azure SQL et App Service ; utilisez des points de terminaison privés pour que le trafic reste sur le réseau principal de Microsoft ; pour les liaisons hybrides, ajoutez un VPN IPsec sur le peering privé ExpressRoute ou **MACsec** sur ExpressRoute Direct.

> **Piège d'examen.** « Microsoft ne doit pas pouvoir lire les données » n'est pas résolu par une seule clé gérée par le client : le service déchiffre toujours avec votre clé pendant le traitement. Le chiffrement côté client (Always Encrypted) ou l'informatique confidentielle tient les données hors de portée de l'opérateur.

<!-- section: ai-data | objectives: 4.3.4 -->
## Sécurité des données utilisées dans les charges de travail IA

Les charges de travail IA lisent des données d'ancrage (index, documents, bases de données), stockent les invites, les réponses et l'état des agents, et peuvent divulguer tout ce qu'elles atteignent. Sécurisez les données avant de les exposer à un modèle :

| Exigence | Contrôle |
| --- | --- |
| L'application ou l'agent atteint les magasins d'ancrage sans clés | Identité managée avec des rôles du plan de données sur Azure AI Search, Stockage Azure et Cosmos DB ; clés désactivées (`disableLocalAuth`) |
| Aucune exposition publique des modèles et des données | Points de terminaison privés pour la ressource Foundry et chaque ressource connectée, accès au réseau public désactivé |
| Garder les données des agents dans vos propres ressources avec vos propres clés | **Configuration standard** des agents Foundry (votre Cosmos DB, votre Stockage Azure et votre Azure AI Search) au lieu de la configuration de base gérée par Microsoft, avec CMK |
| Les utilisateurs ne doivent obtenir dans les réponses que ce qu'ils ont le droit de voir | Respecter les autorisations des sources (filtrage de sécurité dans l'index), étiquettes de confidentialité avec droits EXTRACT pour les données Microsoft 365 |
| Trouver les ressources d'IA dont les données d'ancrage sont sensibles ou exposées à Internet | Posture de sécurité de l'IA de **Defender CSPM** (nomenclature IA (AI BOM), chemins d'attaque) avec la découverte des données sensibles |
| Détecter le jailbreak, la fuite de données et le vol d'informations d'identification dans les invites | **Defender for AI services** (protection contre les menaces pour les services d'IA) |
| Classer, auditer et appliquer la gestion des risques internes et la rétention aux invites et réponses | Purview DSPM (applications et agents d'IA ; l'ancien produit s'appelle désormais DSPM for AI (classic)) ; **sécurité des données pour les interactions IA** activée depuis le plan Defender for AI services (licence Purview) |
| Bloquer une attaque par invite avant qu'elle atteigne le modèle | Garde-fous (guardrails) Foundry (prompt shields) |
| Empêcher que des données sensibles soient collées dans des sites d'IA grand public | DLP de point de terminaison Purview et contrôles du navigateur |

Classez et réduisez les données d'entraînement et d'ajustement comme tout autre jeu de données sensible : retirez ce dont le modèle n'a pas besoin, étiquetez le reste et restreignez qui peut le modifier (l'empoisonnement des données est une menace sur l'intégrité).

> **Piège d'examen.** Defender for AI services détecte et alerte ; il ne bloque pas les invites et ne classe pas les données. Le blocage relève d'un garde-fou, la posture de Defender CSPM, et la classification et la rétention des interactions de Purview.

<!-- section: azure-data-workloads | objectives: 4.3.5 -->
## Sécuriser Azure SQL, Azure Synapse Analytics et Azure Cosmos DB

| Couche | Azure SQL Database et Managed Instance | Azure Synapse Analytics | Azure Cosmos DB |
| --- | --- | --- | --- |
| Identité | Administrateur Microsoft Entra, puis **authentification Microsoft Entra uniquement** | Microsoft Entra ID pour l'espace de travail et les pools SQL | Microsoft Entra ID avec les **rôles du plan de données** de Cosmos DB ; clés désactivées (`disableLocalAuth`) |
| Réseau | Point de terminaison privé, accès au réseau public désactivé ; éviter « Autoriser les services Azure » | **Réseau virtuel managé** avec **protection contre l'exfiltration de données** (locataires cibles approuvés uniquement), points de terminaison privés managés ; les deux choisis **à la création de l'espace de travail** | Pare-feu IP, points de terminaison de service de réseau virtuel, points de terminaison privés |
| Chiffrement au repos | **TDE**, protecteur géré par le service ou par le client | TDE sur les pools SQL dédiés ; **double chiffrement avec une clé gérée par le client** de l'espace de travail (à la création) | Chiffrement par défaut ; clés gérées par le client |
| Colonnes et lignes sensibles | Always Encrypted, masquage dynamique des données, sécurité au niveau des lignes, découverte et classification des données | Sécurité au niveau des colonnes et des lignes, masquage dynamique des données | Rôles du plan de données limités à des conteneurs ; options de masquage |
| Intégrité et audit | Audit vers Stockage Azure, Log Analytics ou Event Hubs ; **registre** (ledger) pour la preuve d'inviolabilité | Audit des pools SQL | Journaux de diagnostic, verrous du plan de contrôle |
| Protection contre les menaces | Defender for Azure SQL | Defender for Azure SQL (pools SQL dédiés) | Defender for Azure Cosmos DB (API NoSQL) |

Points de décision :

- Supprimer entièrement les connexions SQL : authentification Microsoft Entra uniquement (nécessite d'abord un administrateur Microsoft Entra).
- Révoquer une base entière à la demande : protecteur TDE géré par le client ; perdre l'accès à la clé rend la base inaccessible.
- Empêcher des analystes de copier des données vers un compte de stockage d'un autre locataire : protection contre l'exfiltration de données de Synapse, qui ne peut pas être ajoutée à un espace de travail existant.
- L'accès aux données Cosmos DB avec Microsoft Entra utilise les rôles du plan de données propres à Cosmos DB (Cosmos DB Built-in Data Reader, Data Contributor), pas le rôle Azure RBAC Contributor.

> **Piège d'examen.** Le masquage dynamique des données masque les valeurs dans les résultats de requête ; ce n'est pas du chiffrement, et les utilisateurs privilégiés voient toujours les données. « Les administrateurs ne doivent pas voir les numéros de carte » relève d'Always Encrypted.

<!-- section: storage-security | objectives: 4.3.6 -->
## Sécuriser les données dans Stockage Azure

| Couche | Recommandation |
| --- | --- |
| Autorisation | Microsoft Entra ID avec des rôles de données (Storage Blob Data Reader, Contributor) ; **accès par clé partagée (Shared Key) interdit** ; **SAS de délégation d'utilisateur** quand un SAS est nécessaire |
| Transport | Transfert sécurisé requis, TLS 1.2 minimum |
| Exposition publique | Accès anonyme aux objets blob désactivé ; pare-feu avec réseaux sélectionnés, ou accès au réseau public désactivé avec des points de terminaison privés |
| Chiffrement | Clés gérées par Microsoft par défaut, CMK pour le contrôle et la révocation, chiffrement d'infrastructure choisi à la création |
| Protection des données | Suppression réversible des objets blob et des conteneurs, contrôle de version, restauration à un point dans le temps ; **stockage immuable** (rétention limitée dans le temps ou conservation légale) pour le WORM et la résilience face aux rançongiciels |
| Configuration | Verrou de ressource sur le compte, réplication d'objets entre locataires interdite, Azure Policy `Audit` puis `Deny` |
| Protection contre les menaces | Defender for Storage |

Déployez la suppression de Shared Key dans l'ordre : identifier les clients qui utilisent les clés, les migrer vers Microsoft Entra ID ou des SAS de délégation d'utilisateur, interdire Shared Key, puis l'imposer par une stratégie.

> **Piège d'examen.** Une stratégie d'accès stockée ne révoque que les jetons **SAS de service**. Un SAS de compte ne peut être révoqué qu'en faisant tourner la clé qui l'a signé, raison de plus pour interdire Shared Key et utiliser des SAS de délégation d'utilisateur.

<!-- section: defender-storage-databases | objectives: 4.3.7 -->
## Defender for Storage et Defender for Databases

Ce sont deux plans de **protection des charges de travail** de Defender for Cloud : ils détectent les menaces contre les services de données, tandis que la posture (mauvaises configurations, chemins d'attaque) relève du CSPM.

**Defender for Storage** (sans agent, par compte de stockage, Stockage Blob, Azure Files, Azure Data Lake Storage) :

| Composant | Ce qu'il ajoute |
| --- | --- |
| Supervision de l'activité | Alertes sur les accès inhabituels, l'extraction suspecte de données, l'accès depuis des adresses IP malveillantes |
| Analyse des programmes malveillants | Analyse par Microsoft Defender Antivirus au chargement ou à la demande ; résultats dans les étiquettes d'index d'objets blob, les alertes, Event Grid ; suppression réversible facultative des objets blob malveillants ; plafond mensuel par compte (10 000 Go par défaut) |
| Détection des menaces sur les données sensibles | Utilise les types d'informations sensibles de Purview pour hiérarchiser les alertes sur les comptes qui contiennent des données sensibles |

**Defender for Databases** regroupe quatre plans :

| Plan | Couvre |
| --- | --- |
| Defender for Azure SQL Databases | Azure SQL Database, SQL Managed Instance, pools SQL dédiés Synapse : évaluation des vulnérabilités et protection contre les menaces (injection SQL, force brute, accès anormal) |
| Defender for SQL servers on machines | SQL Server sur des machines virtuelles Azure et SQL Server activé par Azure Arc (local, autres clouds) |
| Defender for open-source relational databases | Serveurs flexibles Azure Database pour PostgreSQL et MySQL, moteurs Amazon RDS |
| Defender for Azure Cosmos DB | Cosmos DB for NoSQL uniquement |

Activez les plans au niveau de l'**abonnement** pour couvrir les ressources existantes et futures ; envoyez les alertes vers Defender XDR et Microsoft Sentinel pour l'investigation.

> **Piège d'examen.** Un SQL Server local n'obtient la protection Defender que par **Azure Arc** et le plan SQL servers on machines ; un compte Cosmos DB for MongoDB n'est pas couvert par Defender for Azure Cosmos DB.

<!-- section: key-points -->
## Points clés

- Découvrir et classer : Purview (types d'informations sensibles, classifieurs, étiquettes, Data Map), découverte des données sensibles de Defender CSPM, découverte et classification des données d'Azure SQL.
- Priorités : d'abord les données sensibles et exposées ; l'identité plutôt que les clés, points de terminaison privés, sauvegardes immuables, DLP contre les initiés.
- Chiffrement : clés de la plateforme par défaut, CMK avec protection contre le vidage pour le contrôle, Managed HSM pour des HSM monolocataires, chiffrement d'infrastructure à la création, Always Encrypted ou informatique confidentielle face à l'opérateur.
- Données d'IA : magasins d'ancrage privés et sans clés, configuration standard des agents pour vos propres clés, Defender CSPM pour la posture, Defender for AI services pour les menaces, Purview pour les interactions.
- Azure SQL : authentification Entra uniquement, TDE avec CMK, Always Encrypted ; Synapse : réseau virtuel managé et protection contre l'exfiltration à la création ; Cosmos DB : rôles du plan de données, authentification locale désactivée.
- Defender for Storage = activité, analyse des programmes malveillants, données sensibles ; Defender for Databases = quatre plans, Arc pour les SQL Server hors d'Azure.
