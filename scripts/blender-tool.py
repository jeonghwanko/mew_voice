"""Invoke an installed Blender MCP tool using its discovered schema."""
import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params=StdioServerParameters(command=str(Path.home()/'.local/bin/uvx.exe'),args=['--from','blender-mcp==1.9.1','blender-mcp'],env={**os.environ,'DISABLE_TELEMETRY':'true','BLENDER_HOST':'127.0.0.1','BLENDER_PORT':'9876','BLENDER_MCP_SAFE_MODE':'1'})
    async with stdio_client(params) as (read,write):
        async with ClientSession(read,write,read_timeout_seconds=timedelta(seconds=300)) as session:
            await session.initialize()
            if sys.argv[1]=='schema':
                listing=await session.list_tools()
                for tool in listing.tools:
                    if tool.name in sys.argv[2:]:print(tool.model_dump_json(indent=2),flush=True)
                return
            args=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
            result=await session.call_tool(sys.argv[1],args,read_timeout_seconds=timedelta(seconds=300))
            out=Path(sys.argv[3])
            out.write_text(result.model_dump_json(indent=2),encoding='utf-8')
            for item in result.content:
                if item.type=='text':print(item.text,flush=True)
            if result.isError:raise RuntimeError('MCP tool failed')

asyncio.run(main())
