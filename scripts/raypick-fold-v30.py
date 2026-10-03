import bpy,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
h=bpy.data.objects['mesh_0.001'];tree=BVHTree.FromPolygons([h.matrix_world@v.co for v in h.data.vertices],[list(p.vertices) for p in h.data.polygons]);cam=Vector((.22,.8,.34));target=Vector((0,-.21,.245));rot=(target-cam).to_track_quat('-Z','Y').to_matrix();right=rot@Vector((1,0,0));up=rot@Vector((0,1,0));forward=rot@Vector((0,0,-1))
for px,py in [(175,400),(185,425),(195,460),(550,390),(520,440),(495,470)]:
 origin=cam+right*((px/700-.5)*.2*700/800)+up*((.5-py/800)*.2);p,n,i,d=tree.ray_cast(origin,forward);print(px,py,tuple(p) if p else None)
