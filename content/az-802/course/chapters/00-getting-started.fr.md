L'AZ-802 vérifie que vous savez administrer Windows Server là où il s'exécute : sur des hôtes physiques et Hyper-V, dans des machines virtuelles Azure, et en local par l'intermédiaire d'Azure Arc. Il couvre Active Directory Domain Services, la gestion hybride, les machines virtuelles, le réseau, le stockage et les services de fichiers, la sécurité et le dépannage. Ce cours suit le guide d'étude officiel, objectif par objectif ; chaque section indique les objectifs qu'elle prépare.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Examen | AZ-802 : Administering Windows Server. Il remplace l'AZ-800 et l'AZ-801, retirés le 30 septembre 2026 |
| Certification | Microsoft Certified: Windows Server Administrator Associate (niveau intermédiaire) |
| Durée | 120 minutes, la durée que Microsoft accorde aux examens associate qui peuvent contenir des composants interactifs |
| Questions | Nombre non publié ; environ 45 à 58 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Langue | Anglais. Si l'examen n'existe pas dans votre langue, vous pouvez demander 30 minutes supplémentaires |
| Documentation | Microsoft Learn est consultable pendant l'examen, sans temps supplémentaire |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les sept domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Déployer et gérer AD DS | 20 à 25 % |
| Gérer les instances et les charges de travail Windows Server dans un environnement hybride | 10 à 15 % |
| Gérer les machines virtuelles | 10 à 15 % |
| Implémenter et gérer une infrastructure réseau locale et hybride | 10 à 15 % |
| Gérer les services de stockage et de fichiers | 15 à 20 % |
| Sécuriser l'infrastructure de Windows Server | 10 à 15 % |
| Surveiller et résoudre les problèmes liés aux environnements Windows Server | 15 à 20 % |

AD DS est le domaine le plus lourd, et il revient dans la sécurité (utilisateurs protégés, délégation, stratégies de mot de passe) et dans le dépannage (réplication, récupération, Kerberos). Attendez-vous à ce qu'environ un tiers de l'examen touche à Active Directory.

Le score est étalonné : 700 ne signifie pas 70 % des questions. Les questions composées de plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer, étapes à ordonner) rapportent un point par élément correct.

Un examen est composé de sections :

- **Étude de cas.** Le scénario d'une entreprise, en onglets (forêts et sites, hôtes Hyper-V, serveurs de fichiers, un abonnement Azure, exigences), suivi de plusieurs questions de différents domaines. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Série Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous indiquez si la solution atteint l'objectif. Chaque réponse est définitive. Plusieurs solutions peuvent être bonnes, ou aucune.
- **Section principale.** Des questions indépendantes, que vous pouvez marquer et revoir jusqu'à la soumission : une réponse parmi quatre, « sélectionnez deux réponses », trois affirmations Oui/Non sur une illustration, listes déroulantes qui complètent une commande PowerShell, glisser-déposer (outil vers tâche, rôle vers étendue) et étapes à remettre dans l'ordre.

> **Conseil d'examen.** Microsoft Learn est disponible, mais le chronomètre continue de tourner. Servez-vous-en pour vérifier un fait précis (un paramètre d'applet de commande, la version de Windows Server qui a introduit une fonctionnalité), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

Les énoncés sont courts à moyens : deux à cinq phrases qui nomment les serveurs (DC1, Server1, VM1), les domaines et les sites, et le symptôme ou l'objectif exact. La question demande ensuite quoi faire, quoi utiliser ou quoi exécuter en premier.

Procédez en trois temps :

1. Situez tout : quelle forêt et quel domaine, quel site, en local ou dans Azure, quelle version de Windows Server.
2. Repérez la contrainte qui décide : « privilège minimum », « réduire l'effort d'administration », « sans redémarrer », « la première étape », « doit rester disponible si la liaison WAN tombe ».
3. Éliminez les réponses qui fonctionneraient dans un autre contexte (une autre étendue, une autre famille de produits, une autre version).

| Mots de l'énoncé | Pensez à |
| --- | --- |
| « succursale », « la sécurité physique ne peut pas être garantie » | Contrôleur de domaine en lecture seule (RODC), avec une stratégie de réplication de mot de passe |
| « le contrôleur de domaine qui détient le rôle est en panne et ne reviendra pas » | Prendre (seize) le rôle, puis nettoyer les métadonnées ; ne jamais remettre l'ancien détenteur en service |
| « les utilisateurs ne peuvent pas créer d'objets », « pool RID » | Disponibilité du maître RID |
| « l'heure est fausse dans toute la forêt » | Émulateur PDC du domaine racine de la forêt |
| « les utilisateurs de l'autre forêt ne doivent accéder qu'à Server1 » | Approbation de forêt avec authentification sélective |
| « le service s'exécute sur plusieurs serveurs », « pas de gestion de mot de passe » | Compte de service administré de groupe (gMSA) |
| « des règles de mot de passe différentes pour un groupe d'utilisateurs » | Stratégie de mot de passe affinée, pas un GPO sur une UO |
| « privilège minimum », « déléguer » | Le groupe intégré le plus restreint ou une autorisation déléguée sur une UO, jamais Domain Admins |
| « réduire l'effort d'administration » | La fonctionnalité intégrée ou managée (gMSA, Azure Update Manager, Windows Admin Center) plutôt que des scripts |
| « d'abord », « avant de » | Un ordre d'opérations : les prérequis (clé racine KDS, niveau fonctionnel, adprep) passent avant l'action |

