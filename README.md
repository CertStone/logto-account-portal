# Logto Account Portal

> 简体中文 | [English](README.en.md)

Logto Account Portal 是一个对接 [Logto](https://logto.io/) 的账户中心和服务门户，提供用户资料管理、安全设置、社交账号绑定等功能。支持本地开发和 Docker 部署，配置统一且易于管理。

项目基于 Next.js 16 (App Router) 构建，前端页面使用 shadcn/ui 组件库。

## 一、项目功能

### 账户中心（Dashboard）

- 个人资料管理（头像、姓名、资料字段）
- 安全设置（密码、MFA、Passkey、登录历史）
- 社交账号绑定与解绑（Google/GitHub/QQ 等）
- 登录记录与账户删除
- 界面语言与明暗切换

### 服务门户（Portal）

- 基于配置文件的服务展示
- 服务分类导航
- 关键词搜索
- 服务可用性探测


## 二、UI界面预览

Dashboard (Dark Mode):

![dark mode](docs/assets/overview1.png)

Profile (Light Mode):

![light mode](docs/assets/overview2.png)

Security Page (Dark)

![dark mode](docs/assets/overview4.png)

Social Connections (Dark)

![dark mode](docs/assets/overview5.png)

Portal Page (Light)

![portal page](docs/assets/overview3.png)



## 三、配置约定

无论本地开发还是 Docker 部署，统一使用以下路径：

- `/.env`
- `/deploy/features.yaml`
- `/deploy/services.yaml`

仓库内仅提供示例文件：

- `/.env.example`
- `/deploy/features.yaml.example`
- `/deploy/services.yaml.example`



## 四、本地开发

### 1) 安装依赖

```bash
npm install
```

### 2) 准备配置文件

```bash
cp .env.example .env
cp deploy/features.yaml.example deploy/features.yaml
cp deploy/services.yaml.example deploy/services.yaml
```

### 3) 依据您的实际情况修改配置

详见[docs/configuration-guide.md](docs/configuration-guide.md)。

### 4) 启动

```bash
npm run dev
```

访问：`http://localhost:3000`



## 五、Docker 部署

### 1) 准备部署目录

```bash
mkdir -p account-center/deploy
cd account-center
```

### 2) 下载配置模板

```bash
curl -fsSL -o .env https://raw.githubusercontent.com/CertStone/logto-account-portal/main/.env.example
curl -fsSL -o deploy/features.yaml https://raw.githubusercontent.com/CertStone/logto-account-portal/main/deploy/features.yaml.example
curl -fsSL -o deploy/services.yaml https://raw.githubusercontent.com/CertStone/logto-account-portal/main/deploy/services.yaml.example
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/CertStone/logto-account-portal/main/docker-compose.yml
```

编辑 `.env` / `deploy/*.yaml` 后再启动。详见[docs/configuration-guide.md](docs/configuration-guide.md)。

### 3) 启动

```bash
docker compose pull
docker compose up -d
```

查看日志：

```bash
docker compose logs -f app
```



## 六、项目特色

- **多语言支持**：内置 i18n 框架，轻松切换中英文界面
- **统一配置模型**：开发与部署都使用 `.env + deploy/*.yaml`
- **运行时配置加载**：配置修改后重启容器即可生效
- **配置校验内建**：容器启动前自动校验 env/yaml，减少线上配置错误
- **认证边界清晰**：区分用户 Token 与 M2M Token，降低权限误用风险
- **前后端解耦**：Client 通过 `/api/public-config` 获取公开配置



## 七、配置说明

详见：`docs/configuration-guide.md`



## 八、开源协议

[MPL-2.0 License](LICENSE)