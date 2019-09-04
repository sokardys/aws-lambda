if (process.env.NODE_ENV === 'development') {
    require('dotenv').config()
}

const { google } = require('googleapis')
const RANGE = 'A1'

const auth_params = {
    email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    key: (process.env.GOOGLE_AUTH_PRIVATE_KEY || '').replace(new RegExp("\\\\n", "\g"), "\n"),
    scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
    ]
}

const sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.JWT(auth_params)
})

const errorResult = error => {
    return {
        statusCode: 500,
        body: JSON.stringify({error: error.message})
    }
}

const appendRowsToSheet = async (spreadsheetId, rows) => {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.append({
            spreadsheetId,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
                range: 'A1',
                majorDimension: 'ROWS',
                values: rows,
            }
          }, (err, result) => {
            if (err) {
              return reject(err)
            }
            return resolve(result)
          });
    })
}

const parseJSON = (info = {}) => {
    if (!info) info = {}
    try{
      return JSON.parse(info)
    }catch (ex){
      return {}
    }
}

exports.handler = async (event) => {
    const params= parseJSON(event.body)
    try{
        const result = await appendRowsToSheet(params.spreadsheetId, params.rows)
        return {
            statusCode: 200,
            body: JSON.stringify(result.data.updates)
        }
    } catch (error) {
        return errorResult(error)
    }
};