"""Seated sculpt target only. Separate from V13 and the animation rig study."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references/seated-haunch-target');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
parts=[]
# Designed transverse quad rings: broad haunches, tucked pelvis and rising back.
rings=[(.020,.105,.035,.045),(.038,.085,.18,.16),(.080,.055,.285,.25),(.160,.035,.32,.28),(.260,.020,.305,.275),(.370,-.015,.245,.245),(.480,-.065,.19,.195),(.570,-.095,.145,.15),(.640,-.10,.075,.085),(.665,-.10,.008,.012)]
verts=[];faces=[];N=64
for z,cy,rx,ry in rings:
 for j in range(N):
  a=math.tau*j/N;x=rx*math.cos(a);y=cy+ry*math.sin(a)
  verts.append((x,y,z))
for k in range(len(rings)-1):
 for j in range(N):a=k*N+j;b=k*N+(j+1)%N;faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+j for j in range(N))])
mesh=bpy.data.meshes.new('Designed transverse rings');mesh.from_pydata(verts,[],faces);mesh.update();torso=bpy.data.objects.new('Pelvis_sculpt',mesh);bpy.context.collection.objects.link(torso);parts.append(torso)
bpy.context.view_layer.objects.active=torso;torso.select_set(True)
sub=torso.modifiers.new('Smooth designed ring profile','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
def volume(name,loc,scale,rotation=0):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler.x=rotation;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);parts.append(o)
for side in [-1,1]:
 # Thigh volume wraps the folded shank; no exposed loop of bent shin.
 volume('Wrapped_thigh',(side*.185,-.010,.205),(.165,.255,.190),-.18)
 # Heel stays under the rump; toes extend visibly forward of the haunch.
 volume('Heel_to_toes',(side*.205,-.12,.052),(.092,.265,.050))
 volume('Toe_box',(side*.205,-.325,.051),(.105,.100,.048))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=torso;bpy.ops.object.join();body=bpy.context.object;body.name='Seated_Haunch_Sculpt_Target'
rem=body.modifiers.new('Sculpt volume union','REMESH');rem.mode='VOXEL';rem.voxel_size=.009;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
sm=body.modifiers.new('Sculpt relaxation','SMOOTH');sm.factor=.6;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
# A shallow contact patch, not a foot-tip-only height constraint.
for v in body.data.vertices:
 if v.co.z<.022:v.co.z=.012+(v.co.z-.012)*.18
mat=bpy.data.materials.new('Neutral clay');mat.diffuse_color=(.48,.56,.57,1);body.data.materials.append(mat)
for p in body.data.polygons:p.use_smooth=True
edgeuses={}
for p in body.data.polygons:
 for key in p.edge_keys:edgeuses[key]=edgeuses.get(key,0)+1
audit={'vertices':len(body.data.vertices),'faces':len(body.data.polygons),'nonmanifold_edge_count':sum(v!=2 for v in edgeuses.values()),'scope':'static seated sculpt target; no animation or final retopology','v13_modified':False}
(OUT/'audit.json').write_text(json.dumps(audit,indent=2))
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.name='Ground';bpy.context.object.location.z=.010
s=bpy.context.scene;s.world=bpy.data.worlds.new('Studio');s.world.color=(.35,.35,.35)
for loc,power,size in [((2,-3,4),450,4),((-2,1,2),250,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=size
bpy.ops.object.camera_add(location=(2,0,.5));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.05
s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=720;s.render.resolution_y=720;s.render.resolution_percentage=100
for name,loc in [('side',(2,0,.45)),('back',(0,2,.45)),('quarter',(1.5,-2,.8)),('low-quarter',(1.5,-2,.20))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.04,.30))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'seated-haunch-target.blend'))
print('SEATED_TARGET_COMPLETE',audit)
