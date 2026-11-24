Cinq idées traversent tout l'examen : qui sécurise quoi dans le cloud, comment les couches de protection s'empilent, pourquoi rien n'est approuvé par défaut, en quoi le chiffrement diffère du hachage, et ce que signifient gouvernance, risque et conformité. Attendez-vous à des définitions et à des questions « de quel principe s'agit-il ? ».

<!-- section: shared-responsibility | objectives: 1.1.1 -->
## Le modèle de responsabilité partagée

Dans votre propre centre de données, vous sécurisez toute la pile. Dans le cloud, la sécurité est **partagée** entre vous et le fournisseur de cloud, et la répartition dépend du type de service : plus vous allez de l'IaaS vers le SaaS, plus le fournisseur en prend.

| Modèle | Le fournisseur de cloud sécurise | Vous sécurisez |
| --- | --- | --- |
| Local | Rien | Tout, du bâtiment aux données |
| IaaS | Le centre de données physique, le matériel réseau et les machines hôtes | Le système d'exploitation, les applications, les contrôles réseau que vous configurez, vos données |
| PaaS | La même chose, plus le système d'exploitation et l'environnement d'exécution | Le code de votre application et sa configuration, les contrôles d'accès, vos données |
| SaaS | Toute la pile applicative et son infrastructure | La gestion des accès, vos données, les paramètres de votre locataire |

Quel que soit le modèle, ces responsabilités **restent toujours les vôtres** :

- vos **données** : les classifier, les protéger, décider de leur chiffrement ;
- vos **identités et accès** : comptes d'utilisateurs, méthodes d'authentification, autorisations ;
- vos **points de terminaison** : les ordinateurs portables, téléphones et tablettes qui se connectent au service ;
- vos **choix de configuration** dans le service.

Le modèle s'étend aux services d'IA : le fournisseur sécurise l'infrastructure, l'environnement d'hébergement des modèles d'IA et les contrôles de sécurité de la plateforme, comme le filtrage de contenu ; vous restez responsable des données auxquelles l'IA a accès, de qui peut l'utiliser, de sa configuration, des risques propres à l'IA comme l'injection de prompt, et de la formation des utilisateurs.

> **Piège d'examen.** Passer au SaaS ne transfère jamais la responsabilité de vos données ni de vos comptes. Le centre de données physique, le réseau physique et les hôtes physiques relèvent toujours du fournisseur dans le cloud.

<!-- section: defense-in-depth | objectives: 1.1.2 -->
## La défense en profondeur

La **défense en profondeur** empile plusieurs couches de protection au lieu de compter sur une seule : si un attaquant franchit une couche, la suivante ralentit l'attaque.

| Couche | Exemples |
| --- | --- |
| Sécurité physique | Locaux verrouillés, gardiens, lecteurs de badges |
| Identité et accès | Authentification multifacteur, contrôle d'accès en fonction du rôle, accès conditionnel |
| Périmètre | Protection DDoS, pare-feux de périmètre |
| Réseau | Segmentation, groupes de sécurité réseau |
| Calcul | Correctifs, fermeture des ports inutilisés, restriction des accès d'administration, surveillance des comportements inhabituels |
| Application | Développement sécurisé, validation des entrées contre l'injection SQL et le scripting inter-site, authentification et autorisation au niveau de l'application |
| Données | Contrôle d'accès, chiffrement, classification ; la couche la plus interne |

Les contrôles de sécurité servent trois objectifs, la triade **CIA** :

| Objectif | Sens | Contrôle type |
| --- | --- | --- |
| **Confidentialité** | Seules les personnes autorisées peuvent lire l'information | Chiffrement, contrôle d'accès |
| **Intégrité** | Les données restent exactes et non modifiées, sauf par des changements autorisés | Hachage, signatures numériques, journaux d'audit |
| **Disponibilité** | Les données et les systèmes sont accessibles quand les utilisateurs autorisés en ont besoin | Redondance, protection DDoS |

<!-- section: zero-trust | objectives: 1.1.3 -->
## Le modèle Confiance Zéro

Le modèle traditionnel approuvait tout ce qui se trouvait dans le réseau de l'entreprise. La **Confiance Zéro** (Zero Trust) est une stratégie de sécurité, pas un produit, qui traite chaque demande d'accès comme non approuvée, d'où qu'elle vienne : « ne jamais faire confiance, toujours vérifier ».

| Principe | Sens |
| --- | --- |
| **Vérifier explicitement** | Authentifier et autoriser chaque demande à partir de tous les signaux disponibles : identité, emplacement, conformité de l'appareil, application, classification des données, anomalies |
| **Utiliser l'accès selon le moindre privilège** | Donner seulement l'accès nécessaire, seulement le temps nécessaire : accès juste-à-temps et juste suffisant |
| **Supposer une violation** | Concevoir comme si un attaquant allait entrer : segmenter les accès, chiffrer de bout en bout, surveiller pour détecter et limiter les dégâts |

La Confiance Zéro s'applique à six piliers, reliés par un septième :

| Pilier | Ce que demande la Confiance Zéro |
| --- | --- |
| Identités | Vérifier utilisateurs, services et appareils par une authentification forte, puis appliquer le moindre privilège |
| Appareils | Surveiller l'intégrité et la conformité ; bloquer ou restreindre les appareils en défaut |
| Applications | Connaître toutes les applications utilisées, y compris l'informatique fantôme, et contrôler leurs autorisations |
| Données | Les classifier, les étiqueter et les chiffrer pour que la protection suive les données |
| Infrastructure | Évaluer en continu les versions et la configuration ; accès d'administration juste-à-temps |
| Réseaux | Segmenter, y compris par micro-segmentation ; chiffrer et surveiller le trafic |
| Visibilité, automatisation et orchestration | Corréler les signaux de tous les autres et automatiser la réponse |

