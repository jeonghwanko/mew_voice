import bpy,json
h=bpy.data.objects['mesh_0.001'];b=h.data.shape_keys.key_blocks[0];diff=sorted([((v.co-b.data[i].co).length,i) for i,v in enumerate(h.data.vertices)],reverse=True);print('basisdiff',diff[:4]);print('count',len(h.data.vertices));print('centers',[(i,tuple(h.matrix_world@h.data.vertices[i].co),tuple(h.matrix_world@b.data[i].co)) for _,i in diff[:4]])
