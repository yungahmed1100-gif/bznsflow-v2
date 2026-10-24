import React from 'react';

/** One of Meta's button names, kept in English as Meta shows it; <bdi> keeps it whole inside Arabic lines. */
const Label = ({ children }) => <strong><bdi dir="ltr">{children}</bdi></strong>;

/**
 * What the owner will see in Facebook's window, so nothing there is a surprise. Matches Meta's 2026 flow:
 * the WhatsApp Business account became a "Messaging account", and the app route is "Connect a WhatsApp
 * Business App" with a prompt inside the app (not an SMS code). Closed by default; short on purpose.
 */
export function MetaWindowGuide({ tr, path, phoneOnly }) {
  const app = path === 'coexistence';
  const connectApp = <Label>Connect a WhatsApp Business App</Label>, finish = <Label>Finish</Label>;
  const steps = app ? [
    tr('Log in to Facebook and allow BznsFlow.', 'سجّل الدخول إلى فيسبوك واسمح لـ BznsFlow.'),
    tr('Choose your business. It can’t be changed later, so pick your shop’s.', 'اختر نشاطك التجاري. لا يمكن تغييره لاحقاً، فاختر نشاط متجرك.'),
    tr(<>Choose {connectApp} and enter your number.</>, <>اختر {connectApp} وأدخل رقمك.</>),
    tr(<>On your phone, open the message from Facebook in WhatsApp Business. Tap <Label>Connect</Label>, then <Label>Connect to the Business Platform</Label>.</>,
      <>على هاتفك، افتح رسالة فيسبوك في واتساب للأعمال. اضغط <Label>Connect</Label> ثم <Label>Connect to the Business Platform</Label>.</>),
    phoneOnly
      ? tr('Choose whether to share your chat history, then enter the code Facebook shows.', 'اختر إن كنت تريد مشاركة سجل المحادثات، ثم أدخل الرمز الذي يعرضه فيسبوك.')
      : tr('Choose whether to share your chat history, then scan the QR code or enter the code.', 'اختر إن كنت تريد مشاركة سجل المحادثات، ثم امسح رمز QR أو أدخل الرمز.'),
    tr(<>Check the account name and time zone, then press {finish}. You’ll come back here by yourself.</>, <>تأكد من اسم الحساب والمنطقة الزمنية ثم اضغط {finish}. ستعود إلى هنا تلقائياً.</>),
  ] : [
    tr('Log in to Facebook and allow BznsFlow.', 'سجّل الدخول إلى فيسبوك واسمح لـ BznsFlow.'),
    tr('Choose your business. It can’t be changed later.', 'اختر نشاطك التجاري. لا يمكن تغييره لاحقاً.'),
    tr('Create a WhatsApp account, or pick the one already on an API, and enter the number.', 'أنشئ حساب واتساب، أو اختر الحساب المرتبط بواجهة API، وأدخل الرقم.'),
    tr('Verify a new number with the SMS or call code.', 'أكّد الرقم الجديد برمز الرسالة أو المكالمة.'),
    tr(<>Check the name and time zone, then press {finish}. A new number then needs a 6-digit PIN here.</>, <>تأكد من الاسم والمنطقة الزمنية ثم اضغط {finish}. يحتاج الرقم الجديد بعدها إلى رمز PIN من 6 أرقام هنا.</>),
  ];
  return <details className="layla-meta-guide">
    <summary>{tr('What you’ll see in Facebook’s window', 'ما ستراه في نافذة فيسبوك')}</summary>
    <ol>{steps.map((text, i) => <li key={i}>{text}</li>)}</ol>
    {/* Ahmed's 2026-10-24 attempt took this wrong turn: an SMS code means Meta is adding a new number. */}
    {app && <p className="layla-help layla-guide-warning">{tr(<>Asked for an SMS or call code? That’s the new-number route. Close the window and choose {connectApp}.</>, <>طُلب منك رمز برسالة أو مكالمة؟ هذا مسار الرقم الجديد. أغلق النافذة واختر {connectApp}.</>)}</p>}
    <p className="layla-help">{tr('Passwords and codes go only into Facebook’s window — BznsFlow never sees them.', 'كلمات المرور والرموز تُكتب في نافذة فيسبوك فقط، ولا تراها BznsFlow أبداً.')}</p>
  </details>;
}
