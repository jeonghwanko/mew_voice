"""Editable A-cat surface study, authored in Blender. Front is -Y, up is Z.

Separate from the rejected Three.js prototype; no old geometry is imported.
Creates integrated face surface, eyelid morphs, unified body and a small rig.
"""
import bpy
import math
from mathutils import Vector

OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').startswith(OUT+'/cat-a-'), 'Open the A cat workspace first'
for name in ['CatA_Sculpt','CatA_Studio']:
    old=bpy.data.collections.get(name)
    if old:
        for obj in list(old.objects): bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(old)
cat=bpy.data.collections.new('CatA_Sculpt');bpy.context.scene.collection.children.link(cat)
studio=bpy.data.collections.new('CatA_Studio');bpy.context.scene.collection.children.link(studio)
refs=bpy.data.collections.get('A_Concept_References')
if refs: refs.hide_render=True;refs.hide_viewport=True

def move(obj,col=cat):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    col.objects.link(obj)
    return obj
def smooth(obj):
    for f in obj.data.polygons:f.use_smooth=True
    return obj
def mesh(name,verts,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);cat.objects.link(obj);data.materials.append(material)
    return smooth(obj)
def rgb(h):
    vals=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)
def lerp(a,b,t):return tuple(x+(y-x)*max(0,min(1,t)) for x,y in zip(a,b))
orange=rgb('C77832'); cream=rgb('F5DFB4'); dark=rgb('884826'); gold=rgb('B8A449')
def mat(name,color,rough=.75,vertex=False):
    material=bpy.data.materials.new(name);material.diffuse_color=(*rgb(color),1);material.use_nodes=True
    bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb(color),1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Specular IOR Level'].default_value=.13
    if vertex:
        attr=material.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='CoatColor'
        material.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    return material
coat=mat('A_Painted_Coat','CB793B',.87,True)
eyeMat=mat('A_Eye','B8A449',.3,True)
pink=mat('A_Nose','C17E76',.48);ink=mat('A_Face_Line','613E31',.86)
whiskerMat=mat('A_Whiskers','E5D2AA',.72);shine=mat('A_Catchlight','FFF9DE',.2)

