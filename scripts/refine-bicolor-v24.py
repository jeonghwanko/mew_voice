import bpy,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['GLTF_created_0'];head=bpy.data.objects['mesh_0.001'];lip=bpy.data.objects['A_LipRim'];body=bpy.data.objects['A_SeatedBody']
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# A much thinner soft lip edge, rather than the previous thick rectangular outline.
for key in lip.data.shape_keys.key_blocks:
 for ring in range(96):
  ids=list(range(ring*8,ring*8+8));center=sum((key.data[i].co for i in ids),Vector())/8
  for i in ids:key.data[i].co=center+(key.data[i].co-center)*.32
for v,k in zip(lip.data.vertices,lip.data.shape_keys.key_blocks[0].data):v.co=k.co
mat=lip.data.materials[0];mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.085,.034,.023,1)
# Rounded upper mouth contour is a pose correction, not a change to the neutral face.
for o in [head,lip]:
 basis=o.data.shape_keys.key_blocks[0];key=o.data.shape_keys.key_blocks['JawRound'];inv=o.matrix_world.inverted()
 for i,v in enumerate(basis.data):
  p=o.matrix_world@v.co;x,y,z=p
  w=max(0,1-(x/.026)**2)*sm(.2305,.2325,z)*(1-sm(.237,.248,z))*(1-sm(-.269,-.251,y))
  q=o.matrix_world@key.data[i].co;q.z+=.003*w;key.data[i].co=inv@q
# Bring the rear lower head into the neck instead of leaving a flat hanging cap.
inv=head.matrix_world.inverted()
for i,v in enumerate(head.data.vertices):
 p=head.matrix_world@v.co;w=sm(-.211,-.175,p.y)*(1-sm(.205,.250,p.z));q=p.copy();q.y-=.018*w;q.x*=1-.15*w;delta=inv@q-v.co
 for key in head.data.shape_keys.key_blocks:key.data[i].co+=delta
 v.co+=delta
# Recess the collar behind the cheek and chin.
inv=body.matrix_world.inverted()
for v in body.data.vertices:
 p=body.matrix_world@v.co;w=sm(.173,.213,p.z);p.x*=1-.22*w;p.y=-.222+(p.y+.222)*(1-.24*w);v.co=inv@p
# Match the reconstructed coat to the darker baked facial fur.
for name in ['A_SeatedBody','A_Tail']:
 o=bpy.data.objects[name];a=o.data.color_attributes['A_BodyColor']
 for item in a.data:
  r,g,b,alpha=item.color
  if r>g*1.8:item.color=(r*.72,g*.72,b*.75,alpha)
scene['stage']='V24: thinner lip edge, upper-mouth corrective, recessed collar and lower skull transition, coat tone matched. Art refinement remains.'
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v24.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v24.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v24-').replace('(0,-.27,.295)','(0,-.27,.256)'))
