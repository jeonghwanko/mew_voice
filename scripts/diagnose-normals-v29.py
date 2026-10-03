import bpy
from pathlib import Path
from mathutils import Vector
scene=bpy.context.scene;scene.frame_set(1);OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');rig=bpy.data.objects['GLTF_created_0'];meshes=[o for o in scene.objects if o.type=='MESH' and o.name!='Icosphere']
head=bpy.data.objects['mesh_0.001'];print('CUSTOM_NORMALS',head.data.has_custom_normals);head.data.normals_split_custom_set([(0,0,0)]*len(head.data.loops));head.data.update()
m=bpy.data.materials.new('ClayDiagnostic');m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.35,.35,.35,1);bpy.data.objects['mesh_0.001'].data.materials[0]=m
s=Path('scripts/rebuild-bicolor-v18.py').read_text().split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1].split('for name,loc,target,scale,frame in',1)[0];exec(s)
camera.location=(.22,.8,.34);camera.data.ortho_scale=.20;camera.rotation_euler=(Vector((0,-.21,.245))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'v29-normal-diagnostic.png');bpy.ops.render.render(write_still=True)
