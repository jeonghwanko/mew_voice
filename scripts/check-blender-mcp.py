"""Check the real MCP stdio -> Blender connection and a bounded mesh/save roundtrip."""
import asyncio
import json
import os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    mobile = Path(__file__).resolve().parents[1]
    output = mobile / 'assets/avatar/blender/mcp-smoke.json'
    params = StdioServerParameters(
        command=str(Path.home() / '.local/bin/uvx.exe'),
        args=['--from', 'blender-mcp==1.9.1', 'blender-mcp'],
        env={**os.environ, 'DISABLE_TELEMETRY': 'true', 'BLENDER_HOST': '127.0.0.1',
             'BLENDER_PORT': '9876', 'BLENDER_MCP_SAFE_MODE': '1'},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            listing = await session.list_tools()
            names = [tool.name for tool in listing.tools]
            print('MCP_TOOLS', json.dumps(names), flush=True)
            scene = await session.call_tool('get_scene_info', {'user_prompt': 'Verify the selected A cat concept workspace.'})
            if scene.isError:
                raise RuntimeError(scene.model_dump_json())
            # Temporary mesh is created and removed before saving the reference workspace.
            code = '''import bpy
assert bpy.context.scene.get('production_stage') == 'Selected A concept references; cat mesh not yet sculpted'
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.1)
probe = bpy.context.object
probe.name = 'MCP_Connection_Probe'
assert len(probe.data.vertices) > 0
count = len(probe.data.vertices)
mesh = probe.data
bpy.data.objects.remove(probe, do_unlink=True)
bpy.data.meshes.remove(mesh)
bpy.context.scene['mcp_smoke_passed'] = True
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('MCP_MESH_SAVE_OK', count)
'''
            result = await session.call_tool('execute_blender_code', {'code': code})
            payload = {'server': init.serverInfo.model_dump(), 'tools': names,
                       'scene': scene.model_dump(mode='json'),
                       'meshSave': result.model_dump(mode='json')}
            output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps(payload['meshSave'], ensure_ascii=False), flush=True)
            if result.isError or 'MCP_MESH_SAVE_OK' not in result.model_dump_json():
                raise RuntimeError('MCP mesh/save roundtrip did not pass')

if __name__ == '__main__':
    asyncio.run(main())
