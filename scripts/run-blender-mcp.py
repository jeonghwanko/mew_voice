"""Run a project-authored Blender script through the installed MCP server."""
import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    script = Path(sys.argv[1]).resolve()
    mobile = Path(__file__).resolve().parents[1]
    if not script.is_relative_to(mobile / 'scripts'):
        raise ValueError('Only project Blender scripts are accepted')
    params = StdioServerParameters(command=str(Path.home()/'.local/bin/uvx.exe'),
        args=['--from','blender-mcp==1.9.1','blender-mcp'],
        env={**os.environ,'DISABLE_TELEMETRY':'true','BLENDER_HOST':'127.0.0.1',
             'BLENDER_PORT':'9876','BLENDER_MCP_SAFE_MODE':'1'})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=300)) as session:
            await session.initialize()
            result = await session.call_tool('execute_blender_code', {'code':script.read_text(encoding='utf-8')}, read_timeout_seconds=timedelta(seconds=300))
            output=mobile/'assets/avatar/blender'/f'{script.stem}-result.json'
            output.write_text(result.model_dump_json(indent=2),encoding='utf-8')
            for item in result.content:
                if item.type=='text': print(item.text,flush=True)
            if result.isError or any(any(marker in getattr(c,'text','') for marker in ['Traceback','Rejected by safe mode','Error executing code']) for c in result.content):
                raise RuntimeError('Blender script failed; see saved result')

asyncio.run(main())
