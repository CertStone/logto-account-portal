# Configuration Guide

This guide explains three kinds of configuration files:

1. `.env` (application + Logto base settings)
2. `deploy/services.yaml` (service catalog for the Portal)
3. `deploy/features.yaml` (feature toggles for the Dashboard)

---

## 1. How to configure `.env` (Logto + app basics)

### 1) Required fields (missing values may cause startup/login failure)

- `LOGTO_ENDPOINT`
  - Your Logto tenant URL, for example: `https://your-tenant.logto.app`
- `LOGTO_APP_ID`
  - App ID of a **Traditional Web** app in Logto
- `LOGTO_APP_SECRET`
  - App Secret of the app above
- `LOGTO_COOKIE_SECRET`
  - Session cookie encryption secret; use a random string with at least 32 chars
- `BASE_URL_DEV`
  - Development URL, for example: `http://localhost:3000`
- `BASE_URL_PROD`
  - Public production URL, for example: `https://account.example.com`
- `LOGTO_M2M_CLIENT_ID`
  - Client ID of a Machine-to-Machine app in Logto
- `LOGTO_M2M_CLIENT_SECRET`
  - Client Secret of the M2M app above

### 2) Common optional field

- `SOCIAL_BINDING_CALLBACK_BASE_URL`
  - Forced override for social binding callback base URL.
  - Useful for reverse proxy / multi-domain scenarios. When set, social binding callback always uses this domain.

### 3) Node/runtime fields

- `NODE_ENV`: recommended `production` in production
- Port is usually controlled by container env vars (already set in compose)

---

## 2. How to configure `services.yaml` (Service Portal)

### 1) File structure

- `serviceCategories[]`: service categories
  - Fields: `id`, `name`, `description`
- `services[]`: service list
  - Fields: `id`, `name`, `description`, `icon`, `iconName`, `href`, `category`
  - Optional: `ping`, `isNew`, `isPopular`

### 2) Key validation rules

- `href` must be a valid URL
- `ping` (if provided) must be a valid URL
- Every `services[].category` must exist in `serviceCategories[].id`

### 3) Field suggestions

- `id`: keep stable and unique; avoid changing later
- `icon`: frontend static asset path, for example `/services/gitlab.svg`
- `ping`: optional health-check URL; falls back to `href` if omitted

---

## 3. How to configure `features.yaml` (Dashboard features)

### 1) Main switches

- `features.emailChange.enabled`
- `features.phoneChange.enabled`
- `features.usernameChange.enabled`
- `features.sessions.enabled`
- `features.accountDeletion.enabled`
- `features.mfa.*.enabled`
- `features.passkey.enabled`

### 2) Social connector config

Path: `features.socialIdentities.config.connectors[]`

Common fields per connector:

- `target`: provider key (for example `google` / `github` / `qq`)
- `connectorId`: connector ID from Logto
- `enabled`: whether this connector is enabled in UI
- `displayName` / `icon` / `description`: frontend display fields

> `connectorId` is a critical field and **must match** your Logto configuration.

### 2.1 Extensibility for more social providers

This project uses a **config-driven** social login model and is highly extensible:

- Backend does not hardcode platforms; it reads `features.socialIdentities.config.connectors[]`.
- As long as you create a connector in Logto and place the `connectorId` in config, you can integrate new providers.
- You are not limited to `google/github/qq`; you can also add `apple/discord/wechat`, etc.

Recommended process for adding a new provider:

1. Create the social connector in Logto and note its connectorId.
2. Add one connector entry in `deploy/features.yaml` (`target`, `connectorId`, `enabled`, display fields).
3. Configure redirect URI allowlists in both third-party provider and Logto.
4. Restart app to apply config: `docker compose restart app`.

> Note: frontend icon display is based on the `icon` field. Unknown icons fall back to a generic icon (functionality is unaffected).
> If you want brand-style icons for a provider, add mapping in `app/dashboard/connections/page.tsx` inside `resolveConnectorVisual`.

**Important (also mentioned below): in third-party callback allowlists, include not only Logto callback URLs but also this project callback URL `/dashboard/connections/social/callback?target=...`.**

### 3) Profile field config

Path: `profileFields.*`

Configurable keys: `enabled`, `label`, `description`, `placeholder`, `inputType`, `required`

---

## 4. Multi-platform configuration guide

### A. Logto Console

1. Create or confirm a **Traditional Web** app
   - Get `LOGTO_APP_ID` / `LOGTO_APP_SECRET`
2. Create or confirm a **Machine-to-Machine** app
   - Get `LOGTO_M2M_CLIENT_ID` / `LOGTO_M2M_CLIENT_SECRET`
3. In **Sign-in & Account**:
   - **Enable Account Center**: this must be enabled, otherwise some account APIs may not work correctly.
   - **Configure Identifiers**: in account experience/account center settings, grant editable permission for identifiers you want users to change (Email, Phone, Username, etc.).
4. Configure sign-in callback URLs
   - Must include at least: `{your-domain}/callback`
5. If social login is enabled: configure social connectors in Logto
   - Copy connectorId into `features.yaml` path `socialIdentities.config.connectors[].connectorId`

