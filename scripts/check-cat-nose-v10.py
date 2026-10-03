import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body=bpy.data.objects['A10_Continuous_Sculpt'];b=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
for z in [2.40,2.423,2.44]:
    print('NOSE_ATTACH',z,b.ray_cast(Vector((0,-2,z)),Vector((0,1,0)),4)[0])
n=bpy.data.objects['A10_Nose'];print('NOSE_BOUNDS',min((n.matrix_world@v.co).y for v in n.data.vertices),max((n.matrix_world@v.co).y for v in n.data.vertices))
