# Radius AAA 管理平台前端

本项目以 [plus-ui](https://github.com/fanchaoping37/plus-ui) 的 `6.X-Vue` 为前端基础，在 `develop` 分支面向 [Radius-Vue-Plus](https://github.com/fanchaoping37/Radius-Vue-Plus) AAA 后端进行适配和业务开发。

## 技术基线

- Vue 3 + TypeScript + Element Plus + Vite
- Pinia + Vue Router
- pnpm（版本要求见 package.json）
- 保留 plus-ui 的基础布局、登录、动态菜单、权限指令和通用系统管理组件

## 架构与开发基线

- [架构与开发基线](docs/架构与开发基线.md)
- [开发决策与后续事项](docs/开发决策与后续事项.md)

## 开发

```bash
pnpm install
pnpm dev
```

开发代理默认将 `/dev-api` 转发到 `http://localhost:8080`。请按实际后端 HTTP 监听地址调整 Vite 配置。

## AAA 功能

- AAA 用户：独立用户主体、状态、身份映射、RADIUS PAP 凭据、PEAP 内层 EAP-MSCHAPv2 凭据
- NAS：NAS Identity、IPv4/IPv6 来源地址、Vendor PEN、Message-Authenticator 与 RADIUS Shared Secret
- 授权条件：用户组、用户标签、终端设备
- 认证编排：Provider / Policy 草稿、版本发布和策略回滚
- 安全运营：NAS 安全审计、用户凭据审计、认证配置审计、CoA 与动态授权人工复核

所有 AAA API 路径、字段和权限以 Radius-Vue-Plus `develop` 分支实际 Controller 为准。前端不保存 NAS Shared Secret、上游 RADIUS Server Secret 或用户凭据明文；凭据设置请求关闭重复提交缓存，避免敏感请求体被写入浏览器 session cache。

## 分支

- `6.X-Vue`：保留 plus-ui 基础分支
- `develop`：Radius AAA 前端适配和业务开发分支

## 开发边界

AAA 用户、NAS、认证策略等数据均按后端当前登录会话的 Tenant 上下文管理。前端不自行指定或伪造 Tenant 身份。AAA 认证报文仍由后端 RADIUS/UDP 服务处理，浏览器仅管理控制面配置和审计数据。
