# Vertflux 部署

生产地址：https://tools.vertflux.com/

本仓库保存当前上线版本的源码和定制。生产分支为 `chore/all-my-stuffs`，上游为 [sharevb/it-tools](https://github.com/sharevb/it-tools)。

## 构建与发布

- 推送到生产分支，或合并 PR 后，`Vertflux 构建检查与部署` 会先安装锁定依赖并构建，成功后部署到现有 Cloudflare 项目。
- PR 和手动运行默认只检查代码。手动发布需要在生产分支运行并勾选 `deploy`。
- `CLOUDFLARE_API_TOKEN` 仅保存在 GitHub Actions 加密 Secret，且只在部署步骤中传入。模型 Key、Sink 站点令牌和统计令牌继续保存在各自服务的 Secret 中。
- 保留现有域名、数据库及资源绑定，不自动创建新数据库或付费服务。
- 原有上游工作流在此仓库中保持禁用，避免触发其 Docker、Vercel、桌面客户端或上游专属发布任务。

## 同步上游

- 每天 UTC 02:47（北京时间 10:47）检查上游分支，也可以手动运行 `Vertflux 同步上游并创建 PR`。
- 存在更新时，维护 `updates/upstream` 分支和一个待审核 PR，并显式启动构建检查。
- PR 通过检查后，由仓库所有者确认合并，合并后才会发布。不会自动合并上游代码。
- `.github/vertflux-preserve-paths.txt` 中的工作流和站点配置会保留；其他源码通过 Git 合并。发生冲突时流程停止，不修改生产部署。

仅重新运行旧版本工作流不会回滚数据库迁移。代码回退应提交到生产分支并重新部署。
