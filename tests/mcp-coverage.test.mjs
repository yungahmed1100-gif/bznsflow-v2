import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { TOOL_BY_NAME } from "../config/mcp/contracts.js";
// Inspect the real HTTP controllers, rather than asserting one hand-written list
// against another. A newly accepted action must acquire an explicit disposition.
function acceptedActions(path) {
  const file = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    ),
    variables = new Map(),
    actions = new Set();
  function strings(node) {
    if (ts.isArrayLiteralExpression(node))
      return node.elements.filter(ts.isStringLiteral).map((x) => x.text);
    if (ts.isIdentifier(node)) return variables.get(node.text) || [];
    if (ts.isNewExpression(node) && node.expression.getText(file) === "Set")
      return strings(node.arguments[0]);
    return [];
  }
  const isAction = (node) =>
    ["action", "body.action", "body.operation"].includes(node.getText(file));
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer)
      variables.set(node.name.getText(file), strings(node.initializer));
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      if (isAction(node.left) && ts.isStringLiteral(node.right))
        actions.add(node.right.text);
      if (isAction(node.right) && ts.isStringLiteral(node.left))
        actions.add(node.left.text);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["includes", "has"].includes(node.expression.name.text) &&
      node.arguments.some(isAction)
    )
      for (const s of strings(node.expression.expression)) actions.add(s);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...actions].sort();
}
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
