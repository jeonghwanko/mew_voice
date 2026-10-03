import bpy,bmesh,json
from pathlib import Path
out=Path('C:/Users/turbo08/mew_voice/assets/avatar/rebuild-v2')
bpy.ops.wm.open_mainfile(filepath=str(out/'v13-wholebody-restart.blend'));o=bpy.data.objects['WholeBody_Retopology_Start'];vs=[v.co[:] for v in o.data.vertices];fs=[p.vertices[:] for p in o.data.polygons]
bpy.ops.wm.read_factory_settings(use_empty=True);m=bpy.data.meshes.new('WholeBody');m.from_pydata(vs,[],fs);m.update();o=bpy.data.objects.new('WholeBody',m);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free();m.update();m.calc_loop_triangles()
for v in m.vertices:v.co*=100
m.update()
print('ACTIVE',bpy.context.object.name,'selected',[o.name for o in bpy.context.selected_objects],flush=True)
result=bpy.ops.object.quadriflow_remesh(target_faces=8000,use_mesh_symmetry=False,use_preserve_sharp=False,use_preserve_boundary=False);print('RESULT',result,len(o.data.polygons),flush=True)
if 'FINISHED' in result:
 for v in o.data.vertices:v.co/=100
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'wholebody-clean-topology.blend'))
(out/'isolated-retopo-audit.json').write_text(json.dumps({'result':list(result),'vertices':len(m.vertices),'faces':len(o.data.polygons)}))
