Ce chapitre couvre les contrôles qui protègent les machines virtuelles et les serveurs, où qu'ils s'exécutent : chiffrement des disques, accès d'administration sans ports publics (Azure Bastion, accès juste-à-temps), extension des contrôles Azure aux environnements locaux et aux autres clouds avec Azure Arc, Defender for Servers et ses composants, le type de sécurité de la machine virtuelle et l'application des paramètres du système d'exploitation avec Azure Machine Configuration.

<!-- section: disk-encryption | objectives: 3.2.1 -->
## Chiffrement de disque

| Option | Ce qu'elle chiffre | Clés | Remarques |
| --- | --- | --- | --- |
| Chiffrement côté serveur (SSE) | Disques de système d'exploitation et de données au repos dans le stockage. Toujours actif | Gérées par la plateforme par défaut ; gérées par le client via un **jeu de chiffrement de disque** | Ne couvre ni le disque temporaire ni les caches. Defender for Cloud indique la machine virtuelle comme non saine pour la recommandation de chiffrement |
| Chiffrement sur l'hôte | Aussi le **disque temporaire**, les **caches** et le flux de données entre le calcul et le stockage | Jeu de chiffrement de disque pour les clés gérées par le client ; disque temporaire toujours avec des clés gérées par la plateforme | N'utilise pas le processeur de la machine virtuelle. Recommandé pour les nouvelles machines virtuelles |
| Azure Disk Encryption (ADE) | Disques de système d'exploitation et de données dans l'invité avec BitLocker (Windows) ou DM-Crypt (Linux) | Azure Key Vault, clé de chiffrement à clé (KEK) facultative | Utilise le processeur de la machine virtuelle. **Mise hors service le 15 septembre 2028** |
| Chiffrement de disque confidentiel | Disque de système d'exploitation, clés liées au TPM de la machine virtuelle | Gérées par la plateforme ou par le client | Tailles de machines virtuelles confidentielles uniquement |

> **Piège d'examen.** Après le 15 septembre 2028, les disques chiffrés avec ADE ne se déverrouillent plus après un redémarrage. ADE et le chiffrement sur l'hôte s'excluent mutuellement : une machine virtuelle qui a **déjà** eu ADE ne peut pas recevoir le chiffrement sur l'hôte, la migration passe donc par de nouveaux disques.

Le chiffrement sur l'hôte demande une inscription unique de la fonctionnalité par abonnement et une taille de machine virtuelle prise en charge ; une machine virtuelle existante doit être libérée puis réallouée pour être chiffrée.

```bash
az feature register --namespace Microsoft.Compute --name EncryptionAtHost

az vm create -g RG1 -n VM1 --image Ubuntu2204 --size Standard_D2s_v5 \
  --encryption-at-host \
  --os-disk-encryption-set "<disk encryption set ID>"
```

Clés gérées par le client pour SSE : créez un coffre de clés (ou un HSM managé) avec la **protection contre le vidage activée**, créez une clé, créez le jeu de chiffrement de disque, donnez à l'identité managée du jeu l'accès à la clé (wrap, unwrap, get), puis sélectionnez le jeu sur les disques.

<!-- section: bastion | objectives: 3.2.2 -->
## Azure Bastion

Azure Bastion fournit RDP et SSH vers les machines virtuelles via TLS, depuis le portail ou un client natif ; les machines virtuelles n'ont besoin d'**aucune adresse IP publique** ni d'aucun accès RDP/SSH entrant depuis Internet.

