import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references');OUT=ROOT/'fullbody-weld';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'fullbody-fit/fullbody-fit.blend'))
s=bpy.context.scene;upper=bpy.data.objects['V13_Upper_mesh_0.001'];lower=bpy.data.objects['New_Seated_Haunch_With_V13_Toes']
face=[v.co.copy() for v in upper.data.vertices if v.co.y<-.11 and v.co.z>.24]
# Close only the intentional torso cut, preserving all other source details.
bm=bmesh.new();bm.from_mesh(upper.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
cut=[e for e in bm.edges if e.is_boundary and all(abs(v.co.y-.035)<2e-5 for v in e.verts)]
cap=bmesh.ops.holes_fill(bm,edges=cut,sides=0)
unseen=set(bm.verts);components=[]
while unseen:
 stack=[unseen.pop()];component=set(stack)
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   u=e.other_vert(v)
   if u in unseen:unseen.remove(u);component.add(u);stack.append(u)
 components.append(component)
main=max(components,key=len);removed=sum(len(c) for c in components if c is not main)
bmesh.ops.delete(bm,geom=[v for c in components if c is not main for v in c],context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(upper.data);bm.free()
# Keep a snapshot before boolean for a reproducible boundary audit.
bpy.ops.object.select_all(action='DESELECT');lower.select_set(True);bpy.context.view_layer.objects.active=lower
mod=lower.modifiers.new('Torso haunch union','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=upper;mod.use_self=False;mod.use_hole_tolerant=False
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(upper,do_unlink=True);upper=lower;upper.name='Joined_Cat_Body'
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
g=upper.vertex_groups.new(name='Torso_seam_only')
for v in upper.data.vertices:
 p=v.co;w=(1-smooth(.012,.04,abs(p.y-.035)))*smooth(.035,.065,p.z)*(1-smooth(.225,.27,p.z))
 if w>0:g.add([v.index],w,'REPLACE')
sm=upper.modifiers.new('Local seam relaxation','SMOOTH');sm.vertex_group=g.name;sm.factor=.5;sm.iterations=18;bpy.ops.object.modifier_apply(modifier=sm.name)
# Set the actual forepaw skin low point to the same support plane as the haunch.
floor=.0037;contact=[]
for obj in [upper,bpy.data.objects.get('V13_Upper_mesh_0')]:
 if obj is None:continue
 for side in [-1,1]:
  candidates=[v for v in obj.data.vertices if v.co.y<-.045 and v.co.z<.055 and v.co.x*side>0]
  if not candidates:continue
  zmin=min(v.co.z for v in candidates);offset=zmin-floor
  for v in obj.data.vertices:
   if v.co.y<-.045 and v.co.x*side>0:v.co.z-=offset*(1-smooth(.035,.095,v.co.z))
  contact.append({'object':obj.name,'side':side,'previous_min':zmin,'new_min':min(v.co.z for v in candidates)})
s.objects['Ground'].location.z=floor
for p in upper.data.polygons:p.use_smooth=True
bm=bmesh.new();bm.from_mesh(upper.data)
audit={'discarded_old_hind_fragments':removed,'boolean_cap_faces':len(cap.get('faces',[])),'vertices':len(bm.verts),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'forepaw_contact':contact,'scope':'static union; animation, UV seam and tail unfinished'}
# Coordinate preservation check for the head, independent of reordered vertex indices.
from mathutils.kdtree import KDTree
kd=KDTree(len(upper.data.vertices))
for v in upper.data.vertices:kd.insert(v.co,v.index)
kd.balance();audit['head_surface_max_nearest_error']=max(kd.find(p)[2] for p in face);bm.free()
cam=s.camera
for name,loc in [('side',(1,0,.25)),('front',(0,-1,.24)),('back',(0,1,.24)),('quarter',(.7,-1,.5))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.01,.19))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fullbody-weld.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type=='MESH' and o.name!='Ground':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'fullbody-weld.glb'),export_format='GLB',use_selection=True,export_animations=False)
(OUT/'audit.json').write_text(json.dumps(audit,indent=2));print('FULLBODY_WELD_COMPLETE',audit)
