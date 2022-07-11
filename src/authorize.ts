import fs from 'fs'
import readline from 'readline'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import { join } from 'path'
import { external_path } from './getStorage'

const SCOPES = ['https://mail.google.com', 'https://www.googleapis.com/auth/drive']

const TOKEN_PATH = join(external_path, 'token.json')

export async function getOAuth(): Promise<OAuth2Client> {
	try {
		const content = await fs.promises.readFile(join(external_path, 'credentials.json'))
		const OAuth = await authorize(JSON.parse(content.toString()))

		// console.log(OAuth)
		return OAuth
	} catch (err) {
		console.log(`Error reading credentials.json, ${err}`)
		throw new Error('Erroe free')
	}
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials: {
	installed: { client_secret: string; client_id: string; redirect_uris: string[] }
}): Promise<OAuth2Client> {
	const { client_secret, client_id, redirect_uris } = credentials.installed
	const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

	// Check if we have previously stored a token.
	let token: string | Buffer
	try {
		token = await fs.promises.readFile(TOKEN_PATH)
	} catch (err) {
		if (err) return getNewToken(oAuth2Client)
	}
	oAuth2Client.setCredentials(JSON.parse(token!.toString()))
	return oAuth2Client
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client: OAuth2Client) {
	return new Promise<OAuth2Client>((resolve, reject) => {
		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
		})
		console.log('Authorize this app by visiting this url:', authUrl)
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		rl.question('Enter the code from that page here: ', (code: any) => {
			rl.close()
			oAuth2Client.getToken(code, (err, token: any) => {
				if (err) {
					reject(err)
					return console.error('Error retrieving access token', err)
				}
				oAuth2Client.setCredentials(token)
				// Store the token to disk for later program executions
				fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err: any) => {
					if (err) {
						reject(err)
						return console.error(err)
					}
					console.log('Token stored to', TOKEN_PATH)
				})
				resolve(oAuth2Client)
			})
		})
	})
}

export const listLabels = async function listLabels() {
	const auth = await getOAuth()
	const gmail = google.gmail({ version: 'v1', auth })
	gmail.users.labels.list(
		{
			userId: 'me',
		},
		(err, res: any) => {
			if (err) return console.log('The API returned an error: ' + err)
			const labels = res.data.labels
			if (labels.length) {
				console.log('Labels:')
				labels.forEach((label: any) => {
					console.log(`- ${label.name}`)
				})
			} else {
				console.log('No labels found.')
			}
		}
	)
}

module.exports.getOAuth = getOAuth
