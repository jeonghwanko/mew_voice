import bpy
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.bake.margin=8
for name in ['A_SeatedBody','A_Tail']:
 o=bpy.data.objects[name];bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 mat=o.data.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');source=bs.inputs['Base Color'].links[0].from_socket
 coord=ns.new('ShaderNodeTexCoord');mapping=ns.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(2,2,.25);ls.new(coord.outputs['Generated'],mapping.inputs[0]);noise=ns.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180;noise.inputs['Detail'].default_value=2;ls.new(mapping.outputs[0],noise.inputs['Vector'])
 ramp=ns.new('ShaderNodeMapRange');ramp.inputs['To Min'].default_value=.80;ramp.inputs['To Max'].default_value=1;ls.new(noise.outputs['Fac'],ramp.inputs['Value']);mix=ns.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;ls.new(source,mix.inputs[1]);ls.new(ramp.outputs[0],mix.inputs[2]);ls.new(mix.outputs[0],bs.inputs['Base Color'])
 bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25;bump.inputs['Distance'].default_value=.00016;ls.new(noise.outputs['Fac'],bump.inputs['Height']);ls.new(bump.outputs[0],bs.inputs['Normal'])
 emit=ns.new('ShaderNodeEmission');ls.new(mix.outputs[0],emit.inputs[0]);ls.new(emit.outputs[0],out.inputs['Surface'])
 color=bpy.data.images.new(name+'_CoatColor',1024,1024);target=ns.new('ShaderNodeTexImage');target.image=color;ns.active=target;bpy.ops.object.bake(type='EMIT');color.filepath_raw=str(OUT/(name.lower()+'-color-v25.png'));color.file_format='PNG';color.save();color.pack()
 ls.new(bs.outputs[0],out.inputs['Surface']);normal=bpy.data.images.new(name+'_CoatNormal',1024,1024);normal.colorspace_settings.name='Non-Color';nt=ns.new('ShaderNodeTexImage');nt.image=normal;ns.active=nt;bpy.ops.object.bake(type='NORMAL');normal.filepath_raw=str(OUT/(name.lower()+'-normal-v25.png'));normal.file_format='PNG';normal.save();normal.pack()
 final=bpy.data.materials.new(name+'_BakedCoat');final.use_nodes=True;fbs=final.node_tree.nodes.get('Principled BSDF');fbs.inputs['Roughness'].default_value=.88;ct=final.node_tree.nodes.new('ShaderNodeTexImage');ct.image=color;final.node_tree.links.new(ct.outputs['Color'],fbs.inputs['Base Color']);nt=final.node_tree.nodes.new('ShaderNodeTexImage');nt.image=normal;nm=final.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.5;final.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);final.node_tree.links.new(nm.outputs[0],fbs.inputs['Normal']);o.data.materials[0]=final
scene['stage']='V25: V24 lip/neck corrections plus baked fine coat color and tangent normal textures on reconstructed body and tail.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v25.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];rig=bpy.data.objects['GLTF_created_0'];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v25.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
from mathutils import Vector
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v25-').replace('(0,-.27,.295)','(0,-.27,.256)'))
