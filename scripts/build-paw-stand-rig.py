"""Seated hindquarter to standing rig study. Source fit2 and V13 remain untouched."""
import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references')
OUT=ROOT/'paw-stand-rig';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'paw-pad-fit/paw-pads-fitted.blend'))
s=bpy.context.scene;s.frame_set(1)
body=bpy.data.objects['Seated_Haunch_With_V13_Toes'];rig=bpy.data.objects['ToeControls'];arm=rig.data
rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones['StationaryHaunch'];root.name='Pelvis';root.head=(0,.02,.28);root.tail=(0,.02,.48)
chains={}
for side in [-1,1]:
 pts=[Vector((side*.205,.02,.28)),Vector((side*.205,-.18,.21)),Vector((side*.205,.045,.065)),Vector((side*.205,-.30,.050))];chains[side]=pts
 parent=root
 for name,a,b in zip(['Thigh','Shin','Ankle'],pts,pts[1:]):
  bone=arm.edit_bones.new(f'{name}_{side}');bone.head=a;bone.tail=b;bone.parent=parent;parent=bone
 foot=arm.edit_bones.new(f'Foot_{side}');foot.head=pts[3];foot.tail=(side*.205,-.40,.05);foot.parent=parent
 for i in range(2,6):arm.edit_bones[f'Toe_{side}_{i}'].parent=foot
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def distance(p,a,b):
 t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));return (p-a.lerp(b,t)).length
body.vertex_groups.clear();groups={b.name:body.vertex_groups.new(name=b.name) for b in arm.bones}
for v in body.data.vertices:
 p=v.co;side=1 if p.x>=0 else -1;hip,knee,hock,foot=chains[side]
 # Sole/toe region retains a rigid planted contact. Heel rolls up about the ball.
 footw=1-smooth(-.32,-.25,p.y)
 legmask=smooth(.065,.17,abs(p.x))*(1-smooth(.24,.37,p.z))
 anklew=(1-smooth(.075,.15,p.z))*legmask
 ds=[distance(p,hip,knee),distance(p,knee,hock)]
 sh=math.exp(-((ds[1]-min(ds))/.08)**2);th=math.exp(-((ds[0]-min(ds))/.08)**2)
 weights={'Pelvis':(1-legmask)*(1-footw),f'Thigh_{side}':legmask*(1-anklew)*(1-footw)*th/(th+sh),f'Shin_{side}':legmask*(1-anklew)*(1-footw)*sh/(th+sh),f'Ankle_{side}':anklew*(1-footw),f'Foot_{side}':footw}
 toe=(1-smooth(-.382,-.312,p.y))*(1-smooth(.12,.17,p.z))
 weights={n:w*(1-toe) for n,w in weights.items()}
 centers=[-.042,-.014,.015,.043];tw=[math.exp(-((p.x-side*(.205+u))/.023)**2) for u in centers]
 for i,w in enumerate(tw):weights[f'Toe_{side}_{i+2}']=toe*w/max(sum(tw),1e-20)
 total=sum(weights.values())
 for n,w in weights.items():
  if w>1e-10:groups[n].add([v.index],w/total,'REPLACE')
# Diffuse ownership over connected surface; preserve the toe/contact region exactly.
nv=len(body.data.vertices);ng=len(body.vertex_groups)
weights=np.zeros((nv,ng),dtype=np.float64)
for v in body.data.vertices:
 for g in v.groups:weights[v.index,g.group]=g.weight
edges=np.array([e.vertices[:] for e in body.data.edges]);aa=np.concatenate([edges[:,0],edges[:,1]]);bb=np.concatenate([edges[:,1],edges[:,0]])
degree=np.bincount(aa,minlength=nv);mask=np.array([smooth(-.32,-.26,v.co.y)*.7 for v in body.data.vertices])
for iteration in range(48):
 avg=np.stack([np.bincount(aa,weights=weights[bb,j],minlength=nv)/np.maximum(degree,1) for j in range(ng)],axis=1)
 weights=weights*(1-mask[:,None])+avg*mask[:,None]
weights/=weights.sum(axis=1)[:,None]
for g in body.vertex_groups:g.remove(list(range(nv)))
for v,row in zip(body.data.vertices,weights):
 for j,w in enumerate(row):
  if w>1e-8:body.vertex_groups[j].add([v.index],float(w),'REPLACE')
