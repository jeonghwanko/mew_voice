"""Isolated V13 sit/stand rig study; never overwrites the accepted source."""
import bpy, math, json, sys, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]/'assets/avatar'
OUT=ROOT/'v13-sit-stand'; OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'realistic/rework/bicolor-a-v13.blend'))
s=bpy.context.scene;s.frame_set(1)
deps=bpy.context.evaluated_depsgraph_get()
copies=[]
for name in ['mesh_0.001','mesh_0','Object_32']:
 o=bpy.data.objects[name]
 m=bpy.data.meshes.new_from_object(o.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
 m.transform(o.matrix_world);m.use_fake_user=True;copies.append((name,m))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
meshes=[]
for name,m in copies:
 o=bpy.data.objects.new('V13_'+name,m);s.collection.objects.link(o);meshes.append(o)
body=meshes[0]
for o in meshes:o.vertex_groups.clear()
arm=bpy.data.armatures.new('SitStand');rig=bpy.data.objects.new('SitStand',arm);s.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
segments={}
def bone(n,a,b,parent=None):
 e=arm.edit_bones.new(n);e.head=a;e.tail=b
 if parent:e.parent=arm.edit_bones[parent]
 segments[n]=(Vector(a),Vector(b))
bone('Pelvis',(0,.13,.215),(0,.13,.27))
bone('Spine',(0,.13,.23),(0,-.145,.225),'Pelvis')
bone('Neck',(0,-.145,.225),(0,-.23,.30),'Spine')
bone('Head',(0,-.23,.30),(0,-.30,.30),'Neck')
chains={}
for side in [-1,1]:
 hp=[Vector((side*.044,.135,.205)),Vector((side*.05,.09,.139)),Vector((side*.057,.176,.074)),Vector((side*.061,.174,.018))]
 fp=[Vector((side*.037,-.155,.214)),Vector((side*.037,-.13,.156)),Vector((side*.035,-.13,.043)),Vector((side*.035,-.15,.013))]
 chains[side]=(hp,fp)
 for prefix,pts,parent in [('Hind',hp,'Pelvis'),('Fore',fp,'Spine')]:
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):
   n=f'{prefix}{kind}_{side}';bone(n,a,b,parent);parent=n
  bone(f'{prefix}Paw_{side}',pts[-1],pts[-1]+Vector((0,-.035,0)),parent)
# V13's edited tail no longer matches the imported wolf rig: measure its centre.
tail=[]
tail_end=max(v.co.y for v in body.data.vertices)-.006
for y in [.19+((tail_end-.19)*i/4) for i in range(5)]:
 pts=[v.co for v in body.data.vertices if abs(v.co.y-y)<.009 and (y>.235 or v.co.z>.19)]
 if not pts:raise RuntimeError('Missing tail section')
 tail.append(Vector((sum(p.x for p in pts)/len(pts),y,sum(p.z for p in pts)/len(pts))))
