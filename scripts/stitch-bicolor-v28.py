import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);head=bpy.data.objects['mesh_0.001'];body=bpy.data.objects['A_SeatedBody'];rig=bpy.data.objects['GLTF_created_0']
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def active(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
# Named UV nodes protect both source atlases when the objects are joined.
for o in [head,body]:
 uvname=o.data.uv_layers.active.name
 for mat in o.data.materials:
  for n in list(mat.node_tree.nodes):
   if n.type=='TEX_IMAGE' and not n.inputs['Vector'].links:
    uv=mat.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map=uvname;mat.node_tree.links.new(uv.outputs[0],n.inputs['Vector'])
for o,z,lower in [(head,.218,True),(body,.208,False)]:
 bm=bmesh.new();bm.from_mesh(o.data);inv=o.matrix_world.inverted();point=inv@Vector((0,-.24,z));normal=o.matrix_world.to_3x3().transposed()@Vector((0,-.30,1))
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,clear_inner=lower,clear_outer=not lower,dist=1e-7)
 bm.to_mesh(o.data);bm.free();o.data.update()
active(head);body.select_set(True);bpy.ops.object.join();mesh=head.data
bm=bmesh.new();bm.from_mesh(mesh);mw=head.matrix_world;inv=mw.inverted()
def ring(z):
 edges=[e for e in bm.edges if e.is_boundary and all(abs((mw@v.co).z-z-.30*((mw@v.co).y+.24))<1e-5 for v in e.verts)]
 assert edges
 vs={v for e in edges for v in e.verts};center=sum((mw@v.co for v in vs),Vector())/len(vs)
 # Both contours are convex neck cross sections: consistent angular order.
 start=min(vs,key=lambda v:math.atan2((mw@v.co).y-center.y,(mw@v.co).x-center.x));ordered=[start];prev=None;cur=start
 while True:
  choices=[e.other_vert(cur) for e in edges if cur in e.verts and e.other_vert(cur)!=prev];nxt=next((v for v in choices if v not in ordered),None)
  if nxt is None:break
  ordered.append(nxt);prev,cur=cur,nxt
 assert len(ordered)==len(vs)
 area=sum((mw@ordered[i].co).x*(mw@ordered[(i+1)%len(ordered)].co).y-(mw@ordered[(i+1)%len(ordered)].co).x*(mw@ordered[i].co).y for i in range(len(ordered)))
 if area<0:ordered=[ordered[0]]+list(reversed(ordered[1:]))
 vs=ordered
 return vs,center
upper,uc=ring(.218);lower,lc=ring(.208);shape_layers=list(bm.verts.layers.shape.values());deform=bm.verts.layers.deform.verify()
collar=bpy.data.materials.new('A_NeckBridge');collar.use_nodes=True;collar.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.23,.072,.012,1);mesh.materials.append(collar);mi=len(mesh.materials)-1
# Three intermediate rings soften the loft and inherit all shape keys and skin weights.
progress={}
for row in [upper,lower]:
 lengths=[(mw@row[(i+1)%len(row)].co-mw@row[i].co).length for i in range(len(row))];total=sum(lengths);acc=0
 for v,length in zip(row,lengths):progress[v]=acc/total*2*math.pi;acc+=length
def angle(v,c):return progress[v]
la=[angle(v,lc) for v in lower]
def sample(a):
 for j in range(len(lower)):
  lo=la[j];hi=la[(j+1)%len(lower)]+(2*math.pi if j==len(lower)-1 else 0);aa=a if a>=lo else a+2*math.pi
  if lo<=aa<=hi:return lower[j],lower[(j+1)%len(lower)],(aa-lo)/(hi-lo)
 raise RuntimeError('ring sample failed')
rings=[upper];newverts=[]
for t in [.25,.5,.75]:
 row=[]
 for u in upper:
  a,b,f=sample(angle(u,uc));target=a.co.lerp(b.co,f);v=bm.verts.new(u.co.lerp(target,t));row.append(v);newverts.append(v)
  for layer in shape_layers:v[layer]=u[layer].lerp(a[layer].lerp(b[layer],f),t)
  keys=set(u[deform].keys())|set(a[deform].keys())|set(b[deform].keys())
  for k in keys:v[deform][k]=u[deform].get(k,0)*(1-t)+(a[deform].get(k,0)*(1-f)+b[deform].get(k,0)*f)*t
 rings.append(row)
created=[]
for a,b in zip(rings,rings[1:]):
 for i in range(len(a)):created.append(bm.faces.new((a[i],a[(i+1)%len(a)],b[(i+1)%len(b)],b[i])))
