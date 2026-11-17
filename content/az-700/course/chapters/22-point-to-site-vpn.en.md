A point-to-site (P2S) VPN connects individual devices to a virtual network through a VPN gateway, without any VPN device on the user side. The exam asks you to pick the gateway SKU, the tunnel type and the authentication method that fit a list of client operating systems and constraints, then to fix a client that no longer connects.

<!-- section: gateway-sku | objectives: 2.2.1 -->
## Choosing the gateway SKU for point-to-site

P2S needs a virtual network gateway of type **Vpn** with a **route-based** VPN type, deployed in the subnet named `GatewaySubnet`. A policy-based gateway can't host P2S connections. The SKU sets the number of concurrent connections:

| SKU | SSTP connections | IKEv2/OpenVPN connections | Aggregate throughput | Notes |
| --- | --- | --- | --- | --- |
| Basic | 128 | IKEv2 only, OpenVPN not supported | 100 Mbps | No RADIUS, no IPv6, no BGP, not zone-redundant; created with PowerShell or Azure CLI only; dev-test |
| VpnGw1AZ | 128 | 250 | 650 Mbps | Generation1 |
| VpnGw2AZ | 128 | 500 | 1 Gbps (Generation1), 1.25 Gbps (Generation2) | |
| VpnGw3AZ | 128 | 1,000 | 1.25 Gbps (Generation1), 2.5 Gbps (Generation2) | |
| VpnGw4AZ | 128 | 5,000 | 5 Gbps | Generation2 only |
| VpnGw5AZ | 128 | 10,000 | 10 Gbps | Generation2 only |

Rules that decide the answer:

- The SSTP and IKEv2/OpenVPN limits are **separate**: a VpnGw1AZ gateway accepts 128 SSTP connections and 250 IKEv2 connections at the same time.
- SSTP is capped at 128 connections **whatever the SKU**. More than 128 users means IKEv2 or OpenVPN.
- The zone-redundant SKUs (`VpnGw1AZ` to `VpnGw5AZ`) are the ones to deploy today, with a Standard SKU public IP address. The non-AZ SKUs `VpnGw1` to `VpnGw5` have the same P2S limits but are being migrated and shouldn't be used for new gateways.
- Microsoft Entra ID authentication, RADIUS authentication and OpenVPN all rule out the Basic SKU.
- An **active-active** gateway needs an additional (third) public IP address for P2S.

> **Exam trap.** Raising the SKU never raises the SSTP limit. "600 Windows users over SSTP" has no SKU answer: change the tunnel type to IKEv2 or OpenVPN and pick VpnGw3AZ.

<!-- section: tunnel-types | objectives: 2.2.2 -->
## Selecting and configuring the tunnel type

The tunnel type is set on the gateway's **Point-to-site configuration** page, with the **address pool** from which clients receive their IP address.

| Tunnel type | Transport | Clients | Choose it when |
| --- | --- | --- | --- |
| OpenVPN | TLS, TCP 443 outbound | Windows, macOS, Linux, iOS, Android | Mixed devices, firewalls that only allow HTTPS, Microsoft Entra ID authentication |
| SSTP | TLS, TCP 443 outbound | Windows only | Legacy Windows clients behind restrictive firewalls |
| IKEv2 | IPsec, UDP 500 and 4500 outbound | Windows, macOS, Linux (strongSwan), iOS | Standards-based native clients, Always On VPN |

Points to know:

- IKEv2 may be blocked by firewalls and proxies that only open TCP 443; OpenVPN and SSTP pass.
- The portal offers the combinations **IKEv2 and OpenVPN (SSL)** and **IKEv2 and SSTP (SSL)**. SSTP and OpenVPN can't be enabled together because both are TLS-based.
- With IKEv2 and SSTP, Windows clients try IKEv2 first and fall back to SSTP.
- IPv6 for P2S works with IKEv2 and OpenVPN, not with SSTP.
- **SSTP is being retired**: enabling SSTP on a gateway is blocked since August 31, 2026, and existing SSTP connections stop working after March 31, 2027. The replacement is IKEv2 or OpenVPN.

