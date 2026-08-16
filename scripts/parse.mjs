#!/usr/bin/env node
// 解析招标/投标文件 → 输出纯文本工作文件
// 用法: node parse.mjs <inputFile> [outputBase]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

async function parsePdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function parseText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export async function parseFileToText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') return parseDocx(filePath);
  if (ext === '.pdf') return parsePdf(filePath);
  if (ext === '.md' || ext === '.txt' || ext === '.text') return parseText(filePath);
  if (ext === '.doc') return parseText(filePath);
  throw new Error(`不支持的文件格式：${ext}（支持 docx / pdf / md / txt）`);
}

// CLI 入口
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const input = process.argv[2];
  const outputBase = process.argv[3] || (input ? input.replace(/\.[^.]+$/, '') : 'parsed');
  if (!input || !fs.existsSync(input)) {
    console.error('用法: node parse.mjs <输入文件> [输出基准名]');
    process.exit(1);
  }
  try {
    const text = await parseFileToText(input);
    const outPath = `${outputBase}.txt`;
    fs.writeFileSync(outPath, text, 'utf8');
    if (process.env.VERBOSE) {
      console.log(`${path.basename(input)} → ${outPath} (${text.length} 字)`);
    } else {
      console.log(outPath);
    }
  } catch (e) {
    console.error(`解析失败：${e.message}`);
    process.exit(1);
  }
}
