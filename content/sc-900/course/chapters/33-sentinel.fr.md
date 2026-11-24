Une équipe des opérations de sécurité se noie dans les journaux et les alertes si un outil ne les rassemble pas et si un autre n'automatise pas la réponse de routine. Microsoft Sentinel fait les deux. L'examen vous demande de définir SIEM et SOAR, puis de nommer la fonctionnalité de Sentinel qui collecte, détecte, examine ou répond.

<!-- section: siem-soar | objectives: 3.3.1 -->
## SIEM et SOAR

Un système de **gestion des informations et des événements de sécurité (SIEM, security information and event management)** collecte les données de tout le patrimoine numérique d'une organisation (infrastructure, logiciels, services, en local ou dans le cloud), puis les analyse pour faire ressortir les menaces potentielles.

Un système d'**orchestration, d'automatisation et de réponse en matière de sécurité (SOAR, security orchestration, automation, and response)** prend les alertes d'un SIEM et d'autres outils de sécurité, puis déclenche des flux de travail automatisés qui traitent la réponse.

| | SIEM | SOAR |
| --- | --- | --- |
| But | La visibilité : voir ce qui se passe | La vitesse : agir sans effort manuel |
| Entrée | Les journaux et les événements de sécurité des pare-feux, des serveurs, des systèmes d'identité, des applications, des points de terminaison | Les alertes et les incidents du SIEM et d'autres outils |
| Ce qu'il fait | Agrège, corrèle, émet des alertes, regroupe les alertes liées en incidents | Orchestre les outils pour qu'ils travaillent ensemble, automatise les tâches répétitives, exécute des playbooks |
| Résultat type | Un incident à examiner | Un compte signalé désactivé, un ticket ouvert et l'équipe prévenue, automatiquement |

**Microsoft Sentinel** est une solution native cloud qui est **à la fois** un SIEM et un SOAR.

> **Piège d'examen.** « Collecter », « corréler », « analyser les journaux » désignent le SIEM. « Automatiser la réponse », « flux de travail », « playbook » désignent le SOAR. Aucun des deux mots ne décrit un pare-feu ou un antivirus : ils se placent au-dessus des autres outils.

<!-- section: sentinel-capabilities | objectives: 3.3.2 -->
## Détection des menaces avec Microsoft Sentinel

Sentinel fonctionne dans des environnements multiclouds et multiplateformes, à l'échelle du cloud. Son travail suit quatre étapes :

| Étape | Ce que fait Sentinel | Fonctionnalité à retenir |
| --- | --- | --- |
| **Collecter** | Rassemble les données de sécurité des utilisateurs, des appareils, des applications et de l'infrastructure, en local et dans plusieurs clouds | Les **connecteurs de données** pour les sources Microsoft (Microsoft Entra ID, Azure Activity, Stockage Azure) et non-Microsoft (Syslog, Common Event Format, API REST) |
| **Détecter** | Trouve les menaces dans les données collectées et limite les faux positifs | Les **règles d'analyse** (analytics rules) interrogent les données, émettent des alertes et regroupent les alertes liées en **incidents** |
| **Examiner** | Détermine l'étendue et la cause racine d'une attaque | Les pages d'incident avec un graphe interactif des entités impliquées ; les requêtes de **repérage** (hunting) |
| **Répondre** | Réagit rapidement à l'incident | Les **règles d'automatisation** et les **playbooks** |

La détection s'appuie sur plusieurs mécanismes :

- **Détection par règles** : les règles d'analyse, avec des modèles écrits par les experts en sécurité de Microsoft.
- **Machine learning** : des bases de référence comportementales signalent les écarts, et le moteur **Fusion** corrèle des signaux de faible gravité venus de plusieurs sources en un seul incident de haute fiabilité, ce qui révèle les attaques en plusieurs étapes. Dans un espace de travail intégré au portail Microsoft Defender, Fusion est désactivé et le moteur de corrélation de Microsoft Defender XDR fait ce travail.
- **Correspondance avec le renseignement sur les menaces** : les données sont comparées à des flux d'adresses IP, de domaines et d'URL connus comme malveillants.
- **Couverture MITRE ATT&CK** : une vue des techniques d'attaque que vos règles couvrent, et des lacunes.

