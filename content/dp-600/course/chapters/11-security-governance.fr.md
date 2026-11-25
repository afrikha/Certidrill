La sécurité de Fabric fonctionne par couches : Microsoft Entra ID authentifie l'utilisateur, un rôle d'espace de travail ou une autorisation d'élément ouvre l'élément, puis le moteur qui lit les données (SQL, le modèle sémantique ou OneLake) applique ses propres règles de lignes, de colonnes, d'objets ou de dossiers. Les questions d'examen donnent un utilisateur, un besoin et une contrainte de « privilège minimum », et demandent quel rôle, quelle autorisation ou quelle fonctionnalité de sécurité utiliser, et où la définir.

<!-- section: workspace-roles | objectives: 1.1.1 -->
## Les rôles d'espace de travail

Un rôle d'espace de travail s'applique à **tous les éléments** de l'espace de travail, présents et futurs. Il ne s'étend ni aux autres espaces de travail, ni à la capacité, ni au locataire. Un utilisateur sans rôle et sans autorisation d'élément ne voit pas l'espace de travail.

| Capacité | Admin | Member | Contributor | Viewer |
| --- | --- | --- | --- | --- |
| Modifier et supprimer l'espace de travail, ajouter ou retirer des administrateurs | Oui | Non | Non | Non |
| Connecter l'espace de travail à Git, créer une identité d'espace de travail | Oui | Non | Non | Non |
| Ajouter des membres et des rôles inférieurs, autoriser d'autres personnes à repartager | Oui | Oui | Non | Non |
| Créer, modifier et supprimer des éléments, écrire les données des lakehouses et entrepôts | Oui | Oui | Oui | Non |
| Exécuter ou annuler des notebooks, des définitions de travaux Spark et des pipelines | Oui | Oui | Oui | Non |
| Lire les données des lakehouses et entrepôts en T-SQL (point de terminaison d'analytique SQL) | Oui | Oui | Oui | Oui |
| Lire les données via les API OneLake, Spark et l'explorateur de lakehouse (ReadAll) | Oui | Oui | Oui | Non |
| Voir le contenu et les résultats d'exécution des éléments | Oui | Oui | Oui | Oui |

Les règles à appliquer dans les questions :

- Les rôles s'attribuent à des utilisateurs, à des **groupes de sécurité, groupes Microsoft 365 et listes de distribution**, et à des principaux de service. Les groupes imbriqués transmettent le rôle à leurs membres.
- Un utilisateur qui reçoit plusieurs rôles par plusieurs groupes obtient le **plus élevé** d'entre eux ; les rôles ne se combinent pas en un nouveau rôle.
- Les Contributors et les Viewers ne peuvent partager un élément que s'ils disposent de **Reshare** sur celui-ci.
- Viewer est le seul rôle soumis à la sécurité au niveau des lignes et au niveau de l'objet du modèle sémantique, ainsi qu'aux rôles de sécurité OneLake. Admin, Member et Contributor ont l'autorisation d'écriture sur les éléments : ces règles ne les filtrent pas.

| Besoin | Rôle |
| --- | --- |
| Créer et exécuter notebooks, pipelines et entrepôts, sans gérer les accès | Contributor |
| Ajouter aussi d'autres personnes à l'espace de travail | Member |
| Connecter l'espace de travail à un référentiel Git, ou le supprimer | Admin |
| Lire les rapports et interroger le point de terminaison d'analytique SQL, sans rien modifier | Viewer |

> **Piège d'examen.** Un Viewer peut interroger un lakehouse par son point de terminaison d'analytique SQL, mais ne peut pas lire ses fichiers avec Spark ou l'explorateur de lakehouse : il faut ReadAll, que Viewer n'inclut pas.

<!-- section: item-permissions | objectives: 1.1.2 -->
## Les autorisations d'élément et le partage

Pour donner accès à **un seul élément** sans ouvrir tout l'espace de travail, partagez l'élément. Le destinataire reçoit **Read** par défaut, plus les autorisations supplémentaires cochées dans la boîte de dialogue de partage. Le partage ne crée pas de rôle d'espace de travail, et le destinataire ne voit que l'élément partagé.

| Autorisation (boîte de partage) | Nom interne | Ce qu'elle permet |
| --- | --- | --- |
| Toujours accordée | Read | Trouver l'élément dans le catalogue OneLake, l'ouvrir, se connecter au point de terminaison d'analytique SQL. Aucun accès aux tables à elle seule |
| Read all with SQL analytics endpoint / Read all data using SQL | ReadData | Lire toutes les tables et vues en T-SQL, comme `db_datareader` |
| Read all with Apache Spark / Read all data using Apache Spark | ReadAll | Lire les fichiers dans OneLake via Spark, les API OneLake et l'explorateur de lakehouse |
| Share | Reshare | Repartager l'élément, dans la limite des autorisations du destinataire |
| Build (modèle sémantique) | Build | Créer des rapports sur le modèle, utiliser Analyser dans Excel, l'interroger par le point de terminaison XMLA |
| Execute | Execute | Exécuter ou annuler l'élément |
| Subscribe to OneLake events | SubscribeOneLakeEvents | S'abonner aux événements OneLake de l'élément ; actuellement accordée avec ReadAll |

Les points qui décident des réponses :

- **ReadData et ReadAll sont indépendantes.** Un utilisateur qui n'a que ReadData peut utiliser le point de terminaison d'analytique SQL, mais ni l'URL du lakehouse ni Spark.
- Le partage d'un lakehouse n'accorde jamais l'**écriture**. Écrire demande le rôle Contributor ou supérieur (ou un rôle de sécurité OneLake ReadWrite, voir plus bas).
- Pour un accès SQL **granulaire**, partagez sans autorisation supplémentaire (Read seul), puis accordez des autorisations sur les objets en T-SQL dans l'entrepôt ou le point de terminaison d'analytique SQL. Sur un lakehouse, cela vaut pour le mode identité déléguée par défaut du point de terminaison d'analytique SQL : en mode **identité de l'utilisateur**, les `GRANT`/`REVOKE` sur les tables sont ignorés et ReadData ne donne aucun accès SQL aux données (voir la sécurité OneLake plus bas).
- Un rapport en **Direct Lake** ou en **DirectQuery** sur un entrepôt exige que le lecteur ait ReadData ou des autorisations SQL granulaires ; un rapport en **Import** non.
- Un entrepôt ne peut pas être partagé directement avec un principal de service, et ses destinataires ne peuvent pas le repartager.
- La révocation d'une autorisation peut prendre jusqu'à **deux heures** pour les utilisateurs connectés.
- Un lakehouse peut aussi être partagé avec **Execute Apache Spark**, qui permet au destinataire d'exécuter des travaux Spark par le point de terminaison Livy du lakehouse.
- Sur un modèle sémantique, **Write** (republier, modifier le modèle par XMLA) est inclus dans les rôles Admin, Member et Contributor, et peut aussi être ajouté à un utilisateur depuis la page **Gérer les autorisations** du modèle.

```text
-- Warehouse or SQL analytics endpoint: one table, after sharing with Read only
GRANT SELECT ON OBJECT::dbo.FactSales TO [ana@contoso.com];
DENY SELECT ON OBJECT::dbo.Payroll TO [ana@contoso.com];
```

> **Piège d'examen.** Read sur un lakehouse ou un entrepôt partagé n'est pas un accès en lecture aux données. Sans ReadData, ReadAll ou une autorisation T-SQL, le destinataire ouvre l'élément et ne voit aucune ligne.

<!-- section: data-level-security | objectives: 1.1.3 -->
## La sécurité au niveau des lignes, des colonnes, de l'objet et du fichier

Chaque fonctionnalité de sécurité est définie dans un moteur et appliquée uniquement aux requêtes qui passent par ce moteur. Vérifiez toujours tous les chemins par lesquels un utilisateur peut atteindre les données.

| Besoin | Fonctionnalité | Définie dans | S'applique à |
| --- | --- | --- | --- |
| Restreindre les lignes des requêtes T-SQL | Sécurité au niveau des lignes : fonction de prédicat et stratégie de sécurité | Entrepôt ou point de terminaison d'analytique SQL (T-SQL) | Toutes les requêtes SQL, y compris celles de l'Admin de l'espace de travail |
| Masquer des colonnes aux requêtes T-SQL | Sécurité au niveau des colonnes : `GRANT SELECT` sur une liste de colonnes | Entrepôt ou point de terminaison d'analytique SQL (T-SQL) | Les requêtes SQL |
| Restreindre les lignes des rapports | RLS du modèle sémantique : rôles avec filtres DAX | Power BI Desktop (Gérer les rôles), vue TMDL, Tabular Editor | Les Viewers du modèle et de ses rapports |
| Masquer une table ou une colonne et ses métadonnées dans les rapports | Sécurité au niveau de l'objet (OLS) | Vue TMDL ou Tabular Editor | Les Viewers du modèle |
| Restreindre des dossiers ou des tables d'un lakehouse pour tous les moteurs | Rôles d'accès aux données de la sécurité OneLake (avec RLS et CLS facultatives) | Le lakehouse (rôles de sécurité OneLake) | Spark, le point de terminaison d'analytique SQL en mode identité de l'utilisateur, les autres lecteurs OneLake |

La sécurité au niveau des lignes SQL utilise une fonction table inline comme **prédicat de filtre**, liée à la table par une stratégie de sécurité :

```text
CREATE FUNCTION Security.fn_region(@Region AS varchar(20))
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS allowed
    WHERE @Region = (SELECT Region FROM Security.UserRegion
                     WHERE UserName = USER_NAME());
GO
CREATE SECURITY POLICY Security.RegionFilter
ADD FILTER PREDICATE Security.fn_region(Region) ON dbo.FactSales
WITH (STATE = ON);
```

- Les lignes filtrées disparaissent silencieusement des `SELECT`, `UPDATE` et `DELETE`. Chaque table a besoin de son propre prédicat ; une même stratégie de sécurité peut contenir les prédicats de plusieurs tables.
- `SCHEMABINDING = ON` est la valeur par défaut ; pour modifier la fonction, supprimez la stratégie, modifiez la fonction, recréez la stratégie.

La sécurité au niveau des colonnes accorde `SELECT` sur les seules colonnes autorisées. Un `SELECT *` de cet utilisateur **échoue** alors avec une erreur d'autorisation au lieu de renvoyer les autres colonnes :

```text
GRANT SELECT ON dbo.Customers (CustomerID, FirstName, LastName, Email) TO [Sales];
```

> **Piège d'examen.** Quand un entrepôt ou un point de terminaison d'analytique SQL a de la RLS ou de la CLS, un modèle Direct Lake qui lit à travers lui **bascule en DirectQuery** pour appliquer les règles. Pour garder Direct Lake, sécurisez plutôt les données dans le modèle sémantique.

**RLS du modèle sémantique.** Créez les rôles dans Power BI Desktop (**Modélisation > Gérer les rôles**) avec une expression DAX par table ; les lignes pour lesquelles elle renvoie TRUE restent visibles. Attribuez les membres dans le service (**Plus d'options > Sécurité** du modèle sémantique), jamais dans Desktop. La RLS dynamique filtre une table de correspondance des utilisateurs et laisse la relation propager le filtre :

```text
-- Role filter on the UserAccess table
[UserEmail] = USERPRINCIPALNAME()
```

- Les rôles sont **cumulatifs** : un utilisateur dans deux rôles voit les deux ensembles de lignes. Un Viewer qui n'est dans aucun rôle ne voit aucune donnée.
- Les membres peuvent être des utilisateurs, des groupes de sécurité, des groupes de distribution et des groupes à extension messagerie, mais **pas des groupes Microsoft 365**, ni des principaux de service : la RLS ne s'applique pas à une application dont l'identité effective est un principal de service.
- Les Viewers qui ont **Build** restent filtrés, par exemple dans Analyser dans Excel.
- Testez avec **Tester en tant que rôle** sur la page Sécurité.

L'**OLS** fixe l'autorisation d'une table ou d'une colonne à **None** dans un rôle, dans la vue TMDL ou Tabular Editor. L'objet n'existe alors plus pour l'utilisateur : un visuel qui l'utilise affiche une erreur. La RLS ne peut pas masquer de colonnes ; l'OLS ne peut pas filtrer de lignes. La RLS et l'OLS ne peuvent pas être combinées depuis des rôles **différents** : un utilisateur membre d'une telle combinaison obtient une erreur au moment de la requête.

La **sécurité OneLake** (au niveau du fichier et de la table) crée des rôles d'accès aux données sur un lakehouse : chaque rôle accorde **Read** (ou **ReadWrite** sur les lakehouses) à des dossiers, tables ou schémas choisis, avec éventuellement des règles de lignes et de colonnes. Les Admins et Members de l'espace de travail créent et gèrent les rôles. L'accès est refusé par défaut et les rôles se combinent par union. Le rôle **DefaultReader** inclut automatiquement tout utilisateur qui a ReadAll : retirez-en l'utilisateur, ou supprimez-le, quand vous restreignez cet utilisateur avec un rôle personnalisé. Le point de terminaison d'analytique SQL n'applique la sécurité OneLake qu'après qu'un Admin ou un Member l'a fait passer du mode identité déléguée au mode d'accès **identité de l'utilisateur** (onglet Sécurité). Dans ce mode, l'accès aux tables, la RLS et la CLS viennent uniquement des rôles de sécurité OneLake : T-SQL ne peut pas définir de RLS ni de CLS, les `GRANT`/`REVOKE` sur les tables sont ignorés, et les autorisations SQL ne restent possibles que sur les vues, procédures stockées et fonctions. Le changement de mode supprime les rôles SQL existants du point de terminaison.

> **Piège d'examen.** Les Admins, Members et Contributors de l'espace de travail ne sont pas restreints par la RLS ou l'OLS du modèle sémantique ni par les rôles de sécurité OneLake. Pour les tester ou les appliquer à un utilisateur, donnez-lui le rôle Viewer ou seulement des autorisations d'élément.

<!-- section: sensitivity-labels | objectives: 1.1.4 -->
## Les étiquettes de confidentialité

Les étiquettes de confidentialité viennent de **Microsoft Purview Information Protection**. Un administrateur Fabric les active, et les étiquettes doivent être **publiées** pour les utilisateurs qui les appliquent.

- Appliquez une étiquette manuellement depuis l'indicateur de confidentialité de l'**en-tête de l'élément** ou dans **Paramètres > Confidentialité** de l'élément. Il faut une licence **Power BI Pro ou PPU** et l'**autorisation de modification** sur l'élément. Une étiquette grisée ne vous est pas disponible.
- Power BI Desktop peut aussi étiqueter un .pbix ; ouvrir un .pbix protégé exige Desktop de décembre 2020 ou ultérieur.

| Comportement | Ce qui se passe |
| --- | --- |
| Étiquette par défaut | Appliquée aux éléments nouveaux ou modifiés quand l'utilisateur n'en choisit pas (prise en charge complète pour les éléments Power BI, partielle pour les autres) |
| Étiquette obligatoire | Les éléments Power BI ne peuvent pas être enregistrés sans étiquette ; prise en charge partielle pour les autres éléments |
| Héritage des sources de données | Un modèle sémantique Power BI prend l'étiquette de la source étiquetée qu'il ingère |
| Héritage à la création | Un notebook, un pipeline ou un raccourci créé depuis un lakehouse étiqueté prend son étiquette |
| Héritage en aval | Les étiquettes descendent vers les éléments dépendants : Fabric vers Fabric, Fabric vers Power BI, Power BI vers Power BI, mais **pas Power BI vers Fabric** |
| Exportation | L'étiquette et la protection suivent les exportations vers Excel, PDF, PowerPoint et .pbix ; pas vers .csv ou .txt |

> **Piège d'examen.** Une étiquette ne masque pas les données dans Fabric aux utilisateurs qui y ont déjà accès, sauf si elle est associée à une **stratégie de protection** Microsoft Purview, qui contrôle alors l'accès à l'élément étiqueté dans le locataire. Sinon, elle classe l'élément et protège les fichiers exportés depuis lui. Pour restreindre qui voit des lignes ou des tables, utilisez les fonctionnalités de sécurité de la section précédente.

<!-- section: endorsement | objectives: 1.1.5 -->
## L'approbation

L'approbation signale les éléments fiables par un badge que la recherche et les listes mettent en avant. Appliquez-la dans **Paramètres > Approbation** de l'élément.

| Badge | Sens | Qui l'applique | Éléments éligibles |
| --- | --- | --- | --- |
| Promoted (promu) | Les créateurs estiment l'élément prêt à être partagé et réutilisé | Toute personne qui a l'autorisation d'**écriture** sur l'élément | Tous les éléments Fabric et Power BI sauf les tableaux de bord |
| Certified (certifié) | Un réviseur autorisé l'a vérifié selon les normes de l'organisation | Seuls les utilisateurs autorisés par un administrateur Fabric (délégable aux administrateurs de domaine), avec l'autorisation d'écriture | Tous les éléments sauf les tableaux de bord |
| Master data (données de référence) | L'élément est une source de vérité unique et centrale (clients, produits) | Seuls les utilisateurs autorisés par un administrateur Fabric, avec l'autorisation d'écriture | Les éléments qui contiennent des données, comme les lakehouses et les modèles sémantiques |

- La promotion ne demande aucune configuration d'administrateur ; la certification et les données de référence doivent être **activées par un administrateur Fabric**.
- Un utilisateur non autorisé voit **Certified** grisé et peut seulement **demander** la certification par le lien fourni par l'administrateur.
- Lors de la promotion ou de la certification d'un modèle sémantique, **Rendre détectable** permet aux utilisateurs qui n'y ont pas accès de le trouver.

> **Conseil d'examen.** « Signaler à toute l'organisation que le modèle est la source officielle et vérifiée » veut dire Certified. « Indiquer à mon équipe qu'il est prêt à être réutilisé, sans administrateur » veut dire Promoted.

<!-- section: key-points -->
## Points clés

- Rôle d'espace de travail = tous les éléments ; autorisation d'élément = un élément. Seul l'Admin supprime l'espace de travail et connecte Git ; le Member ajoute des personnes ; le Contributor construit ; le Viewer lit.
- Le partage n'accorde que Read ; les données demandent ReadData (SQL, mode délégué), ReadAll (Spark et OneLake) ou des autorisations T-SQL ; en mode identité de l'utilisateur, les rôles de sécurité OneLake décident de l'accès SQL aux tables. Build concerne les modèles sémantiques.
- La RLS et la CLS SQL protègent les requêtes SQL et font basculer Direct Lake en DirectQuery ; la RLS et l'OLS du modèle sémantique protègent les rapports ; la sécurité OneLake protège dossiers et tables pour tous les moteurs.
- La RLS, l'OLS et les rôles OneLake ne restreignent que les Viewers et les utilisateurs disposant d'autorisations d'élément.
- Les étiquettes classent et protègent les exportations, et ne contrôlent l'accès que par une stratégie de protection Purview ; l'héritage en aval ne va pas de Power BI vers Fabric.
- Promoted = tout rédacteur ; Certified et Master data = réviseurs autorisés par l'administrateur.
