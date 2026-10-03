import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;rig=bpy.data.objects['GLTF_created_0'];meshes=[bpy.data.objects[n] for n in ['mesh_0','mesh_0.001','Object_32']]
s=Path('C:/Users/turbo08/mew_voice/scripts/rework-bicolor-a-v1.py').read_text().split('# Review in the bind pose',1)[1].split('for name,loc,scale,target in',1)[0]
exec('# Review in the bind pose'+s);scene.cycles.samples=16;scene.render.resolution_x=600;scene.render.resolution_y=600
camera.location=(0,-1,.315);camera.data.ortho_scale=.17;camera.rotation_euler=(Vector((0,-.275,.312))-camera.location).to_track_quat('-Z','Y').to_euler()
for index in range(3):
 for o in meshes:
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=1 if k.name=='target_'+str(index) else 0
 scene.render.filepath=str(OUT/('morph-study-'+str(index)+'.png'));bpy.ops.render.render(write_still=True)

