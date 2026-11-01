import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const labels = { ai: 'AI 早报', hach: 'HACH 日报' };
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function text(value, name, max, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error(`${name} must be ${required ? 'non-empty ' : ''}text of at most ${max} characters`);
  return value.trim();
}

export function validateReport(input, filename) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Report must be an object');
  if (!Object.hasOwn(labels, input.type)) throw new Error('type must be ai or hach');
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`)) || new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !== input.date) throw new Error('date must be a real YYYY-MM-DD date');
  const slug = `${input.date}-${input.type}`;
  if (filename !== `${slug}.json`) throw new Error(`Filename must be ${slug}.json`);
  const title = text(input.title, 'title', 160, true);
  const summary = text(input.summary, 'summary', 800);
  const image = text(input.image, 'image', 240);
  if (image && !/^\/media\/[A-Za-z0-9/_-]+\.(png|jpe?g|webp|avif|gif)$/i.test(image)) throw new Error('image must be a local raster image path under /media/');
  const imageAlt = text(input.imageAlt, 'imageAlt', 300) || title;
  const items = input.items ?? [];
  if (!Array.isArray(items) || items.length > 30 || (!items.length && !image)) throw new Error('Provide 1–30 items, a report image, or both');
  return {
    slug, date: input.date, type: input.type, title, summary, image, imageAlt,
    items: items.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`items[${index}] must be an object`);
      const url = text(item.url, `items[${index}].url`, 2000);
      if (url) {
        let parsed;
        try { parsed = new URL(url); } catch { throw new Error(`items[${index}].url must be an absolute HTTP(S) URL`); }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`items[${index}].url must be an HTTP(S) URL without credentials`);
      }
      return { title: text(item.title, `items[${index}].title`, 200, true), summary: text(item.summary, `items[${index}].summary`, 6000, true), source: text(item.source, `items[${index}].source`, 120), url };
    })
  };
}

const emptyState = `<div class="empty-state"><span class="empty-symbol" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M8 6h24v29H8zM13 12h7v7h-7zM25 12h2m-2 7h2M13 25h14M13 30h10"/></svg></span><h3>暂无日报</h3><p>日报发布后，将按日期展示在这里。</p><span class="empty-caption">A NEW PAGE IS ON ITS WAY</span></div>`;

function reportRow(report) {
  return `<a class="report-row" href="/reports/${report.slug}/"><time class="report-date" datetime="${report.date}">${report.date.slice(0, 7)}<strong>${report.date.slice(8)}</strong></time><div><span class="report-kicker ${report.type}">${labels[report.type]}</span><h3>${escapeHtml(report.title)}</h3>${report.summary ? `<p>${escapeHtml(report.summary)}</p>` : ''}</div><span class="row-arrow" aria-hidden="true">↗</span></a>`;
}

function shell({ title, description, path, content }) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#10131b"><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="https://news.hachile.org${path}"><link rel="icon" type="image/svg+xml" href="/icon.svg"><link rel="stylesheet" href="/assets/style.css"><title>${escapeHtml(title)} | HACH News</title></head><body><a class="skip-link" href="#main">跳到主要内容</a><header class="site-header wrap"><a class="brand" href="/"><img src="/icon.svg" width="31" height="31" alt=""><span>HACH <b>NEWS</b></span></a><nav aria-label="主导航"><a href="/#archive">日报归档</a><a href="https://home.hachile.org/">个人主页</a></nav></header>${content}<footer class="site-footer wrap"><a class="footer-wordmark" href="/">HACH NEWS<span>AI 每日简报</span></a><div><a href="/">日报归档</a><a href="https://site.hachile.org/">Hachile 站点目录</a><span>© 2026 GPDdev</span></div></footer></body></html>\n`;
}

export function renderReport(report) {
  const paragraphs = value => value.split(/\n\s*\n/).map(part => `<p>${escapeHtml(part).replaceAll('\n', '<br>')}</p>`).join('');
  const items = report.items.map((item, index) => `<section class="news-item"><h2><span class="item-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(item.title)}</span></h2>${paragraphs(item.summary)}${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">来源：${escapeHtml(item.source || new URL(item.url).hostname)} ↗</a>` : item.source ? `<p class="article-note">来源：${escapeHtml(item.source)}</p>` : ''}</section>`).join('');
  return shell({ title: report.title, description: report.summary || `${report.date} ${labels[report.type]}`, path: `/reports/${report.slug}/`, content: `<main id="main" class="article-wrap"><a class="back-link" href="/#archive">← 返回日报归档</a><header class="article-header"><span class="report-kicker ${report.type}">${labels[report.type]}</span><h1>${escapeHtml(report.title)}</h1><time datetime="${report.date}">${report.date.replaceAll('-', ' / ')}</time>${report.summary ? `<p class="lead">${escapeHtml(report.summary)}</p>` : ''}</header><div class="article-body">${report.image ? `<img class="report-poster" src="${escapeHtml(report.image)}" alt="${escapeHtml(report.imageAlt)}">` : ''}${items}<p class="article-note">信息请以条目中的原始来源为准。</p></div></main>` });
}

export async function build() {
  const files = (await readdir(join(root, 'content/reports'))).filter(file => file.endsWith('.json')).sort();
  const reports = [];
  for (const file of files) {
    try {
      const report = validateReport(JSON.parse(await readFile(join(root, 'content/reports', file), 'utf8')), file);
      if (report.image && !(await stat(join(root, 'public', report.image.slice(1)))).isFile()) throw new Error('Report image is not a file');
      reports.push(report);
    } catch (error) { throw new Error(`${file}: ${error.message}`); }
  }
  reports.sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));
  const output = join(root, 'dist');
  // Generated output only; content/reports and public are never removed.
  await rm(output, { recursive: true, force: true });
  await cp(join(root, 'public'), output, { recursive: true });
  const summaries = reports.map(report => ({ date: report.date, type: report.type, title: report.title, summary: report.summary, href: `/reports/${report.slug}/` }));
  const template = await readFile(join(root, 'src/index.html'), 'utf8');
  const html = template.replaceAll('{{count}}', String(reports.length)).replace('{{reports}}', reports.length ? reports.map(reportRow).join('\n') : emptyState).replace('{{data}}', JSON.stringify(summaries).replaceAll('<', '\\u003c'));
  await writeFile(join(output, 'index.html'), html);
  await mkdir(join(output, 'data'), { recursive: true });
  await writeFile(join(output, 'data/reports.json'), `${JSON.stringify(summaries, null, 2)}\n`);
  for (const report of reports) {
    const directory = join(output, 'reports', report.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), renderReport(report));
  }
  await writeFile(join(output, '404.html'), shell({ title: '页面未找到', description: '返回 HACH News 查找日报。', path: '/', content: '<main class="wrap not-found" id="main"><span class="overline">404 / PAGE NOT FOUND</span><h1>这一页还没有记录。</h1><p>链接可能已变更，也可能尚未发布。</p><a href="/">返回日报归档 ↗</a></main>' }));
  await writeFile(join(output, 'CNAME'), 'news.hachile.org\n');
  await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://news.hachile.org/sitemap.xml\n');
  await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://news.hachile.org/</loc></url>${reports.map(report => `<url><loc>https://news.hachile.org/reports/${report.slug}/</loc><lastmod>${report.date}</lastmod></url>`).join('')}</urlset>\n`);
  console.log(`Built HACH News with ${reports.length} reports.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await build();
