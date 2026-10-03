import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);h=bpy.data.objects['mesh_0.001'];mesh=h.data;mw=h.matrix_world;inv=mw.inverted();bm=bmesh.new();bm.from_mesh(mesh)
fs={f for f in bm.faces if (lambda p:p.y>-.248 and (p.x/.066)**2+((p.z-.251)/.042)**2<1)(mw@f.calc_center_median())}
for _ in range(15):
 edges=[e for e in bm.edges if any(f in fs for f in e.link_faces) and any(f not in fs for f in e.link_faces)];counts={}
 for e in edges:
  for v in e.verts:counts[v]=counts.get(v,0)+1
 bad=[v for v,c in counts.items() if c!=2]
 if not bad:break
 for v in bad:fs.update(v.link_faces)
assert not bad
start=edges[0].verts[0];boundary=[start];prev=None;cur=start;es=set(edges)
while True:
 nxt=next((e.other_vert(cur) for e in cur.link_edges if e in es and e.other_vert(cur)!=prev and e.other_vert(cur)!=start),None)
 if nxt is None:break
 boundary.append(nxt);prev,cur=cur,nxt
assert len(boundary)==len(edges)
shape=list(bm.verts.layers.shape.values());deform=bm.verts.layers.deform.verify();uvlayer=bm.loops.layers.uv.active
# Store a source UV at the untouched boundary; the replacement receives its own coat material.
center=Vector((0,-.189,.251));centerlocal=inv@center;centerkeys={layer:centerlocal+sum((v[layer]-v.co for v in boundary),Vector())/len(boundary) for layer in shape};keys={k for v in boundary for k in v[deform].keys()};centerweights={k:sum(v[deform].get(k,0) for v in boundary)/len(boundary) for k in keys}
# Untangle the old jagged projected boundary before making radial rows.
points=[mw@v.co for v in boundary];area=sum(points[i].x*points[(i+1)%len(points)].z-points[(i+1)%len(points)].x*points[i].z for i in range(len(points)));direction=1 if area>0 else -1;startangle=math.atan2((points[0].z-.251)/.042,points[0].x/.066)
for i,v in enumerate(boundary):
 angle=startangle+direction*2*math.pi*i/len(boundary);x=.066*math.cos(angle);z=.251+.042*math.sin(angle);y=-.242+.055*math.sqrt(max(.025,1-(x/.077)**2-((z-.269)/.068)**2));target=inv@Vector((x,y,z));delta=target-v.co
 for layer in shape:v[layer]+=delta
 v.co=target
removed=len(fs);bmesh.ops.delete(bm,geom=list(fs),context='FACES')
loose=[v for v in bm.verts if not v.link_faces and v not in boundary]
if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
mat=bpy.data.materials.new('OcciputRetopologyCoat');mat.use_nodes=True;mesh.materials.append(mat);mi=len(mesh.materials)-1;new=[];rings=[boundary]
for step in range(1,13):
 t=step/13;row=[]
 for base in boundary:
  edge=mw@base.co;p=edge.lerp(center,t)
  # Boundary-constrained dome: continuously joins existing skin and bulges gently at the center.
  p.y=edge.y*(1-t)+center.y*t+.009*math.sin(math.pi*t)
  v=bm.verts.new(inv@p);row.append(v);new.append(v)
  for layer in shape:v[layer]=v.co+(base[layer]-base.co)*(1-t)+(centerkeys[layer]-centerlocal)*t
  for k in keys:v[deform][k]=base[deform].get(k,0)*(1-t)+centerweights[k]*t
 rings.append(row)
created=[]
for a,b in zip(rings,rings[1:]):
 for i in range(len(a)):created.append(bm.faces.new((a[i],a[(i+1)%len(a)],b[(i+1)%len(b)],b[i])))
c=bm.verts.new(centerlocal)
for layer in shape:c[layer]=centerkeys[layer]
for k,w in centerweights.items():c[deform][k]=w
for i in range(len(boundary)):created.append(bm.faces.new((rings[-1][i],rings[-1][(i+1)%len(boundary)],c)))
for f in created:f.material_index=mi;f.smooth=True
assert all(len(e.link_faces)==2 for f in created for e in f.edges)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.verts.ensure_lookup_table();bm.verts.index_update()
# Rebuild shape keys explicitly: BMesh's automatic old-vertex mapping is unsafe for a new patch.
keycoords={layer.name:[(v.co if layer.name=='Basis' else v[layer]).copy() for v in bm.verts] for layer in shape}
h.shape_key_clear();bm.to_mesh(mesh);bm.free();mesh.update()
for name,coords in keycoords.items():
 key=h.shape_key_add(name=name)
 for v,p in zip(key.data,coords):v.co=p
 if name=='JawRound':
  for frame,value in [(1,0),(16,0),(30,1),(45,1),(60,0),(76,0)]:key.value=value;key.keyframe_insert('value',frame=frame)
