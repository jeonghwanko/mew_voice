import bpy,json,math
from pathlib import Path
scene=bpy.context.scene;out=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
report={'morphs':{},'sampled_frames':[]}
for name in ['mesh_0','mesh_0.001']:
 o=bpy.data.objects[name];keys=o.data.shape_keys.key_blocks;report['morphs'][name]=[]
 for k in list(keys)[1:]:
  ds=[(a.co-b.co).length for a,b in zip(k.data,keys[0].data)]
  report['morphs'][name].append({'name':k.name,'changed_vertices':sum(d>1e-7 for d in ds),'max_delta_local':max(ds)})
for f in [1,30,60,90,120,180,240]:
 scene.frame_set(f);bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();entry={'frame':f,'objects':[]}
 for name in ['mesh_0','mesh_0.001','Object_32']:
  o=bpy.data.objects[name].evaluated_get(graph);mesh=o.to_mesh();ps=[o.matrix_world@v.co for v in mesh.vertices];assert all(math.isfinite(v) for p in ps for v in p)
  entry['objects'].append({'name':name,'min':[min(p[i] for p in ps) for i in range(3)],'max':[max(p[i] for p in ps) for i in range(3)]});o.to_mesh_clear()
 report['sampled_frames'].append(entry)
(out/'v7-animation-check.json').write_text(json.dumps(report,indent=2));print('V7_ANIMATION_FINITE_SAMPLES_OK')
