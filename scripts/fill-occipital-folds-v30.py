import bpy,math,json
from pathlib import Path
from mathutils import Vector,kdtree
from mathutils.bvhtree import BVHTree
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/realistic/rework');scene=bpy.context.scene;scene.frame_set(1);h=bpy.data.objects['mesh_0.001'];rig=bpy.data.objects['GLTF_created_0'];mw=h.matrix_world;inv=mw.inverted();mesh=h.data
fur=bpy.data.objects.get('A_ShortCoat')
if fur:bpy.data.objects.remove(fur,do_unlink=True)
mesh.calc_loop_triangles();srcpos=[mw@v.co for v in mesh.vertices];triangles=[tuple(t.vertices) for t in mesh.loop_triangles];srcuv=[tuple(mesh.uv_layers.active.data[i].uv) for i in range(len(mesh.loops))];triloops=[tuple(t.loops) for t in mesh.loop_triangles];keys={k.name:[mw.to_3x3()@(v.co-mesh.shape_keys.key_blocks[0].data[i].co) for i,v in enumerate(k.data)] for k in mesh.shape_keys.key_blocks};weights=[{g.group:g.weight for g in v.groups} for v in mesh.vertices];tree=BVHTree.FromPolygons(srcpos,triangles,all_triangles=True);kd=kdtree.KDTree(len(srcpos))
for i,p in enumerate(srcpos):kd.insert(p,i)
kd.balance();h.shape_key_clear()
def active(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
# Solid local fillers reach into the original skin; exact union removes interior overlaps.
for sign in [-1,1]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,location=(sign*.033,-.215,.235));patch=bpy.context.object;patch.scale=(.012,.014,.022);active(patch);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 marker=bpy.data.materials.get('FoldPatchMarker') or bpy.data.materials.new('FoldPatchMarker');patch.data.materials.append(marker)
 if marker.name not in h.data.materials:h.data.materials.append(marker)
 active(h);mod=h.modifiers.new('FillOccipitalFold','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=patch;mod.use_hole_tolerant=True;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(patch,do_unlink=True)
mesh=h.data
# Transfer unchanged vertices exactly and only project new intersection/filler vertices.
def bary(p,a,b,c):
 u=b-a;v=c-a;w=p-a;uu=u.dot(u);uv=u.dot(v);vv=v.dot(v);wu=w.dot(u);wv=w.dot(v);den=uu*vv-uv*uv
 if abs(den)<1e-18:return [1,0,0]
 y=(vv*wu-uv*wv)/den;z=(uu*wv-uv*wu)/den;ws=[max(0,1-y-z),max(0,y),max(0,z)];s=sum(ws);return [a/s for a in ws]
records=[];newcount=0
for vertex in mesh.vertices:
 p=mw@vertex.co;near,idx,dist=kd.find(p)
 if dist<1e-7:records.append(([idx],[1]));continue
 hit,normal,ti,d=tree.find_nearest(p);ids=triangles[ti];w=bary(hit,*[srcpos[i] for i in ids]);records.append((ids,w));newcount+=1
 for g in list(vertex.groups):h.vertex_groups[g.group].remove([vertex.index])
 values={}
 for i,a in zip(ids,w):
  for gi,b in weights[i].items():values[gi]=values.get(gi,0)+a*b
 for gi,value in values.items():
  if value>1e-7:h.vertex_groups[gi].add([vertex.index],value,'REPLACE')
# Newly exposed faces borrow the nearest coat UV rather than keeping the sphere's UV.
uv=mesh.uv_layers.active;patchedfaces=0
for poly in mesh.polygons:
 if poly.material_index==0:continue
 patchedfaces+=1
 for li in poly.loop_indices:
  p=mw@mesh.vertices[mesh.loops[li].vertex_index].co;hit,normal,ti,d=tree.find_nearest(p);w=bary(hit,*[srcpos[i] for i in triangles[ti]]);uv.data[li].uv=sum((Vector(srcuv[i])*a for i,a in zip(triloops[ti],w)),Vector((0,0)))
 poly.material_index=0
for name,deltas in keys.items():
 key=h.shape_key_add(name=name)
 if name!='Basis':
  for i,(ids,w) in enumerate(records):key.data[i].co+=mw.to_3x3().inverted()@sum((deltas[j]*a for j,a in zip(ids,w)),Vector())
 if name=='JawRound':
  for f,v in [(1,0),(16,0),(30,1),(45,1),(60,0),(76,0)]:key.value=v;key.keyframe_insert('value',frame=f)
scene.frame_set(1);mesh.normals_split_custom_set([(0,0,0)]*len(mesh.loops))
for e in mesh.edges:e.use_edge_sharp=False
for p in mesh.polygons:p.use_smooth=True
mesh.update();(OUT/'v30-local-repair.json').write_text(json.dumps({'source_vertices':len(srcpos),'vertices':len(mesh.vertices),'projected_vertices':newcount,'patched_faces':patchedfaces},indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bicolor-a-v30.blend'))
s=Path('scripts/diagnose-coat-v29.py').read_text(encoding='utf-8-sig').replace('v29-clay-before','v30-clay');exec(s)
