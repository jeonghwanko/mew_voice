import bpy
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.collections['CatA_Sculpt'].objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-foundation-v6.glb',export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
print('FOUNDATION_EXPORTED_NORMALS_16')
