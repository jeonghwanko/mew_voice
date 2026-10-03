"""Render the actual Blender sculpture, independently of the live MCP process."""
import bpy
import sys
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=900
scene.render.resolution_percentage=100
views=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Face','ThreeQuarter','Side']
for view in views:
    scene.camera=bpy.data.objects['A_Camera_'+view]
    scene.render.filepath='C:/Users/turbo08/mew_voice/assets/avatar/blender/render-'+view.lower()+'.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED',view,flush=True)