| Fonctionnalité | Developer | Basic | Standard | Premium |
| --- | --- | --- | --- | --- |
| Hôte dédié, `AzureBastionSubnet`, adresse IP publique | Non (partagé) | Oui | Oui | Oui (pas d'IP publique en déploiement privé uniquement) |
| Machines virtuelles dans des réseaux virtuels appairés | Non | Oui | Oui | Oui |
| Client natif (Azure CLI), transfert de fichiers, port personnalisé | Non | Non | Oui | Oui |
| Connexion par adresse IP, lien partageable | Non | Non | Oui | Oui |
| Mise à l'échelle de l'hôte (nombre d'instances) | Non | Non (2 instances) | Oui | Oui |
| Enregistrement de session, déploiement privé uniquement | Non | Non | Non | Oui |

Exigences des SKU dédiées : un sous-réseau nommé exactement `AzureBastionSubnet`, /26 ou plus grand, dans le même réseau virtuel, sans aucune autre ressource ; une adresse IP publique **Standard, statique** (sauf Premium en déploiement privé uniquement). Vous pouvez **mettre à niveau** une SKU (environ 10 minutes) mais pas la rétrograder : supprimez et recréez à la place.

| Exigence | Réponse |
| --- | --- |
| Se connecter avec la commande `az network bastion ssh` ou charger des fichiers | Standard |
| Enregistrer les sessions pour l'audit | Premium |
| Aucune adresse IP publique sur le bastion lui-même | Premium, déploiement privé uniquement |
| Joindre un serveur local par son adresse IP via le VPN | Standard (connexion par adresse IP) |

<!-- section: jit-access | objectives: 3.2.3 -->
## Accès juste-à-temps aux machines virtuelles

L'accès juste-à-temps (JIT) est une fonctionnalité de **Defender for Servers Plan 2**. Quand vous l'activez, Defender for Cloud ajoute des règles **refusant tout le trafic entrant** pour les ports sélectionnés dans le NSG (et dans le Pare-feu Azure, si la machine virtuelle est protégée par un pare-feu du même réseau virtuel). Quand un utilisateur autorisé demande l'accès, il ajoute une règle **d'autorisation** temporaire pour l'adresse IP du demandeur pendant la durée demandée, puis restaure l'état précédent.

| Paramètre | Valeur par défaut |
| --- | --- |
| Ports | 22 (Linux), 3389 (Windows) ; Defender for Cloud propose aussi 5985 et 5986 |
| Durée maximale de demande | 3 heures |
| Adresses IP sources autorisées | Any (à restreindre à « mon IP » ou à une plage) |

Activez-le depuis **Defender for Cloud** > **Protections de charge de travail** > **Accès juste-à-temps aux machines virtuelles** > onglet **Non configuré** > **Activer JIT sur les machines virtuelles**, depuis la page **Configuration** de la machine virtuelle ou avec `Set-AzJitNetworkAccessPolicy`. Les utilisateurs demandent l'accès depuis l'onglet **Configuré**, depuis la page **Se connecter** de la machine virtuelle ou avec `Start-AzJitNetworkAccessPolicy`.

Autorisations selon le moindre privilège :

| Tâche | Actions |
| --- | --- |
| Configurer une stratégie JIT | `Microsoft.Security/locations/jitNetworkAccessPolicies/write` et `Microsoft.Compute/virtualMachines/write` |
| Demander l'accès | `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus la lecture de la stratégie, de la machine virtuelle, de ses cartes réseau et de ses IP publiques |

> **Piège d'examen.** JIT ne prend pas en charge les machines virtuelles classiques, ni celles protégées par un Pare-feu Azure géré par **Azure Firewall Manager** (stratégie de pare-feu) ; il exige des règles de pare-feu classiques. Sans le Plan 2, la page JIT n'est pas disponible.

<!-- section: arc-defender-onboarding | objectives: 3.2.4, 3.2.5 -->
## Serveurs hybrides et multiclouds avec Azure Arc et Defender for Servers

Les **serveurs avec Azure Arc** projettent une machine non Azure comme ressource Azure grâce à l'**agent Connected Machine** (`azcmagent`). Une fois projetée, la machine reçoit les contrôles Azure : Azure Policy et Machine Configuration, RBAC, étiquettes, extensions et Defender for Servers. L'agent donne aussi à la machine une identité managée affectée par le système.

Options d'intégration :

| Scénario | Méthode |
| --- | --- |
| Un serveur | Script généré dans le portail (Azure Arc > Ajouter) |
| De nombreux serveurs | Script avec un **principal de service** qui détient **Azure Connected Machine Onboarding** |
| Aucun chemin par Internet public | Méthode de connectivité **Point de terminaison privé** avec une **étendue de liaison privée** Azure Arc |
| VM AWS EC2 ou GCP | Le connecteur multicloud de Defender for Cloud déploie Arc automatiquement |

```bash
azcmagent connect --service-principal-id "<app ID>" --service-principal-secret "<secret>" \
  --tenant-id "<tenant ID>" --subscription-id "<subscription ID>" \
  --resource-group RG-Arc --location westeurope
```

Activer Defender for Servers : **Paramètres d'environnement** > abonnement (ou compte AWS, projet GCP) > **Plans Defender** > **Serveurs** sur On. **Le Plan 2 est le choix par défaut** ; **Modifier les plans** permet de choisir le Plan 1. Un essai de 30 jours, qui ne peut pas être annulé, démarre.

| Fonctionnalité | Plan 1 | Plan 2 |
| --- | --- | --- |
| EDR de Defender for Endpoint, intégration automatique | Oui | Oui |
| Analyse des vulnérabilités avec agent, inventaire logiciel | Oui | Oui |
| Analyse sans agent des vulnérabilités, des logiciels malveillants et des secrets | Non | Oui |
| Fonctionnalités premium de Defender Vulnerability Management | Non | Oui |
| Accès JIT, surveillance de l'intégrité des fichiers, base de référence du système d'exploitation (MCSB) | Non | Oui |
| 500 Mo d'ingestion de données gratuite (Log Analytics) | Non | Oui |
| Activation au niveau de la ressource | Oui | Non (désactivation uniquement) |

L'étendue recommandée est l'abonnement. Les paramètres au niveau de la ressource (API REST, ou stratégies intégrées de la catégorie **Security Center – Granular Pricing** sélectionnées par étiquette) permettent d'activer le Plan 1 sur des machines étiquetées ou d'exclure des machines.

> **Piège d'examen.** Un serveur local intégré **directement** à Defender for Endpoint, sans Arc, n'obtient que les fonctionnalités du Plan 1. Les fonctionnalités du Plan 2 comme la surveillance de l'intégrité des fichiers et la base de référence du système d'exploitation exigent une intégration via **Azure Arc**.

<!-- section: servers-settings | objectives: 3.2.6 -->
## Paramètres de Defender for Servers : analyse des vulnérabilités et EDR

Les composants du plan se trouvent sous **Paramètres d'environnement** > abonnement > **Serveurs** > **Paramètres** (Paramètres et supervision) :

| Composant | Par défaut | Commentaire |
| --- | --- | --- |
| Évaluation des vulnérabilités des machines | On | Solution : Microsoft Defender Vulnerability Management (**Modifier la configuration**) |
| Protection des points de terminaison | On | Déploie Defender for Endpoint automatiquement |
| Analyse sans agent des machines | On avec le Plan 2 ou Defender CSPM | Voir la section suivante |
| Surveillance de l'intégrité des fichiers | Off | Plan 2 uniquement, à activer manuellement |

**EDR** : le paramètre **Protection des points de terminaison** intègre les machines prises en charge à Microsoft Defender for Endpoint avec l'extension `MDE.Windows` ou `MDE.Linux` (Windows Server 2012 R2 et 2016 utilisent la solution unifiée). Un appareil déjà intégré à un autre locataire Defender for Endpoint doit d'abord en être retiré.

**L'analyse des vulnérabilités** avec Defender Vulnerability Management fonctionne avec agent (via le capteur Defender for Endpoint, Plan 1 ou 2) et sans agent (Plan 2 ou Defender CSPM). Les résultats apparaissent comme recommandations dans Defender for Cloud et dans le portail Microsoft Defender.

> **Piège d'examen.** Désactiver **Protection des points de terminaison** ne désinstalle pas le capteur : supprimez l'extension `MDE.Windows`/`MDE.Linux` et retirez l'appareil de Defender for Endpoint.

<!-- section: agentless-scanning | objectives: 3.2.7 -->
## Analyse sans agent

L'analyse sans agent prend un **instantané des disques de système d'exploitation et de données**, l'analyse hors bande dans la même région, puis le supprime. Elle ne demande ni agent, ni connectivité réseau vers la machine virtuelle, ni ressources de la machine virtuelle. Elle trouve les vulnérabilités et l'inventaire logiciel (Defender Vulnerability Management), les **secrets** en texte clair, les **logiciels malveillants** (moteur de l'Antivirus Microsoft Defender) et un EDR absent ou mal configuré.

- Pour l'activer : **Paramètres d'environnement** > abonnement > **Defender CSPM** ou **Defender for Servers Plan 2** > **Paramètres** > **Analyse sans agent des machines** sur On. L'analyse des logiciels malveillants exige le Plan 2.
- Fonctionne pour les machines virtuelles Azure, AWS EC2 et les instances GCP. Les analyses ont lieu **toutes les 24 heures**, sans configuration possible ; une machine virtuelle arrêtée ou libérée n'est pas analysée pendant ce cycle.
- Azure attribue le rôle intégré **VM scanner operator** (lecture des disques, `beginGetAccess`). Pour les **disques chiffrés avec des clés gérées par le client**, accordez au scanner de Defender for Cloud les autorisations sur la clé du coffre (read, wrap, unwrap).
- Non analysées : les machines virtuelles avec un disque Ultra (`UltraSSD_LRS`) ou SSD Premium v2 attaché, plus de 14 disques, ou des systèmes de fichiers comme ReFS.

> **Piège d'examen.** Les serveurs locaux avec Arc n'ont pas de disque Azure à capturer : l'analyse sans agent couvre les machines Azure, AWS et GCP. Pour les serveurs locaux, l'analyse des vulnérabilités repose sur le capteur Defender for Endpoint.

<!-- section: vm-security-type | objectives: 3.2.8 -->
## Type de sécurité de la machine virtuelle : lancement fiable, démarrage sécurisé et vTPM

| Type de sécurité | Ce que vous obtenez |
| --- | --- |
| Standard | Ni démarrage sécurisé ni vTPM |
| Lancement fiable (Trusted launch) | **Démarrage sécurisé** (seuls les chargeurs de démarrage, noyaux et pilotes signés démarrent) et **vTPM** (TPM 2.0 pour les clés et le démarrage mesuré), surveillance de l'intégrité du démarrage facultative. Machines virtuelles de **génération 2** uniquement |
| Machine virtuelle confidentielle | Environnement d'exécution de confiance matériel, chiffrement de disque confidentiel ; tailles confidentielles |

- Le portail, Azure CLI et Azure PowerShell créent par défaut des machines virtuelles **à lancement fiable** ; cela ne coûte rien de plus. Non pris en charge sur certaines tailles (par exemple famille A, Dv2, Dv3, série M) ni avec les images managées (utilisez Azure Compute Gallery).
- Une machine virtuelle Gen1 peut être mise à niveau en Gen2 avec lancement fiable ; le lancement fiable peut être activé sur une machine virtuelle Gen2 existante.
- **Surveillance de l'intégrité** : avec le démarrage sécurisé et le vTPM actifs, installez l'extension **Guest Attestation** ; Defender for Cloud valide alors à distance l'intégrité du démarrage et déclenche *VM attestation failure* si la chaîne de démarrage s'écarte de la référence.

```json
"securityProfile": {
  "securityType": "TrustedLaunch",
  "uefiSettings": { "secureBootEnabled": true, "vTpmEnabled": true }
}
```

> **Piège d'examen.** La surveillance de l'intégrité demande les trois : démarrage sécurisé, vTPM **et** l'extension Guest Attestation. L'attestation échoue quand le démarrage sécurisé est désactivé.

<!-- section: machine-configuration | objectives: 3.2.9 -->
## Azure Machine Configuration

**Azure Machine Configuration** (anciennement Guest Configuration) étend Azure Policy dans le système d'exploitation invité : valeurs de registre, services, stratégie de sécurité locale, paramètres SSH, autorisations de fichiers. Elle fonctionne sur les machines virtuelles Azure et les serveurs avec Azure Arc ; les résultats apparaissent dans la conformité d'**Azure Policy**.

Prérequis sur chaque machine virtuelle Azure : l'**extension Machine Configuration** (`AzurePolicyforWindows` ou `AzurePolicyforLinux`) et une **identité managée affectée par le système**, avec un accès HTTPS 443 sortant ou un chemin privé. Les serveurs avec Arc ont déjà l'identité grâce à l'agent Connected Machine.

Ordre des opérations :

1. Attribuez l'initiative **Deploy prerequisites to enable Guest Configuration policies on virtual machines** (DeployIfNotExists), idéalement à l'étendue d'un groupe d'administration.
2. Créez une **tâche de correction** pour que les machines virtuelles existantes reçoivent l'extension et l'identité (les nouvelles les reçoivent automatiquement).
3. Attribuez les bases de référence en mode audit, par exemple **Windows machines should meet requirements of the Azure compute security baseline** (AuditIfNotExists).
4. Examinez la conformité, documentez les exceptions, puis appliquez les paramètres choisis avec des packages de configuration personnalisés.

| Mode d'attribution | Comportement |
| --- | --- |
| Audit | Rapport uniquement |
| Apply and Monitor | Applique une fois, puis signale la dérive |
| Apply and Autocorrect | Applique et corrige la dérive |

> **Piège d'examen.** Sans l'extension et l'identité affectée par le système, une attribution de base de référence ne peut pas évaluer l'invité. Attribuer l'initiative de prérequis ne suffit pas pour les machines virtuelles **existantes** : elles ont besoin d'une tâche de correction.

<!-- section: key-points -->
## Points clés

- Disque temporaire et caches chiffrés = chiffrement sur l'hôte ; ADE est mis hors service le 15 septembre 2028 et bloque le chiffrement sur l'hôte.
- Bastion : Standard pour le client natif, la connexion par adresse IP et le lien partageable ; Premium pour l'enregistrement de session et le déploiement privé uniquement.
- JIT = Defender for Servers Plan 2 ; règle de refus dans le NSG, règle d'autorisation temporaire sur demande, 3 heures maximum par défaut.
- Serveurs non Azure : d'abord Azure Arc, puis Defender for Servers ; le Plan 2 est le choix par défaut, le Plan 1 est le seul plan activable par ressource.
- Analyse sans agent = instantanés de disques toutes les 24 heures (Plan 2 ou Defender CSPM) ; l'analyse des logiciels malveillants exige le Plan 2.
- Surveillance de l'intégrité = démarrage sécurisé + vTPM + extension Guest Attestation.
- Machine Configuration = extension + identité affectée par le système + tâche de correction, puis attributions de bases de référence.
