#!/usr/bin/env node
// 生成检查报告：PDF + HTML + Markdown
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Supplemental/Songti.ttc',
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  'C:/Windows/Fonts/msyh.ttc',
  'C:/Windows/Fonts/simhei.ttf',
  'C:/Windows/Fonts/simsun.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
];

function findCjkFont() {
  for (const p of FONT_CANDIDATES) if (fs.existsSync(p)) return p;
  return null;
}

const severityMap = { high: '高风险', medium: '中风险', low: '低风险' };
const typeMap = { invalidBid: '无效标', rejectionItem: '废标项' };

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(meta, results) {
  const title = esc(meta.title || '废标项检查报告');
  const dateSection = `<p><strong>生成时间：</strong>${esc(meta.generatedAt || '')}</p>` +
    (meta.tender ? `<p><strong>招标文件：</strong>${esc(meta.tender)}</p>` : '') +
    (meta.bids ? `<p><strong>投标文件：</strong>${esc(meta.bids)}</p>` : '');
  const rejection = results.rejection?.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.title)}</td><td>${esc(typeMap[it.type] || it.type)}</td><td>${esc(severityMap[it.severity] || it.severity)}</td><td>${esc(it.bidEvidence)}</td><td>${esc(it.riskReason)}</td></tr>`).join('') || '';
  const typo = results.typo?.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.wrongText)} → ${esc(it.correctText)}</td><td>${esc(it.originalExcerpt)}</td><td>${esc(it.reason)}</td></tr>`).join('') || '';
  const logic = results.logic?.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.title)}</td><td>${esc(it.originalText)}</td><td>${esc(it.fallacyReason)}</td></tr>`).join('') || '';
  const empty = (!rejection && !typo && !logic) ? '<p class="empty">未发现需要报告的风险项。</p>' : '';
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${title}</title>
<style>
body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;padding:24px;color:#1c2536}
h1{font-size:22px;border-bottom:2px solid #2174fd;padding-bottom:10px}
h2{font-size:16px;margin-top:24px;color:#2174fd}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
th,td{border:1px solid #ccd3df;padding:7px 6px;text-align:left;vertical-align:top}
th{background:#f0f4ff;white-space:nowrap}
tr:nth-child(even){background:#fafbfd}
.empty{color:#98a2b3}
.foot{margin-top:28px;font-size:10px;color:#98a2b3;text-align:center}
</style></head><body>
<h1>${title}</h1>${dateSection}
${rejection ? '<h2>一、废标项检查</h2><table><thead><tr><th>#</th><th>风险项</th><th>类型</th><th>等级</th><th>投标证据</th><th>风险原因</th></tr></thead><tbody>' + rejection + '</tbody></table>' : ''}
${typo ? '<h2>二、错别字检查</h2><table><thead><tr><th>#</th><th>错字 → 正确</th><th>原文</th><th>原因</th></tr></thead><tbody>' + typo + '</tbody></table>' : ''}
${logic ? '<h2>三、逻辑谬误检查</h2><table><thead><tr><th>#</th><th>问题</th><th>原文</th><th>原因</th></tr></thead><tbody>' + logic + '</tbody></table>' : ''}
${empty}
<div class="foot">由「废标项检查工具」DSH 插件生成 · 数据仅本地分析</div>
</body></html>`;
}

function buildMarkdown(meta, results) {
  const L = ['# ' + (meta.title || '废标项检查报告'), '', '生成时间：' + (meta.generatedAt || ''),
    ...(meta.tender ? ['招标文件：' + meta.tender] : []), ...(meta.bids ? ['投标文件：' + meta.bids] : []), ''];
  const section = (title, items, cols) => {
    if (!items || !items.length) return [];
    const out = ['## ' + title, '', '| # |' + cols.map((c) => ' ' + c[1] + ' |').join(''), '|---|' + cols.map(() => '---|').join('')];
    items.forEach((it, i) => out.push('| ' + i + ' |' + cols.map((c) => ' ' + String(it[c[0]] ?? '').replace(/\|/g, '/').replace(/\n/g, ' ') + ' |').join('')));
    out.push(''); return out;
  };
  L.push(...section('一、废标项检查', results.rejection, [['title', '风险项'], ['bidEvidence', '证据'], ['riskReason', '风险原因'], ['suggestion', '建议']]));
  L.push(...section('二、错别字检查', results.typo, [['wrongText', '错字'], ['correctText', '正确'], ['originalExcerpt', '原文'], ['reason', '原因']]));
  L.push(...section('三、逻辑谬误检查', results.logic, [['title', '问题'], ['originalText', '原文'], ['fallacyReason', '原因'], ['suggestion', '建议']]));
  return L.join('\n');
}

