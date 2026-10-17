/* Runtime integration checks with a minimal DOM harness, not a browser layout test. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../core.js');

function workspace(saved){
 const elements=new Map(),events={},windowEvents={},downloads=[];
 class Element {
  constructor(id=''){this.id=id;this.innerHTML='';this.textContent='';this.dataset={};this.open=false;this.value='';this.hidden=false;this.listeners={};this.attributes={};this.isConnected=true;this.className='';this.classList={add:()=>{},remove:()=>{},toggle:()=>true};}
  addEventListener(name,fn){this.listeners[name]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  focus(){document.activeElement=this}
  showModal(){this.open=true}
  close(){this.open=false}
  querySelector(){this.error??=new Element();return this.error}
  querySelectorAll(){return []}
  click(){downloads.push(this.download)}
 }
 const document={activeElement:null,getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)},querySelectorAll(){return []},addEventListener(name,fn){events[name]=fn},createElement(){return new Element()}};
 const storage={raw:saved?JSON.stringify(saved):null,getItem(){return this.raw},setItem(_k,v){this.raw=v}};
 let confirms=true;
 const window={SchoolDesk:D,localStorage:storage,confirm:()=>confirms,addEventListener(name,fn){windowEvents[name]=fn},print(){}};
 const context={window,document,history:{replaceState(){}},location:{hash:''},Date,console,Blob,URL,setTimeout:()=>1,clearTimeout(){},FormData:class {constructor(form){this.values=form.values}get(k){return this.values[k]??null}getAll(k){const v=this.values[k];return Array.isArray(v)?v:v?[v]:[]}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context,{filename:'app.js'});
 function click(action,id='',extra={}){const element=new Element();element.dataset={action,id,...extra};element.closest=()=>element;events.click({target:element,preventDefault(){}});return element;}
 function page(name){const element=new Element();element.dataset={page:name};element.closest=()=>element;events.click({target:element,preventDefault(){}});}
 function input(id,value,dataset={}){const element=document.getElementById(id);element.value=value;element.dataset=dataset;events.input({target:element});}
 function change(id,value){const element=document.getElementById(id);element.value=value;events.change({target:element});}
 function submit(kind,values,id=''){const form=new Element();form.dataset={form:kind,id};form.values=values;events.submit({target:form,preventDefault(){}});return form.error?.textContent||'';}
 return {document,storage,windowEvents,events,page,click,input,change,submit,downloads,html:()=>document.getElementById('main').innerHTML,dialog:()=>document.getElementById('dialog').innerHTML,data:()=>JSON.parse(storage.raw),setConfirm:value=>confirms=value};
}

test('every workspace screen renders with connected demo records',()=>{
 const w=workspace();for(const name of ['overview','students','classes','attendance','planner','assessments','timetable','pastoral','notices','settings']){w.page(name);assert.ok(w.html().includes('page-heading'),name);assert.ok(!w.html().includes('[object Object]'),name);assert.ok(!w.html().includes('undefined'),name);}
});
test('all create and edit dialogs render; profiles show results and care history',()=>{
 const w=workspace();for(const [action,id,title]of [['new-student','','Add a student'],['edit-student','s1','Edit student'],['new-class','','Create a class'],['edit-class','c1','Edit class'],['new-plan','','Plan a lesson'],['edit-plan','p1','Edit lesson'],['new-assessment','','Create an assessment'],['edit-assessment','a1','Edit assessment'],['new-lesson','','Add a scheduled lesson'],['edit-lesson','l1','Edit scheduled lesson'],['new-note','','Add a pastoral record'],['edit-note','n1','Edit pastoral record'],['new-notice','','Write a notice'],['edit-notice','b1','Edit notice']]){w.click(action,id);assert.ok(w.dialog().includes(title),action);assert.ok(!w.dialog().includes('undefined'),action);w.click('close-dialog');}w.click('student-view','s3');assert.ok(w.dialog().includes('Assessment results'));assert.ok(w.dialog().includes('Learning support'));assert.ok(w.dialog().includes('planning scaffold'));
});
test('student create, duplicate rejection and archiving persist correctly',()=>{
 const w=workspace();const values={firstName:'New',lastName:'Learner',code:'NEW01',year:'9',homegroup:'9 Test',guardian:'Test caregiver',email:'test@example.com',phone:'',support:'',active:'true'};
 assert.equal(w.submit('student',values),'');const student=w.data().students.find(s=>s.code==='NEW01');assert.ok(student.active);
 assert.match(w.submit('student',values),/already in use/);assert.equal(w.data().students.filter(s=>s.code==='NEW01').length,1);
 assert.equal(w.submit('student',{...values,active:'false'},student.id),'');assert.equal(w.data().students.find(s=>s.id===student.id).active,false);
});
test('class, planner, notice and pastoral forms save and remain connected',()=>{
 const w=workspace();assert.equal(w.submit('class',{name:'Science',code:'9SCI.1',year:'9',room:'S1',colour:'blue',studentIds:['s1','s2']}),'');const c=w.data().classes.find(c=>c.code==='9SCI.1');assert.equal(c.studentIds.length,2);
 assert.equal(w.submit('plan',{classId:c.id,date:'2026-10-20',title:'Investigation',objective:'Ask a question',activities:'Experiment',resources:'Notebook'}),'');assert.ok(w.data().plans.find(p=>p.classId===c.id));
 assert.equal(w.submit('notice',{title:'Meeting',body:'Bring notes.',date:'2026-10-20',category:'Staff notice'}),'');assert.ok(w.data().notices.find(n=>n.title==='Meeting'));
 assert.equal(w.submit('note',{studentId:'s1',category:'Wellbeing',text:'Follow up next week.',date:'2026-10-20',status:'Open'}),'');const note=w.data().notes.find(n=>n.text==='Follow up next week.');w.click('toggle-note',note.id);assert.equal(w.data().notes.find(n=>n.id===note.id).status,'Closed');
});
test('attendance saves a full roll and preserves prior dated rolls',()=>{
 const w=workspace(),before=D.seed().attendance[0].id;w.page('attendance');w.click('save-roll');assert.match(w.document.getElementById('toast').textContent,/every student/);
 w.click('all-present');w.click('save-roll');const s=w.data();assert.equal(s.attendance.length,2);assert.ok(s.attendance.find(r=>r.id===before));const latest=s.attendance.find(r=>r.id!==before);assert.ok(Object.values(latest.rows).every(r=>r.status==='Present'));
 const reopened=workspace(s);reopened.page('attendance');assert.ok(reopened.html().includes('Saved roll'));
});
test('marks distinguish a zero result, unmarked entries and invalid scores',()=>{
 const w=workspace();w.page('assessments');w.change('assessment-select','a1');w.input('mark-s1','0',{mark:'s1'});w.input('mark-s2','',{mark:'s2'});w.click('save-marks');assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,0);assert.equal(Object.hasOwn(w.data().assessments.find(a=>a.id==='a1').marks,'s2'),false);
 w.input('mark-s1','999',{mark:'s1'});w.click('save-marks');assert.match(w.document.getElementById('toast').textContent,/between 0 and 30/);assert.equal(w.data().assessments.find(a=>a.id==='a1').marks.s1,0);
});
test('unsaved navigation can be cancelled and beforeunload warns',()=>{
 const w=workspace();w.page('attendance');w.click('all-present');w.setConfirm(false);w.page('students');assert.ok(w.html().includes('Attendance status'));let prevented=false;w.windowEvents.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,true);w.setConfirm(true);w.page('students');assert.ok(w.html().includes('Student directory'));
});
test('timetable rejects conflicting lessons and assessment maximum protects marks',()=>{
 const w=workspace();assert.match(w.submit('lesson',{classId:'c1',day:'1',start:'09:10',end:'09:40',room:'H2'}),/overlaps/);
 assert.match(w.submit('assessment',{classId:'c1',title:'Existing',due:'2026-10-20',max:'5',description:''},'a1'),/below an existing mark/);
 assert.equal(w.submit('lesson',{classId:'c1',day:'2',start:'12:00',end:'13:00',room:'H2'}),'');assert.ok(w.data().lessons.find(l=>l.day===2&&l.start==='12:00'));
});
test('imported text is escaped in directory, profile, notices and lesson views',()=>{
 const s=D.seed();const payload='<img src=x onerror=alert(1)>';s.students[0].firstName=payload;s.notices[0].title=payload;s.plans[0].activities=payload;const w=workspace(s);w.page('students');assert.ok(!w.html().includes(payload));assert.ok(w.html().includes('&lt;img'));w.click('student-view','s1');assert.ok(!w.dialog().includes(payload));w.page('notices');assert.ok(!w.html().includes(payload));w.click('view-plan','p1');assert.ok(!w.dialog().includes(payload));
});
test('storage changes in another tab block overwriting stale data',()=>{
 const w=workspace();w.windowEvents.storage({key:D.STORAGE_KEY});assert.ok(w.document.getElementById('storage-warning').textContent.includes('another tab'));const result=w.submit('settings',{school:'Stale overwrite',teacher:'Teacher',role:'Teacher'});assert.match(result,/Restore/);assert.equal(w.storage.raw,null);
});
