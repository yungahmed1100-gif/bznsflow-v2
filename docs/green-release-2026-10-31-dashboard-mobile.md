# Green release 2026-10-31: owner dashboard, phone-first, buttons and colours that explain themselves

## Asked
Ahmed asked to polish the dashboard for phones, raise button contrast "so everything appears self explanatory", follow best practices from the highest-rated repositories, and add more colours that explain themselves. His five answers:
- every owner screen;
- a bottom tab bar;
- one strong action per screen (dark-blue primary);
- a compact one-row header;
- keep the Ledger identity, modernised.

## References checked
- **shadcn/ui** (127k ★) and **Radix Primitives** (19k ★): button roles (primary, destructive, outline, ghost, link), a visible focus ring, disabled shown by fading.
- **Ionic** (53k ★) and Material 3 guidance: 3–5 labelled bottom tabs, safe-area padding.
- **GOV.UK Frontend:** a strong focus style and large targets.
- **Bootstrap** (175k ★): semantic colour roles.

## Shipped (`src/styles/dashboard-polish.css`, loaded last; `DashboardNav.jsx`; `LaylaDashboard.jsx`; `DESIGN.md`)
- **Button roles** (recorded in the DESIGN.md Action Blue amendment):
  - **Primary:** Action Blue (`#1f4f7a`) with white text and the Ledger hard shadow.
  - **Secondary:** card white with a 1.5px ink border.
  - **Destructive:** coral outline, or solid coral for a final confirm.
  - **Confirm done:** a new green `.ld-success`, now on the Adiba offer approve, Real Estate offer approve and draft approve buttons.
  - **Disabled:** the same button at 45% opacity, so a waiting Send is a faded blue Send, not beige.
  - **Size and focus:** buttons are at least 44px (48px on phones), with a 3px Blue Mark focus ring.
- **Sector Work kit:** the primary action card is Action Blue.
- **Section colours for every section:**
  - Chats and Team: blue.
  - Customers, Orders, Stock, Service, Money and Insights: green.
  - Work, Today, Website and Audits: orange.
  - Broadcasts and Email: yellow.
  - Settings: ink.

  The open section is a tint of its colour with a start-edge mark and bold text, in the sidebar and on phones. It was a solid black slab.
- **Phones (768px and below):**
  - **Header:** one row with the business name, Layla's switch and status, and a coral dot only when a channel needs attention. AI Connections, the language switch and the founder's admin link move into **More**.
  - **Tab bar:** a bottom tab bar (its own `nav.ld-tabbar-nav`) with up to four sections, chosen by need (Chats, Work/Today/Orders, Customers, Broadcasts…), plus **More**.
    - Every tab has an icon and a label, and the open tab's icon sits in a tinted pill.
    - More takes the open section's name and colour when that section lives behind it.
  - **More:** opens as a bottom sheet listing every section, the language and AI Connections. It keeps the `ld-nav-trigger` class.
  - **Conversations:** an open conversation is full screen (no tab bar), with the reply box pinned.
  - **Narrow phones:** at 320–360px the labels shrink slightly, so all five stay whole.

## Not done as planned
- **Export:** the Customers export buttons stay as two outlined secondaries ("Export CSV", "Export all (ZIP)") instead of one Export menu. They're already clearly secondary next to the blue primary, and a Catalyst test depends on the "Export CSV" button.
- **Connection health:** health appears in More only as the header's coral dot (and the Settings › Channels page), not as a separate line in the More sheet.

## Tests
- **`tests/layla-dashboard-browser.mjs`** adds a phone pass at 320 px (English) and 375 px (English and Arabic). It checks:
  - the header is one row and the moved links are hidden;
  - the tab bar sits at the bottom with 3–5 tabs, every tab labelled, 48px or taller and not cut off, and the open section marked;
  - no button is under 44px;
  - exactly one visible primary, computed as Action Blue with white text;
  - axe `color-contrast` and `target-size` are clean, with no overflow;
  - More lists every section plus the language and AI Connections;
  - Chats opens from the bar, a conversation hides the bar, and Send is disabled and faded;
  - the keyboard focus ring is 3px.
- **Selector update:** `tests/owner-browser.mjs` now finds phone links in More's drawer.
- **Duplicate sections:** tab bar links use `data-tab`, so no page has two `data-section` elements for one section.