Les commandes se lisent le plus souvent, et se complètent parfois avec une liste déroulante. Retenez les noms des applets de commande et leurs paramètres clés (`Move-ADDirectoryServerOperationMasterRole -Force`, `New-ADServiceAccount -PrincipalsAllowedToRetrieveManagedPassword`, `Install-ADDSDomainController -ReadOnlyReplica`) et les outils classiques : `repadmin`, `dcdiag`, `ntdsutil`, `netdom`, `w32tm`, `nltest`, `manage-bde`.

<!-- section: core-rules -->
## Les règles qui décident de nombreuses réponses

Ces règles reviennent dans tous les domaines. Chacune est détaillée dans son chapitre.

1. **L'étendue d'abord.** Le maître de schéma et le maître d'attribution de noms de domaine existent une fois par forêt ; l'émulateur PDC, le maître RID et le maître d'infrastructure une fois par domaine. Enterprise Admins agit sur la forêt, Domain Admins sur un domaine.
2. **Transférez quand le détenteur est en ligne, prenez le rôle seulement quand il a définitivement disparu.** Un ancien détenteur dont le rôle a été pris ne doit jamais revenir sur le réseau tel quel.
3. **Une approbation est un sens d'authentification.** Le domaine qui approuve détient les ressources ; le domaine approuvé détient les comptes. L'accès va dans le sens inverse de l'approbation.
4. **Les sites suivent les sous-réseaux.** Le site d'un ordinateur est déterminé par son adresse IP et les objets sous-réseau ; les liens de sites, leur coût et leur planification règlent la réplication entre sites.
5. **Les étendues de groupe s'imbriquent dans un seul sens** : les comptes vont dans des groupes globaux, les groupes globaux dans des groupes universels ou de domaine local, et les autorisations sont accordées aux groupes de domaine local.
6. **Le privilège minimum et l'étendue la plus étroite l'emportent** sur un rôle large qui fonctionnerait aussi.
7. **La version compte.** Windows Server 2025 a introduit des fonctionnalités absentes des versions antérieures (par exemple le compte de service administré délégué) ; quand un énoncé cite des versions, vérifiez-les par rapport à la fonctionnalité.

> **Piège d'examen.** Une réponse est rarement fausse en soi : elle est fausse pour l'étendue (forêt ou domaine), l'emplacement (local, machine virtuelle Azure, Azure Arc) ou la version. Avant de répondre, nommez les trois.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| RODC | Contrôleur de domaine accessible en écriture | Un RODC détient une copie en lecture seule de l'annuaire, ne réplique qu'en entrée et ne met en cache que les mots de passe que sa stratégie autorise |
| Transférer un rôle FSMO | Prendre (seize) un rôle FSMO | Un transfert se synchronise d'abord avec le détenteur actuel ; une prise de rôle s'en passe, quand le détenteur a disparu |
| gMSA | Compte de service administré autonome (sMSA) | Un gMSA peut être utilisé par plusieurs serveurs ; un sMSA par un seul ordinateur |
| gMSA | Compte de service administré délégué (dMSA) | Un dMSA (Windows Server 2025) remplace un compte de service existant et lie son utilisation à des identités de machine |
| Approbation de forêt | Approbation externe | Une approbation de forêt relie deux domaines racines de forêt et est transitive ; une approbation externe relie deux domaines et ne l'est pas |
| Stratégie de mot de passe affinée | Default Domain Policy | La stratégie du domaine s'applique à tous les comptes du domaine ; une stratégie affinée à des utilisateurs ou des groupes choisis |
| Restauration en mode DSRM | Corbeille Active Directory | La Corbeille restaure en ligne des objets supprimés avec leurs attributs ; le mode DSRM restaure la base de données depuis une sauvegarde |
| JEA | CredSSP ou délégation Kerberos | JEA limite ce qu'une session à distance peut faire ; CredSSP et la délégation résolvent le second saut des informations d'identification |
| Espaces de noms DFS | Réplication DFS | Les espaces de noms donnent un chemin unique vers des dossiers partagés ; la réplication garde le contenu des dossiers identique sur plusieurs serveurs |
| Azure File Sync | Réplica de stockage | File Sync met en cache un partage de fichiers Azure sur des serveurs de fichiers Windows ; le réplica de stockage réplique des volumes bloc par bloc entre serveurs |
| Espaces de stockage | Espaces de stockage direct | Les espaces de stockage regroupent les disques d'un serveur ; les espaces de stockage direct regroupent les disques locaux des nœuds d'un cluster de basculement |
| Point de contrôle standard | Point de contrôle de production | Un point de contrôle de production utilise la technologie de sauvegarde dans l'invité et est pris en charge pour les charges de production ; un point de contrôle standard capture aussi l'état de la mémoire |

<!-- section: study-plan -->
## Un plan d'étude qui fonctionne

1. Lisez les chapitres dans l'ordre : AD DS vient en premier, car la sécurité, la stratégie de groupe et le dépannage en dépendent.
2. Montez un labo : deux machines virtuelles Windows Server 2025 sur Hyper-V (ou dans Azure), une forêt avec deux contrôleurs de domaine, un deuxième site, puis un RODC et une deuxième forêt avec une approbation. Un abonnement Azure ajoute Azure Arc, Azure Update Manager et Azure File Sync.
3. Faites chaque tâche deux fois, une fois dans la console et une fois en PowerShell, et lisez la sortie de `repadmin /replsummary`, `dcdiag` et `netdom query fsmo` jusqu'à pouvoir la prévoir.
4. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
5. Réservez le vrai examen quand trois examens blancs d'affilée atteignent 800 ou plus, sur des questions que vous n'avez jamais vues.
