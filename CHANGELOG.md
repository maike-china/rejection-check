# Changelog

本插件所有值得记录的变更。

## [1.0.1] — 2026-08-19

### 修复（CI）

- `actions/setup-node@v4` 移除 `cache: npm`：仓库不提交 lockfile，setup-node 因找不到 lock 文件直接报错导致 job 失败。
- 报告生成测试改用 `node --input-type=module`：`node -e` 是 CJS，不支持顶层 `await`。
- Node 测试矩阵 `[20, 22]` → `[22, 24]`：node 20 已被 GitHub runner 弃用。

## [1.0.0] — 2026-08-16

### 新增

- 按 DSH 插件开发规范改造为标准 **bundle 插件**（`dsh.bundle.patch` 声明）：
  - `cordis.patch.yml`：配置层，插入 `- id: rejection-check` 插件行。
  - `index.js`：插件入口（`apply(ctx)` + `inject: ['skills']`），启动时解析 `SKILL.md` frontmatter 并调用 `ctx.skills.register()` 注册技能，`resourceBase` 指向插件目录，使 `scripts/` 可被技能解析。
- `dsh plugin --profile <name> add` 一键安装；支持本地目录 / tarball（`pnpm pack`）/ GitHub（`github:maike-china/rejection-check`）三种方式。

### 修复

- 原 `main` 指向不存在的 `index.js`，插件无法安装。
- `.gitignore` 误排除 `*.md`（会把 SKILL.md / README 排除出打包产物）。

### 发布

- GitHub 仓库：https://github.com/maike-china/rejection-check（公开）
- 收录 topic：`dsh-plugin`、`deepseek-harness`、`dsh`、`skill`、`plugin`、`tender`、`bid`
