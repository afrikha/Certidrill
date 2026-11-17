L'AZ-900 vérifie que vous comprenez ce qu'est le cloud, ce qu'Azure propose et comment on l'administre. Il ne vous demande de rien configurer : chaque question revient à reconnaître un concept ou à choisir le bon service pour un besoin.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 45 minutes d'examen |
| Questions | Nombre non publié ; environ 35 à 45 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Sans documents : Microsoft Learn n'est pas accessible pendant les examens de niveau fondamentaux |
| Validité | N'expire pas |
| Prérequis | Aucun |

Les trois domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Décrire les concepts du cloud | 25 à 30 % |
| Décrire l'architecture et les services Azure | 35 à 40 % |
| Décrire la gestion et la gouvernance Azure | 30 à 35 % |

Formats de questions : une réponse parmi quatre, plusieurs réponses (« sélectionnez deux réponses »), séries de trois affirmations Oui/Non, phrases à compléter avec une liste déroulante, et associations par glisser-déposer. Il n'y a ni étude de cas ni laboratoire. Les questions à plusieurs éléments rapportent un point par élément correct.

<!-- section: reading-questions -->
## Lire une question

La plupart des questions décrivent un besoin en une ou deux phrases et demandent quel concept ou quel service y répond. Entraînez-vous à transformer la phrase en mot-clé :

| Mots de la question | Pensez à |
| --- | --- |
| « aucun coût initial », « ne payer que ce que l'on utilise » | Modèle basé sur la consommation, dépenses d'exploitation |
| « ajouter rapidement des ressources quand la demande augmente » | Scalabilité, élasticité |
| « rester disponible si un centre de données tombe » | Zones de disponibilité |
| « rester disponible si une région tombe » | Paires de régions, stockage géoredondant |
| « imposer une règle aux ressources », « régions autorisées » | Azure Policy |
| « empêcher une suppression accidentelle » | Verrou de ressource |
| « qui peut faire quoi » | Azure RBAC |
| « connexion privée qui ne passe pas par internet » | ExpressRoute |
| « recommandations pour réduire les coûts ou améliorer la sécurité » | Azure Advisor |
| « être informé d'une panne Azure qui me concerne » | Azure Service Health |

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les services faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Azure Policy | Azure RBAC | Policy contrôle ce que les ressources peuvent être ; RBAC contrôle qui peut agir |
| Azure Advisor | Azure Monitor | Advisor recommande des améliorations ; Monitor collecte métriques et journaux et déclenche des alertes |
| Azure Service Health | Azure Monitor | Service Health informe sur la plateforme Azure ; Monitor informe sur vos ressources |
| Calculatrice de prix | Cost Management | La calculatrice estime avant le déploiement ; Cost Management analyse ce que vous dépensez réellement |
| Passerelle VPN | ExpressRoute | Le VPN est du trafic chiffré sur internet ; ExpressRoute est un circuit privé |
| Microsoft Entra ID | Microsoft Entra Domain Services | Entra ID est le service d'identité cloud ; Domain Services fournit la jonction de domaine, les stratégies de groupe et LDAP aux applications anciennes |
| AzCopy | Azure File Sync | AzCopy copie à la demande ; File Sync maintient synchronisés un serveur de fichiers Windows et un partage de fichiers Azure |
| Azure Migrate | Azure Data Box | Migrate évalue et migre des charges de travail par le réseau ; Data Box transporte des données sur un appareil physique |
| Groupe à haute disponibilité | Zone de disponibilité | Un groupe répartit des machines virtuelles dans un seul centre de données ; les zones sont des centres de données distincts |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre ; chacun est court.
2. Créez un compte Azure gratuit et ouvrez le portail : voir un groupe de ressources, un abonnement et les pages de coûts rend le vocabulaire concret.
3. Après chaque domaine, passez un examen blanc et relisez les sections liées à vos erreurs.
4. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
