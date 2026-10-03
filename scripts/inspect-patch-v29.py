import bpy,bmesh,json
from mathutils import Vector
h=bpy.data.objects['mesh_0.001'];bm=bmesh.new();bm.from_mesh(h.data);mw=h.matrix_world
faces=[f for f in bm.faces if (lambda p:p.y>-.248 and (p.x/.066)**2+((p.z-.251)/.042)**2<1)(mw@f.calc_center_median())];fs=set(faces);edges=[e for e in bm.edges if any(f in fs for f in e.link_faces) and any(f not in fs for f in e.link_faces)];remaining=set(edges);loops=[]
while remaining:
 e=remaining.pop();vs=set(e.verts);todo=list(e.verts)
 while todo:
  v=todo.pop()
  for e in v.link_edges:
   if e in remaining:remaining.remove(e);w=e.other_vert(v);vs.add(w);todo.append(w)
 loops.append(len(vs))
print('PATCH',len(faces),len(edges),loops)
