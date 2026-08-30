/* ============================================================
   SOLEON — interaction layer
   ・ヒーローは動画から書き出した連番WebPをスクロールでスクラブ再生する
   ・その他はスクロール連動の入場アニメーションとパララックス
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  var header = document.querySelector("[data-header]");
  var menuButton = document.querySelector("[data-menu-button]");
  var nav = document.querySelector("[data-nav]");
  var progressBar = document.querySelector("[data-progress]");
  var hero = document.querySelector("[data-hero]");

  var DESKTOP_NAV = 1040;

  /* ----------------------------------------------------------
     ナビゲーション
     ---------------------------------------------------------- */
  function setMenu(open, returnFocus) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("is-locked", open);

    var label = menuButton.querySelector(".menu-toggle-label");
    if (label) label.textContent = open ? "CLOSE" : "MENU";
    if (!open && returnFocus) menuButton.focus();
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true", false);
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false, false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenu(false, true);
      }
    });

    document.addEventListener("pointerdown", function (event) {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (header && !header.contains(event.target)) setMenu(false, false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > DESKTOP_NAV) setMenu(false, false);
    });
  }

  /* ----------------------------------------------------------
     note ドロップダウン（05）
     デスクトップはホバーで開く。タッチ環境向けにクリックでも開閉する
     ---------------------------------------------------------- */
  var noteDrop = document.querySelector("[data-nav-note]");
  if (noteDrop) {
    var noteButton = noteDrop.querySelector(".nav-note-btn");

    var setNoteDrop = function (open) {
      noteDrop.classList.toggle("is-open", open);
      if (noteButton) noteButton.setAttribute("aria-expanded", String(open));
    };

    if (noteButton) {
      noteButton.addEventListener("click", function () {
        setNoteDrop(!noteDrop.classList.contains("is-open"));
      });
      noteDrop.addEventListener("mouseenter", function () { setNoteDrop(true); });
      noteDrop.addEventListener("mouseleave", function () { setNoteDrop(false); });
      noteDrop.addEventListener("focusout", function (event) {
        if (!noteDrop.contains(event.relatedTarget)) setNoteDrop(false);
      });
    }

    document.addEventListener("pointerdown", function (event) {
      if (!noteDrop.contains(event.target)) setNoteDrop(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && noteDrop.classList.contains("is-open")) {
        setNoteDrop(false);
        if (noteButton) noteButton.focus();
      }
    });
  }

  /* ----------------------------------------------------------
     Capabilities マーキー（-50% で1周するよう内容を複製する）
     ---------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-marquee] ul"), function (list) {
    var originals = Array.prototype.slice.call(list.children);
    originals.forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      list.appendChild(clone);
    });
  });

  /* ----------------------------------------------------------
     ピン留め区間の進捗（0〜1）
     .pin の高さから 1画面分を引いた範囲をスクロール量に対応させる
     ---------------------------------------------------------- */
  function pinProgress(pin) {
    if (!pin) return 0;
    var range = pin.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / range));
  }

  /* ----------------------------------------------------------
     ヒーロー：常時再生の映像スタック
     4カットを重ね、表示中の1本だけを見せる。切り替えはタイマーが主で、
     スクロールでも進む。スクロールを止めても画面は動き続ける
     ---------------------------------------------------------- */
  var CUT_MS = 5000;
  var heroMedia = document.querySelector("[data-hero-media]");
  var heroPoster = document.querySelector("[data-hero-poster]");
  var videoHost = document.querySelector("[data-hero-videos]");
  var cuts = videoHost ? Array.prototype.slice.call(videoHost.querySelectorAll("video")) : [];
  var cutIndex = -1;
  var cutTimer = null;
  var cutsStarted = false;

  function loadCut(i) {
    var video = cuts[i];
    if (!video || video.dataset.loaded) return;
    video.dataset.loaded = "1";
    video.src = video.getAttribute("data-cut");
    video.load();
  }

  function playCut(i) {
    var video = cuts[i];
    if (!video) return;
    loadCut(i);
    var attempt = video.play();
    // 自動再生が拒否された場合は静止画のまま見せる
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  function setCut(next) {
    if (!cuts.length) return;
    next = ((next % cuts.length) + cuts.length) % cuts.length;
    if (next === cutIndex) return;
    cutIndex = next;

    for (var i = 0; i < cuts.length; i++) {
      cuts[i].classList.toggle("is-active", i === next);
    }
    playCut(next);
    loadCut((next + 1) % cuts.length); // 次のカットを先に用意する

    // 表示していないカットは止めて負荷を抑える
    for (var j = 0; j < cuts.length; j++) {
      if (j !== next && !cuts[j].paused) cuts[j].pause();
    }
  }

  // 実際に再生が始まってからポスターを外す。自動再生が拒否されても黒画面にならない
  cuts.forEach(function (video) {
    video.addEventListener("playing", function () {
      if (heroPoster) heroPoster.classList.add("is-off");
    });
  });

  function scheduleCut() {
    window.clearTimeout(cutTimer);
    if (reduceMotion.matches || document.hidden) return;
    cutTimer = window.setTimeout(function () {
      setCut(cutIndex + 1);
      scheduleCut();
    }, CUT_MS);
  }

  function startCuts() {
    if (cutsStarted || !cuts.length || reduceMotion.matches) return;
    cutsStarted = true;
    setCut(0);
    scheduleCut();
  }

  if (cuts.length && !reduceMotion.matches) {
    if (document.readyState === "complete") {
      startCuts();
    } else {
      window.addEventListener("load", startCuts);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        window.clearTimeout(cutTimer);
        cuts.forEach(function (v) { v.pause(); });
      } else {
        if (cutIndex >= 0) playCut(cutIndex);
        scheduleCut();
      }
    });
  }

  // スクロール位置でもカットを進める。しきい値をまたいだ時だけ介入し、
  // それ以外はタイマーに任せる（そうしないと自動送りを毎回引き戻してしまう）
  var lastScrollCut = 0;
  function updateCutsByScroll() {
    if (!cutsStarted || !hero) return;
    var wanted = Math.min(cuts.length - 1, Math.floor(pinProgress(hero) * cuts.length));
    if (wanted === lastScrollCut) return;
    lastScrollCut = wanted;
    setCut(wanted);
    scheduleCut();
  }

  /* ---------- 漂う塵 ---------- */
  var dustCanvas = document.querySelector("[data-hero-dust]");
  var dustCtx = dustCanvas ? dustCanvas.getContext("2d") : null;
  var dust = [];
  var dustRaf = null;
  var dustVisible = false;

  function sizeDust() {
    if (!dustCanvas) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var w = dustCanvas.clientWidth;
    var h = dustCanvas.clientHeight;
    if (!w || !h) return;
    dustCanvas.width = Math.round(w * ratio);
    dustCanvas.height = Math.round(h * ratio);

    dust = [];
    var count = w < 700 ? 34 : 70;
    for (var i = 0; i < count; i++) {
      dust.push({
        x: Math.random() * dustCanvas.width,
        y: Math.random() * dustCanvas.height,
        r: (Math.random() * 1.5 + 0.4) * ratio,
        v: (Math.random() * 0.22 + 0.06) * ratio,
        a: Math.random() * 0.5 + 0.12,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.012 + 0.004
      });
    }
  }

  function drawDust() {
    if (!dustCtx) return;
    var w = dustCanvas.width;
    var h = dustCanvas.height;
    dustCtx.clearRect(0, 0, w, h);
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i];
      d.y -= d.v;
      d.p += d.s;
      if (d.y < -6) { d.y = h + 6; d.x = Math.random() * w; }
      var x = d.x + Math.sin(d.p) * 12;
      dustCtx.beginPath();
      dustCtx.fillStyle = "rgba(255,255,255," + d.a.toFixed(3) + ")";
      dustCtx.arc(x, d.y, d.r, 0, Math.PI * 2);
      dustCtx.fill();
    }
    dustRaf = window.requestAnimationFrame(drawDust);
  }

  function setDustRunning(on) {
    if (!dustCtx || reduceMotion.matches) return;
    if (on && !dustRaf) {
      drawDust();
    } else if (!on && dustRaf) {
      window.cancelAnimationFrame(dustRaf);
      dustRaf = null;
    }
  }

  if (dustCtx && !reduceMotion.matches) {
    sizeDust();
    setDustRunning(true);
  }

  /* ---------- 計測HUDの数値 ---------- */
  var hudX = document.querySelector("[data-hud-x]");
  var hudY = document.querySelector("[data-hud-y]");
  var hudLabel = document.querySelector("[data-hud-label]");
  var HUD_LABELS = ["SPINDLE", "FEED", "COOLANT", "PROBE"];

  if (hudX && hudY && !reduceMotion.matches) {
    window.setInterval(function () {
      if (document.hidden || !dustVisible) return;
      hudX.textContent = (Math.random() * 320).toFixed(3);
      hudY.textContent = (Math.random() * 180).toFixed(3);
    }, 220);
  }
  if (hudLabel && !reduceMotion.matches) {
    window.setInterval(function () {
      if (document.hidden || !dustVisible) return;
      hudLabel.textContent = HUD_LABELS[Math.floor(Math.random() * HUD_LABELS.length)];
    }, 2600);
  }

  /* ---------- 見出しを1文字ずつに分割 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".hero-title .line > span"), function (holder) {
    var index = 0;
    Array.prototype.slice.call(holder.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) {
        // <i class="accent">。</i> などの要素はそのまま1文字として扱う
        node.classList.add("ch");
        node.style.setProperty("--c", index++);
        return;
      }
      var frag = document.createDocumentFragment();
      node.textContent.split("").forEach(function (chr) {
        var span = document.createElement("span");
        span.className = "ch";
        span.style.setProperty("--c", index++);
        span.textContent = chr;
        frag.appendChild(span);
      });
      holder.replaceChild(frag, node);
    });
  });

  /* ---------- マウス追従の視差 ---------- */
  if (heroMedia && finePointer.matches && !reduceMotion.matches) {
    window.addEventListener("pointermove", function (event) {
      var stage = heroMedia.parentElement;
      if (!stage) return;
      var rect = stage.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--mx", x.toFixed(3));
      stage.style.setProperty("--my", y.toFixed(3));
    }, { passive: true });
  }

  /* ---------- ヒーローが画面外なら止める ---------- */
  function updateHeroActivity() {
    if (!hero) return;
    var rect = hero.getBoundingClientRect();
    var visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (visible === dustVisible) return;
    dustVisible = visible;
    setDustRunning(visible);
    if (!visible) {
      window.clearTimeout(cutTimer);
      cuts.forEach(function (v) { v.pause(); });
    } else if (cutsStarted) {
      playCut(cutIndex);
      scheduleCut();
    }
  }

  /* ----------------------------------------------------------
     ピン留め区間の進捗を CSS 変数 --p に流す
     （01のトラック、提供フローの4ステップ）
     ---------------------------------------------------------- */
  var progressTargets = Array.prototype.map.call(
    document.querySelectorAll("[data-flow]"),
    function (element) {
      return {
        element: element,
        pin: element.closest(".pin"),
        steps: Array.prototype.slice.call(element.querySelectorAll(".flow-steps li")),
        last: -1
      };
    }
  );

  function updateProgressTargets() {
    for (var i = 0; i < progressTargets.length; i++) {
      var item = progressTargets[i];
      if (!item.pin) continue;
      var p = pinProgress(item.pin);
      item.element.style.setProperty("--p", p.toFixed(4));

      if (!item.steps.length) continue;
      // 進捗に応じて到達済みステップを点灯させる
      var reached = Math.min(item.steps.length, Math.floor(p * item.steps.length + 0.35) + 1);
      if (reached === item.last) continue;
      item.last = reached;
      for (var s = 0; s < item.steps.length; s++) {
        item.steps[s].classList.toggle("is-on", s < reached);
      }
    }
  }

  /* ----------------------------------------------------------
     スパインライン
     01から問い合わせまでを貫く一本のマゼンタ線。DOMを実測してSVGを組む
     ---------------------------------------------------------- */
  var NS = "http://www.w3.org/2000/svg";
  var spineHost = document.querySelector("[data-spine]");
  var spine = null;

  function buildSpine() {
    if (!spineHost) return;
    var main = document.getElementById("main");
    var about = document.getElementById("about");
    var contact = document.getElementById("contact");
    if (!main || !about || !contact) return;

    var scrollY = window.scrollY;
    var mainTop = main.getBoundingClientRect().top + scrollY;
    var top = about.getBoundingClientRect().top + scrollY;
    var tail = contact.querySelector(".contact-copy") || contact;
    var bottom = tail.getBoundingClientRect().top + scrollY + 80;
    var height = Math.max(1, bottom - top);
    var width = main.clientWidth;

    // 左ガターの中央に置く
    var shell = document.querySelector(".shell");
    var gutter = shell ? shell.getBoundingClientRect().left : 24;
    var x = Math.max(11, Math.min(44, gutter / 2));
    var wide = window.innerWidth > 760;

    spineHost.style.top = top - mainTop + "px";
    spineHost.style.height = height + "px";
    spineHost.innerHTML = "";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("fill", "none");

    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M " + x + " 0 V " + height);
    path.setAttribute("class", "spine-line");
    svg.appendChild(path);

    var marks = [];

    function addMark(el, stub) {
      var y = el.getBoundingClientRect().top + scrollY - top;
      if (y < 0 || y > height) return;
      var group = document.createElementNS(NS, "g");
      group.setAttribute("class", "spine-mark");

      var dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.setAttribute("r", 3.5);
      group.appendChild(dot);

      if (stub && wide) {
        var arm = document.createElementNS(NS, "path");
        arm.setAttribute("d", "M " + x + " " + y + " h 34");
        arm.setAttribute("class", "spine-arm");
        group.appendChild(arm);
      }

      svg.appendChild(group);
      marks.push({ group: group, at: y / height });
    }

    Array.prototype.forEach.call(document.querySelectorAll("main .sec-head, .contact .sec-name"), function (el) {
      addMark(el, false);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".service-item .service-kicker"), function (el) {
      addMark(el, true);
    });

    spineHost.appendChild(svg);
    spine = { path: path, length: height, marks: marks, top: top, height: height };
    updateSpine();
  }

  function updateSpine() {
    if (!spine) return;
    // 画面の6割の高さを「ペン先」とみなす
    var p = (window.scrollY + window.innerHeight * 0.6 - spine.top) / spine.height;
    p = Math.min(1, Math.max(0, p));
    spine.path.style.strokeDasharray = spine.length;
    spine.path.style.strokeDashoffset = spine.length * (1 - p);
    for (var i = 0; i < spine.marks.length; i++) {
      spine.marks[i].group.classList.toggle("is-on", p >= spine.marks[i].at);
    }
  }

  /* ----------------------------------------------------------
     スクロール連動（ヘッダー・進捗・パララックス・シーケンス）
     ---------------------------------------------------------- */
  var parallaxItems = [];
  Array.prototype.forEach.call(document.querySelectorAll("[data-parallax]"), function (element) {
    parallaxItems.push({
      element: element,
      // 自身が transform されるため、計測は必ず親要素の矩形で行う
      gauge: element.parentElement || element,
      speed: parseFloat(element.getAttribute("data-parallax")) || 0.06
    });
  });

  var lastY = window.scrollY;
  var pending = null;

  function updateHeader() {
    if (!header) return;
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 24);

    if (document.body.classList.contains("is-locked") || reduceMotion.matches) {
      header.classList.remove("is-hidden");
    } else if (y > lastY + 6 && y > 420) {
      header.classList.add("is-hidden");
    } else if (y < lastY - 6 || y <= 420) {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  }

  function updateProgress() {
    if (!progressBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
  }

  function updateParallax() {
    if (!parallaxItems.length) return;
    var viewport = window.innerHeight;
    parallaxItems.forEach(function (item) {
      var rect = item.gauge.getBoundingClientRect();
      if (rect.bottom < -260 || rect.top > viewport + 260) return;
      var offset = (rect.top + rect.height / 2 - viewport / 2) * item.speed;
      item.element.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
  }

  function onScroll() {
    updateHeader();
    updateProgress();
    updateHeroActivity();
    updateCutsByScroll();
    updateProgressTargets();
    updateSpine();
    revealPass();
    if (!reduceMotion.matches) updateParallax();
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      sizeDust();
      updateProgressTargets();
      buildSpine();
      updateProgress();
      if (!reduceMotion.matches) updateParallax();
    }, 140);
  });

  onScroll();

  /* ----------------------------------------------------------
     入場アニメーション
     ---------------------------------------------------------- */
  if (hero) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        hero.classList.add("is-ready");
      });
    });
  }

  var animTargets = document.querySelectorAll(
    "[data-anim], [data-anim-lines], [data-anim-media], [data-stagger], [data-service]"
  );

  Array.prototype.forEach.call(animTargets, function (target) {
    if (target.hasAttribute("data-stagger")) {
      Array.prototype.forEach.call(target.children, function (child, index) {
        child.style.setProperty("--i", index);
      });
    }
    if (target.hasAttribute("data-anim-lines")) {
      Array.prototype.forEach.call(target.querySelectorAll(".line > span"), function (span, index) {
        span.parentElement.style.setProperty("--i", index);
        span.style.setProperty("--i", index);
      });
    }
  });

  // 入場判定はスクロールごとの矩形判定で行う。IntersectionObserver に依存すると
  // 発火しなかった場合にワイプ（マゼンタの幕）が残り続けるため。
  pending = Array.prototype.slice.call(animTargets);

  function revealPass() {
    // onScroll から先に呼ばれる可能性があるため未初期化を許容する
    if (!pending || !pending.length) return;
    var viewport = window.innerHeight;
    for (var i = pending.length - 1; i >= 0; i--) {
      var rect = pending[i].getBoundingClientRect();
      // 上端が判定線を越えたら表示する。ビューポートより上に過ぎ去った要素も
      // 対象になるため、アンカー移動で飛ばした区間が隠れたままにならない
      if (rect.top < viewport * 0.9) {
        pending[i].classList.add("is-in");
        pending.splice(i, 1);
      }
    }
  }

  revealPass();
  buildSpine();
  window.addEventListener("load", function () {
    revealPass();
    // 画像・フォント読み込み後に高さが変わるため組み直す
    buildSpine();
  });
  window.setTimeout(function () {
    revealPass();
    buildSpine();
  }, 1200);

  /* ----------------------------------------------------------
     現在地のハイライト
     ---------------------------------------------------------- */
  if (nav && "IntersectionObserver" in window) {
    var navLinks = Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']"));
    var sections = navLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute("href"));
      })
      .filter(Boolean);

    if (hero) sections.unshift(hero);

    var sectionObserver = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (entry) { return entry.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });

        if (!visible[0]) return;
        var id = visible[0].target.id;
        navLinks.forEach(function (link) {
          var current = link.getAttribute("href") === "#" + id;
          link.classList.toggle("is-current", current);
          if (current) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.15, 0.4] }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* ----------------------------------------------------------
     マグネティックボタン（デスクトップのみ）
     ---------------------------------------------------------- */
  if (finePointer.matches && !reduceMotion.matches) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-magnetic]"), function (element) {
      element.addEventListener("pointermove", function (event) {
        var rect = element.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = "translate(" + (x * 9).toFixed(2) + "px," + (y * 7).toFixed(2) + "px)";
      });
      element.addEventListener("pointerleave", function () {
        element.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------
     お問い合わせフォーム
     ---------------------------------------------------------- */
  var contactForm = document.querySelector("[data-contact-form]");

  function setFormStatus(form, message, type) {
    var status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (type) status.classList.add(type);
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;

      var submitButton = contactForm.querySelector("button[type='submit']");
      var submitLabel = submitButton ? submitButton.querySelector("span") : null;
      var formData = new FormData(contactForm);
      var email = formData.get("email");
      var endpoint = [
        "https://formsubmit.co/ajax/",
        contactForm.dataset.contactUser,
        "@",
        contactForm.dataset.contactDomain,
        ".",
        contactForm.dataset.contactTld
      ].join("");

      if (typeof email === "string") formData.set("_replyto", email);

      if (contactForm.dataset.contactCcUser) {
        formData.set(
          "_cc",
          [
            contactForm.dataset.contactCcUser,
            "@",
            contactForm.dataset.contactDomain,
            ".",
            contactForm.dataset.contactTld
          ].join("")
        );
      }

      setFormStatus(contactForm, "送信中です。", "");
      if (submitButton) submitButton.disabled = true;
      if (submitLabel) submitLabel.textContent = "送信中…";

      fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Form submission failed");
          return response.json();
        })
        .then(function () {
          contactForm.reset();
          setFormStatus(contactForm, "送信しました。内容を確認のうえご連絡します。", "is-success");
        })
        .catch(function () {
          setFormStatus(contactForm, "送信できませんでした。時間をおいて再度お試しください。", "is-error");
        })
        .finally(function () {
          if (submitButton) submitButton.disabled = false;
          if (submitLabel) submitLabel.textContent = "送信する";
        });
    });
  }
})();
