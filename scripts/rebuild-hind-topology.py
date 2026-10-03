# Executed inside build-v13-hind-rebuild.py after its seated pose is evaluated.
from collections import Counter,defaultdict
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
old=body;data=old.data;mw=old.matrix_world.copy();mi=mw.inverted()
coords=[mw@v.co for v in data.vertices]
keys=[tuple(round(x,5) for x in p) for p in coords]
represent={k:i for i,k in enumerate(keys)}
keep=[];removed=[]
for f in data.polygons:
 c=sum((coords[i] for i in f.vertices),Vector())/len(f.vertices)
 (removed if .035<c.y<.235 and c.z<.19 else keep).append(f.index)
edgecount=Counter();directions={}
for fi in keep:
 vs=list(data.polygons[fi].vertices)
 for a,b in zip(vs,vs[1:]+vs[:1]):
  pair=tuple(sorted((keys[a],keys[b])));edgecount[pair]+=1;directions[pair]=(keys[a],keys[b])
adj=defaultdict(set)
for (a,b),count in edgecount.items():
 if count==1 and .025<max(a[1],b[1])<.24 and min(a[2],b[2])<.23:adj[a].add(b);adj[b].add(a)
seen=set();rings=[]
for start in adj:
 if start in seen:continue
 ring=[];last=None;cur=start
 while cur not in seen:
  seen.add(cur);ring.append(represent[cur]);nxt=[x for x in adj[cur] if x!=last];last,cur=cur,nxt[0]
 assert len(ring)>20 and all(len(adj[keys[i]])==2 for i in ring)
 # New faces must run opposite the retained boundary edge.
 if directions[tuple(sorted((keys[ring[0]],keys[ring[1]])))]==(keys[ring[0]],keys[ring[1]]):ring.reverse()
 rings.append(ring)
assert len(rings)==1,len(rings)
whole=rings[0]
# Split the common pelvis opening into two leg openings sharing a crotch edge.
front=min(range(len(whole)),key=lambda j:coords[whole[j]].y+abs(coords[whole[j]].x)*.5)
whole=whole[front:]+whole[:front]
back=max(range(len(whole)),key=lambda j:coords[whole[j]].y-abs(coords[whole[j]].x)*.5)
rings=[whole[:back+1],whole[back:]+[whole[0]]]
update();ev=old.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh();posed=[mw@v.co for v in em.vertices];ev.to_mesh_clear()
verts=[v.co.copy() for v in data.vertices];faces=[tuple(data.polygons[i].vertices) for i in keep]
groups=[{w.group:w.weight for w in v.groups} for v in data.vertices]
targets={};newids=[]
# Use one coherent pelvis attachment loop before it branches into two legs.
for vi in whole:
 p=coords[vi]
 q=Vector((p.x,.125+(p.y-.115)*.65,.076-.20*(p.y-.115)))
 for i,k in enumerate(keys):
  if k==keys[vi]:targets[i]=q.copy()

kd=KDTree(len(coords))
for i,p in enumerate(coords):kd.insert(p,i)
kd.balance()
nearest={}
for ring in rings:
 center=sum((coords[i] for i in ring),Vector())/len(ring);side=1 if center.x>0 else -1
 area=sum(coords[ring[j]].x*coords[ring[(j+1)%len(ring)]].y-coords[ring[(j+1)%len(ring)]].x*coords[ring[j]].y for j in range(len(ring)))
 startangle=math.atan2((coords[ring[0]].y-center.y)/.046,(coords[ring[0]].x-center.x)/.025)
 angles=[startangle+(1 if area>0 else -1)*math.tau*j/len(ring) for j in range(len(ring))]
 previous=ring;count=len(ring)
 # Regular quad rings replace the folded, densely triangulated lower leg.
 for level,(z,cy,rx,ry,sy,sz,srx,srz) in enumerate([
  (.145,.135,.030,.045,.115,.046,.032,.025),
  (.078,.156,.022,.027,.074,.027,.025,.023),
  (.050,.151,.026,.042,.047,.023,.027,.022),
  (.029,.144,.030,.055,.018,.022,.030,.021),
  (.013,.142,.028,.053,-.008,.018,.029,.017),
  (.004,.142,.023,.043,-.026,.016,.023,.014),
 ]):
  current=[]
  for j,angle in enumerate(angles):
   p=Vector((side*.034+rx*math.cos(angle),cy+ry*math.sin(angle),z));idx=len(verts);verts.append(mi@p);current.append(idx);newids.append(idx)
   _,near,_=kd.find(p);nearest[idx]=near
   ankle=old.vertex_groups[bone('_24') if side>0 else bone('_30')].index;pelvis=old.vertex_groups[bone('_38')].index
   blend=.35 if level==0 else .12 if level==1 else 0
   groups.append({ankle:1-blend,pelvis:blend})
   target=Vector((side*.070+srx*math.cos(angle),sy,sz+srz*math.sin(angle)))
   # Attachment and first ring have compatible rounded cross-sections.
   target.z=max(0,target.z);targets[idx]=target
  for j in range(count):faces.append((previous[j],previous[(j+1)%count],current[(j+1)%count],current[j]))
  previous=current
 cap=len(verts);verts.append(mi@Vector((side*.034,.142,.003)));groups.append({ankle:1});targets[cap]=Vector((side*.07,-.035,.016));newids.append(cap);nearest[cap]=nearest[previous[0]]
 for j in range(count):faces.append((previous[j],previous[(j+1)%count],cap))
