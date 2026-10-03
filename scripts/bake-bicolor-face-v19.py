"""Bake authored facial pigment shader into a portable UV texture."""
import bpy,math
from pathlib import Path
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);o=bpy.data.objects['mesh_0.001'];mat=o.data.materials[0].copy();mat.name='A_Face_Pigment';o.data.materials[0]=mat
nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image);bs=nodes.get('Principled BSDF');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
attr=o.data.color_attributes.new(name='PigmentRegions',type='FLOAT_COLOR',domain='POINT')
for v in o.data.vertices:
 x,y,z=o.matrix_world@v.co
 muzzle=math.exp(-(x/.033)**4-((z-.270)/.016)**4)*(1-sm(-.268,-.238,y))
 nose=math.exp(-(x/.010)**4-((z-.284)/.005)**4)*(1-sm(-.283,-.269,y))
 attr.data[v.index].color=(muzzle,nose,0,1)
regions=nodes.new('ShaderNodeVertexColor');regions.layer_name='PigmentRegions';sep=nodes.new('ShaderNodeSeparateColor');links.new(regions.outputs['Color'],sep.inputs[0])
bw=nodes.new('ShaderNodeRGBToBW');links.new(tex.outputs['Color'],bw.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
for i,(pos,col) in enumerate([(0,(.015,.003,.001,1)),(.18,(.085,.021,.003,1)),(.40,(.55,.15,.018,1)),(.68,(.80,.30,.040,1)),(1,(.95,.46,.10,1))]):
 e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(pos);e.position=pos;e.color=col
links.new(bw.outputs[0],ramp.inputs[0]);mix=nodes.new('ShaderNodeMixRGB');links.new(sep.outputs['Red'],mix.inputs[0]);links.new(ramp.outputs[0],mix.inputs[1]);mix.inputs[2].default_value=(.72,.58,.36,1)
nosemix=nodes.new('ShaderNodeMixRGB');links.new(sep.outputs['Green'],nosemix.inputs[0]);links.new(mix.outputs[0],nosemix.inputs[1]);links.new(tex.outputs['Color'],nosemix.inputs[2])
emit=nodes.new('ShaderNodeEmission');links.new(nosemix.outputs[0],emit.inputs[0]);links.new(emit.outputs[0],output.inputs['Surface'])
image=bpy.data.images.new('A_Face_Color_2048',width=2048,height=2048,alpha=True);image.colorspace_settings.name='sRGB';target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.bake.margin=12
bpy.ops.object.bake(type='EMIT');image.filepath_raw=str(OUT/'a-face-color-v19.png');image.file_format='PNG';image.save();image.pack()
# Final portable material reads the actual baked texture, no region attributes required.
final=bpy.data.materials.new('A_Face_Baked');final.use_nodes=True;ftex=final.node_tree.nodes.new('ShaderNodeTexImage');ftex.image=image;fbs=final.node_tree.nodes.get('Principled BSDF');final.node_tree.links.new(ftex.outputs['Color'],fbs.inputs['Base Color']);fbs.inputs['Roughness'].default_value=.8;o.data.materials[0]=final
scene['face_texture']='a-face-color-v19.png: UV bake of source luminance with authored orange/cream/nose regions. Source original unchanged.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v19.blend'))