for i in range(4):bone(f'Tail{i}',tail[i],tail[i+1],'Pelvis' if i==0 else f'Tail{i-1}')
bpy.ops.object.mode_set(mode='OBJECT')
# Heat solve at a useful physical scale. Keep UVs and all face-corner attributes.
for o in [body,rig]:o.scale=(100,100,100)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
heat=str(bpy.ops.object.parent_set(type='ARMATURE_AUTO'))
body.parent=None;body.matrix_world=Matrix.Identity(4);rig.scale=(1,1,1)
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def group(o,n):return o.vertex_groups.get(n) or o.vertex_groups.new(name=n)
unweighted=0
for v in body.data.vertices:
 p=v.co;weights={body.vertex_groups[g.group].name:g.weight for g in v.groups}
 if not weights:unweighted+=1;weights={'Spine':1}
 tail_amount=smooth(.19,.235,p.y)
 base={n:w for n,w in weights.items() if not n.startswith('Tail')}
 total=sum(base.values())
 weights={n:w/max(total,1e-12)*(1-tail_amount) for n,w in base.items()}
 tw={f'Tail{i}':math.exp(-((p.y-(tail[i].y+tail[i+1].y)/2)/.04)**2) for i in range(4)}
 total=sum(tw.values())
 for n,w in tw.items():weights[n]=w/max(total,1e-12)*tail_amount
 torso=smooth(.095,.19,p.z)*smooth(-.225,-.16,p.y)*(1-smooth(.19,.23,p.y))
 abdomen=smooth(-.13,-.075,p.y)*(1-smooth(.035,.09,p.y))*smooth(.035,.075,p.z)
 torso=max(torso,abdomen)
 pelvis=smooth(-.005,.16,p.y)
 weights={n:w*(1-torso) for n,w in weights.items()}
 weights['Spine']=weights.get('Spine',0)+torso*(1-pelvis)
 weights['Pelvis']=weights.get('Pelvis',0)+torso*pelvis
 neck=smooth(.17,.235,p.z)*(1-smooth(-.18,-.135,p.y))
 weights={n:w*(1-neck) for n,w in weights.items()};weights['Neck']=weights.get('Neck',0)+neck
 lower=(1-smooth(.065,.115,p.z))*smooth(.055,.085,p.y)*(1-smooth(.195,.23,p.y))
 ankle=f'HindAnkle_{1 if p.x>=0 else -1}'
 weights={n:w*(1-lower) for n,w in weights.items()};weights[ankle]=weights.get(ankle,0)+lower
 # Lock disconnected facial details and distal toes to their appropriate bones.
 head=(1-smooth(-.245,-.195,p.y))*smooth(.18,.23,p.z)
 paw=(1-smooth(.025,.045,p.z)) if p.y<-.085 else (1-smooth(.022,.038,p.z))*(1-smooth(.155,.181,p.y)) if .055<p.y<.195 else 0
 if head>.001:weights={n:w*(1-head) for n,w in weights.items()};weights['Head']=weights.get('Head',0)+head
 if paw>.001:
  name=f'{"Fore" if p.y<0 else "Hind"}Paw_{1 if p.x>=0 else -1}'
  weights={n:w*(1-paw) for n,w in weights.items()};weights[name]=weights.get(name,0)+paw
 weights=dict(sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4])
 total=sum(weights.values())
 for g in body.vertex_groups:g.remove([v.index])
 for n,w in weights.items():
  if w>1e-6:group(body,n).add([v.index],w/total,'REPLACE')
for o in meshes[1:]:
 group(o,'Head').add(list(range(len(o.data.vertices))),1,'REPLACE')
 mod=o.modifiers.new('SitStand skin','ARMATURE');mod.object=rig
# Diffuse influence boundaries over actual connected surface neighbours.
W=np.zeros((len(body.data.vertices),len(body.vertex_groups)),dtype=np.float64)
for v in body.data.vertices:
 for g in v.groups:W[v.index,g.group]=g.weight
edges=np.array([e.vertices[:] for e in body.data.edges],dtype=np.int32)
counts=np.bincount(edges.ravel(),minlength=len(W)).clip(1)
mask=np.array([smooth(.025,.065,v.co.z)*(1-smooth(.21,.25,v.co.z))*smooth(-.24,-.18,v.co.y) for v in body.data.vertices])[:,None]
for _ in range(14):
 sums=np.zeros_like(W);np.add.at(sums,edges[:,0],W[edges[:,1]]);np.add.at(sums,edges[:,1],W[edges[:,0]])
 W=W*(1-.45*mask)+(sums/counts[:,None])*(.45*mask)
for v in body.data.vertices:
 row=W[v.index];inds=np.argsort(row)[-4:];total=sum(row[i] for i in inds)
 for g in body.vertex_groups:g.remove([v.index])
 for i in inds:
  if row[i]>1e-6:body.vertex_groups[int(i)].add([v.index],float(row[i]/total),'REPLACE')
for o in meshes:
 for mod in o.modifiers:
  if mod.type=='ARMATURE':mod.use_deform_preserve_volume=False

def setbone(n,a,b):
 rest=arm.bones[n];q=(rest.tail_local-rest.head_local).rotation_difference(b-a)
 rig.pose.bones[n].matrix=Matrix.Translation(a)@q.to_matrix().to_4x4()@Matrix.Translation(-rest.head_local)@rest.matrix_local
 bpy.context.view_layer.update()
def joint(a,b,l1,l2,forward):
 delta=b-a;d=max(abs(l1-l2)+1e-5,min(l1+l2-1e-5,delta.length));axis=delta.normalized()
 along=(l1*l1-l2*l2+d*d)/(2*d);perp=Vector((0,axis.z,-axis.y))
 if (perp.y<0)!=forward:perp=-perp
 return a+axis*along+perp*math.sqrt(max(0,l1*l1-along*along))
