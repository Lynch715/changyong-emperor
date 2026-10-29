import assert from 'node:assert/strict';
import {ordinal} from '../src/calendar.js';
import {reservedMoney,usedSlots,heldSlots} from '../src/week.js';
// Independent reconciliation of saved ledger entries and committed receipts.
// Production money/slot routines are not used to calculate expected balances.
export function reconcile(s){
 let balance=60,income=0,expense=0;const ids=new Set(),owners=new Map(),transactions=new Map(s.transactions.map(t=>[t.id,t]));
 assert.equal(transactions.size,s.transactions.length);
 const months=new Map((s.weekly.monthly||[]).map(m=>[m.key,m]));assert.equal(months.size,s.weekly.monthly.length);
 for(const row of s.ledger){
  assert.ok(Number.isInteger(row.amount)&&Number.isInteger(row.balance));assert.ok(!ids.has(row.id));ids.add(row.id);
  balance+=row.amount;assert.equal(row.balance,balance,`ledger balance ${row.id}`);assert.ok(balance>=0);
  if(row.amount>0)income+=row.amount;else expense-=row.amount;
  let tx;if(row.id.startsWith('MONTH-')){const match=/^MONTH-(\d+-\d\d)-(in|out)$/.exec(row.id);assert.ok(match);const m=months.get(match[1]);assert.ok(m);assert.equal(row.amount,match[2]==='in'?m.income:-m.expense);tx=m.transaction;}
  else tx=[...transactions.keys()].find(id=>row.id.includes(id));
  assert.ok(transactions.has(tx),`orphan ledger ${row.id}`);owners.set(row.id,tx);assert.equal(ordinal(row.date),ordinal(transactions.get(tx).date));
 }
 assert.equal(balance,s.stats.treasury,'ledger does not reconcile to treasury');
 for(const tx of s.transactions){const amount=s.ledger.filter(r=>owners.get(r.id)===tx.id).reduce((n,r)=>n+r.amount,0);assert.equal(amount,tx.results.reduce((n,r)=>n+r.treasury,0),`receipt/ledger mismatch ${tx.id}`);}
 for(const m of months.values()){assert.equal(m.income,12);assert.equal(m.expense,9);assert.ok(ids.has(`MONTH-${m.key}-in`)&&ids.has(`MONTH-${m.key}-out`));const out=s.ledger.find(r=>r.id===`MONTH-${m.key}-out`);assert.equal(out.balance,m.balance);}
 for(const p of Object.values(s.weekly.projects?.items||{})){const grouped=new Map();for(const f of p.funds)grouped.set(f.ledgerId,(grouped.get(f.ledgerId)||0)+(f.direction==='in'?f.amount:-f.amount));for(const [id,amount]of grouped){const row=s.ledger.find(r=>r.id===id);assert.ok(row);assert.equal(row.amount,amount);}}
 for(const p of s.weekly.plans){
  const paid=s.ledger.filter(r=>r.id.endsWith('-'+p.id));
  if(['executing','completed'].includes(p.status)&&p.money){assert.equal(paid.length,1);assert.equal(paid[0].amount,-p.money);}
  else assert.equal(paid.length,0,`unexecuted plan was charged ${p.id}`);
 }
 const b=s.weekly.activities;
 for(const i of b?.inventory||[]){const row=i.source.startsWith('BUY-')?s.ledger.find(r=>r.id===i.source):s.ledger.find(r=>r.id.endsWith('-'+i.source));assert.ok(row,`item not paid ${i.id}`);assert.equal(-row.amount,i.paid);assert.ok(b.entries.filter(e=>e.kind==='gift-result'&&e.itemId===i.id&&e.accepted).length<=1);}
 for(const w of s.weekly.weeks)assert.ok(usedSlots(s,w.id)+heldSlots(s,w.id)<=6);
 assert.ok(reservedMoney(s)<=balance);
 return {opening:60,income,expense,closing:balance,ledgerRows:s.ledger.length,transactions:s.transactions.length,monthly:s.weekly.monthly.length,reserved:reservedMoney(s),spendable:balance-reservedMoney(s),used:s.weekly.weeks.reduce((n,w)=>n+usedSlots(s,w.id),0),capacity:s.weekly.weeks.length*6};
}
