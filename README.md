# HACH News

AI 早报与 HACH 日报的静态归档站。正式域名为 https://news.hachile.org/ 。当前没有真实日报内容，页面会展示空状态。

使用 Node.js 22 或更新版本，无第三方依赖。

```sh
npm test
npm run build
npm run dev
```

本地预览地址：`http://127.0.0.1:18776/`。修改源文件后重新运行构建；`dist/` 是可重新生成的发布目录，不要手动编辑或提交。

## 后续 Muse 发布约定

上传功能尚未接入。Muse 后续可通过 GitHub 提交发布，不需要修改页面代码：

1. 新增或更新 `content/reports/YYYY-MM-DD-ai.json` 或 `content/reports/YYYY-MM-DD-hach.json`。
2. 如果有日报长图，将图片加入 `public/media/`，JSON 中填写以 `/media/` 开头的路径。
3. 执行 `npm test` 和 `npm run build`，提交并推送 `main`。
4. GitHub Actions 自动生成归档和独立日报页，发布到 GitHub Pages。

每个日期、每个栏目各有一份文件，修改同名文件即可更新该期内容。文件名必须与 `date` 和 `type` 一致。`ai` 代表 AI 早报，`hach` 代表 HACH 日报。日期使用北京时间对应的发布日期。

以下仅为格式示例，不会出现在正式页面：

```json
{
  "date": "2026-11-01",
  "type": "ai",
  "title": "11 月 1 日 AI 早报",
  "summary": "本期摘要。",
  "items": [
    {
      "title": "新闻标题",
      "summary": "新闻正文。\n\n第二段正文。",
      "source": "来源名称",
      "url": "https://example.com/original-source"
    }
  ]
}
```

`title` 必填，`summary` 可选。每期最多 30 条，条目的 `title` 和 `summary` 必填，`source`、`url` 可选。正文是纯文本，可用空行分段；不会执行 HTML 或脚本。来源链接只接受 HTTP(S)。

HACH 日报支持长图和文字同时展示，也支持只有长图：

```json
{
  "date": "2026-11-01",
  "type": "hach",
  "title": "11 月 1 日 HACH 日报",
  "summary": "本期摘要。",
  "image": "/media/2026-11-01-hach.png",
  "imageAlt": "本期日报长图的文字说明"
}
```

图片必须实际存在于 `public/media/`，支持 PNG、JPG、WebP、AVIF 和 GIF。建议同时提供文字条目，让内容可搜索、可复制并便于无障碍阅读。

构建会校验日期、栏目、文件名、字段长度、来源链接和图片路径。内容错误时部署失败并保留上一次已发布版本。请勿在仓库或日报文件中写入 GitHub 令牌、Muse 凭据或其他密钥。

## 目录

- `src/index.html`：首页模板。
- `public/assets/`：样式和归档筛选脚本。
- `content/reports/`：正式日报 JSON，每期一个文件。
- `public/media/`：日报长图及配图。
- `scripts/build.mjs`：校验内容并生成静态页面。
- `scripts/build.test.mjs`：发布数据与安全边界测试。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。

GitHub Pages 的 Source 使用 **GitHub Actions**。自定义域名设置为 `news.hachile.org`；DNS 的 `news` CNAME 指向 `gpddev.github.io`。HTTPS 证书可用后启用 Enforce HTTPS。
