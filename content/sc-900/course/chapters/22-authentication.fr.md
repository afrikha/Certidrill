Le mot de passe est la façon la plus faible de prouver une identité. Microsoft Entra ID propose des méthodes plus fortes, l'authentification multifacteur, et des outils qui écartent les mots de passe faibles et laissent les utilisateurs réinitialiser le leur. L'examen vous demande de classer les méthodes et de nommer la bonne fonctionnalité.

<!-- section: authentication-methods | objectives: 2.2.1 -->
## Les méthodes d'authentification

Une méthode peut servir d'authentification **principale** (la façon de se connecter), d'authentification **secondaire** (la preuve supplémentaire de l'authentification multifacteur, MFA), ou à vérifier un utilisateur lors d'une réinitialisation de mot de passe en libre-service (SSPR).

| Méthode | Connexion principale | MFA | SSPR |
| --- | --- | --- | --- |
| Mot de passe | Oui | Non | Non |
| Windows Hello Entreprise | Oui | Oui | Non |
| Clé d'accès (FIDO2) | Oui | Oui | Non |
| Microsoft Authenticator | Oui, connexion sans mot de passe | Oui, notification Push | Oui |
| Authentification basée sur un certificat | Oui | Oui | Non |
| Passe d'accès temporaire | Oui | Oui | Non |
| Code QR | Oui | Non | Non |
| SMS | Oui | Oui | Oui |
| Appel vocal | Non | Oui | Oui |
| Jetons OATH, logiciels ou matériels | Non | Oui | Oui |
| Code secret à usage unique par e-mail | Non | Non | Oui |

Les méthodes **sans mot de passe** remplacent le mot de passe par quelque chose que vous possédez, plus quelque chose que vous êtes ou savez :

| Méthode | Fonctionnement |
| --- | --- |
| **Windows Hello Entreprise** | Une clé liée à l'appareil, déverrouillée par un code PIN ou par la biométrie (empreinte, visage) |
| **Clé d'accès (FIDO2)** | Une paire de clés : la clé privée reste chez l'utilisateur, la clé publique est inscrite dans Microsoft Entra ID. Les clés d'accès **liées à l'appareil** résident sur un seul appareil (une clé de sécurité FIDO2, Microsoft Authenticator) ; les clés d'accès **synchronisées** suivent l'utilisateur par un fournisseur cloud de clés d'accès |
| **Microsoft Authenticator** | L'utilisateur fait correspondre dans l'application le numéro affiché sur l'écran de connexion, puis confirme par la biométrie ou un code PIN |
| **Authentification basée sur un certificat** | L'utilisateur s'authentifie avec un certificat X.509 directement auprès de Microsoft Entra ID |

Autres méthodes à reconnaître : un **passe d'accès temporaire** (Temporary Access Pass) est un code secret à durée limitée émis par un administrateur pour intégrer un utilisateur ou récupérer un compte, et pour inscrire des méthodes sans mot de passe. L'authentification par **code QR**, un code QR plus un code PIN, est conçue pour les employés de première ligne sur des appareils partagés. Les jetons **OATH** génèrent des codes à usage unique basés sur le temps, dans une application (logiciels) ou sur un petit appareil (matériels).

Les méthodes **résistantes au hameçonnage** lient l'information d'identification au site de connexion légitime : Windows Hello Entreprise, les clés d'accès (clés de sécurité FIDO2, clés d'accès dans Microsoft Authenticator, clés d'accès synchronisées), Platform Credential for macOS et l'authentification basée sur un certificat. Microsoft les recommande plutôt que des méthodes comme le SMS et l'appel vocal, exposées au hameçonnage.

> **Piège d'examen.** Un appel vocal et les codes OATH ne peuvent être qu'un second facteur ; ils ne peuvent pas être la connexion principale. Le SMS peut être les deux, mais Microsoft recommande de l'abandonner.

<!-- section: mfa | objectives: 2.2.2 -->
## L'authentification multifacteur

L'**authentification multifacteur** demande à l'utilisateur, pendant la connexion, une forme d'identification supplémentaire. Microsoft Entra MFA exige au moins deux éléments parmi : quelque chose que vous **savez** (mot de passe, code PIN), quelque chose que vous **possédez** (un appareil de confiance comme un téléphone ou une clé matérielle), quelque chose que vous **êtes** (empreinte digitale, reconnaissance du visage). Un mot de passe volé ne suffit alors plus.

Avec les notifications Push de Microsoft Authenticator, la **correspondance de numéro** demande à l'utilisateur de saisir dans l'application le numéro affiché sur l'écran de connexion, ce qui met en échec les attaques par « fatigue MFA », où un utilisateur approuve une demande qu'il n'a pas déclenchée.

Il y a deux façons d'activer la MFA :

| | Paramètres de sécurité par défaut | Accès conditionnel |
| --- | --- | --- |
| Ce que c'est | Un ensemble fixe de protections de base gérées par Microsoft | Des stratégies que vous concevez |
| Licence | Aucune : disponible pour tous les locataires, y compris Free | Microsoft Entra ID P1 ou P2 |
| Personnalisation | Aucune : activés ou désactivés pour tout le locataire | Par utilisateur, application, emplacement, appareil, risque |
| Adapté à | Les organisations qui veulent un socle sans effort | Les organisations aux exigences plus complexes |

Les paramètres de sécurité par défaut, activés par défaut sur les nouveaux locataires :

- exigent que tous les utilisateurs s'inscrivent à la MFA ;
- exigent des administrateurs la MFA à chaque connexion ;
- exigent des utilisateurs la MFA quand c'est nécessaire ;
- bloquent les protocoles d'authentification hérités ;
- protègent les activités privilégiées comme l'accès au portail Azure.

> **Piège d'examen.** Les paramètres de sécurité par défaut et les stratégies d'accès conditionnel ne s'utilisent pas ensemble : une organisation qui adopte l'accès conditionnel désactive les paramètres de sécurité par défaut.

<!-- section: password-protection | objectives: 2.2.3 -->
## Protection et gestion des mots de passe

La **protection par mot de passe Microsoft Entra** (Microsoft Entra Password Protection) détecte et bloque les mots de passe faibles connus et leurs variantes à chaque changement ou réinitialisation de mot de passe.

| Liste | Contenu | Détails |
| --- | --- | --- |
| **Liste globale de mots de passe interdits** | Les mots de passe faibles repérés par Microsoft dans sa télémétrie de sécurité | Appliquée automatiquement à tous les locataires ; non publiée, impossible à désactiver |
| **Liste personnalisée de mots de passe interdits** | Des termes propres à l'organisation : marque, produits, lieux | Jusqu'à 1 000 termes, combinés avec la liste globale ; demande Microsoft Entra ID P1 ou P2 |

La correspondance est approximative : le mot de passe est d'abord normalisé (minuscules, substitutions courantes comme `@` pour `a`), si bien que les variantes d'un terme interdit sont repérées aussi. Cela bloque les mots de passe courants utilisés dans les attaques par **pulvérisation de mots de passe**, qui essaient quelques mots de passe sur de nombreux comptes. La protection par mot de passe peut s'étendre à un environnement Active Directory Domain Services local grâce à des agents installés sur les contrôleurs de domaine.

Le **verrouillage intelligent** bloque les attaquants qui tentent de deviner un mot de passe tout en laissant travailler le véritable utilisateur. Il est toujours actif ; par défaut, le compte est verrouillé une minute après 10 tentatives infructueuses, et plus longtemps après de nouveaux échecs. Les connexions depuis des emplacements connus et inconnus sont comptées séparément.

La **réinitialisation de mot de passe en libre-service** (SSPR) laisse les utilisateurs gérer leur mot de passe sans le support technique :

| Scénario | Ce que fait l'utilisateur |
| --- | --- |
| Changement | Connaît son mot de passe et en veut un nouveau |
| Réinitialisation | A oublié son mot de passe |
| Déverrouillage | Est verrouillé et déverrouille son compte |

L'utilisateur doit être activé pour SSPR et avoir inscrit les méthodes d'authentification que l'administrateur autorise ; l'administrateur décide si une ou deux méthodes sont exigées. Dans un environnement hybride, la **réécriture du mot de passe** réécrit le nouveau mot de passe dans l'Active Directory local.

> **Conseil d'examen.** « Empêcher les utilisateurs de choisir le nom de l'entreprise comme mot de passe » : liste personnalisée de mots de passe interdits. « Réduire les appels au support pour des mots de passe oubliés » : SSPR. « Arrêter les tentatives par force brute » : verrouillage intelligent.

<!-- section: key-points -->
## Points clés

- Les méthodes principales vous connectent ; les méthodes secondaires complètent la MFA. Les appels vocaux et les codes OATH sont uniquement secondaires.
- Sans mot de passe : Windows Hello Entreprise, clés d'accès (FIDO2), Microsoft Authenticator, authentification basée sur un certificat.
- Résistantes au hameçonnage : Windows Hello Entreprise, clés d'accès, Platform Credential for macOS, authentification basée sur un certificat.
- MFA : au moins deux facteurs parmi savoir, posséder, être.
- Paramètres de sécurité par défaut : gratuits, tout ou rien, activés par défaut sur les nouveaux locataires. Accès conditionnel : P1, granulaire ; les deux ne se combinent pas.
- Liste globale de mots de passe interdits : automatique, impossible à désactiver. Liste personnalisée : 1 000 termes, P1.
- Verrouillage intelligent : 10 tentatives infructueuses, une minute par défaut. SSPR : changement, réinitialisation, déverrouillage ; réécriture du mot de passe pour l'hybride.
