"""New silhouette and facial construction from A reference landmarks.

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
clay=mat('A9_unpainted_clay',(.42,.39,.33));white=mat('A9_eye_ivory',(.55,.53,.44),.30)
iris=mat('A9_iris_neutral',(.18,.16,.105),.27);black=mat('A9_pupil',(.009,.010,.008),.15);nosemat=mat('A9_nasal_clay',(.24,.205,.18),.6)
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
f.extend([tuple(range(radial-1,-1,-1)),tuple((rows-1)*radial+i for i in range(radial))]);parts=[mesh('A9_Ribcage',v,f)]
for s in [-1,1]:
    parts.append(sphere('A9_Haunch',(s*.47,.10,.48),(.27,.37,.39)))
    leg,_=sweep('A9_Foreleg',[(s*.16,0,2.07),(s*.28,-.12,1.72),(s*.33,-.29,1.28),(s*.25,-.46,.27)],[.14,.18,.18,.155]);parts.append(leg)
    parts.append(sphere('A9_Forepaw',(s*.25,-.52,.15),(.205,.265,.14)))
    parts.append(sphere('A9_Hindpaw',(s*.54,-.13,.145),(.19,.26,.135)))

# Shorter, narrower cranium with an explicit chin and short paired muzzle.
# z, half-width, front-depth, rear-depth; cubic sampling is shared by all rings.
headlevels=[(1.98,.055,-.05,.10),(2.09,.28,-.34,.30),(2.24,.49,-.48,.43),(2.43,.66,-.47,.49),(2.64,.69,-.43,.50),(2.83,.63,-.39,.46),(2.98,.46,-.29,.34),(3.065,.21,-.12,.16),(3.085,.012,.025,.035)]
def facial(x,z,base):
    cheeks=.075*(gauss(x,z,.47,2.43,.20,.19)+gauss(x,z,-.47,2.43,.20,.19))
    pads=.105*(gauss(x,z,.115,2.315,.12,.105)+gauss(x,z,-.115,2.315,.12,.105))
    bridge=.065*gauss(x,z,0,2.50,.12,.22)
    chin=.065*gauss(x,z,0,2.16,.20,.075)
    brow=.09*(gauss(x,z,.276,2.78,.22,.12)+gauss(x,z,-.276,2.78,.22,.12))
    lowerorbit=.065*(gauss(x,z,.276,2.45,.18,.12)+gauss(x,z,-.276,2.45,.18,.12))
    return base-cheeks-pads-bridge-chin-brow-lowerorbit
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
f.extend([tuple(range(radial-1,-1,-1)),tuple((rows-1)*radial+i for i in range(radial))]);parts.append(mesh('A9_Skull',v,f))

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
    ear=mesh('A9_Ear',v,f);active(ear)
    m=ear.modifiers.new('Ear_volume','SOLIDIFY');m.thickness=.06;bpy.ops.object.modifier_apply(modifier=m.name)
    m=ear.modifiers.new('Soft_ear','SUBSURF');m.levels=2;bpy.ops.object.modifier_apply(modifier=m.name);parts.append(ear)

active(parts[0])
for o in parts:o.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='A9_Continuous_Sculpt';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
m=body.modifiers.new('Continuous_surface','REMESH');m.mode='VOXEL';m.voxel_size=.011;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
m=body.modifiers.new('Surface_relax','SMOOTH');m.factor=.40;m.iterations=6;bpy.ops.object.modifier_apply(modifier=m.name)
body.data.materials.append(clay)
tipgroup=body.vertex_groups.new(name='Ear_tip_relax')
tipgroup.add([v.index for v in body.data.vertices if v.co.z>3.19],1,'REPLACE')
m=body.modifiers.new('Rounded_ear_tips','SMOOTH');m.vertex_group=tipgroup.name;m.factor=.7;m.iterations=20;bpy.ops.object.modifier_apply(modifier=m.name)
# Real inset eye sockets, instead of two painted disks on a flat head.
for s in [-1,1]:
    cut=sphere('Socket_cutter',(s*.276,-.28,2.625),(.181,.300,.193));active(body)
    m=body.modifiers.new('Recessed_orbit','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cut;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
for vert in body.data.vertices:
    x,y,z=vert.co
    if y<-.30 and 2.14<z<2.41:
        line=2.253+.027*(min(1,abs(x)/.19))**1.5
        mouth=.014*math.exp(-((z-line)/.010)**2-(x/.21)**6)
        philtrum=.016*math.exp(-(x/.011)**2-((z-2.32)/.064)**4)
        vert.co.y+=mouth+philtrum
    if y<-.52 and .16<z<.30:
        for s in [-1,1]:
            dx=x-s*.25
            if abs(dx)<.19:vert.co.z-=.012*sum(math.exp(-((dx-gap)/.012)**2) for gap in [-.095,0,.095])*math.exp(-((y+.67)/.09)**2)
body.data.update();recalc(body)

def eye_patch(name,cx,cz,radius,material):
    vs=[(cx,-.22-.215-.002,cz)];fs=[];steps=96;rings=16
    for j in range(1,rings+1):
        r=radius*j/rings
        for i in range(steps):
            a=i*math.tau/steps;dx=r*math.cos(a);dz=r*math.sin(a)
            y=-.22-.215*math.sqrt(max(.001,1-(dx/.183)**2-(dz/.19)**2))-.003
            vs.append((cx+dx,y,cz+dz))
    for i in range(steps):fs.append((0,1+i,1+(i+1)%steps))
    for j in range(rings-1):
        for i in range(steps):a=1+j*steps+i;b=1+j*steps+(i+1)%steps;fs.append((a,b,b+steps,a+steps))
    o=mesh(name,vs,fs);o.data.materials.append(material);return o
for s in [-1,1]:
    cx=s*.276;cz=2.625
    eye=sphere('A9_Eyeball',(cx,-.22,cz),(.183,.215,.19));eye.data.materials.append(white)
    eye_patch('A9_Iris',cx,cz,.141,iris)
    pupil=eye_patch('A9_Pupil',cx,cz,.112,black);pupil.location.y=-.003
    # The orbital edge belongs to the continuous skull. A separate torus rim
    # would read as goggles, so this construction has no added eyelid ring.

# Compact nasal leather, embedded deeply at the rear. Rounded triangular
# contour, shallow thickness, narrow lateral nostrils rather than a long bar.
nose=sphere('A9_Nose',(0,-.604,2.389),(.083,.070,.046))
for vert in nose.data.vertices:
    t=(vert.co.z/.046+1)/2;vert.co.x*=.35+.65*smoothstep(0,.70,t)
nose.data.materials.append(nosemat);nose.data.update()
for s in [-1,1]:
    cut=sphere('Nostril_cutter',(s*.056,-.665,2.391),(.017,.021,.008));cut.rotation_euler.y=s*-.3;active(nose)
    m=nose.modifiers.new('Nostril','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cut;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
recalc(nose)

# Tail attaches at the sacrum, then travels OUTSIDE the body. No voxel fusion
# along its length. The lifted curve maintains a visible gap from the haunch.
tailpoints=[(0,.53,.59),(-.40,.81,.49),(-.91,.79,.30),(-1.10,.28,.15),(-1.08,-.22,.145),(-.91,-.60,.14),(-.74,-.64,.14)]
tail,centers=sweep('A9_Free_Tail',tailpoints,[.10,.115,.13,.135,.135,.118,.118],steps=170,radial=40,rounded_end=True);tail.data.materials.append(clay)
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
report={'tail_body_min_gap_after_root':min(gaps),'tail_body_penetrating_vertices_after_root':penetrations,'landmarks':{'eye_center_z':2.625,'eye_spacing':.552,'nose_z':2.389,'mouth_z':2.253,'head_max_width_design':1.38,'crown_z':3.085,'ear_tip_z':3.36},'meshes':{}}
for obj in [body,tail,nose]:
    bm=bmesh.new();bm.from_mesh(obj.data);stats={'vertices':len(bm.verts),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)};bm.free();report['meshes'][obj.name]=stats
    assert stats['nonmanifold']==0 and stats['volume']>0,obj.name
scene['production_stage']='V9 rebuilt silhouette and landmark-based face; free tail clearance verified; unapproved clay sculpt.'
scene['reference_basis']='A original image as art direction; LOOF/CFA anatomy as structural checks. Not a photographic reconstruction.'
active(body)
camera=scene.camera;camera.location=(3,-8,3);camera.data.ortho_scale=3.8;camera.rotation_euler=(Vector((-.12,0,1.67))-camera.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v9.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in cat.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v9.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
(OUT/'v9-geometry-check.json').write_text(json.dumps(report,indent=2));print('V9_GEOMETRY_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,loc,target,scale in [('front',(0,-9,2.8),(-.10,0,1.66),3.8),('quarter',(4,-8,3.1),(-.10,0,1.66),3.8),('side',(9,0,2.8),(0,0,1.66),3.8),('back',(0,9,2.8),(-.10,0,1.66),3.8),('face',(0,-9,2.60),(0,-.15,2.60),1.85),('tail-top',(-.2,0,9),(-.2,0,.15),2.85)]:
    camera.data.ortho_scale=scale;camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v9-final-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V9_RENDERED',name,flush=True)
