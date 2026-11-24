Passwords are the weakest way to prove an identity. Microsoft Entra ID offers stronger methods, multifactor authentication, and tools that keep weak passwords out and let users reset their own. The exam asks you to classify methods and to name the right capability.

<!-- section: authentication-methods | objectives: 2.2.1 -->
## Authentication methods

A method can serve as **primary** authentication (the way you sign in), as **secondary** authentication (the extra proof for multifactor authentication, MFA), or to verify a user during self-service password reset (SSPR).

| Method | Primary sign-in | MFA | SSPR |
| --- | --- | --- | --- |
| Password | Yes | No | No |
| Windows Hello for Business | Yes | Step-up only, if the user also has a passkey (FIDO2) registered | No |
| Passkey (FIDO2) | Yes | Yes | No |
| Microsoft Authenticator, passwordless sign-in | Yes | No | No |
| Microsoft Authenticator, push notifications | No | Yes | Yes |
| Platform Credential for macOS | Yes | Yes | No |
| Certificate-based authentication | Yes | Yes | No |
| Temporary Access Pass | Yes | Yes | No |
| QR code | Yes | No | No |
| SMS | Yes | Yes | Yes |
| Voice call | No | Yes | Yes |
| OATH tokens, software or hardware (hardware tokens in preview) | No | Yes | Yes |
| Email one-time passcode | No | No | Yes |

An email one-time passcode can also be configured for the sign-in of guest users.

**Passwordless** methods replace the password with something you have plus something you are or know:

| Method | How it works |
| --- | --- |
| **Windows Hello for Business** | A key tied to the device, unlocked by a PIN or by biometrics (fingerprint, face) |
| **Passkey (FIDO2)** | A key pair: the private key stays with the user, the public key is registered in Microsoft Entra ID. **Device-bound** passkeys live on one device (a FIDO2 security key, Microsoft Authenticator); **synced** passkeys follow the user through a cloud passkey provider |
| **Microsoft Authenticator** | The user matches the number shown on the sign-in screen in the app, then confirms with biometrics or a PIN |
| **Certificate-based authentication** | The user authenticates with an X.509 certificate directly against Microsoft Entra ID |

Other methods to recognize: a **Temporary Access Pass** is a time-limited passcode issued by an administrator to onboard a user or recover an account, and to register passwordless methods. **QR code** authentication, a QR code plus a PIN, is designed for frontline workers on shared devices. **OATH** tokens generate time-based one-time codes, in an app (software) or on a small device (hardware).

**Phishing-resistant** methods bind the credential to the legitimate sign-in site: Windows Hello for Business, passkeys (FIDO2 security keys, passkeys in Microsoft Authenticator, synced passkeys), Platform Credential for macOS and certificate-based authentication. Microsoft recommends them over methods such as SMS and voice calls, which are prone to phishing.

> **Exam trap.** A voice call and OATH codes can only be a second factor; they can't be the primary sign-in. SMS can be both, but Microsoft recommends moving away from it.

<!-- section: mfa | objectives: 2.2.2 -->
## Multifactor authentication

**Multifactor authentication** prompts the user during sign-in for an additional form of identification. Microsoft Entra MFA requires two or more of: something you **know** (password, PIN), something you **have** (a trusted device such as a phone or a hardware key), something you **are** (fingerprint, face scan). A stolen password is then not enough.

With Microsoft Authenticator push notifications, **number matching** asks the user to type in the app the number shown on the sign-in screen, which defeats "MFA fatigue" attacks where a user approves a prompt they didn't request.

There are two ways to turn MFA on:

| | Security defaults | Conditional Access |
| --- | --- | --- |
| What it is | A fixed set of basic protections managed by Microsoft | Policies you design |
| License | None: available to every tenant, including Free | Microsoft Entra ID P1 or P2 |
| Customization | None: on or off for the whole tenant | By user, application, location, device, risk |
| Suited to | Organizations that want a baseline without effort | Organizations with more complex requirements |

Security defaults, enabled by default on new tenants:

- require all users to register for MFA;
- require administrators to do MFA at every sign-in;
- require users to do MFA when necessary;
- block legacy authentication protocols;
- block device code flow;
- protect privileged activities such as access to the Azure portal.

Users register Microsoft Authenticator with notifications (or an app that generates OATH TOTP codes); the former 14-day grace period for registering no longer exists.

> **Exam trap.** Security defaults and Conditional Access policies aren't used together: an organization that adopts Conditional Access turns security defaults off.

<!-- section: password-protection | objectives: 2.2.3 -->
## Password protection and management

**Microsoft Entra Password Protection** detects and blocks known weak passwords and their variants each time a password is changed or reset.

| List | Content | Details |
| --- | --- | --- |
| **Global banned password list** | Weak passwords found by Microsoft in its security telemetry | Applied automatically to every tenant; not published, can't be disabled; free for cloud-only users, P1 or P2 for users synchronized from AD DS |
| **Custom banned password list** | Terms specific to the organization: brand, products, locations | Up to 1,000 terms, combined with the global list; requires Microsoft Entra ID P1 or P2 |

Matching is fuzzy: the password is normalized first (lowercase, common substitutions such as `@` for `a`), so variants of a banned term are caught too. This blocks the common passwords used in **password spray** attacks, which try a few passwords against many accounts. Password Protection can extend to an on-premises Active Directory Domain Services environment through agents installed on the domain controllers.

**Smart lockout** locks out attackers who try to guess a password while letting the real user keep working. It is always on; by default the account is locked for one minute after 10 failed attempts, and longer after further failures. Sign-ins from familiar and unfamiliar locations are counted separately.

**Self-service password reset** (SSPR) lets users handle their password without the help desk:

| Scenario | What the user does |
| --- | --- |
| Change | Knows the password and wants a new one |
| Reset | Forgot the password |
| Unlock | Is locked out and unlocks the account |

The user must be enabled for SSPR and have registered the authentication methods the administrator allows; the administrator decides whether one or two methods are required. Administrator accounts follow a separate, stricter policy that Microsoft sets and that can't be changed: in general two methods, never security questions. In a hybrid environment, **password writeback** writes the new password back to the on-premises Active Directory.

> **Exam tip.** "Prevent users from choosing the company name as a password": custom banned password list. "Reduce help desk calls for forgotten passwords": SSPR. "Stop brute-force guessing": smart lockout.

<!-- section: key-points -->
## Key points

- Primary methods sign you in; secondary methods complete MFA. Voice calls and OATH codes are secondary only.
- Passwordless: Windows Hello for Business, passkeys (FIDO2), Microsoft Authenticator, certificate-based authentication.
- Phishing-resistant: Windows Hello for Business, passkeys, Platform Credential for macOS, certificate-based authentication.
- MFA: at least two factors among know, have, are.
- Security defaults: free, all or nothing, on by default for new tenants. Conditional Access: P1, granular; the two aren't combined.
- Global banned password list: automatic, can't be disabled. Custom list: 1,000 terms, P1.
- Smart lockout: 10 failed attempts, one minute by default. SSPR: change, reset, unlock; password writeback for hybrid.
