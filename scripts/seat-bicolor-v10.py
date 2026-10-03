"""Seated rest-shape adaptation with the source UV, morphology and 40 joints.
Walking animation is archived, not reused on the changed bind pose.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
assert bpy.data.filepath.replace('\\','/').endswith('bicolor-a-v8.blend')
scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0'];meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
for o in scene.objects:
    if o.animation_data:
        if o.animation_data.action:o.animation_data.action.use_fake_user=True
        o.animation_data_clear()
    if o.type=='MESH' and o.data.shape_keys:
        o.data.shape_keys.animation_data_clear()
        for k in o.data.shape_keys.key_blocks:k.value=0
for pb in rig.pose.bones:pb.matrix_basis.identity()
bpy.context.view_layer.update()
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def lerp_table(t,knots):
    if t<=knots[0][0]:return Vector(knots[0][1])
    for (a,x),(b,y) in zip(knots,knots[1:]):
        if t<=b:return Vector(x).lerp(Vector(y),(t-a)/(b-a))
    return Vector(knots[-1][1])
oldpivot=rig.matrix_world@rig.data.bones['Wolf_ROOTSHJnt_38'].head_local
G=Matrix.Translation(Vector((0,.09,.10)))@Matrix.Rotation(math.radians(-40),4,'X')@Matrix.Translation(-oldpivot)
neck=rig.matrix_world@rig.data.bones['Wolf_Neck_TopSHJnt_14'].head_local;newneck=G@neck
counter=Matrix.Translation(newneck)@Matrix.Rotation(math.radians(40),4,'X')@Matrix.Translation(-newneck)
src_hind=[(0,(.045,.11,0)),(.017,(.062,.125,.017)),(.076,(.056,.174,.076)),(.169,(.047,.118,.169)),(.217,(.038,.136,.217))]
dst_hind=[(0,(.070,.010,0)),(.017,(.070,.025,.017)),(.076,(.078,.104,.032)),(.169,(.065,.035,.071)),(.217,(.038,.076,.086))]
tail_src=[(0,(0,.184,.244)),(.32,(.001,.255,.202)),(.60,(.010,.317,.174)),(1,(.027,.408,.164))]
tail_dst=[(0,(0,.132,.055)),(.32,(-.062,.15,.022)),(.65,(-.12,.085,.020)),(1,(-.14,-.010,.022))]
def deform(p,hw=None,tw=None):
    x,y,z=p;result=G@p
    head=max(smooth(.25,.29,z)*(1-smooth(-.20,-.155,y)),1-smooth(-.265,-.24,y))*smooth(.20,.24,z) if hw is None else hw;result=result.lerp(counter@result,head)
    front=(1-smooth(.135,.215,z))*(1-smooth(-.095,-.060,y))
    if front:result=result.lerp(Vector((x,y,z*1.16)),front)
    hind=(1-smooth(.190,.235,z))*smooth(.055,.105,y)
    if hind:
        source=lerp_table(z,src_hind);target=lerp_table(z,dst_hind);sign=1 if x>=0 else -1
        thigh=smooth(.10,.17,z);localx=abs(x)-source.x
        sv=lerp_table(z+.003,src_hind)-lerp_table(z-.003,src_hind);dv=lerp_table(z+.003,dst_hind)-lerp_table(z-.003,dst_hind)
        offset=Vector((localx*(1+.18*thigh),(y-source.y)*(1+.10*thigh),0))
        if sv.length>1e-7 and dv.length>1e-7:offset=sv.rotation_difference(dv)@offset
        target+=offset;target.x*=sign
        result=result.lerp(target,hind)
    tail=smooth(.18,.23,y) if tw is None else tw
    if tail:
        t=max(0,min(1,(y-.184)/.224));source=lerp_table(t,tail_src);target=lerp_table(t,tail_dst)
        before=lerp_table(max(0,t-.01),tail_dst);after=lerp_table(min(1,t+.01),tail_dst);direction=(after-before).normalized();side=Vector((direction.y,-direction.x,0)).normalized()
        target+=side*(x-source.x)+Vector((0,0,z-source.z));result=result.lerp(target,tail)
    return result

# Store all target world coordinates before changing any parent bone matrices.
targets={}
for o in meshes:
    keys=o.data.shape_keys.key_blocks if o.data.shape_keys else None
    weights=[]
    for v in o.data.vertices:
        names={o.vertex_groups[g.group].name:g.weight for g in v.groups}
        head=sum(w*(1 if 'Neck_Top' in n or 'Head_Jaw' in n else .65 if 'Neck_02' in n else .25 if 'Neck_01' in n else 0) for n,w in names.items())
        tail=sum(w for n,w in names.items() if 'Tail' in n)
        weights.append((min(1,head) if o.name!='Object_32' else 1,min(1,tail)))
    targets[o.name]=[[deform(o.matrix_world@v.co,*weights[i]) for i,v in enumerate(k.data)] for k in keys] if keys else [[deform(o.matrix_world@v.co,*weights[i]) for i,v in enumerate(o.data.vertices)]]
bone_targets={b.name:(deform(rig.matrix_world@b.head_local),deform(rig.matrix_world@b.tail_local)) for b in rig.data.bones}
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');inv=rig.matrix_world.inverted()
for b in rig.data.edit_bones:
    a,z=bone_targets[b.name];b.head=inv@a;b.tail=inv@z
    if b.length<.0001:b.tail.z+=.001
bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
for o in meshes:
    inv=o.matrix_world.inverted();data=targets[o.name]
    if o.data.shape_keys:
        for key,coords in zip(o.data.shape_keys.key_blocks,data):
            for v,p in zip(key.data,coords):v.co=inv@p
        for v,k in zip(o.data.vertices,o.data.shape_keys.key_blocks[0].data):v.co=k.co
    else:
        for v,p in zip(o.data.vertices,data[0]):v.co=inv@p
    o.data.update()
# Relax the compressed haunch surface, resampling all original morphs.
o=bpy.data.objects['mesh_0.001'];g=o.vertex_groups.new(name='Seated_haunch_relax')
for v in o.data.vertices:
    p=o.matrix_world@v.co;w=smooth(-.005,.05,p.y)*(1-smooth(.13,.21,p.z))
    if w:g.add([v.index],w,'REPLACE')
arm=[m for m in o.modifiers if m.type=='ARMATURE']
for m in arm:m.show_viewport=False
m=o.modifiers.new('Seated_surface_relax','SMOOTH');m.vertex_group=g.name;m.factor=.45;m.iterations=12
names=[k.name for k in o.data.shape_keys.key_blocks];positions=[];base=None
for name in names:
    for k in o.data.shape_keys.key_blocks:k.value=1 if name==k.name and name!='Basis' else 0
    bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();data=bpy.data.meshes.new_from_object(o.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
    positions.append([v.co.copy() for v in data.vertices])
    if base is None:base=data
    else:bpy.data.meshes.remove(data)
o.modifiers.remove(m);o.data=base
for name,values in zip(names,positions):
    key=o.shape_key_add(name=name)
    for v,p in zip(key.data,values):v.co=p
for m in arm:m.show_viewport=True
scene['stage']='Bicolor-derived A seated rest-shape study; retargeted skeleton; old walking clip not active.'
scene['source_credit']='Bicolor Cat by kenchoo; original Fripouille by guillaume bolis; CC BY 4.0. Modified head, eyes, seated mesh and bind joints.'
# A restrained head-only idle validates attachment to the new bind pose.
pb=rig.pose.bones['Wolf_Neck_TopSHJnt_14'];pb.rotation_mode='XYZ'
for frame,angle in [(1,0),(45,.012),(90,0),(135,-.01),(180,0)]:
    pb.rotation_euler=(0,angle,0);pb.keyframe_insert('rotation_euler',frame=frame)
rig.animation_data.action.name='A_Seated_Gentle_Head';scene.frame_start=1;scene.frame_end=180;scene.render.fps=30;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-seated-v10.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-seated-v10.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('SEATED_REST_SAVED',flush=True)
render=Path('C:/Users/turbo08/mew_voice/scripts/pose-bicolor-a-seated.py').read_text().split('for o in scene.objects:\n    if o.type==\'MESH\' and o not in meshes:o.hide_render=True',1)[1]
for o in scene.objects:
    if o.type=='MESH' and o not in meshes:o.hide_render=True
exec(render.replace('seated-v1-','seated-v10-').replace('samples=40','samples=16').replace('resolution_x=900','resolution_x=640').replace('resolution_y=1000','resolution_y=720'))
