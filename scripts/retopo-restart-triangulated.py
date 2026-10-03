import bpy,bmesh,json
from pathlib import Path
out=Path('C:/Users/turbo08/mew_voice/assets/avatar/rebuild-v2')
bpy.ops.wm.open_mainfile(filepath=str(out/'v13-wholebody-restart.blend'));o=bpy.data.objects['WholeBody_Retopology_Start'];bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='BEAUTY',ngon_method='BEAUTY');bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));print('TRI',sum(not e.is_manifold for e in bm.edges));bm.to_mesh(o.data);bm.free();o.data.update()
result=bpy.ops.object.quadriflow_remesh(target_faces=8000,use_mesh_symmetry=False,use_preserve_sharp=False,use_preserve_boundary=False);print('RESULT',result,len(o.data.polygons))
if 'FINISHED' in result:
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'v13-wholebody-retopo.blend'));bpy.ops.export_scene.gltf(filepath=str(out/'topology-retopo.glb'),export_format='GLB',use_selection=True,export_animations=False)