def pose(t):
 shift=Vector((0,-.025*t,-.16*t))
 setbone('Pelvis',segments['Pelvis'][0]+shift,segments['Pelvis'][1]+shift)
 shoulder=segments['Spine'][1]+Vector((0,.028*t,0))
 setbone('Spine',segments['Spine'][0]+shift,shoulder)
 head=segments['Head'][0]+Vector((0,.075*t,.025*t))
 setbone('Neck',shoulder,head);setbone('Head',head,head+segments['Head'][1]-segments['Head'][0])
 for side,(hp,fp) in chains.items():
  hip=hp[0]+shift;paw=hp[-1]+Vector((0,-.11*t,.002*t))
  offset=hp[2]-hp[3];angle=-math.atan2(offset.z,offset.y)*t
  hock=paw+Matrix.Rotation(angle,3,'X')@offset
  knee=joint(hip,hock,(hp[1]-hp[0]).length,(hp[2]-hp[1]).length,True)
  pts=[hip,knee,hock,paw]
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):setbone(f'Hind{kind}_{side}',a,b)
  setbone(f'HindPaw_{side}',paw,paw+Vector((0,-.035,0)))
  hip=fp[0]+Vector((0,.028*t,0));ankle=fp[2]
  knee=joint(hip,ankle,(fp[1]-fp[0]).length,(fp[2]-fp[1]).length,False)
  pts=[hip,knee,ankle,fp[3]]
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):setbone(f'Fore{kind}_{side}',a,b)
  setbone(f'ForePaw_{side}',fp[3],fp[3]+Vector((0,-.035,0)))
 # Gradually flatten the entire tail rather than clamping each joint separately.
 for i in range(4):
  a=tail[i].copy();b=tail[i+1].copy()
  for p in [a,b]:
   p.z=p.z*(1-t)+(.025+.045*math.exp(-(p.y-.19)/.07))*t;p.y-=.025*t
  setbone(f'Tail{i}',a,b)
pose(1)
body.shape_key_add(name='Basis')
corrective=body.shape_key_add(name='SeatedSkinCompression')
ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh()
points=np.array([v.co[:] for v in em.vertices]);ev.to_mesh_clear()
relax=np.array([smooth(-.20,-.14,v.co.y)*(1-smooth(.015,.06,v.co.y))*smooth(.08,.11,v.co.z)*(1-smooth(.17,.21,v.co.z)) for v in body.data.vertices])[:,None]
for _ in range(18):
 sums=np.zeros_like(points);np.add.at(sums,edges[:,0],points[edges[:,1]]);np.add.at(sums,edges[:,1],points[edges[:,0]])
 points=points*(1-.3*relax)+(sums/counts[:,None])*(.3*relax)
skin={g.index:rig.pose.bones[g.name].matrix@arm.bones[g.name].matrix_local.inverted() for g in body.vertex_groups if g.name in arm.bones}
for v in body.data.vertices:
 p=v.co;target=Vector(points[v.index]);contact=.045<p.y<.23 and p.z<.18 and target.z<.005
 if contact:target.z=.001+.004*math.exp((target.z-.005)/.004)
 if relax[v.index,0]<.0001 and not contact:continue
 mat=Matrix(((0,0,0,0),)*4)
 for g in v.groups:mat+=skin[g.group]*g.weight
 corrective.data[v.index].co=mat.inverted_safe()@target
for f in range(1,122):
 t=1-smooth(16,61,f) if f<=61 else smooth(76,121,f)
 pose(t)
 corrective.value=t;corrective.keyframe_insert('value',frame=f)
 for pb in rig.pose.bones:
  pb.rotation_mode='QUATERNION'
  for prop in ['location','rotation_quaternion','scale']:pb.keyframe_insert(prop,frame=f)
s.frame_start=1;s.frame_end=121;s.render.fps=30
s.world=bpy.data.worlds.new('Review');s.world.color=(.45,.45,.45)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Review floor';bpy.context.object.location.z=-.003
for loc,power in [((1,-2,3),230),((-2,1,2),140)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=2
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.78
s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=800;s.render.resolution_y=650;s.render.resolution_percentage=100
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'v13-sit-stand-study.blend'))
(OUT/'audit.json').write_text(json.dumps({'heat_result':heat,'unweighted_before_fallback':unweighted,'vertices':len(body.data.vertices),'status':'awaiting visual review'},indent=2))
views=[('side',(1,.015,.20)),('front',(0,-1,.20)),('back',(0,1,.20))]
if '--quick' in sys.argv:views=views[:1]
for view,loc in views:
 cam.location=loc;cam.rotation_euler=(Vector((0,.02,.19))-cam.location).to_track_quat('-Z','Y').to_euler()
 for label,f in [('sit',1),('half',38),('stand',61)]:
  s.frame_set(f);s.render.filepath=str(OUT/f'{view}-{label}.png');bpy.ops.render.render(write_still=True)
