Les bonnes pratiques de sécurité de Microsoft partent d'une hypothèse : un attaquant finira par entrer. Une stratégie de résilience se demande donc quelles ressources métier comptent le plus, comment l'organisation les récupère sans payer de rançon, comment elle empêche un seul compte compromis de tout faire tomber, et comment elle maintient ses systèmes à jour. Les questions d'examen donnent un patrimoine hybride ou multicloud et demandent quoi protéger en premier, quelle conception de sauvegarde résiste à une attaque délibérée et quelle solution de mise à jour convient à quelles machines.

<!-- section: resiliency-strategy | objectives: 1.1.1 -->
## Une stratégie de sécurité au service de la résilience de l'entreprise

La résilience de l'entreprise signifie que l'activité continue, ou reprend vite, quand une attaque réussit. Elle suit le principe Confiance Zéro **supposer une violation** : concevoir pour réduire les dégâts pour l'entreprise, pas seulement pour tenir les attaquants dehors.

Les recommandations sur les rançongiciels distinguent deux menaces :

| Menace | Fonctionnement | Ce qu'elle vous impose |
| --- | --- | --- |
| Rançongiciel courant (commodity) | Automatisé ; se propage comme un virus par hameçonnage et diffusion de logiciels malveillants | La correction des logiciels malveillants sur les appareils touchés |
| Rançongiciel à opération humaine | Une attaque active : des criminels s'infiltrent dans l'infrastructure locale ou cloud, élèvent leurs privilèges et déploient le rançongiciel sur les données critiques ; ils volent souvent des données avant | Une réponse complète aux incidents. L'attaquant continue de menacer l'activité après la première rencontre |

La hiérarchisation des menaces commence par les ressources. Microsoft pose trois questions aux responsables métier, informatiques et sécurité :

1. Quelles ressources métier causeraient le plus de dégâts si elles étaient compromises ?
2. À quelles ressources informatiques correspondent-elles : fichiers, applications, bases de données, serveurs, systèmes de contrôle ?
3. Comment protéger ou isoler ces ressources des attaquants qui ont accès à l'environnement informatique général ?

La **gestion des ressources critiques** de Microsoft Security Exposure Management soutient ce travail sur les appareils, les identités et les ressources cloud, dans le portail Microsoft Defender :

| Capacité | Ce qu'elle apporte |
| --- | --- |
| Classifications prédéfinies | Ressources classées automatiquement : contrôleurs de domaine, serveurs de fichiers, bases de données contenant des données sensibles, rôles privilégiés, ressources cloud dans Azure, AWS et GCP |
| Niveaux de criticité | Very High, High, Medium, Low. Un contrôleur de domaine, un Global Administrator et Microsoft Entra ID sont Very High par défaut ; quand plusieurs règles correspondent, le niveau le plus élevé l'emporte |
| Classifications personnalisées | Vos propres « joyaux de la couronne » définis par requête ou ajoutés manuellement ; les classifications à faible confiance peuvent être revues |
| Utilisation dans d'autres expériences | La criticité apparaît dans les chemins d'attaque, la carte de la surface d'attaque (points de contention), la chasse avancée et l'inventaire des appareils |
| Initiative Critical Asset Protection | Note la protection des ressources critiques dans le temps, dans les exposure insights |

Exposure Management construit aussi des **chemins d'attaque** entre les environnements locaux et cloud et repère les **points de contention** (choke points), les ressources par lesquelles passent de nombreux chemins.

| Exigence | Recommandation |
| --- | --- |
| Classer les corrections selon l'impact métier | Classer les ressources critiques, puis prioriser les recommandations et les chemins d'attaque qui les atteignent |
| Une vue de l'exposition sur les points de terminaison, les identités, Azure, AWS et GCP | Security Exposure Management |
| Trouver où casser le plus de chemins d'attaque avec une seule correction | Les points de contention de la carte de la surface d'attaque |

