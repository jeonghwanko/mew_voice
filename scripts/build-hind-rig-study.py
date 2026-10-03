"""Independent clay deformation study; never edits the V13 assets."""
import bpy, math, json
from mathutils import Vector, Matrix
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references/hind-rig-study');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def knee(hip,hock):
 d=hock-hip; distance=d.length; a=(.34**2-.36**2+distance**2)/(2*distance)
 axis=d.normalized(); perpendicular=Vector((0,axis.z,-axis.y))
 if perpendicular.y>0:perpendicular=-perpendicular
 return hip+axis*a+perpendicular*math.sqrt(max(0,.34**2-a*a))
chains={}
for side in [-1,1]:
 hip=Vector((side*.19,.10,.70));hock=Vector((side*.19,.15,.075))
 chains[side]=[hip,knee(hip,hock),hock,Vector((side*.19,-.14,.075))]
parts=[]
def ellipsoid(center,scale):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=center)
 o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);parts.append(o)
ellipsoid((0,.12,.77),(.27,.24,.25))
for side,pts in chains.items():
 for seg,(a,b) in enumerate(zip(pts,pts[1:])):
  for i in range(11):
   t=i/10;p=a.lerp(b,t)
   radius=(.14*(1-t)+.095*t) if seg==0 else (.092*(1-t)+.055*t)
   if seg==2:ellipsoid(p,(.082,.07,.057))
   else:ellipsoid(p,(radius,radius,radius))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Continuous_Hindquarter_Clay'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
remesh=body.modifiers.new('Unified volume','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.016;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=body.modifiers.new('Surface relaxation','SMOOTH');smooth.factor=.65;smooth.iterations=5;bpy.ops.object.modifier_apply(modifier=smooth.name)
arm=bpy.data.armatures.new('HindquarterRig');rig=bpy.data.objects.new('HindquarterRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);body.select_set(False)
bpy.ops.object.mode_set(mode='EDIT');root=arm.edit_bones.new('Pelvis');root.head=(0,.1,.7);root.tail=(0,.1,.9)
for side,pts in chains.items():
 parent=root
 for i,(a,b) in enumerate(zip(pts,pts[1:])):
  bone=arm.edit_bones.new(f'{side}_{i}');bone.head=a;bone.tail=b;bone.parent=parent;parent=bone
bpy.ops.object.mode_set(mode='OBJECT')
groups={b.name:body.vertex_groups.new(name=b.name) for b in arm.bones}
def distance(p,a,b):
 t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));return (p-a.lerp(b,t)).length
for v in body.data.vertices:
 p=v.co;side=1 if p.x>=0 else -1;pts=chains[side]
 if p.z>.66: weights={'Pelvis':1}
 else:
  ds={f'{side}_{i}':distance(p,a,b) for i,(a,b) in enumerate(zip(pts,pts[1:]))}
  ds['Pelvis']=distance(p,Vector((0,.1,.7)),Vector((0,.1,.9)))
  nearest=min(ds.values());weights={n:math.exp(-((d-nearest)/.055)**2) for n,d in ds.items()}
  if p.z<.12:weights={f'{side}_2':1}
 total=sum(weights.values())
 for n,w in weights.items():
  if w/total>.001:groups[n].add([v.index],w/total,'REPLACE')
# Smooth abrupt ownership changes across the connected surface, not posed points.
adj=[set() for _ in body.data.vertices]
for e in body.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
weights=[{g.group:g.weight for g in v.groups} for v in body.data.vertices]
for _ in range(12):
 new=[]
 for i,neighbors in enumerate(adj):
  row={g:w*.5 for g,w in weights[i].items()}
  for j in neighbors:
   for g,w in weights[j].items():row[g]=row.get(g,0)+.5*w/len(neighbors)
  new.append(row)
 weights=new
for v,row in zip(body.data.vertices,weights):
 for group in body.vertex_groups:group.remove([v.index])
 total=sum(row.values())
 for g,w in row.items():body.vertex_groups[g].add([v.index],w/total,'REPLACE')
mod=body.modifiers.new('Skin deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
sub=body.modifiers.new('Surface finish','SUBSURF');sub.levels=1
mat=bpy.data.materials.new('Clay');mat.diffuse_color=(.49,.57,.60,1);body.data.materials.append(mat)
for p in body.data.polygons:p.use_smooth=True
def pose(amount):
 root=rig.pose.bones['Pelvis'];root.matrix=Matrix.Translation((0,0,-.40*amount))@arm.bones['Pelvis'].matrix_local;bpy.context.view_layer.update()
 for side,pts in chains.items():
  hip=pts[0]+Vector((0,0,-.40*amount));hock=pts[2];posed=[hip,knee(hip,hock),hock,pts[3]]
  for i,(a,b) in enumerate(zip(posed,posed[1:])):
   rest=arm.bones[f'{side}_{i}'];direction=rest.tail_local-rest.head_local;q=direction.rotation_difference(b-a)
   rig.pose.bones[rest.name].matrix=Matrix.Translation(a)@q.to_matrix().to_4x4()@Matrix.Translation(-rest.head_local)@rest.matrix_local;bpy.context.view_layer.update()
for frame in range(1,122):
 t=(frame-1)/120;a=(1+math.cos(t*math.tau))/2;pose(a)
 for bone in rig.pose.bones:
  bone.rotation_mode='QUATERNION';bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
s=bpy.context.scene;s.frame_start=1;s.frame_end=121;s.render.fps=30;s.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Floor';floor.location.z=.01
s.world=bpy.data.worlds.new('Studio');s.world.color=(.35,.35,.35)
for loc,power,size in [((2,-3,4),450,4),((-2,1,2),250,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size
bpy.ops.object.camera_add(location=(2,-2,1.2));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.3
s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=640;s.render.resolution_y=640;s.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hind-rig-study.blend'))
for view,loc in [('side',(2,0,.6)),('back',(0,2,.6)),('quarter',(1.5,-2,.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.48))-cam.location).to_track_quat('-Z','Y').to_euler()
 for name,frame in [('sit',1),('half',31),('stand',61)]:
  s.frame_set(frame);s.render.filepath=str(OUT/f'{view}-{name}.png');bpy.ops.render.render(write_still=True)
print('HIND_STUDY_COMPLETE')
