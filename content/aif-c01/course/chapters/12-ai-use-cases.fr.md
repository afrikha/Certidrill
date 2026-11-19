L'IA vaut la peine quand elle fait quelque chose plus vite, à plus grande échelle ou mieux que des personnes ou des règles fixes, et quand l'entreprise accepte une réponse probabiliste. Ce chapitre présente où l'IA/le ML apporte de la valeur et où ce n'est pas le cas, quelle technique de ML convient à un problème, des applications typiques du monde réel, les services d'IA gérés d'AWS et la façon de choisir entre un modèle de ML traditionnel et un modèle de fondation.

<!-- section: ai-value | objectives: 1.2.1 -->
## Où l'IA/le ML apporte de la valeur

| Valeur | Ce que cela signifie | Exemple |
| --- | --- | --- |
| **Aide à la prise de décision humaine** | Le modèle donne un score ou une recommandation ; une personne décide | Un score de risque aide un analyste à examiner un prêt ; un modèle signale des examens à un radiologue |
| **Capacité de mise à l'échelle** | Le même modèle traite dix ou dix millions de requêtes sans embauche | Modérer chaque image chargée au lieu d'un échantillon |
| **Automatisation** | Des tâches répétitives s'exécutent sans travail humain | Extraire les champs des factures, router les e-mails de support, transcrire des appels |
| **Découverte de motifs** | Des relations trop complexes pour des règles écrites à la main | Motifs de fraude sur des millions de transactions |
| **Personnalisation** | Une réponse différente pour chaque utilisateur | Recommandations de produits, contenu adapté |

L'IA/le ML convient quand il existe assez de données pertinentes, que le motif est difficile à exprimer par des règles et qu'une réponse fausse de temps en temps est acceptable ou peut être vérifiée.

<!-- section: when-not-ai | objectives: 1.2.2 -->
## Quand l'IA/le ML n'est pas approprié

- **Le résultat doit être exact et déterministe.** Calculer une taxe, appliquer une remise fixe ou vérifier qu'un champ n'est pas vide demande une règle ou une formule, pas une prédiction. Un modèle donne toujours une réponse probable, jamais une réponse garantie.
- **L'analyse coûts-avantages est négative.** Collecter et étiqueter les données, entraîner, héberger, surveiller et réentraîner coûte plus que la valeur de la prédiction, ou une règle simple fonctionne déjà assez bien.
- **Il n'y a pas assez de bonnes données**, ou les données sont biaisées et ne peuvent pas être corrigées.
- **Chaque décision doit être entièrement expliquée**, et le modèle envisagé ne peut pas être assez expliqué pour le régulateur.
- **Le problème change plus vite que vous ne pouvez réentraîner**, ou les erreurs seraient inacceptables sans vérification humaine.

> **Piège d'examen.** « L'entreprise a besoin du même résultat exact à chaque fois, à partir d'une formule connue » signifie que l'IA/le ML n'est pas approprié. Ne choisissez pas un modèle plus puissant : choisissez un programme classique ou fondé sur des règles.

<!-- section: ml-techniques | objectives: 1.2.3 -->
## Choisir une technique de ML

| Technique | Sortie | Type d'apprentissage | Exemples |
| --- | --- | --- | --- |
| **Régression** | Un nombre continu | Supervisé | Prix d'une maison, délai de livraison, consommation d'énergie |
| **Classification binaire** | Une classe parmi deux | Supervisé | Spam ou non, fraude ou légitime, départ ou maintien du client |
| **Classification multiclasse** | Une classe parmi plusieurs | Supervisé | Catégorie d'un ticket, type de produit sur une photo |
| **Clustering** | Des groupes d'éléments similaires, découverts sans étiquettes | Non supervisé | Segments de clients, regroupement de documents similaires |
| **Détection d'anomalies** | Les éléments qui ne suivent pas le motif normal | En général non supervisé | Transactions par carte inhabituelles, relevés de capteur défectueux |
| **Prévision** | Les valeurs futures d'une série chronologique | Supervisé sur des données historiques | Ventes du mois prochain par magasin |
| **Recommandation** | Les éléments qu'un utilisateur voudra probablement | Supervisé ou filtrage collaboratif | « Les clients qui ont acheté ceci ont aussi acheté » |

> **Piège d'examen.** « Prédire si » est une classification ; « prédire combien » est une régression. « Segmenter les clients en groupes que nous ne connaissons pas à l'avance » est du clustering ; si les groupes sont connus et étiquetés, c'est une classification.

<!-- section: real-world-applications | objectives: 1.2.4 -->
## Des applications réelles de l'IA

| Application | Ce que fait le modèle | Exemple |
| --- | --- | --- |
| **Vision par ordinateur** | Détecte objets, visages, texte et contenu inapproprié dans les images et les vidéos | Contrôle qualité sur une chaîne de production, modération de contenu |
| **NLP** | Comprend le texte : sentiment, entités, langue, classification | Analyse des avis clients, routage des e-mails |
| **Reconnaissance vocale** | Convertit la parole en texte | Transcriptions de centre d'appels, sous-titres |
| **Systèmes de recommandation** | Classe les éléments pour chaque utilisateur | Produits, vidéos, articles |
| **Détection de fraude** | Attribue un score de risque à des transactions ou des comptes | Paiements par carte, inscriptions de faux comptes |
| **Prévisions** | Prédit des valeurs futures à partir de l'historique | Planification de la demande, des effectifs |
| **Bases de connaissances** | Répond aux questions à partir des documents de l'entreprise (recherche et réponses générées) | Assistant des employés sur les politiques RH |
| **IA agentique** | Planifie et exécute des tâches en plusieurs étapes avec des outils | Un agent qui réserve des voyages dans le respect de la politique de l'entreprise |

