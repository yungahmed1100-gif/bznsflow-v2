// Only deep links already supported by the owner website. Never use a URL from
// customer content as a navigation or fetch target.
export function recordLinks(tool, args, result) {
  const targets = {
    conversationId: ["chats", "chat"],
    orderId: ["orders", "order"],
    repairId: ["service", "repair"],
    opportunityId: ["work", "deal"],
    productionId: ["work", "production"],
    visitId: ["work", "visit"],
  };
  const records = { ...args };
  if (
    tool.domain === "hasib" &&
    tool.operation === "order_create" &&
    result?.id
  )
    records.orderId = result.id;
  const links = [];
  for (const [field, [tab, param]] of Object.entries(targets))
    if (typeof records[field] === "string")
      links.push({
        label: field,
        id: records[field],
        path: `/layla/dashboard?${new URLSearchParams({ tab, [param]: records[field] })}`,
      });
  if (tool.domain === "dashboard" && tool.operation === "conversations")
    for (const row of (result?.items || []).slice(0, 100))
      if (row.id)
        links.push({
          label: "conversation",
          id: row.id,
          path: `/layla/dashboard?${new URLSearchParams({ tab: "chats", chat: row.id })}`,
        });
  return links;
}
