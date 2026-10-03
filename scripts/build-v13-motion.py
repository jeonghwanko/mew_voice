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

# Source lower rear paws were assigned to the metatarsal joint even below
# the ankle. Keep paw volume on the ankle; blend only the lower-leg transition.
for v in body.data.vertices:
 p=body.matrix_world@v.co
 weights={body.vertex_groups[w.group].name:w.weight for w in v.groups}
 hind=sum(w for n,w in weights.items() if 'HindLeg' in n)
 amount=(1-smooth(.045,.095,p.z))*min(1,hind*2)
 if p.y<.065 or amount<.001:continue
 ankle=bone('_24') if p.x>=0 else bone('_30')
 weights={n:w*(1-amount) for n,w in weights.items()};weights[ankle]=weights.get(ankle,0)+amount
 for g in body.vertex_groups:g.remove([v.index])
 for n,w in weights.items():
  if w>.0001:body.vertex_groups[n].add([v.index],w,'REPLACE')

# Folded haunch skin follows the pelvis; distal paw skin stays on its ankle.
# The source's knee influences include large patches of abdomen, so avoid
# pulling those patches around the sharply flexed knee.
for v in body.data.vertices:
 p=body.matrix_world@v.co
 weights={body.vertex_groups[w.group].name:w.weight for w in v.groups}
 hind=sum(w for n,w in weights.items() if 'HindLeg' in n)
 if p.y<.065 or hind<.05:continue
 ankle=bone('_24') if p.x>=0 else bone('_30')
 top=smooth(.085,.165,p.z)
 bottom=1-smooth(.025,.065,p.z)
 hock=bone('_25') if p.x>=0 else bone('_31')
 weights={n:w for n,w in weights.items() if 'HindLeg' not in n}
 weights[bone('_38')]=weights.get(bone('_38'),0)+hind*top
 weights[ankle]=weights.get(ankle,0)+hind*(1-top)*bottom
 weights[hock]=weights.get(hock,0)+hind*(1-top)*(1-bottom)
 for g in body.vertex_groups:g.remove([v.index])
 total=sum(weights.values())
 for n,w in weights.items():
  if w>.00001:body.vertex_groups[n].add([v.index],w/total,'REPLACE')

def aim(n,child,target):
 p=pos(n);a=pos(child)-p;b=target-p
 q=a.rotation_difference(b);m=world@rig.pose.bones[n].matrix
 rig.pose.bones[n].matrix=inv@Matrix.Translation(p)@q.to_matrix().to_4x4()@Matrix.Translation(-p)@m;update()
def hind_fold(chain,end,target,amount):
 hip,knee,hock=chain
 # Solve to the hock as well as the paw: the metatarsal lies along the floor.
 a=pos(hip);l1=(pos(knee)-a).length;l2=(pos(hock)-pos(knee)).length
 footlength=(pos(end)-pos(hock)).length
 flat=target+Vector((0,math.sqrt(footlength**2-.003**2),-.003))
 htarget=pos(hock).lerp(flat,amount)
 delta=htarget-a;d=min(l1+l2-.00001,max(abs(l1-l2)+.00001,delta.length));axis=delta.normalized()
 along=(l1*l1-l2*l2+d*d)/(2*d);height=math.sqrt(max(0,l1*l1-along*along))
 pole=Vector((0,-.3,1));pole=(pole-axis*pole.dot(axis)).normalized()
 joint=a+axis*along+pole*height
 aim(hip,knee,joint);aim(knee,hock,htarget);aim(hock,end,target)

def pose(amount,turn=0):
 for b in rig.pose.bones:b.matrix_basis=rest_basis[b.name].copy()
 update()
 root=rig.pose.bones[bone('_38')];m=world@root.matrix;m.translation+=Vector((0,.015*amount,-.18*amount));root.matrix=inv@m;update()
 rotate(bone('_38'),math.radians(-40)*amount)
 rotate(bone('_16'),math.radians(25)*amount)
 rotate(bone('_15'),math.radians(15)*amount)
 rotate(bone('_37'),math.radians(60)*amount)
 for i,(chain,end) in enumerate(chains):
  target=feet[end].copy()
  if i<2:target.y+=.045*amount
  else:
   target.x+=(-1 if target.x<0 else 1)*.008*amount
   target.y-=.14*amount
  if turn>0:
   phase=(turn*12+i*.25)%1
   stance=.75
   sweep=(.5-phase/stance) if phase<stance else (-.5+(phase-stance)/(1-stance))
   target=Matrix.Rotation(math.radians(22.5)*sweep,4,'Z')@target
   if phase>=stance:target.z+=.02*math.sin(math.pi*(phase-stance)/(1-stance))
  if i>=2 and amount>.001:hind_fold(chain,end,target,amount)
  else:solve(chain,end,target)
  # Keep each paw level while the leg folds above it.
  b=rig.pose.bones[end];m=b.matrix.copy();loc=m.translation.copy();m=rest[end].copy();m.translation=loc;b.matrix=m;update()
pose(1)
# Pose-space corrective: relax folded haunch surface while keeping the bind
# mesh intact. Convert the smoothed posed positions back through skin matrices.
body.shape_key_add(name='SitFoldCorrective',from_mix=False)
corrective=body.data.shape_keys.key_blocks['SitFoldCorrective']
update();evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get());em=evaluated.to_mesh()
points=[body.matrix_world@v.co for v in em.vertices];evaluated.to_mesh_clear()
adj=[set() for v in body.data.vertices]
for edge in body.data.edges:
 a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
mask=[]
for v in body.data.vertices:
 p=body.matrix_world@v.co
 mask.append(smooth(.035,.075,p.y)*(1-smooth(.18,.225,p.y))*smooth(.03,.065,p.z)*(1-smooth(.16,.21,p.z)))
for _ in range(35):
 nxt=[p.copy() for p in points]
 for i,w in enumerate(mask):
  if w<.001 or not adj[i]:continue
  avg=sum((points[j] for j in adj[i]),Vector())/len(adj[i]);nxt[i]=points[i].lerp(avg,.55*w)
 points=nxt
skin={g.index:world@rig.pose.bones[g.name].matrix@rig.data.bones[g.name].matrix_local.inverted()@inv for g in body.vertex_groups}
objinv=body.matrix_world.inverted()
for v in body.data.vertices:
 original=body.matrix_world@v.co
 sole=.065<original.y<.225 and original.z<.11
 if mask[v.index]<.001 and not sole:continue
 m=Matrix(((0,0,0,0),)*4);total=sum(g.weight for g in v.groups)
 for g in v.groups:
  m+=skin[g.group]*(g.weight/total)
 target=points[v.index].copy()
 if sole:target.z-=.006*(1-smooth(.006,.015,target.z))
 target.z=max(0,target.z)
 corrective.data[v.index].co=objinv@m.inverted_safe()@target
corrective.value=1;update()
# Bake FK transforms after fixed-length inverse-kinematics solving.
s.render.fps=30
samples=[]
for frame in range(1,302,2):
 t=(frame-1)/30
 amount=1-smooth(.5,2,t) if t<2 else (smooth(8,9.5,t) if t>8 else 0)
 turn=smooth(2.2,7.8,t)
 pose(amount,turn if 0<turn<1 else 0)
 corrective.value=amount;corrective.keyframe_insert('value',frame=frame)
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


