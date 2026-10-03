import bpy,math,json,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];rig=bpy.data.objects['GLTF_created_0'];mesh=head.data;mw=head.matrix_world;mesh.calc_loop_triangles();rng=np.random.default_rng(29)
# Root distribution is sampled by world-space triangle area, avoiding eyes, muzzle and ears.
triangles=[];areas=[]
for t in mesh.loop_triangles:
 p=[mw@mesh.vertices[i].co for i in t.vertices];c=sum(p,Vector())/3;x,y,z=c
 head_zone=.232<z<.308 and (y>-.238 or (abs(x)>.045 and y>-.263))
 ruff_zone=.161<z<.239 and (y>-.236 or (abs(x)<.044 and y<-.223))
 if not (head_zone or ruff_zone):continue
 area=(p[1]-p[0]).cross(p[2]-p[0]).length/2
 if area>1e-11:triangles.append(t);areas.append(area)
choices=rng.choice(len(triangles),size=18000,p=np.array(areas)/sum(areas));vertices=[];faces=[];uvs=[];bindings=[];root_records=[];keynames=[k.name for k in mesh.shape_keys.key_blocks];uv=mesh.uv_layers.active
for choice in choices:
 t=triangles[choice];ids=list(t.vertices);a,b=rng.random(2);a=math.sqrt(a);bary=[1-a,a*(1-b),a*b];root=sum((mw@mesh.vertices[i].co*w for i,w in zip(ids,bary)),Vector());normal=sum((mw.to_3x3().inverted().transposed()@mesh.vertices[i].normal*w for i,w in zip(ids,bary)),Vector()).normalized()
 # Coat flows downward, with a little lateral sweep over the cheek.
 flow=Vector((root.x*.7,0,-1));tangent=(flow-normal*flow.dot(normal)).normalized();side=normal.cross(tangent).normalized();length=float(rng.uniform(.0030,.0050));width=float(rng.uniform(.00003,.000065));base=len(vertices);rootuv=sum((uv.data[li].uv*w for li,w in zip(t.loops,bary)),Vector((0,0)))
 weights={}
 for i,w in zip(ids,bary):
  for g in mesh.vertices[i].groups:weights[g.group]=weights.get(g.group,0)+g.weight*w
 # Three short triangular rings and a tapered tip are real solid strand geometry.
 for ring in range(3):
  s=ring/3;center=root+normal*(-.00013+length*(.58*s-.18*s*s))+tangent*length*.78*s;radius=width*(1-s*.82)
  for j in range(3):
   angle=j*2*math.pi/3;vertices.append(center+radius*(side*math.cos(angle)+normal*math.sin(angle)));uvs.append(rootuv);bindings.append(weights)
  if ring:
   for j in range(3):faces.append((base+(ring-1)*3+j,base+(ring-1)*3+(j+1)%3,base+ring*3+(j+1)%3,base+ring*3+j))
 tip=root+normal*(-.00013+length*.40)+tangent*length*.78;vertices.append(tip);uvs.append(rootuv);bindings.append(weights)
 for j in range(3):faces.append((base+6+j,base+6+(j+1)%3,base+9))
 faces.append((base+2,base+1,base));root_records.append((ids,bary,base))
fm=bpy.data.meshes.new('ShortCoatStrands');fm.from_pydata(vertices,[],faces);fur=bpy.data.objects.new('A_ShortCoat',fm);scene.collection.objects.link(fur);world=fur.matrix_world.copy();fur.parent=rig;fur.matrix_world=world
for g in head.vertex_groups:fur.vertex_groups.new(name=g.name)
for i,weights in enumerate(bindings):
 total=sum(weights.values())
 for gi,w in weights.items():
  if w>1e-6:fur.vertex_groups[gi].add([i],w/total,'REPLACE')
mod=fur.modifiers.new('CoatSkin','ARMATURE');mod.object=rig;layer=fm.uv_layers.new(name='CoatRootUV')
for loop in fm.loops:layer.data[loop.index].uv=uvs[loop.vertex_index]
mat=bpy.data.materials.new('A_ShortCoatRootColor');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.95;image=next(n.image for n in mesh.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.image.name.startswith('A_CoatColor'));tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.links.new(tex.outputs[0],bs.inputs['Base Color']);fm.materials.append(mat)
for p in fm.polygons:p.use_smooth=True
# Morph displacement follows the surface attachment as well as the interpolated bones.
fur.shape_key_add(name='Basis')
for source in list(mesh.shape_keys.key_blocks)[1:]:
 key=fur.shape_key_add(name=source.name)
 for ids,bary,base in root_records:
  delta=sum((mw.to_3x3()@(source.data[i].co-mesh.shape_keys.key_blocks[0].data[i].co)*w for i,w in zip(ids,bary)),Vector())
  for i in range(base,base+10):key.data[i].co+=delta
 if source.name=='JawRound':
  for f,w in [(1,0),(16,0),(30,1),(45,1),(60,0),(76,0)]:key.value=w;key.keyframe_insert('value',frame=f)
scene.frame_set(1);scene['stage']='V29: V28 geometry retained with smoothed occipital shading and 18000 short tapered, skinned, morph-following solid fur strands on cheek/rear head/ruff. No alpha cards.'
(OUT/'v29-fur-check.json').write_text(json.dumps({'strands':len(root_records),'vertices':len(fm.vertices),'faces':len(fm.polygons),'shape_keys':[k.name for k in fm.shape_keys.key_blocks],'source_color_atlas':image.name},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v29.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_Tail','A_OralCavity','A_Tongue','A_LipRim','A_ShortCoat']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v29.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('scripts/render-neck-v28.py').read_text();exec(s.replace('v28-','v29-'))
