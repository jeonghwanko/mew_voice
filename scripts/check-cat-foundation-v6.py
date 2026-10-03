"""Check closed clay volumes, independently of render appearance."""
import bpy,bmesh,json
from pathlib import Path
report={}
for name in ['Cat_Anatomical_Surface','A4_Tail']:
    obj=bpy.data.objects[name]
    bm=bmesh.new();bm.from_mesh(obj.data)
    report[name]={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)}
    bm.free()
    assert report[name]['nonmanifold_edges']==0,name
    assert report[name]['signed_volume']>0,name
assert not any(o.type=='ARMATURE' for o in bpy.data.collections['CatA_Sculpt'].objects)
Path(bpy.data.filepath).with_name('foundation-v6-topology.json').write_text(json.dumps(report,indent=2))
print('FOUNDATION_TOPOLOGY_OK',json.dumps(report),flush=True)
