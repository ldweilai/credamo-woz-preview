(function () {
      const DEFAULT_CONFIG = {
        aiCondition: "sycophancy",
        topicFocus: "",
        model: "gpt-5.4-nano",
        apiProxyUrl: "/api/green-ai-chat",
        requestTimeoutMs: 60000,
        typingDelayMs: 1800,
        typingCharDelayMs: 24,
        typingJitterMs: 10,
        punctuationPauseMs: 160,
        maxTokens: 600,
        maxUserTurns: 0,
        initialGreeting: "你好，我是绿色AI讨论助手。你可以直接和我聊绿色AI相关问题。",
        inputPlaceholder: "请输入你想讨论的绿色AI问题",
        externalTargets: {
          chatHistory: "",
          lastReply: "",
          turnCount: "",
          condition: "",
          errorMessage: "",
          complete: ""
        }
      };

      function parseQueryConfig() {
        const params = new URLSearchParams(window.location.search);
        const config = {};
        if (params.has("aiCondition")) config.aiCondition = params.get("aiCondition");
        if (params.has("topicFocus")) config.topicFocus = params.get("topicFocus");
        if (params.has("model")) config.model = params.get("model");
        if (params.has("apiProxyUrl")) config.apiProxyUrl = params.get("apiProxyUrl");
        if (params.has("typingDelayMs")) config.typingDelayMs = Number(params.get("typingDelayMs"));
        if (params.has("maxUserTurns")) config.maxUserTurns = Number(params.get("maxUserTurns"));
        return config;
      }

      function findChatContext(rootDocument) {
        function collectFromDocument(doc) {
          if (!doc) return null;

          const chatBox = doc.getElementById("green-ai-chat-box");
          const userInput = doc.getElementById("green-ai-user-input");
          const sendBtn = doc.getElementById("green-ai-send-btn");
          const chatTip = doc.getElementById("green-ai-chat-tip");

          const fields = {
            chatHistory: doc.getElementById("green_ai_chat_history"),
            lastReply: doc.getElementById("green_ai_last_reply"),
            turnCount: doc.getElementById("green_ai_turn_count"),
            condition: doc.getElementById("green_ai_condition"),
            errorMessage: doc.getElementById("green_ai_error_message"),
            complete: doc.getElementById("green_ai_trial_complete")
          };

          if (chatBox && userInput && sendBtn && chatTip && fields.chatHistory && fields.lastReply && fields.turnCount && fields.condition && fields.errorMessage && fields.complete) {
            return {
              doc: doc,
              win: doc.defaultView || window,
              chatBox: chatBox,
              userInput: userInput,
              sendBtn: sendBtn,
              chatTip: chatTip,
              fields: fields
            };
          }

          const frames = doc.getElementsByTagName("iframe");
          for (let i = 0; i < frames.length; i += 1) {
            try {
              const frameDoc = frames[i].contentDocument;
              const found = collectFromDocument(frameDoc);
              if (found) return found;
            } catch (error) {
              // Ignore cross-origin frames and continue.
            }
          }

          return null;
        }

        return collectFromDocument(rootDocument);
      }

      function boot(attempt) {
        const pageConfig = window.CREDAMO_GREEN_AI_FREECHAT_CONFIG || {};
        const queryConfig = parseQueryConfig();
        const CONFIG = Object.assign({}, DEFAULT_CONFIG, pageConfig, queryConfig);

        const context = findChatContext(document);
        const chatBox = context && context.chatBox;
        const userInput = context && context.userInput;
        const sendBtn = context && context.sendBtn;
        const chatTip = context && context.chatTip;
        const fields = context && context.fields;
        const hostDocument = context && context.doc;
        const hostWindow = (context && context.win) || window;

        if (!context || !chatBox || !userInput || !sendBtn || !chatTip || !fields.chatHistory || !fields.lastReply || !fields.turnCount || !fields.condition || !fields.errorMessage || !fields.complete) {
          if ((attempt || 0) >= 120) {
            console.error("Green AI freechat init failed: required DOM nodes not found.");
            return;
          }
          setTimeout(function () {
            boot((attempt || 0) + 1);
          }, 250);
          return;
        }

        if (chatBox.getAttribute("data-green-ai-initialized") === "1") {
          return;
        }
        chatBox.setAttribute("data-green-ai-initialized", "1");

        let chatHistory = [];
        let userTurnCount = 0;
        let isLoading = false;

        function setTip(message) {
          chatTip.textContent = message;
        }

        function syncExternalField(selector, value) {
          if (!selector) return;
          const target = hostDocument.querySelector(selector) || document.querySelector(selector);
          if (!target) return;
          target.value = value;
          target.dispatchEvent(new hostWindow.Event("input", { bubbles: true }));
          target.dispatchEvent(new hostWindow.Event("change", { bubbles: true }));
        }

        function persistFields() {
          fields.chatHistory.value = JSON.stringify(chatHistory);
          fields.turnCount.value = String(userTurnCount);
          fields.condition.value = CONFIG.aiCondition;

          syncExternalField(CONFIG.externalTargets.chatHistory, fields.chatHistory.value);
          syncExternalField(CONFIG.externalTargets.lastReply, fields.lastReply.value);
          syncExternalField(CONFIG.externalTargets.turnCount, fields.turnCount.value);
          syncExternalField(CONFIG.externalTargets.condition, fields.condition.value);
          syncExternalField(CONFIG.externalTargets.errorMessage, fields.errorMessage.value);
          syncExternalField(CONFIG.externalTargets.complete, fields.complete.value);
        }

        function scrollChatToBottom() {
          chatBox.scrollTop = chatBox.scrollHeight;
        }

        function setButtonState(enabled) {
          sendBtn.disabled = !enabled;
          sendBtn.style.opacity = enabled ? "1" : "0.6";
          sendBtn.style.cursor = enabled ? "pointer" : "not-allowed";
        }

        function lockInputArea() {
          userInput.disabled = true;
          setButtonState(false);
        }

        function updateInputAvailability() {
          const maxTurns = Number(CONFIG.maxUserTurns) || 0;
          if (maxTurns > 0 && userTurnCount >= maxTurns) {
            fields.complete.value = "1";
            lockInputArea();
            setTip("已达到本轮对话上限。");
            persistFields();
            return;
          }

          userInput.disabled = false;
          setButtonState(!isLoading);
          userInput.placeholder = CONFIG.inputPlaceholder;
        }

        function createMessageBubble(message, isUser) {
          const row = hostDocument.createElement("div");
          row.style.display = "flex";
          row.style.flexDirection = "column";
          row.style.alignItems = isUser ? "flex-end" : "flex-start";
          row.style.marginBottom = "12px";

          const bubble = hostDocument.createElement("div");
          bubble.style.display = "inline-block";
          bubble.style.maxWidth = "78%";
          bubble.style.lineHeight = "1.7";
          bubble.style.wordWrap = "break-word";
          bubble.style.whiteSpace = "pre-wrap";
          bubble.style.padding = "10px 14px";
          bubble.style.fontSize = "14px";
          bubble.style.color = isUser ? "#fff" : "#222";
          bubble.style.background = isUser ? "#1677ff" : "#e9eef5";
          bubble.style.borderRadius = isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px";
          bubble.textContent = message || "";

          row.appendChild(bubble);
          chatBox.appendChild(row);
          scrollChatToBottom();
          return bubble;
        }

        function addTypingIndicator(text) {
          const row = hostDocument.createElement("div");
          row.id = "green-ai-typing-indicator";
          row.style.marginBottom = "12px";

          const bubble = hostDocument.createElement("div");
          bubble.style.display = "inline-block";
          bubble.style.padding = "10px 14px";
          bubble.style.background = "#e9eef5";
          bubble.style.color = "#666";
          bubble.style.borderRadius = "16px 16px 16px 4px";
          bubble.style.fontSize = "14px";
          bubble.textContent = text || "系统正在生成回复...";

          row.appendChild(bubble);
          chatBox.appendChild(row);
          scrollChatToBottom();
        }

        function removeTypingIndicator() {
          const node = hostDocument.getElementById("green-ai-typing-indicator");
          if (node) node.remove();
        }

        function wait(ms) {
          return new Promise(function (resolve) {
            setTimeout(resolve, ms);
          });
        }

        function getTypingStepDelay(character) {
          let delay = Number(CONFIG.typingCharDelayMs) || 24;
          const jitter = Number(CONFIG.typingJitterMs) || 10;
          const punctuationPause = Number(CONFIG.punctuationPauseMs) || 160;
          if (character === "\n") delay += 120;
          if ("，。！？；：,.!?;:".indexOf(character) !== -1) delay += punctuationPause;
          return delay + Math.floor(Math.random() * jitter);
        }

        async function typeAssistantReply(message) {
          const bubble = createMessageBubble("", false);
          for (let i = 0; i < message.length; i += 1) {
            const character = message.charAt(i);
            bubble.textContent += character;
            scrollChatToBottom();
            await wait(getTypingStepDelay(character));
          }
        }

        function formatApiErrorMessage(error) {
          const message = error && error.message ? error.message : "未知错误";
          if (message.indexOf("BLTCY_API_KEY is missing") !== -1) {
            return "代理服务已启动，但还没有配置柏拉图 API Key。请先设置 BLTCY_API_KEY。";
          }
          if (message.indexOf("BLTCY_BASE_URL is missing") !== -1) {
            return "代理服务已启动，但还没有配置柏拉图 Base URL。请先设置 BLTCY_BASE_URL。";
          }
          if (message.indexOf("Failed to fetch") !== -1) {
            return "当前连不到 API 服务。请检查 apiProxyUrl 是否填写正确。";
          }
          if (message.indexOf("Gateway error") !== -1) {
            return "柏拉图网关返回了错误：" + message;
          }
          return "请求失败：" + message;
        }

        async function requestChatReply(messages) {
        const controller = new AbortController();
        const timeoutId = setTimeout(function () {
          controller.abort();
        }, CONFIG.requestTimeoutMs);

        try {
          const response = await fetch(CONFIG.apiProxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              aiCondition: CONFIG.aiCondition,
              topicFocus: CONFIG.topicFocus,
              model: CONFIG.model,
              maxTokens: CONFIG.maxTokens,
              messages: messages
            })
          });

          const rawText = await response.text();
          let data = null;
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch (error) {
            data = { ok: false, error: rawText || "API returned non-JSON response" };
          }

          if (!response.ok || !data.ok) {
            throw new Error((data && data.error) || "API request failed");
          }
          return data;
        } finally {
          clearTimeout(timeoutId);
        }
        }

        async function handleSend() {
        if (isLoading) return;

        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        const maxTurns = Number(CONFIG.maxUserTurns) || 0;
        if (maxTurns > 0 && userTurnCount >= maxTurns) {
          return;
        }

        isLoading = true;
        setButtonState(false);
        fields.errorMessage.value = "";

        createMessageBubble(userMessage, true);
        chatHistory.push({ role: "user", content: userMessage });
        userTurnCount += 1;
        persistFields();

        userInput.value = "";
        userInput.disabled = true;

        try {
          setTip("系统正在思考...");
          addTypingIndicator("系统正在思考...");
          await wait(CONFIG.typingDelayMs);

          const data = await requestChatReply(chatHistory);
          const reply = data.reply || "";

          removeTypingIndicator();
          setTip("系统正在输入回复...");
          await typeAssistantReply(reply);

          chatHistory.push({ role: "assistant", content: reply });
          fields.lastReply.value = reply;
          persistFields();

          if ((Number(CONFIG.maxUserTurns) || 0) > 0 && userTurnCount >= Number(CONFIG.maxUserTurns)) {
            fields.complete.value = "1";
            lockInputArea();
            setTip("已达到本轮对话上限。");
          } else {
            userInput.disabled = false;
            userInput.focus();
            setTip("你可以继续追问，但范围需保持在绿色AI相关内容。");
          }
        } catch (error) {
          console.error(error);
          removeTypingIndicator();
          fields.errorMessage.value = error && error.message ? error.message : "chat request failed";
          createMessageBubble(formatApiErrorMessage(error), false);
          setTip("脚本运行出错，请重新输入并发送。");
          userInput.disabled = false;
        } finally {
          isLoading = false;
          updateInputAvailability();
          persistFields();
        }
        }

        sendBtn.addEventListener("click", handleSend);
        userInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSend();
          }
        });

        userInput.placeholder = CONFIG.inputPlaceholder;
        createMessageBubble(CONFIG.initialGreeting, false);
        fields.condition.value = CONFIG.aiCondition;
        persistFields();
        updateInputAvailability();
        setTip("当前只支持绿色AI相关自由对话。");
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          boot(0);
        });
      }
      boot(0);
    })();