Address pool rules: a private range that overlaps neither the virtual network nor the on-premises networks; at least a /29 for an active-passive gateway and a /28 for an active-active gateway. When SSTP is one of several protocols, the pool is split equally between the protocols.

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName "RG1" -Name "VNet1GW"
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" -VpnClientProtocol "OpenVPN"
```

> **Exam tip.** "Android devices", "only TCP 443 is allowed outbound" or "Microsoft Entra ID" point to OpenVPN. "macOS native client" or "device tunnel" point to IKEv2.

<!-- section: authentication-methods | objectives: 2.2.3 -->
## Selecting the authentication method

| Method | Who authenticates the user | Tunnel types | Typical requirement |
| --- | --- | --- | --- |
| Azure certificate | The gateway, against the uploaded trusted root certificates | OpenVPN, SSTP, IKEv2 | No identity infrastructure; device-based access; Always On VPN |
| Microsoft Entra ID | Microsoft Entra ID, through the Azure VPN Client | OpenVPN only | Entra credentials, Conditional Access, multifactor authentication |
| RADIUS | A RADIUS server, usually integrated with Active Directory Domain Services | OpenVPN, SSTP, IKEv2 | Domain credentials, an existing RADIUS or third-party MFA system |

**Certificate authentication.** Upload the public key of the root certificate (Base-64 encoded X.509 `.cer`, pasted as one continuous line) on the Point-to-site configuration page; up to 20 trusted root certificates. Each client holds a client certificate generated from that root, with its private key, in `Current User\Personal`. To block one device, add the **thumbprint** of its client certificate to the revoked certificates list. Removing a root certificate blocks every client certificate it signed.

Several authentication types can be selected on one gateway. A client then needs one authentication type that is supported by one of the configured tunnel types: with "IKEv2 and OpenVPN" and "Microsoft Entra ID and RADIUS", Entra ID clients use OpenVPN only.

> **Exam trap.** Revoking a client certificate uses its thumbprint on the gateway; it doesn't require touching the root certificate. Deleting the root certificate disconnects all the clients issued from it.

<!-- section: radius | objectives: 2.2.4 -->
## Configuring RADIUS authentication

With RADIUS, the gateway forwards authentication messages between the client and a RADIUS server, for example Network Policy Server (NPS) joined to the Active Directory domain. Users sign in with their domain credentials, and the RADIUS server can call an external identity system to add multifactor authentication.

Requirements:

- Any gateway SKU except Basic.
- The gateway must reach the RADIUS server. The server is either in the virtual network or on-premises behind a **site-to-site VPN** connection. An ExpressRoute connection can't be used to reach an on-premises RADIUS server.
- The gateway is given the server IP address and the **shared secret**, which must match the secret declared on the RADIUS server, where the gateway is registered as a RADIUS client.
- Two RADIUS servers can be configured for high availability, each with a score.
- With IKEv2, only EAP-based authentication is supported.

```powershell
$gw = Get-AzVirtualNetworkGateway -ResourceGroupName "RG1" -Name "VNet1GW"
$secret = Read-Host -AsSecureString -Prompt "RadiusSecret"
Set-AzVirtualNetworkGateway -VirtualNetworkGateway $gw `
  -VpnClientAddressPool "172.16.201.0/24" -VpnClientProtocol "IKEv2" `
  -RadiusServerAddress "10.51.0.15" -RadiusServerSecret $secret
