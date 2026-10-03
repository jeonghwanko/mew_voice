"""Render actual A5, emphasizing paws/tail with and without the coat."""
import bpy,sys
from mathutils import Vector
scene=bpy.context.scene
assert bpy.data.filepath.endswith('cat-a-study-v5.blend')
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=900;scene.render.resolution_percentage=100
views=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Paws','Clay','ThreeQuarter','Face']
clay=bpy.data.materials.new('A5_Clay');clay.use_nodes=True;clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.32,.24,1);clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85
for view in views:
    scene.frame_set(63 if view=='Blink' else 1)
    for obj in bpy.data.collections['CatA_Sculpt'].objects:obj.hide_render=view=='Clay' and obj.name.endswith('_Fur')
    scene.view_layers[0].material_override=clay if view=='Clay' else None
    if view in ['Paws','Clay']:
        cam=bpy.data.objects['A_Camera_Front'];cam.location=(2.5,-5,2.1);cam.rotation_euler=(Vector((-.12,-.16,.53))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.70
    else:cam=bpy.data.objects['A_Camera_'+('Face' if view=='Blink' else view)]
    scene.camera=cam;scene.render.filepath='C:/Users/turbo08/mew_voice/assets/avatar/blender/v5-'+view.lower()+'.png'
    bpy.ops.render.render(write_still=True);print('RENDERED_A5',view,flush=True)
