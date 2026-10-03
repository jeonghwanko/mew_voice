import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
scene=bpy.context.scene
skin=[o for o in bpy.data.objects if o.name.startswith(('A13_Continuous_Sculpt','A13_UpperLid','A13_LowerLid'))]
eyes=[o for o in bpy.data.objects if o.name.startswith('A13_Eyeball')]
report=[]
for frame in [1,44,50,60,80]:
    scene.frame_set(frame);graph=bpy.context.evaluated_depsgraph_get()
    surfaces=[BVHTree.FromObject(o,graph) for o in skin];visible=0;total=0
    for eye in eyes:
        evaluated=eye.evaluated_get(graph);mesh=evaluated.to_mesh()
        for v in mesh.vertices:
            p=eye.matrix_world@v.co;origin=Vector((p.x,-2,p.z));covered=False
            for surface in surfaces:
                hit,normal,index,d=surface.ray_cast(origin,Vector((0,1,0)),4)
                if hit is not None and hit.y<p.y+.001:covered=True;break
            visible+=not covered;total+=1
        evaluated.to_mesh_clear()
    report.append({'frame':frame,'sampled_eye_vertices':total,'uncovered_eye_vertices_front':visible})
Path('C:/Users/turbo08/mew_voice/assets/avatar/blender/v13-motion-check.json').write_text(json.dumps(report,indent=2))
print('V13_MOTION_CHECK',json.dumps(report))
assert report[2]['uncovered_eye_vertices_front']==0,'Closed lid still exposes eye geometry'
assert report[0]['uncovered_eye_vertices_front']>0,'Neutral eyes must be open'
