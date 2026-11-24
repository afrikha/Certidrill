Microsoft regroupe l'IA responsable en six principes : impartialité, fiabilité et sécurité, confidentialité et sécurité, inclusion, transparence et responsabilité. L'examen décrit une situation ou une décision de conception et demande quel principe elle sert, souvent sous la forme d'une série d'affirmations Oui/Non. Retenez l'idée unique derrière chaque principe, puis les paires faciles à intervertir.

<!-- section: fairness | objectives: 1.1.1 -->
## Impartialité

Les systèmes d'IA doivent traiter tout le monde de manière équitable et éviter d'affecter différemment des groupes de personnes dans des situations similaires. Un système qui oriente l'octroi de prêts, le recrutement ou un traitement médical doit faire la même recommandation à des personnes dont les finances, les qualifications ou les symptômes sont similaires. Microsoft Learn emploie aussi le mot « équité » pour ce principe (fairness).

Ce qu'il faut prendre en compte :

- **Biais dans les données.** Un biais peut entrer lors de la collecte des données, de la construction du modèle ou de l'exploitation du système. Vérifiez d'où vient un jeu de données et si chaque groupe y est correctement représenté.
- **Résultats par groupe.** Comparez les résultats pour les groupes sensibles comme le genre, l'origine ethnique ou l'âge, et pas seulement la précision globale.
- **Évaluation.** Dans Foundry, l'évaluateur de risque et de sécurité Hateful and unfairness attribue à la sortie d'un modèle ou d'un agent un score de gravité (de 0 à 7) pour les propos haineux et les représentations inéquitables de groupes sociaux. Il juge le contenu de chaque réponse, pas le fait que des personnes comparables obtiennent des résultats comparables : il faut donc toujours comparer les résultats par groupe. Les évaluateurs détectent et notent les problèmes ; ils ne les corrigent pas.

<!-- section: reliability-safety | objectives: 1.1.2 -->
## Fiabilité et sécurité

Les systèmes d'IA doivent fonctionner de manière fiable, sûre et cohérente : se comporter comme ils ont été conçus, réagir sans danger à des conditions que personne n'avait prévues, et résister aux manipulations nuisibles.

Ce qu'il faut prendre en compte :

- **Tests.** Testez rigoureusement pendant le développement et le déploiement. Un système qui touche à la sécurité des personnes ou à de larges populations est testé en laboratoire et en conditions réelles.
- **Circonstances imprévues.** Concevez le système pour les mauvais usages accidentels, les données malveillantes et les attaques.
- **Surveillance et retours.** Suivez les performances après la mise en service et donnez aux utilisateurs un moyen de signaler les problèmes.
- **Intervention humaine.** Décidez quand le système doit passer la main à une personne.
- **Contenu généré.** Un modèle génératif peut produire un texte faux ou nuisible. Les modèles Foundry appliquent par défaut des filtres de sécurité du contenu (garde-fous), qui bloquent les invites et les réponses nuisibles. Pour les modèles Azure OpenAI, tous les modèles sauf les modèles de transcription reçoivent une stratégie par défaut ; sur le texte, elle filtre les contenus haineux et inéquitables (hate and fairness), violents, sexuels et d'automutilation à un seuil Medium dans les invites et les complétions, et détecte les attaques par invite utilisateur (jailbreak). Ancrer l'invite dans des données de confiance rend les réponses plus fiables.

<!-- section: privacy-security | objectives: 1.1.3 -->
## Confidentialité et sécurité

Les systèmes d'IA ont besoin de données : les données et les modèles doivent donc être protégés, et le droit des personnes à la vie privée préservé.

Ce qu'il faut prendre en compte :

- **Lois et consentement.** Respectez les lois sur la protection des données et la vie privée ; dites aux personnes comment leurs données sont collectées, utilisées et stockées, et donnez-leur le contrôle.
- **Minimisation des données.** N'utilisez les données personnelles que pour une finalité définie et pour la durée nécessaire ; supprimez ce qui a été collecté par erreur ou n'est plus pertinent.
- **Anonymat.** Retirez des données ce qui identifie les personnes. La détection des informations d'identification personnelle (PII) d'Azure Language trouve les noms, numéros de téléphone ou adresses dans un texte et peut les masquer avant que le texte soit stocké ou partagé.
- **Accès.** Microsoft Entra ID et le contrôle d'accès en fonction du rôle limitent qui peut atteindre les déploiements de modèles, les ressources et les données. Les clés et autres secrets ont leur place dans Azure Key Vault, pas dans le code.

Le français utilise le même mot « sécurité » dans deux principes. Dans celui-ci, il traduit « security » : protéger les données et les systèmes contre les accès non autorisés. Dans le principe précédent, il traduit « safety » : le comportement du système lui-même ne cause pas de tort.

<!-- section: inclusiveness | objectives: 1.1.4 -->
## Inclusion

L'IA doit donner des moyens d'agir à chaque personne : les systèmes doivent donc refléter toute la diversité des expériences et des besoins humains. Les sous-titres en temps réel, les descriptions d'images et la saisie prédictive aident déjà des personnes ayant un handicap auditif, visuel ou autre à participer au travail et à la vie quotidienne ; une interface vocale rend une application utilisable sans clavier ni écran. Microsoft Learn emploie aussi le mot « inclusivité » pour ce principe (inclusiveness).

