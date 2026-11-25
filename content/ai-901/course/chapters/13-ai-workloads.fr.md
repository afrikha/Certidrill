Une charge de travail d'IA est une famille de problèmes que l'IA résout d'une manière reconnaissable. L'examen donne un scénario en une phrase et demande quelle charge de travail, quelle technique ou quelle fonctionnalité il appelle. Retenez ce qui entre et ce qui sort de chacune.

<!-- section: workload-scenarios | objectives: 1.3.1 -->
## Reconnaître une charge de travail dans un scénario

| Charge de travail | Ce qu'elle fait | Scénarios types |
| --- | --- | --- |
| **IA générative** | Crée du contenu nouveau (texte, code, images) en réponse à une invite | Rédiger des descriptions de produits, répondre aux clients en langage naturel, générer du code, construire des quiz pour des étudiants |
| **IA agentique** | Un agent combine un modèle, des instructions et des outils pour accomplir des tâches et agir | Un assistant qui cherche dans la politique de notes de frais, puis dépose la demande ; un agent de support qui retrouve une commande et la met à jour |
| **Analyse de texte** | Extrait le sens d'un texte écrit | Repérer l'insatisfaction dans des avis et des tickets de support, relever les médicaments dans des notes cliniques, résumer des contrats |
| **Reconnaissance et synthèse vocales** (speech) | Comprend une entrée parlée et produit une sortie parlée | Dicter des notes cliniques, transcrire des appels, sous-titrer des vidéos, assistants vocaux |
| **Vision par ordinateur** | Interprète des images, des vidéos et des flux de caméras ; l'IA générative visuelle crée de nouvelles images | Détecter des défauts sur une chaîne de montage, signaler des anomalies sur des radiographies, repérer des rayons vides, lire le texte d'une photo |
| **Extraction d'informations** | Transforme un contenu non structuré en données structurées, lisibles par une machine | Montants de reçus numérisés, champs de factures et de formulaires, enseignements tirés d'appels enregistrés, nombre de visiteurs d'après des séquences vidéo |

> **Piège d'examen.** L'IA générative répond ; l'IA agentique agit. Si le scénario demande seulement de produire du contenu à partir d'une invite, c'est de l'IA générative. Si la solution doit utiliser des outils, par exemple chercher dans une source de connaissances ou mettre à jour un système, c'est de l'IA agentique.

<!-- section: text-analysis-techniques | objectives: 1.3.2 -->
## Techniques d'analyse de texte

Prenons cet avis : « I had a fantastic meal at the diner in Seattle on Saturday. Our waiter, Pete, was friendly and efficient. »

