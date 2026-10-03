import bpy,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
h=bpy.data.objects['mesh_0.001'];ps=[h.matrix_world@v.co for v in h.data.vertices];tree=BVHTree.FromPolygons(ps,[list(p.vertices) for p in h.data.polygons]);rows=[]
for z in [.215,.225,.235,.245,.255,.265]:
 row=[]
 for x in [.025,.035,.045,.055,.065]:
  p,n,face,d=tree.ray_cast(Vector((x,.2,z)),Vector((0,-1,0)));row.append(round(p.y,5) if p else None)
 rows.append([z,row])
print(json.dumps(rows))
