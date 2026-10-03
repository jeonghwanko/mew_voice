"""Render the actual v4 model, including a fully closed eyelid check."""
import bpy,sys
scene=bpy.context.scene
assert 'v4.blend' in bpy.data.filepath
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
views=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Face','ThreeQuarter','Side','Blink']
for view in views:
    scene.frame_set(63 if view=='Blink' else 1)
    scene.camera=bpy.data.objects['A_Camera_'+('Face' if view=='Blink' else view)]
    scene.render.filepath='C:/Users/turbo08/mew_voice/assets/avatar/blender/v4-'+view.lower()+'.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED_A4',view,flush=True)
