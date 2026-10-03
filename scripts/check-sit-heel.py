import bpy,json,math
from pathlib import Path
s=bpy.context.scene;s.frame_set(1);r=bpy.data.objects['GLTF_created_0'];o=bpy.data.objects['mesh_0.001'];em=o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
for side,ids in [('L',(25,24)),('R',(31,30))]:
 points=[r.matrix_world@next(b for b in r.pose.bones if b.name.endswith('_'+str(i))).head for i in ids]
 d=points[1]-points[0];print(side,'hock/paw',[[round(x,5) for x in p] for p in points],'slopeDegrees',math.degrees(math.atan2(abs(d.z),math.hypot(d.x,d.y))))
for lo,hi in [(-.04,-.02),(-.02,0),(0,.02),(.02,.04),(.04,.06),(.06,.08)]:
 points=[]
 for v in o.data.vertices:
  orig=o.matrix_world@v.co;p=o.matrix_world@em.vertices[v.index].co
  if orig.y>.07 and orig.z<.11 and orig.x>0 and lo<=p.y<hi:points.append(p.z)
 print('sole interval',lo,hi,'minZ',min(points) if points else None)