```

Prefer the IP address of an on-premises server over its name: the gateway may be unable to resolve the name.

> **Exam trap.** "The RADIUS server is on-premises and the site is connected by ExpressRoute only": RADIUS authentication fails. Add a site-to-site VPN connection or place a RADIUS server in the virtual network.

<!-- section: entra-id | objectives: 2.2.5 -->
## Configuring Microsoft Entra ID authentication

Microsoft Entra ID authentication requires the **OpenVPN (SSL)** tunnel type, a route-based gateway that isn't Basic, and the **Azure VPN Client** on the devices (supported on Windows 11 and macOS; the Linux client was retired on August 31, 2026). On the Point-to-site configuration page, choose the authentication type **Microsoft Entra ID** and fill in three values:

| Field | Value |
| --- | --- |
| Tenant | `https://login.microsoftonline.com/{TenantID}` |
| Audience | `c632b3df-fb67-4d84-bdcf-b95ad541b5c8`, the Microsoft-registered Azure VPN Client app ID, or a custom app ID |
| Issuer | `https://sts.windows.net/{TenantID}/` |

Details that break a deployment:

- The Issuer value must end with a **trailing slash**.
- A gateway supports **one** Audience value at a time.
- With the Microsoft-registered app ID, no admin consent step is needed. The older manually registered app ID (`41b23e61-6c1e-4545-b367-cd054e0ed4b4` in the Azure public cloud) required granting admin consent in the tenant, and it retires on March 31, 2028: migrate gateways and clients to the Microsoft-registered value.
- To restrict access to some users or apply Conditional Access to a specific gateway, register a custom app and use its ID as the audience.

Then select **Download VPN client**: the package contains the `AzureVPN` folder with `azurevpnconfig.xml`, which users import in the Azure VPN Client before signing in with their Entra credentials.

> **Exam trap.** Microsoft Entra ID authentication can't be combined with SSTP or with IKEv2 alone. If the gateway offers "IKEv2 and OpenVPN", Entra ID users still connect over OpenVPN.

<!-- section: client-configuration | objectives: 2.2.6 -->
## Implementing the VPN client configuration file

The **VPN client profile configuration package** is a zip file generated by the gateway (**Download VPN client** on the Point-to-site configuration page). It doesn't contain VPN software for OpenVPN: it contains the settings the client needs. Its content follows the tunnel and authentication types configured:

| Folder | Files | Used by |
| --- | --- | --- |
| `WindowsAmd64`, `WindowsX86` | `VpnClientSetupAmd64`, `VpnClientSetupX86` installer | Native Windows VPN client, IKEv2 and SSTP |
| `Generic` | `VpnSettings.xml`, `VpnServerRoot.cer` | macOS native client and Linux strongSwan, IKEv2 |
| `AzureVPN` | `azurevpnconfig.xml` or `azurevpnconfig_cert.xml` | Azure VPN Client, OpenVPN |
| `OpenVPN` | `vpnconfig.ovpn` | OpenVPN clients, certificate authentication |

Order of operations for certificate authentication: generate the root and client certificates, upload the root public key, configure the address pool and tunnel type, save, download the package, install the client certificate and the profile on each device.

The package is a snapshot of the gateway configuration. **Generate and redistribute it after any change** to the P2S configuration, such as the tunnel type or the authentication type. Windows clients also receive their routes from the profile: after a topology change such as a new virtual network peering, download the package again so that clients get the new routes.

> **Exam tip.** "Users can connect but can't reach the newly peered virtual network" has the answer "download and reinstall the VPN client configuration package".

<!-- section: troubleshooting | objectives: 2.2.7 -->
## Diagnosing client-side and authentication issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| "A certificate could not be found that can be used with this Extensible Authentication Protocol" (error 798) | The client certificate is missing from `Current User\Personal` | Install the client certificate with its private key |
| "The message received was unexpected or badly formatted" (0x80090326) | The root certificate public key isn't uploaded or is corrupted, or a user-defined route with a default route is applied to `GatewaySubnet` | Upload the root certificate again; remove the route |
| "A certificate chain processed but terminated in a root certificate which is not trusted" | Certificates missing from the trusted root stores | Reinstall the client and gateway root certificates |
| "File download error. Target URI is not specified" | Wrong gateway type | Use gateway type VPN with VPN type RouteBased |
| Error 812, connection prevented by a policy on the RAS/VPN server | RADIUS server misconfigured or unreachable from the gateway | Check the RADIUS settings and the route to the server |
| "The network connection between your computer and the VPN server could not be established" with IKEv2 | UDP 500 and 4500 blocked, or missing IKE fragmentation update on old Windows versions | Open the ports or use OpenVPN |
| Connected, but Azure resources unreachable after a peering was added | The client doesn't have the new routes | Download the client package again |
| "Your authentication with Microsoft Entra has expired" | Refresh token expired or revoked | Reconnect to trigger an interactive sign-in; check the Entra sign-in logs |