# Transfer matching skin weights to pads. Their fit2 locations are preserved.
kd=KDTree(len(body.data.vertices))
for v in body.data.vertices:kd.insert(v.co,v.index)
kd.balance();pads=[o for o in s.objects if o.name.startswith(('DigitalPad_','MetatarsalPad_'))]
for o in pads:
 o.vertex_groups.clear();gs={g.index:o.vertex_groups.new(name=g.name) for g in body.vertex_groups}
 for v in o.data.vertices:
  near=kd.find_n(v.co,3);total=sum(1/max(d,1e-6)**2 for _,i,d in near);row={}
  for _,i,d in near:
   for g in body.data.vertices[i].groups:row[g.group]=row.get(g.group,0)+g.weight/max(d,1e-6)**2/total
  for g,w in row.items():gs[g].add([v.index],w,'REPLACE')
def setbone(name,a,b):
 rest=arm.bones[name];q=(rest.tail_local-rest.head_local).rotation_difference(b-a)
 rig.pose.bones[name].matrix=Matrix.Translation(a)@q.to_matrix().to_4x4()@Matrix.Translation(-rest.head_local)@rest.matrix_local
 bpy.context.view_layer.update()
def pose(t):
 setbone('Pelvis',Vector((0,.02-.025*t,.28+.34*t)),Vector((0,.02-.025*t,.48+.34*t)))
 for side,pts in chains.items():
  hip0,knee0,hock0,foot=pts
  theta=math.radians(48)*t;delta=hock0-foot
  hock=foot+Vector((0,delta.y*math.cos(theta)-delta.z*math.sin(theta),delta.y*math.sin(theta)+delta.z*math.cos(theta)))
  hip=hip0+Vector((0,-.025*t,.34*t));axis=hock-hip;d=axis.length;axis.normalize()
  l1=(knee0-hip0).length;l2=(hock0-knee0).length
  a=(l1*l1-l2*l2+d*d)/(2*d);height=math.sqrt(max(0,l1*l1-a*a));perp=Vector((0,axis.z,-axis.y))
  if perp.y>0:perp=-perp
  knee=hip+axis*a+perp*height
  for name,p,q in [('Thigh',hip,knee),('Shin',knee,hock),('Ankle',hock,foot),('Foot',foot,foot+Vector((0,-.10,0)))]:setbone(f'{name}_{side}',p,q)
  for i in range(2,6):rig.pose.bones[f'Toe_{side}_{i}'].matrix_basis=Matrix.Identity(4)
def amount(frame):
 if frame<=16:return 0
 if frame<=61:return smooth(16,61,frame)
 if frame<=81:return 1
 if frame<=126:return 1-smooth(81,126,frame)
 return 0
for f in range(1,142):
 pose(amount(f))
 for b in rig.pose.bones:
  b.rotation_mode='QUATERNION'
  for prop in ['location','rotation_quaternion','scale']:b.keyframe_insert(prop,frame=f)
rig.animation_data.action.name='Sit_Stand_Sit'
s.frame_start=1;s.frame_end=141;s.render.fps=30;s.frame_set(1)
audit={'scope':'hindquarter rig only, not the full V13 cat','bones':len(arm.bones),'frames':141,'samples':[]}
contact=[v.index for v in body.data.vertices if v.co.y<-.335 and v.co.z<.025]
initial=None
for f in [1,31,46,61,81,103,126,141]:
 s.frame_set(f);ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();coords=[v.co.copy() for v in mesh.vertices]
 if initial is None:initial=coords
 audit['samples'].append({'frame':f,'min_z':min(p.z for p in coords),'contact_drift':max((coords[i]-initial[i]).length for i in contact),'rest_error':max((p-q).length for p,q in zip(coords,initial)) if f in [126,141] else None})
 ev.to_mesh_clear()
cam=s.camera;cam.data.ortho_scale=1.25;s.cycles.samples=16;s.render.resolution_x=640;s.render.resolution_y=640
for view,loc in [('side',(2,0,.55)),('back',(0,2,.55)),('quarter',(1.5,-2,.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.04,.48))-cam.location).to_track_quat('-Z','Y').to_euler()
 for name,f in [('sit',1),('half',39),('stand',61)]:
  s.frame_set(f);s.render.filepath=str(OUT/f'{view}-{name}.png');bpy.ops.render.render(write_still=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paw-stand-rig.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [body,rig]+pads:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'paw-stand-rig.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS')
(OUT/'audit.json').write_text(json.dumps(audit,indent=2));print('PAW_STAND_COMPLETE')
