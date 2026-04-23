const fs = require("fs");
const http = require("http");
const path = require("path");
const { readRuntimeConfig, handleChatRequest, createHealthPayload } = require("./shared-chat-core.cjs");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

function applyCorsHeaders(response, runtimeConfig) {
  response.setHeader("Access-Control-Allow-Origin", runtimeConfig.allowOrigin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(response, statusCode, payload, runtimeConfig) {
  applyCorsHeaders(response, runtimeConfig);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function parseBody(request, limitBytes) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;

    request.setEncoding("utf8");

    request.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > limitBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      raw += chunk;
    });

    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function serveStaticFile(response, filePath) {
  if (!filePath.startsWith(ROOT_DIR)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.statusCode = error.code === "ENOENT" ? 404 : 500;
      response.end(error.code === "ENOENT" ? "Not Found" : "Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.statusCode = 200;
    response.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    response.end(buffer);
  });
}

const server = http.createServer(async (request, response) => {
  const runtimeConfig = readRuntimeConfig(process.env);
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    applyCorsHeaders(response, runtimeConfig);
    response.statusCode = 204;
    response.end();
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, createHealthPayload(runtimeConfig), runtimeConfig);
    return;
  }

  if (url.pathname === "/api/green-ai-chat") {
    if (request.method !== "POST" && request.method !== "GET") {
      sendJson(response, 405, { ok: false, error: "method not allowed" }, runtimeConfig);
      return;
    }

    if (request.method === "GET") {
      sendJson(response, 200, createHealthPayload(runtimeConfig), runtimeConfig);
      return;
    }

    try {
      const body = await parseBody(request, 1024 * 1024);
      const result = await handleChatRequest(body || {}, runtimeConfig);
      sendJson(response, result.statusCode, result.payload, runtimeConfig);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, {
        ok: false,
        error: error && error.message ? error.message : "internal server error"
      }, runtimeConfig);
    }
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolvedPath = path.join(ROOT_DIR, pathname.replace(/^\/+/, ""));
  serveStaticFile(response, resolvedPath);
});

server.listen(PORT, () => {
  console.log(`Local freechat preview server listening on http://127.0.0.1:${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`Preview page: http://127.0.0.1:${PORT}/`);
});