For Entra ID failures, verify the three gateway values first (tenant, audience, issuer with its trailing slash), then that the profile imported in the Azure VPN Client was generated after the last change.

<!-- section: always-on-and-network-adapter | objectives: 2.2.8, 2.2.9 -->
## Azure requirements for Always On VPN and Azure Network Adapter

**Always On VPN** is a Windows feature: the VPN connection is established automatically, without user action. Two tunnels exist and can run at the same time:

| | Device tunnel | User tunnel |
| --- | --- | --- |
| Connects | Before the user signs in | After the user signs in |
| Use | Pre-sign-in connectivity, device management | Access to organization resources |
| Client | Domain-joined device, Windows Enterprise or Education, 1809 or later | Windows 10 or later |
| Certificate | Computer certificate, in the Local Machine store | User certificate, in the Current User store |
| Profile | `DeviceTunnel` set to `true`, installed in the LOCAL SYSTEM context | `AlwaysOn` set to `true`, installed with PowerShell, Configuration Manager or Intune |

On the Azure side, both need the same thing: a route-based VPN gateway whose P2S configuration uses **IKEv2** and **certificate authentication**. The profile is a ProfileXML document pushed through the VPNv2 CSP; the server name comes from `VpnSettings.xml` in the `Generic` folder of the client package. Only one device tunnel can be configured per device, and it works only with the built-in Windows VPN client.

**Azure Network Adapter** is a Windows Admin Center feature that connects an on-premises Windows Server to a virtual network over a P2S VPN in one operation: it configures the gateway and the VPN client on the server. Requirements:

- An Azure subscription and an **existing virtual network**.
- Windows Admin Center registered with Azure, in its latest version.
- Internet access from the target server.
- If the virtual network has no gateway, Windows Admin Center creates the `GatewaySubnet` and the VPN gateway with the SKU you choose (up to about 25 minutes), with certificate authentication.
- A client address space that overlaps neither the virtual network nor the on-premises network.

It suits a few servers in a branch office that has neither a VPN device nor a public IP address; many servers or a whole site call for a site-to-site VPN.

> **Exam trap.** A device tunnel can't use Microsoft Entra ID or RADIUS authentication, or OpenVPN: computer certificate and IKEv2 only.

<!-- section: key-points -->
## Key points

- P2S requires a route-based VPN gateway; the SKU sets the connection limit (250, 500, 1,000, 5,000, 10,000 for VpnGw1AZ to VpnGw5AZ), and SSTP stays at 128.
- OpenVPN: TCP 443, every platform, the only tunnel for Microsoft Entra ID. IKEv2: UDP 500/4500, native clients. SSTP: Windows only, being retired.
- Basic SKU: no RADIUS, no OpenVPN, therefore no Entra ID authentication.
- RADIUS on-premises must be reached through a site-to-site VPN, never through ExpressRoute.
- Entra ID: tenant URL, audience `c632b3df-fb67-4d84-bdcf-b95ad541b5c8`, issuer with a trailing slash, Azure VPN Client.
- Any change to the P2S configuration or to the routed topology means generating and redistributing the client package.
- Always On VPN: IKEv2 and certificates; the device tunnel needs a domain-joined Enterprise or Education device.
- Azure Network Adapter: Windows Admin Center, an existing virtual network, a P2S VPN created for a single server.