| Technique | Ce qu'elle renvoie | Sur l'exemple |
| --- | --- | --- |
| **Extraction d'expressions clés** (extraction de mots clés) | Les principaux concepts du texte ; utile pour indexer des documents et y faire des recherches | « fantastic meal », « diner », « waiter » |
| **Détection d'entités** (reconnaissance d'entité nommée) | Des éléments d'une catégorie connue, parfois avec un sous-type : personne, lieu, organisation, date et heure, quantité | Pete (personne), Seattle (lieu), Saturday (date) |
| **Analyse des sentiments** | Si le texte est positif, négatif ou neutre, pour le document entier ou phrase par phrase | Positif |
| **Résumé** (la « synthèse » du guide d'étude) | Un texte plus court qui garde les informations les plus importantes | « Un client a apprécié la cuisine et le service d'un diner de Seattle. » |

Deux techniques voisines viennent d'Azure Language dans Foundry Tools : la **détection de langue** renvoie la langue d'un texte avec un score de confiance, et la **détection des informations d'identification personnelle (PII)** trouve les détails personnels comme les noms, numéros de téléphone et adresses, et peut les masquer.

Il y a deux façons d'appliquer ces techniques. Un modèle à usage général les réalise toutes à partir d'une invite et peut les combiner dans une même conversation, mais sa formulation peut varier d'un appel à l'autre. Azure Language utilise des analyseurs spécialisés qui renvoient une sortie structurée et déterministe, ce qui convient aux pipelines automatisés. L'extraction d'expressions clés, l'analyse des sentiments et le résumé sont retirés d'Azure Language le 31 mars 2029, et Learn oriente les nouveaux projets vers les modèles Foundry pour ces tâches.

<!-- section: speech-capabilities | objectives: 1.3.3 -->
## Reconnaissance vocale et synthèse vocale

| | Reconnaissance vocale | Synthèse vocale |
| --- | --- | --- |
| Autre nom | Speech-to-text (STT), conversion de la parole en texte | Text-to-speech (TTS), conversion du texte en parole |
| Entrée | De l'audio parlé, depuis un microphone ou un fichier audio | Du texte, et la voix à utiliser |
| Sortie | Du texte | De l'audio, lu sur un haut-parleur ou écrit dans un fichier |
| Fonctionnement | Un modèle acoustique convertit l'audio en phonèmes ; un modèle de langage associe les phonèmes à des mots | Le texte est découpé en mots, puis en sons phonétiques, puis synthétisé en audio avec une voix, un débit, une hauteur et un volume |
| Fonctionnalités dans Azure Speech | Transcription en temps réel d'un flux ; transcription par lots d'enregistrements stockés, traitée de façon asynchrone | Voix prédéfinies dans de nombreuses langues ; voix neuronales à l'intonation naturelle ; voix personnalisées |
| Usages types | Sous-titres, transcriptions d'appels, dictée, commandes vocales | Lecture de messages à voix haute, réponses parlées d'un assistant, annonces |

Azure Speech propose aussi la **traduction vocale**.

> **Piège d'examen.** Regardez le sens de la conversion. « Générer des sous-titres » ou « transcrire un appel » relève de la reconnaissance, même si aucune voix n'est produite. « Lire la réponse à voix haute » relève de la synthèse. Une voix neuronale est une fonctionnalité de synthèse ; la transcription par lots est une fonctionnalité de reconnaissance.

<!-- section: vision-capabilities | objectives: 1.3.4 -->
## Vision par ordinateur et génération d'images

Les deux familles vont dans des sens opposés :

| | Vision par ordinateur (analyse d'images) | Génération d'images |
| --- | --- | --- |
| Entrée | Une image, en général avec une instruction en texte | Une description en texte, parfois avec une image à modifier |
| Sortie | Du texte ou des données structurées sur l'image | Une nouvelle image |
| Fonctionnalités | Décrire le contenu d'une image ; répondre à des questions sur les objets, le texte ou les scènes ; lire le texte de l'image ; interpréter des graphiques, diagrammes, captures d'écran et documents | Texte vers image ; image vers image et modification d'une image existante ; variantes |
| Modèles | Des modèles multimodaux (compatibles avec la vision) qui acceptent du texte et des images dans la même invite | Des modèles de génération d'images comme la famille GPT-Image-1 (GPT-Image-1.5, GPT-Image-1-Mini) ou FLUX |

Sora 2, le modèle de génération de vidéos de Foundry, est en préversion : il crée de courtes vidéos à partir d'une invite en texte et peut partir d'une image. Parmi les Foundry Tools, Azure Vision fournit une analyse d'images prête à l'emploi, la lecture de texte (OCR) et la détection de visages. Learn signale désormais Image Analysis et l'OCR comme hérités (legacy), et Image Analysis 4.0 sera retiré le 25 septembre 2028.

> **Piège d'examen.** Un modèle de conversation compatible avec la vision lit des images ; il n'en crée pas. Un modèle de génération d'images crée des images ; il ne les décrit pas. « Décrire », « identifier », « lire » désignent l'analyse ; « créer », « dessiner », « concevoir » désignent la génération.

<!-- section: information-extraction-techniques | objectives: 1.3.5 -->
## Extraire des informations de texte, d'images, d'audio et de vidéos

| Contenu | Techniques | Exemple de résultat |
| --- | --- | --- |
| **Texte et documents** | La reconnaissance optique de caractères (OCR) lit le texte imprimé et manuscrit ; l'analyse de la disposition trouve les paragraphes et les tableaux ; l'extraction de champs associe des valeurs aux champs d'un schéma | Fournisseur, date et total d'une facture |
| **Images** | Un modèle décrit l'image, la classe ou remplit les champs que vous définissez | Type de graphique, défauts visibles sur une pièce, produits d'un rayon |
| **Audio** | La reconnaissance vocale transcrit l'enregistrement et sépare les interlocuteurs ; un modèle génère ensuite des champs comme un résumé | Appelant, numéro de rappel et actions demandées d'un message vocal |
| **Vidéo** | Transcription de la parole, extraction d'images clés et détection des plans ; un modèle décrit ensuite chaque segment et remplit des champs | Participants, intervenants et résumé d'une réunion enregistrée |

L'OCR seul renvoie du texte : il ne sait pas que « 1585.98 » est le total de la facture. L'**extraction de champs** applique un schéma, c'est-à-dire la liste des champs voulus et leur structure, et renvoie des valeurs nommées, en général en JSON. Dans Foundry, Azure Content Understanding le fait pour les quatre types de contenu.

<!-- section: key-points -->
## Points clés

- L'IA générative crée du contenu ; un agent y ajoute des outils et des actions.
- Expressions clés : concepts principaux. Entités : personnes, lieux, organisations, dates, quantités. Sentiments : positif, négatif, neutre. Résumé : texte plus court.
- Reconnaissance vocale : de l'audio vers le texte (temps réel ou par lots). Synthèse vocale : du texte vers l'audio (voix, voix neuronales).
- Analyse d'images : de l'image vers le texte, avec un modèle multimodal. Génération d'images : du texte vers l'image, avec un modèle de génération d'images.
- L'extraction d'informations renvoie des champs structurés ; l'OCR seul renvoie du texte.
