import * as chatOrchestrator from '../services/chatOrchestrator.js';
import { SERVER_MESSAGES, HTTP_STATUS } from '../constants/index.js';

function handleError(res, error) {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ error: error.message || SERVER_MESSAGES.ERRORS.CHAT_PROCESSING_FAILED });
}

/**
 * Handles user chat POST requests:
 * POST /api/user/chat
 * If streaming is requested (via body.stream or Accept: text/event-stream), delegates to chatStream.
 */
export async function chat(req, res) {
  const isStream = req.body?.stream === true || req.headers?.accept?.includes('text/event-stream');
  if (isStream) {
    return chatStream(req, res);
  }

  try {
    const { message } = req.body;
    const result = await chatOrchestrator.orchestrateChat(message);
    res.json(result);
  } catch (error) {
    console.error('[UserController] Chat error:', error.message);
    handleError(res, error);
  }
}

/**
 * Handles user chat SSE streaming POST requests:
 * POST /api/user/chat/stream or POST /api/user/chat with stream: true
 */
export async function chatStream(req, res) {
  const { message } = req.body || {};

  // Failures before stream starts are handled as normal HTTP errors
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED,
    });
  }

  // Set SSE response headers with proxy buffering disabled
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const abortController = new AbortController();

  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  const sendEvent = (event, data) => {
    if (res.writableEnded || res.closed || abortController.signal.aborted) {
      return;
    }
    const payload = JSON.stringify(data);
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
    if (typeof res.flush === 'function') {
      res.flush();
    }
  };

  try {
    await chatOrchestrator.orchestrateChatStream(message, sendEvent, {
      signal: abortController.signal,
    });
  } catch (error) {
    console.error('[UserController] Stream error:', error.message);
    if (!res.writableEnded && !abortController.signal.aborted) {
      sendEvent('error', {
        error: error.message || SERVER_MESSAGES.ERRORS.CHAT_PROCESSING_FAILED,
      });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
