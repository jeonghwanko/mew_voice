"""Check packed assets and closed-lid coverage on the actual Blender model."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
scene=bpy.context.scene;scene.frame_set(1)
checks=[]
for sign in [-1,1]:
    obj=bpy.data.objects['A4_Lid_'+str(sign)];key=obj.data.shape_keys.key_blocks['Blink']
    assert all(math.isfinite(c) for vert in key.data for c in vert.co)
    tree=BVHTree.FromPolygons([vert.co.copy() for vert in key.data],[list(poly.vertices) for poly in obj.data.polygons])
    covered=0;total=0;miss=[]
    for ix in range(-9,10):
        for iz in range(-9,10):
            x=ix/10;z=iz/10
            if x*x+z*z>.81:continue
            point=Vector((sign*.300+x*.188,-3,2.733+z*.155))
            hit=tree.ray_cast(point,Vector((0,1,0)),4)
            total+=1
            if hit[0] is not None:covered+=1
            else:miss.append([ix,iz])
    checks.append({'lid':obj.name,'sampledEyeArea':total,'closedLidHits':covered,'misses':miss})
    assert covered==total,checks[-1]
for obj in bpy.data.collections['CatA_Sculpt'].objects:
    if obj.type!='MESH':continue
    assert all(math.isfinite(c) for vert in obj.data.vertices for c in vert.co),obj.name
report={'file':bpy.data.filepath,'closedLidCoverage':checks,'meshCount':sum(obj.type=='MESH' for obj in bpy.data.collections['CatA_Sculpt'].objects)}
with open('C:/Users/turbo08/mew_voice/assets/avatar/blender/v4-validation.json','w',encoding='utf-8') as output:json.dump(report,output,ensure_ascii=False,indent=2)
print('A4_VALIDATION_OK',json.dumps(report),flush=True)
