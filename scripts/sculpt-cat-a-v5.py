"""A v5: continuous paws, toe grooves and a closed tapered anatomical tail.

Run in Blender 4.5 with cat-a-study-v3.blend as input. References stay unmodified.
"""
import bpy,math,random,sys
from mathutils import Vector

OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-study-v3.blend')
scene=bpy.context.scene;scene.frame_set(1)
old=bpy.data.collections['CatA_Sculpt'];rig=bpy.data.objects['A_Cat_Rig']
for obj in list(old.objects):
    if obj.type=='MESH':bpy.data.objects.remove(obj,do_unlink=True)
cat=old
front=bpy.data.images.load(OUT+'/../concepts/v1/a-model-input.png',check_existing=True);front.pack()
turn=bpy.data.images.load(OUT+'/../concepts/v1/a-turnaround.png',check_existing=True);turn.pack()

# Source silhouette bounds are sampled for texture projection only. This keeps
# a side-view UV from accidentally picking the reference sheet's background.
frontpx=list(front.pixels[:]);turnpx=list(turn.pixels[:]);bounds_cache={}
def inside_reference(img,pixels,u,v,left,right):
    w,h=img.size;row=max(0,min(h-1,int(v*h)));key=(img.name,row,left,right)
    if key not in bounds_cache:
        xs=[]
        for x in range(left,min(w,right)):
            idx=(row*w+x)*4;r,g,b=pixels[idx:idx+3]
            if r-b>.18 and g<.86:xs.append(x)
        bounds_cache[key]=(min(xs)+3,max(xs)-3) if len(xs)>12 else (left+20,right-20)
    low,high=bounds_cache[key]
    return min(high/w,max(low/w,u)),v

def smooth(obj):
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def mesh(name,vs,fs):
    data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update()
    obj=bpy.data.objects.new(name,data);cat.objects.link(obj);return smooth(obj)
