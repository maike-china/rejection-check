// dsh-rejection-check — DeepSeek Harness bundle plugin entry.
//
// Registers the bundled 废标项检查 skill (SKILL.md + scripts/) into the
// running harness's skill registry at startup, so the agent can run the
// whole tender/bid rejection-check workflow with no external API key.
// The skill body resolves relative resources (scripts/) against the bundle
// directory via resourceBase.
//
// Per https://deepseek-harness.github.io/deepseek-harness/develop/basic/:
// - a plugin is a module exporting `apply(ctx)` (function form);
// - `inject` declares the services it needs (here the `skills` registry);
// - everything registered through `ctx` is auto-cleaned on unload.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const bundleDir = dirname(fileURLToPath(import.meta.url))
const SKILL_PATH = join(bundleDir, 'SKILL.md')

/** Split leading YAML frontmatter off a markdown body, if present. */
function splitFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown)
  if (!match) return { body: markdown, meta: {} }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) meta[key] = value
  }
  return { body: markdown.slice(match[0].length).replace(/^\s*\r?\n/, ''), meta }
}

export const name = 'dsh-rejection-check'
export const inject = ['skills']

export function apply(ctx) {
  const raw = readFileSync(SKILL_PATH, 'utf8')
  const { body, meta } = splitFrontmatter(raw)
  const description = meta.description
    || '标书废标项检查工具。用户上传招标文件和投标文件后，自动提取招标文件中的"无效投标/废标项"，逐项检查投标文件的风险，并同时检查错别字与逻辑谬误，最后生成检查报告（支持导出 PDF）。使用 DSH 自身模型，无需外部 API Key。'
  const registration = {
    name: meta.name || 'rejection-check',
    description,
    whenToUse: meta.whenToUse,
    content: body,
    resourceBase: { kind: 'directory', path: bundleDir },
    path: SKILL_PATH,
  }
  if (registration.whenToUse === undefined) delete registration.whenToUse
  ctx.skills.register(registration)
  console.log(`[dsh-rejection-check] skill "${registration.name}" registered (base: ${bundleDir})`)
  ctx.logger.info(`[dsh-rejection-check] skill "${registration.name}" registered (base: ${bundleDir})`)
}
