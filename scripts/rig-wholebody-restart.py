import bpy,bmesh,math,json,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/rebuild-v2');SOURCE=OUT.parent/'realistic/rework/bicolor-a-v13.blend'
def compact(p):
 p=p.copy();p.y=p.y+.06 if p.y<-.16 else -.10+(p.y+.16)*.8 if p.y<.14 else p.y;return p
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));s=bpy.context.scene;s.frame_set(1);deps=bpy.context.evaluated_depsgraph_get();eye_data=[];sourcebody=None
for name in ['mesh_0.001','mesh_0','Object_32']:
 src=bpy.data.objects[name];m=bpy.data.meshes.new_from_object(src.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps);m.transform(src.matrix_world)
 for v in m.vertices:v.co=compact(v.co)
 m.use_fake_user=True
 if name=='mesh_0.001':sourcebody=m
 else:eye_data.append((name,m))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
with bpy.data.libraries.load(str(OUT/'wholebody-clean-topology.blend')) as (src,dst):dst.objects=['WholeBody']
body=dst.objects[0];s.collection.objects.link(body)
# Transfer surface UV/color to the continuous retopologized body.
sourcebody.calc_loop_triangles();tris=list(sourcebody.loop_triangles);vs=[v.co.copy() for v in sourcebody.vertices];tree=BVHTree.FromPolygons(vs,[t.vertices[:] for t in tris],all_triangles=True)
for mat in sourcebody.materials:body.data.materials.append(mat)
uvsrc=sourcebody.uv_layers.active;uv=body.data.uv_layers.new(name='TransferredCoatUV')
colsrc=sourcebody.color_attributes.get('CoatTint');col=body.data.color_attributes.new(name='CoatTint',type='FLOAT_COLOR',domain='CORNER');body.data.color_attributes.active_color=col
for p in body.data.polygons:
 for li in p.loop_indices:
  v=body.data.vertices[body.data.loops[li].vertex_index];hit,normal,ti,dist=tree.find_nearest(v.co);tr=tris[ti];points=[vs[i] for i in tr.vertices]
  us=[Vector((*uvsrc.data[i].uv,0)) for i in tr.loops];uv.data[li].uv=barycentric_transform(hit,*points,*us).xy
  if colsrc:
   cs=[colsrc.data[i if colsrc.domain=='CORNER' else sourcebody.loops[i].vertex_index].color for i in tr.loops]
   c=barycentric_transform(hit,*points,*[Vector(c[:3]) for c in cs]);col.data[li].color=(*c,1)
  else:col.data[li].color=(1,1,1,1)
 for mat in body.data.materials:
  if mat.use_nodes:
   for node in mat.node_tree.nodes:
    if node.type=='BSDF_PRINCIPLED':node.inputs['Roughness'].default_value=.85
arm=bpy.data.armatures.new('WholeCatRig');rig=bpy.data.objects.new('WholeCatRig',arm);s.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);body.select_set(False);bpy.ops.object.mode_set(mode='EDIT')
segments={};parents={}
def bone(n,a,b,parent=None):
 e=arm.edit_bones.new(n);e.head=a;e.tail=b
 if parent:e.parent=arm.edit_bones[parent]
 segments[n]=(Vector(a),Vector(b));parents[n]=parent
bone('Pelvis',(0,.12,.22),(0,.12,.28));bone('Spine',(0,.12,.24),(0,-.09,.225),'Pelvis');bone('Neck',(0,-.09,.225),(0,-.17,.305),'Spine');bone('Head',(0,-.17,.305),(0,-.21,.32),'Neck')
chains={}
for side in [-1,1]:
 x=side*.033
 hp=[Vector((x,.125,.217)),Vector((x,.11,.158)),Vector((x,.176,.076)),Vector((x,.15,.016))];fp=[Vector((x,-.095,.214)),Vector((x,-.076,.155)),Vector((x,-.076,.049)),Vector((x,-.095,.014))];chains[side]=(hp,fp)
 for prefix,pts,parent in [('Hind',hp,'Pelvis'),('Fore',fp,'Spine')]:
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):
   n=f'{prefix}{kind}_{side}';bone(n,a,b,parent);parent=n
  bone(f'{prefix}Paw_{side}',pts[3],pts[3]+Vector((0,-.025,0)),parent)
# Tail chain is part of the same skin; follow the pelvis when sitting.
for i,(a,b) in enumerate(zip([(0,.17,.21),(0,.24,.16),(0,.32,.095)],[(0,.24,.16),(0,.32,.095),(0,.405,.05)])):bone(f'Tail{i}',a,b,'Pelvis' if i==0 else f'Tail{i-1}')
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def distance(p,a,b):
 t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));return (p-a.lerp(b,t)).length
