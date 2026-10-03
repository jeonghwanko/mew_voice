import bpy,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene
for o in scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='MESH' and o.data.shape_keys:
  o.data.shape_keys.animation_data_clear()
  for k in o.data.shape_keys.key_blocks:k.value=0
rig=bpy.data.objects['GLTF_created_0']
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# Gaze uses the original eye surfaces only; no jaw-bone dependency.
eye=bpy.data.objects['mesh_0'];inv=eye.matrix_world.inverted();basis=eye.data.shape_keys.key_blocks[0]
for name,axis,angle in [('LookLeft','Z',-.10),('LookRight','Z',.10),('LookUp','X',-.08),('LookDown','X',.08)]:
 k=eye.shape_key_add(name=name)
 for sign in [-1,1]:
  iris={i for poly in eye.data.polygons if 'amber' in eye.data.materials[poly.material_index].name for i in poly.vertices}
  ids=[i for i,v in enumerate(basis.data) if (eye.matrix_world@v.co).x*sign>0];ps=[eye.matrix_world@basis.data[i].co for i in ids if i in iris]
  center=Vector(((min(p.x for p in ps)+max(p.x for p in ps))/2,max(p.y for p in ps), (min(p.z for p in ps)+max(p.z for p in ps))/2))
  rot=Matrix.Rotation(angle,3,axis)
  for i in ids:
   p=eye.matrix_world@basis.data[i].co;k.data[i].co=inv@(center+rot@(p-center))
# Small lower-lip articulation. Larger opening awaits oral-cavity reconstruction.
coat=bpy.data.objects['mesh_0.001'];inv=coat.matrix_world.inverted();basis=coat.data.shape_keys.key_blocks[0];k=coat.shape_key_add(name='MouthOpen')
for i,v in enumerate(basis.data):
 p=coat.matrix_world@v.co;x,y,z=p;w=math.exp(-(x/.024)**4)*(1-sm(-.280,-.247,y))*sm(.239,.252,z)*(1-sm(.269,.278,z));p.z-=.0045*w;p.y+=.001*w;k.data[i].co=inv@p
# Paint A-inspired orange and cream directly on the mesh, preserving texture detail sampling.
mat=coat.data.materials[0].copy();mat.name='A_Orange_Cream';coat.data.materials[0]=mat
tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image);im=tex.image;pix=np.empty(len(im.pixels),dtype=np.float32);im.pixels.foreach_get(pix);pix=pix.reshape(im.size[1],im.size[0],4)
attr=coat.data.color_attributes.new(name='A_Coat',type='FLOAT_COLOR',domain='CORNER');coat.data.color_attributes.active_color=attr;uv=coat.data.uv_layers.active
for loop in coat.data.loops:
 u,v=uv.data[loop.index].uv;c=pix[int(v*im.size[1])%im.size[1],int(u*im.size[0])%im.size[0],:3];p=coat.matrix_world@coat.data.vertices[loop.vertex_index].co;x,y,z=p
 lum=float(c.mean());pattern=.80+.20*max(0,min(1,lum/.55));orange=np.array((.69,.24,.045))*pattern
 pigment=max(0,min(1,(float(c[0])-float(c[1]))/max(.05,float(c[0]))*3));orange=orange*(1-.22*pigment)
 muzzle=math.exp(-(x/.032)**4-((z-.271)/.018)**4)*(1-sm(-.27,-.245,y))
 chest=(1-sm(-.180,-.13,y))*sm(.045,.12,z)*(1-sm(.24,.27,z))*(1-sm(.027,.048,abs(x)))
 paws=1-sm(.018,.035,z);cream=max(muzzle,chest,paws);color=orange*(1-cream)+np.array((.82,.65,.40))*pattern*cream
 # Keep the small pink nose and dark mouth from the original pigment.
 nose=math.exp(-(x/.009)**4-((z-.284)/.0045)**4)*(1-sm(-.285,-.273,y));color=color*(1-nose)+c*nose
 attr.data[loop.index].color=(*color,1)
bs=mat.node_tree.nodes.get('Principled BSDF');node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='A_Coat';mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.82
scene['stage']='A facial controls and orange/cream material study; small mouth articulation, not full lip-sync.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-controls.blend'))
