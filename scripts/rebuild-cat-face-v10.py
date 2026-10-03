"""Face-focused V10: almond orbital openings, paired muzzle, philtrum and chin.

V8 geometry is removed, not deformed. Only its studio is reused. Neutral
materials expose the sculpture; eyes have separate curved iris/pupil surfaces.
"""
import bpy,bmesh,math,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-foundation-v8.blend')
scene=bpy.context.scene;cat=bpy.data.collections['CatA_Sculpt']
for obj in list(cat.objects):bpy.data.objects.remove(obj,do_unlink=True)
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def recalc(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    for p in o.data.polygons:p.use_smooth=True
def mesh(name,v,f):
    data=bpy.data.meshes.new(name);data.from_pydata(v,[],f);data.update()
    o=bpy.data.objects.new(name,data);cat.objects.link(o);recalc(o);return o
def mat(name,color,rough=.72):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough
    return m
clay=mat('A10_unpainted_clay',(.42,.39,.33));white=mat('A10_eye_ivory',(.55,.53,.44),.30)
iris=mat('A10_iris_neutral',(.18,.16,.105),.27);black=mat('A10_pupil',(.009,.010,.008),.15);nosemat=mat('A10_nasal_clay',(.24,.205,.18),.6)
def smoothstep(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def gauss(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def sample(points,t):
    q=max(0,min(.999999,t))*(len(points)-1);i=int(q);u=q-i
    a=Vector(points[max(0,i-1)]);b=Vector(points[i]);c=Vector(points[i+1]);d=Vector(points[min(len(points)-1,i+2)])
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
def sphere(name,loc,scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,location=loc);o=bpy.context.object;o.name=name
    for col in list(o.users_collection):col.objects.unlink(o)
    cat.objects.link(o);o.scale=scale;active(o);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);recalc(o);return o
def sweep(name,points,radii,steps=100,radial=32,rounded_end=False):
    v=[];f=[];centers=[]
    for j in range(steps):
        t=j/(steps-1);p=sample(points,t);d=(sample(points,min(1,t+.002))-sample(points,max(0,t-.002))).normalized()
        axis=Vector((0,0,1)) if abs(d.z)<.9 else Vector((0,1,0));u=d.cross(axis).normalized();w=d.cross(u).normalized()
        q=min(len(radii)-2,int(t*(len(radii)-1)));frac=t*(len(radii)-1)-q;r=radii[q]*(1-frac)+radii[q+1]*frac
        if rounded_end and t>.86:r=max(.005,.118*math.sqrt(max(0,1-((t-.86)/.14)**2)))
        centers.append((p.copy(),r))
        for i in range(radial):
            a=i*math.tau/radial;v.append(p+r*(u*math.cos(a)+w*math.sin(a)))
    for j in range(steps-1):
        for i in range(radial):a=j*radial+i;b=j*radial+(i+1)%radial;f.append((a,b,b+radial,a+radial))
    f.extend([tuple(range(radial-1,-1,-1)),tuple((steps-1)*radial+i for i in range(radial))])
    return mesh(name,v,f),centers

# Densely sampled smooth torso, so the final surface has no coarse level bands.
levels=[(.10,.38,.28,.19),(.28,.54,.40,.18),(.57,.62,.48,.16),(.90,.60,.48,.12),(1.25,.56,.45,.09),(1.56,.51,.40,.06),(1.84,.43,.34,.04),(2.08,.30,.27,.03),(2.19,.20,.20,.03)]
v=[];f=[];rows=145;radial=112
for j in range(rows):
    z,rx,ry,cy=sample(levels,j/(rows-1))
    for i in range(radial):
        a=i*math.tau/radial;v.append((rx*math.cos(a),cy+ry*math.sin(a),z))
for j in range(rows-1):
    for i in range(radial):a=j*radial+i;b=j*radial+(i+1)%radial;f.append((a,b,b+radial,a+radial))
f.extend([tuple(range(radial-1,-1,-1)),tuple((rows-1)*radial+i for i in range(radial))]);parts=[mesh('A10_Ribcage',v,f)]
for s in [-1,1]:
    parts.append(sphere('A10_Haunch',(s*.47,.10,.48),(.27,.37,.39)))
    leg,_=sweep('A10_Foreleg',[(s*.16,0,2.07),(s*.28,-.12,1.72),(s*.33,-.29,1.28),(s*.25,-.46,.27)],[.14,.18,.18,.155]);parts.append(leg)
    parts.append(sphere('A10_Forepaw',(s*.25,-.52,.15),(.205,.265,.14)))
    parts.append(sphere('A10_Hindpaw',(s*.54,-.13,.145),(.19,.26,.135)))

# Shorter, narrower cranium with an explicit chin and short paired muzzle.
# z, half-width, front-depth, rear-depth; cubic sampling is shared by all rings.
headlevels=[(1.98,.055,-.05,.10),(2.09,.25,-.27,.30),(2.24,.44,-.39,.43),(2.43,.64,-.44,.49),(2.64,.665,-.475,.50),(2.83,.61,-.42,.46),(2.98,.46,-.29,.34),(3.065,.21,-.12,.16),(3.085,.012,.025,.035)]

def facial(x,z,base):
    # Zygomatic planes sit lateral to the eyes. The muzzle pads sit lower,
    # farther forward, and closer to the midline than the cheek masses.
    cheeks=.12*(gauss(x,z,.49,2.47,.18,.16)+gauss(x,z,-.49,2.47,.18,.16))
    pads=.295*(gauss(x,z,.145,2.335,.128,.122)+gauss(x,z,-.145,2.335,.128,.122))
    bridge=.105*gauss(x,z,0,2.525,.105,.205)+.095*gauss(x,z,0,2.41,.10,.13)
    chin=.155*gauss(x,z,0,2.165,.20,.072)
    brow=.095*(gauss(x,z,.29,2.825,.245,.10)+gauss(x,z,-.29,2.825,.245,.10))
    lowerorbit=.085*(gauss(x,z,.29,2.485,.20,.09)+gauss(x,z,-.29,2.485,.20,.09))
    # Nasolabial valley separates the two whisker pads without separate balls.
    center_groove=.027*gauss(x,z,0,2.32,.028,.08)
    return base-cheeks-pads-bridge-chin-brow-lowerorbit+center_groove
v=[];f=[];rows=165;radial=160
for j in range(rows):
    z,rx,front,back=sample(headlevels,j/(rows-1))
    for i in range(radial):
        a=i*math.tau/radial;x=rx*math.cos(a);sa=math.sin(a)
        y=.025+(back-.025)*sa if sa>=0 else .025+(front-.025)*(-sa)
        if sa<0:y+=(-sa)**4*(facial(x,z,y)-y)
        v.append((x,y,z))
for j in range(rows-1):
    for i in range(radial):a=j*radial+i;b=j*radial+(i+1)%radial;f.append((a,b,b+radial,a+radial))
f.extend([tuple(range(radial-1,-1,-1)),tuple((rows-1)*radial+i for i in range(radial))]);parts.append(mesh('A10_Skull',v,f))

# Ear bowls: broad bases embedded in the skull, smaller outward-facing tips.
for s in [-1,1]:
    corners=[Vector((s*.27,-.015,2.92)),Vector((s*.62,.07,3.36)),Vector((s*.65,.10,2.82))]
    if s<0:corners.reverse()
    center=sum(corners,Vector())/3;v=[];f=[];steps=90;rings=14
    for j in range(rings+1):
        t=.001+.999*j/rings
        for i in range(steps):
            a=i/steps*3;k=int(a);p=corners[k].lerp(corners[(k+1)%3],a-k);co=center.lerp(p,t);co.y=-.012-.135*t*t;v.append(co)
    for j in range(rings):
        for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;f.append((a,b,b+steps,a+steps))
    ear=mesh('A10_Ear',v,f);active(ear)
    m=ear.modifiers.new('Ear_volume','SOLIDIFY');m.thickness=.06;bpy.ops.object.modifier_apply(modifier=m.name)
    m=ear.modifiers.new('Soft_ear','SUBSURF');m.levels=2;bpy.ops.object.modifier_apply(modifier=m.name);parts.append(ear)

active(parts[0])
for o in parts:o.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='A10_Continuous_Sculpt';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
m=body.modifiers.new('Continuous_surface','REMESH');m.mode='VOXEL';m.voxel_size=.011;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
m=body.modifiers.new('Surface_relax','SMOOTH');m.factor=.40;m.iterations=6;bpy.ops.object.modifier_apply(modifier=m.name)
body.data.materials.append(clay)
tipgroup=body.vertex_groups.new(name='Ear_tip_relax')
tipgroup.add([v.index for v in body.data.vertices if v.co.z>3.19],1,'REPLACE')
m=body.modifiers.new('Rounded_ear_tips','SMOOTH');m.vertex_group=tipgroup.name;m.factor=.7;m.iterations=20;bpy.ops.object.modifier_apply(modifier=m.name)
# A shaped orbital opening, not a circular sphere subtraction. The upper
# arc is higher than the lower arc; the lateral canthus rises slightly.
for sign in [-1,1]:
    vs=[];fs=[];N=128
    for y in [-1.10,-.19]:
        for i in range(N):
            a=i*math.tau/N;dx=.225*math.cos(a)
            z=2.65+(.170 if math.sin(a)>=0 else .139)*math.sin(a)+sign*dx*.10
            vs.append((sign*.29+dx,y,z))
    for i in range(N):fs.append((i,(i+1)%N,(i+1)%N+N,i+N))
    fs.extend([tuple(range(N-1,-1,-1)),tuple(range(N,2*N))])
    cut=mesh('Almond_orbit_cutter',vs,fs);active(body)
    m=body.modifiers.new('Shaped_orbit','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cut
    bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
# Soften the junction between the orbital wall and the facial surface.
active(body);m=body.modifiers.new('Orbital_edge_transition','BEVEL');m.width=.018;m.segments=3;m.limit_method='ANGLE';m.angle_limit=.65
bpy.ops.object.modifier_apply(modifier=m.name)
# Broad orbital skin patches bridge the opening to forehead and cheek.
# This is a sheet of facial skin, not a torus around an exposed eyeball.
lidparts=[]
def face_y(x,z):
    q=min(range(400),key=lambda j:abs(sample(headlevels,j/399)[0]-z))
    zz,rx,front,back=sample(headlevels,q/399)
    sa=math.sqrt(max(.001,1-(x/rx)**2));base=.025+(front-.025)*sa
    return base+sa**4*(facial(x,z,base)-base)
for sign in [-1,1]:
    vs=[];fs=[];N=128;R=18;cx=sign*.29;cz=2.65
    for j in range(R):
        t=j/(R-1)
        for i in range(N):
            a=i*math.tau/N;ca=math.cos(a);sn=math.sin(a)
            ix=.225*ca;iz=(.170 if sn>=0 else .139)*sn+sign*ix*.10
            ox=.345*ca;oz=.30*sn
            dx=ix*(1-t)+ox*t;dz=iz*(1-t)+oz*t
            x=cx+dx;z=cz+dz;base=face_y(x,z)
            e=1-(dx/.255)**2-(dz/.215)**2
            if e>0:base=min(base,-.405-.15*math.sqrt(e)-.016)
            # Embed the far perimeter inside existing continuous facial skin.
            y=base+.035*smoothstep(.78,1,t)
            vs.append((x,y,z))
    for j in range(R-1):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
    lid=mesh('A10_Orbital_skin',vs,fs);active(lid)
    m=lid.modifiers.new('Skin_thickness','SOLIDIFY');m.thickness=.038;m.offset=-1
    bpy.ops.object.modifier_apply(modifier=m.name);lidparts.append(lid)
active(body)
for lid in lidparts:lid.select_set(True)
bpy.ops.object.join()
m=body.modifiers.new('Unified_orbital_skin','REMESH');m.mode='VOXEL';m.voxel_size=.007;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
m=body.modifiers.new('Orbital_skin_relax','SMOOTH');m.factor=.35;m.iterations=3;bpy.ops.object.modifier_apply(modifier=m.name)
body.data.materials.clear();body.data.materials.append(clay)
for poly in body.data.polygons:poly.material_index=0
for vert in body.data.vertices:
    x,y,z=vert.co
    if y<-.30 and 2.10<z<2.45:
        # Two upper-lip branches descend from the philtrum, each describing
        # the lower contour of its whisker pad. No long upturned smile.
        t=min(1,abs(x)/.225)
        line=2.275-.028*math.sin(math.pi*t)-.012*t
        mouth=.027*math.exp(-((z-line)/.013)**2-(x/.23)**8)
        philtrum=.028*math.exp(-(x/.015)**2-((z-2.335)/.07)**6)
        sublip=.012*gauss(x,z,0,2.215,.18,.023)
        vert.co.y+=mouth+philtrum+sublip
    if y<-.52 and .16<z<.30:
        for s in [-1,1]:
            dx=x-s*.25
            if abs(dx)<.19:vert.co.z-=.012*sum(math.exp(-((dx-gap)/.012)**2) for gap in [-.095,0,.095])*math.exp(-((y+.67)/.09)**2)
body.data.update();recalc(body)

def eye_patch(name,cx,cz,radius,material):
    vs=[(cx,-.405-.15-.002,cz)];fs=[];steps=96;rings=16
    for j in range(1,rings+1):
        r=radius*j/rings
        for i in range(steps):
            a=i*math.tau/steps;dx=r*math.cos(a);dz=r*math.sin(a)
            y=-.405-.15*math.sqrt(max(.001,1-(dx/.255)**2-(dz/.215)**2))-.003
            vs.append((cx+dx,y,cz+dz))
    for i in range(steps):fs.append((0,1+i,1+(i+1)%steps))
    for j in range(rings-1):
        for i in range(steps):a=1+j*steps+i;b=1+j*steps+(i+1)%steps;fs.append((a,b,b+steps,a+steps))
    o=mesh(name,vs,fs);o.data.materials.append(material);return o
for s in [-1,1]:
    cx=s*.29;cz=2.65
    eye=sphere('A10_Eyeball',(cx,-.405,cz),(.255,.15,.215));eye.data.materials.append(white)
    eye_patch('A10_Iris',cx,cz,.163,iris)
    pupil=eye_patch('A10_Pupil',cx,cz,.124,black);pupil.location.y=-.003
    # The orbital edge belongs to the continuous skull. A separate torus rim
    # would read as goggles, so this construction has no added eyelid ring.

# Compact nasal leather, embedded deeply at the rear. Rounded triangular
# contour, shallow thickness, narrow lateral nostrils rather than a long bar.
nose=sphere('A10_Nose',(0,-.747,2.423),(.102,.045,.057))
for vert in nose.data.vertices:
    t=(vert.co.z/.057+1)/2;vert.co.x*=.35+.65*smoothstep(0,.70,t)
nose.data.materials.append(nosemat);nose.data.update()
for s in [-1,1]:
    cut=sphere('Nostril_cutter',(s*.071,-.793,2.428),(.019,.023,.010));cut.rotation_euler.y=s*-.3;active(nose)
    m=nose.modifiers.new('Nostril','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cut;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
recalc(nose)

# Tail attaches at the sacrum, then travels OUTSIDE the body. No voxel fusion
# along its length. The lifted curve maintains a visible gap from the haunch.
tailpoints=[(0,.53,.59),(-.40,.81,.49),(-.91,.79,.30),(-1.10,.28,.15),(-1.08,-.22,.145),(-.91,-.60,.14),(-.74,-.64,.14)]
tail,centers=sweep('A10_Free_Tail',tailpoints,[.10,.115,.13,.135,.135,.118,.118],steps=170,radial=40,rounded_end=True);tail.data.materials.append(clay)
# Root is deliberately inside the body. Outside the first 18%, test the
# tail surface vertices for body penetration, not just the camera silhouette.
bvh=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get());gaps=[];penetrations=0
for i,v in enumerate(tail.data.vertices):
    if i//40<31:continue
    hit,n,idx,d=bvh.find_nearest(v.co)
    if hit is not None:
        signed=(v.co-hit).dot(n);gaps.append(d)
        if signed<-.002:penetrations+=1
if penetrations:raise RuntimeError('Tail intersects body away from root: '+str(penetrations))
report={'tail_body_min_gap_after_root':min(gaps),'tail_body_penetrating_vertices_after_root':penetrations,'landmarks':{'eye_center_z':2.65,'eye_spacing':.58,'nose_z':2.423,'mouth_z':2.275,'head_max_width_design':1.33,'crown_z':3.085,'ear_tip_z':3.36},'meshes':{}}
for obj in [body,tail,nose]:
    bm=bmesh.new();bm.from_mesh(obj.data);stats={'vertices':len(bm.verts),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)};bm.free();report['meshes'][obj.name]=stats
    assert stats['nonmanifold']==0 and stats['volume']>0,obj.name
scene['production_stage']='V10 face study: shaped orbits, paired whisker pads and branched upper lip; unapproved clay.'
scene['reference_basis']='A original image as art direction; LOOF/CFA anatomy as structural checks. Not a photographic reconstruction.'
active(body)
camera=scene.camera;camera.location=(3,-8,3);camera.data.ortho_scale=3.8;camera.rotation_euler=(Vector((-.12,0,1.67))-camera.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v10.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in cat.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v10.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
(OUT/'v10-geometry-check.json').write_text(json.dumps(report,indent=2));print('V10_GEOMETRY_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,loc,target,scale in [('face',(0,-9,2.62),(0,-.15,2.62),1.75),('face-quarter',(4,-8,2.7),(0,-.15,2.60),1.85),('face-side',(9,-.04,2.65),(0,-.15,2.60),1.85),('full',(4,-8,3.1),(-.10,0,1.66),3.8)]:
    camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v10-review3-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V10_RENDERED',name,flush=True)