def gaussian(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def face_y(x,z):
    dz=(z-2.64)/.70
    base=-.58*math.sqrt(max(.035,1-(x/.84)**2-dz*dz))
    cheeks=.12*(gaussian(x,z,.43,2.40,.32,.24)+gaussian(x,z,-.43,2.40,.32,.24))
    muzzle=.19*(gaussian(x,z,.155,2.31,.225,.17)+gaussian(x,z,-.155,2.31,.225,.17))
    bridge=.10*gaussian(x,z,0,2.66,.15,.37)
    sockets=.045*(gaussian(x,z,.35,2.75,.25,.25)+gaussian(x,z,-.35,2.75,.25,.25))
    return base-cheeks-muzzle-bridge+sockets

def coat_color(x,y,z,head=False):
    color=orange
    if head:
        muzzle=gaussian(x,z,0,2.30,.45,.22)
        brows=(gaussian(x,z,.36,3.02,.32,.065)+gaussian(x,z,-.36,3.02,.32,.065))*.52
        eyeunder=(gaussian(x,z,.35,2.47,.26,.085)+gaussian(x,z,-.35,2.47,.26,.085))*.43
        front=max(0,min(1,(-y-.12)/.30))
        color=lerp(color,cream,min(1,(muzzle*1.6+brows+eyeunder)*front))
        # Tapered forehead marks, opening outwards toward the ears.
        if z>3.00 and y<.02:
            taper=max(0,min(1,(z-3.00)/.26))
            for center in [0, .16+(z-3.0)*.20, -.16-(z-3.0)*.20, .38+(z-3.0)*.25,-.38-(z-3.0)*.25]:
                mark=math.exp(-((x-center)/(.018+.031*taper))**4)*taper*.80
                color=lerp(color,dark,mark)
        if abs(x)>.48 and 2.33<z<2.88:
            streak=(.5+.5*math.cos((z+abs(x)*.14)*45))**10
            color=lerp(color,dark,streak*.48*max(0,min(1,(abs(x)-.48)/.2)))
    else:
        chest=gaussian(x,z,0,1.39,.31,.65)*max(0,min(1,(-y-.08)/.28))
        color=lerp(color,cream,chest*1.4)
        if z<.22 and y<-.32:color=lerp(color,cream,.94)
        if abs(x)>.26:
            stripe=(.5+.5*math.sin(z*19+abs(x)*3.6+y*4))**9
            color=lerp(color,dark,stripe*.5*(1-chest))
    return (*color,1)

def paint(obj,is_head=False):
    colors=obj.data.color_attributes.new(name='CoatColor',type='FLOAT_COLOR',domain='POINT')
    for v in obj.data.vertices:colors.data[v.index].color=coat_color(*v.co,head=is_head)

# Sculpt a closed head surface from longitudinal rings. Front vertices use the
# continuous facial relief instead of overlapping cheek/muzzle spheres.
verts=[];faces=[];N=128;R=80
for j in range(R+1):
    lat=math.pi*(.0001+(1-.0002)*j/R)
    z=2.64+.70*math.cos(lat)
    cheek_width=1+.04*math.exp(-((z-2.48)/.22)**2)-.14*math.exp(-((z-2.08)/.20)**2)
    for i in range(N):
        angle=2*math.pi*i/N;x=.84*math.sin(lat)*math.cos(angle)*cheek_width
        y=.58*math.sin(lat)*math.sin(angle)
        if y<0:
            target=face_y(x,z)
            front=(-math.sin(angle))**.5
            y=y*(1-front)+target*front
        verts.append((x,y,z))
for j in range(R):
    for i in range(N):
        a=j*N+i;b=j*N+(i+1)%N;faces.append((a,a+N,b+N,b))
faces.append(tuple(range(N)));faces.append(tuple(R*N+i for i in range(N-1,-1,-1)))
head=mesh('A_Head_ContinuousSurface',verts,faces,coat)
paint(head,True)
head.shape_key_add(name='Basis')
for keyname,amount in [('Content',.022),('Plead',-.012)]:
    key=head.shape_key_add(name=keyname)
    for v in key.data:
        x,y,z=v.co;w=gaussian(abs(x),z,.38,2.41,.27,.22)*max(0,min(1,-y*2))
        v.co.z+=amount*w

# Integrated seated body: voxel fusion removes primitive intersections before
# smoothing; the resulting editable volume is independent of construction forms.
parts=[]
def ellipsoid(name,loc,scale,material=coat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96 if name.startswith('A_Eye') else 40,ring_count=64 if name.startswith('A_Eye') else 28,location=loc)
    obj=move(bpy.context.object);obj.name=name;obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material);smooth(obj)
    return obj
for name,loc,scale in [('Haunch',(0,.12,.62),(.60,.46,.55)),('Chest',(0,-.035,1.12),(.49,.38,.71)),('Neck',(0,.02,1.68),(.43,.34,.31))]:
    parts.append(ellipsoid(name,loc,scale))
for s in [-1,1]:
    parts.append(ellipsoid('Foreleg',(s*.25,-.28,.70),(.155,.18,.63)))
    parts.append(ellipsoid('Forepaw',(s*.25,-.40,.155),(.205,.28,.15)))
    parts.append(ellipsoid('Hindpaw',(s*.48,.01,.18),(.235,.30,.175)))
bpy.ops.object.select_all(action='DESELECT')
for p in parts:p.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=parts[0];body.name='A_Body_Unified'
bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
remesh=body.modifiers.new('VolumeFusion','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.029;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
soft=body.modifiers.new('SurfaceRelax','SMOOTH');soft.factor=.65;soft.iterations=6;bpy.ops.object.modifier_apply(modifier=soft.name)
paint(body)

def curve(name,points,radius,material):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=20;data.bevel_depth=radius;data.bevel_resolution=3
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,co in zip(spline.bezier_points,points):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);cat.objects.link(obj);data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return smooth(bpy.context.object)
tail=curve('A_Tail',[(.35,.36,.52),(.70,.42,.28),(.84,.11,.16),(.73,-.36,.15),(.40,-.66,.16),(.05,-.73,.18)],.125,coat)
paint(tail)

