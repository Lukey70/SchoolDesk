const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../core.js');
const memory=()=>({raw:null,getItem(){return this.raw},setItem(_key,value){this.raw=value}});
const seeded=()=>D.seed('2026-10-17');

test('fictional demo has valid connected records and distinct student numbers',()=>{
 const s=seeded();assert.equal(D.validateState(s),s);assert.equal(s.students.length,16);
 assert.equal(new Set(s.students.map(x=>x.code)).size,16);
});
test('calendar helpers use calendar dates across month, year and DST boundaries',()=>{
 assert.equal(D.shiftDate('2026-12-31',1),'2027-01-01');
 assert.equal(D.shiftDate('2026-03-29',1),'2026-03-30');
 assert.equal(D.nextSchoolDay('2026-10-17'),'2026-10-19');
 assert.equal(D.nextSchoolDay('2026-10-18'),'2026-10-19');
 assert.equal(D.weekStart('2026-10-18'),'2026-10-12');
});
test('grade boundaries, zero and unmarked scores have different meanings',()=>{
 for(const [score,expected]of [[80,'A'],[79.9,'B'],[65,'B'],[64.9,'C'],[50,'C'],[49.9,'D'],[35,'D'],[34.9,'E'],[0,'E'],['','—'],[null,'—'],[undefined,'—']])assert.equal(D.grade(score,100),expected);
});
test('attendance counts Present and Late and can filter to one student',()=>{
 const s=seeded(),sum=D.attendanceSummary(s);assert.equal(sum.total,12);assert.equal(sum.Present,10);assert.equal(sum.Late,1);assert.equal(sum.Absent,1);assert.equal(sum.rate,92);
 assert.equal(D.attendanceSummary(s,'s3').rate,0);assert.equal(D.attendanceSummary(s,'s6').rate,100);assert.equal(D.attendanceSummary(s,'s16').rate,null);
});
test('CSV escapes quotes, newlines, commas and spreadsheet formula prefixes',()=>{
 const out=D.csv([['a,b','say "hello"','a\nb','=HYPERLINK("evil")',' +SUM(A1)','@cmd','-1',0]]);
 assert.ok(out.startsWith('\uFEFF'));assert.ok(out.includes('"a,b"'));assert.ok(out.includes('"say ""hello"""'));assert.ok(out.includes('"a\nb"'));assert.ok(out.includes('"\'=HYPERLINK'));assert.ok(out.includes('"\' +SUM'));assert.ok(out.includes('"\'@cmd"'));assert.ok(out.endsWith('"0"'));
});
test('a full backup round-trips and malformed data does not parse',()=>{
 const s=seeded();assert.deepEqual(D.parseBackup(JSON.stringify(s)),s);
 assert.throws(()=>D.parseBackup('{bad'),/valid JSON/);assert.throws(()=>D.parseBackup('{}'),/version/);
 assert.throws(()=>D.parseBackup(' '.repeat(10*1024*1024+1)),/too large/);
});
test('rejects duplicate IDs and student numbers',()=>{
 let s=seeded();s.students[1].id=s.students[0].id;assert.throws(()=>D.validateState(s),/duplicate/);
 s=seeded();s.students[1].code=s.students[0].code;assert.throws(()=>D.validateState(s),/unique/);
});
test('rejects orphaned class, assessment, pastoral and attendance references',()=>{
 for(const change of [s=>s.classes[0].studentIds.push('missing'),s=>s.assessments[0].classId='missing',s=>s.notes[0].studentId='missing',s=>s.attendance[0].rows.missing={status:'Present',comment:''}]){
 const s=seeded();change(s);assert.throws(()=>D.validateState(s),/Invalid backup/);
 }
});
test('rejects invalid dates, times, sessions and statuses',()=>{
 for(const change of [s=>s.assessments[0].due='2026-02-30',s=>s.plans[0].date='not-a-date',s=>s.lessons[0].start='28:00',s=>s.lessons[0].end=s.lessons[0].start,s=>s.lessons[0].day=6,s=>s.attendance[0].session='Noon',s=>s.attendance[0].rows.s1.status='Missing']){
 const s=seeded();change(s);assert.throws(()=>D.validateState(s),/Invalid backup/);
 }
});
test('overlapping timetable sessions fail, adjoining sessions are valid',()=>{
 let s=seeded();s.lessons.push({id:'extra',classId:'c1',day:1,start:'09:30',end:'10:30',room:'H2'});assert.throws(()=>D.validateState(s),/overlap/);
 s=seeded();s.lessons.push({id:'extra',classId:'c1',day:1,start:'10:00',end:'10:20',room:'H2'});assert.equal(D.validateState(s),s);
});
test('out-of-range, non-numeric and non-finite marks fail validation',()=>{
 for(const mark of [-1,31,NaN,Infinity,'20',null]){const s=seeded();s.assessments[0].marks.s1=mark;assert.throws(()=>D.validateState(s),/marks/);}
});
test('archiving and roster removal preserve historical marks and attendance',()=>{
 const s=seeded();s.students[0].active=false;s.classes[0].studentIds=s.classes[0].studentIds.filter(id=>id!=='s1');D.validateState(s);assert.equal(s.assessments[0].marks.s1,26);assert.equal(s.attendance[0].rows.s1.status,'Present');
});
test('storage commits persist across store instances',()=>{
 const storage=memory(),store=new D.Store(storage);store.commit(s=>s.settings.school='New School');const reopened=new D.Store(storage);assert.equal(reopened.data.settings.school,'New School');
});
test('failed validation and failed writes leave the original state intact',()=>{
 const storage=memory(),store=new D.Store(storage),before=JSON.stringify(store.data);
 assert.throws(()=>store.commit(s=>s.assessments[0].max=0));assert.equal(JSON.stringify(store.data),before);assert.equal(storage.raw,null);
 storage.setItem=()=>{throw new Error('Quota exceeded')};assert.throws(()=>store.commit(s=>s.settings.school='Unsaved'),/Could not save/);assert.equal(JSON.stringify(store.data),before);
});
test('corrupt saved data is not overwritten until explicit restore or reset',()=>{
 const storage=memory();storage.raw='{broken';const store=new D.Store(storage);assert.equal(store.blocked,true);assert.throws(()=>store.commit(s=>s.settings.school='Accidental overwrite'),/Restore/);assert.equal(storage.raw,'{broken');store.commit(seeded(),true);assert.equal(store.blocked,false);assert.doesNotThrow(()=>D.parseBackup(storage.raw));
});
test('blocked storage degrades to a clearly flagged temporary workspace',()=>{
 const store=new D.Store({getItem(){throw new Error('Blocked')}});assert.ok(store.warning.includes('temporary'));store.commit(s=>s.settings.school='Temporary School');assert.equal(store.data.settings.school,'Temporary School');
});