Ce qu'il faut prendre en compte :

- **Conception inclusive.** Reconnaissez qui pourrait être exclu et pourquoi ; résolvez pour une personne et étendez à beaucoup ; apprenez de la diversité des points de vue.
- **Accessibilité.** Suivez les normes et les lois d'accessibilité, et testez avec des personnes en situation de handicap.
- **Diversité des utilisateurs.** Tenez compte des différentes langues et des différents niveaux de compétence technique.

<!-- section: transparency | objectives: 1.1.5 -->
## Transparence

Les personnes doivent pouvoir comprendre comment un système d'IA parvient à ses résultats, ce qu'il sait faire et quelles sont ses limites. Ceux qui utilisent l'IA doivent aussi dire ouvertement quand, pourquoi et comment ils l'utilisent.

Ce qu'il faut prendre en compte :

- **Information.** Dites aux utilisateurs qu'ils parlent à une IA et signalez le contenu généré, par exemple « le contenu généré par l'IA peut être incorrect ».
- **Intelligibilité.** Expliquez le comportement du système en des termes que ses utilisateurs et les parties prenantes comprennent, par exemple pourquoi une demande a été refusée.
- **Documentation.** Publiez la finalité, les données et les limites du système. Dans le catalogue de modèles de Foundry, chaque modèle a une carte de modèle avec ses contraintes et ses mises en garde.
- **Sources.** Une réponse ancrée dans des documents et qui les cite permet à l'utilisateur de la vérifier.

<!-- section: accountability | objectives: 1.1.6 -->
## Responsabilité

Les personnes qui conçoivent et déploient un système d'IA sont responsables de son fonctionnement. L'IA ne doit pas être l'autorité finale sur une décision qui touche la vie de quelqu'un, et les humains gardent un contrôle significatif sur les systèmes très autonomes.

Ce qu'il faut prendre en compte :

- **Gouvernance.** Définissez des rôles, des stratégies et des comités de revue qui supervisent le développement et le déploiement.
- **Humain dans la boucle.** Gardez des personnes compétentes impliquées dans les décisions importantes, capables d'inspecter et de corriger ce que le modèle a produit.
- **Traçabilité.** Consignez qui a déployé quel modèle, quand et pourquoi, et surveillez-le en production.

<!-- section: telling-principles-apart | objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6 -->
## Distinguer les principes

| Le scénario dit | Principe |
| --- | --- |
| Un modèle de recrutement classe moins bien des candidats aussi qualifiés à cause de leur genre | Impartialité |
| Un chatbot est testé avec des invites qui cherchent à lui faire produire du contenu nuisible | Fiabilité et sécurité |
| Les noms des clients sont masqués avant le stockage des transcriptions d'appels | Confidentialité et sécurité |
| Seul le personnel autorisé peut lire les données que l'agent utilise | Confidentialité et sécurité |
| Une application ajoute des sous-titres et une interface vocale pour les utilisateurs qui ne peuvent pas entendre ou voir | Inclusion |
| Une page indique aux utilisateurs que les réponses sont générées par l'IA et peuvent être incorrectes | Transparence |
| Une banque peut expliquer pourquoi une demande de prêt a été refusée | Transparence |
| Un médecin confirme chaque diagnostic que le système propose | Responsabilité |
| Un comité approuve chaque système d'IA avant sa mise en service | Responsabilité |

> **Piège d'examen.** L'impartialité porte sur les résultats : des personnes comparables obtiennent des résultats comparables. L'inclusion porte sur l'accès : personne n'est laissé de côté à cause d'un handicap, d'une langue ou d'un niveau de compétence. Un modèle de prêt biaisé est un problème d'impartialité ; une application inutilisable avec un lecteur d'écran est un problème d'inclusion.

> **Piège d'examen.** La transparence porte sur la compréhension : le système est expliqué et ses limites sont documentées. La responsabilité porte sur les personnes : quelqu'un répond du système et un humain peut passer outre. « Expliquer la décision » relève de la transparence ; « une personne relit la décision » relève de la responsabilité.

> **Conseil d'examen.** Quand un scénario parle de données personnelles, de consentement, de chiffrement ou de droits d'accès, la réponse est confidentialité et sécurité. Quand il parle de tests, d'entrées inattendues, de défaillances ou de contenu nuisible, la réponse est fiabilité et sécurité.

<!-- section: key-points -->
## Points clés

- Impartialité : personnes similaires, résultats similaires ; cherchez les biais dans les données et comparez les résultats par groupe.
- Fiabilité et sécurité : fonctionne comme prévu, même dans des conditions inattendues ; tests, surveillance, filtres de contenu.
- Confidentialité et sécurité : protéger les données personnelles et les accès ; consentement, minimisation, masquage des PII, contrôle d'accès.
- Inclusion : utilisable par tous ; accessibilité, langues, conception inclusive.
- Transparence : les utilisateurs savent qu'ils ont affaire à une IA et comprennent son comportement et ses limites.
- Responsabilité : des personnes répondent du système et gardent le contrôle ; gouvernance et revue humaine.
