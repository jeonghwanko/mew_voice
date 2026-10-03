"""V18 review master: remove excess strands and preserve the animated face."""
import bpy,bmesh,ast,json
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v17.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt'];body=bpy.data.objects['A17_Continuous_Sculpt']
src=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts/resize-cat-v12.py').read_text())
for node in src.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['active','export']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
# Keep complete ribbons, including their vertex colors and skin weights.
for name,stride in [('A17_Laid_short_coat',8),('A17_Tail_coat',8),('A17_Contour_coat',10)]:
    o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
    remove=[]
    for i in range(0,len(bm.verts),stride):
        drop=(i//stride)%3!=0 if 'Contour' not in name else bm.verts[i].co.z>2.61 or (i//stride)%2!=0
        if drop:remove.extend(bm.verts[j] for j in range(i,min(i+stride,len(bm.verts))))
    bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(o.data);bm.free();o.data.update()
# High-density sculpt can be simplified while leaving separate lid morphs intact.
active(body);m=body.modifiers.new('Review_mesh_density','DECIMATE');m.ratio=.48;m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
# Slightly smaller nasal leather, with the embedded rear plane maintained.
nose=bpy.data.objects['A17_Nose']
for v in nose.data.vertices:v.co.x*=.90;v.co.z*=.90
nose.data.update()
for o in cat.objects:o.name=o.name.replace('A17','A18')
scene.view_settings.exposure=-.35;scene['production_stage']='V18 polished short-coat cartoon cat review master; mobile performance remains to be measured.'
report={'vertices':sum(len(o.data.vertices) for o in cat.objects if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in cat.objects if o.type=='MESH'),'meshes':len([o for o in cat.objects if o.type=='MESH'])}
for o in [body,nose,bpy.data.objects['A11_Free_Tail']]:
    bm=bmesh.new();bm.from_mesh(o.data);n=sum(not e.is_manifold for e in bm.edges);vol=bm.calc_volume(signed=True);bm.free()
    assert n==0 and vol>0
    report[o.name]={'nonmanifold':n,'volume':vol}
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v18.blend'));export(OUT/'cat-a-foundation-v18.glb',list(cat.objects),True)
(OUT/'v18-art-check.json').write_text(json.dumps(report,indent=2));print('V18_SAVED',json.dumps(report),flush=True)
from mathutils import Vector
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('front',(0,-9,2.5),1,3.3,(0,0,1.5)),('quarter',(4,-8,3),1,3.3,(0,0,1.5)),('face',(0,-9,2.4),1,1.5,(0,0,2.33)),('side',(9,0,2.5),1,3.3,(0,0,1.5)),('back',(0,9,2.5),1,3.3,(0,0,1.5)),('blink',(0,-9,2.4),50,1.5,(0,0,2.33))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v18-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V18_RENDER',name,flush=True)
