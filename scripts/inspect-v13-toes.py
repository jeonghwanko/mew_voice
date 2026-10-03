import bpy,json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework/bicolor-a-v13.blend')
for o in bpy.data.objects:
 if o.type=='MESH':
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  print(o.name,len(pts),[tuple(min(p[i] for p in pts) for i in range(3)),tuple(max(p[i] for p in pts) for i in range(3))])
 if o.type=='ARMATURE':
  for b in o.data.bones:
   if any(b.name.endswith(x) for x in ['_24','_25','_26','_27','_30','_31']):print(b.name,tuple(o.matrix_world@b.head_local),tuple(o.matrix_world@b.tail_local))
o=bpy.data.objects['mesh_0.001']; pts=[o.matrix_world@v.co for v in o.data.vertices]; print('LOW', [(round(p.x,3),round(p.y,3),round(p.z,3)) for p in pts if p.z<.035 and p.y>0][:80])
