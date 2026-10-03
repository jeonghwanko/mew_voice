import bpy,bmesh,json
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/references/fullbody-fit/fullbody-fit.blend')
for name in ['V13_Upper_mesh_0.001','New_Seated_Haunch_With_V13_Toes']:
 o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
 print(name,'volume',bm.calc_volume(signed=True),'bounds',sum(e.is_boundary for e in bm.edges))
 cut=[e for e in bm.edges if e.is_boundary and all(abs(v.co.y-.035)<2e-5 for v in e.verts)]
 print('CUT',len(cut));res=bmesh.ops.holes_fill(bm,edges=cut,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));print('CAP',len(res['faces']),'volume',bm.calc_volume(signed=True),'boundary',sum(e.is_boundary for e in bm.edges));bm.free()
