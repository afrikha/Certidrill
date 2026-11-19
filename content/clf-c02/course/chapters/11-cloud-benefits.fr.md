Le cloud computing est la mise à disposition à la demande de ressources informatiques par Internet, avec une tarification à l'utilisation : au lieu d'acheter et d'exploiter des serveurs, vous utilisez du calcul, du stockage, des bases de données et d'autres services d'AWS quand vous en avez besoin, et vous ne payez que ce que vous utilisez. L'examen vous demande de relier une affirmation métier à l'un des six avantages du cloud computing, à un avantage de l'infrastructure mondiale, ou à la haute disponibilité, à l'élasticité ou à l'agilité.

<!-- section: value-proposition | objectives: 1.1.1 -->
## La proposition de valeur du Cloud AWS

AWS résume la valeur du cloud en six avantages. Retenez leur nom exact : l'examen les cite souvent en anglais.

| Avantage | Ce qu'il signifie | Énoncé type |
| --- | --- | --- |
| **Trade fixed expense for variable expense** (remplacer les dépenses fixes par des dépenses variables) | Pas de gros investissement dans des centres de données et des serveurs avant de savoir comment vous les utiliserez ; vous payez seulement quand vous consommez des ressources, et seulement ce que vous consommez | « avoid upfront hardware purchases », « pay only for what is used » |
| **Benefit from massive economies of scale** (bénéficier d'économies d'échelle massives) | AWS agrège l'utilisation de centaines de milliers de clients, ce qui se traduit par des prix à l'utilisation plus bas | « lower prices because AWS buys at scale » |
| **Stop guessing capacity** (ne plus deviner la capacité) | Ni ressources inactives coûteuses ni pénurie : vous utilisez autant ou aussi peu que nécessaire et augmentez ou réduisez la capacité en quelques minutes | « the company overprovisions servers for its yearly peak » |
| **Increase speed and agility** (gagner en vitesse et en agilité) | Les nouvelles ressources sont à un clic : le délai pour les mettre à disposition des développeurs passe de plusieurs semaines à quelques minutes | « developers wait weeks for a server », « experiment quickly » |
| **Stop spending money running and maintaining data centers** (ne plus dépenser pour exploiter et entretenir des centres de données) | Se concentrer sur les projets qui différencient l'entreprise, pas sur l'installation, l'empilement et l'alimentation des serveurs | « the IT team spends its time maintaining hardware » |
| **Go global in minutes** (devenir mondial en quelques minutes) | Déployer une application dans plusieurs Régions du monde en quelques clics, pour une latence plus faible à un coût minimal | « serve customers on another continent with low latency » |

Ces avantages font d'AWS un modèle de **service public** (utility) : comme l'électricité, la capacité est consommée comme un service et facturée à l'usage. Sur AWS, une entreprise ne possède ni n'amortit le matériel ; elle paie une dépense d'exploitation.

> **Piège d'examen.** « Trade fixed expense for variable expense » et « Benefit from massive economies of scale » parlent tous deux de coût. Le premier porte sur *quand et comment* vous payez (pas d'achat initial, paiement à l'usage) ; le second porte sur *le prix lui-même*, plus bas parce qu'AWS achète et exploite à très grande échelle.

<!-- section: global-infrastructure-benefits | objectives: 1.1.2 -->
## Les avantages de l'infrastructure mondiale

L'infrastructure mondiale AWS se compose de **Régions** (des zones géographiques distinctes), chacune avec plusieurs **zones de disponibilité** (un ou plusieurs centres de données avec alimentation, refroidissement et réseau indépendants), et d'**emplacements périphériques** qui rapprochent le contenu et les réponses DNS des utilisateurs. Le chapitre 32 détaille leurs relations ; ici, l'examen demande ce qu'elles apportent à une entreprise.

