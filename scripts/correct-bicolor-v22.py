import bpy,math
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0']
head=bpy.data.objects['mesh_0.001'];lip=bpy.data.objects['A_LipRim']
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# A jaw-open corrective gives the lower lip an arc instead of a rectangle.
for o in [head,lip]:
 if not o.data.shape_keys:o.shape_key_add(name='Basis')
 key=o.shape_key_add(name='JawRound');inv=o.matrix_world.inverted()
 for i,v in enumerate(o.data.shape_keys.key_blocks[0].data):
  p=o.matrix_world@v.co;x,y,z=p;w=max(0,1-(x/.023)**2)*(1-sm(.2698,.271,z))*(1-sm(-.265,-.250,y))*sm(.250,.261,z)
  if o==lip:w=max(0,1-(x/.023)**2)*(1-sm(.2698,.2703,z))
  p.z-=.006*w;p.x*=1-.08*w;key.data[i].co=inv@p
 for f,w in [(1,0),(16,0),(30,1),(45,1),(60,0),(76,0)]:key.value=w;key.keyframe_insert('value',frame=f)
bpy.data.objects['A_Tongue'].matrix_world.translation+=Vector((0,-.003,.004))
scene.frame_set(1);bpy.context.view_layer.update()
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']]
# Shorten the torso, preserving the head as a rigid-sized unit; widen face modestly.
targets={}
for o in meshes:
 def move(p):
  p=p.copy()
  if o.name in ['A_SeatedBody','A_Tail']:p.z*=.85
  else:p.z-=.039;p.x*=1.13
  return p
 keys=o.data.shape_keys.key_blocks if o.data.shape_keys else None
 targets[o.name]=[[move(o.matrix_world@v.co) for v in k.data] for k in keys] if keys else [[move(o.matrix_world@v.co) for v in o.data.vertices]]
bones={}
for b in rig.data.bones:
 def movebone(p):
  p=p.copy()
  if p.z>.23:p.z-=.039;p.x*=1.13
  else:p.z*=.85
  return p
 bones[b.name]=(movebone(rig.matrix_world@b.head_local),movebone(rig.matrix_world@b.tail_local))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');inv=rig.matrix_world.inverted()
for b in rig.data.edit_bones:b.head=inv@bones[b.name][0];b.tail=inv@bones[b.name][1]
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
for o in meshes:
 inv=o.matrix_world.inverted();values=targets[o.name]
 if o.data.shape_keys:
  for k,ps in zip(o.data.shape_keys.key_blocks,values):
   for v,p in zip(k.data,ps):v.co=inv@p
  for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
 else:
  for v,p in zip(o.data.vertices,values[0]):v.co=inv@p
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v22.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v22.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];s=s.replace('v18-','v22-').replace('(0,-.27,.295)','(0,-.27,.256)').replace(".43,1)",".40,1)");exec(s)
