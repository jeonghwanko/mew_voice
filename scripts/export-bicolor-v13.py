import bpy
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene
with bpy.data.libraries.load(str(OUT/'bicolor-a-v8.blend'),link=False) as (src,dst):dst.materials=['A_warm_source_coat']
coat=bpy.data.objects['mesh_0.001'];coat.data.materials[0]=bpy.data.materials['A_warm_source_coat']
# Restore the accepted material and its active color set for glTF export.
coat.data.color_attributes.active_color=coat.data.color_attributes['CoatTint']
meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']];rig=bpy.data.objects['GLTF_created_0']
scene.frame_start=1;scene.frame_end=91;scene.render.fps=30
for o in meshes:
 if o.data.shape_keys:
  key=o.data.shape_keys.key_blocks['target_0']
  for frame,value in [(1,0),(16,0),(28,.7),(34,1),(43,1),(62,.2),(73,0),(91,0)]:key.value=value;key.keyframe_insert('value',frame=frame)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v13.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v13.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
