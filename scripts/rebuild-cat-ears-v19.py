"""Replace pinnae with rounded volumetric bowls; remesh and restore coat/skin."""
import bpy,bmesh,math,ast,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v18.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt'];body=bpy.data.objects['A18_Continuous_Sculpt'];rig=bpy.data.objects['A18_Motion_Rig']
for filename,names in [('resize-cat-v12.py',['active','export']),('style-cat-v16.py',['smooth','mix','gauss','linear','rgb','color_at','paint','mesh_object'])]:
    src=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts',filename).read_text())
    for node in src.body:
        if isinstance(node,ast.FunctionDef) and node.name in names:exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
coatmat=bpy.data.materials['A16_warm_tabby']
for m in list(body.modifiers):
    if m.type=='ARMATURE':body.modifiers.remove(m)
# Retract the old pinnae inside the cranial envelope, preserving the eye zone.
for v in body.data.vertices:
    p=v.co
    if p.z<=2.54 or abs(p.x)<.26:continue
    d=p-Vector((0,.03,2.305));e=math.sqrt((d.x/.465)**2+(d.y/.36)**2+(d.z/.41)**2)
    if e>1:
        target=Vector((0,.03,2.305))+d/e*.985
        w=smooth(2.54,2.61,p.z)*smooth(.26,.32,abs(p.x));v.co=p.lerp(target,w)
body.data.update()
# Rounded triangular perimeter via periodic Catmull-Rom interpolation.
points=[(.225,2.585),(.31,2.71),(.455,2.91),(.495,2.93),(.518,2.85),(.532,2.65),(.515,2.555),(.37,2.54)]
def boundary(t):
    u=t*len(points);i=int(u);u-=i
    a,b,c,d=[Vector(points[j%len(points)]) for j in [i-1,i,i+1,i+2]]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
parts=[body]
for sign in [-1,1]:
    verts=[];faces=[];N=96;R=15;center=Vector((.416,2.695))
    for back in [False,True]:
        for j in range(R+1):
            r=.001+.999*j/R
            for i in range(N):
                p=center.lerp(boundary(i/N),r);x,z=p
                plane=-.055+(z-2.58)*.13
                y=plane+.102*(1-r*r)
                if back:y+=.042+.026*(1-r*r)
                verts.append((sign*x,y,z))
        offset=(R+1)*N if back else 0
        for j in range(R):
            for i in range(N):
                a=offset+j*N+i;b=offset+j*N+(i+1)%N;face=(a,b,b+N,a+N)
                faces.append(tuple(reversed(face)) if back else face)
        faces.append(tuple(offset+i for i in (range(N-1,-1,-1) if not back else range(N))))
    offset=(R+1)*N
    for i in range(N):
        a=R*N+i;b=R*N+(i+1)%N;faces.append((a,a+offset,b+offset,b))
    o=mesh_object('A19_New_pinna',verts,faces,coatmat)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();parts.append(o)
active(body)
for o in parts:o.select_set(True)
bpy.ops.object.join()
m=body.modifiers.new('Continuous_pinna_union','REMESH');m.mode='VOXEL';m.voxel_size=.0075;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
m=body.modifiers.new('Surface_relax','SMOOTH');m.factor=.28;m.iterations=3;bpy.ops.object.modifier_apply(modifier=m.name)
m=body.modifiers.new('Balanced_density','DECIMATE');m.ratio=.42;m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
def previous_z(z):return z if z<=.3 else .3+(z-.3)/.88 if z<1.752 else z+.198
def coat(p):
    old=p.copy();old.z=previous_z(old.z);c=color_at(old)
    if p.z>2.64 and abs(p.x)>.30:
        # Warm rose inner bowl, with a broad golden rim.
        inner=smooth(2.65,2.73,p.z)*(1-smooth(2.87,2.91,p.z))*smooth(.31,.37,abs(p.x))*(1-smooth(.47,.51,abs(p.x)))*smooth(-.015,.045,p.y)*(1-smooth(.073,.105,p.y))
        c=mix(c,rgb((.64,.31,.24)),inner*.8)
    return c
paint(body,coat,coatmat)
body.vertex_groups.clear();root=body.vertex_groups.new(name='Root');head=body.vertex_groups.new(name='Head')
for v in body.data.vertices:
    w=smooth(1.78,2.15,previous_z(v.co.z))
    if w:head.add([v.index],w,'REPLACE')
    if w<1:root.add([v.index],1-w,'REPLACE')
m=body.modifiers.new('Head_skin','ARMATURE');m.object=rig
# Eliminate strands attached to removed ear surfaces.
for name,stride in [('A18_Laid_short_coat',8),('A18_Contour_coat',10)]:
    o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();remove=[]
    for i in range(0,len(bm.verts),stride):
        if bm.verts[i].co.z>2.54 and abs(bm.verts[i].co.x)>.26:remove.extend(bm.verts[j] for j in range(i,min(i+stride,len(bm.verts))))
    bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(o.data);bm.free()
for o in cat.objects:o.name=o.name.replace('A18','A19')
bm=bmesh.new();bm.from_mesh(body.data);n=sum(not e.is_manifold for e in bm.edges);vol=bm.calc_volume(signed=True);bm.free();assert n==0 and vol>0
scene['production_stage']='V19 rounded volumetric pinnae, integrated skull; colored short-coat review.'
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v19.blend'));export(OUT/'cat-a-foundation-v19.glb',list(cat.objects),True)
report={'body_nonmanifold':n,'body_volume':vol,'triangles':sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in cat.objects if o.type=='MESH'),'vertices':sum(len(o.data.vertices) for o in cat.objects if o.type=='MESH')}
(OUT/'v19-art-check.json').write_text(json.dumps(report,indent=2));print('V19_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('face',(0,-9,2.4),1,1.5,(0,0,2.33)),('quarter',(4,-8,3),1,3.3,(0,0,1.5)),('side',(9,0,2.5),1,3.3,(0,0,1.5)),('back',(0,9,2.5),1,3.3,(0,0,1.5)),('blink',(0,-9,2.4),50,1.5,(0,0,2.33))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v19-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V19_RENDER',name,flush=True)
