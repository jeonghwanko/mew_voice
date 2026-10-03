"""Art-directed sitting pose on the original 40-joint Bicolor rig."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework')
assert bpy.data.filepath.replace('\\','/').endswith('bicolor-a-v5.blend')
scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0']
meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
for o in scene.objects:
    if o.animation_data:
        if o.animation_data.action:o.animation_data.action.use_fake_user=True
        o.animation_data_clear()
    if o.type=='MESH' and o.data.shape_keys:
        o.data.shape_keys.animation_data_clear()
        for k in o.data.shape_keys.key_blocks:k.value=0
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.matrix_basis.identity()
bpy.context.view_layer.update();root=rig.pose.bones['Wolf_ROOTSHJnt_38'];pivot=rig.matrix_world@root.head
transform=Matrix.Translation(Vector((0,.09,.10)))@Matrix.Rotation(math.radians(-40),4,'X')@Matrix.Translation(-pivot)
root.matrix=rig.matrix_world.inverted()@transform@rig.matrix_world@root.matrix;bpy.context.view_layer.update()
ratios={}
def orient(name,head,tail):
    pb=rig.pose.bones[name];bone=pb.bone;head=rig.matrix_world.inverted()@Vector(head);tail=rig.matrix_world.inverted()@Vector(tail);v=tail-head
    q=(bone.tail_local-bone.head_local).rotation_difference(v)@bone.matrix_local.to_quaternion()
    ratio=v.length/bone.length;ratios[name]=ratio
    pb.matrix=Matrix.Translation(head)@q.to_matrix().to_4x4()@Matrix.Diagonal((1,ratio,1,1));bpy.context.view_layer.update()
for sign,side in [(-1,'r'),(1,'l')]:
    hip=rig.matrix_world@rig.pose.bones[f'Wolf_{side}_FrontLeg_HipSHJnt_'+('4' if side=='l' else '10')].head
    names=[f'Wolf_{side}_FrontLeg_{part}SHJnt_{idx}' for part,idx in zip(['Hip','Knee','Ankle','Ball','Toe'],[4,3,2,1,0] if side=='l' else [10,9,8,7,6])]
    elbow=(sign*.034,hip.y+.014,.147);ankle=(sign*.033,hip.y-.006,.040)
    orient(names[0],hip,elbow);orient(names[1],elbow,ankle);orient(names[2],ankle,(sign*.033,hip.y-.012,.007))
    orient(names[3],(sign*.033,hip.y-.023,.012),(sign*.033,hip.y-.068,.012))
    orient(names[4],(sign*.033,hip.y-.066,0),(sign*.033,hip.y-.111,0))
    names=[f'Wolf_{side}_HindLeg_{part}SHJnt_{idx}' for part,idx in zip(['Hip','Knee1','Knee2','Ankle','Ball','Toe'],[27,26,25,24,23,22] if side=='l' else [33,32,31,30,29,28])]
    hip=rig.matrix_world@rig.pose.bones[names[0]].head;knee=(sign*.061,.028,.082);hock=(sign*.073,.107,.020);ankle=(sign*.070,.032,.014)
    orient(names[0],hip,knee);orient(names[1],knee,hock);orient(names[2],hock,ankle)
    orient(names[3],ankle,(sign*.070,.032,.002));orient(names[4],(sign*.070,.018,.010),(sign*.070,-.007,.010));orient(names[5],(sign*.070,-.007,.003),(sign*.070,-.032,.003))
tailnames=['Wolf_Tail_01_02SHJnt_37','Wolf_Tail_01_03SHJnt_36','Wolf_Tail_01_04SHJnt_35','Wolf_Tail_01_05SHJnt_34']
p=rig.matrix_world@rig.pose.bones[tailnames[0]].head
for name,end in zip(tailnames,[(-.065,.15,.025),(-.12,.105,.020),(-.145,.055,.018),(-.145,.005,.021)]):orient(name,p,end);p=Vector(end)
# Face forward while retaining the raised chest and bent neck.
pb=rig.pose.bones['Wolf_Neck_TopSHJnt_14'];p=rig.matrix_world@pb.head;direction=rig.matrix_world.to_3x3()@(pb.bone.tail_local-pb.bone.head_local);orient(pb.name,p,p+direction)
bpy.context.view_layer.update()
for frame in [1,90]:
    scene.frame_set(frame)
    for pb in rig.pose.bones:
        pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame);pb.keyframe_insert('scale',frame=frame)
rig.animation_data.action.name='A_Seated_Pose';scene.frame_start=1;scene.frame_end=90;scene.render.fps=30;scene.frame_set(1)
scene['stage']='Bicolor-derived A seated rig study. Original standing action retained in source archive.'
(OUT/'bicolor-a-seated-v2-check.json').write_text(json.dumps({'bone_length_ratios':ratios,'rig_joints':len(rig.data.bones)},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-seated-v2.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-seated-v2.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True,export_extras=True)
print('SEATED_SAVED',flush=True)
for o in scene.objects:
    if o.type=='MESH' and o not in meshes:o.hide_render=True
scene.world=bpy.data.worlds.new('Seated_review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.70,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
for loc,power,size in [((-.3,-.65,.7),22,.45),((.35,-.2,.45),8,.35),((0,.25,.5),14,.35)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,-.06,.20))-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,loc,target,scale in [('front',(0,-1,.24),(0,-.035,.22),.50),('quarter',(.65,-1,.40),(0,-.035,.22),.50),('side',(1,-.04,.28),(0,-.035,.22),.50),('back',(0,1,.24),(0,-.035,.22),.50)]:
    camera.location=loc;camera.data.ortho_scale=scale;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/('bicolor-a-seated-v2-'+name+'.png'));bpy.ops.render.render(write_still=True);print('SEATED_RENDER',name,flush=True)
