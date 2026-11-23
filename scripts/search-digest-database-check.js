// Explicit hosted transaction test: no committed accounts, listings, jobs, or sends.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/search-digests.sql'),'utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'');
const tests=fs.readFileSync(path.join(__dirname,'search-digest-database-check.sql'),'utf8');
const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'search-digest-rollback.sql');
const guard=`do $$ declare n integer; begin
  if to_regclass('public.saved_search_alerts') is not null then
    execute 'select count(*) from public.saved_search_alerts' into n;
    if n>0 then raise exception 'Use a staging database: real saved searches already exist'; end if;
  end if;
end $$;`;
fs.writeFileSync(file,'begin;\n'+guard+'\n'+migration+'\n'+tests+'\nrollback;');
execFileSync('supabase',['db','query','--linked','--file',file,'--output-format','json'],{cwd:root,stdio:'inherit'});