> **Conseil d'examen.** « Segmenter le réseau pour limiter les déplacements latéraux » illustre supposer une violation ; « exiger l'authentification multifacteur à chaque connexion » illustre vérifier explicitement ; « un accès d'administrateur juste-à-temps » illustre le moindre privilège.

<!-- section: encryption-hashing | objectives: 1.1.4 -->
## Chiffrement et hachage

Le **chiffrement** rend les données illisibles pour quiconque ne détient pas la clé. Il est réversible : la bonne clé déchiffre les données.

| Type | Clés | Remarques |
| --- | --- | --- |
| **Symétrique** | La même clé chiffre et déchiffre | Rapide, adapté aux gros volumes ; la difficulté est de partager la clé de façon sûre |
| **Asymétrique** | Une paire de clés : une clé publique et une clé privée | Ce que la clé publique chiffre, seule la clé privée le déchiffre ; ce que la clé privée signe, la clé publique le vérifie. Utilisé par HTTPS et les signatures numériques |

| État des données | Sens | Protection |
| --- | --- | --- |
| **Au repos** | Stockées sur un disque, dans une base de données ou dans un compte de stockage | Chiffrement des données stockées |
| **En transit** | En déplacement sur un réseau | TLS, comme dans HTTPS ; VPN |
| **En cours d'utilisation** | En cours de traitement en mémoire | Informatique confidentielle, dans des enclaves sécurisées |

Le chiffrement ne vaut que par la protection de ses clés. La **gestion des clés** conserve les clés à l'écart des données qu'elles protègent, les stocke dans des modules de sécurité matériels (HSM) ou un service managé comme Azure Key Vault, en effectue la rotation régulière et restreint qui peut les utiliser.

Le **hachage** convertit n'importe quelle entrée en une valeur de longueur fixe, le hachage. Il est **à sens unique** (l'entrée ne peut pas être retrouvée), **déterministe** (la même entrée donne toujours le même hachage) et n'utilise **aucune clé**. Il sert à vérifier, pas à cacher : comparer des hachages montre si un fichier a été modifié, et les systèmes stockent le hachage d'un mot de passe plutôt que le mot de passe. Un **sel**, valeur aléatoire ajoutée à chaque mot de passe avant le hachage, fait que deux mots de passe identiques produisent des hachages différents et met en échec les tables précalculées (tables arc-en-ciel).

Une **signature numérique** combine les deux idées : elle prouve qui a envoyé les données (authenticité) et qu'elles n'ont pas été modifiées (intégrité).

> **Piège d'examen.** Le hachage n'est pas du chiffrement : un hachage ne se déchiffre jamais. « Réversible avec une clé » désigne le chiffrement ; « vérifier que des données n'ont pas changé » ou « stocker des mots de passe » désigne le hachage.

<!-- section: grc | objectives: 1.1.5 -->
## Gouvernance, risque et conformité

| Terme | Définition |
| --- | --- |
| **Gouvernance** | Les règles, pratiques et processus qu'une organisation utilise pour diriger et contrôler ses activités |
| **Gestion des risques** | Identifier, évaluer et traiter les menaces ou événements qui peuvent affecter les objectifs de l'organisation ou la confiance de ses clients |
| **Conformité** | Respecter les lois, réglementations, normes et stratégies qui s'appliquent à l'organisation |

La gestion des risques ne vise pas à éliminer tous les risques. Elle identifie les risques, évalue chacun selon son impact et sa probabilité, y répond, puis les surveille. Les quatre réponses : **accepter** un risque à faible impact, l'**atténuer** par des contrôles, le **transférer** (par exemple par une assurance) ou l'**éviter** en changeant le processus qui le crée. Des cadres comme ISO 27001, SOC 2 et HIPAA fixent les exigences à respecter.

Trois notions sur les données accompagnent la conformité :

| Notion | Sens |
| --- | --- |
| **Résidence des données** | Règles sur les emplacements physiques où les données peuvent être stockées, et sur la façon dont elles peuvent être transférées ou consultées à l'international |
| **Souveraineté des données** | Les données sont soumises aux lois du pays ou de la région où elles sont collectées, conservées ou traitées |
| **Confidentialité des données** | Le traitement approprié des données personnelles : transparence, consentement et droits des personnes sur leurs données |

Sécurité et conformité ne sont pas synonymes : la sécurité couvre tout ce qui protège les données et les systèmes contre les menaces ; la conformité consiste à respecter les règles qui s'appliquent à vous.

<!-- section: key-points -->
## Points clés

- Responsabilité partagée : la part du fournisseur augmente de l'IaaS au SaaS ; les données, les identités et accès, les points de terminaison et la configuration restent toujours les vôtres.
- Défense en profondeur : physique, identité et accès, périmètre, réseau, calcul, application, données. CIA : confidentialité, intégrité, disponibilité.
- Confiance Zéro : vérifier explicitement, utiliser l'accès selon le moindre privilège, supposer une violation.
- Chiffrement symétrique : une seule clé. Asymétrique : clé publique et clé privée. Données au repos, en transit, en cours d'utilisation.
- Hachage : à sens unique, déterministe, sans clé ; sert à l'intégrité et au stockage des mots de passe, renforcé par un sel.
- La gouvernance dirige, la gestion des risques anticipe (identifier, évaluer, répondre, surveiller ; accepter, atténuer, transférer ou éviter), la conformité suit les règles. Résidence : où les données sont stockées. Souveraineté : quelles lois s'appliquent. Confidentialité : comment les données personnelles sont traitées.
