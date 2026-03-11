# 配置指南（部署必读）

本指南专门说明三类配置：

1. `.env`（应用与 Logto 基础配置）
2. `deploy/services.yaml`（服务门户的服务目录）
3. `deploy/features.yaml`（账户中心功能开关）

---

## 一、.env 怎么配（Logto + 应用基础）

先复制模板：

```bash
cp .env.example .env
```

### 1) 必填项（不填会启动失败或无法登录）

- `LOGTO_ENDPOINT`
  - 你的 Logto 租户地址，例如：`https://your-tenant.logto.app`
- `LOGTO_APP_ID`
  - Logto 中 **Traditional Web** 应用的 App ID
- `LOGTO_APP_SECRET`
  - 上述应用的 App Secret
- `LOGTO_COOKIE_SECRET`
  - 会话 cookie 加密密钥，建议 32 位以上随机字符串
- `BASE_URL_DEV`
  - 开发环境访问地址，例如：`http://localhost:3000`
- `BASE_URL_PROD`
  - 生产环境对外访问地址，例如：`https://account.example.com`
- `LOGTO_M2M_CLIENT_ID`
  - Logto 中 Machine-to-Machine 应用的 Client ID
- `LOGTO_M2M_CLIENT_SECRET`
  - 上述 M2M 应用的 Client Secret

### 2) 常用可选项

- `SOCIAL_BINDING_CALLBACK_BASE_URL`
  - 社交绑定回调域名强制覆盖项。
  - 适用于反向代理/多域名场景，设置后社交绑定回调会固定到该域名。

### 3) Node / 运行相关

- `NODE_ENV`：建议生产为 `production`
- 端口通常由容器环境变量控制（compose 中已设置）

---

## 二、services.yaml 怎么配（服务门户）

先复制模板：

```bash
cp deploy/services.yaml.example deploy/services.yaml
```

### 1) 文件结构

- `serviceCategories[]`：服务分类
  - 字段：`id`, `name`, `iconName`, `description`
- `services[]`：服务列表
  - 字段：`id`, `name`, `description`, `icon`, `iconName`, `href`, `category`
  - 可选：`ping`, `isNew`, `isPopular`

### 2) 关键校验规则

- `href` 必须是合法 URL
- `ping`（如果填写）必须是合法 URL
- 每个 `services[].category` 必须在 `serviceCategories[].id` 中存在

### 3) 字段建议

- `id`：稳定且唯一，后续尽量不要改
- `icon`：前端静态资源路径，例如 `/services/gitlab.svg`
- `ping`：如果需要状态探测可填写；不填则默认使用 `href`

---

## 三、features.yaml 怎么配（账户中心功能）

先复制模板：

```bash
cp deploy/features.yaml.example deploy/features.yaml
```

### 1) 主要开关

- `features.emailChange.enabled`
- `features.phoneChange.enabled`
- `features.usernameChange.enabled`
- `features.sessions.enabled`
- `features.accountDeletion.enabled`
- `features.mfa.*.enabled`
- `features.passkey.enabled`

### 2) 社交连接器配置

路径：`features.socialIdentities.config.connectors[]`

每个 connector 常用字段：

- `target`：平台标识（例如 `google` / `github` / `qq`）
- `connectorId`：Logto 里该社交连接器的 ID
- `enabled`：是否在 UI 中启用
- `displayName` / `icon` / `description`：前端展示信息

> 这里的 `connectorId` 是**必须和 Logto 后台对应**的关键字段。

### 2.1 对“更多社交登录方式”的适配性说明

当前项目对社交登录是**配置驱动**的，扩展性较好：

- 后端不会把平台写死，读取 `features.socialIdentities.config.connectors[]` 生成可用连接器列表。
- 只要你在 Logto 中创建了该平台 connector，并把 `connectorId` 放进配置，就可以接入新平台。
- 因此并不限于示例中的 `google/github/qq`，也可以扩展到 `apple/discord/wechat` 等。

实际接入新平台时，建议按下面流程做：

1. 在 Logto 中新增对应 social connector，并记下 connectorId。
2. 在 `deploy/features.yaml` 里新增一条 connector（`target`、`connectorId`、`enabled`、展示字段）。
3. 在第三方平台与 Logto 配齐 redirect URI 白名单。
4. 重启应用使配置生效：`docker compose restart app`。

