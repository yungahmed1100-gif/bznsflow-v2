// Narrow server-to-server bridge. Website persistence remains in Convex;
// the outreach Worker owns consent, confirmation and email delivery.
export const EMAIL_CONSENT_VERSION = 'subscriber-v1';
export async function requestEmailSubscription(body, {env=process.env,fetcher=fetch}={}) {
  if(body.emailOptIn!==true)return {subscription:'not_requested'};
  if(body.emailConsentVersion!==EMAIL_CONSENT_VERSION)return {subscription:'failed'};
  const token=env.OUTREACH_SUBSCRIPTION_TOKEN;
  if(!token)return {subscription:'failed'};
  try {
    const response=await fetcher('https://dawn-brook-73ff.ahmed-2d3.workers.dev/subscribe',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
      headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
      body:JSON.stringify({emailOptIn:true,consentVersion:EMAIL_CONSENT_VERSION,
        email:body.email,name:body.name,language:body.language==='ar'?'ar':'en'}),
    });
    const result=await response.json();
    if(!response.ok||result?.ok!==true||result.subscription!=='confirmation_pending')throw Error('subscription rejected');
    return {subscription:'confirmation_pending'};
  } catch {return {subscription:'failed'};}
}