<!-- section: aws-ai-services | objectives: 1.2.5 -->
## Les services d'IA/de ML gérés par AWS

Les services d'IA gérés utilisent des modèles entraînés et exploités par AWS : vous appelez une API et obtenez un résultat, sans expertise en ML ni infrastructure.

| Service | Fonctionnalités |
| --- | --- |
| **Amazon SageMaker AI** | Service entièrement géré pour construire, entraîner, régler, déployer et surveiller vos propres modèles de ML ; comprend SageMaker Canvas (ML sans code), JumpStart (modèles préentraînés) et des points de terminaison gérés |
| **Amazon Transcribe** | Parole vers texte, pour des fichiers par lots ou des flux en temps réel ; identification des locuteurs, vocabulaires personnalisés, suppression des données personnelles des transcriptions |
| **Amazon Translate** | Traduction automatique neuronale de textes et de documents, en temps réel ou par lots ; terminologie personnalisée pour les noms de marques et de produits |
| **Amazon Comprehend** | NLP sur du texte : entités, expressions clés, langue, sentiment et sentiment ciblé, syntaxe, détection des données personnelles (PII) ; classification personnalisée et reconnaissance d'entités personnalisée |
| **Amazon Lex** | Interfaces conversationnelles (chatbots et bots vocaux) : reconnaît l'intention d'une demande et collecte les informations nécessaires (slots) |
| **Amazon Polly** | Texte vers parole réaliste, dans de nombreuses langues et voix |
| **Amazon Rekognition** | Analyse d'images et de vidéos : objets, visages, texte, contenu inapproprié |
| **Amazon Textract** | Extrait le texte imprimé et manuscrit, les formulaires et les tableaux de documents numérisés |
| **Amazon Personalize** | Recommandations personnalisées en temps réel à partir des données d'interaction des utilisateurs |

La modélisation de sujets (topic modeling) et la détection d'événements de Comprehend sont fermées aux nouveaux clients, et Amazon Kendra n'est plus ouvert aux nouveaux clients : pour un nouveau projet de recherche ou de questions-réponses sur les documents de l'entreprise, choisissez Amazon Bedrock Knowledge Bases.

> **Piège d'examen.** Transcribe va de la parole vers le texte, Polly du texte vers la parole. Lex comprend une conversation ; il utilise la reconnaissance vocale, mais ce n'est pas un service de transcription. Translate change la langue d'un texte ; Comprehend analyse son sens.

<!-- section: traditional-vs-fm | objectives: 1.2.6 -->
## Modèle de ML traditionnel ou modèle de fondation

| Critère | Modèle de ML traditionnel | Modèle de fondation (FM) |
| --- | --- | --- |
| Données | Données structurées, tabulaires, étiquetées pour une tâche | Texte, images ou son non structurés ; peu ou pas de données étiquetées |
| Tâche | Une prédiction ciblée (score, classe, nombre) | De nombreuses tâches : générer, résumer, répondre, converser |
| Explicabilité | Les modèles simples (modèles linéaires, arbres de décision) sont interprétables ; l'importance des caractéristiques peut être montrée | Des milliards de paramètres, difficile d'expliquer pourquoi une réponse a été produite |
| Préoccupations réglementaires | Plus facile à documenter, auditer et justifier pour des décisions de crédit, d'assurance ou d'embauche | Décisions individuelles plus difficiles à justifier ; risque d'hallucination |
| Contraintes opérationnelles | Petit, peu coûteux, rapide, peut s'exécuter en périphérie avec une très faible latence | Coût par requête et latence plus élevés ; demande beaucoup de calcul ou une API gérée |
| Délai avant le premier résultat | Demande de collecter des données et d'entraîner | Utilisable immédiatement par des invites |

> **Conseil d'examen.** « Les régulateurs exigent que l'entreprise explique chaque décision de prêt » désigne un modèle traditionnel interprétable. « Générer des textes marketing personnalisés dans de nombreuses langues sans données d'entraînement » désigne un modèle de fondation dans Amazon Bedrock.

<!-- section: key-points -->
## Points clés

- L'IA/le ML apporte de la valeur pour l'aide à la décision, la mise à l'échelle, l'automatisation, la découverte de motifs et la personnalisation.
- N'utilisez pas l'IA/le ML quand un résultat exact et déterministe est exigé ou quand les coûts dépassent les avantages.
- La régression prédit un nombre, la classification une catégorie, le clustering trouve des groupes sans étiquettes.
- Transcribe (parole vers texte), Polly (texte vers parole), Translate (langue), Comprehend (sens du texte), Lex (chatbots), Rekognition (images), Textract (documents), Personalize (recommandations), SageMaker AI (vos propres modèles).
- L'explicabilité, la réglementation et des contraintes fortes de latence ou de coût favorisent le ML traditionnel ; les besoins non structurés, multitâches et génératifs favorisent les modèles de fondation.
