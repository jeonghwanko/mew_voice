import bpy,numpy as np
from pathlib import Path
scene=bpy.context.scene;scene.frame_set(1);o=bpy.data.objects['mesh_0.001'];mesh=o.data
n=len(mesh.vertices);xyz=np.empty(n*3);mesh.vertices.foreach_get('co',xyz);xyz=xyz.reshape(n,3);mat=np.array(o.matrix_world);ps=xyz@mat[:3,:3].T+mat[:3,3];original=ps.copy()
def sm(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
h=ps[:,2]-.30*(ps[:,1]+.24);w=sm(.186,.213,h)*(1-sm(.288,.315,ps[:,2]))*sm(-.270,-.245,ps[:,1]);edges=np.empty(len(mesh.edges)*2,dtype=np.int32);mesh.edges.foreach_get('vertices',edges);edges=edges.reshape(-1,2);src=np.concatenate([edges[:,0],edges[:,1]]);dst=np.concatenate([edges[:,1],edges[:,0]]);degree=np.bincount(src,minlength=n);degree=np.maximum(degree,1)
for step in range(800):
 avg=np.stack([np.bincount(src,weights=ps[dst,j],minlength=n)/degree for j in range(3)],axis=1);factor=.5 if step%2==0 else -.51;ps+=(avg-ps)*(w*factor)[:,None]
delta=(ps-original)@np.linalg.inv(mat[:3,:3]).T
for key in mesh.shape_keys.key_blocks:
 points=np.empty(n*3);key.data.foreach_get('co',points);points=points.reshape(n,3)+delta;key.data.foreach_set('co',points.ravel())
mesh.vertices.foreach_set('co',(xyz+delta).ravel());mesh.update()

mesh.normals_split_custom_set([(0,0,0)]*len(mesh.loops))
for e in mesh.edges:e.use_edge_sharp=False
for p in mesh.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework/bicolor-a-v29.blend')
s=Path('scripts/diagnose-coat-v29.py').read_text(encoding='utf-8-sig').replace('v29-clay-before','v29-clay-after');exec(s)
