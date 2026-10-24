import type { RouteConfig } from "@react-router/dev/routes";
export default [
  { path: "mcp", file: "route-modules/mcp.jsx" },
  { path: "en/mcp", file: "route-modules/en-mcp.jsx" },
  { file: "route-modules/contact.jsx", path: "contact" },
  { file: "route-modules/en-contact.jsx", path: "en/contact" },
  { file: "route-modules/services.jsx", path: "services" },
  { file: "route-modules/en-services.jsx", path: "en/services" },
  { file: "route-modules/support.jsx", path: "support" },
  { file: "route-modules/en-support.jsx", path: "en/support" },

  { file: "route-modules/audit.jsx", path: "audit" },
  { file: "route-modules/en-audit.jsx", path: "en/audit" },
  { file: "route-modules/refund.jsx", path: "refund" },
  { file: "route-modules/en-refund.jsx", path: "en/refund" },
  // Synthetic product draft: available only in the local development server.
  ...(process.env.NODE_ENV === 'development' ? [
    { file: 'route-modules/owner-ascend-draft.jsx', path: 'owner/ascend-draft' },
    { file: 'route-modules/en-owner-ascend-draft.jsx', path: 'en/owner/ascend-draft' },
  ] : []),
  {"file": "route-modules/catalyst-setup.jsx", "path": "catalyst/setup"},
  {"file": "route-modules/en-catalyst-setup.jsx", "path": "en/catalyst/setup"},
  {
    "file": "route-modules/home.jsx",
    "index": true
  },
  {
    "file": "route-modules/en.jsx",
    "path": "en"
  },
  {
    "file": "route-modules/owner.jsx",
    "path": "owner"
  },
  {
    "file": "route-modules/en-owner.jsx",
    "path": "en/owner"
  },
  {
    "file": "route-modules/owner-preview-packId.jsx",
    "path": "owner/preview/:packId"
  },
  {
    "file": "route-modules/en-owner-preview-packId.jsx",
    "path": "en/owner/preview/:packId"
  },
  {
    "file": "route-modules/en-owner-access.jsx",
    "path": "en/owner/access"
  },
  {
    "file": "route-modules/owner-access.jsx",
    "path": "owner/access"
  },
  { file: "route-modules/en-owner-websites.jsx", path: "en/owner/websites" },
  { file: "route-modules/owner-websites.jsx", path: "owner/websites" },
  {
    "file": "route-modules/layla-dashboard.jsx",
    "path": "layla/dashboard"
  },
  {
    "file": "route-modules/en-layla-dashboard.jsx",
    "path": "en/layla/dashboard"
  },
  {
    "file": "route-modules/signin.jsx",
    "path": "signin"
  },
  {
    "file": "route-modules/en-signin.jsx",
    "path": "en/signin"
  },
  {
    "file": "route-modules/privacy.jsx",
    "path": "privacy"
  },
  {
    "file": "route-modules/en-privacy.jsx",
    "path": "en/privacy"
  },
  {
    "file": "route-modules/terms.jsx",
    "path": "terms"
  },
  {
    "file": "route-modules/en-terms.jsx",
    "path": "en/terms"
  },
  {
    "file": "route-modules/data-deletion.jsx",
    "path": "data-deletion"
  },
  {
    "file": "route-modules/en-data-deletion.jsx",
    "path": "en/data-deletion"
  },
  {
    "file": "route-modules/playbook.jsx",
    "path": "playbook"
  },
  {
    "file": "route-modules/en-playbook.jsx",
    "path": "en/playbook"
  }
] satisfies RouteConfig;
