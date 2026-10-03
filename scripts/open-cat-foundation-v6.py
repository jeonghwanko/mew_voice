import bpy
import random
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
if bpy.data.is_dirty:
    backup=OUT+'/before-foundation-v6-live-'+str(random.getrandbits(96))+'.blend'
    bpy.ops.wm.save_as_mainfile(filepath=backup,copy=True)
    print('PREVIOUS_LIVE_SCENE_BACKED_UP')
bpy.ops.wm.open_mainfile(filepath=OUT+'/cat-a-foundation-v6.blend')
bpy.context.scene.blendermcp_use_hyper3d=False
print('FOUNDATION_V6_OPEN',bpy.data.filepath)
print('CLAY_SURFACE',len(bpy.data.objects['Cat_Anatomical_Surface'].data.vertices))
