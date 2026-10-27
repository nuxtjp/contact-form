export const defaultTexts = {
 heading: 'お問い合わせ', reviewHeading: '入力内容の確認',
 intro: 'ご相談・ご質問をお寄せください。必須の項目をご入力ください。',
 reviewIntro: '入力内容をご確認ください。', preview: '表示プレビュー · メールは送信されません',
 previewIntro: '表示内容をご確認ください。ここでは実際の受付は行いません。',
 email: 'メールアドレス', subject: '件名', message: 'お問い合わせ内容', required: '必須',
 optional: '任意', notProvided: '未入力（返信できません）',
 optionalEmailHint: '返信を希望する場合だけご入力ください。未入力でも情報提供できます。',
 emailHint: '返信を受け取るメールアドレスをご入力ください。',
 messageHint: 'パスワードや認証情報などの秘密情報は記入しないでください。',
 privacy: '個人情報の取り扱い', acknowledged: 'を確認しました。',
 previewPrivacy: '個人情報の取り扱いの確認欄（表示確認用）',
 policyNote: '公開時には、このサイトの個人情報の取り扱いへのリンクを設定します。',
 review: '入力内容を確認する', back: '入力に戻る', send: '送信する', sending: '送信中…',
 finish: 'プレビューを完了する', finished: 'プレビューの確認が完了しました。メールは送信していません。',
 accepted: '配送サービスが受け付けました。受信箱への到着を保証するものではありません。',
 rejected: '送信は許可されませんでした。入力内容や接続条件をご確認ください。',
 unknown: '結果を確認できませんでした。重複を防ぐため、続けて送信しないでください。',
 invalid: '必須項目と個人情報の取り扱いの確認をご確認ください。',
 noScript: 'JavaScriptが利用できないため、フォームの操作は無効です。',
 challenge: '送信前の不正利用防止確認'
}
export type ContactTexts = Partial<Record<keyof typeof defaultTexts, string>>
export type ContactPart = 'root' | 'heading' | 'intro' | 'form' | 'fieldset' | 'field' | 'label' | 'input' | 'textarea' | 'hint' | 'consent' | 'review' | 'actions' | 'button' | 'status'
export type ContactUi = Partial<Record<ContactPart, string>>
export interface FieldSlot { modelValue: string; update: (value: string) => void; attrs: { id: string; disabled: boolean; required: boolean; maxlength: number; type?: string; autocomplete?: string; 'aria-describedby'?: string } }
export interface ConsentSlot { modelValue: boolean; update: (value: boolean) => void; disabled: boolean; privacyUrl: string; text: string }
export interface ActionSlot { attrs: { type: 'button' | 'submit'; disabled: boolean; onClick?: () => void }; text: string }

/** First-party English copy; sites may override individual labels through texts. */
export const englishTexts: Record<keyof typeof defaultTexts, string> = {
 heading: 'Contact', reviewHeading: 'Review your message',
 intro: 'Send a question or report. Complete the required fields.',
 reviewIntro: 'Check your message before sending.', preview: 'Preview · No email will be sent',
 previewIntro: 'Review the display. Submissions are not accepted in this preview.',
 email: 'Email address', subject: 'Subject', message: 'Message', required: 'Required',
 optional: 'Optional', notProvided: 'Not provided (we cannot reply)',
 optionalEmailHint: 'Provide an address only if you would like a reply. You can submit a report without one.',
 emailHint: 'Enter the email address where you would like to receive a reply.',
 messageHint: 'Do not include passwords, credentials or other secrets.',
 privacy: 'Privacy policy', acknowledged: ' — I have read this.',
 previewPrivacy: 'Privacy acknowledgement (display preview)',
 policyNote: 'The published form will link to the applicable privacy policy.',
 review: 'Review message', back: 'Edit message', send: 'Send message', sending: 'Sending…',
 finish: 'Finish preview', finished: 'Preview complete. No email has been sent.',
 accepted: 'The delivery provider accepted your message. This does not guarantee arrival in the inbox.',
 rejected: 'Submission was not permitted. Check the input and connection requirements.',
 unknown: 'The outcome could not be confirmed. Do not send again to avoid duplicates.',
 invalid: 'Check the required fields and privacy acknowledgement.',
 noScript: 'Form controls are disabled because JavaScript is unavailable.',
 challenge: 'Abuse prevention check before sending'
}
