import bpy,random
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
if bpy.data.is_dirty:
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'/before-v11-live-'+str(random.getrandbits(96))+'.blend',copy=True)
bpy.ops.wm.open_mainfile(filepath=OUT+'/cat-a-foundation-v11.blend')
bpy.context.scene.frame_set(1)
bpy.context.scene.blendermcp_use_hyper3d=False
print('V11_EXPRESSION_STUDY_OPEN',bpy.data.filepath)
