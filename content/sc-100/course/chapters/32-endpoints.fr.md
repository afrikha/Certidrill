Les points de terminaison sont l'endroit où commencent la plupart des attaques et où les rançongiciels se propagent. Pour l'examen SC-100, vous spécifiez des exigences plutôt que de les configurer : quel contrôle protège quelle plateforme, quelle base de référence s'applique, ce qui couvre les appareils qui ne peuvent pas exécuter d'agent, et comment les mots de passe d'administrateur local empêchent le mouvement latéral. Les réponses viennent d'une courte liste de produits : Defender for Servers et Defender for Endpoint, Microsoft Intune, Defender for IoT, les bases de référence de sécurité et Windows LAPS.

<!-- section: server-requirements | objectives: 3.2.1 -->
## Exigences de sécurité des serveurs sur plusieurs plateformes

Un parc de serveurs mélange Windows Server et des distributions Linux, dans Azure, dans AWS ou GCP et en local. L'exigence est la même partout : un seul EDR, une seule vue des vulnérabilités, une seule base de référence, un accès d'administration contrôlé.

| Exigence | À spécifier |
| --- | --- |
| EDR et détection des menaces sur les serveurs Windows et Linux, quel que soit l'emplacement | Defender for Servers, qui déploie Defender for Endpoint |
| Serveurs hors Azure gérés comme des machines virtuelles Azure | Serveurs compatibles Azure Arc, puis Defender for Servers |
| Inventaire des vulnérabilités et des logiciels sans rien installer | Analyse sans agent (Defender for Servers Plan 2 ou Defender CSPM) pour les machines Azure, AWS et GCP |
| Détecter les modifications des fichiers système et des clés de Registre | Surveillance de l'intégrité des fichiers (Plan 2) |
| Aucun port de gestion ouvert en permanence | Accès juste-à-temps aux machines virtuelles (Plan 2) ou Azure Bastion |
| Configuration du système d'exploitation renforcée, auditée en continu | Base de référence du système d'exploitation du MCSB via la configuration des machines Azure Policy |
| Intégrité du démarrage des machines virtuelles Azure | Lancement fiable (démarrage sécurisé, vTPM) avec surveillance de l'intégrité |
| Conformité des correctifs sur les serveurs Azure et Arc | Azure Update Manager, avec les mises à jour manquantes signalées dans Defender for Cloud |
| Mots de passe d'administrateur local uniques | Windows LAPS (Windows Server) ; pour Linux, supprimer les mots de passe locaux partagés et utiliser la connexion Microsoft Entra ou des clés SSH |

Les points propres aux plateformes que l'examen utilise :

- **Linux** : Defender for Endpoint sur Linux fournit l'EDR et l'antivirus ; la configuration des machines audite les paramètres Linux (SSH, autorisations de fichiers) comme ceux de Windows.
- **Contrôleurs de domaine et serveurs de niveau 0** : les capteurs Defender for Identity détectent les attaques d'identité sur AD DS, AD FS et AD CS ; administrez-les uniquement depuis des stations de travail à accès privilégié.
- **Systèmes d'exploitation hérités ou non pris en charge** : isolez-les dans un segment réseau dédié et surveillez leur trafic, car ils ne reçoivent plus de mises à jour de sécurité.

> **Piège d'examen.** L'analyse sans agent prend des captures instantanées des disques cloud. Un serveur local compatible Arc n'a pas de disque Azure à capturer : ses données de vulnérabilité viennent du capteur Defender for Endpoint.

<!-- section: clients-mobile | objectives: 3.2.2 -->
## Exigences de sécurité des clients et des appareils mobiles

Pour les clients, Microsoft Intune gère la **configuration et la conformité**, Defender for Endpoint fournit la **protection et la détection**, et l'accès conditionnel **applique** le résultat à la connexion.

