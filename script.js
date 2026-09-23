// Client-side JavaScript: active nav + contact form + media gallery
(function () {
  var page = document.body.getAttribute("data-page");
  document.querySelectorAll(".nav-list a").forEach(function (link) {
    if (link.getAttribute("data-page") === page) link.classList.add("active");
  });

  // ---------- Contact form (home page) ----------
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = "";
      status.className = "form-status";

      var data = {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        reason: form.reason.value,
        message: form.message.value.trim()
      };

      // Required-field validation before submission
      if (!data.firstName || !data.lastName || !data.email || !data.reason || !data.message) {
        status.textContent = "Please fill in all required fields.";
        status.classList.add("error");
        return;
      }
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      if (!emailOk) {
        status.textContent = "Please enter a valid email address.";
        status.classList.add("error");
        return;
      }

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().then(function (body) { return { ok: res.ok, body: body }; });
        })
        .then(function (result) {
          if (result.ok) {
            status.textContent = "Success! Your message was sent. Thank you, " + result.body.firstName + "!";
            status.classList.add("success");
            form.reset();
          } else {
            status.textContent = result.body.error || "Something went wrong. Please try again.";
            status.classList.add("error");
          }
        })
        .catch(function () {
          status.textContent = "Network error. Please try again later.";
          status.classList.add("error");
        });
    });
  }

  // ---------- Media gallery ----------
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = document.getElementById("lightbox-img");
    var closeBtn = document.getElementById("lightbox-close");
    document.querySelectorAll(".media-grid .card").forEach(function (card) {
      card.addEventListener("click", function () {
        var img = card.querySelector("img");
        if (img) {
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt;
          lightbox.hidden = false;
        }
      });
    });
    closeBtn.addEventListener("click", function () { lightbox.hidden = true; });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) lightbox.hidden = true;
    });
  }
})();
