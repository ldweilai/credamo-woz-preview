const { readRuntimeConfig, handleChatRequest, createHealthPayload } = require("../freechat/shared-chat-core.cjs");

function applyCorsHeaders(response, runtimeConfig) {
  response.setHeader("Access-Control-Allow-Origin", runtimeConfig.allowOrigin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

module.exports = async (request, response) => {
  const runtimeConfig = readRuntimeConfig(process.env);
  applyCorsHeaders(response, runtimeConfig);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method === "GET") {
    response.status(200).json(createHealthPayload(runtimeConfig));
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "method not allowed" });
    return;
  }

  try {
    const result = await handleChatRequest(request.body || {}, runtimeConfig);
    response.status(result.statusCode).json(result.payload);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      ok: false,
      error: error && error.message ? error.message : "internal server error"
    });
  }
};
