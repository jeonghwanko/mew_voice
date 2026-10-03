import bpy,random
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
if bpy.data.is_dirty:
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'/before-v9-live-'+str(random.getrandbits(96))+'.blend',copy=True)
bpy.ops.wm.open_mainfile(filepath=OUT+'/cat-a-foundation-v9.blend')
bpy.context.scene.blendermcp_use_hyper3d=False
print('V9_REBUILT_SCULPT_OPEN',bpy.data.filepath)
