"""Art pass: groomed mesh coat, tabby markings, warm eyes and whiskers.
All colors are vertex attributes and all strands are exportable skinned meshes.
"""
import bpy,bmesh,math,json,random,bisect,ast
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v14.blend')
scene=bpy.context.scene;scene.frame_set(1);cat=bpy.data.collections['CatA_Sculpt']
body=bpy.data.objects['A14_Continuous_Sculpt'];rig=bpy.data.objects['A14_Motion_Rig']
source=ast.parse(Path('C:/Users/turbo08/mew_voice/scripts/resize-cat-v12.py').read_text())
for node in source.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['active','export','fur_guide']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<shared>','exec'))
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def mix(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def gauss(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def rgb(c):return tuple(linear(x) for x in c)
def material(name,color,roughness=.8,vertex=False):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
    if vertex:
        n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Coat';m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
    return m
coatmat=material('A15_warm_tabby',(.7,.3,.08),.88,True)
furmat=material('A15_soft_short_coat',(.7,.3,.08),.94,True)
irisMat=material('A15_radial_amber',(.3,.15,.03),.24,True)
eyeMat=material('A15_eye_ivory',rgb((.86,.82,.65)),.18)
pupilMat=material('A15_deep_pupil',rgb((.025,.035,.025)),.10)
noseMat=material('A15_rose_nose',rgb((.65,.30,.24)),.42)
whiskerMat=material('A15_ivory_whiskers',rgb((.92,.82,.62)),.7)
highlightMat=material('A15_eye_catchlight',(.95,.97,1),.16)

# Soften folded ear roots locally without remeshing the animated face.
active(body);g=body.vertex_groups.new(name='A15_soft_pinna')
for v in body.data.vertices:
    w=smooth(2.71,2.91,v.co.z)*smooth(.27,.40,abs(v.co.x))
    if w:g.add([v.index],w,'REPLACE')
m=body.modifiers.new('Soften_ear_root','SMOOTH');m.vertex_group=g.name;m.factor=.38;m.iterations=16;bpy.ops.object.modifier_apply(modifier=m.name)

def color_at(p,tail=False):
    x,y,z=p;ax=abs(x)
    gold=(.78,.365,.09);light=(.92,.53,.18);dark=(.44,.19,.065);cream=(.94,.82,.59)
    c=mix(gold,light,.35+.12*math.sin(x*10+z*6))
    if tail:
        stripe=smooth(.66,.96,math.cos(z*25+x*15+y*11))*.60
        c=mix(c,dark,stripe);c=mix(c,cream,smooth(.64,.90,-x)*smooth(.18,.36,-y))
        return rgb(c)
    front=1-smooth(-.21,.02,y)
    if z>2.10:
        # M-shaped forehead marking and lateral cheek bars.
        forehead=smooth(2.59,2.75,z)*(1-smooth(2.91,3.04,z))
        bars=math.exp(-((ax-(.10+.15*(z-2.64)))/.022)**2)+.7*math.exp(-(x/.023)**2)
        stripe=min(1,bars)*forehead*.68*front
        cheek=smooth(.29,.42,ax)*(1-smooth(.48,.55,ax))*smooth(2.23,2.34,z)*(1-smooth(2.60,2.72,z))
        stripe=max(stripe,cheek*smooth(.55,.96,math.cos(z*46+ax*14))*.48)
        c=mix(c,dark,stripe)
        muzzle=max(gauss(x,z,s*.087,2.272,.14,.083) for s in [-1,1])
        chin=gauss(x,z,0,2.19,.155,.085)
        c=mix(c,cream,smooth(.13,.65,max(muzzle,chin))*front)
        # Gentle cream under-eye mask, not a circular pale goggle.
        under=max(gauss(x,z,s*.241,2.414,.17,.044) for s in [-1,1])
        c=mix(c,cream,under*.70*front)
        # Warm inner pinna, restricted to forward-facing bowl.
        inner=smooth(2.79,2.91,z)*smooth(.30,.39,ax)*(1-smooth(.45,.51,ax))*(1-smooth(-.055,.01,y))
        c=mix(c,(.65,.34,.25),inner*.8)
    else:
        stripe=smooth(.55,.96,math.cos(z*20+math.sin(ax*12)*1.2+y*9))*.48
        stripe*=smooth(.12,.30,ax)
        c=mix(c,dark,stripe)
        bib=math.exp(-(x/(.15+.10*smooth(1.2,1.95,z)))**4)*smooth(.7,1.2,z)*(1-smooth(1.91,2.18,z))*front
        c=mix(c,cream,bib*.95)
        c=mix(c,cream,(1-smooth(.19,.32,z))*.95)
    return rgb(c)

def paint(o,fn,mat):
    o.data.materials.clear();o.data.materials.append(mat)
    attr=o.data.color_attributes.get('Coat') or o.data.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
    for v in o.data.vertices:attr.data[v.index].color=(*fn(o.matrix_world@v.co),1)
    o.data.color_attributes.active_color=attr

for o in list(cat.objects):
    if o.type!='MESH':continue
    if o==body or 'Tail' in o.name or 'Lid' in o.name:
        paint(o,lambda p:color_at(p,'Tail' in o.name),coatmat)
    elif 'Iris' in o.name:
        cx=.29*.821008*(1 if sum((o.matrix_world@v.co).x for v in o.data.vertices)>0 else -1);cz=1.95+.7*.8464
        def eye_color(p):
            dx=(p.x-cx)/.821008;dz=(p.z-cz)/.8464;r=math.hypot(dx,dz);a=math.atan2(dz,dx)
            t=smooth(.125,.17,r);c=mix((.70,.45,.10),(.28,.26,.09),t)
            c=mix(c,(.96,.70,.24),(.5+.5*math.sin(a*47+math.sin(a*17)*3))*.23)
            return rgb(c)
        paint(o,eye_color,irisMat)
    else:
        o.data.materials.clear();o.data.materials.append(eyeMat if 'Eyeball' in o.name else pupilMat if 'Pupil' in o.name else noseMat)

def mesh_object(name,verts,faces,mat,colors=None):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);cat.objects.link(o);d.materials.append(mat)
    for f in d.polygons:f.use_smooth=True
    if colors:
        a=d.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):a.data[i].color=(*c,1)
        d.color_attributes.active_color=a
    return o
