import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector, kdtree
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework'); scene=bpy.context.scene;scene.frame_set(1)
head=bpy.data.objects['mesh_0.001'];body=bpy.data.objects['A_SeatedBody'];lip=bpy.data.objects['A_LipRim'];rig=bpy.data.objects['GLTF_created_0']
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
# Smooth the cropped occipital surface and retract the folded lower rim into the collar.
ps=[head.matrix_world@v.co for v in head.data.vertices];adj=[set() for p in ps]
for e in head.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
original=[p.copy() for p in ps]
for step in range(24):
 nextps=[]
 for i,p in enumerate(ps):
  w=sm(-.222,-.190,original[i].y)*(1-sm(.254,.272,original[i].z))
  avg=sum((ps[j] for j in adj[i]),Vector())/len(adj[i]) if adj[i] else p
  nextps.append(p.lerp(avg,.42*w))
 ps=nextps
inv=head.matrix_world.inverted()
for i,p in enumerate(ps):
 w=sm(-.231,-.194,p.y)*(1-sm(.222,.251,p.z));p.y=-.222+(p.y+.222)*(1-.65*w);p.x*=1-.35*w;p.z+=.006*w
 delta=inv@p-head.data.vertices[i].co
 for key in head.data.shape_keys.key_blocks:key.data[i].co+=delta
 head.data.vertices[i].co+=delta
# Extend the collar inside the lower skull, with gradual head influence.
inv=body.matrix_world.inverted()
for v in body.data.vertices:
 p=body.matrix_world@v.co;w=sm(.169,.220,p.z);p.y+=.007*w;p.z+=.006*w;p.x*=1+.10*w;v.co=inv@p
# A continuous corner weight transition removes the vertical upper/lower jaw break.
for o in [head,lip]:
 inv=o.matrix_world.inverted();basis=o.data.shape_keys.key_blocks[0];correct=o.data.shape_keys.key_blocks['JawRound']
 for i,v in enumerate(basis.data):
  p=o.matrix_world@v.co;x,y,z=p;side=sm(.012,.024,abs(x));near=(1-sm(-.267,-.252,y))*(1-sm(.006,.012,abs(z-.231)))
  if side*near<.001:continue
  g=o.vertex_groups.get('A_Jaw')
  old=next((a.weight for a in o.data.vertices[i].groups if a.group==g.index),0)
  desired=1-sm(.2294,.2326,z);weight=old*(1-side*near)+desired*side*near
  # Only update vertices already in the jaw/head region; preserve total normalized skin.
  groups=[(a.group,a.weight) for a in o.data.vertices[i].groups];other=sum(w for gi,w in groups if gi!=g.index)
  for gi,w in groups:
   if gi!=g.index and other:o.vertex_groups[gi].add([i],w/other*(1-weight),'REPLACE')
  g.add([i],weight,'REPLACE')
  q=o.matrix_world@correct.data[i].co;q.x*=1-.07*side*near;correct.data[i].co=inv@q
