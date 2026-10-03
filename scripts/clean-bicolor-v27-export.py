import bpy
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];mesh=head.data;rig=bpy.data.objects['GLTF_created_0']
for name in [u.name for u in mesh.uv_layers]:
 if name!='FaceUnifiedUV':mesh.uv_layers.remove(mesh.uv_layers[name])
for name in [a.name for a in mesh.color_attributes]:mesh.color_attributes.remove(mesh.color_attributes[name])
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v27.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v27.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
