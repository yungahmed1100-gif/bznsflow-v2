import type { RouteConfig } from "@react-router/dev/routes";
export default [
  { file: "route-modules/contact.jsx", path: "contact" },
  { file: "route-modules/en-contact.jsx", path: "en/contact" },
  { file: "route-modules/services.jsx", path: "services" },
  { file: "route-modules/en-services.jsx", path: "en/services" },
  { file: "route-modules/support.jsx", path: "support" },
  { file: "route-modules/en-support.jsx", path: "en/support" },

  { file: "route-modules/refund.jsx", path: "refund" },
  { file: "route-modules/en-refund.jsx", path: "en/refund" },
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
    "file": "route-modules/owner-layla.jsx",
    "path": "owner/layla"
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
