from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import json,collections
src=Path(r'C:/Users/rajan/Downloads/CEE/CEE/CEE SET  26- October  03');ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
for i,f in enumerate(src.glob('*.docx')):
 with ZipFile(f) as z:
  root=E.fromstring(z.read('word/document.xml'));ps=root.xpath('//w:body//w:p',namespaces=ns)
  print(i,'numbered',len(root.xpath('//w:pPr/w:numPr',namespaces=ns)))
  if i in [1,3]:
   print('math types',collections.Counter(E.QName(x).localname for math in root.xpath('//m:oMath',namespaces=ns) for x in math.iter()))
   info=[]
   for n,p in enumerate(ps):
    text=''.join(p.xpath('.//w:t/text()|.//m:t/text()',namespaces=ns));num=p.find('w:pPr/w:numPr',ns);style=p.find('w:pPr/w:pStyle',ns)
    info.append({'p':n,'text':text,'num':E.tostring(num).decode() if num is not None else None,'style':style.get('{'+ns['w']+'}val') if style is not None else '', 'images':p.xpath('.//a:blip/@r:embed',namespaces={**ns,'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'})})
   Path(f'C:/Users/rajan/Desktop/Examly/cee-set-26/work/{i}.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf8')
   print('styles',collections.Counter(x['style'] for x in info));print('image paras',[(x['p'],x['text'],x['images']) for x in info if x['images']])
