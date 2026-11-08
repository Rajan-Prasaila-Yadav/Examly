from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import re,json,shutil,collections
src=Path(r'C:/Users/rajan/Downloads/CEE/CEE/CEE SET  26- October  03');base=Path(r'C:/Users/rajan/Desktop/Examly/cee-set-26');out=base/'work'
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def tag(n):return E.QName(n).localname
def child(n,k):return n.find('m:'+k,ns)
def mt(n):
 if n is None:return ''
 t=tag(n);get=lambda k:mt(child(n,k));kids=lambda:''.join(mt(c) for c in n)
 if t.endswith('Pr') or t in ['ctrlPr','rFonts','szCs']:return ''
 if t=='t':
  s=n.text or '';return s.replace('%',r'\%').replace('∞',r'\infty ').replace('→',r'\to ').replace('×',r'\times ').replace('÷',r'\div ').replace('−','-').replace('°',r'^{\circ}').replace('∝',r'\propto ').replace('≈',r'\approx ').replace('≤',r'\le ').replace('≥',r'\ge ')
 if t=='f':return r'\frac{'+get('num')+'}{'+get('den')+'}'
 if t=='sSup':return '{'+get('e')+'}^{'+get('sup')+'}'
 if t=='sSub':return '{'+get('e')+'}_{'+get('sub')+'}'
 if t=='sSubSup':return '{'+get('e')+'}_{'+get('sub')+'}^{'+get('sup')+'}'
 if t=='sPre':return '{}_{'+get('sub')+'}^{'+get('sup')+'}'+get('e')
 if t=='rad':return r'\sqrt'+('['+get('deg')+']' if get('deg') else '')+'{'+get('e')+'}'
 if t=='acc':
  c=n.find('m:accPr/m:chr',ns);v=c.get('{'+ns['m']+'}val') if c is not None else '\u0302';cmd={'\u0302':'hat','\u0305':'overline','\u20d7':'vec','\u0307':'dot','\u0308':'ddot'}.get(v,'hat');return '\\'+cmd+'{'+get('e')+'}'
 if t in ['limUpp','limLow']:return ('\\overset{' if t=='limUpp' else '\\underset{')+get('lim')+'}{'+get('e')+'}'
 if t=='phant':return r'\phantom{'+get('e')+'}'
 if t in ['oMath','r','e','num','den','sup','sub','deg','lim']:return kids()
 raise ValueError('Unhandled math '+t)
def pt(p,q,kind):
 def walk(n):
  t=tag(n)
  if t=='oMath':return '$'+mt(n)+'$'
  if t=='t' and E.QName(n).namespace==ns['w']:
   s=n.text or '';r=n.getparent();vert=r.find('w:rPr/w:vertAlign',ns);v=vert.get('{'+ns['w']+'}val') if vert is not None else ''
   if v in ['superscript','subscript'] and s.strip():return '$'+('^' if v=='superscript' else '_')+'{'+s+'}$'
   return s
  if t=='tab':return '\t'
  if t in ['br','cr']:return '\n'
  if t=='blip':return f' [Image to attach: Q{q:03d}-{kind}.png] '
  if t.endswith('Pr'):return ''
  return ''.join(walk(c) for c in n)
 return re.sub(r'[ \t]+',' ',walk(p)).strip()
def doc(i):
 f=list(src.glob('*.docx'))[i]
 with ZipFile(f) as z:return E.fromstring(z.read('word/document.xml'))
questions=[];n=0
for p in doc(3).xpath('//w:body//w:p',namespaces=ns):
 if p.find('w:pPr/w:numPr',ns) is not None:n+=1;questions.append({'n':n,'paragraphs':[]})
 if n:questions[-1]['paragraphs'].append(pt(p,n,'question'))
sol={};n=0
for p in doc(1).xpath('//w:body//w:p',namespaces=ns):
 if p.find('w:pPr/w:numPr',ns) is not None:n+=1;sol[n]={'paragraphs':[],'reviews':[]}
 if not n:continue
 style=p.find('w:pPr/w:pStyle',ns);st=style.get('{'+ns['w']+'}val') if style is not None else ''
 if st=='Heading1':continue
 s=pt(p,n,'solution')
 if s:sol[n]['reviews' if st=='ReviewNote' else 'paragraphs'].append(s)
key1={};key2={}
for p in doc(0).xpath('//w:body//w:p',namespaces=ns):
 s=''.join(p.xpath('.//w:t/text()',namespaces=ns));m=re.fullmatch(r'\s*(\d+)\s+([a-d])\s*',s,re.I)
 if m:key1[int(m[1])]=m[2].upper()
ss=[''.join(p.xpath('.//w:t/text()',namespaces=ns)) for p in doc(2).xpath('//w:body//w:p',namespaces=ns)]
for j,s in enumerate(ss[:-1]):
 if re.fullmatch(r'\d+\.',s.strip()) and re.fullmatch(r'\([a-d]\)',ss[j+1].strip(),re.I):key2[int(s.strip()[:-1])]=ss[j+1].strip()[1].upper()
print('counts',len(questions),len(sol),len(key1),len(key2),'key differences',[(n,key1.get(n),key2.get(n)) for n in range(1,201) if key1.get(n)!=key2.get(n)])
rows=[];issues=[]
for q in questions:
 n=q['n'];texts=q['paragraphs'];joined='\n'.join(texts);parts=re.split(r'(?<![A-Za-z])([a-d])\)\s*',joined)
 # Option labels can directly follow previous option text in the Word extraction; tabs have been retained as spaces.
 if len(parts)!=9:print('PARSE',n,len(parts),repr(joined))
 row={'question_no':n,'section':'Zoology' if n<=40 else 'Botany' if n<=80 else 'Chemistry' if n<=130 else 'Physics' if n<=180 else 'Mental Agility','type':'single','question':parts[0].strip(),'option_a':'','option_b':'','option_c':'','option_d':'','answer':key1.get(n,''),'hint':'','solution':'\n\n'.join(sol[n]['paragraphs']),'video_solution':'','positive':'','negative':''}
 for j in range(1,len(parts)-1,2):row['option_'+parts[j]]=parts[j+1].strip()
 if n==94:
  for c in 'abcd':row['option_'+c]=f'[Image to attach: Q094-option-{c.upper()}.png]'
  row['question']=texts[0]
 row['review_notes']='\n\n'.join(sol[n]['reviews']);rows.append(row)
 if sol[n]['reviews']:issues.append({'question':n,'source_answer':row['answer'],'notes':row['review_notes']})
(out/'rows.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');(out/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf8')
print('empty options',[(r['question_no'],k) for r in rows for k in ['option_a','option_b','option_c','option_d'] if not r[k]])
print('solution heading differences',[(r['question_no'],r['answer'],r['solution'][:30]) for r in rows if not r['solution'].lower().startswith('('+r['answer'].lower()+')')])