headParts=[head];lids=[];earParts=[]
for side in [-1,1]:
    cx=side*.35;cy=-.51;cz=2.75
    eye=ellipsoid('A_Eye_L' if side<0 else 'A_Eye_R',(cx,cy,cz),(.306,.180,.333),eyeMat)
    # Vertex color iris/pupil is on a single curved eyeball, not a stack of discs.
    colors=eye.data.color_attributes.new(name='CoatColor',type='FLOAT_COLOR',domain='POINT')
    for v in eye.data.vertices:
        x,y,z=v.co;r=math.sqrt((x/.306)**2+(z/.333)**2);angle=math.atan2(z,x)
        c=rgb('E9DAB3')
        if y<0:
            if r<.77:c=rgb('0A1412')
            elif r<.92:
                fiber=.5+.5*math.sin(angle*53+math.sin(angle*13)*2)
                c=lerp(rgb('776D2B'),rgb('C7AF51'),fiber*.4+.35)
                c=lerp(rgb('283128'),c,min(1,(r-.77)/.035))
            else:c=lerp(rgb('484629'),rgb('E9DAB3'),(r-.92)/.08)
        colors.data[v.index].color=(*c,1)
    headParts.append(eye)
    # Broad eyelid patches join the socket to the head. Inner vertices slide
    # OVER the fixed eye sphere during Blink rather than scaling the eye itself.
    lv=[];lf=[];segments=96;bands=10
    def lid_co(i,j,close=0,content=0,plead=0,surprise=0):
        a=2*math.pi*i/segments;t=j/bands;co=math.cos(a);si=math.sin(a)
        rx=.291;rz=.307
        open_z=rz*si*(.87 if si>0 else 1)+side*.035*co
        if content:open_z*=1-.47*content
        if surprise:open_z*=1+.055*surprise
        if plead and si>0:open_z+=plead*.035*(-side*co)*si
        closed_z=-.026+.025*co*co+(.003 if si>0 else -.003)
        inner_z=open_z*(1-close)+closed_z*close
        x=cx+rx*co*(1+.32*t)
        z=cz+inner_z*(1-t)+(rz*1.38*si+side*.018*co)*t
        lens_r=((rx*co)/.306)**2+(inner_z/.333)**2
        inner_y=cy-.180*math.sqrt(max(.02,1-lens_r))-.014
        outer_y=face_y(x,z)+.012
        ease=t*t*(3-2*t)
        y=inner_y*(1-ease)+outer_y*ease-.010*math.sin(math.pi*t)
        return (x,y,z)
    for j in range(bands+1):
        for i in range(segments):lv.append(lid_co(i,j))
    for j in range(bands):
        for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;lf.append((a,a+segments,b+segments,b))
    lid=mesh(f'A_Eyelids_{side}',lv,lf,coat);paint(lid,True);lids.append(lid);headParts.append(lid)
    lid.shape_key_add(name='Basis')
    for name,args in [('Blink',{'close':1}),('Content',{'content':1}),('Plead',{'plead':1}),('Surprise',{'surprise':1})]:
        key=lid.shape_key_add(name=name)
        for j in range(bands+1):
            for i in range(segments):key.data[j*segments+i].co=lid_co(i,j,**args)
    # Restrained upper-left catchlight and a tiny secondary glimmer.
    for k,(dx,dz,radius) in enumerate([(-.082,.104,.027),(.070,-.096,.009)]):
        dep=.180*math.sqrt(1-(dx/.306)**2-(dz/.333)**2)
        glint=ellipsoid(f'A_Glint_{side}_{k}',(cx+dx,cy-dep-.006,cz+dz),(radius,.007,radius*1.18),shine)
        headParts.append(glint)

    # Curved ear shell made from concentric rounded triangular rings.
    ev=[];ef=[];rings=10;steps=72
    corners=[Vector((side*.34,.00,3.07)),Vector((side*.75,.05,3.72)),Vector((side*.82,.04,3.01))]
    if side<0:corners=list(reversed(corners))
    center=sum(corners,Vector())/3
    boundary=[]
    for i in range(steps):
        u=i/steps*3;idx=int(u);t=u-idx
        p=corners[idx];q=corners[(idx+1)%3]
        pos=p.lerp(q,t);pos.y-=.065*math.sin(math.pi*t)
        boundary.append(pos)
    for j in range(rings+1):
        t=.001+.999*j/rings
        for pos in boundary:
            co=center.lerp(pos,t);co.y=-.055-.095*t*t
            ev.append(tuple(co))
    for j in range(rings):
        for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;ef.append((a,b,b+steps,a+steps))
    ear=mesh(f'A_Ear_{side}',ev,ef,coat)
    attr=ear.data.color_attributes.new(name='CoatColor',type='FLOAT_COLOR',domain='POINT')
    for j in range(rings+1):
        for i in range(steps):
            t=j/rings;c=lerp(rgb('D59483'),orange,max(0,(t-.67)/.25));attr.data[j*steps+i].color=(*c,1)
    sol=ear.modifiers.new('EarThickness','SOLIDIFY');sol.thickness=.06
    bpy.context.view_layer.objects.active=ear;bpy.ops.object.modifier_apply(modifier=sol.name)
    sub=ear.modifiers.new('EarRound','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    earParts.append((side,ear))

    for j in range(3):
        obj=curve(f'A_Whisker_{side}_{j}',[(side*.25,-.772,2.30-j*.025),(side*.58,-.81,2.31-j*.055),(side*.98,-.69,2.36-j*.105)],.0023,whiskerMat);headParts.append(obj)
    mouth=curve(f'A_Mouth_{side}',[(0,face_y(0,2.27)-.009,2.27),(side*.055,face_y(side*.055,2.225)-.008,2.225),(side*.15,face_y(side*.15,2.245)-.009,2.245)],.0055,ink);headParts.append(mouth)

# Rounded triangular nose, integrated short philtrum.
nose_y=face_y(0,2.36)-.035
nose=mesh('A_Nose',[(-.087,nose_y,2.39),(.087,nose_y,2.39),(0,nose_y-.028,2.292),(0,nose_y+.055,2.36)],[(0,2,1),(0,1,3),(1,2,3),(2,0,3)],pink)
bevel=nose.modifiers.new('SoftNose','BEVEL');bevel.width=.030;bevel.segments=4
bpy.context.view_layer.objects.active=nose;bpy.ops.object.modifier_apply(modifier=bevel.name);headParts.append(nose)
philtrum=curve('A_Philtrum',[(0,nose_y-.025,2.31),(0,face_y(0,2.275)-.01,2.275)],.004,ink);headParts.append(philtrum)

# Directional, sculpted cheek fur locks; a few broad forms keep the silhouette
# feline at small sizes without a dense strand groom.
for side in [-1,1]:
    for k in range(3):
        vv=[];ff=[];rows=9;cols=12
        for j in range(rows+1):
            t=j/rows
            cx=side*(.64+.24*t);cz=2.62-k*.115-.095*t+.06*t*t
            cy=-.16-.08*t
            radius=.12*(1-t)**.85+.002
            for i in range(cols):
                angle=2*math.pi*i/cols
                vv.append((cx,cy+radius*.65*math.sin(angle),cz+radius*math.cos(angle)))
        for j in range(rows):
            for i in range(cols):a=j*cols+i;b=j*cols+(i+1)%cols;ff.append((a,b,b+cols,a+cols))
        obj=mesh(f'A_CheekLock_{side}_{k}',vv,ff,coat);paint(obj,True);headParts.append(obj)

# Shorten the neck against the selected reference without flattening the skull.
for obj in headParts:obj.location.z-=.24
for side,obj in earParts:obj.location.z-=.24

# Small deform rig with rigid head/ears and unified body weights.
bpy.ops.object.select_all(action='DESELECT')
data=bpy.data.armatures.new('A_Cat_Rig');rig=bpy.data.objects.new('A_Cat_Rig',data);cat.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,h,t,parent in [('Root',(0,0,0),(0,0,.3),None),('Body',(0,0,.6),(0,0,1.6),'Root'),('Head',(0,0,1.76),(0,0,2.56),'Body'),('EarL',(-.58,0,2.83),(-.70,0,3.31),'Head'),('EarR',(.58,0,2.83),(.70,0,3.31),'Head'),('Tail',(.35,.36,.52),(.65,.3,.2),'Body')]:
    bone=data.edit_bones.new(name);bone.head=h;bone.tail=t
    if parent:bone.parent=data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
def bind(obj,bone):
    obj.parent=rig;group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    arm=obj.modifiers.new('A_Rig','ARMATURE');arm.object=rig
for obj in headParts:bind(obj,'Head')
for side,ear in earParts:bind(ear,'EarL' if side<0 else 'EarR')
bind(body,'Body');bind(tail,'Tail')
rig['stage']='First sculpt with eyelid morphs and listening rig; art review required'

scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=150
for name in ['Head','EarL','EarR','Tail']:
    pose=rig.pose.bones[name];pose.rotation_mode='XYZ'
    poses=[(1,(0,0,0)),(18,(0,0,0)),(28,(0,.02,.015)),(46,(.025,-.04,.07)),(84,(.015,-.035,.05)),(114,(0,0,0)),(150,(0,0,0))]
    if name.startswith('Ear'):
        sign=-1 if name=='EarL' else 1
        poses=[(1,(0,0,0)),(14,(0,0,0)),(22,(-.075,0,sign*.07)),(48,(-.035,0,sign*.025)),(112,(0,0,0)),(150,(0,0,0))]
    if name=='Tail':poses=[(1,(0,0,0)),(38,(0,0,0)),(65,(0,.07,0)),(98,(0,-.025,0)),(150,(0,0,0))]
    for frame,rotation in poses:pose.rotation_euler=rotation;pose.keyframe_insert(data_path='rotation_euler',frame=frame)
rig.animation_data.action.name='Listen'
for lid in lids:
    key=lid.data.shape_keys.key_blocks['Blink']
    for frame,value in [(1,0),(106,0),(111,1),(115,1),(121,0),(150,0)]:key.value=value;key.keyframe_insert(data_path='value',frame=frame)
    lid.data.shape_keys.animation_data.action.name='Listen'
scene.frame_set(1)

# Shared studio cameras for real model verification.
groundMat=mat('StudioIvory','F4F0E8',.9)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));floor=move(bpy.context.object,studio);floor.name='A_StudioFloor';floor.data.materials.append(groundMat)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def camera(name,loc,target,ortho):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc;aim(obj,target);data.type='ORTHO';data.ortho_scale=ortho;return obj
front=camera('A_Camera_Front',(0,-9,3.3),(0,-.1,1.95),4.2)
face=camera('A_Camera_Face',(0,-9,2.56),(0,-.15,2.44),2.45)
three=camera('A_Camera_ThreeQuarter',(5,-8,3.5),(0,0,1.95),4.2)
sidecam=camera('A_Camera_Side',(9,-.15,3.1),(0,0,1.95),4.2)
for name,loc,power,size,color in [('Key',(-3,-4,6),500,3.0,(1,.91,.80)),('Fill',(3,-2,4),170,3.5,(.88,.93,1)),('Rim',(2,3,5),600,3,(1,.85,.68))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=loc;aim(obj,(0,0,2))
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.72,.62,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.camera=front
scene['production_stage']='A cat sculpt v1; integrated head, eyelid morphs, simple listening rig'
scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cat-a-sculpt-v1.blend')
bpy.ops.object.select_all(action='DESELECT')
for obj in cat.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/cat-a-sculpt-v1.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_morph=True,export_skins=True)
print('A_SCULPT_EXPORTED',len(cat.objects),sum(len(o.data.polygons) for o in cat.objects if o.type=='MESH'))
