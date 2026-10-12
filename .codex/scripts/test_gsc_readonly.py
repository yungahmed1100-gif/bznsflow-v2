"""Offline tests: no Google credentials or external API requests."""
import asyncio
import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    script = Path(__file__).with_name("gsc_readonly.py")
    with tempfile.TemporaryDirectory() as temp:
        env = {
            **os.environ,
            "GSC_CONFIG_DIR": temp,
            "GSC_OAUTH_CLIENT_SECRETS_FILE": str(Path(temp) / "missing.json"),
            "GSC_SKIP_OAUTH": "true",
            "GSC_ALLOW_DESTRUCTIVE": "true",  # adapter must override this
        }
        env.pop("GSC_CREDENTIALS_PATH", None)
        previous = dict(os.environ)
        try:
            os.environ.clear()
            os.environ.update(env)
            spec = importlib.util.spec_from_file_location("gsc_readonly", script)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            assert module.gsc_server.SCOPES == ["https://www.googleapis.com/auth/webmasters.readonly"]
            assert module.gsc_server.ALLOW_DESTRUCTIVE is False
        finally:
            os.environ.clear()
            os.environ.update(previous)
        params = StdioServerParameters(command=sys.executable, args=[str(script)], env=env)
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                listed = await session.list_tools()
                names = {tool.name for tool in listed.tools}
                assert names == module.READ_TOOLS | {"get_capabilities"}
                status = await session.call_tool("get_capabilities", {})
                payload = json.loads(status.content[0].text)
                assert payload["mode"] == "read-only"
                assert payload["oauth_client_present"] is False
                assert payload["token_present"] is False
                assert payload["service_account_present"] is False
                assert not (Path(temp) / "token.json").exists()
                result = await session.call_tool("list_properties", {})
                assert "does not exist" in result.content[0].text
        print("PASS: MCP initialize, 14 read-only tools, read-only OAuth scope, missing-credential response; no Google requests.")


if __name__ == "__main__":
    asyncio.run(main())
