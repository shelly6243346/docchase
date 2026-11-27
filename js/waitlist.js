/* Landing-page waitlist. Stored only in localStorage. Nothing is transmitted. */
(function () {
  "use strict";

  var KEY = "docchase.waitlist.v1";
  var form = document.getElementById("waitlist-form");
  var success = document.getElementById("waitlist-success");
  if (!form || !success) return;

  function canStore() {
    try {
      localStorage.setItem("__docchase_probe", "1");
      localStorage.removeItem("__docchase_probe");
      return true;
    } catch (err) {
      return false;
    }
  }

  function readList() {
    if (!canStore()) return [];
    try {
      var parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeList(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function field(id) {
    return document.getElementById(id);
  }

  function setError(id, message) {
    var input = field(id);
    var error = document.getElementById(id + "-error");
    if (error) error.textContent = message || "";
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function showSuccess(entry, extra) {
    form.hidden = true;
    success.hidden = false;
    document.getElementById("success-name").textContent = entry.name;
    document.getElementById("success-email").textContent = entry.email;
    document.getElementById("success-firm").textContent = entry.firm;
    document.getElementById("success-size").textContent = entry.size;
    document.getElementById("success-note").textContent = extra ||
      "Saved in this browser only. This prototype does not email you and does not send the form anywhere.";
  }

  var existing = readList();
  if (existing.length) showSuccess(existing[existing.length - 1]);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = field("name").value.trim();
    var email = field("email").value.trim();
    var firm = field("firm").value.trim();
    var size = field("size").value;
    var ok = true;
    setError("name", "");
    setError("email", "");
    setError("firm", "");
    setError("size", "");
    if (!name) { setError("name", "Enter your name."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("email", "Enter a valid email address."); ok = false; }
    if (!firm) { setError("firm", "Enter the firm name."); ok = false; }
    if (!size) { setError("size", "Select a firm size."); ok = false; }
    if (!ok) {
      var firstInvalid = form.querySelector("[aria-invalid='true']");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (!canStore()) {
      setError("email", "This browser is blocking local storage, so the waitlist cannot be saved here.");
      return;
    }
    var list = readList();
    var duplicate = list.some(function (entry) { return entry.email.toLowerCase() === email.toLowerCase(); });
    if (!duplicate) {
      list.push({ name: name, email: email, firm: firm, size: size, createdAt: new Date().toISOString() });
      writeList(list);
    }
    showSuccess(
      { name: name, email: email, firm: firm, size: size },
      duplicate
        ? "This email was already on the waitlist in this browser. Nothing new was stored, and nothing was sent."
        : "Saved in this browser only. This prototype does not email you and does not send the form anywhere."
    );
  });

  document.getElementById("add-another").addEventListener("click", function () {
    success.hidden = true;
    form.hidden = false;
    form.reset();
    ["name", "email", "firm", "size"].forEach(function (id) { setError(id, ""); });
    field("name").focus();
  });
})();
