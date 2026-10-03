"""Paw pads and small toe-splay study, separate from the V13 avatar."""
import bpy,math,json,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references')
OUT=ROOT/'paw-pad-rig';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'seated-haunch-toes-anatomy/seated-haunch-v13-toes-anatomy.blend'))
body=bpy.data.objects['Seated_Haunch_With_V13_Toes'];body.vertex_groups.clear()
s=bpy.context.scene
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
arm=bpy.data.armatures.new('ToeControls');rig=bpy.data.objects.new('ToeControls',arm);s.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones.new('StationaryHaunch');root.head=(0,0,.2);root.tail=(0,0,.4)
centers=[-.042,-.014,.015,.043];advances=[.013,-.008,-.002,.017];toes=[]
for side in [-1,1]:
 for i,(u,advance) in enumerate(zip(centers,advances)):
  name=f'Toe_{side}_{i+2}';x=side*(.205+u);y=-.365+advance
  b=arm.edit_bones.new(name);b.head=(x,-.318,.055);b.tail=(x,y-.025,.055);b.parent=root
  toes.append((name,side,i,x,y))
bpy.ops.object.mode_set(mode='OBJECT')
groups={b.name:body.vertex_groups.new(name=b.name) for b in arm.bones}
for v in body.data.vertices:
 p=v.co;amount=(1-smooth(-.382,-.312,p.y))*(1-smooth(.12,.17,p.z))
 if amount>0:
  side=1 if p.x>0 else -1
  ws={name:math.exp(-((p.x-x)/.023)**2) for name,sg,i,x,y in toes if sg==side};total=sum(ws.values())
  if total>1e-12:
   for name,w in ws.items():groups[name].add([v.index],amount*w/total,'REPLACE')
  else:amount=0
 groups['StationaryHaunch'].add([v.index],1-amount,'REPLACE')
mod=body.modifiers.new('Toe splay linear skin','ARMATURE');mod.object=rig
padmat=bpy.data.materials.new('Muted paw pads');padmat.diffuse_color=(.36,.19,.18,1);padmat.use_nodes=True
bs=padmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.36,.19,.18,1);bs.inputs['Roughness'].default_value=.78
pads=[]
def bottom(x,y):
 bpy.context.view_layer.update()
 hit,point,normal,index=body.ray_cast(Vector((x,y,-1)),Vector((0,0,1)))
 if not hit:raise RuntimeError(f'No paw surface under pad {x,y}')
 return point.z
def pad(name,x,y,rx,ry,bone):
 z=bottom(x,y)+.0025
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=(x,y,z));o=bpy.context.object;o.name=name;o.scale=(rx,ry,.008)
 bpy.ops.object.transform_apply(location=True,rotation=False,scale=True);o.data.materials.append(padmat)
 for p in o.data.polygons:p.use_smooth=True
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');m=o.modifiers.new('Follow toe','ARMATURE');m.object=rig;pads.append(o)
for name,side,i,x,y in toes:pad('DigitalPad_'+name,x,y,.0135,.0195,name)
# Central plantar pad: soft broad shape with three posterior lobes.
for side in [-1,1]:
 x=side*.205;y=-.320
 pad('MetatarsalPad_'+str(side),x,y,.047,.034,'StationaryHaunch')
 central=pads[-1]
 for v in central.data.vertices:
  u=(v.co.x-x)/.047;front=(v.co.y-y)/.034
  if front>.25:
   lobes=.004*(.5+.5*math.cos(u*math.pi*2))
   v.co.y+=lobes*smooth(.25,.9,front)
for frame,amount in [(1,0),(16,1),(31,0),(46,0)]:
 for name,side,i,x,y in toes:
  b=rig.pose.bones[name];b.rotation_mode='XYZ';b.rotation_euler.z=side*math.radians([-4,-1,1.5,4][i])*amount;b.keyframe_insert('rotation_euler',frame=frame)
s.frame_start=1;s.frame_end=46;s.render.fps=30;s.frame_set(1)
cam=s.camera;s.cycles.samples=24
for name,loc,frame in [('top-rest',(1,-2,.55),1),('top-spread',(1,-2,.55),16),('sole-rest',(0,-.30,-2),1),('sole-spread',(0,-.30,-2),16),('side',(2,0,.45),1)]:
 s.frame_set(frame);s.objects['Ground'].hide_render=name.startswith('sole')
 cam.location=loc;target=Vector((0,-.31,.065)) if name!='side' else Vector((0,-.04,.30));cam.data.ortho_scale=.66 if name!='side' else 1.05
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 if name.startswith('sole'):
  bpy.ops.object.light_add(type='AREA',location=(0,-.35,-1));lamp=bpy.context.object;lamp.data.energy=35;lamp.data.size=1
 s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
 if name.startswith('sole'):bpy.data.objects.remove(lamp,do_unlink=True)
s.objects['Ground'].hide_render=False;s.frame_set(1)
# Numeric checks are structural checks, not a claim of anatomically final motion.
audit={'toe_bones':len(toes),'digital_pads':8,'central_pads':2,'max_splay_degrees':4,'animation_frames':[1,46],'linear_skinning':True,'scope':'small toe splay only; sitting/standing integration pending'}
for f in [1,16,31]:
 s.frame_set(f);deps=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(deps);m=ev.to_mesh();audit[str(f)]={'min_z':min(v.co.z for v in m.vertices),'max_z':max(v.co.z for v in m.vertices)};ev.to_mesh_clear()
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paw-pads-toe-rig.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [body,rig]+pads:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'paw-pads-toe-rig.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS')
(OUT/'audit.json').write_text(json.dumps(audit,indent=2));print('PAW_PAD_RIG_COMPLETE',audit)
