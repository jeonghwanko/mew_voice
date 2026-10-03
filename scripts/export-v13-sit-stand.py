import bpy,json,hashlib,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'assets/avatar';OUT=ROOT/'v13-sit-stand'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'v13-sit-stand-study.blend'))
s=bpy.context.scene;r=bpy.data.objects['SitStand'];body=bpy.data.objects['V13_mesh_0.001']
meshes=[bpy.data.objects[n] for n in ['V13_mesh_0.001','V13_mesh_0','V13_Object_32']]
samples=[]
for frame in range(1,122,5):
 s.frame_set(frame);ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh()
 points=[v.co.copy() for v in m.vertices];ev.to_mesh_clear()
 assert all(math.isfinite(c) for p in points for c in p)
 samples.append({'frame':frame,'minimum_z':min(p.z for p in points)})
s.frame_set(1);a=[b.matrix.copy() for b in r.pose.bones];s.frame_set(121)
assert max(abs(a[i][j][k]-b.matrix[j][k]) for i,b in enumerate(r.pose.bones) for j in range(4) for k in range(4))<1e-5
s.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');r.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=r
options={}
if 'export_anim_slide_to_zero' in bpy.ops.export_scene.gltf.get_rna_type().properties:options['export_anim_slide_to_zero']=True
bpy.ops.export_scene.gltf(filepath=str(OUT/'v13-sit-stand.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True,**options)
source=ROOT/'realistic/rework/bicolor-a-v13.blend'
(OUT/'motion-audit.json').write_text(json.dumps({'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'bones':len(r.pose.bones),'body_vertices':len(body.data.vertices),'max_influences':max(len(v.groups) for v in body.data.vertices),'frames':121,'fps':30,'cycle_endpoint_match':True,'samples':samples,'scope':'sit / stand only; source facial expression actions are not copied into this rig study'},indent=2))
