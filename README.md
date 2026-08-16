# 废标项检查工具（DSH 技能插件）

> 基于 DeepSeek Harness (DSH) 的标书废标项自动检查工具。用户上传招标文件和投标文件后，自动提取招标文件中的"无效投标/废标项"，逐项检查投标文件的风险，并同时检查错别字与逻辑谬误，最后生成检查报告（PDF/HTML/Markdown）。

---

## 功能

- **📄 智能解析** — 支持 `.docx` / `.pdf` / `.md` / `.txt` 格式的招标文件和投标文件解析
- **🔍 废标项提取** — 自动从招标文件中提取"无效投标"和"废标项"条款，逐条引用原文
- **⚠️ 三轮风险检查** — 分析检查范围 → 逐项核查 → 合并定稿，输出结构化的风险项
- **✏️ 错别字检测** — 自动识别投标文件中的错别字、别字、明显录入错误
- **🔗 逻辑谬误检查** — 检测投标文件中前后不一致的内容（人员名单、工期、金额、服务期限等）
- **📊 报告生成** — 一键生成 PDF + HTML + Markdown 三种格式的检查报告
- **🔒 无需 API Key** — 使用 DSH 自身模型，数据仅本地分析，不上传第三方

## 使用方法

### 前置条件

- 已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- 本技能已注册到 DSH 技能目录

### 安装

```bash
# 克隆到 DSH 技能目录
git clone https://github.com/<你的用户名>/rejection-check.git ~/.dsh/skills/rejection-check

# 安装依赖
cd ~/.dsh/skills/rejection-check
npm install
```

### 在 DSH 中使用

1. 在 DSH 对话框**上传招标文件 + 投标文件**（支持 `.docx` / `.pdf` / `.md` / `.txt`）
2. 输入指令：**"检查这两个文件的废标项"** 或 **"用废标项检查工具查一下"**
3. DSH 自动完成：解析 → 三轮检查 → 错别字 + 逻辑检查 → 生成报告
4. 获取生成的 `废标项检查报告.pdf` 文件路径，保存即可

## 项目结构

```
rejection-check/
├── SKILL.md              # DSH 技能核心指令（frontmatter + 检查流程）
├── scripts/
│   ├── parse.mjs         # 文档解析器（docx/pdf/md/txt → 纯文本）
│   └── report.mjs        # 报告生成器（JSON → PDF + HTML + Markdown）
├── package.json          # 依赖（pdfkit / mammoth / pdf-parse）
├── LICENSE               # MIT 许可证
├── README.md             # 本文件
└── .github/workflows/    # CI 工作流
    └── ci.yml            # 自动测试 & 依赖检查
```

## 技术实现

### 文档解析（scripts/parse.mjs）

| 格式 | 方案 | 说明 |
|------|------|------|
| `.docx` | `mammoth.extractRawText` | 提取纯文本 |
| `.pdf` | `pdf-parse` | 解析 PDF 文本层 |
| `.md` / `.txt` | 直接读取 UTF-8 | 最准确 |
| `.doc` | 回退读取为文本 | 旧格式，效果有限 |

### 报告生成（scripts/report.mjs）

- 使用 **PDFKit** 生成 PDF，**跨平台中文字体自动检测**
  - macOS：`PingFang.ttc` / `Songti.ttc` / `Arial Unicode.ttf`
  - Windows：`msyh.ttc`（微软雅黑）/ `simsun.ttc`
  - Linux：`wqy-zenhei.ttc`
- 找不到字体时自动回退生成 HTML 报告
- 同步输出 HTML 和 Markdown 格式

### 检查流程

1. **解析文件** → 纯文本
2. **提取废标项** → 从招标文件提取"无效投标"和"废标项"（严格区分，逐条引用原文）
3. **三轮检查** → 分析检查范围 → 逐项核查投标文件 → 合并去重定稿
4. **错别字检查** → 识别错字/别字/录入错误
5. **逻辑谬误检查** → 检查前后不一致（人员、工期、金额、服务期限等）
6. **生成报告** → PDF + HTML + Markdown

## 来源

本项目适配为 DeepSeek Harness 技能插件。

## 许可证

[MIT](./LICENSE)