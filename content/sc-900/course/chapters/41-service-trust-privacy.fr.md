Avant de confier des données réglementées à un fournisseur de cloud, une organisation veut des preuves : qui a audité le fournisseur, ce que dit le rapport, comment les données sont protégées. Microsoft publie ces preuves dans le Portail d'approbation des services et énonce ses engagements dans des principes de confidentialité. L'examen vérifie que vous savez ce que le portail propose et ce que chaque principe promet.

<!-- section: service-trust-portal | objectives: 4.1.1 -->
## Offres du Portail d'approbation des services

Le **Portail d'approbation des services** (Service Trust Portal, STP) est le site public où Microsoft publie des **rapports d'audit** et d'autres informations de conformité sur ses services cloud (`https://aka.ms/STP`). Il fournit du contenu, des outils et des ressources sur la façon dont les services cloud Microsoft protègent vos données et sur la façon dont vous pouvez gérer la sécurité et la conformité de vos propres données cloud.

Ce que vous y trouvez :

- Des rapports d'audit produits par des **auditeurs externes**, que vous pouvez télécharger.
- Des **livres blancs** rédigés par Microsoft sur la façon dont ses services protègent les données.
- Des conseils pour gérer la sécurité et la conformité des données cloud.

| Catégorie | Contenu |
| --- | --- |
| **Certifications, réglementations et normes** | Des informations sur l'implémentation et la conception de la sécurité, qui montrent comment les services cloud Microsoft respectent les normes et les réglementations : ISO/IEC, SOC, RGPD, FedRAMP, PCI DSS et d'autres |
| **Rapports, livres blancs et artefacts** | Des documents généraux : ressources sur l'IA (conformité, sécurité et confidentialité des solutions d'IA comme Microsoft Copilot), continuité d'activité et reprise d'activité, rapports de tests d'intrusion et d'évaluations de sécurité menés par des tiers, confidentialité et protection des données, FAQ et livres blancs |
| **Ressources sectorielles et régionales** | Des documents par secteur (services financiers, soins de santé et sciences de la vie, médias et divertissements, gouvernement des États-Unis) et par région |
| **Ressources pour votre organisation** | Les documents qui s'appliquent à votre organisation, restreints par locataire selon son abonnement et ses autorisations |

Points pratiques :

- **Accès** : le site est public, mais certaines ressources exigent de vous connecter avec votre compte de services cloud Microsoft (un compte d'organisation Microsoft Entra) et d'accepter l'accord de confidentialité de Microsoft pour les documents de conformité.
- **Ma bibliothèque** : vous enregistrez des documents au même endroit avec **Enregistrer dans la bibliothèque**, et les **Paramètres de notification** envoient un e-mail quand un document enregistré est mis à jour.
- **Tous les documents** (All Documents) liste tous les documents disponibles, avec un filtre par service cloud ; **Mon historique de téléchargement** (My Download History) montre les documents téléchargés au cours des 18 derniers mois.

| Besoin | Réponse |
| --- | --- |
| Télécharger le rapport d'audit SOC 2 ou ISO 27001 d'un service cloud Microsoft | Portail d'approbation des services |
| Lire le résultat d'un test d'intrusion mené par un tiers sur les services cloud Microsoft | Portail d'approbation des services |
| Être prévenu quand un document de conformité est mis à jour | Ma bibliothèque dans le Portail d'approbation des services |
| Mesurer l'avancement de votre propre organisation par rapport à une réglementation | Gestionnaire de conformité, dans le portail Microsoft Purview |

> **Piège d'examen.** Le Portail d'approbation des services documente la conformité de **Microsoft** et de ses services. Il n'évalue pas **votre** locataire : c'est le rôle du Gestionnaire de conformité. Ni l'un ni l'autre n'est un outil de surveillance de la sécurité.

<!-- section: privacy-principles | objectives: 4.1.2 -->
## Principes de confidentialité de Microsoft

L'approche de Microsoft en matière de confidentialité repose sur l'engagement de vous donner le contrôle des données que vous placez dans le cloud, garanti par des engagements contractuels. Elle s'énonce en quatre principes :

| Principe | Ce qu'il promet |
| --- | --- |
| **Vous contrôlez vos données** | Vos données vous appartiennent : vous pouvez y accéder, les modifier ou les supprimer à tout moment. Microsoft ne les utilise que pour fournir les services que vous avez choisis, et ne les partage pas avec des services financés par la publicité ni ne les exploite à des fins de marketing ou de publicité |
| **Savoir où se trouvent vos données** | Vous pouvez déterminer où vos données sont stockées : Microsoft propose des options de résidence des données dans le monde entier et fait preuve de transparence sur la façon dont les données sont stockées et traitées |
| **Vos données sont sécurisées au repos et en transit** | Microsoft chiffre les données au repos (jusqu'à AES-256) et en transit (avec des protocoles comme TLS et IPsec) ; des services comme Azure Key Vault vous donnent le contrôle des clés et des secrets |
| **Microsoft défend vos données** | Microsoft ne donne à aucun gouvernement un accès direct ou sans entrave aux données des clients. Sa position est que les demandes gouvernementales portant sur vos données doivent vous être adressées, et il conteste ces demandes en justice quand la loi le lui permet |

Détails utiles :

- Sous **Vous contrôlez vos données** : les sous-traitants qui ont besoin d'accéder à vos données ne peuvent exécuter que les fonctions pour lesquelles ils ont été engagés, et sont liés par les mêmes engagements contractuels de confidentialité ; les sous-traitants ultérieurs autorisés sont audités au préalable.
- Si un gouvernement ou une autorité chargée de l'application de la loi demande vos données, Microsoft ne les divulgue pas, sauf selon vos instructions ou quand la loi l'exige, et, quand la loi le permet, vous en informe rapidement, vous fournit une copie de la demande et redirige le demandeur vers vous.

> **Conseil d'examen.** Des affirmations comme « Microsoft utilise les données des clients pour la publicité » ou « Microsoft donne aux gouvernements un accès direct aux données des clients » sont toujours fausses. « Le client possède et contrôle ses données » est toujours vraie.

<!-- section: key-points -->
## Points clés

- Portail d'approbation des services : le site public de Microsoft pour les rapports d'audit d'auditeurs externes, les livres blancs, les rapports de tests d'intrusion et les conseils de conformité sur les services cloud Microsoft.
- Quatre catégories : Certifications, réglementations et normes ; Rapports, livres blancs et artefacts ; Ressources sectorielles et régionales ; Ressources pour votre organisation.
- Certains documents exigent une connexion avec un compte d'organisation Microsoft Entra ; Ma bibliothèque enregistre des documents et vous prévient des mises à jour.
- Le portail concerne la conformité de Microsoft ; le Gestionnaire de conformité concerne la vôtre.
- Principes de confidentialité : vous contrôlez vos données ; vous savez où elles se trouvent ; elles sont sécurisées au repos et en transit ; Microsoft les défend.
- Microsoft n'utilise pas les données des clients pour la publicité et ne donne à aucun gouvernement un accès direct à celles-ci.