mesh=bpy.data.meshes.new('HindQuadRebuild');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('HindRebuiltBody',mesh);s.collection.objects.link(obj);obj.matrix_world=mw
for mat in data.materials:mesh.materials.append(mat)
pawmat=bpy.data.materials.new('Rebuilt_Paw_Cream');pawmat.diffuse_color=(.72,.70,.65,1);pawmat.use_nodes=True
pbs=pawmat.node_tree.nodes.get('Principled BSDF');pbs.inputs['Base Color'].default_value=(.72,.70,.65,1);pbs.inputs['Roughness'].default_value=.85
mesh.materials.append(pawmat);paw_material=len(mesh.materials)-1
for g in old.vertex_groups:obj.vertex_groups.new(name=g.name)
for i,weights in enumerate(groups):
 for gi,w in weights.items():obj.vertex_groups[gi].add([i],w,'REPLACE')
# Retain original texture coordinates; sample only the newly created region.
old_uv=data.uv_layers.active
uv_by_vertex={}
for loop in data.loops:uv_by_vertex.setdefault(loop.vertex_index,old_uv.data[loop.index].uv.copy())
uv=mesh.uv_layers.new(name=old_uv.name)
for fi,f in enumerate(mesh.polygons):
 f.use_smooth=True
 if fi<len(keep):
  source=data.polygons[keep[fi]];f.material_index=source.material_index
  for li,oldli in zip(f.loop_indices,source.loop_indices):uv.data[li].uv=old_uv.data[oldli].uv
 else:
  f.material_index=paw_material
  for li in f.loop_indices:
   vi=mesh.loops[li].vertex_index;uv.data[li].uv=uv_by_vertex[nearest.get(vi,vi)]
for attr in data.color_attributes:
 if attr.domain!='POINT':continue
 dst=mesh.color_attributes.new(name=attr.name,type=attr.data_type,domain='POINT')
 for i in range(len(verts)):dst.data[i].color=attr.data[nearest.get(i,i)].color
 if data.color_attributes.active_color==attr:mesh.color_attributes.active_color=dst
for key in data.shape_keys.key_blocks:
 nk=obj.shape_key_add(name=key.name,from_mix=False)
 for i in range(len(data.vertices)):nk.data[i].co=key.data[i].co
 nk.value=key.value
mod=obj.modifiers.new('Armature','ARMATURE');mod.object=rig
skin={g.index:world@rig.pose.bones[g.name].matrix@rig.data.bones[g.name].matrix_local.inverted()@inv for g in obj.vertex_groups}
corrective=obj.data.shape_keys.key_blocks['SitFoldCorrective']
for i,target in targets.items():
 matrix=Matrix(((0,0,0,0),)*4)
 for gi,w in groups[i].items():matrix+=skin[gi]*w
 corrective.data[i].co=mi@matrix.inverted_safe()@target
index=meshes.index(old);oldname=old.name;bpy.data.objects.remove(old,do_unlink=True);obj.name=oldname;meshes[index]=obj;body=obj
corrective.value=1;update()
print('HIND_TOPOLOGY_REBUILT',len(removed),len(newids),'boundary rings',[len(r) for r in rings])

