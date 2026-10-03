import bpy,bmesh,numpy as np,json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/turbo08/mew_voice/assets/avatar/references/fullbody-weld')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'fullbody-weld.blend'));s=bpy.context.scene;o=bpy.data.objects['Joined_Cat_Body'];bm=bmesh.new();bm.from_mesh(o.data)
edges=[e for e in bm.edges if e.calc_length()>.0025 and all(abs(v.co.y-.035)<.06 and .07<v.co.z<.27 for v in e.verts)]
bmesh.ops.subdivide_edges(bm,edges=edges,cuts=3,use_grid_fill=True);bm.to_mesh(o.data);bm.free()
n=len(o.data.vertices);base=np.array([v.co[:] for v in o.data.vertices]);target=base.copy();es=np.array([e.vertices[:] for e in o.data.edges]);a=np.concatenate([es[:,0],es[:,1]]);b=np.concatenate([es[:,1],es[:,0]]);degree=np.bincount(a,minlength=n)
mask=np.exp(-((base[:,1]-.035)/.035)**4)*np.clip((base[:,2]-.045)/.045,0,1)*np.clip((.28-base[:,2])/.04,0,1)*.7
for i in range(300):
 avg=np.stack([np.bincount(a,weights=target[b,j],minlength=n)/np.maximum(degree,1) for j in range(3)],axis=1);target+=mask[:,None]*(avg-target)
o.data.vertices.foreach_set('co',target.astype(np.float32).ravel());o.data.update()
bm=bmesh.new();bm.from_mesh(o.data);audit={'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'max_change':float(np.linalg.norm(target-base,axis=1).max()),'head_max_change':float(np.linalg.norm(target[base[:,1]<-.11]-base[base[:,1]<-.11],axis=1).max())};bm.free()
cam=s.camera
for name,loc in [('side',(1,0,.25)),('front',(0,-1,.24)),('back',(0,1,.24)),('quarter',(.7,-1,.5))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,-.01,.19))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fullbody-weld-finished.blend'));bpy.ops.object.select_all(action='DESELECT')
for ob in s.objects:
 if ob.type=='MESH' and ob.name!='Ground':ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'fullbody-weld-finished.glb'),export_format='GLB',use_selection=True,export_animations=False)
(OUT/'finish-audit.json').write_text(json.dumps(audit,indent=2));print('WELD_FINISH_COMPLETE')
