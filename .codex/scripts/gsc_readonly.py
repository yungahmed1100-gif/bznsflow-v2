"""Run the pinned upstream GSC MCP with read-only scopes and tools."""

import asyncio
import json
import os
import sys
from pathlib import Path

# Restrict permissions on newly created OAuth token files, including refreshes.
os.umask(0o077)

import gsc_server  # noqa: E402 — upstream reads config and creates its directory

gsc_server.SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
gsc_server.ALLOW_DESTRUCTIVE = False

READ_TOOLS = frozenset({
    "list_properties", "get_site_details", "get_search_analytics",
    "get_performance_overview", "compare_search_periods",
    "get_search_by_page_query", "get_advanced_search_analytics",
    "inspect_url_enhanced", "batch_url_inspection", "check_indexing_issues",
    "get_sitemaps", "list_sitemaps_enhanced", "get_sitemap_details",
})


async def prepare_server():
    # Allowlist also excludes any new mutation tools added in an upstream update.
    for tool in await gsc_server.mcp.list_tools():
        if tool.name not in READ_TOOLS:
            gsc_server.mcp.remove_tool(tool.name)

    @gsc_server.mcp.tool()
    async def get_capabilities() -> str:
        """Show installed read-only tools and credential-file status without opening OAuth."""
        return json.dumps({
            "mode": "read-only",
            "tools": sorted(READ_TOOLS),
            "oauth_client_present": Path(gsc_server.OAUTH_CLIENT_SECRETS_FILE).is_file(),
            "token_present": Path(gsc_server.TOKEN_FILE).is_file(),
            "service_account_present": bool(gsc_server.GSC_CREDENTIALS_PATH
                and Path(gsc_server.GSC_CREDENTIALS_PATH).is_file()),
            "authentication": "Not verified by this status check. Call list_properties after setup.",
            "setup": "See docs/geo-search-console-setup.md. No credentials belong in the repository.",
        })


if __name__ == "__main__":
    if sys.argv[1:] == ["--authenticate"]:
        # Run deliberately from a terminal after supplying the Desktop OAuth JSON.
        gsc_server.get_gsc_service_oauth()
        print("Google OAuth completed. Use list_properties to verify property access.")
    elif sys.argv[1:]:
        raise SystemExit("Usage: gsc_readonly.py [--authenticate]")
    else:
        asyncio.run(prepare_server())
        gsc_server.mcp.run(transport="stdio")
