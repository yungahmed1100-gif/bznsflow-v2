import React, {useState} from 'react';
import { InstagramConnection } from './InstagramConnection';
import { ChannelSwitch } from './ChannelSwitch';
import { BrandMark } from '../ui/BrandMark';
import { messaging, setupPath } from '../../lib/dashboard/api';
import { channelsFrom } from '../../lib/dashboard/channels';
import { formatPhone } from '../../lib/dashboard/phone';

/** Settings → Channels: one card per channel, each with its own Layla switch. */
export function ChannelConnections({s,data,onChange}) {
  const [busy,setBusy]=useState(''),[confirm,setConfirm]=useState(false),[notice,setNotice]=useState(null);
  const whatsapp=channelsFrom(data).find(c=>c.id==='whatsapp');
  async function run(action) {
    setBusy(action);setNotice(null);
    try {
      await messaging(action,action==='disconnect'?{confirm:true}:{});
      setConfirm(false);
      setNotice({ok:true,text:action==='disconnect'?(s.ar?'تم فصل واتساب.':'WhatsApp disconnected.'):s.t('connectionOk')});
    } catch(e) {setNotice({ok:false,text:s.reason(e.reason)});}
    finally {setBusy('');await onChange();}
  }
  return <section className="ld-channels">
    <h1>{s.ar?'قنواتك':'Your channels'}</h1>
    <p>{s.ar?'تجيب ليلى على كل قناة مربوطة من معلومات نشاطك. أوقفها على أي قناة متى شئت.':'Layla answers on every connected channel from your business details. Turn her off on any channel whenever you like.'}</p>
    <section className="ld-channel-card" aria-label="WhatsApp">
      <h3><BrandMark name="whatsapp" size={26} className="layla-channel-logo" />WhatsApp</h3>
      {whatsapp && <p className="ld-channel-identity"><bdi dir="ltr">{formatPhone(whatsapp.identity)}</bdi> · <span className={`ld-health ${whatsapp.healthy?'is-ok':'is-warn'}`}><span aria-hidden="true" className="ld-dot" />{whatsapp.healthy?s.t('connectionOk'):s.t('connectionAttention')}</span></p>}
      {whatsapp?.connected
        ? <ChannelSwitch s={s} channel="whatsapp" state={data.messaging} onChanged={onChange} />
        : <p>{s.ar?'دع ليلى تردّ على عملائك في واتساب.':'Let Layla answer your WhatsApp customers.'}</p>}
      <div className="ld-actions">
        {!whatsapp?.connected && <a className="ld-button ld-primary" href={setupPath(s.lang)}>{whatsapp?(s.ar?'أكمل ربط واتساب':'Finish connecting WhatsApp'):(s.ar?'ربط واتساب':'Connect WhatsApp')}</a>}
        {whatsapp && <button className="ld-button ld-quiet" disabled={!!busy} onClick={()=>run('check_connection')}>{busy==='check_connection'?s.t('loading'):s.t('checkConnection')}</button>}
        {whatsapp && <button className="ld-button ld-quiet ld-danger" disabled={!!busy} onClick={()=>setConfirm(true)}>{s.ar?'فصل واتساب':'Disconnect WhatsApp'}</button>}
      </div>
      {confirm && <div role="alertdialog" aria-label={s.ar?'فصل واتساب':'Disconnect WhatsApp'}>
        <p>{s.ar?'سيوقف هذا ربط واتساب في BznsFlow ويحذف بيانات الوصول المحفوظة. سيبقى رقمك مسجلاً لدى Meta وحساب إنستغرام مرتبطاً. يمكنك إزالة صلاحية التطبيق من Meta أيضاً.':'This stops WhatsApp in BznsFlow and removes its saved credentials. Your number stays registered with Meta and Instagram stays connected. You can also remove the app permission in Meta.'}</p>
        <button className="ld-button ld-danger" disabled={!!busy} onClick={()=>run('disconnect')}>{s.ar?'تأكيد الفصل':'Confirm disconnect'}</button>
        <button className="ld-button" disabled={!!busy} onClick={()=>setConfirm(false)}>{s.t('cancel')}</button>
      </div>}
      {notice && <p role={notice.ok?'status':'alert'}>{notice.text}</p>}
    </section>
    <InstagramConnection lang={s.lang} onChange={onChange} replyState={data.instagramMessaging} />
  </section>;
}
