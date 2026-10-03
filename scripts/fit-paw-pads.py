"""Conform pad depth and match pad skinning to the surrounding paw surface."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references');OUT=ROOT/'paw-pad-fit';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'paw-pad-rig/paw-pads-toe-rig.blend'))
s=bpy.context.scene;s.frame_set(1);body=bpy.data.objects['Seated_Haunch_With_V13_Toes'];rig=bpy.data.objects['ToeControls']
points=[v.co.copy() for v in body.data.vertices];faces=[tuple(p.vertices) for p in body.data.polygons];tree=BVHTree.FromPolygons(points,faces)
kd=KDTree(len(points))
for i,p in enumerate(points):kd.insert(p,i)
kd.balance();pads=[o for o in s.objects if o.name.startswith(('DigitalPad_','MetatarsalPad_'))]
stats=[]
for o in pads:
 original=[v.co.copy() for v in o.data.vertices];lo=min(p.z for p in original);hi=max(p.z for p in original);cz=(lo+hi)/2;rz=(hi-lo)/2
 cx=sum(p.x for p in original)/len(original);cy=sum(p.y for p in original)/len(original)
 for p in original:p.x=cx+(p.x-cx)*.78;p.y=cy+(p.y-cy)*.78+.005
 o.vertex_groups.clear();groups={g.index:o.vertex_groups.new(name=g.name) for g in body.vertex_groups}
 for v,p in zip(o.data.vertices,original):
  surface,normal,idx,dist=tree.ray_cast(Vector((p.x,p.y,-1)),Vector((0,0,1)))
  if surface is None:raise RuntimeError('Pad outside paw footprint: '+o.name)
  v.co.x=p.x;v.co.y=p.y;h=(p.z-cz)/rz
  # Only a shallow convex underside projects below the skin; upper half is embedded.
  v.co.z=surface.z+.0015+h*.0035
  nearest=kd.find_n(surface,3);mix=[1/max(d,1e-6)**2 for _,i,d in nearest];den=sum(mix);weights={}
  for (_,i,d),w in zip(nearest,mix):
   for g in body.data.vertices[i].groups:weights[g.group]=weights.get(g.group,0)+g.weight*w/den
  total=sum(weights.values())
  for group,w in weights.items():groups[group].add([v.index],w/total,'REPLACE')
 stats.append({'pad':o.name,'vertices':len(original),'max_visible_depth':.002,'max_embedded_depth':.005})
for f in [1,8,16,23,31,46]:
 s.frame_set(f);bpy.context.view_layer.update()
 for b in rig.pose.bones:
  assert all(abs(x-1)<1e-5 for x in b.scale)
 s.frame_set(f)
audit={'pads':stats,'checked_frames':[1,8,16,23,31,46],'weight_assignment':'inverse-distance interpolation of three nearest paw surface vertices','limitations':'Separate pad shells, no pressure simulation. Sit/stand integration not implemented.'}
s.frame_set(1);cam=s.camera
for name,loc,frame in [('top-rest',(1,-2,.55),1),('top-spread',(1,-2,.55),16),('sole-rest',(0,-.30,-2),1),('sole-spread',(0,-.30,-2),16),('side',(2,0,.45),1)]:
 s.frame_set(frame);s.objects['Ground'].hide_render=name.startswith('sole');cam.location=loc
 target=Vector((0,-.31,.065)) if name!='side' else Vector((0,-.04,.30));cam.data.ortho_scale=.66 if name!='side' else 1.05;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 if name.startswith('sole'):
  bpy.ops.object.light_add(type='AREA',location=(0,-.35,-1));lamp=bpy.context.object;lamp.data.energy=35;lamp.data.size=1
 s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
 if name.startswith('sole'):bpy.data.objects.remove(lamp,do_unlink=True)
s.objects['Ground'].hide_render=False;s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paw-pads-fitted.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [body,rig]+pads:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'paw-pads-fitted.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS')
(OUT/'audit.json').write_text(json.dumps(audit,indent=2));print('PAD_FIT_COMPLETE')
