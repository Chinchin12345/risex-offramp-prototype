/* RISEx tab — off-ramp prototype (USDC → VND to a bank account, via Crossmint).
   Screens follow Figma section "3. Design - Off Ramp Flow" (101:58405). Happy path for a
   first-time bank withdrawal: 01 Trade → 02 Withdraw → 03 Cash out → 04a Sign in → 04b Email
   code → 05a–05d Verify identity → 06b No bank account yet → 07a–07c Add bank account →
   08 Review → 09a/09b Authorize (wallet) → 10.1–10.4 Status → 11 Funds sent → 12 Trade. */
(function () {
  var S = window.DemoStore, D = S.DEMO;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 60) : ms); }); };
  var pause = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function paintIcons(root) {
    $$('i[data-icon]', root).forEach(function (el) {
      if (el.firstChild) return;
      var svg = window.ICONS[el.getAttribute('data-icon')];
      if (svg) el.innerHTML = svg;
    });
  }

  /* ---------------- static trade data (from Figma 01) ---------------- */
  var ASKS = [['77,449.0','169.8','671.52K',300],['77,444.0','200.99K','671.35K',300],['77,436.0','3.69K','470.36K',210],['77,435.0','266.6','466.66K',210],['77,433.0','149.27K','466.40K',210],['77,428.0','557.4','317.12K',135],['77,427.0','8.33K','316.57K',135],['77,424.0','40.0','308.23K',135],['77,421.0','12.0','308.19K',135],['77,418.0','2.00K','308.18K',135],['77,416.0','46.8','306.18K',135],['77,415.0','595.6','306.13K',135],['77,413.0','148.21K','305.53K',135],['77,403.0','150.66K','157.32K',75],['77,399.0','4.35K','6.65K',45],['77,397.0','1.95K','2.30K',0],['77,385.0','349.9','349.9',0]];
  var BIDS = [['77,384.0','141.00K','141.00K',45],['77,383.0','1.38K','142.38K',60],['77,382.0','1.63K','144.02K',60],['77,381.0','4.99K','149.02K',60],['77,380.0','928.5','149.95K',60],['77,379.0','144.51K','294.47K',105],['77,377.0','5.00K','299.47K',105],['77,375.0','1.99K','301.47K',105],['77,373.0','46.8','301.51K',105],['77,371.0','695.5','302.21K',105],['77,368.0','773.6','302.98K',105],['77,366.0','9.99K','312.98K',120],['77,362.0','11.6','312.99K',120]];
  var TICKER = [['BTC','3.14%',0],['HYPE','15.34%',1],['ETH','4.48%',0],['XRP','2.81%',0],['XMR','1.04%',1],['SOL','3.41%',0],['LIT','2.45%',0],['VVV','4.12%',0],['TAO','6.58%',0],['BNB','6.51%',0],['ZEC','0.34%',0],['NEAR','1.19%',0],['AERO','7.82%',0],['PUMP','6.01%',0],['ZRO','3.24%',1],['ENA','4.18%',0]];
  var RISK = ['#15b79e','#1eb698','#26b692','#2fb58c','#37b586','#40b480','#48b47a','#51b374','#59b36e','#62b268','#6ab262','#73b15c','#7bb156','#84b050','#8cb04a','#95af44','#9daf3e','#a6ae38','#aeae32','#b7ad2c','#bfad26','#c8ac20','#d0ac1a','#d9ab14','#e1ab0e','#eaaa08','#eba50a','#eba00c','#ec9b0e','#ed960f','#ed9111','#ee8c13','#ef8715','#ef8217','#f07d19','#f1781a','#f1731c','#f26e1e','#f36820','#f46322','#f45e24','#f55925','#f65427','#f64f29','#f74a2b','#f8452d','#f8402f','#f93b30','#fa3632','#fa3134'];

  function renderStatic() {
    var row = function (r, side) { return '<div class="ob-row ' + side + '"><i class="bar" style="width:' + r[3] + 'px"></i><span class="p">' + r[0] + '</span><span>' + r[1] + '</span><span>' + r[2] + '</span></div>'; };
    $('#asks').innerHTML = ASKS.map(function (r) { return row(r, 'ask'); }).join('');
    $('#bids').innerHTML = BIDS.map(function (r) { return row(r, 'bid'); }).join('');
    $('#ticker').innerHTML = TICKER.map(function (t) {
      return '<span class="tk"><span class="sym">' + t[0] + '</span><span class="' + (t[2] ? 'up' : 'dn') + '">' + t[1] + '</span><i data-icon="' + (t[2] ? 'trend-up' : 'trend-down') + '" class="i12 ' + (t[2] ? 'up' : 'dn') + '"></i></span>';
    }).join('');
    $('#risk').innerHTML = RISK.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('');
  }

  /* ---------------- balances (withdrawals reduce them) ---------------- */
  var shown = null; // withdrawn USDC the Trade screen currently reflects
  function figures(w) {
    var eq = D.base.equity - w;
    return { equity: S.fmtUsd(eq), collat: S.fmtUsd(D.base.collat - w), available: S.fmtUsdc(D.base.available - w) + ' USDC', leverage: (D.base.notional / eq).toFixed(2) + 'x' };
  }
  function paintBalances(w) {
    var f = figures(w);
    $$('[data-bind]').forEach(function (el) { var k = el.getAttribute('data-bind'); if (f[k] != null) el.textContent = f[k]; });
  }
  function animateBalances(to) {
    var from = shown == null ? to : shown; shown = to;
    if (from === to || reduced) { paintBalances(to); return; }
    var t0 = performance.now(), dur = 700;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      paintBalances(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function availableNow() { return S.r2(D.base.available - S.read().withdrawn); }

  /* ---------------- feedback ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2000);
  }
  function nudge(el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.ob, .ob-field');
    if (!el) return;
    e.preventDefault();
    nudge(el);
    toast('“' + (el.getAttribute('data-ob') || 'This control') + '” is outside this demo flow');
  });

  /* ---------------- demo step indicator ---------------- */
  var STEPS = {
    trade: '01 · Trade — click Withdraw', dest: '02 · Choose To Bank Account', amount: '03 · Cash out — enter an amount',
    signin: '04a · Sign in with email', code: '04b · Enter any 6 digits (e.g. 482917)', kycReq: '05a · Verify identity',
    kycStep: '05b · Submit for review (placeholder)', kycProgress: '05c · Crossmint review — auto-approves', kycDone: '05d · Verified — Continue',
    bankNone: '06b · Add bank account', bankSaved: '06 · Use your saved account', bankForm: '07a · Bank details — Save and continue',
    bankCheck: '07b · Checking bank account…', bankReady: '07c · Bank account ready — Continue', review: '08 · Tick the terms, Confirm withdrawal',
    prep: '09a · Preparing funds…', wallet: '09b · Approve in the wallet pane (Xác nhận)', status: '10 · Status — time compressed for the demo',
    result: '11 · Funds sent — Back to Trade', after: '12 · Withdrawal done · Restart to replay'
  };
  function stepLabel(k) { $('#demoStep').textContent = STEPS[k] || ''; }

  /* ---------------- flow model ---------------- */
  var F = { usdc: D.defaultUsdc, email: D.email, draft: null, quoteId: null, orderId: null };
  function bankOf(b) { return b || F.draft || D.bank; }
  function bankCode(b) { return b.name.split(' — ')[0]; }
  function fill(root) {
    var st = S.read(), o = st.order && st.order.id === F.orderId ? st.order : null;
    var q = o || S.quote(F.usdc), b = o ? o.bank : bankOf(st.account.bank);
    var map = {
      usdc: S.fmtUsdc(q.usdc), usdcU: S.fmtUsdc(q.usdc) + ' USDC', avail: S.fmtUsdc(availableNow()) + ' USDC', equity: S.fmtUsd(D.base.equity - st.withdrawn),
      email: F.email, fee: '− ' + S.fmtUsdc(q.fee) + ' USDC', converted: S.fmtUsdc(q.converted) + ' USDC', rate: '1 USDC = ' + S.fmtVnd(D.rate) + ' VND',
      vnd: S.fmtVnd(q.vnd) + ' VND', bankName: b.name, bankShort: bankCode(b) + ' •••• ' + S.last4(b.number), bankFull: b.name + ' •••• ' + S.last4(b.number),
      holder: b.holder, orderId: o ? o.id : ''
    };
    $$('[data-f]', root).forEach(function (el) { var k = el.getAttribute('data-f'); if (map[k] != null) el.textContent = map[k]; });
  }

  /* ---------------- modal + view stack ---------------- */
  var layer = $('#layer'), app = $('#app'), flow = $('#flow'), body = $('#flowBody'), hdr = $('#flowHeader');
  var current = null, stack = [], lastFocus = null, view = null, heightTimer, timers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function openLayer() {
    if (!layer.hidden) return;
    lastFocus = document.activeElement;
    layer.hidden = false; app.inert = true;
    requestAnimationFrame(function () { layer.classList.add('is-open'); });
  }
  function closeLayer(after) {
    clearTimers(); hideWallet();
    layer.classList.remove('is-open');
    flow.classList.remove('is-in'); flow.classList.add('is-out');
    setTimeout(function () {
      layer.hidden = true; app.inert = false;
      flow.hidden = true; flow.classList.remove('is-out'); flow.style.height = '';
      body.innerHTML = ''; view = null; current = null; stack = [];
      stepLabel(S.read().withdrawn > 0 ? 'after' : 'trade');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      if (after) after();
    }, reduced ? 10 : 240);
  }
  function measure() { var h = flow.style.height; flow.style.height = 'auto'; var to = flow.offsetHeight; flow.style.height = h; return to; }
  function animateHeight(from) {
    var to = measure();
    if (from === to) return;
    flow.style.height = from + 'px'; void flow.offsetWidth; flow.style.height = to + 'px';
    clearTimeout(heightTimer); heightTimer = setTimeout(function () { flow.style.height = ''; }, reduced ? 10 : 280);
  }
  // Runs a DOM change inside the open view and animates the modal to its new height.
  function resize(mutate) { var from = flow.offsetHeight; mutate(); if (!flow.hidden) animateHeight(from); }

  function go(name, opt) {
    opt = opt || {};
    clearTimers();
    if (current && !opt.noPush) stack.push(current);
    var node = $('#v-' + name).content.firstElementChild.cloneNode(true);
    paintIcons(node); fill(node);
    var fresh = flow.hidden, from = fresh ? 0 : flow.offsetHeight, old = body.firstElementChild;
    if (old) { if (reduced) old.remove(); else { old.classList.add('is-leaving'); old.inert = true; setTimeout(function () { old.remove(); }, 150); } }
    body.appendChild(node); view = node;
    $('#flowTitle').textContent = node.getAttribute('data-title');
    var noBack = node.hasAttribute('data-noback') || !stack.length;
    $('#backBtn').hidden = noBack; hdr.classList.toggle('no-back', noBack);
    current = name; stepLabel(name);
    if (fresh) {
      openLayer();
      flow.hidden = false; flow.style.height = ''; flow.classList.remove('is-out'); void flow.offsetWidth;
      requestAnimationFrame(function () { flow.classList.add('is-in'); });
    } else {
      node.classList.add('is-entering'); if (opt.back) node.classList.add('from-back');
      animateHeight(from);
    }
    if (INIT[name]) INIT[name](node, opt);
    var f = opt.focus !== undefined ? opt.focus : FOCUS[name];
    setTimeout(function () {
      var el = f === null ? flow : (f ? $(f, node) : ($('.btn.buy:not(:disabled)', node) || $('.option:not(.ob)', node) || $('.btn', node)));
      if (el && el.focus) el.focus({ preventScroll: true });
    }, fresh ? 80 : 40);
  }
  function back() {
    if (!stack.length) return;
    var prev = stack.pop();
    go(prev, { noPush: true, back: true });
  }
  var FOCUS = { amount: '#amt', signin: '#email', code: '.otp-d', bankForm: '#holder', auth: null, status: null };

  /* ---------------- routing between steps (follows the Figma arrows) ---------------- */
  // After Cash out: sign-in, then identity, then the bank step. A returning session skips
  // what is already done (Figma skip arrows 03 ⇢ 05a, 03 ⇢ 06, 06 ⇢ 08).
  function afterAmount() {
    var a = S.read().account;
    if (!a.signedIn) return 'signin';
    if (a.kyc === 'none') return 'kycReq';
    if (a.kyc === 'submitted') return 'kycProgress';
    if (!a.kycAck) return 'kycDone';
    return a.bank ? 'bankSaved' : 'bankNone';
  }
  function checkpoint() { stack = ['dest', 'amount']; }

  /* ---------------- per-step behaviour ---------------- */
  function busy(btn, ms) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); return wait(ms); }
  function setCollapsed(el, off) { el.classList.toggle('is-off', off); el.setAttribute('aria-hidden', off ? 'true' : 'false'); }
  function setSteps(node, states) {
    Object.keys(states).forEach(function (k) {
      var li = $('.sstep[data-k="' + k + '"]', node); if (!li) return;
      var s = states[k], st = s.s || s;
      li.setAttribute('data-state', st);
      if (s.label) $('b', li).textContent = s.label;
      var cap = $('small', li); if (cap) cap.textContent = s.cap || '';
    });
  }
  function whenVisible() {
    return new Promise(function (res) {
      if (!document.hidden) return res(false);
      function on() { if (!document.hidden) { document.removeEventListener('visibilitychange', on); res(true); } }
      document.addEventListener('visibilitychange', on);
    });
  }

  var INIT = {
    dest: function (node) {
      $('#optBank', node).addEventListener('click', function () {
        this.classList.add('is-selected');
        setTimeout(function () { go('amount'); }, reduced ? 0 : 140);
      });
    },

    amount: function (node) {
      var inp = $('#amt', node), box = $('#amtBox', node), err = $('#amtErr', node), btn = $('#amountContinue', node);
      var valids = $$('[data-when="valid"]', node), invalids = $$('[data-when="invalid"]', node);
      inp.value = F.usdc ? S.fmtUsdc(F.usdc) : '';
      function check(silent) {
        var raw = inp.value.trim(), v = Number(raw), max = availableNow(), msg = '';
        var empty = !raw || !(v > 0);
        if (!empty && v < D.minUsdc) msg = 'Error: Minimum withdrawal is ' + S.fmtUsdc(D.minUsdc) + ' USDC.';
        else if (!empty && v > max) msg = 'Error: Amount exceeds available to withdraw (' + S.fmtUsdc(max) + ' USDC). Enter ' + S.fmtUsdc(max) + ' or less.';
        var ok = !empty && !msg;
        var apply = function () {
          box.classList.toggle('is-error', !!msg);
          err.textContent = msg;
          invalids.forEach(function (c) { setCollapsed(c, !msg); });
          valids.forEach(function (c) { setCollapsed(c, !!msg); });
          $('[data-f="est"]', node).textContent = ok ? '≈ ' + S.fmtVnd(S.quote(v).vnd) + ' VND' : '—';
          btn.disabled = !ok;
        };
        if (silent) apply(); else resize(apply);
        if (ok) F.usdc = S.r2(v);
        return ok;
      }
      inp.addEventListener('input', function () {
        var v = inp.value.replace(/[^\d.]/g, ''), i = v.indexOf('.');
        if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
        v = v.replace(/^0+(?=\d)/, '').slice(0, 9);
        if (inp.value !== v) inp.value = v;
        check();
      });
      inp.addEventListener('blur', function () { if (Number(inp.value) > 0) { inp.value = S.fmtUsdc(Number(inp.value)); } });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !btn.disabled) btn.click(); });
      $('#maxBtn', node).addEventListener('click', function () { inp.value = S.fmtUsdc(availableNow()); check(); inp.focus(); });
      btn.addEventListener('click', function () {
        if (!check()) return;
        busy(btn, 450).then(function () { go(afterAmount()); });
      });
      check(true);
    },

    signin: function (node) {
      var inp = $('#email', node), err = $('#emailErr', node), btn = $('#signinContinue', node), wrap = err.parentNode;
      inp.value = F.email; setCollapsed(wrap, true);
      function ok() { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim()); }
      function show(msg) { resize(function () { inp.parentNode.classList.toggle('is-error', !!msg); err.textContent = msg; setCollapsed(wrap, !msg); }); }
      inp.addEventListener('input', function () { if (err.textContent && ok()) show(''); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
      btn.addEventListener('click', function () {
        if (!ok()) { show('Enter a valid email address.'); inp.focus(); return; }
        F.email = inp.value.trim();
        busy(btn, 600).then(function () { go('code'); });
      });
    },

    code: function (node) {
      var ds = $$('.otp-d', node), btn = $('#verifyBtn', node);
      function code() { return ds.map(function (d) { return d.value; }).join(''); }
      function sync() { btn.disabled = code().length !== 6; }
      ds.forEach(function (d, i) {
        d.addEventListener('input', function () {
          var v = d.value.replace(/\D/g, '');
          if (v.length > 1) { spread(v, i); return; }
          d.value = v; d.classList.toggle('is-filled', !!v);
          if (v && ds[i + 1]) ds[i + 1].focus();
          sync();
          if (code().length === 6) btn.focus();
        });
        d.addEventListener('keydown', function (e) {
          if (e.key === 'Backspace' && !d.value && ds[i - 1]) { ds[i - 1].value = ''; ds[i - 1].focus(); sync(); e.preventDefault(); }
          else if (e.key === 'ArrowLeft' && ds[i - 1]) { ds[i - 1].focus(); e.preventDefault(); }
          else if (e.key === 'ArrowRight' && ds[i + 1]) { ds[i + 1].focus(); e.preventDefault(); }
          else if (e.key === 'Enter' && !btn.disabled) btn.click();
        });
        d.addEventListener('paste', function (e) { var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, ''); if (t) { e.preventDefault(); spread(t, i); } });
        d.addEventListener('focus', function () { d.select(); });
      });
      function spread(t, from) {
        for (var k = 0; k < t.length && from + k < 6; k++) { ds[from + k].value = t[k]; ds[from + k].classList.add('is-filled'); }
        var next = ds[Math.min(from + t.length, 5)]; sync();
        (code().length === 6 ? btn : next).focus();
      }
      $('#resendBtn', node).addEventListener('click', function () { toast('Demo: a new code would be sent — any 6 digits work'); });
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        busy(btn, 700).then(function () {
          S.update(function (s) { s.account.signedIn = true; s.account.email = F.email; });
          checkpoint(); go(afterAmount(), { noPush: true });
        });
      });
    },

    kycReq: function (node) {
      $('#kycStart', node).addEventListener('click', function () { go('kycStep'); });
    },

    kycStep: function (node) {
      var b = $('#kycSubmit', node);
      b.addEventListener('click', function () {
        busy(b, 650).then(function () {
          S.update(function (s) { s.account.kyc = 'submitted'; s.account.kycAt = Date.now(); });
          checkpoint(); go('kycProgress', { noPush: true });
        });
      });
    },

    kycProgress: function (node) {
      var ssteps = $('.ssteps', node), refresh = $('#kycRefresh', node), done = false;
      ssteps.classList.add('no-anim');
      setSteps(node, { submitted: 'done', review: { s: 'active', cap: 'Status: in review' }, enabled: 'idle' });
      function approve() {
        if (done) return; done = true;
        S.update(function (s) { if (s.account.kyc === 'submitted') s.account.kyc = 'verified'; });
        ssteps.classList.remove('no-anim');
        resize(function () { setSteps(node, { review: 'done' }); });
        later(function () { setSteps(node, { enabled: 'done' }); }, reduced ? 250 : 450);
        later(function () { go('kycDone', { noPush: true }); }, reduced ? 700 : 1100);
      }
      var kycAt = S.read().account.kycAt || Date.now(), left = Math.max(1200, 3200 - (Date.now() - kycAt));
      later(function () { whenVisible().then(function (was) { return was ? pause(600) : null; }).then(approve); }, left);
      refresh.addEventListener('click', function () { if (done) return; busy(refresh, 500).then(function () { refresh.classList.remove('is-loading'); approve(); }); });
      $('#kycClose', node).addEventListener('click', function () { closeLayer(); });
    },

    kycDone: function (node) {
      $('#kycContinue', node).addEventListener('click', function () {
        var s = S.update(function (st) { st.account.kycAck = true; });
        checkpoint(); go(s.account.bank ? 'bankSaved' : 'bankNone', { noPush: true });
      });
    },

    bankNone: function (node) {
      $('#addBank', node).addEventListener('click', function () { go('bankForm'); });
    },

    bankSaved: function (node) {
      var b = S.read().account.bank, list = $('#savedList', node);
      list.innerHTML = '<button class="option" role="radio" aria-checked="true"><span class="o-ic"><i data-icon="building-library" class="i20"></i></span><span class="o-tx"><b>' + bankCode(b) + ' — ' + b.name.split(' — ')[1] + ' •••• ' + S.last4(b.number) + '</b><small>' + b.holder + ' · VND · Ready</small></span><span class="radio" aria-hidden="true"></span></button>';
      paintIcons(list);
      $('#savedContinue', node).addEventListener('click', function () { F.draft = b; go('review'); });
    },

    bankForm: function (node) {
      var d = F.draft || D.bank, holder = $('#holder', node), acct = $('#acctNo', node), help = $('#holderHelp', node), aerr = $('#acctErr', node), save = $('#bankSave', node);
      var BANKS = ['ACB — Asia Commercial Bank', 'VCB — Vietcombank', 'TCB — Techcombank', 'MB — MB Bank', 'BIDV — BIDV'];
      var bankName = d.name;
      holder.value = d.holder; acct.value = group(d.number); setCollapsed(aerr.parentNode, true);
      function group(n) { return String(n).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '); }
      holder.addEventListener('input', function () {
        var p = holder.selectionStart, v = holder.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/ {2,}/g, ' ');
        if (v !== holder.value) { holder.value = v; try { holder.setSelectionRange(p, p); } catch (e) {} }
        if (holder.parentNode.classList.contains('is-error') && v.trim().length >= 3) setHolderErr('');
      });
      acct.addEventListener('input', function () {
        var digits = acct.value.replace(/\D/g, '').slice(0, 19); acct.value = group(digits);
        if (aerr.textContent && digits.length >= 8) setAcctErr('');
      });
      function setHolderErr(m) { resize(function () { holder.parentNode.classList.toggle('is-error', !!m); help.classList.toggle('err', !!m); help.textContent = m || help.getAttribute('data-default'); }); }
      function setAcctErr(m) { resize(function () { acct.parentNode.classList.toggle('is-error', !!m); aerr.textContent = m; setCollapsed(aerr.parentNode, !m); }); }
      // bank dropdown (listbox)
      var trig = $('#bankTrigger', node), list = $('#bankList', node), active = 0;
      list.innerHTML = BANKS.map(function (n, i) { return '<li role="option" id="bk' + i + '" aria-selected="' + (n === bankName) + '">' + n + '</li>'; }).join('');
      function openDd() { list.hidden = false; trig.setAttribute('aria-expanded', 'true'); active = Math.max(0, BANKS.indexOf(bankName)); mark(); list.focus({ preventScroll: true }); }
      function closeDd(focus) { list.hidden = true; trig.setAttribute('aria-expanded', 'false'); if (focus) trig.focus(); }
      function mark() { $$('li', list).forEach(function (li, i) { li.classList.toggle('is-active', i === active); }); list.setAttribute('aria-activedescendant', 'bk' + active); }
      function pick(i) { bankName = BANKS[i]; $('[data-f="bankName"]', node).textContent = bankName; $$('li', list).forEach(function (li, k) { li.setAttribute('aria-selected', String(k === i)); }); closeDd(true); }
      trig.addEventListener('click', function () { list.hidden ? openDd() : closeDd(true); });
      list.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) pick($$('li', list).indexOf(li)); });
      list.addEventListener('mousemove', function (e) { var li = e.target.closest('li'); if (li) { active = $$('li', list).indexOf(li); mark(); } });
      list.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { active = Math.min(BANKS.length - 1, active + 1); mark(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); mark(); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { pick(active); e.preventDefault(); }
        else if (e.key === 'Escape' || e.key === 'Tab') { closeDd(e.key === 'Escape'); if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } }
      });
      trig.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { openDd(); e.preventDefault(); } });
      node.addEventListener('mousedown', function (e) { if (!list.hidden && !e.target.closest('#bankDd')) closeDd(false); });
      save.addEventListener('click', function () {
        var h = holder.value.trim(), n = acct.value.replace(/\D/g, ''), bad = false;
        if (h.length < 3) { setHolderErr('Enter the account holder’s full name.'); bad = true; }
        if (n.length < 8) { setAcctErr('Enter a valid account number (8–19 digits).'); bad = true; }
        if (bad) return;
        F.draft = { code: bankName.split(' — ')[0], name: bankName, holder: h, number: n };
        busy(save, 500).then(function () { go('bankCheck'); });
      });
    },

    bankCheck: function (node) {
      var cont = $('#bankContinue', node), saved = S.read().account.bank;
      function ready(animate) {
        var hero = $('.hero', node);
        var apply = function () {
          hero.classList.add('ok'); $('.hero-ic', hero).innerHTML = '<i data-icon="check-circle" class="i24"></i>'; paintIcons(hero);
          $('h3', hero).textContent = 'Bank account ready';
          $('p', hero).textContent = $('[data-f="bankShort"]', node).textContent + ' · ' + bankOf(S.read().account.bank).holder + ' can receive VND.';
          setSteps(node, { details: 'done', partner: { s: 'done', label: 'Checked with payout partner' }, ready: 'done' });
          $('[data-hide-ready]', node).hidden = true;
          cont.disabled = false;
        };
        if (animate) resize(apply); else apply();
        stepLabel('bankReady');
        checkpoint(); // the account is saved: Back now returns to Cash out, and Back from Review returns here
      }
      if (saved && F.draft && saved.number === F.draft.number && saved.name === F.draft.name) {
        $('.ssteps', node).classList.add('no-anim'); $('.hero', node).classList.add('no-anim'); ready(false);
      } else {
        $('.ssteps', node).classList.add('no-anim');
        setSteps(node, { details: 'done', partner: { s: 'active', cap: 'Status: pending' }, ready: 'idle' });
        later(function () {
          whenVisible().then(function (was) { return was ? pause(600) : null; }).then(function () {
            $('.ssteps', node).classList.remove('no-anim');
            S.update(function (s) { s.account.bank = F.draft; });
            resize(function () { setSteps(node, { partner: { s: 'done', label: 'Checked with payout partner' } }); });
            later(function () { setSteps(node, { ready: 'done' }); }, reduced ? 200 : 380);
            later(function () { ready(true); cont.focus({ preventScroll: true }); }, reduced ? 400 : 760);
          });
        }, 2000);
      }
      cont.addEventListener('click', function () { go('review'); });
    },

    review: function (node) {
      var agree = $('#agree', node), conf = $('#confirmWithdraw', node), timerEl = $('[data-f="timer"]', node), left = 600;
      F.draft = F.draft || S.read().account.bank;
      fill(node);
      function tick() {
        left -= 1;
        if (left <= 0) { left = 600; toast('Quote refreshed — same amounts'); }
        timerEl.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
        later(tick, 1000);
      }
      later(tick, 1000);
      agree.addEventListener('change', function () { conf.disabled = !agree.checked; });
      $('#reviewBack', node).addEventListener('click', back);
      conf.addEventListener('click', function () {
        if (!agree.checked) return;
        F.quoteId = 'Q' + Date.now();
        stack = []; go('auth', { noPush: true });
      });
    },

    auth: function (node) {
      $('.ssteps', node).classList.add('no-anim');
      setSteps(node, { quote: 'done', prep: 'active', third: 'idle' });
      later(function () {
        whenVisible().then(function (was) { return was ? pause(500) : null; }).then(function () {
          $('.ssteps', node).classList.remove('no-anim');
          resize(function () {
            $('[data-hero="prep"]', node).hidden = true; $('[data-hero="wallet"]', node).hidden = false;
            $('[data-auth="prep"]', node).hidden = true; $('[data-auth="wallet"]', node).hidden = false;
            setSteps(node, { prep: { s: 'active', label: 'Waiting for wallet confirmation' }, third: { s: 'idle', label: 'USDC transfer' } });
          });
          current = 'wallet'; stepLabel('wallet');
          later(showWallet, reduced ? 0 : 260);
        });
      }, 1800);
      stepLabel('prep');
    },

    status: function (node) {
      renderStatus(node, S.read().order.stage, false);
      $('#statusBack', node).addEventListener('click', function () {
        var o = S.read().order;
        if (o && o.stage >= 3) finish();
        else { nudge(this); toast('Closing while it processes is outside this demo — the status keeps updating here'); }
      });
      runStatus();
    },

    result: function (node) {
      $('#resultBack', node).addEventListener('click', finish);
    }
  };

  /* ---------------- 09b · wallet pane ---------------- */
  var wallet = $('#wallet');
  function showWallet() {
    var q = S.quote(F.usdc), vi = function (n) { return S.fmtUsdc(n).replace('.', ','); };
    $('[data-w="usdc"]', wallet).textContent = '− ' + vi(q.usdc);
    $('[data-w="usd"]', wallet).textContent = vi(q.usdc) + ' US$';
    $('[data-w="origin"]', wallet).textContent = location.host || 'RISEx';
    var b = $('#walletConfirm'); b.classList.remove('is-loading'); b.disabled = false;
    wallet.hidden = false; void wallet.offsetWidth;
    requestAnimationFrame(function () { wallet.classList.add('is-in'); });
    setTimeout(function () { b.focus({ preventScroll: true }); }, 120);
  }
  function hideWallet() {
    if (wallet.hidden) return;
    wallet.classList.remove('is-in');
    setTimeout(function () { wallet.hidden = true; }, reduced ? 10 : 240);
  }
  $('#walletConfirm').addEventListener('click', function () {
    var b = this; if (b.disabled) return; b.disabled = true;
    busy(b, 800).then(function () {
      var o = createOrder();
      hideWallet();
      if (!o) return;
      F.orderId = o.id;
      setSteps(view, { prep: { s: 'done', label: 'Confirmed in wallet' }, third: 'active' });
      wait(450).then(function () { go('status', { noPush: true }); });
    });
  });
  // Creates the withdrawal and takes the USDC off the trading balance — exactly once per confirmed quote.
  function createOrder() {
    var made = null;
    var s = S.update(function (st) {
      if (st.order && st.order.quoteId === F.quoteId) { made = st.order; return; }
      if (st.order && !st.order.ack) return; // another withdrawal is still open
      var q = S.quote(F.usdc), b = F.draft || st.account.bank;
      if (q.usdc > S.r2(D.base.available - st.withdrawn)) return;
      st.order = { id: S.newOrderId(), quoteId: F.quoteId, usdc: q.usdc, fee: q.fee, converted: q.converted, vnd: q.vnd, bank: b, createdAt: Date.now(), stage: 0, resultShown: false, ack: false };
      st.withdrawn = S.r2(st.withdrawn + q.usdc);
      made = st.order;
    });
    if (!made) toast('This withdrawal could not be created — restart the demo');
    return made && s.order;
  }

  /* ---------------- 10.1 – 10.4 status ---------------- */
  function etaText(o) {
    var d = new Date(o.createdAt), day = d.getDay();
    if (day === 6) d.setDate(d.getDate() + 2); else if (day === 0) d.setDate(d.getDate() + 1);
    var end = new Date(d), n = 0;
    while (n < 2) { end.setDate(end.getDate() + 1); if (end.getDay() !== 0 && end.getDay() !== 6) n++; }
    var f = function (x) { return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    return 'Estimated ' + f(d) + ' – ' + f(end) + ', ' + end.getFullYear();
  }
  function renderStatus(node, stage, animate) {
    var o = S.read().order, b = o.bank, short = bankCode(b) + ' •••• ' + S.last4(b.number);
    var states = [
      { created: 'done', transfer: { s: 'active', label: 'Confirming USDC transfer', cap: 'Waiting for network confirmations' }, received: 'idle', bank: { s: 'idle', label: 'Bank transfer' }, sent: 'idle' },
      { created: 'done', transfer: { s: 'done', label: 'USDC transfer confirmed' }, received: { s: 'done', cap: 'Crossmint received ' + S.fmtUsdc(o.usdc) + ' USDC' }, bank: { s: 'active', label: 'Bank transfer', cap: 'Starting payout to ' + short }, sent: 'idle' },
      { created: 'done', transfer: { s: 'done', label: 'USDC transfer confirmed' }, received: 'done', bank: { s: 'active', label: 'Bank transfer in progress', cap: 'Sending ' + S.fmtVnd(o.vnd) + ' VND to ' + short }, sent: 'idle' },
      { created: 'done', transfer: { s: 'done', label: 'USDC transfer confirmed' }, received: 'done', bank: { s: 'done', label: 'Bank transfer' }, sent: { s: 'done', cap: 'Sent by the payout bank' } }
    ][stage];
    var apply = function () {
      $('.ssteps', node).classList.toggle('no-anim', !animate);
      setSteps(node, states);
      $$('.collapsible[data-stage]', node).forEach(function (c) { setCollapsed(c, c.getAttribute('data-stage').split(' ').indexOf(String(stage)) < 0); });
      $('[data-f="eta"]', node).textContent = stage >= 2 ? etaText(o) : 'Checking estimated arrival…';
      $('[data-f="closeNote"]', node).textContent = stage >= 3 ? 'Funds sent. You can find this withdrawal any time in Portfolio → Transactions.' : 'You can close this window. Track your withdrawal in Portfolio → Transactions.';
      node.classList.toggle('g12', stage === 1 || stage === 2);
      $('[data-receive]', node).classList.toggle('compact', stage >= 3); // Figma 10.4 shows “You receive” as a regular row
    };
    if (animate) resize(apply); else apply();
  }
  var running = false;
  var HOLD = reduced ? [1100, 1100, 1300, 900] : [1700, 1700, 1900, 1300]; // time spent on 10.1 … 10.4
  function runStatus() {
    if (running) return; running = true;
    (function loop() {
      var o = S.read().order;
      if (!o || o.id !== F.orderId || current !== 'status') { running = false; return; }
      var stage = o.stage;
      // the next step is only applied while this tab is visible, so the user sees each one complete
      pause(HOLD[stage]).then(whenVisible).then(function (was) { return was ? pause(700) : null; }).then(function () {
        if (current !== 'status') { running = false; return; }
        if (stage >= 3) { running = false; showResult(); return; }
        var s = S.update(function (st) { if (st.order && st.order.id === o.id && st.order.stage === stage) st.order.stage = stage + 1; });
        renderStatus(view, s.order.stage, true);
        loop();
      });
    })();
  }

  /* ---------------- 11 · result, 12 · back on Trade ---------------- */
  function showResult() {
    S.update(function (st) { if (st.order && st.order.id === F.orderId) st.order.resultShown = true; });
    go('result', { noPush: true });
  }
  function finish() {
    if (current !== 'result' && current !== 'status') return;
    var s = S.update(function (st) { if (st.order && st.order.id === F.orderId) { st.order.resultShown = true; st.order.ack = true; } });
    current = 'closing';
    closeLayer(function () { arrive(s); });
  }
  function arrive(s) {
    animateBalances(s.withdrawn);
    if (s.order) showFundsToast(s.order);
    stepLabel('after');
  }
  var ft = $('#fundsToast'), ftTimer;
  function showFundsToast(o) {
    $('[data-t="body"]', ft).textContent = S.fmtVnd(o.vnd) + ' VND to ' + bankCode(o.bank) + ' •••• ' + S.last4(o.bank.number) + ' · ' + o.id;
    ft.hidden = false; void ft.offsetWidth;
    setTimeout(function () { ft.classList.add('is-in'); }, reduced ? 0 : 200);
    clearTimeout(ftTimer); ftTimer = setTimeout(hideFundsToast, 12000);
  }
  function hideFundsToast() { ft.classList.remove('is-in'); setTimeout(function () { ft.hidden = true; }, reduced ? 10 : 240); }
  $('#fundsToastClose').addEventListener('click', hideFundsToast);
  $('#viewDetails').addEventListener('click', function () {
    var o = S.read().order; if (!o) return;
    hideFundsToast(); F.orderId = o.id;
    go('result', { noPush: true });
    current = 'details';
    $('#resultBack', view).addEventListener('click', function () { closeLayer(); });
  });

  /* ---------------- entry, header buttons, keyboard ---------------- */
  $('#withdrawBtn').addEventListener('click', function () { stack = []; current = null; go('dest'); });
  function tryClose(trigger) {
    if (current === 'auth' || current === 'wallet' || current === 'prep') { if (trigger) nudge(trigger); toast('Cancelling is outside this demo — approve in the wallet pane'); return; }
    if (current === 'status') { var o = S.read().order; if (o && o.stage >= 3) finish(); else { if (trigger) nudge(trigger); toast('Closing while it processes is outside this demo — the status keeps updating here'); } return; }
    if (current === 'result') { finish(); return; }
    closeLayer();
  }
  $('#backBtn').addEventListener('click', back);
  $('#closeBtn').addEventListener('click', function () { tryClose(this); });
  $('#overlay').addEventListener('click', function () { if (current === 'dest') closeLayer(); });
  document.addEventListener('keydown', function (e) {
    if (layer.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); tryClose($('#closeBtn')); }
    if (e.key === 'Tab') { // keep focus inside the dialog (and the wallet pane while it is open)
      var scope = [flow].concat(wallet.hidden ? [] : [wallet]);
      var f = []; scope.forEach(function (m) { f = f.concat($$('button:not([disabled]), input:not([disabled]), [tabindex="0"]', m).filter(function (el) { return el.offsetParent !== null && !el.closest('.is-leaving') && !el.closest('[hidden]'); })); });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { f[0].focus(); e.preventDefault(); }
    }
  });
  flow.tabIndex = -1;

  /* ---------------- restart / other tabs ---------------- */
  $('#restartBtn').addEventListener('click', function () {
    S.reset();
    try { sessionStorage.setItem('risex-offramp-restarted', '1'); } catch (e) {}
    location.reload();
  });
  S.subscribe(function (s) {
    if (F.orderId && (!s.order || s.order.id !== F.orderId)) { location.reload(); return; } // restarted elsewhere
    if (current === 'status' && s.order && view) renderStatus(view, s.order.stage, true);
    if (layer.hidden) { shown = S.r2(s.withdrawn - (s.order && !s.order.ack ? s.order.usdc : 0)); paintBalances(shown); }
  });

  /* ---------------- boot ---------------- */
  renderStatic();
  paintIcons(document);
  var st = S.read();
  shown = st.withdrawn; paintBalances(st.withdrawn);
  stepLabel(st.withdrawn > 0 ? 'after' : 'trade');
  try { if (sessionStorage.getItem('risex-offramp-restarted')) { sessionStorage.removeItem('risex-offramp-restarted'); setTimeout(function () { toast('Demo restarted'); }, 300); } } catch (e) {}

  // A refresh returns to the open withdrawal instead of a blank or stale screen; before a
  // withdrawal exists nothing has left the account, so the demo simply returns to Trade.
  if (st.order && !st.order.ack) {
    F.orderId = st.order.id; F.usdc = st.order.usdc;
    shown = S.r2(st.withdrawn - st.order.usdc); paintBalances(shown);
    if (st.order.resultShown) {
      var s2 = S.update(function (x) { x.order.ack = true; });
      setTimeout(function () { arrive(s2); }, 300);
    } else {
      go('status', { noPush: true });
    }
  }
})();