names=list(segments);groups={n:body.vertex_groups.new(name=n) for n in names}
for v in body.data.vertices:
 p=v.co;side=1 if p.x>=0 else -1
 if p.y>.22:weights={f'Tail{i}':math.exp(-distance(p,*segments[f'Tail{i}'])**2/.05**2) for i in range(3)}
 else:
  active=['Pelvis','Spine','Neck','Head']+[f'{prefix}{kind}_{side}' for prefix in ['Fore','Hind'] for kind in ['Upper','Lower','Ankle','Paw']]
  weights={n:math.exp(-distance(p,*segments[n])**2/.038**2) for n in active}
  head=smooth(.23,.28,p.z)*(1-smooth(-.13,-.095,p.y))
  total=sum(weights.values());weights={n:w/max(total,1e-30)*(1-head) for n,w in weights.items()};weights['Head']+=head
  if p.z<.022:
   n=f'ForePaw_{side}' if p.y<0 else f'HindPaw_{side}';paw=1-smooth(.012,.027,p.z);weights={n0:w*(1-paw) for n0,w in weights.items()};weights[n]=weights.get(n,0)+paw
 ranked=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for n,w in ranked)
 for n,w in ranked:groups[n].add([v.index],w/max(total,1e-30),'REPLACE')
mod=body.modifiers.new('Whole-body skin','ARMATURE');mod.object=rig
meshes=[body]
for name,m in eye_data:
 o=bpy.data.objects.new('Original_'+name,m);s.collection.objects.link(o);g=o.vertex_groups.new(name='Head');g.add(list(range(len(m.vertices))),1,'REPLACE');mod=o.modifiers.new('Head motion','ARMATURE');mod.object=rig;meshes.append(o)
def setbone(n,a,b):
 rest=arm.bones[n];q=(rest.tail_local-rest.head_local).rotation_difference(b-a);rig.pose.bones[n].matrix=Matrix.Translation(a)@q.to_matrix().to_4x4()@Matrix.Translation(-rest.head_local)@rest.matrix_local;bpy.context.view_layer.update()
def knee(hip,hock,l1,l2):
 axis=hock-hip;d=axis.length;axis.normalize();a=(l1*l1-l2*l2+d*d)/(2*d);perp=Vector((0,axis.z,-axis.y))
 if perp.y>0:perp=-perp
 return hip+axis*a+perp*math.sqrt(max(0,l1*l1-a*a))
def pose(t):
 setbone('Pelvis',Vector((0,.12-.025*t,.22-.13*t)),Vector((0,.12-.025*t,.28-.13*t)))
 shoulder=Vector((0,-.09+.03*t,.225-.005*t));setbone('Spine',Vector((0,.12-.025*t,.24-.13*t)),shoulder)
 headA=segments['Head'][0]+Vector((0,.035*t,.02*t));headB=segments['Head'][1]+Vector((0,.035*t,.02*t));setbone('Neck',shoulder,headA);setbone('Head',headA,headB)
 for side,(hp,fp) in chains.items():
  hip=hp[0]+Vector((0,-.025*t,-.13*t));pivot=hp[3]+Vector((0,-.07*t,0));delta=hp[2]-hp[3];theta=-math.atan2(delta.z,delta.y)*t;hock=pivot+Vector((0,delta.y*math.cos(theta)-delta.z*math.sin(theta),delta.y*math.sin(theta)+delta.z*math.cos(theta)));k=knee(hip,hock,(hp[1]-hp[0]).length,(hp[2]-hp[1]).length)
  pts=[hip,k,hock,pivot]
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):setbone(f'Hind{kind}_{side}',a,b)
  setbone(f'HindPaw_{side}',pivot,pivot+Vector((0,-.025,0)))
  hip=fp[0]+Vector((0,.03*t,-.007*t));ankle=fp[2];k=knee(hip,ankle,(fp[1]-fp[0]).length,(fp[2]-fp[1]).length);pts=[hip,k,ankle,fp[3]]
  for kind,a,b in zip(['Upper','Lower','Ankle'],pts,pts[1:]):setbone(f'Fore{kind}_{side}',a,b)
  setbone(f'ForePaw_{side}',fp[3],fp[3]+Vector((0,-.025,0)))
 for i in range(3):
  a,b=segments[f'Tail{i}'];d=Vector((0,-.025*t,-.13*t));a=a+d;b=b+d;a.z=max(.015,a.z);b.z=max(.015,b.z);setbone(f'Tail{i}',a,b)
for f,t in [(1,1),(31,.5),(61,0)]:
 pose(t)
 for pb in rig.pose.bones:
  pb.rotation_mode='QUATERNION'
  for prop in ['location','rotation_quaternion','scale']:pb.keyframe_insert(prop,frame=f)
s.frame_start=1;s.frame_end=61;s.render.fps=30
s.world=bpy.data.worlds.new('Whole Body Studio');s.world.color=(.4,.4,.4)
bpy.ops.mesh.primitive_plane_add(size=20);bpy.context.object.name='Floor';bpy.context.object.location.z=-.002
for loc,power in [((1,-2,3),300),((-2,1,2),180)]:bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=3
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.7;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=750;s.render.resolution_y=650;s.render.resolution_percentage=100
for view,loc in [('side',(1,0,.23)),('front',(0,-1,.23)),('back',(0,1,.23))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,.035,.185))-cam.location).to_track_quat('-Z','Y').to_euler()
 for label,f in [('sit',1),('half',31),('stand',61)]:
  s.frame_set(f);s.render.filepath=str(OUT/f'whole-{view}-{label}.png');bpy.ops.render.render(write_still=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wholebody-rig-trial.blend'));print('WHOLEBODY_TRIAL_COMPLETE')