| Exigence | À spécifier |
| --- | --- |
| Appareils d'entreprise entièrement gérés | Inscription à Intune : profils de configuration, stratégies de conformité, bases de référence de sécurité |
| Téléphones personnels (BYOD) avec des données d'entreprise, sans inscription | **Stratégies de protection des applications** Intune (MAM) : chiffrer les données des applications, bloquer la copie vers les applications personnelles, effacer uniquement les données d'entreprise |
| Seuls les appareils sains atteignent Microsoft 365 | Stratégie de conformité + accès conditionnel « Exiger que l'appareil soit marqué comme conforme » |
| Un appareil avec un logiciel malveillant actif perd l'accès automatiquement | Niveau de risque de l'appareil de Defender for Endpoint dans la stratégie de conformité Intune (défense contre les menaces mobiles) |
| EDR et antivirus sur Windows, macOS, Linux | Defender for Endpoint |
| Protection contre l'hameçonnage et les applications malveillantes sur Android et iOS | Defender for Endpoint sur Android et iOS (protection web, et analyse des applications sur Android) |
| Bloquer les comportements courants des logiciels malveillants (processus enfants d'Office, vol d'identifiants dans LSASS) | Règles de réduction de la surface d'attaque |
| Bloquer les applications inconnues | App Control for Business |
| Protéger les identifiants contre le vol | Credential Guard, Windows Hello Entreprise |
| Chiffrer les appareils perdus | BitLocker (Windows), FileVault (macOS), chiffrement de l'appareil exigé par la stratégie de conformité |
| Empêcher les utilisateurs de désactiver la protection | Protection contre les falsifications |

Principes de renforcement à énoncer : retirer les droits d'administrateur local aux utilisateurs, maintenir à jour le système d'exploitation et les applications (Windows Update for Business via Intune), activer la protection réseau et le filtrage du contenu web, et utiliser les bases de référence de sécurité comme configuration de départ.

> **Piège d'examen.** Les stratégies de protection des applications protègent les données **dans les applications** et n'exigent pas d'inscription : elles conviennent au BYOD. Une stratégie de conformité exige un appareil inscrit. « Appareils personnels, les utilisateurs refusent l'inscription, protéger la messagerie d'entreprise » correspond à MAM plus l'accès conditionnel « Exiger une stratégie de protection des applications ».

<!-- section: iot-embedded | objectives: 3.2.3 -->
## Exigences de sécurité des appareils IoT et des systèmes incorporés

Les appareils IoT et les systèmes incorporés (caméras, capteurs, imprimantes, lecteurs de badges, contrôleurs de gestion technique du bâtiment) ne peuvent généralement pas exécuter d'agent EDR, utilisent un firmware ancien et sont rarement inventoriés. Les exigences se répartissent en quatre groupes :

| Domaine | Exigences |
| --- | --- |
| Identité | Une **identité unique par appareil**, de préférence un certificat X.509 issu d'une chaîne d'autorités de certification, avec les clés dans une racine de confiance matérielle (TPM ou HSM) ; aucun identifiant partagé ou par défaut |
| Intégrité | Démarrage sécurisé, firmware signé, mises à jour à distance sécurisées, détection des falsifications ; désactiver les ports et services inutilisés (USB, interfaces de débogage) |
| Réseau | Segmentation des appareils IoT à l'écart des réseaux des utilisateurs et des serveurs, connexions sortantes uniquement vers le cloud, TLS pour tout le trafic |
| Visibilité | Un inventaire de chaque appareil, l'évaluation des vulnérabilités et la détection des menaces depuis le réseau |

Quel produit donne la visibilité :

| Type d'appareil | Solution |
| --- | --- |
| IoT d'entreprise sur le réseau de l'entreprise (imprimantes, téléphones VoIP, téléviseurs connectés, systèmes de conférence) | Sécurité IoT d'entreprise avec **Defender for Endpoint** (découverte sans agent depuis les points de terminaison intégrés) |
| Appareils OT et industriels (automates, IHM, contrôleurs) | Capteurs réseau OT de **Defender for IoT** |
| Appareils connectés à une solution Azure IoT | Identités d'appareils dans IoT Hub (voir le chapitre sur les services cloud), avec Defender for IoT et Defender for Containers en périphérie |

> **Conseil d'examen.** « Des appareils qui ne peuvent pas héberger d'agent » oriente vers une surveillance **réseau**, sans agent : capteurs Defender for IoT pour l'OT, découverte de Defender for Endpoint pour l'IoT d'entreprise. Ne répondez jamais « installer Defender for Endpoint sur l'automate ».

<!-- section: defender-iot-ot | objectives: 3.2.4 -->
## Sécuriser l'OT et les ICS avec Defender for IoT

**Microsoft Defender pour IoT** (Defender for IoT) découvre les appareils OT et IoT, évalue leurs vulnérabilités et détecte les menaces sans agent. Un **capteur réseau OT** (appliance physique ou machine virtuelle) se connecte à un **port SPAN ou à un TAP réseau**, inspecte le trafic par une inspection approfondie des paquets adaptée à l'OT (couche 6) et effectue localement toute la collecte, l'analyse et la génération d'alertes : il convient aux sites à faible bande passante.

