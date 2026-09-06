
/* ============================================================
 * static-shim.js — 静态只读版垫片
 *
 * 作用：把看板对后端 /api/* 的请求映射到仓库内的静态 JSON 文件，
 *       使纯静态托管（GitHub Pages）也能展示完整看板。
 * 写入类请求（POST）一律返回「只读」提示，不做任何修改。
 * ============================================================ */
(function () {
  var MAP = {
    "/api/health": "api/health.json",
    "/api/edits": "api/edits.json",
    "/api/meta": "api/meta.json",
    "/api/orders": "api/orders.json",
    "/api/subs": "api/subs.json",
    "/api/users": "api/users.json",
    "/api/phone-whitelist": "api/phone-whitelist.json",
    "/api/log": "api/log.json",
    "/api/history": "api/history.json"
  };

  /* 写入类接口：静态托管下不存在后端，若放任原始 fetch 会返回 404，
     导致前端抛错或弹出「操作失败」。此处一律拦截，返回友好只读提示。 */
  var WRITE_ONLY = [
    "/api/save",
    "/api/sync-db",
    "/api/rebuild-orders",
    "/api/calc-amounts"
  ];

  function readonlyResp(msg) {
    return Promise.resolve(new Response(
      JSON.stringify({ ok: false, readonly: true, msg: msg }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));
  }

  function pathOf(u) {
    var s = String(u || "");
    if (s.indexOf("http") === 0) {
      try { return new URL(s, location.href).pathname; } catch (e) { return s; }
    }
    var p = s.split("?")[0].split("#")[0];
    // 页面里混用 "/api/users" 与 "api/users" 两种写法，统一补前导斜杠便于匹配
    if (p.charAt(0) !== "/") { p = "/" + p; }
    return p;
  }

  var orig = window.fetch ? window.fetch.bind(window) : null;
  if (!orig) return;

  window.fetch = function (input, init) {
    var url = (typeof input === "string") ? input : (input && input.url) || "";
    var p = pathOf(url);

    // 写入类优先拦截（无需静态文件，直接返回只读提示）
    if (WRITE_ONLY.indexOf(p) !== -1) {
      return readonlyResp("静态只读演示版，不支持写入/同步操作");
    }

    if (MAP[p]) {
      var method = (init && init.method) ? String(init.method).toUpperCase() : "GET";
      if (method !== "GET") {
        // 静态版只读：写入类操作返回友好提示，避免报错中断
        return readonlyResp("静态只读演示版，不支持写入操作");
      }
      return orig(MAP[p], { cache: "no-store" });
    }
    return orig(input, init);
  };

  /* 自动以「只读演示访客」身份登录。
     静态版没有登录页，若不预置会话，curUser 恒为 null，
     页面会在 renderToolbar2 -> permSummary 抛 TypeError 而白屏。 */
  (function autoLogin() {
    try {
      var LS_USERS = "rental_ledger_users_v3";
      var LS_SESSION = "rental_ledger_session_v3";
      var DEMO = [{
        user: "demo", name: "演示访客（只读）", pwd: "",
        role: "viewer", perms: { view: true, search: true }
      }];
      if (!localStorage.getItem(LS_USERS)) {
        localStorage.setItem(LS_USERS, JSON.stringify(DEMO));
      }
      if (!localStorage.getItem(LS_SESSION)) {
        localStorage.setItem(LS_SESSION, JSON.stringify({ user: "demo" }));
      }
    } catch (e) { /* 隐私模式下 localStorage 不可用，忽略 */ }
  })();

  console.log("[static-shim] 已启用：/api/* -> 静态 JSON（只读模式）");
})();
