Protéger les données suit une logique : savoir ce que l'on a, l'étiqueter, l'empêcher de fuir, puis le conserver ou le supprimer selon les règles. Microsoft Purview a un outil pour chaque étape, et l'examen insiste sur les faux jumeaux : étiquette de confidentialité ou étiquette de rétention, stratégie ou étiquette.

<!-- section: data-classification | objectives: 4.3.1 -->
## Fonctionnalités de classification des données

La classification identifie le contenu sensible pour que les étiquettes, la DLP et la rétention puissent agir dessus. Purview a deux sortes de classifieurs.

| Classifieur | Comment il reconnaît le contenu | Exemple |
| --- | --- | --- |
| **Types d'informations sensibles (SIT)** | Par **modèle** : une expression régulière ou une liste de mots clés, avec des éléments de preuve à proximité et un niveau de confiance | Numéros de carte de crédit, numéros de sécurité sociale, numéros de compte bancaire |
| **Classifieurs entraînables** (trainable classifiers) | Par **ce qu'est le contenu**, grâce au machine learning entraîné sur des exemples | Contrats, factures, CV, harcèlement |

- Les types d'informations sensibles sont **intégrés**, d'**entité nommée** (noms de personnes, adresses postales, termes médicaux), **personnalisés** (vos identifiants d'employé) ou à **correspondance exacte des données (EDM, exact data match)**, qui recherche des valeurs exactes tirées d'une base de vos données sensibles.
- Les classifieurs entraînables sont **préentraînés** par Microsoft et prêts à l'emploi, ou **personnalisés** : vous fournissez des échantillons du contenu à reconnaître. Les classifieurs personnalisés ne prennent en charge que le contenu en anglais.

> **Conseil d'examen.** Un format fixe comme un numéro : type d'informations sensibles. Une catégorie de document qu'aucun modèle ne décrit : classifieur entraînable.

<!-- section: explorers | objectives: 4.3.2 -->
## Explorateur de contenu et Explorateur d'activités

Les deux outils se trouvent sous **Protection des informations** dans le portail Microsoft Purview, dans la section **Explorateurs** (Explorers).

| | Explorateur de contenu | Explorateur d'activités |
| --- | --- | --- |
| Question à laquelle il répond | **Quelles** données sensibles avons-nous, et **où** ? | **Que fait-on** du contenu étiqueté ? |
| Montre | Un instantané actuel des éléments qui ont une étiquette de confidentialité, une étiquette de rétention ou un type d'informations sensibles, dans Exchange, SharePoint, OneDrive et Teams | L'historique des activités, jusqu'à 30 jours : étiquette appliquée, modifiée ou rétrogradée, fichier copié sur un support amovible ou un partage réseau, fichier imprimé, correspondance avec une stratégie DLP |
| Avantage | Voir combien de données sensibles existent et où, jusqu'à l'élément lui-même | Vérifier que les contrôles en place sont efficaces |
| Accès | Très restreint, car il peut montrer le contenu des fichiers : des groupes de rôles précis (Content Explorer List viewer, Content Explorer Content viewer) | Les données viennent du journal d'audit de Microsoft 365 |

Sous Explorateurs, **Data explorer** est désormais la vue principale et consolidée de ces éléments ; l'**Explorateur de contenu (classique)** reste disponible avec son ancienne interface, organisée par emplacement.

<!-- section: sensitivity-labels | objectives: 4.3.3 -->
## Étiquettes de confidentialité et stratégies d'étiquetage

Une **étiquette de confidentialité** (sensitivity label) est une marque appliquée au contenu pour le classifier et, si on le souhaite, le protéger. Un élément n'a qu'une étiquette de confidentialité à la fois. Une étiquette est :

- **Personnalisable** : vous créez les catégories dont vous avez besoin, comme Public, Général, Confidentiel, Hautement confidentiel.
- **En texte clair** : stockée dans les métadonnées du fichier ou de l'e-mail, donc lisible par d'autres applications et services.
- **Persistante** : elle suit le contenu, où qu'il soit enregistré ou envoyé.

| Une étiquette peut | Détail |
| --- | --- |
| **Chiffrer** | Les e-mails, les invitations à des réunions et les documents : seuls les utilisateurs ou les groupes que vous choisissez peuvent les ouvrir |
| **Marquer le contenu** | En-têtes, pieds de page et filigranes dans les applications Office |
| **Protéger des conteneurs** | Contrôler la confidentialité et le partage externe de Teams, des groupes Microsoft 365 et des sites SharePoint |
| **Être appliquée automatiquement** | Dans les applications Office, appliquée ou recommandée quand des types d'informations sensibles ou des classifieurs entraînables sont détectés (l'utilisateur peut refuser l'étiquette) ; une stratégie d'étiquetage automatique étiquette le contenu déjà présent dans SharePoint, OneDrive ou Exchange, sans recommandation |
| **Classifier seulement** | Aucune protection, juste une marque pour les rapports |

Les étiquettes ne font rien tant qu'elles ne sont pas publiées. Une **stratégie d'étiquetage de confidentialité** publie des étiquettes pour des utilisateurs et des groupes choisis, et peut aussi :

- appliquer une **étiquette par défaut** aux nouveaux documents et e-mails ;
- **exiger une justification** pour retirer une étiquette ou la remplacer par une étiquette inférieure ;
- rendre l'étiquetage **obligatoire** avant d'enregistrer un document ou d'envoyer un e-mail ;
- donner un lien vers une **page d'aide** personnalisée.

<!-- section: dlp | objectives: 4.3.4 -->
## Protection contre la perte de données

La **protection contre la perte de données (DLP, data loss prevention)** empêche les utilisateurs de partager des données sensibles de façon inappropriée. Les **stratégies DLP** identifient, surveillent et protègent automatiquement les éléments sensibles dans :

- les services Microsoft 365 : Exchange, SharePoint, OneDrive, les messages de conversation et de canal Teams ;
- les applications Office : Word, Excel, PowerPoint ;
- les appareils Windows ou macOS (**DLP de point de terminaison** : copie sur une clé USB ou un partage réseau, impression) ;
- les partages de fichiers locaux et SharePoint local, Microsoft Fabric et Power BI, les applications cloud non-Microsoft.

La DLP détecte le contenu par une analyse de contenu approfondie, pas par une simple analyse de texte. Quand une condition est remplie, une stratégie peut afficher un **conseil de stratégie** (policy tip) qui avertit l'utilisateur, **bloquer** le partage avec ou sans possibilité de passer outre en donnant une justification, ou déplacer un fichier au repos en quarantaine. Dans Teams, le message sensible n'est pas affiché aux destinataires.

<!-- section: retention | objectives: 4.3.6 -->
## Stratégies de rétention, étiquettes de rétention et stratégies d'étiquette de rétention

La **gestion du cycle de vie des données** conserve ce que vous devez garder et supprime ce dont vous n'avez plus besoin. Les paramètres de rétention ont trois issues : **conserver uniquement**, **supprimer uniquement**, ou **conserver puis supprimer**. Le contenu conservé reste à sa place ; si un utilisateur le modifie ou le supprime, une copie est gardée dans un emplacement sécurisé.

| | Stratégie de rétention | Étiquette de rétention |
| --- | --- | --- |
| Niveau | Le conteneur : site, boîte aux lettres, conversations Teams | L'élément : document, e-mail, dossier |
| Paramètres | Les mêmes pour tout le contenu de l'emplacement | Différents d'un élément à l'autre |
| Quand le contenu est déplacé | Les paramètres ne le suivent pas | Les paramètres le suivent à l'intérieur du locataire Microsoft 365 |
| Combien | Plusieurs stratégies peuvent s'appliquer au même contenu | Une seule étiquette de rétention à la fois par élément |
| Seulement ici | Les messages Teams et Viva Engage | Démarrer la rétention sur un événement, révision de destruction, marquer comme enregistrement |

Une **stratégie d'étiquette de rétention** rend les étiquettes utilisables : elle les **publie** dans des emplacements pour que les utilisateurs puissent les appliquer, ou **applique automatiquement** une étiquette quand une condition est remplie. Si plusieurs paramètres sont en conflit, **la rétention l'emporte sur la suppression** et la période de rétention la plus longue l'emporte.

> **Piège d'examen.** **Étiquette de confidentialité** : à quel point le contenu est confidentiel ; elle peut chiffrer et elle persiste hors de Microsoft 365. **Étiquette de rétention** : combien de temps le contenu est conservé. Un document peut avoir une étiquette de chaque sorte.

<!-- section: records-management | objectives: 4.3.5 -->
## Gestion des enregistrements

La **gestion des enregistrements** (records management) ajoute du contrôle pour les éléments de grande valeur qui ont une importance juridique, réglementaire ou critique pour l'activité. Un élément devient un **enregistrement** (record) par une étiquette de rétention qui le marque comme tel. Alors :

- des **restrictions** bloquent certaines actions, comme supprimer l'élément ou modifier un enregistrement verrouillé ;
- les activités sur l'élément sont **journalisées** ;
- une **preuve de destruction** (proof of disposition) est conservée quand l'élément est supprimé à la fin de sa période de rétention.

Un **enregistrement réglementaire** (regulatory record) est plus strict : une fois l'étiquette appliquée, **personne, pas même un administrateur général, ne peut la retirer**, et la période de rétention ne peut pas être raccourcie.

Autres fonctionnalités : un **plan de fichiers** (file plan) pour gérer toutes les étiquettes de rétention au même endroit, la **rétention basée sur des événements** (la période démarre quand un événement se produit, comme le départ d'un employé) et la **révision de destruction** (disposition review : un réviseur approuve la suppression ou prolonge la rétention).

<!-- section: key-points -->
## Points clés

- Les types d'informations sensibles reconnaissent des modèles ; les classifieurs entraînables reconnaissent des catégories de contenu par machine learning.
- Explorateur de contenu : quels éléments sensibles existent et où (accès restreint). Explorateur d'activités : ce que les utilisateurs font du contenu étiqueté.
- Les étiquettes de confidentialité classifient et protègent (chiffrement, marquages, conteneurs) ; une stratégie d'étiquetage les publie.
- Les stratégies DLP identifient, surveillent et protègent les éléments sensibles dans Microsoft 365, les applications Office et les appareils : conseils de stratégie et blocage.
- Stratégie de rétention : niveau du conteneur. Étiquette de rétention : niveau de l'élément. Les stratégies d'étiquette de rétention publient ou appliquent automatiquement des étiquettes.
- Gestion des enregistrements : les étiquettes de rétention déclarent des enregistrements ; l'étiquette d'un enregistrement réglementaire ne peut jamais être retirée.