# Zipper triangulation joins unequal boundary counts without duplicate or overlapping caps.
a=rings[-1];b=lower;aa=[angle(v,uc) for v in upper];bb=la;i=j=0
# Align both starts to the common angle -pi and advance whichever next boundary is closest.
while i<len(a) or j<len(b):
 an=aa[(i+1)%len(a)]+(2*math.pi if i+1>=len(a) else 0) if i<len(a) else float('inf')
 bn=bb[(j+1)%len(b)]+(2*math.pi if j+1>=len(b) else 0) if j<len(b) else float('inf')
 if an<bn:face=(a[i%len(a)],a[(i+1)%len(a)],b[j%len(b)]);i+=1
 else:face=(a[i%len(a)],b[(j+1)%len(b)],b[j%len(b)]);j+=1
 created.append(bm.faces.new(face))
for face in created:face.material_index=mi;face.smooth=True
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bridge_edges={e for f in created for e in f.edges};assert all(len(e.link_faces)==2 for e in bridge_edges),'Neck must be fully manifold'
report={'upper_boundary':len(upper),'lower_boundary':len(lower),'bridge_faces':len(created),'bridge_vertices':len(newverts),'nonmanifold_neck_edges':sum(len(e.link_faces)!=2 for e in bridge_edges)}
bm.to_mesh(mesh);bm.free();mesh.update()
# Relax the complete transition region, applying the same displacement to every morph.
positions=[mw@v.co for v in mesh.vertices];startps=[p.copy() for p in positions];neighbors=[[] for _ in positions]
for e in mesh.edges:
 a,b=e.vertices;neighbors[a].append(b);neighbors[b].append(a)
for step in range(32):
 new=[]
 for i,p in enumerate(positions):
  q=startps[i];h=q.z-.30*(q.y+.24);w=sm(.194,.211,h)*(1-sm(.239,.260,h))*(sm(-.268,-.248,q.y))
  avg=sum((positions[j] for j in neighbors[i]),Vector())/len(neighbors[i]) if neighbors[i] else p
  new.append(p.lerp(avg,.48*w))
 positions=new
for i,p in enumerate(positions):
 delta=inv@p-mesh.vertices[i].co
 for key in mesh.shape_keys.key_blocks:key.data[i].co+=delta
 mesh.vertices[i].co+=delta
# Normalize the entire neck to a common root/head blend, including the original boundary vertices.
rootgroup=head.vertex_groups['Wolf_ROOTSHJnt_38'];neckgroup=head.vertex_groups['Wolf_Neck_TopSHJnt_14']
for v in mesh.vertices:
 p=mw@v.co;h=p.z-.30*(p.y+.24);alpha=sm(.125,.145,h)*(1-sm(.245,.267,h))*sm(-.274,-.252,p.y)
 if alpha<.0001:continue
 weights={g.group:g.weight*(1-alpha) for g in v.groups};nw=sm(.145,.239,h);weights[rootgroup.index]=weights.get(rootgroup.index,0)+alpha*(1-nw);weights[neckgroup.index]=weights.get(neckgroup.index,0)+alpha*nw
 total=sum(weights.values())
 for i,w in weights.items():head.vertex_groups[i].add([v.index],w/total,'REPLACE')
# One shared world-space coat field crosses the head, bridge, and torso without a material seam.
# Fine anisotropic noise adds short fur-grain color and normal detail, baked for the runtime.
scene.render.engine='CYCLES';scene.cycles.samples=4;scene.render.bake.margin=12
for mat in mesh.materials:
 ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');pos=ns.new('ShaderNodeNewGeometry');sep=ns.new('ShaderNodeSeparateXYZ');ls.new(pos.outputs['Position'],sep.inputs[0])
 # Local transition zone: fully matched at the join, fades into the original face/body pigment.
 attr=ns.new('ShaderNodeVertexColor');attr.layer_name='NeckCoatBlend'
 mix=ns.new('ShaderNodeMixRGB');old=bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].links else None
 if old:ls.new(old,mix.inputs[1])
 else:mix.inputs[1].default_value=bs.inputs['Base Color'].default_value
 ls.new(attr.outputs['Alpha'],mix.inputs[0]);ls.new(attr.outputs['Color'],mix.inputs[2])
 mapping=ns.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1450,1450,145);ls.new(pos.outputs['Position'],mapping.inputs[0]);noise=ns.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1;noise.inputs['Detail'].default_value=2;ls.new(mapping.outputs[0],noise.inputs['Vector'])
 ramp=ns.new('ShaderNodeMapRange');ramp.inputs['To Min'].default_value=.90;ramp.inputs['To Max'].default_value=1.04;ls.new(noise.outputs['Fac'],ramp.inputs[0]);mul=ns.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;ls.new(mix.outputs[0],mul.inputs[1]);ls.new(ramp.outputs[0],mul.inputs[2]);ls.new(mul.outputs[0],bs.inputs['Base Color'])
 bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.00012;ls.new(noise.outputs['Fac'],bump.inputs['Height']);ls.new(bump.outputs[0],bs.inputs['Normal'])
