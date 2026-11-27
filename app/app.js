/* DocChase prototype UI. All state is local. Nothing is sent. */
(function () {
  "use strict";

  var KEY = "docchase.demo.v1";
  var persistent = true;
  var state;
  var dragId = null;
  var toastTimer = 0;
  var focusTitle = false;
  var ui = {
    q: "",
    stage: "all",
    preparer: "all",
    openOnly: false,
    reminderId: "",
    portalId: "",
    portalName: "",
    lastMatch: null,
    undo: null
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function canStore() {
    try {
      localStorage.setItem("__docchase_probe", "1");
      localStorage.removeItem("__docchase_probe");
      return true;
    } catch (err) {
      return false;
    }
  }

  function cloneSeed() {
    return structuredClone(window.DOCCHASE_SEED);
  }

  function load() {
    var seed = cloneSeed();
    if (!canStore()) {
      persistent = false;
      return seed;
    }
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.settings || !parsed.settings.cadence || !Array.isArray(parsed.clients) || !parsed.clients.length) {
        throw new Error("bad shape");
      }
      return parsed;
    } catch (err) {
      try { localStorage.setItem(KEY, JSON.stringify(seed)); } catch (ignore) {}
      return seed;
    }
  }

  function save() {
    if (!persistent) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      persistent = false;
    }
  }

  function findClient(id) {
    for (var i = 0; i < state.clients.length; i += 1) {
      if (state.clients[i].id === id) return state.clients[i];
    }
    return null;
  }

  function firstOpenId() {
    for (var i = 0; i < state.clients.length; i += 1) {
      var client = state.clients[i];
      if (!DocChase.isComplete(client) && client.stage !== "filed") return client.id;
    }
    return state.clients[0].id;
  }

  function route() {
    var raw = String(location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var name = parts[0] || "dashboard";
    var known = { dashboard: 1, clients: 1, pipeline: 1, reminders: 1, portal: 1, settings: 1 };
    if (!known[name]) name = "dashboard";
    return { name: name, id: parts[1] || "" };
  }

  function log(client, text) {
    client.activity.push({
      id: "log-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      text: text
    });
  }

  function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("show"); }, 2800);
  }

  function preparers() {
    var seen = {};
    var list = [];
    state.clients.forEach(function (client) {
      if (!seen[client.preparer]) {
        seen[client.preparer] = true;
        list.push(client.preparer);
      }
    });
    return list;
  }

  function metrics(today) {
    var now = today || new Date();
    var complete = 0;
    var outstanding = 0;
    var reminders = 0;
    state.clients.forEach(function (client) {
      if (DocChase.isComplete(client)) complete += 1;
      outstanding += DocChase.outstandingItems(client).length;
      reminders += DocChase.planReminders(client, state.settings.cadence, now).length;
    });
    return {
      complete: complete,
      total: state.clients.length,
      outstanding: outstanding,
      reminders: reminders,
      days: DocChase.daysUntil(state.settings.taxDeadline, now)
    };
  }

  function nextReminderLabel(client) {
    if (DocChase.isComplete(client) || client.stage === "filed") return "Stopped";
    var plan = DocChase.planReminders(client, state.settings.cadence, new Date());
    if (!plan.length) {
      if (!state.settings.cadence.email && !state.settings.cadence.text) return "Channels off";
      if ((client.sentReminders || []).length >= Number(state.settings.cadence.maxReminders)) return "Cap reached";
      return "None";
    }
    var pretty = DocChase.formatLong(DocChase.parseISODate(plan[0].date));
    return plan[0].status === "due" ? "Due " + pretty : pretty;
  }

  function filteredClients() {
    var q = ui.q.trim().toLowerCase();
    return state.clients.filter(function (client) {
      if (ui.stage !== "all" && client.stage !== ui.stage) return false;
      if (ui.preparer !== "all" && client.preparer !== ui.preparer) return false;
      if (ui.openOnly && DocChase.outstandingItems(client).length === 0) return false;
      if (!q) return true;
      var hay = [
        client.name, client.entityName, client.filing, client.email,
        client.preparer, client.phone, client.profile
      ].join(" ").toLowerCase();
      client.checklist.forEach(function (item) {
        hay += " " + item.label + " " + (item.payer || "") + " " + (item.file || "");
      });
      return hay.indexOf(q) !== -1;
    });
  }

  function itemStatus(item) {
    if (item.status === "received") return { key: "received", label: "Received" };
    if (item.wrongYear) return { key: "wrong", label: "Wrong year" };
    return { key: "missing", label: "Missing" };
  }

  function pctLabel(value) {
    if (value == null || isNaN(Number(value))) return "";
    return Math.round(Number(value) * 100) + "%";
  }

  function sampleName(item, year) {
    var payer = String(item.payer || item.label).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
    var tags = {
      w2: "W-2", nec: "1099-NEC", int: "1099-INT", div: "1099-DIV", b: "1099-B",
      r: "1099-R", k1099: "1099-K", ssa: "SSA-1099", k1: "K-1", e1098: "1098-E",
      m1098: "1098", property: "Property_Tax", charity: "Charitable", care: "Childcare",
      pnl: "Profit_and_Loss", bank: "Bank_Statements", mileage: "Mileage_Log",
      expenses: "Expense_Summary"
    };
    return payer + "_" + (tags[item.docType] || "Document") + "_" + year + ".pdf";
  }

  function suggestions(client) {
    var open = DocChase.outstandingItems(client);
    var names = [];
    open.slice(0, 2).forEach(function (item) {
      names.push(sampleName(item, client.taxYear));
    });
    if (open[0]) names.push(sampleName(open[0], client.taxYear - 1));
    return names;
  }

  function stageOptions(selected) {
    return DocChase.STAGES.map(function (stage) {
      var sel = stage.id === selected ? " selected" : "";
      return "<option value=\"" + esc(stage.id) + "\"" + sel + ">" + esc(stage.label) + "</option>";
    }).join("");
  }

  function pill(stageId) {
    return "<span class=\"pill stage-" + esc(stageId) + "\">" + esc(DocChase.stageLabel(stageId)) + "</span>";
  }

  function refreshChrome() {
    var firm = state.settings.firmName || "Your firm";
    document.getElementById("firm-chip").textContent = firm;
    document.getElementById("side-firm").textContent = firm;
    var days = DocChase.daysUntil(state.settings.taxDeadline, new Date());
    var chip = document.getElementById("deadline-chip");
    if (days == null) chip.textContent = "No deadline set";
    else if (days > 1) chip.textContent = days + " days to deadline";
    else if (days === 1) chip.textContent = "1 day to deadline";
    else if (days === 0) chip.textContent = "Deadline is today";
    else chip.textContent = Math.abs(days) + " days past deadline";
    document.getElementById("storage-note").hidden = persistent;
    var current = route();
    var navKey = current.name === "clients" ? "clients" : current.name;
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      var on = link.getAttribute("data-nav") === navKey;
      link.classList.toggle("active", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function pageTitle(current) {
    if (current.name === "clients" && current.id) {
      var client = findClient(current.id);
      if (client) return client.name;
    }
    var titles = {
      dashboard: "Dashboard",
      clients: "Clients",
      pipeline: "Pipeline",
      reminders: "Reminders",
      portal: "Upload portal",
      settings: "Settings"
    };
    return titles[current.name] || "DocChase";
  }

  function render() {
    var current = route();
    if (current.name === "portal" && current.id && findClient(current.id)) ui.portalId = current.id;
    if (current.name === "reminders" && current.id && findClient(current.id)) ui.reminderId = current.id;
    if (!findClient(ui.portalId)) ui.portalId = firstOpenId();
    if (!findClient(ui.reminderId)) ui.reminderId = firstOpenId();

    var title = pageTitle(current);
    document.title = title + " · DocChase";
    var heading = document.getElementById("title");
    heading.textContent = title;
    refreshChrome();

    var html = "";
    if (current.name === "dashboard") html = dashboardHtml();
    else if (current.name === "clients") html = current.id ? detailHtml(current.id) : clientsHtml();
    else if (current.name === "pipeline") html = pipelineHtml();
    else if (current.name === "reminders") html = remindersHtml();
    else if (current.name === "portal") html = portalHtml();
    else html = settingsHtml();
    document.getElementById("view").innerHTML = html;
    if (focusTitle) {
      heading.focus();
      focusTitle = false;
    }
  }

  function dashboardHtml() {
    var stats = metrics(new Date());
    var daysValue = stats.days == null ? "—" : String(Math.abs(stats.days));
    var daysLabel = stats.days != null && stats.days < 0 ? "Days past deadline" : "Days to deadline";
    var deadline = DocChase.parseISODate(state.settings.taxDeadline);
    var deadlineText = isNaN(deadline.getTime()) ? "Set a deadline in Settings." : DocChase.formatLong(deadline);
    var daysHint = stats.days == null ? "Set a deadline in Settings."
      : stats.days < 0 ? "Deadline was " + deadlineText
      : stats.days === 0 ? "Deadline is today"
      : deadlineText;

    var attention = state.clients.filter(function (client) {
      return DocChase.outstandingItems(client).length > 0;
    }).slice().sort(function (a, b) {
      return DocChase.outstandingItems(b).length - DocChase.outstandingItems(a).length;
    }).slice(0, 6);

    var upcoming = [];
    state.clients.forEach(function (client) {
      var plan = DocChase.planReminders(client, state.settings.cadence, new Date());
      if (plan[0]) upcoming.push({ client: client, slot: plan[0] });
    });
    upcoming.sort(function (a, b) { return a.slot.date < b.slot.date ? -1 : a.slot.date > b.slot.date ? 1 : 0; });
    upcoming = upcoming.slice(0, 6);

    var counts = {};
    DocChase.STAGES.forEach(function (stage) { counts[stage.id] = 0; });
    state.clients.forEach(function (client) {
      if (counts[client.stage] == null) counts[client.stage] = 0;
      counts[client.stage] += 1;
    });

    var attentionHtml = attention.length ? attention.map(function (client) {
      var open = DocChase.outstandingItems(client);
      var wrong = open.filter(function (item) { return item.wrongYear; }).length;
      return "<li><a href=\"#/clients/" + esc(client.id) + "\"><strong>" + esc(client.name) + "</strong><span>" +
        esc(DocChase.clientMeta(client)) + "</span></a><div class=\"row-end\">" +
        (wrong ? "<span class=\"pill status-wrong\">Wrong year</span>" : "") +
        "<span class=\"quiet\">" + open.length + " open</span></div></li>";
    }).join("") : "<li class=\"empty\">Every checklist is complete.</li>";

    var upcomingHtml = upcoming.length ? upcoming.map(function (row) {
      var when = DocChase.formatLong(DocChase.parseISODate(row.slot.date));
      var tag = row.slot.status === "due" ? "Due" : "Scheduled";
      return "<li><a href=\"#/reminders/" + esc(row.client.id) + "\"><strong>" + esc(row.client.name) + "</strong><span>" +
        esc(tag) + " · " + esc(when) + "</span></a><span class=\"quiet\">" +
        DocChase.outstandingItems(row.client).length + " missing</span></li>";
    }).join("") : "<li class=\"empty\">No reminders are queued. Complete checklists and filed returns are skipped.</li>";

    var legend = DocChase.STAGES.map(function (stage) {
      var width = state.clients.length ? (counts[stage.id] / state.clients.length * 100) : 0;
      return "<a class=\"seg stage-" + esc(stage.id) + "\" style=\"width:" + width + "%\" href=\"#/pipeline\" title=\"" +
        esc(stage.label) + ": " + counts[stage.id] + "\"><span class=\"sr-only\">" + esc(stage.label) + " " +
        counts[stage.id] + "</span></a>";
    }).join("");

    var legendLabels = DocChase.STAGES.map(function (stage) {
      return "<li><i class=\"dot stage-" + esc(stage.id) + "\"></i>" + esc(stage.label) +
        "<strong>" + counts[stage.id] + "</strong></li>";
    }).join("");

    return "" +
      "<section class=\"kpi-grid\">" +
        kpi("Clients complete", stats.complete, "complete", stats.complete + " of " + stats.total + " checklists fully received") +
        kpi("Docs outstanding", stats.outstanding, "outstanding", "Open lines, including wrong-year flags") +
        kpi("Reminders scheduled", stats.reminders, "reminders", "Due or upcoming under the cadence. Nothing is sent.") +
        kpi(daysLabel, daysValue, "days", daysHint) +
      "</section>" +
      "<section class=\"split\">" +
        "<article class=\"panel\"><header class=\"panel-head\"><h2>Needs a look</h2><a href=\"#/clients\">All clients</a></header><ul class=\"stack\">" + attentionHtml + "</ul></article>" +
        "<article class=\"panel\"><header class=\"panel-head\"><h2>Next reminders</h2><a href=\"#/reminders\">Cadence</a></header><ul class=\"stack\">" + upcomingHtml + "</ul></article>" +
      "</section>" +
      "<section class=\"panel\"><header class=\"panel-head\"><h2>Pipeline</h2><a href=\"#/pipeline\">Open the board</a></header>" +
        "<div class=\"stage-bar\" aria-hidden=\"true\">" + legend + "</div>" +
        "<ul class=\"legend\">" + legendLabels + "</ul></section>";
  }

  function kpi(label, value, key, hint) {
    return "<article class=\"kpi\"><p class=\"kpi-label\">" + esc(label) + "</p><p class=\"kpi-value\" data-kpi=\"" +
      esc(key) + "\">" + esc(value) + "</p><p class=\"kpi-hint\">" + esc(hint) + "</p></article>";
  }

  function clientsHtml() {
    var rows = filteredClients();
    var stageFilter = "<option value=\"all\">All stages</option>" + DocChase.STAGES.map(function (stage) {
      return "<option value=\"" + esc(stage.id) + "\"" + (ui.stage === stage.id ? " selected" : "") + ">" + esc(stage.label) + "</option>";
    }).join("");
    var prepFilter = "<option value=\"all\">All preparers</option>" + preparers().map(function (name) {
      return "<option value=\"" + esc(name) + "\"" + (ui.preparer === name ? " selected" : "") + ">" + esc(name) + "</option>";
    }).join("");
    return "" +
      "<div class=\"toolbar\">" +
        "<label class=\"search\"><span class=\"sr-only\">Search clients</span>" +
          "<input id=\"client-search\" type=\"search\" placeholder=\"Search clients, entities, or documents\" value=\"" + esc(ui.q) + "\" autocomplete=\"off\">" +
        "</label>" +
        "<label>Stage<span class=\"sr-only\"> filter</span><select id=\"filter-stage\">" + stageFilter + "</select></label>" +
        "<label>Preparer<span class=\"sr-only\"> filter</span><select id=\"filter-preparer\">" + prepFilter + "</select></label>" +
        "<label class=\"checkline\"><input id=\"filter-open\" type=\"checkbox\"" + (ui.openOnly ? " checked" : "") + "> Outstanding only</label>" +
        "<p class=\"count\" id=\"client-count\">" + rows.length + " shown</p>" +
      "</div>" +
      "<div class=\"table-wrap\"><table class=\"clients\"><thead><tr>" +
        "<th>Client</th><th>Preparer</th><th>Stage</th><th>Documents</th><th>Next reminder</th>" +
      "</tr></thead><tbody id=\"client-rows\">" + clientRowsHtml(rows) + "</tbody></table></div>";
  }

  function clientRowsHtml(rows) {
    if (!rows.length) {
      return "<tr><td colspan=\"5\" class=\"empty\">No clients match that filter.</td></tr>";
    }
    return rows.map(function (client) {
      var got = DocChase.receivedCount(client);
      var total = client.checklist.length;
      var width = total ? Math.round(got / total * 100) : 0;
      var wrong = client.checklist.some(function (item) { return item.wrongYear && item.status !== "received"; });
      return "<tr data-href=\"#/clients/" + esc(client.id) + "\">" +
        "<td><a class=\"client-link\" href=\"#/clients/" + esc(client.id) + "\">" + esc(client.name) + "</a>" +
          "<span class=\"sub\">" + esc(DocChase.clientMeta(client)) + "</span></td>" +
        "<td>" + esc(client.preparer) + "</td>" +
        "<td>" + pill(client.stage) + (wrong ? " <span class=\"pill status-wrong\">Wrong year</span>" : "") + "</td>" +
        "<td><span class=\"doc-count\">" + got + " / " + total + "</span><span class=\"mini-bar\" aria-hidden=\"true\"><i style=\"width:" + width + "%\"></i></span></td>" +
        "<td>" + esc(nextReminderLabel(client)) + "</td></tr>";
    }).join("");
  }

  function detailHtml(id) {
    var client = findClient(id);
    if (!client) {
      return "<div class=\"panel empty-block\"><h2>Client not found</h2><p>That checklist is not in this browser.</p><a class=\"btn btn-primary\" href=\"#/clients\">Back to clients</a></div>";
    }
    var got = DocChase.receivedCount(client);
    var total = client.checklist.length;
    var open = DocChase.outstandingItems(client).length;
    var width = total ? Math.round(got / total * 100) : 0;
    var checks = client.checklist.map(function (item) {
      var status = itemStatus(item);
      var file = "";
      if (item.status === "received" && item.file) {
        file = "<p class=\"file\">" + esc(item.file) + (item.confidence != null ? " · " + pctLabel(item.confidence) + " match" : "") +
          (item.detectedYear ? " · year " + esc(item.detectedYear) : " · year not in the file name") + "</p>" +
          "<button type=\"button\" class=\"btn btn-ghost btn-small\" data-action=\"remove-file\" data-client=\"" + esc(client.id) + "\" data-item=\"" + esc(item.id) + "\">Remove file</button>";
      } else if (item.wrongYear) {
        file = "<p class=\"file warn-text\">" + esc(item.wrongYear.file) + " · detected " + esc(item.wrongYear.detectedYear) +
          " · " + pctLabel(item.wrongYear.confidence) + ". Does not satisfy " + esc(client.taxYear) + ".</p>" +
          "<button type=\"button\" class=\"btn btn-ghost btn-small\" data-action=\"clear-flag\" data-client=\"" + esc(client.id) + "\" data-item=\"" + esc(item.id) + "\">Clear wrong-year flag</button>";
      } else {
        file = "<p class=\"file quiet\">Not received</p>";
      }
      return "<li class=\"check-row\"><div><span class=\"pill status-" + status.key + "\">" + status.label + "</span></div>" +
        "<div><strong>" + esc(item.label) + "</strong><span class=\"sub\">" + esc(item.payer || "No payer") + "</span></div>" +
        "<div class=\"check-actions\">" + file + "</div></li>";
    }).join("");

    var sent = (client.sentReminders || []).map(function (entry) {
      return "<li><span class=\"dot sent\"></span><div><strong>" + esc(entry.channel === "text" ? "Text reminder sent" : "Email reminder sent") + "</strong><span>" +
        esc(DocChase.formatWhen(entry.at)) + "</span></div></li>";
    }).join("");
    var planned = DocChase.planReminders(client, state.settings.cadence, new Date()).map(function (slot) {
      var label = slot.status === "due" ? "Due now" : "Scheduled";
      return "<li><span class=\"dot due\"></span><div><strong>" + label + "</strong><span>" +
        esc(DocChase.formatLong(DocChase.parseISODate(slot.date))) + " · missing items only</span></div></li>";
    }).join("");
    var stopped = "";
    if (DocChase.isComplete(client) || client.stage === "filed") {
      stopped = "<li><span class=\"dot stop\"></span><div><strong>Reminders stopped</strong><span>" +
        (client.stage === "filed" ? "The return is filed." : "Every expected document is in.") + "</span></div></li>";
    } else if (!planned && (client.sentReminders || []).length >= Number(state.settings.cadence.maxReminders)) {
      stopped = "<li><span class=\"dot due\"></span><div><strong>Cap reached</strong><span>Raise the maximum on the Reminders page if this client should still be chased.</span></div></li>";
    }

    var activity = client.activity.slice().reverse().map(function (entry) {
      return "<li><time datetime=\"" + esc(entry.at) + "\">" + esc(DocChase.formatWhen(entry.at)) + "</time><p>" + esc(entry.text) + "</p></li>";
    }).join("");

    return "" +
      "<p class=\"back\"><a href=\"#/clients\">All clients</a></p>" +
      "<header class=\"detail-head\">" +
        "<div><p class=\"kicker\">" + esc(client.taxYear) + " checklist</p><p class=\"lede\">" + esc(DocChase.clientMeta(client)) + "</p>" +
          "<p class=\"contact\">" + esc(client.email) + " · " + esc(client.phone) + "</p></div>" +
        "<label class=\"stage-label\">Stage<select data-action=\"move-stage\" data-client=\"" + esc(client.id) + "\" aria-label=\"Move " + esc(client.name) + "\">" +
          stageOptions(client.stage) + "</select></label>" +
      "</header>" +
      "<section class=\"panel progress-panel\">" +
        "<div class=\"progress-copy\"><strong>" + got + " of " + total + " received</strong><span>" + open + " still open · " + esc(client.preparer) + "</span></div>" +
        "<div class=\"bar\" aria-hidden=\"true\"><i style=\"width:" + width + "%\"></i></div>" +
        "<p class=\"profile\">From last year's profile: " + esc(client.profile) + "</p>" +
      "</section>" +
      "<div class=\"detail-grid\">" +
        "<section class=\"panel\"><header class=\"panel-head\"><h2>Checklist</h2>" +
          "<a href=\"#/portal/" + esc(client.id) + "\">Open upload link</a></header>" +
          "<p class=\"link-note\">One link for this checklist: <code>#/portal/" + esc(client.id) + "</code>. In this prototype it opens the simulated portal.</p>" +
          "<ul class=\"checks\">" + checks + "</ul></section>" +
        "<div class=\"stack-col\">" +
          "<section class=\"panel\"><header class=\"panel-head\"><h2>Reminder timeline</h2><a href=\"#/reminders/" + esc(client.id) + "\">Preview</a></header>" +
            "<ol class=\"timeline\">" + sent + planned + stopped + "</ol></section>" +
          "<section class=\"panel\"><header class=\"panel-head\"><h2>Activity</h2></header><ol class=\"activity\">" + activity + "</ol></section>" +
        "</div>" +
      "</div>";
  }

  function pipelineHtml() {
    var columns = DocChase.STAGES.map(function (stage) {
      var cards = state.clients.filter(function (client) { return client.stage === stage.id; }).map(function (client) {
        var got = DocChase.receivedCount(client);
        var total = client.checklist.length;
        var open = total - got;
        var wrong = client.checklist.some(function (item) { return item.wrongYear && item.status !== "received"; });
        var width = total ? Math.round(got / total * 100) : 0;
        return "<article class=\"card\">" +
          "<div class=\"card-top\">" +
            "<span class=\"drag-handle\" draggable=\"true\" data-drag-id=\"" + esc(client.id) + "\" title=\"Drag to a column\" aria-hidden=\"true\">" +
              "<svg width=\"14\" height=\"18\" viewBox=\"0 0 14 18\"><circle cx=\"4\" cy=\"4\" r=\"1.2\"/><circle cx=\"10\" cy=\"4\" r=\"1.2\"/><circle cx=\"4\" cy=\"9\" r=\"1.2\"/><circle cx=\"10\" cy=\"9\" r=\"1.2\"/><circle cx=\"4\" cy=\"14\" r=\"1.2\"/><circle cx=\"10\" cy=\"14\" r=\"1.2\"/></svg></span>" +
            "<a href=\"#/clients/" + esc(client.id) + "\">" + esc(client.name) + "</a></div>" +
          "<p class=\"sub\">" + esc(DocChase.clientMeta(client)) + "</p>" +
          "<p class=\"doc-line\">" + got + " / " + total + " documents" + (open ? " · " + open + " open" : "") + "</p>" +
          "<span class=\"mini-bar\" aria-hidden=\"true\"><i style=\"width:" + width + "%\"></i></span>" +
          (wrong ? "<p class=\"pill status-wrong\">Wrong-year file</p>" : "") +
          "<p class=\"sub\">" + esc(client.preparer) + "</p>" +
          "<label class=\"move\">Move <span class=\"sr-only\">" + esc(client.name) + "</span>" +
            "<select data-action=\"move-stage\" data-client=\"" + esc(client.id) + "\" aria-label=\"Move " + esc(client.name) + "\">" +
            stageOptions(client.stage) + "</select></label></article>";
      }).join("");
      var count = state.clients.filter(function (client) { return client.stage === stage.id; }).length;
      return "<section class=\"column\" data-drop=\"" + esc(stage.id) + "\">" +
        "<header><h2>" + esc(stage.label) + "</h2><span>" + count + "</span></header>" +
        "<div class=\"column-body\">" + (cards || "<p class=\"drop-hint\">Drop a client here</p>") + "</div></section>";
    }).join("");
    return "<p class=\"board-help\">Drag a card by its handle, or choose a stage under Move. Seven stages, from the request through filing.</p>" +
      "<div class=\"board\">" + columns + "</div>";
  }

  function channelPhrase() {
    var cadence = state.settings.cadence;
    if (cadence.email && cadence.text) return "email and text";
    if (cadence.email) return "email";
    if (cadence.text) return "text";
    return "no channel";
  }

  function remindersHtml() {
    var cadence = state.settings.cadence;
    var options = state.clients.map(function (client) {
      var mark = DocChase.isComplete(client) || client.stage === "filed" ? " · complete" : "";
      return "<option value=\"" + esc(client.id) + "\"" + (client.id === ui.reminderId ? " selected" : "") + ">" +
        esc(client.name) + esc(mark) + "</option>";
    }).join("");
    var rows = [];
    state.clients.forEach(function (client) {
      DocChase.planReminders(client, cadence, new Date()).forEach(function (slot) {
        rows.push({ client: client, slot: slot });
      });
    });
    rows.sort(function (a, b) { return a.slot.date < b.slot.date ? -1 : a.slot.date > b.slot.date ? 1 : 0; });
    var schedule = rows.length ? rows.map(function (row) {
      return "<li><a href=\"#/clients/" + esc(row.client.id) + "\">" + esc(row.client.name) + "</a><span>" +
        esc(row.slot.status === "due" ? "Due" : "Scheduled") + " " +
        esc(DocChase.formatLong(DocChase.parseISODate(row.slot.date))) + "</span><span class=\"quiet\">" +
        DocChase.missingLines(row.client).length + " items</span></li>";
    }).join("") : "<li class=\"empty\">Nothing is queued. Turn a channel on, raise the cap, or leave a checklist incomplete.</li>";

    return "" +
      "<div class=\"callout\"><strong>Simulated delivery.</strong> DocChase does not send email or text messages in this prototype. A preview lists only the items still missing, and the queue stops once the checklist is complete.</div>" +
      "<div class=\"reminder-layout\">" +
        "<form id=\"cadence-form\" class=\"panel cadence\" action=\"#\" method=\"post\">" +
          "<h2>Cadence</h2>" +
          "<p class=\"quiet\">Edits apply to every open checklist in this browser. Past reminders stay in the timeline.</p>" +
          "<label>Days after the request before the first reminder<input id=\"cadence-first\" type=\"number\" min=\"0\" max=\"60\" value=\"" + esc(cadence.daysUntilFirst) + "\"></label>" +
          "<label>Days between follow-ups<input id=\"cadence-interval\" type=\"number\" min=\"1\" max=\"60\" value=\"" + esc(cadence.intervalDays) + "\"></label>" +
          "<label>Maximum reminders per checklist<input id=\"cadence-max\" type=\"number\" min=\"1\" max=\"15\" value=\"" + esc(cadence.maxReminders) + "\"></label>" +
          "<fieldset><legend>Channels</legend>" +
            "<label class=\"checkline\"><input id=\"cadence-email\" type=\"checkbox\"" + (cadence.email ? " checked" : "") + "> Email</label>" +
            "<label class=\"checkline\"><input id=\"cadence-text\" type=\"checkbox\"" + (cadence.text ? " checked" : "") + "> Text message</label>" +
          "</fieldset>" +
          "<p class=\"form-error\" id=\"cadence-error\" role=\"alert\"></p>" +
          "<p class=\"quiet\" id=\"cadence-saved\">Saved in this browser as you edit.</p>" +
        "</form>" +
        "<div class=\"panel\">" +
          "<header class=\"panel-head\"><h2>Preview</h2><span class=\"quiet\" id=\"reminder-count\">" + rows.length + " queued</span></header>" +
          "<label class=\"picker\">Client<select id=\"reminder-client\">" + options + "</select></label>" +
          "<div id=\"reminder-preview\">" + previewHtml(findClient(ui.reminderId)) + "</div>" +
        "</div>" +
      "</div>" +
      "<section class=\"panel\"><header class=\"panel-head\"><h2>Queue</h2><span class=\"quiet\">Would go by " + esc(channelPhrase()) + " if this were live</span></header>" +
        "<ul class=\"stack\" id=\"reminder-schedule\">" + schedule + "</ul></section>";
  }

  function previewHtml(client) {
    if (!client) return "<p class=\"empty\">Choose a client.</p>";
    var content = DocChase.reminderContent(client, state.settings.firmName);
    var channelsOff = !state.settings.cadence.email && !state.settings.cadence.text;
    if (content.suppressed || channelsOff) {
      var reason = content.suppressed
        ? "No reminder is queued. Every expected document for this checklist is in, or the return is filed, so outreach stops."
        : "Both channels are off, so nothing would be scheduled.";
      return "<div class=\"suppressed\"><h3>Nothing would be sent</h3><p>" + esc(reason) + "</p></div>";
    }
    var missing = content.lines.map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("");
    var emailBlock = state.settings.cadence.email ? "" +
      "<article class=\"sheet\"><p class=\"sheet-kicker\">Email preview · not sent</p>" +
      "<p class=\"meta-line\"><span>From</span> " + esc(state.settings.firmName) + "</p>" +
      "<p class=\"meta-line\"><span>To</span> " + esc(client.email) + "</p>" +
      "<p class=\"meta-line\"><span>Subject</span> " + esc(content.subject) + "</p>" +
      "<pre class=\"letter\">" + esc(content.email) + "</pre></article>" : "";
    var textBlock = state.settings.cadence.text ? "" +
      "<article class=\"phone\"><p class=\"sheet-kicker\">Text preview · not sent</p><div class=\"bubble\">" +
      esc(content.text) + "</div></article>" : "";
    return "<p class=\"quiet\">Missing items in this preview (" + content.lines.length + "). Received documents are left out.</p>" +
      "<ul class=\"missing-list\">" + missing + "</ul>" +
      "<div class=\"preview-grid\">" + emailBlock + textBlock + "</div>" +
      "<p class=\"link-note\">Simulated checklist link: <a href=\"#/portal/" + esc(client.id) + "\">#/portal/" + esc(client.id) + "</a></p>";
  }

  function portalHtml() {
    var options = state.clients.map(function (client) {
      return "<option value=\"" + esc(client.id) + "\"" + (client.id === ui.portalId ? " selected" : "") + ">" +
        esc(client.name) + " · " + esc(client.taxYear) + "</option>";
    }).join("");
    var client = findClient(ui.portalId);
    var chips = client ? suggestions(client).map(function (name) {
      return "<button type=\"button\" class=\"chip-btn\" data-action=\"use-sample\" data-name=\"" + esc(name) + "\">" + esc(name) + "</button>";
    }).join("") : "";
    var undo = ui.undo && ui.undo.clientId === ui.portalId
      ? "<button type=\"button\" class=\"btn btn-ghost\" data-action=\"undo\">Undo last upload</button>" : "";
    return "" +
      "<div class=\"callout\"><strong>Simulated AI.</strong> This classifier reads the file name only: form type, a payer word, and a tax year. It is rule-based, it is labeled as a simulation, and it never reads file contents or sends them anywhere.</div>" +
      "<div class=\"portal-layout\">" +
        "<form id=\"portal-form\" class=\"panel\" action=\"#\" method=\"post\">" +
          "<h2>Client upload link</h2>" +
          "<label>Checklist<select id=\"portal-client\">" + options + "</select></label>" +
          "<p class=\"link-note\">One link per checklist. Staff can open <code>#/portal/" + esc(ui.portalId) + "</code> to stand in for the client.</p>" +
          "<label>File name<input id=\"portal-name\" type=\"text\" value=\"" + esc(ui.portalName) + "\" placeholder=\"1099-INT_2026.pdf\" autocomplete=\"off\"></label>" +
          "<label class=\"file-pick\">Or choose a file on this computer<input id=\"portal-file\" type=\"file\"><span class=\"quiet\">Only the name is used. The bytes stay on this machine.</span></label>" +
          "<div class=\"dropzone\" data-dropzone=\"true\"><strong>Drop a file here</strong><span>The name is classified. Nothing is uploaded.</span></div>" +
          "<p class=\"quiet\">Try a sample file name</p>" +
          "<div class=\"chips\">" + chips + "</div>" +
          "<div class=\"form-row\">" +
            "<button type=\"submit\" class=\"btn btn-primary\">Classify and match</button>" + undo +
          "</div>" +
        "</form>" +
        "<div id=\"match-result\">" + resultHtml() + "</div>" +
      "</div>";
  }

  function resultHtml() {
    var match = ui.lastMatch;
    if (!match || match.clientId !== ui.portalId) {
      return "<section class=\"panel result-idle\"><h2>Waiting for a file name</h2><p>Classify a name to see the document type, tax year, confidence, and the checklist line it would satisfy.</p></section>";
    }
    var result = match.result;
    var client = findClient(match.clientId);
    var confidence = Math.round((result.confidence || 0) * 100);
    var year = result.year == null ? "Not detected" : String(result.year);
    var outcome = "No checklist change";
    if (match.outcome && match.outcome.applied && match.outcome.kind === "flag") outcome = "Flagged as the wrong year";
    else if (match.outcome && match.outcome.applied && match.outcome.kind === "replace") outcome = "Replaced the file on the checklist";
    else if (match.outcome && match.outcome.applied) outcome = "Matched and marked received";
    var wrong = result.wrongYear
      ? "<p class=\"flag\">Wrong year. This file looks like " + esc(year) + ". " + esc(client ? client.name : "This client") + "'s checklist is for " + esc(client ? client.taxYear : "") + ".</p>"
      : "";
    return "<section class=\"panel result\" aria-live=\"polite\">" +
      "<p class=\"kicker\">Simulated AI · rule-based</p>" +
      "<h2>" + esc(result.filename || "File") + "</h2>" +
      "<dl class=\"facts\">" +
        "<div><dt>Detected</dt><dd>" + esc(result.typeLabel || "Unrecognized") + "</dd></div>" +
        "<div><dt>Tax year</dt><dd>" + esc(year) + "</dd></div>" +
        "<div><dt>Confidence</dt><dd>" + confidence + "%</dd></div>" +
        "<div><dt>Checklist line</dt><dd>" + esc(result.itemLabel ? result.itemLabel + (result.payer ? " · " + result.payer : "") : "No matching line") + "</dd></div>" +
        "<div><dt>Result</dt><dd>" + esc(outcome) + "</dd></div>" +
      "</dl>" +
      "<div class=\"meter\" aria-hidden=\"true\"><i style=\"width:" + confidence + "%\"></i></div>" +
      wrong +
      "<p>" + esc(result.note) + "</p>" +
    "</section>";
  }

  function settingsHtml() {
    var settings = state.settings;
    return "" +
      "<form id=\"settings-form\" class=\"panel settings\" action=\"#\" method=\"post\">" +
        "<h2>Firm</h2>" +
        "<label>Firm name<input id=\"firm-name\" type=\"text\" value=\"" + esc(settings.firmName) + "\" autocomplete=\"organization\"></label>" +
        "<p class=\"form-error\" id=\"firm-error\" role=\"alert\"></p>" +
        "<label>Tax deadline<input id=\"tax-deadline\" type=\"date\" value=\"" + esc(settings.taxDeadline) + "\"></label>" +
        "<p class=\"form-error\" id=\"deadline-error\" role=\"alert\"></p>" +
        "<p class=\"quiet\">The deadline drives the days-to-deadline figure on the dashboard. Reminder cadence lives on the Reminders page.</p>" +
        "<button type=\"submit\" class=\"btn btn-primary\">Save settings</button>" +
        "<p class=\"quiet\" id=\"settings-saved\">Stored in local storage on this browser.</p>" +
      "</form>" +
      "<section class=\"panel danger-zone\">" +
        "<h2>Demo data</h2>" +
        "<p>Put the twelve fictional clients, their checklists, and these settings back to the original sample firm.</p>" +
        "<button type=\"button\" class=\"btn btn-danger\" data-action=\"reset-open\">Reset demo data</button>" +
        "<p class=\"quiet\"><a href=\"../privacy.html\">Privacy</a> · <a href=\"../terms.html\">Terms</a></p>" +
      "</section>";
  }

  function paintClientTable() {
    var body = document.getElementById("client-rows");
    if (!body) return;
    var rows = filteredClients();
    body.innerHTML = clientRowsHtml(rows);
    var count = document.getElementById("client-count");
    if (count) count.textContent = rows.length + " shown";
  }

  function commitCadence() {
    var error = document.getElementById("cadence-error");
    var first = Number(document.getElementById("cadence-first").value);
    var interval = Number(document.getElementById("cadence-interval").value);
    var max = Number(document.getElementById("cadence-max").value);
    var email = document.getElementById("cadence-email").checked;
    var text = document.getElementById("cadence-text").checked;
    var message = "";
    if (!isFinite(first) || first < 0 || first > 60) message = "First reminder must be 0 to 60 days after the request.";
    else if (!isFinite(interval) || interval < 1 || interval > 60) message = "Follow-ups must be 1 to 60 days apart.";
    else if (!isFinite(max) || max < 1 || max > 15) message = "Maximum reminders must be 1 to 15.";
    if (error) error.textContent = message;
    if (message) return;
    state.settings.cadence = {
      daysUntilFirst: first,
      intervalDays: interval,
      maxReminders: max,
      email: email,
      text: text
    };
    save();
    var preview = document.getElementById("reminder-preview");
    if (preview) preview.innerHTML = previewHtml(findClient(ui.reminderId));
    var queue = document.getElementById("reminder-schedule");
    var count = document.getElementById("reminder-count");
    if (queue) {
      var rows = [];
      state.clients.forEach(function (client) {
        DocChase.planReminders(client, state.settings.cadence, new Date()).forEach(function (slot) {
          rows.push({ client: client, slot: slot });
        });
      });
      rows.sort(function (a, b) { return a.slot.date < b.slot.date ? -1 : a.slot.date > b.slot.date ? 1 : 0; });
      if (count) count.textContent = rows.length + " queued";
      queue.innerHTML = rows.length ? rows.map(function (row) {
        return "<li><a href=\"#/clients/" + esc(row.client.id) + "\">" + esc(row.client.name) + "</a><span>" +
          esc(row.slot.status === "due" ? "Due" : "Scheduled") + " " +
          esc(DocChase.formatLong(DocChase.parseISODate(row.slot.date))) + "</span><span class=\"quiet\">" +
          DocChase.missingLines(row.client).length + " items</span></li>";
      }).join("") : "<li class=\"empty\">Nothing is queued.</li>";
    }
  }

  function saveSettings() {
    var nameInput = document.getElementById("firm-name");
    var dateInput = document.getElementById("tax-deadline");
    var name = nameInput.value.trim();
    var deadline = dateInput.value;
    var nameError = name ? "" : "Enter the firm name.";
    var dateError = deadline ? "" : "Choose a tax deadline.";
    document.getElementById("firm-error").textContent = nameError;
    document.getElementById("deadline-error").textContent = dateError;
    nameInput.setAttribute("aria-invalid", nameError ? "true" : "false");
    dateInput.setAttribute("aria-invalid", dateError ? "true" : "false");
    if (nameError || dateError) return;
    state.settings.firmName = name;
    state.settings.taxDeadline = deadline;
    save();
    refreshChrome();
    var note = document.getElementById("settings-saved");
    if (note) note.textContent = "Saved in this browser.";
    toast("Settings saved.");
  }

  function moveClient(id, stage) {
    var client = findClient(id);
    if (!client || !stage || client.stage === stage) return;
    var label = DocChase.stageLabel(stage);
    client.stage = stage;
    log(client, "Moved to " + label + ".");
    save();
    toast(client.name + " moved to " + label + ".");
    render();
  }

  function applyResult(client, result) {
    var item = null;
    client.checklist.forEach(function (row) {
      if (row.id === result.itemId) item = row;
    });
    if (!item) return { applied: false };
    if (result.applyKind === "flag" && item.status === "received") return { applied: false };
    if (result.applyKind !== "flag" && result.applyKind !== "match") return { applied: false };
    ui.undo = { clientId: client.id, snapshot: structuredClone(client) };
    if (result.applyKind === "flag") {
      item.wrongYear = {
        file: result.filename,
        detectedYear: result.year,
        confidence: result.confidence
      };
      item.status = "missing";
      log(client, "Flagged " + result.filename + " as tax year " + result.year + ". " + item.label + " stays outstanding.");
      return { applied: true, kind: "flag" };
    }
    var replaced = item.status === "received";
    item.status = "received";
    item.file = result.filename;
    item.confidence = result.confidence;
    item.detectedYear = result.year;
    item.wrongYear = null;
    var yearNote = result.year ? " Tax year " + result.year + "." : " Tax year was not in the file name.";
    log(client, (replaced ? "Replaced the file on " : "Matched ") + item.label +
      (item.payer ? " · " + item.payer : "") + " with " + result.filename + " (" + pctLabel(result.confidence) + ")." + yearNote);
    if (DocChase.syncStage(client)) {
      log(client, "Stage updated to " + DocChase.stageLabel(client.stage) + " because the checklist changed.");
    }
    if (DocChase.isComplete(client)) log(client, "Checklist complete. Further reminders stop.");
    return { applied: true, kind: replaced ? "replace" : "match" };
  }

  function runClassify() {
    var client = findClient(ui.portalId);
    if (!client) return;
    var name = ui.portalName.trim();
    var result = DocChase.classifyFile(name, client);
    var outcome = { applied: false };
    if (name && (result.applyKind === "match" || result.applyKind === "flag")) {
      outcome = applyResult(client, result);
      if (outcome.applied) {
        save();
        toast(outcome.kind === "flag" ? "Wrong-year document flagged." : "Matched to the checklist.");
      }
    }
    ui.lastMatch = { result: result, outcome: outcome, clientId: client.id };
    render();
    var panel = document.getElementById("match-result");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ block: "nearest" });
  }

  function removeFile(clientId, itemId) {
    var client = findClient(clientId);
    if (!client) return;
    var item = null;
    client.checklist.forEach(function (row) { if (row.id === itemId) item = row; });
    if (!item || item.status !== "received") return;
    var name = item.file;
    item.status = "missing";
    item.file = null;
    item.confidence = null;
    item.detectedYear = null;
    log(client, "Removed " + name + " from " + item.label + ". The line is outstanding again.");
    if (DocChase.syncStage(client)) {
      log(client, "Stage updated to " + DocChase.stageLabel(client.stage) + ".");
    }
    save();
    toast("File removed.");
    render();
  }

  function clearFlag(clientId, itemId) {
    var client = findClient(clientId);
    if (!client) return;
    var item = null;
    client.checklist.forEach(function (row) { if (row.id === itemId) item = row; });
    if (!item || !item.wrongYear) return;
    var name = item.wrongYear.file;
    item.wrongYear = null;
    log(client, "Cleared the wrong-year flag for " + name + " on " + item.label + ".");
    save();
    toast("Flag cleared.");
    render();
  }

  function openModal() {
    ui.lastFocus = document.activeElement;
    var modal = document.getElementById("modal");
    modal.hidden = false;
    document.getElementById("modal-cancel").focus();
  }

  function closeModal() {
    var modal = document.getElementById("modal");
    if (modal.hidden) return;
    modal.hidden = true;
    if (ui.lastFocus && ui.lastFocus.focus) ui.lastFocus.focus();
  }

  function resetDemo() {
    try { localStorage.removeItem(KEY); } catch (err) {}
    state = cloneSeed();
    persistent = canStore();
    if (persistent) save();
    ui.q = "";
    ui.stage = "all";
    ui.preparer = "all";
    ui.openOnly = false;
    ui.reminderId = firstOpenId();
    ui.portalId = firstOpenId();
    ui.portalName = "";
    ui.lastMatch = null;
    ui.undo = null;
    closeModal();
    if (location.hash !== "#/dashboard") {
      focusTitle = true;
      location.hash = "#/dashboard";
    } else {
      render();
    }
    toast("Demo data reset.");
  }

  function openNav() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("nav-backdrop").hidden = false;
  }

  function closeNav() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("nav-backdrop").hidden = true;
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-nav]")) closeNav();
    if (event.target.id === "nav-backdrop") closeNav();
    var button = event.target.closest("[data-action]");
    if (!button) {
      var row = event.target.closest("tr[data-href]");
      if (row && !event.target.closest("a, button, select, input, label")) {
        location.hash = row.getAttribute("data-href");
      }
      return;
    }
    var action = button.getAttribute("data-action");
    if (action === "open-nav") openNav();
    else if (action === "reset-open") openModal();
    else if (action === "modal-cancel") closeModal();
    else if (action === "modal-confirm") resetDemo();
    else if (action === "remove-file") removeFile(button.getAttribute("data-client"), button.getAttribute("data-item"));
    else if (action === "clear-flag") clearFlag(button.getAttribute("data-client"), button.getAttribute("data-item"));
    else if (action === "undo") {
      if (!ui.undo) return;
      var index = -1;
      state.clients.forEach(function (client, i) { if (client.id === ui.undo.clientId) index = i; });
      if (index >= 0) state.clients[index] = ui.undo.snapshot;
      ui.undo = null;
      ui.lastMatch = null;
      save();
      toast("Last upload undone.");
      render();
    } else if (action === "use-sample") {
      ui.portalName = button.getAttribute("data-name") || "";
      runClassify();
    }
  });

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (target.id === "filter-stage") {
      ui.stage = target.value;
      render();
    } else if (target.id === "filter-preparer") {
      ui.preparer = target.value;
      render();
    } else if (target.id === "filter-open") {
      ui.openOnly = target.checked;
      render();
    } else if (target.id === "reminder-client") {
      ui.reminderId = target.value;
      var preview = document.getElementById("reminder-preview");
      if (preview) preview.innerHTML = previewHtml(findClient(ui.reminderId));
    } else if (target.id === "portal-client") {
      ui.portalId = target.value;
      ui.lastMatch = null;
      if (location.hash.indexOf("#/portal") === 0) {
        focusTitle = false;
        location.hash = "#/portal/" + ui.portalId;
      } else render();
    } else if (target.id === "portal-file") {
      var file = target.files && target.files[0];
      if (!file) return;
      ui.portalName = file.name;
      var nameInput = document.getElementById("portal-name");
      if (nameInput) nameInput.value = file.name;
    } else if (target.getAttribute("data-action") === "move-stage") {
      moveClient(target.getAttribute("data-client"), target.value);
    } else if (target.id === "cadence-email" || target.id === "cadence-text" || target.id === "cadence-first" || target.id === "cadence-interval" || target.id === "cadence-max") {
      commitCadence();
    }
  });

  document.addEventListener("input", function (event) {
    var target = event.target;
    if (target.id === "client-search") {
      ui.q = target.value;
      paintClientTable();
    } else if (target.id === "portal-name") {
      ui.portalName = target.value;
    } else if (target.id === "cadence-first" || target.id === "cadence-interval" || target.id === "cadence-max") {
      commitCadence();
    }
  });

  document.addEventListener("submit", function (event) {
    var id = event.target.id;
    if (id === "cadence-form" || id === "settings-form" || id === "portal-form") event.preventDefault();
    if (id === "settings-form") saveSettings();
    if (id === "portal-form") {
      var typed = document.getElementById("portal-name");
      if (typed) ui.portalName = typed.value;
      runClassify();
    }
  });

  document.addEventListener("dragstart", function (event) {
    var handle = event.target.closest("[data-drag-id]");
    if (!handle) return;
    dragId = handle.getAttribute("data-drag-id");
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", dragId);
      event.dataTransfer.effectAllowed = "move";
    }
    var card = handle.closest(".card");
    if (card) card.classList.add("dragging");
  });

  document.addEventListener("dragend", function () {
    dragId = null;
    document.querySelectorAll(".dragging, .drop-over").forEach(function (el) {
      el.classList.remove("dragging", "drop-over");
    });
  });

  document.addEventListener("dragover", function (event) {
    var column = event.target.closest("[data-drop]");
    var zone = event.target.closest("[data-dropzone]");
    if (!column && !zone) return;
    event.preventDefault();
    if (column) column.classList.add("drop-over");
  });

  document.addEventListener("dragleave", function (event) {
    var column = event.target.closest("[data-drop]");
    if (column && !column.contains(event.relatedTarget)) column.classList.remove("drop-over");
  });

  document.addEventListener("drop", function (event) {
    var column = event.target.closest("[data-drop]");
    if (column && dragId) {
      event.preventDefault();
      var id = dragId;
      dragId = null;
      column.classList.remove("drop-over");
      moveClient(id, column.getAttribute("data-drop"));
      return;
    }
    var zone = event.target.closest("[data-dropzone]");
    if (!zone) return;
    event.preventDefault();
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    ui.portalName = file.name;
    runClassify();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeModal();
    closeNav();
  });

  window.addEventListener("hashchange", function () {
    focusTitle = true;
    closeNav();
    render();
  });

  state = load();
  ui.portalId = firstOpenId();
  ui.reminderId = firstOpenId();
  if (!location.hash) history.replaceState(null, "", "#/dashboard");
  render();
})();
