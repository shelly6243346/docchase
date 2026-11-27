/* DocChase prototype logic. Rule-based simulation only — no model, no network. */
(function (root) {
  "use strict";

  var STAGES = [
    { id: "requested", label: "Requested" },
    { id: "partial", label: "Partially received" },
    { id: "ready", label: "Ready to prepare" },
    { id: "preparing", label: "In preparation" },
    { id: "review", label: "In review" },
    { id: "waiting", label: "Waiting on client" },
    { id: "filed", label: "Filed" }
  ];

  var DOC_TYPES = {
    w2: {
      label: "Form W-2",
      strong: [/\bw[\s_-]?2\b/i, /wage[\s_-]*statement/i],
      weak: []
    },
    nec: {
      label: "Form 1099-NEC",
      strong: [/1099[\s_-]*nec/i],
      weak: []
    },
    int: {
      label: "Form 1099-INT",
      strong: [/1099[\s_-]*int/i],
      weak: [/\binterest\b/i]
    },
    div: {
      label: "Form 1099-DIV",
      strong: [/1099[\s_-]*div/i],
      weak: [/\bdividend/i]
    },
    b: {
      label: "Form 1099-B",
      strong: [/1099[\s_-]*b\b/i, /consolidated[\s_-]*1099/i],
      weak: [/brokerage/i]
    },
    r: {
      label: "Form 1099-R",
      strong: [/1099[\s_-]*r\b/i],
      weak: [/pension[\s_-]*distribution/i]
    },
    k1099: {
      label: "Form 1099-K",
      strong: [/1099[\s_-]*k\b/i],
      weak: []
    },
    ssa: {
      label: "SSA-1099",
      strong: [/ssa[\s_-]*1099/i, /social[\s_-]*security/i],
      weak: []
    },
    k1: {
      label: "Schedule K-1",
      strong: [/\bk[\s_-]?1\b/i],
      weak: []
    },
    e1098: {
      label: "Form 1098-E",
      strong: [/1098[\s_-]*e\b/i, /student[\s_-]*loan/i],
      weak: []
    },
    m1098: {
      label: "Form 1098",
      strong: [/1098(?![\s_-]*[a-z])/i, /mortgage[\s_-]*interest/i],
      weak: [/\bmortgage\b/i]
    },
    property: {
      label: "Property tax bill",
      strong: [/property[\s_-]*tax/i, /county[\s_-]*tax[\s_-]*bill/i],
      weak: []
    },
    charity: {
      label: "Charitable receipts",
      strong: [/charit/i, /donat/i, /\bcontribution/i],
      weak: []
    },
    care: {
      label: "Childcare statement",
      strong: [/child[\s_-]*care/i, /day[\s_-]*care/i, /dependent[\s_-]*care/i, /\b2441\b/i],
      weak: []
    },
    pnl: {
      label: "Profit and loss",
      strong: [/profit[\s_-]*and[\s_-]*loss/i, /\bp\s*&\s*l\b/i, /income[\s_-]*statement/i],
      weak: []
    },
    bank: {
      label: "Bank statements",
      strong: [/bank[\s_-]*statement/i],
      weak: []
    },
    mileage: {
      label: "Mileage log",
      strong: [/mileage/i],
      weak: []
    },
    expenses: {
      label: "Expense summary",
      strong: [/expense[\s_-]*summary/i, /business[\s_-]*expenses/i],
      weak: []
    }
  };

  var STOP_WORDS = {
    form: 1, from: 1, bank: 1, city: 1, county: 1, family: 1, trust: 1,
    llc: 1, inc: 1, corp: 1, corporation: 1,
    statement: 1, statements: 1, receipts: 1, receipt: 1,
    center: 1, medical: 1, investments: 1, brokerage: 1,
    credit: 1, union: 1, mutual: 1, fund: 1, funds: 1, community: 1,
    school: 1, schools: 1, district: 1, academy: 1, clinic: 1, hotels: 1, hotel: 1,
    catering: 1, design: 1, savings: 1, health: 1, foundation: 1,
    retirement: 1, state: 1, loan: 1, servicing: 1,
    freight: 1, labs: 1, food: 1, studio: 1,
    and: 1, the: 1, for: 1, with: 1, personal: 1,
    north: 1, south: 1, east: 1, west: 1, lake: 1
  };

  function stageLabel(id) {
    for (var i = 0; i < STAGES.length; i += 1) {
      if (STAGES[i].id === id) return STAGES[i].label;
    }
    return id;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    var next = startOfDay(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function parseISODate(iso) {
    var parts = String(iso || "").slice(0, 10).split("-");
    if (parts.length !== 3) return new Date(NaN);
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatISODate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1);
    var d = String(date.getDate());
    if (m.length < 2) m = "0" + m;
    if (d.length < 2) d = "0" + d;
    return y + "-" + m + "-" + d;
  }

  function daysBetween(from, to) {
    var ms = startOfDay(to).getTime() - startOfDay(from).getTime();
    return Math.round(ms / 86400000);
  }

  function daysUntil(dateISO, today) {
    var target = parseISODate(dateISO);
    if (isNaN(target.getTime())) return null;
    return daysBetween(startOfDay(today || new Date()), target);
  }

  function formatLong(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function formatWhen(iso) {
    if (!iso) return "";
    var hasTime = String(iso).indexOf("T") !== -1;
    if (!hasTime) return formatLong(parseISODate(iso));
    var parsed = new Date(iso);
    if (isNaN(parsed.getTime())) return String(iso);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(parsed);
  }

  function outstandingItems(client) {
    return (client.checklist || []).filter(function (item) {
      return item.status !== "received";
    });
  }

  function isComplete(client) {
    return client.checklist && client.checklist.length > 0 && outstandingItems(client).length === 0;
  }

  function receivedCount(client) {
    return (client.checklist || []).filter(function (item) {
      return item.status === "received";
    }).length;
  }

  function syncStage(client) {
    if (client.stage !== "requested" && client.stage !== "partial" && client.stage !== "ready") {
      return false;
    }
    var open = outstandingItems(client).length;
    var received = (client.checklist || []).length - open;
    var next = client.stage;
    if ((client.checklist || []).length > 0 && open === 0) next = "ready";
    else if (received === 0) next = "requested";
    else next = "partial";
    if (next !== client.stage) {
      client.stage = next;
      return true;
    }
    return false;
  }

  function planReminders(client, cadence, today) {
    var today0 = startOfDay(today || new Date());
    if (!cadence || (!cadence.email && !cadence.text)) return [];
    if (client.stage === "filed" || isComplete(client)) return [];
    var max = Math.max(0, Number(cadence.maxReminders) || 0);
    var interval = Math.max(1, Number(cadence.intervalDays) || 1);
    var firstDelay = Math.max(0, Number(cadence.daysUntilFirst) || 0);
    var sentList = Array.isArray(client.sentReminders) ? client.sentReminders : [];
    var remaining = max - sentList.length;
    if (remaining <= 0) return [];
    var cursor = sentList.length === 0
      ? addDays(parseISODate(client.requestedAt), firstDelay)
      : addDays(parseISODate(sentList[sentList.length - 1].at), interval);
    var planned = [];
    if (cursor < today0) {
      planned.push({ date: formatISODate(today0), status: "due" });
      remaining -= 1;
      cursor = addDays(today0, interval);
    }
    while (remaining > 0) {
      planned.push({
        date: formatISODate(cursor),
        status: cursor.getTime() === today0.getTime() ? "due" : "scheduled"
      });
      remaining -= 1;
      cursor = addDays(cursor, interval);
    }
    return planned;
  }

  function missingLines(client) {
    return outstandingItems(client).map(function (item) {
      var who = item.payer ? item.label + " — " + item.payer : item.label;
      if (item.wrongYear && item.wrongYear.detectedYear) {
        return who + " (need " + client.taxYear + "; " + item.wrongYear.detectedYear + " copy does not count)";
      }
      return who + " (" + client.taxYear + ")";
    });
  }

  function reminderContent(client, firmName) {
    var lines = missingLines(client);
    var firm = firmName || "Your tax firm";
    var first = String(client.name || "there").split(" ")[0];
    if (!lines.length) {
      return {
        lines: [],
        subject: "No documents outstanding for " + client.taxYear,
        email: first + ", every document on the " + client.taxYear + " checklist is in. " + firm + " would not send a reminder.",
        text: "",
        suppressed: true
      };
    }
    var bullets = lines.map(function (line) { return "• " + line; }).join("\n");
    var subject = lines.length === 1
      ? "Still need 1 document for your " + client.taxYear + " return"
      : "Still need " + lines.length + " documents for your " + client.taxYear + " return";
    var email = [
      "Hello " + first + ",",
      "",
      firm + " is collecting documents for your " + client.taxYear + " return. This note lists only what is still missing:",
      "",
      bullets,
      "",
      "Upload those files with the checklist link you already have. Reminders stop automatically once every item has arrived.",
      "",
      firm
    ].join("\n");
    var compact = lines.map(function (line) {
      return line.replace(" — ", " ");
    }).join("; ");
    var text = firm + ": Hi " + first + " — still missing for " + client.taxYear + ": " + compact + ". Reminders stop when these arrive.";
    return { lines: lines, subject: subject, email: email, text: text, suppressed: false };
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function testPattern(re, value) {
    return new RegExp(re.source, re.flags).test(value);
  }

  function detectYear(name) {
    var found = [];
    var re = /\b(20\d{2})\b/g;
    var match;
    while ((match = re.exec(name))) {
      var year = Number(match[1]);
      if (year >= 2015 && year <= 2035) found.push(year);
    }
    var shortYear = String(name).match(/\bty[\s_-]?(\d{2})\b/i);
    if (shortYear) {
      var two = Number(shortYear[1]);
      found.push(two >= 70 ? 1900 + two : 2000 + two);
    }
    if (!found.length) return null;
    return found[found.length - 1];
  }

  function payerTokens(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (word) {
        return word.length >= 4 && !STOP_WORDS[word];
      });
  }

  function classifyFile(filename, client) {
    var name = String(filename || "").trim();
    // Underscores are word characters, so word boundaries would miss W-2, K-1, and years in file names.
    var haystack = name.replace(/_/g, " ");
    var result = {
      filename: name,
      recognized: false,
      docType: null,
      typeLabel: null,
      year: null,
      wrongYear: false,
      confidence: 0,
      itemId: null,
      itemLabel: null,
      payer: null,
      note: "",
      ambiguousPayer: false,
      replacing: false,
      applyKind: "none"
    };
    if (!name) {
      result.note = "Enter a file name to classify.";
      return result;
    }

    var scores = [];
    Object.keys(DOC_TYPES).forEach(function (key) {
      var rule = DOC_TYPES[key];
      var best = 0;
      var strongHits = 0;
      rule.strong.forEach(function (re) {
        if (testPattern(re, haystack)) {
          strongHits += 1;
          if (best < 0.93) best = 0.93;
        }
      });
      rule.weak.forEach(function (re) {
        if (testPattern(re, haystack) && best < 0.76) best = 0.76;
      });
      if (strongHits >= 2 && best < 0.96) best = 0.96;
      if (best > 0) scores.push({ key: key, score: best });
    });
    scores.sort(function (a, b) { return b.score - a.score; });

    var year = detectYear(haystack);
    result.year = year;
    if (!scores.length) {
      result.confidence = 0.18;
      result.note = "No document type was recognized from this file name. Nothing was changed.";
      if (client && year && year !== client.taxYear) {
        result.wrongYear = true;
        result.note = "No document type was recognized. The name includes " + year + ", and this checklist is for " + client.taxYear + ". Nothing was changed.";
      }
      return result;
    }

    var top = scores[0];
    var confidence = top.score;
    if (scores[1] && top.score - scores[1].score < 0.08) confidence -= 0.06;
    result.recognized = true;
    result.docType = top.key;
    result.typeLabel = DOC_TYPES[top.key].label;

    if (!client) {
      result.confidence = round2(Math.max(0.5, confidence));
      result.note = result.typeLabel + " recognized from the file name.";
      return result;
    }

    if (year == null) confidence -= 0.05;
    else if (year !== client.taxYear) result.wrongYear = true;

    var candidates = (client.checklist || []).filter(function (item) {
      return item.docType === top.key;
    });
    if (!candidates.length) {
      result.confidence = round2(Math.max(0.55, confidence - 0.05));
      var yearBit = year ? " for " + year : "";
      result.note = result.typeLabel + " was recognized" + yearBit + ", but this checklist does not ask for that form. Nothing was changed.";
      if (result.wrongYear) {
        result.note = result.typeLabel + " looks like tax year " + year + ". This checklist is for " + client.taxYear + ", and it does not ask for that form. Nothing was changed.";
      }
      return result;
    }

    var chosen = null;
    var overlap = 0;
    var lower = haystack.toLowerCase();
    candidates.forEach(function (item) {
      var words = payerTokens(item.payer);
      var hits = words.filter(function (word) { return lower.indexOf(word) !== -1; }).length;
      if (hits > overlap) {
        overlap = hits;
        chosen = item;
      }
    });
    if (!chosen) {
      chosen = null;
      for (var i = 0; i < candidates.length; i += 1) {
        if (candidates[i].status !== "received") {
          chosen = candidates[i];
          break;
        }
      }
      if (!chosen) chosen = candidates[0];
      if (candidates.length > 1) {
        confidence -= 0.08;
        result.ambiguousPayer = true;
      }
    } else {
      confidence += 0.03;
    }

    result.itemId = chosen.id;
    result.itemLabel = chosen.label;
    result.payer = chosen.payer || "";
    result.replacing = chosen.status === "received" && !result.wrongYear;
    result.confidence = round2(Math.min(0.99, Math.max(0.5, confidence)));

    var who = result.payer ? result.typeLabel + " from " + result.payer : result.typeLabel;
    if (result.wrongYear) {
      if (chosen.status === "received") {
        result.applyKind = "none";
        result.note = who + " matched, but the file is tax year " + year + " and a current file is already on this line. Nothing was changed.";
      } else {
        result.applyKind = "flag";
        result.note = who + " matched. The file is tax year " + year + ". This checklist is for " + client.taxYear + ", so the line stays open and the file is flagged.";
      }
    } else if (year == null) {
      result.applyKind = "match";
      result.note = who + " matched. No tax year was in the file name, so confirm it is the " + client.taxYear + " form.";
      if (result.ambiguousPayer) {
        result.note += " The payer was not in the file name, so the first open line of this type was used.";
      }
    } else {
      result.applyKind = "match";
      result.note = who + " matched for tax year " + year + ".";
      if (result.ambiguousPayer) {
        result.note = who + " matched for " + year + ". The payer was not in the file name, so the first open line of this type was used.";
      } else if (result.replacing) {
        result.note += " It will replace the file already recorded on this line.";
      }
    }
    return result;
  }

  function clientMeta(client) {
    if (client.entityName) return client.entityName + " · " + client.filing;
    return client.filing;
  }

  root.DocChase = {
    STAGES: STAGES,
    DOC_TYPES: DOC_TYPES,
    stageLabel: stageLabel,
    parseISODate: parseISODate,
    formatISODate: formatISODate,
    formatLong: formatLong,
    formatWhen: formatWhen,
    daysUntil: daysUntil,
    outstandingItems: outstandingItems,
    isComplete: isComplete,
    receivedCount: receivedCount,
    syncStage: syncStage,
    planReminders: planReminders,
    missingLines: missingLines,
    reminderContent: reminderContent,
    classifyFile: classifyFile,
    detectYear: detectYear,
    clientMeta: clientMeta
  };
})(typeof window !== "undefined" ? window : globalThis);
