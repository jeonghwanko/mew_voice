import bpy,json,math
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene
names=['mesh_0','mesh_0.001','A_Tongue','A_LipRim','A_ShortCoat'];samples={}
for frame in [1,35,76]:
 scene.frame_set(frame);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();entry={}
 for name in names:
  o=bpy.data.objects[name].evaluated_get(dg);m=o.to_mesh();ps=[o.matrix_world@v.co for v in m.vertices];assert all(math.isfinite(c) for p in ps for c in p);entry[name]=ps;o.to_mesh_clear()
 samples[frame]=entry
report={'joints':len(bpy.data.objects['GLTF_created_0'].data.bones),'frames':[1,35,76],'max_open_displacement':{name:max((a-b).length for a,b in zip(samples[1][name],samples[35][name])) for name in names},'max_return_displacement':{name:max((a-b).length for a,b in zip(samples[1][name],samples[76][name])) for name in names}}
assert report['max_open_displacement']['mesh_0']<1e-6,'Jaw must not move eyes'
assert max(report['max_return_displacement'].values())<1e-6
(OUT/'v29-jaw-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))


# The head and torso must be connected through real edges, not merely joined objects.
scene.frame_set(1);o=bpy.data.objects['mesh_0.001'];adj=[[] for _ in o.data.vertices]
for e in o.data.edges:
 a,b=e.vertices;adj[a].append(b);adj[b].append(a)
start=max(range(len(adj)),key=lambda i:(o.matrix_world@o.data.vertices[i].co).z);seen={start};todo=[start]
while todo:
 i=todo.pop()
 for j in adj[i]:
  if j not in seen:seen.add(j);todo.append(j)
assert min((o.matrix_world@o.data.vertices[i].co).z for i in seen)<.03,'Head must connect to paws'
report['head_component_reaches_paws']=True
# Small neck pose verifies finite deformation and prevents extreme seam stretching.
rig=bpy.data.objects['GLTF_created_0'];bone=rig.pose.bones['Wolf_Neck_TopSHJnt_14'];saved=bone.matrix_basis.copy();bone.rotation_mode='XYZ';bone.rotation_euler.z=.14;bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(dg);m=ev.to_mesh()
ps=[ev.matrix_world@v.co for v in m.vertices];assert all(math.isfinite(c) for p in ps for c in p)
ratios=[]
for e in o.data.edges:
 a,b=e.vertices;p=o.matrix_world@o.data.vertices[a].co;h=p.z-.30*(p.y+.24)
 if .205<h<.221:
  base=(samples[1]['mesh_0.001'][a]-samples[1]['mesh_0.001'][b]).length
  if base>1e-5:ratios.append((ps[a]-ps[b]).length/base)
report['neck_pose_radians']=.14;report['neck_edge_stretch_max']=max(ratios);assert max(ratios)<3
bone.matrix_basis=saved;ev.to_mesh_clear();scene.frame_set(1)
(OUT/'v29-jaw-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