### B. Third-party providers (Google / GitHub / QQ, etc.)

1. Create an OAuth app in the provider console
2. Add both Logto callback URLs and this project callback URL (`/dashboard/connections/social/callback?target=...`) to redirect allowlists
3. Put provider clientId/clientSecret back into Logto connector settings
4. Enable connector in this project’s `features.yaml` (`enabled: true`) and use correct `connectorId`

### C. Callback base URL in this project

Social binding uses:

`{app-domain}/dashboard/connections/social/callback?target=...`

If gateway/proxy causes unstable domain detection, set explicitly:

- In `.env`: `SOCIAL_BINDING_CALLBACK_BASE_URL=https://your-domain`

---

## 5. Docker behavior (how config is applied)

At container startup, it will:

1. Read `/app/deploy/.env`
2. Validate `/app/deploy/features.yaml` + `/app/deploy/services.yaml`
3. Start the app

After config changes, run:

```bash
docker compose restart app
```

---

## 6. Quick troubleshooting checklist

### 1) Login failed

Check `.env` first:

- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `LOGTO_APP_SECRET`
- `BASE_URL_DEV/BASE_URL_PROD`

### 2) Social binding failed

Check these first:

- Whether connector `connectorId` in `features.yaml` matches Logto
- Whether third-party redirect URI allowlist is complete
- Whether `SOCIAL_BINDING_CALLBACK_BASE_URL` is correct

### 3) Portal not showing services or categories are wrong

Check `services.yaml`:

- Whether `services[].category` exists in `serviceCategories[].id`
- Whether `href` / `ping` are valid URLs

---

## 7. i18n (currently supports Chinese / English)

### 1) Current capability

- Supports `zh` and `en` UI languages.
- Language preference source order:
  1. Manual switch in settings (saved locally)
  2. Sync to account `locale` field (via `/api/account/profile/details`)
- Settings page currently provides two options: `简体中文`, `English`.

### 2) How language switching takes effect

- Switching language in **Preferences -> Language** updates local language state immediately.
- After refresh, navigation, portal, and status text are rendered in selected language.

### 3) Rules for adding new text

- Do not hardcode Chinese/English strings directly in pages.
- Add keys in language packs first:
  - `lib/i18n/zh.ts`
  - `lib/i18n/en.ts`
- Use `useTranslations()` in client components.

---

## 8. Icon sources and compatibility

### 1) Current icon source by page

- **Portal (`/portal`)**
  - Source: `services[].icon` in `deploy/services.yaml`
  - `services[].iconName` is used only as fallback icon.

- **Social Connections (`/dashboard/connections`)**
  - Source: `features.socialIdentities.config.connectors[].icon` in `deploy/features.yaml`
  - Built-in brand icons are preferred for `google/github/apple/discord/slack/linkedin/wechat/qq`; others go through generic icon resolver.

### 2) Supported icon formats

Supported syntaxes (for both Portal services and social connectors):

- Dashboard Icons (default)
  - `icon: sonarr`
  - `icon: sonarr.svg` / `icon: sonarr.png` / `icon: sonarr.webp`
- Material Design Icons
  - `icon: mdi:docker`
  - `icon: mdi-docker`
- Simple Icons
  - `icon: si:github`
  - `icon: si-github`
  - `icon: si-github-#181717` (with color)
- selfh.st icons
  - `icon: sh:proxmox`
  - `icon: sh-proxmox`
  - `icon: selfh-proxmox`
- Absolute URL
  - `icon: https://example.com/icon.svg`
- Local static resource
  - `icon: /icons/my-icon.png`

> If icon loading fails, UI falls back to default icon automatically.

### 3) Icon directory mounting (Docker)

If you use custom local icons (for example `icon: /icons/demo.svg`), place files in:

- Host path: `./deploy/icons/`
- Container path: `/app/public/icons/`

Compose mount in this project (uncomment when needed):

```yaml
- ./deploy/icons:/app/public/icons:ro
```

Example usage:

- Put file at `deploy/icons/demo.svg`
- Configure `icon: /icons/demo.svg`

### 4) What are Dashboard Icons / MDI / Simple Icons / selfh.st icons?

`Dashboard Icons` is an icon collection for self-hosted services. When you configure `icon: sonarr` or `icon: sonarr.svg`, it is resolved via this icon set.

`Material Design Icons` and `Simple Icons` are popular icon libraries with many general-purpose and brand icons. You can reference them directly via prefixes like `mdi:` or `si:`.

`selfh.st` provides icons for self-hosted services. Using `sh:` resolves icons from that source.

---

## 9. Portal text configuration (optional)

You can add `portalContent` at the top level of `deploy/services.yaml` to customize Portal text.

```yaml
portalContent:
  # true: use only these configured texts (no i18n default fallback)
  # false or omitted: fallback to built-in i18n defaults for missing fields
  noI18n: false

  # subtitle: Access all your work and life services in one place
  # footerTitle: About Service Portal
  # footerDescription: The portal gathers all services integrated with Logto identity authentication
  # footerContent: All services use unified authentication. Contact admin if you need a new service.
```
