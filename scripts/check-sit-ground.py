import bpy,json
from pathlib import Path
bpy.context.scene.frame_set(1);o=bpy.data.objects['mesh_0.001'];em=o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
items=[]
for v in o.data.vertices:
 p=o.matrix_world@v.co
 if .09<p.y<.20 and .08<p.z<.20:
  q=o.matrix_world@em.vertices[v.index].co;items.append(q.z)
print('RUMP_MIN',min(items),'BOTTOM20',sorted(items)[:20])
