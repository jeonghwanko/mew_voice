import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;rig=bpy.data.objects['GLTF_created_0'];meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
s=Path('C:/Users/turbo08/mew_voice/scripts/rework-bicolor-a-v1.py').read_text().split('# Review in the bind pose',1)[1].split('for name,loc,scale,target in',1)[0];exec('# Review in the bind pose'+s)
scene.cycles.samples=16;scene.render.resolution_x=600;scene.render.resolution_y=600
camera.location=(.34,-.9,.35);camera.data.ortho_scale=.17;camera.rotation_euler=(Vector((0,-.26,.312))-camera.location).to_track_quat('-Z','Y').to_euler()
for b in rig.pose.bones:
 if 'Jaw' in b.name:
  print('JAW',b.name);b.rotation_mode='XYZ';b.rotation_euler.x=.22
scene.render.filepath=str(OUT/'jaw-test.png');bpy.ops.render.render(write_still=True)
