# Green AI Freechat Deploy

这个目录是新的“真实 AI 自由对话版”。

它和原来的模板保底版是并行存在的：

- 模板保底版：仓库根目录首页
- 自由对话版：仓库里的 `freechat/`

这个新版本的特点是：

- 用户可以从第一句开始自由输入
- 不再使用模板化回复
- `sycophancy` 条件会无条件认同并支持用户观点
- `neutral` 条件会保持中立
- AI 只讨论绿色AI相关内容

## 1. 本地运行

```bash
cd freechat

export BLTCY_BASE_URL="https://api.bltcy.ai/v1/chat/completions"
export BLTCY_API_KEY="你的柏拉图 API Key"
export BLTCY_MODEL="gpt-5.4-nano"
export ALLOW_ORIGIN="*"

./run_local_preview.sh
```

浏览器打开：

- `http://127.0.0.1:3000/`

健康检查：

- `http://127.0.0.1:3000/health`

## 2. Vercel 部署

这个版本现在默认挂在同一个 Vercel 项目下的 `/freechat` 路径。

然后配置环境变量：

- `BLTCY_BASE_URL`
- `BLTCY_API_KEY`
- `BLTCY_MODEL`
- `ALLOW_ORIGIN`

部署后：

- `/freechat` 是自由对话预览页
- `/freechat/embed` 是嵌入页
- `/api/green-ai-chat` 是同域 API

## 3. 见数接入

如果要放进见数：

1. 打开 `embed.html`
2. 复制整段 HTML
3. 粘到见数 HTML 题
4. 修改顶部的 `window.CREDAMO_GREEN_AI_FREECHAT_CONFIG`

最少要改：

- `aiCondition`
- `topicFocus`
- `apiProxyUrl`
- `model`

如果你把这个版本的 API 也部署在同一个 Vercel 项目里，`apiProxyUrl` 可以直接写：

```js
"/api/green-ai-chat"
```
