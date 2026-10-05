const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Local fixtures only; all account and admin requests are stubbed.
(async () => {
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const route of ['/', '/marketplace.html']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(route + ': ' + error.message));
      await page.goto('http://127.0.0.1:5173' + route + '?local=1');
      const results = await page.evaluate(async () => {
        const results = [];
        const api = window.SB;
        const record = (name, pass) => results.push({ name, pass: !!pass });
        const targetId = '4f0c35e1-80ed-4c00-958a-5bb488399001';
        const setup = mode => {
          state.lang = 'en';
          state.user = normalizeUser({id:'qa-admin', name:'QA Admin', provider:'supabase', role:'admin'});
          L.length = 0;
          L.push({id:'qa-admin-listing', sellerId:targetId, ownerId:targetId, t:'QA admin',
            cat:'elec', area:'Marigot', cur:'usd', usd:10, eur:9, ph:1, status:'active', sold:false, reserved:false, feat:false});
          userListings = [{...L[0]}];
          adminReports = [{id:'qa-report', listingId:L[0].id, status:'open'}];
          adminCategoryStatus = {};
          adminBanned = [];
          adminProfiles = [normalizeUser({id:targetId, role:'user'})];
          const failed = async () => {if(mode === 'throw') throw new Error('QA network'); return mode === 'false' ? false : null;};
          window.SB = {enabled:()=>mode !== 'offline', updateListing:failed, deleteListing:failed,
            adminSetListingStatus:failed, resolveReport:failed, saveAdminSettings:failed, banUser:failed,
            unbanUser:failed, updateUserRole:failed, setListingModerationStatus:failed};
          document.getElementById('toast').textContent = '';
        };
        const snapshot = () => JSON.stringify({L,userListings,adminReports,adminCategoryStatus,adminBanned,adminProfiles});
        for(const mode of ['null','false','throw','offline']){
          for(const action of ['feature','status','delete','report','category','ban','role','moderate']){
            setup(mode);
            const before = snapshot();
            if(action === 'feature') await toggleFeaturedAdmin(L[0].id);
            if(action === 'status') await markListingStatusAdmin(L[0].id,'sold');
            if(action === 'delete') await removeListingAdmin(L[0].id);
            if(action === 'report') await resolveReportAdmin('qa-report');
            if(action === 'category') await toggleCategoryAdmin('elec');
            if(action === 'ban') await toggleBanUser(targetId);
            if(action === 'role') await toggleAdminRole(targetId);
            if(action === 'moderate') await setModerationStatusAdmin(L[0].id,'approved');
            record('admin/' + action + '/' + mode + ': preserve state and show failure', snapshot() === before && /not confirmed|failed/i.test(document.getElementById('toast').textContent));
          }
        }
        setup('success');
        SB.updateListing = async candidate=>({...candidate});
        await toggleFeaturedAdmin(L[0].id);
        record('admin/feature-success', L[0].feat && L[0].boosted);
        SB.adminSetListingStatus = async (_id,status)=>({...L[0],status,sold:status === 'sold',reserved:false});
        await markListingStatusAdmin(L[0].id,'sold');
        record('admin/status-success', L[0].sold && L[0].status === 'sold');
        SB.deleteListing = async ()=>true;
        await removeListingAdmin(L[0].id);
        record('admin/delete-success', !L.some(l=>l.id === 'qa-admin-listing') && userListings.length === 0 && adminReports[0].status === 'resolved');

        const event = {preventDefault(){}, target:document.querySelector('#signupFields')?.closest('form')};
        document.getElementById('accountName').value = 'QA Account';
        document.getElementById('accountEmail').value = 'qa-auth@example.com';
        document.getElementById('accountPassword').value = 'QA fixture password 123';
        document.getElementById('accountPasswordConfirm').value = 'QA fixture password 123';
        document.getElementById('accountType').value = 'personal';
        document.getElementById('accountPlan').value = 'personal-free';
        for(const mode of ['error','throw']){
          state.user = null;
          const failed = async ()=>{if(mode === 'throw') throw new Error('QA network'); return {error:{message:'QA failure'}};};
          SB.signUp = failed;
          SB.signIn = failed;
          SB.requestPasswordReset = failed;
          SB.updatePasswordAndRevokeSessions = failed;
          pendingSignupOtp = null;
          await createAccount(event);
          record('auth/signup-' + mode + ': no false email or session', !state.user && !pendingSignupOtp && /could not be completed/i.test(document.getElementById('createAccountError').textContent));
          document.getElementById('loginEmail').value = 'qa-auth@example.com';
          document.getElementById('loginPassword').value = 'QA fixture password 123';
          await loginAccount(event);
          record('auth/login-' + mode + ': handled failure', !state.user && !!document.getElementById('loginError').textContent);
          document.getElementById('passwordResetEmail').value = 'qa-auth@example.com';
          await requestPasswordReset(event);
          record('auth/reset-request-' + mode + ': no false delivery', /could not be sent/i.test(document.getElementById('passwordResetRequestError').textContent));
          document.getElementById('passwordResetNew').value = 'QA fixture password 123';
          document.getElementById('passwordResetConfirm').value = 'QA fixture password 123';
          await completePasswordReset(event);
          record('auth/reset-complete-' + mode + ': no false success', !!document.getElementById('passwordResetCompleteError').textContent);
          state.user = normalizeUser({id:'qa-auth-user',provider:'supabase'});
          SB.signOut = failed;
          await logoutUser();
          record('auth/logout-' + mode + ': preserve identity on failure', state.user?.id === 'qa-auth-user' && /could not be confirmed/i.test(document.getElementById('toast').textContent));
        }
        SB.signOut = async ()=>({error:null});
        await logoutUser();
        record('auth/logout-success: clear identity', state.user === null);
        const resetAuth = window.db;
        let resetPasswordUpdated = false;
        window.db = {auth:{
          updateUser:async ({password})=>{resetPasswordUpdated = password === 'QA secure reset password 123'; return {data:{user:{id:'qa-auth-user'}},error:null};},
          signOut:async ()=>{throw new Error('QA transient global sign-out failure');}
        }};
        const resetResult = await api.updatePasswordAndRevokeSessions('QA secure reset password 123');
        record('auth/reset-success-survives-revocation-network-error', resetPasswordUpdated && !resetResult.error);
        window.db = resetAuth;
        SB.fetchProfile = async ()=>({name:'QA Profile',account_type:'personal',account_plan:'personal-free',role:'user'});
        SB.fetchBlocks = async ()=>[{id:targetId,name:'Blocked'}];
        await applySupabaseUser({id:'qa-profile-user',email:'qa-profile@example.com',user_metadata:{}});
        renderProfile();
        record('auth/profile: load blocks on first login', isBlockedUser(targetId));
        record('profile/unverified: no invented trust badges', !state.user.verifiedEmail &&
          !/Verified email|Trusted member|Fast reply|Certified Pro/.test(document.getElementById('profileModal').textContent));
        await applySupabaseUser({id:'qa-profile-user',email:'qa-profile@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{}});
        renderProfile();
        record('profile/verified: show confirmed email only', state.user.verifiedEmail &&
          !!document.querySelector('#profileModal button[data-click-args*="email"]'));
        window.SB = api;
        const oldDb = window.db;
        const oldCurrentUser = api.currentUser;
        const oldLog = api.logAdminEvent;
        api.currentUser = async ()=>({id:'qa-admin'});
        api.logAdminEvent = async ()=>true;
        for(const rows of [[], [{id:'qa-row'}]]){
          const builder = {update(){return this;},delete(){return this;},eq(){return this;},select:async()=>({data:rows,error:null})};
          window.db = {from:()=>builder};
          record('adapter/moderation-' + rows.length, await api.setListingModerationStatus('qa-row','approved') === (rows.length === 1));
          record('adapter/rules-' + rows.length, await api.saveModerationRules([],[]) === (rows.length === 1));
          record('adapter/ad-delete-' + rows.length, await api.deleteAdCampaign('qa-row') === (rows.length === 1));
        }
        const uploads = [];
        window.db = {storage:{from:()=>({
          upload:async (path,_blob,options)=>{uploads.push({path,options});return {error:null};},
          getPublicUrl:path=>({data:{publicUrl:'https://example.com/' + path}})
        })}};
        const photo = new Blob(['QA JPEG fixture'], {type:'image/jpeg'});
        const avatar1 = await api.uploadAvatar(photo);
        const avatar2 = await api.uploadAvatar(photo);
        record('adapter/avatar-replacement: unique own-folder inserts', avatar1 !== avatar2 && uploads.length === 2 && uploads.every(u=>u.path.startsWith('qa-admin/avatar-') && u.options.upsert === false));
        window.db = oldDb;
        api.currentUser = oldCurrentUser;
        api.logAdminEvent = oldLog;
        return results;
      });
      failures.push(...results.filter(r=>!r.pass).map(r=>route + ': ' + r.name));
      console.log(route + ': ' + results.filter(r=>r.pass).length + '/' + results.length + ' assertions passed');
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally {await browser.close();}
})().catch(error=>{console.error(error); process.exitCode=1;});
