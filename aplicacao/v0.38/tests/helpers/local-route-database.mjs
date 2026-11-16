import {DatabaseSync} from 'node:sqlite';

/** In-memory SQLite adapter for the D1 methods used by Drizzle in route tests.
 * Runs real SQL/migrations and transactions; does not emulate the Worker runtime.
 */
export function localRouteDatabase(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys = ON');
 class Statement{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Statement(this.sql,values);}
  execute(){const query=sqlite.prepare(this.sql);if(query.columns().length)return {success:true,results:query.all(...this.values),meta:{changes:0}};const result=query.run(...this.values);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async all(){return this.execute();}
  async run(){return this.execute();}
  async first(column){const row=this.execute().results[0];return row?(column?row[column]:row):null;}
  async raw(){const query=sqlite.prepare(this.sql);query.setReturnArrays(true);return query.all(...this.values);}
 }
 return {prepare(sql){return new Statement(sql);},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},exec(sql){sqlite.exec(sql);},close(){sqlite.close();}};
}