> **Piège d'examen.** L'identification des ressources critiques est un travail long et transversal. Microsoft précise qu'il ne doit pas retarder les deux premières étapes du plan contre les rançongiciels : la sécurisation des sauvegardes et de l'accès privilégié démarre en parallèle, sans attendre l'inventaire complet.

<!-- section: ransomware-plan | objectives: 1.1.3 -->
## Le plan de protection contre les rançongiciels et ses priorités

Le plan de Microsoft compte trois étapes, dans cet ordre :

| Étape | Objectif | Pourquoi ce rang |
| --- | --- | --- |
| 1. Préparer le plan de récupération | Récupérer sans payer ; rendre beaucoup plus difficile le chiffrement des données clés ou la perturbation des systèmes | Supprime l'intérêt financier de l'attaquant, quel que soit le point d'entrée |
| 2. Limiter l'étendue des dégâts | Protéger les rôles privilégiés pour qu'une compromission n'atteigne pas tous les systèmes vitaux | La plupart des dégâts viennent de l'accès privilégié |
| 3. Rendre l'accès difficile aux cybercriminels | Supprimer progressivement les risques aux points d'entrée courants | C'est le plus long ; ne doit pas ralentir les étapes 1 et 2 |

Cet ordre réduit le risque le plus vite possible. Les équipes (sauvegarde, identité, points de terminaison) peuvent travailler en parallèle, mais le programme est piloté dans l'ordre des priorités. Les listes de contrôle de Microsoft sont dans l'ordre des priorités, pas dans l'ordre des dépendances techniques.

> **Piège d'examen.** « Rendre l'accès difficile » semble la première étape évidente. Quand une question demande quoi faire en premier, la réponse est le plan de récupération (sauvegardes immuables), puis l'accès privilégié. Le durcissement des points d'entrée vient en troisième.

Payer ne fait jamais partie du plan : même après paiement, les attaquants peuvent ne jamais fournir de clé qui fonctionne.

<!-- section: bcdr-design | objectives: 1.1.2, 1.1.3 -->
## La continuité et la reprise d'activité face aux attaques

Traitez une attaque par rançongiciel ou par extorsion avec la même importance qu'une catastrophe naturelle : le plan BCDR doit la couvrir et être exercé régulièrement. Deux objectifs dimensionnent la conception :

| Objectif | Sens | Détermine |
| --- | --- | --- |
| Objectif de point de récupération (RPO) | La quantité de données que l'entreprise peut perdre | La fréquence de sauvegarde ou de réplication |
| Objectif de délai de récupération (RTO) | La durée pendant laquelle le service peut être indisponible | La méthode de restauration, la réplication et le basculement |

| Solution | À utiliser pour |
| --- | --- |
| Sauvegarde Azure | Des copies à un point dans le temps de VM Azure, de bases de données, de partages de fichiers et de serveurs locaux, conservées dans un coffre ; la réponse au chiffrement ou à la suppression des données |
| Azure Site Recovery | La réplication et le basculement de machines vers une autre région ou du local vers Azure ; la réponse à une panne. La réplication reproduit vite les modifications, données chiffrées comprises : elle ne remplace pas des sauvegardes protégées à longue rétention contre les rançongiciels |
| Gestion des versions et corbeille de Microsoft 365 | La récupération des fichiers utilisateur déplacés vers OneDrive et SharePoint, que les utilisateurs peuvent restaurer eux-mêmes |

La liste de contrôle **sauvegardes sécurisées** de l'étape de récupération :

1. Sauvegardez automatiquement et régulièrement toutes les données critiques, y compris les systèmes vitaux et les **contrôleurs de domaine des services de domaine Active Directory**.
2. Exercez régulièrement le plan BCDR ; sous 30 jours, le temps moyen de récupération (MTTR) mesuré en simulation doit atteindre l'objectif BCDR.
3. Protégez les sauvegardes contre l'effacement et le chiffrement délibérés. **Forte** : exigez des étapes hors bande (authentification multifacteur ou code PIN) avant toute modification des sauvegardes en ligne. **La plus forte** : conservez les sauvegardes dans un stockage immuable en ligne, comme le stockage immuable des objets blob Azure, ou complètement hors ligne ou hors site.
4. Protégez les documents nécessaires à la récupération : procédures de restauration, base de données de gestion des configurations (CMDB) et schémas réseau. Les attaquants les ciblent délibérément.

