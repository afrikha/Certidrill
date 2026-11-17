Le SC-900 vérifie que vous comprenez le vocabulaire de la sécurité, de la conformité et de l'identité, et que vous savez nommer le produit ou la fonctionnalité Microsoft qui répond à un besoin. Il ne vous demande jamais de rien configurer : ni commande, ni requête, ni tableau de licences.

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
| Prérequis | Aucun ; connaître un peu Microsoft Azure et Microsoft 365 aide |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Décrire les concepts de sécurité, de conformité et d'identité | 10 à 15 % |
| Décrire les fonctionnalités de Microsoft Entra | 25 à 30 % |
| Décrire les fonctionnalités des solutions de sécurité Microsoft | 35 à 40 % |
| Décrire les fonctionnalités des solutions de conformité Microsoft | 20 à 25 % |

Formats de questions : une réponse parmi quatre, plusieurs réponses (« sélectionnez deux réponses »), séries de trois affirmations Oui/Non, phrases à compléter avec une liste déroulante, et associations par glisser-déposer. Il n'y a ni étude de cas ni laboratoire. Les questions à plusieurs éléments rapportent un point par élément correct.

<!-- section: reading-questions -->
## Lire une question

Les énoncés sont courts, une à trois phrases : « Quelle fonctionnalité Microsoft Entra... ? », « Que pouvez-vous utiliser pour... ? ». Entraînez-vous à transformer la phrase en mot-clé :

| Mots de la question | Pensez à |
| --- | --- |
| « prouver qui vous êtes » | Authentification |
| « ce qu'un utilisateur connecté a le droit de faire » | Autorisation |
| « ne jamais faire confiance, toujours vérifier », « supposer que l'attaquant est déjà à l'intérieur » | Confiance Zéro (Zero Trust) |
| « à sens unique », « irréversible », « vérifier qu'un fichier n'a pas été modifié » | Hachage |
| « exiger la MFA seulement quand la connexion vient de l'extérieur du bureau » | Accès conditionnel |
| « activer un rôle d'administrateur pour quelques heures, avec approbation » | Privileged Identity Management |
| « confirmer régulièrement que les utilisateurs ont encore besoin de leur accès » | Révisions d'accès |
| « connexion à risque », « informations d'identification divulguées » | Protection Microsoft Entra ID |
| « se connecter à une machine virtuelle sans adresse IP publique » | Azure Bastion |
| « stocker des secrets, des clés et des certificats » | Azure Key Vault |
| « score de sécurité et recommandations pour les ressources cloud » | Microsoft Defender pour le cloud |
| « collecter les données de sécurité de partout, détecter, puis répondre automatiquement » | Microsoft Sentinel |
| « empêcher les utilisateurs de partager des numéros de carte bancaire » | Protection contre la perte de données |
| « rapports d'audit et documents de conformité de Microsoft » | Portail d'approbation des services |

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Authentification | Autorisation | L'authentification prouve qui vous êtes ; l'autorisation décide de ce que vous pouvez faire |
| Chiffrement | Hachage | Le chiffrement est réversible avec une clé ; le hachage est à sens unique et n'utilise pas de clé |
| Rôles Microsoft Entra | Rôles Azure | Les rôles Entra gèrent les ressources Microsoft Entra (utilisateurs, groupes, applications) ; les rôles Azure gèrent les ressources Azure (machines virtuelles, stockage) |
| Authentification multifacteur | Accès conditionnel | La MFA est une façon de vérifier l'identité ; l'accès conditionnel est la stratégie qui décide quand l'exiger, ou de bloquer |
| Privileged Identity Management | Révisions d'accès | PIM donne un rôle privilégié juste à temps, pour une durée limitée ; une révision d'accès vérifie périodiquement qu'un accès existant est encore nécessaire |
| Protection Microsoft Entra ID | Privileged Identity Management | Protection Microsoft Entra ID détecte les connexions à risque et les utilisateurs compromis ; PIM limite les accès d'administrateur permanents |
| Groupe de sécurité réseau | Pare-feu Azure | Un NSG filtre le trafic dans un réseau virtuel, par adresse IP, port et protocole ; le Pare-feu Azure est un pare-feu central pour plusieurs réseaux virtuels, jusqu'au niveau applicatif |
| Pare-feu Azure | Web Application Firewall | Le Pare-feu Azure filtre le trafic réseau en général ; WAF protège les applications web contre des attaques comme l'injection SQL |
| Azure Bastion | Azure Key Vault | Bastion donne un accès distant sécurisé aux machines virtuelles ; Key Vault stocke des secrets |
| Gestion de la posture de sécurité cloud | Protection de charge de travail cloud | La gestion de la posture évalue la configuration et recommande des renforcements ; la protection de charge de travail détecte les menaces contre les ressources en service |
| SIEM | SOAR | Un SIEM collecte et corrèle les données de sécurité pour détecter les menaces ; le SOAR automatise la réponse |
| Portail Microsoft Defender | Portail Microsoft Purview | Defender sert à la protection contre les menaces ; Purview sert à la conformité et à la protection des données |
| Score de sécurité | Score de conformité | Le score de sécurité mesure la posture de sécurité ; le score de conformité mesure la progression vers les exigences réglementaires |
| Étiquette de confidentialité | Étiquette de rétention | Une étiquette de confidentialité classe et protège le contenu ; une étiquette de rétention décide combien de temps le conserver |
| Protection contre la perte de données | Gestion des risques internes | La DLP bloque le partage de données sensibles ; la gestion des risques internes détecte les comportements à risque des utilisateurs |
| eDiscovery | Audit | eDiscovery retrouve du contenu pour une affaire juridique ; l'audit enregistre qui a fait quoi et quand |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre ; chacun est court. Le domaine des solutions de sécurité pèse le plus lourd : ne le survolez pas.
2. Pour chaque produit, retenez une phrase : ce qu'il protège et ce qu'il n'est pas. La plupart des mauvaises réponses sont des produits voisins.
3. Après chaque domaine, passez un examen blanc et relisez les sections liées à vos erreurs.
4. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
