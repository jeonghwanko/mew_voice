"""V10 -> V11: reduce orbital projection, soften muzzle, test blink and head tilt.
This is a clay motion study, not the final facial rig or mobile LOD.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender')
assert bpy.data.filepath.replace('\\','/').endswith('cat-a-foundation-v10.blend')
scene=bpy.context.scene;cat=bpy.data.collections['CatA_Sculpt']
body=bpy.data.objects['A10_Continuous_Sculpt']
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def gaussian(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
def normals(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    for p in o.data.polygons:p.use_smooth=True
for v in body.data.vertices:
    x,y,z=v.co
    if y<-.20 and 2.28<z<3.08:
        orbital=max(gaussian(x,z,s*.29,2.64,.34,.26) for s in [-1,1])
        bag=max(gaussian(x,z,s*.29,2.475,.23,.09) for s in [-1,1])
        fade=smooth(2.28,2.43,z)*(1-smooth(2.94,3.08,z))
        v.co.y+=(.072*orbital+.012*bag)*smooth(-.20,-.38,y)*fade
        # Thin the outer muzzle ridge and soften the transition to the nose.
        v.co.y-=.009*gaussian(x,z,0,2.405,.13,.075)
body.data.update()
active(body)
g=body.vertex_groups.new(name='V11_orbital_soften')
for v in body.data.vertices:
    x,y,z=v.co
    if y<-.20:
        w=max(gaussian(x,z,s*.29,2.60,.31,.24) for s in [-1,1])
        if w>.03:g.add([v.index],w,'REPLACE')
m=body.modifiers.new('Softer_orbits','SMOOTH');m.vertex_group=g.name;m.factor=.45;m.iterations=12;bpy.ops.object.modifier_apply(modifier=m.name)
# A smaller depth envelope leaves a thinner lid without exposing the globe.
for v in body.data.vertices:
    x,y,z=v.co
    if y>-.20 or not 2.38<z<2.92:continue
    for sign in [-1,1]:
        dx=x-sign*.29;dz=z-2.65;opening=dz-sign*dx*.1
        bound=(.170 if opening>=0 else .139)*math.sqrt(max(0,1-(dx/.225)**2))
        edge=max(abs(dx)-.225,abs(opening)-bound)
        blend=smooth(-.025,.015,edge);e=1-(dx/.255)**2-(dz/.215)**2
        if e>-.12 and blend>0:
            target=-.365-.11*math.sqrt(max(0,e))-.028
            w=blend*(1 if e>=0 else 1+e/.12)
            v.co.y=min(v.co.y,v.co.y*(1-w)+target*w)
body.data.update();normals(body)
for o in list(cat.objects):
    if o.name.startswith('A10_Eyeball'):
        for v in o.data.vertices:v.co.y*=.11/.15
        o.location.y+=.040;o.data.update()
    elif o.name.startswith(('A10_Iris','A10_Pupil')):
        cx=.29 if sum(v.co.x for v in o.data.vertices)>0 else -.29
        radial=1.095 if o.name.startswith('A10_Iris') else 1.07
        for v in o.data.vertices:
            dx=(v.co.x-cx)*radial;dz=(v.co.z-2.65)*radial
            v.co.x=cx+dx;v.co.z=2.65+dz
            v.co.y=-.365-.11*math.sqrt(max(.001,1-(dx/.255)**2-(dz/.215)**2))-.003
        normals(o)
    elif o.name=='A10_Nose':
        for v in o.data.vertices:v.co.y*=.80
        o.location.y+=.014;o.data.update()
    o.name=o.name.replace('A10','A11')
# Reduce redundant sculpt triangles before storing a full mesh morph.
active(body);m=body.modifiers.new('Motion_study_density','DECIMATE');m.ratio=.45;m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
normals(body)
# Independent eyelid sheets slide over the globe while the cheek remains
# stable. Four sampled closure shapes follow its curvature during interpolation.
blink_keys=[]
for sign in [-1,1]:
    for upper in [True,False]:
        N=81;R=18;faces=[]
        def lid_positions(t):
            vs=[]
            for j in range(R):
                r=j/(R-1)
                for i in range(N):
                    dx=-.250+.500*i/(N-1);arc=math.sqrt(max(.001,1-(dx/.253)**2))
                    outer=(.219 if upper else -.219)*arc
                    opened=(.187 if upper else -.157)*arc+sign*dx*.10
                    closed=(-.030 if upper else -.023)*arc+sign*dx*.10
                    inner=opened*(1-t)+closed*t;dz=outer*(1-r)+inner*r
                    e=1-(dx/.255)**2-(dz/.215)**2
                    y=-.365-.11*math.sqrt(max(0,e))-.014
                    # The upper lid overlaps the lower lid, leaving a shallow
                    # curved crease instead of a featureless closed cap.
                    y+=(-.007 if upper else .003)*smooth(.80,1,r)*smooth(0,1,t)
                    vs.append((sign*.29+dx,y,2.65+dz))
            return vs
        for j in range(R-1):
            for i in range(N-1):
                a=j*N+i;f=(a,a+1,a+1+N,a+N);faces.append(tuple(reversed(f)) if upper else f)
        data=bpy.data.meshes.new('A11_LidSurface');data.from_pydata(lid_positions(0),[],faces);data.update()
        lid=bpy.data.objects.new('A11_UpperLid' if upper else 'A11_LowerLid',data);cat.objects.link(lid)
        data.materials.append(body.data.materials[0]);normals(lid)
        lid.shape_key_add(name='Basis');keys=[]
        for k,name in enumerate(['Blink25','Blink50','Blink75','SlowBlink'],1):
            key=lid.shape_key_add(name=name)
            for v,co in zip(key.data,lid_positions(k/4)):v.co=co
            keys.append(key)
        blink_keys.append(keys)
# A two-bone test rig: soft neck weights prevent a detached rotating head.
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name='A11_Motion_Rig'
for c in list(rig.users_collection):c.objects.unlink(rig)
cat.objects.link(rig)
root=rig.data.edit_bones[0];root.name='Root';root.head=(0,0,.1);root.tail=(0,0,1.85)
head=rig.data.edit_bones.new('Head');head.head=(0,0,1.95);head.tail=(0,0,2.8);head.parent=root
bpy.ops.object.mode_set(mode='OBJECT')
for o in list(cat.objects):
    if o.type!='MESH':continue
    rootg=o.vertex_groups.new(name='Root');headg=o.vertex_groups.new(name='Head')
    for v in o.data.vertices:
        w=smooth(1.78,2.15,v.co.z) if o==body else (0 if 'Tail' in o.name else 1)
        if w:headg.add([v.index],w,'REPLACE')
        if w<1:rootg.add([v.index],1-w,'REPLACE')
    mod=o.modifiers.new('Gentle_head_motion','ARMATURE');mod.object=rig
scene.render.fps=30;scene.frame_start=1;scene.frame_end=150
for frame in range(1,151):
    t=smooth(39,48,frame) if frame<=48 else (1 if frame<=54 else 1-smooth(54,66,frame))
    for keys in blink_keys:
        for k,key in enumerate(keys,1):
            key.value=max(0,1-abs(t*4-k));key.keyframe_insert('value',frame=frame)
pb=rig.pose.bones['Head'];pb.rotation_mode='XYZ'
for frame,rx,ry in [(1,0,0),(35,.016,.035),(70,.012,.050),(110,0,-.020),(150,0,0)]:
    pb.rotation_euler=(rx,ry,0);pb.keyframe_insert('rotation_euler',frame=frame)
scene.frame_set(1)
scene['production_stage']='V11 clay expression study: thinner orbits, larger iris, slow blink morph and two-bone head motion. Not final rig.'
report={}
for o in [body,bpy.data.objects['A11_Nose'],bpy.data.objects['A11_Free_Tail']]:
    bm=bmesh.new();bm.from_mesh(o.data);stats={'vertices':len(bm.verts),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)};bm.free()
    assert stats['nonmanifold']==0 and stats['volume']>0,o.name
    report[o.name]=stats
(OUT/'v11-geometry.json').write_text(json.dumps(report,indent=2))
active(body);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cat-a-foundation-v11.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in cat.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cat-a-foundation-v11.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_morph_normal=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=16)
print('V11_SAVED',json.dumps(report),flush=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;camera=scene.camera
for name,loc,frame in [('face',(0,-9,2.65),1),('quarter',(4,-8,2.7),1),('side',(9,-.04,2.65),1),('blink',(0,-9,2.65),50),('half-blink',(4,-8,2.7),44)]:
    scene.frame_set(frame);camera.data.ortho_scale=1.85;camera.location=loc;camera.rotation_euler=(Vector((0,-.15,2.60))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('v11-final-'+name+'.png'));bpy.ops.render.render(write_still=True);print('V11_RENDER',name,flush=True)
