import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;rig=bpy.data.objects['GLTF_created_0'];meshes=[o for o in scene.objects if o.type=='MESH' and o.name!='Icosphere']
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text().split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];s=s.replace("[('front'","[('back',(0,1,.25),(0,-.18,.18),.43,1),('front'");exec(s.replace('v18-','v28-').replace('(0,-.27,.295)','(0,-.27,.256)'))
scene.frame_set(1);camera.location=(.22,.8,.34);camera.data.ortho_scale=.20;camera.rotation_euler=(Vector((0,-.21,.245))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.cycles.samples=32
for name,a in [('coat-detail',0),('neck-pose',.14)]:
 b=rig.pose.bones['Wolf_Neck_TopSHJnt_14'];b.rotation_mode='XYZ';b.rotation_euler.z=a;bpy.context.view_layer.update();scene.render.filepath=str(OUT/('v28-'+name+'.png'));bpy.ops.render.render(write_still=True)
