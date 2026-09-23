// Admin dashboard JavaScript
(function () {
  var messages = [];
  var filter = "all";
  var chart = null;

  var loginSection = document.getElementById("login-section");
  var dashboardSection = document.getElementById("dashboard-section");
  var loginStatus = document.getElementById("login-status");

  function escapeHtml(s) {
    var q = String.fromCharCode(34);
    var a = String.fromCharCode(39);
    var out = String(s);
    out = out.split("&").join("&amp;");
    out = out.split("<").join("&lt;");
    out = out.split(">").join("&gt;");
    out = out.split(q).join("&quot;");
    out = out.split(a).join("&#39;");
    return out;
  }

  // ---------- Login ----------
  document.getElementById("admin-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    loginStatus.textContent = "";
    loginStatus.className = "form-status";
    var password = document.getElementById("admin-password").value;
    fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      if (res.ok) {
        loginSection.hidden = true;
        dashboardSection.hidden = false;
        loadMessages();
      } else {
        loginStatus.textContent = "Incorrect password. Access denied.";
        loginStatus.className = "form-status error";
      }
    });
  });

  // ---------- Filters ----------
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      filter = btn.getAttribute("data-filter");
      renderMessages();
    });
  });

  // ---------- Load messages ----------
  function loadMessages() {
    fetch("/api/admin/messages", { credentials: "same-origin" })
      .then(function (res) {
        if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
        return res.json();
      })
      .then(function (data) {
        messages = data;
        renderAll();
      })
      .catch(function () {});
  }

  function showLogin() {
    dashboardSection.hidden = true;
    loginSection.hidden = false;
  }

  function renderAll() {
    renderStats();
    renderChart();
    renderMessages();
  }

  // ---------- Stats (calculated from current JSON data) ----------
  function renderStats() {
    var total = messages.length;
    var replied = messages.filter(function (m) { return m.replied; }).length;
    var fresh = total - replied;
    var rate = total > 0 ? Math.round((replied / total) * 100) : 0;
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-new").textContent = fresh;
    document.getElementById("stat-replied").textContent = replied;
    document.getElementById("stat-rate").textContent = rate + "%";
  }

  // ---------- Chart: Messages by Reason ----------
  function renderChart() {
    var reasons = ["Comment", "Question", "Partnership", "Opportunity", "Other"];
    var counts = reasons.map(function (r) {
      return messages.filter(function (m) { return m.reason === r; }).length;
    });
    var ctx = document.getElementById("reason-chart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: reasons,
        datasets: [{ label: "Messages", data: counts, backgroundColor: "#2563eb" }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: "Messages by Reason for Contact" },
          legend: { display: false }
        },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  // ---------- Message list ----------
  function renderMessages() {
    var list = document.getElementById("message-list");
    list.innerHTML = "";
    var shown = messages.filter(function (m) {
      if (filter === "new") return !m.replied;
      if (filter === "replied") return m.replied;
      return true;
    });
    if (shown.length === 0) {
      list.innerHTML = "<p>No messages in this view.</p>";
      return;
    }
    shown.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "message-card" + (m.replied ? " replied" : "");
      var badge = m.replied
        ? "<span class=" + q + "badge replied" + q + ">Replied</span>"
        : "<span class=" + q + "badge new" + q + ">New</span>";
      var markBtn = m.replied ? "" : "<button class=" + q + "mark-btn" + q + " data-id=" + q + m.id + q + ">Mark as Replied</button>";
      card.innerHTML =
        "<div class=" + q + "message-head" + q + "><strong>" + escapeHtml(m.firstName + " " + m.lastName) + "</strong>" + badge + "</div>" +
        "<p class=" + q + "message-meta" + q + ">" + escapeHtml(m.email) + " &bull; " + escapeHtml(m.reason) + "</p>" +
        "<p>" + escapeHtml(m.message) + "</p>" +
        "<p class=" + q + "message-meta" + q + ">Received: " + escapeHtml(m.submittedAt) +
        (m.repliedAt ? " | Replied: " + escapeHtml(m.repliedAt) : "") + "</p>" +
        markBtn;
      list.appendChild(card);
    });
  }

  document.getElementById("message-list").addEventListener("click", function (e) {
    if (e.target && e.target.classList.contains("mark-btn")) {
      var id = e.target.getAttribute("data-id");
      fetch("/api/admin/messages/" + encodeURIComponent(id) + "/replied", {
        method: "PATCH",
        credentials: "same-origin"
      }).then(function (res) {
        if (res.ok) loadMessages();
      });
    }
  });

  // If session already active, load dashboard directly
  loadMessages();
})();
