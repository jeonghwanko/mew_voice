import bpy
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;o=bpy.data.objects['mesh_0.001']
# Resample every facial shape while smoothing the aperture and jaw weight field.
mods=[m for m in o.modifiers if m.type=='ARMATURE']
for m in mods:m.show_viewport=False
sub=o.modifiers.new('Lip_surface_refinement','SUBSURF');sub.levels=2
names=[k.name for k in o.data.shape_keys.key_blocks];positions=[];base=None
for name in names:
 for k in o.data.shape_keys.key_blocks:k.value=1 if k.name==name and name!='Basis' else 0
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(o.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg);positions.append([v.co.copy() for v in data.vertices])
 if base is None:base=data
 else:bpy.data.meshes.remove(data)
o.modifiers.remove(sub);o.data=base
for name,values in zip(names,positions):
 k=o.shape_key_add(name=name)
 for v,p in zip(k.data,values):v.co=p
for m in mods:m.show_viewport=True
bpy.data.objects['A_Tongue'].location.z+=.006
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v20.blend'))
# Reuse consistent lighting and views from the reconstruction script.
rig=bpy.data.objects['GLTF_created_0'];head=o;eyes=bpy.data.objects['mesh_0'];whiskers=bpy.data.objects['Object_32'];body=bpy.data.objects['A_SeatedBody'];tail=bpy.data.objects['A_Tail'];cavity=bpy.data.objects['A_OralCavity'];tongue=bpy.data.objects['A_Tongue'];meshes=[head,eyes,whiskers,body,tail,cavity,tongue]
from mathutils import Vector
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v20-'))
