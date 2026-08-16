# 废标项检查工具（DeepSeek Harness 插件）

> 基于 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) 的标书废标项自动检查**插件**（bundle）。安装后，插件把 `SKILL.md` 技能注册进 Harness 的技能目录，用户上传招标文件和投标文件，即可自动提取"无效投标/废标项"、逐项检查投标文件风险，并同时检查错别字与逻辑谬误，最后生成检查报告（PDF/HTML/Markdown）。

---

## 功能

- **📄 智能解析** — 支持 `.docx` / `.pdf` / `.md` / `.txt` 格式的招标文件和投标文件解析
- **🔍 废标项提取** — 自动从招标文件中提取"无效投标"和"废标项"条款，逐条引用原文
- **⚠️ 三轮风险检查** — 分析检查范围 → 逐项核查 → 合并定稿，输出结构化的风险项
- **✏️ 错别字检测** — 自动识别投标文件中的错别字、别字、明显录入错误
- **🔗 逻辑谬误检查** — 检测投标文件中前后不一致的内容（人员名单、工期、金额、服务期限等）
- **📊 报告生成** — 一键生成 PDF + HTML + Markdown 三种格式的检查报告
- **🔒 无需 API Key** — 使用 DSH 自身模型，数据仅本地分析，不上传第三方

## 安装（三种方式）

### 方式一：从本地目录安装（推荐，开发/自用）

```bash
# 在包含 rejection-check1 目录的任意位置执行；profile 名可自定义
dsh plugin --profile <你的profile名> add /path/to/rejection-check1

# 验证配置层已生效（应能看到 "# == dsh-rejection-check" 层）
dsh --profile <你的profile名> --dump-config

# 用该 profile 启动 Harness（Web UI 或 headless）
dsh --profile <你的profile名> web
```

> 首次使用某 profile 时，`dsh plugin` 会自动初始化它（以 `@deepseek-ai/dsh-base` 为第一个组合包），并用 pnpm 链接本插件、把它追加进 `dsh.profile.bundles`。

### 方式二：打包成 tarball 分发（无需源码/构建权限）

```bash
cd rejection-check1 && pnpm pack        # 产出 dsh-rejection-check-1.0.0.tgz
dsh plugin --profile <你的profile名> add ./dsh-rejection-check-1.0.0.tgz
```

### 方式三：从 GitHub 安装（发布/分发）

仓库：https://github.com/maike-china/rejection-check

```bash
# 直接安装仓库最新 main 分支
dsh plugin --profile <你的profile名> add github:maike-china/rejection-check

# 推荐：锁定具体 commit（#<sha>），避免后续推送悄悄改变实际运行的代码
dsh plugin --profile <你的profile名> add github:maike-china/rejection-check#<commit-sha>
```

**关于 git 构建步骤**：

- git 安装拉取的是**源码**（不是构建产物），因此带构建步骤的 TypeScript 插件需要 `prepare` 脚本 + 用户在 profile 的 `pnpm-workspace.yaml` 中对该包放行 `allowBuilds` 才会在安装时构建。
- 本插件是**纯 ESM + 运行时依赖**（mammoth / pdf-parse / pdfkit 均来自 npm registry），**没有构建步骤**：git 安装即拉源码、自动装依赖、`dsh.bundle` 声明直接激活配置层，**无需 `prepare` 脚本，也无需任何构建授权**。
- 如果未来版本引入编译步骤，作者会在 package.json 增加 `prepare` 脚本并同步更新本小节。
- 更新到作者最新代码：`dsh plugin --profile <你的profile名> update dsh-rejection-check`。

## 使用

1. 用安装了本插件的 profile 启动 Harness
2. 在对话框**上传招标文件 + 投标文件**（支持 `.docx` / `.pdf` / `.md` / `.txt`）
3. 输入指令：**"检查这两个文件的废标项"** 或 **"用废标项检查工具查一下"**
4. Harness 自动完成：解析 → 三轮检查 → 错别字 + 逻辑检查 → 生成报告
5. 获取生成的 `废标项检查报告.pdf` 文件路径，保存即可

## 工作原理

插件本身是一个标准 DSH 组合包（bundle）：

- `package.json` — 声明 `dsh.bundle.patch`，让 `dsh plugin add` 识别为可激活的 profile 层
- `cordis.patch.yml` — 插入一行启用插件（`- id: rejection-check`）
- `index.js` — 插件入口（`apply(ctx)` + `inject: ['skills']`），启动时调用 `ctx.skills.register()` 把 `SKILL.md` 注册为运行时技能，并把 `resourceBase` 指向本目录，使 `scripts/` 可被技能解析
- `SKILL.md` — 技能核心指令（frontmatter + 检查流程）
- `scripts/parse.mjs` — 文档解析器（docx/pdf/md/txt → 纯文本）
- `scripts/report.mjs` — 报告生成器（findings.json → PDF + HTML + Markdown）

## 项目结构

```
rejection-check1/
├── package.json          # 插件包 manifest（dsh.bundle → cordis.patch.yml）
├── cordis.patch.yml      # bundle 配置层（插入插件行）
├── index.js              # 插件入口：注册废标项检查技能
├── SKILL.md              # DSH 技能核心指令（frontmatter + 检查流程）
├── scripts/
│   ├── parse.mjs         # 文档解析器（docx/pdf/md/txt → 纯文本）
│   └── report.mjs        # 报告生成器（JSON → PDF + HTML + Markdown）
├── LICENSE               # MIT 许可证
└── README.md             # 本文件
```

## 技术实现

### 文档解析（scripts/parse.mjs）

- 使用 `mammoth` 解析 `.docx`，`pdf-parse` 解析 `.pdf`，`.md`/`.txt` 直接读取
- 输出 UTF-8 纯文本工作文件，供后续三轮检查使用

### 报告生成（scripts/report.mjs）

- 读取 `findings.json`（rejection / typo / logic 三组结果）
- 自动选择系统中文字体（macOS / Windows / Linux 常见字体路径），用 `pdfkit` 生成 PDF，同时输出 HTML 与 Markdown
- 无可用中文字体时回退为仅生成 HTML

## 注意事项

- 全程使用简体中文
- 不虚构投标文件中不存在的证据；证据不足时标注"建议人工复核"
- 不因图片、扫描件、附件正文不可见而判定材料缺失
- 报告末尾提示这是自动化辅助检查，正式投标请由专业人员复核
