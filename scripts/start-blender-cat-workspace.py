"""Prepare a new A-concept workspace and enable the installed Blender MCP addon.

Run in Blender's separate process with --python. Does not edit an open user scene.
"""
from pathlib import Path
import bpy
import addon_utils

mobile = Path(__file__).resolve().parents[1]
concepts = mobile / 'assets/avatar/concepts/v1'
destination = mobile / 'assets/avatar/blender'
destination.mkdir(parents=True, exist_ok=True)
workspace = destination / 'cat-a-workspace.blend'

addon_utils.enable('blender_mcp', default_set=True, persistent=True)
addon = bpy.context.preferences.addons.get('blender_mcp')
if addon is None:
    raise RuntimeError('Blender MCP addon did not enable')
addon.preferences.telemetry_consent = False
bpy.ops.wm.save_userpref()

if workspace.exists():
    bpy.ops.wm.open_mainfile(filepath=str(workspace))
else:
    # Clear only the startup scene in this freshly launched process.
    for obj in list(bpy.context.scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    collection = bpy.data.collections.new('A_Concept_References')
    bpy.context.scene.collection.children.link(collection)
    for index, filename in enumerate(['a-soft-heart.png', 'a-expressions.png', 'a-turnaround.png']):
        image = bpy.data.images.load(str(concepts / filename), check_existing=True)
        image.pack()
        obj = bpy.data.objects.new(filename.removesuffix('.png'), None)
        obj.empty_display_type = 'IMAGE'
        obj.data = image
        obj.empty_display_size = 5
        obj.location = (index * 6, 0, 0)
        obj.rotation_euler = (1.57079632679, 0, 0)
        obj.hide_render = True
        collection.objects.link(obj)
    bpy.context.scene['production_stage'] = 'Selected A concept references; cat mesh not yet sculpted'
    bpy.ops.wm.save_as_mainfile(filepath=str(workspace))

if not getattr(bpy.types, 'blendermcp_server', None) or not bpy.types.blendermcp_server.running:
    bpy.ops.blendermcp.start_server()
print('MEWVOICE_BLENDER_READY', bpy.app.version_string, str(workspace), flush=True)
