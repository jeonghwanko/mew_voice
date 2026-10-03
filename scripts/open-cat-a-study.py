import bpy
# Loading the authored project is local and does not call an external provider.
bpy.context.scene.blendermcp_use_hyper3d=False
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/blender/cat-a-study-v4.blend')
bpy.context.scene.blendermcp_use_hyper3d=False
print('CAT_A_STUDY_OPEN',bpy.data.filepath)