| Avantage | Ce que l'infrastructure mondiale apporte |
| --- | --- |
| **Rapidité du déploiement** | Les ressources sont déjà construites et disponibles dans chaque Région : un nouvel environnement prend quelques minutes au lieu des mois d'un nouveau centre de données. Un modèle (AWS CloudFormation) redéploie le même environnement dans une autre Région |
| **Portée mondiale** | Une entreprise peut exécuter son application dans une Région proche de chaque groupe de clients sans construire ni louer de locaux dans leur pays |
| **Faible latence** | Les utilisateurs sont servis depuis la Région la plus proche, et depuis les emplacements périphériques pour le contenu mis en cache (Amazon CloudFront) |
| **Résidence des données** | Le client choisit la Région où ses données sont stockées ; les données ne quittent pas cette Région tant que le client ne les copie ou ne les réplique pas |
| **Résilience** | Plusieurs zones de disponibilité par Région, et plusieurs Régions, permettent des conceptions qui survivent à la perte d'un centre de données ou d'une Région entière |

> **Conseil d'examen.** « S'implanter dans un nouveau pays en quelques jours, sans construire de centre de données » correspond à **go global in minutes**, un avantage de l'infrastructure mondiale. « Garder les données des clients dans l'Union européenne » se règle en **choisissant la Région**, pas avec un service de sécurité.

<!-- section: availability-elasticity-agility | objectives: 1.1.3 -->
## Haute disponibilité, élasticité et agilité

| Concept | Définition | Comment AWS l'apporte | Énoncé type |
| --- | --- | --- | --- |
| **Haute disponibilité** | Le système continue de fonctionner, avec une interruption minimale, quand un composant tombe en panne | Exécuter les ressources dans **plusieurs zones de disponibilité**, derrière un équilibreur de charge ; services gérés avec options Multi-AZ | « the application must remain available if a data center fails » |
| **Élasticité** | Des ressources sont ajoutées et retirées **automatiquement** selon la demande, dans les deux sens | **Auto Scaling** ajoute des instances pendant un pic et les retire quand la demande baisse ; les services sans serveur se mettent à l'échelle seuls | « traffic varies a lot during the day », « pay only for the capacity used at each moment » |
| **Agilité** | L'organisation peut essayer, modifier et livrer rapidement et à faible coût | Ressources en quelques minutes, services gérés, automatisation ; une expérience qui échoue coûte peu et se supprime | « reduce the time to launch new features », « experiment with new ideas » |

Termes voisins que les options utilisent :

- **Scalabilité** (scalability) : la capacité à grandir pour absorber plus de charge, en ajoutant des ressources (mise à l'échelle horizontale : plus d'instances) ou en utilisant une ressource plus grosse (mise à l'échelle verticale : une instance plus grande). L'élasticité est une scalabilité automatique, qui sait aussi réduire.
- **Tolérance aux pannes** (fault tolerance) : le système continue de fonctionner *sans aucune interruption* quand un composant tombe en panne, car des composants redondants prennent le relais. La haute disponibilité accepte une interruption très courte ; la tolérance aux pannes vise zéro interruption.
- **Durabilité** (durability) : les données ne sont pas perdues. Amazon S3 est conçu pour une durabilité de 99,999999999 % (11 neuf) en stockant les données de façon redondante dans au moins trois zones de disponibilité (sauf les classes de stockage S3 One Zone).

> **Piège d'examen.** L'élasticité concerne une **demande qui varie** (augmenter puis réduire) ; la haute disponibilité concerne les **pannes** (continuer à fonctionner quand une zone de disponibilité est perdue). « Absorber le trafic du Black Friday, puis ne plus le payer » relève de l'élasticité, pas de la haute disponibilité.

<!-- section: key-points -->
## Points clés

- Cloud computing : ressources informatiques à la demande par Internet, tarification à l'utilisation.
- Six avantages : dépenses fixes remplacées par des dépenses variables, économies d'échelle, ne plus deviner la capacité, vitesse et agilité, plus d'entretien de centres de données, mondial en quelques minutes.
- Infrastructure mondiale : rapidité du déploiement, portée mondiale, faible latence, résidence des données par le choix de la Région, résilience sur plusieurs zones de disponibilité et Régions.
- Haute disponibilité : plusieurs zones de disponibilité. Élasticité : Auto Scaling dans les deux sens. Agilité : expérimentation rapide et peu coûteuse.