La liste de contrôle de protection des données ajoute : déplacer les données utilisateur vers OneDrive et SharePoint, désigner des dossiers protégés (accès contrôlé aux dossiers de Microsoft Defender), et réduire les autorisations larges d'écriture et de suppression sur les partages de fichiers et SharePoint, puis surveiller pour qu'elles ne reviennent pas.

Pour les patrimoines hybrides et multiclouds, appliquez partout les mêmes exigences : sauvegardes administrées par des identités distinctes, copies immuables ou hors ligne, documents de récupération protégés et restaurations testées.

<!-- section: backup-protection | objectives: 1.1.2 -->
## Protéger la Sauvegarde Azure contre les attaquants

Les données de la Sauvegarde Azure ne sont accessibles que par les coffres Recovery Services et les coffres de sauvegarde : personne ne peut ouvrir directement le stockage des sauvegardes pour le chiffrer. Les fonctionnalités du coffre qui résistent à un administrateur malveillant :

| Fonctionnalité | Ce qu'elle fait |
| --- | --- |
| Suppression réversible | Garde récupérables les données de sauvegarde supprimées ; 14 jours par défaut, jusqu'à 180 jours ; les 14 premiers jours sont gratuits. Activée par défaut sur les nouveaux coffres. La suppression réversible toujours active la rend irréversible |
| Coffre immuable | Bloque les opérations qui pourraient faire perdre des points de récupération : supprimer des points de récupération avant leur expiration, réduire la rétention. **Activé** peut encore être désactivé ; **Activé et verrouillé** ajoute le stockage WORM et est irréversible |
| Autorisation multi-utilisateur (MUA) | Les opérations critiques (désactiver la suppression réversible, réduire la protection) exigent une approbation par un **Resource Guard** contrôlé par une autre équipe, comme les administrateurs de sécurité, éventuellement dans un autre abonnement ou locataire |
| Chiffrement | Clés gérées par Microsoft par défaut ; clés gérées par le client dans Azure Key Vault en option |
| Points de terminaison privés | Connectivité privée pour les charges de travail prises en charge (SQL Server et SAP HANA dans des VM Azure, agent MARS, DPM) |
| Azure RBAC | Backup Reader, Backup Operator, Backup Contributor ; séparez l'administration des sauvegardes de celle des charges de travail |
| Restauration interrégion | Restaure des VM Azure dans la région jumelée secondaire depuis un coffre géoredondant (sur option) |

La Sauvegarde Azure évalue la protection de chaque coffre :

| Niveau de sécurité | Condition |
| --- | --- |
| Excellent | L'immuabilité ou la suppression réversible est irréversible (verrouillée ou toujours active) **et** la MUA est activée |
| Good | L'immuabilité est verrouillée ou la suppression réversible est activée |
| Fair | La MUA est activée |
| Poor | Aucune protection avancée, ou uniquement des capacités réversibles |

Pour les serveurs locaux protégés par l'agent MARS, Microsoft Azure Backup Server (MABS) ou System Center DPM, les opérations destructrices (arrêt de la protection avec suppression, changement de phrase secrète, réduction de la rétention) exigent un **code PIN de sécurité** généré dans le coffre et valable cinq minutes ; les données supprimées sont conservées 14 jours de plus.

