import bpy,bmesh,json
from mathutils import Vector
for name in ['mesh_0.001','A_SeatedBody']:
 o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);bm.transform(o.matrix_world)
 # Oblique neck plane preserves the lower muzzle while cutting into the occiput.
 z=.218 if name=='mesh_0.001' else .208
 result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=Vector((0,-.24,z)),plane_no=Vector((0,-.30,1)),clear_inner=name=='mesh_0.001',clear_outer=name=='A_SeatedBody',dist=1e-7)
 edges=[e for e in bm.edges if e.is_boundary and all(abs(v.co.z-z-.30*(v.co.y+.24))<1e-5 for v in e.verts)]
 remaining=set(edges);loops=[]
 while remaining:
  e=remaining.pop();vs=set(e.verts);todo=list(e.verts);es=[e]
  while todo:
   v=todo.pop()
   for edge in v.link_edges:
    if edge in remaining:remaining.remove(edge);es.append(edge);w=edge.other_vert(v);vs.add(w);todo.append(w)
  loops.append({'edges':len(es),'verts':len(vs),'min':[min(v.co[i] for v in vs) for i in range(3)],'max':[max(v.co[i] for v in vs) for i in range(3)]})
 print(name,json.dumps(loops));bm.free()
