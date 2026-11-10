import { isLivePack, HASIB_PACKS } from "../hasib-packs.js";
import {
  HASIB_FIELDS,
  HASIB_FIELDS_BY_OPERATION,
  HASIB_REQUIRED_BY_OPERATION,
} from "./hasib-contracts.js";
import { DESCRIPTIONS, hasibDescription, behaviourNote } from "./descriptions.js";
import { registerProductTools } from "./product-tools.js";
import { HASIB_POLICY } from "./hasib-policy.js";
import {
  BOOKING_OPERATIONS,
  REAL_ESTATE_OPERATIONS,
  CONSTRUCTION_OPERATIONS,
  AUTOMOTIVE_OPERATIONS,
  MEDIA_OPERATIONS,
  FITNESS_OPERATIONS,
  DENTAL_OPERATIONS,
  HVAC_OPERATIONS,
  STORE_OPERATIONS,
} from "../hasib-workflow-operations.js";
export const AREAS = [
  "conversations",
  "customers",
  "business",
  "marketing",
  "operations",
  "team",
  "files",
];
export const CATEGORIES = [
  "messages",
  "finance",
  "bulk",
  "exports",
  "team",
  "publish",
];
export const SCOPES = ["workspace:read", "workspace:write"];
const s = (maxLength = 1000) => ({ type: "string", maxLength });
const n = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  b = { type: "boolean" };
const arr = (items, maxItems = 100) => ({ type: "array", items, maxItems });
const obj = (properties = {}, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const id = s(64),
  page = {
    cursor: s(2048),
    limit: { type: "integer", minimum: 1, maximum: 100 },
    search: s(80),
    status: s(40),
  };
const key = s(80),
  text = s(100000),
  version = n;
const entry = obj(
  Object.fromEntries(
    "entryKey kind nameEn nameAr category benefitEn benefitAr descriptionEn descriptionAr availability source laylaUseEn laylaUseAr"
      .split(" ")
      .map((k) => [k, s(700)]),
  ),
);
entry.properties.prices = arr(
  obj(
    {
      type: s(30),
      currency: s(8),
      amount: { type: "number" },
      minimum: { type: "number" },
      maximum: { type: "number" },
      unit: s(80),
      label: s(160),
    },
    ["type", "currency", "unit", "label"],
  ),
  20,
);
entry.properties.confidence = { type: "number", minimum: 0, maximum: 1 };
entry.properties.sortOrder = n;
entry.required = Object.keys(entry.properties);
// Lower-case UUID; the API lower-cases an upper-case one before validation.
const UUID = {
  type: "string",
  pattern: "^[a-f0-9-]{36}$",
  maxLength: 36,
};
const AREA_OF = {
  requests: null,
  workspace: null,
  tools: null,
  files: "files",
  messaging: "conversations",
  email: "marketing",
};
const rows = [];
function add(
  domain,
  operation,
  category,
  properties = {},
  required = [],
  extra = {},
) {
  const name = `bznsflow_${domain}_${operation}`;
  const schema = obj(properties, required);
  if (domain === "knowledge" && category !== "read") {
    schema.properties.idempotencyKey = UUID;
    schema.required.push("idempotencyKey");
  }
  if (category !== "read") {
    schema.properties.requestId ??= UUID;
    schema.required = [...new Set([...schema.required, "requestId"])];
  }
  const area = Object.hasOwn(AREA_OF, domain)
    ? AREA_OF[domain]
    : domain === "hasib"
        ? operation.startsWith("team_")
          ? "team"
          : "operations"
        : domain === "dashboard"
            ? /campaign|template/.test(operation)
              ? "marketing"
              : /contact/.test(operation)
                ? "customers"
                : operation === "export_account"
                  ? "files"
                  : "conversations"
            : "business";
  rows.push({
    name,
    domain,
    operation,
    area,
    category,
    ...(category === "exports" ? { requiredAreas: ["files"] } : {}),
    disposition: "tool",
    capability: domain === "hasib" ? "operations" : "businessDetails",
    title: `${TITLES[domain] || domain}: ${operation.replaceAll("_", " ")}`,
    inputSchema: schema,
    ...extra,
  });
}
const TITLES = {
  brain: "BznsBrain",
  business: "Business",
  catalog: "Catalog",
  dashboard: "Workspace",
  email: "Email",
  files: "Files",
  hasib: "Hasib",
  knowledge: "Knowledge",
  messaging: "Messaging",
  onboarding: "Setup",
  requests: "Requests",
  setup: "Setup",
  website: "Website",
  workspace: "Workspace",
  tools: "Tools",
  billing: "Billing",
  instagram: "Instagram",
};
const sectorGroups = [
  [REAL_ESTATE_OPERATIONS, ["real-estate"]],
  [CONSTRUCTION_OPERATIONS, ["construction"]],
  [AUTOMOTIVE_OPERATIONS, ["automotive"]],
  [MEDIA_OPERATIONS, ["media"]],
  [FITNESS_OPERATIONS, ["fitness"]],
  [DENTAL_OPERATIONS, ["dental"]],
  [HVAC_OPERATIONS, ["hvac"]],
  [STORE_OPERATIONS, ["retail", "retail-tech"]],
];
for (const [operation, policy] of Object.entries(HASIB_POLICY)) {
  let packs = sectorGroups.find(([ops]) => ops.includes(operation))?.[1];
  if (!packs && /^(job|equipment)/.test(operation))
    packs = ["automotive", "construction"];
  if (!packs && /^propert/.test(operation)) packs = ["real-estate"];
  if (!packs && /^product_request/.test(operation))
    packs = ["retail", "retail-tech"];
  if (
    !packs &&
    Object.hasOwn(BOOKING_OPERATIONS, operation) &&
    !operation.startsWith("followup")
  )
    packs = ["beauty", "dental", "clinic", "fitness", "education"];
  if (/^membership/.test(operation)) packs = ["fitness", "education"];
  const moduleOps = {
    serials: ["serials", "serial_lookup"],
    tradeIns: ["trade_in"],
    repairs: [
      "repairs",
      "repair",
      "repair_create",
      "repair_approval",
      "repair_update",
      "repair_status",
    ],
    recipes: [
      "recipes",
      "recipe_save",
      "waste_create",
      "stock_count",
      "stock_receive",
      "restaurant_summary",
    ],
    batches: ["batch_create"],
    shelfLife: ["stock_expiry"],
  };
  const module = Object.keys(moduleOps).find((m) =>
    moduleOps[m].includes(operation),
  );
  if (module)
    packs = Object.values(HASIB_PACKS)
      .filter((p) => p.modules[module] === "available")
      .map((p) => p.id);
  if (["baking_suggestions", "order_preparation"].includes(operation))
    packs = ["cakes"];
  const properties = Object.fromEntries(
    (HASIB_FIELDS_BY_OPERATION[operation] || []).map((k) => [
      k,
      HASIB_FIELDS[k],
    ]),
  );
  if (properties.limit) properties.limit = { ...n, minimum: 1, maximum: 100 };
  const capability = /^team_/.test(operation)
    ? "team"
    : /insights|metric_records/.test(operation)
      ? "insights"
      : operation === "settings_update"
        ? "settings"
        : "operations";
  const required = HASIB_REQUIRED_BY_OPERATION[operation];
  add("hasib", operation, policy.category, properties, required ? [required] : [], {
    ...policy,
    capability,
    ...(operation === "adiba_offer_approve"
      ? { categories: ["finance", "messages"] }
      : {}),
    ...(packs ? { packs } : {}),
    ...(policy.disposition === "handoff" ? { path: "/layla/dashboard" } : {}),
  });
}
const pageArgs = { cursor: page.cursor, limit: page.limit };
const DASHBOARD_READS = {
  overview: [{}, [], "chats"],
  conversations: [
    { ...pageArgs, search: page.search, channel: { enum: ["whatsapp", "instagram"] } },
    [],
    "chats",
  ],
  handoffs: [pageArgs, [], "chats"],
  thread: [{ conversationId: id, before: n }, ["conversationId"], "chats"],
  contacts: [{ ...pageArgs, search: page.search, status: page.status }, [], "chats"],
  templates: [{}, [], "broadcasts"],
  campaigns: [pageArgs, [], "broadcasts"],
  campaign_detail: [{ campaignId: id }, ["campaignId"], "broadcasts"],
};
for (const [operation, [properties, required, capability]] of Object.entries(DASHBOARD_READS))
  add("dashboard", operation, "read", properties, required, { capability });
for (const operation of ["export_chat", "export_contacts", "export_account"])
  add(
    "dashboard",
    operation,
    "exports",
    { conversationId: id, cursor: s(100) },
    [],
    {
      capability:
        operation === "export_contacts" ? "customerExport" : "exports",
    },
  );
for (const operation of [
  "resolve_handoff",
  "takeover_handoff",
  "return_handoff",
])
  add(
    "dashboard",
    operation,
    "edit",
    { conversationId: id, expectedVersion: n },
    ["conversationId", "expectedVersion"],
    { capability: "humanHandoff" },
  );
add("dashboard", "set_timezone", "edit", { timezone: s(80) }, ["timezone"]);
add(
  "dashboard",
  "contact_update",
  "edit",
  {
    contactId: id,
    patch: obj({
      ownerName: s(80),
      fields: arr(
        obj({ key: s(40), value: { anyOf: [s(120), { type: "null" }] } }, [
          "key",
          "value",
        ]),
        20,
      ),
      qualificationOverride: { anyOf: [s(120), { type: "null" }] },
    }),
  },
  ["contactId", "patch"],
  { capability: "customers" },
);
add(
  "dashboard",
  "contact_delete",
  "bulk",
  { contactId: id, confirm: { const: true } },
  ["contactId", "confirm"],
  { capability: "customerDelete" },
);
add(
  "dashboard",
  "import_contacts",
  "bulk",
  {
    rows: arr(
      obj(
        {
          waId: s(30),
          name: s(80),
          countryIso: s(4),
          fields: arr(obj({ key: s(40), value: s(120) }, ["key", "value"]), 20),
        },
        ["waId"],
      ),
      100,
    ),
    origin: { enum: ["manual", "import"] },
    requireConsent: b,
    consent: obj(
      { source: s(120), date: s(10), purpose: s(200), attested: b },
      ["source", "date", "purpose", "attested"],
    ),
  },
  ["rows"],
  { capability: "imports" },
);
add("dashboard", "sync_templates", "edit", {}, [], {
  capability: "broadcasts",
  service: true,
});
const campaign = {
  templateId: s(80),
  mapping: arr(
    obj({ key: s(60), source: s(50), value: s(1024) }, [
      "key",
      "source",
      "value",
    ]),
    20,
  ),
  contactIds: arr(id, 100),
  values: arr(
    obj(
      {
        contactId: id,
        values: arr(obj({ key: s(60), text: s(1024) }, ["key", "text"]), 20),
      },
      ["contactId", "values"],
    ),
    100,
  ),
};
add(
  "dashboard",
  "campaign_preview",
  "read",
  campaign,
  ["templateId", "contactIds"],
  { capability: "broadcasts", service: true },
);
add(
  "dashboard",
  "campaign_create",
  "messages",
  {
    ...campaign,
    name: s(80),
    origin: { enum: ["chat", "broadcast"] },
    confirm: { const: true },
    schedule: obj(
      { mode: { enum: ["now", "later"] }, timezone: s(80), local: s(40) },
      ["mode", "timezone"],
    ),
  },
  ["templateId", "contactIds", "confirm", "schedule"],
  { capability: "broadcasts", service: true },
);
add(
  "dashboard",
  "campaign_cancel",
  "messages",
  { campaignId: id },
  ["campaignId"],
  { capability: "broadcasts" },
);
const channel = { enum: ["whatsapp", "instagram"] };
const MESSAGING = {
  state: ["read", {}, []],
  check_connection: ["read", { channel }, []],
  activate: ["publish", { channel, confirm: b }, []],
  pause: ["publish", { channel, confirm: b }, []],
  disconnect: ["publish", { channel, confirm: b }, []],
  manual_reply: ["messages", { conversationId: id, text: s(1000) }, ["conversationId", "text"]],
  takeover: ["edit", { conversationId: id }, ["conversationId"]],
  resume_conversation: ["edit", { conversationId: id }, ["conversationId"]],
};
for (const [operation, [category, properties, required]] of Object.entries(MESSAGING))
  add("messaging", operation, category, properties, required, {
    capability: ["activate", "disconnect", "pause", "check_connection"].includes(operation)
      ? "channelsSetup"
      : "chats",
    service: ["check_connection", "activate"].includes(operation),
  });
for (const operation of [
  "list",
  "match",
  "summary",
  "save",
  "saveMany",
  "archive",
  "approve",
  "discard",
  "publish",
]) {
  const props =
    {
      list: { cursor: n, limit: { ...n, minimum: 1, maximum: 50 } },
      match: { query: s(1000) },
      save: { entry },
      saveMany: { entries: arr(entry, 50) },
      archive: { entryKey: key },
      approve: { entryKey: key },
      discard: { entryKey: key },
    }[operation] || {};
  add(
    "catalog",
    operation,
    ["list", "match", "summary"].includes(operation)
      ? "read"
      : ["approve", "publish"].includes(operation)
        ? "publish"
        : operation === "archive"
          ? "bulk"
          : "edit",
    props,
    Object.keys(props).filter((k) => !["cursor", "limit"].includes(k)),
  );
}
const draftKey = { ...key, description: "Draft id: a UUID you choose when the draft is first saved." };
const KNOWLEDGE = {
  list: ["read", {}, []],
  answers: ["read", {}, []],
  open: ["read", { sourceKey: key }, ["sourceKey"]],
  open_draft: ["read", { requestId: draftKey }, ["requestId"]],
  save: [
    "edit",
    {
      requestId: draftKey,
      sourceKey: key,
      title: s(200),
      kind: { enum: ["paste", "guided", "website", "file"] },
      text,
      references: arr(
        obj({ label: s(200), text, question: s(200), answer: s(2000) }, ["label", "text"]),
        500,
      ),
      partial: b,
      version,
    },
    ["requestId", "sourceKey", "title", "kind", "text", "references"],
  ],
  publish: [
    "publish",
    { requestId: draftKey, version, expectedRevision: n, confirmed: b, acceptPartial: b },
    ["requestId", "version", "confirmed"],
  ],
  cancel: ["edit", { requestId: draftKey }, ["requestId"]],
  archive: ["publish", { sourceKey: key, expectedRevision: n }, ["sourceKey", "expectedRevision"]],
};
for (const [operation, [category, properties, required]] of Object.entries(KNOWLEDGE))
  add("knowledge", operation, category, properties, required);
add("business", "state", "read");
add(
  "business",
  "profile",
  "publish",
  {
    profile: obj(
      {
        businessName: s(100),
        sector: s(80),
        services: s(350),
        prices: s(350),
        hours: s(350),
        location: s(350),
        humanContact: s(120),
        teamContact: s(1000),
        tone: { enum: ["sharp", "sweet", "informative"] },
        handoffMode: { const: "inbox" },
        reviewed: { const: true },
      },
      [
        "businessName",
        "sector",
        "services",
        "prices",
        "hours",
        "location",
        "humanContact",
        "reviewed",
      ],
    ),
  },
  ["profile"],
);
for (const op of ["bzns_save", "bzns_publish"])
  add(
    "business",
    op,
    op === "bzns_save" ? "edit" : "publish",
    { markdown: text, version },
    ["markdown", "version"],
  );
add(
  "brain",
  "test",
  "read",
  {
    variant: { enum: ["draft", "published"] },
    history: arr(
      obj({ role: { enum: ["customer", "layla"] }, text: s(500) }, [
        "role",
        "text",
      ]),
      12,
    ),
  },
  ["history"],
  { service: true },
);
add("brain", "publish", "publish", { catalog: b });
add(
  "business",
  "save_progress",
  "edit",
  { journeyStep: { type: "integer", enum: [0, 1, 3, 4] } },
  ["journeyStep"],
);
const BRAIN = {
  state: ["read", {}, []],
  accept: [
    "edit",
    { proposalId: id, text: s(1500), section: s(80), replace: b, entry },
    ["proposalId"],
  ],
  dismiss: ["edit", { proposalId: id }, ["proposalId"]],
  behaviour_save: [
    "publish",
    {
      version,
      behaviour: obj(
        {
          tone: { enum: ["sharp", "sweet", "informative"] },
          askName: b,
          ask: arr(s(80), 8),
          appointmentPreferences: b,
          handoffNote: s(600),
        },
        ["tone", "askName", "ask", "appointmentPreferences", "handoffNote"],
      ),
    },
    ["behaviour", "version"],
  ],
  step: ["edit", { brainStep: { type: "integer", minimum: 0, maximum: 6 } }, ["brainStep"]],
};
for (const [op, [category, properties, required]] of Object.entries(BRAIN))
  add("brain", op, category, properties, required);
// Browser-only provider consent and file selection remain first-class, explicit handoffs.
for (const op of [
  "claim_draft",
  "begin",
  "finish",
  "cancel",
  "connect_owner_number",
  "cancel_selection",
  "select_phone",
  "register_number",
  "refresh",
  "preview",
  "brain_extract",
  "brain_website",
  "import_website",
])
  add("setup", op, "read", {}, [], {
    disposition: "handoff",
    path: "/catalyst/setup",
    description: `Continue ${op.replaceAll("_", " ")} in the authenticated BznsFlow setup flow.`,
  });
add("requests", "status", "read", { runId: id }, ["runId"]);
add(
  "files",
  "upload_contacts",
  "edit",
  { content: s(100000), countryIso: s(2) },
  ["content"],
  {
    capability: "imports",
    description:
      "Stage UTF-8 CSV with phone,name,country headers; at most 100 mobile contacts. No contacts are imported yet. Returns a connection-bound, 15-minute transferId. Use the website importer for spreadsheets or larger files.",
  },
);
add("files", "read", "read", { transferId: id }, ["transferId"]);
add(
  "files",
  "import_contacts",
  "bulk",
  {
    transferId: id,
    requireConsent: b,
    consent: obj(
      { source: s(120), date: s(10), purpose: s(200), attested: b },
      ["source", "date", "purpose", "attested"],
    ),
  },
  ["transferId"],
  { capability: "imports" },
);
add("files", "import", "read", {}, [], {
  disposition: "handoff",
  path: "/catalyst/setup",
  description:
    "Use the authenticated website for document/spreadsheet file selection, parsing and review. CSV contacts can use bznsflow_files_upload_contacts.",
});
for (const op of ["connect", "disconnect"])
  add("instagram", op, "read", {}, [], {
    disposition: "handoff",
    path: "/catalyst/setup",
    capability: "channelsSetup",
  });
// A template's image, video or PDF header file is chosen in the browser broadcast wizard.
for (const op of ["campaign_media_upload_url", "campaign_media_register"])
  add("dashboard", op, "read", {}, [], {
    disposition: "handoff",
    path: "/layla/dashboard",
    capability: "broadcasts",
    description: "Add the header image, video or PDF in the website's broadcast wizard.",
  });
registerProductTools(add, { s, b, arr, obj, id, version });
for (const tool of rows) {
  const key = tool.name.replace(/^bznsflow_/, "");
  const base =
    tool.description ||
    DESCRIPTIONS[key] ||
    (tool.domain === "hasib" ? hasibDescription(tool.operation, tool.category) : `${tool.title}.`);
  tool.description =
    tool.disposition === "handoff"
      ? `${base} Returns the website link for the owner.`
      : `${base} ${behaviourNote(tool.category, tool.categories)}`;
  if (tool.category === "exports") tool.requiredAreas = ["files"];
  if (tool.domain === "files" && tool.operation === "import_contacts")
    tool.requiredAreas = ["customers"];
}
export const TOOLS = Object.freeze(
  rows.sort((a, b) => a.name.localeCompare(b.name)),
);
export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
export function toolsFor({
  plan,
  capabilities,
  packId,
  scopes,
  hasibAvailable = true,
  connection,
}) {
  return TOOLS.filter(
    (t) =>
      t.disposition !== "unavailable" &&
      (!t.area || !connection?.areas || connection.areas.includes(t.area)) &&
      (t.requiredAreas || []).every(
        (a) => !connection?.areas || connection.areas.includes(a),
      ) &&
      (t.domain !== "hasib" || (hasibAvailable && isLivePack(packId))) &&
      capabilities[t.capability] &&
      (!t.plans || t.plans.includes(plan)) &&
      (!t.packs || t.packs.includes(packId)) &&
      (t.category === "read" || scopes.includes("workspace:write")),
  );
}
