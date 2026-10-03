import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar');OUT=ROOT/'references/fullbody-fit';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'realistic/rework/bicolor-v13-motion-study.blend'))
s=bpy.context.scene;s.frame_set(1);deps=bpy.context.evaluated_depsgraph_get();snapshots=[]
for name in ['mesh_0.001','mesh_0','Object_32']:
 o=bpy.data.objects[name];ev=o.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps);mesh.transform(o.matrix_world);bm=bmesh.new();bm.from_mesh(mesh)
 if name!='Object_32':
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,.035,0),plane_no=(0,1,0),dist=1e-6,clear_outer=True)
 bm.to_mesh(mesh);bm.free()
 snapshots.append((name,mesh.copy()))
# Mesh datablocks are held across scene replacement via explicit persistent copies.
for name,mesh in snapshots:mesh.use_fake_user=True
# Append rigged haunch scene objects to the existing file, then remove unrelated scene objects.
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
with bpy.data.libraries.load(str(ROOT/'references/paw-stand-weights-finished/paw-stand-finished.blend'),link=False) as (src,dst):
 dst.objects=[n for n in src.objects if n in ['Seated_Haunch_With_V13_Toes','ToeControls'] or n.startswith(('DigitalPad_','MetatarsalPad_'))]
parts=[]
for o in dst.objects:
 s.collection.objects.link(o);parts.append(o)
rig=next(o for o in parts if o.type=='ARMATURE');rig.animation_data_clear()
# Freeze the seated assembly for alignment; do not imply full-body animation.
s.frame_set(1)
for o in parts:
 if o.type=='MESH' and o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for key in o.data.shape_keys.key_blocks:key.value=0
bpy.context.view_layer.update()
clay=bpy.data.materials.new('Assembly clay');clay.diffuse_color=(.48,.56,.57,1);clay.use_nodes=True;bs=clay.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.48,.56,.57,1);bs.inputs['Roughness'].default_value=.85
# Snapshot lower skin to avoid mixing scales in a live skeleton before attachment design.
transform=Matrix.Translation((0,.055,.0))@Matrix.Diagonal((.20,.26,.36,1))
assembled=[]
for o in parts:
 if o.type!='MESH':continue
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=bpy.data.meshes.new_from_object(ev)
 for v in mesh.vertices:
  t=max(0,min(1,(v.co.z-.28)/.37));v.co.y-=.22*t*t*(3-2*t)
 mesh.transform(transform@o.matrix_world);obj=bpy.data.objects.new('New_'+o.name,mesh);s.collection.objects.link(obj);assembled.append(obj)
 if o.name=='Seated_Haunch_With_V13_Toes':mesh.materials.clear();mesh.materials.append(clay)
for o in parts:bpy.data.objects.remove(o,do_unlink=True)
for name,mesh in snapshots:
 obj=bpy.data.objects.new('V13_Upper_'+name,mesh);s.collection.objects.link(obj);assembled.append(obj)
 if name=='mesh_0.001':mesh.materials.clear();mesh.materials.append(clay)
# Display only: surfaces intentionally not welded yet.
s.world=bpy.data.worlds.new('Fit studio');s.world.color=(.35,.35,.35)
bpy.ops.mesh.primitive_plane_add(size=200);ground=bpy.context.object;ground.name='Ground';ground.location.z=-.002
for loc,power,size in [((1,-2,3),300,3),((-2,1,2),180,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=size
bpy.ops.object.camera_add(location=(1,-1,.6));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.60
s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100
for name,loc in [('side',(1,0,.25)),('front',(0,-1,.24)),('back',(0,1,.24)),('quarter',(.7,-1,.5))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.01,.19))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fullbody-fit.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in assembled:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'fullbody-fit.glb'),export_format='GLB',use_selection=True,export_animations=False)
(OUT/'audit.json').write_text(json.dumps({'scope':'static assembly alignment, not welded or full-body rigged','source_upper':'V13 motion study frame 1 evaluated surface','cut_y':.035,'lower_scale':[.2,.26,.36],'lower_translation':[0,.055,0],'parts':len(assembled),'tail_included':False},indent=2))
print('FULLBODY_FIT_COMPLETE')
