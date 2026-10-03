import bpy,json,math,bmesh
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body=bpy.data.objects['A10_Continuous_Sculpt']
bvh=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
report={'eyes':[]}
for eye in [o for o in bpy.data.objects if o.name.startswith('A10_Eyeball')]:
    sign=1 if eye.location.x>0 else -1;tested=0;exposed=[]
    for v in eye.data.vertices:
        p=eye.matrix_world@v.co;dx=p.x-sign*.29;dz=p.z-2.65-sign*dx*.10
        bound=(.170 if dz>0 else .139)*math.sqrt(max(0,1-(dx/.225)**2))
        if abs(dx)<.24 and abs(dz)<bound+.016:continue
        tested+=1;hit,normal,index,distance=bvh.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)),4)
        if hit is None or p.y<hit.y-.006:exposed.append(list(p))
    report['eyes'].append({'name':eye.name,'tested_outside_opening':tested,'exposed_vertices':len(exposed),'examples':exposed[:8]})
report['materials']=[m.name for m in body.data.materials]
Path('C:/Users/turbo08/mew_voice/assets/avatar/blender/v10-eye-occlusion.json').write_text(json.dumps(report,indent=2))
print('V10_EYE_OCCLUSION',json.dumps(report))
assert all(e['exposed_vertices']==0 for e in report['eyes']), 'Eye surface visible outside the intended frontal aperture'
path=Path('C:/Users/turbo08/mew_voice/assets/avatar/blender/v10-geometry-check.json')
geometry=json.loads(path.read_text())
for name in geometry['meshes']:
    bm=bmesh.new();bm.from_mesh(bpy.data.objects[name].data)
    stats={'vertices':len(bm.verts),'nonmanifold':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)}
    bm.free();assert stats['nonmanifold']==0 and stats['volume']>0,name
    geometry['meshes'][name]=stats
geometry['frontal_eye_occlusion']=report['eyes']
path.write_text(json.dumps(geometry,indent=2))
