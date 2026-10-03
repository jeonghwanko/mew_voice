import bpy,json
from collections import Counter
for name in ['mesh_0.001','mesh_0','Object_32']:
 o=bpy.data.objects[name]
 print(name,'mods',[(m.type,m.object.name if m.type=='ARMATURE' else '') for m in o.modifiers])
 print('groups',[(g.index,g.name) for g in o.vertex_groups])
 print('sums',Counter(round(sum(g.weight for g in v.groups),2) for v in o.data.vertices).most_common(8))
print('bones',[(b.name,list(b.scale),list(b.location)) for b in bpy.data.objects['GLTF_created_0'].pose.bones])
