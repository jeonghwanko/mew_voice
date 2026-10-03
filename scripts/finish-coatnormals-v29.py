import bpy,math
from pathlib import Path
from mathutils import Vector
scene=bpy.context.scene;scene.frame_set(1);h=bpy.data.objects['mesh_0.001'];mesh=h.data;m=h.matrix_world;normals=[]
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for loop in mesh.loops:
 v=mesh.vertices[loop.vertex_index];x,y,z=m@v.co;original=(m.to_3x3().inverted().transposed()@v.normal).normalized();target=Vector((x/.077**2,(y+.242)/.055**2,(z-.263)/.068**2)).normalized();w=sm(-.252,-.218,y)*sm(.204,.232,z)*(1-sm(.296,.318,z));world=original.lerp(target,w).normalized();normals.append((m.to_3x3().transposed()@world).normalized())
mesh.normals_split_custom_set(normals);mesh.update();bpy.ops.wm.save_as_mainfile(filepath='C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework/bicolor-a-v29.blend')
s=Path('scripts/diagnose-coat-v29.py').read_text(encoding='utf-8-sig').replace('v29-clay-before','v29-clay-after');exec(s)