def move(obj):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    cat.objects.link(obj);return smooth(obj)
def active(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
def bind(obj,name):
    obj.parent=rig;group=obj.vertex_groups.new(name=name);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('A_Rig','ARMATURE');mod.object=rig
def gauss(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def fy(x,z):
    base=-.56*math.sqrt(max(.025,1-(x/.88)**2-((z-2.69)/.64)**2))
    cheek=.075*(gauss(x,z,.53,2.48,.29,.25)+gauss(x,z,-.53,2.48,.29,.25))
    muzzle=.22*(gauss(x,z,.16,2.36,.19,.14)+gauss(x,z,-.16,2.36,.19,.14))
    bridge=.09*gauss(x,z,0,2.69,.15,.34)
    chin=.07*gauss(x,z,0,2.19,.30,.12)
    socket=.045*(gauss(x,z,.300,2.733,.21,.21)+gauss(x,z,-.300,2.733,.21,.21))
    return base-cheek-muzzle-bridge-chin+socket
def opening(x,z):return min(((x-s*.300)/.188)**2+((z-2.733)/.155)**2 for s in [-1,1])

# Closed skull with actual orbital openings under the annular eyelid topology.
vs=[];fs=[];N=192;R=128
for j in range(R+1):
    lat=math.pi*(.0001+.9998*j/R);z=2.69+.64*math.cos(lat)
    width=1+.055*math.exp(-((z-2.50)/.19)**2)-.11*math.exp(-((z-2.14)/.14)**2)
    for i in range(N):
        angle=2*math.pi*i/N;x=.84*math.sin(lat)*math.cos(angle)*width
        y=.57*math.sin(lat)*math.sin(angle)+.06
        if math.sin(angle)<0:
            w=(-math.sin(angle))**.35;y=y*(1-w)+fy(x,z)*w
        vs.append((x,y,z))
for j in range(R):
    for i in range(N):
        a=j*N+i;b=j*N+(i+1)%N;indices=(a,a+N,b+N,b)
        co=sum((Vector(vs[k]) for k in indices),Vector())/4
        if co.y<-.30 and opening(co.x,co.z)<1.035:continue
        fs.append(indices)
fs.append(tuple(range(N)));fs.append(tuple(R*N+i for i in range(N-1,-1,-1)))
head=mesh('A4_Head',vs,fs);bind(head,'Head')

# Smooth pear-shaped torso, sloping shoulder/foreleg connection and real toes.
parts=[]
def ellipsoid(name,loc,scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=28,location=loc)
    obj=move(bpy.context.object);obj.name=name;obj.scale=scale;active(obj)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return obj
def tube(name,points,radii,res=14):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=res;curve.bevel_depth=1;curve.bevel_resolution=4;curve.use_fill_caps=True
    spl=curve.splines.new('BEZIER');spl.bezier_points.add(len(points)-1)
    for p,co,r in zip(spl.bezier_points,points,radii):p.co=co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);cat.objects.link(obj);active(obj);bpy.ops.object.convert(target='MESH');return smooth(obj)
levels=[(.09,.43,.27,.18),(.20,.59,.38,.17),(.45,.64,.45,.18),(.72,.62,.44,.20),(1.0,.56,.41,.18),(1.28,.50,.37,.12),(1.56,.46,.35,.07),(1.85,.43,.34,.01),(2.13,.39,.30,.03),(2.32,.23,.20,.06)]
v=[];f=[]
for z,rx,ry,cy in levels:
    for i in range(96):a=i*math.tau/96;v.append((rx*math.cos(a),cy+ry*math.sin(a),z))
for j in range(len(levels)-1):
    for i in range(96):a=j*96+i;b=j*96+(i+1)%96;f.append((a,b,b+96,a+96))
f.extend([tuple(range(95,-1,-1)),tuple((len(levels)-1)*96+i for i in range(96))]);parts.append(mesh('Torso',v,f))
for s in [-1,1]:
    parts.append(ellipsoid('Haunch',(s*.50,.10,.55),(.29,.40,.44)))
    parts.append(tube('Foreleg',[(s*.26,.03,1.93),(s*.36,-.16,1.55),(s*.31,-.32,.94),(s*.25,-.46,.26)],[.08,.205,.155,.16]))
    # One continuous paw volume. The front contour suggests four toe tips;
    # separate spheres are not used for the toes.
    for hind in [False,True]:
        cx=s*(.56 if hind else .25);cy=-.08 if hind else -.49
        paw=ellipsoid('Hindpaw' if hind else 'Forepaw',(cx,cy,.155),(.195 if hind else .205,.285,.14))
        for vert in paw.data.vertices:
            x,y,z=vert.co
            if y<-.06:
                tip=sum(math.exp(-((x-t)/.040)**2) for t in [-.14,-.047,.047,.14])
                vert.co.y-=.018*tip*max(0,min(1,(-y-.06)/.18))
        parts.append(paw)
active(parts[0])
for obj in parts:obj.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='A4_Body'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mod=body.modifiers.new('FusedAnatomy','REMESH');mod.mode='VOXEL';mod.voxel_size=.012;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=body.modifiers.new('Relax','SMOOTH');mod.factor=.5;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
# Shallow dorsal grooves articulate toes while keeping the paw a single form.
for vert in body.data.vertices:
    x,y,z=vert.co
    if y<-.53 and .14<z<.30:
        for s in [-1,1]:
            localx=x-s*.25
            if abs(localx)>.19:continue
            groove=sum(math.exp(-((localx-gap)/.012)**2) for gap in [-.096,0,.096])
            fade=math.exp(-((y+.69)/.10)**2)
            vert.co.z-=.016*groove*fade
bind(body,'Body')

# A smooth closed tail with a transported frame and a genuinely rounded tip.
points=[Vector(p) for p in [(-.38,.43,.68),(-.67,.45,.48),(-.94,.24,.26),(-1.05,-.12,.21),(-.98,-.44,.19),(-.73,-.60,.17),(-.46,-.63,.13)]]
def tailpoint(t):
    q=t*(len(points)-1);i=min(len(points)-2,int(q));u=q-i
    a=points[max(0,i-1)];b=points[i];c=points[i+1];d=points[min(len(points)-1,i+2)]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
vs=[];fs=[];steps=160;radial=40;flow=[];progress=[]
for j in range(steps):
    t=j/steps;p=tailpoint(t);direction=(tailpoint(min(1,t+.001))-tailpoint(max(0,t-.001))).normalized()
    side=direction.cross(Vector((0,0,1))).normalized();up=side.cross(direction).normalized()
    radius=.115+.060*math.sin(math.pi*min(1,t/.90))
    if t>.79:radius=.137*math.sqrt(max(0,1-((t-.79)/.21)**2))
    radius=min(radius,max(.025,p.z-.018)) if .2<t<.79 else radius
    for i in range(radial):
        a=i*math.tau/radial;vs.append(p+radius*(side*math.cos(a)+up*math.sin(a)));flow.append(direction);progress.append(t)
for j in range(steps-1):
    for i in range(radial):a=j*radial+i;b=j*radial+(i+1)%radial;fs.append((a,b,b+radial,a+radial))
tip=len(vs);vs.append(points[-1]);flow.append(flow[-1]);progress.append(1)
for i in range(radial):fs.append(((steps-1)*radial+i,(steps-1)*radial+(i+1)%radial,tip))
fs.append(tuple(range(radial-1,-1,-1)))
tail=mesh('A4_Tail',vs,[tuple(reversed(face)) for face in fs])
attr=tail.data.attributes.new(name='TailFlow',type='FLOAT_VECTOR',domain='POINT')
for i,direction in enumerate(flow):attr.data[i].vector=direction
attr=tail.data.attributes.new(name='TailT',type='FLOAT',domain='POINT')
for i,t in enumerate(progress):attr.data[i].value=t
bind(tail,'Tail')

if '--clay-only' in sys.argv:
    clay=bpy.data.materials.new('A5_Clay');clay.diffuse_color=(.38,.32,.24,1);clay.use_nodes=True;clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.32,.24,1)
    for obj in [body,tail]:obj.data.materials.append(clay)
    scene.camera=bpy.data.objects['A_Camera_ThreeQuarter'];scene.camera.location=(3,-6,2.4)
    from mathutils import Vector
    scene.camera.rotation_euler=(Vector((-.15,-.2,.52))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=2.75
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    scene.render.filepath=OUT+'/v5-paws-tail-clay.png';bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-paws-tail-v5.blend')
    print('A5_CLAY_SAVED',flush=True);sys.exit(0)

# Ear bowls seated in the skull; curved rim and a recessed concha.
ears=[]
for s in [-1,1]:
    corners=[Vector((s*.33,-.01,3.12)),Vector((s*.71,.045,3.50)),Vector((s*.73,.065,2.98))]
    if s<0:corners.reverse()
    center=sum(corners,Vector())/3;v=[];f=[];steps=96;rings=14
    for j in range(rings+1):
        t=.001+.999*j/rings
        for i in range(steps):
            a=i/steps*3;k=int(a);p=corners[k].lerp(corners[(k+1)%3],a-k);co=center.lerp(p,t)
            co.y=-.015-.16*t*t;v.append(tuple(co))
    for j in range(rings):
        for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;f.append((a,b,b+steps,a+steps))
    ear=mesh('A4_Ear_'+str(s),v,f);active(ear)
    mod=ear.modifiers.new('Thickness','SOLIDIFY');mod.thickness=.065;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=ear.modifiers.new('SoftRim','SUBSURF');mod.levels=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    bind(ear,'EarL' if s<0 else 'EarR');ears.append(ear)

eyes=[];lids=[]
for s in [-1,1]:
    cx=s*.300;cz=2.733;rx=.188;rz=.155
    v=[];f=[];steps=128;rings=24
    for j in range(rings+1):
        r=.0001+1.11*j/rings
        for i in range(steps):
            a=i*math.tau/steps;x=cx+rx*r*math.cos(a);z=cz+rz*r*math.sin(a)
            y=fy(x,z)-.105*max(0,1-r*r)-.009;v.append((x,y,z))
    for j in range(rings):
        for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;f.append((a,b,b+steps,a+steps))
    eye=mesh('A4_Eye_'+str(s),v,[tuple(reversed(face)) for face in f]);bind(eye,'Head');eyes.append(eye)
    def lidco(i,j,blink=0):
        a=i*math.tau/steps;t=j/12;ca=math.cos(a);sa=math.sin(a)
        x=cx+rx*ca*(1+.32*t)
        closed=-.020+.018*ca*ca
        inner=rz*sa*(1-blink)+closed*blink
        z=cz+inner*(1-t)+rz*1.35*sa*t
        yopen=fy(cx+rx*ca,cz+rz*sa)-.006
        yclosed=fy(cx+rx*ca,cz)-.12
        yin=yopen*(1-blink)+yclosed*blink
        ease=t*t*(3-2*t);y=yin*(1-ease)+(fy(x,z)+.008)*ease
        r2=((x-cx)/rx)**2+((z-cz)/rz)**2
        if r2<1.24:y=min(y,fy(x,z)-.105*max(0,1-r2)-.014)
        return x,y,z
    v=[lidco(i,j) for j in range(13) for i in range(steps)];f=[]
    for j in range(12):
        for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;f.append((a,b,b+steps,a+steps))
    lid=mesh('A4_Lid_'+str(s),v,[tuple(reversed(face)) for face in f]);lid.shape_key_add(name='Basis');key=lid.shape_key_add(name='Blink')
    for j in range(13):
        for i in range(steps):key.data[j*steps+i].co=lidco(i,j,1)
    for frame,value in [(1,0),(55,0),(61,1),(66,1),(74,0),(150,0)]:key.value=value;key.keyframe_insert(data_path='value',frame=frame)
    lid.data.shape_keys.animation_data.action.name='Listen';bind(lid,'Head');lids.append(lid)

# Nose is a rounded volume rather than the old floating triangle.
nose=ellipsoid('A4_Nose',(0,fy(0,2.43)-.020,2.423),(.082,.039,.055))
for v in nose.data.vertices:
    t=(v.co.z/.055+1)/2;v.co.x*=.30+.70*t
bind(nose,'Head')

# Project source colors from front / side / back and bake portable UV materials.
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True;scene.render.bake.margin=12
for obj in [head,body,tail,*ears,*eyes,*lids,nose]:
    active(obj);isbody=obj in [body,tail];isear=obj in ears;iseye=obj in eyes;islid=obj in lids
    layers=[obj.data.uv_layers.new(name=n) for n in ['Front','Side','Back']]
    weights=obj.data.color_attributes.new(name='ViewWeight',type='FLOAT_COLOR',domain='POINT')
    for vert in obj.data.vertices:
        n=vert.normal;fw=max(0,-n.y)**3;bw=max(0,n.y)**3;sw=abs(n.x)**3
        if iseye or islid or isear or obj==nose or (obj==head and vert.co.y<-.25 and abs(vert.co.x)<.65):fw=1;bw=sw=0
        total=max(.001,fw+bw+sw);weights.data[vert.index].color=(sw/total,bw/total,fw/total,1)
    for loop in obj.data.loops:
        co=obj.matrix_world@obj.data.vertices[loop.vertex_index].co;x,y,z=co
        u=.5192+x*.2849;v=.0993+z*.2496
        if isbody:u=.5192+x*.2849;v=.04+z*.276
        if isear:
            # Affine projection into the source ear interior, inset from white.
            s=-1 if obj.name=='A4_Ear_-1' else 1
            from mathutils import Matrix
            matrix=Matrix([(s*.33,3.12,1),(s*.71,3.50,1),(s*.73,2.98,1)])
            coords=[(477,175),(362,44),(365,240)] if s<0 else [(710,175),(810,44),(812,240)]
            cu=matrix.inverted()@Vector([p[0]/1145 for p in coords]);cv=matrix.inverted()@Vector([1-p[1]/1374 for p in coords])
            u=cu.dot(Vector((x,z,1)));v=cv.dot(Vector((x,z,1)))
        if islid:
            j=loop.vertex_index//128;a=(loop.vertex_index%128)*math.tau/128
            # Pull the narrow lip's UV toward the surrounding fur, not iris paint.
            v+=math.sin(a)*.010*(1-j/12)**2
        if obj==head:u,v=inside_reference(front,frontpx,u,min(v,1-125/1374),290,920)
        obj.data.uv_layers['Front'].data[loop.index].uv=(u,v)
        sidev=(724-(657-175*z))/724
        if obj==head:sidev=min(sidev,1-128/724)
        obj.data.uv_layers['Side'].data[loop.index].uv=inside_reference(turn,turnpx,(1320-215*y)/2172,sidev,1150,1570)
        obj.data.uv_layers['Back'].data[loop.index].uv=inside_reference(turn,turnpx,(1880-190*x)/2172,sidev,1710,2080)
    surf=obj.data.uv_layers.new(name='SurfaceUV');obj.data.uv_layers.active=surf
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    mat=bpy.data.materials.new(obj.name+'_Paint');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.22 if iseye else .80;bs.inputs['Specular IOR Level'].default_value=.12 if iseye else .06
    textures=[]
    for name,img in [('Front',front),('Side',turn),('Back',turn)]:
        uvn=nodes.new('ShaderNodeUVMap');uvn.uv_map=name;tex=nodes.new('ShaderNodeTexImage');tex.image=img;tex.extension='EXTEND';links.new(uvn.outputs['UV'],tex.inputs[0]);textures.append(tex)
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='ViewWeight';sep=nodes.new('ShaderNodeSeparateColor');links.new(attr.outputs['Color'],sep.inputs[0])
    # Normalize side and back against the remaining front contribution.
    mix1=nodes.new('ShaderNodeMixRGB');links.new(sep.outputs['Red'],mix1.inputs[0]);links.new(textures[0].outputs['Color'],mix1.inputs[1]);links.new(textures[1].outputs['Color'],mix1.inputs[2])
    mix2=nodes.new('ShaderNodeMixRGB');links.new(sep.outputs['Green'],mix2.inputs[0]);links.new(mix1.outputs[0],mix2.inputs[1]);links.new(textures[2].outputs['Color'],mix2.inputs[2])
    gray=nodes.new('ShaderNodeRGBToBW');links.new(mix2.outputs[0],gray.inputs[0]);cut=nodes.new('ShaderNodeMath');cut.operation='LESS_THAN';cut.inputs[1].default_value=.76;links.new(gray.outputs[0],cut.inputs[0])
    links.new(mix2.outputs[0],bs.inputs['Base Color'])
    obj.data.materials.clear();obj.data.materials.append(mat)
    size=2048 if obj in [head,body] else 1024 if iseye or islid else 512
    baked=bpy.data.images.new(obj.name+'_Color',width=size,height=size,alpha=False);baked.colorspace_settings.name='sRGB'
    tex=nodes.new('ShaderNodeTexImage');tex.image=baked
    for node in nodes:node.select=False
    tex.select=True;nodes.active=tex;bpy.ops.object.bake(type='DIFFUSE')
    for node in list(nodes):
        if node not in [bs,nodes.get('Material Output'),tex]:nodes.remove(node)
    uvn=nodes.new('ShaderNodeUVMap');uvn.uv_map='SurfaceUV';links.new(uvn.outputs[0],tex.inputs[0]);links.new(tex.outputs[0],bs.inputs['Base Color'])
    for name in ['Front','Side','Back']:obj.data.uv_layers.remove(obj.data.uv_layers[name])
    obj.data.color_attributes.remove(obj.data.color_attributes['ViewWeight']);baked.pack()
    if islid:
        # Paint eyelid pigment in 3D instead of stretching the source iris/fur
        # pixels across the eye when it closes. The outer edge matches the coat.
        pigment=obj.data.color_attributes.new(name='LidPaint',type='FLOAT_COLOR',domain='POINT')
        for vert in obj.data.vertices:
            j=vert.index//128;t=j/12;angle=(vert.index%128)*math.tau/128
            x,y,z=vert.co;samplez=(2.733+(.23 if math.sin(angle)>0 else -.225))*(1-t)+z*t
            px=int((.5192+x*.2849)*1145);py=int((.0993+samplez*.2496)*1374);color=[0,0,0];samples=0
            for dx in [-9,-3,3,9]:
                for dy in [-9,-3,3,9]:
                    k=(max(0,min(1373,py+dy))*1145+max(0,min(1144,px+dx)))*4
                    for ch in range(3):color[ch]+=frontpx[k+ch]
                    samples+=1
            color=[c/samples for c in color];color=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in color]
            if j==0:color=[.095,.038,.017]
            pigment.data[vert.index].color=(*color,1)
        for link in list(bs.inputs['Base Color'].links):links.remove(link)
        vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='LidPaint';links.new(vc.outputs[0],bs.inputs['Base Color'])
    print('BAKED',obj.name,flush=True)

# Fine 3D whiskers are rooted on the actual muzzle surface.
whiskerMat=bpy.data.materials.new('A4_Whisker');whiskerMat.diffuse_color=(.78,.68,.48,1);whiskerMat.use_nodes=True
whiskerMat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.78,.68,.48,1)
for s in [-1,1]:
    for i in range(5):
        z=2.36-i*.023;x=s*(.16+.013*i);y=fy(x,z)-.01
        obj=tube('A4_Whisker_'+str(s)+'_'+str(i),[(x,y,z),(s*.47,y-.04,z+.035-i*.013),(s*(.85+.02*i),y+.11,z+.075-i*.045)],[.0018,.0012,.00015],12)
        obj.data.materials.append(whiskerMat);bind(obj,'Head')

scene.frame_set(1)
scene.camera=bpy.data.objects['A_Camera_Face'];scene.camera.location=(0,-9,2.90)
scene.camera.rotation_euler=(Vector((0,-.1,2.72))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=2.32
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=-.25
scene['production_stage']='A v4: orbital openings, curved eyes, Blink lids, multi-view coat; groom pending'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-anatomy-v5.blend')
print('A5_ANATOMY_SAVED',flush=True)