| Moteur du capteur | Détecte |
| --- | --- |
| Violation de protocole | Les paquets qui enfreignent les spécifications des protocoles ICS (par exemple un code de fonction Modbus illégal) |
| Violation de stratégie | Les écarts par rapport à la base de référence apprise ou configurée |
| Logiciel malveillant industriel | Le comportement connu des logiciels malveillants OT (Triton, Havex, Black Energy) |
| Anomalie | Les communications inhabituelles de machine à machine |
| Opérationnel | Les problèmes d'exploitation comme un appareil qui ne répond plus |

Choix de gestion :

| Exigence | Conception |
| --- | --- |
| Vue centrale de nombreuses usines, intégration à Microsoft Sentinel, mises à jour automatiques du renseignement sur les menaces | Capteurs **connectés au cloud**, gérés dans le portail Azure |
| Usine isolée (air gap), aucune donnée ne doit quitter le site | Capteurs **gérés localement** : alertes dans la console de chaque capteur, renseignement sur les menaces chargé manuellement, transfert vers un SIEM local |
| Parc mixte | Hybride : certains capteurs connectés au cloud, d'autres uniquement locaux |
| Une seule vue SOC des incidents IT et OT | Defender for IoT dans le portail Microsoft Defender (préversion) aux côtés de Defender XDR |

Points de conception : placez les capteurs là où ils voient le trafic des segments du réseau de contrôle à surveiller, associez les appareils à des sites et des zones, gardez le réseau des capteurs séparé du réseau de production et envoyez les alertes des capteurs connectés au cloud vers Microsoft Sentinel pour les corréler aux signaux IT. L'ancienne **console de gestion locale** n'est plus téléchargeable après le **1er janvier 2025** : les nouvelles conceptions utilisent la gestion dans le cloud ou au niveau du capteur et les API. Les appareils sont comptés une fois par paire unique d'adresses IP et MAC ; les appareils inactifs (60 jours sans trafic dans les réseaux OT) et ceux déjà gérés par Defender for Endpoint ne sont pas comptés.

> **Piège d'examen.** Defender for IoT surveille **passivement** depuis un port miroir : il n'est pas en ligne et ne bloque pas le trafic OT, il ne risque donc jamais d'arrêter une chaîne de production. Le blocage est fait par les pare-feu et la segmentation, à partir de ses résultats.

<!-- section: security-baselines | objectives: 3.2.5 -->
## Spécifier les bases de référence de sécurité des serveurs et des clients

Une base de référence de sécurité est l'ensemble de paramètres de sécurité recommandé par Microsoft pour une plateforme. L'architecte spécifie **quelle base de référence**, **quel outil** la déploie et **comment la dérive est détectée** :

| Points de terminaison | Base de référence et outil |
| --- | --- |
| Serveurs Windows et Linux dans Azure, AWS, GCP et Arc | Base de référence du système d'exploitation du MCSB, auditée par la **configuration des machines** Azure Policy et affichée dans Defender for Cloud |
| Serveurs et clients Windows joints à un domaine | Bases de référence de sécurité Windows (stratégie de groupe) du **Security Compliance Toolkit** |
| Windows Server 2025 | Bases de référence de sécurité **OSConfig** avec contrôle de la dérive |
| Appareils Windows gérés par Intune | Bases de référence de sécurité Intune : Windows, Defender for Endpoint, Microsoft Edge, Microsoft 365 Apps, Windows 365 |
| Benchmark sectoriel exigé (CIS, NIST) | Normes réglementaires dans Defender for Cloud (Defender CSPM) pour évaluer la conformité à ces référentiels |

Règles à retenir :

- La même équipe Microsoft construit les bases de référence de stratégie de groupe et celles d'Intune ; Intune laisse de côté les paramètres qui ne s'appliquent qu'aux contrôleurs de domaine locaux.
- Les bases de référence Microsoft ne correspondent pas un à un à CIS ou au NIST. Si l'exigence cite CIS, évaluez selon la norme CIS.
- Les valeurs par défaut des bases de référence sont restrictives : déployez d'abord sur un anneau pilote, vérifiez l'état de chaque paramètre, documentez les exceptions.
- Quand une nouvelle version d'une base de référence Intune sort, les anciens profils passent en lecture seule pour les paramètres : planifiez la mise à jour vers la nouvelle version.
- Gérez chaque paramètre depuis **une seule** source : la stratégie de groupe, Intune et OSConfig qui définissent la même valeur différemment créent des conflits.

