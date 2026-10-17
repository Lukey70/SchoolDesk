const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../core.js'),V2=require('../core-v2.js');
const seed=()=>D.seed('2026-10-17');
const lesson=(s,date='2026-10-19')=>D.sessionsOn(s,date).find(l=>l.classId==='c1');
const task=(id,max,marks={},statuses={},weight=0)=>({id,classId:'c1',yearId:'y2026',title:id,due:'2026-10-20',max,marks,statuses,weight,description:''});
const memory=()=>({raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}});

test('v2 upgrade keeps original bytes and preserves all scores and roll records',()=>{
 const old=V2.seed('2026-10-17'),raw=JSON.stringify(old),storage=memory();storage.raw=raw;const store=new D.Store(storage);
 assert.equal(storage.raw,raw);assert.equal(store.data.version,3);assert.deepEqual(store.data.attendance,old.attendance);assert.deepEqual(store.data.assessments[0].marks,old.assessments[0].marks);
 assert.equal(store.data.classes[0].yearId,'');assert.equal(store.data.timetableVersions.length,1);store.commit(s=>s.settings.school='Upgraded');assert.equal(JSON.parse(storage.raw).version,3);assert.equal(old.version,2);
});
test('v3 backups retain enrolments, colours, weightings and protected attendance',()=>{
 const s=seed();s.students[0].preferredName='Alex';s.classes[0].colour='colour36';D.archiveStudent(s,'s1','2026-11-01');D.reviseTimetable(s,'2026-11-02',rows=>rows[0].room='New room');s.assessments[0].weight=100;s.gradingModes['c1|y2026']='weighted';s.assessments[0].statuses.s1='Exempt';assert.deepEqual(D.parseBackup(JSON.stringify(s)),s);
});
test('preferred names keep the requested full-name order and optional fallback',()=>{
 assert.equal(D.displayName({firstName:'Alex',preferredName:'Lex',lastName:'Smith'}),'Alex (Lex) Smith');assert.equal(D.displayName({firstName:'Alex',lastName:'Smith'}),'Alex Smith');
});
test('school and class start dates are inclusive and withdrawal dates exclusive',()=>{
 const s=seed(),x=s.students[0],c=s.classes[0];x.schoolEnrolments=[{start:'2026-10-19',end:'2026-10-30'}];c.enrolments.find(r=>r.studentId==='s1').start='2026-10-20';
 for(const [date,enrolled]of [['2026-10-18',false],['2026-10-19',false],['2026-10-20',true],['2026-10-29',true],['2026-10-30',false]])assert.equal(D.classEnrolled(s,'c1','s1',date),enrolled,date);
});
test('attendance before joining and on the first withdrawn day is grey and locked',()=>{
 const s=seed(),e=s.classes[0].enrolments.find(r=>r.studentId==='s1');e.start='2026-10-20';e.end='2026-10-26';
 for(const date of ['2026-10-19','2026-10-26']){const l=lesson(s,date),v=D.attendanceValue(s,l,'s1');assert.equal(v.notEnrolled,true);assert.equal(v.locked,true);assert.throws(()=>D.setAttendance(s,l,'s1','Present'),/not enrolled/);}
 const l=lesson(s,'2026-10-21');D.setAttendance(s,l,'s1','Present');assert.equal(D.attendanceValue(s,l,'s1').status,'Present');
});
test('archiving a student closes every class on that date, retaining earlier records',()=>{
 const s=seed(),before=D.clone(s.attendance);D.archiveStudent(s,'s1','2026-10-20');D.validateState(s);assert.equal(D.classEnrolled(s,'c1','s1','2026-10-19'),true);assert.equal(D.studentEnrolled(s.students[0],'2026-10-20'),false);assert.deepEqual(s.attendance,before);assert.equal(s.assessments[0].marks.s1,26);
 for(const c of s.classes)assert.ok(c.enrolments.filter(e=>e.studentId==='s1').every(e=>e.end<='2026-10-20'));
});
test('archiving removes future enrolments and re-enrolling school does not re-add classes',()=>{
 const s=seed();s.classes[0].enrolments.find(e=>e.studentId==='s1').start='2026-11-01';D.archiveStudent(s,'s1','2026-10-20');assert.equal(s.classes[0].enrolments.some(e=>e.studentId==='s1'),false);D.restoreStudent(s,'s1','2026-10-26');D.validateState(s);assert.equal(D.studentEnrolled(s.students[0],'2026-10-26'),true);assert.equal(D.classEnrolled(s,'c1','s1','2026-10-26'),false);
});
test('class archive and restore preserve historical sessions, marks and rosters',()=>{
 const s=seed(),marks=D.clone(s.assessments);D.archiveClass(s,'c1','2026-10-20');assert.ok(lesson(s,'2026-10-19'));assert.equal(lesson(s,'2026-10-21'),undefined);D.restoreClass(s,'c1','2026-10-26');D.validateState(s);assert.ok(lesson(s,'2026-10-26'));assert.deepEqual(s.assessments,marks);assert.ok(s.classes[0].enrolments.length);
});
test('class school-year links stop recurrence spilling into other years',()=>{
 const s=seed();s.classes[0].yearId='y2026';D.validateState(s);assert.ok(lesson(s));assert.ok(!D.sessionsOn(s,'2027-10-18').some(l=>l.classId==='c1'));assert.equal(D.classEnrolled(s,'c1','s1','2027-03-01'),false);
});
test('dated timetable edits leave earlier sessions and lesson plans intact',()=>{
 const s=seed(),before=lesson(s),plan=D.clone(s.plans[0]);D.reviseTimetable(s,'2026-10-26',rows=>rows.find(l=>l.id===before.id).room='H9');D.validateState(s);assert.equal(lesson(s).room,before.room);assert.equal(lesson(s,'2026-10-26').room,'H9');assert.deepEqual(s.plans[0],plan);
});
test('out-of-order timetable versions apply until the next scheduled change',()=>{
 const s=seed(),id=lesson(s).id;D.reviseTimetable(s,'2026-11-02',rows=>rows.find(l=>l.id===id).room='Later');D.reviseTimetable(s,'2026-10-26',rows=>rows.find(l=>l.id===id).room='Middle');
 assert.equal(lesson(s,'2026-10-26').room,'Middle');assert.equal(lesson(s,'2026-11-02').room,'Later');D.reviseTimetable(s,'2026-10-26',rows=>rows.find(l=>l.id===id).room='Revised');assert.equal(s.timetableVersions.length,3);assert.equal(lesson(s,'2026-10-26').room,'Revised');D.validateState(s);
});
test('removing recurring classes takes effect only from the chosen date',()=>{
 const s=seed(),id=lesson(s).id;D.reviseTimetable(s,'2026-10-26',rows=>rows.splice(rows.findIndex(x=>x.id===id),1));assert.ok(lesson(s));assert.equal(lesson(s,'2026-10-26'),undefined);assert.ok(s.plans.length);
});
test('historical snapshots reject conflicts and broken class references',()=>{
 for(const change of [s=>s.timetableVersions[0].lessons.push({...s.lessons[0],id:'dup'}),s=>s.timetableVersions[0].lessons[0].classId='unknown',s=>s.timetableVersions.push({...s.timetableVersions[0],id:'same-date'})]){const s=seed();change(s);assert.throws(()=>D.validateState(s));}
});
test('all forty class colours are unique safe hex colours and survive validation',()=>{
 assert.equal(Object.keys(D.PALETTE).length,40);assert.equal(new Set(Object.values(D.PALETTE)).size,40);for(const [key,value]of Object.entries(D.PALETTE)){assert.match(value,/^#[0-9a-f]{6}$/);const s=seed();s.classes[0].colour=key;D.validateState(s);}
});
test('automatic numbers skip collisions and ignore supplied numbers',()=>{
 const s=seed();s.students[0].code='sd000001';const rows=[{firstName:'A',lastName:'One',year:'9',homegroup:'9A',code:'Supplied'},{firstName:'B',lastName:'Two',year:'10',homegroup:'10B'}],added=D.addStudents(s,rows,'2026-10-19');assert.equal(added[0].code,'SD000002');assert.equal(added[1].code,'SD000003');D.validateState(s);
});
test('bulk add validates the entire batch before adding any rows',()=>{
 const s=seed(),before=JSON.stringify(s);assert.throws(()=>D.addStudents(s,[{firstName:'A',lastName:'One',year:'9',homegroup:'9A'},{firstName:'B',lastName:'',year:'9',homegroup:'9A'}],'2026-10-19'),/Row 2/);assert.equal(JSON.stringify(s),before);assert.throws(()=>D.addStudents(s,[]),/between/);
});
test('CSV and Excel student import recognises headers, preferred names and ignores numbers',()=>{
 const rows=D.studentImport('\uFEFFStudent number,First name,Last name,Year level,Home group,Preferred name\r\n123,Alex,Smith,9,9A,Lex\r\n456,"Jo, Anne",Jones,10,10B,Jo');assert.equal(rows.length,2);assert.equal(rows[0].preferredName,'Lex');assert.equal(rows[1].firstName,'Jo, Anne');assert.equal(rows[0].code,undefined);assert.equal(D.studentImport('Sam\tLee\t8\t8C')[0].homegroup,'8C');
});
test('delimited parser handles escaped quotes, multiline values and malformed quotes',()=>{
 assert.deepEqual(D.parseDelimited('"A ""name""",B\n"two\nlines",C'),[['A "name"','B'],['two\nlines','C']]);assert.throws(()=>D.parseDelimited('"open'),/not closed/);assert.deepEqual(D.parseDelimited('15\n\n20\n',undefined,true),[['15'],[''],['20']]);
});
test('student-screen overrides count even when no teacher roll exists and deduplicate saved rolls',()=>{
 const s=seed(),l=lesson(s),filter={studentId:'s1',start:l.date,end:l.date};s.absences.push({id:'a',studentId:'s1',start:l.date,end:l.date,type:'Music lesson',periodIds:['p1'],comment:'Tuition'});let entries=D.attendanceEntries(s,filter);assert.equal(entries.length,1);assert.equal(entries[0].status,'Music lesson');s.attendance.push({id:l.key,date:l.date,classId:l.classId,periodId:l.periodId,rows:{s1:{status:'Present',comment:''}},savedAt:''});entries=D.attendanceEntries(s,filter);assert.equal(entries.length,1);assert.equal(entries[0].status,'Music lesson');assert.equal(D.attendanceSummary(s,'s1',filter).rate,0);
});
test('shared attendance counting rules support attended, absent and excluded types',()=>{
 const s=seed(),l=lesson(s),f={start:l.date,end:l.date,classId:'c1'};D.setAttendance(s,l,'s1','Present');D.setAttendance(s,l,'s2','Late');D.setAttendance(s,l,'s3','Absent');s.settings.attendanceRules.Late='Exclude';let count=D.attendanceSummary(s,null,f);assert.equal(count.total,2);assert.equal(count.attended,1);assert.equal(count.excluded,1);assert.equal(count.rate,50);s.settings.attendanceRules.Absent='Attended';assert.equal(D.attendanceSummary(s,null,f).rate,100);
});
test('non-enrolled marks and future overrides are omitted from default summaries',()=>{
 const s=seed(),l=lesson(s);D.setAttendance(s,l,'s1','Present');D.archiveStudent(s,'s1',l.date);assert.equal(D.attendanceEntries(s,{start:l.date,end:l.date,studentId:'s1'}).length,0);s.absences.push({id:'future',studentId:'s2',start:'2027-10-18',end:'2027-10-18',type:'Camp',periodIds:[],comment:''});assert.ok(!D.attendanceEntries(s).some(e=>e.date==='2027-10-18'));
});
test('holiday and period-specific overrides never create phantom attendance entries',()=>{
 const s=seed();s.absences.push({id:'a',studentId:'s1',start:'2026-10-19',end:'2026-10-20',type:'Camp',periodIds:['p1'],comment:''});s.calendar.holidays.push({id:'h',name:'Closed',type:'Public Holiday',start:'2026-10-19',end:'2026-10-19'});assert.equal(D.attendanceEntries(s,{studentId:'s1',start:'2026-10-19',end:'2026-10-19',classId:'c1'}).length,0);
});
test('assessment statuses distinguish unmarked, exempt, missing and a scored zero',()=>{
 const a=task('a',20,{s1:0,s2:20,s3:20},{s2:'Exempt',s3:'Not marked',s4:'Not submitted'});assert.equal(D.assessedValue(a,'s1'),0);assert.equal(D.assessedValue(a,'s2'),null);assert.equal(D.assessedValue(a,'s3'),null);assert.equal(D.assessedValue(a,'s4'),0);assert.equal(D.assessedValue(a,'s5'),null);
});
test('class average includes zeros and missing work and excludes exemptions and blanks',()=>{
 const s=seed(),a=task('a',20,{s1:20,s2:0},{s3:'Not submitted',s4:'Exempt'});s.assessments=[a];const average=D.assessmentAverage(s,a);assert.equal(average.count,3);assert.ok(Math.abs(average.percent-100/3)<1e-10);assert.equal(D.assessmentAverage(s,a,{s1:'bad'}).invalid,true);
});
test('weighted overall uses task weights rather than maximum marks',()=>{
 const s=seed();s.assessments=[task('a',20,{s1:20},{},25),task('b',100,{s1:0},{},75)];s.gradingModes['c1|y2026']='weighted';D.validateState(s);assert.equal(D.overall(s,'s1','c1','y2026').percent,25);s.gradingModes['c1|y2026']='points';assert.ok(Math.abs(D.overall(s,'s1','c1','y2026').percent-100/6)<1e-10);
});
test('weighted overall normalises included weights and excludes zero-weight tasks',()=>{
 const s=seed();s.assessments=[task('a',20,{s1:10},{},25),task('b',100,{}, {s1:'Exempt'},75),task('c',100,{s1:100},{},0)];s.gradingModes['c1|y2026']='weighted';assert.equal(D.overall(s,'s1','c1','y2026').percent,50);s.assessments[1].statuses.s1='Not submitted';assert.equal(D.overall(s,'s1','c1','y2026').percent,12.5);
});
test('invalid draft results cannot yield a grade and blank weighted sets have no grade',()=>{
 const s=seed();s.assessments=[task('a',20,{}, {},100)];s.gradingModes['c1|y2026']='weighted';assert.equal(D.overall(s,'s1','c1','y2026').percent,null);assert.equal(D.overall(s,'s1','c1','y2026',{a:{s1:'21'}}).invalid,true);assert.equal(D.overall(s,'s1','c1','y2026',{a:{s1:'15'}},{a:{s1:'Exempt'}}).percent,null);
});
test('year roster retains withdrawn students with assessed historical results',()=>{
 const s=seed();D.archiveStudent(s,'s1','2026-10-20');s.classes[0].enrolments=s.classes[0].enrolments.filter(e=>e.studentId!=='s1');assert.ok(D.yearRoster(s,'c1','y2026').some(x=>x.id==='s1'));assert.ok(!D.classRoster(s,'c1','2026-10-20').some(x=>x.id==='s1'));
});
test('invalid ranges, overlapping enrolments, colours and unknown statuses fail atomically',()=>{
 for(const change of [s=>s.students[0].schoolEnrolments[0].end=s.students[0].schoolEnrolments[0].start,s=>s.classes[0].enrolments.push({...s.classes[0].enrolments[0]}),s=>s.classes[0].colour='url(evil)',s=>s.classes[0].yearId='missing',s=>s.assessments[0].statuses.s1='Missing',s=>{s.assessments[0].weight=50;s.gradingModes['c1|y2026']='weighted';}]){const store=new D.Store(memory()),before=JSON.stringify(store.data);assert.throws(()=>store.commit(change));assert.equal(JSON.stringify(store.data),before);assert.equal(store.undoStack.length,0);}
});
test('undo and redo persist state and append intelligible change history',()=>{
 const storage=memory(),store=new D.Store(storage);store.commit(s=>s.settings.school='One',false,'School renamed');assert.equal(store.data.auditLog.at(-1).summary,'School renamed');assert.equal(store.data.auditLog.at(-1).changes[0].path,'settings.school');store.undo();assert.notEqual(store.data.settings.school,'One');assert.match(store.data.auditLog.at(-1).summary,/Undid/);store.redo();assert.equal(store.data.settings.school,'One');assert.equal(new D.Store(storage).data.settings.school,'One');assert.equal(new D.Store(storage).undoStack.length,0);
});
test('student numbers are not reused after undo, and new saves invalidate redo',()=>{
 const store=new D.Store(memory()),row={firstName:'New',lastName:'Student',year:'9',homegroup:'9A'};store.commit(s=>D.addStudents(s,[row]));const first=store.data.students.at(-1).code;store.undo();store.commit(s=>D.addStudents(s,[row]));assert.notEqual(store.data.students.at(-1).code,first);assert.throws(()=>store.redo(),/Nothing/);
});
test('failed undo writes preserve both live state and undo stack',()=>{
 const storage=memory(),store=new D.Store(storage);store.commit(s=>s.settings.school='One');const before=JSON.stringify(store.data);storage.setItem=()=>{throw new Error('Quota')};assert.throws(()=>store.undo(),/Could not save/);assert.equal(JSON.stringify(store.data),before);assert.equal(store.undoStack.length,1);assert.equal(store.redoStack.length,0);
});
test('history and undo buffers have bounded sizes and describe escaped user text as data',()=>{
 const store=new D.Store(memory());for(let i=0;i<205;i++)store.commit(s=>s.settings.school='<script>'+i);assert.equal(store.undoStack.length,20);assert.equal(store.data.auditLog.length,200);assert.equal(store.data.auditLog.at(-1).changes[0].after,'<script>204');D.validateState(store.data);
});
