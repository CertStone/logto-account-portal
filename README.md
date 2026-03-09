# Logto Account Center & Portal

基于 **Next.js 15（App Router）** + **Logto** 的账户中心与服务门户。

## 功能概览

- 账户中心：概览、个人资料、安全设置、社交连接、偏好设置
- 服务门户：服务分类、搜索、健康状态探测
- 认证：`@logto/next`（用户令牌）+ Management API（M2M）

---

## 本地开发

### 1) 安装依赖

```bash
npm install
```

### 2) 准备环境变量

```bash
cp .env.example .env.local
```

### 3) 启动

```bash
npm run dev
```

访问：`http://localhost:3000`

---

## Docker 部署

### 配置目录

宿主机目录：`./deploy/config`

必须包含：

- `app.env`
- `features.yaml`
- `services.yaml`

初始化：

```bash
cp deploy/config/app.env.example deploy/config/app.env
cp deploy/config/features.yaml.example deploy/config/features.yaml
cp deploy/config/services.yaml.example deploy/config/services.yaml
```

然后按需修改 `deploy/config/*`。

### 启动

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f app
```

访问：`http://localhost:1742`

### 配置变更生效

修改 `deploy/config/*` 后：

```bash
docker compose restart app
```

容器启动时会执行配置校验，校验通过后直接启动应用。

---

## 配置说明

详见：[docs/configuration-guide.md](docs/configuration-guide.md)

---

## 生产建议

- 使用强随机 `LOGTO_COOKIE_SECRET`
- 生产环境使用反向代理开启 HTTPS
- 最小化 M2M 权限

---

## License

[MPL-2.0](LICENSE)