**Resiliency** dans Azure (le successeur d'Azure Business Continuity Center) donne une vue unique de la sauvegarde et de la réplication sur Azure et les environnements hybrides, avec une évaluation de la posture de protection et les paramètres de cyber-récupération (immuabilité, suppression réversible, MUA) de chaque coffre.

> **Piège d'examen.** L'immuabilité ne s'applique pas aux sauvegardes opérationnelles des objets blob, des fichiers et des disques, qui restent dans le compte source. Une exigence « aucun administrateur ne peut supprimer de sauvegarde avant son expiration » demande des sauvegardes en coffre dans un coffre immuable verrouillé.

> **Conseil d'examen.** « Même un administrateur de sauvegarde compromis ne doit pas pouvoir désactiver la protection » signifie MUA avec un Resource Guard détenu par une autre équipe. La suppression réversible seule est réversible par cet administrateur.

<!-- section: privileged-access | objectives: 1.1.3 -->
## Limiter les dégâts par l'accès privilégié

L'étape 2 protège les rôles privilégiés pour qu'un opérateur de rançongiciel ne puisse pas atteindre de nombreux systèmes vitaux. La stratégie d'accès privilégié de Microsoft contre les rançongiciels compte quatre tâches :

| Tâche | Contenu | Capacités Microsoft typiques |
| --- | --- | --- |
| Imposer la sécurité de session de bout en bout | Valider utilisateurs et appareils avant tout accès aux interfaces d'administration | Accès conditionnel, stations de travail à accès privilégié |
| Protéger et surveiller les systèmes d'identité | Annuaires, gestion des identités, comptes et groupes d'administrateurs, configuration des octrois de consentement | Privileged Identity Management, Microsoft Defender for Identity |
| Limiter les déplacements latéraux | Compromettre un appareil ne doit pas donner le contrôle de beaucoup d'autres par des mots de passe locaux, des mots de passe de comptes de service ou d'autres secrets | Windows LAPS, identifiants uniques |
| Garantir une réponse rapide aux menaces | Limiter le temps que l'attaquant passe dans l'environnement | Microsoft Defender XDR, Microsoft Sentinel |

Les résultats visés sous 30 à 90 jours : 100 % des administrateurs utilisent des stations de travail sécurisées, 100 % des mots de passe locaux des stations de travail et des serveurs sont aléatoires, 100 % des atténuations d'élévation de privilèges sont déployées.

La liste de contrôle de détection et de réponse de la même étape :

- Priorisez les points d'entrée courants : points de terminaison, e-mail, identité et RDP. Utilisez une XDR intégrée (Microsoft Defender XDR) et surveillez la pulvérisation de mots de passe.
- Surveillez un attaquant qui désactive la sécurité : effacement des journaux d'événements Security et PowerShell Operational, désactivation des outils de sécurité.
- N'ignorez pas les logiciels malveillants courants : les opérateurs de rançongiciels achètent des accès aux organisations ciblées.
- Isolez rapidement les appareils touchés avec Microsoft Defender for Endpoint.

> **Piège d'examen.** Les sauvegardes passent avant l'accès privilégié dans le plan, mais elles en dépendent : si les administrateurs de sauvegarde utilisent les mêmes comptes que les administrateurs du domaine, un attaquant qui contrôle le domaine supprime aussi les sauvegardes. Une administration séparée des sauvegardes, la MUA et l'immuabilité ferment cette brèche.

<!-- section: entry-points | objectives: 1.1.3 -->
## Rendre les points d'entrée plus difficiles à exploiter

L'étape 3 durcit les points d'entrée courants :

| Domaine | Contrôles |
| --- | --- |
| Accès à distance | Maintenir à jour les VPN et les appliances ; accès conditionnel Microsoft Entra ; VPN point à site Azure avec authentification Microsoft Entra ; proxy d'application Microsoft Entra pour publier les applications web locales ; Azure Bastion pour les VM Azure |
| E-mail et collaboration | Microsoft Defender for Office 365 ; AMSI pour VBA Office ; règles de réduction de la surface d'attaque, d'abord en mode audit, puis en mode blocage |
| Points de terminaison | Règles de réduction de la surface d'attaque, protection contre les falsifications et blocage à la première détection dans l'Antivirus Microsoft Defender ; bases de référence de sécurité ; déploiement rapide des mises à jour critiques ; isoler, désactiver ou retirer les systèmes non pris en charge et les protocoles hérités ; pare-feu sur les hôtes |
| Comptes | MFA forte ou connexion sans mot de passe pour tous les utilisateurs, en commençant par les administrateurs ; Protection par mot de passe Microsoft Entra, étendue à AD DS |

Objectifs sous 30 jours : 100 % des employés utilisent activement la MFA, et la sécurité renforcée des mots de passe est entièrement déployée.

> **Piège d'examen.** Dans les recommandations sur les rançongiciels, ASR signifie réduction de la surface d'attaque (attack surface reduction, des règles de Microsoft Defender for Endpoint), pas Azure Site Recovery.

<!-- section: security-updates | objectives: 1.1.4 -->
## Évaluer les solutions de mises à jour de sécurité

Associez les machines à la solution :

| Machines ou besoin | Solution |
| --- | --- |
| Serveurs Windows et Linux dans Azure, en local et dans d'autres clouds | **Azure Update Manager**, avec les machines hors d'Azure connectées par **Azure Arc** |
| Mises à jour critiques sur des VM Azure sans redémarrage | Le hotpatching par Azure Update Manager |
| Appareils clients Windows | Les stratégies de mise à jour de Microsoft Intune, ou Windows Autopatch, qui les automatise |
| Prioriser les vulnérabilités selon le risque sur Windows, macOS, Linux, Android, iOS et les appareils réseau | **Microsoft Defender Vulnerability Management** |
| Systèmes impossibles à mettre à jour | Les isoler, désactiver les protocoles non sécurisés ou les retirer |

Azure Update Manager est natif sur les VM Azure et les serveurs Azure Arc, sans dépendance à Log Analytics ni à Azure Automation. Il évalue chaque machine toutes les 24 heures (évaluation périodique), planifie les installations dans des fenêtres de maintenance définies par le client, regroupe les machines selon des critères (étendue dynamique), et prend en charge Azure Policy, Azure RBAC et les alertes. Il gère les machines qui exécutent un système d'exploitation serveur.

Defender Vulnerability Management découvre les ressources en continu, y compris avec des analyseurs sans agent, priorise les vulnérabilités à l'aide du renseignement sur les menaces, de la probabilité de violation et du contexte métier, les corrèle avec les alertes EDR actives, crée des tâches de correction dans Microsoft Intune, peut bloquer des applications vulnérables pour des groupes d'appareils, et évalue les bases de référence de sécurité par rapport aux benchmarks CIS et STIG.

> **Piège d'examen.** Azure Update Manager s'adresse aux serveurs. Une exigence de mise à jour d'ordinateurs portables Windows 11 désigne Intune ou Windows Autopatch ; une exigence de choisir quelle vulnérabilité corriger en premier désigne Defender Vulnerability Management, qui priorise mais n'installe pas lui-même les mises à jour.

<!-- section: key-points -->
## Points clés

- Ordre du plan contre les rançongiciels : plan de récupération, puis accès privilégié, puis points d'entrée. L'inventaire des ressources critiques avance en parallèle et ne doit pas retarder les deux premières étapes.
- Security Exposure Management classe les ressources critiques (de Very High à Low) sur les appareils, les identités, Azure, AWS et GCP, et trouve les points de contention des chemins d'attaque.
- Protection de sauvegarde la plus forte : immuable ou hors ligne. Niveau Excellent de la Sauvegarde Azure : immuabilité ou suppression réversible irréversible, plus MUA avec un Resource Guard détenu par une autre équipe.
- Sauvegardez les contrôleurs de domaine et protégez les documents de récupération (procédures, CMDB, schémas réseau).
- Accès privilégié : stations de travail sécurisées, mots de passe locaux aléatoires, atténuations d'élévation de privilèges, sécurité de session de bout en bout.
- Mises à jour : Azure Update Manager pour les serveurs partout grâce à Azure Arc, Intune ou Windows Autopatch pour les clients, Defender Vulnerability Management pour prioriser.
