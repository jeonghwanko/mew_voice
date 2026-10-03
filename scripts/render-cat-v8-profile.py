import bpy
from mathutils import Vector
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
c=scene.camera;c.data.ortho_scale=2.4;c.location=(9,-.2,2.24);c.rotation_euler=(Vector((0,-.2,2.24))-c.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath='C:/Users/turbo08/mew_voice/assets/avatar/blender/v8-profile-review.png'
bpy.ops.render.render(write_still=True)
print('FINAL_PROFILE_RENDERED',flush=True)
