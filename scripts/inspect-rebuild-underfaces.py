import bpy,json
from mathutils import Vector
s=bpy.context.scene;s.frame_set(1);o=bpy.data.objects['mesh_0.001'];em=o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh();out=[]
for f in em.polygons:
 if f.material_index!=0:continue
 p=sum((o.matrix_world@em.vertices[i].co for i in f.vertices),Vector())/len(f.vertices)
 if p.z<.018 and -.02<p.y<.19:
  orig=sum((o.matrix_world@o.data.vertices[i].co for i in f.vertices),Vector())/len(f.vertices)
  out.append([f.index,list(orig),list(p)])
print('SUSPECTS',len(out));print(json.dumps(out[::max(1,len(out)//15)]))