> **Piège d'examen.** Le Security Compliance Toolkit aide à migrer les bases de référence de stratégie de groupe locales vers la gestion cloud ; il n'applique rien par lui-même. Pour les appareils gérés dans le cloud, la réponse est une base de référence de sécurité Intune ; pour les parcs de serveurs hybrides, la configuration des machines.

<!-- section: windows-laps | objectives: 3.2.6 -->
## Évaluer Windows LAPS

**Windows LAPS** (solution de mot de passe d'administrateur local Windows) est intégré à Windows 11 23H2 et versions ultérieures et à Windows Server 2025, et a été ajouté à Windows 10, Windows 11 21H2 et 22H2, Windows Server 2019 et 2022 par la mise à jour du 11 avril 2023. Il fait tourner le mot de passe d'un compte d'administrateur local par appareil et le sauvegarde, ce qui neutralise le pass-the-hash et le mouvement latéral avec un mot de passe local partagé.

| État de jonction de l'appareil | Annuaire de sauvegarde |
| --- | --- |
| Joint à Microsoft Entra | Microsoft Entra ID |
| Joint à Active Directory | Active Directory (ainsi que le mot de passe DSRM des contrôleurs de domaine) |
| Joint hybride Microsoft Entra | Microsoft Entra ID ou Active Directory, **jamais les deux** |
| Inscrit à Microsoft Entra (workplace-joined) | Non pris en charge |

Critères d'évaluation :

| Exigence | Réponse |
| --- | --- |
| Licences | Windows LAPS est gratuit ; la sauvegarde dans Entra ID exige Microsoft Entra ID Gratuit ou supérieur ; les rôles personnalisés exigent Microsoft Entra ID P1 ou P2 |
| Qui peut lire les mots de passe dans Entra ID | Cloud Device Administrator ou Intune Administrator, ou un rôle personnalisé avec l'autorisation `deviceLocalCredentials/password/read` |
| Le support technique voit les métadonnées mais pas les mots de passe | Rôles avec lecture des métadonnées uniquement (Helpdesk Administrator, Security Reader) |
| Supports techniques régionaux limités à leurs appareils | Cloud Device Administrator limité à une **unité administrative** |
| Mot de passe lisible dans AD uniquement par un groupe précis | **Chiffrement** des mots de passe AD avec un groupe autorisé à déchiffrer (active aussi l'historique des mots de passe) |
| Auditer qui a récupéré un mot de passe | Journaux d'audit Microsoft Entra (« Recover device local administrator password ») ou journaux d'événements AD |
| Faire tourner le mot de passe après usage | Actions post-authentification : réinitialiser le mot de passe, déconnecter ou redémarrer après un délai de grâce |
| Déploiement de la stratégie | Stratégie Windows LAPS d'Intune (joint à Entra ou hybride), stratégie de groupe (AD et hybride) |

Migration : l'**ancien Microsoft LAPS** est déprécié à partir de Windows 11 23H2, qui bloque son installation. Le mode d'émulation permet à Windows LAPS de respecter les anciennes stratégies pendant la transition, mais il stocke les mots de passe en clair dans AD, sans chiffrement ni historique : considérez-le comme temporaire.

> **Piège d'examen.** Si un appareil est supprimé de Microsoft Entra ID, son mot de passe LAPS est perdu avec lui. Et l'accès conditionnel peut cibler les rôles intégrés qui récupèrent les mots de passe, mais pas les rôles limités à une unité administrative ni les rôles personnalisés.

<!-- section: key-points -->
## Points clés

- Serveurs, quel que soit l'emplacement : Defender for Servers (Defender for Endpoint), Arc pour ce qui est hors Azure, Plan 2 pour la surveillance de l'intégrité des fichiers et l'accès juste-à-temps, configuration des machines pour la base de référence.
- Clients : Intune pour la configuration et la conformité, Defender for Endpoint pour la protection, l'accès conditionnel pour l'application ; MAM pour le BYOD sans inscription.
- IoT et systèmes incorporés : identité unique adossée au matériel, firmware signé, segmentation, visibilité sans agent.
- Defender for IoT : capteurs OT passifs sur SPAN ou TAP, connectés au cloud ou gérés localement pour les sites isolés, intégration à Sentinel.
- Bases de référence : MCSB via la configuration des machines, bases de référence de stratégie de groupe du Security Compliance Toolkit, bases de référence Intune, OSConfig pour Windows Server 2025.
- Windows LAPS : sauvegarde dans Entra ID ou AD (pas les deux), gratuit, unités administratives pour une récupération limitée, ancien LAPS déprécié.
