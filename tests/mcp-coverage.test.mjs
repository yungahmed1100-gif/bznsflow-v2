import test from "node:test";
import assert from "node:assert/strict";
import { acceptedActions } from "./helpers/accepted-actions.mjs";
import { TOOL_BY_NAME } from "../config/mcp/contracts.js";
import { HASIB_POLICY } from "../config/mcp/hasib-policy.js";
import { HASIB_FIELDS_BY_OPERATION } from "../config/mcp/hasib-contracts.js";
import { STORE_OPERATIONS } from "../config/hasib-workflow-operations.js";
const bindings = {
  "api/_lib/layla/dashboard-api.js": (op) => `bznsflow_dashboard_${op}`,
  "api/_lib/layla/blue-messaging.js": (op) => `bznsflow_messaging_${op}`,
  "api/_lib/knowledge-api.js": (op) => `bznsflow_knowledge_${op}`,
  "api/_lib/layla/instagram.js": (op) => `bznsflow_instagram_${op}`,
  "api/_lib/layla/review-api.js": (op) => {
    const aliases = {
      brain_state: "brain_state",
      brain_test: "brain_test",
      brain_accept: "brain_accept",
      brain_dismiss: "brain_dismiss",
      brain_behaviour: "brain_behaviour_save",
      brain_step: "brain_step",
      brain_publish: "brain_publish",
      catalog_save_many: "catalog_saveMany",
      profile: "business_profile",
      bzns_save: "business_bzns_save",
      bzns_publish: "business_bzns_publish",
      pause: "messaging_pause",
      save_progress: "business_save_progress",
    };
    return `bznsflow_${aliases[op] || (op.startsWith("catalog_") ? op : `setup_${op}`)}`;
  },
};
for (const [path, resolve] of Object.entries(bindings))
  test(`${path}: every current owner action has an explicit MCP disposition`, () => {
    const actions = acceptedActions(path);
    assert.ok(actions.length > 0);
    for (const action of actions) {
      const name = resolve(action),
        tool = TOOL_BY_NAME.get(name);
      assert.ok(tool, `${action} needs a disposition (${name})`);
      assert.ok(["tool", "handoff", "unavailable"].includes(tool.disposition));
    }
  });
test("onboarding, authentication and provider credentials stay in explicit website flows", () => {
  for (const name of [
    "onboarding_get",
    "onboarding_save",
    "setup_begin",
    "setup_finish",
    "instagram_connect",
    "instagram_disconnect",
    "files_import",
  ])
    assert.equal(TOOL_BY_NAME.get(`bznsflow_${name}`).disposition, "handoff");
});
test("every Hasib operation the validators accept has an explicit MCP policy", () => {
  // Generated from the live validators, so a new sector operation cannot ship
  // without a reviewed category and sector scope.
  for (const operation of Object.keys(HASIB_FIELDS_BY_OPERATION)) {
    assert.ok(HASIB_POLICY[operation], `${operation} needs a Hasib policy`);
    assert.ok(
      TOOL_BY_NAME.get(`bznsflow_hasib_${operation}`),
      `${operation} needs a Hasib tool`,
    );
  }
  for (const operation of STORE_OPERATIONS)
    assert.deepEqual(
      TOOL_BY_NAME.get(`bznsflow_hasib_${operation}`).packs,
      ["retail", "retail-tech"],
      `${operation} stays in the retail packs`,
    );
});
