/**
 * QuantDinger 前端错误监控模块 (Error Monitor)
 *
 * 覆盖:
 *   1. window.onerror        — 同步 JS 运行时错误
 *   2. unhandledrejection    — Promise 未捕获拒绝
 *   3. 资源加载失败          — script/style/img/error 事件
 *   4. 实盘下单失败专项上报  — reportTradeFailure()
 *   5. 策略执行崩溃专项上报  — reportStrategyCrash()
 *   6. 批量节流 + 离线队列    — 断网缓存,恢复后重发
 *
 * 集成:在 app 入口第一个 import,确保捕获后续所有错误。
 *   import './error_monitor.js'
 *
 * 后端:POST /api/v2/errors  body = { events: [...] }
 */

const ErrorMonitor = (() => {
  const QUEUE = [];
  const MAX_QUEUE = 50;
  const FLUSH_INTERVAL = 10000; // 10s 批量上报
  let flushTimer = null;
  let endpoint = '/api/v2/errors';
  let enabled = true;

  // ---- 环境上下文 ----
  const getContext = () => ({
    url: location.href,
    ua: navigator.userAgent,
    lang: navigator.language,
    ts: Date.now(),
    view: document.cookie.includes('qd_view=mobile') ? 'mobile' : 'desktop',
    app_version: window.__QD_VERSION__ || 'unknown',
  });

  // ---- 入队 ----
  function enqueue(event) {
    if (!enabled) return;
    event.context = getContext();
    if (QUEUE.length >= MAX_QUEUE) QUEUE.shift(); // 滚动覆盖
    QUEUE.push(event);
  }

  // ---- 上报(批量节流) ----
  async function flush() {
    if (QUEUE.length === 0) return;
    const batch = QUEUE.splice(0, QUEUE.length);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        credentials: 'include',
        keepalive: true, // 页面卸载时也能发出去
      });
      if (!res.ok && batch.length > 0) {
        // 服务端拒绝,放回队列尾部(避免无限重试导致堆积,只保留最近 20 条)
        QUEUE.push(...batch.slice(-20));
      }
    } catch (e) {
      // 网络失败,放回队列等待下次重试
      QUEUE.push(...batch.slice(-20));
    }
  }

  function startTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(flush, FLUSH_INTERVAL);
    // 页面隐藏/卸载时立刻 flush
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('beforeunload', flush);
  }

  // ---- 1. 同步运行时错误 ----
  window.addEventListener('error', (e) => {
    enqueue({
      type: 'runtime_error',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 2000) : null,
    });
  });

  // ---- 2. Promise 未捕获拒绝 ----
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    enqueue({
      type: 'unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error && reason.stack ? String(reason.stack).slice(0, 2000) : null,
    });
  });

  // ---- 3. 资源加载失败 ----
  window.addEventListener('error', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
      enqueue({
        type: 'resource_error',
        tag: target.tagName,
        src: target.src || target.href,
      });
    }
  }, true); // 捕获阶段才能抓资源错误

  // ---- 4. 实盘下单失败专项 ----
  function reportTradeFailure(payload) {
    enqueue({
      type: 'trade_failure',
      ...payload, // { strategy_id, symbol, side, notional, exchange, error_code, error_msg }
      severity: 'critical',
    });
    flush(); // 实盘失败立即上报,不等节流
  }

  // ---- 5. 策略执行崩溃专项 ----
  function reportStrategyCrash(payload) {
    enqueue({
      type: 'strategy_crash',
      ...payload, // { strategy_id, script_id, bar_time, error_msg, stack }
      severity: 'critical',
    });
    flush();
  }

  // ---- 公开 API ----
  return {
    init(opts = {}) {
      if (opts.endpoint) endpoint = opts.endpoint;
      if (opts.enabled === false) enabled = false;
      startTimer();
      // 恢复离线队列
      window.addEventListener('online', flush);
    },
    reportTradeFailure,
    reportStrategyCrash,
    flush,
    getQueueLength: () => QUEUE.length,
  };
})();

// 自动启动(默认 endpoint /api/v2/errors)
if (typeof window !== 'undefined') {
  ErrorMonitor.init();
  window.ErrorMonitor = ErrorMonitor; // 供其他模块调用
}

export default ErrorMonitor;
