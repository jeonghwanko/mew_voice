"""Non-destructive V13 fixed-length skeleton pose study."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
s=bpy.context.scene; s.frame_set(1); rig=bpy.data.objects['GLTF_created_0']
meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
for o in bpy.data.objects:
 o.animation_data_clear()
 if o.type=='MESH' and o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for k in o.data.shape_keys.key_blocks:k.value=0
bpy.context.view_layer.update()
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
rest={b.name:b.matrix.copy() for b in rig.pose.bones}
rest_basis={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
world=rig.matrix_world.copy(); inv=world.inverted()
def update():bpy.context.view_layer.update()
def pos(n):return world@rig.pose.bones[n].head
def rotate(n,angle):
 b=rig.pose.bones[n]; m=world@b.matrix; p=m.translation.copy()
 b.matrix=inv@Matrix.Translation(p)@Matrix.Rotation(angle,4,'X')@Matrix.Translation(-p)@m;update()
def solve(chain,end,target):
 for _ in range(18):
  for n in reversed(chain):
   p=pos(n); a=pos(end)-p; b=target-p
   if min(a.length,b.length)<1e-7:continue
   q=a.rotation_difference(b);m=world@rig.pose.bones[n].matrix
   rig.pose.bones[n].matrix=inv@Matrix.Translation(p)@q.to_matrix().to_4x4()@Matrix.Translation(-p)@m;update()
  if (pos(end)-target).length<.0003:break
legs=[(['Wolf_L_Front_HipSHJnt_4','Wolf_L_Front_KneeSHJnt_3'],'Wolf_L_Front_AnkleSHJnt_2')]
# Use suffixes because the source rig names differ from conventional anatomy.
def bone(suffix):return next(b.name for b in rig.pose.bones if b.name.endswith(suffix))
chains=[([bone('_4'),bone('_3')],bone('_2')),([bone('_10'),bone('_9')],bone('_8')),([bone('_27'),bone('_26'),bone('_25')],bone('_24')),([bone('_33'),bone('_32'),bone('_31')],bone('_30'))]
feet={e:pos(e).copy() for c,e in chains}
# The imported skin has no effective spine influences: rebind torso spatially.
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
body=bpy.data.objects['mesh_0.001']
spines=[bone('_38'),bone('_21'),bone('_20'),bone('_19'),bone('_18'),bone('_17'),bone('_16'),bone('_15'),bone('_14')]
for v in body.data.vertices:
 p=body.matrix_world@v.co
 if p.y<-.215 or p.y>.22:continue
 original={body.vertex_groups[w.group].name:w.weight for w in v.groups}
 amount=smooth(.105,.195,p.z)
 if -.085<p.y<.075:amount=max(amount,smooth(.055,.11,p.z))
 amount*=1-smooth(.17,.22,p.y)
 amount*=smooth(-.215,-.18,p.y)
 if amount<.001:continue
 nearest=sorted(spines,key=lambda n:(pos(n)-p).length)[:3]
 ws={n:math.exp(-((pos(n).y-p.y)/.06)**2) for n in nearest};total=sum(ws.values())
 if total<1e-12:continue
 weights={n:w*(1-amount) for n,w in original.items()}
 for n,w in ws.items():weights[n]=weights.get(n,0)+amount*w/total
 for g in body.vertex_groups:g.remove([v.index])
 for n,w in weights.items():
  if w>.0001:body.vertex_groups[n].add([v.index],w,'REPLACE')

def pose(amount,turn=0):
 for b in rig.pose.bones:b.matrix_basis=rest_basis[b.name].copy()
 update()
 root=rig.pose.bones[bone('_38')];m=world@root.matrix;m.translation+=Vector((0,.015*amount,-.14*amount));root.matrix=inv@m;update()
 rotate(bone('_38'),math.radians(-28)*amount)
 rotate(bone('_16'),math.radians(18)*amount)
 rotate(bone('_15'),math.radians(10)*amount)
 rotate(bone('_37'),math.radians(45)*amount)
 for i,(chain,end) in enumerate(chains):
  target=feet[end].copy()
  if i<2:target.y+=.045*amount
  else:target.x+=(-1 if target.x<0 else 1)*.012*amount
  if i>=2:
   rotate(chain[1],math.radians(110)*amount)
   rotate(chain[2],math.radians(-120)*amount)
  if turn>0:
   phase=(turn*12+i*.25)%1
   stance=.75
   sweep=(.5-phase/stance) if phase<stance else (-.5+(phase-stance)/(1-stance))
   target=Matrix.Rotation(math.radians(22.5)*sweep,4,'Z')@target
   if phase>=stance:target.z+=.02*math.sin(math.pi*(phase-stance)/(1-stance))
  solve(chain,end,target)
  # Keep each paw level while the leg folds above it.
  b=rig.pose.bones[end];m=b.matrix.copy();loc=m.translation.copy();m=rest[end].copy();m.translation=loc;b.matrix=m;update()
pose(1)
# Bake FK transforms after fixed-length inverse-kinematics solving.
s.render.fps=30
samples=[]
for frame in range(1,302,2):
 t=(frame-1)/30
 amount=1-smooth(.5,2,t) if t<2 else (smooth(8,9.5,t) if t>8 else 0)
 turn=smooth(2.2,7.8,t)
 pose(amount,turn if 0<turn<1 else 0)
 main=rig.pose.bones[bone('_39')]
 main.matrix=inv@Matrix.Rotation(turn*math.tau,4,'Z')@world@main.matrix;update()
 samples.append((frame,{b.name:b.matrix_basis.copy() for b in rig.pose.bones}))
for frame,transforms in samples:
 for b in rig.pose.bones:
  b.matrix_basis=transforms[b.name]
  b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('scale',frame=frame)
s.frame_set(1)
s.frame_start=1;s.frame_end=301;s.render.fps=30
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-v13-motion-study.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-v13-motion.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
# Fast material review, isolated from baseline lighting and helper shapes.
for o in s.objects:
 if o.type=='MESH':o.hide_render=o not in meshes
s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=640;s.render.resolution_y=640;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('MotionReviewWorld');s.world.color=(.5,.5,.5)
bpy.ops.object.camera_add(location=(.6,-.85,.35));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.58;cam.rotation_euler=(Vector((0,0,.18))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(.3,-.5,.9));bpy.context.object.data.energy=45;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=.8
for name,location in [('quarter',(.6,-.85,.35)),('side',(.85,0,.3))]:
 cam.location=location;cam.rotation_euler=(Vector((0,0,.18))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/f'v13-motion-{name}.png');bpy.ops.render.render(write_still=True)
print('MOTION_STUDY_COMPLETE')