scene.frame_set(1);mesh.normals_split_custom_set([(0,0,0)]*len(mesh.loops))
for e in mesh.edges:e.use_edge_sharp=False
# Pigment is continuous around the replacement boundary; no baked-in folds are reused on it.
attr=mesh.color_attributes.new(name='RetopoCoat',type='FLOAT_COLOR',domain='POINT')
for v in mesh.vertices:
 x,y,z=mw@v.co;stripe=max(0,min(1,(math.sin(x*290+1.7*math.sin(z*63)+y*22)-.35)/.47));color=Vector((.23,.074,.014))*(1-.32*stripe);attr.data[v.index].color=(*color,1)
ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');vc=ns.new('ShaderNodeVertexColor');vc.layer_name=attr.name;ls.new(vc.outputs[0],bs.inputs['Base Color'])
# Bake replacement and preserved skin into one runtime atlas.
for material in mesh.materials:
 for n in list(material.node_tree.nodes):
  if n.type=='TEX_IMAGE' and not n.inputs['Vector'].links:
   uv=material.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map=mesh.uv_layers.active.name;material.node_tree.links.new(uv.outputs[0],n.inputs[0])
bpy.ops.object.select_all(action='DESELECT');h.select_set(True);bpy.context.view_layer.objects.active=h;mesh.uv_layers.new(name='CoatV29');mesh.uv_layers.active_index=len(mesh.uv_layers)-1;mesh.uv_layers.active.active_render=True;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.005);bpy.ops.object.mode_set(mode='OBJECT')
color=bpy.data.images.new('A_CoatColor_V29',4096,4096);normal=bpy.data.images.new('A_CoatNormal_V29',4096,4096);normal.colorspace_settings.name='Non-Color';scene.render.engine='CYCLES';scene.cycles.samples=4;scene.render.bake.margin=12
for material in mesh.materials:
 ns=material.node_tree.nodes;ls=material.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');em=ns.new('ShaderNodeEmission');ls.new(bs.inputs['Base Color'].links[0].from_socket,em.inputs[0]);ls.new(em.outputs[0],out.inputs[0]);target=ns.new('ShaderNodeTexImage');target.image=color;ns.active=target
bpy.ops.object.bake(type='EMIT');color.filepath_raw=str(OUT/'a-coat-color-v29.png');color.file_format='PNG';color.save();color.pack()
for material in mesh.materials:
 ns=material.node_tree.nodes;ls=material.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');ls.new(bs.outputs[0],out.inputs[0]);target=ns.new('ShaderNodeTexImage');target.image=normal;ns.active=target
bpy.ops.object.bake(type='NORMAL');normal.filepath_raw=str(OUT/'a-coat-normal-v29.png');normal.file_format='PNG';normal.save();normal.pack()
final=bpy.data.materials.new('A_UnifiedCoat_V29');final.use_nodes=True;ns=final.node_tree.nodes;ls=final.node_tree.links;bs=ns.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86;ct=ns.new('ShaderNodeTexImage');ct.image=color;ls.new(ct.outputs[0],bs.inputs['Base Color']);nt=ns.new('ShaderNodeTexImage');nt.image=normal;nm=ns.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.6;ls.new(nt.outputs[0],nm.inputs['Color']);ls.new(nm.outputs[0],bs.inputs['Normal']);mesh.materials.clear();mesh.materials.append(final)
for f in mesh.polygons:f.material_index=0;f.use_smooth=True
for name in [l.name for l in mesh.uv_layers]:
 if name!='CoatV29':mesh.uv_layers.remove(mesh.uv_layers[name])
for name in [a.name for a in mesh.color_attributes]:mesh.color_attributes.remove(mesh.color_attributes[name])
(OUT/'v29-patch-check.json').write_text(json.dumps({'removed_faces':removed,'boundary_vertices':len(boundary),'new_faces':len(created),'closed_patch_edges':True},indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v29.blend'))
s=Path('scripts/diagnose-coat-v29.py').read_text(encoding='utf-8-sig').replace('v29-clay-before','v29-clay-after');exec(s)
