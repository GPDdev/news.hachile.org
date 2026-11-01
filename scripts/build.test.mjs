import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReport, renderReport } from './build.mjs';

const report = { date: '2026-11-01', type: 'ai', title: '测试日报', summary: '测试摘要', items: [{ title: '测试条目', summary: '第一段\n\n第二段', source: 'Example', url: 'https://example.com/source' }] };

test('report content produces a readable standalone page with source links', () => {
  const parsed = validateReport(report, '2026-11-01-ai.json');
  const html = renderReport(parsed);
  assert.equal(parsed.slug, '2026-11-01-ai');
  assert.match(html, /第一段<\/p><p>第二段/);
  assert.match(html, /href="https:\/\/example.com\/source"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('rejects invalid dates, filenames and categories instead of publishing malformed entries', () => {
  assert.throws(() => validateReport({ ...report, date: '2026-02-30' }, '2026-02-30-ai.json'), /real YYYY-MM-DD/);
  assert.throws(() => validateReport(report, '../wrong.json'), /Filename/);
  assert.throws(() => validateReport({ ...report, type: 'other' }, '2026-11-01-other.json'), /type/);
  assert.throws(() => validateReport({ ...report, items: [] }, '2026-11-01-ai.json'), /Provide/);
});

test('rejects executable links and image paths outside the media directory', () => {
  assert.throws(() => validateReport({ ...report, items: [{ ...report.items[0], url: 'javascript:alert(1)' }] }, '2026-11-01-ai.json'), /HTTP\(S\)/);
  assert.throws(() => validateReport({ ...report, image: '/media/../secret.png' }, '2026-11-01-ai.json'), /image/);
  assert.throws(() => validateReport({ ...report, image: 'https://example.com/remote.png' }, '2026-11-01-ai.json'), /image/);
});

test('escapes future automated uploads as text and accepts poster-only HACH reports', () => {
  const parsed = validateReport({ date: '2026-11-01', type: 'hach', title: '<script>alert(1)</script>', image: '/media/2026-11-01-hach.png' }, '2026-11-01-hach.json');
  const html = renderReport(parsed);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /class="report-poster"/);
});
