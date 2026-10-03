import bpy,json,math
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene
names=['mesh_0','mesh_0.001','A_SeatedBody','A_Tongue','A_LipRim'];samples={}
for frame in [1,35,76]:
 scene.frame_set(frame);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();entry={}
 for name in names:
  o=bpy.data.objects[name].evaluated_get(dg);m=o.to_mesh();ps=[o.matrix_world@v.co for v in m.vertices];assert all(math.isfinite(c) for p in ps for c in p);entry[name]=ps;o.to_mesh_clear()
 samples[frame]=entry
report={'joints':len(bpy.data.objects['GLTF_created_0'].data.bones),'frames':[1,35,76],'max_open_displacement':{name:max((a-b).length for a,b in zip(samples[1][name],samples[35][name])) for name in names},'max_return_displacement':{name:max((a-b).length for a,b in zip(samples[1][name],samples[76][name])) for name in names}}
assert report['max_open_displacement']['mesh_0']<1e-6,'Jaw must not move eyes'
assert max(report['max_return_displacement'].values())<1e-6
(OUT/'v26-jaw-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
