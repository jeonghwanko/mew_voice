import bpy
from pathlib import Path
scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];mesh=head.data;mw=head.matrix_world;rig=bpy.data.objects['GLTF_created_0'];OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# Normalize the entire neck to a common root/head blend, including the original boundary vertices.
rootgroup=head.vertex_groups['Wolf_ROOTSHJnt_38'];neckgroup=head.vertex_groups['Wolf_Neck_TopSHJnt_14']
for v in mesh.vertices:
 p=mw@v.co;h=p.z-.30*(p.y+.24);alpha=sm(.125,.145,h)*(1-sm(.245,.267,h))*sm(-.274,-.252,p.y)
 if alpha<.0001:continue
 weights={g.group:g.weight*(1-alpha) for g in v.groups};nw=sm(.145,.239,h);weights[rootgroup.index]=weights.get(rootgroup.index,0)+alpha*(1-nw);weights[neckgroup.index]=weights.get(neckgroup.index,0)+alpha*nw
 total=sum(weights.values())
 for i,w in weights.items():head.vertex_groups[i].add([v.index],w/total,'REPLACE')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v28.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v28.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
