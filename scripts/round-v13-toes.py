"""Reuse actual V13 hind toe surface in a separate seated sculpt target."""
import bpy,bmesh,json,math
from mathutils import Vector
from pathlib import Path
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar')
OUT=ROOT/'references/seated-haunch-toes-rounded';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'realistic/rework/bicolor-a-v13.blend'))
o=bpy.data.objects['mesh_0.001'];bm=bmesh.new();raw=bpy.data.meshes.new('RawBasis');raw.from_pydata([tuple(o.matrix_world@v.co) for v in o.data.vertices],[],[tuple(p.vertices) for p in o.data.polygons]);bm.from_mesh(raw)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
def clip(mesh,co,no):
 bmesh.ops.bisect_plane(mesh,geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces),plane_co=co,plane_no=no,dist=.000001)
 bmesh.ops.delete(mesh,geom=[v for v in mesh.verts if (v.co-Vector(co)).dot(Vector(no))>.000002],context='VERTS')
for co,no in [((0,.12,0),(0,-1,0)),((0,.162,0),(0,1,0)),((0,0,.042),(0,0,1))]:clip(bm,co,no)
print('CROP',len(bm.verts),len(bm.faces),[(tuple(v.co)) for v in list(bm.verts)[:8]]);pieces=[];report=[]
for side in [-1,1]:
 part=bm.copy();clip(part,(0,0,0),(-side,0,0))
 bmesh.ops.delete(part,geom=[v for v in part.verts if not v.link_faces],context='VERTS')
 bounds=[(min(v.co[i] for v in part.verts),max(v.co[i] for v in part.verts)) for i in range(3)]
 for v in part.verts:
  x,y,z=[(v.co[i]-bounds[i][0])/(bounds[i][1]-bounds[i][0]) for i in range(3)]
  v.co=Vector((side*.205+(x-.5)*.148,-.410+y*.153,.012+z*.102))
 bmesh.ops.holes_fill(part,edges=[e for e in part.edges if e.is_boundary],sides=0)
 bmesh.ops.recalc_face_normals(part,faces=list(part.faces))
 part.verts.ensure_lookup_table();part.verts.index_update()
 pieces.append(([tuple(v.co) for v in part.verts],[tuple(v.index for v in f.verts) for f in part.faces]))
 report.append({'side':side,'source_bounds':bounds,'source_toe_vertices':len(part.verts),'source_toe_faces':len(part.faces)})
 part.free()
bm.free()
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'references/seated-haunch-target/seated-haunch-target.blend'))
body=bpy.data.objects['Seated_Haunch_Sculpt_Target'];bm=bmesh.new();bm.from_mesh(body.data)
clip(bm,(0,-.292,0),(0,-1,0));bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bm.to_mesh(body.data);bm.free()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
for i,(verts,faces) in enumerate(pieces):
 mesh=bpy.data.meshes.new(f'V13_hind_toes_{i}');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj);obj.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body.name='Seated_Haunch_With_V13_Toes'
mod=body.modifiers.new('Toe junction sculpt union','REMESH');mod.mode='VOXEL';mod.voxel_size=.003;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
group=body.vertex_groups.new(name='Junction_only')
for v in body.data.vertices:
 w=max(0,1-abs(v.co.y+.275)/.065)
 if w>0 and v.co.z<.14:group.add([v.index],w,'REPLACE')
sm=body.modifiers.new('Blend toe seam','SMOOTH');sm.vertex_group=group.name;sm.factor=1;sm.iterations=180;bpy.ops.object.modifier_apply(modifier=sm.name)
# Shallow dorsal toe furrows, tapering away before the metatarsal junction.
for v in body.data.vertices:
 p=v.co
 if p.y<-.31 and p.z>.027:
  center=.205 if p.x>0 else -.205
  envelope=max(0,min(1,(-p.y-.31)/.045))*max(0,min(1,(p.z-.027)/.028))
  groove=sum(math.exp(-((p.x-center-offset)/.0055)**2) for offset in [-.035,0,.035])
  p.z-=.0055*groove*envelope
for p in body.data.polygons:p.use_smooth=True
bm=bmesh.new();bm.from_mesh(body.data);report.append({'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'vertices':len(bm.verts),'scope':'static sculpt union; UV and skin weights not transferred'});bm.free()
(OUT/'audit.json').write_text(json.dumps(report,indent=2))
s=bpy.context.scene;cam=s.camera
for name,loc in [('side',(2,0,.45)),('back',(0,2,.45)),('quarter',(1.5,-2,.8)),('low-quarter',(1.5,-2,.20)),('toe-close',(1,-2,.55))]:
 target=Vector((0,-.04,.30)) if name!='toe-close' else Vector((0,-.30,.065));cam.data.ortho_scale=1.05 if name!='toe-close' else .65
 cam.location=loc;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'seated-haunch-v13-toes-rounded.blend'))
print('TOE_GRAFT_COMPLETE',report)
