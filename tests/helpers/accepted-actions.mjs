import { readFileSync } from "node:fs";
import ts from "typescript";
// Inspect the real HTTP controllers, rather than asserting one hand-written list
// against another. A newly accepted action must acquire an explicit disposition.
export function acceptedActions(path) {
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
