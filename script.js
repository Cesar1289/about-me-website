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

      var submitButton = form.querySelector("button[type='submit']");
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";

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
        })
        .finally(function () {
          submitButton.disabled = false;
          submitButton.textContent = "Send Message";
        });
    });
  }

  // ---------- Media gallery ----------
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxVideo = document.getElementById("lightbox-video");
    var lightboxLink = document.getElementById("lightbox-link");
    var closeBtn = document.getElementById("lightbox-close");
    document.querySelectorAll(".media-grid .card").forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event && event.target.closest("a,button,video")) return;
        var mediaType = card.getAttribute("data-media-type") || "image";
        var mediaSrc = card.getAttribute("data-media-src");
        var originalUrl = card.getAttribute("data-original-url");

        lightboxImg.hidden = true;
        lightboxVideo.hidden = true;
        lightboxLink.hidden = true;

        if (mediaType === "video" && mediaSrc) {
          lightboxVideo.src = mediaSrc;
          lightboxVideo.hidden = false;
          lightboxVideo.play().catch(function () {});
        } else if (mediaType === "link" && originalUrl) {
          lightboxLink.href = originalUrl;
          lightboxLink.hidden = false;
        } else {
          var img = card.querySelector("img");
          if (!img) return;
          lightboxImg.src = mediaSrc || img.src;
          lightboxImg.alt = img.alt;
          lightboxImg.hidden = false;
        }
        lightbox.hidden = false;
      });
    });
    function closeLightbox() {
      lightbox.hidden = true;
      lightboxVideo.pause();
      lightboxVideo.removeAttribute("src");
    }
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }
})();
