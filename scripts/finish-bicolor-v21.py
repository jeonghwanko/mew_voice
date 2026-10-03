import bpy,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0'];head=bpy.data.objects['mesh_0.001'];body=bpy.data.objects['A_SeatedBody'];tail=bpy.data.objects['A_Tail']
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# Tuck the cut neck rim inside the smoothly skinned collar.
inv=head.matrix_world.inverted()
for i,v in enumerate(head.data.vertices):
 p=head.matrix_world@v.co;w=(1-sm(.243,.254,p.z))*sm(-.284,-.263,p.y);q=p.copy();q.x*=1-.25*w;q.y=-.222+(q.y+.222)*(1-.25*w);delta=inv@q-v.co
 for k in head.data.shape_keys.key_blocks:k.data[i].co+=delta
 v.co+=delta
for v in body.data.vertices:
 p=body.matrix_world@v.co;w=sm(.216,.252,p.z);p.x*=1+.24*w;p.y=-.223+(p.y+.223)*(1+.15*w);v.co=body.matrix_world.inverted()@p
# Blend the collar with head motion instead of leaving it entirely on the root.
g=body.vertex_groups.new(name='Wolf_Neck_TopSHJnt_14');root=body.vertex_groups['Wolf_ROOTSHJnt_38']
for v in body.data.vertices:
 w=sm(.188,.252,(body.matrix_world@v.co).z)
 if w:root.add([v.index],1-w,'REPLACE');g.add([v.index],w,'REPLACE')
# Body pigment lives on the surface, with cream chest/paws and tabby flank bands.
for o in [body,tail]:
 attr=o.data.color_attributes.new(name='A_BodyColor',type='FLOAT_COLOR',domain='POINT');o.data.color_attributes.active_color=attr
 for v in o.data.vertices:
  x,y,z=o.matrix_world@v.co
  stripe=sm(.40,.70,math.sin(z*180+2*math.sin(y*32)+abs(x)*35))
  flank=sm(.026,.047,abs(x));stripe*=flank if o==body else 1
  orange=Vector((.40,.115,.016))*(1-.52*stripe)
  cream=max((1-sm(.023,.042,abs(x)))*(1-sm(-.225,-.195,y))*sm(.035,.08,z),1-sm(.022,.033,z)) if o==body else 0
  c=orange.lerp(Vector((.72,.57,.34)),cream);attr.data[v.index].color=(*c,1)
 mat=bpy.data.materials.new(o.name+'_Pigment');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.82;n=mat.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name=attr.name;mat.node_tree.links.new(n.outputs['Color'],bs.inputs['Base Color']);o.data.materials.clear();o.data.materials.append(mat)
# Smooth lip tube masks the cut boundary and follows upper/lower jaw weights.
verts=[];faces=[];weights=[];N=96;S=8
for i in range(N):
 a=2*math.pi*i/N;center=Vector((.0225*math.cos(a),-.283+.004*abs(math.cos(a)),.270+.0012*math.sin(a)));normal=Vector((math.cos(a),0,math.sin(a)))
 for j in range(S):
  b=2*math.pi*j/S;verts.append(center+.0009*(normal*math.cos(b)+Vector((0,1,0))*math.sin(b)));weights.append(1-sm(-.15,.15,math.sin(a)))
 for j in range(S):faces.append((i*S+j,i*S+(j+1)%S,((i+1)%N)*S+(j+1)%S,((i+1)%N)*S+j))
mesh=bpy.data.meshes.new('LipRim');mesh.from_pydata(verts,[],faces);lip=bpy.data.objects.new('A_LipRim',mesh);scene.collection.objects.link(lip);world=lip.matrix_world.copy();lip.parent=rig;lip.matrix_world=world
for name in ['A_Jaw','Wolf_Neck_TopSHJnt_14']:lip.vertex_groups.new(name=name)
for i,w in enumerate(weights):lip.vertex_groups['A_Jaw'].add([i],w,'REPLACE');lip.vertex_groups['Wolf_Neck_TopSHJnt_14'].add([i],1-w,'REPLACE')
m=lip.modifiers.new('Armature','ARMATURE');m.object=rig;mat=bpy.data.materials.new('LipEdge');mat.diffuse_color=(.065,.020,.015,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.065,.020,.015,1);lip.data.materials.append(mat)
for p in mesh.polygons:p.use_smooth=True
meshes=[head,bpy.data.objects['mesh_0'],bpy.data.objects['Object_32'],body,tail,bpy.data.objects['A_OralCavity'],bpy.data.objects['A_Tongue'],lip]
scene['stage']='V21: reconstructed seated body, baked facial UV color, independent jaw, oral cavity, tongue and skinned lip rim. Prototype for visual review.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v21.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v21.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v21-'))
