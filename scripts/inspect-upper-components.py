import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/references/fullbody-fit/fullbody-fit.blend')
o=bpy.data.objects['V13_Upper_mesh_0.001'];bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
cut=[e for e in bm.edges if e.is_boundary and all(abs(v.co.y-.035)<2e-5 for v in e.verts)];bmesh.ops.holes_fill(bm,edges=cut,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
unseen=set(bm.verts)
while unseen:
 stack=[unseen.pop()];comp=set(stack)
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   u=e.other_vert(v)
   if u in unseen:unseen.remove(u);comp.add(u);stack.append(u)
 print('COMP',len(comp),[[min(v.co[i] for v in comp),max(v.co[i] for v in comp)] for i in range(3)])
