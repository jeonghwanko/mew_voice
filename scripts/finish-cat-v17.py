"""V17: softer coat silhouette and a more compact seated pose."""
import bpy,bmesh,ast,math,random,bisect,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v16.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt']
body=bpy.data.objects['A16_Continuous_Sculpt'];rig=bpy.data.objects['A16_Motion_Rig']
src=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts/style-cat-v16.py').read_text())
for node in src.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['smooth','mix','gauss','linear','rgb','color_at','mesh_object','skin']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
src=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts/resize-cat-v12.py').read_text())
for node in src.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['active','export']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
furmat=bpy.data.materials['A16_soft_short_coat']
# Silhouette clumps use multiple fine fibres; short body coat remains flat.
rng=random.Random(170917);verts=[];faces=[];cols=[]
body.data.calc_loop_triangles();tris=list(body.data.loop_triangles);areas=[];area=0
for t in tris:area+=t.area;areas.append(area)
for i in range(27000):
    t=tris[bisect.bisect_left(areas,rng.random()*area)];a,b,c=[body.data.vertices[k] for k in t.vertices]
    u=math.sqrt(rng.random());v=rng.random();p=a.co*(1-u)+b.co*u*(1-v)+c.co*u*v
    n=(a.normal*(1-u)+b.normal*u*(1-v)+c.normal*u*v).normalized();x,y,z=p
    cheek=abs(x)>.43 and 2.27<z<2.71
    chest=1.2<z<2.00 and abs(n.x)>.78
    crown=2.81<z<2.94 and abs(x)<.31 and n.z>.65
    if not(cheek or chest or crown):continue
    flow=Vector(((1 if x>0 else -1)*(.65 if cheek else .20),.10,-.8 if not crown else .2))
    flow=(flow-n*flow.dot(n)).normalized();side=n.cross(flow).normalized();color=color_at(p)
    length=rng.uniform(.030,.060) if cheek else rng.uniform(.018,.037)
    for strand in range(3):
        start=len(verts);root=p+side*(strand-1)*.0019+n*.0005
        for j in range(5):
            q=j/4;center=root+flow*length*q+n*length*(.34*q+.20*math.sin(math.pi*q))
            width=.0009*(1-q)+.00004
            for sign in [-1,1]:
                verts.append(tuple(center+side*width*sign));cols.append(tuple(min(1,k*(1.06+.12*q)) for k in color))
            if j<4:
                a=start+j*2;faces.extend([(a,a+1,a+3),(a,a+3,a+2)])
o=mesh_object('A17_Contour_coat',verts,faces,furmat,cols);skin(o);o.visible_shadow=False

# Reduce the length of the seated torso, without increasing the actual head.
# All face parts, morphs, whiskers and root/head joints share the mapping.
def height(z):return z if z<=.30 else .30+(z-.30)*.88 if z<1.95 else z-.198
for o in cat.objects:
    if o.type!='MESH':continue
    inv=o.matrix_world.inverted()
    def deform(p):
        w=o.matrix_world@p;w.z=height(w.z);return inv@w
    if o.data.shape_keys:
        for key in o.data.shape_keys.key_blocks:
            for v in key.data:v.co=deform(v.co)
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
    else:
        for v in o.data.vertices:v.co=deform(v.co)
    o.data.update()
active(rig);bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    bone.head.z=height(bone.head.z);bone.tail.z=height(bone.tail.z)
bpy.ops.object.mode_set(mode='OBJECT')
for o in cat.objects:o.name=o.name.replace('A16','A17')
scene.frame_set(1);scene['production_stage']='V17 colored short-coat cat; compact seated body with unchanged V13 head dimensions.'
report={'torso_height_scale':.88,'head_translation_z':-.198,'head_scale_from_v13':1,'contour_coat_vertices':len(verts),'triangles':sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in cat.objects if o.type=='MESH'),'meshes':len([o for o in cat.objects if o.type=='MESH'])}
for o in [body,bpy.data.objects['A17_Nose'],bpy.data.objects['A11_Free_Tail']]:
    bm=bmesh.new();bm.from_mesh(o.data);nonmanifold=sum(not e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True);bm.free()
    assert nonmanifold==0 and volume>0
    report[o.name]={'nonmanifold':nonmanifold,'volume':volume}
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v17.blend'));export(OUT/'cat-a-foundation-v17.glb',list(cat.objects),True)
(OUT/'v17-art-check.json').write_text(json.dumps(report,indent=2));print('V17_SAVED',json.dumps(report),flush=True)
scene.view_settings.exposure=-.35;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('front',(0,-9,2.5),1,3.3,(0,0,1.5)),('quarter',(4,-8,3),1,3.3,(0,0,1.5)),('face',(0,-9,2.4),1,1.5,(0,0,2.33)),('side',(9,0,2.5),1,3.3,(0,0,1.5)),('back',(0,9,2.5),1,3.3,(0,0,1.5)),('blink',(0,-9,2.4),50,1.5,(0,0,2.33))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v17-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V17_RENDER',name,flush=True)
