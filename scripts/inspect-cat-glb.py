"""Validate the saved GLB's buffers, skin/morph structure, colors and bounds."""
import json,struct,math,sys
from pathlib import Path
p=Path(sys.argv[1]);data=p.read_bytes();magic,version,length=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and length==len(data)
size,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
doc=json.loads(data[20:20+size]);meshes=doc['meshes'];prims=[p for m in meshes for p in m['primitives']]
for a in doc['accessors']:
    for field in ['min','max']:
        assert all(math.isfinite(v) for v in a.get(field,[]))
assert len(doc.get('skins',[]))==1 and len(doc['skins'][0]['joints'])==2
assert doc.get('animations') and any('targets' in p for p in prims)
assert any('COLOR_0' in p['attributes'] for p in prims)
assert all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for p in prims)
result={'file':p.name,'bytes':len(data),'meshes':len(meshes),'materials':len(doc['materials']),'triangles':sum(doc['accessors'][p['indices']]['count']//3 for p in prims),'vertices':sum(doc['accessors'][p['attributes']['POSITION']]['count'] for p in prims),'colored_primitives':sum('COLOR_0' in p['attributes'] for p in prims),'morph_meshes':[m.get('name') for m in meshes if any('targets' in p for p in m['primitives'])],'animation_channels':sum(len(a['channels']) for a in doc['animations']),'skin_joints':2}
p.with_suffix('.inspection.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
