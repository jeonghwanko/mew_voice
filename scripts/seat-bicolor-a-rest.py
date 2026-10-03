"""Seated rest-shape adaptation with the source UV, morphology and 40 joints.
Walking animation is archived, not reused on the changed bind pose.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
assert bpy.data.filepath.replace('\\','/').endswith('bicolor-a-v6.blend')
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
dst_hind=[(0,(.070,.010,0)),(.017,(.070,.025,.017)),(.076,(.078,.104,.032)),(.169,(.065,.026,.075)),(.217,(.038,.076,.072))]
tail_src=[(0,(0,.184,.244)),(.32,(.001,.255,.202)),(.60,(.010,.317,.174)),(1,(.027,.408,.164))]
tail_dst=[(0,(0,.132,.055)),(.32,(-.062,.15,.022)),(.65,(-.12,.085,.020)),(1,(-.14,-.010,.022))]
def deform(p):
    x,y,z=p;result=G@p
    head=smooth(.248,.284,z)*(1-smooth(-.240,-.185,y));result=result.lerp(counter@result,head)
    front=(1-smooth(.135,.215,z))*(1-smooth(-.095,-.060,y))
    if front:result=result.lerp(Vector((x,y,z*1.16)),front)
    hind=(1-smooth(.190,.235,z))*smooth(.055,.105,y)
    if hind:
        source=lerp_table(z,src_hind);target=lerp_table(z,dst_hind);sign=1 if x>=0 else -1
        thigh=smooth(.10,.17,z);localx=abs(x)-source.x
        target=Vector((sign*(target.x+localx*(1+.18*thigh)),target.y+(y-source.y)*(1+.10*thigh),target.z))
        result=result.lerp(target,hind)
    tail=smooth(.176,.204,y)*smooth(.10,.16,z)
    if tail:
        t=max(0,min(1,(y-.184)/.224));source=lerp_table(t,tail_src);target=lerp_table(t,tail_dst)
        before=lerp_table(max(0,t-.01),tail_dst);after=lerp_table(min(1,t+.01),tail_dst);direction=(after-before).normalized();side=Vector((direction.y,-direction.x,0)).normalized()
        target+=side*(x-source.x)+Vector((0,0,z-source.z));result=result.lerp(target,tail)
    return result

# Store all target world coordinates before changing any parent bone matrices.
targets={}
for o in meshes:
    keys=o.data.shape_keys.key_blocks if o.data.shape_keys else None
    targets[o.name]=[[deform(o.matrix_world@v.co) for v in k.data] for k in keys] if keys else [[deform(o.matrix_world@v.co) for v in o.data.vertices]]
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
scene['stage']='Bicolor-derived A seated rest-shape study; retargeted skeleton; old walking clip not active.'
scene['source_credit']='Bicolor Cat by kenchoo; original Fripouille by guillaume bolis; CC BY 4.0. Modified head, eyes, seated mesh and bind joints.'
# A restrained head-only idle validates attachment to the new bind pose.
pb=rig.pose.bones['Wolf_Neck_TopSHJnt_14'];pb.rotation_mode='XYZ'
for frame,angle in [(1,0),(45,.012),(90,0),(135,-.01),(180,0)]:
    pb.rotation_euler=(0,angle,0);pb.keyframe_insert('rotation_euler',frame=frame)
rig.animation_data.action.name='A_Seated_Gentle_Head';scene.frame_start=1;scene.frame_end=180;scene.render.fps=30;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-seated-v3.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-seated-v3.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('SEATED_REST_SAVED',flush=True)
render=Path('C:/Users/turbo08/mew_voice/scripts/pose-bicolor-a-seated.py').read_text().split('for o in scene.objects:\n    if o.type==\'MESH\' and o not in meshes:o.hide_render=True',1)[1]
for o in scene.objects:
    if o.type=='MESH' and o not in meshes:o.hide_render=True
exec(render.replace('seated-v1-','seated-v3-'))