attr=mesh.color_attributes.new(name='NeckCoatBlend',type='FLOAT_COLOR',domain='POINT')
for v in mesh.vertices:
 p=mw@v.co;x,y,z=p;h=z-.30*(y+.24);w=sm(.176,.204,h)*(1-sm(.229,.262,h));rear=sm(-.235,-.203,y)*sm(.231,.252,z)*(1-sm(.283,.310,z));w=max(w,rear);cream=(1-sm(.022,.040,abs(x)))*(1-sm(-.246,-.224,y));stripe=sm(.35,.82,math.sin(x*290+1.7*math.sin(z*63)+y*22));c=Vector((.23,.074,.014))*(1-.32*stripe);c=c.lerp(Vector((.68,.51,.29)),cream);attr.data[v.index].color=(*c,w)
# All original source UVs stay available during bake; final export retains only the new atlas.
active(head);mesh.uv_layers.new(name='CoatV28');mesh.uv_layers.active_index=len(mesh.uv_layers)-1;mesh.uv_layers.active.active_render=True
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.005);bpy.ops.object.mode_set(mode='OBJECT')
color=bpy.data.images.new('A_CoatColor_V28',4096,4096);normal=bpy.data.images.new('A_CoatNormal_V28',4096,4096);normal.colorspace_settings.name='Non-Color'
for mat in mesh.materials:
 ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');em=ns.new('ShaderNodeEmission');ls.new(bs.inputs['Base Color'].links[0].from_socket,em.inputs[0]);ls.new(em.outputs[0],out.inputs[0]);node=ns.new('ShaderNodeTexImage');node.image=color;ns.active=node
bpy.ops.object.bake(type='EMIT');color.filepath_raw=str(OUT/'a-coat-color-v28.png');color.file_format='PNG';color.save();color.pack()
for mat in mesh.materials:
 ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL');ls.new(bs.outputs[0],out.inputs[0]);node=ns.new('ShaderNodeTexImage');node.image=normal;ns.active=node
bpy.ops.object.bake(type='NORMAL');normal.filepath_raw=str(OUT/'a-coat-normal-v28.png');normal.file_format='PNG';normal.save();normal.pack()
final=bpy.data.materials.new('A_UnifiedCoat_V28');final.use_nodes=True;ns=final.node_tree.nodes;ls=final.node_tree.links;bs=ns.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86;ct=ns.new('ShaderNodeTexImage');ct.image=color;ls.new(ct.outputs[0],bs.inputs['Base Color']);nt=ns.new('ShaderNodeTexImage');nt.image=normal;nm=ns.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.6;ls.new(nt.outputs[0],nm.inputs['Color']);ls.new(nm.outputs[0],bs.inputs['Normal']);mesh.materials.clear();mesh.materials.append(final)
for p in mesh.polygons:p.material_index=0;p.use_smooth=True
for name in [l.name for l in mesh.uv_layers]:
 if name!='CoatV28':mesh.uv_layers.remove(mesh.uv_layers[name])
for name in [a.name for a in mesh.color_attributes]:mesh.color_attributes.remove(mesh.color_attributes[name])
report['vertices']=len(mesh.vertices);report['shape_keys']={k.name:len(k.data) for k in mesh.shape_keys.key_blocks};assert len(set(report['shape_keys'].values()))==1
(OUT/'v28-neck-check.json').write_text(json.dumps(report,indent=2));scene['stage']='V28: head and torso share a manifold bridged neck; preserved facial morphs, baked continuous coat color and fine tangent normal detail.'
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v28.blend'))
meshes=[bpy.data.objects[n] for n in ['mesh_0.001','mesh_0','Object_32','A_Tail','A_OralCavity','A_Tongue','A_LipRim']];bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in ['EMPTY','ARMATURE'] or o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(OUT/'bicolor-a-v28.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_skins=True,export_morph=True)
s=Path('C:/Users/turbo08/mew_voice/scripts/rebuild-bicolor-v18.py').read_text(encoding='utf-8').split('# Neutral rendering with actual open/closed jaw and side profile.',1)[1];s=s.replace("[('front'","[('back',(0,1,.25),(0,-.18,.18),.43,1),('front'");exec(s.replace('v18-','v28-').replace('(0,-.27,.295)','(0,-.27,.256)'))
