import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];rig=bpy.data.objects['GLTF_created_0']
capmat=bpy.data.materials.new('Occiput_Base');capmat.use_nodes=True;bs=capmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.20,.068,.012,1);bs.inputs['Roughness'].default_value=.85;head.data.materials.append(capmat)
bm=bmesh.new();bm.from_mesh(head.data);caps=[f for f in bm.faces if len(f.verts)>4];count=len(caps)
for f in caps:f.material_index=len(head.data.materials)-1
if caps:
 faces=bmesh.ops.poke(bm,faces=caps)['faces'];edges=list({e for f in faces for e in f.edges});bmesh.ops.subdivide_edges(bm,edges=edges,cuts=2,use_grid_fill=True)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
inv=head.matrix_world.inverted();moved=0
for i,v in enumerate(head.data.vertices):
 p=head.matrix_world@v.co;x,y,z=p;w=sm(-.214,-.185,y)*sm(.206,.225,z)
 if w<.0001:continue
 inside=max(.025,1-(x/.076)**2-((z-.258)/.068)**2);back=-.238+.055*math.sqrt(inside);q=p.copy();q.y=y*(1-w)+back*w;delta=inv@q-v.co
 for key in head.data.shape_keys.key_blocks:key.data[i].co+=delta
 v.co+=delta;moved+=1
for p in head.data.polygons:p.use_smooth=True
scene['stage']='V26: lip/neck refinement, baked coat color and normal maps, rounded subdivided occipital cap. Prototype, not final character art.'
(OUT/'v26-surface-check.json').write_text(json.dumps({'cap_faces_before':count,'rear_vertices_adjusted':moved,'head_vertices':len(head.data.vertices),'morph_lengths':[len(k.data) for k in head.data.shape_keys.key_blocks]},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v26.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_SeatedBody','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v26.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];exec(s.replace('v18-','v26-').replace('(0,-.27,.295)','(0,-.27,.256)'))
