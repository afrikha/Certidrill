L'AI-901 est l'examen de la certification Microsoft Certified: Azure AI Fundamentals. Il vérifie deux choses : que vous reconnaissez les concepts et les charges de travail d'IA, et que vous savez les mettre en œuvre dans Microsoft Foundry, c'est-à-dire choisir la bonne action dans le portail, le bon outil ou le bon modèle, et lire un court extrait de code Python. La théorie du machine learning ne fait pas partie des compétences mesurées.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 45 minutes d'examen (65 minutes de présence) |
| Questions | Nombre non publié ; environ 35 à 45 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Sans documents : Microsoft Learn n'est pas accessible pendant les examens de niveau fondamentaux |
| Prérequis | Aucun ; Microsoft attend les bases de la syntaxe Python et une familiarité avec les ressources Azure |
| Compétences mesurées | Version du 15 avril 2026 |

Les deux domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Identifier les concepts et fonctionnalités de l'IA | 40 à 45 % |
| Implémenter des solutions IA à l'aide de Microsoft Foundry | 55 à 60 % |

Formats de questions : une réponse parmi quatre, plusieurs réponses (« sélectionnez deux réponses »), séries de trois affirmations Oui/Non, phrases ou court extrait de code à compléter avec une liste déroulante, et associations par glisser-déposer. Il n'y a ni étude de cas ni laboratoire. Les questions à plusieurs éléments rapportent un point par élément correct.

<!-- section: reading-questions -->
## Lire une question

Les énoncés sont courts : un besoin en une ou deux phrases, puis « Quel principe ? », « Que devez-vous utiliser ? » ou un extrait de code à trou. Entraînez-vous à transformer la phrase en mot-clé :

| Mots de la question | Pensez à |
| --- | --- |
| « des candidats comparables obtiennent des résultats différents », « biais envers un groupe » | Impartialité |
| « utilisable par les personnes en situation de handicap », « sous-titres », « nombreuses langues » | Inclusion |
| « les utilisateurs savent qu'une IA a rédigé la réponse », « expliquer comment le résultat est produit » | Transparence |
| « une personne relit la décision », « qui répond du système » | Responsabilité |
| « se comporte comme prévu dans des conditions inattendues », « bloque le contenu nuisible » | Fiabilité et sécurité |
| « protéger les données personnelles », « contrôler qui peut accéder » | Confidentialité et sécurité |
| des réponses « plus créatives » ou « plus prévisibles » | Température |
| « limiter la longueur de la réponse » | Nombre maximal de jetons de sortie |
| « fixer le rôle, le ton et les règles de l'assistant » | Invite système (instructions) |
| « de l'audio vers du texte » | Reconnaissance vocale |
| « du texte vers de l'audio » | Synthèse vocale |
| « décrire une image », « répondre à une question sur une photo » | Modèle multimodal avec une image en entrée |
| « créer une image à partir d'une description » | Modèle de génération d'images |
| « des champs tirés de factures, de reçus ou d'enregistrements » | Azure Content Understanding |
| « réutiliser un modèle avec ses instructions et ses outils » | Agent |

Les questions de code ne vous demandent pas d'écrire un programme. Elles vous demandent de repérer quelques identificateurs : quel client est créé, quelle méthode est appelée, quel paramètre porte le nom du déploiement, l'invite ou l'image. Pour chaque extrait de ce cours, sachez à quoi sert chaque ligne.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Impartialité | Inclusion | Impartialité : des personnes comparables obtiennent des résultats comparables ; inclusion : personne n'est empêché d'utiliser le système |
| Transparence | Responsabilité | Transparence : on comprend ce que fait le système et ses limites ; responsabilité : des personnes en répondent et gardent le contrôle |
| Fiabilité et sécurité | Confidentialité et sécurité | Le premier principe porte sur le comportement du système ; le second sur la protection des données et des accès |
| Invite système | Invite utilisateur | L'invite système fixe le rôle et les règles pour toute la conversation ; l'invite utilisateur est une demande |
| Température | Nombre maximal de jetons de sortie | La température change la variété de la réponse ; le nombre maximal de jetons de sortie plafonne sa longueur |
| Modèle | Agent | Un modèle génère une réponse à une invite ; un agent regroupe un modèle, des instructions et des outils |
| Client de conversation | Client d'un agent | Un client de conversation nomme un déploiement de modèle et envoie ses propres instructions ; le client d'un agent référence un agent par son nom |
| Reconnaissance vocale | Synthèse vocale | La reconnaissance transforme la parole en texte ; la synthèse transforme le texte en parole |
| Analyse d'images | Génération d'images | L'analyse va d'une image vers du texte ; la génération va du texte vers une image |
| Modèle multimodal | Outil Foundry (Foundry Tools) | Un modèle suit une invite libre ; un outil Foundry comme Azure Language ou Azure Speech accomplit une tâche avec une sortie prévisible et structurée |
| OCR | Extraction de champs | L'OCR renvoie le texte d'un document ; l'extraction de champs renvoie des valeurs nommées comme le total de la facture |
| Ressource Foundry | Projet Foundry | La ressource est la ressource Azure qui héberge les modèles et les services ; un projet est un espace de travail à l'intérieur |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre ; chacun est court. Les trois premiers couvrent les concepts, les quatre derniers Foundry.
2. Créez un projet Foundry, déployez un modèle de conversation et essayez le terrain de jeu : écrire des instructions, changer un paramètre et enregistrer un agent rend le vocabulaire concret.
3. Lisez chaque extrait de code ligne par ligne, jusqu'à pouvoir dire quel client, quelle méthode et quel paramètre il utilise.
4. Après chaque domaine, passez un examen blanc et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