> 注意：前端图标是按 `icon` 字段做映射。未内置的图标会降级为通用图标（不影响功能）。
> 若你希望某个平台有品牌图标样式，可在 `app/dashboard/connections/page.tsx` 的 `resolveConnectorVisual` 中补一条映射。

**需要注意：在第三方平台回调地址白名单中，除了 Logto 的回调地址外，还应加上本项目回调地址 `/dashboard/connections/social/callback`。**

### 3) 资料字段配置

路径：`profileFields.*`

可配置：`enabled`, `label`, `description`, `placeholder`, `inputType`, `required`

---

## 四、多平台配置指引

这一部分对应你提到的“平台多、容易绕”的问题，按顺序配基本不会错。

### A. Logto 控制台

1. 创建或确认 **Traditional Web** 应用
   - 取 `LOGTO_APP_ID` / `LOGTO_APP_SECRET`
2. 创建或确认 **Machine-to-Machine** 应用
   - 取 `LOGTO_M2M_CLIENT_ID` / `LOGTO_M2M_CLIENT_SECRET`
3. 在 **「登录与账户 (Sign-in & Account)」** 中：
   - **开启账户中心 (Account Center)**：确保此开关已打开，否则某些账户 API 可能无法正常工作。
   - **配置身份标识 (Identifiers)**：在“账户体验”或“账户中心”设置中，给予你希望允许用户修改的身份标识（如 Email, Phone, Username）**可编辑 (Editable)** 的权限。
4. 配置回调地址（Sign-in callback）
   - 至少包含：`{你的域名}/callback`
5. 如果启用社交连接：在 Logto 配置对应 social connector
   - 获取 connectorId，填到 `features.yaml` 的 `socialIdentities.config.connectors[].connectorId`

### B. 第三方身份提供商（Google / GitHub / QQ 等）

1. 在对应平台创建 OAuth 应用
2. 把 Logto 提供的回调地址（redirect URI）**和本项目的回调地址（`/dashboard/connections/social/callback`）**加入白名单
3. 平台拿到的 clientId/clientSecret 填回 Logto connector 配置页
4. 在本项目的 `features.yaml` 里启用对应 connector（`enabled: true`）并填对 `connectorId`

### C. 本项目回调域名

社交绑定流程会使用：

`{应用域名}/dashboard/connections/social/callback?target=...`

若你的网关/代理导致域名识别不稳定，建议显式设置：

- `.env` 中设置 `SOCIAL_BINDING_CALLBACK_BASE_URL=https://你的域名`

---

## 五、Docker 使用说明（配置生效机制）

容器启动时会：

1. 读取 `/app/deploy/.env`
2. 校验 `/app/deploy/features.yaml` + `/app/deploy/services.yaml`
3. 启动应用

配置修改后执行：

```bash
docker compose restart app
```

---

## 六、快速排错清单

### 1) 登录失败

先检查 `.env`：

- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `LOGTO_APP_SECRET`
- `BASE_URL_DEV/BASE_URL_PROD`

### 2) 社交绑定失败

优先检查：

- `features.yaml` 中 connector 的 `connectorId` 是否和 Logto 一致
- 第三方平台 redirect URI 白名单是否完整
- 是否设置了正确的 `SOCIAL_BINDING_CALLBACK_BASE_URL`

### 3) 服务门户不显示或分类错乱

检查 `services.yaml`：

- `services[].category` 是否存在于 `serviceCategories[].id`
- `href` / `ping` 是否是合法 URL

---

## 七、i18n（当前支持中文 / English）

### 1) 当前能力

- 已支持 `zh` 与 `en` 两种界面语言。
- 语言偏好来源：
  1. 设置页切换（本地保存）
  2. 同步到账户 `locale` 字段（通过 `/api/account/profile/details`）
- 当前设置页仅提供两种选项：`简体中文`、`English`。

### 2) 语言切换如何生效

- 在「偏好设置 -> 语言」切换后，会立即更新本地语言状态。
- 刷新页面后，导航、服务门户、状态文案等会按所选语言展示。

### 3) 开发者新增文案规则

- 不要在页面直接硬编码中英文文案。
- 优先在以下语言包中添加 key：
  - `lib/i18n/zh.ts`
  - `lib/i18n/en.ts`
- 在 client 组件中通过 `useTranslations()` 读取文案。