Autres fonctionnalités à reconnaître :

| Fonctionnalité | Usage |
| --- | --- |
| **Hub de contenu** | Déployer des **solutions** empaquetées ; une solution peut regrouper des connecteurs de données, des classeurs, des règles d'analyse, des requêtes de repérage et des playbooks |
| **Classeurs** (workbooks) | Des rapports visuels interactifs sur les données collectées, à partir de modèles ou personnalisés |
| **Repérage** (hunting) | La recherche proactive d'activités suspectes qu'aucune règle n'a détectées ; une requête utile peut devenir une règle de détection |
| **Notebooks** | Des notebooks Jupyter pour l'analyse avancée et la visualisation |
| **Watchlists** (listes de surveillance) | Des listes de vos propres données (ressources de grande valeur, employés partis) corrélées avec les événements |

Sentinel est aussi une plateforme : son **lac de données** conserve les données de sécurité à faible coût sur de longues périodes, à côté du niveau analytique (un espace de travail Log Analytics) où s'exécutent les règles d'analyse.

<!-- section: sentinel-response | objectives: 3.3.2 -->
## Atténuation des menaces avec Microsoft Sentinel

Le côté SOAR de Sentinel automatise les tâches récurrentes d'enrichissement, de réponse et de correction, pour que les analystes gardent leur temps pour l'investigation et le repérage.

| Fonctionnalité | Rôle |
| --- | --- |
| **Règle d'automatisation** | Gère le traitement des incidents depuis un point central : attribuer un incident à un analyste, l'étiqueter, changer son état ou le fermer, ajouter des tâches, ou exécuter un playbook. S'exécute quand un incident est créé ou mis à jour |
| **Playbook** | Un ensemble d'actions de réponse et de correction construit sur **Azure Logic Apps**. S'exécute automatiquement, déclenché par une règle d'automatisation, ou à la demande |

Exemple : une règle d'automatisation détecte un incident de gravité élevée qui implique un compte d'utilisateur et exécute un playbook, qui désactive le compte, ouvre un ticket dans l'outil de support informatique et publie un message pour l'équipe de sécurité.

Les incidents sont examinés dans le **portail Microsoft Defender**, dans une file d'attente unique qui montre les incidents de Sentinel avec ceux de Microsoft Defender XDR. Le portail Defender est la façon recommandée d'utiliser Sentinel : après le **31 mars 2027**, Sentinel n'est plus pris en charge dans le portail Azure.

> **Piège d'examen.** Trois mots qui se ressemblent. **Classeur** (workbook) : un rapport qui visualise des données. **Playbook** : un flux de travail Logic Apps qui automatise une réponse. **Notebook** : Jupyter, pour l'analyse avancée.

> **Conseil d'examen.** Sentinel collecte depuis toutes les sources et corrèle à l'échelle de l'organisation (SIEM, SOAR). Defender XDR protège des domaines précis : points de terminaison, identités, e-mail, applications cloud. Defender pour le cloud protège les ressources et les charges de travail cloud. Les trois apparaissent dans le portail Defender.

<!-- section: key-points -->
## Points clés

- SIEM : collecter, corréler et analyser les données de partout, émettre des alertes et des incidents. SOAR : orchestrer les outils et automatiser la réponse avec des playbooks.
- Microsoft Sentinel est un SIEM et un SOAR natif cloud.
- Quatre étapes : collecter (connecteurs de données), détecter (règles d'analyse, Fusion ou, dans le portail Defender, le moteur de corrélation de Defender XDR, renseignement sur les menaces), examiner (incidents, repérage), répondre (règles d'automatisation, playbooks).
- Les playbooks sont construits sur Azure Logic Apps ; les règles d'automatisation décident quand ils s'exécutent.
- Les classeurs visualisent, le hub de contenu déploie des solutions, les watchlists apportent vos propres données de référence.
- Sentinel s'utilise dans le portail Microsoft Defender ; la prise en charge dans le portail Azure prend fin après le 31 mars 2027.
