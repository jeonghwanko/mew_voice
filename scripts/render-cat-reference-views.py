"""Orthographic reference renders of the separately licensed Bicolor Cat.
Not our A sculpt, not a veterinary measurement, and not a new generated image.
"""
import bpy,math
from mathutils import Vector
from pathlib import Path
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar')
OUT=ROOT/'references/anatomy'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'realistic/bicolor-cat.glb'))
scene=bpy.context.scene;scene.frame_set(1)
for o in scene.objects:
    if o.animation_data:o.animation_data_clear()
meshes=[o for o in scene.objects if o.type=='MESH']
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
pts=[]
for o in meshes:
    evaluated=o.evaluated_get(deps);m=evaluated.to_mesh()
    pts.extend(evaluated.matrix_world@v.co for v in m.vertices)
    evaluated.to_mesh_clear()
lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)));center=(lo+hi)/2
height=hi.z-lo.z;extent=max(hi.x-lo.x,hi.y-lo.y,height);center.z+=extent*.095
print('REFERENCE_BOUNDS',lo[:],hi[:],flush=True)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=extent*.43
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for loc,energy,size in [((1,-2,3),450,3),((-2,1,2),250,3)]:
    bpy.ops.object.light_add(type='AREA',location=center+Vector(loc)*extent)
    lamp=bpy.context.object;lamp.data.energy=energy*extent*extent;lamp.data.shape='DISK';lamp.data.size=size*extent;lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
for name,direction in [('front',(0,-1,0)),('side',(1,0,0)),('back',(0,1,0))]:
    camera.location=center+Vector(direction)*extent*3;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('bicolor-'+name+'.png'));bpy.ops.render.render(write_still=True)
    print('REFERENCE_RENDERED',name,flush=True)