async function buildPdf(meta, results) {
  const font = findCjkFont();
  if (!font) throw new Error('未找到可用的中文字体，无法生成 PDF；已生成 HTML 报告');
  const doc = new PDFDocument({ size: 'A4', margin: 34 });
  const out = path.resolve(process.argv[3] ? `${process.argv[3]}.pdf` : '废标项检查报告.pdf');
  const stream = fs.createWriteStream(out);
  doc.pipe(stream);

  doc.font(font).fontSize(20).fillColor('#1c2536').text(meta.title || '废标项检查报告');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#66707f').text(meta.generatedAt ? `生成时间：${meta.generatedAt}` : '');
  if (meta.tender) doc.fontSize(10).fillColor('#66707f').text(`招标文件：${meta.tender}`);
  if (meta.bids) doc.fontSize(10).fillColor('#66707f').text(`投标文件：${meta.bids}`);
  doc.moveDown(0.4);

  let y = doc.page.margins.top;
  const ensure = (h) => { if (y + h > doc.page.height - 50) { doc.addPage(); y = doc.page.margins.top; } };
  const sectionTitle = (t) => { ensure(24); doc.font(font).fontSize(14).fillColor('#2174fd').text(t); y = doc.y + 4; };

  const drawTable = (title, items, cols) => {
    if (!items || !items.length) return;
    sectionTitle(title);
    const cellW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / (cols.length + 1);
    ensure(18);
    doc.font(font).fontSize(8.5);
    doc.fillColor('#eef2fb').rect(doc.page.margins.left, y, cellW * (cols.length + 1), 16).fill().stroke('#ccd3df');
    doc.fillColor('#1c2536');
    doc.text('#', doc.page.margins.left + 3, y + 4, { width: cellW - 6 });
    cols.forEach((c, i) => doc.text(c[1], doc.page.margins.left + (i + 1) * cellW + 3, y + 4, { width: cellW - 6 }));
    y += 16;
    items.forEach((item, idx) => {
      const cells = [String(idx + 1), ...cols.map((c) => String(item[c[0]] ?? ''))];
      const totalCjk = cells.reduce((a, c) => a + (c.match(/[\u4e00-\u9fff]/g) || []).length, 0);
      const totalAscii = cells.reduce((a, c) => a + c.length, 0);
      let rowH = Math.ceil((totalCjk * 9 + totalAscii * 4.5) / (cellW * (cols.length + 1) * 0.5)) * 12 + 6;
      rowH = Math.max(16, Math.min(80, rowH));
      if (y + rowH > doc.page.height - 50) { doc.addPage(); rowH = Math.max(16, rowH); y = doc.page.margins.top; }
      const cellW2 = cellW;
      doc.fillColor(idx % 2 ? '#f7f9fc' : '#ffffff');
      doc.rect(doc.page.margins.left, y, cellW2 * (cols.length + 1), rowH).fill().stroke('#ccd3df');
      doc.fillColor('#1c2536');
      cells.forEach((txt, i) => doc.text(txt, doc.page.margins.left + i * cellW2 + 3, y + 3, { width: cellW2 - 6, lineBreak: true }));
      y += rowH;
    });
    doc.moveDown(0.3);
    y = doc.y;
  };

  drawTable('一、废标项检查', results.rejection?.map((r) => ({ ...r, severity: severityMap[r.severity] || r.severity, type: typeMap[r.type] || r.type })) || [], [['title', '风险项'], ['type', '类型'], ['severity', '等级'], ['bidEvidence', '投标证据']]);
  drawTable('二、错别字检查', results.typo?.map((t) => ({ ...t, wrongText: `${t.wrongText} → ${t.correctText}` })) || [], [['wrongText', '错字'], ['originalExcerpt', '原文'], ['reason', '原因']]);
  drawTable('三、逻辑谬误检查', results.logic || [], [['title', '问题'], ['locationHint', '位置'], ['fallacyReason', '原因'], ['suggestion', '建议']]);

  doc.font(font).fontSize(8).fillColor('#98a2b3').text('由「废标项检查工具」DSH 插件生成 · 数据仅本地分析', doc.page.margins.left, doc.page.height - 40);
  doc.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
  return out;
}

export { buildHtml, buildMarkdown, buildPdf };

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const inputFile = process.argv[2];
  const outputBase = process.argv[3] || '/tmp/废标项检查报告';
  if (!inputFile || !fs.existsSync(inputFile)) { console.error('用法: node report.mjs <findings.json> [输出基准名]'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const meta = data.meta || { title: '废标项检查报告' };
  const results = data.results || {};
  meta.generatedAt = meta.generatedAt || new Date().toLocaleString('zh-CN');
  try {
    fs.writeFileSync(`${outputBase}.html`, buildHtml(meta, results), 'utf8');
    fs.writeFileSync(`${outputBase}.md`, buildMarkdown(meta, results), 'utf8');
    const pdfPath = await buildPdf(meta, results);
    console.log(`已生成：${pdfPath}`);
  } catch (e) {
    console.error('报告生成失败：' + e.message);
    if (fs.existsSync(`${outputBase}.html`)) console.log(`HTML 报告已生成：${outputBase}.html`);
    process.exit(1);
  }
}