# Sample source UV boundary colors in linear space and extend them onto cap vertices.
mesh=head.data;old_uv=mesh.uv_layers.active;old_uv.name='FaceSourceUV'
capids={p.index for p in mesh.polygons if head.data.materials[p.material_index].name.startswith('Occiput')}
capverts={i for p in mesh.polygons if p.index in capids for i in p.vertices}
image=next(n.image for n in mesh.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');width,height=image.size
pixels=np.empty(width*height*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape(height,width,4)
colors=np.zeros((len(mesh.vertices),3));counts=np.zeros(len(mesh.vertices))
for poly in mesh.polygons:
 if poly.index in capids:continue
 for li in poly.loop_indices:
  idx=mesh.loops[li].vertex_index;u,v=old_uv.data[li].uv;col=pixels[min(height-1,max(0,int(v*height))),min(width-1,max(0,int(u*width))),:3]
  colors[idx]+=col;counts[idx]+=1
known=np.where(counts>0)[0];colors[known]/=counts[known,None]
# Nearest boundary samples retain nearby stripe colors instead of assigning a solid cap.
boundary=[int(i) for i in known if i in capverts];tree=kdtree.KDTree(len(boundary))
for i in boundary:tree.insert(head.matrix_world@mesh.vertices[i].co,i)
tree.balance()
for i in capverts:
 if counts[i]:continue
 p=head.matrix_world@mesh.vertices[i].co;near=tree.find_n(p,8);ws=np.array([1/max(d,.001)**3 for _,_,d in near]);colors[i]=sum((colors[j]*w for (_,j,_),w in zip(near,ws)),np.zeros(3))/sum(ws)
interior=[i for i in capverts if not counts[i]]
for step in range(180):
 updates={i:sum((colors[j] for j in adj[i]),np.zeros(3))/len(adj[i]) for i in interior if adj[i]}
 for i,c in updates.items():colors[i]=c
attr=mesh.color_attributes.new(name='OcciputContinuation',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(mesh.vertices):
 p=head.matrix_world@v.co;w=sm(-.230,-.203,p.y)*(1-sm(.244,.266,p.z));coat=Vector((.18,.058,.013))*(1-.10*math.sin(p.z*170+abs(p.x)*40));c=Vector(colors[i]).lerp(coat,w);attr.data[i].color=(*c,w)
capmat=next(m for m in mesh.materials if m.name.startswith('Occiput'));ns=capmat.node_tree.nodes;ls=capmat.node_tree.links;bs=ns.get('Principled BSDF');c=ns.new('ShaderNodeVertexColor');c.layer_name=attr.name;ls.new(c.outputs['Color'],bs.inputs['Base Color'])
# Blend the lower rear source surface as well, eliminating a color fan at the old cut.
mat=mesh.materials[0];ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');source=bs.inputs['Base Color'].links[0].from_socket;vc=ns.new('ShaderNodeVertexColor');vc.layer_name=attr.name;mix=ns.new('ShaderNodeMixRGB');ls.new(vc.outputs['Alpha'],mix.inputs[0]);ls.new(source,mix.inputs[1]);ls.new(vc.outputs['Color'],mix.inputs[2]);ls.new(mix.outputs[0],bs.inputs['Base Color'])
# Bake a new common atlas while explicitly retaining the original UV for source sampling.
for mat in mesh.materials:
 for n in list(mat.node_tree.nodes):
  if n.type=='TEX_IMAGE':
   uv=mat.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='FaceSourceUV';mat.node_tree.links.new(uv.outputs[0],n.inputs['Vector'])
mesh.uv_layers.new(name='FaceUnifiedUV');mesh.uv_layers.active_index=len(mesh.uv_layers)-1;mesh.uv_layers.active.active_render=True
bpy.ops.object.select_all(action='DESELECT');head.select_set(True);bpy.context.view_layer.objects.active=head
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
atlas=bpy.data.images.new('A_FaceUnified_V27',2048,2048)
for mat in mesh.materials:
 ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');em=ns.new('ShaderNodeEmission')
 if bs.inputs['Base Color'].links:ls.new(bs.inputs['Base Color'].links[0].from_socket,em.inputs[0])
 else:em.inputs[0].default_value=bs.inputs['Base Color'].default_value
 ls.new(em.outputs[0],out.inputs[0]);n=ns.new('ShaderNodeTexImage');n.image=atlas;ns.active=n
scene.render.engine='CYCLES';scene.cycles.samples=4;scene.render.bake.margin=12;bpy.ops.object.bake(type='EMIT');atlas.filepath_raw=str(OUT/'a-face-color-v27.png');atlas.file_format='PNG';atlas.save();atlas.pack()
final=bpy.data.materials.new('A_FaceUnified_V27');final.use_nodes=True;ns=final.node_tree.nodes;ls=final.node_tree.links;bs=ns.get('Principled BSDF');bs.inputs['Roughness'].default_value=.87;n=ns.new('ShaderNodeTexImage');n.image=atlas;uv=ns.new('ShaderNodeUVMap');uv.uv_map='FaceUnifiedUV';ls.new(uv.outputs[0],n.inputs[0]);ls.new(n.outputs['Color'],bs.inputs['Base Color']);mesh.materials.clear();mesh.materials.append(final)
for p in mesh.polygons:p.material_index=0;p.use_smooth=True
for name in [u.name for u in mesh.uv_layers]:
 if name!='FaceUnifiedUV':mesh.uv_layers.remove(mesh.uv_layers[name])
for name in [a.name for a in mesh.color_attributes]:mesh.color_attributes.remove(mesh.color_attributes[name])
scene['stage']='V27: cap boundary color extension into unified UV atlas; smoothed lower skull, extended neck overlap and gradual jaw corner weights. Separate neck topology remains.'
(OUT/'v27-surface-check.json').write_text(json.dumps({'cap_faces':len(capids),'cap_vertices':len(capverts),'boundary_samples':len(boundary),'head_vertices':len(mesh.vertices),'morph_lengths':[len(k.data) for k in mesh.shape_keys.key_blocks]},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v27.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v27.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1]
s=s.replace("[('front'","[('back',(0,1,.25),(0,-.18,.18),.43,1),('front'")
exec(s.replace('v18-','v27-').replace('(0,-.27,.295)','(0,-.27,.256)'))
