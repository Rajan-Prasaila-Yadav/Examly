from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import json
src=Path(r'C:/Users/rajan/Downloads/CEE/CEE/CEE SET  26- October  03')
out=Path(r'C:/Users/rajan/Desktop/Examly/cee-set-26/work')
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
for i,f in enumerate(src.glob('*.docx')):
 with ZipFile(f) as z:
  root=E.fromstring(z.read('word/document.xml'))
  lines=[''.join(p.xpath('.//w:t/text()|.//m:t/text()',namespaces=ns)) for p in root.xpath('//w:body//w:p',namespaces=ns)]
  (out/(str(i)+'.txt')).write_text('\n'.join(f'{n}: {s}' for n,s in enumerate(lines)),encoding='utf8')
  print(i,f.name,'paras',len(lines),'math',len(root.xpath('//m:oMath',namespaces=ns)),'media',len([n for n in z.namelist() if n.startswith('word/media/')]))
  print('\n'.join(lines[:22]))
