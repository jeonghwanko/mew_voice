import bpy,json
r=bpy.data.objects['GLTF_created_0'];o=bpy.data.objects['mesh_0.001'];bpy.context.scene.frame_set(1);bpy.context.view_layer.update();e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh()
for term in ['FrontLeg_Toe','HindLeg_Toe','Tail']:
 ids=[v.index for v in o.data.vertices if sum(g.weight for g in v.groups if term in o.vertex_groups[g.group].name)>.5];ps=[o.matrix_world@m.vertices[i].co for i in ids];print(term,'count',len(ids),'minmax',[(min(p[j] for p in ps),max(p[j] for p in ps)) for j in range(3)])
print('basis',[(b.name,tuple(b.location),tuple(b.scale)) for b in r.pose.bones if b.location.length>.00001 or (b.scale.length-3**.5)>.0001])