def skin(o,tail=False):
    root=o.vertex_groups.new(name='Root');head=o.vertex_groups.new(name='Head')
    for v in o.data.vertices:
        w=0 if tail else smooth(1.78,2.15,v.co.z)
        if w:head.add([v.index],w,'REPLACE')
        if w<1:root.add([v.index],1-w,'REPLACE')
    m=o.modifiers.new('Coat_follows_head','ARMATURE');m.object=rig

# Surface-sampled curved tapered ribbons form a short laid coat. They are
# excluded from moving eyelids and muzzle/nose so no fur floats over a blink.
rng=random.Random(150915)
for obj,count in [(body,26000),(bpy.data.objects['A11_Free_Tail'],4500)]:
    obj.data.calc_loop_triangles();tris=list(obj.data.loop_triangles);cum=[];area=0
    for t in tris:area+=t.area;cum.append(area)
    vs=[];fs=[];cols=[];tail='Tail' in obj.name
    for i in range(count):
        tri=tris[bisect.bisect_left(cum,rng.random()*area)];a,b,c=[obj.data.vertices[k] for k in tri.vertices]
        u=math.sqrt(rng.random());v=rng.random();p=a.co*(1-u)+b.co*u*(1-v)+c.co*u*v
        n=(a.normal*(1-u)+b.normal*u*(1-v)+c.normal*u*v).normalized();x,y,z=p
        if not tail:
            if z<.27:continue
            if y<-.18 and z>2.16 and z<2.75:
                eye=min(((x-s*.238)/.234)**2+((z-2.542)/.195)**2 for s in [-1,1])
                if eye<1.26 or (abs(x)<.21 and z<2.36):continue
            if z>2.85 and abs(x)>.29:continue
        # Follow the cheek outward/downward; body coat follows gravity.
        flow=Vector(((.65 if x>0 else -.65) if z>2.25 else x*.2, .05,-1))
        flow=(flow-n*flow.dot(n)).normalized()
        if flow.length<.1:flow=Vector((1,0,0))
        tangent=n.cross(flow).normalized()
        length=rng.uniform(.018,.037)*(1.15 if tail else 1)
        width=rng.uniform(.0015,.0028);base=p+n*.0007;start=len(vs)
        co=color_at(p,tail);shade=rng.uniform(.85,1.14)
        for j in range(4):
            t=j/3;center=base+flow*length*t+n*(length*.27*math.sin(t*math.pi*.8))
            w=width*(1-t)**.8 if j<3 else .00003
            for side in [-1,1]:
                vs.append(tuple(center+tangent*w*side));cols.append(tuple(min(1,k*shade*(1+.10*t)) for k in co))
            if j<3:
                k=start+j*2;fs.extend([(k,k+1,k+3),(k,k+3,k+2)])
    fur=mesh_object('A15_Tail_coat' if tail else 'A15_Laid_short_coat',vs,fs,furmat,cols);skin(fur,tail)

