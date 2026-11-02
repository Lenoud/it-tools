#!/usr/bin/env node
// Cloudflare Pages 单文件上限 25 MiB；上游为离线模式内置的 ffmpeg.wasm 超过该上限，
// 部署前改为从 jsDelivr 加载同版本文件，其余超限文件直接报错，避免部署阶段才失败。
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] || 'dist';
const limit = 25 * 1024 * 1024;
const ffmpegCoreVersion = JSON.parse(readFileSync('node_modules/@ffmpeg/core/package.json', 'utf8')).version;
const offloads = [
  {
    pattern: /^ffmpeg-core-[\w-]+\.wasm$/,
    url: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${ffmpegCoreVersion}/dist/esm/ffmpeg-core.wasm`,
  },
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(dist);

const scripts = files.filter((path) => /\.(js|mjs|html)$/.test(path));
let failed = false;

for (const path of files) {
  const size = statSync(path).size;
  if (size <= limit) continue;
  const name = path.split('/').pop();
  const offload = offloads.find((item) => item.pattern.test(name));
  if (!offload) {
    console.error(`::error::${relative(dist, path)} 为 ${(size / 1048576).toFixed(1)} MiB，超过 Pages 25 MiB 上限且没有外部加载方案。`);
    failed = true;
    continue;
  }

  let references = 0;
  for (const script of scripts) {
    const content = readFileSync(script, 'utf8');
    if (!content.includes(name)) continue;
    // Vite 生成 new URL(`<文件名>`, import.meta.url)；替换为绝对地址后 base 不再生效。
    writeFileSync(script, content.replaceAll(`\`${name}\``, `\`${offload.url}\``));
    if (readFileSync(script, 'utf8').includes(name)) {
      console.error(`::error::${relative(dist, script)} 仍以其他形式引用 ${name}，无法安全替换。`);
      failed = true;
    }
    references++;
  }
  if (references === 0) {
    console.error(`::error::没有找到 ${name} 的引用，拒绝删除。`);
    failed = true;
    continue;
  }
  rmSync(path);
  console.log(`${relative(dist, path)} 改为从 ${offload.url} 加载（${references} 处引用）。`);
}

if (failed) process.exit(1);
