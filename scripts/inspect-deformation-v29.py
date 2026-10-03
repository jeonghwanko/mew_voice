import bpy,json
from mathutils import Vector
s=bpy.context.scene;s.frame_set(1);o=bpy.data.objects['mesh_0.001'];e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();ds=[((o.matrix_world@v.co-e.matrix_world@m.vertices[i].co).length,i) for i,v in enumerate(o.data.vertices)];print('delta',sorted(ds,reverse=True)[:3]);print('keys',[(k.name,k.value) for k in o.data.shape_keys.key_blocks]);print('modifiers',[(m.name,m.type) for m in o.modifiers]);e.to_mesh_clear()
