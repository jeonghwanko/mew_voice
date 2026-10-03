import bpy,json
from mathutils import Vector
from pathlib import Path
root=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
for file in ['bicolor-a-v13.blend','bicolor-v13-motion-study.blend']:
 bpy.ops.wm.open_mainfile(filepath=str(root/file));s=bpy.context.scene;s.frame_set(1);deps=bpy.context.evaluated_depsgraph_get();data=[]
 for o in s.objects:
  if o.type=='MESH' and o.name in ['mesh_0','mesh_0.001','Object_32']:
   ev=o.evaluated_get(deps);m=ev.to_mesh();vs=[o.matrix_world@v.co for v in m.vertices];data.append({'name':o.name,'bounds':[[min(v[i] for v in vs),max(v[i] for v in vs)] for i in range(3)]});ev.to_mesh_clear()
 print('DATA',file,json.dumps(data))
 rig=bpy.data.objects.get('GLTF_created_0')
 if rig:
  print('BONES',json.dumps({b.name:list(rig.matrix_world@b.head) for b in rig.pose.bones if b.name.endswith(('_38','_27','_33','_4','_10','_14'))}))
