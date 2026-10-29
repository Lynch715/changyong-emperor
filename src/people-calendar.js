import {ageOn,ordinal} from './calendar.js';
// Dates are the authored 360-day calendar. Image metadata never establishes age.
export function childAt(s,date=s.date){
 const child=s.weekly?.continuation?.family?.child;
 if(!child?.date||ordinal(date)<ordinal(child.date))return {born:false,age:null,adult:false};
 const age=ageOn(child.date,date);return {born:true,age,adult:age>=18};
}
export function portraitDateContext(s,actor,date=s.date){
 if(actor!=='C36')return {date};
 const child=childAt(s,date);return {date,age:child.age??-1,identityMatches:child.born};
}
