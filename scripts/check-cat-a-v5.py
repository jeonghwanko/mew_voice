"""Actual paw/tail topology checks and closed-eyelid coverage."""
import bpy,bmesh,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT='C:/Users/turbo08/mew_voice/assets/avatar/blender'
assert bpy.data.filepath.replace('\\','/').endswith('/cat-a-study-v5.blend')
report={'file':bpy.data.filepath,'topology':[],'closedLids':[]}
for name in ['A4_Body','A4_Tail']:
    data=bpy.data.objects[name].data;bm=bmesh.new();bm.from_mesh(data)
    nonmanifold=sum(not e.is_manifold for e in bm.edges);volume=bm.calc_volume(signed=True)
    report['topology'].append({'mesh':name,'nonManifoldEdges':nonmanifold,'signedVolume':volume})
    assert nonmanifold==0 and volume>0,report['topology'][-1]
    bm.free()
for sign in [-1,1]:
    obj=bpy.data.objects['A4_Lid_'+str(sign)];key=obj.data.shape_keys.key_blocks['Blink']
    tree=BVHTree.FromPolygons([v.co.copy() for v in key.data],[list(p.vertices) for p in obj.data.polygons]);covered=0;total=0
    for ix in range(-9,10):
        for iz in range(-9,10):
            x=ix/10;z=iz/10
            if x*x+z*z>.81:continue
            hit=tree.ray_cast(Vector((sign*.300+x*.188,-3,2.733+z*.155)),Vector((0,1,0)),4)
            total+=1;covered+=hit[0] is not None
    assert covered==total
    report['closedLids'].append({'lid':obj.name,'covered':covered,'sampleCount':total})
with open(OUT+'/v5-validation.json','w',encoding='utf-8') as output:json.dump(report,output,ensure_ascii=False,indent=2)
print('A5_VALIDATION_OK',json.dumps(report),flush=True)
