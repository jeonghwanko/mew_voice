import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/rebuild-v2');SOURCE=OUT.parent/'realistic/rework/bicolor-a-v13.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));s=bpy.context.scene;s.frame_set(1);deps=bpy.context.evaluated_depsgraph_get()
source=bpy.data.objects['mesh_0.001'];mesh=bpy.data.meshes.new_from_object(source.evaluated_get(deps));mesh.transform(source.matrix_world)
# Compact the trunk continuously; preserve forward head shape through translation.
for v in mesh.vertices:
 y=v.co.y
 if y<-.16:v.co.y=y+.06
 elif y<.14:v.co.y=-.10+(y+.16)*.8
for o in s.objects:o.hide_render=True;o.hide_set(True)
obj=bpy.data.objects.new('WholeBody_Retopology_Start',mesh);s.collection.objects.link(obj);obj.hide_set(False)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
rem=obj.modifiers.new('Whole source volume, no grafts','REMESH');rem.mode='VOXEL';rem.voxel_size=.0025;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
obj.data.use_mirror_x=True
quad_result=bpy.ops.object.quadriflow_remesh(target_faces=8000,use_mesh_symmetry=False,use_preserve_sharp=False,use_preserve_boundary=True)
print('QUADRIFLOW_RESULT',quad_result)
obj.data.materials.clear();mat=bpy.data.materials.new('Neutral topology clay');mat.diffuse_color=(.45,.52,.53,1);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.45,.52,.53,1);bs.inputs['Roughness'].default_value=.8;obj.data.materials.append(mat)
for p in obj.data.polygons:p.use_smooth=True
bm=bmesh.new();bm.from_mesh(obj.data);unseen=set(bm.verts);comps=[]
while unseen:
 stack=[unseen.pop()];comp=set(stack)
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   u=e.other_vert(v)
   if u in unseen:unseen.remove(u);comp.add(u);stack.append(u)
 comps.append(len(comp))
audit={'quadriflow_status':list(quad_result),'vertices':len(bm.verts),'faces':len(bm.faces),'components':comps,'open_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'quad_faces':sum(len(f.verts)==4 for f in bm.faces),'scope':'new full-source neutral topology starting mesh; joint loops and seated pose not finished'};bm.free()
# Store full concept sheet in the working file as a hidden viewport reference.
image=bpy.data.images.load(str(OUT/'pose-reference.png'));image.pack();ref=bpy.data.objects.new('REFERENCE_2D_NOT_MODEL',None);ref.empty_display_type='IMAGE';ref.data=image;ref.empty_display_size=.9;ref.location=(.5,0,.25);s.collection.objects.link(ref);ref.hide_render=True;ref.hide_set(True)
s.world=bpy.data.worlds.new('Restart Studio');s.world.color=(.35,.35,.35)
bpy.ops.mesh.primitive_plane_add(size=20);floor=bpy.context.object;floor.name='Restart Floor';floor.location.z=-.002
for loc,power,size in [((1,-2,3),300,3),((-2,1,2),180,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=size
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.78
s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=800;s.render.resolution_y=650;s.render.resolution_percentage=100
for name,loc in [('front',(0,-1,.22)),('side',(1,0,.22)),('back',(0,1,.22))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,.04,.18))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'v13-wholebody-restart.blend'))
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(OUT/'topology-start.glb'),export_format='GLB',use_selection=True,export_animations=False)
(OUT/'audit.json').write_text(json.dumps(audit,indent=2));print('RESTART_COMPLETE',audit)
