"""Shape the standing shank around its joint chain; preserve the seated basis."""
import bpy,numpy as np,json
from pathlib import Path
from mathutils import Vector
SOURCE=Path('C:/Users/turbo08/mew_voice/assets/avatar/references/paw-stand-rig')
OUT=SOURCE.parent/'paw-stand-junction';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'paw-stand-rig.blend'))
s=bpy.context.scene;body=bpy.data.objects['Seated_Haunch_With_V13_Toes'];rig=bpy.data.objects['ToeControls']
nv=len(body.data.vertices);base=np.array([v.co[:] for v in body.data.vertices]);edges=np.array([e.vertices[:] for e in body.data.edges]);a=np.concatenate([edges[:,0],edges[:,1]]);b=np.concatenate([edges[:,1],edges[:,0]]);degree=np.bincount(a,minlength=nv)
mask=np.clip((base[:,1]+.32)/.10,0,1)*np.clip((.46-base[:,2])/.12,0,1)*.65
body.shape_key_add(name='Basis');keys=[];audit=[]
for name,frame in [('MidRiseSurface',39),('StandingSurface',61)]:
 for key in keys:key.value=0
 s.frame_set(frame);ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();posed=np.array([v.co[:] for v in mesh.vertices]);ev.to_mesh_clear();target=posed.copy()
 for step in range(160):
  avg=np.stack([np.bincount(a,weights=target[b,j],minlength=nv)/degree for j in range(3)],axis=1)
  target+=mask[:,None]*(avg-target)
 # Pose-specific radial shaping around the shin and ankle axes.
 strength=.52 if frame==39 else 1.0
 for side in [-1,1]:
  own=(base[:,0]*side>0).astype(float)
  boneweights={}
  for kind in ['Shin','Ankle','Thigh']:
   group=body.vertex_groups[f'{kind}_{side}'].index
   boneweights[kind]=np.array([next((g.weight for g in v.groups if g.group==group),0) for v in body.data.vertices])
  influence=(boneweights['Shin']+boneweights['Ankle'])
  influence=np.clip(influence*1.8,0,1)*own*np.clip((base[:,1]+.31)/.10,0,1)
  centers=[];distances=[]
  for kind in ['Shin','Ankle']:
   bone=rig.pose.bones[f'{kind}_{side}'];head=np.array(bone.head);tail=np.array(bone.tail);axis=tail-head
   t=np.clip(((target-head)@axis)/np.dot(axis,axis),0,1)
   center=head+t[:,None]*axis;centers.append(center);distances.append(np.linalg.norm(target-center,axis=1))
  blend=1/(1+np.exp(np.clip((distances[0]-distances[1])/.025,-50,50)))
  center=centers[0]*blend[:,None]+centers[1]*(1-blend[:,None])
  radial=target-center
  target-=radial*(influence*strength*.36)[:,None]
 # Relax the new profile without moving planted toes or the upper torso.
 for step in range(60):
  avg=np.stack([np.bincount(a,weights=target[b,j],minlength=nv)/degree for j in range(3)],axis=1)
  target+=mask[:,None]*.5*(avg-target)
 # Broad localized fairing of the rear thigh/shank transition.
 rear=np.clip((base[:,1]+.09)/.17,0,1)
 band=np.exp(-((base[:,2]-.205)/.18)**4)
 sideband=np.clip((np.abs(base[:,0])-.07)/.09,0,1)
 junction=rear*band*sideband*.78
 before=target.copy()
 for step in range(550):
  avg=np.stack([np.bincount(a,weights=target[b,j],minlength=nv)/degree for j in range(3)],axis=1)
  target+=junction[:,None]*(avg-target)
 audit.append({'frame':frame,'junction_max_change':float(np.max(np.linalg.norm(target-before,axis=1)))})
 transforms={g.index:np.array(rig.pose.bones[g.name].matrix@rig.data.bones[g.name].matrix_local.inverted()) for g in body.vertex_groups}
 blended=np.zeros((nv,4,4))
 for v in body.data.vertices:
  for g in v.groups:blended[v.index]+=g.weight*transforms[g.group]
 delta=np.linalg.solve(blended[:,:3,:3],(target-posed)[...,None]).squeeze(-1)
 key=body.shape_key_add(name=name);coords=(base+delta).astype(np.float32);key.data.foreach_set('co',coords.ravel());keys.append(key)
 audit.append({'name':name,'max_rest_delta':float(np.max(np.linalg.norm(delta,axis=1)))})
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for f in range(1,142):
 t=0 if f<=16 else smooth(16,61,f) if f<=61 else 1 if f<=81 else 1-smooth(81,126,f) if f<=126 else 0
 mid=smooth(16,61,39)
 keys[0].value=t/mid if t<=mid else (1-t)/(1-mid);keys[1].value=max(0,(t-mid)/(1-mid))
 for key in keys:key.keyframe_insert('value',frame=f)
body.data.shape_keys.animation_data.action.name='Sit_Stand_Surface_Corrections'
cam=s.camera
for view,loc in [('side',(2,0,.55)),('back',(0,2,.55)),('quarter',(1.5,-2,.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.04,.48))-cam.location).to_track_quat('-Z','Y').to_euler()
 for name,f in [('sit',1),('half',39),('stand',61)]:
  s.frame_set(f);s.render.filepath=str(OUT/f'{view}-{name}.png');bpy.ops.render.render(write_still=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paw-stand-finished.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o==body or o==rig or o.name.startswith(('DigitalPad_','MetatarsalPad_')):o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'paw-stand-finished.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_morph=True)
(OUT/'corrections.json').write_text(json.dumps(audit,indent=2));print('STAND_JUNCTION_COMPLETE')
