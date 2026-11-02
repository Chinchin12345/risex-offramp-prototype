/* Demo state for the off-ramp prototype.
   Kept under its own localStorage key so it never reads, writes or clears the
   on-ramp demo (both GitHub Pages projects share the same origin). */
(function () {
  var KEY = 'risex-offramp-demo-v1';
  var TTL = 60 * 60 * 1000; // a stale demo older than an hour starts fresh

  // Illustrative numbers from Figma (section "3. Design - Off Ramp Flow") — not a real quote.
  var DEMO = {
    base: { equity: 23.72, collat: 23.70, available: 15.09, notional: 17.32 },
    rate: 26000,          // VND per USDC
    feePct: 0.01,         // Crossmint processing fee
    minUsdc: 1,
    defaultUsdc: 15,
    email: 'an@example.com',
    wallet: '...035a',
    bank: { code: 'ACB', name: 'ACB — Asia Commercial Bank', holder: 'NGUYEN VAN AN', number: '123456784821' }
  };

  function blank() {
    return { v: 1, updatedAt: Date.now(), withdrawn: 0, account: { signedIn: false, email: '', kyc: 'none', kycAck: false, bank: null }, order: null };
  }
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || s.v !== 1 || Date.now() - (s.updatedAt || 0) > TTL) return blank();
      return s;
    } catch (e) { return blank(); }
  }
  function write(s) {
    s.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function update(fn) { var s = read(); fn(s); return write(s); }
  function reset() {
    try { localStorage.removeItem(KEY); localStorage.setItem(KEY + ':reset', String(Date.now())); } catch (e) {}
  }
  function subscribe(cb) {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY || e.key === KEY + ':reset') cb(read());
    });
  }

  var r2 = function (n) { return Math.round(n * 100) / 100; };
  function quote(usdc) {
    var fee = r2(usdc * DEMO.feePct), converted = r2(usdc - fee);
    return { usdc: r2(usdc), fee: fee, converted: converted, vnd: Math.round(converted * DEMO.rate) };
  }
  var fmtUsdc = function (n) { return r2(n).toFixed(2); };
  var fmtUsd = function (n) { return '$' + r2(n).toFixed(2); };
  var fmtVnd = function (n) { return Math.round(n).toLocaleString('en-US'); };
  function last4(num) { return String(num).replace(/\D/g, '').slice(-4); }
  function newOrderId() {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', p = function () { var s = ''; for (var i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
    return 'ORD-' + p() + '-' + p();
  }

  window.DemoStore = {
    DEMO: DEMO, read: read, write: write, update: update, reset: reset, subscribe: subscribe,
    quote: quote, fmtUsdc: fmtUsdc, fmtUsd: fmtUsd, fmtVnd: fmtVnd, last4: last4, newOrderId: newOrderId, r2: r2
  };
})();
