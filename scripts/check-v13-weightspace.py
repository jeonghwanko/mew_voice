import bpy
from mathutils import Vector
m=bpy.data.objects['mesh_0.001']
for g in m.vertex_groups:
 vs=[(m.matrix_world@v.co,w.weight) for v in m.data.vertices for w in v.groups if w.group==g.index and w.weight>.3]
 if vs: print(g.name,len(vs),tuple(round(sum(p[i]*w for p,w in vs)/sum(w for p,w in vs),3) for i in range(3)))
