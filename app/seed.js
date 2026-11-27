/* Fictional sample firm. Nothing here is a real client, firm, or filing. */
(function (root) {
  "use strict";

  function item(id, docType, label, payer, status, extra) {
    var row = {
      id: id,
      docType: docType,
      label: label,
      payer: payer,
      status: status,
      file: null,
      confidence: null,
      detectedYear: null,
      wrongYear: null
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) { row[key] = extra[key]; });
    }
    return row;
  }

  function received(id, docType, label, payer, file, confidence) {
    return item(id, docType, label, payer, "received", {
      file: file,
      confidence: confidence,
      detectedYear: 2026
    });
  }

  root.DOCCHASE_SEED = {
    version: 1,
    settings: {
      firmName: "Oster & Lane",
      taxDeadline: "2027-04-15",
      cadence: {
        daysUntilFirst: 4,
        intervalDays: 5,
        maxReminders: 6,
        email: true,
        text: true
      }
    },
    clients: [
      {
        id: "maya-chen",
        name: "Maya Chen",
        entityName: "",
        filing: "Single",
        email: "maya.chen@example.com",
        phone: "(415) 555-0148",
        preparer: "Alicia Romero",
        stage: "partial",
        taxYear: 2026,
        requestedAt: "2026-11-12",
        profile: "Last year: one W-2, a savings-account 1099-INT, and cash gifts to a food bank.",
        checklist: [
          received("maya-w2", "w2", "Form W-2", "Northstar Labs", "Chen_Maya_W-2_Northstar_Labs_2026.pdf", 0.97),
          item("maya-int", "int", "Form 1099-INT", "Pier Savings", "missing"),
          item("maya-gift", "charity", "Charitable receipts", "Redwood Food Bank", "missing")
        ],
        sentReminders: [
          { id: "maya-r1", at: "2026-11-16T09:10:00", channel: "email" },
          { id: "maya-r2", at: "2026-11-21T09:05:00", channel: "email" }
        ],
        activity: [
          { id: "maya-a1", at: "2026-11-12T08:40:00", text: "Checklist opened from last year's profile. Upload link created." },
          { id: "maya-a2", at: "2026-11-16T09:10:00", text: "Reminder email listed the W-2, 1099-INT, and charitable receipts." },
          { id: "maya-a3", at: "2026-11-18T15:24:00", text: "Matched Chen_Maya_W-2_Northstar_Labs_2026.pdf to Form W-2 · Northstar Labs (97%)." },
          { id: "maya-a4", at: "2026-11-21T09:05:00", text: "Reminder email listed only the 1099-INT and charitable receipts." }
        ]
      },
      {
        id: "jordan-hale",
        name: "Jordan Hale",
        entityName: "Hale Design",
        filing: "Sole proprietor",
        email: "jordan.hale@example.com",
        phone: "(503) 555-0194",
        preparer: "Ben Cho",
        stage: "requested",
        taxYear: 2026,
        requestedAt: "2026-11-20",
        profile: "Last year: two 1099-NEC clients, a small savings account, and a Schedule C expense summary.",
        checklist: [
          item("jordan-nec-1", "nec", "Form 1099-NEC", "Fathom Studio", "missing"),
          item("jordan-nec-2", "nec", "Form 1099-NEC", "Cedar & Co.", "missing"),
          item("jordan-int", "int", "Form 1099-INT", "Northline Credit Union", "missing"),
          item("jordan-exp", "expenses", "Expense summary", "Hale Design", "missing")
        ],
        sentReminders: [
          { id: "jordan-r1", at: "2026-11-24T10:00:00", channel: "email" }
        ],
        activity: [
          { id: "jordan-a1", at: "2026-11-20T11:15:00", text: "Checklist opened from last year's Schedule C profile. Upload link created." },
          { id: "jordan-a2", at: "2026-11-24T10:00:00", text: "Reminder email listed both 1099-NEC forms, the 1099-INT, and the expense summary." }
        ]
      },
      {
        id: "patel-household",
        name: "Priya & Dev Patel",
        entityName: "",
        filing: "Married filing jointly",
        email: "patel.household@example.com",
        phone: "(312) 555-0177",
        preparer: "Alicia Romero",
        stage: "partial",
        taxYear: 2026,
        requestedAt: "2026-11-08",
        profile: "Last year: two W-2s, mortgage interest, county property tax, childcare, and chapel gifts.",
        checklist: [
          received("patel-w2-p", "w2", "Form W-2", "Lakeview Schools (Priya)", "Patel_Priya_W-2_Lakeview_Schools_2026.pdf", 0.98),
          received("patel-w2-d", "w2", "Form W-2", "Northline Freight (Dev)", "Patel_Dev_W-2_Northline_Freight_2026.pdf", 0.96),
          received("patel-1098", "m1098", "Form 1098", "Lumen Mortgage", "Patel_1098_Lumen_Mortgage_2026.pdf", 0.95),
          item("patel-tax", "property", "Property tax bill", "Lakeside County", "missing"),
          item("patel-care", "care", "Childcare statement", "Little Oaks Academy", "missing"),
          item("patel-gift", "charity", "Charitable receipts", "North Chapel", "missing")
        ],
        sentReminders: [
          { id: "patel-r1", at: "2026-11-12T09:00:00", channel: "email" },
          { id: "patel-r2", at: "2026-11-17T09:00:00", channel: "text" },
          { id: "patel-r3", at: "2026-11-22T09:12:00", channel: "email" }
        ],
        activity: [
          { id: "patel-a1", at: "2026-11-08T08:20:00", text: "Joint checklist opened from last year's profile. One upload link for the household." },
          { id: "patel-a2", at: "2026-11-16T13:40:00", text: "Matched both W-2s. Mortgage interest from Lumen Mortgage matched the same afternoon." },
          { id: "patel-a3", at: "2026-11-22T09:12:00", text: "Reminder listed only property tax, childcare, and North Chapel receipts." }
        ]
      },
      {
        id: "elena-vasquez",
        name: "Elena Vasquez",
        entityName: "",
        filing: "Single",
        email: "elena.vasquez@example.com",
        phone: "(212) 555-0162",
        preparer: "Naomi Ivers",
        stage: "ready",
        taxYear: 2026,
        requestedAt: "2026-11-04",
        profile: "Last year: a W-2 plus a brokerage account that issues DIV and B, and a separate savings 1099-INT.",
        checklist: [
          received("elena-w2", "w2", "Form W-2", "Meridian Health", "Vasquez_Elena_W-2_Meridian_Health_2026.pdf", 0.97),
          received("elena-div", "div", "Form 1099-DIV", "Copperleaf Investments", "Vasquez_1099-DIV_Copperleaf_2026.pdf", 0.96),
          received("elena-b", "b", "Form 1099-B", "Copperleaf Investments", "Vasquez_1099-B_Copperleaf_2026.pdf", 0.94),
          received("elena-int", "int", "Form 1099-INT", "Keel Savings", "Vasquez_1099-INT_Keel_Savings_2026.pdf", 0.95)
        ],
        sentReminders: [
          { id: "elena-r1", at: "2026-11-08T09:30:00", channel: "email" },
          { id: "elena-r2", at: "2026-11-13T09:30:00", channel: "email" }
        ],
        activity: [
          { id: "elena-a1", at: "2026-11-04T10:00:00", text: "Checklist opened from last year's investment profile." },
          { id: "elena-a2", at: "2026-11-19T16:05:00", text: "Last item, Keel Savings 1099-INT, matched at 95%. Checklist complete. Reminders stopped." },
          { id: "elena-a3", at: "2026-11-19T16:06:00", text: "Moved to Ready to prepare." }
        ]
      },
      {
        id: "northwind",
        name: "Sam Okonkwo",
        entityName: "Northwind Studio LLC",
        filing: "S corporation",
        email: "sam.okonkwo@example.com",
        phone: "(206) 555-0119",
        preparer: "Ben Cho",
        stage: "waiting",
        taxYear: 2026,
        requestedAt: "2026-11-10",
        profile: "Last year: officer wages, a compiled profit and loss, and a K-1 from a real-estate partnership.",
        checklist: [
          received("nw-w2", "w2", "Form W-2", "Northwind Studio LLC", "Okonkwo_W-2_Northwind_Studio_2026.pdf", 0.98),
          received("nw-pnl", "pnl", "Profit and loss", "Northwind Studio LLC", "Northwind_Studio_Profit_and_Loss_2026.pdf", 0.91),
          item("nw-k1", "k1", "Schedule K-1", "Cedar Wharf LP", "missing")
        ],
        sentReminders: [
          { id: "nw-r1", at: "2026-11-14T09:00:00", channel: "email" },
          { id: "nw-r2", at: "2026-11-19T09:00:00", channel: "email" },
          { id: "nw-r3", at: "2026-11-24T09:20:00", channel: "email" }
        ],
        activity: [
          { id: "nw-a1", at: "2026-11-10T14:10:00", text: "S corporation checklist opened. Officer W-2, P&L, and the Cedar Wharf LP K-1 are expected." },
          { id: "nw-a2", at: "2026-11-18T11:45:00", text: "Officer W-2 and the profit and loss matched." },
          { id: "nw-a3", at: "2026-11-25T15:30:00", text: "Asked Sam whether the Cedar Wharf LP interest is passive. Moved to Waiting on client. The K-1 is still outstanding, so reminders continue for that item only." }
        ]
      },
      {
        id: "robert-ellison",
        name: "Robert Ellison",
        entityName: "",
        filing: "Single",
        email: "robert.ellison@example.com",
        phone: "(617) 555-0133",
        preparer: "Naomi Ivers",
        stage: "review",
        taxYear: 2026,
        requestedAt: "2026-11-03",
        profile: "Last year: a pension 1099-R, Social Security, a bank 1099-INT, and brokerage dividends.",
        checklist: [
          received("rob-r", "r", "Form 1099-R", "State Educators Retirement", "Ellison_1099-R_Educators_2026.pdf", 0.96),
          received("rob-ssa", "ssa", "SSA-1099", "Social Security Administration", "Ellison_SSA-1099_2026.pdf", 0.99),
          received("rob-int", "int", "Form 1099-INT", "Fieldstone Bank", "Ellison_1099-INT_Fieldstone_2026.pdf", 0.95),
          received("rob-div", "div", "Form 1099-DIV", "Highline Brokerage", "Ellison_1099-DIV_Highline_2026.pdf", 0.94)
        ],
        sentReminders: [
          { id: "rob-r1", at: "2026-11-07T09:00:00", channel: "email" },
          { id: "rob-r2", at: "2026-11-12T09:00:00", channel: "email" }
        ],
        activity: [
          { id: "rob-a1", at: "2026-11-03T09:00:00", text: "Retiree checklist opened from last year's profile." },
          { id: "rob-a2", at: "2026-11-15T10:20:00", text: "Checklist complete. Reminders stopped." },
          { id: "rob-a3", at: "2026-11-21T13:00:00", text: "Naomi Ivers started the return and moved it to In preparation." },
          { id: "rob-a4", at: "2026-11-26T16:40:00", text: "Moved to In review. Pension and Social Security amounts are the review focus." }
        ]
      },
      {
        id: "aisha-rahman",
        name: "Aisha Rahman",
        entityName: "",
        filing: "Single",
        email: "aisha.rahman@example.com",
        phone: "(510) 555-0186",
        preparer: "Alicia Romero",
        stage: "preparing",
        taxYear: 2026,
        requestedAt: "2026-11-06",
        profile: "Last year: a city W-2, student-loan interest, and one charitable gift.",
        checklist: [
          received("aisha-w2", "w2", "Form W-2", "City of Lake Oster", "Rahman_Aisha_W-2_Lake_Oster_2026.pdf", 0.97),
          received("aisha-e", "e1098", "Form 1098-E", "Campus Loan Servicing", "Rahman_1098-E_Campus_Loan_2026.pdf", 0.98),
          received("aisha-gift", "charity", "Charitable receipts", "Westbrook Community Fund", "Rahman_Westbrook_Charitable_2026.pdf", 0.9)
        ],
        sentReminders: [
          { id: "aisha-r1", at: "2026-11-10T09:15:00", channel: "email" }
        ],
        activity: [
          { id: "aisha-a1", at: "2026-11-06T09:45:00", text: "Checklist opened from last year's profile." },
          { id: "aisha-a2", at: "2026-11-18T12:10:00", text: "Checklist complete after the Westbrook gift letter matched. Reminders stopped." },
          { id: "aisha-a3", at: "2026-11-24T11:00:00", text: "Alicia Romero moved the file to In preparation and pinned student-loan interest to the draft." }
        ]
      },
      {
        id: "brennan-trust",
        name: "Helen Brennan",
        entityName: "Brennan Family Trust",
        filing: "Fiduciary",
        email: "helen.brennan@example.com",
        phone: "(303) 555-0104",
        preparer: "Naomi Ivers",
        stage: "partial",
        taxYear: 2026,
        requestedAt: "2026-11-09",
        profile: "Last year: trust brokerage interest, dividends, a consolidated 1099-B, and one partnership K-1.",
        checklist: [
          received("br-int", "int", "Form 1099-INT", "First Field Bank", "Brennan_Trust_1099-INT_First_Field_2026.pdf", 0.95),
          received("br-div", "div", "Form 1099-DIV", "Highline Brokerage", "Brennan_Trust_1099-DIV_Highline_2026.pdf", 0.94),
          item("br-b", "b", "Form 1099-B", "Highline Brokerage", "missing", {
            wrongYear: {
              file: "Brennan_Trust_1099-B_Highline_2025.pdf",
              detectedYear: 2025,
              confidence: 0.95
            }
          }),
          item("br-k1", "k1", "Schedule K-1", "Cedar Wharf LP", "missing")
        ],
        sentReminders: [
          { id: "br-r1", at: "2026-11-13T09:00:00", channel: "email" },
          { id: "br-r2", at: "2026-11-18T09:00:00", channel: "email" },
          { id: "br-r3", at: "2026-11-23T09:00:00", channel: "email" }
        ],
        activity: [
          { id: "br-a1", at: "2026-11-09T10:30:00", text: "Fiduciary checklist opened for Brennan Family Trust." },
          { id: "br-a2", at: "2026-11-17T14:12:00", text: "1099-INT and 1099-DIV matched for 2026." },
          { id: "br-a3", at: "2026-11-20T09:48:00", text: "Flagged Brennan_Trust_1099-B_Highline_2025.pdf as tax year 2025. The 2026 Form 1099-B is still outstanding." },
          { id: "br-a4", at: "2026-11-23T09:00:00", text: "Reminder listed the 2026 1099-B and the Cedar Wharf LP K-1. The 2025 brokerage file was not treated as received." }
        ]
      },
      {
        id: "luis-ortega",
        name: "Luis Ortega",
        entityName: "",
        filing: "Single",
        email: "luis.ortega@example.com",
        phone: "(702) 555-0155",
        preparer: "Ben Cho",
        stage: "requested",
        taxYear: 2026,
        requestedAt: "2026-11-18",
        profile: "Last year: part-time wages, a courier 1099-NEC, a delivery-platform 1099-K, and a mileage log.",
        checklist: [
          item("luis-w2", "w2", "Form W-2", "Lantern Hotels", "missing"),
          item("luis-nec", "nec", "Form 1099-NEC", "Metro Courier Co-op", "missing"),
          item("luis-k", "k1099", "Form 1099-K", "LoopCart", "missing"),
          item("luis-miles", "mileage", "Mileage log", "Personal vehicle", "missing")
        ],
        sentReminders: [
          { id: "luis-r1", at: "2026-11-22T09:40:00", channel: "text" }
        ],
        activity: [
          { id: "luis-a1", at: "2026-11-18T16:05:00", text: "Checklist opened from last year's wage-and-gig profile. Upload link sent." },
          { id: "luis-a2", at: "2026-11-22T09:40:00", text: "Text reminder listed the W-2, 1099-NEC, 1099-K, and mileage log." }
        ]
      },
      {
        id: "hannah-brooks",
        name: "Hannah Brooks",
        entityName: "",
        filing: "Head of household",
        email: "hannah.brooks@example.com",
        phone: "(404) 555-0128",
        preparer: "Alicia Romero",
        stage: "ready",
        taxYear: 2026,
        requestedAt: "2026-11-05",
        profile: "Last year: a clinic W-2, daycare for one child, and a county property-tax bill.",
        checklist: [
          received("han-w2", "w2", "Form W-2", "Cinder Clinic", "Brooks_Hannah_W-2_Cinder_Clinic_2026.pdf", 0.97),
          received("han-care", "care", "Childcare statement", "BrightPath Daycare", "Brooks_BrightPath_Childcare_2026.pdf", 0.93),
          received("han-tax", "property", "Property tax bill", "Red Clay County", "Brooks_Red_Clay_County_Property_Tax_2026.pdf", 0.92)
        ],
        sentReminders: [
          { id: "han-r1", at: "2026-11-09T09:00:00", channel: "email" },
          { id: "han-r2", at: "2026-11-14T09:00:00", channel: "email" }
        ],
        activity: [
          { id: "han-a1", at: "2026-11-05T08:50:00", text: "Checklist opened from last year's profile." },
          { id: "han-a2", at: "2026-11-16T17:22:00", text: "Property-tax bill matched. Checklist complete. Reminders stopped." },
          { id: "han-a3", at: "2026-11-16T17:23:00", text: "Moved to Ready to prepare." }
        ]
      },
      {
        id: "greenline",
        name: "Naomi Park",
        entityName: "Greenline Catering LLC",
        filing: "Disregarded entity",
        email: "naomi.park@example.com",
        phone: "(512) 555-0190",
        preparer: "Ben Cho",
        stage: "preparing",
        taxYear: 2026,
        requestedAt: "2026-11-07",
        profile: "Last year: a card-processor 1099-K, a school-district 1099-NEC, a profit and loss, and bank statements.",
        checklist: [
          received("gl-k", "k1099", "Form 1099-K", "MarketPay", "Greenline_1099-K_MarketPay_2026.pdf", 0.97),
          received("gl-nec", "nec", "Form 1099-NEC", "Westbrook School District", "Greenline_1099-NEC_Westbrook_2026.pdf", 0.95),
          received("gl-pnl", "pnl", "Profit and loss", "Greenline Catering", "Greenline_Catering_Profit_and_Loss_2026.pdf", 0.92),
          received("gl-bank", "bank", "Bank statements", "Pier Credit Union", "Greenline_Pier_Credit_Union_Bank_Statements_2026.pdf", 0.9)
        ],
        sentReminders: [
          { id: "gl-r1", at: "2026-11-11T09:00:00", channel: "email" },
          { id: "gl-r2", at: "2026-11-16T09:00:00", channel: "email" }
        ],
        activity: [
          { id: "gl-a1", at: "2026-11-07T13:20:00", text: "Checklist opened for Greenline Catering, a disregarded entity on Naomi's return." },
          { id: "gl-a2", at: "2026-11-21T10:15:00", text: "Bank statements matched. Checklist complete. Reminders stopped." },
          { id: "gl-a3", at: "2026-11-24T09:30:00", text: "Ben Cho moved the file to In preparation and is tying MarketPay deposits to the ledger." }
        ]
      },
      {
        id: "kim-household",
        name: "Walter & June Kim",
        entityName: "",
        filing: "Married filing jointly",
        email: "walter.kim@example.com",
        phone: "(808) 555-0166",
        preparer: "Naomi Ivers",
        stage: "filed",
        taxYear: 2026,
        requestedAt: "2026-10-20",
        profile: "Last year: two W-2s from the same hospital, mortgage interest, a mutual-fund 1099-DIV, and a health-foundation gift. They asked for an early final return before leaving the U.S.",
        checklist: [
          received("kim-w2-w", "w2", "Form W-2", "Oster Medical Center (Walter)", "Kim_Walter_W-2_Oster_Medical_2026.pdf", 0.98),
          received("kim-w2-j", "w2", "Form W-2", "Oster Medical Center (June)", "Kim_June_W-2_Oster_Medical_2026.pdf", 0.98),
          received("kim-1098", "m1098", "Form 1098", "Pacific Isle Bank", "Kim_1098_Pacific_Isle_Bank_2026.pdf", 0.96),
          received("kim-div", "div", "Form 1099-DIV", "Lantern Mutual", "Kim_1099-DIV_Lantern_Mutual_2026.pdf", 0.94),
          received("kim-gift", "charity", "Charitable receipts", "Shoreline Health Foundation", "Kim_Shoreline_Charitable_2026.pdf", 0.91)
        ],
        sentReminders: [
          { id: "kim-r1", at: "2026-10-24T09:00:00", channel: "email" },
          { id: "kim-r2", at: "2026-10-29T09:00:00", channel: "email" }
        ],
        activity: [
          { id: "kim-a1", at: "2026-10-20T08:30:00", text: "Early checklist opened so the Kims could file before closing U.S. residency." },
          { id: "kim-a2", at: "2026-11-02T15:10:00", text: "Checklist complete. Reminders stopped." },
          { id: "kim-a3", at: "2026-11-12T11:00:00", text: "Return prepared and passed review." },
          { id: "kim-a4", at: "2026-11-18T16:45:00", text: "E-file accepted. Moved to Filed." }
        ]
      }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
