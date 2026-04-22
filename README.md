# Vercel Preview Deploy

这个目录是专门给 Vercel 部署准备的最小版本。

里面只保留了 3 个真正需要上传的文件：

- `credamo_chatbot_woz_preview.html`
- `credamo_chatbot_woz_embed_snippet.html`
- `vercel.json`

## 部署方法

### 方法 1：单独建仓库

把这个文件夹里的内容单独放进一个 GitHub 仓库，然后在 Vercel 导入这个仓库。

### 方法 2：从当前仓库导入

如果你还是用当前整个仓库导入 Vercel：

1. 在 Vercel 新建 Project
2. 选择当前仓库
3. `Root Directory` 选择 `vercel-preview-deploy`
4. `Framework Preset` 选 `Other`
5. 直接部署

## 部署结果

部署成功后：

- 根路径 `/` 会直接打开预览页
- 预览页会继续通过相对路径加载 `credamo_chatbot_woz_embed_snippet.html`

## 注意

上传时请保持这 3 个文件在同一个目录下，不要只传其中一个。