# Fine curved whiskers; roots sit on the paired muzzle pads.
verts=[];faces=[]
for sign in [-1,1]:
    for j in range(5):
        root=Vector((sign*(.095+j*.012),-.535,2.263+j*.014));start=len(verts);N=14
        for k in range(N):
            t=k/(N-1);p=root+Vector((sign*(.25+.015*j)*t,-.045*math.sin(t*math.pi/2),(j-2)*.022*t-.018*t*t));r=.0012*(1-.9*t)
            for l in range(4):
                a=l*math.tau/4;verts.append(tuple(p+Vector((0,math.cos(a)*r,math.sin(a)*r))))
            if k:
                for l in range(4):
                    a=start+(k-1)*4+l;b=start+(k-1)*4+(l+1)%4;faces.append((a,b,b+4,a+4))
o=mesh_object('A15_Whiskers',verts,faces,whiskerMat);skin(o)

# Small authored catchlights follow the lid morphs so they never remain on a
# closed eye. Actual glossy lighting adds the remaining view-dependent light.
for sign in [-1,1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(sign*.238-.039,-.408,2.591))
    o=bpy.context.object;o.name='A15_Catchlight';o.scale=(.017,.006,.021)
    for col in list(o.users_collection):col.objects.unlink(o)
    cat.objects.link(o);active(o);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(highlightMat);skin(o)
    o.shape_key_add(name='Basis');key=o.shape_key_add(name='SlowBlink')
    for v in key.data:v.co.y+=.08
    for frame in range(1,151):
        t=smooth(39,48,frame) if frame<=48 else (1 if frame<=54 else 1-smooth(54,66,frame))
        key.value=smooth(.1,.5,t);key.keyframe_insert('value',frame=frame)

for o in cat.objects:o.name=o.name.replace('A14','A15')
scene.frame_set(1);scene['production_stage']='V15 authored tabby coat and facial material pass; short mesh fur and whiskers.'
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v15.blend'));export(OUT/'cat-a-foundation-v15.glb',list(cat.objects),True)
report={'meshes':len([o for o in cat.objects if o.type=='MESH']),'triangles':sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in cat.objects if o.type=='MESH'),'fur':'seeded laid tapered mesh ribbons, surface-sampled; no external generation','head_proportions':'V13 preserved','vertices':sum(len(o.data.vertices) for o in cat.objects if o.type=='MESH')}
(OUT/'v15-art-check.json').write_text(json.dumps(report,indent=2));print('V15_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame,scale,target in [('front',(0,-9,2.6),1,3.55,(0,0,1.6)),('quarter',(4,-8,3.1),1,3.55,(0,0,1.6)),('face',(0,-9,2.6),1,1.5,(0,0,2.53)),('side',(9,0,2.6),1,3.55,(0,0,1.6)),('blink',(0,-9,2.6),50,1.5,(0,0,2.53))]:
    scene.frame_set(frame);camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v15-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V15_RENDER',name,flush=True)
