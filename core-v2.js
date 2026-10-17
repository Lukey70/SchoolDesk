/* SchoolDesk v2: shared calendar, dated lessons, attendance and marks. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./legacy.js') : root.SchoolDeskLegacy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SchoolDeskV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (L) {
  'use strict';
  const VERSION = 2;
  // Keep the existing key so v1 workspaces upgrade in place.
  const STORAGE_KEY = L.STORAGE_KEY;
  const { clone, uid, isoDate, shiftDate, weekStart, csv, CATEGORIES } = L;
  const STATUSES = ['Present', 'Absent', 'Late'];
  const ABSENCE_TYPES = ['Alternate programme', 'Camp', 'Excursion', 'Late/Medical', 'Medical', 'Music lesson', 'Sick bay', 'Suspended (External)', 'Suspended (Internal)'];
  const THEMES = { forest:'Forest', ocean:'Ocean', plum:'Plum', slate:'Slate', terracotta:'Terracotta' };
  const DEFAULT_PERIODS = [
    ['homeroom','Homeroom','08:40','09:00',false],
    ['p1','Period 1','09:00','09:50',false],
    ['p2','Period 2','09:50','10:40',false],
    ['recess','Recess','10:40','11:00',true],
    ['p3','Period 3','11:00','11:50',false],
    ['p4','Period 4','11:50','12:40',false],
    ['lunch','Lunch','12:40','13:20',true],
    ['p5','Period 5','13:20','14:10',false],
    ['p6','Period 6','14:10','15:00',false]
  ].map(([id,name,start,end,isBreak])=>({id,name,start,end,isBreak}));
  const dateValid = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T12:00:00')) && isoDate(new Date(d+'T12:00:00')) === d;
  const inRange = (d, r) => d >= r.start && d <= r.end;
  const overlap = (a,b) => a.start <= b.end && b.start <= a.end;
  const yearAt = (s,d) => s.calendar.years.find(y=>inRange(d,y));
  const termAt = (s,d) => s.calendar.terms.find(t=>inRange(d,t));
  const periodAt = (s,id) => s.periods.find(p=>p.id===id);
  const sessionKey = (date,classId,periodId) => `${date}|${classId}|${periodId}`;
  const attendanceKey = sessionKey;
  const planKey = sessionKey;
  function grade(score, max=100) {
    if(score === '' || score === undefined || score === null || !Number.isFinite(Number(score)) || !(max>0)) return '—';
    const p=Number(score)/max*100;
    return p>=75?'A':p>=65?'B':p>=50?'C':p>=35?'D':p>=15?'E':'F';
  }
  function defaultCalendar(year) {
    const y=String(year),id='y'+y;
    return {year:{id,name:y,start:y+'-01-26',end:y+'-12-18'},terms:[
      {id:id+'t1',yearId:id,name:'Term 1',start:y+'-01-26',end:y+'-04-02'},
      {id:id+'t2',yearId:id,name:'Term 2',start:y+'-04-20',end:y+'-07-03'},
      {id:id+'t3',yearId:id,name:'Term 3',start:y+'-07-20',end:y+'-09-25'},
      {id:id+'t4',yearId:id,name:'Term 4',start:y+'-10-12',end:y+'-12-18'}
    ]};
  }
  function dayInfo(s,date) {
    const year=yearAt(s,date),term=termAt(s,date),special=s.specialDays.find(d=>d.date===date);
    const holidays=s.calendar.holidays.filter(h=>inRange(date,h));
    const holiday=holidays.find(h=>h.type==='Public Holiday')||holidays[0];
    let label='';
    if(holiday)label=holiday.type;
    else if(!year)label='Outside school year';
    else if([0,6].includes(new Date(date+'T12:00:00').getDay()))label='Weekend';
    else if(!term)label='School Holidays';
    return {year,term,special,holiday,label,closed:Boolean(label)};
  }
  function sessionsOn(s,date) {
    const info=dayInfo(s,date);if(info.closed)return [];
    const day=new Date(date+'T12:00:00').getDay();
    const rows=info.special?info.special.sessions:s.lessons.filter(l=>l.day===day);
    return rows.map(l=>{
      const p=periodAt(s,l.periodId);
      return {...l,date,start:p.start,end:p.end,periodName:p.name,key:sessionKey(date,l.classId,l.periodId),special:Boolean(info.special)};
    }).sort((a,b)=>a.start.localeCompare(b.start));
  }
  function occurrences(s,start,end,classId='') {
    if(!dateValid(start)||!dateValid(end)||end<start)return [];
    const result=[];let date=start,days=0;
    while(date<=end&&days++<740){for(const row of sessionsOn(s,date))if(row.classId&&(!classId||row.classId===classId))result.push(row);date=shiftDate(date,1);}
    return result;
  }
  function nextTeachingDay(s,date) {
    let d=date;for(let i=0;i<370;i++,d=shiftDate(d,1))if(sessionsOn(s,d).length)return d;
    return date;
  }
  function termWeek(term,date) {
    const start=new Date(weekStart(term.start)+'T12:00:00'),end=new Date(weekStart(date)+'T12:00:00');
    return Math.round((end-start)/604800000)+1;
  }
  function absenceFor(s,studentId,date,periodId) {
    return s.absences.find(a=>a.studentId===studentId&&inRange(date,a)&&(!a.periodIds.length||a.periodIds.includes(periodId)));
  }
  function attendanceValue(s,session,studentId,drafts={}) {
    const absence=absenceFor(s,studentId,session.date,session.periodId);
    if(absence)return {status:absence.type,locked:true,comment:absence.comment,absenceId:absence.id};
    const rows=drafts[session.key]||s.attendance.find(a=>a.id===session.key)?.rows||{};
    return {status:rows[studentId]?.status||'',locked:false,comment:rows[studentId]?.comment||''};
  }
  function cycleAttendance(status,shift=false) {return shift?'Late':status==='Present'?'Absent':'Present';}
  function setAttendance(s,session,studentId,status) {
    if(!STATUSES.includes(status)&&status!=='')throw new Error('Choose a valid attendance status.');
    const current=sessionsOn(s,session.date).find(x=>x.key===session.key&&x.classId);
    if(!current)throw new Error('This lesson is no longer in the timetable. Reopen attendance before saving.');
    if(absenceFor(s,studentId,session.date,session.periodId))throw new Error('This attendance type can only be changed from the student screen.');
    const student=s.students.find(x=>x.id===studentId),c=s.classes.find(x=>x.id===session.classId);
    let roll=s.attendance.find(x=>x.id===session.key);
    if(!student||(!roll?.rows[studentId]&&(!student.active||!c.studentIds.includes(studentId))))throw new Error('Student is not on this class roster.');
    if(!roll){roll={id:session.key,date:session.date,classId:session.classId,periodId:session.periodId,rows:{},savedAt:new Date().toISOString()};s.attendance.push(roll);}
    if(status)roll.rows[studentId]={status,comment:roll.rows[studentId]?.comment||''};
    else delete roll.rows[studentId];
    roll.savedAt=new Date().toISOString();
  }
  function yearAssessments(s,classId,yearId) {
    return s.assessments.filter(a=>a.classId===classId&&a.yearId===yearId).sort((a,b)=>a.due.localeCompare(b.due)||a.title.localeCompare(b.title));
  }
  function overall(s,studentId,classId,yearId,drafts={}) {
    let earned=0,possible=0,count=0;
    for(const a of yearAssessments(s,classId,yearId)){
      const marks=drafts[a.id]||a.marks,m=marks[studentId];
      if(m===undefined||m===null||m==='')continue;
      if(!Number.isFinite(Number(m))||Number(m)<0||Number(m)>a.max)return {percent:null,grade:'—',count,invalid:true};
      earned+=Number(m);possible+=a.max;count++;
    }
    return {percent:possible?earned/possible*100:null,grade:possible?grade(earned,possible):'—',earned,possible,count};
  }
  function attendanceSummary(s,studentId=null) {
    const counts={Present:0,Absent:0,Late:0,total:0};
    // Legacy records remain in the denominator as originally recorded.
    for(const roll of [...s.legacyAttendance,...s.attendance])for(const[id,row]of Object.entries(roll.rows)){
      if(studentId&&id!==studentId)continue;
      const value=roll.periodId?attendanceValue(s,{...roll,key:roll.id},id).status:row.status;
      counts[value]=(counts[value]||0)+1;counts.total++;
    }
    counts.rate=counts.total?Math.round((counts.Present+counts.Late)/counts.total*100):null;
    return counts;
  }
  function migrate(input,reference=isoDate()) {
    if(input.version===VERSION)return clone(validateState(input));
    L.validateState(input);
    const s=clone(input);s.version=VERSION;s.settings.theme='forest';s.periods=clone(DEFAULT_PERIODS);
    const years=new Set([reference.slice(0,4),String(Number(reference.slice(0,4))+1),...s.assessments.map(a=>a.due.slice(0,4)),...s.plans.map(p=>p.date.slice(0,4)),...s.attendance.map(r=>r.date.slice(0,4))]);
    s.calendar={years:[],terms:[],holidays:[]};
    for(const year of [...years].sort()){const c=defaultCalendar(year);s.calendar.years.push(c.year);s.calendar.terms.push(...c.terms);}
    s.specialDays=[];s.absences=[];s.legacyAttendance=[];
    const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
    const placed=[];
    s.lessons=s.lessons.map(l=>{
      const p=s.periods.filter(p=>!p.isBreak&&!placed.some(x=>x.day===l.day&&x.periodId===p.id)).sort((a,b)=>Math.abs(minutes(a.start)-minutes(l.start))-Math.abs(minutes(b.start)-minutes(l.start)))[0];
      if(!p)throw new Error('The existing timetable has too many lessons in one day to fit the new periods.');
      const row={id:l.id,classId:l.classId,day:l.day,periodId:p.id,room:l.room};placed.push(row);return row;
    });
    for(const a of s.assessments)a.yearId='y'+a.due.slice(0,4);
    const previous=s.attendance;s.attendance=[];
    for(const r of previous){
      const matches=sessionsOn(s,r.date).filter(l=>l.classId===r.classId&&(r.session==='Morning'?l.start<'12:00':l.start>='12:00'));
      if(matches.length===1&&Object.values(r.rows).every(row=>STATUSES.includes(row.status))){const l=matches[0];s.attendance.push({id:l.key,date:r.date,classId:r.classId,periodId:l.periodId,rows:r.rows,savedAt:r.savedAt});}
      else s.legacyAttendance.push(r);
    }
    const assignedPlans=new Set();for(const p of s.plans){const matches=sessionsOn(s,p.date).filter(l=>l.classId===p.classId&&!assignedPlans.has(l.key));p.periodId=matches[0]?.periodId||'';if(matches[0])assignedPlans.add(matches[0].key);}
    return validateState(s);
  }
  const seed = (today=isoDate()) => migrate(L.seed(today),today);
  function validateState(s) {
    const fail=message=>{throw new Error('Invalid workspace: '+message);};
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const str=(x,n=10000)=>typeof x==='string'&&x.length<=n;
    const required=x=>str(x,200)&&x.trim().length>0;
    const safeId=x=>required(x)&&/^[a-zA-Z0-9_-]+$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
    const list=(rows,name,max=10000)=>{
      if(!Array.isArray(rows)||rows.length>max||rows.some(x=>!obj(x)||!required(x.id))||new Set(rows.map(x=>x.id)).size!==rows.length)fail(name+' contains invalid or duplicate records.');
    };
    const range=r=>dateValid(r.start)&&dateValid(r.end)&&r.start<=r.end&&Number(r.end.slice(0,4))-Number(r.start.slice(0,4))<=1;
    const time=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    if(!obj(s)||s.version!==VERSION)fail('unsupported version.');
    if(!obj(s.settings)||!required(s.settings.school)||!required(s.settings.teacher)||!required(s.settings.role)||!Object.hasOwn(THEMES,s.settings.theme))fail('invalid settings.');
    for(const key of ['students','classes','lessons','assessments','attendance','legacyAttendance','notes','plans','notices','specialDays','absences'])list(s[key],key,key==='lessons'?35:10000);
    const studentIds=new Set(s.students.map(x=>x.id)),classIds=new Set(s.classes.map(x=>x.id));
    if(s.students.some(x=>!safeId(x.id)||!required(x.firstName)||!required(x.lastName)||!required(x.code)||!required(x.year)||!str(x.homegroup,200)||!str(x.guardian,200)||!str(x.email,200)||!str(x.phone,100)||!str(x.support)||typeof x.active!=='boolean'))fail('invalid student.');
    if(new Set(s.students.map(x=>x.code.toLowerCase())).size!==s.students.length)fail('student numbers must be unique.');
    if(s.classes.some(x=>!safeId(x.id)||!required(x.name)||!required(x.code)||!required(x.year)||!str(x.room,200)||!['sage','peach','lavender','blue'].includes(x.colour)||!Array.isArray(x.studentIds)||x.studentIds.some(id=>!studentIds.has(id))||new Set(x.studentIds).size!==x.studentIds.length))fail('invalid class roster.');
    if(new Set(s.classes.map(x=>x.code.toLowerCase())).size!==s.classes.length)fail('class codes must be unique.');
    if(!obj(s.calendar))fail('calendar missing.');
    for(const key of ['years','terms','holidays'])list(s.calendar[key],key,200);
    for(const y of s.calendar.years)if(!safeId(y.id)||!required(y.name)||!range(y)||(new Date(y.end+'T12:00:00')-new Date(y.start+'T12:00:00'))/86400000>366)fail('invalid school year (maximum 367 days).');
    for(let i=0;i<s.calendar.years.length;i++)for(let j=i+1;j<s.calendar.years.length;j++)if(overlap(s.calendar.years[i],s.calendar.years[j]))fail('school years overlap.');
    for(const t of s.calendar.terms){const y=s.calendar.years.find(y=>y.id===t.yearId);if(!safeId(t.id)||!y||!required(t.name)||!range(t)||!inRange(t.start,y)||!inRange(t.end,y))fail('term dates must be inside their school year.');}
    for(let i=0;i<s.calendar.terms.length;i++)for(let j=i+1;j<s.calendar.terms.length;j++)if(overlap(s.calendar.terms[i],s.calendar.terms[j]))fail('school terms overlap.');
    for(const h of s.calendar.holidays)if(!required(h.name)||!range(h)||!['School Holidays','Public Holiday'].includes(h.type))fail('invalid holiday.');
    list(s.periods,'periods',9);
    if(s.periods.length!==9)fail('all nine timetable periods are required.');
    s.periods.forEach((p,i)=>{if(p.id!==DEFAULT_PERIODS[i].id||p.name!==DEFAULT_PERIODS[i].name||p.isBreak!==DEFAULT_PERIODS[i].isBreak||!time(p.start)||!time(p.end)||p.end<=p.start||(i&&p.start<s.periods[i-1].end))fail('period times must follow their order without overlaps.');});
    const validPeriod=id=>s.periods.some(p=>p.id===id&&!p.isBreak);
    for(const l of s.lessons)if(!safeId(l.id)||!classIds.has(l.classId)||!Number.isInteger(l.day)||l.day<1||l.day>5||!validPeriod(l.periodId)||!str(l.room,200))fail('invalid timetable lesson.');
    if(new Set(s.lessons.map(l=>l.day+'|'+l.periodId)).size!==s.lessons.length)fail('timetable lessons overlap in a period.');
    for(const day of s.specialDays){
      if(!dateValid(day.date)||!required(day.label))fail('invalid special timetable date.');
      list(day.sessions,'special sessions',7);
      for(const l of day.sessions)if(!safeId(l.id)||!validPeriod(l.periodId)||(!classIds.has(l.classId)&&!(l.classId===''&&required(l.title)))||!str(l.title,200)||!str(l.room,200))fail('invalid special timetable session.');
      if(new Set(day.sessions.map(l=>l.periodId)).size!==day.sessions.length)fail('special timetable periods overlap.');
    }
    if(new Set(s.specialDays.map(d=>d.date)).size!==s.specialDays.length)fail('only one special timetable is allowed per date.');
    for(const a of s.assessments){
      if(!safeId(a.id)||!classIds.has(a.classId)||!s.calendar.years.some(y=>y.id===a.yearId)||!required(a.title)||!dateValid(a.due)||!Number.isFinite(a.max)||a.max<=0||a.max>100000||!str(a.description)||!obj(a.marks))fail('invalid assessment.');
      for(const[id,m]of Object.entries(a.marks))if(!studentIds.has(id)||typeof m!=='number'||!Number.isFinite(m)||m<0||m>a.max)fail('marks must be within the assessment maximum.');
    }
    for(const r of s.attendance){
      if(!classIds.has(r.classId)||!dateValid(r.date)||!validPeriod(r.periodId)||r.id!==sessionKey(r.date,r.classId,r.periodId)||!obj(r.rows)||!str(r.savedAt,100))fail('invalid attendance roll.');
      for(const[id,row]of Object.entries(r.rows))if(!studentIds.has(id)||!obj(row)||!STATUSES.includes(row.status)||!str(row.comment))fail('invalid attendance status.');
    }
    for(const r of s.legacyAttendance){
      if(!classIds.has(r.classId)||!dateValid(r.date)||!['Morning','Afternoon'].includes(r.session)||!obj(r.rows)||!str(r.savedAt,100))fail('invalid legacy roll.');
      for(const[id,row]of Object.entries(r.rows))if(!studentIds.has(id)||!obj(row)||!['Present','Absent','Late','Excused'].includes(row.status)||!str(row.comment))fail('invalid legacy attendance status.');
    }
    for(const a of s.absences)if(!studentIds.has(a.studentId)||!range(a)||!ABSENCE_TYPES.includes(a.type)||!str(a.comment)||!Array.isArray(a.periodIds)||a.periodIds.some(id=>!validPeriod(id))||new Set(a.periodIds).size!==a.periodIds.length)fail('invalid student absence.');
    const byStudent=new Map();for(const a of s.absences){const rows=byStudent.get(a.studentId)||[];for(const b of rows)if(overlap(a,b)&&(!a.periodIds.length||!b.periodIds.length||a.periodIds.some(p=>b.periodIds.includes(p))))fail('student absence dates and periods overlap.');rows.push(a);byStudent.set(a.studentId,rows);}
    for(const n of s.notes)if(!studentIds.has(n.studentId)||!CATEGORIES.includes(n.category)||!str(n.text)||!n.text.trim()||!dateValid(n.date)||!required(n.author)||!['Open','Closed'].includes(n.status))fail('invalid pastoral record.');
    for(const p of s.plans)if(!classIds.has(p.classId)||!dateValid(p.date)||!(p.periodId===''||validPeriod(p.periodId))||!required(p.title)||!str(p.objective)||!str(p.activities)||!str(p.resources))fail('invalid lesson plan.');
    const keys=s.plans.filter(p=>p.periodId).map(p=>planKey(p.date,p.classId,p.periodId));if(new Set(keys).size!==keys.length)fail('a lesson already has a saved plan.');
    for(const n of s.notices)if(!required(n.title)||!str(n.body)||!dateValid(n.date)||!['Staff notice','Teaching & learning','School event'].includes(n.category))fail('invalid notice.');
    return s;
  }
  function parseBackup(text) {
    if(text.length>10*1024*1024)throw new Error('Backup is too large (maximum 10 MB).');
    let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('This is not a valid JSON backup.');}
    return migrate(parsed);
  }
  class Store {
    constructor(storage) {
      this.storage=storage;this.warning='';this.blocked=false;
      let raw;try{raw=storage?.getItem(STORAGE_KEY);}catch{this.storage=null;this.warning='Browser storage is unavailable. Changes are temporary; export a backup before closing.';}
      if(raw){try{this.data=migrate(JSON.parse(raw));}catch{this.data=seed();this.blocked=true;this.warning='Saved data could not be upgraded. It has been preserved. Export the original saved data in Settings, or restore a backup. Demo data is shown until then.';}}
      else this.data=seed();
    }
    commit(change,replace=false) {
      if(this.blocked&&!replace)throw new Error('Reload, restore a valid backup or explicitly reset demo data before saving.');
      const next=replace?migrate(change):clone(this.data);if(!replace)change(next);validateState(next);
      if(this.storage){try{this.storage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('Could not save. Browser storage may be full. Export a backup before clearing anything.');}}
      this.data=next;this.blocked=false;if(this.storage)this.warning='';return next;
    }
  }
  return {VERSION,STORAGE_KEY,STATUSES,ABSENCE_TYPES,THEMES,DEFAULT_PERIODS,CATEGORIES,clone,uid,isoDate,shiftDate,weekStart,csv,dateValid,grade,defaultCalendar,dayInfo,yearAt,termAt,periodAt,sessionsOn,occurrences,nextTeachingDay,nextSchoolDay:L.nextSchoolDay,termWeek,sessionKey,attendanceKey,planKey,absenceFor,attendanceValue,cycleAttendance,setAttendance,yearAssessments,overall,attendanceSummary,migrate,seed,validateState,parseBackup,Store};
});

