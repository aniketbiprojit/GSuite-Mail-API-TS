const MIMEText = require('mimetext')

import { google } from 'googleapis'

import { getOAuth } from './authorize'

function make_mime(to: string, from: string, subject: string, msg: string) {
	const message = new MIMEText()
	message.setSender(from)
	message.setRecipient(to)
	message.setSubject(subject)
	message.setMessage(msg)

	return message.asEncoded()
}

export async function send_mail(from_mail: string, to_email: string, subject: string, mail_data: string) {
	const auth = await getOAuth()
	try {
		console.log({ to_email, from_mail, subject, mail_data })
		let raw = make_mime(to_email, from_mail, subject, mail_data)

		const gmail = google.gmail({ version: 'v1', auth })

		return await gmail.users.messages.send({
			userId: 'me',
			requestBody: { raw: raw },
		})
	} catch (err) {
		console.log(err)
		return 500
	}
}
const run = async () => {
	await send_mail('anikettipu@gmail.com', '8.aniket.chowdhury@gmail.com', 'Mail', 'Text')
}

run()
